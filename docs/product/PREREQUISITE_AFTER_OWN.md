# prereq-after-own@1: look below a skill before stopping for a person

**Status: ON by default since 2026-11-12** (`usePrerequisiteAfterOwn(false)` restores the earlier order;
`packages/learning/src/intervention.ts`). The skills below are checked most doubtful first (learner-vector@1).

## The gap it closes

The shipped order is: teach the skill itself first. When every explanation of the skill had been tried and the answers were
still wrong, the module paused ("go through this with a teacher or parent") and the skills it builds on were never checked.
A learner whose real gap is one step below stayed stuck. The deep-recovery research prototype handles this with a new engine;
this rule does the first, most common step with the recovery that already ships.

## The rule (switch on)

1. Before such a pause (three places in `moduleState`), the module opens the existing recovery on the learner's latest wrong
   question of this skill. The recovery no longer stops at "explanations have not clicked" for the problem's own skill; it
   walks the skills the problem builds on (depth 2, as before), checks the first one not shown and, if needed, teaches it.
2. Once a skill below has been **taught** (a lesson, not just a right answer), this skill's explanations may be given once
   more, and earlier lessons no longer count as failed approaches. Only a lesson below reopens them, so the loop is finite.
3. If nothing below is open, the module pauses for a person exactly as before.

## Measurement (synthetic, Tamil Nadu Grade 5, 57 skills, 2026-11-11)

Learner model: cannot learn skill S until one skill P below it has been taught (S and P both missing; teaching S does nothing
while P is missing). 43 skills have a skill below with a lesson (14 have none). One P per skill at depth 1.

| | P found and taught | Ends verified | Ends paused |
|---|---|---|---|
| Switch off (shipped) | 3 of 43 | 3 | 39 |
| Switch on | 22 of 43 | 22 | 21 |
| Switch on, most doubtful first (learner-vector@1) | 21 of 43 | 21 | 22 |

The learner in this sweep has no history on other skills, so the vector has little to go on and the order barely changes;
its measured gain is with history (`LEARNER_VECTOR.md`). Every case where P was taught ended verified after a delayed check. In the 21 remaining cases the recovery did check the
skills below, but at least in the case traced (`long-division` / `multi-multiplication`) the questions it asked belong to a
different skill id than P, so the model learner answered them right and nothing was found: partly a limit of this learner
model, not analysed case by case. Synthetic learners show what the program decides, never that a child learns.

## The research tests

The deep-recovery research prototype (`frontend/src/journey/deep-recovery*.test.ts`) is defined over the earlier stop, so
those files switch this rule off, and they name `MATH.number.integers` as their skill with no teachable lesson through a
test-only fixture (`useUnteachableFixture`), now that the real integers lesson is repaired.

## Known limits

- The prerequisite links it follows are the graph's `mandatory`, `support` and `plausible` relations; they are not reviewed.
- Depth stays at 2. A gap three or more steps below is still the deep-recovery research path.
- Measured on synthetic learners only.

Tests: `frontend/src/learning/prerequisite-after-own.test.ts`.
