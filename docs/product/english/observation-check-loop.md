# Writing observation → voluntary check → teaching

API-first original writing; no local spelling/grammar checker is added. Spelling content and its revamp are untouched. This remains the existing developer/synthetic test workspace, not deployment or approval for real learner data.

## The repaired loop

A single accepted, non-low-confidence error observation previously displayed a concern but offered no check because it was not a repeated-error hypothesis. A failed analysis or an isolated observation could also create an empty journey marked complete/100%, implying success without evidence.

Now the learner can explicitly choose **Check this concern before accepting it**. This is an exploratory request, recorded with `observationCheck` provenance; it does not automatically establish a gap from one model response. Only the existing eligible, unseen bank questions are used. The configured minimum independent first answers still applies; helped answers and generated questions do not confirm it. Correct answers weaken the concern; difficulty on several independent questions can select a lesson, guided practice and separate fresh checks through the existing journey. These structured answers do not prove a recurring problem or improvement in independent writing.

The request and remaining questions survive reopening. Already used questions are excluded by the existing allocator. Shortages remain explicit and cannot be filled by pretending generated questions are independent evidence. Low-confidence claims, style suggestions, repeated copies of a draft and observation-only competencies cannot silently acquire a confirmed target. The latter still offer reflection in the learner's own words without a formal result.

Failed analysis now shows saved-but-unassessed writing and an explicit same-draft retry when connected. Retry does not create a new submission and cannot rerun an already accepted analysis. Counting also deduplicates accepted analyses per essay, protecting against repeated-analysis inflation. Initially unavailable connections still require reopening/reconnecting the configured workspace; no background request or provider activation is added.

Empty plans now have zero progress, are not completed, and do not claim every skill is shown. An empty plan can be rebuilt when a later exploratory check establishes a teaching target. Recommendation buttons have visible labels and share eligibility with the planner.

## Verification and limits

Logic coverage exercises independent answers, learner-owned text, reload during a check, fresh teaching/check allocation, correct-answer weakening, rejected-analysis retry, no duplicate evidence, low-confidence/style refusal, repeat drafts and rebuilding a stale empty plan. A phone-sized production-browser test mocks the API and checks retry with identical saved text/ID, visible action labels, hidden replacement wording and reload without automatic reanalysis.

Local Chromium launch is blocked by this executor's socket restrictions; the browser test is wired into the existing hosted Essay UX CI job rather than claimed as locally passed. No paid/model calls occur in these tests.

Concurrency guards cover simultaneous actions on one EssayStudio instance, not independent tabs. The legacy general essay ledger lacks the argument workflow's cross-tab compare-and-swap transaction. Do not claim cross-tab-safe provider-call deduplication from this change. Semantic accuracy, educator validation, age calibration, real-user learning outcomes and independent-writing improvement remain unestablished. API observations remain tentative.
