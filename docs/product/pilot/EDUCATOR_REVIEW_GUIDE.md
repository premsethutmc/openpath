# Reviewing the pilot questions: guide for the educator

> **Update, 15 October 2026:** the product owner has approved all 291 questions for use in OpenPath
> (`authority: "product-owner"` in `content/english/pilot/reviews.json`; see SPELLING_BEE.md). That is permission to
> use them, not an educator review. An educator's review is still welcome and is recorded alongside, as
> `authority: "educator"`. The review sheet shows each question's current state.

**What you are asked to do:** decide, question by question, whether each question may be shown to children in the
supervised pilot.

**What is in the package:**
- 79 dictation words;
- 212 placement questions.

**Until you approve a question, the pilot version of the app will not show it.** Nobody else can approve on your
behalf, and nothing is approved automatically.

**Time:** about 45–60 minutes for dictation batch 1 (45 words). The whole package takes several sittings.

## The two files

Both files are in `docs/product/pilot/educator-review/`:

| File | Use it to |
|---|---|
| `pilot-questions-review.html` | Read the questions. Open it in a browser, or print it. Each question is numbered and shows its id, version, skill, difficulty, what the child sees or hears, the expected answer, and a tick-box line for your decision. |
| `pilot-questions-review.csv` | Record your decisions. Open it in Excel, Google Sheets or LibreOffice. It has one row per question, in the same order as the printed page. |

You may mark decisions on paper first. Someone can copy them into the spreadsheet afterwards, provided you check the
result and your name goes on each decision.

## What to check for each question

1. **Correctness:** the expected answer is right, and it is the only right answer.
2. **Clarity:** the wording is clear and unambiguous for a child aged 10–12.
3. **Suitability:** the words, sentences and contexts suit the children in this pilot.
4. **Skill:** the question tests the skill named on it.
5. **Difficulty:** compare the question with the difficulty given. This is the author's estimate, from 1 (easy) to 8 (hard).

**For dictation words, also check:**
- The app says the word, then the sentence, then the word again.
- The sentence must make the word clear without being a giveaway.
- Words with more than one accepted spelling were left out on purpose.

## Recording a decision in the spreadsheet

Fill in only the last five columns. **Do not change any other column.** In particular, leave `fingerprint`
alone: it ties your decision to the exact version you reviewed.

| Column | What to write |
|---|---|
| `decision` | `approve`, `reject`, or `request correction` (recorded as "revise"). `discuss` is also accepted if you want to talk a question through first. Leave it empty to decide later. |
| `issues` | **Needed for reject or request correction,** unless you write a comment instead. Choose one or more of: `incorrect answer`, `ambiguous`, `wrong difficulty`, `wrong skill`, `not age-appropriate`, `duplicate`, `cultural or context`, `other`. Separate them with `;`. |
| `comment` | Your reason in your own words. **Needed for reject or request correction,** unless you choose an issue instead. For a correction, say what should change. |
| `reviewer` | **Always needed:** your full name, so every decision says who made it. |
| `date` | **Always needed:** the date, as YYYY-MM-DD, for example 2026-11-02. |

You can return a partly filled spreadsheet. Rows without a decision stay "not reviewed".

## What happens to your decisions

**Recording them (the pilot lead, on a computer with the repository):**
1. Save the spreadsheet as CSV.
2. Run `node tools/english/pilot/review.ts import <your file>.csv`. It checks every filled row, with three outcomes:
   - **a row is missing your name, the date, or a reason for reject or correction:** nothing is recorded, and it lists
     what to fix;
   - **a question has changed since the package was made:** that row is refused, and the new version needs your
     review;
   - **otherwise:** your decisions are added to `content/english/pilot/reviews.json`, with your name, the date and
     the fingerprint.
3. `node tools/english/pilot/review.ts approved` lists the questions a pilot build would now show.
4. `node tools/english/pilot/review.ts status` shows counts of approved, rejected, to-correct and outstanding.

**How your approval limits the app:**
- **Version-specific:** an approval covers that exact version only. If anyone later edits the question (its wording,
  answer, sentence or difficulty), the approval stops counting until you review the new version.
- **Nothing else changes:** the pilot app shows only questions you approved. It offers no lessons and no practice
  words.
- **Questions you reject or send for correction are never shown.**
- **Corrections:** a corrected question comes back to you as a new version.

**Regenerating the package** (after content changes, or to see the current review state in it):
`node tools/english/pilot/review.ts export-pilot`.

## Suggested order

1. **Dictation batch 1:** the 45 words at difficulty 4.5 or below. Most children will meet these first.
2. **Dictation batch 2:** the other 34 words. They are asked of children who spell the easier words well, so they
   are needed before a second session.
3. **Placement questions,** skill by skill. Placement asks up to 24 questions across the skills, choosing
   them by difficulty. A skill with only a few approved questions, or none at the right difficulty, gets a weaker
   starting point (or none).
