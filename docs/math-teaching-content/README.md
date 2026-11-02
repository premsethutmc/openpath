# Mathematics teaching-content completion: inventory and batch 1

Branch `feat/math-teaching-content` from foundation `637938c7` (draft PR #96, not merged). Documentation and read-only tools only:
- no engine, grader, session, generated table, review registry or runtime content file is changed;
- nothing is activated, served or approved.

Every package is a **review candidate**; no educator approval is claimed.

| # | Document | What it holds |
|---|---|---|
| 1 | [01-GAP-MAP.md](01-GAP-MAP.md) | Curriculum teaching-content gap map: usable / present but disconnected / missing or inadequate / missing checker support, by strand. Why batch 1 is these nine. The next 30 candidates. |
| 2 | [02-BATCH-1.md](02-BATCH-1.md) | The nine completed teaching packages (number ×3, measurement, geometry ×2, statistics, algebra, probability) and the principles applied. |
| 3 | [03-VALIDATION.md](03-VALIDATION.md) | How the mathematics was checked: trusted grader, prompt-text oracle, alternative methods, whole-pool agreement. What could not be verified. |
| 4 | [04-REVIEW.md](04-REVIEW.md) | All review history: passes 1–2 (batch 1), final pass 3 (batch 1), batch-2 review, confirmation pass, and author fixes NOT independently re-cleared. |
| 5 | [05-HANDOVER-CODEX.md](05-HANDOVER-CODEX.md) | Integration objects and specification, platform blockers (B1–B3), policy questions, runtime defects with reproducible ids (D1–D6), prerequisite concerns, exact reused sources. |
| 6 | [06-BATCH-2.md](06-BATCH-2.md) | Batch 2: five instructional patterns (regroup, scale/key, equal parts, place value, chance) across measurement, statistics, number and probability; nine family packages. |
| 7 | [07-PATTERN-MAP.md](07-PATTERN-MAP.md) | Missing teaching grouped by reusable instructional pattern, ranked by impact, breadth and ease; the next batch (on hold: finish the 18 first). |
| 8 | [08-INTEGRATION-MANIFEST.md](08-INTEGRATION-MANIFEST.md) | **Start here for integration.** For each of the 18 packages: family/parameter scope, misconception ids, contrast requirements, item roles reconciled with the served pools, visuals, answer formats, unresolved contract requirements, and readiness category. |

Data: `integration-manifest.json`, `review-status.json`, `inventory.json`, `inventory-summary.json`, `batch-1/*`, `batch-2/*` (packages, `PAT-*` pattern files, `validation.json`).

Reproduce (from `frontend/`, with its `node_modules`):

```
node --import tsx ../docs/math-teaching-content/tools/inventory.mts ../docs/math-teaching-content   # gap map data (~10 min)
node --import tsx ../docs/math-teaching-content/tools/build.mts ../docs/math-teaching-content       # both batches + checks (~3 min)
node --import tsx ../docs/math-teaching-content/tools/manifest.mts ../docs/math-teaching-content    # pool reconciliation -> integration-manifest.json
python3 ../docs/math-teaching-content/tools/manifest-md.py ../docs/math-teaching-content            # 08-INTEGRATION-MANIFEST.md (uses review-status.json)
python3 ../docs/math-teaching-content/tools/patterns.py ../docs/math-teaching-content               # pattern ranking rows
```
