# Tamil Nadu Grades 1–3: bounded textbook intake

Historical first milestone. See [the Term II and mapping follow-up](TN_PRIMARY_TERM2_MAPPING.md) for current source and mapping status.

2026-11-09. Base: `feat/dev-efficiency` at `82f18fdce9129ce7a68d86ce4e376777bd990c43`.
Branch: `data/tn-primary-ingestion-2026-11-09`.

## Result and limits

`content/learning/ingestion/tn-primary-2026-term1.json` stages 80 draft outcomes:
Grade 1: 22; Grade 2: 28; Grade 3: 30. Each grade contains the eight printed Term I
Mathematics lessons, grouped into the two printed units. Statements are concise
OpenPath summaries of observed learning summaries and activities, not verbatim
SCERT learning outcomes. Preparatory/revision activities are retained as such.
Each outcome has an immutable source identifier, printed-page range and PDF-page
range. The PDFs have seven front-matter pages: printed page n is PDF page n+7.

This is inventory groundwork, not new teaching content or educator approval.
Coverage of outcomes within Term I is **partial**: selected summaries/tasks were
reviewed, not every exercise, diagram, oral task, handbook or QR resource. All
24 contents lessons are enumerated; this does not prove all outcomes are captured.
Terms II and III and Tamil-medium equivalence remain unknown. No coverage
percentage can be calculated from the available evidence.

Mappings are empty and explicitly not reviewed. Existing TN releases remain at
three outcomes each (nine total); this branch does not fix learner coverage yet.
Do not count the staged outcomes as mapped, taught or assessable.

## Sources and rights

The [Tnkalvi listing](https://www.tnkalvi.net/2026/05/new-syllabus-textbooks-from-2026-27.html)
links these English-medium government-publication mirrors, retrieved 2026-11-09:

| Grade | PDF | Pages | SHA-256 |
|---|---|---:|---|
| 1 | [Term I](https://drive.google.com/file/d/1UkU2WncQpk6V-73odnkq3xQijKCd4rNa/view) | 144 | `4aba674be5aacf5094ce2af8cd9626523c4d5bb34519199041113005d2925352` |
| 2 | [Term I](https://drive.google.com/file/d/1ajTMWaeBemVKxw-foqDiX8nHc1_5qcld/view) | 144 | `0b3541d0259af92f41521e53348e7b7fa2ae5ae63c398887802c3fc362dbd56b` |
| 3 | [Term I](https://drive.google.com/file/d/14IcyB166l0Ld-cwCh_aMnp3fUMo9K2Uj/view) | 184 | `b37ad1875d0e04d1aa1480f3f372e227dbdc8b2fa03ffdb61a637d6a142b5044` |

All three printed page-II notices and page-VII contents were visually checked.
They state First Edition 2026, new syllabus, © SCERT 2026 and NOT FOR SALE.
No open redistribution licence was observed. The downloads are third-party
watermarked copies, not official-host authenticated files. Only factual metadata,
lesson titles and original summaries are committed; no PDFs, extracted textbook
bodies, illustrations, exercise banks or answer keys are committed. Public download
availability is not treated as a redistribution licence.

The [official corporation](https://www.textbookcorp.in/) confirms the 2026–27
Term I/II sale notifications and calls 2025–26 Classes 1–3 Term I books obsolete.
The official textbook portal returned HTTP 503 in the shell (502 in web fetch);
the schools portal was inaccessible to web fetch and SCERT returned no readable text.
Tnupdates and Tnkalvi listings were tried; Drive preview exposed no textbook text,
but its public download confirmation yielded the three PDFs above.
The [Padasalai current-edition listing](https://www.padasalai.net/2026/05/Tamilnadu-Class-1-Text-Books-PDF-Download-2026-2027.html)
was also checked: its Grade 1 Term II link resolves to Drive file
`11Btz2CjNMDu8Mbk4n9nEbF9FN2CUAihJ`, named **2024 Edition**; Term III resolves
to `100WGuA7TW4_N_KQxtYG1FA3xbSOwePDI`, also named **2024 Edition**. Neither
was ingested as 2026 evidence. Term II/III 2026 sources remain unresolved;
this does not assert those books do not exist.

## Pipeline and reproducibility

`packages/learning/src/extract.ts` parses structured documents deterministically;
`curriculum.ts` separates extraction, mapping proposals and release review.
`packages/learning/scripts/board-releases.ts` instead builds from `syllabus@1`,
marks supplied mappings accepted and emits a reviewed release with a fixed review
date. It currently does not carry per-outcome source URLs/PDF-page provenance.
Therefore this draft is not fed into that release builder. A reviewed adapter must
preserve provenance and explicit coverage before release; do not silently turn empty
mappings into accepted mappings or overwrite immutable historical releases.

The new validator exports the existing structured-document format on stdout:

```sh
python tools/curriculum/validate_tn_primary.py
python tools/curriculum/validate_tn_primary.py --structured-grade 1
python -m unittest discover -s tools/curriculum -p 'test_*.py' -v
node --test tools/curriculum/tn-primary-parser.test.mjs
python tools/curriculum/validate_tn_primary.py --pdf-dir /tmp/openpath-tn-sources
```

For the last command, download the linked public files locally as `g1.pdf`,
`g2.pdf`, `g3.pdf`; install PyMuPDF if unavailable. It checks byte hashes, sizes,
page counts, edition notices, contents titles and every evidence page's printed
number. PDF validation does not prove paraphrase semantics. JSON remains the full
provenance record; the structured export retains printed pages and source metadata,
but is not a replacement for the JSON's outcome IDs/PDF references.

Validation: 9 Python regression tests and 3 existing-parser integration tests pass.
All three source PDFs pass identity/location checks; 80 outcomes survive the parser.
The tests reject wrong offsets, cross-source evidence, out-of-lesson pages,
duplicate IDs, missing lessons, false completeness, silent mapping acceptance and
false educator approval. Full app/browser tests were not run: learner code and
releases are unchanged. No AGENTS.md or .agents/skills existed in this checkout.

Token-cost mechanism: local PDF text extraction, SHA-256, schema checks and parser
round-trips use no model API calls. Text-only PyMuPDF extraction skips image decoding;
a source-specific font filter excludes the mirrors' repeated Helvetica watermarks
from local reading aids without altering PDFs. Only selected page text was reviewed
for manually composed summaries; those summaries did use this assistant session.
No claim is made that the overall task used zero tokens or a measured token total.

## Next bounded milestone

Review the 80 summaries and their competency mappings, preserve provenance through
the release path, and obtain current Term II/III sources. Do not infer annual
completeness from zero unmapped outcomes. Product scope remains adaptive learning
across grades and topics. No merge, deploy, settings changes or teaching-method
integration occurred. Grade 8 head `7a429a94`, answer-key certification `49a6be8b`
and answer-contract integration `24d254fd` were inspected and left untouched;
PR #121's teaching-method branch `5d83947d` was not integrated.
