# 2. Parser gap inventory

The gaps below were measured at `eca220f0`, before any change, with `scripts/engine-trace.ts` and `scripts/reach-categories.py`. The full output is in `tools/mathematics/grader-parser-integration/results/reach-categories-baseline.txt` and `results/baseline/trace-*.json`.

## Gaps found, in order of loss

| # | Gap | Where | Example | Effect at eca220f0 | B2 |
|---|---|---|---|---|---|
| G1 | The instruction wrapper in the statement (`Solve`, `Simplify`, `Evaluate`, `Given …, find y where …`) | math-core `assessWorking` (PARSE_ERROR "unknown symbol Solve"); checker ("more than one variable", "not a single parseable statement") | `Solve 2x - 3 = x` | **task-normalisation failure**: 77/109 P2-decided items in HELDOUT5, 172/210 in HELDOUT4, 69/309 in HELDOUT3 | fixed: P2's `normalizeTask` reads it, and P2 decides when the established route abstains |
| G2 | A condition suffix read as notation | math-core `ambiguousText`: `)for x` matches `/(…)letter` | `Simplify (2x^2+6x)/(4x) for x ≠ 0` | **false ambiguity**: 13 (HELDOUT2), 14 (HELDOUT3), 6 (HELDOUT5) | fixed: wrapper-only ambiguity is detected and P2 decides |
| G3 | Bindings and conditions the checker refuses | checker: "the given values must be equations", "parse fidelity" | `… for x ≠ -3`, `Given x = 2.5, …` | task-normalisation failure (counted under G1) | fixed for P2-readable tasks |
| G4 | Zero-product and square-root branch lines | the shared line parser: "solution branches must name one variable" | `x - 2 = 0 or x - 3 = 0` | **parser rejection (line)**: the item became `malformed` | fixed by `natural-disjunction.ts`, engine only |
| G5 | Final form of a rational expression | P2 completeness: only polynomial final forms | `(x - 3)/(x + 3)` | incomplete instead of verified | fixed: lowest-terms quotient (completeness only) |
| G6 | Inequality balance followed by a side swap in one line | P2: no single registered move | `6 < 2x` → `x > 3` | unsupported | fixed: bounded two-step decomposition (balance, then symmetry) |
| G7 | Unclear grouping or exponent scope accepted as one reading | P2 `ambiguousNotation` (notation@1) | `1/(x+3)(x-2)`, `x^2x`, `2^3^2`, `x2`, `2 3` | P2 read them (a guessed reading) | fixed: refused as ambiguous (notation@2) |

## Gaps left as they are (see doc 9)

| Gap | Example | Why it was left |
|---|---|---|
| a continuation line that starts with `=` | `= 12 + 4 + 1` | the shared line parser refuses it ("expected expression"). The parser is a server-bundle input, so changing it would change the production grader. HELDOUT6 shows this is the largest remaining loss in substitution |
| several bindings with a `find <letter>` verb | `Given a = 3 and b = -2, find a^2 - 3ab` | P2's VERB rule removes "find a", so the task is unparsed. The failure is closed (unsupported) |
| `, for x > 0` (a comma followed by "for") | `Solve 4/x > 2, for x > 0.` | P2's condition rule takes one connector, so the task is unparsed. The failure is closed |
| radicals | `√(x + 3) = x - 3` | outside P2's surface |
| `±` lines | `x - 4 = ±3` | the line parser accepts ± only in solved form; P2 does not read it |
| conclusions in words | `x = 1 is excluded, so no solution` | not mathematical notation |
| square brackets as grouping in the working | `2[x − 3(x + 1)] = 10` | the shared line parser refuses `[` |
| a combined substitution and evaluation line | `(16 - 1)/(4 + 1)` straight from the task | P2: "substitution-combined-with-other-steps" |

## Parser limitations vs P2 limitations

- **Parser limitations.** G1–G4 are failures to read. P2 already handled that mathematics, and every one of these items has a P2 verdict (doc 1).
- **P2 limitations.** G5 and G6 are P2 limitations. G5 is a completeness rule: it never changes validity. G6 is a bounded decomposition: each step is a registered move, and the exact solution-set comparison still decides.
- **Safety.** G7 tightens safety.
