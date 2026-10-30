# E7 final integration gate

Branch: `integration/e7-into-unified-grading`. Target: `feat/unified-grading@bb20657`. Nothing is merged or deployed.

## 1. Tests that were missing before (now actually executed)

| Suite | How it was run | Result |
|---|---|---|
| Django (`backend/manage.py test`, SQLite) | Dependencies vendored with the repo's own `backend/vendor-deps.sh` (django 5.2.18, DRF 3.18.3, asgiref 3.12.1, sqlparse 0.6.0, cloned at their exact tags from GitHub) | **302 tests, OK** (after the gate fix; 300, OK before it) |
| Frontend build (`scripts/build.mjs`, `--standalone`) | See note below | **OK** on the integration branch and on `feat/unified-grading` |
| Frontend type check (3 projects) | See note below | `tsconfig.json` 0 errors and `tsconfig.english.json` 0 errors on both branches. `tsconfig.mathematics-integration.json`: 170 errors (unified) vs 174 (integration). The 4 extra are the same pre-existing class: missing `bun:test` declarations in 4 new test files. No new error kind. |
| Frontend unit tests (`node --import tsx --test`) | See note below | **462 tests: 460 pass, 2 fail, on both branches.** The same 2 fail on `feat/unified-grading` (content-system: the `aofclass` family specification and an exhausted `aofclass` pool, a pre-existing generator defect on the answer-key certification handoff list). Run times: 2201 s (integration), 2296 s (unified). |

**Note on the frontend runs:** the npm registry does not resolve in this environment (ENOTFOUND, direct and through the proxy), so `npm ci` could not install the lockfile. The runs used the pre-installed toolchain, and the same substituted environment was applied to both branches, so any difference comes from the integration and not the environment.
- **Exact versions:** esbuild 0.28.2 and typescript 6.0.3.
- **Differ from the lockfile:**
  - react / react-dom 19.2.8 (lock 19.3.0);
  - tsx 4.23.12 (lock 4.23.15);
  - @types/node 26 (lock 22);
  - @types/react and @types/react-dom from DefinitelyTyped `9ebb544` (19.3.x; lock 19.3.0);
  - csstype 3.2.3 (exact, from its GitHub tag).

**A lockfile-exact `npm ci` frontend run still needs CI with registry access.**

## 2. 30-digit legacy number reading (G2): a defect found and corrected

A 770-case client/server boundary matrix covered:
- integer, fraction and set answers;
- positive, negative, decimal, mixed, leading-zero and long-decimal inputs;
- 9/10/29/30/31-digit lengths;
- malformed inputs (`1e3`, `0x10`, `--5`, `5-`, `1/0`, full-width digits, empty, spaces).

Both sides were graded with the app's `content.ts canonical` and the server's `legacy_grading._answer_ok` / `right`. Results are in `integration/g2/`.

**Defect.** As merged in `3e1a470`, the 30-digit change also widened the integer grammar. The app reads integers with `canonicalInteger` (9 digits + 9 decimals), so the server then credited integer forms the app refuses: `"0000000005"` and `"5.0000000000"` for 5. That is **6 unintended server credits**.

**Correction (`b9f7e4c`).** Integers keep the app's 9-digit grammar. Fraction and set parts read up to 30 digits; the app reads up to 80 characters, so the server remains the stricter reader.

**After the correction:**
- **0 cases** where the server credits an answer the app does not.
- Agreement rose from 597 (unified) to 698 of 770.
- The remaining differences are the server refusing parts longer than 30 digits that the app reads (conservative), plus 7 that already existed on unified (`1/-2`, and sets with `1/0` or duplicates).

Boundary tests were added to `test_server_parity.py` (4 tests, OK).

## 3. Incomplete vs incorrect

`grading/process-shadow.ts` now carries an advisory `projection`: correct, correct-process-feedback, incomplete, incorrect or unresolved.

`e7-integration-gate.test.ts` checks a real two-root kernel question:
- **Authoritative decision:** the one-root answer and a wrong answer are both `incorrect`, so credit is unchanged and equal.
- **Shadow evidence:**
  - one-root answer: `completeness: incomplete`, `credit: partial`, projection `incomplete`;
  - wrong answer: `credit: none`, projection `incorrect`.
- **Method mode:** `x^2 = 9 / x = 3` projects `incomplete`, and `x^2 = 9 ⇔ x = 3` projects `incorrect`.

## 4. E7 is advisory only

- **Import-graph scan, with a positive control:** none of these modules reaches `assessment-policy.ts` or `grading/process-shadow.ts` at runtime: `grading/decision.ts`, `grade.ts`, `server-grader.ts`, `records.ts`, `evidence.ts`, `session.ts`, `assessment.ts`, `grading/program.ts`, `question-status.ts`.
- **Server bundle:** the trusted server grader bundle's manifest contains neither module.
- **Backend:** no Python file references them.
- **Decisions:** a shadow record built from a frozen decision leaves it byte-identical.
- **Mastery and learner records:** nothing writes E7 findings anywhere, and the record/mastery modules are unchanged against unified.

## 5. Quarantine

- **TS decision:** all 1,012 quarantined ids × 4 responses → `unresolved` / `unresolved.quarantined`.
- **Server bundle:** 300 ids × 3 responses → credit `null`, reason `unresolved.quarantined` (900 of 900).
- **Registry:** `question-status.v1.json` is unchanged.

## 6. Generated artefacts

| Check | Result |
|---|---|
| Server grader rebuilt twice in the worktree | Identical: `17204038e0ea3f7306b540db537021cda6b40bae241d7c96a61ce606de38eeba` |
| Rebuilt in a fresh clone at a different path | Identical; no tree changes |
| Manifest | `sha256` equal; the manifest test passes (input hashes match sources) |
| Server output vs `feat/unified-grading`'s bundle | 16,000 requests: 0 differences (from the previous gate; the bundle is unchanged since) |

## 7. Re-run after the final changes

| Suite | Result |
|---|---|
| `bun test packages/learning/src` | **1454 pass / 0 fail.** One earlier run had a single E3 fuzz test time out while the Django and frontend suites shared the CPU; that file passes alone (45/45) and the full suite passes when run alone. |
| Django | 302, OK |
| Python without Django: server parity + kernel grader | 15 tests, OK |
| Frozen benchmark (SHA `a4ece4bf…`, labels untouched) | Correct 924, mathematical false acceptances 0, policy false acceptances 25, false rejections 23, misgrades 62, safe abstentions 1341. **0 changes** vs `7806b23`; 0 regressions vs baseline. |
| Fresh holdout (71) | 56 agree / 15 abstain / 0 false accepts / 0 false rejects. Not blind (the single blind run is on record). |
| Earlier holdout (78, not blind) | 55 agree / 21 abstain / 2 label-superseded |
| 341,483 generated-question contracts | 0 changed vs unified |

## Merge proposal (not executed)

**Target:** `feat/unified-grading`.

**Method:** fast-forward or a no-ff merge of `integration/e7-into-unified-grading` (head given in the final report). It already contains `feat/unified-grading@bb20657` as a parent, so the merge introduces no new conflicts as long as `feat/unified-grading` has not moved.

**Proposed merge commit message:**

```
Merge E7 core and the E7 safety/finalisation work into unified grading (process policy in shadow only)

- E7 core (837c79c) and fix/math-e7-safety-invariants (37238e5); conflicts resolved semantically:
  unified quarantine supersedes the E7-core G1 fallback; G2 30-digit reading applies to fraction/set parts only
  (integers keep the app's 9-digit grammar); both audit reports kept; grader bundle rebuilt (sha256 17204038…)
- E7 process policy (openpath-e7-process-policy@1) runs only as an advisory shadow record beside grading-decision@1;
  no authoritative grading, mastery or record path imports it; the server bundle does not contain it
- Tests: bun 1454/0; Django 302 OK; frontend 460/462 (2 pre-existing aofclass failures, identical on unified);
  frozen benchmark 924 correct / 0 mathematical false acceptances / 0 regressions
```

## Release implications

- **Authoritative grading** (`grading-policy@1`): unchanged. Server output is identical on 16,000 requests, and all 341,483 contracts are unchanged.
- **Legacy grading** (used in `OPENPATH_GRADING=shadow|legacy` and in replay of unrecorded history): fraction and set answers with 10–30 digit parts are now readable by the server, as the app already read them. This removes 9 confirmed client/server disagreements and adds no credit the app would not give. A rollback restores the 9-digit fraction grammar.
- **E7 engine:** the policy changes affect only E7 paths. None of them is authoritative yet:
  - `⇔` claims are graded;
  - incomplete answers are graded incomplete;
  - a wrong citation is a finding, not an invalid step;
  - bare `log` follows the convention order;
  - `sec` and `cbrt` are supported;
  - stated limit values are read.
- **Shadow rollout:** after approval, enable only `shadowProcessRecord` recording, with legacy/unified grading authoritative. Review the shadow comparison (agreement, conflicts, the incomplete-vs-incorrect projection) before any learner-facing use.
- **Not covered here:**
  - a lockfile-exact frontend `npm ci` and build (needs registry access);
  - PostgreSQL (the Django tests ran on SQLite);
  - browser end-to-end tests.

## Remaining known limitations

- **Citations:** wrong citations written in natural text are not parsed. These are 7 of the 25 policy false acceptances; the other 18 follow the rubric.
- **Checks:** an annotated candidate check line (`x = -1: sqrt(1) ≠ -1`) is not recognised as a shown check.
- **Unsupported topics:** bare-log equations, log evaluation and cube-root equations/identities abstain. They were not expanded, per instruction.
- **Server number grammar:** the server stays stricter than the app on fraction/set parts longer than 30 digits (it refuses them; it never credits them).
- **Pre-existing:**
  - `aofclass` generator defect (2 frontend tests, on both branches);
  - 7 client/server disagreements that predate this work (`1/-2`; sets containing `1/0` or duplicate members).
