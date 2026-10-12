# Adaptive activity selection and the ten-learner simulation

*Everything here is **Recommended**.*

## 1. Goals become weights

A goal says which capabilities matter, and how much, to *this* learner. The
learner or guardian chooses goals; the system never infers them.

| Goal (as the learner sees it) | What it weights |
|---|---|
| "Get better at English overall" (default) | All assessed strands equally |
| "Write better essays and answers for exams" | Writing (task, organisation, genres), sentence construction, accuracy in writing |
| "Read harder books with confidence" | Reading inference, craft and range, vocabulary breadth and context |
| "Fix my grammar mistakes" | Grammar, accuracy in writing, active misconceptions |
| "Speak confidently" *(when speaking exists)* | Speaking and listening |

- **Weights are framework data, readable in the report.**
- **A goal can also name a target band** (for example, "writing at band 6").
  Otherwise the target is "the next band up".

## 2. How the next activity is chosen

> **Updated 12 October (E1 review).** Selection now has two explicit modes:
>
> - **Assessment** prefers the largest *share* of current uncertainty removed,
>   on capabilities whose position against the target is unsettled.
> - **Learning** prefers *target-relative need*, P(below target), adjusted for
>   framework prerequisites, misconceptions, retention and uncertainty, at a
>   suitable difficulty.
>
> When no suitable item exists, learning mode takes a prerequisite step, then
> an easier step, and reports item-bank gaps. Targets are the learner's own, or
> the documented default below, which is always named. The description below
> is the original design and is kept for the record. The implemented rules are
> in `packages/english-core/src/selection.ts` and `docs/english/E1_REPORT.md`.

**Candidates.** Any item or activity whose targets include a weighted
capability, and whose difficulty is within reach. An *activity* can be one item
or a set: for example, a reading passage with six questions, or a writing task.

**Each candidate gets a score.** Its parts are visible and its weights are
tunable:

| Part | Question it answers | Strongest when |
|---|---|---|
| **Information** | How much would this reduce uncertainty where it matters? | The capability is uncertain *and* goal-weighted |
| **Learning fit** | Is it the right difficulty to learn from? | Predicted success is about 70%: hard enough to stretch, easy enough to succeed |
| **Goal weight** | Does it serve what the learner chose? | It targets goal capabilities |
| **Retention due** | Has certainty faded on something once demonstrated? | The sd has grown back over its threshold since the last direct evidence |
| **Misconception** | Does it target an active misconception? | A misconception tag is strong |
| **Struggling relief** | Should we step down? | The capability is marked *struggling*: prefer easier items with support |
| **Variety and fatigue** | Avoids the same format, topic or capability over and over, and anything seen recently | — |

**There are two modes,** chosen automatically:

- **Diagnostic,** at the start or when uncertainty is high. Information
  dominates, so the engine samples widely across strands to locate the
  learner quickly. It starts at the foundations only if early answers suggest
  a gap.
- **Practice.** Learning fit, goals, retention and misconceptions dominate.

**Every recommendation is stored with its reason.** For example: *"Next:
sentence-joining practice (band 3.5–4.5). Your recent writing showed comma
splices, avoiding run-ons is at 3.96 ± 0.61, and 'write better essays' is your
goal."* The alternatives considered are stored too.

**Prerequisites guide selection only.** A capability whose prerequisites look
weak gets a lower learning-fit score, and the prerequisite gets a higher one.
The engine never blocks anything outright.

**Determinism.** Given the same composite, goals, item bank and random seed,
the engine always makes the same choice. That is what makes it testable and
lets the simulation be reproduced.

## 3. The ten-learner simulation

**Agreed:** ten simulated learners, to test whether the engine can tell
different English strengths and weaknesses apart. It tests the **engine**,
not learning (A-27).

### 3.1 The ten learners

Each has a hidden "true" level per capability in the walking-skeleton slice,
set by hand. The engine never sees these.

| # | Profile | What the engine should find |
|---|---|---|
| L1 | **Balanced, typical**: everything around 5 | A flat profile near 5 |
| L2 | **Foundational gap**: spelling and word-level skills about 2, others about 3.5 | The foundations as the main weakness, found early |
| L3 | **Strong reader, weak writer**: reading and vocabulary about 6.5, writing about 3.5 | Reading high, writing low, with a clear gap |
| L4 | **Rich vocabulary, weak grammar accuracy**: vocabulary about 6.5, grammar about 3.5 | Vocabulary above grammar |
| L5 | **Accurate grammar, narrow vocabulary**: grammar about 6, vocabulary about 3.5 | The mirror image of L4 |
| L6 | **Literal-only reader**: literal reading about 6, inference and main idea about 3 | A split *inside* reading |
| L7 | **Advanced throughout**: about 7.5 | High everywhere, reached quickly without wasting items on easy work |
| L8 | **Run-on writer**: sentence boundaries about 3 with a comma-splice habit, others about 5 | One narrow weakness, plus the misconception |
| L9 | **Inconsistent guesser**: true level about 4, but guesses 30% of the time | A wider uncertainty, *not* a false profile |
| L10 | **Forgetter**: reaches about 5 on grammar, then drops back to 3.5 after a gap | Retention checks that catch the drop: *needs review*, not *mastered* |

### 3.2 How a simulated learner answers

- **Code-scored items.** The chance of a right answer comes from the same
  response model, using the *true* level, with guessing and slips.
- **Written tasks.** The `mock` evaluator reports the true level plus noise
  (sd 0.7). It can also be set up with **bias** (for example, rewarding
  length) and with **faults**:
  - invented quotes
  - out-of-range bands
  - tags that do not exist
  - drift
- **Proving the updater.** The fault runs prove the updater rejects or holds
  what it should (`EVALUATION_AND_UPDATES.md` §5).
- **Optional real-LLM run.** Real models evaluate about 30 pre-written
  responses. This needs cost approval (D-2) and is not part of E1.

### 3.3 What is measured

The proposed pass levels are tuned only *before* the first full run and then
frozen, so they are not adjusted to fit the results.

| Measure | Question | Proposed pass level |
|---|---|---|
| **Profile recovery** | Does the estimated shape across strands match the true shape? | Average rank correlation ≥ 0.8 across L1–L8, after about 40 items (about two sessions) |
| **Strength and weakness** | Is the weakest strand correctly named? | At least 8 of the 10 learners |
| **Separation** | Can the engine tell L3 from L4, L4 from L5, and L6 from L1 *by their composites*? | Every pair separated on its distinguishing strand by more than both learners' uncertainty |
| **Honest uncertainty** | Do the 80% ranges contain the true value about 80% of the time? | Coverage between 70% and 90% |
| **Efficiency** | Does adaptive selection reach precision faster than a fixed test? | It reaches sd ≤ 0.6 on goal capabilities with at most 70% of the items a random or fixed sequence needs |
| **Robustness** | Does a guesser (L9) avoid a false profile? Does the forgetter (L10) avoid staying *mastered*? | Yes to both |
| **Safety of updates** | Are injected faulty proposals handled? | 100% rejected or held. None applied |
| **Determinism** | Do two runs with the same seed give identical results? | Identical |

### 3.4 What the simulation cannot show

The simulated learners answer according to *our own* response model. So
success shows the engine is **internally consistent and able to distinguish
profiles under its own assumptions**. It does not show:

- that real learners behave this way
- that the item difficulties are right
- that anyone's English improves

The report says this on its first page. Real validation needs real learners,
with consent, and a plan agreed with you (earlier decision O-13).
