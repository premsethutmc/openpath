# Mathematics Expansion M2 Report

## Decision

**REVISE.** The branch adds a sound, bounded exact-assessment foundation for the declared M2 subset and preserves all inherited verdicts. It is not yet the full Class 12/IIT-JEE reasoning boundary requested: arbitrary multi-line identity transformations, general symbolic `π` expressions, general induction proofs, and irrational solution sets for radical equations remain explicit gaps.

## Base and architecture

- Branch: `feat/math-domains-m2`
- Base: `integration/math-m1-u2-hardening` at `31e595f9bb0442e6ce57d920eba437337fa4b350`
- M1 source branch inspected: `feat/math-domains-m1`
- No local or remote calculus branch was present when M2 was created.
- Public API remains `assessMathematicalWorking(problem, studentWorking, options)` and contract `openpath-unified-math-assessment@1`.

`domains-m2.ts` extends the existing typed dispatch with rational numbers, normalized algebraic radicals, exact named identities, periodic degree solution sets, finite/infinite sequence results, and explicit domain restrictions. It does not use floating-point equality or string matching for mathematical equivalence. `m2-cross-domain` coordinates up to 16 acyclic M1/M2 stages, stops at the first non-verified stage, carries restrictions and skills, and never permits a later result to repair an invalid premise.

## Coverage matrix

| Area | Implemented exact boundary | Explicitly unsupported or incomplete |
|---|---|---|
| Trigonometry | sin/cos/tan standard-angle values in all quadrants; six named identities; bounded standard-value equations with complete periodic degree sets; tangent restrictions | arbitrary identity expressions and transformation chains; radians and symbolic `π` solution sets; reciprocal functions; general trig equations |
| Exponentials/logarithms | named power/log laws, change of base validity, same-base linear-exponent equations and inequalities, single-log linear-argument equations, base/argument restrictions | mixed bases without an exact reduction; arbitrary nested logs; general transcendental equations |
| Sequences/series | AP/GP terms and finite sums, linear recurrence form, infinite GP convergence and exact sum, base/step status for two induction identities | parsing or proving arbitrary recurrence/induction steps; inference from observed terms; non-geometric infinite series |
| Radicals/surds | exact square/higher-root simplification, rationalization, principal-root semantics, rational-root subset of radical equations with original-equation filtering, bounded nested radicals | irrational radical-equation solution representation; general nested radicals; arbitrary radical transformations |
| Cross-domain | bounded, acyclic staged M1/M2 proof state; trig/algebra, log/inequality, sequence/polynomial, radical/quadratic, and coordinate/trig journeys | semantic substitution between arbitrary expressions; automatic theorem search; calculus |

An unavailable transformation is returned as `unsupported`; capacity bounds return `resource-exhausted`. Neither is mapped to a student error.

## Exact semantics and safeguards

- Rational arithmetic uses normalized `bigint` numerator/denominator pairs.
- Radicals are factored and normalized exactly; like terms combine structurally.
- `sqrt(x²)` is represented as `|x|` unless a nonnegative assumption is supplied.
- Radical-equation candidates are substituted into the original equation to remove extraneous rational roots.
- Exponential inequality direction accounts for both a decreasing base and a negative linear coefficient.
- Infinite GP sums require `|r| < 1`.
- Periodic trig results distinguish a base set from its period.
- Work is bounded to 64 native steps, 16 cross-domain stages, 10,000 sequence terms, root indices 2–8, bounded integer radicands, a 64 KiB problem representation, and inherited worker/proof limits.
- Dependency references must be backward and cross-domain stage dependencies must be unique and acyclic.

## Independent validation

The reproducible corpus contains 600 labelled cases:

| Area | Cases | Verdict matches | False acceptances | False rejections | First-invalid matches |
|---|---:|---:|---:|---:|---:|
| Trigonometry | 120 | 120 | 0 | 0 | 120 |
| Exponentials/logarithms | 120 | 120 | 0 | 0 | 120 |
| Sequences/series | 120 | 120 | 0 | 0 | 120 |
| Radicals/surds | 120 | 120 | 0 | 0 | 120 |
| Cross-domain | 120 | 120 | 0 | 0 | 120 |
| **Total** | **600** | **600** | **0** | **0** | **600** |

The corpus includes verified alternatives, invalid identities/results, missing work, unsupported boundaries, and resource exhaustion. These figures describe this bounded corpus, not general precalculus accuracy. SymPy 1.14.0 independently cross-checked 190 applicable exact symbolic results with 0 failures. The remaining cases use independently authored formula/domain oracles and are not labelled from engine output.

Defects found during validation and fixed:

- simplified surds could compare unequally because one canonical form retained an empty radical array;
- quadrant signs for third- and fourth-quadrant trig values were wrong;
- an inequality with a negative exponent coefficient did not reverse direction;
- negative even-root domains could become malformed rather than unsupported;
- the initial radical-equation generator treated absence of integer roots as absence of exact roots. The supported corpus now uses equations with independently checkable rational roots.

## Regression and performance

Commands and actual results:

```text
/tmp/bun-bin/bun-linux-x64/bun test packages/learning
792 pass, 0 fail, 3106 expectations, 37 files, 11.52 s

PYTHONPATH=. python3 -m unittest discover -s tests
47 pass, 0 fail, 0.125 s

python3 tools/mathematics/m2/sympy_crosscheck.py
190 checked, 0 failures (SymPy 1.14.0)
```

The learning-package run includes math-core, U1/U2, the 250-case U2 corpus, 400 M1 cases, 100 M1 mixed journeys, geometry-worker concurrency/fault tests, and the new 600 M2 cases. Geometry G2–G4 remains independently green.

For 480 native M2 assessments in the representative container: p50 0.009 ms, p95 0.058 ms, p99 0.302 ms, maximum 1.646 ms. These are in-process warm measurements and are not production latency claims. M2 introduces no new worker process and leaves the hardened geometry pool unchanged.

## Files

- `packages/learning/src/domains-m2.ts`: exact M2 representation and reasoner.
- `packages/learning/src/unified-math-engine.ts`: public-API dispatch and bounded cross-domain coordinator.
- `packages/learning/src/domains-m2.test.ts`: 480-case native corpus and adversarial boundary checks.
- `packages/learning/src/domains-m2-cross.test.ts`: 120 cross-domain journeys.
- `tools/mathematics/m2/`: reproducible corpus generator, evaluator, SymPy cross-check, and recorded results.

## Remaining blockers

Before this should be called a broad advanced-algebra/precalculus assessment engine, the structured step language needs exact operations for intermediate trig/log/radical transformations, symbolic `π` angle sets, general exact algebraic-number roots, and proof-carrying induction steps. Those additions should extend this representation and preserve refusal semantics; they should not add a second symbolic engine. Calculus was intentionally untouched.
