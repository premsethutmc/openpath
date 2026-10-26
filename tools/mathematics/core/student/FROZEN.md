# FROZEN: student-working test corpus

This corpus is frozen. Do not edit `student.json`; regenerate only with a new seed/version and a new hash.

- SHA-256 of `student.json`: `02002ae790c68a320fbebb9505c56cc63661cf462a13fd5501dd6c6639ebc414`
- Generator: `generate_student_set.py` v1.0, seed `20261026` (per-task RNG = `Random("<seed>-<stream>-<attempt>")`, deterministic; two runs give identical bytes)
- SymPy 1.14.0 (exact arithmetic, no floats); labelling engine `student_oracle.py`
- Tasks: 700; dropped at generation because SymPy disagreed with the intended label (or duplicate / reading-dependent): 118 (see `dropped.json`)
- Verify: `PYTHONPATH=/home/claude/vendor/sympy:/home/claude/vendor/mpmath python3 check_student_set.py` (exit 1 on any mismatch)

## Counts per family
| family | tasks |
|---|---|
| A | 150 |
| B | 350 |
| C | 70 |
| D | 50 |
| E | 40 |
| F | 40 |

## Counts per status
| status | tasks |
|---|---|
| ambiguous | 26 |
| invalid | 461 |
| unsupported | 40 |
| valid-complete | 145 |
| valid-incomplete | 28 |

## Counts per error class (family B; the 14 taxonomy ids)
(`arithmetic-slip` also labels the 14 family-E "readings agree" tasks, whose injected error is a constant slip in line 1.)

| class | tasks (all families with error_class set) |
|---|---|
| add-denominators | 25 |
| arithmetic-slip | 39 |
| cancel-additive-term | 25 |
| cross-multiply-straight | 25 |
| distribute-sign-error | 25 |
| divided-by-unknown-factor | 25 |
| drop-denominator | 25 |
| inverse-operation | 25 |
| one-sided-term-removal | 25 |
| partial-clearing | 25 |
| partial-distribution | 25 |
| partial-division | 25 |
| sign-error-moving-term | 25 |
| unbalanced-multiplication | 25 |

## Limitations
- One unknown x only; problems are K05.1 linear equations or K05.2 rational equations (denominators are products of linear factors or numeric; reduced numerator degree <= 1). Quadratic LINES occur only as intermediate steps of such problems and only when all roots are rational.
- Ground truth is semantic (solution sets over R minus excluded values), not a judgement of pedagogy. A step that merely shrinks a solution set is `invalid` unless it discharges an open obligation (`valid-discharge`).
- Lines are read on the problem's own domain; text claims (`no solution`, `all real numbers [except a, b]`) are the only non-equation lines besides `A or B` disjunctions.
- `final_verdict` is also filled for workings that are invalid at a step but whose last line states an answer (correct/incorrect against the true solution set).
- `unsupported` means "an exact evaluator must not certify": sqrt, trig, irreducible quadratics (irrational/complex roots), garbled text. For such tasks `first_invalid` is null; all lines before the unsupported one are valid (checked).
- `ambiguous` tasks (E): the verdict differs between the left-to-right reading `1/2x = (1/2)x` and the tight reading `1/2x = 1/(2x)`; both readings' verdicts are recorded under `expected.readings`. Only implicit multiplication directly after `/` is treated as ambiguous.
- Error positions k are concentrated at 1-3 (see `meta.first_invalid_distribution_B`); k=4,5 are rarer. Families are generated from templates, so surface variety is bounded by the template set (about 30 problem templates, 4 surface styles).
- Decimals appear only in a few family-A linear problems; 3-denominator-factor problems are not represented beyond two distinct linear factors plus their product.
- Not independent of the author's taxonomy: classes were injected by construction and verified by SymPy only to the extent that the injected step is non-equivalent.
