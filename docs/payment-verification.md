# Payment Verification

## Current Evidence

Automated route/helper checks use synthetic Stripe/Supabase responses. Browser checks exercise the actual desktop and mobile components with mocked billing APIs and an intercepted hosted-checkout page. These checks establish application behavior, not a successful Stripe transaction.

An actual test-mode purchase remains required before claiming end-to-end payment verification. No live charge or production billing changes have been made for these checks.

## Isolated Setup

Use a separate Stripe sandbox/test configuration and Supabase test project. Do not connect test payments to the production customer database or overwrite the regular local environment.

### Where to Find the Settings

1. In Stripe, use the account picker to create/select a sandbox. Open **API keys** for that sandbox and obtain a server-side test key, never a live key. Umprompt's current setup accepts a test secret key (`sk_test_...`); keep it local and server-only. [Stripe keys](https://docs.stripe.com/keys)
2. In the same sandbox, open the product catalogue and create/select the four prices listed below. Each price has a `price_...` identifier; use the price ID, not the `prod_...` product ID. [Stripe prices](https://docs.stripe.com/products-prices/manage-prices)
3. For a deployed test endpoint, open its webhook destination and obtain its separate signing secret (`whsec_...`). For local testing, the Stripe CLI prints the signing secret when forwarding test events; we'll configure that together. [Stripe webhooks](https://docs.stripe.com/webhooks)
4. In a separate Supabase test project, the **Connect** dialog provides the project URL/public key, and **Settings > API Keys** provides the server secret. Umprompt currently uses the environment names `NEXT_PUBLIC_SUPABASE_ANON_KEY` for the public key and `SUPABASE_SERVICE_ROLE_KEY` for the server key. New publishable/secret keys can be supplied under those existing names; never put the server key in a public variable. [Supabase keys](https://supabase.com/docs/guides/getting-started/api-keys)
5. Put these values in the ignored test configuration file, then tell the developer only its absolute path. We'll handle the isolated local server, test login, and signed event forwarding together. Do not change production Vercel settings.

Store secrets in an ignored local file (for example `.env.billing-test.local`) or outside the repository. Share only its path with the developer. Required fields:

```dotenv
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

Forward signed Stripe test events to `/api/stripe/webhook` on the isolated server. Subscribe to checkout completion, asynchronous payment success, subscription updates/deletion, and failed invoices. Use the signing secret belonging to that test destination, not a live endpoint secret.

## Required Checks

1. Generate or use a synthetic prompt, copy/save it, then follow the low-usage upgrade offer. Verify return continuity and the amount shown in Stripe.
2. Finish a monthly purchase with a Stripe test card. Confirm Stripe payment status, a successful signed webhook response, the database entitlement, and paid access after reload. Repeat for the one-time lifetime offer.
3. Cancel checkout. Confirm no new paid entitlement and restoration of the original prompt.
4. Use a declined test card and a 3DS test case. Ensure a failed or incomplete payment does not grant access.
5. Replay webhook delivery. Confirm one entitlement per checkout session and no duplicate redemption.
6. Delay webhook delivery and use the authenticated return path. Confirm the right account activates; a different account cannot claim the session.
7. Retry an unpaid session and an old session whose subscription is now cancelled. Confirm neither restores paid access.
8. Simulate unavailable configuration, a mismatched price, expired founder availability, and a billing storage failure. Confirm honest recovery and no unexpected higher-price checkout.
9. Confirm a paid user cannot start another upgrade checkout. Check the customer portal separately for changes to an existing plan.

Record the Stripe test session/event IDs, test environment, verified entitlement, and outcome privately. Do not include keys, card details, customer email, or prompt text in public logs.

## Sources

- [Stripe fulfillment](https://docs.stripe.com/checkout/fulfillment)
- [Stripe testing](https://docs.stripe.com/testing)

## Remaining Limits

The existing founder limit counts completed redemptions; it is not an atomic reservation of the final slot across concurrent checkouts. Client-side conversion events can be blocked or missed and must not replace Stripe/database financial reporting. This work does not introduce tax calculation, refund processing, or new pricing terms.
