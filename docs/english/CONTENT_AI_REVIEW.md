# content-ai-review@1: an AI reader over the English questions (21 November 2026)

`python manage.py content_ai_review` (run once on the server while `OPENPATH_CONTENT_AI_REVIEW=1`, in the background)
gives every multiple-choice question to the AI with its text, options in a shuffled order, and asks for the answer
and whether a second option could also be right. Only the app's own content is sent.

Run of 21 November 2026 (gpt-4.1-mini): 1,250 questions (reading course 216, reading between the lines 36, long reads
108, poems and everyday texts 491, listen and answer 240, grammar 159); 20 flagged; no errors; 389,785 tokens in and
33,063 out (about ₹20).

Fixed (7): a second answer was defensible —
- N2.P1 title: "The Wind from the Sea" → "A Day at the Seaside"; N2.C1 title: "A Rainy Morning" → "The Late Bus";
- N6.P2 opinion: "Their absence was not a matter of laziness" (a judgement backed by evidence) → a plain fact sentence;
- kt3.poem "hundred brown arms": "Its roots" → "The parrots";
- lf4.1.q3 (the clerk does tell her to take the fast train): → "The fast train has better seats";
- gu.prediction.04: "again" also fits → "blue"; gu.text_structure.05: "As steps in order" also fits → "a description".

Kept (13): the key is right and the AI was wrong or the other option is a deliberate near-miss —
INF3.C4 and INF4.C3 (the AI misread the clue chain), gu.this_these.10 ("That mountains"), gu.articles.10 ("an
banana"), gu.clause_kinds.09 (a subject clause is a noun clause), gu.syllables.08 (ed-u-ca-tion is four), gu.register.06
(the AI mislabelled options), the main-idea questions L2.C1, L3.C3 (a true detail is the intended distractor), L3.P2
(the captain's mistaken belief is the intended distractor), kt3.poem and kt5.poem themes, kt6.chart (110 vs 60).
