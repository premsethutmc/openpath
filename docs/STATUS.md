# OpenPath status (handoff for a new session)

Read this file first; keep it factual and 50–60 lines at each milestone.
Updated: 2026-11-09 (TN primary textbook intake; bounded draft, not a release).

## Rules and product scope
- No merge, deploy or settings change without owner approval; PRs are drafts.
- One bounded milestone at a time; report commit, tests, defects and readiness.
- Product vision: adaptive learning across grades/topics, not a single-grade product.
- Textbook intake is inventory groundwork, not new teaching content or educator approval.

## This branch
- `data/tn-primary-ingestion-2026-11-09`, from `feat/dev-efficiency` at `82f18fd` (PR #122).
- No AGENTS.md or .agents/skills found in this checkout.
- Grade 8 head inspected: `feat/grade8-pilot` at `7a429a94`; left untouched.
- Answer-key certification `49a6be8b`, answer-contract integration `24d254fd`; untouched.
- Teaching-method PR #121 at `5d83947d` is separate; no integration here.
- Main/candidate branches, deployments, settings and real data unchanged.

## TN Grades 1–3 intake milestone
- Data: `content/learning/ingestion/tn-primary-2026-term1.json` (`textbook-intake@1`).
- Draft outcomes: Grade 1 = 22, Grade 2 = 28, Grade 3 = 30; total 80.
- Each grade: all 8 printed Term I maths lesson titles, 2 units; 24 lessons total.
- Sources: English-medium government textbooks, First Edition 2026, via Tnkalvi Drive mirrors.
- Edition/rights pages II and contents pages VII visually checked for all three books.
- Source hashes, byte sizes, URLs and per-outcome printed/PDF page ranges retained.
- Rights: © SCERT 2026, NOT FOR SALE; no open redistribution licence observed.
- No PDFs, textbook bodies, exercise banks, illustrations or answer keys committed.
- Statements are original summaries of selected observed source tasks/learning summaries.
- Mapping status: not reviewed; no accepted competencies or educator approval.
- Existing learner releases unchanged: 3 outcomes per grade, 9 total.
- Term I outcome coverage is partial; listing every lesson does not establish completeness.
- Terms II/III 2026, handbook/QR resources and Tamil-medium equivalence remain unknown.
- Sample “current” Grade 1 Term II/III listing actually links files named 2024 Edition.
- Exact source attempts, hashes and limits: `docs/milestones/TN_PRIMARY_INGESTION.md`.

## Verification and cost
- `python tools/curriculum/validate_tn_primary.py`: passes; 80 staged / 9 released outcomes.
- Same command `--pdf-dir /tmp/openpath-tn-sources`: 3 source identity/page checks pass.
- `python -m unittest discover -s tools/curriculum -p 'test_*.py' -v`: 9 tests pass.
- `node --test tools/curriculum/tn-primary-parser.test.mjs`: 3 tests pass (Node 24).
- Existing structured parser retains every outcome and printed-page reference.
- Tests reject false completeness/approval, accepted mappings and broken provenance.
- Deterministic local extraction/validation/adapter: zero model API calls.
- Assistant summary composition did use session tokens; no measured total claimed.
- Full app/browser suite not run; no learner/runtime/release changes in this milestone.

## Defects / next work
- Release builder auto-accepts supplied mappings and lacks per-outcome PDF provenance.
- Review summaries/mappings and preserve provenance/coverage before publishing a new release.
- Obtain current Term II/III sources; annual completeness is unknown, not zero gaps.
- All educational content remains provisional; no educator review or real learners yet.
- Grade 8 review defects and answer-key issues remain on Claude's separate branches.
- Earlier dev-efficiency/Grade 7/Grade 8 context remains in base STATUS at `82f18fd`.
- Ready for intake review; not ready to claim TN 1–3 curriculum completion or learner coverage.
