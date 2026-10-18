# Evaluation prompts

Versioned prompt files. A prompt is never edited in place once used: a change is a new version, so
every recorded proposal can be traced to the exact prompt that produced it.

| File | Protocol | Status |
|---|---|---|
| `evaluate.v1.md` | E1 extended writing | Kept unchanged; earlier evidence and the frozen simulation use it |
| `evaluate.v2.md` | E3 extended writing: every rubric criterion scored with a quote; band checked against them (check 12) | E3a, mock evaluators only |
| `short.v1.md` | E3 short written answers: key points marked with quotes; code decides right or wrong | E3a, mock evaluators only |
| `essay-observe.v1.md` | Essay-to-mastery: quoted error and strength observations per Grade 8 competency; code finds every span | Fixtures and the pattern stand-in only |
| `essay-rewrite.v1.md` | Essay-to-mastery: 50-word rewrite judged on five separate dimensions with quotes and key ideas | Fixtures only |
| `essay-questions.v1.md` | Essay-to-diagnostic: five fresh questions for one suspected competency; code checks structure, answer key and duplicates; always provisional | Server gateway (synthetic only); mocked provider in tests; no paid call made |

`{{REQUEST_JSON}}` is filled with the request (`renderFreeformPrompt` in `freeform.ts`). For E3
prompts the learner's response is also placed between fixed markers (`{{RESPONSE_TEXT}}`), so the
model can be told plainly that it is data, not instructions. No prompt has been sent to any live
model (decision of 12 October).
