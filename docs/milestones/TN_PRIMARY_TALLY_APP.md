# Tally in the foundation app — 2026-11-09

Continues `e9a975a` on `data/tn-primary-ingestion-2026-11-09`. STATUS and remote heads checked first. Grade 8 `7a429a94`, answer-key `49a6be8b` and teaching-method `5d83947d` untouched. No merge/deploy/settings change.

## Behavior

Open `/foundation.html?program=tally-g3-draft` with the normal OpenPath account service. The additive Grade 3 draft uses the existing account/pupil selection, foundation stages, draft/answer records, completion gates and delayed-review due date. Learn the fifth crossing mark, record/undo/clear 0–20 marks, read a worked example, answer six fresh practice/review questions, and resume the saved stage/model/answers on another authenticated visit. Original addition, groups and fractions models keep their bounds and behavior.

Six fixed questions cover tally reading, individual frequencies (including zero), unequal-row comparison, a tie in a new context and a fresh delayed row. This is bounded practice, not exhaustive teaching or educator approval. Completion remains distinct from mastery. No TN release mapping accepted; inventory remains 144 outcomes, baseline 96 aligned / 43 partial / five unmatched. The foundation draft is visible in its existing private review app; no production release deployed.

Tally model snapshots reuse the existing six-integer envelope with a distinct validated tally shape: `[count,0,2,1,4,2]`. The backend permits integer counts 0–20 only for this model; old models still reject 20. The existing trusted grader bundle and integrity manifest were regenerated to include the new program IDs. No grading policy change.

## Evidence

Local: foundation frontend tests 7 pass; backend tests 7 pass (isolated test DB); prior ingestion/model tests 31 pass. Integration TypeScript check passes with 4 GB Node heap; default 2 GB attempt exhausted memory. Foundation app build passes. Local Chromium still aborts before page execution with `socket() failed: Operation not permitted (1)`.

A dedicated CI browser test and existing foundation browser regressions are prepared. Browser result is pending at this commit; do not infer a browser pass from unit tests. The new test checks 360/900px, real account writes, four-mark model resume in a fresh cookie-only browser context, incorrect/correct practice, stage resume, seven completed activities, delayed-review lock, separate learner isolation and no horizontal overflow. Workflow uploads screenshots and local service logs; uses only synthetic accounts on the ephemeral runner, no deployment.

## Sources and cost

Tally provenance unchanged: TN Grade 3 Term I First Edition 2026, printed pp47–49 / PDF pp54–56, outcomes l05-o01/o02; full source URL/hash in intake. Original prose/examples/SVG only; no textbook body copied.

Term III bounded follow-up found a new Grade 1 PDF via [Schools360](https://www.schools360.in/tamilnadu-1st-std-text-books/): [PDF candidate](https://drive.google.com/file/d/1hA_dGhDVQjoz3aYS_xopFXB0bJ3f71BM/view), 67 pages, SHA-256 `d0b3c23d7af28b611df725aa2fd859b87ccbd47300142fecefc7a1f9c2994417`. Printed pII/PDF p2 visually confirms First Edition 2018, ©SCERT2018, NOT FOR SALE. Rejected for revised 2026 coverage. Grade 3 TNTextbooks listing returned HTTP429. Register updated; all current-edition Term III coverage remains unknown.

Deterministic model, SVG, validation, build and tests invoke no AI APIs. Session reasoning uses tokens; no quantified cost saving claimed. Remaining: genuine browser CI result, educator/source-fidelity/accessibility review, more complete tally collection/table tasks, all other gap-plan work and current Term III sources.
