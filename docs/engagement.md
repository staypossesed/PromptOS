# Interactive Workspace

## Product Goal

Increase useful returning sessions, not time spent waiting or navigating. The release adds five connected features: refinements, private context profiles, reusable playbooks, relevant next tasks, and value-based upgrade offers.

## Behavior

- Refinement actions revise the current prompt through the existing generation pipeline. They share its authentication and usage limits. Failed requests keep the previous result.
- Up to five previous text versions are previewable and restorable. Save the prompt to persist the history; starting a new task clears it. Restoring invalidates the quality score rather than showing a stale score.
- Context profiles are saved separately from prompts. Applying one requires a preview and explicit confirmation of Anthropic/OpenRouter sharing. The task uses a snapshot; editing a library profile does not silently change older prompts.
- Playbooks store a starting idea and reusable task details, not generated answers, profiles, previous versions, or one-time clarification answers.
- Next tasks are curated by category, with keyword-based category inference for automatic mode. They prefill an editable idea and never trigger generation automatically. Unsaved results require confirmation before replacement.
- Builder upgrade offers require a successful copy or save in the current session and at most two free generations remaining. Paid plans, including lifetime plans, are excluded. Pricing and entitlements are unchanged.

## Discoverability and Checkout

- The builder shows a labelled profile selector, a direct New profile link, and a labelled library action. New profile opens the profile editor directly.
- Refinements and version controls are above the generated output. A Keep building shortcut jumps to the next-task suggestions; neither action hides the current result.
- The value-based upgrade offer is directly below the output. The duplicate low-usage sidebar offer has been removed; its neutral usage meter and pricing link remain.
- Following the result's upgrade link or the builder's profile/library links preserves the current task and versions in tab-local session storage for 30 minutes. Return/use links restore that snapshot once. It is removed on explicit sign-out and is never placed in a URL or analytics event. Other pricing entry points do not create a snapshot.
- Pricing preserves the return destination and discount intent through sign-in and cancellation. Expired offers require reviewing new prices; unknown founder availability never invents remaining spots.
- Checkout rejects already-paid users and validates Stripe's configured amount, currency, price type, and monthly interval against the displayed offer before creating a session.
- Both the return endpoint and signed webhook retrieve current Stripe state. Only completed, paid sessions for the correct account activate access; monthly subscriptions must still be active/trialing. Database failures are reported and webhook delivery can retry.
- The confirmation screen retries briefly, provides manual retry, and does not claim payment success before verified paid access. Completion analytics fire only after this confirmation, once per browser session. These client events are not a financial ledger.
- Signed events include `checkout.session.completed` and `checkout.session.async_payment_succeeded`. Subscription changes and failed invoices retain the existing access updates and now surface storage failures for retry.

This timing is a conversion hypothesis, not a proven ideal moment. Validate conversion against successful payment/entitlement records and actual return rates, not just CTA clicks.

## Measurement

Track activation as generation followed by successful copy, keeping copy separate from reported answer usefulness. Compare seven-day return rates, playbook reuse, refinements, upgrade clicks, successful purchases, and provider cost per active user. A longer session or higher prompt score alone does not establish improved outcomes.

New metadata-only events: `prompt_refined`, `prompt_version_restored`, `workspace_item_saved`, `workspace_item_used`, `workspace_item_deleted`, and `next_step_selected`. Existing copy, feedback, usage, checkout, and upgrade events remain. PostHog autocapture and session recording are disabled; events do not include profile, prompt, or answer content.

## Verification

Apply `supabase/workspace.sql` before using the library. The table uses owner-only row-level security plus explicit owner filters in API queries. Tests cover API authentication, validation, owner filters, confirmation, usage gates, refinement assembly, saved-state detection, and version limits.

With the local development server running, `node scripts/check-workspace-ui.cjs` exercises the real builder/library/pricing/confirmation components using synthetic API responses at desktop/mobile sizes. It checks recovery, restoration, clipboard copy, saves, profile/playbook editing, checkout failures, redirect/cancellation, pending/confirmed activation, draft restoration, paid upsell suppression, reduced motion, console errors, and overflow. Temporary fixture routes are removed afterward. It does not validate a real user's session, live provider quality, Stripe payments, or database policies under multiple real accounts; check those integrations in an approved preview before release.

For the outstanding integration check, see [Payment verification](payment-verification.md). Local Stripe/admin settings are currently missing; simulated checks must not be labelled a real test purchase.

## References

- [Supabase row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security): database access policies paired with authentication.
- [PostHog retention](https://posthog.com/docs/product-analytics/retention): returning-user analysis based on meaningful product events.
- [AI SDK streamText](https://ai-sdk.dev/docs/reference/ai-sdk-core/stream-text): streaming and cancellation concepts. Implementation uses the installed AI SDK 4 types, not a newer SDK migration.
- [Stripe fulfillment](https://docs.stripe.com/checkout/fulfillment): verify payment state and use webhooks as well as the return page.
- [Stripe testing](https://docs.stripe.com/testing): test credentials and synthetic cards, never real cards in live mode.
