# 3. Reference problem: "3x = 19 - 4"

The question is `le-ref-3x-19-4`: prompt "Solve 3x = 19 − 4. What is x?", answer 5, `statement: "3x = 19 - 4"`, competency `MATH.algebra.linear-equations`. It is an authored question, provisional, and in no module list, so adaptive sequences are unchanged. Every result below is the real trusted grader's reply (`gradeRequest`, the same code as `backend/family/grader/grader.mjs`). The complete records (request, full reply with the decision, and what the screen shows) are in [`reference-cases.json`](reference-cases.json); `frontend/scripts/d1-reference.mts` regenerates them.

The typed text is split by `readSubmission`, which is syntax only:
- the last line is the answer if it isolates the unknown (`x = …`) or is a bare value;
- when there are several lines, all of them are the working;
- a single line that is not an answer is working with no final answer.

## Results

| Case | Typed | Required | Request | Answer verdict | Working status | Method evidence | Completeness | First invalid step | Substitution | Met |
|---|---|---|---|---|---|---|---|---|---|---|
| A | `x = 4` | Incorrect final answer; no verified misconception | response `x = 4`, working [] | incorrect (incorrect.value) | none | no-method-evidence | no-working | — | x = 4: 12 vs 15 | yes |
| B | `x = 5` | Correct final answer; no method evidence from a bare answer | response `x = 5`, working [] | correct (correct.equal) | none | no-method-evidence | no-working | — | — | yes |
| C | `3x = 15; x = 5` | Correct answer and verified working, if supported by the certificate checker | response `x = 5`, working ["3x = 15", "x = 5"] | correct (correct.equal) | verified | method-verified | complete | — | — | yes |
| D | `3x = 15; x = 4` | Incorrect final answer; first invalid transformation identified | response `x = 4`, working ["3x = 15", "x = 4"] | incorrect (incorrect.value) | invalid | method-false-step | complete | line 2 `x = 4` (from `3x = 15`; x = 5 solves the line before, not this one; it gains 4) | x = 4: 12 vs 15 | yes |
| E | `3x = 16; x = 16/3` | Incorrect transformation from the original equation; identify the first invalid step | response `x = 16/3`, working ["3x = 16", "x = 16/3"] | incorrect (incorrect.value) | invalid | method-false-step | complete | line 1 `3x = 16` (from `3x = 19 - 4`; x = 5 solves the line before, not this one; it gains 16/3) | x = 16/3: 16 vs 15 | yes |
| F | `3x = 15` | Valid partial working; incomplete final solution | response ``, working ["3x = 15"] | unresolved (unresolved.invalid-response) | partial | no-method-evidence | incomplete | — | — | yes |
| G1 | `3x=15 => x=5` | Unsupported or ambiguous notation: no fabricated verdict or method evidence | response ``, working ["3x=15 => x=5"] | unresolved (unresolved.invalid-response) | unsupported | no-method-evidence | incomplete | — | — | yes |
| G2 | `x = 15/3x` | Unsupported or ambiguous notation: no fabricated verdict or method evidence | response ``, working ["x = 15/3x"] | unresolved (unresolved.invalid-response) | unsupported | no-method-evidence | incomplete | — | — | yes |
| G3 | `divide by 3 so x is 5` | Unsupported or ambiguous notation: no fabricated verdict or method evidence | response ``, working ["divide by 3 so x is 5"] | unresolved (unresolved.invalid-response) | unsupported | no-method-evidence | incomplete | — | — | yes |
| G4 | `3x = 15 => x = 5; x = 5` | Unsupported working beside a correct final answer | response `x = 5`, working ["3x = 15 => x = 5", "x = 5"] | correct (correct.equal) | unsupported | no-method-evidence | complete | — | — | yes |
| X | `3x = 16; x = 5` | (extra) correct answer reached through invalid working | response `x = 5`, working ["3x = 16", "x = 5"] | correct (correct.equal) | invalid | method-false-step | complete | line 1 `3x = 16` (from `3x = 19 - 4`; x = 5 solves the line before, not this one; it gains 16/3) | — | yes |

## What the learner sees (from the same records)

| Case | Level | Message | Lines shown |
|---|---|---|---|
| A | incorrect | Put x = 4 into 3x = 19 − 4: the left side is 12 and the right side is 15, so they are not equal and x = 4 is not the solution. | — |
| B | correct | That answer is right. You gave the answer only, so your method was not checked. | — |
| C | correct | That answer is right. Every line of your working was checked: each one follows from the line before. | `3x = 15` checked; `x = 5` checked |
| D | incorrect | Put x = 4 into 3x = 19 − 4: the left side is 12 and the right side is 15, so they are not equal and x = 4 is not the solution. The first step that does not follow is x = 4: x = 5 makes 3x = 15 true but not x = 4, so this step changed the solution. | `3x = 15` checked; `x = 4` invalid |
| E | incorrect | Put x = 16/3 into 3x = 19 − 4: the left side is 16 and the right side is 15, so they are not equal and x = 16/3 is not the solution. The first step that does not follow is 3x = 16: x = 5 makes 3x = 19 − 4 true but not 3x = 16, so this step changed the solution. | `3x = 16` invalid; `x = 16/3` not checked |
| F | partial | No final answer was marked. Your working is right so far: each line follows from the line before. It is not finished: it does not end with the answer yet. Next step: get the unknown on its own. | `3x = 15` checked |
| G1 | partial | No final answer was marked. Your working could not be checked automatically, so it is not marked right or wrong. Writing each step as an equation on its own line, ending with the answer, lets it be checked. | `Not checked: 3x=15 => x=5` not checked |
| G2 | partial | No final answer was marked. Your working could not be checked automatically, so it is not marked right or wrong. Writing each step as an equation on its own line, ending with the answer, lets it be checked. | `x = 15/3x` not checked |
| G3 | partial | No final answer was marked. Your working could not be checked automatically, so it is not marked right or wrong. Writing each step as an equation on its own line, ending with the answer, lets it be checked. | `Not checked: divide by 3 so x is 5` not checked |
| G4 | correct | That answer is right. Your working could not be checked automatically, so it is not marked right or wrong. Writing each step as an equation on its own line, ending with the answer, lets it be checked. | `Not checked: 3x = 15 => x = 5` not checked; `x = 5` not checked |
| X | correct | That answer is right. But a step in your working is not right. The first step that does not follow is 3x = 16: x = 5 makes 3x = 19 − 4 true but not 3x = 16, so this step changed the solution. | `3x = 16` invalid; `x = 5` not checked |

## Notes on parser support (actual behaviour, recorded before any fix)

1. **The prompt is not a task the authority reads.**
   - `authorizeWorking("Solve 3x = 19 − 4. What is x?", …)` is `unsupported` (`task-unparsed`) for every case.
   - `"Solve 3x = 19 − 4"` and `"3x = 19 - 4"` both read correctly.
   - The smallest safe fix is to give the question its task as data (`Question.statement`), as the generated families already do through their contract. P2's task normaliser was not changed.
2. **The answer reader did not read `x = 5` for an authored question** (it returned `unresolved.invalid-response`), because legacy contracts carried no variable. Fix: the variable comes from the stated task (doc 2). Only questions with a `statement` are affected.
3. **Every case of the seven is decided as the mathematics requires, with no change to P2's rules.**
   - **A:** `x = 4` written alone as working is still not reported as an invalid step (`answer-only`), so no reasoning is invented.
   - **E:** the first line `3x = 16` is refuted with a counterexample (x = 5 solves the task, not the line). Line 2 is not judged (`unsupported`, after an uncertified line).
   - **G:** the notation `=>`, the ambiguous `15/3x` and a sentence are all `line-unparsed`. None is reported as invalid. The answer verdict stays `correct` (G4) or `unresolved` (no answer). Nothing is fabricated.
4. **Extra case X (correct answer through invalid working):** the answer is right (credit true), and the working is `invalid` at line 1. Both verdicts are kept apart. Doc 5 covers the learner-state consequence.
