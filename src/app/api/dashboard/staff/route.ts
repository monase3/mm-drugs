import { NextRequest } from "next/server";
import { sql, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requirePharmacyAccess, requirePharmacyOwner } from "@/lib/dashboard-auth";
import { hashPassword } from "@/lib/auth";
import { jsonOk, jsonError, handleUnknownError } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const ctx = await requirePharmacyOwner(request);
  if (!ctx) return jsonError("غير مصرح", 401);

  try {
    const result = await db.execute(sql`
      SELECT id, full_name, email, phone, created_at
      FROM users
      WHERE role = 'pharmacy_staff' AND pharmacy_id = ${ctx.pharmacy.id}
      ORDER BY created_at DESC
    `);
    return jsonOk({ staff: result.rows });
  } catch (error) {
    return handleUnknownError(error);
  }
}

const createSchema = z.object({
  fullName: z.string().min(1, "الاسم مطلوب"),
  email: z.string().email("بريد غير صالح"),
  phone: z.string().optional().default(""),
  password: z.string().min(6, "كلمة المرور 6 أحرف على الأقل"),
});

export async function POST(request: NextRequest) {
  const ctx = await requirePharmacyOwner(request);
  if (!ctx) return jsonError("غير مصرح", 401);

  try {
    const body = await request.json();
    const data = createSchema.parse(body);

    const [existing] = await db.select().from(users).where(eq(users.email, data.email)).limit(1);
    if (existing) return jsonError("البريد الإلكتروني مستخدم مسبقاً", 409);

    const passwordHash = await hashPassword(data.password);

    const [user] = await db
      .insert(users)
      .values({
        fullName: data.fullName,
        email: data.email,
        phone: data.phone || null,
        passwordHash,
        role: "pharmacy_staff",
        pharmacyId: ctx.pharmacy.id,
      })
      .returning({ id: users.id, fullName: users.fullName, email: users.email, role: users.role });

    return jsonOk({ user }, 201);
  } catch (error) {
    return handleUnknownError(error);
  }
}

export async function DELETE(request: NextRequest) {
  const ctx = await requirePharmacyOwner(request);
  if (!ctx) return jsonError("غير مصرح", 401);

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return jsonError("معرف الموظف مطلوب", 422);

    await db.execute(sql`
      DELETE FROM users WHERE id = ${id} AND pharmacy_id = ${ctx.pharmacy.id} AND role = 'pharmacy_staff'
    `);

    return jsonOk({ deleted: true });
  } catch (error) {
    return handleUnknownError(error);
  }
}
