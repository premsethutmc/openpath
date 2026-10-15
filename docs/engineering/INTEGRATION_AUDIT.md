# Integration audit: PRs #14–#29 and the release candidate

**Date:** 15 October 2026.

**Branch:** `integration/openpath-release-candidate`.

**Status:** for founder review.
- Nothing is merged or deployed.
- No PR was retargeted, rebased or closed.
- `main` is unchanged at `a0df477`.

## 1. What was found

### 1.1 Dependency map

`main` (`a0df477`) is the base of two lines of work that never met:

```
main a0df477
 ├── #14 english/pilot-readiness  (4 commits, a48b044)          ← parallel; conflicts with the stack
 └── #15 → #16 → #17 → #18 → #19 → #20 → #21 → #22 → #23 → #24 → #25 → #26 → #27 → #28 → #29
     (each PR's base is the previous PR's branch; only #15 targets main)
```

| PR | Branch | Base | Head | Commits on its base | Files on its base | In #29? |
|---|---|---|---|---|---|---|
| #14 | english/pilot-readiness | main | `a48b044` | 4 | 39 | **no** |
| #15 | english/rule-evidence | main | `59e6e51` | 1 | 7 | yes |
| #16 | english/rule-evidence-review-fixes | #15 | `3aa3548` | 1 | 2 | yes |
| #17 | english/evidence-provenance | #16 | `f74de80` | 1 | 8 | yes |
| #18 | english/doubling-journey | #17 | `651409b` | 1 | 18 | yes |
| #19 | english/mvp-correctness | #18 | `eac6745` | 1 | 19 | yes |
| #20 | english/pilot-prep | #19 | `6dc1740` | 1 | 10 | yes |
| #21 | english/pilot-blockers | #20 | `aa79134` | 1 | 18 | yes |
| #22 | english/learner-profile | #21 | `a9caf83` | 2 | 18 | yes |
| #23 | english/validity-ux | #22 | `5c85bc4` | 1 | 20 | yes |
| #24 | english/pilot-content | #23 | `5fb4a4c` | 1 | 22 | yes |
| #25 | english/pilot-evidence-integrity | #24 | `bce142e` | 1 | 28 | yes |
| #26 | product/ux-integration-v1 | #25 | `b623c5e` | 3 | 45 | yes |
| #27 | product/developer-diagnostics | #26 | `17eecd8` | 6 | 37 | yes |
| #28 | product/adaptive-spelling-assessment | #27 | `830264a` | 9 | 57 | yes |
| #29 | product/pilot-readiness-audit (draft) | #28 | `80827f3` | 2 | 15 | itself |

**Does #29 contain #15–#28?** Yes. Every head from #15 to #28 is an ancestor of `80827f3`
(`git merge-base --is-ancestor`), so #29's branch holds all their code: 32 commits on top of `main`. #14's commits
(`c3591e6`, `a1d5a09`, `bce786c`, `a48b044`) are **not** in it.

**Other open PRs, outside this work:** #2 and #3 (game prototypes, drafts) and #7 (E2 scope document).

### 1.2 CI at each head

Before integration, every head from #14 to #29 passed all 6 checks:
- Backend tests on Python 3.10, 3.12 and 3.13;
- Frontend typecheck, tests and build;
- Browser end-to-end (production build, API, PostgreSQL);
- English core (typecheck, acceptance tests, simulation, demo).

**What a green check proved:** each branch worked against its own base.

**What it did not prove:** that #14 worked with the stack. No CI run ever built the two together, and they
conflict in 13 files (1.4). `main` has no branch protection or required checks, so nothing stopped this.

### 1.3 Inventory

**On the stack (#15–#29), all preserved in the candidate:**

| Area | Delivered by |
|---|---|
| Rule-level evidence and provenance in the engine (provenance@1) | #15–#17 |
| Adaptive consonant-doubling journey: evidence gate, slips, contrast reassessment, worked-example hint | #18–#21 |
| Learner profile and development plan; one Today plan; practice is not mastery | #22–#23 |
| Five-capability pilot content with reserved question pools; evidence integrity (passage@1); history fixture | #24–#25 |
| Product UI on the real engine (Home, Journey, Progress, Me); parent accounts (Django `family` app); export and deletion | #26 |
| Developer diagnostics: access claims, sharing consent, audit log, backups | #27 |
| Spelling check by dictation (adaptive); the C′ evidence gate; estimated vs demonstrated levels; calendar-day retention; misconception statuses | #28 |
| Readiness audit, decisions, draft consent and information documents, observation sheets, backup report script, corrected consent wording | #29 |

**On #14 only, recovered into the candidate:**

| Area | Detail |
|---|---|
| Unsuitable words | 10 generated practice words excluded: parable, yessed, evillest, orgies, overdose, flogging, mugging, insane, flied, joyfuller. The stack still offered them. |
| Content review for generated words | Rule-and-sample approvals, exceptions and automatic flags (`generated-review.ts`, `tools/english/spelling/review.ts`, `review.json`, the pending pilot sheet) |
| Content modes | development, preview and pilot builds (`ContentMode`) |
| Corrected item versions | 132 generated items moved to version 2. Version 1 is kept in `retired-generated.json`, so old answers replay as version 1. |
| Word mastery | Word mastery kept separate from pattern mastery and estimates. Word memory moves only on written (recall) answers. A review step with confirmation checks. |
| Trial record | Session ratings, notes, the trial summary file, and pupil-code redaction |
| Security headers | `_headers`: X-Frame-Options, CSP frame-ancestors, Permissions-Policy, COOP, noindex. CI asserts the file exists. |
| Documents | CONTENT_VALIDATION.md, DEPLOYMENT_PROPOSAL.md, PILOT_PLAN.md |

### 1.4 Conflicts, duplicates and gaps

**Text conflicts between #14 and the stack (13 files):**
- `.devcontainer/devcontainer.json` and `.devcontainer/start-preview.sh`;
- `frontend/e2e/english.test.mjs`, `frontend/package.json` and `frontend/scripts/build-english.mjs`;
- in `frontend/src/english/logic/`: `content.ts`, `events.ts`, `learner.ts`, `plan.ts` and `state.ts`;
- `frontend/src/english/ui/App.tsx` and `Session.tsx`;
- `packages/english-core/src/index.ts`.

**Duplicate or competing implementations:**

| Concern | Competing versions | Resolution in the candidate |
|---|---|---|
| Codespaces preview | #14's static preview vs the stack's app + API + PostgreSQL | The stack's kept. #14's superseded. |
| Review records | #14's generated-word review (`review.json`), PR #24's pilot review (`tools/english/pilot/review.ts` → `reviews.json`), and #29's two CSVs plus `session-allowlist.json` | Two review systems remain, one for each kind of content, with no overlap: generated words (rule and sample) and hand-written and dictation questions (per item, fingerprinted). #29's CSVs and proposal file are **retired**. Their rows are now rows of the pilot review sheet. |
| Pilot allowlist | A proposal file in `docs/` that was not enforced | One authoritative file, `content/english/pilot/allowlist.json`, enforced by the pilot build |
| Pilot documents | #14's PILOT_PLAN.md and DEPLOYMENT_PROPOSAL.md vs #29's set | Both kept, as documents. #29's PILOT_DECISIONS.md is the current decision record. |
| Spelling review step | #14's `spelling_review` with confirmations vs the stack's due-words step | One function, `reviewStep`, used by both the plan and Home |
| Session UI | #14's single-file screens vs the stack's split screens | The stack's screens kept. #14's Words, trial summary, rating and notes ported into them. |

**Behavioural gaps found only by testing the two together:**

1. **Review reason missing from Home.** Home's activities did not use #14's confirmation review, so a word due
   for confirmation showed no reason there. Fixed with the shared `reviewStep`.
2. **#14 tests on screens that no longer exist.** Two of #14's browser tests merged without a text conflict but
   referred to #14's own screens (an "Overall spelling level" heading, a Settings tab). They were adapted to the
   integrated screens.
3. **Check button under the keyboard.** With #14's Android keyboard check ported, the dictation check's
   adult-reader panel pushed the Check button under the on-screen keyboard. Fixed: typed answers keep Check in
   view when the keyboard opens.
4. **Generated practice in the pilot build.** #14's pilot build still offered approved generated practice. The
   content-safety boundary required for the pilot disables it (section 2.2).

## 2. The release candidate

### 2.1 Commits

| Commit | What |
|---|---|
| `80827f3` | Starting point: the tip of #29, which contains #15–#28 |
| `92a271b` | Merge of PR #14 (history kept). Conflicts resolved against the current architecture, as listed in 1.4 |
| `dec00f3` | The pilot content-safety boundary (2.2) |
| `63f778e` | #14's browser tests adapted to the integrated screens |

### 2.2 The pilot content-safety boundary

The boundary applies in a pilot build (`node scripts/build-english.mjs --pilot`). Before any question is shown:

| Check | Where it is enforced |
|---|---|
| The activity is allowed: placement or the dictation spelling check, and nothing else | `activityAllowed`: `Learner.start`, `current()` (an older or imported session is ended), the plan, Home, Journey, and the spelling intro |
| That exact question version has an educator "approve" on its current fingerprint | Compiled at build time from `content/english/pilot/reviews.json` (`review.ts approved`). It cannot be set from the app. |
| The question is on `content/english/pilot/allowlist.json` at that version | The runtime `PilotGate` and the build |
| Anything missing, unknown, generated, journey, retired, unreviewed, or with an unapproved passage is refused | `PilotGate`, `itemAllowed`, and `Learner.present` and `answer`, which raise `PilotRefusal` |
| No lessons, no misconception feedback text, no generated practice, no journey, no hints | `PilotGate`, `itemAllowed`, and `Learner.present` and `answer` |
| `/developer` and deeper addresses show nothing restricted | `main.tsx` |

**Failing closed:**
- With no approvals, the pilot build refuses to build.
- `--allow-empty` makes a test build, and that build shows nothing (CI runs it in a browser).
- Development and preview builds are unchanged and remain the internal workflows.

**Approvals:** none are recorded. The review record is empty. Nothing was marked approved automatically.

### 2.3 Verification of the candidate

Results as run locally on the candidate:

| Suite | Result |
|---|---|
| Frontend typecheck (app and English) | clean |
| App unit tests (`frontend`, including pilot-boundary PB-1 to PB-7) | 201/201 |
| English core tests (including review tool PR-1 to PR-9) | 203/203 |
| Core typecheck | clean |
| Backend tests on PostgreSQL | 124/124 after the merge-gate corrections. Before them, 7 `evaluation` tests failed everywhere, on `main` too: the gateway refused the capability `name` that every request carries. This was not an environment difference. CI reported them as passing because the backend and frontend jobs had lost `pipefail` (section 3). |
| `family` app tests (accounts, pupils, export, deletion, diagnostics) | 40/40 |
| Database migrations | `makemigrations --check` shows no changes; `migrate --check` shows all 20 applied. The test run creates the database from every migration. |
| Browser, development build (`english.test.mjs`) | 9/9: the whole journey, trial, resume, export and import, word review, offline and no speech, the doubling journey, many skills, and the Android-sized keyboard test |
| Browser, accounts (`accounts.test.mjs`) | 6/6 |
| Browser, developer diagnostics (`developer.test.mjs`) | 3/3 |
| Browser, dictation spelling check (`spelling.test.mjs`) | 3/3 |
| Browser, pilot build with nothing approved (`pilot.test.mjs`) | 2/2 |
| Ten-learner simulation | Byte-identical to `main`'s output |
| Pupil A historical replay | Identical to before the integration |
| History fixture (PR #24 record) | Rebuilds exactly (`pilot-integrity.test.ts`) |
| Framework lock, bank checks, generated-item and review checks, pilot report, allowlist `--check` | OK |
| Demos | Profiles 25/25 PASS. Journeys and dictation run. |
| Production, standalone and English builds | OK |

CI on the pull request is the authority. Its results are recorded in the pull request.

**Not done:**
- No real Android device was used. The "Android" browser test is an emulated 412×915 viewport with a
  Pixel user agent in Chromium.
- No Codespace was used.

## 3. Merge-gate corrections (after `c7f7eed`)

| Commit | Correction |
|---|---|
| `c5d9399` | Pilot builds record no session ratings, free-text notes or written question reports (the information sheet promises nothing a child writes is recorded). `Learner.rate`, `note` and `flag` refuse in a pilot build. Older records that contain them still replay. Test PB-8. WEB_APP.md says which build pupils may see. |
| `129f840` | **CI masked backend failures.** The backend and frontend jobs set their own `defaults.run` (working-directory), which replaces the workflow's `shell: bash`. Their steps ran under `bash -e` without `pipefail`, so `manage.py test \| tee` returned tee's status, and `require-tests.sh` reported "Ran 123 tests" as passed. Both jobs now name the shell again, and `require-tests.sh` also fails on `FAILED (` or a non-zero `# fail`. On this commit CI went red on the backend, which proves the masking. |
| `0470a78` | The E3a gateway's identifier check refused the key `name` anywhere, including the capability name the core sends in `target` and `targets`. It now allows `name` only there, as a string; anywhere else it is still refused (new test). The backend suite passes: 124/124. |
