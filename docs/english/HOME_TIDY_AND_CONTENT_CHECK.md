# Home screen tidy and content check (19 November 2026)

## Home screen

- Once a level is found, the home screen leads with "Your English today" (one row per stream). The activity cards,
  School work and General English are folded behind three buttons and open with a tap.
- Before a level is found, everything is open as before, under the "Start here: find your level" card.
- An unfinished General English activity keeps that section open, so "Carry on" is never hidden.
- Pilot builds are unchanged.

## Content check

A second read of everything written on 18 and 19 November, as a reader rather than the writer.

| Content | Read | Changed |
|---|---|---|
| New words: 400 meanings and sentences | all | 2 meanings, 14 sentences |
| Listen and write: 120 sentences | all | none |
| Grammar in use: 130 sentences | all | 8 sentences |
| Spelling Bee meanings: 100 | all | none |
| Listen and answer: 12 passages, 48 questions | all | sources recorded for the 3 factual passages |

- Meanings fixed: `usual` (was worded as a noun), `robust` (said "healthy", used of a bridge).
- Sentences fixed: awkward "one ..." wording put there to keep "a/an" away from the gap (pang, fragment, ruse,
  dirge, hoax, whim, habit, picture, decade, remnant, malaise), a missing article (frenzy), a superstition used
  as the example (omen), and an example about shutting families out of a village (ostracise).
- Grammar fixed: five sentences where a second, different correction was also valid English (three on keeping
  to one tense, one "if" sentence, one reported-speech sentence) now carry a time word that leaves one answer,
  or were replaced; one reflexive sentence that could be read as correct was replaced; a film title was replaced
  with an invented one; "his" and "her" are now accepted for a puppy's tail as well as "its".
- The three factual passages were checked against sources and stand as written: the bee's waggle dance (direction
  relative to the sun, a longer run for a longer distance), stepwells (western India, cool water, resting places,
  restoration for water) and sea salt (evaporation in pans, no production in the monsoon). The sources are stored
  with each passage.

## Not changed, but noted

- Some word levels look easy for their band (for example idle, shrink, sly and keen at level 5; dwell, loot and
  frail at level 6). They are left until real answers show where they belong.
- This was still a check by the same writer. It is not an educator review.

## The house word screen (added later on 19 November 2026)

The spelling word bank has always been screened by `content/english/spelling/blocklist.txt` (about 190 words:
violence, weapons, alcohol, religion, insults, body and illness words). The practice content written on 18 and 19
November had not been run through it. It now is, by a test (`frontend/src/english/logic/content-screen.test.ts`)
that fails if any listed word appears, as a whole word, in anything a child reads or hears, or if a new content
file is added without being screened.

First run: 14 flags, all fixed.

- `temple` in six sentences (religion is kept out): replaced with fort, palace, park or station.
- `weapon` was itself a taught word: replaced with `lantern`.
- `fat`, `foolish`, `fool`, `bottom` in four meanings or sentences: reworded.
- The Bee word `churches` had a meaning using two screened words: reworded.
- One reading answer choice used `foolish`: now `unwise`.

The screen is a word list, so it catches words, not ideas. It did not flag, and a person should still judge:
funeral and dirge, vengeance, perish, pillage, brawl and loot among the taught words.
