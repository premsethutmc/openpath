# Causal reading: bounded, reusable learning loop

Draft candidate, stacked on PR #262 (`feat/reading-multi-clue`). No merge, deployment, learner recruitment, provider activation or spending is authorized by this change.

## Product boundary

The anonymous `?experience=causal-reading` route has two interchangeable authored contexts: everyday situations with shorter sentences, and public projects with denser clauses. These are language-demand choices, not grade placements. Both use exactly the same engine, routing thresholds and two-clue reasoning rule. The reading map links to the candidate; the reviewed pilot build refuses this route. No learner ID, age, name or prose is collected; no analysis service is called.

Each pack contains 18 role-separated authored tasks: six diagnostic probes (two each for word meaning, literal/sentence meaning and clue integration), four distinct worked examples, four guided practices (one per support route), two immediate transfer tasks and two reserved return tasks. Integration tasks require two relevant sentences among three, with varied clue/answer positions. A contextual sentence is not evidence merely because it belongs to the passage.

## Evidence and support

Both original causal tasks occur before the four language probes. Probes use different texts and do not disclose the original answers. No diagnostic corrections or route are exposed until all six responses are locked. Exactly two misses in one dimension and two correct responses in each other dimension permit a **possible support focus**, not a diagnosis. A single miss or contradictory pattern uses general support; help/skips produce insufficient independent evidence. Six correct responses do not establish general mastery.

The chosen lesson uses a different worked example and explicit reasoning steps. Guided practice is always recorded as assisted, even if correct. Its feedback is visible before the learner explicitly enters the independent phase. Two new immediate tasks have no hints or prior corrections alongside them; feedback waits for both answers. Three days after completion, the device clock unlocks two different return tasks. No delayed result is displayed before those tasks are attempted, and no result is labelled mastery.

## State and freshness

Reuse PR #262's authored-clue assessor rather than introduce a second scoring policy. The loop is an append-only validated event replay with content fingerprints. The local store writes and verifies a reservation before showing text, retains it on reload, rejects stale-tab writes with Web Locks and refuses corrupted, unknown or changed-content records without overwriting them. Practice and assessment families are disjoint across both packs. Browser storage deletion, a different device, external help and clock manipulation cannot be policed; this is local exposure bookkeeping, not secure examination infrastructure. Selection drafts are not saved; locked answers and exposure are.

## Validation and limits

Unit tests exercise both real packs, identical routing, incomplete/helped evidence, assisted practice, fresh transfer, waiting, stale tabs, failed storage, content drift and replay tampering. Phone tests run both complete journeys with a simulated clock, reload, withheld feedback, assistance, storage failure and corruption. Simulated delayed tests verify software behavior, **not learner retention**. Exact-head CI results belong on the PR.

Content has AI-assisted authoring/review and deterministic key checks, not human or learner validation. This small finite bank does not establish calibrated difficulty, causal bottleneck sensitivity, language proficiency, grade/exam prediction or teaching efficacy. There is no unlimited retry bank, speech assessment or teacher dashboard in this slice. Additional independently authored families and observed learner evidence are needed before broader claims. External educator approval is not made a prerequisite.
