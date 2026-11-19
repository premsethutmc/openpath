# Simulated English learners (sim-english@1)

`frontend/scripts/sim-english.mts` sends made-up learners through the English app's own logic: Find my level, then a
month of one sitting a day in Words, Reading, Listen and write, Listen and answer and Grammar in use. Nothing is drawn
on screen; the same code the screens call is used. It takes about 16 seconds. The full table is SIM_REPORT.md.

## The learners

Eight kinds, twenty of each (different luck each time): barely any English; early; average; strong; an older learner
who reads and listens well but cannot name a noun; one who reads well but hears and spells poorly; a careless one
(one answer in five is a slip); a guesser who taps anything.

Each has a hidden ability in each stream, on that stream's own level scale, never tied to age or class. The chance of
a right answer falls as an item's level rises above that ability; a choice question can also be guessed. Ability
rises a little after a sitting at or above it.

## What it measures

Where Find my level places each learner against the hidden ability; the level each stream reaches after a month;
sittings too hard (under half right) or all right; levels that go up and straight back down; items answered right and
shown again within seven days; streams that throw an error or have nothing to give; how often Find my level sends a
learner to First words.

## Found and fixed (19 Nov 2026)

| Finding | Fix | Before | After |
|---|---|---|---|
| A learner with no English could pass a reading text in Find my level by luck (three choices, three of four needed), and was then not sent to First words | The beginner rule also counts the word check, which has "I don't know" and marks guessing down | Sent to First words: beginner 30%, guesser 85% | 65%, 95% |
| Top levels ran out: an item answered right came back within days | Grammar and Listen and write take new and missed items from the level below before repeating one answered right; Listen and answer takes an unheard passage from the level below | Repeats within 7 days, all learners: grammar 48, dictation 45, passages 47 | 36, 32, 25 |

## Content added after the first run (19 Nov 2026)

| Added | Repeats within 7 days, all learners (before, after) | Other effect |
|---|---|---|
| New words: 20 more at each of the eight levels (90 a level, 720 in all) | none either way | An average learner's Words level after a month: 6.9 to 5.9 |
| Grammar level 7: 24 more sentences (48) | 36 to 2 | |
| Listen and write level 7: 16 more sentences (40) | 32 to 14 | |
| Listen and answer: a fifth passage at levels 1 to 3 (five a level) | 25 to 21 | |

New words were written for OpenPath, rule-checked and screened; every gap question whose choices changed (410) was
read, and 49 look-alike choices that could also fit a gap were kept out.

## Found, not fixed

- **Words still climbs by running out**, now about one level every eighteen days (90 words a level, five a day).
  Missed words come back for review.
- **Listen and answer still repeats** for a learner who hears a passage every day: five passages a level.
- **Levels go up and down often** (grammar about ten times a month for a learner between two levels). This is how a
  staircase finds the edge of what a learner can do, so it is left as it is; the screen shows the level of the day.
- **Find my level places grammar about one level high** for the learner who cannot name a noun (half the runs within
  one level). Practice brings it down within a week, and the noun-and-verb questions already send this learner to
  naming practice first.

## Limits

A simulated learner is a model of answers, not a person: it says nothing about whether a real learner understands a
passage or a rule. The numbers assumed (how fast ability rises, how likely a slip is) are guesses. New words are
modelled like any other item, although the learner has just seen each word's card, so the Words "too hard" column
overstates difficulty.

## Running it

    cd frontend && node --import tsx scripts/sim-english.mts --runs 20 --md ../docs/english/SIM_REPORT.md

The GitHub job "Simulated English learners" runs it every night and on changes to English logic or content. It fails
only if a stream throws or has nothing to give, and uploads the report.
