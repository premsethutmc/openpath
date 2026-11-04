# 01 — Baseline and gap analysis (before any code change)

Branch `milestone-2/robust-adaptive`, created from the accepted Milestone 1 commit `9f3f65d6a4f3340e1e41ea0cca0061ceb20a5b0c`.

## Known state confirmed
- Governance failure (`question-status.test.ts` › "selection code is registered": `hypotheses.ts` not on the allowlist): present, as reported in M1 (introduced on the evidence branch by `5b0c429`).
- 44 skipped tests: all `P2-FINAL` (routes unsupported by design since 49a6be8), unchanged.

## Frontend typecheck (now runnable)
The registry is still unreachable from the sandbox (`npm view` fails through the proxy). The missing type packages were built from their sources on GitHub, which is reachable: DefinitelyTyped `types/react` and `types/react-dom` 19.3.x, `types/node` v22, `csstype` 3.2.3, and `undici-types` 8.9.0 (from the local tool cache). They were placed in the scratch `node_modules`; nothing in the repository changed for this. The project script `typecheck` runs three configs:

| Config | Source branches (int/cert/loop/p3 · renderer) | Integrated before M2 | Cause |
|---|---|---|---|
| `tsconfig.json` | 0 · 23 | 391 unique (737 lines) | M1 slice (`src/journey`) pulled the learning package into the main config; the renderer's `src/math/react-shim.d.ts` stand-in overrode the real React types; 2 unused locals in the renderer demos |
| `tsconfig.english.json` | 0 | 0 | — |
| `tsconfig.mathematics-integration.json` | 137 / 170 / 175 / 175 · 1 | 124 (119 pre-existing) | pre-existing on every source branch (the typecheck script was already failing at this config before integration) |

## Adaptive mechanisms that already exist (one implementation each; none duplicated)
| Concern | Where | Notes |
|---|---|---|
| Investigation | `hypotheses.investigationTrigger`, `reasoning.reason` (`maxFollowUps` 3, loop stopping rule `nothingToTellApart`), `intervention.moduleStep` (explore / `investigate:` context) | |
| Teaching eligibility | `teaching-contract.teachingEligibility`, `intervention.failsChecks` / `orderStrategies` | unchecked explanations are allowed (review "not-checked") |
| Recovery | `intervention.recovery` (`RECOVERY_DEPTH` 2), app `Recovery` view, `adaptive-loop.ts` | |
| Retention | `evidence` retention@2 (`RETENTION_DAYS` 7, `RETENTION_CHECK` 2, `INDEPENDENT_MIN` 2), module phase `retention` | schedule is derived from records; no scheduler |
| Pause | `intervention` pause@1, `plan.pausedSkills` | |

## Gaps found (all confirmed by running the real components)
1. **Unbounded: unreadable answers.** An unresolved answer is never an attempt (approved policy P1), so the module asked the same question again with no limit (a probe stopped only at its own 60-answer cap).
2. **Unbounded: app retry.** In study-session mode (`StudySession` → `Module sessionMode`), `Feedback` offered "Try again" after every wrong answer, with no limit; each retry wrote another attempt.
3. **Unbounded: recovery return loop.** When every supporting skill was secure and the original problem was still wrong, `recovery()` returned "return" again and again (scenarios 3e/5e ran 250 interactions without ending).
4. **Disconnected: the M1 slice did not call `moduleState` the way the app does** (without the learner's whole evidence, so the loop's `recover` path never ran) and had no hints, retries, recovery or later sessions.
5. **Inconsistent P2 conclusions.** A linear jump was refused ("a derivation with a jump is refused"), but a polynomial jump from an unfactored equation to its roots was authorized (`solve-conclusion`); a false equation step was "unsupported", never "invalid".
6. **Leak in the M1 interface guard.** A bare answer (`x = 11`, `32`) and a one-line restatement (`52 − 20 = 32`) still reached `method-verified`; the M1 closure report's statement that answer-only working could not was wrong for these.
7. **Governance.** `hypotheses.ts` selects questions (`discriminatingProbe`) without being registered.
8. **Typecheck.** As above.
