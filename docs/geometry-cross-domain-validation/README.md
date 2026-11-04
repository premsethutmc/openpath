# G5: Geometry cross-domain integration and gap assessment

Branch `feat/geometry-cross-domain-validation`, from `integration/d1-e1-subskill-evidence` @ `cd40422b`. Evaluation only: nothing merged, deployed or activated; no mastery policy changed; M1/H1 untouched; no safety rule weakened; no educator approval claimed.

**Question:** can OpenPath's shared learning architecture (trusted grading, records, engine, teaching gates, retention, recovery, replay, sub-skill evidence) carry geometry without a second engine?

**Decision: PARTIAL — architectural gaps identified.** Answer-level geometry learning runs end to end on the shared components (98.4 % of the geometry journey's modules are pre-existing shared modules used unchanged; 11 of 12 interfaces need no shared-code change). Geometric *working* cannot be verified or recorded (the geometry authority is disconnected from the trusted grader), the authority is not yet safe to connect (it rejects valid alternative proofs), and competency-level mastery leaks across sub-skills.

| # | Deliverable | File |
|---|---|---|
| 1 | Inventory | [01-inventory.md](01-inventory.md) |
| 2 | Geometry test results | [02-test-results.md](02-test-results.md) |
| 3 | Portability matrix | [03-portability-matrix.md](03-portability-matrix.md) |
| 4 | Evidence contract | [04-evidence-contract.md](04-evidence-contract.md) |
| 5 | Journey traces (summary; full: [journey-traces.md](journey-traces.md), [.json](journey-traces.json)) | [05-journey-traces.md](05-journey-traces.md) |
| 6 | Adversarial reasoning results ([json](reasoning-results.json)) | [06-adversarial-results.md](06-adversarial-results.md) |
| 7 | Code comparison and reuse ([cross-domain-journeys.json](cross-domain-journeys.json)) | [07-code-comparison.md](07-code-comparison.md) |
| 8 | Mastery and retention findings | [08-mastery-retention-findings.md](08-mastery-retention-findings.md) |
| 9 | Regression | [09-regression.md](09-regression.md) |
| 10 | Independent review | [10-independent-review.md](10-independent-review.md) |
| 11 | Prioritised gaps | [11-prioritized-gaps.md](11-prioritized-gaps.md) |
| 12 | Recommendation | [12-recommendation.md](12-recommendation.md) |

## Code on the branch

| File | Kind |
|---|---|
| `packages/learning/src/subskill-projection.ts` | NEW shared: domain-neutral sub-skill projection (extracted from E1) |
| `packages/learning/src/subskill-evidence.ts` | CHANGED: now the linear-equations configuration + unchanged public API |
| `packages/learning/src/subskill-config-geometry.ts` | NEW: geometry configuration (data only) |
| `packages/learning/src/geometry-reasoning-g5.ts` / `.test.ts` | NEW: adversarial reasoning cases (evaluation) |
| `frontend/src/journey/geometry-journeys.ts` / `.test.ts` | NEW: geometry journeys on the shared harness |
| `frontend/scripts/g5-traces.mts`, `g5-persistence.mts`, `g5-persistence.sh` | NEW: trace generation, Django round trip |

Reproduce: `cd frontend && node --import tsx scripts/g5-traces.mts ../docs/geometry-cross-domain-validation`; `bash frontend/scripts/g5-persistence.sh`.
