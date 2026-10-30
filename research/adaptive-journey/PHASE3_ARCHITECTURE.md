# Phase 3: unified evidence and reasoning integration

**Branch:** `feat/adaptive-journey-slice`, from `2a33767`. Nothing is merged or deployed.
**Scope:** the learner-facing mathematics path. "PROD" means reachable by static and dynamic imports from the app's entry points (`frontend/src/year/{Main,Learn,TopicSession,StudySession}.tsx`, `topic-session.ts`) or from the server grader bundle (64 TS inputs, `grader.manifest.json`). Reachability was found by following imports, not inferred from file names.

## 1. Current architecture and active execution paths

**Code-level dependency and evidence-flow map** (production only; ▸ = data passed on, ✗ = data dropped):

```
Learn.tsx Ask ──make.attempt (session.ts)──▶ grade.ts decide ──▶ grading/decision.ts grade()          [grading-policy@1]
                                                   │   kernel: math-kernel, proof-kernel, independent-checker (answer-first),
                                                   │   typed-contract, grading/verify; quarantine → unresolved.quarantined
                                                   ▼
         attempt RECORD { response, credit/decision (server), assessment@1 {source, methodExamined, firstError}, working[] }
                                                   │ readRecords (records.ts)
                                                   ▼ ▸ credit, n, activity, context, working   ✗ assessment (BEFORE this phase)
   ┌──────────────── LearnerRecords.attempts ─────────────────────────────────────────────────────────────────────┐
   │ evidence.ts skillEvidence  per competency: independent/assisted counts, status@2, retention  ▸ status          │
   │ diagnostic.ts diagnose     diagnostic@1, per module, misconception-tagged diagnostics        ▸ Diagnosis       │
   │ reasoning.ts reason        diagnostic@2, per wrong answer + follow-ups (bug predictions)      ▸ Reasoning       │
   │ working.ts checkWorking    6 families, display-only (Learn.tsx feedback)                      ✗ never recorded  │
   └────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
   entry paths:  topicCheck (topic-session.ts) ─ diagnose → recovery() → reason → support diagnose
                 Module / moduleState (intervention.ts) ─ diagnose → planRule (english-core) → strategy blocks
                 Recovery (Learn.tsx, "stuck" originals only) ─ recovery() → reason → walkSupports
                 nextActivity (plan.ts) ─ status only (BEFORE) ; topicPlan = support + nextActivity loop
```

**Present only off the production path** (tests, tools, `index.ts`, or the test-only journey harness):
- **E7 assessment and proof:** `unified-math-engine.ts`, `assessment-policy.ts` (process policy), `grading/process-shadow.ts`.
- **Claims and certification:** `claim-ledger.ts`, `claim-certifier.ts`, `claim-binding.ts`, `claim-grounding.ts`, `evidence-provenance.ts`, `certification-authority.ts`.
- **Obligations and proof state:** `proof-obligations.ts`, `mathematical-obligations.ts`, `proof-integrity.ts`, `proof-context.ts`.
- **Canonical form and working:** `canonical-math-ir.ts`, `symbolic-equivalence.ts`, `core/derivation.ts`, `core/working-assessment.ts`.

**E7 is not available in production.** Its only output in the active path is nothing.

**The decision's method fields are not used downstream:**
- `GradingDecision.method` / `.diagnosis` are set from `assessment@1`. `method.verified` is effectively always false: `assessment.ts` never sets it, and the backend rejects `derivationVerified: true`.
- No module in records, evidence, diagnostic, reasoning, intervention or plan reads them.
- The UI reads `firstError` only to display it.

## 2. Existing components that can be reused

| Need | Existing contract (reused) | Status |
|---|---|---|
| Mathematical certainty about an answer | `grading-decision@1` + `assessment@1` (`AttemptAssessment`: `source` provenance, `methodExamined`, `firstError{transition,kind,…}`) | PROD; now carried to `Attempt.assessment` |
| Learner hypothesis reading | diagnostic@2 `reason()` (two matching answers, `need_more`/`uncertain`, competing explanations, support) | PROD; reused unchanged |
| Hypothesis → prerequisite | `Bug.competency` and `nextFromReasoning` (support/teach/practise/unsure); `graph.walkSupports` | PROD; reused |
| Misconception lifecycle vocabulary | english-core `MisconceptionRecord` (state, errors, recurrences, history) | PROD, but built per call inside `ruleStateFor` only |
| Teaching blocks and effectiveness | english-core `InterventionSummary` (`during` / `independentAfter`) via `planRule` | PROD; reused for `teaching-history@1.effective` |
| Claim with outcome, obligations, provenance | E7 `LedgerClaim` (`proven/disproven/unresolved/unsupported`), `ProofObligation`, `Provenance` | **not PROD**; vocabulary mirrored, not imported |

There was no existing contract for a learner hypothesis that outlives one call. The nearest, `MisconceptionRecord`, is rebuilt from module diagnostics and seen only by the planner. The claim ledger is mathematical: its claims are proven or disproven. A learner hypothesis can only be supported or contradicted, so reusing the ledger for it would merge mathematical proof with learner confidence. `learner-hypothesis@1` is therefore a thin contract over the existing `Reasoning` and records. It mirrors the ledger's fields (outcome, obligations, provenance) but carries none of the ledger's proof semantics.

## 3. Information-loss boundaries (before this phase)

What happens to each conclusion the engine reaches:

| # | Boundary | Enters | Can establish | Evidence | Cannot establish | Passed on | Lost | Downstream can contradict / discard silently? |
|---|---|---|---|---|---|---|---|---|
| L1 | `grade()` → record | response, working, question contract | answer correct/incorrect/unresolved (mathematically certain within its contract); first invalid transition (answer-first, algebra kernel) | kernel equality / certificate replay | why the learner erred | verdict, credit, assessment@1 | — | No (credit is authoritative) |
| L2 | record → `readRecords` | record incl. assessment@1 | — | — | — | credit, n, activity, context, working | **assessment@1 (source, methodExamined, firstError)** | Yes: verified first-error evidence vanished silently. **Fixed (evidence@1 pass-through)** |
| L3 | `checkWorking` → UI | working lines | line validity for 6 families | value substitution | anything for 1,074 other families | shown text | everything (not recorded) | n/a (never enters) |
| L4 | `reason()` (topic check) → module | first answer + follow-ups | an established misconception (≥ 2 matching) or unsure | bug predictions | the cause beyond the modelled bugs | `Reasoning`, only to topicCheck/recovery | **the finding: the module re-diagnosed with diagnostic@1, and status "shown" bypassed teaching** | Yes, silently. Fixed in `2a33767` (module only), **generalised now** |
| L5 | hypothesis → planner (`nextActivity`) | per-skill status | — | — | — | next skill | **any hypothesis**: planner read status only | Yes. **Fixed** |
| L6 | hypothesis about skill S, seen in skill T → S's module | — | — | — | — | — | **S never saw it** (scope = the observing module only) | Yes (D4). **Fixed** (scope `about`) |
| L7 | recovery's `established` → support module | Established | kind | — | — | kind mapped prerequisite → recall | the explanation id and evidence | No, but lossy. Now the same mapping for every path |
| L8 | teach selection | strategy checks answered (any activity) | — | — | — | "used" | **instruction delivered vs. question merely seen** (D2) | Yes: false "every explanation tried". **Fixed** |
| L9 | retention | delayed-check answers | failed / passed | any wrong = failed | slip vs. forgotten | status "review" forever | the distinction slip vs. forgetting | Policy (D1), **not changed** |
| L10 | E7 process policy | working text | invalid step, incomplete, process findings with line | claim ledger, obligations | — | nothing (not in PROD) | all of it | n/a (proposal, §6) |

**Mathematical certainty vs uncertainty about the learner:**
- L1 establishes only that the answer or transition is mathematically wrong.
- L4 is the only place a cause is inferred. It stays a hypothesis: it needs two matching answers, and it may come out unsure.
- A wrong answer alone never yields a diagnosis: `insufficient` or `unsupported` is reported instead.

## 4. Root causes of D1–D5

| | Symptom | Root cause | Files | General correction |
|---|---|---|---|---|
| **D1** | One slip on the delayed check → `review` indefinitely | Retention is a single-shot gate. Any wrong answer among the delayed-check answers marks it `failed`. `failed` is terminal: the module asks retention questions only while `due`, and the status stays `review` while retention has failed. | `evidence.ts` L175–190; `intervention.ts` (retention branch) | **Policy; not changed.** Options in §10. |
| **D2** | "Every explanation has been tried" with nothing taught | Strategy *availability* was derived from question *exposure* (`answered(s.check)`). Strategy checks are also verification items. The block's reassessment was bound to one fixed question, and the planner's `apply` counted only unanswered strategy checks. | `intervention.ts` teach branch, `ruleStateFor`, `available.apply`, reassess | **Fixed:** `teaching-history@1`. Availability follows delivered instruction. A seen check is replaced by a fresh pool question (`blockCheck`). The block reassessment is the first answer alone labelled `check` in the block. A content gap gets its own truthful message. |
| **D3** | Step verifier not connected to diagnosis | (1) `working.ts` covers 6 of 1,080 families and is display-only. (2) The verified first-error evidence (`assessment@1`) was dropped at `readRecords` (L2). (3) `reason()` observations are `(question, response)` only, and its bug model predicts values, not steps. (4) The E7 claim ledger and process policy are not in PROD. | `working.ts`, `records.ts`, `reasoning.ts`, E7 modules | (2) **fixed** (pass-through, read-only, attached to every hypothesis observation). (3) Proposal: `Bug` may declare the `firstError.kind`s it predicts, and `reason()` adds that likelihood term; general, but needs per-family authoring. (4) §6 proposal. |
| **D4** | Skill "shown" while a narrower misconception is supported | Evidence is per competency (distinct right answers). A misconception existed only transiently, and only in the observing module. | `evidence.ts`, `intervention.ts`, `plan.ts` | **Fixed for representation and use:** a hypothesis has `scope {observedIn, about}`. Both modules and the planner see it while the status stays unchanged. Not shown in any UI yet. |
| **D5** | Equivalent evidence read differently by entry path | Three readers of the same answers (diagnostic@1 in the module; diagnostic@2 in topicCheck and recovery) with different thresholds. The module never received diagnostic@2 conclusions. Each path re-derived (or dropped) them with different kind mappings. | `topic-session.ts`, `intervention.ts`, `diagnostic.ts`, `reasoning.ts` | **Fixed for evidence:** one function (`hypotheses(records)`) feeds every path. A contract test asserts that topicCheck, recovery and the module read identical support and explanation. **Decisions still differ by design:** after `unsure`, recovery checks unshown supports; the topic check does not. |

## 5. Proposed unified evidence contract

The two kinds of evidence are kept apart: mathematical (left) and about the learner (right).

| Required | Mathematical (PROD: `grading-decision@1` / `assessment@1`; E7 `LedgerClaim` when enabled) | Learner (`learner-hypothesis@1`, new, `packages/learning/src/hypotheses.ts`) |
|---|---|---|
| Claim / hypothesis | answer verdict; first invalid transition | `claim {explanation, kind, says}` or `null` |
| Scope | question contract (hash) | `scope {question, family, observedIn, about}` |
| Supporting evidence | kernel result | `supporting[]` observations, each with the recorded authoritative decision |
| Contradicting evidence | — (proven facts do not decay) | `contradicting[]` (non-matching answers; the fresh right answer that resolved it) |
| Status | `correct/incorrect/unresolved` (certain) | `established / resolved / slip / insufficient / unsupported` (revisable) |
| Unresolved obligations | E7 `ProofObligation` (not PROD) | `obligations[]` (teach in scope; a fresh answer alone; further investigation) |
| Provenance / version | `policy`, `contract`, `source` | `provenance {policy: diagnostic@2-draft, established, attempts}` |
| Permitted use | credit and evidence (authoritative) | `use {teach, ask, evidence: false, mastery: false}` |

**Rules:**
- A hypothesis is a pure function of the records. There is no stored state and no parallel learner model.
- It never changes credit, evidence, status or mastery.
- A mathematical conclusion is copied into it, never re-derived or overridden.

## 6. Implemented integration (safe, bounded, general)

| Change | File | Effect |
|---|---|---|
| evidence@1 pass-through | `records.ts` | `Attempt.assessment` carries the recorded `assessment@1`; read-only |
| `learner-hypothesis@1` | `hypotheses.ts` (new) | Every investigated wrong first answer becomes a hypothesis with the fields above; `familyOf`, `investigation`, `investigateContext` move here (re-exported) |
| Module reads hypotheses | `intervention.ts` | Uses `openHypothesis(skill)` by `observedIn` **or** `about` (replaces `2a33767`'s own-module-only finding) |
| `teaching-history@1` | `intervention.ts` | `teachingHistory()`, `blockCheck()`; availability by delivery; fresh check; truthful content-gap pause |
| Planner keeps hypotheses | `plan.ts` | An established, untaught hypothesis in the release → `continue` on the skill it was seen in |
| Topic plan | `topic-session.ts` | A target added for pending teaching is taken out of the planner's scope, so the budget loop does not stop on it |

**Not touched:**
- grading, certification, quarantine;
- `evidence.ts` (mastery and retention);
- the server bundle (rebuilt hash `17204038…` unchanged; to be re-confirmed in §8);
- E7;
- UI components.

**No competency-, grade- or question-specific rule was added.**

**E7: not connected (proposal only).** Connecting it needs the claim ledger, unified engine and process policy inside the app and server bundle, plus a certification-authority decision about who may record process findings. The proposed safe step: store `ProcessShadowRecord` as an advisory attachment on the attempt, and let hypotheses read only its `findings {kind, line}` as observation context, with `use` limited to `ask/teach`. This needs approval (§10).

## 7. Before and after (the five journeys)

- **Before:** `traces-before/*.json` at `2a33767`. **After:** `traces/*.json`. Both come from the same scripted learners.
- One addition to the answer writer: it can now write a wrong *list* answer (`"2,3"` → `"2,4"`), which C reaches only now. The learner's policy ("wrong whenever alone") is unchanged.
- Record ids are random, so traces name records by event position. Two runs are byte-identical.

| | Path change | Final target (before → after) | Hypotheses at the end |
|---|---|---|---|
| A1 | none | transfer 16/17 → same | `?@gen:disc:-1,5:mc` **insufficient** (the supplementary investigation; nothing established, nothing taught) |
| A2 | none | review 18/19 → same (D1, policy) | none |
| A3 | **was `pause` ("every explanation tried", nothing taught) → now teaches `parabola` (never delivered), guided, fresh check `gen:aodk:2,3,20` alone (right), then verifies** | review 12/14 → review 15/17 (D1 still applies) | none |
| B | none in the path; the finding is now a shared hypothesis | transfer 12/13, assisted 1/1 → same | `minus-c-sign@gen:disc:-7,-18`: **resolved**, `about: integer-add`; supporting 2, contradicting incl. the fresh right check |
| C | the 60-minute plan now also schedules `quadratics` (the loop no longer stops on the target); C is wrong alone there too: 2 blocks, then pause | guided, 0/6 alone, 3/3 with help → same | `?@gen:disc:5,14` **unsupported** (no explanation fits; nothing taught on a guess) |

**Contract tests** (`frontend/src/learning/learner-hypothesis.test.ts`, 7) **at the boundary:**
- **Simultaneous states:** after B's check, `integer-add` reads `independent`, and the hypothesis about it is open (≥ 2 supporting observations).
- **Survives into planning and modules:** the hypothesis reaches `nextActivity` (`continue` → target) and both modules (teaching pending).
- **Same evidence on every path:** topicCheck, recovery and the hypothesis give identical support and explanation.
- **Mathematical certainty kept:** every observation carries the recorded credit and assessment source.
- **Determinism:** hypotheses are a function of the records.
- **No unearned claims:** A1 and C establish nothing (`insufficient` / `unsupported`).
- **No false teaching claims:** a pause that says strategies were tried has them all delivered; `delivered` equals teaching steps; checks seen as practice are not instruction.

## 8. Regression results

See the final section of the commit message and the final report for the run that completed. Partial runs are not reported as passes.

## 9. Remaining architectural limitations

1. **Investigation is triggered only by the starting-point check and by "stuck" problems.** A misconception that first shows during practice or verification is never investigated, so it never becomes a hypothesis.
2. **Hypotheses cover generated families with bug predictions:** 1,035 of 1,080 families, and 317 of 336 modules with investigable diagnostics. Hand-written questions outside a family get diagnostic@1 tags only.
3. **Working evidence:** only answer-first `firstError` (algebra kernel) reaches the hypothesis, and only as context. `reason()` does not weigh it. Step checking covers 6 families. E7 is not active.
4. **Hypothesis resolution is coarse:** teaching in scope, then any fresh right answer alone in scope. There is no "discriminating question" requirement and no decay.
5. **Hypotheses are not shown** to the learner or teacher, and no record of their history is kept beyond the derivation.
6. **Cross-year hypotheses** (seen in an earlier grade's skill) are not surfaced by the planner (release scope only).
7. **Retention** (D1) and **calibration** (D5: after a slip, diagnostic@2 reads unsure rather than slip) are unchanged.
8. **Not exercised:** browser and rendering end to end, PostgreSQL, a lockfile-exact `npm ci`, real learners. **Synthetic journeys show integration only, not educational effectiveness.**

## 10. Decisions requiring product-owner approval

1. **D1 retention policy.** Choose one:
   - (a) a failed delayed check schedules a new one after re-demonstration (for example, 2 fresh right answers alone, then +7 days), and review clears on a later pass;
   - (b) slip tolerance inside the check (fail only on ≥ 2 wrong, as status@2 already does for independence);
   - (c) both;
   - (d) keep it as is.
2. **Hypothesis resolution standard:** keep "a fresh right answer alone after teaching", or require a question on which the misconception predicts a distinct wrong answer.
3. **Investigating practice and verification errors** (limitation 1): allow the module to ask an investigation question after a wrong answer alone, when the family supports it.
4. **E7 in production:** whether process findings may be recorded as advisory attachments, and under which certification authority.
5. **Showing hypotheses** to learners and teachers (wording, and when an `unsupported` reading should route to a person).
6. **The changed C plan:** a 60-minute plan now fills its budget past the target (`quadratics`). Confirm this is wanted.

## Acceptance question

*Can OpenPath take evidence from any supported mathematical problem, establish what is certain, preserve what it learns, investigate what is uncertain, and choose its next action without a question-specific workaround?*

**Partly.**

**What now works, for generated families with modelled misconceptions:**
- **Establish:** answer correctness is mathematically certain, plus the first invalid transition where the algebra kernel applies.
- **Preserve:** what the engine learns about the learner is kept as a shared, revisable hypothesis. Every path sees it, including the prerequisite skill it points to and the planner, and it never touches mastery.
- **Abstain:** the engine says `insufficient` or `unsupported` instead of guessing.
- **Teach and recheck:** it teaches by delivered instruction, not exposure, then reassesses alone on a fresh question.

**Not yet:**
- investigation of errors seen outside the two entry points;
- working-level evidence as an input to diagnosis;
- E7;
- non-family questions;
- a retention policy that separates a slip from forgetting.

**The five journeys passing does not make this a universal engine.**
