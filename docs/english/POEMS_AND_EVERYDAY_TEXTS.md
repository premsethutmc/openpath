# Poems and everyday texts

A reading activity for kinds of text the passage course does not have: poems, notices, signs, timetables, charts and
tables, menus, letters, emails, postcards, diaries, instructions and recipes, adverts, articles, speeches, travel
writing, a review, a play scene beside its story, and pairs of texts to compare. Levels 1 to 7; level 7 goes past the
passage course's top level (6) for strong Class 7–8 readers; four of its texts run to 420–510 words (a short story, a science feature, a myth retold, a debate).

- Content: `content/english/reading/kinds.json` — 85 texts: twelve at each of levels 1–6 and thirteen at level 7, with poems at every level. All written for
  OpenPath. 4 questions a text at levels 1–4, 5 or 6 at levels 5–7, each with two wrong choices and an explanation.
- Skills asked beyond the passage course: a word's meaning in context, the writer's purpose, point of view (including
  how it makes suspense or humour), figurative language, how a text is set out (rhyme, stanzas, headings, stage
  directions, formal letter layout), comparing two texts, and summing up.
- Logic: `logic/reading/kinds.ts`. Starts at the learner's reading level (Find my level), goes up one after two strong
  texts in a row (four of five or better), down one after two weak ones (under half right). Only texts within one
  level are offered; within a level, the kind met least comes first. Practice-only (`text_read` events); the engine's
  estimates are untouched.
- Screen: `ui/KindsRead.tsx`. The text stays to hand ("Look back at the text"). Poems keep their lines; timetables and
  charts are shown as tables, so nothing scrolls sideways on a phone. Each answer shows why; "This looks wrong?" flags
  a question. Home card "Poems and everyday texts"; a line in the parent view; counted in the usage summary.
- Checks: the house format rules (no right answer much longer than the wrong ones; right answer spread over the three
  places), the word screen, the speller, unit tests KT-1..3, e2e `kinds`.

## Simulated readers

`scripts/sim-kinds.mts` (results in `SIM_KINDS.md`): five simulated readers, 20 runs each, one text every other day
for 70 days. About one text in five is too hard (under half right), texts stay within about 0.8 of a level of the
reader's ability, and strong readers reach level 7. Version 2 (85 texts) gives early, average and careless
readers new texts for the whole ten weeks (31 to 35 texts). Strong readers run out in about half the runs, and very
strong Class 8 readers after about 25 texts, because levels 6 and 7 are where they stay: more level 7 texts are the
next need. (Version 1, 63 texts: every reader ran out after 18 to 29 texts.)

## Classics (version 3, 21 November 2026)

Eleven extracts from public-domain classics (published before 1929), marked "From a classic", at levels 5 to 7:
Stevenson's "From a Railway Carriage" and Sarojini Naidu's "Palanquin Bearers" (whole poems); and prose adapted
(shortened, a few words changed for the house word screen) from Black Beauty, The Wind in the Willows, The Jungle Book,
Treasure Island, Little Women, War and Peace (the old oak; Natasha's dance), Tagore's "The Postmaster" and Pride and
Prejudice. Each says where it comes from and that it is adapted; each has five or six questions, including character
and how the writer creates humour, suspense or a symbol. 96 texts in all: 12 at levels 1–4, 15 at level 5, 16 at
level 6, 17 at level 7. Simulated readers: no reader runs out within ten weeks except the very strong Class 8 reader,
after about 33 texts.

Version 4: eight more classics — Wordsworth's "Daffodils" and Tagore's "Where the Mind Is Without Fear" (whole poems),
and prose adapted from Alice's Adventures in Wonderland, Gulliver's Travels, Oliver Twist, A Study in Scarlet, A
Christmas Carol and Robinson Crusoe. 104 texts: 12 at levels 1–4, 15 at level 5, 20 at level 6, 21 at level 7.
Simulated readers: no reader, the very strong Class 8 reader included, runs out within ten weeks.
