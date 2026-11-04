# 04 — Teaching-decision evaluation

Representative scenarios from the six categories, through the real components (only learner actions scripted). For every explanation the engine delivered, the learner's state just before it was rebuilt from the records (`learnerState`, `moduleState`, `hypotheses`), and the evidence the decision rested on was recorded (`frontend/scripts/m2-teaching-decisions.mts`).

- **justified:** an established misconception (learner-hypothesis@1, ≥ 2 supporting answers); or a wrong independent check after an earlier explanation; or (decision C) recovery found no prerequisite gap and the problem is still wrong.
- **plausible, unverified:** the module's own starting check or recovery reached no established diagnosis (for example `insufficient_evidence`). The explanation is reasonable, but the evidence does not show it addresses this learner's difficulty.
- Content column: the explanation's classification in 03.

| scenario | category | learner | assessed | investigated | taught | paused | escalated | ended |
|---|---|---|---|---|---|---|---|---|
| 1b | strong learner, one isolated slip | strong, one slip at answer 3 | yes | no | 0 | no | no | done |
| 1a | strong learner, one isolated slip | strong, one slip at answer 1 | yes | no | 0 | no | no | done |
| 2a | same mathematical error repeated | misconception forgot-divide until 1 explanation(s) | yes | yes | 1 | no | no | done |
| 2b | same mathematical error repeated | misconception forgot-divide until never explanation(s) | yes | yes | 2 | yes | yes | pause |
| 2c | same mathematical error repeated | misconception added-not-subtracted until 1 explanation(s) | yes | yes | 1 | no | no | done |
| 2h | same mathematical error repeated | misconception minus-c-sign until never explanation(s) | yes | yes | 3 | yes | yes | pause |
| 3a | missing prerequisite competency | lacks integer-add (minus-c-sign+minus-negative-as-minus) until it is taught | no | yes | 2 | no | no | done |
| 3c | missing prerequisite competency | lacks place-value-tens (no-regroup) until it is taught | yes | yes | 1 | no | no | done |
| 3d | missing prerequisite competency | lacks multiplication-tables (fact-slip:5x6) until it is taught | no | yes | 2 | no | no | done |
| 3h | missing prerequisite competency | misconception sign-dropped until never explanation(s) | yes | yes | 2 | yes | yes | pause |
| 4a | succeeds only after hints | right only after a hint | yes | yes | 2 | yes | no | pause |
| 4b | succeeds only after hints | hint in guided practice, then right alone | yes | yes | 0 | no | no | done |
| 4c | succeeds only after hints | hint, still wrong | yes | yes | 2 | no | no | done |
| 5a | fails after the first teaching | misconception forgot-divide until 2 explanation(s) | yes | yes | 2 | no | no | done |
| 5b | fails after the first teaching | always wrong (readable) | yes | yes | 2 | yes | no | pause |
| 5c | fails after the first teaching | misconception forgot-divide, slips the first check after teaching | yes | yes | 2 | no | no | done |
| 6a | forgets during delayed retention | strong, slips once on the delayed check | yes | no | 0 | no | no | done |
| 6e | forgets during delayed retention | strong, slips once on the delayed check | yes | no | 0 | no | no | done |

## Every teaching decision

| scenario | skill | explanation | evidence it rested on | verdict | content (03) |
|---|---|---|---|---|---|
| 2a | linear-equations | spot_the_mistake | established misconception: forgot-divide (2 supporting answer(s)) | justified | ready for supervised educational evaluation |
| 2b | linear-equations | spot_the_mistake | established misconception: forgot-divide (2 supporting answer(s)) | justified | ready for supervised educational evaluation |
| 2b | linear-equations | check_what_it_uses | established misconception: forgot-divide (3 supporting answer(s)) | justified | demonstration-only |
| 2c | linear-equations | spot_the_mistake | established misconception: added-not-subtracted (2 supporting answer(s)) | justified | ready for supervised educational evaluation |
| 2h | quadratic-discriminant | parabola | module starting check: insufficient_evidence (confidence 0.39); hypotheses none | plausible, unverified | not reviewed |
| 2h | quadratics | square_meaning | recovery named this skill (uncertain) | plausible, unverified | not reviewed |
| 2h | quadratics | two_numbers | recovery named this skill (uncertain) | plausible, unverified | not reviewed |
| 3a | integer-add | tokens | established misconception: minus-c-sign (2 supporting answer(s)) | justified | requires teaching-content revision |
| 3a | quadratic-discriminant | signed_numbers | established misconception: minus-c-sign (2 supporting answer(s)) | justified | not reviewed |
| 3c | place-value-tens | count_on | established misconception: no-regroup (2 supporting answer(s)) | justified | requires teaching-content revision |
| 3d | multiplication-tables | near_fact | established misconception: fact-slip:5x6 (2 supporting answer(s)) | justified | ready for supervised educational evaluation |
| 3d | multi-multiplication | check_what_it_uses | established misconception: fact-slip:5x6 (2 supporting answer(s)) | justified | requires teaching-content revision |
| 3h | algebra-simplify | check_what_it_uses | recovery found no gap in the skills it builds on; the problem is still wrong | justified | demonstration-only |
| 3h | algebra-simplify | check_number | recovery found no gap in the skills it builds on; the problem is still wrong | justified | requires teaching-content revision |
| 4a | linear-equations | spot_the_mistake | module starting check: insufficient_evidence (confidence 0.47); hypotheses none | plausible, unverified | ready for supervised educational evaluation |
| 4a | linear-equations | check_what_it_uses | module starting check: insufficient_evidence (confidence 0.47); hypotheses unsupported | plausible, unverified | demonstration-only |
| 4c | linear-equations | spot_the_mistake | module starting check: insufficient_evidence (confidence 0.47); hypotheses none | plausible, unverified | ready for supervised educational evaluation |
| 4c | linear-equations | check_what_it_uses | module starting check: insufficient_evidence (confidence 0.47); hypotheses unsupported | plausible, unverified | demonstration-only |
| 5a | linear-equations | spot_the_mistake | established misconception: forgot-divide (2 supporting answer(s)) | justified | ready for supervised educational evaluation |
| 5a | linear-equations | check_what_it_uses | established misconception: forgot-divide (3 supporting answer(s)) | justified | demonstration-only |
| 5b | linear-equations | spot_the_mistake | module starting check: insufficient_evidence (confidence 0.47); hypotheses none | plausible, unverified | ready for supervised educational evaluation |
| 5b | linear-equations | check_what_it_uses | module starting check: insufficient_evidence (confidence 0.47); hypotheses unsupported | plausible, unverified | demonstration-only |
| 5c | linear-equations | spot_the_mistake | established misconception: forgot-divide (2 supporting answer(s)) | justified | ready for supervised educational evaluation |
| 5c | linear-equations | check_what_it_uses | established misconception: forgot-divide (2 supporting answer(s)) | justified | demonstration-only |

**15 of 24 teaching decisions are justified by evidence; 9 are plausible but unverified.**

## What the engine did against the evidence, by category, and what it should do
| category | engine | assessment |
|---|---|---|
| isolated slip (1a, 1b) | completes the starting check when there is no prior evidence (1a); nothing further after a slip once the skill is shown (1b) | correct (decision A) |
| persistent misconception (2a, 2b, 2c) | investigates, establishes the misconception, teaches the explanation aimed at it, and rechecks alone; if the learner never learns: a second explanation, then a pause | the first decision is justified and the content is ready for evaluation. **The second explanation is the generic "check what it uses" (demonstration-only)**: correct action, weak content |
| missing prerequisite (3a, 3c, 3d) | recovery establishes the prerequisite misconception, teaches that skill, rechecks, and returns | justified; but 3 of the 4 prerequisite explanations used need content revision |
| no prerequisite gap (3h) | teaches the problem's own skill (decision C), rechecks, one more try, then a person | justified; the first own-skill explanation chosen is demonstration-only |
| succeeds only with hints (4a, 4c) | teaches "spot the mistake" (about the forgot-divide misconception) with no misconception established, then a second explanation, then a pause | **plausible but unverified: the engine teaches a specific misconception's explanation without evidence of that misconception.** It should either investigate further (no question discriminated) or teach a general method explanation; reaching a pause with no false mastery is correct |
| fails the first explanation (5a, 5b, 5c) | after a wrong independent check it delivers the next eligible explanation; never-right learners pause after the explanations run out | the action is justified; the second-line content is weak (as in category 2) |
| fails delayed retention (6a, 6e) | marks the skill for review, asks recovery questions, no teaching when the learner recovers at once, then a new cycle | correct (decision B); there is no evidence-based reteach after repeated retention failure, because the record shows none |

Other observations:
- Category 2h (discriminant, choice questions, never learns) delivered 3 explanations from 2 skills outside the audited 17, all "plausible, unverified" (uncertain readings); they are not reviewed in 03.
- After a recovery escalates, the module can start a new recovery on another of its own wrong answers (3h). Each is bounded on its own (`again < 2`), but together they add questions before the final pause.