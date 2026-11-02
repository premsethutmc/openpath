# 4. Independent review

Two separate reviewer agents checked the batch. Neither had seen it being written, and both worked read-only. Each read the package Markdown and JSON, the authored text (`tools/packages.mts`), the generator family source, and the build output.

## Pass 1 — verdict: "none of the nine is ready to approve as written"

The first pass found one blocker, about twenty major findings and several minor ones. The automated checks already confirmed the numbers; the reviewer's findings were about teaching quality.

| Package | Finding (severity) | Disposition |
|---|---|---|
| NUM-03 | The family's own wrong-answer sentence is false: "0.03 … because 03 is more than 5" (**blocker**) | Fixed for the package (`says` override). Recorded as an existing content defect (14 of 154 items), handed over in 05. |
| NUM-01 | A greater/smaller mix-up gives the same answers as the misconception on both same-top items | Diagnostic interpretation rule added (needs the same-bottom contrast). The engine's evidence rule is raised as a policy question in 05. |
| NUM-01 | The counter-check was circular; cross-multiplication was used at grade 3; fraction pairs repeated; the wrong answer was shown as a decimal | Fixed: equal-strip check, part-size reasoning, number signatures, answers shown in the learner's own form. |
| NUM-02 | The worked example simplified away the denominator; a recheck could not catch multiply-tops; a ×1 example; a counter-check needed unlike fractions | Fixed: examples must keep the denominator, top numbers above 1, items that distinguish the errors, a one-strip counter-check. |
| MEA-01 | Mislabelled alternative; the two-sides screen used an area item but corrected it as perimeter; rectangle sizes repeated; no area delayed check | Fixed. |
| GEO-01 | A near-confusable recheck (89 vs 91) | Fixed: wrong values must differ from the answer by at least 3. |
| GEO-02 | Angle values reused; "do not add up to 180°" is false at 90°; circular counter-check; scissors analogy | Fixed (signatures, angles within 5° of 90 excluded, own wording, going-round check, crossed pencils). |
| STA-01 | Mean ≈ median in the mean-for-median example; "value 5"; "69/2" | Fixed. |
| ALG-01 | (4x + 4)² is ambiguous (copied numbers); "substitute" was not a method; the counter-check numbers differed from the example; the family step text is wrong | Fixed (copied-number filter, four-products method, checks at x = 1 on the instance). The family text is not quoted and is recorded as a defect (all 126 (a − b)² items). |
| PRO-01 | No item could raise order-ignored; the rechecks were one-pair totals; wrong answers were shown as decimals | Fixed (a same-size-spinner diagnostic, multi-pair totals, fraction display). |

## Pass 2 (after fixes) — five fully fixed, four partly fixed, then the remainder fixed

| Remaining finding | Disposition |
|---|---|
| NUM-01: a recheck reused the denominator pair 9/11 | Fixed: denominator-pair signature. |
| NUM-03: "1 hundredths" | Fixed. |
| GEO-02: the family's "do not add up to 180°" was still quoted | Fixed with the package's own wording. Recorded in 05 as wording only: no served `afcross` item has 90°. |
| ALG-01: the step-text sign defect is wider than first recorded; guided/transfer (3x + 1)², (x + 6)² copy p or q; no (a + b)² delayed check | Defect record widened. The copied-number filter now also applies to guided and transfer items. The family's retention partition has no usable (a + b)² item; this is recorded as a gap in the package. |
| STA-01: mean = median in a worked example; mean ≈ median in a diagnostic and a recheck | Fixed: every example, diagnostic and recheck has the mean at least 3 from the median. |
| MEA-01: hints were area-only; the two-sides fix mixed two ideas; muddled rule wording | Fixed: hints per worked example (one area, one perimeter); reworded. |
| NUM-02: add-denominators was shown as 4/9 (a learner writes 8/18) | Fixed: the display uses the learner's form, and that form is also graded. |
| Labels and grammar ("part(s)", "procedural — procedural") | Fixed. |
| NUM-03: graph lists fraction-add-like as the only mandatory prerequisite of decimal-tenths | Recorded for curriculum review (05). |

After pass 2 the build ran again: 178/178 items and 2,440/2,440 pool items agree. A third review pass was **not** run on the final text. Any remaining wording issues are for educator review; the packages remain review candidates.
