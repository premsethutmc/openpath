# Mathematical reasoner — E3 report

Branch `feat/math-reasoner`, code commit `f8e20fd38fd6`, source tree clean at run: **True**. Base: spike/oss-math-engine (PR #69). Nothing here is merged, deployed or wired into the Grade 5 pipeline.

## 1. Headline

| Set | Items | Planner outcomes | Independent check passed |
|---|---|---|---|
| Smoke set | 20 | solved: 20 | 20/20 |
| Frozen 500 (tuned on) | 500 | solved: 500 | 500/500 |
| Holdout B (new seed) | 500 | solved: 500 | 500/500 |
| Constructed from constraints (E3) | 360 | identity: 30, no-solution: 30, solved: 300 | 360/360 |
| Edge set | 56 | identity: 10, no-solution: 20, unsupported: 26 | 56/56 |

### Holdout B: the overlapping cases, separated

| Subset | Items | Solved | Independent check passed |
|---|---|---|---|
| Overlap with the earlier sets | 7 | 7 | 7 |
| Genuinely new | 493 | 493 | 493 |
| All | 500 | 500 | 500 |

Overlapping equations: `x/4+x/5=11`, `x/2+9=14`, `x/8-1=8`, `x/6+x/5=14`, `x/3+x/6=20`, `x/5+x/8=9`, `x/2+4=-6`.

## 2. Constraint-driven construction (E3)

The generator (`construct.ts`) does not use question templates and never calls the planner. For each equation it states constraints — class (unique / no-solution / identity), a target solution, which structural features must be present (brackets, fraction, unknown on both sides, decimal) and an operation budget — samples random expression trees from a grammar, then solves for the free constant so the constraints hold exactly in rational arithmetic. Candidates that miss any constraint are rejected and re-sampled.

- Equations built: **360**, distinct texts: **360** (requirement: at least 100). Classes: {'unique': 300, 'no-solution': 30, 'identity': 30}.
- Overlap with every earlier frozen set: **0**.
- Feature combinations covered: 16. Mean attempts to satisfy the constraints: 82.9.
- SymPy verified every claimed class and solution against the equation text, and recomputed the fraction / both-sides / decimal features from the text: **360/360** items without a problem (bracket presence is verified by the generator only).
- Resolved by planner, by feature: bothSides 229/229, brackets 189/189, decimal 34/34, fraction 141/141.

## 3. Search cost

| Set | Median states visited | 95th pct | Worst | Median path length | Worst path | Median ms | Worst ms |
|---|---|---|---|---|---|---|---|
| Smoke set | 15 | 38 | 38 | 6 | 10 | 0.92 | 4.7 |
| Frozen 500 (tuned on) | 11 | 41 | 43 | 6 | 11 | 0.15 | 7.5 |
| Holdout B (new seed) | 11 | 41 | 43 | 6 | 11 | 0.20 | 8.4 |
| Constructed from constraints (E3) | 13 | 37 | 55 | 6 | 16 | 0.20 | 6.0 |
| Edge set | 3 | 5 | 5 | 3 | 5 | 0.28 | 2.7 |

All figures cover equations the planner resolved. Search is breadth-first, depth limit 24, node cap 100000; no run hit the cap.

## 4. Rejection testing

Correct steps from the constructed and frozen-500 traces were corrupted by eight kinds of invalid transition. Ground truth that a mutant is really invalid comes from a second oracle (exact Fraction arithmetic, no SymPy); mutants it cannot prove invalid are excluded, not counted as wins.

| Corruption | Injected | Provably invalid | Rejected by checker | Excluded |
|---|---|---|---|---|
| off-by-one constant | 134 | 133 | 133 | 1 |
| multiply one side only | 135 | 135 | 135 | 0 |
| divide one side only | 134 | 132 | 132 | 2 |
| flip a + or - sign | 61 | 61 | 61 | 0 |
| multiply both sides by 0 | 134 | 134 | 134 | 0 |
| multiply both sides by x | 134 | 131 | 131 | 3 |
| divide both sides by x | 134 | 134 | 134 | 0 |
| negate one side | 134 | 131 | 131 | 3 |
| **Total** | **1000** | **991** | **991** | **9** |

Missed (invalid but accepted): **0**. Genuine steps still accepted: 300/300 (the checker is not simply rejecting everything).

## 5. Domain restrictions

The checker reads denominators from the unevaluated expression, so cancelling `x/x` (which silently widens the domain) is a rejected step. Hand-built cases: **12/12** behave as required.

| Previous | Next | Valid? | Why |
|---|---|---|---|
| `(9*x)/x=10` | `9=10` | no | cancel x/x: widens the domain from x!=0 to all reals |
| `(9*x)/x=9` | `9=9` | no | cancel x/x: identity over x!=0 would be reported as identity over all reals |
| `(x*x)/x=5` | `x=5` | no | cancel one factor of x: domain changes even though the solution set stays {5} |
| `x/x=1` | `1=1` | no | cancel x/x |
| `2*x=6` | `(2*x)/x=6/x` | no | divide both sides by x introduces x!=0 |
| `2*x=6` | `x*(2*x)=x*6` | no | multiply both sides by x adds the root 0 |
| `2*x=6` | `0*(2*x)=0*6` | no | multiply both sides by 0 |
| `(9*x)/x=10` | `(9*x)/x+1=10+1` | yes | add 1 to both sides: domain x!=0 kept, solution set kept |
| `(9*x)/x=10` | `2*((9*x)/x)=2*10` | yes | multiply both sides by 2 keeps the restriction |
| `2*x=6` | `2*x/2=6/2` | yes | divide both sides by a non-zero constant |
| `3/x=6` | `3=6*x` | no | multiplying by x is only valid when x != 0 is carried along (here it is dropped) |
| `3/x=6` | `3/x+1=6+1` | yes | keeps the restriction |

The planner keeps its conservative behaviour: **26** edge equations are refused with a stated reason (nonlinear, or x in a denominator). That includes the 6 disputed cases of the form `(a*x)/x = c`: `(5*x)/x=6+1`, `(9*x)/x=8+1`, `(9*x)/x=1+1`, `(7*x)/x=9+1`, `(9*x)/x=5+1`, `(8*x)/x=3+1`. The frozen labels there come from SymPy cancelling x; they hold only for x ≠ 0, so refusing is the safe answer until domain-aware reasoning exists.

## 6. No hidden shortcuts

- PASS: planner imports only the kernel and expr-text
- PASS: expr-text imports only the kernel
- PASS: no file/JSON/process/network/SymPy use in planner sources
- PASS: generator does not import the planner
- PASS: plan() takes the equation text only
- PASS: no frozen equation text appears in planner sources (1476 equations)
- PASS: no table of answers (no long numeric literal lists)

The planner is TypeScript and cannot call SymPy; SymPy is used only by `check.py`, `reject_test.py`, `domain_test.py` and the frozen-set generators, after the planner has finished. `plan(text)` receives the equation text only — no solution, no class, no id.

## 7. Failures and what they taught us

Resolved on the constructed set: 360/360.

The first run of the planner on the constructed set resolved 328 of 360 (32 misses) and exposed three real generality gaps, all fixed in `planner.ts` and recorded here rather than hidden:

1. When an x-term cancelled completely, the result `0*x` was not recognised as a constant, so contradictions such as `2*x = 2*x + 8` never terminated.
2. A single x-term could not be moved across when the other side was also a single x-term (`42*x = x`).
3. The depth limit of 14 was too small for one equation needing 16 steps; it is now 24. After fixes 1 and 2 the set stood at 359 of 360; the depth change resolved the last one.

The checker also caught a bug in the generator itself: its decimal feature was true for fraction literals such as `13/2` that print without a decimal point (34 items were flagged). Features are now defined on the printed text.

Because these fixes were made after seeing failures on the constructed set, that set is no longer a clean test of the final planner. The clean evidence for generality is Holdout B, whose seed was fixed before the fixes and which has 493 genuinely new cases; the frozen 500 was already tuned on once (disclosed earlier).

## 8. Example reasoning traces

**Brackets, unknown on both sides** — `4*(6*(x-16))=13-9*x+98` → solved x = 15 (11 steps, 35 states visited)

| # | Rule | Equation after the step | Why |
|---|---|---|---|
| 1 | simplify | `4*(6*(x-16))=-(9*x)+111` | simplify both sides (combine like terms) |
| 2 | expand | `4*(6*x-6*16)=-(9*x)+111` | multiply the factor into each term of the bracket |
| 3 | simplify | `4*(6*x-96)=-(9*x)+111` | simplify both sides (evaluate numbers, combine coefficient) |
| 4 | expand | `4*(6*x)-4*96=-(9*x)+111` | multiply the factor into each term of the bracket |
| 5 | simplify | `24*x-384=-(9*x)+111` | simplify both sides (combine coefficient, evaluate numbers) |
| 6 | add-both-sides | `24*x-384+384=-(9*x)+111+384` | add 384 to both sides |
| 7 | simplify | `24*x=-(9*x)+495` | simplify both sides (combine like terms, combine coefficient) |
| 8 | subtract-both-sides | `24*x-(-(9*x))=-(9*x)+495-(-(9*x))` | subtract -(9*x) from both sides |
| 9 | simplify | `33*x=495` | simplify both sides (combine coefficient, combine like terms) |
| 10 | divide-both-sides | `33*x/33=495/33` | divide both sides by 33 |
| 11 | simplify | `x=15` | simplify both sides (combine coefficient, evaluate numbers) |

**Fractions, unknown on both sides** — `(8-x)/3*3=x-6` → solved x = 7 (12 steps, 36 states visited)

| # | Rule | Equation after the step | Why |
|---|---|---|---|
| 1 | simplify | `(-x+8)/3*3=x-6` | simplify both sides (tidy) |
| 2 | expand | `(-x/3+8/3)*3=x-6` | divide each term of the numerator by the denominator |
| 3 | simplify | `(-(1/3*x)+8/3)*3=x-6` | simplify both sides (combine coefficient, evaluate numbers) |
| 4 | expand | `-(1/3*x)*3+8/3*3=x-6` | multiply the factor into each term of the bracket |
| 5 | simplify | `-x+8=x-6` | simplify both sides (combine coefficient, evaluate numbers) |
| 6 | subtract-both-sides | `-x+8-(-x)=x-6-(-x)` | subtract -x from both sides |
| 7 | simplify | `8=2*x-6` | simplify both sides (combine coefficient, combine like terms) |
| 8 | add-both-sides | `8+6=2*x-6+6` | add 6 to both sides |
| 9 | simplify | `14=2*x` | simplify both sides (evaluate numbers, combine like terms) |
| 10 | divide-both-sides | `14/2=2*x/2` | divide both sides by 2 |
| 11 | simplify | `7=x` | simplify both sides (evaluate numbers, combine coefficient) |
| 12 | swap-sides | `x=7` | write the unknown on the left |

**Contradiction detected** — `6-18-(12+2)-6*(x+x)=7*x+-19*x` → no-solution (4 steps, 4 states visited)

| # | Rule | Equation after the step | Why |
|---|---|---|---|
| 1 | simplify | `-(12*x)-26=-(12*x)` | simplify both sides (combine like terms, combine coefficient, evaluate numbers) |
| 2 | simplify | `-(12*x)-26=-12*x` | simplify both sides (combine coefficient) |
| 3 | subtract-both-sides | `-(12*x)-26-(-(12*x))=-12*x-(-(12*x))` | subtract -(12*x) from both sides |
| 4 | simplify | `-26=0` | simplify both sides (combine coefficient, combine like terms) |

**Identity detected** — `(8*16+x-x)/4=5.5+5.5+21` → identity (1 steps, 1 states visited)

| # | Rule | Equation after the step | Why |
|---|---|---|---|
| 1 | simplify | `128/4=32` | simplify both sides (evaluate numbers, combine like terms) |

**Refusal** — `(9*x)/x=8+1` → unsupported: variable in a denominator (needs excluded values; not in the move set).

## 9. Limitations

- One unknown, linear equations only, built from + − × ÷ and brackets with numeric multipliers and divisors. No inequalities, systems, powers of x, or variable denominators (refused with a reason).
- Breadth-first search over a hand-chosen move set: the moves are general, but choosing them was a human decision; the planner cannot invent a new kind of move.
- Two policies keep the search small and are part of the design, not of any equation: tidying is forced whenever it applies, and bracket removal is forced while brackets remain. Both are safe (they never lose information) but they are policy.
- The checker decides validity by solution-set and domain equality (SymPy). It does not judge whether a step is pedagogically sensible or the shortest.
- The generator exercises a modest grammar (numbers up to 20, factors 2–9, up to three x leaves); that is breadth, not proof of generality beyond it.
- Rejection tests use eight corruption kinds; other kinds of mistake are not covered.
- The reasoner is not connected to the Grade 5 release pipeline or to any learner-facing feature, by decision.

## 10. Reproducibility

Command: `tools/mathematics/reasoner/run-e3.sh` (node v22.22.0, python 3.13.16, SymPy 1.14.0).

Seeds: gen_sets frozen (smoke20/seeded500/edge50): 20261025; holdout-b: 20261026; constructed generator: 20261027; rejection mutations: 20261029; planner: none (deterministic BFS, no randomness).

Frozen-set SHA-256:

- `constructed/constructed.json`: `6dd650e916bd801770aba8504ca31b512e3872c0d3833e4fc60544323214615f`
- `edge50.json`: `ace50253407547595209356ac367deb5832fdf29984c91bd5b16f02e4e219f1b`
- `holdout-b/edge50.json`: `8e57bde9853433c01e9dfa9eab29f81d7b1ed2f082d9b213ad42c79cd5dc9f8b`
- `holdout-b/manifest.json`: `c23a58e5ded4578cec7c28e90addc12ef278e15c8c9a59e79600cee16f6e8642`
- `holdout-b/seeded500.json`: `bffbab210bef65bc879e4aa3001de8b2b3868fcd6c61872df1975bf8c7fccda1`
- `holdout-b/smoke20.json`: `583f9f50bca03e31feacd0e8cd75d8715a5c3c81d8a48e78bc48495d8fba02a0`
- `manifest.json`: `72981e3cbeb0e42cce87da05832c4f788023bb42288c0011ced4c7dd6899420d`
- `seeded500.json`: `77d496e1864cdba8e5152f1d4d0b06d1243ce37f3198eb06d4f03dfa8ab803ec`
- `smoke20.json`: `583f9f50bca03e31feacd0e8cd75d8715a5c3c81d8a48e78bc48495d8fba02a0`

Code SHA-256 is recorded in `results/repro.json`. Re-running produces byte-identical traces (checked by `cmp` against the committed constructed set; traces carry no timing, which lives in `*.stats.json`).
