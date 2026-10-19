# Completing the square: the reference teaching unit

**Status: provisional.** All teaching and questions are original, written for this unit, and not reviewed by an
educator. They are not previous-year questions. Nothing in this unit can verify mastery.

This is the quality standard for OpenPath mathematics teaching. Do not expand the other Quadratic Equations lessons
until this unit has been reviewed.

## Where things live

| What | File |
| --- | --- |
| Content (read by the app and the server) | `content/mathematics/programs/completing-the-square.v1.json` |
| Authoring source (regenerates the JSON and checks its references) | `content/mathematics/programs/src/completing-the-square.py` |
| Engine (replay, evidence, advice, standing) | `packages/mathematics/src/unit.ts` |
| Screens | `frontend/src/mathematics/unit/Unit.tsx` |
| Tests | `frontend/src/mathematics/unit/unit.test.ts`; `backend/family/test_mathematics.py` (`CompletingSquareUnitTests`); `frontend/e2e/mathematics-journey.test.mjs` |

The learner finds it at `/maths/` → JEE Main → Unit 2 → **Completing the square**.

## Instructional stages

Teaching comes first, then assessment. Hints are offered only in the teaching, worked-example and guided steps.

| # | Step | Phase | What the learner does |
| --- | --- | --- | --- |
| 1 | Before we start | Teaching | Covers the prerequisites: expanding (x + a)² by multiplying it out, the identity (x ± a)² = x² ± 2ax + a², solving x² = k (both roots, irrational roots, no real roots), and keeping an equation balanced. The learner predicts the pattern before it is shown. A diagnostic check ends each part; a wrong check opens a re-explanation and one similar question. |
| 2 | See it | Teaching | Uses algebra tiles: an x² square and b strips. The learner moves strips and sees the missing corner, predicts the corner's size, and builds the square. They try b = 2 to 10, then work out why the corner is (b/2)², first from the picture and then from 2a = b. Odd and negative b come next, then rewriting an expression as (x + p)² + q. |
| 3 | Worked examples | Worked | Six examples. The basic ones are monic (x² + 6x + 5, and x² − 8x + 3 with irrational roots). The intermediate ones have an odd b, a ≠ 1, a negative a, and fractional coefficients. The learner predicts each key step before it is shown, and every step has a "Why". |
| 4 | Why the quadratic formula is true | Worked | Derives the formula step by step from ax² + bx + c = 0, with three predictions and a reason for each step. The derivation shows why b² − 4ac decides the nature of the roots. Ends with the learner using the formula. |
| 5 | Guided practice | Guided | Eight questions, with hints and worked solutions available. |
| 6 | On your own | Independent | Six questions, no hints. A worked solution can still be shown, but the answer then counts as helped. |
| 7 | Choose a method, find the mistake | Application | A short introduction compares factorisation, completing the square and the formula. A balance model shows what adding to one side only does. Then two method-choice questions, one solved by any method, and three error-analysis questions: adding to one side only, dividing incorrectly, and a sign error in the bracket. |
| 8 | New problems | Transfer | Six problems shaped differently from the examples: a minimum value, the position of a maximum, a substitution, a repeated root, rearranging an equation with x² on one side, and a word problem. |
| 9 | Revision check | Retention | Three questions, opening 7 days after step 8. The server sets the due date. |

All 10 stages of the directive are covered in that order. Prerequisites are step 1. The visual explanation, discovery
and generalisation are step 2. Basic and intermediate solving are step 3. The derivation is step 4. Application and
error analysis are step 7. Transfer is step 8.

## Questions

* **49 main questions** and **15 extra-practice questions** (shown only after a wrong answer).
* **By type:**
  * 30 "values" questions: two roots in either order, or the fields p and q, or a, p and q;
  * 17 single-choice questions (A to D);
  * 13 whole-number questions;
  * 4 fraction questions.
* **Feedback:** 154 written misconception responses, each tied to one specific wrong answer (for example "You added 16
  instead of subtracting it"). Every question in steps 5 to 8 has at least one. A wrong answer with no written match
  gets the solution and a prompt to compare it line by line, never a bare "Incorrect".
* **Checks:** every answer key is recomputed independently in `unit.test.ts` with exact rational arithmetic, or for
  choice questions by testing each option with numbers. Every misconception is checked to be a well-formed wrong answer.
* **After a wrong answer** the learner gets the misconception explanation, a "See the explanation again" link to the
  teaching it depends on (a section, a worked example or the step introduction), and **one** similar extra question.
  A step with two or more wrong answers also recommends the extra questions at its end. All of this is already in the
  program; nothing is generated or rearranged after an answer.

| Step | Main | Types |
| --- | --- | --- |
| Before we start | 4 | integer 1, choice 2, values 1 |
| See it | 6 | integer 2, choice 1, fraction 1, values 2 |
| Worked examples | 6 | choice 4, fraction 2 |
| Formula | 4 | choice 3, values 1 |
| Guided | 8 | values 7, integer 1 |
| On your own | 6 | values 6 |
| Apply | 6 | choice 5, values 1 |
| New problems | 6 | integer 5, values 1 |
| Revision | 3 | values 2, choice 1 |

## Completion, demonstrated performance and verified mastery are kept apart

The learner's summary screen shows each of these separately:

* **Steps done:** activity completed.
* **Shown on your own:** correct first answers given without a hint or a worked solution, in steps 6 to 9. Answers in
  the teaching and guided steps never count here.
* **Verified mastery:** comes only from the shared engine's single definition (verification@2, H-V1 to H-V4). The
  content is provisional, so it is never eligible, and the screen says so.

The unit uses the shared ledger's own semantics; there is no separate mastery engine:

* **Predictions and checks inside the teaching** are recorded as `assisted_response` events, so they never change an
  estimate.
* **Hints and worked solutions** become `hint` events (a worked solution has `revealsAnswer`).
* **Answers in the practice steps** become `evidence`, with `provenance@1` listing any hints and the `assisted@1`
  policy:
  * guided practice uses `practice`;
  * independent, application and transfer use `assessment`;
  * the revision check uses `retention`.
* **The content gate:** because the content is provisional, the gate holds every answer.

## Saved progress and resuming

* **One program, one record:** the unit is one fixed program, stored in the existing mathematics record of the same
  OpenPath account and learner, with `program: "completing-the-square"`.
* **Resuming:** a learner who leaves continues at the same step, and inside it at the same part, example or question
  (`resumePoint`).
* **First answers count:** the first answer to a question is the one that counts; later attempts are ignored.
* **What the server checks:**
  * steps are done in order;
  * the format of each answer;
  * that extra questions belong to the step they are answered in;
  * that every main question is answered before its step can finish;
  * the 7-day revision rule.
* **Separate from other programs:** the chapter and the fractions program ignore the unit's records, and the unit
  ignores theirs.

## Teaching-quality benchmark: five synthetic learner journeys

These tests (`unit.test.ts`) check what the program **offers**. They do not show that anyone learns, and no learning
gain is claimed from them.

| Journey | What the program does (all checked by the tests) |
| --- | --- |
| Beginner with weak algebra (all four prerequisite answers wrong) | The step still finishes; help is offered and nothing is blocked. Each wrong check gets a misconception-specific explanation, a section to revisit with a written re-explanation, and a similar question. The step is flagged as hard, and none of these answers count as demonstrated. |
| Knows the identities but cannot complete the square (5 of 6 picture-stage answers wrong) | The (b/2)² misconception is named, and every wrong answer points back to teaching. The similar questions are offered once and recorded; the program does not regenerate itself. |
| Follows the examples but fails unfamiliar problems (all transfer answers wrong) | Every step is finished and independent practice is 6/6, but transfer shows 0/6 (completion and performance stay separate). Most transfer questions point back to the teaching they rely on, with extra practice where it exists. Not verified. |
| Strong student (all right) | Moves straight through with no extra help pushed. 21/21 shown on their own, 100% of steps done, still not verified; the content gate holds every answer. |
| Returning student (leaves in guided practice, back after 4 days) | Resumes at guided practice, question 3. The earlier hint is remembered (that answer counts as assisted), and earlier answers are kept. Two visits; the revision is answered only after its due date. |

The tests also cover versioning: a record from an unknown version is not counted but is never deleted, and a version
declared compatible replays.

**Gaps seen while building the benchmark** (honest findings, not fixed in v1):

* The beginner journey shows that a learner can fail every prerequisite check and still move on to step 2. The program
  recommends the re-explanations but does not require them. That matches "do not block", but an educator may prefer a
  stronger nudge.
* The extra questions cover the main skills only once. A learner who misses a second time has nothing new to try
  except revisiting the teaching.

## Phone inspection

The whole unit was walked through in a 390 × 844 phone viewport against a local stand-in for the account API, with
some answers deliberately wrong, one hint, one worked solution and one revisit. There were no page errors. Checked
screens:

* the tile model (split, missing corner, completed square);
* prediction then reveal;
* a wrong check with its re-explanation and similar question;
* misconception feedback;
* the revisit screen;
* the balance model;
* end-of-step scores;
* the locked revision with the summary panel.

## Known content limitations

* Not reviewed by an educator. Wording, pace and difficulty are untested with real learners.
* The tile model draws only even b from 2 to 10, positive b only. Odd and negative b are taught algebraically, not
  with tiles.
* Answers are typed as numbers and fractions. Surd answers are entered as p and q in "p ± √q". Free-form explanations
  ("explain why") are not collected; one revision question asks for the reason as a choice.
* There is no audio and no step-by-step algebra input; the learner cannot write their own working.
* Difficulty runs from school level (steps 1 to 6) to JEE Main level (steps 7 and 8). There is no JEE Advanced
  material.
* The answer key is checked by computation, but the misconception wording is the author's judgement.

## Before educator review

1. An educator reads the teaching text and questions, and checks:
   * the mathematical wording;
   * the order of steps;
   * the misconception feedback;
   * the level for the intended learners.
2. Decide whether failing the prerequisite checks should hold a learner back, or only recommend the re-explanation.
3. Add a second similar question for each skill (the second-miss gap above).
4. A short session with a small number of real learners, with consent (no child data in this preview), to see where
   they get stuck.
5. Only then mark content as reviewed. Reviewed, released items are the only ones the shared engine can count towards
   verified mastery.
