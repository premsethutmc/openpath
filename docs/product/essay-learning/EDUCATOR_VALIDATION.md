# Educator validation and pilot readiness v1

Branch `feat/educator-validation-v1`, stacked on PR #47. This change prepares the Grade 8 essay-to-mastery content and
standards for independent educator review and a small controlled pilot.

It changes no estimator, evidence threshold, target or content status. It promotes no question, and real-child access
stays disabled.

## Deliverables

| # | Deliverable | Where |
|---|---|---|
| 1 | Consolidated educator-review package | [educator-review-v1/](educator-review-v1/README.md): workbook, CSVs, records with fingerprints, and [INVENTORY.md](educator-review-v1/INVENTORY.md) |
| 2 | Structured reviewer decision template and workflow | `decisions-template.csv`, `review-workbook.xlsx`, `tools/english/educator/review.ts` (reconcile, adjudicate, export `educator-decisions@1`), `tools/english/educator/workbook.py` |
| 3 | Three-competency pilot coverage matrix | [PILOT_COVERAGE.md](PILOT_COVERAGE.md), `tools/english/educator/pilot-matrix.ts` |
| 4 | Grade 8 standards and target-band review | [G8_STANDARDS_REVIEW.md](G8_STANDARDS_REVIEW.md) |
| 5 | Essay annotation guide and scoring scripts | [essay-validation-v1/](essay-validation-v1/ANNOTATION_GUIDE.md), `tools/english/educator/annotation-score.ts` (`vs-reference`, `agreement`), `tools/english/educator/essay-validation.ts` |
| 6 | Privacy and pilot-readiness checklist | [PILOT_SAFETY_CHECKLIST.md](PILOT_SAFETY_CHECKLIST.md) |
| 7 | Decisions requiring human approval | [HUMAN_DECISIONS.md](HUMAN_DECISIONS.md) |

## Findings

### Inventory

The stated totals match the repository: **96** proposed questions and **181** existing questions identified for review.

In addition, **24** further questions on the pilot competencies would be used by a pilot sequence (practice,
confirmation and retention pools) but are not in the 181. They are included and labelled "pilot-additional". That makes
**301 questions**: 192 recognition and 109 constructed.

The package also holds **19** pilot lesson parts and **19** competency records. There are no duplicates.

### Pilot competencies

Only subject–verb agreement, present and past simple, and articles have lessons, so these are the three.

**None is pilot-ready.** For each:

- the bank as shipped lacks unseen band 5–6.5 questions for the independent and later checks (and, for two of them,
  the delayed check);
- nothing is educator-reviewed;
- no essay evaluator is validated for observation and transfer.

If the 96-question supplement is approved, each can complete the sequence **with one later check**. The full allowance of
three is still short.

One complete sequence across the three needs educator approval of **41 questions (19 from the supplement) and 19 lesson
parts**.

### Standards

There is **no band-5 descriptor** for any competency. The curriculum mappings are indicative and unvalidated, and
decision D-5 (age expectations) is open. The repository cannot justify band 5 as the Grade 8 standard, so all targets
stay provisional.

### Essay evaluation

- The 15 essays and 3 rewrites are packaged blind for annotation, with the reference kept apart.
- The deterministic baseline is unchanged: the pattern stand-in has error precision 1.00 and recall 0.11.
- **No LLM accuracy is reported:** no model has been run.

### Safety

Real-child essays are refused in the core and the server; the studio is device-only and synthetic. The gaps before
enabling real children:

- names, schools and places in essay text are not removed;
- there is no essay-specific consent purpose;
- there is no essay retention period;
- no model provider has been chosen on its data terms;
- the essay pathway has no safeguarding flag;
- there is no educator access role.

## Tests

Core K6 (5 tests):

- the package reconciles with the repository and is current;
- decisions resolve only when agreed or adjudicated, stale and incomplete rows are refused, `unable_to_determine` never
  resolves, and no content file changes;
- the annotation scorer is exact on the reference and measures false positives and disagreement;
- no competency is called pilot-ready, and every question needing approval is in the package.

## Limitations

- The review package and workflow are files, not an application. They have not been used by a real educator yet.
- The reference annotations, the proposed questions and the difficulty estimates are all AI-drafted and unvalidated.
- The pilot matrix counts content for one learner's sequence. A pilot with several learners needs the same content per
  learner. It is the same set of questions, because each learner has their own record, but a learner who needs more
  later checks uses more.
- The safety audit is a reading of the code and documents, not a legal review.
