/**
 * lib/user-segments.ts — Server-side user segment computation.
 *
 * Segments are used to decide which upgrade CTAs to show and for admin analytics.
 * All DB queries use the service-role admin client (bypasses RLS).
 * Never call getUserSegment() from client components.
 */

import { createAdminClient } from "@/lib/supabase/admin";

export type UserSegment =
  | "new_signup"       // signed up, never generated
  | "tried_once"       // generated exactly 1 prompt total
  | "active_free"      // generated 2–5 prompts, not paid
  | "high_intent"      // generated 6+ OR saved at least 1 prompt, not paid
  | "limit_reached"    // used all 7 free prompts this week, not paid
  | "checkout_started" // started checkout but has no active subscription
  | "paid";            // active subscription or lifetime access

export interface UserSegmentResult {
  segment: UserSegment;
  isPaid: boolean;
  plan: string;
  usedThisWeek: number;
  remainingThisWeek: number;
  promptCountTotal: number;
  savedPromptCount: number;
  packCount: number;
  checkoutStarted: boolean;
  freeLimitReached: boolean;
}

const FREE_WEEKLY_LIMIT = 7;

/**
 * Pure function — computes segment from already-fetched counts.
 * Use this in list views to avoid N+1 queries.
 */
export function computeSegment(data: {
  isPaid: boolean;
  checkoutStarted: boolean;
  usedThisWeek: number;
  totalUsageEvents: number;
  savedPromptCount: number;
  packCount: number;
}): UserSegment {
  if (data.isPaid) return "paid";
  if (data.usedThisWeek >= FREE_WEEKLY_LIMIT) return "limit_reached";
  if (data.checkoutStarted) return "checkout_started";
  const totalActivity = data.totalUsageEvents;
  if (totalActivity === 0) return "new_signup";
  if (totalActivity === 1) return "tried_once";
  if (totalActivity >= 6 || data.savedPromptCount > 0) return "high_intent";
  return "active_free";
}

export const SEGMENT_LABELS: Record<UserSegment, string> = {
  new_signup: "New signup",
  tried_once: "Tried once",
  active_free: "Active free",
  high_intent: "High intent",
  limit_reached: "Limit reached",
  checkout_started: "Checkout started",
  paid: "Paid",
};

/**
 * Fetches all data for a single user and returns their segment.
 * Uses service-role client — server-only.
 */
export async function getUserSegment(userId: string): Promise<UserSegmentResult> {
  const admin = createAdminClient();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { data: sub },
    { count: usedThisWeek },
    { count: totalUsageEvents },
    { count: savedPromptCount },
    { count: packCount },
    { data: pendingCheckout },
  ] = await Promise.all([
    admin
      .from("billing_subscriptions")
      .select("plan, status, is_lifetime, is_founder")
      .eq("user_id", userId)
      .in("status", ["active", "trialing"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    admin
      .from("usage_events")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", sevenDaysAgo),
    admin
      .from("usage_events")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId),
    admin
      .from("prompts")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId),
    admin
      .from("prompt_packs")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId),
    admin
      .from("promo_redemptions")
      .select("id")
      .eq("user_id", userId)
      .eq("status", "pending")
      .limit(1),
  ]);

  const isPaid = !!sub;
  const plan = sub?.plan ?? "free";
  const usedThisWeekNum = usedThisWeek ?? 0;
  const totalUsageEventsNum = totalUsageEvents ?? 0;
  const savedCount = savedPromptCount ?? 0;
  const packs = packCount ?? 0;
  const checkoutStarted = (pendingCheckout?.length ?? 0) > 0;
  const freeLimitReached = !isPaid && usedThisWeekNum >= FREE_WEEKLY_LIMIT;
  const remaining = isPaid ? Infinity : Math.max(0, FREE_WEEKLY_LIMIT - usedThisWeekNum);

  const segment = computeSegment({
    isPaid,
    checkoutStarted,
    usedThisWeek: usedThisWeekNum,
    totalUsageEvents: totalUsageEventsNum,
    savedPromptCount: savedCount,
    packCount: packs,
  });

  return {
    segment,
    isPaid,
    plan,
    usedThisWeek: usedThisWeekNum,
    remainingThisWeek: isPaid ? 999 : remaining,
    promptCountTotal: totalUsageEventsNum,
    savedPromptCount: savedCount,
    packCount: packs,
    checkoutStarted,
    freeLimitReached,
  };
}
