# OpenPath — Curriculum-Wide Grading Audit (Phase A)

Branch `feat/unified-grading`, stacked on `feat/math-generalization-core-e7` @ `46ce4b9` (the only branch that has the assessment
contract, `grade.ts`, the trusted Node grader and the Django wrapper; `main` @ `b578c78` has none of them). **No production
grading code was changed.** Nothing is merged or deployed.

Machine-readable results: `tools/mathematics/grading-audit/data/` — `inventory.json` (the 15 facts for each of the 1,080 families),
`question-policies.json` (the policy of every released presentation), `results/summary.json`, `results/per-family.json`,
`results/findings.jsonl.gz` (every non-OK case), `results-grader-off/` (the fallback measurement), `parity.json`, `baseline.json`,
`django-test-results.txt`. Harness and method: `tools/mathematics/grading-audit/README.md`.

## 1. Headline

| | Result |
|---|---|
| Released families / questions (recomputed) | **1,080 / 341,483** typed — identical to the brief; plus 284,170 `:mc` and 230,273 `:w` presentations: **855,926 gradable presentations** |
| Every presentation assigned its current policy | yes — kernel-exact 52,287 · kernel-typed 44,158 · legacy-canonical 743,591 · legacy-sampled 14,939 · **held 951** · educator 0 |
| App ↔ server stored-answer parity | 855,926 compared, **0 mismatches** |
| Families audited with the independent oracle | **1,080 of 1,080**; 18,741 questions; 308,568 graded cases; 0 cases the oracle could not decide |
| False acceptances (wrong or malformed answer credited) | **259 cases, 186 questions, 20 families** — identical on app and server; **195 of them through the kernel readers on verified questions** (D02) |
| False rejections (equal answer marked incorrect) | **6 cases, 4 questions, 1 family** (`amrop`), both routes |
| Equal answer in an unstated form marked incorrect | app 15 · **server 366** (31 families) |
| Stated form not enforced (e.g. "simplest form", "interval notation") | 238 cases, 17 families |
| Ambiguous text credited (`1/2x` read as x/2) | 77 cases, 18 families |
| Invalid input recorded as **incorrect** (should be unresolved) | app 2,785 (217 families) · server 3,103 (241 families) |
| Equal answer left unresolved (safe, missed credit) | app 294 · server 279 |
| App and server give different verdicts on the same submission | **1,884 cases, 1,058 questions, 131 families** |
| Held (quarantined) questions served | **951** `:w` presentations (adexp, aiintx, auaps) |
| Django integration tests | **executed for the first time: 273 run, 266 pass, 4 fail, 3 expected failures** (new defect fixtures) |
| Learning package tests | 1,293 pass, 0 fail (+25 new regression fixtures: 9 controls pass, 16 open defects recorded as `test.failing`) |

These are counts on a **stratified sample** (≤12 typed, ≤4 `:mc`, ≤3 `:w` per family), not a proof over all 855,926
presentations. Outcome classes are never added together.

## 2. What was inspected first

- 47 open PRs. Grading-relevant: #81 (math core, draft), #79/#80 (R1/R2), #78 (engine audit), #72 (TN5 bank), #68/#67 (verified
  teaching). The newest work is on unmerged branches; `feat/math-generalization-core-e7` (2026-10-28 15:35Z) is the head.
- Existing audits, reused and not duplicated: `MATH_COVERAGE_AUDIT_REPORT.md` (kernel *coverage* of 1,080 families, `inv-final.json`),
  `MATH_GENERATOR_CONTRACT_COVERAGE_REPORT.md`, `MATH_TYPED_KERNEL_INTEGRATION_REPORT.md`. None measured grading *reliability*
  against an independent oracle, and none ran Django. This audit does both and reuses their family enumeration (`FAMILIES`, `pool`).
- Baseline recomputed (`baseline.ts`): 1,080 families, 341,483 questions, 94 contract families (39 value, 4 var, 3 set, 48 typed),
  38,028 verified / 303,455 legacy / 0 held typed questions — the brief's figures are current. 1,078 families are used by a module;
  2 families (228 questions) are not referenced by any module.

## 3. Method

**Routes measured, for every candidate answer:**
1. *Client* — `grade.ts decide()` (what the learner sees and what the app records).
2. *Server* — the real Django code path: `_answer_ok` → `_authoritative` → `credited`, with the real integrity-checked Node bundle
   (`grader.mjs`) called in batches through `kernel_grader.run` and accepted only through its own reply check. This is the value
   mastery uses.
3. *Server, grader unavailable* — the same with `OPENPATH_GRADER=off`.

**Independent oracle** (`oracle/`, Python + SymPy 1.14, shares no code with the production readers). From each stored answer it builds
candidates (spacing, ASCII spellings, reorderings, unreduced/decimal/mixed forms, ±1 and sign perturbations, reciprocal, missing or
extra elements, closure flips, transposes, the generator's own predicted misconception answers, malformed text, split digits,
ambiguous juxtaposition, correct answer with wrong working, wrong answer with plausible working). The **label comes from the oracle's
own mathematics**, not from how a candidate was built: exact simplification plus 40-digit evaluation at fixed rational points;
antiderivatives compared by derivative; intervals as real subsets; sets/roots as (multi)sets. Prompt form requirements
(`simplest form`, `interval notation`, `mixed number`, `expand`, …) decide whether an equal answer in another form must be credited.
The oracle's own reader was corrected four times during the audit after its labels were checked against production
disagreements (e.g. `xlogx`, `sec x tan x`, decimals read exactly, mixed numbers inside tuples); 68 hand-derived fixtures
(`oracle/test_oracle.py`) pin it.

**Premise not tested here:** the oracle judges against the *stored* answer. The stored answer itself is independently verified only
for the 38,028 typed questions with a verified generator contract; for the other 303,455 typed questions (and their `:mc`/`:w`
forms) the generator remains the sole authority on the answer key.

**Not covered:** the 221 authored questions in `content/learning` (graded through `decide` with an authored legacy contract) and the
140 program questions graded by `packages/mathematics` `scoreCode` — a separate grading route (§6, D14).

## 4. Measured reliability (sample of 18,741 questions, 308,568 cases)

Oracle truth: equivalent 53,246 · form-variant 33,077 · wrong 112,499 · malformed 109,124 · approximation 545 · ambiguous 77 · unverified 0.

| Outcome | Client cases | Server cases | Server families |
|---|---|---|---|
| OK | 293,229 | 292,859 | — |
| FALSE_ACCEPTANCE | 259 | 259 | 20 |
| FALSE_REJECTION | 6 | 6 | 1 |
| FORM_VIOLATION_ACCEPTED | 238 | 238 | 17 |
| FORM_POLICY_REJECTION (equal, unstated form, marked incorrect) | 15 | 366 | 31 |
| AMBIGUITY_CREDITED | 77 | 77 | 18 |
| INVALID_MARKED_INCORRECT | 2,785 | 3,103 | 241 |
| UNRESOLVED_ON_CORRECT | 294 | 279 | 32 |
| UNRESOLVED_ON_FORM | 11,665 | 11,328 | 1,064 |
| request refused (option text > 80 chars) | — | 53 | 7 |

By route, wrong answers (incl. misconception predictions) were credited 29 times, all of them split-digit or ill-formed radicals
(`√2 2` for √22); every other credit of a non-equal answer was malformed text. **No readable, mathematically different answer
was credited on either route.** 1,059 of 1,080 families had no false acceptance and no false rejection on either route; 715
families (578,341 presentations) had no finding of any class.

## 5. Fallback behaviour (`OPENPATH_GRADER=off`)

With the trusted grader unavailable the server falls back to the Python stored-answer mirror for every question. On the same cases:
false rejections 6 → 6 (no new false rejection), false acceptances 259 → 64 (the kernel readers' leniency disappears), equal answers
unresolved 279 → 105, invalid marked incorrect 3,103 → 3,202, client/server disagreements 1,884 → 3,481. The fallback did not turn
a sampled equal answer into "incorrect", but it is **not certified** for any contract: it is a different policy (canonical
comparison) silently substituted, labelled `legacy`, and it changes 1,597 more verdicts relative to the app.

## 6. Defect register (by root cause)

Severity: **S1** credits an answer that is not correct · **S2** marks a correct answer wrong or disagrees with the app on credit ·
**S3** invalid input treated as a wrong answer, or a missed credit · **P** policy decision needed.
Fixtures: `packages/learning/src/grading-audit-regressions.test.ts` (TS) and `backend/family/test_grading_regressions.py` (server).

| ID | Root cause (layer) | Evidence | Sev | Fixture |
|---|---|---|---|---|
| D01 | **Invalid input is decided as incorrect** instead of unresolved, and the app's and server's readers disagree on what is readable (typed parsing / backend–client consistency). App: letters for a number (1,378 server cases), `1/0` in expressions (855), an option letter that does not exist on a 2–3 option question (772). Server additionally: `_answer_ok` accepts `1/0` in a set and `right()` returns False (318 cases; repeated elements likewise, counted under D07); Python limits numbers to 9 digits / 6 decimals where TS has no limit (848 cases). | 2,785 / 3,103 cases; 1,664 of the 1,884 disagreements | S3 (S2 where the app shows Correct and the server leaves it unresolved: 6) | D01 ×2 TS, ×2 Python |
| D02 | **Kernel answer readers credit malformed text** (typed parsing). `m2Exact`/`radical` in `typed-contract.ts` split on `+`/`−` and silently drop a trailing operator (`177147 +`), and delete every space before reading, so `17714 7` is 177147 and `√2 2` is √22. Families: aksqf, aogp, aogpinf, aogpsum, apn, asdist3, atmag, atval, auaps, root, surd. | 195 cases, 11 families — *on the routes labelled verified* | **S1** | D02 ×2 |
| D03 | **Legacy interval reader accepts brackets closed at ±∞** (`[−∞, 1)`, `(19, ∞]`) (normalisation). | 64 cases, 9 families | S1 | D03 ×2 |
| D04 | **Legacy exact reader rejects `29sqrt(2)`** (a coefficient written against `sqrt(…)`) (normalisation). | 6 cases, `amrop` | S2 | D04 ×2 |
| D05 | Equal answers left unresolved: kernel readers refuse `+5` and `sqrt(22)`; legacy reads neither `oo` for ∞ nor `tan^-1` (normalisation). | 294 / 279 cases | S3 | D05 ×3 |
| D06 | **B1 reader deletes the space of a mixed number** (`40 1/2` → `401/2`) so the server marks an equal answer incorrect on a verified question; the app shows "being double-checked". | 62 server cases, 7 families (akmed, anumean, anwmean, aogpinf, atrvmean, atrvvar, atvar) | S2 | D06, D10 |
| D07 | **Form requirements are not part of any contract** (generator contract). Stated forms are not enforced (238: interval answers accepted as inequalities, `8/2` accepted for "simplest form", `(x − 5)²` for "expand"), while unstated forms are refused (repeated set elements on the server, `6/4` for an improper fraction). | 238 + 366 | P | — |
| D08 | **Ambiguous juxtaposition credited**: `−1/8x` read as −x/8 without asking (parsing policy). | 77 cases, 18 families | P | D08 |
| D09 | **Held questions are served**: the contract guard compares the typed object's numbers with the `:w` prompt ("9 boxes of 1000 pins" has no 9000), marks 951 presentations `held`, and `publishable()` is never called. The app never decides them (a correct answer stays "being checked"); the server credits them by legacy comparison. | 951 presentations; 53 disagreements in sample | S2 | D09 TS + Python |
| D10 | **App and server run different policies on verified questions**: `decide()` passes the stored-answer comparison into `assessSubmission` (falls back to it when the kernel cannot read a numeric-looking answer, and parks kernel/legacy disagreements as pending); `gradeRequest` passes `null`. | 167 disagreements (e.g. `4 21/25`: app Correct, server unresolved) | S2 | D10 ×2 |
| D11 | **Replay recomputes instead of reading the recorded decision**: `evidence.ts` uses `creditOf(qid, response)`; the server's `credited()` re-runs `right()` for every non-kernel record. A grader change silently rewrites past mastery. Recorded assessments carry no contract version, verifier version or bundle hash, and no machine-readable reason. | code inspection | S2 | Phase D |
| D12 | **Fallback is uncertified** (§5): on grader failure the server substitutes the Python mirror for verified contracts. | §5 | S2 | Phase D |
| D13 | **Django tests disagree with the current invalid-input policy**: 3 tests still expect HTTP 400 for unreadable answers (`two`, `fifty`, option `Z`) after `1479472` made them "saved undecided"; 1 test expects grader-off `6/2` to be **incorrect** (it is now unresolved — which is what this brief requires). | 4 failures | P | — |
| D14 | **Parallel grading route**: `packages/mathematics` (`unit.ts`, `chapter.ts`, `foundation/programs.ts`, `fractions-program.ts`) grades its program questions with `scoreCode`, outside `decide()`, with its own verdict semantics. | code inspection | P | — |
| D15 | Server re-implements 17 families' generators in Python (`learning_families._mirror`) for arbitrary parameters; parity is currently exact (0 mismatches). | parity.json | risk | — |

Not defects: option text longer than 80 characters is refused by the server (the app sends letters); equal answers in an unstated
form left unresolved (11k, e.g. `24/2` for 12, option text for a choice) are safe and are reported, not counted as errors.

## 7. Django integration tests

Django could not be installed from PyPI here (blocked). `backend/vendor-deps.sh` now clones the exact pins of
`backend/requirements.txt` from GitHub release tags (Django 5.2.18, asgiref 3.12.1, DRF 3.18.3, sqlparse 0.6.0) and the suite runs on
SQLite. Result (`data/django-test-results.txt`): **273 run, 266 pass, 4 fail (D13), 3 expected failures (new D01/D09 fixtures)**.
`KernelAuthorityTests` ran for the first time: 7 of 8 pass — correct/equivalent/incorrect through the real Node grader, working never
changes credit, forged browser verdicts change nothing, unreadable is undecided, repeated submissions agree, replay uses the server's
kernel verdict; the 8th is D13. `test_kernel_grader`: 10 of 10 pass. **Backend certification is not claimed**: the four failures and
D09–D12 are open.

## 8. Decisions needed before Phase B

1. **Invalid input** (D01, D13): record as `unresolved` with reason `invalid-response` (current app behaviour; tests updated) — or
   refuse the request with 400. Recommended: unresolved.
2. **Stated form requirements** (D07): represent them in the contract; an equal answer in a forbidden form gets no credit with reason
   `required-form` and a form hint — or credit equal values regardless of form. Recommended: enforce only what the prompt states.
3. **Ambiguous text** (D08): ask one clarification (unresolved) instead of crediting `1/2x`. Recommended.
4. **Held questions** (D09): withdraw the 951 `:w` presentations from release until the guard is fixed. Recommended (reversible).

## 9. Readiness

Phase A is complete for the 1,080 generated families: every family inventoried, every released presentation assigned its current
policy, independent reliability measured on all families, defects classified with fixtures. Not certified: nothing in this report
certifies a grading policy. Proposed Phase B (architecture specification, documentation only): one versioned contract carrying form
rules and a capability; one verdict record (`correct | incorrect | unresolved` + reason class: invalid / ambiguous / unsupported /
infrastructure / contract-inconsistency, contract and verifier versions, parsed interpretation); one dispatcher used identically by
`decide()` and `gradeRequest`; replay from recorded decisions; reuse of `assessment.ts`, `typed-contract.ts`, `answer-types.ts` and the
Node grader as adapters.
