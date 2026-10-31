# OpenPath D5 — Natural Working Domain Integration

## Recommendation

**REVISE before enabling all advertised domains; MERGE READY for the bounded adapters documented here.** D5 delivers a large, sound improvement on the unchanged D4 corpus, but it does not yet provide lossless natural-input adapters for every method already represented by OpenPath.

## D4 baseline inventory

The original 300-case D4 benchmark remains byte-for-byte unchanged at SHA-256 `3dad06d2fa23b9f0fe56e04a0b1ebcce28b449ef82d99bbcf559a09a500f14e5`.

D4 classified 60 verified, 20 incomplete, 190 unsupported, 10 ambiguous and 20 malformed. The case-by-case inventory is stored in `tools/mathematics/natural-working-d5/d4-unsupported-inventory.v1.json`.

| Blocker | Cases |
|---|---:|
| Missing parser-to-domain adapter | 50 |
| Missing typed IR conversion | 90 |
| Missing mathematical/geometric assumptions | 20 |
| Missing cross-domain proof certificate/binding | 30 |

The 190 cases comprise 20 function evaluations, 40 calculus claims, 20 vector additions, 15 determinants, 15 complex moduli, 30 probability/statistics calculations, 20 ungrounded geometric-measurement substitutions and 30 mixed-domain substitutions.

## Common adapter contract

`openpath-natural-domain-adapter@1` returns exactly one of:

- converted;
- unsupported construct;
- missing assumption;
- ambiguous representation;
- invalid mathematical type;
- resource exhausted.

A successful conversion contains the destination typed problem and working, source-line mapping, destination reasoner, exact conversion checks, assumptions, restrictions, obligations and optional typed outputs. Conversion itself never sets a mathematical verdict. `assessMathematicalWorking` recursively sends the typed payload through the existing reasoner.

The adapter performs bounded structural conversion only. It does not numerically approximate expressions, solve new problems, or infer unstated geometry.

## Implemented adapters

| Natural notation | Typed destination | Verification boundary |
|---|---|---|
| Polynomial function definition and exact evaluation | Existing `Expr` symbolic problem/step | M3 plus independent U4 certificate checking |
| First derivative claim | Existing `CalculusProblem`/`CalculusStep` | C2 exact derivative verifier |
| Indefinite integral and explicit `+ C` | Existing calculus IR | Exact differentiation of the proposed primitive and constant check |
| Vector addition/subtraction | Existing B2 `LAProblem`/`LAStep` | Linear-algebra U4 kernel |
| Determinant claim | Existing B2 IR | Linear-algebra U4 kernel |
| Cartesian complex modulus | Existing B3 `ComplexProblem`/`ComplexStep` | Complex U4 kernel |
| Probability complement | Existing B1 problem/step | Exact rational probability kernel |
| Arithmetic mean | Existing B1 statistics problem/step | Exact rational statistics kernel |

The adapters verify that definitions and operands agree with the typed problem before conversion. Matrix shape, vector dimensions, exact rational values, calculus variables, integration-constant presence, complex Cartesian components and probability/statistical data survive conversion.

## Domain and assumption preservation

Function evaluation substitutes an exact rational into the parsed polynomial and asks M3/U4 to verify the written result. Calculus adapters retain the original variable and compare the written integrand to the typed integrand before assessment. The indefinite-integral adapter records whether `C` was actually written.

Linear-algebra and complex adapters preserve native dimensions, shapes, exact components and branch-specific value kinds. Probability/statistics adapters retain exact rational data and allow the native reasoner to enforce assumptions. Type mismatches return unsupported conversion rather than a mathematical-error verdict.

## D2/D3 integration

D2 stages already invoke the unified API, so a stage may now contain natural working while retaining the 30-stage proof-state bound and first-invalid-step mapping.

D3 can export a value produced by a successful natural adapter through the explicit `$conversion` path. The export is accepted only when:

1. its original natural source line matches the declared proof-step identifier;
2. the corresponding assessment step is verified;
3. the adapter exposed an exact typed output;
4. assumptions, restrictions and obligations are discharged; and
5. the existing D3 binding kernel accepts the type and scope.

An end-to-end test evaluates `f(3)=10` through M3/U4, exports the verified exact scalar, and uses it in a B2 vector scalar multiplication. Parser output alone cannot become a binding.

## Original benchmark: before and after

| Classification | D4 | D5 |
|---|---:|---:|
| Verified | 60 | 200 |
| Incomplete | 20 | 20 |
| Unsupported | 190 | 50 |
| Ambiguous | 10 | 10 |
| Malformed | 20 | 20 |

- Previously verified cases still verified: **60/60**.
- Previously unsupported cases now independently verified: **140/190**.
- Previously unsupported and still unsupported: **50/190**.
- False mathematical acceptances: **0**.
- False mathematical rejections: **0** on supported independently labelled cases.

Newly verified cases by adapter:

| Adapter | Cases |
|---|---:|
| Function evaluation | 20 |
| Derivative | 20 |
| Indefinite integral | 20 |
| Vector addition | 20 |
| Probability complement | 15 |
| Arithmetic mean | 15 |
| Determinant | 15 |
| Complex modulus | 15 |

Every result record names its adapter, destination reasoner and assessment evidence in `final-results.v1.json`.

## Remaining unsupported cases

Twenty geometry cases state `AB = 5` without a typed segment object, construction, or verified geometric measurement premise. Treating the letters as an algebraic scalar would discard geometric identity and hypotheses, so these remain unsupported.

Thirty mixed-domain cases are raw assignment/substitution sequences without an existing typed D3 problem, symbol scopes or declared exports/imports. D5 supports natural working inside a properly declared D3 journey but does not invent that journey from text.

Other capabilities already present in the engines but not yet adapted from natural notation include trigonometric solution families, function composition/inverses, definite integrals, substitution and parts syntax, limits, general matrix operations and systems, conjugation/polar complex notation, conditional probability, distributions, coordinate geometry and structured Euclidean proofs.

## Independent adversarial validation

The 150 independently labelled cases cover incorrect identities, missing periodic branches, logarithmic-domain restrictions, incorrect derivatives, missing integration constants, dimension mismatches, singular inverses, invalid conjugation, probability assumptions, unsupported geometry, incorrect cross-domain substitutions, later-correct answers after an early error, ambiguity, malformed input and valid adapter cases.

- Classification agreement: **150/150**.
- False acceptances: **0**.
- False rejections: **0**.
- First-invalid-step accuracy: **50/50** for cases with an identifiable mathematical error.
- Unsupported and missing-assumption outcomes remained distinct from invalid mathematics.

SymPy 1.14 independently cross-checked 120 exact function, derivative, integral, vector, determinant and complex-modulus calculations: **120/120 passed**. SymPy was not used to create adapter verdicts.

## Regression results

- Bun learning/unified suite: **844 passed, 0 failed**, 8,691 assertions across 54 files.
- Geometry G2–G4 suite: **47 passed, 0 failed**.
- Frontend production bundle: passed.
- D4 frozen corpus, D3 bindings, D2/D1, U4, B1/B2/B3, M1/M2/M3 and C2/C3 suites remain green.
- Existing structured-input assessment behavior is unchanged.

## Performance and resource limits

Warm end-to-end measurements, 500 assessments per workload:

| Adapter | p50 ms | p95 ms | p99 ms |
|---|---:|---:|---:|
| Function/M3/U4 | 0.090 | 0.342 | 0.890 |
| Derivative | 0.036 | 0.092 | 0.132 |
| Integral | 0.033 | 0.070 | 0.105 |
| Vector | 0.015 | 0.055 | 0.142 |
| Determinant | 0.015 | 0.048 | 0.124 |
| Complex modulus | 0.021 | 0.071 | 0.124 |
| Probability | 0.012 | 0.046 | 0.121 |
| Unsupported dispatch | 0.0069 | 0.014 | 0.053 |

D4 input/token/depth limits remain active. Adapters make one bounded dispatch attempt, use bounded polynomial degree and existing domain limits, and do not retry across reasoners. D2/D3 stage, binding, graph and substitution budgets remain unchanged.

## Conclusion

D5 meets the primary success metric with **140 newly verified cases** and no false acceptances. Its architecture is suitable for incremental adapters because conversion evidence and proof verification remain separate. The recommendation remains **REVISE** for broad natural-input enablement until the remaining engine capabilities receive similarly lossless adapters.
