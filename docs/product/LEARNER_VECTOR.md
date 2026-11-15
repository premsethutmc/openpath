# learner-vector@2 (shadow): a measured, gap-aware picture of the learner, with forgetting

**Status: shadow only.** `packages/learning/src/learner-vector.ts` computes it from a learner's records; nothing in the product
reads it, so nothing a learner sees and nothing about mastery changes.

## What it is

One entry per skill: an estimate (chance of a right, unaided answer to a medium question), an uncertainty, and how much of
the evidence is the learner's own answers on that skill and how much was passed from skills above it.

Two things it uses that the shipped picture does not:

1. **Difficulty.** Every maths question reaches the shared engine with the same difficulty. Here a hard question right
   moves the estimate more than an easy one right, and an easy one wrong lowers it more than a hard one wrong (the family's
   difficulty class 1 to 3; hand-written questions count as medium).
2. **The prerequisite graph.** A wrong answer on a skill is also evidence about the skills it builds on; a right answer is
   weaker evidence that they are in place. Evidence passes down two steps, weaker for looser relations and for each step,
   is bounded, and counts for less with every answer the learner gives on the lower skill itself.

Only a first, unaided answer counts. `suspectsBelow(skill, vector)` lists the skills below a skill, most doubtful first:
where to look first when a learner is stuck.

## Measurement (synthetic, Tamil Nadu Grade 5, 2026-11-11)

A learner with exactly one missing skill P: wrong on P and on every Grade 5 skill that rests on P, right elsewhere. They have
answered two questions on about half of the other skills, then get two wrong on a skill S that rests on P. 372 cases
(63 possible missing skills; on average 4.7 skills below S to choose from).

| Where to look first | Missing skill is the first one checked | Checks needed on average |
|---|---|---|
| The graph's own order (what recovery follows today) | 24% | 3.2 |
| The vector | 57% | 1.6 |
| The vector without the graph (difficulty and direct answers only) | 37% | not measured |

## Limits

- The step sizes and relation weights are design values, not fitted to any learner.
- The synthetic learners are built from the same graph the model uses, so this shows the model behaves as designed. It
  does not show the graph's relations are right, or that children fail this way. Real answers are needed for that.
- The effect of difficulty alone is not measured: the synthetic answers do not depend on difficulty.
- Forgetting (below) is measured on synthetic learners only.

## Forgetting (learner-vector@2, 2026-11-15)

Each skill also gets a **memory stability** (days after which what the learner showed has faded to 0.9 of itself):

- The first answer sets it to 3 days. A right answer after time away, when some forgetting was expected, lengthens it a lot;
  a right answer in the same sitting barely does (the spacing effect); a wrong answer halves it (1 to 365 days).
- `recall` is the estimate faded by the time since the skill was last answered, along FSRS-4.5's power-law forgetting curve
  (fast at first, then slowly). Only a positive estimate fades, towards an even chance.
- `reviewDueAt` is when recall falls to 0.7; `reviewQueue(vector)` lists shown skills that have faded below it, most faded first.
- `estimate` is unchanged, so recovery's order (which reads it) is unchanged.
- quick-review@1 (`packages/learning/src/quick-review.ts`, approved 2026-11-15) is the only reader of `recall`: the maths home
  shows one "Quick review" card (the most faded skill that has a fresh practice question and is not already Next, the
  warm-up or the practice focus); the full test-build Today strip lists up to three. A tap opens ordinary practice. It is
  optional and changes nothing about mastery, the delayed check or Next.

Measurement (synthetic): 400 learners who learn a skill in one sitting and come back three times at random gaps of up to
90 days. They forget along their own power law with their own memory rule and an ability the model does not know. Each
later answer is predicted before it is given (log-loss, lower is better; four random seeds):

| Prediction | All later answers (n=1200) | After more than 14 days away (n≈790) |
|---|---|---|
| Estimate without forgetting | 0.615 to 0.622 | 0.606 to 0.614 |
| Recall with forgetting | 0.594 to 0.600 | 0.575 to 0.585 |

Without forgetting the model expected about 0.70 right after two months away, where learners got about 0.55; with forgetting
it expected about 0.54. A first version that faded by halving (exponential) made predictions worse (0.687), being far too
pessimistic after long gaps; the power-law curve replaced it.

Limits: the learners forget along a power law, as the model assumes (with different constants), so this checks calibration,
not that children forget this way. The constants are design values until real answers over weeks exist.

## Next

0. Forgetting: once family-site learners have answered the same skills weeks apart, check recall against their answers and
   fit the starting stability and spacing gain, and see whether quick-review taps are used and answered well.

1. Record, alongside each recovery, what the vector would have checked first (still shadow), once real learners use it.
2. Let recovery (prereq-after-own@1) use `suspectsBelow` for its order, behind a switch, and compare on the Grade 5 sweep.
3. Feed the difficulty class into the shared engine's item parameters only after checking what it does to verification.

Tests: `frontend/src/learning/learner-vector.test.ts`.
