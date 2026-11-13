# Chrome extension 0.2.0 — premium interface

November 8, 2026 (Arizona). **Version 0.2.0 was uploaded to the existing Chrome Web Store item and submitted to Google. The dashboard confirms Pending review.** The Package page shows draft 0.2.0 and published 0.1.3; the redesigned release is not yet published. A website deployment cannot update installed store copies.

Submission verified November 9, 2026 at 05:21 UTC. Item: `nfbmeonaffiaicoiahbmmocbkbhekbin`. The dashboard displayed “Your extension was submitted for review”, followed by “This draft is pending review.” No new permissions or legal declarations were accepted. Automatic publication was not independently reconfirmed after submission; approval and public availability must be verified separately.

## Result

The extension uses the website's warm paper, sage and deep-green direction, expressive serif headings, a stronger wordmark, compact navigation, consistent cards, clear primary actions and reduced-motion-aware transitions. The compose, result, history, empty-history and sign-in states have been redesigned for the narrow browser panel. English, Russian and Spanish copy is included. No remote font, image or script service was added.

The original idea remains fully visible and becomes editable only through Edit. Its editor grows with the complete text; Cancel restores the previous draft. Generated results stay read-only until Edit. Formatting is rendered through React elements for headings, lists, emphasis and code; model HTML and links remain inert text. Copy and Save use the original prompt string, including Markdown, rather than the display's markup.

An example is optional and collapsed before use. It disappears after a generation attempt and is absent from generated results. Choosing an inspiration example focuses the input and leaves category selection automatic, avoiding a previously inferred category remaining attached to a different idea. Explicit task-category selection remains available in More details.

The criteria-based optimization action remains visible in the quality card. A score is an estimate, with the existing disclaimer. Copy, explicit Save, Simplify and Previous version remain separate actions. No floating action overlay covers the quality controls; the result opens at the top after generation. Duplicate visual copy/save notices are suppressed while accessible status messages remain.

Authentication logic, PKCE callbacks, owner-scoped drafts, production endpoints, permissions and storage schema are unchanged. There are no content scripts, page readers, new analytics, new AI recipients or expanded host permissions. Website autocomplete is not bundled into this design release.

## Verification

The full offline regression suite passed **279 tests**, including the existing extension/authentication/recovery checks and four new tests for localization and safe formatted output. The extension build and project-wide TypeScript validation passed. The final package was checked separately for its permission boundary, executable sources, file list, attribution and absence of server-only configuration.

The actual bundled panel source was exercised in an isolated browser preview with synthetic authentication, AI responses, quality scores and saved history. **24 distinct layouts** cover compose, result, history and signed-out states in EN/RU/ES at actual **320px and 420px** widths, without horizontal overflow. A requested narrower size still produced 320px in the browser, so an actual 280px visual test is not claimed.

Observed workflows included choosing an example, explicit source editing/Cancel, full-height source text, read-only result/Edit/Done, exact raw-text clipboard copying, rescoring, optimization using quality feedback, explicit Save/history/reopen, Simplify/Previous version, failure recovery and Google/GitHub entry buttons restoring a synthetic account draft. Empty history was also checked. These UI checks **do not establish real production OAuth, AI response quality or live account persistence**; no real credentials, payment or private user history was used.

One initial failure-recovery assertion read a redacted placeholder from the browser tool's textarea getter. Its raw boolean was therefore not treated as a product failure or a passing exact-value test. A repeat checked the visible 54-character input, counter, enabled editor, AX state and screenshot after the intentional synthetic 503, followed by successful retry. This distinction is recorded in `extension-premium-ui-verification.json`; the exact getter assertion remains inconclusive.

The existing standalone Chromium E2E scripts were adapted for collapsed examples, formatted display text and version-independent update checks. They were **not rerun as native installed-extension tests in this redesign workflow**. The CUA preview checks and offline tests are reported separately rather than represented as a fresh installed-store smoke test.

## Artifacts and release

- Package: `extension/artifacts/umprompt-chrome-0.2.0.zip`, containing the manifest at its root.
- Unpacked build: `extension/dist/chrome`.
- UI evidence: `docs/extension-premium-ui-verification.json`.
- Package hashes and final preflight: `docs/extension-premium-package.json`.

This version was submitted to the existing item `nfbmeonaffiaicoiahbmmocbkbhekbin`, retaining its store identity and sign-in callback. Building an unpacked folder at another path can assign a different development ID; the store callback must not be replaced to accommodate that development ID. A fresh native installed-extension smoke check of sign-in, generation, Copy and explicit Save/History remains outstanding for this redesign. Google review and public availability must be verified separately.
