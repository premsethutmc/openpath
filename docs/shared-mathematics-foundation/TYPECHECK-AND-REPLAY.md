# Typecheck and frozen-replay release blockers

Continuation from published `bca22fcd303ba0f78ac1bf4bb5de9b0c13dd0df4`, on the same isolated branch and draft PR96. No merge, deployment, new permissions or global activation.

## Root causes and corrections

The inherited 188 mathematics diagnostics comprised 70 missing `bun:test` imports, 43 non-erasable constructor parameter properties, and 75 contract/narrowing/export/fixture diagnostics. The configured main and English typechecks already passed.

- Add pinned official `@types/bun` to the frontend development dependencies and to the mathematics check's type environment. Existing exclusions are unchanged; no new exclusion, ignore, suppression or broad cast was added.
- Expand parameter properties into ordinary typed fields and constructor assignments, retaining defaults, access/readonly declarations, initialization and arithmetic normalization. Keep `erasableSyntaxOnly` enabled.
- Preserve discriminated token variants through a distributive `Omit`; retain narrowing through local bindings and explicit guards; annotate literal test data and shared types precisely. Resolve duplicate/ambiguous type exports explicitly. Remove unreachable conditions already handled by earlier branches.
- Correct the rational denominator's default type from string to bigint; the mapped input is already bigint at runtime. Initialize an obligation's transient status before its existing decision branches. No new mathematical rule, grading policy or trusted source is introduced.
- Synthetic E5/E6 parser results now include required resource metadata: source character/line counts, with zero generic-token/depth work. This is additive output metadata, not a claim that every newly computed payload is byte-identical. Saved historical events are not rewritten.

Independent review found no grading-authority semantic blocker in these changes. Main, English and mathematics-integration typechecks pass; the mathematics count is now zero.

The two Node24 research failures come from V8 changing fractional powers to `std::pow`. The historical implementation reproduces both frozen hashes exactly. Commit `2cee6e2` adds an explicit test/research runtime launcher and documentation in [FROZEN-RUNTIME.md](../../tools/english/research/FROZEN-RUNTIME.md). It probes compatibility, passes `--no-use-std-math-pow` where supported, and fails on unsupported behavior. Production inference and frozen expectations remain unchanged. The complete English-core suite passes 314/314 under Node24 with this profile.

## Test-contract reconciliation

The original certification test failed twice on an untouched `bca22fc` worktree as well as on the type-corrected code. Its frozen U2 input exercised conclusion entailment, while the connected geometry authority now requires a demonstrated submitted method.

The certification test now authors explicit triangle/isosceles citations in copies of the fixtures, preserving existing wrong citations and given restatements. Frozen files are unchanged. All 44 accepted methods must still carry attributed evidence. Three cases citing `parallel-alternate` lack its required premises: they must be unsupported, with null correctness and incomplete reasoning, rather than falsely penalized. The remaining old verdicts are retained. A separate bare-conclusion test requires non-certification, null correctness and no invalid-step index. The corrected test passes 28/28; the independent reviewer checked this reconciliation for assertion weakening.

## Validation and remaining historical-contract mismatches

- All three configured TypeScript checks pass. Grader regenerated from its 210 source/content and 11 Python inputs.
- Year and production app builds pass.
- Django content-review/pathway/geometry: 18/18 pass.
- Initial focused learning run: 125 pass, three skips, two certification-fixture failures described above. Corrected certification file: 28/28 pass.
- Additional domain/transport checks: 17 pass, one existing skip.
- Broader learning regression completed: **1778 pass, 41 skip, 7 fail** across 107 files. It exposed seven additional frozen geometry-contract failures in `unified-math-engine.test.ts`, `math-m1-u2-integration.test.ts`, `unified-math-engine-u2.test.ts`, and `reasoning-depth-d2.test.ts`. An isolated run of those same four files at untouched published `bca22fc` reproduces the same seven failures (seven passes/seven failures). They are not introduced by these type corrections. However, `bca22fc` is an earlier foundation-branch checkpoint, not upstream: the same four files pass 14/14 at pre-foundation `d8cd680`. These are unfinished benchmark-contract migrations from the earlier geometry authority changes; full learning regression remains partial.

For U1, all 200 classifications still agree; 23 old `firstInvalidStep` values actually name the first non-verified step, whereas the current geometry contract reserves that field for a disproven step. Other frozen benchmarks assume entailment supplies learner method credit. Their expected files and assertions remain intact. This continuation does not restore unsafe method authority or silently relabel frozen benchmark outcomes to make those checks green. These historical benchmark contracts require separate reconciliation; they must remain visible in readiness reporting.

Remote CI on the exact published correction, including previously blocked build/browser stages, will be recorded in PR96. Passing typechecks is not evidence that all downstream stages pass, nor completion of mathematics content or educational validation.

## Node 22.18 cycle-fixture isolation

The prerequisite runtime matrix exposed a separate test-fixture failure: under Node 22.18 with `tsx`, the frontend test's ESM graph and the learning package's CommonJS graph are distinct instances. Mutating only the first did not inject a cycle into the planner. An isolated probe confirmed that patching ESM alone left the route unchanged; patching the CommonJS instance triggered the expected stop. Node 24 uses one shared instance in this setup.

The cycle test now patches each unique loaded instance and restores each in `finally`. Its assertions still require no next activity, an explicit route-review reason, and no readiness placement. Production graph, planner, authority and event semantics are unchanged. The full affected pathway file passes 7/7 under Node 22.18 and 7/7 under Node 24.19; independent review confirmed there was no assertion weakening.
