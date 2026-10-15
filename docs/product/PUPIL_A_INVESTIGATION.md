# Investigation: is OpenPath measuring Pupil A's learning?

**Date:** 14 October 2026.

**Input:** the redacted diagnostic export of Pupil A, generated 2026-10-14 16:23 UTC. It came from app and server build
`3c269c5`: 118 events, 35 questions shown, 34 answered. It contains one finished placement and one unfinished
spelling check.

**Method:**
- I read the export.
- I read the code on PR #27 (`3c269c5`).
- I replayed Pupil A's recorded answers through the current app code on a throwaway local copy (scripts listed in
  appendix A). The live Codespace, its database and Pupil A's real record were not accessed or changed.

**Labels used throughout:**
- **[Observed]** is in the export.
- **[Code]** follows from reading the code.
- **[Replay]** was reproduced by running the current code on Pupil A's recorded answers.
- **[Recommendation]** is my proposal, awaiting approval.

## Summary

1. **The engine's core loop works as designed.** [Replay] Replaying Pupil A's 24 placement answers through the
   current code reproduces the same 24 questions, in the same order, with the same estimate after every answer
   (24/24 and 24/24). Every recorded update matches the published formula exactly.
2. **The spelling check does not measure spelling.**
   - [Code, Replay] None of its answers can change the Learner Vector. Every question is a computer-generated word,
     and generated words are held as practice until a person checks them.
   - Pupil A's spelling estimates (5.25, 4.24, 3.46) come from **two placement questions each**, plus small shifts
     from related skills.
3. **The spelling check is not adaptive and not targeted.** [Code, Replay]
   - Its 12 words are fixed when it starts and never change with the answers.
   - It takes one word from every spelling pattern up to two bands above the estimate, with **no lower limit**. That
     is why "seeing" (difficulty 1.25) is asked of a pupil estimated at 5.25.
4. **Pupil A's device did not offer speech when the check began.** [Replay] The recorded queue matches the queue the
   code builds with speech **off**, word for word, including the definition clue for "readable". With speech on,
   "readable" would have been "provable", spoken.
   - Even with speech on, 10 of the 12 words are "add an ending" questions. The design's primary format (hear the
     word, then type it) is used for at most one or two.
   - Nothing in the record says whether speech was available.
5. **All 13 measured skills rest on one or two answers each.** [Observed] Every one is labelled "early", which is
   honest. 43 of 56 skills are unchecked, including all 9 reading skills. The numbers look precise, but most have an
   80% range about ±1.1 bands wide (capitalisation ±1.5, apostrophes ±1.4).
6. **"Provisional" means two different things.** [Code]
   - The 881 hand-written questions are all unreviewed drafts (`candidate-unvalidated`), with difficulty set by
     expert guess. They count fully, and can make a skill "shown".
   - Only questions explicitly flagged `evidence_status: "provisional"` (the doubling journey's) are blocked.
7. **The synthetic tests show the software is internally consistent. They do not show educational validity.**
   [Code]
   - The simulated pupils answer using the engine's own response model.
   - The frozen simulation itself fails profile recovery after 40 items (ρ = 0.40 against a pass level of 0.8).

## 1. Pupil A's journey, question by question

[Observed] All facts below are from the export.

**Placement (13:17–13:22 UTC), 24 questions, 13 right:**
- Every answer was independent and accepted.
- Every estimate change below is the ledger's own decision.
- These questions were asked before decision tracing existed, so their selection was **not recorded** at the time.

[Replay] The "why" column comes from the same code replayed on the same answers. Because the replay reproduces
every choice and every estimate exactly, these are the reasons the engine had then. They are reconstructed by
deterministic replay, not recorded at the time.

| # | Question | Skill | b | Right | Estimate before → after | Why chosen (replay) |
|---|---|---|---|---|---|---|
| 1 | grm.apo.06 | apostrophes | 4 | ✗ | 4 → 3.25 | Every skill was at the prior (4 ± 1.5), so the first questions sweep the skills at b = 4, where P(right) = 0.5 gives the most information. Tie (score 0.428) broken by item id, alphabetically (`selection.ts`) |
| 2 | spl.mor.07 | morphological | 4 | ✓ | 4 → 4.75 | as #1 |
| 3 | grm.art.03 | articles | 4 | ✓ | 4 → 4.75 | as #1 |
| 4 | voc.gen.12 | general vocabulary | 4 | ✗ | 4 → 3.25 | as #1 |
| 5 | grm.sva.10 | subject–verb | 4 | ✓ | 4 → 4.75 | as #1 |
| 6 | voc.pre.06 | prefixes | 4 | ✗ | 4.22 → 3.38 | prefixes already moved to 4.22 by related skills; highest information |
| 7 | spl.infl.04 | inflections | 4 | ✓ | 4.22 → 4.86 | as #6 |
| 8 | spl.hom.07 | homophones | 3.5 | ✗ | 3.85 → 2.92 | highest score by a hair (0.393 vs 0.392) |
| 9 | grm.plu.05 | plurals | 3.75 | ✗ | 4 → 3.12 | |
| 10 | voc.suf.03 | suffixes | 4 | ✗ | 3.96 → 3.27 | |
| 11 | grm.pps.05 | present/past simple | 3.75 | ✓ | 4 → 4.64 | |
| 12 | voc.syn.04 | synonyms/antonyms | 3 | ✓ | 3.78 → 4.21 | a right answer was expected (p 0.73), so it moves the estimate less |
| 13 | grm.cap.06 | capitalisation | 4.25 | ✗ | 4 → 3.34 | first visit to capitalisation |
| 14 | grm.pps.08 | present/past simple | 4.75 | ✗ | 4.64 → 4.17 | second round: the estimate after #11 is 4.64, so a harder question. Answer "ate" was tagged `past_after_did` |
| 15 | voc.pre.05 | prefixes | 3.5 | ✗ | 3.38 → 2.92 | lower after #6 |
| 16 | grm.art.10 | articles | 4.5 | ✓ | 4.75 → 5.18 | higher after #3 |
| 17 | spl.mor.08 | morphological | 4.5 | ✗ | 4.55 → 4.07 | |
| 18 | grm.sva.03 | subject–verb | 4.5 | ✓ | 4.75 → 5.18 | |
| 19 | voc.suf.02 | suffixes | 3.5 | ✓ | 3.27 → 3.83 | lower after #10 |
| 20 | grm.plu.04 | plurals | 3.25 | ✓ | 3.12 → 3.67 | lower after #9 |
| 21 | voc.gen.11 | general vocabulary | 3 | ✓ | 3.34 → 3.71 | lower after #4 |
| 22 | spl.infl.05 | inflections | 5 | ✓ | 4.67 → 5.25 | higher after #7 |
| 23 | voc.syn.07 | synonyms/antonyms | 4.25 | ✗ | 4.32 → 3.79 | |
| 24 | spl.hom.05 | homophones | 3 | ✓ | 2.92 → 3.46 | lower after #8 |

Placement stopped at its maximum of 24 questions. [Code] It stops early only when the average uncertainty over the
guided skills falls to 0.9 or below (`placementNext`, `PLACEMENT_SD`), and that did not happen.

**Spelling check (13:22, resumed 15:13), 11 of 12 words shown, 10 answered, never finished:**
- Every answer was recorded as `held_practice_word`, with no estimate change.
- Positions 4 to 11 have recorded traces (fixed list, position n of 12). Positions 1 to 3 predate tracing.

| # | Word (question) | Pattern (band) | b | Right | Answer | Effect |
|---|---|---|---|---|---|---|
| 25 | seeing (add -ing to see) | inflections/plain (1.5) | 1.25 | ✓ | | held |
| 26 | passes | es_plural (2.5) | 2.5 | ✓ | | held |
| 27 | hipped (add -ed to hip) | double_short (3) | 3 | ✗ | "hiped", tagged `no_doubling` | held |
| 28 | recycling | drop_e (3.5) | 3.5 | ✗ | "recyling" (base word misspelt; the rule itself was applied) | held |
| 29 | lowlier (add -er to lowly) | y_to_i (4.25) | 4.25 | ✗ | "lower" | held |
| 30 | referred | stress_doubling (5.75) | 5.75 | ✓ | | held |
| 31 | accustomed | no_double_unstressed (6.25) | 6.25 | ✓ | | held |
| 32 | sadness | morphological/plain_affix (1.75) | 1.5 | ✓ | | held |
| 33 | digitally | double_at_join (3.5) | 3.5 | ✓ | | held |
| 34 | loudly | ful_ly_ment (4.25) | 4 | ✓ | | held |
| 35 | readable (definition clue: "easily deciphered") | able_ible (5.5) | 5.75 | – | shown, not answered | – |

**Decisions that cannot be explained from the recorded evidence alone:**
- **Questions 1 to 27:** why each was chosen was not recorded. The replay explains the placement exactly.
- **Why the spelling check used speech-off formats:** the record does not say whether speech was available. The
  replay shows only the speech-off branch reproduces the recorded words.
- **Today's next step:** a new spelling check starting at "warning" (b 1.25), because the unfinished check counts as
  not done. Home also offers "Carry on" for the unfinished one.

## 2. The spelling check

| Question | Answer | Evidence |
|---|---|---|
| Why a predetermined queue? | `spellingCheckQueue` builds the whole list when the session starts, and the list is stored in the session event. Later questions come from that stored list in order. | [Code] `frontend/src/english/logic/select.ts` `spellingCheckQueue`; `learner.ts` `start()` and `nextQuestion()` |
| Does it adapt after each answer? | **No.** Answers do not change the list, the order or the length. They update the app's per-pattern tally (`state.ts`, `check.right/total`), the list of words seen, and word review for misspelt words. | [Code] [Replay] the recorded order equals the list built at the start |
| Why these words? | One word for **every** spelling pattern whose band is at most estimate + 2. Within a pattern, the word whose difficulty is nearest the pattern's band, then a fixed hash of the id (`fnv1a`). The generator adds +0.25 difficulty to less common words (`tools/english/spelling/generate.ts`), which in several patterns puts them exactly on the band. So the rule **prefers less common words**: 4 of Pupil A's 12 (passes, hipped, lowlier, referred) are from the less common list. There is no age-appropriateness check. Within a word, "add an ending" is preferred to dictation. | [Code] `unseenWords`, `spellingCheckQueue`. [Replay] reproduces seeing, passes, hipped, recycling, lowlier, referred, accustomed, sadness, digitally, loudly, readable, weight |
| Why a question 4 levels below the estimate? | The filter is `if (p.band > v.mean + 2) continue`. There is an upper limit but **no lower limit**, so every easier pattern is included, starting with the easiest. The plan's description of it, "One word for each spelling pattern near your level", is therefore inaccurate. | [Code] `select.ts` `spellingCheckQueue`, `plan.ts`. [Observed] issue "targeting": `gen.infl.add_ending.warning` 1.25 vs 5.25 |
| Why "meaning_first_letter" questions? | It is one of the templates the check accepts. A pattern with no "add an ending" item (most morphological ones) uses dictation when speech is available, and the definition clue when it is not. The clues come from a dictionary database, for example "easily deciphered" for "readable", which tests vocabulary as much as spelling. | [Code] the `templates` list in `spellingCheckQueue`; `usable()`; `content/english/spelling/generated-items.json` |
| Does speech change selection? | **Yes.** `usable()` removes every dictation (`hear_spell`) item when speech is unavailable. Speech is available when the device has a local English voice (`ui/speech.ts`, `localService` voices only) and the learner has not turned speech off. Pupil A's recorded queue matches the speech-off list exactly. Why the phone reported no local voice has not been verified on the device. | [Code] `select.ts` `usable`; `ui/speech.ts` `detectSpeech`. [Replay] |
| Do the answers count? | **No.** The ledger holds every generated item that a person has not checked (`item.generated && !item.generated.checked`, `updater.ts`), and all 2,348 are unchecked, so no estimate changes. Even 15 wrong answers leave the estimates unchanged. They still drive the spelling plan through per-pattern tallies, where a single wrong word makes a pattern "needs work" (`patternStatus`). | [Code] `packages/english-core/src/updater.ts` generated gate; `state.ts` `patternStatus`. Test S1 |

**Design mismatch (to document, not fix):**
- **The intended primary spelling assessment for ages 10–15:** hear the word, then type it.
- **What the current check uses:**
  - mostly "add this ending to this base word", which tests rule application with the base word given;
  - otherwise a dictionary-definition clue;
  - dictation only for patterns without an "add an ending" item, and only when speech is available.
- **Synonym, antonym and definition items:** they belong to vocabulary but appear in spelling through
  `meaning_first_letter`.
- **Effect on measurement:** the check's results never reach the Learner Vector. Pupil A's spelling estimates rest
  on the six hand-written spelling questions in placement; later practice and transfer checks add at most one
  counted question each.

## 3. The Learner Vector

### What a number such as 5.25 means

- **The scale:** each skill's estimate is a belief on OpenPath's 1–8 scale for that skill. For inflections, the
  framework describes band 4 as "applies doubling and silent-e rules to common one-syllable words" and band 6 as
  "applies the rules to two-syllable words, including stress-dependent doubling".
- **Before any answers:** every pupil starts at 4 ± 1.5.
- **5.25 ± 0.85 means:**
  - OpenPath's best guess is that Pupil A would get a typed inflections question of difficulty 5.25 right about
    half the time;
  - it is 80% sure the true level lies between about 4.2 and 6.3.
- **How Pupil A got there:** two right answers, at difficulty 4 and at difficulty 5. Two right answers can push an
  estimate up, but they cannot find the ceiling.
- **What it is not:** the bands are not tied to age or school year, and every question's difficulty is an expert's
  or a formula's guess, not yet calibrated against real pupils. So 5.25 is a position on OpenPath's own uncalibrated
  scale, not an attainment level.

### Audit

| Check | Result | Evidence |
|---|---|---|
| Right and wrong answers update consistently | **Verified.** Right always raises the estimate and wrong always lowers it, across a 120-point grid, and the uncertainty always shrinks. Updates are larger when the answer is surprising: at estimate 5, a wrong answer on a difficulty-2 question costs 1.13, a right one gains 0.03. All 24 of Pupil A's updates equal the formula exactly. | [Code] `packages/english-core/src/model.ts` `binaryUpdate` (3-parameter logistic, one Laplace step). [Replay] 24/24 |
| Inference from related skills is not shown as demonstrated ability | **Verified.** Skills moved only by related skills keep standing "not checked" and certainty "not assessed". The shift per answer is capped (0.25), but shifts add up: in Pupil A's record, writing grammar moved 4 → 4.82 with no answers of its own. Inferred estimates do steer question choice (#6: prefixes was at 4.22 before any prefix answer). | [Code] `composite.ts` `inferred`; `progress.ts` `certaintyOf` |
| Provisional questions cannot establish mastery | **Only in the engine's narrow sense.** Items flagged `evidence_status: "provisional"` never change an estimate. But all 881 hand-written questions are unreviewed drafts without that flag. They count, and in a synthetic run they made 5 skills "shown" with no validated question behind them. The profile does report it (`basis.validated = 0`). | [Code] `updater.ts`; item files (`review: candidate-unvalidated`). Test L6 |
| Assisted answers are kept apart from independent ones | **Verified.** A second try, or an answer after a hint, is an `assisted_response`, not evidence. Pupil A's one second try changed no estimate. | [Code] `learner.ts` `record()`. [Observed] 1 `assisted_response`. Existing test J |
| Unassessed skills stay unassessed | **Verified.** 43 skills are "not checked". | [Observed] |
| Ranges and certainty labels match the evidence | **Honest but generous.** Every Pupil A skill is "early" with ranges of about ±1.1 bands, which is accurate. "Measured" needs 4 direct answers and sd ≤ 0.9, while "shown" can be reached with 3 qualifying answers in 2 formats. | [Code] `progress.ts` (MEASURED_MIN_N 4, MAX_SD 0.9); framework policy `demonstrated_min_direct 3` |
| Misconceptions are supported by recorded answers | **Supported, but by a single answer.** One wrong answer carrying a tag sets strength 0.5, above the 0.3 "active" line. Pupil A's `past_after_did` rests on one answer ("ate" in "We didn't ___ breakfast"). A wrong answer with no tag adds nothing, so a misconception not foreseen by the item author is never seen. | [Code] `composite.ts` `applyDirect`; policy `misconception_gain 0.5`. Test L5 |
| The next question uses the pupil's current state | **Verified for the engine's choices.** An all-right and an all-wrong pupil get the same first 2 questions, then diverge: average difficulty of questions 6 to 24 is 4.57 vs 3.25. The score combines information at the current estimate with uncertainty, closeness to a default target band (5) and variety (`selection.ts`). **Not true for the spelling check**, which is fixed at the start. | [Replay] `placementNext` → `recommend` |

## 4. The synthetic tests

| What the tests exercise | What it does and does not validate |
|---|---|
| The frozen ten-learner simulation (`tools/english/sim`) | **Validates:** internal consistency under the engine's own model: honest ranges (M4), efficiency against random selection (M5), safety and determinism (M7, M8). **Does not validate:** anything about real pupils. Simulated answers are drawn from the same response model, using the item's own labelled difficulty (`sim/learners.ts` `respond`), so wrong difficulties, ambiguous questions and real mistakes cannot appear. The file says so itself. It also **fails** profile recovery after 40 items (ρ 0.40 against 0.8) and the guesser-robustness case. |
| App journeys (`learner.test.ts`, `profile.test.ts`, `ux.test.ts`, `profile-sim.ts`) | **Validates:** the software: what is recorded, attribution (independent, assisted, after teaching, held), plan rules, persistence and replay. **Does not validate:** whether those answers are realistic. Answers are scripted right or wrong: a wrong answer is "zzzq", the reversed order, or the item's own tagged wrong form. |
| Doubling journey (`journey*.test.ts`, `journey-sim.ts`) | **Validates:** the rule planner with scripted error patterns (never doubles, always doubles, slips). These are realistic in kind, but authored by us. |
| Pilot content (`pilot-content.test.ts` PC-1 to PC-11) | **Validates:** structure: unique ids, valid keys, a known capability and step for each question, pools kept apart. **Does not validate:** whether a question actually tests its capability, or is unambiguous. |
| Evaluator harness (`tools/english/e3`) | **Validates:** handling of mock evaluator faults. Not relevant here. |

| Property | Tested? |
|---|---|
| Educational appropriateness | **No.** Nothing checks words or questions against an age or curriculum standard. |
| Skill-to-question alignment | **Structural only.** Labels are checked to exist, not to be right. Example: spl.mor.08 asks for "gratefully"; Pupil A wrote "gracefully", a correct -ly join on a misread base word, which was scored as a morphological-spelling failure. |
| Adaptive difficulty | **Yes, under the model's assumptions** (M5; the selection-mode tests). Not with calibrated difficulties. |
| Question clarity and ambiguity | **No.** Example: voc.pre.06 asks "Add a prefix to agree to make its opposite: I ___ with you; I think the plan is risky." Pupil A wrote "am". The instruction is clear, but the sentence frame also accepts "am": a possible ambiguity for an educator to judge. |
| Realistic pupil mistakes | **Partly.** There are tagged wrong forms and journey patterns, but no misreadings, misspelt base words ("recyling") or unforeseen errors. |
| Correct attribution of evidence | **Yes.** This is the strongest area: tests J, K, E, PI-8 and the journey tests. |

## 5. Findings by type

### What works correctly

| Area | Evidence |
|---|---|
| Deterministic, explainable engine choices and updates | [Replay] 24/24 questions and estimates |
| The update formula is coherent | [Code] grid of 120 points |
| Independent, assisted and held answers are kept apart; unassessed and inferred skills are labelled honestly | [Code] [Observed] |
| Certainty labels match the amount of evidence | [Observed] every skill "early" |
| Decision tracing records queue positions for questions shown since it was added | [Observed] questions 28 to 35 |

### Confirmed defects (software)

| ID | Defect | Evidence | Regression test |
|---|---|---|---|
| D1 | Report redaction replaces version identifiers that look like emails, such as the framework key `en@0.2.0` | [Observed] `"framework": "[email]"` in the export | `investigation.test.ts`, todo |
| D2 | Whether speech was available is not recorded with the spelling queue, so the record alone cannot explain the formats chosen | [Observed] absent; [Replay] needed to establish it | `investigation.test.ts`, todo |
| D3 | The spelling check is described as "near your level" but has no lower limit (a word 4 bands below the estimate) | [Code] `spellingCheckQueue`; [Observed] | test S2 (current behaviour) |
| D4 | Spelling-check answers are recorded with `use: "assessment"`, and the developer diagnostics count the check as an assessment (`diagnostics.ts` `ASSESS`), but no answer can change an estimate | [Code] [Replay] | test S1 (current behaviour) |

### Mismatches with the educational design

| ID | Mismatch | Evidence | Regression test |
|---|---|---|---|
| E1 | The primary spelling format, hear then type, is used for at most 1 to 2 of 12 words even with speech; "add an ending", which gives the base word, dominates | [Code] [Replay] | test S3 |
| E2 | Definition clues ("easily deciphered") stand in for dictation, mixing vocabulary into spelling | [Code] | test S4 |
| E3 | Spelling is measured mainly by six placement questions. Generated words, which make up the check and almost all of practice and the transfer checks, never reach the Learner Vector (held); practice and each transfer check add at most one hand-written question that counts. Separate per-pattern tallies decide "needs work" and "secure" outside the engine | [Code] `state.ts` `patternStatus`, TRANSFER_PASS 0.75; `select.ts` `unseenHandWritten` | |
| E4 | Unreviewed hand-written questions can establish "shown" | [Code] | test L6 |
| E5 | Word choice inside a pattern favours less common words (the +0.25 difficulty they get puts them on the band) and ignores age, hence "lowlier" and "hipped" | [Code] `unseenWords`; `tools/english/spelling/generate.ts` | |
| E6 | Placement spreads 24 questions over 13 skills (one or two each) and none over reading; its estimates are wide and its profile weakly determined (the frozen simulation's M1 fails) | [Observed] [Code] | |

### Suspected issues (need verification)

| ID | Suspicion | How to verify |
|---|---|---|
| V1 | The phone has no local English voice, or voices load too late for `detectSpeech` (1.5 s wait). Pupil A's record has no speech setting event, so the learner did not turn speech off | Open Me on that phone: does it offer hearing words? Run Chrome's `speechSynthesis.getVoices()` on that phone |
| V2 | voc.pre.06's sentence frame invites "am"; spl.mor.08's grateful/graceful confusion mixes reading with spelling | Educator review of these items |
| V3 | voc.gen.12 accepts the misspelling "rescude" as right; check whether this leniency is intended | Educator review |
| V4 | One wrong word marks a pattern "needs work" and sets its practice priority | Decide the rule with an educator, then test with realistic errors |
| V5 | Selection reasons are empty for most engine choices (`chosen.reasons` []), so traces say "highest score" but not why | [Code] `selection.ts` reasons |

## 6. Recommended fixes, ranked (awaiting approval; nothing implemented)

| Rank | Recommendation | Type |
|---|---|---|
| 1 | Decide what the spelling check is for. If it is an assessment, its words must be able to count: review a set of generated words so they are no longer "candidate", or use reviewed hand-written spelling items. Until then, label it practice in the app and the dashboard (fixes D4). | Design decision |
| 2 | Make dictation the primary spelling format where speech is available, and say in the app when it is not (E1, E2, V1). | Design decision |
| 3 | Give the spelling check a lower limit around the estimate, for example within ±2 bands, and stop or branch on answers instead of a fixed list (D3). | Design decision |
| 4 | Agree what "provisional" means. Either hand-written drafts cannot make a skill "shown" until reviewed, or the parent-facing word "shown" carries "on draft questions" (E4). | Design decision |
| 5 | Require more than one tagged answer before a misconception becomes active, for example two in different items (L5, V4). | Scoring change |
| 6 | Record speech availability with each spelling queue (D2). | Tooling, small |
| 7 | Fix the redaction pattern so version keys survive (D1). | Tooling, small |
| 8 | Collect real-pupil response data to calibrate difficulties before relying on absolute band numbers (E6). | Research |
| 9 | Add an educator review pass for item clarity and alignment, with examples from V2 and V3. | Content |

## Appendix A: how this was reproduced

These are local scripts only, kept outside the repository.
- `replay.mts`: rebuilds Pupil A's placement from the export's answers through `Learner`, then compares questions,
  estimates and the spelling queue with speech on and off.
- `audit.mts`: the update-formula grid, the replay against the formula, all-right vs all-wrong pupils, inference,
  "shown" on draft items, misconceptions, assisted answers.
- `spell.mts`: spelling queues and held evidence.

The regression tests are in `frontend/src/english/logic/investigation.test.ts`: 6 current-behaviour tests (pass) and
2 known-defect tests (todo).
