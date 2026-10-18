# Grade 8 target-band audit (Essay Intelligence v2)

**Question.** Why does a learner who completes the essay journey for subject–verb agreement end at band 4 and not
reach the Grade 8 target (band 5)?

**Answer, in short.** The band-5 threshold can be reached. The problem is **not enough independent evidence after a
confirmed gap**, made worse by **running out of unseen higher-band questions**. Band 5 was **not** lowered. Every
Grade 8 target is now labelled **provisional** (`expectedBandStatus: "provisional"` in
`content/english/essay/g8-writing.json`), because none has been calibrated or reviewed by an educator.

Reproduce: `node tools/english/essay-band-audit.ts --md`. The audit uses the real ledger, estimator and evidence policy,
with no shortcuts.

## What was measured

For each of the 16 specified Grade 8 competencies:

| Competency | Questions (b ≥ 5) | b range | Journey path → level | Then: right answers at b ≥ 5 to reach 5 | From scratch, all right | Easy questions only (b < 5) |
|---|---:|---|---|---|---|---|
| Subject–verb agreement | 16 (8) | 2–7.75 | 3.5 (demonstrated) | 2 more | 3 answers, 2 sessions | never (stops at 4.5) |
| Present and past simple | 15 (7) | 1.5–7.75 | 5 (demonstrated) | 1 more | 3 answers, 2 sessions | never (stops at 4.5) |
| Progressive and perfect aspect | 13 (6) | 2–7.5 | 3.5 (demonstrated) | not reached with 1 | 3 answers, 2 sessions | never (stops at 4.5) |
| Articles | 16 (9) | 2–7.5 | 3.5 (demonstrated) | 2 more | 4 answers, 2 sessions | never (stops at 4.5) |
| Grammatical accuracy in writing | 13 (6) | 2–7.75 | 3.5 (demonstrated) | not reached with 1 | 3 answers, 2 sessions | never (stops at 4.5) |
| Prepositions of time and place | 16 (8) | 1.5–7.75 | 4 (demonstrated) | 3 more | 3 answers, 2 sessions | never (stops at 4.5) |
| Complete sentences, not fragments | 14 (6) | 1.5–7.75 | 1.5 (demonstrated) | not reached with 2 | 5 answers, 2 sessions | never (stops at 4.5) |
| Avoids run-on sentences and comma splices | 14 (7) | 2–7.5 | 2 (demonstrated) | not reached with 2 | 5 answers, 2 sessions | never (stops at 4.5) |
| Coordination | 13 (6) | 1.75–7.75 | 2 (demonstrated) | not reached with 1 | 5 answers, 2 sessions | never (stops at 4.5) |
| Subordination | 15 (7) | 2–7.5 | 3.5 (demonstrated) | not reached with 2 | 5 answers, 2 sessions | never (stops at 4.5) |
| Commas | 15 (9) | 2–7.5 | 2.5 (demonstrated) | not reached with 2 | 5 answers, 2 sessions | never (stops at 4) |
| Precise word choice in writing | 12 (6) | 1.75–7.5 | 2.5 (demonstrated) | not reached with 0 | 5 answers, 2 sessions | never (stops at 4.5) |
| Collocations | 14 (6) | 1.75–7.75 | 2.5 (demonstrated) | not reached with 2 | 3 answers, 2 sessions | never (stops at 4.5) |
| Connectives and transitions | 13 (6) | 1.75–7.75 | 3 (demonstrated) | not reached with 1 | 4 answers, 2 sessions | never (stops at 4.5) |
| Logical sequencing | 12 (6) | 1.75–7.5 | 3 (demonstrated) | not reached with 0 | 4 answers, 2 sessions | never (stops at 4.5) |
| Paragraphing | 12 (6) | 2–7.5 | 2.5 (demonstrated) | not reached with 0 | 5 answers, 2 sessions | never (stops at 4) |

Column guide:

- **Journey path:** the acceptance path is 2 wrong and 1 right diagnostic answer, then 3 assisted practice answers
  (held, so they give no evidence), then 2 right independent checks.
- **Then:** how many more right answers on *unseen* questions at b ≥ 5, in later sessions, the learner needs to reach
  band 5. "not reached with N" means only N such questions were left.
- **From scratch:** a learner with no wrong answers who answers every unseen question right.
- **Easy only:** the same learner, but only on questions below band 5.

The studio's live run reached agreement at 4 rather than the 3.5 shown here because it selected different items. The
mechanism is the same.

## The three hypotheses from the brief

1. **Missing higher-band questions?** Partly. Every competency has 6–9 questions at b ≥ 5, and a learner who answers
   them right reaches band 5 in 3–5 answers across 2 sessions. The bank is **thin**, though. After one diagnostic and
   one journey, 10 of 16 competencies have too few unseen b ≥ 5 questions left to reach 5. Assisted practice uses up
   hard items without producing evidence.
2. **Not enough independent evidence?** **Yes, this is the main cause.** The demonstrated level is the lower 80% credible
   bound of the ability estimate. Two wrong diagnostic answers are real evidence, and two right checks straight
   afterwards cannot outweigh them with a narrow enough interval. This is what the engine is supposed to do: a gap
   confirmed by the diagnostic should not disappear after two right answers in the same week.
3. **An inappropriate threshold?** Not shown. The threshold is reachable, and easy questions alone correctly never
   reach it, so the threshold does separate difficulty. Its *placement* at band 5 is a draft, though (see below).

**Decision: band 5 is not lowered.** Lowering it would turn the journey green without any new evidence.

## Curriculum justification for each target, and why all targets are provisional

Every specified competency carries `expectedBand: 5`. The basis for that number:

| Source | What it supports | Limit |
|---|---|---|
| OpenPath English framework 0.2.0 band scale | Band 5 = "age-typical secondary texts, mostly accurate"; indicatively CEFR B1 | Leaf descriptors exist only at bands 2, 4, 6 and 8, so band 5 is an interpolation with **no descriptor of its own**. Example (agreement): band 4 "agrees with plural and singular noun subjects in simple sentences"; band 6 "agrees across intervening phrases". |
| CEFR Companion Volume (2020): grammatical accuracy, vocabulary control, coherence and cohesion | B1 is a plausible expectation for Grade 8 learners of English in Indian schools | The CEFR is a scale for language learners, not a grade standard. The mapping is indicative and unvalidated. |
| CBSE English (184) syllabus 2025–26 (Class X topics: Subject–Verb Concord, Tenses, Determiners) | These are taught topics by secondary school | It is a Class X list, used only as an indication for Class VIII. No outcome-level mapping is claimed. |
| NCERT Learning Outcomes (2017), Class VIII English | Document-level reference only | No outcome-level mapping is claimed. |

In addition, `CAPABILITY_FRAMEWORK.md` leaves age-expectation statuses as open decision **D-5** (the recommendation
there is not to use them).

So every target is **provisional**: it is uncalibrated, has no band-5 descriptor, and has not been reviewed by an
educator. The three unspecified competencies (dependent prepositions, reference across sentences, concision) have no
target.

## Recommendations (not implemented; each needs an owner decision)

1. **Reserve b ≥ target questions for independent checks.** Assisted practice would use items below the target, so the
   checks that follow a journey still have unseen hard items to draw on.
2. **Add higher-band questions after review.** Aim for at least about 12 per competency at b ≥ 5, so that a second
   journey or a later check does not run out.
3. **Add a later independent check (retention).** One or two unseen b ≥ 5 questions days after the journey. This is the
   evidence the engine already asks for (separate sessions), and it is the honest way to move from 4 to 5.
4. **Write band-5 descriptors, or decide (D-5) that targets sit on described bands.** This should be done with an
   educator. Until then targets stay provisional.

## Update: assessment evidence and retention v1

The first two recommendations above are now implemented in [ASSESSMENT_RETENTION.md](ASSESSMENT_RETENTION.md):

- questions at or above the target are kept for independent checks and the delayed retention check, and are never
  spent on practice;
- a later verification check and a delayed retention check are planned on reserved questions.

The table above was measured with the earlier journey and the core bank; the six simulations there supersede its
"journey path" column. The finding stands, and is now sharper: band 5 is reachable with legitimate evidence, but for a
learner who first fails the diagnostic, the bank runs out of reviewed questions between b 5 and 6.5 before the
estimator's lower bound reaches 5. Band 5 is still not lowered, and every target is still provisional.
