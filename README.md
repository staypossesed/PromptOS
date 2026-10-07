# Umprompt

Turn rough ideas into clear, ready-to-use AI prompts.

Umprompt helps people describe what they want without learning prompt engineering. Start with a messy idea, add essential details when needed, and copy a structured request into your preferred AI chatbot. The default workflow is organized around the task, not the chatbot vendor.

## Product Experience

- **Idea-first workspace:** the home page opens directly into the composer. Guests can prepare a draft before signing in.
- **Task categories:** Auto, Writing, Coding, Research, Everyday, Business, and Creative guide suggestions and generation.
- **Relevant inspiration:** suggestions respond to the first words of an idea, match the selected category, and support English, Spanish, and Russian. Each sign-in gets a fresh selection; users can also refresh it manually.
- **Focused clarification:** ambiguous ideas can receive up to two follow-up questions. Clear requests proceed directly, and users can skip clarification.
- **Portable prompts:** generation preserves the user's intent and supplied details without requiring a vendor-specific template. Existing tool-specific prompts and prompt packs remain supported.
- **Optional quality review:** scoring and optimization are available without interrupting the main idea-to-prompt workflow. Prompt scores are estimates, not proof of better answers.
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

The analytics wrapper tracks named events without adding prompt or answer text to event properties. Review PostHog project settings, autocapture, and session-recording configuration separately before launch. Account identification includes the signed-in user's ID and email.

Configure both Upstash variables for shared limits across serverless instances. The in-memory fallback is suitable for local development, not reliable enforcement across production instances.

## Development and Verification

| Command | Purpose |
|---|---|
| `npm run dev -- --port 3000` | Start the development server |
| `npm run build` | Compile production output and check types |
| `npm run start` | Serve the production build locally |
| `npm run lint` | Run the configured ESLint checks |
| `npm test` | Run the offline regression suite |
| `npm run eval:outcomes -- --dry-run` | Inspect synthetic evaluation tasks without provider calls |
| `npm run eval:outcomes -- --limit 2` | Run a limited, billable answer-outcome evaluation |
| `node scripts/smoke-generation.cjs` | Run billable clarification and generation smoke checks |

The regression suite covers suggestion relevance and rotation, localization, context validation, portable prompt assembly, safe auth redirects, and refreshed or cleared session cookies on normal responses and redirects.

Provider-backed scripts use synthetic tasks, not saved user prompts, and incur API usage. See [Answer Outcome Evaluation](docs/outcome-evaluation.md) for methodology and limitations. Do not present prompt scores or a small model-judged sample as proof of improved answers.

### Manual Smoke Checks

- Open the public composer, enter an idea, switch categories, and refresh suggestions.
- Sign in with each enabled provider and confirm return to the intended app page.
- Generate from both a clear request and an ambiguous idea; check follow-up answers and the skip path.
- Copy, download, save, and reopen a prompt; verify text and context survive.
- Open optional quality review and test optimization separately.
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
