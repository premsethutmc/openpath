# Word check (vocabulary size)

*18 November 2026.*

A three-to-five-minute check that estimates how many English word families a learner knows. Open it from
**Word check** on the English home screen.

- 80 words in eight frequency bands (the 1,000 most common words up to about 14,000), ten per band, each with
  three meanings and "I don't know this word".
- Adaptive: three words from a band; up a band when at least two are known, down otherwise; stops after eight
  rounds or once the learner settles between two neighbouring bands (12 to 24 words). No word twice in a sitting.
- A wrong choice counts against the band, so guessing does not raise the estimate on average; "I don't know"
  costs nothing extra.
- The result is worded as rough: "About 4,000 word families. Most likely between 3,500 and 4,500."
- Kept in the learner's record as `vocab` events. Practice-only: it changes no capability estimate, and it is
  hidden in pilot builds.

Content: `content/english/vocabulary/size-check.json`. Logic: `frontend/src/english/logic/vocabulary/`.
Screen: `frontend/src/english/ui/VocabularyCheck.tsx`.

## Limits

- **The bands are our estimates of word frequency, not taken from a measured frequency list.** A word may sit a
  band too high or too low. Real answers should re-band them.
- Ten words a band: a second sitting reuses some words once a band's unseen words run out.
- Three to six words decide a band, so the range is wide for a learner near a band's edge.
- Meanings are in English, so a child who knows a word but cannot read its meaning is under-counted.
- The result is not yet used for anything: it does not choose reading texts or feed the learner's picture.
