import { NextRequest } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { requirePharmacyAccess } from "@/lib/dashboard-auth";
import { jsonOk, jsonError } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const ctx = await requirePharmacyAccess(request);
  if (!ctx) return jsonError("غير مصرح", 401);

  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const limit = Math.min(Number(url.searchParams.get("limit") || "50"), 200);
  const offset = Number(url.searchParams.get("offset") || "0");

  const where = [`r.pharmacy_id = ${ctx.pharmacy.id}::uuid`];
  if (status && ["pending", "accepted", "rejected", "fulfilled"].includes(status)) {
    where.push(`r.status = '${status}'`);
  }

  const result = await db.execute(sql`
    SELECT
      r.id, r.drug_name, r.quantity, r.notes, r.status, r.created_at, r.updated_at,
      u.full_name AS citizen_name, u.phone AS citizen_phone,
      (SELECT i.quantity::int FROM inventory i
       JOIN drugs d ON d.id = i.drug_id
       WHERE i.pharmacy_id = ${ctx.pharmacy.id}::uuid AND d.name = r.drug_name
       LIMIT 1) AS stock_quantity
    FROM pharmacy_requests r
    LEFT JOIN users u ON u.id = r.citizen_id
    WHERE r.pharmacy_id = ${ctx.pharmacy.id}::uuid
    ORDER BY r.created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `);

  const totalResult = await db.execute(sql`
    SELECT COUNT(*)::int AS total FROM pharmacy_requests WHERE pharmacy_id = ${ctx.pharmacy.id}::uuid
  `);
  const total = (totalResult.rows[0] as { total: number }).total;

  return jsonOk({ requests: result.rows, total });
}
