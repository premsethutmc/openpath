# Mathematics Domains M1

## Recommendation

**REVISE pending unified integration.** The structured M1 reasoner is sound on
its stated exact boundary and passes 400 independently labelled domain cases.
The required 100 mixed-domain cases belong to the integration branch and are
not counted here. Irrational-boundary inequalities and arbitrary function
transformations remain explicitly unsupported.

## Branch and architecture

- Branch: `feat/math-domains-m1`
- Base: `feat/math-core` at `93127dd709358982b923c05797405ec0aa539364`
- Contract: `openpath-math-domains-m1@1`

M1 adds `assessDomainWorking(problem, working)`. Problems and student claims are
typed structures. Exact rational arithmetic uses normalized `bigint` fractions;
there is no floating-point sampling. The implementation is independent of the
geometry worker and does not alter existing math-core rules.

## Implemented boundary

### Inequalities

- Linear inequalities with correct open/closed boundaries and sign outcomes.
- Intersections of compound inequalities.
- Quadratic polynomial sign charts when critical points are rational.
- Rational inequalities with exact denominator exclusions.
- Exact interval-set comparison prevents a correct endpoint with the wrong
  inclusion or an excluded denominator from being accepted.

Irrational critical points and degree above two return `unsupported`.

### Quadratics

- Exact equations with rational coefficients.
- Factored, completed-square, formula-coefficient, equivalent-equation, and root
  claim routes.
- Repeated roots, no-real-root results, rational roots, and canonical exact
  radical formula forms.
- Extra or missing roots are invalid; completing-square transformations are
  checked through exact solution-set equivalence.

### Functions

- Polynomial, rational, and piecewise evaluation.
- Composition at an exact input.
- Polynomial and rational preimages with denominator exclusions.
- Rational-function domain exclusions.

General symbolic function equality, piecewise inverse relations, and arbitrary
domain-aware function transformations are unsupported.

### Coordinate geometry

- Exact distance (rational or canonical radical), midpoint, and slope.
- Line construction, normalized line-equation equivalence, and intersections.
- Parallel/perpendicular classification.
- Circle point membership from exact squared distance.

Coincident/parallel line intersections return unsupported rather than selecting
an arbitrary point. General conic intersections are outside M1.

## Independent validation

The Python fixture generator uses direct formulas, theorem definitions, and
exact fractions as its oracle; expected labels are not engine output.

| Domain | Cases | Mismatches | Unsupported | Mean |
| --- | ---: | ---: | ---: | ---: |
| Inequalities | 100 | 0 | 5 | 0.0616 ms |
| Quadratics | 100 | 0 | 0 | 0.0341 ms |
| Functions | 100 | 0 | 0 | 0.0130 ms |
| Coordinate geometry | 100 | 0 | 0 | 0.0107 ms |

- Final-verdict mismatches: **0/400**
- First-invalid-step matches: **400/400**
- False acceptances: **0**
- False rejections: **0**
- Unsupported: **5** (declared cubic inequality cases)
- Resource exhaustion: **0** in the bounded corpus
- Domain-preservation failures: **0**

Cases include alternative quadratic representations, endpoint errors,
extraneous roots, rational exclusions, piecewise branches, invalid coordinate
claims, incomplete working, and unsupported operations.

## Regression

`bun test packages/learning`: **771 passed, 0 failed** across 31 files. This is
the 770-test math-core baseline plus the M1 corpus test. No existing expected
label was changed.

## Remaining integration work

The M1 contract must be adapted into the U2.1 assessment envelope without
changing either reasoner. The integration phase must add 100 independently
labelled mixed cases, preserve U1/U2 verdicts, and rerun worker-pool faults.
