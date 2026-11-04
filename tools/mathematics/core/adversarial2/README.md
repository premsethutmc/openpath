# adversarial2: second held-out corpus (family H2)

Files: `adversarial2.json` ({"tasks":[...]}), `generate_adversarial2.py` (seed 20261028, byte-identical reruns),
`check_adversarial2.py` (recomputes every label, exit 1 on mismatch; `--regen` also checks reproducibility),
`dropped.json`, `FROZEN.md`. Nothing here reads or imports the evaluator, `packages/`, any `*.ts`, the first
adversarial corpus, previous results, or the student-set generator/oracle/json. SymPy is the only oracle
(falls back to /home/claude/vendor/sympy and mpmath).

## Record
`{id, family:'H2', category, problem, lines[], expected{status, first_invalid, invalid_at, error_class, final_verdict,
step_flags, step_labels, [unsupported_lines], [readings | readings_agree]}, truth{solution_set, excluded}, notes}`.
- `status`: valid-complete | valid-incomplete | invalid | unsupported | ambiguous.
- `first_invalid`: 1-based index of the first invalid line. An invalid final claim with all steps valid gives
  `invalid_at:'final-claim'` and `first_invalid` = index of the claim line; a step error gives `invalid_at:'step'`.
  A wrong claim line that is itself an invalid transition is reported as `'step'`.
- `step_labels` per line: equivalent | valid-with-obligation | valid-discharge | invalid | unsupported | not-assessed.
  `step_flags` = `[{line, flag}]` for obligation/discharge lines only.
- `final_verdict`: correct | wrong | no-claim, from the LAST line read literally (independent of earlier errors).
- `error_class`: the intended error family (informational; null unless status is invalid).
- `truth.solution_set`: `{kind:'finite', values:[...]}` or `{kind:'all-except', except:[...]}`; `excluded` = real zeros of the
  x-containing denominators of the problem. Fractions are strings such as "-7/6".
- Ambiguous tasks (left-to-right vs tight-denominator readings differ in status, first_invalid, invalid_at or
  final_verdict): `status:'ambiguous'`, `step_labels/step_flags/first_invalid/invalid_at/final_verdict/error_class` null,
  `readings:{lr:{status, first_invalid, invalid_at, final_verdict, step_labels}, tight:{...}}`. Agreeing controls carry a
  normal status and `readings_agree:true`. Every non-ambiguous task is labelled under both readings and kept only if identical.

## Semantics
Domain of a line = reals minus real zeros of every x-containing denominator of the ORIGINAL problem plus the line's own
denominators (divisors read from the parse, so `(x-2)*(x+2)/(x-2)` excludes 2). A line's solution set = real roots of the
numerator of together(L-R) minus the domain; `A or B` is a union; `0=0` gives all reals minus the domain. prev->cur:
equal sets = equivalent; strictly larger = valid-with-obligation, except finite -> all-reals-minus-finite (collapse, e.g. multiplying
by 0) = invalid; strictly smaller = valid-discharge only if an obligation is open, prev is a finite set and cur still contains the
true set, otherwise invalid; incomparable = invalid. An obligation stays open until a line equals the true set. Final claims
(`x = c`, `x = a or x = b`, `no solution`, `all real numbers [except a, b]`) are compared literally with the true set, so `x = 2` is
wrong when 2 is excluded. Because the original exclusions apply to every line, rejecting an originally excluded root is
label-invisible (equivalent), while an introduced factor (squaring, multiplying by (x-a)) produces a real obligation/discharge.
Unsupported (sqrt, unknown letters, `==`, trig, abs, `?`, anything unreadable, irrational-root lines) beats invalid; lines after the
unsupported one are `not-assessed`; each unsupported task has exactly one unsupported line, valid before it.

## Surface styles and normalisation
Problems use the explicit grammar. Student lines mix: explicit `*`, implicit multiplication (never after `/`, so both readings agree
except in ambiguous tasks), odd spacing, unicode (`−`, `–`, `×`, `·`, `⋅`, `÷`, `∕`, `²`), decimals, nested brackets, and claims in
many styles (`x = (25/36)`, `x = − 8`, `(38 ÷ 33) = x`, `x = -7/6`, `x = 2.5`, `-5 = x`). Bare numbers are not used as claims.
Implicit multiplication between number/x/`)` and `x`/`(` (and `)` and a number); `lr` reads strictly left to right, `tight` lets
a juxtaposed product after `/` join the denominator.

## Counts (440 tasks)
| category | n | statuses |
|---|---|---|
| domain-change | 44 | invalid 18, valid-complete 26 |
| extraneous-root | 44 | invalid 24, valid-complete 20 |
| cancellation | 44 | invalid 38, valid-complete 6 |
| multiplication-by-zero | 44 | invalid 25, valid-complete 19 |
| invalid-division | 44 | invalid 33, valid-complete 11 |
| rational-expressions | 44 | invalid 34, valid-complete 7, valid-incomplete 3 |
| alternative-paths | 44 | valid-complete 33, valid-incomplete 11 |
| correct-controls | 44 | valid-complete 32, valid-incomplete 12 |
| ambiguous-notation | 44 | ambiguous 28, invalid 6, valid-complete 10 |
| unsupported | 44 | unsupported 44 |

## Limitations
- Templates are constructive and hand-designed, so almost every candidate survives; the drop log is empty for this seed
  (`dropped.json` still records generation statistics: candidates, redraws). Redraws inside a template (no rational roots,
  degenerate error) are not individually logged.
- Degree is at most 2 after clearing; quadratic cases only with rational roots. Large coefficients (up to 60) occur mostly in linear
  and constant-denominator cases.
- Ambiguous tasks are built from p/q(x+s), p/qx, k/m(x-a)(x-b)=0, and factor-1 agreeing controls; agreeing controls are narrower
  than the ambiguous set.
- The generator imports the checker's `route2` to enforce the two-route agreement; the two label routes are separate implementations
  (generator: AST->SymPy roots; checker: Fraction substitution on a critical-point grid cross-checked with solveset).
  Both share the same semantic spec written by one author, so a shared misreading of the spec would not be caught.
- Same-verdict-but-different-step-label ambiguous candidates would be dropped; the semantics of an open obligation after a partial
  discharge is a documented choice (stays open until the set equals the truth).
