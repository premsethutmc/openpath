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

Updated genuine-browser CI is pending at this commit. Its tally journeys check server-stamped records and shared-ledger replay after hints/retries and account reload, plus previous save/resume/isolation checks. Targeted accessibility checks add keyboard Enter activation for mark recording, descriptive SVG names, no horizontal overflow during teaching/recording, and teaching/recording screenshots at 360/900px. This is not a full WCAG or screen-reader audit.

No AI API calls in model/extraction/testing; only session reasoning uses model tokens. Existing CI runs the browser because local Chromium cannot create sockets. Remaining: genuine browser result for this evidence change, educator review, presentation-provenance instrumentation before any independent-evidence claim, comprehensive accessibility/source review, and unresolved current-edition Term III coverage.
