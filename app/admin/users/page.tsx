import Link from "next/link";
import { requireAdminUser } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { insertAuditLog } from "@/lib/admin-audit";
import { planDisplayName } from "@/lib/billing";
import type { PlanType } from "@/lib/billing";
import { computeSegment, SEGMENT_LABELS } from "@/lib/user-segments";
import type { UserSegment } from "@/lib/user-segments";
import { ChevronRight, Download } from "lucide-react";

export const dynamic = "force-dynamic";

const FREE_WEEKLY_LIMIT = 7;

const SEGMENT_COLORS: Record<UserSegment, string> = {
  paid: "bg-sage-500/10 text-sage-700 border-sage-200/60",
  high_intent: "bg-clay-500/10 text-clay-700 border-clay-200/60",
  limit_reached: "bg-destructive/10 text-destructive border-destructive/20",
  checkout_started: "bg-amber-50 text-amber-700 border-amber-200/60",
  active_free: "bg-blue-50 text-blue-700 border-blue-200/60",
  tried_once: "bg-ink-100/60 text-ink-600 border-ink-200/40",
  new_signup: "bg-ink-100/40 text-ink-400 border-ink-200/30",
};

function Badge({ children, variant = "default" }: { children: React.ReactNode; variant?: "default" | "paid" | "free" }) {
  const cls =
    variant === "paid"
      ? "bg-sage-500/10 text-sage-700 border-sage-200/60"
      : variant === "free"
      ? "bg-ink-100/60 text-ink-500 border-ink-200/40"
      : "bg-clay-500/10 text-clay-700 border-clay-200/60";
  return (
    <span className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${cls}`}>
      {children}
    </span>
  );
}

const SEGMENT_FILTERS: Array<{ value: string; label: string }> = [
  { value: "", label: "All" },
  { value: "new_signup", label: "New signup" },
  { value: "tried_once", label: "Tried once" },
  { value: "active_free", label: "Active free" },
  { value: "high_intent", label: "High intent" },
  { value: "limit_reached", label: "Limit reached" },
  { value: "checkout_started", label: "Checkout started" },
  { value: "paid", label: "Paid" },
];

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; plan?: string; segment?: string }>;
}) {
  const admin = await requireAdminUser();
  const db = createAdminClient();
  const { q = "", plan: planFilter = "", segment: segmentFilter = "" } = await searchParams;

  void insertAuditLog({
    adminUserId: admin.id,
    adminEmail: admin.email,
    action: "admin_view_users_list",
    metadata: { q, plan: planFilter, segment: segmentFilter },
  });

  // Fetch up to 200 users from auth.users
  const { data: authData } = await db.auth.admin.listUsers({ perPage: 200, page: 1 });
  const authUsers = authData?.users ?? [];
  const userIds = authUsers.map((u) => u.id);

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // Fetch billing, usage, prompt counts in parallel
  const [
    { data: subs },
    { data: promptCounts },
    { data: packCounts },
    { data: usageThisWeek },
    { data: usageTotal },
    { data: feedbackCounts },
    { data: pendingCheckouts },
  ] = await Promise.all([
    db
      .from("billing_subscriptions")
      .select("user_id, plan, status, is_founder")
      .in("user_id", userIds)
      .in("status", ["active", "trialing"]),
    db
      .from("prompts")
      .select("user_id")
      .in("user_id", userIds),
    db
      .from("prompt_packs")
      .select("user_id")
      .in("user_id", userIds),
    db
      .from("usage_events")
      .select("user_id")
      .in("user_id", userIds)
      .gte("created_at", sevenDaysAgo),
    db
      .from("usage_events")
      .select("user_id")
      .in("user_id", userIds),
    db
      .from("feedback")
      .select("user_id")
      .in("user_id", userIds),
    db
      .from("promo_redemptions")
      .select("user_id")
      .in("user_id", userIds)
      .eq("status", "pending"),
  ]);

  const subMap = new Map(subs?.map((s) => [s.user_id, s]) ?? []);

  function toCount(rows: Array<{ user_id: string }> | null) {
    return (rows ?? []).reduce<Record<string, number>>((acc, r) => {
      acc[r.user_id] = (acc[r.user_id] ?? 0) + 1;
      return acc;
    }, {});
  }

  const promptMap = toCount(promptCounts);
  const packMap = toCount(packCounts);
  const usageWeekMap = toCount(usageThisWeek);
  const usageTotalMap = toCount(usageTotal);
  const feedbackMap = toCount(feedbackCounts);
  const checkoutStartedSet = new Set((pendingCheckouts ?? []).map((r) => r.user_id));

  // Build enriched user list
  let users = authUsers.map((u) => {
    const sub = subMap.get(u.id);
    const plan: PlanType = (sub?.plan as PlanType) ?? "free";
    const isFounder = sub?.is_founder ?? false;
    const isPaid = !!sub;
    const usedThisWeek = usageWeekMap[u.id] ?? 0;
    const totalUsageEvents = usageTotalMap[u.id] ?? 0;
    const savedPromptCount = promptMap[u.id] ?? 0;
    const packs = packMap[u.id] ?? 0;
    const checkoutStarted = checkoutStartedSet.has(u.id);
    const remaining = isPaid ? null : Math.max(0, FREE_WEEKLY_LIMIT - usedThisWeek);

    const segment = computeSegment({
      isPaid,
      checkoutStarted,
      usedThisWeek,
      totalUsageEvents,
      savedPromptCount,
      packCount: packs,
    });

    return {
      id: u.id,
      email: u.email ?? "(no email)",
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at ?? null,
      provider: (u.app_metadata?.provider as string) ?? "email",
      plan,
      planLabel: planDisplayName(plan, isFounder),
      isPaid,
      segment,
      usedThisWeek,
      remainingThisWeek: remaining,
      promptCount: savedPromptCount,
      packCount: packs,
      feedbackCount: feedbackMap[u.id] ?? 0,
      checkoutStarted,
      totalUsageEvents,
    };
  });

  // Apply filters
  if (q) {
    const lq = q.toLowerCase();
    users = users.filter((u) => u.email.toLowerCase().includes(lq));
  }
  if (planFilter === "paid") {
    users = users.filter((u) => u.isPaid);
  } else if (planFilter === "free") {
    users = users.filter((u) => !u.isPaid);
  }
  if (segmentFilter) {
    users = users.filter((u) => u.segment === segmentFilter);
  }

  // Export URL with current filters
  const exportParams = new URLSearchParams({ q, plan: planFilter, segment: segmentFilter }).toString();

  return (
    <main className="px-6 py-8 max-w-7xl">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-ink-900">Users</h1>
          <p className="text-sm text-ink-400 mt-1">{users.length} users shown</p>
        </div>
        <a
          href={`/api/admin/users/export?${exportParams}`}
          className="flex items-center gap-1.5 text-sm text-clay-600 hover:text-clay-700 font-medium transition-colors"
        >
          <Download className="size-3.5" />
          Export CSV
        </a>
      </div>

      {/* Filters */}
      <form method="GET" className="flex flex-wrap gap-3 mb-6">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Search by email..."
          className="rounded-lg border border-ink-200/60 bg-white px-3 py-1.5 text-sm text-ink-800 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-clay-400/40 w-56"
        />
        <select
          name="plan"
          defaultValue={planFilter}
          className="rounded-lg border border-ink-200/60 bg-white px-3 py-1.5 text-sm text-ink-700 focus:outline-none focus:ring-2 focus:ring-clay-400/40"
        >
          <option value="">All plans</option>
          <option value="paid">Paid</option>
          <option value="free">Free</option>
        </select>
        <select
          name="segment"
          defaultValue={segmentFilter}
          className="rounded-lg border border-ink-200/60 bg-white px-3 py-1.5 text-sm text-ink-700 focus:outline-none focus:ring-2 focus:ring-clay-400/40"
        >
          {SEGMENT_FILTERS.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-lg bg-clay-500 text-white px-4 py-1.5 text-sm font-medium hover:bg-clay-600 transition-colors"
        >
          Filter
        </button>
      </form>

      {/* Table */}
      <div className="rounded-xl border border-ink-100/70 overflow-x-auto">
        <table className="w-full text-sm whitespace-nowrap">
          <thead>
            <tr className="border-b border-ink-100/70 bg-cream-50">
              {["Email", "Joined", "Last sign-in", "Segment", "Plan", "Used/wk", "Left", "Prompts", "Packs", "Checkout", ""].map(
                (h) => (
                  <th key={h} className="px-3 py-2.5 text-left text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-400">
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {users.map((u, i) => (
              <tr
                key={u.id}
                className={`border-b border-ink-100/50 hover:bg-cream-50/60 transition-colors ${i % 2 === 0 ? "" : "bg-cream-50/30"}`}
              >
                <td className="px-3 py-2.5 font-mono text-xs text-ink-700 max-w-[200px] truncate">
                  {u.email}
                </td>
                <td className="px-3 py-2.5 text-ink-500 text-xs">
                  {new Date(u.created_at).toLocaleDateString()}
                </td>
                <td className="px-3 py-2.5 text-ink-400 text-xs">
                  {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString() : "—"}
                </td>
                <td className="px-3 py-2.5">
                  <span className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${SEGMENT_COLORS[u.segment]}`}>
                    {SEGMENT_LABELS[u.segment]}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <Badge variant={u.isPaid ? "paid" : "free"}>{u.planLabel}</Badge>
                </td>
                <td className="px-3 py-2.5 text-ink-600 text-xs tabular-nums">{u.usedThisWeek}</td>
                <td className="px-3 py-2.5 text-ink-400 text-xs tabular-nums">
                  {u.isPaid ? "∞" : u.remainingThisWeek}
                </td>
                <td className="px-3 py-2.5 text-ink-600 text-xs tabular-nums">{u.promptCount}</td>
                <td className="px-3 py-2.5 text-ink-600 text-xs tabular-nums">{u.packCount}</td>
                <td className="px-3 py-2.5 text-xs">
                  {u.checkoutStarted ? (
                    <span className="text-amber-600 font-medium">Yes</span>
                  ) : (
                    <span className="text-ink-300">—</span>
                  )}
                </td>
                <td className="px-3 py-2.5">
                  <Link
                    href={`/admin/users/${u.id}`}
                    className="flex items-center gap-1 text-clay-600 hover:text-clay-700 text-xs font-medium"
                  >
                    View <ChevronRight className="size-3" />
                  </Link>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={11} className="px-4 py-8 text-center text-sm text-ink-400">
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
