# OpenPath

An adaptive, lifelong learning platform that builds a picture of what a learner
can actually do, from evidence, rather than tracking grades or syllabus coverage.

This repository holds the first working slice: one playable mathematics activity
for a child of about six, and the subject-independent machinery behind it
(evidence store, assessment engine, learner profile, progression).

## What is here

**The activity: Mom goes shopping.** Mom's list shows a numeral. At the fruit
shop the child drags fruit into a basket one at a time and decides when to go
home. Three short trips make one visit:

| Trip | The list shows | What it probes |
| --- | --- | --- |
| 1 | the numeral 5 and an apple | numeral reading, one-to-one counting, cardinality |
| 2 | a different numeral, a different fruit, other fruit mixed in | the same skills away from the practised case (transfer) |
| 3 | no numeral: a picture of plates, "one pear for each plate" | quantity without numerals, which separates "can't count" from "can't read the numeral" |

There are no scores and no failure screens. If the basket is wrong, Mom helps in
steps (look at the list again, count together, spots to fill), and the engine
records that the success was supported rather than independent.

**The engine.** Raw events go in; observations per skill come out; a profile is
computed from all observations. A skill is never "secure" after one good visit:
it takes at least three unaided successes, in more than one situation, across
more than one visit, with success still there at least three days after the
first. Details in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Run it

You need Python 3.10+ and Node 22+ (developed on Python 3.13 and Node 22). PostgreSQL is optional for a first look:
with no `DATABASE_URL` the API uses a local SQLite file.

```bash
# 1. API
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver            # http://127.0.0.1:8000

# 2. Web app (second terminal)
cd frontend
npm ci
npm run dev                           # http://localhost:5173
```

Both installs use lockfiles (`backend/requirements.txt`, `frontend/package-lock.json`),
so everyone gets the versions CI tested.

To use PostgreSQL (the intended database):

```bash
docker compose up -d db
export DATABASE_URL=postgres://openpath:openpath@127.0.0.1:5432/openpath
python manage.py migrate && python manage.py runserver
```

`npm run build` writes the production web app to `frontend/dist/`; serve it from
any static host with `/api` routed to Django. `npm run preview` does exactly that
locally on http://localhost:4173, to check the built app rather than the dev build.

**No backend at all:** `npm run build:standalone` writes
`frontend/dist/openpath-standalone.html`, a single file that keeps all evidence
in the browser and assesses it on the device. Open it by double-clicking.

## Review it

1. Open the app. The first screen is for a grown-up: tick the consent box and
   start. The nickname is optional and never leaves the device.
2. Play the three trips. Try both ways:
   - count correctly, or take one too many and put it back before pressing
     **Go home** (an unprompted fix still counts as independent);
   - press **Go home** with the wrong amount, more than once, to see the help
     steps.
3. Open **For grown-ups** (top right). It shows what happened on each trip, how
   each skill's reading moved, which mastery criteria are met, the plan for the
   next visit, and the raw event record the readings were derived from.
4. Nothing will be "Secure" yet. Press **Skip ahead 3 days**, go back, **Play
   again**, and get the second visit right. Skills move to "Secure", two further
   skills open, and the next visit uses bigger numbers with mixed fruit.
5. Play a visit badly instead and the next plan drops to small numbers on an
   uncluttered shelf.

The skip-ahead control shifts this device's clock. The server only believes
client dates when `OPENPATH_TRUST_CLIENT_CLOCK` is on (the default in debug,
off otherwise).

## Tests

```bash
cd backend  && python manage.py test        # 70 tests: rules, mastery, progression, API, privacy
cd frontend && npm test                     # on-device engine vs the Python reference (golden cases)
cd frontend && npm run typecheck
cd frontend && npm run e2e                  # a real browser plays the game; needs both servers running
```

`npm run e2e` needs a Chromium for Playwright (`npx playwright install chromium`).
It plays a full visit with the mouse, a struggling visit with touch at phone
size, and a round with the keyboard alone. Point it elsewhere with `E2E_URL`,
for example `E2E_URL=http://localhost:4173` for the production preview.

### Continuous integration

`.github/workflows/ci.yml` runs on every pull request and on pushes to `main`:

| Job | What it checks |
| --- | --- |
| Backend tests | Clean install from `requirements.txt` on Python 3.10, 3.12 and 3.13; Django checks; migrations in sync; all tests on PostgreSQL 16 and again on SQLite |
| Frontend | `npm ci`; typecheck; engine parity tests; production build; standalone build |
| Browser end-to-end | Builds the app, starts Django (debug off) on PostgreSQL, serves the production build, and plays the game in Chromium. Screenshots are kept as a build artifact. |

### Updating dependencies

Direct dependencies live in `backend/requirements.in` and `frontend/package.json`.
After changing either, regenerate the lockfile and commit it:

```bash
cd backend  && uv pip compile requirements.in --universal --python-version 3.10 -o requirements.txt
cd frontend && npm install --package-lock-only
```

If you change an assessment rule, change it in `backend/assessment/`, port it to
`frontend/src/core/engine/`, then run `python -m assessment.export_golden`. Both
test suites fail until the two engines agree again.

## Layout

```
shared/curriculum/   skill graph + mastery policy (JSON, read by both engines)
shared/golden/       scripted learners and the expected results for each
backend/assessment/  the assessment engine: pure Python, no Django
backend/learners/    pseudonymous learners, consent, token auth
backend/evidence/    sessions, raw events, observations, skill states, API
frontend/src/core/   recorder, stores (server / device), on-device engine
frontend/src/activities/apple-shopping/   the game
frontend/src/profile/                     the grown-ups' view
```

## API

All learner routes need `Authorization: Bearer <access token>` and only accept
the token belonging to that learner.

| Method and path | Purpose |
| --- | --- |
| `POST /api/learners/` | Enrol. Requires consent. Returns the learner ID and the access token (shown once). |
| `GET /api/learners/{id}/` | Profile and the plan for the next visit. |
| `PUT /api/learners/{id}/sessions/{session-uuid}/` | Store or replace one visit's events; returns observations and the updated profile. Idempotent. |
| `GET /api/learners/{id}/export/` | Everything held about the learner, as JSON. |
| `DELETE /api/learners/{id}/` | Erase the learner and all their evidence. |

## Known limits of this prototype

- One activity, one subject. Two further skills are in the graph and open on
  evidence, but have no activity yet.
- The mastery thresholds (3 successes, 2 visits, 3 days, 80% recent accuracy)
  are reasoned defaults, not calibrated against real children. They live in
  `shared/curriculum/` so they can be tuned without code changes.
- Spoken prompts use the browser's built-in voice, in English only.
- Authentication is one random token per learner, held on the family's device.
  There are no parent or school accounts, and no verified parental consent flow.
- No offline queue beyond "retry unsent visits next time"; no mobile app yet.
