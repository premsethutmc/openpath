# New words, and Listen and write

Two practice activities in the English app, added 18 November 2026. Both are practice-only: they write their own
records (`word_learn`, `dictation`) and never change a capability estimate. Both are hidden in pilot builds.

## New words

- **What the child does.** Meets up to five new words a day: the word (it can be heard), what kind of word it is,
  a short meaning and a sentence. Then two questions on each: "which meaning fits?" and "which word fits the gap?".
- **Coming back.** A word right first time returns after 1 day, then 3, then 7, and then counts as learnt. A word
  missed goes back to the start and returns the next day. A missed question is shown with its answer and asked once
  more before the sitting ends. Words due again are asked before any new word (at most ten a sitting).
- **Level.** Eight levels, the same bands as the word check. The child starts one band above the last band the word
  check found known, or by age if no check was done. "I know this word already" skips a word for good; a child who
  says that for most of a level moves up.
- **Content.** 400 words, 50 per level (`content/english/vocabulary/daily-words.json`), written for OpenPath. No
  dictionary text is used. Rules checked on every load: the sentence uses the word exactly once, no "a/an" before
  the gap, the meaning does not use the word, verbs' meanings start with "to", no word of the word check is taught.
  Wrong choices are words of the same kind at the same level; where another word would also fit a gap it is listed
  as never offered. All gap questions were read once with their choices (version 2: 400 words).

## Listen and write

- **What the child does.** Hears a sentence (normal or word-by-word slowly, as often as wanted) and types it.
- **Marking.** Word by word, lined up so a missing or extra word does not spoil the rest: right, misspelt, right
  but for a capital letter, missing, extra. The end mark is checked. Commas are not marked. `apologized` is
  accepted for `apologised`; otherwise British spelling.
- **Two tries.** The first check says what to fix ("One word is not spelt right", "Check one capital letter")
  and marks the child's own words, without showing the sentence. After the second try the sentence is shown.
- **Levels.** Three: short sentences, longer ones with questions, names and short forms, and hard ones. Four or
  five of five right first time moves up; none or one moves down. Sentences not right first time return in a later
  sitting (two at most), after which new ones come first.
- **Content.** 120 sentences, 40 per level (`content/english/dictation/sentences.json`), written for OpenPath.
- **Typing.** The box turns off the phone's auto-capitals, auto-correct and spell-check, so the child's own
  spelling is what gets marked.

## Parent view

Each child's card shows words learnt and still being learnt with the ones found hard, and sentences right first
time with the words missed.

## Limits

- The levels of words and sentences are OpenPath's estimates, not measured, and nothing is educator-reviewed.
- The sentence is read by the phone's own voice. How clear that is varies by phone and has not been checked on a
  physical phone. The automated tests have no voice, so they check the screens and the marking, not the sound.
- Some phone keyboards ignore the request to switch off auto-correct.
- 400 words is ten days of new words per level, or 80 days across all levels.

## Spelling Bee meanings

Each of the Bee's 100 words has a short meaning written for OpenPath (`content/english/spelling/bee-meanings.json`),
shown with the word's sentence after the child answers, never before. Not shown in pilot builds.
