# Umprompt

Turn rough ideas into clear, ready-to-use AI prompts.

Umprompt helps people describe what they want without learning prompt engineering. Start with a messy idea, add essential details when needed, and copy a structured request into your preferred AI assistant. The default workflow is organized around the task, not the AI provider.

## Product Experience

- **Private library:** create and edit context profiles and reusable playbooks. Requires `supabase/workspace.sql`; there is no silent device-only fallback.
- **Explicit profile sharing:** saving a profile is separate from applying it. Applying requires a preview/confirmation explaining Anthropic/OpenRouter sharing. Only the confirmed snapshot is included; playbooks do not embed profiles and analytics events exclude library content.
- **Interactive results:** refine a prompt, preview/restore up to five previous versions, and prepare relevant next tasks without starting an automatic generation. Save the prompt to persist its version history.
- **Value-based upgrades:** the builder offers an upgrade after a copy/save when two or fewer free generations remain. Refinements use the existing generation allowance; subscriptions and lifetime entitlements are unchanged.
- **Continuous checkout:** return to the same task after upgrading or cancelling. Paid access is confirmed from Stripe's current payment/subscription state; the return screen does not assume a successful charge. See [payment verification](docs/payment-verification.md) for the outstanding isolated Stripe test purchase.
- **Content-safe measurement:** explicit PostHog events cover refinements, library use, next tasks, copies, feedback, and upgrades. Autocapture and session recording are disabled to keep profile/prompt content out of analytics.

- **Idea-first workspace:** the home page opens directly into the composer. Guests can prepare a draft before signing in.
- **Visible expansion example:** a rough idea and its structured prompt appear together before generation. The signed-in builder retains a separate Example tab after generation; viewing it never replaces the current task or result.
- **Task categories:** Auto, Writing, Coding, Research, Everyday, Business, and Creative guide suggestions and generation.
- **Relevant inspiration:** suggestions respond to the first words of an idea, match the selected category, and support English, Spanish, and Russian. Each sign-in gets a fresh selection; users can also refresh it manually.
- **Focused clarification:** ambiguous ideas can receive up to two follow-up questions. Clear requests proceed directly, and users can skip clarification.
- **Portable prompts:** generation preserves the user's intent and supplied details without requiring a vendor-specific template. Existing tool-specific prompts and prompt packs remain supported.
- **Clear result actions:** Optimize prompt is available beside Regenerate without opening quality review. Simplify requests plain language while preserving essential facts and constraints. Failed optimization keeps the original result; successful changes retain a restorable previous version.
- **Optional quality review:** scoring remains available without interrupting the main idea-to-prompt workflow. Prompt scores are estimates, not proof of better answers.
- **Saved workspace:** save, reopen, refine, copy, and download prompts; browse history and templates.
- **Consistent design:** a neutral interface with emerald accents across the workspace, authentication, and pricing pages.
- **Accessible motion:** staggered suggestions, sliding category selection, expanding panels, generation feedback, and copy/save confirmations respect reduced-motion preferences.
- **Account and billing:** Google, GitHub, and email-link sign-in; monthly and lifetime plans through Stripe.

## Architecture

| Layer | Implementation |
|---|---|
| Application | Next.js 15 App Router, React 18, TypeScript |
| Interface | Tailwind CSS 3, Radix UI, Lucide icons |
| Motion | Framer Motion and CSS animations |
| Authentication and data | Supabase Auth, PostgreSQL, row-level security |
| AI | Vercel AI SDK 4 with Anthropic and OpenRouter providers |
| Billing | Stripe Checkout, Customer Portal, and webhooks |
| Rate limiting | Upstash Redis, with an in-memory development fallback |
| Analytics | Optional PostHog integration |
| Hosting | Vercel |

## Getting Started

### Requirements

- Node.js 22+ and npm.
- A Supabase project with its URL and public key.
- Credentials for the configured AI provider.
- Stripe test-mode configuration only if testing payments locally.

### Install

```bash
git clone https://github.com/staypossesed/PromptOS.git
cd PromptOS
npm ci
```

Create the local environment file only if it does not already exist:

```powershell
if (-not (Test-Path .env.local)) {
    Copy-Item .env.example .env.local
}
```

On macOS or Linux, use `cp -n .env.example .env.local`. Populate the required values described below. Never commit local environment files or secret keys.

### Database Setup

For a new Supabase project, run the SQL files in the Supabase SQL editor in this order:

1. `supabase/schema.sql`: profiles, prompts, generation records, triggers, and access policies.
2. `supabase/feedback.sql`: user feedback.
3. `supabase/prompt-packs.sql`: saved prompt packs and context.
4. `supabase/model-comparisons.sql`: model comparison results.
5. `supabase/billing.sql`: customers, subscriptions, promo redemptions, and usage tracking.
6. `supabase/generation-runs.sql`: generation diagnostics.
7. `supabase/admin-audit-logs.sql`: audit records for administrative actions.
8. `supabase/workspace.sql`: private context profiles and reusable playbooks.

Review migrations before applying them to an existing database. Keep row-level security enabled. The service-role key is server-only and is required for administrative and billing synchronization operations.

### Authentication Setup

Enable the desired Google, GitHub, and email providers in Supabase. Configure Google and GitHub provider credentials in the Supabase dashboard.

Under **Authentication > URL Configuration**, add these app callback URLs:

| Environment | App callback |
|---|---|
| Local | `http://localhost:3000/auth/callback` |
| Production | `https://www.umprompt.com/auth/callback` or the exact deployed app origin |
| Preview | The approved preview origin followed by `/auth/callback` |

Keep the production Site URL pointed at the production app. Add local and preview origins to the redirect allowlist rather than replacing the production Site URL. OAuth provider dashboards use the Supabase provider callback; the URLs above are the final app destinations.

The app uses the bare `/auth/callback` URL for OAuth and email links. A short-lived cookie stores the validated destination inside the app. External destinations are rejected.

Use port **3000** locally. A different port needs its own callback allowlist entry. An unapproved callback can send users to the production Site URL instead.

### Run Locally

```bash
npm run dev -- --port 3000
```

Open [localhost:3000](http://localhost:3000). The home page is public; generation, saved prompts, and account pages require sign-in.

Development uses `.next-dev`; production builds use `.next`. Separate build directories prevent production builds from replacing the running development server's files. Both directories are excluded from source control, and `.vercelignore` also excludes the custom development cache from uploads.

## Environment Configuration

Local `.env.local` values and Vercel environment variables are independent. A working production checkout does not configure payments on localhost.

### Application and AI

| Variable | Requirement | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Required | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Required | Supabase public key; access is governed by row-level security |
| `NEXT_PUBLIC_SITE_URL` | Required | App origin used by billing return URLs and provider metadata |
| `SUPABASE_SERVICE_ROLE_KEY` | Server operations | Billing synchronization, usage recording, and administration |
| `ANTHROPIC_API_KEY` | Anthropic requests | Server-only Anthropic credential |
| `OPENROUTER_API_KEY` | OpenRouter requests | Server-only OpenRouter credential |
| `DEFAULT_AI_PROVIDER` | Optional | `anthropic` or `openrouter`; model registry determines the matching provider |
| `DEFAULT_AI_MODEL` | Optional | Registered generation model; defaults to `claude-sonnet-4-6` |
| `SCORE_AI_MODEL` | Optional | Registered scoring and optimization model; defaults to `claude-sonnet-4-6` |
| `ADMIN_EMAILS` | Administration | Comma-separated allowlist for `/admin` and `/model-lab` |

Registered models are defined in `lib/ai/providers.ts`: `claude-sonnet-4-6`, `claude-opus-4-7`, `claude-haiku-4-5`, and `moonshotai/kimi-k2.6`. Availability depends on provider access. Keep generation, scoring, and evaluation provider credentials aligned with the selected models.

### Payments

| Variable | Purpose |
|---|---|
| `STRIPE_SECRET_KEY` | Server-side Stripe access |
| `STRIPE_WEBHOOK_SECRET` | Signature verification for the configured webhook endpoint |
| `STRIPE_PRICE_PRO_MONTHLY` | Standard recurring monthly price |
| `STRIPE_PRICE_FOUNDER_MONTHLY` | Founder recurring monthly price |
| `STRIPE_PRICE_LIFETIME` | Standard one-time lifetime price |
| `STRIPE_PRICE_FOUNDER_LIFETIME` | Founder one-time lifetime price |

Use test-mode credentials and matching test-mode price IDs for development. Preview deployments are not automatically payment sandboxes: inspect their environment configuration before testing checkout. Never copy live payment settings into a test environment by default.

The `UMPROMPT` promo code selects founder prices when the founder limit has not been reached. Monthly prices must be recurring; lifetime prices must be one-time. The selected price ID is required before a checkout session can be created.

The webhook route is `/api/stripe/webhook`. Its handler supports `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, and `invoice.payment_failed`. Configure the endpoint secret for the environment receiving those events.

`NEXT_PUBLIC_SITE_URL` controls checkout success, cancellation, and portal return destinations. Verify it for each environment. Restart the local server after changing environment values; redeploy after changing Vercel values.

### Optional Integrations

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_POSTHOG_KEY` | Enables client-side analytics |
| `NEXT_PUBLIC_POSTHOG_HOST` | PostHog host; defaults to `https://us.i.posthog.com` |
| `UPSTASH_REDIS_REST_URL` | Redis REST endpoint for shared rate limiting |
| `UPSTASH_REDIS_REST_TOKEN` | Redis REST credential |

The analytics wrapper tracks named events without adding prompt, profile, or answer text to event properties. Autocapture and session recording are disabled in the client configuration; review privacy implications before enabling either. Account identification includes the signed-in user's ID and email.

Configure both Upstash variables for shared limits across serverless instances. The in-memory fallback is suitable for local development, not reliable enforcement across production instances.

## Development and Verification

| Command | Purpose |
|---|---|
| `npm run dev -- --port 3000` | Start the development server |
| `npm run build` | Compile production output and check types |
| `npm run start` | Serve the production build locally |
| `npm run lint` | Run the configured ESLint checks |
| `npm test` | Run the offline regression suite |
| `node scripts/check-start-ui.cjs` | Check the public composer at desktop/mobile sizes in English, Spanish, and Russian |
| `node scripts/check-workspace-ui.cjs` | Test desktop/mobile interactions against a running local dev server with synthetic API responses |
| `npm run eval:outcomes -- --dry-run` | Inspect synthetic evaluation tasks without provider calls |
| `npm run eval:outcomes -- --limit 2` | Run a limited, billable answer-outcome evaluation |
| `node scripts/smoke-generation.cjs` | Run billable clarification and generation smoke checks |

The regression suite covers suggestion relevance and rotation, localization, context validation, portable prompt assembly, safe auth redirects, refreshed or cleared session cookies, library ownership filters, profile consent, refinements, history, and contextual upgrade eligibility.

The browser-check script creates temporary fixture routes and removes them when it finishes. It uses an isolated browser with mocked API responses: no signed-in user data, provider calls, or payments. Set `UI_SCREENSHOT_DIR` to retain desktop/mobile screenshots. Do not deploy while that test is running.

Provider-backed scripts use synthetic tasks, not saved user prompts, and incur API usage. See [Answer Outcome Evaluation](docs/outcome-evaluation.md) for methodology and limitations. Do not present prompt scores or a small model-judged sample as proof of improved answers.

### Manual Smoke Checks

- Open the public composer, enter an idea, switch categories, and refresh suggestions.
- Sign in with each enabled provider and confirm return to the intended app page.
- Generate from both a clear request and an ambiguous idea; check follow-up answers and the skip path.
- Copy, download, save, and reopen a prompt; verify text and context survive.
- Create/edit/delete a profile; cancel and confirm its preview before generation.
- Save a playbook, reuse it with new task details, and confirm it does not apply a profile automatically.
- Refine a result, restore an earlier version, save/reopen its history, and check failed-request recovery.
- Optimize from the result footer, including after restoring a version without a score; check failure recovery and previous versions.
- Switch between Your prompt and Example after generation; verify the current task, prompt, and clipboard actions stay separate from the example.
- Open optional quality review and test scoring retries separately.
- Check pricing, account, feedback, history, and templates on desktop and a narrow mobile viewport.
- Check keyboard navigation and reduced-motion behavior.
- In a payment sandbox, verify checkout, success synchronization, webhook updates, and portal return URLs.

## Deployment

The application is deployed with Vercel. The existing linked project is named `prompt-os`; its public product name is Umprompt.

```bash
vercel login
vercel env ls
vercel deploy --yes
```

The last command creates a **preview**, not a production deployment. Check environment scopes, callback allowlists, return URLs, and payment mode before testing integrations.

After reviewing the preview, production can be deployed explicitly:

```bash
vercel deploy --prod
```

Run that command only when a production release is intended. If the Git integration is enabled, pushing to Vercel's configured production branch can also trigger a production deployment. Use a feature branch for preview-only review.

Vercel-protected previews may require a Vercel account to view. Do not disable deployment protection or expose secrets simply to share a preview.

## Project Layout

```text
app/                    Pages, API routes, and auth callback
components/builder/     Composer, output, prompt packs, and quality review
components/auth/        Sign-in form
components/billing/     Upgrade flow
components/layout/      Workspace navigation and account controls
components/providers/   Motion and analytics providers
components/ui/          Shared controls, disclosures, and action feedback
hooks/                  Session-aware idea suggestions
lib/ai/                 Clarification, generation, scoring, and model registry
lib/i18n/               Interface localization
lib/supabase/           Browser, server, and middleware auth clients
lib/                    Suggestions, context validation, billing, and analytics
supabase/               Database setup scripts and access policies
scripts/                Synthetic smoke checks and outcome evaluation
tests/                  Offline regression tests
docs/                   Evaluation methodology
public/                 Static product assets
```

## Troubleshooting

### Invalid Refresh Token

An expired, revoked, or unrecognized saved session cannot be recovered as an authenticated session. Refresh the page and sign in again. Middleware propagates refreshed or cleared cookies to both normal responses and redirects; it must not return an older response object after authentication runs.

### Checkout Is Not Configured

The checkout route returns `MISSING_CONFIG` when the selected plan's price ID is absent. Check the corresponding `STRIPE_PRICE_*` variable, the Stripe key, payment mode, and the environment scope. Production values are not loaded into local development automatically.

### Sign-In Returns to Production

Confirm that the exact current origin plus `/auth/callback` is allowed in Supabase. For localhost, use port 3000. For a preview, approve its callback without changing the production Site URL.

### Animations Are Not Visible

Reload the updated app and interact with the relevant controls. Suggestions animate on entry and refresh; confirmations animate after successful actions. Reduced-motion preferences intentionally disable movement and CSS animations.

### Search Results Still Show the Old Icon

The emerald brand asset is shared by the app logo, a 192px app icon, a multi-size favicon, and a 180px Apple touch icon. Deploy the updated files to production first. Search engines cache icons and update them after recrawling; a local or protected preview cannot update the live site's search result. For Google, request indexing of the production home page in Search Console and allow time for processing. See [Google's favicon guidelines](https://developers.google.com/search/docs/appearance/favicon-in-search).
