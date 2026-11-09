# Bounded adaptive evaluation milestone

Local branch `milestone/adaptive-evaluation-2026-11-08`, based on verified PR #118 head `c62320efa5b2105ee981e0b94fd97789e3f6e6b7`. The remote integration ref was checked before branching. No Grade 8 #119 work was fetched, edited or integrated. No push, merge, deployment or educator approval.

## Implemented scope

- Reuse `afterHelpOf` as the single qualification policy for Year tiles/totals, goal readiness, challenge availability and exam estimates. Qualified evidence is a view, never a rewritten learner record. Successful fresh performance, help provenance, later checks and later failures remain available. A completed goal now says it includes success after help, not unqualified readiness. Saved help remains qualified even when recovery is switched off; ordinary records without help retain their behaviour.
- Separate recovery availability from the test review fixture. `node scripts/build-year.mjs --deep-evaluation=integration-methods` builds a non-test, explicitly scoped evaluation; `?deep=1` is still required to activate recovery. It cannot be combined with `--test` or the general research flag. The build uses the existing `supervised-evaluation` explanation policy and real released-question checks. Ordinary builds stay off, and sitting/episode budgets remain 40/120.
- Add only `MATH.calculus.indefinite-integrals` to the existing goal adapter alongside integration methods. Synthetic tests demonstrate its exponents recovery, two fresh unaided returns and identical saved-record resume. Non-test evaluation remains limited to the integration-methods pathway.
- Reuse the existing diagnostics, pending explanations and check pools for this small route. No missing wiring was found in the exercised route, so no duplicate lessons or question banks were authored or regenerated.
- Educator resolution atomically creates one server-owned handover acknowledgement linked to its recovery report and records an audit event. Existing handover selection, expiry, consumption and server validation provide one fresh check, never mastery. Earlier attempts are untouched. A nullable link is added by migration `0011_handoveracknowledgement_recovery_handoff`; the grader bundle/manifest were rebuilt for the shared policy.
- The learner can explicitly open that check after resolution. Reading a stop screen no longer writes a help report. Requesting help is a separate choice scoped to learner/episode. Existing family shares and separate answer-sharing consent remain enforced; no email or message is sent.

## Validation and commands

Logs and exit files: `/tmp/adaptive-logs/`; browser runner: `/tmp/adaptive-final-browser.sh`.
Commands run from repository root unless specified. Frontend test commands use `node --import tsx --test` from `frontend` (equivalently the root's `--import ./frontend/node_modules/tsx/dist/loader.mjs`).

- `npm --prefix frontend run typecheck`: passed.
- `python backend/manage.py makemigrations --check --dry-run`: passed; local migration applied successfully.
- `ESBUILD=frontend/node_modules/.bin/esbuild node tools/mathematics/server-grader/build.mjs`: passed.
- `python backend/manage.py test family.test_handoff family.test_handover family.test_learning --noinput` using `.venv/bin/python`: 54 run, 53 passed, one existing external-fixture skip.
- Recovery goal/evidence/handoff/handover batch: 50 passed.
- New milestone, handover and three recovery-module regression files: 49 passed (before the two additional milestone assertions below).
- Final milestone/evidence/maths-integration batch: 24 passed, including six new milestone tests. Covers conservative goal/exam claims, later-failure Year totals, both goal paths/resume, scope/off behaviour, one-use educator check and server replay validation, retained history, later failure and old integration contracts.
- `src/learning/historical-answers.test.ts`: two passed. No question bank, answer table, solver or educator registry changed.
- Invalid `--test --deep-evaluation=integration-methods` build rejected as expected (exit 1).
- Chromium + real Django: original goal recovery/resume and untouched-goal behaviour; no-share versus explicit help request; non-test evaluation review stop with zero answers/lessons recorded; shipped build ignores research URL switches. Final browser results are in `goal.json`, `evaluation.json`, `shipped.json` under the log directory. A stale browser expectation for unqualified goal completion was corrected to require the new qualified wording; no recovery logic was weakened.

These batches overlap and should not be summed. Full repository/English suites, PostgreSQL matrix, all research browser scenarios and hosted CI were not rerun for this bounded local milestone. The H1 fixture-dependent persistence test remains skipped without its supplied fixture directory.

## Pending educator review and limits

The selected route has diagnostics and fresh checks. Its families `subst`, `pint`, `pow` are submitted, not released. These nine existing explanations are all `pending_review`:

- Integration methods: `why_du`, `limits_table`, `powers_check`.
- Indefinite integrals: `differentiate_back`, `raise_then_divide`, `powers_and_fractions`.
- Exponents: `count_factors`, `build_up`, `facts_first`.

An educator must review the actual revisions and permitted lesson/intervention uses; release requires the existing release process. More prerequisites may be reached for other learner difficulties and retain their own gates. The non-test browser journey deliberately stops at the first unreviewed question: this is not a claim of a completed approved pilot or evidence that a real learner learned.

Server handoff availability remains independently default-off (`OPENPATH_DEEP_RECOVERY_HANDOFF=1` was used only on the local synthetic test server). The educator-resolution-to-check contract was tested across backend and frontend/server replay tests; the full two-account educator-resolution browser flow was not added. The representative browser tests cover the existing goal and the new consent/review boundaries.

Stop here for review. Publishing this local branch requires a separate user instruction. Final exact commit and saved evidence archive are recorded in the accompanying workspace handover after commit.
