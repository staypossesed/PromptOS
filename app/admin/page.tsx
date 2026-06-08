import { requireAdminUser } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { insertAuditLog } from "@/lib/admin-audit";
import { Users, Zap, BookmarkCheck, CreditCard, XCircle, Activity } from "lucide-react";

export const dynamic = "force-dynamic";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  sub?: string;
}

function StatCard({ label, value, icon: Icon, sub }: StatCardProps) {
  return (
    <div className="rounded-xl border border-ink-100/70 bg-cream-50 p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-400">
          {label}
        </span>
        <Icon className="size-3.5 text-ink-300" />
      </div>
      <div className="font-serif text-3xl font-medium text-ink-900 tabular-nums">{value}</div>
      {sub && <div className="mt-1 text-[11px] text-ink-400">{sub}</div>}
    </div>
  );
}

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
    db
      .from("usage_events")
      .select("user_id", { count: "exact", head: true })
      .gte("created_at", sevenDaysAgo),
    db
      .from("generation_runs")
      .select("*", { count: "exact", head: true })
      .gte("created_at", sevenDaysAgo),
    db
      .from("generation_runs")
      .select("*", { count: "exact", head: true })
      .eq("status", "failed"),
    db
      .from("prompts")
      .select("*", { count: "exact", head: true })
      .gte("created_at", sevenDaysAgo),
    db
      .from("billing_subscriptions")
      .select("*", { count: "exact", head: true })
      .in("status", ["active", "trialing"]),
  ]);

  void insertAuditLog({
    adminUserId: admin.id,
    adminEmail: admin.email,
    action: "admin_view_dashboard",
  });

  return (
    <main className="px-6 py-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="font-serif text-2xl font-semibold text-ink-900">Dashboard</h1>
        <p className="text-sm text-ink-400 mt-1">Platform overview</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-10">
        <StatCard label="Total users" value={totalUsers ?? 0} icon={Users} />
        <StatCard
          label="Active users"
          value={activeUsers7d ?? 0}
          icon={Activity}
          sub="last 7 days"
        />
        <StatCard
          label="Generations"
          value={generationsTotal7d ?? 0}
          icon={Zap}
          sub="last 7 days"
        />
        <StatCard
          label="Saved prompts"
          value={savedPrompts7d ?? 0}
          icon={BookmarkCheck}
          sub="last 7 days"
        />
        <StatCard label="Paid users" value={paidUsers ?? 0} icon={CreditCard} />
        <StatCard label="Failed gens" value={generationsFailed ?? 0} icon={XCircle} />
      </div>

      <div className="rounded-xl border border-ink-100/70 bg-cream-50 p-5">
        <h2 className="text-sm font-semibold text-ink-700 mb-3">Quick links</h2>
        <div className="flex flex-wrap gap-3 text-sm">
          {[
            { href: "/admin/users", label: "All users" },
            { href: "/admin/generations", label: "Generation runs" },
            { href: "/admin/billing", label: "Billing" },
            { href: "/admin/feedback", label: "Feedback" },
          ].map(({ href, label }) => (
            <a
              key={href}
              href={href}
              className="text-clay-700 hover:underline underline-offset-2"
            >
              {label}
            </a>
          ))}
        </div>
      </div>
    </main>
  );
}
