# Controlled integration of the math core into the learning engine

Branch `feat/math-core` (draft PR #81). Not merged, not deployed, no UI.

## Smallest integration path
The learning engine marks answers with `isCorrect(question, raw)` (content.ts) and **never lets the computer mark written work**: `needsMarking` is true for written tasks and only an educator produces `MARKED_RIGHT`. The core therefore plugs in as *advisory evidence*, not as a marker. One new file, no change to any existing file:

`packages/learning/src/core/working-assessment.ts`
* `assessWorking(problem, lines)` -> wraps `evaluateWorking`. `outcome` is one of `verified | invalid | ambiguous | unsupported | incomplete`; `correct` is `true` only for verified, `false` only for invalid, `null` for ambiguous / unsupported / incomplete. Always `advisory: true`. Never throws (an unreadable problem is `unsupported`).
* `verifyWorkingStep(problem, from, to)` -> one step against the ORIGINAL problem: `verified` with effect `equivalence` or `implication` (candidates gained: an obligation), `invalid` (loss), or `unsupported`.
* `correctnessOf(outcome)`.
It uses the existing `verifyStep` verifier layer (`relateLines`) and `evaluateWorking`; no new reasoning. `packages/learning/src/index.ts` is untouched: the core uses `.ts` import specifiers (run with node strip-types, as in its tests), so it is imported explicitly rather than re-exported through the bundler-resolved index.

## Evidence
* `working-assessment.test.ts` (9 tests): complete sequences, alternative methods, first incorrect step, case splits, unsupported notation, refusal never correct, single steps, the restriction suffix.
* `tools/mathematics/core/teacher/`: 17 teacher-style worked solutions written before running the evaluator; outcomes re-derived independently with SymPy by `check_teacher.py` (`python3 tools/mathematics/core/teacher/check_teacher.py`, 17/17). They are not used to tune anything.
* `tools/mathematics/core/results/latency.json`: `tools/mathematics/core/teacher/measure-latency.ts`.

## Documented limitation: the restriction suffix
A line that states a restriction after the equation (`x + 2 = 4, x ≠ 2`, `x != 0`) is **not parsed**. The line is `unsupported`, the working is never verified, and nothing is guessed. Third held-out corpus: 26 over-refusals come from exactly this (23 removable-singularity tasks, 3 glyph tasks). Fixing it needs its own untouched holdout; until then the engine reports "not assessed" for such workings.

## Remaining planner limitations (not on the integration path)
The planner/search is used only for naming rules and for benchmarks, not for judging student work. Known: no correctness advantage over plain BFS; best-first misleads on A-3-024, A-5-035, A-7-030 (BFS solves them in far fewer expansions); 16 of 533 frozen tasks still hit the 20,000-node cap (canonical state key, down from 25); rational roots and degree <= 2 after clearing only; generated problems only, not real student input.
