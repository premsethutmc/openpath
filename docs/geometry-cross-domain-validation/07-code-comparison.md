# 7. Code comparison: linear equations vs geometry through the same components

Method: both domains run the same scenario runner (`frontend/src/journey/scenarios.ts` `runScenario` / `checkScenario`), the same learner models (`learners.ts`), the same session (`session.ts`, trusted `gradeRequest`), the same engine (`moduleState`, `recovery`, teaching gates) and the same projection engine. Module closures were measured with `bun build --metafile` from each journey entry point (`frontend/src/journey/geometry-journeys.ts` vs `frontend/src/journey/d1e1-journeys.ts`). Equivalent linear journeys (L-01, L-02, L-04, L-05, L-08 on `gen:lin:2,17,11`) are in `cross-domain-journeys.json`: all 10/10 shared properties.

## Reuse figure (defined denominator)

**Denominator:** the source modules in the geometry journey's import closure (193 TypeScript modules, `bun build --metafile`).

| | Modules |
|---|---|
| Shared with the linear journey's closure | 191 |
| — of which pre-existing and **unchanged** since `cd40422b` | **190** |
| — of which new shared code (`subskill-projection.ts`, extracted from E1) | 1 |
| Geometry-only (`geometry-journeys.ts` harness, `subskill-config-geometry.ts` configuration) | 2 |

**Reuse = 190 / 193 = 98.4 %** of the geometry journey's modules are pre-existing shared modules reused unchanged. At contract level: **11 of 12** shared interfaces reused without modifying shared code (sub-skill evidence needed a change; see 03). Note what the figure does *not* cover: the geometry authority (Python reasoner) is outside the closure because the journey never reaches it — that is the working gap, not reuse.

## The requested comparison

| Item | Finding |
|---|---|
| Shared files reused unchanged | 190 modules (grader bundle, records, session/flow, engine, hypotheses, teaching contract, explanation review, graph, content, families, retention/recovery) |
| Geometry files added | `subskill-config-geometry.ts` (60 lines, configuration only); `geometry-journeys.ts` + test (harness); `geometry-reasoning-g5.ts` + test (evaluation); `scripts/g5-traces.mts`, `g5-persistence.mts/.sh` |
| Shared interfaces modified | **one**: sub-skill projection. `subskill-evidence.ts` (295 → 76 lines) became the linear-equations configuration + compatibility wrappers; the logic moved to `subskill-projection.ts` (284 lines, no domain identifiers). Public API of `subskill-evidence.ts` unchanged; E1 scenario outputs byte-identical, D1+E1 journey outputs identical apart from random record ids; independent line-by-line review found no behavioural difference |
| Hard-coded algebra assumptions found | (1) E1 projection hard-coded to linear-equation families, competency, core set and prerequisite edge — **removed** (config). (2) `working-assessment@1` derives statements only from equation `contract.statement` and the algebra derivation authority — **not changed** (fails closed to `unsupported` for geometry; architectural gap). (3) Misconception-specific explanations exist only for linear equations — content, not code |
| Duplicated logic | none. No second engine or mastery logic; `withWorking` only scripts what a simulated learner writes |
| Unresolved dependencies | geometry authority ↔ trusted grader (async Python worker vs synchronous grader bundle); a record path for geometry working verdicts; an authority-suitability check in the projection; exterior-angle rule in the reasoner; geometry misconception explanations |
