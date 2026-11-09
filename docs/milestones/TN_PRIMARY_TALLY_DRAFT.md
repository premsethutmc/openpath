# TN primary gap triage and tally draft — 2026-11-09

Continues remote `3601798` on `data/tn-primary-ingestion-2026-11-09`. No merge, deployment, accepted mapping or learner-release change. Claude's Grade 8 and answer-key branches and teaching-method PR #121 remain untouched.

## Deliverables

`content/learning/ingestion/tn-primary-gap-plan.json` enumerates exactly the 43 partial and five unmatched baseline outcomes. Each retains its statement hash and gap reason and proposes specific skill, teaching, question, visual and acceptance requirements. These are review requirements, not educator findings. Forty-six remain planned/unverified; two have partial prototypes. All 48 production gaps remain open.

`packages/learning/src/primary/tally.ts` implements counts 0–20, canonical groups of five, strict answer grading, add/undo/clear recording, accessible original SVG, original teaching steps/worked example, guided/independent/delayed sample sets and two existing-Def adapters. Fifth-mark boundaries, zero, ties and reversed row order are explicit. Difference validation independently counts unpaired marks. Def figures currently provide textual table descriptions; the dedicated preview renders SVG. Families are deliberately unregistered, and their parsers return null; generated catalogues/modules and adaptive learner delivery do not yet contain them.

`node tools/curriculum/build-tally-preview.mjs /tmp/openpath-tally-review.html` creates a standalone offline reviewer preview with reading, recording, frequency entry and row-difference checks. Open the generated HTML in a browser. It contains no network calls or saved learner state. This is a draft content/interaction prototype, not a new release. Sample sets for future delayed practice are defined, but no spaced scheduler is implemented. Broader survey collection, category selection, educator review, full accessibility testing and runtime integration remain necessary.

## Source evidence and rights

Selected source outcomes: `tn-g03-2026-t1-em-l05-o01` (tally reading/recording, printed p47 / PDF p54) and `tn-g03-2026-t1-em-l05-o02` (frequency tables/comparison, printed pp48–49 / PDF pp55–56). Source: Grade 3 Term I English-medium Mathematics, First Edition 2026, SCERT; [public mirror](https://drive.google.com/file/d/14IcyB166l0Ld-cwCh_aMnp3fUMo9K2Uj/view). Full hash, edition and page provenance remain in the Term I intake. Teaching language, examples and SVG are original; no textbook bodies, illustrations or exercise bank copied. SCERT copyright/NOT FOR SALE notice remains applicable; no open redistribution licence established.

Term III follow-up inspected FreeTNBooks Grades 1/3 mathematics Drive links and the [official corporation notices](https://www.textbookcorp.in/). The [Grade 1 listing](https://www.freetnbooks.com/1st-standard-books/) has a 2026 heading but explicitly labels Term III edition 2024. Linked files do not establish revised 2026 provenance; their PDF editions were not independently authenticated in this follow-up. The official page advertises Terms I/II, not a retrieved current Term III text. Exact links/results added to the source register. No Term III outcomes invented or ingested; availability remains unresolved, not disproved.

## Verification and limits

- Python unittest discovery: 18 pass, including exact 48-outcome/hash coverage and two draft targets.
- Node parser/tally suites: 13 pass. Exhaustive 21 counts and 441 ordered pairs; malformed answers, zero/ties, fifth-mark undo, SVG escaping/stroke count, wrong misconception predictions and fresh sample sets checked.
- Both intake validators and mapping audit pass. Unchanged total: 144 staged outcomes (80 Term I + 64 Term II); baseline 96 aligned / 43 partial / five unmatched; all proposed. Learner releases still three outcomes each.
- Preview builds successfully with Node 24's TypeScript stripping. Chromium attempted DOM interaction checks and screenshot but aborted before page execution: `socket() failed: Operation not permitted (1)` in process singleton. Browser interaction/visual review therefore remains unverified. Full app suite and TypeScript project check not run; no runtime registry integration.
- Deterministic scripts/model/SVG/tests have zero AI API calls. Source checks and gap/teaching judgment used session tokens; no monetary saving claimed. No new OCR or AI extraction was needed.

Next bounded step: run the preview in a browser-enabled environment, review accessible interaction and source fidelity, add the runtime tally visual/recording integration with grade/domain checks, then seek educator review before changing release mappings. Annual completeness, exhaustive decomposition, handbook/QR coverage and Tamil equivalence remain unknown.
