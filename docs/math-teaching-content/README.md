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
| 4 | [04-REVIEW.md](04-REVIEW.md) | Two independent mathematics-education review passes and their disposition. |
| 5 | [05-HANDOVER-CODEX.md](05-HANDOVER-CODEX.md) | Integration mapping, policy questions, existing content defects, exact reused sources. |

Data: `inventory.json`, `inventory-summary.json`, `batch-1/*.json|.md`, `batch-1/validation.json`.

Reproduce (from `frontend/`, with its `node_modules`):

```
node --import tsx ../docs/math-teaching-content/tools/inventory.mts ../docs/math-teaching-content   # gap map data (~10 min)
node --import tsx ../docs/math-teaching-content/tools/build.mts ../docs/math-teaching-content       # packages + checks (~2 min)
```
