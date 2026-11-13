# Offline word completion — November 8, 2026

The original authored vocabulary was too small for ordinary text. This release adds versioned public EN/RU/ES word-form lists to the website's main idea field. They are downloaded by language code only, with credentials omitted; draft text is never part of the asset request. Once loaded, completion runs synchronously during the input render, without a provider request, delay, account requirement, or AI consent requirement.

The engine uses a sorted, accent-folded prefix index and frequency ranking, with authored request starters and short contextual sequences taking priority. A completed connector such as `for` or `the` is kept as a word boundary rather than extended into `format` or `theory`. Suggestions remain optional previews. Tab/Add word, Add all, native Undo, explicit Undo, selection, caret position, IME, private identifiers, and the 4,000-character bound retain their existing behavior.

## Exact testing scope

The reproducible audit loads the deployed assets, checks their SHA-256 digests, visits every included word form and authored word, and tests every distinct proper character prefix through both the index and the actual local-completion function. Each returned word must be in the combined vocabulary and preserve the typed input. Connector exceptions are counted and tested separately. This checks complete included-vocabulary coverage; it does not claim a dictionary of every word, proper name, typo, or possible inflection in each language. An ambiguous prefix can match several valid words; coverage is not a guarantee of the intended word or grammatical case.

The corpus word lists have 48,580 English, 48,649 Russian and 49,634 Spanish forms before accent-fold deduplication. Additional authored words cover requests and useful study vocabulary. Exact final totals, prefix counts, intentional boundary exceptions and CPU timings are in [the exhaustive audit](writing-dictionary-audit.json). CPU timings are not browser paint measurements. The full automated suite passed 275 tests after the final vocabulary corrections.

Twenty real local-browser typing cases were checked with cloud AI off, including the founder's exact `i want to prepare for an exam for my math cla` input, mixed interface/input languages, scientific vocabulary, accented Spanish and uppercase. The reported example displays `class.`; Tab accepts it, and native Undo restores the exact original input. Browser checks found additional Russian and Spanish vocabulary gaps, which were added to the authored list and regression tests before publication.

## Production verification

Deployment `dpl_DYPCTqaXJxANPRVuTyL19CUi64PB` reached READY on November 8, 2026 (Arizona), aliased to both public Umprompt domains. The final exhaustive report covers **146,923 word forms**, **215,017 distinct proper prefixes** (937,709 prefix occurrences across words), with zero missing/invalid completions under the stated boundary rules. All 275 automated tests passed; the local build and exact deployed Vercel build passed.

The same 20 UI cases were repeated on `https://www.umprompt.com/`. Every one displayed a local suggestion with AI off and preserved the typed prefix. Tab/Undo passed again for the founder's sentence, and no browser console errors were recorded. The idle founder page was refreshed only after checking its input was empty. The eight live localization/privacy/endpoint-protection checks passed. Live dictionary assets were checked separately against the audited hashes and counts.

See `dictionary-browser-verification.json`, `writing-dictionary-release-checks.json`, and `writing-dictionary-live-assets.json` for the separate browser and HTTP evidence. The initial seed vocabulary covers useful words immediately while the active language's larger list downloads; a new language may initially show dictionary size zero, which is retained in the browser evidence rather than concealed.

Sentence-level contextual predictions still require the visible AI permission step described in [contextual autocomplete](contextual-autocomplete.md). This offline update does not grant that permission or change its recipients. The separate Chrome extension package is unchanged.

## Data and reproduction

The pinned source is Hermit Dave's [FrequencyWords](https://github.com/hermitdave/FrequencyWords/tree/525f9b560de45753a5ea01069454e72e9aa541c6/content/2018), based on OpenSubtitles 2018. Data is CC BY-SA 4.0; the derived lists remain under that license. Source revision, source/output hashes and exact filtering changes are in `public/writing-dictionaries/manifest.json`, with public credit and license information in `NOTICE.txt` and the privacy page. Alphabetic/script filtering and a narrow explicit/slur-stem exclusion apply to unsolicited hints only; these filters do not restrict what a user may type.

Run `node scripts/build-writing-dictionaries.cjs SOURCE_DIRECTORY` against the three pinned upstream files and `revision.txt` to reproduce the assets. Run `node scripts/audit-writing-dictionaries.cjs` to write the complete audit, `npm test` for regression checks, and `npm run build` for production validation. The offline audit makes no model calls and uses no user drafts, history or account information.
