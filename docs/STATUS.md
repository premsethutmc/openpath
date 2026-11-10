# OpenPath status (handoff for a new session)

Read this file first; keep it factual and 50–60 lines at each milestone.
Updated: 2026-11-10 (tally teaching review; fresh browser checks pending).

## Rules and product scope
- No merge, deploy or settings change without owner approval; PRs are drafts.
- One bounded milestone at a time; report commit, tests, defects and readiness.
- Product vision: adaptive learning across grades/topics, not a single-grade product.
- Intake is inventory groundwork; this milestone adds draft teaching, without educator approval.

## This branch
- `data/tn-primary-ingestion-2026-11-09`, originally from `feat/dev-efficiency` at `82f18fd`.
- Review starts from remote `a24b591`; STATUS and remote heads read before work.
- Grade 8 `7a429a94` and answer-key certification `49a6be8b` inspected; untouched.
- Teaching-method PR #121 at `5d83947d` is separate; no integration here.
- Claude candidate `5e4c1fd8`, main, deployments, settings and real data unchanged.

## TN Grades 1–3 inventory
- `content/learning/ingestion/tn-primary-2026-term1.json`: 22 / 28 / 30 outcomes (80).
- `content/learning/ingestion/tn-primary-2026-term2.json`: 20 / 20 / 24 outcomes (64).
- Combined Grade 1 / 2 / 3: 42 / 48 / 54; 144 staged outcomes total.
- All 42 printed lesson titles enumerated: 8 per grade in Term I, 6 in Term II.
- Selected observed summaries/tasks only; not exhaustive outcome coverage.
- Six English-medium government-publication PDFs, First Edition 2026, via third-party mirrors.
- Edition/rights and contents pages visually checked; hashes and source URLs retained.
- Every outcome has printed/PDF page ranges; offsets differ: Term I +7, Term II +6.
- Rights: © SCERT 2026, NOT FOR SALE; no open redistribution licence observed.
- No PDFs, textbook/OCR bodies, illustrations, exercise banks or answer keys committed.
- Term III unresolved for all grades; exact attempts in `tn-primary-source-register.json`.
- 2026–27 listings include old books; new Grade 1 Term III candidate verified as 2018, rejected.

## Provisional capability review
- `tn-primary-mapping-review.json`: all 144 statements reviewed with immutable text hashes.
- 96 conceptual matches, 43 partial matches with reasons, 5 unmatched.
- Candidates: 30 existing competencies / 63 families; all targets have module records.
- Resource presence does not establish numeric range, method, grade fit or teaching coverage.
- Unmatched: tally notation, length conservation, silhouettes, thickness, dot-grid/tangram construction.
- All mappings proposed; no accepted learner mappings or educator approval.
- Existing learner releases unchanged: 3 outcomes per grade, 9 total.

## Verification and cost
- `validate_tn_primary.py` for Terms I/II: pass, 80 + 64 staged outcomes.
- PDF validation for all six books: hash, edition, contents and evidence-page checks pass.
- Grades 1/3 Term II are scanned; `--ocr` uses local Tesseract + visual source checks.
- `audit_tn_mappings.py`: pass; rejects stale statements/catalogues and invented targets.
- Python regression tests: 18 pass; Node parser/tally tests: 13 pass (31 total).
- Deterministic extraction/OCR/validation: zero model API calls; judgment used session tokens.
- Head 8e72d33: tally CI 42664467628 green: 7 Chromium journeys, 10 frontend + 8 backend tests.
- All 7 workflows green on 8e72d33; main CI recovered from a GitHub scheduling error.
- New tally receipts use shared assisted/practice events; server stamps tally-practice@1.
- Review: 53 focused local tests pass; full typecheck and build pass; broad tests left to CI.

## Remaining work / readiness
- Term III, exhaustive outcome decomposition, handbook/QR coverage and Tamil equivalence unknown.
- All 48 gaps triaged in `tn-primary-gap-plan.json`; two have partial draft tally prototypes.
- Board release builder auto-accepts mappings and lacks detailed PDF provenance; not used here.
- Review CI on d379968: 8 browser journeys pass; SVG sizing follow-up needs fresh CI.
- Tally wording/labels corrected after AI review; no external educator approval claimed.
- Fresh browser checks pending; see TN_PRIMARY_TALLY_REVIEW.md for fixes and concrete limits.
