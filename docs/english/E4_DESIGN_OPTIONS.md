# E4 design options (recorded, not scheduled)

*Started 12 October 2026. Options found during E1 and E2a that change selection or the update
mathematics. **None is implemented.** Each needs your approval, and most should be decided with
real learner data. The scheduler and the update mathematics are unchanged.*

**Decisions of 12 October (E2a approval):**

- The composite update mathematics stay unchanged.
- The slip-aware models are not adopted (D).
- The answer-pattern consistency check (B) is an E4 investigation, not a production feature.
- Exact-posterior updating (C) is a research option only, needing separate mathematical review and
  approval.

**Decisions of 12 October (E2b approval):** two high-priority investigations are added, F and G. The
composite update mathematics are not to be changed merely to improve simulation scores.

## A · Keep item-family variants for retention checks

**Problem (E2a, gate G8).**

- After typical use, the bank cannot serve 4 retention checks on unseen items at every level: about
  1 of 4 on average.
- Assessment and learning use the same items near the learner's level that retention checks need,
  so adding items alone barely helps. Even 48 evenly spaced items per capability give only 2–3
  checks at the ends of the range.

**Option.**

- Assessment and learning use at most one item from each family until a family's variants are
  needed, so the remaining variants are kept for retention checks.
- Retention checks already prefer unseen items, then unseen variants, then flagged repeats at least
  14 days apart.

**Expected effect** (from the runway sweep on synthetic banks):

- with families of three, about 24 items per capability serve 4 retention checks at every level;
- the current 14-item E2a capabilities move from about 0.97 to 1.29 checks on average.

**Costs and questions.**

- Assessment would sometimes pass over the most informative item because its family is already in
  use, which is slightly slower measurement; this should be measured in the simulation.
- Families must be truly equivalent, which is an educator question.
- How many variants per family E2b should aim for depends on this decision.

## B · Answer-pattern consistency check (E4 investigation, not a production feature)

**Problem (E2a review).** A learner who answers at random 30% of the time is pulled down on several
strands by more than a band. No tested response model fixes this without inflating real gaps.

**Option.**

- Compute a person-fit statistic (the standardised log-likelihood *l_z*) on each learner's answers,
  and flag the recent evidence as *potentially unreliable* when it is low.
- Estimates are not changed.

**Evidence (simulation).** It identifies the random guesser with an AUC of 0.95 on the E2a bank, and
0.94 when every learner also makes careless slips. That is 8 or 9 of 10 runs, at a 5% false-flag
rate. On the E1 bank it manages only 0.75–0.79.

**Requirement (12 October).** The check may only flag a pattern of answers as *potentially
unreliable evidence*. It must not claim to know why: guessing, distraction, misreading or an
unusual but genuine profile all look alike. It does not change estimates.

**Questions.**

- The threshold must come from real learners: adaptive testing shifts *l_z* upwards.
- What the product shows the learner and the guardian.
- Whether to pause adaptive selection while a profile is flagged.

## C · Exact-posterior update for the same response model (research option only)

**Finding (E2a review).** The one-step update moves the estimate a long way after a single wrong
answer on informative items, and slightly overstates how much each answer tells us.

**Option.** Compute the exact posterior for the same 3PL model (on a grid) and summarise it as a
normal. This is a change to the update mathematics.

**Effect on the E2a bank, 10 seeds, simulator as frozen:**

- **M4** honest uncertainty +4.8 points;
- **M1** +0.10 ± 0.05;
- **no gap inflation** (−0.06 ± 0.05);
- **M5** efficiency ratio worse, 0.49 → 0.62 (0.69 → 0.94 on the E1 bank);
- forgetter detection −0.3 capabilities;
- with real slips in the simulator, its M1 gain disappears.

**Status (12 October).** A research option only. Any change to the update mathematics needs a
separate mathematical review and your approval. If it is ever taken further, decide with real
response data, alongside difficulty calibration.

## D · Slip-aware response model: evaluated, not adopted (decision of 12 October)

**Result.** A four-parameter model with slip 0.05 or 0.10:

- does not fix the guesser;
- **inflates real gaps** by +0.12 to +0.15 bands;
- **weakens forgetting detection** (0.6 to 0.7 fewer capabilities flagged);
- harms efficiency on the E1 bank.

Details: `E2A_RESPONSE_MODEL_REVIEW.md`. Kept here so it is not re-proposed without new evidence.

## E · Time-sensitive capability estimates (from E1, L10)

**Problem.** Retention correctly flags forgetting, but the estimate keeps averaging older evidence.

**Requirement.** Study with real learner data. Do not tune to the simulation.

## F · Sparse-evidence placement (high priority; from E2b)

**Problem (E2b breadth simulation).**

- With 56 capabilities, the frozen protocol's 120 items give each capability about 2 items, against
  about 7 when there were 17.
- Error on the 17 original capabilities rises from 0.60 to about 0.8 bands, and ρ falls from 0.58 to
  0.47–0.51.
- The weakest strand is named correctly 74–77% of the time, against 83%.
- 240 items recover only part of the loss.

**To investigate.**

- **Hierarchical placement:** estimate strands and sub-strands first, from items that inform several
  capabilities, then go down only where a strand is uncertain or matters for the goal.
- **Adaptive branching:** stop measuring a branch once its uncertainty is low enough for the
  decision at hand (what to teach next), instead of testing every capability equally.
- **Order of placement:** which capabilities to place first, given the goal and the relationships in
  the framework.
- **What may be shown before a capability is placed** (see G).

**Constraints.** Selection changes only. The update mathematics stay as they are. Judge against the
frozen measures and the breadth simulation, without tuning to them; confirm with real learners.

## G · Advanced-learner underestimation and overconfidence (high priority; from E2b)

**Problem (E2b breadth simulation).**

- For the advanced simulated learner (about 7.5 everywhere), core estimates after 120 items are 2.3
  bands too low.
- Only 6% of the 80% ranges contain the truth (18% after 240 items).
- On the 17 original capabilities, the figure is 45% even on 0.1.0.
- The frozen M4 passes only because it averages over all ten learners.

**Likely causes, to confirm.**

- Prior influence: with about 2 items per capability, estimates stay near the starting assumption
  (mean 4).
- The bank's ceiling: the hardest items stop at 7.5–7.75.
- Whether the reported uncertainty reflects that little has been observed.

**To investigate.**

- **Starting assumptions against observations:** separate what is assumed from what is observed, in
  the state and in everything shown to learners and guardians.
- **Prior influence:** how much each estimate still owes to the prior, per capability.
- **Uncertainty calibration:** coverage of the reported ranges by learner level, not only on average.
- **A display rule:** a capability without enough direct evidence is shown as "not yet assessed" or
  "early estimate", never as an established measurement. The verification states already distinguish
  demonstrated from verified; this extends the idea to placement.
- **Ceiling:** whether harder items or an explicit "at or above the top of the bank" result are needed.

**Constraints.** The composite update mathematics stay unchanged unless a defect is shown and you
approve a change after separate review (as for C). No tuning to simulation scores.
