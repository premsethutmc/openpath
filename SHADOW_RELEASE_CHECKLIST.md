# OpenPath — Unified Grading: Shadow Release Checklist

Branch `staging/unified-grading-shadow` = `feat/unified-grading` (`bb20657`) + the E7 safety branch + the staging verification commit.
Nothing has been merged into `main` or deployed to any hosted service. The grading mode has not been switched to `unified`. The legacy
grader is in place.

## 1. Commits

| Commit | Content |
|---|---|
| `1b4e73a` | Phase A audit |
| `3e4c62d` | Phase B architecture |
| `97ec737`, `c8667ac`, `ad1efb2` | Phase C stages 1–3 |
| `a1e7028` | stages 4–6 |
| `b7d7317` | stage 7 |
| `b2a35e6` | stages 8–10 |
| `bb20657` | release preparation (checks A–E) |
| `d3f91ac` | merge of `fix/math-e7-safety-invariants` (E7) |
| this commit | staging verification: ambiguous-question quarantine, migration round trip, start-up guards, smoke tests |

PR #83 (answer-key certification, `feat/math-answer-key-certification` @ `901c907`) is read, not merged.

## 2. Pre-deployment verification

### 2.1 E7 safety branch — was not included; now merged

`feat/unified-grading` was based on `46ce4b9` and did **not** contain E7 (`837c79c`, on `fix/math-e7-safety-invariants` @ `d7d59bf`).
It is merged in `d3f91ac`. Conflict resolution:
- The main audit report keeps the unified-grading version. E7's report is kept as `MATH_CURRICULUM_GRADING_AUDIT_REPORT.e7-audit.md`.
- E7 G2 (1–30 digit bounds on numbers) is applied to `legacy_grading.py` as well.
- The grader bundle is rebuilt.
- E7's own tests (`e7-safety-invariants.test.ts`, `test_server_parity.py`) run in the suites below and pass.

**Owner decision needed later:** E7 G1 repairs the contract guard that held the 951 D09 word forms, so they would no longer be quarantined
automatically. Owner decision 4 keeps them quarantined. They are now listed as manual entries (`question-status-d09-hold.v1.json`, reason
`pending-release-review`), so the hold no longer depends on the defect. Releasing them is a separate approval.

### 2.2 Migrations 0006 and 0007 — reversible, recovery procedure tested

- `0006` creates `GradingDecisionRecord`.
- `0007` adds two partial unique constraints.
- Both are standard Django operations with automatic reverse operations.

`backend/scripts/migration_roundtrip.sh` exercises the full cycle with data in the table. It was run on SQLite and on PostgreSQL 16
(local server, psycopg 3.2.13), and passed on both:

| Step | Result |
|---|---|
| Fresh database → `0007`, seed 3 decisions (an original, its superseding regrade, a second attempt) | 3 rows |
| Export decisions (`dumpdata family.gradingdecisionrecord`) | 3 exported |
| Reverse `0007` → `0006` | constraints dropped, 3 rows kept |
| Re-apply `0007` | a duplicate original decision is refused again |
| Reverse `0006` → `0005` | table dropped |
| Re-apply `0006` + `0007`, `loaddata` the export | the 3 rows restored exactly |

**Recovery procedure:**
- Reversing `0007` is safe at any time.
- Reversing `0006` deletes the decision log:
  - Original decisions are also kept in each event body (`decision`).
  - Regrade (superseding) decisions exist **only** in the table.
- So before reversing `0006`, export the table (`manage.py dumpdata family.gradingdecisionrecord -o decisions.json`, or `pg_dump -t
  family_gradingdecisionrecord`), and restore it with `loaddata` after re-applying.
- The preferred rollback (§8) leaves both migrations in place.

### 2.3 Grader bundle matches its manifest

- `sha256sum backend/family/grader/grader.mjs` = `e5535318c369…a7d19593a4`, equal to `grader.manifest.json` `sha256`.
- The server checks this on every call (`kernel_grader.bundle_intact`).
- New in this commit: `deploy/preview/start.sh` refuses to start if the bundle does not match its manifest or Node is missing. It logs the
  verified hash at start-up (`grading mode shadow | grader bundle sha256 e5535318… matches its manifest`, seen in staging).

### 2.4 Production learner database — none exists; the historical dry run is not applicable

Evidence:
- `render.yaml`: the only production-like service is `openpath-english-demo`. It is an owner-only demo with "No database, no account
  server".
- `render.preview.yaml` (the existing preview service `srv-dbaeu33ncjis73dagjt0`): ephemeral SQLite with synthetic data only. An optional
  `PREVIEW_DATABASE_URL` must be a dedicated synthetic database. `start.sh` unsets `DATABASE_URL`.
- `docs/product/PRODUCTION_BLOCKERS.md`: "Nothing here is deployed". Managed PostgreSQL is still an open blocker.
- No database credentials exist in this environment or the repository.

**Conclusion:** there are no historical learner records to reconstruct, so the reconstruction dry run (§7) is **not applicable**. It is no
longer a release blocker. The command and its read-only guards remain, tested, for when a real database exists.

### 2.5 Remaining ambiguous questions and defective distractors — reviewed

Rule applied: quarantine only what cannot be graded unambiguously. Every original record is kept: the registry withholds a presentation, it
deletes nothing, and recorded answers stay in the event log.

**Quarantined (1,058 presentations, reason `ambiguous-question`; list: `content/learning/question-status-ambiguous.v1.json`):**

| Family | Presentations | Why no single answer can be required |
|---|---|---|
| abmeas | 324 | Ruler described in millimetres but labelled in centimetre numbers. 31 and 3.1 are both defensible. |
| anquad | 300 (word form only) | Asks about the frame but gives the glass area. The answer is right only if the two are equal. |
| aasolid | 192 | Everyday objects (tin of oil, pencil box) can be read as a cylinder or a cuboid, so the count is not determined. |
| amcrit | 100 | ASA and AAS are both valid for the given data, so two options are correct. |
| amsimc | 72 | The SSA data with the longer opposite side does determine the triangle, so the key "Not shown to be similar" is disputable. |
| aiconvex | 70 | A, B and C are collinear (a 180° angle). Whether the figure is a quadrilateral is a convention the question does not state. |

**Kept (gradable as written):**
- The value-equal or form-violating distractors (agmix 248, amceva 122, ajrat, ajrstd, avfas, avlow, agnl, agpfrac): the question states the
  form, so exactly one option satisfies it.
- The form/wording notes (aipi, ahcube, above, alcomp, antable, aofund, auapk, aosamp, aaname): the stored answer is unambiguous.
- These remain on the hold list for `unified` (§5).

**Pipeline consequences:**
- The compiled library was rebuilt without the newly quarantined questions; replacements come from the same pools.
- Family specs were regenerated; spec validation now treats quarantined presentations as withheld (`spec.ts`), with 0 failing validation
  across 1,080 families.
- 6 modules and families whose content hash changed were already drafts, so no educator approval was reset.

**Quarantine now:** 2,070 presentations:

| Reason | Presentations |
|---|---|
| ambiguous-question | 1,058 |
| pending-release-review (D09, owner decision 4) | 951 |
| invalid-question (aofclass) | 41 |
| contract-inconsistency (aqd2) | 20 |

## 3. Test suites (this commit)

| Suite | Result |
|---|---|
| `bun test packages/learning` (includes E7 invariants) | 1,423 pass, 0 fail |
| Program engines (`frontend/src/mathematics`, all) | 79 pass, 2 fail. Both fail identically at `bb20657` (`foundation/prerequisites.test.ts`, curriculum-inventory counts). They predate this work and are unrelated to grading. |
| Django `manage.py test`, SQLite (suite runs with `OPENPATH_GRADING=unified`) | 300 tests, OK |
| Django, `OPENPATH_GRADING=shadow` (`test_grading_modes`, `test_release_invariants`) | OK |
| Django, PostgreSQL 16 (local server, psycopg 3.2.13) | 300 tests, OK. The first run showed one test that hard-coded the SQLite read-only guard name; the PostgreSQL guard itself worked (write refused). The assertion now reads the database vendor. |
| Migration round trip, SQLite and PostgreSQL 16 | pass (§2.2) |

## 4. Check A — what a learner sees in shadow mode

- The server reports the authoritative mode with the learner's record (`GET .../events` → `gradingMode`). The app sets it on every load,
  in the year app and the three program apps. A server that reports no mode is treated as `legacy`.
- The year app shows the server's recorded (authoritative) decision. A differing unified preview is never shown.
- Program apps mark with their earlier marking in shadow and legacy modes. A recorded server decision always wins.
- Records saved before decisions existed replay with the earlier comparison until the switch.
- Tests: `grading/view.test.ts`.

## 5. Checks B–D (unchanged from `bb20657`)

**Check B — invariants** (`test_release_invariants.py`): all pass. They cover:
- immutability;
- shadow decisions never counting toward credit;
- authoritative and shadow decisions being distinguishable;
- one authoritative outcome per attempt (constraints from migration `0007`);
- deterministic replay;
- a grader failure in shadow mode keeping the earlier fallback;
- a mode switch never reinterpreting a recorded decision.

**Check C — reconciliation** (`data/certification-reconciliation.json`, refreshed):
- Answer keys: 1,056 fully certified, 18 partially, 6 with a discrepancy.
- Grader: certified on sample for all 1,080 families.
- 24 families are held for `unified`.
- The quarantine now counts 2,070 presentations.

**Check D — 12,725 disagreements** on the audit corpus:
- Oracle-adjudicated: unified agrees with the oracle 12,316, earlier 399, neither 10.
- Hand-adjudicated: 27 cases, 0 wrong unified verdicts.
- Unified is less decisive in 409 cases: 288 equal answers are now unresolved (mixed numbers, ungrouped calculus expressions), and 121
  answers the earlier policy correctly marked incorrect are now unresolved.

## 6. Staging verification

**Environment.** There are no hosted staging credentials here (no Render access). The registries are also unreachable from this workspace,
so the container image could not be built. Staging was therefore run locally, using the deployment's own start script
(`deploy/preview/start.sh`):
- Same settings module (`config.preview`), gunicorn 23.0.0, Node grader bundle.
- PostgreSQL 16 through `PREVIEW_DATABASE_URL`.
- Password gate on HTTP (local testing mode).
- The static app is a placeholder (frontend build not possible offline). The API path is the real one.

All traffic went through the gate, with fresh synthetic accounts only. Launcher: `/var/tmp/staging/run.sh` (not in the repository).

**Start-up guards:**
- `OPENPATH_GRADING=unified` → refused ("not approved for this deployment"), exit 1.
- Shadow → starts, and logs the mode and the verified bundle hash.

**Smoke tests** (`tools/mathematics/server-grader/staging_smoke.py`, app replay via `staging-replay.ts`):

| Area | Checks | Result |
|---|---|---|
| Answer submission | gate, register, pupil, enrol, 6 attempts saved, repeated attempt id refused (400) | pass |
| Authoritative grading | `correct` / `incorrect` / `unresolved` decided by the server under `legacy-policy@0`, `gradingMode: shadow` | pass |
| Unresolved answers | unreadable `three-ish` kept verbatim with no credit; quarantined `gen:aasolid:1,0` → `unresolved.quarantined`, answer kept | pass |
| Mastery replay | the app's own replay: credit only c1, c2; u1, d1, q1 kept apart, never attempts (P1); averages skill reaches `independent` | pass |
| Shadow comparison | unified decision stored beside every graded answer (`grading-policy@1`, `decidedBy: shadow`); `24/2` for 12 differs (earlier unresolved, unified correct) and the earlier verdict stays authoritative; `compare_shadow` against the staging database: 20 compared, 4 different, all "fix: an equal answer is now credited", **toInvestigate 0** | pass |
| Rollback | restarted with `OPENPATH_GRADING=legacy`: same account; mode reported `legacy`; events byte-identical; per-attempt credit, unresolved set and skill status identical; new answers graded by the earlier policy with no shadow evaluation | pass |
| Roll forward | restarted in shadow: full shadow suite passes again on the same database | pass |

Totals:
- Shadow: 31/31, twice.
- After rollback: 10/10.
- Staging database afterwards: 30 events, 25 decision rows, all synthetic.

## 7. Historical reconstruction dry run — not applicable

No production learner database exists (§2.4). `reconstruct_decisions --dry-run` and its three read-only guards are retained and tested
(`DryRunReadOnlyTests`). If a learner database is created before the switch to `unified`, the command should be run then with the
read-only role below:
```sql
CREATE ROLE openpath_dryrun LOGIN PASSWORD '<generated>';
GRANT CONNECT ON DATABASE <db> TO openpath_dryrun;
GRANT USAGE ON SCHEMA public TO openpath_dryrun;
GRANT SELECT ON family_pupil, family_pupilevent, family_writtenmark TO openpath_dryrun;
ALTER ROLE openpath_dryrun SET default_transaction_read_only = on;
```

## 8. Rollback procedure (tested in staging, §6)

1. Set `OPENPATH_GRADING=legacy` and restart. It takes effect at once, with no migration. Replay reads recorded decisions in every mode.
2. The app follows the server's reported mode on the next record load.
3. Code rollback: redeploy the previous build, leaving migrations `0006`/`0007` in place. If they must be reversed, follow §2.2: export
   first.
4. The quarantine registry is code: reverting it releases those presentations.

## 9. Known risks

1. **No real shadow data yet.** The comparison has been measured only on the audit corpus and synthetic staging traffic.
2. **Strict syntax in calculus.** Equal answers without grouping become unresolved under unified. In shadow this is visible only in the
   comparison.
3. **Sample-based grader certification** (≤19 questions per family). Figures, most word-form wording and student working are unverified.
4. **Quarantine reduces content.** 2,070 presentations are withheld, including 951 word forms awaiting owner release.
5. **Shadow keeps earlier behaviour**, including its grader-failure fallback and invalid-input-as-incorrect handling, until the switch.
6. **Cost.** One Node grader subprocess per graded answer (~0.5 s).
7. **The staging image was not built here.** The image itself still needs one build on the hosting platform. Staging ran the same start
   script and code outside a container.
8. **Pre-existing failing test** in `foundation/prerequisites.test.ts` (inventory counts, unrelated to grading).

## 10. Recommendation

**GO for a controlled production shadow rollout**, subject to:
1. Explicit owner approval to deploy, and to merge this branch to the deployed branch.
2. `OPENPATH_GRADING=shadow` set explicitly. The start script refuses anything except `shadow` or `legacy`.
3. Migrations `0006` and `0007` applied (they run at start-up).
4. The bundle and its manifest deployed together. Start-up refuses a mismatch; check the logged hash `e5535318…`.
5. One image build and a rerun of `staging_smoke.py` on the hosted service before learners use it.

**NO-GO for switching to `unified`** until:
- a period of real `compare_shadow` data has been reviewed with `toInvestigate` at 0;
- the 24 held families are resolved;
- the missed-credit rate from strict syntax has been reviewed;
- the owner has decided on the 951 D09 word forms.
