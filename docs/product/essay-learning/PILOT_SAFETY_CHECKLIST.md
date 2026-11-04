# Privacy and pilot-readiness checklist: essays from real children

This is an audit of the code on this branch, which is stacked on PRs #43–#47. Real-child essay submissions are
**disabled**, and this change does not enable them. *This is not legal advice. India's Digital Personal Data Protection
Act 2023 treats everyone under 18 as a child and requires verifiable parental consent (PILOT_PROTOCOL.md §3, decision
D11). A qualified person must review the plan before any real child's essay is collected.*

## What the code does today

| Area | Current handling | Where |
|---|---|---|
| Real children's essays | Refused. The core rejects `dataUse: "real_learner"` (`REAL_LEARNER_ESSAYS_ENABLED = false`). The server's essay evaluator accepts only `data_use: "synthetic_test"`, from developer accounts. | `packages/english-core/src/essay/{contract,analysis}.ts`, `backend/evaluation/essay.py` |
| The essay studio | Uses one dedicated synthetic profile, stored on the device only (`this_device_only`, IndexedDB). It is refused in pilot builds and never synced; no code path was found that moves a device-only profile to an account. | `frontend/src/english/logic/essay-live/studio.ts`, `ui/essay/EssayLive.tsx` |
| Personal information in essay text | Partly handled. Before anything leaves the device, the core removes email addresses, links, phone numbers and @handles. The server also removes "Mr/Ms X" and "my name is X" patterns. **Names of friends, family, schools and towns are not removed**, and essays naturally contain them. | `packages/english-core/src/evaluation.ts` `scrubIdentifiers`, `backend/evaluation/scrub.py` |
| Server storage of essays | None. The essay evaluator's record keeps metadata only: task, protocol, adapter, model, rubric, a text fingerprint, the length, tokens and latency. Never the text, the model's output or the key. | `backend/evaluation/models.py` `EssayEvaluationRecord` |
| Model provider | Off by default (`OPENPATH_ESSAY_EVALUATOR=disabled`); the key lives in the server environment only. If enabled, the scrubbed essay text **is sent to the provider**. No provider has been chosen, and its retention, training use and data location are unknown. | `backend/config/settings.py`, `backend/evaluation/llm.py` |
| Consent | Parent accounts record a consent-policy version (`2026-10-prototype`) per pupil. Learners have enrolment consent and per-purpose consent records (guardian or school; the latest record wins, so it can be withdrawn). There is **no essay-specific consent purpose** yet, and no parental authorisation flow for essays. | `backend/family/models.py`, `backend/learners/models.py`, `backend/evaluation/models.py` `PurposeConsent` |
| Retention and deletion | A parent can delete a pupil, or the whole account with the password again (cascade). A parent can scrub material from a pupil's stored record. A device learner can be deleted from the device. The pilot protocol proposes deletion dates but has **not decided** them. No essay-specific retention period exists. | `backend/family/views.py` (`PupilView.delete`, `DeleteAccountView`, `PupilScrubView`), `docs/english/PILOT_PROTOCOL.md` §7 |
| Educator access | There is no educator role in the app. Educator review happens offline on content files (this package), which contain no child data. Developer diagnostics are read-only and audited, and see a pupil only if the parent shares it. | `backend/family/developer.py` |
| Learner identity and provenance | Essay records carry a pseudonymous learner id, never a name. Every answer carries provenance@1 (attempt, hints, feedback, policies: passage@1, assisted@1). Every evaluator answer carries its evaluator, version, model, rubric and protocol. Identity is kept apart from evidence (decision A-17). | `packages/english-core/src/types.ts`, `essay/contract.ts` |

## Decisions required before real-child submissions can be enabled

1. **Lawful basis and consent.** Decide the verifiable parental consent mechanism for essays: a written form (pilot) or
   an in-app flow. Decide the child's assent, and the essay-specific purpose ("analyse my child's writing with an AI
   model"). Record it as a separate `PurposeConsent` purpose that can be withdrawn.
2. **Where essays live.** On the device only (the pilot protocol's model), or on the server. If on the server, decide
   how they are encrypted and who may read them.
3. **Retention and deletion.** Fix a retention period for essay text, the analysis and the rewrite (the protocol proposes
   deletion within 2 weeks of the last session). Decide deletion on withdrawal, and what is kept: for example, only
   competency evidence without the text.
4. **Personal information in text.** Decide whether names, schools and places must be removed or replaced before any
   model call. Today they are not. Options:
   - stronger scrubbing;
   - asking children to use made-up names;
   - human review before sending.
5. **Model provider.** Choose a provider only after checking its data processing terms: no training on inputs,
   retention, data location, and a children's-data agreement. Then approve a key and its cost. Decide a fallback when
   it is unavailable (the studio's local fallback already exists).
6. **Evaluator validity.** Decide the accuracy needed on the validated benchmark before essay observations are shown to
   a child or parent. Even then, observations only suggest; the diagnostic questions decide.
7. **Educator access.** If educators are to see children's essays or results in the pilot, decide the role, the access
   control and the audit. Today no such access exists.
8. **Content approval.** Educator review of the questions, lessons and standards used by the pilot competencies
   (PILOT_COVERAGE.md), then a separate, explicit content-release change.
9. **Safeguarding.** Decide what happens when an essay discloses harm. The writing evaluator's safeguarding flag rejects a
   written answer for learning (updater check 8), but **the essay pathway has no safeguarding flag yet**. A human process
   for disclosures is needed in any case (the pilot protocol's supervisor process).

## Readiness checklist

- [ ] D11 data-protection review done; the information sheet and consent form approved
- [ ] Essay-specific consent purpose and withdrawal implemented and tested
- [ ] Retention period and deletion procedure for essays decided and implemented
- [ ] Personal-information handling in essay text decided and implemented (names, schools, places)
- [ ] Model provider chosen on its data terms; key and cost approved; or the pilot runs without a model
- [ ] Essay evaluator validated on educator-annotated essays (essay-validation-v1), with the accuracy threshold met
- [ ] Pilot questions, lessons and Grade 8 standards reviewed by an educator; approved content released by a separate change
- [ ] Safeguarding process for disclosures in essays agreed with the host organisation
- [ ] `REAL_LEARNER_ESSAYS_ENABLED` and the server's synthetic-only rule changed only after all of the above, in a reviewed change

None of these is done. Real-child access stays disabled.
