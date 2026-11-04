# Learner-State Shadow Integration — E003.1 Condition B

## Overview

This document describes the shadow learner-state candidate implemented in
`packages/english-core/src/shadow.ts`. The candidate runs E003.1's validated
session-transition variance mechanism alongside the production estimator
without influencing any student-facing decisions.

## Architecture and Integration Points

The production learner-state pipeline:

```
Student event → PupilEvent (Django, append-only)
  → Ledger.fold() → onEvidence/onProposal
    → applyDirect() → Composite updated
      → leafView() → selection / retention / verification consumers
```

The shadow integration adds a parallel path at the `applyDirect` level:

```
applyDirect(production, ...) ← authoritative, unchanged
  ↓ (after success)
ShadowRunner.processObservation(obs, productionComposite)
  → shadowTouch(node, ...) ← elevated variance
  → applyDirect(shadow, ...) ← same observation
  → buildComparison() ← structured diff record
```

Key design: `shadowTouch()` sets `node.asOf = now` with elevated variance
*before* `applyDirect()` runs. The internal `touch()` then sees `days = 0`
and is a no-op — so the shadow's variance genuinely evolves through the
actual state-update mechanism, not a post-hoc adjustment.

### Files Changed

| File | Change |
|------|--------|
| `src/shadow.ts` | **New.** Shadow candidate module (329 lines) |
| `src/index.ts` | Added `export * from "./shadow.ts"` |
| `test/shadow.test.ts` | **New.** 39 tests covering stages 4–6 |

No existing files were modified beyond the single export line in `index.ts`.

## E003.1 Implementation Mapping

| E003.1 Parameter | Research Value | Production Value | Shadow Value |
|------------------|---------------|-----------------|--------------|
| `timeVariancePerDay` | 0.02 | 0.0047 | 0.02 |
| `sessionVariance` | 0.5 | 0 | 0.5 |
| `maxVariance` | 2.25 | 2.25 | 2.25 |

The shadow uses `CONDITION_B` config, matching E003.1's validated Condition B
parameters exactly. A `ZERO_INTERVENTION` config is also provided that
reproduces the production estimator (verified by test).

## Shadow Isolation Contract

The shadow candidate **does not** control:

- Mastery verification
- Teaching eligibility
- Misconception diagnosis
- Question selection
- Retention scheduling
- Recovery requirements
- Learner-facing progress
- Grades or certificates

**Isolation mechanisms:**

1. `ShadowRunner` maintains a completely separate `Composite` object
2. Production `applyDirect` runs first; shadow runs after success
3. All shadow work is wrapped in try/catch — failures recorded as
   `ShadowFailure`, never blocking production
4. Shadow composite is never passed to `recommend()`, `retention()`,
   `verification()`, or any other consumer
5. `SHADOW_MODEL_VERSION = "shadow-candidate@1"` distinguishes shadow
   state from production `MODEL_VERSION = "composite@1"`

## Evidence and Persistence Schema

Shadow comparison records (`ShadowComparison`) contain:

- `eventId`, `capability`, `at`, `session` — event identification
- `sessionTransition` — whether a session boundary was crossed
- `productionModel` / `candidateModel` — version strings
- `candidateConfig` — frozen config snapshot
- `productionDirect` / `productionCombined` — production estimates
- `candidateDirect` / `candidateCombined` — candidate estimates
- `productionDemonstrated` / `candidateDemonstrated` — demonstrated levels
- `deltas` — computed differences (mean and variance, both direct and combined)

Shadow records are explicitly non-authoritative. They are stored in-memory
on `ShadowRunner.comparisons[]` and never written to Django's event store.

## Model-Version Compatibility

- Production: `composite@1` (unchanged)
- Shadow: `shadow-candidate@1`

The shadow composite uses the same `Composite` type and `createComposite()`
factory as production. The model version string is metadata only — it does
not affect any computation.

## Replay and Determinism Results

Three deterministic replay tests confirm:

1. **Same-session replay**: Identical events produce identical shadow
   comparisons across two independent runs
2. **Inter-session gaps**: Events spanning multiple sessions with time
   gaps produce identical results on replay
3. **Coupled capabilities**: Capabilities with coupling effects produce
   identical results on replay

`ShadowRunner.reset()` clears all state for clean replay from scratch.

## End-to-End Journey Results

Six learner journeys tested with shadow alongside production:

| Journey | Production Unchanged | Shadow Diverges on Variance |
|---------|---------------------|-----------------------------|
| Successful first-time learning | Yes | Yes — higher candidate variance |
| Isolated slip | Yes | Yes — higher candidate variance |
| Multi-session improvement | Yes | Yes — session variance adds uncertainty |
| Failed delayed retention | Yes | Yes — time gap inflates more |
| Restart and replay | Yes | Yes — deterministic on replay |
| Assisted responses (repeat) | Yes | Yes — same pattern as production |

In all journeys: production composite is unchanged, shadow records
differences, candidate variance is consistently higher than production.

## Regression Report

### Full test suite

```
353 tests, 0 failures (46s)
```

All existing tests pass without modification. The shadow module introduces
no regressions.

### Shadow-specific tests

```
39 tests, 0 failures
```

Coverage:
- 6 shadowTouch unit tests
- 3 SessionTracker tests
- 6 ShadowRunner tests
- 3 deterministic replay tests
- 14 integration safety assertions (all pass)
- 1 zero-intervention equivalence test
- 6 end-to-end journey tests

### Type checking

Pre-existing `TS2688` (missing `@types/node` from frontend typeRoots) — not
related to shadow changes. No new type errors introduced.

## Remaining Risks

1. **Memory**: Running two composites doubles per-learner memory during
   shadow execution. For the current scale this is negligible.

2. **Performance**: Each `applyDirect` call runs twice. The function is
   lightweight (no I/O), so wall-clock impact is minimal.

3. **Django integration**: The `Ledger` in `updater.ts` is the natural
   integration point for wiring `ShadowRunner` into the full pipeline.
   This wiring is not implemented — it requires a separate approval step.

4. **Persistence**: Shadow comparisons are in-memory only. A production
   deployment would need a storage path for comparison records.

## Integration Recommendation

**PASS — SHADOW READY**

- Candidate is implemented inside the existing learner-state architecture
- Authoritative behaviour is unchanged (verified by 14 safety assertions)
- Shadow results are reproducible (verified by deterministic replay tests)
- Failures are isolated (bounded failure path with diagnostic records)
- Evidence semantics are preserved (no duplicate evidence, no mastery
  contamination)
- All required safety regressions pass (353 existing + 39 new = 392 total)

### Next steps (require separate approval)

1. Wire `ShadowRunner` into `Ledger.fold()` behind a feature flag
2. Define Django storage schema for `ShadowComparison` records
3. Deploy shadow execution with real learner events
4. Collect comparison data for evaluation
5. Decision on candidate promotion (separate milestone)
