# Adaptive learning loop: integration audit (stage A1)

**Baseline:** `teaching/stage2-grade10@21ad3b8`.

**Traces:** `docs/product/evidence/adaptive-loop-traces.md`, regenerated with `bun frontend/scripts/adaptive-trace.ts`. The output is deterministic.

**Tests:** `frontend/src/learning/adaptive-loop.test.ts` and `frontend/e2e/adaptive-loop.test.mjs`.

All learners are synthetic. The traces show what the program decides, not that anyone learned.

## How a learner reaches the loop

There are three entry points into the adaptive engine from a Grade 10 lesson. They are not equally connected.

| Entry | UI | Engine | Adaptive? |
|---|---|---|---|
| Lesson → **Practice** | `frontend/src/year/CurriculumPractice.tsx:28` | A fixed queue (`teachingPracticeIds`). The next question is the first not yet answered (`:30`). | **Before A1:** no. A wrong answer showed feedback, then the next question on the list. **After A1:** a wrong answer on a problem the engine can reason about offers *Find out what went wrong*, which opens the existing recovery (`Main.tsx:290`). |
| Lesson → **Assessment** | `Learn.tsx:292` `Module` | `intervention.ts:133` `moduleState`: explore → strategy probes → chapter → guided → independent check → verify → retention. | Yes, within the one skill. The prerequisite graph is not consulted (see step 5). |
| Year page → **I'm stuck** | `Main.tsx:489` → `Learn.tsx:352` `Recovery` | `intervention.ts:262` `recovery`: investigate → diagnosis → supporting skill's module → back to the problem. | Yes, across skills. Before A1 this was reachable only from the year page. |

## Step by step

| # | Step | Actual code and data contract | Connection to the next step | Status |
|---|---|---|---|---|
| 1 | Learner enters a topic | `curriculum/Main.tsx` lesson page → `year/Main.tsx` view `curriculum-practice` (`:280`) or `module` (`:296`). Records are `learning_record` events (`records.ts`). | Practice → recovery: added in A1. Assessment → `moduleState`. | **Working** (Practice connection new in A1) |
| 2 | Learner submits an answer or working | `Learn.tsx:185` `Ask` → `POST /pupils/<id>/events/` → `backend/family/learning.py:146` `_decide`. The client records `make.attempt` (`session.ts`), which calls `decide`. | The server's verdict is merged into the records by `records.ts:48` `withDecisions`. `evidence.ts:230` `rightAnswer` reads the recorded credit first. | **Working** |
| 3 | Grading identifies the error | `grading/decision.ts:59` `grade` → `grading-decision@1` (verdict, reason, source). The server runs the same bundle, in `OPENPATH_GRADING=shadow` (`learning.py:192`). Below "kernel" source, the server's credit is the legacy comparison. | The answer verdict reaches evidence and diagnosis. **Working is not examined:** `methodExamined: false` and `firstError: null` on every trace step. `working.ts:214` `checkWorking` reports "working is not checked for this kind of problem" for `apn` and `ahpyth`. It feeds only the on-screen note and never diagnosis or evidence. | Answer: **working**. Steps of a multi-step solution: **missing** for these families. |
| 4 | Diagnosis interprets evidence | Two engines. **diagnostic@1** (`diagnostic.ts:55` `diagnose`): six hypotheses, only on a module's own diagnostic questions, tagged by `content.ts:242` `misconceptionOf`. **diagnostic@2** (`reasoning.ts:144` `reason`): each misconception predicts a specific wrong answer, and follow-up questions are chosen by information gain. Each misconception carries a `competency`. | diagnostic@2 → `nextFromReasoning` (`reasoning.ts:187`) → practise, teach or support a named competency. **diagnostic@1 never uses the misconception's competency.** For the B learner it says `procedural (0.85)` where @2 establishes `no-square-root → MATH.number.square-roots`. | Recovery: **working**. Assessment: **disconnected** from the cause (A1-G2). |
| 5 | Prerequisite graph informs the decision | `graph.ts:164` `walkSupports` (relations@1: mandatory, plausible, support, …). It is used by `recovery()` step 2 only when diagnostic@2 is unsure or unsupported. `moduleState` does not use the graph; a "prerequisite" diagnosis only reorders the module's own strategies. | For Pythagoras the graph lists triangle types (plausible), distance, similarity, triangle properties, area, and **trigonometric ratios** as supports, all from `expansion@1` and "pending educator confirmation". Square roots is not among them. Some edges look reversed: distance and trigonometry build *on* Pythagoras. In the B trace the right skill came from the content's misconception, not the graph. The recovery screen still lists all eleven graph supports as "what this problem uses". | **Unsafe** (unconfirmed, partly implausible edges shown to learners). Not on the decisive path in B. |
| 6 | A verified teaching intervention is selected | `intervention.ts:55` `orderStrategies` plus english-core `planRule`, which chooses a strategy of the module. `Learn.tsx:268` `Lesson` renders its screens. The teaching contract (`teaching-contract.ts:180` `lessonBlocks`) checks the same screens offline. | **The runtime never consults the contract.** In trace B the intervention for square roots is `worked_steps`, which the contract labels *Method* with `worked-unverified` and `text-not-instance`. The learner sees "7 × 7 = 49, so √49 = 7" on a √2809 question (screenshot in the e2e run). | **Unsafe** |
| 7 | Learner attempts a new question independently | `moduleState` "check" phase: `strategy.check`, no hints, `activity: "check"`. `evidence.ts:87` `independentAttempt` excludes guided, hinted, solution-shown and retried answers. | Feeds evidence. Answers given in the same visit as teaching cannot demonstrate a skill for the shared engine (`taughtThisVisit`). | **Working** |
| 8 | Mastery evidence is updated | `evidence.ts:152` `skillEvidence` gives the surface status: exposure, guided, independent (2 distinct right alone), transfer, review, verified. `evidence.ts:210` `evidenceFor` → `packages/mathematics/src/canonical.ts:243` `sharedProfile`, the only source of "verified". | The surface status updates correctly in every trace. The shared engine reports **`unavailable` for every Grade 10 skill in every trace**. Provisional (not educator-validated) items are held by the content gate (H-V3), so no evidence reaches the competency node. "Verified" is therefore unreachable until content is reviewed. That is a deliberate safeguard, and today it is also a hard stop. | Surface: **working**. Verification: **disconnected by design** (content review). |
| 9 | Retention or next action | `skillEvidence`: a delayed check is due 7 days after independent success, then `moduleState` "retention" phase. `plan.ts:42` `nextActivity`: due checks, review, open skill, next in chapter. | Working in A and B (passed at day 8; the next action is the next chapter, or the square-roots delayed check). A failed delayed check moves the skill to review. **Inconsistency:** after `moduleState` says *pause, ask a teacher* (B2, C), `nextActivity` still says "Carry on where you left off" for the same skill. | **Working**, with one inconsistency |

## What the three learners show

These come from the trace file. The learners are behaviour models. Each answers from the skills it has. A missing skill shows as the wrong answer the content attributes to that skill (the family's misconception for that competency). Teaching a skill's module removes the gap, which is a modelling assumption. Nothing names the diagnosis.

- **A. Strong learner, one slip (arithmetic sequences, CBSE).**
  - The slip happens in Practice and is graded `incorrect` by the kernel. The working is kept but not examined.
  - Recovery asks **three** follow-up questions. All are right, so diagnostic@2 ends `uncertain` (slip or secure) and returns to the problem.
  - No teaching is chosen, which is the right call.
  - Defects:
    - Three questions is a heavy price for a slip.
    - The retry is labelled "Solved after help" although no help was given.
    - The follow-ups are recorded as independent evidence while the learner is told "it does not count against you". The right ones count for the learner, and a wrong one would count against.
  - Delayed check passed at day 8. Status `transfer`; engine `unavailable`.
- **B. Prerequisite gap (Pythagoras, TN), entering from Practice.** This is the full loop.
  1. A wrong practice answer (900, the hypotenuse squared and never square-rooted).
  2. One follow-up question.
  3. Diagnosis established: `no-square-root` → support `MATH.number.square-roots`.
  4. The square-roots module teaches. This teaching is a Method with contract violations (step 6).
  5. A guided question, then an independent check, both right.
  6. Back to the original problem, solved after help.
  7. The Pythagoras module, then the delayed check passed.
  8. Next action: the square-roots delayed check.
- **B2. The same gap, entering from Assessment.**
  - diagnostic@1 concludes `procedural`.
  - Three Pythagoras explanations are taught; the learner keeps failing.
  - The module pauses and recommends a teacher. The supporting skill is never reached.
  - **Failed case:** the cause is known to the content but not used on this path.
- **C. Apparent success entirely assisted (probability, CBSE).**
  - Every right answer had a hint or was a retry: 15 of 18 helped, 0 of 12 alone.
  - Status stays `guided` and never reaches independent.
  - After three explanations the module recommends a teacher.
  - The learner always took "Try again" with a hint, so recovery was never opened.

## Unsupported behaviour seen

- **Step-level diagnosis of a multi-step solution:** working is not checked for these Grade 10 families. `firstError` is never set.
- **Verified mastery on any Grade 10 skill:** blocked until items are educator-validated and released.
- **Diagnosis on multiple-choice answers:** misconceptions predict typed values only. The learner model answered choices by option letter; a choice question carries no diagnosis.
- **Written and derivation tasks** (`wr:…`): wait for an educator mark. Nothing adaptive happens until then.

## Change made in A1 (minimal)

There is one connection: **Practice → recovery.**

- In `Learn.tsx` `Feedback`, a wrong, decided answer on a problem that `familyOf` can reason about shows *Find out what went wrong*.
- `CurriculumPractice` passes it through, and `Main.tsx` opens the existing `Recovery` with that question, returning to the lesson.
- The practice attempt is the recovery's first try.
- No grading, evidence, mastery, certification, quarantine or learner-record logic changed.

The other gaps (A1-G2 to G6 in the report) change engine policy or content, and are left for approval.
