# M1 and U2.1 Unified Mathematics Integration

## Recommendation

**MERGE READY for the documented mathematical boundary.** The same
`assessMathematicalWorking(problem, studentWorking, options)` API now dispatches
arithmetic, algebra, structured geometry, proof-carrying geometry/algebra,
inequalities, quadratics, functions, and coordinate geometry. U1/U2 verdicts
are unchanged, the U2.1 pool remains fault-isolated, and 500 independently
labelled M1/mixed cases have zero false acceptances or rejections.

This is not a claim of arbitrary mathematics coverage. Unsupported boundaries
remain explicit below.

## Dependencies and integration

- Integration branch: `integration/math-m1-u2-hardening`
- U2.1 base: `6090ca4bf3e639dddcdedef7baa943c8f606a44d`
- M1 source branch commit: `31c374b` (`feat/math-domains-m1`)
- Math-core: `93127dd709358982b923c05797405ec0aa539364`
- Geometry G4: `d1fb0265cd001ae147294d8e334213d2e4e2f966`

The integration cherry-picks the actual M1 implementation and adds one small
adapter in `unified-math-engine.ts`. No math-core rule, geometry theorem, M1
solver, obligation rule, or worker-pool behavior was rewritten.

## Contract adapter

The public U1 envelope remains `openpath-unified-math-assessment@1`. Its domain
union now includes `inequality`, `quadratic`, `function`, and `coordinate`.
Structured M1 steps are dispatched to `assessDomainWorking`; the adapter carries
back:

- classification, correctness, completeness, and first-invalid-step;
- exact domain restrictions and outstanding obligations;
- per-step justification and dependency order;
- M1 skill evidence;
- native payload and `openpath-math-domains-m1@1` reasoner version.

Text arithmetic/algebra, geometry, and proof-carrying mixed requests continue
through their existing routes. Domain-specific payloads remain distinct.

## Mathematical coverage

Implemented and tested:

- linear, compound, rational, and rational-root polynomial-sign inequalities;
- denominator exclusions and exact interval boundaries;
- quadratic factoring, completed square, formula route, equivalent equations,
  repeated/no-real/rational/exact-radical roots, and extraneous roots;
- polynomial/rational/piecewise evaluation, composition, polynomial/rational
  preimages, and rational domains;
- exact coordinate distance, midpoint, slope, line equations, intersections,
  parallel/perpendicular relations, and circle point membership;
- all U2 proof-carrying geometry transfers, including similarity proportions
  and positive-root Pythagorean selection.

Unsupported:

- inequality critical points requiring irrational interval endpoints;
- polynomial inequalities above degree two;
- arbitrary symbolic function equivalence, arbitrary piecewise inverses, and
  free-form function transformations;
- general conic intersections and coincident-line parameterizations;
- natural-language proofs and diagram recognition;
- cross-domain theorem families outside U2's five explicit transfers.

Unsupported work returns unsupported and is never guessed from samples.

## Independent validation

### M1 domain corpus

Four hundred independently generated/formula-labelled cases:

| Domain | Cases | Verdict mismatches | Unsupported |
| --- | ---: | ---: | ---: |
| Inequalities | 100 | 0 | 5 |
| Quadratics | 100 | 0 | 0 |
| Functions | 100 | 0 | 0 |
| Coordinate geometry | 100 | 0 | 0 |

### Mixed-domain corpus

One hundred independently labelled journeys, 20 each:

- geometry with quadratic work;
- coordinate geometry with algebra;
- similar triangles with rational equations;
- function domains with inequalities;
- Pythagorean relationships with exact roots.

The corpus includes invalid geometry followed by correct calculation, invalid
algebra after a valid premise, missing nondegeneracy/parallel assumptions,
extraneous roots, domain exclusions, unsupported cases, and alternative routes.
The first failing domain is preserved; later correctness never repairs it.

Combined results:

- Final-verdict matches: **500/500**
- M1 first-invalid-step matches: **400/400**
- Mixed first-failing-stage matches: **100/100**
- False acceptances: **0**
- False rejections: **0**
- Unsupported: **5**
- Resource-exhaustion mismatches: **0**
- Domain-preservation failures: **0**

## Full regression

- `bun test packages/learning`: **789 passed, 0 failed** across 35 files after
  the focused adapter-evidence assertion was added.
- Math-core baseline tests: unchanged.
- U1 corpus: **200/200 unchanged**.
- U2 corpus: **250/250 unchanged**.
- U2.1 concurrency/fault suite: all **6** cases passed.
- Geometry G2–G4: **47 passed, 0 failed**.
- Python compile validation: passed.

No existing expected label was changed for integration.

## Operational regression

Four-worker, 500-request repeat in the integration worktree:

- cold startup: **48.257 ms** (U2.1 baseline 52.990 ms);
- throughput: **1,122.91/s** (baseline 977.64/s);
- execution p50/p95/p99: **3.232 / 5.169 / 11.677 ms**
  (baseline 3.671 / 6.589 / 8.989 ms);
- queue-wait p50/p95/p99: **236.468 / 416.863 / 433.361 ms** under the same
  500-request burst;
- RSS: **32,312–36,792 KB** (baseline 32,740–35,172 KB);
- forced crash recovery: **44.036 ms**, verified.

Median and throughput did not regress. The single-run p99 and maximum RSS were
higher by roughly 2.7 ms and 1.6 MB respectively; M1 does not execute inside the
Python worker, so these are treated as runner variance but recorded rather than
discarded. Production sizing still requires repeated load runs.

## Remaining risks

- M1 input is structured; a future UI/parser must not convert ambiguous free
  text into these structures without preserving uncertainty.
- Exact radical strings are canonical contract values, not a general radical
  simplifier.
- Mixed-domain tests compose independently justified stages; only the existing
  U2 proof-carrying families provide single-request cross-reasoner transfers.
- Operational metrics remain in-process until the host application exports them.

No UI, adaptive teaching, production deployment, or learner-state behavior was
added or changed.
