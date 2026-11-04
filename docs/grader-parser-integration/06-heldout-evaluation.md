# 6. Held-out evaluation

## HELDOUT6: independent and frozen

- **Corpus.** `tools/mathematics/grader-parser-integration/heldout6/HELDOUT6-corpus.json` has 222 items. sha256 `34ae50a813d900a76f082f46173ff078adc0afafff6028b82a43d7bb32f6f737`; `sha256sum -c HELDOUT6.sha256` reports OK.
- **Separate process.** The corpus was commissioned at the start of B2, before any code change, from a separate agent. That agent was told not to read `packages/`, the Workstream B worktree or the earlier corpora, and not to run any grader.
- **Labels.** The author's labels were cross-checked by SymPy `solveset` over the reals, inside each task's domain, relation by relation (`crosscheck.py`, `crosscheck-output.txt`): 222 items, 0 disagreements, 0 undecidable. The labels were not edited by the implementation.
- **One run.** The final run was done once, after the code was frozen, against the baseline (`eca220f0`, worktree `p2g`) and B2. Engine traces: `results/heldout6/trace-{baseline,b2}.json`. Metrics: `results/heldout6/metrics.txt`, from `scripts/heldout6-metrics.py`, which was written before the run.
- **Disclosure.** The agent's completion summary named its ambiguity patterns (`2^3^2`, `a/bc`, `9^1/2`) before the run. The chained-exponent rule (`2^3^2`) was added to notation@2 **after** reading that summary. The brief asked for "ambiguous exponent scope" anyway. No item content was read before the run. On HELDOUT6 the rule made no difference to any verdict: the shared line parser had already refused those lines as `malformed`.

| Metric | Baseline eca220f0 | B2 |
|---|---|---|
| **False mathematical accepts** (verified, labelled invalid / incomplete / ambiguous / malformed) | **0** | **0** |
| Valid derivations certified (valid + valid-jump) | 0 / 95 | **43 / 95** |
|   strict `valid` | 0 / 88 | 43 / 88 |
| Invalid working detected | 0 / 91 | **65 / 91** |
| First invalid step, exact | 0 | 65 / 65 detected |
| Incomplete reported as incomplete | 0 / 6 | 3 / 6 |
| Ambiguous refused as `ambiguous` | 8 / 15 | 11 / 15 (the other 4 are `malformed`; none was judged) |
| Malformed not judged | 15 / 15 | 15 / 15 |
| Notation items judged mathematically | 0 | 0 |
| Parser reach: engine verdict = P2 verdict, of the items P2 decides | 0 / 113 | **108 / 113** |
| Final answer, P2 evidence vs label (separate from method) | 121 / 121 | 121 / 121 |
| Replay integrity (doc 8) | — | 0 forged, tampered, truncated or cross-task chains accepted |

## False rejects (valid working not certified), classified

No valid item was reported `invalid`. With B2, 52 of 95 valid items are not certified:

| Kind | Count | Examples / cause |
|---|---|---|
| `malformed`: continuation line starting with `=` | 11 | substitution, e.g. `= 12 + 4 + 1` (shared line parser) |
| `malformed` or `unsupported`: conclusion or comment in words | 9 | `x ≠ 3, so no solution`; `0 = 3 ; no solution`; `Solve:` restated as a line |
| `malformed` or `unsupported`: radical task (`√`, `sqrt`) | 9 | squaring family: outside P2's surface |
| `unsupported`: P2 has no move for the line (two operations or a jump) | 11 | `x/4 + x/6 = 5` → `3x + 2x = 60`; `7 - x = 2x - 8` → `-x - 2x = -8 - 7`; square-bracket grouping |
| `unsupported`: `, for <condition>` statement form | 5 | P2's condition rule takes one connector |
| `unsupported`: `±` lines | 4 | `x - 4 = ±3`, `x = ±7` |
| `unsupported`: branch line P2 does not solve | 2 | `2x + 3 = 0 or x - 1 = 0` (P2: branch-not-solved) |
| `malformed`: double inequality | 1 | `-3 < 2x + 1 ≤ 7` |

Counts by family of valid/invalid items left unsupported: `results/heldout6/metrics.txt`.

## Severity of the remaining misses

Every remaining miss fails closed: it is reported unsupported, malformed or ambiguous, never verified and never invalid. Each costs coverage, not correctness. 26 invalid items are not detected:

- substitution: 10, all behind the `=`-continuation parser gap;
- squaring: 8, radicals;
- other: 8.

They are reported as unsupported or malformed. They are not accepted.

## The earlier corpora are informed, not held out

HELDOUT4 and HELDOUT5 were used during B2 development. They are **not** independent results.

| Corpus (engine level) | Valid certified, baseline → B2 | Invalid detected | First invalid exact | False accepts |
|---|---|---|---|---|
| HELDOUT5 (informed) | 8 → 42 / 79 | 11 → 59 / 59 | 11 → 58 | 0 → 0 |
| HELDOUT4 (informed) | 10 → 112 / 145 | 12 → 90 / 90 | 12 → 83 | 0 → 0 |

## Workstream B baseline reproduced (authority level, HELDOUT5)

From `results/heldout5-authority-reproduction.txt`:

- Workstream B frozen run: 28 / 62 valid, 59 / 59 invalid, first invalid 58, 0 false accepts.
- eca220f0, the post-fix code: 38 / 62. Its verdicts are identical to Workstream B's recorded `heldout5-postfix.json`.
- B2: identical authority verdicts on HELDOUT5, HELDOUT3 and HELDOUT2. The P2 changes did not move a single authority verdict on those corpora.
