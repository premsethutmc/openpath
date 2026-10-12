# Evaluation prompts

Versioned prompt files. A prompt is never edited in place once used: a change is a new version, so
every recorded proposal can be traced to the exact prompt that produced it.

| File | Protocol | Status |
|---|---|---|
| `evaluate.v1.md` | E1 extended writing | Kept unchanged; earlier evidence and the frozen simulation use it |
| `evaluate.v2.md` | E3 extended writing: every rubric criterion scored with a quote; band checked against them (check 12) | E3a, mock evaluators only |
| `short.v1.md` | E3 short written answers: key points marked with quotes; code decides right or wrong | E3a, mock evaluators only |

`{{REQUEST_JSON}}` is filled with the request (`renderFreeformPrompt` in `freeform.ts`). For E3
prompts the learner's response is also placed between fixed markers (`{{RESPONSE_TEXT}}`), so the
model can be told plainly that it is data, not instructions. No prompt has been sent to any live
model (decision of 12 October).
