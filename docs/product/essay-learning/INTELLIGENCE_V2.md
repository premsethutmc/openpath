# Essay Intelligence v2: what is real, provisional or unvalidated

Branch `feat/essay-intelligence-v2`, based on PR #44 (`feat/essay-integration-v1`). The engine is unchanged: the same
ledger, evidence policies, graph and estimators, and no new learner profile or scoring system. Essay observations
still never change an estimate and never verify a competency.

## Status at a glance

| Part | Status |
|---|---|
| LLM evaluator behind the server (`backend/evaluation/essay.py`, `llm.py`) | **Real code, never run against a live model.** No credentials are configured and no paid call was made. The wire formats were written from the providers' published API shapes and were not checked against live documentation in this session. |
| Structured output schema and independent validation (`essay-observe.v2`, `essay-rewrite.v2`) | **Real and tested.** |
| Rewrite evaluator (20–50 words, compared with the original and its prompt) | **Real and tested** with recorded judgements. Its agreement with a reference has not been measured on any LLM. |
| Benchmark `openpath.essay-benchmark@1` | **Real, versioned, synthetic.** It is **not educator-validated.** |
| Measured results | Pattern stand-in and a scorer self-check only. **The LLM is not measured.** |
| Grade 8 targets (band 5) | **Provisional.** See [BAND_AUDIT.md](BAND_AUDIT.md). |
| Real-child essays | **Disabled.** The server refuses anything but `data_use: "synthetic_test"`; the core refuses `real_learner`. |

## How an essay is evaluated

1. **Browser.** The studio builds an `essay-observe.v2` request (identifiers scrubbed). It is sent to the server only
   when the page is opened with `&evaluator=server` by a signed-in developer account. Otherwise nothing leaves the
   device and the recorded samples or the pattern stand-in are used.
2. **Server** (`POST /api/evaluation/essays/`, developer accounts only):
   - refuses anything that is not synthetic test data, has identifying fields, is the wrong protocol or rubric, or is
     too long;
   - checks the daily request and token budgets;
   - calls the configured adapter (`disabled` by default, `replay`, or `llm`) with the versioned prompt from
     `content/english/prompts/`;
   - returns the model's raw JSON together with its provenance (evaluator id, version, model, rubric, protocol).
   - The provider key lives only in the server environment. The browser never calls a model provider.
3. **Core validation** (`validateObservations`, independent of the model). An observation is rejected when:
   - it has an unknown competency id or an unknown field;
   - its quote is not found word for word in the essay, or is too broad to be specific evidence;
   - it has no explanation grounded in the text, or no verification flag;
   - its "correction" is identical to the quote;
   - an error and a strength are claimed for the same words in the same competency (both are rejected as contradictory);
   - it names a competency that is also listed as "not observable" (the "not observable" claim is dropped).

   A wrong rubric, a wrong essay id, or a malformed or failed answer rejects the whole analysis. Nothing is guessed,
   and the studio falls back to its local evaluator and says so.
4. **What an accepted observation can do:**
   - errors (not low confidence) can raise a *suspicion*;
   - only independent diagnostic questions can confirm a gap;
   - style suggestions never count as errors;
   - strengths and the absence of errors are shown as "not mastery";
   - a second essay adds evidence and can revise hypotheses, but cannot undo a gap the diagnostic confirmed.
   - The rewrite is recorded as **transfer evidence** (`evidenceRole: "transfer"`). It never verifies anything.

Each observation carries: competency id, exact span, kind (`error`, `strength` or `style`), an explanation, a correction
where appropriate, confidence, `verification` (`required` / `not_required`), an optional `possible_slip`, and the
evaluator and rubric version.

## Enabling the LLM evaluator (owner decision, server only)

```
OPENPATH_ESSAY_EVALUATOR=llm            # default: disabled
OPENPATH_LLM_PROVIDER=anthropic         # or openai_compatible
OPENPATH_LLM_MODEL=<model id>
OPENPATH_LLM_BASE_URL=https://…         # https only
OPENPATH_LLM_API_KEY=<secret>           # environment only, never in code or logs
OPENPATH_LLM_MAX_OUTPUT_TOKENS=4000
OPENPATH_LLM_TIMEOUT_S=60
OPENPATH_ESSAY_DAILY_REQUESTS=50        # bounded cost
OPENPATH_ESSAY_DAILY_TOKENS=300000
```

The status endpoint `GET /api/evaluation/essays/status/` reports whether the evaluator is available and why not. Before
the first real call, check the request format against the provider's current API documentation.

What the server keeps for each request, in `EssayEvaluationRecord`:

- task, protocol, adapter, model and rubric;
- the text's fingerprint and length;
- status and a short reason;
- tokens and latency.

It never keeps the essay text, the model output or the key.

## Benchmark

`content/english/essay/benchmark/essay-benchmark-v1.json` has 15 synthetic Grade 8 essays and 3 rewrites, with
reference annotations in an educator style. They cover:

- subject–verb agreement, tense consistency, aspect, articles, and prepositions of time and place;
- dependent prepositions, sentence boundaries (run-ons, comma splices, fragments) and commas;
- vocabulary and collocations, connectives and sequencing, and concision as style;
- three correct essays, valid alternatives (British/Indian spelling, singular *they*, "data is", a sentence that
  starts with "And"), ambiguous items marked `optional`, and a single possible slip.

The scorer is `tools/english/essay-benchmark.ts`. It sends every answer through the app's validation and reports:

- error precision and recall;
- style recall;
- observations rejected by validation (unsupported);
- errors on valid text and on clean essays;
- competency-level agreement (percent agreement and Cohen's κ);
- rewrite rating agreement.

**Provenance.** The essays and annotations were written for testing by the development team (an AI assistant).
**No educator has reviewed them**, so agreement here is agreement with one synthetic reference. Genuine
educator-reviewed examples are not available.

Measured on 18 Oct 2026 (`results-v1.json`):

| Evaluator | Error precision | Error recall | Style recall | Rejected by validation | Errors on valid text / clean essays | Competency agreement | Rewrite ratings |
|---|---|---|---|---|---|---|---|
| benchmark-reference (scorer self-check) | 1.00 | 1.00 (36/36) | 1.00 | 0 of 48 | 0 / 0 | 1.00 / κ 1.00 | not measured |
| pattern stand-in (`patterns@0`) | 1.00 | 0.11 (4/36) | 0.75 | 0 of 11 | 0 / 0 | 0.97 / κ 0.46 | not measured |
| **LLM evaluator** | **not measured** | | | | | | |

How to read these numbers:

- The reference row only shows that the scorer is consistent.
- The pattern stand-in is precise but finds about one error in nine. It is a demo tool, not an assessment.
- The high percent agreement is inflated by the many cells where neither side reports an error; κ is the more honest
  number.

To measure the LLM once an owner approves a key and the cost:

1. Run `node tools/english/essay-benchmark.ts --requests` to produce the requests.
2. Send each one through the server.
3. Save the answers as `{evaluator, observations, rewrites}`.
4. Run `--recorded FILE`.

## Tests added

- **English core:**
  - K2-1 to K2-8: v2 schema accepted; invented quotes, unknown competencies and malformed output rejected;
    contradictions; style, low-confidence and correct essays give no gap and no mastery; evaluator failure;
    gateway provenance mismatch; v2 rewrite as transfer evidence; cross-essay persistence.
  - K3-1 to K3-4: benchmark well formed; scorer self-check; unsupported and false-positive accounting with recorded
    output; every target provisional.
- **Backend:**
  - `test_llm` (plain unittest): wire formats, limits, text-free errors, the key is never shown.
  - `test_essay` (Django, runs in CI): off by default, developers only, synthetic only, nothing stored, failures give
    502, budgets give 429, missing key means unavailable, malformed or identifying requests refused, replay adapter,
    rewrite task.
- **Frontend:** studio connected to the gateway (v2, any rewrite judged as transfer evidence); gateway failure is
  recorded and the studio falls back.

## Not done (out of scope or needs approval)

- No live model call, no credentials and no cost.
- No educator review.
- No real-child data.
- No UI beyond labelling which evaluator ran, style suggestions and the "about 50 words" hint.
- The band-audit recommendations are not implemented.
