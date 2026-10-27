# Independent adversarial suite (r1)

Files: `suite.json` (cases), `reference.py` (exact reference solver, `fractions.Fraction`, own polynomial
arithmetic, no SymPy and no engine code), `build_suite.py` (builds `suite.json`; every expected value is computed by
`reference.py`, never typed in or taken from the engine). Run `python3 build_suite.py` to regenerate.

## Case schema
Common: `id`, `defect` (D1..D4), `kind`, `why`, `tags`.
* `equation`: `text`, `must_answer`, `must_refuse`, `expect`.
  * `must_answer: true` -> `expect = {class, solution, excluded}`; class is `unique` | `none` | `identity-on-domain`;
    `solution` is a sorted list of rationals (`"n"` or `"p/q"`; `[]` for none, `null` for identity); `excluded` sorted.
  * `must_refuse: true` -> any answer fails; the response must be a structured refusal whose code is in `expect.refusal`.
  * both false ("flex"): the case sits on an ambiguous edge of the documented scope (nested denominators, `x^0` with no
    real denominator, reduced degree 2 that splits, very long inputs). The response must be EITHER a structured refusal
    (any code in `expect.refusal`) OR exactly `expect.if_answered`. A crash, or a wrong answer, fails.
  * Scope label is computed by `reference.auto_scope`: no nested denominators, >=1 x-containing denominator, every
    denominator splits into rational linear factors (<=3), every additive term numerator has degree <=2 and splits,
    reduced numerator degree <=1. Anything else that is still answerable is flex.
* `step`: `from`, `to` (`{eq, excluded:[p/q strings]}`), `effect`, `truth`, `reason`.
* `oracle`: `text`, `expect = {class, solution, excluded}` (decimal literals must be read as exact rationals).

## How truths were derived
* Parse the written tree. Every `a/b` records `b != 0`; every `base^k` with k <= 0 records `base != 0` (so `x^0` needs
  `x != 0`, `x^-1*x=1` is identity on R minus {0}); sub-expression conditions are inherited, nested conditions are
  expressed through the divisor's numerator polynomial (`1/(1/x)` -> x != 0 only via the inner 1/x; `1/(x-1/x)`
  -> {-1,0,1}). `excluded` = union of rational roots of all conditions. A divisor that is identically 0 (`x/0`,
  `1/(x-x)`, `0^0`, `0^-1`) -> DOMAIN_UNRESOLVED.
* Solve `L=R` as `N/D=0` with `N = Ln*Rd - Rn*Ld`. Solutions = rational roots of N not excluded. N identically 0 ->
  identity-on-domain (never "all reals").
* Steps: a state is `(eq, excluded)`; it is CLOSED iff excluded contains every zero of every written denominator.
  Extra excluded values are treated as carried restrictions (they remove points from the solution set). The state's
  solution set is (roots of N or all reals) minus excluded. `valid` iff both states closed and the sets relate as claimed
  (equal for `equivalence`, subset for `implication`). A non-closed from- or to-state is `invalid`. Cases whose truth
  depends on a policy ("a step may not drop a restriction even when the sets still agree") were deliberately left out;
  dropped restrictions appear only where dropping changes the solution set.
* Refusal codes for D3 follow the task statement. Tokenisation-level problems (letters, `2x`, `2(`, `.5`, `1e0`,
  `2.`, unary `+`, `=`-count, whitespace between digits, unbalanced brackets, empty sides) -> PARSE_ERROR. Functions,
  `!`, `|x|`, x in an exponent, non-integer exponent -> UNSUPPORTED_OPERATOR. `foo(x)` accepts either code.
* Out-of-scope but well-formed (`x+1=2`, 4-factor denominator, numerator degree 3, reduced degree >=2 with irrational
  roots, `x^-4`) -> UNSUPPORTED_EXPRESSION; complex/irrational poles accept DOMAIN_UNRESOLVED or UNSUPPORTED_EXPRESSION.

## Categories
D1 negative/zero exponents and nested denominators (answered, flex, refusals); D2 step validity (valid and invalid,
tags `neg-exp`, `nested`); D3 malformed input (look-alikes `d3-ok*` must be answered; `d3-long*` are size stress);
D4 exact decimals (`oracle` plus three `equation` cases).

## Conventions chosen (ambiguous in the task)
Unary minus is only used immediately after `^` or at the start of an exponent parenthesis; `x^0.5`-style and
chained `^` are not tested for answers; `x^0=1` (no real denominator) is flex; integers in answers print as `n`.
