# Chrome Web Store Release

The dashboard's Published package was independently observed as **0.1.2** on October 14,
2026. Update **0.1.3** was uploaded and submitted on October 14. Google confirmed
"Your extension was submitted for review" and **Pending review**. Automatic publication
after approval is selected. The update is not approved or published yet.
See `docs/extension-security-review.md` for the previous scoped security review.

## Listing

Name: Umprompt - AI Prompt Helper

Summary: Expand rough ideas into clear AI prompts. Optimize, simplify, copy, and save to your Umprompt history.

Description:

Turn a rough idea into a clear, detailed prompt for your preferred AI assistant, directly
from a browser side panel.

Type or paste your idea, choose Optimize my request, and copy the prepared prompt. Your
complete original idea stays visible. Choose Edit to add a forgotten detail, or Cancel
changes to return to the previous result.

Results are read-only until you choose Edit. Use Quality check to see feedback across
clarity, context, constraints, examples, output format, and tool fit. Optimize using
feedback improves the current prompt using those criteria. Simplify the language or
return to a previous version.

An introductory example shows what to expect before you start and disappears once you
submit your idea.

Save only the prompts you choose. They appear in the same private Umprompt history used
by the website. Your unfinished draft stays on the device when the panel closes.

Sign in with your existing Umprompt Google or GitHub account. The same free allowance and
paid account apply; the extension does not provide unlimited free AI generation.

Available in English, Russian, and Spanish. The extension does not answer your task itself,
read websites automatically, or insert text into other websites. Quality scores are
estimates, not guarantees of an AI assistant's answer.

Homepage: https://www.umprompt.com

Privacy URL: https://www.umprompt.com/privacy

Support: umpromptsupport@gmail.com

## Single Purpose

Help users turn their own rough ideas into clear, reusable AI prompts, with optional
editing, copying, and explicit saving to their Umprompt account.

## Release Preparation

- Update package: `extension/artifacts/umprompt-chrome-0.1.3.zip`.
- SHA-256: `7bde80de09fee899cc823f78afba24c2716a7bc52080b085c722215d9435958b`.
- No permission, OAuth callback, backend-origin, or account-access changes in 0.1.3.
- October 14 verification: 97 automated tests, TypeScript, production website build,
  production saved-result inspection, and actual website/panel UI flows against synthetic
  local AI/history fixtures. Checked full source text, explicit source editing/Cancel,
  no result Example tab, criteria optimization, score invalidation, failure recovery,
  versions, explicit saving, reopening, and narrow-panel layout. Native Chrome OAuth and
  real-provider output quality were not rerun for this update; existing acceptance results
  below belong to 0.1.2, not a fresh 0.1.3 sign-in test.
- Publisher/support account requested by the founder: `umpromptsupport@gmail.com`.
- Developer agreement and registration payment: completed by the founder; dashboard
  registration confirmation observed on October 11, 2026.
- Publisher ID: `dde4b186-0907-4d5f-a739-b75be6bbb404`.
- Publisher trader declaration: completed by the founder; dashboard confirmation observed.
  Complete any additional address/identity verification requested by Google before publishing.
- Google account 2-Step Verification: founder enabled it; subsequent package upload succeeded.
- Store item ID: `nfbmeonaffiaicoiahbmmocbkbhekbin`.
- Exact store-version Supabase return address:
  `https://nfbmeonaffiaicoiahbmmocbkbhekbin.chromiumapp.org/auth`.
  Founder reports adding this callback; successful real-account return is still unverified. Preserve existing return
  addresses and the production Site URL; do not use a wildcard Chromium callback.
- Listing description, English language, Tools category, homepage, green icon, and
  small promotional tile: saved in the store draft.
- Single-purpose description, permission justifications, no-remote-code selection,
  and privacy-policy URL: saved in the draft. Data categories selected: personally
  identifiable information, authentication information, personal communications, and
  website content. The founder explicitly approved all three publisher certifications;
  checked and saved in Google with "Item saved" confirmation. This is the publisher's
  declaration, not an independent legal-compliance or security certification.
- Publisher display name: `Umprompt`. Contact email `umpromptsupport@gmail.com`:
  dashboard shows Verified email address after founder completed the verification link.
- Separate acceptance package: `extension/dist/chrome-store-test`, using the store's
  public key without modifying the existing `chrome-local` installation or upload ZIP.
- `node scripts/check-extension-backend.cjs --store-test`: passed against the real live
  backend with store ID `nfbmeonaffiaicoiahbmmocbkbhekbin`. Healthy startup, no script/CSP
  errors, anonymous private API returns 401, and no automatic generation or saving.
  Empty isolated profile; this does not verify successful OAuth, AI output, or account saving.
- Real-account Google sign-in, generation, and saving in the store-test copy: founder
  reports "done and saved". This was not independently observed by the agent.
- GitHub sign-in: founder reports connecting without issues. Real screenshots show
  generated and explicitly saved results. Restart persistence is not independently observed.
- Store screenshots: two 1280x800 opaque PNG graphics uploaded using founder-supplied
  real interface excerpts. Local cropping/formatting was explicitly approved; account
  footers were excluded. No prompt results were fabricated.
- Reviewer access: saved private instructions describe public Google/GitHub sign-up,
  seven free weekly generations, and the full core workflow without purchase. No founder
  credentials or administrator access were disclosed; Google may request more access.
- Distribution: Public, all regions, optional in-app purchases disclosed.
- Scoped security review: documented in `docs/extension-security-review.md`. 89 tests,
  TypeScript, production build, extension regression checks, and reachability checks pass.
  Post-patch audit remains at 16 findings (8 high, 3 moderate, 5 low, 0 critical);
  remaining high findings are excluded from inspected extension inputs and deployed
  server traces. The reachable provider-response issue has a tested size-limit mitigation.
  This is not a clean audit or a penetration-test certification.
- Backend security deployment: `dpl_3VyCgv6off9ySSRfPwzovdzi5DuX`, Ready and
  aliased to `https://www.umprompt.com`. Store-ID live empty-profile startup rechecked.
- Historical submission: version 0.1.2 was submitted October 11; the Published package
  table now confirms 0.1.2. Version 0.1.3 is the pending update, not the live package.
- Previous monitor ID: `umprompt-chrome-review`; its status was not changed by this release.

### Store Identity for Isolated Acceptance Testing

The store-assigned ID differs from local unpacked extension IDs. For a separate
unpacked acceptance-test build, use Google's public key in that test build's manifest
to reproduce the store ID. Do not add it to the existing `chrome-local` installation:
doing so changes its identity and invalidates its existing callback/session assumptions.

Public key from the store Package tab (not a credential):

```text
-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAqE6HfafXQPtHgk0PktKv
25LqvQkoJJX6kS61Zp+zmlFMU44+3IX4wHri9T7dQGAzJ8xY1O2fx5UEyO7qSz1d
+lDo9hqX5IPKfOfx4gGi/z77zV8DUOR4Kmjj8Ogiw4bMuxahvM72mshP1g3eN1Lh
IGmOiicWUQw1dO2yEZTqLmFtq6CgDuHSo2NBGtzw8GMwjCve3oVSs/twpYCE2pLe
tWUB+jTHda/UuZvLC/Xe12oBjWhKNROCxMGlYAY+HBdeXuIsAynW1NmzP/Ke5jvS
XlApNLyMyAzi7nV5wKDs1iPM55OXbNl4tA/obic7gdsp28gp6AunzuH8OR/lEsbW
rwIDAQAB
-----END PUBLIC KEY-----
```

## Permission Justifications

- `sidePanel`: show the user-requested prompt workspace beside the current webpage.
- `storage`: retain the extension's sign-in session, language preference, and local draft.
- `identity`: complete a user-initiated Google/GitHub Supabase OAuth flow through Chrome's
  redirect URL, using PKCE. No access to the Chrome profile's email is requested.
- `clipboardWrite`: copy the prepared prompt when the user presses Copy. No clipboard read.
- `https://www.umprompt.com/*`: authenticated calls for expansion, scoring, optimization,
  account usage, explicit saving, and private saved history.
- Exact configured Supabase project origin: authentication, user verification, refresh,
  and sign-out. No other Supabase project or all-sites permission is needed.

## Privacy Declarations to Review Against the Final Package

Declare account identifiers and user-provided text/prompt content. Session credentials are
stored locally for authentication. Idea/context/result text is processed by Umprompt and its
configured Anthropic/OpenRouter provider. Explicitly saved prompts enter private cloud
history; generation diagnostics can exist separately. Drafts and sessions stay in local
extension storage, not browser sync storage. No advertising, sale of data, browsing-history
collection, passive clipboard collection, or extension analytics is implemented.

Do not select "no user data collected." Use the final dashboard's applicable data categories
and verify they match the deployed privacy policy. This document is a factual submission
draft, not a claim of certification or legal compliance.

## Assets and Reviewer Notes

- Use the existing green brand icons generated in the package.
- Prepared small promotional graphic: `extension/artifacts/store/promo-440x280.png`;
  440x280 PNG, showing the actual green brand rather than fabricated product screenshots.
- Prepared listing icon: `extension/artifacts/store/icon-128.png`.
- Submitted screenshot graphics: `extension/artifacts/store/screenshot-prompt-1280x800.png`
  and `extension/artifacts/store/screenshot-example-1280x800.png`. Real founder screenshot
  excerpts with account-email footers excluded; branded surrounding copy, not recreated UI.
- Reviewers can use open Google/GitHub registration for all core extension functions.
  Provide a dedicated non-admin account privately only if Google requests restricted access.
  Never include credentials in source, screenshots, public listing copy, or this document.
- Reviewer journey: inspect the introductory example, sign in, enter an idea, choose
  Optimize my request, confirm the example disappears, edit the original idea or cancel,
  choose Quality check / Optimize using feedback, edit the result then Done, simplify,
  restore a version, copy, Save, then open History. Website History shows the same saved item.
- Explain free limits and provide adequate test allowance. Do not initiate a paid purchase
  or ask reviewers to supply personal payment information.
