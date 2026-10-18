# Deterministic baseline results (kept unchanged)

From `content/english/essay/benchmark/results-v1.json` (`node tools/english/essay-benchmark.ts`). These measure agreement with the synthetic reference, not with educators.

| Evaluator | Error precision | Error recall | Rejected by validation | Errors on valid text | Competency agreement (κ) |
|---|---:|---:|---:|---:|---:|
| benchmark-reference@v1 | 1 | 1 | 0 of 48 | 0 | 1 (κ 1) |
| openpath-patterns@patterns@0 | 1 | 0.111 | 0 of 11 | 0 | 0.968 (κ 0.459) |
| **LLM evaluator** | **not measured** | | | | |

No LLM accuracy is reported: no model has been run. Running one needs explicit approval of a key and its cost (owner decision).
