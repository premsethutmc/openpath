# 1. Integration architecture

## Branches

| | Commit | Content |
|---|---|---|
| D1, PR #88 (`feat/grader-teaching-integration`) | `adb27a1` | Base of this branch. The trusted grader records the answer verdict and the working verdict (`working-assessment@1`) in the server decision. |
| E1, PR #89 (`feat/linear-equations-subskill-evidence`) | `c2cc33c` | Canonical E1: the shadow sub-skill projection `linear-equations-subskill-projection@1`. Merged here as `46f43c8`. |
| Alternative E1 (`feat/sub-skill-mastery-evidence`) | `0d1f622` | Reference only. Doc 3 lists what was reused; none of its code was merged. |
| This branch (`integration/d1-e1-subskill-evidence`) | see doc 7 | |

D1 and E1 change no common file, so the merge is conflict-free. Both start from A3 `4f97427`.

## One evidence path (no second engine)

```
learner submission (answer + working)
  -> trusted grader (D1, server-side bundle): grading-decision@1
       verdict / credit                      -> records.ts readRecords -> evidence.ts skillEvidence   (AUTHORITATIVE, unchanged)
       working: working-assessment@1         -> stored inside the decision (Django event body + decision log)
  -> stored events (decisions inside)
       -> subskill-evidence.ts projectFromEvents (E1, SHADOW, authoritative: false)
            sub-skill   = generator id family (versioned mapping linear-equations-subskills@1; unknown fails closed)
            credit      = the same rightAnswer / independentAttempt as the authoritative state
            method      = ONLY the server-recorded working verdict (D1); never recomputed, never a client field
            discrepancy = where the authoritative competency status claims more than the sub-skill evidence
```

## What changed on top of the two branches

| File | Change |
|---|---|
| `packages/learning/src/subskill-evidence.ts` | The method source is now D1's server-recorded verdict (`trustedWorking`, the same guard as `records.ts`). The recomputation with `authorizeWorking` is removed, so no record is re-judged under newer rules. New categories: `unsupported`, `partial`, `partialWorking` (unresolved partial derivations), `notRecorded`, `historical` / `historicalVerified`. Decisions are read only for records the reader admitted, for the same learner. The order tie-break uses canonical content. |
| `packages/learning/src/subskill-evidence.test.ts` | The unit harness now attaches real D1 grader decisions. Adds 7 integration-contract tests and a static import-isolation test. |
| `frontend/src/journey/d1e1-journeys.ts`, `d1e1-journeys.test.ts`, `scripts/d1e1-journeys.mts` | The twenty journeys (doc 4) |
| `frontend/scripts/d1e1-persistence.{mts,sh}` | Django round trip of D1 verdicts and projection in a new process |
| `frontend/scripts/d1e1-leakage-scan.mts` | Leakage scan over the M2 scenarios plus two module-flow learners (doc 5) |

Nothing else changed:

- the authoritative evidence engine;
- the adaptive policy;
- the grader;
- the teaching content;
- the backend;
- the stored events.
