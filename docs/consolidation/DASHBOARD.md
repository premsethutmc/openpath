# OpenPath Consolidation Dashboard

## Baseline

| Item | Value |
|------|-------|
| **Branch** | `consolidation/openpath-v2` |
| **Merge base** | `b578c789` — Spelling Bee PR #38 (shared ancestor of main and educator-access) |
| **Merge commit** | `3be4c54` — proper `git merge origin/main` into educator-access (1 conflict: .gitignore) |
| **Integration commit** | `7368570` — 3 branch integrations (shadow, geometry-dice unique files, sub-skill-mastery) |
| **HEAD** | `9ac1681` (5 commits on consolidation) |
| **Main HEAD at merge** | `7efa0a6` (chore: add frontend/dist-math/ to .gitignore) |
| **Educator-access HEAD** | `2ea7ad5` (CI: educator-marking and educator-access browser tests) |

### Previous attempt corrected

The first consolidation (`consolidation/openpath-candidate`) used `--allow-unrelated-histories` to merge main and educator-access. This was wrong: `git merge-base origin/main origin/feat/educator-access` returns `b578c789` (Spelling Bee PR #38). Main had exactly 1 commit past this base (a .gitignore addition). The incorrect merge created 42 false conflicts and lost ~20 frontend files' educator-access changes (essay sessions, learner model, ASSISTED_POLICY, test helpers).

This consolidation starts from educator-access and does a proper `git merge origin/main`, resulting in exactly 1 conflict (.gitignore — both sides added `frontend/dist-math/` at different positions).

## Commits on consolidation branch

1. `3be4c54` — consolidation: merge main (7efa0a6) into educator-access (2ea7ad5) — proper merge via shared ancestor
2. `7368570` — consolidation: integrate completed work from 3 active branches (20 files)
3. `01699be` — fix: correct shadow.test.ts SelectionInput type for recent field
4. `f34cea3` — docs: corrected consolidation dashboard — verified vs assumed
5. `9ac1681` — docs: dice false-progress is blocked, not merely unverified

## Verified test results (on HEAD `01699be`)

### english-core
- **353 pass, 0 fail** (all test files including shadow.test.ts)
- Shadow tests: all 39 pass
- No frozen simulation hash mismatches (those were artifacts of the incorrect merge)

### learning (mathematics)
- **774 pass, 0 fail** (node-compatible tests)
- 8 test files require `bun:test` and cannot run under Node.js/tsx — same on educator-access
- These 8 bun-only files: certify, contract, e7-integration-gate, parse, process-shadow, program, view, working

### Frontend build
- **Successful**: `dist/assets/app.js` (241.9 KB), `dist/assets/app.css` (9.7 KB)
- Built with esbuild 0.28.2

### Frontend english logic tests
- **211 pass, 0 fail** (all test files including account.test.ts, mastery-gate.test.ts, pilot-integrity.test.ts, spelling-assessment.test.ts)

### TypeScript type checking
- **english-core**: clean (0 errors)
- **frontend**: `@types/react` not available in this environment (npm network restricted). All tsc errors are from missing React type declarations, not code issues. In CI with proper `npm install`, these would resolve. Same limitation on educator-access in this environment.

## Behaviour preservation — verified

The following educator-access behaviour was **verified present** in the consolidation (was lost in the previous attempt):

| Feature | File(s) | Status |
|---------|---------|--------|
| Essay session type | events.ts (SessionType union, LEDGER_KINDS, SESSION_KINDS, ESSAY_RECORDS) | ✅ Present, matches educator-access exactly |
| Essay event validation | events.ts (eventProblem) | ✅ Present |
| ASSISTED_POLICY in learner | learner.ts (import + provenance usage) | ✅ Present |
| withRecordedQuestions | content.ts (function + learner.ts integration) | ✅ Present |
| Essay evaluator API | account.ts (essayEvaluatorStatus, essayEvaluate) | ✅ Present |
| recordEssay / essayMeta | essay-live/studio.ts (19 references) | ✅ Present |
| Test helpers | test-helpers.ts (52 lines) | ✅ Present |
| Verification@2/@3 | retention.ts, types.ts, composite.ts, updater.ts | ✅ Present |
| Learner pipeline | PupilEvent → Ledger.fold → onEvidence → applyDirect → composite → leafView → recommend → retention | ✅ Full trace verified |

### Comparison against PR #111 target

PR #111 targets `integration/geometry-dice-107-108`. Verified: `integration/geometry-dice-107-108` is an ancestor of `feat/educator-access` (confirmed by `git merge-base --is-ancestor`). All #111 changes are already in the consolidation via educator-access.

## Branch inventory (221 remote branches)

### Already included (59 branches)
Ancestors of educator-access or main.

### Integrated in this candidate (3 branches, commit `7368570`)

| Branch | PR | What was integrated |
|--------|----|---------------------|
| `feat/learner-state-shadow` | #85 | Shadow learner-state framework (E003.1 Condition B). 3 files: `shadow.ts`, `shadow.test.ts`, docs. Export added to `index.ts`. |
| `integration/geometry-dice-candidate` | #110 | 5 unique files only (integration test, problem-identity, docs). The #107+#108 code itself is already present via educator-access. |
| `feat/sub-skill-mastery-evidence` | — | Sub-skill gated mastery evidence. 11 files: docs, scripts, journey tests, evidence module. |

### Deferred — pending educator approval (4 branches)

Per instruction: "Keep unreviewed content pending educator approval."

| Branch | Content |
|--------|---------|
| `feat/math-teaching-content` | 74 teaching spec docs, 63 modified files |
| `feat/math-teaching-gaps` | Unit-conversion skill teaching |
| `feat/math-teaching-visuals` | Renderer corrections |
| `feat/math-coverage-expansion` | Teaching-picture data |

### Experimental / Superseded (~158 branches)
Walkthroughs, research, old base branches, standalone math engines. All superseded. No branches deleted.

## Dice false-progress — BLOCKED

**The two-dice teaching candidate is NOT connected in the loaded app.** This is not an environment limitation — it is an architectural blocker in the content pipeline itself.

### Root cause

The library builder (`packages/learning/src/library.ts`) only lets a template extension (`Blueprint.extendsTemplate`) scope a strategy to the module's MAIN family. The probability module `MATH.probability.sample-space` is seeded from `akss`; `akdice` is one of its pool families. `synthesise` throws for strategies targeting pool families. This is documented in the test fixture itself (`frontend/src/journey/two-dice.ts`, lines 4–8).

Three independent confirmations:
1. `two-dice.ts` line 11: _"It is a test fixture: nothing in the app reads this file."_
2. `two-dice.test.ts` line 83: `assert.ok(!loaded.strategies.some((s) => s.id.startsWith("akdice_")), "not connected in the loaded library: needs the library.ts scope change and regeneration")`
3. `library.ts`: zero references to `akdice`, `composeTwoDice`, or `two-dice`

### What IS implemented (code-level, test-fixture only)

| Component | Location | Status |
|-----------|----------|--------|
| Misconception detectors | b14.ts "andice" family | ✅ Code present (order-ignored, sums-equally-likely, double-counted, one-die-only, twelve-outcomes) |
| Generator family | b11.ts "akdice" | ✅ Code present, freshness@2 retention |
| Problem identity | problem-identity.ts | ✅ Mirror-total equivalence |
| Composition rules | two-dice.ts `composeTwoDice` | ✅ Append-only, freshness@2 |
| Test-fixture installation | two-dice.ts `installForTest` | ✅ Bypasses library builder by mutating module array directly |
| Journey tests | two-dice.test.ts | ✅ 5 tests pass (freshness, composition, real paths ×2, delayed check) |
| 400 grading cases | b14.ts / b11.ts tests | ✅ Mathematical grading correct |

### What is NOT implemented (blocked by library builder limitation)

- **Library builder scope change**: `library.ts` cannot register strategies for pool families → dice teaching cannot enter the live app
- **Loaded app reproduction**: Cannot reproduce a learner getting dice wrong in the normal app because the teaching pathway is not live
- **Displayed status verification**: Cannot verify because teaching is not routed
- **Saved/reloaded evidence**: Cannot verify outside test fixtures
- **Fresh same-skill recheck in app**: Proven only inside `installForTest` fixture, not in the live content pipeline
- **Delayed check in app**: Proven only inside `installForTest` fixture

### What the previous dashboard claimed incorrectly

The previous dashboard (on `consolidation/openpath-candidate`) claimed false-progress was "addressed" based on misconception detectors existing in b14.ts and 400 grading cases passing. These prove mathematical grading correctness, not that the teaching connection is live. PR #110's walkthrough was evidence for a different branch, not for this consolidation.

## Remaining limitations

1. **Dice false-progress — BLOCKED**: The library builder (`library.ts`) does not support strategies targeting pool families. The dice teaching candidate exists as a test fixture only. Connecting it in the live app requires a scope change to the library builder. **This is explicitly reported as blocked, not unverified.**

2. **Frontend tsc**: Requires `@types/react` (available via `npm install` in CI, not in this restricted environment). Not a code regression.

3. **8 bun-only learning tests**: Require bun runtime. Same on educator-access. Not regressions.

4. **4 teaching content branches deferred**: Pending educator review.

5. **Frontend e2e tests**: Require Django backend + browser. Build succeeds and unit tests pass.

6. **Django backend tests**: Require Python/Django environment. Backend files are from educator-access (which had passing CI).
