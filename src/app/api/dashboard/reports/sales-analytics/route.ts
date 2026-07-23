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
    const sales = await db.execute(sql`
      SELECT
        coalesce(sum(m.quantity_change * i.retail_price), 0) AS total_sales,
        coalesce(sum(m.quantity_change * (i.retail_price - i.cost_price)), 0) AS total_profit
      FROM inventory_movements m
      JOIN inventory i ON i.drug_id = m.drug_id AND i.pharmacy_id = m.pharmacy_id
      WHERE m.pharmacy_id = ${ctx.pharmacy.id}
        AND m.movement_type = 'sale'
    `);

    const topDrugs = await db.execute(sql`
      SELECT
        d.name,
        sum(m.quantity_change)::int AS quantity,
        coalesce(sum(m.quantity_change * i.retail_price), 0) AS revenue
      FROM inventory_movements m
      JOIN inventory i ON i.drug_id = m.drug_id AND i.pharmacy_id = m.pharmacy_id
      JOIN drugs d ON d.id = m.drug_id
      WHERE m.pharmacy_id = ${ctx.pharmacy.id}
        AND m.movement_type = 'sale'
      GROUP BY d.name
      ORDER BY quantity DESC
      LIMIT 10
    `);

    return jsonOk({
      total_sales: (sales.rows[0] as any)?.total_sales ?? "0",
      total_profit: (sales.rows[0] as any)?.total_profit ?? "0",
      top_drugs: topDrugs.rows,
    });
  } catch (error) {
    return handleUnknownError(error);
  }
}
