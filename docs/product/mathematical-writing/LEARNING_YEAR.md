# Handwriting inside My Learning Year

The student route is `/year/?learner=<canonical-pupil-uuid>`. OpenPath Home now links to **My Learning Year** for signed-in account learners (the reviewed English pilot is unchanged). Select **Mathematics → a chapter or skill → Learn and work it out**. The writing lesson stays inside the year application: concept → worked example → working → step feedback / follow-ups → short teaching → original working → completion → curriculum.

## Existing code and integration base

This branch combines the existing My Learning Year content-system snapshot `8aff2739070cbba128ca76e8b232e6cff264b42b` with the two existing writing commits (`d868060…`, `8341cc9…`) by cherry-picking them onto an independent feature branch. Neither source branch was modified or merged. The proposed PR targets `feat/my-learning-year-content-system`, where the curriculum/navigation already exists. This is not an independent reimplementation of that application.

No edits to `packages/learning`, the estimator, competency graph, curriculum mappings, verification policy or English core are part of this integration. Their implementations are the existing content-system baseline. The additive migration `0004_join_content_and_writing` joins the two existing migration leaves without changing records.

## Implemented lessons

| Existing competency | Practice | Input and validation |
| --- | --- | --- |
| `MATH.number.long-division` | 379 ÷ 3 = 126 remainder 1 | Separated handwritten digits or typed steps. Existing Django division validator checks quotient placement, every multiplication/subtraction/bring-down and remainder, stopping at the first invalid step. Arbitrary bounded operands remain supported by the same service. |
| `MATH.number.equivalent-fractions` | An equivalent fraction for 1/2 | Same worksheet; fractions use structured typed entry because unrestricted expression recognition is unsupported. Existing exact Python `Fraction` validation; numerator/denominator follow-ups. |
| `MATH.number.multiplication-tables` | Four equal groups of six | Same workspace and local recognition. Answers come from the existing `learning_families.generated("gen:mul:a,b")` validator; all 144 supported pairs are checked in tests. Group-size and equal-group follow-ups guide teaching without diagnosing certainty. |

All three lessons are provisional. The concept pictures include equal fraction strips and grouped objects. The fixed server lesson and draft are reused on resume; an answer does not regenerate the lesson. Other skills retain their existing My Learning Year modules.

## Responsibilities and persistence

- `frontend/src/writing/Lesson.tsx` contains the existing account-backed journey once. Both My Learning Year and the retained legacy `/writing.html` host mount it; the curriculum never navigates to that legacy host or `?demo=1`.
- `WritingWorkspace` remains the controlled `openpath-math-input@1` input component. Local ONNX inference and manual confirmation preserve ink, spatial regions and correction history. The same component handles the three topics.
- `year/Main.tsx` supplies the canonical pupil, objective, problem parameters and return callback. The URL preserves the unfinished writing objective and curriculum return path across reloads.
- Django `WritingDraft` holds the versioned working and lesson stage. `GET /api/pupils/<id>/writing/` returns owner-only draft summaries. The year view reads these, rather than treating an old success receipt as completion after an edit. Saving an edited completed worksheet reopens it until checked again.
- Writing receipts remain server-authored `math_writing` records in the pupil's existing mathematics `PupilEvent` stream. The year repository refreshes its stream sequence before returning to ordinary learning-record appends. No second identity, estimator or permanent evidence ledger is introduced.
- The canonical writing evidence adapter keeps provisional content held. My Learning Year's existing profile ignores these provisional receipts for verified understanding; its skill tiles never turn green from worksheet completion. The dashboard separately reports saved practice as **in progress** or **practice complete**.
- A mistaken transcription can be disputed without alleging a mathematical misconception. Mathematical errors open the existing provisional follow-ups and teaching; working remains visible and is restored for correction. Helped/repeated attempts remain assisted/ineligible.
- Browser scroll animation is disabled while a writing lesson is mounted, preventing the paper from moving under pointer capture. Zoom, pan, pen/touch lock, undo/redo and erasing are retained. Number/maths keyboard and advanced paper controls expand when needed.

## Run the complete application privately

Use a synthetic database, not a production database. From the repository root, create an isolated settings file outside the checkout:

```bash
python3 -m venv backend/.venv
backend/.venv/bin/pip install -r backend/requirements.txt
cat > /tmp/openpath_writing_preview.py <<'PY'
from config.settings import *
DATABASES = {'default': {'ENGINE': 'django.db.backends.sqlite3', 'NAME': '/tmp/openpath-writing-preview.sqlite3'}}
PY
cd backend
PYTHONPATH=/tmp DJANGO_SETTINGS_MODULE=openpath_writing_preview .venv/bin/python manage.py migrate --noinput
PYTHONPATH=/tmp DJANGO_SETTINGS_MODULE=openpath_writing_preview .venv/bin/python manage.py runserver 127.0.0.1:8680 --nothreading
```

In another terminal:

```bash
cd frontend
npm ci
node scripts/build-mathematics-journey.mjs
DIST=dist-english PORT=4680 API_TARGET=http://127.0.0.1:8680 node scripts/preview-english.mjs
```

Open the local frontend's root in the browser. Register a **synthetic parent**, add a synthetic learner through the normal UI, then open **My Learning Year**. For the three acceptance lessons, choose Grade 4, the clearly identified sample Mathematics textbook, and Start Grade 4. Open Mathematics; select a chapter/skill or one of its writing lessons. Existing owner accounts can sign in instead, but do not use real learner data for review.

Build before starting browser tests. The static builder replaces its output directory; do not rebuild underneath a running test. Never use `build-year.mjs --test` for this preview: it explicitly enables an educator-review fixture. The normal integrated build uses no such fixture.

For owner-only phone access from Codespaces, bind the frontend to its supported `HOST=0.0.0.0`, forward only its frontend port and keep port visibility **Private**. Open the Codespaces-provided HTTPS URL on Android while authenticated as the owner; the `/api` proxy keeps Django on loopback. No public tunnel, deployment or Codespaces URL has been created by this task. This cloud runner has no externally accessible preview URL.

## Verification and screenshots

`frontend/e2e/writing-year.test.mjs` exercises actual UI sign-in and learner creation, curriculum setup/navigation, concept and worked example, typed division, first-invalid-step detection, targeted follow-ups/teaching, correction, save/reload, completion, unchanged verified count, separate fraction/multiplication work, real ONNX ink recognition and one-digit clarification, and blocked-model typed fallback. These use the actual Django API, not routed API fixtures. Viewports include Android-sized 412 × 915 and desktop 1280 × 900. Original workspace component tests use explicit mocks only to exercise adapter races; they are not the student-journey evidence.

Run from `frontend` after starting the two servers:

```bash
CHROMIUM_PATH=/usr/bin/chromium E2E_URL=http://127.0.0.1:4680 node --test --test-concurrency=1 e2e/writing-year.test.mjs e2e/writing-integration.test.mjs e2e/writing-recognition.test.mjs e2e/writing.test.mjs e2e/writing-components.test.mjs
npm test
npm run typecheck
```

From `backend`: `.venv/bin/python manage.py test --noinput` and `.venv/bin/python manage.py makemigrations --check --dry-run`. GitHub Actions repeats the integrated build and browser tests with Node 22/24; no hosting or deployment job is added.

Screenshots from real synthetic student sessions are in [screens-v3](screens-v3/): [teaching](screens-v3/division-teaching-mobile.png), [completed division](screens-v3/division-completed-mobile.png), [recognised ink](screens-v3/recognized-ink-mobile.png), [year progress](screens-v3/year-progress-mobile.png), [multiplication](screens-v3/multiplication-desktop.png).

## Limits and handoff

The existing ONNX MNIST digit provider is local and free to execute, with uncalibrated confidence scores. It handles separated digits, not unrestricted expressions, touching digits, proofs or diagrams. Manual entry remains available throughout. Recognition uncertainty is input clarification, never negative mathematics evidence. No physical stylus or actual Android device was available: browser touch/pen tests are simulated. Content needs educator review and real-device usability validation; there are no effectiveness or exam-readiness claims.

The mathematics developer can add more input-enabled objectives to `writing/catalog.ts` using existing competency IDs and server-supported parameters, or mount `WritingLesson` in another existing lesson. New mathematical topics need an existing compatible validator and teaching content; the workspace itself should not change. Do not promote writing receipts to mastery evidence without the existing review, independence, transfer and retention gates. No learner engine changes are required to consume the input contract.

## Executed validation (20 October 2026)

| Check | Node 22.18.0 | Node 24.19.0 |
| --- | --- | --- |
| Frontend `src/**/*.test.ts` (English, Tamil, essay, mathematics, year, writing) | 426 passed | 426 passed |
| Combined writing browser suite, actual Django plus explicit adapter regressions | 23 passed | 23 passed |
| Four frontend TypeScript configurations | Passed | Passed |
| Integrated English / Mathematics / Writing / Year build | Passed | Passed |
| Existing shared-core suite | 314 passed | 312 passed, 2 pre-existing research fingerprint failures |

Django/Python 3.12: **214 passed**, including **17 writing tests**; `makemigrations --check --dry-run`: no changes. The default frontend build also passed on Node 24. These are local execution results, not a claim that remote GitHub Actions has run.

The Node 24 failures are the frozen E1 and E2A research reproduction hash assertions in `packages/english-core/test/e2-research.test.ts:23`. Respectively, actual hashes begin `feb221e6…` / `931a9c11…`, expected `f6632545…` / `94def3e4…`. The same 314-test suite passes on Node 22. No estimator rounding, fingerprint migration, snapshot replacement or test suppression was introduced.

An initial browser run failed when the output directory was rebuilt underneath the preview; subsequent runs built first and kept the served files stable. An unavailable-model test initially failed to block requests served through a service worker; its isolated test context now blocks service workers so Playwright's network-failure injection actually reaches model requests. The normal application retains its existing service worker. Pointer tests found moving paper during inherited smooth scrolling; the writing screen now disables that animation, and real local recognition passes. Earlier failures are not counted as passing runs.

Chapter tiles display writing-practice counts separately from their existing proficiency labels. Final curriculum browser checks also verify that this completion label is visible while verified skills remain zero.
