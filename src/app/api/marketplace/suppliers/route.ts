import { NextRequest } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { drugs, ratings, supplierProducts, users } from "@/db/schema";
import { requirePharmacyOwner } from "@/lib/dashboard-auth";
import { jsonOk, jsonError } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const ctx = await requirePharmacyOwner(request);
    if (!ctx) return jsonError("غير مصرح لك", 401);

    const products = await db
      .select({
        id: supplierProducts.id,
        supplierId: supplierProducts.supplierId,
        supplierName: users.fullName,
        supplierCity: users.city,
        drugId: drugs.id,
        drugName: drugs.name,
        genericName: drugs.genericName,
        category: drugs.category,
        price: supplierProducts.price,
        minQuantity: supplierProducts.minQuantity,
        available: supplierProducts.available,
      })
      .from(supplierProducts)
      .innerJoin(drugs, eq(drugs.id, supplierProducts.drugId))
      .innerJoin(users, eq(users.id, supplierProducts.supplierId))
      .where(eq(supplierProducts.available, true));

    const supplierIds = [...new Set(products.map((p) => p.supplierId))];

    let avgRatings: Record<string, { avg: number; count: number }> = {};
    if (supplierIds.length > 0) {
      const ratingRows = await db
        .select({
          toUserId: ratings.toUserId,
          score: ratings.score,
        })
        .from(ratings)
        .where(inArray(ratings.toUserId, supplierIds));

      const grouped: Record<string, number[]> = {};
      for (const r of ratingRows) {
        if (!grouped[r.toUserId]) grouped[r.toUserId] = [];
        grouped[r.toUserId].push(r.score);
      }
      for (const [uid, scores] of Object.entries(grouped)) {
        avgRatings[uid] = {
          avg: Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10,
          count: scores.length,
        };
      }
    }

    const supplierMap = new Map<string, {
      id: string;
      fullName: string;
      city: string;
      products: typeof products;
      avgRating: number | null;
      totalRatings: number;
    }>();

    for (const p of products) {
      if (!supplierMap.has(p.supplierId)) {
        supplierMap.set(p.supplierId, {
          id: p.supplierId,
          fullName: p.supplierName,
          city: p.supplierCity ?? "",
          products: [],
          avgRating: avgRatings[p.supplierId]?.avg ?? null,
          totalRatings: avgRatings[p.supplierId]?.count ?? 0,
        });
      }
      supplierMap.get(p.supplierId)!.products.push(p);
    }

    return jsonOk({ suppliers: Array.from(supplierMap.values()) });
  } catch (error) {
    console.error("Marketplace suppliers error:", error);
    return jsonError("حدث خطأ في تحميل بيانات السوق", 500);
  }
}
