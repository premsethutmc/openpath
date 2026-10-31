# Typed-Kernel Integration and Authoritative Grading — Report

Branch `feat/math-generalization-core-e7`, baseline `b405739`. Reference: `MATH_GENERATOR_CONTRACT_COVERAGE_REPORT.md`.
Machine-readable per-family data: `tools/mathematics/coverage-audit/data/typed-kernel-coverage.json` (478 rows: 432 candidates + 46 baseline contract families, every required column). Nothing is merged or deployed.

## Headline (three separate numbers, never added together)

| | Questions | Share of 341,483 | Meaning |
|---|---|---|---|
| **A** kernel-verified (answer-first engine) | 38,028 | 11.1 % (was 20,311 = 5.95 %) | contract validated, stored answer judged by a kernel, wrong candidates rejected, all proof checks passed |
| **B** server-authoritative, code-enforced | 38,028 | 11.1 % | Django calls the trusted Node grader for exactly these; **Django endpoint tests could not be executed** (see §10), so end-to-end Django verification = **0** |
| **C** legacy (stored-answer comparison) | 303,455 | 88.9 % | unchanged; labelled `legacy` on the server |

Families with a contract: 46 → 94 (+48 typed). Held (unpublishable) questions: 0 of 40,030 released in contract families.

## 1. Candidate-pool inventory

The pool measured 432 families / 130,921 released questions (the brief's "~119k" was an estimate). Classification used route, answer type, figure presence and the generator's own parameter comment, never family names or prompt strings. Non-integrated rows are classified by structure and were **not** individually executed.

| Class | Families | Released | Verified |
|---|---|---|---|
| Compatible through one reusable adapter (integrated) | 48 | 19,568 | 17,717 |
| Requires bounded existing-type extension | 23 | 5,523 | 0 |
| Unsupported by current verifier | 284 | 86,603 | 0 |
| Ambiguous / insufficiently structured | 77 | 19,227 | 0 |

Total 432 families / 130,921 questions. The 46 baseline "compatible now" families (20,462 released, 20,311 verified) were already integrated and are outside this pool.

By route (families / released / verified): calculus 80 / 21,776 / 0; geometry 136 / 35,788 / 0; linear algebra 60 / 24,708 / 8,098; probability-statistics-combinatorics 67 / 21,031 / 4,622; trig-exp-log-sequence-radical 77 / 24,449 / 4,466; complex 12 / 3,169 / 531.

Reasons (per row in the JSON):
- **Unsupported**: no kernel task computes the quantity (composite results such as linear combinations, torque, section formula, transformation chains, grouped-frequency and mean-deviation statistics, rearranged exp/log equations, inverse-trig composites, sums of polynomial series, recurrences, telescoping series, etc.) — adding one needs a new solver, a stop condition. Calculus non-expression answers (integrals, limits, ODEs, intervals): the kernel checks derivation lines, has no final-answer claim.
- **Ambiguous**: geometry families whose givens live in a figure, not a typed object.
- **Bounded extension**: calculus families with expression answers (needs lossless function text and derivative-notation lines that generators do not supply; not attempted).
- Word-problem setup families (event/count defined only in prose) were deliberately left on legacy: a kernel would verify only the arithmetic, not the model.

## 2. Existing typed-kernel capability matrix

| Kernel | Exists in code | Reached via answer-first entry point | Used here |
|---|---|---|---|
| Closed arithmetic / value / var / set | yes | yes (baseline 46 families) | unchanged |
| Linear algebra (vector, matrix, determinant, systems) | yes, sync | **now yes** (adapter) | 19 families |
| Complex arithmetic | yes, sync | now yes | 2 |
| B1 probability / statistics / combinatorics | yes, sync | now yes | 18 |
| M2 trig value, AP/GP, radicals, exp/log equations | yes, sync | now yes | 9 |
| M1 inequality / quadratic / function | yes | not probed | 0 |
| Calculus Expr AST | yes (steps) | no final-answer claim | 0 |
| Geometry | yes, async python worker | no | 0 |
| Unified engine | yes, async | no | 0 |

## 3. Reusable adapter

One path: a generator supplies `contract: { kind: "typed", typed(params) → TypedObject, assumptions?, numbers? }` (`family-kit.ts`). `typed-contract.ts` holds four capabilities (linear-algebra, complex, probability-statistics, M2) behind one interface: `candidates(problem, text)` reads the student's text into the kernel's own value kinds (rationals, decimals, tuples, matrices, simple radicals, exact `a+b√m`, solution lists) and `check` runs the kernel step with rule `direct`. `judgeTyped` returns `unread | verified | rejected | unsupported`; unread/unsupported are **unresolved, never wrong**. No prompt parsing, no per-family grader, no new solver or parser.

Validation before a question is usable (`assessment.ts → typedContract`): (1) value-based guard that every rational in the object appears in prompt+figure (a per-contract `numbers` list covers derived values such as AP differences); (2) the stored answer must be verified by the kernel; (3) known wrong answers and options must not be credited; otherwise the question is legacy (kernel cannot judge) or held (genuine disagreement). On credit, `normalised = expected.stored`, so replay and the server's stored-answer comparison agree. Typed kernels give no step diagnosis: working never changes credit, and `methodExamined` stays false. No AI fallback for typed contracts.

## 4. Integrated and excluded

Integrated (48): linear algebra det2, audt3, apmmul, apinv2, auinv, apgj3, aprank, apsys2, apsys3, alsys, al3sys, alsysw, apsysw, apmcost, apmmod, atcross, atmag, asdist3, atang; complex ascop, ascinv; probability-statistics aoncr, aonpr, aofact, akmed, akmode, mean4, anunion, atrvmean, atrvvar, atsd, atvar, anumean, anwmean, avcond, atindu, ancomp, asbern, avfmed; M2 apn, auaps, aogp, aogpsum, aogpinf, surd, root, atval, aksqf.

Partially integrated (cases the kernel cannot judge stay legacy, never wrong): atang 23/400 verified (only rational-cosine cases), atval 201/400, aksqf 95/176, avcond 171/513, atindu 81/324, ancomp 126/300, audt3 299/400, aofact 44/100, asbern 291/300, ascop 202/400, ascinv 329/400. 2,002 questions in contract families are legacy (1,582 of them in the typed families).
Excluded: the other 384 candidate families, reasons in §1 and per row.

## 5. Question-level coverage before / after

Contract-verified: 46 families, 20,311 questions (5.95 %) → 94 families, 38,028 questions (11.1 %). Typed adds 17,717 verified questions across 48 families (19,568 released). Parity: all 38,028 TS stored answers equal the Django-side stored table (0 mismatches).

## 6. Client-verified vs server-authoritative

Architecture: the TS verification package is reused unchanged, not ported. `server-grader.ts` is bundled by esbuild into `backend/family/grader/grader.mjs` (+ sha256 manifest of the bundle and its 51 source inputs). `backend/family/kernel_grader.py` (stdlib only) runs it with Node (no shell, minimal env, 8 s timeout, validated question id, bundle integrity check, expected-answer parity against Django's stored answer, strict reply validation). `learning._authoritative` now uses the kernel verdict when available (source `kernel`), creating the assessment even if the client omitted it; otherwise it compares the stored answer and labels the result `legacy` regardless of any client claim. Client flags (`answerCorrect`, `unresolved`, `source`) are ignored. The server obtains the contract from its own question id; the student sends only response and working. `credited()` feeds mastery and replay; unresolved never reduces mastery. If Node, the bundle or the manifest is missing, tampered with, or `OPENPATH_GRADER=off`, grading falls back to the legacy route, labelled `legacy` (never silently exact).

Status: B is **implemented and unit-tested at the Node and Python-wrapper level, not Django-executed**. Per the brief, these families are therefore reported as "server-authoritative: implemented, endpoint tests not run", and the 38,028 should not be read as end-to-end Django-verified.

## 7. Real generated-question test evidence

- Typed proof (`typed-proof.ts`, real generated questions through `decide()`): 48 families, 1,888 questions, 34,522 checks, **0 false acceptances, 0 false rejections**. correct 1,888/1,888 credited; equivalent forms 10,864/10,864 credited (spacing, minus sign, comma form, `.0`, unreduced, decimal, `√54` for `3√6`); wrong (one number +1) 2,673/2,673 not credited; boundary (sign flip, swap, duplicate) 4,168 all safe; working (correct answer with wrong working credited, wrong answer with locally valid working denied) 3,601/3,601; unreadable 11,328/11,328 unresolved.
- Value/var/set proof (`contract-proof.ts`, baseline families): 46 families, 1,813 questions, 0 FA, 0 FR.
- Variants are derived from the stored-answer token structure, not the prompt. Choice (`:mc`) variants run through the same contract construction (pool-wide no-held test) but were not part of the answer-variant proof.
- Python wrapper tests (`family.test_kernel_grader`, 10 tests, real Node): correct, equivalent, wrong, unreadable, garbage ids, tampered bundle, disabled, missing, parity mismatch.

## 8. Grading errors and unresolved cases

- Unexplained wrong verdicts: **0**.
- Unresolved by design: unreadable/unsupported forms (11,328 unreadable probes all unresolved), plus the 2,002 legacy questions above.
- Legacy mirror vs kernel: the Python legacy comparison already accepted all pure format variants (0 differences in 4,554 format-variant rows) but rejects some mathematically equal forms the kernel accepts (≈420 of 25,884 typed rows, e.g. `6/2` for integer 3, `x = a or x = b` for sets). Legacy credited a response the kernel did not: 0. So the kernel route adds enforcement only through the server grader path.
- E7 gate residue is pre-existing and unchanged: 6 reference-not-verified rows (e5/e6/h1 corpora) and 1 battery mismatch (`alg-side`).

## 9. Performance

| Metric | Value |
|---|---|
| Grading latency (in-process `decide`, 7,935 timed calls) | p50 0.11 ms, p95 0.82 ms, p99 1.97 ms |
| Worst compatible family | `alsys`, max 12.96 ms |
| Contract construction (40,030 questions) | p50 0.14 ms, p95 0.86 ms |
| Server grader call (Node subprocess per request) | ≈460 ms (process start + family load) — acceptable for submit, not for bulk; a long-lived worker would remove it and is not built |

No family has unacceptable in-process latency.

## 10. Regression and environment blockers

- `bun test packages/learning`: **1,293 pass, 0 fail** (updated counts: 94 contract families, >38,000 verified, <2,100 legacy; new typed-contract, `gradeRequest` and manifest-freshness tests; one legacy-route test swapped from `root`, now typed, to `atlin`).
- E7 gate: 678 cases, exact 236, **0 false acceptances**, 212 false rejections (unchanged from before this task), verified 86; rows 1,725, injection falseVerified 0.
- Frontend (run from `frontend/`, node+tsx): dashboard 12, engine 20, mapping 6, canonical 12, mathematics 26, study-time 8, topic-session 3, grade7-board 1 — all pass, 0 fail. **Not completed:** `generalisation.test.ts` (stopped after several minutes) and `mathematics-completion.test.ts` (100 s timeout) are content-system-scale suites and were not rerun to completion; no result is claimed for them. Browser bundle (`esbuild frontend/src/year/Main.tsx`): builds, 0 `node:*` imports.
- **Django integration tests: not executed.** Django is not installed and the package index is unreachable; not retried. `KernelAuthorityTests` (correct, equivalent, incorrect, forged correctness, forged unresolved, unreadable, repeated submissions, mastery replay, missing/tampered grader, legacy labelling) is written and compiles but has **never run**. A stubbed-module exercise of `_authoritative` was a logic sanity check only and is not counted as an integration test.
- The 30-minute content-system suite was not rerun.
- Skipped: M1, calculus, geometry and unified engine integration (see §1).

## 11. Remaining curriculum coverage by mathematical capability

| Capability | Verified now | Remaining |
|---|---|---|
| Closed arithmetic, set/var answers | 20,311 | 151 legacy cases |
| Linear algebra (vectors, matrices, systems) | 8,098 of 24,708 | composite and geometric 3-D line/plane tasks lack a kernel task |
| Probability / statistics / combinatorics | 4,622 of 21,031 | setup-dependent word problems, grouped data, distributions beyond kernel tasks |
| Trig / sequences / radicals / exp-log | 4,466 of 24,449 | composite trig, recurrences, series sums, rearranged exp/log |
| Complex | 531 of 3,169 | roots with radicals, modulus/argument, loci |
| Calculus | 0 of 21,776 | needs a final-answer claim route |
| Geometry / measure | 0 of 35,788 | async worker, figure-dependent |

Readiness: ready for review. Not ready to market B as end-to-end: run `python manage.py test family.test_learning family.test_answer_types` in an environment with Django before relying on the server-authoritative label.
