# My Books

A parent supplies the text of a book the learner is reading. OpenPath finds spelling words, vocabulary questions and
comprehension questions **in that text only**. The parent ticks the ones the learner may see. Everything stays on the
device.

## For the parent

**Home → My Books → Add a book.**
- **Title**, up to 80 characters.
- **Text:** paste a chapter or a short story, or open a plain-text (`.txt`) file (200 KB at most). The text can be up
  to 30,000 characters.
  - A longer text is refused with its length shown. It is never cut silently.
  - Word files, PDFs and photos are refused with a reason. **There is no OCR**: text in a photo or a scanned PDF cannot
    be read.

**Find activities** shows everything found, all **unticked**, in three groups:
- **Spelling words:** up to 20, each with the book's sentence that is spoken with it.
- **Vocabulary, fill the gap:** each with its sentence, its choices and the answer.
- **Comprehension, from the story:** each with its sentence or choices, and the answer.

Each group has **Tick all** and **Untick all**. Notes explain anything that is missing, for example "only 2 names were
found".

**Save:**
- **Save and approve N activities** saves the book with what is ticked.
- **Save without approving anything** keeps the book, and the learner sees nothing from it.

**Review** reopens a saved book with its ticks.
- **Changing the text clears every tick.** The new text must be reviewed again.
- This also holds in the record itself: approvals are saved with the text's fingerprint and stop counting if the text
  changes.
- Changing only the title keeps the ticks.

**Delete** removes the book, after a confirmation. The learner's answers stay in their record.

## How activities are found (`logic/books.ts`)

Activities are found by fixed rules, from the supplied text only. The same text always gives the same activities.
There is **no AI, no internet and no dictionary**.

- **Sentences:** a sentence ends at a blank line, or at `. ! ?` followed by a capital letter. "Mr." and similar
  abbreviations don't end one, and speech such as `“Wait!” shouted Mia.` stays in one sentence.
- **Names:** a word is treated as a name when all of these are true:
  - it is written with a capital in the middle of a sentence;
  - it is never written in lower case;
  - it is used at least twice;
  - it is not a title (Mrs, Dr, …), a day or a month.
- **Spelling:** words written in lower case, 5 to 20 letters long.
  - They are scored by tricky letter patterns (double letters, -ough, -tion, ie/ei, silent letters, -ous, -ible/-able,
    and others), by length, and by how often they are used.
  - The top 20 are offered, each with the first sentence of 30 words or fewer that uses it once.
- **Vocabulary (fill the gap):** a longer word (6 letters or more) is taken out of its sentence.
  - The choices are that word and three other words from the same book with the same ending (-ed, -ing, -ly, -s or
    other), in alphabetical order.
  - Up to 10 are offered.
- **Comprehension:**
  - **Who:** one of the book's sentences with a character's name taken out. The choices are names from the book. It
    needs at least 3 names; up to 5 are offered.
  - **Which comes first:** two of the book's sentences, far apart. The answer is the earlier one. It needs at least 6
    sentences; up to 3 are offered.

**What it cannot do:**
- explain what words mean (there is no dictionary);
- ask about feelings, reasons, themes or predictions;
- summarise;
- read photos or PDFs.

All of these would need a text-generation service or a dictionary, which is a founder decision: it would mean a paid
API or a backend, and book text leaving the device.

**The rules can make a poor activity.** For example, two choices might both fit the gap, or a capitalised word might
not be a name. That is why nothing reaches the learner without a parent's tick.

## For the learner

- **Practise spelling** uses the Spelling Bee's engine and screen, with source `{type: "book", id}`.
  - Each approved word is spoken, then the book's sentence, then the word again.
  - The word is never shown before it is answered.
  - A misspelt word goes on the review list.
- **Answer questions** shows a round of up to 10 approved questions, one at a time. The order is: never answered, then
  wrong last time, then the longest ago. After each answer it shows "Right!", or "Not quite." with the answer.
- **Progress per book:** spelling words practised and the number to review; questions right out of those approved.

## What is saved, and where

Everything is kept as events in the learner's own record on this device:

| Event | What it holds |
|---|---|
| `book` | The title and the whole text, each time either changes |
| `book_review` | The text's fingerprint and the approved activity ids |
| `book_answer` | The question, the choice made and whether it was right |
| `book_delete` | That the book was deleted |

Spelling answers are `spell_answer` events with the book as their source.

- **Private to the device.**
  - My Books is offered only for a learner whose record is kept on this device. For a learner saved in a parent
    account (stored on the server), the Home card explains this and offers nothing, so book text never reaches the
    server.
  - Nothing is sent to any site, which the browser test checks. Nothing goes into a shared content bank.
  - Books are included in **Export a backup**, which the parent controls, and erased with the learner.
- **Never engine evidence:** My Books never changes a capability estimate, the ledger or a mastery claim.
- **Pilot builds:** My Books is not offered.

## Tests

**Unit tests (`logic/books.test.ts`, MB-1 to MB-5)**, on an original synthetic story (`logic/fixtures/book-lantern.txt`):
- Every word, sentence, choice and answer comes from the text:
  - filling a gap restores the book's sentence;
  - "which comes first" really comes first;
  - ids are unique;
  - the result is deterministic.
- Name rules, and the note shown when there are too few names.
- Short-text notes; abbreviation and speech splitting.
- **Approvals:**
  - nothing is shown until approved;
  - only the approved activities are shown, and invented ids are dropped;
  - shared-engine spelling with the book's sentence;
  - an unapproved question is refused;
  - a title change keeps the approvals, and a text change drops them, even when it is written straight into the
    record.
- No evidence; backup; delete.
- Refused for a parent-account record, for an over-long or empty text, and in a pilot build.

**Browser test (`e2e/books.test.mjs`)**, on Chromium emulating a 412 px Android phone (not a physical phone):
- a PDF is refused, and the `.txt` story is read;
- review, then save without approving: nothing is offered;
- approve 3 spelling words, the vocabulary questions and one comprehension question;
- practise spelling:
  - only approved words are asked;
  - the word is never perceivable before it is answered;
  - the book's sentence is spoken;
- answer the questions, with each right answer worked out from the story;
- per-book progress;
- reload;
- a changed text clears the ticks;
- delete;
- no sideways scrolling, no page errors and no requests to other sites.

## Limits

- Plain text only (pasted, or `.txt`), up to 30,000 characters per book. No OCR, PDF or Word.
- Activities are deterministic and simple: no meanings, inference or open questions (see above).
- English letters only. Accented words are skipped as spelling candidates.
- The review list is long for a long text; the parent has to scroll.
- **Not tested on a physical phone** (ANDROID_MANUAL_TEST.md §A10).
