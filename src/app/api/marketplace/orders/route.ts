import { NextRequest } from "next/server";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import {
  drugs, inventory, inventoryMovements, purchaseInvoiceItems,
  purchaseInvoices, purchaseOrderItems, purchaseOrders, supplierProducts, users,
} from "@/db/schema";
import { requirePharmacyOwner } from "@/lib/dashboard-auth";
import { jsonOk, jsonError, handleUnknownError } from "@/lib/api-utils";
import { createNotification } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const ctx = await requirePharmacyOwner(request);
  if (!ctx) return jsonError("غير مصرح لك", 401);

    const orders = await db
      .select({
        id: purchaseOrders.id,
        supplierId: purchaseOrders.supplierId,
        status: purchaseOrders.status,
        totalAmount: purchaseOrders.totalAmount,
        notes: purchaseOrders.notes,
        confirmedAt: purchaseOrders.confirmedAt,
        shippedAt: purchaseOrders.shippedAt,
        deliveredAt: purchaseOrders.deliveredAt,
        createdAt: purchaseOrders.createdAt,
        supplierName: users.fullName,
      })
    .from(purchaseOrders)
    .innerJoin(users, eq(users.id, purchaseOrders.supplierId))
    .where(eq(purchaseOrders.pharmacyId, ctx.pharmacy.id))
    .orderBy(purchaseOrders.createdAt);

  const ordersWithItems = await Promise.all(
    orders.map(async (order) => {
      const items = await db
        .select({
          drugName: drugs.name,
          quantity: purchaseOrderItems.quantity,
          unitPrice: purchaseOrderItems.unitPrice,
        })
        .from(purchaseOrderItems)
        .innerJoin(drugs, eq(drugs.id, purchaseOrderItems.drugId))
        .where(eq(purchaseOrderItems.orderId, order.id));
      return { ...order, items };
    })
  );

  return jsonOk({ orders: ordersWithItems });
}

const createOrderSchema = z.object({
  supplierId: z.string().uuid(),
  items: z.array(z.object({
    supplierProductId: z.string().uuid().optional(),
    drugId: z.string().uuid().optional(),
    drugName: z.string().optional(),
    quantity: z.number().int().min(1),
    unitPrice: z.number().min(0),
  })).min(1),
  totalAmount: z.number().optional(),
  notes: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const ctx = await requirePharmacyOwner(request);
    if (!ctx) return jsonError("غير مصرح لك", 401);

    const body = await request.json();
    const data = createOrderSchema.parse(body);

    const resolvedItems = await Promise.all(
      data.items.map(async (item) => {
        let drugId = item.drugId;
        if (!drugId && item.supplierProductId) {
          const sp = await db
            .select({ drugId: supplierProducts.drugId })
            .from(supplierProducts)
            .where(eq(supplierProducts.id, item.supplierProductId))
            .limit(1);
          if (sp.length > 0) drugId = sp[0].drugId;
        }
        if (!drugId) return null;
        return { drugId, quantity: item.quantity, unitPrice: item.unitPrice };
      })
    );

    const validItems = resolvedItems.filter(Boolean) as { drugId: string; quantity: number; unitPrice: number }[];
    if (validItems.length === 0) return jsonError("لا توجد منتجات صالحة", 422);

    const totalAmount = validItems.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);

    const [order] = await db
      .insert(purchaseOrders)
      .values({
        pharmacyId: ctx.pharmacy.id,
        supplierId: data.supplierId,
        totalAmount: totalAmount.toFixed(2),
        notes: data.notes,
      })
      .returning();

    for (const item of validItems) {
      await db.insert(purchaseOrderItems).values({
        orderId: order.id,
        drugId: item.drugId,
        quantity: item.quantity,
        unitPrice: item.unitPrice.toFixed(2),
      });
    }

    const [pharmacyName] = await db
      .select({ name: users.fullName })
      .from(users)
      .where(eq(users.id, ctx.user.sub))
      .limit(1);

    if (pharmacyName) {
      await createNotification({
        userId: data.supplierId,
        type: "new_order",
        title: "طلب جديد",
        message: `لديك طلب جديد من ${pharmacyName.name} بقيمة ${totalAmount.toFixed(2)} ﷼`,
        referenceId: order.id,
        referenceType: "purchase_order",
      });
    }

    return jsonOk({ order }, 201);
  } catch (error) {
    return handleUnknownError(error);
  }
}

const updateStatusSchema = z.object({
  orderId: z.string().uuid(),
  status: z.enum(["delivered", "cancelled"]),
  notes: z.string().optional(),
});

export async function PATCH(request: NextRequest) {
  try {
    const ctx = await requirePharmacyOwner(request);
    if (!ctx) return jsonError("غير مصرح لك", 401);

    const body = await request.json();
    const data = updateStatusSchema.parse(body);

    const [existing] = await db
      .select()
      .from(purchaseOrders)
      .where(eq(purchaseOrders.id, data.orderId))
      .limit(1);

    if (!existing || existing.pharmacyId !== ctx.pharmacy.id) return jsonError("الطلب غير موجود", 404);

    const updates: Record<string, unknown> = { status: data.status };
    if (data.status === "delivered") updates.deliveredAt = new Date();
    if (data.status === "cancelled") updates.cancelledAt = new Date();
    if (data.notes) updates.notes = data.notes;

    if (data.status === "delivered") {
      const items = await db
        .select({
          drugId: purchaseOrderItems.drugId,
          quantity: purchaseOrderItems.quantity,
          unitPrice: purchaseOrderItems.unitPrice,
        })
        .from(purchaseOrderItems)
        .where(eq(purchaseOrderItems.orderId, data.orderId));

      const totalCost = items.reduce((s, i) => s + Number(i.quantity) * Number(i.unitPrice), 0);
      const shortId = data.orderId.replace(/-/g, "").slice(0, 8).toUpperCase();

      const [invoice] = await db
        .insert(purchaseInvoices)
        .values({
          pharmacyId: ctx.pharmacy.id,
          invoiceNumber: `PO-${shortId}`,
          totalAmount: totalCost.toFixed(2),
          invoiceDate: new Date().toISOString().slice(0, 10),
        })
        .returning();

      for (const item of items) {
        const drugId = item.drugId;
        const cost = Number(item.unitPrice);

        await db.insert(purchaseInvoiceItems).values({
          invoiceId: invoice.id,
          drugId,
          quantity: item.quantity,
          unitCost: cost.toFixed(2),
        });

        const [existingInv] = await db
          .select()
          .from(inventory)
          .where(and(eq(inventory.pharmacyId, ctx.pharmacy.id), eq(inventory.drugId, drugId)))
          .limit(1);

        if (existingInv) {
          const newQty = existingInv.quantity + item.quantity;
          const newAvgCost = existingInv.quantity > 0
            ? ((Number(existingInv.costPrice) * existingInv.quantity + cost * item.quantity) / newQty).toFixed(2)
            : cost.toFixed(2);

          await db
            .update(inventory)
            .set({
              quantity: newQty,
              costPrice: newAvgCost,
              retailPrice: Math.max(Number(existingInv.retailPrice), (cost * 1.3)).toFixed(2),
              updatedAt: new Date(),
            })
            .where(eq(inventory.id, existingInv.id));
        } else {
          await db.insert(inventory).values({
            pharmacyId: ctx.pharmacy.id,
            drugId,
            quantity: item.quantity,
            costPrice: cost.toFixed(2),
            retailPrice: (cost * 1.3).toFixed(2),
          });
        }

        await db.insert(inventoryMovements).values({
          pharmacyId: ctx.pharmacy.id,
          drugId,
          movementType: "purchase",
          quantityChange: item.quantity,
          unitCost: cost.toFixed(2),
          referenceType: "purchase_order",
          referenceId: data.orderId,
          createdBy: ctx.user.sub,
        });
      }
      await createNotification({
        userId: existing.supplierId,
        type: "order_delivered",
        title: "تم استلام الطلب",
        message: `الصيدلية استلمت الطلب رقم ${shortId}`,
        referenceId: data.orderId,
        referenceType: "purchase_order",
      });
    }

    const [row] = await db
      .update(purchaseOrders)
      .set(updates)
      .where(eq(purchaseOrders.id, data.orderId))
      .returning();

    return jsonOk({ order: row });
  } catch (error) {
    return handleUnknownError(error);
  }
}
