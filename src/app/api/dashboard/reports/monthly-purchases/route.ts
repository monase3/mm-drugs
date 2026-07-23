import { NextRequest } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { requirePharmacyOwner } from "@/lib/dashboard-auth";
import { jsonOk, jsonError, handleUnknownError } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const ctx = await requirePharmacyOwner(request);
  if (!ctx) return jsonError("غير مصرح", 401);

  try {
    const { searchParams } = new URL(request.url);
    const months = Math.min(Math.max(parseInt(searchParams.get("months") ?? "12") || 12, 1), 36);

    const result = await db.execute(sql`
      SELECT
        to_char(invoice_date, 'YYYY-MM') AS month,
        count(*)::int AS invoices_count,
        coalesce(sum(total_amount), 0) AS total_amount
      FROM purchase_invoices
      WHERE pharmacy_id = ${ctx.pharmacy.id}
        AND invoice_date >= CURRENT_DATE - INTERVAL '${sql.raw(String(months))} months'
      GROUP BY month
      ORDER BY month DESC
    `);

    return jsonOk({ months: result.rows });
  } catch (error) {
    return handleUnknownError(error);
  }
}
