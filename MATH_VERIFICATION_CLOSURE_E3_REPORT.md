# OpenPath E3 — Mandatory Proof Verification and Complete-Solution Validation

Branch `fix/math-verification-closure-e3`, base `fix/math-proof-integrity-e2` @ `2e7b265` (verified before work). Not merged, not deployed.
Machine-readable data: `tools/mathematics/verification-closure-e3/results/` (`e3-benchmark-summary.json`, `verification-diagnostics.json`, `gate-levels.json`, `perf-*.json`, case-level `<set>-<label>.json`). Frozen corpora, generator, fuzz set, evaluator: `tools/mathematics/verification-closure-e3/`.

## 1. Architecture of the mandatory acceptance gate
`assessMathematicalWorking` (exported, `unified-math-engine.ts`) = `assessCandidate` (the former assessor, now only a **proposer**) + `applyAcceptanceGate` (`acceptance-gate.ts`). Only the gate can return `verified`. Any exception inside the gate fails closed (withdraws acceptance).

| Route | Gate rule for `verified` |
|---|---|
| algebra text | the independent exact checker (`independent-checker.ts`) must verify every line and the final conclusion; U4 evidence is attached per step |
| adapter-converted (function, determinant, mean, complex, probability, vector, derivative, integral) | every line accounted AND every claim-step has independently re-derived binding evidence (U4 certificate replay on the original source lines, or an independent exact re-computation) |
| structured typed | domain reasoner verified every step (weaker level, reported separately) |
| other natural routes | cannot be verified |

Verifier disagreement (candidate says invalid, checker says verified) accepts nothing (`unsupported`, source `conflict`). A checker refutation overrides a candidate acceptance. The checker never relaxes a stricter native verdict. Every envelope carries `acceptanceGate` (route, level, evidence list with digests, obligations, reconciliation reason). Pipeline: original working → preserved lines (E2 `LineAccount`) → typed claims → dependencies (D2/D3) → independent verification → completeness → gate.

## 2. Independent verification contract
`openpath-independent-algebra-checker@1`: no import of math-core, the adapters or M3. Bigint rationals plus a √r extension; polynomial and rational-function algebra; rational-root-theorem roots; exact solution sets obtained by sampling every rational critical point (roots, poles, abs sign changes, sqrt radicand) and every gap. It **abstains** (never guesses) when a critical point is irrational or of degree > 2, with more than one variable, with unsupported functions, or beyond limits (`CHECKER_LIMITS`; explicit `resource-exhausted`). Per inference we record: source line and span, claim, relation (equivalent / widening / narrowing / incomparable), restrictions, obligations, evidence, status. Scope string `CHECKER_SCOPE` is stored with every evidence item. Typed rechecks (`claim-binding.ts`) are separate exact re-computations (determinant, mean, modulus, complement via re-parsed source text, vector sum, an independent differentiator for derivatives and antiderivatives).

## 3. Algebra text-route proof closure
Previously: line accounting but no U4 certificate. Now each equation step gets a U4-checked identity `to ≡ h·from` (h found by exact polynomial division, so add/subtract both sides, expansion, factoring, combining terms, constant multiply/divide all reduce to it); equation → `x = r1 or x = r2` gets a zero-product identity (constant multiple of the product of root factors); inequality steps require a constant multiplier whose sign matches the operator (positive keeps, negative reverses). Cancellation of non-constant factors yields kernel `nonzero` restrictions, which are carried as obligations. A certificate that omits its restriction is `unsupported`; a certificate for one claim does not verify another; tampered digests are rejected (tests). Kernel exponent budget (≤16) falls back to an independent polynomial identity (degree ≤ 200). Identity, equality under assumptions, equivalent equations, implication (widening/narrowing) and solution-set equivalence are separate relations; a one-point numeric match is never accepted as equivalence.

## 4. Proof dependency integrity
Reused E2 line accounting + claim binding (52 E2 tests still pass). Added: errors are raised only for steps the candidate called verified (so correct `invalid` verdicts are not downgraded); symbolic direct path replays certificates against source-derived before/after expressions; everything after the first invalid or unresolved line is `inconclusive`, so no unverified claim becomes a premise. Independent calculations, case splits and alternative methods are kept because relations are judged against the solution set, not against "the previous line".

## 5. Completeness validation
Distinct from step validity. Verdicts (exact, from solution sets): final line narrower than the problem's solutions → `incomplete` (`x²=9 ⇒ x=3`, `|x|=2 ⇒ x=2`); final line a strict superset → `invalid` at the final line (extraneous roots after squaring); false "complete solution" claim → `invalid` at the narrowing line; "holds for all x" differing only at excluded points (`(x²−1)/(x−1)=x+1`) → `missing-assumption`; equal sets reached through a widening step (squaring) without a shown candidate check → `incomplete`; inequality sign reversal enforced. Expression/numeric problems leave final-form completeness to the native engine (checker vouches step equivalence only). Where completeness cannot be shown the result is incomplete/unsupported, never verified.

## 6. Three-case reference adjudication (e1-116, e1-126, e1-141)
Overlay: `e1-adjudication-overlay.v1.json` (versioned, records the E1 corpus sha256; E1 untouched).
- Question: evaluate f(x)=x²+1x+2 at input 1. Working: `f(x) = x^2 + 1x + 2` / `f(1) = 1^2 + 1 + 2` / `f(1) = 4`. The three cases are textually identical (116 diagnostic, 126 and 141 sealed).
- Analysis: the coefficient-1 term is 1·x with x = 1, i.e. 1·1 = 1, so writing `1` is a true statement; the problem's own input licenses the substitution. Every line is true and the result 4 is correct and complete. The reference's "nx evaluated as n" is an error only when x ≠ 1 (a test in the suite confirms the same working with input 3 is rejected as invalid).
- Reference verdict: `verified`. Engine verdict: `verified` (adapter route, gate level U4, independently verified). **E1 label wrong: yes (all 3). Engine defect: none.** A hint about a possible misconception is outside the verification contract.

## 7. E1 before and after (500 cases)
| | E2 code | E3 code, original labels | E3 code, adjudicated labels |
|---|---|---|---|
| False acceptances | 3 (16 originally) | 3 (the disputed labels) | **0** |
| False rejections | 0 | 0 | 0 |
| Correctly verified / invalid | 121 / 77 | 121 / 77 | 124 / 77 |
| Assessment coverage | 0.514 | 0.514 | 0.514 |
| Independently verified share of accepted | 0 / 124 | 124 / 124 | 124 / 124 |
Classifications are unchanged from E2; E3 changes *why* acceptance is allowed, not what is accepted on E1. 13 of the 16 are correctly rejected/incomplete (tests per id); 3 are label corrections. Coverage is limited (49% abstain/unscored), mostly unsupported characters (° ±), ambiguous `a/bx`, calculus and probability without natural adapters.

## 8. E2 benchmark results (known sets)
| Set | FA before→after | FR | exact verdicts | coverage | restriction | branch | independent coverage |
|---|---|---|---|---|---|---|---|
| E2 dev (100) | 0→0 | 0 | 65→75 | 0.61→0.71 | 0/7→7/7 | 10/13→13/13 | 0→1.00 |
| E2 previously sealed (100) | 0→0 | 0 | 71→79 | 0.64→0.72 | 4/11→11/11 | 8/9→9/9 | 0→1.00 |
(E2's own earlier baseline was 17→0 and 23→0 false acceptances.)

## 9. New sealed holdout (75 cases, frozen before implementation, run once before and once after)
Frozen hashes in `FROZEN_SHA256`; generator uses an independent Fraction oracle for labels; sealed data never used for decisions.
| Metric | E2 code | E3 code |
|---|---|---|
| **False acceptances** | 0 | **0** |
| False rejections | 0 | 0 |
| Exact verdicts | 42 | 62 |
| Assessment coverage | 0.52 | 0.80 |
| Correctly verified / invalid | 9/20, 17/30 | 14/20, 25/30 |
| Alternative accepted | 9/15 | 13/15 |
| Restriction / branch detected | 1/10, 3/5 | 10/10, 5/5 |
| Independent coverage of accepted | 0/9 | 14/14 |
Honest note: the E2 code already had zero false acceptances on this set; E3's measurable gains are coverage, restriction/branch detection and the independence guarantee, not fewer false acceptances. The sealed set is therefore now spent as a holdout.

## 10. False acceptance analysis
Zero on E3 dev, E3 sealed, E2 dev, E2 sealed, and E1 under adjudicated labels. The only residuals are the 3 disputed E1 labels (section 6). A differential fuzz (1,900 independent-oracle cases, seed 20261029) found 0 disagreements among 1,560 decided cases; the 340 remaining are abstentions. Two bugs found by earlier tests (inverted widening/narrowing labels; fractional multipliers rejected by U4) were fixed before the freeze.

## 11. Coverage and abstention
Abstentions are never counted as success. E3 sealed: assessed 60/75, correct 58/75 (77%); abstentions 15 (11 unsupported: statistics/complex/determinant/function lines the adapter can only partly verify, an `!` character, unparsed lines; 4 ambiguous `a/bx` conventions). E3 dev 0.80 coverage. E1 0.514. Fuzz: 82% decided; abstentions are irrational critical points (110), ambiguous parser input (107), unparsed problem statements (58), disjunctions of inequalities (31), function-call lines (24), multi-variable (2).

## 12. First-invalid-step accuracy
E3 sealed 25/30 (E2 code 17/30); E3 dev 30/35; E2 dev 32/47 (28); E2 sealed 36/45 (34); E1 77/100. Misses are abstentions on unsupported inserted lines, not wrong-line claims. (Metric: for references with no acceptable index, a match means "invalid with no pinned line".)

## 13. Alternative-method acceptance
E3 sealed 13/15 (9), E3 dev 14/15 (12), E2 dev 15/15, E2 sealed 15/15, E1 30/75 (unchanged). The two misses per E3 set are multi-variable alternatives the checker abstains on; none rejected as invalid.

## 14. Domain restriction and branch detection
E3 sealed: restriction 10/10 (1/10), branch 5/5 (3/5). E3 dev 12/12 and 3/3. E2 dev 7/7, 13/13; E2 sealed 11/11, 9/9. E1: branch 11/15; restriction 0/25 (E1's restriction cases are mostly outside the checker scope and are rejected or abstained, not accepted; no false acceptance).

## 15. U4 and independent-checker coverage
Every accepted result is independently verified (E1 124/124, E2 15+15, E3 14+14). Levels (`gate-levels.json`): algebra-text/U4 45 (E1), adapter-converted U4 36, adapter claim-recheck + destination reasoner 43. U4-certificate-bearing algebra steps are counted in `u4Steps`; steps decided only by exact solution-set comparison are `exactSteps`. Structured-typed acceptance (weaker level) never occurred in the benchmarks.

## 16. Geometry concurrency findings
Reproduced: `geometry-worker-pool > 100 concurrent assessments` passed alone (completed=100) and failed in the full run (completed=204). Cause: **test isolation** — Bun runs all test files in one process and the geometry pools are process-global, so counters included work from other files. Not a worker-lifecycle, scheduling or production defect (shutdown correctly resets a pool; `workerStarts` was 2). Minimal fix: a `beforeEach` shutdown in the test plus a regression test that diagnostics belong to one pool lifetime. Production geometry code untouched.

## 17. Performance (875 samples, E3 dev + E2 dev, ms)
| Stage | p50 | p95 |
|---|---|---|
| Parsing | 0.043 | 0.119 |
| Independent verification incl. completeness (algebra, 470) | 1.358 | 4.829 |
| Overall assessment, E3 code | 0.944 | 9.713 |
| Overall assessment, E2 code | 0.363 | 6.239 |
The gate costs about +0.6 ms p50 and +3.5 ms p95; memory 87→104 MB RSS. Proof-state construction is internal to the proposer and is not separately instrumented (not exported); completeness is computed in the same exact pass as independent verification and is not separable without invasive instrumentation. Limits are enforced (degree cap, point budget); exceeding them returns `resource-exhausted`, never an accepted result.

## 18. Full regression
- Learning package (`bun test packages/learning`): **915 pass, 0 fail, 0 skip** (914 earlier + 1 new geometry isolation test; includes E2 52 tests, D1–D8, U4, M1–M3, C2/C3, B1–B3, unified, worker pool).
- New `verification-closure-e3.test.ts`: 45 pass, 0 fail.
- Geometry G2–G4 (Python unittest): 47 pass, 0 fail.
- Frontend mathematics suites (`bun test frontend/src/mathematics`): 79 pass, 2 fail (curriculum-inventory tests: "exactly 34 mandatory removals…", "developmental overlay keeps all historical IDs…"). The identical 2 failures reproduce on the E2 base `2e7b265`; E3 touches no frontend file. Unrelated to proof integrity; not fixed here. A whole-repo `bun test` was aborted (multi-GB memory, >8 min) so the remaining frontend english/learning suites were not run; they are outside the requested suite list.
- `tsc`: no tsconfig/compiler is available in this environment, so no type-check comparison was possible (Bun type-strips at runtime).

## 19. Remaining unsupported routes
Irrational or degree > 2 critical points; multi-variable problems; transcendental functions (ln, tan, e^x), %, factorials, gcd on the algebra route; disjunctions of inequalities; implicit division conventions (`a/bx`, `x(`); calculus, probability and trigonometry free-form working in E1 (no lossless natural adapters; unsupported characters ° ±); prose claims are recognised by regex only (completeness and "for all x" claims); lines matched to given data by typed adapters are matched by the adapter, not independently; structured-typed domains rely on their domain reasoner. A correct squaring solution is `incomplete` until the candidate check against the original equation is written in a form the checker can read (strict by design). Intentional behaviour changes: acceptance is withdrawn when no independent evidence exists; some formerly unsupported cases (inequalities, abs, sqrt with extraneous roots, restrictions) are now decided.

## 20. Readiness classification
Criteria: all 16 E1 cases resolved (13 correct, 3 documented label corrections) ✔; zero false acceptances on the fresh sealed holdout ✔ (0/75); every accepted solution independently gated ✔; no silent line loss ✔ (E2 accounting retained); no unverified premise ✔; completeness enforced ✔; valid alternatives not rejected ✔ (abstain only); E3 regressions pass ✔; unrelated failures documented ✔ (2 pre-existing frontend curriculum tests, identical on base).

**MERGE READY** subject to owner acceptance of: (a) the overlay's three label corrections, (b) reduced-coverage honesty (E1 51%, sealed 80%), (c) the stricter incomplete verdict for unchecked extraneous-root candidates. Not merged or deployed; E4 not started.
