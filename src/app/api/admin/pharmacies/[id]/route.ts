import { NextRequest } from "next/server";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { requireAdminApi } from "@/lib/dashboard-auth";
import { jsonOk, jsonError, handleUnknownError } from "@/lib/api-utils";
import { logAdminAction } from "@/lib/audit";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  isActive: z.boolean().optional(),
  city: z.string().min(1).optional(),
  address: z.string().optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAdminApi(request);
  if (!ctx) return jsonError("غير مصرح", 401);

  try {
    const { id } = await params;
    const body = await request.json();
    const data = patchSchema.parse(body);

    const sets: ReturnType<typeof sql>[] = [];
    if (data.isActive !== undefined) sets.push(sql`is_active = ${data.isActive}`);
    if (data.city !== undefined) sets.push(sql`city = ${data.city}`);
    if (data.address !== undefined) sets.push(sql`address = ${data.address}`);

    if (sets.length === 0) return jsonError("لا توجد بيانات للتحديث", 422);

    const result = await db.execute(sql`
      UPDATE pharmacies SET ${sql.join(sets, sql`, `)}
      WHERE id = ${id} RETURNING id, name, is_active, city
    `);

    if (!result.rows[0]) return jsonError("الصيدلية غير موجودة", 404);

    const pharmacy = result.rows[0] as Record<string, unknown>;

    await logAdminAction(
      ctx.user.sub,
      data.isActive !== undefined ? "pharmacy.toggle_active" : "pharmacy.update",
      "pharmacy",
      id,
      { name: pharmacy.name, changes: data },
    );

    return jsonOk({ pharmacy });
  } catch (error) {
    return handleUnknownError(error);
  }
}
