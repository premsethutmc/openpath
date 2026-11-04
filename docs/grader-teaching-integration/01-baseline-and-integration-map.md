# 1. Baseline and branch integration map

## Branches

| | Commit | Role |
|---|---|---|
| A3 teaching | `4f97427` (`feat/linear-equations-teaching`) | the base of this branch; the learner journey and teaching |
| P2 parser integration | `aac35c6` (`feat/p2-parser-integration`) | derivation authority @3, working-evidence@1, solution-sets@1, B2 routing |
| Merge base of the two | `c58c443` | |
| This work | `feat/grader-teaching-integration` (worktree `/home/claude/d1`) | merge commit `ab788f2`, then the D1 changes |

## What was taken from P2, and why the whole branch

The P2 branch was inspected file by file before merging.

- **Shared files:** none. No file is modified by both A3 (`c58c443..4f97427`) and P2 (`c58c443..aac35c6`). The merge is conflict-free.
- **P2 code:** 14 files in `packages/learning/src`:
  - 8 source files: `derivation-authority.ts`, `solution-sets.ts`, `unified-math-engine.ts`, `evidence-provenance.ts`, `acceptance-gate.ts`, `canonical-math-ir.ts`, `natural-disjunction.ts`;
  - 6 test files.
- **P2 data:** the frozen corpora (HELDOUT4/5/6), their results and scripts in `tools/mathematics/grader-*`, and the docs `docs/grader-generalization`, `docs/grader-parser-integration`.
- **Why not a subset:** the P2 tests read those corpora. A subset would leave P2's own tests and replay-integrity checks unable to run, and the regression could not show that P2 is unchanged here.
- **What was not taken blindly:** P2's B2 commit changed what authority @3 decides without changing its label. D1 therefore relabels the authority as @4 (doc 8). No P2 rule was changed.

## Components

| Component | File | Role in D1 |
|---|---|---|
| Trusted grader entry | `packages/learning/src/server-grader.ts` `gradeRequest` (bundled to `backend/family/grader/grader.mjs`; run by Django `kernel_grader.py`) | Unchanged interface. Its decision now carries `working`. |
| THE grading decision | `packages/learning/src/grading/decision.ts` `grade` | The answer decision is unchanged (renamed `gradeAnswer`). `grade` then attaches the working assessment. |
| Working assessment (new, thin) | `packages/learning/src/grading/working.ts` | Reads the task statement from the question. Calls `authorizeWorking` (with replay) and `assessChain` evidence. Arranges the result as working-assessment@1. Contains no mathematics of its own. |
| Derivation interface | `packages/learning/src/derivation-interface.ts` `authorizeWorking`, `workingEvidence` | Unchanged. Now called inside the trusted grader instead of in the client journey. |
| Derivation authority | `packages/learning/src/derivation-authority.ts` | Rules unchanged. `AUTHORITY_VERSION` @3 becomes @4 (doc 8). |
| `assessMathematicalWorking` | `packages/learning/src/unified-math-engine.ts` | Unchanged. It is not on the learner-journey path: it serves the engine's statement-text route (B2). |
| Journey session | `frontend/src/journey/session.ts` | The client-side `authorizeWorking` call is removed. The session reads `reply.decision.working` and logs it. |
| Flow, adapter, renderer | `frontend/src/journey/flow.ts`, `renderer-adapter.ts`, `math/components/*` | Splits the typed submission, shows the decision's verdict, working message and marked lines. Uses existing components. |
| Persistence | `backend/family/learning.py` `_decide`, `decisions.py` `build`, `record` | Unchanged. The server's decision (now including `working`) goes into the immutable event body and the decision log. A client record carrying its own decision is refused (400). |
| Adaptive consumers | `intervention.ts` (`moduleState`, `recovery`), `evidence.ts`, `hypotheses.ts` | Unchanged. They read the answer credit and the answers; they never read `working` (doc 5). |

## Call path before D1 (A3 `4f97427`)

```
LearningScreen (NumericInput, digits only)
  -> flow.answer(value)
    -> session.submit(qid, value, activity, {working?})
      -> gradeRequest({id, response, working})          trusted grader: answer verdict; method examined only for an incorrect answer (natural-working)
      -> authorizeWorking(familyStatement ?? prompt, working)   CLIENT side, trace only: not in the decision, not stored, not shown
      -> learnerState / evidence / hypotheses / moduleState
    -> feedbackFromDecision(decision)                    "That answer is right." / "That is not the answer we are looking for."
```

Working typed by a learner could not reach the grader from the screen: the input stripped everything but digits. A question whose prompt is a sentence was authorised against the prompt, which the authority cannot read, so the result was always "unsupported".

## Integrated call path (D1)

```
LearningScreen (NumericInput, acceptsWorking for questions with a task statement)
  -> flow.answer(text)
    -> readSubmission(text, stated)                      syntax only: "3x = 15; x = 5" -> response "x = 5", working ["3x = 15","x = 5"]
    -> session.submit(qid, response, activity, {working})
      -> gradeRequest({id, response, working})           trusted grader (Django runs the same bundle)
           grade = gradeAnswer(...)                      unchanged answer decision (verdict, reason, credit, form, method, diagnosis)
                 + assessWorking(qid, working, verdict, value)
                     taskStatement(qid)                  family contract statement, or Question.statement; never from the request
                     authorizeWorking(statement, lines)  certificate chain, replayed from the task
                     assessChain(statement, lines)       transitions, first invalid line + counterexample, completeness
                 -> decision.working (working-assessment@1)
      -> trace "derivation-interface.authorizeWorking" (read from the decision)
      -> learnerState / evidence / hypotheses / moduleState    unchanged (answer credit)
    -> feedbackFromDecision(decision) + workingFeedback(decision)   verdict + what the working shows, lines marked as judged
```

## Preserved properties

- **Mathematical authority.** Every judgement comes from the P2 authority through `authorizeWorking`/`assessChain`. The answer verdict is unchanged for every existing question: 109,096 graded decisions are identical, apart from the new `working` field (doc 9).
- **Fail-closed.** Anything the authority does not authorise and replay is "unsupported" or "invalid", never "verified".
  - "Invalid" requires a certain counterexample from the authority.
  - "Unsupported" concludes nothing about the method.
  - A question without a statement gets no working judgement.
- **No client authority.**
  - The statement is read from the question.
  - Extra request fields are ignored.
  - Django refuses a client record that carries a decision. A test posts a forged working verdict: it is refused, and the stored record holds the bundle's own verdict.
- **No engine redesign was needed.** No conflict required one.
