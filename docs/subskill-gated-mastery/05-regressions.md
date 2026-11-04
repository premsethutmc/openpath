# Regressions

All runs were made on this branch, `feat/subskill-gated-mastery`.

| Suite | Command | Result |
|---|---|---|
| M1 journeys (16 required, plus provenance, unchecked, slip-alone, E1-equivalence and shadow-isolation tests) | `node --import tsx --test src/journey/gated-mastery.test.ts` (frontend/) | **18/18 pass** |
| Learning package, full (includes E1, the selector registry, evidence, grading safety, derivation authority, replay) | `bun test packages/learning` (repo root) | **1782 pass, 41 skip, 0 fail** (1823 tests, 106 files) |
| Frontend, full (engine parity, journeys, D1+E1 journeys, grader replay, persistence, policies, scenarios) | `npm test` (frontend/) | **678/678 pass** |
| Typecheck | the three `tsc --noEmit` configs | **0 / 0 / 188**, the same as the base. The 188 errors are pre-existing, in mathematics-integration files. M1 introduced 4 errors that were found and fixed. |
| Browser (slice harness: the linear-equations journey, D1 grader feedback, linear-equations explanations, desktop and mobile) | `node --test e2e/slice-journey.test.mjs e2e/d1-grader-feedback.test.mjs e2e/a3-linear-equations.test.mjs` | **40/40 pass** |
| Synthetic learners (S1 simulator, S2 failure cases) | `node --import tsx --test …/simulator.test.ts …/failure-cases.test.ts` | **36/36 pass** |
| S2 reproduction | `m1/compare.mts` | **500/500** journeys byte-identical to the frozen traces; **0** drift in the existing status |
| Django | `python manage.py test` | **Not run.** PyPI is unreachable from this container, so Django could not be installed. The backend is unchanged by this branch (`git diff cd40422b -- backend` is empty). |

## Notes

- **Learning-package working directory.** Run from `packages/learning/`, 10 tests fail, because they open corpora by a path relative to the repo root (`tools/mathematics/...`). The same 10 fail at the base commit `cd40422b`, run the same way. Run from the repo root, as in CI, there are 0 failures.
- **Authoritative status unchanged.** The default `ProjectionOptions` reproduce E1 exactly: every existing E1 test passes, and there is a new equivalence test. `evidence.ts`, the selector, the engine, the app and the backend have no changes.
