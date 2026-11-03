/**
 * lib/analytics.ts — Client-side analytics wrapper (PostHog).
 *
 * Noops safely when:
 *  - NEXT_PUBLIC_POSTHOG_KEY is not set
 *  - Running server-side (SSR guard)
 *
 * Do NOT import this file in Server Components.
 * Do NOT log prompt content, API keys, or private tokens.
 */

import posthog from "posthog-js";

export type AnalyticsEvent =
  | "task_started"
  | "workspace_create_opened"
  | "checkout_completed"
  | "checkout_failed"
  | "checkout_cancelled"
  | "checkout_verification_pending"
  | "prompt_refined"
  | "prompt_version_restored"
  | "workspace_item_saved"
  | "workspace_item_used"
  | "workspace_item_deleted"
  | "next_step_selected"
  | "category_selected"
  | "idea_suggestion_selected"
  | "clarification_shown"
  | "clarification_answered"
  | "answer_outcome_feedback"
  | "prompt_result_confirmed"
  | "landing_view"
  | "site_visited"
  | "signup_started"
  | "signup_completed"
  | "login_success"
  | "builder_opened"
  | "prompt_generated"
  | "prompt_scored"
  | "prompt_optimized"
  | "prompt_saved"
  | "prompt_reopened"
  | "prompt_copied"
  | "prompt_downloaded"
  | "history_opened"
  | "settings_opened"
  | "feedback_submitted"
  | "templates_opened"
  | "template_used"
  | "onboarding_option_selected"
  | "prompt_pack_generated"
  | "prompt_pack_copied"
  | "prompt_pack_saved"
  | "prompt_pack_reopened"
  | "prompt_pack_deleted"
  | "model_lab_opened"
  | "model_comparison_run"
  | "model_output_used"
  | "model_winner_selected"
  | "google_signin_started"
  | "github_signin_started"
  | "language_detected"
  | "language_changed"
  | "prompt_language_detected"
  | "account_menu_opened"
  | "account_opened"
  | "signout_clicked"
  // Billing
  | "plan_page_viewed"
  | "promo_code_applied"
  | "checkout_started"
  | "free_limit_reached"
  | "upgrade_clicked"
  | "billing_portal_opened"
  // Upgrade CTAs
  | "upgrade_cta_shown"
  | "upgrade_cta_clicked"
  | "upgrade_cta_dismissed";

export interface EventProperties {
  category?: string;
  suggestion_id?: string;
  improved?: boolean;
  target_tool?: string;
  score_overall?: number;
  action_type?: string;
  option?: string;
  template_id?: string;
  pack_type?: string;
  models_compared?: string;
  model_count?: number;
  selected_model?: string;
  winner_model?: string;
  reason?: string;
  latencyMs?: number;
  estimatedCostUSD?: number;
  // i18n
  language?: string;
  source?: string;
  inputLanguage?: string;
  outputLanguage?: string;
  // billing (no PII, no card data)
  plan?: string;
  offer_type?: string;
  is_founder?: boolean;
  // CTA tracking (no prompt text)
  cta_variant?: string;
  user_segment?: string;
  remaining_this_week?: number;
  source_page?: string;
  task_id?: string;
  result_id?: string;
  new_task?: boolean;
  outcome?: "useful" | "not_useful" | "not_tried";
  funnel_version?: number;
}

type PendingEvent = { event: AnalyticsEvent; properties: EventProperties; occurredAt: Date };
let ready = false;
const pending: PendingEvent[] = [];

const allowed = new Set([
  "category", "suggestion_id", "improved", "target_tool", "score_overall", "action_type", "option", "template_id", "pack_type", "models_compared", "model_count", "selected_model", "winner_model", "reason", "latencyMs", "estimatedCostUSD", "language", "source", "inputLanguage", "outputLanguage", "plan", "offer_type", "is_founder", "cta_variant", "user_segment", "remaining_this_week", "source_page", "task_id", "result_id", "new_task", "outcome",
]);

export function analyticsProperties(properties: EventProperties = {}): EventProperties {
  return Object.fromEntries(Object.entries(properties).filter(([key, value]) => allowed.has(key) &&
    (typeof value === "boolean" || (typeof value === "number" && Number.isFinite(value)) || (typeof value === "string" && value.length <= 120))));
}

export function stripPrivateAnalytics(properties: Record<string, unknown>): Record<string, unknown> {
  const safe = { ...properties };
  for (const key of Object.keys(safe)) {
    if (/url|referrer|email/i.test(key)) delete safe[key];
    else if (["$set", "$set_once"].includes(key) && safe[key] && typeof safe[key] === "object") safe[key] = stripPrivateAnalytics(safe[key] as Record<string, unknown>);
  }
  return safe;
}

export function analyticsReady(): void {
  ready = true;
  for (const item of pending.splice(0)) track(item.event, item.properties, item.occurredAt);
}

export function track(event: AnalyticsEvent, properties?: EventProperties, occurredAt = new Date()): void {
  if (typeof window === "undefined") return;
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
  if (!ready) {
    if (pending.length < 50) pending.push({ event, properties: analyticsProperties(properties), occurredAt });
    return;
  }
  try {
    posthog.capture(event, { ...analyticsProperties(properties), funnel_version: 1 }, { timestamp: occurredAt });
  } catch {
    // Analytics must never crash the app
  }
}

export function identify(userId: string): void {
  if (typeof window === "undefined") return;
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
  try {
    posthog.identify(userId);
  } catch {}
}

export function resetAnalytics(clearPending = true): void {
  if (clearPending) pending.length = 0;
  if (typeof window === "undefined" || !process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
  try { posthog.reset(); } catch {}
}
