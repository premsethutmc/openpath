# E6 — Generalized Natural-Working Coverage and Calculus Robustness

Branch `feat/math-natural-generalization-e6` (base `d28412c`). Not merged, not deployed. Recommendation: **REVISE (do not merge)** — two false acceptances on the sealed holdout.

Machine-readable results: `tools/mathematics/generalization-e6/results/` (`e6-summary.json`, `*-final.json` case level, `fuzz-e6.json`, `perf-summary.json`, `validation-use-log.json`, `sealed-run.lock`).

## 1. E1/E5 failure diagnosis
E1 (500, adjudicated) and E5 left most calculus/probability/complex working `unsupported`: E5 owned only geometry and a narrow calculus slice. On the E6 development partition the E5 engine scored 23/100 exact with 1 false acceptance (diagnostic only; run on the rev-1 dev corpus before any engine change). Causes: no exact kernel for chains over rule-based calculus, limits, definite integrals and continuity; no number-chain binder for probability/combinatorics/statistics/complex; free-form labels and notation (`d/dx`, LaTeX, Unicode) not translated.

## 2. Ranked recovery matrix
1. Differentiation/integration chains (largest share of corpus). 2. Probability/statistics number chains with assumption gating. 3. Limits/continuity/differentiability. 4. Complex/polynomial arithmetic and root claims. 5. Mixed-domain labels and restriction handling. Implicit differentiation, improper integrals, limits at ±∞ of exponentials, trigonometric substitution and unseen identities remain unsupported (see §22).

## 3. Generalized calculus integration
New exact kernels: `e6-parse.ts` (notation → AST), `e6-cas.ts` (formal identity over generators with derived domain restrictions; accepts only on an exact identity, rejects only when the identity fails *and* sampling confirms, otherwise `unproven` → unsupported), `e6-series.ts` (exact Laurent-series limits), `e6-calc.ts` (planner for derivative, indefinite/definite integral, limit, continuity, differentiability). Integral chains are compared through x-derivatives with derivative overrides for opaque integral symbols; substitutions are checked line by line (`u = …`, `du = … dx`); `∫ … ` with no `+C` is `missing-assumption`; `ln(p)` needs a stated `p>0`; a cancelled factor must be a stated restriction (also in derivative tasks even when the posed function excludes the point).

## 4. Probability integration
`e6-numbers.ts`: exact Gaussian-rational chains. Labels must equal a datum (restatement), the exact truth (answer) or a definition; adjacent members must be exactly equal; completeness needs a numeral equal to the truth on the last row. Assumption gating (independent, mutually-exclusive, equiprobable, ordered/unordered, real-coefficients, population/sample) is satisfied from the problem's assumptions or student prose; a negated assumption is invalid. Unsupported specs: normal probabilities, Markov, principal argument, complex logs, solve.

## 5. Complex-number integration
Same engine: conjugate, product, powers of i (mod 4), root verification, factor theorem, conjugate-root, Vieta, De Moivre, roots of unity, translations, quadratic roots. `±` is ambiguous; a missing root in a "all roots" claim is incomplete.

## 6. Mixed-domain reasoning
E6 takes the problem's domain, not the line's: a label from another domain cannot be bound to the posed symbols (wrong symbol binding is unsupported/invalid). Forged cross-domain dependencies are handled by the pre-existing D3 typed-dependency checks, which still run in the merge (an invalid or non-verified prior is never upgraded by E6). E6 did not add new cross-domain dependency machinery; this is a stated limitation.

## 7. Proof-integrity architecture
Unchanged E3 gate. Every line yields one typed judgement; each accepted line carries one independent `e6-independent-exact` evidence record bound to the line id, source text and digest; a prose line is accounted as a verified claim-step with scope "non-mathematical sentence preserved" (never relied on). `resolveVerdict` precedence is unchanged (invalid > unresolved > incomplete > verified). Merge (`mergeE6`): E6 refines non-definite priors, vetoes `verified` on ambiguity or a definite non-verified verdict, E6 `invalid` beats a non-invalid prior. A float comparison can only confirm a rejection.

## 8. Pedagogical verdict semantics
**Contract revision (documented):** a missing `+C` is now `missing-assumption` (earlier D5 label `invalid`). D5 tests were updated for this and for two refinements of earlier `unsupported` labels to specific verdicts (wrong conjugation → `invalid`; missing probability assumption → `missing-assumption`); the historical labels remain in the frozen D5 corpus. First-invalid-step count in the D5 test moved 40 → 30 accordingly. A resource-exhausted engine verdict counts as exact against an `unsupported` reference in the E6 evaluator (disclosed mapping).

## 9. Independent verification methodology
Corpus authored by a separate Python oracle (`e6_oracle.py`, `kit.py`, `auth_*.py`) with exact rational arithmetic, not by the engine; 300 cases frozen as 100 dev / 100 validation / 100 sealed with SHA-256 files; labels never hand-edited (rev 2 changed only the printer, before any engine change; see `CORPUS_REVISIONS.md`). Validation scored twice (log in `validation-use-log.json`: after dev iteration; after the restriction fix). The sealed set was scored exactly once (`sealed-run.lock`) at code digest `1348f462…ce629`. Family names are exposed to the author; the corpus is therefore not family-disjoint from the engine design — a disclosed limitation.

## 10. Adversarial tests
`packages/learning/src/verification-closure-e6.test.ts` (24 tests, pass): correct final answer after invalid work; wrong chain rule; wrong integration rule; invalid substitution; missing constant; wrong probability complement/denominator; unsupported and negated independence; wrong mean divisor; incorrect conjugation; missing polynomial root; wrong symbol binding / cross-domain label; ambiguous notation (`log`, `±`); trailing prose without final answer; resource exhaustion (oversize, deep nesting, huge powers); frozen corpus hashes. A deterministic fuzz partition (`fuzz.ts`, 2000 mutants of dev working): 0 exceptions, max 77 ms, 0 same-length mutants of a non-verified case became verified (14 deletions of the invalid/incomplete line left a correct remainder — legitimate).

## 11. E1–E5 regression results (E6 vs E5 baseline; exact / FA / FR)
| Benchmark | E5 baseline | E6 |
|---|---|---|
| E1 500 (adjudication overlay) | 412 / 0 / 0 | **451 / 0 / 0** |
| E2 200 (dev 79 + sealed 79) | 158 / 0 / 0 | 158 / 0 / 0 |
| E3 150 (dev 63 + sealed 62→63) | 125 / 0 / 0 | **126 / 0 / 0** |
| E4 200 | 198 / 0 / 0 | 198 / 0 / 0 |
| E5 200 (dev + sealed with overlay) | 185 / 0 / 0 | **196 / 0 / 0** |

During development E6 produced regressions (E1 FR=13, E3 sealed FA=2/FR=1, E5 dev FR=1); all were root-caused (restatement labels judged against the answer; unlabelled mid-chain true facts; limit "does not exist" not connected to the posed limit) and fixed before the final runs. "Adjudicated" results use the recorded overlay and are not raw: raw E1 includes the references adjudicated in E3 (pre-existing mislabels).

## 12. E6 development results
100/100 exact, 0 FA, 0 FR, 94 assessed (6 honest abstentions that match the reference). **Tuned on; not a generalization number.**

## 13. E6 validation results
83/100 exact, **0 FA, 2 FR**, 85 assessed. Both FR are reference-defect candidates (see §16). Used twice; a later isProse fix (placeholder tokens for event brackets) came after checkpoint 2 and was exercised by the sealed run, not re-scored on validation.

## 14. E6 sealed holdout results (single run, no tuning)
80/100 exact, **2 FA, 3 FR**, 80 assessed (75 correct), 20 abstentions/mismatches (14 unsupported, 10 incomplete, 3 malformed, 3 ambiguous). Verified 39 (all with independent evidence, coverage 100%).

## 15. Generalization-gap analysis
Exact: dev 100 → validation 83 → sealed 80 (gap 17 / 20 points). Per domain (exact/n) dev | val | sealed: differentiation 20/20 | 17/20 | 19/20; integration 20/20 | 15/20 | 17/20; limits-continuity 13/13 | 12/14 | 11/13; probability-combinatorics 15/15 | 14/15 | 10/15; complex-polynomial 15/15 | 13/15 | 13/15; mixed-domain 17/17 | 12/16 | 10/17. Weakest: mixed-domain and probability on sealed. The E5 baseline was never scored on validation/sealed, so a baseline lift on those partitions is not claimed; on dev it was 23 → 100.

## 16. False acceptance and rejection counts
Historical adjudicated benchmarks: 0 FA, 0 FR everywhere. E6 dev 0/0, validation 0/2, **sealed 2/3**.
Sealed false acceptances (engine defects, not fixed after the sealed run so that the scored code equals the committed code):
- `e6-204` "P(A, B) = 1/6" (reference: ambiguous). A comma event list is read as a joint event; it should be ambiguous.
- `e6-263` `ln(x)+ln(x²) = ln(x³)` then derivative (reference: missing-assumption). The posed function's own positivity domain was treated as implied, so the combine-logs step needed no stated `x>0` (the same class as the nonzero-restriction fix applied to derivatives; the positive-restriction analogue was not applied).
Sealed false rejections: `e6-124`, `e6-126` (`lim x->2+ 1/(x-2) = ∞`; one-sided infinite limit with an `x->a+` suffix judged invalid — a side-parsing defect), `e6-220` (negative-discriminant roots written as `√-36` evaluated to `-2+3i` but only one root given → incomplete; reference verified).
Validation false rejections (reference-defect candidates, not relabelled): `e6-213` (multiply task; student's final line is the conjugate `5−5i`, the product `5+5i` is never stated) and `e6-288` (verify-root task; student shows |root| = 5, never verifies the root).

## 17. Assessment coverage by domain
Assessed (not abstained) dev 94, validation 85, sealed 80 of 100. Independent-evidence coverage of accepted solutions: 100% on all three partitions. Unaccounted acceptances: 0.

## 18. First-invalid-step accuracy
dev 25/27, validation 21/27, sealed 21/27 (invalid-reference cases where the engine named the same first invalid line).

## 19. Alternative-method acceptance
dev 4/4, validation 9/10, sealed 3/5.

## 20. Performance and resource usage
E5-sealed-adjusted (100 cases): E6 p50 1.57 ms, p95 9.8 ms, max 31.9 ms, total 312 ms vs E5 baseline p50 0.87 ms, p95 7.3 ms, total 216 ms (≈ +44% total verification time). Peak RSS ≈ 77–80 MB. Sealed partition p50 1.9 ms, p95 13.9 ms, max 36 ms. Input limits: 8192 characters, 64 lines.

## 21. Full regression results
- `packages/learning`: 1037 pass, 0 fail (includes 24 new E6 tests; D5/D6/D7 etc.).
- `packages/english-core`: 312 pass, 2 fail — the E1/E2A frozen-simulation tests, identical failures in the E5 baseline (pre-existing, unrelated).
- `frontend/src/mathematics`: 79 pass, 2 fail — the same 2 tests fail on the E5 baseline (pre-existing).
- `frontend/src/learning`: not completed (timed out under bun; the suite targets node/tsx and `frontend/node_modules` is absent here). Not claimed.
- D1–D8, U4, M1–M3, C2/C3, B1–B3, G2–G4 and the unified suite are covered by the `packages/learning` run (no separate runners exist for them).

## 22. Remaining unsupported cases
Implicit differentiation; improper integrals; limits at ±∞ with exponentials; trigonometric half-angle/identity manipulations; normal probability, Markov chains, principal argument, complex logarithms, general equation solving; comma/ambiguous event notation beyond the cases handled; B1/B3-style destination cross-checks were not newly extended (the pre-existing routes still run and can only veto).

## 23. Readiness recommendation
**REVISE.** Merge-ready criteria: zero FA on adjudicated historical benchmarks ✔; independent proof chains for accepted solutions ✔; no silently discarded lines ✔; existing routes valid ✔ (with the documented D5 revision); coverage improved ✔ (E1 412→451; E5 185→196); soundness regression tests ✔; **zero FA on the fresh sealed set ✘ (2)**. Fixes required before merge: (1) treat comma-separated event lists as ambiguous; (2) apply the stated-restriction rule to positive (`ln`) cancellations/combinations in derivative and integral tasks; (3) parse `x->a+/-` one-sided suffixes; (4) reconsider the `√(negative)` root form. These were *not* applied after the sealed run; they need a fresh, unseen holdout to be re-scored.
