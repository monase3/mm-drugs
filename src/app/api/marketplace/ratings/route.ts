import { NextRequest } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { ratings } from "@/db/schema";
import { requirePharmacyOwner } from "@/lib/dashboard-auth";
import { jsonOk, jsonError, handleUnknownError } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

const rateSchema = z.object({
  orderId: z.string().uuid(),
  toUserId: z.string().uuid(),
  score: z.number().int().min(1).max(5),
  comment: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const ctx = await requirePharmacyOwner(request);
    if (!ctx) return jsonError("غير مصرح لك", 401);

    const body = await request.json();
    const data = rateSchema.parse(body);

    const existing = await db
      .select()
      .from(ratings)
      .where(eq(ratings.orderId, data.orderId))
      .limit(1);

    if (existing.length > 0) return jsonError("تم تقييم هذا الطلب مسبقاً", 409);

    const [row] = await db
      .insert(ratings)
      .values({
        orderId: data.orderId,
        fromUserId: ctx.user.sub,
        toUserId: data.toUserId,
        score: data.score,
        comment: data.comment,
      })
      .returning();

    return jsonOk({ rating: row }, 201);
  } catch (error) {
    return handleUnknownError(error);
  }
}
