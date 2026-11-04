# 01 — Adaptive policy decision record (Milestone 2 closure)

Base: `milestone-2/robust-adaptive` @ `c58c443`. Work branch: `milestone-2/closure-teaching-audit`.

## Decision A — Isolated slip (approved)
**Policy.** One unexplained wrong answer does not establish a misconception and does not require teaching. The observation is kept. The learner may complete an unfinished starting check, but only with the module's own diagnostic questions, and only until the diagnosis is decided. A learner whose evidence already shows the skill is asked nothing more because of the slip.

**Implementation.** No engine change was needed. This was already the behaviour once a slip really is unexplained:
- status@2 keeps a shown skill after one slip (two wrong answers in the last three undo it);
- the starting check (`diagnose`) stops at its own decision rule;
- an investigation (`investigate:` context, or recovery) starts only from `investigationTrigger`: a modelled misconception's answer, or repeated errors.

**Correction to the Milestone 2 report.** M2 policy note 1 said a slip "resumes 2–3 starting-check questions". That came from an earlier version of the scripted learner, whose "slip" on choice questions picked a modelled-misconception distractor; that is evidence, not a slip. With honest slips (scenarios 1b–1e) no further assessment, investigation or teaching follows.

**Tests** (`frontend/src/journey/policies.test.ts`):
- A1: a slip after the skill is shown, at answers 3, 4 and 5 — no further assessment, investigation or teaching; the slip stays in the record; nothing is established.
- A2: a slip before any evidence — the starting check continues only with the module's own diagnostics and carries no `investigate:` context; no teaching.
- A3: a wrong answer that a modelled misconception predicts is investigated (`investigate:` context), even from a strong learner.

## Decision B — Failed delayed retention (approved)
**Policy.** Historical achievement is preserved. Current verification is withdrawn when a delayed independent check fails. Three things are kept distinct:

| What | Field |
|---|---|
| Previously demonstrated competence | `independentAt` and the `retentionHistory` (the failed cycle is kept, never forgiven) |
| Current verification | `verified` (false while the latest cycle has failed) and `status` (`review` until recovery) |
| Recovery required | `recoveryRequired`: new in retention-failure@1; true while the latest check has failed and the skill has not been shown again on your own |

**Effect on later decisions.** The module does not treat the skill as done. It asks recovery questions. After recovery (INDEPENDENT_MIN fresh questions right on your own), the requirement lifts and a new delayed check is due 7 days later; `verified` stays false until a delayed check passes.

**Implementation.** The evidence engine already set `review` and withheld `verified`. The M2 report's statement that "the skill keeps its earned status" described the state after recovery, not after the failure. The only change is the additive field `recoveryRequired`.

**Tests:**
- `policies.test.ts` B checks the state right after the failure (review, not verified, recovery required, `independentAt` kept, a failed cycle), that the next step is a recovery question and not "done", and that after recovery the requirement is lifted, `verified` is still false, and the cycles read failed, pending.
- Across process restarts: `m2-persistence.mts` verify rebuilds three of the four Django-stored learners from their records cut off just after the failed check, then from the full record, and checks both states in a new process.

## Decision C — Recovery without a prerequisite gap (approved)
**Policy.** When prerequisite investigation finds no established gap and the problem is still wrong after a return, the problem's own skill is taught once. Its module picks the explanation through the existing teaching-eligibility gate, followed by the module's guided practice and an independent check. Then the problem is tried once more. If that try is wrong, if nothing eligible exists, or if the module has nothing to teach, recovery escalates to a person.

**Implementation.** `intervention.recovery`:
- Phase `teach` with `active` set to the problem's own skill, once since the first try.
- The module's chapter, guided and check steps run under that phase.
- Then `return` once.
- The existing bounded-retry@1 rule (first try plus 2 returns) escalates on the next wrong try. No new loop, and no new limit.

**Tests:**
- `policies.test.ts` C (scenario 3h) checks: the skill is taught, every explanation is eligible, there is an independent recheck after teaching, the problem is retried after the recheck, there is exactly one own-skill teaching cycle, it ends in escalate and then pause, and tries on the problem stay ≤ 3.
- Scenario 5e takes the same path.
