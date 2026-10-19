# Follow-up validation — 2026-10-19

Base: `d99879cd96550364178831c56b8fe9b8e19116e0`. Local cloud execution, Python 3.12 / SQLite and system Chromium. New isolated browser database and preview services; no existing learner database was reset.

| Check | Node 22.18.0 | Node 24.19.0 |
|---|---:|---:|
| Frontend unit suite, including graph safety and English/Tamil/essay regressions | **322 passed, 0 failed** | **322 passed, 0 failed** |
| All three frontend TypeScript targets | Passed | Passed |
| Combined English + mathematics + foundation build | Passed | Passed |
| Mathematics foundation and existing account-backed journey browser suites | **9 passed, 0 failed** | **9 passed, 0 failed** |
| Unchanged full shared-core suite | **309 passed, 0 failed** | **307 passed, 2 failed** (known legacy fingerprints) |

Additional checks: **166 backend tests passed**; standalone mathematics preview build and **9 standalone browser tests passed** on Node 24 after updating its prerequisite display. `git diff --check` passed. No changes to shared-core source/tests, tools/english, content/english, the frozen mathematics inventory or the original 92-record proposal file.

The matrix is actual local execution. The new GitHub Actions workflow is prepared but its remote outcome is not claimed. Its separate Node 24 legacy job deliberately reports the two real failures without skips, `continue-on-error`, snapshot regeneration or accepted alternate hashes.

## Graph checks and historical evidence

Four new tests cover:

1. Exactly 34 original hard edges removed; zero added; all 200 IDs preserved; the other 166 competency definitions unchanged, including all 49 unapproved proposals. Original inventory SHA256 remains `e4c17772945ff4ad1892b8839d99d3f1a5d149cebdaeb8d138ecfcc112df44d4`.
2. All 34 intermediate graphs checked before/after: no cycles, missing references, duplicate IDs or unjustified roots. Synthetic native histories have identical policies, priors, evidence, decisions, all learner composite fields and verification claims at each step. Provisional, before-release, released and repeated answers retain their original eligibility; both registrations reject validated content without a release date. These are test fixtures only, not real content approvals.
3. Default graph 1.1.0 and explicit historical graph 1.0.0 replay the same event history without rewriting it. Across graph versions, composite contents match apart from the declared framework key; item IDs and versions, decisions and eligibility match exactly.
4. Invalid reference/cycle/stale-patch inputs fail closed. Callers cannot mutate the source inventory through returned graph nodes.

The machine-generated before/after report records **200 → 166 edges** and **6 → 40 explicitly justified roots**. No proposed replacement edges were silently adopted. A root is an absence of an imposed external gate, not proof that a complete lesson or every concrete foundation exists.

Browser coverage includes Grade 1 addition as an unchanged control, Grade 3 equal groups and Grade 5 equivalence (both corrected), mobile widths 320/360/412 and tablet 768, interaction, wrong-answer feedback, hints, fixed activity completion, close/resume, separate school/GRE completion, same competency identity, failed saves, account ownership/sign-out/login, early delayed-review rejection, and preservation of completed work. Unimplemented competency lessons are not described as browser-tested journeys; their graph/evidence compatibility is tested synthetically.

## Fingerprint findings and deferral

The unchanged legacy simulator was rerun under both runtimes with the diagnostic exporter. E1 has 10 differing final misconception strengths; E2A has 8; maximum absolute difference `5.551115123125783e-17`. All compared other output fields, decisions and recommendations match. Both Node 22 hashes reproduce the saved values. Node 24 hashes are the same two known failures recorded before this follow-up.

No portable replacement fingerprint was adopted. Key sorting/exact-bit serialization cannot remove numeric differences; quantization or omitting fields changes what the fingerprint detects. The deliberate rounding-collision example in [FINGERPRINT_PORTABILITY.md](FINGERPRINT_PORTABILITY.md) was checked, and no inference arithmetic or persisted evidence was rounded or changed. Legacy backward compatibility is retained by keeping the original algorithm/baselines and its known-runtime reproduction.

## Reproduce

From `frontend` with installed dependencies:

```sh
npm run typecheck
npm test
npm exec --cache /workspace/.npm --yes --package=node@22.18.0 -- node --import tsx --test 'src/**/*.test.ts'
node --import tsx ../tools/mathematics/prerequisite-report.mts
node scripts/build-mathematics-foundation.mjs
```

Run `npm run typecheck` and the build with Node 22 active as well (the CI matrix supplies this automatically). From `packages/english-core`, run `npm test` under each version; preserve the two Node 24 failures. Browser tests run against the combined preview/API:

```sh
MATH_JOURNEY_URL=<private-local-test-origin> node --import tsx --test e2e/mathematics-foundation.test.mjs e2e/mathematics-journey.test.mjs
```

Local validation used separate loopback test services and synthetic accounts. The browser renderer was Chromium in both host-runtime runs; this is not a physical Samsung-device test or a cross-browser certification. Owner-authenticated Codespaces startup cannot be exercised in this runner because its API/ingress is unavailable; the procedure reuses the existing devcontainer and validated build/API flow. Educator review, official curriculum alignment and real-child learning effectiveness are not claimed.
