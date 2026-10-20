# Executed verification — connected v2, 2026-10-20

All learner records were synthetic. The browser tests used a real Django service
with a fresh SQLite database at `/tmp/openpath-writing2-synthetic.sqlite3`, not
production records. No physical stylus validation or remote CI outcome is claimed.

| Check | Actual result |
|---|---|
| Full frontend suite, Node 24.19.0 | **334 passed**, 0 failed |
| Full frontend suite, Node 22.18.0 | **334 passed**, 0 failed |
| Writing model/contract/integration units (included above) | **23 passed** |
| TypeScript, all four configurations | Passed |
| Full Django suite, Python 3.12 / Django 5.2.18 | **176 passed**, 0 failed |
| New writing backend tests (included above) | **15 passed** |
| Django migration consistency | `makemigrations --check --dry-run`: no changes detected |
| Integrated English + mathematics + writing build | Passed; model SHA-256 checked |
| Combined browser suites, Node 24.19.0 | **19 passed**, 0 failed |
| Same browser suites, Node 22.18.0 | **19 passed**, 0 failed |

The combined browser count comprises four actual Django learning journeys, one
real-model recognition test, and fourteen retained workspace/component regressions.
The regressions include labelled synthetic recognition/host fixtures; they are
**not** the evidence for actual v2 recognition or mathematical integration.

## Actual connected journeys

1. **Typed division:** introduction and worked example, all working entered,
   save/reload/resume, quotient `136` for 379 ÷ 3, first invalid digit identified at
   the `7 ÷ 3` part, grouping/facts/selection follow-ups, multiplication support,
   return to unchanged working, edit to `126`, complete with remainder `1`.
   Actual server receipts, native held decisions and ineligible evidence are checked.
2. **Real ink plus clarification:** captured original stroke for a handwritten `1`,
   real local WASM recognition, insufficient mark highlighted as uncertain, targeted
   typed confirmation, remaining input completed, real backend operation validation,
   original strokes/corrections retained in the pupil's receipt.
3. **Fractions:** equivalent-fraction input `2/3`, exact rejection, targeted scaling
   follow-ups and teaching, correction to `2/4`, completion, reload/resume and
   separately opened division progress. This uses the same workspace and backend
   account, not a second drawing or learner engine.
4. **Recognition failure:** all model assets blocked, original ink preserved,
   recognition error surfaced without diagnosis, entire division completed through
   manual input and the real Django validator.

The real-model test classifies hand-authored original traces for `1`, `2`, `7`,
repeats with changed IDs and checks that unsupported expression regions require
clarification. Predictions execute the vendored pretrained model; there are no
response mocks, answer lookups or replayed recognition outputs in these five tests.

## Other coverage

The 15 backend tests include 206 reproducible division configurations (fixed edge
cases plus seeded random operands), every operation's first error, quotient digit
order despite different ink heights, negative subtraction, incomplete versus
uncertain input, exact fraction equivalence, differentiated support hypotheses,
authentication/ownership/CSRF, optimistic conflicts, retry idempotency, unsupported
contracts/layouts, state resume, shared event-stream persistence, export/deletion,
separate topic progress and transcription disputes without a gap claim.

The 23 writing units exercise the prior 19 capture/contract tests plus native
ledger/eligibility and helped-response behavior, disputed interpretation exclusion,
existing arithmetic/fraction/linear/polynomial evaluator compatibility, local provider
availability/segmentation/scoring helpers, and legacy fractions receipt filtering.
The full 334-test run also retains English, Tamil, essay and mathematics regressions.
No shared estimator or mastery policy was changed. The separate shared-core research
suite was not rerun and its previously reported Node 24 fingerprint portability
failures are not claimed fixed.

The 14 retained browser/component tests cover mouse/touch/simulated pen, pressure,
palm lock, eraser sweeps, undo/redo/clear, pinch, zoom/pan/resize alignment,
manual/keypad fallback, local draft backup/resume, quota failure, targeted correction,
confirmed edits surviving another recognition pass, late response rejection and
host-requested clarification. These are Chromium simulations, not actual Samsung
or stylus hardware.

## Issues found during integration

- The preview server lacked `.mjs`/`.wasm` MIME types required by actual inference;
  those mappings were added and the real WASM tests now run.
- Manual fragments initially had whole-region bounds, putting a newly typed digit
  before existing ink. Their bounds now reference unrecognized ink or append after
  existing symbols; complete typed rows still retain their existing behavior.
- Following up too quickly could fill a response while the previous answer was
  saving. The field now locks during the request, and browser tests await the next
  prompt. No assertions were removed or unrelated research failures suppressed.
- The legacy fixture tests initially navigated to the normal English root after
  the integrated build. They now explicitly use `/writing.html?demo=1`; actual
  acceptance tests use `/writing.html` and real authenticated services.
- A backend CSRF test initially used a nonexistent forced test user; it now uses
  the real parent session cookies with CSRF enforcement.

## Reproduce

Follow the isolated database/startup instructions in [README.md](README.md), then
from `frontend`:

```sh
npm test
npm run typecheck
CHROMIUM_PATH=/usr/bin/chromium E2E_URL=http://127.0.0.1:4674 node --test e2e/writing-integration.test.mjs e2e/writing-recognition.test.mjs e2e/writing.test.mjs e2e/writing-components.test.mjs
```

From `backend`: `.venv/bin/python manage.py test`.
Use Node 22.18.0 or 24 to repeat the frontend/browser commands. The GitHub Actions
matrix prepares Python, the model/runtime assets, an ephemeral Django database and
both services. It does not deploy or use paid services. No accuracy benchmark,
educator review or real-child effectiveness study was performed.
