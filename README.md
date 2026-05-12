# PromptOS

**Turn rough ideas into execution-ready AI prompts — scored, optimized, and saved.**

PromptOS is a prompt engineering workspace for developers, automation builders, and AI power users. Describe what you want in plain language, pick your target AI tool, and get a structured prompt that actually performs — scored across six quality dimensions, one-click optimized, and saved to your account.

---

## Features

| Feature | What it does |
|---|---|
| **Generate** | Describe your goal in plain English. PromptOS applies tool-specific profiles (Cursor, Claude, ChatGPT) to produce a structured, execution-ready prompt. |
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
4. Go to **Authentication → Providers → Email** and enable **Magic Link**.
5. Go to **Authentication → URL Configuration** and set:
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

---

## Deployment (Vercel)

### Step-by-step

1. Push this repo to GitHub (if you haven't already).
2. Go to [vercel.com](https://vercel.com) → **Add New Project** → import the GitHub repo.
3. Leave the build settings at their defaults (Next.js is auto-detected).
4. In **Environment Variables**, add every variable from the table below — paste all seven before the first deploy.
5. Click **Deploy**. Wait for the build to finish.
6. Copy your Vercel domain (e.g. `https://promptos.vercel.app` or your custom domain).
7. **Update `NEXT_PUBLIC_SITE_URL`** in Vercel env vars to that exact domain. Redeploy for it to take effect.
8. In Supabase → **Authentication → URL Configuration**:
   - Set **Site URL** to your Vercel domain (e.g. `https://promptos.vercel.app`)
   - Under **Redirect URLs**, add: `https://promptos.vercel.app/auth/callback`
   - Keep `http://localhost:3000/auth/callback` in the list for local dev.
9. Test a magic link login on the production URL (see smoke test below).

### Vercel environment variables

Paste these into **Project Settings → Environment Variables**:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon/public key |
| `NEXT_PUBLIC_SITE_URL` | Your Vercel domain, e.g. `https://promptos.vercel.app` |
| `ANTHROPIC_API_KEY` | Your Anthropic API key (server-only — never use `NEXT_PUBLIC_`) |
| `DEFAULT_AI_PROVIDER` | `anthropic` |
| `DEFAULT_AI_MODEL` | `claude-sonnet-4-6` |
| `SCORE_AI_MODEL` | `claude-sonnet-4-6` |

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

## Roadmap

- [ ] Templates library — curated, community-contributed prompts
- [ ] Prompt versioning — compare each optimization iteration
- [ ] Team workspaces — share and collaborate on prompts
- [ ] Additional tool support — Gemini, Perplexity, Windsurf
- [ ] Usage analytics — track which prompts perform best over time

---

## License

MIT
