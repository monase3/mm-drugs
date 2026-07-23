import { NextRequest } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { requireAdminApi } from "@/lib/dashboard-auth";
import { jsonOk, jsonError, handleUnknownError } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const ctx = await requireAdminApi(request);
  if (!ctx) return jsonError("غير مصرح", 401);

  try {
    const result = await db.execute(sql`
      SELECT
        p.id, p.name AS pharmacy_name, p.city, p.is_active,
        p.api_key, p.created_at,
        u.full_name AS owner_name, u.email AS owner_email
      FROM pharmacies p
      LEFT JOIN users u ON u.id = p.owner_id
      ORDER BY p.created_at DESC
    `);

    return jsonOk({
      keys: result.rows.map((r: Record<string, unknown>) => ({
        pharmacyId: r.id,
        pharmacyName: r.pharmacy_name,
        city: r.city,
        isActive: r.is_active,
        apiKey: r.api_key,
        ownerName: r.owner_name,
        ownerEmail: r.owner_email,
        createdAt: r.created_at,
      })),
    });
  } catch (error) {
    return handleUnknownError(error);
  }
}
