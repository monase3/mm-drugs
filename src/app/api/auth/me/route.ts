import { eq } from "drizzle-orm";
import { db } from "@/db";
import { pharmacies } from "@/db/schema";
import { getCurrentUser, verifyBearerToken } from "@/lib/auth";
import { jsonOk, jsonError } from "@/lib/api-utils";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  let user = await getCurrentUser();
  if (!user) {
    user = verifyBearerToken(request.headers.get("authorization"));
  }
  if (!user) return jsonError("غير مصرح لك، الرجاء تسجيل الدخول", 401);

  let pharmacy = null;
  if (user.role === "pharmacy_owner") {
    const [p] = await db.select().from(pharmacies).where(eq(pharmacies.ownerId, user.sub)).limit(1);
    pharmacy = p ?? null;
  }

  return jsonOk({ user, pharmacy });
}
