# PromptOS

> Describe what you want. PromptOS turns it into the perfect prompt for the exact AI tool you use.

This is the **Day 1 UI shell** — landing page, dashboard, and prompt builder, all running on mock data. No auth, database, or AI yet.

## Stack

- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS
- shadcn/ui primitives (button, card, textarea, input, badge, separator)
- Framer Motion
- lucide-react

## Getting started

```bash
npm install
npm run dev
```

Then open <http://localhost:3000>.

## Routes

- `/` — Landing page
- `/dashboard` — Workspace home with prompt list
- `/builder` — Three-column prompt builder

## What's not in yet

- Supabase auth and DB
- Real AI generation (mock prompt is shown)
- Real scoring (mock score is shown)
- Stripe
- Chrome extension

These are intentionally deferred. See the architecture plan for build order.
