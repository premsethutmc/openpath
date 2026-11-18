# Provider usage metadata and estimates

Offline instrumentation for explicitly authorized API fallback evaluation. It does
not implement routing or send a provider request. Deterministic-engine-first routing
is separate. All regression tests use invented keys and mocked transports.

## What is recorded

The essay metadata record stores provider-reported input/output counts plus nullable
cached-input, cache-creation-input and reasoning-output counts. A missing field is
`null`, not zero. Explicit zero remains zero. No prompts, output text, keys or raw
provider response objects are added to the database. Invalid numeric usage (boolean,
negative, noninteger or impossible subset) fails closed without echoing its contents.

- OpenAI-compatible Chat Completions: `prompt_tokens` is total input;
  `prompt_tokens_details.cached_tokens` is a subset. `completion_tokens` already
  includes `completion_tokens_details.reasoning_tokens`; never add reasoning again.
  Other services using this wire contract are assumed to use these same semantics;
  counts remain provider claims, not independently measured tokens.
- Anthropic: `input_tokens` excludes cache reads and writes. Total input is the sum
  of that field, `cache_read_input_tokens` and `cache_creation_input_tokens`. If one
  is absent, the total is unknown. Reasoning usage is not inferred from output size.

Validated numeric usage is also retained when a 200 response is unusable, such as
an output-limit stop or rejected model output. A network error or response with no
attributable usage remains unknown. Metadata on an error contains no model prose.

Migration `0004_provider_usage_details` adds nullable details and makes new total
fields nullable. Existing stored zeros are not rewritten: their provider contract
is blank/unknown, so they cannot be presented as newly verified usage or invoices.
No production migration is run as part of this work.

## Estimates and limits

The workspace benchmark's accounting version 2 replaces `reported_cost_usd` with
`standard_rate_estimate_usd`, plus a separately named known-usage subtotal and
unknown-call count. This is total known input/output multiplied by caller-supplied
standard rates, NOT an invoice. It applies no cache discount, cache-write premium,
fee, tax, tier or other billing adjustment. A whole-run estimate is null if any
call has unknown usage. Reasoning is not billed twice by the estimate.

Each attempted request retains its full conservative reservation regardless of
failure or observed usage. The workspace runner stops on the first non-200 or
unknown-usage response; further runs require a deliberate decision. It reports the
actual effective system and user-payload hashes, including compact-mode changes;
the canonical request manifest remains separate. `configuration.compact_observe`
records the opt-in setting. Neither a hash nor byte saving proves feedback quality.

The essay daily token guard pauses further calls for the day if a prior real-LLM
record has incomplete totals or unknown provider semantics. Refused requests and
replay records are excluded. Reported cache input is added only for Anthropic;
OpenAI cached/reasoning subsets are never added twice. Request quotas remain active.

Two legacy consumers receive narrow compatibility guards: the word-problem reader
keeps its charged request and ordinary refusal when missing totals cannot fit its
old aggregate table (no teaching/scoring changes); the older standalone benchmark
uses separate estimated reservations and nullable totals/estimates instead of
arithmetic on unknown values. Its `reserved_estimated_cost_usd` uses a character-ratio
heuristic, NOT a rigorous token bound or hard billing cap. It disables automatic
paid retries and stops after a failure, unknown usage or a per-call estimate above
its reservation. Its legacy `cost_usd` label is explicitly documented as an estimate,
not an invoice; known-only subtotals have distinct names.

## Sources

- [OpenAI Chat Completions response usage](https://platform.openai.com/docs/api-reference/chat/object)
- [Anthropic prompt-caching token breakdown](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)

Source semantics, database persistence, failed-response metadata, missing-vs-zero,
subset validation, standard-rate arithmetic, actual compact wire hashes, quota
failure behavior and cross-consumer safety are covered by offline tests. These
checks do not establish API availability, actual charges, savings or learning gains.
