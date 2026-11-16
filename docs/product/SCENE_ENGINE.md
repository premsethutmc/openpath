# Interactive scenes (scene@1, scenes@1)

The owner's direction (16 Nov 2026): maths should be learned by moving things, "not like another maths book"; it must be an
engine, not hundreds of hand-built screens; and it must be deterministic for learners, with no AI call per use.

## What it is

- **A scene is data.** A `Scene` (`packages/learning/src/scene.ts`) says what to draw, what the learner can move, and a goal
  to reach by moving it. Example, the whole of one lesson picture:
  `{ type: "scene", kind: "strips", poly: [0, 0, 5], from: 1, to: 3, prompt: "…", success: "…", goal: { measure: "gapPercent", below: 5 } }`
- **One engine.** `scene.ts` turns a scene and a state into shapes to draw, the numbers to judge it by (`measures`), a line of
  readout and whether the goal is reached. It is plain arithmetic: no model, no network, the same result on every device.
- **One player.** `frontend/src/year/Scene.tsx` draws whatever the engine returns and passes touches and slider moves back.
  It holds no mathematics. Every control is also a native slider (keyboard and switch access).
- **One builder per question family.** `packages/learning/src/scenes.ts` builds a scene from a family's own parameters, so
  every question of that family gets its own picture with nothing written for it. The families are not changed (fingerprints,
  pools and certification are as they were).

## Kinds (scene@1)

| Kind | The learner | Measures |
|---|---|---|
| `strips` | sets how many strips sit under a curve | `n`, `sum`, `exact`, `gap`, `gapPercent` |
| `slope` | slides a point along a curve; the tangent is drawn | `x`, `value`, `slope` |
| `accumulate` | drags the right edge of a shaded area (area below the axis is taken away) | `x`, `height`, `total`, `width` |
| `line` | sets slope and start of a straight line to pass through marked points | `m`, `c`, `miss` |

Curves are polynomials given by their coefficients, so slopes and areas are exact (by the derivative and the antiderivative,
not by estimation).

## What is checked before a scene is shown

`check(scene)` must return no problem, or the scene is not drawn:
- the data is well formed (finite numbers, sensible ranges, short prompt and success text);
- the goal names a real measure of that kind and has exactly one target;
- the goal is **not** already reached at the start, and **some reachable state reaches it** (every control is a finite grid,
  so the engine lists the states). A learner is never asked for something the controls cannot do.

`frontend/src/year/scene.test.ts` also holds every scene of every released question against its family: the scene's own
number (`sceneAnswer`) equals the family's verified answer, the family's independent validator accepts it, and it is none of
the family's predicted mistakes.

## Where a learner meets one (scenes@1)

- **In a lesson:** a section about a generated question that has no picture shows that question's scene (`Lesson`).
- **After a wrong answer:** where the worked solution is shown, the same question is shown as its scene (`Feedback`). Never
  before a retry, because a scene states the answer.
- Anywhere a picture is drawn, a `widget` or `figure` of `type: "scene"` is drawn by the player (`Figure`).

Families with a scene now: `cint` (area under a constant: drag the edge), `pint` (∫ k xⁿ: strips), `dpow` (derivative of
k xⁿ at a point: slide and read the slope). 1,290 released questions; four lesson sections ("Integrate powers of x",
"Differentiate powers of x").

## What a scene is not

- **Not evidence.** Reaching a goal writes nothing to the learner's record and claims no skill. Evidence still comes only
  from answered questions, under the existing rules.
- **Not a new way of finding the gap.** Reading a wrong answer (a family's `bugs`, each with the skill whose teaching fixes
  it) and stepping back are unchanged. A drag-based check that counts as evidence would need a new answer type; it is not
  in this milestone.

## Adding a topic

1. If an existing kind fits, add one builder to `scenes.ts` for the family. Nothing else.
2. If no kind fits, add a kind to `scene.ts` (its controls, measures, shapes, description) and a style or two for the player.
3. `scene.test.ts` then checks every released question of the family automatically.

## Limits (open)

- Four kinds. Geometry by dragging corners is still the separate triangle lab (`frontend/src/geometry`); a `polygon` kind
  would bring it under this engine.
- Curves are polynomials only (no trigonometric, exponential or rational curves yet).
- Checked in a desktop browser at phone size with touch events; **not yet checked on a physical Android phone**.
- Whether a scene teaches better than the text it sits beside is not something a test can show; that needs real learners.
