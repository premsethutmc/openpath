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

How a recipe is laid out is decided by rule (`layoutFor`, in the player: `frontend/src/year/recipe-layout.ts`; the learning engine has no branch by class), not written for each lesson:

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

Thirty recipes (the last two, lakhs / crores / millions and big numbers, move the commas of a number). Nine are in `recipe.ts`: six ideas for Classes 11 and 12, continuity (a fact), same perimeter /
different area (Class 5, an idea) and adding fractions (Class 5, a method). Twelve more for Class 5 are in
`recipes-class5.ts`: what a fraction is, equal fractions, comparing fractions, per cent, tenths and hundredths (a fact), the
number line, negative numbers, adding integers (a method with missions), rounding, prime numbers, area by counting squares,
and the perimeter of a rectangle. A second batch of seven is there too: a fraction of a group, remainders, estimating,
a percentage of an amount, adding decimals and multiplying by 10 (two methods with nothing to explore: story, guess,
rule, worked steps, try), and rupees and paise (a fact).

Three of them (what a fraction is, equal fractions, comparing fractions) have no "how to solve it" step: those skills have
no worked example of their own yet, so the lesson goes from the name to the try.

## Where a learner leaves (lesson-part@1)

When a part is finished, the player posts one `lesson_part` metric to the existing telemetry endpoint
(`/api/telemetry/`, `ClientMetric`): the recipe, the part, and how long the part took. It holds no answer and no text, is
not evidence, and failing to send it changes nothing for the learner. The last part recorded for a learner who did not
finish is where they left.

## Guess first, for every skill (guess-first@1)

A recipe is written for one skill. The owner's note (16 Nov 2026): that cannot be the only way, or every skill waits for its
own writing. So the engine also makes the plain lesson interactive by itself, from what every question family already holds.

In a skill's opening lesson, a worked example is not shown at once. The learner sees its question and two or three answers:
the verified one and the wrong ones the family's own written misunderstandings predict for those numbers (`guessOf`,
`packages/learning/src/families.ts`). Choosing one opens the working; a wrong choice is first answered with that
misunderstanding's own explanation. "Show me how" opens it without a guess. A picture that belongs to the working waits with
it; the question's own picture stays. Nothing is written per skill, nothing is invented, the guess is not evidence, and the
lesson's Next button is as it was. What is recorded is one `lesson_part` measurement: right, wrong or skipped.

Of the 244 skills the curricula map to, 27 open with a recipe and 190 more get a guess from this rule; 27 have neither (no
predicted wrong answer, a choice question, or no worked example).

## What if the numbers change? (explore@1)

The owner's direction (17 Nov 2026): a lesson should let the learner play with the numbers and watch the picture answer, so
the idea is seen and not memorised; and this must be a strategy the engine applies, not something built screen by screen.

A question family is a recipe: from its numbers it writes the question, draws the picture and works the answer. So under
the working of an example in a lesson the learner can change one of the example's own numbers, and the family makes the
question, the picture and the working again (`packages/learning/src/explore.ts`, `frontend/src/year/Explore.tsx`). One
number at a time. Nothing is written for any lesson.

Evidence stays clean: a changed question is never one of the released questions (nor the same question under other numbers),
so nothing a learner explores is something they are later asked on their own. Where too few such values exist the number is
not offered. Of 315 families with a picture, 119 can be explored under that rule today; the others have all their valid
neighbours inside the released pool and need an exposure record before they can be opened up.

Lessons only: a test shows no picture to move, no guess and no explorer.

## Teaching at the step (teach-there@1, live@1)

The owner's direction (17 Nov 2026): not everything is a picture. When a child working a division writes 3 × 2 = 5, the app
should ask a simpler thing right there, at once, and not send them away or make a call for it.

In practice (never in a test) each line of working is looked at as soon as the child pauses on a finished calculation, on
the device. A right line gets its tick. A slip in a single whole-number calculation gets a smaller question about the same
numbers under the step (`simplerFor`, `packages/learning/src/working.ts`): a times fact as the same thing added up, or split
at five; a times with a ten in it as the fact underneath; a division turned round into a times fact; adding and taking away
by the tens first, or through the ten. A right answer leaves the child to mend the step; two wrong ones show it worked.
Nothing is fetched, saved or written per lesson for it.

Open: the same for fractions, decimals, algebra, trigonometry and calculus lines (the line check reads only arithmetic
today); counting the stumble against the skill the step leans on, and going back to that skill when it repeats.

## Stuck at a step (step-help@1)

The owner's direction (17 Nov 2026): take mathematics as a whole to Class 12 and work out what a learner can need at a
step; the app already holds the working, so it should be able to help there.

What the app holds: 1,118 families, about 353,000 released questions, every one with its verified working as steps; each
step names its operation and the skill it leans on (337 skills in all). About 3 steps in 10 lean on a skill other than the
question's own (a division's first step is "multiply", skill "Use multiplication facts"). Mistakes are labelled recall,
procedural, conceptual or prerequisite, and 18 in 100 point at another skill.

What a learner can need at a step: a fact; a small procedure; what to do next; what a word or symbol means; the idea
itself; a slip caught; going back to an earlier skill. `packages/learning/src/step-help.ts` gives the first rungs for every
question, in order and only as asked (`frontend/src/year/StepCoach.tsx`, "I'm stuck" in practice with help, and the working
after a wrong answer): what to do next (the operation, nothing worked); "This needs: <skill>", which opens that skill's
card (its own lesson's words and example); a smaller question where the step is a plain calculation (`smallerOf`); then the
step. Using it in practice is recorded as help, as a hint is. Never in a test.

Cards: 336 of the 337 skills get one by rule, 325 with a worked example. They are the lesson's first words, which are
sometimes about one example and not the rule (multiplication facts opens on 7 × 8); 10 are very short. These are to be
raised for review, and the thin ones rewritten once and approved, before the cards are relied on.

Open: the review screen for cards; counting a stumble against the skill the step leans on and going back to it when it
repeats; notation cards (f(x), ∫, sin); smaller questions beyond whole-number calculations.

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
