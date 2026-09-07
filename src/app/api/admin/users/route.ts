import { sql } from "drizzle-orm";
import { db } from "@/db";
import { requireAdminApi } from "@/lib/dashboard-auth";
import { jsonOk, jsonError } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const ctx = await requireAdminApi(request);
  if (!ctx) return jsonError("غير مصرح", 401);

  const rows = await db.execute(sql`
    SELECT
      u.id, u.full_name, u.email, u.phone, u.role, u.created_at,
      p.name AS pharmacy_name
    FROM users u
    LEFT JOIN pharmacies p ON p.owner_id = u.id OR p.id = u.pharmacy_id
    ORDER BY u.created_at DESC
  `);

  return jsonOk({ users: rows.rows });
}
