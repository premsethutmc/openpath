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
