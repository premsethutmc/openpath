# 1. Geometry capability inventory

Baseline: `integration/d1-e1-subskill-evidence` @ `cd40422b`. The remote geometry branches (`feat/geometry-core`, `integration/geometry-unified`) contain nothing the baseline lacks: their trees differ from the baseline only by files the baseline has *added* since (`git diff cd40422b <branch> -- research/geometry-reasoner` is deletions only). So no geometry capability is "only on another branch".

Classification: **REACHABLE** = implemented and reached by the learner journey; **DISCONNECTED** = implemented, not reached by learner journeys or learner records; **OTHER BRANCH**; **MISSING**; **UNVERIFIED** = present but not exercised or checked in G5.

| Component | Where | Status | Evidence |
|---|---|---|---|
| Angle generators: triangle sum (`ahtri`), exterior angle (`ahext`), isosceles (`ahiso`), triangle inequality (`ahineq`) | `packages/learning/src/families.ts`, module `MATH.geometry.triangle-properties` | REACHABLE | Journeys G-01…G-05, G-07, G-08 start from the module's own items |
| Angle-pair generators: complementary/supplementary (`afpair`), crossing lines — vertically opposite, adjacent, around the point (`afcross`, 3 modes) | `families.ts`, module `MATH.geometry.angle-pairs` | REACHABLE | G-06 |
| Angles around a point as a separate task | — | MISSING (partial) | only `afcross` mode 2 ("the other three angles"), not separable; `ahtile` is tessellations |
| Multi-step angle reasoning tasks (learner writes a chain) | — | MISSING | no generator asks for one |
| Trusted grading of geometry *answers* | `server-grader` `gradeRequest` → `grading-decision@1` | REACHABLE | every attempt in every journey carries a server `grading-decision@1` (certified contract, verifier `rational-exact@1`) |
| Trusted grading of geometry *working* (D1 `working-assessment@1`) | `grading/working.ts` | REACHABLE but FAIL-CLOSED | geometry families have no `contract.statement`; every geometry working verdict is `unsupported` (G-07). The verdict comes from the algebra derivation authority |
| Geometry proof verification (structured steps, cited theorems) | `unified-math-engine.ts` `assessMathematicalWorking` → `geometry-worker.ts` (`openpath-geometry-worker@2`) → `research/geometry-reasoner` | DISCONNECTED | used by G5 reasoning cases and E5 tests only; not called by the server grader (async Python worker vs the synchronous grader bundle), not written to learner records |
| G2 soundness core / 540-case hardening benchmark | `research/geometry-reasoner/benchmark/school_geometry_hardening_v2.json`, `hardening_results.json` | DISCONNECTED (research) | reproduced: 540 cases |
| G3 structured-proof validation (90 student proofs) | `student_complete_proofs_v1.json` | DISCONNECTED (research) | reproduced: 90/90, 0 false accepts, 0 false rejects |
| G4 semantics / external corpus (173 proofs) | `external_geometry_proofs_v1.json` | DISCONNECTED (research) | reproduced: 173, all `unsupported` (outside supported boundary) |
| Exterior-angle theorem as a reasoner rule | — | MISSING | rule set has triangle-sum, straight-line, vertical-opposite, parallel-*, isosceles, congruence, similarity, circle, polygon-sum, pythagorean, triangle-inequality… no exterior-angle (R07) |
| Competencies | `graph` `MATH.geometry.angle-pairs`, `MATH.geometry.triangle-properties` | REACHABLE | no prerequisite edge between them (triangle-properties ← basic-constructions only) |
| Misconceptions (answer-level) | family misconception tables (`added`, `third-interior`, `opposite-as-linear`, …), `hypotheses.ts`, `misconception-evidence.ts` | REACHABLE | G-02, G-03, G-06 diagnose from the server decision |
| Misconception-specific teaching for geometry | explanation-review registry | MISSING (content) | module strategies: linear equations has 8 `fix_*` misconception explanations; angle-pairs has only `worked_steps`, `count_on`, `spot_the_mistake`; triangle-properties adds `tear_corners`, `check_what_it_uses`. None targets a geometry misconception; G-03 and G-06 end with the misconception untaught |
| Teaching selection | `teaching-contract.ts` `teachingEligibility`, `contentEligibility` | REACHABLE | G-02 teaches `count_on` (eligible) |
| Frontend rendering of angle questions | text prompt; `TeachingPrimitives.tsx` `LabeledGeometry` draws rectangles only | UNVERIFIED (no angle diagram renderer found; browser not run on this worktree) | |
| Evidence / persistence | records + Django event store | REACHABLE | `g5-persistence.sh`: 17 attempts stored, decisions server-sourced, round trip identical |
| Retention / recovery | shared engine `moduleState`, `recovery` | REACHABLE | G-01, G-05 |
| Sub-skill evidence (shadow) | E1 projection | ADAPTED in G5 | was linear-only (hard-coded); extracted to `subskill-projection.ts` + configs |
| Shared mastery verification for Grade 10 / geometry draft content | shared mastery engine | REACHABLE, reports `unavailable` | content gate H-V3: "verified" is unreachable for this content |

## Geometry test results (actual runs, feature worktree)

| Suite | Result |
|---|---|
| `research/geometry-reasoner` Python tests | 47 pass, 0 fail |
| Hardening benchmark (540) | reproduces recorded results |
| Student structured proofs (90) | 90/90, 0 false accept, 0 false reject |
| External corpus (173) | 173 unsupported (as recorded) |
| TS: `geometry-worker-pool`, `unified-math-engine`, `u2`, `verification-closure-e5` | 32 pass, 0 fail |
| G5 reasoning cases (`geometry-reasoning-g5.test.ts`) | 2 pass (asserting recorded limitations, see 06) |
| G5 geometry journeys (`geometry-journeys.test.ts`) | 11 pass |
