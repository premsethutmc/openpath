# Where the learner model starts, and how well it finds a learner

*23 and 24 November 2026 · english-core and the English app · the starting point is on in the app from 24 November.*

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

`starting_point` is a ledger event (starting-point@1, `types.ts`, `updater.ts`). It sets the starting mean and
spread of the capabilities of a strand that have no direct evidence yet. It is not evidence: it adds no
observation, context or demonstration, so nothing can become "shown" or "mastered" from it, and it never touches a
capability that has evidence. A history without the event is folded exactly as before (the frozen simulation and
all 365 english-core tests are unchanged).

## Switched on in the app (24 November 2026, engine-start@1)

`frontend/src/english/logic/streams/engine-start.ts` works the event out from the level-check records each time a
learner's record is read. Nothing is stored. The rule:

- only the parts Find my level **measured** give a start (words → EN.VOC, reading → EN.RDG, listening → EN.LIS,
  spelling → EN.FND, grammar → EN.GRM). A part filled in from the quick gap check gives none: one overall level did
  not help in the table above. Sentences, writing and speaking have no part and are left alone
- a part's level is carried to the framework's scale in proportion (level 1 → 1, the top of the ladder → 8)
- **only the centre moves: the spread stays 1.5**, the framework's own

The ladders have still not been measured against the framework's scale, so the rule was chosen by asking what
happens if they are wrong. Ten seeds, the same ten simulated learners:

| Start | M1, ten seeds | M4 | M4 passes |
|---|---|---|---|
| Middle of the scale (before) | 0.54 ± 0.05 | 77% | 10 of 10 |
| The app's rule, ladders on the framework's scale | **0.72 ± 0.02** | 77% | 10 of 10 |
| The app's rule, every ladder 1 level off, neighbours in opposite directions | 0.62 ± 0.03 and 0.69 ± 0.03 | 74%, 75% | 9 and 8 of 10 |
| The same, 1.5 levels off | 0.51 ± 0.03 and 0.56 ± 0.03 | 72% | 8 and 7 of 10 |
| Spread narrowed to 1.25, ladders 1.5 levels off | 0.47 ± 0.01 and 0.53 ± 0.03 | 68%, 71% | 2 and 5 of 10 |

- With the spread left wide, a start from ladders that are a level and a half wrong in the worst pattern is about
  where the middle start is, and its uncertainty is still mostly honest. With a narrower spread it is worse than
  the middle and the uncertainty is no longer honest. That is why the spread is not narrowed.
- With ladders within a level of the scale it is better than the middle.
- It does not reach the 0.8 target, and M6 (guesser and forgetter) passes on no seed with any start from a
  placement (2 of 10 from the middle). That is unchanged from the first experiment and is not fixed here.

What the learner sees: the engine's first questions are pitched at the measured level. A learner placed at 2 by
Find my level is first asked questions of difficulty 2 in the starting check, where before they were asked 4; one
placed at 6 is asked 6 to 7 (`engine-start.test.ts`, ES-2 to ES-5).

All of this is on simulated learners. Whether the ladders are within a level of the framework's scale is not known.

## What would improve the model more

1. **Put the parts' ladders on one measured scale.** It is needed for the per-part start, for comparing parts, and
   for an overall level that is more than the gap check's.
2. **An exact update instead of one step per answer.** The model moves its estimate by one approximate step for
   each answer. Find my level's checks keep the whole belief and recompute it from all the answers, and they find a
   simulated learner in 13 to 22 answers. `E2A_RESPONSE_MODEL_REVIEW.md` already lists this as an option.
3. **A consistency flag for learners who answer at random.** The same review found it identifies the simulated
   guesser (AUC 0.95) without changing any estimate. It is not built.
4. **Real answers.** Every number here is from simulated learners.
