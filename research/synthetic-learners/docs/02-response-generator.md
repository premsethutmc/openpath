# 2. Synthetic response generator

The generator is `src/reading.ts` plus `src/responder.ts` (`synthetic-responder@1`).

## What the learner reads

The learner reads only what a learner sees: the prompt text, the visible options, whether a hint is offered or was shown, the feedback level, and an explanation's title and text.

- The prompt is parsed into the learner's own equation A x + B = C x + D, with k(x + s) on the left for brackets, or into a story template for modelling.
- Seven story templates are understood: think of a number, buying, sharing, three consecutive numbers, "m times another", rectangle, and weighted.
- Anything else is **not understood** and is answered with a guess. This covers the `:w` word variants, prerequisite questions from other competencies (fractions, number line) and the find-the-mistake task. A test checks that every family's prompts are read as the right kind.

## How a response is made

The learner solves step by step:

1. distribute, when there is a bracket (brackets skill);
2. collect the x terms (both-sides skill);
3. move the constant;
4. divide.

Steps 3 and 4 use the two-step skill, or the one-step skill on one-step items. For each step, in order:

1. **Misconception opportunity.** Each misconception that applies fires with its strength.
2. Otherwise the step is **right** with probability `min(1, stable + fragile [+ hint help])`.
3. Otherwise it is a **conceptual error**: the step's result is wrong by a small amount, which is not one of OpenPath's modelled misconceptions.
4. Then an **arithmetic slip** happens with the profile's slip chance.

| Misconception | Step | Error made (learner's line) |
|---|---|---|
| first-term-only | distribute | 5(x − 5) → 5x − 5 |
| bracket-sign | distribute | 5(x − 4) → 5x + 20 |
| only-one-side | collect | 3x + 4 = x + 12 → 3x + 4 = 12 → 3x = 8 → x = 8/3 (the brief's example) |
| x-sign-kept | collect | 7x + 15 = 3x + 35 → 10x + 15 = 35 |
| added-not-subtracted / number-sign-kept / inverse-operation | constant | 2x + 1 = 5 → 2x = 6 |
| divided-first | constant | 3x + 9 = 33 → x + 9 = 11 |
| forgot-divide | divide | 3x = 45 → x = 45 |
| divide-wrong-way (not in OpenPath's catalogue) | divide | 3x = 45 → x = 3/45 |
| model-swap / model-sign | form equation | 8x + 16 = 120 → 16x + 8 = 120 / 8x − 16 = 120 |

## Submission types produced

| Type | How it arises | Example (from the traces) |
|---|---|---|
| correct final answer, correct steps | every step right | `3x = 6`, `x = 2` |
| incorrect final answer | misconception, conceptual error or slip | `8x + 3 = 15`, `8x = 12`, `x = 3/2` (only-one-side) |
| invalid transformation | the step where the error is made | `4x + 4 = 2x + 20` from 4(x + 4) (first-term-only) |
| correct answer through invalid working | `invalidWorkingWithCorrectAnswer` (S004): lines from an erroneous path, then the right answer | graded correct; the authority finds the false step (tested) |
| bare answer | working style "bare" | `x = 2` |
| valid partial working | style "partial": first line, then the answer | `7x = 77`, `x = 11` |
| unsupported notation | the operation written on both sides, **only for steps done right**, so an error stays on its own line | `3x - 20 + 20 = -17 + 20`, `3x/3 = 3/3` |
| assisted answer | asks for a hint where one is offered (chance × (1 − skill)), then answers with `hints.help` added | `{hint}` then an answer |
| guessed multiple choice | guess chance, or no option matches the learner's own value | an option id, no working |

No response is ever chosen to match an OpenPath verdict. The real grader and the derivation authority are used only in **tests**, as oracles. A learner with full knowledge is graded right on every item of all four phases of all six families, and its full working is method-verified on every one-step, two-step, both-sides and bracket item.
