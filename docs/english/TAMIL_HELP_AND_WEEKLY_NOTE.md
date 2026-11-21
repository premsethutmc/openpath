# Tamil help and the weekly note (21 November 2026)

## tamil-help@1
A switch, "தமிழ் உதவி · Tamil help", on the welcome screen and at the top of Home (kept per device). When on, a short
Tamil line appears under the app's English buttons, headings and instructions (`ui/tamilHelp.tsx`: a data-ta
attribute on any element whose whole text is in `content/english/help/tamil-ui.json`, shown with CSS ::after). The
passages, questions and answers are never translated: they are the English being learnt. 215 lines: welcome and sign
in, Home and its cards, First words, New words, Listen and write / answer, Reading, Read aloud, Spelling Bee,
Grammar, Write your own, Write an answer, Poems and everyday texts, Long reads, Find my level, the report button.
Not yet: hints and explanations inside questions (content, thousands of lines). The Tamil is written for OpenPath and
not yet checked by a Tamil speaker. Tests: TH-1 (every line is Tamil script and matches a line the app shows), e2e
`tamil-help`.

## weekly-note@1
On the parent view, each child's card has "This week's note to share": a few plain lines (days practised of the last
7, the activities used and on how many days, what has gone well, what to practise next) with "Share on WhatsApp"
(a wa.me link) and "Copy". Counts only; no marks, no comparison with other children, nothing the child typed.
`logic/parent-view.ts` (`week`, `weeklyNote`). Tests: PV-10, e2e `parent-view`.
