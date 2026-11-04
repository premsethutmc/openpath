# OpenPath B3 Complex Numbers and Polynomial Roots

## Recommendation

**MERGE READY for the bounded exact families documented here.** B3 uses the existing unified API, D1 sequence semantics, and an independent U4 checker. The recommendation does not claim general complex analysis, arbitrary symbolic polar conversion, or general polynomial solving.

## Architecture

B3 adds two internal modules:

- `complex-polynomial.ts` adapts typed B3 problems and student steps to the existing unified assessment envelope. It enforces ordered, acyclic dependencies, the 64-step budget, first-invalid-step behavior, and fail-closed outcomes.
- `complex-kernel.ts` is the independent checker `openpath-proof-kernel-complex@1`. It recomputes supported results with normalized BigInt rationals and exact finite rules. The adapter cannot accept a step unless this checker returns `verified`.

`unified-math-engine.ts` dispatches `complex-polynomial` problems through `assessMathematicalWorking(problem, studentWorking, options)`. B3 was also added to the existing explicit cross-domain stage union. No second public API, symbolic engine, learner model, or execution service was created.

## Representation and exactness

The typed representation includes Cartesian complex numbers, unordered finite complex solution sets, exact scalars, exact radical magnitudes, exact rational multiples of pi in polar values, integer multiplicities, and Boolean theorem claims. Problems explicitly state their area, task, coefficient domain, data, and assumptions. Steps contain stable IDs, rule identifiers, results, dependencies, and optional assumptions.

Exact rational strings are normalized before comparison. Complex solution sets are compared without depending on root order. Floating-point equality and numerical sampling never authorize a verdict.

The implementation distinguishes the real and complex coefficient domains, nonzero denominators, principal arguments, full `2pi` argument periodicity, and finite root sets. The bounded IR does not silently reuse real logarithm or radical identities in the complex domain.

## Supported operations

### Cartesian complex arithmetic

- addition, subtraction, multiplication, division, reciprocal, and equality;
- powers of `i` for bounded integer exponents;
- conjugation and extraction of real and imaginary parts;
- modulus squared and exact radical-form modulus;
- conjugate rationalization with an explicit nonzero-denominator obligation.

### Polar form and arguments

- principal arguments for axis-aligned points and the four exact 45-degree diagonal rays;
- Cartesian-to-polar conversion for those exact arguments;
- polar multiplication and division with exact rational radii;
- bounded integer De Moivre powers;
- exact roots of unity for orders 1, 2, and 4.

The principal argument is kept separate from the full argument family with period `2pi`. Arbitrary inverse-trigonometric angle discovery is unsupported.

### Polynomial roots

- exact proposed-root substitution and the factor theorem;
- exact remainders at proposed complex values;
- root multiplicity by bounded exact derivative checks;
- quadratic Vieta sum and product;
- conjugate-root theorem only for explicitly real coefficients;
- exact imaginary quadratic roots when the negative discriminant has a supported exact rational square root;
- supported polynomial degrees through 8 for verification.

B3 prioritizes verification of proposed roots and factorizations. It does not claim a general cubic, quartic, or arbitrary-degree solver, and it makes no claim that arbitrary roots have elementary radical forms.

### Complex-plane geometry

- exact squared-distance-backed radical distance;
- vector translation through complex addition;
- quarter-turn rotation through multiplication by `i`;
- reflection in the real axis through conjugation;
- exact unit-circle membership.

These tasks reuse the existing typed cross-domain envelope. No fact is inferred from a drawing.

## U4 verification and alternative routes

The U4 extension independently checks Cartesian arithmetic, conjugate rationalization, polar arithmetic, De Moivre, root substitution, factor/remainder theorems, Vieta relationships, quadratic roots, and supported complex-plane geometry. Each verified assessment exposes the checker version and its operation trace.

Method labels permit the bounded alternatives supported by the actual mathematics, including Cartesian versus polar multiplication, conjugate rationalization, direct substitution versus factor theorem, Vieta versus direct coefficient relationships, and algebraic versus complex-plane interpretations. Exact equivalent rationals and different root-set orderings are accepted. Unknown proof families return unsupported.

Dependencies are validated before mathematical checking. A later correct line cannot repair an earlier invalid line. The first rejected mathematical step is reported as the first invalid step.

## Independent validation

The reproducible B3 corpus contains **400 independently labelled cases**, 100 per requested category. The first **100** cases were frozen before tuning.

| Outcome | Cases |
|---|---:|
| Verified | 220 |
| Invalid | 80 |
| Missing assumption | 20 |
| Unsupported | 40 |
| Resource exhausted | 40 |

Results:

- exact classification agreement: **400/400**;
- false acceptances: **0**;
- false rejections: **0**;
- first-invalid-step agreement: **400/400**;
- verified cases carrying `openpath-proof-kernel-complex@1`: **220/220**.

Focused adversarial tests additionally cover root-set order independence, equivalent rational spellings, division by zero, incorrect argument quadrants, missing roots of unity, wrong root multiplicity, absent real-coefficient assumptions, a correct final line after an invalid line, and an unsupported principal-complex-square-root family.

The corpus and generator are in `tools/mathematics/complex-b3/independent-cases.v1.json` and `generate_cases.py`.

## Exact oracle cross-checks

SymPy 1.14.0 independently cross-checked **200/200** exact cases:

- 50 Cartesian arithmetic and conjugation cases;
- 50 exact polar, De Moivre, and roots-of-unity identities;
- 50 polynomial substitution, factor, multiplicity, and Vieta invariants;
- 50 complex-plane distance, translation, rotation, and reflection cases.

The cross-check uses exact SymPy expressions rather than decimal sampling. Results are recorded in `tools/mathematics/complex-b3/exact-oracle-results.v1.json`. It supplements the independently authored step labels and is not the runtime verdict source.

## Regression results

- Full learning and unified mathematics suite: **823 passed, 0 failed, 6,432 assertions, 0 skipped** across 50 files.
- Focused B3 suite within that run: **2 passed, 0 failed, 413 assertions**.
- Geometry G2-G4 Python suite: **47 passed, 0 failed**.
- Node-target package build: passed, 188 modules bundled.
- Existing worker-pool concurrency, cancellation, crash, saturation, and shutdown tests passed inside the full suite.
- B2, B1, D1, U4, U3, M3, M1/M2, C2/C3, geometry, teaching, and unified-engine tests remained green.

No prior mathematical rule or expected verdict was changed.

## Performance and resource limits

Warm local measurements over 4,400 verified unified-API assessments:

| Area | Samples | p50 ms | p95 ms | p99 ms |
|---|---:|---:|---:|---:|
| Cartesian arithmetic | 1,000 | 0.0043 | 0.0175 | 0.0361 |
| Polar | 1,200 | 0.0041 | 0.0098 | 0.0396 |
| Polynomial | 1,000 | 0.0061 | 0.0209 | 0.0518 |
| Geometry | 1,200 | 0.0032 | 0.0055 | 0.0250 |

Explicit limits include 64 submitted steps, polynomial degree 8, De Moivre exponent magnitude 32, `i` exponent magnitude 10,000, finite exact root enumeration, and fixed bounded polar branches. A 65-step proof returns resource exhausted. The checker performs no unrestricted polynomial solving, expansion, polar search, or numerical approximation.

## Unsupported mathematical families and remaining risks

1. Arbitrary Cartesian-to-polar arguments requiring general inverse trigonometry are unsupported.
2. Roots of unity other than orders 1, 2, and 4 and general nth roots are not yet represented.
3. General complex square roots, multivalued radicals, complex logarithms, and branch-cut analysis are unsupported. In particular, B3 does not assert `sqrt(z^2) = z`.
4. General symbolic complex coefficients, parameter-dependent roots, and unrestricted cubic/quartic/general polynomial solving are unsupported.
5. Polynomial factorization is verified through proposed roots and exact evaluation; B3 does not discover arbitrary factorizations.
6. The geometry subset covers coordinate/vector interpretations listed above, not arbitrary loci, rotations by arbitrary angles, or diagram interpretation.
7. U4 traces record the exact task and rule used, but the current result-oriented certificate does not serialize every primitive BigInt operation as a separate proof node.
8. The validation corpus is reproducible and independently labelled but remains an engineering benchmark, not proof of complete school or IIT-JEE complex-number coverage.

Within this precise boundary, B3 preserves exact complex-domain semantics, accepts supported alternative methods, identifies the earliest invalid step, and fails closed for unsupported mathematics.
