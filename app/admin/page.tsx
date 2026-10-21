import Link from "next/link";
import { requireAdminUser } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { insertAuditLog } from "@/lib/admin-audit";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const admin = await requireAdminUser();
  const db = createAdminClient();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { count: totalUsers },
    { count: activeUsers7d },
    { count: generationsTotal7d },
    { count: generationsFailed },
    { count: savedPrompts7d },
    { count: paidUsers },
  ] = await Promise.all([
    db.from("profiles").select("*", { count: "exact", head: true }),
    db.from("usage_events").select("user_id", { count: "exact", head: true }).gte("created_at", sevenDaysAgo),
    db.from("generation_runs").select("*", { count: "exact", head: true }).gte("created_at", sevenDaysAgo),
    db.from("generation_runs").select("*", { count: "exact", head: true }).eq("status", "failed"),
    db.from("prompts").select("*", { count: "exact", head: true }).gte("created_at", sevenDaysAgo),
    db.from("billing_subscriptions").select("*", { count: "exact", head: true }).in("status", ["active", "trialing"]),
  ]);

  void insertAuditLog({ adminUserId: admin.id, adminEmail: admin.email, action: "admin_view_dashboard" });

  return (
    <>
      <header className="app-head">
        <div className="stack">
          <p className="small muted">Admin / Overview</p>
          <h1 className="app-head__title">Platform.</h1>
          <p className="app-head__sub">A plain reading of the numbers. No charts for their own sake.</p>
        </div>
      </header>

      <section className="admin-stats">
        <div><div className="admin-stat__value">{totalUsers ?? 0}</div><div className="admin-stat__label">total users</div></div>
        <div><div className="admin-stat__value">{activeUsers7d ?? 0}</div><div className="admin-stat__label">active, 7 days</div></div>
        <div><div className="admin-stat__value">{generationsTotal7d ?? 0}</div><div className="admin-stat__label">generations, 7 days</div></div>
        <div><div className="admin-stat__value">{savedPrompts7d ?? 0}</div><div className="admin-stat__label">saved prompts, 7 days</div></div>
        <div><div className="admin-stat__value">{paidUsers ?? 0}</div><div className="admin-stat__label">paid users</div></div>
        <div><div className="admin-stat__value">{generationsFailed ?? 0}</div><div className="admin-stat__label">failed generations</div></div>
      </section>

      <div className="composer__actions" style={{ marginTop: 40 }}>
        <Link href="/admin/users" className="link-arrow">All users</Link>
        <Link href="/admin/generations" className="link-arrow">Generation runs</Link>
        <Link href="/admin/billing" className="link-arrow">Billing</Link>
        <Link href="/admin/feedback" className="link-arrow">Feedback</Link>
      </div>
    </>
  );
}
