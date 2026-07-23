import { NextRequest } from "next/server";
import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { drugs, purchaseOrderItems, purchaseOrders, pharmacies } from "@/db/schema";
import { requireSupplier } from "@/lib/supplier-auth";
import { jsonOk, jsonError, handleUnknownError } from "@/lib/api-utils";
import { createNotification } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const ctx = await requireSupplier(request);
  if (!ctx) return jsonError("غير مصرح لك", 401);

  const orders = await db
    .select({
      id: purchaseOrders.id,
      status: purchaseOrders.status,
      totalAmount: purchaseOrders.totalAmount,
      notes: purchaseOrders.notes,
      confirmedAt: purchaseOrders.confirmedAt,
      shippedAt: purchaseOrders.shippedAt,
      deliveredAt: purchaseOrders.deliveredAt,
      createdAt: purchaseOrders.createdAt,
      pharmacyName: pharmacies.name,
      pharmacyCity: pharmacies.city,
    })
    .from(purchaseOrders)
    .innerJoin(pharmacies, eq(pharmacies.id, purchaseOrders.pharmacyId))
    .where(eq(purchaseOrders.supplierId, ctx.user.sub))
    .orderBy(desc(purchaseOrders.createdAt));

  const ordersWithItems = await Promise.all(
    orders.map(async (order) => {
      const items = await db
        .select({
          drugName: drugs.name,
          quantity: purchaseOrderItems.quantity,
          unitPrice: purchaseOrderItems.unitPrice,
        })
        .from(purchaseOrderItems)
        .innerJoin(drugs, eq(drugs.id, purchaseOrderItems.drugId))
        .where(eq(purchaseOrderItems.orderId, order.id));
      return { ...order, items };
    })
  );

  return jsonOk({ orders: ordersWithItems });
}

const updateStatusSchema = z.object({
  orderId: z.string().uuid(),
  status: z.enum(["confirmed", "shipped", "cancelled"]),
  notes: z.string().optional(),
});

export async function PATCH(request: NextRequest) {
  try {
    const ctx = await requireSupplier(request);
    if (!ctx) return jsonError("غير مصرح لك", 401);

    const body = await request.json();
    const data = updateStatusSchema.parse(body);

    const [existing] = await db
      .select()
      .from(purchaseOrders)
      .where(eq(purchaseOrders.id, data.orderId))
      .limit(1);

    if (!existing) return jsonError("الطلب غير موجود", 404);
    if (existing.supplierId !== ctx.user.sub) return jsonError("غير مصرح لك", 403);

    const updates: Record<string, unknown> = {
      status: data.status,
    };

    if (data.status === "confirmed") updates.confirmedAt = new Date();
    if (data.status === "shipped") updates.shippedAt = new Date();
    if (data.status === "cancelled") updates.cancelledAt = new Date();
    if (data.notes) updates.notes = data.notes;

    const [row] = await db
      .update(purchaseOrders)
      .set(updates)
      .where(eq(purchaseOrders.id, data.orderId))
      .returning();

    const [pharmacy] = await db
      .select({ ownerId: pharmacies.ownerId, name: pharmacies.name })
      .from(pharmacies)
      .where(eq(pharmacies.id, existing.pharmacyId))
      .limit(1);

    if (pharmacy?.ownerId) {
      const titles: Record<string, string> = {
        confirmed: "تم تأكيد الطلب",
        shipped: "تم شحن الطلب",
        cancelled: "تم إلغاء الطلب",
      };
      const msgs: Record<string, string> = {
        confirmed: `المورد ${ctx.user.fullName} أكد طلبك`,
        shipped: `المورد ${ctx.user.fullName} شحن طلبك`,
        cancelled: `المورد ${ctx.user.fullName} ألغى الطلب`,
      };
      await createNotification({
        userId: pharmacy.ownerId,
        type: `order_${data.status}`,
        title: titles[data.status] || "تحديث الطلب",
        message: msgs[data.status] || `تم تحديث الطلب إلى ${data.status}`,
        referenceId: data.orderId,
        referenceType: "purchase_order",
      });
    }

    return jsonOk({ order: row });
  } catch (error) {
    return handleUnknownError(error);
  }
}
