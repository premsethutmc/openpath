# Proposed isolated manual evaluator job

**Prepared only. Not installed, dispatched, paid, deployment-tested or approved for secrets.**
This companion to #225 is deliberately separate from evaluator implementation.
The repository is public: workflow logs/summaries are treated as public. No raw
model feedback or request/report artifact is published. Thus this first workflow
is a limited endpoint/contract smoke run, NOT the qualitative feedback review.
Use an approved private evaluation repository/storage if full reports must be retained.

## Deployment and trust blockers

1. GitHub requires the workflow on the default branch for the documented browser
   Run workflow path. A new unmerged workflow branch is not a usable phone handoff.
   Installing it on main requires separate approval; this draft does not do that.
2. Before installing/enabling it, review workflow/helper code and the immutable
   evaluator commit `256d54f5d28cd546d0790d7001ed4ec3a307bd37`, including its
   provider transport and dependency locks. No arbitrary evaluator-ref input exists.
   The workflow runs only from main; the helper is the dispatched main commit.
3. Pre-create environment `english-isolated-evaluation`, restrict it to main,
   configure owner required approval where supported, and verify actual repository
   workflow/branch protections. These settings have NOT been checked or changed.
   Do not rely solely on YAML: workflows in a writable trusted branch are powerful.
4. Put the temporary key ONLY in that environment as `OPENAI_SYNTHETIC_TEST_KEY`,
   not a repository secret accessible to unrelated workflows. Set environment
   variable `ISOLATED_ENGLISH_EVAL_ENABLED=APPROVED` only after the review.
5. Dependency packages are version-locked but not all distributions are hash-locked;
   source/package compromise remains a trust risk. Npm scripts are disabled and no
   key is supplied during installation. No third-party Actions or caches are used.

## Phone entry, only after approval/setup

The supported route is the GitHub WEBSITE in the phone's browser, signed in as
owner: repository Settings → Environments → english-isolated-evaluation → Add
secret. Enter the key in GitHub's secret value field, never a workflow input,
chat, screenshot, commit, file attachment or public form. Desktop-site mode may
be needed for the settings UI. Official documentation supports web secret entry;
this particular account/phone screen has NOT been exercised. Do not claim the
GitHub native mobile app supports this settings operation.

Then Actions → Isolated English evaluator → Run workflow, main. Inputs are only
approval text, model ID and verified current input/output USD-per-million prices.
Approval explicitly includes a fresh temporary LOCAL test developer identity,
16 maximum calls, USD 0.25 reservation ceiling, and raw-result deletion. Existing
benchmark code is unchanged and sees an active developer in its disposable SQLite.
No server is launched. No production, learner, Render or other database is accessed.

## Limits and cleanup

- Fixed OpenAI endpoint, bounded output tokens, shared local quotas and no retries.
- Prices are caller supplied. The reservation bound is NOT a guaranteed provider
  billing cap. Verify model/prices first; account-side limits may have different
  semantics. A wrong price can defeat the intended financial bound.
- Only first workflow attempts run; reruns are refused. Another manual dispatch
  is a new spend authorization, not an idempotent retry. Concurrency serializes
  runs but is not a lifetime spending limit.
- A timeout/crash may leave a provider call billed with no complete result.
  Inspect provider usage before authorizing another dispatch. The public summary
  does not retain pending-call/raw output records after cleanup, intentionally.
- Only fixed aggregate fields are summarized. Raw subprocess output is captured
  and never printed; no model text, database, key or raw report is uploaded.
- Runner-local SQLite and reports are deleted; cleanup runs on ordinary failure.
  Hard cancellation/runner loss can prevent cleanup, so ephemeral GitHub-hosted
  runners remain part of the trust boundary. This is not cryptographic erasure.
- Cleanup cannot revoke the provider key or remove the GitHub environment secret.
  Owner must revoke the temporary key, delete the environment secret and disable
  the enable variable after the run. No admin token is provisioned for that purpose.

## Verified preparation

Seven local unittest cases exercise owner/main/first-attempt gates, model input,
finite prices, missing key and workflow topology. No paid command was run.
Python compilation is checked. Full GitHub execution, secret-entry usability and
provider behavior are deliberately untested. No feedback-effectiveness claim follows.

Sources:
- https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow
- https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-your-workflows-run/trigger-a-workflow
- https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets
- https://docs.github.com/en/actions/reference/security/secure-use
