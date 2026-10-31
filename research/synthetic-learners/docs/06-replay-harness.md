# 6. Seeded replay harness

**Randomness** (`src/rng.ts`, `synthetic-rng@1`) is mulberry32. Named sub-streams are derived by an FNV hash of `seed:label`, one each for `respond` and `learn`, so adding a new kind of draw never shifts another stream.

**Harness** (`src/harness.ts`): `runJourney(profile, {seed, schedule, max})`.

1. OpenPath's own module entry question (`moduleFor(...).diagnostics[0]`) opens the real `SliceFlow`, the A3 journey.
2. The learner acts through the port until OpenPath ends the session.
3. Then for each return visit in `schedule` (days; default 1, 8, 3, 8), the learner and OpenPath advance together and the loop repeats.

The harness returns three digests, sha256 of canonical JSON: the boundary, the hidden trace, and OpenPath's records. OpenPath-generated record ids are replaced by their order of first appearance, because OpenPath makes them from its own clock and randomness.

## Determinism results

- **Same inputs, same results.** The same profile, seed and schedule give identical boundary, hidden and OpenPath digests, for all six profiles.
- **Another seed, another learner.** A different seed gives a different boundary digest.
- **Across processes.** The digests match `traces/summary.json`, which a separate process wrote (`scripts/traces.mts`). The reviewer also checked a third run with `Math.random` and `Date.now` overridden: identical.
- **Responses alone.** The same view, state and seed give an identical response.

To regenerate the traces:

```
cd frontend && node --import tsx ../research/synthetic-learners/scripts/traces.mts
```
