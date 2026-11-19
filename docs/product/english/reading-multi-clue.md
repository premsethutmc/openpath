# Connecting clues: bounded school reading increment

Base: main `2b354f9b`. Extends the live stated-reason work from #260 with a separate **Connect the clues** choice on the Reading map. No merge/deploy is part of this draft.

## Reuse, not a second curriculum

Uses the existing Level 3 cause content, unchanged: teaching library (`L2.T`), guided clean-up practice (`L2.P1`), and lake/windmill checks (`L2.C2`, `L2.C4`). `L2` is the legacy content ID; the current course level is 3. Both check texts have the same current level/skill and need at least two clue sentences, but equivalence has not been empirically calibrated. Other L3–6 items are not silently enrolled: many support only one direct clue or need separate semantic review.

The new layer only authors exact sentence-index alternatives with full-sentence anchors, an expected answer string, explanations and limitations. Source texts/options are not generated or duplicated. Text/answer drift fails validation. No model, grammar API, credential or timing dependency.

## Scoring boundary

- Lake: either the cleaner-lake report or the clean-up account can pair with the fish-to-birds link; including both source descriptions is also an authored alternative.
- Windmill: changed/tested blades plus later working model; the earlier failure is an optional authored contextual clue.
- Guided practice: old collection load + reduced collection load + free time, optionally with the bottle rule.
- Exact accepted sets are order-insensitive. A nonempty proper subset is partial; relevant clues with other selections are mixed; no overlap is unmatched. Empty/invalid selections are not submitted/scored. Selecting all text does not automatically pass.
- Answer correctness is separate. Feedback describes the response evidence, not intelligence, guessing, attention, reading speed or a stable misconception.
- This is a best-supported explanation among bounded choices. Before-and-after is not proof of sole causation. Windmill feedback explicitly notes testing as another part of the intervention; bird counts do not establish a causal experiment.

## Learning loop and safety

First independent answer+clue attempt → targeted explanation based on response pattern → worked example on a different teaching passage → guided practice → reserved, distinct unseen confirmation without prior feedback/hints. The worked example qualifies the chart explanation rather than claiming that a plausible sequence proves a cause or every child's motive.

Both check passages must be unseen across the existing reading ledger and are reserved before the first appears. If either was read already, entry reports shortage before consuming/displaying a diagnostic. No seen text is renamed fresh. Reopening resumes the same attempt and does not create new evidence.

The existing stated-reason controller, source course, records and exposure rules are not changed. New responses use an isolated `inference-v1` record per learner; no migration or resetting of older stated-reason work. Passage reservations reuse the existing cause-level-3 reading events. Paired responses remain device-local, not cross-device mastery data. Storage failures do not expose new text; malformed saved state is preserved and blocks restart. Reservations may conservatively consume content if a later local save fails. Concurrent tabs are not a supported test condition.

No aggregate proficiency, mastery, exam readiness or retention score is created. One initial item and one after-help item are not enough to establish a broad ability or durable learning. There is one pair in this bounded slice; more independently reviewed passages and delayed checks remain future work.

## Verification

31 reading logic/UI tests passed locally (7 new): all alternative sets, partial/mixed/unmatched separation, invalid input, content drift, shared exposure shortage, isolated state recovery, corrupt/legacy rejection. English TypeScript and build passed locally.

Hosted phone acceptance added beside existing stated-reason tests: partial feedback and targeted teaching, alternate valid confirmation set, no hints before retest submission, back/reload recovery, original-flow record isolation, shared shortage and corrupt-state preservation. Rejects learning/model API calls while allowing the existing app GET account-session probe. Exact-head CI status belongs in the PR.

## Reservation interference and standard-course tradeoff
The ordinary course prefers unseen texts but can reuse a seen text for a different question. Before displaying or submitting confirmation this loop requires exactly its one reservation event for that passage. Any later shown event from any skill quarantines confirmation with an honest shortage notice; prior work remains saved. Phone regression covers alternate-skill exposure and reload. Standard course records a shown event when opening a question, not only when answering it. The ordinary route now hides its content while these writes are pending or failed; retry preserves the queued event order. This closes exposure without a reliably persisted ledger in this route. Cross-tab synchronization remains unsupported.
Reserving both cause questions removes them from the ordinary cause check pool. Completing the shared Level 3 teaching marks that standard cause lesson as helped via its existing lesson_done event. These are conservative shared-exposure/progress tradeoffs, not a separate claim of achievement. Existing stated-reason flow was not altered.
