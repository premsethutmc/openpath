# 03 Domain and assumption model

## Domain of a derivation

`TaskContext.domain` (`solution-sets@1`) is built from three sources:

- **Declared conditions:** `x ≠ c`, `x > c`, `x ≥ c`, `x < c`, `x ≤ c`, joined by "and" or commas. Each is also carried as a kernel assumption:
  - `nonzero(x − c)`;
  - `positive(x − c)` or `positive(c − x)`;
  - the `nonnegative` forms for `≥` and `≤`.
- **The natural domain of an equation or inequality task:** every variable denominator of the task is nonzero. The task is undefined there, so no solution can lie there.
  - These are added as `nonzero` assumptions.
  - They are recorded in every certificate's `task.conditions`.
  - Expression tasks do **not** get a natural domain. Simplifying `(x²−9)/(x−3)` to `x+3` still requires the learner or the task to state `x ≠ 3` (a Milestone 2 policy, kept).
- **Each line's own denominators.** A point where the earlier line holds and the later line is undefined counts as a lost solution: dividing by `x` loses `x = 0`, even when written `x²/x = 6x/x`. Points where the earlier line is undefined are outside the comparison.

## Equivalence vs implication

The relation of each line to the line before is computed exactly over the reals, inside the domain:

| Relation | Meaning |
|---|---|
| `equivalent` | Same solution set |
| `implies` | Every solution kept, some gained; an implication step |
| `implied-by` | Some solution lost |
| `neither` | Some lost and some gained |

**Equations:**
- A lost solution makes the line `invalid`, with the witness.
- A gained solution is allowed only for an implication move (squaring, multiplying by a possibly-zero expression). The session then requires checked candidates.
- After an implication step, dropping a candidate is legitimate exactly when the task itself still implies the new line, so no solution of the task is dropped.

**Inequalities:** every step must be an equivalence. A gained or lost point makes the line `invalid`.

**Approximations:** decimal roundings of every irrational root (checked exactly by Sturm counts in each rounding interval) are reported as `unsupported` (approximate-values). Whether they are acceptable is a marking decision.

## Assumptions are carried, never invented

- A multiplier or divisor may be treated as nonzero only by one of:
  - a nonzero number;
  - covered by a declared or natural-domain assumption (`covered()`, including products of covered factors);
  - having no real root in the domain (`provablyNonzero`: Sturm count = 0).
- A sign for an inequality multiplier needs a number, a declared positive assumption, or `provableSign` (nonzero in the domain and positive or negative throughout).
- Anything else is refused. **If an assumption cannot be established, the step is not authorized.**

## How the solution sets are computed (`packages/learning/src/solution-sets.ts`)

- **Representation:** each line becomes a rational function `num/den` of the single variable, over ℚ with bigint arithmetic.
- **Critical polynomial:** the squarefree product of every numerator, denominator and exclusion.
- **Root isolation:** real roots are isolated by Sturm sequences into disjoint rational intervals.
- **Sampling:** one rational sample is taken in every cell between roots and next to every domain bound.
- **Truth at a root:**
  - a rational root is evaluated exactly;
  - an irrational root is decided by gcd membership (a polynomial vanishes there iff its gcd with the critical polynomial has a root in that interval) and by sign on a refined interval.
- **Result:** the truth table gives the relation and the first lost or gained witness. The witness is exact (rational) or an isolating interval of width ≤ 1/100.
- **Limits:** one variable; integer exponents ≤ 12; coefficients ≤ 2^512. Outside these the engine returns null, and the line is not refuted.

## Known false-acceptance risks and how they are closed

| Risk | How it is closed |
|---|---|
| Ambiguous notation | `notation@1` refuses it before reading |
| Hidden domain loss | Undefined-in-the-later-line counts as lost |
| Extraneous roots kept | The final claim must equal the task's exact solution set after any implication step |
| Correct final answer through invalid working | Each transition is judged on its own (05) |
