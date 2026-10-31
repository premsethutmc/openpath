# 1. Existing learner state and family mapping

Base: `feat/linear-equations-teaching` at `4f97427b2734b448a15d4f0601fe5596957c42b8`. Competency **`MATH.algebra.linear-equations`**. No competency was added or duplicated.

## The pipeline, from question to mastery

| Stage | Where (file:line at 4f97427b) | What it carries |
|---|---|---|
| Question generation | `families.ts` (lin :893), `fam/b08.ts` (lboth :937, lbrk :980, ahone :179), `fam/b21.ts` (auleq :249, aulwp :305), `families.ts` (meet :239) | id `gen:<family>:<params>[:mc\|:w]` (`families.ts:1345–1361`). The **family is recoverable from the id**, deterministically (`problemOf`, `exposureKey :1588`, `inPool :1596`). |
| Trusted grading | `server-grader.ts:23 gradeRequest`; backend `family/learning.py` `_decide :146`, `checked_learning :305` | the server's `decision` (verdict) per attempt. `_assessment_ok :126` refuses any client `derivationVerified` or `aiFallbackUsed`. |
| Method verification | `derivation-interface.ts` `authorizeWorking :37`, `workingEvidence :63` | **not recorded in learner evidence.** Its only caller, `frontend/src/journey/session.ts:83–87`, writes it to the trace. The attempt keeps the raw `working`. |
| Evidence ledger (stored) | Django `PupilEvent` (`models.py:54`), append-only with `seq`; `views.py:427` | `learning_record` attempt: `{id, at, learnerId, sessionId, questionId, response, activity, hints, solution, competency, working?, assessment?, decision?}`. There is **no family field**: the family exists only inside `questionId`. |
| Reading back | `records.ts:99 readRecords` | dedupes by id; drops unknown, quarantined, unresolved and pending answers; `n` = attempt number per `exposureKey`; `credit` = the server verdict. |
| Shared ledger | `evidence.ts:90 ledgerFor` | every attempt becomes an english-core event. Item family is `learn:${q.skill}@1`, which is the **same for every linear family**. |
| Composite state | `evidence.ts:159 skillEvidence`, `:240 evidenceFor`; `session.ts:37 learnerState` | status@2 (`not_started … verified`), retention@2, `recoveryRequired`; `INDEPENDENT_MIN = 2`, `RETENTION_DAYS = 7`, `RETENTION_CHECK = 2`. |
| Adaptive selection | `intervention.ts:189 moduleState` → `moduleStep :202`; `fromPool :51` cycles the module's families | reads `SkillEvidence` and records. `subSkillGap :399` already looks at families, but only to decide **what is taught**. |
| Independent rechecks | `intervention.ts:412 blockCheck` | a strategy's check question, else the pool's check phase. |
| Delayed retention | `evidence.ts:183–206` (retention@2); module retention list `gen:lin:6,17,2`, `gen:auleq:2,9,19,11` | any wrong answer fails the check; recovery = 2 distinct right answers alone outside the check; a new check 7 days later. |
| Recovery | `intervention.ts:473 recovery()` | |
| Persistence and replay | Django store; `SliceSession.fromEvents`; `withDecisions` (`records.ts:48`); `scripts/m1/m2-persistence.sh` | |

## Where evidence from different families is combined

1. **`evidence.ts:154–160` `about(id)`.** Every attempt whose question's competency is `MATH.algebra.linear-equations` (lin, lboth, lbrk, auleq, aulwp, meet) joins one list, `mine`. `distinctRight` (`:167–172`) counts distinct question ids across all families. `INDEPENDENT_MIN` (2) right answers of **any** family therefore show the whole competency.
2. **`evidence.ts:58–69` `nativeItem`.** Every linear family gets the same ledger item family `learn:MATH.algebra.linear-equations@1` and target. The shared engine (`sharedProfile`, `packages/mathematics/src/canonical.ts:243`) cannot tell the families apart either.
3. **retention@2 (`evidence.ts:183–206`).** The delayed check is the module's list (one lin and one auleq question). Recovery accepts right answers of any family.

## Interfaces reused, and why no new engine is needed

The family is already in every stored attempt's `questionId`. The projection therefore needs no new event field. It reads `readRecords` output and reuses, without changing them:

- `independentAttempt` and `rightAnswer`;
- `INDEPENDENT_MIN`, `RETENTION_DAYS` and `RETENTION_CHECK`;
- the status@2 and retention@2 rules;
- `exposureKey` and `problemOf`;
- `authorizeWorking` and `workingEvidence`.

The micro-skill mechanism (`Def.skill` / `Competency.partOf`) was **not** used. It would change ledger item families and therefore the authoritative state.

## Family → sub-skill (linear-equations-subskills@1)

| Family | Generates | Competency | Sub-skill |
|---|---|---|---|
| `ahone` | x ± a = b, ax = b (one step) | `MATH.algebra.linear-intro` (mandatory prerequisite, audit@1) | `linear-equations.one-step@1` (see note) |
| `lin` | ax + b = c | linear-equations | `linear-equations.two-step@1` |
| `lboth` | ax + b = cx + d | linear-equations | `linear-equations.both-sides@1` |
| `lbrk` | a(x + s) = cx + d | linear-equations | `linear-equations.brackets@1` (always also has x on both sides) |
| `auleq` | choose the equation of a story (choice) | linear-equations | `linear-equations.modelling@1` |
| `aulwp` | form and solve from a word problem | linear-equations | `linear-equations.modelling@1` (also exercises solving; see below) |
| `meet` | where a line meets y = x² (a quadratic set answer) | linear-equations (tag) | **unmapped → unknown** (not linear-equation solving; not in the module's pools) |

**Note on one-step.** The competency has **no** one-step family. The one-step sub-skill is read from `ahone`, which belongs to the prerequisite competency. Its own competency and state are unchanged.

## Families that exercise more than one sub-skill

These are credited to **one** sub-skill only, so there is no cross-credit:

- **`lbrk`**: brackets, and x on both sides (c ≥ 1).
- **`aulwp`**: modelling, a two-step solve, and for some story kinds (k = 2, 3) expanding a bracket. The kind is not stated by the generator, so no solving sub-skill is credited.
- **mc formats** of every family test recognition, not production.
