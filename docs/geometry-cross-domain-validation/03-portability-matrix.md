# 3. Universal learning contract: portability matrix

Competency under test: triangle angle relationships. **Substitution (documented):** there is no single competency with that name. The nearest existing competencies are used unchanged: `MATH.geometry.triangle-properties` (triangle sum `ahtri`, exterior angle `ahext`, isosceles `ahiso`, side inequality `ahineq`) and `MATH.geometry.angle-pairs` (straight line / supplementary / complementary `afpair`; crossing lines — vertically opposite, adjacent, around the point `afcross`). "Around a point" exists only as `afcross` mode 2; "multi-step" has no generator (MISSING DOMAIN CAPABILITY).

Classes: **REUSABLE** (used unchanged) · **ADAPTER REQUIRED** (shared code needed a configuration seam; geometry supplied configuration) · **ARCHITECTURAL GAP** (the shared architecture cannot do it for geometry today without a structural change) · **MISSING DOMAIN CAPABILITY** (the shared contract is fine; geometry content/authority is absent).

| # | Interface | Class | What happened in G5 | Evidence |
|---|---|---|---|---|
| 1 | Generation | REUSABLE | geometry families served by the shared module/selection path; journey starts are the module's own items | 02/05, `START_*` in `geometry-journeys.ts` |
| 2 | Trusted grading (answer) | REUSABLE | `gradeRequest` → `grading-decision@1` inlined in every attempt record; client decisions ignored | journey traces, persistence round trip |
| 3 | Working (method) | ARCHITECTURAL GAP | `working-assessment@1` only knows equation statements; geometry working is `unsupported` from the *algebra* authority. The geometry authority (async Python worker) is not callable from the synchronous trusted grader, and its verdicts have no record path | G-07; 06 |
| 4 | Provenance | REUSABLE | decisions inlined in records, client decisions ignored, unknown families never credited | geometry-journeys.test "unknown families and client decisions" |
| 5 | Misconception | REUSABLE (contract) + MISSING DOMAIN CAPABILITY (geometry teaching content) | answer-level misconceptions diagnosed from server decisions (G-02, G-03, G-06) | traces |
| 6 | Teaching selection | REUSABLE (gates) + MISSING DOMAIN CAPABILITY | gates work unchanged; geometry lacks misconception-specific explanations and its modules re-test a misconception only on the family where it appeared once (G-06: the one crossing-lines item; G-03: exterior angle), so neither misconception is taught | G-03, G-06 |
| 7 | Rechecks | REUSABLE | fresh check after teaching (G-02) | G-02 |
| 8 | Reconstruction (state from records) | REUSABLE | `SliceSession.fromEvents` + Django round trip | 05, persistence |
| 9 | Sub-skill evidence | ADAPTER REQUIRED | E1 projection was hard-coded to linear equations; extracted into a domain-neutral engine (`subskill-projection.ts`) + configuration; linear outputs unchanged | 07 |
| 10 | Retention | REUSABLE (competency) / note | per-competency retention works; per-sub-skill retention only in the shadow projection; isosceles/side-inequality are never sampled by the module's delayed check (inherited design) | G-01, G-05 |
| 11 | Recovery | REUSABLE | failed delayed check → recovery → pass (G-05) | G-05 |
| 12 | Replay | REUSABLE | rebuilt state, next decision identical; reversed store order identical; Django round trip identical | 05 |

Also: **competency-level mastery leakage across sub-skills** (G-03, G-01) is an ARCHITECTURAL GAP of the authoritative engine, not geometry-specific (same for linear equations; E1 exists to expose it).

Summary: 9 of 12 interfaces reused unchanged; 1 needed an adapter in shared code (sub-skill evidence); 1 architectural gap (working); content gaps in misconception teaching.
