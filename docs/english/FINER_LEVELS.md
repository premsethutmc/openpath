# Finer levels for listening, grammar and reading (November 2026)

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

## Reading: five levels

Reading had three levels (texts of about 65, 125 and 185 words). Two full levels were written between them, so
there are five: Starter, Explorer (about 95 words), Builder, Climber (about 150 words), Challenger. Each new level
has six lessons with a worked example, seven texts and 36 questions (`content/english/reading/level-2.json` and
`level-4.json`). The old level files were renamed to `level-3.json` and `level-5.json`; their text ids (L2.*, L3.*)
did not change.

| Skill | Explorer teaches | Climber teaches |
|---|---|---|
| Finding details | use two key words of the question | follow he, she or they back to the name |
| Order of events | what came just before or after | before, after and had: the telling is not the order |
| Why it happened | so points back to the reason | a chain of reasons |
| Feelings and reasons | what a person says and does, together | what kind of person, from several actions |
| Main idea | pick the best title | what the story shows |
| Fact or opinion | how could you check it? | judging words with no "I think" |

- Stored reading records and the reading result of Find my level are read on the new scale: old 1, 2, 3 are 1, 3, 5.
  New ones carry `scale: 2`.
- Find my level starts reading in the middle (level 3), moves two levels after the first text and one after the
  second: two or three texts, and every level can be reached.

## Limits

- Words (8) and spelling (5) are unchanged.
- See ADVANCED_LEVELS.md for the levels added above these and for what is still missing below.
- The levels are still set by judgement, not by children's answers.
