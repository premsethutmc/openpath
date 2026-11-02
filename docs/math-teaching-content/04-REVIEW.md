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

---

# Review continuation (second request)

Three more independent reviewer agents, all read-only. None had seen the work being written.

## Pass 3 — FINAL review of batch 1 (on the final text after the batch-1 fixes, before this revision's integration work)

**Explicit check of the four packages previously marked partly fixed:**

| Package | Pass-3 result |
|---|---|
| TP-NUM-01 | **FIXED**: denominator pairs no longer repeat; a reversal cannot establish the misconception. |
| TP-NUM-03 | **FIXED**: "1 hundredth"; the false family sentence appears only in the defect note. |
| TP-GEO-02 | **FIXED**: the package's own wording is used; no angle value repeats. |
| TP-ALG-01 | **PARTLY**: the delayed-check audit wrongly said a (px + q)² delayed check was "available". Its copied-number rule was looser than the examples' rule. |

**Pass-3 verdict per package:**
- **Cleared:** TP-NUM-03 and TP-PRO-01.
- **Not cleared:** the other seven.
  - Five failed only on strategy titles cut off at 70 characters.
  - TP-MEA-01: fix_two_sides could never trigger, because no response pattern established it.
  - TP-ALG-01: the audit claim above.
- Minors:
  - "piece(s)"/"part(s)" in learner text;
  - screen headings that did not match their maths;
  - degree signs missing;
  - NUM-02's trigger lacked the written-form condition.

## Batch-2 review (first independent review of batch 2)

**Verdict: no package or pattern cleared.**
- **Blocker:** the platform's diagnosis reader (`probeReading`) cannot read the predicted errors of `addur` (tuples) and `acmoneyadd` (money strings). REG-TIME's and REG-MONEY's fixes can never trigger.
- **Major:**
  - counter-checks that did not refute (CH-BALL "probabilities add to 1"; CH-BAG backwards);
  - a division-by-0 check at grade 3 (PRT-NAME);
  - a hint leading to the error (PV-DIGIT);
  - "establishes: yes" where a competing explanation remained (PV-DIGIT, PAT-REGROUP, PAT-PARTS);
  - one-each always equals the table value (SCL-PICT);
  - REG-TIME rechecks unable to separate no-carry from regrouping at 100;
  - item reuse across roles;
  - `reusedExisting` empty although reuse was claimed.
- **Not reproduced:** the reviewer's statement that `gen:akchance:6,6,0,0` "is not produced". `problemOf` and `pool` both return it; it is only outside every served partition.

## Author fixes after passes 3 and B2, then a confirmation pass

Fixes made:
- Authored short titles; screen titles made unique.
- Plurals fixed.
- Alternative explanation and alternative methods split into separate screens, with matching maths.
- Degree units shown.
- A two-sides response row added; the written-form trigger added.
- The audit uses the examples' own rule and now says **MISSING**.
- REG-TIME diagnostic uses minutes ≥ 100, a minutes-based counter-check and a new fix wording.
- Counter-checks rewritten (CH-BAG, CH-BALL, PRT-NAME).
- PV-DIGIT hints split by question; a 4th diagnostic item, so face-value needs two answers.
- PAT-REGROUP and PAT-PARTS rows corrected.
- SCL-PICT trigger condition names the competing explanation.
- More number signatures; answer-distinct rules where the range allows.
- `reusedExisting` populated.
- Diagnosability marked UNREACHABLE where `probeReading` fails.
- Teaching-contract results corrected: "not checked" (outside scope) versus family-scoped.

**Confirmation pass (independent) on those fixes: 11 of 18 fixed, 5 partly, 2 not fixed, plus one new blocker** (internal source tags such as "(the family's own via_third)" in learner headings).

## Author fixes after the confirmation pass — NOT independently re-cleared

These were made after the last independent pass. They are checked by the build (181/181 and 142/142 items; 2,440/2,440 and 2,395/2,395 pool agreement; no contract violations), but **no reviewer has re-read them**:
- Internal source tags removed from every learner-facing title (they remain in `sources`).
- MEA-01 method title no longer repeats itself; NUM-02 "Units that do not change" made size-neutral; PRO-01 wording changed to spinners/dice throughout.
- REG-TIME misconception note no longer merges the two beliefs; CH-BAG's circular sentence removed.
- SCL-PICT table signature tightened, so no table is reused across roles. Diagnostic readings now point to the trigger condition where a competing explanation exists.
- PV-DIGIT plural "1 ten / 1 one"; "how many tens" items no longer share a tens digit.
- PAT-REGROUP row 2 wording corrected ("100 or more paise").

## Unresolved (recorded, not fixed here)

| Finding | Why it stays open |
|---|---|
| REG-TIME rechecks and delayed checks cannot separate no-carry from regrouping at 100 | No minutes ≥ 100 item exists in the check or retention partitions (generator partition, Codex). Recorded in the package. |
| TP-NUM-03, REG-TIME and REG-MONEY fixes unreachable | `probeReading` cannot read these answer types (B2, Codex). |
| 33 of 46 strategies are outside the module's teaching scope | `teachingScopeFor` (B1, Codex). |
| PRT-SHADE quotes "1 squares were shaded" | Family text (D6). Rewording it would break the platform's `addresses` detection (B3). |
| TP-ALG-01 has no (px + q)² cross-term delayed check | Retention partition (Codex). |
| SCL-BAR and SCL-PICT oracles read the figure's data values, not what the learner sees drawn | Rendering is not verified; this is a renderer contract question. |

**Status: every package remains a review candidate.** Packages cleared by an independent pass: TP-NUM-03 and TP-PRO-01 (pass 3). PRO-01 has had wording-only author changes since. All other packages carry author fixes that the confirmation pass checked in part and that the last round of changes did not have re-checked.
