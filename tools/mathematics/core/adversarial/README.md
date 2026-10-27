# Held-out adversarial corpus (family H)

Files: `adversarial.json` (`{"tasks":[...]}`, 413 tasks), `generate_adversarial_set.py` (seed 20261027, deterministic, byte-identical reruns verified), `check_adversarial_set.py` (recomputes every label, exit 1 on any mismatch/duplicate/small category/hash drift), `adv_oracle.py` (labelling engine, written from scratch, SymPy only), `adv_templates1.py`/`adv_templates2.py` (hand-designed templates), `dropped.json`, `FROZEN.md`.
Nothing here reads or imports the evaluator under test, `packages/`, any `*.ts`, or the other corpus' generator/oracle/json. Only the other corpus' README was read, for record format and label semantics. If `sympy` is not importable the oracle falls back to `/home/claude/vendor/sympy` and `/home/claude/vendor/mpmath`.

## Record (same schema as the student corpus)
`{id, family:"H", category, problem, lines[], expected{status, first_invalid, invalid_at, error_class, final_verdict, step_flags, step_labels, [unsupported_lines], [readings | readings_agree]}, truth{solution_set, excluded}, notes}`.
Value conventions the other README leaves open (my choices):
- `first_invalid`: 1-based line index or null. `invalid_at`: `"step"` or `"final-claim"` or null. `error_class`: `none|step|final-claim|unsupported|ambiguous`.
- `final_verdict`: `correct|wrong|no-claim` (null when unsupported/ambiguous).
- `step_flags`: `[{line, label}]` for valid-with-obligation / valid-discharge lines.
- `truth.solution_set`: `{kind:"finite"|"all-reals-except", values:["p/q",...]}`; `excluded`: original-domain exclusions.
- Ambiguous tasks whose two readings give different results: `expected.status="ambiguous"`, `step_labels=null`, `expected.readings={lr:{...},tight:{...}}` each a full result. Tasks where they agree: ordinary expected fields plus `readings_agree:true`. All other tasks are required to agree under both readings (otherwise dropped).
- `notes`: `template=<tag>; style=<explicit|implicit|spaced|unicode>`. Problems always use the explicit grammar; lines are rendered in the four surface styles (ambiguous-notation lines are raw: explicit or spaced only).

## Label rule (re-derived)
Domain of a line = R minus real zeros of every x-containing denominator of the ORIGINAL problem (read from the parse tree, so `(x-2)(x+2)/(x-2)` still excludes 2) plus the line's own denominators. Solution set = real roots of the numerator of `cancel(together(L-R))` (all irreducible factors must be linear, else `unsupported`) minus the domain; identity gives R minus domain; `A or B` is the union. Step prev->cur: `equivalent` iff sets equal; strictly larger = `valid-with-obligation`; strictly smaller while an obligation is open and cur is still a superset of the true set = `valid-discharge` (obligation closes when cur equals the true set); everything else `invalid`; first unsupported line then `not-assessed`. Line 1 is judged against the problem. Final claims (`x = c`, `x=a or x=b`, `no solution`, `all real numbers [except a, b]`) are compared literally with the true set. Status precedence: unsupported > invalid(step) > invalid(final-claim) > valid-complete / valid-incomplete.

Two independent routes per line: (A) numerator roots via `factor_list`; (B1) `solveset` on the cleared polynomial; (B2) exact `Fraction` substitution of every claimed root plus a 280-point grid (integers, halves, thirds, quarters) through a separate AST evaluator. Disagreement raises and the task is dropped to `dropped.json` (none occurred in the final run; the 10 drops are all `intent-mismatch`, i.e. SymPy outcome differed from the template's intended status, e.g. a coincidentally correct "wrong" working or an irreducible quadratic).

## Reading modes
`lr`: strict left to right (`1/2x=(1/2)*x`). `tight`: a juxtaposed product after `/` belongs to the denominator (`1/2x=1/(2*x)`, and also `1/(x+1)(x+2)=1/((x+1)(x+2))`). Every task is labelled under both.

## Conventions / resolved ambiguities
- A step collapsing a finite set to a cofinite one (e.g. multiplying by constant 0 giving `0=0`) is labelled `invalid`, not `valid-with-obligation`, as the brief requires (see deviations).
- Dividing both sides by `(x-a)` when `a` is also a root of the remaining equation loses nothing, so it is `equivalent` (kept as a harmless-division control inside invalid-division, 8 tasks).
- Multiplying by `(x-a)` where `a` is an excluded value of the original is `equivalent` (the domain already removes `a`); obligations only arise when the multiplier's zero is inside the original domain.
- A claim line `x = c` is itself a step: its set is `{c}` minus the domain, so `x = 2` with 2 excluded is equivalent to "no solution" as a step but wrong as a final claim.
- Unknown letters, `==`, `sqrt/√/abs/log/ln/sin`, `x^2` or products with irreducible nonlinear factors -> `unsupported`.
- `(x^2-a^2)/(x-a)` forms appear; all other x^2 occurrences are products of rational-root linear factors.

## Deviations from the student README
1. Collapse rule above (finite -> `0=0`-type cofinite is `invalid`).
2. Unreadable input (unknown letters, `==`) is labelled `unsupported`, not a separate "unreadable" class, per the brief.
3. Value spellings listed under Record are my own where the README is silent.
4. Oracle is shared by generator and checker (checker re-runs both routes; it is not a separately written implementation).

## Limitations
Roots must be rational; only one variable; irrational/complex analysis is out of scope (unsupported). The grid check is finite, so route B2 is a strong but not exhaustive check of absence of extra roots (B1 closes that gap for finite sets). Templates are hand-designed, so shapes beyond them (3+ nested fractions, exponents above 2, mixed `or` working lines) are not covered. Only 6 valid-incomplete tasks. Dedup is on (problem, explicit lines); style variants of one working are not duplicated.

## Counts
Total 413. Per category (all with >=30): domain-change 41, extraneous-root 41, cancellation 41, multiplication-by-zero 41, invalid-division 41, rational-expressions 41, ambiguous-notation 44 (30 differing-reading, 14 `readings_agree`), alternative-paths 41, correct-controls 41, unsupported 41.
Per status: valid-complete 221, invalid 115, unsupported 41, ambiguous 30, valid-incomplete 6.
Per category/status: AP valid-complete 41; AM ambiguous 30 / valid-complete 13 / invalid 1; CA invalid 20 / valid-complete 21; CC valid-complete 38 / valid-incomplete 3; DC invalid 15 / valid-complete 26; EX invalid 14 / valid-complete 27; ID invalid 33 / valid-complete 8; MZ invalid 14 / valid-complete 24 / valid-incomplete 3; RE invalid 18 / valid-complete 23; UN unsupported 41.
Step labels: equivalent 774, invalid 100, not-assessed 44, unsupported 41, valid-with-obligation 30, valid-discharge 16.
