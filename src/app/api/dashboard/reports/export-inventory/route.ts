import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { requirePharmacyAccess } from "@/lib/dashboard-auth";
import { jsonError } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const ctx = await requirePharmacyAccess(request);
  if (!ctx) return jsonError("غير مصرح", 401);

  try {
    const result = await db.execute(sql`
      SELECT
        d.name, d.generic_name, d.manufacturer, d.category, d.unit,
        i.quantity, i.cost_price, i.retail_price, i.batch_number, i.expiry_date, 
        i.min_stock_level, i.updated_at
      FROM inventory i
      JOIN drugs d ON d.id = i.drug_id
      WHERE i.pharmacy_id = ${ctx.pharmacy.id}
      ORDER BY d.name
    `);

    const rows = result.rows as Record<string, unknown>[];
    const header = "الاسم,الاسم العلمي,الشركة,التصنيف,الوحدة,الكمية,سعر التكلفة,سعر البيع,رقم التشغيلة,تاريخ الانتهاء,حد أدنى,آخر تحديث";
    const csv = rows.map((r) =>
      [
        `"${r.name ?? ""}"`,
        `"${r.generic_name ?? ""}"`,
        `"${r.manufacturer ?? ""}"`,
        `"${r.category ?? ""}"`,
        `"${r.unit ?? ""}"`,
        r.quantity ?? 0,
        r.cost_price ?? 0,
        r.retail_price ?? 0,
        `"${r.batch_number ?? ""}"`,
        r.expiry_date ?? "",
        r.min_stock_level ?? 10,
        r.updated_at ?? "",
      ].join(","),
    ).join("\n");

    const encoder = new TextEncoder();
    const bytes = encoder.encode(`\uFEFF${header}\n${csv}`);
    return new NextResponse(bytes, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="inventory_${ctx.pharmacy.name.replace(/[^a-zA-Z0-9]/g, "_")}.csv"`,
      },
    });
  } catch (error) {
    console.error(error);
    return jsonError("حدث خطأ غير متوقع في الخادم", 500);
  }
}
