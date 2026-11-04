# Combined foundation acceptance

The bounded shared mathematics foundation is ready for code review as an **opt-in implementation**. Teaching breadth remains **partial**. There is no remaining known blocker in the reviewed shared mechanism; this is not completion of the curriculum, universal method checking, or evidence of improved human learning. Nothing was pushed, merged, deployed or globally activated.

Local branch: `feat/shared-math-foundation-local`. Final implementation: `dfc12bda67d05011610d0f5782cc92254bad2248`; the subsequent documentation commit records this report. Pinned integration inputs are in [README](README.md). Successive preserved checkpoints are `49e0e1d` (initial), `98f2efb` (connected flow), `165de59` (trusted geometry), `e41d3c4` (independent regression cases), and `dfc12bd` (final shared-policy fixes). The whole branch is packaged separately in `/workspace/shared-math-foundation-complete.bundle`, without requiring earlier bundles.

## Acceptance matrix

| Goal | Status and evidence | Boundary |
| --- | --- | --- |
| Trusted domain-aware working | Ready within supported families: server-bound identity/version, task, response and decision; bounded Python worker, immutable persistence, replay and failure fallback | Geometry parser and rule coverage are bounded; unsupported methods remain neutral |
| Answer versus demonstrated method | Ready: bare answers do not supply method evidence; invalid methods cannot establish new readiness from a correct answer; incorrect answers do not fabricate mastery from correct steps | Configured coverage requirements remain answer-based; verified working is separately recorded |
| Skill coverage, recovery and retention | Ready for the four configured competencies, through existing selection and evidence engines | Other modules retain existing competency-level policy; they do not acquire invented skill coverage |
| Diagnosed-gap teaching and recheck | Ready as a shared guard: established gaps require relevant teaching and fresh discriminating checks, or explicit unavailability | Exterior-angle and some angle-pair targeted teaching is still missing; the system cannot claim it remediated those gaps |
| Upward/downward progression | Ready on the existing supported prerequisite graph, with saved opt-in goal, probes, recovery and skip of demonstrated prerequisites | Grade is placement, not a ceiling. No automatic universal school-to-engineering syllabus or compulsory Grade 1 start |
| Recoverable user flow | Ready in tested phone flows: retained work, helpful unsupported feedback, review, errors/repeated actions, reload and fresh login | General usability and teaching efficacy have not been established by browser tests |
| Existing history and defaults | Ready: new selection interpretation requires a validated persisted pathway; old decisions/history remain immutable; no global activation | Legacy year totals still summarize answer evidence and are labelled separately from goal requirements |
| Broad mathematics teaching | Partial | Generated addition explanations improved; many domains lack targeted explanation/method coverage |

The stopping condition is passing bounded shared-mechanism acceptance with honest content limits. Further content authoring and educational validation remain work. Publication still requires authorization.

## Final review repairs and regression meaning

The combined review found that established hypotheses could be bypassed by general coverage selection or broad competency progress. The adapter now prioritizes established gaps on the validated route. It reuses existing teaching metadata, eligibility and discriminating probes. A lesson must actually address the misconception, its question family, or its explicit prerequisite scope. Missing or exhausted opportunities produce an honest content limitation and eligible review/another-goal action, with progress preserved.

Teaching events unrelated to an established gap no longer count as its intervention under the opted-in policy. Unresolved/pending probes count as exposure, so unreadable work cannot be repeatedly offered as a fresh check. Resolution requires the persisted grading decision's credit, not a raw text match. A route-scoped probe may cross initial grade placement; ordinary learners retain the existing grade behavior. Method-required selection now uses the shared working-authority capability instead of an equation-only statement check.

The G-03/G-06 historical journeys still reproduce their old broad transfer status. Their recorded answer-level errors/family weakness do **not** establish persistent hypotheses in those traces. New assertions distinguish those facts: opt-in family coverage remains incomplete and selects the weak family. Separate two-error traces establish actual hypotheses and test the teaching guard. The grade regression temporarily supplies grade metadata because these geometry families lack it; it does not claim a grade cap caused G-03/G-06.

Tests retain broad historical status assertions and add opt-in obligations, rather than rewriting history to look successful. Two trusted fresh discriminating successes can contest a hypothesis; mutating their recorded credit to false prevents that. Unrelated lesson delivery remains insufficient. Repeated or unresolved probes remain excluded from fresh evidence.

Previous geometry fixture changes are explained in [GEOMETRY-WORKING](GEOMETRY-WORKING.md): frozen conclusion-entailment cases use the entailment API, while submitted-method cases must include their theorem citation. The authority may not invent that citation. No frozen corpus or quarantine allowlist was broadened.

## Reuse, not a second engine

| Existing owner | Missing behavior | Final extension and evidence |
| --- | --- | --- |
| `session`, `records`, Django event ledger | Durable opt-in pathway/working authority | Owned versioned record; saved decisions, reload and replay |
| `plan.nextActivity`, existing prerequisite graph | Target-directed advancement and gap-aware stopping | Route branch and established-hypothesis guard; higher-target skip and pending-gap regressions |
| `intervention`, `hypotheses`, teaching metadata | Relevant intervention and fresh resolution obligation | Existing strategies/probes with scoped matching and exposure checks; no alternate teaching engine |
| Generic sub-skill projection, `questionForRequirement` | Coverage, recovery, due skills and method-capable selection | Domain configuration and authority lookup; existing certified pools/quarantine |
| Python geometry reasoner, server grader, D1 contracts | Safe submitted-reasoning semantics and runtime transport | Direct cited-rule verification, bounded adapter and bound persisted feedback |
| Year input/feedback, existing `Lesson`/figure renderer | Usable working, fallback and concise explanations | Reused UI; phone evidence and generated addition examples |
| Existing statistical profile/evidence model | Trustworthy inputs to readiness | Evidence filtering and policy gates; no replacement estimator |

Addition repairs operate on generated operands: `1+2` explains combining/counting consistently; `193+678` finishes with `800+70+1=871`. Existing participation, hints, alternate explanations and next actions are reused. Six changed explanation revisions remain pending educator review. Passing generated examples does not prove teaching quality across the curriculum.

## Validation

[Machine-readable evidence](final-validation.json) records final hashes and scope. The final grader bundle and all 210 source/content plus 11 Python input hashes were checked against the manifest.

- Frontend foundation/pathway/remediation/handover aggregate: **47 passed**. Final remediation file after the last trusted-credit/exposure change: **8 passed** (overlapping, not additional independent cases).
- Django pathway/handover/geometry aggregate: **14 passed, 1 skipped**. The skip requires the `H1_DIR` export fixture; it is not counted as a passing persistence test. Actual browser save/reload was separately exercised.
- Main TypeScript check and year build pass. Mathematics integration has **188 inherited errors, zero new**, compared with the previous pinned snapshot. An initially introduced unreachable UI branch produced a type error; it was removed because the earlier unavailable-state renderer already handles that state. No exclusion/suppression was added.
- Actual Django-backed Chromium at **390×844**: geometry working verified and saved, existing concept lesson/figure, fresh login and deterministic replay. Two real API submissions seed the exterior-angle misconception; actual UI then displays the content gap and review. Reviewing an unrelated generic lesson does not resolve it. See [screenshot](final-screenshots/foundation-gap.png). The geometry-only script's empty topic/attempt counters describe the omitted earlier pathway loop, not the geometry submissions.
- Earlier unaffected acceptance is retained, not blindly rerun: connected 8-topic/20-answer/22-event phone journey, 65 frontend and 95 learning checks; geometry 56 Python checks and trusted boundary/worker regressions. Exact results and fixture repairs remain in the phase reports. These numbers are not combined into a new full-suite total.

Reproduction entry points: `frontend/src/journey/foundation*.test.ts` and handover tests via `node --import tsx --test`; Django `family.test_foundation_pathway`, `family.test_handover`, `family.test_geometry_working`; `frontend/e2e/foundation-pathway.test.mts` with `PATHWAY_GEOMETRY_ONLY=1 PATHWAY_GAP_CHECK=1` against an isolated Django test account/database; `frontend/scripts/build-year.mjs`; main and mathematics-integration TypeScript configs. Browser setup requires local test-server settings, not production credentials.

The independent reviewer reviewed trust/eligibility/replay and final gap policy, then research traceability. No remaining shared-mechanism blocker was reported. Procedural-error-to-specific-teaching breadth remains partial and is not hidden by the readiness guard.

## Research-to-product reconciliation

`openpath-research` was read-only. Its checkout and live remote main were `46fcf5feb0f49e8fed04b595ae51604fcf8eb5aa`. Other candidate refs were inspected in a separate temporary repository. The source checkout stayed clean. The roadmap's initial statuses are historical, evidence-limited assertions rather than a current product audit.

| Research contract | Current engineering evidence | Remaining boundary |
| --- | --- | --- |
| `MASTER_SPEC.md` INT-002/005; `intelligence/LEARNER_MODEL.md` | Versioned evidence, independence/help/exposure, immutable decisions, replay and delayed/recovery behavior within tested mathematics | Full target evidence schema and cross-subject calibration are not certified by this slice |
| UX-002/004/005 | Connected teaching/check/fallback/progress, preserved work, honest unsupported/content-gap labels | Overall usability and educational outcomes require further validation |
| PLUG-005; `subjects/SUBJECT_CONTRACTS.md` mathematics | Working can constrain readiness; supported equivalent rules, error feedback, assistance and reasoning distinction | Partial: procedural-error-driven specific teaching and accepted notation remain limited across domains |
| INT-001/PLUG-001 | Shared mathematics infrastructure demonstrated across algebra, geometry and addition | This does not establish the broader spelling-plus-writing plugin acceptance |
| INT-006; delivery `ROADMAP_AND_AUDIT.md` | Production model retained; optional policies and research candidates isolated | M2 spelling/Grade 8 writing, broader content/educator/offline work and controlled research activation are outside this slice |

These files are under `docs/product/` in the research repository. The learner-model contract is a target contract, not proof that a universal estimator has already been validated. Product evidence continues through the existing shared profile/statistical implementation. No research estimator variant was imported or silently activated.

Candidate status, checked from actual current refs:

- E003.1 `42834e68969519d5887b8a55dcce44541980f39a`, `experiments/E003-1/results/DECISION.md`: **PASS_SHADOW_CANDIDATE**, synthetic only. Its recommendation retains production mastery logic and changes variance handling. The evaluation reports missed competence at the final observation increasing from 30.2% to 83.4%; improved calibration alone is not useful advancement. Its reporting/CI/safety concerns remain research work, not permission to replace the product model.
- Ability advancement v0.5 `9fc6695e46ed49348ffa0f3becceb0a322686304`, `docs/RESULTS_v0.5.md`: no advancement candidate passed. Withholding and exhaustion findings inform honest fallback, not an approved production replacement.
- Versioned contract `2f338431c89dd0ea9ff8e5244d6c57883ffba6ab`, `docs/INTEGRATION.md`: proposed off/shadow integration; active mode deliberately unavailable.

Research therefore informs contracts and adversarial expectations while the product reuses its existing engine. Real-learner studies are not a prerequisite to delivering this engineering slice; no claim of guaranteed learning or experimentally proven outcomes is made.

## Remaining work

Implementation limits: broaden supported working grammars/domains safely; add skill configurations where product requirements justify them; extend procedural-error-to-teaching coverage; validate broader interfaces/devices and cross-subject contracts. The current method adapter intentionally abstains beyond supported geometry representations. Windows process cancellation has the documented narrower Node-process behavior; tested deployment-like validation here is Linux.

Content/research limits: author and review missing geometry misconception explanations and multi-step opportunities, expand supported prerequisite bridges/application representations, review the changed addition explanations, and evaluate research candidates separately. Missing content is a system limitation, never evidence that the learner failed to learn. No advanced curriculum or complete school-to-engineering continuum is claimed.
