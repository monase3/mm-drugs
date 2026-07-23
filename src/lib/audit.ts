import { sql } from "drizzle-orm";
import { db } from "@/db";
import type { AuditAction } from "@/db/schema";

export async function logAdminAction(
  adminId: string,
  action: AuditAction,
  entityType: string,
  entityId?: string,
  details?: Record<string, unknown>,
) {
  await db.execute(sql`
    INSERT INTO admin_audit_log (admin_id, action, entity_type, entity_id, details)
    VALUES (${adminId}, ${action}, ${entityType}, ${entityId ?? null}, ${details ? JSON.stringify(details) : null})
  `);
}
