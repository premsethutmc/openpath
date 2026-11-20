# Find my level, and the English streams

Added 18 November 2026. English is organised as streams, each with its own level. A learner first finds a level,
the home screen then says where to go, and school work is a separate section.

## Find my level

About ten minutes, four parts, each adaptive. Any part can be skipped (the app then starts by age there).

| Part | What is asked | Level it gives |
|---|---|---|
| Words | The word check cut to four rounds (up to 12 words) | A band out of 8; New words starts one band above |
| Reading | One practice text of the course with four questions, then one text a level up or down | Three of four passes a level; reading starts at the highest level passed (level 1 if none) |
| Listening | Three dictated sentences, one try each, up after one whose words are right (capitals and the end mark are not counted here; one slip allowed in a long sentence) | The highest level passed |
| Spelling | Six dictated Spelling Bee words, up after a right one, down after a wrong one | The highest level spelt right (of 5); the Spelling Bee starts there |

Grammar is measured by the engine's own starting check (15 to 20 questions, real evidence), which the result
screen offers as the last step and the home screen keeps offering until it is done. It is kept separate so the
quick parts stay practice-only and the engine's evidence rules are untouched.

Listening and grammar have six levels since November 2026 (see FINER_LEVELS.md); the listening part has four sentences.

The levels are first estimates from a few answers on OpenPath's own scales. There is no single English number.
Each stream keeps moving its level as the learner practises. The check can be taken again.

## Home screen

- Before a check: one card, "Start here: find your level".
- After it: "Your English today", one row per stream (Words, Reading, Listening, Spelling, Grammar and
  rules) with its level, the next thing to do, a tick once something was done today, and a Go button.
- Then the practice cards, then **School work** (My Words and My Books: material a parent or the learner brings),
  then the existing General English plan.

## What the levels steer

- New words teaches at the band found. Listen and write starts at the level found. The reading course recommends
  units at the level found first, with lower levels still open.

## Limits

- Practice-only: none of this is evidence for the engine, and it is hidden in pilot builds.
- The six spelling words are not marked as practised, so the learner meets them again in the Spelling Bee.
- The reading part uses four practice questions per text; a learner later meets those questions again in practice.
- School work by class is not built: English lessons follow each textbook's own texts, which OpenPath does not copy.

## Home screen (20 November 2026)

One way in: before Find my level, the home screen shows "Start here: find your level" and, below it, "Or choose an
activity" as a short list (one row per activity, its button beside its name). After it, "Your English today" leads
with the five daily rows, and "More to practise" lists only what the rows do not already open (Long reads, Listen and
answer, Spelling Bee, Word check). School work is a short list too. General English (the older journey of skills and
checks, with its own starting check) is folded away unless the learner is already on it or has an activity open in
it, so a new learner no longer sees two different "starting points". The parents' link is always shown.
