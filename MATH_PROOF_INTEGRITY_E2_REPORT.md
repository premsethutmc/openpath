# OpenPath — E2 Proof Integrity and Line Preservation Report

Branch `fix/math-proof-integrity-e2`, base `eval/math-assessment-e1` @ 55361ec (verified). Not merged, not deployed.
Machine-readable data: `tools/mathematics/proof-integrity-e2/results/` (`root-cause-16.json`, `e1-comparison.json`, `e2-benchmark-summary.json`, `proof-integrity-diagnostics.json`, case-level `*-before.json` / `*-after.json`).

## 1. Root cause of the 16 false acceptances
All 16 were reproduced with per-case records (`root-cause-16.json`, `false-accepts-before/after.json`): 12 function-evaluation incomplete cases, 3 function-evaluation cases with a disputed reference (e1-116, 126, 141), 1 complex-modulus case (e1-446).
Causes, in every case: (a) adapters converted only the first/last line and silently dropped the rest; (b) the verified chain started from the typed problem, not the student's lines (final-answer-only verification); (c) the source map pointed at adapter steps, not original lines; (d) no completeness obligation for unevaluated substitutions (`f(1)=1^2+1(1)+2` accepted); (e) for e1-446 a certificate/claim mismatch (`|z|=2` was certified as `|z|^2=2`). No case involved reordering or forged dependencies. Restrictions/branches were a separate E1 weakness (section 7).

## 2. Line-preservation architecture
`proof-integrity.ts`: every nonblank line gets a `LineRecord` (stable id, original text, line + character span, parsed and canonical form, stage, dependencies, one of 8 statuses: verified-valid, verified-invalid, incomplete, unsupported, ambiguous, malformed, inconclusive, resource-exhausted). Parse status is kept separate. Formatting-only lines are explicitly classified. `resolveVerdict` is the only path to "verified": every line verified-valid, no open obligations, native completeness. Parse failures keep per-line records (bounded to 64 lines / 8192 chars).

## 3. Adapter contract
Adapters return a `LineAccount` declaring lines consumed/produced, claims, assumptions, restrictions, dependencies, obligations and evidence. The engine independently re-validates it (`validateAccounts`: unknown/duplicate ids, reordering, step/claim count, source-map mismatch). New `partial` outcome maps to unsupported. Typed adapters now emit one step per written claim, each verified by the destination reasoner.

## 4. Ordered proof chain
Steps are one per original line, with dependency chains; an invalid step stops the chain and later lines become inconclusive. Unresolved required lines prevent certification of the whole submission. Intermediate evaluations use exact rational arithmetic; a final line not in evaluated form yields incomplete.

## 5. D2/D3 integration
D2 `establish` refuses facts whose line account has unaccounted lines, violations or non-premise-eligible records, and records `sourceLines`. D3 `export` requires a premise-eligible record in a fully accounted proof. Facts from invalid/unverified lines cannot become premises, which blocks proof laundering across domains.

## 6. U4 binding (`claim-binding.ts`)
Symbolic route: the certificate check is re-run with before/after re-derived from the original parsed source lines; expression and dependency must match. Typed route: an independent IR evaluator rechecks determinant, mean and complex-modulus claims. Complex modulus: `|z|=e` is squared exactly, `|z|^2=e` kept as written. Certificate hashes are not treated as proof.

## 7. Restrictions and branches
Pure-loss narrowing (e.g. `x^2=9` then `x=3`) is reclassified from invalid to incomplete, never certified and not called false; if a later line claims completeness, the narrowing line is invalid. Restrictions such as x≠1 are preserved in accounts. Strict detection E1 0/40 → 11/40; dev 10/20, sealed 12/20; the rest abstain. `|x|=k`, sqrt equations and prose restriction claims abstain.

## 8. First-invalid-step localization
Reported in original line numbers. Final-claim failures localize to the last line. If earlier lines are unresolved, the limitation is reported rather than asserting a later line. E1 77/100 exact (was 33/100).

## 9. E1 before/after (500 cases)
| Metric | Before | After |
|---|---|---|
| False acceptances | 16 | 3 (disputed labels) |
| Exact verdict | 224 | 278 |
| Assessed | 227 | 257 |
| Verified | 131 | 124 |
| Incomplete | 9 | 56 |
| Invalid | 87 | 77 |
| Unsupported | 202 | 172 |
| First-invalid exact | 33/100 | 77/100 |
| Restriction/branch (strict) | 0/40 | 11/40 |
| Alternative acceptance | 30/75 | 30/75 |
No reference-verified case lost acceptance. Of the 124 verified, all lines are verified-valid in 124/124.

The 3 residual (e1-116, e1-126, e1-141): reference says invalid because "the nx term was evaluated as n". At input 1, `1^2+1+2` and `f(1)=4` are true (1·1=1), so the engine's "verified" is mathematically correct; the reference label is the defect. Labels were not edited. **Needs owner adjudication.**

## 10. Fresh dev benchmark (100 of 200 frozen; hash d2531cd4…)
False acceptances 17→0; unaccounted acceptances 26→0; false rejections 0→0; alternatives 15/15; restriction 0→10/20; first-invalid exact 15→28/47; verified 33→15; assessed 66→61.

## 11. Sealed holdout (hash bd18e2a3…, run once)
Frozen 2026-10-27T12:52Z before any fix; not inspected during development; run once at code digest a273f980…. False acceptances 23→**0**; unaccounted 35→0; false rejections 0; alternatives 15/15; restriction 4→12/20; first-invalid exact 15→34/45; verified 41→15; assessed 75→64. A behavior-identical type-only cast was added afterwards (transpile hash unchanged); no tuning followed the sealed run.

## 12. Attacks
12 attack tests in `proof-integrity-e2.test.ts` (deleted invalid line, reordering, correct-final substitution, claim replacement after certificate, forged source ids, forged dependencies, promoted unsupported facts, certificate reuse under changed assumptions, omitted branches, removed denominator exclusions, bypass via another adapter, plus an extra). None yields an accepted complete solution.

## 13. False accept / reject counts
E1: FA 16→3 (disputed), false rejections no regression. Dev: FA 0, FR 0. Sealed: FA 0, FR 0.

## 14. Coverage change
Assessed E1 227→257 (more lines now accounted), but verified 131→124: seven former acceptances became incomplete/unsupported (intentional). Unsupported 202→172. Coverage was not the goal.

## 15. Alternative-method acceptance
E1 30/75 (unchanged); dev 15/15; sealed 15/15.

## 16. Regression
Learning suite 913 pass / 1 fail: `geometry-worker-pool` "100 concurrent assessments", an order-dependent failure that also fails at the base commit in a full run (861/1) and passes in isolation (6/6). Geometry Python G2–G4: 47 OK. By family, all 0 fail: D8 9, D7 5, D6 4, D5 4, D4 10, D3 5, D2 2, D1 2, U4 1, M1 4, M2 3, M3 9, C2/C3 12, B1 2, B2 1, B3 2, unified 11, math-core 244, E2 52. Intentional test changes: D5 first-invalid index (ten matrix-dimension cases now report the original-line index 2; total 40) and D6 steps length 3 with lines [1,2,3]. Frozen data untouched. tsc errors in touched files 9→6 (all pre-existing).

## 17. Performance (median of 7 runs, ms; p50 / p95 / p99)
E1 500: 0.046/2.876/6.444 → 0.250/3.990/9.311. Dev 100: 0.207/7.478/13.528 → 0.422/8.611/17.205. p50 ~5× higher but sub-millisecond. Bounds: 64 lines, 8192 chars; excess returns resource-exhausted, not acceptance.

## 18. Limitations
- Algebra text route uses math-core with line accounting but no U4 certificate.
- Typed rechecks cover determinant, mean, complex modulus only; vector and complement rely on adapter + destination reasoner.
- `mean`/`P()`/matrix/vector lines stay opaque notation (no canonical form).
- Completeness-claim detection is regex-based.
- Restriction/branch detection partial (11/40 E1); the rest abstain.
- Calculus multi-line working unsupported.
- 3 disputed E1 labels (section 9).
- Pre-existing geometry-pool order failure; Playwright `year` failure untouched (outside E2).

## 19. Recommendation: **REVISE** (one non-code blocker)
All code acceptance criteria are met: zero sealed false acceptances, no unaccounted acceptances, lines preserved with explicit statuses, restrictions and dependencies preserved. The only blocker: 3 of the 16 known E1 cases still read as "false acceptance" under the frozen labels, though the engine is mathematically right. If the owner confirms the arithmetic, those references should be corrected in a new labeled set (E1 data stays frozen) and the branch becomes MERGE READY.
