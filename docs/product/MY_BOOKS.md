# My Books

A parent supplies the text of a book the learner is reading. OpenPath finds activities **in that text only**, and the
parent ticks the ones the learner may see.

The text is kept with the rest of the learner's record:
- **Device-only learner:** on the device.
- **Learner in a parent account:** in the parent's account.

## For the parent

**Home → My Books → Add a book.** The screen first says where books are kept (see below).
- **Title:** up to 80 characters.
- **Text:** paste a chapter or a short story, or open a plain-text (`.txt`) file of up to 200 KB. The text can be up to
  30,000 characters.
  - A longer text is refused with its length shown. It is never cut silently.
  - Word files, PDFs and photos are refused with a reason. **There is no OCR**: text in a photo or a scanned PDF cannot
    be read.

**Find activities** shows everything found, all **unticked**. It is grouped by what each activity actually practises,
with a line for each kind saying what it does and does not check:

| Kind | What the learner does | Needs the book to answer? |
|---|---|---|
| **Spelling practice** | Hears a word from the book and types it (the Spelling Bee's screen and engine) | Not relevant (spelling) |
| **Vocabulary in context** | Fills a gap in one of the book's sentences, choosing from four words from the book | **No.** The sentence shown is enough, so it practises words in context; it does not check that the book was read |
| **Literal comprehension** | "Who is missing from this sentence in the book?", choosing from the book's characters | Yes: what the book says, not reasoning beyond it |
| **Sentence sequencing** | "Which of these comes first in the book?" for two of its sentences | Yes |

**None is inferential comprehension** (reasons, feelings, predictions, themes), and the screen says so. See
"Richer comprehension" below for what that would take.

Each group has **Tick all** and **Untick all**. Notes explain anything missing, for example "only 2 names were found",
or a name left out because every sentence about it has "he" or "she".

**Save:**
- **Save and approve N activities** saves the book with what is ticked.
- **Save without approving anything** keeps the book; the learner sees nothing from it.

**Review** reopens a saved book with its ticks.
- **Changing the text clears every tick, and the new text must be reviewed again.** The record enforces this too:
  approvals are saved with the text's fingerprint and stop counting when the text changes.
- Changing only the title keeps the ticks.

**Delete** removes the book from My Books, after a confirmation. Its text and the learner's answers stay in the
learner's record until the learner is deleted, and the confirmation says so.

## For the learner

- **Practise spelling:** the Spelling Bee's engine and screen, with source `{type: "book", id}`.
  - Each approved word is spoken, then the book's sentence, then the word again.
  - The word is never shown before it is answered.
  - Misspelt words go on the review list.
- **Answer questions:** rounds of up to 10 approved questions.
  - The order is: never answered, then wrong last time, then the longest ago.
  - Each question shows its kind (for example "Vocabulary in context").
  - After each answer, "Right!", or "Not quite." with the answer.
- **Progress per book:** spelling words practised and the number to review; questions right out of those approved.

## How activities are found (`logic/books.ts`, rule version 2)

The rules are fixed and use the supplied text only. The same text always gives the same activities. There is **no AI,
no internet and no dictionary**.

- **Sentences:** a sentence ends at a blank line, or at `. ! ?` followed by a capital letter.
  - "Mr." and similar abbreviations don't end a sentence.
  - Speech such as `“Wait!” shouted Mia.` stays in one sentence.
- **Names:** a word is a name when all of these are true:
  - it is written with a capital in the middle of a sentence;
  - it is never written in lower case;
  - it is used at least twice;
  - it is not a title, a day or a month.
  
  A name always written after a title is used whole ("Mrs. Patel"), so a lone surname does not stand out.
- **Spelling:** words written in lower case, 5 to 20 letters long.
  - They are scored by tricky letter patterns, by length and by how often they are used.
  - The top 20 are offered, each with its first sentence of 30 words or fewer.
  - Accented words are skipped whole.
- **Vocabulary in context:** a word of 6 letters or more is taken out of its sentence.
  - The choices are three other words from the book with the same ending.
  - **New in version 2:** a choice is dropped if the book uses it right next to a word beside the gap (for example
    "a ___" where the book also says "a crumbling …"). Such a word would probably fit as well.
- **Literal comprehension ("who"):** one of the book's sentences, of 5 to 30 words, with a name taken out.
  - The choices are the book's most-used names. It needs at least 3 names.
  - **New in version 2:** a sentence with he, she, him, her or his is never used, because in
    "_____ sighed, but he followed her" the pronoun leaves only the boys' names.
- **Sentence sequencing:** two sentences far apart, of 6 to 30 words; the answer is the earlier one.
  - **New in version 2:** the opening sentence is never used (a story's first line is easy to guess), and neither is a
    sentence that starts with a time word ("Then…", "When they returned…", "At the end…", "On the first day…").

Changing the rules from version 1 to version 2 changed every text's fingerprint. Approvals given under version 1
(development only; nothing is released) no longer count, and the parent reviews again.

## Quality review

Each version-1 activity on two original synthetic stories was checked for known problems:
- `logic/fixtures/book-lantern.txt`: 3 children and a neighbour, little dialogue.
- `logic/fixtures/book-robot.txt`: dialogue, a teacher always called "Mr. Okafor", and many he/she sentences.

Version 2 removes every problem the checks find; `books.test.ts` MB-6 keeps it that way on both stories.

| Problem found in version 1 | Lantern | Robot | Version 2 |
|---|---|---|---|
| "Who": a he/she word narrows the choices without reading | 2 | 1 | 0 |
| "Who": a bare surname after "Mrs."/"Mr." (the only surname among first names) | 1 | 1 | 0 |
| "Which comes first": the story's opening line is the answer | 1 | 1 | 0 |
| "Which comes first": a sentence starts with a time word ("When they returned home…") | 1 | 0 | 0 |
| Vocabulary: a wrong choice also appears next to the gap's neighbour in the book (may also fit) | 0 | 1 | 0 |

**Problems that remain** (why parent review stays mandatory):
- **Vocabulary questions can be answered from the sentence alone.** That is what vocabulary in context is, and it is
  labelled so; it is not reading comprehension.
- **A wrong choice can still fit by meaning.** For example, in "they discovered a _____ stone hut", "burning" is
  grammatical. The rules see letters, not meaning.
- **A "who" answer can be guessed from common sense.** For example, the robot is the one who "rolled across the
  carpet". Sequencing can sometimes be guessed from how stories usually go.
- **A capitalised word that is not a person** (a place or a ship, used twice) can become a "name".
- **There are no questions about why, how someone felt, or what will happen.**

## Richer comprehension (proposal; nothing added)

Inferential questions need something that understands the text. The options are:

| Option | What it gives | Cost | Privacy | Effort |
|---|---|---|---|---|
| **A. Parent-written questions** | The parent types a question, the right answer and two or three wrong ones; the learner answers them like the others. Real inference, written by a person who knows the child | None | Unchanged (saved like the book) | Small: a form in the review screen and a question type, about 1–2 days |
| **B. On-device language model** (an open model running in the browser, for example with WebLLM or transformers.js) | Generated why/how/feeling questions, still reviewed by the parent | No running cost; a 0.5–2 GB download per device | Text never leaves the device | Large. Slow or impossible on mid-range Android phones; quality varies |
| **C. Server-side generation with the Claude API** through OpenPath's existing backend | Good why/how/feeling questions with answers grounded in quoted text, reviewed by the parent | Small per book (see below) plus an Anthropic API account. **A paid service, so it needs founder approval** | **Book text leaves the device** and goes to the API. It needs consent wording, a decision about copyrighted text, and a key stored as a Render secret | Medium: one endpoint, prompt and validation, about 3–5 days |
| **D. Self-hosted open model on a server** | Like C | A GPU server (tens to hundreds of dollars a month) | Text leaves the device, but stays on OpenPath's servers | Large: hosting and operations |

**Cost of C, using published prices.** A 30,000-character book is about 8,000 input tokens. Generating about 10
questions is about 2,000–3,000 output tokens.
- **Claude Haiku 5.5** ($0.10 per million input tokens and $0.50 per million output, for prompts under 100,000
  tokens): about **$0.002 per book**, roughly 500 books per dollar.
- **Claude Sonnet 5.5** ($2 per million input and $10 per million output): about **$0.05 per book**.
- The Batch API halves both.

Source: [Claude pricing](https://platform.claude.com/docs/en/about-claude/pricing). Prices change, so check them before
deciding.

**Recommendation:** add A first. It is free, keeps all text where it is, and gives real inferential questions now.
Decide C separately, as a founder decision about a paid service and about book text leaving the device. Parent review
stays mandatory with every option.

## What is saved, and where

Everything is events in the learner's own record:

| Event | What it holds |
|---|---|
| `book` | The title and the whole text, each time either changes |
| `book_review` | The text's fingerprint and the approved activity ids |
| `book_answer` | The question, the choice made and whether it was right |
| `book_delete` | That the book was deleted |

Spelling answers are `spell_answer` events with the book as their source.

- **Device-only learner** (the private demo, and anyone using the app without an account): this browser, on this
  device. Nothing is sent anywhere.
- **Learner in a parent account:** the learner's record in that account on OpenPath's server, through the existing
  events API. That is what lets the same book be used on a second phone.
  - **Who can read it:** only the parent's own account. Every pupil endpoint checks the owner, and another family
    gets "not found".
  - **Developer diagnostics:** a developer sees another family's pupil only if the parent chose to share it. Even
    then, the book's title and text are removed. Approved activity ids and question ids are replaced by pseudonyms,
    and answers are blanked. The structure and right or wrong stay (`backend/family/developer.py`).
- **The one backend change:** a `book` event has its own size limit, `OPENPATH_MAX_BOOK_EVENT_BYTES` = 140,000
  (other events keep 32,000), so a 30,000-character text fits in one event.
  - Sizes are now measured in UTF-8, as the app measures them.
  - There is no new table, endpoint, login or service, and no change to Render's configuration (the default is in
    `settings.py`).
- **Not in a shared bank.** Book text never goes into a shared content bank.
- **Never engine evidence.** Book activities never change capability estimates, the ledger or mastery.
- **Pilot builds:** no My Books.

## Tests

**Unit tests (`logic/books.test.ts`, MB-1 to MB-7):**
- Everything comes from the text, and the result is deterministic.
- Name rules, including whole titled names.
- Short-text notes and sentence splitting.
- **Approvals:**
  - nothing is shown until approved;
  - only approved activities are shown;
  - a text change drops approvals, even when written straight into the record.
- Shared-engine spelling.
- **Account-backed learner:** books save and reload, and the widest allowed text fits.
- **Quality rules (MB-6):** no he/she giveaways, no lone surnames, no opening line or time-word sequencing, no
  neighbour-fitting choices, and accurate skill labels with nothing called inferential. Checked on both stories.
- **One engine (MB-7):** Bee, list and book answers are all scored by the same function and name their source.
  Editing or deleting a book changes no other progress and loses no answer.

**Backend (`family/test_developer.py`):**
- book text redacted for a developer;
- a stranger gets 404;
- the 140,000-byte book limit, and the 32,000-byte limit for every other kind;
- the widest UTF-8 book is accepted.

**Browser tests:**
- **`e2e/books.test.mjs`** (device-only):
  - a PDF is refused;
  - review, and save without approving;
  - approve, practise spelling, answer questions with each kind labelled;
  - progress, reload, a changed text, delete;
  - nothing is requested from another site.
- **`e2e/parent-content.test.mjs`** (parent account): a book is approved and practised; Zoe's server record holds the
  whole text and the approvals; a second phone shows the book and its progress; another family gets "not found".

All browser tests run on Chromium emulating an Android phone. **Not tested on a physical phone** (ANDROID_MANUAL_TEST.md
§A10).

## Limits

- **Text only:** pasted, or `.txt`; up to 30,000 characters per book; no OCR, PDF or Word.
- **Activities:** deterministic and literal, with the problems above. No inferential questions, no meanings.
- **Long review list** for a long text.
- **A deleted book's text** stays in the learner's record until the learner is deleted. Erasing it sooner needs a new
  endpoint that scrubs stored events (founder decision).
- **One book per learner:** a parent with two children adds it for each. Sharing would need a parent-level store or a
  "copy to another learner" action.
