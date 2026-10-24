# Milestone: Tamil Nadu Grade 5 verified question bank

**Status: proposal, awaiting approval.** No code is written until the owner approves the scope and acceptance tests.
Based on `feat/expand-verified-teaching` @ `8121178` and the engine trial in PR #69.

## Goal
Make **one complete grade of one board** ready to learn from: Tamil Nadu State Board (Samacheer Kalvi), Standard V
mathematics. Every question is pre-solved, independently checked, and stored in a bank that the adaptive loop draws
from. Nothing is generated or solved while a child is learning.

## Scope
Everything the release `tn-samacheer-mathematics-grade-5` requires:

| | Count |
|---|---:|
| Syllabus requirements | 61 |
| Chapters (Terms I–III) | 19 |
| Competencies | 57 |
| Question families serving them | 192 |
| Released problems | 60,774 |

Every one of the 57 competencies already has at least one family, so this milestone is about verification and depth,
not new content. Today 32% of these problems have every step checked by the kernel, 32% have some steps checked, and
37% rely on their family's own answer check.

Out of scope: other grades and boards, new subjects, handwriting, photo input, learner-typed problems, any LLM, any
change to the learner interface, and any change to production or paid services.

## Definitions
- **Kernel-verified:** the final answer and every step are independently checked.
- **Answer-verified:** the final answer is confirmed by a method different from the solver (the family contract
  requires this). Steps are not all machine-checked. Allowed in the bank, labelled, and listed by step type.
- **Unverified:** excluded from the learner-facing bank.
- **Machine-verified** (new status) is what "mathematically correct" means here. It is not educator approval, and the
  existing `validated`/`approved` classes are left untouched.

## Stages
| | Stage | Output | Estimate |
|---|---|---|---|
| T0 | Audit and export | Bank file, per-item label, coverage report for the 61 requirements | 1–2 days |
| T1 | Pilot of a general equivalence checker (is each step's "after" equal to its "before"?) on three step types | Measured effort per step type, and a firmer date | 1–2 days |
| T2 | Verify the Grade 5 families, in parallel, most common step types first | Share of items kernel-verified rises | days to about 2 weeks |
| T3 | Depth and gaps | Every competency has enough distinct items in each difficulty band | days |
| T4 | Journeys and report | Scripted learner journeys on the bank only; results committed | 1–2 days |

Total, proposed: about 2–3 weeks of calendar time, to be confirmed by the T1 pilot. Parallel agents shorten the
time but spend usage faster; I will report usage after T1.

## Acceptance tests (proposed thresholds)
1. **Coverage.** All 61 requirements map to at least one competency with at least one released family. Zero
   unmapped requirements. Any gap is listed by name.
2. **Bank completeness.** Every released Grade 5 problem is in the bank with: question, answer and accepted forms,
   steps, wrong-answer explanations, difficulty, competency, label, engine version, fingerprint.
3. **Determinism.** Rebuilding the bank gives a byte-identical file (same SHA-256).
4. **Labelling.** 100% of items carry exactly one label. Zero unlabelled. Unverified items are not served.
5. **Answer independence.** 100% of items have the final answer confirmed by a second method, with zero
   disagreements. A self-test injects 500 wrong answers, and all 500 are rejected.
6. **Step verification target.** At least **90%** of items kernel-verified (today 32%). The remainder are
   answer-verified, and every remaining step type is listed with its item count. The 90% figure is revised after T1.
7. **No wrong item accepted.** A separate SymPy/exact-fraction re-check of at least 10,000 random items plus at
   least 20 items from each of the 192 families finds zero incorrect answers.
8. **Depth.** Each competency has at least 30 distinct items in each of three difficulty bands, or a shortfall
   report names the gap. Shortfalls are fixed with more variants, not by lowering the bar.
9. **Learner journeys.** 10 scripted learner journeys (errors, remediation, practice, mastery, delayed check) run
   using only bank items and never hit a missing item.
10. **No regression.** All existing tests pass (371 today), and a re-census of all 341,483 problems shows no item
    labelled worse than before.
11. **Explicit limits.** A request for anything outside the supported set fails with a clear message and is
    written to the missed-item log.

## Stop rules
- If T1 shows the equivalence checker cannot read the existing steps, stop and report. No stage after T1 starts.
- If acceptance test 7 finds any incorrect answer, the affected family is pulled from the bank and fixed first.
- Do not start the next milestone, merge, or deploy without approval.

## Risks
- Steps may not carry machine-readable before and after expressions. T1 tests this first.
- Steps such as "read", "write", "note", "recall" and "classify" involve no calculation and may stay answer-verified.
- Early-grade items use pictures. Pictures are stored as files, not in the database, and are checked by their
  family's own rules.
- Grade 5 families may be shared with other grades, so a fix here can change other releases. The re-census in test
  10 catches that.

## Decisions for the owner
1. Is **90%** kernel-verified the right bar for "complete", or must it be 100%?
2. Approve the new **machine-verified** status, kept separate from educator approval?
3. Approve parallel agents for T2 (faster, spends usage faster)?
