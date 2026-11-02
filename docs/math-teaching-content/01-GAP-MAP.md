# 1. Curriculum teaching-content gap map

Source: `tools/inventory.mts`, run on the foundation commit `637938c7`. It reads only the runtime content API: the 336 modules the engine serves (`content.ts` `modules`, with quarantined questions removed), the 1,082 generator families (`families.ts` `FAMILIES`/`pool`), the competency graph and `content/learning/explanation-review.v1.json`. Full per-module and per-family data is in `inventory.json`; the totals are in `inventory-summary.json`.

Out of scope here: which questions the engine picks and when. That belongs to Codex's engine-wiring audit, so it is not repeated. The inventory records whether the static module lists name each family, but the engine also draws fresh questions from **every** pool family (`library.ts` `modulePhasePool`). Only 2 of 1,082 families are outside a pool. Those two fields are therefore not counted as teaching gaps.

## How each module's teaching is built

- **312 synthesised modules** (`library.ts`). Each is built around one *seed* family:
  - its selectable explanations (`strategies`: method, the family's `teach.alternatives`, "spot the mistake", "check what it builds on") all use seed-family examples;
  - every other family of the competency gets one **chapter screen** (idea + method + one worked example) in the lesson page and no selectable explanation.
- **24 authored modules.** These use hand-written general strategies (e.g. `same_size_pieces`). The `teach` text of their generator families is not shown anywhere.

## Classification

| Class | Count | What it means |
|---|---|---|
| **Usable existing content** | 336 modules, each with ≥1 reviewed-format strategy; every family has `teach.idea` + `teach.method` and an independent `validate` checker | General teaching exists for every served competency. It is all `pending_review`; none is approved. |
| **Present but disconnected** | **726** non-seed families with a chapter screen only (no selectable explanation, no misconception screen); **41** families in authored modules whose own teaching text is never shown; **848** family `teach.alternatives` (pictures, concrete models, second methods) never offered as an explanation | The material exists in the generator but the engine cannot choose it as teaching. Questions from these families are still asked, graded and diagnosed (G5 G-03/G-06 showed the effect). |
| **Missing or inadequate content** | **4,153 of 4,460** modelled misconceptions (93%) have no misconception-specific explanation. "Spot the mistake" covers one misconception per synthesised module; only linear equations has a full set (8 `fix_*`). **38** families have no alternative explanation. **323** have no everyday/transfer form. Visuals are missing for exterior angles, crossing lines, perimeter outlines and two-strip comparison | Diagnosed difficulties fall back to general teaching. A recheck after teaching can only be a near-copy, not a transfer. |
| **Mathematically wrong content found** | 2 confirmed text defects in existing family content (TP-NUM-03, TP-ALG-01, listed in 05) | Wrong statements shown to learners. Not fixed here; ownership needs coordinating first. |
| **Missing checker support** | Every family has an **answer** checker (`validate`, plus the trusted grader). **Working/method** checkers exist only for 32 modules (equation-statement families with the derivation authority, plus two geometry families through the foundation's adapter, which is not authoritative for method credit). Comparison, measurement, statistics, probability, most geometry and all calculus answers are **answer-only**. | A correct final answer earns no method credit anywhere it is unsupported. This is recorded per package. |

### By strand

| Strand | Modules | Families | Families: chapter screen only | Families: no teaching at all | Family alternatives never offered | Families with no alternative | Families with no transfer form | Modelled misconceptions | …with no specific explanation | Modules with a working checker |
|---|---|---|---|---|---|---|---|---|---|---|
| algebra | 72 | 261 | 180 | 8 | 237 | 13 | 124 | 1070 | 998 | 6 |
| number | 71 | 241 | 159 | 19 | 192 | 13 | 45 | 1188 | 1128 | 24 |
| geometry | 44 | 108 | 68 | 2 | 75 | 0 | 11 | 442 | 404 | 2 |
| measurement | 40 | 131 | 91 | 1 | 88 | 3 | 6 | 514 | 475 | 0 |
| calculus | 29 | 85 | 53 | 4 | 73 | 6 | 54 | 388 | 363 | 0 |
| reasoning | 22 | 52 | 32 | 1 | 35 | 0 | 6 | 169 | 150 | 0 |
| statistics | 18 | 48 | 30 | 2 | 30 | 1 | 8 | 155 | 139 | 0 |
| probability | 14 | 40 | 26 | 0 | 22 | 1 | 13 | 164 | 150 | 0 |
| coordinate | 13 | 67 | 51 | 4 | 60 | 1 | 30 | 214 | 203 | 0 |
| trigonometry | 9 | 34 | 25 | 0 | 25 | 0 | 19 | 115 | 106 | 0 |
| vectors | 4 | 15 | 11 | 0 | 11 | 0 | 7 | 41 | 37 | 0 |
| **all** | 336 | 1082 | 726 | 41 | 848 | 38 | 323 | 4460 | 4153 | 32 |

Caveats:
- A question count or a chapter listing is not counted as teaching.
- "Modelled misconception" means a family `bugs` entry that predicts a wrong answer. It is a hypothesis about learners, not an educator-established misconception.
- Counts are per module (a misconception id shared by two families counts once).

## Why batch 1 is these nine

The common gap is **one pattern**: a non-seed (or authored-module) family whose misconception is diagnosed but never taught. Batch 1 uses that same pattern across six strands and eight grades. It picks classic, high-frequency conceptual errors, and closes the two G5 geometry findings:

| Package | Strand | Grade | Family (class of gap) | Misconceptions |
|---|---|---|---|---|
| TP-NUM-01 | number | 3 | `adfcmp` (authored module; teach text unused) | bigger-bottom-bigger |
| TP-NUM-02 | number | 4 | `fadd` (authored module; **no alternatives, no transfer form**) | add-denominators, multiply-tops |
| TP-NUM-03 | number | 4 | `aedecc` (chapter screen only) | longer-is-larger, shorter-is-larger |
| TP-MEA-01 | measurement | 4 | `aeperar` (chapter screen only) | perimeter-for-area, area-for-perimeter, two-sides |
| TP-GEO-01 | geometry | 6 | `ahext` (chapter screen only; G5 G-03) | third-interior, adjacent-interior, exterior-as-interior |
| TP-GEO-02 | geometry | 5–7 | `afcross` (chapter screen only; G5 G-06) | opposite-as-linear, neighbour-equal |
| TP-STA-01 | statistics | 7 | `akmed` (seed; "spot the mistake" covers 1 of 3) | not-ordered (suspected-error case), mean-for-median, one-middle |
| TP-ALG-01 | algebra | 8 | `ahid` (authored module; teach text unused) | middle-not-doubled, middle-sign |
| TP-PRO-01 | probability | 8 | `akdice` (chapter screen only) | totals-equally-likely, order-ignored, added-sides |

## Next candidates (same pattern, lowest grades first: widest learner reach)

Non-seed or authored-module families with at least one conceptual misconception and no selectable teaching. The list has one family per competency. There are 267 competencies with such a family and 647 family candidates in total.

| Grade from | Strand | Competency | Family | Pool | Alternatives | Transfer form | Conceptual misconceptions |
|---|---|---|---|---|---|---|---|
| 1 | geometry | `geometry.shapes` | `aaflat` | 300 | 1 | yes | only-upright, rectangles-too, only-filled |
| 1 | number | `number.zero` | `aamul01` | 300 | 1 | yes | added-one, gave-one, like-adding-zero |
| 1 | geometry | `geometry.positions` | `aawhere` | 240 | 1 | yes | inside-outside, near-far, front-behind |
| 1 | measurement | `measurement.non-standard-units` | `aaspan` | 300 | 1 | yes | one-must-win, fewer-is-longer, more-units-longer |
| 1 | number | `number.place-value-tens` | `aadigit` | 234 | 1 | yes | face-value, value-not-count, times-ten |
| 1 | number | `number.subtraction` | `aamore` | 300 | 1 | yes | gave-bigger, added, gave-smaller |
| 1 | algebra | `algebra.repeating-patterns` | `aapatu` | 228 | 1 | yes | count-all, count-kinds |
| 1 | number | `number.compare-numbers` | `aagrp` | 243 | 1 | yes | one-must-win, opposite |
| 1 | statistics | `statistics.picture-data` | `abpicmore` | 400 | 1 | yes | added, gave-larger |
| 1 | measurement | `measurement.calendar` | `aaage` | 300 | 1 | yes | birthday-not-yet |
| 1 | measurement | `measurement.length-comparison` | `aaorder` | 180 | 1 | yes | label-order |
| 1 | measurement | `measurement.mass-comparison` | `aaheavyo` | 144 | 1 | yes | order-told |
| 1 | measurement | `measurement.money-totals` | `aamake` | 119 | 1 | yes | rupees-not-coins |
| 1 | measurement | `measurement.time-order` | `aadur` | 300 | 1 | yes | opposite |
| 1 | number | `number.addition` | `aabond` | 184 | 1 | yes | gave-total |
| 2 | number | `number.unit-fractions` | `achalfof` | 240 | 1 | yes | doubled, take-two, quarter-as-half |
| 2 | geometry | `geometry.shape-properties` | `abcurved` | 300 | 1 | yes | curved-as-face, cone-no-corner, sphere-edge |
| 2 | algebra | `algebra.number-patterns` | `abpascal` | 95 | 1 | yes | plus-one, double-the-second, same-difference |
| 2 | geometry | `geometry.maps-directions` | `abdir` | 104 | 1 | yes | left-right, opposite, from-other-end |
| 2 | measurement | `measurement.capacity` | `abjug` | 94 | 1 | yes | steps-as-hundreds, gave-level, top-as-litre |
| 2 | measurement | `measurement.clock` | `abminute` | 300 | 1 | yes | read-the-number, quarter-25, decimal-hours |
| 2 | measurement | `measurement.money-change` | `abneed` | 300 | 1 | yes | coins-as-ones, gave-total, added |
| 2 | measurement | `measurement.standard-length` | `abmeas` | 267 | 1 | yes | read-end, steps-as-metres, cm-not-mm |
| 2 | measurement | `measurement.standard-mass` | `abwunit` | 92 | 1 | yes | unit-slip, number-only, wrong-unit |
| 2 | number | `number.addition-regroup` | `aeaddn` | 450 | 1 | yes | tens-ones-mixed, hundred-lost |
| 2 | number | `number.equal-groups` | `abrep` | 108 | 1 | yes | added-numbers, plus-for-times |
| 2 | number | `number.hundreds` | `abreg` | 400 | 1 | yes | wrote-side-by-side, dropped-extra |
| 2 | number | `number.mental-arithmetic` | `acpart` | 300 | 1 | yes | ones-not-multiplied, tens-as-ones |
| 2 | number | `number.number-line` | `acnlcmp` | 400 | 1 | yes | ones-digit, left-is-bigger |
| 2 | reasoning | `reasoning.operation-choice` | `acstory4` | 320 | 1 | yes | took-away, added |
