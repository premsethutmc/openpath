# TN primary: Term II intake and provisional capability mapping

2026-11-09 follow-up on `data/tn-primary-ingestion-2026-11-09`, remote parent
`339f29b17649294058cde56947da4d9d5ba996aa`. STATUS and remote heads checked first;
Grade 8 `7a429a94` and answer-key `49a6be8b` remained unchanged and were not edited.
No AGENTS.md/.agents skills appeared in the existing checkout. No integration with
teaching-method PR #121, merge, deploy, settings change or learner release change.

## What changed

| Grade | Term I draft outcomes | New Term II draft outcomes | Total |
|---|---:|---:|---:|
| 1 | 22 | 20 | 42 |
| 2 | 28 | 20 | 48 |
| 3 | 30 | 24 | 54 |
| Total | 80 | 64 | 144 |

Term II has six printed Mathematics lessons per grade, two units each: 18 new
lesson records, 42 across both terms. All printed lesson titles are enumerated;
selected source summaries/tasks inform the outcomes. This is not exhaustive
outcome decomposition, independent educator review, or annual completeness.
Each new outcome has the source ID and printed/PDF page range. Term II has six
front-matter pages, unlike Term I's seven; the validator now checks both offsets.
The original Term I outcome statements remain unchanged.

## Source recovery and authentication limits

The newer [Term II materials listing](https://www.tnkalvi.net/2026/10/1-3rd-std-term-2-study-materials-new.html)
links a [public Drive folder](https://drive.google.com/drive/folders/1tDJ055WaOmq7HCWLCyQp_apchKPWvM_b).
Its public folder HTML identifies the English-medium files below. Public download
confirmation returned their PDFs. These are government-publication mirrors, not
files whose hashes were authenticated against an official host.

- Grade 1: [Term II PDF](https://drive.google.com/file/d/1UPZQCo0G3qmSL9LGhnp7jAh1-ODLSBVX/view), 120 PDF pages, SHA-256 `9d31f67ca40521e4206ff7ea47dcbcdc036955b00582ede58542e2c0f7b57c4a`.
- Grade 2: [Term II PDF](https://drive.google.com/file/d/199S_GeyDAoS-byvwEQ_PvLvpiopsL5nJ/view), 120 PDF pages, SHA-256 `d93e7d120a13594ae9095a6c26f97913cc01fee19c368889a861ebe761e1ae0f`.
- Grade 3: [Term II PDF](https://drive.google.com/file/d/1HW-wXOBO2VzvxBygSnEYMy--ML8Nmxdr/view), 168 PDF pages, SHA-256 `d8ac8dd0bf9618feabc314ad6c7fe7a07a04739fdd468df378f3ae8fd04c9e05`.

All three edition/rights and contents pages were visually checked: First Edition
2026, new syllabus, © SCERT 2026, NOT FOR SALE. No open redistribution licence was
observed. No PDFs, OCR bodies, textbook exercises, illustrations or answer keys
are committed. The inventory contains factual metadata and original concise
summaries. Public accessibility is not treated as permission to redistribute.

Grades 1 and 3 contain scanned pages. Local Tesseract OCR (150 dpi, bounded first
70 PDF pages per book) supplied a reading aid; the summary pages were visually
checked, including Grade 3 printed page 61's adding-on subtraction method. Grade 2
has a usable text layer. OCR did not generate or decide learning outcomes.

Term III was sought in English and Tamil searches, Tnupdates, the official
corporation notices and Freetnbooks' pages for all three grades. Freetnbooks
explicitly labels Term III as **2024 edition** despite 2026–27 page headings;
Tnupdates still has Term III placeholders. No authentic current Term III PDF was
obtained. `tn-primary-source-register.json` records each grade's unresolved state
and exact attempted URLs. Zero imported Term III outcomes is not zero required
outcomes, and does not mean no current book exists.

## Mapping decisions and real capability evidence

`tn-primary-mapping-review.json` reviews every one of the 144 statements against
existing `family-specs.v1.json` definitions. Decisions are explicit, not accepted
by a lexical score. Each record keeps its statement hash, candidate competency IDs,
actual family IDs, fit and rationale. Catalogue hash changes require re-review.

- 96 conceptual matches (`aligned`): definitions address the mathematical concept.
- 43 partial matches: record the missing method, representation, activity or scope.
- 5 unmatched: tally notation, length conservation, object silhouettes, thickness
  comparisons and dot-grid/tangram construction have no justified family in this review.

Candidates reference 30 existing competencies and 63 real families. Every target
has an existing module record. This is resource presence, **not** proof of suitable
numeric ranges, grade wording, all specified methods, or end-to-end teaching.
For example, column arithmetic does not establish the textbook's number-card,
number-line or adding-on method. Such method gaps remain explicitly partial.
All decisions remain proposed; there are zero newly accepted learner mappings.
Existing releases still have three outcomes per grade, nine total. No new runtime
content, questions or educator approvals were created.

## Verification and reproducibility

```sh
python tools/curriculum/validate_tn_primary.py
python tools/curriculum/validate_tn_primary.py --term 2
python tools/curriculum/validate_tn_primary.py --pdf-dir /tmp/openpath-tn-sources
python tools/curriculum/validate_tn_primary.py --term 2 --pdf-dir /tmp/openpath-tn-sources --ocr
python tools/curriculum/audit_tn_mappings.py
python -m unittest discover -s tools/curriculum -p 'test_*.py' -v
node --test tools/curriculum/tn-primary-parser.test.mjs
```

PDF filenames: `g1.pdf`–`g3.pdf` for Term I, `g1-t2.pdf`–`g3-t2.pdf` for Term II.
PyMuPDF is required for PDF validation; scanned pages additionally require local
Tesseract and Pillow. The validator refuses scanned evidence without `--ocr`.
OCR footer checks use a 300-dpi crop and remove coloured badge decoration from the
temporary reading aid. Source PDFs remain unchanged. Identity, byte sizes, page
counts, edition notices, contents titles and evidence-page numbers pass for all six
PDFs. These structural checks do not prove semantic accuracy of a summary.

17 Python tests and 6 parser integration tests pass. They cover stale statements,
stale capability catalogues, unknown families, wrong competency links, omitted
outcomes, incorrect offsets, duplicate IDs, false completeness and premature
approval. All 144 outcomes and printed-page references survive the existing parser.
No full app/browser suite was run because learner/runtime/release data is unchanged.

Token approach: deterministic local text extraction/OCR, hashing, validation and
parser tests make zero model API calls. Only compact source excerpts, page images
and selected family definitions were inspected by the assistant. Summary and mapping
judgments used session tokens; no overall zero-token or measured-total claim.

## Remaining work

Obtain the 2026–27 Term III books; review uncertain mappings and numeric/method
coverage; preserve source and coverage fields through any future release adapter.
The existing board release builder auto-accepts supplied mappings and drops detailed
PDF provenance, so these records are intentionally not published through it yet.
Term I/II outcome decomposition and handbook/digital resources remain incomplete;
Tamil-medium equivalence is not established. Product scope remains adaptive learning
across grades and topics. Intake availability is not learner readiness.
