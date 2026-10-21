# Frontend Redesign — Scope

**Status:** awaiting approval. No file has been deleted, moved, or created except this document.
**Branch:** `backup/pre-redesign-frontend`
**Snapshot commit:** `6532f0e` — `chore: snapshot current frontend before redesign`
**Base:** `cc8996d` on `master`

The original frontend is recoverable with `git switch master` or `git switch backup/pre-redesign-frontend`.

---

## 1. Summary

The backend is intact and should not be rewritten. The frontend is a 22-page Next.js App Router surface plus four shell files, built on a card-and-border visual language: bordered cards, soft shadows, small uppercase labels, emerald accents, a sidebar shell, and a long marketing page made of feature cards.

This redesign replaces the frontend, not the product. The API contracts, Supabase schema, auth callbacks, Stripe flow, extension backend, rate limits, and generation pipeline stay in place.

**Outcome**

- One design system across the landing page and every rebuilt page.
- A new landing page at `/` that demonstrates the core transformation: a rough idea becomes a structured prompt.
- `/builder` rebuilt as the centre of the product: a two-page workspace, input on the left, prompt document on the right.
- Account, billing, history, library, templates, auth, help, and legal pages rebuilt in the same system.
- Public marketing and product surfaces share one type scale, one palette, one grid, one button, one field, and one motion language.
- Internal admin and model-lab screens are either rebuilt in phase 2 or kept temporarily; see the open questions.

**Not in scope**

- API route behaviour, request/response shapes, auth semantics, billing logic, database migrations.
- The Chrome extension panel UI (`extension/src/panel.tsx`, `extension/src/panel.css`). It is a separate surface.
- Stripe, Supabase, Vercel, or DNS configuration changes, except documentation of what must be checked.
- New product features. This is a frontend rebuild, not a feature release.

---

## 2. Delete list

All paths are relative to the repository root. “Delete” means removed from the working tree on the redesign branch. Git history keeps every file recoverable.

### 2.1 App routes and pages (26 files)

| Path | Current role | Action |
| --- | --- | --- |
| `app/page.tsx` | Public landing page and guest composer | Delete; replaced by the new landing page |
| `app/layout.tsx` | Root layout, fonts, providers, metadata | Delete; replaced by the new root layout |
| `app/globals.css` | Old design tokens, utilities, animations | Delete; replaced by the new token sheet |
| `app/account/page.tsx` | Account, plan, language, sign-out | Delete; rebuilt |
| `app/admin/page.tsx` | Admin overview and statistics | Delete; rebuilt in phase 2 |
| `app/admin/layout.tsx` | Admin shell and navigation | Delete; rebuilt in phase 2 |
| `app/admin/users/page.tsx` | Admin user list, segments, CSV export | Delete; rebuilt in phase 2 |
| `app/admin/users/[userId]/page.tsx` | Admin user detail and billing history | Delete; rebuilt in phase 2 |
| `app/admin/generations/page.tsx` | Admin generation-run list | Delete; rebuilt in phase 2 |
| `app/admin/billing/page.tsx` | Admin subscription list | Delete; rebuilt in phase 2 |
| `app/admin/feedback/page.tsx` | Admin feedback list | Delete; rebuilt in phase 2 |
| `app/builder/page.tsx` | Core composer, output, score, packs, library | Delete; rebuilt |
| `app/dashboard/page.tsx` | Saved-prompt dashboard | Delete; rebuilt |
| `app/demo/page.tsx` | Marketing walkthrough of the four-step flow | Delete; folded into the new landing page |
| `app/help/page.tsx` | FAQ and feedback trigger | Delete; rebuilt |
| `app/history/page.tsx` | Prompt and prompt-pack history | Delete; rebuilt |
| `app/library/page.tsx` | Workspace profiles and playbooks | Delete; rebuilt |
| `app/login/page.tsx` | Sign-in page | Delete; rebuilt |
| `app/model-lab/page.tsx` | Admin model-comparison lab | Delete; rebuilt in phase 2 |
| `app/model-lab/layout.tsx` | Admin guard for model lab | Delete; rebuilt in phase 2 |
| `app/plan/page.tsx` | Pricing and checkout | Delete; rebuilt |
| `app/plan/success/page.tsx` | Checkout verification and return | Delete; rebuilt |
| `app/privacy/page.tsx` | Privacy policy | Delete; rebuilt as a reading page |
| `app/settings/page.tsx` | Redirect to `/account` | Delete; replaced by a permanent redirect |
| `app/templates/page.tsx` | Template gallery | Delete; rebuilt |
| `app/terms/page.tsx` | Terms of service | Delete; rebuilt as a reading page |

**Do not delete these app files**

| Path | Why |
| --- | --- |
| `app/icon.png` | Read by `scripts/build-extension.cjs`, `scripts/create-extension-store-assets.cjs`, `scripts/prepare-extension-store-screenshots.cjs`, `scripts/test-prompt-editor.cjs`, and `tests/brand-icons.test.cjs`. It is a build input, not UI. |
| `app/favicon.ico` | Brand asset checked by `tests/brand-icons.test.cjs`. Keep until replacement icons are approved. |
| `app/auth/callback/route.ts` | Auth route handler, not a page. Keep. |
| `app/actions/auth.ts` | Server action for sign-out. Keep. |
| `app/actions/admin.ts` | Server action for admin check. Keep. |
| `app/api/**` | All API routes. Keep. |

### 2.2 Components (50 files)

Every file under `components/` is deleted. The new design system is built from new primitives; old class names and component APIs are not carried forward.

| Path | Current role |
| --- | --- |
| `components/admin/admin-nav.tsx` | Admin section links |
| `components/analytics/page-view-tracker.tsx` | PostHog page-view event |
| `components/auth/login-form.tsx` | OAuth and magic-link form |
| `components/billing/billing-portal-button.tsx` | Stripe customer-portal action |
| `components/billing/paywall-modal-container.tsx` | Paywall state wrapper |
| `components/billing/paywall-modal.tsx` | Upgrade dialog |
| `components/billing/upgrade-cta.tsx` | Upgrade link and button |
| `components/brand/logo.tsx` | Wordmark and icon |
| `components/builder/context-panel.tsx` | Context fields for generation |
| `components/builder/expansion-example.tsx` | Rough/structured example |
| `components/builder/idea-composer.tsx` | Core idea composer |
| `components/builder/idea-input.tsx` | Idea textarea |
| `components/builder/idea-placeholder.tsx` | Rotating placeholder |
| `components/builder/onboarding-panel.tsx` | First-run panel |
| `components/builder/pack-type-selector.tsx` | Prompt-pack type choice |
| `components/builder/packs-upsell.tsx` | Prompt-pack upsell |
| `components/builder/prompt-output.tsx` | Generated prompt document |
| `components/builder/prompt-pack-output.tsx` | Prompt-pack document |
| `components/builder/score-panel.tsx` | Score dimensions |
| `components/builder/start-experience.tsx` | Public landing composer |
| `components/builder/tool-selector.tsx` | Target-tool choice |
| `components/dashboard/empty-state.tsx` | Empty-list state |
| `components/dashboard/prompt-card.tsx` | Saved prompt card |
| `components/dashboard/prompt-pack-card.tsx` | Saved pack card |
| `components/feedback/feedback-button.tsx` | Feedback trigger |
| `components/feedback/feedback-modal.tsx` | Feedback form |
| `components/layout/app-shell.tsx` | Workspace shell |
| `components/layout/mobile-nav.tsx` | Mobile navigation |
| `components/layout/sidebar.tsx` | Desktop sidebar |
| `components/layout/topbar.tsx` | Top bar and user menu |
| `components/marketing/feature-triad.tsx` | Three feature cards |
| `components/marketing/hero-demo.tsx` | Animated hero demo |
| `components/marketing/hero-mockup.tsx` | Product mockup |
| `components/marketing/tool-strip.tsx` | Tool logos strip |
| `components/marketing/use-cases.tsx` | Use-case cards |
| `components/providers/motion-provider.tsx` | Reduced-motion context |
| `components/providers/posthog-provider.tsx` | PostHog initialisation |
| `components/settings/language-selector.tsx` | EN/ES/RU switch |
| `components/templates/template-grid.tsx` | Template cards |
| `components/ui/action-icon.tsx` | Icon button with feedback |
| `components/ui/badge.tsx` | Badge primitive |
| `components/ui/button.tsx` | Button primitive |
| `components/ui/card.tsx` | Card primitive |
| `components/ui/disclosure.tsx` | Accordion |
| `components/ui/input.tsx` | Input primitive |
| `components/ui/separator.tsx` | Divider |
| `components/ui/textarea.tsx` | Textarea primitive |
| `components/workspace/builder-library.tsx` | Profile/playbook picker in builder |
| `components/workspace/library-manager.tsx` | Full library manager |
| `components/workspace/result-actions.tsx` | Copy, save, refine actions |

### 2.3 Hooks (3 files)

| Path | Current role |
| --- | --- |
| `hooks/useIdeaSuggestions.ts` | Rotating, category-aware starter suggestions |
| `hooks/usePromptUsage.ts` | Billing and usage state for the client |
| `hooks/useWorkspace.ts` | Workspace profiles and playbooks state |

### 2.4 Public assets (3 files)

| Path | Current role |
| --- | --- |
| `public/apple-touch-icon.png` | Apple touch icon, referenced by the root metadata |
| `public/brand/umprompt-banner.png` | Brand banner; not referenced by the app |
| `public/brand/umprompt-icon.png` | Wordmark icon, used by the old `Logo` and `scripts/serve-extension-fixture.cjs` |

**Caution:** `public/brand/umprompt-icon.png` and `public/apple-touch-icon.png` are both required by `tests/brand-icons.test.cjs`; `public/brand/umprompt-icon.png` is also served by `scripts/serve-extension-fixture.cjs`. Deleting them will fail `npm test` and the extension fixture until the test and script are updated. They are in the delete list because they are old frontend brand assets, but replacement must land in the same change.

### 2.5 Styling and build config (3 files)

| Path | Current role | Action |
| --- | --- | --- |
| `tailwind.config.ts` | Old colour aliases, fonts, radii, animations | Delete the old theme; recreate a minimal token-based config |
| `postcss.config.mjs` | Tailwind and autoprefixer pipeline | Delete and recreate unchanged; the new build still needs it |
| `app/globals.css` | Old tokens, utilities, keyframes | Delete; replace with the new design-system CSS |

`postcss.config.mjs` contains no design decisions. It is listed because it exists only to serve the frontend, but removing it without a replacement breaks the CSS build. The same file will be recreated.

### 2.6 Unused marketing files at the repository root (not deleted yet)

These are outside `public/` and are not imported by the app. They are old marketing source files. I am flagging them rather than deleting them because they may be wanted for the store listing or social posts.

- `hero-desktop-full.png`
- `hero-mobile-full.png`
- `hero-mobile.png`
- `Umprompt banner.png`
- `Umprompt.png`
- `POSTS/1-linkedin.png`

They are inconsistent with the current code brand: `Umprompt.png` is orange, while the code and `tests/brand-icons.test.cjs` use emerald.

---

## 3. Keep list

### 3.1 API routes (23 route files)

All API routes stay. The new frontend calls the same URLs and expects the same response shapes.

| Route | Methods | Purpose |
| --- | --- | --- |
| `/api/admin/users/export` | GET | Admin CSV export of users and segments |
| `/api/billing/checkout` | POST | Create a Stripe Checkout session |
| `/api/billing/founder-count` | GET | Founder-slot count and limit |
| `/api/billing/portal` | POST | Create a Stripe customer-portal session |
| `/api/billing/status` | GET | Plan, limits, and usage for the signed-in user |
| `/api/billing/sync-checkout` | POST | Verify a completed checkout and fulfil it |
| `/api/extension/[...path]` | GET, POST, PUT | Extension backend: status, prompts, generate, optimize, score, save |
| `/api/extension/health` | GET | Extension service identity and version |
| `/api/model-lab/compare` | POST | Generate and score outputs from several models |
| `/api/model-lab/comparisons` | GET, POST | List and save comparisons |
| `/api/model-lab/comparisons/[id]` | PATCH | Set the winning model and reason |
| `/api/prompt-packs` | GET, POST | List and create prompt packs |
| `/api/prompt-packs/[id]` | GET, PATCH, DELETE | Read, update, delete a prompt pack |
| `/api/prompt-packs/generate` | POST | Generate a multi-step prompt pack |
| `/api/prompts` | GET, POST | List and create saved prompts |
| `/api/prompts/[id]` | GET, PATCH, DELETE | Read, update, delete a saved prompt |
| `/api/prompts/clarify` | POST | Ask up to two clarifying questions |
| `/api/prompts/generate` | POST | Stream a generated prompt |
| `/api/prompts/optimize` | POST | Optimize or refine a prompt |
| `/api/prompts/score` | POST | Score a prompt across six dimensions |
| `/api/stripe/webhook` | POST | Stripe subscription and checkout events |
| `/api/usage` | GET | Weekly and daily usage |
| `/api/workspace` | GET, POST, PATCH, DELETE | Private context profiles and playbooks |

### 3.2 Auth and server actions

| Path | Why it stays |
| --- | --- |
| `app/auth/callback/route.ts` | Supabase PKCE callback; the login flow depends on it |
| `app/actions/auth.ts` | `signOut()` server action |
| `app/actions/admin.ts` | `checkIsAdmin()` server action |
| `middleware.ts` | Session refresh, protected-route guards, admin guard |

`middleware.ts` stays, but its route lists must be updated if any protected route is renamed or removed. See §7.

### 3.3 `lib/` — server logic and shared product logic

Keep all of these. They are not visual components.

**AI and generation**

- `lib/ai/bounded-fetch.ts` — response-size guard for provider calls
- `lib/ai/clarify-idea.ts` — clarification questions
- `lib/ai/config.ts` — provider and model resolution
- `lib/ai/generate-prompt-pack.ts` — prompt-pack generation
- `lib/ai/generate-prompt.ts` — core prompt generation and streaming
- `lib/ai/optimize-prompt.ts` — optimization and refinement
- `lib/ai/providers.ts` — Anthropic and OpenRouter registry
- `lib/ai/score-prompt.ts` — six-dimension scoring
- `lib/ai/tool-profiles.ts` — per-tool prompt profiles

**API handlers**

- `lib/api/generate.ts` — shared generate handler for web and extension
- `lib/api/optimize.ts` — shared optimize handler
- `lib/api/score.ts` — shared score handler

**Auth, billing, and operations**

- `lib/admin.ts` — admin allowlist checks
- `lib/admin-audit.ts` — audit-log helper
- `lib/auth-redirect.ts` — safe post-login redirects and cookie
- `lib/billing.ts` — plans, limits, usage, founder count
- `lib/checkout.ts` — checkout offers, prices, return paths
- `lib/checkout-draft.ts` — draft saved across checkout
- `lib/extension-auth.ts` — bearer-token Supabase client
- `lib/fulfill-checkout.ts` — Stripe verification and fulfilment
- `lib/generation-runs.ts` — generation diagnostics
- `lib/rate-limit.ts` — Upstash and in-memory limits
- `lib/stripe.ts` — Stripe client

**Data and domain logic**

- `lib/model-comparisons.ts` — comparison records
- `lib/prompt-context.ts` — context parsing and validation
- `lib/prompt-editing.ts` — prompt versions and editing limits
- `lib/prompt-packs.ts` — pack persistence
- `lib/prompts.ts` — prompt persistence
- `lib/task-categories.ts` — task category vocabulary
- `lib/templates.ts` — starter template content
- `lib/user-segments.ts` — admin user segmentation
- `lib/workspace.ts` — profiles, playbooks, item validation
- `lib/workspace-next-steps.ts` — next-task suggestions
- `lib/mock-data.ts` — tool profiles and starter data used by AI code

**Supabase**

- `lib/supabase/admin.ts` — service-role client
- `lib/supabase/client.ts` — browser client
- `lib/supabase/server.ts` — server and middleware clients

**Shared client and UI-adjacent logic — keep, but flag**

These files are not purely visual, but they are tied to the old interface. Keeping them preserves tests and product behaviour. Their copy and hooks will be reviewed during the rebuild.

- `lib/analytics.ts` — PostHog wrapper; event names should be preserved
- `lib/composer-copy.ts` — composer copy in EN/ES/RU
- `lib/i18n/config.ts` — language list and cookie key
- `lib/i18n/detect-language.ts` — locale detection
- `lib/i18n/detect-text-language.ts` — text-script detection
- `lib/i18n/dictionaries/en.ts` — English dictionary
- `lib/i18n/dictionaries/es.ts` — Spanish dictionary
- `lib/i18n/dictionaries/ru.ts` — Russian dictionary
- `lib/i18n/dictionaries/index.ts` — dictionary registry
- `lib/i18n/language-provider.tsx` — client language context
- `lib/i18n/server.ts` — server translations
- `lib/i18n/use-translations.ts` — client hook
- `lib/idea-suggestions.ts` — starter suggestions
- `lib/localized-ideas.ts` — localized suggestion content
- `lib/utils.ts` — `cn()` class merge helper
- `lib/workspace-copy.ts` — workspace copy in EN/ES/RU

**Ambiguity:** the copy dictionaries contain the old voice. They can be kept as a translation system while individual strings are rewritten. Do not treat them as design assets.

### 3.4 Supabase SQL (8 files)

- `supabase/schema.sql`
- `supabase/feedback.sql`
- `supabase/prompt-packs.sql`
- `supabase/model-comparisons.sql`
- `supabase/billing.sql`
- `supabase/generation-runs.sql`
- `supabase/admin-audit-logs.sql`
- `supabase/workspace.sql`

No migrations in this scope.

### 3.5 Extension (all files)

- `extension/src/api.ts`
- `extension/src/auth-flow.ts`
- `extension/src/background.ts`
- `extension/src/config.ts`
- `extension/src/copy.ts`
- `extension/src/core.ts`
- `extension/src/panel.css`
- `extension/src/panel.tsx`
- `extension/static/panel.html`
- `extension/store-listing.md`

The extension panel is a separate UI. Rebuilding it is not part of this scope unless the user asks.

### 3.6 Scripts (16 files)

| Path | Decision | Note |
| --- | --- | --- |
| `scripts/build-extension.cjs` | Keep | Reads `app/icon.png` |
| `scripts/check-extension-backend.cjs` | Keep | Backend check |
| `scripts/check-extension-release-security.cjs` | Keep | Release security check |
| `scripts/check-extension-signin.cjs` | Keep | Extension sign-in check |
| `scripts/check-release-config.cjs` | Keep | Imports `lib/checkout.ts` |
| `scripts/check-start-ui.cjs` | Rewrite | Asserts old landing copy and imports `lib/composer-copy.ts`, `lib/idea-suggestions.ts` |
| `scripts/check-workspace-ui.cjs` | Rewrite | Creates fixture routes that re-export `app/builder/page.tsx` and `app/library/page.tsx`; imports `lib/composer-copy.ts` |
| `scripts/create-extension-store-assets.cjs` | Keep | Reads `app/icon.png` |
| `scripts/evaluate-outcomes.cjs` | Keep | Imports AI modules |
| `scripts/load-ts.cjs` | Keep | Test loader |
| `scripts/prepare-extension-store-screenshots.cjs` | Keep | Reads `app/icon.png` |
| `scripts/serve-extension-fixture.cjs` | Keep | Serves `public/brand/umprompt-icon.png` |
| `scripts/smoke-generation.cjs` | Keep | Billable smoke check |
| `scripts/test-extension-update.cjs` | Keep | Extension update check |
| `scripts/test-extension.cjs` | Keep | Extension tests |
| `scripts/test-prompt-editor.cjs` | Rewrite | Imports `app/builder/page.tsx`, `lib/i18n/language-provider`, `lib/composer-copy`, `lib/i18n/dictionaries/en.ts`, and `tailwind.config.ts` |

### 3.7 Tests (14 files)

| Path | Decision | Note |
| --- | --- | --- |
| `tests/auth-redirect.test.cjs` | Keep | Update only if `/builder` default changes |
| `tests/auth-session.test.cjs` | Keep | Middleware route expectations may need updating |
| `tests/bounded-provider-fetch.test.cjs` | Keep | Pure backend |
| `tests/brand-icons.test.cjs` | Keep / update | Requires `public/brand/umprompt-icon.png`, `app/icon.png`, `public/apple-touch-icon.png`, `app/favicon.ico` |
| `tests/checkout.test.cjs` | Keep | `lib/checkout.ts` return path is `/builder` |
| `tests/composer-layout.test.cjs` | Rewrite | Imports deleted builder components |
| `tests/composer.test.cjs` | Keep | Imports `lib/` copy and prompt logic |
| `tests/extension-recovery.test.cjs` | Keep | Extension and health route |
| `tests/extension.test.cjs` | Keep | Extension and extension route |
| `tests/load-with-imports.cjs` | Keep | Test helper |
| `tests/prompt-editing.test.cjs` | Keep | Prompt editing logic |
| `tests/rate-limit-security.test.cjs` | Keep | Rate-limit logic |
| `tests/workspace-api.test.cjs` | Keep | Workspace route and generate handler |
| `tests/workspace.test.cjs` | Keep | Workspace logic |

### 3.8 Types (5 files)

- `types/declarations.d.ts`
- `types/language.ts`
- `types/model-comparison.ts`
- `types/prompt-pack.ts`
- `types/prompt.ts`

### 3.9 Project configuration and documentation

Keep `next.config.mjs`, `tsconfig.json`, `package.json`, `package-lock.json`, `.eslintrc.json`, `.env.example`, `.gitignore`, `.vercelignore`, `README.md`, and `docs/*.md` except this new scope document.

`package.json` will be edited, not deleted: remove fonts and UI dependencies that the new design no longer uses, add the chosen font packages. `package-lock.json` changes with it.

### 3.10 Ambiguous items — flagged, not guessed

| Item | Why it is ambiguous | Proposed handling |
| --- | --- | --- |
| `lib/i18n/*` | It is UI copy, but it is also a working three-language system and is used by server pages and tests | Keep the system; rewrite strings as the new pages are built |
| `lib/composer-copy.ts`, `lib/workspace-copy.ts` | Old voice and old page structure; several tests import them | Keep during the rebuild; rewrite copy in place and update tests |
| `lib/idea-suggestions.ts`, `lib/localized-ideas.ts` | Product content, not visual design | Keep and re-use |
| `lib/templates.ts` | Template content for the gallery | Keep and re-use; prune templates that no longer fit |
| `lib/mock-data.ts` | Name suggests mock UI data, but AI code imports tool profiles from it | Keep |
| `lib/analytics.ts` | Client analytics, but event names feed dashboards | Keep and preserve event names |
| `app/admin/**` and `app/model-lab/**` | Frontend, but internal and large; rebuilding them doubles the scope | Rebuild in phase 2, or keep old screens temporarily |
| `app/demo/page.tsx` | Marketing page that duplicates the landing walkthrough | Delete and fold into `/`; confirm |
| `app/settings/page.tsx` | Only a redirect | Delete and add a permanent redirect to `/account` |
| `public/brand/*`, `app/favicon.ico`, `app/icon.png` | Brand assets, not layout; tests and extension build depend on them | Keep until replacement brand assets are approved |
| Root `hero-*.png`, `Umprompt*.png`, `POSTS/` | Old marketing sources, unused by the app | Keep for now; propose moving to `assets/` later |
| Chrome extension panel | Separate UI, not part of the website | Exclude unless requested |

---

## 4. Route inventory

### 4.1 Page routes

| Route | File | Current purpose | Decision | Notes |
| --- | --- | --- | --- | --- |
| `/` | `app/page.tsx` | Public landing page with a guest composer | **Rebuild** | New landing page; the guest-draft question is open |
| `/builder` | `app/builder/page.tsx` | Core workspace: idea, clarify, generate, optimize, score, save, packs, library | **Rebuild** | The most important page; must keep every backend call and the `?id`, `?pack`, `?template`, `?profile`, `?playbook`, and `?resume=checkout` query contracts |
| `/dashboard` | `app/dashboard/page.tsx` | Saved prompts and quick start | **Rebuild** | Becomes a “contents” page |
| `/history` | `app/history/page.tsx` | Prompt and pack history, filters, delete | **Rebuild** | Becomes a ledger with tabs as text |
| `/library` | `app/library/page.tsx` | Profiles and playbooks manager | **Rebuild** | Becomes an index with a detail pane |
| `/templates` | `app/templates/page.tsx` | Starter template gallery | **Rebuild** | Becomes a catalogue list |
| `/account` | `app/account/page.tsx` | Account, plan, usage, language, sign-out | **Rebuild** | Becomes a colophon page |
| `/plan` | `app/plan/page.tsx` | Pricing and Stripe checkout | **Rebuild** | Keep founder and promo logic |
| `/plan/success` | `app/plan/success/page.tsx` | Checkout verification and return | **Rebuild** | Keep polling and retry states |
| `/login` | `app/login/page.tsx` | OAuth and email-link sign-in | **Rebuild** | Keep exact callback contract |
| `/help` | `app/help/page.tsx` | FAQ and feedback | **Rebuild** | FAQ becomes reading text |
| `/privacy` | `app/privacy/page.tsx` | Privacy policy | **Rebuild** | Reading page |
| `/terms` | `app/terms/page.tsx` | Terms of service | **Rebuild** | Reading page |
| `/demo` | `app/demo/page.tsx` | Marketing walkthrough | **Delete** | Fold the explanation into `/`; add a redirect if approved |
| `/settings` | `app/settings/page.tsx` | Redirect to `/account` | **Delete** | Add permanent redirect `/settings` → `/account` |
| `/model-lab` | `app/model-lab/page.tsx` | Admin model comparison | **Rebuild (phase 2)** | Admin-only; keep API calls |
| `/admin` | `app/admin/page.tsx` | Admin overview | **Rebuild (phase 2)** | Internal |
| `/admin/users` | `app/admin/users/page.tsx` | Admin user list, segments, export | **Rebuild (phase 2)** | Internal |
| `/admin/users/[userId]` | `app/admin/users/[userId]/page.tsx` | Admin user detail | **Rebuild (phase 2)** | Internal |
| `/admin/generations` | `app/admin/generations/page.tsx` | Admin generation runs | **Rebuild (phase 2)** | Internal |
| `/admin/billing` | `app/admin/billing/page.tsx` | Admin subscriptions | **Rebuild (phase 2)** | Internal |
| `/admin/feedback` | `app/admin/feedback/page.tsx` | Admin feedback | **Rebuild (phase 2)** | Internal |
| `/auth/callback` | `app/auth/callback/route.ts` | Supabase PKCE callback | **Keep** | Do not rename; configured in Supabase |
| `/api/*` | `app/api/**` | Backend routes | **Keep** | See §4.2 |

### 4.2 API routes

All 23 API route files are kept unchanged.

| Route | Methods | Decision |
| --- | --- | --- |
| `/api/admin/users/export` | GET | Keep |
| `/api/billing/checkout` | POST | Keep |
| `/api/billing/founder-count` | GET | Keep |
| `/api/billing/portal` | POST | Keep |
| `/api/billing/status` | GET | Keep |
| `/api/billing/sync-checkout` | POST | Keep |
| `/api/extension/[...path]` | GET, POST, PUT | Keep |
| `/api/extension/health` | GET | Keep |
| `/api/model-lab/compare` | POST | Keep |
| `/api/model-lab/comparisons` | GET, POST | Keep |
| `/api/model-lab/comparisons/[id]` | PATCH | Keep |
| `/api/prompt-packs` | GET, POST | Keep |
| `/api/prompt-packs/[id]` | GET, PATCH, DELETE | Keep |
| `/api/prompt-packs/generate` | POST | Keep |
| `/api/prompts` | GET, POST | Keep |
| `/api/prompts/[id]` | GET, PATCH, DELETE | Keep |
| `/api/prompts/clarify` | POST | Keep |
| `/api/prompts/generate` | POST | Keep |
| `/api/prompts/optimize` | POST | Keep |
| `/api/prompts/score` | POST | Keep |
| `/api/stripe/webhook` | POST | Keep |
| `/api/usage` | GET | Keep |
| `/api/workspace` | GET, POST, PATCH, DELETE | Keep |

### 4.3 Middleware route map

Current protected prefixes in `middleware.ts`:

- `/dashboard`
- `/builder`
- `/history`
- `/library`
- `/settings`
- `/templates`
- `/model-lab`
- `/admin`

Current auth-only path: `/login`.

Current admin-only prefixes: `/model-lab`, `/admin`.

If the rebuild keeps these route names, middleware needs no behavioural change. If `/settings` is deleted, remove it from the list. If any new private route is added, add it. If `/builder` is renamed, change the prefix and the default redirect in `lib/auth-redirect.ts` and `app/auth/callback/route.ts`.

---

## 5. New site plan

### 5.1 One design system

Every rebuilt page uses the same tokens and the same primitives. The landing page is the fullest expression of the direction; app pages use the same type, palette, grid, and component shapes at higher density.

**Tokens**

- Ground: `#f7f7f7`
- Surface: `#ebebeb`
- Ink: `#0d2a1c`
- Muted ink: `#5f6b64`
- Accent: `#f6e016` (yellow), with `#0d2a1c` text
- One step darker surface for fields and panels: derived from the ground, not a new hue

If the brand must stay emerald, the accent becomes the existing emerald and yellow is removed. This is an open question; see §8.

**Type**

- Display: Imbue, weight 400, optical sizing on, tracking `-0.01em`, leading `0.9`, uppercase only where the wordmark calls for it
- Text: Albert Sans, weight 400 for body and 500 for emphasis, leading `1.55`
- Five steps only: small 13–14px, body 17–19px, lead 20–26px, head 32–64px, display 64–190px
- No monospace outside real code. No tiny uppercase letter-spaced labels. No italic accent word inside a headline.

**Grid and space**

- 12 columns
- Desktop margins 24–32px; phone margins 16px
- Reading pages use the 42% vertical axis: headings begin on it, body text hangs to its right
- Section gaps 120–220px on desktop, 72–96px on phone
- One radius everywhere: 0 (square). Form fields and real tables may have a visible edge; cards may not.

**Components**

- One button: flat fill, square corners, one line of text, no icon unless the icon is the action
- One text field: square, one step darker than the ground, label above, no floating label
- One textarea
- One select, built from a native select or a Radix listbox
- One dialog, used only for destructive confirmation, paywall, or feedback
- One navigation bar: wordmark, links, one action
- One footer: wordmark large, link columns, credits
- No cards. Lists are rows on the ground, separated by space or a tone step.
- No badges, pills, chips, or status capsules. Status is a word, a colour block, or a line of text.
- No shadows at rest. Shadow only on a dialog or a menu that floats above the page.
- Icons are functional only, 16–20px, never used as decoration above a heading.

**Motion**

- Signature: the masked headline or shutter image from the chosen direction
- Section entrances: heading, then text, then picture, staggered 60–90ms, 16–32px rise, once
- Feedback on every control: press, hover, focus
- One moving picture: a slow scale or drift on a photograph, or a scroll-linked move
- At least 8 moving elements are measurable; reduced-motion removes travel and keeps content visible

### 5.2 Pages to rebuild

| Route | One-line purpose | Backend features exposed | Phase |
| --- | --- | --- | --- |
| `/` | Explain the product and let a visitor turn a rough sentence into a structured prompt in the hero | None required; local demo; links to `/login`, `/plan`, `/builder` | 1 |
| `/builder` | The core workspace: idea, clarification, generation, optimization, scoring, saving, packs, library | `/api/prompts/clarify`, `/generate`, `/optimize`, `/score`, `/api/prompts` (POST/GET), `/api/prompt-packs` and `/generate` and `/[id]`, `/api/workspace`, `/api/usage`, `/api/billing/status`, `/api/billing/checkout` | 1 |
| `/dashboard` | Show saved prompts, usage, and a way back into the builder | `/api/prompts` GET, `/api/usage`, `/api/billing/status` | 1 |
| `/history` | Browse, filter, reopen, and delete prompts and prompt packs | `/api/prompts` GET/PATCH/DELETE, `/api/prompt-packs` GET/PATCH/DELETE | 1 |
| `/library` | Manage private context profiles and reusable playbooks | `/api/workspace` GET/POST/PATCH/DELETE | 1 |
| `/templates` | Browse starter templates and open one in the builder | `lib/templates.ts`; builder query parameter | 1 |
| `/login` | Sign in with Google, GitHub, or an email link | Supabase Auth, `/auth/callback`, `lib/auth-redirect` | 1 |
| `/account` | Manage account, plan, usage, language, and sign-out | `/api/billing/status`, `/api/billing/portal`, `signOut` | 1 |
| `/plan` | Compare plans and start checkout | `/api/billing/founder-count`, `/api/billing/checkout`, `/api/usage`, `/api/billing/status` | 1 |
| `/plan/success` | Verify a checkout and return the user to their draft or dashboard | `/api/billing/sync-checkout`, `lib/checkout-draft` | 1 |
| `/help` | Answer common questions and collect feedback | Supabase `feedback` insert via browser client | 1 |
| `/privacy` | State the privacy policy | None | 1 |
| `/terms` | State the terms of service | None | 1 |
| `/model-lab` | Compare model outputs and record a winner | `/api/model-lab/compare`, `/api/model-lab/comparisons` | 2 |
| `/admin` | Overview of users, generations, billing, and feedback | Admin Supabase client, audit log | 2 |
| `/admin/users` | Search users, inspect segments, export CSV | Admin Supabase client, `/api/admin/users/export` | 2 |
| `/admin/users/[userId]` | Inspect one user’s plan, usage, and generations | Admin Supabase client | 2 |
| `/admin/generations` | Inspect generation runs and failures | Admin Supabase client | 2 |
| `/admin/billing` | Inspect subscriptions and founder slots | Admin Supabase client | 2 |
| `/admin/feedback` | Read user feedback | Admin Supabase client | 2 |
| `/settings` | Redirect to `/account` | None | 1 |
| `/demo` | Removed; the landing page carries the walkthrough | None | — |

### 5.3 Landing page argument

The page is built as claims with proof, not as the stock hero / three cards / testimonial / pricing sequence.

1. **Hero — the transformation is the product.**
   Headline: “Say it rough.” / “We’ll make it precise.” Two lines, no eyebrow, no badge.
   Supporting sentence: one line about turning a rough idea into a clear, portable prompt.
   Action: “Start with an idea.”
   The right side or lower half is a live sheet: the visitor types a rough sentence; the sheet shows the structured version assemble in place. This is the one live thing. It is deterministic and labelled as an example; real AI generation still requires sign-in.

2. **Showcase — input half, output half.**
   A full-bleed split: messy sentence on the left, finished prompt document on the right. The left is editable. The right is a real prompt with sections: task, context, constraints, output format. The seam between them carries the headline. This is the page’s central proof.

3. **How it works — call and response.**
   Three exchanges, each a real input and a real response. First: the visitor’s sentence. Second: up to two clarifying questions, only when the idea is ambiguous. Third: the prompt, ready to paste. No step numbers; the order is shown by position and the words “First / Then / Finally” only if they read naturally.

4. **Features — the builder panel with margin notes.**
   One real builder panel, built in HTML at true size, with six notes in the margins: task categories, context profiles, prompt packs, quality score, versions, library. Each note points at the control it explains. This replaces the icon-topped feature cards.

5. **Proof — plain names in columns, no invented testimonials.**
   We do not have customer names, quotes, logos, or reviews. Use honest product facts instead: “7 free prompts a week”, “No card to start”, “Works with Claude, ChatGPT, Cursor, and any assistant”, “English, Spanish, Russian”, “Prompts saved to your account”. Present them as a typographic list, not a logo strip.

6. **Pricing — two plans, two fields.**
   Free and Pro stand side by side as full-height colour fields. Pro shows the monthly price and the lifetime option, with the founder price as a separate line. The full matrix lives on `/plan`. No tick lists; what is included is a short paragraph.

7. **FAQ — answers as reading text.**
   Eight to twelve real questions, set in two columns with run-in questions and full answers. No accordion. The point is that everything is answered at a glance.

8. **Closing field — the idea again, inverted.**
   A full-bleed accent or ink field with a short headline that echoes the hero without repeating it, one sentence, and one button. No image needed if the picture budget is tight; this is the one deliberate empty screen.

9. **Footer — the wordmark closes the page.**
   The name at full content width, then link columns, then legal and image credits. The footer is a designed close, not a sitemap.

### 5.4 App page compositions

**`/builder` — the two-page workspace**

- Desktop: 42% axis. Left page: idea, category, context, clarify, generate. Right page: the prompt document, read-only by default, with Edit / Done, Copy, Save, Refine, Score.
- Mobile: one column. The prompt document becomes a sticky sheet after generation; the composer collapses to a summary line.
- The prompt is a document, not a chat bubble: paper surface, generous measure, real section headings.
- Library profiles and playbooks open in a side sheet styled as a folder, not a modal card.
- Paywall is a dialog, not a card in the flow.
- Every existing backend call stays: clarify, generate, optimize, score, save, packs, workspace, usage.

**`/dashboard` — contents page**

- Large page title, usage line, then a list of saved prompts in rows: title, target tool, score, updated date.
- One primary action: “Start with an idea.”
- Empty state is a sentence and one action, not an illustration.

**`/history` — ledger**

- Tabs as plain text links: Prompts / Packs.
- Filters as a row of text choices, not pills.
- Rows with title, score, tool, date, and a delete action.
- Delete confirmation is a dialog.

**`/library` — index and detail**

- Left: list of profiles and playbooks, grouped by kind.
- Right: the selected item’s fields and actions.
- Create and edit use a sheet; no cards.

**`/templates` — catalogue**

- Grouped list of templates with large titles and one-line descriptions.
- Clicking a template opens `/builder?template=<id>`.
- No thumbnail grid.

**`/account` — colophon**

- Account facts: email, provider, member since.
- Plan and usage.
- Language selector.
- Sign out.
- No cards; rows and space.

**`/plan` — two fields**

- Free and Pro side by side, full height, meeting on a hard vertical edge.
- Founder price and lifetime option are lines inside Pro, not separate cards.
- Promo code field appears only when needed.
- Checkout button is the one accent element.

**`/plan/success` — receipt**

- A single sheet showing what was purchased, the verification state, and the return action.
- States: syncing, success, pending, failed, auth required. Each is a sentence, not a spinner-only screen.

**`/login` — title page**

- Wordmark, one sentence, three sign-in choices (Google, GitHub, email link).
- Legal links at the foot.
- The page keeps `prepareAuthRedirect` and the `next` destination contract.

**`/help` — reading page**

- Questions and answers in two columns, run-in questions.
- Feedback opens a dialog with a textarea.

**`/privacy`, `/terms` — reading pages**

- 42% axis, one measure, no cards.

**`/model-lab` — comparison ledger (phase 2)**

- Idea and tool at the top, then one column per model with output, score, latency, cost, and a winner action.

**`/admin/*` — internal ledgers (phase 2)**

- Dense tables, same type and palette, no cards or badges.
- Status is a word or a colour block.
- Audit logging and CSV export stay.

### 5.5 Navigation

**Public header**

- Wordmark
- “How it works” (anchor on `/`)
- “Plans” (`/plan`)
- “Sign in” (`/login`)
- One action: “Start with an idea” (`/builder` or `/login`)

**App shell**

- Builder
- Dashboard
- History
- Library
- Templates
- Account
- Help
- Admin (only for admin users)

No floating pill navigation, no glass, no backdrop blur.

**Mobile**

- A plain top bar with the wordmark and one menu button.
- The menu is a full-height plain panel, not a floating card.

### 5.6 New shared components

These replace the deleted `components/` tree. Names are working names.

- `components/system/Button.tsx`
- `components/system/Field.tsx`
- `components/system/TextArea.tsx`
- `components/system/Select.tsx`
- `components/system/Dialog.tsx`
- `components/system/Nav.tsx`
- `components/system/Footer.tsx`
- `components/system/Page.tsx` — grid, axis, and measure
- `components/system/Sheet.tsx` — prompt document surface
- `components/system/Analytics.tsx` — PostHog provider and page-view tracker
- `components/builder/IdeaComposer.tsx`
- `components/builder/PromptSheet.tsx`
- `components/builder/ScoreMargin.tsx`
- `components/builder/LibraryPanel.tsx`
- `components/lists/PromptList.tsx`
- `components/lists/TemplateList.tsx`
- `components/lists/ComparisonTable.tsx`
- `components/motion/Reveal.tsx`

### 5.7 Guest drafting

Today `/` is the only public place where a guest can compose a draft; `/builder` is protected by middleware. A marketing landing page at `/` would remove that behaviour unless the new landing keeps a working composer.

Proposed handling:

- The landing hero contains a real composer. A guest can type an idea and see the deterministic structure assemble locally.
- Pressing “Generate” asks the guest to sign in, then returns them to `/builder` with the idea preserved.
- The draft is stored in `sessionStorage` and restored after auth.
- No AI call is made without a session. This matches the current `/api/prompts/generate` behaviour, which returns 401 for guests.

This is an open question because it changes the first-screen behaviour from “compose” to “compose + marketing”.

---

## 6. Design direction

### 6.1 How the directions were drawn

I used the `design-taste-frontend` skill as the design authority and ran its direction dealer from the project root:

```bash
node ~/.agents/skills/design-taste-frontend/scripts/draw.mjs \
  --sector ai-product \
  --brief "Umprompt turns a rough everyday idea into a clear, structured AI prompt for any assistant" \
  --sections showcase,how-it-works,features,proof,pricing,faq,cta,footer \
  --have product-ui \
  --options 3
```

The dealer returned three directions. I then dealt each one in full to read its type system, palette, hero, and section blueprints. The three are recorded below with the seed printed by the dealer. No redraw has been applied at scope stage.

**A note on imagery.** The skill’s floor asks for at least four real pictures. For software, cropped interface fragments count. The direction sheets also state that this subject’s pictures are its own interface. The plan therefore uses real, built interface fragments as the primary imagery, plus a small number of open-license archival images if approved. No stock “team around a laptop” photography, no fake dashboards of grey bars, no device frames.

---

### 6.2 Direction A — “Dressed as something else” (`borrowed-category`)

**Seed:** 852282572

**Idea.** Art-direct the prompt tool as if it belonged to a more vivid category: a fashion house or a perfume counter. The rough sentence is presented as an object; the finished prompt is the product on the counter. The contrast between a dry utility and a luxury display is the memorable move.

**Composition.** A dark field with a single low-key object image centred slightly above the midline. Under it, the name runs as an ultra-wide wordmark, then one serif sentence, then a single row with a specification, the action, and a second specification. Sections keep the borrowed manners: an output index with a live sheet, lines that step across the page, close-ups on a board, a printed guest list, two pricing fields, tabbed index cards, a one-word CTA, and a contact-as-headline footer.

**Type.** Bodoni Moda (display, weight 500, optical sizing on, tracking `-0.02em`, leading `0.95`) over Jost (text, 400/500, leading 1.6, tracking 0.01em). A true didone over a light geometric sans: fashion-magazine pairing.

**Palette.** White ground, near-black ink, and flat report blocks: white `#ffffff`, surface `#f6f6f6`, ink `#000000`, muted `#5f5f5f`, accent orange `#fe7141`, sage `#d1ddd3`, acid yellow `#f0ff1c`, black field `#000000`.

**Imagery.** The direction sheet treats the product interface as the object: build a believable fragment of the product at real size, mark it `data-ui`, and crop or scale it like a photograph. Optional architectural atmosphere from the dealt set, at most two images. The page would need a hero object shot or a very strong interface object.

**Fit.** Strong visual identity and a real point of view. It would make Umprompt look unlike every other AI tool.

**Why I do not recommend it.** The product is an everyday utility for people who do not want to learn prompt engineering. Dressing it as a luxury counter makes the tool feel exclusive and slightly absurd. The dealt palette is orange and acid yellow; the code brand is emerald. The composition depends on a hero object, and the product’s object is a text document, which is hard to photograph honestly. App pages would inherit a fashion grammar that fights dense forms and tables. It is the most memorable direction and the least usable one.

---

### 6.3 Direction B — “The well-kept board” (`dense-tiles`)

**Seed:** 729976866

**Idea.** The whole page is a board of tiles fitted edge to edge with narrow gaps, like a tidy desk seen from above. Each tile is one thing: the name, a statement, a photograph, a number, a link, a short list. There is no hero band and no sequence of sections; the eye roams one continuous composition.

**Composition.** A 12-column grid with 8px gaps and 8–12px outer margins, filled completely, no empty cells. Four tile sizes only. The first screen contains a name tile at display size, a statement tile, two or three image tiles, and one action tile in the accent. Below the first screen the board continues at the same sizes; the footer is made of tiles. Section blueprints: rows as a board, one card with four fields, statement cell with dark rows, large marks on tiles, plans as a large table, accordion of filled tiles, the action tile, the mark built large.

**Type.** League Spartan (display, 700, tracking `-0.04em`, leading `0.88`) over Figtree (text, 400/600, leading 1.5). A compact bold geometric over a friendly text sans.

**Palette.** White ground, near-black ink, two greys, and mint as the only saturated note: `#ffffff`, surface `#f3f3f3`, ink `#232323`, muted `#6e6e6e`, accent mint `#a1ffcb`, dark field `#232323`.

**Imagery.** Photographs fill whole tiles with `object-fit: cover`; interface fragments are built at macro scale inside tiles; optional architecture atmosphere. The board needs many small true things to show.

**Fit.** Excellent for a product with many capabilities: composer, scores, packs, library, templates, history. The board is a clear system and would make the app pages coherent.

**Why I do not recommend it.** It is the most familiar AI-product shape: the bento board. The current landing is already a long sequence of cards; a tile board would be a different card system, not a different idea. It also flattens the one thing that matters — the transformation of a sentence into a prompt — into one tile among many. The skill explicitly warns that a board with an icon and a two-line blurb in every tile is the generic version. App pages would become dashboards of tiles, which is exactly the screen type the skill does not cover well.

---

### 6.4 Direction C — “The printed annual” (`editorial-report`)

**Seed:** 2095110185

**Idea.** Lay the page out like a well-designed printed report or magazine feature: a masthead, a tight oversized title, text held to a strict column line, and colour used in solid blocks the way a two-colour print job would. It gives weight and authority to a subject that is really about content. The reader should feel that someone edited this.

**Composition.** A fixed vertical axis at about 42% of the viewport width organises everything. Headings begin on the axis; body columns hang to its right; the 0–42% zone holds small side notes, figures, or stays empty. The masthead is a wide image band across the top 45% of the first screen; below it the title at 7–9vw starts on the axis, with a two-sentence standfirst at 20–24px. Sections alternate between text pages and full-bleed colour pages carrying one large figure, quotation, or image mosaic. Mosaics are gutterless: photographs and flat colour tiles butted together.

**Type.** Imbue (display, weight 400, optical sizing on, tracking `-0.01em`, leading `0.9`, uppercase where the wordmark calls for it) over Albert Sans (text, 400/500, leading 1.55). A tall, condensed, high-contrast serif with a masthead quality, over an excellent reading sans.

**Palette.** Off-white ground, all type in a near-black bottle green instead of black, and yellow as the only saturated note: `#f7f7f7` ground, `#ebebeb` surface, `#0d2a1c` ink, `#5f6b64` muted, `#f6e016` accent with `#0d2a1c` accent ink. One later section may turn fully yellow.

**Imagery.** A masthead band or a gutterless mosaic; photographs and flat colour tiles butted together; product interface plates built at true size and marked `data-ui`. One treatment for all photographs: either all greyscale with a slight contrast lift, or all full colour, never mixed. The sheet’s dealt section “input half, output half” puts the raw sentence and the finished prompt on facing pages, which is the product in one composition.

**Fit.** The product’s atomic artefact is a document. The page can be the document. The input/output split is not a metaphor; it is the actual workspace. The 42% axis gives the landing page a spine and gives every app page a shared grid. The bottle-green ink is much closer to the existing emerald than the orange of direction A, and the yellow accent can be used on exactly one action per screen.

**Why I recommend it.** It is the only one of the three whose composition comes from what Umprompt actually does: it edits a rough sentence into a finished instruction. The other two are ways of displaying a product; this one is a way of showing the product’s work. It also scales down to dense app screens without becoming a dashboard of cards: lists become contents pages, forms become marginalia, the prompt becomes a sheet.

---

### 6.5 Recommendation

**Recommendation: Direction C, “The printed annual”, with one brand decision to confirm.**

The idea sentence for the build:

> On this page, Umprompt’s six-dimension prompt score becomes the margin notes of a printed page: the visitor’s rough sentence is edited in public, and each correction is annotated in the margin.

The competitor test: a generic prompt tool could also show a before/after prompt, but the six-dimension score as editorial margin notes, attached to the visitor’s own sentence, is Umprompt’s. The page is not “a nice editorial layout”; it is the product’s scoring model made visible.

**The one live thing.** A visitor types a rough sentence into the left page. The right page is a prompt document with six margin notes, one per score dimension: clarity, context, constraints, examples, output format, tool fit. As the sentence changes, the notes mark what is missing and the document fills in the structure. This is deterministic, runs on the client, and is labelled as an example. Real AI generation still happens behind sign-in. On a phone the two pages stack; the margin notes become a short list under the document. Without JavaScript, the page shows a complete static example.

**How the idea carries into the app**

- `/builder` is the same two-page spread, but the left page is the working composer and the right page is the real prompt document. The score margin is the real score panel, not a metaphor.
- `/dashboard` and `/history` are contents pages: large titles, rows, dates, no cards.
- `/library` is an index with a detail page, like a file folder.
- `/plan` is two full-height fields.
- `/login` is a title page.
- `/account` is a colophon.
- `/help`, `/privacy`, `/terms` are reading pages on the 42% axis.
- `/admin` and `/model-lab` are ledgers: dense tables, same type and palette.

**Planned redraws (not applied yet)**

- **Palette:** if the brand must keep the current emerald action colour, redraw only the palette: keep the ground/ink/surface proportions, use emerald as the accent, drop yellow. This is a brand decision, not a composition change.
- **CTA section:** the dealt section is “three photographs, then a field.” If archival photography is not approved, redraw that section to a single full-bleed field. This is an asset decision.
- **Hero:** the dealt hero is a two-by-two board. If the live score sheet needs the full first screen, redraw the hero to a single masthead + sheet split. This is a usability decision; record it in the build report.

No other redraws are planned. The direction’s composition, type system, and section order are adopted as dealt.

### 6.6 House rules for this build

These are enforced on every page, not just the landing page.

- Headlines: two lines or fewer at every width. No eyebrows, no pills above a heading.
- Body text 16px or more; running text in full ink, not soft grey.
- Two typefaces maximum: Imbue and Albert Sans.
- No monospace outside real code blocks.
- No index numbers (`01`, `02`, `Step 2`) except a real ordered list.
- No thin rules, hairline dividers, or outlined boxes. Space, tone steps, and scale do the separating.
- No gradients, glows, or shadows on resting elements.
- No cream-and-terracotta, no violet, no indigo.
- No tiny uppercase letter-spaced labels.
- No icon-topped feature cards, no rows of identical cards, no glass, no floating pill navigation.
- No emoji, gradient blobs, decorative shapes, or fake dashboards of grey bars.
- No styled accent word inside a headline.
- Buttons: flat, one fill, square corners, one shape everywhere.
- Navigation: wordmark, three to five links, one action.
- The footer is a designed close, not a sitemap.

### 6.7 Imagery plan

The page needs real pictures, not placeholders. The plan, in order of preference:

1. **The product’s own interface.** Build four to six true-size fragments in HTML: the composer, the prompt sheet with margin notes, the score panel, the library drawer, the pack output, the history ledger. Mark each root `data-ui`. Crop them like photographs: a close crop of the score margin, a full sheet, a narrow strip of the history ledger. These count toward the picture floor for software.
2. **Open-license archival images of the world of writing and print.** Two to four images, downloaded into the repo, credited on the page and in the build report. Search terms from the inventory: letterpress type case, library card catalogue, manuscript margin, printed page, editing marks. Use one treatment (greyscale with a slight contrast lift, or full colour) across all of them.
3. **No stock photography of people at laptops, robots, glowing brains, or abstract networks.**
4. **Flat colour fields and type** where no honest picture exists.

Every image gets `width`, `height`, `alt`, and `loading="lazy"` except the hero image. Every found image gets a credit line in the footer and in the build report.

### 6.8 Fonts

- **Imbue** for display. It is a variable font; self-host it with `@fontsource-variable/imbue` if the package exists, otherwise use `next/font/google` with a local fallback stack.
- **Albert Sans** for text. Self-host `@fontsource-variable/albert-sans` or use `next/font/google`.
- Do not load fonts from a third-party CDN at runtime. The current project self-hosts Bricolage Grotesque for exactly this reason.
- Remove `@fontsource-variable/bricolage-grotesque` and `@fontsource-variable/fraunces` from `package.json` if no rebuilt page uses them.

### 6.9 Motion

- **Signature move:** a shutter/mask reveal on the hero headline or the prompt sheet. The dealt sheet calls it “shutter image”; implement it as a clip-path or mask that reveals the sheet as it enters, not as a fade on every element.
- **Section entrances:** heading, then text, then picture, staggered 60–90ms, 16–32px rise, once.
- **Control feedback:** press, hover, and focus on every button, link, field, and row.
- **One moving picture:** a slow scale or drift on the masthead image, or a scroll-linked move on the prompt sheet.
- **Reduced motion:** remove travel, keep content visible, no autoplay.
- **Budget:** at least 8 moving elements are measurable; the inspector warns under 16. Do not animate colour or layout of whole screens.

---

## 7. Risks

| # | Risk | Impact | Mitigation |
| --- | --- | --- | --- |
| 1 | **Auth callback drift.** Supabase allowlists the exact `origin + /auth/callback` for local, production, and preview. The login form stores `next` in a cookie scoped to `/auth/callback`. | Sign-in loops, users returned to the wrong page, or OAuth landing on production from a preview. | Do not rename `/auth/callback`. Keep `prepareAuthRedirect`, `AUTH_NEXT_COOKIE`, and `safeAuthNext`. Re-check the allowlist before testing. |
| 2 | **Default post-login path.** `safeAuthNext` falls back to `/builder`; middleware redirects signed-in users from `/login` to `/builder`; admin users are redirected to `/dashboard`. | Renaming `/builder` or `/dashboard` silently sends users to a 404 or the wrong page. | Keep both routes. If renamed, update `lib/auth-redirect.ts`, `middleware.ts`, `app/auth/callback/route.ts`, `tests/auth-redirect.test.cjs`, and `tests/auth-session.test.cjs` in one change. |
| 3 | **Middleware route drift.** `PROTECTED_PREFIXES` lists `/dashboard`, `/builder`, `/history`, `/library`, `/settings`, `/templates`, `/model-lab`, `/admin`. | A rebuilt private page can become public if its prefix is missing; a public page can become unreachable. | Update the list with the final route map. Keep `/` public. Remove `/settings` if it becomes a redirect. Add any new private route. |
| 4 | **Guest drafting loss.** `/` is currently the only public composer. `/builder` is protected and `/api/prompts/generate` returns 401 for guests. | A marketing landing page removes the “start before signing in” experience described in the README. | Keep a working composer in the landing hero with a local, deterministic preview. Preserve the draft in `sessionStorage` and restore it after sign-in. Confirm this behaviour in §8. |
| 5 | **Extension build depends on `app/icon.png`.** `scripts/build-extension.cjs`, `scripts/create-extension-store-assets.cjs`, `scripts/prepare-extension-store-screenshots.cjs`, and `scripts/test-prompt-editor.cjs` read it. | The extension cannot be built or its store assets regenerated. | Keep `app/icon.png` until a replacement is produced. If replaced, keep it square and update all four scripts and `tests/brand-icons.test.cjs`. |
| 6 | **Extension fixture depends on `public/brand/umprompt-icon.png`.** `scripts/serve-extension-fixture.cjs` serves it for `/icons/*`. | The extension fixture shows broken icons. | Keep the file, or change the fixture to read the new icon path. |
| 7 | **Brand icon test.** `tests/brand-icons.test.cjs` asserts that `public/brand/umprompt-icon.png` (512), `app/icon.png` (192), `public/apple-touch-icon.png` (180), and `app/favicon.ico` are square emerald PNGs. | `npm test` fails if icons are deleted, resized, or recoloured. | Keep the icons through phase 1. If the new brand changes the icon, update the test’s colour and size checks in the same change as the new assets. |
| 8 | **UI tests and scripts import deleted files.** `tests/composer-layout.test.cjs` imports builder components. `scripts/check-start-ui.cjs` checks the old landing copy and imports `lib/composer-copy.ts` and `lib/idea-suggestions.ts`. `scripts/check-workspace-ui.cjs` creates fixtures that re-export `app/builder/page.tsx` and `app/library/page.tsx`. `scripts/test-prompt-editor.cjs` imports `app/builder/page.tsx`, `lib/i18n/language-provider`, `lib/composer-copy`, `lib/i18n/dictionaries/en.ts`, and `tailwind.config.ts`. | `npm test` and the UI checks fail during the rebuild. | Treat these as UI tests, not backend tests. Rewrite them against the new pages. Keep the backend tests untouched. Do not delete a test to make the suite green. |
| 9 | **Checkout and deep-link contracts.** `lib/checkout.ts` hardcodes `CHECKOUT_RETURN = "/builder?resume=checkout"`. The builder also reads `?id`, `?pack`, `?template`, `?profile`, and `?playbook`. Stripe metadata and `tests/checkout.test.cjs` use the return path. | Checkout returns to a missing page, a template link stops prefilling, or a library link stops opening the right item. | Keep the `/builder` path and every query parameter. If any changes, update `lib/checkout.ts`, the Stripe checkout metadata, the success page, the library links, and the tests together. |
| 10 | **Environment variable drift.** Required names: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY` or `OPENROUTER_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, the four `STRIPE_PRICE_*` values, and `ADMIN_EMAILS`. Optional: `DEFAULT_AI_PROVIDER`, `DEFAULT_AI_MODEL`, `SCORE_AI_MODEL`, `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`. | Missing or renamed values break generation, checkout, admin access, or analytics. | Keep the names unchanged. Update `.env.example` only if a new variable is genuinely added. Do not commit `.env.local`. |
| 11 | **Vercel configuration.** The project has no `vercel.json`; Next.js is auto-detected. `next.config.mjs` sets `distDir` to `.next-dev` in development and `.next` in production. `.vercelignore` excludes `.next-dev`, `extension/dist`, and `extension/artifacts`. | A config change can break preview builds or upload development artefacts. | Do not change the `distDir` split. Add redirects in `next.config.mjs`, not in a new platform config. Test a preview before production. |
| 12 | **Font delivery.** The direction uses Imbue and Albert Sans, which are not in `package.json`. The current app self-hosts fonts to avoid build-time network requests. | Vercel build failure, flash of fallback type, or a runtime request to a third-party CDN. | Self-host via `@fontsource-variable` if the packages exist; otherwise use `next/font/google` and confirm the build has network access. Do not use a runtime `<link>` to Google Fonts. |
| 13 | **Image licensing and weight.** The skill’s floor asks for real pictures; archival images need credit lines. Large PNGs in `public/` increase build and page weight. | Licence risk, slow pages, or missing credits. | Download only commercial-use licences, keep the source and licence in the build report, add credits to the footer, convert to WebP/AVIF with correct dimensions. Prefer interface fragments that already exist in the app. |
| 14 | **Analytics continuity.** Event names such as `landing_view`, `templates_opened`, `prompt_generated`, `prompt_copied`, `prompt_saved`, `upgrade_clicked`, and feedback events feed PostHog dashboards. | Rebuilt pages stop reporting, or dashboards break. | Preserve event names and properties. Keep `components/providers/posthog-provider.tsx` behaviour in the new analytics component. Do not add prompt text or profile content to events. |
| 15 | **Localization regression.** The current app supports EN/ES/RU with a cookie, server translations, and text-script detection. | Rebuilt pages ship English-only, or the language switch breaks. | Keep the `lib/i18n` system. Build pages with dictionary keys from the start. If English-only is acceptable for phase 1, say so explicitly and hide the selector rather than leaving a dead control. |
| 16 | **Build order.** The root layout, `globals.css`, and Tailwind config are deleted and replaced. | The app cannot build between deletion and replacement. | Do the scaffold in one commit: new tokens, new root layout, new primitives, one route at a time. Keep the backup branch. Never leave `master` unbuildable. |
| 17 | **Admin scope.** Rebuilding `/admin/**` and `/model-lab` in the new system is a second frontend. | The redesign stalls on internal screens; public pages ship late. | Phase 2. If the old admin pages must stay temporarily, keep them on the old design and state that clearly; do not half-restyle them. |
| 18 | **SEO and redirects.** The current root metadata hardcodes title, description, and icons. Deleting `/demo` and `/settings` leaves old links and bookmarks. | Search results show the old brand; old links 404. | New metadata, Open Graph image, canonical URL. Add permanent redirects for `/settings` → `/account` and `/demo` → `/` (or a landing anchor). Add `sitemap.ts` and `robots.ts` if the project wants them; they do not exist today. |
| 19 | **The skill is not written for app screens.** Its description says “Not for dashboards or app screens.” | Applying the landing-page rubric to dense builder/admin screens produces the wrong result. | Use the full direction and inspector on `/` and the marketing pages. Use the same tokens, type, grid, and component shapes on app pages, but judge them by task clarity and density, not by the four-picture floor. State this in the build report. |
| 20 | **Provider stack in the root layout.** The current layout wraps the app in PostHog, Motion, and Language providers and reads the language cookie. | Removing a provider breaks analytics, reduced motion, or translations. | Rebuild the providers in the new root layout with the same behaviour. Keep the `lang` attribute and the cookie read. |

---

## 8. Open questions

1. **Direction.** Do you approve Direction C, “The printed annual”? Or do you want A (“Dressed as something else”) or B (“The well-kept board”)?
2. **Brand palette.** The code brand is emerald (`#047857`); the root PNG is orange; the dealt direction is bottle green ink + yellow accent. Which is canonical? Options:
   - Adopt the dealt bottle green + yellow.
   - Keep emerald as the accent and use bottle green as ink; drop yellow.
   - Keep the current emerald palette entirely and take only composition/type from the direction.
3. **Guest drafting.** Should `/` keep a working guest composer (current behaviour), or become a marketing page with a local demo and send all composing to `/builder` after sign-in? My recommendation is the former: a real composer in the hero, local preview, sign-in on Generate.
4. **Admin and model-lab.** Rebuild `/admin/**` and `/model-lab` in phase 2, or keep the old screens temporarily? If they stay, they will not share the new design system.
5. **Localization.** Keep EN/ES/RU on every rebuilt page, or ship English first and port the dictionaries later? The current product advertises three languages.
6. **`/demo`.** Delete it and fold the walkthrough into `/`, or keep a separate `/demo` page? I recommend delete + redirect.
7. **Photography.** Do you approve downloading 2–4 open-license archival images (letterpress, card catalogue, manuscript margin) into the repo with credits? Or should the page use only built interface fragments and flat colour? The interface fragments alone can satisfy the software picture floor.
8. **Brand icons.** May I replace `app/favicon.ico`, `app/icon.png`, `public/apple-touch-icon.png`, and `public/brand/umprompt-icon.png` if the new wordmark needs it? These are tested and the extension build reads `app/icon.png`.
9. **Root marketing files.** Can I move or delete `hero-*.png`, `Umprompt*.png`, and `POSTS/1-linkedin.png`? They are unused by the app and conflict with the code brand.
10. **Extension.** I am treating the Chrome extension panel as out of scope. Confirm that the extension UI stays as it is.

---

## 9. What happens on confirmation

1. Create a build branch from `backup/pre-redesign-frontend` (for example `redesign/frontend-v1`). Run `npm ci`; `node_modules` is not present in the clone.
2. Add the design tokens, root layout, providers, and new primitives. Keep the app buildable.
3. Build `/` first, with the live score-margin demo, at 1440 / 768 / 390.
4. Run `lint.mjs` and `inspect.mjs` from the skill. Fix every `FAIL`; defend or fix every `WARN`.
5. Look at the screenshots, write the critique, fix the top three problems, inspect again. Three rounds maximum.
6. Rebuild `/builder` and the app pages in the same system. Keep every API call and auth guard.
7. Rewrite the UI tests and scripts listed in §3.6 and §3.7. Keep backend tests green.
8. Run `npm test`, `npm run build`, and the browser checks. Report what passed, what was not run, and every redraw.
9. Phase 2: rebuild `/model-lab` and `/admin/**`, or leave them on the old design by explicit decision.

No deletion starts before you confirm this scope.
