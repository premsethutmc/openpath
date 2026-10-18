# Round 1: first educator review (the three pilot competencies)

**Status: prepared, not started.** No educator has reviewed anything. No decision has been simulated, and nothing is
promoted by this package.

Round 1 is the part of the consolidated package (`../`) that the first pilot needs. It covers three Grade 8
competencies:

- subject–verb agreement (`EN.GRM.VERB.sva`);
- present and past simple (`EN.GRM.VERB.present_past_simple`);
- articles (`EN.GRM.NOUN.articles`).

| Records | Count | Which |
|---|---:|---|
| Competency definitions | 3 | Band descriptors, prerequisites, curriculum mappings, the provisional band-5 target |
| Lesson parts | 19 | 7 + 5 + 7, in ladder order |
| Questions | 41 | 14 + 13 + 14: the questions one complete pilot sequence would use, in the order a learner meets them |
| **Total** | **63** | [ORDER.md](ORDER.md) lists every record in review order |

Of the 41 questions, 36 are **required** under the locked pilot policy (`../../pilot-validation-v1/PILOT_ASSESSMENT_POLICY.md`).
The other 5 are **optional**: they serve only an additional later check. Of the 41, 19 are from the proposed
supplement (provisional), 12 are existing questions, and 10 are pilot-pool questions.

The records are the same records as the consolidated package, with the same ids and content fingerprints. So round-1
decisions go through the existing workflow unchanged, including the third-reviewer adjudication.

## Files

| File | For |
|---|---|
| [REVIEWER_GUIDE.md](REVIEWER_GUIDE.md) | Both reviewers: how to judge correctness, ambiguity, difficulty, competency alignment, age appropriateness and instructional quality |
| `reviewer-A/review-workbook.xlsx`, `reviewer-A/decisions.csv` | Reviewer A only: blank workbook (Instructions, Competencies, Lessons, Questions) and the same rows as CSV |
| `reviewer-B/review-workbook.xlsx`, `reviewer-B/decisions.csv` | Reviewer B only: identical blank copies |
| `round-1.csv` | Coordinator: one line per record in review order (stage, priority, set, fingerprint) |
| `records.json` | The ordered records (`educator-review-round@1`) |

## Keeping the two reviews independent

The workflow cannot enforce independence on its own, because reviewers work offline. These steps are the control:

1. **Separate folders.** The coordinator sends each reviewer **only their own folder** and the guide, by a private
   channel. Reviewers are not given repository access during the round, or they are told not to look.
2. **Separate return.** Each reviewer returns their workbook to the coordinator only, never to the other reviewer or to
   a shared folder. **Filled workbooks are not committed to the repository** until both reviews are complete, since
   both reviewers could see the repository.
3. **Progress without disclosure.** The coordinator checks completion without seeing or showing any decision. The
   check also flags the same reviewer id in two files, or two ids in one file:
   ```
   python3 tools/english/educator/workbook.py extract reviewer-A.xlsx A.csv
   python3 tools/english/educator/workbook.py extract reviewer-B.xlsx B.csv
   node tools/english/educator/round1.ts progress A.csv B.csv
   ```
4. **Reconcile only when both are complete** (`"complete": true`):
   ```
   node tools/english/educator/review.ts reconcile A.csv B.csv --out adjudication.csv
   ```
   This reports agreement (percent and Cohen's κ) and lists every disagreement and every `unable_to_determine`.

## Adjudication (unchanged)

5. A **third educator**, not reviewer A or B, fills `adjudicator_id`, `final_decision` (approve, revise or reject),
   `reason` and `suggested_correction` for each row of `adjudication.csv`. The adjudicator sees both reviewers'
   decisions; that is the point of adjudication.
6. Export the structured decisions:
   ```
   node tools/english/educator/review.ts decisions A.csv B.csv --adjudication adjudication.csv --out decisions.json
   ```
   A row is resolved only when both reviewers agree, or the adjudicator decided it. `unable_to_determine` never
   resolves a row. A decision on content that changed after export is refused as stale.
7. **Release is separate.** `decisions.json` changes nothing in the app. A reviewed content-release change, approved by
   the owner, applies approved decisions. Owner approval is not educator review.

## Who can review (decision for the owner)

The reviewers and adjudicator must be English educators who teach or have taught around Grade 8 in India, and must not
be part of the development team. The owner chooses them (HUMAN_DECISIONS.md in `../../pilot-validation-v1/`).

## Regenerating

After any content change, regenerate. Decisions already made on changed rows will then be refused as stale.

```
node tools/english/educator/review.ts export
node tools/english/educator/round1.ts export
python3 tools/english/educator/workbook.py build-round1
node tools/english/educator/round1.ts export --check
```
