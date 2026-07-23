import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { pharmacies } from "@/db/schema";
import { getCurrentUser, verifyBearerToken, type AuthTokenPayload } from "@/lib/auth";

export interface OwnerContext {
  user: AuthTokenPayload;
  pharmacy: typeof pharmacies.$inferSelect;
  isOwner: boolean;
}

export interface AdminContext {
  user: AuthTokenPayload;
}

async function findPharmacy(userId: string, role: string) {
  if (role === "pharmacy_owner") {
    const [pharmacy] = await db
      .select()
      .from(pharmacies)
      .where(eq(pharmacies.ownerId, userId))
      .limit(1);
    return pharmacy;
  }

  const result = await db.execute(sql`
    SELECT p.* FROM pharmacies p
    JOIN users u ON u.pharmacy_id = p.id
    WHERE u.id = ${userId}
  `);
  return result.rows[0] as typeof pharmacies.$inferSelect | undefined;
}

/** Resolves the logged-in pharmacy owner and their pharmacy record, or null. */
export async function requirePharmacyOwner(request?: Request): Promise<OwnerContext | null> {
  let user = await getCurrentUser();
  if (!user && request) {
    user = verifyBearerToken(request.headers.get("authorization"));
  }
  if (!user || user.role !== "pharmacy_owner") return null;

  const pharmacy = await findPharmacy(user.sub, user.role);
  if (!pharmacy) return null;
  return { user, pharmacy, isOwner: true };
}

/** Resolves owner or staff, finding pharmacy via owner_id or pharmacy_id. */
export async function requirePharmacyAccess(request?: Request): Promise<OwnerContext | null> {
  let user = await getCurrentUser();
  if (!user && request) {
    user = verifyBearerToken(request.headers.get("authorization"));
  }
  if (!user || (user.role !== "pharmacy_owner" && user.role !== "pharmacy_staff")) return null;

  const pharmacy = await findPharmacy(user.sub, user.role);
  if (!pharmacy) return null;
  return { user, pharmacy, isOwner: user.role === "pharmacy_owner" };
}

/** Resolves the logged-in admin user, or null. */
export async function requireAdmin(): Promise<AdminContext | null> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return null;
  return { user };
}

/** Resolves admin from cookie or Authorization header (for API routes). */
export async function requireAdminApi(request: Request): Promise<AdminContext | null> {
  const cookieUser = await getCurrentUser();
  if (cookieUser && cookieUser.role === "admin") return { user: cookieUser };

  const authHeader = request.headers.get("Authorization");
  const headerUser = verifyBearerToken(authHeader);
  if (headerUser && headerUser.role === "admin") return { user: headerUser };

  return null;
}
