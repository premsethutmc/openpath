# Number-band audit (PR #377 follow-up) — 27 Nov 2026

Status: **proposed patch, not merged, not deployed.** Base: `main` at `0343213` (PR #377 merged as `5a2fb51`, live).

## Scope

Families eligible for number-band classification: a generated family with **no explicit grade** whose skill is first taught
in Class 1–3. 160 families. The 36 Class 1–3 families that give their own grade were not touched by #377 and are not
touched here.

| Instance kind | Count |
|---|---|
| Parameter combinations in the domains (159 enumerable families) | 5,634,492 |
| Invalid generator instances (rejected by the family) | 3,371,643 |
| Valid but not sampled (cap) | 2,219,615 |
| Released problems (all 160) | 43,684 |
| Released presentations (typed 43,684 · MC 36,723 · everyday-situation 43,684) | 124,091 |
| Not selectable (quarantined presentations) | 552 |

`aecol4` (19.6 billion combinations) is sampled, not enumerated.

Full export (every released presentation: id, competency, first class, explicit grade, prompt, answer, figure, detected
amounts, detected pattern step, class on main, class if read from that format, class with the patch, selectable, offered in
phase pool) is attached to the report as `number-band-audit-data.zip`.

## What #377 does on main

Classes on main (typed problems): 40,667 unplaced (= first class), 484 Class 2, 469 Class 3, 2,064 Class 4.
It reads numbers back out of the question's words and table.

## Defects found on main

1. **False growing patterns.** Any three numbers in a row going up evenly count as a pattern step, in any question.
   56 problems (150 presentations) are moved up a class only by that: digit cards `1, 5, 9` (step 4 → Class 2),
   `₹10 / ₹6 / ₹2` (step 4), two-way tables, `86, 52, 18` (step 34 → Class 3), repeating `2, 5, 8` patterns (which repeat,
   not grow), coin tables. Families: aagreat 4, aamake 6, aaordn 2, aaways 10, abenough 8, adtwo 21, aapatn 5.
   Acceptance cases: `gen:aagreat:57,0` (95), `57,1` (15), `77,0` (85), `77,1` (25) are Class 2 on main; `gen:abenough:6,2,6`
   is Class 2 on main (false step 4). All are Class 1.
2. **Date filter discards real quantities.** If the words contain "January", "year", "date" …, every number 1900–2100
   is dropped. 17 released presentations lose a real quantity: 2,021 books (adcolx), 1,997 visitors (aecol4),
   1,900 kg (aeest), ₹1,953 sales (aernd). No class changes today only because those skills start in Class 3.
   `gen:aecol4:0,1995,1995:w` (valid, not released) drops both 1,995s. Calendar years in Class 1 calendar families are
   correctly ignored, but by accident of range, not role.
3. **Indian grouping.** Only the last comma is removed: `3,72,004` is read as 3 and 72,004. 711 aernd presentations.
   No class change today (still Class 4).
4. **Pictures not read.** Coins, pictographs and number lines are ignored; only tables are read. A ₹100 note in a
   "which is worth the least" picture stays Class 1 (43 problems); number-line ends a child must read are ignored.
5. **Format.** Every format is classified from the typed form (cache by parameters). Reading each format's own text would
   disagree on 1,257 presentations (MC: the answer is a letter; everyday-situation: different wording, including a false
   step in `advenn`). One class per problem is right (one exposure), but it must come from the problem's numbers, not from
   the typed wording.

## Proposed patch (number-band@2)

- Each generator declares its numbers by role: `band(p) → { amounts, labels?, step? }` (34 families). The numeric answer is
  added centrally. `labels` (calendar years) are never counted. `step` is declared only by real sequence tasks (`acgrow`,
  `adseq`). Nothing is read from the wording.
- A family without `band` stays in the class its skill starts in. A test reads every released screen (words, answer,
  table, coins, pictograph) in every format and fails if one shows a number above its class that is not a declared label:
  a new or changed generator must declare its numbers.
- Explicit family grades are unchanged. One class per problem across typed / MC / everyday-situation (by parameters).

## Before and after (selectable typed problems on the class the skill starts in)

| Competency | First class | Released | Main | Patch | Δ |
|---|---|---|---|---|---|
| algebra.repeating-patterns | 1 | 928 | 923 | 928 | +5 |
| measurement.money-change | 1 | 762 | 664 | 672 | +8 |
| measurement.money-coins | 1 | 300 | 264 | 221 | −43 |
| measurement.money-totals | 1 | 914 | 807 | 823 | +16 |
| number.compare-numbers | 1 | 1,227 | 1,224 | 1,226 | +2 |
| number.place-value-tens | 1 | 1,083 | 1,079 | 1,083 | +4 |
| statistics.tables | 1 | 1,286 | 1,265 | 1,286 | +21 |
| number.number-line | 2 | 1,300 | 709 | 682 | −27 |
| number.rounding | 3 | 3,578 | 2,698 | 2,563 | −135 |

Moves: 219 problems, 657 presentations. Back to the first class (false patterns): 150 presentations. Up a class:
aacoin 1→2 (129: a ₹100 note is in the picture), acnlpos 2→3 / 3→4 (108: line ends of 1,000 / 10,000 the child reads),
aechk 3→4 (270: estimates of 10,000 and more, and the wrong answers shown, which the child must judge).
No competency loses adequate practice: the smallest of the 53 Class 1–3 competencies still has 80 on-class problems (unchanged), the smallest changed one 181 (growing patterns, unchanged by the patch); the six competency phases with
fewer than 12 on-class diagnostic problems are unchanged by the patch (small families, not band-related).

## Tests (expected classes written by hand, never computed by the classifier)

Limits 99|100, 999|1000, 9999|10000; steps 2|3, 10|11; calendar labels vs a quantity of the same value; Indian grouping;
the six acceptance cases; non-pattern questions with accidental progressions; genuine sequences; Class 1 learner
selection (`withinGrade`), grade order (`gradeRank`) and lesson practice (`alignedPractice`) against those hand classes.
The earlier tests are kept; they check consistency, not educational validity.

## Not resolved by this patch

1. **Grade order for older learners.** For a Class 3 learner, a Class 2-band question of a Class 1 skill ranks as
   "below grade" (asked later) while the easier unplaced Class 1 questions rank on grade (asked first). Pre-existing
   since #377.
2. **Diagnostic questions are ordered by class, not limited by it.** `learnerDiagnosis` ranks; it does not apply level@1.
   18 of 165 Class 1–3 diagnostic questions are above the skill's first class (6 band-placed: acgrow, acnlpos, aacoin),
   so a younger learner can be asked them once on-class ones run out.
3. **Curriculum placement, not band:** `aaage` (age in completed years from DD/MM/YYYY) sits in Class 1 through the
   calendar competency; `aacalpat` (calendar moves of 6–8) is treated as grid movement, not a growing sequence.
4. MC distractors (e.g. 110 for "just after 19") are not counted, by design: they are predicted wrong answers.
