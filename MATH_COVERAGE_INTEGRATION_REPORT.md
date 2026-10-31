# OpenPath — Complete Grading Reliability and Prove Reusable Coverage (report)

Branch `feat/math-generalization-core-e7`; code `5665874` (earlier: `1479472`, `f1bd814`, `533ef22`). Nothing merged or deployed.

## 1. Backend verification — NOT verified (blocker)
Django 5.2.18 / DRF 3.18.3 (`backend/requirements.txt`) are not installed anywhere on this machine (no site-packages, no venv, no vendored copy). `uv pip install` fails: `dns error: failed to lookup address information` (the package index does not resolve; `pip download` finds no distribution). One attempt each, no further retries. **The Django grading tests were therefore not run.**
What exists: the endpoint overwrites `answerCorrect`/`unresolved` from the stored answer, saves unreadable answers undecided, and `test_learning.py` has tests for forged correct / forged unresolved / unreadable / right-and-wrong stored verdicts. Only stubbed-import checks of the pure functions (`_answer_ok`, `_authoritative`, `right`) were run, which does not verify the endpoint, mastery replay on the server, or client/server agreement. Run `python manage.py test family.test_learning family.test_answer_types` in an environment with the requirements before relying on it.

## 2. Unit.tsx shared grading
* New leaf module `packages/learning/src/answer-core.ts` (`canonicalInteger`, `unbrace`, `joinParts`) is now the single definition used by `content.ts` (learning questions) and `unit.ts` (authored units): integer rule (`5.0` = 5, `5.5` ≠ 5, `five` unreadable), set braces, ordered vs unordered part lists. The duplicate integer regex and the unit's own sort-and-join are gone.
* `Unit.tsx` integer input no longer strips the decimal point (before, typing `5.0` silently became `50`).
* Unit-specific and kept: the fraction reader (`n/d`, ≤6 digits, matching the server's `RATIONAL`), the `values`/`fields` shape, and scoring through `scoreCode` over `nativeItem.answers`. Unit questions are only integer / choice / fraction / values; none is forced through the algebra kernel. They remain a **legacy stored-answer decision**; the unit records carry no `assessment` label (unlike learning attempts), so they are not labelled "legacy" in the stored evidence. Unreadable input is blocked at the input with guidance, never recorded or marked wrong.
* Tests: `unit-answers.test.ts` (3: integer/decimal equivalence and identical verdicts to the learning comparator, set vs tuple, unreadable ⇒ null); existing `unit.test.ts` 9/9 and `remediation.test.ts` 12/12 pass.
* Not done: interval boundaries in units (no unit question uses intervals); `chapter.ts`, `foundation/programs.ts`, `fractions-program.ts` have their own normalisers (not reviewed here).

## 3. content-system timeout — root cause
Not a loop and not a regression. `every family specification validates` runs `validateFamily` (full pool, ≥400 property cases, boundary cases, bug-prediction checks) plus `familySpec` twice for **each of the 1,080 families**. Measured in bun on a 27-family sample: 1,128 ms `validateFamily` + 419 ms `familySpec` per family ⇒ ≈ 20 min for the test in bun alone; slower under tsx/node. The same cost on the commit before the stabilisation (`b25e02f`: 20.3 min projected, identical). The other nine tests in the file each pass in 1–16 s (≈42 s total, run one by one). My earlier "all but the 1,080-family test" run timed out only because the name pattern did not exclude that test. No defect to fix; the fix, if wanted, is sharding or sampling that one test (not done: it changes what a test proves). A single bounded run of that test with a 3,300 s cap passed (§7).

## 4. Selected invariant and why
**Invariant: the exact value of the closed numeric expression the prompt shows** (`closed-arithmetic.ts`). Evaluated by the existing exact checker (answer-first `value` path); one generic rule reads the student-visible prompt; no per-family grading code, no new parser/CAS. Independence is real: the statement comes from the prompt text, the expected answer from the generator.
Why this one: I tried the single rule on all 1,080 families (60 questions each, `data/closed-arith-candidates.json`): 27 families have closed-expression prompts, 26 reproduce 100% of extracted questions with 0 disagreements. The other candidate groups in the audit (equation sets, prob/stat, linear algebra, trig, coordinate) need a typed problem built per task from each family's parameters (a family-specific adapter), i.e. exactly the per-family work this task excludes. Honest limit: in absolute question count this is not the largest group (23.8% word-problem and 10.5% geometry are larger) — it is the largest group servable by one existing kernel with zero per-family code.

## 5. Cross-family evidence (real entry point: `decide` → `assessSubmission` → `assessAnswerFirst`)
25 mapped families (not the six already integrated): fraction addition (`fadd`), two-digit multiplication (`mmul`), exact division (`ldiv`), column addition/subtraction (`addr`, `acsub2/3/n`, `adcol3/x`, `aeaddn`, `aeadd3`), multiples of 10/100 (`aep10`, `aemult`, `aediv0`), decimals (`agdec`, `aidmul`, `aiddiv`, `aidp10`), order of operations (`agbod`), integers (`aiint`, `aiintx`, `ajimul`, `ajidiv`), zero/one rules (`aazero`, `aamul01`). Whole-pool contract validation: **10,891 questions → 10,530 verified, 361 keep the legacy comparison, 0 held** (`closed-arithmetic.test.ts`). Answer-variant matrix on a sample of 1,000 questions (969 verified; `data/closed-arith-proof.json`):

| Test | Result |
|---|---|
| Correct stored answer credited by the kernel | 969 / 969 |
| Equivalent forms (space, `+n`, `n.0`, `n.00`, unreduced `2p/2q`, trailing-zero decimal) | 2,884 / 2,884 |
| Incorrect answers (±1, ±10, negation) rejected | 3,851 / 3,851 |
| Boundary (`-0` for 0, sign flip) | 969 / 969 |
| Unreadable (`abc`, `1/0`, `2/`, `1..2`, `one`) left undecided, never wrong | 4,845 / 4,845 |
| False acceptances / false rejections | 0 / 0 |
| Latency (decision, in process) | p50 0.045 ms, p95 0.20 ms, p99 1.6 ms |

Failure layers found while building it (all fixed before this report): my test generator's decimal formatter (harness bug); the legacy comparator reading `abc` as an expression (kernel-unreadable answers now fall back to legacy only when the text is numeric). Variants were generated mechanically from the stored answer; this is a diagnostic, not a blind holdout, and says nothing about forms not generated here.

## 6. Integrated coverage
| | Families | Released questions with the exact kernel |
|---|---|---|
| Before | 6 | 3,735 (1.1% of 341,483) |
| After | 31 | 14,265 (4.2%) |
Newly integrated: 25 families, 10,891 released questions, of which 10,530 are verified and 361 remain legacy. Demonstrated, not extrapolated: the remaining ~1,049 families are unchanged (legacy or held to the audit's "candidate" estimates).

## 7. Regression (pass / fail / timeout / not run)
* Learning package (bun): **1,292 pass, 0 fail** (79 files; new: closed-arithmetic 5, unit-answers 3).
* E7 gate: scan errors 0; injection falseVerified 0; battery 38 cases, 1 mismatch (`alg-side`, unchanged since stage2); holdout diagnostics 0 false acceptances (identical to stage5). Six previously integrated families (`assessment-eval`): false acceptance 0 / 10,971, false rejection 0 / 4,539, unchanged.
* Frontend: pass — `unit` 9, `remediation` 12, `mathematics` 26, `engine` 20, `dashboard` 12, `mapping` 6, `topic-session` 3, `study-time` 8. Earlier in the stabilisation run: 47/49 files pass; `mathematics-completion` passes (8/8) with a 1,800 s cap. `content-system`: nine of ten tests pass individually (≈42 s); the 1,080-family test **passes** (1 pass, 0 fail) when given a 3,300 s cap, so `content-system` is fully passing (10/10); it just needs a cap well above 30 minutes under tsx.
* Browser bundle (esbuild of `src/year/Main.tsx`): builds, no `node:crypto`.
* Django integration tests: **NOT RUN** (§1).

## 8. Remaining risks
* Server not verified under Django (§1). Server correctness is the stored-answer comparison, not the TypeScript kernel.
* The closed-arithmetic rule only reads prompts of the form "[lead-in] expression [= ?]"; unmapped families are never routed to it. A new mapped family must pass the whole-pool test first.
* 361 questions of mapped families keep legacy grading (prompts with extra wording).
* Unit pathway is a legacy decision without evidence labels; other mathematics programs have separate normalisers.
* Evidence is synthetic and generated by the same team; not a production error rate.
