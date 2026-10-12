# E1 report: walking skeleton

*12 October 2026 · branch `feature/english-e1` · engineering acceptance granted; merged with M1, M2 and M3 recorded as known limitations, not passing results.*

## Summary

All six core parts now work end to end, through one shared TypeScript core, on
the 17 skeleton capabilities of a framework that holds the full 121-capability
hierarchy. Three rounds of review changes are included:

- **R1–R6:** conservative strand ranges and a trusted-anchor guard.
- **Selection:** separate assessment and learning modes, target-relative need,
  relative information gain, and a prerequisite-aware easier step.
- **B1 and B2:**
  - a hybrid assessment/learning scheduler
  - spaced retention checks by due date, judged on fresh evidence, with
    overdue mastery shown as not currently verified
- **Final review:** fresh items, variants and flagged repeats are told apart,
  so retention tracking no longer needs an unlimited supply of new questions.
- **Merge condition:** after a failed retention check, selection and
  learner-facing summaries can no longer mistake historical mastery for
  currently verified proficiency.

| | Result |
|---|---|
| **Acceptance tests** (does E1 do what was specified) | **55 of 55 automated tests pass.** E1-11 is CI; E1-12 is your review |
| **Simulation measures** (frozen pass levels, frozen procedure) | **5 of 8 pass** (M4, M5, M6, M7, M8). M1, M2 and M3 miss, for different reasons that were checked separately; the item bank is only part of the cause. See "Why M1, M2 and M3 miss" |
| **Demonstration** | Two learners get different composites and different next activities. The same learner gets different, justified choices in assessment and learning mode. The same learner is shown before and after an overdue retention check. An invented quote is rejected, a restart gives identical state, and undo is exact |

**Remaining blocker:** B3, the item bank, deferred to E2 as you decided. There
are no architectural blockers. No LLM is called, nothing was bought, and
existing code is untouched apart from one new CI job.

## What was built, against the six priorities

| Priority | E1 deliverable |
|---|---|
| 1 · Capability framework | `content/english/framework/en-0.1.0.json`: 8 strands, 44 sub-strands, 121 capabilities. 17 are fully specified (band descriptors, misconception lists, couplings) and 56 are marked for the core V1 set. It is validated, and version 0.1.0 is frozen by fingerprint |
| 2 · Numerical composite | One estimate (mean and sd) for **every** capability in the hierarchy, kept twice. *Direct* comes only from the capability's own evidence and drives the stages. *Combined* adds capped, flagged effects from coupled capabilities and drives selection. It also holds contexts, misconceptions with fading strength, the evidence trail, mastery over time, and computed sub-strand and strand values |
| 3 · LLM-assisted evaluation | `EvaluationRequest` carries the reference standards (band descriptors and rubric), up to 3 anchors near the learner's level, the learner's text with identifiers removed, and current estimates. There is a strict proposal schema, a versioned prompt (`content/english/prompts/evaluate.v1.md`), the `mock` and `replay` adapters, and anchor qualification for every evaluator |
| 4 · Controlled updater, local-first | An append-only ledger becomes the composite and decision log through a deterministic fold. Eleven checks run on every proposal. Revoking a decision is exact. A `LearnerStore` interface has memory and local-file stores, and the browser store comes in E5 |
| 5 · Adaptive selection | Two explicit modes. **Assessment** prefers the largest share of current uncertainty removed, on uncertain capabilities whose position against the target is unsettled. **Learning** prefers target-relative need (adjusted for prerequisites the framework defines, misconceptions, retention and uncertainty), at a suitable difficulty. When no suitable item exists, it takes a prerequisite step, then an easier step, then falls back to assessment, and reports every item-bank gap. Targets are the learner's own, or a named documented default. Every choice is stored with a plain-language reason |
| 6 · Ten-learner simulation | 10 hidden profiles and 8 measures against pass levels committed before the first run, a fault-injection harness, and an HTML report |

**The boundary between the evaluator and OpenPath.** An evaluator can only
*propose observations*: a band, quotes, criteria and listed misconception
tags. The schema rejects any proposal that tries to set an estimate or a stage.
Only `updater.ts` changes the composite, after checks that the LLM cannot
influence. Code-scored items never go near the evaluator.

## Acceptance tests

| # | Test | Result |
|---|---|---|
| E1-1 | The framework is valid: 8 / 44 / 121, with 17 specified and at least 6 items each. The composite covers the full hierarchy | Pass |
| E1-2 | Bad frameworks are refused. A frozen version cannot change without a new version | Pass (8 kinds of fault, plus the lock) |
| E1-3 | The worked examples in `COMPOSITE_MODEL.md` reproduce to 2 decimals | Pass |
| E1-4 | Built-in rules hold over thousands of random sequences, and inferred changes never make anything demonstrated | Pass (2,000+ observations) |
| E1-5 | Rebuild from the ledger is exact, and revoking a decision equals never applying it | Pass (all 10 learners) |
| E1-6 | Each of the 11 updater checks has its own test, and 0 of 273 injected faults are applied | Pass |
| E1-7 | The core has no network code and no provider names. Swapping `mock` for `replay` gives identical decisions. The request carries no identity | Pass |
| E1-8 | Selection is repeatable, and every recommendation is explained | Pass. Each explanation names its mode and target |
| E1-8+ | Selection changes from the second review: relative information, target-relative need, learner targets never changed, documented default named, modes differ, prerequisite step, easier step, gap report, no invented prerequisites | Pass (7 new tests) |
| E1-9 | The ten-learner simulation reports every measure honestly against frozen levels | Pass. The measures themselves are reported separately below, and 3 of 8 miss |
| E1-10 | Local-first: no network use, restart from files gives identical state | Pass |
| E1-11 | Nothing else breaks | Existing suites unchanged and green locally: 49 engine tests and 19 app tests. CI runs all jobs |
| E1-12 | You review the demonstration and report | **Waiting for you** |
| E1-14 | Fresh, variant and repeated items (final review): the ledger decides the exposure; a repeat never moves the estimate; assessment and learning never repeat; a retention check falls back to an unseen variant, then a flagged repeat after 14 days | Pass (5 new tests) |
| E1-15 | After a failed retention check, nothing reads history as current (merge condition): verification is explicit; the learner summary says *needs review* and labels history; learning is pitched at the level the check supports; the estimate is unchanged | Pass (3 new tests) |
| E1-13 | Two learners with different capabilities get different composites and different next activities | Pass. Compared at capability level: some grammar capability with L3 above L4, and some writing capability with L4 above L3, each by more than both uncertainties combined |

## The demonstration (`node tools/english/demo.ts`)

The demonstration uses two invented learners, each answering 40 items over two
days:

- **Asha** reads well but writes in run-on sentences.
- **Ben** has a rich vocabulary but weak grammar.

Both start at 4.00 ± 1.50 on all 121 capabilities. After the 40 items, in
assessment mode first and then learning mode:

| Strand | Asha | Ben |
|---|---|---|
| Foundations | 5.31 ± 0.74 | 4.75 ± 0.83 |
| Vocabulary | 5.51 ± 0.88 | 5.38 ± 0.91 |
| Grammar | 4.79 ± 0.88 | **3.94 ± 0.94** |
| Sentences | **3.54 ± 1.23** | 4.68 ± 1.03 |
| Reading | 4.99 ± 1.12 | 5.73 ± 1.05 |
| Writing | 4.85 ± 1.04 | 4.82 ± 1.07 |

Strand ± values are conservative summary ranges, not calibrated measurements
(see R3).

**Asha's email is evaluated**, using an illustrative recorded proposal written
by OpenPath, not an LLM. The updater:

- **Accepted** run-ons at band 3.5 (4.07 ± 1.22 → 3.59 ± 0.48) and recorded
  *comma splice* and *fused sentence*.
- **Accepted** task response and grammar.
- **Accepted and capped** spelling (check 10).
- **Rejected** paragraphing: *"check 4: quote not found in the learner's
  response"*.
- Applied coupled effects as *inferred* changes only.

**The same learner, two modes (step 7b).**

- **Assessment** chooses a main-idea question. *"Identifies the main idea
  5.2 ± 1.2: this activity is expected to remove 15% of that uncertainty; 24%
  likely already at band 6."*
- **Learning** chooses a comma item. *"Commas (3.5 ± 1.1; 99% likely below
  band 6)… about 82% likely to succeed. The framework lists it as a
  prerequisite of Avoids run-on sentences and comma splices, which is also
  below target, so it comes first."*
- **The target** in both cases is the named default (band 6, the next band
  above her median of 5.2), because no target has been set for her.

**Next activities differ between learners.** Asha, in learning mode, gets
commas. Ben is still in assessment mode, because his uncertainty is high, and
gets a vocabulary item.

**Restart and undo:**

- Reopening from local files rebuilds an identical state.
- Revoking the evaluation's 4 accepted decisions returns the composite exactly
  to its state before the evaluation. The evidence stays in the log.

## Simulation results (`node tools/english/sim/main.ts`)

The pass levels were committed in `tools/english/sim/criteria.ts` *before* the
first run, in commit "freeze simulation pass levels".

Four columns of results:

- **First run:** the engine as first submitted.
- **After R3:** the conservative strand ranges.
- **After selection:** after the selection change.
- **Current:** after B1 and B2.

All four use the same frozen procedure: goal "overall", the engine's own
scheduling (now the hybrid scheduler), and 6 sessions of 20 items.

| Measure | First run | After R3 | After selection | **Current (B1, B2)** | Pass level |
|---|---|---|---|---|---|
| M1 Profile recovery after 40 items | 0.73 ✗ | 0.73 ✗ | 0.59 ✗ | **0.64 ✗** | ≥ 0.8 |
| M2 Weakest strand named | 6/7 ✓ | 6/7 ✓ | 4/7 ✗ | **3/7 ✗** | ≥ 6/7 |
| M3 Pairs told apart | 7/8 ✗ | 4/8 ✗ | 5/8 ✗ | **5/8 ✗** | all |
| M4 Honest uncertainty | 78% ✓ | 78% ✓ | 78% ✓ | **79% ✓** | 70–90% |
| M5 Efficiency vs random | 0.74 ✗ | 0.74 ✗ | 0.73 ✗ | **0.69 ✓** | ≤ 0.7 |
| M6 Guesser and forgetter | ok ✓ | ok ✓ | both not ok ✗ | **both ok ✓** | both ok |
| M7 Faulty evaluator output applied | 0/273 ✓ | 0/273 ✓ | 0/273 ✓ | **0/273 ✓** | 0 |
| M8 Deterministic | ✓ | ✓ | ✓ | **✓** | identical |
| **Passing** | 5 | 5 | 3 | **5** | |

**Compared with the previous round:**

- **Improvements:**
  - M5 now passes (0.73 → 0.69).
  - M6 now passes: the forgetter is caught by failed retention checks, and
    the guesser is within limits.
  - M1 is up from 0.59 to 0.64.
- **Regression:** M2 falls from 4/7 to 3/7.
- **Unchanged:** M3 (5/8), M4, M7, M8.

**Compared with the first run:** M5 and M6 pass, M2 regresses (6/7 → 3/7), and
M1 is lower (0.73 → 0.64).

**Context only, not the frozen seed.** Over 3 other seeds:

- M2 is 4–5 of 7 and M1 is 0.36–0.61.
- The forgetter is caught on all of them.
- M5 passes on all of them.

The final review added a 10-seed comparison of the three modes and a
per-learner check of M2. Both are in "Why M1, M2 and M3 miss" below.

Thresholds have not changed. The analysis of the current results is in
"Selection change" below. The notes immediately below explain the first-run
misses.

**Why the three misses happen.** I checked for engine defects before
accepting these numbers. The uncertainty is honest (M4), and the spread of
evidence across capabilities is even. The misses come from **how much a small,
uncalibrated E1 item bank can tell us**:

- **M1.** The bank has 123 code-scored items for 17 capabilities. Reading and
  vocabulary are multiple-choice only, with guessing and only 6–9 items each.
  Ranking six strands that truly differ by about 1 band needs more evidence
  than that. The same measure after 120 items is 0.74, because by then the
  learner has used almost the whole bank: the bank is exhausted, not the
  engine.
- **M3.** Four pairs miss. Before the strand-range correction (R3) only one
  missed: L6 vs L1 on *infers motives*. The estimates there are accurate
  (3.22 vs true 3; 4.94 vs true 5), but 6 multiple-choice reading items leave
  each sd near 1.0. The three new misses are strand-level comparisons, which
  now use deliberately conservative ranges. They miss narrowly: gaps of 1.30,
  1.50 and 1.04 against required 1.54, 1.56 and 1.05. Every one of those pairs
  is still told apart at capability level, where estimates are calibrated (R3).
  The pass level stays "all".
- **M5.** This is a near miss: adaptive selection needs 26% fewer items than
  random, against a target of 30%. With only 8 items per grammar capability
  there is little room for adaptive choice.

**Proposed fixes, all within E2's planned scope:**

- grow the bank to about 600 items, with typed and short-answer formats for
  reading and vocabulary
- more items at the ends of the scale
- calibrate item difficulty from real responses
- re-run the same frozen measures

**Engine finding to address in E2.** There is a ceiling effect. A learner at
7.5 who gets everything right is estimated at about 6.4 (L7), because the bank
tops out around 7.5. More hard items fix this. (The second finding, optimistic
strand uncertainty, was corrected in review: see R3.)

## Hybrid scheduling and retention (third review: B1 and B2)

### B1 · Hybrid scheduler

This is an initial, configurable experimental setting, not a fixed product
policy (`HYBRID` in `selection.ts`). It is now the engine's own scheduling. For
each activity it chooses, in order:

1. **An overdue retention check** on the most overdue goal capability. The item
   is chosen to separate the retained level from one band lower.
2. **A contradiction probe.** It fires when, in the latest session on a
   capability, at least 2 items at or below the estimate were mostly missed, or
   at least 2 items a band or more above it were mostly answered correctly. It
   re-measures before building on the estimate.
3. **Assessment** while goal uncertainty is high (sd above 0.9).
4. **An assessment probe on every third activity** (`probeEvery: 3`;
   configurable, and 0 turns it off).
5. **Otherwise learning.**

Explicit `assessment` and `learning` modes bypass the scheduler, for testing.
Every recommendation records why it was scheduled.

### B2 · Retention by due date

- **The schedule:**
  - the first check falls due 7 days after first demonstration
  - a passed check doubles the interval, up to 60 days
  - a failed check halves it, down to 2 days, and marks the capability *needs
    review*
  - a check counts if it is taken on the due day
- **Overdue means not verified.** Past the due date the stage is *review due*,
  and the mastery is *not currently verified*, however small the sd is. In the test, mastery at band 5 is withdrawn
  9 days after its due date while the sd is 0.56.
- **History is kept separately.** Previously demonstrated mastery stays in
  `masteredBefore`, apart from the current `retention` status: first
  demonstrated, last verified, due, interval, and the history of checks.

**One genuine defect fixed, in my own first retention rule.** It judged a check
by the cumulative demonstrated level. That level is dominated by weeks of older
evidence, so the forgetter passed checks after forgetting. A check is now
judged on its session's fresh evidence only: does that evidence favour the
retained level over one band lower? This needed the session bookkeeping to keep
each observation's item parameters (or judged band) and the session-end level.

That, and the repeat routing from the final review (below), are the only
changes in the updater files (`composite.ts`, `updater.ts`). Estimates, update
arithmetic and evidence validation are unchanged, as the untouched E1-3, E1-5
and E1-6 tests confirm.

### Demonstration (step 10), Asha four weeks later

| | Before the check | After the check |
|---|---|---|
| General vocabulary breadth | 5.37 ± 1.00 | 5.45 ± 0.96 |
| Stage | **review due** | **mastered at 3.5** |
| Retention | overdue at band 3.5, due 20 Oct, 22 days late, never verified | current, verified 11 Nov, next due 25 Nov, interval 14 days |
| Next activity | **retention check** on this capability, an item about 63% likely to succeed at the retained level | retention check on the next overdue capability (Locates explicit detail) |

Asha answered correctly, so the check passed and the interval doubled from 7 to
14 days. In the unit test where a check fails, the interval halves and the stage
becomes *needs review*.

## Final review: fresh items, variants and repeats

**Did the architecture already make the distinction? No.** Selection excluded
every item a learner had seen, for every purpose, including retention checks.
A retention check therefore needed a brand-new item each time, and it was
blocked once a capability's items ran out. The ledger would also have treated a
repeated item as fresh evidence, counting the same question twice.

**The smallest change that fixes it.** No item generator and no new items:

- **Item families.** Items and writing tasks take an optional `family`. Items
  that share one are variants of each other. Without a family, an item is its
  own family, so the current bank is unchanged.
- **The ledger decides the exposure, never the client.** When an answer
  arrives, the ledger checks the learner's history:
  - *repeat:* the same item was answered before
  - *variant:* a different item from the same family was answered before
  - *fresh:* neither

  The exposure is stored on the decision, with a reason. It is folded
  deterministically, so a rebuild gives the same flags.
- **A repeat is retention evidence only.** It is added to that session's
  retention record, so it can pass or fail a due check. It never changes the
  estimate, the evidence count, the contexts, the demonstrations or the coupled
  capabilities. A learner who remembers a question cannot inflate an ability
  estimate.
- **A variant is new evidence, flagged.** It updates the estimate like any
  unseen item.
- **Selection keeps fresh and retention items apart:**
  - assessment and learning use only unseen items, as before; an unseen
    variant counts as unseen
  - a retention check prefers an unseen item, then an unseen variant, then a
    **flagged repeat** of an item last seen at least **14 days** earlier
    (`repeatAfterDays`, configurable)
  - the explanation says when a check uses a repeat, and that it will not change
    the estimate

**One known limitation of repeats.** A learner may remember the answer to a
repeated question, so a repeat can overstate retention. The 14-day gap reduces
this, the flag makes it visible, and repeats never touch the estimate. Variants
(E2 content) are the better tool, and the selection already prefers them.

**Effect on the frozen simulation:**

| | Before | After |
|---|---|---|
| Retention checks run | 156, all on unseen items | **195**: 162 unseen, 0 variants (the bank has no families yet), 33 flagged repeats |
| Due checks blocked | 392 | **33** (0 after the merge-condition change below, which altered later trajectories) |
| Overdue at the end with no unused item left | 32 learner-capability pairs | **0** (checked with repeats) |
| M1–M8 | | **identical values**, 5 of 8 pass |

The "before" column uses corrected counting. The earlier report said 45
blocked checks, which was an undercount: when every overdue check was blocked,
the notes were dropped. That reporting bug is fixed, and a test covers it.
The demonstration is unchanged (Asha still had an unseen item).

## Merge condition: failed retention is never read as current proficiency

You approved the merge with one requirement: after a failed retention check,
selection and learner-facing summaries must not mistake historical mastery for
currently verified proficiency, and the estimate and the retention status must
stay explicitly distinguishable. The update mathematics are unchanged.

**Already in place:** a failed check withdraws `mastered`, sets the stage to
*needs review*, and keeps the earlier mastery in `masteredBefore`.

**Gaps found and closed:**

- **One explicit verification field.** Every capability view now carries
  `verification`: its status (*not demonstrated*, *demonstrated*, *verified*,
  *overdue* or *failed*), the level currently supported (always empty when
  overdue or failed), the highest level ever shown (history only), and when it
  was last verified. Consumers read proficiency from here. They do not read it
  from `demonstrated` (cumulative) or from the estimate.
- **Learner-facing summaries.** `summarise()` in `summary.ts` returns three
  separate lines:
  - the status (what is currently true)
  - the estimate, labelled as OpenPath's best guess from all answers, old and
    new
  - the history, labelled "history, not a current result"

  It says *mastered* or *confirmed* only while the status is verified. After a
  failed check it says: "Needs review: the check on … did not confirm your
  earlier level, so it is not currently confirmed." The demonstration now
  shows this line before and after the retention check.
- **Learning selection.** Before this change, learning mode boosted
  *overdue* capabilities but not *failed* ones, and it pitched practice at the
  estimate. That estimate still averages the evidence from before the
  forgetting (the L10 lag). Now:
  - a failed check counts as a retention need
  - practice is pitched at the level the failed check supports
  - the explanation says so and still quotes the estimate separately

  The estimate itself is not changed.

**Effect on the frozen simulation:**

- M1–M8 keep the same pass or miss outcome (5 of 8).
- The only value that changed is M4, at 79% either way (135 → 134 of 170).
- Retention checks that could not run fell from 33 to 0.

## Why M1, M2 and M3 miss (checked, not assumed)

To separate noise from cause, I ran each mode over 10 seeds (the frozen seed
plus 9 others). This is context only; the frozen procedure and pass levels are
unchanged.

| Mode | M1 mean (best) | M2 mean, seeds at ≥ 6 of 7 | M3 mean |
|---|---|---|---|
| Hybrid (the frozen procedure) | 0.61 (0.72) | 4.1, 2 of 10 | 3.9 of 8 |
| Assessment only | 0.64 (0.77) | 5.0, 4 of 10 | 4.1 of 8 |
| Learning only | 0.49 (0.64) | 5.0, 3 of 10 | 3.5 of 8 |

**M2 (weakest strand).** No single cause. Checked learner by learner on the
frozen seed:

- **L10, the forgetter: a biased estimate.** Grammar truly fell from 5 to 3.5,
  and the estimate is 4.43. Retention works: three of the four grammar
  capabilities failed their check and show *needs review*. But the estimate is
  still a long-run average of evidence from before and after the forgetting,
  and time adds little uncertainty. L10 misses in 6–7 of 10 seeds in **every**
  mode, so this is the model, not the bank or the selection. Fixing it would
  change the updater, which I have not done (see decisions).
- **L2: missing evidence.** The foundations strand is one capability with 9
  items, all used. The learner is at 2.0; only one item is that easy. With
  little informative evidence, the estimate stays near the 4.0 start (2.94). This
  is a bank limit.
- **L3: the selection policy.** L3 misses in 7 of 10 seeds under hybrid, but
  in only 3 of 10 in either forced mode. Under hybrid, one sentence capability
  (subordination) is underestimated by 1.4. This is a real, modest cost of the hybrid
  mix.
- **L8: noise.** The true gap is 0.75; the estimated gap is within one sd.

On average the hybrid scheduler costs about 0.9 of a learner on M2 against
either forced mode (4.1 against 5.0). The fall from 6/7 to 3/7 on the frozen
seed is mostly noise on top of that, because the frozen seed was a good one for
the earlier policy. The estimate on the true weakest strand is biased upward by
0.2–0.27 in every mode, because weak learners are pulled toward the 4.0
start.

**M1 (profile after 40 items).** The policy is not the cause: assessment-only
fails on all 10 seeds (best 0.77), and hybrid is close to it, because the first
40 items are mostly assessment anyway. Forty items over 17 capabilities is
about 2.4 answers each, many of them guessable multiple choice. Item format is
a bank property; the 40-item budget is part of the measure.

**M3 (pairs told apart).** Policy is not decisive (3.5–4.1 in every mode). The
main cause is the deliberately conservative strand ranges from R3: M3 fell
from 7 to 4 of 8 when they were introduced, and the pairs missing at strand
level are told apart at capability level.

### What the current item bank prevents us from measuring reliably (B3, deferred to E2)

Reported separately, from the frozen run:

- **Exhaustion.** There are 126 items, and each learner uses 120 activities. By
  the end, about **10.9 of the 17 capabilities** have no unused item left for a
  learner.
- **Retention.** With flagged repeats, no due check is blocked in the frozen
  run (197 checks: 167 unseen items, 30 flagged repeats). Without repeats, 392
  would be blocked. Variants
  (E2) will reduce reliance on repeats.
- **Learning.** In **346 of 371** learning choices (93%), at least one needed
  capability had no unused item at a suitable difficulty. With 6–9 items per
  capability spread over bands 2–7.5, only one or two suit any given level.
- **Ceiling.** The hardest items are around band 7–7.5, so a learner at 7.5
  (L7) is estimated at **6.4** on average.
- **Guessing.** Reading, vocabulary breadth, context, commas and proofreading
  have only four-option items, so each answer carries little information. This
  contributes to M1, M2 and M3, but it is not their only cause (see "Why M1,
  M2 and M3 miss").

All of this is E2's work: about 600 items, typed and short-answer formats for
reading and vocabulary, harder items, and calibrated difficulties.

## Selection change (second review, 12 October)

### What was implemented, as approved

1. **Assessment and learning are separate, explicit modes.** The caller can
   choose the mode. Otherwise the engine assesses while goal-weighted
   uncertainty is above sd 0.9, the same rule as before.
2. **Target-relative need.** Need is P(capability below target) =
   Φ((target − mean) / sd). Targets come from the learner's goal, and the most
   specific one wins. Where none is set, the plan's documented default applies
   (the next band above the learner's current median level) and is named in
   every explanation. The engine never changes a target, and a test checks
   this.
3. **Information relative to current uncertainty.** Information is the share
   of current variance an activity is expected to remove, 1 − var′/var.
4. **A prerequisite-aware fallback.** When a needed capability has no unused
   item at a suitable difficulty (55–85% predicted success, or 70–92% if the
   learner is struggling), the engine tries these in order:
   - a prerequisite, but only one the framework defines, and only if it is
     itself below target (`prerequisite_step`)
   - an easier item for the same capability (`easier_step`)
   - the next capability

   If nothing at all is usable, it assesses instead (`assessment_fallback`)
   rather than stopping. Every gap is reported with the suitable difficulty
   range and the difficulties the bank still has.

The composite updater, evidence validation and conservative strand ranges are
unchanged.

**Two bugs found and fixed while testing:**

- **Learning mode could return no activity.** When every remaining item was
  too hard, learning mode returned nothing, so simulated learners stopped
  early. The `assessment_fallback` path fixes this.
- **Prerequisite items were missed.** They were only searched for among items
  serving the learner's goal. They now come from the whole bank.

### Improvements and regressions under the frozen procedure

- **Improved:**
  - M3 rises from 4 to 5 of 8.
  - M5 improves slightly, from 0.74 to 0.73 (still a miss).
  - The demo choices are now explained by need, target and prerequisites.
- **Regressed:**
  - M1 drops from 0.73 to 0.59.
  - M2 drops from 6 to 4 of 7.
  - M6 drops from passing to failing on both learners.

**Diagnosis, from runs with each mode forced. These are not the frozen
procedure.**

| Mode | M1 | M2 | M3 | M5 (efficiency) | M6 |
|---|---|---|---|---|---|
| Assessment only | 0.72 | 6/7 ✓ | 6/8 | **0.65 ✓** (20.2 vs 31.1 items) | guesser ok, forgetter not |
| Learning only | 0.60 | 7/7 ✓ | 5/8 | n/a | guesser ok, forgetter not |
| Automatic (frozen) | 0.59 | 4/7 | 5/8 | 0.73 | both not ok |

1. **Assessment mode measures well.** It is the best adaptive measurement so
   far: M5 at 0.65 would pass. It is the mode for measuring.
2. **The automatic policy hands over to learning after about 23 items.**
   Learning mode then concentrates on the learner's needs, as specified, so
   broad re-measurement stops. M1 and M2 measure exactly that breadth, so they
   fall. As an exploration only, which I have not adopted, reserving 1 learning
   item in 3 for assessment gave 0.65 / 7 of 7 / 7 of 8 / 0.68 on M1/M2/M3/M5.
   M6 still missed.
3. **Forgetting is not re-checked in any mode.** After L10's grammar drops,
   three grammar capabilities stay *mastered* because nothing re-tests them.
   The retention trigger waits for uncertainty to grow back above 0.75, and
   time adds only about 0.005 variance a day. The approved plan specifies
   checks **due after a time gap**, with the gap doubling after each success.
   That schedule is not yet implemented.

### Remaining blockers at that point (B1 and B2 since resolved; see above)

- **B1 · Automatic mode policy.** When should the engine assess and when
  should it teach? Options:
  - (a) keep the current rule
  - (b) reserve a share of learning items for assessment
  - (c) assess at the start of every session until uncertainty on the goal is
    low

  This is a product decision, because it trades practice time for measurement.
- **B2 · Retention checks by due date,** as the approved plan specifies, so
  forgetting is detected (M6). Recommended before merge, because this is a
  correctness gap against the plan.
- **B3 · Item bank (E2).** It caps M1 and M3 in every mode, and is the cause
  of the learning-mode gaps the engine now reports.

## Changes from the approved plan (all small)

- **Evaluator qualification.** A lean smaller than 2 standard errors no longer
  fails qualification. With 12 anchors per capability, an unbiased evaluator
  otherwise failed by chance about half the time. The 0.3 limit itself is
  unchanged.
- **Simulation measures.** M1, M2 and M5 apply the plan's wording with three
  adjustments, recorded *before* the run:
  - rank correlation is undefined for flat profiles
  - only 7 learners have a unique weakest strand
  - a mean sd of 0.6 is not reachable with 8 items per capability, so the
    threshold is 0.8
- **Writing capabilities.** Each has 5–6 code-scored items, such as choosing
  the reply that answers the task, or proofreading. These are in addition to
  the 3 writing tasks, so each has at least 6 items as E1-1 requires.

## Not in E1 (as planned)

- real LLM calls (E3, needing D-2 and D-3)
- browser storage and any learner-facing UI (E5)
- listening and speaking content
- expert review of content (D-4)
- server changes

The Django backend, the children's game and PRs #2 and #3 are untouched.

## Review of 12 October (R1–R6)

### R1 · What a capability score means

A score is a position on one latent scale, from 1 to 8, shared by every
capability. It is **not** a percentage, a grade, an age or a judgement of the
learner. It is defined by what it predicts. For a typed item of difficulty `b`,
answered on the first try without help:

```
P(right) = 1 / (1 + e^(−1.3 × (score − b)))
```

**Verb example: subject–verb agreement at 4.5.** A learner at 4.5 is expected
to get each of these right:

| Item | Difficulty | Expected to get it right |
|---|---|---|
| "The children ___ in the garden" (are) | 3.0 | 88% of the time |
| "The box of pencils ___ on the table" (is), with a phrase between subject and verb | 4.5 | 50% |
| "Each of the students ___ a library card" (has) | 6.0 | 12% |

So each band above an item's difficulty multiplies the odds of success by about
3.7. Multiple-choice items add a guessing floor (25% with four options).

**Two caveats:**

- **Difficulties are expert guesses for now.** Until they are calibrated from
  real responses, differences between scores mean more than their absolute
  position.
- **A score always comes with its uncertainty.** "4.5" alone means little;
  "4.5 ± 0.4" is the claim.

### R2 · One observation, exactly (engine output, checked by hand)

This is Asha's first subject–verb agreement item in the demonstration: *"Write
is or are: The box of pencils ___ on the table."* The item is typed, with
difficulty b = 4.5, discrimination a = 1.3 and no guessing (c = 0). Her answer
is wrong.

| Step | Calculation | Value |
|---|---|---|
| Before | starting estimate | mean 4.00, sd 1.50 (variance 2.25) |
| Expected chance of success | 1 / (1 + e^(−1.3 × (4.00 − 4.5))) | **0.343** |
| Information in the answer | 1.3² × 0.343 × 0.657 | 0.381 |
| New variance | 1 / (1/2.25 + 0.381) | 1.212 → **sd 1.10** |
| Pull of a wrong answer | −1.3 × 0.343 | −0.446 |
| New mean | 4.00 + 1.212 × (−0.446) | **3.46** |
| Coupled capability (*grammatical accuracy in writing*, coupling 0.4) | shift 0.4 × (3.46 − 4.00) = −0.216; variance × (1 − 0.4² × 0.461) | 4.45 ± 1.43 → 4.23 ± 1.38, marked *inferred* |

**What this does and doesn't change:**

- The 80% range for subject–verb agreement is now 2.05–4.87.
- The stage stays *unassessed*, because a stage needs at least 2 direct
  observations.
- The coupled change can never count towards *demonstrated* or *mastered*.

The test suite reproduces these numbers (E1-3), and the engine's output matches
this hand calculation to 4 decimals.

### R3 · Strand-level uncertainty: corrected and labelled

- **The problem, measured.** Over 3 seeds and 70 strand estimates each, the old
  independence formula's "80%" ranges contained the true value only
  **57–67%** of the time. Capability-level ranges were roughly honest at
  72–81%.
- **The cause.** Errors within a strand point the same way. They share the
  pull of the 4.0 starting value, and coupled updates move related
  capabilities together.
- **The fix.** A strand's range is now the weighted mean of its capabilities'
  sds: the conservative bound that assumes the errors are fully correlated. It
  contained the truth **77–90%** of the time.
- **The label.** Aggregates carry `calibrated: false`, and the demo, report
  and design doc call them *summary ranges, not calibrated measurements*. Only
  capability-level estimates are measurements.
- **The guard.** A new test fails if strand coverage drops below 75%.
- **Consequences, reported as they are:**
  - M3 falls from 7 of 8 to 4 of 8, because the wider ranges make the
    strand-level pairs miss narrowly. The pass level stays "all".
  - The E1-13 test no longer relies on strand ranges. It now checks
    capability level. After 40 items, L3 and L4 are told apart on
    subject–verb agreement (4.88 vs 2.80), task response and paragraphing,
    each in the direction their hidden profiles predict.

### R4 · Why Asha got spelling and Ben got vocabulary

These scores were recomputed at the exact state of demo step 7.

- **Asha (practice mode).** Spelling scored 2.521; the best run-on item scored
  2.517, a margin of **0.004**.
  - Her run-ons estimate is *weak but already precise* (3.51 ± 0.50, after the
    email evaluation), so an extra item tells us little: information 0.006
    against 0.072 for spelling.
  - The run-on items left in the bank predict at most 44% success (the next
    one is difficulty 4.5, against her 3.51), so they score poorly on stretch
    level (0.63 against 0.98).
  - The comma-splice bonus (+0.57) nearly closes the gap, but not quite.
- **Ben (still in diagnostic mode).** Vocabulary scored 1.534, against 1.446
  for his best articles item. Articles is his weakest capability, at
  2.86 ± 0.90. The information values for the two are close (0.18 against
  0.16), so the stretch-level term decides again.

**Is selection prioritising uncertainty appropriately? Partly, and not well
enough.** It correctly avoids re-measuring what is already precise. But three
things are wrong:

1. **No term for weakness.** Nothing in practice mode says "this is the
   learner's weakest area". Under the "overall" goal every capability weighs
   the same, so weakness only enters through the misconception bonus.
2. **Information is too small to decide.** It is an absolute reduction in
   variance (0.00–0.20), so in practice mode the stretch-level term, which
   targets 70% predicted success, dominates.
3. **Information depends on item format.** Guessable multiple-choice items
   carry much less information than typed items, so the bank's mix of formats
   steers selection.

**Proposed fix, not implemented, awaiting your approval:**

- **A need term:** the probability that a capability is below the learner's
  target band, so a weak, precise capability like Asha's run-ons gets
  practice.
- **Information as a share of current uncertainty**, with capability chosen
  first in diagnostic mode.
- **A "supported step" rule:** when no item sits near 70% success for a needed
  capability, prefer the nearest easier item and flag the gap in the bank.

This changes engine behaviour and the simulation results. So it should either
be approved as a pre-merge change to E1, then re-run against the same frozen
measures, or be scheduled into E4 ("Selection depth") as planned.

### R5 · Acceptance tests and simulation measures are separate

| | Status |
|---|---|
| **Acceptance tests** (whether E1 does what was specified) | 32 of 32 automated tests pass, including the 2 added in this review. E1-12 waits for your review |
| **Simulation measures** (how well the engine performs, against frozen pass levels) | 5 of 8 pass. **M1, M3 and M5 miss** (0.73 against 0.8; 4 of 8 against all; 0.74 against 0.7) |

None of the misses counts as passing. No pass level has been or will be
loosened to change that. The E1-13 test changed level (from strand to
capability, R3) because the old version depended on the too-narrow ranges,
not to make it easier to pass.

### R6 · The LLM adapter's inputs and outputs

In the approved plan, the real LLM adapter is milestone **E3**. E2 is framework
depth and content. Its contract is already fixed in code and enforced:

- **It receives the reference standards:** band descriptors, rubric criteria
  and the capability's misconception list.
- **It receives the learner's actual answer,** with identifiers removed.
- **It receives the existing composite values:** mean, sd and active
  misconceptions for each target capability.
- **It receives trusted anchors only.** This was tightened in this review. By
  default a request carries only educator-scored anchors, and an evaluator
  qualified only against OpenPath's candidate anchors is **held**, not
  applied. That holds unless development mode is switched on explicitly, as it
  is for the simulator, demo and tests. A new test covers this. Real
  deployment therefore fails closed until D-4 provides scored anchors.
- **It returns only proposed observations:**
  - a band, confidence, criteria, quotes, listed misconception tags and a
    rationale
  - any extra field, such as an estimate or a stage, is rejected outright
  - every quote must appear in the learner's text
  - eleven checks run before the composite changes

## Decisions needed before E2

- **B1 and B2** are done (see "Hybrid scheduling and retention").
- **Future investigation: time-sensitive capability estimates (L10).**
  Recorded, not scheduled. Retention correctly flags forgetting, but the
  estimate keeps averaging older evidence, and time adds little uncertainty.
  The update mathematics stay as they are. Options such as widening
  uncertainty after a failed check, or weighting evidence by age, are to be
  studied with real learner data. They will not be tuned to improve synthetic
  simulation scores. Until then, a failed check is handled through
  verification status and selection (see "Merge condition").
- **Assessment probe.** It stays configurable (`HYBRID.probeEvery`, currently
  3; 0 turns it off). It costs about one learner on M2 (10-seed average).
  Revisit it with E2's larger bank.

- **D-4.** An English educator (ideally two) to review the framework and items,
  and to score anchor responses so they become *trusted*. Today all 12 anchors
  are OpenPath's candidates.
- **Approval to merge E1** after your review (E1-12), and approval of E2's scope.
