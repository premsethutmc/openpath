# Reviewer guide: round 1

Thank you for reviewing. You are judging **63 records** for three Grade 8 grammar skills:

- subject–verb agreement;
- present and past simple;
- articles.

The records are 3 competency definitions, 19 lesson parts and 41 questions. Nothing you see has been reviewed by an
educator before. Your decisions decide whether any of it is used with children.

Work alone. Do not discuss items with the other reviewer, and do not look at their workbook, until the coordinator says
both reviews are complete.

## How to work

1. Open `review-workbook.xlsx` in your folder (or `decisions.csv` if you prefer plain CSV).
2. Go in **review order**. The sheets are already in that order (Competencies, Lessons, Questions), and the
   `review_order` column numbers every row. Read each competency's definition before its lessons and questions, so you
   judge them against the same standard.
3. Fill the yellow columns of every row:
   - `reviewer_id`: your code, as given by the coordinator;
   - `decision`;
   - `reason`;
   - `suggested_correction`;
   - `issues`;
   - `date`.
4. Do not edit the white columns or the `fingerprint`. If the content is wrong, say so in `reason` and
   `suggested_correction`.

| Decision | Use it when | Also required |
|---|---|---|
| `approve` | It is correct and usable as it stands. | — |
| `revise` | It is usable after a specific change. | `reason` and `suggested_correction` (the corrected wording) |
| `reject` | It cannot be fixed by a small change, or should not be used. | `reason` |
| `unable_to_determine` | You cannot judge it (e.g. you are unsure of a usage, or it needs another specialist). | `reason` |

`unable_to_determine` is an honest answer, not a failure. It sends the row to a third educator.

`pilot_priority` tells you how the pilot would use a question:

- **required**: needed for one complete learning sequence;
- **optional**: used only if a learner needs an extra later check.

Review both kinds the same way.

## The six things to judge

Record a problem under `issues` using the label in brackets. You can give several labels, separated by `;`.

### 1. Correctness (`incorrect answer`)

- Is the expected answer right in standard written English as taught in Indian schools?
- Is the explanation true, and does it explain *why*?
- For a lesson: is the rule stated correctly, and are all the examples right?

### 2. Ambiguity (`ambiguous`)

- Is the expected answer the **only** defensible one? Try every option.
- For a typed question: would a correct but differently worded answer be marked wrong?
- Is the instruction clear without help from an adult?
- If two options could be right, the question is ambiguous, even if the intended one is "better".

### 3. Difficulty (`wrong difficulty`)

Each question has an estimated band (`difficulty_b`) on the framework's scale. Band 5 is the provisional Grade 8
target; checks of the target use bands 5 to 6.5.

- Does the difficulty fit the question's `pilot_stage`?
  - diagnostic: near the target;
  - guided practice: at or below it;
  - independent and later checks, and retention: between band 5 and 6.5.
- Is the question harder or easier than the estimate? Say which, and why.

These are expert estimates. No question has been calibrated on learners' answers.

### 4. Competency alignment (`wrong skill`)

- Does the question test this skill and not mainly another (vocabulary, reading, spelling, a different grammar point)?
- Could a learner get it right without the skill, for example by elimination or a pattern in the options?
- Does the lesson teach the rule the questions check?

### 5. Age appropriateness (`not age-appropriate`, `cultural or context`)

- Is it suitable for 12–14-year-olds in India: topic, names, vocabulary and reading load?
- Would a learner outside a big city, or from a different background, understand the situation?
- Is anything upsetting, stereotyped or unfamiliar?

### 6. Instructional quality (lessons; use `other` and explain)

- Is the lesson clear, short enough to read in a minute or two, and in the right order on the skill's ladder?
- Do the examples show the rule, including the usual mistake?
- Does the tip help a learner who got it wrong?
- Does the check question have one right answer?
- For questions: does the explanation teach, rather than just restate the answer?

Use `duplicate` for a question that is too close to another one, or that reuses a lesson's example. A check question
that a lesson has already shown cannot show independent skill.

## Competency definitions

For each of the three competencies, also answer the `review_question`:

1. **Target.** Is band 5 the right Grade 8 expectation? The framework describes bands 2, 4, 6 and 8 only.
   - If band 5 is right, write a band-5 descriptor in `suggested_correction`.
   - If it is not, name the band that is.
2. **Prerequisites.** Are they right? All three are listed as "none" for these skills.
3. **Curriculum mappings.** Are they right? Every mapping is marked `validated: false`. If you know an outcome-level
   NCERT or CBSE reference for Class VIII, give it.
4. **Ladder.** Are the lesson steps in the right order of difficulty?

Background: `../../G8_STANDARDS_REVIEW.md`.

## Please do not

- Look at or ask about the other reviewer's decisions before both are complete.
- Write any child's name or details anywhere.
- Change content in the files (corrections go in `suggested_correction`).
- Approve something because it is "nearly right": use `revise`.
