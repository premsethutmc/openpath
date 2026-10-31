# 5. Certificate compatibility (v2 → v3)

## Where certificates live

- **P2 certificates** (`openpath-derivation-certificate@3`, authority @3) are produced in memory by `DerivationSession` and checked by `replayDerivationChain`.
- **The journey** (`frontend/src/journey/session.ts`) logs a `derivation-authorization` record. The record holds:
  - the status;
  - the certificate digests;
  - the moves;
  - `versions: {authority, registry, kernel}` from `derivation-interface.ts`.
- **The backend** (`backend/family/learning.py`, assessment@1) stores no certificates. It also refuses any client claim of `derivationVerified: true`.

There is no production table of certificates, so nothing needs migrating.

## Behaviour

| Requirement | How it is met |
|---|---|
| Old evidence stays available | Nothing is rewritten or deleted. The B2 code only reads chains; no migration code exists. |
| v2 is never treated as v3 | `replayDerivationChain` refuses any `version` other than `@3` ("unknown certificate version"). It also refuses certificates issued under a different authority, registry or kernel version. |
| Historical results are not reinterpreted | The new read-only helper `chainVerificationStatus(statement, lines, chain)` returns `historical-version-not-replayable` for any chain carrying another version, together with the versions found. The original recorded result stands, unverified. |
| Explicit status when v2 cannot be replayed | `chainVerificationStatus` returns one of `replayable-current`, `historical-version-not-replayable` or `failed-replay`. |
| New certificates replay independently | The engine adopts a P2 verdict only after `replayDerivationChain` succeeds. Each certificate digest is recorded as gate evidence for its line. |
| Cross-task, truncated, tampered and forged chains fail | Unit tests in `parser-p2-integration.test.ts` (Stage 6), plus the integrity run on every certified chain in all corpora (doc 8). |

## Proposal (not performed)

If historical journey logs must be re-verified one day, the proposal is:

1. Read each `derivation-authorization` record's `versions`.
2. For records not issued under authority @3, add `verification: "historical-version-not-replayable"` beside the original record, as a new log entry, leaving the original untouched.
3. Do **not** re-run old working under @3 and overwrite the result: @3 can certify or refute differently from @2.
4. Re-assessment under @3 may be offered as a **new** event, labelled as such, if the product wants it.

No migration was run. The proposal needs explicit approval.
