import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { verifyPassword, signAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { jsonError } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;

const loginSchema = z.object({
  email: z.string().email("بريد إلكتروني غير صالح"),
  password: z.string().min(1, "كلمة المرور مطلوبة"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = loginSchema.parse(body);

    const [user] = await db.select().from(users).where(eq(users.email, data.email)).limit(1);
    if (!user) {
      return jsonError("البريد الإلكتروني أو كلمة المرور غير صحيحة", 401);
    }

    const valid = await verifyPassword(data.password, user.passwordHash);
    if (!valid) {
      return jsonError("البريد الإلكتروني أو كلمة المرور غير صحيحة", 401);
    }

    const token = signAuthToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
    });

    const response = NextResponse.json({
      ok: true,
      user: { id: user.id, fullName: user.fullName, email: user.email, role: user.role },
      token,
    });

    response.cookies.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: TOKEN_TTL_SECONDS,
    });

    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonError("بيانات غير صالحة", 422);
    }
    return jsonError("حدث خطأ غير متوقع في الخادم", 500);
  }
}
