import { NextRequest } from "next/server";
import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { drugs, supplierProducts } from "@/db/schema";
import { requireSupplier } from "@/lib/supplier-auth";
import { jsonOk, jsonError, handleUnknownError } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const ctx = await requireSupplier(request);
  if (!ctx) return jsonError("غير مصرح لك", 401);

  const rows = await db
    .select({
      id: supplierProducts.id,
      price: supplierProducts.price,
      minQuantity: supplierProducts.minQuantity,
      available: supplierProducts.available,
      createdAt: supplierProducts.createdAt,
      drugId: drugs.id,
      drugName: drugs.name,
      genericName: drugs.genericName,
      unit: drugs.unit,
      barcode: drugs.barcode,
    })
    .from(supplierProducts)
    .innerJoin(drugs, eq(drugs.id, supplierProducts.drugId))
    .where(eq(supplierProducts.supplierId, ctx.user.sub))
    .orderBy(desc(supplierProducts.createdAt));

  return jsonOk({ products: rows });
}

const createSchema = z.object({
  drugName: z.string().min(1, "اسم الدواء مطلوب"),
  genericName: z.string().optional(),
  manufacturer: z.string().optional(),
  barcode: z.string().optional(),
  price: z.number().min(0.01, "السعر مطلوب"),
  minQuantity: z.number().int().min(1).optional().default(1),
});

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireSupplier(request);
    if (!ctx) return jsonError("غير مصرح لك", 401);

    const body = await request.json();
    const data = createSchema.parse(body);

    let drugId: string;

    const byBarcode = data.barcode
      ? await db.select().from(drugs).where(eq(drugs.barcode, data.barcode)).limit(1)
      : [];

    if (byBarcode[0]) {
      drugId = byBarcode[0].id;
    } else {
      const byName = await db
        .select()
        .from(drugs)
        .where(eq(drugs.name, data.drugName))
        .limit(1);

      if (byName[0]) {
        drugId = byName[0].id;
      } else {
        const [created] = await db
          .insert(drugs)
          .values({
            name: data.drugName,
            genericName: data.genericName,
            manufacturer: data.manufacturer,
            barcode: data.barcode,
          })
          .returning();
        drugId = created.id;
      }
    }

    const [row] = await db
      .insert(supplierProducts)
      .values({
        supplierId: ctx.user.sub,
        drugId,
        price: data.price.toFixed(2),
        minQuantity: data.minQuantity,
      })
      .returning();

    return jsonOk({ product: row }, 201);
  } catch (error) {
    return handleUnknownError(error);
  }
}
