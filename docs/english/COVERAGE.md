# English app: test coverage (20 November 2026)

How much of the English app's code the automated tests actually run.

## Numbers

| What | Lines run by tests |
|---|---|
| Logic, by the 614 unit tests (files they load) | 92.8% (branches 90.1%, functions 92.9%) |
| Whole app in a phone browser, by the 18 English browser tests | 62.5% |
| — screens (ui/) | 54.9% |
| — logic, as the screens use it | 68.4% |

Only two logic files are loaded by no unit test, and both are small (`profile-scenarios.ts`, a test fixture, and a type
file). The 36 screen files are tested in the browser, not by unit tests.

## Screens the browser tests barely run, and why

| Screen | Run | Why |
|---|---|---|
| Developer, essay studio (EssayJourney, EssayLive, Argument*), ExamDiagnostic, ExamJourney, CausalReading, EnglishWorkspace, SyntheticWritingDemo | 1–43% | Other parts of the site: the developer page needs the server; the essay studio, exam and causal-reading screens have their own browser tests that run against the server in CI, not in this set. |
| MyBooks | 10% | Books shared from a parent's account need the server; the device-only part is tested. |
| Guided (syllabus tasks) | 27% | The AI feedback part needs the server and a parent's yes; writing, the check and practice links are tested. |
| Journey (the doubling-letters journey) | 32% | One path through it is tested; its other teaching approaches are not. |
| ParentView, ListenWrite, NewWords, DailyProgress, Me, Onboarding | 52–68% | Main paths tested; less common branches (errors, empty states, some settings) are not. |

Found and closed: **Listen and answer** (29% → 96%) and the **Word check** (4% → 94%) had no browser test of their
own; `e2e/english-gaps.test.mjs` now takes each from start to finish.

## How to measure again

Unit tests: `node --import tsx --test --experimental-test-coverage --test-coverage-include="src/english/**"
--test-coverage-exclude="src/english/**/*.test.ts" "src/english/**/*.test.ts"`.

Browser: build and serve the English app, run each English browser test with
`node --import ./scripts/english-coverage/preload.mjs --test e2e/<test>.test.mjs`, then
`node scripts/english-coverage/report.mjs` (maps the browser's coverage back to source files through the source map).
