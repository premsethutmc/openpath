# 3. Deterministic projection implementation

| File | Role |
|---|---|
| `packages/learning/src/subskill-evidence.ts` | the projection: `classifyQuestion`, `projectSubSkills(records, now, authoritative?)`, `projectFromEvents(learnerId, events, now, authoritative?)`, `retentionCycles` |
| `packages/learning/src/subskill-evidence.test.ts` | 22 property tests on generated variants (5 seeds) |
| `frontend/src/journey/subskill-scenarios.ts` | the 17 journeys through the real `SliceSession`. The question pool is injected by the caller, so this module is not a new question selector; the registered-selector test enforces that. |
| `frontend/src/journey/subskill-evidence.test.ts` | the journeys over 3 seeds, plus the shadow invariant (no event added, authoritative evidence and next step unchanged) |
| `frontend/scripts/e1-scenarios.mts` | writes `scenarios.json` (machine-readable) and the table in doc 6 |
| `frontend/scripts/e1-store-replay.mts` | the projection over events read back from the Django store (doc 8) |

## Algorithm

1. **Events → records.** Events are put in canonical order: by the instant of `at`, then by `id` in code-unit order. The existing `readRecords` (unchanged) then reads them. If it throws, the outcome is `unreadable-events`.
2. **Records.** Each attempt is validated; malformed ones are rejected and listed. Attempts are sorted the same way: instant, then id.
3. **Classification.** Each attempt is classified, mapped or unknown. Mapped attempts are projected (correctness, independence, method, contradiction, variant).
4. **Per sub-skill:**
   - The independent answers are the non-probe, non-contradicted ones.
   - **Shown** (status@2): `INDEPENDENT_MIN` distinct variants right, and either the latest answer is right or fewer than 2 of the last 3 since are wrong.
   - **retention@2 cycle**, scoped to this sub-skill's answers (`retentionCycles`, a scoped copy of `evidence.ts:183–206`). The test "scoped cycles equal evidence.ts skillEvidence" shows it reproduces the authoritative cycle exactly on generated histories.
   - **Status** (doc 4).
5. **Prerequisite support.** The one explicit graph relation is applied (doc 4).
6. **Discrepancies** against the supplied authoritative `{status, verified}`.

## Determinism and bounds

- The output is a pure function of `(events, now, authoritative)`.
- Order is fixed by time instant and id. The result is identical after a restart and under reversed delivery order (tested; doc 8).
- Every comparison is on `Date.parse` instants, never on text. A timestamp with an offset cannot be misordered.
- The bound is `MAX_ATTEMPTS = 20 000`. Above it the outcome is `resource-limit`, with nothing claimed.
- Lookups are by map, so the cost is linear in the history (about 170 ms at the bound, measured by the reviewer).
