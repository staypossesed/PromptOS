/**
 * lib/billing.ts — Server-side billing helpers.
 *
 * All functions require the Supabase server client from the calling route handler.
 * The service-role admin client is used only in the webhook handler (lib/supabase/admin.ts).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { stripe } from "@/lib/stripe";

export type PlanType =
  | "free"
  | "pro_monthly"
  | "founder_monthly"
  | "lifetime"
  | "founder_lifetime";

export interface BillingStatus {
  plan: PlanType;
  status: string;
  isPaid: boolean;
  isFounder: boolean;
  isLifetime: boolean;
  weeklyLimit: number | null;
  usedThisWeek: number;
  remainingThisWeek: number | null;
  usedToday: number;
  fairUseLabel: string | null;
}

export interface UsageCheckResult {
  allowed: boolean;
  errorCode: string | null;
  message: string | null;
  status: number;
}

const FREE_WEEKLY_LIMIT = 7;
const PAID_DAILY_ABUSE_LIMIT = 200;
export const FOUNDER_LIMIT = 100;
export const PROMO_CODE = "UMPROMPT";

// ── Billing status ──────────────────────────────────────────────────────────

export async function getBillingStatus(
  supabase: SupabaseClient,
  userId: string
): Promise<BillingStatus> {
  try {
    // Active subscription or lifetime purchase
    const { data: sub } = await supabase
      .from("billing_subscriptions")
      .select("plan, status, is_lifetime, is_founder, current_period_end")
      .eq("user_id", userId)
      .in("status", ["active", "trialing"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const isPaid = !!sub;
    const plan: PlanType = (sub?.plan as PlanType) ?? "free";
    const isLifetime = sub?.is_lifetime ?? false;
    const isFounder = sub?.is_founder ?? false;

    // Rolling 7-day usage count
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [{ count: weekCount }, { count: todayCount }] = await Promise.all([
      supabase
        .from("usage_events")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("created_at", sevenDaysAgo.toISOString()),
      supabase
        .from("usage_events")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("created_at", todayStart.toISOString()),
    ]);

    const usedThisWeek = weekCount ?? 0;
    const usedToday = todayCount ?? 0;

    if (isPaid) {
      return {
        plan,
        status: sub?.status ?? "active",
        isPaid: true,
        isFounder,
        isLifetime,
        weeklyLimit: null,
        usedThisWeek,
        remainingThisWeek: null,
        usedToday,
        fairUseLabel: "Unlimited fair-use",
      };
    }

    return {
      plan: "free",
      status: "free",
      isPaid: false,
      isFounder: false,
      isLifetime: false,
      weeklyLimit: FREE_WEEKLY_LIMIT,
      usedThisWeek,
      remainingThisWeek: Math.max(0, FREE_WEEKLY_LIMIT - usedThisWeek),
      usedToday,
      fairUseLabel: null,
    };
  } catch {
    // Billing tables not yet migrated — treat as free
    return {
      plan: "free",
      status: "free",
      isPaid: false,
      isFounder: false,
      isLifetime: false,
      weeklyLimit: FREE_WEEKLY_LIMIT,
      usedThisWeek: 0,
      remainingThisWeek: FREE_WEEKLY_LIMIT,
      usedToday: 0,
      fairUseLabel: null,
    };
  }
}

// ── Usage enforcement ───────────────────────────────────────────────────────

export function checkUsageLimits(billing: BillingStatus): UsageCheckResult {
  if (!billing.isPaid) {
    if (billing.usedThisWeek >= FREE_WEEKLY_LIMIT) {
      return {
        allowed: false,
        errorCode: "FREE_LIMIT_REACHED",
        message: "You've used your 7 free prompts this week. Upgrade to keep building.",
        status: 402,
      };
    }
  } else {
    if (billing.usedToday >= PAID_DAILY_ABUSE_LIMIT) {
      return {
        allowed: false,
        errorCode: "FAIR_USE_LIMIT_REACHED",
        message: "You've reached the fair-use limit for today (200 generations). Resets at midnight.",
        status: 429,
      };
    }
  }
  return { allowed: true, errorCode: null, message: null, status: 200 };
}

// ── Usage recording ─────────────────────────────────────────────────────────

export async function recordUsageEvent(
  supabase: SupabaseClient,
  userId: string,
  eventType: string,
  source?: string
): Promise<void> {
  try {
    await supabase.from("usage_events").insert({ user_id: userId, event_type: eventType, source });
  } catch {
    // Non-critical — never crash the generation flow
  }
}

// ── Founder eligibility ─────────────────────────────────────────────────────

export async function getFounderCount(supabase: SupabaseClient): Promise<number> {
  try {
    const { data, error } = await supabase.rpc("get_founder_count");
    if (error) throw error;
    return (data as number) ?? 0;
  } catch {
    return 0;
  }
}

export async function isFounderEligible(
  supabase: SupabaseClient,
  promoCode: string | undefined
): Promise<boolean> {
  if (!promoCode || promoCode.toUpperCase() !== PROMO_CODE) return false;
  const count = await getFounderCount(supabase);
  return count < FOUNDER_LIMIT;
}

// ── Stripe customer ─────────────────────────────────────────────────────────

export async function getOrCreateStripeCustomer(
  supabase: SupabaseClient,
  userId: string,
  email: string
): Promise<string> {
  // Check existing mapping
  const { data: existing } = await supabase
    .from("billing_customers")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing?.stripe_customer_id) return existing.stripe_customer_id;

  // Create new Stripe customer
  const customer = await stripe.customers.create({
    email,
    metadata: { supabase_user_id: userId },
  });

  // Persist mapping (use upsert in case of race condition)
  await supabase.from("billing_customers").upsert(
    { user_id: userId, stripe_customer_id: customer.id, updated_at: new Date().toISOString() },
    { onConflict: "user_id" }
  );

  return customer.id;
}

// ── Plan display helpers ────────────────────────────────────────────────────

export function planDisplayName(plan: PlanType, isFounder: boolean): string {
  if (plan === "free") return "Free";
  if (isFounder && plan === "founder_monthly") return "Founder Pro";
  if (isFounder && plan === "founder_lifetime") return "Founder Lifetime";
  if (plan === "pro_monthly") return "Pro";
  if (plan === "lifetime" || plan === "founder_lifetime") return "Lifetime";
  return "Pro";
}
