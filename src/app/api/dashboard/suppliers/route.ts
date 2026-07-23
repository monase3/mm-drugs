import { NextRequest } from "next/server";
import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { suppliers } from "@/db/schema";
import { requirePharmacyOwner } from "@/lib/dashboard-auth";
import { jsonOk, jsonError, handleUnknownError } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const ctx = await requirePharmacyOwner(request);
  if (!ctx) return jsonError("غير مصرح لك بالوصول إلى هذه البيانات", 401);

  const rows = await db
    .select()
    .from(suppliers)
    .where(eq(suppliers.pharmacyId, ctx.pharmacy.id))
    .orderBy(desc(suppliers.createdAt));

  return jsonOk({ suppliers: rows });
}

const createSupplierSchema = z.object({
  name: z.string().min(2, "اسم المورد مطلوب"),
  phone: z.string().optional(),
  address: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const ctx = await requirePharmacyOwner(request);
    if (!ctx) return jsonError("غير مصرح لك بالوصول إلى هذه البيانات", 401);

    const body = await request.json();
    const data = createSupplierSchema.parse(body);

    const [row] = await db
      .insert(suppliers)
      .values({
        pharmacyId: ctx.pharmacy.id,
        name: data.name,
        phone: data.phone,
        address: data.address,
      })
      .returning();

    return jsonOk({ supplier: row }, 201);
  } catch (error) {
    return handleUnknownError(error);
  }
}
