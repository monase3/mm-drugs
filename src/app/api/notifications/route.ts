import { NextRequest } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { getCurrentUser, verifyBearerToken } from "@/lib/auth";
import { jsonOk, jsonError, handleUnknownError } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    let user = await getCurrentUser();
    if (!user) user = verifyBearerToken(request.headers.get("authorization"));
    if (!user) return jsonError("غير مصرح", 401);

    const url = new URL(request.url);
    const unreadOnly = url.searchParams.get("unread") === "true";
    const limit = Math.min(Number(url.searchParams.get("limit") || "50"), 100);

    let query = db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, user.sub))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);

    if (unreadOnly) {
      query = db
        .select()
        .from(notifications)
        .where(and(eq(notifications.userId, user.sub), eq(notifications.isRead, false)))
        .orderBy(desc(notifications.createdAt))
        .limit(limit);
    }

    const rows = await query;

    const unreadCount = await db
      .select({ count: notifications.id })
      .from(notifications)
      .where(and(eq(notifications.userId, user.sub), eq(notifications.isRead, false)));

    return jsonOk({ notifications: rows, unreadCount: unreadCount.length });
  } catch (error) {
    return handleUnknownError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    let user = await getCurrentUser();
    if (!user) user = verifyBearerToken(request.headers.get("authorization"));
    if (!user) return jsonError("غير مصرح", 401);

    const body = await request.json();

    if (body.readAll) {
      await db
        .update(notifications)
        .set({ isRead: true })
        .where(eq(notifications.userId, user.sub));
      return jsonOk({ success: true });
    }

    const { id } = body;
    if (!id) return jsonError("معرف الإشعار مطلوب", 422);

      await db
        .update(notifications)
        .set({ isRead: true })
        .where(and(eq(notifications.id, id), eq(notifications.userId, user.sub)));

    return jsonOk({ success: true });
  } catch (error) {
    return handleUnknownError(error);
  }
}
