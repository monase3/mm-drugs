import { NextRequest } from "next/server";
import { z } from "zod";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { drugs, inventory, inventoryMovements, purchaseInvoiceItems, purchaseInvoices, suppliers } from "@/db/schema";
import { requirePharmacyOwner } from "@/lib/dashboard-auth";
import { jsonOk, jsonError, handleUnknownError } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const ctx = await requirePharmacyOwner(request);
  if (!ctx) return jsonError("غير مصرح لك بالوصول إلى هذه البيانات", 401);

  const invoices = await db
    .select({
      id: purchaseInvoices.id,
      invoiceNumber: purchaseInvoices.invoiceNumber,
      totalAmount: purchaseInvoices.totalAmount,
      invoiceDate: purchaseInvoices.invoiceDate,
      createdAt: purchaseInvoices.createdAt,
      supplierName: suppliers.name,
    })
    .from(purchaseInvoices)
    .leftJoin(suppliers, eq(suppliers.id, purchaseInvoices.supplierId))
    .where(eq(purchaseInvoices.pharmacyId, ctx.pharmacy.id))
    .orderBy(desc(purchaseInvoices.invoiceDate));

  return jsonOk({ invoices });
}

const itemSchema = z.object({
  drugName: z.string().min(1),
  quantity: z.number().int().min(1),
  unitCost: z.number().min(0),
});

const createInvoiceSchema = z.object({
  invoiceNumber: z.string().min(1, "رقم الفاتورة مطلوب"),
  supplierId: z.string().uuid().optional(),
  invoiceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "صيغة التاريخ يجب أن تكون YYYY-MM-DD"),
  items: z.array(itemSchema).min(1, "يجب إضافة عنصر واحد على الأقل"),
});

export async function POST(request: NextRequest) {
  try {
    const ctx = await requirePharmacyOwner(request);
    if (!ctx) return jsonError("غير مصرح لك بالوصول إلى هذه البيانات", 401);

    const body = await request.json();
    const data = createInvoiceSchema.parse(body);

    const totalAmount = data.items.reduce((sum, item) => sum + item.quantity * item.unitCost, 0);

    const [invoice] = await db
      .insert(purchaseInvoices)
      .values({
        pharmacyId: ctx.pharmacy.id,
        supplierId: data.supplierId,
        invoiceNumber: data.invoiceNumber,
        totalAmount: totalAmount.toFixed(2),
        invoiceDate: data.invoiceDate,
      })
      .returning();

    for (const item of data.items) {
      const [existingDrug] = await db
        .select()
        .from(drugs)
        .where(eq(drugs.name, item.drugName))
        .limit(1);

      const drugId = existingDrug
        ? existingDrug.id
        : (await db.insert(drugs).values({ name: item.drugName }).returning())[0].id;

      await db.insert(purchaseInvoiceItems).values({
        invoiceId: invoice.id,
        drugId,
        quantity: item.quantity,
        unitCost: item.unitCost.toFixed(2),
      });

      // Reflect the purchase into stock automatically.
      const [row] = await db
        .select()
        .from(inventory)
        .where(and(eq(inventory.pharmacyId, ctx.pharmacy.id), eq(inventory.drugId, drugId)))
        .limit(1);

      if (row) {
        await db
          .update(inventory)
          .set({
            quantity: row.quantity + item.quantity,
            costPrice: item.unitCost.toFixed(2),
            updatedAt: new Date(),
          })
          .where(eq(inventory.id, row.id));
      } else {
        await db.insert(inventory).values({
          pharmacyId: ctx.pharmacy.id,
          drugId,
          quantity: item.quantity,
          costPrice: item.unitCost.toFixed(2),
          retailPrice: (item.unitCost * 1.3).toFixed(2),
        });
      }

      // Create purchase movement record
      await db.insert(inventoryMovements).values({
        pharmacyId: ctx.pharmacy.id,
        drugId,
        movementType: "purchase",
        quantityChange: item.quantity,
        unitCost: item.unitCost.toFixed(2),
        referenceType: "purchase_invoice",
        referenceId: invoice.id,
        createdBy: ctx.user.sub,
      });
    }

    return jsonOk({ invoice }, 201);
  } catch (error) {
    return handleUnknownError(error);
  }
}
