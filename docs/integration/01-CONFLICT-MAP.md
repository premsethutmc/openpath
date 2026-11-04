# Integration Milestone 1 — Stage 1: conflict map

Measured before any code change. Remote branch tips (all verified present on `origin`):

| short | branch | commit | role |
|---|---|---|---|
| math | `feat/math-answer-key-certification` | 49a6be8 | P2 derivation authority (E-series engine lineage) |
| evid | `feat/adaptive-evidence-investigation` | 2db1c44 | Phase 4: hypotheses, probes, retention@2 (contains p3) |
| loop | `feature/adaptive-loop-repair` | 5289948 | A1/A2: one diagnosis, teaching gate, pause, honest feedback |
| rend | `feat/universal-learning-renderer` | 12a82f9 | rich renderer (React, shared spec) |
| p3 | `feat/adaptive-journey-slice` | e2176d2 | Phase 3 baseline (ancestor of evid) |
| main | `main` | b578c78 | |

## Ancestry (they do NOT share one base)
```
main b578c78 ──┬── rend  (+4 commits, 39 files: frontend/src/math only)
               └── … 3e4c62d (Phase B spec, +317) ──┬── math (+27)
                                                    └── … bb20657 (shadow release prep, +324) ──┬── p3 e2176d2 (+41) ── evid 2db1c44 (+3)
                                                                                                └── loop 5289948 (+37)
```
- math ∩ p3/evid/loop = 3e4c62d. evid ⊃ p3. loop and p3 diverge at bb20657. rend branches from main and touches only the frontend/math renderer.
- p3 and loop both contain the E7 safety work (fix/math-e7-safety-invariants); math contains the engine *before* those safety fixes plus P2.

## Textual merge simulation (`git merge-tree`, pairwise)
| pair | conflicts |
|---|---|
| evid + loop | 6: `intervention.ts`, `plan.ts`, `grading-audit.test.ts`, `backend/family/legacy_grading.py`, `grader.mjs`, `grader.manifest.json` |
| evid + math, loop + math, p3 + math | 0 |
| any adaptive + rend | 1: `frontend/package.json` |
| math + rend | 1: `frontend/package.json` |

Clean textual merges are **not** evidence of safety: math and the adaptive trunk both edit the same engine lineage (`unified-math-engine.ts` etc.) from different bases, so the merged result is re-tested rather than assumed.

## Changed files by area
| branch delta | mostly |
|---|---|
| evid (p3→evid, 11 src files) | `evidence.ts`, `hypotheses.ts`, `intervention.ts`, `reasoning.ts`, `teacher-evidence.ts`; frontend `adaptive-journey.ts`, `phase4-scenarios.ts`, tests |
| loop (bb20657→loop) | `intervention.ts`, `plan.ts`, `teaching-contract.ts`, family/content, `Learn.tsx`, `CurriculumPractice.tsx`, curriculum UI, e2e, grader bundle |
| math (3e4c62d→math) | `derivation-authority.ts`, `rewrite-registry.ts`, `unified-math-engine.ts`, `e6-numbers.ts`, `claim-grounding.ts` + tests; 1,324 files of audit tooling under `tools/mathematics` |
| rend | `frontend/src/math/**` (26 files), build script, screenshots |
