# 7. Independent review

## Setup

A separate review agent read the code cold. It was told what the code is meant to do, but not the author's conclusions.

- **Reviewed:** `eabbfcb`.
- **Read-only:** it changed no files.
- **Tests run:** the E1 tests passed (bun 7/7, node 8/8).
- **Throwaway checks:** it wrote its own scripts to probe edge cases.
- **Property results:** 1 (no cross-family success) and 5 (non-authoritative) hold. 2, 3 and 4 held only in part.

All findings were addressed in `9368ffd`, except where a finding was documented instead of changed (marked below).

## Findings and resolution

| # | Severity | Finding | Resolution | Test |
|---|---|---|---|---|
| 1 | should-fix | A failed delayed check left the sub-skill "shown", while production says "review". This under-reported leakage. | A failed check that hasn't been recovered gives status `review`. `firstShownAt` and the history are kept. | "a failed delayed check … is review (as production)" |
| 2 | should-fix | One delayed-check answer counted as "passed". Production needs `min(RETENTION_CHECK, module retention questions)` distinct answers. | `checkNeeds` = min(RETENTION_CHECK, the module's retention questions in this sub-skill's families). With 0, the retention is `not-in-delayed-check`: a content gap, reported separately from learner findings. | "passing a delayed check needs production's number …" |
| 3 | should-fix | Some inputs were not explicit: marks, superseding decisions, the grading mode for records with no decision, and the review registry. | Optional `marks` and `decisions` are passed to the same readers production uses. `inputs` records the grading mode and counts and is part of the digest. **Documented, not changed:** `production.verified` reads the active review registry, exactly as the production engine it reports on. | unit tests; doc 2 |
| 4 | minor | Decisions were read from events that `readRecords` rejected (another learner, the last duplicate). | Decisions are read only for accepted attempt ids, for the same learner, first occurrence. | "… another learner's event never supplies a method verdict" |
| 5 | minor | `methodOf` did not require a server decision. | It now requires `schema: grading-decision@1` and `decidedBy: server`, the same guard as `records.ts`. | same test |
| 6 | minor | Ties and duplicates could reorder by input position, and `localeCompare` depends on locale. | Order is by (at, id, canonical content), compared by code point. | "ties and duplicates cannot reorder …" (seeded shuffle ×20) |
| 7 | minor | Probes were counted. | Excluded, as production does for a competency. | "probes are not evidence …" |
| 8 | minor | Method tallies mixed assisted and independent answers. | `alone` gives counts for answers given alone only. `method` keeps all attempts. | unit test: brackets `alone.verified` is 1, `method.verified` is 2 |
| 9 | note | The delayed-check leakage fires for every learner who passes production's check, because the module's check has no both-sides or bracket question. | Kept as a learner finding where it applies. `notInDelayedCheck` reports the content gap separately. The two rules on verified and passed checks merged into one finding. | E1-06, doc 3 |
| 10 | note | The projection's due date starts from the sub-skill's own first success. Production uses the later of `independentAt` and the engine's first demonstration. | **Documented** (doc 8): sub-skill due dates can differ from production's competency due date. | — |

## Test-quality points

| Point raised | Resolution |
|---|---|
| The determinism test was trivial: 7 events with distinct timestamps. | Now covers ties, duplicates and 20 seeded shuffles. |
| The import-isolation test did not cover `sub-skill-journeys.ts`. | Now only test files may import either module. |
| E1-01 proves nothing cross-family, because it has no `lboth` / `lbrk` attempts. | Agreed. The cross-family proof is E1-02 and E1-03: wrong on every both-sides and bracket question while production says transfer. E1-01 shows the competency-level claim from two-step alone. |
| Failed retention had no test. | Added. |
