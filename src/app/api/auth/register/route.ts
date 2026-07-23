import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { users, pharmacies } from "@/db/schema";
import {
  hashPassword,
  signAuthToken,
  AUTH_COOKIE_NAME,
  generateApiKey,
} from "@/lib/auth";
import { handleUnknownError, jsonError } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;

const registerSchema = z.object({
  fullName: z.string().min(3, "الاسم الكامل مطلوب"),
  email: z.string().email("بريد إلكتروني غير صالح"),
  phone: z.string().min(6, "رقم الهاتف مطلوب"),
  password: z.string().min(6, "كلمة المرور يجب ألا تقل عن 6 أحرف"),
  role: z.enum(["citizen", "pharmacy_owner", "supplier"]).default("citizen"),
  pharmacy: z
    .object({
      name: z.string().min(2),
      licenseNumber: z.string().min(2),
      city: z.string().min(2),
      address: z.string().optional(),
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
    })
    .optional(),
  companyName: z.string().optional(),
  city: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = registerSchema.parse(body);

    if (data.role === "pharmacy_owner" && !data.pharmacy) {
      return jsonError("بيانات الصيدلية مطلوبة لحساب صاحب صيدلية", 422);
    }

    if (data.role === "supplier" && !data.companyName) {
      return jsonError("اسم الشركة مطلوب لحساب المورد", 422);
    }

    const existing = await db.execute(
      sql`select id, email from users where email = ${data.email} or phone = ${data.phone} limit 1`,
    );
    if (existing.rows.length > 0) {
      const row = existing.rows[0] as Record<string, unknown>;
      if (row.email === data.email) {
        return jsonError("البريد الإلكتروني مستخدم بالفعل", 409);
      }
      return jsonError("رقم الهاتف مسجل مسبقاً", 409);
    }

    const passwordHash = await hashPassword(data.password);

    const [user] = await db
      .insert(users)
      .values({
        fullName: data.role === "supplier" && data.companyName ? data.companyName : data.fullName,
        email: data.email,
        phone: data.phone,
        passwordHash,
        role: data.role,
        city: data.city || null,
      })
      .returning();

    let pharmacyId: string | null = null;
    let apiKey: string | null = null;

    if (data.role === "pharmacy_owner" && data.pharmacy) {
      apiKey = generateApiKey();
      const [pharmacy] = await db
        .insert(pharmacies)
        .values({
          ownerId: user.id,
          name: data.pharmacy.name,
          licenseNumber: data.pharmacy.licenseNumber,
          city: data.pharmacy.city,
          address: data.pharmacy.address ?? "",
          phone: data.phone,
          latitude: data.pharmacy.latitude,
          longitude: data.pharmacy.longitude,
          geom: sql`ST_SetSRID(ST_MakePoint(${data.pharmacy.longitude}, ${data.pharmacy.latitude}), 4326)::geography`,
          apiKey,
        })
        .returning();
      pharmacyId = pharmacy.id;
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
      pharmacyId,
      apiKey,
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
    return handleUnknownError(error);
  }
}
