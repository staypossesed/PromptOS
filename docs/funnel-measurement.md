# One Measurable Funnel

## Definition

The website funnel is **visit > signup > generated prompt > copied prompt > confirmed useful result > a new task on a later day > verified purchase**. Count distinct people, not clicks. Keep the reporting window fixed, initially 30 days from the chosen start (`--days 60` changes it explicitly). Visits near its end have less time to convert; use mature cohorts for comparisons. A prompt score, copy, saved prompt, or long session is not proof of a useful answer.

| Step | Event / rule | What it proves |
| --- | --- | --- |
| Visit | `site_visited` | The website opened. Recorded at the original visit time, even if analytics initialization is delayed. |
| Signup | `signup_completed`, server source | A real account exists. Its timestamp is Supabase's actual account creation time, not today's login. |
| Generated prompt | `prompt_generated`, `new_task = true` | A complete, nonempty prompt was received. Failed/partial streams do not count. |
| Copied prompt | `prompt_copied` after generation, matching `task_id` | The browser successfully wrote the result to the clipboard. Failed copies do not count. |
| Useful result | `prompt_result_confirmed`, `outcome = useful`, matching a copied `task_id` and `result_id` | The user explicitly reports a useful answer from their AI assistant. This is self-report, not independent verification. |
| Later-day task | A different `task_id`, `new_task = true`, after usefulness and on a later UTC calendar date | The user started another task. Reopening, editing the source idea, regenerating, optimizing, and refining the same task do not count. |
| Purchase | `purchase_confirmed`, server source, `live_mode = true`, a unique `event_key` | Stripe returned a complete, paid session with a valid plan/current subscription, and billing persistence succeeded. |

The server timestamps the purchase event with the already-retrieved checkout's creation time. This is a conservative attribution time, **not the exact card settlement time**: an old receipt cannot appear to be a new purchase today. Delayed payments may therefore fall earlier in the funnel than their eventual settlement. Use Stripe and the billing database for actual financial timing and totals.

### Identity and Versions

PostHog uses the Supabase account ID after authentication, merging the earlier anonymous website visit. Email addresses are not sent. Reset identity on explicit sign-out, expired sessions, and account changes, including server-side sign-out followed by a page load. Events queued before identity is ready retain their original occurrence times and contain only bounded metadata.

Each task has random `task_id` / `result_id` values. Editing or refining a result changes its result ID but retains the task ID. **New idea** starts another task. These IDs never contain prompt text or a content hash. Saving retains the current vote, and a checkout round trip preserves the IDs and vote with the existing tab-local draft. A new result version needs its own copy and feedback; failed refinements preserve the original result's vote.

An older saved prompt reopened in a fresh tab gets new local metric IDs; there is no cross-device content fingerprint. Do not claim that the entire saved-prompt lifecycle is joined across devices. New tasks on another day can still be joined by the account identity. Pack/model-lab/extension activity is excluded from this website single-prompt funnel unless separately instrumented and validated; do not mix those denominators.

`answer_outcome_feedback` records `useful`, `not_useful`, or `not_tried` separately. Only useful feedback produces `prompt_result_confirmed`. The question sits directly below the result after a successful copy, before upgrade/next-task/quality sections. Feedback is optional; users can defer it without being counted as either successful or unsuccessful.

## Configure the Report

Production has `NEXT_PUBLIC_POSTHOG_KEY` and `NEXT_PUBLIC_POSTHOG_HOST` variable names configured in Vercel (checked October 15, 2026). Their values and actual ingestion were not inspected or certified. Local `.env.local` has neither configured. The isolated billing runner also explicitly disables production analytics.

After deploying the changes, confirm one controlled event sequence in **PostHog > Activity**, including the server events. This requires access to the matching PostHog project; code tests cannot prove remote ingestion. No PostHog dashboard has been created automatically by this work.

Use the following metadata-only query in PostHog SQL insights. Export its JSON result privately. Use the merged `person_id`, not raw `distinct_id`, so pre-login and identified events join after identity merging. Review the time window and exclude staff/test accounts using a saved cohort. An existing-user reactivation report needs a separate login-based cohort rather than relabeling returning users as signups.

```sql
SELECT
    person_id AS actor_id,
    event,
    timestamp,
    properties.task_id AS task_id,
    properties.result_id AS result_id,
    properties.new_task AS new_task,
    properties.outcome AS outcome,
    properties.live_mode AS live_mode,
    properties.event_key AS event_key
FROM events
WHERE properties.funnel_version = 1
  AND event IN (
    'site_visited', 'signup_completed', 'prompt_generated', 'prompt_copied',
    'prompt_result_confirmed', 'purchase_confirmed'
  )
ORDER BY timestamp
```

The export must contain ISO timestamps (UTC or with an explicit offset) and the aliases above. `new_task` / `live_mode` accept JSON booleans and the explicit SQL representations `true` / `1`; missing/false values never count as true. A plain JSON row array or PostHog API `{ "columns": [...], "results": [...] }` response is supported. Keep the export outside Git and never include email, prompt, profile, or answer columns. The report prints aggregate counts only:

```powershell
npm run funnel:report -- --events "C:\private\funnel-events.json" --since "2026-10-15T00:00:00Z"
```

This report checks event order, matching task/result IDs, distinct tasks on later UTC dates, test/live status, and earliest verification per receipt key. It includes `purchases_after_useful_before_return` separately: **a user can buy immediately**; do not force them to wait for a second day just to complete an analytics funnel. That extra count is not seven-step completion.

Do not call October 15 the launch date merely because it is the example command. Use the actual first deployment/verified ingestion date for the cohort start. The 30-day window is a reporting choice, not evidence of an existing conversion rate.

## Revenue Source of Truth

Browser `checkout_completed` means the confirmation page verified paid access. It is a UI diagnostic, not purchase attribution. Cancellations, failed charges, visits to a success URL, and test-mode purchases are never counted as live revenue.

`purchase_confirmed` is best-effort server telemetry from the shared fulfillment path, including signed webhooks when the user closes the return page. Retries may emit the same receipt more than once; deduplicate on `event_key`, and use the earliest timestamp. Analytics outages must not fail a successful payment. Reconcile purchases against distinct `billing_subscriptions.stripe_checkout_session_id` records and Stripe's paid sessions; missing analytics must not turn into missing revenue. This release does not add a durable analytics outbox or refund ledger.

ARR counts recurring monthly revenue annualized. Lifetime payments are cash receipts, not recurring ARR. Net revenue also needs refunds/chargebacks/taxes from Stripe. Do not derive financial reporting from this funnel alone.

## Privacy and Acceptance Gate

The founder approved sending account IDs, signup/sign-in timestamps, random task/result IDs, usefulness votes, and purchase plan/amount/currency/test-live metadata plus checkout creation time to the website's configured PostHog destination. Server capture uses a bounded timeout and a metadata allowlist. SDK event URLs/referrers/email properties are removed; autocapture, session recording, and campaign/referrer persistence are disabled. Prompt/profile/answer content, card details, keys, and tokens are excluded.

Automated tests cover identity queue ordering, optional analytics, metadata filtering, signup timestamps, task/version IDs, failed payment suppression, and the ordered funnel rules. Browser fixtures verify the real result/feedback components with synthetic local services. Separate real Stripe sandbox purchases and lifecycle checks are recorded in [payment verification](payment-verification.md). Neither those purchases nor the browser fixtures establish live PostHog delivery, paid conversion rates, or genuine next-day retention. Verify production ingestion before treating the measured funnel as operational.

## References

- [PostHog identification and reset](https://posthog.com/docs/getting-started/identify-users)
- [PostHog SQL insights](https://posthog.com/docs/data-warehouse/sql/overview)
- [Stripe fulfillment](https://docs.stripe.com/checkout/fulfillment)
- [Stripe webhook ordering and delivery](https://docs.stripe.com/webhooks)
