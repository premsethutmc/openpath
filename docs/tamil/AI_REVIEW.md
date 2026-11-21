# Tamil course: AI review (tamil-ai-review@1), 21 Nov 2026

Every question (1,114, both boards, shared ones once), teaching card, passage and writing task (159) was checked once on the
family server by an AI reader that answers each question itself and reads each text for wrong Tamil.

| run | model | flagged | after checking each flag |
|---|---|---|---|
| 1 | gpt-4.1-mini | 650 of 1,273 | unusable: wrong on fixed facts (named க as a consonant, called கண்ணா the fourth case) |
| 2 | gpt-4.1, given the topic's rule, "sure" findings only | 158 of 1,273 | 4 real problems; the other 154 were the reader's own mistakes |

Real problems, fixed in `tools/tamil/build_icse.py`:

1. «… — அடுத்த கிழமை எது?» can also mean "next week": now «… — அதற்கு அடுத்த நாள் எது?».
2. «மரங்கள் எது பெய்ய உதவுகின்றன?» was awkward: now «மரங்கள் பெய்ய உதவுவது எது?».
3. Split-the-word questions offered a bare stem with the second word (மர + வேர், பெரு + மழை, வெண் + சங்கு, மர + கிளை, வெண் + மேகம்) as a wrong
   option; a teacher could accept some of these. They are no longer offered.
4. «அர்த்தம்» → பொருள் offered பயன் (use) as a wrong option, which is close; removed (and பொருள் from «விஷயம்» → செய்தி).

Examples of the reader's mistakes (kept as they were, standard school grammar): it called «படித்த» a வினையெச்சம் (it is a
பெயரெச்சம்), «அகர முதல…» not a kural (it is Kural 1), உரிச்சொல் "not a Tamil category", கற்சிலை "wrong", மயில் "அழும்" (மயில் அகவும்),
and swapped மோனை and எதுகை.

What this shows: an AI reader catches wording and ambiguity, but its Tamil grammar is not reliable enough to judge the
course. A reading by a Tamil teacher is still the check that matters.
