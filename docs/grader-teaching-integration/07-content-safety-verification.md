# 7. Content-safety verification

D1 changed no explanation, no review record and no blocklist entry:

- `git diff 4f97427 -- content/learning/explanation-review.v1.json content/learning/explanation-blocklist.v1.json` is empty;
- the only content change is the reference question added to `modules.v1.json` `questions`. It is a question, not teaching content: provisional, and in no module list.

| Requirement | State in D1 | Evidence |
|---|---|---|
| A3 new and revised explanations remain unapproved | 1,527 registry entries: 1,481 `pending_review`, 44 `revision_required`, 5 `demo_only`, 4 `blocked`, **0 approved**. Linear equations: 14 pending, 2 revision required, 1 demo only. | registry counts; `explanation-review.ts check`: "registry OK" |
| Revision-bound records | Unchanged; checked by the registry check and `content-safety.test.ts` | doc 9 |
| The four blocked revisions | Still 4 `blocked` entries and 4 blocklist entries | registry, blocklist |
| Demonstration labels | Every explanation shown in the D1 journeys carries the gate's label "Demonstration: this explanation has not been approved by an educator." (provenance check on every journey) | doc 6, `grader-teaching.test.ts` |
| Supervised-mode refusal | D1-14: in `supervised-evaluation`, forgot-divide is established but `fix_finish` is not eligible (`contentEligibility` false). No explanation is displayed, and the engine escalates to a teacher ("Ask a teacher or parent"). | D1-14 trace |
| Educator review requirements | No approval was added. No fixture approval is written to the registry: A3's fixture approval exists only inside an in-memory test clone. | registry diff empty |
| No gate bypass | Teaching is selected only by `moduleState` through `contentEligibility`. The feedback text added by D1 is grader-owned (templates over the decision), not teaching content, and it is checked by `provenance.ts`. | doc 4 |

The safety suites are listed in doc 9 with their results: `content-safety.test.ts`, `content-corrections.test.ts`, `linear-equations.test.ts`, the registry check, and the A2 teaching-decision script.
