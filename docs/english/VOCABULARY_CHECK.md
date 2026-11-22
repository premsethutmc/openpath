# Word check

The English home screen offers a short check of **word-meaning recognition**, not a measurement of total
vocabulary size or the ability to use a word. It also runs in a shorter form in the general level check.

- Up to 24 items (12 in the shorter form). Each has three meanings and an “I don't know” choice.
- A perfect round of three can probe the next band. Two right out of three triggers one fresh round in the
  same band, not an immediate promotion. Untested bands never count.
- A band can guide practice when the learner gets two adjacent bands right (each needing 3/3 if tested once,
  or at least 5/6 if tested twice), or gets at least 5/6 at that band itself. If evidence is too thin, the result
  says so. The suggested practice level is not a score out of eight.
- Scores report the number of sampled meanings answered correctly, overall and by band. No inferred total or
  confidence interval is shown. Older records are retained, but earlier word-family totals are no longer displayed or used to recommend practice.
- There are no repeat items within a sitting. A retake prioritises unseen words, but may reuse previously seen ones.
- The check is provisional, practice-only, and separate from the capability evidence ledger.

Content: `content/english/vocabulary/size-check.json`. Logic: `frontend/src/english/logic/vocabulary/`.

The eight difficulty bands and distractors are not calibrated with learners. Multiple-choice answers can still
be guessed or inferred by elimination. The next validation step is stronger distractors and independent
context or recall tasks, with repeated use by real learners before claiming vocabulary growth or exam readiness.
