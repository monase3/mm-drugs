import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { drugs } from "@/db/schema";
import { requireAdminApi } from "@/lib/dashboard-auth";
import { jsonOk, jsonError, handleUnknownError } from "@/lib/api-utils";
import { logAdminAction } from "@/lib/audit";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  genericName: z.string().optional(),
  manufacturer: z.string().optional(),
  category: z.string().optional(),
  unit: z.string().optional(),
  barcode: z.string().optional(),
});

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAdminApi(request);
  if (!ctx) return jsonError("غير مصرح", 401);

  try {
    const { id } = await params;
    const body = await request.json();
    const data = updateSchema.parse(body);

    const [existing] = await db.select().from(drugs).where(eq(drugs.id, id)).limit(1);
    if (!existing) return jsonError("الدواء غير موجود", 404);

    const updates: Partial<typeof drugs.$inferInsert> = {};
    if (data.name !== undefined) updates.name = data.name;
    if (data.genericName !== undefined) updates.genericName = data.genericName || null;
    if (data.manufacturer !== undefined) updates.manufacturer = data.manufacturer || null;
    if (data.category !== undefined) updates.category = data.category || null;
    if (data.unit !== undefined) updates.unit = data.unit;
    if (data.barcode !== undefined) updates.barcode = data.barcode || null;

    if (Object.keys(updates).length === 0) return jsonError("لا توجد بيانات للتحديث", 422);

    const [drug] = await db.update(drugs).set(updates).where(eq(drugs.id, id)).returning();

    await logAdminAction(ctx.user.sub, "drug.update", "drug", drug.id, {
      before: { name: existing.name },
      after: { name: drug.name },
    });

    return jsonOk({ drug });
  } catch (error) {
    return handleUnknownError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAdminApi(request);
  if (!ctx) return jsonError("غير مصرح", 401);

  try {
    const { id } = await params;

    const [existing] = await db.select().from(drugs).where(eq(drugs.id, id)).limit(1);
    if (!existing) return jsonError("الدواء غير موجود", 404);

    await db.delete(drugs).where(eq(drugs.id, id));

    await logAdminAction(ctx.user.sub, "drug.delete", "drug", id, {
      name: existing.name,
    });

    return jsonOk({ deleted: true });
  } catch (error) {
    return handleUnknownError(error);
  }
}
