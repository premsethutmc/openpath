# Actual validation — 2026-10-18

Environment: Node 24.19.0, installed repository TypeScript/tsx/esbuild/React toolchain, system Chromium, Python 3.12 and SymPy 1.14.0. Local results are distinct from GitHub CI execution.

| Check | Actual result |
|---|---|
| `npm run typecheck` (both existing TS configurations, including imported math package) | Passed |
| `node --import tsx ../tools/mathematics/validate.mts` | Passed: 200 nodes, 200 prerequisite edges, six explicitly justified roots; zero reported graph/mapping/program/family errors |
| `npm test` | **256 passed, 0 failed**, including 26 mathematics tests and 230 existing frontend/core-engine integration tests |
| Seeded mathematical invariants | **7,168 generated cases** (14 families × 512 reproducible seeds), plus batch duplicate/exhaustion and invalid-seed checks |
| Exact answer equivalence | Rational sign/decimal/fraction normalization; polynomial expansion and constant division; unsupported expressions rejected; root-set order and duplicates checked |
| Independent SymPy reference | **1,024 passed** (512 polynomial simplifications + 512 derivatives), SymPy 1.14.0 |
| Math esbuild build | Passed; static isolated `dist-mathematics` output |
| `node --test e2e/mathematics.test.mjs` | **9 passed, 0 failed**: 320/360/412 phone widths, expanded navigation/refresh, Enter submission, interrupted answer and support flags, persistent stages, separate exam/school progress, storage failure/corruption, empty/scaffold states, structured export, screenshots; no external network requests during practice |
| English production build | Passed, existing English entry point unchanged |
| Existing English browser journey suite | **9 passed, 0 failed**: profile/placement, lessons, resume, export/import, retention, offline, mobile keyboard and multiple skills |
| Tamil isolated regression | At untouched Tamil commit `f4dc8d5a4ea4b66e76253a0b55ceed5ade9c3c44`, archived outside the working checkout: **12 unit + 5 browser tests passed**, build passed; no merge or source modification |
| Additional shared English core suite | **203 passed, 2 failed** out of 205; see baseline qualification below |
| Whitespace and scope | `git diff --check` passed; existing tracked production source, English/Tamil, estimator and gate files unchanged. Only the frontend ignore file is extended for the new generated output; all implementation files are new and modular |
| GitHub CI | New math validation/build/browser workflow configured; execution on GitHub not asserted here |
| Draft PR API preflight | `gh pr list` returned `Post https://api.github.com/graphql: Forbidden`; Git transport works independently |

## Existing baseline failures, not concealed

`node --import tsx --test '../packages/english-core/test/*.test.ts'` reports two frozen research fingerprint failures in `packages/english-core/test/e2-research.test.ts`: preserved E1 and E2A simulation baselines. The other 203 checks pass.

To establish whether mathematics caused them, untouched main `b578c7893136fcdea5cd1805296243089e7039ce` was archived to `/tmp/openpath-main-regression`, using the same dependencies without editing or checking out another branch. Running its `e2-research.test.ts` produced the **same two fingerprint mismatches** (2 passed / 2 failed). Mathematics imports none of that research code. These pre-existing failures were left unchanged because changing English simulation baselines or the estimator is outside this workstream. This is not an all-green shared-core claim.

## Limits of these checks

Chromium phone emulation is not physical Samsung testing. Keyboard Enter, labels, expanded controls, status messages and overflow were exercised; this is not a complete accessibility audit. No children or educators participated. Mathematical correctness and property-style tests do not establish instructional effectiveness, authentic transfer, calibrated difficulty or exam readiness. Official syllabus/current exam rules remain unverified because their source hosts returned CONNECT 403. Full lesson content, authenticated persistence, host vector views, admissible ledger conversion, official timed tests and production navigation are not implemented in this branch.
