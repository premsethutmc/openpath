# Answer-first assessment and error localization — report

Branch `feat/math-generalization-core-e7`, baseline `842934d`. Nothing merged/deployed; no holdout run. Harness: `tools/mathematics/generalization-e7/repair/answer-first-eval.ts` (output in `out-stage5/`).

## 1. Architecture-reuse assessment (Gate 1)
| Question | Finding |
|---|---|
| Final answer identified? | Not as such: the checker (`independent-checker.ts::solutionMode`) certified the whole chain and took the last accepted statement. Now `answerFirstSolutionSet` picks the last statement about the variable (or a concluding "no solution"/"all reals") directly. |
| Checkable independently of the working? | Yes: the exact `profile`/`relate` solution-set machinery compares the final statement with the problem's set (domain gaps, critical points, premises) with no intermediate line involved. |
| Adjacent lines comparable? | Yes, already: `relate(prev, next)` → equal / subset (one-way) / superset (narrowing) / incomparable; reused unchanged. |
| Equivalence vs one-way implication vs invalid? | Already distinguished (widening, narrowing, incomparable); now surfaced as `equivalent` / `implied` / `narrowing` / `invalid`. |
| Arithmetic subexpressions evaluable? | Yes (`evalAt`, exact rationals + one radical); reused for the diagnosis. |
| Earliest invalid transition? | Existed, but the chain stopped there (later lines `inconclusive`) and always compared to the last *valid* line. Now every line is judged against the line the student actually wrote before it. |
| Bypasses | The full `assessMathematicalWorking` pipeline is untouched (still the certification path). Answer-first is a separate entry point, so it cannot weaken E7 protections; it never reports derivation validity (`derivationCertified: false`). |

New code is a refactor (`builtLines` extracted) plus ~200 lines in `independent-checker.ts` and the thin `answer-first.ts`; no new solver or parser.

## 2. Entry point
`assessAnswerFirst(problem, working, { diagnose?: boolean | "always" })` in `answer-first.ts` → `{ answer: {status, credit, finalSet, expectedSet, extraneous, missing, restrictions}, derivationCertified: false, diagnosis, cost, unreadableLines }`. Correct → credit, **no work analysis**. Incorrect → transitions analysed. Unestablishable → `unresolved`/`unsupported`, `credit: null`.

## 3. Localization and structured diagnosis
`diagnosis.firstError {transition, from, to, kind, location, evidence[], explanation, confidence}`, `laterErrors[]`, `locallyValidAfterFirstError[]`, per-transition `status` + `keepsOriginalSolutions`. Kinds: `unbalanced-operation` (same constant/factor must act on both sides; exact corrected value given), `arithmetic-evaluation` (smallest differing closed subexpression evaluated exactly), `unchecked-candidates` (valid one-way step, extraneous candidate stated; located at the final answer), `solution-set-change` (set-level only, nothing invented). Substitution of an original solution is reported as evidence, never as proof.

## 4. Probes (actual pathway, `assessAnswerFirst`)
A correct, credited, no diagnosis · B first error at transition 1: "left subtracts 4, right subtracts 5; right should be 19 − 4 = 15" · C same first error; lines 2–3 locally valid · D first error as B; second, separate error "19 − 5 evaluates to 14, not 12"; final division valid · E correct, no reasoning claim · F `{−1, 3}` incorrect, `−1` extraneous, squaring step `implied` (not an error), located at the final answer; adding the check and `x = 3` earns credit.

## 5. Generalization and performance
Tests: `answer-first-e7.test.ts` (14 tests, seeded generators: variable names ×8, linear/quadratic/rational/inequality/radical/arithmetic, skipped steps, scaled/rearranged forms, wrong constants, double errors, domain-excluded roots, sign-flip omission, renaming metamorphic, unreadable last line, unsupported domain). Suite 1190 → 1240 pass.

Exposed algebra corpora (406 cases; diagnostic):
- Reference-verified work (153): 125 credited correct, **0 judged incorrect**, 28 unestablished (linear systems / out of scope).
- Reference-invalid work with labelled first invalid line (147): 78 have a *correct final answer* and are credited (by design, answer-graded), 20 unestablished, 49 incorrect → **first error on the labelled line 49/49**; local per-line relation agreement with the labels 88/88.
- Unsupported/unresolved rate 13.5% (55 cases: two-variable systems, non-polynomial forms).
- Latency (answer verdict): p50 0.35 ms, p95 2.8 ms, mean 1.67 mathematical checks; with diagnosis p50 0.36 / p95 2.1 ms. No LLM, question-level statement parse cached.
- Mutation test (bumping one constant in verified work): in 360/514 runs the mutation did not change the final answer and is credited; a weak localisation signal on this corpus (3 diagnosed, all exact) — the generated tests carry the localisation evidence.

## 6. Regression and integrity (Gate 4)
| | 842934d | now |
|---|---|---|
| tests | 1226/0 | 1240/0 |
| scan exact / verified / FA | 1438 / 658 / 6 | 1438 / 658 / 6 (same contested set) |
| injection false verified | 0/4474 | 0/4474 |
| injection true survivors | 596 | **635** (baseline restored) |
| holdout (exposed) exact / FA | 235 / 0 | 236 / 0 |

**The 39 true-run losses, triaged**: all were inserted true remarks ("Note that 2 + 2 = 4." ×27, "Since 7 * 6 = 42 we continue." ×12) before/inside valid work. Cause: my Stage-3 inheritance rule made every later line positionally depend on an ungrounded line. Fix (`proof-obligations.ts`): a line inherits an ungrounded line's gap only if it uses a number that line introduced or shares its variable symbol. Falsehood injection unaffected (0 false verified).

## 7. Limitations / unsupported
- Algebra statements only (one variable, solution sets, numeric values). Linear systems, polynomial-identity/simplification tasks, calculus, geometry, probability are `unsupported` (no solution-set invariant forced onto them); each would need its own answer invariant (value/antiderivative derivative-check/theorem statement).
- Diagnosis kinds cover constant/factor imbalance and closed-arithmetic slips; other invalid steps are located but get a set-level explanation only. Inequality sign-reversal slips are located, not named.
- Answer credit ignores the derivation by design: 78 of 147 corpus "invalid" works have correct final answers and earn credit. Method/proof questions need the full pipeline.
- The final answer is the last statement about the variable; trailing unreadable lines leave the answer `unresolved`.
- Transitions across an unreadable line are marked set-level.
