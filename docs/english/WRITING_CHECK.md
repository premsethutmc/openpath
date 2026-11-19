# A rule-based check for writing (November 2026)

Status: candidate, practice-only. It gives notes, not marks, and changes no level.

## What it is

Every writing task has a "Check my writing" button. It runs on the device, costs nothing per use, sends nothing
anywhere, keeps nothing, and gives the same notes for the same text every time
(`frontend/src/english/logic/writing/check.ts`).

| It looks at | Examples of what it says |
|---|---|
| Length | "62 words so far: the task asks for 120 to 180." |
| Capital letters, end marks, the word I | "2 sentences start without a capital letter: ..." |
| Spacing | "Leave a space after a comma or a full stop." |
| About forty misspellings that are never right | "recieve is receive" |
| Ten grammar patterns that are wrong whatever the meaning | "a apple", "she go", "we was", "should of", "did not went", "more better" |
| Style | the same opening again and again; one word repeated; weak words (very, nice); no linking words; a sentence over 35 words; one long block where paragraphs are asked |
| The shape of the task | a letter's greeting and closing; an argument's stated view and reasons; a story's time words |

Notes come in three kinds: something to fix, something to consider, and something done well.

## What it cannot do, and says so on screen

It cannot tell whether the piece is on its topic, whether the ideas or the reasons are good, or whether a
sentence means what the writer intended. Most grammar and spelling mistakes are outside it: only slips that are
certain are flagged, because a wrong note would teach a mistake.

## Why rules and not an AI model

Free to run, predictable, works without a key or a connection, and no risk of a surprise bill. The owner's own
figure for AI essay analysis was about ten rupees for six essays. AI feedback can be added later as an optional
second opinion without changing this.

## Wider lists (19 Nov 2026)

The sure slips moved to `frontend/src/english/logic/writing/slips.ts` and grew:

| Kind | Before | Now |
|---|---|---|
| Misspellings | 40 | 303 |
| Two words written as one (alot, atleast) | 0 | 12 |
| Regular ending on an irregular word (goed, childs, furnitures) | 0 | 69 |
| Missing apostrophe (dont, didnt) | 0 | 22 |
| Message short forms (u, plz, bcoz) | 0 | 20 |
| Grammar patterns | 10 | 26 |

New grammar patterns include: doesn't likes, can went, to went, have went, he don't, they is, I am agree,
Myself Ravi, its a, your not, their is, one of my friend, discuss about, cope up with, return back, a word
written twice. Doubled punctuation marks get a tip.

Three false alarms in the first version were removed: "Does he have", "Did she go" (the he/she/it rule now
fires only where a clause begins), "an A in maths", and "an MBA".

Guards: test WC-9 fails if any listed slip is a word used in our own reading, listening, dictation or guided
texts. A scan of 1,755 of our own texts raised no spelling or grammar note.

Still not done: no dictionary check (a misspelling not on the list passes), no check of meaning, tense
consistency or topic. Lists are my own, not educator-reviewed.
