# Validation

Synthetic learners only. No learner-outcome claim. No global policy activation.

## Local checks

- `npm run typecheck`: main and English configurations passed; newly added fixture typing errors in the mathematics configuration were corrected. Final `tsc --noEmit -p tsconfig.mathematics-integration.json` passed.
- `node --import tsx --test src/journey/skill-connections.test.ts src/journey/foundation-remediation.test.ts`: 20 passed after the independent review fixes. Tests cover parameter partitions, legacy prerequisites, ambiguous metadata, unsupported working, saved same-skill check/retention/recovery, assisted block completion, actual pathway selection, wrong-skill teaching/probe reconstruction and displayed-example exclusion.
- `npm test`: integration aggregate result recorded below when complete. Focused tests cover final review changes made while the aggregate was running; exact-head CI is the final aggregate authority.
- Django foundation/pathway checks: 10 passed. Trusted grader/teaching checks: 13 passed. Final rebuilt-bundle integrity and pathway checks: 5 passed.
- Trusted grader rebuilt with `ESBUILD=./frontend/node_modules/.bin/esbuild node tools/mathematics/server-grader/build.mjs`; all 212 recorded input hashes match the current files. No answer/content tables were changed. The source modules affect the bundled re-entry runtime, so the bundle and manifest are committed together.
- Year test build passed. Existing Django-backed pathway browser journey passed 20 answers across eight topics, replay and fresh login. Existing geometry browser journey passed trusted bounded working, lesson display and persisted decision reload.
- New `PATHWAY_API=http://127.0.0.1:8198 node --import tsx e2e/skill-connections.test.mts` passed the two exact-skill UI chains below. The API used `OPENPATH_TEST_CLOCK_FILE=/tmp/connections-clock.json`; the existing synthetic-only clock moved forward eight days. Seed successes went through the real server grader, not client-authored decisions. No stored record was redated. This test begins with a synthetic delivered-teaching record, exercises guided practice/check/retention through the actual UI, and verifies immutable decisions after reload; it is not an unscripted learner study.

| Domain | Guided task | Fresh check | Delayed check | Persistence |
|---|---|---|---|---|
| Addition total | `gen:aaadd:17,3` | `gen:aaadd:4,2` | `gen:aaadd:4,12` | 10 events, reloaded |
| Triangle angle sum | `gen:ahtri:36,74` | `gen:ahtri:25,65` | `gen:ahtri:56,75` | 12 events, reloaded |

## Independent review

A separate read-only reviewer found and verified fixes for historical prerequisite classification, same-family/different-parameter hypothesis reconstruction, drift after guided work, assisted-check loops, stale teaching blocks, investigation ownership, mismatched displayed examples and reused solved examples. Final review reported no remaining blocking finding; broad tests were not rerun by that reviewer.

## Publication verification

Separate stacked draft, base dependency PR96. Git push is available. Terminal GitHub CLI authentication is invalid and direct REST access receives a proxy 403, so GitHub connector reads are used for exact-head CI verification. These access limitations do not authorize changing CI or repository permissions.
