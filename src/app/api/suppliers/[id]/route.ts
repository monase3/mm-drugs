import { NextRequest } from "next/server";
import { eq, and, desc } from "drizzle-orm";
import { db } from "@/db";
import { drugs, ratings, supplierProducts, users, purchaseOrders } from "@/db/schema";
import { getCurrentUser, verifyBearerToken } from "@/lib/auth";
import { jsonOk, jsonError, handleUnknownError } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    let user = await getCurrentUser();
    if (!user) user = verifyBearerToken(request.headers.get("authorization"));
    if (!user) return jsonError("غير مصرح", 401);

    const { id } = await params;

    const [supplier] = await db
      .select({ id: users.id, fullName: users.fullName, city: users.city, email: users.email, phone: users.phone })
      .from(users)
      .where(and(eq(users.id, id), eq(users.role, "supplier")))
      .limit(1);

    if (!supplier) return jsonError("المورد غير موجود", 404);

    const products = await db
      .select({
        id: supplierProducts.id,
        drugName: drugs.name,
        genericName: drugs.genericName,
        category: drugs.category,
        price: supplierProducts.price,
        minQuantity: supplierProducts.minQuantity,
        available: supplierProducts.available,
      })
      .from(supplierProducts)
      .innerJoin(drugs, eq(drugs.id, supplierProducts.drugId))
      .where(eq(supplierProducts.supplierId, id))
      .orderBy(drugs.name);

    const ratingRows = await db
      .select({
        score: ratings.score,
        comment: ratings.comment,
        fromUserName: users.fullName,
        createdAt: ratings.createdAt,
      })
      .from(ratings)
      .innerJoin(users, eq(users.id, ratings.fromUserId))
      .where(eq(ratings.toUserId, id))
      .orderBy(desc(ratings.createdAt));

    const avgRating = ratingRows.length > 0
      ? Math.round((ratingRows.reduce((s, r) => s + r.score, 0) / ratingRows.length) * 10) / 10
      : null;

    const completedOrders = await db
      .select({ count: purchaseOrders.id })
      .from(purchaseOrders)
      .where(and(eq(purchaseOrders.supplierId, id), eq(purchaseOrders.status, "delivered")));

    return jsonOk({
      supplier,
      products,
      ratings: ratingRows,
      avgRating,
      totalRatings: ratingRows.length,
      completedOrders: completedOrders.length,
    });
  } catch (error) {
    return handleUnknownError(error);
  }
}
