# E2 proposed scope: framework depth and an item bank for long-term use

*12 October 2026 · proposal for approval · nothing is implemented until you approve it.*

## Purpose

E1 showed that the engine works, and that the small E1 item bank limits what
it can measure. E2 deepens the English content so the engine can assess
learners across the full range, in varied formats, and keep checking retention
for months without needing an endless supply of new questions.

E2 changes **content and content tooling**. It does not change:

- the composite update mathematics
- the eleven updater checks
- the hybrid scheduler; the assessment probe stays configurable, at every
  third activity

There is no LLM integration (E3), no app (E5), and no paid service.

## What E1 left for E2

| E1 finding | E2 response |
|---|---|
| L2: too few easy items, so the estimate stays near the 4.0 start | Items down to band 1.5 for every capability |
| L7: the bank tops out near 7.5, so a 7.5 learner is estimated at 6.4 | Items up to band 8 |
| Reading, vocabulary and commas are four-option multiple choice only, so each answer says little | At least one non-guessable format for every capability |
| Retention needed a new item for every check | Item families with variants, so checks mostly use unseen items or variants; flagged repeats are the fallback |
| 120 of 126 items used per learner | About 780 items over 56 capabilities |

Not addressed in E2: the L10 estimate lag. It is recorded as a future
investigation into time-sensitive estimates, to be studied with real learner
data.

## Deliverables

### 1. Framework 0.2.0: 56 capabilities specified

- **The 39 core capabilities are specified**, alongside the 17 already done.
  Each gets:
  - band descriptors for bands 1–8
  - a misconception list
  - couplings
  - prerequisites, only where a reference standard supports them; none are
    invented
- **Standards are mapped for reference only:** CEFR and CBSE/NCERT, following
  the D-4 recommendation.
- **Version 0.1.0 stays frozen and loadable.** A learner's state from 0.1.0
  carries over unchanged: the same values, retention and verification history
  for the 17 capabilities, and the starting value for the new ones.
- Listening and speaking (13 planned capabilities) stay out, as decided under
  D-7.

### 2. Response formats that code can score, with no LLM

Every format scores to right or wrong, plus misconception tags, so the update
mathematics are untouched. Each format sets its own guessing floor.

| Format | Example | Guessing floor |
|---|---|---|
| Short typed answer (exists for cloze; extended to reading and vocabulary) | "What did Meena use to fix the kite?" (accepted: tape / sticky tape / the tape) | 0 |
| Sentence correction | "Rewrite the wrong word: *She don't like mangoes.*" | 0 |
| Spot the error | Tap the word that is wrong | 1 ÷ number of words |
| Ordering | Put four sentences or story events in order | 1 ÷ 24 |
| Matching | Match four words to four meanings | 1 ÷ 24 |
| Choose all that apply | Which two sentences are correct? | 1 ÷ number of combinations |
| Multiple choice (existing) | Four options | 1 ÷ 4 |

There is no partial credit in E2, because it would need a different update
model. Each scorer gets its own tests: accepted answers, normalisation,
misconception tagging, and deterministic results.

### 3. The item bank (about 780 items, recommended)

- **Size.** About 14 items per capability (56 × 14).
- **Families.** Each family holds 2–3 hand-written variants that test the
  same thing at about the same difficulty, with different surface content.
- **Coverage gates, checked automatically for every specified capability:**
  - at least 12 items in at least 4 families
  - items from band 1.5 (or the capability's lowest descriptor) to band 8,
    with no gap wider than 0.75 band
  - at least 2 formats, at least one of them not guessable
- **Reading.** About 20 original passages (stories and information texts,
  graded by band), with question families spread across bands.
- **Metadata on every item:**
  - its family
  - its difficulty, as an expert estimate with a one-line rationale
  - its misconception tags, taken from the capability's own list
  - its provenance (original, and its author)
  - an age-suitability check
  - its status: *candidate* until an educator reviews it

  No passage is copied from elsewhere.
- **Calibration.** Difficulties stay expert estimates. Real calibration needs
  real responses, so it comes after E6. Each item records the source of its
  difficulty.

### 4. Writing

- 8 writing tasks, each with a rubric and at least 3 candidate anchor
  responses. The anchors stay *candidate* until educators score them (D-4).
- Evaluation still uses the mock and replay adapters only.

### 5. Tools and reports

- **A content checker** for schema, answer keys, tags, family consistency,
  provenance and a simple readability check. It runs in CI.
- **A bank coverage report** (HTML). For each capability it shows items by
  band and format, the guessable share, families, and the *retention runway*:
  how many retention checks a learner at each level can take on unseen items
  or variants before a flagged repeat is needed.
- **A reviewer report for educators** (printable): the framework, with sample
  items for each band.

## How E2 is delivered: two PRs, each leaving working, tested software

- **E2a: framework, formats and tools, and depth for the 17 skeleton
  capabilities.**
  - Framework 0.2.0 and the 0.1.0 → 0.2.0 state carry-over test.
  - The new formats and their scorers.
  - The content checker and the coverage report.
  - The 17 skeleton capabilities deepened to the coverage gates (about 240
    items).
  - The frozen E1 simulation re-run on this bank, with unchanged thresholds,
    reporting improvements and regressions. E2a goes first so you can see
    whether the bank removes the E1 limits before the bulk of the content is
    written.
- **E2b: content for the 39 core capabilities.**
  - About 540 items, the passages, the 8 writing tasks with candidate anchors,
    and the reviewer report.

**Size:** L in total; each PR is about one to two weeks of work.

## Acceptance tests

| # | Test |
|---|---|
| E2-1 | Framework 0.2.0 is valid: 56 capabilities specified, with complete band descriptors and misconception lists, and only prerequisites that cite a source. 0.1.0 is unchanged and still loads |
| E2-2 | A learner's state carries from 0.1.0 to 0.2.0 unchanged: the 17 capabilities keep the same estimates, evidence, retention and verification; the new capabilities start at the starting value |
| E2-3 | Every new format scores deterministically, with tests for accepted answers, normalisation, misconception tags and the guessing floor |
| E2-4 | The coverage gates pass for all 56 capabilities: item count, families, band range with no gap wider than 0.75, and formats including a non-guessable one |
| E2-5 | **Retention runway:** a deterministic sweep, for a learner at each level from 2 to 7.5, on every capability. After typical assessment and learning use, the first 4 retention checks (days 7, 21, 49 and 105 after first demonstration) use unseen items or variants. Any later check that needs a repeat uses a flagged repeat at least 14 days after the item was last seen |
| E2-6 | The content checker passes on all content, and CI rejects content that fails it |
| E2-7 | Eight writing tasks have rubrics and at least 3 candidate anchors each, clearly marked as candidates |
| E2-8 | The frozen E1 simulation is re-run on the E2a bank, with the same procedure and thresholds, reporting before and after for every measure, including regressions |
| E2-9 | The coverage report and the reviewer report are generated |
| E2-10 | Every existing test and CI job still passes, with no LLM calls, no paid services and no deletions |

## Not in E2

- LLM evaluation (E3).
- Selection changes (E4), including a limit on questions per passage. Items
  that share a passage are not fully independent; this is a known
  simplification, and E4 will address it.
- Simulation v2 on all 56 capabilities (E4).
- Partial credit, an automatic item generator, listening and speaking, the
  app, and real learners.

## Decisions for you

| # | Decision | My recommendation |
|---|---|---|
| E2-A | **Educator review (D-4).** No English educator is available yet | Start E2 anyway. All content I write is marked *candidate*, and nothing becomes trusted until an educator reviews it. The reviewer report is built to make that review quick |
| E2-B | **Bank size.** The plan said about 600 | **About 780** (14 per capability), so that the band range, formats and retention runway can all be met. At 600 the retention runway is thinner and more checks fall back to repeats |
| E2-C | **How variants are made** | Hand-written. No generator in E2. Revisit when there is real data on which variants behave alike |
| E2-D | **Reference standards** | CEFR and CBSE/NCERT, for reference only; OpenPath's own band descriptors remain the definitions |
| E2-E | **Delivery** | Two PRs (E2a, then E2b), with the frozen simulation re-run after E2a |
