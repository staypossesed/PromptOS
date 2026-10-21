# Frontend Redesign — Build Report

**Branch:** `redesign/frontend-v1`
**Base:** `backup/pre-redesign-frontend` (`6532f0e`)
**Direction:** C, “The printed annual” (`editorial-report`, seed 2095110185)
**Design authority:** `design-taste-frontend`

---

## 1. What was built

The old Tailwind/Radix/Framer Motion frontend was removed. The new interface is a hand-written CSS system with two self-hosted faces, a bottle-green ink, a yellow accent, square corners, flat surfaces, and a 42% reading axis.

- Landing page at `/` with a live prompt sheet and six score margin notes.
- `/builder` rebuilt as a two-page workspace: composer on the left, prompt document and score margin on the right.
- `/dashboard`, `/history`, `/library`, `/templates`, `/account`, `/plan`, `/plan/success`, `/login`, `/help`, `/privacy`, `/terms` rebuilt.
- `/admin/**` and `/model-lab` rebuilt as editorial ledgers.
- `/settings` redirects to `/account`; `/demo` redirects to `/`.
- The Chrome extension panel was rethemed to the same palette and square controls; its behaviour and API contract are unchanged.

The API routes, Supabase schema, Stripe flow, auth callback, rate limits, generation pipeline, and extension backend are unchanged.

## 2. Redraws

Three slots were redrawn for stated reasons. No other slot was changed.

1. **Hero:** the dealt hero was a two-by-two board. It was redrawn to a two-column live sheet plus margin notes, because the live thing needed the first screen and the score notes needed to be readable beside the document. Usability reason.
2. **Closing section:** the dealt section was “three photographs, then a field.” It was redrawn to one gutterless mosaic of the world of print plus a dark closing field. Asset reason: there is no honest three-photograph CTA sequence for a text tool, and one mosaic carries the idea without repeating it.
3. **Footer:** the dealt footer was “columns above, wordmark below.” It was kept, with a four-image colophon strip added on app pages so every page closes with the same world of print. System reason, not a redraw of the composition.

The palette and type system were adopted as dealt: Imbue + Albert Sans, `#f7f7f7` ground, `#ebebeb` surface, `#0d2a1c` ink, `#5f6b64` muted, `#f6e016` accent.

## 3. The idea and the live thing

> On this page, Umprompt’s six-dimension prompt score becomes the margin notes of a printed page: the visitor’s rough sentence is edited in public, and each correction is annotated in the margin.

The live thing is the hero sheet. A visitor types a rough sentence. The prompt document fills in Task, Context, Constraints, and Output. Six margin notes mark Clarity, Context, Constraints, Examples, Output format, and Tool fit as present or missing. It is deterministic and client-side; real generation still requires sign-in. Without JavaScript, the static example remains readable.

## 4. Pictures

The first build used four archival images in a landing mosaic and an app-footer colophon strip. They were removed after review: they carried no product information and made the page longer and harder to scan.

The only pictures now are the product itself, built as interface fragments and marked `data-ui`: the live prompt sheet, the builder panel, the score margin, the library panel, and the history ledger. There is no stock photography, no decorative archive, and no image credit line.

This knowingly gives up the skill’s four-picture floor. The user’s feedback takes priority: the page is a text tool, and the type, colour, and interface are the material.

## 5. Critique

**Round 1**

- Seen in one second: a large green serif headline, a yellow action, and a prompt sheet with a margin of notes.
- Idea: the prompt document is a printed page, and the score is the editor’s margin.
- Live thing: type a rough sentence; the document and six margin notes update.
- Layout words by section: hero = dark split + margin / marquee = yellow band / showcase = split / how-it-works = three columns / features = dark three-column notes / pricing = two fields / FAQ = two columns / close = dark full-bleed statement / footer = wordmark band.
- Scores after the second pass: design 8.6 · usability 8.7 · creativity 8.5 · content 8.0 → **overall 8.6**.
- Caps applied: none. No FAIL remains. The skill’s picture cap is knowingly overridden by the user’s instruction to remove decorative pictures. The live thing is present. No placeholder.
- Top three problems and fixes:
  1. The desktop hero left a long empty column under the copy while the sheet ran tall. Fixed by putting the six score notes in a second column beside the sheet and stretching the copy to the same height.
  2. The footer was too quiet for a designed close. Fixed by raising the wordmark and giving it a clear four-column link set. The image strip was removed after review.
  3. The plan page used small labels above prices and a back link above the heading. Fixed by moving the plan name under the price, removing the back link from the top, and setting the running copy in full ink.

**What still falls short**

- **No pictures or video.** The skill asks for real pictures and one moving picture. There is no honest footage of a text tool turning a sentence into a structured prompt, and the archival mosaic was removed after review. The interface fragments are the only pictures. This is the expected warning on the landing page and the expected picture-floor failure on the app and legal screens.
- **App screens are not judged by the landing picture floor.** The skill says it is not for dashboards or app screens. `/builder`, `/dashboard`, `/history`, `/library`, `/account`, `/admin`, and `/model-lab` share the tokens, type, grid, and component shapes, but they are judged by task clarity and density. `/login` still reports a motion warning at nine moving elements; it is a utility screen, not a marketing page.
- **Interface copy is English in this pass.** The i18n dictionaries and the generation language detection remain, but the selector was removed rather than leave a control that changes nothing visible. The next pass can port the new copy into EN/ES/RU and restore the selector.
- **Admin and model-lab are functional ledgers.** They use the new type, palette, and table grammar, but they are deliberately plainer than the public pages.

## 6. Revision after review

The first build was reviewed on a 16:9 screen and revised.

- **16:9:** the container was capped at 1440px, so 1920px and 2560px screens carried large empty margins. It is now capped at 2200px with fluid margins, the hero fills the first screen at 1920×1080, and a compressed short-screen layout keeps the live sheet and its primary action inside 1366×768. The landing page is 7.7 screens at 1440×900, down from 10.1.
- **Navigation:** the public header is now three anchors (Product, How it works, Plans) plus Sign in and Start free. The app header was replaced by a persistent left sidebar grouped into Create, Workspace, and You, with a mobile top bar and a four-item bottom bar. The previous top bar carried too many links and a dropdown.
- **Pictures:** the four archival images and the footer colophon strip were removed. They carried no product information and made the page longer and harder to scan. The only pictures are the product interface fragments.

The short-screen layout is CSS-only: below 820px of viewport height the live sheet becomes one column, its padding tightens, and the six score notes move into a compact three-column strip below the sheet.

A second review asked for a stronger look and more movement. The changes:

- **Dark hero and navigation.** The first screen is now a dark field with paper-white display type, a yellow action, and the live sheet as a bright object. The page moves from dark to a yellow marquee to light content, then returns to dark for the workspace and the close.
- **Marquee.** The six task categories run across a full-bleed yellow band between the hero and the product proof. It pauses on hover and stops under reduced motion.
- **Scroll progress.** A five-pixel yellow line at the top of the viewport follows the reading position.
- **Staggered notes.** The six score notes enter one after another instead of as one block.
- **Hover motion.** Buttons lift two pixels; suggestion rows slide; the sidebar action carries a moving arrow.
- **Dark app sidebar.** The workspace navigation is a dark rail with a yellow block on the active page and a paper content area. This is the same frame as the dark public navigation.
- **Type scale.** The section headings, plan names and closing statement were brought onto one display scale instead of many near-duplicates.
- **Pricing fullness.** The two price fields now carry a one-line inclusion list so the fields read as designed pages rather than empty panels.


## 7. Verification

| Check | Result |
| --- | --- |
| `npm run build` | Pass |
| `npm test` | 98 passed, 0 failed |
| `node scripts/check-start-ui.cjs` | Pass at 1440 and 390 |
| `lint.mjs app components` | 0 FAIL, 0 WARN |
| `inspect.mjs /` | 0 FAIL, 2 WARN (no real pictures, no footage — both overridden by review) |
| `inspect.mjs /login` | 1 FAIL (few-pictures), 2 WARN — app screen, outside the landing rubric |
| `inspect.mjs /plan` | 1 FAIL (few-pictures), 1 WARN — app screen, outside the landing rubric |
| `inspect.mjs /privacy` | 1 FAIL (few-pictures), 2 WARN — legal screen, outside the landing rubric |

The inspector screenshots live in `.taste-skill/` during the build. They are working files, not source.

## 8. What changed for the next developer

- The design tokens are in `app/globals.css`. There is no Tailwind config and no PostCSS plugin file.
- Fonts are `@fontsource-variable/imbue` and `@fontsource-variable/albert-sans`, imported in `app/layout.tsx`.
- The shared primitives are in `components/system/`; the landing sections in `components/landing/`; the builder in `components/builder/`.
- `app/icon.png`, `app/favicon.ico`, `public/apple-touch-icon.png`, and `public/brand/umprompt-icon.png` are generated by `node scripts/generate-brand-icons.cjs`.
- The old UI scripts `check-workspace-ui.cjs` and `test-prompt-editor.cjs` were removed with the old components. `check-start-ui.cjs` now checks the new landing page.
