# Verification: one meaning, an eligibility policy, plural coverage and the lesson programme

This change follows on from PR #50. It makes no change to the statistical estimator, the mastery thresholds, the evidence
gate or the ledger. Stored events are never rewritten: every claim below is derived when it is read.

## 1. One meaning of "verified" (verification@2)

**Definition.** Band L is *verified* only when all of these hold:

1. L was first shown without help (outside a teaching session).
2. A later session, at least the delay after that, has fresh evidence **at** L. The delay is `mastery_gap_days` = 7 days,
   less the schedule's existing half-day tolerance. Evidence at L means at least 2 answers on questions of difficulty
   L − 0.5 or above.
3. That fresh evidence favours L over L − 1, by the existing `checkPassed` rule.
4. No later scheduled check has failed.

Before this change, the band reported as verified could be a band first shown *in the check session itself*. The PR #50
review found this case.

### Where "verified" is used, before and after

| Place | Before | After |
|---|---|---|
| Engine `retention()` | The schedule judged its check at "the retained level". That level could be raised in the same session, so a band first shown on day 12 read as verified on day 12. | The schedule is **unchanged** (status, level, due dates, checks, `lastVerifiedAt`). A new field, `verifiedLevel` (and `verifiedLevelAt`), records the band a delayed check at that band verified. |
| Engine `leafView().verification` | `status`, `currentLevel` | The same fields, plus `verifiedLevel` and `verifiedLevelAt` (additive). |
| `summarise()` (learner-facing text) | "Confirmed at band *currentLevel*" | "Confirmed at band *verifiedLevel*"; a band shown since then is reported as "shown, not yet confirmed". |
| Essay `engineClaim` → profile → studio | Verified = the schedule status is verified and the supported level is at the target or above | Verified = **`verifiedLevel` at the target or above**, and allowed by the eligibility policy (§3) |
| Main app profile (`profile.ts`), shown as "verified" | Shown on educator-approved questions (no delay needed) | Shown on approved questions **and** kept at a later check (standing "confirmed"). The band verified is the band kept (`verifiedLevel`). The new `masteryBasis` field says whether the claim rests on approved or draft questions. |
| Rule evidence (spelling rules, doubling journey) | Demonstrated, then a delayed session at least 7 days after the previous evidence, with 2 applications and no rule error | Unchanged: it already meant this |

### Historical compatibility (audited)

- **Schedule.** K10-2 compares the new `retention()` field by field with the previous implementation (kept as a test
  fixture) on 150 random histories. All schedule fields are identical, so due dates, retention selection, "check due"
  and "failed" replay exactly as before.
- **Recorded learner history.** The PR #24 record (PI-1, AC-3) replays with an identical composite, identical decisions,
  identical profile standings and identical views. The only difference is the additive `verifiedLevel` fields, which
  are checked never to exceed the current level.
- **Derived claims that change.** `node tools/english/verification-audit.ts` re-reads the repository's scenario records
  under both definitions:
  - **3 of 24 scenario claims change**, all from verified to not verified.
    - App S2 and app S4b: their delayed check had only one question at the target, because the shipped pool has one.
    - Reviewed-supplement S6: verified at a lower band, then the target was first shown later.
  - Of 500 random histories, 389 end with the schedule at "verified". In 216 of those, the band the old summary called
    "confirmed" was higher than the band a delayed check actually verified. That text was overclaiming, and is now
    correct.
- **Main app.** "Verified" in the parent and learner profile now also needs a later check. A skill shown on approved
  questions but not yet re-checked reads "on educator-approved questions; verified after a later check" instead of
  "verified". In the repository, no shipped question is `validated` and no pilot approval marks one, so no current
  record changes from verified to not verified. Once approvals mark questions validated, this is a stricter reading:
  verified needs the later check.
- **Stored records.** No claim is stored that needs migrating.
  - Journey records keep the level from when they were created, as history; `journeyStatus` recomputes it when read.
  - Hypotheses, profiles and outcomes are always derived when read.
  - Reverting the code restores the earlier reading. No data needs to change either way.

## 2. Plural-noun assessment by coverage (proposed, provisional)

`content/english/proposed/g8-plurals-v1/` has **30 questions**. They are not loaded by the app and all are
`evidence_status: "provisional"`, so until an educator reviews them they never change an estimate, never take a formal
role and never verify anything. They are now in the consolidated review package as set `proposed-plurals`.

| Sub-skill | Diagnostic | Independent | Transfer | Delayed retention |
|---|---|---|---|---|
| Regular plurals (-es, -ves) | typed, b 4.5 | typed b 5.25; choice b 5.0 | correction in context, b 5.75 | typed, b 5.5 |
| Irregular plurals | typed, b 4.5 | choice b 5.0; typed b 5.5 | correction, b 6.0 | typed, b 5.25 |
| Already-plural nouns (children, people, cattle) | choice, b 4.75 | correction b 5.5; choice b 5.75 | correction, b 6.25 | typed, b 5.0 |
| Number + plural | choice, b 4.5 | typed b 5.0; multi (find both) b 5.75 | correction, b 5.5 | typed, b 5.25 |
| Quantifiers (many/much, a few) | typed, b 4.75 | choice b 5.25; choice b 5.75 | correction (many/much), b 6.0 | typed, b 5.5 |
| Countable/uncountable | choice, b 5.0 | correction b 5.75; multi b 6.25 | correction, b 6.0 | choice, b 5.25 |

- **Format mix.** 19 of the 30 are constructed (typed).
- **Bands.** Diagnostic questions are at bands 4.5–5.25, so right answers can rule a gap out. Checks and retention are
  at 5–6.5.
- **Checks (K11).**
  - The answer keys score as intended.
  - No question is close to a bank question or to another proposed one.
  - No answer appears in a lesson.
  - Each sub-skill has one diagnostic, two independent, one transfer and one retention question.
- **Counterfactual.** As if approved (`validated`), they give one full sequence for plurals: a diagnosis, an independent
  check, the policy's three later checks and a delayed retention check. The shipped bank cannot (K11-4). K9-4 runs the
  whole journey with them to verified mastery under the pilot policy.

## 3. Eligibility policy for verified mastery (verification-eligibility@1)

| Policy | Who | Verified mastery requires | Unreviewed bank questions |
|---|---|---|---|
| `reviewed` (**default; the pilot**) | The public pilot, and every context that does not ask otherwise | Shown at the target, then a delayed check at the target, while counting **only answers on educator-reviewed (`validated`) questions** | Count for the estimate and for "shown at the target", exactly as before, but **cannot verify**. The claim says "Shown at the grade target: not verified (unreviewed questions)". |
| `counted` (developer testing) | The studio with `&verification=developer` (never in a pilot build), and the research simulations | The same definition, on every counted answer | May verify, and the claim says "Verified (developer test: unreviewed questions)". |

**How it is computed.** The same engine rebuilds the ledger from the same events, leaving out answers on questions not
marked `validated` (`reviewedOnlyView`). Nothing is rewritten. The two readings are compared, and the stricter one wins
under the pilot policy.

**Migration strategy.**

1. **Now (this change).**
   - The pilot policy is the default everywhere.
   - Developer testing keeps working under an explicit, labelled policy.
   - The simulations report both readings: `verified` and `verifiedForPilot`.
   - Historical evidence keeps its meaning: estimates, decisions, standings and schedules are unchanged.
   - Only the derived "verified" claim is stricter, and it says why.
2. **Content becomes eligible only by review.** Round 1 and the plural set go through the educator workflow:
   - two independent reviewers;
   - the third-reviewer adjudication;
   - `decisions.json`.

   A separate, owner-approved content-release change then sets `evidence_status: "validated"` on approved questions,
   as a new item version where content changed.
3. **No retroactive upgrade.**
   - An answer counts towards verification only if its question version was `validated`. Answers on earlier draft
     versions stay unreviewed evidence.
   - Marking a question validated makes earlier answers to that same version eligible. This is decision H-V3: whether
     to accept that, or require answers after the approval date.
4. **Rollback.** The policy is a value in the essay context, not data, so switching it changes readings only.

## 4. The lesson programme

`lessonProgramme` (core `essay/lessons.ts`) gives a competency's fixed, ordered lesson parts and when each was first
completed:

- **Source.** It reads the ledger's own lesson records.
- **Fixed.** The programme is fixed by the first journey that taught the competency, so a later change to the app's
  lesson list does not rewrite it.
- **Multi-session.** Completion counts across sessions.
- **Never reduced.** A blocked check, missing questions or a new essay never reset it.
- **Kept apart.** The percentage is shown as "Lessons completed: k of n (p%) … learning progress, not mastery", next to
  the evidence label but never in it.
- **Continuing.** The studio's path offers "Next lesson (k of n)" beyond the journey's one teaching step.

Completing every lesson never changes an estimate or a claim. K12 and ESSAY-LESSONS test this, including after a reload
and a second essay.

No planner was added. The journey, allocation and checks are unchanged, and the programme is read from the existing
ledger.

## 5. Regression tests

| Concern | Tests |
|---|---|
| Early verification | K10-1 (engine: a lower band kept does not verify the target band first shown in the check; 5 days later is still too early; 7 or more days with answers at the band verifies); K9-2 (essay outcome: not verified when the target is first shown, verified after the delayed check) |
| Insufficient eligible questions | K9-1 (shipped bank: the recheck is blocked and the screen says so); K11-4 (shipped plurals: no check possible); verification audit (app S2 and S4b: a delayed check with one question at the band does not verify) |
| Unreviewed questions | K9-3 (pilot policy withholds; developer policy labels it); K10-4 (no ledger available: never assumed reviewed); K9-4 (validated: verifies); mastery-gate and spelling (main app: approved and a later check) |
| Completed lessons awaiting verification | K12; ESSAY-LESSONS; LABELS; browser test (programme 2 of 5, the check is still blocked) |
| Delayed retention | K10-3 (answers must be at the band; a failed check clears it; a delayed check at the band restores it); K9-2 and K9-4 (planned check at least 7 days after the target was shown, never offered early) |
| Schedule and history unchanged | K10-2 (150 random histories, field by field); PI-1, AC-3 (the PR #24 record) |

## 6. Compatibility risks

1. **Fewer "verified" claims.** Learner-facing summaries and the essay profile show fewer verified skills, and some
   "confirmed at band X" lines move to a lower band. This is intended, but visible to anyone comparing with screenshots
   taken before the change.
2. **Main-app "verified" now needs a later check.** It is stricter for pilot builds once questions are validated. Parent
   reports in a pilot will show "on educator-approved questions; verified after a later check" until the check happens.
3. **A single question at the band cannot verify.** The essay pathway's delayed check needs `retentionItems` = 2
   questions at the band. That matches the policy, but any pool with only one retention question cannot verify.
4. **Performance.** `reviewedOnlyView` rebuilds a second ledger once per record state (cached). This is negligible for
   one learner in the studio; worth measuring before any server-side batch use.
5. **Additive fields.** Consumers comparing whole objects with stored snapshots (as two tests did) see the new fields.
   The historical tests now strip them, after checking they never exceed the current level.

## 7. Decisions for the owner

- **H-V1.** Confirm verification@2 for the whole app, main profile included, or keep the main-app change behind the
  pilot only.
- **H-V2.** Confirm the at-band rule: at least 2 answers at L − 0.5 or above in the delayed session.
- **H-V3.** When questions are approved: do earlier answers to the same question version become eligible, or only
  answers after the approval date?
- **H-V4.** Educator review of the 30 plural questions, which are in the package as `proposed-plurals`.
