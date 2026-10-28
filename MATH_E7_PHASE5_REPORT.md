# MATH_E7_PHASE5_REPORT — proof obligations

Branch `feat/math-generalization-core-e7`, from `b487d50` (Phase 4). Not merged, not deployed. Phase 6 not started: `certifyClaims` is still the Phase 2 withdraw-only boundary, not an aggregator, and `mergeE6` is untouched.

## 1. What changed (no new mathematical engine)
| Component | Change |
|---|---|
| `proof-obligations.ts` (new) | One obligation per claim, built at the certification boundary from artefacts the pipeline already produces: the claim ledger (Phase 2), the line account and its dependencies, per-claim gate evidence, the Phase 3 grounding and the Phase 4 context relations. Kinds: `derivation` (the claim follows from what precedes it), `grounding` (it is about the task), `domain` (a student assumption does not silently change the task; also a claim about the whole domain after a disclosed narrowing), `answer` (the conclusion states the requested quantity). Status `proven / disproven / unresolved / unsupported`. Each carries `evidence {checker, scope, digest}`, `dependsOn`, `conditionalOn`, and a `canonicalizeMathematicalObject` identity (`proof-obligation`, with `dependencies`, `assumptions`, `outstandingObligations`, `verificationStatus` = verified / conditional / unverified). |
| `unified-math-engine.ts` (`certifyClaims`) | Builds the set, publishes `domainPayload.proofObligations`, and builds the proved-fact context from proven (and grounded, dependency-proven) obligations only. It can withdraw an acceptance when an obligation on the answer's dependency cone is not proven; it never grants one. |
| `e6-numbers.ts` | A derivation SHOWN in a labelled chain must itself be grounded (closes Phase 3 limit #1). Numbers are explained by: a premise, an earlier proved line, a stated scenario number (flagged), a monomial of degree ≤ 3 in the data times 1, 2 or 4 (`b²`, `4ac`), a unit offset (`n−1`), an exact root, `1−p` of a rational probability, a closed form reproducing a datum of size ≥ 10 or a non-integer rational (`10^4`, `C(8,2)`, `1/4`), and a quantity the kernel computes before the answer (the discriminant). An *explained* number never grounds a calculation by itself; a direct premise match or symbol is still needed. A bare `label = value` answer statement is judged against the kernel's own value, as before. |
| `claim-grounding.ts`, `e6-common.ts` | `Grounding.required`; the E6 plan carries the grounding of every line, whatever its verdict. |

### Rules the obligations enforce
* **Evidence, not status.** A derivation is `proven` only by a per-claim evidence item (kernel checker + digest) bound to its line, or, for a line that restates the task's own data, by the canonical match of the line account. A line the route calls verified but for which it recorded no per-claim evidence is `unsupported`; a route that certifies only in aggregate is reported `aggregateOnly` and never counted as proof.
* **Sequential evidence.** A claim whose dependency is not proven is `unresolved` even if its own check passed; a line after a disproven line is `unresolved` ("not independently checked"), not disproven. Unsupported, unresolved and disproven claims never enter `provedFacts`. A grounded line depends on the earlier lines it uses (`derived-fact:line-k`).
* **Dependency cone.** Only obligations the conclusion depends on can block it: an unrelated true side fact (`2^10 = 1024`) stays reported as unresolved and is never a proved fact, but does not invalidate correct work.
* **Conditional proofs.** A disclosed narrowing over a task with no stated domain makes the later obligations `conditionalOn` it (canonical status `conditional`); the derivation is accepted. A later claim about the whole domain ("holds for all real x") is an unresolved `domain` obligation that blocks. Branch overrides and contradictions are blocked as in Phase 4.

## 2. Examples (`phase5/traces.ts`; Phase 4 `b487d50` vs Phase 5)
| Case | Phase 4 | Phase 5 |
|---|---|---|
| `product of roots = 10/4 = 5/2` (2x²−6x+5) | **verified** | **incomplete** |
| `mean = 20/4 = 5` (data 4, 8, 3) | **verified** | **incomplete** |
| `mean = (9+9+7)/5 = 5` | **verified** | **incomplete** |
| `E[X] = 6*(1/2) = 3` (n=12, p=1/4) | **verified** | **incomplete** |
| roots that are not the task's, then `z + w = 6` | incomplete | incomplete |
| `2x = 5` then `x = 2` (right final value after a wrong step) | invalid | invalid |
| Vieta product by `c/a`, through the roots; Vieta sum through the roots; mean via a sum; binomial mean `12(1 − 3/4)`; quadratic roots with the discriminant `D = 4^2 − 4·1·13`; algebra concise `x = 2`; algebra factor-then-solve | verified | verified |
| `Assume x>0; ∫1/x = ln(x)+C` | verified | verified, obligations `conditionalOn x > 0` |
| the same plus "Hence this holds for all real x" | incomplete | incomplete, with an explicit unresolved `domain` obligation |
| one of two task branches narrowed / undefined symbol / scenario numbers only in the working | not verified | not verified (obligations unsupported / unresolved; `unresolvedPremises` listed) |

Created / discharged / carried forward, for `z=(3+i)/2; w=(3−i)/2; z*w=10/4=5/2`: three `derivation` obligations proven by `e6-independent-exact` with digests; the `grounding` obligation of line 3 depends on the obligations of lines 1 and 2 (`z`, `w`); the `answer` obligation depends on line 3's derivation and grounding and is proven by the route's completeness authority; `provedFacts` = those three lines.

## 3. Results
| Check | Result |
|---|---|
| Tests | **1163 pass, 0 fail** (28 new in `proof-obligations-e7.test.ts`) |
| Falsehood-injection battery | false verified **0 / 4474** (E6-R: 1971); true injections still verified 516 (Phase 4: 517) |
| 1725-case regression scan (exposed corpora) | exact **1436 → 1435**; verified→other 1 (`e6sealed:e6-280`); other→verified 0; final-verified-where-reference-not-verified 6 → 6 (the same six) |
| Valid solutions newly rejected | **1** in the corpus: `P(two red) = (5/8)(4/7) = 20/56 = 5/14` against data 10/28 — every number comes from a scenario (5 red of 8 …) that the problem record does not contain (Phase 4: missing scenario data is missing evidence). 0 in the traces. |
| False acceptances newly blocked | **4** (labelled unrelated derivations above); 0 in the corpus (it contains none of that shape) |
| Verified natural-text cases with every obligation proven | 653 of 656; 3 have an unproven side obligation outside the answer's cone; 0 are aggregate-only |
| Performance (1020 cases) | p50 1.05 ms, p95 6.8 ms (Phase 4: 1.05 / 8.5 ms); total 2.17 s vs 2.19 s |

All corpora are exposed development data; no holdout was scored.

## 4. Routes that can still certify without a justified derivation
1. **Typed-step and structured inputs** (`gateStructured`, RR8) have no claim ledger and no per-claim obligations; the gate records one aggregate evidence item.
2. **Calculus and geometry (E5/E6 calculus) lines** are discharged by the kernel's equality check; there is no grounding obligation (the chain's tie to the posed function is implicit in the `est` chain). A true identity about a different function is limited only by the kernel's equivalence to the posed one.
3. **Coincidence limits remain** in the number-chain grounding: a calculation built only from premises (`5*1/2 = 5/2`, `(2*5)/(2*2) = 5/2`, `18/50 = 9/25`, a ratio that is a small multiple of the data) is accepted; explained-but-derived numbers cannot ground by themselves, a single direct match can.
4. **Bare answer statements** (`mean = 5`) are accepted on the kernel's value; by design (concise answers are sufficient) but no derivation is demanded.
5. **Side claims about named quantities** that are true arithmetic but about the wrong quantity and outside the answer's cone (`D = 7^2 − 4·3·5 = −11` before correct roots) are reported, not blocking.
6. **Evidence is route-produced.** The checker names (`e6-independent-exact`, `u4-kernel`, `exact-solution-set`) are the routes' own kernels; the obligation layer cannot independently verify that a kernel was independent.
7. **Scenario-dependent derivations** whose only link to the task is the answer are incomplete (the one valid loss).
8. `mergeE6` precedence, module-global resource counters in `e6-cas`, and the legacy-route context limitations of Phase 4 are unchanged.

## 5. Can Phase 6 safely become the sole certification authority?
**Not yet, but it is now feasible, with conditions.**
* *In favour:* every natural-text acceptance in the corpus (656) now has an obligation set; 653 are fully proven, 0 depend on aggregate-only evidence, and the obligation statuses are the information an aggregator needs (proven / unresolved / unsupported / disproven, with evidence and dependencies).
* *Conditions before it is the sole authority:* (1) typed-step and structured inputs must obtain per-claim obligations or be explicitly marked non-certifiable by the aggregator; (2) calculus/geometry need a grounding obligation (the posed function / figure) or an explicit "not assessed" status; (3) kernel independence (item 6) needs a declared evidence provenance rather than a checker string; (4) the aggregator must replace `mergeE6` precedence by obligation resolution, and its rule for disagreeing routes must be tested against the six remaining label disagreements (e6-204, e6-251, e6-263, r6-194, r6-220, e5-sealed-007); (5) scenario-dependent probability needs the scenario text in the problem record, or the aggregator must treat it as unresolved by design.
* It must not become the sole authority before (1)–(3) or those inputs would be certified by default or refused wholesale.

## 6. Reproduce
```
bun test packages/learning/src
bun tools/mathematics/generalization-e7/phase5/traces.ts > traces-e7.json
ENGINE_ROOT=<worktree at b487d50> bun tools/mathematics/generalization-e7/phase5/traces.ts > traces-p4.json
bun tools/mathematics/generalization-e7/phase2/injection-battery.ts > battery.json
```
Scan output: `phase5/regression-scan-p5.json`.
