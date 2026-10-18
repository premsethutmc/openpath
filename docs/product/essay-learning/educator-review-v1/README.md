# Consolidated educator-review package (educator-review@1)

This is one package for an English educator to review the Grade 8 essay-to-mastery content:

- the questions;
- the pilot lessons;
- the competency definitions, prerequisites, curriculum mappings and provisional targets.

The 15 benchmark essays, the 3 rewrites and their reference annotations are in
[`../essay-validation-v1/`](../essay-validation-v1/), with an annotation guide and scoring scripts.

**Nothing in this package changes the app.** Decisions are exported as a structured file. Approved items are applied
only by a separate, explicit content-release change that the owner approves.

## Contents

| File | What it is |
|---|---|
| [INVENTORY.md](INVENTORY.md) | Counts by set, reconciled against the repository, with any discrepancies |
| `review-workbook.xlsx` | The review workbook: Instructions, Questions, Lessons, Competencies, with decision drop-downs. One copy per reviewer. |
| `questions.csv`, `lessons.csv`, `competencies.csv` | The same content as CSV, for anyone without Excel or Sheets |
| `decisions-template.csv` | One blank decision row per record (kind, id, version, fingerprint, then the reviewer's columns) |
| `records.json` | The canonical records, with content fingerprints |
| `pilot-matrix.json` | The three-competency pilot coverage (see ../PILOT_COVERAGE.md) |

Each question record holds:

- the question and its options (and passage, if any);
- the expected answer and an explanation;
- the competency;
- a difficulty justification (its ladder step; expert estimate, not calibrated);
- the intended role (proposed use, pilot pool and current allocation roles);
- the evidence status (candidate or provisional, and whether it was ever reviewed);
- the response type: **recognition** (choose, order, match) or **constructed** (typed).

## The workflow

1. **Independent review.**
   - Each reviewer gets their own copy of `review-workbook.xlsx` (or `decisions-template.csv`) and fills, per row:
     - `reviewer_id` (a code, never a child's name);
     - `decision`: `approve`, `revise`, `reject` or `unable_to_determine`;
     - `reason` (required for revise, reject and unable);
     - `suggested_correction` (required for revise);
     - optional `issues`;
     - `date`.
   - Reviewers do not see each other's work.
2. **Collect.** Turn each workbook into a decisions CSV:
   ```
   python3 tools/english/educator/workbook.py extract reviewer-A.xlsx A.csv
   ```
3. **Reconcile.** This reports per-pair agreement (percent and Cohen's κ) and writes the rows that need an adjudicator:
   any disagreement, or any `unable_to_determine`.
   ```
   node tools/english/educator/review.ts reconcile A.csv B.csv --out adjudication.csv
   ```
4. **Adjudicate.** A third educator fills `adjudicator_id`, `final_decision` (approve, revise or reject), `reason` and
   `suggested_correction` in `adjudication.csv`.
5. **Export.** This writes the structured decisions (`educator-decisions@1`):
   ```
   node tools/english/educator/review.ts decisions A.csv B.csv --adjudication adjudication.csv --out decisions.json
   ```
   - It contains the resolved rows only: those where two or more reviewers agree and nobody disagrees, or where an
     adjudicator decided.
   - It records the reviewers, reasons and suggested corrections.
   - Unresolved rows are listed separately.
6. **Release (separate, not automated).** A reviewed content change applies the approved decisions. For example, it
   removes `evidence_status: "provisional"` from an approved supplement question, applies a correction as a new item
   version, or records approved pools. The owner approves that change.

**Safeguards:**

- Every record has a fingerprint of its exact content. A decision on content that has changed since export is refused
  as stale.
- `unable_to_determine` never resolves a row.
- Owner approval of existing pilot questions is shown as "owner-approved for product use (not an educator review)".

Regenerate the package after any content change:

```
node tools/english/educator/review.ts export
python3 tools/english/educator/workbook.py build
node tools/english/educator/review.ts export --check   # CI-style check that the package is current
```
