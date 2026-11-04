# Geometry G4 semantic completeness and integration-readiness report

**Branch:** `feat/geometry-core`  
**G4 base:** `167a7999ec03cddfa0b82c3fd02c800e12929097`  
**Recommendation:** **BLOCK** for learner-facing or educator-marking integration

G4 closes the bounded coordinate semantics and contract-shape work requested here. It also supplies the first licensed external proof corpus. That corpus exposes the decisive remaining gap: the engine cannot translate Formal System E, Lean proofs, or natural-language school proofs into its trusted geometry IR. All 173 external proofs therefore remain explicitly unsupported. Zero unsupported proofs are counted as false rejections.

## 1. Final validation counts

- **42 automated tests passed** across G2, G3 and G4.
- G2 parameterized benchmark: **540/540 expected outcomes**, 0 false acceptances, 0 false rejections, 0 mismatches; 0.054695 seconds in the recorded G4 run.
- G3 structured student proofs: **90/90 final classifications** and **90/90 first-invalid-step locations**; 0 false acceptances and 0 false rejections; 0.01208 seconds.
- G4 external corpus: **173 distinct proofs**, 0 verified, 0 invalid, **173 unsupported**, 0 false acceptances and 0 false rejections under the explicit unsupported policy.

The zero-error figures apply only to the labelled supported corpora. They are not a universal geometry-accuracy claim.

## 2. External corpus

Source: [LeanEuclid](https://github.com/loganrjmurphy/LeanEuclid), commit `33a72c0fa83914202532998a2e7b8771295c3cc7`, MIT licence, copyright 2024 Logan Murphy.

The pinned import contains:

- 48 formalizations of Euclid's *Elements* Book I propositions;
- 100 held-out UniGeo school geometry proofs;
- 25 UniGeo few-shot formalizations;
- **173 distinct source paths and proof sequences**, without synthetic duplication.

Each record preserves source path, commit, licence, statement, proof steps, SHA-256 and an oracle stating that the source contains a formal Lean proof. Expected validity is sourced from that proof artifact, never from OpenPath output.

LeanEuclid contains valid formal proofs; it does not provide a labelled set of incorrect student steps. No incorrect external examples were fabricated. G3's independently labelled corpus continues to test incorrect intermediate steps, circularity and missing assumptions, but it is reported separately.

The external evaluator refuses every case because no Formal System E or natural-language adapter exists. This is the main reason for the **BLOCK** recommendation. Treating these cases as false rejections would confuse capability coverage with mathematical disagreement.

## 3. Directed angles, orientation and order

`semantics.py` implements exact rational-coordinate checks for:

- clockwise, counterclockwise and collinear orientation;
- strict/non-strict betweenness;
- opposite rays;
- segment containment;
- directed-angle equality modulo 360° using oriented dot/cross pairs;
- interior versus exterior rays for a directed non-straight angle;
- strict clockwise/counterclockwise cyclic ordering for explicit points on one circle.

Counterexamples verify that equal unsigned angle magnitude with opposite orientation is rejected, a visually central but noncollinear point is not "between," reordered cyclic points are rejected, and perpendicular rays are not opposite. No order or orientation comes from an unlabelled diagram.

Audit of existing rules:

- `vertical_pair`, `linear_pair`, `corresponding_pair`, `alternate_pair`, `central_inscribed_pair` and `same_segment_pair` remain trusted construction facts; the theorem rules do not reconstruct them from appearance.
- triangle congruence/similarity still uses explicitly ordered side/angle tuples as correspondence.
- circle angle rules require explicit same-arc/same-segment facts and nondegeneracy. Directed-angle semantics is available but is not silently substituted into those existing undirected rules.

This prevents new orientation assumptions, but upstream construction facts still require a trusted producer.

## 4. Bounded construction verification

`ConstructionVerifier` supports explicit candidate verification for:

| Construction | Existence/nondegeneracy behavior |
|---|---|
| Point on line | Exact collinearity; defining line must be nonzero |
| Point on circle | Exact squared distance; positive radius |
| Two-line intersection | Rejects parallel/coincident ambiguity; verifies unique supplied candidate |
| Line-circle intersection | Exact discriminant establishes 0/1/2 solutions; requires every alternative |
| Two-circle intersection | Exact radical-axis height establishes 0/1/2 solutions; concentric ambiguity reported |
| Parallel/perpendicular through point | Exact incidence plus cross/dot invariant |
| Midpoint | Exact coordinate-average equations and distinct endpoints |
| Interior angle bisector | Exact equal-angle invariant, interior orientation and non-straight rays |

Multiple line-circle and circle-circle solutions are returned together. Supplying only one of two solutions yields `missing_assumption` with an outstanding all-alternatives condition. Candidate and reasoning budgets fail closed. Unsupported construction kinds return `unsupported`.

The verifier checks explicit coordinate candidates; it is not a symbolic straightedge-and-compass constructor and does not synthesize irrational coordinates.

## 5. Actual unified-contract comparison

Read-only contract refs inspected:

- `origin/feat/math-core` at `93127dd709358982b923c05797405ec0aa539364`, especially `packages/learning/src/core/working-assessment.ts` and `core/verify.ts`;
- `origin/feat/domain-aware-reasoner` at `9cfc9ce07e8c2db63aefc07b5d5231ca917d3b55`.

The isolated adapter emits the actual math-core envelope concepts: `verified | invalid | ambiguous | unsupported | incomplete`, nullable correctness, advisory-only status, first invalid step, step list and resource-limit state.

Geometry-specific information is retained under a versioned extension:

- native `missing_assumption` versus generic unsupported;
- proof dependency graph;
- outstanding obligations;
- universal versus problem-instance verification scope;
- geometry skill IDs;
- resource-exhaustion evidence.

Compatibility tests cover verified, invalid, missing-assumption, incomplete, unsupported and exhausted proofs, dependencies and skills.

Mismatches requiring a future joint adapter decision:

1. math-core has `ambiguous`; geometry has a distinct `missing_assumption` outcome;
2. algebra step effects distinguish equivalence and implication; geometry uses theorem relations and construction obligations;
3. math-core's public step list is textual, while geometry statements are typed predicates over object IDs;
4. geometry needs proof dependencies and verification scope, absent from the base envelope;
5. neither current contract defines a common serialization for domain-native AST/IR payloads.

The adapter preserves these differences rather than rewriting either engine or discarding geometry fields.

## 6. Performance and resource safety

Existing adversarial coverage remains passing:

- deterministic repeated-fact handling;
- first-invalid-step preservation;
- circular, forward, self, duplicate and irrelevant citation rejection;
- contradictory premises fail closed;
- malformed arity fails closed;
- bounded rule applications and depth;
- a 5,000-fact graph under a 1,000-application budget returns unsupported rather than a mathematical verdict;
- construction candidate counts are bounded;
- exact arithmetic avoids floating-point tolerance decisions.

The G4 suite completes in roughly 0.14 seconds in this container. This is an in-memory prototype measurement, not a hostile-load service benchmark.

## 7. Remaining limitations

1. No trusted adapter from Formal System E, Lean terms, natural language or diagrams into the geometry IR.
2. Construction verification requires supplied coordinate candidates and does not synthesize irrational solutions.
3. Existing theorem facts still trust an upstream author to encode incidence, same arc/segment and correspondence correctly.
4. Directed/reflex angle composition and symbolic angle arithmetic are not integrated into the deduction rules.
5. Cyclic order handles strict explicit coordinate order; tangencies, repeated points and symbolic circle order remain unsupported.
6. External proof support is 0/173, so there is no measured external false-rejection rate within supported coverage.
7. No externally sourced incorrect-student-step corpus was available in the permitted source.
8. The compatibility adapter is Python and contract-tested against inspected TypeScript shapes; it has not been compiled inside the unmerged TypeScript branches.
9. No production evidence, learner, educator-marking or UI integration exists.

## 8. Decision

**BLOCK** learner-facing or educator-marking integration. The bounded semantic and construction utilities are suitable research artifacts, and the isolated contract adapter demonstrates a viable envelope. The external-corpus result shows that the engine still cannot consume real independent proof representations. A next phase should build and independently review a Formal System E/structured-geometry adapter for a limited subset, then report external supported coverage and genuine false-rejection rates before reconsidering integration.

## Reproduction

```bash
cd research/geometry-reasoner
python3 benchmark/import_leaneuclid.py /path/to/pinned/LeanEuclid
PYTHONPATH=. python3 benchmark/evaluate_external_proofs.py
PYTHONPATH=. python3 benchmark/evaluate.py
PYTHONPATH=. python3 benchmark/evaluate_student_proofs.py
PYTHONPATH=. python3 -m unittest discover -s tests -v
python3 -m compileall -q geometry_reasoner benchmark tests
```
