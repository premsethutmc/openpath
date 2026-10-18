# Integration of PR #51 and PR #52 on PR #50

Branch `integ/verification-planner`, from `feat/essay-diagnostic-workflow` (PR #50, 2a89848):

1. a merge of `feat/verification-consistency` (PR #51, 8865e81);
2. a merge of `fix/essay-planner-corrections` (PR #52, a702878);
3. one integration commit that applies the owner's decisions H-V1 to H-V4 and reconciles the two PRs.

Both PRs and the PR #50 branch are unchanged. This document covers the integration, not the two PRs again. See
[VERIFICATION_POLICY.md](VERIFICATION_POLICY.md) and [planner-corrections/README.md](planner-corrections/README.md).

**No change** was made to:

- the estimator, the mastery and demonstration thresholds, evidence eligibility for estimates, or the retention
  schedule;
- `ESSAY_POLICY_DRAFT`, which stays locked.

Only the verification policy changed, as approved.

## Merge conflicts

| File | Conflict | Resolution |
|---|---|---|
| `essay/journey.ts` (two places) | #51 added `events, now` to every `engineClaim` call, for reviewed-only verification. #52 introduced a `view` helper and the conditional-step logic around the same lines. | Both kept: #52's helper and logic, with #51's signature. |

Every other file merged automatically. After the two merges alone, core passed 291/291; then the semantic issues below
were reconciled.

## Audit and reconciliation

### 1. One verification definition across the engine, the main app and the essay studio

- **Found.**
  - #51 gave the engine `verifiedLevel` and the essay claim a reviewed-only reading.
  - The main app still had its own rule: approved questions, plus the gate's "confirmed" standing.
  - The mathematics adapter (item 8) reads the engine's schedule status.
- **Done.** A single core function, `verificationClaim` (`packages/english-core/src/verification.ts`), is now called by:
  - the essay claim (`engineClaim`), and so by the profile, the studio and the outcomes;
  - the main-app profile (`profile.ts`): `mastery: "verified"` and `verifiedLevel` both come from it, under the pilot
    policy.

  The main app's "shown" and "confirmed" standings are unchanged. They are standings, not verification.
- **H-V2.** `retention.ts` counts only **distinct fresh** answers at the band towards `verifiedLevel`, and judges the
  check on that fresh evidence alone. Repeats include a question met before with help; a second answer to the same
  question is always a repeat. The schedule itself (status, due dates, checks) is unchanged, and K10-2 still matches it
  field by field with the previous code.

### 2. The demonstration that starts the seven-day interval

- **Conflict.**
  - The engine's schedule starts at the first demonstration at **any** band.
  - #51's verification clock starts when the **target** was first shown.
  - #52's `retentionDue` used the engine's clock (status "overdue"). When a lower band was shown first and the target
    later, the planner treated a delayed check as due before the target's 7 days had passed. It then spent the
    questions kept for retention on a check that could not verify. In K13-1: engine due on day 7, target shown on
    day 5, check "due" on day 8.
- **Done.**
  - The interval starts at the first session showing the target without help, outside teaching. After a failed
    delayed check it starts again from the next such session (`targetClockAt`), as the engine's `verifiedLevel` does.
  - `retentionTiming` returns `due` only once the target's own delay has passed. Before then it returns `waiting`: the
    journey asks and teaches nothing for that skill, as for a planned check that is not yet due.
  - #52's journey retention steps and the outcome's due date use the same clock.
  - `targetShownAt` is unchanged for reporting, so "retention: not demonstrated" after a failed check is still shown
    (K4-8).

### 3. Planner scheduling and the actual availability of eligible questions

- **Found.**
  - The planner reserves retention questions, preferring `validated` ones.
  - Under the pilot policy, a delayed check on unreviewed questions records retention but can never verify.
  - No shipped question is validated, so in the shipped app every delayed check is of this kind.
- **Done.** The outcome now says so when it is true: "Its questions are not reviewed by an educator and released, so
  under the pilot policy this check records retention but cannot verify mastery". K9-3 asserts this text; K9-2 asserts
  it is absent with reviewed, released questions.
- **Not done.** The planner still schedules the check: the retention evidence is still useful, and changing that would
  be a planner-policy change.
- **Blocker (content, not code).** With the shipped bank, the independent recheck for plurals is still blocked (K9-1,
  K11-4).

### 4. Repeated essays

- #52's A2 and the merged code agree: a later essay does not re-teach a skill shown since, merely because an earlier
  essay's hypothesis remains.
- **K9-6** (new): Karthik is verified on reviewed, released stand-ins. A later essay with one plural slip ("won two
  medal") then gives decision `check_only` (no lesson first). In addition:
  - his first journey record is byte-identical afterwards;
  - his lesson programme and its completion are unchanged;
  - verified mastery is not withdrawn by an essay suspicion;
  - the record replays to an identical profile.
- **Still open (from #52).** `planDiagnostics` can still plan repeated diagnostics on a later essay for a skill already
  shown.

### 5. Fixed lesson programme: completion and resume

There are two progress figures, and both are kept. Neither reads the engine.

| Figure | Source | Meaning |
|---|---|---|
| Journey progress (#52) | The step statuses of one journey | Steps done, skipped and blocked |
| Lesson programme (#51) | The competency's lesson parts across journeys, from the ledger's lesson records | Lessons completed, as learning progress |

- **Interaction.** When #52 skips a conditional lesson (the check before it showed the skill), the programme still
  lists it and still offers "Next lesson", consistent with #52 ("stays assigned and can still be opened"). A skipped
  lesson is never counted as completed in either figure.
- **Resume.** Completion is read from intervention events, so it survives reloads, new essays, blocked checks and
  missing questions (K12, ESSAY-LESSONS, K9-6, the browser test).

### 6. Reviewed-only verification and non-retroactive approval (H-V3)

- **Content.**
  - An item may carry `released_at`, the time this version was approved and released.
  - The validator requires it on `validated` items and refuses it on any other (K10-6).
- **Eligibility.** An answer is eligible only when all of these hold:
  - its question version is `validated` with a `released_at`;
  - it was given at or after that release, to that exact version;
  - it is the learner's first encounter with the question, with or without help.

  `verificationEligibility` records the reason for every answer.
- **K9-5.** The same record with the questions released after the target was first shown is shown at the target, but
  not verified, and says why. The estimate and composite are identical to the early-release reading. Released after
  everything, nothing is eligible.
- **Main app.** The same three cases are tested: released before, released after, no release recorded
  (`mastery-gate.test.ts`).

### 7. Historical ledger replay and rollback

- **Replay.**
  - PI-1 and AC-3 (the PR #24 record) replay with an identical composite, decisions and standings. Only the additive
    `verifiedLevel` fields differ.
  - #52's A1 is byte-identical for nodes without teaching. For nodes with teaching, it changes only the level reported
    between a lesson and the next qualifying answer; this is #52's intended change, and the PR #24 replay tests pass.
  - The simulations (S1–S7) and the verification audit give the same results as on PR #51.
- **Stored data.** No claim is stored. Events are never rewritten.
- **Rollback.** Reverting to #51 or to #50 restores the earlier reading.
- **Rollback risk.** Once a content release adds `released_at`, older code ignores that field. It would then treat
  earlier answers to a validated version as eligible, which is the retroactive reading H-V3 rejects. A rollback after
  the first educator release should be a forward fix, not a revert.

### 8. The mathematics foundation's provisional practice evidence contract

`feat/mathematics-learner-journey-v2`, which contains `feat/mathematics-foundation-v1`, has no PR. It was merged onto
this branch **in a scratch worktree only**. It merges without conflict, and both suites pass:

- frontend 296/296, including its 41 mathematics tests;
- core 297/297.

The contract `math-ledger-practice@1` stays compatible:

- every mathematics item is `provisional`, with `use: "practice"` and `admissible: false`;
- the updater holds such answers, so they never change an estimate;
- `verificationEligibility` classes them `unreviewed`, so they can never verify.

**Conflict to fix in the mathematics branch, not here.** `sharedProfile` reports
`status: "verified"` from the engine's **schedule** status (verification@1). That meaning is a lower band kept, and on
any questions. With practice-only evidence it cannot occur today. Before mathematics evidence is ever admissible,
`sharedProfile` should call `verificationClaim` (pilot policy) like the other surfaces.

The mathematics branch was not changed, and it is not part of this integration.

## Behaviour changes in the integrated branch (compared with #50)

1. "Verified" anywhere in the app now means verification@2 under the pilot eligibility policy. With today's content, in
   the main app, the essay studio and the pilot build alike, **nothing can be verified**: no question is validated and
   released. Owner approvals allow questions into the pilot build, but they are not educator review and never set
   `validated`.
2. #52's Karthik before-and-after table ("verified 5") used unreviewed stand-ins. Under the pilot default the same run
   reads "shown at the grade target: not verified (unreviewed questions)". With the developer policy it reads
   "verified (developer test)".
3. A repeated question never verifies, even on the delayed day (H-V2).
4. When a lower band was shown first and the target later, a delayed check waits for the target's own 7 days, instead
   of being offered when the engine's earlier check falls due.
5. The outcome says when a delayed check's questions cannot verify under the pilot policy.
6. Studio and profile texts now say "reviewed and released before they were answered" and "two different fresh
   questions".

## Results

| Suite | Result |
|---|---|
| English core (`npm test`) | 297/297, including K9-5, K9-6, K10-5, K10-6, K11-5 and K13-1 (new) and #52's 12 planner tests |
| Core typecheck | clean |
| CI tools (lock, bank, spelling, pilot approvals, simulation, demo, e3, round-plurals) | all pass; the simulation JSON is unchanged |
| Frontend (`npm test`) | 255/255 |
| Browser, essay (`essay:e2e`) | 9/9 |
| Browser, Karthik's two-track multi-session journey and a second essay (`essay:e2e-diagnostic`) | 1/1 |
| Mathematics branch merged in a scratch worktree | frontend 296/296; core 297/297 |
| CI at aa013a4 (Django on Python 3.10, 3.12 and 3.13; frontend typecheck and build; browser end-to-end with PostgreSQL) | 7/7 pass |

## Remaining blockers

1. **Educator review.** Round 1 and the 30 plural questions (`educator-review-v1/round-plurals/`) are prepared, but
   not reviewed. Reviewers and an adjudicator must be chosen by the owner.
2. **A content release.** After review, an owner-approved change must set `validated` and `released_at` on approved
   versions and load the plural questions. Until then, the pilot cannot verify anything.
3. **Too few questions at the target.** With the shipped bank, plurals cannot be rechecked or retained (K9-1, K11-4).
4. **Mathematics `sharedProfile`.** It must use `verificationClaim` before mathematics evidence becomes admissible
   (item 8).
5. **Open items from #52.**
   - Repeated diagnostics on a later essay for a skill already shown.
   - Diagnosis below the target, which needs the locked diagnostic policy changed.
   - Remedial teaching after a failed planned delayed check.
6. **Naming.** Both PRs added a `k10-*.test.ts` file with "K10-n" test names. They are distinguishable by file name
   only.
