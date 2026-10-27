# Student-working corpus (independent, frozen)

Files: `student.json` (corpus), `generate_student_set.py` (seeded generator), `student_oracle.py` (labelling engine shared by generator and checker), `check_student_set.py` (recomputes every label, exit 1 on mismatch), `dropped.json`, `FROZEN.md`.
Nothing here reads or imports the evaluator under test or anything in `packages/`. SymPy is the only oracle. If `sympy` is not importable the oracle falls back to `/home/claude/vendor/sympy` and `/home/claude/vendor/mpmath` via `sys.path`.

## Record
`{id, family, problem, lines[], expected{status, first_invalid, invalid_at, error_class, final_verdict, step_flags, step_labels, [unsupported_lines], [readings | readings_agree]}, truth{solution_set, excluded}, notes}`.
`step_labels[i]` (one per line; line 1 is judged against the problem): `equivalent`, `valid-with-obligation` (new set strictly larger, e.g. multiplied by an expression not excluded), `valid-discharge` (set shrinks back to a superset of the true set while an obligation is open: the "check rejects the candidate" step), `invalid`, `unsupported`, `not-assessed` (follows an unsupported line). `step_flags` lists only the obligation/discharge entries.

## Labelling rule (all exact, SymPy)
Domain = R minus the real zeros of every x-containing denominator of the ORIGINAL problem (read from the unevaluated parse, so `(x-2)(x+2)/(x-2)` still excludes 2), plus the zeros of the line's own denominators. Solution set of a line = real roots of the numerator of `together(L-R)` (all irreducible factors must be linear, else the line is `unsupported`) minus the domain's excluded values; `A or B` is the union; `0=0` gives R minus excluded values. A step prev->cur is `equivalent` iff the two sets are equal. Final claim: last line `x = c` / `x = c or x = d` / `no solution` / `all real numbers [except ...]` is a literal claim compared with the problem's true solution set (so `x = 2` is wrong when 2 is excluded). Status: unsupported > invalid(step) > invalid(final-claim) > valid-complete / valid-incomplete (no claim on the last line). Intent never decides a label: tasks whose SymPy outcome differs from the intended one are dropped and logged.

## Documented normalisation (student text -> SymPy), implemented in `student_oracle.normalise`
1. Unicode: `−–—` -> `-`, `× · ⋅` -> `*`, `÷ ∕` -> `/`, `² ³` -> `^2 ^3`. Spaces are free between tokens; two numbers separated by a space, `x` followed by a number or `x` are unreadable.
2. Tokens allowed: decimals/integers, `x`, `+ - * / ^ ( ) =`. Anything else (other letters, `?`, `==`, ...) is unreadable; `sqrt, √, sin, cos, tan, log, ln, π, abs` is unsupported. Exactly one `=` per equation; disjunctions are written ` or `.
3. Decimals become exact rationals (`0.15` -> `(15/100)`). `^` -> `**`; exponents must be non-negative integer literals.
4. Implicit multiplication is inserted between number/`x`/`)` and a following `x`/`(` (and `)` and a number). Two readings exist: `lr` (strict left to right, `1/2x = (1/2)*x`) and `tight` (a juxtaposed product after `/` belongs to the denominator, `1/2x = 1/(2*x)`). Every task is labelled under both; they must agree except in family E.
5. Problem texts use only the explicit grammar (explicit `*`, no unicode, no juxtaposition). Student lines are rendered in 4 surface styles (explicit, implicit multiplication, + spaces, + unicode).

## Families
A valid alternative routes (incl. valid-incomplete, no-solution/identity, excluded candidate correctly rejected); B single-error workings (14 classes, consequential or recovering tails); C every step valid but final claim wrong; D obligation steps followed by a check (valid-complete) or an accepted extraneous candidate (invalid, final-claim); E ambiguous notation (+ agreeing cases); F unsupported lines.
