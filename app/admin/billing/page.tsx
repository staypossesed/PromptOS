import { requireAdminUser } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { insertAuditLog } from "@/lib/admin-audit";
import { planDisplayName } from "@/lib/billing";
import type { PlanType } from "@/lib/billing";

export const dynamic = "force-dynamic";

export default async function AdminBillingPage() {
  const admin = await requireAdminUser();
  const db = createAdminClient();

  void insertAuditLog({
    adminUserId: admin.id,
    adminEmail: admin.email,
    action: "admin_view_billing",
  });

  const [
    { data: subs },
    { count: freeCount },
    { count: totalCount },
  ] = await Promise.all([
    db
      .from("billing_subscriptions")
      .select("id, user_id, plan, status, is_founder, is_lifetime, current_period_end, created_at, stripe_subscription_id, stripe_customer_id")
      .order("created_at", { ascending: false })
      .limit(200),
    db.from("profiles").select("*", { count: "exact", head: true }),
    db.from("billing_subscriptions").select("*", { count: "exact", head: true }).in("status", ["active", "trialing"]),
  ]);

  // Fetch emails for subscribed users
  const userIds = [...new Set((subs ?? []).map((s) => s.user_id).filter(Boolean) as string[])];
  const emailMap: Record<string, string> = {};
  if (userIds.length > 0) {
    const { data: profiles } = await db.from("profiles").select("id, email").in("id", userIds);
    for (const p of profiles ?? []) emailMap[p.id] = p.email;
  }

  const activeSubs = (subs ?? []).filter((s) => ["active", "trialing"].includes(s.status));
  const founderSubs = activeSubs.filter((s) => s.is_founder);
  const lifetimeSubs = activeSubs.filter((s) => s.is_lifetime);

  return (
    <main className="px-6 py-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-semibold text-ink-900">Billing</h1>
        <p className="text-sm text-ink-400 mt-1">Subscriptions and plan overview</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total users", value: freeCount ?? 0 },
          { label: "Paid / active", value: totalCount ?? 0 },
          { label: "Founders", value: founderSubs.length },
          { label: "Lifetime", value: lifetimeSubs.length },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl border border-ink-100/70 bg-cream-50 p-4">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-400 mb-2">
              {label}
            </div>
            <div className="font-serif text-3xl font-medium text-ink-900 tabular-nums">{value}</div>
          </div>
        ))}
      </div>

      {/* Subscriptions table */}
      <div className="rounded-xl border border-ink-100/70 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink-100/70 bg-cream-50">
              {["User", "Plan", "Status", "Founder", "Lifetime", "Period end", "Stripe sub", "Created"].map(
                (h) => (
                  <th key={h} className="px-3 py-2.5 text-left text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-400 whitespace-nowrap">
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {(subs ?? []).map((s, i) => (
              <tr
                key={s.id}
                className={`border-b border-ink-100/40 text-xs ${i % 2 === 0 ? "" : "bg-cream-50/30"}`}
              >
                <td className="px-3 py-2.5 font-mono text-ink-600 max-w-[200px] truncate">
                  {emailMap[s.user_id] ?? s.user_id?.slice(0, 8) + "…"}
                </td>
                <td className="px-3 py-2.5 text-ink-700">
                  {planDisplayName((s.plan as PlanType) ?? "free", s.is_founder ?? false)}
                </td>
                <td className="px-3 py-2.5">
                  <span
                    className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${
                      ["active", "trialing"].includes(s.status)
                        ? "bg-sage-500/10 text-sage-700"
                        : "bg-ink-100/60 text-ink-500"
                    }`}
                  >
                    {s.status}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-ink-400">{s.is_founder ? "Yes" : "—"}</td>
                <td className="px-3 py-2.5 text-ink-400">{s.is_lifetime ? "Yes" : "—"}</td>
                <td className="px-3 py-2.5 text-ink-400 whitespace-nowrap">
                  {s.current_period_end
                    ? new Date(s.current_period_end).toLocaleDateString()
                    : "—"}
                </td>
                <td className="px-3 py-2.5 font-mono text-ink-300 text-[10px] max-w-[140px] truncate">
                  {s.stripe_subscription_id ?? "—"}
                </td>
                <td className="px-3 py-2.5 text-ink-400 whitespace-nowrap">
                  {new Date(s.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
            {(subs ?? []).length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-sm text-ink-400">
                  No subscriptions found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
