/**
 * lib/admin-audit.ts — Admin audit log helper.
 * All writes use the service-role client (bypasses RLS).
 */

import { createAdminClient } from "@/lib/supabase/admin";

export type AdminAuditAction =
  | "admin_view_user"
  | "admin_view_generation"
  | "admin_view_users_list"
  | "admin_view_generations_list"
  | "admin_view_billing"
  | "admin_view_feedback"
  | "admin_view_dashboard";

export async function insertAuditLog(opts: {
  adminUserId: string;
  adminEmail: string;
  action: AdminAuditAction;
  targetUserId?: string;
  targetRecordId?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from("admin_audit_logs").insert({
      admin_user_id: opts.adminUserId,
      admin_email: opts.adminEmail,
      action: opts.action,
      target_user_id: opts.targetUserId ?? null,
      target_record_id: opts.targetRecordId ?? null,
      metadata: opts.metadata ?? null,
    });
  } catch {
    // Non-critical — never crash admin pages
  }
}
