# 8. Historical compatibility and replay

| Requirement | How it is met |
|---|---|
| Stable, versioned mapping | `linear-equations-subskills@1` and projection `@1`. A changed mapping must be a new version. |
| Historical events without family identifiers | The family has always been part of a generated question's id, so every stored generated attempt carries it. A stored attempt whose id the existing reader does not know (a legacy or retired id) is excluded by `readRecords`, exactly as today. The projection lists it as `excluded-by-existing-reader` and credits it to nothing (journey 16). Non-generated ids are `not-a-generated-question`. |
| No retroactive invention | No answer is reclassified from text or guessed. An unknown answer stays unknown. A record with no recorded verdict is compared exactly as `evidence.ts` does (`rightAnswer`). |
| No change to grader authority | Credit is the recorded server decision. Method is recomputed by the existing derivation interface and never read from a client field. |
| No destructive migration, no new authoritative events | E1 adds no event type, no field, no table and no migration. The test "the projection never changes the authoritative state or adds events" checks the event count, the authoritative evidence and the next step before and after projecting. |
| Deterministic order and replay | Events are put in canonical order (time instant, then id) before the existing reader counts first exposures. The result is a pure function of `(events, now)`. |
| Malformed or unknown metadata | A malformed attempt is rejected and listed. An event the existing reader cannot read gives `unreadable-events`, with nothing projected. More than 20 000 attempts gives `resource-limit`. Unknown and unmapped families are counted, never credited. |

## Replay evidence

- **Journey 15.** The result is identical after a restart (`SliceSession.fromEvents`) and under reversed store order.
- **Through the real store.** `scripts/m2-persistence.sh` writes 4 learners × 2 sessions to Django and reads them back (PASS 4 learners). `scripts/e1-store-replay.mts <M2_DIR>` then projects the **stored** events. Two separate processes gave identical digests, and reversed delivery order gave an identical projection for every learner ([`store-replay.jsonl`](store-replay.jsonl)).
- **Contrast.** The existing authoritative reader counts first exposures in **delivery order**. On store learner 2a, reversing the delivery order changes its `independent.right` (22 → 23). The canonical store order is `seq`, which matches time order, so production is unaffected. This existing property is recorded here and not changed.
