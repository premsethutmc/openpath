# adversarial3: third held-out corpus (family H3)

Files: `adversarial3.json` ({"tasks":[...]}), `generate_adversarial3.py` (seed 20261030, byte-identical reruns),
`check_adversarial3.py` (recomputes every label, exit 1 on mismatch; `--regen` also checks byte-identical regeneration),
`dropped.json` (rejected candidates with reasons, generation statistics), `FROZEN.md`. SymPy is the only oracle
(falls back to /home/claude/vendor/sympy and mpmath). Nothing here reads or imports the evaluator, `packages/`, any `*.ts`,
`tools/mathematics/core/results/`, earlier results, or any other corpus' labels; the layout (not the code) follows adversarial2.

## Record
`{id, family:'H3', category, problem, lines[], [ascii_lines], expected{status, first_invalid, invalid_at, error_class,
final_verdict, step_flags, step_labels, [unsupported_lines], [readings_agree | readings]}, truth, notes}`.
- `status`: valid-complete | valid-incomplete | invalid | unsupported | ambiguous.
- `first_invalid`: 1-based index of the first invalid line. An invalid final claim with every step valid gives
  `invalid_at:'final-claim'` (index of the claim line); a step error gives `'step'`; a wrong claim that is itself an invalid
  transition is `'step'`. Labels after the first invalid line are informational only.
- `step_labels`: equivalent | valid-with-obligation | valid-discharge | invalid | unsupported | not-assessed.
  `step_flags` = `[{line, flag}]` for obligation / discharge lines.
- `final_verdict`: correct | wrong | no-claim, from the LAST line read literally (`x = a or x = b`, `no solution`,
  `all real numbers [except a, b]`), independent of earlier errors.
- `error_class`: intended error family (informational; null unless status is invalid).
- `truth`: `{solution_set:{kind:'finite',values}|{kind:'all-except',except}, excluded}`; `excluded` = real zeros of the
  denominators written in the ORIGINAL problem. Fractions are strings (`"-7/6"`).
- glyph-variants carry `lines` (unicode) and `ascii_lines` (ASCII equivalent); the label is that of `ascii_lines`, the checker
  verifies both give identical truth/status/labels.
- ambiguous-notation: see below.

## Semantics (the convention implemented)
1. Domain: the ORIGINAL domain is R minus the real zeros of denominators written in the problem. This exclusion applies to every
   line forever. A denominator the student introduces in a line only removes its own zeros from THAT line's set; the next
   line without it gets them back, so introducing and removing a denominator is label-invisible unless it makes the set lose
   a solution.
2. Set of a line = real roots of the numerator of together(L-R) minus (original zeros + the line's own denominator zeros);
   `A or B` is a union; `0 = 0` gives all reals minus the domain; a trailing `, x != a` / `, x ≠ a` removes a from that line's set
   (the removable-singularity statement). Lines whose polynomial has an irrational real root are out of scope (unsupported).
3. Transition prev -> cur: equal = equivalent. cur strictly larger = valid-with-obligation (multiplying by something that may be
   zero, squaring: gained roots), except finite -> cofinite (collapse, e.g. times 0) = invalid. cur strictly smaller = valid-discharge
   iff cur still contains the true set (removing gained roots); otherwise invalid (a solution of the original problem was lost
   by division, cancellation, a dropped case...). Incomparable = invalid. Discharge is state free (truth ⊆ cur ⊊ prev), also
   when prev is cofinite (e.g. `x+2 = x+2` -> `all real numbers except 2`).
4. Final claim, read literally, is valid-complete only if it equals the true set of the ORIGINAL problem (so `x = 2` is wrong when 2
   is excluded, and a still-present gained root is wrong, status invalid / final-claim). Correct work with no claim line is
   valid-incomplete (also when an obligation is still open).
5. Explicit case splits (input syntax fixed by the coordinator contract). Case lines follow an ordinary line L (the last
   non-case line, or the problem if none):
   - `case x = c: E`, E a variable-free equation (e.g. `0 = 0`, `4 = 9`, or the unsimplified substitution
     `((4)-4)*((4)-1) = ((4)-4)*8`); valid iff truth(E) equals the truth of L at x=c, c in the original domain and in L's domain.
     If c is excluded by the original problem, E must be the word `excluded` (valid iff c really is excluded; an equation is invalid).
     Label equivalent / invalid; it does not change the working's current set.
   - `case x != c: E` (also `≠`), E an ordinary equation; valid iff its solutions on the original domain minus c equal the
     solutions of L minus c. Label equivalent / invalid. Afterwards the working continues from that line with c removed from the
     domain of every later line AND from the true set used for the obligation test (the standing assumption never changes the
     ORIGINAL domain or the final-claim comparison, which is against the full original truth).
   - the working ends with an ordinary claim; omitting the c-root of a true `x = c` case, or including the root of a false /
     excluded one, is an invalid final claim. Dividing without a case split is an invalid step. A case line is never a claim.
6. unsupported: a line outside the grammar (sqrt, unknown symbol, `|..|`, `==`, `?`, trig/log, `≈`, `<`, units, irrational roots)
   beats invalid. Each unsupported task has exactly one unsupported line and only valid lines before it. Category `unsupported`:
   all lines after it are `not-assessed`. Category `broken-evidence-chain` (pairwise rule): the line right after the break is
   `not-assessed`; a later line j is labelled from the two lines j-1 -> j alone by the transition rule above (equivalent,
   obligation, discharge, invalid), because those two lines are readable. Status is `unsupported` regardless of later invalid pairs.
   The unsupported mutations never touch case lines.
7. Ambiguous notation. Problems are written as juxtaposition after `/` (`p/qx`, `p/qx + r`, `k/m(x-a)`, `1/2x`). Two readings:
   `lr` (strict left to right, `(p/q)x`) and `tight` (a juxtaposed product after `/` joins the denominator, `p/(qx)`).
   If the two readings give different solution sets for the problem: `status:'ambiguous'`, verdict fields null,
   `readings:{lr:{...}, tight:{...}}` (status, first_invalid, invalid_at, final_verdict, step_labels, step_flags) and
   `truth:{lr:{...}, tight:{...}}`. Otherwise it is an agreeing control (`readings_agree:true`, normal labels; both readings must
   give identical labels; if the exclusion sets differ, e.g. tight excludes 0, `truth.excluded_by_reading` records it and
   `truth.excluded` is the lr value). All other categories use explicit grammar (never a juxtaposition after `/`), and the
   generator and checker require both readings to give identical labels.
8. Grammar of student lines: `+ - * / ^` (exponent 0-6), parentheses, decimals, implicit multiplication (number/x/`)` followed by
   x/`(`), `=`; glyphs `− – ⋅ × · ∕ ÷` are folded to ASCII; `x ≠ c` conditions; words `or`, `no solution`,
   `all real numbers [except ...]`, `case`, `excluded`.

## Categories (38 each, 456 tasks)
| category | n | statuses |
|---|---|---|
| divide-by-variable | 38 | invalid 24, valid-complete 9, valid-incomplete 5 |
| multiply-by-possibly-zero | 38 | invalid 18, valid-complete 14, valid-incomplete 6 |
| cancellation | 38 | invalid 20, valid-complete 14, valid-incomplete 4 |
| rational-expressions | 38 | invalid 25, valid-complete 9, valid-incomplete 4 |
| removable-singularity | 38 | invalid 19, valid-complete 15, valid-incomplete 4 |
| explicit-case-split | 38 | invalid 18, valid-complete 16, valid-incomplete 4 |
| introduced-denominator | 38 | invalid 16, valid-complete 15, valid-incomplete 7 |
| alternative-paths | 38 | valid-complete 29, valid-incomplete 9 |
| glyph-variants | 38 | valid-complete 36, valid-incomplete 2 |
| ambiguous-notation | 38 | ambiguous 26, invalid 4, valid-complete 8 (12 agreeing controls) |
| broken-evidence-chain | 38 | unsupported 38 |
| unsupported | 38 | unsupported 38 |

Notes: multiply-by-possibly-zero includes squaring and multiplying by 0; alternative-paths includes identity, contradiction, rational
identity and two obligation-then-discharge controls; glyph-variants are built from valid alternative-path, multiplication
(obligation + discharge), introduced-denominator, case-split and removable-singularity working; introduced-denominator is
"both sides over (x-m), then multiplied back" (invalid exactly when m is a root, since the first line then loses it).

## Independence and label routes
Route 1 (generator): own parser -> SymPy, roots by `factor_list`/`Poly`, set algebra on (finite | cofinite) sets. Route 2 (checker):
own lexer/AST, Fraction substitution on a grid of all critical points plus generic points, per-line cross-check against
`solveset`. The generator imports the checker's `route2` and keeps a task only if both routes give the same full label set for both
readings. Both routes share one author's reading of the spec, so a shared misreading would not be caught.

## Limitations
- Templates are constructive; drops (14 in dropped.json: intended status differed or an irrational root appeared) are redraws.
- Degree <= 2 after clearing, rational roots only; case splits use linear special points; the pairwise break rule is used only in
  broken-evidence-chain and no case line is placed after a break.
- Labels after the first invalid line follow the same transition rule and are informational.
- Glyph tasks apply glyph substitution, extra spaces and redundant parentheses around integers; `·` and `²` are accepted by the
  checker but not used. Ambiguous problems are limited to the four listed forms.
