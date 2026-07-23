import { NextRequest } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { drugs, purchaseOrderItems, purchaseOrders } from "@/db/schema";
import { requireSupplier } from "@/lib/supplier-auth";
import { jsonOk, jsonError, handleUnknownError } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const ctx = await requireSupplier(request);
    if (!ctx) return jsonError("غير مصرح لك", 401);

    const [order] = await db
      .select()
      .from(purchaseOrders)
      .where(eq(purchaseOrders.id, id))
      .limit(1);

    if (!order || order.supplierId !== ctx.user.sub) return jsonError("الطلب غير موجود", 404);

    const items = await db
      .select({
        drugName: drugs.name,
        quantity: purchaseOrderItems.quantity,
        unitPrice: purchaseOrderItems.unitPrice,
      })
      .from(purchaseOrderItems)
      .innerJoin(drugs, eq(drugs.id, purchaseOrderItems.drugId))
      .where(eq(purchaseOrderItems.orderId, id));

    return jsonOk({ order: { ...order, items } });
  } catch (error) {
    return handleUnknownError(error);
  }
}
