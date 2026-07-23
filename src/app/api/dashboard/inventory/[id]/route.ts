import { NextRequest } from "next/server";
import { z } from "zod";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { inventory, inventoryMovements } from "@/db/schema";
import { requirePharmacyOwner } from "@/lib/dashboard-auth";
import { jsonOk, jsonError, handleUnknownError } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  quantity: z.number().int().min(0).optional(),
  costPrice: z.number().min(0).optional(),
  retailPrice: z.number().min(0).optional(),
  expiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  batchNumber: z.string().optional(),
  minStockLevel: z.number().int().min(0).optional(),
});

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const ctx = await requirePharmacyOwner(request);
    if (!ctx) return jsonError("غير مصرح لك بالوصول إلى هذه البيانات", 401);

    const body = await request.json();
    const data = updateSchema.parse(body);

    const [existing] = await db
      .select()
      .from(inventory)
      .where(and(eq(inventory.id, id), eq(inventory.pharmacyId, ctx.pharmacy.id)))
      .limit(1);

    if (!existing) return jsonError("العنصر غير موجود", 404);

    const [row] = await db
      .update(inventory)
      .set({
        ...(data.quantity !== undefined ? { quantity: data.quantity } : {}),
        ...(data.costPrice !== undefined ? { costPrice: data.costPrice.toFixed(2) } : {}),
        ...(data.retailPrice !== undefined ? { retailPrice: data.retailPrice.toFixed(2) } : {}),
        ...(data.expiryDate !== undefined ? { expiryDate: data.expiryDate } : {}),
        ...(data.batchNumber !== undefined ? { batchNumber: data.batchNumber } : {}),
        ...(data.minStockLevel !== undefined ? { minStockLevel: data.minStockLevel } : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(inventory.id, id), eq(inventory.pharmacyId, ctx.pharmacy.id)))
      .returning();

    if (data.quantity !== undefined && data.quantity !== existing.quantity) {
      const diff = data.quantity - existing.quantity;
      await db.insert(inventoryMovements).values({
        pharmacyId: ctx.pharmacy.id,
        drugId: existing.drugId,
        batchNumber: existing.batchNumber,
        movementType: diff > 0 ? "adjustment" : "adjustment",
        quantityChange: diff,
        unitCost: existing.costPrice,
        reason: "تعديل يدوي من لوحة التحكم",
        createdBy: ctx.user.sub,
      });
    }

    return jsonOk({ item: row });
  } catch (error) {
    return handleUnknownError(error);
  }
}

export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const ctx = await requirePharmacyOwner(_request);
    if (!ctx) return jsonError("غير مصرح لك بالوصول إلى هذه البيانات", 401);

    const [row] = await db
      .delete(inventory)
      .where(and(eq(inventory.id, id), eq(inventory.pharmacyId, ctx.pharmacy.id)))
      .returning();

    if (!row) return jsonError("العنصر غير موجود", 404);
    return jsonOk({ message: "تم حذف العنصر" });
  } catch (error) {
    return handleUnknownError(error);
  }
}
