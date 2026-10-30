# 03 — Adaptive scenario matrix

41 scenarios in 6 categories through the integrated components: the real grader, records and evidence, adaptive engine, and renderer adapter with a provenance check on every frame. Only the learner's actions are scripted (`frontend/src/journey/learners.ts`); every scenario is checked against the ten required properties, read from the records and the trace (`scenarios.ts` `checkScenario`). Machine-readable: `scenario-matrix.json`.

Result: **all scenarios pass all 10 properties.** The properties are: 1 grading authority · 2 evidence recording · 3 honest uncertainty · 4 investigation decision · 5 eligible teaching · 6 independent recheck · 7 assistance history · 8 no false mastery · 9 retention or recovery decision · 10 bounded termination.

## 1. strong learner, one isolated slip

| id | learner | start | entry / retry / later | ended | status | explanations delivered | retention cycles | submissions | 10/10 |
|---|---|---|---|---|---|---|---|---|---|
| 1a | strong, one slip at answer 1 | `gen:lin:2,17,11` | diagnostic | done | transfer | — | pending | 13 | 10/10 |
| 1b | strong, one slip at answer 3 | `gen:lin:2,17,11` | diagnostic | done | transfer | — | pending | 12 | 10/10 |
| 1c | strong, one slip at answer 5 | `gen:lin:2,17,11` | diagnostic | done | transfer | — | pending | 12 | 10/10 |
| 1d | strong, one slip at answer 4 | `gen:lin:3,9,8` | diagnostic | done | transfer | — | pending | 13 | 10/10 |
| 1e | strong, one slip at answer 4 | `gen:lneg:5,-5,9` | diagnostic | done | transfer | — | pending | 15 | 10/10 |
| 1f | strong, one slip at answer 3 | `gen:lin:2,17,11` | practice | done | transfer | — | pending | 12 | 10/10 |
| 1g | strong (always right) | `gen:lin:2,17,11` | diagnostic | done | transfer | — | pending | 12 | 10/10 |

## 2. same mathematical error repeated

| id | learner | start | entry / retry / later | ended | status | explanations delivered | retention cycles | submissions | 10/10 |
|---|---|---|---|---|---|---|---|---|---|
| 2a | misconception forgot-divide until 1 explanation(s) | `gen:lin:2,17,11` | diagnostic | done | transfer | spot_the_mistake | pending | 16 | 10/10 |
| 2b | misconception forgot-divide until never explanation(s) | `gen:lin:2,17,11` | diagnostic | pause | exposure | spot_the_mistake, check_what_it_uses | — | 8 | 10/10 |
| 2c | misconception added-not-subtracted until 1 explanation(s) | `gen:lin:2,17,11` | diagnostic | done | transfer | spot_the_mistake | pending | 16 | 10/10 |
| 2d | misconception forgot-divide, retries every time | `gen:lin:2,17,11` | diagnostic / retry | pause | exposure | — | — | 9 | 10/10 |
| 2e | wrong first, right on the retry | `gen:lin:2,17,11` | diagnostic / retry | done | transfer | — | pending | 16 | 10/10 |
| 2f | unreadable always | `gen:lin:2,17,11` | diagnostic | pause (bounded-input@1: 2 unreadable answers to gen:lin:3,3,2) | not_started | — | — | 3 | 10/10 |
| 2g | unreadable 1 time(s), then right | `gen:lin:2,17,11` | diagnostic | done | transfer | — | pending | 14 | 10/10 |
| 2h | misconception minus-c-sign until never explanation(s) | `gen:disc:-1,-6:mc` | diagnostic | pause | exposure | parabola, square_meaning, two_numbers | — | 15 | 10/10 |

## 3. missing prerequisite competency

| id | learner | start | entry / retry / later | ended | status | explanations delivered | retention cycles | submissions | 10/10 |
|---|---|---|---|---|---|---|---|---|---|
| 3a | lacks integer-add (minus-c-sign+minus-negative-as-minus) until it is taught | `gen:disc:-2,-7` | practice | done | transfer | tokens, signed_numbers | pending | 17 | 10/10 |
| 3b | lacks integer-add (move-keep-sign) until it is taught | `gen:lneg:5,-5,9` | practice | done | transfer | tokens | pending | 33 | 10/10 |
| 3c | lacks place-value-tens (no-regroup) until it is taught | `gen:addr:36,24` | practice | done | transfer | count_on | pending | 26 | 10/10 |
| 3d | lacks multiplication-tables (fact-slip:5x6) until it is taught | `gen:mmul:25,6` | practice | done | transfer | near_fact, check_what_it_uses | pending | 24 | 10/10 |
| 3e | lacks integer-add (sign-dropped) until it is taught | `gen:ahlike:9,-9,-5,-3` | practice | done | transfer | tokens | pending | 32 | 10/10 |
| 3f | misconception minus-c-sign+minus-negative-as-minus until never explanation(s) | `gen:disc:-2,-7` | practice | pause | exposure | tokens, spot_the_mistake, signed_numbers, parabola, careful_signs | — | 12 | 10/10 |
| 3h | misconception sign-dropped until never explanation(s) | `gen:ahlike:9,-9,-5,-3` | practice | pause | exposure | — | — | 18 | 10/10 |
| 3g | lacks integer-add (minus-c-sign+minus-negative-as-minus) until it is taught | `gen:disc:-2,-7` | diagnostic | done | transfer | tokens | pending | 33 | 10/10 |

## 4. succeeds only after hints

| id | learner | start | entry / retry / later | ended | status | explanations delivered | retention cycles | submissions | 10/10 |
|---|---|---|---|---|---|---|---|---|---|
| 4a | right only after a hint | `gen:lin:2,17,11` | diagnostic | pause | guided | spot_the_mistake, check_what_it_uses | — | 10 | 10/10 |
| 4b | hint in guided practice, then right alone | `gen:lin:2,17,11` | diagnostic | done | transfer | — | pending | 15 | 10/10 |
| 4c | hint, still wrong | `gen:lin:2,17,11` | diagnostic | done | transfer | spot_the_mistake, check_what_it_uses | pending | 18 | 10/10 |
| 4d | asks for hints everywhere | `gen:lin:2,17,11` | diagnostic | done | transfer | — | pending | 12 | 10/10 |
| 4e | right only after a hint | `gen:lneg:5,-5,9` | diagnostic | pause | guided | spot_the_mistake, check_what_it_uses | — | 9 | 10/10 |
| 4f | right with help, wrong alone | `gen:lin:2,17,11` | diagnostic | pause | guided | spot_the_mistake, check_what_it_uses | — | 10 | 10/10 |

## 5. fails after the first teaching

| id | learner | start | entry / retry / later | ended | status | explanations delivered | retention cycles | submissions | 10/10 |
|---|---|---|---|---|---|---|---|---|---|
| 5a | misconception forgot-divide until 2 explanation(s) | `gen:lin:2,17,11` | diagnostic | done | transfer | spot_the_mistake, check_what_it_uses | pending | 17 | 10/10 |
| 5b | always wrong (readable) | `gen:lin:2,17,11` | diagnostic | pause | exposure | spot_the_mistake, check_what_it_uses | — | 10 | 10/10 |
| 5c | misconception forgot-divide, slips the first check after teaching | `gen:lin:2,17,11` | diagnostic | done | transfer | spot_the_mistake, check_what_it_uses | pending | 17 | 10/10 |
| 5d | misconception forgot-divide until 2 explanation(s) | `gen:lin:2,17,11` | diagnostic / retry | done | transfer | spot_the_mistake, check_what_it_uses | pending | 17 | 10/10 |
| 5e | misconception move-keep-sign until 2 explanation(s) | `gen:lneg:5,-5,9` | diagnostic | pause | exposure | — | — | 18 | 10/10 |
| 5f | misconception forgot-divide until 3 explanation(s) | `gen:lin:2,17,11` | diagnostic | pause | exposure | spot_the_mistake, check_what_it_uses | — | 8 | 10/10 |

## 6. forgets during delayed retention

| id | learner | start | entry / retry / later | ended | status | explanations delivered | retention cycles | submissions | 10/10 |
|---|---|---|---|---|---|---|---|---|---|
| 6a | strong, slips once on the delayed check | `gen:lin:2,17,11` | diagnostic / +8d | done | transfer | — | failed, pending | 15 | 10/10 |
| 6b | strong (always right) | `gen:lin:2,17,11` | diagnostic / +3d | done | transfer | — | pending | 12 | 10/10 |
| 6c | strong (always right) | `gen:lin:2,17,11` | diagnostic / +8d | done | transfer | — | passed | 14 | 10/10 |
| 6d | misconception forgot-divide until 1 explanation(s) | `gen:lin:2,17,11` | diagnostic / +8+8d | done | transfer | spot_the_mistake | passed | 18 | 10/10 |
| 6e | strong, slips once on the delayed check | `gen:disc:-2,-7` | practice / +8d | done | transfer | — | failed, pending | 15 | 10/10 |
| 6f | strong, slips once on the delayed check | `gen:lneg:5,-5,9` | diagnostic / +8d | done | transfer | — | failed, pending | 18 | 10/10 |

Notes: 1c and 1e:
- 1c: after the slip: 0 starting-check question(s) resumed, no diagnosis of the slip, no teaching
- 1e: after the slip: 0 starting-check question(s) resumed, no diagnosis of the slip, no teaching
- 1a: a slip on the very first answer, with no earlier evidence, is treated like any first wrong answer.
- 3h and 5e: recovery found every supporting skill secure, and the problem was still wrong after 3 tries, so it escalated to a person (bounded). See 02, policy 3.
