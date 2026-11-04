# OpenPath Consolidation Dashboard

## Baseline

| Item | Value |
|------|-------|
| **Branch** | `consolidation/openpath-v2` |
| **Merge base** | `b578c789` — Spelling Bee PR #38 (shared ancestor of main and educator-access) |
| **Merge commit** | `3be4c54` — proper `git merge origin/main` into educator-access (1 conflict: .gitignore) |
| **Integration commit** | `7368570` — 3 branch integrations (shadow, geometry-dice unique files, sub-skill-mastery) |
| **HEAD** | `01699be` (3 commits on consolidation) |
| **Main HEAD at merge** | `7efa0a6` (chore: add frontend/dist-math/ to .gitignore) |
| **Educator-access HEAD** | `2ea7ad5` (CI: educator-marking and educator-access browser tests) |

### Previous attempt corrected

The first consolidation (`consolidation/openpath-candidate`) used `--allow-unrelated-histories` to merge main and educator-access. This was wrong: `git merge-base origin/main origin/feat/educator-access` returns `b578c789` (Spelling Bee PR #38). Main had exactly 1 commit past this base (a .gitignore addition). The incorrect merge created 42 false conflicts and lost ~20 frontend files' educator-access changes (essay sessions, learner model, ASSISTED_POLICY, test helpers).

This consolidation starts from educator-access and does a proper `git merge origin/main`, resulting in exactly 1 conflict (.gitignore — both sides added `frontend/dist-math/` at different positions).

## Commits on consolidation branch

1. `3be4c54` — consolidation: merge main (7efa0a6) into educator-access (2ea7ad5) — proper merge via shared ancestor
2. `7368570` — consolidation: integrate completed work from 3 active branches (20 files)
3. `01699be` — fix: correct shadow.test.ts SelectionInput type for recent field

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

## Dice false-progress — status

**NOT VERIFIED.** The previous dashboard claimed false-progress was addressed based on:
- Misconception detectors existing in b14.ts (code presence)
- 400 grading cases passing (mathematical grading, not lesson routing)
- A walkthrough from PR #110 (evidence for a different branch)

**What has NOT been demonstrated:**
- Reproduction of a learner who gets dice wrong but succeeds on other sample-space questions in the loaded app
- Verification that displayed status and saved/reloaded evidence correctly reflect dice weakness
- Connection of safe general dice teaching with fresh same-skill recheck and delayed check
- These require the Django backend + frontend running together, which this environment cannot provide

**What IS present in the code:**
- b14.ts: misconception detection for "order-ignored", "sums-equally-likely", "double-counted", "one-die-only", "twelve-outcomes"
- b11.ts: freshness@2 retention preventing rote memorization
- Retention/verification infrastructure: VERIFY_AT_LEVEL_MIN=2, same-skill rechecks via atTarget scheduling
- Sub-skill evidence module (integrated from feat/sub-skill-mastery-evidence)

## Remaining limitations

1. **Dice false-progress**: Not reproduced in loaded app. Code-level safeguards exist but end-to-end verification requires Django + frontend integration not available in this environment. **This is explicitly reported as unverified.**

2. **Frontend tsc**: Requires `@types/react` (available via `npm install` in CI, not in this restricted environment). Not a code regression.

3. **8 bun-only learning tests**: Require bun runtime. Same on educator-access. Not regressions.

4. **4 teaching content branches deferred**: Pending educator review.

5. **Frontend e2e tests**: Require Django backend + browser. Build succeeds and unit tests pass.

6. **Django backend tests**: Require Python/Django environment. Backend files are from educator-access (which had passing CI).
