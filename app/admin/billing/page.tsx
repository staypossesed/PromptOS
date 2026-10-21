import { requireAdminUser } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { insertAuditLog } from "@/lib/admin-audit";
import { planDisplayName } from "@/lib/billing";
import type { PlanType } from "@/lib/billing";

export const dynamic = "force-dynamic";

export default async function AdminBillingPage() {
  const admin = await requireAdminUser();
  const db = createAdminClient();

  void insertAuditLog({ adminUserId: admin.id, adminEmail: admin.email, action: "admin_view_billing" });

  const [
    { data: subs },
    { count: totalUsers },
    { count: activeCount },
  ] = await Promise.all([
    db.from("billing_subscriptions").select("id, user_id, plan, status, is_founder, is_lifetime, current_period_end, created_at, stripe_subscription_id, stripe_customer_id").order("created_at", { ascending: false }).limit(200),
    db.from("profiles").select("*", { count: "exact", head: true }),
    db.from("billing_subscriptions").select("*", { count: "exact", head: true }).in("status", ["active", "trialing"]),
  ]);

  const userIds = [...new Set((subs ?? []).map((sub) => sub.user_id).filter(Boolean) as string[])];
  const emailMap: Record<string, string> = {};
  if (userIds.length) {
    const { data: profiles } = await db.from("profiles").select("id, email").in("id", userIds);
    for (const profile of profiles ?? []) emailMap[profile.id] = profile.email;
  }

  const activeSubs = (subs ?? []).filter((sub) => ["active", "trialing"].includes(sub.status));
  const founderSubs = activeSubs.filter((sub) => sub.is_founder);
  const lifetimeSubs = activeSubs.filter((sub) => sub.is_lifetime);

  return (
    <>
      <header className="app-head">
        <div className="stack">
          <p className="small muted">Admin / Billing</p>
          <h1 className="app-head__title">Billing.</h1>
          <p className="app-head__sub">Subscriptions and plan overview.</p>
        </div>
      </header>

      <section className="admin-stats">
        <div><div className="admin-stat__value">{totalUsers ?? 0}</div><div className="admin-stat__label">total users</div></div>
        <div><div className="admin-stat__value">{activeCount ?? 0}</div><div className="admin-stat__label">paid / active</div></div>
        <div><div className="admin-stat__value">{founderSubs.length}</div><div className="admin-stat__label">founders</div></div>
        <div><div className="admin-stat__value">{lifetimeSubs.length}</div><div className="admin-stat__label">lifetime</div></div>
      </section>

      <table className="admin-table" style={{ marginTop: 32 }}>
        <thead><tr><th>User</th><th>Plan</th><th>Status</th><th>Founder</th><th>Lifetime</th><th>Period end</th><th>Stripe sub</th><th>Created</th></tr></thead>
        <tbody>
          {(subs ?? []).map((sub) => (
            <tr key={sub.id}>
              <td>{emailMap[sub.user_id] ?? sub.user_id?.slice(0, 8) + "…"}</td>
              <td>{planDisplayName((sub.plan as PlanType) ?? "free", sub.is_founder ?? false)}</td>
              <td>{sub.status}</td>
              <td>{sub.is_founder ? "Yes" : "–"}</td>
              <td>{sub.is_lifetime ? "Yes" : "–"}</td>
              <td>{sub.current_period_end ? new Date(sub.current_period_end).toLocaleDateString() : "–"}</td>
              <td><code>{sub.stripe_subscription_id ?? "–"}</code></td>
              <td>{new Date(sub.created_at).toLocaleDateString()}</td>
            </tr>
          ))}
          {!subs?.length ? <tr><td colSpan={8}>No subscriptions found.</td></tr> : null}
        </tbody>
      </table>
    </>
  );
}
