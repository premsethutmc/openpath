# Grade 7 coverage (grade7-coverage@1)

Branch `feat/grade7-full-coverage`, from `consolidation/openpath-candidate` @ `61edf73`. Nothing merged or deployed.
Boards: CBSE / NCERT (`cbse-ncert-mathematics-grade-7@1.1.0`, 15 chapters, 56 outcomes) and Tamil Nadu Samacheer
(`tn-samacheer-mathematics-grade-7@1.1.0`, 17 chapters, 54 outcomes).

## Result against the agreed acceptance tests

| # | Test | Result |
|---|---|---|
| 1 | All 110 outcomes built, none partial | **109 / 110.** The one left, `tn-g07-t3-c04-o01` (reflections, translations, rotations and the symmetry they make), now has its content (judged *full* by an independent assessor) but stays *partial* in the matrix for one reason: the prerequisite link rotational-symmetry → transformations is disputed (it would make a cycle) and, by the standing decision, disputed links wait for an educator. |
| 2 | Every Grade 7 problem passes the step-verification bar | **Pass, with one known notation item.** 254 existing families (87 158 questions): the answer-key certification record (`tools/mathematics/answer-key-certification/data/per-question.ndjson.gz`) verifies 87 144; 14 `aipi` questions are *form-notation* (right value, displayed form) as already recorded. 8 families changed or added since that certification (aedecc, aglcm, ahid, ajpf, hcf, lin, lboth, lbrk; 5 151 questions) and the 6 new families (1 562 questions) were certified again by an independent agent that never read the generator code: 0 mismatches, every multiple-choice key the one true option. No Grade 7 question is quarantined. |
| 3 | Teaching, practice, misconception and retention pieces exist; independent sample check | **Pieces exist for all 75 competencies; the sample check found quality defects** (below). The reviewer opened 15 modules and 150 real questions: 5 clean, 10 with at least one defect. |
| 4 | Simulated learner, each board, every chapter end to end | **Pass** (`frontend/src/year/grade7-coverage.test.ts`). CBSE: 43 of 46 competencies verified after a 9-day delayed check, 3 educator-marked constructions awaiting a mark (by design). TN: 48 of 50 verified, 2 constructions awaiting a mark. Nothing unavailable or stalled. **Finding:** after two early mistakes that match no known misconception, 7 competencies pause without teaching because they have no checked general explanation: angle-pairs, decimal-tenths, multiply-divide-powers-of-ten, statistical-questions (CBSE); inequalities, percent-intro, percentage, angle-pairs, decimal-tenths (TN). The learner is told to go through it with a teacher or parent. This is a teaching-content gap the coverage matrix does not show. |
| 5 | TN chapter titles checked | **17 / 17 match** the Samacheer Kalvi Std 7 textbooks (Terms I–III) as listed by independent sources and by scanned copies of the textbooks' contents pages. The official portal (textbooksonline.tn.nic.in) still refuses automated access, so `sourceVerified` is left unchanged in the syllabus file (changing it would re-version the board release); this note is the record. |

## What changed

New families (`packages/learning/src/fam/b24.ts`, all pass `check-family`, all independently certified):

| Family | Competency | Closes | Pool |
|---|---|---|---|
| `ajmilr` millions and billions into lakhs and crores | indian-international-numeration | cbse-g07-t1-c01-o01 | 218 |
| `ajsize` how big is a large quantity (1 crore seconds in days …) | multiply-divide-powers-of-ten | cbse-g07-t1-c01-o04 | 129 |
| `agchange` money word problems: the bill and the change | decimal-operations | cbse-g07-t1-c03-o04, tn-g07-t3-c01-o02 | 500 |
| `ahfibp` patterns in the Virahanka numbers (sums, evens, multiples of 3 and 5) | explicit-recursive-rules | cbse-g07-t1-c06-o03 | 99 |
| `aerot` rotating a point about O (90° either way, 180°) | transformations | tn-g07-t3-c04-o01 | 456 |
| `aetfig` a triangle and its image: which transformation; which symmetry the pattern has | transformations | tn-g07-t3-c04-o01 | 160 |

Fixes found by the independent reviewers:
- `aipi`: the worked step showed `1916 ÷ 610 = 157/50`; it now shows the rounded decimal. The prompt "the fraction 22/7 used in schools used 22/7" is reworded.
- Inequations lesson: said the solutions are always "on the right side of the boundary"; now says which side for <, ≤, >, ≥.
- level@1 grades: `aeineqz` is Grade 7; `aeineqs` (systems), `aeineqw` (modelling) and `aenbhd` (neighbourhoods) are Grade 11, so a Grade 7 learner is no longer asked them.

Outcome-assessment map: six Grade 7 outcomes re-judged (oam@3) by an assessor who did not write the content: all six *full, fit*.
Regenerated: family specs, library, parity, coverage, review registry (changed modules back to draft), coverage matrix,
server grader bundle.

## Open defects (not fixed here)

From the 15-module sample (the other 60 competencies were not reviewed; at this rate similar defects are likely there):
1. Explicit/recursive rules: diagnostics use tₙ₊₁ / tₙ = 4 × 2ⁿ⁻¹ notation (Grade 11 style); the lesson lists t₂, t₃ without working.
2. Algebra simplify: number-pyramid lesson skips a row; the subtraction lesson never states its final answer.
3. Parallel angles and median/mode lessons refer to a table that is not attached; the frequency-table median uses the 9th value of 18.
4. Unit conversions: "8 large units 250 small units" wording; the comparison lesson stops before choosing the sign; one `aewcmp` misconception predicts the right answer.
5. Inequalities: worked steps skip "4x ≤ 13" and the word-problem working.
6. Several mistake explanations carry no predicted answer, so they can never be diagnosed.
7. Seven competencies have no checked general explanation (test 4): a struggling learner is paused, not taught.
8. Nine competencies mapped to Grade 7 are graded 8–11 in the graph (factorisation, identities, inequalities, inverse proportion, linear equations in two variables, polynomials, constructions-bisectors, trapezium area, Euclid's algorithm): their families need level@1 grades so a Grade 7 learner gets only Grade 7 problems. Only inequalities is done.

Recommended next step: a level-and-wording pass over all 75 Grade 7 modules (a reviewer per strand, fixes by a different author, then a fresh sample review), before any educator review.

## Tests on this commit

- `bun test packages/learning/src` (from the repository root): 1 816 pass, 41 skip, 0 fail. One count test updated (1 082 → 1 088 families).
- `frontend/src/year/grade7-coverage.test.ts`: both boards pass (numbers in test 4 above).
- Frontend suite (`tsx --test src/**/*.test.ts`): 877 tests ran before the session's time limit; no failure caused by this branch. Two failures are environmental (no `react` package and no `tsx` package resolution for `node --import tsx` subprocesses: no npm registry here). The content-safety registry test failed until `explanation-review.ts sync` gave the 7 changed lessons new revisions (pending review); after it, `content-safety` and `mathematics-completion`: 24 / 24 pass.
- Not run here: Django tests and browser (Playwright) journeys (no Python packages or npm registry in this environment). CI runs them.
- Regenerated with the CI pipeline (specs, library, parity, coverage, expansion, board releases, coverage matrix) and the server grader rebuilt (`BUNDLER=bun`).
