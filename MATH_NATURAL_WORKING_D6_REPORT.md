# OpenPath D6 — Natural Working Coverage Completion and Generalization

## Decision

**REVISE.** The bounded D6 adapters are sound and materially improve coverage, but the sealed holdout exposed a five-case generalization gap in derivative notation. No holdout-driven tuning was performed. The implementation is suitable for review as an incremental integration branch, but the stated broader coverage objective is not complete.

## Baseline and frozen data

D6 is based on `feat/math-natural-working-d5` at `f867b2f43ecefd6c0e1cde3310eead1c9f1ba6f3`. The public entry point remains `assessMathematicalWorking(problem, studentWorking, options)`. D1–D3 coordination, M3 exact symbolic assessment, and U4 replay checking remain the verification boundary.

The original D4 benchmark SHA-256 remains `3dad06d2fa23b9f0fe56e04a0b1ebcce28b449ef82d99bbcf559a09a500f14e5`. Before changing adapters, D6 froze 150 accessible development cases and 50 sealed holdout cases:

- Development SHA-256: `7e490acff84fbececbf1d7070b2d3a562242e7834d5023b21fc8a618c26939b7`
- Holdout SHA-256: `bdd531181f73949729497ebd8fd495a8968f338c710819720472dbfa3c73f4bc`

The D5 baseline on the accessible set was 70/150 verified: vector 20/20, determinant 20/20, derivative 15/15, probability complement 15/15; geometry, symbolic substitution, and prior-bound function evaluation were 0/80. There were 80 false rejections and zero false acceptances.

## Inventory of the 50 D5 unsupported cases

The case-by-case inventory is in `tools/mathematics/natural-working-d6/d5-remaining-inventory.v1.json`.

| Blocker | Cases | Resolution |
|---|---:|---|
| Geometry measurement lacked typed-object/given/nonzero propagation | 20 | Match a typed segment, exact length fact, nonzero condition, and typed squared-length goal before converting the scalar consequence |
| Symbolic value from a prior line was not substituted into a typed expression | 15 | Exact scalar binding plus structural formula match, typed substitution, then M3/U4 verification |
| Function argument established on a prior line was not resolved | 15 | Scoped exact binding resolution before the existing function-to-symbolic conversion |

These rules are based on mathematical types and structures. No benchmark IDs or literal answers occur in dispatch code.

## Adapter architecture and mathematical preservation

D6 extends the existing adapter contract rather than adding another parser or reasoner:

1. The natural parser preserves raw text, line number, and character span.
2. The adapter validates the destination problem and converts only a recognized typed structure.
3. Geometry conversion requires an explicit segment object, exact given length, nondegeneracy condition, and matching typed goal. A drawing or name alone establishes nothing.
4. Symbolic substitution accepts only an exact scalar binding and a formula structurally identical to the typed source expression.
5. Function evaluation resolves exact prior bindings while preserving the declared function input and coefficients.
6. Converted mathematics returns to the existing M3/domain reasoner and U4. Conversion evidence is not treated as proof.
7. Unsupported, missing-assumption, ambiguous, malformed, and resource-exhausted results remain distinct.

A small parser generalization recognizes explicitly written function equations with ordinary identifier names. It does not add an expression tree and does not change operator semantics. Determinant notation accepts both `det(M)` and `|M|` through the same typed matrix adapter.

## Original frozen 300-case benchmark

| Classification | D5 | D6 |
|---|---:|---:|
| Verified | 200 | 250 |
| Incomplete | 20 | 20 |
| Unsupported | 50 | 0 |
| Ambiguous | 10 | 10 |
| Malformed | 20 | 20 |

All 200 D5 verified cases remained verified. D6 newly verified 50: geometry measurement 20, typed symbolic substitution 15, and bound function evaluation 15. False acceptances: 0. False rejections within the benchmark's supported labels: 0. Source locations and downstream proof evidence were retained.

## Unseen generalization

Accessible development benchmark:

- D5 baseline: 70/150 verified
- D6: 150/150 verified
- Newly verified: 80
- False acceptances: 0
- False rejections: 0
- Expected first-invalid-step agreement: 150/150
- Measured latency: p50 0.178 ms, p95 0.768 ms

One-time sealed holdout evaluation:

- Verified: 45/50
- False acceptances: 0
- False rejections: 5
- Expected first-invalid-step agreement: 50/50
- Measured latency: p50 0.323 ms, p95 1.280 ms

The 45 verified holdout cases cover geometry measurement, nested exact substitution, bound function arguments, vectors, and determinant-bar notation. The five rejected valid cases all use derivative notation such as `g'(t)`. The parser's existing derivative recognizer is still specialized to the supported `f'` spelling. The holdout was not used for further tuning.

## Adversarial and oracle validation

The independently authored adversarial corpus contains 150 cases across invalid symbolic substitution, function evaluation, differentiation, missing integration constants, vectors, determinants, singular inverses, complex modulus, probability, geometry assumptions, cross-domain substitution, ambiguity, malformed LaTeX, and resource exhaustion.

- False mathematical acceptances: 0/150
- Exact outcome-category matches: 140/150
- Invalid outcomes: 90/90 localized to step 0
- The ten category mismatches are limit strings classified `malformed` rather than the expected `unsupported`; none was mathematically accepted.

Independent SymPy exact checks: 100/100 passed across substitution, determinants, derivatives, and function evaluation. SymPy was an oracle for exact calculations, not the source of adapter verdicts.

## Regression and operational results

Commands and results:

- `bun test packages/learning`: **848 passed, 0 failed**, 8,850 assertions across 55 files.
- `PYTHONPATH=. python3 -m unittest discover -s tests` in `research/geometry-reasoner`: **47 passed, 0 failed**.
- `bun run build` in `frontend`: passed; production assets built.
- Focused D5/D6 compatibility: **8 passed, 0 failed**.

The full suite includes the D5/D4 natural-working tests, D3/D2/D1, U4/U3, B1–B3, M1–M3, C2/C3, worker-pool fault tests, and the repository's learning tests. D5's expected `unsupported` outcome remains unchanged when a geometry problem supplies no typed geometry object at all; D6 returns `missing-assumption` only after a relevant typed segment exists but required facts are absent.

## Resource bounds

Existing limits remain authoritative: 8,192 input characters, 64 nonblank lines, 2,048 tokens, bounded parse depth, bounded symbolic expression/proof size, and existing domain reasoner budgets. D6 adds no retry loop or unbounded adapter recursion. Substitution walks the bounded exact expression IR once. Resource failures remain explicit and do not become student mistakes.

## Remaining limitations

- Natural derivative notation is not generalized to arbitrary function identifiers; five sealed cases using `g'(t)` remained malformed.
- The original 300 cases are a bounded integration benchmark. Zero remaining unsupported cases there does not imply all natural notation for the underlying domains is supported.
- Geometry conversion currently covers explicit segment-length-to-squared-length reasoning only; broader geometry remains available through structured inputs.
- Symbolic prior-line binding is restricted to exact scalar assignments and one structurally matching typed formula. Conditional, vector-valued, and branch-valued substitutions remain outside this adapter.
- Natural definite integration, general matrix expressions, richer probability assumptions, and broad trig solution notation still depend on D5's bounded adapters or structured inputs.
- Ten adversarial limit strings are rejected at parsing as malformed rather than reaching an unsupported calculus outcome.

No UI, solver, proof checker, merge, or deployment change was made.
