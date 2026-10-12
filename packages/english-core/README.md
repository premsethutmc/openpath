# @openpath/english-core

One TypeScript core for OpenPath English. It covers:

- the capability framework
- the learner composite
- the evaluation boundary
- the controlled updater
- adaptive selection

The same code runs on a learner's device, in the simulator, and on a server (decision D-1). `src/` has no platform imports, no network code and no provider names, and a test enforces this.

| File | Role |
|---|---|
| `framework.ts` | Validates a framework file and builds the index (leaves, parents, couplings, prerequisites) |
| `model.ts` | The measurement model: logistic update for right/wrong items, precision-weighted update for judged bands, uncertainty growth over time |
| `composite.ts` | One estimate per capability for the **whole** hierarchy (`direct` and `combined`), stages, aggregation to sub-strands and strands |
| `content.ts` | Items, writing tasks, goals and code scoring |
| `evaluation.ts` | The boundary: `EvaluationRequest`, the `Evaluator` interface, and the strict proposal schema |
| `evaluators.ts` | The `mock` and `replay` adapters, plus anchor qualification (which every evaluator must pass) |
| `updater.ts` | The ledger (append-only events → composite and decision log) and the eleven updater checks |
| `selection.ts` | Goal-weighted, explained, deterministic choice of the next activity |
| `store.ts` | The `LearnerStore` interface for local-first storage, with an in-memory version (the Node file version is in `tools/english/file-store.ts`) |

## Run

Node 22.18 or later runs the TypeScript directly, so there is no build step and nothing to install.

```sh
cd packages/english-core && npm test           # acceptance tests E1-1 … E1-13
node tools/english/demo.ts                       # end-to-end demonstration (from the repository root)
node tools/english/sim/main.ts                   # ten-learner simulation → tools/english/out/simulation-report.html
node tools/english/lock.ts --check               # frozen framework versions unchanged
```

The typecheck uses the TypeScript version already pinned in `frontend/package-lock.json`:

```sh
node ../../frontend/node_modules/typescript/bin/tsc -p .
```

Results, findings and decisions are in [`docs/english/E1_REPORT.md`](../../docs/english/E1_REPORT.md).
