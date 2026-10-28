# OpenPath — Assessment Contract, Explicit Answers and Controlled Fallback

Baseline `4979fe3`. Nothing merged or deployed. No provider is wired in and no network call exists.

## 1. Existing integration points (Gate 1, read from the code)

| Stage | What exists | Where |
|---|---|---|
| Generation | 1,080 deterministic families (341,483 released questions) `gen:<family>:<params>[:mc]`; Python mirror with a parity file | `packages/learning/src/families.ts`, `backend/family/learning_families.py` |
| Expected answer / solution | `Problem{answer, steps, bugs, options}`; each family self-checks by substitution (`validate`) | `family-kit.ts` |
| Input | Answer box (`AnswerInput`, **already separate**) plus optional working textarea (≤8 lines) | `frontend/src/year/Learn.tsx` `Ask` |
| Submission | `ctx.answer → make.attempt → POST /pupils/<id>/events/` (`learning_record`, `record:"attempt"`, `response`, `working`) | `session.ts`, `Main.tsx`, `backend/family/views.py`, `learning.py` |
| Grading | **Client** `isCorrect` (string/number canonicalisation of the stored answer); working checked advisorily for `quad` + numeric families; written work by educators | `content.ts`, `answer-types.ts`, `working.ts` |
| Mastery | Derived by replaying records (`readRecords → ledgerFor / skillEvidence`), recomputing correctness from `response` | `records.ts`, `evidence.ts` |

Findings that drove the design:

* The exact checker and answer-first module were **not connected to any student path**. Grading was the generator's own answer compared as a string, so a generated answer *was* authoritative.
* The explicit final-answer field **already existed** (`response`). Gate 3 therefore needed no new UI field; it needed the verifier to use `response` as the final answer instead of inferring it from working.
* There was no persisted grading result; correctness was always recomputed from `response`.
* A second, separate question UI exists (`frontend/src/mathematics/unit/Unit.tsx`, authored `UnitQuestion`s). It is **not** changed (see limitations).

## 2. What was built

| Deliverable | Implementation |
|---|---|
| Question contract (Gate 2) | `packages/learning/src/assessment.ts` `contractFor(id)`: id, prompt, independent `statement`, expected answer, answer type, variable, assumptions, mode (answer-only / method-required), capability, reference steps + evidence, `verification` ∈ verified / legacy / held / human. Built from the existing `Problem`; no schema rewrite. |
| Independent validation | The exact checker must reproduce the stored answer from the statement, the statement's numbers must appear in the shown prompt, and **no known wrong answer** (mal-rule predictions, other choices, one root of two) may be credited. Otherwise `held`: `publishable()` is false and grading refuses to decide. |
| Explicit answer (Gate 3) | `assessAnswerFirst(..., {finalAnswer})` appends the answer-field value as the final line; working is optional and never needed. Answer text is read as plain numbers only (`answerText`), anything else is not guessed. Old submissions are unchanged (same `response` field). |
| Pathway integration (Gate 4) | `session.ts` `decide()` is the single decision; `make.attempt` always calls it, so every record carries the result and no route can skip it (a test scans the source tree for other builders). `Learn.tsx` `Ask` calls it for feedback. |
| Clarification (Gate 5) | One targeted request (`answer-field` or `interpretation`), then `pending` and fallback-eligible. An incorrect answer with no working gets an *optional* "show one step" offer. |
| Evidence (Gate 7) | `attempt.assessment` (`assessment@1`): `answerCorrect`, `methodExamined`, `derivationVerified`, `firstError`, `clarificationRequired`, `aiFallbackUsed`, `unresolved`, `source`. Server allow-list and validator in `backend/family/learning.py`. |
| Fallback design (Gate 6) | `assessment-fallback.ts`: provider config (`OPENPATH_FALLBACK_*`, same `OPENPATH_LLM_*` names as `backend/evaluation/llm.py`), request/learner/spend/token budgets, `planFallback`, `settle`, `createProvider` (throws for any real provider). Default disabled. |

Behaviour:

* **Correct** answer → credit; working is not read; `methodExamined=false`, `derivationVerified=false` ("Your working was not checked").
* **Incorrect** → credit false only when the exact checker establishes it. With working: first invalid transition (the exact diagnosis from the previous task). Without: optional step offer.
* **Unreadable / unsupported / checker and stored answer disagree** → `credit = null`, "saved, not marked", never wrong.
* Answers that are right but written in a form the old comparison cannot read (`x = 2, x = 3`, `4.0`) are decided on their plain form and **recorded in that plain form**, so the replay and the server agree (these were previously marked wrong).
* Mastery: undecided submissions are not attempts (`readRecords.unresolved`): no credit either way, no attempt number consumed. At most `UNRESOLVED_CAP = 2` per problem sit outside, so wrong answers cannot be parked as "unresolved"; the server mirrors the cap in its retention gate. The adaptive model itself is unchanged.
* AI: a proposal can never change `credit`. A reading of the student's text becomes a one-line confirmation for the student ("Did you mean 2 and 3?"), and the confirmed answer is graded by the kernel. Explanations are usable only for an error the kernel already confirmed; other claims are discarded.

## 3. Evidence (`tools/mathematics/generalization-e7/repair/assessment-eval.ts`)

Ground truth is computed independently from the **prompt text** by regex + brute force (zero mismatches with the generator over 743 questions). 16,996 typed submissions over the six families, **diagnostic, written by the same team as the checker, not a blind holdout**. Metrics are kept separate:

| Measure | Result |
|---|---|
| 1. False acceptance of incorrect answers | 0 / 10,971 |
| 2. False rejection of correct answers | 0 / 4,539 (alternative forms: order, `and`/`or`, braces, `x=`, `4.0`, unicode minus, trailing `.`) |
| 3. Automatic grading coverage | **within the six kernel families only (1.1% of released questions)**: 100% of well-formed submissions (15,510); 91.3% of all submissions (the rest are the deliberately ambiguous ones) |
| 4. Unresolved rate | 0% on well-formed input; ambiguous input (`four`, `4 or 5`, `about 2 and 3`, `x = ?`) left ungraded 1,486 / 1,486, graded wrongly 0 |
| 5. First-error localisation | 547 / 547 (wrong first step followed by locally valid steps; sign error after a correct factorisation). Constructed cases, so an easy ceiling |
| 6. Latency (decision, in process) | kernel path p50 0.09 ms, p95 0.69 ms, p99 1.5 ms; stored-answer path p50 0.03 ms |
| 7. Fallback usage | 163 / 163 doubly-unreadable cases become fallback-eligible after one clarification; request ≈ 228 input tokens (see §4) |

Other checks: right answer after incorrect working → credited 220/220 with the working never analysed; wrong answer without working → step offer 5,212/5,212; unreadable then clarified → decided 163/163; doubly unreadable → pending, never wrong 163/163; entire released pools of the six families (3,735 questions, MC variants included) validate as `verified`; deliberately corrupted generators (wrong answer, incomplete set, statement ≠ prompt, a distractor that is also correct) are all `held`.

Coverage honesty: the independent kernel covers **6 of 1,080 families** (`mul`, `pow`, `lin`, `quad`, `meet`, `linev`), i.e. **3,735 of 341,483 released generated questions (1.1%)**. Every other family (spot-checked: 477 questions in 24 of them) and all authored questions are `legacy`: the stored answer is still the only authority, exactly as before, and they are labelled as such in the evidence (`source: "legacy"`), never as verified.

## 4. Fallback cost at 100,000 monthly active students

No provider is chosen or called. Prices are **placeholders for the operator to replace** with the chosen provider's current list price; the model is `requests × (≈230 input tokens × price_in + ≈150 output tokens × price_out)`, with a hard cap of 250 output tokens.

Fallback only fires for submissions still undecided *after* the one clarification, so the rate is the share of all answered questions in that state (unknown until real data; scenarios shown). At 150 answered typed questions per student per month (15M/month):

| Share reaching fallback | Requests / month | $0.25/$1.25 per MTok | $1/$5 | $3/$15 |
|---|---|---|---|---|
| 0.2% | 30,000 | $7 | $29 | $88 |
| 1% | 150,000 | $37 | $147 | $441 |
| 3% | 450,000 | $110 | $441 | $1,323 |
| 5% | 750,000 | $184 | $735 | $2,205 |

At 60 / 300 answered per student the figures scale by 0.4× / 2×. The budget (`maxRequestsPerMonth`, per-learner daily limit, `maxSpendPerMonthUsd`) makes the worst case a configured number, not an outcome; beyond it, submissions stay *pending* (not wrong). Today only the 6 kernel families (1.1% of released questions) can reach the fallback at all, so the real figure is far lower until coverage grows; the table is the ceiling for a fully covered curriculum.

## 5. Regression

See the final section of the commit message and summary: learning tests 1265 pass / 0 fail (25 new); E7 gate (scan, injection, battery, holdout diagnostics) results below.

## 6. Limitations / unresolved

1. **98.9% of released generated questions (1,074 of 1,080 families) and all authored questions have no independent check**: their answer is still the generator/author's. The contract reports this; it does not fix it.
2. `frontend/src/mathematics/unit/Unit.tsx` (a separate authored-unit UI with its own `Ask`) is untouched, and `StudySession.tsx` still calls `isCorrect` to decide when to finish an item. Records from the year pathway are always built by `make.attempt` and carry the evidence, so mastery is protected, but those screens do not yet show "saved, not marked".
3. The server cannot re-run the TypeScript kernel. It validates the evidence's shape and refuses overstatement (claiming correct for a wrong stored answer, AI/derivation claims), but cannot catch a client that labels a wrong answer `unresolved`; the cap of 2 per problem bounds that.
4. The Python validator and its new Django test could not be run here (Django is not installable in this environment); the validator logic was exercised in isolation only.
5. The frontend could not be built here (no `node_modules`); `Learn.tsx` changes are type-checked indirectly only through the package modules and covered by the pure-logic tests, not rendered.
6. Evaluation is synthetic and in-house: it supports "no false acceptance/rejection observed on these generated forms", not a production error rate. Real typed input will contain forms not generated here; those land in *unresolved*, by design.
7. `derivationVerified` is always false: method-required / proof-required questions still need their separate verification, which no current family uses.
8. Fallback has no provider adapter; its quality (and the real unresolved-after-clarification rate) is unmeasured.

Readiness: the contract, explicit-answer decision, clarification state machine and evidence storage are ready for review for the six kernel families (1.1% of the pool); extending `STATEMENTS` family by family is the main remaining work. Not ready: broad coverage, any live AI use.
