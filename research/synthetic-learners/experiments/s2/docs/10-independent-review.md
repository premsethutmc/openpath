# 10. Independent review

A separate AI agent reviewed the code and data. It had not written the code. It re-ran sampled journeys, recomputed every metric from the raw traces (they matched the stored results exactly) and probed the cohort B errors. **AI review does not establish educational validity.**

## Findings and actions

| # | Finding | Label | Action |
|---|---|---|---|
| 1 | No production file changed; only renderer events reach OpenPath; everything else is read-only | OK | — |
| 2 | Only learner-visible content reaches the learner. The delayed-check fact is the topic page's date (UTC rather than local time; no effect at 09:xx UTC). Teaching frames carry unrevealed steps too, which has no effect today. | OK / RISK | documented |
| 3 | OpenPath chooses every question and explanation. Replays are byte-identical. | OK | — |
| 4 | Cohort A's classification accuracy (22/24) is partly true by construction: the simulator's misconceptions mirror OpenPath's catalogue. In cohort B, reversed-subtraction and negate-on-divide also occur on one-step items but are tagged two-step. | RISK | documented; it is why cohort B exists |
| 5 | Early arrival on the shown date: confirmed in the traces (due 2–33 minutes after 09:00). 22/214 such visits had other activity, so "not yet due" is assumed there, not verified. | OK (artefact noted) | documented |
| 6 | **coefficient-dropped is no error when a − c = 1** (11 of 46 numeric applications graded right) | **DEFECT** (cohort B error pattern) | **Not changed after seeing results** (pre-registration). Documented as a construct limitation: in cohort B the "held" label over-states this error by about a quarter of its opportunities. Test 6 excludes a − c = 1. |
| 7 | Failure-case test 6 failed on that case | **DEFECT** | **Fixed** (test now excludes a − c = 1, and runs 3 seeds) |
| 8 | `medianQuestionsToFirstDiagnosis` counted the whole first teaching visit | **DEFECT** | **Fixed:** teaching times are now in the trace and the metric counts attempts before the first explanation. A changed from 14 to 6 (upper bounds before). |
| 9 | `missedUnrecognised` is 100% by construction (no OpenPath explanation exists for those errors) | **DEFECT** (presentation) | reported as "by construction" (doc 9, case 6) |
| 10 | False claims were counted per visit, mixing stale claims and empty early-arrival visits | **DEFECT** (interpretation) | **Added** (marked post-hoc): first claim already false; a true claim that outlived the knowledge; false claims on visits with answers. The pre-registered visit-level figure is kept. |
| 11 | weak/strong ignore slip rate (S005 and S001 look "unnecessarily" taught); threshold mismatch (held ≥ 0.1 for accuracy, ≥ 0.3 for missed); "missed misconceptions" ignores misconception-targeted teaching; `checksCompleted` = 1 follows from the return policy | RISK | **not changed** (pre-registered); each is a stated limitation where the metric is reported |
| 12 | Stall classification is sound: stalled journeys re-run to 80 days never resumed. The simulator has no teacher, so a pause can never be resolved. | OK / LIMITATION | documented (failure mode A) |
| 13 | `responder.ts` differs from its pre-registration hash (the division-by-zero fix, after the first final run stopped); C results were uncommitted at review time | RISK | the deviation is listed below; all results are committed |
| 14 | Weak tests (4, 12, 15, 16 conditional or vacuous; 6 single seed; 9 lenient) | **DEFECT** | **Fixed:** 4 asserts assisted right answers exist and no claim; 6 uses 3 seeds; 9 asserts "partial"; 12 uses 3 seeds and asserts gain and later "shown alone"; 15 uses experiment journey s2-A-S001-143543; 16 asserts the claim is reached. |

## Deviations from the pre-registration manifest

1. **`src/responder.ts`.** When the learner's own erroneous arithmetic reaches a division by zero, it now guesses instead of crashing the run. The first final run had stopped there, with no results. S1 profiles, tests and traces are unchanged, because the case never occurred in them.
2. **`experiments/s2/src/journey.ts`.** Teaching times were added to the trace, so the review fix in item 8 could be computed. Journey outcomes are identical.
3. **`experiments/s2/src/metrics.ts`.** The fix in item 8, and the post-hoc claim-timing breakdown in item 10, which is labelled as post-hoc.
4. **`experiments/s2/scripts/report.py`.** Presentation only.

No synthetic parameter, cohort definition, return policy or bound changed.

## Distinguishing kinds of statement

- **Observed OpenPath decisions:** every question, verdict, explanation, status, due date and pause in the traces.
- **Synthetic learner assumptions:** the profiles, the learning model, the hidden "weak" and "strong" labels, and the absence of a teacher.
- **Inferred weaknesses:** doc 9's failure modes, inferred given those assumptions.
- **Unverified educational claims:** whether any of this predicts real learners. **Nothing here verifies that.**
