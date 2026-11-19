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
