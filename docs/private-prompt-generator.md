# Private prompt generator

This replaces the cancelled study-coach feature. Its page is `/admin-generator`, with a private dashboard/sidebar entry for the designated account. The former `/study-coach` page and API are removed.

## Access and scope

Only a Supabase-verified, non-anonymous account with the exact normalized email **vanarnold.etsy@gmail.com** can open the page or use either API method. The page, middleware and API check access independently. General `ADMIN_EMAILS` membership does not grant access; this feature does not grant platform administration privileges. Email aliases and client-supplied identity metadata cannot bypass the guard.

The generator returns a prompt for general tasks, images, writing or coding. It preserves the user's requested subject/style and applies no additional application content-screening step. The selected upstream provider/model can still refuse or filter a request; no unrestricted-output guarantee is made and no alternate model is silently substituted.

## Server instructions and user ideas

The detailed, approved prompt-writing instructions live in `lib/admin-generator/system-prompt.ts`. The private route sends those instructions through the AI SDK's `system` field and sends only the user's idea and constraints as JSON in its `prompt` field, which the SDK serializes as a separate user message. Input parsing/types live in `input.ts` so the client does not import the server template. Client-supplied system instructions are ignored.

The template preserves subject, tone, intensity, facts, tool fit and the explicitly selected output language. It is adapted to this single-submit interface: missing essential facts become placeholders instead of an unanswered clarification question. Request format, negative-prompt selection and language are server-owned instructions. The tiny connection check retains its fixed `OK` system and user messages and never includes the private draft or detailed template. The template does not disable upstream provider restrictions.

## Providers

- **Venice Uncensored** uses OpenRouter model ID `cognitivecomputations/dolphin-mistral-24b-venice-edition` and requires the server-only `OPENROUTER_API_KEY`.
- **Claude is selected by default** and reuses the existing server-only `ANTHROPIC_API_KEY`. It respects an existing Anthropic model selection; if the main app uses a different provider, this private option explicitly selects the already-registered Claude Sonnet 4.6 model. The displayed provider and model ID identify the actual selection. No global app defaults are changed.
- No keys are entered, exposed or stored in the browser.
- Configuration presence is distinct from verified connectivity. **Check API connection** sends one tiny, explicit provider request and displays its successful check time.
- The provider's balance, rate limits, model availability and output restrictions still apply.

## API behavior

`GET /api/admin-generator` returns only safe model configuration metadata to the authorized account. `POST` accepts either `check` or `generate`, a server-allowlisted model choice, and bounded generator fields. Client-selected system instructions, API URLs, credentials and arbitrary model IDs are not used.

POST requests must be same-origin JSON and stay within 32 KB. Ideas are limited to 6,000 characters; additional constraints to 2,000. The verified owner has no Umprompt daily, per-minute, subscription or credit quota in this private endpoint. It does not call the shared quota service or require Upstash Redis. Other accounts remain forbidden; normal app quotas remain in force elsewhere. Provider timeouts, bounded responses, cancellation and zero automatic retries still apply. A successful generation is not recorded in normal prompt history, analytics or generation-run logs.

Missing keys, provider authentication/balance/rate errors, unavailable models, refusals, empty responses, truncation and language mismatches return explicit safe error codes. Raw upstream error details and credentials are never returned. The UI retains the prior prompt and draft on failure and never presents an API error or refusal as a generated prompt.

## Validation and deployment

Offline API tests use synthetic identities, mocked provider results and transport fixtures. They cover allowlist enforcement, more than 200 consecutive owner generations without app quotas, malformed/oversized input, direct Claude and optional Venice SDK transports, provider selection, failure mapping, cancellation and prompt preservation rules. They do not certify live credentials, credits, provider availability or unrestricted output.

Git-triggered Vercel deployments and comments remain disabled. Commit/build checks do not authorize deployment. A real signed-in check and generation through the deployed feature remain separate acceptance checks; run them only after the user explicitly requests a deployment.
