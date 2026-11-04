# 08 Remaining unsupported mathematics (honest list)

Each of these is refused or reported unsupported. None is reported invalid unless an exact counterexample exists.

| Family | Status | Why it is not certified |
|---|---|---|
| Two or more operations in one line (clear fractions and expand; divide and swap; move two terms) | unsupported (`no-registered-equation-move`) | One operation per line is the authorization policy. Allowing a single equivalence of any size would also certify answer jumps (`x/6 − 1 = 4` → `x = 30`), which the frozen labels call unjustified. It is the largest remaining gap: most valid-but-unsupported held-out items. **Whether to relax it is a policy decision (09).** |
| Radicals (`sqrt`, principal-root assumptions), logarithms, exponentials | unsupported (task or line unparsed) | The authority's expression parser has no root or log node. Squaring is supported only for polynomial sides. Adding radicals needs a parser and kernel extension with branch (principal-root) tracking: real work, not attempted. |
| Systems of equations; several variables in a solution-set comparison | unsupported | `solution-sets@1` is univariate. Multivariate validity would need resultants or Gröbner bases. Several-variable expressions are still compared by the kernel. |
| Compound inequality answers (`−3 < x < 3`, `x < −2 or x > 3`) and rational inequalities with variable multipliers of unknown sign | unsupported | No compound-relation line form. A variable multiplier needs a provable sign (refused otherwise, never assumed). |
| Irrational solution sets as conclusions (`x = 1 ± √2`) | unsupported | No radical notation. Lines that lose an irrational root ARE refuted, with an isolating interval. |
| Approximate answers (`x = 1.41 or x = −1.41`) | unsupported (`approximate-values`) | Exact mathematics says they are not solutions. Whether a rounding is acceptable is a marking decision. |
| Rewrites the registry does not register (some arithmetic decompositions, `rewrite-replay-failed`, `kernel-replay-failed` for some rational simplifications) | unsupported | Unchanged from Milestone 2. |
| Degree above 12, coefficients above 2^512 | outside the surface | Resource bounds of the exact engine. |
| Geometry calculation lines (`natural-geocalc-e5`) | unchanged | Still the older task-fact provenance (a Milestone 2 disclosure). |
| The 41 P2-FINAL skipped E7 tests | still skipped | Vieta and discriminant formulas, radicals, systems, claim ledger assumptions, complex numbers, combinatorics conventions (01). |
| Expression-task completeness | partial | "Complete" means a closed numeral, an expanded-collected polynomial or a factored form. Other simplified forms (for example a reduced rational expression) are reported `incomplete`. |

## Rules considered and left out (could not be made sound or general)

| Rule | Why left out |
|---|---|
| Accept any exact equivalence as one step | Sound, but it erases the derivation / answer-jump distinction (see above). |
| Treat squaring as an equivalence when the solution sets happen to coincide | It is still an implication by construction. It is recorded as `implication:square`, and the relation is reported separately. |
| Read `1/2x` as `(1/2)x` by precedence | Two readings exist, so it is refused (`notation@1`). |
