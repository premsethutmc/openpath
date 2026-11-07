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

## Tests (grade7-coverage@1 commit)

- `bun test packages/learning/src` (from the repository root): 1 816 pass, 41 skip, 0 fail. One count test updated (1 082 → 1 088 families).
- `frontend/src/year/grade7-coverage.test.ts`: both boards pass (numbers in test 4 above).
- Frontend suite (`tsx --test src/**/*.test.ts`): 877 tests ran before the session's time limit; no failure caused by this branch. Two failures are environmental (no `react` package and no `tsx` package resolution for `node --import tsx` subprocesses: no npm registry here). The content-safety registry test failed until `explanation-review.ts sync` gave the 7 changed lessons new revisions (pending review); after it, `content-safety` and `mathematics-completion`: 24 / 24 pass.
- Not run here: Django tests and browser (Playwright) journeys (no Python packages or npm registry in this environment). CI runs them.
- Regenerated with the CI pipeline (specs, library, parity, coverage, expansion, board releases, coverage matrix) and the server grader rebuilt (`BUNDLER=bun`).

# Grade 7 level-and-wording pass (grade7-teaching@1)

Approved next step after grade7-coverage@1. Reviewers and fixers were different agents; nobody reviewed their own work.

## What was done

1. **Teaching contract for all 75 Grade 7 lessons.** Grade 7 is now a stage-2 teaching scope like the Grade 10 showcase
   (`content/learning/teaching-scope-grade7.v1.json`; `teaching-contract.ts` reads both): a worked example is verified
   from the family's own solver when its last step is the checked answer, and a lesson says each thing once.
   Contract violations in Grade 7 lessons: **46 → 1** (factorisation's worked example stays a "Method": its last step is
   a check, as already documented for Grade 10). 37 sections fixed by three agents: `textFor` alternatives written for
   each question's own numbers, family-level method text without stray example numbers, final answer steps;
   6 sections exempted with stated reasons (general unit facts; construction and hand-written modules with no
   generated question).
2. **Skills paused without teaching:** in the simulation, a learner who makes two early mistakes is now taught in
   41 of 46 CBSE and 47 of 50 TN competencies (was 38 and 43). Still paused: the constructions and the two statistics
   modules (educator-marked by design) and, on TN, inequalities (its main family is now Grade 9; see "Competencies shared
   by Grade 7 and Grade 11" below).
3. **Question review of all 260 Grade 7 families** (89 520 questions, 4 strand reviewers, 106 findings) and fixes by
   3 other agents: ~85 fixed (wording, unrealistic contexts, word forms that did not match the typed question,
   implausible distractors, GST rates updated to the 2025 slabs), the rest deferred (below).
4. **Level tags (level@1):** a Grade 7 learner is no longer given Grade 8–11 problems from competencies the boards map
   to Grade 7 (negative exponents, rational-number properties, polynomial division, systems of inequalities,
   tₙ notation, Euclid's lemma …); below-grade families carry their real grade.
5. **Presentation bug fixed platform-wide:** worked-step explanations built from a step's raw inputs could state false
   arithmetic ("5% of 360: 360 ÷ 5 = 18", "280 × 25 = 70") or raw solver traces ("equal: 100 → 100", long floats). The
   op-based fallback now states arithmetic only when it is true of the numbers shown, otherwise only the idea.
6. **Safety checks on every change:** no typed or word answer of any Grade 7 question changed (all 89 520 compared
   before/after). Two fixes that would have moved stored multiple-choice option letters (agrupee distractors, auvexp
   option text) were reverted.

## Fresh sample review (after the fixes, by a reviewer who had not seen the work)

15 competencies, 146 questions: **no wrong answer key; 3 of 15 pass every criterion** (integer-multiply,
linear-equations, data-frequency). The lesson-text problems it found (false arithmetic in worked steps, raw traces)
are fixed in item 5. What remains is structural, not wording:

- **A lesson teaches only the module's main family.** Modules draw practice from every family of the competency, so
  learners are asked things no lesson section teaches (circle area and rings; mode and the mean from a frequency
  table; fraction ↔ percentage conversion; simple interest in profit-loss; HCF × LCM; isosceles triangles).
- **Competencies shared by Grade 7 and Grade 11.** Inequalities ([11]) and sequences ([7–11]) have a Grade 9/11 main
  family, so after level tagging the Grade 7 lesson and diagnostics come from questions a Grade 7 learner is not given.
  The right fix is to split each into a Grade 7 competency (inequations over integers; Virahanka numbers) and keep the
  senior one.
- **Mapping:** some Grade 7 outcomes map to Grade 1–4 content (positions, map grids, whole-unit conversions,
  rational-number properties mapped to TN Grade 7 integers).
- Missing pictures: parallel lines cut by a transversal (`ahname`), a circle with a chord/arc/segment (`aecpart`),
  lattice diagonals (`avlat`) need new picture types.

## Deferred (owner decision)

- **MC options never shuffled** in older families (`eqfrac`, `mul`, `pow`, `mmul`, `fmulw`, `prop`, `pct`, `hcf`): the
  key is usually in the same place. Shuffling changes the stored option letters of past answers, which needs approval of
  a read-only dry run first.
- Distractor fixes that move option letters (`agrupee` three-decimal option, `ahmatch`, `alpred`, `ajudig`).

## Tests (grade7-teaching@1 commit)

- `bun test packages/learning/src`: 1 816 pass, 41 skip, 0 fail.
- `grade7-coverage.test.ts`: both boards pass (43 + 3 awaiting a mark; 48 + 2).
- `content-safety`, `mathematics-completion`, `grade7-board`: 25 / 25 pass. Django and browser tests: CI only.
- Content regenerated with the CI pipeline; explanation registry synced (changed lessons pending review); grader rebuilt.

# Whole-skill lessons (grade7-lessons@1)

Owner decision: a Grade 7 lesson must teach every question type its module practises.

- **Library:** in the Grade 7 scope each extra family of a module gets a lesson section tied to one of its own questions
  (role worked-example), and the teaching contract now checks every chapter section of a Grade 7 lesson, not only the
  first. Before, the lesson checked and showed one family while practice drew on up to seven (circle area: 1 of 7).
- **Result:** 569 Grade 7 lesson sections, 261 worked examples, **260 checked to the answer**; 0 contract violations
  (35 exemptions, each with a reason: construction topics, hand-written sections, aeind's per-step place-value rule).
- **Fixes along the way** (six agents, by file; none reviewed its own work): family idea/method text rewritten without
  stray example numbers; final steps that reach the answer for choice, list and expression families (the option is
  picked and named); HCF × LCM explanation corrected (it said the LCM takes "the rest"); ordering large numbers starts
  at the largest place; "the thousands digit 13" wording.
- **Presentation (all grades):** step explanations no longer carry tags such as "— Calculate percentages." (they
  repeated the idea and could name the wrong skill); kernel steps show the family's written step instead of raw solver
  actions ("multiply: 22/7, 56 → 176") and drop evidence lines with long floats.
- A bug in my first version gave every new section the opening section's question; a fresh reviewer caught it and it is
  fixed (`lessonBlocks`: only the opening section borrows the lesson's example).
- **Safety:** no typed, word or multiple-choice answer or key changed for any of the 89 520 Grade 7 questions
  (`ahlike` options now show x² instead of x^2, same keys).

Fresh review after the fix (10 competencies): every family has its own section with its own worked solution
(10 / 10). Still open:
- the frequency-table median and mean sections and one decimal question refer to a table or options the lesson view
  does not carry (the practice question shows them);
- "solved correctly" misconception sections in blueprints have placeholder text ("Each step, then the answer."); the
  worked lines are there in the app;
- unit-conversion sections still say "large units / small units", and two of their solutions stop before the final
  form; "1 lots of", "For 1 years";
- outcome gaps the lesson cannot close by itself: HCF by an efficient procedure, deciding if three angles form a
  triangle, rectangular pathways and semicircles (served by other competencies' modules), Indian ↔ international in the
  large-numbers lesson (taught in the numeration module);
- lessons are long (up to 12 sections) and the exterior angle is explained several times in triangle properties.

Tests: `bun test packages/learning/src` 1 816 pass, 0 fail; `grade7-coverage.test.ts` both boards pass; content-safety,
mathematics-completion, grade7-board: 25 / 25. Content pipeline regenerated; 96 changed explanations pending review.

# Lesson fixes and the Grade 7 / senior split (grade7-split@1)

- **Lesson view:** a worked question now shows its own options, and its own table or figure when the section draws no
  other picture (`LessonBlock.figure`, `worked.options`; rendered in TeachingContent / ProgressiveWorkedExample).
- **Wording:** unit-conversion steps name the real units (kg and g, m and cm …); the larger-unit and weight-comparison
  solutions end at the answer; "1 lot", "1 year"; the 14 "solved correctly" placeholders say what to watch.
- **Split:** two new Grade 7 competencies, from the syllabus inventory (provisional, prerequisite links pending
  educator confirmation):
  - `MATH.algebra.inequations-intro` [7] (aeineqz) — TN Grade 7 inequations; `MATH.algebra.inequalities` stays Grade 11.
  - `MATH.sequences.virahanka-numbers` [7–8] (ahfib, ahrhy, ahfibp) — CBSE Grade 7 and TN Grade 8 Fibonacci outcomes;
    `MATH.sequences.explicit-recursive-rules` stays the senior topic.
  Released as new versions (records refer to releases by hash; earlier versions stay readable): CBSE Grade 7 1.2.0,
  TN Grade 7 1.2.0, TN Grade 8 1.2.0. Grade 7 coverage unchanged (CBSE 56/56, TN 53/54).
- One-family Grade 7 modules get a second word-problem transfer question (the delayed check needs a fresh one).
- **Open defect:** after two early mistakes the shared engine keeps `inequations-intro` at "learning" (99 of 101 right,
  delayed check passed); right from the start it verifies. Listed as a known stall in `grade7-coverage.test.ts`.

Tests: `bun test packages/learning/src` 1 816 pass, 0 fail; content-safety, mathematics-completion, grade7-board 25 / 25;
grade7-coverage: CBSE pass; TN pass except the known stall. Lesson contract: 562 sections, 253 / 254 worked examples
checked, 0 violations.

## Inequations stall fixed (contexts@1)

Cause: the shared record demonstrates a skill only from answers in at least two kinds of question (typed and a
situation), and answers in the session that taught it do not count. A one-family module (inequations-intro) offered only
typed checks after teaching, so a learner taught it could answer right indefinitely and never demonstrate it. Now, in a
one-family module, when the learner was taught the skill and has answered no situation question on it in a later
session, a fresh check is offered in its situation (word) form (`intervention.ts` `situationFirst`). Multi-family
modules are unchanged. The known-stall entry is removed: both boards pass `grade7-coverage.test.ts`.

Also fixed while running the wider suites: blueprint "solved correctly" texts are now in their generator
(`scale-blueprints.mts`), length-conversion choice solutions end with the picked option, symbolic steps keep their stated
arithmetic, a content-corrections test follows the revision chain to the blocked revision, the scenario provenance oracle
accepts a strategy id selected in two modules in one session, and the mapping-exemplar index is regenerated.
