# E7 Independent Final Holdout — evaluation (single execution)

Engine under test: `5d0a7b4` (unchanged; verified no diff in `packages/`). Freeze commit `c186724` (hashes in `tools/mathematics/generalization-e7/holdout/FREEZE.json`). Executed once, 678 cases, 0 harness errors. No engine change was made in response. Nothing merged or deployed. **E7 is not closed (see section 6).**

## 1. Method
- 678 fresh cases by 8 engine-blind authors (algebra ×2, derivatives, integrals, limits/series, geometry, other domains, typed/text-line routes); every expected verdict derived from the mathematics (no sympy offline: hand derivation + `fractions`/numeric checks). No E1–E6 case reused.
- Labels frozen with a **blind re-derivation by 7 separate auditors** (`audit.json`). Original author labels are never changed; where the auditor differs the case is *contested* and scored separately (21 cases).
- Mix: 298 verified / 219 invalid / 85 incomplete / 57 missing-assumption / 11 unsupported / 8 ambiguous; 53 side-claim, 26 coincidence, 37 conditional, 18 dependent, 44 concise, 12+16 different-method, 70 typed, 15 text-line, 30 route-equivalence cases.
- Files: `cases.json`, `labels.json`, `audit.json`, `results-raw.json` (full original results), `disagreements.json`, `adjudication.json`, `contested.json`, `score-summary.json`; scripts `run-holdout.ts` (refuses a second run), `score.ts`, `dsl.ts`, `compile.ts`.

## 2. Results (against the frozen author labels)
| | all 678 | uncontested 657 | contested 21 |
|---|---|---|---|
| exact match | **228 (33.6%)** | 219 (33.3%) | 9 |
| acceptable via `alt` | 4 | 4 | 0 |
| **false acceptances** (engine verified, label not) | **5** | 4 | 1 |
| **false rejections** (label verified, engine not) | **215** of 298 | 214 | 1 |
| engine `unsupported` | 272 | 263 | 9 |
| engine `malformed` | 117 | | |

False rejections of expected-verified work by engine answer: unsupported 119, malformed 61, **invalid 18**, ambiguous 9, missing-assumption 4, incomplete 4. Engine decisive (not unsupported/malformed) on 289/678. Precision of `verified`: 83/88 (94.3%). Of 380 expected-non-verified cases only 5 were verified (1.3%).

Per category (n / exact / FA / FR): algebra-equations 85/38/1/27; algebra-expressions 81/10/0/32; derivative 81/48/0/15; integral 78/12/0/29; limits-series 70/7/0/29; other-domains 100/21/0/33; geometry 83/38/2/23; typed-routes 100/54/2/27.

## 3. False acceptances — independent adjudication (`adjudication.json`)
| case | label (author / blind audit) | adjudication |
|---|---|---|
| h7-geo-012 `C = 35+75−40 = 70°` | incomplete / incomplete | **CONFIRMED.** 40 = 75−35 is one arithmetic step from task numbers, so E5 grounded it; no theorem justifies it |
| h7-geo-013 `A+B=120, 120÷2=60, C=60` | incomplete / incomplete | **CONFIRMED.** numerical coincidence (halving) accepted |
| h7-algA-048 `4x=8, x=8−6, x=2` | invalid / invalid | **CONFIRMED** (low severity). the line is a true equation but `8−6` is not a consequence of `4x=8`; solution-set equivalence accepted it |
| h7-typed-045 `∫1/x = ln x + C` | missing-assumption / same | **CONFIRMED** (moderate). antiderivative on x>0 only; same family as contested `e6-251` |
| h7-typed-033 `d/dx sin(2x)=2cos 2x` labelled "power rule" | invalid / **verified** | **CONTESTED, preserved.** result is correct; whether a wrong rule label is part of the claim is a contract question |

**4 confirmed + 1 contested false acceptances.** The first three are exactly the "numerical coincidence / one-step grounding" bypass listed as open in Phase 6 (now empirically confirmed on fresh cases). `e6-251` stays contested (not in this holdout).

## 4. Targeted bypass results
| challenge | cases | result |
|---|---|---|
| numerical coincidence / one-step grounding (tag `coincidence`) | 26 | **2 FA** (geo-012/013), 8 exact; rest unsupported/malformed-blocked |
| kernel disagreement / wrong acceptance | via `wrong-rule`, `wrong-theorem`, `forged` tags (27) | 1 contested accept (typed-033); 0 contradictions accepted; 1 `kernel-contradiction` rule firing |
| typed-step relevance (`typed-relevance`) | 5 | 0 FA, 3 exact |
| calculus / geometry grounding (side-claim 53, calculus+geometry sets) | 53 | 0 FA; 21 false rejections (valid work with an extra true line not accepted) |
| unsupported dependent claims (`dependent`) | 18 | **0 FA**, 0 FR, 8 exact |
| irrelevant side claims | 53 | 0 FA, 15 exact |
Route equivalence (30 paired typed/text-line vs natural cases): 13 exact; the engine's verdict differs within 7 of 15 pairs (route inconsistency, mostly coverage), but in no pair did one route verify work that the label marks non-verified while the twin did not.

## 5. Evidence provenance, performance, scope
- **Provenance failures: 0** of 88 verified results (every verified result has proven derivations, 0 unattributed, registered mechanisms only: see `score-summary.json`).
- Performance over 678 cases: p50 1.23 ms, p95 10.8 ms, p99 22.4 ms, max 179 ms, total 2 s.
- **Supported-scope coverage is the dominant failure.** Valid work is rejected mainly for notation/format reasons, not for mathematical ones:
  - `malformed` (117): `unexpected trailing notation` 30, `comma suffix must be a domain restriction` 12 (e.g. `x = 4, y = 3`), `solution branches must name one variable` 12 (`x=5 or x=-1`, `x=1, 2 or -2`), `expected expression` 13, bounded-integer exponent 6.
  - `unsupported` (272): prose or label prefixes (`multiply by 6: …`, `Case x ≥ 2: …`), degree sign `°`, bare-value or bare-antiderivative answers (`1/2`, `(1/2)atan(x/2) + C`), inequality chains, system answers, set-builder/outcome enumerations, geometry lines without a named theorem pattern, limit/series methods ("factor", "standard limit", "degree comparison").
- **Valid work called false (18 `invalid`)**: 8 typed claims whose `rule` names a method (substitution, integration by parts, fundamental theorem, odd-function symmetry, chain rule) are judged by the rule-form kernel and rejected although the claimed result is right; `f'(x)=6(2x−1)^2 ⏎ At x=1 this value is 6` (an evaluation side line); piecewise `|x|` case analysis; `[x^3/3] from 0 to 3 = 9`; `10C4` evaluation; two linear-pair/vertical angle chains (geo-047/059); complex quotient with `let`. These are the most serious false rejections because they assert falsehood.

## 6. Decision evidence — can E7 close?
Targets of the plan: zero confirmed false acceptances, ≥90% exact. Observed: **4 confirmed false acceptances, 33.6% exact (at most 35.4% even if every contested case went the engine's way)**. The integrity of what *is* verified is good (94.3% precision, 0 provenance failures, 0 verified-without-obligation, dependent claims and side claims 0 FA), but E7 cannot be closed: 
1. **Integrity defect requiring correction:** one-step/coincidence grounding (geo-012/013, algA-048) — the open Phase 6 bypass #1, now confirmed; plus `ln x + C` domain acceptance (typed-045).
2. **Integrity-adjacent defect:** rule-form kernels return `invalid` (a claim of falsehood) for correct typed claims carrying a method name; in Phase 6 this was treated as non-justification only when another kernel verified.
3. **Coverage defect (largest):** parser/notation scope rejects about 60% of valid, differently-phrased work as `unsupported`/`malformed`; that is the cause of the exact-match shortfall, not the certification logic.
Recommendation: **REVISE** (do not merge). Specific corrections needed before a fresh re-holdout: (a) grounding requires a justification relation, not arithmetic distance to task numbers; (b) typed rule-name kernels must report `unsupported`, not `invalid`; (c) notation coverage (labels/prose prefixes, `or`/comma branches, systems, `°`, bare answers, bracket-evaluation); (d) decide the contested `e6-251`/`ln x` domain contract. This holdout is now exposed and cannot be reused as a holdout after these changes.

## 7. Reproduce
`bun tools/mathematics/generalization-e7/holdout/compile.ts` (rebuilds inputs/labels) · `bun .../run-holdout.ts` (refuses; results exist) · `bun .../score.ts`.
