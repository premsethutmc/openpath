# 8. Simulator test results

Run from `frontend/`: `node --import tsx --test ../research/synthetic-learners/test/simulator.test.ts`. Result: **16 tests, 16 pass, 0 fail.**

| Test | Covers |
|---|---|
| six versioned, valid profiles | all six profiles; schema, version and seeds; the synthetic disclaimer |
| every supported family read from its visible prompt | ahone, lin, lboth, lbrk, auleq and aulwp (40 variants each) |
| full knowledge: right answers and verified working in every family and phase | real grader on 4 phases × 15 variants × 6 families; derivation authority on one-step, two-step, both-sides and brackets |
| misconception rules (the brief's example) | `3x + 4 = x + 12` → `3x = 8`, `x = 8/3`; graded incorrect; forgot-divide |
| invalid working with a correct answer; bare; partial; unsupported notation | valid and invalid working; right answer with a false step (`method-false-step`) |
| errors stay on their line under unsupported notation | 4 misconceptions × 12 variants (review fix) |
| guessed multiple choice; unknown prompts | guessed answers |
| assisted vs independent; a guess is not practice | assisted versus independent |
| learning drawn, not guaranteed | successful learning; failed learning; no reward for being shown something |
| misconception persistence | persistence; change only for the explanation that addresses it |
| forgetting; recovery success and failure | forgetting; recovery |
| simulated time | clock; no real clock or `Math.random` in `src/` |
| determinism, all six profiles, across processes | deterministic responses and replay |
| hidden-state isolation | hidden-state isolation |
| historical compatibility | ordinary `learning_record` fields only; replay through `SliceSession.fromEvents` |
| adversarial | the simulator cannot create verdicts, certificates or mastery |

## Existing OpenPath tests (no production file changed; only `research/` is added)

| Suite | Result | A3 baseline |
|---|---|---|
| `bun test packages/learning/src` | 1666 pass / 44 skip / 0 fail | the same |
| `cd frontend && node --import tsx --test src/journey/*.test.ts` (A3 linear equations, scenarios, policies, coverage, content safety, slice) | 111 / 111 | the same |
| Simulator sources, strict type check (`tsc --ignoreConfig --strict` on `research/synthetic-learners/src` and `test`) | 0 errors in simulator files | — |
