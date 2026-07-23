import { NextRequest } from "next/server";
import { z } from "zod";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { pharmacyRequests } from "@/db/schema";
import { getCurrentUser, verifyBearerToken } from "@/lib/auth";
import { jsonOk, jsonError, handleUnknownError } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

const requestSchema = z.object({
  pharmacyId: z.string().uuid(),
  drugName: z.string().min(1, "اسم الدواء مطلوب"),
  quantity: z.number().int().min(1).default(1),
  notes: z.string().optional().default(""),
});

export async function POST(request: NextRequest) {
  try {
    let user = await getCurrentUser();
    if (!user) user = verifyBearerToken(request.headers.get("authorization"));
    if (!user) return jsonError("يجب تسجيل الدخول أولاً", 401);

    const body = await request.json();
    const data = requestSchema.parse(body);

    await db.insert(pharmacyRequests).values({
      citizenId: user.sub,
      pharmacyId: data.pharmacyId,
      drugName: data.drugName,
      quantity: data.quantity,
      notes: data.notes || null,
    });

    return jsonOk({ success: true }, 201);
  } catch (error) {
    return handleUnknownError(error);
  }
}

export async function GET(request: NextRequest) {
  try {
    let user = await getCurrentUser();
    if (!user) user = verifyBearerToken(request.headers.get("authorization"));
    if (!user || user.role !== "citizen") return jsonError("غير مصرح", 401);

    const result = await db.execute(sql`
      SELECT
        r.id, r.drug_name, r.quantity, r.notes, r.status, r.created_at, r.updated_at,
        p.id AS pharmacy_id, p.name AS pharmacy_name, p.city, p.phone, p.latitude, p.longitude
      FROM pharmacy_requests r
      JOIN pharmacies p ON p.id = r.pharmacy_id
      WHERE r.citizen_id = ${user.sub}
      ORDER BY r.created_at DESC
      LIMIT 50
    `);

    return jsonOk({ requests: result.rows });
  } catch (error) {
    return handleUnknownError(error);
  }
}
