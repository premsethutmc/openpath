# Learner traces (16 journeys, real grader and learner state)

Each journey is driven through `SliceSession`, so it uses the trusted server grader with D1 working verdicts, records, `withDecisions` and `learnerState`. Only the learner responses are scripted. The questions are generated variants from the families’ release pools. The full traces are in `traces/journeys.json`; they give every submission with its server verdict and working status, both policies, all four variants, the disagreements and the retention plan.

Columns: Ans. = answers; Existing = the existing status (authoritative); then the four proposed variants (shadow); Missing and Recovery are under `gated`; Plan = the proposed delayed-check plan.

| # | Journey | Ans. | Existing | gated | gated-typed | gated-method | gated-slip | Missing | Recovery | Plan |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Two-step success only | 3 | independent | developing | developing | developing | developing | both-sides, brackets, modelling | — | — |
| 2 | Both-sides success only | 3 | independent | developing | developing | developing | developing | two-step, brackets, modelling | — | — |
| 3 | Bracket success only | 3 | independent | developing | developing | developing | developing | two-step, both-sides, modelling | — | — |
| 4 | Modelling success only | 3 | independent | developing | insufficient-evidence | developing | developing | two-step, both-sides, brackets | — | — |
| 5 | All core sub-skills demonstrated (verified working where the family has a contract) | 8 | independent | independently-demonstrated | developing | independently-demonstrated | independently-demonstrated | — | — | — |
| 6 | Correct answer with invalid working (two-step), other sub-skills shown | 9 | independent | developing | developing | developing | developing | two-step | — | — |
| 7 | Bare correct answers on every core sub-skill (no working) | 8 | independent | independently-demonstrated | developing | developing | independently-demonstrated | — | — | — |
| 8 | Assisted success on every core sub-skill (a hint each time) | 12 | guided | insufficient-evidence | insufficient-evidence | insufficient-evidence | insufficient-evidence | two-step, both-sides, brackets, modelling | — | — |
| 9 | Repeated guessed answers (always option A) | 28 | guided | developing | insufficient-evidence | developing | developing | two-step, both-sides | — | — |
| 10 | Failed delayed check in one sub-skill (brackets) | 14 | review (recovery) | recovery-required | recovery-required | recovery-required | developing | brackets | brackets | — |
| 11 | Successful recovery in that sub-skill (two fresh bracket questions right alone) | 16 | independent | independently-demonstrated | developing | independently-demonstrated | developing | — | — | — |
| 12 | Unrelated success during recovery (two-step and both-sides right; brackets still failed) | 18 | independent | recovery-required | recovery-required | recovery-required | developing | brackets | brackets | — |
| 13 | One careless slip after prior success (a practice slip, then one wrong answer in the brackets delayed check) | 16 | review (recovery) | recovery-required | recovery-required | recovery-required | independently-demonstrated | brackets | brackets | — |
| 14 | Historical evidence replay (current authority, older authority, before D1) | 8 | independent | independently-demonstrated | developing | independently-demonstrated | independently-demonstrated | — | — | — |
| 15 | Unknown question family (meet) in place of modelling | 9 | independent | developing | developing | developing | developing | modelling | — | — |
| 16 | Restart and persistence (rebuilt session, reversed store order, client-supplied claims ignored) | 9 | independent | independently-demonstrated | developing | independently-demonstrated | independently-demonstrated | — | — | — |

## Notes per journey

- **6.** `{"forgedClientVerdict":{"gated":"developing","twoStep":"insufficient-evidence","twoStepMethod":"not-established","verified":0,"gatedMethod":"developing"}}`
- **9.** `{"guesses":[{"q":"gen:lin:6,17,3:mc","right":false},{"q":"gen:lin:2,17,12:mc","right":true},{"q":"gen:lin:2,4,6:mc","right":false},{"q":"gen:lin:7,9,11:mc","right":false},{"q":"gen:lin:2,4,7:mc","right":false},{"q":"gen:lin:7,9,10:mc","right":false},{"q":"gen:lboth:7,7,4,3:mc","right":false},{"q":"gen:lboth:6,18,3,10:mc","right":false},{"q":"gen:lboth:6,14,5,12:mc","right":false},{"q":"gen:lboth:4,5,3,6:mc","right":true},{"q":"gen:lboth:5,18,1,1:mc","right":false},{"q":"gen:lboth:6,7,4,2:mc","right":false},{"q":"gen:lbrk:4,4,2,1:mc","right":false},{"q":"gen:lbrk:3,3,2,14:mc","right":true},{"q":"gen:lbrk:5,-5,1,13:mc","right":false},{"q":"gen:lbrk:5,-1,2,15:mc","right":false},{"q":"gen:lbrk:5`
- **10.** `{"checkPlan":[{"subSkill":"linear-equations.two-step@1","questions":["gen:lin:6,17,2"],"unchecked":false,"reason":"1 fresh retention item(s) from lin"},{"subSkill":"linear-equations.both-sides@1","questions":["gen:lboth:7,13,1,7","gen:lboth:9,6,6,6"],"unchecked":false,"reason":"2 fresh retention item(s) from lboth"},{"subSkill":"linear-equations.brackets@1","questions":["gen:lbrk:4,-1,3,6","gen:lbrk:4,-1,3,5"],"unchecked":false,"reason":"2 fresh retention item(s) from lbrk"},{"subSkill":"linear-equations.modelling@1","questions":["gen:aulwp:3,2,8,28"],"unchecked":false,"reason":"1 fresh retention item(s) from auleq/aulwp"}]}`
- **11.** `{"beforeRecovery":{"gated":"recovery-required","recoveryRequired":["linear-equations.brackets@1"],"existing":{"status":"review","verified":false,"claimsCompetence":false,"retention":"failed","retentionDueAt":"2026-03-09T09:02:00.000Z","recoveryRequired":true,"independent":{"right":13,"total":14}}}}`
- **13.** `{"afterPracticeSlip":{"gated":"independently-demonstrated","existing":"independent"}}`
- **14.** `{"current":{"existing":"independent","gated":"independently-demonstrated","method":"independently-demonstrated","verified":[2,2,2,0],"methodStatus":["verified","verified","verified","not-established"]},"olderAuthority":{"existing":"independent","gated":"independently-demonstrated","method":"developing","verified":[0,0,0,0],"methodStatus":["not-established","not-established","not-established","not-established"]},"beforeD1":{"existing":"independent","gated":"independently-demonstrated","method":"developing","verified":[0,0,0,0],"methodStatus":["not-established","not-established","not-established","not-established"]},"olderAuthorityFalseStep":{"gated":"developing","twoStep":"insufficient-eviden`
- **16.** `{"identicalAfterRestart":true,"identicalWithReversedStoreOrder":true,"clientClaimsIgnored":true}`

## Disagreements recorded

- 1 [gated] existing **independent**, proposed **developing**: not shown: linear-equations.both-sides@1, linear-equations.brackets@1, linear-equations.modelling@1
- 1 [gated-typed] existing **independent**, proposed **developing**: not shown: linear-equations.both-sides@1, linear-equations.brackets@1, linear-equations.modelling@1
- 1 [gated-method] existing **independent**, proposed **developing**: not shown: linear-equations.both-sides@1, linear-equations.brackets@1, linear-equations.modelling@1
- 1 [gated-slip] existing **independent**, proposed **developing**: not shown: linear-equations.both-sides@1, linear-equations.brackets@1, linear-equations.modelling@1
- 2 [gated] existing **independent**, proposed **developing**: not shown: linear-equations.two-step@1, linear-equations.brackets@1, linear-equations.modelling@1
- 2 [gated-typed] existing **independent**, proposed **developing**: not shown: linear-equations.two-step@1, linear-equations.brackets@1, linear-equations.modelling@1
- 2 [gated-method] existing **independent**, proposed **developing**: not shown: linear-equations.two-step@1, linear-equations.brackets@1, linear-equations.modelling@1
- 2 [gated-slip] existing **independent**, proposed **developing**: not shown: linear-equations.two-step@1, linear-equations.brackets@1, linear-equations.modelling@1
- 3 [gated] existing **independent**, proposed **developing**: not shown: linear-equations.two-step@1, linear-equations.both-sides@1, linear-equations.modelling@1
- 3 [gated-typed] existing **independent**, proposed **developing**: not shown: linear-equations.two-step@1, linear-equations.both-sides@1, linear-equations.modelling@1
- 3 [gated-method] existing **independent**, proposed **developing**: not shown: linear-equations.two-step@1, linear-equations.both-sides@1, linear-equations.modelling@1
- 3 [gated-slip] existing **independent**, proposed **developing**: not shown: linear-equations.two-step@1, linear-equations.both-sides@1, linear-equations.modelling@1
- 4 [gated] existing **independent**, proposed **developing**: not shown: linear-equations.two-step@1, linear-equations.both-sides@1, linear-equations.brackets@1
- 4 [gated-typed] existing **independent**, proposed **insufficient-evidence**: not shown: linear-equations.two-step@1, linear-equations.both-sides@1, linear-equations.brackets@1, linear-equations.modelling@1
- 4 [gated-method] existing **independent**, proposed **developing**: not shown: linear-equations.two-step@1, linear-equations.both-sides@1, linear-equations.brackets@1
- 4 [gated-slip] existing **independent**, proposed **developing**: not shown: linear-equations.two-step@1, linear-equations.both-sides@1, linear-equations.brackets@1
- 5 [gated-typed] existing **independent**, proposed **developing**: not shown: linear-equations.modelling@1
- 6 [gated] existing **independent**, proposed **developing**: not shown: linear-equations.two-step@1
- 6 [gated-typed] existing **independent**, proposed **developing**: not shown: linear-equations.two-step@1, linear-equations.modelling@1
- 6 [gated-method] existing **independent**, proposed **developing**: not shown: linear-equations.two-step@1
- 6 [gated-slip] existing **independent**, proposed **developing**: not shown: linear-equations.two-step@1
- 7 [gated-typed] existing **independent**, proposed **developing**: not shown: linear-equations.modelling@1
- 7 [gated-method] existing **independent**, proposed **developing**: not shown: linear-equations.two-step@1, linear-equations.both-sides@1, linear-equations.brackets@1
- 10 [gated-slip] existing **review (recovery required)**, proposed **developing**: recovered on the sub-skill that failed, or the failure was on another sub-skill
- 11 [gated-typed] existing **independent**, proposed **developing**: not shown: linear-equations.modelling@1
- 11 [gated-slip] existing **independent**, proposed **developing**: not shown: linear-equations.brackets@1
- 12 [gated] existing **independent**, proposed **recovery-required**: recovery required on linear-equations.brackets@1
- 12 [gated-typed] existing **independent**, proposed **recovery-required**: recovery required on linear-equations.brackets@1
- 12 [gated-method] existing **independent**, proposed **recovery-required**: recovery required on linear-equations.brackets@1
- 12 [gated-slip] existing **independent**, proposed **developing**: not shown: linear-equations.brackets@1
- 13 [gated-slip] existing **review**, proposed **independently-demonstrated**: the existing policy requires recovery (competency-wide); every sub-skill is currently shown
- 14 [gated-typed] existing **independent**, proposed **developing**: not shown: linear-equations.modelling@1
- 15 [gated] existing **independent**, proposed **developing**: not shown: linear-equations.modelling@1
- 15 [gated-typed] existing **independent**, proposed **developing**: not shown: linear-equations.modelling@1
- 15 [gated-method] existing **independent**, proposed **developing**: not shown: linear-equations.modelling@1
- 15 [gated-slip] existing **independent**, proposed **developing**: not shown: linear-equations.modelling@1
- 16 [gated-typed] existing **independent**, proposed **developing**: not shown: linear-equations.modelling@1
