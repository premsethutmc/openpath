# Validation

This records the initial slice through `49e0e1d`. See [CONNECTED.md](CONNECTED.md) for the subsequent integration, teaching repairs and validation.

Runtime: Node 24.19.0, Bun 1.4.4, Python 3.12.14, installed Chromium 154. Runtime dependencies were installed locally; no production services were used.

Commands:

```sh
bun test packages/learning/src
bun test --timeout 60000 packages/learning/src/verification-closure-e3.test.ts packages/learning/src/grading/working.test.ts packages/learning/src/subskill-evidence.test.ts
cd frontend
node --import tsx --test src/journey/foundation.test.ts
# Full frontend regression: each src/**/*.test.ts in a fresh Node process (four workers).
node --import tsx --test src/journey/d1e1-journeys.test.ts src/journey/gated-mastery.test.ts
node scripts/build.mjs
node scripts/build-math.mjs
node scripts/build-slice.mjs
./node_modules/.bin/tsc --noEmit
./node_modules/.bin/tsc --noEmit -p tsconfig.english.json
./node_modules/.bin/tsc --noEmit -p tsconfig.mathematics-integration.json
cd ../backend
python manage.py test
python manage.py test family.test_handover
```

The mathematics typecheck comparison normalizes relative path prefixes and source line/column numbers and compares complete diagnostic sets against `d8cd680`: baseline 189 errors, implementation 188, zero new diagnostics. The removed diagnostic was the G5 `bun:test` import. Main and English typechecks pass. The final comparison is saved in [typecheck-comparison.json](typecheck-comparison.json).

The original full learning run encountered a five-second timeout in E3 differential fuzz under concurrent load. Its focused rerun uses a 60-second timeout; mathematical assertions are unchanged. Historical fixtures needed to omit the new provenance field when simulating old authorities. No quarantine entry or question safety allowlist was broadened.

The authenticated H1 persistence round trip exports synthetic events, stores each at its own time through Django, records educator acknowledgement, logs in again, and reconstructs the session. Its 14 events and one acknowledgement reproduce the in-memory state. The final server-session-binding rerun is recorded separately.

Browser checks use installed `/usr/bin/chromium` with the existing Playwright test suites and a 390×844 phone viewport. Download of Playwright's bundled Chromium failed with HTTP 403 `Domain forbidden`; installed Chromium is usable. The local opt-in preview also submits a real answer for each of linear equations, triangles and addition without horizontal overflow.

## Why fixtures changed

- D1 unsupported-feedback assertions now require the new preservation/no-penalty text, an intermediate-step next action and no method-mastery claim. Correct answer credit, no false-step assertion and non-verification assertions remain. This is an intended wording/flow change, not a weaker mathematical assertion.
- Historical-authority fixtures previously created a current decision and changed only its old authority string. After adding provenance that creates an internally inconsistent record: current provenance with an old authority. Fixtures now omit provenance to model an actual pre-provenance record. Existing historical counts and non-upgrade assertions are unchanged. A separate test changes a current provenance binding and requires replay failure. No stored historical events are rewritten.
- The shadow-import test now recognizes the existing local slice's explicit `?foundation=1` entrypoint and asserts the opt-in condition. Production entrypoints are still outside this policy. The quarantine selector registration list was **not** expanded: requirement requests delegate to `questionForRequirement` in the existing selector owner, which owns quarantine, module membership, grade and all-exposure filtering.
- Assistance semantics apply to the new, versioned `foundation-lesson-review@1` teaching reason only. Older ordinary teaching records retain their existing interpretation. The backend stamps later same-session answers assisted even if the client omits help; save/reload tests verify no independent credit arises from review.

The upward-readiness test starts a Grade 1 placement with one correct `1+2` response. A chosen linear-equations target remains a prerequisite-probe requirement. After real trusted answers establish its graph prerequisites, the preview can select a linear-equations question above that placement without claiming the target already mastered. It tests explicit supported-target preparation, not automatic cross-topic recommendation.


## Completed targeted checks

- Foundation journeys: **10 pass**, across linear equations, geometry and addition. Includes higher-target readiness, assistance after reload, async timeout, typed geometry working, symbolic-answer compatibility and editable oversized input.
- D1/E1 historical and mastery-gate journeys after fixture correction: **35 pass**.
- Geometry/E1/H1 plus foundation combined earlier regression: **42 pass** (later added cases rerun separately).
- Final handover endpoint checks: **6 pass, 1 environment-dependent persistence skip**; the skipped persistence test was also run explicitly with exported events and **passed**.
- Explicit authenticated persistence: **14 events, one educator acknowledgement, identical reconstructed state**.
- Browser D1/H1: **18 pass**, desktop and 390×844. Three further opt-in foundation phone cases pass, including repeated Check actions producing only one submission, preserved Unicode geometry working, and an overlong-input error with no submission or lost text.
- Projection tests: **30 pass**. Selector ownership assertion: **1 pass**, registry unchanged.
- E3/core-identity timeout rechecks: **47 pass, 2 existing skips**, timeout raised to 60 seconds without changing mathematical assertions.
- Main app, mathematics app and slice builds pass. Main and English typechecks pass.

Phone screenshots: [addition](screenshots/foundation-aaadd.png), [geometry](screenshots/foundation-ahtri.png), [linear equations](screenshots/foundation-lin.png).

## Full-suite results

- Full Django discovery: **315 tests, no failures, 3 skips** (1,052 seconds). Later assistance/version-marker checks were rerun in the focused handover suite; no failing checks remain there.
- Full learning discovery: **1,781 pass, 41 skip, 3 failures** initially (800 seconds). Two were the runner's five-second timeout under concurrent load; both pass unchanged with a 60-second timeout. The third was the selector ownership registration assertion, fixed by centralizing requirement selection in the existing safety owner; its unchanged assertion passes. There are **no unresolved learning failures**, but this was a full run plus focused repairs, not a second clean full run.
- Full frontend per-file run: **69 files, 714 pass, 3 initial failures, 0 skips** (717 tests). The three failures were in D1/E1 historical fixtures, mastery-gate historical fixtures, and unsupported-feedback copy. The first two affected suites pass all **35 tests** after repair; the complete grader-teaching suite passes all **16 tests** after the final input changes. No mathematical assertion was removed. The last content-system suite passes all **10 tests** (2,192 seconds); mathematics-completion passes all **8 tests** (1,359 seconds). This is a complete run plus focused repairs, not a second clean full run. The new foundation suite was expanded after the full run started and separately passes all **10 tests**. Raw per-file exit statuses and durations are preserved in [frontend-full-run.json](frontend-full-run.json).

Geometry's separate authenticated round trip also passes: exported learner responses/working are graded by Django's rebuilt trusted bundle, then fetched after fresh login and reprojected in a new process. It preserves the unsupported working judgments rather than upgrading them to proof evidence.

The final typed-input changes also pass the backend answer-authority and unreadable-answer checks (10 tests), malformed-evidence check (1 test), and seven-test handover suite (6 pass, one separately exercised persistence skip). One attempted test command named the malformed-evidence method under the wrong class; the correctly named test was rerun and passes.

KaTeX is not installed by this repository's declared frontend dependencies in this environment. Browser checks therefore exercise the renderer's existing plain-text fallback; they do not certify KaTeX typography.
