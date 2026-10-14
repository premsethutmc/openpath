# Why the frozen simulation misses M1 and the guesser half of M6

**Date:** 14 October 2026 · branch `product/adaptive-spelling-assessment`.

**What this is:** an investigation of two misses in the frozen ten-learner simulation
(`node tools/english/sim/main.ts`):

- **M1 Profile recovery after 40 items:** mean Spearman ρ = 0.40 (pass level ≥ 0.8).
- **M6 Robustness:** guesser not ok; forgetter ok.

**What it is not:** a fix. No existing file was changed: not the simulation, its pass levels, the engine, or
the Learner Vector mathematics. Nothing was tuned. Every number below comes from one script:

```
node tools/english/research/sim-weaknesses.ts
```

- It is deterministic: two runs gave byte-identical output.
- It takes about 50 seconds.
- It uses the 10 seeds of the earlier research (`tools/english/research/experiments.ts`). Seed 20261012 is the
  frozen run.
- "± x" is one standard error over the 10 seeds.

**How the counterfactual runs work.** They only use seams that already exist for research:

- `runLearner` options: seed, session days, mode and order.
- `Context.researchBinaryUpdate`. Production never sets it.
- An in-memory copy of the framework index with its couplings removed. The framework file is untouched.

Each counterfactual isolates one cause. None is a proposal.

**Earlier work this builds on:**

- `docs/english/E1_REPORT.md` ("Why M1, M2 and M3 miss").
- `docs/english/E2A_REPORT.md`.
- `docs/english/E2A_RESPONSE_MODEL_REVIEW.md`. This covered the guesser, slip-aware models and person-fit.

Where this report repeats an earlier finding, it says so. The new findings are:

- the tie ceiling;
- the compression and noise breakdown;
- the selection feedback loop for the guesser;
- the honest-learner calibration of the guesser criterion.

---

## Summary

### M1: profile recovery (0.40)

1. **0.40 is an unlucky seed.** Over 10 seeds, M1 is **0.57 ± 0.03**. No seed reaches 0.8; the best is 0.78.
2. **The criterion has a built-in ceiling of 0.914.** It applies to near-flat profiles:
   - **L6** has five tied strands, so **no estimate can give it more than ρ = 0.65**. On the frozen seed L6
     scores exactly 0.65: a perfect recovery.
   - **L8** has four tied strands, so its maximum is 0.85.
   - So even perfect estimates average 0.914. The other four learners must average 0.83 or more for the mean
     to reach 0.8.
3. **The main cause is too little evidence for the size of the differences being ranked.**
   - After 40 items there are about **2.0–2.7 observations per capability**. Every capability has at least
     one, so none is left at the starting value.
   - Each strand's estimate has about **0.52 bands** of error that can change its rank.
   - Estimated profiles are **compressed to 65% of their true spread**, because estimates are pulled towards
     the 4.0 starting value.
   - Together that is an effective noise of **0.70 bands**, against true strand gaps that are often only
     0.1–0.25 bands. At that noise level the expected ρ is 0.63; observed is 0.57.
4. **These are not causes:**
   - **Selection:** assessment-only gives 0.56; random order gives 0.50.
   - **Inferred shifts:** direct-only estimates give 0.54. Removing couplings gives +0.01 ± 0.05.
   - **Unassessed leaves:** none.
   - **Item-bank gaps or ceiling:** gaps affect only which item is practised. Every capability has items up
     to 7.5–7.75.
   - **Difficulty labels:** the simulated learners answer with exactly the labelled parameters.
5. **More items help, but slowly.**
   - M1 is 0.66 at 80 items, 0.70 at 120 and **0.75 at 200**.
   - At 200 items, 5 of 10 seeds pass.
6. **The one-step Laplace update costs some M1.** An exact posterior gives **+0.09 ± 0.05**. This repeats the
   E2a review.
7. **One single-seed effect is worth knowing about.** On the frozen seed, inferred shifts from neighbouring
   capabilities pushed L8's defining weakness (run-ons, true level 3.0) up to 4.46. Its one direct
   observation says 3.63. A low writing band close to the truth was then *held* as surprising (check 9).

### M6: the guesser

1. **The error limit fails; the range limit passes on the frozen seed.**
   - L9's reading strand is 2.79 against a true 4.0, an error of **1.21** (limit 1.0).
   - The range is **1.13** (limit 1.2).
   - Over 10 seeds, the error limit fails 8 times and the range limit 5 times. Both pass on only 2 seeds.
2. **The cause is a biased estimate, not noise or the update method.**
   - Every strand is pulled down, by **−0.67 ± 0.09** on average.
   - The response model has no allowance for random answering. A learner who knows the answer but answers at
     random 30% of the time looks like a learner of lower ability.
   - This happens in **every format**. Format barely matters at equilibrium: −0.43 for typed items and −0.56
     for four-option items, at an item pitched at the learner.
   - **Easier items pull further** (about −1.5 at two bands below the learner).
3. **A new finding: selection makes it worse.**
   - Items are pitched near the current estimate. A lower estimate brings easier items, which pull it lower
     still.
   - That loop settles **0.63–0.92 bands below the truth**. The observed bias is −0.67.
4. **The Laplace step is not the cause.** An exact posterior gives −0.70 ± 0.08 and passes on 2 of 10 seeds,
   the same as production.
5. **No person-fit check is used, although one already works in research.**
   - `tools/english/research/person-fit.ts` (*l_z*) separates the guesser with an **AUC of 0.94**.
   - It flags the guesser on **8 of 10 seeds**, including the frozen seed, at a 5% false-flag rate.
   - The engine, the report and M6 do not use it. The textbook cut-off of −2 flags nothing.
6. **The criterion itself is near the noise floor.**
   - The honest flat learner L1 fails the same test on **3 of 10 seeds**. Its range is 1.13 ± 0.18 against a
     limit of 1.2.
   - Even a diagnostic model told the true 30% random rate removes the bias (0.00 ± 0.10) but passes on only
     **5 of 10** seeds.

---

## Part 1 · M1: profile recovery after 40 items

### 1.1 How ρ is computed

These details come from `tools/english/sim/simulate.ts` (`measures`, M1) and `criteria.ts`.

| Aspect | What the frozen code does |
|---|---|
| **Learners** | L2, L3, L4, L5, L6, L8. L1 and L7 are flat, so ρ is undefined for them. L9 and L10 are covered by M6. |
| **When** | The snapshot after session 2 (`sessions[1]`): **40 items**, on day 1, with truth taken on day 1. |
| **Strands** | The 6 strands EN.FND, EN.VOC, EN.GRM, EN.SEN, EN.RDG and EN.WRT. |
| **True value** | The equal-weight mean of the learner's true levels on the skeleton capabilities in that strand. The counts are FND 1, VOC 3, GRM 4, SEN 2, RDG 3 and WRT 4. |
| **Estimate** | `aggregate()` on framework 0.1.0. It takes the weighted mean of the **combined** leaf means (direct evidence plus capped inferred shifts) of the *specified* leaves. In 0.1.0 those are exactly the 17 skeleton capabilities, all with weight 1. The script checks that this equals the plain mean (largest difference 9e−16). |
| **Unassessed leaves** | Not included, because unspecified leaves are not counted. In practice every one of the 17 leaves has direct evidence after 40 items (0 of 1,020 learner-leaves without). |
| **Statistic** | Spearman ρ over the 6 strands (ties get average ranks), per learner, then averaged over the 6 learners. |

**Frozen run, true → estimated strand values:**

| Learner | FND | VOC | GRM | SEN | RDG | WRT | ρ |
|---|---|---|---|---|---|---|---|
| L2 | 2.00→2.94 | 3.17→3.98 | 3.38→3.71 | 3.25→3.38 | 3.67→3.27 | 2.88→3.12 | 0.49 |
| L3 | 5.00→4.00 | 6.00→5.52 | 4.88→3.88 | 4.25→4.40 | 6.50→5.57 | 3.63→3.46 | 0.83 |
| L4 | 5.00→4.95 | 6.33→5.44 | 3.50→3.14 | 4.75→3.23 | 5.50→4.58 | 4.63→4.62 | 0.71 |
| L5 | 5.50→4.71 | 3.50→4.08 | 6.00→5.22 | 5.25→5.42 | 4.33→4.64 | 5.25→5.39 | 0.52 |
| L6 | 5.00→5.09 | 5.00→4.77 | 5.00→4.72 | 5.00→4.91 | 4.00→4.14 | 5.00→5.02 | 0.65 |
| L8 | 5.00→4.32 | 5.00→4.67 | 4.75→5.10 | 4.00→4.69 | 5.00→3.93 | 5.00→4.51 | −0.78 |
| **Mean** | | | | | | | **0.40** |

### 1.2 Hypotheses, experiments and results

| # | Hypothesis | Experiment | Result | Verdict |
|---|---|---|---|---|
| T | **Tied true values cap ρ.** *(New.)* | ρ of the true values against themselves, with ties broken arbitrarily. This is the best any set of distinct estimates can reach. | Best ρ: L2 1.00, L3 1.00, L4 1.00, L5 0.99, **L6 0.65**, **L8 0.85**. Mean **0.914**. L6's frozen 0.65 is its maximum. | **Supported.** This is a property of the criterion, not the engine. |
| S | **0.40 is seed noise.** | The frozen procedure on 10 seeds. | M1 is **0.57 ± 0.03** (range 0.40–0.78), with 0 of 10 seeds ≥ 0.8. Per learner over the seeds: L2 0.64, L3 0.68, L4 0.82, L5 0.61, **L6 0.34**, **L8 0.32**. L8 ranges from −0.78 to 0.85. | **Supported.** 0.40 is the worst of the 10 seeds, but the typical value also misses. |
| a | **Too few items per strand.** | Count accepted direct observations per strand and leaf after 40 items. Relate them to error. | Mean observations per strand: FND 2.7, VOC 7.6, GRM 10.8, SEN 4.0, RDG 6.6, WRT 10.1. That is **2.0–2.7 per leaf** (1 to 12 for a single leaf). Strand error is 0.58 with fewer than 2.5 observations per leaf and 0.40 with 2.5 or more. The rank-relevant error is highest on the strands with one or two leaves or mostly four-option items: FND 0.58, SEN 0.60, RDG 0.59. GRM is 0.38 and WRT 0.42. | **Supported.** This is the main cause (see 1.3). |
| b | **Selection concentrates on some strands**, leaving others at the starting value. | Leaves without evidence, the scheduler mix, and forced policies over 10 seeds. | No leaf is at the starting value. Of the first 40 activities, 80% are initial assessment. Assessment-only gives **0.56 ± 0.03** and random order **0.50 ± 0.04**, against hybrid's 0.57. | **Not supported.** The E1 report found the same. |
| c1 | **Unassessed leaves at the 4.0 start flatten strand values.** | Inspect `aggregate()` coverage. | On 0.1.0, only the 17 specified leaves count, and all have direct evidence. (On 0.2.0 this would matter; see `E2B_REPORT.md`.) | **Not supported** for the frozen simulation. |
| c2 | **Inferred shifts flatten differences.** | Compare direct-only and combined estimates on the same runs. Separately, remove the couplings in memory. | The mean leaf \|combined − direct\| is 0.17 (90th percentile 0.40, max 1.23). Direct-only M1 is **0.54 ± 0.03**, which is −0.03 ± 0.02 (slightly *worse*). With no couplings it is **0.58 ± 0.04**, +0.01 ± 0.05. On the frozen seed alone it is 0.77. That run takes a different path (selection changes too): L8 −0.78 → 0.85, L5 0.52 → 0.99, L2 0.49 → 0.77, but L3 0.83 → 0.66. | **Not supported on average.** The seed-to-seed swings are large in both directions. There is a real single-seed mechanism (1.4). |
| c3 | **Shrinkage towards the 4.0 start compresses profiles.** *(New quantification.)* | Within each learner, regress the estimated strand profile on the true profile, pooled over 10 seeds. | Estimate ≈ **0.65 × truth** + residual sd 0.46. Strands at 5.5 or above are underestimated by **0.72 ± 0.07**. Strands at 3.5 or below are overestimated by 0.18 ± 0.05. | **Supported** as a contributor. Compression keeps ranks only if it is equal for every strand, and it divides the signal by 0.65. |
| d1 | **Item-bank gaps** (446 of 513 learning choices hit one). | Count gaps in the first 40 items. Read what a gap does in `selection.ts`. | In the first 40 items, 37 of 70 learning choices for these learners hit a gap. A gap only means the most-needed capability had no unused item at 55–85% predicted success, so another item is chosen. It does not change how an answer is scored. Learning is only 12% of the first 40 activities. | **Not supported** as a cause of M1. It is a content limit for practice. |
| d2 | **Ceiling or floor:** no items hard or easy enough. | Difficulty range per capability, against these learners' true levels. | Every capability has 12–17 items, with difficulties from about 2 to 7.5–7.75. Each has 4–6 items at 6 or above and 1–3 at 2.5 or below. The highest true level among the M1 learners is 6.5 and the lowest is 2.0. | **Not supported** at these levels. (The ceiling still matters for L7 at 7.5.) |
| d3 | **Difficulty labels are wrong.** | In the frozen simulation, learners answer with the labelled parameters, so labels are exactly right by construction. For context only: responses drawn from true difficulties off by sd 0.5 or 0.75. | 0.54 ± 0.02 and 0.55 ± 0.04 (paired −0.03 and −0.02, not significant). | **Not a cause** in the frozen simulation, and the measure is insensitive to it. |
| e1 | **More items fix it.** | Snapshots every 20 items. Runs extended to 200 items (10 sessions). | See the table below. M1 is 0.66 at 80 items, 0.70 at 120 and **0.75 at 200**. Seeds at 0.8 or above: 0, 2 and 5 of 10. | **Partly.** Error shrinks slowly. L2's tightly packed strands get *worse* by 120 items (0.64 → 0.54). |
| e2 | **The one-step Laplace update loses information.** | `researchBinaryUpdate = exactModel(0)`: the same 3PL model with an exact grid posterior. | **0.66 ± 0.03**, a paired change of **+0.09 ± 0.05**. | **Supported, modestly.** The E2a review found the same (+0.10). |

**M1 as evidence accumulates** (10 seeds, production unless stated):

| | 20 | 40 | 60 | 80 | 100 | 120 | 160 | 200 |
|---|---|---|---|---|---|---|---|---|
| M1, combined (production) | 0.50 | **0.57** | 0.63 | 0.66 | 0.69 | 0.70 | 0.74 | 0.75 |
| M1, direct only | 0.46 | 0.54 | 0.62 | 0.64 | 0.68 | 0.69 | | |
| Rank-relevant strand error (RMS) | 0.58 | 0.52 | 0.47 | 0.46 | 0.44 | 0.43 | 0.40 | 0.37 |
| Seeds at 0.8 or above | | 0 | | 0 | | 2 | 5 | 5 |

The 160- and 200-item columns, and the error and pass counts at 80 and 120, come from the extended runs. Their
values at 40, 80 and 120 match the snapshots.

### 1.3 Why the numbers fit together

**The tie ceiling.** L6 differs from flat on one strand only (reading 4.0, everything else 5.0). Spearman ranks
the five tied strands equally, while estimates are never exactly tied. The best possible ρ is therefore
√(7.5/17.5) = **0.65**. L8 differs on two strands (sentences 4.0, grammar 4.75), so its best is √(12.5/17.5) =
**0.85**.

**The noise ceiling.** Suppose every strand estimate were the truth plus independent, unbiased error of sd σ.
The expected ρ would then be:

| Learner | σ = 0.20 | 0.30 | 0.40 | 0.50 |
|---|---|---|---|---|
| L2 | 0.88 | 0.80 | 0.73 | 0.66 |
| L3 | 0.98 | 0.96 | 0.93 | 0.90 |
| L4 | 0.96 | 0.92 | 0.89 | 0.85 |
| L5 | 0.95 | 0.92 | 0.88 | 0.83 |
| L6 | 0.65 | 0.64 | 0.60 | 0.55 |
| L8 | 0.72 | 0.65 | 0.59 | 0.53 |
| **Mean** | **0.86** | **0.82** | 0.77 | 0.72 |

So passing M1 needs strand errors of about **0.3 bands or less** after 40 items.

**What the engine actually achieves:**

- A profile compressed to 65% of its true spread, plus 0.46 residual error. That is an effective error of
  **0.70 bands** on the true scale.
- The expected ρ at that level is L2 0.55, L3 0.83, L4 0.76, L5 0.74, L6 0.45 and L8 0.42: **mean 0.63**.
- The observed mean is 0.57. The remaining 0.06 is consistent with errors that are not independent: shrinkage
  that is uneven between strands, and inferred shifts.

**Why the error is that large after 40 items:**

- 40 activities spread over 17 capabilities is about 2.4 observations each.
- Many of them are four-option choice items, which carry little information each (about 0.18 at the learner's
  level; see the E2a review table).
- The leaf posterior sd after 40 items is typically 0.5–1.2.
- A strand with one leaf (FND) gets no averaging, and a strand with two (SEN) gets little.
- Starting at 4.0 with sd 1.5, a leaf with two or three such answers keeps much of the prior. That is the
  compression.

### 1.4 A single-seed mechanism worth knowing: inference masking a defining weakness (L8, frozen seed)

L8's defining weakness is run-on sentences (true 3.0). In the first 40 items, this happened:

1. One writing band (3.5) was accepted. That is the only direct observation.
2. Four answers on subordination and commas came next, all right (L8 is 5.0 on subordination and 4.0 on
   commas). Through their couplings (0.30 and 0.35, each shift capped at 0.25), they moved run-ons' *combined*
   estimate up by +0.23, +0.13, +0.25 and +0.10, a total of **+0.71**. They also shrank its uncertainty.
3. A second writing band of **2.5**, near the true 3.0, arrived when the combined estimate was
   **4.34 ± 0.71**. Check 9 *held* it as more than 2.5 sd from the estimate.
4. Two more coupled answers followed (+0.18 and −0.06). After 40 items, run-ons stood at a combined
   **4.46 ± 0.69**, with a direct estimate of 3.63 from one observation. The sentences strand came out *above*
   grammar, the reverse of the truth.

Other effects of the same pattern:

- The narrowed combined sd also made run-ons look settled to selection, which uses the combined estimate.
- With couplings removed, this seed's L8 ρ goes from −0.78 to 0.85. Other learners on the same seed move both
  ways.
- Averaged over 10 seeds, inference neither helps nor hurts (+0.01 ± 0.05). So this is a real but occasional
  failure mode, not the cause of M1.

In the first 40 items on the frozen seed, the engine withheld three more writing bands (L2, L3, L5). Each one is
the evaluator's noisy reading (sd 0.7) of the learner's true level:

- one rejected by check 3 (band 1, out of the task's range);
- two held by check 9.

---

## Part 2 · M6: the guesser (L9)

### 2.1 The learner and the criterion

**The learner** (`tools/english/sim/learners.ts`): L9 has a true level of 4.0 on all 17 capabilities. On every
right/wrong item, with probability 0.3, it answers at random:

| Format | How a random answer scores |
|---|---|
| Choice | Right with probability 1/n |
| Typed | Right with probability 0.05; otherwise "(no answer)" |
| Order, match, multi | Right at the guessing floor |

Otherwise it answers by the engine's own 3PL model. Its writing is not affected: the evaluator sees its true
level plus noise.

**The criterion** (`criteria.ts`, measured at the end of the run, after 120 items):

- No strand estimate is more than **1.0** from the truth.
- The estimated strand range is no wider than **1.2**.

### 2.2 What fails, with numbers

**Frozen run, per strand:**

| | FND | VOC | GRM | SEN | RDG | WRT |
|---|---|---|---|---|---|---|
| Estimate | 3.49 | 3.41 | 3.92 | 3.84 | **2.79** | 3.73 |
| Error | −0.51 | −0.59 | −0.08 | −0.16 | **−1.21** | −0.27 |

- The largest error is **1.21** on reading, so the error limit **fails**.
- The range is **1.13**, so the range limit **passes**.
- The mean signed error is −0.47.

**Per capability, frozen run** (right answers / items answered):

| Capability | Estimate | n | Evidence |
|---|---|---|---|
| Main idea | **2.23** | 13 | choice 3/11, match 0/2 |
| Aspect | 2.53 | 4 | typed 1/4 |
| Motives | 2.58 | 7 | choice 2/6, multi 1/1 |
| Suffixes | 2.85 | 13 | typed 2/9, choice 2/3, match 1/1 |
| Subject–verb agreement | 4.69 | 4 | typed 3/4 |
| Articles | 4.57 | 5 | typed 3/5 |

Reading has 28 right/wrong answers, 22 of them four-option choice, and no writing evidence.

**Over 10 seeds:**

| | Frozen | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 |
|---|---|---|---|---|---|---|---|---|---|---|
| Max \|error\| | 1.21 | 1.18 | 1.23 | 0.88 | 0.75 | 1.97 | 1.81 | 1.49 | 1.69 | 1.31 |
| Worst strand | RDG | FND | SEN | RDG | RDG | RDG | SEN | WRT | RDG | VOC |
| Range | 1.13 | 0.98 | 1.67 | 1.00 | 1.14 | 2.58 | 1.92 | 1.42 | 1.15 | 1.37 |
| Mean signed error | −0.47 | −0.62 | −0.48 | −0.47 | −0.24 | −0.74 | −0.69 | −0.95 | −1.23 | −0.81 |

- **Error limit:** passes on 2 of 10 seeds.
- **Range limit:** passes on 5 of 10.
- **Both:** pass on 2 of 10.

**Mean signed error per strand over 10 seeds:**

| FND | VOC | GRM | SEN | RDG | WRT |
|---|---|---|---|---|---|
| −0.67 | −0.43 | −0.55 | −0.74 | **−0.99** | −0.65 |

**So the main failure is a large error (a downward bias plus noise); a range that is too wide is the second.**
Both get worse because each strand is biased down by a different amount.

### 2.3 Hypotheses, experiments and results

| # | Hypothesis | Experiment | Result | Verdict |
|---|---|---|---|---|
| G1 | **The 3PL response model has no allowance for random answering**, so 30% random answers read as lower ability. | Work out analytically the level the estimate settles at with many answers to items of difficulty b. That is where the model's P(right) equals the real success rate 0.7·P(θ = 4) + 0.3·(chance a random answer is right). | Settled estimate minus truth, by format (rows) and difficulty b (columns): see the table after this one. | **Supported.** This is the root cause. |
| G2 | **Typed items are the problem**, because the guessing floor is 0 and random typed answers count as wrong. | The same table, compared across formats. | At equilibrium, typed items are *less* biased than choice items at the same difficulty. A typed answer moves the estimate further per answer (higher information), so the bias appears sooner, but the destination is similar. (The E2a review emphasised per-answer pull; this adds the equilibrium view.) | **Weakly supported.** Format matters little; difficulty matters a lot. |
| G3 | **Selection feeds the bias.** *(New.)* | Fixed point when items are pitched at the current estimate (b = estimate). Actual difficulties L9 answered. | The estimate settles **−0.63** (typed) to **−0.92** (three-option choice) below the truth. The observed mean bias is −0.67 ± 0.09. L9's items averaged b = 3.1–4.1, below its true 4.0. | **Supported.** A lower estimate brings easier items, which pull it lower still. |
| G4 | **The one-step Laplace update is overconfident** with inconsistent responses. | `researchBinaryUpdate = exactModel(0)`: the same model, exact posterior, 10 seeds. | Mean signed error **−0.70 ± 0.08** (production −0.67 ± 0.09). Max error 1.31 ± 0.09 (1.35). Passes on 2 of 10 seeds (2 of 10). | **Not supported.** |
| G5 | **The model is right except for the random rate.** A diagnostic: the exact posterior of a model told the true 30% rate. | A grid posterior for 0.3·(guess) + 0.7·3PL, 10 seeds. This is not a proposal: no real learner's rate is known. | Bias **0.00 ± 0.10**. But max error 0.80 ± 0.11, range 1.09 ± 0.12, and it passes on only **5 of 10** seeds. | **Supported** for the bias. It also shows the criterion is close to the noise floor. |
| G6 | **The criterion is near the noise floor.** *(New.)* | The same test applied to L1, who is flat at 5.0 and never guesses. | L1: max error 0.73 ± 0.10, range **1.13 ± 0.18**. It fails the test on **3 of 10** seeds (error ok 8/10, range ok 7/10). | **Supported.** With 120 items over 6 strands, a range limit of 1.2 is about the honest spread. |
| G7 | **There is no person-fit check.** | Use `lz()` from `research/person-fit.ts` on the same 10 × 10 production runs. | Mean *l_z*: L9 −0.12; the others 0.91 to 2.91. **AUC 0.94.** At the threshold giving 5% false flags among the others (*l_z* < 0.34), L9 is flagged on **8 of 10** seeds, including the frozen seed. The textbook cut-off of −2 flags **0 of 10**. | **Supported.** The detector exists and works in research, but nothing uses it. Even if wired in, it would *flag* the profile, not change the numbers M6 measures. This repeats the E2a review (0.95, 8 of 10). |
| G8 | **Contradiction probes concentrate evidence** on erratic capabilities. | Count probes and the most observations on one capability, per learner over 120 items, 10 seeds. | L9 has 14.1 probes on average, the most of any learner, against 0–6 for most and 12.9 for L2. Its most-observed capability has 12.6 observations, against 10.8–12.4 for the others. | **Weak.** Probes are a symptom that could be a signal, but L2 (a genuinely weak learner) triggers almost as many. |

**Table for G1: settled estimate minus the true 4.0**, by format and item difficulty b:

| Format (a, c) | b = 2 | b = 3 | b = 4 | b = 5 | b = 6 | Items at the estimate |
|---|---|---|---|---|---|---|
| Choice, 4 options (1.1, 0.25) | −1.52 | −0.91 | −0.56 | −0.41 | −0.35 | −0.83 |
| Choice, 3 options (1.0, 0.33) | −1.53 | −0.95 | −0.62 | −0.46 | −0.40 | −0.92 |
| Typed (1.3, 0) | −1.47 | −0.80 | −0.43 | −0.25 | −0.07 | −0.63 |
| Match 3 to 4 / order 4 (1.2, 1/24) | −1.51 | −0.87 | −0.52 | −0.37 | −0.32 | −0.76 |
| Multi, 2 of 5 (1.1, 0.10) | −1.52 | −0.91 | −0.56 | −0.41 | −0.35 | −0.83 |

- **Why easy items pull hardest:** on an easy item, a learner who knows the answer still misses 30% × (1 − 1/n)
  of the time. The model can only explain that as a much lower ability.
- **The last column** is the fixed point from G3: where the estimate settles when every item is pitched at the
  current estimate.

**Why reading is usually worst:**

- It is the worst strand on 5 of 10 seeds, with a mean bias of −0.99.
- On the frozen seed, 22 of its 28 right/wrong answers are four-option choice items, at a mean difficulty of
  4.1.
- It has no writing evidence. Writing is unaffected by guessing and anchors SEN and WRT a little.
- Its three leaves are each estimated from a handful of low-information answers, so the bias and the noise add
  up.
- Writing only partly protects SEN and WRT (−0.74 and −0.65 over seeds), because writing bands are a small
  share of their evidence.

---

## Part 3 · Possible remedies (none implemented)

Each remedy is labelled by what it would change:

- **[Maths]** changes the Learner Vector mathematics: the update, the prior, couplings, or which evidence is
  accepted. These need product-owner approval.
- **[Selection]**, **[Content]**, **[Reporting]** or **[Criterion]** leave the estimates' mathematics alone.
  **[Criterion]** means changing the frozen pass levels or measure, which is also a product-owner decision.
  The frozen procedure exists precisely so that this is not done to make results look better.

"Measured here" means one of this report's experiments quantified the effect. The others are untested ideas.

### M1

| Remedy | Kind | Expected effect | Evidence |
|---|---|---|---|
| Record that M1 as defined cannot exceed 0.914, and cannot exceed 0.65 for L6. Report M1 alongside its ceiling, or report the four non-flat learners separately (mean 0.69 over seeds). | Reporting | Honest context; changes no pass level. | Measured here |
| Replace or supplement ρ for near-flat profiles (L6, L8) with a measure that is defined for them, such as "the one differing strand is identified" or a mean absolute strand error. | Criterion | Removes the structural ceiling. | Ceiling measured here |
| Allocate the initial assessment by strand: a minimum number of informative answers for single-leaf and two-leaf strands (FND, SEN) and for reading, and fewer for GRM and WRT. | Selection | Targets the strands with the largest error (0.58–0.60 against 0.38–0.42). | Not tested |
| Prefer higher-information formats in the initial assessment, especially for reading, which is mostly four-option choice. | Selection | Lowers error per item. | Not tested |
| Add higher-information reading items (typed, match, order). | Content | Same as above, and also helps the guesser problem. | Not tested |
| Do not show a strand profile until the strand error is small enough. Show "still finding out" instead. | Reporting | Avoids presenting a 40-item profile as more certain than it is. | Error curve measured here: 0.52 at 40 items, 0.43 at 120, 0.37 at 200 |
| A longer initial assessment (60–80 items). | Selection | M1 0.63–0.66 at 60–80 items, not 0.8. | Measured here |
| An exact (grid) posterior instead of one Laplace step. | **Maths** | +0.09 ± 0.05 on M1. The E2a review also found +4.8 points on M4 and a worse M5 on the E1 bank. | Measured here and in E2a |
| Less shrinkage towards 4.0: for example, centre each capability's prior on the learner's own emerging overall level instead of a fixed 4.0. | **Maths** | Addresses the 65% compression. Risk: correlated errors. | Not tested; would need care not to tune to M1 |
| Have check 9 (surprising band) and the selection uncertainty term use the *direct* estimate rather than the inference-shifted combined one. | **Maths** (acceptance of evidence); the selection part alone is **Selection** | Prevents inferred shifts from hiding a defining weakness, as with L8's run-ons. | Mechanism shown on the frozen seed; average effect of couplings +0.01 ± 0.05 |

### M6 guesser

| Remedy | Kind | Expected effect | Evidence |
|---|---|---|---|
| Wire the existing person-fit statistic (*l_z*) into the profile as an "answers look inconsistent; profile not reliable" flag, and prompt an engagement check. Set the threshold from real learners, because adaptive testing shifts *l_z* upwards. | Reporting | Detects the guesser on 8 of 10 seeds at 5% false flags (AUC 0.94). Changes no estimate, so the M6 numbers stay the same. | Measured here and in E2a |
| When a learner is flagged as inconsistent, stop stepping down difficulty on the basis of their failures. Hold item difficulty at the last reliable level, or re-measure later. | Selection | Breaks the feedback loop that adds about 0.3 bands of bias. | Analytic fixed point measured here; policy not tested |
| Recognise that the guesser criterion is near the noise floor: an honest flat learner fails it on 3 of 10 seeds. Compare the guesser with honest learners, for example as bias relative to L1. | Criterion | Separates "biased by guessing" from "noisy with 120 items". | Measured here |
| Model random answering explicitly: a per-learner inattention or random-response rate in the response model. | **Maths** | Removes the bias when the rate is known (−0.67 → 0.00). It still passes only 5 of 10 seeds. Estimating the rate from real data, and not inflating real gaps, are open questions. The slip-aware model in E2a inflated real gaps by 0.12–0.15. | Diagnostic measured here; slip model in E2a |
| An exact posterior update. | **Maths** | No effect on the guesser (−0.70 against −0.67). | Measured here |

---

## Appendix · Reproducing and reading the script output

```
node tools/english/research/sim-weaknesses.ts
```

| Script section | Report section |
|---|---|
| M1 · 0 | 1.1 |
| M1 · 1–2 | Tie ceiling and noise ceiling (1.3) |
| M1 · 3 | Seeds |
| M1 · 4 | Hypotheses a and b |
| M1 · 5 | Hypotheses c1–c3 |
| M1 · 6 | Held evidence (1.4) |
| M1 · 7 | Hypothesis e1 |
| M1 · 8 | Policies |
| M1 · 9 | Hypotheses d1–d3 and e2 |
| M6 · 0–5 | Part 2 |

The frozen simulation (`node tools/english/sim/main.ts`) still reports exactly what it did before: M1 0.40,
and M6 guesser not ok.
