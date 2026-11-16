# The lesson recipe (recipe@1)

The owner's direction (16 Nov 2026): a lesson should not read like a maths book. The learner should meet a question, guess,
find out by doing, and only then be told the name and the rule. It should be an engine filled from data, with no AI call
for a learner.

## The recipe

Every recipe has the same steps, in this order (`packages/learning/src/recipe.ts`):

1. **The question.** Something worth asking. No rule, no name of the idea.
2. **Your guess.** Two to four choices; each has its own reply. A wrong guess is fine and moves on.
3. **Find out.** One to four missions. Each is a scene (`SCENE_ENGINE.md`) with one goal; the next opens when it is reached.
4. **Name it.** Only now: what the idea is called and the short way of doing it.
5. **How to solve it.** One worked example, a step at a time: the lesson's own opening example, with the steps and answer
   its question family verifies (`workedFor`). It is the lesson's own example so that showing it is already counted as shown
   when the teaching is recorded.
6. **Try one / Think about it.** One choice: a first go at the method, or a question about the idea. The right one must be
   chosen to finish.

Every step carries the testers' feedback box (`FeedbackBox`, feedback@1), as every lesson section does. Two ticks were added
for it: "It doesn't explain it" and "I don't like this".

Then the skill's lesson carries on as before: its worked examples, then practice with help, the checks that count, and the
later re-check. Those were already there and already keep the evidence.

One player draws every recipe (`frontend/src/year/Recipe.tsx`). A recipe is data; `checkRecipe` must find no problem
(lengths, exactly one right choice per set, every mission a scene that passes its own checks), or it is not shown.

## Layout (layout@1)

How a recipe is laid out is decided by rule (`layoutFor`), not written for each lesson:

- **The page that grows** (Class 6 and up, and when the class is not known). One scrolling page. Each part appears under the
  last once that one is done; what is done stays in view, and a finished mission shrinks to one line. Nothing is shown before
  the learner has done what comes before it, so there is no Next between parts: only the button at the end.
- **One thing at a time** (Classes 1 to 5). One part on the screen, with Next. A young child loses their place on a page
  that scrolls.

## Shape by type (shape@1)

Each recipe states its `type`, and the type decides which steps it has (`stepsOf`, checked by `checkRecipe`):

| Type | For | Steps |
|---|---|---|
| `idea` | something to discover | question, guess, missions, name, how to solve it, try / think |
| `method` | a way of working; little to explore | question, guess (optional), missions (optional, may be none), name, how to solve it, try |
| `fact` | a definition or convention | name it first, then missions that show it, how to solve it, try. No question or guess: there is nothing to guess about a definition |

Nine recipes: the first six are ideas; continuity (Class 12) is a fact; same perimeter / different area (Class 5) is an
idea and is the first recipe for Classes 1 to 5; adding fractions with different denominators (Class 5) is a method.

## Where a learner leaves (lesson-part@1)

When a part is finished, the player posts one `lesson_part` metric to the existing telemetry endpoint
(`/api/telemetry/`, `ClientMetric`): the recipe, the part, and how long the part took. It holds no answer and no text, is
not evidence, and failing to send it changes nothing for the learner. The last part recorded for a learner who did not
finish is where they left.

## Where it appears

In the **opening lesson** of a skill the learner has never met, once per learner, when the skill has a recipe (`Lesson`,
`opening`). Of that lesson's written sections, only the worked examples follow the recipe. Other lessons of the same skill
(another way of explaining after a mistake, a review) are unchanged.

## Evidence

- Nothing in a recipe is evidence: a guess, a mission or a choice records nothing.
- The teaching is recorded as before, when the opening lesson ends (`teach-first@1`), so the answers after it count as
  given after teaching. This is why a recipe is only attached to a skill whose opening lesson exists and is eligible; a
  test holds that. A skill with no eligible lesson would otherwise be taught with nothing recorded.
- As before, a learner can leave a lesson part-way and choose "I know this, test me". That is unchanged.

## Recipes now

| Skill | The question | Missions |
|---|---|---|
| `MATH.calculus.indefinite-integrals` (integrals as first met) | a slowly opening tap: how much water after 3 minutes? | steady tap; slices of time; the total so far is t²; the slope of t² is the pouring rate |
| `MATH.calculus.derivative-rules` | a ball on a ramp: how fast at exactly t = 3? | slope of t² at 3; where the speed is 2; slope of t³ at 2 |
| `MATH.algebra.matrices` | how can four numbers move a picture? | make it twice as wide; mirror it; quarter turn |
| `MATH.algebra.determinants` | how much bigger did the picture get? | area × 6; flip it (area × −1); squash it flat (area × 0) |
| `MATH.coordinate.straight-lines` | how steep is the road, as one number? | turn a line about A to pass through B, uphill and downhill |
| `MATH.geometry.triangle-properties` | what do a triangle's three torn-off corners make? | three very different triangles, each making 180° |

Each recipe lists the words that name its idea (`names`). `checkRecipe` refuses a recipe that uses one before the name step,
or whose name step uses none of them.

## Adding one

Write one entry in `RECIPES`: the question, the guess, up to four scenes, the name, the choice. `recipe.test.ts` then checks
it. The hard part is the question: it has to make the idea needed before it is named.

## Limits (open)

- Six recipes; every other skill still opens with its written lesson.
- `MATH.calculus.definite-integrals` has no eligible opening lesson to carry a recipe (its lesson has not been through the
  teaching checks), so "area below the axis is taken away" is not taught by a recipe yet.
- A recipe left part-way comes back where it was; a mission that was open is done again.
- Where a learner leaves a lesson is not recorded yet (it would show which part is too long or unclear).
- Checked in a desktop browser at phone size with touch events; not yet on a physical Android phone.
- Whether it teaches better than the text it replaces can only be seen with real learners.
