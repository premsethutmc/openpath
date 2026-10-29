# OpenPath — Grading Certification Report (Phase C, stages 4–6)

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
