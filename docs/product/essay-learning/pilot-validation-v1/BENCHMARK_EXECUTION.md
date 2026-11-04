# LLM essay benchmark: execution instructions and cost controls

**Status: ready to run, not run.** No paid call has been made. No model accuracy is claimed: the only measured
evaluators are the synthetic reference and the local pattern stand-in. Every essay and rewrite is **synthetic**
(`content/english/essay/benchmark/`), written by the development team. Agreement with it is agreement with one
synthetic reference, not with educators (that comes from `essay-validation-v1/`).

## 1. What was checked in the PR #45 evaluator

The client is `backend/evaluation/llm.py`; the server's gateway is `backend/evaluation/essay.py`. It was checked against
Anthropic's Messages API documentation (platform.claude.com, read 18 October 2026). The OpenAI-compatible adapter is
unchanged and was not checked against a live service.

| Area | Finding | Change on this branch |
|---|---|---|
| Request format | `POST {base}/v1/messages`, headers `x-api-key`, `anthropic-version: 2023-06-01`, `content-type: application/json`; `system` top-level; `messages` with one user turn; `max_tokens`. Matches the docs. | none |
| **temperature** | The client always sent `temperature: 0`. The docs say Claude models from 4.7 onwards **reject a non-default temperature with 400**, so every call to a current model would have failed. | `temperature` is now optional and not sent by default (both providers). |
| Response parsing | Text blocks are joined; `usage.input_tokens` and `usage.output_tokens` are read. Matches the docs. | none |
| Stop reasons | `max_tokens` was handled; `refusal` and `model_context_window_exceeded` were not. | Both now fail clearly ("the model declined to answer", "larger than the model's context window"). |
| Authentication | The key comes only from the server environment (`OPENPATH_LLM_API_KEY`). It is never logged, stored or returned (tests check this). `x-api-key` is still supported; `Authorization: Bearer` is the newer form. | none |
| Timeouts | One timeout per request (60 s). The docs advise streaming for requests over 10 minutes; essay calls are far shorter. | none |
| Errors | Every non-200 answer became "status N", and the provider's error type was lost. Nothing was retried. | The error **type** (e.g. `rate_limit_error`) is kept; the message never is, as it could echo input. Transient failures (connection, 429, 500, 504, 529) are retried with backoff, `OPENPATH_LLM_RETRIES` times (default 1, at most 3). 400, 401, 403 and 413 are not retried. |
| Spending limits | The server has daily caps (`OPENPATH_ESSAY_DAILY_REQUESTS` 50, `OPENPATH_ESSAY_DAILY_TOKENS` 300,000), a maximum answer length (`max_output_tokens` 4,000), an input cap (60,000 characters), and synthetic-only, developer-only access. | The benchmark runner adds a per-run dollar cap (below). |

Two provider-side controls are not in the code: a workspace spend limit in the provider's console (recommended) and
the tier spend cap. When one is reached, the API answers 400 or 429. The runner records that as a failure and the
scorer counts it as an essay that was not accepted.

## 2. The run

The runner is `backend/evaluation/benchmark_run.py`. It uses the same client and the same versioned prompts
(`essay-observe.v2`, `essay-rewrite.v2`) as the server, and the requests built by the TypeScript core exactly as the
app builds them. It needs neither Django nor a database.

```sh
# 1. requests (15 essays, 3 rewrites)
node tools/english/essay-benchmark.ts --requests > /tmp/bench-requests.json

# 2. dry run: the default; sends nothing, needs no key
cd backend
python3 -m evaluation.benchmark_run --requests /tmp/bench-requests.json --price-input 2 --price-output 10

# 3. live run: only after the owner approves the provider, model, key and cap (decision H-B1)
OPENPATH_LLM_PROVIDER=anthropic OPENPATH_LLM_MODEL=<model id> OPENPATH_LLM_BASE_URL=https://api.anthropic.com \
OPENPATH_LLM_API_KEY=<key> python3 -m evaluation.benchmark_run --requests /tmp/bench-requests.json \
  --price-input <USD/MTok in> --price-output <USD/MTok out> --max-cost-usd <cap> \
  --live --approved-by "<name, date>" --out-dir /tmp/bench-run

# 4. score
cd .. && node tools/english/essay-benchmark.ts --recorded /tmp/bench-run/recorded.json --md
```

A live run is **refused** unless all of these are given: `--live`, `--approved-by`, both prices, a cap above zero, and
a valid provider configuration with a key. By default, each essay is judged once and each rewrite three times
(`--repeats-rewrite`), so the run makes 24 calls.

### Outputs (written to `--out-dir`, never the key)

| File | Contents |
|---|---|
| `recorded.json` | The first answer for each essay and rewrite, in the scorer's `--recorded` format. A failed call leaves its item missing, and the scorer counts it. |
| `runs.jsonl` | Every answer, including the repeats. It contains model output about synthetic essays only. |
| `usage.json` | One line per call: status, input and output tokens, latency, and the error (type only). |
| `summary.json` | Calls, answered, failed, unparseable, tokens, **actual cost**, the approval line, where the cap stopped the run, and rewrite consistency. |

### What the report gives (the brief's list)

| Measure | Where |
|---|---|
| Error precision and recall | Scorer: "Error precision", "Error recall (found/required)" |
| False-positive observations | Scorer: errors marked on valid text and on clean essays; "Error precision" |
| Competency-level agreement | Scorer: agreement and Cohen's κ per essay × competency |
| Unsupported or hallucinated observations | Scorer: "Rejected by validation" (quotes not in the essay, wrong competency, malformed answers) and essays not accepted |
| Rewrite evaluation consistency | Scorer: exact and within-one agreement with the reference ratings. Runner: share of dimensions rated identically across the three repeats (`rewrite_consistency`) |
| Token usage and cost | Runner: `summary.json`, `usage.json` |

## 3. Cost

The dry run's estimate for 24 calls is about **71,600 input tokens** (characters ÷ 3.5, rounded up), about 28,800
expected output tokens, and at most 96,000 output tokens (24 × 4,000).

| Model (list price per million tokens, input / output, read 18 Oct 2026) | Expected | Worst case |
|---|---|---|
| Claude Haiku 5.5 ($0.10 / $0.50) | ≈ $0.02 | ≈ $0.06 |
| Claude Sonnet 5.5 ($2 / $10) | ≈ $0.43 | ≈ $1.10 |
| Claude Opus 5.5 ($4 / $20) | ≈ $0.86 | ≈ $2.21 |

The prices are inputs to the runner, not built in. Check them on the provider's pricing page on the day of the run.
The Batch API's 50% discount is not used: the runner calls synchronously so the server path is what gets measured.

### Cost controls

1. Dry run by default. A live run needs explicit flags and the approver's name.
2. **Per-call stop rule:** before each call, the run stops if the cost so far plus that call's worst case (its input
   estimate plus `max_output_tokens`) would exceed `--max-cost-usd`. So the actual cost cannot exceed the cap, unless
   the 3.5 characters-per-token estimate is badly wrong for that model's tokenizer. A recommended cap is **twice the
   expected cost, rounded up** (for example $1 for Sonnet 5.5).
3. `max_output_tokens` (4,000) bounds every answer.
4. Retries are bounded (`--retries`, default 1). A retried call is paid for once per attempt that the provider answers.
5. Also recommended: a workspace spend limit in the provider console, and a key used only for this run, revoked
   afterwards.

## 4. Interpreting the result

- A run measures **one model, one prompt version, on 15 synthetic essays**. It can show a model is unusable; it cannot
  show it is accurate enough for children. That needs the educator-annotated essays (`essay-validation-v1/`) and the
  threshold the owner sets (decision D6 in PILOT_SAFETY_CHECKLIST.md).
- Report the model id, date, prompt versions, `summary.json` and the scorer table together.
- Do not compare runs that used different prompt versions or benchmark versions.
