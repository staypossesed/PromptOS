# Private prompt generator

This replaces the cancelled study-coach feature. Its page is `/admin-generator`, with a private dashboard/sidebar entry for the designated account. The former `/study-coach` page and API are removed.

## Access and scope

Only a Supabase-verified, non-anonymous account with the exact normalized email **vanarnold.etsy@gmail.com** can open the page or use either API method. The page, middleware and API check access independently. General `ADMIN_EMAILS` membership does not grant access; this feature does not grant platform administration privileges. Email aliases and client-supplied identity metadata cannot bypass the guard.

The generator returns a prompt for general tasks, images, writing or coding. It preserves the user's requested subject/style and applies no additional application content-screening step. The selected upstream provider/model can still refuse or filter a request; no unrestricted-output guarantee is made and no alternate model is silently substituted.

## Providers

- **Venice Uncensored** uses OpenRouter model ID `cognitivecomputations/dolphin-mistral-24b-venice-edition` and requires the server-only `OPENROUTER_API_KEY`.
- **Configured default** uses the app's existing provider/model settings and that provider's server key.
- No keys are entered, exposed or stored in the browser.
- Configuration presence is distinct from verified connectivity. **Check API connection** sends one tiny, explicit provider request and displays its successful check time.
- The provider's balance, rate limits, model availability and output restrictions still apply.

## API behavior

`GET /api/admin-generator` returns only safe model configuration metadata to the authorized account. `POST` accepts either `check` or `generate`, a server-allowlisted model choice, and bounded generator fields. Client-selected system instructions, API URLs, credentials and arbitrary model IDs are not used.

POST requests must be same-origin JSON and stay within 32 KB. Ideas are limited to 6,000 characters; additional constraints to 2,000. Requests have separate burst/daily limits, provider timeouts, bounded responses, cancellation and zero automatic retries. A successful generation is not recorded in normal prompt history, analytics or generation-run logs.

Missing keys, provider authentication/balance/rate errors, unavailable models, refusals, empty responses, truncation and language mismatches return explicit safe error codes. Raw upstream error details and credentials are never returned. The UI retains the prior prompt and draft on failure and never presents an API error or refusal as a generated prompt.

## Validation and deployment

Offline API tests use synthetic identities, mocked provider results and transport fixtures. They cover allowlist enforcement, malformed/oversized input, provider selection, failure mapping, cancellation and prompt preservation rules. They do not certify live credentials, credits, provider availability or unrestricted output.

Git-triggered Vercel deployments and comments remain disabled. Commit/build checks do not authorize deployment. A real signed-in check and generation through the deployed feature remain separate acceptance checks; run them only after the user explicitly requests a deployment.
