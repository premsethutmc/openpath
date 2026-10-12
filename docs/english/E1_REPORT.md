# E1 report: walking skeleton

*12 October 2026 · branch `feature/english-e1` · not merged; awaiting your review.*

## Summary

All six core parts now work end to end, through one shared TypeScript core, on
the 17 skeleton capabilities of a framework that holds the full 121-capability
hierarchy.

- **Acceptance tests.** All 30 automated tests pass, covering E1-1 to E1-13
  except E1-11 (checked by CI) and E1-12 (your review).
- **The demonstration** shows two learners getting different composites and
  different next activities. An invented evaluator quote is rejected, state
  survives a restart from local files, and an evaluation can be undone
  exactly.
- **The ten-learner simulation** passes **5 of 8** frozen measures. The 3
  misses are reported below with their cause. Nothing was re-tuned to pass.

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
| E1-9 | The ten-learner simulation reports every measure honestly against frozen levels | Pass as a report: 5 of 8 measures pass (see below) |
| E1-10 | Local-first: no network use, restart from files gives identical state | Pass |
| E1-11 | Nothing else breaks | Existing suites unchanged and green locally: 49 engine tests and 19 app tests. CI runs all jobs |
| E1-12 | You review the demonstration and report | **Waiting for you** |
| E1-13 | Two learners with different capabilities get different composites and different next activities | Pass (simulation L3 vs L4, and demo Asha vs Ben) |

## The demonstration (`node tools/english/demo.ts`)

The demonstration uses two invented learners, each answering 40 items over two
days:

- **Asha** reads well but writes in run-on sentences.
- **Ben** has a rich vocabulary but weak grammar.

Both start at 4.00 ± 1.50 on all 121 capabilities. After the 40 items:

| Strand | Asha | Ben |
|---|---|---|
| Foundations | 4.53 ± 0.85 | 5.79 ± 0.84 |
| Vocabulary | 4.87 ± 0.53 | 5.64 ± 0.55 |
| Grammar | 4.28 ± 0.46 | **3.51 ± 0.47** |
| Sentences | **3.90 ± 0.73** | 5.38 ± 0.69 |
| Reading | 5.51 ± 0.62 | 5.43 ± 0.63 |
| Writing | 4.78 ± 0.52 | 4.90 ± 0.52 |

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
| ✗ | M3 Pairs told apart | 7 of 8 | all |
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
- **M3.** The single miss is L6 vs L1 on *infers motives*. The estimates are
  accurate (3.22 vs true 3; 4.94 vs true 5), but 6 multiple-choice reading
  items leave each sd near 1.0, so the gap is not wider than both
  uncertainties.
- **M5.** This is a near miss: adaptive selection needs 26% fewer items than
  random, against a target of 30%. With only 8 items per grammar capability
  there is little room for adaptive choice.

**Proposed fixes, all within E2's planned scope:**

- grow the bank to about 600 items, with typed and short-answer formats for
  reading and vocabulary
- more items at the ends of the scale
- calibrate item difficulty from real responses
- re-run the same frozen measures

**Two engine findings to address in E2:**

1. **Ceiling effect.** A learner at 7.5 who gets everything right is estimated
   at about 6.4 (L7), because the bank tops out around 7.5. More hard items
   fix this.
2. **Strand uncertainty is optimistic.** It assumes the errors on different
   capabilities are independent. When they share a cause, such as the ceiling,
   strand sds are too small. E2 should add a correlation term before strand
   values are shown to learners or guardians.

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

## Decisions needed before E2

- **D-4.** An English educator (ideally two) to review the framework and items,
  and to score anchor responses so they become *trusted*. Today all 12 anchors
  are OpenPath's candidates.
- **Approval to merge E1** after your review (E1-12), and approval of E2's scope.
