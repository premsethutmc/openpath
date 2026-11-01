# 5. Raw machine-readable journey traces

| File | Contents |
|---|---|
| `traces/A.jsonl.gz` | 300 journeys (cohort A), one JSON object per line |
| `traces/B.jsonl.gz` | 120 journeys (cohort B) |
| `traces/C.jsonl.gz` | 80 journeys (cohort C) |
| `traces/representative/*.json` | complete, uncompressed journeys: `successful-S001`, `success-after-teaching-S003`, `failed-false-claim-S003`, `forgetting-S006`, `misleading-early-success-C04` |

The schema is `JourneyTrace` in `src/journey.ts`. Each journey record has:

- **Identity:** `id` (unique learner id), `cohort`, `profile` with version, and `seed`.
- **Hidden state:** `initialHidden` and `finalHidden` (abilities per kind, misconception strengths).
- **End:** `end` (retention-passed / stalled / interaction-limit / visit-limit / day-limit) and `bounded`.
- **`visits[]`**, one entry per visit:
  - `factBefore`: the delayed-check fact the learner saw;
  - `summary`: OpenPath's closing message;
  - `openpath.attempts[]`: the time; question id and kind, all chosen by OpenPath; activity and hints; the learner's response and working; the trusted verdict; D1 working status and first invalid line;
  - `openpath.teaching[]`: the time, competency, explanation id and kind;
  - `openpath.phases`: rechecks, retention and recovery steps, in order;
  - `openpath.evidence`: status, verified, retention, **retentionDueAt**, recoveryRequired, independent counts, retention history;
  - `openpath.established`: hypotheses;
  - `openpath.e1`: the shadow sub-skill statuses, the discrepancy, and unknowns;
  - `feedback[]`: the level and message the learner saw;
  - `hiddenAfter`.
- **`instruction[]`:** the learner's hidden instruction outcomes (full / partial / none), with the state before each.

## Reproducibility

The whole experiment was run three times:

1. a first final run, which stopped on a simulator defect (doc 10);
2. a complete run;
3. a rerun after the metrics fixes.

Runs 2 and 3 produced **identical journey outcomes** for all 500 journeys. Only fields were added: teaching times, which the corrected "questions to diagnosis" metric needs. The independent reviewer replayed sampled journeys byte for byte.

To regenerate (from `frontend/`):

```
node --import tsx ../research/synthetic-learners/experiments/s2/scripts/run.mts A B C
python3 ../research/synthetic-learners/experiments/s2/scripts/report.py
```
