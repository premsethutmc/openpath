# Shared server-side AI connection

English essay observation/rewrite/check-question generation and maths word-problem reading now use `evaluation.gateway`. This is an internal task service behind the existing authenticated endpoints, not a public prompt proxy. Other use cases must register a server-owned prompt, validated input/output, authorization and data-use policy before using it.

## Configuration (not enabled by this change)

Run database migrations before using the new service. On the server, an owner can explicitly select a common provider configuration:

- `OPENPATH_AI_SHARED_CONFIG=on`
- `OPENPATH_AI_PROVIDER=anthropic` or `openai_compatible`
- `OPENPATH_AI_BASE_URL`: approved HTTPS provider base URL (OpenAI-compatible bases include their required API prefix).
- `OPENPATH_AI_MODEL`: chosen provider model identifier.
- `OPENPATH_AI_API_KEY`: secret supplied only through the hosting service's secret configuration, never Git, frontend variables, browser storage or a chat message.

Shared configuration defaults off. Existing separate essay/word-problem credentials remain supported when it is off. Turning shared configuration on does **not** turn either feature on. Existing `OPENPATH_ESSAY_EVALUATOR=llm` and `OPENPATH_WORD_PROBLEMS=on` switches, authentication and data-use restrictions still apply. Missing/invalid configuration fails closed. No key is supplied, no server configuration changed and no model purchase/call made by this implementation.

## Authorization and data boundaries

Essay calls remain signed-in-developer-only and synthetic-test-only, with the existing supported rubric/protocol. This does not enable real learner essay assessment or the adult exam rubric. Maths retains account authentication, CSRF checks, request validation and its existing feature switch. The model proposes a calculation; deterministic maths logic remains responsible for solving it. A shared provider key does not broaden which account may use which task.

Transport credentials are attached only on the server. Redirects are refused, responses are size-bounded, and transport errors must not disclose credentials or submitted text. Prompts are task-owned; request callers cannot specify destinations or replace system prompts. Quota records contain date, scope and count, not prompts, answers or keys. Existing task records retain their existing metadata behavior.

## Cost and concurrency controls

`OPENPATH_AI_DAILY_REQUESTS` (default 1000) and `OPENPATH_AI_USER_DAILY_REQUESTS` (default 50) bound aggregate attempts across supported tasks, even when legacy credentials are retained. Existing essay and maths request caps also apply. Each dispatch reserves capacity atomically before transport; failed attempts remain counted. Automatic retries are disabled in the shared path, so one reservation does not silently purchase several calls. Output/input caps and timeouts remain task-specific.

These controls limit attempts, not rupee/dollar expenditure. Provider pricing, tokenization, other apps using the same key and external credential theft are outside these counters. Use a dedicated restricted provider project/key, provider-side budget enforcement where available, billing alerts and key rotation/revocation procedures as additional controls. A leaked key must be revoked at the provider; deleting it from Git is not sufficient.

## Verification and enabling later

Tests use invented fixtures and intercepted/mock transports only. Run the full backend suite, migration checks and CI before merging. Enabling an actual provider is a separate owner-configured step with appropriate data-handling permission. Validate the chosen provider/model against task schemas before real use; passing transport tests is not evidence of linguistic accuracy. No application can promise that a secret can never be stolen.
