import { NextRequest } from "next/server";
import { sql, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { drugs } from "@/db/schema";
import { requireAdminApi } from "@/lib/dashboard-auth";
import { jsonOk, jsonError, handleUnknownError } from "@/lib/api-utils";
import { logAdminAction } from "@/lib/audit";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  name: z.string().min(1, "اسم الدواء مطلوب"),
  genericName: z.string().optional().default(""),
  manufacturer: z.string().optional().default(""),
  category: z.string().optional().default(""),
  unit: z.string().optional().default("علبة"),
  barcode: z.string().optional().default(""),
});

export async function GET(request: NextRequest) {
  const ctx = await requireAdminApi(request);
  if (!ctx) return jsonError("غير مصرح", 401);

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") ?? "";
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") ?? "50") || 50, 1), 200);
    const offset = Math.max(parseInt(searchParams.get("offset") ?? "0") || 0, 0);

    let query = sql`SELECT * FROM drugs`;
    const countQuery = sql`SELECT count(*)::int AS count FROM drugs`;

    if (search) {
      query = sql`
        SELECT * FROM drugs
        WHERE name ILIKE ${"%" + search + "%"}
           OR generic_name ILIKE ${"%" + search + "%"}
           OR barcode ILIKE ${"%" + search + "%"}
      `;
    }

    const result = await db.execute(sql`
      ${query} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}
    `);

    const countResult = await db.execute(countQuery);

    return jsonOk({ drugs: result.rows, total: countResult.rows[0]?.count ?? 0 });
  } catch (error) {
    return handleUnknownError(error);
  }
}

export async function POST(request: NextRequest) {
  const ctx = await requireAdminApi(request);
  if (!ctx) return jsonError("غير مصرح", 401);

  try {
    const body = await request.json();
    const data = createSchema.parse(body);

    const [existing] = await db
      .select()
      .from(drugs)
      .where(eq(drugs.barcode, data.barcode))
      .limit(1);

    if (existing) return jsonError("الباركود موجود مسبقاً", 409);

    const [drug] = await db
      .insert(drugs)
      .values({
        name: data.name,
        genericName: data.genericName || null,
        manufacturer: data.manufacturer || null,
        category: data.category || null,
        unit: data.unit,
        barcode: data.barcode || null,
      })
      .returning();

    await logAdminAction(ctx.user.sub, "drug.create", "drug", drug.id, {
      name: drug.name,
      genericName: drug.genericName,
    });

    return jsonOk({ drug }, 201);
  } catch (error) {
    return handleUnknownError(error);
  }
}
