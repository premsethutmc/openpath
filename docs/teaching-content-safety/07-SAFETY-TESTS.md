# 07 — End-to-end safety tests

All through the integrated components (real grader, records, evidence, adaptive engine, teaching gate, registry); only learner actions
are scripted. Approvals used in tests are in-memory fixtures (reviewer `test-fixture-educator`), never written to the registry.

`frontend/src/journey/content-safety.test.ts`:

| # | Requirement | How it is tested |
|---|---|---|
| 0 | registry sound, nothing approved | validates against all 1179 explanations and 336 concept sections; 0 reviewers; 0 approvals; blocklist of 4; default mode demonstration |
| 1 | approved shown when all conditions pass | supervised mode, fixture approval of linear-equations explanations; scenario 2a teaches, every decision `educatorApproved`, label "Approved by an educator" |
| 2 | pending refused in supervised mode | `contentEligibility` fails `approved-for-usage`; in demonstration shown with the not-approved label |
| 3 | blocked refused in all modes | the blocked doubling revision re-created: refused in both modes, as intervention and on the lesson page; exactly 4 blocked revisions, none is current content; relabelling it in the registry does not unblock it (blocklist) and the registry check reports the mismatch |
| 3b | concept section gated | supervised mode: the concept section and lesson page show nothing unapproved; with fixture approvals the lesson shows and is labelled approved |
| 4 | modified content rejected | fixture approval, then one sentence added: `revision` fails in both modes |
| 5 | missing explanation | no module, no strategy, strategy not in module, empty screens: `exists` fails, nothing substituted |
| 6 | wrong competency | request for another skill fails `competency`; a record re-pointed at another skill fails `integrity` |
| 7 | unverified misconception → no specific teaching | scenarios 4a, 4c, 5b, 4f, 2b, 2c, 5a, 5c, 2a, 3h: every misconception-specific explanation shown had an established misconception; 4a/4c/5b show no "spot the mistake"; control 2a does; a *different* established misconception does not license it |
| 8 | approved general explanation used | supervised + fixture approvals; hint-only learner 4a gets a general explanation only |
| 9 | no eligible explanation → bounded pause | supervised, nothing approved: 2a, 4a, 5b teach nothing, end in pause, no mastery |
| 10 | failed retention still requires recovery | supervised: `recoveryRequired`, not verified, next step not done and not unapproved teaching |
| 11 | teaching shown is not success | 5b: taught, rechecks after teaching wrong, status never independent |
| 12 | restart preserves state | events serialised and replayed (`SliceSession.fromEvents`): evidence, recovery requirement, history and next step identical. Across a real Django restart: `m2-persistence.sh` (regression run) |
| 13 | demo cannot promote | demonstration run leaves the registry byte-identical; every shown explanation still refused in supervised mode |
| 14 | forged metadata | 11 forgeries (AI-screening approval, unlisted reviewer, non-educator role, stale digest, no digest, review before authorisation, altered intervention type, cleared misconception flag, altered addressed misconception, supervised scope on pending, relabelled approval): each refused in supervised mode, reported by the registry check, and not taught end to end |

`frontend/src/journey/content-corrections.test.ts`: the four corrections (A doubling, B missing number over every family question,
C rational numbers, C′ every "spot the mistake" in the library) and their registry state (earlier revision blocked, new revision pending).

`frontend/e2e/a2-explanations.test.mjs`: the four corrected explanations rendered in the real renderer, desktop 1366 × 800 and mobile
390 × 844: shown in demonstration with the not-approved label, corrected text present, defective text absent, no horizontal overflow, no
page errors. Screenshots: `screenshots/`.

Policies A, B, C: `frontend/src/journey/policies.test.ts` (unchanged), run in the regression.
