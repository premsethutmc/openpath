# 10. Remaining gaps and readiness decision

## Decision: **PASS — INTEGRATION IMPLEMENTED**

The decision rests on the final complete regression on `5395d2e` ([09](09-REGRESSION-RESULTS.md)):

- 0 introduced failures;
- 0 false mathematical accepts on 2,498 corpus items and on all reference and property cases;
- 109,096 / 109,096 existing grading decisions unchanged;
- all 15 integrated journeys pass ([06](06-LEARNER-JOURNEY-TRACES.md)), with desktop and mobile screenshots;
- 563 / 563 historical @3 certificates classified historical.

Commits after `5395d2e` change documentation only.

| Criterion | Met | Where |
|---|---|---|
| The A3 learner journey consumes the improved grading capability | yes. The trusted grader judges working inside its decision, the journey reads it, and Django stores it. There is no client-side authorisation. | doc 1 |
| Answer correctness and method verification stay separate | yes. Tested: four responses × four kinds of working leave the verdict, reason and credit identical to the bare answer. 109,096 existing decisions are unchanged. | docs 2, 9 |
| Seven reference cases have trustworthy, documented results | yes. All are met, with exact request and reply records. | doc 3 |
| Invalid working is identified where mathematically supported | yes. It is reported only on a certain counterexample. The valid prefix is authorised and replayed separately. | docs 2, 3 |
| Unsupported working fails closed | yes. It is never "invalid", never "verified", and gets no fabricated answer. | docs 2, 3, 4 |
| Invalid working never becomes verified method evidence, even when the answer is correct | yes. 6 hand cases on the reference problem and 160 generated `ax + b = c` cases with a false line followed by the right answer: all `invalid` / `method-false-step`, none `method-verified`. | `grading/working.test.ts`, journey D1-04 |
| Adaptive teaching uses legitimate evidence | yes. Teaching follows the unchanged policy on the trusted verdicts. A misconception is established only by investigation, and working never names one. | docs 5, 6 |
| Independent rechecks, retention and recovery work | yes (D1-01, 08, 11, 12, 13, 15) | doc 6 |
| Content-safety rules remain enforced | yes. Nothing is approved, the registry is unchanged, and the supervised-mode refusal holds. | doc 7 |
| Certificate replay is sound and compatible | yes. The authority is relabelled @4. All 563 historical @3 chains are classified `historical-version-not-replayable`, and none replays as current. Integrity checks: 0 accepted attacks. | doc 8 |
| Final regression passes without introduced failures | yes | doc 9 |

No BLOCK condition remains:

- no false mathematical accept: 0 on all corpora and all reference and property cases;
- no fabricated misconception;
- no incorrect mastery update introduced by D1;
- no certificate replay regression;
- no content-safety bypass.

## Remaining gaps (not blockers for this integration; each needs its own approved work)

1. **Sub-skill learner state (pre-existing, from A3).**
   - Linear-equations status is competency-level.
   - A learner can reach "independent" on `ax + b = c` questions alone, and a passed delayed check would then mark the whole competency verified, without both-sides or bracket evidence.
   - Family identity is kept in every record and trace.
   - D1 adds no such claim, and the estimator was not redesigned (boundary).
   - The minimum change is in doc 5.
2. **Method evidence is not an adaptive input.**
   - A correct answer reached through invalid working counts as a correct answer for status. The learner is told which step is wrong, and the decision records `method-false-step`.
   - Making method evidence count needs a learner-state policy decision (doc 5, proposal 3).
3. **A single wrong answer with an identified invalid step is treated as a slip.** No teaching follows it, by the A3 isolated-slip policy. The step is explained in the feedback only.
4. **Working entry on mobile uses the device keyboard.** The on-screen number pad has no letters or `=`.
5. **Working is judged only for questions with a task statement.**
   - These are the equation families with a contract statement, and the reference question.
   - Word problems (`auleq`, `aulwp`) and choice questions get no working judgement.
   - Working submitted to a question without a statement is reported `unsupported`.
6. **The prompt is not readable by the authority.** "Solve 3x = 19 − 4. What is x?" is `task-unparsed`. Questions therefore need a statement as data. The task normaliser was not changed.
7. **The reference question is in no module list.** It is reachable as a start question (`?start=`) and in tests. Adding it to a module is a curriculum decision.
8. **Explanations remain unapproved.** In supervised mode, a learner with an established misconception is escalated to a teacher. Educator review is still required before any supervised use.

## Not done (boundaries)

- No new grader.
- No teaching engine change.
- No estimator redesign.
- No shadow-model activation.
- No approvals.
- No deployment.
- No merge.
