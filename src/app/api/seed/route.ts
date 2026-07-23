import { db } from "@/db";
import { sql } from "drizzle-orm";
import { jsonOk, handleUnknownError } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const results: string[] = [];

    // 1. Create pharmacies in Aden
    const pharmacies = [
      { name: 'صيدلية الشفاء', city: 'عدن', address: 'حي السنافر، بجانب مسجد الفردوس', phone: '+967770111001', lat: 12.7860, lng: 45.0190, license: 'LIC-SHIFA-001' },
      { name: 'صيدلية الحياة', city: 'عدن', address: 'حي كريتر، شارع الثورة', phone: '+967770111002', lat: 12.7920, lng: 45.0280, license: 'LIC-HAYAT-002' },
      { name: 'صيدلية البشري', city: 'عدن', address: 'حي المعلا، شارع صلاح الدين', phone: '+96770111003', lat: 12.7800, lng: 45.0100, license: 'LIC-BASHR-003' },
      { name: 'صيدلية النور', city: 'عدن', address: 'حي التواهي، شارع الشهداء', phone: '+967770111004', lat: 12.7750, lng: 45.0350, license: 'LIC-NOOR-004' },
    ];

    const pharmacyIds: string[] = [];
    for (const p of pharmacies) {
      const apiKey = `pk_${p.license.toLowerCase()}_${Date.now().toString(36)}`;
      const r = await db.execute(sql`
        INSERT INTO pharmacies (name, license_number, city, address, phone, latitude, longitude, geom, is_active, api_key)
        VALUES (${p.name}, ${p.license}, ${p.city}, ${p.address}, ${p.phone}, ${p.lat}, ${p.lng},
          ST_SetSRID(ST_MakePoint(${p.lng}, ${p.lat}), 4326)::geography, TRUE, ${apiKey})
        ON CONFLICT (license_number) DO UPDATE SET
          name = ${p.name}, city = ${p.city}, address = ${p.address}, phone = ${p.phone},
          latitude = ${p.lat}, longitude = ${p.lng},
          geom = ST_SetSRID(ST_MakePoint(${p.lng}, ${p.lat}), 4326)::geography
        RETURNING id
      `);
      const id = (r.rows[0] as Record<string, unknown>).id as string;
      pharmacyIds.push(id);
      results.push(`Pharmacy: ${p.name} -> ${id}`);
    }

    // 2. Create drugs
    const drugs = [
      { name: 'بانادول', unit: 'شريط' },
      { name: 'أوغمنتين', unit: 'شريط' },
      { name: 'فينتولين', unit: 'عبوة' },
      { name: 'أموكسيسيلين', unit: 'شريط' },
      { name: 'فولتارين', unit: 'شريط' },
      { name: 'نوروفين', unit: 'شريط' },
      { name: 'بروفين', unit: 'شريط' },
      { name: 'لوميل', unit: 'عبوة' },
      { name: 'روفين', unit: 'شريط' },
      { name: 'سيتال', unit: 'شريط' },
      { name: 'دوفاستون', unit: 'شريط' },
      { name: 'بريمول', unit: 'شريط' },
    ];

    const drugIds: Record<string, string> = {};
    for (const d of drugs) {
      const existing = await db.execute(sql`SELECT id FROM drugs WHERE name = ${d.name} LIMIT 1`);
      if (existing.rows.length > 0) {
        drugIds[d.name] = (existing.rows[0] as Record<string, unknown>).id as string;
      } else {
        const r = await db.execute(sql`INSERT INTO drugs (name, unit) VALUES (${d.name}, ${d.unit}) RETURNING id`);
        drugIds[d.name] = (r.rows[0] as Record<string, unknown>).id as string;
      }
      results.push(`Drug: ${d.name} -> ${drugIds[d.name]}`);
    }

    // 3. Create inventory
    const sharedDrugs = ['بانادول', 'أوغمنتين', 'فينتولين', 'أموكسيسيلين'];
    const uniquePerPharmacy: Record<number, string[]> = {
      0: ['فولتارين', 'نوروفين'],
      1: ['بروفين', 'لوميل'],
      2: ['روفين', 'سيتال'],
      3: ['دوفاستون', 'بريمول'],
    };

    const prices: Record<string, number> = {
      'بانادول': 3.75, 'أوغمنتين': 18.50, 'فينتولين': 12.00, 'أموكسيسيلين': 5.25,
      'فولتارين': 8.00, 'نوروفين': 6.50, 'بروفين': 7.25, 'لوميل': 15.00,
      'روفين': 9.00, 'سيتال': 5.50, 'دوفاستون': 22.00, 'بريمول': 18.75,
    };

    for (let pi = 0; pi < pharmacyIds.length; pi++) {
      const phId = pharmacyIds[pi];
      const drugsForThis = [...sharedDrugs, ...(uniquePerPharmacy[pi] || [])];
      for (const dName of drugsForThis) {
        const qty = Math.floor(Math.random() * 120) + 20;
        const batch = `B-${pi}-${Date.now().toString(36)}`;
        await db.execute(sql`
          INSERT INTO inventory (pharmacy_id, drug_id, quantity, price, expiry_date, batch_number)
          VALUES (${phId}::uuid, ${drugIds[dName]}::uuid, ${qty}, ${prices[dName].toString()}, '2027-12-31', ${batch})
          ON CONFLICT DO NOTHING
        `);
      }
      results.push(`Inventory added for pharmacy ${pi + 1}`);
    }

    return jsonOk({ ok: true, results });
  } catch (error) {
    return handleUnknownError(error);
  }
}
