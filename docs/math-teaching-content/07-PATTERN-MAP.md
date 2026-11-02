# 7. Missing teaching grouped by reusable instructional pattern

`tools/patterns.py` regroups the gap map's untaught modelled misconceptions (01) by the **one teaching strategy** that would address them. It reads `inventory.json` only.

A pattern is one shared explanation, plus family-specific examples and one fix per *distinct* belief. It is not one package per modelled wrong answer: several wrong-answer ids (for example hour-as-100, minute-as-100, paise-over-100, no-carry and past-24) share one strategy.

Grouping uses misconception-id keywords, so a group is a **candidate** until its families are read. Batch 2 read and confirmed the five groups it took. Keyword matching also over-includes: for example `akchance count-only` lands in PARTS, and `aedecc` (batch 1) lands in PLACE.

**Priority score** = competencies + 2 × strands + (9 − lowest grade)/2 + 3 × ease. Here ease is the share of the group's families with an everyday (transfer) form and an existing alternative explanation. The formula weights:
- breadth, since one strategy serves several modules;
- learner reach, since lower grades are taken by more learners;
- integration ease, since existing forms and alternatives are reused.

| Pattern | Strategy | Families | Competencies | Strands | Grades | Non-seed families (no selectable teaching) | Ease | Score | Already covered (batches 1–2) |
|---|---|---|---|---|---|---|---|---|---|
| PAT-REGROUP | Regroup at a unit boundary (60 min, 24 h, 100 paise) | 21 | 12 | algebra, measurement, number, reasoning | 2–5 | 16 | 1.0 | **26.5** | `acmoneyadd`, `addur` |
| PAT-CONVERT | Convert units in the right direction (× or ÷ by the factor) | 13 | 9 | geometry, measurement, number | 2–8 | 11 | 0.96 | **21.4** | — |
| PAT-INVERSE | Undo with the inverse operation; choose the operation from the situation | 10 | 7 | algebra, number, reasoning | 2–9 | 5 | 0.85 | **19.1** | — |
| PAT-SCALE | One symbol or line stands for the key/scale | 9 | 6 | measurement, number, statistics | 2–8 | 5 | 1.0 | **18.5** | `acpicttab`, `afbar` |
| PAT-PLACE | A digit's value depends on its place (whole numbers and decimals) | 11 | 6 | geometry, number | 1–4 | 10 | 1.0 | **17.0** | `aadigit`, `aedecc` |
| PAT-ANGLES | Angle totals: 180° on a line and in a triangle, 360° round a point | 12 | 8 | geometry, trigonometry | 5–11 | 6 | 1.0 | **17.0** | `afcross`, `ahext` |
| PAT-PARTS | The bottom number counts all the equal parts of one whole | 13 | 6 | number, probability | 2–7 | 10 | 1.0 | **16.5** | `adfcmp`, `adfname`, `adshade`, `akchance` |
| PAT-CHANCE | Count equally likely outcomes, not categories or totals | 12 | 8 | algebra, probability | 6–12 | 7 | 0.88 | **16.1** | `akchance`, `akdice`, `anbag` |
| PAT-DISTRIBUTE | Multiply every term (brackets, identities) | 12 | 9 | algebra, coordinate | 7–11 | 10 | 0.67 | **16.0** | `ahid` |
| PAT-INSIDE | Inside or boundary (area/perimeter, volume/surface, circle area/circumference) | 11 | 9 | measurement | 4–10 | 8 | 0.77 | **15.8** | `aeperar` |
| PAT-ORDER | Put data in order before locating (median, ordering) | 3 | 3 | number, statistics | 4–7 | 2 | 1.0 | **12.5** | `akmed` |
| PAT-LIKE | Combine only like units or terms (same-size pieces, like terms) | 4 | 4 | algebra, number | 4–9 | 3 | 0.62 | **12.4** | `fadd` |

## How the batches map onto the ranking

- **Batch 2** took REGROUP (rank 1), SCALE (4), PLACE (5), PARTS (7) and CHANCE (8). It covers measurement, statistics, number and probability. The groups were confirmed by reading the families; for this batch, oracles could read the question's own figure data (tables, bars, grids).
- **Next (batch 3): CONVERT (rank 2) and INVERSE (rank 3).** These two outrank three of the batch-2 patterns and were **not** taken yet:
  - CONVERT spans many unit systems (length, mass, time, imperial), and each needs its own conversion oracle.
  - INVERSE mixes operation choice in word problems, where most single wrong answers are only *suspected*, with inverse operations in missing-number tasks. It needs a reading-versus-operation contrast design before any diagnosis can be established.
- **Batch 1** already holds the first package for ANGLES (`ahext`, `afcross`), INSIDE (`aeperar`), DISTRIBUTE (`ahid`), ORDER (`akmed`) and LIKE (`fadd`). Extending those to their other families reuses the batch-1 strategy text; no new strategy is needed.
