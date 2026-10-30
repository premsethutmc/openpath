# OpenPath — Unified Grading: Shadow Release Checklist

Branch `feat/unified-grading`. Base for this preparation: `b2a35e6` (Phase C). Release-preparation commit: the commit that adds this file.
Nothing has been merged or deployed, and the production grading mode has not been changed.

## 1. Commits

| Commit | Content |
|---|---|
| `1b4e73a` | Phase A audit |
| `3e4c62d` | Phase B architecture |
| `97ec737`, `c8667ac`, `ad1efb2` | Phase C stages 1–3 |
| `a1e7028` | stages 4–6 |
| `b7d7317` | stage 7 |
| `b2a35e6` | stages 8–10 |
| this commit | release preparation (checks A–E below) |

PR #83 (answer-key certification, `feat/math-answer-key-certification` @ `901c907`) is read, not merged.

## 2. Test suites (this commit)

| Suite | Result |
|---|---|
| `bun test packages/learning` | 1,391 pass, 0 fail |
| Program engines (`frontend/src/mathematics`: unit, chapter, journey, foundation, remediation, mathematics, canonical) | 77 pass, 0 fail |
| App bundles (`year`, `chapter`, `foundation`, `journey`) | build, 0 errors |
| Django `manage.py test` (vendored pins, SQLite; suite runs with `OPENPATH_GRADING=unified`) | 297 tests, OK |
| Shadow-mode tests under `OPENPATH_GRADING=shadow` (`test_grading_modes`, `test_release_invariants`) | 12 tests, OK |

The rest of the Django suite asserts unified behaviour. Under `OPENPATH_GRADING=shadow` the unified-specific assertions differ, as
expected; the shadow behaviour itself is covered by the two dedicated suites.

## 3. Check A — what a learner sees in shadow mode

- The server reports the authoritative mode with the learner's record (`GET .../events` → `gradingMode`). The app sets it on every load,
  in the year app and the three program apps (`grading/mode.ts`). A server that reports no mode is treated as `legacy`.
- **Year app:** after an answer, the learner sees the server's recorded (authoritative) decision (`grading/view.ts authoritativeView`).
  - A unified preview that differs is never shown.
  - Without a server decision in shadow mode, the screen says "saved", not a verdict.
- **Program apps:** in shadow and legacy modes each engine marks with its earlier marking (english-core `scoreCode`), passed in as
  `earlier`. A recorded server decision always wins over both.
- **Replay of records saved before decisions existed:** these use the earlier comparison until the switch to unified, so mastery is not
  reinterpreted.
- **Internal comparison is preserved:** the server stores the unified decision as `shadowDecision` on every graded answer, and
  `compare_shadow` reports on them.
- Tests: `grading/view.test.ts`, 6 tests.

## 4. Check B — decision-record and replay invariants (`backend/family/test_release_invariants.py`, real endpoints, real Node grader)

| Invariant | Mechanism | Test |
|---|---|---|
| Recorded decisions are immutable | `save()`, queryset `update()` and `bulk_update()` all refused on `GradingDecisionRecord`. Event bodies change only through the parent-requested privacy scrub, which keeps answers. | test_1 |
| Shadow decisions never affect mastery | Replay reads only `decision`. `shadowDecision` is not logged; it is not credited, and `independent_at` ignores it. | test_2_and_3 |
| Authoritative is distinguishable from shadow | `decision.policy` is `legacy-policy@0` or `grading-policy@1`, with `decidedBy: server`. `shadowDecision` carries `decidedBy: shadow`. | test_2_and_3 |
| Retries cannot create two authoritative outcomes | Two database constraints (migration `0007`): one original decision per attempt, and one successor per decision. A racing regrade is skipped. Duplicate attempt ids are refused (400). | test_4 |
| Replay is deterministic and uses the latest recorded decision | `decisions.effective` returns the latest decision that nothing supersedes, in a fixed order. | test_5 (3 identical runs) |
| Shadow keeps the earlier fallback | With the grader down in shadow mode, the earlier policy still decides. The unified failure decision is recorded beside it only. | test_5b |
| Rollback never reinterprets | Credit is read from the recorded decision in all three modes. Historical records keep their recorded verdict. | test_6 |

## 5. Check C — certification reconciliation

Output: `tools/mathematics/grading-audit/data/certification-reconciliation.json`, produced by `reconcile.py 901c907`. It is read-only and
changes neither certification.

| Dimension | Evidence | Basis | Result |
|---|---|---|---|
| Answer-key correctness | PR #83 | exhaustive over 341,483 typed questions | Fully certified 1,056 families; Partially 18; Discrepancy 6. 0 demonstrably wrong keys. 41 invalid (aofclass), 414 ambiguous, 14 notation-only. |
| Question presentation | PR #83 register | partial | Word-form wording sampled per template only. Figure rendering not verified. Distractor defects: agmix 248, amceva 122 (value-equal distractor). Ambiguous wording: amsimc, aiconvex, amcrit, abmeas, aasolid, anquad. |
| Grader correctness | `grading-certifications.v1.json` | sampled (≤19 questions per family) | 1,080 families certified on sample; 0 false acceptances, 0 false rejections. |
| Student working | none | — | Not verified anywhere: every released question is answer-only, and working never changes credit. |
| Quarantine | `question-status.v1.json` | — | 1,012 presentations: 971 contract inconsistencies (D09, D18) plus **41 aofclass invalid questions added in this commit** (manual entries from the PR #83 handoff, re-checked: f(x) = (x+4)² − 4 on [−5, ∞) takes −4, which is outside the stated codomain [−3, ∞)). |

Reconciled readiness for unified grading:
- 1,052 families ready.
- 4 families ready except their quarantined presentations.
- 24 families on hold:
  - 6 with an answer-key discrepancy (aofclass, amsimc, aiconvex, amcrit, abmeas, aasolid);
  - 18 with partial key certification (form, wording or distractor notes).

No family was promoted. The grading certification is not changed by the answer-key results, because it says something different (the
grader agrees with the stored key). The hold list is for the switch to unified, not for shadow.

## 6. Check D — the 12,725 disagreements (earlier policy versus unified, server route, 308,568 cases)

- **Consistent:** each case gets exactly one class, decided by `compare_shadow.classify(earlier verdict, unified verdict, unified reason)`.
  The class counts sum to 12,725, and 0 cases are unclassified or need investigation.
- **Reproducible:** two runs of `g5.py` produced byte-identical summaries and review sets. The unified verdicts are identical to the
  stage-4 run (0 differences in 308,568 cases).
- **Adjudicated against the independent oracle (automatic, all 12,725):**
  - Unified agrees with the oracle: 12,316.
  - Earlier agrees with the oracle: 399.
  - Neither: 10.
- **Adjudicated by hand: 27** (3 per verdict pair, seeded sample; `data/g5-hand-adjudication.json`).
  - In 0 cases did the unified grader give a wrong definite verdict.
  - In 7 cases the earlier grader gave a correct definite verdict where unified asks for clarification, because of decision 2.
- **Where the new grader is less decisive:** never wrong, but no credit and no penalty.
  - 288 equal answers are now unresolved:
    - 238 mixed numbers on answers whose contract does not permit them (e.g. `4 1/2` for 9/2);
    - 50 expressions written without grouping (e.g. `12x^2cos(3x)`, `x^x(log(x) + 1)`, `3x^2y`).
  - 121 answers the earlier policy correctly marked incorrect are now unresolved: 111 readable wrong values and 10 equal values in a
    forbidden form (e.g. `4 6/5`, `2/-3`, `log 5/log 3`).
  - These follow decisions 2 and 3, but they will show up in shadow data as missed credit, mostly in calculus answers.
- **Limitation:** the "earlier policy" here is the branch's `legacy` mode, which reproduces the earlier routing with the current parser.
  It is not a byte-for-byte replay of the production build (`main` @ `b578c78`). The production shadow comparison (`compare_shadow`)
  measures that directly.

## 7. Check E — historical dry run

**Implementation (read-only):** `manage.py reconstruct_decisions --dry-run` refuses to run without the flag. It has three independent
guards, any one of which stops a write:
1. The database session is read-only (PostgreSQL `SET TRANSACTION READ ONLY`; SQLite `PRAGMA query_only`).
2. Every SQL statement is filtered before it is sent, and any write is refused (`ReadOnlyViolation`).
3. The whole run is rolled back.

There are no signal handlers in the project. Middleware does not run for management commands. The grader is a subprocess with no
database access. A test injects a write into the run and confirms it is refused with nothing changed (`test_decisions.DryRunReadOnlyTests`).

**Least-privilege credentials** (PostgreSQL; run by the database owner; the role name is an example):
```sql
CREATE ROLE openpath_dryrun LOGIN PASSWORD '<generated>';
GRANT CONNECT ON DATABASE <db> TO openpath_dryrun;
GRANT USAGE ON SCHEMA public TO openpath_dryrun;
GRANT SELECT ON family_pupil, family_pupilevent, family_writtenmark TO openpath_dryrun;
ALTER ROLE openpath_dryrun SET default_transaction_read_only = on;
```
Then run, with no other credentials in the environment:

`DATABASE_URL=postgres://openpath_dryrun:…@host/db OPENPATH_GRADING=shadow python manage.py reconstruct_decisions --dry-run --out report.json`

**Status: NOT EXECUTED against production — blocked.** This workspace has no production database credentials, and the repository's
deployment configuration (`render.yaml`) defines only the database-less English demo. No production backend database is described
anywhere I can reach. The dry run has been exercised only on test databases. To run it I need the read-only connection string above (or
the owner can run the command and share `report.json`). Nothing will be written either way.

## 8. Rollback procedure

1. Set `OPENPATH_GRADING=legacy` (or `shadow`) and restart the web service. Effective at once; no migration is needed.
2. Recorded decisions keep their own policy and versions; replay reads them in every mode (test_6).
3. The app follows the server's reported mode on the next record load.
4. A full code rollback is a redeploy of the previous build. Migrations `0006` and `0007` only add a table and constraints, so they can
   stay in place. The quarantine registry is code: reverting it releases those questions.

## 9. Known risks

1. **Production comparison not yet measured.** The dry run is blocked (see §7), and real shadow data does not exist until deployment.
2. **Strict syntax in calculus.** Equal answers written without grouping become unresolved: 50 in the audit sample. Expect missed credit
   in shadow data. These are never marked wrong.
3. **Sample-based grader certification.** At most 19 questions per family. Answer keys are exhaustive (PR #83), but presentation (figures,
   most word wording) and student working are unverified.
4. **Problems found by PR #83 but not quarantined (owner decision):**
   - 414 ambiguous questions (amsimc, aiconvex, amcrit, abmeas, aasolid, anquad);
   - value-equal multiple-choice distractors (agmix, amceva): a learner choosing the equal distractor is marked incorrect under both
     policies.
5. **Shadow keeps earlier behaviour.** The earlier policy, including its grader-failure fallback (D12) and its invalid-input-as-incorrect
   behaviour, remains authoritative until the switch. Shadow changes no production verdicts, except that quarantine (1,012
   presentations) applies in every mode.
6. **Cost per graded answer.** One Node grader subprocess per answer (~0.5 s), in shadow and unified modes alike.
7. **Timing-sensitive test.** One fuzz test (E3) is sensitive to machine load (it failed once at 5.46 s against a 5 s limit).

## 10. Recommendation

**GO for a shadow deployment**, conditional on:
1. Explicit owner approval to deploy.
2. `OPENPATH_GRADING=shadow` set explicitly in the deployment environment. It is the default, but it should not rely on the default.
3. Migrations `0006` and `0007` applied.
4. The grader bundle and its manifest deployed together (the integrity check refuses a mismatch).

**NO-GO for switching to `unified`** until:
- the production dry run (§7) and a period of `compare_shadow` data have been reviewed, with `toInvestigate` at 0;
- the 24 held families are fixed or quarantined;
- the strict-syntax missed-credit rate in real data has been reviewed.
