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
      p.id, p.name, p.license_number, p.city, p.address,
      p.phone, p.is_active, p.created_at,
      u.full_name AS owner_name, u.email AS owner_email
    FROM pharmacies p
    LEFT JOIN users u ON u.id = p.owner_id
    ORDER BY p.created_at DESC
  `);

  return jsonOk({ pharmacies: rows.rows });
}
