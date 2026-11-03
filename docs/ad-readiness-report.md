# Umprompt: readiness before paid acquisition

Prepared November 2, 2026 (America/Phoenix). This records implemented changes and observed evidence, not a promise of conversion or error-free operation.

## 1. Pricing and purchase conditions

One shared policy now drives the public purchase disclosures and Terms in English, Russian and Spanish. Seller: Umprompt Co, Scottsdale, Arizona, USA. Support: umpromptsupport@gmail.com. Regular prices stay USD 9.99/month and USD 99.99 Lifetime; the eligible founder offer remains USD 4.99/month or USD 34.99 Lifetime for the first 100 completed qualifying purchases with UMPROMPT. No price IDs or production secrets were changed by this release.

Free is seven completed generations in a rolling seven-day window; paid is 200 per server day with separate action rate limits. History is available to free accounts. Quality-feedback optimization has its own ten-per-day limit. The page explains recurring vs one-time billing, period-end cancellation, applicable tax review, refund requests and mandatory consumer rights. Removed the unsupported Lifetime “Best value” recommendation. The same constants are used by billing logic.

## 2. Actual payment journey

Two new hosted Stripe sandbox purchases completed: Founder Monthly USD 4.99 and regular Lifetime USD 99.99. Signed notifications, billing storage and authenticated paid access were verified. The exact saved task survived checkout cancellation and success. Actual failed renewal, recovery, scheduled cancellation/expiry, old receipts, ownership, duplicate delivery and invalid signatures passed in the isolated environment. See [payment verification](payment-verification.md) for the scenario table and explicit remaining gaps. No real charge was made.

## 3. Clear first use and useful results

The main message says what Umprompt helps with, and Continue explains that the next step is a few relevant questions. The choice between AI instructions and a direct first answer remains explicit. Three full demonstrations show idea → useful details → instructions → possible answer, with illustrative labels. They remain available before a task starts; they do not replace a live result. Direct-answer users can report usefulness without copying. The logo starts a fresh homepage task, with a confirmation before discarding an unsaved result and a document reset to avoid stale draft state.

## 4. Reliability and boundaries

Fixed authenticated generation accounting: a pending, failed, empty or aborted stream does not immediately consume the completed-generation allowance. Normal completed output still counts. Offline checks exercise auth, guest limits, task editing, clarification, quality improvements, safe context, owner access and billing fulfillment. Fresh sandbox checks exercise real provider states. This is not an assertion that every failure mode is covered; quota concurrency, provider outages and production delivery still require monitoring.

## 5. One guest-first funnel

Added task-start measurement and a guest-first aggregate report. Signup can follow the free result. Instructions require an exact-version copy before usefulness counts; direct answers can be useful without a clipboard action. A refined answer is not another new task. A later-day task is a retention metric, not a prerequisite for purchasing. Purchases count only verified live receipts, deduplicated by stable key. Staff/test actors can be excluded from a reviewed cohort. No emails, prompts, answers, profile content or card data are added to analytics.

PostHog project 421262 was accessible. Its visible event schema contained visits, generation, copying, login and checkout-start events. At inspection, confirmed usefulness, signup-completed and verified-purchase events were absent. This does not establish a broken SDK or a zero conversion rate; qualifying actions and ingestion must be checked. No remote dashboard was created. The code/report is ready; a complete production funnel is **not yet certified**. See [measurement](funnel-measurement.md).

## 6. Trust and paid value

Added a named founder note explaining why the product exists, operator/support details, clear product limitations and full examples. Free history is no longer presented as an exclusive reason to pay. Paid value is more generation capacity. Demonstrations are labelled; no customer reviews, success rates, usage counts or investor claims were fabricated. Authentic testimonials and observed outcomes still need real customers.

Lifetime economics remain a commercial risk: no gross-margin or customer-lifetime-value claim is supported by current data. Before scaling ads, compare actual AI cost per paid user and retained monthly revenue against acquisition cost. Do not treat a one-time Lifetime payment as ARR.

## 7. First campaign destination and help

Added /write-a-message as a focused page for everyday adults who need help writing a clear message. It uses the normal guided flow, a relevant example and a controlled analytics source rather than collecting arbitrary campaign text. Added /examples; /help now works without sign-in and accurately explains the current flow. New help, demonstrations and purchase disclosures have authored EN/RU/ES versions. This does not certify native-speaker review of every legacy page. No paid campaign was launched.

## Verification and release gates

- 170 automated checks passed; TypeScript passed. Production build recorded separately in the release result.
- Mobile 390px checks showed no horizontal overflow on the campaign and help pages. Russian Terms and Spanish Help were inspected.
- A full PostHog production sequence, real email delivery and first real customer payment still require observation. Remote analytics must not be substituted for the Stripe ledger.
- Delayed-webhook race and portal payment-method replacement remain explicit external test gaps.
- Human usability sessions and authentic customer evidence cannot be produced by automated tests.

The release improves clarity, policy consistency and payment evidence. It supports a measured pilot after the remaining launch gates are checked; it does not justify scaling acquisition solely because the build passes.
