# PromptOS

> Describe what you want. PromptOS turns it into an execution-ready prompt for the exact AI tool you use.

## What's built

- **Auth** — Supabase email/password auth with protected routes via middleware
- **Prompt builder** — Idea input → tool selector → context panel → AI generation (streaming) → quality scoring → save/update/delete
- **Context panel** — Optional fields (project type, audience, constraints, output format, examples) injected into generation
- **Scoring** — 6-dimension quality score (clarity, context, constraints, examples, output format, tool fit) via a second LLM call
- **History** — Saved prompt list with search, sorted by last updated
- **Settings** — Account info and sign-out
- **Help** — Usage guide

## Stack

- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS
- Supabase (auth + Postgres)
- Anthropic Claude / OpenRouter (via Vercel AI SDK)
- shadcn/ui, Framer Motion, lucide-react

## Getting started

```bash
npm install
npm run dev
```

Copy `.env.local.example` to `.env.local` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
ANTHROPIC_API_KEY=           # or OPENROUTER_API_KEY for OpenRouter
DEFAULT_AI_PROVIDER=         # anthropic | openrouter (optional, defaults to anthropic)
DEFAULT_AI_MODEL=            # registered model id (optional, defaults to claude-sonnet-4-6)
SCORE_AI_MODEL=              # model for scoring (optional, defaults to claude-sonnet-4-6)
```

## Routes

| Route | Description |
|---|---|
| `/` | Landing page |
| `/login` | Auth (sign in / sign up) |
| `/dashboard` | Workspace home — prompt list |
| `/builder` | Prompt builder (create or edit via `?id=`) |
| `/history` | Full prompt history with search |
| `/settings` | Account settings |
| `/help` | Usage guide |

## API

| Endpoint | Method | Description |
|---|---|---|
| `/api/prompts` | GET | List user's prompts |
| `/api/prompts` | POST | Save a new prompt |
| `/api/prompts/[id]` | GET | Get a single prompt |
| `/api/prompts/[id]` | PATCH | Update a prompt |
| `/api/prompts/[id]` | DELETE | Delete a prompt |
| `/api/prompts/generate` | POST | Stream an AI-generated prompt |
| `/api/prompts/score` | POST | Score a prompt across 6 dimensions |

## What's next

- **Optimize weak dimensions** — one-click prompt improvement targeting low-scoring dimensions
- Stripe billing / usage limits
- Chrome extension
