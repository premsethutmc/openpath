# Word levels: what the word lists can and cannot do (19 November 2026)

The question: can New words be levelled, and grown, from open word lists with a filter, instead of by hand?

## What was tried

`tools/english/vocabulary/candidates.py`, with two open sources (nothing from them is stored in the app):

| Source | Licence | Used for |
|---|---|---|
| SCOWL (en-wl/wordlist @ 1e5b7d3) | SCOWL copyright notice (permissive), already in `content/english/spelling/licences` | Is a candidate a base-form noun, verb or adjective in British spelling |
| Google Books Ngram frequency list (orgtre/google-books-ngram-frequency @ e20471c) | CC BY 3.0 | The 10,000 most frequent words in books, in order |

## What it showed

1. **SCOWL cannot set levels.** Its smallest list (size 35) holds 47,000 words, and every taught word but a few
   is in it. It says a word is a real, common-enough word, not how common.
2. **The frequency list confirms the order of levels 1 to 5.** Median rank of the taught words in the top 10,000:

   | Level | In the list | Median rank |
   |---|---|---|
   | 1 | 67 of 70 | 1,610 |
   | 2 | 70 of 70 | 3,104 |
   | 3 | 57 of 70 | 5,308 |
   | 4 | 53 of 70 | 6,434 |
   | 5 | 37 of 70 | 8,380 |
   | 6 to 8 | 7 of 210 | not meaningful |

   So the hand-set levels 1 to 5 run from common to rare, as intended. Levels 6 to 8 are almost wholly outside the
   top 10,000 and cannot be told apart by this list.
3. **It cannot move single words.** Book frequency is adult frequency: `thirsty`, `tidy` and `mend` are outside the
   top 10,000 while `territory`, `reputation` and `privilege` are inside the top 5,000. No word was moved.
4. **A filter cannot choose the words.** After the house screen and the part-of-speech filter, the list still
   proposes `legislation`, `membrane`, `theology`, `defendant`, `electrode`, and words the screen does not hold.
   Its candidates are a useful menu, not a selection.

## What was done

- 160 words added (20 per level, 560 in all). For levels 1 to 5 they were picked from the script's candidates in
  the matching rank window; for levels 6 to 8 by hand. Meanings and sentences were written for OpenPath as before,
  rule-checked, run through the house screen, and every gap question read with its choices.
- The levels of the first 400 were left as they were.

## What will set levels properly

Children's answers: each word's share of right-first-time answers and of "I know this word already" taps, against
the other words at its level, with a floor of answers per word before anything moves. Not built yet.
