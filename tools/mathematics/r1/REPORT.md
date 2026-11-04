# R1 soundness repairs: short report

Branch `fix/r1-soundness` (base: audit branch of PR #78, commit `6999970`). Frozen datasets, hashes and acceptance thresholds are unchanged (`git diff 6999970 -- tools/mathematics/domain-reasoner/frozen tools/mathematics/reasoner/frozen` is empty). No merge, no deploy, Grade 5 pipeline untouched.

## Defects: reproduced, fixed, tested

| # | Defect | Reproduced before (pristine code, preserved in `results/*-before.json`) | Fix | Independent tests |
|---|---|---|---|---|
| 1 | Negative exponents gave no restriction | `1/(x-1)-1/(x-1)=x^-1*x-1` answered identity with restriction {1} only (true: all reals except 0 and 1); 27 of 53 negative-exponent cases falsely refused as "no variable denominator", 22 uncoded | `conditionsOf` / `denominatorsOf` / `zerosOfDenominators` in `domain/domain-state.ts` rewritten as one general extraction over the WRITTEN tree: every divisor numerator (nested ones too), bases of negative and zero powers; exponents must be constant integers; anything else is refused. Also `x^0` fixed in `RatFun.fromExpr` (`poly.ts`) | `adversarial/suite.json` D1 (53 cases), `audit-cases.json`, `domain/r1-regression.test.ts` |
| 2 | Checker accepted an invalid starting state | 9 of 42 D2 steps accepted wrongly, e.g. `(x^2-1)/(x-1)=2 [] -> x+1=2 []` | `verifier/verifier.ts` `checkStep` validates BOTH states (closure of from and to), plus `checkTrace` validates the original text, the initial restrictions, every step and the final claim; `solve()` runs `checkTrace` on every trace and compares the engine's initial restrictions with an independent derivation | D2 (42 cases: 21 valid, 21 invalid), `r1-regression.test.ts` |
| 3 | Unsupported syntax crashed | 32 crashes and 14 uncoded refusals in 57 D3 cases; `1 0/(x-1)=10/(x-1)` silently read as 10 and answered | `outcomes.ts` (`Refusal`, codes PARSE_ERROR, UNSUPPORTED_OPERATOR, UNSUPPORTED_EXPRESSION, DOMAIN_UNRESOLVED, PROOF_FAILED, SEARCH_LIMIT); parser in `expr-text.ts` raises structured refusals, rejects whitespace inside numbers, unbalanced or too deeply nested brackets; `solve()` returns `class "refused"` with `outcome`, never throws, and reports an internal error as PROOF_FAILED rather than as an answer | D3 (57 cases) |
| 4 | SymPy oracle read decimals as floats | 1 of 22 decimal cases passed (`0.001/(x-1)=0.002/(x+1)` and `1/(0.25*x)=8` came out "irrational excluded value") | `domain_oracle.py` `_exact`: decimals become exact rationals; exponent notation, whitespace in numbers and stray letters rejected like the engine does | `adversarial/suite.json` D4 (22 oracle cases) via `run_oracle.py`: now 22/22; `oracle_regression.py`: 0 label differences over all frozen sets, 2,884 transitions and 400 claims |
| 5 | Verification shared assumptions with the rule | `verify` of every rule was the same `checkTransition` the checker used; defect 1 passed both | Rule results are now accepted only if the independent verifier (own parser, own polynomial code with primitive-PRS gcd and Sturm sequences, own restriction extraction, own real solution-set algebra, no import from `poly.ts`, `domain-state.ts`, `expr-text.ts`) accepts the printed before/after texts; the old Poly-based check must agree or the step ends as PROOF_FAILED. The checker's authority is the verifier | `r1-regression.test.ts` mutation test (a deliberately corrupted `Poly.mul` shared by engine and old check is caught: PROOF_FAILED), verifier vs frozen adversarial (1,353/1,353 rejected, 1,531/1,531 accepted, reason codes exact) |

Also changed, disclosed: `rationalRoots` refuses when the candidate set is over 200,000 (audit S5: unbounded runtime); the verifier decides real vs complex roots exactly (audit S3: `x^2+1=0` and `x^2+4=0` are both empty over the reals); `run-engine.ts` accepts `--stage R1` for regression re-runs (each logged in `run-log.jsonl`).

## Regression (frozen suites unchanged)

| Suite | Before R1 | After R1 |
|---|---|---|
| K05.2 dev | 206/206 | 206/206 |
| K05.2 eval | 400/400 | 400/400 |
| K05.2 holdout (re-run for regression, logged) | 300/300 | 300/300 |
| K05.2 unsupported | 112/112 refused with oracle reason codes | 112/112 |
| Checker vs adversarial / claims | 1,353 of 1,353 rejected, 1,531 of 1,531 accepted; 294 of 294, 106 of 106 | identical (verifier is now the authority, same reason codes) |
| K05.1 smoke20, seeded500, edge50, holdout-b, constructed (1,436) | committed results | traces byte-identical, SymPy check 0 problems each |
| SymPy re-check of engine traces | dev 1,089, eval 2,118, holdout 1,669 steps, 0 invalid | dev 1,071, eval 2,118, holdout 1,669 steps, 0 invalid, 0 wrong claims |
| Independent adversarial suite (155 equation and step cases) | 47 pass; 27 false refusals; 36 refusals without a code; 33 crashes; 9 invalid steps accepted; 2 answers where a refusal was required; 1 step rejected by exception | 155 of 155 pass (18 of them as correct coded refusals of flexible cases); 0 crashes |
| Audit counterexamples (`audit-cases.json`) | 0 of 6 | 6 of 6 |
| Unit tests | 26 pass | 34 pass |

Changed classifications: none on any frozen suite. Behaviour changes: negative-exponent equations are now answered or refused with a code; previously wrong or uncoded. Unexpected refusals on frozen sets: none. Invalid transformations detected in engine traces: none; the verifier rejected 0 steps the engine took.

Performance regression: every step is verified twice. Eval median 29 to 54 ms (worst 304 to 499 ms); holdout median 40 to 79 ms (worst 236 to 696 ms); search effort (states visited, path length) is unchanged.

## Commands (from the repo root; `L` is the project's TS loader)

- Evidence before: `ENGINE_ROOT=<pristine checkout> OUT=tools/mathematics/r1/results/adversarial-before.json node --experimental-strip-types --no-warnings --import $L tools/mathematics/r1/run-adversarial.ts` (see `REPRODUCE_BEFORE.md`)
- After: the same with `ENGINE_ROOT=.` and `OUT=...adversarial-after.json`; `SUITE=tools/mathematics/r1/audit-cases.json` for the audit cases
- Oracle: `python3 -I tools/mathematics/r1/run_oracle.py`, `python3 -I tools/mathematics/r1/oracle_regression.py`
- Engine regression: from `packages/learning/src/reasoner/domain`, `node ... run-engine.ts <dev|eval|holdout|unsupported> --stage R1 --label r1`, then `python3 -I tools/mathematics/domain-reasoner/check_traces.py <set> r1`
- Checker: `node ... run-checker-eval.ts <frozen dir> <out>` and `.../verifier/run-verifier-eval.ts <frozen dir> <out>`
- K05.1: `tools/mathematics/r1/run-k051-regression.sh`
- Unit tests: `node ... --test poly.test.ts domain-state.test.ts domain-rules.test.ts domain-engine.test.ts r1-regression.test.ts ../planner.test.ts`

Source commits: base `6999970`; R1 commits are on `fix/r1-soundness` (evidence commit `e4387fe` precedes the first production edit).

## Outstanding risks

- The verifier is independent code but not an independent author or specification; a shared misreading of "domain" would be shared. An external textbook set and a third CAS cross-check remain recommended (R2 proposal).
- Nested denominators (`1/(1/x)`) are handled by the verifier but refused by the engine gate (UNSUPPORTED_EXPRESSION); `x^0` is read as "base must be non-zero" (0^0 undefined), a convention.
- The old Poly-based check does not do real-root reasoning (S3); it only runs as a cross-check, and a disagreement is a PROOF_FAILED, not a silent pass.
- Runtime doubled; no limit was reached.
