# Authoring rules for the generalization benchmark

You are writing benchmark cases that will later be run against an engine under test (E7). **Independence rules (strict):**
- Do not read, import or run anything under `packages/`, `frontend/`, `backend/`, `tools/mathematics/generalization-e7/`, any `MATH_E7_*`/`E7_*` report, or the branch `feat/math-transition-sympy-evaluation` / `research/sympy-transition-eval/`. Do not reuse any existing test labels. Derive every expected answer from mathematics.
- Never tune a case to what an engine might accept. Write what a real student would write, in ordinary notation.

## Where and how
- One module per category: `bench/categories/<prefix>_<name>.py` (e.g. `alg_equivalence.py`). Start with `from schema import T, W`.
- `T(cat, principle, invariant, prev, next, kind, relation, why=..., ...)` — single transition. `kind`: `"statement"` (equations/inequalities in ONE real variable, compared as solution sets over the reals, natural domains respected) or `"expression"` (expressions compared as real functions on their natural domains).
- `W(cat, principle, invariant, task, working_lines, relation, why=..., answer=..., oracle_lines=..., ...)` — multi-line working. See `schema.py` docstring for task shapes.
- Required for every case: `principle` (the specific mathematical principle), `invariant` (the invariant/capability challenged, e.g. "solution-set preservation", "natural-domain preservation", "sign of multiplier in inequalities", "constant of integration", "case-scope propagation"), `why` (independent justification), `difficulty` (easy/medium/hard), `complexity` (1–5), and for W an `answer`.
- Optional: `assumptions=[...]` (e.g. `"x > 0"`, `"x != 1"` — single-variable, linear constraints only), `pair="<group>"` (minimal pairs: nearly identical cases with different verdicts — aim for ≥ 25 % of cases in pairs), `composition=True` (an unfamiliar combination of ≥ 2 principles), `notation="unfamiliar"` (unusual but legitimate notation; then give canonical `oracle_prev`/`oracle_next` or `oracle_lines`), `truth=` (required for `unsupported`: "valid"/"invalid"/"unknown").

## Relations (8-way; do not collapse)
| relation | T meaning | W meaning (expected verdict) |
|---|---|---|
| valid-equivalence | same set / same function on the same domain | fully correct, complete working (verified) |
| valid-implication | prev ⇒ next only (e.g. squaring) | correct working that uses a one-way step soundly, e.g. squaring + check (verified) |
| invalid | exact counterexample exists | some line false, or wrong final answer (invalid) |
| incomplete | — (W only) | nothing false, task unfinished (incomplete) |
| domain-violation | expression rewrite that is only valid after a restriction the student did not state (e.g. cancel x−1) | correct answer but an obligation is skipped: denominators cleared / factor cancelled without stating excluded values, extraneous candidate dropped with no visible check, antiderivative without +C or valid only on part of the domain (missing-assumption) |
| wrong-reason | — | correct result, but the cited rule/reason is wrong (e.g. "by the power rule" for a chain-rule result) (invalid) |
| insufficient-information | ambiguous notation (`1/2x`, `6/2(1+2)`, bare `log`), or a parameter condition left open (`ax=b → x=b/a`) | answer requires an unstated condition (missing-assumption) |
| unsupported | — | proof-style or out-of-scope mathematics (series tests, induction, epsilon-delta, convergence arguments); record `truth` (abstain) |

## Notation the oracle reads (keep `oracle_*` text within this)
`^`, implicit multiplication (`2x`, `x(x+1)`), `sqrt(...)`, `cbrt(...)`, `|...|`, `ln(...)`, `log2(...)`, `log10(...)`, `exp(...)`, `e^(...)`, `sin cos tan sec csc cot asin acos atan`, `sin(x)^2` or `sin^2 x`, `pi`/`π`, `±`, `!=`/`≠`, `<= >=`/`≤ ≥`, chained `a<x<b`, `or`/`and`/`,` between statements, `x = 1, 2 or -2`, factorials `5!`, `d/dx(...)` (derivative w.r.t. x; other letters are constants). **Not readable by the oracle**: bare `log`, `a/bc` juxtaposition (both are deliberately *ambiguous*), integrals `∫`, `lim`, sums Σ, words. Variables are single letters.

## oracle_lines conventions (W)
One entry per working line, aligned with `working`:
- `None` — prose or a line the oracle should ignore (checks like "check x=-1: sqrt(1)=1 ≠ -1, reject" can be None; the oracle detects check words in the raw text).
- solve/system tasks: a statement about the variable (`"x=2 or x=-1"`), `"empty"` (no solution), `"claim: <closed true/false statement>"` (side arithmetic, e.g. `"claim: 3^2=9"`), `"restrict: x != 1 and x != -1"` (a stated restriction), `"scope <cond> | <statement>"` (a case line, e.g. `"scope x>=2 | x-2=3"`).
- expression tasks (simplify/expand/factor/evaluate/show): each entry is the next expression in the chain (write only the new right-hand side), or `"claim: A = B"` for a side identity, or `"restrict: x != 0"`.
- calculus tasks: `"claim: A = B"` (an identity in the variable, may use `d/dx(...)`), and exactly one `"final: <answer>"` (for indefinite integrals include `+ C` only if the student wrote it).

## Quality bar
- Every case tests an identifiable principle, interaction or failure mode. **No padding**: do not produce many numeric substitutions of one problem; vary structure (function families, where the singularity sits, which step is wrong, chain length, notation, assumptions). Count distinct principles honestly.
- Mix single transitions and multi-line workings (chain lengths 2–10), easy/medium/hard, and both valid and invalid cases (roughly balanced). Include unfamiliar compositions of individually familiar operations.
- Run `python3 bench/build.py --only <prefix>` (from `research/generalization-audit`). Every case must be `agree`, or `policy` (for wrong-reason/insufficient-information/unsupported), or `uncertified` only where the oracle genuinely cannot decide (state why in `why`). **Fix your case or your label if the oracle disagrees — after checking the mathematics by hand.** If you believe the oracle is wrong, keep the mathematically correct label, add `"[oracle-dispute] <reason>"` at the end of `why`, and report it.
