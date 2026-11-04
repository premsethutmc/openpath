# OpenPath D8 — Canonical Mathematical IR and Metadata Consistency

## Recommendation

**MERGE READY within the bounded D8 scope.** The implementation resolves or explains every exposed D7 mismatch, introduces deterministic and idempotent semantic canonicalization, preserves proof and domain metadata, and produces zero false mathematical unifications in the frozen, sealed, metamorphic, and adversarial evaluations. It does not claim algebraic equivalence or universal mathematical coverage.

## Baseline and ancestry

- Repository: `premsethutmc/openpath`
- Base: `feat/math-notation-hardening-d7` at `f1395ac0bbe22cb55efec199f21f62fb31f103f5`
- Work branch: `feat/math-canonical-ir-d8`
- Public assessment API remains unchanged.
- Reused D4–D7 parsing/adapters, D3 bindings, D2 coordination, D1 reasoning, M3 equivalence, and U4 checking.

## The 14 D7 metadata mismatches

The complete case-level audit is frozen in `tools/mathematics/canonical-ir-d8/d7-mismatch-analysis.v1.json`.

| Cases | Difference | Classification | Mathematical effect |
|---:|---|---|---|
| 10 | Partial-derivative expectations copied `dependent` into a redundant `functionName`; the parser retained the dependent symbol once | Harmless reference-shape difference | None; derivative order, variable, partial status, source mapping, D3 behavior, and U4 outcome were unchanged |
| 4 | Expectations marked `f(x+1)` as `nested`; the parser correctly reported no nested function application because `x+1` contains no application | Harmless reference-shape difference | None; argument semantics and verdict were unchanged |

None involved an incorrect type, symbol scope, domain, assumption, dependency, certificate, or mathematical verdict. All 14 are permanent regression cases. Canonicalization removes reliance on both redundant fields while retaining the relevant mathematical data.

## Canonical IR design

`packages/learning/src/canonical-math-ir.ts` defines `openpath-canonical-mathematical-ir@1`.

The canonicalizer performs bounded structural and notation normalization:

- exact rational reduction;
- deterministic flattening and ordering of associative addition and multiplication;
- normalized functions, derivatives, equations, inequalities, intervals, solution sets, vectors, matrices, complex values, probability statements, and geometric relations;
- safe alpha-normalization of explicitly bound integral variables;
- stable serialization independent of object insertion order.

It deliberately does not expand, factor, cancel, solve, or infer algebraic equivalence. Those operations remain with M3 and U4. Expression budgets are 512 nodes, depth 32, and 65,536 serialized bytes.

Two identities are kept separate:

- `mathematicalIdentity` represents mathematical type and meaning, including domains and restrictions;
- `semanticIdentity` represents the full proof-bearing typed object, adding assumptions, obligations, dependencies, and verification status.

Original notation, parser provenance, formatting, and source spans stay outside mathematical identity. They remain available for feedback and first-invalid-step localization.

## Mathematical invariants

Canonical forms preserve exact scalar values, symbol and function identities, derivative order and variable, equation direction, inequality operator, solution-set completeness, vector dimensions, matrix shapes, complex branches, probability assumptions, geometric hypotheses, and all domain restrictions.

Bound variables may be alpha-renamed only when capture-free. Free-variable renaming remains a different identity. Prime and Leibniz derivatives unify only when context establishes the same function, variable, order, and evaluation point.

Domain-sensitive objects remain distinct. Cancellation exclusions, real/complex domains, logarithm restrictions, radical branches, trigonometric periodicity, matrix invertibility, probability assumptions, and geometric conditions are never discarded.

## D3 and U4 integration

`cross-domain-bindings.ts` now attaches a canonical `semanticIdentity` only after D3 has confirmed that the source fact is verified and has no unresolved obligations. Canonicalization cannot promote parser output, conditional evidence, or an unsupported fact.

U4 certificates are still checked mathematically. Canonical hashes are identifiers, never evidence. Tests cover forged certificates, altered assumptions, dependency changes, and verification-status changes. Proof-relevant metadata changes the full typed-object identity even when the mathematical expression alone is unchanged.

## Frozen benchmark

The benchmark was frozen before implementation. Checksums are recorded in `FROZEN_SHA256`.

| Result | D7 baseline (140 development) | D8 development |
|---|---:|---:|
| Correct identity judgments | 123 | 140 |
| False unifications | 0 | 0 |
| False separations | 17 | 0 |

The 200 cases comprise equivalent notation (40), functions/derivatives (40), scope/bound variables (30), domains/branches (30), cross-domain bindings (30), and certificate/adversarial metadata (30).

The untouched 60-case sealed holdout was evaluated once after implementation:

- 60/60 correct;
- 0 false unifications;
- 0 false separations;
- all six categories passed.

After that evaluation, an architecture review added the explicit separation between mathematical identity and proof-bearing semantic identity. No normalization rule or holdout judgment was tuned. A new independently frozen 30-case confirmation set was created before evaluating that additive refinement: 30/30, with zero false unifications or separations.

## Metamorphic and adversarial validation

Metamorphic tests cover 300 alternate notation variants and 200 source-location variants. They verify determinism, idempotence, source independence, round-trip meaning, restriction preservation, status preservation, and non-collision of negative pairs.

The independently generated adversarial set contains 150 cases across derivative order/variable changes, capture, free substitution, missing exclusions, real/complex and branch changes, dimensions, probability assumptions, dependencies, forged verification, serialization collision attempts, source-only changes, unverified bindings, and type confusion.

- 150/150 classifications correct;
- 0 false mathematical acceptances/unifications;
- 0 false rejections/separations.

## Regression results

- Learning/engine Bun suite: **862 passed, 0 failed**, 10,399 assertions across 57 files.
- Geometry Python suite: **47 passed** in the completed implementation regression run.
- Frontend production build: passed in the completed implementation regression run.
- Frozen and adversarial artifact checksums: all passed.
- `git diff --check`: passed.

Previously correct mathematical verdicts remain unchanged. The public unified assessment API and reasoner rules were not modified.

## Performance

Development benchmark canonicalization: p50 **0.025 ms**, p95 **0.144 ms**.

Untouched sealed holdout: p50 **0.056 ms**, p95 **0.178 ms**.

Post-refinement confirmation: p50 **0.029 ms**, p95 **0.641 ms**. The canonicalizer is bounded and performs no proof search or unrestricted symbolic expansion.

## Remaining limitations

- Canonical identity is defined only for the currently typed and supported IR families.
- General algebraic equivalence is intentionally outside canonicalization and remains an M3/U4 proof task.
- Leibniz and prime derivatives require sufficient function context; ambiguous cases remain distinct or unsupported.
- Alpha-equivalence is limited to explicit supported binders and does not attempt arbitrary lambda-calculus normalization.
- Unsupported or resource-exhausted constructs fail closed and receive no trusted D3 identity.

No merge or deployment was performed.
