# Completing the square: adaptive help

**Status: provisional.** The help content is original, not reviewed by an educator, and formative only. It never
verifies mastery.

This adds a temporary **help branch** to the nine-step reference unit (see `COMPLETING_THE_SQUARE_UNIT.md`).

* The nine steps, their 64 questions and their completion rules are unchanged.
* Content version 1.1.0 adds help questions and tags; 1.0.0 records still replay (`compatibleVersions`).

| What | Where |
| --- | --- |
| Help content: 11 rules, 22 strategies, 51 questions, the transfer diagnosis | `content/mathematics/programs/completing-the-square.v1.json` → `remediation` (authoring source `content/mathematics/programs/src/completing-the-square.py`) |
| Decision logic | `packages/mathematics/src/remediation.ts` |
| Replay of help records (teaching blocks, set-aside help, every attempt) | `packages/mathematics/src/unit.ts` |
| Screens | `frontend/src/mathematics/unit/Unit.tsx` (`HelpOffer`, `Help`, `SimilarExample`, `MinimumExplorer`) |
| Server rules | `backend/family/mathematics.py` (`teach`, `skip`, help questions) |
| Journeys and tests | `frontend/src/mathematics/unit/journeys.ts`, `remediation.test.ts`, `CTS_ADAPTIVE_JOURNEYS.md` |

## What is reused, and what is not new

* **The planner** (`english-core/src/planner.ts`, `planRule`) makes every teaching decision:
  * teach, then guided practice, then an independent reassessment;
  * a failed strategy is never repeated;
  * a person is recommended when the strategies run out.

  The unit runs it with the draft policy and only its block size changed: one guided question, one fresh check and no
  contrast items. Every other setting is the draft value; the tests check `diagnosticMax`, `hintLevels`,
  `maxStrategiesBeforeHuman`, `retentionGapDays` and `retentionItems`.
* **The rule state** the planner reads (`RuleState` from `rule-evidence.ts`) is built only from the learner's own
  records (`ruleState`). No other learner model or mastery calculation exists.
* **The evidence ledger** records, in its own kinds:
  * each teaching block as an `intervention` (its guided question is listed as shown in teaching, so `assisted@1`
    applies);
  * guided answers as `assisted_response`;
  * checks and quick diagnostic questions as `evidence` with `provenance@1`;
  * hints as `hint`.
* **The content gate and the single verification definition** are unchanged. All help content is provisional, so it
  is held and can never verify mastery.
* **The competency graph** (`content/mathematics/curriculum.v1.json`): each prerequisite rule names a competency in
  the graph.
  * Squaring a bracket → `MATH.algebra.identities` (upstream of `MATH.algebra.quadratics`).
  * Keeping an equation balanced → `MATH.algebra.linear-equations` (upstream).
  * Square roots → `MATH.number.square-roots`. **Finding:** the graph does not list it upstream of quadratics. The
    tests record this, and the graph has not been changed without review.
* **Not changed:** estimator thresholds, verification requirements and retention clocks. The 7-day revision is as
  before.

## The decision logic

A **rule** is something a learner can be missing. There are three kinds:

| Kind | Rules | Competency |
| --- | --- | --- |
| Prerequisite | Squaring a bracket; Square roots, both of them; Keeping an equation balanced | from the graph (above) |
| Procedure | Finding the number that completes the square; Writing (x + p)² + q; Solving by completing the square; Dividing through when a ≠ 1 | `MATH.algebra.quadratics` |
| Transfer | Reading a smallest or largest value from (x + p)² + q; Checking a solution against the question; Spotting when completing the square applies; Turning words into an equation | `MATH.algebra.quadratics` |

**Observations.** An observation is an *unaided first answer* to one of the main questions the rule lists. Answers
after a hint or a worked solution are not clean observations. A prerequisite is also observed through the
prerequisite questions inside procedure help.

**Decisions**, in order, for each rule:

1. **No wrong observation, or one.** No help branch: one wrong answer may be a slip. The learner gets the unit's
   misconception-specific feedback and, where it exists, one similar question. A procedure also offers a **similar
   worked example** (level 1 of the directive).
2. **Two or more wrong observations since help last worked.** The rule becomes `weak`, and the planner says *teach*
   its first strategy. The learner is offered help, with the reason (below). The block has three parts:
   * **teach:** the strategy's own explanation, with an interactive model where one fits;
   * **guided:** one question with a hint available, recorded as help;
   * **check:** one fresh question with no hints; this decides whether the block worked.
3. **The check is wrong.** The planner moves to the next strategy and never repeats one. Each rule has two
   strategies, each a different representation:
   * squaring a bracket: an area model, then a multiplication grid with a number check;
   * finding the number to add: matching (x + a)², then the prerequisite underneath.

   For a procedure, the second strategy goes back to its prerequisite: the teaching includes the prerequisite's own
   explanation, and the guided question is a prerequisite question (level 3).
4. **Both strategies used.** The planner recommends a person. The learner sees a calm pause, once: carry on, ask a
   teacher or parent, it comes back in the revision. Nothing is held back, and there is no loop.
5. **The check is right.** The help ends as *improved after help*, which is progress, not mastery. The learner goes
   back to the lesson.

**A strategy is taught once.** If the planner returns to a strategy whose questions are used (the gap came back after
help worked), the next unused strategy is taught. If none is left, it is a pause.

**Transfer: diagnose before teaching.** After a wrong answer on an unfamiliar problem (step 8), what is taught depends
on what the evidence shows:

1. **The answer itself is unambiguous.** Some misconceptions carry a signal: the minimum position given instead of the
   value, a width of −10 m, the smaller root given when the larger was asked. The demand is then taught directly
   (interpretation, recognition).
2. **Otherwise, nothing is inferred from the answer.** The learner is asked one quick question on a part, or two for
   the word problem (first the equation, then the solving):
   * the procedure part is wrong → **procedure** teaching (the planner, for that procedure rule);
   * the equation-from-words part is wrong → **translation** teaching;
   * every part is right → the gap is in the **demand** itself. For a minimum or maximum, that means connecting the
     completed form to the value, using the minimum explorer. For a disguised equation, it means spotting the
     structure. It is not more teaching of the formula.

**The branch is temporary.**

* The nine steps, their completion, the current step and the lesson's resume point are never changed by help.
* Help is computed from the records, so after closing the browser or logging out it resumes where it stopped, with
  "Welcome back".
* While help is on screen, the lesson behind it stays mounted, so the learner returns to the exact screen.
* Completed activities are never erased: a failed revision leaves all nine steps done.

**What the learner is told.** These are the unit's words; the planner's own reasons are kept in the records for
audit.

* **Why the help appears**, for example: "Completing the square is the pattern (x + a)² = x² + 2ax + a², used
  backwards. Two of your answers suggest that pattern is not secure yet, so here is a short lesson on it first."
* **Where they go back to:** "Then back to Step 1, before we start, exactly where you are now."
* **Which of the three parts they are in:** Learn it, Practise it with help, Now on your own.
* **That they can say "Not now".** Setting help aside is recorded and shown in "Where you stand" as *progress without
  that help*, never as understanding. Help set aside comes back only if a new mistake on that skill is made.

**Where the learner stands** (summary screen): steps done (activity); shown on your own (unaided, later steps);
verified mastery (never, for provisional content). For each skill that needed help, it shows one of:

* one slip so far;
* extra help waiting;
* right on your own after extra help (progress, not mastery);
* extra help set aside;
* paused, worth going through with a teacher or parent.

## New teaching activities

### Prerequisite help

| Rule | Strategy 1 | Strategy 2 |
| --- | --- | --- |
| Squaring a bracket | **See (x + a)² as an area**: tile model of (x + 4)², and why x² + 16 forgets the rectangles | **Multiply every term, then check with a number**: a grid for (x + 5)², and the x = 1 check |
| Square roots, both of them | **Two numbers square to the same thing**: the box idea, (x + 1)² = 16 | **Undo one layer at a time, then check**: reverse order, then check both roots |
| Keeping an equation balanced | **An equation is a balance**: the balance model, dividing every term | **Test each step with a known solution**: put the known root into each new line |

### Procedure help

Each rule also has a similar worked example, shown at the first difficulty.

| Rule | Strategy 1 | Strategy 2: the prerequisite |
| --- | --- | --- |
| Finding the number to add | Match it to (x + a)² = x² + 2ax + a² | Back to the pattern underneath (squaring a bracket) |
| Writing (x + p)² + q | Expand your answer back to check it | Where q comes from (squaring a bracket) |
| Solving by completing the square | The same four moves every time | Move 4: both square roots |
| Dividing through when a ≠ 1 | Why the x² coefficient must be 1 | Divide every term, on both sides (the balance) |

### Transfer help

| Rule | Strategy 1 | Strategy 2 |
| --- | --- | --- |
| Smallest or largest value | **Minimum explorer**: move x and watch (x − 3)² + 4; value q, at x = −p | A table of values |
| Checking a solution against the question | Ask what each answer means (−10 m, the length or the width) | Write what each solution means |
| Spotting when it applies | Three common disguises (repeated block, terms on both sides, exactly one root) | Make one tidying move, then look again |
| Turning words into an equation | Draw it and label it | Translate phrase by phrase |

### Questions

* **New:** 51 questions.
  * Prerequisite help: 12.
  * Procedure help: 16.
  * Transfer help: 16.
  * Quick diagnostic questions: 7.
* **Bounded:** each rule has at most two blocks of two questions. Nothing is generated.
* **Checked:** every answer is recomputed independently in `unit.test.ts`.

## Remaining limitations

* **No review or real learners yet.** Not reviewed by an educator and not tried by real learners; the wording, the
  strategies and their order are the author's judgement.
* **Coarse rule and observation lists.** They are hand-written: one wrong answer on a question listed for two rules
  counts for both. The signal tags cover only the transfer answers whose meaning is unambiguous.
* **Two strategies per rule.** A learner who needs a third approach gets a pause and a recommendation to ask a person,
  not more teaching.
* **No "contrast" questions.** The planner's reassessment is one fresh question, so a block is judged on a single
  answer. That is weak evidence, which is why "improved after help" is never shown as mastery.
* **The planner's own reason text is written for English spelling rules** ("new words"). The unit shows its own
  wording instead; the planner's text is kept only in the audit trace.
* **The competency graph does not list square roots before quadratics.** Worth a curriculum review.
* **After a wrong transfer answer, the similar extra question and the diagnosis both appear.** The quick question
  comes first and the similar question stays on the page. An educator may prefer only one.
* **Tested with a local stand-in server.** Browser runs used a stand-in for the account API; the Django rules are
  covered by the backend tests in CI.
