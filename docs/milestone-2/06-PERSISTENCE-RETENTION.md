# 06 — Persistence and retention

## Single learner (Milestone 1 round trip, re-run)
Slice events → Django store → fresh login → new process: attempts, server decisions and teaching history are identical; the due date is the independent answer + 7 days on the real clock (`frontend/scripts/m1-persistence.sh`).

## Four learners, two sessions eight days apart (`frontend/scripts/m2-persistence.sh`, `MultiLearnerPersistence`)
Session 1 (real components) → Django store, with the server clock set to each record's own time → a NEW client reads back → a SEPARATE Node process rebuilds each learner ONLY from those stored records, comes back 8 days later, finds the due review and takes it (session 2) → store → a third client reads everything back → a new process verifies. Machine-readable: `persistence-report.json`.

| learner | competency | attempts and decisions survive | server verdicts equal the slice's | evidence reconstructed consistently | teaching and assistance history | due date = independent answer + RETENTION_DAYS | due review discoverable (evidence says due, opening the skill asks it) | repeated reads identical | retention outcome | failed check leads to recovery steps | no duplicate review or intervention | session 1 → session 2 → final |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 2a | linear-equations | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | transfer, retention scheduled (due 2026-10-08T09:08) → first step retention → cycles passed, next due 2026-10-08T09:08 |
| 3a | quadratic-discriminant | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | transfer, retention scheduled (due 2026-10-08T09:11) → first step retention → cycles failed, pending, next due 2026-10-16T09:22 |
| 4b | linear-equations | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | transfer, retention scheduled (due 2026-10-08T09:02) → first step retention → cycles failed, pending, next due 2026-10-16T09:18 |
| 1g | linear-equations | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | transfer, retention scheduled (due 2026-10-08T09:02) → first step retention → cycles failed, pending, next due 2026-10-16T09:15 |

Also checked in the Django test: re-sending a stored record is refused (the store keeps no duplicate history), and two reads of the same record are identical.

**What this does and does not show.** Attempts, server decisions, hints, retries (n) and delivered teaching are durable (`PupilEvent` and the decision log). Evidence, hypotheses, the investigation and teaching decisions and the retention schedule are recomputed from those records on every read, and the same records give the same result in a new process. A calculated due date is **not** a scheduling service. The review is found when the learner (or the app) reads the record or opens the skill; nothing sends a reminder, and no background scheduler exists or is needed for these journeys.