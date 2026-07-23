import { NextRequest } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { suppliers } from "@/db/schema";
import { requirePharmacyOwner } from "@/lib/dashboard-auth";
import { jsonOk, jsonError, handleUnknownError } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
});

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const ctx = await requirePharmacyOwner(request);
    if (!ctx) return jsonError("غير مصرح لك بالوصول إلى هذه البيانات", 401);

    const body = await request.json();
    const data = updateSchema.parse(body);

    const [row] = await db
      .update(suppliers)
      .set(data)
      .where(and(eq(suppliers.id, id), eq(suppliers.pharmacyId, ctx.pharmacy.id)))
      .returning();

    if (!row) return jsonError("المورد غير موجود", 404);
    return jsonOk({ supplier: row });
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
      .delete(suppliers)
      .where(and(eq(suppliers.id, id), eq(suppliers.pharmacyId, ctx.pharmacy.id)))
      .returning();

    if (!row) return jsonError("المورد غير موجود", 404);
    return jsonOk({ message: "تم حذف المورد" });
  } catch (error) {
    return handleUnknownError(error);
  }
}
