# Payment Verification

## Current Evidence

Automated route/helper checks use synthetic Stripe/Supabase responses. Initial desktop and mobile browser checks also used mocked billing APIs and an intercepted hosted-checkout page. Those checks establish application behavior only. Separate real Stripe sandbox purchases and account checks were subsequently completed, as recorded below.

Monthly and founder-lifetime test-mode purchases have been verified against Stripe, signed webhook deliveries, and the isolated database. Renewal failure/recovery and cancellation subsequently passed in that sandbox. The October 31 production cutover below connected live billing and reconciled one obsolete test record. No real-money purchase or charge was made.

**Full journey verification: NOT COMPLETE.** Core sandbox billing checks and production configuration checks have passed; the website has been deployed with the founder's approval. Original-task return continuity and the remaining price variants were subsequently checked on November 2 below. Delayed delivery, real-email delivery, portal payment-method replacement, and the first live payment still need their own evidence. Configuration validation and mocked tests do not establish those outcomes.

### Verified Setup: October 16, 2026

- The existing Stripe sandbox accepts the local test key. All four prices are active, test-mode USD prices with the expected amounts and billing intervals.
- A separate Supabase project, **Umprompt Billing Test**, has been initialized with the application's existing SQL files. The server key is accepted, and zero-row billing schema checks and the founder-count helper pass. A read-only catalogue query confirms that all 13 public tables have row-level security enabled. Subsequent owner-scoped billing-read checks passed; this is not a full RLS audit of every table.
- The isolated website starts at `http://localhost:3002` with its separate build cache and production analytics disabled.
- The official Stripe CLI connects to the sandbox and forwards selected billing events to the local endpoint. Its signing secret stays in the ignored local test file; no keys are recorded here. Actual purchase-event deliveries returned HTTP 200 in the completed checks below.
- The test project's Site URL is `http://localhost:3002`, with the exact `/auth/callback` redirect allowed. Email sign-in is enabled; Google and GitHub are not configured in this new project. The isolated login hides those unavailable providers and displays a **Payment test** label. Normal production login retains its existing provider buttons.
- The sandbox's default billing portal is active and configured for period-end cancellation and payment-method updates. A disposable customer subsequently completed period-end cancellation. A payment-method update through the portal has not been verified.
- The running isolated app returns HTTP 401 for unauthenticated checkout, billing status, checkout synchronization, and portal requests. Its webhook returns HTTP 400 for missing and forged signatures.

The setup and boundary checks above must be distinguished from the completed transaction checks below.

The first browser attempts exposed an unconfigured GitHub provider, an `otp_expired` email-link response, and an email-send rate limit. The founder confirmed opening the email link in another browser first. The isolated login hides unavailable OAuth buttons and distinguishes expired/used links and email-send limits from cancellation. It does not promise an exact quota-reset time or retry automatically. The default email service locks custom templates without custom SMTP or a plan upgrade, so a code-based fallback has not been enabled. Request a fresh link only after the sending limit permits it, and open it first in the browser that requested it.

### Completed Sandbox Checks: October 16, 2026

With the founder's approval, two disposable fake accounts were created only in **Umprompt Billing Test**. A temporary loopback-only helper used Supabase's normal one-time verification and session cookies without sending email. It is outside the application, expires automatically, and is not a production login route. These checks do not establish real-email delivery or production OAuth behavior.

- A real hosted monthly checkout completed for **USD 9.99**. Stripe reported a complete, paid, test-mode session and an active subscription. The signed `checkout.session.completed` and `invoice.paid` deliveries returned HTTP 200. The database contained one active monthly entitlement with a future period end; the actual account page still showed Pro after reload.
- A real hosted founder-lifetime checkout completed for **USD 34.99**. Its signed completion event returned HTTP 200. The database and authenticated billing API confirmed lifetime access with exactly one successful founder redemption after repeated receipt synchronization. This does not test the non-founder USD 99.99 purchase variant.
- Leaving a separate hosted checkout unpaid returned the cancellation message, retained the founder offer, created no paid entitlement, and could not be claimed as paid. Restoring a user's original prompt after cancellation still needs a real continuity check.
- Stripe's documented declined test card produced an actual declined PaymentIntent. A separate 3DS attempt reached `requires_action`. In both cases the session remained unpaid, the account remained free, no entitlement existed, and the receipt-sync endpoint returned HTTP 409.
- A paid account could not start a duplicate upgrade checkout (HTTP 409). The other account could not read its billing row or claim its checkout receipt (HTTP 403). Repeated owner synchronization left one entitlement per session and one successful founder redemption for the lifetime purchase.
- The actual sandbox portal scheduled the monthly subscription to cancel at the end of its paid period. Stripe retained active status and the app retained paid access. The test accepted Stripe's explicit `cancel_at` timestamp equal to the item period end, not only the `cancel_at_period_end` flag. Expiration at that future date and immediate cancellation were not yet verified.

Private run records retain test session/event IDs and screenshots. No keys, session cookies, real customer details, or card details are recorded here. The October 29 follow-up below adds actual lifecycle checks; delayed delivery and production legacy-subscription reconciliation remain open.

### Follow-Up: October 29, 2026

- Supabase had paused the unused **Billing Test** project. It was resumed on its existing free plan. After restoration finished, the separate database and all four test-price preflight checks passed again. The isolated website and signed-event listener were restarted; no production project or plan was changed.
- Checkout now requests a strict billing lookup. A subscription or usage read error, or a thrown lookup failure, returns HTTP 503 with `BILLING_UNAVAILABLE` before Stripe checkout creation. The pricing page explains that no new checkout started. Existing non-checkout billing callers keep their previous behavior.
- Checkout also reads current Stripe subscriptions for an existing customer. Active, trialing, past-due, unpaid, incomplete, or paused subscriptions lead to `BILLING_ACTION_REQUIRED`, not another purchase. Failed customer/history lookups stop checkout. Cancelled and expired-incomplete subscriptions remain eligible for a new checkout. The actual past-due test account received HTTP 409 and no new checkout.
- The actual failed-renewal account screen exposed a misleading upgrade button. It now shows a billing-recovery notice and keeps Manage billing available without offering a duplicate upgrade. The pricing page provides the recovery link too, and focuses checkout errors so the message is visible. These behaviors were verified in the browser against the real test account.
- Email-limit regression tests cover both returned and thrown provider errors, one request only, no automatic resend, no false sent-email state, and no provider-detail echo. These local checks do not establish real-email delivery. Final local test/build results are recorded separately below.
- An initial billing-anchor reset did not produce a renewal invoice and was not counted as a failed-renewal test. Stripe's documented existing-customer test clock was then attached to the original disposable customer and hosted-checkout subscription. Only the temporary helper's clock-creation request used the newer documented API version; the application's Stripe API version was not changed.
- Advancing that clock through the next cycle and invoice-collection hour produced a real **USD 9.99** `subscription_cycle` invoice with a failed payment and `past_due` subscription. The actual signed failure delivery returned HTTP 200, the stored entitlement became past due, and paid access was removed. The billing portal remained available.
- Paying that failed invoice with a successful test fixture produced a real `invoice.paid` delivery (HTTP 200), active subscription and stored entitlement, and restored Pro access in the browser. A locally signed replay of the actual previous failure returned HTTP 200 but could not undo recovery. This is an actual sandbox event payload replay, not a claim that Stripe remotely resent it.
- Period-end cancellation retained paid access before expiry. Advancing the same clock through that paid-period end produced the actual subscription deletion delivery (HTTP 200), stored `cancelled` status, and Free access in the browser. The original paid checkout receipt returned `PLAN_INACTIVE` (HTTP 409), and the old failure replay could not reactivate it.
- To cover the separate legacy dual-plan case, one additional API-created monthly sandbox subscription and an explicitly seeded billing row were added only to the existing disposable lifetime account. This was a lifecycle fixture, not another website checkout. Immediate cancellation and its actual signed deletion returned HTTP 200; a locally signed deletion replay also returned HTTP 200. The same account's original lifetime entitlement stayed active, and Founder Lifetime access survived a browser reload.

At the end of October 29, the full verification gate remained open for real-email delivery, original-prompt return continuity in a real checkout journey, delayed webhook recovery, remaining purchase-price variants, and production legacy-subscription reconciliation. The October 31 cutover resolved the legacy record. Live analytics ingestion and genuine usefulness/next-day retention are not established by these disposable test runs. No sandbox test event was sent to production analytics.

Final local verification on October 29: **142 automated tests passed**, TypeScript checking passed, and the full Next.js production-style build passed using only isolated test variables and its separate build cache. The private test configuration remains ignored by Git. The temporary fake-account sign-in helper was stopped after browser verification; no authentication shortcut was added to the application. These changes have not been deployed, committed, or pushed as part of this verification run.

### Production Cutover: October 31, 2026

- The founder authorized live billing connection and production deployment. Vercel Production now has the existing activated account's live server key, four live price IDs, and the live destination's signing secret. Original test values remain scoped to Preview. Credentials were transferred directly into Vercel's secret fields; no production secret export or local secret file was created.
- Read-only checks ran inside Vercel's actual production build environment. Stripe confirmed `charges_enabled`, and all four active USD prices matched the displayed amounts, one-month intervals, and recurring/one-time types. Billing-test mode is disabled and return URLs use Umprompt HTTPS.
- The active live destination targets `https://www.umprompt.com/api/stripe/webhook` directly, without a redirect or login gate. It subscribes to the six application billing events, uses snapshot payloads and API version `2026-04-22.dahlia`. The release checker supports both legacy webhook endpoints and the newer event-destination API, requesting the destination URL without requesting signing secrets.
- The live default customer portal was saved and independently verified through Stripe's API: payment-method updates enabled and monthly cancellation at the end of the paid period enabled. No live customer's card or subscription was changed during these configuration checks.
- Aggregate database checks found exactly one expired pre-cutover `cs_test_` monthly purchase, its one matching old test customer link, no related promo redemption, and no expired live purchase. The founder explicitly approved archiving this obsolete state before deletion from active billing.
- The exact archive and recovery scripts first passed against synthetic rows in **Umprompt Billing Test**. They preserved a separate live-prefix fixture, denied archive reads to app roles, restored the archived fixtures, and rolled back all test changes. This was a database safety check, not a live Stripe purchase.
- The approved [archive script](../supabase/archive-legacy-test-billing.sql) then completed in production. A fresh aggregate audit found zero obsolete test purchases, zero archived customer links still active, and exactly two private recovery rows. Archive RLS was enabled and both `anon` and `authenticated` were denied SELECT. User accounts, saved prompts, and usage were outside this cleanup. The [recovery script](../supabase/restore-legacy-test-billing.sql) remains a manual, separately reviewed recovery option.
- The cloud production build, type checking, schema availability, anonymous library restriction, founder-count function, and active monthly expiry checks passed. The promoted website deployment is `dpl_3Ryr6AC27N5QXA7VxGMDTYjJHk9Y` (`prompt-6rde840iq-do4-u.vercel.app`), verified behind `www.umprompt.com` after promotion.
- Nine staged application boundary checks passed through Vercel's authenticated deployment-check tool. Eleven public checks then passed: home/login/pricing and extension health returned 200, four unauthenticated billing endpoints returned 401, GET webhook returned 405, and missing/forged webhook signatures returned 400. Initial direct requests to the protected staged hostname returned Vercel's 401 and were not counted as application verification.
- Browser review confirmed regular and founder prices, a usable pricing layout, and an unauthenticated purchase entry that preserves the founder offer through the sign-in return URL. No live checkout was paid.
- Stripe's newer event-destination ping API rejected the no-payment ping with HTTP 400 because ping supports **thin** destinations only. Umprompt's billing destination correctly remains **snapshot**. No destination format or event subscription was changed to make that diagnostic work, and the rejected ping is not counted as a delivery.
- A separate, explicitly invoked `scripts/verify-billing-signature.cjs` check ran in Vercel's secure production build environment. It signed a synthetic `umprompt.connection_check` no-op using the configured secret and received HTTP 200 with `received: true` from the public receiver. Its unknown event type makes no billing-table changes. Together with the missing/forged-signature 400 checks, this verifies the deployed signature boundary. The request was signed by this diagnostic, **not sent by Stripe**, and does not independently prove that the saved secret matches Stripe's destination secret.

The production configuration and public boundaries above are separate from payment fulfillment. A Stripe-originated live delivery and real-money purchase remain unverified. The successful sandbox lifecycle checks do not guarantee that every production customer journey is issue-free.

## Isolated Setup

Use a separate Stripe sandbox/test configuration and Supabase test project. Do not connect test payments to the production customer database or overwrite the regular local environment.

### Where to Find the Settings

1. In Stripe, use the account picker to create/select a sandbox. Open **API keys** for that sandbox and obtain a server-side test key, never a live key. Umprompt's current setup accepts a test secret key (`sk_test_...`); keep it local and server-only. [Stripe keys](https://docs.stripe.com/keys)
2. In the same sandbox, open the product catalogue and create/select the four prices listed below. Each price has a `price_...` identifier; use the price ID, not the `prod_...` product ID. [Stripe prices](https://docs.stripe.com/products-prices/manage-prices)
3. For a deployed test endpoint, open its webhook destination and obtain its separate signing secret (`whsec_...`). For local testing, the Stripe CLI prints the signing secret when forwarding test events; we'll configure that together. [Stripe webhooks](https://docs.stripe.com/webhooks)
4. In a separate Supabase test project, the **Connect** dialog provides the project URL/public key, and **Settings > API Keys** provides the server secret. Umprompt currently uses the environment names `NEXT_PUBLIC_SUPABASE_ANON_KEY` for the public key and `SUPABASE_SERVICE_ROLE_KEY` for the server key. New publishable/secret keys can be supplied under those existing names; never put the server key in a public variable. [Supabase keys](https://supabase.com/docs/guides/getting-started/api-keys)
5. Put these values in the ignored test configuration file, then tell the developer only its absolute path. We'll handle the isolated local server, test login, and signed event forwarding together. Do not change production Vercel settings.

Start with [the test template](../.env.billing-test.example). Make a separate `.env.billing-test.local` in the project folder, or an equivalent file outside the repository. It is ignored by Git. Keep the normal `.env.local` and production Vercel settings unchanged. Required fields:

```dotenv
BILLING_TEST_MODE=isolated
BILLING_TEST_SUPABASE_PROJECT_REF=
NEXT_PUBLIC_SITE_URL=http://localhost:3002
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_PRO_MONTHLY=
STRIPE_PRICE_FOUNDER_MONTHLY=
STRIPE_PRICE_LIFETIME=
STRIPE_PRICE_FOUNDER_LIFETIME=
```

Use Stripe test keys and test prices: USD 9.99/month, founder USD 4.99/month, USD 99.99 one-time, founder USD 34.99 one-time. Monthly prices recur every one month. Set up the test database using the README migrations and a dedicated login. Keep test login credentials out of chat and version control. The test server must load only the isolated configuration; separate its Next build cache and port from the regular development server.

### Start the Safe Test Environment

1. In the **test Supabase project**, run the README's database scripts, including `supabase/billing.sql`. Under Authentication > URL Configuration, use `http://localhost:3002` as the test Site URL and allow `http://localhost:3002/auth/callback`. Do not change the production project's settings. Use email-link sign-in and a dedicated test account; Google/GitHub are not necessary for this payment test.
2. In Stripe, log the CLI into the **same sandbox** that owns the four test prices. In a separate terminal, forward its signed snapshot events:

   ```powershell
   stripe listen --events checkout.session.completed,checkout.session.async_payment_succeeded,customer.subscription.updated,customer.subscription.deleted,invoice.payment_failed,invoice.paid --forward-to http://localhost:3002/api/stripe/webhook
   ```

3. Put that listener's `whsec_...` in the separate test file. Never use a production signing secret or the CLI's `--live` option. Keep the listener running.
4. From the Umprompt project, validate the configuration without creating any customer, checkout session, payment, or database row:

   ```powershell
   npm run billing:test -- --env .env.billing-test.local --check
   ```

5. When all checks pass, start the isolated website:

   ```powershell
   npm run billing:test -- --env .env.billing-test.local
   ```

6. Open `http://localhost:3002`, sign in to the **test** account, and carry out the checks below. If port 3002 is busy, stop the unrelated server or arrange a different isolated setup; do not silently fall back to the production-connected site on port 3000.

The runner rejects live Stripe keys and the current production Supabase project. It also checks database URLs found in the normal local environment files, validates all four test prices with Stripe, and reads table schemas without reading user records. It starts Next with a separate `.next-billing-test` cache and blocks fallback to normal local payment, database, AI, Redis, and analytics credentials. Production analytics are disabled in this test environment. The test does not create free AI credits: generation requires an optional provider key and may incur the provider's normal charges.

The read-only preflight does **not** prove the webhook secret is correct, a purchase succeeds, cancellation works, or RLS isolates real accounts. The signed delivery and account checks below remain mandatory. For a separate deployed test environment instead, register its own test webhook destination with the same event list.

## Required Checks

1. Generate or use a synthetic prompt, copy/save it, then follow the low-usage upgrade offer. Verify return continuity and the amount shown in Stripe.
2. Finish a monthly purchase with a Stripe test card. Confirm Stripe payment status, a successful signed webhook response, the database entitlement, and paid access after reload. Repeat for the one-time lifetime offer.
3. Cancel checkout. Confirm no new paid entitlement and restoration of the original prompt.
4. Use a declined test card and a 3DS test case. Ensure a failed or incomplete payment does not grant access.
5. Replay webhook delivery. Confirm one entitlement per checkout session and no duplicate redemption.
6. Delay webhook delivery and use the authenticated return path. Confirm the right account activates; a different account cannot claim the session.
7. Retry an unpaid session and an old session whose subscription is now cancelled. Confirm neither restores paid access.
8. Simulate unavailable configuration, a mismatched price, expired founder availability, and a billing storage failure. Confirm honest recovery and no unexpected higher-price checkout.
9. Confirm a paid user cannot start another upgrade checkout. Configure the **test-mode** Stripe customer portal to allow cancellation. Cancel a monthly subscription at period end: verify access remains until its paid period ends, then becomes free. Test immediate cancellation separately. Lifetime access must not change when a separate monthly subscription is cancelled.
10. Use a Stripe test clock or the documented sandbox renewal tools to produce a failed renewal. Verify the actual invoice failure, signed event delivery, and removal of paid access when the current subscription is past due. Recover payment: verify `invoice.paid`, the current active subscription, the entitlement, and restored paid access. Replay the old failure and verify it cannot undo the recovery.

Record the Stripe test session/event IDs, test environment, verified entitlement, and outcome privately. Do not include keys, card details, customer email, or prompt text in public logs.

### Test Cards and Evidence

On Stripe's **test** checkout only, use `4242 4242 4242 4242` for success, `4000 0000 0000 0002` for a generic decline, and `4000 0025 0000 3155` for authentication. Use a future expiry date and any valid test CVC. Never enter a real card. See [Stripe's current testing guidance](https://docs.stripe.com/testing) for the test behavior and renewal/test-clock setup.

Keep a private run record with one row per scenario:

| Scenario | Stripe test session/event | Webhook HTTP result | Database entitlement | Reloaded access | Result |
| --- | --- | --- | --- | --- | --- |
| Monthly success | Private October 16 record | HTTP 200 | One active monthly row | Pro after reload | PASS: USD 9.99 sandbox purchase |
| Lifetime success | Private October 16/29 records | HTTP 200 | One active lifetime row, one founder redemption | Founder Lifetime after reload | PASS: founder USD 34.99 purchase; regular-price variant pending |
| Checkout cancelled | Private October 16 record | Not applicable | No paid row | Free billing API | PARTIAL: original-draft return still pending |
| Decline / authentication incomplete | Private October 16 record | Not applicable | No paid row | Free billing API | PASS: both unpaid and receipt claim rejected |
| Period-end and immediate cancellation | Private October 16/29 records | Actual deletion HTTP 200 | Monthly cancelled; same-account lifetime preserved | Free after expiry; lifetime active after companion cancellation | PASS: immediate case uses a disclosed lifecycle fixture |
| Failed renewal and recovered payment | Private October 29 clock record | Failure and paid deliveries HTTP 200 | Past due, then active | Pro restored in browser | PASS: actual renewal invoice and recovery |
| Replay / wrong account / delayed delivery | Private October 16/29 records | Actual failure/deletion payloads replayed with local test signatures: HTTP 200 | No duplicate receipt or reversed current state | Foreign claim HTTP 403 | PARTIAL: replay and ownership pass; delayed delivery pending |

Only the founder or developer completing those checks should replace `Not run` with actual evidence. A synthetic `stripe trigger` event alone is not proof of a checkout purchase tied to a Umprompt user.

## Sources

- [Stripe fulfillment](https://docs.stripe.com/checkout/fulfillment)
- [Stripe testing](https://docs.stripe.com/testing)
- [Stripe test-clock API and lifecycle guidance](https://docs.stripe.com/billing/testing/test-clocks/api-advanced-usage)

## Remaining Limits

The existing founder limit counts completed redemptions; it is not an atomic reservation of the final slot across concurrent checkouts. Client-side conversion events can be blocked or missed and must not replace Stripe/database financial reporting. This work does not introduce tax calculation or automatic refund processing. The November 2 release documents purchase terms without changing price amounts.

Monthly access requires an unexpired stored `current_period_end`; lifetime access does not. The October 31 cutover reconciled the one obsolete production test record, and the release audit found no active monthly records with missing/expired dates. Continue monitoring signed renewal delivery: a missed webhook must not be treated as proof that a customer should buy a second subscription. The account page keeps billing management available for existing Stripe customers even when paid access is inactive.

## Fresh pre-ad verification: November 2, 2026 (Arizona)

A fresh disposable-account run used only Umprompt Billing Test and the separate Stripe sandbox. No real-money purchase, live entitlement change, production account creation or customer email was involved. The loopback helper used normal Supabase session verification; it was not deployed.

| Check | Fresh evidence |
| --- | --- |
| Founder Monthly USD 4.99 | Hosted Checkout paid; signed completion and invoice events HTTP 200; one founder-monthly entitlement; authenticated paid access |
| Regular Lifetime USD 99.99 | Hosted Checkout paid; signed completion HTTP 200; one lifetime entitlement; authenticated lifetime access |
| Generic card decline | Actual hosted Checkout displayed the decline; later success used a different documented test card |
| Original-task continuity | A labelled synthetic saved task returned with the exact original idea/output after both cancellation and successful purchase |
| Failed renewal | A Stripe test clock advanced the original checkout subscription; actual USD 4.99 renewal invoice failed; signed failure HTTP 200; past-due state removed paid access |
| Recovery | The same failed invoice was paid with a documented sandbox method; signed invoice-paid HTTP 200; active subscription and paid access returned |
| Out-of-order failure | Actual old failed-event payload replayed with a local test signature; current active state won and access remained paid |
| Scheduled cancellation / expiry | Active access remained before the paid end; advancing the clock beyond it produced a cancelled subscription, signed deletion HTTP 200 and free access |
| Old paid receipt | Cancelled monthly receipt could not reactivate access: HTTP 409 PLAN_INACTIVE |
| Receipt ownership | The other disposable account could not claim a paid Lifetime receipt: HTTP 403 |
| Unpaid receipt | Actual abandoned checkout remained unpaid and returned HTTP 409 PAYMENT_PENDING |
| Duplicate / invalid notifications | Replaying the actual Lifetime completion twice left exactly one entitlement; invalid signature HTTP 400 |
| Account isolation | The separate Lifetime account stayed paid through all monthly lifecycle changes |

The USD 9.99 monthly and USD 34.99 founder-Lifetime variants have the separate October evidence above; together the runs cover all four price variants. Do not relabel those older checks as a new November purchase. Private test identifiers, provider records and screenshots remain outside Git. The fresh cancellation transition was driven through the sandbox API/test clock; the portal cancellation UI was checked in the prior run. Pending 3DS remains a prior-run check, not a fresh completed authentication purchase.

**Still unverified:** intentionally delayed webhook delivery/return-before-webhook race, real email deliverability, portal payment-method replacement and a live-money transaction. Code checks cover fulfillment retries/storage errors, but are not evidence of those external operations. Monitor the first real customer payment rather than fabricating a live conversion.
