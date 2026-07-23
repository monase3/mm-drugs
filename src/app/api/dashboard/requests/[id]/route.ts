import { NextRequest } from "next/server";
import { sql, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { drugs, inventory, pharmacyRequests, users } from "@/db/schema";
import { requirePharmacyAccess } from "@/lib/dashboard-auth";
import { jsonOk, jsonError, handleUnknownError } from "@/lib/api-utils";
import { createNotification } from "@/lib/notifications";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  status: z.enum(["accepted", "rejected", "fulfilled"]),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requirePharmacyAccess(request);
  if (!ctx) return jsonError("غير مصرح", 401);

  try {
    const { id } = await params;
    const body = await request.json();
    const data = patchSchema.parse(body);

    if (data.status === "fulfilled") {
      const reqResult = await db.execute(sql`
        SELECT drug_name, quantity FROM pharmacy_requests WHERE id = ${id} AND pharmacy_id = ${ctx.pharmacy.id}
      `);
      if (!reqResult.rows[0]) return jsonError("الطلب غير موجود", 404);
      const { drug_name, quantity: reqQty } = reqResult.rows[0] as { drug_name: string; quantity: number };

      const drugResult = await db.select({ id: drugs.id }).from(drugs).where(eq(drugs.name, drug_name)).limit(1);
      if (drugResult.length > 0) {
        const drugId = drugResult[0].id;
        const invResult = await db.execute(sql`
          SELECT id, quantity FROM inventory WHERE pharmacy_id = ${ctx.pharmacy.id} AND drug_id = ${drugId}::uuid LIMIT 1
        `);
        if (invResult.rows.length > 0) {
          const inv = invResult.rows[0] as { id: string; quantity: number };
          if (Number(inv.quantity) < reqQty) {
            return jsonError(`المخزون لا يكفي! المتوفر: ${inv.quantity}، المطلوب: ${reqQty}`, 422);
          }
          await db.execute(sql`
            UPDATE inventory SET quantity = quantity - ${reqQty} WHERE id = ${inv.id} AND quantity >= ${reqQty}
          `);
          await db.execute(sql`
            INSERT INTO inventory_movements (pharmacy_id, drug_id, movement_type, quantity_change, reference_type, reference_id, reason)
            VALUES (${ctx.pharmacy.id}::uuid, ${drugId}::uuid, 'sale', ${reqQty}, 'citizen_request', ${id}, 'صرف لطلب مواطن')
          `);
        }
      }
    }

    const result = await db.execute(sql`
      UPDATE pharmacy_requests
      SET status = ${data.status}, updated_at = NOW()
      WHERE id = ${id} AND pharmacy_id = ${ctx.pharmacy.id}
      RETURNING id, drug_name, status, citizen_id
    `);

    if (!result.rows[0]) return jsonError("الطلب غير موجود", 404);

    const updated = result.rows[0] as { id: string; drug_name: string; status: string; citizen_id: string };

    const titles: Record<string, string> = {
      accepted: "تم قبول طلبك",
      rejected: "تم رفض طلبك",
      fulfilled: "طلبك جاهز",
    };
    const msgs: Record<string, string> = {
      accepted: `صيدلية ${ctx.pharmacy.name} قبلت طلب ${updated.drug_name}`,
      rejected: `صيدلية ${ctx.pharmacy.name} رفضت طلب ${updated.drug_name}`,
      fulfilled: `صيدلية ${ctx.pharmacy.name} جهزت طلب ${updated.drug_name}`,
    };

    await createNotification({
      userId: updated.citizen_id,
      type: `request_${data.status}`,
      title: titles[data.status] || "تحديث الطلب",
      message: msgs[data.status] || `تم تحديث الطلب إلى ${data.status}`,
      referenceId: id,
      referenceType: "pharmacy_request",
    });

    return jsonOk({ request: result.rows[0] });
  } catch (error) {
    return handleUnknownError(error);
  }
}
