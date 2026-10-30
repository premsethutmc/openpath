# Phase 4: adaptive evidence and investigation

**Branch:** `feat/adaptive-evidence-investigation`, from `e2176d2` (Phase 3). Nothing is merged or deployed.

**Commits:**
- `a704d3a`: harness only. Exports the scripted-answer helpers, adds a grade parameter, and records working lines.
- `5b0c429`: the integration, its tests, and the evaluation artefacts.
- A report-only commit follows.

**Kept apart throughout:**

| Kind of information | Where it lives |
|---|---|
| Grader-established correctness | `grading-decision@1` / `assessment@1`, recorded and copied, never re-derived |
| Observed behaviour | attempts: response, activity, help, session |
| Hypotheses | `learner-hypothesis@1` |
| Teaching decisions | module and planner |
| Mastery and retention policy | `evidence.ts` |

The mathematical grading engine, certification, quarantine and the server bundle are unchanged.

## 1. The Phase 3 contract is preserved

`learner-hypothesis@1` (in `hypotheses.ts`) is still the single interpretation that four paths read: the starting check, the skill module, the stuck-problem flow and the planner. Its identifier and existing fields are unchanged. It gains these fields:

| Field | Meaning |
|---|---|
| `probes[]` | Later answers to questions that tell the misconception apart from the target (resolution-probe@1). |
| `uncertainty` | Counts of probe answers for, against and inconclusive. No probability is claimed. |
| `teachingDue` | The misconception needs teaching now. |
| `probeDue` | A discriminating question is owed after teaching. |
| `trigger` | Why the investigation began. |
| `contested` (new status) | Untaught discriminating answers were right on two different questions. The hypothesis is kept open, not resolved. |

## 2. Evidence-based misconception resolution (`resolution-probe@1`)

**What a probe is.** `reasoning.ts probeReading(question, explanation, response?)` is family-independent and uses only the problem's own modelled explanations and values. A question **discriminates** an explanation when two things hold:
- the explanation predicts at least one wrong answer there;
- none of its predictions equals the right answer.

**How a response is read.** Each response is `correct`, `predicted`, `other` or `unreadable`. Choice questions are read by option. Each probe record holds:
- the hypothesis id, its contract and policy version;
- the prediction values;
- the question and family;
- the expected target;
- the response and how much help was given;
- the recorded grader decision (credit and source);
- whether it came after teaching, and its outcome.

**Outcomes.** `contradicts` means right, alone. `supports` means the predicted answer, alone. Anything assisted, `other` or `unreadable` is `inconclusive`.

**Resolution rule.** This replaces "any fresh right answer". A hypothesis is resolved only when all of the following hold:
- teaching was delivered in scope after it was established;
- a contradicting probe came after that teaching;
- no supporting probe came after it.

A supporting probe after teaching sets `teachingDue`. The module then teaches a strategy not yet delivered, or hands over to a person when every strategy has been delivered.

**When no probe is available.** `discriminatingProbe()` searches the skill's lists and pools for a question that is unseen, selectable, form-certified, within the learner's grade and discriminating. If none is left, the hypothesis **stays open** and the module carries on, so learning is never blocked. This is tested by exhausting the probes with help-assisted answers.

## 3. The retention dead end is repaired (`retention@2`, in `evidence.ts`)

The existing rule is kept: any wrong answer fails the delayed check.

New behaviour:
- A failed check is kept in `retentionHistory` (`due`, `result`, `failedAt`, `recoveredAt`). The failure is never forgiven, and time alone changes nothing.
- **Recovery:** after the failure, `INDEPENDENT_MIN` (2) different fresh questions answered right, alone, outside the delayed check.
- After recovery, a **new** delayed check is scheduled `RETENTION_DAYS` (7) later.
- Status stays `review` until recovery.
- Verification still needs the shared engine and a passed check.
- With no failed check, retention@2 is identical to retention@1.

**Tests** (`retention-cycle.test.ts`):
1. A failure stays failed, including after 30 days with nothing answered.
2. Recovery schedules a new check at exactly recovery time + 7 days, and the failure is kept.
3. Repeated failures followed by a pass give a history of `[failed, failed, passed]`.
4. Behaviour with no failure is unchanged.

**Policy parameter for the product owner:** recovery currently counts right answers in the same session as the failure (as in journey A2). A stricter option would count only answers in a later session.

## 4. Investigating practice and verification errors (`investigation-trigger@1`)

**When it starts.** A module investigates the learner's latest answer alone (practice, transfer or a check) only when that answer is wrong **and** one of these holds:
- a modelled misconception predicts that exact answer (`modelled-error`);
- two of the last three answers alone in this skill were wrong (`repeated-errors`).

An isolated, unexplained slip is never investigated.

**Bounds:**
- The family must be one diagnostic@2 can read.
- Nothing is investigated while a hypothesis for the skill is established or contested; the new answer is a probe of it instead.
- At most two investigations are started per skill per session.
- Each investigation asks at most three follow-ups.
- Already-seen follow-ups are never asked.

**What is recorded.** The reason is stored as `trigger`, the follow-up answers carry `context: investigate:<question>`, and the outcome is kept: `established`, `insufficient` or `unsupported`. The learner continues once the investigation ends.

**Wiring.** `ModuleState.context` is passed through `Driver.step` and **one prop in `Learn.tsx` (`context={ms.context}` on `Ask`)**. This is the only learner-UI change. It does not change what is shown.

## 5. E7 stays advisory and gated

Nothing in `5b0c429` imports `assessment-policy.ts`, `process-shadow.ts`, the claim ledger or proof obligations on a production path. Only the test harness imports them, as before. The shadow-evaluation proposal is in `PHASE4_E7_SHADOW_PROPOSAL.md`. **There is no activation.**

## 6. Teacher-facing evidence (design and view model only)

`teacher-evidence.ts` is a read-only view model and is not wired to any UI. The design is in `PHASE4_TEACHER_EVIDENCE.md`. Each statement is one of four kinds:

| Kind | Certainty | What it says |
|---|---|---|
| `observation` | `verified` (or `unknown` when nothing was recorded) | The question, right or wrong, alone or with help, and the activity. Includes the first invalid step from the kernel where recorded, and whether working was written, which is never treated as evidence. |
| `hypothesis` | `suspected` | Always worded as a possibility, e.g. "Possible misunderstanding (not a confirmed fact): …". |
| `teaching` | `record` | Instruction delivered, and whether a check alone afterwards was right. |
| `policy` | `policy` | Status, counts and the delayed-check history. |

A contract test checks hypothesis wording ("Possible…", "Earlier possible…", "A wrong answer…") and checks that confident phrasings are absent. Learner-facing presentation is out of scope.

## 7. Evaluation

**Independent scenarios.** Ten scenarios were written by a separate author from the specification only, without the engine changes (`frontend/src/learning/phase4-scenarios.ts`).
- They cover 7 competencies across grades 7, 8 and 10: arithmetic sequences, coordinate distance, quadratic discriminant, linear equations, trigonometric ratios, factorisation and square roots.
- Each scenario states the learner's ground truth and spec-derived expectations.
- I made one syntax-only fix to the scenario file (TS parameter properties, rejected by `erasableSyntaxOnly`).

**Harness defect found by the scenarios and fixed in both trees.** For a choice question, a modelled misconception predicts an option *position*. The shared `bugValue` helper returned the position as if it were a value, so scripted learners could not express their misconception on multiple-choice questions. They answered an arbitrary wrong option instead. `bugValue` now maps the position to the option. The baseline and new runs both use the fixed harness, and the comparisons below use the fixed harness only.

**Baseline:** the Phase 3 engine at `a704d3a` with the same harness. **New:** `5b0c429`. Outputs are in `phase4/scenarios-{baseline,new}/`; `phase4/metrics.py` recomputes the table. Both runs are deterministic: two runs of the new code were byte-identical.

| Scenario (competency) | Baseline | New |
|---|---|---|
| isolated-slip (arithmetic sequences) | no investigation, no hypothesis | same |
| repeated-misconception (coordinate distance) | `added-sides` established | same |
| correct-nondiscriminating (discriminant, `forgot-four`) | **resolved** (false: learner still holds it) | **established**: right answers on non-discriminating questions are not evidence; status `guided` from the probe errors |
| correct-discriminating (arithmetic sequences, `n-jumps`) | resolved | resolved (true) |
| wrong-after-teaching (linear equations, `forgot-divide`) | established | established |
| no-probe-available (trig ratios) | unsupported (nothing established) | same. The scenario could not establish a misconception, so this path is covered by the focused contract test instead. |
| failed-delayed-check-then-recovery (coordinate distance) | `review` / `failed`, permanent | recovered → new check scheduled → **passed** (`transfer`), failure kept in history |
| practice-error-investigation (factorisation) | **no investigation** | investigated in the module (3 follow-ups, `modelled-error`) → `unsupported`: not confirmed, recorded honestly |
| unsupported-working (discriminant) | working ignored, no hypothesis | same; working recorded and never used as evidence |
| conflicting-evidence (square roots, `half-for-root`) | **resolved** (false: shown again in session 3) | resolved in session 2, **re-opened** in session 3 by a supporting probe, ends `established` |

**Measures** (10 scenarios):

| Measure | Baseline | New |
|---|---|---|
| False misconception resolution | **2** | **0** |
| Unnecessary investigation (spec "should not" and investigated) | 0 | 0 |
| Missed investigation (spec "should" and none) | 1 | 0 |
| False establishment / missed establishment | 0 / 0 | 0 / 0 |
| Hypotheses left unresolved at the end (`established`, `contested`, `insufficient`, `unsupported`) | 3 | 6 (more honest: false resolutions now stay open; new investigations end `unsupported`) |
| Investigation questions asked | 9 | 12 |
| Retention regression (no failed check: A1, isolated-slip, correct-discriminating and others) | — | none: identical outcomes |

**Journeys A1–C** (same harness, Phase 3 vs Phase 4; `phase4/journeys-baseline/` vs `traces/`):
- **A1:** unchanged.
- **A2, A3:** after one delayed-check slip, two right answers alone schedule a new check. Status goes `review` → `transfer` (scheduled) instead of staying `review` forever.
- **B:** a discriminating probe (`gen:disc:-2,-7`) is asked earlier. The hypothesis resolves with "3 against, 0 for"; the non-discriminating block check alone would no longer have resolved it.
- **C:** repeated wrong answers alone trigger module investigations (2 × 3 follow-ups, ending `unsupported`). Assisted success is still not independent: alone 0/9.

**Scenario construction limits** (stated by the independent author):
- (6) No family has a misconception with no discriminating questions, so "no probe" is shown by exhaustion in a contract test.
- (10) The harness cannot reach session-2 questions without the module teaching first, so `contested` (untaught right answers) was not reached through a journey. A focused contract test covers it instead: two discriminating answers right alone without teaching → `contested`, then a predicted answer → `established` with `teachingDue`.
- (8) Most errors came from questions drawn from the pool.

## 8. Regression results

Only completed runs are reported.

| Suite | Phase 3 (`2a33767` / `6460969`) | Phase 4 |
|---|---|---|
| `bun test packages/learning/src` | 1454 / 0 | **1454 / 0**. Two notes: (1) the selector-registration guard failed on the first run, because the new `hypotheses.ts` imports the pool selectors (it applies `selectable()` and `formCertified`); it is now registered in `question-status.test.ts`, a reviewed change to the guard's list. (2) In one run, the E3 differential fuzz test timed out at 5 s while CPU was shared. It passes alone (45/45) and in the clean full run. This flake was already known from the E7 gate. |
| Frontend unit tests (clean worktree of `5b0c429`) | 472 / 474 | **480 / 482** (+3 retention, +5 evidence contracts); the contested test added in `2db1c44` passes in its file (6/6) |
| Django (SQLite) | 302 OK | **302 OK** |
| Type check (main / English / mathematics-integration) | 0 / 0 / 170 | **0 / 0 / 170** (the existing baseline) |
| Server grader bundle | `17204038…` | `17204038…` (unchanged) |
| Journey and scenario traces, two runs | identical | identical |

**Pre-existing failures (both phases):** the 2 `aofclass` generator tests. **New failures:** none after the registration above.

## 9. Remaining gaps

1. **Contested** is covered by one contract test only, not by an end-to-end scenario.
2. **Probe search is local.** It covers the observing skill's lists and pools only. A cross-family probe (a bug's `probe` question in another family) is not used.
3. **Investigation uses only modelled misconceptions.** 1,035 of 1,080 families have them. Errors the model does not predict end `unsupported`, which is correct but uninformative.
4. **Working evidence is still not an input to diagnosis.** It is recorded and shown to teachers as "not assessed". E7 is not active.
5. **Recovery may happen in the same session** as the failed check (policy choice, §3).
6. **The teacher view is a view model only.** No screen is built. Hypothesis history is derived, not stored.
7. **Not exercised:** the browser end to end, PostgreSQL, a lockfile-exact `npm ci`, and real learners. **Synthetic results show the controls behave as specified; they say nothing about learning outcomes.**

## 10. Decisions for the product owner

1. Recovery standard after a failed delayed check: two right answers alone in any session, or only in a later session.
2. Investigation budget: currently 2 per skill per session, at most 3 follow-ups each.
3. Whether `contested` hypotheses (right without teaching) should eventually close without teaching.
4. E7 shadow evaluation: approve the proposal in `PHASE4_E7_SHADOW_PROPOSAL.md` before any recording.
5. Teacher view: approve the wording and the four statement kinds before a screen is built.
6. The one-prop change in `Learn.tsx` (investigation context on `Ask`).
