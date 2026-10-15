# My Words

A parent can give the learner their own spelling lists (for example, the school's weekly words) and the learner
practises them on the Spelling Bee's screen, with the Spelling Bee's rules. Lists are kept with the rest of the
learner's record: on the device for a device-only learner, in the parent's account for a learner in a parent account.

## For the parent

**Home → My Words → New word list.** A list has a name and up to 200 words. Words can be:
- **typed** or **pasted** into the box, one per line or separated by commas, semicolons or tabs;
- **uploaded** from a `.txt` or `.csv` file (up to 100 KB). Its words are added to the box, so they can be checked and
  edited like typed ones. Other file types (Word, PDF, photos) are not read.

`colour/color` gives a word with an accepted alternative spelling: either is marked right.

**Check the words** shows the words that will be saved, each with a **Remove** button, and a **Not added** list that
says, for every entry left out, what it was and why:
- it has numbers (`b4`);
- it has characters other than letters, an apostrophe, a hyphen or single spaces (`hello!`);
- it is longer than 30 letters;
- it is already in the list (capital letters ignored);
- the list already holds 200 words.

Empty lines and empty entries between commas are ignored and counted. **Nothing valid is dropped without a reason
being shown.**

**Save the list** keeps it. **Edit** reopens it with its words in the box; **Delete** removes it (after a
confirmation).

## For the learner

**Practise** on a list starts a session on the Spelling Bee's screen:
- each word is spoken (word, then a sentence if there is one, then the word); a parent's list has no sentences, so
  only the word is said;
- **Repeat** says it again;
- the word is never written on the screen before it is answered (checked by the browser test, which searches
  everything visible or read aloud by a screen reader);
- typed answer, **Submit**, then right or wrong feedback with the spelling.

A session is up to 10 words: misspelt words due for review first, then words not yet practised, then the least
recently practised. A list of 4 words is a session of 4.

## Progress

Each list shows: words practised out of its size, right out of answers, and how many are on the review list. It is
per list: practising one list does not change another's numbers.

**Editing a list keeps history.** Each word's identity is its lower-case spelling, so a word that stays in the list
keeps its answers and review date; a new word starts fresh; a removed word's answers stay in the record but no longer
count towards the list.

## What is saved, and where

- A list is a `word_list` event in the learner's own record: the whole list (id, name, words and variants) each time it
  is saved. Deleting adds a `word_list_delete` event.
- Answers are the Spelling Bee's `spell_answer` events, with the source `{type: "list", id}`: every answer can be traced
  to the list it came from.
- **Where lists are kept.** The same place as the rest of the learner's record, and the My Words screen says which,
  before anything is typed (see below).
  - **Device-only learner** (the private demo, and anyone using the app without an account): this browser, on this
    device. Nothing is sent anywhere.
  - **Learner in a parent account:** the learner's record in that account on OpenPath's server, through the same
    append-only events API as every answer. That is what lets a list made on one phone be practised on another, and
    keeps progress with the right learner.
- **Who can read a list.** In a parent account, only that parent's account: every pupil endpoint checks
  `parent = the signed-in account`, and another family gets "not found" (browser test and backend tests).
  - **Developer diagnostics.** A developer sees another family's pupil only if the parent chose to share it for
    diagnostics. Even then the list's name and words are removed, and every word asked from a list (with the typed
    answer) is replaced by a pseudonym. Counts, times and right or wrong stay (`backend/family/developer.py`
    `redact_parent_content`; backend tests).
  - **Shared content bank.** Lists never go into one.
- **Backup, delete and limits.**
  - Lists are included in **Export a backup** (device) and the account export (parent account).
  - Deleting a list removes it from My Words. Like every event in OpenPath's append-only record, it stays in the
    learner's record until the learner is deleted, and the screen says so.
  - One saved list must fit the server's single-event limit (32,000 bytes); 200 ordinary words use about a third of
    it. A list that would not fit is refused before anything is saved, with a reason.
- **No change to accounts.** No new login, database table, setting or service: the existing pupil record is used
  as it is.
- Older records open unchanged.
- **Pilot builds:** My Words is not offered.

## One engine

My Words adds no second dictation engine. `logic/spelling.ts` plans sessions, scores answers and keeps review dates
for every source; `logic/wordlists.ts` only reads, checks and stores lists. The screen (`ui/SpellingBee.tsx`) is the
same component, with the list's name as its title.

## Tests

**Unit tests (`logic/wordlists.test.ts`, MW-1 to MW-7; `logic/spelling.test.ts` SB-11):** separators, quotes and a
byte-order mark; every kind of problem reported, and every entry either kept or reported; variants and the list text
round trip; save, practise with variants, progress per list, editing keeps history, reload, backup, delete; a name and
words are required; no My Words in a pilot build; a learner in a parent account saves, practises and reloads lists, and an oversized list is refused before saving (MW-6); editing or deleting a list leaves the Spelling Bee, other lists and every earlier answer untouched, and the same word in two lists keeps two histories (MW-7); screen wording never contains the word being asked.

**Browser test (`e2e/mywords.test.mjs`)**, on Chromium emulating an Android phone 412 px wide (not a physical phone):
type and paste a list with mistakes, see each problem; upload a CSV; remove a word; save; practise all four words with
the word never perceivable before it is answered; a variant accepted; the summary; per-list progress; reload; edit;
delete; no sideways scrolling; no page errors.

**Parent account (`e2e/parent-content.test.mjs`, with the API):** the screen says where lists are kept; a list is
made and practised; the record on the server holds the list and three answers traced to it; a second phone signed in
to the same account sees the list and its progress; another family gets "not found" for the pupil, its record and its
export. **Backend (`family/test_developer.py` ParentContentTests):** the parent reads the list in full; a stranger
gets 404; a developer sees a shared pupil's list redacted and its words pseudonymised; a developer's own pupil in full;
the stored record is unchanged.

## Not done (founder decisions)

- **One list for several children:** a list belongs to one learner. A parent with two children types it for each.
  Sharing a list across a parent's learners needs either a parent-level store (a new table and endpoints on the
  existing account API) or a "copy to another learner" action that writes the same event into the other learner's
  record (no backend change). The second is the smaller step.
- **Erasing a deleted list's words from the server** before the learner is deleted needs a new endpoint that scrubs
  stored events; the record is append-only today.

**To check on a physical phone** (ANDROID_MANUAL_TEST.md §A9): the phone's file picker, the real voice, and that
nothing is lost after closing Chrome.

## Limits

- Only `.txt` and `.csv` files; no Word, PDF or photos (no OCR).
- Letters, apostrophes, hyphens and spaces only: no accented letters.
- No sentences for parent words, so the word is said on its own.
- No levels for parent lists: every word is practised, in the order above, without level changes.
