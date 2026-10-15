# Educator review: the consonant-doubling journey

**For:** a qualified primary English teacher or literacy specialist.
**Time needed:** about 60–90 minutes.
**What you need:** `doubling-educator-review.xlsx` (this folder). If you want to see the screens, there is also the demo
(`frontend/out/journey-demo/index.html`, made by `npm run english:demo-journeys`).

## Why we are asking

OpenPath's doubling journey checks a child's spelling on their own, teaches if needed, practises with hints and then checks
again on new words. All the content was written by the developer. **None of it has been reviewed by an educator.** Until it
is, the app treats every answer as provisional: answers are shown to the parent, but they never change the child's levels
and can never support a claim that the child has mastered the rule.

Your decisions are the only route to "validated". Nothing is switched without a named reviewer and a date in the workbook.

## What to review (115 rows)

| Sheet | Rows | Please check |
|---|---|---|
| Questions | 16 | Six are new (spl.infl.26–31): words that must not double, asked in the check after each lesson. One right answer; the root word or meaning is clear; the sentence suits 7–11-year-olds; application (must double) or contrast (must not double) is labelled correctly; the ambiguity risks we list |
| Lessons | 3 | The learning objective; whether the explanation is accurate; the misconception it could create; whether the check after teaching would notice it |
| Hints | 9 | Each of 3 levels for 3 lessons. Level 3 is now a labelled worked example that shows the answer: please check its wording |
| Practice words | 12 | Prompt and answer; whether all-doubling practice is a problem |
| Thresholds | 15 | Whether the draft numbers (4 practice words, 2 of 2 new words right, 3 approaches before a person, 7 days) seem sensible for children. Your view is recorded; changing them is a separate decision |
| Parent wording | 52 | Every sentence a child or parent sees in the journey: accurate, clear, not discouraging |
| Overgeneralisation | 8 | Statements we think are too broad (below) |

## The main concern: the rule is stated too broadly

Doubling depends on spelling pattern, syllable structure and stress. A short vowel alone is not a universal rule. The lessons
are accurate for the one-syllable words the journey uses, but they state the rule in a way a child could carry too far:

- **w, x, y never double:** fix → fixing, snow → snowing, play → playing.
- **Longer words depend on stress:** begin → beginning, but visit → visited, open → opening (and UK travelled, US traveled).
- **A short vowel sound is not enough:** head → heading, panic → panicking.
- **Only endings that start with a vowel:** sad → sadly, ship → shipment.
- **qu:** quit → quitting doubles although two vowel letters come before the t.

Two design issues flagged earlier have since been changed, pending your review: the check after each lesson now includes a
word that must not double (so a child who learns "always double" no longer passes it), and hint level 3 is now a labelled
worked example, recorded as showing the answer. Practice words still all double.

Please decide each flag. We suggest fixes on the sheet. None of the lesson-wording fixes (OG-1 to OG-5, OG-8) has been
applied: changing lesson wording is your call.

## How to fill it in

1. Only the yellow cells are for you. Orange cells are our concerns; grey is an example of the format.
2. For each row choose **Approve**, **Approve with changes**, **Reject** or **Needs discussion**, and add your initials and the date.
3. For changes, write the exact new wording.
4. The **Summary** sheet counts what is still undecided and how many questions are ready to switch.

## What happens next

- Approved questions are switched from `provisional` to `validated` one by one, with your initials and date recorded in the
  content file and the change reviewed in a pull request.
- "Approve with changes" is switched only after the change is made and you have re-checked it.
- Lessons and hints with an open overgeneralisation flag stay provisional.
- Your threshold opinions go to a separate decision; no threshold changes as part of this review.
