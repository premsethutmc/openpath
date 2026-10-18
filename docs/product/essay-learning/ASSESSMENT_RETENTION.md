# Assessment evidence and retention v1

Branch `feat/assessment-retention-v1`, stacked on PR #45 (`feat/essay-intelligence-v2`). The aim is that OpenPath can
teach a competency, check independent understanding on questions the learner has not met, and check later whether it
was kept. The existing ledger, estimator, evidence policies, verification and retention rules are reused. No new
estimator, learner profile or assessment system was added, and no threshold or Grade 8 target was changed.

## Status at a glance

| Part | Status |
|---|---|
| Item roles and reservation (`essay/allocation.ts`) | Real and tested. The pilot's existing pools are honoured. |
| Assisted answers never counted as fresh evidence (`assisted@1`) | Real and tested. A versioned evidence policy; older records replay unchanged. |
| Later verification and delayed retention checks (`essay/checks.ts`) | Real and tested in the core, the studio and the browser. |
| Separate claims (journey completed, shown, verified, retention) | Real; shown in the studio. |
| Learner simulations | Deterministic behaviour tests of the engine. They say nothing about whether teaching works for children. |
| Coverage report and content requirements | Measured from the bank as shipped. Every question is still candidate content: 0 of 267 are educator-validated. |
| Grade 8 targets (band 5) | Unchanged and still provisional ([BAND_AUDIT.md](BAND_AUDIT.md)). |
| Real-child essays | Still disabled. |

## What was inspected first

- **Bank metadata.** Items have:
  - `evidence_status` and `generated.checked` (giving `contentStatus`);
  - difficulty `b`;
  - `family` (variants of one question);
  - `passage` (passage@1 dependence).
- **Existing role metadata.** `content/english/pilot/manifest.json` (pilot-content@2) gives the pilot's questions on
  agreement and articles one pool each: diagnosis, practice, confirmation or retention. The app's own selection already
  honours it. The essay journey from PRs #43 and #44 did not, and used questions from any pool for practice and checks.
- **Ledger.** Before this change:
  - `presented`, `hint` and `assisted_response` were recorded but never counted as exposure;
  - an item first met with help and later answered independently was scored as *fresh* evidence;
  - teaching in the same session already blocked "after teaching" answers from counting as demonstrations.
- **Retention.** `retention.ts`:
  - schedules a spaced check from the first demonstration, at any level (`mastery_gap_days` = 7);
  - judges a check on that session's fresh evidence, by whether it is at least as likely at the retained level as at one
    band lower;
  - marks a check overdue or failed as not currently verified.
- **Journey planner.** The essay journey picked practice and check questions alike, closest to band 5. Practice
  therefore used up the questions at the target, as BAND_AUDIT.md found.

## 1. Question roles and reservation

Every question for a competency gets explicit roles (`itemEligibility`):

| Role | Eligible questions |
|---|---|
| Diagnostic | Reviewed or candidate, code-scored |
| Teaching | Any question shown while teaching (it is then used up for this learner) |
| Guided practice | Below the target band, or not fit to be evidence (provisional, unchecked generated, or its answer appears in the lesson) |
| Independent verification | From the target band to 1.5 bands above it, reviewed or candidate, not leaked. Harder questions say little about the target and are kept for higher targets. |
| Delayed retention | As independent verification |

**Pilot pools win.** A question in the pilot manifest has only its pool's role: diagnosis → diagnostic, practice →
guided practice, confirmation → independent verification, retention → delayed retention. Nothing is borrowed from
another pool.

**Per learner** (`allocateItems`), from the ledger and the essay records:

- **Used.** A question that was answered, shown, used in teaching, or set aside by a diagnostic, journey or check is
  never used again.
- **Compromised.** A variant (same family) of a question met with help or in teaching, or a question on the same
  passage as one, can be practised but is never independent evidence.
- **Reserved.** Unseen questions in the verification band are kept back:
  - first, the delayed retention check (the closest to the target);
  - then the journey's check and each later check.

  A diagnostic may take one question at the target only if enough remain for every check. Practice never takes
  reserved questions.

**Answer leakage from lessons.** A question's sentence with its answer filled in that shares a run of three words
containing the answer, or a run of four words, with a lesson's text is practice only. This is heuristic and
conservative. It found:

- `grm.pps.01` ("yesterday I walked"), `grm.pps.04` ("we went to the"), `grm.pps.09` ("caught the ball");
- `plt.sva.17`, `plt.sva.18`;
- `plt.art.10`.

**Diagnostic rule (stricter, not looser).** Right answers can rule out an essay's suggested gap only when at least one
was on a question within half a band of the target. When every diagnostic question is easier, the gap stays
*unresolved* and is practised and checked, instead of being dropped.

## 2. Assisted answers never become fresh evidence (`assisted@1`)

The app now marks new answers with the `assisted@1` policy. Under it, an item the learner already met with help (an
assisted response, or shown in teaching) is a *repeat* for that learner. It is kept for retention only, as repeats
always were, and never changes the estimate. Records without the mark replay exactly as before. This is the same
versioning used by `passage@1`.

## 3. Later checks and delayed retention

After the journey, `competencyOutcome` keeps each claim apart:

| Claim | Meaning |
|---|---|
| **Journey completed** | Every step for the competency is done or blocked. A journey can finish while the target is still not shown, so nobody is kept in a loop. `null` means the competency is not on the journey. |
| **Shown without help** | The engine's demonstrated (or verified) status at or above the target band. |
| **Verified** | The engine's own verified status at the target: a passed spaced check under the existing policy. |
| **Retention pending / due** | The target is shown; the delayed check comes no earlier than `retentionDelayDays` (default 7) after it was first shown, and never in the same sitting. |
| **Retention shown / not shown** | The delayed check's answers, judged by the engine's own rule (`checkPassed`). One wrong answer revokes nothing by itself: the evidence is recorded and the engine's policy decides. |

`planCheck` plans the next check and reserves its questions:

- **Verification.** When the journey did not show the target, a check in a new sitting from the next day, at most
  `followUpChecks` (1) times.
- **Retention.** Once the target is shown, a check from its due date.

`dueCheck` never offers a check before `notBefore`. Answers given early are listed as invalid and do not complete the
check. When the bank has too few questions, nothing is planned and the outcome says why ("more reviewed questions are
needed"), with the evidence kept.

**Studio.** The path screen shows "Where each skill stands", with the four claims for each competency. It offers "Plan
the later checks", and asks a due check in a new sitting.

## 4. Band progression: six deterministic simulations

`tools/english/assessment-simulations.ts` runs the real essay functions, ledger and estimator with a scripted learner.
The learner answers right exactly when a question's difficulty is at or below its ability at that moment. There are six
scenarios from the brief, plus S4b (one wrong answer in the delayed check). They are run twice:

- **App bank:** the bank the app ships, with the pilot's questions and pools. This is what a learner meets.
- **Core bank:** without the pilot's questions or pools. This separates the estimator from the content.

Results are in `assessment-results/`.

**App bank (pilot pools honoured):**

| Scenario | Journey completed | Shown at band 5 without help | Verified (engine) | Retention | Assisted answers counted as fresh | Still pending |
|---|---|---|---|---|---|---|
| S1. Fails the diagnostic, then improves after teaching | yes | no (level 2) | no | not_applicable | 0 | not yet shown at band 5 without help, and the question bank has only 1 unseen question between band 5 and 6.5 (2 needed): more reviewed questions are needed before it can be checked again |
| S2. Answers hard independent questions right throughout | not on the journey | yes (level 5.5) | yes | demonstrated | 0 | — |
| S3. Completes practice with help, fails every independent check | yes | no (level 2) | no | not_applicable | 0 | not yet shown at band 5 without help, and the question bank has only 1 unseen question between band 5 and 6.5 (2 needed): more reviewed questions are needed before it can be checked again |
| S4. Passes the checks, then fails the delayed retention check | not on the journey | no | no | not_demonstrated | 0 | not yet shown at band 5 without help, and the question bank has only 1 unseen question between band 5 and 6.5 (2 needed): more reviewed questions are needed before it can be checked again |
| S4b. One wrong answer in the delayed retention check | not on the journey | yes (level 5.5) | yes | demonstrated | 0 | — |
| S5. Questions at the target already used up (earlier practice with help) | yes | no (level 2) | no | not_applicable | 0 | not yet shown at band 5 without help, and the question bank has only 1 unseen question between band 5 and 6.5 (2 needed): more reviewed questions are needed before it can be checked again |
| S6. Returns for a second essay with evidence from the first | not on the journey | no (level 4) | no | not_applicable | 0 | not yet shown at band 5 without help, and the question bank has only 1 unseen question between band 5 and 6.5 (2 needed): more reviewed questions are needed before it can be checked again |

**Core bank (no pilot pools):**

| Scenario | Journey completed | Shown at band 5 without help | Verified (engine) | Retention | Assisted answers counted as fresh | Still pending |
|---|---|---|---|---|---|---|
| S1. Fails the diagnostic, then improves after teaching | yes | no (level 4) | no | not_applicable | 0 | not yet shown at band 5 without help, and the question bank has only 0 unseen questions between band 5 and 6.5 (2 needed): more reviewed questions are needed before it can be checked again |
| S2. Answers hard independent questions right throughout | yes | yes (level 5.5) | yes | demonstrated | 0 | — |
| S3. Completes practice with help, fails every independent check | yes | no (level 2.5) | no | not_applicable | 0 | not yet shown at band 5 without help, and the question bank has only 0 unseen questions between band 5 and 6.5 (2 needed): more reviewed questions are needed before it can be checked again |
| S4. Passes the checks, then fails the delayed retention check | yes | no | no | not_demonstrated | 0 | not yet shown at band 5 without help, and the question bank has only 0 unseen questions between band 5 and 6.5 (2 needed): more reviewed questions are needed before it can be checked again |
| S4b. One wrong answer in the delayed retention check | yes | yes (level 5) | yes | demonstrated | 0 | — |
| S5. Questions at the target already used up (earlier practice with help) | yes | no (level 2.5) | no | not_applicable | 0 | not yet shown at band 5 without help, and the question bank has only 0 unseen questions between band 5 and 6.5 (2 needed): more reviewed questions are needed before it can be checked again |
| S6. Returns for a second essay with evidence from the first | yes | no | no | not_applicable | 0 | not yet shown at band 5 without help, and the question bank has only 0 unseen questions between band 5 and 6.5 (2 needed): more reviewed questions are needed before it can be checked again |

### Can the estimator reach the provisional Grade 8 target through legitimate evidence?

**Yes, but only for a learner who shows it without help early.** S2 and S4b reach band 5 on independent questions and
are verified after a passed delayed check, on both banks. Nothing in the estimator blocks band 5, and nothing was
lowered or bypassed.

**For a learner who first fails the diagnostic and then improves (S1), the target is not reached.** The precise
reasons, in order:

1. **Content (the binding limit).**
   - *App bank.* The pilot's confirmation pool for agreement has **one** question at b ≥ 5 (and the retention pool one).
     The pools were written for lower bands. The journey's check is therefore blocked: it needs two.
   - *Core bank.* Agreement has only four unseen questions between b 5 and 6.5. Two go to the journey's check and two
     are kept for retention, so no later check is possible.
2. **The estimator's evidence rule (by design, not a defect).** The demonstrated level is the lower 80% bound of one
   cumulative estimate:
   - the wrong diagnostic answers from before teaching stay in it, because the model has no change point and
     uncertainty grows by only 0.0047 per day;
   - on the core bank, two right answers at b 6 and 6.25 after the journey give level 4, not 5.
3. **How much legitimate evidence would be needed.** This is a counterfactual on a copy, with hypothetical questions,
   not the workflow:
   - core bank: **4 more right answers, one per day, on new reviewed questions at b 5.5–6** would reach band 5;
   - app bank: **8** would, because three wrong diagnostic answers at b 5–6 sit in the estimate.

So the band-4 case from PR #45 is a **content shortage interacting with a conservative estimator**, not a threshold
problem. The honest options are owner and educator decisions:

- add reviewed questions at b 5–6.5;
- allow more later checks (`followUpChecks`);
- or, separately and with care, reconsider how the estimator treats evidence from before teaching. That would be an
  evidence-policy change, not proposed here.

## 5. Coverage and content requirements

`tools/english/assessment-coverage.ts`, on the bank the app ships:

Target t = the provisional Grade 8 band (5 for every specified competency). Every question is "candidate" content: 0 of 267 are educator-validated.

| Competency | Questions | b < t−1 | t−1 ≤ b < t | t ≤ b ≤ t+1.5 | b > t+1.5 | Practice-eligible | Families with t ≤ b ≤ t+1.5: for checks (after the retention reserve) / for retention | Leaked by a lesson | New learner: retention reserve / verification | After one journey: later check possible |
|---|---:|---:|---:|---:|---:|---:|---:|---|---|---|
| Subject–verb agreement | 38 | 21 | 7 | 6 | 4 | 8 | 1 / 1 (pilot pools) | plt.sva.17 ("are on the"), plt.sva.18 ("shops were closed") | 1 / 1 | no (0 left) |
| Present and past simple | 15 | 5 | 3 | 4 | 3 | 9 | 0 / 2 (shared) | grm.pps.01 ("yesterday i walked"), grm.pps.04 ("we went to the"), grm.pps.09 ("caught the ball") | 2 / 0 | no (0 left) |
| Progressive and perfect aspect | 13 | 4 | 3 | 4 | 2 | 7 | 2 / 4 (shared) | none found | 2 / 2 | no (0 left) |
| Articles | 38 | 20 | 6 | 9 | 3 | 8 | 1 / 1 (pilot pools) | plt.art.10 ("there is a") | 1 / 1 | no (0 left) |
| Grammatical accuracy in writing | 13 | 5 | 2 | 4 | 2 | 7 | 2 / 4 (shared) | none found | 2 / 2 | no (0 left) |
| Prepositions of time and place | 16 | 5 | 3 | 4 | 4 | 8 | 1 / 3 (shared) | none found | 2 / 1 | no (0 left) |
| Complete sentences, not fragments | 14 | 6 | 2 | 3 | 3 | 8 | 0 / 2 (shared) | none found | 2 / 0 | no (0 left) |
| Avoids run-on sentences and comma splices | 14 | 5 | 2 | 5 | 2 | 7 | 3 / 5 (shared) | none found | 2 / 3 | no (1 left) |
| Coordination | 13 | 5 | 2 | 3 | 3 | 7 | 0 / 2 (shared) | none found | 2 / 0 | no (0 left) |
| Subordination | 15 | 5 | 3 | 5 | 2 | 8 | 3 / 5 (shared) | none found | 2 / 3 | no (1 left) |
| Commas | 15 | 4 | 2 | 6 | 3 | 6 | 4 / 6 (shared) | none found | 2 / 4 | yes (2 left) |
| Precise word choice in writing | 12 | 4 | 2 | 3 | 3 | 6 | 0 / 2 (shared) | none found | 2 / 0 | no (0 left) |
| Collocations | 14 | 6 | 2 | 3 | 3 | 8 | 0 / 2 (shared) | none found | 2 / 0 | no (0 left) |
| Connectives and transitions | 13 | 5 | 2 | 3 | 3 | 7 | 0 / 2 (shared) | none found | 2 / 0 | no (0 left) |
| Logical sequencing | 12 | 4 | 2 | 3 | 3 | 6 | 0 / 2 (shared) | none found | 2 / 0 | no (0 left) |
| Paragraphing | 12 | 4 | 2 | 4 | 2 | 6 | 1 / 3 (shared) | none found | 2 / 1 | no (0 left) |

Pilot rule per competency: 7 unseen reviewed questions with t ≤ b ≤ t+1.5 (retention 2 + journey check 2 + 1 later check × 2 + 1 diagnostic at the target), 2 with t−1 ≤ b < t, 3 for practice below t.

| Competency | Add, t ≤ b ≤ t+1.5 (current policy: 1 later check) | Add for 2 later checks | Add, t−1 ≤ b < t | Add, practice | Existing questions to review |
|---|---:|---:|---:|---:|---:|
| Subject–verb agreement | 5 | 7 | 0 | 0 | 15 |
| Present and past simple | 5 | 7 | 0 | 0 | 9 |
| Progressive and perfect aspect | 3 | 5 | 0 | 0 | 11 |
| Articles | 5 | 7 | 0 | 0 | 16 |
| Grammatical accuracy in writing | 3 | 5 | 0 | 0 | 11 |
| Prepositions of time and place | 4 | 6 | 0 | 0 | 12 |
| Complete sentences, not fragments | 5 | 7 | 0 | 0 | 11 |
| Avoids run-on sentences and comma splices | 2 | 4 | 0 | 0 | 12 |
| Coordination | 5 | 7 | 0 | 0 | 10 |
| Subordination | 2 | 4 | 0 | 0 | 13 |
| Commas | 1 | 3 | 0 | 0 | 12 |
| Precise word choice in writing | 5 | 7 | 0 | 0 | 9 |
| Collocations | 5 | 7 | 0 | 0 | 11 |
| Connectives and transitions | 5 | 7 | 0 | 0 | 10 |
| Logical sequencing | 5 | 7 | 0 | 0 | 9 |
| Paragraphing | 4 | 6 | 0 | 0 | 10 |

Totals: add 64 questions with t ≤ b ≤ t+1.5 (96 for two later checks), 0 with t−1 ≤ b < t, 0 practice; review 181 existing questions.

**Minimum additional reviewed content for a credible Grade 8 pilot** (rule above, per competency):

- **About 64 new reviewed questions between b 5 and 6.5** across the 16 specified competencies, or 96 to allow two
  later checks.
- **Educator review of the 181 existing questions** used for diagnosis and checks.
- **Agreement and articles.** Either a reviewed reassignment of the pilot's diagnosis-pool questions at b 5–6.5 to
  confirmation and retention (an owner decision on existing metadata), or new questions.

No questions were generated here, and nothing is labelled validated.

## Tests added

**Core K4 (10 tests):**

- role eligibility, and leaked questions as practice only;
- `assisted@1`: an assisted item later answered is a repeat with no estimate change, and legacy records are unchanged;
- reserves survive diagnosis and practice; pilot pools are honoured;
- exhaustion gives an honest pending state, and the journey still finishes;
- a delayed check is not offered early, and early answers do not count;
- evidence persists across essays, with no question asked twice;
- no completion verifies; verified needs a passed delayed check;
- failing retention is recorded, and one wrong answer does not revoke;
- band progression, on both banks; the simulations are deterministic.

**Core K1 (updated for the stricter diagnostic rule):**

- right answers below the target leave a gap unresolved;
- a near-target right answer is needed to weaken it;
- the misconception count is tested on a hand-made request.

**Frontend:**

- the acceptance test was updated: agreement's check is blocked under the pilot's pools, and the journey still finishes;
- the second essay draws its questions from the diagnosis pool;
- a new studio test covers separate claims and a later check that is never offered early.

**Browser:** the essay e2e now expects the blocked check.

## Remaining limitations

- **Synthetic learners.** The simulations use a threshold learner. They test behaviour, not learning.
- **Leakage detection** is heuristic. Variants without a shared family id, and lesson examples that paraphrase a
  question, are not found.
- **Retention judgement.** A delayed check with one question (app bank, agreement) is weak evidence. The engine's rule
  is reused unchanged.
- **Engine scheduling.** The engine schedules its own spaced check from the first demonstration *at any level*. A learner
  shown at band 2.5 becomes "overdue" a week later (core S6). The essay layer keeps its own target-level retention date
  and reports the engine's status separately.
- **Uncalibrated content.** All difficulties are expert estimates; none are calibrated.
- **Unchanged scope.** The Grade 8 targets stay provisional. Real-child submissions stay disabled.

## Update: assessment recovery (policy @2)

The policy now allows up to three spaced later checks (1, 3 and 7 days), with the same rules: unseen eligible questions
only, never early, and pending rather than recycled when content runs out. The coverage numbers above were measured
with one later check; `assessment-results/coverage.json` is current. A proposed 96-question supplement (provisional,
unreviewed, not loaded by the app) and a shadow-only estimator study are in
[ASSESSMENT_RECOVERY.md](ASSESSMENT_RECOVERY.md).
