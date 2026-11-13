# Optional writing suggestions

**Current specifications:** [offline word completion and exhaustive vocabulary coverage](offline-word-completion.md) and [contextual AI autocomplete](contextual-autocomplete.md). The dated notes below retain earlier verification history; their checkbox UI, smaller word lists, timing and limit values are superseded by those specifications. The current UI uses a visible enable button and consent version 2, supports 4,000-character ideas, and offers instant local word completion without AI permission.

The main idea field on the homepage, empty builder, and message landing page now offers inline word completions. It remains one ordinary editable textarea. Tab or **Add word** accepts one word; **Add all** accepts the whole visible continuation. Suggestions never replace the original text or submit the task. A visible Undo restores the previous input. Enter inserts a newline, Shift-Tab moves focus backward, Tab moves focus when there is no suggestion, and Escape hides the current suggestion.

## Privacy decision

Reviewed English, Russian, and Spanish example phrases match locally by default. No draft is transmitted for this local matching. The **AI writing suggestions** checkbox opens a disclosure and requires a separate **Allow for this tab** action before any cloud completion request. Consent is scoped to the account and tab and can be disabled anytime. Only this permission is stored by this feature, not its request cache or text; existing task-draft recovery is separate.

After consent, a pause of at least 650 ms can send the current idea field, detected input language, and consent version to `/api/writing/complete`. The configured AI provider/model is reused; no new provider or credential is introduced. Other fields, profiles, answers, clipboard data, and page contents are excluded. This endpoint does not save or log drafts or completions. It records no content in analytics. Explicit acceptance uses the existing metadata-only suggestion event with source and languages. The site's existing PostHog autocapture and session recording remain disabled.

Both client and server suppress apparent credentials, email addresses and numeric identifiers. Detection is incomplete: users should avoid sensitive details. Turning off cancels pending browser requests and prevents new ones, but cannot retract text already sent to a provider. Providers' own processing policies apply. The full disclosure is linked at `/privacy#writing-suggestions`.

## Behavior and cost controls

- Local matches are computed during the input render with no deliberate delay. Cloud requests wait at least 250 ms and are spaced at least 1,200 ms apart. Cloud completions still incur provider/network latency.
- Local matching handles grammatical request variants, partial words, case, repeated spaces, unaccented Spanish, and supported task/connector patterns. It is an on-device phrase assistant, not an offline general language model. Arbitrary requests may have no local match; broader AI completions require the existing explicit consent.
- An AI continuation is retained instantly when the user types through its proposed next words, without another cloud request for each letter. A changed task discards it.
- A finished sentence, selection, caret in the middle, composition input, or unfocused field does not trigger a cloud continuation.
- Prefixes are bounded to 1,200 characters and completions to 100 characters/12 words. Completed tasks retain their existing 4,000-character input limit.
- Old requests are cancelled and versioned; a result for previous text cannot become the current suggestion.
- A 20-entry in-memory cache is cleared when cloud help is disabled. It is never persisted.
- Same-origin, bounded JSON input, exact consent version, and separate hashed-network Redis limits protect the public endpoint: 30/minute and 120/day. This does not reserve or consume the free completed-task allowance. Shared networks share these suggestion limits.
- Production fails closed without trusted Vercel address headers and Redis. Rate limiting pauses further browser cloud requests for at least a minute. Errors never disable normal input or Continue.

## Verification — November 5, 2026

The full automated suite passed **211 tests**, including 30 writing utility/route checks and 10 isolated React interaction cases plus their parent test. Interaction cases cover explicit consent, acceptance/undo, stale replies, opt-out cancellation, account change, composition, caret position, ordinary keyboard behavior, private identifiers, rate limits, and offline recovery. The React renderer does not use or control a real browser.

The final production evaluation at **https://www.umprompt.com** made **20 real provider requests** with synthetic task text: eight English, six Russian, six Spanish, including mismatched interface/input languages. All returned nonempty structurally valid continuations. Every combined request was manually read against its criterion: it remained on task, in the input language, and preserved supplied restrictions. Examples include NCLEX study planning, an honest deadline email, Sunday-free planning, vegetarian meals, and product-chatbot instructions without invented facts. These observations do not guarantee every future completion is appropriate; acceptance always remains optional.

The production median HTTP/provider latency was **1,734 ms**, p95 **2,174 ms**; add the 650 ms input pause for the visible cloud experience. Local matching does not incur this provider delay. See [the recorded evaluation](writing-suggestions-evaluation.json) for all 20 actual outputs and review notes. The preceding local configured-model run also passed all 20 cases (median 1,401 ms). Earlier experiments exposed unrequested implementation constraints and awkward phrases; they are not presented as final passing evidence.

Vercel deployment `dpl_2hd96B4dnrRjpC4auVTYecmcEeL2` reached **READY** and was confirmed aliased to both `www.umprompt.com` and `umprompt.com`. Eight additional [live HTTP checks](writing-release-checks.json) passed: three localized homepages with an unchecked cloud toggle, the published privacy disclosure, rejection without consent, rejection of a foreign origin, rejection of private-context overrides, and suppression of apparent identifiers. These do not prove visual layout or native browser behavior. Repeat them with `node scripts/check-writing-release.cjs`.

The production Next.js build passed compilation, type checks, and page generation. Small security patch updates accompany this release (Next.js 15.5.28 and DOMPurify 3.4.17); this is not a clean security-audit certification of all dependencies.

The November 5 pass could not complete browser verification. The following follow-up supersedes that limitation for the specific checks recorded below.

## Instant-suggestion correction — November 6, 2026

The founder reported that `help me to write a` produced no suggestion. The original exact sentence lookup missed the extra `to`, and its 350 ms timer made even matching phrases wait. The corrected local path runs during render and supports grammatical starter variants and partial words. Optional cloud controls are collapsed by default, with a clear device-only status. The original consent requirement remains unchanged.

The full suite passed **237 automated tests** and the production build passed. Twenty local-request regression cases cover the founder's exact phrase, uppercase, repeated spaces, `please`, `can you`, `I want to`, `I need to`, NCLEX, weekly planning, Russian requests including `Помоги мне`, unaccented Spanish, meals/travel, and chatbot instructions. Two hundred local prediction measurements had p95 **0.229 ms**, maximum **1.453 ms**, on the test machine. This measures local CPU only, not browser paint time.

In the actual in-app browser, all **20 phrases** displayed a local suggestion without enabling cloud help. The exact founder phrase showed `polite email asking for an update.` Both the Add button and Tab inserted the continuation. The explicit Undo button and native Ctrl/Cmd-Z restored the original input. Moving the caret to the middle hid the preview. A narrow Russian interface with an English idea showed a readable preview and no horizontal overflow; the browser reported an actual 520 CSS-pixel viewport despite a narrower requested override, so a 390-pixel phone test is not claimed. The temporary viewport override was reset afterward.

The first development-page load had a script parse error and did not hydrate. A fresh reload recovered, and subsequent UI checks used the hydrated page. This recovery is recorded rather than counted as a passing first load.

Production deployment `dpl_5vMd2Xe9bzUNtwud1qFMhn9bgb95` reached READY and was confirmed aliased to `www.umprompt.com` and `umprompt.com`. The updated eight HTTP protection/localization checks passed. In the live in-app browser, all 20 phrases again displayed a **local** continuation with cloud suggestions disabled, including English and Spanish text in the Russian interface. Tab acceptance and native undo passed on the live form as well. See [the recorded live browser cases](instant-writing-browser-checks.json). A screenshot of the exact founder phrase was captured from the live page. These observations cover the recorded cases, not every arbitrary request or every device.

## Repeatable checks

```sh
npm test
npm run build
npm run eval:writing -- --base-url http://localhost:3000 --output docs/writing-suggestions-evaluation.json
```

The evaluation makes real provider requests using synthetic text and an explicit consent flag. Read every output after rerunning it: the automated checks prove bounds and structure, not semantic quality. It does not create accounts, purchase a plan, save history, or spend a completed-task allowance.

This release changes the website's main idea field. The separate Chrome extension package is unchanged.

## Word-by-word release — November 6, 2026

The first-letter bug is covered explicitly: `f` in a Russian UI immediately displays an English inline completion to `find`. The minimum three-character gate is removed. An authored EN/RU/ES word index and short context sequences now complete partial words inside arbitrary sentences, beyond whole-starter matching. Context assists ranking but this local engine is not a general language model; unknown vocabulary can still have no local match. Cloud completion remains opt-in and is not represented as instantaneous.

Tab accepts exactly one word with the appropriate boundary. Repeated Tab advances the continuation, and the full-accept button remains available. The duplicated green text card is removed; the completion lives in the writing line and a compact control row states which word will be inserted. Native text remains unchanged until acceptance.

The scoped [Cotypist review](cotypist-reference-review.md) explains the studied behavior, shortcuts, privacy, product differences, and design choices. The full automated suite passed **259 tests**, the production build passed, and 20 new cases were checked in the actual local browser. Existing longer-starter cases remain covered. Live release confirmation is recorded after deployment.
