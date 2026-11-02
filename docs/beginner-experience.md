# Beginner experience

The rebuild keeps Umprompt's name and focuses on adults using AI for the first time. Its three steps are an idea, a few relevant details, and a result. Familiar examples cover messages, studying, planning, explanations, and interview practice. The sample preview exists only before the task begins.

Users choose instructions to copy into another AI or a first result produced inside Umprompt. Results are read-only until Edit is selected. Copy and Save use the edited text. The original idea remains separate and fully readable. Instruction quality review and optimization remain available after sign-in; finished answers are not scored as prompts.

## Access and continuity

The public guest endpoint permits one completed result per network in a seven-day window. It uses a short atomic Redis reservation, releases failed attempts, distinguishes concurrent work from an already-used allowance, and marks successful completion. Production requires Vercel's trusted client address and configured Upstash storage; it fails closed if either is unavailable. Redis receives a keyed address hash and quota state, never the idea or result. Shared networks can share this allowance. Development uses memory instead.

Guest generation does not create an account, save a prompt to history, or accept client-selected provider/model overrides. It validates origin, input size, language, and context before calling the configured provider. Signed-in generation and its existing seven-per-week/free and paid limits are unchanged. No database migration or new provider credential is required.

A bounded one-hour session draft preserves work through sign-in and checkout. Account-owned drafts wait for the matching account before display and clear on account changes. Cloud history is written only on explicit Save. The homepage checkout return is allowlisted exactly as `/?resume=checkout`; arbitrary redirects remain blocked.

## Language and accessibility

The first server render selects English, Russian, or Spanish from a saved cookie or the browser's weighted Accept-Language header. English is the fallback. A visible switcher remembers an explicit choice. Switching languages preserves task details and maps selected answers to their translated equivalents. No geolocation permission or location lookup is used. New interface copy is authored separately in the three languages; this is not a certification of independent native-speaker review of every legacy page.

The design uses warm neutrals, muted greens, large labeled controls, keyboard focus, reduced-motion support, and a small illustrative example. Rotating starting ideas pause on focus and have an explicit pause control.

## NCLEX example

“Prepare me for the NCLEX” asks for RN/PN, preparation time, and daily study time. A supplied duration is not asked again. The generated instructions request an assessment, a multi-month schedule, one lesson at a time, original practice questions with rationales after the learner answers, weak-area review, and a portable progress checkpoint. They refer to the [official test plans](https://www.nclex.com/test-plans.page) and [preparation resources](https://www.nclex.com/prepare.page). This is an AI tutoring request, not an official NCLEX course or a guarantee of passing.

## Verification

On November 1, 2026, a real anonymous local request returned HTTP 200 and a 2,181-character NCLEX-RN teaching prompt preserving the three-month period and one-hour daily study time. A signed-in browser request produced a real thank-you message. Manual editing, Copy, explicit Save, and recovery after reload were checked against that result.

Automated checks cover negotiation, translation key coverage, supplied study duration, prompt versus answer modes, unconfirmed-profile exclusion, draft bounds, exact checkout return, origin validation, trial exhaustion, concurrent attempts, failure release, model-override exclusion, and production failure without trusted headers/storage.

The full automated suite passed all 154 tests. The production build completed successfully, including type checks and page generation. Local HTTP checks returned 200 with the correct initial language for English, Russian, and Spanish; the payment-confirmation page also returned 200. Same-origin checks were verified for both localhost and the loopback address without allowing a foreign website.

At a 390-pixel mobile viewport, the English and Russian homepages and Spanish study details had no horizontal overflow. Language switching preserved the selected NCLEX-RN and daily-study answers. A custom study-time answer survived reload, while clearing the idea removed its stale draft. The final preview tab reported no browser errors during these checks. These checks establish the observed local behavior, not a guarantee that every production configuration or user journey is error-free.

The earlier PostHog report describes the signup-first funnel. Guest-first conversion needs a separate cohort analysis before comparing those conversion rates. Analytics ingestion, independent translation review, and remote Redis behavior are not established by local UI tests. Run the production configuration checks and verify deployment callbacks before publishing this rebuild.
