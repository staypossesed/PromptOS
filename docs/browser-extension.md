# Umprompt Chrome Extension

## Scope

Manifest V3 extension with a toolbar-opened side panel. It expands ideas into prompts rather
than answering the task. Optimize my request, Simplify, Copy, previous-version restoration,
explicit Save, task suggestions, an independent Example tab, and private history are included.
The interface supports English, Russian, and Spanish and respects reduced-motion preferences.

Generated and reopened prompts are read-only in **Your prompt**, in both the side panel and
website builder. A small **Edit** control enables manual editing; **Done**, Copy, or a
successful Save restores read-only view. After generation, the original idea is a read-only
summary. **New prompt** in the panel or **New idea** on the website starts a separate task
without changing saved history. Copy, Save, and Simplify use the current result text. Typing
makes no new AI request and does not save to cloud history. The extension keeps edits in its
local account-scoped draft, including after the panel closes. On the website, use **Save**
before leaving or refreshing to retain edits in history.

**Optimize my request** is the input action. It expands the original idea and selected
details; it never optimizes the output. A one-character request remains beside input
validation instead of becoming an editable error response. Old one-character drafts reopen
the request step, preserving their stored text but hiding the unusable result. Replacing
such a request and generating again creates a result tied to the new idea; an explicit Save
creates a new record rather than silently overwriting the old saved request.

The first change in an editing session keeps the previous text as a **Manual edit** version,
not a version for every keystroke. Up to five previous versions can be recovered. Clearing
the result leaves the editor available, while Copy, Save, and Simplify are disabled
until there is text again. Edits invalidate the website's old quality score. The result is
temporarily locked during generation, loading, and saving to prevent those
operations from overwriting concurrent edits. Prompts are limited to 16,000 characters.
Accidental one-character ideas are rejected before generation or clarification consumes AI
usage; short meaningful topics such as `AI` or `UX` remain accepted.

The extension uses the same Supabase project, AI services, generation allowance, and paid
entitlements as the website. No new SQL migration is required. Profile application, playbooks,
prompt packs, automatic page reading, and automatic insertion into other websites are not
part of this first version. A prompt opened from history becomes a new local draft; refining
and saving it does not silently overwrite the original website record or its private context.

## Local Installation

1. At the project root, run `npm ci`, then `npm run extension:build -- --local`.
2. Run the website on port 3000 with `npm run dev -- --port 3000`.
3. In Chrome, open `chrome://extensions` and enable **Developer mode**.
4. Choose **Load unpacked** and select `extension/dist/chrome-local`.
5. Pin Umprompt using Chrome's extensions menu, then click its icon to open the side panel.
6. Expand **Connection details** below the sign-in buttons and copy **Sign-in callback**.
7. In Supabase, open **Authentication > URL Configuration > Redirect URLs** and add that
   exact URL, for example `https://<extension-id>.chromiumapp.org/auth`.
8. Do not replace the production Site URL. Do not allow all `chromiumapp.org` addresses.
9. In the panel, use Google or GitHub to connect the same Umprompt account as the website.

The website login and extension login are separate sessions on the same account. PKCE is
handled by the bundled Supabase SDK. Existing Google/GitHub providers and their Supabase
provider callbacks remain unchanged. A callback not on the allowlist can redirect to the
website instead of returning to the extension. That website cannot exchange the extension's
PKCE code because its verifier stays in extension storage; this is not a website-login failure.
If Chrome shows an unfinished sign-in page, close it and verify the exact extension callback
before trying again. The same callback entry covers both Google and GitHub.

After rebuilding, click **Reload** on Umprompt's card in `chrome://extensions`, then close
and reopen the side panel. Keep the same unpacked folder so the extension ID stays unchanged.
Reload the extension itself, not just the panel or website: Chrome keeps the old manifest
and connection policy until the extension reloads. Version 0.1.2 checks the active manifest
before backend requests and offers **Reload extension** if it still points to the previous
backend. That action first keeps the current local draft, then reloads the extension;
it does not sign out, remove the account draft, or change saved history.
If sign-in fails before a provider opens, the panel distinguishes an unavailable worker,
an already-open sign-in window, a page-loading failure, and an unavailable browser window.
Only an actual return-address error automatically opens the callback details. Other failures
include a safe `AUTH_*` reference in **Connection details**, without provider URLs or tokens.
Do not change Supabase's return addresses to fix a worker or window-launch error.

An unpacked extension ID depends on its installation path unless its manifest has a public
key. Moving the built folder can change its ID. Recheck the callback when moving the folder,
switching between local and production packages, or preparing the store release.

## Production Build and Deployment

`npm run extension:build` produces `extension/dist/chrome` and targets
`https://www.umprompt.com`. Only `NEXT_PUBLIC_SUPABASE_URL` and a public anon/publishable
key enter the package. AI, Stripe, and service-role secrets remain server-side. The build
rejects a service-role key incorrectly placed in the public-key setting.

Before the production package can work, deploy the new `/api/extension/*` backend routes
and updated privacy policy to Vercel. Building the package does not deploy either the website
or the extension. A local package requires the local server to be running.

Once the live backend has passed verification, `npm run extension:build -- --live-in-place`
switches the existing `extension/dist/chrome-local` installation to the live site. It leaves
the installation path and extension ID unchanged, preserving the registered callback,
session, and account-scoped drafts. Reload that existing extension instead of moving its
folder or removing it. The separately built `chrome` folder has its own unpacked ID and
requires its own exact callback if installed independently.

The recovery release updates Next.js and its lint configuration to the patched 15.5.27
maintenance line and applies compatible dependency security fixes. Critical findings are
removed. The store security review patches nested PostCSS and adds bounded provider
responses and shared generation rate limiting. The current audit still reports 16 affected
dependency entries, including eight high-severity findings. Scoped checks exclude those
high findings from extension inputs and deployed server traces, but this is not a clean
audit. See `docs/extension-security-review.md` for mitigations, evidence, and follow-up.

Chrome Web Store version 0.1.2 was submitted on October 11, 2026. The verified dashboard
status is **Pending review**, with automatic publication after approval selected. Store ID:
`nfbmeonaffiaicoiahbmmocbkbhekbin`. Submission is not approval or public availability.

The panel checks the public, uncached `/api/extension/health` protocol before enabling AI,
Save, or History. Opening the panel never calls AI or saves a prompt. A missing backend,
stopped local server, invalid response, expired login, cancellation, rate limit, and failed
Save have distinct messages. Retry and reconnect preserve the current draft. The health
response exposes no account data, credentials, provider configuration, or billing data.

For store submission:

1. Create or use the founder-owned Chrome Web Store developer account.
2. Create a draft listing and obtain the store-assigned extension ID.
3. Add that ID's exact auth callback to Supabase. Retrieve the public manifest key from the
   developer dashboard for a pre-release package that must share the store ID.
4. Rebuild the production package, test its real login and account journey, and ZIP the
   contents of `extension/dist/chrome`, with `manifest.json` at the archive root.
5. Upload screenshots, store copy, permission justifications, reviewer instructions, and the
   deployed privacy URL. See `extension/store-listing.md`.
6. Submit for review only after approval. Store review and publication are separate from Vercel.

Never ZIP the repository, `.env.local`, test browser profiles, screenshots, or source maps.
The normal package contains only the generated manifest, packaged JS/CSS/HTML, and brand icons.
The build also includes dependency license notices. Review final package attribution before
store submission; package metadata does not replace a dependency's license terms.

## Verification

Run:

```bash
npm test
node node_modules/typescript/bin/tsc --noEmit --incremental false
npm run build
node node_modules/playwright/cli.js install chromium
npm run extension:test
node scripts/test-prompt-editor.cjs
npm run extension:build
node scripts/test-extension-update.cjs
node scripts/check-extension-signin.cjs
node scripts/check-extension-backend.cjs
node scripts/check-extension-backend.cjs --installed
```

The browser test builds a separate local package into a temporary directory and installs it
into a fresh Chromium profile; it never rewrites the existing installation folder. It uses fixtures
for OAuth, AI responses, entitlements, and persistence: no production login, AI call, payment,
or private user-history access. It exercises the real bundled PKCE SDK with a fixture callback,
then request-only optimization, read-only/Edit/Done states, legacy short-request recovery,
simplification, copying, version restoration, explicit Save,
Save retries, history, reopening the draft, errors, cancellation, quota exhaustion, expiration,
token refresh, sign-out, and 420/320/280px layouts in all three languages. Screenshots go to
`extension/artifacts`. Temporary browser profiles are not included in release archives.

The website editor check mounts the actual builder, editor, version controls, and translations
with isolated navigation, account, and API fixtures. It verifies read-only/Edit/Done states,
input-only optimization, recovery of an old `f` request without stale results, manual typing while scoring,
stale-score cancellation, edited Copy and Download, explicit Save/update/reopen, refinement
using edited text, clear/restore, and English/Spanish/Russian desktop and mobile layouts with
the packaged Geist font. It does not prove live account persistence or test the outer app
layout; it never sends AI requests or accesses a real account.

The backend check installs a production-targeted package into a fresh empty Chromium
profile and contacts the real live site without fixtures. It confirms healthy startup,
no prompt-operation error, a protected private status endpoint, and no automatic AI or
Save request. `--installed` checks the existing installation folder and callback ID after
`--live-in-place`. It does not authenticate or verify private persistence.

The update check needs the local website running on port 3000 and a freshly built production
package. It starts a local extension in an isolated Developer-mode Chromium profile, replaces
its files with the production package without an extension reload, and checks that the old
active policy produces a reload notice instead of blocked requests. Clicking **Reload extension**
must retain the latest typed draft and extension ID, apply the live policy, and reach the
real production health endpoint without script or CSP errors. This is an update acceptance
test, not proof of successful Google/GitHub login, AI generation, or account persistence.

The separate sign-in window check uses the real Chrome Identity API and live Google/GitHub
authorization pages in a fresh temporary profile. It opens each provider's signed-out form
and closes it without entering credentials. It checks cancellation, retry, and preservation
of the draft. It does not prove successful sign-in, account linking, or token exchange.
The test never connects to an existing personal Chrome profile.

Release acceptance with a dedicated test account:

- Real Google and GitHub login each returns to the panel; the account matches the website.
- Expand and Simplify consume the existing generation allowance. Paid entitlements match.
- Copy alone does not create a saved prompt.
- Save creates one prompt visible in the website's History; refining and saving the same
  local draft updates that same record, including after closing and reopening the panel.
- A different account cannot see or overwrite that record. Verify real database RLS, not
  only application mocks.
- Interrupted or malformed generation preserves the previous result. Closing during a
  generation cancels the panel request; it does not promise a background job will finish.
- Session expiry offers sign-in while preserving the account-scoped draft. Explicit sign-out
  removes the current account's local draft and tokens, not cloud history.
- Keyboard focus, zoom, reduced motion, narrow side panels, and store-installed toolbar
  opening work in real Chrome. Edge needs its own installation and auth callback check.

## Security and Data

- The server verifies the Supabase bearer token. Cookie-only requests to extension routes
  are rejected; browser origins are not treated as authentication.
- Shared server handlers retain the website's billing, generation, scoring, and optimization
  gates. Private database queries use the user's JWT and existing row-level security.
- Save uses an authenticated owner and a stable UUID. Upsert relies on both existing-row
  ownership and new-row ownership checks in `supabase/schema.sql`.
- No content scripts, all-sites access, external message bridge, browsing-history access,
  clipboard reading, remote executable code, or extension analytics are included.
- Local extension storage contains the session and drafts; it is not an encrypted vault.
  Storage is limited to trusted extension contexts. Do not paste credentials or unnecessary
  sensitive details into prompts. Account-specific drafts never go into browser sync storage.
- Old prompt versions are retained locally and saved only explicitly; they are removed from
  the AI request. Private website context profiles are not automatically applied.
- Unsaved prompts can still have generation diagnostics on Umprompt's server. "Not in saved
  history" does not mean "never stored anywhere." The privacy page explains this distinction.

## Official References

- [Chrome Side Panel API](https://developer.chrome.com/docs/extensions/reference/api/sidePanel)
- [Chrome Identity API](https://developer.chrome.com/docs/extensions/reference/api/identity)
- [Supabase PKCE](https://supabase.com/docs/guides/auth/sessions/pkce-flow)
- [Supabase redirect allowlist](https://supabase.com/docs/guides/auth/redirect-urls)
- [Chrome host permissions](https://developer.chrome.com/docs/extensions/develop/concepts/network-requests)
- [Chrome store publishing](https://developer.chrome.com/docs/webstore/publish)
