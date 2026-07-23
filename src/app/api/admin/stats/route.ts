import { sql } from "drizzle-orm";
import { db } from "@/db";
import { requireAdminApi } from "@/lib/dashboard-auth";
import { jsonOk, jsonError } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const ctx = await requireAdminApi(request);
  if (!ctx) return jsonError("غير مصرح", 401);

  const [{ count: usersCount }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(sql`users`);

  const [{ count: pharmaciesCount }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(sql`pharmacies`);

  const [{ count: activePharmacies }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(sql`pharmacies`)
    .where(sql`is_active = TRUE`);

  const [{ count: drugsCount }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(sql`drugs`);

  const [{ count: inventoryItems }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(sql`inventory`);

  return jsonOk({
    users: usersCount,
    pharmacies: pharmaciesCount,
    activePharmacies,
    drugs: drugsCount,
    inventoryItems,
  });
}
