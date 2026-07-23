import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getCurrentUser, verifyBearerToken, type AuthTokenPayload } from "@/lib/auth";

export interface SupplierContext {
  user: AuthTokenPayload;
}

export async function requireSupplier(request?: Request): Promise<SupplierContext | null> {
  let user = await getCurrentUser();
  if (!user && request) {
    user = verifyBearerToken(request.headers.get("authorization"));
  }
  if (!user || user.role !== "supplier") return null;

  const [supplier] = await db.select().from(users).where(eq(users.id, user.sub)).limit(1);
  if (!supplier) return null;
  return { user };
}
