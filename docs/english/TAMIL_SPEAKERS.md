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
