# S2 comparison: existing vs proposed mastery decisions on the same recorded histories

The protocol, profiles, seeds and bounds are S2's frozen ones, unchanged. The script is `research/synthetic-learners/experiments/s2/m1/compare.mts`.

- **Reproduction.** Every journey was re-run with a read-only visit observer:
  - Cohort A: **300/300** re-run journeys are byte-identical to the frozen S2 traces.
  - Cohort B: **120/120** re-run journeys are byte-identical to the frozen S2 traces.
  - Cohort C: **80/80** re-run journeys are byte-identical to the frozen S2 traces.
- **No drift.** The "existing" status computed by the comparison differed from the status the journey recorded on **0** visits.
- **Size.** 2307 visits across 500 journeys.

Ground truth is the simulator's hidden state, as defined in S2's `metrics.ts`:

- **weak** = ability < 0.6, or a misconception of that kind ≥ 0.3.
- **strong** = ability ≥ 0.9 and misconception < 0.1.

A claim is:

- for the existing status: independent, transfer or verified;
- for a proposed variant: independently-demonstrated or retention-due.

**Important limitation.** These histories were produced by the existing selector:

- It ends a journey when the competency-level delayed check passes.
- It never schedules a missing sub-skill or a sub-skill recovery for the proposed policy.

The proposed policy is therefore judged on data it never asked for. That inflates its missed competence, and does not prove its precision on its own data. Fewer claims is not evidence of better learning.

## False mastery: a claim while any competency kind is weak

| Policy | A | B | C | All |
|---|---|---|---|---|
| existing: false claim visits / claim visits | 69/386 (17.9%) | 29/132 (22.0%) | 21/41 (51.2%) | 119/559 (21.3%) |
| gated: false claim visits / claim visits | 0/178 (0.0%) | 0/67 (0.0%) | 16/32 (50.0%) | 16/277 (5.8%) |
| gated-typed: false claim visits / claim visits | 0/6 (0.0%) | 0/3 (0.0%) | 3/6 (50.0%) | 3/15 (20.0%) |
| gated-method: false claim visits / claim visits | 0/154 (0.0%) | 0/55 (0.0%) | 16/32 (50.0%) | 16/241 (6.6%) |
| gated-slip: false claim visits / claim visits | 0/164 (0.0%) | 0/67 (0.0%) | 16/32 (50.0%) | 16/263 (6.1%) |

| Policy | A | B | C | All |
|---|---|---|---|---|
| existing: journeys with a false claim / all journeys | 30/300 (10.0%) | 16/120 (13.3%) | 21/80 (26.2%) | 67/500 (13.4%) |
| gated: journeys with a false claim / all journeys | 0/300 (0.0%) | 0/120 (0.0%) | 16/80 (20.0%) | 16/500 (3.2%) |
| gated-typed: journeys with a false claim / all journeys | 0/300 (0.0%) | 0/120 (0.0%) | 3/80 (3.8%) | 3/500 (0.6%) |
| gated-method: journeys with a false claim / all journeys | 0/300 (0.0%) | 0/120 (0.0%) | 16/80 (20.0%) | 16/500 (3.2%) |
| gated-slip: journeys with a false claim / all journeys | 0/300 (0.0%) | 0/120 (0.0%) | 16/80 (20.0%) | 16/500 (3.2%) |
| existing: weak visits claimed / weak visits | 69/933 (7.4%) | 29/392 (7.4%) | 21/403 (5.2%) | 119/1728 (6.9%) |
| gated: weak visits claimed / weak visits | 0/933 (0.0%) | 0/392 (0.0%) | 16/403 (4.0%) | 16/1728 (0.9%) |
| gated-typed: weak visits claimed / weak visits | 0/933 (0.0%) | 0/392 (0.0%) | 3/403 (0.7%) | 3/1728 (0.2%) |
| gated-method: weak visits claimed / weak visits | 0/933 (0.0%) | 0/392 (0.0%) | 16/403 (4.0%) | 16/1728 (0.9%) |
| gated-slip: weak visits claimed / weak visits | 0/933 (0.0%) | 0/392 (0.0%) | 16/403 (4.0%) | 16/1728 (0.9%) |

Existing false claims by the weak kind (all cohorts; a claim can be false on several kinds): two-step 37, both-sides 119, brackets 119, modelling 118.

## Missed genuine competence

| Definition | Policy | A | B | C | All |
|---|---|---|---|---|---|
| visits, all kinds strong | existing | 102/419 (24.3%) | 37/140 (26.4%) | 0/20 (0.0%) | 139/579 (24.0%) |
| visits, all kinds strong | gated | 241/419 (57.5%) | 73/140 (52.1%) | 4/20 (20.0%) | 318/579 (54.9%) |
| visits, all kinds strong | gated-typed | 413/419 (98.6%) | 137/140 (97.9%) | 17/20 (85.0%) | 567/579 (97.9%) |
| visits, all kinds strong | gated-method | 265/419 (63.2%) | 85/140 (60.7%) | 4/20 (20.0%) | 354/579 (61.1%) |
| visits, all kinds strong | gated-slip | 255/419 (60.9%) | 73/140 (52.1%) | 4/20 (20.0%) | 332/579 (57.3%) |
| journeys, S2 definition, final visit | existing | 16/100 (16.0%) | 9/40 (22.5%) | 0/0 (n/a) | 25/140 (17.9%) |
| journeys, S2 definition, final visit | gated | 41/100 (41.0%) | 17/40 (42.5%) | 0/0 (n/a) | 58/140 (41.4%) |
| journeys, S2 definition, final visit | gated-typed | 98/100 (98.0%) | 39/40 (97.5%) | 0/0 (n/a) | 137/140 (97.9%) |
| journeys, S2 definition, final visit | gated-method | 48/100 (48.0%) | 21/40 (52.5%) | 0/0 (n/a) | 69/140 (49.3%) |
| journeys, S2 definition, final visit | gated-slip | 45/100 (45.0%) | 17/40 (42.5%) | 0/0 (n/a) | 62/140 (44.3%) |
| journeys, each kind asked alone ≥ 2, final visit | existing | 13/95 (13.7%) | 7/38 (18.4%) | 0/0 (n/a) | 20/133 (15.0%) |
| journeys, each kind asked alone ≥ 2, final visit | gated | 36/95 (37.9%) | 15/38 (39.5%) | 0/0 (n/a) | 51/133 (38.3%) |
| journeys, each kind asked alone ≥ 2, final visit | gated-typed | 93/95 (97.9%) | 37/38 (97.4%) | 0/0 (n/a) | 130/133 (97.7%) |
| journeys, each kind asked alone ≥ 2, final visit | gated-method | 43/95 (45.3%) | 19/38 (50.0%) | 0/0 (n/a) | 62/133 (46.6%) |
| journeys, each kind asked alone ≥ 2, final visit | gated-slip | 40/95 (42.1%) | 15/38 (39.5%) | 0/0 (n/a) | 55/133 (41.4%) |
| kind pairs (S2 competentPairs: strong, ≥ 4 alone of that kind) | gated | 53/396 (13.4%) | 25/163 (15.3%) | 0/0 (n/a) | 78/559 (14.0%) |
| kind pairs (S2 competentPairs: strong, ≥ 4 alone of that kind) | gated-typed | 134/396 (33.8%) | 56/163 (34.4%) | 0/0 (n/a) | 190/559 (34.0%) |
| kind pairs (S2 competentPairs: strong, ≥ 4 alone of that kind) | gated-method | 62/396 (15.7%) | 29/163 (17.8%) | 0/0 (n/a) | 91/559 (16.3%) |
| kind pairs (S2 competentPairs: strong, ≥ 4 alone of that kind) | gated-slip | 65/396 (16.4%) | 25/163 (15.3%) | 0/0 (n/a) | 90/559 (16.1%) |

Why `gated` withholds the claim on competent visits. These are sub-skill reasons summed over visits, and a visit can have several:

| Reason | Visits |
|---|---|
| two-step: recovery required | 124 |
| brackets: fewer than 2 distinct right alone | 105 |
| modelling: fewer than 2 distinct right alone | 81 |
| both-sides: fewer than 2 distinct right alone | 80 |
| both-sides: recovery required | 59 |
| modelling: recovery required | 31 |
| brackets: recovery required | 26 |
| modelling: developing | 16 |
| two-step: developing | 15 |
| brackets: never asked | 13 |
| brackets: developing | 11 |
| two-step: fewer than 2 distinct right alone | 8 |
| both-sides: never asked | 8 |
| modelling: never asked | 8 |
| both-sides: developing | 8 |
| brackets: asked, only assisted | 2 |

## Sub-skill coverage at the end of each journey

| Sub-skill | Asked alone | Shown (gated) | Ever delayed-checked | Shown but never delayed-checked |
|---|---|---|---|---|
| two-step | 500/500 (100.0%) | 183/500 (36.6%) | 307/500 (61.4%) | 0/183 (0.0%) |
| both-sides | 275/500 (55.0%) | 130/500 (26.0%) | 62/500 (12.4%) | 105/130 (80.8%) |
| brackets | 268/500 (53.6%) | 128/500 (25.6%) | 29/500 (5.8%) | 113/128 (88.3%) |
| modelling | 302/500 (60.4%) | 170/500 (34.0%) | 202/500 (40.4%) | 25/170 (14.7%) |

## Retention coverage (the proposed plan)

When a sub-skill's check was due, the proposed plan asked for these items, summed over visits: two-step 40, both-sides 250, brackets 243, modelling 154.
Unchecked (the generator had too few fresh items): 0/687 (0.0%).

| Variant | Claims that rest on a due sub-skill never delayed-checked |
|---|---|
| gated | 76/277 (27.4%) |
| gated-typed | 3/15 (20.0%) |
| gated-method | 67/241 (27.8%) |
| gated-slip | 73/263 (27.8%) |

## Recovery targeting

- Visits where the existing policy requires (competency-wide) recovery: 632.
  - The proposed policy names a sub-skill on 470/632 (74.4%) of them:
    - two-step: 417
    - both-sides: 44
    - brackets: 16
    - modelling: 53
- The proposed policy requires recovery on a sub-skill while the existing one does not: 135 visits.
  These are failed sub-skill checks that the competency-wide recovery had already cleared by success elsewhere.
- The existing policy cleared recovery while a sub-skill was still in recovery: 3 (upper bound).
- The proposed policy claims while the existing one is in recovery, and the failing answer came before the sub-skill's own due date: 0.

## Additional questions required (lower bound: each one answered right alone on a fresh variant)

| Variant | Per visit where the existing policy claims and the proposed one does not: n, mean, median, max | Per journey at the first such visit | Per journey at the final visit, not claimed |
|---|---|---|---|
| gated | 283, 2.95, 3/2/1, 6 | 114, 2.83, 2/2/1, 6 | 418, 6.11, 7/6/7, 8 |
| gated-typed | 544, 2.52, 2/2/1, 8 | 189, 2.55, 2/2/1, 8 | 497, 5.60, 7/6/7, 8 |
| gated-method | 318, 2.76, 2/2/1, 6 | 124, 2.67, 2/2/1, 6 | 429, 5.99, 7/6/7, 8 |
| gated-slip | 297, 2.50, 2/2/1, 6 | 114, 2.68, 2/2/1, 6 | 422, 5.72, 7/6/7, 8 |

The medians are listed per cohort (A/B/C).

## Agreement (visits)

| Variant | Both claim | Only existing | Only proposed | Neither |
|---|---|---|---|---|
| gated | 276 | 283 | 1 | 1747 |
| gated-typed | 15 | 544 | 0 | 1748 |
| gated-method | 241 | 318 | 0 | 1748 |
| gated-slip | 262 | 297 | 1 | 1747 |

## Where the proposed policy is excessively restrictive

1. **`gated-typed` is unusable as specified.** It withholds the claim on almost every competent visit.
   - The module's modelling practice and its delayed check are `auleq`, a choice item.
   - Excluding choice items removes almost all modelling evidence.
2. **Recovery on a sub-skill the selector never offers again.**
   - Learners who are strong in every kind stay `recovery-required` on a sub-skill, mostly two-step, because they failed one delayed check earlier.
   - The existing selector never asks for two fresh right answers alone on that sub-skill.
   - This is the largest single reason in the table above.
3. **Never asked, or asked fewer than twice alone.**
   - The existing selector does not require both-sides or brackets.
   - A strong learner cannot be shown on them.
4. **`gated-method` and `gated-slip` behave close to `gated`.**
   - `gated-method` withholds a little more: bare answers and modelling are exempt.
   - `gated-slip` withholds a little more here, because a lone tolerated slip leaves the check pending.

None of these is evidence that the gate is wrong about the learner. They show that the gate needs a selector that asks for what it requires (07).

## The proposed policy's remaining false claims

All of the gated variants' false claims are in cohort C, and all are on profile C04, the negative control for misleading early success.

- The learner answers every kind correctly, alone, in the first visit.
- Every core sub-skill is genuinely demonstrated at that point.
- The knowledge then decays within days, before any delayed check is due.

No evidence-based gate can see this before the delayed check, so the gate does not remove it. Only retention catches it.

## What this does not show

- It does not show that the proposed policy improves learning. It declares mastery less often.
- Its zero false claims sit beside a large rise in missed competence on histories it did not choose.
- The precision and recall of a gated policy driven by its own selector are untested.
