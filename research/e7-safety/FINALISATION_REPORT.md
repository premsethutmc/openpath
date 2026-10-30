# E7 finalisation — report

Branch: `fix/math-e7-safety-invariants`. The starting head `d7d59bf` was verified, and the original engine is `837c79c`. Nothing is merged or deployed.
Fresh holdout labels were frozen in `d113436` (SHA-256 `4657f2a5…`) before any E7 run.

## Grading-policy decisions implemented

| Topic | Decision | Where |
|---|---|---|
| Lost solutions | An **explicitly claimed equivalence** (`⇔`, `<=>`, `⟺`, `iff`) between statements whose solution sets differ is an **invalid** transformation, whether it loses or gains solutions. An answer that only omits solutions, with no equivalence claim, is **incomplete**. A "no solution" claim when solutions exist is a false claim: **invalid** (unified) / **incorrect** (answer-first). The earlier policy switch is removed. | `natural-working.ts` (connective), `independent-checker.ts`, `unified-math-engine.ts`, `answer-first.ts`, `claim-ledger.ts` |
| Three dimensions | **Mathematical validity** comes from the engine classification, which a rubric never changes. **Completeness** is complete or incomplete. **Evidence** is a set of process findings: `restriction-not-stated`, `candidate-check-not-shown`, `cited-rule-contradicted`, `no-derivation-shown`. | `assessment-policy.ts` (new), `AssessmentEnvelope.processFindings` (optional field) |
| Answer-only | answer-first independently verifies the final answer. A correct, complete answer earns full credit with no working or shown checks. | `assessWithPolicy` |
| Method-required | Every written step must be valid. An omission costs process credit (partial) only when the rubric requires it (`requireStatedRestrictions`, `requireShownCandidateChecks`, `deductForWrongCitation`). It never makes the work invalid. | `gradeEnvelope` |
| Proof-required | The engine proving the result is not the student demonstrating it. A bare answer, or a candidate dropped without a written check, earns partial credit. A candidate the student explicitly excluded (`x ≠ a`) counts as shown. | `gradeEnvelope`, `algebraProcessFindings` |
| Domain restrictions | Domain validity is always enforced by the engine (invalid or missing-assumption). An omitted but implied restriction is a finding, and the rubric decides. | — |
| Wrong cited rules | A correct step under a wrong citation stays **verified** and gets a `cited-rule-contradicted` finding. This is an intentional contract change to typed repair D, which previously graded such a step invalid. | `unified-math-engine.ts`, `derivation-e7.test.ts` |
| Bare `log` | Precedence: explicit base in the expression (`log_10`, `log_{2}`, `log10`), then the question's `conventions`, then the assessment's `conventions`. With none of these, the engine assesses under both readings. An identical verdict stands; otherwise the result is **ambiguous** (unified) / **unresolved** (answer-first). `ln` is always natural. | `natural-working.ts`, engine entry points |

These are compatible extensions:
- optional `conventions` on the parser input, problem and options;
- optional `connective` on parsed lines;
- optional `processFindings` on the envelope;
- answer-first status `restriction`, carried over from the safety work.

The policy contract is named `openpath-e7-process-policy@1` so it does not collide with unified-grading's `grading-policy@1`. It reuses `AssessmentMode` from `assessment.ts`.

## Coverage changes (only the two requested)

- **sec / cbrt**
  - `sec(x)` maps to `cos(x)^-1`, which keeps the pole where cos x = 0.
  - `cbrt(x)` maps to `root{index:3}`, with exact real cube roots: `cbrt(-8) = -2`.
  - Every consumer that assumed square roots now evaluates odd roots exactly or refuses: independent checker (three sites), float spot checks, and E6 (refuses).
  - Unknown function names stay `unsupported`, and unclosed calls are `malformed`.
- **Stated limits**
  - Added: a one-sided approach written with a plain trailing sign (`x→0+`), and arrow statements (`g → v`, `g → v as x → a+`, `f = g → v`). These are read as `lim f = lim g = v` and judged by the existing E5 limit kernel.
  - Anything outside that kernel stays unsupported.

## Tests

- `bun test packages/learning/src`: **1343 pass / 0 fail**. That is 1325 before, plus 18 in `e7-finalisation.test.ts`; the I6 tests were rewritten for the final lost-solution policy.
- **Intentional test updates:**
  - repair-D expectations in `derivation-e7.test.ts` (invalid → verified + finding);
  - two development-corpus tests (D5 adversarial, D7) now state the natural-log convention their corpora were written under.
- **Type check** of the changed modules under the frontend compiler options: 68 errors before, 68 after, all pre-existing. No new errors.
- **Generated questions:** all 341,483 contracts are unchanged (verification status and credit for the stored answer).
- **Server grader bundle:** rebuilt and manifest-consistent. A differential run of 16,010 requests (2,000 sampled questions × 8 responses, plus the backend test's cases) gives output identical to the baseline bundle.

## Frozen benchmark (2,382 cases, labels untouched)

| Outcome | Baseline 837c79c | Safety d7d59bf | Final |
|---|---|---|---|
| correct | 866 | 921 | **924** |
| false acceptance (math) | 2 | 0 | **0** |
| false acceptance (policy) | 25 | 25 | 25 |
| false rejection | 85 | 24 | **23** |
| misgrade | 68 | 62 | 62 |
| safe abstention | 1329 | 1343 | 1341 |
| regressions vs baseline | — | 1 | **0** |
| latency median / p95 / max (ms) | 0.66 / 8.0 / 68.8 | 0.73 / 6.9 / 39.3 | 0.62 / 6.0 / 34.4 |

Confusion matrices (expected × E7) are in `results/final/compare.vs-baseline.md`.

Of the 25 policy-related false acceptances, 18 (unstated restrictions, unshown candidate checks) are now graded partial under a rubric that requires the evidence, and full under one that does not. The other 7 are wrong rule citations written in natural text ("by the power rule, …"). Natural-text citations are not parsed, so these are unaffected by any rubric.

## Holdouts

**Fresh holdout (71 cases, blind, single run):**

| Feature | Agree | Abstain | Misgrade | False accept | False reject |
|---|---|---|---|---|---|
| F1 lost solutions | 14 | 1 | 0 | 0 | 0 |
| F2 policies | 13 | 0 | 1 | 0 | 0 |
| F3 log | 5 | 9 | 0 | 0 | 0 |
| F4 sec/cbrt | 10 | 4 | 0 | 0 | 0 |
| F5 limits | 13 | 1 | 0 | 0 | 0 |
| **Total** | **55** | **15** | **1** | **0** | **0** |

- **The misgrade** was N-021: in proof mode, dropping a candidate the student had excluded in writing counted as an unshown check. I fixed it after the blind run. The second run, which is not blind, gives 56 agree and 15 abstain.
- **Abstentions:**
  - log equations and log evaluation (9): the solver has no log equations;
  - cbrt equations and cbrt identities (4): cube-root solution sets are not in the checker;
  - one `x < a or x ≥ b` answer form;
  - one `(1 − cos x)/x²` limit.
- **Latency:** median 2.6 ms, p95 12.4 ms.

**Earlier 78-case holdout (already repaired and inspected, so not blind):** 55 agree, 21 abstain, 2 "false accept". The two are H-003 and H-005: those labels expected `sec`/`cbrt` to be unsupported, which the owner decision now reverses. Two cases changed with the new rules:
- H-009 (bare log) now abstains as ambiguous;
- H-030 ("no solution" for an identity) is now correct.

## Integration readiness

- **Dependency:** this branch sits on `feat/math-generalization-core-e7@837c79c`, which is not yet in `feat/unified-grading`. Their merge base is `46ce4b9`.
- **Trial merge into `feat/unified-grading@bb20657`:** four conflicts, all from the E7-core lineage (`837c79c`), not from the safety or finalisation work:
  - `backend/family/learning.py`: E7 core's number regexes against unified's Phase C parser rewrite, which retires the Python comparison;
  - `MATH_CURRICULUM_GRADING_AUDIT_REPORT.md` (add/add);
  - `grader.mjs` / `grader.manifest.json`: generated, so rebuild after resolving.
- **Reconciling `learning.py`** belongs to the unified-grading owner. Unified's strict parser appears to supersede E7 core's regexes, but I did not resolve the conflict, so as not to overwrite that work.
- **Duplicated logic:** none found.
  - Unified's `grading/parse.ts` parses answers, not working.
  - Its decision record already reserves `method: {examined, verified}`, and `processFindings` / `assessWithPolicy` are the natural source for it.
- **Answer-key certification (`901c907`):**
  - It is an independent history whose E7 engine files are byte-identical to `837c79c`.
  - Its certifier is SymPy-based and does not call the E7 engine.
  - The 341,483 generated-question contracts are unchanged, so its results are unaffected.
- **Not run:**
  - Django tests: PyPI is blocked here. The trusted-grader behaviour they test was covered by the 16,010-request bundle differential instead.
  - Frontend build: the npm install failed.

## Remaining limitations and concerns

- Natural-text cited reasons ("by the power rule") are not parsed. 7 benchmark cases remain policy false acceptances whatever the rubric.
- A written candidate check is recognised only as a closed numeric line. Annotated check lines (`x = -1: sqrt(1) ≠ -1`) are not read.
- Bare-log equations, log evaluation, cube-root equations and cube-root identities abstain.
- Policy and convention scope is module state, set synchronously per call (async per call in the unified engine). Concurrent unified assessments with *different* conventions in one process could interleave. The server grader runs synchronous answer-first, so it is unaffected.
- An inline `A ⇔ B` row is expanded into two rows before assessment, so line numbers after the split shift by one.

## Merge readiness

**Requires review.** The work is complete and tested. Two things block it:
- `feat/math-generalization-core-e7` must be integrated into `feat/unified-grading` first;
- the four lineage conflicts (above) must be resolved by their owners.

## Next practical OpenPath milestone

Merge E7 core (with these repairs) into `feat/unified-grading`, then feed `assessWithPolicy` into the unified decision record's `method` field for method-required questions. Run this in **shadow mode** against recorded decisions before anything becomes authoritative.
