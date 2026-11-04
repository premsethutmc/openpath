# Adversarial corpus 3 — first pass of the post-fix evaluator (frozen)

Corpus: adversarial3/adversarial3.json sha256 5a7ab2034d58bcd76a8c5465a363f6e8a0b9e29e0223c752fd776b4f0e5710a5 (456 tasks, 12 categories x 38). Written by an agent that was forbidden to read the evaluator, packages/, or any earlier results, from a written convention (layered domains, case-split syntax). Checker passes; regeneration is byte-identical. Evaluator: commit 8756718 (code identical to 2b0c60a for student.ts). First-pass output: results/adversarial3-firstpass.json (frozen in the commit that adds it). **No evaluator change has been made after this run.**

| metric | count | rate |
|---|---|---|
| false acceptance | 0 | 0/246 non-valid tasks |
| false rejection | 0 | 0/210 valid tasks |
| over-refusal (unsupported/ambiguous where the oracle decides) | 26 | 26/354 |
| under-refusal (verdict where the oracle says unsupported/ambiguous) | 5 | 5/102 |
| status agreement | 425 | 425/456 = 93.2% |
| first-invalid localisation (step-invalid tasks) | 100 | 100/109 (the 9 misses are the 9 over-refused removable-singularity tasks) |
| final-claim detection | 35 | 35/35 |
| crashes / unsafe certifications | 0 / 0 | |

Categories at 38/38 agreement: divide-by-variable, multiply-by-possibly-zero, cancellation, rational-expressions, explicit-case-split, introduced-denominator, alternative-paths, ambiguous-notation, broken-evidence-chain.

## The 31 disagreements
1. **26 over-refusals = one unsupported input syntax.** 23 removable-singularity and 3 glyph-variant tasks write the student's explicit restriction as a trailing `, x != a` / `, x ≠ a` on an equation line. This syntax was added by the corpus author (disclosed in its README); the evaluator does not parse it, so the line is refused as unsupported. Safe direction (no verdict is given), but it is a real gap for the removable-singularity category (15/38 agreement). Not fixed here: a fix must be tested on a fourth untouched holdout.
2. **5 under-refusals = documented scope policy, not changed.** H3-unsupported-002/-015/-017/-018 contain a line with irrational roots; H3-unsupported-031 contains `ln(1)` after a step that is demonstrably wrong. The oracle labels these "unsupported"; the evaluator reports `invalid` because an earlier step is *proved* different by exact comparison (irrational parts are compared as polynomials). The policy (an invalid verdict whenever exact comparison proves a difference; "unsupported" never overrides a proven error) is unchanged, so the verdicts were NOT altered to match the labels.

## Reading the result honestly
* 0 false acceptance in all four runs of the evaluator on corpora it was not tuned on (student, adversarial 1 first pass, adversarial 2 first pass, adversarial 3).
* The 0 false rejections on this corpus show that the layered-domain fix generalises: adversarial 2's 16 false rejections were the failures that motivated it, and adversarial 3 was written after, with new categories (introduced denominators, case splits).
* Agreement on adversarial 2 (440/440) is on a corpus the fix was designed against and is not held-out evidence.
* Limitations shared with the corpus: rational roots, degree <= 2 after clearing, one author for both label routes.
