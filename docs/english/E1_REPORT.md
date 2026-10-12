# E1 report: walking skeleton

*12 October 2026 · branch `feature/english-e1` · not merged; awaiting your review.*

## Summary

All six core parts now work end to end, through one shared TypeScript core, on
the 17 skeleton capabilities of a framework that holds the full 121-capability
hierarchy.

- **Acceptance tests.** All 32 automated tests pass, covering E1-1 to E1-13
  except E1-11 (checked by CI) and E1-12 (your review). That count includes 2
  tests added after your review.
- **The demonstration** shows two learners getting different composites and
  different next activities. An invented evaluator quote is rejected, state
  survives a restart from local files, and an evaluation can be undone
  exactly.
- **The ten-learner simulation** passes **5 of 8** frozen measures. The 3
  misses are reported below with their cause. Nothing was re-tuned to pass.
  The simulation measures are separate from the acceptance tests:
  acceptance test E1-9 checks that the simulation reports honestly, not that
  every measure passes.

No architectural blocker was found. No LLM is called, nothing was bought, and
existing code is untouched apart from one new CI job.

## What was built, against the six priorities

| Priority | E1 deliverable |
|---|---|
| 1 · Capability framework | `content/english/framework/en-0.1.0.json`: 8 strands, 44 sub-strands, 121 capabilities. 17 are fully specified (band descriptors, misconception lists, couplings) and 56 are marked for the core V1 set. It is validated, and version 0.1.0 is frozen by fingerprint |
| 2 · Numerical composite | One estimate (mean and sd) for **every** capability in the hierarchy, kept twice. *Direct* comes only from the capability's own evidence and drives the stages. *Combined* adds capped, flagged effects from coupled capabilities and drives selection. It also holds contexts, misconceptions with fading strength, the evidence trail, mastery over time, and computed sub-strand and strand values |
| 3 · LLM-assisted evaluation | `EvaluationRequest` carries the reference standards (band descriptors and rubric), up to 3 anchors near the learner's level, the learner's text with identifiers removed, and current estimates. There is a strict proposal schema, a versioned prompt (`content/english/prompts/evaluate.v1.md`), the `mock` and `replay` adapters, and anchor qualification for every evaluator |
| 4 · Controlled updater, local-first | An append-only ledger becomes the composite and decision log through a deterministic fold. Eleven checks run on every proposal. Revoking a decision is exact. A `LearnerStore` interface has memory and local-file stores, and the browser store comes in E5 |
| 5 · Adaptive selection | Goal-weighted scoring over information, fit, retention, misconceptions, struggling and variety. It has a diagnostic and a practice mode, and every choice is stored with a plain-language reason |
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
| E1-8 | Selection is repeatable, and every recommendation is explained | Pass |
| E1-9 | The ten-learner simulation reports every measure honestly against frozen levels | Pass. The measures themselves are reported separately below, and 3 of 8 miss |
| E1-10 | Local-first: no network use, restart from files gives identical state | Pass |
| E1-11 | Nothing else breaks | Existing suites unchanged and green locally: 49 engine tests and 19 app tests. CI runs all jobs |
| E1-12 | You review the demonstration and report | **Waiting for you** |
| E1-13 | Two learners with different capabilities get different composites and different next activities | Pass. Compared at capability level after your review (see R3) |

## The demonstration (`node tools/english/demo.ts`)

The demonstration uses two invented learners, each answering 40 items over two
days:

- **Asha** reads well but writes in run-on sentences.
- **Ben** has a rich vocabulary but weak grammar.

Both start at 4.00 ± 1.50 on all 121 capabilities. After the 40 items:

| Strand | Asha | Ben |
|---|---|---|
| Foundations | 4.53 ± 0.85 | 5.79 ± 0.84 |
| Vocabulary | 4.87 ± 0.91 | 5.64 ± 0.95 |
| Grammar | 4.28 ± 0.92 | **3.51 ± 0.93** |
| Sentences | **3.90 ± 1.04** | 5.38 ± 0.97 |
| Reading | 5.51 ± 1.08 | 5.43 ± 1.08 |
| Writing | 4.78 ± 1.04 | 4.90 ± 1.04 |

Strand ± values are conservative summary ranges, not calibrated measurements
(see R3).

**Asha's email is evaluated**, using an illustrative recorded proposal written
by OpenPath, not an LLM. The updater:

- **Accepted** run-ons at band 3.5 (3.56 ± 1.07 → 3.51 ± 0.47) and recorded the
  *comma splice* and *fused sentence* misconceptions.
- **Accepted** task response and grammar.
- **Accepted and capped** spelling (check 10, ±0.75).
- **Rejected** the paragraphing judgement: *"check 4: quote not found in the
  learner's response: 'In conclusion, I hope you will agree with my
  request'"*.
- Applied coupled effects as *inferred* changes only. These never count
  towards a stage.

**Next activities differ:**

- **Asha:** inflected spelling practice (68% likely to succeed).
- **Ben:** a vocabulary item, because his vocabulary estimate is still the most
  uncertain.

**Restart and undo:**

- Reopening from local files rebuilds an identical state.
- Revoking the evaluation's 4 accepted decisions returns the composite exactly
  to its state before the evaluation. The evidence stays in the log.

## Simulation results (`node tools/english/sim/main.ts`)

The pass levels were committed in `tools/english/sim/criteria.ts` *before* the
first run, in commit "freeze simulation pass levels".

| | Measure | Result | Pass level |
|---|---|---|---|
| ✗ | M1 Profile recovery after 40 items | mean ρ = 0.73 | ≥ 0.8 |
| ✓ | M2 Weakest strand named | 6 of 7 | ≥ 6 of 7 |
| ✗ | M3 Pairs told apart | 4 of 8 (7 of 8 before the strand-range correction) | all |
| ✓ | M4 Honest uncertainty (80% ranges) | 78% | 70–90% |
| ✗ | M5 Efficiency vs random | ratio 0.74 (23.1 vs 31.1 items) | ≤ 0.7 |
| ✓ | M6 Guesser and forgetter | both ok | both ok |
| ✓ | M7 Faulty evaluator output applied | 0 of 273 | 0 |
| ✓ | M8 Deterministic | identical | identical |

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

- **D-4.** An English educator (ideally two) to review the framework and items,
  and to score anchor responses so they become *trusted*. Today all 12 anchors
  are OpenPath's candidates.
- **R4:** approve the selection fix as a pre-merge change to E1, or schedule it for E4.
- **Approval to merge E1** after your review (E1-12), and approval of E2's scope.
