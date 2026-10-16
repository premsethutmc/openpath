# Spelling Bee and the owner approval of the 291 questions

**Status:** PR 1 of 3 (the Spelling Bee). My Words and My Books follow in their own PRs.

## Owner approval of the 291 existing questions

**What was approved:**
- **When:** 15 October 2026.
- **Who:** the product owner, explicitly.
- **What:** the existing 79 dictation questions and 212 placement questions, for use in OpenPath.
- **Reconciled against the content:** the 291 are exactly the questions on `content/english/pilot/allowlist.json`
  (212 placement and 79 dictation, all at version 1). No other question was approved.

**How it is recorded:**
- **One record per question** in `content/english/pilot/reviews.json`, the single review record:
  - `decision: "approve"`;
  - `authority: "product-owner"`;
  - the founder's instruction in `provenance`;
  - the time it was recorded in `recorded_at`;
  - the question's id, version and content fingerprint.
- **Made with:** `node tools/english/pilot/review.ts owner-approve`. It refuses unless the counts and identities
  match the allowlist exactly.
- **No earlier dates:** no historical or educator approvals were invented.

**What it means:**
- **It is:** permission to use these questions in the product.
- **It is not:** an independent educator review, a scientific validation, or a measure of psychometric quality.
- **"Verified" mastery** in General English still needs questions validated by an educator, and these are not.
- **Educator review stays available** through the same tool (`review.ts export-pilot` / `import`). Educator records
  carry `authority: "educator"`.

**What changed because of it:**
- **The pilot build** (`build-english.mjs --pilot`) now builds: it offers the 291 approved questions. Its
  boundary is otherwise unchanged:
  - placement and the dictation check only;
  - every approval is exact-version, so editing a question ends its approval;
  - automated content checks still run.
- **`--no-approvals`** builds the pilot with no approvals, to test that it still fails closed.
- **The ~2,300 generated practice words** keep their own review status. None was approved.

## The Spelling Bee

**How it works:**
1. Open OpenPath and tap **Start Spelling Bee** on Home. No starting check, account or upload is needed. After a new
   learner is set up, the app now goes straight to Home.
2. The word is said at once by the phone's own voice: the word, a sentence with it, then the word again.
3. **Repeat the word** and **Hear it in a sentence** say it again. If the browser blocked the first playing, these
   buttons play it on a tap.
4. Type the word and tap **Submit**. Feedback shows:
   - whether it was right;
   - the correct spelling;
   - what was typed;
   - for a miss, that the word goes on the review list.
5. Tap **Next word**. A session is 10 words, with the word number, ✓ and ✗ counts and a progress bar. It ends with a
   summary: right out of 10, any level change, words practised out of 100, and the review list. **Another 10 words**
   carries on.

**The word is never in the page before it is answered:** not in text, attributes or labels. It is only spoken. A
browser test checks this for every word asked.

**If the phone cannot speak:**
- **No voice:** an adult can read each word. The word is shown to the adult only when asked, and hidden again before
  the learner types.
- **Hearing words switched off in Me:** the Bee offers to switch it back on.

### The 100 words (`content/english/spelling/spelling-bee.json`)

**Five levels of 20:** Beginner, Elementary, Intermediate, Advanced and Challenging.

**Where they come from:**
- **79 are the existing dictation questions,** owner-approved as part of the 291. Their word and sentence come from
  the dictation bank, not a copy.
- **21 are new,** owner-approved separately on 15 October 2026, provisionally, for pilot use, subject to the automated
  checks. This is recorded on each entry. It is not an educator review, and the 291 are untouched.
  - 16 everyday words: friend, because, said, school, people, again, water, after, every, little, house, many, animal,
    around and together at Beginner, and laugh at Elementary;
  - 5 for Challenging: rhythm, embarrass, accommodate, mischievous, definitely, with pronunciation hints for an
    adult reader.

**Levels follow the spelling rule each word tests** (15 October 2026), in order of the rule's difficulty. Paired rules
are at one level; four rules are split across neighbouring levels to keep 20 per level. See
[SPELLING_BEE_WORD_REVIEW.md](SPELLING_BEE_WORD_REVIEW.md).

**Spelling policy:**
- British spelling.
- No word in the bank has a variant spelling. The 21 new words are spelt the same in British and American English.
- Words supplied later, in My Words, can list variants, and those are accepted.

### The rules (`frontend/src/english/logic/spelling.ts`)

| Rule | What happens |
|---|---|
| Scoring | The typed word must match the spelling or a listed variant. Capital letters, surrounding spaces and a final full stop do not matter: the same normalisation as every typed answer in OpenPath. |
| Level | Start at level 1. Only answers to words at the current level count. Among the last 5, 4 right moves up a level and 3 wrong moves down. The level stays between 1 and 5. |
| Review | A misspelt word comes back first in the next session, then after 1, 3 and 7 days while it is spelt right. Wrong again restarts it; right at the last step takes it off the list. |
| Session | Up to 4 due review words, then new words at the learner's level, then at the nearest levels: 10 in all. A word spelt right is not asked again while new words remain. When all 100 are practised and nothing is due, the oldest come back, so a learner is never stuck. |
| Claims | A practice level shows how practice is going. It is not a test result or mastery. Spelling Bee answers never change General English estimates, the Learner Vector, or mastery. |

### What is saved, and where

**Every session and answer is saved as events in the learner's own record on the device.** Each answer records:
- the word's id, spelling and level;
- what was typed, and whether it was right;
- the time;
- how often the word was played;
- whether it was a review.

Session starts and ends are saved too. From these, the app rebuilds:
- attempts per word;
- review history;
- accuracy by level;
- session completion.

**How it behaves:**
- **Reloads and restarts:** it survives a reload and a browser restart.
- **Backup:** it is included in **Export a backup**.
- **Deletion:** deleting the learner erases it.
- **Other devices:** nothing syncs between devices; as with the rest of the device-only app, a backup moves it.
- **Older records** open unchanged.

**Where progress shows:**
- **Home:** the Spelling Bee card shows the level, words practised and the review list, or **Carry on** for an
  unfinished session.
- **Progress:** a Spelling Bee section shows the level and a table by level: words practised, and right out of
  answers.

**Pilot builds include the Spelling Bee** (practice only, never engine evidence). Each word goes in only through a
recorded approval:
- **The 79 reused words:** each follows its dictation question's approval in the pilot gate (allowlisted and
  approved).
- **The 21 new words:** each needs its owner approval for pilot use and must pass the content checks. The build
  compiles only those (`beeApprovedForPilot` in `tools/english/pilot/review.ts`).
- **No approvals (`--no-approvals`):** no Spelling Bee, so the boundary still fails closed.
- **Parent material:** a parent's own words (My Words, My Books) are never offered in a pilot build.

A pilot learner opens the Bee straight from Home, with no starting check first (`e2e/pilot-bee.test.mjs`, against a
pilot build made from the recorded approvals).

## Tests

**Recordings (`logic/bee-audio.test.ts` BA-1 to BA-3):**
- all 100 approved words have both recordings, present, intact (sha256), MP3, saying exactly the word and its
  sentence, and named so the name never spells the word;
- the app plays each word's own files, in development and pilot builds;
- the build's check fails on a missing word, a missing or damaged file, a stale script, or a word-named file.

**Real audio in the browser (`e2e/bee.test.mjs`, Chromium playing the real MP3s):**
- the first recording plays by itself, to its end;
- the speaker repeats it, and "Hear it in a sentence" plays the long version;
- moving on, submitting or locking the screen stops the old sound;
- the next word comes by itself;
- a phone that refuses sound no tap started (Chrome's rule applied with the browser's real record of taps, because
  headless Chromium does not enforce it): one tap plays it;
- a recording that cannot load: the voice instead, then "Tap to try again", then the grown-up link, then the recording
  again once the network is back;
- a slow network;
- a phone that lists no voices (Samsung-like): recordings for the Bee, and a parent's list still spoken;
- reload, a full browser restart, and keyboard-only use.


**Unit tests (`logic/spelling.test.ts`):**
- 100 words, 20 per level, unique;
- where each word came from, and its approval status;
- scoring and variants;
- the first session needs no placement;
- level up and down, and its limits;
- planning around levels;
- review timing;
- no unnecessary repeats, and never stuck;
- a session saved, then carried on after a reload;
- the summary counts;
- no effect on the engine;
- a backup round trip;
- in a pilot build: all 100 approved words, none without approvals, only the 79 if the new words' approvals are missing, and an approved word that fails the checks left out (SB-10).

**Browser tests (`e2e/bee.test.mjs`)**, on Chromium emulating an Android phone 412 px wide (not a physical phone):
- from Home to the Bee with no starting check;
- the word is asked aloud and is never in the page;
- Repeat;
- right and wrong feedback;
- the counters;
- a reload mid-session carries on at the same word;
- the summary;
- Home and Progress;
- reopening the app brings back the misspelt word first;
- no sideways scrolling, and buttons big enough to tap;
- no requests to other sites;
- General English still works.

**Sound: recorded audio (16 October 2026).** The 100 words are no longer spoken by the phone's text-to-speech. Each word
has two MP3 recordings, made offline with free tools, in one consistent British English voice:
- the word, its sentence and the word again, which plays by itself when a word appears and from **Hear it in a sentence**;
- the word alone, which plays from the big speaker button.

They are 200 files and about 3.0 MB in all: a median of 23 KB for a sentence recording and 6 KB for a word, mono MP3 at
32 kbit/s. They are served as static files beside the app, fetched only when played (and the next word's ahead of time),
and cached by the browser. They are not part of app.js, not in PostgreSQL, and use no external service. The build
fails if any word lacks a recording, or if a recording no longer matches its word and sentence
(`tools/english/audio/bee-audio.ts`). How they are made: `tools/english/audio/generate.ts`. Licence:
`content/english/spelling/licences/Spelling-Bee-recordings.txt` (CC BY-SA 4.0).

**What the child sees.**
- A big speaker button, the answer box and **Submit**. Each word plays by itself.
- **The speaker:** a tap plays the word again, as often as wanted.
- **If the phone refuses sound until a tap** (Chrome's autoplay rule), the speaker says **Tap to hear the word**.
- **If a recording cannot load** (offline, slow, missing):
  - the phone's own voice says the word instead, when it can;
  - otherwise the speaker says **Tap to try again**;
  - only after two failed tries does a small link offer a grown-up reading.
- **After Submit:** the answer is shown and the next word comes by itself. Right answers show for 1.6 s and wrong ones
  for 3.5 s; **Next word** skips the wait.
- **Stopping sound:** a new word, Submit or the phone locking stops the sound first.
- **No messages about the device's voice.**

**Why Android showed "This device can't say words aloud".** The app spoke only through the browser's speech
synthesis, and only with a voice that the browser *listed* as a local English voice, found within 1.5 s. Chrome on
many Android phones, Samsung's among them, lists no voices (or lists them late) while still speaking with the phone's
default engine. So the app decided the phone could not speak and fell back to "an adult reads". This is most likely,
but it was not confirmed on the founder's phone. The recordings remove the dependency for the 100 words. For a parent's
own words (My Words, My Books), the app now asks the phone's default voice to speak even when no voice is listed
(`speakAny` in `ui/speech.ts`), and tells whether speech actually started.

**Closing the browser.** A browser test closes the whole browser (a persistent profile) mid-session and starts it
again: Home offers **Carry on** at the same word.

**The 21 new words, their approval and the level changes** are in [SPELLING_BEE_WORD_REVIEW.md](SPELLING_BEE_WORD_REVIEW.md), with an
audit of the whole bank.

**To check on a physical phone** (see ANDROID_MANUAL_TEST.md §A8):
- the real voice says each word;
- Repeat works after the browser has been idle;
- the keyboard makes no suggestions;
- carrying on after locking the phone.
