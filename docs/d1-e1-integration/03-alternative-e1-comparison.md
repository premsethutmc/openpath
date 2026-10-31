# 3. Alternative E1 comparison

The alternative is `feat/sub-skill-mastery-evidence` (`0d1f622`, reference only). Its projection module (`sub-skill-evidence.ts`) was **not** imported: there is one projection, the canonical one from PR #89. Each listed safeguard was compared with the canonical branch, and only the genuinely missing ones were brought across.

| Safeguard | Canonical PR #89 | Alternative | Integration |
|---|---|---|---|
| Forged verdict rejection | Recomputed the method from the recorded working and ignored `assessment.derivationVerified`. There was no stored verdict to forge yet. | Accepted a working verdict only from a server decision (`schema` + `decidedBy: "server"`). Read decisions only for records admitted for that learner. Rejected a malformed verdict (status `verified` with `method-false-step`). | **Reused**: the server-decision guard (`trustedWorking`), admitted-records-only and same-learner reading. Tests: integration contract ×3, J19. |
| Production-import isolation | Runtime shadow invariant: evidence and next step unchanged, no events added. | Static scan: no non-test module imports the projection or its journeys. | **Reused**: the static scan, extended to the canonical module names, `d1e1-journeys` and backend files. The runtime invariant is kept. |
| Event ordering and replay | Instant, then id (code-point); store replay in two processes. | Instant, id, then canonical content, so duplicates cannot reorder by position. | **Reused**: the content tie-break in `projectFromEvents`. Test: duplicate events in either order give the same projection. |
| Historical achievement preservation | `historical.everDemonstrated` and `firstDemonstratedAt`; failed cycles kept | Same idea (`firstShownAt`) | Nothing missing. Canonical kept. |
| Cross-family leakage scenarios | 17 scripted-session scenarios | A real module-flow scan over the M2 scenarios, plus a learner right on two-step and wrong on every both-sides and bracket question | **Reused**: the scan, as `d1e1-leakage-scan.mts` over the canonical projection (doc 5). |
| Persistence and restart | Store replay over the M2 Django store | `SliceSession.fromEvents` replay digest | Nothing missing for answers. **New**: `d1e1-persistence.sh`, a Django round trip of D1 working verdicts, projected in a new process (doc 6). |

## Deliberately excluded from the alternative

- **Its projection, statuses and leakage kinds.** That would be a second, competing projection. The canonical `discrepancies` and statuses carry the same findings.
- **Its `not-in-delayed-check` status.** The canonical `retention.sampledByModuleCheck: false` with `need: 2` carries the same fact and keeps the competency's bar.
- **Its D1 fixture file.** Integration tests use the live D1 grader instead.
- **Its digest field.** Determinism is shown by byte-equal JSON in tests, journeys and the store replay.
