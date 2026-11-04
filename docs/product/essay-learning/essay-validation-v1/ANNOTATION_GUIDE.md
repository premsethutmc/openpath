# Annotation guide: Grade 8 essay benchmark

You will annotate 15 short synthetic essays and rate 3 rewrites. The essays were written for testing by the
development team; **no real child wrote them**. Your annotations will test the synthetic reference answers that
OpenPath's essay evaluator is measured against. Where you disagree with the reference, your judgement is the point.

**Work independently.**

- Do not open `REFERENCE.md` or another annotator's file until you have finished.
- Use your own copy of `annotation-template.csv` (one row per mark) and `rewrite-ratings-template.csv`.
- `annotator_id` is your initials or a code. Never write a child's or a colleague's full name.

## What to mark

Mark what a Grade 8 English teacher in India would mark in standard written English. Indian and British usage is
standard, so do not mark it.

| `kind` | Use it for | Example |
|---|---|---|
| `error` | A genuine error a teacher would correct and could explain by a rule | "She say the road is safe" (agreement) |
| `style` | Correct, but could be clearer or shorter: a preference, not an error | "In my opinion, I think" (repetition) |
| `strength` | Something done clearly well that shows the competency (optional) | "Although homework can feel tiring, …" (subordination) |
| `ambiguous` | You are unsure, or competent writers disagree. Say why in `note` | "After the match ended we walked" (introductory comma) |

**Acceptable variation is not an error.** None of these are errors:

- British or Indian spelling (colour, practise as a verb);
- "different from" or "different to";
- singular *they* ("Everyone has their own style");
- "data is" as a mass noun;
- starting a sentence with "And" or "But";
- "at weekends";
- a missing serial comma ("lunch and after school").

**Separate the competencies.**

- An error belongs to the competency whose rule it breaks. Use the `competency_id` values in `competencies.csv`.
- If one span breaks two rules, add two rows. For example, a comma splice is a sentence-boundary error
  (`EN.SEN.CMP.run_ons`) and may also be a comma error (`EN.GRM.PUN.commas`).
- If the same rule is broken several times, mark each place.

**Possible slips.** One lapse in a form the writer uses correctly elsewhere is still an `error`. Write "possible slip"
in `note`. A single essay is never enough to say a learner lacks a competency; that is decided later, by questions.

**Do not draw unsupported conclusions.**

- Mark only what is in the text.
- The absence of errors is not mastery: a correct essay gets no marks, or only `strength` marks.
- Do not mark a competency the essay gives no chance to show.

## How to fill each column

| Column | Content |
|---|---|
| `annotator_id` | Your code |
| `essay_id` | As in ESSAYS.md (for example `b03-articles-prepositions`) |
| `quote` | The **exact** words from the essay, as short as possible but enough to show the error (usually 2–6 words). The scorer refuses a quote it cannot find word for word. |
| `competency_id` | From `competencies.csv` |
| `kind` | `error`, `style`, `strength` or `ambiguous` |
| `correction` | The corrected words (for errors and style) |
| `note` | One sentence: the rule, or why it is ambiguous |

A worked example:

```
annotator_id,essay_id,quote,competency_id,kind,correction,note
T1,b01-agreement,She say,EN.GRM.VERB.sva,error,She says,Third-person singular needs -s.
T1,b07-concision,"In my opinion, I think",EN.SEN.PRE.concision,style,I think,Says the same thing twice.
T1,b13-boundaries-commas,After the match ended we walked,EN.GRM.PUN.commas,ambiguous,"After the match ended, we walked",Introductory comma: expected by many teachers but not always required.
```

## Rewrite ratings

Each rewrite rewrites one essay in 20–50 words. Rate each dimension on its own, comparing with the original essay and
its prompt:

| Rating | Meaning |
|---|---|
| `not_yet` | The dimension is not met |
| `partly` | Met in places, with clear problems |
| `mostly` | Met, with small problems |
| `fully` | Fully met |

The dimensions:

- `meaning_preservation`: keeps the original's main ideas and its answer to the prompt, without new claims.
- `grammar`: standard written English (valid variation is fine).
- `coherence`: the ideas connect logically.
- `clarity`: each sentence is understood on first reading.
- `concision`: no wasted words. Being close to 50 words is not required.

## After annotating

Send your two CSV files to the review lead. They score them with:

```
node tools/english/educator/annotation-score.ts vs-reference annotations.csv --ratings ratings.csv
node tools/english/educator/annotation-score.ts agreement annotations.csv --ratings ratings.csv
```

The first command scores each annotator against the synthetic reference. The second scores annotators against each
other (put all annotators' rows in one file). The scores report:

- precision and recall on errors;
- errors marked on valid text;
- competency-level agreement (Cohen's κ);
- rewrite-rating agreement (exact, and within one step).

Disagreements between annotators, and with the reference, are then discussed and resolved. The agreed annotations
replace the synthetic reference in a new benchmark version, so the reference becomes educator-validated only then.
