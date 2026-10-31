# 4. Domain and ambiguity safeguards

## Ambiguity: fail closed, with a structured result

`ambiguousNotation` (P2, notation@2) is the single rule set. The engine applies it to the task, after the wrapper is removed, and to every working line before anything is judged. A hit returns:

- `classification: "ambiguous"`, `correct: null`, `firstInvalidStep: null`;
- the line marked `ambiguous`;
- `domainPayload.notation = {where: "statement"|"line", line}`;
- a message telling the learner to add brackets or operators.

No reading is guessed, so correcting the notation never follows a false mathematical judgement. The one exception is an earlier, independent invalid line: when the established route found a false line before the ambiguous one, that verdict stands.

| Notation | Rule | Status |
|---|---|---|
| `1/2x`, `3/4(x+1)`, `x/2x` | division followed by an implicit product | notation@1 |
| `x/2/4` | chained division | notation@1 |
| `9^1/2` | a numeric power followed by a division | notation@1 |
| `1/(x+3)(x-2)`, `1/(x+1)x` | a bracketed divisor followed by an implicit factor | **new** |
| `x^2x`, `2^3x` | exponent scope | **new** |
| `2^3^2` | chained exponent | **new** |
| `x2` | a letter followed by a digit | **new**; P2 previously refused it as unparsed |
| `2 3`, `x 2` | a missing operator before a numeral | **new** |
| `(2x = 6` | mismatched brackets | already `malformed` from the line parser |

These do **not** fire:

- `(x-3)(x+3)/(x+3)^2`, because an exponent on the divisor is explicit;
- `x^2(x+1)`, because a bracketed product after an integer power is the standard reading;
- `2 x`, a numeral then a letter;
- `x = -2/3 or x = 5`.

On the six earlier corpora, the new rules flag zero items once condition text is excluded (checked in the audit).

**Wrapper-only ambiguity.** The native engine flags `Simplify (2x^2+6x)/(4x) for x ≠ 0` as ambiguous, because `)for` matches its `/(…)letter` rule. That is a misreading of the instruction words. P2 may take over only when all of these hold:

- the canonical reader reads the task;
- the canonical task text passes the native rule `ambiguousText` and P2's `ambiguousNotation`;
- every line passes both rules.

## Domain and inequality: engine-level tests

These cases are in `packages/learning/src/parser-p2-integration.test.ts`, Stage 5.

| Case | Engine result |
|---|---|
| keeping an excluded value (`x^2/(x-3) = 9/(x-3)` → `x = 3 or x = -3`) | invalid at line 2, "excluded-value: x = 3 is outside the domain (x - 3 ≠ 0)" |
| discarding the excluded root | verified |
| clearing a denominator that is nonzero on the natural domain | verified (balance-multiply, nonzero by the natural domain) |
| a lost root after dividing by x (`x^2 = 3x` → `x = 3`) | invalid at line 1, counterexample x = 0 |
| an extraneous root kept outside the declared domain (`x^2 = 9 for x > 0` → `x = ±3`) | invalid at line 1 |
| a negative multiplier without flipping the inequality | invalid at line 2, counterexample x = -7 |
| a multiplier of unknown sign (`6/x < 2` → `6 < 2x`, no domain) | invalid at line 1, counterexample x = -6 (solution set changed) |
| the same step under `for x > 0` | verified; the task domain `x > 0` is carried into `domainRestrictions` |
| narrowing an inequality (`6 < 2x` → `x < 3`) | invalid |
| division by zero under a binding (`y = 3/(1 - 1)`) | invalid at line 1: asserting an undefined value is P2's "mathematically-false" |
| squaring (implication) followed by keeping an extraneous candidate | invalid (keeps-extraneous); the HELDOUT corpora cover it |

Counterexamples come only from P2's exact solution-set comparison (Sturm sequences over ℚ). When P2 has no exact witness, the justification gives P2's reason without one. No witness is ever made up. The task domain travels in the TaskContext, so it is part of every certificate's task digest. A replay under a different domain therefore fails as cross-task.
