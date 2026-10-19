# My Learning Year: acceptance

Branch `feat/my-learning-year`. Everything here uses synthetic learners and the synthetic CC0 sample textbooks. No
statement here is a claim about learning gains, educational validation or exam performance.

## How it was checked

| Layer | What | Where | Result |
|---|---|---|---|
| Engine | 20 tests: second answer key for all 101 questions and 5 fragments, equivalence, module completeness, textbook mapping and review, release hashes, graph walk and cycles, diagnostics, strategy choice (7 × 8), help vs independence, retention, verification only through the shared engine, tiles and aggregation, journeys A–F at engine level | `frontend/src/learning/engine.test.ts` | pass (local) |
| Whole frontend suite | existing 345 tests + the new ones | `npm test` | 365/365 pass (local) |
| Server | ownership, unknown fields, claimed status refused, every reference checked, release hash matches the app, educator review cannot be claimed, server clock, delayed check not due, duplicates/409, coexistence with fixed programs, logout/login, privacy, time-travel guard | `backend/family/test_learning.py` | **CI only**: Django could not be installed in the build session (no package index access) |
| Browser, fake API | journeys A–F through the UI, phone 360 px and tablet 820 px | `frontend/e2e/learning-year.test.mjs` with `e2e/lib/fake-api.mjs` | 4/4 tests pass (local) |
| Browser, real Django | the same journeys against Django | `.github/workflows/learning-year.yml` | see the PR's CI run |
| Typecheck | `npm run typecheck` | CI | **CI only** (React type packages not installable in the build session) |

## Acceptance matrix

| Journey | Requirement | Status | Evidence |
|---|---|---|---|
| A | Grade 4 textbook pasted → draft with mapping proposals → reviewed by the account owner → Fractions chapter → Generate equivalent fractions → 2–3 diagnostic questions → conceptual → strip-model chapter → guided (with hint, recorded) → check → shown on your own → logout, login: same state from the server | passed (fake API); Django run in CI | a1–a5 screenshots; engine test "journey A" |
| B | Grade 5 + JEE Advanced: only Grade 5 tiles, goal-marked foundations, 3 challenges locked until factors and multiples is shown, then ready; no integral, quadratic, advanced problem, "stuck" problem or exam plan | passed (fake API) | b1, b2 |
| C | Grade 10 integration problem (∫₀⁸ 7 dx) answered 54 → supports traced: rectangle area and coordinates **verified (green)** from earlier years; definite integrals checked; multiplication assessed with 7 × 8 → 54 → probes (7 × 7 wrong, 7 × 5 and 7 × 3 right) → **decomposition** chapter → guided → check → back to the problem → 56 → "Solved after help" (the first attempt stays the only independent one) | passed (fake API) | c1–c3; engine test "journey C" |
| D | Advanced problem (area between y = x² and y = x + 2): Grade 7 sees only the Grade 7 step, Grade 8 only the Grade 8 step, never the original text; a Grade 11 learner who has shown quadratics and definite integrals gets the full problem; traceability (problem id, competencies, source, licence, validation) | passed (fake API) | d1–d3; engine test "journey D" |
| E | Grade 4 → Grade 5: all records kept; equivalent fractions shown in Grade 4 is shown in Grade 5's "More fractions"; earlier years listed; the delayed check from Grade 4 comes back first | passed (fake API) | e1, e2 |
| F | 8 days later the delayed check is due; a wrong answer → "Review needed" (orange), not verified, even in the test build where questions count for verification; next activity "Review it" | passed (fake API) | f1; engine test "journey F" |
| Green | Verified only from the shared engine (verification@2, eligibility@2, unchanged). On shipped content (provisional) nothing can turn green; the test build marks questions as reviewed and says so on every screen | passed | engine test "verification is the shared engine's alone" |

## Incomplete / limitations

- **Django tests and the Django browser run have not been run by me**; they run in CI on the draft PR.
- **Tile design**: no approved My Learning Year design is in the repository. The tiles follow the directive's status
  rules in the existing mathematics app's style. Product-owner decision needed.
- **Content is provisional** (original, unreviewed): 10 skill modules, 101 questions, one decomposed problem, three
  goal overlays with provisional weight ranges. Most textbook skills show "No questions yet".
- **Curriculum ingestion** reads a structured text format (front matter, chapters with pages, outcome lines). It does
  not read PDFs or photos and makes no model calls. Mapping is word-overlap (`text-match@1`); unmatched outcomes stay
  provisional proposals.
- **Diagnostic likelihoods, strategy order and exam-plan chances are draft values**, not calibrated.
- The exam plan's estimate is a rough range from the learner's own practice; it is not a score prediction.
- The local browser runs used an in-memory fake API, which does not reproduce Django's validation.
