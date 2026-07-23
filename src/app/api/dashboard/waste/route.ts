import { NextRequest } from "next/server";
import { z } from "zod";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { drugs, inventoryMovements } from "@/db/schema";
import { requirePharmacyOwner } from "@/lib/dashboard-auth";
import { jsonOk, jsonError, handleUnknownError } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const ctx = await requirePharmacyOwner(request);
  if (!ctx) return jsonError("غير مصرح لك بالوصول إلى هذه البيانات", 401);

  const url = new URL(request.url);
  const drugId = url.searchParams.get("drugId");
  const movementType = url.searchParams.get("type");
  const limit = parseInt(url.searchParams.get("limit") ?? "50");

  let query = db
    .select({
      id: inventoryMovements.id,
      batchNumber: inventoryMovements.batchNumber,
      movementType: inventoryMovements.movementType,
      quantityChange: inventoryMovements.quantityChange,
      unitCost: inventoryMovements.unitCost,
      referenceType: inventoryMovements.referenceType,
      reason: inventoryMovements.reason,
      createdAt: inventoryMovements.createdAt,
      drugId: drugs.id,
      drugName: drugs.name,
      unit: drugs.unit,
    })
    .from(inventoryMovements)
    .innerJoin(drugs, eq(drugs.id, inventoryMovements.drugId))
    .where(eq(inventoryMovements.pharmacyId, ctx.pharmacy.id))
    .orderBy(desc(inventoryMovements.createdAt))
    .limit(limit);

  const result = await query;
  return jsonOk({ movements: result });
}

const wasteSchema = z.object({
  drugId: z.string().uuid(),
  batchNumber: z.string().optional().default("GENERAL"),
  quantity: z.number().int().min(1, "الكمية يجب أن تكون 1 على الأقل"),
  reason: z.enum(["expired", "damaged", "returned", "other"], {
    message: "سبب الصرف غير صالح",
  }),
  notes: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const ctx = await requirePharmacyOwner(request);
    if (!ctx) return jsonError("غير مصرح لك بالوصول إلى هذه البيانات", 401);

    const body = await request.json();
    const data = wasteSchema.parse(body);

    const result = await db.execute(sql`
      SELECT id, quantity, cost_price, batch_number FROM inventory
      WHERE pharmacy_id = ${ctx.pharmacy.id} 
        AND drug_id = ${data.drugId}
      ORDER BY CASE WHEN batch_number = ${data.batchNumber} THEN 0 ELSE 1 END
      LIMIT 1
    `);

    const inv = result.rows[0] as Record<string, unknown> | undefined;
    if (!inv) return jsonError("العنصر غير موجود في المخزون", 404);

    if (Number(inv.quantity) < data.quantity) {
      return jsonError(`الكمية المتوفرة (${inv.quantity}) أقل من الكمية المطلوبة`, 400);
    }

    const reasonText = {
      expired: "منتهي الصلاحية",
      damaged: "تالف",
      returned: "مرتجع من العميل",
      other: data.notes || "أخرى",
    }[data.reason];

    await db.insert(inventoryMovements).values({
      pharmacyId: ctx.pharmacy.id,
      drugId: data.drugId,
      batchNumber: data.batchNumber,
      movementType: "waste",
      quantityChange: -data.quantity,
      unitCost: inv.cost_price as string,
      reason: reasonText,
      createdBy: ctx.user.sub,
    });

    await db.execute(sql`
      UPDATE inventory 
      SET quantity = quantity - ${data.quantity}, updated_at = now()
      WHERE id = ${inv.id as string}
    `);

    return jsonOk({
      success: true,
      message: `تم صرف ${data.quantity} وحدة — ${reasonText}`,
      loss: Number(inv.cost_price) * data.quantity,
    }, 201);
  } catch (error) {
    return handleUnknownError(error);
  }
}
