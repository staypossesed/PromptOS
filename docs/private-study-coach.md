# Private study coach

The feature lives at `/study-coach`. Its dashboard and sidebar entry appears only for the designated, verified account. `lib/study-coach/access.ts` restricts access to **vanarnold.etsy@gmail.com**; environment-based general admin membership does not grant access to this tool, and the tool does not grant broader platform administration rights.

Both the server-rendered page and `POST /api/study-coach` independently validate the current Supabase user with `auth.getUser()`. Anonymous users, different emails, unconfirmed emails, and client-supplied identity or system instructions cannot grant access. The middleware also protects the page. No additional database migration or environment variable is needed beyond the application's existing Supabase, configured AI provider, and production Upstash configuration.

## Learning flow

- Choose a topic, course length, and minutes per session, or paste a Progress Checkpoint.
- The coach asks 3–5 diagnostic questions before teaching Lesson 1 and waits for answers.
- Each numbered lesson covers one concept, followed by an exercise whose solution is withheld until the learner answers.
- Feedback explains what was correct, incorrect, and why. Weak areas receive a review every 3–4 lessons.
- **End session & make checkpoint** requests a complete checkpoint and checks that all required continuity fields are present. An unanswered exercise/diagnostic remains the next step.
- Copy the checkpoint before leaving. A new session resumes only from a checkpoint the learner pastes.

The coach's reusable system instructions are versioned in `lib/study-coach/system-prompt.ts`. The feature speaks English regardless of the surrounding interface language.

## Data and limits

Conversation messages exist in React memory and are sent to the configured AI provider only on explicit submission. This feature does not write chat history or progress to Supabase, local/session storage, analytics, or generation-run records. It does not promise reminders or memory between conversations. Signing out or changing accounts clears the in-memory conversation and cancels in-flight work.

Requests are same-origin JSON, bounded to 128 KB, 80 alternating user/assistant messages, and 64,000 characters. Client-authored system/tool messages are rejected. The UI requests a checkpoint before reaching the history limit rather than silently truncating earlier lessons. API calls have cancellation and a provider timeout, with 12 requests/minute and 200/day rate limits separate from normal prompt-generation allowance. Production rate limiting fails closed if distributed storage is unavailable.

## Validation

Run `node --test tests/study-coach.test.cjs tests/adam-feedback.test.cjs` on Node 22.13+ to verify the account gate, forged and oversized requests, role order, checkpoint completeness, cancellation, error privacy, and rate-limit handling. These tests use synthetic identities and mocked provider responses. They do not certify live model teaching quality, real-account authentication, or browser interactions.

Before treating the course behavior as verified, use the designated real account to complete a diagnostic, answer an exercise, request a review, end the session, copy the checkpoint, and resume it in a fresh session. Confirm another signed-in account cannot open the page or call the endpoint.
