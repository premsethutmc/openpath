# E7 false-rejection analysis (Agent 3)

Baseline `837c79c` (head of `feat/math-generalization-core-e7`), exposed 678-case holdout, engine `assessMathematicalWorking`. Per-case data: `research/sympy-transition-eval/out/e7-false-rejections.json` (id, category, engine verdict, root cause, evidence, secondary blocker, E7 justification, problem, working, SymPy/combined outcome, reproduce command).

## 1. Baseline reproduced

`bun tools/mathematics/generalization-e7/repair/holdout-diag.ts …` and `bun research/sympy-transition-eval/e7-dump.ts …` (identical results):

| | reported | reproduced |
|---|---|---|
| cases | 678 | 678 |
| exact | 236 | **236** |
| false rejections (label verified, engine not) | 212 | **212** (as unsupported 118, malformed 61, invalid 16, ambiguous 9, incomplete 4, missing-assumption 4) |
| false acceptances | 0 | **0** |
| package tests (`bun test packages/learning/src`) | — | 1296 pass / 0 fail |

The remaining 230 non-exact cases are all labelled non-verified and not accepted, so they are safe abstentions or mislabelled refusals: invalid→unsupported 77, invalid→malformed 37, incomplete→unsupported 37, missing-assumption→unsupported 26, incomplete→malformed 10, missing-assumption→malformed 8, and 35 cases where the engine gave a different decisive non-verified verdict (e.g. invalid→incomplete 6, missing-assumption→incomplete 5, missing-assumption→invalid 4). Exact matches by label: invalid 92, verified 86, incomplete 35, unsupported 10, missing-assumption 9, ambiguous 4.

## 2. Root causes of all 212 false rejections

Primary cause = the first blocker in E7's own pipeline, read from E7's justification and traced to the producing code (`MATH_TRANSITION_ENGINE_AUDIT.md` §3), refined by case content; 166 by rule, 46 hand-assigned after reading E7's step-level output (`harness/classify_fr.py`, `OVERRIDE`). "Recovered" = verified by the combined strategy C1 of `SYMPY_TRANSITION_EVALUATION.md`.

| # | Root cause | Cases | Recovered by SymPy prototype (C1) |
|---|---|---|---|
| 1 | Parser or representation limitation | **123** | 35 |
| 2 | Valid equivalence not recognised | 7 | 7 |
| 3 | Valid implication / true side claim not recognised | 7 | 0 |
| 4 | Planner search failure | **0** (planner is not on the assessment path, `engine:false`) | — |
| 5 | Missing or mis-specified transformation rule | 18 | 0 (9 become *conflict → review*) |
| 6 | Incorrect domain or assumption handling | 6 | 0 |
| 7 | Unsupported mathematical operation | 50 | 11 |
| 8 | Evaluation fixture / expected-result defect | 1 | 0 |
| 9 | Other | 0 | — |

By category:

| category | 1 | 2 | 3 | 5 | 6 | 7 | 8 | total |
|---|---|---|---|---|---|---|---|---|
| algebra-equations | 26 | 0 | 0 | 0 | 1 | 0 | 0 | 27 |
| algebra-expressions | 31 | 1 | 0 | 0 | 0 | 0 | 0 | 32 |
| calculus-derivative | 6 | 0 | 2 | 0 | 1 | 6 | 0 | 15 |
| calculus-integral | 12 | 5 | 0 | 0 | 0 | 11 | 0 | 28 |
| calculus-limits-series | 6 | 0 | 0 | 0 | 2 | 21 | 0 | 29 |
| geometry | 7 | 0 | 3 | 7 | 0 | 4 | 1 | 22 |
| other-domains | 28 | 0 | 2 | 2 | 0 | 1 | 0 | 33 |
| typed-routes | 7 | 1 | 0 | 9 | 2 | 7 | 0 | 26 |

**Not all 212 are solvable by symbolic simplification.** 58% are parse/representation failures (many of which still need task semantics once parsed: secondary blockers recorded include true side claims 9, case analysis 5, linear systems 4); 24% are operations no current route evaluates (proof-style limits/series, epsilon-delta, squeeze, improper and FTC integrals, implicit/parametric differentiation, congruence proofs); 8.5% are rule contracts (typed method names judged by rule form; geometry citations checked only against given facts).

## 3. Examples (reproducible; working shown with ' / ' for newlines)

**1 Parser / representation (123).**
- `h7-algA-004` `x^2+6x+4=0`: `(x+3)^2=5 / x+3=±sqrt(5) / x=-3±sqrt(5)` → "a plus-or-minus sign is supported only in a solved form".
- `h7-algA-005`: `disc = 9+40 = 49 / x = (3±7)/4 / x = 5/2 or x = -1` → "unexpected trailing notation".
- `h7-algA-011` `x^2-4x-5<0`: `(x-5)(x+1)<0 / -1<x<5` → chained inequality rejected.
- `h7-algA-019`: `check: sqrt(9)=3` → "unsupported character ':'". 19 false rejections stop at a `:` (`check:`, `multiply by 6:`, `Case x ≥ 2:`).
- `h7-algA-038`: `x=5 / Also 2+2=4.` → "malformed number" (prose).
- `h7-dom-056` `cos x = 0`: `x = π/2 + kπ` → "no lossless natural adapter for trigonometry" (6 false rejections across trigonometry, linear algebra, sequences, exponential-log).

**2 Equivalence not recognised (7).** `h7-algB-003` `Factor x^3 - 8`: `x^3 - 8 = (x-2)(x^2+2x+4)` → independent checker abstains, acceptance withdrawn. `h7-calcI-001`: bare `x^4/4 + C`; `h7-calcI-005`: `ln|x| + C`; `h7-typed-067`: `2 sin x cos x → sin 2x` ("no bounded exact strategy").

**3 True side claim / implication not recognised (7).** `h7-calcD-021`: `… = 6(2x-1)^2 / At x=1 this value is 6.`; `h7-dom-019`: `… / Note that 7/12 > 1/2.`; `h7-geo-006`: `… / Also 2 × 47° = 94°.` (the side-claim retry does not fire because the extra line is not flagged off-task).

**5 Rule contracts (18).** Nine typed steps whose `rule` names a method are rejected as **invalid** although the claim is exactly right: `h7-typed-005` (substitution, e^(x²)/2 + C), `-009` (fundamental theorem, x³/3 then 9), `-037` (chain rule, 2x+2), `-043`, `-044`, `-046` (parts, (x−1)eˣ), `-048`, `-049`, `-055` (odd symmetry, 0). Geometry: `h7-geo-047/053/059` cite `linear pair`/`vertical` for a step that uses a fact derived on the previous line; the cited-rule check consults given facts only and calls the step **invalid**. `h7-geo-029` (exterior angle theorem), `-021/-022` (isosceles base angles cited by hypothesis), `h7-dom-045/046` (remainder theorem, synthetic division).

**6 Domain / assumption handling (6).** `h7-algA-023` `(x+2)/(x-1)=3`: the restriction line `x≠1` is read as a statement that narrows the set → "lost solutions". `h7-calcD-028`: `Case x>0: |x| = x …` judged without its case condition → **invalid**. `h7-calcL-007`, `-026`: case conditions not carried. `h7-typed-073/076`: assumption obligations (invertibility; extra data fields) reported as not established.

**7 Unsupported operations (50).** Series tests (`h7-calcL-016/017/021/029`), squeeze (`-015/-025/-030`), epsilon-delta (`-020/-027`), improper integrals (`h7-calcI-019/020/029/031/032`), FTC (`h7-calcD-033/034`, `h7-calcI-021`), implicit/parametric/log differentiation (`h7-calcD-030…035`), Taylor (`h7-calcL-013`), double integral (`h7-calcI-022`), limit claims inside natural working (`h7-calcL-001/004/009/022/024`), congruence (`h7-geo-066/068/072/073`), typed limit methods (`h7-typed-013/015/057/059/062/064`).

**8 Fixture (1).** `h7-geo-077`: label `verified`, independent audit `incomplete` (AB = √169 asserted without computing the distance). No false rejection is in `contested.json`.

## 4. Most serious false rejections

The 16 that end **invalid** assert that correct work is false: 9 typed rule-contract cases, 3 geometry derived-fact citations, `h7-calcD-028` (case scope), `h7-dom-013` (`4! 6!` misread), `h7-dom-018` (`P(no six)` read as the requested probability), `h7-dom-040` (`let …`). The combined strategy turns the 9 typed ones into *conflict → review* (SymPy proves each claim exactly) and does not affect the other 7 (outside the prototype's scope).

## 5. Implications

- The largest lever is the natural front end (`natural-working.ts`) plus all-or-nothing line accounting — a TypeScript change, independent of SymPy.
- SymPy helps where E7 lacks the operation, not where it lacks the syntax: calculus answer checks (antiderivative by differentiation, exact limits), expression identities with domains, typed claims named by method.
- Geometry, proof-style calculus and most "other domains" need rules or adapters, not a CAS.
