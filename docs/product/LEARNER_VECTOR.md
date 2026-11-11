# learner-vector@1 (shadow): a measured, gap-aware picture of the learner

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
- No forgetting over time yet.

## Next

1. Record, alongside each recovery, what the vector would have checked first (still shadow), once real learners use it.
2. Let recovery (prereq-after-own@1) use `suspectsBelow` for its order, behind a switch, and compare on the Grade 5 sweep.
3. Feed the difficulty class into the shared engine's item parameters only after checking what it does to verification.

Tests: `frontend/src/learning/learner-vector.test.ts`.
