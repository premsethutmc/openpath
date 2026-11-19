# Finer levels for listening and grammar (November 2026)

Status: candidate content, practice-only. Levels are OpenPath's estimates and nothing here is educator-reviewed.

## Why

Listen and write, Listen and answer and Grammar in use each had three levels. One level covered about two school
years, so a child could stay on the same level for a long time and see no movement. Each now has six.

## What changed

| Activity | Before | Now | New content |
|---|---|---|---|
| Listen and write | 3 levels, 120 sentences | 6 levels, 184 sentences | 64 sentences, including a new first level of three- and four-word sentences |
| Listen and answer | 3 levels, 12 passages | 6 levels, 24 passages | 12 passages (about 45, 80 and 125 words) |
| Grammar in use | 3 levels, 130 sentences | 6 levels, 156 sentences | 26 sentences |

- **Listen and write.** 1 very short sentences, 2 short sentences, 3 longer sentences (questions and names),
  4 short forms and commas, 5 long sentences, 6 hard sentences. The old level 2 was split by what a sentence asks
  for (apostrophes and commas or not), the old level 3 by how many hard spellings it holds.
- **Listen and answer.** Passages of about 45, 60, 80, 95, 115 and 125 words. The new top level is stories, so it
  carries no facts that need a source.
- **Grammar in use.** Topics were placed on six levels in teaching order: 1 first sentences, 2 sentence basics,
  3 apostrophes, verbs and joining, 4 describing, comparing and speech, 5 harder grammar, 6 complex sentences.
  Sentences were added where a level had too few to build, so a sitting always has both kinds.
- **Find my level.** The listening part now has four sentences. The first answer moves two levels, later ones
  move one, so every level can be reached from the middle.
- **Starting level by age** (when there is no level check): youngest 1, school age 3, older 4.

## Progress already stored

Stored records keep the level number they were written with. A record written on the six-level scale carries
`scale: 2`; one without it is read through a fixed map (`OLD_LEVELS` in each activity, `logic/scale.ts`):

| Activity | old 1 | old 2 | old 3 |
|---|---|---|---|
| Listen and write, and the listening level from Find my level | 2 | 3 | 5 |
| Listen and answer | 2 | 4 | 5 |
| Grammar in use | 1 | 3 | 5 |

Sentence and passage ids did not change, so what a child has already seen is still known.

## Limits

- Reading still has three levels. Each is a full course (lessons, seven texts, 36 questions), so finer reading
  levels need two new courses written; that is the next piece of work.
- Words (8) and spelling (5) are unchanged.
- The range is the same as before, about Class 3 to Class 8, apart from the easier first level in listening.
  Levels for a true beginner and for advanced English are not built.
- The levels are still set by judgement, not by children's answers.
