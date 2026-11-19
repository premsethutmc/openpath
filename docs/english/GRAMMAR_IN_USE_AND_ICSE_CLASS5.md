# Grammar in use, and the ICSE Class 5 English syllabus

Added 19 November 2026. Both are practice-only and hidden in pilot builds.

## Grammar in use

- **Fix.** A sentence has one wrong word. The child taps it and types the right word. The wrong word is never
  marked on screen. Capital letters count only where the correction itself has one (July, It's).
- **Build.** The words of a sentence come as tiles, sometimes with one or two that do not belong. The child taps
  them into order.
- **After each answer** the right sentence and a one-line rule are shown.
- **Sitting.** Eight sentences, at least three of each kind, no topic more than three times. Six or more right
  moves the level up, three or fewer down. Missed sentences return in a later sitting.
- **Levels.** 1 Sentence basics (30 sentences), 2 Class 5 grammar (58), 3 Harder sentences (42): 130 in all, over
  30 topics (`content/english/grammar/in-use.json`), written for OpenPath, British usage.
- **Topic sittings.** The syllabus screen can start a sitting on chosen topics. It does not move the level.
- The home screen's Grammar row now shows this stream's level. The older starting check is still under General
  English.

## ICSE (CISCE) Class 5 English syllabus

`content/english/syllabus/icse-class-5.json`, shown under School work.

### Source (not official)

- Read: a third-party copy of the Class V pages of the CISCE curriculum (English: printed pages 24 to 30), hosted
  by BYJU'S: <https://cdn1.byjus.com/wp-content/uploads/2019/03/ICSEClass-5-Syllabus.pdf> (accessed 2026-11-19).
  The pages do not name their publisher or year. They were read through a text summary of the PDF.
- Not read: the official document on <https://cisce.org/>, which could not be reached from the build environment.
- CISCE is understood not to prescribe a textbook for Class V, so a school's book and term plan may order or
  extend these topics. **The list should be checked against the learner's own book and term plan.**
- No curriculum text is copied: each line is in OpenPath's own words with a pointer to its strand.

### Coverage: 33 lines

| Strand | Lines | In the app | Partly | Not yet |
|---|---|---|---|---|
| Listening and Speaking | 9 | 0 | 1 | 8 |
| Reading and Writing | 13 | 4 | 4 | 5 |
| Grammar and Vocabulary in Context | 10 | 8 | 2 | 0 |
| English Literature | 1 | 0 | 0 | 1 |
| **All** | **33** | **12** | **7** | **14** |

- Not yet: all speaking, listening passages with questions, paragraph and story writing (being built separately),
  project work, and literature (the app holds no literary texts).
- The tenth grammar line (simple and compound sentences, punctuation) is named in the strand's content, not as a
  numbered outcome; it is listed so it can be practised.
- Each line that is practised has a button to its stream. Grammar lines open a sitting on their own topics.

## Limits

- Classes 4, 5 and 6 are loaded (see below). Classes 1 to 3, 7 and 8 need their own documents read.
- Grammar levels are OpenPath's estimates. A built sentence must match the expected order exactly, so a rare valid
  alternative order would be marked wrong; the tiles' capitals and punctuation are chosen to leave one order.
- Idioms are not yet practised; only a small set of proverbs and phrasal verbs.

## Classes 4 and 6 (added later on 19 November 2026)

Same method and the same kind of source: third-party copies of the CISCE pages hosted by BYJU'S, read through a
text summary, labelled unofficial in the app.

- Class IV, printed pages 19 to 23: <https://cdn1.byjus.com/wp-content/uploads/2022/08/ICSE-Class-4-Syllabus.pdf>
- Class VI, printed pages 1 to 15: <https://cdn1.byjus.com/wp-content/uploads/2019/05/ICSE-board-class-6-Syllabus.pdf>

| Class | Lines | In the app | Partly | Not yet |
|---|---|---|---|---|
| 4 | 25 | 7 | 5 | 13 |
| 5 | 33 | 12 | 7 | 14 |
| 6 | 46 | 10 | 10 | 26 |

- Class 6 splits Reading and Writing into two strands and has far more speaking and writing lines, which is why
  its "not yet" count is high.
- 25 grammar sentences were added so every grammar line has practice: capital letters in titles, the apostrophe
  for one owner, punctuating spoken words, I and me and the -self forms, pronouns that match their nouns,
  agreement across a phrase, keeping to one tense, and the perfect tenses.
- Not practised from Class 6: transitive and intransitive verbs, prefixes and roots, figures of speech.
- The syllabus screen has a class selector and opens on Class 5.
