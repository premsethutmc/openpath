# MATH_E7_PHASE2_REPORT — claim ledger and claim accounting

Branch `feat/math-generalization-core-e7`, starting commit `0f22913`. Not merged, not deployed. Phase 1 gate decisions applied: (1) s6-182 → `missing-assumption`; (2) an uninterpretable recognizable claim → `unsupported`, `incomplete` only for unfinished required working; (3) a student assumption that demonstrably contradicts a task restriction → `invalid`, undecided compatibility stays unresolved.

## 1. What changed (no new mathematical handlers; kernels, canonical IR, binding store untouched)

| Component | Change |
|---|---|
| `claim-ledger.ts` (new) | Parser-independent extraction. Tokenises the raw text and records, per source line, every claim (`relation`, `assertion`, `assumption`) with line + character span, the leading words, and the residue (non-claim text). Handles claims inside prose, compound lines, LaTeX, factorials, limit arrows, labelled relations, qualitative statements, modelling-assumption sentences. |
| `claim-certifier.ts` (new) | Accounts each ledger claim against the line records a route produced (`proven` only when a credited, verified-valid record covers the whole claim; a dropped claim is `unsupported`, never `proven`). Exact interval reasoning decides student restrictions against the immutable task domain (restrictions ∧ ∨ domainComponents). Self-declared unfinished work withdraws acceptance. It can only withdraw an acceptance or report a contradiction; it never grants one. |
| `proof-integrity.ts` | New line role/status `non-mathematical` / `not-mathematical`: a prose line is accounted, preserved, earns no credit and is never evidence. Multiple rows per source line are ordered by span. |
| `e6-common.ts` | `prepareRows` expands any prose sentence that carries claims into one row per claim (own span). `Builder` never issues evidence for a non-mathematical judgement. `proseJudge`: no claim → non-mathematical; uninterpretable statement → `unsupported`. |
| `e6-calc.ts`, `e6-numbers.ts` | The three prose-skip sites no longer fabricate `verified` evidence. Limit non-existence statements are credited by a real check against the computed limit. Answer lines must name the requested quantity (numeric match alone is not an answer). A complement event is bound only by structural substitution in the chain and only when the premises license it (independence/replacement); never back-solved from the claimed result. Task `domainComponents` are now a disjunction: a requirement must hold on every component (was: flattened into a conjunction). The no-real-roots check credits only a sentence that says nothing else. |
| `unified-math-engine.ts` | `certifyClaims` runs after the existing acceptance gate for every natural-language submission and attaches the ledger (`domainPayload.claimLedger`). |

## 2. Invariants (user list) — status after Phase 2

| Invariant | Status |
|---|---|
| Every recognized claim has a ledger entry with provenance | **Done** (line, span, kind, lead, residue). Recall is bounded by the extractor's vocabulary (see §6). |
| Every claim has proven / disproven / unresolved / unsupported | **Done** (`accountForLedger`, `evaluateLedger`). |
| Prose classification, syntax, route success, numerical agreement never become evidence | **Done for prose and for label/value agreement**; kernel judgements are still self-attested by the route (§6, RR5). |
| Quantity bound to the requested quantity | **Partial**: label binding done; binding of unlabelled chains to task data is **not** done (RR1). |
| Task assumptions immutable; student assumptions cannot replace them | **Done** for numeric restrictions, disjunctive domains and named modelling assumptions; verbal restrictions ("x is positive") are not parsed (RR3). |
| Route disagreement resolved by evidence, not precedence | **Not done** (Phase 6; RR4). |
| Final aggregator the only issuer of `verified` | **Partial**: `certifyClaims` can withdraw but the routes still issue `verified` first (Phase 6). |
| Complete accounting required for `verified` | **Done** for ledger claims. |
| A correct final answer does not repair incorrect reasoning | **Done for embedded claims**; unchanged elsewhere. |

## 3. Execution traces: how each identified bypass is blocked (`phase2/traces.ts`; E6-R baseline vs E7)

| Bypass | Scenario | E6-R verdict | E7 verdict |
|---|---|---|---|
| 1 prose is proof | s6-217 forged identity | verified | **invalid** |
| 1 prose is proof | s6-226 forged symmetry | verified | **invalid** |
| 1 prose is proof | s6-238 forged Vieta formula | verified | **unsupported** |
| 1 prose is proof | false limit sentence | verified | **unsupported** |
| 1 prose is proof | false arithmetic in prose | verified | **invalid** |
| 1 prose is proof | derivative sentence, wrong | verified | **unsupported** |
| 2 label-agnostic answer | sum of roots = 5/2 (product task) | verified | **incomplete** |
| 2 label-agnostic answer | banana = 5/2 | verified | **incomplete** |
| 3 back-solved event | s6-182 | verified | **missing-assumption** |
| 3 back-solved event | unfamiliar: tails | verified | **missing-assumption** |
| 4 student assumption vs task | Assume x>0 under x<0 | verified | **invalid** |
| 6 shared blind spot | s6-299 disjoint domain components | verified | **missing-assumption** |
| control | valid: direct | verified | **verified** |
| control | valid: prose + true identity | verified | **verified** |
| control | valid: compatible student assumption | verified | **verified** |
| control | valid: Vieta labelled | verified | **verified** |

Ledger of every E7 trace is in `phase2/traces-e7.json`. Mechanisms: (1) the sentence is split into claim rows; a relation is judged by the kernel (s6-217 `P(A|B)=P(A∩B)−P(B)` and s6-226 `C(11,3)=C(11,4)` are false → `invalid`), a statement without relation form is `unsupported` (s6-238, false limit/derivative sentences); (2) a label that names another quantity is `incomplete`; (3) the unbound event is `missing-assumption`; (4) the contradicting assumption is `disproven` by interval reasoning → `invalid`; (6) the second domain component fails the log-domain requirement → `missing-assumption`.

## 4. Evidence

* **Unit/property tests** `claim-ledger-e7.test.ts` (31 tests): extraction spans, the no-claim-loss property over 400 random compositions, the false/true injection property, every bypass, the s6-217/226/238/299/182 regressions, unfamiliar variants, valid alternative methods (factoring, L'Hôpital, explanation between true lines, true relation in a sentence), restriction interval logic. Full suite: **1095 pass, 0 fail**, including every legacy E1–E6 and E6-R suite (1090 before this phase).
* **Falsehood-injection battery** (`phase2/injection-battery.ts`; 787 natural cases whose reference is `verified`, 4 474 false injections: false prose relation, false verbal assertion, false predicate claims, false line between lines, false trailing line): **E6-R verified 1 971 of 4 474 (44.1%); E7 verified 0.** One run initially verified (compound "no real roots … and the function is odd" credited wholesale); repaired generically and covered by a test.
* **Regression scan** (`phase2/regression-scan-e7.json`, `regression-summary.json`; 1 725 natural-input cases from E2–E6 dev/validation/sealed and both E6-R holdouts; **exposed regression data, not a generalization measure**):
  * exact verdicts 1 439 → 1 434 (83.4% → 83.1%);
  * raw false acceptances **11 → 6** (the five holdout-#2 confirmed/contested ones s6-217, 226, 238, 299, 182 are no longer accepted); **no new false acceptance**;
  * the 6 remaining raw FAs are label/adjudication matters: e6-204, e6-263, e5-sealed-007 (labels corrected in the versioned overlays, engine correct), r6-194, r6-220 (two blind adjudicators: engine correct), **e6-251 (contested — see §5)**;
  * 12 cases that were exact are no longer exact; all twelve are non-accepting (none is a new acceptance): e6-270, r6-012, r6-355, s6-315, s6-339, s6-343 (reference `verified`, now `unsupported`/`malformed`) and e6-147, r6-315, s6-256, s6-274, s6-277, s6-308 (non-accepting reference, different non-accepting label). Cause in all: a recognized claim in prose that no kernel can check ("roots are 1+i and 1−i", "E[X] is the integral of x f(x) …", "k + 2k + 3k = 1" as an equation to solve, "σ² = mean of squares − mean²"). These now fail closed, as decision 2 requires; they are capability gaps, not wrongly rejected mathematics. Seven cases improved (r6-051, r6-265, r6-285, s6-182, 217, 226, 299).
* **Performance** (`phase2/bench.ts`, 1 020 cases, second pass): total 1 609 ms → 1 697 ms (+5%), p95 6.0 → 6.1 ms, p99 13.5 → 12.2 ms, RSS 129 → 135 MB.

## 5. e6-251 (outstanding E6-R item)

Second blind adjudicator (`e6-251-second-adjudication.v1.json`): `missing-assumption` (confidence 0.6, competing `verified`); first adjudicator: `verified`. The two disagree; the reference label is `missing-assumption`. **e6-251 stays CONTESTED**; it is neither a confirmed false acceptance nor a confirmed label defect. Caveat: the second brief named the `x ≠ 2` question (priming risk).

## 6. Remaining routes capable of unjustified verification (probes: `phase2/remaining-routes-probes.ts`)

| # | Route | Evidence | Planned fix |
|---|---|---|---|
| RR1 | **Unbound numeric chain**: an unlabelled chain that ends at the truth without using task data, e.g. `10/4 = 5/2`, `(2+3)/2 = 5/2` for a Vieta-product task, is `verified`. | probe output | Phases 3/5: bind the final quantity to the task data through proof obligations (derivation must be reachable from the givens). **Highest priority.** |
| RR2 | **Ledger recall limit**: a claim phrased outside the extractor's vocabulary ("the curve is steeper near the origin") is not recognized, so it neither blocks nor is proven. Recognized: relations, copula + mathematical operand, a predicate list (even/odd/prime/positive/…/roots/continuous/…), modelling assumptions. | probe output | Extend with the Phase 3 typed claim vocabulary; keep recall tests. |
| RR3 | **Verbal restrictions** ("Assume x is positive") are not parsed into constraints, so a contradiction with a task restriction is not detected from verbal form. | probe (`missing-assumption`, not `verified`, by other checks) | Phase 4 proof context. |
| RR4 | **Route precedence** (`mergeE6`): a legacy `ambiguous` is still replaced by E6 `invalid` (s6-034, 048); a legacy `invalid` beats a correct E6 `verified` (s6-314). Not an acceptance route, but wrong verdicts. | probe output | Phase 6 aggregator. |
| RR5 | **Self-attested evidence**: a kernel `valid` still produces `verified` evidence by the same route; the gate checks existence, not independence. | code (`Builder.add`) | Phases 5/6. |
| RR6 | **Whole-line multi-claim records**: a record spanning a line that holds several claims separated only by connectives ("x = 3 or x = −3") is trusted to have examined all of them (needed for legacy algebra conjunctions); a parser that silently ignored one would not be caught. | design note | Phase 5: obligations per claim from the kernel. |
| RR7 | **Module-global task state** (`TASK_STATED`, `TASK_COMPONENTS`) in `e6-calc.ts`: reset on every call, safe only because planning is synchronous. | code | Phase 4 `ProofContext`. |
| RR8 | **Typed (non-natural) steps** bypass the ledger by construction (no free text). | by design | none needed. |
| RR9 | E6 is the sole verifier on 344 of the 550 accepted corpus cases and has no destination cross-check. | Phase 1 scan | Phase 6. |

## 7. Reproduce

```
bun test packages/learning/src                                   # 1095 pass
bun test packages/learning/src/claim-ledger-e7.test.ts           # Phase 2 tests
cd tools/mathematics/generalization-e7/phase2
ENGINE_ROOT=/home/claude/e6r bun traces.ts > traces-baseline-e6r.json ; bun traces.ts > traces-e7.json
ENGINE_ROOT=/home/claude/e6r bun injection-battery.ts ; bun injection-battery.ts
ENGINE_ROOT=/home/claude/e6r bun bench.ts ; bun bench.ts ; bun remaining-routes-probes.ts
```
(`/home/claude/e6r` is the E6-R baseline worktree at the same commit as this branch's start, `0f22913`.)

## 8. Gate

Phase 2 acceptance conditions are met except the items listed as partial/not done above, each tied to a later phase. RR1 should be treated as the first target of Phase 3/5. Awaiting approval before Phase 3.
