import { NextRequest } from "next/server";
import { z } from "zod";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { jsonOk, jsonError, handleUnknownError } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  drugName: z.string().trim().min(1, "اسم الدواء مطلوب"),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radiusKm: z.coerce.number().min(0.1).max(100).default(10),
});

/**
 * GET /api/drugs/nearby?drugName=..&lat=..&lng=..&radiusKm=..
 *
 * Uses PostGIS ST_DWithin against the GiST-indexed `geom` geography
 * column on `pharmacies` for an efficient radius search, joined with
 * live inventory to only return pharmacies that actually have stock.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = querySchema.parse({
      drugName: searchParams.get("drugName") ?? undefined,
      lat: searchParams.get("lat") ?? undefined,
      lng: searchParams.get("lng") ?? undefined,
      radiusKm: searchParams.get("radiusKm") ?? undefined,
    });

    const radiusMeters = parsed.radiusKm * 1000;
    const searchTerm = `%${parsed.drugName}%`;

    const result = await db.execute(sql`
      SELECT
        p.id            AS pharmacy_id,
        p.name          AS pharmacy_name,
        p.city          AS city,
        p.address       AS address,
        p.phone         AS phone,
        p.latitude      AS latitude,
        p.longitude     AS longitude,
        d.id            AS drug_id,
        d.name          AS drug_name,
        d.unit          AS unit,
        i.quantity      AS quantity,
        i.retail_price  AS price,
        (SELECT ROUND(AVG(score)::numeric, 1)::float FROM pharmacy_reviews WHERE pharmacy_id = p.id) AS rating,
        ROUND(
          ST_Distance(
            p.geom,
            ST_SetSRID(ST_MakePoint(${parsed.lng}, ${parsed.lat}), 4326)::geography
          )::numeric
        ) AS distance_m
        ROUND(
          ST_Distance(
            p.geom,
            ST_SetSRID(ST_MakePoint(${parsed.lng}, ${parsed.lat}), 4326)::geography
          )::numeric
        ) AS distance_m
      FROM pharmacies p
      JOIN inventory i ON i.pharmacy_id = p.id
      JOIN drugs d ON d.id = i.drug_id
      WHERE p.is_active = TRUE
        AND i.quantity > 0
        AND d.name ILIKE ${searchTerm}
        AND ST_DWithin(
          p.geom,
          ST_SetSRID(ST_MakePoint(${parsed.lng}, ${parsed.lat}), 4326)::geography,
          ${radiusMeters}
        )
      ORDER BY distance_m ASC
      LIMIT 50;
    `);

    const rows = result.rows.map((row) => ({
      pharmacyId: row.pharmacy_id,
      pharmacyName: row.pharmacy_name,
      city: row.city,
      address: row.address,
      phone: row.phone,
      latitude: Number(row.latitude),
      longitude: Number(row.longitude),
      drugId: row.drug_id,
      drugName: row.drug_name,
      unit: row.unit,
      quantity: Number(row.quantity),
      price: Number(row.price),
      rating: row.rating != null ? Number(row.rating) : null,
      distanceMeters: Number(row.distance_m),
    }));

    return jsonOk({ query: parsed, count: rows.length, results: rows });
  } catch (error) {
    return handleUnknownError(error);
  }
}
