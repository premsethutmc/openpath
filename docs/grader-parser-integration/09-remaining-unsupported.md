# 9. Remaining unsupported cases

All of these fail closed: unsupported, malformed or ambiguous. None is verified or invalid. Counts are from the HELDOUT6 B2 run (doc 6).

| Area | Example | Count (HELDOUT6 valid / invalid not decided) | Owner / route to fix |
|---|---|---|---|
| A continuation line starting with `=` | `= 12 + 4 + 1` | 11 / 10 | The shared line parser is a server-grader bundle input. Fixing it needs a bundle rebuild and a parity review, so it was **not** done in B2. |
| A conclusion or comment in words | `x = 1 is excluded, so no solution` | 9 / 4 | Needs a claim language for "no solution" and "x = a fails". P2 has none. |
| Radicals | `√(x + 3) = x - 3` | 9 / 8 | Outside P2's surface. Squaring with candidate checking exists only for polynomial tasks. |
| Lines with two operations, or jumps P2 does not decompose | `x/4 + x/6 = 5` → `3x + 2x = 60` | 11 / — | A bounded decomposition exists only for an inequality balance followed by symmetry. More need a proof that each decomposition is unique. |
| `, for <condition>` | `Solve 4/x > 2, for x > 0.` | 5 / 1 | P2 `normalizeTask` condition connector. A small, safe extension, left for a separately evaluated change. |
| Multi-binding `find <letter>` | `Given a = 3 and b = -2, find a^2 - 3ab` | (counted under the `=` row) | P2's VERB rule removes `find a`. Needs a verb rule that does not consume the expression. |
| `±` lines | `x - 4 = ±3` | 4 / — | The line parser accepts `±` only in solved form; P2 does not read it. |
| A branch line P2 does not solve | `2x + 3 = 0 or x - 1 = 0` | 2 / — | P2 `branch-not-solved`. |
| Double inequalities | `-3 < 2x + 1 ≤ 7` | 1 / — | Not in P2's inequality mode. |
| Square brackets in the working | `2[x − 3(x + 1)] = 10` | 1 / 1 | The shared line parser refuses `[`. |
| Quadratic formula, logarithms, systems | `x = (5 ± √(25 - 24))/2` | — | Outside P2's surface. |
| A premise on a problem kind the established checker cannot use | `(x+1)^2 - x^2 - 2x, x > 0` | — | Kept refused on purpose: E7 premise contract (`premise-binding-e7.test.ts`). |
| Ambiguous lines the line parser refuses first | `2^3^2`, `16^1/2` in a working line | 4 reported `malformed` instead of `ambiguous` | Safe, not judged. A structured "ambiguous" needs the shared parser's error to carry the reason. |

## Label conventions that differ from P2

These are not counted as errors. They are reported exactly as found, and no corpus was relabelled.

- **`rl-018` … `rl-024` (HELDOUT3).** These are correct linear inequalities and quadratics, labelled `unsupported` when inequalities were outside the surface. The engine now certifies them, as the authority already did at Workstream B and as the engine already did on the bare variant of the same corpus.
- **`tr-002`, `tr-006`, `tr-021`.** These are restatements. The engine accepted them at the M2 baseline; the existing answer-vs-method rule handles them in learner evidence.
- **`h5-ineq-016`.** The label's first invalid line is 3, and P2 says 1. Line 1 multiplies only the left side by 12, which is the earliest false transition.
