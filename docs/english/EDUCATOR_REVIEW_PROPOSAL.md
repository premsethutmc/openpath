# Educator review proposal: trusted anchors for evaluation

*12 October 2026 · **planning document only** (E3a review, 12 October). The full programme
below (928 answers) is **not commissioned**, and no educator is to be approached. A small exploratory
pilot is designed at the end. It too waits for approval, and it is not enough to qualify an
evaluator.*

## Why this is needed

- Every anchor in OpenPath today is a candidate written by OpenPath (`trusted: false`). The updater
  refuses evaluators qualified only on candidates, except in development and simulation (check 7).
- Code can check that an evaluator's judgement is well formed, quoted and self-consistent. It cannot
  check that the judgement is right ([`E3A_VALIDATION_LIMITS.md`](E3A_VALIDATION_LIMITS.md)).
- Only responses scored by qualified people can do that, and they are needed **before** any real
  evaluator is qualified (E3b).
- **The present anchor sets are too small to qualify anyone.** In the E3a harness, a mock evaluator
  with a true error of 0.5 band fails qualification by chance, because one capability has only 6
  anchors. Measuring an evaluator's noise and bias per capability to within about ±0.2 band needs
  about 20 scored responses per capability.

## What is needed

### 1. Sample answers (written by educators, so no children's data is used)

| Set | Extended writing (8 tasks) | Short answers (40 items) | Used for |
|---|---|---|---|
| Prompt anchors | 6 per task, spread across bands 2–8 | 2 per item (one meeting the key points, one not) | Shown to evaluators as examples |
| Qualification anchors | 20 per task | 10 per item | Measuring each evaluator's noise, bias and key-point agreement. **Never shown to it** |
| Drift anchors | 10 per task | 4 per item | Hidden among live requests (one in 20). **Never shown** |
| **Total responses** | **288** | **640** | |

**Requirements for the responses:**

- Spread evenly across bands 2–8.
- Include the typical errors in each capability's misconception list.
- Include some responses that are good on one capability and weak on another, so evaluators cannot
  score by overall impression.
- Written in the voice of learners aged 10–15, original, and free of any real names or places that
  identify a person.
- Writers and scorers are **different** people for any one response, so a scorer is not judging
  their own intentions.

### 2. Independent scoring

- **Two educators** score every response independently, without seeing each other's scores or
  OpenPath's.
  - Extended writing: a band (1–8) for each target and secondary capability, with each rubric
    criterion scored and quoted.
  - Short answers: each key point present or absent.
- **Agreement is recorded** per capability: mean absolute difference and the share within one band;
  for key points, the share of marks in agreement.
- **Adjudication.** Where the two differ by more than one band, or on a key point, a third
  educator settles the score, and the reason is recorded.
- **The record is checked by code.** Each anchor keeps its scorers' independent scores, the
  adjudication and the rubric version. Content validation refuses `trusted: true` without this record
  (built in E3a).
- **Poor agreement is a finding about the rubric, not the educators.** Where two educators agree
  poorly on a capability, its rubric is rewritten and re-scored before any evaluator is qualified on
  it.

### 3. Optional: review of the candidate content

The 780 code-scored items, 40 short items, 56 ladders and 12 passages are all candidate content.
A review for correctness, ambiguity, difficulty order and age-suitability is valuable but separate
from anchor scoring, and is listed separately below.

## Workload (estimates)

| Task | Basis | Hours |
|---|---|---|
| Briefing and a calibration session on the rubrics (3 educators) | 2 × 4 h each | 24 |
| Writing extended responses | 288 × about 18 min | 86 |
| Writing short answers | 640 × about 2 min | 21 |
| Scoring extended responses, two scorers | 288 × 2 × about 6 min | 58 |
| Marking short answers, two scorers | 640 × 2 × about 1 min | 21 |
| Adjudication (about 15% of extended responses, 5% of short answers) | 43 × 10 min + 32 × 2 min | 8 |
| **Anchors, total** | | **about 220** |
| Optional content review, two reviewers | 860 items × about 1.5 min × 2 | 43 |

Spread over three educators, the anchor work is about 70–75 hours each, or roughly 3–4 weeks part
time.

## Qualifications sought

- **Training:** a postgraduate degree in English or English education (for example, MA English or
  B.Ed. with English), or equivalent.
- **Experience:** at least five years teaching English to learners aged 10–15 (Classes 5–10).
- **Assessment experience:** at least one of the three should have marked board examinations (CBSE,
  ICSE or a state board) or have experience designing rubrics. That educator acts as adjudicator.
- **Language:** familiarity with the CEFR is useful. Experience with learners for whom English is a
  second language is important.
- **Independence:** no conflict of interest with OpenPath's content. Educators agree to score
  independently and keep the anchors confidential, since an anchor that leaks into training data or
  prompts stops being a fair test.
- **Safeguarding:** this phase involves no children's data. If later phases use consented real
  responses (E6), the usual background checks and data agreements apply.

## Estimated cost

The cost depends on the hourly rate agreed. Published figures are thin. PayScale reports about
₹500 per hour (typical range ₹450–800) for English tutors in India, but from only 11 profiles. The
estimate below therefore uses a range and should be confirmed by quotes.

| Rate (₹ per hour) | Anchors (about 220 h) | With optional content review (about 263 h) |
|---|---|---|
| 600 | about ₹1.3 lakh | about ₹1.6 lakh |
| 1,000 | about ₹2.2 lakh | about ₹2.6 lakh |
| 1,500 (senior examiners) | about ₹3.3 lakh | about ₹3.9 lakh |

**Not included:** taxes, platform or contracting fees, and any legal review of agreements.

## Order of work, once approved

1. Prepare scoring sheets and briefs (OpenPath, no cost).
2. Approach educators and agree terms (needs your approval).
3. Calibration session.
4. Writing.
5. Independent scoring.
6. Adjudication.
7. Agreement report.
8. Rewrite any rubric with poor agreement.
9. Mark agreed anchors trusted with their review records.

Only then can E3b qualify a real evaluator.

## Decisions for you

1. Approve this scope, or adjust the numbers (more qualification anchors for higher confidence, fewer
   to reduce cost).
2. A rate range and budget, and whether to include the content review.
3. Whether OpenPath may approach educators (none has been contacted).

Sources: [PayScale, English Teacher/Tutor (Vocational), India](https://www.payscale.com/research/IN/Job=English_Teacher%2FTutor_(Vocational)/Salary/5fb2c817/Mid-Career-English-Language).

---

## Exploratory pilot (design only; not commissioned)

**Purpose.** Learn, cheaply, whether the rubrics and key points can be scored consistently by
educators, how long scoring takes, and whether the tooling and review records work. The pilot is
**not** a qualification set.

### What would be scored: 48 answers

| Part | Selection | Answers |
|---|---|---|
| Extended writing | 4 of the 8 tasks, one per genre: formal letter (`wr.letter.streetlight`), story (`wr.story.lost`), persuasive article (`wr.persuade.trees`), analytical paragraph (`wr.analytical.chart`) | 6 per task, spread across bands 2–8: **24** |
| Short answers | 12 of the 40 items: 3 grammar, 2 vocabulary, 3 sentence, 2 writing, 2 reading | 2 per item (one meeting the key points, one borderline): **24** |

- **Written** by one educator, at stated target bands, in a learner's voice, with no real names. No
  children's data.
- **Scored** independently by two other educators, with full criterion scores and quotes for
  writing, and key-point marks for short answers.
- **Adjudicated** by a third reading where the two differ by more than one band or on a key point.

### What it would measure

- **Agreement between educators:** per capability for writing (mean absolute difference, share within
  one band), and per key point for short answers.
- **Rubric problems:** criteria the educators read differently, and key points that are ambiguous.
- **Time per answer**, so that any later programme is costed from real figures.
- **OpenPath's candidate labels against educator scores:** do our intended bands match theirs?
- **Research-only signals:** do the grammar diagnostic signals agree with the educators' judgements?
  Recorded only; nothing changes in production.
- **The tooling:** scoring sheets, review records and the content check that refuses a trusted anchor
  without two independent scorings.

### Limitations (why this cannot qualify an evaluator)

- **Too few answers per capability.** About 6 responses per capability for the four tasks, fewer for
  secondary capabilities, and 2 per short item. Noise and bias estimated from 6 responses carry a
  standard error of about ±0.3 band or more, against the ±0.1 needed to apply the qualification
  limits; agreement figures will have wide uncertainty.
- **Only half the writing tasks** and less than a third of the short items are covered.
- **Answers written by educators are not real learners' answers.** They will be cleaner and more
  typical than real writing.
- **Two or three educators are not a representative panel.**
- **Difficulty is not calibrated.** Only real learners' responses can do that.
- **Pilot answers should not become drift anchors.** Once used for study, they are known to the
  team; any later programme should write fresh qualification and drift sets.

### Workload and estimated cost

| Task | Hours |
|---|---|
| Briefing on the rubrics (3 educators × 2 h) | 6 |
| Writing 24 extended answers (about 18 min each) and 24 short answers (about 2 min each) | 8 |
| Independent scoring by two educators (24 × 6 min and 24 × 1 min, each) | 6 |
| Adjudication | 1.5 |
| Debrief: rubric problems and timing (3 × 1 h) | 3 |
| **Total** | **about 25** |

At ₹600–1,500 per hour, that is about **₹15,000–37,500**, before taxes and fees, to be confirmed by
quotes.

### Decision needed (later)

Whether to run the pilot, and when OpenPath may approach educators. Neither is approved now.
