# E2b report: item banks for the 39 core capabilities, and the writing tasks

*12 October 2026 · branch `feature/english-e2b` · not merged; awaiting your review. E3 has not started,
and no live LLM is connected. Scope and decisions: `E2_SCOPE.md` (PR #7) and your approval of E2a
(12 October).*

All content in this milestone is **candidate content, unvalidated**: every item, rationale,
difficulty label, ladder step, passage, rubric and anchor. No English educator has reviewed it yet
(decision E2-A). Difficulty labels are **expert estimates, not empirically calibrated**. The
composite update mathematics, evidence validation, frozen thresholds and acceptance criteria are
unchanged.

## Summary

| | Result |
|---|---|
| **Runtime framework** | 0.2.0 (all 56 capabilities). 0.1.0 stays frozen, and the frozen simulation and E1 demonstration still run on it |
| **Item bank** | 533 new code-scored items on the 39 core capabilities (12–19 each), 780 in all. The total equals the planning target by coincidence; no capability was filled to reach it |
| **Difficulty ladders** | 39 new ladders, 4–6 steps each, one step under every band descriptor; every item sits on a step |
| **Formats** | 296 choice, 145 typed, 52 choose-all-that-apply, 21 order, 19 match. Every capability has at least two formats and at least one item with a guessing floor of 0.1 or less |
| **Item families** | 134 families with variants (267 items), 2–3 hand-written variants each |
| **Passages** | 5 new (12 in all), bands 2.5–7.5, including instructions, a flashback narrative, a problem-and-solution text and an advertisement written as news |
| **Writing tasks** | 5 new, each with rubrics and three candidate anchors (about bands 3, 5 and 7): a CBSE formal letter, a notice, a story, a persuasive article and a CBSE analytical paragraph |
| **Coverage gates** | G1–G7 pass for **56 of 56** capabilities. G8 (the retention runway) passes for **0 of 56**, and every miss is recorded with its reason |
| **Frozen simulation** | The E1 and E2a baselines reproduce exactly. On the current bank, still on 0.1.0: **6 of 8**, because M3 now passes. This is a re-draw of noise, not an improvement (see below) |
| **Breadth simulation (new, research only)** | Running all 56 capabilities on 120 items gives about 2 items per capability. Accuracy falls, and an advanced learner's uncertainty is badly overstated as precision (see *Newly exposed weaknesses*) |
| **Tests** | 78 of 78 pass (74 before, plus 4 new); one existing test updated for 56 capabilities |

## What was built

### 1. Item banks for the 39 core capabilities (`content/english/items/e2b-items.json`)

| Strand | Capabilities | Items | Items per capability | Share low-guessing |
|---|---|---|---|---|
| Foundations (spelling) | 2 | 37 | 18–19 | 73% |
| Vocabulary | 8 | 111 | 12–16 | 37% |
| Grammar | 13 | 180 | 13–16 | 60% |
| Sentences | 4 | 53 | 13–14 | 34% |
| Reading | 6 | 80 | 13–14 | 23% |
| Writing (code proxies) | 6 | 72 | 12 | 24% |

- **Difficulty progression first.** Each capability has a ladder (`progressions.json`): the features
  that make its items harder, in order, each under one band descriptor. For example, homophones run
  from *to/two/too* (1.75), through *its/it's* (4.25) and *whose/who's* (5.5), to *affect/effect* and
  *complement/compliment* (7.5). Every item names its step and says what makes it that hard. The
  checker holds each item within 0.75 band of its step.
- **Range.** Every capability runs from band 2 or below to 7.5 or above, with no gap wider than 0.75.
- **Answer formats chosen per capability.**
  - Typed items wherever the answer is a word, so it must be recalled, not recognised (irregular
    pasts, plurals, prepositions, question tags, modals, apostrophes).
  - Order items for word order in questions and embedded questions, story sequence, paragraph order
    and the parts of a formal letter.
  - Choose-all-that-apply for finding errors (capital letters, tense shifts, fragments).
  - Match items for meanings, registers, signal words and cause–effect pairs.
  - Choice items where the construct is a judgement between options (register, summaries, purposes).
    Capital letters cannot be typed, because the scorer ignores case.
- **Misconceptions.** Wrong answers carry the capability's listed misconceptions where the wrong
  answer really shows one (for example *goed* → regularised past, *will rain* in an if-clause →
  *will in if-clause*). There are no tags for guesses.
- **Item families.** Variants test the same feature at the same step, in the same format, within half
  a band (for example *at seven o'clock* / *in June*; *its paw* / *it's been raining*). Families stay
  in one capability.
- **The six core writing capabilities** (narrative, persuasive, functional, register, idea
  development, sequencing) are mainly shown in extended writing. Their code items are proxies: they
  ask the learner to recognise a developed idea, a resolution, a formal closing or a consistent
  register, not to produce one. Narrative especially should be judged from writing.

### 2. Passages (`content/english/items/passages.json`, appended)

| Id | Title | Band | Used for |
|---|---|---|---|
| p8 | Making Lemonade | 2.5 | Instructions: headings, numbered steps, a stated cause |
| p9 | The Night the Lights Went Out | 5 | A narrative with a flashback and a story within the story |
| p10 | Plastic in the Oceans | 6 | Problem and solution under headings, with the writer's opinion at the end |
| p11 | Sunrise Valley: A Hidden Treasure | 7.5 | An advertisement written as travel news, with unnamed experts and a booking deadline |
| p12 | Cats or Dogs? | 4 | Compare and contrast |

Facts in p10 are kept general and checkable (India's 2022 ban on single-use plastic items; the
Versova Beach clean-up). The resort in p11 is invented, with an `.example` web address.

### 3. Writing tasks (`content/english/writing/e2b-tasks.json`)

| Task | Format | Words | Targets |
|---|---|---|---|
| `wr.letter.streetlight` | CBSE formal letter of complaint | 100–120 | functional, register, task response, idea development |
| `wr.notice.quiz` | Notice | 40–60 | functional, task response, register |
| `wr.story.lost` | Story with a given opening | 120–200 | narrative, sequencing, word choice, past simple, connectives |
| `wr.persuade.trees` | Persuasive article, answering one objection | 120–180 | persuasive, idea development, sequencing, connectives |
| `wr.analytical.chart` | CBSE analytical paragraph on a table | 100–120 | idea development, sequencing, academic vocabulary, comparatives |

Each task has rubric criteria for every target, and three candidate anchors, untrusted, written at
about bands 3, 5 and 7, with scores on every target and secondary capability. The new tasks load only
in the current bank under 0.2.0, so neither baseline nor the frozen simulation sees them.

### 4. A content fix found in review: answer positions (E2b and E2a)

- **The problem.** The engine shows options in the order they are stored. As written, the keyed
  answer was first in 279 of 296 new choice items, and 28 of 47 E2a choice items. A learner who always
  picked the first option would have scored far above chance. The E1 bank was balanced.
- **The fix.** Options are reordered by a fixed permutation per item (seeded by the item id), and the
  keyed answer, misconception tags and multi-answer keys move with them. A check confirms that every
  item scores the same responses as before.
- **Not reordered.** Options whose order carries meaning (word positions, sentence numbers, places
  in a sentence) were left alone.
- **Result.** New items now have keyed answers spread 63/75/70/85 across positions 1–4, and E2a items
  8/12/12/15. A new test fails the build if any position holds 40% or more.
- **E2a content changed only in option order.** The preserved E2a baseline is untouched and still
  reproduces.
- **Length cues.** In 53 new items the keyed option was much longer than the others, another
  test-wise cue. Their distractors were rewritten to similar lengths, keeping their meaning and tags.
  The 5 that remain are single-word options (*delicious* against *nice*), where length is not a cue.
  11 E2a items and 9 E1 items still have this cue; I have not changed them.

### 5. Tools

- `tools/english/research/breadth.ts` (research only): runs the engine on 0.2.0 with all 56
  capabilities. It needs true levels for the core capabilities, so it adds an optional
  `coreLevel` to the simulated learner, with a matching argument in the simulated evaluator. The
  frozen learners never set it, so their answers are unchanged. The baseline fingerprints confirm
  this.

## Tests

78 of 78 pass.

**New (`test/e2b-bank.test.ts`):**

1. Every core capability has items, a ladder with every step used, two formats and a
   low-guessing format. Its only missed gate is G8, and that gap is recorded.
2. The runtime view (0.2.0) sees every E2b item. The frozen 0.1.0 view sees no E2b item or task.
3. Writing tasks have rubrics for every target, and three or more untrusted anchors whose scores span
   at least three bands on every target. Each of the six core writing capabilities is targeted by a
   task.
4. No mechanical answer cues:
   - no answer position holds 40% or more of choice items;
   - option 0 is keyed in under 60% of multi items;
   - always picking option 1 scores within 10 points of chance.

**Updated (`test/e2-bank.test.ts`):** "every skeleton capability is covered" becomes "every specified
capability is covered". It now expects 56 capabilities and none pending, where it expected 39 pending.

Both the E1 and E2a baselines still reproduce their fingerprints, passes and misses.

## Simulation results

### Frozen simulation (the measure of record)

**Preserved baselines.** These reproduce exactly:

- **E1:** fingerprint `f66325454dfd…`; M4, M5, M6, M7 and M8 pass.
- **E2a:** fingerprint `94def3e4c98a…`; M2, M4, M5, M7 and M8 pass.

**Current bank, still on framework 0.1.0, as CI runs it:**

| | E2a (recorded) | E2b (current bank) |
|---|---|---|
| M1 Profile recovery after 40 items (≥ 0.8) | 0.40 · miss | 0.40 · miss |
| M2 Weakest strand named (≥ 6 of 7) | 7 of 7 · pass | 6 of 7 · pass |
| M3 Pairs told apart (all) | 7 of 8 · miss | **8 of 8 · pass** |
| M4 Honest uncertainty (70–90%) | 84% · pass | 82% · pass |
| M5 Efficiency (ratio ≤ 0.7) | 0.49 · pass | 0.49 · pass |
| M6 Guesser and forgetter | guesser not ok · miss | guesser not ok · miss |
| M7 Faults applied (0) | 0 · pass | 0 · pass |
| M8 Determinism | identical · pass | identical · pass |

**Why the result changed.** The 0.1.0 view of the bank differs from E2a only in the order of options
in E2a items. When a simulated learner answers wrongly, it picks a wrong option at random, so the
reordering changes which distractor, and so which misconception tag, it lands on. That is what
changed. Across five seeds, M1, M5, M6, M7 and M8 are identical on every seed. M2 and M3 differ on
one seed only (M2 7 → 6 of 7, still passing; M3 7 → 8 of 8). M4 differs by at most 2 points on three
seeds. **M3 passing is not an improvement, and
should not be counted as one.**

### Breadth simulation (new; research only, no pass levels)

The frozen simulation cannot see the 39 core capabilities, because its learners have no true level
for them. The breadth run gives them one, under two stated assumptions:

- **Strand truth:** each core capability equals the mean of the learner's skeleton capabilities in
  the same strand.
- **Varied truth:** the same, plus a fixed random offset of up to ±1 band per learner and capability.

These are assumptions about learners, not findings. Five seeds; same goal and session plan as the
frozen protocol.

| Configuration | Items per capability | ρ skeleton | ρ core | Mean error, skeleton / core | 80% ranges containing the truth, skeleton / core | Weakest strand right |
|---|---|---|---|---|---|---|
| 0.1.0, 17 capabilities, 120 items | 7.4 | 0.58 | — | 0.60 / — | 77% / — | 83% |
| 0.2.0, 56, strand truth, 120 items | 2.0 | 0.51 | 0.36 | 0.78 / 0.88 | 78% / 74% | 74% |
| 0.2.0, 56, varied truth, 120 items | 2.0 | 0.47 | 0.41 | 0.81 / 0.93 | 77% / 73% | 77% |
| 0.2.0, 56, varied truth, 240 items | 4.1 | 0.55 | 0.49 | 0.71 / 0.81 | 81% / 74% | 86% |

Full tables, per learner: `node tools/english/research/breadth.ts --seeds 5`.

## Newly exposed weaknesses

1. **Breadth dilutes measurement.**
   - With 56 capabilities, the same 120 items give each capability about 2 items, not 7.
   - Skeleton estimates get worse: error 0.60 → 0.78–0.81, ρ 0.58 → 0.47–0.51. The weakest strand
     is named less often (83% → 74–77%).
   - Doubling the items to 240 recovers part of the loss.
   - This is the cost of measuring more, not a defect in the bank. How many items a placement
     should use, and whether it should start from strands rather than every capability, are
     selection and product decisions for E4. **I have not tuned anything.**
2. **An advanced learner is underestimated with false confidence.**
   - For L7 (about 7.5 everywhere), core estimates are 2.3 bands too low after 120 items. Only 6% of
     the 80% ranges contain the truth (18% after 240 items). Skeleton capabilities fare little
     better: 26% here, and 45% even on 0.1.0.
   - Two causes compound. With 2 items per capability, the estimate stays near the prior (4). And the
     bank's hardest items stop at 7.5–7.75, so a learner at 8 cannot be shown to be there.
   - The frozen M4 passes only because it averages over all ten learners.
   - This links to E4 option E (time-sensitive estimates) and to calibration with real data. It
     needs your decision, not a quiet fix.
3. **The retention runway is worse at the ends of the range.**
   - On the core capabilities, after typical use, about 0 checks on unseen items remain at levels
     2–3. At 7–7.5, about 0.4–0.5 remain.
   - The mean is 0.69 checks per level, where skeleton capabilities have 0.97, because the new
     banks are spread more evenly across the range. With variants reserved (E4 option A), it would
     be 1.41.
   - Adding items alone will not close this. It is recorded as G8 for all 39.
4. **Reading and writing capabilities lean on choice items.** Only 23–24% of their items have a low
   guessing floor, where grammar and spelling have 60–73%. Judgements about summaries, purposes and
   register are hard to make non-guessable without extended responses. They are scored for writing
   only once an evaluator is connected (E3).
5. **Writing capabilities are evidenced mainly by proxies.** Until E3 connects an evaluator, the six
   core writing capabilities are measured by recognition items, plus the stand-in evaluator in
   simulation. Narrative in particular has no production format besides writing.
6. **Earlier content has the same cues.** E2a's answer positions are fixed here. 11 E2a and 9 E1 items
   still have a length cue (the keyed option much longer than the others); I have not changed them.

## Not done, by decision

- No educator review; all content stays candidate (decision 6 of 12 October).
- No change to the update mathematics, selection, thresholds or acceptance criteria. The slip-aware
  models are not adopted.
- No E3 work and no live LLM.
- The answer-pattern check and the exact-posterior update stay E4 options
  ([`E4_DESIGN_OPTIONS.md`](E4_DESIGN_OPTIONS.md)).

## Decisions for you

1. Merge PR (E2b) as it stands, with G8 recorded for all 56 capabilities.
2. Whether the E2a option reordering should stay in this PR, or move to its own.
3. Whether to fix the remaining length cues in E1 and E2a items now, or leave them for educator
   review.
4. For E4, whether to add the breadth findings: how placement spreads items across 56 capabilities,
   and overconfidence at the top of the range.
