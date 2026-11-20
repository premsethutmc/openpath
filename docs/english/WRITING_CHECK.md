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

## Grammar check, second round (19 Nov 2026)

Grammar patterns: 26 -> 59, plus a tip for a question that ends in a full stop.

| Group | Examples caught |
|---|---|
| Doer and verb | they goes, the children is, many people has, everyone are, there is many |
| Verb form | was went, I am go, have see, am knowing, am having two brothers, can able to, look forward to meet, enjoy to play |
| Time words | yesterday I go, tomorrow we went, since five years |
| How many, which one | much friends, many water, every students, these book, this people, a children, ten years old boy |
| Small words | said me, explained me, told to me, listen music, went to home, angry on, afraid from, depends of, prefer tea than coffee, taller then me |

Agreement patterns are skipped when a helping or causing verb comes earlier in the same sentence
(did, does, can, let, make, see ...), because "Does everyone have" and "I saw him go" are right. This
loses some real slips in long sentences; it is the price of not giving a wrong note.

False-alarm scans: 1,755 of our own reading, listening and dictation texts raised no grammar note. The
275,000 words of prose in this repository's documents raised three, all from text that quotes single
letters or words ("x - a equations", "An before a silent h"); the second kind is now excluded.

Still not caught: wrong tense across sentences, missing articles ("I saw dog"), wrong word order,
agreement when words stand between the doer and the verb ("The boys in the class is"), and anything
that depends on meaning. These need a parser or a model, not patterns.

## Full spelling list (19 Nov 2026)

Any word not on a list of about 91,000 words is now shown as a tip: "Check the spelling of: frend (friend?)".

- Source: SCOWL size 60 and below (the list ordinary spell checkers use), British, American, Canadian and Australian
  spellings all accepted, plus speller-extra.txt for Indian English words (amma, dosa, idli, lakh, tiffin).
  Built by tools/english/spelling/build_speller.py into content/english/spelling/speller-words.txt (880 kB, 260 kB
  compressed). It is fetched only when a learner first checks a piece.
- A tip, never a fix: an unknown word may be a rare word or a word from another language, so it never holds back AI
  feedback. Names (a capital in mid-sentence), capitalised unknown words at a sentence start, words of one or two
  letters, web and e-mail addresses are not checked.
- The likely word is one edit away (a letter added, dropped, changed, or two swapped), the commoner word first.
  Words on blocklist.txt are accepted as correct but never offered as a correction.
- Guards: SP-1 to SP-5. None of our 1,700+ reading, listening and dictation texts raises the tip.

Still not caught: a real word used wrongly (there / their, form / from) beyond the patterns in slips.ts.

## Words that sound alike (confusables@2)
- there/their/they're, your/you're, it's/its, who's/whose, to/too, were/where, of/off, loose/lose, no/know, than/then, quite/quiet, breath/breathe, weather/whether.
- Each is flagged only where the next or previous word makes the wrong one impossible ("there books" after "are" is left alone; "their late father" is right).
- A test runs every pattern over all our reading, listening, dictation, guided and first-words text; none may fire. This caught "told her to." (right), so "… to." at the end of a sentence is not flagged.
- Notes point to the Grammar in use topic "confusables".
