# E4 — Verified Mathematical Coverage Expansion

Branch `feat/math-verified-coverage-e4`, base `fix/math-verification-closure-e3` @ `b6d2884`. Nothing merged or deployed.
Machine-readable case-level results: `tools/mathematics/coverage-e4/results/*.json` (every case: reference verdict, engine verdict, first invalid line, gate evidence, latency).
**Oracle disclosure:** SymPy is not installable offline. The independent oracle (`e4_oracle.py`) uses its own parser, Python `Fraction` and 80-digit `Decimal`, exact Gaussian elimination, and a float scan that rejects any case with a root the oracle universe cannot see. It never imports OpenPath code.

## 1. E1 coverage-gap diagnosis
E1 baseline: 257 of 500 definite verdicts (51.4%). The 243 abstentions break down as: unsupported notation 80 (67 are degree-symbol geometry, 13 are ±), ambiguous input 71, calculus 33, missing natural adapter 32 (probability 12, complex polynomial 4, others), unsupported operations 19, incomplete evidence 8. 151 of the abstentions are recoverable with a capability; 92 are genuinely ambiguous or out of scope and stay abstentions.

## 2. Prioritized recovery matrix
| Rank | Capability | E1 cases | Status |
|---|---|---|---|
| 1 | Degree-symbol geometry (natural adapter) | 67 | **Deferred** – no natural geometry adapter; stripping `°` alone does not help |
| 2 | Calculus natural adapter | 33 | **Deferred** (outside A–D) |
| 3 | ± in solution lines | 13 | **Done** (13/13 verified) |
| 4 | Probability/statistics adapter | 12 | Deferred |
| 5 | Algebra prose / function remarks / multivariable | 11 | **Done** (11/11 now "incomplete", never verified) |
| 6 | Problem outside exact scope | 6 | Deferred |
| 7–8 | Complex-polynomial | 9 | Deferred |

## 3. Implemented capabilities
Checker (`independent-checker.ts`): exact quadratic-field points (x+y√r) with exact sign tests; two-radicand symbolic machinery and an exact biquadratic tower fallback at rational points; solution-set partition with candidate-elimination policy; explicit "no solution" claims judged as the exact empty set; sparse multivariable polynomials with exact rational linear-system verification (each line a rational combination of the originals, re-derived through the U4 kernel); exact evaluation under substitutions; polynomial identity/expansion checks. Parser (`natural-working.ts`): ± branches, conjunctions and tuples, identifier splitting (`6uv`), function-notation heuristic fix.

## 4. Radical / extraneous-root verification
Every retained or dropped candidate is judged against the ORIGINAL equation, with the domain of every radicand kept. Squaring is recognised as non-equivalent (widening); an extraneous root retained is invalid, candidates left unresolved are incomplete; an irrational candidate is decided exactly. Inexact situations (nested radicals, ≥3 radicands) abstain as unsupported. Tests: `verification-closure-e4.test.ts`.

## 5. Multivariable reasoning
A line is accepted only if it is an exact rational consequence of the original equations; a correct final pair after a wrong intermediate line is invalid; one value of a two-unknown system is incomplete; inconsistent systems need a "no solution" claim; dependent systems accept only the parametric form; foreign symbols are never silently bound; nonlinear lines abstain.

## 6. Rational-domain preservation
Restrictions remain attached to the original problem. Cancelling a factor that creates a pole-gap without the exclusion is a missing assumption; accepting an excluded root is invalid.

## 7. Polynomial completeness
Completeness is claimed only for degrees ≤ 12 over the supported field. Higher degree / unsupported radicals abstain. Missing roots are incomplete, invented roots invalid.

## 8. Alternative-method acceptance
Each line is validated against the proof graph, not a fixed template. Dev 12/12, sealed 13/13 alternative-method cases accepted (E3 code: 6/12 and 8/13).

## 9. Independent proof evidence
Every verified case carries gate evidence (`independentlyVerified`): 48/48 dev and 58/58 sealed verified cases (100%). New labels: `exact-polynomial-identity`, `u4+exact-linear-system`. Tampered replay digests and certificates for a different claim are rejected (test).

## 10. Soundness attacks
Covered in `verification-closure-e4.test.ts` (37 tests, all pass): invalid-then-correct, unsupported step between valid steps, squaring extraneous roots, lost denominator exclusions, wrong elimination/substitution, missing branches, forged dependency notes, altered certificates, wrong variable binding/foreign symbols, unsupported irrationals, resource exhaustion, strict "shown" policy reproducing the E3 verdict.

## 11. E1 before / after (adjudicated overlay)
| | Coverage | Correct verdicts | Verified | False acc. | False rej. |
|---|---|---|---|---|---|
| E3 | 51.4% (257) | 281 | 124 | 0 | 0 |
| E4 | 56.2% (281) | 305 | 137 | 0 | 0 |
Gain +24 correctly assessed cases (13 ± verified, 11 prose-incomplete). The raw (un-adjudicated) E1 still shows the three pre-existing false acceptances that the E3 overlay adjudicates; unchanged. **The aspirational ≥70% was not reached.** 67+33+12+9+6 = 127 recoverable-but-out-of-scope cases (geometry, calculus, probability, complex) account for the remaining gap; none belong to Priorities A–D and none was approximated.

## 12. E2 / E3 regression
E2 dev+sealed (200): 0 classification changes, 0 false acceptances (coverage 71%/72%). E3 dev+sealed (150): 0 changes, 0 false acceptances (80%/80%). All previously verified solutions stay verified.

## 13. E4 dev benchmark (100)
| | E3 code | E4 code |
|---|---|---|
| Exact verdicts | 43 | **99** |
| Assessment coverage | 50% | **99%** |
| False acceptances / rejections | 0 / 5 | **0 / 0** |
| Verified (correct) | 17 | 48 |
The 99-exact count was reached iteratively against dev cases only.

## 14. E4 sealed holdout (100, run once after code freeze, never used for decisions)
| | E3 code | E4 code |
|---|---|---|
| Exact verdicts | 42 | **99** |
| Assessment coverage | 51% | **99%** |
| False acceptances / rejections | 0 / 6 | **0 / 0** |
| Correctly verified | 21 of 58 | **58 of 58** |
Single miss: `e4-sealed-026` (radical, reference invalid): abstained as unsupported (nested radical √(25−8√3), outside the exact field). Honest abstention, not an error.

## 15. Oracle comparisons
Differential fuzz (seed 20261102, 500 cases: 400 single-line relation, 100 system): 496 agree, 3 abstain, 1 conservative (a closed false line like `-11 = 0` is reported independent-false where the oracle calls it the empty set: fails closed), **0 disagreements**. Covers randomized rational coefficients, renamed symbols, reordered steps, invalid transformations, missing/extraneous roots, domain exclusions, large coefficients. `fuzz/e4-fuzz-cases.v1.json`.

## 16. False acceptance / rejection counts
False acceptances: 0 on adjudicated E1, E2 (200), E3 (150), E4 dev, E4 sealed, fuzz. False rejections: 0 on all of the above (E3 code had 5 dev and 6 sealed).

## 17. Coverage by family (sealed, exact verdicts / cases; E3 code → E4 code)
| Family | E3 | E4 |
|---|---|---|
| Radical | 9/29 | 28/29 |
| Systems (multivariable) | 0/17 | 17/17 |
| Evaluation / expansion | 1/9 | 9/9 |
| Rational | 14/21 | 21/21 |
| Polynomial | 14/18 | 18/18 |
| Alternative-method | 4/6 | 6/6 |
Per-subfamily numbers: `e4sealed-final-*.json` → `byFamily`.

## 18. First-invalid-step accuracy
Dev 35/36 (E3: 18/36); sealed 29/30 (E3: 15/30). Restriction detection 12/12, 7/7; branch detection 12/12, 8/8.

## 19. Performance
| Partition | p50 ms E3→E4 | p95 ms E3→E4 | peak RSS MB E3→E4 |
|---|---|---|---|
| E1 (500) | 0.24 → 0.33 | 6.0 → 6.6 | 90 → 86 |
| E2 dev | 0.48 → 0.55 | 11.6 → 9.7 | 70 → 70 |
| E3 dev | 4.1 → 2.9 | 15.9 → 18.1 | 69 → 68 |
| E4 dev | 2.5 → 4.9 | 25.0 → 19.8 | 86 → 90 |
Slowest case 140 ms (e2-dev-001). Verification overhead is the added exact work in the checker; the largest p50 growth is in E4 dev, where the E3 code abstained early on many cases. Resource bounds (explicit): ≤6 variables, ≤8 equations, ≤400 terms, polynomial degree ≤12, ≤2 radicands (3 fall back to exact rational-point towers only), numbers bounded, root-search 2^60; exceeding any returns unsupported/resource-exhausted (tested).

## 20. Full regression
Run per file, sequentially, from the worktree root. **Non-frontend: 106 files, 1309 pass, 2 fail.** This covers E2 proof-integrity, E3 closure, D1–D8, U4, M1–M3, C2/C3, B1–B3, unified engine, Geometry G2–G4, worker-pool and the new `verification-closure-e4.test.ts` (37 pass).
The 2 failures are `packages/english-core/test/e2-research.test.ts` (English module, unrelated to math); the same 2 fail identically on the unmodified E3 base (`/home/claude/e3`), so they are pre-existing.
**Frontend (not touched by E4):** the first 26 alphabetical files passed (0 fail). The run then stalled on `frontend/src/learning/content-system.test.ts` (2.2 GB, >11 min) and was aborted, so the remaining frontend files, including the two known pre-existing curriculum failures, were **not re-run** in this arc. No frontend code was modified.

## 21. Remaining unsupported cases
E1: geometry with degree symbols (67), calculus (33), probability (12), complex polynomial (9), out-of-scope problem statements (6), ambiguous input (71, intentionally retained). E4 sealed: 1 (nested radical). Algebra: ≥3 radicands, nested radicals, degree >12, nonlinear systems, completeness for unsupported higher-degree families.

## 22. Readiness recommendation
**Merge-ready from a soundness standpoint, with owner decisions required.** Criteria: zero false acceptances on adjudicated E1/E2/E3/E4-sealed — met; independently verified chains for every newly accepted solution (100%) — met; no silent missing restrictions or branches — met; previously verified solutions stay accepted — met; genuine coverage gain (E1 +4.8 pts, E4 families +49 pts) — met; E4 soundness regressions pass — met. The 70% E1 aspiration is **not** met (56.2%).
Behaviour changes needing acceptance:
1. Candidate elimination is accepted without a written check (policy `implicit`); the strict E3 rule remains available as `shown`.
2. An unsolved final form now reports "incomplete" before "superset-invalid".
3. The parser accepts ±, conjunctions and tuples.
4. The function-notation heuristic changed (`x(x - 13)` is a product).
5. Two E3 tests were edited (candidate-elimination expectation; the E3 fuzz skips irrational-root cases its grid oracle cannot see).
