# 6. Historical compatibility

| Record | Treatment | Evidence |
|---|---|---|
| **Pre-D1 attempt** (decision without `working`, or no decision) | The answer counts exactly as the authoritative state counts it (`rightAnswer`). Method is `not-recorded`. The stored working is **not** re-judged under today's authority. Canonical PR #89 recomputed it; the integration removes that, because it would read old evidence with newer rules. | J17 `preD1`: 3 right answers whose working was false. Method `not-recorded`, falseStep 0, status independently-demonstrated, as the authoritative state counts them. Projection is repeatable in reversed order. Unit test "a pre-D1 record … is not re-judged". |
| **Verdict recorded under an older authority** (`working.versions.authority` ≠ current, e.g. `@3`) | Kept as recorded and counted `historical`. A recorded verified method is `historicalVerified` and never a current verified method. A recorded false step stays a false step: it was a refutation with a counterexample. | J17 `authority3`: historical 3. Unit test "… stays historical: never counted as a current verified method". |
| **Historical P2 certificates** | D1's rule is unchanged: @3 chains are `historical-version-not-replayable`, and relabelling to @4 fails (D1 `certificate-compatibility.test.ts`; 563 / 563 in D1's run). E1 reads verdicts, never certificates, so it cannot upgrade one. | targeted unit run (doc 7) |
| **Records the existing reader does not admit** (unknown or retired question ids, malformed records) | Reported as `unknown` (`excluded-by-existing-reader`, `unmapped-family`, …) and never credited, even when a server decision says verified. | J20; E1 scenario 16 |
| **Client-written decision or verification claim** | Ignored: no `decidedBy: "server"` means no verdict, and the credit falls back as in `records.ts`. Django refuses such a record outright (D1 `test_grader_teaching.py`). | J19; unit test; Django test |
| **Superseding decisions (regrades)** | Applied with `withDecisions` before projection, the same input as the authoritative state | journeys use `withDecisions(events, decisions)` |

## No migration

- No event is rewritten, deleted or added.
- The projection adds no event: the shadow-invariant test checks the event count is unchanged.

## Restart and persistence

| Check | Result |
|---|---|
| J18 rebuilt session (`SliceSession.fromEvents` from JSON) | Byte-identical projection and an equal authoritative state |
| `d1e1-persistence.sh` | The learner's submissions go to Django, which decides each with the real grader bundle and stores the working verdict in the decision. A fresh login reads them back, and a new process projects them. Result: every stored decision is by the server with a working verdict, the projection equals the in-memory one, and reversed store order gives the same result. |
| E1 `e1-store-replay.mts` over the M2 Django store, in two processes | Identical digests, and identical in reversed order |
