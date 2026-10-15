# Pilot readiness and PR integration: decision document

**Status:** for decision.

> **Update (release candidate, 15 October 2026).** Section B is now built, in the integration candidate
> (`integration/openpath-release-candidate`; see `docs/engineering/INTEGRATION_AUDIT.md`):
> - the allowlist is `content/english/pilot/allowlist.json`, written by `frontend/scripts/pilot-allowlist.mts`
>   (`--check` in CI);
> - its questions are reviewed with the one pilot review tool, `tools/english/pilot/review.ts` (export, import,
>   `approved`); the separate CSVs named below (`pilot/placement-review.csv`, `pilot/dictation-review.csv`) and
>   `pilot/session-allowlist.json` were retired so there is one review record;
> - the pilot build enforces B2 and B3 (`PilotGate` in `frontend/src/english/logic/content.ts`).
>
> Nothing is approved: the review record is empty, so a pilot build refuses to build, and a test build shows nothing.

**Constraints:**
- No PR has been merged, retargeted or rebased.
- Nothing is deployed.
- No pupil has used the app.
- No question is marked educator-approved.
- The drafts in `docs/product/pilot/` are **not approved**.

**Basis:**
- `main` at `a0df477`;
- the stack #15–#28, with tip `830264a`;
- PR #14 at `a48b044`;
- PR #29 (this branch).

## Summary: what is ready, and who decides the rest

| Ready now (no further approval needed to use internally) | Needs adult testing | Needs educator approval | Needs founder approval |
|---|---|---|---|
| The stack is green and each PR merges cleanly onto its base | The Android manual test (ANDROID_MANUAL_TEST.md) on each pilot phone, especially real speech and keyboard suggestions | Suitability of all 79 dictation words (`pilot/dictation-review.csv`) | Integration plan and merge order (A5); the decision on PR #14 |
| Reviewable lists: 212 placement questions and 79 dictation words, with ids, prompts, expected answers, skills and difficulties; the content check (`scripts/pilot-lists.mts --check`) | A dry run of the whole protocol with adults, in device-only mode, including export, backup report and deletion | Suitability of all 212 placement questions (`pilot/placement-review.csv`) | The pilot environment (D: device-only recommended) |
| Session allowlist **definition** (`pilot/session-allowlist.json`, proposal, not enforced) | Adult-reader mode handled by a supervisor, with the screen kept from the child | The ten excluded generated words, if practice is ever used (A2) | Enforcing the allowlist in a pilot build (B3: a small code change) |
| Backup report for device-only records (`scripts/backup-report.mts`): the same report as the dashboard | Session length within 20 minutes | Placement and dictation questions marked approved in a review record (never automatically) | The corrected in-app consent wording (C1) |
| Observation sheet and per-question log (E) | | The teacher-assessment method (protocol §4) | Budget, retention periods and the pilot dates |
| Drafts: information sheet, consent form, pilot-lead duties, retention (C) | | | Engaging a data-protection reviewer, the host organisation and its safeguarding lead (C3) |

## A. Integration review

### A1. Dependency map

```
main (a0df477)
├── #14 english/pilot-readiness (4 commits)   ← parallel; conflicts with the stack's tip in 13 files
└── #15 rule evidence → #16 review fixes → #17 provenance → #18 doubling journey → #19 MVP correctness
    → #20 pilot prep (doubling) → #21 pilot blockers → #22 learner profile → #23 validity/UX → #24 pilot content
    → #25 evidence integrity → #26 UX integration + parent accounts (backend) → #27 developer diagnostics
    → #28 dictation + mastery rules (tip 830264a) → #29 pilot documents (draft)
```

**What the checks cover:**
- Every PR merges cleanly onto its base, is 0 commits behind, and passes 6/6 checks on its head.
- Each head contains everything below it, so CI on #28 tests the whole stack.
- No CI run has ever tested the stack and #14 **together**.
- `main` has no branch protection.

### A2. What PR #14 has that the stack does not (to preserve)

| Item | Files (in #14) | Why it matters |
|---|---|---|
| **Excluded unsuitable generated words.** Pre-screen exclusions, reversible by a reviewer: *orgies*, *overdose*, *flogging*, *mugging*, *insane*, *yessed*, *evillest*, *parable*, *flied*, *joyfuller* | `content/english/spelling/review/review.json` (exceptions) | **All ten are offered as practice in the stack.** For example *orgies* at y→i 4.25–4.5, *overdose* and *insane* at plain affix 1.5–2, and *flogging* and *mugging* at doubling 2.75–3. A child doing spelling practice could see them |
| Content validation for generated words: rule and set approval from a sample (≥ 20 items, ≤ 5% problems), exceptions, automatic flags (81 items), provenance, and approvals that lapse when the content changes; a CI check | `packages/english-core/src/generated-review.ts`, `tools/english/spelling/review.ts`, `content/english/spelling/review/*` | The only mechanism that lets a person approve generated practice words |
| **Pilot build mode**: `ContentMode` pilot / preview / development. The pilot build offers only approved generated words and refuses to build with none | `content.ts`, `build-english.mjs` | The basis for enforcing the allowlist (B3) |
| 132 generated items moved to version 2 (the *-able* explanation fix), with version 1 retired | `generated-items.json`, `retired-generated.json` | Must arrive with the retired versions, so that existing records still replay |
| Word mastery per word and confirmation reviews of words spelt right (3 and 7 days) | `words.ts`, `select.ts`, `plan.ts` | A behaviour change to spelling review (needs review; not needed for the first pilot) |
| Trial record: an end-of-session rating, notes (free text), a trial summary, `tools/english/pilot/report.ts` | `pilot.ts`, `Note.tsx`, `events.ts` (`rating`, `note`) | Notes are free text and could contain names. They are **not** wanted in this pilot (C, E) |
| `_headers` (no framing or indexing; no camera, microphone or location) | `preview-english.mjs` | Should be kept for any hosted build |
| Docs: CONTENT_VALIDATION.md, DEPLOYMENT_PROPOSAL.md, PILOT_PLAN.md | `docs/english/` | Overlap with the later pilot documents (A3) |

### A3. Duplicate or conflicting implementations

| Area | #14 | Stack | Resolution |
|---|---|---|---|
| `.devcontainer/` (add/add conflict) | Builds and serves the pilot preview on port 4174 | API, PostgreSQL, a stale-server restart, the developer claim code | Keep the stack's; add #14's pilot-build option |
| `build-english.mjs`, `preview-english.mjs` | Content mode; `_headers` | Build stamp; API proxy | Combine both by hand |
| `content.ts`, `events.ts`, `learner.ts`, `plan.ts`, `select.ts`, `state.ts`, `App.tsx`, `Session.tsx` | Content mode, word reviews, notes and ratings | Dictation, mastery rules, accounts, traces | Port #14 onto the stack's tip as new commits; review the review-scheduling change on its own |
| Content review records | `spelling/review/review.json` (generated words) | `pilot/reviews.json` (250 hand-written pilot rows); PR #29 review CSVs (dictation, placement) | Three formats. Keep each for now; later, one decision schema (id, version, decision, reviewer, date, fingerprint) for all content |
| Pilot documents | PILOT_PLAN.md, DEPLOYMENT_PROPOSAL.md | PILOT_PROTOCOL.md, PILOT_READINESS.md, PRODUCTION_BLOCKERS.md, PR #29 documents | Make PR #29's set current; mark the older ones superseded when merging |
| Spelling review scheduling | Due words plus confirmations | Due words (1, 3, 7, 14 days) | #14 extends the stack's version; it is not a duplicate |

### A4. Risks that green CI does not cover

1. **Content suitability.** No test checks that words are appropriate. This is exactly how the ten words above passed.
2. **#14 combined with the stack.** It has never been built or tested together. Conflicts in 13 files mean hand
   resolution, which is where regressions come from.
3. **Real devices.** Speech, keyboards and sleep or resume are not tested.
4. **Replay of real records across versions.** Retired item versions, new event kinds (`rating`, `note`) and new
   rules are tested on fixtures and one replayed real export (Pupil A), not on a body of real records.
5. **Database migrations against real data.** Two family migrations; none in #14. The stack has never been tested on
   a populated production database.
6. **Security and privacy.** No penetration test, email verification or MFA (PRODUCTION_BLOCKERS §C).
7. **Merge mechanics.** No branch protection. Squash-merging a stack, or retargeting it, can drop or duplicate commits
   unless done in order.
8. **Educational validity.** Thresholds and difficulties are drafts; tests check only that the rules are applied.

### A5. Recommended integration

1. **Founder decides on #14:** port it, don't merge it as it stands.
2. **Turn on branch protection on `main`** (required checks), before any merge.
3. **Merge the stack in order with merge commits, not squash, so history is kept.** For #15, #16 … #28:
   1. retarget it to `main` once its base has merged (GitHub does this when the base branch is deleted);
   2. let CI run;
   3. merge.
4. **Then port #14 as a new PR on `main`,** keeping its commits and records:
   - the review records exactly as they are, including the 10 exclusions;
   - `generated-review.ts`, `ContentMode` and the pilot build;
   - versions 2 and retired versions 1 together;
   - `_headers`.

   Leave out the notes UI, or hide it in the pilot build. Word confirmations go in a separate PR.
5. **Close #14** with a link to the port. Merge **#29** last.
6. **Before any pupil uses spelling practice:** the port is merged, and the pilot build is the only build used.

**Faster alternative, if the founder prefers:** port only the 10 exclusions and `ContentMode` onto the stack first,
then merge as above. This leaves the full validation workflow for later.

## B. Pilot content boundary

**B1. Allowlist definition.** `content/english/pilot/allowlist.json` is generated by
`node --import tsx scripts/pilot-allowlist.mts`, and its `--check` mode (in CI) detects any later content change.
(It was `docs/product/pilot/session-allowlist.json`, written by `scripts/pilot-lists.mts`, when this document was
written.)

| Category | Allowed |
|---|---|
| Sessions | **Allowed:** `placement`, `spelling_assess` (the dictation check and dictation evidence checks). **Refused:** spelling practice, review, transfer, the older spelling check, guided lessons, More practice, the doubling journey, and non-dictation checks |
| Items | **Candidates:** 212 placement questions and 79 dictation words, by id and version |
| Lessons | None |
| Generated practice words | None |

**B2. The rule.** An item may be shown in a pupil session only if it is on the allowlist **and** an educator's
approval is recorded for that exact id and version. Until approvals exist, nothing is allowed. No item is marked
approved by this document or by any tool here.

**B3. Enforcement (built in the release candidate; founder approval of the candidate needed).** In the pilot
build, `ContentMode` (ported from #14) with `PilotGate`:
- start only the allowed session types;
- restrict hand-written and dictation selection to approved allowlisted items;
- offer no lessons or generated words;
- refuse to start a session that would need anything else, with a message for the adult.

The protocol's limits on which activities are started (PILOT_PROTOCOL_FIRST.md §3) still apply as a second
safeguard.

**B4. Reviewable lists.** One review sheet: `node tools/english/pilot/review.ts export` writes
`docs/english/review/pilot/pilot-review.{csv,html}`. Its question rows include all 212 placement candidates and all
79 dictation words (each marked "pilot allowlist: placement" or "pilot allowlist: dictation"), with the prompt, the
spoken word and sentence, options, key, the feedback shown after answering, difficulty, and a fingerprint. Decisions
are imported with `review.ts import`; a row whose content changed after export is refused.

## C. Data and safeguarding

1. **Misleading wording corrected (in this PR; founder approval needed before release).**
   - **Old:** the account consent tick box said records are kept "only to show their learning to me. They are not
     shared".
   - **Why it was wrong:** developers can read a record that a parent shares for diagnostics, and the app sends
     performance measurements.
   - **New wording:** "…OpenPath's developers read a child's record only if I turn on sharing for diagnostics for
     that child in Me (every look is logged), and the app sends performance measurements that never include answers
     or names. Records are not sold or given to anyone else…".
   - **Device-only wording ("Nothing is sent anywhere"):** checked and accurate. Device mode installs no sender.
2. **Drafts in `docs/product/pilot/`.** All are marked DRAFT, with blanks for names, dates and periods:
   - PARENT_INFORMATION_SHEET.md;
   - GUARDIAN_CONSENT_FORM.md (separate yes/no items, with teacher level and kept copies optional);
   - PILOT_LEAD_AND_DATA.md (duties, data inventory, retention: 3 months proposed).
3. **Approvals needing human review:**
   - the data-protection reviewer: India's DPDP Act 2023, verifiable parental consent for under-18s, and the wording
     of every sheet;
   - the host organisation and its safeguarding lead;
   - the head or principal;
   - whether an ethics review is needed, and insurance;
   - the founder: setup, budget and retention.

   None of these is represented as given.

## D. Pilot environment

| | Private hosted pilot | Codespaces preview | Device-only (recommended) |
|---|---|---|---|
| Accessibility for pupils | Any browser, HTTPS address | Needs the phone's browser signed in to GitHub as the codespace owner (private port) | Opens from a static address once, then works offline |
| Authentication | Parent accounts (the pilot lead's) | GitHub sign-in **plus** the app's account. A child's device signed in to the founder's GitHub reaches the founder's repositories and settings | None on the device. Phones are pilot-owned and locked |
| Data location | Chosen region (an India region possible) | A GitHub codespace, in a region GitHub assigns (not guaranteed to be in India); deleted with the codespace | On the phone, then encrypted files held by the pilot lead (in India) |
| Privacy exposure | A server with children's records; needs a security review | Records in a development container with broad access | Smallest: no server copy; the static host sees only page requests |
| Reliability | Good once operated; needs monitoring | Stops after 30 minutes idle (sessions can fail on reconnect); a single developer container | Good. No connection needed after loading. Risk: browser data cleared before export |
| Backups | Managed database backups (to set up) | None | The pilot lead's export after each session |
| Cost | A small server and managed database, a rough estimate of USD 20–60 a month, plus set-up time | Free tier hours, then usage-based | A static host, usually free |
| Retrieving evidence | Developer dashboard, live | Developer dashboard, live | `scripts/backup-report.mts` on each export gives the dashboard's report: every answer, difficulty, help, Learner Vector change, reasons and plan decisions |
| Work before a pilot | Deployment, secrets, HTTPS, backups, security review (PRODUCTION_BLOCKERS §B–C) | Little, but the GitHub sign-in on children's devices is unacceptable | Host the static pilot build; a dry run |

**Recommendation: device-only on pilot-owned, locked Android phones.**

**Serving the app:** the static pilot build, from a static HTTPS host (no API) or, failing that, the pilot lead's
laptop on the local network.

**Each child's record:**
- after each session: export it and run the backup report;
- keep it on the phone between that child's sessions;
- after the child's last session: delete it from the phone.

**Why:** it keeps children's data off any server, avoids putting the founder's GitHub on children's devices, and
needs no deployment. The developer can still read every decision through the backup report. Deployment stays a
later, separate decision.

## E. Observation sheet

The sheet is split into two files, so the session sheet stays small and per-question detail has its own place.

| File | One row per | Captures |
|---|---|---|
| `pilot/observation-sheet.csv` | child per session | pupil code, session, date, device label, Android and browser version, keyboard settings checked, voice mode, assent, activities, questions answered, early stop, teacher's independent level and its basis, OpenPath estimate and shown-now level for both dictation skills, standing and label, agreement, usability-failure counts, an unexpected-behaviour flag, the child's reaction, adult help, initials |
| `pilot/question-log.csv` | event worth noting | pupil code, session, time, **question id** (filled afterwards from the backup report by time), voice mode, **assistance** (none, app hint, second try, adult re-read, other), category, what happened, severity, action, screenshot file, review outcome |

**Deliberately not collected:**
- names;
- dates of birth;
- school;
- free text by children;
- photos;
- device identifiers beyond a label such as "D1".

Both files say "no names" in their headers.

## Changes made in PR #29 for this review

**Documents:**
- this file;
- `pilot/` drafts;
- the two CSV review lists;
- the allowlist proposal;
- the observation sheet and question log.

**Scripts:**
- `frontend/scripts/pilot-lists.mts`;
- `frontend/scripts/backup-report.mts`: read-only, tested on a generated backup.

**One app text change:** the account consent wording (C1).

**Nothing else changed:** no rule, threshold, content item or approval.
