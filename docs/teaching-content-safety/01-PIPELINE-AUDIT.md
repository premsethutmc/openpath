# 01 — Teaching pipeline audit (baseline `4a7244f`)

Traced through the code, not the documentation.

| Stage | Component | What is checked at baseline |
|---|---|---|
| Learner evidence | `records.ts`, `evidence.ts` (SkillEvidence, retention@2, retention-failure@1) | answers alone vs helped; independent, transfer, verified; failed delayed check → `review`, `recoveryRequired` |
| Adaptive decision | `intervention.moduleState` / `moduleStep`, `recovery`, `planRule` | bounded retries (bounded-retry@1), bounded input, investigation triggers, policies A, B, C |
| Misconception evidence | `hypotheses.ts` (learner-hypothesis@1), `diagnostic.ts` | a hypothesis is *established* after two matching answers; module starting check gives a posterior diagnosis |
| Intervention eligibility | `intervention.failsChecks` → `teaching-contract.teachingEligibility` | **machine contract only**: sections refer to one question, arithmetic claims hold, result is the checked answer. "Not checked" (hand-written) content passes |
| Explanation selection | `orderStrategies` (sorted by the diagnosis's *kind*, then by probes) | nothing about approval or about whether the learner has the misconception an explanation is about |
| Content rendering | app `Learn.tsx` (Lesson), lesson page `TeachingContent.tsx` (`teachingLesson`), slice `renderer-adapter.teachingSpec` | the app says "checked automatically … a teacher has not reviewed it yet"; the lesson page shows **every** strategy in scope, gate or not |
| Independent recheck | module `guided` → `check` (blockCheck), RETRY_LIMIT | the check is a fresh question alone; teaching itself is never evidence |
| Learner-state update | `evidence.ts` | only answers alone count; answers straight after teaching do not demonstrate a skill |

Where content correctness, approval status and misconception evidence are checked at baseline:

- **correctness**: machine contract (`teachingEligibility`) for synthesised modules; nothing for hand-written ones ("not-checked" passes).
- **approval**: `review@2` (review.ts, Django `content_review.py`) locks whole *modules* and *families* by hash; it gates which *questions* count as validated evidence. It never gates *teaching*: no explanation-level record, and no code path consults it before showing an explanation.
- **misconception evidence**: used to choose the *reason text* and the diagnosis kind; not required before a misconception-specific explanation ("spot the mistake").

## Baseline behaviour for the eight cases

| Case | Baseline behaviour |
|---|---|
| 1 Approved content | No approval mechanism for explanations; nothing is approved. |
| 2 Unreviewed content | Shown, with "a teacher has not reviewed it yet" (app). All 1179 explanations are unreviewed. |
| 3 Known-invalid content | Shown if the machine contract passes or does not apply: 2 of the 4 known-invalid explanations were eligible interventions (missing-number `check_what_it_uses`, rational-numbers `spot_the_mistake`); multiplication `doubling` was not machine-checked and so allowed; missing-number `worked_steps` was gate-blocked as an intervention **but still shown on the lesson page** (`teachingLesson` does not consult the gate). |
| 4 Missing content | No module → `unavailable`; no eligible strategy → `pause` ("no checked explanation"). Safe. |
| 5 Unsupported misconception diagnoses | Not stored as facts (hypotheses need two matching answers), but a **misconception-specific explanation was chosen without one**: a starting-check posterior of "conceptual" or `insufficient_evidence` ranks "spot the mistake" first (scenarios 4a, 4c, 5b). |
| 6 Generic interventions | Chosen by kind order; `check_what_it_uses` often second (generic). Not distinguished from diagnosis-driven teaching in records or reasons. |
| 7 Failed independent rechecks | A different explanation next (bounded by the strategies available), then a pause. Teaching never counts as success. Correct. |
| 8 Retention failures | Decision B: `review`, not verified, `recoveryRequired`, history kept; recovery cycle once. Correct. |

Baseline numbers (Milestone 2 closure): 64 explanations audited (17 ready pending educator review, 38 revision, 5 demo-only, 4 wrong or broken); 2 unsafe explanations eligible as interventions; 9 of 24 teaching decisions unverified, 3 of them misconception-specific without evidence.
