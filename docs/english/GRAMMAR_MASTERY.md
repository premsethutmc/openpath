# Grammar mastery and spaced review

- A topic is **learnt** when 3 of the last 4 answers in it are right.
- Learnt topics come back for review after 3, 7 and 30 days. A right review answer moves to the next gap; after 3 passed reviews the topic is **mastered** (checked again after 90 days).
- A wrong review answer sends the topic back to **learning**, due the next day.
- Each sitting starts with up to 2 due review sentences, then new practice.
- Home, the grammar intro and the parent weekly note show mastered / due counts.
- Core topics (plurals, articles, be verbs, have/has, agreement, past, irregular verbs, comparison, this/these, future, continuous) grew from 8–11 to about 20 sentences each (+129).

Code: `logic/grammar-use/mastery.ts` (tests GM-1, GM-2).

## Write it again, the simpler way, and fuller topics (21 Nov 2026)

- **Write it again** (`kind: "rewrite"`): the learner sees a sentence with mistakes and writes the whole sentence correctly (the box starts with the sentence, to edit). Checked letter for letter against the accepted sentences; capitals and marks count, spaces are forgiven. At most 2 a level sitting. 76 sentences, levels 1–7.
- **Another way to see it** (`simple` on every learn card): after a second miss in a row on a topic, the feedback adds the rule said a plainer way with one example, and the card that comes back leads with it. Tamil help users see it in Tamil (translated by the server's translate_help job).
- Every topic now has at least 11 sentences (was 8); 1,123 sentences in all.

Tests: GU-19, GU-20; e2e grammar-syllabus "Write a sentence again…".
