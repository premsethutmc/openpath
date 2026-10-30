# 02 — Reliability fixes and policy decisions

Every fix is in the single existing implementation of its concern; no second adaptive or evidence engine was added.

## A. Bounded learner interactions
| Policy | Where | Behaviour | Tests |
|---|---|---|---|
| bounded-input@1 (`UNREADABLE_LIMIT` = 2) | `intervention.moduleState` (the adaptive engine's single entry) | after 2 unreadable answers to the question the module would ask next, the module stops for a person (`pause`, `why: bounded-input@1`). Unreadable answers stay outside the attempts (P1): no credit, no misconception, no mastery | `bounded-interactions.test.ts`, scenarios 2f, 2g, coverage "unreadable" ×17, browser 2f |
| bounded-retry@1 (`RETRY_LIMIT` = 2, `retriesLeft`) | `intervention.ts`; used by the app (`Learn.tsx` study-session `Feedback`) and the slice flow | the first try plus at most 2 retries on a question; then only "Continue with another question". A retry is never independent evidence (n > 1) | `bounded-interactions.test.ts`, scenarios 2d, 2e, 5d, browser 2d |
| recovery escalation | `intervention.recovery` | after the first try and `RETRY_LIMIT` returns, all wrong, recovery escalates to a person (existing `escalate` → `pause@1`) instead of returning again | `bounded-interactions.test.ts`, scenarios 3h, 5e |

A repeatedly incorrect learner already terminated (the existing pause: "every explanation tried" / "different explanations have not clicked"). Scenarios 2b, 5b, 2h and 4a confirm this, and none of them reaches mastery.

## B. Question-selection governance
`hypotheses.ts` selects only through `discriminatingProbe`. That function applies `selectable()` (not quarantined), `formCertified()` (generated questions) and the learner's grade ceiling, which is stricter than the registered `fromPool`, and its only caller is `intervention.ts` (registered). After a new behavioural test passed — every probe for every misconception of every pooled module, at grades 3, 6, 9 and 12, is selectable, form-certified and not quarantined — `hypotheses.ts` was added to the allowlist with a comment. All the earlier tests that keep quarantined questions away from learners are unchanged and pass.

## C. Frontend correctness
- `src/journey` is moved from the main config to the integration config, which owns the learning package, consistent with `src/learning`. The main config now excludes the renderer's `react-shim.d.ts`, a stand-in for environments without React types that overrode the real ones.
- Two unused locals in the renderer demos are removed.
- Result: main config 0 errors (was 391 unique), English 0. The integration config's remaining errors are those already present on every source branch, plus one environment error (`bun:test` types are not available; 56 files share it).

## D. Teaching provenance
`journey/provenance.ts` checks every frame the renderer is given: prompt and choices equal the question's own; hints are the question's hint or the app's fallback line; guidance is an engine reason, a selected strategy title, or a fixed adapter label that states no mathematics; feedback level equals the grader's verdict and its reason is the decision's; a teaching step must be a line of the strategy the engine selected, and is never "verified". Every scenario runs it (property 1). In production `Learn.tsx` the shown solution is the question's own `solution` text, and the renderer's demo graders (`src/math/experiences`) are not on any journey path.

## Policy decisions and points for the product owner
1. **Isolated slip (conditionally approved in M1), unchanged.** A slip that matches a modelled misconception (for example a choice distractor) is evidence and is investigated. An unexplained slip is not. When a slip lowers the evidence status of a learner who had been showing the skill, the module resumes its own unfinished starting check (2–3 questions). This is not a diagnosis of the slip and leads to no teaching. Scenarios 1c and 1e report the count. **Decide** whether that resumption is acceptable.
2. **Retention after a failed check.** The skill keeps its earned status (for example `transfer`); the failure is recorded, the next check is due a cycle later, and `verified` is not reached while the latest cycle has failed. **Confirm** that a failed delayed check should not lower the status.
3. **Escalation instead of teaching (5e, 3h).** When recovery's supporting skills are all secure and the learner is still wrong on the problem, the engine now stops for a person after 3 tries. It does not teach the problem skill's own explanations on that path. Before this milestone it looped forever. **Decide** whether recovery should hand over to the module's own explanations first.
