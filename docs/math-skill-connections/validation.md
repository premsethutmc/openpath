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

## Declared teaching / typed diagnosis batch

The local batch extends the existing contracts and integrates three existing TP-ALG-01 candidates. It does not approve content. Scope/target/cache/phase and saved replay regressions cover actual `learnerState` selection; the existing Year `Learn.tsx` consumes that selected strategy and records its ID without a new UI. The prior addition/triangle browser evidence above remains representative, not whole-curriculum certification.

- Full frontend typecheck passed; the mathematics configuration passed again after the final diagnosis hardening. Year test build passed.
- The Node 22 fixture that failed in PR97's earlier CI now uses a real served angle strategy, with a selectable-before-teaching positive control and displayed-exposure exclusion afterwards. It passes on Node 22.18.0 and Node 24.19.0. The failure was module-instance isolation in the injected fixture, not evidence that a shown example was accepted at runtime.
- Independent contract review: 24 scoped teaching/connection tests passed on Node 24; the prior 22-test batch also passed on Node 22.18.0. Thirteen final typed-diagnosis/contrast/malformed-input tests passed. The integrated Node 22 aggregate is the final combined authority.
- `/tmp/openpath-venv/bin/python manage.py test family.test_kernel_grader family.test_grader_teaching family.test_foundation_pathway family.test_math_foundation --noinput`: 23 passed. Trusted grading, immutable server decisions and saved pathway behavior remain intact.
- Trusted grader rebuilt with the existing build command: bundle prefix `db4db0c8696a`, 212 inputs. Every recorded source hash and bundle hash matched after generation.

Generated consistency used the existing `familySpec`, `validateFamily`, `pool`, `problemOf`, `synthesise`, `validateModule` and `checkCompetency` functions for the affected inputs. Unchanged family/module outputs were reused. The initially started full unchanged-family specs/coverage runs were stopped before writing output; they are not reported as passing. Existing CI still runs the full configured pipeline, without workflow changes.

| Family | Fingerprint | Deterministic / property / boundary cases | Server answer IDs |
|---|---|---:|---:|
| adfcmp | `9b4357e8` → `0b4d9738` | 500 / 400 / 20 | 1000 unchanged |
| aeperar | `45529e43` → `a90a733b` | 400 / 400 / 16 | 1200 unchanged |
| aedecc | `cc507e15` unchanged from local repair | 300 / 400 / 16 | 600 unchanged |
| ahid | `e54c66e1` unchanged from local repair | 333 / 400 / 16 | 999 unchanged |

All four families pass; pool sizes, exclusions and answer tables are unchanged. In this batch only adfcmp/aeperar spec and server fingerprint rows differ from the prior local repair head. The existing coverage report's four fingerprint lines were refreshed, including the two earlier explanation repairs. The compiler's stored criteria equal `checkCompetency` for all four affected competencies; unrelated curriculum inputs, marking parity and coverage classes remain unchanged. `families-parity.ts` generated 2,465 rows (2,444 supported) with no diff. The identities library exactly equals `synthesise` and passes module validation. Explanation sync reports zero additional revisions after the three pending-review candidates were registered (1,530 records total); existing review history is preserved.

Numeric skill-connection validation remains a stated limit. Ordered-tuple diagnosis does not imply a connected tuple teaching/retention loop. Coefficient-fill identities still do not grant full-expression working authority. The audit now has seven mechanically connected answer chains, not seven completed topics; 331 absent precise mappings do not mean 331 absent product features.

The integrated run exposed an existing recovery-path assumption when typed tuple diagnosis became readable: after prerequisite support and a failed retry, recovery returned again instead of teaching the original skill. The fix falls through to the existing own-skill cycle, preserving the initial return, same-skill path, review gate and retry bound. The unchanged policy assertions pass (5/5 on Node 24); final Node 22 focused results and aggregate outcome are recorded below.

Final focused command on Node 22.18.0: `node --import tsx --test src/journey/declared-teaching.test.ts src/journey/diagnosis-answer-contract.test.ts src/journey/skill-connections.test.ts src/journey/foundation-remediation.test.ts src/journey/policies.test.ts src/journey/generator-explanation-repairs.test.ts` — **54 passed, zero failed** after the recovery fix. Final rebuilt-bundle integrity plus foundation pathway checks — **5 passed**. No assertion was removed or weakened for the recovery failure.

Latest Claude handover `7e89e078` was inspected read-only without rerunning its closed validation suites. `make.attempt` and JSON round-trip preserve all three checked fraction forms (`8/18`, `4/9`, and spaced `8 / 18`). This validates raw-form preservation, not the unimplemented written-form trigger. The five condition-bearing package limitations and semantic freshness boundary are recorded in the existing handover assessment; no further package was registered.
