## Essay learning journey UX

Adds an opt-in essay journey within the existing English app: write/paste a synthetic essay, inspect competency evidence, explore a diagnostic and expandable learning branch, rewrite in 50 words, and inspect an updated sample profile. It reuses the existing violet/mint/peach tokens, shell, Brand and build pipeline.

Entry: existing English preview with `?experience=essay-demo&no-sw`. The complete journey is explicitly synthetic; no live assessment or learner-profile update occurs.

### Shared intelligence contract

Imports Claude's `essay-contract@1` file unchanged from `447a56d71a00ac9965516f099d01253594e5e6ad` on `feat/essay-learning-intelligence-v1`. Typed fixtures use its submission, analysis, competency/profile, learning-journey and rewrite-evaluation models. Evidence, journey steps, final-task availability and feedback dimensions render from those contract projections. No engine/updater/ledger changes were copied; React does not score answers or decide mastery.

### Validation

- 242 frontend tests passed: 230 existing + 12 presenter/contract tests.
- Seven essay Chromium phone tests passed, including pilot refusal, exact 50-word constraints, interruptions, resumable partial responses, expandable branches, errors and preservation of existing English storage.
- Nine existing English browser journeys passed.
- Existing TypeScript checks, English development/pilot builds, math production and standalone builds passed.
- Common phone widths: 360, 390, 412; short-height keyboard rehearsal, labelled fields, radio controls, focus and 44px touch targets checked.
- Shared contract file matches the upstream Git blob exactly. Backend, updater, existing English App, PR #41, PR #42 and the existing tutor UX branch were not changed.

### Synthetic screenshots

| Submission | Competency evidence |
| --- | --- |
| ![Submission](https://github.com/premsethutmc/openpath/blob/feat/essay-learning-experience-v1/docs/product/essay-learning/screenshots/01-submission.png?raw=true) | ![Competencies](https://github.com/premsethutmc/openpath/blob/feat/essay-learning-experience-v1/docs/product/essay-learning/screenshots/02-competencies.png?raw=true) |
| Diagnostic | Expandable journey |
| ![Diagnostic](https://github.com/premsethutmc/openpath/blob/feat/essay-learning-experience-v1/docs/product/essay-learning/screenshots/03-diagnostic.png?raw=true) | ![Journey](https://github.com/premsethutmc/openpath/blob/feat/essay-learning-experience-v1/docs/product/essay-learning/screenshots/04-learning-tree.png?raw=true) |
| Final rewrite | Updated sample profile |
| ![Rewrite](https://github.com/premsethutmc/openpath/blob/feat/essay-learning-experience-v1/docs/product/essay-learning/screenshots/05-rewrite.png?raw=true) | ![Profile](https://github.com/premsethutmc/openpath/blob/feat/essay-learning-experience-v1/docs/product/essay-learning/screenshots/06-profile.png?raw=true) |

### Fixture limitations and integration requirements

All results are prewritten fictional examples for the built-in sample, including when the draft is edited. Different answers deliberately produce the same sample projection. No child data, external service, remote API or analytics is introduced; only demo drafts/navigation are stored locally. The reviewed pilot refuses the demo. Completion and word count never make a competency verified/green. A rewrite does not verify every skill.

The live service adapter remains outstanding: retain the imported shared contract, use the existing learner identity, obtain authentic evidence/policy-derived states and gates, preserve help/exposure/retention provenance, return the updated profile, and agree authorization, consent/deletion, idempotency, cancellation and draft migration. Do not migrate local fixture responses into a real evidence ledger. Native Samsung/Android IME and real screen-reader/child usability testing remain outstanding; no educational validity is claimed.

Details: [architecture and run guide](https://github.com/premsethutmc/openpath/blob/feat/essay-learning-experience-v1/docs/product/essay-learning/README.md), [validation](https://github.com/premsethutmc/openpath/blob/feat/essay-learning-experience-v1/docs/product/essay-learning/VALIDATION.md).

Draft for integration review. No merge or deployment is included.
