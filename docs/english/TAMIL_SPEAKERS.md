# English for Tamil speakers (21 November 2026)

## tamil-slips@1: slips Tamil speakers often make
A grammar topic (`tamil_slips`, 27 sentences at levels 2–4, a learn card) on English slips that come from Tamil:
question order (Where are you going?), have and know with -ing (he has, I know), "myself Kavya", "cousin brother",
"discuss about", "return back", "reached to", "off the light", "no?" as a question tag, don't/doesn't, a/an,
"today morning", borrow/lend, less/fewer, good at, married to, news is, each … has, one of my friends,
didn't + plain verb, said/told. Each sentence says in one line why English differs. Home card "Slips Tamil speakers
often make" opens it; grammar search finds it ("myself", "tamil", "cousin brother").

## sounds@1: sounds that are easy to mix up
`logic/sounds`, `ui/Sounds.tsx`, `content/english/sounds/pairs.json`: v/w, f/p, z/j, s/sh, th/t, short i/long ee,
five or six word pairs each. The phone says one word (its own speech); the child taps the one heard; then hears both,
reads a tip on making each sound, and says them aloud. Eight rounds a sitting; the next pair suggested is the one not
yet tried, then the least sure. Practice-only (`sounds` events), in the parent week note.

Why the child's own voice is not scored: Read aloud's on-phone model told these pairs apart only 42 times in 60 on
clean synthetic speech (espeak-ng, two voices) and leant one way (vest heard as west, pill as fill, ship as sheep),
so it would tell children they said a word wrongly when they had not. Hearing the difference is reliable and comes
first; scoring speech waits for a recogniser that passes this check.

Tests: SO-1..3, TH-1, CS-2 (screened), e2e `tamil-slips-sounds`.

## Only for families who chose Tamil help (owner decision, 21 November 2026)
The two activities above, and the "Slips" topic in grammar search, are shown only on a device where Tamil help is
switched on (`useTamilHelp`, ui/tamilHelp.tsx). e2e `tamil-slips-sounds` checks both ways.

## tamil-help@2: grammar explanations in Tamil
`content/english/help/tamil-explain.json`: 476 grammar explanations of levels 1-4 (each sentence's one-line rule, and
the learn cards' rule and reason), machine-translated once on the server (`manage.py translate_help`,
gpt-4.1-mini, about 21,000 tokens) with grammar words kept in English as Tamil Nadu classrooms say them. Spot-checked;
two fixes (the word for adverb; a misspelt verb); one line without Tamil dropped. Shown, like the rest of Tamil help,
only when it is switched on. Test TH-2 (every line answers an explanation in the content and is Tamil script).

## Letters, notices and emails (for every learner)
Three grammar topics with learn cards: `letter_format` (8), `notice_format` (8), `email_format` (8), levels 5-7:
greetings, closings, subject lines, what goes where, tone. Home card "Letters, notices and emails"; grammar search
finds them ("yours faithfully", "notice", "email").
