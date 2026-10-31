# MATH E6-R — Soundness Repair and Independent Generalization Retest

**Recommendation: REVISE. Do not merge.** Fresh holdout #2, scored once against the frozen implementation, contains 5 raw false acceptances; 4 are confirmed by two independent blind adjudicators and 1 is contested. Acceptance (zero adjudicated false acceptances) is not met. Exact accuracy is 70.6% (target 90%).

Frozen implementation: `e8f036f` (base `9ac079e`). Freeze record: `tools/mathematics/generalization-e6r/CODE_FREEZE_2.txt` (commit `95ec54f`, pushed before scoring). Branch `feat/math-natural-generalization-e6r`. Nothing merged, deployed, or started for E7. Between freeze and scoring there were no changes to `packages/` or `tools/mathematics/generalization-e6/` (empty `git diff e8f036f HEAD`).

## 1. Fresh holdout #2 (frozen, scored once) — raw, before adjudication

Corpus `holdout2/holdout-cases.v1.json`, 360 cases, sha256 `5de6172d43001f17bc3a37b86206f889e16ed1a190348b9fa39a3f3516651de6` (mode 444, recorded before scoring). Authored by a separate agent that never ran the verifier and had no access to this repository's cases; the implementer did not read its cases or labels before scoring (scored-once lock: `holdout2/scored.lock`). Evaluator sha256 `40d5135a…c6d`.

| metric | E5 | E6 (9ac079e) | **E6-R (frozen)** |
|---|---|---|---|
| exact verdicts | 59 | 223 | **254 (70.6%)** |
| false acceptances | 5 | 6 | **5** |
| false rejections | 2 | 19 | **7** |
| unsupported (engine) | 149 | 76 | 70 |
| ambiguous (engine) | 53 | 28 | 22 |
| malformed | 116 | 28 | 27 |
| resource-exhausted (separate outcome) | 0 | 0 | 0 |
| first-invalid-step localisation | — | — | 53/78 |
| alternative methods accepted | — | — | 23/31 |
| latency p50 / p95 / max | — | — | 1.1 / 11.1 / 31.5 ms |
| peak RSS | — | — | 105 MB |

(E5 and E6 were run on this corpus after the E6-R score, as baselines; they were not used for any decision.)

By domain (E6-R): differentiation 45/55 (FA 0, FR 1); integration 45/66 (0, 2); limits-continuity 41/55 (0, 0); probability-combinatorics 32/55 (3, 1); complex-polynomial 42/55 (1, 0); mixed-domain 49/74 (1, 3).

### False acceptances (engine said `verified`)

| case | reference | blind adjudication (A, B) | status |
|---|---|---|---|
| s6-217 `P(A|B) = P(A∩B) − P(B) …` then the correct ratio | invalid | invalid, invalid | **confirmed FA** |
| s6-226 `C(11,3) = C(11,4) by symmetry` then 165 | invalid | invalid, invalid | **confirmed FA** |
| s6-238 `product of the roots is −c/a` then 5/2 | invalid | invalid, invalid | **confirmed FA** |
| s6-299 `∫1/(x−2)dx = ln(x−2)+C` on domain components x<2, x>2 | missing-assumption | invalid, invalid | **confirmed FA** (adjudicators judge it invalid, the reference missing-assumption; either way not verified) |
| s6-182 `1 − (1/2)^3 = 7/8` for a finite task typed only `equiprobable` | missing-assumption | missing-assumption, missing-assumption (both "uncertain"; alternative verified) | **contested FA**: the label stands, the engine's acceptance is not defended |

### False rejections (7), all upheld by both adjudicators (reference `verified` is correct)
s6-004, s6-087, s6-096, s6-229, s6-292, s6-314, s6-316. Adjudication changed no exact count: raw and adjudicated results are identical (254/360, 5 FA, 7 FR). Case-level records: `holdout2/results-scored-once.json` (every prediction, reference, trace text, latency), `holdout2/adjudication-overlay.v1.json`, `holdout2/failure-classification.v1.json`.

**The three forged-statement FAs are the same defect class as the original E6 sealed false acceptances: the verifier certifies work containing a false mathematical claim.** Here the cause is that a line mixing words and a relation is preserved as prose and never checked (§4).

## 2. r6-194 and r6-220 (holdout #1 raw FAs) — investigated, not assumed harmless

Both were investigated by two blind adjudicators (problem and working only).

| case | reference | adjudicator A | adjudicator B | engine |
|---|---|---|---|---|
| r6-194 typed `independent-intersection`, `P(A,B) = 1/3·1/2 = 1/6`, assumption `independent` | ambiguous | verified (certain) | verified (certain) | verified |
| r6-220 typed `binomial-variance`, `Var(X) = 10(3/10)(7/10) = 21/10` | missing-assumption | verified (certain) | verified (certain) | verified |

Both adjudicators agree with the engine and disagree with the reference, so these are recorded as label defects with the mathematical justification: independence is supplied by the task (r6-194), and independent identical trials define the binomial model (r6-220). **Caveats I am not discounting:** the adjudicators were told that a task name may carry its standard model, which may have primed r6-220; only two adjudicators; the original author's contrary labels show that readers disagree. Status: *adjudicated harmless by 2/2 independent adjudicators, with moderate residual uncertainty.* The same family exposes a real inconsistency: on holdout #2, `binomial-pmf` (s6-229) is rejected for lacking independence while `binomial-variance` is accepted. Whichever reading is chosen must apply to both (§5).

## 3. Holdout #1 (exposed; diagnostic only)

Scored once earlier at 261/360, FA 3, FR 13 (`holdout1/results-scored-once.json`). It was then used for diagnosis and repair; **it is no longer held out and its later numbers are not generalisation evidence**: after repair 277/360, FA 2 (r6-194, r6-220), FR 0 (`holdout1/results-diagnostic-after-repairs-EXPOSED.json`). Compare: the fresh holdout is 254/360. The in-sample gain from repair (+16 on holdout #1) was not matched by a comparable out-of-sample level, which is the generalisation gap. Corpus is committed with its hash for reproducibility.

## 4. Regression suites (frozen code)

E6 sealed is an **exposed regression set**, not a holdout. Raw results first; the adjudicated overlay (`adjudication/e6-adjudication-overlay.v1.json`) is reported alongside, never replacing raw.

| partition | engine | cases | exact | FA | FR | unsupported | ambiguous | resource-exh. | first-invalid exact | latency p50/p95 ms |
|---|---|---|---|---|---|---|---|---|---|---|
| e1adj | E5 | 500 | 412 | 0 | 0 | 63 | 20 | 0 | 97/97 | 0.6/5.5 |
| e1adj | E6 (9ac079e) | 500 | 451 | 0 | 0 | 56 | 14 | 0 | 97/97 | 0.7/6.3 |
| e1adj | E6-R raw | 500 | 451 | 0 | 0 | 56 | 14 | 0 | 97/97 | 0.8/6.0 |
| e2dev | E5 | 100 | 79 | 0 | 0 | 8 | 9 | 0 | 36/47 | 0.6/11.7 |
| e2dev | E6 (9ac079e) | 100 | 79 | 0 | 0 | 9 | 9 | 0 | 36/47 | 0.9/10.8 |
| e2dev | E6-R raw | 100 | 79 | 0 | 0 | 9 | 9 | 0 | 36/47 | 0.9/9.2 |
| e2sealed | E5 | 100 | 79 | 0 | 0 | 13 | 5 | 0 | 36/45 | 0.9/12.5 |
| e2sealed | E6 (9ac079e) | 100 | 79 | 0 | 0 | 15 | 4 | 0 | 36/45 | 1.0/12.1 |
| e2sealed | E6-R raw | 100 | 79 | 0 | 0 | 15 | 4 | 0 | 36/45 | 1.2/9.3 |
| e3dev | E5 | 75 | 63 | 0 | 0 | 9 | 1 | 0 | 30/35 | 3.2/12.1 |
| e3dev | E6 (9ac079e) | 75 | 63 | 0 | 0 | 9 | 1 | 0 | 30/35 | 3.5/17.5 |
| e3dev | E6-R raw | 75 | 63 | 0 | 0 | 9 | 1 | 0 | 30/35 | 3.4/13.8 |
| e3sealed | E5 | 75 | 62 | 0 | 0 | 11 | 4 | 0 | 25/30 | 2.2/14.6 |
| e3sealed | E6 (9ac079e) | 75 | 63 | 0 | 0 | 9 | 4 | 0 | 25/30 | 3.1/12.6 |
| e3sealed | E6-R raw | 75 | 63 | 0 | 0 | 9 | 4 | 0 | 25/30 | 3.1/15.0 |
| e4dev | E5 | 100 | 99 | 0 | 0 | 1 | 0 | 0 | 35/36 | 5.9/23.1 |
| e4dev | E6 (9ac079e) | 100 | 99 | 0 | 0 | 1 | 0 | 0 | 35/36 | 6.1/27.7 |
| e4dev | E6-R raw | 100 | 99 | 0 | 0 | 1 | 0 | 0 | 35/36 | 5.1/23.6 |
| e4sealed | E5 | 100 | 99 | 0 | 0 | 1 | 0 | 0 | 29/30 | 5.0/20.3 |
| e4sealed | E6 (9ac079e) | 100 | 99 | 0 | 0 | 1 | 0 | 0 | 29/30 | 4.7/24.2 |
| e4sealed | E6-R raw | 100 | 99 | 0 | 0 | 1 | 0 | 0 | 29/30 | 4.9/21.8 |
| e5dev | E5 | 100 | 99 | 0 | 0 | 0 | 0 | 0 | 30/30 | 1.2/6.5 |
| e5dev | E6 (9ac079e) | 100 | 100 | 0 | 0 | 0 | 0 | 0 | 30/30 | 2.0/15.4 |
| e5dev | E6-R raw | 100 | 100 | 0 | 0 | 0 | 0 | 0 | 30/30 | 1.9/11.4 |
| e5sealedadj | E5 | 100 | 86 | 0 | 0 | 10 | 1 | 0 | 30/33 | 1.1/7.0 |
| e5sealedadj | E6 (9ac079e) | 100 | 96 | 0 | 0 | 4 | 0 | 0 | 31/33 | 1.8/10.0 |
| e5sealedadj | E6-R raw | 100 | 96 | 0 | 0 | 4 | 0 | 0 | 31/33 | 1.7/8.6 |
| e6dev | E5 | 100 | 23 | 1 | 0 | 29 | 16 | 0 | 8/27 | 0.3/5.2 |
| e6dev | E6 (9ac079e) | 100 | 99 | 0 | 0 | 3 | 2 | 1 | 25/27 | 1.8/12.2 |
| e6dev | E6-R raw | 100 | 99 | 0 | 0 | 3 | 2 | 1 | 25/27 | 2.0/14.4 |
| e6val | E5 | 100 | 24 | 1 | 0 | 42 | 4 | 0 | 6/27 | 0.4/6.0 |
| e6val | E6 (9ac079e) | 100 | 83 | 0 | 2 | 12 | 0 | 0 | 21/27 | 1.9/11.9 |
| e6val | E6-R raw | 100 | 83 | 1 | 2 | 11 | 0 | 0 | 21/27 | 1.6/9.0 |
| e6val | E6-R adjudicated overlay | 100 | 86 | 0 | 0 | 11 | 0 | 0 | 21/27 | 1.6/9.7 |
| e6sealed | E5 | 100 | 21 | 1 | 0 | 33 | 14 | 0 | 7/27 | 0.5/5.2 |
| e6sealed | E6 (9ac079e) | 100 | 80 | 2 | 3 | 14 | 3 | 0 | 21/27 | 1.8/12.0 |
| e6sealed | E6-R raw | 100 | 82 | 2 | 1 | 14 | 3 | 0 | 21/27 | 1.9/13.0 |
| e6sealed | E6-R adjudicated overlay | 100 | 85 | 0 | 0 | 14 | 3 | 0 | 21/27 | 1.9/15.8 |

Notes. (1) e6val raw FA 1 is e6-251: judged `verified` (restricted-domain/implied equality) by a **single** blind adjudicator (`adjudication/blind-adjudication-e6-251.v1.json`); E6 did not accept it. By the "zero new FA on E1–E6" criterion this is one raw new acceptance whose label defect rests on one adjudicator, so a second adjudicator is still owed. (2) Original E6 sealed: 2 FA, 3 FR; now raw 2 FA, 1 FR, overlay 0/0; the originals and the evidence are preserved in `evidence/original-failures.v1.json`. (3) Unit tests: `packages/learning` 1056 pass, 0 fail (includes 27 closure tests); `english-core` 2 and `frontend/src/mathematics` 2 failures are identical on the E5 baseline (pre-existing); `frontend/src/learning` times out as before. (4) Fuzz: 2000 mutants, 0 thrown, 14 non-verified mutants stayed verified; all 14 inspected are truth-preserving rewrites of correct derivatives. (5) Performance (median of 3; `e5sealedadj`): p50 E5 0.94 / E6 1.90 / E6-R 1.66 ms; p95 9.0 / 13.6 / 8.8 ms; RSS 68 / 78 / 77 MB. On `e6dev` E6-R summed latency is ~14% above E6 (448 vs 394 ms); judged not material.

## 5. Architectural diagnosis of holdout #2 (all 106 non-exact cases)

Classification was assigned from the engine's own justification, the case text and manual traces of about a dozen representative cases; cases not individually traced are classified by cluster and are therefore *inferred*, not proven. Full list: `holdout2/failure-classification.v1.json`.

| class | cases | missing general abstraction | needs new mathematical capability |
|---|---|---|---|
| semantic-representation | 32 | 32 | 0 |
| parsing | 28 | 28 | 0 |
| cross-domain-composition | 14 | 14 | 0 |
| verification-kernel | 12 | 1 | 11 |
| domain-obligation | 11 | 11 | 0 |
| verdict-contract | 6 | 6 | 0 |
| unsupported-mathematics | 3 | 0 | 3 |

**92 of 106 failures (87%) come from missing general abstractions; 14 need new mathematical capability.**

| class | cluster (shared root cause) | cases | ids |
|---|---|---|---|
| cross-domain-composition | probability-density work (E[X], P(X<=a)) is a calculus integral labelled with probability notation; there is no composition of the probability and cal | 13 | 287 293 295 302 335 336 341 345 346 347 355 358 359 |
| cross-domain-composition | an older route's invalid verdict overrides the independent route's incomplete in the merge | 1 | 027 |
| domain-obligation | side-conditioned rewrites inside one-sided limits ('for x<3, |x-3| = -(x-3)') have no restricted-domain equality | 3 | 150 161 164 |
| domain-obligation | sign knowledge from typed restrictions is applied to the posed function only, not to every line of the working; abs and sqrt(x^2) are not resolved | 3 | 292 314 316 |
| domain-obligation | a required restriction that contradicts the typed restriction should be invalid; reported as missing-assumption | 2 | 294 317 |
| domain-obligation | assumption provenance: independence is tracked only for a product of two equal factors; a power (1/2)^3 slips through | 1 | 182 |
| domain-obligation | typed domainComponents are honoured by derivative planning but ignored by the integration planner | 1 | 299 |
| domain-obligation | a required domain (x-2>0) that contradicts the typed domain (x<2) should be invalid; reported as an unfinished step | 1 | 349 |
| parsing | comma-joined definition lines ('u = x^2, du = 2x dx', 'u = ln x, dv = x dx') are not parsed as a definition group | 15 | 033 062 063 075 077 083 086 093 098 099 106 110 111 113 116 |
| parsing | word 'or' / 'with' / implicit multiplication after division treated as ambiguous implicit product instead of a connective | 4 | 026 212 247 281 |
| parsing | prose lead-in / ± inside a mathematical line ('x>0, so ...', 'for x<0, ...', 'so x = ±2') | 3 | 155 236 340 |
| parsing | line classification is fail-open: a line containing a false relation or rule statement but also words is preserved as prose and never checked, so the  | 3 | 217 226 238 |
| parsing | negative exponent without parentheses '(x^2+1)^-1' | 1 | 002 |
| parsing | LaTeX relation commands \mid, \cap outside the supported subset | 1 | 205 |
| parsing | superscript digits in numeric expressions ('2²') | 1 | 286 |
| semantic-representation | probability tasks are per-task templates over numerals; events, unions, joint probabilities, and total-probability have no event-algebra representatio | 11 | 183 184 185 193 199 200 210 215 216 218 224 |
| semantic-representation | ambiguous juxtaposed function/exponent/scope notation ('sin x^2', 'e^2x', 'ln x^2', 'd/dx x^3 cos x', '1/3+i') is resolved to one reading and judged,  | 9 | 034 037 048 053 092 095 130 250 337 |
| semantic-representation | moment/statistic notation (E[X]=np, s^2, 'E X') and task coverage limited to templates | 3 | 191 214 222 |
| semantic-representation | polynomial named quantities (product/sum of roots, Vieta) have no named-quantity representation | 3 | 249 259 268 |
| semantic-representation | indeterminate-form arithmetic ('inf*0', '0/0') has no extended-real representation (safe: not accepted) | 2 | 131 160 |
| semantic-representation | an integrand rewrite line placed before the definite integral is not part of the integral chain | 1 | 056 |
| semantic-representation | 'cos(3x)^2' reading policy (reference: standard square; engine: ambiguous) | 1 | 102 |
| semantic-representation | ± as one-or-both branches has no set-valued/branch representation | 1 | 148 |
| semantic-representation | percentage versus probability value (P(A)=35) has no unit representation | 1 | 189 |
| unsupported-mathematics | complex modulus/argument/polar form and De Moivre | 3 | 234 245 255 |
| verdict-contract | unsupported mathematics is reported as ambiguous | 2 | 207 262 |
| verdict-contract | final-form grammar does not accept a factored exact fraction '(e^2-1)/2' | 1 | 096 |
| verdict-contract | unsupported reported where ambiguity (bare log base) is the label | 1 | 151 |
| verdict-contract | prose-only method description is judged missing-assumption instead of incomplete | 1 | 186 |
| verdict-contract | binomial-pmf demands 'independent' while binomial-variance does not: the task-level assumption inheritance is inconsistent | 1 | 229 |
| verification-kernel | logarithm of products containing exp/radical factors and logarithm limits at 0 are outside the exact factorisation | 3 | 051 128 135 |
| verification-kernel | limits at infinity of radicals need Puiseux expansion in 1/x | 2 | 122 357 |
| verification-kernel | exp asymptotics at -infinity / growth hierarchy are outside the Laurent kernel | 2 | 132 133 |
| verification-kernel | integration of rational functions by completing the square (arctan) is outside the integration kernel | 2 | 304 332 |
| verification-kernel | log of a product containing a radical is not factored; the next line is then judged invalid instead of unsupported | 1 | 004 |
| verification-kernel | definite integration by substitution with a change of limits | 1 | 068 |
| verification-kernel | integral-level equivalence by symmetry (odd part vanishes) is not an integrand identity; judged invalid instead of unsupported | 1 | 087 |

### What is general (build once) and what is genuinely new

*Missing general abstractions (fix by structure, not by case):*
1. **Fail-closed line classification.** A line is "prose" only if it contains no relation or numeral claim; a relation-bearing line that is not verified must cap the verdict at `unsupported`. This removes the three forged-statement FAs and the whole class "lines preserved but never relied upon".
2. **Definition-group parsing** (`u = …, du = … dx`, `u = …, dv = …, v = …`) as one construct: 15 cases.
3. **Reading sets for ambiguous notation** instead of a single resolved reading: `sin x^2`, `e^2x`, `ln x^2`, `d/dx x^3 cos x`, `±`, percent vs probability (≈ 12 cases). The engine currently picks one reading and judges it, so it can call a statement invalid that is right under another reading.
4. **A single sign/domain environment applied to every line.** Typed restrictions and components are used for the posed function, but not for resolving `|·|`, `sqrt(x²)` and one-sided rewrites in the working, and `domainComponents` is ignored by the integration planner (s6-299 FA; s6-292, s6-314, s6-316 FRs; s6-150/161/164). It must also detect that a required domain contradicts the typed one (→ `invalid`, not `missing-assumption`).
5. **Assumption provenance on event-probability operations.** The r6-176 repair detects only a product of equal factors (a pattern, not a rule); `(1/2)^3` bypassed it (s6-182). Independence, exclusivity, replacement and ordering must be obligations attached to the operation (product, power, sum), whatever its syntax.
6. **An event algebra for probability** instead of per-task numeral templates (≈ 17 cases are unsupported because events, unions, joint probabilities, total probability and named quantities have no representation).
7. **Composition of probability and calculus** (density work such as `E[X] = ∫…`, `P(X ≤ a) = ∫…`): 14 cases, currently malformed or unsupported.
8. **Verdict-contract consistency:** task-level assumption inheritance (binomial pmf vs variance), `unsupported` vs `ambiguous` abstentions, an older route's `invalid` overriding the independent route's `incomplete`, and an unproven link between lines reported as `invalid` instead of `unsupported`.

*Genuinely new mathematics (not an abstraction problem):* Puiseux/asymptotic expansion for radicals at infinity (s6-122, s6-357); exp and growth-hierarchy asymptotics (s6-132, s6-133); logarithm of products with exp/radical factors and log limits at 0 (s6-051, s6-128, s6-135); arctan integration by completing the square (s6-304, s6-332); definite substitution with change of limits (s6-068); integral-level symmetry arguments (s6-087); complex modulus, argument and De Moivre (s6-234, s6-245, s6-255).

The first abstraction group is where soundness lives and must precede any coverage work. Items 1, 4, 5 and 8 are the actual causes of the FAs and most FRs.

## 6. Generalisation gaps and remaining unsupported families

- Both fresh evaluations land at ~70% exact with 3–5 raw FAs. Repair guided by holdout #1 raised E6-R's score on the exposed set but did not transfer, because the failures recur in new surface forms of the same underlying gaps (§5). Further case-driven repair would be the "collection of patches" to avoid.
- The previous repairs have two instances of pattern-shaped fixes (equal-factor product detection; comma-joined restriction handling) that holdout #2 immediately outflanked.
- Unsupported families: continuous-distribution work, event-algebra probability (union, total probability, named quantities), complex polar/modulus, limit asymptotics beyond rational and simple radical, rational integration beyond linear and logarithmic, definite substitution with limit change, matrices/eigenvalues, confidence intervals (the last two correctly out of scope).
- Latency and memory are not a concern (p95 ≤ 13 ms, RSS ≈ 105 MB, no resource exhaustion).

## 7. Acceptance status

| criterion | status |
|---|---|
| zero adjudicated FA on the fresh holdout | **FAIL** (4 confirmed, 1 contested) |
| zero new FA on E1–E6 | **conditional**: 1 raw (e6-251), label defect rests on one adjudicator |
| no unexplained FR on previously passing cases | met (E6 val/sealed FRs are adjudicated label defects or engine defects since repaired) |
| legacy suites | met (pre-existing failures identical to E5) |
| no material performance regression | met |
| reproducibility | met (below) |
| ≥90% exact on fresh holdout (target) | not met (70.6%) |

**Per the acceptance rule, any subsequent repair requires a third untouched holdout before a new generalisation claim; holdout #2 is now exposed.**

## 8. Reproducibility

```
git checkout e8f036f                      # frozen implementation (95ec54f adds the freeze record)
bun test packages/learning
cd tools/mathematics/generalization-e6
for p in e1adj e2dev e2sealed e3dev e3sealed e4dev e4sealed e5dev e5sealedadj e6dev e6val; do bun evaluate.ts $p label; done
E6_SEALED_OVERRIDE=1 bun evaluate.ts e6sealed label          # exposed regression set
E6R_OVERLAY=1 bun evaluate.ts e6val label                    # adjudicated overlay
E6R_HOLDOUT_DIR=<dir with holdout-cases.v1.json + FROZEN_SHA256> E6R_RESULTS_DIR=<out> E6R_ALLOW_REPEAT=1 bun evaluate.ts r6holdout label   # re-score (the original run had no ALLOW_REPEAT)
python3 ../generalization-e6r/compare.py                      # comparison tables
```
Hashes: holdout #2 corpus `5de6172d…1de6`; evaluator `40d5135a42b3dabb8b9a64684b0309a0d6add1f98ce2336e44150ae23f7c5c6d`; E6 overlay `d38efa14…73d5`; contract `c27cbc1c…cebb`; holdout #2 adjudication overlay `32a6cb84…161a`; failure classification `8555f624…0670`. Holdout #1 corpus hash is in `holdout1/FROZEN_SHA256`.

## 9. Contract documentation
`tools/mathematics/generalization-e6r/CONTRACT.md` (verdict semantics, `+C` audit and migration, domain tracking, ambiguity, number domain, second-round revisions).

## 10. Recommendation: **REVISE**
Soundness is not established: the verifier still certifies a working that states a false rule, as long as the line also contains words. Revise by implementing the abstraction groups in §5 (1, 4, 5, 8 first), without adding case-specific rules, then evaluate on a **third untouched holdout**. Holdouts #1 and #2 and the adjudicated sets are regression material only.
