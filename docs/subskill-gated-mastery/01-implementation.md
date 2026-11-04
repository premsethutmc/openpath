# M1 — Sub-skill-gated mastery: implementation

Policy `subskill-gated-mastery@1`. **Shadow only.** Nothing reads it except tests, the S2 comparison script and these documents. The
authoritative status (`evidence.ts` `skillEvidence`: status@2, retention@2), the adaptive engine, the module selector, the app and the backend
are unchanged.

## What was built (and what was not)

No new mastery engine. The proposal is a gate over E1's existing projection (`subskill-evidence.ts`, `linear-equations-subskill-projection@1`,
mapping `linear-equations-subskills@1`):

| File | Change |
|---|---|
| `packages/learning/src/gated-mastery.ts` (new) | `gatedMastery`, `compareMastery`, `proposedRetentionPlan`, the four shadow variants. |
| `packages/learning/src/subskill-evidence.ts` | Optional `ProjectionOptions` (`exclude`, `retentionSlips`), passed through `projectFromEvents` → `projectSubSkills` → `retentionCycles`. The defaults are E1's behaviour byte for byte; every existing E1 test passes unchanged. `canonicalOrder` is extracted from `projectFromEvents` so that the comparison can use the same order. |
| `packages/learning/src/subskill-evidence.test.ts` | E1's isolation test lists the two shadow modules (reviewed). A new test checks that nothing outside tests and research imports `gated-mastery` or `gated-journeys`. |
| `packages/learning/src/question-status.test.ts` | `gated-mastery.ts` added to the registered-selector list, with its reason. It reads `phasePool`, which applies `selectable()`. |
| `frontend/src/journey/gated-journeys.ts`, `gated-mastery.test.ts` (new) | The 16 required journeys and their assertions, run through the real session. |
| `frontend/src/journey/d1e1-journeys.ts` | `workingFor` is exported, so the journeys write the same learner working. |
| `research/synthetic-learners/experiments/s2/src/journey.ts` | An optional read-only `onVisit` observer. The S2 outcome is unchanged: all 500 re-run journeys are byte-identical to the frozen traces (see 04). |
| `research/synthetic-learners/experiments/s2/m1/compare.mts` (new) | The S2 comparison. |

## The gate

`MATH.algebra.linear-equations` is independently demonstrated under the proposal only when **every** core sub-skill is currently
demonstrated by E1's own criteria:

- two-step (`lin`)
- both sides (`lboth`)
- brackets (`lbrk`)
- modelling (`auleq`, `aulwp`)

A sub-skill counts as currently demonstrated when E1 reports it as `independently-demonstrated` or `retention-due`.

- One-step (`ahone`) stays the prerequisite competency `MATH.algebra.linear-intro`. It is not gated.
- The modelling sub-skill is added to the gate. E1's `CORE` (two-step, both sides, brackets) is left as it is, because E1's discrepancy report still uses it.
- E1's criteria are reused unchanged:
  - INDEPENDENT_MIN = 2 distinct generated variants right, on the first attempt, alone, not a probe.
  - status@2: one slip does not undo a demonstration, but two of the last three wrong does.
  - A right answer whose trusted working has a false step is neutral: it is reported as contradicted and is not credited.
  - Unknown, unmapped and reader-excluded families never count.
- Evidence persists across sessions. E1 reads the whole history, so no sub-skill has to be retested in every session.

Competency status under the proposal:

1. `recovery-required` if any core sub-skill requires recovery.
2. Otherwise `independently-demonstrated`, or `retention-due` if a check is due, when all four sub-skills are shown.
3. Otherwise `developing` if any sub-skill has some evidence.
4. Otherwise `insufficient-evidence`, or `not-started` when nothing has been attempted.

## Kept-separate records (per sub-skill, in every result)

| Record | Field |
|---|---|
| Historical achievement | `historicalAchievement` (E1 `historical.everDemonstrated`). It is never erased by a failed check. |
| Current demonstration | `currentDemonstration` |
| Independent vs assisted | `independent {answers, right, distinctVariantsRight}`, `assisted {answers, right}` |
| Answer correctness | the right counts above (the server verdict, as recorded) |
| Verified vs invalid method | `method {verified, falseStep, status}`. Verified counts only under the current authority; an older authority's verdicts stay historical and are never regraded or upgraded. |
| Retention due | `retentionDue`, plus the competency-level `retentionDue[]` |
| Recovery required | `recoveryRequired`, plus the competency-level `recoveryRequired[]`, naming the sub-skill |

Provenance:

- Method verdicts come only from the server-recorded D1 decision (`trustedWorking`: `grading-decision@1`, `decidedBy: "server"`, `working-assessment@1`).
- Client fields on stored events (`mastery`, `status`, a client decision) are never read.
- **Provenance guard (all variants).** An attempt that carries a decision which is not the server's is left out of the sub-skill's evidence.
  - Without the guard, replacing a trusted "invalid working" decision with a client one would make E1 read the answer as a record from before D1, re-grade it and credit it. The independent review found this (06).
  - Records with no decision at all (before D1, or the backend's shadow grading mode) are read exactly as E1 reads them.
  - Journey 6 tests a forged history. See 07 for the residual risk.

## Retention is per sub-skill

- E1's retention@2 cycle runs per sub-skill: the check is due 7 days after the sub-skill was first shown, and any wrong answer fails it.
- Recovery needs `INDEPENDENT_MIN` new right answers alone **on that sub-skill**. Success on another sub-skill does not count.
- `proposedRetentionPlan` asks, for each due sub-skill, for `need` fresh items from that sub-skill's own families' `retention` pools:
  - `need` = min(2, the module check's items of that sub-skill), or 2 when the module check does not sample it.
  - Items never met by this learner, typed before choice items. For modelling that is typed `aulwp` before `auleq`.
  - If too few items exist, the sub-skill is reported **`unchecked`**, never passed. This is tested with an empty pool.
- Both sides and brackets are now sampled. The module's own check samples only two-step and modelling.

## Slips and guessing: shadow variants, not thresholds

| Variant | Rule | What it isolates |
|---|---|---|
| `gated` | E1 as is. | A single wrong practice answer is tolerated (status@2); repeated failure undoes the demonstration; any wrong answer in a delayed check fails it. |
| `gated-typed` | Choice answers are not independent evidence. A choice item is read from the question's own options: `:mc` variants, and `auleq`, which has no suffix. | Guessed success on choice items. |
| `gated-method` | Each equation sub-skill also needs ≥ 1 independent right answer with trusted verified working under the current authority. Modelling is exempt, as it has no equation contract. | Answer-only vs verified working. |
| `gated-slip` | One wrong answer in a sub-skill's delayed check is tolerated. The check fails at the second wrong answer and passes only with `need` distinct right answers. Until it passes, the sub-skill is `developing`, not shown. | A careless slip in a delayed check. |

None of these is recommended or activated. 02 and 04 report all four side by side.

## Comparison API

`compareMastery(learnerId, events, now)` reads the same events, in E1's canonical order, through:

- `learnerState(...).evidence(COMPETENCY)`, the existing authoritative status (unchanged);
- every proposed variant.

It returns both, with evidence, and lists the disagreements: the existing claim vs a proposed non-claim (with the missing or failed sub-skills), the reverse, and recovery disagreements.
