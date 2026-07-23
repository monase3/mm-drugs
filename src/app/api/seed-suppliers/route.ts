import { db } from "@/db";
import { sql } from "drizzle-orm";
import { jsonOk, handleUnknownError } from "@/lib/api-utils";
import { hashPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const results: string[] = [];
    const passwordHash = await hashPassword("123456");

    const suppliers = [
      { email: "alwaha@test.com", fullName: "شركة الواحة للأدوية", city: "عدن", phone: "+967771001001" },
      { email: "albaraka@test.com", fullName: "مؤسسة البركة الطبية", city: "صنعاء", phone: "+967771002002" },
      { email: "aldawa@test.com", fullName: "شركة الدواء اليمنية", city: "تعز", phone: "+967771003003" },
    ];

    const supplierIds: string[] = [];
    for (const s of suppliers) {
      const existing = await db.execute(sql`SELECT id FROM users WHERE email = ${s.email} LIMIT 1`);
      if (existing.rows.length > 0) {
        supplierIds.push((existing.rows[0] as Record<string, unknown>).id as string);
        results.push(`Supplier exists: ${s.fullName}`);
        continue;
      }
      const r = await db.execute(sql`
        INSERT INTO users (full_name, email, phone, password_hash, role)
        VALUES (${s.fullName}, ${s.email}, ${s.phone}, ${passwordHash}, 'supplier')
        RETURNING id
      `);
      const id = (r.rows[0] as Record<string, unknown>).id as string;
      supplierIds.push(id);
      results.push(`Supplier: ${s.fullName} (${s.email}) -> ${id}`);
    }

    // Get drug IDs first
    const drugRows = await db.execute(sql`SELECT id, name FROM drugs`);
    const drugMap: Record<string, string> = {};
    for (const row of drugRows.rows) {
      const r = row as Record<string, unknown>;
      drugMap[r.name as string] = r.id as string;
    }

    const supplierProducts: Record<number, { drugName: string; price: number; minQuantity: number }[]> = {
      0: [
        { drugName: "بانادول", price: 2.50, minQuantity: 50 },
        { drugName: "أوغمنتين", price: 15.00, minQuantity: 30 },
        { drugName: "فينتولين", price: 9.50, minQuantity: 20 },
        { drugName: "فولتارين", price: 6.00, minQuantity: 40 },
        { drugName: "نوروفين", price: 5.00, minQuantity: 50 },
      ],
      1: [
        { drugName: "أموكسيسيلين", price: 4.00, minQuantity: 60 },
        { drugName: "بانادول", price: 2.80, minQuantity: 100 },
        { drugName: "بروفين", price: 5.50, minQuantity: 40 },
        { drugName: "لوميل", price: 12.00, minQuantity: 25 },
      ],
      2: [
        { drugName: "بانادول", price: 2.30, minQuantity: 80 },
        { drugName: "أوغمنتين", price: 14.00, minQuantity: 30 },
        { drugName: "دوفاستون", price: 18.00, minQuantity: 20 },
        { drugName: "بريمول", price: 15.50, minQuantity: 20 },
        { drugName: "روفين", price: 7.00, minQuantity: 30 },
      ],
    };

    for (let si = 0; si < supplierIds.length; si++) {
      const sid = supplierIds[si];
      const products = supplierProducts[si] || [];
      for (const p of products) {
        const drugId = drugMap[p.drugName];
        if (!drugId) {
          results.push(`Drug not found: ${p.drugName}`);
          continue;
        }
        const existing = await db.execute(sql`
          SELECT id FROM supplier_products WHERE supplier_id = ${sid}::uuid AND drug_id = ${drugId}::uuid LIMIT 1
        `);
        if (existing.rows.length > 0) continue;
        await db.execute(sql`
          INSERT INTO supplier_products (supplier_id, drug_id, price, min_quantity, available)
          VALUES (${sid}::uuid, ${drugId}::uuid, ${p.price.toString()}, ${p.minQuantity}, TRUE)
        `);
      }
      results.push(`Products added for ${suppliers[si].fullName}`);
    }

    return jsonOk({ ok: true, results });
  } catch (error) {
    return handleUnknownError(error);
  }
}
