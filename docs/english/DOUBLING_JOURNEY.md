# The adaptive consonant-doubling journey (MVP slice)

One complete learner journey in the web app, for one rule: doubling the last consonant (hop → hopping).
The app records how every answer was given (provenance@1), the core's rule-level evidence says what has
been shown, and a minimal core planner decides what happens next.

**Status:** working software with provisional content. The questions, lessons and hints have not been
reviewed by an educator. Synthetic tests show the software behaves as specified, not that the teaching works.

## The flow

| Step | Screen | Recorded as | Counts as independent evidence? |
|---|---|---|---|
| 1. Check | "On your own: no hints" question | `presented`, `evidence` with provenance (attempt 1, no hints) | Yes |
| 2. Diagnosis | (decided by the planner from the rule state) | – | – |
| 3. Teaching | Lesson for the chosen strategy, with why it was chosen | `intervention` (strategy, content) | – |
| 4. Guided practice | "Practice with help: this does not count as doing it on your own"; hints in three levels | `presented`, `hint` (level, type), `assisted_response` | **Never** |
| 5. Reassessment | "New word, on your own: no hints" | `evidence` with provenance | Yes |
| 6. If it did not work | "Let's try a different way": the next strategy | `intervention` | – |
| 7. Summary | Learner line plus "For a parent or teacher" | `session_end` | – |
| Later (7+ days) | "A week later: has it stuck? No hints" | `evidence` | Yes (delayed check) |

The parent summary is also on the Progress tab. It shows the skill, what went wrong (the learner's own
spellings), the help received (lessons, hints, right first time or only with help), independent results
after each teaching approach, whether a different approach was needed, and whether retention is pending,
confirmed or failed. It shows no probabilities and makes no mastery claim.

## Planner (core, `packages/english-core/src/planner.ts`)

A pure function of the rule state, the subject's strategy list, available content and a versioned draft
policy (`planner-policy@0-draft`):

| Setting | Draft | Meaning |
|---|---|---|
| `diagnosticMax` | 5 | Independent questions before teaching, at most (fewer once a misconception is active) |
| `guidedItems` | 4 | Guided-practice words per teaching block |
| `hintLevels` | 3 | Hint levels per guided word |
| `reassessItems` / `reassessPassMin` | 2 / 2 | New words in the reassessment, and how many must be right for the block to count as having worked |
| `maxStrategiesBeforeHuman` | 3 | Failed approaches before the app stops and recommends a teacher or parent |
| `retentionGapDays` / `retentionItems` | 7 / 2 | When the delayed check is offered, and its size |

A failed strategy is never repeated. Running out of questions is reported as a content gap; it never moves
the learner on. A block that works ends the session as "progress, not yet mastery".

Strategies (English module, `INFLECTION_STRATEGIES`, lesson text in `content/english/web/doubling-journey.json`):
rule and worked examples; listen for the short vowel; build the word in parts.

## Smallest educator-review set for a supervised demonstration

| Content | Count | Where |
|---|---|---|
| Independent questions where doubling applies | 8 (spl.infl.02, 11, 18–23) | Bank and `doubling-journey.json` |
| Contrast questions (must not double) | 2 (spl.infl.24, 25) | `doubling-journey.json` |
| Strategy lessons | 3 | `doubling-journey.json` |
| Hint templates | 9 (3 levels × 3 strategies) | `doubling-journey.json` |
| Guided-practice words | 12 generated words | `doubling-journey.json` → `guided` |

That is enough for one learner to be diagnosed, taught up to three times, reassessed after each, and
(if shown early) checked once after a week. It is not enough for a second retention check, or for a
learner who needs all three approaches and then a retention check.

## Limits

- Provisional content throughout; candidate questions affect the engine's estimate, as all candidate
  bank questions do today. The parent summary says so.
- Only doubling. The other seven inflection rules are untouched.
- Existing sessions now record provenance too (questions shown, first answers, retries, lessons as
  interventions), but have no hints.
- A learner who has already met some of the journey's words elsewhere has fewer unseen questions.
- The planner's thresholds are drafts; whether they suit real learners needs the pilot.
