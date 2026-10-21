import Link from "next/link";
import { requireAdminUser } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { insertAuditLog } from "@/lib/admin-audit";
import { planDisplayName } from "@/lib/billing";
import type { PlanType } from "@/lib/billing";
import { computeSegment, SEGMENT_LABELS } from "@/lib/user-segments";
import type { UserSegment } from "@/lib/user-segments";

export const dynamic = "force-dynamic";

const FREE_WEEKLY_LIMIT = 7;

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

  const { data: authData } = await db.auth.admin.listUsers({ perPage: 200, page: 1 });
  const authUsers = authData?.users ?? [];
  const userIds = authUsers.map((user) => user.id);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { data: subs },
    { data: promptCounts },
    { data: packCounts },
    { data: usageThisWeek },
    { data: usageTotal },
    { data: feedbackCounts },
    { data: pendingCheckouts },
  ] = await Promise.all([
    db.from("billing_subscriptions").select("user_id, plan, status, is_founder").in("user_id", userIds).in("status", ["active", "trialing"]),
    db.from("prompts").select("user_id").in("user_id", userIds),
    db.from("prompt_packs").select("user_id").in("user_id", userIds),
    db.from("usage_events").select("user_id").in("user_id", userIds).gte("created_at", sevenDaysAgo),
    db.from("usage_events").select("user_id").in("user_id", userIds),
    db.from("feedback").select("user_id").in("user_id", userIds),
    db.from("promo_redemptions").select("user_id").in("user_id", userIds).eq("status", "pending"),
  ]);

  const subMap = new Map((subs ?? []).map((sub) => [sub.user_id, sub]));
  function toCount(rows: Array<{ user_id: string }> | null) {
    return (rows ?? []).reduce<Record<string, number>>((counts, row) => {
      counts[row.user_id] = (counts[row.user_id] ?? 0) + 1;
      return counts;
    }, {});
  }
  const promptMap = toCount(promptCounts);
  const packMap = toCount(packCounts);
  const usageWeekMap = toCount(usageThisWeek);
  const usageTotalMap = toCount(usageTotal);
  const feedbackMap = toCount(feedbackCounts);
  const checkoutStartedSet = new Set((pendingCheckouts ?? []).map((row) => row.user_id));

  let users = authUsers.map((user) => {
    const sub = subMap.get(user.id);
    const plan: PlanType = (sub?.plan as PlanType) ?? "free";
    const isFounder = sub?.is_founder ?? false;
    const isPaid = Boolean(sub);
    const usedThisWeek = usageWeekMap[user.id] ?? 0;
    const totalUsageEvents = usageTotalMap[user.id] ?? 0;
    const savedPromptCount = promptMap[user.id] ?? 0;
    const packs = packMap[user.id] ?? 0;
    const checkoutStarted = checkoutStartedSet.has(user.id);
    const segment = computeSegment({
      isPaid,
      checkoutStarted,
      usedThisWeek,
      totalUsageEvents,
      savedPromptCount,
      packCount: packs,
    });
    return {
      id: user.id,
      email: user.email ?? "(no email)",
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at ?? null,
      plan,
      planLabel: planDisplayName(plan, isFounder),
      isPaid,
      segment,
      usedThisWeek,
      remainingThisWeek: isPaid ? null : Math.max(0, FREE_WEEKLY_LIMIT - usedThisWeek),
      promptCount: savedPromptCount,
      packCount: packs,
      feedbackCount: feedbackMap[user.id] ?? 0,
    };
  });

  if (q) {
    const lq = q.toLowerCase();
    users = users.filter((user) => user.email.toLowerCase().includes(lq));
  }
  if (planFilter === "paid") users = users.filter((user) => user.isPaid);
  else if (planFilter === "free") users = users.filter((user) => !user.isPaid);
  if (segmentFilter) users = users.filter((user) => user.segment === segmentFilter);

  const exportParams = new URLSearchParams({ q, plan: planFilter, segment: segmentFilter }).toString();

  return (
    <>
      <header className="app-head">
        <div className="stack">
          <p className="small muted">Admin / Users</p>
          <h1 className="app-head__title">Users.</h1>
          <p className="app-head__sub">{users.length} users shown. Latest 200 auth users.</p>
        </div>
        <a href={`/api/admin/users/export?${exportParams}`} className="link-arrow">Export CSV</a>
      </header>

      <form method="get" className="composer__actions" style={{ marginBottom: 24 }}>
        <label className="sr-only" htmlFor="user-q">Search email</label>
        <input id="user-q" name="q" defaultValue={q} className="field__input" style={{ maxWidth: 300 }} placeholder="Search email" />
        <select name="plan" defaultValue={planFilter} className="field__select" style={{ maxWidth: 180 }}>
          <option value="">All plans</option>
          <option value="paid">Paid</option>
          <option value="free">Free</option>
        </select>
        <select name="segment" defaultValue={segmentFilter} className="field__select" style={{ maxWidth: 220 }}>
          <option value="">All segments</option>
          {Object.entries(SEGMENT_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <button type="submit" className="button button--small">Filter</button>
      </form>

      <table className="admin-table">
        <thead>
          <tr><th>Email</th><th>Plan</th><th>Segment</th><th>Used / week</th><th>Prompts</th><th>Packs</th><th>Last sign-in</th></tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td><Link href={`/admin/users/${user.id}`}>{user.email}</Link></td>
              <td>{user.planLabel}</td>
              <td>{SEGMENT_LABELS[user.segment as UserSegment] ?? user.segment}</td>
              <td className="ledger__num">{user.usedThisWeek}{!user.isPaid ? ` / ${FREE_WEEKLY_LIMIT}` : ""}</td>
              <td className="ledger__num">{user.promptCount}</td>
              <td className="ledger__num">{user.packCount}</td>
              <td>{user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : "–"}</td>
            </tr>
          ))}
          {!users.length ? <tr><td colSpan={7}>No users match.</td></tr> : null}
        </tbody>
      </table>
    </>
  );
}
