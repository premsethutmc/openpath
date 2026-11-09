# Adaptive quality handover — 2026-11-09

Commit: `e49caab4848d361338a414f945381ae2e2b3a812` on `milestone/teaching-geometry-handoff-2026-11-09` (local only).

## Changes

Fixed journey helpers that stripped `:mc` before reading the answer or generated numeric/letter-plus-zero mistakes. They now use the displayed question's answer and existing shaped-wrong helper. Both general and shaped mistake helpers restrict choice candidates to actual displayed option letters and fail loudly if no genuinely incorrect option exists. Example: `gen:pow:2,3:mc` options 4,5,6,8; old helper sent `9` (unresolved), corrected helper sends `A` (incorrect), correct answer stays `D`.

Updated the existing real-backend browser journey; no backend or learner runtime implementation change was needed. Mobile learner (390×844), shared educator and a separate unauthorised educator use real account sessions and Django APIs. The journey now proves no automatic report, explicit request, separate recovery-answer consent/revocation, underlying share revocation, access denial, resolution, duplicate resolution rejection, one fresh unaided check, no automatic mastery, prior history retained and reload without check reuse. Every intentional wrong in the journey is asserted incorrect in Django. The fresh question is `gen:aupfr:1,1,2,-1,3`; 11 intentional wrong attempts were recorded incorrect.

## Verification

- `node --import tsx --test src/journey/simulated-choice-answers.test.ts src/journey/adaptive-milestone.test.ts src/journey/subskill-evidence.test.ts src/journey/sub-skill-evidence.test.ts src/journey/deep-recovery-handoff.test.ts`: 31 pass, 0 fail. The last fail-closed choice guard was rechecked with the dedicated choice suite: 1 pass, 0 fail.
- Choice coverage: 33 questions (24 generated MC variants and 9 native choices), 3 helpers, 99 intentional wrong responses. Every response is a displayed option letter; actual Django decision machinery returns incorrect in both shadow and unified modes.
- `.venv/bin/python backend/manage.py test family.test_handoff family.test_handover`: 24 collected, 23 pass, 1 fixture-dependent persistence skip. Then generated fixtures with `frontend/scripts/h1-persistence.mts export`, ran `H1_DIR=/tmp/adaptive-quality/h1 ... manage.py test family.test_handover.HandoverPersistence`, and verified in a new Node process: PASS. The earlier skip is thus resolved separately.
- `DIST=dist-adaptive-quality node scripts/build-year.mjs --test --deep-recovery`: pass, isolated build output.
- `DIST=dist-adaptive-quality HANDOFF_API=http://127.0.0.1:8026 PORT=4226 HANDOFF_MANAGE='/workspace/openpath/.venv/bin/python backend/manage.py' CHROMIUM_PATH=/usr/bin/chromium SHOTS=/tmp/adaptive-quality/screens node --import tsx e2e/deep-recovery-handoff.test.mts`: pass. Django ran with `OPENPATH_DEEP_RECOVERY_HANDOFF=1` on 8026. Saved logs, JSON and screenshots alongside this handover.
- Backend default-off/404 and adaptive URL/build flag unit checks pass. Browser research fixture is explicitly test-only; no claim of approved real-learner use.
- `git diff --check`: pass.

Full repository suite, hosted CI and a separate shipped-build browser pass were not run by this subtask. Root owns final integrated checks. No push, deployment, educational approval, generated artifacts, package changes or Grade 8 edits.

## Integration notes

Changed only five owned files: `frontend/e2e/deep-recovery-handoff.test.mts`, `frontend/src/journey/learners.ts`, `wrong-answers.ts`, `subskill-scenarios.ts`, `simulated-choice-answers.test.ts`.

The browser test accepts `DIST` to avoid changing root's build output. Its result destination defaults to `/tmp/adaptive-quality/handoff.json`; set `HANDOFF_RESULTS` for another path. Screenshot evidence includes learner fresh question and used-check state, educator queue, permission and revocation states. All accounts are synthetic example.org identities; no messages are sent.
