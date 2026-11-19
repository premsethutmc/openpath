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

## Found, not fixed

- **Words climbs about one level every two weeks whatever the learner knows.** Each level has 70 words and five
  are taught a day, so a level's new words run out in two weeks and teaching moves up. Missed words do come back for
  review. The fix is more words per level (content, not logic).
- **Top levels are still thin for a learner who does every stream every day.** Grammar level 7 has 24 sentences,
  Listen and write level 7 has 24, and Listen and answer has four or five passages a level.
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
