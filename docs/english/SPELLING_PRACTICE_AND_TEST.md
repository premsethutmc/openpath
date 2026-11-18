# Spelling: practice lists, test lists and learning help

*18 November 2026.*

A parent's word list (My Words) is now saved as one of two kinds.

**Practice list** (the default for a new list). The child is learning the words.
- A word the child has never answered is shown and spoken first; the child hides it, then spells it from memory.
- Help on request, a step at a time: how many letters the word has; then one more letter each time, never the
  last; and a look at the whole word, which hides again after three seconds.
- Each answer is checked at once. A miss shows the right spelling with the letters to look at marked.
- An answer reached with help, or straight after being shown the word, does not count as known: the word comes
  back in the next session to be spelt unaided.

**Test list.** The child is being tested.
- Each word is only spoken. The word is never on the page, and no help is offered or recorded.
- Nothing is marked between words. At the end: the score, and each word with a tick or a cross.

**For the parent**, each list in My Words shows its kind and, once tried, a Results line: how many words are right
on the child's own, then every word hardest first (wrong last time and what was written, right with help, not tried,
right on their own).

The Spelling Bee and lists saved before this change behave as before (hear, type, feedback), with the same help
on request and letter marking added.

Logic: `frontend/src/english/logic/spelling-help.ts`, `spelling.ts`, `learner.ts`. Screens: `ui/SpellingBee.tsx`,
`ui/MyWords.tsx`.

## Not done

- **Loading words from a photo.** It needs the Tesseract.js package, and this workspace cannot install packages.
- **A separate parent area.** Lists and results still live in My Words inside the child's app, on the same device.
- The built-in Spelling Bee still has 100 words.
- A word that needed help returns in the next session, not later in the same one.
- Not tried on a physical phone.
- `e2e/parent-content.test.mjs` was updated for practice lists but could not be run here: it needs the account server.
