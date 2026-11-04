# Integration v1: English essays (#53 + #54), mathematics v2, Tamil foundation

Branch `integ/openpath-english-math-v1` (draft PR #55, base `main`). **Draft. Not merged, not deployed.**

- There is no real-child access.
- No educator content is approved.
- No paid model call was made.
- No source branch or PR was modified.

Every learner in every test and benchmark is synthetic.

| Source | Head | Role |
|---|---|---|
| PR #53 `integ/verification-planner` | `a24acc9` | Baseline: verification@2, H-V1–H-V4, planner policy @3 |
| PR #54 `fix/essay-retention-followups` | `166c2ad` | Planner policy @4 |
| `feat/mathematics-learner-journey-v2` | `6a45e52` | Account-backed fractions journey, school and exam journeys |
| `feat/tamil-foundation` | `f4dc8d5` | Provisional Tamil literacy foundation |

## Commits

1. **`ef5cfd2`**: merge #54. The conflicts are resolved onto one retention clock (below).
2. **`8dd9de5`**: merge mathematics v2. No conflicts.
3. **`4cac345`**: mathematics `sharedProfile` now uses the canonical verification definition.
4. **`9b2bb7d`**: merge the Tamil foundation. The conflicts are in `frontend/package.json` and `ci.yml`. Both sides added scripts and a CI job, and both are kept.
5. **`7a12dce`** and **`612ef74`**: cross-subject identity tests (Django and browser), and the combined private preview artifact.

## Conflicts resolved

**#53 × #54.** Conflicts in `retention.ts`, `essay/checks.ts`, `essay/competencies.ts`, `essay/gaps.ts`, `essay/journey.ts` and `test/k9-plural-journey.test.ts`.

- **`retention.ts`**: one `retention()` with #54's optional anchor (`fromLevel`) and #53's verification@2 fields (`verifiedLevel`, `verifiedLevelAt`, the H-V2 distinct-fresh rule).
- **`competencies.ts`**: `engineClaim`, as defined by #53, reads the schedule anchored at the target when given an `essayView`. That covers withdrawal on overdue or failed checks, at-band verification, and H-V3 eligibility through `verificationClaim`. `retentionTiming`/`retentionDue` keep #53's API but read the same clock.
- **`checks.ts`**: `targetClockAt` now reads the anchored schedule instead of scanning sessions itself. The outcome keeps #53's H-V3 note and #54's `review`.
- **`gaps.ts`**: #53's claim as of the essay, then #54's reassessment.
- **`journey.ts`**: `essayView` everywhere. #53's events-aware claim and #54's review and held handling are both kept.
- **K9 test**: #53's assertions are kept, plus the anchored-clock assertion.

**Tamil × the stack.** `frontend/package.json` keeps both the essay and Tamil scripts. `ci.yml` keeps both the essay UX job and the Tamil job.

**Mathematics v2.** No textual conflicts. `sharedProfile` was a semantic conflict, resolved below.

## One retention clock and one verified-mastery definition

- **Mastery engine.** The estimator and `retention()` (`packages/english-core`) are the only mastery engine. Mathematics, through the canonical codec, and Tamil, through its language adapter, add none.
- **Retention clock.** `retention()` is the only function that computes a retention due date or a check. The main app uses it with no anchor (the engine's own schedule, unchanged). The essay layer uses it anchored at the grade target.
- **Clocks removed.** #53's essay-side second clock and #54's separate `targetRetention` schedule logic now read this one function. Before, #53 used `shownAt` + delay inside `retentionTiming`, and `targetClockAt` scanned sessions on its own.
- **One definition of verified (H-V1).** `verificationClaim` is used by the essay claim, the studio, the main-app profile and, now, mathematics `sharedProfile`. It is evaluated on the same clock as the view it receives.
- **H-V2:** at least 2 distinct fresh answers at the band, in a delayed session at least 7 days after the band was first shown. Repeats never verify. Unchanged.
- **H-V3:** reviewed only, after release, at first encounter, never retroactive. Unchanged.
- **H-V4:** the plural review preparation. Unchanged, and nothing is approved.
- **K13-1** (#53's retention-clock test) now asserts the same behaviour on the one clock. On day 8 the any-band schedule reads overdue, but the target's delayed check is not due and the claim is not withdrawn. On day 12 it is due.

## Mathematics v2

These are retained unchanged:

- account-backed persistence (`/pupils/<id>/events/?subject=mathematics`, server-checked `math_activity` receipts);
- the seven-stage fractions program;
- shared learner evidence (canonical native ledger events for the same pupil);
- separate school and exam progress.

**Fix:** `sharedProfile` reported "verified" from the engine schedule's status. It now reports "verified" only through `verificationClaim` under the pilot policy. Two new tests cover this:

- On unreviewed English answers, where the schedule reads "verified", the old `sharedProfile` said "verified" and the new one says "demonstrated". The old code fails this test.
- Thirty days of right provisional mathematics practice never verify, and every such answer is "unreviewed" for eligibility.

Provisional mathematics practice is held by the core content gate (no estimate changes) and is never eligible.

## Validation

**Local** (Node 22; Django, npm packages and the browser cannot be installed here; CI runs those):

- english-core: 309/309.
- frontend: 311/311, of which 43 mathematics, 12 Tamil and 14 essay-live.
- CI tools all pass: lock, bank, spelling generate and review, pilot review, ten-learner simulation, demo, E3 harness, `verification-audit`, pilot allowlist, `tools/mathematics/validate.mts`, and the frozen mathematics audit (identical).
- No new type errors compared with the union of the source branches.

**CI on `612ef74`: 10/10 pass.**

- Django on Python 3.10, 3.12 and 3.13.
- Frontend typecheck, tests and build.
- English core.
- Essay UX and phone journey, including `essay:e2e-diagnostic`: Karthik across sessions and a second essay.
- Browser end-to-end (production build, API, PostgreSQL).
- Tamil foundation (tests, build, mobile browser flow).
- Mathematics foundation (validate, audit, tests, browser).
- Mathematics journey: Django, frontend, and the authenticated browser flow against the Django API.

| Requirement | Where it is tested |
|---|---|
| Cross-subject learner identity | Django `CrossSubjectIdentityTests`: one pupil, English and mathematics records, one export. Browser "one OpenPath account across English and Mathematics": the English app lists the same single pupil, and mathematics activity never enters the English record. |
| Persistence after logout and login | The same two tests: both records are identical after signing out and back in. Mathematics journey browser tests: close and resume, 412 px sign-out and sign-in isolation. |
| School versus exam progress | Mathematics journey browser test: school at 86%, GRE at 0% and then its own progress, from the shared fractions history. Django `test_server_clock_delayed_retention_and_separate_journeys`. |
| Failed retention | K13-R3 (review recorded at once, assigned steps and percentage unchanged), R3e, R3f, STUDIO-REVIEW; assessment simulation S4. |
| Repeated essays | K13-R2a–c, K10-A2, K9-6; Karthik configuration D checklist item 8 passes. |
| Historical ledger replay | K1-16, K9-5 (non-retroactive approval), `retention-v1` fixture and `verification-audit`; mathematics replay of persisted events in `canonical.test.ts` and the journey browser test. |
| Karthik multi-session essay journey | K9-6, K10-A2/B1, K13-R3, STUDIO-REVIEW, `essay:e2e-diagnostic` (CI). |

## Synthetic benchmarks

The decision benchmark was run on the current pipeline: 1,200 learners per simulator, paired, with a 95% bootstrap interval. It uses the research harness with `research-driver-v2.patch`, plus one switch, `BENCH_VERIFICATION=counted`, which compares "verified" on these unreviewed synthetic questions. "Before" is PR #53.

| Measure (integration vs #53) | Result |
|---|---|
| Diagnostic questions | **−0.3 to −0.4 per learner** (about 5% fewer) |
| Repeat diagnostics after the target was shown | **0.10 → 0.05** |
| All questions | −0.1 to −0.2. **Scarce content: +0.1** |
| Days with a true claim | **+0.10 [0.02, 0.20]** (responsive), +0.11 (prereq) |
| **Days with a false claim** | **0.20 → 0.23 (+0.02 [0.01, 0.04])** in four of five simulators; slow +0.02 (borderline) |
| Learners who ever hold a false claim; premature advance | Unchanged (3.2–3.8%) |
| Learning gain; true engine claims; lessons; lessons to learners already at the target | No measurable change |
| Verified sooner than 7 days after first showing the target | 0% before and after (#53's at-band rule already fixed this) |
| Verified on day 30 (counted policy) | +1.2 to +2.8 pp. Misconception and scarce content are significant: the delayed check falls due on the target's own date. |
| Verified, pilot policy | 0% everywhere: no question is educator-validated and released |

- **The false-claim-day regression is the cost of the one clock.** A claim is no longer withdrawn early by the any-band schedule. A learner who slips below the target before their own delayed check keeps the claim until that check. True-claim days rise about four times as much as false-claim days. Changing this is a policy decision, not an engineering one, because thresholds and policies were not to be changed.
- **Against #54,** the integration differs only in "verified": H-V3 eligibility now applies.
- **Karthik** (research configurations): A, B and C are unchanged. In D, on essay 2 there is no diagnostic request, the delayed check comes on its date, and the checklist item "avoids unnecessary repeated diagnostics" passes. The final reading under the pilot policy is "demonstrated" (unreviewed stand-ins). There are 11 questions and 5 lesson events, both as before.
- **Assessment simulations** (same driver on both sides):
  - **S4, failed delayed check:** the review is recorded. On the core bank, "journey completed" goes back to yes.
  - **S6, supplement counterfactual:** the delayed check is asked first on the second essay, with no new diagnostic. It is then verified on the approved questions.
  - **Everything else:** identical.
- **E002P (production estimator):** all eight conditions and the calibration set are identical to #53; only run times differ. The estimator is unchanged.

## Combined private preview (not deployed)

The mathematics journey workflow uploads **`openpath-combined-private-preview`**. It contains `frontend/dist-english/`: the English app with `mathematics.html` on the same origin, so one account and one pupil serve both. It is kept for 7 days for download and local review.

To run it locally, with synthetic data only:

```sh
python backend/manage.py migrate --noinput
python backend/manage.py runserver 127.0.0.1:8012
cd frontend && node scripts/build-mathematics-journey.mjs   # or unzip the artifact into frontend/dist-english/
PORT=4182 API_TARGET=http://127.0.0.1:8012 node scripts/preview-english.mjs
# English: http://127.0.0.1:4182/   Mathematics: http://127.0.0.1:4182/mathematics.html (same account)
```

Tamil remains its own build (`npm run tamil:build && npm run tamil:preview`, port 4176).

## Remaining blockers and open items

1. **Educator review and a content release.** Under the pilot policy nothing can be verified in English or mathematics until questions are `validated` with `released_at`. H-V4 (plurals) is prepared, not approved.
2. **False-claim days +0.02 per learner** (above). This needs an owner decision.
3. **The mathematics program's server-side `retentionDueAt`** unlocks the fixed retention activity a set delay after the transfer stage. It is an instructional schedule, not a mastery clock: it never verifies anything, and verification comes only from the core. Whether to derive it from the core policy constant is a follow-up.
4. **Tamil is not yet account-backed.** As shipped on its branch, it keeps raw evidence in the browser under its own key with a local pseudonymous ID unless a host passes the pupil ID. That behaviour is preserved, not changed. Connecting it to the account and ledger needs its own change and approval.
5. **The main app keeps the engine's any-band schedule.** It has no grade targets. Anchoring it would be a separate decision.
6. **Django and browser tests run only in CI** for this branch (no package registry from the build machine). They pass there.
7. #52 and #54 open items remain: diagnosis below the target (locked policy), and the review lesson required only after a check with no right answer (owner decision).
