import { NextRequest } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { supplierProducts } from "@/db/schema";
import { requireSupplier } from "@/lib/supplier-auth";
import { jsonOk, jsonError, handleUnknownError } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  price: z.number().min(0.01).optional(),
  minQuantity: z.number().int().min(1).optional(),
  available: z.boolean().optional(),
});

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const ctx = await requireSupplier(request);
    if (!ctx) return jsonError("غير مصرح لك", 401);

    const body = await request.json();
    const data = updateSchema.parse(body);

    const [row] = await db
      .update(supplierProducts)
      .set({
        ...(data.price !== undefined ? { price: data.price.toFixed(2) } : {}),
        ...(data.minQuantity !== undefined ? { minQuantity: data.minQuantity } : {}),
        ...(data.available !== undefined ? { available: data.available } : {}),
      })
      .where(and(eq(supplierProducts.id, id), eq(supplierProducts.supplierId, ctx.user.sub)))
      .returning();

    if (!row) return jsonError("المنتج غير موجود", 404);
    return jsonOk({ product: row });
  } catch (error) {
    return handleUnknownError(error);
  }
}

export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const ctx = await requireSupplier(_request);
    if (!ctx) return jsonError("غير مصرح لك", 401);

    const [row] = await db
      .delete(supplierProducts)
      .where(and(eq(supplierProducts.id, id), eq(supplierProducts.supplierId, ctx.user.sub)))
      .returning();

    if (!row) return jsonError("المنتج غير موجود", 404);
    return jsonOk({ message: "تم حذف المنتج" });
  } catch (error) {
    return handleUnknownError(error);
  }
}
