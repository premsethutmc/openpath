# E7 mathematical reasoning — capability matrix

Independent generalization audit. Engine under test: `837c79c` (unchanged). Benchmark r1: 2,382 cases, SHA-256 `a4ece4bf0474b47feceb6ba98cb86d56301e17b665ea5d96489a814becc312e8`, frozen in commit `41cbff2` before E7 was run. Per-case results: `MATH_GENERALIZATION_RESULTS.json` (repo root). Matrix data: `research/generalization-audit/results/capability.json`.

## How to read this

- **Decided**: E7 returned a decisive verdict (accept, reject or a specific objection). Abstentions (unsupported / malformed / ambiguous / unrepresentable) are never counted as capability, even when abstaining was the expected behaviour.
- **Decisive correct**: share of decided cases whose verdict is acceptable for the case.
- **Status**:
  - *supported*: abstains on at most 30%, decisive-correct at least 90%, and no mathematical false acceptance.
  - *partial*: decides often enough to matter, but with errors or a large abstention share.
  - *unsupported*: abstains on more than 70%.
- **False accepts** are split into two kinds:
  - *math*: the accepted work is mathematically wrong.
  - *policy*: the result is correct, but a grading obligation is skipped, such as an unstated restriction, an unchecked candidate or a wrong cited rule.
- 95% Wilson intervals are in `capability.json`. With fewer than about 40 decided cases a rate is indicative only.

## Matrix (r1, primary channel per case)

| Capability family | Cases | Decided | Decisive correct | Abstention | Math false accepts | Policy false accepts | False rejects | Misgrades | Status |
|---|---|---|---|---|---|---|---|---|---|
| Solution-set preservation (equations) | 294 | 121 | 0.91 | 0.59 | 0 | 0 | 5 | 6 | partial |
| Inequalities: sign, monotonicity, boundaries | 127 | 59 | 0.93 | 0.54 | 0 | 0 | 0 | 4 | partial |
| Algebraic identities (expand, factor, rational, exponent, radical) | 209 | 113 | 0.87 | 0.46 | 0 | 0 | 10 | 5 | partial |
| Derivatives | 133 | 77 | 0.95 | 0.42 | 0 | 0 | 3 | 1 | partial |
| Multivariable (identities, systems, partials, parameters) | 170 | 67 | 0.96 | 0.61 | 0 | 0 | 3 | 0 | partial |
| Multi-step chains, side claims, completion | 169 | 76 | 0.87 | 0.55 | 0 | 0 | 1 | 9 | partial |
| Extraneous roots and candidate checks | 71 | 25 | 0.88 | 0.65 | 0 | 2 | 0 | 1 | partial |
| Logarithm and exponential laws | 108 | 47 | 0.83 | 0.57 | 0 | 0 | 8 | 0 | partial |
| Functions: composition and inverses | 30 | 13 | 0.77 | 0.57 | 0 | 0 | 1 | 2 | partial (small n) |
| Domain preservation and excluded values | 360 | 166 | 0.65 | 0.54 | 0 | 16 | 16 | 26 | partial |
| Assumption-aware equivalence | 73 | 35 | 0.46 | 0.52 | 0 | 0 | 16 | 3 | partial |
| Notation, ambiguity, malformed input | 84 | 39 | 0.95 | 0.54 | **1** | 0 | 1 | 0 | partial |
| Antiderivatives and definite integrals | 132 | 36 | 0.89 | 0.73 | **1** | 0 | 3 | 0 | unsupported (coverage) |
| Case analysis and piecewise / absolute value | 81 | 20 | 0.80 | 0.75 | 0 | 0 | 1 | 3 | unsupported (coverage) |
| Cited reasons / rule citation | 61 | 18 | 0.33 | 0.70 | 0 | 7 | 2 | 3 | unsupported |
| Trigonometric identities and equations | 75 | 11 | 0.36 | 0.85 | 0 | 0 | 7 | 0 | unsupported |
| Limits | 145 | 15 | 0.13 | 0.90 | 0 | 0 | 8 | 5 | unsupported |
| Convergence and proof-style arguments | 53 | 0 | — | 1.00 | 0 | 0 | 0 | 0 | unsupported (abstains safely, 47 correct abstentions) |

No family is *supported* by the strict rule, because every family abstains on more than 30% of its cases. Where E7 decides, it is usually right: 758 of its 938 decisions (80.8%) are correct, and there are 2 mathematical false acceptances out of 1,093 cases that should be rejected.

## Capability by principle (selected, evidence-backed)

| Principle | Assessment | Evidence |
|---|---|---|
| Solution-set relation of two single-variable polynomial/rational statements (equivalent / one-way / lost solutions) | **Reliable when decided** | Answer-first transitions (the student-facing kernel): 256 correct of 534, 0 false rejections, 1 false acceptance (malformed input). Abstains outside its exact scope (trig, log and exp equations). |
| Inequality sign handling (negative multipliers, reciprocals, squaring) | Reliable when decided | 0 false accepts, 0 false rejects. 4 misgrades: E7 calls a lost-solution working incomplete. |
| Squaring with candidate check | Reliable mathematically | Credits its own exact elimination even when the student shows no check (5 cases, policy). |
| Polynomial and rational identities | Partial | Correct when the domain bookkeeping lines up. It falsely reports "domain changes" for identical domains in 31 cases, depending on input form. |
| Trigonometric identities | **Incorrect semantics** | True identities reported **invalid** because "rational-polynomial normal forms differ": cos(−x)→cos x, cos²x→(1+cos2x)/2, cos 3x, sum-to-product, cos(2π/3)→−1/2 (8 cases). |
| Log laws on a domain where they hold | Not composed with assumptions | `ln(x²)→2ln x` with `x>0` assumed still "requires stated obligations" (11 cases). |
| Assumptions (nonzero / positive / intervals) | Partial | `nonzero` discharges a cancellation. `positive` does not license log or abs rules. Interval assumptions do not discharge trig poles. a>0, b>0 is not composed into a+b ≥ 0. |
| Restrictions written inside the working ("x ≠ 2") | **Mishandled** | Treated as a solution statement, so the next line "loses solutions" (9 false rejections). |
| Excluded-value obligations | Detected, not enforced | In 8 simplifications E7's own justification says the restriction is unstated, yet it returns verified. |
| Lost solutions in a working | Misclassified | A wrong final answer is graded *incomplete* rather than invalid (18 cases). |
| Derivatives (rules and their compositions) | Good when parsed | Decisive-correct 0.95. Failures come from notation (`sec`, `u'`) and conditional answers. |
| Antiderivatives | Coverage-limited; one unsound acceptance | ln(x²−1)+C is accepted for 2x/(x²−1), although it is undefined on (−1, 1) (CAL-0131). |
| Limits | Mostly unparsed | The final value written with "→" is not read: 53 parser stops on '→', and wrong limits are graded incomplete. |
| Cited reasons | Not represented in natural text | "By the power rule, ∫e^(3x)dx = e^(3x)/3 + C" is verified (7 policy false accepts). |
| Proof-style arguments (series tests, ε–δ, monotone convergence) | Unsupported, safe | 47 of 53 abstain as expected. 0 acceptances of invalid arguments. |
| Malformed or hostile input | Mostly safe; one hole | 9 of 10 abstain. `sqrt(x+1 = 2` is silently repaired and the transition accepted (ADV-0327). |
| Ambiguous notation (1/2x, 6/2(1+2), bare log) | Partly safe | E7 refuses `a/bc` (47 refusals). Bare `log` is read as ln and `sin x^2` as (sin x)² without refusing. |

## Coverage by domain and channel (r1)

| Category | n | Correct (95% CI) | Decided by E7 | Correct when decided |
|---|---|---|---|---|
| ALG algebraic equivalence | 221 | 0.65 (0.59–0.71) | 163 | 0.88 |
| EQN equations / solution sets | 226 | 0.55 (0.48–0.61) | 127 | 0.93 |
| CAL differentiation / integration | 237 | 0.45 (0.39–0.52) | 118 | 0.87 |
| MUL multivariable | 197 | 0.40 (0.34–0.47) | 76 | 0.89 |
| INE inequalities | 182 | 0.37 (0.30–0.44) | 69 | 0.93 |
| DOM domain restrictions | 217 | 0.32 (0.26–0.38) | 109 | 0.60 |
| LIM limits / convergence | 189 | 0.30 (0.24–0.36) | 14 | 0.14 (most correct LIM results are expected abstentions on proof-style tasks) |
| ADV adversarial / cross-domain | 332 | 0.29 (0.24–0.34) | 86 | 0.84 |
| PRF multi-step / proof obligations | 205 | 0.28 (0.23–0.35) | 76 | 0.74 |
| FUN functions / identities | 186 | 0.26 (0.20–0.33) | 70 | 0.69 |
| TRG trigonometry | 190 | 0.11 (0.07–0.16) | 30 | 0.63 |

| Channel | n | Correct | False accepts | False rejects | Abstentions |
|---|---|---|---|---|---|
| Answer-first transitions (student-facing kernel) | 534 | 0.48 | 1 | 0 | 272 |
| Unified engine, natural working | 1,169 | 0.29 | 26 (25 policy) | 27 | 749 |
| Unified engine, symbolic typed route | 679 | 0.40 | 0 | 58 | 308 |

The category and capability-family groupings differ: category is by authoring module, family is by tested invariant.

Coverage per individual principle (371 invariants) is in `results/summary.json` → `by_invariant`.
