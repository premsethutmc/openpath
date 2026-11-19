# School reading: answer plus supporting evidence (candidate)

## Reuse and scope

Based on main `84ed2aca`. The main course already has six skills at six levels, lessons, practice and reserved check passages. This increment reuses `logic/reading/course.ts`, its Starter cause questions, authored evidence spans and worked lesson; it does not add another passage bank. PR #240 remains a separate unmerged writing bridge and is not a dependency. Its own-summary/argument work is not duplicated or removed.

Route: existing Reading map → **Answer and show why**. The bounded first slice asks for a stated reason in a short school-level passage. It does not cover all reading reasoning, age placement, exam timing, probability estimates or broad proficiency.

## Evidence loop

1. Require and reserve two distinct never-read check passages in the existing learner ledger before displaying the diagnostic. A returning reader with only one left gets an early shortage, not a stranded confirmation. No lesson or hint is visible.
2. Learner independently chooses an answer and the specific supporting sentence(s). Both are required. Draft choices survive leaving/reopening.
3. Separate answer correctness from evidence match: both match, answer only, evidence only, or neither. Feedback describes these observations and does not infer guessing, rushing, speed, attention or a stable misconception.
4. Present the corresponding brief strategy plus the existing worked example on a different teaching passage. Use existing practice content for an answer-and-evidence attempt. Label this supported practice.
5. Open the already-reserved different **unseen passage**, excluding all passages exposed in any reading skill, not merely new questions on an old passage. Confirmation has no hints, previous feedback or worked example before submission.
6. Report both components for this item. Never update mastery/capability estimates, never equate supported practice with independent evidence, and never infer retention from immediate confirmation.

Sentence selection uses exact overlap with the content author's evidence span. For the bounded Starter cause bank, each evidence span lies within one sentence. Selecting all sentences does not count as identifying specific support. Content still requires educator review; alternative valid evidence sets need authored support before expanding beyond this bank.

## Persistence and limits

- Uses existing `ReadingRecord` shown/lesson events for passage exposure; no schema/API change and no paid model call.
- Paired response history/drafts are device-local and scoped to learner profile. They do not sync between devices and are not a new engine mastery signal.
- Storage errors are explicit. New passage is not displayed unless exposure reservation and local state save succeed; conservative reservation may consume a passage when the second write fails.
- Malformed saved data fails closed and is not silently overwritten or reset to a fresh attempt.
- No reset-as-new-check button. Exhaustion preserves work and asks for more unseen content instead of recycling a seen passage. Cross-tab simultaneous sessions are not a supported test condition.
- Parent reporting, free-writing analysis, delayed retention and exam-specific work remain outside this increment.

## Verification

23 reading logic and UI-render tests passed, including eight new evidence-specific tests: authored sentence spans, four diagnostic patterns, invalid answers, cross-skill passage exclusion/exhaustion, draft/phase recovery and corrupt-state rejection. English-specific TypeScript and bundle build passed locally.

Hosted phone acceptance is included in the existing CI English phone-journey job (three cases): draft/back recovery, answer-only diagnosis, supported practice, distinct no-hint confirmation, persisted completed result, no API requests, storage failure before display, and a returning reader with only one unseen passage. CI results are recorded in the draft PR; local browser verification is not claimed.

Two flow-local wording variants keep canonical source IDs for shared exposure: the initial/confirmation causes use “so” and “made”, while an unrelated “because” sentence supplies a distractor. These bounded adaptations do not edit the original course or spelling content. They are candidate content, not educator-certified.
