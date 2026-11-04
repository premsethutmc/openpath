# Adaptive learning journey: one vertical slice (Grade 10)

**Branch:** `feat/adaptive-journey-slice`, from `feat/unified-grading@54993d7`. Nothing is merged or deployed.

**Competency:** `MATH.algebra.quadratic-discriminant` (grade range 10–10, in the Grade 10 sample release).
- Listed questions: 18/18 form-certified.
- Module pool: 302/302 form-certified.
- None quarantined.
- 3 strategies, one of them `prerequisite`.
- Supports in the prerequisite graph: `MATH.number.integer-add`, `MATH.number.exponents`, `MATH.algebra.quadratics`.

## 1. Integration audit (production code, traced by executing it)

The app's own path for "student picks a competency" is:
1. `TopicSession.tsx` → `topicCheck`
2. → `topicPlan` (`frontend/src/year/topic-session.ts`)
3. → `StudySession.tsx` → `Module` (`Learn.tsx`)
4. → `moduleState` (`intervention.ts`)

| # | Transition | Modules / functions / contract | Status before | Status now |
|---|---|---|---|---|
| 1 | Select competency | `Main.tsx` year view → `TopicSession` (target) or `Module`; `plan.ts nextActivity` | connected | connected |
| 2 | Attempt a question | `Learn.tsx Ask` → `session.ts make.attempt` → attempt record (`records.ts`) | connected | connected |
| 3 | Authoritative grading | `grade.ts decide` → `grading/decision.ts grade()` (`grading-policy@1`, `grading-decision@1`); server re-grades with the bundle (`17204038…`, unchanged) | connected | connected |
| 4 | Student-working verifier | `working.ts checkWorking`, shown in `Learn.tsx` feedback only. Not recorded, not read by diagnosis or evidence. `canCheckWorking` is false for the discriminant families. E7 (`assessment-policy.ts`, `process-shadow.ts`) is imported by no production module. | **disconnected** (display only; not available for this competency) | unchanged (E7 deliberately advisory) |
| 5 | Diagnostic interpretation | `diagnostic.ts diagnose` (diagnostic@1, per module); `reasoning.ts reason` (diagnostic@2) in `topicCheck` and `recovery` | **missing link**: a diagnostic@2 finding from the topic check was dropped. The module re-diagnosed with diagnostic@1, got `insufficient_evidence`, and went straight to verification. | connected (findings@1) |
| 6 | Prerequisite graph | `graph.ts walkSupports`; a bug's `competency`; `nextFromReasoning` → `support` | connected: the topic check assesses `integer-add` | connected |
| 7 | Teaching / intervention | Module strategies (`content.ts`), `make.teach`, `planRule` (english-core) | **missing link**: an established misconception was never taught when the target already read as "independent" (2 of 3 right) | connected; content is **unreviewed** (see blockers) |
| 8 | New independent question | The strategy's `check` (unseen), then `fromPool` | connected | connected |
| 9 | Evidence and mastery | `evidence.ts skillEvidence` (status@2; assisted vs independent) | connected; see defects D1 and D2 | unchanged (mastery policy not modified) |
| 10 | Next action | `plan.ts nextActivity`; `topicPlan` | **missing link**: `topicPlan` left the target out when it read as shown, so its pending teaching was never scheduled | connected |

**Retracted.** The earlier "repeated check" loop (`check:gen:disc:-2,-3:mc` asked repeatedly) came from the test harness, not the planner. The scripted learner typed a number into a multiple-choice question, and authoritative grading correctly returned `unresolved.invalid-response`, which is never an attempt, so the question was asked again. Once the harness answered choice questions with letters, there was no loop.

## 2. The slice (what was connected)

**`packages/learning/src/intervention.ts`**
- **`investigation(qid, records)`:** the diagnostic@2 reading of a first answer plus its investigation answers. `recovery` now uses it too, with the same behaviour.
- **`ownFinding` / `findingResolved` (findings@1):**
  - A finding is a misunderstanding that diagnostic@2 *established* on one of the module's own questions. It needs two matching answers; `need_more` and `uncertain` establish nothing, which is how the slice abstains.
  - In `moduleStep`, an open finding replaces only an inconclusive own diagnosis (`null`, `insufficient_evidence` or `secure`).
  - While the finding is open, the "shown → verify" shortcut is held back, so the existing planner teaches → guided → check alone.
  - The finding closes when a fresh answer alone after teaching is right.
  - **Evidence and status are not touched.**
- **`recovery`:** a follow-up the learner has already answered is never proposed again. It would be a second try (n > 1), which the reading excludes. Before the fix it was re-asked indefinitely, and each repeat was recorded as assisted.

**`frontend/src/year/topic-session.ts`** (planning adapter, no rendering)
- When the target's module has teaching pending, `topicPlan` adds the target after the supporting skill.

**No change to:** grading, quarantine, certification, evidence, mastery, records, E7, the server bundle, the UI components, teaching Stage 1 or learner vectors.

## 3. Traces (`research/adaptive-journey/traces/*.json`, schema `adaptive-journey-trace@1`)

**How they were produced:** `frontend/src/learning/adaptive-journey.ts`.
- The **engine is real.** Every step goes through `topicCheck`, `topicPlan`, `moduleState`, `make.attempt` and `learnerState`, as the app calls them.
- Only the **learner's answers are scripted.** The engine is not told the scenario.
- The traces are reproducible: two runs give byte-identical files.
- Each step records:
  - question, competency, form certification and quarantine;
  - the response and the authoritative decision;
  - whether the answer was recorded as an attempt;
  - step findings (supported or not);
  - the E7 shadow (advisory);
  - diagnosis with confidence and posterior;
  - diagnostic@2 status, best explanation, competitors and support;
  - the finding;
  - the intervention (support, plan, strategy, module review state);
  - evidence before and after;
  - the next action.
- One step in A1 is marked `supplementary`: investigating a module answer, which the app never does (recovery opens only for "stuck" problems).

| Trace | What happened | Safeguard |
|---|---|---|
| **A1** one slip on a fresh question alone | After 8/8 right alone, one wrong choice (`gen:disc:-1,5:mc`, `incorrect.value`). Status stays `independent`, then `transfer`. No teaching, no prerequisite in any plan. The delayed check 8 days later passes (16/17 alone). Supplementary investigation: two right follow-ups, so the reading is `need_more`, then *unsure* ("could be: knows it; the mistake was a slip"), never a misconception. Recovery then points at checking an unshown supporting skill (D5). | **holds** |
| **A2** one slip on the delayed check | No teaching, no prerequisite, no evidence lost (18/19 alone). But status becomes **`review`**, and stays `review` after 5 further right answers alone. | **partly**: see D1 |
| **A3** two separate slips (defect reproduction) | The module **pauses** with "Every explanation here has been tried", though nothing was taught. | **fails**: see D2 |
| **B** prerequisite gap ("subtracting a negative") | See below. | **holds** |
| **C** right only with hints | Assisted 3/3, alone 0/6. Status `guided`, never independent. Three strategies taught, then `pause` (to a person). Next action: continue this skill. | **holds** |

**Scenario B, step by step:**
1. **Topic check:** the learner gives the misconception's answer to `gen:disc:-7,-18`.
2. **Investigation:** `gen:disc:-1,-1` matches it, so diagnostic@2 establishes `minus-c-sign` → `MATH.number.integer-add`.
3. **Supporting skill:** `integer-add` is assessed (3 diagnostic questions; the misconception shows on `-23 − (−22)`). It reads 2 of 3 right, so it is not remediated as a whole skill.
4. **Plan:** the target first.
5. **Teaching:** the target's `prerequisite` strategy "Subtracting a negative".
6. **Guided question:** recorded as help (assisted +1, independent +0).
7. **New check alone:** `gen:disc:-10,20`, never seen before, graded `correct`. Independent +1, and the finding closes.
8. **Then:** 9 fresh questions alone; status `transfer`. Next action: the next chapter.

## 4. Tests

- `bun test packages/learning/src`: 1454 pass / 0 fail.
- Django: 302 tests, OK.
- Frontend type check: `tsconfig.json` 0, `tsconfig.english.json` 0, `tsconfig.mathematics-integration.json` 170 (identical to the Phase 1 baseline).
- Grader bundle rebuilt: `17204038…`, unchanged.
- Journey test: 5/5; traces byte-identical across runs.
- Full frontend unit suite: see the follow-up commit.
- `frontend/src/learning/adaptive-journey.test.ts` asserts the safeguards, plus for every question asked:
  - not quarantined;
  - generated forms certified;
  - unresolved answers never recorded;
  - E7 annotation advisory.

## 5. Defects and blockers to a supervised pilot

- **D1 (evidence policy, needs a decision):** any wrong answer on the delayed check fails retention (`evidence.ts`), and the failure is permanent: the check never becomes due again. One careless slip a week later leaves a learner with 18/19 alone at `review` indefinitely. Not changed here because it is mastery policy.
- **D2 (module):** strategy checks are also used as verification questions. After a later status drop, no strategy has an unused check, so the module pauses and wrongly says "every explanation has been tried", with no teaching possible.
- **D3:** the student-working verifier is display-only and unsupported for this competency. Step-level findings cannot inform diagnosis anywhere yet.
- **D4:** a support skill is judged at skill level. `integer-add` at 2 of 3 right is "shown" despite an established sign misconception, which is then taught only inside the target.
- **D5 (calibration):** after a slip, diagnostic@2 with right follow-ups reads "uncertain" rather than "slip". In the stuck-problem flow, that sends the learner to check unshown supporting skills.
- **Content:** the module's teaching and the families are **not educator-reviewed** (review state `draft`). There is no verified lesson, and no skill can reach `verified`.
- **Not exercised:**
  - React rendering and browser end-to-end (the driver calls the same engine functions the components call);
  - the server's re-grade path (covered by the Django tests);
  - PostgreSQL;
  - a lockfile-exact `npm ci`;
  - real learners.

**Synthetic runs show the components work together. They say nothing about educational effectiveness.**
