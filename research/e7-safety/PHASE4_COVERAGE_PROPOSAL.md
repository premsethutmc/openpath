# E7 coverage extensions — ranked proposal (Phase 4, not implemented)

The ranking weighs four things: the size of the audit abstention it removes (r1 counts, from `MATH_GENERALIZATION_FAILURE_ANALYSIS.md` §3.4 and the capability matrix), soundness risk, and effort. Every item keeps the existing AST and contracts, or extends them compatibly. Every item ships with the same four-case regression pattern as `e7-safety-invariants.test.ts`.

| # | Extension | Unlocks (audit evidence) | Soundness risk | Effort | Dependencies |
|---|---|---|---|---|---|
| 1 | **Notation front-end, mapping only.** Map `sec`/`csc`/`cot` to existing `cos⁻¹`, `sin⁻¹` and `cos·sin⁻¹` nodes, and `cbrt` to `root{index:3}`. Read `by <rule>:` prefixes and `Case …:` labels as annotations. Read `·` as multiplication. Read `x = a, b or c` as solution branches. | ~250 abstentions: ":" 102, branches 69, '·' 19, sec/cbrt false rejections CAL-0061 and DOM-0214, the 127 unrepresentable cases in part | Low. These are pure translations into existing nodes, refused whenever ambiguous. | S | none |
| 2 | **Trig argument normalisation.** Rewrite every sin/cos argument to `k·v + r·π` (integer k, rational r). Expand with angle addition, Chebyshev multiple-angle and a special-value table for denominators 1, 2, 3, 4, 6. After that the existing relation engine applies, and refutation becomes sound (bare-variable generators). | Trig family: 75 cases, 85% abstain. 7 true identities currently abstain. TRG category correct rate is 0.11. | Medium. The expansion is exact, but blow-up must be budgeted. | M | none |
| 3 | **Limits: read the stated value.** Parse `lim … = v`, `→ v` and "does not exist", and judge the value with the existing E6 limit kernel (rational and algebraic, at a point or at ±∞). | Limits: 145 cases, 90% abstain. 53 parser stops on `→`. 7 false rejections where the value is not read (LIM-0057…). | Low to medium. The kernel already exists; this is only the reader. | M | 1 |
| 4 | **Interval assumptions.** Add `{kind:"interval", lower, upper, open…}` to `SymbolicAssumption`, as a compatible union member. Discharge sign and nonzero conditions of linear and trig factors on the interval, building on the linear-order rule added in F5. | DOM-0147, DOM-0153, TRG-0094, ADV-0073 (trig poles); also the order chains left in F5 | Medium. Sign over an interval needs exact root isolation; univariate `Poly` support exists. | M | 2 (for trig poles) |
| 5 | **Cited rules in natural text.** Bind "by the X rule" / "using X" to the step and reuse the typed route's `ruleLabelVerdict` (E7 repair D). Today it applies only to typed derivative steps. | 7 policy false acceptances (CAL-0104 …) and 61 cited-reason cases, 70% abstain | Low, if a contradicted citation yields *invalid* only when the rule provably cannot produce the step. | S–M | owner decision F8 (is a wrong citation invalid or an obligation?) |
| 6 | **Case analysis and piecewise.** Read `Case <condition>:` blocks as branches. Each branch is checked under its condition as a premise (the F6 premise machinery); then the conditions are checked to cover the domain, and the union of branch answers is compared with the solution set. | Case analysis / piecewise / abs: 81 cases, 75% abstain | Medium. The coverage proof is exact for univariate conditions. | M–L | 1, 4 |
| 7 | **Symbolic exponents and log bases** (`2^x`, `log_b`). Represent `a^u` as `exp(u·ln a)` for constant `a>0`, and `log_b` as `ln/ln b`. This is a compatible encoding with no new node kinds. | 55 "power exponent must be a bounded integer" refusals; unrepresentable log bases | Medium. Domain bookkeeping for the base and for `ln b ≠ 0` is needed. | M | none |
| 8 | **Multi-variable answer-first and trig/exp/log equations.** Periodic solution families exist in the typed contract but not in answer-first. | 151 answer-first scope exits | High. This needs a sound periodic-family set relation. | L | 2, 7 |

## Recommended order

1 → 3 → 2 → 4 → 5 (after the F8 decision) → 6 → 7. Item 8 is deferred.

Items 1 and 3 are mostly readers in front of existing exact kernels, so they carry the least soundness risk per abstention removed. Item 2 is the largest single coverage gap, and it is also what makes trig refutation sound again: after the F3 repair, trig mismatches abstain.

## Decisions needed before Phase 4

- **F7 (lost solutions):** keep the E2 contract (`incomplete`) or switch the default to `invalid`. The switch is implemented and measured (`REPORT.md`).
- **F8 (unstated restrictions, unchecked candidates, cited reasons):** `implicit` everywhere, `shown` everywhere, or a per-assessment option that also covers expression simplifications. Item 5 depends on this.
- **Bare `log`:** natural log (current), base 10, or refuse as ambiguous.
