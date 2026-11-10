# Tally shared practice evidence — 2026-11-09

Continues `cf285de` on the isolated ingestion branch, draft PR #123. STATUS and remote heads read first: Claude Grade 8 `7a429a94`, answer-key `49a6be8b` unchanged; no teaching-method integration. Prior-head tally CI run 42661961260 succeeded. Wider prior-head workflows still running when inspected; the mathematics workflow had passed typecheck/validation and was running its full test suite. No merge/deploy/settings or existing learner-record edits.

## Evidence semantics

The tables capability **already exists** in the shared framework. No registration, prerequisite graph, estimator or grading policy was changed. The earlier “unavailable” shared-understanding display means no qualifying inference, not a missing capability.

The backend now stamps new tally receipts `evidencePolicy: tally-practice@1`; clients cannot inject this field. Existing stored receipts retain their original bytes and replay semantics. Older frontends can ignore the additive server field; newer frontends treat absent stamps as legacy/unknown help history.

New guided answers, answers after saved hints, retries after any prior feedback (including unresolved feedback), and the application reusing worked-example rows become existing shared-ledger `assisted_response` events. Actual new-policy hint receipts become shared `hint` events. Item history is shared across sessions/journeys. No fictitious presented events or hint receipts are created. If a legacy hint caused assistance, its original receipt remains the source and no synthetic hint display is asserted.

Other new tally responses remain provisional `evidence` events with `use: practice`, **without independent-provenance claims**. The existing content gate holds them and changes no ability estimate. The app shows helped/repeated practice, unassisted practice with independence unverified, legacy unknown-help responses and zero independent evidence. Completion, correctness, independent evidence and educator approval remain separate.

Legacy native event shape, all legacy capability nodes and ordinary foundation behavior are regression-tested unchanged. No release mappings accepted. The 144-outcome inventory and 48-gap plan remain draft; this is not curriculum completeness or mastery integration.

## Verification

Local: 49 tests pass (31 intake/model/parser, 10 foundation/evidence, 8 backend), integration typecheck with 4 GB Node heap and foundation build pass. Tests cover server-only policy stamping, injection rejection, duplicate receipts, unresolved feedback/retries, hints across sessions/journeys, exact legacy native event shape, unchanged capability estimates and no verification claim.

Genuine Chromium CI on `8e72d33f61cdb0098bca1e0b4b89222337b9233d` passed: [run 42664467628](https://github.com/premsethutmc/openpath/actions/runs/42664467628), job 129324295320. All 10 foundation/evidence tests, 8 backend tests, the build and all 7 browser journeys passed. The seven journeys include tally at 360/900px, four original Grade 1/3/5 journeys and failed-save recovery.

Both tally journeys persisted four marks, resumed in a fresh browser context with account cookies only, exercised wrong/correct answers and hints, and reloaded seven completed stages. Server-stamped receipts replayed as exactly 4 assisted, 2 unassisted, 0 legacy-unknown and 0 independent evidence; capability verification remained unavailable. Fresh-learner isolation and the delayed-review lock passed. Elapsed next-day return is covered by backend tests, not by waiting a day in the browser.

Keyboard Enter activation, descriptive SVG names and no horizontal overflow during teaching/recording passed at both widths. All six teaching, recording and resumed-state screenshots were visually inspected. At 360px the table labels wrap inside words: a presentation limitation, despite usable controls and no overflow. This is not a full WCAG or live screen-reader audit. Artifact 13697927463 expires 2026-11-16; hashes, counts and limits are retained in `tally-evidence-browser-result.json`.

Broader checks on the same app commit: My Learning Year run 42664467617 passed, including regeneration consistency and all 11 browser acceptance suites. Mathematics foundation run 42664467697 and learner journey run 42664467680 passed: each full frontend suite reported 1,111 tests, 1,108 passes, zero failures, one skip and two TODOs. Their browser suites passed 9/9 and 7/7 respectively. Grade 1–6 review run 42664467620 also passed its full frontend/backend tests and 12 browser interactions. Main CI run 42664467685 passed on attempt 2 (all frontend shards, Python 3.10/3.12/3.13 on PostgreSQL/SQLite, English, essay, Tamil and production-browser tests). Prerequisite run 42664467657 passed on both Node 22.18.0 and 24.19.0: each full frontend suite passed with the same skip/TODO counts, backend tests passed and all 12 browser/account regressions passed. Both legacy-research jobs passed. All seven workflows on app commit 8e72d33 are therefore green as of 2026-11-09 19:00 UTC.

Main CI attempt 1 had a GitHub workflow-level internal server error (correlation `c19db644-fc21-417d-824b-bcbe878c3141`): all 14 created jobs passed, but the dependent production-browser job was never created. Failed-jobs retry returned HTTP 403, "This workflow run cannot be retried"; no retry executed from that request. A targeted rerun of frontend prerequisite job 129332693583 succeeded, recreated dependent browser job 129356491934 and brought main CI to success. No tests, workflow configuration or repository settings were weakened or changed.

No AI API calls in model/extraction/testing; only session reasoning uses model tokens. Existing CI runs the browser because local Chromium cannot create sockets. Remaining: mobile label wrapping, educator review, presentation-provenance instrumentation before any independent-evidence claim, comprehensive accessibility/source review, and unresolved current-edition Term III coverage.

This follow-up changes documentation only. CI results above apply to app commit `8e72d33`; any fresh runs triggered by publishing this report are separate and are not represented as already completed. Claude's candidate `5e4c1fd8` was inspected by branch head only and remains untouched.
