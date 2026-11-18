# Writing evaluator acceptance, not a release certificate

The workspace already routes original writing through the server evaluator into tentative grammar observations and separately grounded argument questions. Grammar findings can seed existing verification/teaching; argument findings can seed the isolated concept plan. The unresolved problem is **whether a real model gives correct, helpful feedback**, not merely whether JSON passes a validator.

This increment makes that gap measurable without pretending to close it. No provider has been enabled or called for this work. Real learner text remains refused. No model accuracy, learner benefit, exam equivalence or release readiness is established.

## What is covered

`workspace-writing-acceptance-v1.json` contains 16 invented cases:

- Eight language samples: repeated agreement errors, tense errors, articles/prepositions, correct writing, valid alternatives, a one-off lapse, British/Indian usage including maths and lakh, and legitimate changes of time frame.
- Eight argument samples: circular reasoning, causal/generalisation leap, unsupported precise prediction, an explicit fair objection, a defensible assigned opposing position, a short school explanation, embedded malicious instructions, and fresh transfer without prior-draft context.
- All five goal labels occur. That is contextual coverage, not an exam syllabus or calibrated level. Most samples use the developing preference, with selected school samples using foundation; stretch is not benchmarked.
- Existing baseline annotation repaired: “the traffic near the market are” is an agreement error, but does not establish attraction to the singular noun *market*. Its unsupported misconception label was removed.

References are AI-authored candidate annotations. Independent AI review found and corrected that existing reference defect. They are **not educator gold labels**. A missing reference does not make a model finding wrong; an anchor match does not make its explanation correct.

## Safe, usable run path

Generate requests through the **actual frontend/core builders and selected workspace profiles**:

```sh
# From repository root; frontend dependencies must be installed.
node --import ./frontend/node_modules/tsx/dist/loader.mjs frontend/scripts/workspace-writing-acceptance.mts > /tmp/workspace-requests.json
python backend/manage.py workspace_writing_benchmark \
  --requests /tmp/workspace-requests.json --out /tmp/workspace-dry.json
node --import ./frontend/node_modules/tsx/dist/loader.mjs frontend/scripts/workspace-writing-acceptance.mts \
  --recorded /tmp/workspace-dry.json > /tmp/workspace-dry-score.json
```

Default mode validates the manifest and makes **zero provider calls**. Its score correctly has every case unavailable, zero matched required anchors and `releaseReady: false`. It must not be presented as a successful model evaluation.

An approved live run uses the same command with these additional flags:

```sh
--live --approved-by '<actual approval reference>' --user-id <existing-developer-id> \
--max-calls 16 --price-input <USD-per-million-input-tokens> \
--price-output <USD-per-million-output-tokens> --max-cost-usd <approved-cap>
```

Use a **new output filename** for each run. Verify current provider pricing before choosing the budget. The caller must already have explicit approval for the provider/key and spending. The command does not create accounts, grant developer access, configure credentials or turn on the evaluator. It refuses disabled/replay configurations in live mode.

The command invokes `EssayEvaluationView` **in process** as an existing active developer. It exercises the actual request validation, canonical server prompts, provider client, shared atomic quotas and output validation. This is not a browser/network/authentication-handshake test. A separate browser flow is still necessary before release.

Every call retains its full conservative cost reservation, including failed responses. Input reservation uses UTF-8 bytes plus an envelope allowance; output uses the configured token cap. Prices are caller-supplied, not independently verified billing guarantees. There are no automatic retries. Shared daily limits still apply. Operational refusals stop the run; rejected model output is recorded as unavailable/rejected, never substituted with a pattern evaluator. Reported usage and reserved bounds remain separate.

An output file is exclusively created before any provider call. Each request is checkpointed as pending before dispatch and completed afterwards. If interrupted, inspect the pending case and provider/usage records before deciding whether a rerun would spend twice. Existing output is never overwritten by a new invocation. Reports contain synthetic drafts/feedback; files are created with owner-only permissions and should remain out of git.

## Evidence and review

The recording pins request, reference-file and server-policy-source digests, plus per-case effective prompt hashes and non-secret model/configuration metadata. The scorer refuses changed references/policy sources and mixed evaluator identities. This is local provenance, not cryptographic proof that a provider ran. Keep the command report and source commit together.

The scorer uses **the actual client validators**. It reports separately:

1. Missing/refused responses and whole-output rejections.
2. Accepted observations versus rejected observations.
3. Required anchor/category agreement, with unavailable cases retained in the denominator.
4. Flags overlapping protected valid text, including short quotes within protected sentences.
5. Unmatched findings needing review, not automatically labelled false positives.
6. Complete accepted feedback for qualitative review.

Anchor matching requires substantial overlap in both directions and unique occurrences; a common word or broad whole-essay quote cannot earn credit. Required matches are one-to-one. Ambiguous repeated spans receive no match credit. Protected-text alarms are intentionally more conservative and trigger even for a short allegation within a protected span.

**Review every response**, especially whether it:
- distinguishes genuine grammar errors from valid Indian/British variants and style;
- identifies a real reasoning gap instead of disagreeing with the writer;
- preserves uncertainty, does not invent facts or supporting numbers;
- uses short age-appropriate questions and respects a short task's scope;
- offers a thinking prompt rather than a completed argument or replacement paragraph;
- treats revision/transfer feedback as tentative, not improvement or mastery.

No aggregate threshold currently authorizes release. Live runs, repeated-model consistency, broader skill/difficulty coverage, representative consenting learners and a privacy/retention/deletion design are still open.

## Runtime improvements prompted by review

Both server and client now reject duplicate argument findings for the same area and exact quote, even when the wording of the question differs. This prevents repeated concerns from spawning redundant practice tasks. The server prompt explicitly asks for age-appropriate Grade 7 language, respects the assigned side, and avoids imposing statistics/citations/counterarguments on every short draft. Prompt instructions are not proof of compliance.

## Verification

```sh
cd frontend
node --import tsx --test src/english/logic/essay-live/workspace-writing-acceptance.test.ts
npx tsc --noEmit -p tsconfig.english.json
cd ..
python backend/manage.py test evaluation --noinput
```

All automated provider tests use mocked transport. They test gating, actual prompt/endpoint use, quota accounting, fail-closed responses, interrupted-run checkpoints, stale provenance and scorer arithmetic, **not linguistic performance**.

The browser-backed CLI lives under `frontend/scripts`, not the Node-only `tools/english` core compilation boundary. Both the frontend English and standalone English-core typechecks are required.

## Scorer v2: quoted context is not necessarily the edited error

`strictMatchedRequiredAnchors` preserves the original half-overlap baseline.
The primary reference-agreement count additionally accepts a bounded, unique
quoted context when its localized token edit lies wholly within a reference
anchor. Full-draft rewrites, ambiguous repeated quotes, pure insertions/deletions,
and edits outside the anchor receive no extra credit. This is lexical alignment,
not proof that the correction is linguistically right.

Protected-span overlaps wholly outside the changed tokens remain visible in
`contextOnlyProtectedOverlaps`; actual changed protected text and observations
without a usable correction remain conservative `protectedFlags`. Review both.
Missing and rejected cases stay in the denominator. `releaseReady` and
`liveAccuracyEstablished` remain false. Never equate an alignment percentage with
model accuracy or learning effectiveness.

The argument system prompt explicitly requests JSON. Object-shaped examples
alone do not satisfy OpenAI Chat Completions JSON mode's explicit JSON instruction
requirement. Mocked transport tests exercise this contract across all argument
stages; they do not establish live argument quality.
