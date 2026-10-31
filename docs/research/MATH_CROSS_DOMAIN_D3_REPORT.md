# OpenPath D3 Generalized Cross-Domain Mathematical Binding

## Recommendation

**MERGE READY for the bounded typed-transfer scope documented here.** D3 adds a reusable fact-binding boundary to the existing unified engine. It accepts 60/60 valid frozen transfers that D2 could not represent, with zero false acceptances or false rejections. It does not claim unrestricted schema inference or free-form proof parsing.

## Existing transfer limitations

Before D3, OpenPath had two transfer mechanisms:

1. `MixedProblem` had sound but specialized geometry-to-algebra adapters for triangle angle sums, isosceles angles, similarity proportions, Pythagorean relationships and parallel-line angles.
2. D2 could order as many as 30 independently verified stages and retain their full native evidence, but a dependency was stage-level. It could not substitute an exact result into the typed input of another reasoner.

The audit identified these concrete gaps:

- scalar results appeared as several incompatible shapes (`integer`, `scalar`, `rational`, M1 `value`, M2 `exact`, or calculus `claim`);
- vector, matrix, interval, solution-set and expression schemas were domain-specific;
- symbol identity and scope were not represented at the transfer boundary;
- dependencies did not prove that a destination actually consumed a source value;
- restrictions and unresolved obligations could be retained in evidence but could not gate substitution;
- existing geometry transfers required one adapter per theorem family;
- unsupported cross-domain journeys stopped at the representation boundary even when both native reasoners supported the mathematics.

## Typed binding architecture

D3 introduces `openpath-mathematical-binding@1` and the internal `MathematicalBindingStore`. It does not calculate domain answers. It normalizes a verified source result, substitutes it into the destination's typed problem, and then invokes the existing destination reasoner.

Supported bounded binding types are:

- exact scalar;
- symbolic expression;
- equation;
- inequality;
- interval;
- finite solution set;
- vector;
- matrix;
- geometric relation;
- probability;
- calculus expression.

Every stored binding contains its type, exact value or relation, scoped symbol, source stage and proof step, assumptions, restrictions, stage dependencies, outstanding obligations, proof status, and binding-kernel certificate.

Raw strings are accepted only as exact rational leaves inside a typed object. The store never collapses a vector, equation, interval, or relationship into an untyped string.

## Symbol identity and scope

Symbols use `{ name, scope }`. Both fields must match at export declaration, destination import and embedded binding reference. A local shadow of a problem-level symbol is rejected even when the displayed name is identical.

Bindings may be reused by nonadjacent stages. The consuming stage must explicitly depend on the binding's source stage. Multiple imports can feed one destination problem, and repeated references remain tied to the same immutable verified binding.

## Transfer verification

The reusable transfer sequence is:

1. assess the source stage with its native reasoner;
2. locate the declared source proof step in submitted working;
3. require that exact assessment step to be verified;
4. normalize the source value into its declared mathematical type;
5. verify assumptions, restrictions and unresolved obligations;
6. create an immutable scoped binding with provenance;
7. match the destination import's type, dimensions and scope;
8. substitute the exact value into the destination problem;
9. assess the resolved destination problem using its native reasoner;
10. retain binding and stage dependencies in the unified envelope.

Probability may safely convert to an exact scalar. Arbitrary scalar-to-probability promotion is rejected unless the source was declared and validated as a probability in `[0,1]`. Vector and matrix transfers check dimensions. Unknown conversions return invalid or unsupported rather than guessing.

## U4 integration

The narrow binding checker is versioned as `openpath-proof-kernel-binding@1`. It independently checks source-step status, exact representation, type conversion, scope, assumptions, restrictions, dependency provenance and substitution budgets.

A binding is recorded as verified only after its native mathematical step has passed the corresponding existing kernel/reasoner. Unsupported, incomplete, invalid or unverified source work cannot be exported. Binding verification never raises the trust level of its source.

The kernel certificate records `verified-source-substitution`. It complements native U4 certificates; it does not replace or reinterpret them.

## D2 coordinator integration

D3 retains D2's 30-stage DAG and proof-state evidence. `d3-cross-domain` is an internal typed problem variant dispatched through the same public function:

```text
assessMathematicalWorking(problem, studentWorking, options)
```

Each destination step records both its stage dependencies and the binding IDs it consumed. Cycles, forward references, duplicate stage IDs, undeclared working, stale facts and missing source dependencies fail closed. First-invalid-step offsets remain global across stages.

End-to-end tests transfer exact verified results from six existing domains: M1 functions, M2 sequences, B1 probability, B2 determinants, B3 complex modulus, and calculus definite integration. The generic representation also tests all eleven supported binding types, including vectors, matrices, intervals and mathematical relations.

## Frozen baseline

The independently authored benchmark was frozen before implementation:

```text
tools/mathematics/cross-domain-d3/frozen-cross-domain-cases.v1.json
SHA-256 f1c9d49bf151287cb435064a3a779c8d51e266075804473c127e7a6f17073c9e
```

It contains 150 cases spanning the eight requested journey patterns plus invalid conversions, missing assumptions, wrong scopes, domain mismatches, cycles, unverified sources and resource exhaustion. Expected outcomes were authored independently rather than generated by OpenPath.

The unchanged D2 engine at `b34a3b823d9778ebc0bf69e6dc2b80b2db910586` had no D3 binding representation:

| Baseline metric | Result |
|---|---:|
| Exact matches | 0/150 |
| Valid transfers accepted | 0/60 |
| False acceptances | 0 |
| False rejections | 60 |

This is an input-representation baseline: D2 safely rejected the unknown structured binding requests rather than mis-evaluating their mathematics.

## Before-and-after comparison

| Metric | D2 | D3 | Change |
|---|---:|---:|---:|
| Exact benchmark matches | 0/150 | 150/150 | +150 |
| Valid transfers accepted | 0/60 | 60/60 | **+60** |
| False acceptances | 0 | 0 | 0 |
| False rejections | 60 | 0 | -60 |
| First-invalid-step matches | 0/55 | 55/55 | +55 |
| Verified binding records | 0 | 105 | +105 |

The frozen labels and checksum did not change after implementation.

## Adversarial validation

The benchmark includes:

- 20 invalid type conversions;
- 15 missing-assumption transfers;
- 15 incorrect symbol scopes;
- 10 domain mismatches;
- 10 circular dependencies;
- 10 unverified-source attempts;
- 10 resource-boundary cases.

An additional 40 focused checks cover forged proof-step IDs, stale facts whose source is not a dependency, shadowed symbols and missing dependency nodes. Dedicated resource tests cover 65 bindings, substitution depth above 16 and expression graphs above 256 nodes.

Results:

- frozen cases: **150/150**;
- false acceptances: **0**;
- false rejections: **0**;
- first-invalid-step accuracy: **55/55**;
- focused forged/stale/scope/dependency checks: **40/40 fail closed**;
- all eleven binding types preserved exact typed structure and provenance.

## Regression results

- Full Bun learning/unified suite: **830 passed, 0 failed** across 52 files after the final domain-transfer additions.
- Geometry G2-G4 Python suite: **47 passed, 0 failed**.
- Node-target package build: passed, 190 modules bundled.
- D2, D1, U4, B1/B2/B3, M1/M2/M3, C2/C3, geometry, teaching and worker-pool suites remain green.

No existing expected mathematical verdict was changed.

## Performance

Warm development-container measurements, 500 assessments per workload:

| Workload | p50 ms | p95 ms | p99 ms |
|---|---:|---:|---:|
| Verified two-stage transfer | 0.020 | 0.094 | 0.219 |
| Verified nonadjacent reuse | 0.022 | 0.060 | 0.150 |
| Invalid scope | 0.0098 | 0.0247 | 0.0776 |
| Invalid type | 0.0097 | 0.0197 | 0.0449 |
| 31-stage resource boundary | 0.0005 | 0.0014 | 0.0118 |

These are local microbenchmarks and exclude external geometry-worker latency.

## Resource limits

- 30 cross-domain stages;
- 64 established bindings;
- substitution depth 16;
- 256 visited expression nodes;
- 128 conversion attempts;
- existing domain expression, proof-search, worker and memory budgets remain active.

Substitution is deterministic tree traversal. It performs no rewrite search or expression expansion. Exceeding a bound returns resource exhausted.

## Remaining unsupported transfers

1. D3 requires structured binding declarations; it does not infer transfers from prose or display notation.
2. Exact scalar transfer has the broadest end-to-end coverage. Other types are contract- and kernel-tested, but destination schemas still need a compatible typed location.
3. General symbolic coercion between unrelated AST dialects remains unsupported. Small explicit converters should be added only when semantics are exact.
4. Specialized synthetic-geometry theorem transfers remain in the existing sound adapter. Generic export from nested geometry-worker submissions is not yet supported.
5. Conditional facts with unresolved obligations are retained but cannot discharge a destination obligation.
6. Unit and physical-quantity dimensions are outside the current binding types; vector and matrix dimensions are enforced.
7. Bindings do not invent bridging lemmas, choose substitutions, or search for a destination method.
8. The frozen benchmark exercises a representative exact-scalar transfer across all labels; the additional integration tests provide the broader native-domain sources. A larger externally structured multi-type corpus remains useful future validation.

Within these limits, D3 demonstrates generalized, proof-carrying mathematical fact transfer without adding a parallel solver or pairwise domain adapter matrix.
