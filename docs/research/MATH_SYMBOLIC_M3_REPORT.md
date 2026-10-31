# OpenPath M3 General Symbolic Reasoning Report

## Decision

**Recommendation: REVISE before merge.** M3 supplies a bounded, proof-carrying symbolic equivalence service and materially broadens alternative-route verification without false acceptance in the independent or held-out corpora. It is deliberately not a general computer algebra system. Ten independently invalid trigonometric counterclaims remain inconclusive because the implemented relation reducer can prove identities but does not yet produce a sound counterexample certificate for every non-identity.

## Baseline and architecture audit

M3 is based on C3 commit `d09293393d86ba7551cb5222e712b4c7841f34b7`; M2 remains at `687866ea46ddffcecb0ccee1bb53c681084c465b`. Before M3, OpenPath already had:

- exact rational and multivariate polynomial machinery, equation transformations, domain restrictions, proof obligations, dependency tracking and bounded planners in math-core;
- typed M1/M2 domain assessors for inequalities, quadratics, functions, coordinate geometry, trigonometry, logarithms, exponentials, sequences and radicals;
- a calculus expression AST, structural normalization, calculus rule preconditions, and C3 method-specific checking;
- the versioned unified assessment envelope and bounded persistent geometry-worker pool.

The missing layer was an internal expression-to-expression service which could combine these ideas, produce reusable evidence, distinguish failure to prove from a counterproof, and be called by calculus method checking. Existing C2 equality was principally structural; M2 canonical results were family-specific; math-core's planner consumed parsed equation lines rather than typed expressions from other reasoners.

## Implementation

`symbolic-equivalence.ts` adds `openpath-symbolic-equivalence@1` and the internal operation:

`verifySymbolicTransformation(before, after, assumptions, context, budget)`

It returns `equivalent`, `invalid`, `conditional`, `inconclusive`, or `resource-exhausted`, with source and target domains, carried restrictions, required assumptions, new exclusions, obligations, resource use, and a deterministic SHA-256 certificate. Certificates can be independently replayed for integrity. The unified API accepts the new typed `symbolic` domain through the existing `assessMathematicalWorking` entry point; no second public assessment API was added.

Implemented bounded strategies are:

- exact BigInt rational normalization for multivariate polynomial and rational expressions;
- factoring/expansion equivalence without requiring a reference route;
- denominator exclusions and domain-preserving cancellation;
- exact trigonometric Pythagorean reduction, tangent-to-ratio rewriting, and two-term angle-addition rules;
- assumption-aware logarithm product/power and exponential/logarithm inverse rules;
- principal-square-root semantics (`sqrt(x²) = |x|`) and exact constant square-root relations;
- composition of the supported operations;
- exact finite, interval-union and periodic solution-set representations, including symbolic π expressions and integer parameters.

The calculus expression IR now represents π, absolute value, indexed roots and tangent. C3 intermediate equivalence calls M3, while calculus-specific substitution, Jacobian, bounds, integration-by-parts, partial-fraction, L'Hôpital, convergence and continuity obligations remain authoritative. Symbolic equivalence cannot discharge a calculus-method precondition by itself.

## Domain semantics

Expression value and expression domain are assessed separately. A cancellation such as `(x²-1)/(x-1) -> x+1` is conditional until `x != 1` is carried. `sqrt(x²) -> x` requires a nonnegative assumption, while `sqrt(x²) -> |x|` is unconditional over the real domain. Log product/power transformations require positivity. Newly introduced or dropped restrictions remain outstanding obligations rather than being silently accepted.

The service never converts inconclusive reasoning into invalid reasoning. Unsupported radical distribution, unfamiliar transcendental composition and unproved trigonometric counterclaims fail closed.

## Proof evidence and safety

Accepted steps carry canonical source/target forms, the applied strategy and rewrite rules, assumptions, restrictions and unresolved obligations. A sequence stops at its first non-equivalent step; a later correct expression cannot repair an earlier invalid line. Duplicate or cyclic step dependencies are rejected.

Default limits are 256 AST nodes, depth 24, 512 additive/multiplicative terms, 32 rewrites, 512 canonicalization candidates and 64 student steps. Polynomial powers are limited to integer magnitude 16. Exhaustion returns `resource-exhausted`; it does not produce a mathematical verdict. Rewrite strategies are deterministic and contain no unrestricted fixed-point loop or user-code execution.

## Independent validation

The committed generator records independently authored label rationales and emits six equal 100-case categories (600 total): polynomial/rational, trigonometry, logarithm/exponential, radicals/exact sets, calculus symbolic forms, and cross-domain routes. Expected labels were not derived from engine output. SymPy was used only for eight additional exact cross-checks.

| Result | 600-case corpus | Frozen held-out (150) |
|---|---:|---:|
| Exact classification matches | 590 | 150 |
| False acceptances | 0 | 0 |
| False rejections of valid work | 0 | 0 |
| First-invalid-step correct | 70 / 80 | 25 / 25 |
| Verified | 370 | 75 |
| Invalid | 70 | 25 |
| Missing assumption | 40 | 25 |
| Unsupported/inconclusive | 60 | 25 |
| Incomplete | 30 | 0 |
| Resource exhausted | 30 | 0 |

The ten main-corpus mismatches are mathematically invalid trigonometric identities classified as unsupported. They account for the ten missed first-invalid-step labels. They are not counted as successful proofs and are not false acceptances.

The 150 held-out cases use different parameter combinations and routes from the principal templates and were frozen before evaluation. All classifications and first-invalid-step labels matched.

## Regression and performance

Commands and observed results:

- `bun test packages/learning`: **813 passed, 0 failed, 4,220 assertions**. This includes math-core, U1/U2, M1/M2, C2/C3, unified integration, worker concurrency/failure tests, and both M3 corpora.
- `PYTHONPATH=. python3 -m unittest discover -s tests` in `research/geometry-reasoner`: **47 passed**.
- `python3 tools/mathematics/symbolic-m3/sympy_crosscheck.py`: **8/8 exact cross-checks passed**.
- `bun build packages/learning/src/index.ts --target node`: **successful**, 182 modules bundled.

Warm in-process corpus measurements (750 sequential assessments, no geometry transport) were:

| Corpus | Median | p95 | p99 | Measured throughput |
|---|---:|---:|---:|---:|
| Independent | 0.105 ms | 0.498 ms | 1.321 ms | 5,655/s |
| Held-out | 0.089 ms | 0.247 ms | 0.487 ms | 9,082/s |

These are local microbenchmarks, not production latency claims. Peak memory measurement was unavailable in this environment. Existing worker-pool concurrency, crash recovery, queue saturation and shutdown tests remained green; M3 itself runs in-process with explicit budgets.

## Supported boundary and remaining gaps

M3 proves exact equivalence for the bounded families above and supports unfamiliar orderings within those rules. It does not parse arbitrary handwritten strings, solve arbitrary symbolic equations, derive arbitrary periodic solution sets, prove general branch-sensitive complex identities, or run unrestricted rewrite search. Exact solution-set comparison exists, but automatic solution-set derivation is still handled by existing domain reasoners. Piecewise symbolic equivalence remains bounded by the calculus method layer.

The principal blocker is a sound counterexample/countercertificate strategy for broader transcendental non-identities. A nonzero remainder after using only `sin²+cos²=1` is insufficient by itself to prove a trigonometric statement false, so M3 correctly remains inconclusive. Broader radical and logarithmic branch reasoning also needs additional typed semantics before coverage can expand safely.

M3 therefore demonstrates the intended reusable layer and can support controlled engineering evaluation, but the stated “general symbolic reasoning” mission is broader than the verified boundary. The branch should be revised to add independently checkable counterexamples for the outstanding trigonometric cases before merge consideration.
