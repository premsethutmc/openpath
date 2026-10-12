# E2a review: the guesser failure, slip-aware scoring and profile recovery

*12 October 2026 · research for PR #8 · **no production mathematics changed**. E2b and E3 have not
started.*

## Summary

- **Why the guesser fails.**
  - In the current model, a wrong answer pulls the estimate down by −a·L, where L is how likely the
    learner was to get it right. The guessing floor *c* never softens a wrong answer.
  - The simulated guesser (L9) answers at random 30% of the time. On the new low-guessing formats
    (typed, match, order, choose-all), a random answer is almost never right, so each one counts as a
    near-full failure.
  - Four-option items used to hide part of this, because a random answer is right a quarter of the
    time.
- **A slip-aware model is not recommended.** Over 10 seeds it does not fix the guesser.
  - It **inflates real gaps by +0.12 to +0.15 bands** (more than 3 standard errors).
  - It **weakens forgetting detection**: 0.6 to 0.7 fewer of the forgetter's 4 capabilities are
    flagged (about 2 standard errors).
  - On the E1 bank it also breaks efficiency (M5: 0.69 → 0.88–1.00).
- **What does separate the guesser is a consistency (person-fit) flag.** It never changes an
  estimate; it marks a profile as unreliable.
  - On the E2a bank it identifies the guesser with an AUC of 0.95 (0.94 when every learner also makes
    careless slips).
  - It flags the guesser in 8 or 9 of 10 runs, at a 5% false-flag rate among the other learners.
  - On the E1 bank it manages only 0.75–0.79, because four-option items hid random answering. The
    better bank is what makes disengagement detectable.
- **Profile recovery (M1) has not reliably declined.**
  - Over 10 seeds, E2a minus E1 is −0.05 ± 0.04, which cannot be told apart from zero. With realistic
    careless slips it is +0.10 ± 0.06 in E2a's favour.
  - What M1 is sensitive to is how far one wrong answer moves the estimate on the new, more
    informative items. Damping that step raises M1 on the frozen assumptions, but the gain disappears
    once learners really make slips.
  - Difficulty-label errors barely move M1, but they do erode honest uncertainty (M4).
- **Recommendation:**
  - Merge PR #8 with production mathematics unchanged.
  - Do not adopt the slip-aware model.
  - Record the consistency flag (and, separately, an exact-posterior update) as E4 options to decide
    with real learner data.
  - Leave M6's guesser criterion recorded as missed.

## 1 · How the current model treats guessing and wrong answers

Every code-scored item, whatever its format, is scored right or wrong and updated with the same
three-parameter model:

```
P(right) = c + (1 − c) · L,     L = logistic(a · (θ − b))
```

- **The guessing floor *c*** follows from the format: 1/n for one of n options; 1/n! for an order;
  1/(n!/(n−k)!) for matching k entries to n options; 1/C(n, k) for choosing k of n; 0 for typed.
- **The update** is one Laplace step from the current estimate:
  - the mean moves by (new variance) × (gradient of the log-likelihood);
  - the variance shrinks by the item's information at the current estimate.
- **For a right answer** the gradient is a(1 − c)L(1 − L)/P, so **guessing discounts right
  answers**.
- **For a wrong answer** the gradient is **−a·L**, so **c drops out entirely**. A wrong answer on an
  item well below the learner (L near 1) pulls with almost the full −a, in every format.
- There is no allowance for a learner who knows the answer but slips.

Pull of one answer at the current estimate (θ = 4), for an item 2 bands below, at, and 2 bands above
the learner (`node tools/english/research/worked-example.ts`):

| Format | a | c | Right, 2 below | Right, at | Right, 2 above | Wrong, 2 below | Wrong, at | Wrong, 2 above | Information at level |
|---|---|---|---|---|---|---|---|---|---|
| choice, 4 options | 1.1 | 0.25 | +0.08 | +0.33 | +0.23 | −0.99 | −0.55 | −0.11 | 0.18 |
| choice, 10 options | 1.1 | 0.10 | +0.10 | +0.45 | +0.47 | −0.99 | −0.55 | −0.11 | 0.25 |
| multi, 2 of 5 | 1.1 | 0.10 | +0.10 | +0.45 | +0.47 | −0.99 | −0.55 | −0.11 | 0.25 |
| multi, 2 of 6 | 1.0 | 1/15 | +0.11 | +0.44 | +0.55 | −0.88 | −0.50 | −0.12 | 0.22 |
| match, 3 to 4 | 1.2 | 1/24 | +0.10 | +0.55 | +0.72 | −1.10 | −0.60 | −0.10 | 0.33 |
| match, 4 to 5 | 1.2 | 1/120 | +0.10 | +0.59 | +1.00 | −1.10 | −0.60 | −0.10 | 0.35 |
| order, 4 items | 1.2 | 1/24 | +0.10 | +0.55 | +0.72 | −1.10 | −0.60 | −0.10 | 0.33 |
| typed | 1.3 | 0 | +0.09 | +0.65 | +1.21 | −1.21 | −0.65 | −0.09 | 0.42 |

**Why E2a exposed the guesser.** The wrong-answer pull is the same for a four-option item and a
choose-two item with the same discrimination (−0.99). What differs is what a *random* answer looks
like:

- **Four-option item:** it is right 25% of the time, close to what *c* already allows for.
- **Typed, match, order or choose-all item:** it is almost never right, while the model expects a
  learner at that level to be right most of the time.

So the guesser's random answers cost more on the new formats, which are also more informative. The
guesser's reading strand, with only a few such items, ended 1.21 bands too low on the frozen seed.

## 2 · Would a slip-aware model fix it without inflation or lost sensitivity?

**The candidate.** A four-parameter model with a slip rate *s*: P(right) = c + (1 − s − c) · L. It is
updated in exactly the same one-step form, and with s = 0 it equals production to within 1e−13
(tested). A wrong answer then pulls by −a(1 − s − c)L(1 − L)/(1 − P), which shrinks towards zero for
items far below the learner.

**How it was tested.** As a research seam that production never sets (`researchBinaryUpdate`;
default unset, fingerprints unchanged and tested), across:

- 2 banks (E1, E2a);
- 4 response models (production, slip 0.05, slip 0.10, and an exact-posterior version of production);
- 4 simulator assumptions (as frozen; every learner slips 3%; true difficulties differ from the
  labels by sd 0.5 or 0.75);
- 10 seeds each, 320 runs (`node tools/english/research/experiments.ts`).

**E2a bank, simulator as frozen, paired against production over 10 seeds (mean ± standard error):**

| Effect of the alternative | slip 0.05 | slip 0.10 | exact 3PL update |
|---|---|---|---|
| Guesser's largest strand error | +0.04 ± 0.15 | −0.12 ± 0.20 | −0.04 ± 0.11 |
| Guesser criterion passes (of 10) | 0 (production 1) | 2 | 1 |
| **Bias on real gaps** (true level ≤ 3.5) | **+0.12 ± 0.04** | **+0.15 ± 0.04** | −0.06 ± 0.05 |
| **Forgetter capabilities flagged** (of 4) | **−0.6 ± 0.3** | **−0.7 ± 0.3** | −0.3 ± 0.2 |
| M4 honest uncertainty (points) | +5.2 ± 1.7 | +7.8 ± 1.5 | +4.8 ± 1.3 |
| M1 profile recovery | +0.09 ± 0.04 | +0.14 ± 0.04 | +0.10 ± 0.05 |
| M5 efficiency ratio | −0.02 | 0.00 | +0.13 (worse) |

**Verdict: no.**

- It does not solve the guesser. A 30% random rate is far outside what a slip rate of 0.05–0.10
  models, so the guesser's error stays around 1.2–1.4.
- It does what you were concerned about: it **inflates estimates of real gaps** and **makes
  forgetting harder to detect**. Both effects are larger than their standard errors.
- On the E1 bank it also harms efficiency badly (M5 0.69 → 0.88 at s = 0.05, 1.00 at s = 0.10).
- Its benefits (better-calibrated uncertainty, and a better M1 on the frozen assumptions) do not
  outweigh inflating the very gaps the product exists to find.

**What does work for the guesser: a consistency flag.**

- **The statistic:** the standardised log-likelihood *l_z* (person-fit) of each learner's answers,
  under the production model at their final estimates. It changes no estimate.
  (`node tools/english/research/person-fit.ts`)

| Bank | Simulator | AUC, guesser against others | Guesser runs flagged at a 5% false-flag threshold |
|---|---|---|---|
| E1 | as frozen | 0.79 | 4 of 10 |
| E1 | every learner slips 3% | 0.75 | 1 of 10 |
| **E2a** | as frozen | **0.95** | **8 of 10** |
| **E2a** | every learner slips 3% | **0.94** | **9 of 10** |

- **What the product should do:** if answers look random, flag the profile as unreliable and check
  engagement, rather than re-weight answers so the estimate looks better.
- **The threshold** must be set from real learners, because adaptive testing shifts *l_z* upwards,
  so the textbook cut-off of −2 flags nothing here.
- **M6:** its guesser criterion (no strand off by more than 1.0 band despite 30% random answers)
  stays **missed and recorded**. No estimator tested meets it, and none should be tuned to.

## 3 · Worked numerical comparison

A learner estimated at **5.00 ± 0.60** on subject–verb agreement answers a typed item of difficulty
**3.0** (a = 1.3, c = 0) **wrong**.

| Step | Production (3PL) | Slip-aware, s = 0.05 | Slip-aware, s = 0.10 |
|---|---|---|---|
| L = logistic(1.3 × (5.0 − 3.0)) | 0.9309 | 0.9309 | 0.9309 |
| P(right) at 5.0 | 0.9309 | 0.8843 | 0.8378 |
| Information at 5.0 | 0.1088 | smaller | smaller |
| New variance | 1 / (1/0.36 + 0.1088) = 0.3464 | 0.352 | 0.355 |
| Pull of the wrong answer | −a·L = −1.2101 | −0.6871 | −0.4642 |
| **New mean** | 5.00 + 0.3464 × (−1.2101) = **4.581** | **4.758** | **4.835** |

**Is the learner careless or really weaker?** The model cannot know. If the same learner truly has a
gap (true level 3.0) and keeps getting items near 3.5 wrong:

| After | Production | s = 0.05 | s = 0.10 |
|---|---|---|---|
| 1 wrong | 4.62 ± 0.58 | 4.72 ± 0.59 | 4.79 ± 0.59 |
| 3 wrong | 4.02 ± 0.53 | 4.21 ± 0.55 | 4.37 ± 0.56 |
| 5 wrong | 3.62 ± 0.48 | 3.81 ± 0.50 | 3.99 ± 0.52 |

The slip-aware model needs about one to two more wrong answers to reach the same estimate. That is
the lost sensitivity, in miniature.

**A right answer on a hard item is almost unaffected** (b = 7.0: 5.419 against 5.420 and 5.421), so
the inflation comes from discounting wrong answers, not from crediting right ones.

## 4 · What drives the profile-recovery (M1) decline?

M1 is measured after 40 items. Paired differences over 10 seeds, mean ± standard error:

| Comparison | Effect on M1 |
|---|---|
| **Bank:** E2a against E1, as frozen | −0.05 ± 0.04 (not distinguishable from zero) |
| **Bank:** E2a against E1, every learner slips 3% | **+0.10 ± 0.06** (E2a better) |
| **Bank:** E2a against E1, labels off by sd 0.5 | −0.03 ± 0.04 |
| **Response model:** slip 0.10 against production, E2a, as frozen | **+0.14 ± 0.04** |
| **Response model:** the same, when learners really slip 3% | +0.02 ± 0.05 |
| **Update approximation:** exact against one-step, E2a, as frozen | +0.10 ± 0.05 |
| **Update approximation:** exact against one-step, E1, as frozen | −0.03 ± 0.05 |
| **Difficulty labels:** off by sd 0.5, E2a | −0.02 ± 0.03 |
| **Difficulty labels:** off by sd 0.75, E2a | −0.02 ± 0.06 |
| **Simulator:** learners slip 3%, E2a | +0.02 ± 0.04 |
| **Simulator:** learners slip 3%, E1 | **−0.13 ± 0.06** |

**It is a combination, and mostly noise.**

- **The frozen-seed fall (0.64 → 0.40) is mainly that seed.** One near-flat profile (L8) swings its
  rank correlation from 0.85 to −0.78. Across 10 seeds, the bank's effect is not distinguishable
  from zero, and it reverses when learners make realistic slips.
- **The response model and update step matter on the frozen assumptions only.** On E2a's informative
  items, the one-step update moves a long way after a single wrong answer. Damping that step, with a
  slip term or an exact posterior, raises M1 by about 0.1 when learners answer exactly as the model
  says. When they really make slips the gain disappears, and the slip term brings the inflation shown
  above.
- **Difficulty estimates hardly affect M1 (rankings), but they do affect M4 (honesty).** With labels
  off by sd 0.75, M4 falls from 77% to 72%, with one seed at 68%, below the 70% floor. Calibrating
  difficulties from real responses matters more for honest uncertainty than for rankings.
- **Simulator assumptions** flatter the E1 bank more than E2a. With 3% slips, E1's M1 falls by 0.13
  and E2a's does not move. E2a's more numerous, less guessable items make rankings more robust to
  careless errors.
- **No configuration reaches M1's 0.8 pass level** (the best is 0.71). As in E1, 40 items over 17
  capabilities is the binding limit.

**One further finding about M5.** The exact posterior shrinks uncertainty less than the one-step
update: M5 goes from 0.49 to 0.62 on E2a, and from 0.69 to 0.94 on E1. So part of production's
efficiency comes from the one-step update slightly overstating how much each answer tells us. M4
stays in range, so this is not a defect today, but it should be revisited with real data before
efficiency claims are made.

## 5 · Reproducibility (points 5 and 7)

- **The E1 bank is preserved** exactly as merged, in `content/english/baselines/e1/`. Load it with
  `loadContext({ bank: "e1" })`.
- **The E1 results** are in `tools/english/baselines/e1-simulation-results.json`. A test reruns the
  frozen simulation on the E1 bank and checks it **reproduces E1's fingerprint exactly**.
- **The research tools** live in `tools/english/research/`; production code never imports them (a
  test checks this).
  - `slip.ts`: slip-aware and exact updates.
  - `experiments.ts`: the 320-run grid.
  - `person-fit.ts`: the consistency flag.
  - `worked-example.ts`: every number in sections 1 and 3.
  - `summarise.py`: grid averages.
- **The research seam** (`researchBinaryUpdate`) and the simulator options (careless slips,
  mis-labelled difficulties) are off by default. Both production fingerprints (E1 bank and E2a bank)
  are unchanged with them in place.
- **No educational content changed.** Every item, ladder, rationale and specification is still
  marked *candidate, unvalidated*.

## Recommendation

1. **Merge PR #8** with production mathematics unchanged, once you are content with this review.
2. **Do not adopt the slip-aware model.**
3. **Record two E4 options** (`E4_DESIGN_OPTIONS.md`), to decide with real learner data:
   - a **consistency flag** for disengaged or random answering, which changes no estimate;
   - an **exact-posterior update** for the same 3PL model: better-calibrated uncertainty, no gap
     inflation, but lower apparent efficiency. It changes the update mathematics, so it needs your
     approval.
4. **Leave M6's guesser criterion recorded as missed.**
