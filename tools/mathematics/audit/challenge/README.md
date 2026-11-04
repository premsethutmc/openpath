# K05.2 challenge suite (independent audit)

`suite.json` holds 145 equations for the domain-aware rational-equation engine. Each record has `id, category, text, label, class, solution, excluded, why`, plus `reasons[]` (boundary reason codes), `truth` (exact mathematical answer even when the engine is expected to refuse) and `override` (true only where the label was set by hand).

Files: `reference.py` (exact solver and boundary classifier), `build_suite.py` (authoring list and builder; prints the self-check), `suite.json`. Rebuild with `python3 build_suite.py`; re-verify with `python3 reference.py --verify`.

## Labels
- `supported`: inside the documented boundary (milestone doc section 5). `class` is `unique`, `none` or `identity-on-domain`; `solution` is a list of rationals as strings; `excluded` is the list of rational excluded values.
- `unsupported`: clearly outside. `class` is `out-of-scope`, `solution`/`excluded` are null, `reasons` lists codes (`no-variable-denominator`, `denominator-outside-boundary`, `numerator-outside-boundary`, `reduced-degree>=2`; also `syntax-rejected`, `undefined-expression`, `outside-grammar:*`). `truth` still records the real answer, so a wrong answer on an unsupported equation can be detected.
- `ambiguous`: the documented boundary does not clearly decide (terms exceed the limits but the equation reduces inside them, nested or distributed fractions, `x^0`, `x^-1`, coefficients >= 10^6, spaces inside numbers, multiple `=`). `class/solution/excluded` give the exact truth if the engine accepts; a refusal is also defensible. Do not count either behaviour as a failure unless the answer is wrong.

## Categories
syntax_equiv, rule_order, greedy_trap, expansion, restricted_identity_empty, repeated_multi_excl, removable, candidate_excluded, lookalike_factors, near_boundary, irrational, outside_boundary, no_var_denominator, parser_stress, const_times_x, ambiguous_shape. Most mixed categories hold about 6 supported, 1 unsupported and 1 ambiguous variant of the same idea.

## How expected values were derived
`reference.py` parses the text with a parser that mirrors `expr-text.ts` (whitespace stripped, no implicit multiplication, no unary plus, left-associative `* /`, right-associative `^`, exponent is a unary expression). It evaluates the unevaluated tree into a rational function with its own `Fraction` polynomial arithmetic (add, multiply, division with remainder, gcd), recording the numerator of every divisor and the base of every negative power. Excluded set = real roots of those polynomials (rational roots by the rational-root theorem, other real roots counted by a Sturm sequence). Solution = root of the reduced numerator of L - R, minus the excluded set; zero numerator gives `identity-on-domain`, a nonzero constant gives `none`. The boundary label is computed by walking the written terms (flatten top-level sums, then numerator/denominator factor lists) against section 5, and comparing with the fully reduced function for the ambiguous case. The author's intended label is checked against the computed one; the only manual overrides are two ambiguous cases flagged `override`.

Independent self-check: every record is re-checked by direct exact evaluation of the text (no polynomial algebra) on a grid of 289 rationals: defined exactly off the excluded set, equation true exactly on the solution set (or everywhere defined for identities), and each claimed solution satisfies the original. SymPy was optional and is not installed in this environment, so no SymPy cross-check was run (`sympy_check` in `reference.py` exists but has never been run).

Assumption: an equation text is split on `=` into exactly two sides.
