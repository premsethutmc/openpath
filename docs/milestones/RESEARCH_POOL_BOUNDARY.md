# Research pool boundary, 2026-11-10

Base: PR #124 at `04d764772906d1f72775b34c5d09fe7b6b6c7839`. Separate follow-up branch; the combined candidate was not modified, merged or deployed.

## Repair

- Moved the seven offline pool readers and their report/summary tools from `frontend/src/journey/` to `research/deep-recovery/tools/`.
- Moved the frozen phase-2 implementation from the learning package to `research/deep-recovery/frozen/`. Its implementation is byte-identical after stripping import lines, checked by a pinned SHA-256 regression test.
- Kept the flags tool and historical results. No research evidence was discarded and no offline pool reader was approved as an application selector.
- Updated the three frontend test files that import the simulations. The current research-mode deep-recovery engine remains in `packages/learning/src/deep-recovery.ts`, with Claude's selection and saved-answer safeguards unchanged.
- Replaced the selector test's text regex with a shared TypeScript import scan. It checks static imports (including renamed bindings), re-exports, namespace access to known selector modules, literal dynamic imports and `require`. Nonliteral runtime imports and unresolved local source imports fail the boundary check. Application modules cannot import the offline tools or test modules, including through an intermediate local module.
- The stronger scan also inventories the existing public `index.ts` re-export of `intervention.ts`. It is registered as an API barrel, not as an additional offline selector.
- Added the boundary to the existing Node frontend test suite, so CI now exercises this safety check without introducing Bun or changing CI/runtime dependencies. This does **not** claim that all learning-package Bun tests now run in CI.

## Verification

- The shared boundary command passes: 14 registered application readers/re-exporters, no offline research or test-module imports.
- Eight Node boundary regression tests pass, including negative cases and frozen implementation preservation.
- The three changed recovery suites pass **20/20** under Node (phase 4, phase 5 and phase 6).
- Full frontend typecheck passes with `NODE_OPTIONS=--max-old-space-size=6144 npm run typecheck`. The first run exceeded the default 2 GB heap; the reused dependency folder lacked already-pinned `jsxgraph@1.14.3`, which was supplied in the isolated worktree and verified against the existing lockfile integrity. No dependency version or lockfile was changed.
- CI shard discovery passes: 144 files in six shards, including the new boundary test. `git diff --check` passes. Every grader-manifest input hash is unchanged.
- Independent code review found a namespace/dynamic import gap through the existing learning index barrel; it is fixed and covered by regression tests. No remaining material finding in this bounded change.
- Bun is unavailable in this executor, so the complete Bun learning-package suite was **not rerun**. The shared boundary implementation is exercised by Node; this is not a claim that all 1,825 historical package tests passed here.
- No generated learning content or answer keys changed, so content regeneration is not needed for this file relocation. Full remote CI remains pending when this draft is published.

## Still separate

Pythagoras needs a worked `m² − n², 2mn, m² + n²` example, substantive teaching and accurate maps for the three remaining strategies. The existing tests do not prove these gaps closed. Grade 8 review issues also remain. AI mathematical/content review can proceed without an unassigned educator; it is not evidence of human educator review or real-learner success.
