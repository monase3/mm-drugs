import { NextRequest } from "next/server";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { requireAdminApi } from "@/lib/dashboard-auth";
import { jsonOk, jsonError, handleUnknownError } from "@/lib/api-utils";
import { logAdminAction } from "@/lib/audit";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  role: z.enum(["citizen", "pharmacy_owner", "pharmacy_staff", "admin"]).optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAdminApi(request);
  if (!ctx) return jsonError("غير مصرح", 401);

  try {
    const { id } = await params;
    const body = await request.json();
    const data = patchSchema.parse(body);

    if (!data.role) return jsonError("لا توجد بيانات للتحديث", 422);

    const result = await db.execute(sql`
      UPDATE users SET role = ${data.role}
      WHERE id = ${id} RETURNING id, full_name, email, role
    `);

    if (!result.rows[0]) return jsonError("المستخدم غير موجود", 404);

    const user = result.rows[0] as Record<string, unknown>;

    await logAdminAction(ctx.user.sub, "user.change_role", "user", id, {
      email: user.email,
      newRole: data.role,
    });

    return jsonOk({ user });
  } catch (error) {
    return handleUnknownError(error);
  }
}
