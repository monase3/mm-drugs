import { NextRequest } from "next/server";
import { z } from "zod";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { drugs, inventory, inventoryMovements, pharmacies } from "@/db/schema";
import { jsonOk, jsonError, handleUnknownError } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

const syncItemSchema = z.object({
  barcode: z.string().trim().optional(),
  name: z.string().trim().min(1, "اسم الدواء مطلوب"),
  genericName: z.string().trim().optional(),
  manufacturer: z.string().trim().optional(),
  unit: z.string().trim().optional(),
  quantity: z.number().int().min(0, "الكمية يجب ألا تقل عن صفر"),
  costPrice: z.number().min(0).optional(),
  retailPrice: z.number().min(0).optional(),
  price: z.number().min(0).optional(),
  expiryDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "صيغة التاريخ يجب أن تكون YYYY-MM-DD")
    .optional(),
  batchNumber: z.string().trim().optional(),
  minStockLevel: z.number().int().min(0).optional(),
});

const syncPayloadSchema = z.object({
  items: z.array(syncItemSchema).min(1, "يجب إرسال عنصر واحد على الأقل").max(2000),
});

const saleItemSchema = z.object({
  barcode: z.string().trim().optional(),
  name: z.string().trim().min(1),
  quantity: z.number().int().min(1),
  salePrice: z.number().min(0).optional(),
});

const salesPayloadSchema = z.object({
  items: z.array(saleItemSchema).min(1).max(500),
});

export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get("x-api-key");
    if (!apiKey) {
      return jsonError("رأس الطلب X-API-Key مطلوب للمصادقة", 401);
    }

    const [pharmacy] = await db
      .select()
      .from(pharmacies)
      .where(eq(pharmacies.apiKey, apiKey))
      .limit(1);

    if (!pharmacy) {
      return jsonError("مفتاح API غير صالح", 401);
    }
    if (!pharmacy.isActive) {
      return jsonError("حساب الصيدلية غير مفعل حالياً", 403);
    }

    const url = new URL(request.url);
    const action = url.searchParams.get("action") ?? "sync";

    if (action === "sale") {
      return handleSale(request, pharmacy.id);
    }

    // Default: inventory sync
    const body = await request.json();
    const payload = syncPayloadSchema.parse(body);

    const results: Array<{
      name: string;
      status: "created" | "updated" | "error";
      message?: string;
    }> = [];

    for (const item of payload.items) {
      try {
        let drugId: string;

        if (item.barcode) {
          const [existingByBarcode] = await db
            .select()
            .from(drugs)
            .where(eq(drugs.barcode, item.barcode))
            .limit(1);
          if (existingByBarcode) {
            drugId = existingByBarcode.id;
          } else {
            const [created] = await db
              .insert(drugs)
              .values({
                name: item.name,
                genericName: item.genericName,
                manufacturer: item.manufacturer,
                unit: item.unit ?? "علبة",
                barcode: item.barcode,
              })
              .returning();
            drugId = created.id;
          }
        } else {
          const [existingByName] = await db
            .select()
            .from(drugs)
            .where(eq(drugs.name, item.name))
            .limit(1);
          if (existingByName) {
            drugId = existingByName.id;
          } else {
            const [created] = await db
              .insert(drugs)
              .values({
                name: item.name,
                genericName: item.genericName,
                manufacturer: item.manufacturer,
                unit: item.unit ?? "علبة",
              })
              .returning();
            drugId = created.id;
          }
        }

        const batchNumber = item.batchNumber ?? "GENERAL";
        const [existingInventory] = await db
          .select()
          .from(inventory)
          .where(
            and(
              eq(inventory.pharmacyId, pharmacy.id),
              eq(inventory.drugId, drugId),
              eq(inventory.batchNumber, batchNumber),
            ),
          )
          .limit(1);

        const costPrice = (item.costPrice ?? item.price ?? 0).toFixed(2);
        const retailPrice = (item.retailPrice ?? item.price ?? 0).toFixed(2);

        if (existingInventory) {
          await db
            .update(inventory)
            .set({
              quantity: item.quantity,
              costPrice,
              retailPrice,
              expiryDate: item.expiryDate ?? existingInventory.expiryDate,
              minStockLevel: item.minStockLevel ?? existingInventory.minStockLevel,
              updatedAt: sql`now()`,
            })
            .where(eq(inventory.id, existingInventory.id));
          results.push({ name: item.name, status: "updated" });
        } else {
          await db.insert(inventory).values({
            pharmacyId: pharmacy.id,
            drugId,
            quantity: item.quantity,
            costPrice,
            retailPrice,
            expiryDate: item.expiryDate,
            batchNumber,
            minStockLevel: item.minStockLevel ?? 10,
          });
          results.push({ name: item.name, status: "created" });
        }
      } catch (itemError) {
        results.push({
          name: item.name,
          status: "error",
          message: itemError instanceof Error ? itemError.message : "خطأ غير معروف",
        });
      }
    }

    const summary = {
      total: results.length,
      created: results.filter((r) => r.status === "created").length,
      updated: results.filter((r) => r.status === "updated").length,
      failed: results.filter((r) => r.status === "error").length,
    };

    return jsonOk({
      message: "تمت مزامنة المخزون بنجاح",
      pharmacy: { id: pharmacy.id, name: pharmacy.name },
      summary,
      results,
    });
  } catch (error) {
    return handleUnknownError(error);
  }
}

async function handleSale(request: NextRequest, pharmacyId: string) {
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError("الجسم غير صالح JSON", 400);
  }
  const payload = salesPayloadSchema.safeParse(body);
  if (!payload.success) {
    return jsonError("بيانات المبيعات غير صالحة", 422, payload.error.flatten().fieldErrors);
  }

  const results: Array<{
    name: string;
    status: "ok" | "error";
    quantityDeducted: number;
    message?: string;
  }> = [];

  for (const item of payload.data.items) {
    try {
      let drugId: string | null = null;

      if (item.barcode) {
        const [drug] = await db
          .select({ id: drugs.id })
          .from(drugs)
          .where(eq(drugs.barcode, item.barcode))
          .limit(1);
        drugId = drug?.id ?? null;
      }

      if (!drugId) {
        const [drug] = await db
          .select({ id: drugs.id })
          .from(drugs)
          .where(eq(drugs.name, item.name))
          .limit(1);
        drugId = drug?.id ?? null;
      }

      if (!drugId) {
        results.push({ name: item.name, status: "error", quantityDeducted: 0, message: "الدواء غير موجود" });
        continue;
      }

      // Look for ANY inventory for this drug at this pharmacy (all batches)
      const inventoryRows = await db
        .select()
        .from(inventory)
        .where(and(eq(inventory.pharmacyId, pharmacyId), eq(inventory.drugId, drugId)));

      if (inventoryRows.length === 0) {
        results.push({ name: item.name, status: "error", quantityDeducted: 0, message: "غير موجود في المخزون" });
        continue;
      }

      // Use the row with highest quantity (or first one)
      const inv = inventoryRows.reduce((best, current) =>
        (current.quantity ?? 0) > (best.quantity ?? 0) ? current : best
      );

      if ((inv.quantity ?? 0) < item.quantity) {
        results.push({
          name: item.name,
          status: "error",
          quantityDeducted: 0,
          message: `المخزون غير كافٍ (${inv.quantity} متوفر)`,
        });
        continue;
      }

      await db
        .update(inventory)
        .set({ quantity: inv.quantity - item.quantity, updatedAt: sql`now()` })
        .where(eq(inventory.id, inv.id));

      await db.insert(inventoryMovements).values({
        pharmacyId,
        drugId,
        batchNumber: inv.batchNumber,
        movementType: "sale",
        quantityChange: -item.quantity,
        unitCost: inv.costPrice,
        referenceType: "pos_sale",
      });

      results.push({ name: item.name, status: "ok", quantityDeducted: item.quantity });
    } catch (itemError) {
      results.push({
        name: item.name,
        status: "error",
        quantityDeducted: 0,
        message: itemError instanceof Error ? itemError.message : "خطأ غير معروف",
      });
    }
  }

  const summary = {
    total: results.length,
    successful: results.filter((r) => r.status === "ok").length,
    failed: results.filter((r) => r.status === "error").length,
    totalDeducted: results.reduce((sum, r) => sum + r.quantityDeducted, 0),
  };

  return jsonOk({ message: "تم تسجيل المبيعات", summary, results });
}
