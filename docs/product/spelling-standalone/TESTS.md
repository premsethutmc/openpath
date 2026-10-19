# Executed verification — 2026-10-19

Synthetic data only. Local results; no claim about remote CI or physical devices.

| Check | Command (from indicated folder) | Result |
|---|---|---|
| Frontend suite, Node 24.19.0 | `frontend: npm test` | 317 passed, 0 failed |
| TypeScript | `frontend: npm run typecheck` | Passed (all three configurations) |
| Full Django suite, Python 3.12 / Django 5.2 | `backend: .venv/bin/python manage.py test` | 164 passed, 0 failed |
| Learning receipts under Node 22.18.0 | `frontend: node --import tsx --test src/english/logic/spelling-learning.test.ts` | 6 passed, 0 failed |
| Standalone build | `frontend: node scripts/build-spelling-bee.mjs` | Passed |
| Ordinary English regression build | `frontend: node scripts/build-english.mjs --out=dist-english-regression` | Passed |
| Private standalone mobile flow | `frontend: CHROMIUM_PATH=/usr/bin/chromium node --test e2e/spelling-standalone.test.mjs` | 3 passed, 0 failed |
| Canonical account integration | `frontend: CHROMIUM_PATH=/usr/bin/chromium node --test e2e/spelling-learning-accounts.test.mjs` | 1 passed, 0 failed |
| Original Bee regression, device-only build preview on 4663 | `frontend: CHROMIUM_PATH=/usr/bin/chromium E2E_URL=http://127.0.0.1:4663 node --test e2e/bee.test.mjs` | 12 passed, 0 failed |
| Existing parent content/account regression, API preview on 4662 | `frontend: CHROMIUM_PATH=/usr/bin/chromium E2E_URL=http://127.0.0.1:4662 node --test e2e/parent-content.test.mjs` | 3 passed, 0 failed |

New unit tests cover persisted study/hide/draft resume, all five helped answers
remaining assisted, later recall versus hints, legacy ten-word sessions, invalid
metadata, deletion scrubbing and failed-save behavior. New Django tests cover
scrubbing, tombstone revival refusal and diagnostic redaction.

Browser coverage: 320px and 412px viewports with touch emulation, parent file
upload, spelling hidden during recall, input blur draft persistence, page refresh,
keyboard Enter, explicit help, assisted feedback, full five-word session and
next-session recall. The authenticated gate refuses unauthenticated asset access.
Two isolated browser contexts use the real Django API and a fresh synthetic SQLite
database to verify cross-phone list/phase/draft persistence. No existing database
was reset.

Speech is simulated in these browser tests. Existing Bee regressions cover empty,
late, blocked, failed and absent device voices. Actual Android voice availability
and learning effectiveness still need owner/educator testing. These are not real
learner outcomes or content approvals.

The first wall test expected a login HTML response for an unauthenticated asset;
the server correctly returned 401 “Log in first”, and the assertion was corrected.
The initial account test used an incorrect Me heading selector; it was corrected
to the existing Parent account heading. An initial Bee regression invocation used
an account-enabled preview instead of its documented device-only preview; it was
rerun against the correct configuration. No unrelated application behavior was
changed to make those tests pass.

This delivery does not alter the shared estimator or its fingerprint snapshots.
The previously reported shared-core Node 24 fingerprint portability failures are
outside this change and were not suppressed or claimed fixed.
