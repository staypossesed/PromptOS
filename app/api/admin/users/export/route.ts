/**
 * GET /api/admin/users/export
 *
 * Returns a CSV of all users with segment data.
 * Admin-only — checks ADMIN_EMAILS env var.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminUser } from "@/lib/admin";
import { computeSegment, SEGMENT_LABELS } from "@/lib/user-segments";
import { planDisplayName } from "@/lib/billing";
import type { PlanType } from "@/lib/billing";

const FREE_WEEKLY_LIMIT = 7;

function escapeCSV(value: string | number | null | undefined): string {
  if (value == null) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(request: NextRequest) {
  // Auth check
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdminUser(user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = request.nextUrl;
  const q = searchParams.get("q") ?? "";
  const planFilter = searchParams.get("plan") ?? "";
  const segmentFilter = searchParams.get("segment") ?? "";

  const db = createAdminClient();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: authData } = await db.auth.admin.listUsers({ perPage: 200, page: 1 });
  const authUsers = authData?.users ?? [];
  const userIds = authUsers.map((u) => u.id);

  const [
    { data: subs },
    { data: promptCounts },
    { data: packCounts },
    { data: usageThisWeek },
    { data: usageTotal },
    { data: pendingCheckouts },
  ] = await Promise.all([
    db
      .from("billing_subscriptions")
      .select("user_id, plan, status, is_founder")
      .in("user_id", userIds)
      .in("status", ["active", "trialing"]),
    db.from("prompts").select("user_id").in("user_id", userIds),
    db.from("prompt_packs").select("user_id").in("user_id", userIds),
    db
      .from("usage_events")
      .select("user_id")
      .in("user_id", userIds)
      .gte("created_at", sevenDaysAgo),
    db.from("usage_events").select("user_id").in("user_id", userIds),
    db
      .from("promo_redemptions")
      .select("user_id")
      .in("user_id", userIds)
      .eq("status", "pending"),
  ]);

  const subMap = new Map(subs?.map((s) => [s.user_id, s]) ?? []);
  const toCount = (rows: Array<{ user_id: string }> | null) =>
    (rows ?? []).reduce<Record<string, number>>((acc, r) => {
      acc[r.user_id] = (acc[r.user_id] ?? 0) + 1;
      return acc;
    }, {});

  const promptMap = toCount(promptCounts);
  const packMap = toCount(packCounts);
  const usageWeekMap = toCount(usageThisWeek);
  const usageTotalMap = toCount(usageTotal);
  const checkoutStartedSet = new Set((pendingCheckouts ?? []).map((r) => r.user_id));

  let users = authUsers.map((u) => {
    const sub = subMap.get(u.id);
    const plan: PlanType = (sub?.plan as PlanType) ?? "free";
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
      email: u.email ?? "",
      created_at: u.created_at,
      plan: planDisplayName(plan, sub?.is_founder ?? false),
      segment: SEGMENT_LABELS[segment],
      usedThisWeek,
      remainingThisWeek: isPaid ? "" : String(remaining ?? 0),
      promptCountTotal: totalUsageEvents,
      savedPromptCount,
      packCount: packs,
      isPaid,
      checkoutStarted,
    };
  });

  // Apply filters
  if (q) {
    const lq = q.toLowerCase();
    users = users.filter((u) => u.email.toLowerCase().includes(lq));
  }
  if (planFilter === "paid") users = users.filter((u) => u.isPaid);
  else if (planFilter === "free") users = users.filter((u) => !u.isPaid);
  if (segmentFilter) {
    const label = SEGMENT_LABELS[segmentFilter as keyof typeof SEGMENT_LABELS];
    if (label) users = users.filter((u) => u.segment === label);
  }

  // Build CSV
  const headers = [
    "email",
    "segment",
    "plan",
    "promptCountTotal",
    "savedPromptCount",
    "packCount",
    "usedThisWeek",
    "remainingThisWeek",
    "checkoutStarted",
    "created_at",
  ];

  const rows = [
    headers.join(","),
    ...users.map((u) =>
      [
        u.email,
        u.segment,
        u.plan,
        u.promptCountTotal,
        u.savedPromptCount,
        u.packCount,
        u.usedThisWeek,
        u.remainingThisWeek,
        u.checkoutStarted ? "yes" : "no",
        u.created_at,
      ]
        .map(escapeCSV)
        .join(",")
    ),
  ];

  const csv = rows.join("\r\n");
  const filename = `umprompt-users-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
