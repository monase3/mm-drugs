import { NextRequest } from "next/server";
import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { drugs, inventory } from "@/db/schema";
import { requirePharmacyOwner } from "@/lib/dashboard-auth";
import { jsonOk, jsonError, handleUnknownError } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const ctx = await requirePharmacyOwner(request);
  if (!ctx) return jsonError("غير مصرح لك بالوصول إلى هذه البيانات", 401);

  const rows = await db
    .select({
      id: inventory.id,
      quantity: inventory.quantity,
      costPrice: inventory.costPrice,
      retailPrice: inventory.retailPrice,
      expiryDate: inventory.expiryDate,
      batchNumber: inventory.batchNumber,
      minStockLevel: inventory.minStockLevel,
      updatedAt: inventory.updatedAt,
      drugId: drugs.id,
      drugName: drugs.name,
      genericName: drugs.genericName,
      unit: drugs.unit,
      barcode: drugs.barcode,
    })
    .from(inventory)
    .innerJoin(drugs, eq(drugs.id, inventory.drugId))
    .where(eq(inventory.pharmacyId, ctx.pharmacy.id))
    .orderBy(desc(inventory.updatedAt));

  return jsonOk({ items: rows });
}

const createItemSchema = z.object({
  name: z.string().min(1, "اسم الدواء مطلوب"),
  genericName: z.string().optional(),
  manufacturer: z.string().optional(),
  unit: z.string().optional(),
  barcode: z.string().optional(),
  quantity: z.number().int().min(0),
  costPrice: z.number().min(0).optional(),
  retailPrice: z.number().min(0).optional(),
  expiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  batchNumber: z.string().optional(),
  minStockLevel: z.number().int().min(0).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const ctx = await requirePharmacyOwner(request);
    if (!ctx) return jsonError("غير مصرح لك بالوصول إلى هذه البيانات", 401);

    const body = await request.json();
    const data = createItemSchema.parse(body);

    let drugId: string;
    const existing = data.barcode
      ? await db.select().from(drugs).where(eq(drugs.barcode, data.barcode)).limit(1)
      : [];

    if (existing[0]) {
      drugId = existing[0].id;
    } else {
      const [created] = await db
        .insert(drugs)
        .values({
          name: data.name,
          genericName: data.genericName,
          manufacturer: data.manufacturer,
          unit: data.unit ?? "علبة",
          barcode: data.barcode,
        })
        .returning();
      drugId = created.id;
    }

    const [row] = await db
      .insert(inventory)
      .values({
        pharmacyId: ctx.pharmacy.id,
        drugId,
        quantity: data.quantity,
        costPrice: (data.costPrice ?? 0).toFixed(2),
        retailPrice: (data.retailPrice ?? data.costPrice ?? 0).toFixed(2),
        expiryDate: data.expiryDate,
        batchNumber: data.batchNumber ?? "GENERAL",
        minStockLevel: data.minStockLevel ?? 10,
      })
      .returning();

    return jsonOk({ item: row }, 201);
  } catch (error) {
    return handleUnknownError(error);
  }
}
