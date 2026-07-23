import { NextRequest } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { requireAdminApi } from "@/lib/dashboard-auth";
import { jsonOk, jsonError, handleUnknownError } from "@/lib/api-utils";
import { logAdminAction } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAdminApi(request);
  if (!ctx) return jsonError("غير مصرح", 401);

  try {
    const { id } = await params;

    const revokedKey = `revoked_${Array.from({ length: 16 }, () =>
      Math.floor(Math.random() * 36).toString(36)).join("")}`;

    const result = await db.execute(sql`
      UPDATE pharmacies SET api_key = ${revokedKey}
      WHERE id = ${id} RETURNING id, name, api_key
    `);

    if (!result.rows[0]) return jsonError("الصيدلية غير موجودة", 404);

    await logAdminAction(ctx.user.sub, "api_key.revoke", "api_key", id, {
      pharmacyName: result.rows[0].name,
    });

    return jsonOk({ revoked: true, pharmacy: result.rows[0] });
  } catch (error) {
    return handleUnknownError(error);
  }
}
