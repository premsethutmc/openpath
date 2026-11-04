# MATH_E7_PHASE3_REPORT — semantic grounding

Branch `feat/math-generalization-core-e7`, from `d9f9d5d` (Phase 2). Not merged, not deployed. Phase 4/5/6 were not started.

## 1. Problem
A calculation can be true and say nothing about the task. Before Phase 3, an unlabelled chain that reached the expected value was verified: `10/4 = 5/2` was a "verified Vieta-product derivation" for `2x²−6x+5` (E6-R baseline: verified). Value equality was standing in for relevance.

## 2. What changed (no new mathematical engine)
| Component | Change |
|---|---|
| `claim-grounding.ts` (new, ~60 lines) | `Grounding` = the sources of a derivation and a relevance verdict. Source kinds are never merged: `task-premise`, `derived-fact` (an earlier *relevant* verified line, or a value that provably satisfies the task's own condition), `student-assumption` (numbers the student stated in prose), `free-literal`. `assessRelevance` is a pure function over sources; it evaluates no mathematics. `groundingToCanonical` expresses a grounded claim in the existing canonical IR. |
| `e6-numbers.ts` (the existing exact Gaussian-rational chain checker) | Supplies the sources from facts it already holds: the task data (premises, now also named `a,b,c` for a quadratic and split into re/im), the `env` of earlier labelled definitions, the values of earlier verified lines, and a per-task `witness` (a root of the task polynomial). An unlabelled chain is `answerBound` only if grounded. |
| `acceptance-gate.ts` | `BindingEvidence.grounding?` (optional). |
| `e6-common.ts` | `Judge.grounding?` carried into the evidence. |
| `unified-math-engine.ts` | `certifyClaims` exposes a per-claim `provenance` in `domainPayload.claimLedger.claims`. |

### Relevance rule (`assessRelevance`)
Relevant iff (a symbol bound to a task premise or to an earlier relevant derived fact, OR a non-trivial value that is exactly a premise / an earlier relevant line, OR two different trivial values (|v|≤2) doing so) AND **no non-trivial number is left unexplained**. A number is explained by: a premise (up to sign, or a re/im part of a complex premise), an earlier relevant line, a value stated in an earlier prose line (recorded as `student-assumption`, never a premise), a component of a value that satisfies the task polynomial, or one arithmetic step between two *different* premises (8−3 from 8 and 3). A one-step number can explain a literal but cannot by itself relate the chain to the task. A chain that passes through an intermediate step built only from task data (48/120 for a task with data 48 and 120) is anchored by it; the final member is excluded because it is the answer itself.

### How grounding is represented in the existing IR
* `BindingEvidence.grounding` (checker output) → `{sources:[{kind,ref,by,trivial,derived?}], relevant, reason}`.
* `groundingToCanonical` → `canonicalizeMathematicalObject({mathematicalType:"grounded-claim", dependencies:[task-premise:…, derived-fact:…], assumptions:[student-assumption:…], verificationStatus, outstandingObligations:["relevance to the task is not established"]})` — the existing `dependencies`, `assumptions`, `verificationStatus`, `outstandingObligations` fields; no new IR type.
* Claim ledger: `claims[].provenance ∈ {task-premise, derived-from-task, student-assumption, ungrounded, unsupported, unresolved, unrecorded}` plus `grounding.sources`. A claim with no recorded grounding is `unrecorded`, never promoted. Unrecognised content stays `unsupported` and produces no evidence.

## 3. Execution traces (`phase3/traces.ts`; baseline E6-R vs Phase 3)
| Kind | Working (task) | E6-R | Phase 3 |
|---|---|---|---|
| irrelevant | `10/4 = 5/2` (Vieta product 2x²−6x+5) | verified | **incomplete** |
| irrelevant | `(2+3)/2 = 5/2` | verified | **incomplete** |
| irrelevant | `7/14 + 2 = 5/2` | verified | **incomplete** |
| irrelevant | "Let the numbers be 10 and 4" / `10/4 = 5/2` | verified | **incomplete** |
| irrelevant | `20/4 = 5` (mean of 4,8,3) | verified | **incomplete** |
| irrelevant | `(9+9+7)/5 = 5` (same task) | verified | **incomplete** |
| irrelevant | `6/16 = 3/8` (P = 3/8) | verified | **incomplete** |
| wrong quantity | `sum of roots = 5/2` (task: product) | verified | **incomplete** |
| wrong quantity | `product of roots = 3` (task: sum) | verified | **incomplete** |
| alternative | `product of roots = c/a = 5/2` | unsupported | **verified** |
| alternative | `c/a = 5/2` | unsupported | **verified** |
| alternative | `product of roots = 5/2` | verified | verified |
| alternative | roots defined (`z=(3+i)/2`, `w=(3−i)/2`), then `z*w = 10/4 = 5/2` | verified | verified |
| alternative | quadratic formula for x, y; then `x*y = 10/4 = 5/2` | verified | verified |
| alternative | `(3+i)/2 * (3−i)/2 = 10/4 = 5/2` in one line | verified | verified |
| alternative | `mean = (4+8+3)/3 = 5` / via intermediate sum / unlabelled | verified | verified |
| alternative | `P = 1 − 5/8 = 3/8` (complement) | verified | verified |

Six genuinely different Vieta-product methods (answer only, formula, c/a, roots-then-product, quadratic-formula, one-line root product) and three mean/probability methods are accepted. The merged envelope for the irrelevant cases reports `incomplete` (E6 route) with the grounding reason ("the numbers 10, 4 come from neither the task data nor an earlier verified result"); the claim provenance reads `unsupported`.

## 4. Results
| Check | Result |
|---|---|
| Unit/integration tests (`bun test packages/learning/src`) | **1119 pass, 0 fail** (24 new in `semantic-grounding-e7.test.ts`) |
| Falsehood-injection battery (787 cases, 4474 false runs) | false verified: E6-R 1971 → Phase 2 0 → **Phase 3 0** |
| Valid-work survival in the battery (true injections still verified) | Phase 2 518 → Phase 3 508 of 2113 |
| 1725-case regression scan (all exposed corpora) | exact 1434 → **1436**; verified→other **1** (h1:r6-202); other→verified **3** (r6-064, s6-249, s6-268; cause not separately attributed); final-verified-where-reference-not-verified **6 → 6**, the identical six cases (e5-sealed-007, e6-204, e6-263, e6-251, r6-194, r6-220), all pre-existing verdict-label disagreements (RR4 / contested e6-251), none introduced here |
| Performance (1020 cases) | p50 0.85 ms, p95 6.7 ms, p99 12.5 ms, max 22 ms |

Not a clean benchmark: every corpus above is exposed development data; no holdout was scored.

## 5. Remaining bypasses (explicit)
1. **Labelled chains are bound by the label** (`mean = 20/4 = 5`, `product of roots = 10/4 = 5/2` are still verified). The method's own steps (descending factors, √discriminant, complement) are not premises, and a strict rule broke correct permutation/quadratic work. Needs the per-step proof obligations of Phase 5.
2. **Literal coincidence.** A chain made only of numerals that happen to be premises (`5*1/2 = 5/2`, `(2*5)/(2*2) = 5/2`) is accepted; it is indistinguishable from a restatement of the data at this level.
3. **Datum restatement.** For the finite-probability task, any chain ending at the data's own ratio and passing through no free literal is accepted (`18/50 = 9/25`).
4. **Scenario-derived probabilities** whose only link to the task is the final value are now `incomplete` (h1:r6-202: `4/10·3/9 = 12/90 = 2/15` against data 6/45). Relevance needs the task's scenario text, which the problem record does not carry. This is the one accepted-valid-work loss; it needs Phase 4 (persistent task context).
5. Grounding is only wired into the exact chain checker (`e6-numbers`: complex, polynomial, probability, statistics, combinatorics). Calculus already ties each line to the posed function; geometry (E5) and the base algebra route have no grounding yet — a true but unrelated identity there is limited by the Phase 2 ledger, not by relevance.
6. The task `witness` exists for the Vieta tasks only; other families fall back to symbol/premise matching.
7. Phase 2 routes still open: RR4 (`mergeE6` route precedence), RR5 (self-attested evidence), RR7 (module-global task state), RR8 (typed steps).

## 6. Limitations that require later phases
* **Phase 5 (proof obligations).** Per-step *derivation* (why 10/4 is the product, not just that it equals it) and label-bound chains need obligation records `proven/disproven/unresolved/unsupported`, which grounding only approximates by source tracing.
* **Phase 6 (aggregator).** The E6 route returns `incomplete` with a precise reason, but the merged envelope for these cases still carries the base route's `unsupported`/"could not be translated" message in some paths; evidence-based route resolution would surface the grounding reason.
* **Phase 4.** `student-assumption` numbers are scoped to the current expression and prose lines; persistent provenance and domain consistency across lines belong to the proof context.

## 7. Reproduce
```
bun test packages/learning/src
bun tools/mathematics/generalization-e7/phase3/traces.ts > traces-e7.json
ENGINE_ROOT=/home/claude/e6r bun tools/mathematics/generalization-e7/phase3/traces.ts > traces-e6r.json
bun tools/mathematics/generalization-e7/phase2/injection-battery.ts > battery.json
```
Regression scan outputs: `tools/mathematics/generalization-e7/phase3/regression-scan-p3.json`, `regression-summary.json`.
