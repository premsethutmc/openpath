# Grammar in use: learn first, and fuller basics (20 Nov 2026)

## A card before a topic's first sentence

Grammar in use used to show a rule only after an answer, so a learner who did not know a rule had to guess first.
Now, the first time a learner meets a topic (in a level sitting or a syllabus-line sitting), a card comes first:

- the rule in one line, two examples, and one question to try;
- the try shows the right answer; it is not scored, does not move the level and is not an answer record;
- "Now practise" (or "Skip to practice") goes on to the topic's first sentence;
- a card is shown once per topic per learner (a `learn` record is kept with the grammar records).

Cards: content/english/grammar/learn.json, one for each of the 68 topics, checked at load (`learnProblems`): every
topic has exactly one card, a short rule, two examples, one right and two different wrong answers. Screened by the
content screen. Written for OpenPath; not educator-reviewed.

## Fuller basics at levels 1 and 2

Four new topics and top-ups, 68 sentences in all:

| Topic | Level | Sentences now |
|---|---|---|
| Am, is and are (new) | 1 | 10 |
| This, that, these and those (new) | 1 | 10 |
| Words in the right order (new) | 1 | 10 |
| Have and has (new) | 2 | 10 |
| Pronouns | 1 | 10 (was 4) |
| Questions | 1 | 10 (was 4) |
| Capital letters | 1 | 8 (was 4) |
| Plurals | 1 | 10 (was 5) |
| A and an | 1 | 10 (was 8) |
| The simple future | 2 | 6 (was 3) |
| The simple past | 2 | 9 (was 7) |

Level 1 now has 94 sentences (was 41).

## Checks

GU-15 (the card comes first, cannot be skipped past by answering, is not scored, comes once per topic) and GU-16
(each basic topic has at least eight sentences). The simulated learners go through the cards. The phone-sized browser
test shows the card and passes it before every grammar sitting.

## Coming back to a card
- A topic's card is shown again when the learner's last two answers on that topic were both wrong since the card was last seen. The record is marked `again: true`.
- Writing check: grammar, word-form, apostrophe and capital notes carry grammar topics. A "Practise: …" button opens a Grammar in use sitting on those topics, and the draft stays in memory, so the learner can come back to it.

## Fuller cards and more sentences (learn v2, in-use v17, 20 November 2026)
- Each card now also shows a common mistake beside the right version ("✗ He have a dog. ✓ He has a dog.") with a
  one-line reason, and, once the first question is answered, a second, different question (for the learner alone; not
  recorded). "Now practise" comes after both; "Skip to practice" is always there.
- 145 new sentences: every one of the 68 topics now has at least eight (37 had fewer than six, some only three), so a
  topic can be practised for several sittings before anything repeats. Same kinds and levels as each topic's own.
- Checked by rule (learnProblems, grammarProblems, GU-18) and the content screen; not reviewed by an educator.
