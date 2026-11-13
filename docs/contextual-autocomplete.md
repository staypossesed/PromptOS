# Contextual AI autocomplete

## What changed

The previous instant word index was not a general predictor. It could finish known words but fell silent on arbitrary terms such as the founder's `logory` example. Its hidden, unchecked AI option also made the difference between basic local help and contextual processing unclear.

The idea field now has a visible **Enable AI autocomplete** button and a separate disclosure/permission action. After consent, contextual completion runs even when a dictionary match exists. The model sees the whole current idea field, not a task-template classification. Local suggestions are an immediate fallback while waiting; they are clearly labeled basic when AI is off.

Predictions appear inline. Tab accepts one word, the Add word button works without a keyboard, Add all accepts the continuation, and existing input is never silently changed. Unknown terms are preserved rather than assigned invented definitions. A suffix that finishes a partial word is restricted to that word, preventing appended invented circumstances. Cyrillic partial words cannot be completed with Latin transliteration.

## Privacy

Consent version **2** is required for this update. Older tab permissions are not silently reused. With AI off, no completion request leaves the browser. Enabling sends only the current idea field and input language to Umprompt's existing Anthropic/OpenRouter recipient after typing pauses; it excludes other fields, history, profiles, clipboard data and browsing activity. The 4,000-character bound matches the idea field. Consent remains account- and tab-scoped and can be turned off visibly.

This endpoint does not write content to history, the application database, logs or analytics. SDK content telemetry is disabled. Existing metadata-only acceptance tracking remains unchanged. Apparent secrets and identifiers are blocked locally and server-side, but detection is not exhaustive. Provider policies still apply. Turning off prevents new requests and cancels the current request, but cannot retract transmitted text.

## Delivery and performance

The endpoint supports bounded newline-delimited JSON streaming and retains its JSON interface for evaluation scripts. It emits validated whole-word progress, so a half-generated token is not presented as an accept-ready word. The browser does not wait for the final JSON object to show useful progress. Cancelling the browser stream aborts the provider operation.

The configured model handles full contextual requests. A registered faster model may handle a single-word prefix inside the same provider; no new data recipient or credential is introduced. The client waits at least 150 ms after typing and spaces requests at least 1,100 ms apart. A small memory-only cache reuses continuations as the user types through them. It clears on opt-out. Changed text, selection, composition, stale responses, owner changes, errors and rate limits have explicit handling.

Shared hashed-network fair-use limits are **60 requests/minute and 600/day**. These do not consume the free completed-task allowance. Origin, JSON shape, consent version, character/byte bounds and distributed protection are checked before provider access. Oversized, empty, private, rate-limited, offline and empty-result cases do not disable the main field or Continue. A visible status explains the condition.

This is contextual model prediction, not a guarantee of the intended ending of every possible word. Multiple endings can fit; a typo or invented term can be ambiguous. Network and provider latency remain real. The recorded local configured-model run had a median **1,510 ms** to a first useful completion and p95 **1,774 ms**, excluding the input pause. Basic local matching has no provider delay. These measurements are not described as instant AI inference.

## Verification

The full suite passed **270 tests**, and the production build passed compilation, type checking and page generation. Added checks cover streaming before final completion, Unicode framing, bounded/truncated/error streams, cancellation, consent-v1 rejection, full-field bounds, AI execution despite a dictionary match, empty-result messaging, opt-out and local fallback.

Twenty real provider requests used synthetic unfamiliar text across English, Russian and Spanish, including the founder's screenshot sentence. Every output was manually read. Earlier low-latency trials exposed invented clauses and a Russian transliteration; these are not presented as final passing evidence. The retained model choice and word-finishing guard corrected those observed cases.

The same 20 cases were exercised in the actual local in-app browser after visible activation and permission. Each displayed a suggestion marked `ai`, and every typed prefix remained unchanged. Examples included `extens → extension`, `serendip → serendipity`, `physiother → physiotherapist`, `рукоп → рукописи`, `prór → prórroga`, and `manus → manuscrito`. The unfamiliar term `logory` received a contextual continuation without changing the term or claiming a definition.

The separate Chrome extension package is outside this website release.

## Production verification — 6 November 2026 (Arizona)

Deployment `dpl_3bM49wNP6eNh11yEZVVEYabSyyZi` reached READY and was aliased to both `umprompt.com` and `www.umprompt.com`. The release passed eight live checks covering localized activation controls, AI initially off, privacy disclosure, consent and origin rejection, extra-field rejection, and apparent private-identifier suppression.

Twenty real production provider requests returned bounded suggestions. Every continuation was manually read: partial words were completed naturally, unfamiliar `logory` was preserved without an invented definition, and unusual task contexts were retained. These are plausible predictions, not proof that the model knows the author's intended wording. Median first useful frame was **1,635 ms**, p95 **2,457 ms**, excluding the input pause.

The same twenty cases were then exercised in the production browser after explicitly choosing Allow for this tab. All twenty displayed an `ai` suggestion and preserved the typed prefix. Tab turned `extens` into `extension `; native Undo restored `extens`. The final screenshot shows the founder's exact example with the contextual suffix ` in that paper's context.`. Testing used a separate agent-created tab; the founder's working tab was untouched.

Recorded evidence: `contextual-production-evaluation.json`, `contextual-browser-production.json`, and `contextual-live-checks.json` alongside this document. Refresh the site, choose **Enable AI autocomplete**, then **Allow for this tab** to activate contextual processing. Basic local suggestions do not require this permission. The new consent version intentionally requires visitors to opt in again.

## Repeat the checks

```sh
npm test
npm run build
node scripts/evaluate-contextual-writing.cjs http://127.0.0.1:3000 docs/contextual-writing-evaluation.json
node scripts/check-writing-release.cjs
```

The contextual evaluation sends real synthetic text to the configured provider with explicit consent v2. Structural checks do not establish semantic quality: manually read every returned continuation. API tests alone do not establish that a visitor can discover activation or see the inline result; the browser checks cover those separately.
