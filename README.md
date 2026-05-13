# Umprompt

**Turn rough ideas into execution-ready AI prompts — scored, optimized, and saved.**

Umprompt is a prompt engineering workspace for developers, automation builders, and AI power users. Describe what you want in plain language, pick your target AI tool, and get a structured prompt that actually performs — scored across six quality dimensions, one-click optimized, and saved to your account.

---

## Features

| Feature | What it does |
|---|---|
| **Generate** | Describe your goal in plain English. Umprompt applies tool-specific profiles (Cursor, Claude, ChatGPT) to produce a structured, execution-ready prompt. |
| **Score** | Every prompt is scored 0–100 across Clarity, Context, Constraints, Examples, Output Format, and Tool Fit. Each dimension includes one actionable improvement tip. |
| **Optimize** | Click "Optimize weak dimensions" to rewrite the prompt targeting every low-scoring dimension automatically. Confirms improvement with a before → after score. |
| **Save & Reopen** | Prompts are saved to your account with full score data. Reopen any prompt from History to refine and update it. |
| **Context Panel** | Optionally supply project type, audience, constraints, output format, and examples — fed directly into generation and restored when you reopen a saved prompt. |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 |
| Auth & DB | Supabase (magic link auth, Postgres + RLS) |
| AI SDK | Vercel AI SDK v4 |
| AI Models | Anthropic Claude (Sonnet 4.6 default) |
| Fonts | Geist Sans, Geist Mono, Fraunces |
| Animations | Framer Motion |
| Deployment | Vercel (recommended) |

---

## Local Setup

### Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project (free tier is fine)
- An [Anthropic](https://console.anthropic.com) API key

### 1. Clone and install

```bash
git clone <your-repo-url>
cd promptos
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in all values (see table below). The file is gitignored — never commit it.

### 3. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** in your Supabase dashboard.
3. Paste the full contents of `supabase/schema.sql` and click **Run**.
   This creates the `profiles`, `prompts`, and `prompt_generations` tables, RLS policies, indexes, and triggers in one pass. It is safe to re-run.
4. Paste the full contents of `supabase/feedback.sql` and click **Run**.
   This adds the `feedback` table with RLS. It is safe to re-run.
5. Go to **Authentication → Providers → Email** and enable **Magic Link**.
6. Go to **Authentication → URL Configuration** and set:
   - **Site URL**: `http://localhost:3000`
   - **Redirect URLs**: add `http://localhost:3000/auth/callback`

### 4. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in with your email.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | **Yes** | Supabase project URL (safe for browser) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Yes** | Supabase anon/public key (safe for browser) |
| `NEXT_PUBLIC_SITE_URL` | **Yes** | App base URL — used for magic link redirects |
| `ANTHROPIC_API_KEY` | **Yes** | Anthropic API key — **server-only, never expose to browser** |
| `DEFAULT_AI_PROVIDER` | No | `anthropic` or `openrouter` (default: `anthropic`) |
| `DEFAULT_AI_MODEL` | No | Registered model ID (default: `claude-sonnet-4-6`) |
| `SCORE_AI_MODEL` | No | Model used for scoring + optimization (default: `claude-sonnet-4-6`) |
| `OPENROUTER_API_KEY` | No | Required only when `DEFAULT_AI_PROVIDER=openrouter` |

Copy `.env.example` for the full template with comments.

---

## Commands

```bash
npm run dev      # Development server at http://localhost:3000
npm run build    # Production build (also runs type check)
npm run start    # Serve the production build locally
npm run lint     # ESLint
```

---

## Project Structure

```
promptos/
├── app/
│   ├── api/prompts/         # API routes
│   │   ├── route.ts         # GET list / POST create
│   │   ├── [id]/route.ts    # GET / PATCH / DELETE single prompt
│   │   ├── generate/        # POST — streaming AI generation
│   │   ├── score/           # POST — structured quality scoring
│   │   └── optimize/        # POST — AI rewrite targeting weak dimensions
│   ├── builder/             # Prompt builder (create + edit)
│   ├── dashboard/           # Saved prompts grid
│   ├── history/             # Full history with search
│   ├── login/               # Magic link auth
│   ├── privacy/             # Privacy policy
│   ├── terms/               # Terms of service
│   └── page.tsx             # Landing page
├── components/
│   ├── builder/             # IdeaInput, ToolSelector, ContextPanel, PromptOutput, ScorePanel
│   ├── layout/              # AppShell, Sidebar, Topbar, MobileNav
│   ├── marketing/           # Landing page sections
│   └── ui/                  # Base UI (Button, Badge, Card, …)
├── lib/
│   ├── ai/                  # generate-prompt, score-prompt, optimize-prompt, tool-profiles, config, providers
│   └── supabase/            # Browser + server client helpers
├── types/
│   └── prompt.ts            # Core types and validation helpers
└── supabase/
    └── schema.sql           # Full DB schema — paste into Supabase SQL Editor
```

---

## Supported Models

Registered in `lib/ai/providers.ts`. Override via env vars:

| Model ID | Provider | Notes |
|---|---|---|
| `claude-sonnet-4-6` | Anthropic | Default — best quality/cost balance |
| `claude-opus-4-7` | Anthropic | Highest quality, higher cost |
| `claude-haiku-4-5` | Anthropic | Fastest, lowest cost |
| `moonshotai/kimi-k2.6` | OpenRouter | Requires `OPENROUTER_API_KEY` |

To add a new model: add an entry to `MODEL_REGISTRY` in `lib/ai/providers.ts`.

---

## Model Lab

`/model-lab` is an internal testing tool for comparing model outputs side by side. It is auth-protected and not linked from public pages.

### Purpose

Compare Claude and cheaper alternatives (Kimi K2.6 via OpenRouter) on the same idea and tool, with scoring and latency. Used to evaluate whether a cheaper model can replace Claude for production traffic without degrading output quality.

**⚠️ Do not set Kimi as the default model until you have run enough comparisons to be confident in quality parity.**

### Setup

1. Get an [OpenRouter](https://openrouter.ai/keys) API key.
2. Add to `.env.local` (and Vercel env vars):

```
OPENROUTER_API_KEY=sk-or-v1-...
KIMI_MODEL=moonshotai/kimi-k2.6
```

3. Navigate to `/model-lab` while signed in.

### How it works

- Select 1–4 models to compare (Sonnet, Haiku, Kimi).
- Enter an idea and target tool.
- Click "Generate comparison" — all models run in parallel.
- Each result shows: generated prompt, quality score (0–100), latency (ms), estimated cost (USD).
- Click "Use this" on any result to carry it into the Builder.

### Rate limit

10 comparisons per user per day (independent of the normal generate limit).

### Cost estimates

| Model | Input | Output |
|---|---|---|
| Claude Sonnet 4.6 | $3 / MTok | $15 / MTok |
| Claude Haiku 4.5 | $1 / MTok | $5 / MTok |
| Kimi K2.6 | $0.74 / MTok | $3.49 / MTok |

---

## API Routes

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/api/prompts` | GET | Required | List the signed-in user's prompts |
| `/api/prompts` | POST | Required | Save a new prompt |
| `/api/prompts/[id]` | GET | Required | Fetch a single prompt |
| `/api/prompts/[id]` | PATCH | Required | Update title, prompt, score, or context |
| `/api/prompts/[id]` | DELETE | Required | Delete a prompt |
| `/api/prompts/generate` | POST | Required | Stream an AI-generated prompt (text/plain) |
| `/api/prompts/score` | POST | Required | Score a prompt across 6 dimensions |
| `/api/prompts/optimize` | POST | Required | Rewrite prompt targeting weak dimensions |
| `/api/model-lab/compare` | POST | Required | Compare N models on the same idea (10/day limit) |

---

## Deployment (Vercel)

### Step-by-step

1. Push this repo to GitHub (if you haven't already).
2. Go to [vercel.com](https://vercel.com) → **Add New Project** → import the GitHub repo.
3. Leave the build settings at their defaults (Next.js is auto-detected).
4. In **Environment Variables**, add every variable from the table below — paste all seven before the first deploy.
5. Click **Deploy**. Wait for the build to finish.
6. Copy your Vercel domain (e.g. `https://umprompt.vercel.app` or your custom domain).
7. **Update `NEXT_PUBLIC_SITE_URL`** in Vercel env vars to that exact domain. Redeploy for it to take effect.
8. In Supabase → **Authentication → URL Configuration**:
   - Set **Site URL** to your Vercel domain (e.g. `https://umprompt.vercel.app`)
   - Under **Redirect URLs**, add: `https://umprompt.vercel.app/auth/callback`
   - Keep `http://localhost:3000/auth/callback` in the list for local dev.
9. Test a magic link login on the production URL (see smoke test below).

### Vercel environment variables

Paste these into **Project Settings → Environment Variables**:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon/public key |
| `NEXT_PUBLIC_SITE_URL` | Your Vercel domain, e.g. `https://umprompt.vercel.app` |
| `ANTHROPIC_API_KEY` | Your Anthropic API key (server-only — never use `NEXT_PUBLIC_`) |
| `DEFAULT_AI_PROVIDER` | `anthropic` |
| `DEFAULT_AI_MODEL` | `claude-sonnet-4-6` |
| `SCORE_AI_MODEL` | `claude-sonnet-4-6` |
| `OPENROUTER_API_KEY` | OpenRouter key for Kimi (optional — only needed for Model Lab) |
| `KIMI_MODEL` | `moonshotai/kimi-k2.6` (informational — actual ID is hardcoded in registry) |

> **Important:** `ANTHROPIC_API_KEY` must NOT have the `NEXT_PUBLIC_` prefix — it is server-only and must never be exposed to the browser.

### Supabase URL Configuration (after first deploy)

Go to **Supabase → Authentication → URL Configuration** and set:

| Field | Value |
|---|---|
| **Site URL** | `https://<your-vercel-domain>` |
| **Redirect URLs** | `https://<your-vercel-domain>/auth/callback` |

Keep `http://localhost:3000/auth/callback` in Redirect URLs for local development.

---

## Production Smoke Test

After deploying, verify each item manually:

- [ ] Landing page loads at the root URL
- [ ] "Start building free" CTA links to `/builder`
- [ ] `/login` loads; entering email sends a magic link
- [ ] Clicking the magic link in email redirects to `/dashboard`
- [ ] `/builder` opens; idea input is focusable
- [ ] Generate prompt → prompt streams in
- [ ] Score panel shows after generation
- [ ] Optimize weak dimensions → improved prompt appears with toast
- [ ] Save prompt → "Saved" badge appears
- [ ] `/history` shows the saved prompt
- [ ] Clicking a history item reopens it in `/builder`
- [ ] `/settings` loads and shows the signed-in email
- [ ] `/privacy`, `/terms`, `/help` all load without auth
- [ ] Visiting `/dashboard` while signed out redirects to `/login`
- [ ] No `console.error` in browser DevTools during the above flows

---

## Production Hardening

### Analytics (PostHog)

Umprompt uses [PostHog](https://posthog.com) for client-side event tracking. All calls are silent noops if `NEXT_PUBLIC_POSTHOG_KEY` is not set — the app works without analytics.

**Setup:**
1. Create a free project at [posthog.com](https://posthog.com)
2. Copy the **Project API Key** (starts with `phc_`)
3. Add to Vercel env vars: `NEXT_PUBLIC_POSTHOG_KEY=phc_...`
4. Optionally add `NEXT_PUBLIC_POSTHOG_HOST` (default: `https://us.i.posthog.com`)

**Events tracked** (safe metadata only — no prompt content, no API keys):

| Event | Trigger | Properties |
|---|---|---|
| `landing_view` | Landing page load | — |
| `signup_started` | Magic link form submitted | — |
| `builder_opened` | Builder page mount | — |
| `prompt_generated` | Generation stream completes | `target_tool` |
| `prompt_scored` | Score API returns | `target_tool`, `score_overall` |
| `prompt_optimized` | Optimization completes | `target_tool`, `score_overall` |
| `prompt_saved` | Save/update succeeds | `target_tool`, `action_type` |
| `prompt_reopened` | Existing prompt loaded in builder | `target_tool` |
| `prompt_copied` | Copy button clicked | `target_tool` |
| `prompt_downloaded` | Download button clicked | `target_tool` |
| `history_opened` | History page mount | — |
| `settings_opened` | Settings page mount | — |
| `feedback_submitted` | Feedback modal submitted | — |

**Launch funnel** (track conversion through these events in PostHog):

```
landing_view → signup_started → builder_opened → prompt_generated → prompt_scored → prompt_optimized → prompt_saved
```

Use PostHog **Funnels** to identify where users drop off. The critical step is `landing_view → signup_started` (top-of-funnel conversion) and `prompt_generated → prompt_saved` (activation).

**PostHog configuration note:** Autocapture is disabled by default (`capture_pageview: false`). This keeps the event stream clean and ensures only meaningful, named events appear in your dashboard. Do not enable autocapture — it creates high-volume noise that drowns out the custom events above.

---

### Rate Limiting

Default: **in-memory per-process**. Works locally and in single-instance deployments, but resets on cold starts and is **not reliable** across concurrent serverless invocations.

**Production (required for correctness): Upstash Redis** — persistent sliding-window limits that work across all Vercel function instances.

> **Without `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` set, rate limits will not hold under concurrent load.** Add both before going public.

**Free-tier limits (per user per day):**

| Endpoint | Limit |
|---|---|
| `/api/prompts/generate` | 20 |
| `/api/prompts/score` | 50 |
| `/api/prompts/optimize` | 10 |

**Setup:**
1. Create a free Redis database at [upstash.com](https://upstash.com)
2. Copy **REST URL** and **REST Token** from the database dashboard
3. Add **both** to Vercel env vars:
   ```
   UPSTASH_REDIS_REST_URL=https://...upstash.io
   UPSTASH_REDIS_REST_TOKEN=...
   ```

**Testing rate limits locally:**
```bash
# Trigger in-memory limiter (generate limit is 20/day):
for i in $(seq 1 21); do
  curl -X POST http://localhost:3000/api/prompts/generate \
    -H "Content-Type: application/json" \
    -d '{"idea":"test","target_tool":"claude"}' \
    -b "your-session-cookie"
done
# The 21st request returns HTTP 429 with a user-friendly error message.
```

---

### New env vars for production hardening

Add these to Vercel **Project Settings → Environment Variables**:

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_POSTHOG_KEY` | Optional | PostHog project API key — enables analytics |
| `NEXT_PUBLIC_POSTHOG_HOST` | Optional | PostHog ingest host (default: `https://us.i.posthog.com`) |
| `UPSTASH_REDIS_REST_URL` | Optional | Upstash Redis URL — enables persistent rate limiting |
| `UPSTASH_REDIS_REST_TOKEN` | Optional | Upstash Redis token |

---

## Launch Checklist

### Where to share

| Channel | Notes |
|---|---|
| Twitter / X | Post a short demo GIF or screenshot of the before/after score. Tag with `#buildinpublic`, `#cursor`, `#claude`. |
| Indie Hackers | Post in "Show IH" — emphasize the score + optimize loop, not just generation. |
| Reddit: r/ChatGPT, r/ClaudeAI | Show a concrete before/after example with real output. No self-promo tone. |
| Reddit: r/webdev, r/nextjs | Frame as a dev tool — Cursor use case performs well here. |
| Hacker News: Show HN | Submit as "Show HN: Umprompt — Score and optimize AI prompts before you run them". Keep it factual. |
| Product Hunt | Schedule a launch day. Add a demo GIF and 5 screenshots minimum. |
| Discord servers (Cursor, Claude, AI builders) | Share as a tool tip in context, not a cold promo link. |

### Pre-launch demo checklist

- [ ] Visit `/demo` — all 5 steps render correctly, before/after scores show
- [ ] Landing page loads at root — hero CTA reads "Try Umprompt free"
- [ ] `/builder` opens without auth redirect
- [ ] Generate → score → optimize → save flow completes end-to-end
- [ ] History shows saved prompt; clicking reopens in builder
- [ ] Feedback button appears in sidebar; modal opens and saves to Supabase
- [ ] PostHog Live Events shows events firing during the above flow
- [ ] `/privacy`, `/terms`, `/help`, `/demo` all load without auth
- [ ] Mobile layout works on 390px viewport
- [ ] No `console.error` during any of the above

### First-user feedback checklist

After your first 10 users, check these in PostHog and Supabase:

| Signal | What to look for |
|---|---|
| `landing_view → signup_started` funnel | Conversion rate. If < 10%, the hero or CTA needs work. |
| `builder_opened → prompt_generated` | Drop here = friction in the idea input or tool selection. |
| `prompt_generated → prompt_saved` | This is activation. Target > 50% for retained users. |
| `prompt_optimized` rate | Low = users don't see weak scores or don't understand optimize. |
| Supabase `feedback` table | Read every row. Tag them: bug / UX friction / missing feature. |
| `feedback_submitted` event count | Low count = users can't find the feedback button or don't trust it. |

### PostHog events to watch on launch day

1. `landing_view` — confirms the page is getting traffic
2. `signup_started` — measures CTA effectiveness
3. `builder_opened` — measures auth conversion
4. `prompt_generated` — first value moment
5. `prompt_scored` — confirms AI pipeline is running
6. `prompt_saved` — activation metric
7. `feedback_submitted` — qualitative signal channel

---

## Roadmap

- [ ] Templates library — curated, community-contributed prompts
- [ ] Prompt versioning — compare each optimization iteration
- [ ] Team workspaces — share and collaborate on prompts
- [ ] Additional tool support — Gemini, Perplexity, Windsurf
- [ ] Usage analytics — track which prompts perform best over time

---

## License

MIT
