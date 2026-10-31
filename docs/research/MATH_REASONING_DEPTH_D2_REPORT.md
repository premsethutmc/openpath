# OpenPath D2 Generalized Mathematical Problem-Solving Depth

## Recommendation

**MERGE READY for the bounded, typed stage-based cross-domain scope described here.** D2 raises verified unfamiliar-route coverage on the same frozen benchmark from 40/120 to 120/120 while retaining zero false acceptances and zero false rejections. It does not claim unrestricted proof planning or automatic interpretation of prose solutions.

## External benchmark provenance

The benchmark contains 200 independently written secondary-school and introductory competitive-mathematics problems, 25 in each of eight categories: algebra/equations, trigonometry, geometry, calculus, probability/combinatorics, vectors/matrices, complex numbers, and mixed-domain reasoning.

Problem statements and expected proof outcomes were written independently for OpenPath. No exercise text was copied. The open educational references used to select ordinary topic scope were:

- OpenStax *Algebra and Trigonometry 2e*, CC BY 4.0;
- OpenStax *Precalculus 2e*, CC BY 4.0;
- OpenStax *Calculus Volume 1*, CC BY 4.0;
- OpenStax *Introductory Statistics 2e*, CC BY 4.0.

Every case records the reference title, URL, license, `copiedText: false`, assumptions, an actual problem statement, a valid reference derivation, an alternative derivation, an incorrect route, expected earliest invalid step, and required concepts.

## Frozen benchmark construction

The benchmark was constructed before reasoning changes and then quality-audited to replace generic route descriptions with explicit mathematical statements and derivations. No expected classifications, selected routes, stage topology, or tuning outcomes changed during that editorial pass. The final frozen artifact is:

```text
tools/mathematics/reasoning-depth-d2/frozen-external-benchmark.v1.json
SHA-256 ebdcbadc6a8824340154569f0669812ab2f1ab61a35cd86e5a7292064d41f9c9
```

The executable harness maps each authored concept chain to existing independently verified domain fixtures. It does not ask OpenPath to generate expected labels. The benchmark's prose is metadata rather than a natural-language parser input; this limitation is explicit below.

Selected outcomes comprise 120 valid routes, 40 mathematically invalid routes, 16 incomplete routes, eight unsupported routes, eight circular/malformed routes, and eight resource-boundary routes.

## B3 baseline

The unchanged B3 engine at `9bcda37cc98fd4561979156a0f4362580800a4d3` was executed against the frozen labels from an isolated base worktree.

| Metric | B3 baseline |
|---|---:|
| Exact case matches | 120/200 |
| Valid routes accepted | 40/120 |
| False acceptances | 0 |
| False rejections | 80 |
| Unsupported | 8 |
| Resource exhausted | 88 |

The 80 false rejections were input-capacity failures: mathematically valid 18-stage solutions exceeded the old 16-stage cross-domain ceiling. Invalid, incomplete, unsupported, circular, and 31-stage resource-boundary cases remained fail closed. Baseline evidence is stored in `b3-baseline-results.v1.json`.

## Mathematical reasoning changes

D2 retains each existing domain reasoner and adds a small versioned proof-state boundary, `openpath-cross-domain-proof-state@2`.

The changes are deliberately narrow:

1. the cross-domain ceiling increases from 16 to 30 verified stages;
2. the limit is configurable downward and capped at 30;
3. submitted stages must be unique and declared by the problem;
4. every dependency must refer to an already established fact;
5. duplicate, missing, self-referential, and forward dependencies fail closed;
6. a stage enters proof state only after its native assessment is complete, correct, and verified;
7. each established fact retains its mathematical domain, exact native evidence, assumptions/restrictions, obligations, skills, reasoner versions, global step indexes, and dependencies;
8. proof state exposes completion evidence and the current goal stage.

No mathematical operation, theorem family, symbolic solver, or subject was added.

## Cross-domain proof-state design

`D2ProofState` is a directed acyclic graph of verified stage facts. A downstream stage may depend only on facts already present in the graph. The coordinator never changes a native domain result or removes its restrictions.

Each fact records:

- stage identity and mathematical domain;
- source assessment steps;
- dependency stage IDs;
- carried assumptions and domain restrictions;
- outstanding obligations;
- skill evidence;
- native mathematical evidence;
- exact reasoner and kernel versions.

The full state is returned inside the existing assessment envelope. The public API remains:

```text
assessMathematicalWorking(problem, studentWorking, options)
```

## U4 verification integration

D2 does not create mathematical verdicts. Each stage is first assessed by its existing domain adapter and proof checker. The transfer boundary then independently verifies that the stage is completed and verified, all of its steps are verified, reasoner evidence exists, and every dependency is established without a cycle.

All 120 accepted frozen-benchmark routes contain `unified:d2-proof-state` evidence, and every established fact is marked independently verified with its native mathematical payload. Unsupported domain claims remain unsupported. Correct later work cannot repair an earlier invalid stage.

## Before-and-after comparison

| Metric | B3 | D2 | Change |
|---|---:|---:|---:|
| Exact benchmark matches | 120/200 | 200/200 | +80 |
| Valid routes accepted | 40/120 | 120/120 | **+80** |
| False acceptances | 0 | 0 | 0 |
| False rejections | 80 | 0 | -80 |
| First-invalid-step matches | 40/40 | 40/40 | unchanged |
| Unsupported | 8 | 8 | unchanged |
| Resource exhausted | 88 | 8 | -80 valid routes |

The improvement comes from accepting longer compositions of already supported, independently checked mathematics. Labels were not altered to obtain the result.

## Adversarial validation

The focused corpus contains 150 independently labelled cases:

| Category | Cases |
|---|---:|
| Incorrect cross-domain assumptions | 20 |
| Invalid substitutions | 20 |
| Missing domain restrictions | 20 |
| Circular reasoning | 20 |
| Incorrect method transitions | 20 |
| Correct final answer after invalid work | 20 |
| Valid unconventional routes | 20 |
| Resource exhaustion | 10 |

Results:

- exact classification and first-invalid-step agreement: **150/150**;
- false acceptances: **0**;
- false rejections: **0**;
- first-invalid-step accuracy for invalid mathematics: **40/40**;
- proof-state/kernel coverage: **150/150**;
- circular, missing, unsupported, and exhausted cases all failed closed.

## Regression results

- Full Bun learning/unified suite: **825 passed, 0 failed, 6,826 assertions, 0 skipped** across 51 files.
- Geometry G2-G4 Python suite: **47 passed, 0 failed**.
- Node-target learning package build: **passed**, 189 modules bundled.
- B3, B2, B1, D1, U4, U3, M3, C2/C3, M1/M2, geometry, teaching, and worker-pool tests remained green.

No prior expected mathematical verdict changed.

## Performance

Warm development-container measurements, 200 assessments per workload:

| Workload | p50 ms | p95 ms | p99 ms |
|---|---:|---:|---:|
| 5-stage solution | 0.107 | 0.515 | 2.519 |
| 10-stage solution | 0.134 | 0.374 | 0.479 |
| 20-stage solution | 0.170 | 0.348 | 0.468 |
| 12-stage mixed-domain solution | 0.094 | 0.261 | 0.581 |
| 31-stage adversarial limit | 0.0006 | 0.0017 | 0.0199 |

The 31-stage case exits before domain execution. These are local microbenchmarks, not production latency guarantees. Geometry-worker latency is separately covered by the existing persistent-pool tests.

## Resource limits

- maximum cross-domain stages: 30;
- caller may request a lower limit but cannot raise the hard cap;
- each domain retains its existing expression, proof-search, worker, memory, and step budgets;
- dependency graphs must be ordered DAGs;
- duplicate and undeclared working stages are malformed;
- a failed domain stage terminates the route at the first failure;
- no candidate generation or unrestricted theorem search was added.

## Remaining limitations

1. D2 coordinates structured domain stages. It does not parse a free-form prose solution into those stages.
2. The benchmark problems are independently authored and source-attributed, while the executable assessment payloads compose existing domain fixtures. A future externally transcribed structured-proof corpus would provide stronger ecological validity.
3. Generic D2 dependencies carry the complete native mathematical evidence, but arbitrary value substitution between heterogeneous schemas is not inferred. Typed geometry/algebra obligations remain the model for value-level handoffs.
4. A dependency asserts that a later verified stage used an established fact; the coordinator does not invent missing bridging lemmas.
5. Student-introduced auxiliary variables are supported only where the underlying symbolic/domain reasoner represents them.
6. Unsupported mathematical rules remain unsupported even when surrounded by verified stages.
7. The 30-stage ceiling is a deliberate operational bound rather than a claim that longer proofs are mathematically invalid.

Within these boundaries, D2 demonstrates the requested measurable gain: **80 additional valid unfamiliar routes assessed correctly on the unchanged frozen labels, with no loss of mathematical soundness in the evaluated corpora.**
