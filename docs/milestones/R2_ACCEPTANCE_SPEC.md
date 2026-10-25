# R2 architecture acceptance tests: specification (frozen before any R2 implementation)

Purpose: test the *architecture* (shared state, rule registry, planner, reuse), not just equation-solving. Mathematical correctness is tested separately by the existing frozen suites, which stay unchanged and are re-run as regression. Scope stays: one unknown x, rational equations with at most 3 linear denominator factors, reduced numerator degree <= 1 (K05.1 + K05.2 + R1 semantics). No new mathematical domain.

## Equation and state conventions
Equation text uses the existing grammar (`x`, decimals, `+ - * / ^`, brackets, explicit `*`). The restrictions of a state are the values that make a denominator, negative power or zero-power base in the WRITTEN expression equal to zero; they only ever grow, and the original restrictions are always retained.

## Goal predicates (all defined on a state = equation + restriction list; "reduced" means numerator and denominator have no common polynomial factor)
- `SOLVE`: the state is `x = c`, or both sides are constants (true: identity on the domain; false: no solution). A claimed `c` must satisfy the ORIGINAL equation with both sides defined.
- `CLEARED`: no x occurs in any denominator or negative power.
- `REDUCED`: every maximal quotient whose denominator contains x is in lowest terms; fractions have not been multiplied out.
- `ONE_FRACTION_ZERO`: the right side is the literal 0 and the left side is a single quotient N/D in lowest terms (or a polynomial).
- `EXPANDED_POLY`: CLEARED, the right side is 0, and the left side is an expanded, collected polynomial.
For every goal the final state must be equivalent to the start over the original domain (restrictions retained), as judged by an independent verifier.

## Operations (rule vocabulary; names are stable identifiers used in `allowed`)
`restrict`, `move-to-left` (L=R to L-R=0), `combine-terms` (sum of quotients to one quotient, no cancelling), `cancel-common-factor`, `clear-denominators` (multiply by LCD), `expand` (distribute brackets), `collect-terms`, `add-sub-both-sides`, `mul-div-const` (by a non-zero constant), `divide-restricted-factor` (divide both sides by (x-a) where a is restricted), `accept-candidate`.

## Dataset A: composition set (`composition.json`, 240 tasks)
Each task `{id, start, goal, allowed, witness, family, notes}`. `allowed` is a subset of the operations the planner may use. Construction by reverse scrambling: begin with a goal-satisfying state, apply `k` (2 to 6) *inverse* operations (split a quotient into a sum, multiply numerator and denominator by (x-r), move terms across, group into brackets, multiply both sides by a constant, ...) to obtain `start`; `witness` records one valid forward operation sequence using only `allowed` operations. Required families (at least 25 tasks each):
1. `order`: two operations commute badly (the result differs unless applied in a specific order given the goal).
2. `shortest-not-obvious`: the shortest witness starts with a move that does not reduce any simple size measure.
3. `local-trap`: a locally attractive move (e.g. cancelling or collecting first) leads to a state from which the goal is unreachable with `allowed`, or needs >= 2 extra steps.
4. `complexity-up`: every witness passes through a state with strictly more terms or higher degree than the start (e.g. expand before cancel).
5. `restriction-gate`: a tempting divide or multiply step is illegal because the factor is not provably non-zero on the domain; the witness uses a legal route.
6. `goal-variety`: the same start equation appears with 3+ different goals (so no single fixed order satisfies all).
7. `solve-mixed`: SOLVE tasks from scrambled starts, unrestricted `allowed`.
Also 30 tasks per family where the goal is *unreachable* with `allowed` (declared by construction: a needed operation is excluded); the planner must report failure with a reason, not a wrong state.

## Dataset B: reuse set (`reuse.json`, 60 tasks)
Pairs `(K05.1 style, K05.2 style)` of tasks that need the same underlying operation in two settings (e.g. divide both sides by a constant in a linear equation; the same step inside a rational equation after clearing). Measures whether one rule implementation serves both (see reuse tests).

## Dataset C: robustness and limits (`limits.json`, 80 tasks)
Malformed text, unsupported operators, domain-unresolved expressions, large coefficients, deep nesting, near-boundary cases. Expected outcome is a structured refusal with a code from {PARSE_ERROR, UNSUPPORTED_OPERATOR, UNSUPPORTED_EXPRESSION, DOMAIN_UNRESOLVED, PROOF_FAILED, SEARCH_LIMIT} or a correct answer; never a crash, never a wrong answer, never a hang (time limit 5 s per task, node limit declared).

## Baselines (defined now, before implementation)
- `P1` fixed pipeline: restrict, cancel (each fraction), clear denominators, expand and collect, move-to-left, divide restricted factors, then delegate linear solving; as used in the audit ablation (PR #78).
- `P2` goal-specific fixed pipelines: the best fixed operation order per goal chosen on a *separate* tuning split (`tuning.json`, 60 tasks, disjoint from A).
- `P3` uninformed BFS over the same operations with the same node limit.
- `P4` greedy: always take the applicable operation that most reduces a declared size measure (terms + degree + fractions).

## Architecture tests (metrics and acceptance thresholds)
1. Soundness: 0 steps rejected by the independent verifier across all traces; every unsupported or unreachable task refused with a code; 0 wrong answers. (Mandatory.)
2. Completeness within scope: >= 95% of reachable composition tasks reached, >= 99% of regression suites unchanged.
3. Genuine composition: the unified planner solves at least 20 percentage points more of Dataset A than the best of P1, P2, P4 on its reachable tasks, and visits fewer states than P3 (median ratio <= 0.5). If this threshold is not met, the report must withdraw the claim that search adds capability.
4. Reuse: after migration, 0 duplicated mathematical helpers (checked by a script that lists exported function names and bodies' normalized hashes), one search loop, one registry; K05.1 frozen suites (20 smoke, 500 seeded, edge, 360 constructed) unchanged; K05.2 frozen dev/eval/holdout/unsupported/adversarial/claims unchanged.
5. Domain preservation: for every trace and every step the restriction set only grows and contains the restrictions extracted from the original text (verified independently).
6. Unsupported handling: Dataset C, plus the existing 112 unsupported cases.
7. Reproducible traces: the same input gives a byte-identical trace on 3 runs and on two machines (excluding timing fields).
8. Computational limits: per-task time and node limits are reported (median, p95, worst) and no task exceeds them.
9. Capability cost: adding the dummy capability `divide-both-sides-by-constant` as a *new rule only* (no planner or state change) must pass its unit tests and the reuse set; the diff must touch only the rule file, its test and one registration line.

Architecture tests (1, 3, 4, 7, 9) and mathematical correctness tests (2, 5, 6, and the regression suites) are reported separately.

## Freezing
Datasets A, B, C and `tuning.json` are generated once by `tools/mathematics/r2/gen_r2_sets.py` (seeded), their SHA-256 recorded in `FROZEN.md`, and not edited afterwards. Any change is an amendment recorded in the milestone document, never an edit.
