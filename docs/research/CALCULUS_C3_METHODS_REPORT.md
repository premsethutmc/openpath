# Calculus C3 Methods Report

## Recommendation

**REVISE.** C3 materially closes C2's largest method-verification gaps and fails closed outside a bounded exact language. It is ready for review as an integration artifact, but it should not yet be described as general symbolic calculus: L'Hôpital currently covers exact finite `0/0` families, partial-fraction integration uses structured term primitives, and the improper/piecewise language is deliberately finite.

## Baseline and M3 status

- Branch: `feat/calculus-methods-c3`
- Base: `feat/calculus-integration-c2` at `74d78e69ed90da3df9e233bb7e72da38f9c1ed27`
- M2 ancestor: `687866ea46ddffcecb0ccee1bb53c681084c465b`
- `feat/math-symbolic-m3` does not exist locally or remotely, and no `MATH_SYMBOLIC_M3_REPORT.md` or executable M3 implementation was found.
- No merge or semantic conflict was therefore involved. C3 extends the C2 exact expression representation and explicitly records the broader symbolic features that still depend on a future M3.

The public API and unified envelope remain unchanged: `assessMathematicalWorking(problem, studentWorking, options)`.

## Architecture

`calculus-methods.ts` is a bounded method verifier that uses C2's expression nodes, normalization, exact differentiation and exact evaluation. It adds typed proof claims rather than a new symbolic engine. The unified dispatcher identifies the new calculus tasks and maps their native evidence into the existing verdict, dependency, restriction, obligation and skill fields.

Each accepted step contains its original expression or statement, derived expression, named rule, exact preconditions, dependencies and any restrictions. The coordinator stops at the first invalid step; a later correct answer cannot repair an earlier invalid method step.

The only shared C2 normalization change combines exact like terms. This is required to prove cancellation in repeated integration by parts and preserves the existing C2 corpus judgments.

## Supported methods

### Substitution

- direct and composite `u` substitutions in the exact expression language;
- independently checked `du/dx`;
- reconstruction of the original integrand from the transformed integrand and Jacobian;
- student-selected substitutions rather than a reference-only substitution;
- transformed definite bounds;
- exact transformed antiderivative and final bound evaluation;
- back-substitution and the indefinite integration constant;
- bounded monotonicity/invertibility proof for definite linear and supported quadratic substitutions.

Missing Jacobians, changed integrands, wrong transformed bounds, unjustified definite substitutions and incorrect back-substitution are rejected at the responsible step.

### Integration by parts

- independent verification of `u`, `dv`, `du` and `v`;
- polynomial × exponential and polynomial × trigonometric families;
- logarithmic integrands when represented as a supported exact parts selection;
- repeated parts applications, where each new integrand must equal the preceding residual `v du`;
- bounded cyclic routes, with the final proposed primitive checked by exact differentiation;
- arbitrary valid student selections within the supported expression language.

### Partial fractions

- polynomial division for improper rational functions;
- exact coefficient identity for distinct linear factors;
- repeated linear factors;
- supported irreducible quadratics;
- denominator exclusions for real linear poles;
- exact termwise primitive rules: logarithms, negative-power primitives and completed-square arctangent coefficients.

The verifier multiplies the decomposition back to the original polynomial identity. It does not accept coefficient agreement inferred from numerical samples.

### L'Hôpital

- finite one- or two-sided problems in the exact `0/0` family;
- original numerator and denominator values checked at the approach point;
- numerator and denominator differentiated independently;
- exact existence and value of the derivative-ratio limit;
- rejection when a quotient is not indeterminate or the derivative ratio is undefined.

General `∞/∞`, repeated L'Hôpital, transformed `0·∞`/`∞−∞`, and broad differentiability-neighborhood proofs remain unsupported.

### Piecewise and improper calculus

- piecewise definite integration with an exact primitive and bound evaluation for every piece;
- exact total across pieces;
- exponential tails;
- `p`-tail convergence and value for `p > 1`;
- interior power-singularity convergence classification for the bounded structured family;
- explicit convergence/divergence rather than a guessed finite result.

## Independent validation

| Area | Cases | Matches | False acceptances | False rejections | First-invalid matches |
|---|---:|---:|---:|---:|---:|
| Substitution | 120 | 120 | 0 | 0 | 120 |
| Integration by parts | 100 | 100 | 0 | 0 | 100 |
| Partial fractions | 100 | 100 | 0 | 0 | 100 |
| L'Hôpital | 80 | 80 | 0 | 0 | 80 |
| Piecewise/improper | 100 | 100 | 0 | 0 | 100 |
| **Total** | **500** | **500** | **0** | **0** | **500** |

The corpus includes alternative valid selections, missing Jacobians, invalid derivatives, wrong bounds, incorrect decompositions, missing method completion, invalid indeterminate forms and execution exhaustion. Labels come from independently authored exact identities and preconditions, not engine output.

SymPy 1.14.0 independently checked 345 applicable verified identities with 0 failures. SymPy is a computational cross-check, not the student-step label source.

## Full regression

```text
/tmp/bun-bin/bun-linux-x64/bun test packages/learning
804 pass, 0 fail, 4195 expectations, 42 files, 11.37 s

PYTHONPATH=. python3 -m unittest discover -s tests
47 pass, 0 fail, 0.117 s

python3 tools/mathematics/calculus-c3/sympy_crosscheck.py
345 checked, 0 failures

/tmp/bun-bin/bun-linux-x64/bun build packages/learning/src/index.ts --outdir /tmp/c3-build-final --target node
181 modules bundled successfully
```

The Bun run includes math-core, geometry integration, U1/U2, worker-pool concurrency/failure coverage, M1, M2, the unchanged 600-case C2 corpus and the new 500-case C3 corpus. No prior expected label was edited.

## Performance and budgets

Warm in-process latency over the 500 C3 cases:

- p50: 0.037 ms
- p95: 0.157 ms
- p99: 0.424 ms
- maximum: 3.546 ms

Budgets remain 64 calculus method steps, 64 KiB typed problem payload, 256 expression nodes through C2 differentiation, 16 unified cross-domain stages, bounded integer powers and acyclic unique dependencies. C3 starts no service or subprocess and executes no student-provided code.

## Unsupported boundary and remaining work

- M3-grade general symbolic equivalence, expansion/factorization and algebraic-function branch analysis are unavailable.
- Substitution monotonicity is proved only for supported linear and single-turn quadratic intervals.
- Partial fractions do not yet cover arbitrary higher-degree irreducible real factors.
- L'Hôpital does not yet cover general infinite forms or repeated applications.
- Cyclic integration by parts accepts a final result only when C2 can prove its derivative exactly; it does not solve unrestricted symbolic cycles.
- Interior singularity support is a structured power family, not arbitrary singular functions.
- General piecewise domains, principal values, special functions and multivariable calculus remain unsupported.

These cases return explicit unsupported or incomplete outcomes. No UI, curriculum, deployment or production behavior changed.
