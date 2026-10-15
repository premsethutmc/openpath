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
- **79 are the existing dictation questions,** now owner-approved. Their word and sentence come from the dictation
  bank, not a copy, and their levels follow the bank's difficulty estimates, in order.
- **21 are new,** chosen for the Spelling Bee and marked in the file as not part of the 291 and awaiting the owner's
  review:
  - 16 everyday words for Beginner: friend, because, said, school, people, again, water, after, every, little,
    house, laugh, many, animal, around, together;
  - 5 for Challenging: rhythm, embarrass, accommodate, mischievous, definitely, with pronunciation hints for an
    adult reader.

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

**Pilot builds:** a pilot build offers no Spelling Bee. It is not on the pilot allowlist, and 21 of its words are
not approved. Adding it to a pilot is a separate decision.

## Tests

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
- no Spelling Bee in a pilot build.

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

**To check on a physical phone** (see ANDROID_MANUAL_TEST.md §A8):
- the real voice says each word;
- Repeat works after the browser has been idle;
- the keyboard makes no suggestions;
- carrying on after locking the phone.
