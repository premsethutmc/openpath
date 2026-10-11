# Architecture and plan

## The one idea

Every judgement about a learner must be re-derivable from stored raw evidence
by rules a person can read. So the system is a pipeline of pure steps, and each
step's output is kept separately from the one before:

```
 game (any subject)           assessment engine (pure functions)
 ------------------           ----------------------------------
 records what happened  -->   evaluate_session   events        -> observations
 as plain events              compute_skill_state observations -> status + criteria
                              build_profile       all skills + prerequisite graph
                              plan_next_session   profile      -> next visit
```

- **Events** are actions (`item_added`, `check_requested`), never verdicts. The
  game does not know what "correct" means for assessment purposes.
- **Observations** say what one round showed about one skill:
  `independent`, `supported` or `not_yet`, with the rule that produced it.
- **Skill states** are a reading of all observations for a skill. They describe
  the evidence, not the child.

Observations and skill states are derived data. `manage.py reassess` deletes
and rebuilds them from events, so rules can improve without losing history.

## Built for a six-year-old

The child's side has no sign-up, no forms and nothing that must be read.

- The app opens in the game. A device-only learner record is created silently.
- Mom speaks every line, and each line is a handful of words.
- Buttons are pictures (a shop, a house, an arrow) inside the scene.
- On the first trip a hand drags one fruit to the basket, on a loop, until the
  child tries it. It shows the mechanic, never the amount.
- A fruit moves by dragging or by tapping, and the event records which.
- The first visits have one kind of fruit per trip. Other fruit is mixed in
  only once counting looks secure.

Everything for adults (the profile, consent, export, erase, the reviewer
clock) is behind one small "Grown-ups" button.

## What makes the assessment trustworthy

| Concern | How it is handled |
| --- | --- |
| The game could do the counting for the child | No running count on screen. Mom never says the target number before a hint. "Go home" is always available, so stopping at N is the child's decision. |
| A lucky or memorised success | One success is one observation. Mastery needs at least 3 unaided successes in at least 2 different situations. |
| Help mistaken for understanding | Any success after a wrong check is `supported` and never counts towards mastery. |
| Understanding that does not last | Mastery needs unaided success in at least 2 visits at least 3 days apart. Until then the status is "looking secure, checking again later". After mastery, review intervals double (6, 12, 24 ... up to 60 days). |
| "Can't count" confused with "can't read numerals" | Trip 3 has no numeral. A missed numeral round counts against numeral reading only if the same visit shows the child can build a set without one. Otherwise nothing is recorded for that skill. |
| A tampered or buggy client | The engine replays the events and rebuilds the basket itself. If a check does not match the replay, the visit is stored but never assessed. In production the server dates visits itself, so a client cannot fake the retention gap. |
| Labels on children | Statuses are about skills. There is no overall score, level, rank, age or grade anywhere in the model. |

The rules for the fruit-shop task are in `backend/assessment/rules/produce_set.py`,
with the reasoning in the module docstring. `backend/assessment/scenarios.py`
holds scripted learners (takes everything, self-corrects, misses numerals only,
and so on) used by the tests.

## Progression without age or grade

`shared/curriculum/math-early-number.json` defines skills and prerequisites. A
skill is *ready* when its prerequisites look secure, regardless of who the
learner is. The next visit is planned from the profile:

- counting out a set is still new -> small numbers (2-4), uncluttered shelf;
- still gathering evidence -> numbers up to 7, one kind of fruit per trip;
- looks secure -> numbers 6-10, another fruit mixed into every trip.

Plans come from fixed rotation tables, not random numbers, so they are
reproducible and identical on the server and on the device.

## Shared across subjects

Nothing below is specific to mathematics or to this game:

- the event format and `EvidenceRecorder`;
- the `EvidenceStore` interface (server or device);
- learners, sessions, events, observations, skill states;
- mastery, retention and review scheduling;
- the prerequisite graph and profile.

A new activity (science, language) adds: a curriculum JSON with its skills, a
rule module for its task type in `backend/assessment/rules/` (mirrored in
`frontend/src/core/engine/`), and a React component that records events.

## Two engines, one behaviour

The Python engine is the reference. `frontend/src/core/engine/` is a line-for-line
TypeScript port so evidence can be assessed on the family's own device with no
server (and later inside a React Native app, offline). `shared/golden/cases.json`
is generated from the Python engine; the TypeScript tests require identical
output for every case, and a Python test fails if the file is stale. The cost
is that each rule change is made twice; the alternative costs are a server
round-trip for every profile view and no offline mode.

## Privacy

- The server stores a random learner UUID, a hash of the access token, and
  consent records. The `Learner` table has no field that could hold a name,
  birth date, email or free text, and a test asserts that.
- The link between child and learner ID is the *identity record* on the
  family's device (nickname + ID + token). It can be downloaded as a recovery
  file and restored on another device. A school deployment would hold the same
  mapping in the school's own systems.
- Play starts on the device with nothing sent anywhere. The record moves to a
  server only after a grown-up agrees in the grown-ups area; the server refuses
  to create a learner without consent and records who gave it and under which
  policy version. Visits recorded before then are uploaded at that point.
- Export returns everything held; delete erases everything.
- Pseudonymous is not anonymous. A long behavioural record can identify a
  person, so it is access-controlled like personal data.

Not built yet: verified parental consent, parent and school accounts, token
rotation and revocation, encryption of the device-side record, data-retention
limits, audit logging. These need product and legal decisions (see below).

## Technology

| Layer | Choice | Note |
| --- | --- | --- |
| Web | React 19 + TypeScript, SVG scenes, Pointer Events | One input path for mouse, touch and pen. Keyboard works too. |
| Build | esbuild scripts (`npm run dev`, `build`) | Smallest thing that works. The dev server proxies `/api`, so there is no CORS to configure. Swapping in Vite later is contained to `scripts/`. |
| API | Django 5.2 + Django REST Framework | |
| Database | PostgreSQL 16 (SQLite fallback for a zero-setup look) | Events and details are JSON columns. |
| Tests | Django test runner; Node's built-in runner; Playwright for end-to-end | All three run in GitHub Actions on every pull request. |
| Mobile (later) | React Native / Expo | `core/` is plain TypeScript; only `storage.ts`, `sound.ts` and the file download in `recovery.ts` touch browser-only APIs. The game's SVG maps to `react-native-svg`. |

## Next steps

1. Put it in front of a few real six-year-olds. The hint wording, the plates
   picture and the mastery thresholds are the parts most likely to be wrong.
2. A second activity for an open skill (comparing two amounts) to prove the
   shared infrastructure with a different task type.
3. Review sessions: use `review_due` to bring back secure skills on schedule.
4. Parent accounts with a real consent flow; school-held identity mapping.
5. A production deployment, and the Expo app.

## Decisions for the product owner

- **Consent and accounts.** How parental consent is verified, and whether
  families need accounts at all or can stay with device-held identity.
- **Mastery policy.** Whether 3 successes / 2 visits / 3 days is the right bar.
- **Where evidence lives for families.** Device-only is the most private;
  server storage enables multi-device use and recovery.
- **Voice.** Recorded human voice-over and local languages, versus the
  browser's synthetic voice.
