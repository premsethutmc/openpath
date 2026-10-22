# Curriculum-Wide Mathematical Teaching Coverage Report

Branch: `feat/expand-verified-teaching`

## Summary

| Metric | Count | Previous | Change |
|---|---|---|---|
| Total families | 1,080 | 1,080 | — |
| Kernel-backed (all steps verified) | 187 (17.3%) | 157 (14.5%) | +30 |
| Partially verified (some steps verified) | 198 (18.3%) | 187 (17.3%) | +11 |
| Compatibility mode (no independent verification) | 660 (61.1%) | 701 (64.9%) | −41 |
| No problem generated | 35 (3.2%) | 35 (3.2%) | — |

**A family is kernel-backed only when every learner-facing mathematical step is independently verified by a kernel rule with correct arithmetic.**

## What "kernel-backed" means

A step is kernel-backed when:
1. Its `op` maps to a kernel rule with a real `verify` function
2. The verify function confirms the arithmetic is correct (e.g. `multiply(3, 4) = 12` passes, `multiply(3, 4) = 15` fails)
3. The transformation is recorded with the verified rule

A family is kernel-backed when ALL its steps pass verification. If any step fails, the family is partially verified or compatibility.

## Verified operations (20)

Only these operations have independent arithmetic verification:

| Operation | Kernel rule | Verification |
|---|---|---|
| multiply | multiplicative-composition | product of all inputs = result (N-input) |
| divide | multiplicative-composition | inputs[0] ÷ inputs[1] = result, or floor(inputs[0] ÷ inputs[1]) = result for integer quotient |
| square | multiplicative-composition | inputs[0]² = result |
| power | multiplicative-composition | inputs[0] ^ inputs[1] = result |
| remainder | multiplicative-composition | inputs[0] % inputs[1] = result |
| half | multiplicative-composition | inputs[0] ÷ 2 = result |
| share | multiplicative-composition | inputs[0] ÷ inputs[1] = result |
| add | additive-composition | sum of inputs = result |
| subtract | additive-composition | inputs[0] − inputs[1] = result |
| difference | additive-composition | \|inputs[0] − inputs[1]\| = result |
| negate | additive-composition | −inputs[0] = result |
| regroup | additive-composition | sum of all inputs = result (N-input) |
| count on | additive-composition | sum of inputs = result |
| square-root | multiplicative-composition | inputs[0]^(1/2) = result |
| cube-root | multiplicative-composition | inputs[0]^(1/3) = result |
| floor | evaluate (verify: Math.floor) | Math.floor(inputs[0]) = result |
| average | evaluate (verify: mean) | mean(inputs) = result |
| round | evaluate | round(inputs[0], to nearest inputs[1]) = result |
| convert | multiplicative-composition | inputs[0] × inputs[1] = result, or inputs[0] ÷ inputs[1] = result |

## Removed operations (~67)

Operations removed from verification because they lack independent arithmetic checks: evaluate, count, read, write, simplify, rewrite, find, draw, pair, reduce, compare, sort, order, expand, place, solve, row-reduce, rearrange, classify, substitute, note, integrate, factorise, recall, differentiate, root, choose, check, combine, list, model, hcf, lcm, multiply-add, identify, split, intersect, transpose, complete-square, generalise, reflect, test, distribute, interior-angle, decide, partial-fractions, conjugate, sign, sign-chart, match, find-pattern, cross, group, estimate, inverse, equate, pythagoras, iterate, cancel, invert, eliminate, separate, translate, adjust, assign, and others.

These operations' names alone do not provide sufficient information to independently verify the mathematical result.

## Trust-based fallback removed

Previously, when arithmetic verification failed for a mapped operation, the adapter fell back to `arithmetic.evaluate` with `verify: () => true`, granting kernel-backed status to unverified (potentially wrong) arithmetic. This has been removed entirely.

**Now:** Failed verification → `null` → step is not adapted → family is not kernel-backed.

Example: `multiply(3, 4) = 15` was previously kernel-backed via the fallback. It is now correctly rejected.

## Learner Journey Validation

| Grade | Family | Status | Reason |
|---|---|---|---|
| Grade 2 | cnt, aarow, aalong, aaheavy, aaheavyo | Compatibility | Use count, find, compare, order — not independently verifiable |
| Grade 5 | mul, divr, mean4, prop | Kernel-backed | Pure arithmetic ops |
| Grade 5 | fmulw, pct | Compatibility | Use evaluate or fail verification |
| Grade 8 | factor | Kernel-backed | Uses divide, add |
| Grade 8 | quad, root, cdist, hcf | Compatibility | Use evaluate, pair, or non-verifiable ops |
| Grade 10 | lin, condp, vol, rect | Kernel-backed | All use verifiable arithmetic ops |
| Grade 12 | cint, det2, apn | Kernel-backed | Pure arithmetic |
| Grade 12 | dpow, lim | Compatibility | Use evaluate |

All families (kernel-backed and compatibility) produce teaching content with explanations. Compatibility mode preserves existing teaching without claiming independent mathematical verification.

## Approach

1. **Justification-based adaptation** (15 explicit families): Families with typed `justification` fields on their steps map directly to kernel rules with full mathematical verification.

2. **Op-based adaptation** (187 families): Operations with real `verify` functions that check arithmetic correctness. 20 operations qualify (was 18). No graceful degradation — verification must pass.

3. **Compatibility mode** (660 families): Families whose operations cannot be independently verified. Teaching content is preserved; kernel-backed label is not applied.

## New capabilities in this cycle

Six reusable verification capabilities were added, each independently verifying arithmetic:

| Capability | Steps verified | Description |
|---|---|---|
| String fraction input parsing | 43 | `parseNumeric` parses "22/7" → 3.142857… as input |
| String fraction result parsing | 19 | `parseNumeric` parses fraction strings as step results |
| Multi-input multiply (3+) | 19 | `multiply` verifies N inputs via `reduce` product |
| Integer division (quotient) | 12 | `divide` accepts `floor(a/b)` when both inputs and result are integers ≥ 0 |
| Round verification | 17 | `round` tries explicit place value or common places [1, 10, 100, …] |
| Convert as multiply/divide | 3 | `convert` verifies `a × b = r` or `a ÷ b = r` with 2 numeric inputs |

No new kernel rules were added. No mathematical derivations were inferred from operation names alone. Families that cannot be independently verified remain in compatibility mode.

No new kernel rules were added. No parallel mathematical engine was created. No individual teaching adapters were built.

## Pre-existing Failures

2 foundation/prerequisite failures documented separately per standing constraint. These are test infrastructure issues (parameter coverage of justification branches), not mathematical content failures.

## Test Results

356 tests pass across 66 suites:

- 26 kernel adapter tests
- 112 adversarial tests (wrong arithmetic, misleading ops, unverifiable ops, invalid fractions, incorrect signs, null values, made-up ops, partial correctness, positive controls, string fraction parsing, multi-input multiply, integer division, round verification, convert verification)
- 10 curriculum coverage tests (honest thresholds, four-way classification, correctness invariants)
- 22 learner journey tests (Grade 2/5/8/10/12, cross-grade progression, pre-existing failures)

No test failures. No regressions.
