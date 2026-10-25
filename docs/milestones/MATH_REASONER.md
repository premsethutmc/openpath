# Milestone proposal: a tiny mathematical reasoner (board item K05)

**Status: proposal, awaiting approval.** No code is written until the owner approves the scope and acceptance tests.
Origin: the owner's note of 25 Oct 2026 ("one small, inspectable piece of intelligence first"). This is the K05
"solution planner" of the engine board, scoped to the smallest demonstration.

## Goal
A program you can run on an unfamiliar linear equation that **discovers** a valid solution path by searching over
general mathematical moves, shows every state, move and rejected move, and has each step and the final answer checked
by something that is not the planner. Nobody writes a solution for any particular equation.

## What already exists (reused, not rebuilt)
`packages/learning/src/math-kernel.ts` (from PR #69): exact rational numbers, an expression tree (`MathExpr`), a rule
registry whose rules carry a precondition, an `apply`, an independent `verify` and an `explain`, and four
both-sides rules (add, subtract, multiply, divide). The registry applies a rule only when the caller names the rule and
its parameters.

## What is missing, and is built here
1. **Moves beyond the four both-sides rules:** distribute (expand brackets), combine like terms, move a term across,
   simplify a fraction, clear a denominator.
2. **A move generator:** given a state, list every applicable move with its parameters (today the caller must know them).
3. **A search planner:** breadth-first, strict depth limit, no learning. It records every state it visits, every move it
   tries, which were rejected and why, and the chosen path, so the whole search can be inspected.
4. **An independent checker, separate code from the planner:** a transition is valid only if the solution set of the
   equation before equals the solution set after (checked with SymPy and with exact rational arithmetic, never with the
   planner's own rules); the final answer is substituted back into the original equation.

## Out of scope
Curriculum, question families, dashboards, learner interface, other grades, geometry and calculus, any learned strategy
selector (a later milestone, only if this one succeeds), any LLM, deployment. Branch is stacked on PR #69
(`spike/oss-math-engine`) because it reuses that kernel.

## Acceptance tests (proposed; the sets are frozen before any planner code is written)
1. **Frozen unseen set.** Two sets, committed with their SHA-256 and a SymPy-computed answer key *before* implementation:
   a 20-equation smoke set (brackets, fractions, variable on both sides, negatives) and a 500-equation seeded set from a
   generator that shares no code with the planner. The planner solves all 20 and at least 95% of the 500, using only
   general moves. Remaining failures are listed with reason.
2. **No question-specific solution.** A repository check finds zero code that maps a particular equation or equation
   pattern to its answer or to a fixed sequence of steps (the moves are general rules; the order comes from search).
3. **Every transition independently valid.** 100% of transitions on the chosen paths pass the independent checker, and
   100% of the final answers satisfy the original equation.
4. **Invalid moves rejected.** At least 500 injected invalid transitions (a dropped sign, dividing one side only, a
   wrong distribution, an off-by-one constant) are all rejected by the checker.
5. **Reproducible.** The same input gives a byte-identical trace (state, tried moves, rejected moves, chosen path).
6. **Explainable.** Every step on a chosen path names the rule that justified it and the rule's explanation text.
7. **Unsupported cases are explicit.** An equation with no solution, with every number as a solution, a nonlinear term
   or a variable in a denominator is reported as such (or as unsupported) with a reason, never a wrong answer. At least
   50 such cases.
8. **Problem construction.** From constraints (a unique integer solution, coefficients within bounds, a required form)
   the program constructs at least 100 distinct equations, and the independent checker confirms each has the stated
   solution and satisfies the constraints.
9. **Search cost reported.** For the 500-equation set, the number of states visited, path length and time are reported
   (median and worst case); the search is allowed to be inefficient at this stage.
10. **No regression.** All existing tests pass.

## Stages (estimates are guesses; report after each)
| | Stage | Output |
|---|---|---|
| E0 | Freeze the two equation sets and answer keys; commit hashes | frozen sets |
| E1 | Smallest loop: state, applicable moves, new states, goal test; one equation solved by search | demo |
| E2 | Generalise: brackets, fractions, both sides; measure failures, depth, time | frozen-set results |
| E3 | Problem construction from constraints | 100+ verified equations |
| E4 | Evaluate against all ten tests; decide whether further investment is warranted | report |

My estimate is one to three days of work, given the kernel exists. That is a guess until E1 is measured.

## Stop rules
- If after E2 the planner solves fewer than 80% of the 500-equation set with general moves only, stop and report.
- If any accepted transition is later found invalid by the checker, fix the move before continuing.
- Do not start another engine milestone (generalising beyond linear equations, a learned selector, curriculum
  integration) without a new proposal and approval. Do not merge or deploy without approval.

## Risks and limits
- Breadth-first search on linear equations is well understood; this milestone does not claim general mathematical
  intelligence, only a bounded, inspectable capability on one equation class.
- The path found first is not necessarily the one a teacher would write. Path quality (fewest steps, no needless
  fractions) is reported but is not a pass/fail test here.
- Teacher-style presentation rules (how an identity or "no solution" is phrased for a child) are not decided here.
- SymPy is built from GitHub in this environment because package registries are blocked.

## Decisions for the owner
1. Approve this scope and these tests?
2. Is 95% of 500 the right bar (the note proposes 20 of 20 on a smaller set)? The 20-equation set is kept as a smoke test.
3. Stack on PR #69, which needs your merge decision first?
