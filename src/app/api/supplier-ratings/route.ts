import { NextRequest } from "next/server";
import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { db } from "@/db";
import { purchaseOrders, ratings, users } from "@/db/schema";
import { getCurrentUser, verifyBearerToken } from "@/lib/auth";
import { jsonOk, jsonError, handleUnknownError } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

const rateSchema = z.object({
  orderId: z.string().uuid(),
  score: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional(),
});

export async function POST(request: NextRequest) {
  try {
    let user = await getCurrentUser();
    if (!user) user = verifyBearerToken(request.headers.get("authorization"));
    if (!user) return jsonError("غير مصرح", 401);

    const body = await request.json();
    const data = rateSchema.parse(body);

    const [order] = await db
      .select({ id: purchaseOrders.id, supplierId: purchaseOrders.supplierId, pharmacyId: purchaseOrders.pharmacyId })
      .from(purchaseOrders)
      .where(and(eq(purchaseOrders.id, data.orderId), eq(purchaseOrders.status, "delivered")))
      .limit(1);

    if (!order) return jsonError("الطلب غير موجود أو لم يتم تسليمه بعد", 404);

    const [pharmacyUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.id, user.sub), eq(users.role, "pharmacy_owner")))
      .limit(1);

    if (!pharmacyUser) return jsonError("فقط أصحاب الصيدليات يمكنهم التقييم", 403);

    const [rating] = await db
      .insert(ratings)
      .values({
        orderId: data.orderId,
        fromUserId: user.sub,
        toUserId: order.supplierId,
        score: data.score,
        comment: data.comment || null,
      })
      .returning();

    return jsonOk({ rating }, 201);
  } catch (error: any) {
    if (error?.code === "23505") {
      return jsonError("لقد قمت بتقييم هذا الطلب مسبقاً", 409);
    }
    return handleUnknownError(error);
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const supplierId = url.searchParams.get("supplier_id");
    if (!supplierId) return jsonError("supplier_id مطلوب", 422);

    const rows = await db
      .select({
        score: ratings.score,
        comment: ratings.comment,
        fromUserName: users.fullName,
        createdAt: ratings.createdAt,
      })
      .from(ratings)
      .innerJoin(users, eq(users.id, ratings.fromUserId))
      .where(eq(ratings.toUserId, supplierId))
      .orderBy(desc(ratings.createdAt));

    const avgRating = rows.length > 0
      ? Math.round((rows.reduce((s, r) => s + r.score, 0) / rows.length) * 10) / 10
      : null;

    return jsonOk({ ratings: rows, avgRating, totalRatings: rows.length });
  } catch (error) {
    return handleUnknownError(error);
  }
}
