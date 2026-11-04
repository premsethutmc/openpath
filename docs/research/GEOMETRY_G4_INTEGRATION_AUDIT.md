# Geometry G4 final audit and unified-engine integration

## Scope and exact commits

- Integration branch: `integration/geometry-unified`
- Integration base: `origin/feat/math-core` at `93127dd709358982b923c05797405ec0aa539364`
- Geometry source: `feat/geometry-core` at `d1fb0265cd001ae147294d8e334213d2e4e2f966`
- Geometry integration merge: `76a719b`
- Read-only domain reasoner inspected: `origin/feat/domain-aware-reasoner` at `9cfc9ce07e8c2db63aefc07b5d5231ca917d3b55`
- Requested `feat/unified-math-engine`: **not present** locally or on the GitHub remote at audit time.

No production branch, algebra implementation, learner evidence, educator marking or UI was changed.

## Capability matrix from code inspection

| Area | Status | Code/test evidence | Audit finding |
|---|---|---|---|
| Directed angles and orientation | **PARTIAL** | `semantics.py`; `test_g4_semantics.py` | Exact rational-coordinate orientation, directed-angle equality and interior/exterior rays work. They are utilities, not integrated into every synthetic theorem rule; symbolic/reflex angle composition is absent. |
| Betweenness, opposite rays, containment and cyclic order | **IMPLEMENTED** within explicit-coordinate boundary | Same files | Uses exact cross/dot and polar-order invariants. It never reads an unlabeled diagram. Requires explicit coordinates. |
| Construction verification | **PARTIAL** | `construction.py`; nine construction tests | Verifies supplied exact candidates, detects 0/1/2 intersections and preserves alternatives. It does not synthesize irrational construction points or prove arbitrary straightedge-and-compass constructions. |
| Ambiguous constructions | **IMPLEMENTED** | line/line coincidence and incomplete two-solution tests | Parallel/coincident/concentric and missing-alternative cases return obligations rather than arbitrary points. |
| External authored corpus collection | **IMPLEMENTED** | `external_geometry_proofs_v1.json`; provenance tests | 173 distinct MIT-licensed LeanEuclid proofs are pinned and attributed. |
| External proof reasoning | **UNSUPPORTED** | `external_proof_results.json` | 0/173 enter the reasoner; all are explicitly unsupported because no Formal System E/natural-language adapter exists. G4's report correctly says this, but it is not external proof validation capability. |
| Complete structured student proofs | **IMPLEMENTED** within theorem coverage | `verify_submitted_proof`; G3 tests | Ordered steps, citations, dependencies, invalid step, incomplete proof and alternatives are represented. |
| Explicit unsupported outcome | **IMPLEMENTED** | verifier and unified adapter tests | Unsupported and missing assumptions never become incorrect. |
| Explicit incomplete outcome | **IMPLEMENTED** | proof assessment and adapter tests | Valid-but-incomplete stays separate from verified completion. |
| Algebra contract compatibility | **PARTIAL** | `integration_adapter.py`; actual `working-assessment.ts` inspected | Envelope fields align, with a lossless geometry extension. Python is not compiled into the TypeScript engine. |
| Unified engine dispatch | **PARTIAL** | `unified_api.py`; `test_integration_unified_api.py` | Structured geometry dispatch works through an isolated JSON-safe unified-shaped API. The requested unified branch does not exist, so no production TypeScript unified entry point was modified. |
| Bounded resources and termination | **IMPLEMENTED** for tested core | rule/candidate budgets and adversarial tests | Large graphs, deep chains, malformed input, contradictions and exhaustion fail closed deterministically. |
| Diagram parsing | **MISSING** | repository/branch inventory below | No executable parser, image endpoint or fact extraction pipeline exists. |

## Regression results

Executed in the integration worktree:

```bash
cd research/geometry-reasoner
PYTHONPATH=. python3 -m unittest discover -s tests -v
python3 -m compileall -q geometry_reasoner benchmark tests
```

Result: **47 tests passed, 0 failed**. This includes all G2, G3 and G4 geometry suites plus the independent 30-case audit and unified entry tests. Compilation passed.

The G2 benchmark remains 540/540 expected outcomes. The G3 corpus remains 90/90 final classifications and 90/90 first-invalid-step locations. The external corpus remains 173 unsupported, with unsupported excluded from false-rejection counts.

The math-core report at the inspected base records 770 passing Bun tests. This environment has no `bun` executable, so that TypeScript suite was **not rerun**; invoking `bun test packages/learning` failed immediately with `bun: command not found`. The geometry integration does not edit math-core TypeScript files.

## Independent 30-problem audit

Expected labels are committed separately in `benchmark/integration_audit_30_expected.json` and were authored from named theorems/exact coordinate calculations before evaluation.

Coverage:

- triangles 4;
- congruence 4;
- similarity 4;
- parallel lines 4;
- circles 4;
- constructions 4;
- quadrilaterals 3;
- coordinate geometry 3.

Expected and actual outcomes both were:

- verified: 12;
- invalid: 8;
- missing assumption: 6;
- incomplete: 2;
- unsupported: 2.

Results:

- false acceptances: **0**;
- false rejections: **0**;
- unsupported or missing-assumption outcomes: **8**, reported separately;
- first-invalid-step/expected-index agreement: **30/30** (including expected `null` where the case is not an ordered invalid proof).

The set includes SSS and SAS routes, AA similarity, corresponding/alternate angles, circle centre and same-segment rules, parallelogram properties, exact midpoint/intersection checks, wrong intermediate conclusions, incomplete proofs, degeneracy and missing premises.

## Diagram parser inventory

Searched the working tree and these fetched refs for Inter-GPS, PGDPNet, FGeo-Parser/GeoParser, FormalGeo, diagram parsing/extraction/vision and geometry image parsing:

- `origin/feat/math-core`;
- `origin/feat/math-reasoner`;
- `origin/feat/domain-aware-reasoner`;
- `origin/spike/oss-math-engine`;
- `origin/audit/math-engine-generality`;
- integration worktree source, backend, frontend, packages and docs.

Findings:

1. **No Inter-GPS, PGDPNet, FGeo-Parser, GeoParser or FormalGeo reference or dependency exists.**
2. **No executable diagram-to-facts integration exists.** There is no model wrapper, parser adapter, image preprocessing, symbol detector, relation extractor or geometry fact pipeline.
3. **No geometry image-input endpoint exists.** Backend evidence and written-task endpoints accept structured/text responses, not diagram images for automatic interpretation.
4. `frontend/src/year/SketchPad.tsx` is a vector drawing pad. It serializes `draw@1` JSON containing strokes, straight lines, circles, points and a note. It does not recognize geometry.
5. `backend/family/written.py` stores that drawing as pending educator-marked work. `frontend/src/review/Main.tsx` renders it for a person. No automatic verdict is produced.
6. `packages/learning/src/written.ts` describes drawing tasks and canvas settings only.
7. `packages/learning/src/extract.ts` explicitly declines scanned PDFs because OCR is unavailable.
8. The essay contract mentions `photo_ocr` as an input provenance type, but no OCR/geometry parser implementation was found.
9. Teaching-presentation diagrams are generated typed visuals from known parameters; they do not parse learner images.

The existing vector pad could later supply structured primitives, but its freehand strokes and unlabeled shapes are not a sound geometry IR.

## Unified contract compatibility

The actual math-core assessment envelope defines:

- `verified | invalid | ambiguous | unsupported | incomplete`;
- nullable correctness (`true | false | null`);
- first invalid step and step statuses;
- resource-limit refusal;
- advisory-only output and no marking effect.

Geometry's native result additionally needs:

- `missing_assumption`;
- theorem and mathematical premise dependencies;
- submitted citation graph;
- unresolved construction/proof obligations;
- problem-instance versus universal verification scope;
- geometry skill identifiers.

The integration adapter maps the common envelope and retains every geometry-specific field under `openpath-geometry-extension@1`. `missing_assumption` maps to base `unsupported`/unknown correctness while remaining visible natively. Resource exhaustion maps to unsupported with `resourceLimit=true`. Nothing unknown becomes invalid.

`assess_unified()` accepts a JSON-safe structured geometry problem and submitted steps. The acceptance triangle-angle-sum proof returns:

- outcome `verified`;
- correctness `true`;
- first invalid step `null`;
- theorem premise dependencies;
- submitted dependency graph;
- geometry competency/skill identity.

Tests also cover invalid, incomplete, missing-assumption, unsupported, contradictory, malformed-domain and resource-exhausted requests. An invalid first step followed by a correct goal returns invalid at step 0.

This is an isolated compatibility harness, not a production unified endpoint. Since `feat/unified-math-engine` is unavailable and Python cannot be directly imported into the existing browser-oriented TypeScript package, production dispatch remains unresolved.

## Remaining blockers

1. **External proof translation:** 173/173 licensed proofs are unsupported; no Formal System E or natural-language adapter exists.
2. **Missing unified branch:** the requested `feat/unified-math-engine` contract could not be inspected or targeted.
3. **Runtime boundary:** geometry is Python while the inspected math-core entry is TypeScript. A supported service/FFI boundary must be selected and tested before production integration.
4. **Diagram input:** no parser, endpoint or fact-extraction pipeline exists.
5. **Semantic reach:** orientation/order semantics require explicit rational coordinates and are not fully incorporated into synthetic theorem chaining.
6. **Construction reach:** exact candidate verification does not generate irrational alternatives.
7. **TypeScript regression gate:** Bun was unavailable in this environment, so the recorded 770-test math-core gate was inspected but not independently rerun.
8. No educator evidence write or production learner integration was attempted, as required.

## Decision

**BLOCK** production or educator integration.

The success criterion is demonstrated in the isolated harness: a structured triangle proof enters a unified-shaped assessment API and returns a reproducible verdict, mathematical proof dependencies and first-invalid-step information while preserving unsupported versus invalid. The production integration criterion is not met because the named unified engine branch is absent, the Python/TypeScript runtime boundary is unresolved, and real external proofs cannot enter the geometry IR.

The geometry research artifacts and tests are suitable for review on this integration branch. They should not be presented as a completed unified learner engine.
