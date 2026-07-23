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
    const total = await db.execute(sql`
      SELECT
        coalesce(sum(i.quantity * i.retail_price), 0) AS total_retail_value,
        coalesce(sum(i.quantity * i.cost_price), 0) AS total_cost_value,
        coalesce(sum(i.quantity * (i.retail_price - i.cost_price)), 0) AS total_potential_profit,
        count(*)::int AS total_items,
        count(*) FILTER (WHERE i.quantity <= i.min_stock_level AND i.quantity > 0)::int AS low_stock_items,
        count(*) FILTER (WHERE i.quantity = 0)::int AS out_of_stock,
        count(*) FILTER (WHERE i.expiry_date < CURRENT_DATE)::int AS expired_items,
        count(*) FILTER (WHERE i.expiry_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '30 days'))::int AS expiring_soon
      FROM inventory i
      WHERE i.pharmacy_id = ${ctx.pharmacy.id}
    `);

    const byCategory = await db.execute(sql`
      SELECT
        coalesce(d.category, 'عام') AS category,
        count(*)::int AS items,
        coalesce(sum(i.quantity), 0)::int AS total_qty,
        coalesce(sum(i.quantity * i.retail_price), 0) AS total_retail,
        coalesce(sum(i.quantity * i.cost_price), 0) AS total_cost,
        coalesce(sum(i.quantity * (i.retail_price - i.cost_price)), 0) AS profit
      FROM inventory i
      JOIN drugs d ON d.id = i.drug_id
      WHERE i.pharmacy_id = ${ctx.pharmacy.id}
      GROUP BY d.category
      ORDER BY total_retail DESC
    `);

    return jsonOk({
      summary: total.rows[0],
      byCategory: byCategory.rows,
    });
  } catch (error) {
    return handleUnknownError(error);
  }
}
