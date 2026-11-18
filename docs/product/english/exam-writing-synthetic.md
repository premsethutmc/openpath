# Exam writing: synthetic contract rehearsal

The exam diagnostic preview keeps learner writing on the device and does not assess it. Its separate synthetic example demonstrates a future narrow observation-to-teaching flow without submitting that writing to any model.

## Earlier two-area offline example

- The demonstration uses an invented, fixed sample and a local simulated gateway response. It is not a live model evaluation.
- The response passes the existing v2 gateway provenance and observation validation before use.
- An observation is a tentative concern, never a diagnosis. Independent fixed checks determine only whether practice is useful on those particular items.
- Subject–verb agreement and a/an are the only check areas. Definite/zero articles, broader writing quality, exam readiness, mastery and scores remain unverified.
- Repeated items are practice, not fresh evidence. A lesson is not proof of improvement.
- No API key, provider configuration, payment, real learner transmission or backend gate change is part of this feature.

## Before real writing can be assessed

The synthetic gateway implementation below is now available. Permitted learner-data handling, approved provider/security configuration, educator review and evaluated linguistic accuracy are still needed. Passing these software fixtures proves contract behavior only, not diagnostic accuracy. Never replace these checks with an assertion that a hosted model is reliable merely because its JSON is valid.

## Complete journey (2026-11-18)

`?experience=exam-diagnostic&mode=synthetic` now rehearses reading → invented natural writing → validated observations → deterministic independent checks → targeted teaching → fresh reassessment. The earlier two-area offline example remains available separately. Initial reading/writing is intended to take about ten minutes; follow-up takes longer.

The complete journey covers four narrow areas: subject–verb agreement, a/an, source fidelity and evidence-to-claim reasoning. Two independent checks are required per proposed writing area. Mixed answers remain inconclusive. Teaching is followed by a separate two-item bank, never reused verification items. Reading mistakes have their own lessons and new transfer questions. Immediate performance is not evidence of retention or teaching causality.

Default mode is a fixed invented paragraph and a clearly labelled simulated response, with no network call. Optional server mode uses the existing shared essay API with `openpath.exam-writing@1`, a server-owned prompt and source context. The endpoint remains developer-only, synthetic-only and subject to shared admission limits. No provider was enabled, no real learner data sent, and no paid call made for this implementation. Server failures fail closed, without a simulated assessment fallback.

Writing and responses are memory-only; exposed item IDs persist on this device to prevent reused checks being reported as fresh. Reload discards the sitting; restart retains exposure history. The public pilot still refuses this route. This is a developer rehearsal, not permission to use real learners. Linguistic calibration, educator review, privacy approval, larger fresh-item banks and real-device acceptance remain prerequisites for learner use.

Tests: `node --import tsx --test src/english/logic/exam-diagnostic/*.test.ts` in frontend; `node --test e2e/exam-journey.test.mjs` against the normal English preview; backend `evaluation` test suite. Browser tests use synthetic local fixtures only.
