# 3. Hidden knowledge-state model

`src/model.ts` defines `HiddenState` (`synthetic-learning-model@1`). It is held in a **private** field (`#state`) of `SyntheticLearner`.

- `skill[kind] = { stable, fragile }` for each of the five kinds. Ability = min(1, stable + fragile). Fragile knowledge comes from instruction and has not yet been consolidated.
- `misconception[id]` holds the chance of making that error at each opportunity. `misconceptionOrigin` keeps the starting strength so a reduced misconception can relapse.
- `history` is the hidden-side log.

## Separation

| Record | Contains | Who can read it |
|---|---|---|
| boundary (`traces/S00x.boundary.json`) | learner-visible frames and the learner's actions | the learner (frames) and OpenPath (actions as renderer events) |
| hidden (`traces/S00x.hidden.json`) | hidden state after every learner event, with the reasoning behind each response | research output only |
| openpath (`traces/S00x.openpath.json`) | OpenPath's own records and evidence, read **after** the run | research output only; never shown to the learner |

Isolation is enforced by:

- **What OpenPath can see:** the port turns every action into a renderer event, carrying only the answer value and working lines.
- **What the learner can see:** `visible()` strips question ids, generator references, answer keys, verdict reasons, evidence and state from every frame.
- **What the learner object exposes:** only `clock` and `profile` are public properties.

The tests check each of these.
