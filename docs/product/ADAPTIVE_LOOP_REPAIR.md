# Adaptive loop repair (stage A2)

**Branch:** `feature/adaptive-loop-repair`, from `teaching/stage2-grade10@fa01790`.

**Traces:**
- before: `docs/product/evidence/adaptive-loop-traces.before.md`
- after: `docs/product/evidence/adaptive-loop-traces.md`
- regenerate the "after" file with `bun frontend/scripts/adaptive-trace.ts`; the output is deterministic.

The learners are synthetic. These results show what the engine decides, not that anyone learned.

## Priority 0

### 1. Assessment uses the same diagnosis as Practice

`intervention.ts` `moduleStep` now hands over to the existing investigation when two conditions hold:

- the module's exploratory questions show a gap (diagnostic@1 is neither `secure` nor `insufficient_evidence`);
- one of the wrong answers is on a problem diagnostic@2 can reason about (`familyOf`, and a written misconception exists).

The hand-over returns phase `recover` with that answer as the original problem. This is the same `recovery()` that Practice's "Find out what went wrong" and the year page's "I'm stuck" open: same follow-up selection, same misconception attribution, same supporting-skill module.

What happens after the investigation:

| Investigation outcome | What the module does |
|---|---|
| Solved (after help, or on a retry) | Asks a **new question alone**. It does not teach the skill again. |
| Escalated | Pauses. |
| Anything else (unsure, unexplained, two tries) | Continues with its own explanations. |

Nothing names a skill: the supporting skill comes from the misconception's own `competency`.

There is no nesting. A module that recovery opens for a supporting skill gets no `evidence` getter, so it cannot start a second recovery. In the UI this is `Module` inside `Recovery`; in the harness it is `inRecovery`.

Evidence semantics are unchanged:

- the follow-ups are `diagnostic` answers (independent, as before);
- the second try at the problem is `original` with `n > 1` (assisted, as before);
- nothing becomes evidence that was not evidence before.

### 2. Teaching eligibility gate

`teaching-contract.ts` `teachingEligibility(module, strategy)` runs the strategy's own sections through `lessonBlocks`, so the checks are the same ones the ratchet counts.

| Status | Condition | Effect |
|---|---|---|
| **Eligible** | Machine-checked, with no outstanding violation | May be taught |
| **Failed** | Checked, with a violation | Never selected (`orderStrategies` and the planner's apply count exclude it) |
| **Not checked** | Hand-written modules whose questions are authored, not generated | May be used, and the lesson says it has not been checked |

Every lesson screen now says one of two things:

- "This explanation has been checked automatically against its question. A teacher has not reviewed it yet."
- "This explanation has not been checked automatically or reviewed by a teacher yet."

Nothing is presented as educator-approved, and no mastery is awarded on that basis. Verification still needs educator-validated content (H-V3, unchanged).

**Fallback when no eligible explanation exists:** the module pauses with "OpenPath has no checked explanation for this yet, so it will not show one. Go through it with a teacher or parent; carry on with other skills meanwhile."

**Platform-wide** (1,179 strategies):

| Status | Count |
|---|---|
| Eligible | 818 |
| Failed (excluded) | 318 |
| Not checked (hand-written) | 43 |

**Square roots:** the method "Think of the square facts: 7 × 7 = 49, so √49 = 7", shown against a √2809 question, failed the checks (`worked-unverified`, `text-not-instance`). The `root` family now has instance teaching built from the question's own number:

1. the tens the root lies between;
2. the possible last digits;
3. the check, including the other candidate's square.

Both lesson sections now pass. The `root` fingerprint changed.

### 3. Prerequisite graph: Pythagoras

| Relation (into Pythagoras) | Before | Now | Evidence |
|---|---|---|---|
| distance-intro → Pythagoras | support | **disputed** (reversed) | The distance formula *is* Pythagoras on coordinate differences. The distance family attributes its `subtract-squares` mistake to Pythagoras. Pythagoras is taught from Grade 7, distance in Grade 9. |
| trigonometry.ratios → Pythagoras | support | **disputed** (reversed) | The third side in trigonometry is found with Pythagoras. Pythagoras is taught from Grade 7, ratios in Grade 10. |
| Pythagoras → distance-intro, Pythagoras → trigonometry.ratios | (none) | support (new) | The corrected direction. Never a gate, pending educator confirmation. |
| square-roots → Pythagoras | **disputed** (existing decision, kept) | **not added** | The expansion file already disputes this relation: square roots start in Grade 8, after Pythagoras (Grade 7), so it would hold a younger learner back. That decision stands. For a Grade 10 learner the route to square roots comes from the misconception attribution (`no-square-root` → square roots), not from the graph. Whether to add it as a non-gating support from Grade 8 is an educator decision. |
| similarity, triangle-properties, area-squares → Pythagoras | support | unchanged | Mathematically sound. The TN Grade 10 proof of Pythagoras uses similarity. |
| triangle-types → Pythagoras | plausible | unchanged | Pending confirmation. |

No edge was certified, and the persona results do not depend on the graph: B and B2 reach square roots through the misconception. I first added square-roots → Pythagoras as a support, then found the existing dispute (the regression test guards it) and removed it.

Unconfirmed relations (anything not `mandatory`) are advisory only:

- the Recovery screen lists only confirmed relations;
- the engine's text for an unconfirmed support says "A related skill that is not shown yet may help: …" rather than "This problem rests on …".

The expansion file version is now 1.0.1.

### 4. Pause respected

`plan.ts` `nextActivity(…, { now, session })` computes the skills whose module says `pause` and returns them as `paused`. A paused skill is never offered as "continue" or "review".

`learnerState` passes `now` and the session. The year page shows "Paused for a teacher or parent: …".

The pause lasts for as long as `moduleState` derives it from the records. It lifts only when the records change that decision (new evidence on the skill). It never lifts by asking again.

## Priority 1

### 5. Investigation message

The old text, "It does not count against you", was false: the follow-ups are independent diagnostic answers.

The message now says: "One more question to help work out what happened. Like every answer you give on your own, it is part of your record and helps OpenPath choose what comes next."

### 6. Retry classification

The new recovery phase is `solved_on_retry`. It applies when the successful second try had none of these since the first try:

- a hint;
- a shown solution;
- teaching;
- guided practice.

Its label is "Solved on a second try". `solved_after_help` is kept for genuine help. A second try is still assisted evidence (`n > 1`), so neither label can show the skill.

### 7. The strong learner's three follow-ups

**Cause:** diagnostic@2 can establish a misconception only after seeing it twice. "A slip" has no prediction to match, so an unexplained wrong answer could only end after `maxFollowUps` (3) questions.

**Rule now:** follow-ups exist to tell written explanations apart. When no written explanation has support ≥ 0.15 (the existing `competing` threshold), more questions could only separate "slip" from "unexplained", and both lead to the same next step. So the investigation stops at once, with status `uncertain`. The policy is now `diagnostic@2.1-draft`.

A wrong answer that *matches* a misconception is investigated as before (B and B2 still ask one follow-up).

**Mastery:** a slip after the skill is shown does not erase it. This is status@2, unchanged, and is now tested (`a single slip after the skill was shown does not erase it`).

## Priority 2

### 8. Student working

**Integrated for `apn` (arithmetic progressions) only.** Its solution is plain arithmetic (n − 1, × d, + a), so the existing numeric contract applies unchanged: every line must be a true statement and the last must be the answer. "12 + 70 = 81" is reported as "12 + 70 is 82, but 81 is 81".

Two corrections to the reporting:

- A line in words is reported as "could not be checked", no longer as "a slip".
- Working still never changes evidence, and the grader's `methodExamined` and `firstError` stay false and null (it does not examine working).

**Not integrated:**

| Family | Why not |
|---|---|
| `ahpyth` | Working involves squares and √. Not checked whether the numeric reader handles them. |
| `anbag` | The answer is a fraction. |
| `hcf` | Each line is a division with a remainder (`a = q × b + r`). The numeric contract reads these, but no method recogniser exists and the answer is not the last line's value. |

Each needs a family adapter. Answer-level grading is retained for them.

### 9. Multiple choice

876 families have a multiple-choice form. Their wrong options carry misconception tags generated from the same family misconceptions as typed answers; the tags are draft, not educator-validated.

| Coverage | Families |
|---|---|
| Every wrong option tagged | 85 |
| Some wrong options untagged | 791 |
| No wrong option tagged | 0 |

In the Grade 10 scope, 193 families have 15,529 tagged wrong options out of 23,053. The weakest are `ancomp` 3%, `asslope` 6%, `aladd` 21%, `amplaces` 29%, and `aleval`, `agediv`, `ahcomp`, `ajfsq`, `aksarr`, `alrop`, `alfop`, `amnline` at 32–33%.

How each engine treats a wrong option:

- **diagnostic@1** (Assessment) uses a tagged option's hypothesis; an untagged option counts only as wrong.
- **diagnostic@2** never infers a specific misconception from an option letter. An option answer reads as "another wrong answer", which keeps the "no precise misconception from a bare option" rule.

### 10. The "exhausted pool" test

**Cause:** the test's learner typed "3" for a multiple-choice check. That answer is unreadable, so it is undecided rather than wrong, and the engine rightly asked the same check again on every step.

**Fix (test only):** the learner now gives a wrong option for a choice question. The engine is unchanged.

## Unchanged

- Authoritative grading: same verdicts on the 9,762-request regression.
- Quarantine (`selectable`), and certification (`grading-certifications.v1.json` untouched).
- Learner records: no record type or field added. `paused` and `teachingReview` are derived, never stored.
- E7 advisory isolation: no E7 or grading code touched.
- The selector-registration test now also lists the trace harness. It reads pools through `modulePhasePool` and applies `selectable()`. That listing was missing at `fa01790`, and the test failed there.

## Found while verifying (not fixed)

- **What is checked and what the lesson shows differ.** The eligibility gate checks a strategy's sections as the teaching contract assembles them (`lessonBlocks`, the same view as the lesson page). The Assessment and recovery lesson (`Learn.tsx` `Lesson`) still renders the raw screen: its text, plus `screen.math` (the family solver's lines). For square roots it shows "√2809 = ? · 53 × 53 = 2809", not the checked three-step solution. Nothing shown is wrong, but the checked steps are not the ones displayed. The fix is to render the contract's blocks in `Lesson`, which is a UI change left for approval.
- **Unreadable answers repeat the same check.** An unreadable answer on a check is undecided, so the same check is asked again with no limit. This is correct grading, but nothing bounds it.
