# Assessment recovery and content coverage

Branch `feat/assessment-recovery-v1`, stacked on PR #46. The two obstacles left by ASSESSMENT_RETENTION.md were too
little independently usable content, and an estimator that may under-represent improvement after instruction. This
change adds three things:

- a **proposed** supplemental bank, with an educator-review package;
- a **shadow-only** estimator comparison;
- **multiple spaced later checks**.

Production estimates, evidence thresholds and the Grade 8 targets are unchanged. Real-child essays stay disabled.

## Status at a glance

| Part | Status |
|---|---|
| 96 proposed Grade 8 questions | **Proposed, provisional, unreviewed.** They are not loaded by the app, marked `evidence_status: "provisional"` (the ledger holds every answer), and allocated for practice only. They count only after educator review. |
| Educator-review package | Ready: `g8-supplement-v1/REVIEW_PACKAGE.md`, `review-form.csv` and an empty `reviews.json`. |
| Automated content checks | Real, run in tests and by `tools/english/supplement/main.ts --check`: 0 blocking problems. They do not judge correctness; the review does. |
| Estimator comparison | **Shadow-only research** (`tools/english/research/estimator-recovery.ts`). Nothing in the app uses it. |
| Multiple later checks | Real and tested (policy `essay-policy@2-draft`). |
| What reviewed content would change | Counterfactual only (the "reviewed-supplement" bank: a copy with the provisional mark removed). It is never used by the app. |

## Task A: the proposed supplemental bank

### The bank

`content/english/proposed/g8-supplement-v1/items.json` holds 96 questions, and `tools/english/supplement/authoring-g8-v1.py`
regenerates them.

- **Distribution.** Per competency, as the "two later checks" shortfall in ASSESSMENT_RETENTION.md:
  - agreement, past simple, articles, fragments, coordination, word choice, collocations, connectives and sequencing:
    7 each;
  - prepositions and paragraphing: 6 each;
  - aspect and grammatical accuracy: 5 each;
  - run-ons and subordination: 4 each;
  - commas: 3.
- **Shape.** All are between band 5 and 6.5, on existing ladder steps (within 0.75 band), in existing formats: 60
  choice, 20 typed, 11 multi, 5 order.
- **Fields.** Each carries the existing competency id, step, rationale, misconception tags,
  `difficulty_source: "expert_estimate"` and `review: "draft-unreviewed"`.
- **Proposed uses.** `manifest.json` lists them:
  - two per competency for the delayed retention check (32);
  - the rest for independent checks (64).

  These take effect only after review. No existing or pilot question was replaced or reassigned.
- **Provenance.** Drafted by the development team with AI assistance (Claude) on 18 October 2026. This is stated in the
  manifest and the package.

### Checks (`node tools/english/supplement/main.ts --check`)

| Check | What it does |
|---|---|
| Schema | The engine's own content validation |
| Bank rules | The existing item-bank lint |
| Provisional | Provisional and unreviewed on every question; the allocation never offers one for diagnosis, independent checks or retention; the ledger holds an answer |
| Duplicates | No repeated option or accepted answer; no question that repeats an existing one |
| Near-duplicates | Word overlap of 60% or more with any existing question or with another proposed one |
| Answer leakage | The answer appears in a lesson, or the keyed answer shares four words in a row with an existing question |
| Ambiguity | "Two"/"both" prompts have two keys; no keyed option carries a distractor tag; every tag exists in the framework; keyed positions are balanced |
| Language | The bank's age screen plus extra words |

The checks found and fixed these problems while drafting:

- 7 keyed answers that overlapped existing questions;
- 7 keyed options that carried a distractor tag;
- one ladder-distance problem;
- unbalanced answer positions;
- four wording issues: "died", "smoke", "fat", and a borderline case of "dying".

A manual pass also replaced 4 questions as ambiguous:

- an -ing fragment with many possible answers;
- a correct "If you lost your card" treated as an error;
- two options that could be read two ways.

One question (`sup.g8.coo.04`, either … or placement) is flagged in its rationale for the reviewer to judge.

### Effect, if reviewed (counterfactual)

With the supplement treated as reviewed, agreement's journey check and later checks have questions:

- S1 (fails the diagnostic, then improves) now reaches band 5.5 and is verified after the delayed check;
- the new S7 (improves gradually) is verified too.

The coverage shortfall at band 5–6.5 falls from 128 questions to 47 under the current policy (3 later checks), and from
96 to 15 for two later checks. The 15 remaining are because each competency's two retention questions are kept
separately from its checks.

Pilot rule per competency: 11 unseen reviewed questions with t ≤ b ≤ t+1.5 (retention 2 + journey check 2 + 3 later check × 2 + 1 diagnostic at the target), 2 with t−1 ≤ b < t, 3 for practice below t.

| Competency | Add, t ≤ b ≤ t+1.5 (current policy: 3 later checks) | Add for 2 later checks | Add, t−1 ≤ b < t | Add, practice | Existing questions to review |
|---|---:|---:|---:|---:|---:|
| Subject–verb agreement | 3 | 1 | 0 | 0 | 20 |
| Present and past simple | 2 | 0 | 0 | 0 | 14 |
| Progressive and perfect aspect | 3 | 1 | 0 | 0 | 14 |
| Articles | 3 | 1 | 0 | 0 | 21 |
| Grammatical accuracy in writing | 3 | 1 | 0 | 0 | 14 |
| Prepositions of time and place | 3 | 1 | 0 | 0 | 16 |
| Complete sentences, not fragments | 3 | 1 | 0 | 0 | 16 |
| Avoids run-on sentences and comma splices | 3 | 1 | 0 | 0 | 14 |
| Coordination | 3 | 1 | 0 | 0 | 15 |
| Subordination | 4 | 2 | 0 | 0 | 15 |
| Commas | 4 | 2 | 0 | 0 | 13 |
| Precise word choice in writing | 3 | 1 | 0 | 0 | 14 |
| Collocations | 2 | 0 | 0 | 0 | 16 |
| Connectives and transitions | 3 | 1 | 0 | 0 | 15 |
| Logical sequencing | 2 | 0 | 0 | 0 | 14 |
| Paragraphing | 3 | 1 | 0 | 0 | 14 |

Totals: add 47 questions with t ≤ b ≤ t+1.5 (15 for two later checks), 0 with t−1 ≤ b < t, 0 practice; review 245 existing questions.

## Task C: multiple later checks

Policy `essay-policy@2-draft`: `followUpChecks: 3` and `followUpSpacingDays: [1, 3, 7]`.

- **Spacing.** While the target is not shown, a further independent check of 2 is planned:
  - the first 1 day after the journey;
  - each later one 3 and then 7 days after the previous check's last answer.
- **Unseen eligible questions only.** Each check uses questions in band 5–6.5, excluding pools reserved for another use
  and the retention reserve.
- **Never offered early.** A check is not offered before its `notBefore` time, and early answers do not count.
- **It stops**, with a pending reason and nothing recycled, when:
  - three later checks have been used ("recommended for the next essay or a later assessment"); or
  - the last later check had **no right answer** ("teaching again is recommended before another check"); or
  - the unseen eligible questions run out ("more reviewed questions are needed").

Tests: K5-1 to K5-4 (core), and the updated studio test (frontend).

## Task B: shadow estimator comparison

Three methods are computed beside the ledger from the same observations, with the same demonstrated rule (the lower
80% bound in half bands, at least 3 answers in 2 formats; answers straight after teaching never count):

| Method | How it works |
|---|---|
| **Cumulative** | The production rule, re-implemented. It **matches the ledger's own estimate exactly** in every scenario (✓ below; K5-6 tests it). |
| **Recency-weighted** | Before every answer, variance += 0.25: older answers weigh less. |
| **Phase-aware** | At each instruction, the uncertainty is widened back to the prior's and the minimum answers and formats must be met again after it. Pre-instruction answers become only a weak starting point. |

**Scenario replays (subject–verb agreement): final demonstrated level per method.** The cumulative column is the production rule re-implemented; ✓ where it matches the ledger's own estimate.

*app bank*

| Scenario | Answers | Cumulative (production) | Recency-weighted | Phase-aware |
|---|---:|---|---|---|
| S1. Fails the diagnostic, then improves after teaching | 3 | 2 ✓ | 2 | 2 |
| S2. Answers hard independent questions right throughout | 4 | 5.5 ✓ | 5.5 | 5.5 |
| S3. Completes practice with help, fails every independent check | 3 | 2 ✓ | 2 | 2 |
| S4. Passes the checks, then fails the delayed retention check | 4 | 4.5 ✓ | 4.5 | 4.5 |
| S4b. One wrong answer in the delayed retention check | 4 | 5.5 ✓ | 5.5 | 5.5 |
| S7. Improves gradually after teaching; needs several later checks | 3 | 2 ✓ | 2 | 2 |
| S5. Questions at the target already used up (earlier practice with help) | 3 | 2 ✓ | 2 | 2 |
| S6. Returns for a second essay with evidence from the first | 6 | 4 ✓ | 4 | 4 |

*core bank*

| Scenario | Answers | Cumulative (production) | Recency-weighted | Phase-aware |
|---|---:|---|---|---|
| S1. Fails the diagnostic, then improves after teaching | 5 | 4 ✓ | 4.5 | — |
| S2. Answers hard independent questions right throughout | 7 | 5.5 ✓ | 5.5 | 6 |
| S3. Completes practice with help, fails every independent check | 5 | 2.5 ✓ | 2.5 | — |
| S4. Passes the checks, then fails the delayed retention check | 7 | 4.5 ✓ | 4 | 4.5 |
| S4b. One wrong answer in the delayed retention check | 7 | 5 ✓ | 4.5 | 5 |
| S7. Improves gradually after teaching; needs several later checks | 5 | 2.5 ✓ | 2.5 | — |
| S5. Questions at the target already used up (earlier practice with help) | 3 | 2.5 ✓ | 2.5 | 2.5 |
| S6. Returns for a second essay with evidence from the first | 5 | 4 ✓ | 4.5 | — |

*reviewed-supplement bank*

| Scenario | Answers | Cumulative (production) | Recency-weighted | Phase-aware |
|---|---:|---|---|---|
| S1. Fails the diagnostic, then improves after teaching | 9 | 5.5 ✓ | 6 | 6 |
| S2. Answers hard independent questions right throughout | 5 | 5.5 ✓ | 5.5 | 5.5 |
| S3. Completes practice with help, fails every independent check | 7 | 2 ✓ | 1.5 | 1.5 |
| S4. Passes the checks, then fails the delayed retention check | 7 | 4 ✓ | 3 | 4 |
| S4b. One wrong answer in the delayed retention check | 5 | 5.5 ✓ | 5.5 | 5.5 |
| S7. Improves gradually after teaching; needs several later checks | 9 | 5.5 ✓ | 6 | 6 |
| S5. Questions at the target already used up (earlier practice with help) | 3 | 2 ✓ | 2 | 2 |
| S6. Returns for a second essay with evidence from the first | 10 | 5.5 ✓ | 6 | 6 |

**Monte Carlo (400 seeded learners each, unlimited reviewed questions, the essay schedule with up to three later checks).** "Shown" = demonstrated at band 5 or above.

| Learner | Method | Ever shown | Shown while truly below 5 (false mastery) | Answers after teaching to be shown | Status flips after first shown | Shown after the delayed check |
|---|---|---:|---:|---:|---:|---:|
| improver: 3.5 before teaching, 6 after | cumulative | 64% | 0% | 4.9 | 0.99 | 77% (of 59% reaching it) |
| improver: 3.5 before teaching, 6 after | recency | 86% | 0% | 4.3 | 1.65 | 56% (of 77% reaching it) |
| improver: 3.5 before teaching, 6 after | phase | 80% | 0% | 4.3 | 1.24 | 85% (of 74% reaching it) |
| slow improver: 3.5 before, 5.5 after | cumulative | 35% | 0% | 5.3 | 0.57 | 66% (of 31% reaching it) |
| slow improver: 3.5 before, 5.5 after | recency | 60% | 0% | 4.8 | 1.13 | 42% (of 51% reaching it) |
| slow improver: 3.5 before, 5.5 after | phase | 53% | 0% | 4.8 | 0.9 | 76% (of 48% reaching it) |
| below target throughout: 4 | cumulative | 5% | 5% | 2.5 | 0.09 | 38% (of 3% reaching it) |
| below target throughout: 4 | recency | 7% | 7% | 4 | 0.13 | 7% (of 4% reaching it) |
| below target throughout: 4 | phase | 2% | 2% | 4.6 | 0.04 | 13% (of 2% reaching it) |
| well below, choice questions only (lucky guesses): 3 | cumulative | 1% | 1% | 3.8 | 0.02 | 0% (of 1% reaching it) |
| well below, choice questions only (lucky guesses): 3 | recency | 3% | 3% | 3.8 | 0.05 | 13% (of 2% reaching it) |
| well below, choice questions only (lucky guesses): 3 | phase | 1% | 1% | 5.4 | 0.03 | 50% (of 1% reaching it) |
| just below, choice questions only (lucky guesses): 4.5 | cumulative | 7% | 7% | 4.6 | 0.13 | 30% (of 6% reaching it) |
| just below, choice questions only (lucky guesses): 4.5 | recency | 14% | 14% | 3.8 | 0.3 | 22% (of 10% reaching it) |
| just below, choice questions only (lucky guesses): 4.5 | phase | 11% | 11% | 4.6 | 0.22 | 45% (of 8% reaching it) |
| at target throughout: 6 | cumulative | 84% | 0% | 2.5 | 1.19 | 82% (of 80% reaching it) |
| at target throughout: 6 | recency | 91% | 0% | 2.6 | 1.74 | 56% (of 84% reaching it) |
| at target throughout: 6 | phase | 84% | 0% | 4 | 1.14 | 89% (of 80% reaching it) |
| forgets: 6 after teaching, 3.5 from day 7 | cumulative | 50% | 13% | 4.2 | 1.06 | 21% (of 45% reaching it) |
| forgets: 6 after teaching, 3.5 from day 7 | recency | 74% | 13% | 3.9 | 1.65 | 7% (of 62% reaching it) |
| forgets: 6 after teaching, 3.5 from day 7 | phase | 69% | 31% | 3.8 | 1.38 | 29% (of 62% reaching it) |

**Lucky streak (deterministic):** a band-3 learner misses all three diagnostic questions, is taught, then guesses four choice questions right (b 5.25–5.75) over two days. Level after each answer:

| Method | Levels |
|---|---|
| cumulative | — → — → 1.5 → 2 → 2 → 2.5 → 3 |
| recency | — → — → 1.5 → 2 → 2 → 3 → 3.5 |
| phase | — → — → 1.5 → — → — → 3 → 3.5 |

### What this shows

- **Recovery after instruction.** Production does under-represent genuine improvement after a failed diagnostic. An
  improver at band 6 after teaching is shown at band 5 in 64% of runs (production), 86% (recency) and 80%
  (phase-aware). A slow improver at 5.5: 35%, 60% and 53%.
- **False mastery.** None of the methods showed a stable learner below the target as mastered often.
  - For a learner at band 4: production 5%, recency 7%, phase-aware 2%.
  - With lucky guesses on choice questions only, at band 4.5: production 7%, recency 14%, phase-aware 11%.
  - **Recency doubles the false mastery from lucky guesses.**
- **Stability.** Recency flips status most (about 1.65 changes after first being shown, against about 1.0 for
  production). Phase-aware sits in between.
- **Delayed retention.**
  - For learners who keep the skill, phase-aware best keeps "shown" after the delayed check (85–89%, against 77–82%);
    recency worst (56%).
  - For learners who forget, recency detects forgetting best (only 7% still shown); phase-aware worst (29%). Phase-aware
    also shows the most "shown while truly below" (31%), because forgetting after day 7 has no instruction marker.
- **In the real scenarios,** content is the binding limit on the app bank: all three methods give the same level when
  only diagnostic answers exist. With reviewed content (counterfactual), all three reach the target for S1 and S7.

**Conclusion (for the owner and an educator; no production change).** No method dominates.

- Phase-aware recovers improvement best for its cost, but it is weaker at catching forgetting and needs the minimum
  answers again after each lesson.
- Recency catches forgetting but is unstable and more sensitive to lucky guesses.
- A credible next study would combine phase-awareness for instruction with the existing spaced retention check for
  forgetting, and test it against real response data once there is consented data.

Changing the estimator is an evidence-policy decision and was not made.

## Simulations under the new policy

**App bank** (pilot pools; no supplement):

| Scenario | Journey completed | Shown at band 5 without help | Verified (engine) | Retention | Assisted answers counted as fresh | Still pending |
|---|---|---|---|---|---|---|
| S1. Fails the diagnostic, then improves after teaching | yes | no (level 2) | no | not_applicable | 0 | not yet shown at band 5 without help, and the question bank has only 1 unseen question between band 5 and 6.5 (2 needed): more reviewed questions are needed before it can be checked again |
| S2. Answers hard independent questions right throughout | not on the journey | yes (level 5.5) | yes | demonstrated | 0 | — |
| S3. Completes practice with help, fails every independent check | yes | no (level 2) | no | not_applicable | 0 | not yet shown at band 5 without help, and the question bank has only 1 unseen question between band 5 and 6.5 (2 needed): more reviewed questions are needed before it can be checked again |
| S4. Passes the checks, then fails the delayed retention check | not on the journey | no | no | not_demonstrated | 0 | not yet shown at band 5 without help, and the question bank has only 1 unseen question between band 5 and 6.5 (2 needed): more reviewed questions are needed before it can be checked again |
| S4b. One wrong answer in the delayed retention check | not on the journey | yes (level 5.5) | yes | demonstrated | 0 | — |
| S7. Improves gradually after teaching; needs several later checks | yes | no (level 2) | no | not_applicable | 0 | not yet shown at band 5 without help, and the question bank has only 1 unseen question between band 5 and 6.5 (2 needed): more reviewed questions are needed before it can be checked again |
| S5. Questions at the target already used up (earlier practice with help) | yes | no (level 2) | no | not_applicable | 0 | not yet shown at band 5 without help, and the question bank has only 1 unseen question between band 5 and 6.5 (2 needed): more reviewed questions are needed before it can be checked again |
| S6. Returns for a second essay with evidence from the first | not on the journey | no (level 4) | no | not_applicable | 0 | not yet shown at band 5 without help, and the question bank has only 1 unseen question between band 5 and 6.5 (2 needed): more reviewed questions are needed before it can be checked again |

**Core bank:**

| Scenario | Journey completed | Shown at band 5 without help | Verified (engine) | Retention | Assisted answers counted as fresh | Still pending |
|---|---|---|---|---|---|---|
| S1. Fails the diagnostic, then improves after teaching | yes | no (level 4) | no | not_applicable | 0 | not yet shown at band 5 without help, and the question bank has only 0 unseen questions between band 5 and 6.5 (2 needed): more reviewed questions are needed before it can be checked again |
| S2. Answers hard independent questions right throughout | yes | yes (level 5.5) | yes | demonstrated | 0 | — |
| S3. Completes practice with help, fails every independent check | yes | no (level 2.5) | no | not_applicable | 0 | not yet shown at band 5 without help, and the question bank has only 0 unseen questions between band 5 and 6.5 (2 needed): more reviewed questions are needed before it can be checked again |
| S4. Passes the checks, then fails the delayed retention check | yes | no | no | not_demonstrated | 0 | not yet shown at band 5 without help, and the question bank has only 0 unseen questions between band 5 and 6.5 (2 needed): more reviewed questions are needed before it can be checked again |
| S4b. One wrong answer in the delayed retention check | yes | yes (level 5) | yes | demonstrated | 0 | — |
| S7. Improves gradually after teaching; needs several later checks | yes | no (level 2.5) | no | not_applicable | 0 | not yet shown at band 5 without help, and the question bank has only 0 unseen questions between band 5 and 6.5 (2 needed): more reviewed questions are needed before it can be checked again |
| S5. Questions at the target already used up (earlier practice with help) | yes | no (level 2.5) | no | not_applicable | 0 | not yet shown at band 5 without help, and the question bank has only 0 unseen questions between band 5 and 6.5 (2 needed): more reviewed questions are needed before it can be checked again |
| S6. Returns for a second essay with evidence from the first | yes | no | no | not_applicable | 0 | not yet shown at band 5 without help, and the question bank has only 0 unseen questions between band 5 and 6.5 (2 needed): more reviewed questions are needed before it can be checked again |

**Counterfactual: the supplement as if reviewed:**

| Scenario | Journey completed | Shown at band 5 without help | Verified (engine) | Retention | Assisted answers counted as fresh | Still pending |
|---|---|---|---|---|---|---|
| S1. Fails the diagnostic, then improves after teaching | yes | yes (level 5.5) | yes | demonstrated | 0 | — |
| S2. Answers hard independent questions right throughout | not on the journey | yes (level 5.5) | yes | demonstrated | 0 | — |
| S3. Completes practice with help, fails every independent check | yes | no (level 2) | no | not_applicable | 0 | not yet shown at band 5 without help, and the last later check had no right answers: teaching again (a new essay or lesson) is recommended before another check |
| S4. Passes the checks, then fails the delayed retention check | not on the journey | no | no | not_demonstrated | 0 | not yet shown at band 5 without help, and the last later check had no right answers: teaching again (a new essay or lesson) is recommended before another check |
| S4b. One wrong answer in the delayed retention check | not on the journey | yes (level 5.5) | yes | demonstrated | 0 | — |
| S7. Improves gradually after teaching; needs several later checks | yes | yes (level 5.5) | yes | demonstrated | 0 | — |
| S5. Questions at the target already used up (earlier practice with help) | yes | no (level 2) | no | not_applicable | 0 | not yet shown at band 5 without help, and the question bank has only 1 unseen question between band 5 and 6.5 (2 needed): more reviewed questions are needed before it can be checked again |
| S6. Returns for a second essay with evidence from the first | not on the journey | yes (level 5.5) | yes | pending | 0 | retention pending: the delayed check is due on 2026-11-22 |

## Tests added

- **Core K5:**
  - spaced later checks on unseen eligible questions, never early;
  - a finite maximum;
  - a stop after a check with no right answers;
  - pending (no recycling) on exhaustion;
  - the supplement is provisional and never evidence, and its checks pass;
  - the shadow cumulative estimator reproduces the ledger exactly.
- **Frontend:** the studio later-check test is updated for the larger allowance; content then runs out first, and that
  is reported.

## Limitations

- **The proposed questions are AI-drafted and unreviewed.** Their keys, ambiguity, difficulty and suitability need an
  educator. The automated checks are mechanical, and difficulties are expert estimates.
- **The estimator study** uses synthetic 3PL learners with known abilities, an unlimited ideal question supply and one
  forgetting factor (0.25). Its rates depend on those choices. It is behaviour research, not evidence about children.
- **Reviewed content is a counterfactual** in this change. Adopting the supplement needs the review, then a separate
  change to its status and its pools.
- **The pilot's diagnosis-pool questions** at band 5–6.5 are still not used for checks, as the existing metadata
  requires.
