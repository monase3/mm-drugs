import { NextRequest } from "next/server";
import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { pharmacyReviews } from "@/db/schema";
import { getCurrentUser, verifyBearerToken } from "@/lib/auth";
import { jsonOk, jsonError, handleUnknownError } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

const rateSchema = z.object({
  pharmacyId: z.string().uuid(),
  requestId: z.string().uuid(),
  score: z.number().int().min(1).max(5),
  comment: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    let user = await getCurrentUser();
    if (!user) user = verifyBearerToken(request.headers.get("authorization"));
    if (!user || user.role !== "citizen") return jsonError("غير مصرح", 401);

    const body = await request.json();
    const data = rateSchema.parse(body);

    const [review] = await db
      .insert(pharmacyReviews)
      .values({
        citizenId: user.sub,
        pharmacyId: data.pharmacyId,
        requestId: data.requestId,
        score: data.score,
        comment: data.comment || null,
      })
      .returning();

    return jsonOk({ review }, 201);
  } catch (error: any) {
    if (error?.code === "23505") {
      return jsonError("لقد قمت بتقييم هذه الصيدلية مسبقاً لهذا الطلب", 409);
    }
    return handleUnknownError(error);
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const pharmacyId = url.searchParams.get("pharmacy_id");

    if (!pharmacyId) return jsonError("pharmacy_id مطلوب", 422);

    const result = await db.execute(sql`
      SELECT
        ROUND(AVG(score)::numeric, 1)::float AS avg_score,
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE score = 5)::int AS five_star,
        COUNT(*) FILTER (WHERE score = 4)::int AS four_star,
        COUNT(*) FILTER (WHERE score = 3)::int AS three_star,
        COUNT(*) FILTER (WHERE score = 2)::int AS two_star,
        COUNT(*) FILTER (WHERE score = 1)::int AS one_star
      FROM pharmacy_reviews
      WHERE pharmacy_id = ${pharmacyId}::uuid
    `);

    return jsonOk({ stats: result.rows[0] });
  } catch (error) {
    return handleUnknownError(error);
  }
}
