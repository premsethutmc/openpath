# Exact verification coverage (Items 2 and 3)

Source: `exact-coverage.ts` (+ `exact-coverage.json`) against `audit.json` at the audit commit. Checkers: `packages/learning/src/exact/` (`rational.ts` BigInt rationals; `number-families.ts`; `stats-prob-families.ts`; `verify.ts`). Tests: `exact-families.test.ts` (128 tests). Frozen regression: `content/learning/exact-verification.v1.json`.

## What 'exact-verified' means here
For **every** released typed question of the family (not a sample): (A) the stored answer equals an independent exact result derived only from the learner-visible prompt and table (exhaustive enumeration for probability; divisor enumeration for HCF; repeated subtraction for division; direct definitions for statistics); (B) the production path `isCorrect` accepts the exact answer and equivalent forms the type allows and rejects exact near-misses (including a non-float-safe 1-in-10⁶ difference); (C) the multiple-choice form lists the exact answer exactly once; (D) for 7 number families (hcf, faddu, avfas, avdiv, ajsi, avmarked, eqfrac), every worked-step claim holds exactly. Statistics/probability families are verified at A–C only (their worked steps are not checked). This is a family-level claim about the generated pool, separate from the kernel's step verification: `adaptProblem` classification (175/203/667/35) is unchanged and compatibility mode is untouched.

## Result
| | Families | Questions | Failures | Prior class |
|---|---|---|---|---|
| number | 18 | 9789 | 0 | 0 kernel / 10 partial / 8 compat |
| statistics+probability | 22 | 8740 | 0 | 0 kernel / 10 partial / 12 compat |
| **total** | **40** | **18529** | **0** | none were kernel-backed |

Competencies (of 336): with an exact-verified family 28; with ≥1 verified family (kernel-backed or exact) 115 → 133; with all families verified 18 → 27 (newly: number.fraction-add, number.fraction-multiply, number.integer-add, number.long-division, probability.bayes, probability.experimental, probability.total-probability, probability.tree-diagrams, statistics.averages-intro).

Questions in a verified family: kernel-backed 62838 + exact 18529 = 81367 of 341483 (23.8%; was 18.4%). Partially adapted families stay 'partial', not verified.

## Latency
Per question (full check A–D incl. ≈8 `isCorrect` calls), warm Node, one process: mean 0.2531 ms, p50 0.0776 ms, p95 1.2931 ms, p99 2.1981 ms, max 63.46 ms over 18529 questions. Whole-pool verification of 40 families runs in a few seconds.

## Correctness findings
No answer, marking or option defect was found in the 40 families. Two items to note, neither changed: (1) in `avfas` several multiple-choice distractors equal the answer in value but are not in simplest mixed form (e.g. `29/18` beside `1 11/18`); the task requires the simplest mixed form, so they are valid wrong options, but a learner who reads them as equal values could dispute; (2) `akchance` includes impossible-event items (probability 0) and a certain event (`red, blue or green`, 1), which are intended.

## Remaining gaps (not claimed)
- Steps of the 22 statistics/probability families and of 11 number families are not independently verified (answers, marking and options are).
- Highest-volume number families still without exact verification: aechk (693), aenumf (600), agrupee (500), ajrq (500), ajintl (500), ajcmpx (500), ajprop (500), aesurop (450), ajrcmp (450), ajrcq (450), aksmag (450), akscalc (450). Total 162 families / 48912 questions.
- Highest-volume statistics/probability families still without: adbar (448), abpic (400), abpicmore (400), advenn (400), akgroup (400), akbarpct (400), akhist (400), anempir (400), atindt (400), atmdf (400), atgvar (400), atcexp (400). Total 53 families / 15165 questions. Many depend on pictures (bars, pictographs, Venn, histograms) whose data live in the figure; they need a figure-reading checker before they can be claimed.
- Families checked against the prompt text alone can miss a defect that a rendered figure introduces; tables were read from the figure data, pictures were not.
