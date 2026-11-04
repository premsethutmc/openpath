# OpenPath Unified Mathematics U3 Integration Audit

## Recommendation

**REVISE.** U3 is a reproducible integration baseline with one public assessment API, green regressions, bounded execution, zero false acceptance/rejection in the frozen 400-case audit, and a sound exact fix for the reported trigonometric counterclaims. It is not merge-ready as a universally proof-carrying system because most M3 certificates remain integrity records produced by the same verifier rather than independently replayable mathematical derivations.

## Ancestry and integration status

Branch `integration/unified-math-u3` starts at M3 `8bb64b35d431ef161ca42d2fccc1e2f0c8099fd1`. Git ancestry inspection established that every requested commit is already an ancestor:

- M1/U2.1 integration `31e595f9bb0442e6ce57d920eba437337fa4b350`;
- M2 `687866ea46ddffcecb0ccee1bb53c681084c465b`;
- C2 `74d78e69ed90da3df9e233bb7e72da38f9c1ed27`;
- C3 `d09293393d86ba7551cb5222e712b4c7841f34b7`;
- geometry integration `e1bdfcdf3c0dd0428c93da3957f77bceb36a4557`.

The three-dot diff from M3 to the geometry integration commit is empty. M3 genuinely retains `geometry-worker.ts`, its persistent pool, G4 Python source, unified geometry adapter, worker tests and container configuration. No historical branch was merged or cherry-picked.

The only contract integration correction was widening typed cross-domain stages to include existing arithmetic/algebra, geometry, mixed, symbolic and calculus payloads already accepted recursively at runtime. Mathematical engines were not duplicated or rewritten.

## Unified API and proof state

Arithmetic, algebra, M1, M2, geometry, calculus, C3 methods and M3 symbolic assessment all enter through:

`assessMathematicalWorking(problem, studentWorking, options)`

The envelope preserves classification, nullable correctness, completion, first invalid step, step evidence, dependencies, restrictions, obligations, skills and versioned reasoners. Cross-domain stages stop at the earliest non-verified result. Unsupported/resource/transport outcomes cannot become student mistakes. The 150 journey audit includes valid multi-domain routes and early invalid work followed by otherwise correct mathematics.

## Certificate audit

M3 certificates contain source/target canonical expressions, strategy, rules, assumptions, restrictions, obligations and a SHA-256 digest. Mutation tests show that missing or changed digest/rules cannot replay. This establishes deterministic integrity, not independent mathematical soundness.

Independent mathematical checks were therefore performed separately:

- exact native invariants and the frozen labelled corpora;
- 300 SymPy cross-checks split evenly across rational-polynomial, trigonometric, log/exp, radical, calculus and exact solution-set cases;
- exact counterexample certificates for the trigonometric findings below.

The audit does **not** claim that the existing generic digest replay independently re-proves rational normalization or every assumption-aware rewrite. No external certificate is accepted as input, so malformed certificates cannot currently cause an accepted learner verdict; they are output evidence only. A future merge gate should add a small independent certificate language/checker rather than treating the digest as a proof.

## Domain and assumption audit

The frozen audit covers cancellation, division by zero, log positivity, principal roots, absolute values, periodic solution completeness, calculus singularities, geometry nondegeneracy and resource boundaries. Existing regressions additionally cover inverse restrictions, denominator exclusions, extraneous roots, one-sided limits, construction ambiguity and contradictory premises.

Restrictions persist in domain-native envelopes and across ordered U3 stages. Cross-domain stages do not silently promote a restricted result to an unrestricted fact. Domain-changing symbolic cancellation remains conditional unless the original exclusion is carried.

## Trigonometric counterclaims

The ten repeated M3 counterclaims were instances of `sin²(x)+cos²(x)=2`. Exact substitution at `x=0` gives `1=2`, a sound counterexample. The same bounded mechanism also refutes the previously unsupported transformation `sin(x)=cos(x)` because at zero it gives `0=1`.

U3 adds the `exact-zero-counterexample` strategy. It runs only when exact evaluation is defined and zero satisfies the stated positive/nonzero assumptions. It uses exact rationals and exact standard values; no floating-point approximation is involved. Claims not refutable at this exact point remain inconclusive. This intentional semantic improvement changes twenty M3 corpus outcomes from unsupported to invalid; no verified or previously invalid mathematical verdict changed.

## Frozen 400-case audit

The committed corpus was frozen before evaluation and contains 150 cross-domain journeys, 100 certificate/adversarial cases, 100 domain/assumption cases and 50 unsupported/resource cases. Labels reuse independently authored domain labels and an explicit earliest-stage composition rule.

- Total: **400**
- Exact label/first-step matches after the exact-counterexample upgrade: **380**
- False acceptances: **0**
- False rejections of valid work: **0**
- First-invalid-step matches: **380/400**
- Outcomes: 220 verified, 68 invalid, 62 unsupported, 35 missing-assumption, 15 resource-exhausted

The twenty mismatches are the documented intentional change from unsupported to exactly refuted invalid, so their previously null first-invalid positions become step zero. Unsupported outcomes are not counted as mathematical successes.

## Independent oracle validation

`exact_oracle_crosscheck.py` performs **300/300** matching exact SymPy checks: 50 each for polynomial/rational equivalence, trigonometry, log/exp, radicals, calculus and exact periodic solution sets. Half of each group is a deliberately perturbed false claim. SymPy supplements rather than generates the frozen U3 labels. No oracle case was numerically sampled or inconclusive.

## Regression results

- `bun test packages/learning`: **815 passed, 0 failed, 4,228 assertions, 0 skipped** across 45 files.
- Geometry G2-G4: **47 passed, 0 failed, 0 skipped**.
- Node package build: passed after running from repository root.
- U3 frozen audit test: 2 passed.
- Exact oracle: 300/300.

The suite includes math-core, U1/U2, M1/M2, C2/C3, M3 independent/held-out corpora, geometry, and worker concurrency/crash/cancellation/shutdown coverage.

## Performance and operations

Local warm measurements, 30 requests per category:

| Category | p50 ms | p95 ms | p99 ms |
|---|---:|---:|---:|
| Arithmetic | 0.129 | 0.316 | 0.366 |
| Algebra/M1 | 0.092 | 0.209 | 0.294 |
| Trigonometry | 0.027 | 0.172 | 0.301 |
| Calculus methods | 0.509 | 1.115 | 1.384 |
| Symbolic/adversarial | 0.585 | 1.092 | 2.554 |
| Geometry worker | 1.532 | 6.223 | 11.163 |
| Mixed U2 | 1.212 | 3.425 | 4.480 |

These are development-container microbenchmarks. U2.1 tests confirm a bounded queue, deadlines, queue saturation, cancellation, worker crash replacement, no unrelated-request blocking and graceful shutdown. Its recorded 500-request benchmark achieved 977.64/s with four workers, p50/p95/p99 execution of 3.671/6.589/8.989 ms and worker RSS of 32.0-34.3 MiB. M3 remains in-process and budgeted, so it does not occupy geometry worker slots.

## Remaining blockers

1. Generic M3 certificate replay verifies integrity, not all mathematics independently.
2. Geometry external natural-language proofs and diagram interpretation remain unsupported.
3. Synthetic geometry orientation and construction coverage remains partial as documented by G4.
4. Symbolic branches, general algebraic numbers, arbitrary transcendental identities and unrestricted calculus remain outside the bounded rules.
5. Cross-domain coordination is explicit staged dispatch, not general theorem search.
6. Production pool sizing, global admission control and metrics export remain deployment concerns.

The companion capability matrix states the actual boundary. U3 is suitable as an integration and controlled evaluation baseline after review, but should be revised before claiming independently proof-carrying symbolic evidence throughout.
