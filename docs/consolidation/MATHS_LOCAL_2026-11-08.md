# Local maths integration, 8 November 2026

Local candidate only. Nothing pushed, published, deployed, merged to main, or educator-approved.

## Source manifest

Fetched all remote heads and PR heads before integration; GitHub metadata confirmed these snapshots:

| Component | Pinned source |
| --- | --- |
| Research candidate (base) | `3474b043` (`research/dr8-candidate`) |
| Consolidated product #112 | `61edf730fd0aa5dfaa733c4fd237765da9b8f9de`, already an ancestor |
| Scoped teaching and geometry #115 | `e1d5ed74a9381ab60fa1d60020f8cc8e5128a72d`, already an ancestor |
| Calculus/algebra/trigonometry #116 | `a1ec13fb76d797d1d24a2612610bab1d8f1b08bf` |
| Grade 7 #117 | `c1db278d621494ba17da7b7d1047f3a7aa5c48a5` |

Grade 7 is pinned, not edited on its source branch. Its existing shared Grade 7–8 Virahanka-number mapping and TN Grade 8 release dependency are retained. Claude's separate, active Grade 8 implementation is excluded. The initial checkout was clean at `7efa0a6`; no prior local integration existed. No AGENTS.md or .agents/skills instructions were present in the checkout or selected source tree; README and relevant CI/pipeline instructions were read.

## Reconciliation

- Retain #115's scope-from-config and own-skill teaching priority, followed by the research deep-recovery path.
- Integrate #116's 17 blueprints, reserved examples, independent pool checks and browser journeys.
- Integrate Grade 7 family/lesson coverage, board snapshots, delayed-transfer provision and one-family situation selector.
- Resolve blueprint reordering by competency: retain expanded geometry strategies and dice teaching once each. Add a uniqueness regression.
- Regenerate library, question specifications, review registries, coverage outputs and server grader from combined sources. Registries start from the research candidate and sync changed content to pending/draft; no approval operations.
- Preserve 2,372 previously served question IDs removed by Grade 7 pool narrowing. A small immutable historical-answer source is validated against current solvers and included in the server table; old rational/LCM parameters remain readable but are not reintroduced into release pools. The pre-integration comparison found zero changed answer letters and zero changed exposure aliases, but seven families lost IDs.
- Correct research-only after-help presentation: separate qualified successes from unqualified Year totals and recompute parent tile progress. Saved records and core evidence status are unchanged; shipped research switches remain off.
- Keep expansion, integrated-skills and deep-recovery browser checks in Grade 7's per-suite result collector. Expansion runs before the research runner, which leaves a shipped build behind.

## Validation

Results and exact commands are recorded below. Raw logs and exit files: `/tmp/maths-integration-logs/`.

## Publication later

The owner must separately decide whether to publish. After approval, from this checkout:

```sh
git push origin integration/maths-local-2026-11-08
```

Open a draft review against the agreed candidate base (normally `research/dr8-candidate`), not an automatic merge to main. Review this combined head's checks; earlier component CI does not certify it. Deployment and educator approval remain separate decisions.

Initial checks caught and led to fixes: duplicate blueprints after textual merge; a test fixture calling a private session helper; historical question rejection/removal; research aggregate wording. A pre-regeneration backend run completed 358 tests with one stale content-hash failure and three skips; its result is not final combined certification. The first replay invocation used Node on a Bun test and was rerun with Bun (5/5 passed). All 17 independent expansion-family pool tests passed.

The combined Grade 7 geometry examples change the fresh-question sequence for the angle-pair single-slip fixture. The ordinary module now teaches another explanation of the same skill, rechecks it and completes; research mode agrees step for step. Two old tests assumed this fixture necessarily ended in a policy-C pause. They now assert the combined ordinary path exactly, while keeping the carrying one-extra-question/stop regression and the blocked-gap and repaired-gap stop tests. No recovery policy was weakened to satisfy them.

Compatibility verification compared every old table entry to the regenerated table: **857,526 answers, including 284,970 multiple-choice letters; zero changed or missing entries**. All 261 newly registered explanation revisions are `pending_review`; the module/family registry has zero approved or released entries.

### Commands and completed results

Commands use Node 24, Python 3.12 in `.venv`, and Bun 1.4.4 installed under `/tmp/maths-tools` (no lockfile changes). Node pipeline commands run from `frontend` with `node --import tsx ../packages/learning/scripts/<script>.ts`.

| Check | Result |
| --- | --- |
| `specs.ts` | 1,088 families; 343,845 problems; 862,052 current-pool IDs; zero validation failures |
| `library.ts` | 314 generated modules; 15 authored modules given pools |
| `review.ts sync`, `explanation-review.ts sync/check` | Registry valid; 261 new revisions pending; no approvals/releases |
| `historical-answers.ts`, full old-table comparison | 857,526 old answers preserved, including 284,970 choice letters |
| `families-parity.ts`, `expansion.py`, `board-releases.ts` | Exit 0; board/syllabus regeneration matches integrated sources |
| `coverage.ts`, `compile-coverage.ts` | Exit 0; reports regenerated from reconciled sources |
| `ESBUILD=frontend/node_modules/.bin/esbuild node tools/mathematics/server-grader/build.mjs` | 224 inputs; rebuilt successfully |
| Bun `teaching-contract.test.ts`, `teaching-stage2.test.ts` | 39 passed; 78,897 assertions; ratchet unchanged |
| Bun `generator-contracts.test.ts`, `decision-replay.test.ts` | 11 passed; 43,414 assertions |
| Node `maths-expansion-pools.test.ts` | 17 passed, independently recomputing 5,174 served answers; the separate replay file initially used the wrong runner and subsequently passed with Bun |
| Node `historical-answers.test.ts` | 2 passed |
| Node `maths-integration.test.ts` | 9 passed: selector, replay/freshness, display totals, blueprint uniqueness |
| Node `deep-recovery-module-115.test.ts`, `deep-recovery-module-anglepairs.test.ts` after fixture correction | 13 passed |
| `python manage.py test --noinput` from `backend`, final regenerated tree | 358 run, 355 passed, 3 skipped; no failures |
| Real Chromium + Django `maths-expansion-browser.test.mts` | All six skills passed teaching, guided work, fresh checks, reload and wrong-delayed-check recovery |

Backend skips are the pre-existing M1, M2 and H1 persistence tests requiring external fixture paths (`M1_EVENTS`/`M1_STORED`, `M2_DIR`, `H1_DIR`). Their data was not supplied. Full hosted CI, all unrelated frontend/English suites, and the separate Grade 7 browser suite were not run. No external CI was triggered. The research phase-6 wrong-answer test's original local-vendor assumption was not treated as a passing server-verdict check; real browser journeys and the full backend suite cover the integrated server path separately.

The complete deep-recovery browser runner passed all 12 recorded scenarios across three builds: single/multiple gaps, failed save, unavailable content, no fresh question, switch off, module recovery, module switch off, goal recovery, unchanged goals, pause/resume, and shipped-build switch absence. The runner leaves the **shipped, non-research build** locally. The captured Year screenshot shows the separate after-help total and unchanged unqualified totals/parent progress.

Final `npm run typecheck` passed. Current fingerprints for `agfta`, `ajinv` and `avstrat` match the rebuilt specifications despite restored historical readability; new release pools were not broadened.

### Combined learner results

`/tmp/maths-checks.sh` ran the combined 133-test batch (addition/regrouping, geometry, dice, expansion, deep evidence/recovery, integration regressions, historical answers, platform, Grade 7 coverage and board replay): **131 passed, 2 failed**. Both failures were the outdated angle-pair slip expectations described above. The corrected affected files were rerun in full: **13/13 passed** (including one new exact on/off parity regression). The expensive unchanged Grade 7/platform cases were not rerun unnecessarily; there are no outstanding failures from this batch.

Grade 7 synthetic outcomes with the explicit review fixture:
- CBSE: 43 competencies verified after a delay; 3 construction competencies correctly await educator marks. Teaching appeared after early mistakes in 41 competencies.
- Tamil Nadu: 48 competencies verified after a delay; 2 construction competencies correctly await educator marks. Teaching appeared after early mistakes in 48 competencies.
- Existing content limits remain: CBSE `basic-constructions`, `construction-triangles`, `constructions-bisectors`, `evaluate-data-displays`, and `statistical-questions` did not show a lesson after the two initial simulated mistakes; TN `basic-constructions` and `constructions-bisectors` likewise. The source suite reports these limits and preserves the safe pause/educator gate; this integration does not claim to author their missing teaching.

The phase-6 wrong-answer test was rerun after restoring historical IDs: no failure, one explicit skip because `~/.cache/openpath-vendor` is absent. This optional direct server-verdict simulation is unverified locally; it is not counted as passed.

## Final local handover

Branch: `integration/maths-local-2026-11-08`. The final merge commit includes the reconciled sources, regenerated artifacts, tests and this handover. Read its exact hash with `git rev-parse integration/maths-local-2026-11-08` (also recorded with the exported evidence).

No outstanding implementation or test failure remains in the exercised scope. The optional fixture/vendor-dependent checks and full hosted CI listed above remain unrun. Educator review and the source Grade 7 teaching limitations remain product gates, not automatic approvals.

Portable deliverables are written outside the working tree under `/workspace/shared/`: `maths-local-2026-11-08.bundle` and `maths-local-2026-11-08-evidence.tar.gz`. The bundle requires base commit `3474b0435d0ab21f6c5068b61ec617f548f1e2ed` (fetch `research/dr8-candidate` first if needed). It can be imported locally with:

```sh
git fetch /workspace/shared/maths-local-2026-11-08.bundle integration/maths-local-2026-11-08:integration/maths-local-2026-11-08
```
