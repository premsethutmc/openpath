# Essay-to-diagnostic workflow

This is the essay studio's path from an essay to diagnostic questions. It reuses the existing parts:

- the server's provider gateway and LLM client;
- the learner's event ledger;
- the framework and Grade 8 profile;
- the diagnostic rules, journey planner and essay profile.

Nothing here is a second engine.

Real-child essays stay **disabled**: the studio uses only synthetic essays, on its device-only synthetic profile.

## What happens

| Step | What runs | Where |
|---|---|---|
| 1. Write an essay | Any typed text in the studio (`?experience=essay-live&evaluator=server`, developer account) | `ui/essay/EssayLive.tsx` |
| 2. Find suspected competencies | `essay-observe.v2` through the server gateway. The core keeps only observations whose quotes are in the essay word for word. Profile `openpath.g8-writing@2` adds **Plurals and countability** (an existing framework leaf), so singular/plural noun errors are observed. | `backend/evaluation/essay.py`, `core essay/analysis.ts` |
| 3. Dashboard | Each competency with its quoted evidence and corrections, its gap status and the recommended next step | Skills screen |
| 4. Five fresh questions | The learner picks a suspected competency, and `essay-questions.v1` goes through the same gateway. The request carries the competency's descriptors and misconceptions, the essay's quotes for it, and every bank or earlier question to avoid. No learner identity is sent. | `core essay/questions.ts`, `prompts/essay-questions.v1.md` |
| 5. Checks before anything is asked | The core runs three kinds of check, and **one failing question rejects the set**. The rejected attempt is recorded with its reasons and can be retried. | `validateQuestionSet` |
| 6. Ask, without revealing answers | One question at a time. The page says only "Answer recorded" until all five are answered; then each answer, the key and the explanation are shown. | Questions screen |
| 7. Evidence and profile | Each answer is an ordinary evidence event: question id and version, the item's competency, and `provenance@1`. The existing diagnostic rule then confirms or weakens the gap, which updates the provisional profile. | ledger, `gaps.ts` |
| 8. Next activity | `recommendNext` chooses from four options: learn (lesson, then practice, then a check), practise and check, check another skill, or write again. It shows what earlier essays showed for the same competency. "Start learning" runs the existing journey planner. | `core essay/recommend.ts`, `journey.ts` |
| 9. Reload and a second essay | The questions are stored in the learner's own record (an essay `questions` record), so a reload rebuilds the same content and profile. A second essay's hypothesis cites the earlier essay. Its request avoids the first set, and no question is asked twice. | `Learner` (`withRecordedQuestions`) |

The three kinds of check in step 5:

- **Structure:** the format, exactly one blank, 3–4 distinct options or accepted typed answers, Grade 8 lengths, a band within 1.5 of the target, the framework's misconception ids, and no text addressed to a marker.
- **Answer-key consistency:** the stated correct sentence equals the stem with the key filled in; no distractor gives the same sentence; the explanation names the key.
- **Duplicates:** within the set, against bank and earlier generated questions, against lesson examples, and against the learner's own essay sentences.

## Why generated questions can never establish mastery

1. Every accepted question is an item with `evidence_status: "provisional"`, `difficulty_source: "model_estimate"` and a `model_generated` record. The record names the set, request, evaluator, essay and checks passed. Content validation refuses a model-generated item that is not provisional.
2. The engine's existing content-validation gate **holds** every answer to a provisional item. The answer is scored and kept, but no estimate changes. Without an estimate change, nothing can be demonstrated or verified. No estimator rule was changed.
3. The allocation never uses provisional items for independent checks or retention. The journey never reuses them: they are reserved by the diagnostic.
4. Nobody has reviewed these questions, and no part of the app says otherwise.

Tested in K8 (core), ESSAY-DIAG (studio) and the browser test below. For example, three rounds of right answers spread over weeks leave the competency `not_demonstrated`.

## Tests (deterministic, mocked model)

The model's outputs are fixtures in `frontend/e2e/fixtures/essay-diagnostic-workflow.json`. They contain:

- Karthik's synthetic essay on the Chithirai Festival in Madurai;
- a second essay, about sports day;
- observations for both;
- two rounds of plural questions and one round of agreement questions.

They are not model outputs and measure no model.

```sh
# core and studio
cd packages/english-core && node --test test/k8-generated-questions.test.ts
cd frontend && node --import tsx --test src/english/logic/essay-live/diagnostic-workflow.test.ts

# browser, against a mocked server
cd frontend && npm run english:build
node e2e/lib/essay-model-mock.mjs gateway 8790 &
PORT=4192 API_TARGET=http://127.0.0.1:8790 npm run english:preview &
ESSAY_DIAG_URL=http://127.0.0.1:4192 ESSAY_MOCK_URL=http://127.0.0.1:8790 npm run essay:e2e-diagnostic
```

CI also runs the same browser test through **Django's real gateway and LLM client**. There, `essay-model-mock.mjs provider` stands in for the Anthropic Messages API on `http://127.0.0.1:8791`. The client now accepts plain http only to this machine (loopback); everything else must be https.

## Live-model testing path (needs the owner's approval: paid)

No paid call has been made.

1. Owner approves the provider, model, a dedicated key and a spending cap (HUMAN_DECISIONS H-B1). Also set a workspace spend limit in the provider console.
2. On a development server, set the environment:
   - `OPENPATH_ESSAY_EVALUATOR=llm`
   - `OPENPATH_LLM_PROVIDER=anthropic`
   - `OPENPATH_LLM_MODEL=<model>`
   - `OPENPATH_LLM_BASE_URL=https://api.anthropic.com`
   - `OPENPATH_LLM_API_KEY=<key>`

   Keep `OPENPATH_ESSAY_DAILY_REQUESTS` and `OPENPATH_ESSAY_DAILY_TOKENS` low (for example 20 requests and 100000 tokens).
3. Sign in with a developer account, and open `/?experience=essay-live&evaluator=server`.
4. Paste the fixture essay and follow the workflow. One essay plus one question set is two calls.
5. Record the following, and do not claim accuracy from it:
   - which questions passed or failed the checks, and why;
   - tokens, from the server's `EssayEvaluationRecord`.

   The synthetic benchmark runner (`backend/evaluation/benchmark_run.py`) is the measured path for observations.

## Limits

- Question quality is checked only mechanically. An educator still has to judge correctness, ambiguity and difficulty before generated questions could count as evidence; that would be a separate decision.
- The band of a generated question is the model's estimate.
- "Weakened" can follow from right answers on generated questions near the target. That changes only the essay's suggestion, never a skill level.
- Plurals and countability's band-5 target is provisional, like every other target.
