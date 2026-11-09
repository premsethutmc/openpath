# Grade 8 pilot: fresh sample review 2 (GRADE_BUILD.md §3)

Reviewer: independent (did no building). Branch `feat/grade8-pilot`, working tree as found on 2026-11-09. Nothing in the repo was edited.

Method: for each sampled module I ran `frontend/scripts/_review-dump.test.ts` (Grade 8 learner, given board). I also ran a read-only helper from `/tmp` that prints each lesson block's drawn figure, and each question's table or chart, from `teachingLesson()` and `problemOf()`. Every answer key in the dumps was recomputed: medians, parity counts, Fibonacci terms and compound interest by script; the rest by hand. Table- and chart-based keys (afquad, akpar, akhist, akfmean, avfmed) were checked against the question's own figure. Written-task grades come from `content/learning/written.v1.json`. Syllabus gaps were checked against `content/learning/curricula/*-grade-8*.json`.

## Modules sampled (21: 11 CBSE, 10 TN; every strand)

| # | Competency | Board | Strand |
|---|---|---|---|
| 1 | MATH.number.exponential-growth | cbse | number |
| 2 | MATH.number.ratio-division | cbse | number |
| 3 | MATH.number.number-bases | cbse | number |
| 4 | MATH.algebra.figurate-numbers | cbse | algebra |
| 5 | MATH.algebra.generalise-with-expressions | cbse | algebra |
| 6 | MATH.geometry.quadrilateral-classification | cbse | geometry |
| 7 | MATH.geometry.pythagoras | cbse (cbse+tn) | geometry |
| 8 | MATH.measurement.parallelogram-rhombus-area | cbse | measurement |
| 9 | MATH.measurement.unit-conversions | cbse | measurement |
| 10 | MATH.statistics.median-mode | cbse | statistics |
| 11 | MATH.reasoning.parity | cbse | reasoning |
| 12 | MATH.number.compound-interest | tn | number |
| 13 | MATH.number.square-roots | tn (cbse+tn) | number |
| 14 | MATH.algebra.factorisation | tn | algebra |
| 15 | MATH.coordinate.cartesian | tn | coordinate |
| 16 | MATH.geometry.similarity | tn | geometry |
| 17 | MATH.measurement.sectors | tn | measurement |
| 18 | MATH.statistics.histograms | tn | statistics |
| 19 | MATH.probability.sample-space | tn | probability |
| 20 | MATH.reasoning.systematic-enumeration | tn | reasoning |
| 21 | MATH.sequences.virahanka-numbers | tn | sequences |

## CRITICAL

None found. Every answer key and MC key in the 21 dumps checks out against its question (and its table or chart where it has one).

## MAJOR

M1. **quadrilateral-classification, concept section "Classifying quadrilaterals from their sides and angles" (instance gen:afquad:2,56): the working contradicts the table drawn beside it.**
- The section draws the table for afquad:2,56: A square, B rectangle, C parallelogram, D rectangle, E rectangle.
- Its lines come from a different question: "How many of the five are rhombuses? … Name each shape: parallelogram, parallelogram, parallelogram, rectangle, square … 1".
- So the learner is told B, D and E are parallelograms while the table shows right-angled rectangles. The final 1 happens to match.
- Cause: in `teaching-contract.ts` (around lines 241 and 327), the opening section borrows the module's primary example id. The figure then comes from that question, while the lines (`screen.math`) come from the strategy's own example.
- Fix: in the opening section, draw the figure of the question the lines actually work, or rebuild the lines from the borrowed instance. Add a check that fails when a block's lines and figure come from different questions.

M2. **systematic-enumeration, concept section "Counting every combination (one from each group)" (instance gen:afcount:2,2,2): the same mismatch as M1.**
- The table drawn is a canteen menu with 2 mains, 2 sides and 2 sweets (idli/dosa, sambar/chutney, payasam/kesari).
- The text says "The table shows Imran's 2 shirts and 3 pairs of shorts … 2 × 3 = 6".
- Fix: as M1.

M3. **parallelogram-rhombus-area, misconception section "A common wrong answer" (gen:aipara:25,19,1): the explanation is mathematically false.**
- The section says the wrong answer 9.5 for "area 475 cm², base 25 cm, height?" came from "The answer was halved as for a triangle".
- Using the triangle formula would give h = 2A/b = 38, which doubles the answer, not halves it.
- Source: `fam/b09.ts:1124`, bug `halved`, mode 1.
- Fix: reword (e.g. "The answer was halved; for a parallelogram, height = area ÷ base, with no ½"), or model the real triangle confusion (predict 2·A/b and say "½ × base × height was used, as for a triangle").

M4. **number-bases, concept section "A numeral in another base, in base ten" (gen:ajb10:4,272): worked steps carry a false explanation.**
- The zero-digit rows read "0 × 4³ = 0 — 0 × 4 × 3 = 0", "0 × 4¹ = 0 — 0 × 4 × 1 = 0" and "0 × 4⁰ = 0 — 0 × 4 × 0 = 0".
- These treat the exponent as a factor, which is the very misconception this topic must avoid. The non-zero rows have empty explanations.
- Cause: `kernel-adapter.ts:299-305`. The `multiply` evidence joins all step inputs [digit, base, exponent] with "×". It verifies only when the digit is 0, so the bogus line appears exactly on zero digits.
- Fix: give ajb10 its own step explanation ("4³ = 64, and 0 × 64 = 0"), or make the kernel skip power-valued inputs.

M5. **figurate-numbers (CBSE): the Grade 8 learner is opened on Grade 5 content.**
- `affig` is tagged grade 5 on purpose (`fam/b06.ts:1030-1032`: "below-grade review for a Grade 8 learner").
- Even so, the concept section is "Odd numbers … 2 × n − 1", all 8 lesson-practice items are affig (grade 5), and all 3 engine explore questions are affig (grade 5). In the all-right run, 9 of 14 engine items are grade 5.
- The ungraded affigrel and affrule items (links between square, odd and triangular numbers; which rule makes the sequence) are nearer the Grade 8 target but come later.
- Fix: open the lesson and practice queue on affigrel/affrule, give them a grade, and keep affig as review after an error only.

M6. **unit-conversions (CBSE): lesson and practice sit far below the Grade 8 outcome.**
- The CBSE Grade 8 outcome (cbse-g08-t1-c07-o05) is "Convert between units, using proportional reasoning with conversion factors".
- Instead, the concept section is "4 L 605 mL = how many mL?", all 8 practice items are aeconv (e.g. "1 cm 1 mm = how many mm?", "3 L 5 mL"), and the engine opens with "6 L 70 mL" and "5 m 4 cm". That is Grade 4–5 material.
- Conversion factors (aecf) appear once, as section 7 of 10, and once in the engine.
- Fix: lead with aecf (conversion factors, proportional reasoning), add Grade 8-level factor items (e.g. km/h ↔ m/s, area and volume units), and move aeconv/aeparts to remediation.

M7. **coordinate.cartesian (TN): Grade 8 syllabus content is missing.**
- The TN Grade 8 outcomes are "Draw the straight-line graph of a linear relation, including lines parallel to the axes, and read values from it" and "choose a suitable scale".
- The lesson covers only plotting a point, quadrants, moving a point and a rectangle corner. All practice is "coordinates of point A". No family under this competency (b05, b08, b12, b24) covers line graphs or scale.
- Fix: add a straight-line-graph family (table of values for y = mx + c, lines x = a and y = b, reading values off the graph) and a scale-choice item.

M8. **histograms (TN): frequency polygons are missing.**
- The TN outcome is "Draw and interpret histograms and frequency polygons for grouped data".
- Neither the lesson nor any engine item mentions frequency polygons. They exist only in an educator-marked limit note (`fam/b11.ts:2020`). All questions read bar heights.
- Fix: add a lesson section and an auto-marked item on frequency polygons (class mid-points, joining the bar-top mid-points, reading a value).

M9. **similarity (TN): Grade 10 written tasks are served to a Grade 8 learner.**
- Shown to the Grade 8 learner: `wr:sim:bpt-trapezium` (prove the basic proportionality theorem by areas; trapezium diagonals), `wr:sim:chord-products` (intersecting chords, AB² = AD × AC) and `wr:sim:similar-vs-congruent`.
- All three are `grade: 10` in written.v1.json and serve cbse-g10/tn-g10 outcomes. The TN Grade 8 outcome is only "recognise similar triangles (AA, SAS, SSS) and use proportional sides".
- The dump shows "grade null" because `gradeOfQuestion` does not read written-task grades, so the grade filter never fires.
- Fix: filter written tasks by their `grade`, and give similarity a Grade 8 written task (e.g. explain AA similarity, or a shadow/height problem).

M10. **sample-space (TN): a Grade 9 written task asks for untaught probability.**
- `wr:prob:spinner-table` (grade 9, serves cbse-g09-c07-o05) asks for P(sum = 5) and P(sum is even).
- The lesson teaches only counting (the multiplication principle). Probability is never taught, and the TN Grade 8 outcome is counting only.
- Fix: as M9 (grade-filter written tasks), and replace it with a counting/tree-diagram written task.

M11. **systematic-enumeration (TN): map colouring is missing.**
- The TN Grade 8 outcome "Solve attribute-matching and map-colouring puzzles … using as few colours as possible" maps to this competency.
- No map-colouring family exists: `fam/b05.ts:4421` says "map-colouring puzzles are another family", and none was found.
- Fix: add a map-colouring family (fewest colours for a small region graph), or remap the outcome to a competency that has one.

## MINOR

m1. **Empty explanation fields (systemic).** Most worked steps in the sample have an empty explanation ("expression — "). Seen in exponential-growth, ratio-division, number-bases, generalise, quadrilateral, parallelogram, median-mode, parity, factorisation, sample-space, sectors, histograms, similarity, compound-interest, virahanka and unit-conversions. Fix: hide the dash when the field is empty, or supply a one-line reason per step.

m2. **Misconception sections with no reason line (systemic).** These sections show only the wrong answer and "Not X, but Y": number-bases #5, generalise #7, unit-conversions #10, factorisation #5, sample-space #5, systematic-enumeration #7, virahanka #7, similarity #6. Fix: always render the bug's `says` text.

m3. **Tips copied from another question (systemic, same cause as M1).**
- number-bases concept: the tip says "In base 8 the places are worth 1, 8, 64" under a base-4 example.
- sectors concept: under a leaf-in-a-square example, the tip says "The area of the whole circle was found. The light covers only 90/360 of it."
- ratio-division concept: "The value of one part … was given" reads as if the question gave it.
- Fix: build the tip from the section's own instance.

m4. **Strategy text does not match its worked example.**
- exponential-growth "Folding paper" ("adding one sheet at a time") sits on a ₹41/day plan.
- generalise "See the groups in the picture" says "3n + 1 sticks" but works 8n + 5, and there is no picture. Its "Go back to Figure 0" works the normal method, not Figure 0.
- parallelogram "Cut and slide" explains area but works a perimeter question; the engine shows it after an error on a height question.
- systematic-enumeration "Make an organised list" talks about shirts and skirts on a canteen example.
- compound-interest "A year-by-year table" shows only the formula, and on a depreciation example.
- Fix: pair each strategy with an instance of the kind it describes.

m5. **pythagoras: "as in the picture" with no picture.** The concept text "(as in the picture)" and the lines "…, as in the picture." in #1, #5 and #6 appear in blocks whose figure was dropped. The stripping regex (`teaching-contract.ts:398`) handles only `, as in the picture` in `text`, not in `lines` or in brackets. Fix: apply it to lines and to the bracketed form, or keep the figure.

m6. **Missing diagrams where the text needs one.** sectors concept (leaf of two quarter circles), similarity (no triangle diagrams in any section), and the coordinate lesson (no grid in any section, though all practice reads a grid).

m7. **unit-conversions: unrealistic contexts.** "A tablet contains 4 g 150 mg of medicine" and "each tablet has 8560 mg". In the "How many parts make a kilogram or a litre" section, the bars widget title reads "Parts in 1 kg" on a 500 mL / 5 L example.

m8. **sectors: answer-format and notation quirks.** Clock questions say "Give the exact value; a fraction or mixed number is fine" while using π = 3.14, so the answers are decimals (127.17, 47.1, 28.26). The misconception section shows "Not 77/2, but 28"; use 38.5.

m9. **sample-space worked example uses factorial notation** ("arranged in 2! ways"), which is not taught at Grade 8. Write "2 × 1 = 2 ways".

m10. **Worked examples that cite option letters without listing them in the lines.**
- figurate "Which rule makes the sequence?": "option C".
- square-roots "Last digits of squares": "option A: 4".
- Check that the options render. If they do not, name the rule instead.

m11. **compound-interest: the section title promises what its example does not show.** "Compound interest half-yearly or quarterly, and compared with simple interest" works only a yearly CI−SI difference. No half-yearly or quarterly item appears in practice or the engine, although the TN outcome lists them. Also, "₹20000 becomes ₹25538" skips the 1.13² = 1.2769 step.

m12. **Repetitive lessons and queues.**
- median-mode has 11 sections, with near-duplicate misconception/solved pairs (#8/#9, #10/#11).
- Practice is single-type in quadrilateral (6 of 8 "how many rhombuses"), sectors (8 of 8 wipers), parity, enumeration and sample-space.
- Fix: mix question types in the first 8.

m13. **Engine remediation (systemic).**
- In the "wrong twice" path, the same explanation is shown three times in a row (chapter, after guided, after check) in every module.
- In cartesian, the only remedial screen is one line, "Start at (0, 0). Walk x across, then y up". It does not address negatives or axes, which the errors and the guided item ("Which point is on the y-axis?") involve.
- Fix: after the second showing, offer a different strategy or the misconception screen.

m14. **Wording.** histograms akhtab worked step: "The values in the class: 9; there are 1". ratio-division: "1 parts: 1 × ₹180". virahanka coins example: the steps talk about "short/long part" and "Length" for ₹1/₹2 coins.

## Per-module verdicts

| Module | Board | Verdict |
|---|---|---|
| exponential-growth | cbse | Correct and at level; minor: empty step reasons, Folding-paper strategy mismatch. |
| ratio-division | cbse | Correct; minor wording ("1 parts", tip phrasing). |
| number-bases | cbse | **MAJOR** M4 (false "0 × 4 × 3" step reason); keys correct. |
| figurate-numbers | cbse | **MAJOR** M5 (opens on Grade 5 items). |
| generalise-with-expressions | cbse | Correct and at level; minor strategy/text mismatches. |
| quadrilateral-classification | cbse | **MAJOR** M1 (concept working contradicts drawn table). |
| pythagoras | cbse | Correct and at level; minor "as in the picture" with no picture. |
| parallelogram-rhombus-area | cbse | **MAJOR** M3 (false misconception explanation). |
| unit-conversions | cbse | **MAJOR** M6 (Grade 4–5 content in place of conversion factors). |
| median-mode | cbse | Correct; minor repetition. |
| parity | cbse | Correct (18 tables verified); minor single question type. |
| compound-interest | tn | Correct (22 keys exact); minor half-yearly title/example mismatch. |
| square-roots | tn | Correct and at level; minor. |
| factorisation | tn | Correct; minor missing misconception reason. |
| coordinate.cartesian | tn | **MAJOR** M7 (straight-line graphs and scale missing); minor thin remediation. |
| similarity | tn | **MAJOR** M9 (Grade 10 proof tasks); auto-marked keys correct. |
| sectors | tn | Correct (all wiper/sector keys verified); minor tip/format issues. |
| histograms | tn | **MAJOR** M8 (frequency polygons missing); keys correct against charts. |
| sample-space | tn | **MAJOR** M10 (Grade 9 probability written task, untaught). |
| systematic-enumeration | tn | **MAJOR** M2 (concept text contradicts table), M11 (map colouring missing). |
| virahanka-numbers | tn | Correct (21 terms verified); minor. |

## Totals

- Modules sampled: 21 (CBSE 11, TN 10; all 9 strands).
- Modules with a CRITICAL issue: **0**.
- Modules with a MAJOR issue: **10** (number-bases, figurate-numbers, quadrilateral-classification, parallelogram-rhombus-area, unit-conversions, coordinate.cartesian, similarity, histograms, sample-space, systematic-enumeration).
- Findings: 0 CRITICAL, 11 MAJOR, 14 MINOR (several systemic).
- Systemic causes worth fixing once:
  - the opening section borrows its example (M1, M2, m3);
  - written tasks are not grade-filtered (M9, M10);
  - the kernel's multiply evidence treats an exponent as a factor (M4).
