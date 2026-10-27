# Calculus C2 Integration Report

## Recommendation

**REVISE.** C2 provides a sound bounded calculus core through the existing unified API, with exact verification and explicit refusal outside its boundary. It is suitable for further controlled engineering evaluation, but it does not yet cover every requested Class 12 calculus method. In particular, general L'Hôpital proofs, arbitrary substitution/bounds transformations, arbitrary integration-by-parts derivations, general rational integration, and broad piecewise/improper cases remain unsupported.

## Repository and C1 inventory

- Branch: `feat/calculus-integration-c2`
- Base: `feat/math-domains-m2` at `687866ea46ddffcecb0ccee1bb53c681084c465b`
- No local or remote `research/calculus-reasoner` branch existed at audit time.
- Existing calculus artifacts were question families in `families.ts` and `fam/b18.ts`, sampled expression/antiderivative answer checks in `answer-types.ts`, curriculum records, and generators. These generate useful problems but do not constitute a step-level calculus reasoner. C1 was therefore specified, not implemented.
- C2 reuses the unified envelope, M1/M2 stage coordinator, exact rational convention, proof dependencies, restrictions, skills, resource outcomes, and public `assessMathematicalWorking(...)` entry point.

## Implementation

`calculus-core.ts` adds a typed, bounded expression IR for exact rational constants, variables, sums, products, integer powers, sine, cosine, exponential and logarithmic expressions. The core uses structural normalization and exact rational arithmetic; it does not use numerical sampling as proof.

### Differentiation

Implemented:

- constant, power, sum and difference rules;
- generalized product rule and quotient forms represented by negative powers;
- chain rule;
- sine, cosine, exponential and logarithmic derivatives;
- bounded higher derivatives;
- a circle-template implicit derivative;
- piecewise differentiability at a join using exact value and one-sided derivative equality;
- locally justified intermediate derivative steps and a required final derivative of the requested expression.

Restrictions supplied by the typed problem are preserved in the assessment. General implicit systems, inverse trig derivatives and arbitrary branch analysis are unsupported.

### Integration

- An indefinite antiderivative is accepted only when exact differentiation reconstructs the integrand.
- An arbitrary integration constant is mandatory. Connected-domain component metadata is preserved.
- This verification accepts alternative correct primitives, including supported substitution and parts results, without prescribing one route.
- Definite integrals require a verified antiderivative followed by exact `F(upper) - F(lower)` evaluation.
- The supported improper family is `∫₀∞ exp(-a x) dx = 1/a` for exact positive rational `a`, with its structural preconditions checked.

The engine does not yet validate every intermediate change-of-variable equation or transformed bound as a separate typed obligation. Broad partial fractions, trig integrals, general improper integrals and disconnected-domain constant relationships are unsupported.

### Limits, continuity and differentiability

Implemented bounded families:

- direct substitution for exact algebraic expressions;
- difference-of-squares removable singularities, with the cancellation shape independently checked;
- `sin(kx)/x` at zero;
- one-sided reciprocal limits and two-sided nonexistence;
- rational limits at infinity for structurally established polynomial degrees/leading coefficients;
- exact piecewise continuity and differentiability at a join.

No numerical sampling establishes a limit. L'Hôpital, general squeeze arguments, broad indeterminate forms, and logarithmic one-sided limits currently return `unsupported`.

## Step evidence and safety

Each assessment retains first invalid step, local justification, dependencies, restrictions, outstanding obligations, completion, skills and reasoner version. Invalid, incomplete, unsupported, malformed and resource-exhausted remain distinct. Correct later work cannot repair an earlier invalid stage.

Limits include 64 calculus steps, 256 expression nodes, 64 KiB typed problems, 16 cross-domain stages, acyclic unique dependencies, bounded integer powers, and inherited geometry-worker limits. No student code, shell command or dynamically evaluated expression is executed.

## Independent validation

| Category | Cases | Matches | False acceptances | False rejections | First-invalid matches |
|---|---:|---:|---:|---:|---:|
| Differentiation | 150 | 150 | 0 | 0 | 150 |
| Indefinite integration | 150 | 150 | 0 | 0 | 150 |
| Definite/improper integration | 100 | 100 | 0 | 0 | 100 |
| Limits/continuity | 150 | 150 | 0 | 0 | 150 |
| Calculus/algebra cross-domain | 50 | 50 | 0 | 0 | 50 |
| **Total** | **600** | **600** | **0** | **0** | **600** |

Cases include correct, invalid, incomplete, unsupported, missing-constant, wrong-bound, singular, discontinuous and exhausted work. Labels are produced by independently authored closed-form rules, not copied from engine output. These results establish accuracy only within the recorded bounded corpus.

SymPy 1.14.0 independently cross-checked 390 applicable verified derivative, integral and limit results: 390 passed, 0 failed. SymPy was not used as the sole oracle for student-step verdicts.

## Regression results

```text
/tmp/bun-bin/bun-linux-x64/bun test packages/learning
798 pass, 0 fail, 3675 expectations, 40 files, 11.39 s

PYTHONPATH=. python3 -m unittest discover -s tests
47 pass, 0 fail, 0.122 s

python3 tools/mathematics/calculus/sympy_crosscheck.py
390 checked, 0 failures
```

The Bun run includes math-core, U1/U2, M1, M2, mixed-domain, geometry-worker concurrency/failure tests, the 600 C2 cases, and focused calculus invariants. Previously supported verdict suites remain unchanged.

## Performance

Warm in-process latency across 550 native cases:

- p50: 0.018 ms
- p95: 0.084 ms
- p99: 0.238 ms
- maximum: 1.988 ms

These are representative-container measurements, not production latency claims. Calculus adds no subprocess or service.

## Exact supported boundary and blockers

Mathematically supported now: bounded elementary differentiation, antiderivative verification, polynomial-style definite integration through FTC, one exponential improper family, selected exact limits, join continuity/differentiability, and staged calculus/M1/M2 proofs.

Still required before broad learner use:

1. typed substitution and bound-change obligations;
2. typed integration-by-parts intermediate identities;
3. exact partial-fraction decomposition and broader rational integrals;
4. checked L'Hôpital preconditions and transformations;
5. richer piecewise, domain-component and branch semantics;
6. general implicit differentiation and supported inverse-trig rules;
7. a larger externally authored corpus with varied handwritten student routes.

Unsupported work is refused rather than guessed. No UI, deployment, production behavior or calculus content was changed.
