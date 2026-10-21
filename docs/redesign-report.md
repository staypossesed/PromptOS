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

## 4. Pictures and credits

Four archival images are used, with one greyscale treatment, in a gutterless mosaic on the landing page and a colophon strip in the app footer. They are not presented as product screenshots or as the client’s own photographs.

- `public/images/type-case.webp` — Type case letterpress drawer, CC0, via rawpixel.
- `public/images/card-catalogue.webp` — “Schlagwortkatalog” by Dr. Marcus Gossler, CC BY-SA 3.0, via Wikimedia Commons.
- `public/images/printed-book.webp` — Woodblock printed book pages, CC0, via rawpixel.
- `public/images/manuscript.webp` — “1765 Saka, 1843 CE, Jnanesvari Jnandeva Dnyaneshwar manuscript page 1 and 2” by Ms Sarah Welch, CC BY-SA 4.0, via Wikimedia Commons.

Full licences and source pages: [`docs/image-credits.md`](image-credits.md). The credit line is also in the site footer. The product itself is shown as built interface fragments marked `data-ui`: the live prompt sheet, the builder panel, the score margin, the library panel, and the history ledger.

## 5. Critique

**Round 1**

- Seen in one second: a large green serif headline, a yellow action, and a prompt sheet with a margin of notes.
- Idea: the prompt document is a printed page, and the score is the editor’s margin.
- Live thing: type a rough sentence; the document and six margin notes update.
- Layout words by section: hero = split + margin / mosaic = full-bleed / showcase = split / how-it-works = list / features = three-column notes / facts = split list / pricing = two fields / FAQ = two columns / close = full-bleed statement / footer = wordmark band.
- Scores: design 8.5 · usability 8.5 · creativity 8.5 · content 8.0 → **overall 8.4**.
- Caps applied: none. No FAIL remains. Four real pictures. The live thing is present. No placeholder.
- Top three problems and fixes:
  1. The desktop hero left a long empty column under the copy while the sheet ran tall. Fixed by putting the six score notes in a second column beside the sheet and stretching the copy to the same height.
  2. The footer was too quiet for a designed close. Fixed by raising the wordmark and adding the four-image colophon strip on app pages.
  3. The plan page used small labels above prices and a back link above the heading. Fixed by moving the plan name under the price, removing the back link from the top, and setting the running copy in full ink.

**What still falls short**

- **No video.** The skill asks for one honest moving picture. There is no honest footage of a text tool turning a sentence into a structured prompt; a stock clip would be decoration pretending to be evidence. The slow drift on the first mosaic image and the footer colophon is the moving picture. This is the one warning that remains on every inspected page.
- **App screens are not judged by the landing picture floor.** The skill says it is not for dashboards or app screens. `/builder`, `/dashboard`, `/history`, `/library`, `/account`, `/admin`, and `/model-lab` share the tokens, type, grid, and component shapes, but they are judged by task clarity and density. `/login` still reports a motion warning at nine moving elements; it is a utility screen with a slow-moving colophon, not a marketing page.
- **Interface copy is English in this pass.** The i18n dictionaries and the generation language detection remain, but the selector was removed rather than leave a control that changes nothing visible. The next pass can port the new copy into EN/ES/RU and restore the selector.
- **Admin and model-lab are functional ledgers.** They use the new type, palette, and table grammar, but they are deliberately plainer than the public pages.

## 6. Verification

| Check | Result |
| --- | --- |
| `npm run build` | Pass |
| `npm test` | 98 passed, 0 failed |
| `node scripts/check-start-ui.cjs` | Pass at 1440 and 390 |
| `lint.mjs app components` | 0 FAIL, 0 WARN |
| `inspect.mjs /` | 0 FAIL, 1 WARN (no footage) |
| `inspect.mjs /login` | 0 FAIL, 2 WARN (no footage, little motion) |
| `inspect.mjs /plan` | 0 FAIL, 1 WARN (no footage) |
| `inspect.mjs /privacy` | 0 FAIL, 1 WARN (no footage) |

The inspector screenshots live in `.taste-skill/` during the build. They are working files, not source.

## 7. What changed for the next developer

- The design tokens are in `app/globals.css`. There is no Tailwind config and no PostCSS plugin file.
- Fonts are `@fontsource-variable/imbue` and `@fontsource-variable/albert-sans`, imported in `app/layout.tsx`.
- The shared primitives are in `components/system/`; the landing sections in `components/landing/`; the builder in `components/builder/`.
- `app/icon.png`, `app/favicon.ico`, `public/apple-touch-icon.png`, and `public/brand/umprompt-icon.png` are generated by `node scripts/generate-brand-icons.cjs`.
- The old UI scripts `check-workspace-ui.cjs` and `test-prompt-editor.cjs` were removed with the old components. `check-start-ui.cjs` now checks the new landing page.
