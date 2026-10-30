# 04 — Before / after traces

Question `gen:lin:2,17,11` (Solve 2x + 17 = 39; forgot-divide predicts 22; right answer 11). Learner input is the only scripted element; each row is a real component call (`frontend/src/journey/session.ts`; reproduced by `slice.test.ts` and the browser run).

## Before (baseline branches)
- Renderer (12a82f9): feedback and teacher text were hard-coded per experience; the algebra experience graded with a demo grader; no multiple-choice input rendered; no link to the grader, evidence or adaptive engine.
- Adaptive branches (e2176d2 / 2db1c44 / 5289948): journey driven by a synthetic `Driver` with no renderer; evidence and loop each carried their own investigation and retention variants; P2 not reachable.

## After (`integration/milestone-1`)
| # | authority | real component called | decision | output |
|---|---|---|---|---|
| 1 | mathematical-grader | `server-grader.gradeRequest` | correctness | {"verdict":"incorrect","credit":false,"source":"kernel","reason":"incorrect.value"} |
| 2 | evidence-engine | `session.learnerState / evidenceFor` | observation | {"attempts":1,"independent":{"right":0,"total":1},"retention":"none"} |
| 3 | adaptive-engine | `hypotheses.investigationTrigger` | investigation | {"kind":"modelled-error","detail":"the answer is the one predicted by: forgot-divide"} |
| 4 | adaptive-engine | `intervention.moduleState` | investigation | {"phase":"explore","question":"gen:lin:3,3,2","strategy":null,"reason":"A short check to find the right starting point.","context":null} |
| 5 | mathematical-grader | `server-grader.gradeRequest` | correctness | {"verdict":"incorrect","credit":false,"source":"kernel","reason":"incorrect.value"} |
| 6 | evidence-engine | `session.learnerState / evidenceFor` | observation | {"attempts":2,"independent":{"right":0,"total":2},"retention":"none"} |
| 7 | adaptive-engine | `hypotheses.investigationTrigger` | investigation | {"kind":"modelled-error","detail":"the answer is the one predicted by: forgot-divide"} |
| 8 | adaptive-engine | `intervention.moduleState` | investigation | {"phase":"explore","question":"gen:lin:3,9,8","strategy":null,"reason":"A short check to find the right starting point.","context":null} |
| 9 | mathematical-grader | `server-grader.gradeRequest` | correctness | {"verdict":"incorrect","credit":false,"source":"kernel","reason":"incorrect.value"} |
| 10 | evidence-engine | `session.learnerState / evidenceFor` | observation | {"attempts":3,"independent":{"right":0,"total":3},"retention":"none"} |
| 11 | adaptive-engine | `hypotheses.investigationTrigger` | investigation | {"kind":"modelled-error","detail":"the answer is the one predicted by: forgot-divide"} |
| 12 | adaptive-engine | `intervention.moduleState` | teaching-selection | {"phase":"chapter","question":null,"strategy":"spot_the_mistake","reason":"You have the idea; a step in the method slips. Here is the method, one step.","context":null} |
| 13 | evidence-engine | `session.make.teach` | observation | {"recorded":true} |
| 14 | adaptive-engine | `intervention.moduleState` | recheck | {"phase":"guided","question":"gen:lin:7,9,12","strategy":"spot_the_mistake","reason":"Practise it once, with a hint if you want one. This counts as practice with help."," |
| 15 | mathematical-grader | `server-grader.gradeRequest` | correctness | {"verdict":"correct","credit":true,"source":"kernel","reason":"correct.equal"} |
| 16 | evidence-engine | `session.learnerState / evidenceFor` | observation | {"attempts":4,"independent":{"right":0,"total":3},"retention":"none"} |
| 17 | adaptive-engine | `intervention.moduleState` | recheck | {"phase":"check","question":"gen:lin:3,3,4:mc","strategy":"spot_the_mistake","reason":"Now one new question on your own, with no hints.","context":null} |
| 18 | mathematical-grader | `server-grader.gradeRequest` | correctness | {"verdict":"correct","credit":true,"source":"kernel","reason":"correct.equal"} |
| 19 | evidence-engine | `session.learnerState / evidenceFor` | observation | {"attempts":5,"independent":{"right":1,"total":4},"retention":"none"} |
| 20 | adaptive-engine | `intervention.moduleState` | recheck | {"phase":"verify","question":"gen:lin:7,9,11:mc","strategy":null,"reason":"Right on your own after help: progress, not yet mastery. More practice on your own shows it is  |
| 21 | mathematical-grader | `server-grader.gradeRequest` | correctness | {"verdict":"correct","credit":true,"source":"kernel","reason":"correct.equal"} |
| 22 | evidence-engine | `session.learnerState / evidenceFor` | observation | {"attempts":6,"independent":{"right":2,"total":5},"retention":"scheduled"} |

(first 22 of 47 entries) Final evidence: status=transfer, independent 9/12, retention=scheduled, due 2026-11-09T09:07:00.000Z
