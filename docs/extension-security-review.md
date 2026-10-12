# Extension Release Security Review

Reviewed: October 11, 2026. Package: Chrome Web Store draft 0.1.2,
`nfbmeonaffiaicoiahbmmocbkbhekbin`.

This is a scoped source, package, regression, and deployment review. It is not an
independent penetration test, legal certification, or guarantee that all defects
have been found. Do not describe the npm audit as clean.

## Changes Made

- Generation now uses the existing shared rate limiter after input validation and
  before provider work. Paid accounts retain their 200/day fair-use ceiling; free
  accounts retain the existing weekly billing allowance and a separate abuse counter.
- Production refuses to fall back to per-process memory counters when Redis is
  unavailable. Vercel's production variable names confirm Redis is configured;
  availability during individual authenticated requests is not proven by that check.
- Both Anthropic and OpenRouter use a bounded response reader, capped at 2 MiB.
  Oversized successful and error responses are cancelled before the SDK can read
  an unbounded body. Streams, status, headers, and caller cancellation are preserved.
- Next's nested PostCSS is overridden to 8.5.29. The production build passes with
  this compatible update; no forced AI SDK, Tailwind, or Next major upgrade was made.

## Verification

- 89 unit/regression tests pass, including denied generation before provider calls,
  unchanged paid allowance, production fail-closed rate limiting, and bounded fetch.
- TypeScript and the full production build pass.
- Packaged-extension regression tests use isolated profiles and synthetic API/OAuth
  fixtures; they are not evidence of actual provider-account token exchange.
- `scripts/check-extension-release-security.cjs` passes: expected Manifest V3
  permissions and exact hosts, local executable policy, no server-key configuration
  in executable bundles, 1,611 bundle inputs and 52 production traces inspected.
- Live empty-profile startup for the store ID passed again after deployment of these changes:
  healthy connection, no script/CSP errors, anonymous private API returns 401,
  and opening the panel does not generate or save automatically.
- Founder reports successful Google and GitHub sign-in. Submitted real screenshots
  show a generated prompt and explicit saved state. Persistence after a browser
  restart and a complete live two-account isolation test were not independently observed.

## Access and Data Boundaries

- Backend tokens are verified with Supabase before AI, billing, history, or writes.
  Extension requests do not fall back to website cookies or a service-role client.
- Save ownership comes from the verified account. Database RLS is still required;
  synthetic owner-isolation tests do not replace a live database-policy audit.
- OAuth uses PKCE and an exact extension callback. Duplicate/malformed codes and
  unrelated callback origins are rejected. Tokens are not included in reviewer notes.
- Local authentication storage is restricted to trusted extension contexts. There
  are no content scripts, external-message access, browser-history permission,
  clipboard-read permission, or automatic website scraping.
- Prompts render as text. Executable remote scripts and dynamic evaluation are not
  allowed by the submitted manifest. User input is sent to the configured AI provider
  only for requested processing; explicit Save controls account history, not all
  server-side generation diagnostics.

## Remaining Dependency Findings

Post-patch npm audit: **16 affected dependency entries: 8 high, 3 moderate, 5 low,
0 critical**. Several entries reflect the same underlying advisory in parent packages.

| Finding | Current reachability / disposition |
| --- | --- |
| `braces` and parent glob/watch/lint packages | Source-pattern build tools. No arbitrary user pattern API is exposed. Absent from the extension inputs and deployed server traces checked. Upgrade the build chain separately; the package remains flagged. |
| `jsondiffpatch` XSS/prototype pollution | AI SDK RSC dependency. Umprompt does not import `ai/rsc`, patch documents, or its HTML formatter. Absent from extension inputs and deployed traces. Upgrade the SDK separately rather than substitute an incompatible transitive major. |
| `postcss-selector-parser` and nesting parent | Developer-authored CSS build path; user CSS is not accepted. Absent from extension inputs and deployed traces checked. Build-chain migration remains follow-up work. |
| AI SDK attachment whitelist | Generation accepts text messages, not uploaded SDK attachments. Affected upload path is not used. Recheck before adding file/image attachments. |
| AI provider response consumption | Reachable server dependency; mitigated by the tested 2 MiB response wrapper on both registered providers. Dependency version remains flagged until SDK migration. |

Sources: [jsondiffpatch advisory](https://github.com/advisories/GHSA-j4fx-xxwh-2485),
[provider response advisory](https://github.com/advisories/GHSA-866g-f22w-33x8),
[braces advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm),
[selector parsing advisory](https://github.com/advisories/GHSA-rj75-hqrm-r3gf).

## Residual Limits and Follow-Up

- Billing usage checks and usage-event recording are not an atomic weekly reservation.
  Shared daily abuse limits bound requests, but concurrent calls can exceed the nominal
  free weekly allowance. Move weekly reservation/recording into an atomic shared operation.
- Rerun reachability checks whenever SDK, build tooling, attachments, or imports change.
- Schedule a tested AI SDK and build-chain migration; do not suppress remaining audit entries.
- Full live database-policy and payment acceptance tests remain separate work. This
  release does not claim that Stripe test checkout or every account lifecycle was verified.

## Reviewer Access

Saved private instructions explain open Google/GitHub registration, the seven-generation
free weekly allowance, and the Example/Edit/Simplify/Copy/Save/History journey. All core
extension controls can be tested without payment. No founder credentials or admin access
were disclosed. Google may still request a dedicated account or more testing instructions;
do not represent the free path as guaranteed review approval.

Official guidance: [Chrome Web Store test instructions](https://developer.chrome.com/docs/webstore/cws-dashboard-test-instructions).

## Submission Outcome

Google confirmed submission of version 0.1.2 on October 11, 2026. The visible status is
**Pending review**, with automatic publication after approval selected. This does not
mean approved or live. The backend changes are deployed in production as
`dpl_3VyCgv6off9ySSRfPwzovdzi5DuX`, Ready and aliased to `https://www.umprompt.com`.
