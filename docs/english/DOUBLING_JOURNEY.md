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

- Provisional content throughout. The 8 journey questions added for it are gated (below); the 2 bank
  questions it also uses (spl.infl.02, 11) are candidate bank items and update the estimate as before.
- Only doubling. The other seven inflection rules are untouched.
- Existing sessions now record provenance too (questions shown, first answers, retries, lessons as
  interventions), but have no hints.
- A learner who has already met some of the journey's words elsewhere has fewer unseen questions.
- The planner's thresholds are drafts; whether they suit real learners needs the pilot.

## MVP correctness pass

### How provisional questions entered the estimate (PR #18), and the gate

In PR #18 the 8 journey questions were ordinary hand-written items, so every first answer went through
`Ledger.onEvidence` → `applyDirect` and moved the capability estimate, like the candidate bank does.

Now every content item can carry `evidence_status`:

| Status | Source | Estimate | Rule level | Claims |
|---|---|---|---|---|
| `provisional` | The 8 journey questions | Never changes (decision "held", reason given) | Counted as independent, marked provisional | A rule resting on any provisional answer is never treated as verified |
| absent (candidate) | The existing 780-item bank | Updates, as since E1 (unchanged) | Counted | As before |
| `validated` | None yet | Updates | Counted | Can verify |

Existing estimates and replay are unchanged for every record without the 8 journey questions; the
ten-learner simulation output is identical to `main`. A record made with PR #18 that answered those
questions would replay with those answers held: such records exist only in development and tests.

### Parent report

Every difficulty line now comes from the rule-level observations, carries the ids of the ledger events
behind it, and says how the answer was given: on their own (provenance: first try, no hint), with help
(hints, retries, guided practice), or recorded before help was tracked (unknown). Slips are shown as slips.
Long lists fold behind "more" on screen.

### Reliability fixes

| Found | Effect | Fix |
|---|---|---|
| Hints double-counted | Each answer lists every earlier hint, and they were summed: 72 hints reported instead of 36 | Count the most hints per word and session |
| A finished journey stayed open until "Back to today" | Closing the app at the summary left the session open; a return a week later continued the same session, so the delayed check was never recognised | The session ends as soon as the summary is reached; a journey idle for 6 hours is ended when next opened |
| Leaving mid-block and returning | The planner ended the block as if new and taught the same lesson again | Blocks continue across sessions; a session ends only when its own reassessment was passed |
| Returning to an open journey from Today | Started a new session; a journey with nothing to do still created a session and summary events | An open journey is resumed; with nothing to do, the summary is shown without recording anything |
| "Carry on" for a journey from Today | Opened the ordinary session screen, which could not continue it | Routed to the journey screen |
| Possible crash paths | A guided step without an intervention, or no unseen item, would throw | Fall back to the summary; the planner reports a content gap |

### Reproducible demo

`npm run english:build && npm run english:preview &` then `E2E_URL=http://127.0.0.1:4174 npm run english:demo-journeys`
writes screenshots of the child screens and the parent summary for learners A–F, and an index page, to
`frontend/out/journey-demo/`. The learners answer by fixed rules; the page states that they are synthetic and
the content provisional.

### Educator review needed before testing with children

| # | Content | Items | What to check |
|---|---|---|---|
| 1 | Independent questions | spl.infl.18 chop, 19 stop, 20 big, 21 dig (fix the spelling), 22 trim, 23 wet, plus bank items spl.infl.02 swim, 11 run | One right answer; root word or meaning given; vocabulary and sentences suitable for the age group; difficulty |
| 2 | Contrast questions | spl.infl.24 jump, 25 rain (fix the spelling) | That they test when not to double; wording |
| 3 | Lessons | worked_examples, sound_first, word_building | Accuracy (including the "short vowel" explanation and its exceptions), clarity, age-appropriateness |
| 4 | Hints | 9 templates (3 levels × 3 strategies) | Level 3 shows the join: whether that gives away too much |
| 5 | Practice words | clapping, cutting, dipped, fitting, jogging, mapping, shopping, sitting, skipped, spinning, winning, zipping | Suitability; that each generated prompt is correct |
| 6 | Draft policy | `planner-policy@0-draft`, `rule-evidence-policy@0-draft` | Whether 4 guided words, 2 of 2 new words, 3 approaches before support and 7 days are sensible for children |
| 7 | Parent wording | Status lines, "Recommended" text | That it is accurate and not discouraging |

The 24-question review sheet prepared earlier covers rows 1–2 except the two bank items.
