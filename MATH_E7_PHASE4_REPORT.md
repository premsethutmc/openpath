# MATH_E7_PHASE4_REPORT — one immutable proof context

Branch `feat/math-generalization-core-e7`, from `4341b52` (Phase 3). Not merged, not deployed. Kernels were not touched; no new mathematical domain. Phase 5/6 not started (no verdict aggregator).

## 1. What changed
| Component | Change |
|---|---|
| `proof-context.ts` (new) | `buildProofContext(problem)` builds ONE deep-frozen `ProofContext` at the engine boundary: `premises` (task data), `restrictions` (conjunction), `branches` (domain components, **kept as alternatives**), `assumptions` (named, incl. `real-coefficients`), `implied` (restrictions forced by the typed expression: log argument > 0, radicand ≥ 0, denominator ≠ 0), `proved`, `student`, `unresolved`, `unreadable`. `withProved` / `withStudent` / `withUnresolved` return NEW contexts; the task-level `digest` never changes. `relateStudentRestriction` classifies a student restriction against the task without merging branches: `restates`, `implied`, `narrows` (with the branches it covers/excludes and a proof obligation), `contradicts` (empty on every branch), `new-quantity`. `routeUse` states what each route can consume. |
| `e6-calc.ts` | The module globals `TASK_STATED` / `TASK_COMPONENTS` are **removed**. The task domain is read from the context into a per-plan `TaskDom` threaded through `Env`, `signResolve`, `satisfied`. Restrictions/components the route cannot read are reported (plan note), not dropped. |
| `natural-generalization-e6.ts`, `unified-math-engine.ts` | The same context object is passed to the E6 route (`planGeneralizationE6(problem, input, ctx)`); every route records a `RouteUse` (`consumed`, `notConsumed`, `limitation`, `contextDigest`). |
| `claim-certifier.ts` | Student numeric restrictions are decided by the context (`relate` callback) instead of a flat interval check: a contradiction on every branch is `disproven`; a narrowing is `unresolved` with its obligation (blocking when it limits a domain the TASK stated; over a task with no stated domain it is a disclosed scoping choice, still reported); a restatement/implication is `proven` with task provenance. |
| `unified-math-engine.ts` (`certifyClaims`) | The certification boundary re-checks `routesShareContext` and publishes `domainPayload.proofContext`: task digest, route use/limitations, task restrictions/branches/implied/unreadable, proved facts (relevant verified lines), student assumptions with relation and obligation, unresolved premises. |
| `e6-common.ts`, `e6-numbers.ts` | Grounding is kept for rejected lines too (E6 plan `grounded`). Numbers only the student stated (a scenario) become `unresolved-premise` items: "nothing in the task supplies it". |

## 2. Execution traces (`phase4/traces.ts`; Phase 3 `4341b52` vs Phase 4)
| Case | Phase 3 | Phase 4 |
|---|---|---|
| student `x>0` vs task restriction `x<0` | invalid | invalid |
| student `x<1` vs the **implied** domain of ln(x−1) (no task restriction) | **verified** | **invalid** (new) |
| student `x>0` vs task alternatives `x<0 | x>0` | **verified** | **not verified** (new): "holds on branch x>0 only and excludes x<0" |
| same task, no student assumption, `∫1/x = ln|x|+C` | verified | verified |
| student restates implied `x>1` for ln(x−1) | verified | verified (task digest identical in all routes) |
| task with no stated domain, student scopes to `x>0` | verified | verified; obligation reported |
| scenario numbers only in the working (finite probability) | incomplete | incomplete + `unresolvedPremises` lists them |
| only the expected value `2/15` | unsupported | unsupported |
| typed restriction no route can read ("x is a prime") | verified | verified; listed in `task.unreadable` and in the E6 route limitation |
| Vieta by c/a / by roots under a stated real-coefficient assumption | verified | verified |
| Vieta `10/4 = 5/2` under the same assumption | incomplete | incomplete |

Same context across routes (domain components `x<0 | x>0`, restriction `x != 1`): `routesShareContext = true`, one task digest in every route; `e6-calculus` consumes `branches`; `e5-geocalc` reports "flattens domain components into one flat restriction list: alternatives are not represented as alternatives"; `base-algebra` reports "does not read task restrictions or domain components".

## 3. Results
| Check | Result |
|---|---|
| Tests (`bun test packages/learning/src`) | **1135 pass, 0 fail** (16 new in `proof-context-e7.test.ts`) |
| Falsehood-injection battery | false verified 0 of 4474 (E6-R 1971; Phase 2/3: 0); true injections still verified 517 |
| 1725-case regression scan | **identical to Phase 3**: exact 1436, 0 verified→other, 0 other→verified, final-verified-where-reference-not-verified 6 (the same six) |
| Newly blocked false acceptances | 2 in the designed traces (implied-domain contradiction; override of one of two task branches); none in the corpus (it has none of these shapes) |
| Newly rejected valid work | **0** (corpus and traces) |

All corpora are exposed development data; no holdout was scored.

## 4. Where a route can still self-certify, discard assumptions or substitute numbers for justification
1. **The legacy routes do not consume the context.** Base algebra ignores restrictions and branches; E5 flattens branches to one list; e6-numbers has no variable domain. Each says so in `routes[].limitation`; none of them is stopped by it (the verdict is Phase 6).
2. **Route precedence** (`mergeE6`, RR4) still lets one route's `verified` stand or fall without evidence reconciliation.
3. **Proved facts are reported, not consumed.** The context flows into routes immutably; `proved` is assembled at the boundary from verified lines. Inside a plan the routes keep their own per-plan state (`env`, `established`). Persisting proved facts as inputs to later lines is Phase 5.
4. **Student restrictions are decided only for one-variable numeric constraints** (RR3: verbal restrictions such as "x is positive" are `undecided`). Implied restrictions that are not one-variable linear (e.g. `x²−4 > 0`) are recorded but cannot decide a student statement.
5. **Disclosed scoping**: over a task with no stated domain a narrowing is not blocking (the earlier adjudicated fixtures d7/d11 require this); the obligation is reported but the result is not downgraded.
6. **Unreadable task restrictions** are reported, and the working must state what it needs; they are not enforced.
7. **Label-bound chains and literal coincidences** (Phase 3 list items 1–3) still rely on label plus numerical agreement.
8. **Scenario quantities**: a probability whose only link to the task is its final value is `incomplete`; nothing reconstructs the scenario.
9. A student-introduced non-task variable (`Assume k > 0`) makes the established parser report the line `malformed` (unchanged from Phase 3).
10. Typed-step and structured inputs (RR8) get the context but no claim ledger; `routesShareContext` is true by construction (one object passed), so it catches only a route that builds its own.

## 5. Reproduce
```
bun test packages/learning/src
bun tools/mathematics/generalization-e7/phase4/traces.ts > traces-e7.json
ENGINE_ROOT=<worktree at 4341b52> bun tools/mathematics/generalization-e7/phase4/traces.ts > traces-p3.json
bun tools/mathematics/generalization-e7/phase2/injection-battery.ts > battery.json
```
Scan output: `phase4/regression-scan-p4.json`.
