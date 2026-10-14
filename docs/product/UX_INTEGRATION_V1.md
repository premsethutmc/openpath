# Product UX integration V1: architecture notes

Branch `product/ux-integration-v1`, stacked on PR #25 (`english/pilot-evidence-integrity`).

The approved prototype (`openpath_english_interactive_prototype.html`) is now the look and flow of the English app. Every
educational behaviour on those screens comes from the existing engine. Parents can register, sign in, add pupils and
keep each pupil's record on the server.

This PR adds no scoring system, no second learner model and no new subject. The scoring maths, thresholds and frozen
simulation are unchanged: the simulation output is byte-identical. Content stays provisional, and the app says so.

## 1. Prototype against the existing app

The comparison came first. It shows what was reused, what was restyled, and what was missing.

| Prototype screen | Existing app before this PR | What this PR did |
|---|---|---|
| Brand, type, colours, cards, buttons | "Exercise book" style | **Restyled.** `english.css` was rewritten with the prototype's tokens: violet and mint, rounded type, tiles, the chunky primary button, a phone-width shell. It has a dark-mode set and keeps 4.5:1 text contrast |
| Welcome | Welcome with profile creation | **Restyled and split.** Now the prototype hero, then account or device choice |
| Who is learning / goal | Missing | **New.** Recorded as a `preferences` event. The goal orders the Journey only; neither choice changes an estimate, a question or the plan (test UX-3) |
| Check intro | Missing (placement started from Today) | **New screen.** "I'm ready" starts the existing placement session |
| Assessment questions (3 hard-coded) | Placement session (12–24 items from the bank, engine selection) | **Reused.** The prototype's question list is dropped. Questions come from `placementNext` and the engine's `recommend` |
| Answer feedback and "What OpenPath noticed" | Feedback panel | **Restyled. The note is new**, read from the ledger's decision on that answer (`logic/noticed.ts`). It distinguishes independent, after-teaching, help, repeat, a passage already counted, practice word and draft |
| Lesson and practice (hard-coded verbs) | Lesson and guided practice from content pools | **Reused and restyled.** Lessons from `lessons.json`; practice from the practice pool (PR #25 isolation) |
| Completion ("One step brighter") | Done screen | **Restyled.** "Learning, not mastered yet" appears after teaching sessions. The counts are this session's own |
| Home / Today ("next adventure", review corner, stats) | Today (planner activities) | **Restyled.** The first planner activity is the "next adventure". The review corner shows real due later checks and words. The two stats are counts from the record |
| Learning Journey (hard-coded tiles) | Missing | **New** (`logic/path.ts`, `PathView.tsx`). The five pilot skills, each through the four stages, read from the profile. It only offers actions the app can deliver |
| Progress ("Learning", "Early evidence") | Progress with capability cards and the parent overview | **Restyled.** The prototype's "for parents and teachers" panel holds the existing overview |
| Profile ("Me") | Settings | **Restyled and extended.** Learner choices, privacy (true to where the record is kept), speech, a copy of the record, switch or delete the learner, the parent account |
| Bottom navigation | Three tabs | **Four tabs** (Home, Journey, Progress, Me), sticky within the shell |
| Account, sign in, recovery, pupils | Missing | **New** (sections 3 and 4) |

The doubling-letters journey, spelling patterns, backups and the parent overview were kept as they were, and restyled
by the shared CSS. No component was duplicated.

## 2. How each screen connects to the event ledger and the Learner Vector

```
           answers, lessons, hints, sessions (append-only events)
 Screen ─────────────────────────────────────────────▶ Repo ──▶ IndexedDB (this device only)
   ▲                                                   │        or ServerRepo ──▶ /api/pupils/<id>/events/ ──▶ PostgreSQL
   │                                                   ▼
   └── profile, plan, Journey, notes ◀── fold(events) ── Ledger.rebuild (engine) ── composite (Learner Vector)
```

- **One record per pupil.** It is the existing append-only event list:
  - engine `evidence` events with `provenance@1` and the `passage@1` policy;
  - `presented`, `hint`, `assisted_response` and `intervention` events;
  - app events: `profile`, `session`, `attempt`, `lesson`, `settings`, the new `preferences`, and `flag`.
- **The Learner Vector is derived by replay.** It is the composite estimate per capability, with its uncertainty,
  demonstrations and retention, rebuilt from those events by `Ledger.rebuild`. It is never stored instead of the
  events. The server keeps the events verbatim.

| Screen | Reads | Writes |
|---|---|---|
| Check intro → assessment | `placementNext` (engine `recommend`, diagnosis pool) | `session`, `presented`, `evidence`, `attempt` |
| Feedback and "What OpenPath noticed" | `feedbackFor`; the ledger decision for that evidence id | — |
| Home | `learnerProfile().activities` (development planner); `dueWords`; standings `check_due` | `session` when started |
| Lesson and practice | `lessons.json`; `guidedNext` / `spellingPracticeQueue` (practice pool only) | `lesson`, `intervention`, practice `evidence` (marked after teaching by the updater) |
| Fresh and later checks | `checkNext` with the confirmation and retention pools | `evidence` |
| Journey | `learnerProfile()` standings and evidence by kind; lessons read; Today's activities | — |
| Progress | `learner.overview()`: profile, parent overview, engine estimate and certainty | — |
| Me | `state.preferences`, `state.speech` | `preferences`, `settings`; delete via Repo |

**Kept distinct as before:**
- Answers straight after a lesson move the estimate but never make a skill "shown".
- Fresh and later checks use their own pools.
- Reading answers count once per passage.

The tests are PI-1 to PI-8 (PR #25), UX-1 to UX-4 and AC-4.

## 3. Parent accounts and persistence

**Backend.** A new Django app, `family`:

| Part | What it is |
|---|---|
| Parent | `django.contrib.auth` User (email as username) |
| Passwords | Django's hasher (PBKDF2 by default) and validators: at least 10 characters, not common, not numeric, not like the email |
| Sessions | `django.contrib.sessions`: HttpOnly, SameSite=Lax, Secure by default when not in debug |
| CSRF | Django's CSRF, enforced on every change *including* register and sign-in |
| Recovery | Django's reset-token generator, by email. The answer never reveals whether an email has an account. A reset signs out every other session |
| Rate limits | DRF throttles on register, sign-in and reset |
| Nothing home-made | No password handling is written by hand |

**Models:**
- `Pupil`: UUID, owning parent, display name, consent policy.
- `PupilEvent`: pupil, subject, seq, kind, time, the event verbatim. It is unique on (pupil, subject, seq) and
  append-only: `save()` refuses updates.

**API:**

| Endpoint | Purpose |
|---|---|
| `GET /api/account/` | Status and CSRF cookie |
| `POST /api/account/register/`, `login/`, `logout/` | Sign up, sign in, sign out |
| `POST /api/account/password/` | Change password |
| `POST /api/account/password-reset/`, `password-reset/confirm/` | Recovery |
| `POST /api/account/delete/` | Delete the account (needs the password) |
| `GET`, `POST /api/pupils/` | List and add pupils |
| `GET`, `PATCH`, `DELETE /api/pupils/<id>/` | One pupil |
| `GET`, `POST`, `PUT /api/pupils/<id>/events/` | Read, append, import |
| `GET /api/pupils/<id>/export/` | Export the whole record |

**Ledger rules:**
- An append names its position (`seq`). A stale position is refused with 409, so two devices cannot interleave events;
  the app asks to reopen the learner.
- `PUT` imports a device backup into an empty pupil only. History is never overwritten.

**Authorisation.** Every pupil lookup is filtered by the signed-in parent, so another parent's pupil answers 404,
exactly as if it did not exist. Signed-out requests get 403. This is tested in the backend
(`family/tests.py`, IsolationTests) and in the browser (`e2e/accounts.test.mjs`).

**Deletion:**
- Deleting a pupil removes their whole record.
- Deleting the account needs the password and removes the parent, every pupil and every event (cascade).

**Frontend:**
- `logic/account.ts` has the `Api` (same-origin fetch, CSRF header) and `ServerRepo`. `ServerRepo` implements the
  same `Repo` interface as the device's IndexedDB store, so `Learner`, the engine and every screen are unchanged.
- Without an account server, for example the static build, the app runs device-only exactly as before.
- The service worker never caches `/api/`.
- The preview server forwards `/api/` to Django with `API_TARGET`, keeping one origin (first-party cookie, CSRF origin
  check).

**PostgreSQL.** It was already the deployment database (`DATABASE_URL`). Tests run on both PostgreSQL 16 and SQLite,
as CI does.

## 4. Extension points

**Word difficulty** (`packages/english-core/src/word-features.ts`):
- `WordDifficultyVector`, a versioned `WordFeatureSource`, `NO_WORD_FEATURES` (the default: knows no word), and
  `wordOf(item)`, which joins any past evidence to its word by item id and version.
- Nothing uses it yet. Selection, scoring and the plan are unchanged (test X1).
- The documented plug-in point is `SelectionInput` in `selection.ts`. No calibration, population model or second engine
  was added.

**Mathematics later:**
- `PupilEvent.subject` keeps one ordered ledger per subject for the same pupil. `mathematics` is reserved and refused
  until an engine exists.
- The pupil identity, accounts and authorisation are subject-neutral.

## 5. What remains provisional, and is labelled

- **Content.** Every question, lesson and passage is draft, awaiting educator review (PR #25 report). The welcome
  screen, the Journey, Progress and Me all say so.
- **Development rules.** They remain `development-policy@0-draft`.
- **Learner choices.** "Who is learning" and the goal are recorded choices. They do not adapt wording or content yet;
  the screen says that the answers decide the difficulty.

## 6. Running it

```
# API (PostgreSQL or, without DATABASE_URL, SQLite)
cd backend && python manage.py migrate && python manage.py runserver 127.0.0.1:8000
# App with accounts, on one origin
cd frontend && npm run english:build && PORT=4175 API_TARGET=http://127.0.0.1:8000 npm run english:preview
# Device-only (no accounts)
npm run english:preview        # http://127.0.0.1:4174
```

Over plain http on localhost with `DJANGO_DEBUG=0`, also set `OPENPATH_SECURE_COOKIES=0`. That is for local testing
only. The settings needed for a real deployment are in PRODUCTION_BLOCKERS.md.
