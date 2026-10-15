# My Words

A parent can give the learner their own spelling lists (for example, the school's weekly words) and the learner
practises them on the Spelling Bee's screen, with the Spelling Bee's rules. Everything stays on the device.

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
- **On this device only.** My Words is offered only for a learner whose record is kept on this device. For a learner
  saved in a parent account (whose record is stored on the server) the Home card explains this and offers nothing, so
  a parent's words never reach the server. Nothing is sent anywhere, and parent lists never go into the shared content bank. They are
  included in **Export a backup** and erased when the learner is deleted.
- Older records open unchanged.
- **Pilot builds:** My Words is not offered.

## One engine

My Words adds no second dictation engine. `logic/spelling.ts` plans sessions, scores answers and keeps review dates
for every source; `logic/wordlists.ts` only reads, checks and stores lists. The screen (`ui/SpellingBee.tsx`) is the
same component, with the list's name as its title.

## Tests

**Unit tests (`logic/wordlists.test.ts`, MW-1 to MW-6; `logic/spelling.test.ts` SB-11):** separators, quotes and a
byte-order mark; every kind of problem reported, and every entry either kept or reported; variants and the list text
round trip; save, practise with variants, progress per list, editing keeps history, reload, backup, delete; a name and
words are required; no My Words in a pilot build; not offered for a learner saved in a parent account (MW-6); screen wording never contains the word being asked.

**Browser test (`e2e/mywords.test.mjs`)**, on Chromium emulating an Android phone 412 px wide (not a physical phone):
type and paste a list with mistakes, see each problem; upload a CSV; remove a word; save; practise all four words with
the word never perceivable before it is answered; a variant accepted; the summary; per-list progress; reload; edit;
delete; no sideways scrolling; no page errors.

**To check on a physical phone** (ANDROID_MANUAL_TEST.md §A9): the phone's file picker, the real voice, and that
nothing is lost after closing Chrome.

## Limits

- Only `.txt` and `.csv` files; no Word, PDF or photos (no OCR).
- Letters, apostrophes, hyphens and spaces only: no accented letters.
- No sentences for parent words, so the word is said on its own.
- No levels for parent lists: every word is practised, in the order above, without level changes.
