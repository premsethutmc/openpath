# Engine trial: open-source components for the mathematics kernel

**Status:** trial on branch `spike/oss-math-engine`, based on `feat/expand-verified-teaching` @ `8121178`. Not merged
and not wired into any learner-facing path.

**Question:** can open-source components cover board items K02 (exact arithmetic) and K04 (equation solver), with an
independent checker, so that OpenPath's own work concentrates on K05 (the step-by-step solution planner)?

**Answer from this trial:** yes for linear and quadratic equations. See the results below. The planner (K05)
remains OpenPath's own work. No open-source project here produces teacher-style derivations across domains.

## What changed in the kernel

`packages/learning/src/math-kernel.ts`

| Change | Why |
|---|---|
| `Rational` stores `bigint` numerator and denominator | The number-based version silently rounded once values passed 2^53. In K02 below, 1,123 of 10,000 results were wrong without any error. |
| `num` / `den` remain plain numbers for existing callers, and **throw** instead of rounding when a value no longer fits. `numBig` / `denBig` always give the exact value. | No caller can receive a silently wrong number. |
| Decimals are read as the decimal written (`0.1` → 1/10, `1e-7` → 1/10⁷). NaN, ±Infinity and integers beyond 2^53 are refused. | Previously `new Rational(NaN)` produced a value, so checks could "pass" on garbage. |
| New `parseRational("−3/4")` reads integers, fractions and decimals exactly, or returns null. | Lets callers refuse unreadable values instead of using `Number(...)`. |
| `comparison.ordering` compares exact values, checks the solver's **claimed** relation, and refuses unreadable values. | **Bug found:** the adapter passed `Number("2/5")` = NaN for both sides. NaN compares as neither < nor >, so the rule computed "=" and reported the step as kernel-verified while the learner was shown "2/5 < 3/5". The comparison was never actually made. |

`packages/learning/src/kernel-adapter.ts`: the comparison adapter now passes the values as written plus the claimed
relation.

**Regression check:** all 358 existing tests in `packages/learning` and `packages/mathematics` pass, plus 13 new
tests in `math-kernel-exact.test.ts`. A census adapted every released problem of all 1,080 families (341,483
problems). Each one classifies exactly as before: 65,906 fully kernel-verified, 77,397 partially, 198,180
compatibility. So no released problem relied on the rounding. All 500 released comparison steps (family `adfcmp`)
were previously "verified" through NaN. Every one of them also holds when checked exactly, so learners were not
shown a false comparison. They were simply never checked.

## Components evaluated

| Component | Licence | Role in this trial | Result |
|---|---|---|---|
| Native `BigInt` | — | Exact arithmetic inside the kernel (K02) | Used. No dependency needed; runs on the device too. |
| [CortexJS Compute Engine](https://github.com/cortex-js/compute-engine) 0.161.0 | MIT | Equation solver (K04): parses LaTeX, returns exact roots (fractions, surds, complex) | 1,000 / 1,000 complete and correct |
| [SymPy](https://www.sympy.org) 1.14.0 | BSD | Independent checker, offline only (K02, K04) | Used as the reference. Not a browser or production dependency, same as `../check-symbolic.py`. |
| math.js | Apache-2.0 | Considered for K02 | Not needed: native `BigInt` gives the same exactness with zero dependencies. Still a candidate for parsing (K01). |
| mathsteps | Apache-2.0 | Reference design for K05 | Not used here. Unmaintained, but a reference for the planner. |

## Results (seed 20261023)

### K02 — exact arithmetic, 10,000 randomized cases, checked by SymPy

| Category | Cases | New kernel: wrong | Previous kernel: wrong | Previous kernel: could not accept |
|---|---:|---:|---:|---:|
| Integers ≤ 1,000 | 2,000 | 0 | 0 | 0 |
| Integers of 10–30 digits | 1,500 | 0 | 49 | 1,345 |
| Fractions (6-digit parts) | 2,500 | 0 | 0 | 0 |
| Decimals (1–4 places) | 1,500 | 0 | 0 | 0 |
| Powers (exponent −12 to 20) | 1,500 | 0 | 252 | 0 |
| Expressions `(a+b)·c ÷ (a−c)^k` | 1,000 | 0 | 822 | 0 |
| **Total** | **10,000** | **0** | **1,123** | **1,345** |

Board criterion: *zero incorrect accepted results*. **Met** by the new kernel. The previous kernel fails it,
silently. For example, `(-458/126 + -169/238) × -370/450 ÷ (-458/126 − -370/450)^5` came out rounded.

### K04 — 1,000 unseen equations solved by Compute Engine, checked by SymPy

| Kind | Equations | Complete and correct |
|---|---:|---:|
| Linear `ax + b = c` | 150 | 150 |
| Linear, x on both sides | 120 | 120 |
| Linear, fractional coefficients | 120 | 120 |
| Linear with brackets `a(x + b) = c` | 60 | 60 |
| Linear with no solution | 25 | 25 (returns no roots) |
| Linear true for every x | 25 | 25 (returns a free parameter, `t`) |
| Quadratic, integer roots | 150 | 150 |
| Quadratic, rational roots | 100 | 100 |
| Quadratic, irrational roots (surds) | 100 | 100 |
| Quadratic, no real roots | 60 | 60 (returns complex roots) |
| Quadratic, repeated root | 40 | 40 |
| Quadratic not in standard form | 50 | 50 |
| **Total** | **1,000** | **1,000 — 0 incorrect, 0 unsolved, 0 misread** |

Board criterion: *≥ 99% solved, zero incorrect accepted*. **Met: 100%, 0 incorrect.**

How each answer is checked, without trusting the solver:

1. The solver's own reading of the LaTeX must equal the intended equation.
2. Every claimed root is substituted back and must make the equation exactly true.
3. The set of roots must equal SymPy's full solution set.

### The checker can fail (self-test)

`check_selftest.py` corrupts known-good output and requires every corruption to be caught:

- K02: 200 / 200 wrong results caught.
- K04: 34 / 34 wrong roots, 12 / 12 missing roots and 35 / 35 misread equations caught.

## What this does not prove

- **K05 is untouched.** Compute Engine gives answers, not teacher-style steps. Producing ordered, checked steps
  ("subtract 7 from both sides") is still the planner OpenPath must build.
- **Presentation rules are not yet decided.** For school learners, complex roots must be shown as "no real
  solution", and an identity as "every number works". These are product rules for the planner and renderer.
- **Equation types tested:** only linear and quadratic in one variable. Systems, inequalities, rational and radical
  equations need their own trial.
- **Build used in this session:** the package registries were blocked here, so Compute Engine was built from its
  GitHub source (commit `903e2af`, version 0.161.0, the version published on npm). Its colour-library dependency
  was replaced by a stub, because colour functions are unused by algebra. Before any production use, install
  `@cortex-js/compute-engine@0.161.0` from npm and rerun these benchmarks. There is no lockfile for the same reason.
- **Not done here:** the 1,080 families still use their own solvers, and nothing learner-facing calls Compute
  Engine.

## Reproduce

```bash
cd tools/mathematics/engine-trial
npm install                      # Compute Engine and tsx
pip install -r requirements.txt  # SymPy, offline checker only
npm run k02 && npm run k04       # writes out/k02.json, out/k04.json
npm run check                    # exits non-zero on any wrong or incorrect result
npm run selftest
```

Committed evidence is in `results/`:

- `summary.json`: this kernel, Compute Engine and SymPy.
- `summary-previous-kernel.json`: the same K02 cases on the previous kernel.
- `k04-equations.json`: all 1,000 equations, each with the solver's parse and answers.

The kernel tests run with the repository's usual `node --import tsx --test packages/learning/src/*.test.ts`.
