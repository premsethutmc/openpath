# My Learning Year: acceptance

The corrective work (journeys G–N, the graph, diagnosis, decomposition, curriculum and seven-day changes) is
reported in [CORRECTIVE_REPORT.md](CORRECTIVE_REPORT.md). In journey C, the wrong answer is now investigated first
(diagnostic@2): 7 × 8 itself is asked, and the established explanation leads straight to multiplication facts.

Branch `feat/my-learning-year`. Everything here uses synthetic learners and the synthetic CC0 sample textbooks. No
statement here is a claim about learning gains, educational validation or exam performance.

## How it was checked

| Layer | What | Where | Result |
|---|---|---|---|
| Engine | 20 tests: second answer key for all 101 questions and 5 fragments, equivalence, module completeness, textbook mapping and review, release hashes, graph walk and cycles, diagnostics, strategy choice (7 × 8), help vs independence, retention, verification only through the shared engine, tiles and aggregation, journeys A–F at engine level | `frontend/src/learning/engine.test.ts` | pass (local) |
| Whole frontend suite | existing 345 tests + the new ones | `npm test` | 365/365 pass (local) |
| Server | ownership, unknown fields, claimed status refused, every reference checked, release hash matches the app, educator review cannot be claimed, server clock, delayed check not due, duplicates/409, coexistence with fixed programs, logout/login, privacy, test-clock guard | `backend/family/test_learning.py` | 181/181 pass (local, SQLite) and in CI (PostgreSQL, Python 3.10/3.12/3.13) |
| Browser, fake API | journeys A–F through the UI, phone 360 px and tablet 820 px | `frontend/e2e/learning-year.test.mjs` with `e2e/lib/fake-api.mjs` | 4/4 tests pass (local) |
| Browser, real Django | the same journeys through the UI against Django `runserver` | locally, and `.github/workflows/learning-year.yml` | 4/4 tests pass (local and in CI, commit 694214f) |
| Typecheck | `npm run typecheck` | CI | passes in CI |

## Acceptance matrix

| Journey | Requirement | Status | Evidence |
|---|---|---|---|
| A | Grade 4 textbook pasted → draft with mapping proposals → reviewed by the account owner → Fractions chapter → Generate equivalent fractions → 2–3 diagnostic questions → conceptual → strip-model chapter → guided (with hint, recorded) → check → shown on your own → logout, login: same state from the server | passed (fake API; Django locally and in CI) | a1–a5 screenshots; engine test "journey A" |
| B | Grade 5 + JEE Advanced: only Grade 5 tiles, goal-marked foundations, 3 challenges locked until factors and multiples is shown, then ready; no integral, quadratic, advanced problem, "stuck" problem or exam plan | passed (fake API; Django locally and in CI) | b1, b2 |
| C | Grade 10 integration problem (∫₀⁸ 7 dx) answered 54 → supports traced: rectangle area and coordinates **verified (green)** from earlier years; definite integrals checked; multiplication assessed with 7 × 8 → 54 → probes (7 × 7 wrong, 7 × 5 and 7 × 3 right) → **decomposition** chapter → guided → check → back to the problem → 56 → "Solved after help" (the first attempt stays the only independent one) | passed (fake API; Django locally and in CI) | c1–c3; engine test "journey C" |
| D | Advanced problem (area between y = x² and y = x + 2): Grade 7 sees only the Grade 7 step, Grade 8 only the Grade 8 step, never the original text; a Grade 11 learner who has shown quadratics and definite integrals gets the full problem; traceability (problem id, competencies, source, licence, validation) | passed (fake API; Django locally and in CI) | d1–d3; engine test "journey D" |
| E | Grade 4 → Grade 5: all records kept; equivalent fractions shown in Grade 4 is shown in Grade 5's "More fractions"; earlier years listed; the delayed check from Grade 4 comes back first | passed (fake API; Django locally and in CI) | e1, e2 |
| F | 8 days later the delayed check is due; a wrong answer → "Review needed" (orange), not verified, even in the test build where questions count for verification; next activity "Review it" | passed (fake API; Django locally and in CI) | f1; engine test "journey F" |
| G | A typed integral (∫ from 2 to 9 of 6 dx) answered 54 (the upper limit taken as the width, a mistake in no scripted journey) → 1–3 distinguishing follow-ups → "What we think happened" → definite integrals taught → back → solved after help; answers matching no explanation → "Not sure yet", no guess | passed (fake API and Django, local) | g1–g4; generalisation tests G, B |
| H | A learner shows quadratics with no evidence on anything it supposedly needs: no prerequisite is imposed; disputed edges are not followed | passed (engine) | generalisation test H |
| I | Two learners solve 7 × 8 by decomposition and by doubling; both valid, recognised and stored; the answer counts the same | passed (fake API and Django, local) | i1, i2; generalisation test I |
| J | Across visits: resumes at the check (no second lesson), says why the plan changed, a single slip does not undo a shown skill, two wrong of three bring it back | passed (fake API and Django, local) | j1, j2; generalisation test J |
| K | 6.9 days: no delayed check, not green; 7.1 days: delayed check, then verified (test build) | passed (fake API and Django, local); server boundaries in Django tests | k1; generalisation test K; test_learning |
| L | A second board's Grade 4 book in plain text maps to the same skills; a vague outcome is "Please choose"; missing outcomes are proposals; the PDF text layer gives the same outcomes; a scan is declined | passed (browser for text; engine for PDF) | l1, l2; generalisation tests L |
| M | Unsupported problems (proofs, unlike fractions, 13 × 27, non-integer roots, non-maths) declined with a reason; nothing recorded or claimed | passed (fake API and Django, local) | m1; generalisation test M |
| N | Grade 5 + JEE Advanced: foundations counted from the learner's own record; Grade 11 later: the same evidence, an exam plan with the paper's sections, crash mode | passed (fake API and Django, local) | n1; generalisation test N |
| Green | Verified only from the shared engine (verification@2, eligibility@2, unchanged). On shipped content (provisional) nothing can turn green; the test build marks questions as reviewed and says so on every screen | passed | engine test "verification is the shared engine's alone" |

## Incomplete / limitations

- **Tile design**: no approved My Learning Year design is in the repository. The tiles follow the directive's status
  rules in the existing mathematics app's style. Product-owner decision needed.
- **Content is provisional** (original, unreviewed): 10 skill modules, 101 questions, one decomposed problem, three
  goal overlays with provisional weight ranges. Most textbook skills show "No questions yet".
- **Curriculum ingestion** reads a structured text format (front matter, chapters with pages, outcome lines). It does
  not read PDFs or photos and makes no model calls. Mapping is word-overlap (`text-match@1`); unmatched outcomes stay
  provisional proposals.
- **Diagnostic likelihoods, strategy order and exam-plan chances are draft values**, not calibrated.
- The exam plan's estimate is a rough range from the learner's own practice; it is not a score prediction.
- Django was run from source in the build session (Django 5.2.18, DRF 3.18.3, SQLite). PostgreSQL runs only in CI.
