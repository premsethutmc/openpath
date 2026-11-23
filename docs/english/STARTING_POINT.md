# Where the learner model starts, and how well it finds a learner

*23 November 2026 · english-core · the live app is unchanged by this work.*

## What was measured

The frozen ten-learner simulation (`tools/english/sim/main.ts`) was run on its own seed and then on ten seeds
(`tools/english/sim/starting-point.ts`).

| | Frozen seed | Ten seeds |
|---|---|---|
| M1 profile recovery after 40 items (target ≥ 0.8) | 0.40, miss | **0.54 ± 0.05**, passes 0 of 10 |
| M2 weakest strand named | pass | passes 6 of 10 |
| M3 pairs told apart | pass | passes **1 of 10** |
| M4 honest uncertainty | pass | passes 10 of 10 |
| M5 efficiency | pass | passes 10 of 10 |
| M6 guesser and forgetter | miss | passes 2 of 10 |

Two things follow.

- **The single-seed scorecard is not a stable description of the model.** "6 of 8 pass" on the frozen seed includes
  M3, which passes on one seed in ten, and its M1 of 0.40 is a low draw: the ten-seed mean is 0.54. Any change to
  the model should be judged on ten seeds, as `starting-point.ts` does, not on the frozen seed alone.
- **The model is slow to find a learner's shape.** After 40 answers its ordering of a learner's strands agrees only
  moderately with the truth.

## What was tried: starting from a placement result

Every capability starts at the framework's prior (4 ± 1.5) whoever the learner is. The experiment starts each
learner from a simulated placement instead: a level per strand, read half a level low on average with an error of
0.7 levels, as Find my level's checks are built to be.

| Start | M1, ten seeds | M4 | M6 passes |
|---|---|---|---|
| Middle of the scale (today) | 0.54 ± 0.05 | 77% | 2 of 10 |
| One overall level for every strand (as the quick gap check gives) | 0.58 ± 0.05 | 84% | 4 of 10 |
| A level per part (words, reading, grammar, spelling) | **0.66 ± 0.02** | 82% | 0 of 10 |

- A level per part helps: +0.12 on M1, about two standard errors, and the runs agree with each other more.
- One overall level does not help M1 in a way that can be told apart from noise. It cannot: a single number says
  nothing about which strand is stronger.
- Neither reaches the 0.8 target, and neither helps with the guesser.

## What is in the code

`starting_point` is a new ledger event (starting-point@1, `types.ts`, `updater.ts`). It sets the starting mean and
spread of the capabilities of a strand that have no direct evidence yet. It is not evidence: it adds no
observation, context or demonstration, so nothing can become "shown" or "mastered" from it, and it never touches a
capability that has evidence. A history without the event is folded exactly as before (the frozen simulation and
all 365 english-core tests are unchanged). **Nothing in the app writes this event yet.**

## Why it is not switched on

- Find my level's parts are on their own ladders (reading 1 to 6, listening 1 to 7, spelling 1 to 5, grammar 1 to
  7), and none of them has been put on the framework's scale of 1 to 8. Without that, a "level per part" start
  would be a guess about what each ladder means, which is the mistake the word levels made before they were
  measured.
- The gain is real but modest, and it is a gain on simulated learners.

## What would improve the model more

1. **Put the parts' ladders on one measured scale.** It is needed for the per-part start, for comparing parts, and
   for an overall level that is more than the gap check's.
2. **An exact update instead of one step per answer.** The model moves its estimate by one approximate step for
   each answer. Find my level's checks keep the whole belief and recompute it from all the answers, and they find a
   simulated learner in 13 to 22 answers. `E2A_RESPONSE_MODEL_REVIEW.md` already lists this as an option.
3. **A consistency flag for learners who answer at random.** The same review found it identifies the simulated
   guesser (AUC 0.95) without changing any estimate. It is not built.
4. **Real answers.** Every number here is from simulated learners.
