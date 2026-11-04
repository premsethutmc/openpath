# 2. Canonical evidence contract (`linear-equations-subskill-projection@1`, shadow)

## Per answer

Each answer is classified on three independent axes.

| Axis | Values | Source |
|---|---|---|
| Answer correctness | correct / incorrect. Unresolved submissions (no final answer, unreadable) are not answers: they get no credit and no attempt. | The server's `grading-decision@1` verdict, via `rightAnswer` (unchanged) |
| Independence | independent / assisted. Hints, guided activity, a shown solution or a repeat make an answer assisted. | `independentAttempt` (unchanged) |
| Method | `method-verified`, `method-false-step`, `unsupported`, `no-method-evidence` (bare answer written as working), `no-working`, `partial`, `not-recorded`, `not-applicable` (choice format) | **Only** `decision.working` with `schema: grading-decision@1`, `decidedBy: "server"` and `working.schema: working-assessment@1`. Never recomputed, never read from `assessment.*` or a client-written decision. |

## Per sub-skill (one-step, two-step, both-sides, brackets, modelling)

| Field | Meaning |
|---|---|
| `status` | not-attempted / insufficient-evidence / developing / independently-demonstrated / retention-due / recovery-required |
| `attempts` | total, independent, independentRight, assisted, assistedRight, distinctVariantsRight, contradicted |
| `method` | verified (right answers given alone, current authority only), falseStep, unsupported, noMethodEvidence, noWorking, partial, partialWorking (unresolved partial derivations), notRecorded, historical, historicalVerified, status (verified / contradicted / not-established) |
| `rechecks` | independent check answers and their outcome |
| `retention` | state, due date, `need` (min(RETENTION_CHECK, the module's check items of this sub-skill), or RETENTION_CHECK when unsampled), `sampledByModuleCheck`, history (failed cycles kept, with the recovery time) |
| `historical` | everDemonstrated, firstDemonstratedAt: kept whatever happens later |

## Rules

1. **Sub-skills come from the generator id only** (`gen:<family>:<params>`).
   - Unmapped, unknown or malformed ids, and records the reader does not admit, are reported in `unknown` and credited to no sub-skill.
   - This holds even when a server decision is attached (journey J20).
2. **A right answer with a false-step method stays a right answer** in the authoritative state and in `attempts.total`.
   - In the projection it is `contradicted`: neither credited toward demonstration nor counted wrong.
   - It never becomes a verified method.
3. **A verified method requires** a current-authority server verdict `verified` + `method-verified` on a right answer given alone.
4. **No reinterpretation.**
   - A record without a server working verdict (pre-D1) is `not-recorded`.
   - A verdict recorded under another authority version is counted as recorded and marked `historical`. It is never counted as a current verified method.
5. **Retention** is the authoritative retention@2 cycle, scoped to the sub-skill.
   - A failed check makes that sub-skill `recovery-required` only. Other sub-skills are untouched.
   - The history and `firstDemonstratedAt` are kept.
6. **Deterministic.** Events are ordered by (instant, id, canonical content) with code-point comparison, then read by the existing reader. The output is a pure function of (learner, events, now, authoritative status).
7. **Shadow.** `authoritative: false`, and nothing in production imports it (static test). The authoritative state and the next step are unchanged by projecting (runtime test).
