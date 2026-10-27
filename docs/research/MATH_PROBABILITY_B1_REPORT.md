# OpenPath B1 Probability, Combinatorics and Statistics

## Recommendation

**MERGE READY for the bounded structured families documented below.** B1 uses the existing unified assessment envelope, exact arithmetic, explicit assumptions and first-invalid-step behavior. It does not claim general probability theorem proving.

## Architecture and integration

`probability-statistics.ts` adds the versioned `openpath-probability-statistics@1` domain reasoner. The only public entry remains:

`assessMathematicalWorking(problem, studentWorking, options)`

The unified adapter preserves classifications, first invalid step, proof dependencies, restrictions, obligations, skills and reasoner version. B1 problems can also participate in the existing explicit cross-domain stage coordinator. No learner engine, symbolic engine or public API was duplicated.

B1 uses normalized BigInt rational arithmetic. Factorials, permutations and combinations stay integer-exact; probability, expectation and variance stay rational-exact; supported standard deviations remain exact radicals.

## Supported mathematical families

### Counting and combinatorics

- addition and multiplication principles;
- factorials up to the configured bound;
- permutations and combinations;
- arrangements with repetition;
- basic circular permutations;
- binomial coefficients;
- two-set inclusion-exclusion.

Ordered/unordered selection is explicit. The reasoner does not silently change distinguishability or replacement conventions.

### Probability

- finite equiprobable spaces when equiprobability is established;
- complements, unions and intersections;
- mutually exclusive unions;
- independent intersections;
- conditional probability;
- total probability;
- Bayes' theorem;
- exact sequential probabilities represented by the supported rules.

Independence and mutual exclusivity are separate assumptions. Conditional probability uses exact nonzero rational division; a zero denominator fails closed.

### Discrete distributions

- Bernoulli mean and variance;
- binomial mean and variance;
- discrete uniform mean;
- supported finite PMF mean and variance.

Finite PMFs are rejected if any probability is negative or the total mass differs from one. Parameters and support sizes are bounded.

### Descriptive statistics

- arithmetic and weighted means;
- median, unique mode and range;
- population and sample variance;
- exact population standard deviation;
- grouped-frequency means.

Population and sample variance require distinct conventions and use denominators `n` and `n-1` respectively.

## Proof rules, assumptions and alternative routes

Every step contains an ID, named bounded rule, exact result, dependencies and optional assumptions. Dependencies must be unique, acyclic and refer to earlier facts. Unknown rules return unsupported.

The supported route vocabulary includes direct exact calculation, complementary counting, Bayes/definition rules, probability numerator/denominator facts, direct expectation summation and the variance identity. Focused tests verify direct versus complementary combination counting and conditional probability via a joint-probability intermediate step.

Tracked assumptions include equiprobability, independence, mutual exclusivity, replacement convention, ordered/unordered selection, distinguishability and sample/population convention. Missing assumptions return `missing-assumption`; they are never inferred from wording or a coincidentally correct result.

## Independent validation and frozen benchmark

The committed corpus contains **400 independently labelled cases**, 100 per requested area. The first **100** were frozen before final tuning. Labels and exact answers were produced with Python `Fraction`, standard finite counting formulas and separately authored outcome rules rather than by the TypeScript implementation.

Results:

- exact classification and first-step agreement: **400/400**;
- verified: **210**;
- invalid: **80**;
- missing assumption: **30**;
- unsupported: **40**;
- resource exhausted: **40**;
- false acceptances: **0**;
- false rejections: **0**;
- first-invalid-step accuracy: **400/400**.

The corpus includes wrong counting values, missing probability assumptions, correct results after an invalid first line, unsupported inference rules and oversized proofs. Unsupported cases are not counted as mathematical successes.

## Exact enumeration cross-checks

An independent Python script performed **200/200** matching checks:

- permutations/combinations enumerated with `itertools`;
- finite event probabilities enumerated over two-die sample spaces;
- Bernoulli variance computed directly from the PMF;
- population variance cross-checked by direct deviations and `E[X²]-E[X]²`.

All calculations use integers or `Fraction`; numerical sampling is not used as proof.

## Regression results

- Full learning/unified suite: **820 passed, 0 failed, 5,614 assertions, 0 skipped** across 48 files.
- B1 focused suite: **2 passed, 0 failed, 808 assertions**.
- Geometry G2-G4: **47 passed, 0 failed**.
- D1, U4, U3, M3, M1/M2, C2/C3 and worker-pool tests remain green.
- Node-target package build passes.

No prior mathematical verdict was changed.

## Performance and resource limits

Warm local measurements, 100 verified assessments per area:

| Area | p50 ms | p95 ms | p99 ms |
|---|---:|---:|---:|
| Combinatorics | 0.007 | 0.041 | 0.150 |
| Probability | 0.009 | 0.042 | 0.089 |
| Distributions | 0.008 | 0.037 | 0.083 |
| Statistics | 0.014 | 0.062 | 0.102 |

Limits include factorial inputs at most 200, ordinary integer parameters at most 10,000, 64 proof steps, bounded PMF/support arrays supplied by the typed request, and exact operations only. A 65-step proof returns resource exhausted immediately. B1 uses formulas rather than exhaustive runtime enumeration.

## Unsupported cases and limitations

1. General symbolic probability identities and measure-theoretic probability are unsupported.
2. Continuous distributions, covariance, regression and hypothesis testing are outside B1.
3. More than two-set inclusion-exclusion and unrestricted generating-function arguments are unsupported.
4. Ambiguous natural-language assumptions are not inferred.
5. Multi-modal data returns unsupported rather than selecting a mode arbitrarily.
6. General grouped medians/variances and open-ended combinatorial proof search are not implemented.
7. B1 rule evidence is checked by its independent exact domain kernel; it does not create a new M3 symbolic certificate family or bypass U4 for symbolic transformations.

Within these boundaries, B1 accepts supported alternative routes, preserves mathematical obligations, and identifies the earliest invalid step through the same unified assessment contract.
