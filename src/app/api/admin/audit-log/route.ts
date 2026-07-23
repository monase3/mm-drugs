import { NextRequest } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { requireAdminApi } from "@/lib/dashboard-auth";
import { jsonOk, jsonError, handleUnknownError } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const ctx = await requireAdminApi(request);
  if (!ctx) return jsonError("غير مصرح", 401);

  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") ?? "50") || 50, 1), 200);
    const offset = Math.max(parseInt(searchParams.get("offset") ?? "0") || 0, 0);

    const result = await db.execute(sql`
      SELECT
        a.id, a.action, a.entity_type, a.entity_id, a.details, a.created_at,
        u.full_name AS admin_name, u.email AS admin_email
      FROM admin_audit_log a
      LEFT JOIN users u ON u.id = a.admin_id
      ORDER BY a.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `);

    const countResult = await db.execute(sql`
      SELECT count(*)::int AS count FROM admin_audit_log
    `);

    return jsonOk({ logs: result.rows, total: countResult.rows[0]?.count ?? 0 });
  } catch (error) {
    return handleUnknownError(error);
  }
}
