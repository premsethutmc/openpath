# E5 — Geometry and Calculus Integration

Branch `feat/math-geometry-calculus-e5`, base `0e3ff03` (E4). Case-level machine-readable results: `tools/mathematics/geocalc-e5/case-level-e5.v1.json` (dev + sealed), `results/e5dev-final.json`, `results/e5sealed-final.json`, `results/result-<partition>.json` (E4 baseline vs E5 summaries), `e1-recovery-matrix.v1.json`, `e5-adjudication-overlay.v1.json`.

## Design in one paragraph
No new geometry engine or calculus solver. A **proposer** (`natural-geocalc-e5.ts`) normalises LaTeX/natural notation (°, ∠, m∠, `\frac`, `\int`, `\lim`, `f'`, `dy/dx`, `d/dx`, `^\circ`, `\sqrt`) into typed claims with source locations. **Independent binders** judge them: exact rational linear algebra over premises compiled from the typed facts (angles, parallel, triangle sum, isosceles, linear pair, vertical, congruence table), exact rational/surd coordinate arithmetic, the U4 kernel against an independently differentiated source, exact polynomial antiderivatives and exact rational-function limits. Floating point can only confirm a *rejection*, never accept. The **destination reasoners** (geometry Python reasoner, calculus-core) can only **veto**. Every result goes through the E3 acceptance gate (per-line account, `bindingEvidence` per accepted line, assumptions preserved, final line must answer the problem, canonical numeral/surd required). Adapters propose; they never certify.

Precedence in `assessCandidate`: the established route runs first. If it already verified and E5 agrees, its evidence is kept; if E5 disagrees, E5's non-acceptance wins (veto). Otherwise a definite E5 verdict is used. One deliberate exception: a missing `+C` keeps the established class `invalid` (D5 contract) where E5 would say `missing-assumption`; both are non-accepting.

## 1. E1 recovery matrix (adjudicated E1, 500 cases; E4 → E5 class changes)
| from → to | vs reference | n |
|---|---|---|
| unsupported → verified | correct | 52 |
| ambiguous → verified | correct | 24 |
| unsupported → invalid | correct | 20 |
| unsupported → incomplete | correct | 13 |
| ambiguous → unsupported | non-accepting, not exact | 6 |
| malformed → invalid | wrong class, non-accepting | 2 |

109 recoveries, 8 safe non-exact transitions. By E1 category: correct-conventional 46, correct-alternative 30, mathematical-error 20, incomplete 13 recovered; 6 missing-restriction/branch and 2 ambiguous/malformed remain non-exact (fail closed).

## 2. Geometry notation integration
Degree sign, `degrees`, `^\circ`, `∠ABC`/`∠A`/`m∠A`/`angle A`, `\parallel`, `\perp`, `\cong`, `\triangle`, supplementary/complementary phrasing, coordinate forms `(x₂−x₁)`, `M = ((x1+x2)/2, …)`, `\sqrt{}`, `\frac{}{}`; source line/span preserved on every claim.

## 3. Geometry proof verification
Premises are compiled from typed facts; availability depends on stated conditions (`nondegenerate:T` for triangle sum/isosceles; a `parallel` fact for alternate/corresponding). Results: valid (implied by available premises), missing-assumption (implied only with an unstated premise), invalid (contradicts facts, or a cited reason that does not establish the step), unsupported (quantity outside the problem / non-linear). Goal line must be a canonical numeral (an unevaluated `180° − 100°` is *incomplete*). Congruence uses a criterion table (SSS/SAS/ASA/AAS/HL); coordinate distance/midpoint/slope/parallel/perpendicular use exact arithmetic.

## 4. Calculus notation integration
Prime, Leibniz (`dy/dx`, `d/dx`), `\frac{d}{dx}`, `\int_a^b … dx`, `[F]_a^b`, `\lim_{x\to a^±}`, `∞`, `\sin/\cos/\tan/\ln/e^{}/\sqrt{}`, implicit multiplication; derivative/antiderivative/limit/continuity claims typed with source locations.

## 5. Calculus proof verification
Derivatives and antiderivatives: U4 `certify` against an independent derivative (`d5`); no `+C` ⇒ not accepted; definite integrals: exact polynomial evaluation, antiderivative step must verify before the value; limits: exact rational-function analysis (finite, ±∞, does-not-exist distinguished), `sin(ax)·R(x)` standard limit; continuity: three-part check. Prose-only method lines are incomplete. Destination veto: calculus-core vetoes definite-integral (after F verifies), limit and continuity; it cannot veto derivative/indefinite results because its normal form does not expand products (recorded as a note).

## 6. Independent evidence coverage
Every accepted line in every partition carries `bindingEvidence` with checker `e5-independent-geocalc` or an existing independent checker: **1.00** on E1, E2–E5 dev/sealed, and all fuzz partitions. Unaccounted acceptances: 0.

## 7. E1 before and after
| | E4 | E5 |
|---|---|---|
| raw E1 (500) exact / coverage / false accept | 302 / 0.562 / 3 | 409 / 0.784 / 3 |
| **adjudicated E1** exact / coverage / FA / FR | 305 / 0.562 / 0 / 0 | **412 / 0.784 / 0 / 0** |
| correct verified (of 228) | 137 | 213 |
| abstentions | 219 | 108 |

The 3 raw false acceptances are the pre-existing mislabelled references already adjudicated in E3 (identical in the E4 baseline).

## 8. E2–E4 regressions (E4 baseline → E5; FA/FR 0 everywhere)
| partition | exact (E4→E5) | coverage |
|---|---|---|
| E2 dev | 75 → 79 | 0.71 → 0.75 |
| E2 sealed | 79 → 79 | 0.72 |
| E3 dev | 63 → 63 | 0.80 |
| E3 sealed | 62 → 62 | 0.80 |
| E4 dev | 99 → 99 | 0.99 |
| E4 sealed | 99 → 99 | 0.99 |

No regression; no E2–E4 verdict worsened.

## 9. E5 development (100 cases; used for development, so optimistic)
E4 → E5: exact **7 → 99**, coverage 0.11 → 1.00, false accept 0 → 0, false reject 3 → 0, first-invalid 3/30 → 30/30, alternative accepted 0/2 → 2/2, restriction detected 0/7 → 6/7, correctly verified 4 → 60 of 60. The one non-exact case is the disclosed `+C` class (`missing-assumption` reference, established route says `invalid`).
By category (exact): angle 25/25, coordinate 15/15, proof steps 10/10, differentiation 20/20, integration 16/17, limits 13/13.

## 10. E5 sealed holdout (100 cases, run once after code freeze; code hash in `results/code-freeze.sha`)
| | E4 baseline | E5 raw | E5 adjudicated |
|---|---|---|---|
| exact verdicts | 5 | 85 | **86** |
| false acceptances | 0 | 1 | **0** |
| false rejections | 2 | 0 | 0 |
| coverage (assessed) | 0.09 | 0.88 | 0.88 |
| correctly verified | 2 / 47 | 44 / 47 | 45 / 48 |
| first-invalid exact | 3/34 | 30/34 | 30/33 |
| alternative accepted | 0/3 | 3/3 | 3/3 |
| independent evidence coverage | — | 1.00 | 1.00 |

By category (exact): angle 25/25, coordinate 15/15, proof steps 10/10, differentiation 16/20, integration 13/18, limits/continuity 7/12. Development-to-sealed gap (99 → 86) is the true generalisation cost on calculus shapes; geometry generalised fully.

## 11. False acceptance and rejection analysis
- **Raw sealed false acceptance: `e5-sealed-007`** (isosceles, family `isosceles-base-angles`). The working `B = C; A+B+C = 180°; 20° + 2B = 180°; B = 80°` is mathematically correct. The generator's arithmetic-slip variant changed the machine-readable row but not the displayed text, so the reference label (`invalid`) is wrong; the engine was right. Found by a read-only text-vs-row audit (generator `AUDIT`) on development fuzz before the sealed run was inspected; recorded in `e5-adjudication-overlay.v1.json` (frozen corpus untouched, original label retained). **Disclosure: this defect was identified from the development/fuzz generation and then confirmed on the sealed case only after scoring.**
- Real engine rule gaps found by fuzz and fixed before freeze: unevaluated final angle expressions were accepted as the goal (3 cases) — fixed (canonical numeral required).
- Float-only disagreement never rejects (rejection requires an exact kernel failure *and* sampled disagreement).
- Fuzz (3 seeds × 200 cases, generated by the same code but unseen seeds): false acceptance 0 after adjudication (1 per seed = the same label-defect shape), false rejection 0, exact 184/200, coverage 0.94.
- Oracle disclosure: `e5_oracle.py` is an independent exact oracle (own parser, `Fraction`, 70-digit `Decimal`, own differentiator). SymPy was unavailable in the workspace, so it was not used as a second oracle.

## 12. First-invalid-step accuracy
E1 adjudicated 97/97 (E4: 77/97); E5 dev 30/30; sealed 30/34 raw (4 invalid references abstained or class-shifted: fail closed).

## 13. Alternative-method coverage
E1 adjudicated 60/75 alternative solutions accepted (E4: 30/75); E5 dev 2/2; sealed 3/3.

## 14. Performance
Latency per assessment (E5): E1 p50 0.9 ms / p95 6.4 ms; E5 dev 1.6 / 10.9; E5 sealed 0.9 / 9.1; E3 dev 3.9 / 20.2; E4 dev 7.2 / 26.2. Baseline E4 on E5 dev was 0.24 / 2.6 ms (it abstained). Max RSS 66–91 MB. All arithmetic is bounded (10^60 magnitude, member/term limits); the resource test confirms enormous exponents do not run away.

## 15. Full regression
106 non-frontend test files + new `verification-closure-e5.test.ts`: **1325 pass, 2 fail**. The 2 failures are the E1/E2A "frozen simulation reproduces recorded results" tests and are identical in the E4 baseline (1309 pass, 2 fail), i.e. pre-existing, unrelated to E5. During development 6 D5/D6/D7 tests regressed; fixed by (a) adding `conversion` provenance to E5 envelopes, (b) keeping the established route's verified result when E5 agrees, (c) keeping the D5 `invalid` class for a missing `+C`. Frontend and English-core suites are reported separately and were not changed (frontend suite stalls in this workspace, as in E4).

## 16. Remaining unsupported cases
Sealed (12 abstentions, all fail closed): reciprocal limits 2, removable limits 2, power/chain/product/quotient rule 1 each, polynomial 1, standard-trig 1, outside-scope 1, definite-polynomial 1. Fuzz shows the same 12 shapes: derivative/integral working that states a rule in prose followed by an unexpanded product, reversed integration bounds, `log|u|` derivative, undefined-expression members (`0/0`), one-sided `0⁺/0⁻` targets, and small-angle standard limits (`1−cos x`, `tan x`, `e^x−1`, `ln(1+x)`). None is accepted; several are classified `unsupported` where the reference is `incomplete`/`invalid` (coverage miss, not a safety miss).

## 17. Readiness recommendation
Criteria: zero false acceptances on adjudicated E1 and E2–E5 ✔ (0 everywhere after the one disclosed label correction); all new acceptances carry independent evidence ✔ (1.00); no silently discarded lines ✔ (0 unaccounted); coverage measurably improves ✔ (E1 0.56 → 0.78, E5 sealed 0.09 → 0.88); existing verified solutions stay valid ✔ (E2–E4 unchanged or better; full suite = baseline); proof-integrity regressions ✔.

**MERGE READY, conditional on one product-owner decision:** accept the adjudication of `e5-sealed-007` (an engine-correct verdict against a defective reference). Without it, the raw sealed result shows 1 false acceptance. Not merged, not deployed. Follow-ups (not E6): the 12 fail-closed calculus shapes, and aligning the missing-`+C` class (`invalid` vs `missing-assumption`) across D5 and E5.
