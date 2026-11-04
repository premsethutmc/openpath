# Plural questions: item-by-item educator review (H-V4)

**Status: prepared, not started.** No educator has reviewed any of these questions, and none is approved. Nothing
here approves, promotes or releases content, and no decision has been simulated.

This folder prepares the 30 proposed plural-noun questions (`content/english/proposed/g8-plurals-v1/`, all
`evidence_status: "provisional"`, not loaded by the app) for independent review, one question at a time. The records
are the same as in the consolidated package (`../`, set `proposed-plurals`), with the same ids and content fingerprints,
so decisions go through the existing workflow unchanged, including the third-reviewer adjudication.

| Sub-skill | Diagnostic | Independent | Transfer | Delayed retention |
|---|---:|---:|---:|---:|
| Regular plurals | 1 | 2 | 1 | 1 |
| Irregular plurals | 1 | 2 | 1 | 1 |
| Already-plural nouns | 1 | 2 | 1 | 1 |
| Number + plural | 1 | 2 | 1 | 1 |
| Quantifiers | 1 | 2 | 1 | 1 |
| Countable and uncountable nouns | 1 | 2 | 1 | 1 |

19 of the 30 are constructed (typed) responses. [ORDER.md](ORDER.md) lists every question in review order, and
[REVIEW_NOTES.md](REVIEW_NOTES.md) lists what to check for each sub-skill and each question.

## Files

| File | For |
|---|---|
| [REVIEW_NOTES.md](REVIEW_NOTES.md) | Both reviewers: what to check, per sub-skill and per question (the author's open questions, not decisions) |
| `../round-1/REVIEWER_GUIDE.md` | Both reviewers: the general criteria (correctness, ambiguity, difficulty, competency, age, instructional quality) |
| `reviewer-A/review-workbook.xlsx`, `reviewer-A/decisions.csv` | Reviewer A only: a blank workbook (Instructions, Questions) and the same rows as CSV |
| `reviewer-B/review-workbook.xlsx`, `reviewer-B/decisions.csv` | Reviewer B only: identical blank copies |
| `round-plurals.csv` | Coordinator: one line per question in review order (sub-skill, proposed use, fingerprint) |
| `records.json` | The ordered records (`educator-review-round@1`) |

## Process (the same controls as round 1)

1. The coordinator sends each reviewer only their own folder, `REVIEW_NOTES.md` and the reviewer guide, privately.
   Filled workbooks are not committed until both reviews are complete.
2. Progress without disclosure:
   ```
   python3 tools/english/educator/workbook.py extract reviewer-A.xlsx A.csv
   python3 tools/english/educator/workbook.py extract reviewer-B.xlsx B.csv
   node tools/english/educator/round-plurals.ts progress A.csv B.csv
   ```
3. Reconcile only when both are complete: `node tools/english/educator/review.ts reconcile A.csv B.csv --out adjudication.csv`.
4. A third educator adjudicates every disagreement and every `unable_to_determine`; then
   `node tools/english/educator/review.ts decisions A.csv B.csv --adjudication adjudication.csv --out decisions.json`.

## From a decision to eligible evidence (H-V3)

An approved decision changes nothing by itself. A separate, owner-approved content-release change:

- applies any revision as a **new item version**, since the fingerprint changes;
- marks each approved version `evidence_status: "validated"` with `released_at`, the time it is released to learners;
- assigns the proposed pools (diagnosis, confirmation, retention) and loads the questions in the app.

Only answers given **after** `released_at`, to that exact version, and on the learner's first encounter with the
question can contribute to verified mastery under the pilot policy. Earlier answers stay in the ledger with their
original meaning. The content validator refuses a `validated` item without `released_at`.

## Regenerating

```
node tools/english/educator/round-plurals.ts export      # CI: export --check
python3 tools/english/educator/workbook.py build-plurals
```
After any content change, regenerate; decisions already made on changed rows will then be refused as stale.
