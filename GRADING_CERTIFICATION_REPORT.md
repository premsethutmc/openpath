# OpenPath — Grading Certification Report (Phase C, stages 4–10)

Branch `feat/unified-grading`. Certification registry: `content/learning/grading-certifications.v1.json` (hash in every decision).
Evidence: `tools/mathematics/grading-audit/data/results-c4/` (app + server, trusted grader on) and `results-c6-off/` (grader off).
Nothing is merged or deployed. Certification here is **sample-based**: it is not a proof of correctness for all 855,926 presentations.

## 1. What a certification is (approved decision 1)

Issued by `tools/mathematics/grading-audit/certify.py` per **family × presentation form × verifier**, only when the family's audit sample
shows, on both the app route and the server route, zero of: false acceptance, false rejection, stated form not enforced, equal answer in
an unstated form marked incorrect, ambiguous text credited, invalid input marked incorrect, app/server disagreement, oracle-undecided
case. The contract's old "verified" label plays no part. A decision is `certified: true` only if its own family, form and deciding
verifier hold an entry; every other decision is `certified: false` (provisional). A quarantined presentation is never decided.

## 2. Measured result (sample: 18,741 questions, 308,568 cases, all 1,080 families)

| Outcome | App | Server | Phase A (app / server) |
|---|---|---|---|
| False acceptance | **0** | **0** | 259 / 259 |
| False rejection | **0** | **0** | 6 / 6 |
| Stated form not enforced | **0** | **0** | 238 / 238 |
| Equal, unstated form, marked incorrect | **0** | **0** | 15 / 366 |
| Ambiguous text credited | **0** | **0** | 77 / 77 |
| Invalid input marked incorrect | **0** | **0** | 2,785 / 3,103 |
| App/server disagreement | **0** | | 1,884 |
| Equal answer left unresolved (missed credit, safe) | 56 | 56 | 294 / 279 |
| Equal answer in another form left unresolved (safe) | 5,223 | 5,180 | 11,665 / 11,328 |

The remaining unresolved equal answers are policy outcomes, not defects: option text typed for a multiple-choice letter (4,922; the app
sends letters), a mixed number where the contract does not permit one (228, decision 2), a ratio written as a fraction (42), text the
strict syntax reads two ways (`30x^6y`, `e^xlogx`, `4^xx^x`; decision 2), and the 25 quarantined questions in the sample.

Grader unavailable (`OPENPATH_GRADER=off`, stage 6): every one of the 308,568 server cases is unresolved — 0 credited, 0 incorrect.

## 3. Certifications issued

- **1,080 families, 2,842 family × form × verifier entries; 0 families refused.**
- Released presentations in certified family-forms: 855,526 of 855,926 (typed 341,483; mc 284,170; word 229,873 of 230,273).
  971 presentations are quarantined (adexp 360, aiintx 194, auaps 397 word forms — D09; aqd2 20 — D18) and are never decided.
- Decided sample cases by verifier: rational-exact 81,485 · choice-label 37,523 · structure 23,733 · exact-field 15,387 · sampled-numeric
  8,819 · typed kernels 8,157 · exact-arithmetic kernel 6,923 · exact-polynomial 2,774 · real-subset 2,695 · exact-solution-set kernel 1,315.
  **Kernel versus other certified methods:** 16,395 of 188,811 decided sample cases (8.7 %) were decided by a kernel.

## 4. Limits that remain (not hidden by the certification)

1. **Sample, not proof.** ≤ 19 questions per family; a defect confined to unsampled parameters is not excluded.
2. **Answer keys.** Grading is certified against the stored answer. The key itself is independently established only for 38,028 typed
   questions (`keyAuthority: independent-kernel`); every other key is `generator-only`.
3. **`sampled-numeric@1`** (expressions, antiderivatives) is certified on evidence but is a numerical-sampling method, not symbolic proof.
4. **Oracle.** One independent oracle (`grading-oracle@1`, SymPy); its own reader was corrected during the work (logged in the harness
   README). Its judgements are evidence, not ground truth.
5. **Authored questions (221) and program questions (140, D14)** are outside this certification and stay provisional.
6. **Historical records** are not re-graded (decision 3); stages 7–8 handle prospective records and the dry-run reconstruction.

## 5. Stages 7–10 (added)

**Decision records and replay (stage 7).** Every graded answer receives one server `grading-decision@1`, kept in the immutable event and an
append-only log; replay on app and server reads it. A later grader that would decide differently changes nothing recorded (tested). Only
a grader-failure decision is regraded automatically, by appending a superseding decision. The historical reconstruction is a read-only
dry run (`manage.py reconstruct_decisions --dry-run`); it has been exercised in tests only — no real learner records exist in this
workspace, and running it on production data needs approval.

**Shadow comparison, G5 (stage 8).** Server route, same 308,568 cases, earlier policy (`OPENPATH_GRADING=legacy`) versus unified:
12,725 different decisions (of 289,770 compared; 18,798 refused or not comparable), **every one classified, 0 to investigate**:

| Class | Cases | Oracle check |
|---|---|---|
| fix: an equal answer is now credited | 6,641 | 94 agree with the oracle outright; 6,547 are equal values in another form with no stated form rule (P2) |
| policy P1/P3: not an answer, no longer marked incorrect | 3,322 | 3,201 agree; 111 are readable but unconventional (`4 6/5`, `2/-3`, `log 5/log 3`) — now unresolved, never wrong |
| fix: a readable wrong answer is now decided | 1,955 | 1,895 agree; 60 form-dependent |
| policy P3: strict syntax asks for clarification | 429 | includes 38 equal answers such as `12x^3y^2` and `x^x(log(x) + 1)` that strict syntax reads two ways |
| policy P2: stated form enforced | 378 | all form-dependent |

Earlier policy on the same cases: 64 false acceptances, 6 false rejections, 3,201 invalid-marked-incorrect, 388 stated forms not enforced.
Unified (both routes): 0 of each, 0 app/server disagreements — identical to the stage-4 run (0 verdict differences in 308,568 cases).

**Programs (stage 9).** 168 program questions (3 programs + foundation) are decided by the same decision on app and server; all 168 stored
answers verify against their own contracts; solution pairs ("x =", "or x =") are unordered, labelled pairs ordered. Provisional (not in
the generated-question audit).

**Python comparison retired from authority (stage 10).** `family/legacy_grading.py` is used only by the migration modes and by replay of
historical records without a recorded verdict; a test fails if the unified path calls it.

**Test results at the end of Phase C.** `bun test packages/learning`: 1,385 pass, 0 fail (one E3 fuzz test is timing-sensitive under
load: it failed once at 5.46 s against bun's 5 s default and passed on every rerun). Program engine suites (frontend/src/mathematics,
7 files): 77 pass, 0 fail. Django: 290 tests OK.

