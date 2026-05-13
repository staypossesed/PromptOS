/**
 * lib/analytics.ts — Client-side analytics wrapper (PostHog).
 *
 * Noops safely when:
 *  - NEXT_PUBLIC_POSTHOG_KEY is not set
 *  - PostHog has not finished initializing
 *  - Running server-side (SSR guard)
 *
 * Do NOT import this file in Server Components.
 * Do NOT log prompt content, API keys, or private tokens.
 */

import posthog from "posthog-js";

export type AnalyticsEvent =
  | "landing_view"
  | "signup_started"
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
  | "model_winner_selected";

export interface EventProperties {
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
}

export function track(event: AnalyticsEvent, properties?: EventProperties): void {
  if (typeof window === "undefined") return;
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
  try {
    posthog.capture(event, properties ?? {});
  } catch {
    // Analytics must never crash the app
  }
}

export function identify(userId: string, traits?: { email?: string }): void {
  if (typeof window === "undefined") return;
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
  try {
    posthog.identify(userId, traits);
  } catch {}
}
