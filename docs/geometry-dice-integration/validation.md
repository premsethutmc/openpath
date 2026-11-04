# Validation

Every run below is local, on this branch, with the final engine code unless noted. Combined CI runs on the draft PR.

| Suite | Result |
|---|---|
| `two-dice.test.ts`: outcomes, registration and review gates, problem identity, 4 engine-driven app paths, delayed check and recovery, 'k or more', gap reporting | **10/10** |
| `geometry-two-skills.test.ts`: the 6 former `todo` tests now run as ordinary tests | **16/16, 0 todo** |
| Geometry, foundation and skill-scope regressions: `geometry-journeys`, `foundation-remediation`, `retention-readiness`, `skill-scope`, `candidate-teaching` | **all pass** after the fixes below |
| Learning package (`bun test packages/learning`) | **1803 pass, 41 skip, 1 fail.** The one failure was the stale grader bundle manifest. After the single rebuild, `generator-contracts` plus the selector and E1 tests give **53/53**. |
| Frontend full (`npm test`, 2-core container) | Stopped by its 100-minute limit at test 838. **833 passed, 5 failed.** All 5 are listed below and fixed; their files now pass. The full run is left to combined CI. |
| Django (`manage.py test`, SQLite, vendored Django 5.2.18) | **327 OK** (3 skipped) |
| Type check | `tsc` **0 / 0 / 0** errors. The mathematics-integration configuration reports only its pre-existing missing `bun` type definitions. |
| Browser (Year UI + Django API, `e2e/integrated-skills.test.mts`) | **4/4 journeys** (results in `browser-results.json`). Added to the `year` CI job. |
| Content pipeline (`specs`, `library`, `families-parity`) | No diff. |

## Regressions found and fixed

| Test | Cause | Fix |
|---|---|---|
| `geometry-journeys` G-03: a learner who never learns reads "independently-demonstrated" | The scoped recheck took the first in-scope question, a form where the learner's error does not show (`gen:ahext:47,45,1`) | `recheck@2` first takes a question where the error that the latest wrong answer matched would show |
| `foundation-remediation` G-03: the plan should ask the weak family | With transfer held, another core skill is still unobserved, so the full plan asks it first | The test now also checks the plan for the weak skill alone, which asks its family |
| `retention-readiness`: the pathway's scoped recovery | `relapse@1` taught first inside a learning-goal pathway | `relapse@1` leaves pathways to their own recovery |
| `skill-scope` negatives (×2): "the hazard is present" | `investigation-scope@1` keeps follow-ups on the original's skill, so the finding and the current skill now agree | The tests assert agreement, and that no other skill's fix is ever taught (the scope rule is still checked) |
