# Integrated English learner workspace

**Status: synthetic candidate workspace, not real-learner-ready or exam-validated.**
Open the non-pilot English build at `/?experience=english-workspace`. The reviewed pilot refuses this route. This workspace extends the existing learner record and `EssayStudio`; it does not introduce another mastery engine.

## Intended learning loop and implemented experience

1. Select a goal: Grade 7 foundations, everyday English, CAT-oriented reasoning, GRE-oriented argument practice or GMAT-oriented reasoning. Select foundation, developing or stretch as a **starting practice preference**, not a placement result.
2. Write an invented initial explanation in your own words. With an explicitly selected, configured developer evaluator, existing essay analysis proposes grammar/language concerns. Existing checks, lessons, drills, rewrite assessment and due-review planning remain available where content and evidence permit.
3. Open **Articulate both sides**. Link the saved initial explanation, or write an initial articulation sample, then argue for and against a proposition. Revise one of your own arguments rather than copying a model paragraph.
4. Argument feedback quotes the submitted draft and asks a focused question with an optional thinking hint. Targeted self-repair guidance addresses claim, reasons, evidence, warrant, counterargument, organization and clarity. The writer supplies the revised content.
5. Review the history and continue on another topic. Saved original drafts, revisions and feedback remain distinct. Return to the existing learning path and due reviews; an argument finding alone does not create a verified gap or update an ability estimate.

Without an evaluator, writing is saved and general self-review questions remain available. There is **no pattern-based assessment fallback** in workspace mode. A failed or rejected response stays unassessed, with explicit retry for argument feedback. Saving or rewriting is not evidence of improvement.

## Architecture and contracts

- `frontend/src/english/ui/essay/EnglishWorkspace.tsx`: goal/challenge selection and explicit server opt-in.
- `EssayLive.tsx` and `logic/essay-live/studio.ts`: reuse `EssayStudio`, `Learner`, repository, question allocation, teaching programme and review planning. Workspace options disable fallback assessment. Legacy Grade 8 studio defaults remain separate.
- `logic/essay-live/workspace-profiles.ts`: 15 profiles, `foundation-writing-{goal}-{difficulty}@1`. Grade 7 uses grade 7; other goals use grade 0 as a non-school sentinel. Provisional practice targets are 2/4/6, not measured ability or curriculum equivalence.
- `logic/essay-live/argument-workspace.ts` and `packages/english-core/src/essay/argument.ts`: staged initial/for/against/revision artifacts and separately validated coaching feedback in the existing essay ledger. Matching a saved source also preserves its original prompt. Supported revision is labelled separately from initial writing.
- `ArgumentWorkspaceView.tsx`: own-writing editor, thinking questions/hints, self-repair guidance and topic-cycle history. It supplies no canned argument rewrite.
- `backend/evaluation/foundation.py`: registers the 15 profiles and canonicalizes competency metadata from the existing Grade 8 profile and English framework. Existing observe/questions/own-rewrite protocols are reused with non-Grade-8 framing and explicit limits on claims.
- `backend/evaluation/argument.py`: `openpath.argument-coaching@1` through the existing essay `observe` endpoint. Requests carry grade 0/7, an accurately counted 30–800-word draft (maximum 10,000 characters), and stage/topic/prompt/optional previous draft. Output is exact-quote findings with area/question/hint and explicit not-observable areas. No score, correction or replacement-prose fields are accepted.
- `backend/evaluation/essay.py` and `gateway.py`: existing developer authentication, synthetic-only guard, server-owned prompts, shared quotas and bounded provider dispatch. No provider is activated by adding this workspace.

## Evidence, privacy and persistence

The workspace retains one on-device test history **per goal/challenge combination**, not one merged cross-goal proficiency profile. Reopening the same selection resumes committed work. Unsaved drafts are not durable. Argument artifacts and feedback do not change the ability composite. Existing language checks use candidate content; the UI qualifies their results rather than claiming validated adult proficiency.

With server evaluation selected, the request includes writing, task/prompt context, rubric/competency metadata and, for argument revision, the earlier draft. Contact-like identifiers are scrubbed, but this is not comprehensive anonymization. Do not enter personal information or real learner work. The essay gateway records metadata, not raw drafts/model output; the on-device learner record does retain committed writing and feedback. This is distinct from older evaluation routes with different storage contracts.

## Honest coverage and gaps

- The reused writing profile has **20 competencies: 17 specified, 3 observation-only**. The legacy content has lessons for **4**; the workspace adds **13 bounded candidate mini-lessons**, so all **17 specified** competencies have teaching and the **3 observation-only** competencies remain without it. Each new mini-lesson has two reasoned examples, an own-text coaching prompt and a separate guided check. Specified descriptors and mini-lessons do not imply comprehensive programmes or fresh checks at every selected target. Current bank/retention reservations leave some skills without a complete fresh independent pair, especially at foundation and stretch. Content shortages must remain explicit, never learner deficits.
- Goal/challenge selection changes context and provisional practice references; it is not measured placement, an official exam syllabus or evidence of exam readiness.
- Argument coaching is tentative, not a structural-integrity score. Exact quotes and schema checks establish provenance/shape, not correctness of the model's reasoning. Questions/hints are instructed not to supply replacement prose, but schema validation alone cannot guarantee their pedagogical quality.
- There are **two topics per goal**. Later cycles are labelled repeated-topic practice. A new topic is not proof of independent transfer; a supported revision is not fresh assessment, and repeated practice is not delayed retention.
- This is not comprehensive reading instruction: the existing separate reading diagnostic/transfer work is not a complete goal-adaptive reading curriculum integrated here.
- No speech recording, transcription, pronunciation or fluency assessment is implemented. Speaking remains optional future work, not an enabled feature.
- Real-learner release still needs an approved data-use/consent/retention/deletion design and representative validation. No human or external educator validation is claimed.

## Run and verify without activating a provider

From `frontend`, with project dependencies installed:

```sh
npm run english:build
npm run english:preview
# Open http://127.0.0.1:4174/?experience=english-workspace
# Leave server evaluation unchecked for the device-only workflow.
```

Targeted software tests, all using invented data/mocked transports:

```sh
# frontend/
node --import tsx --test src/english/logic/essay-live/argument-workspace.test.ts src/english/logic/essay-live/workspace-profiles.test.ts src/english/logic/essay-live/workspace-lessons.test.ts
npm run typecheck
# repository root, in the configured backend Python environment
python backend/manage.py test evaluation --noinput
```

Browser coverage is `frontend/e2e/english-workspace.test.mjs`. It expects a normal preview and a separately built pilot preview (defaults ports 4190/4191; override with `EXAM_E2E_URL` and `EXAM_PILOT_E2E_URL`). Run `node --test e2e/english-workspace.test.mjs` from `frontend` after starting both. Tests cover device persistence, mocked server feedback and pilot exclusion; they do not establish real-provider accuracy or readiness for real learners.
