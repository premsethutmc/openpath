# Parent view (English)

*18 November 2026.*

Open **For parents: word lists and results** at the bottom of the English home screen and answer the grown-ups
sum. The view lists every child in this account, or on this phone when there is no account.

For each child: when they were last active, on how many of the last seven days they practised spelling, their word
check result, their Spelling Bee level, each word list with its kind and standing (right on their own, with help,
wrong, not tried, and the last test score), and up to six words to work on.

**Word lists and results** opens that child's lists: add a practice or a test list, edit, delete, and read the
word-by-word results. The child finds the list under My Words. The parent view never starts a child's practice
or test.

Logic: `frontend/src/english/logic/parent-view.ts`. Screens: `ui/ParentView.tsx`, `ui/MyWords.tsx` (`parentOf`).

## How parent and child are connected

**Same account.** A parent account holds its pupils, and a phone without an account holds its own learners. A
parent signed in to the same account on another phone sees the same children and their results.

**A code, for two phones with no email or password (link@1, branch `feat/family-link-code`).** On the child's
phone: For parents → Connect another phone → Show a code. On the parent's phone: For parents → Connect another
phone → type the code. The parent's phone is then signed in to the child's account and sees the same children,
in English and maths alike. The code is eight characters, works once, lasts 15 minutes, is stored on the server
only as a keyed hash, and a new code cancels the last (`backend/family/link.py`).

- A phone that types a code leaves the account it was in; children already on it stay in that account and are
  not merged.
- The joined phone stays signed in by its session only. If that ends, it needs a new code.
- **The server part has not been run.** This workspace has no Django, so `backend/family/test_link.py` (four
  tests) and migration `0015_familylinkcode` are written but untested. They must pass in CI before this is merged.

## Not done

- The sum is a child-gate, not security: anyone who can multiply gets in.
- Reading and maths results are not in this view; it covers spelling and the word check.
- Loading words from a photo inside the app (see `SPELLING_PRACTICE_AND_TEST.md`). The editor tells parents to use
  the phone's own text scanner and paste.
- Not tried on a physical phone, or against the account server.
