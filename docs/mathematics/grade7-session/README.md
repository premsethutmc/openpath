# Grade 7 diagnostic → session plan

Based on `feat/grade7-dashboard-entry-v1` at `85d4844`.

## Learner flow

Sign in at `/year/`, use the existing profile to select Grade 7 and CBSE or Tamil Nadu, then **Open Mathematics topics**. Selecting an available chapter starts its existing starting-competency diagnostic. **View topic details** retains access to curriculum coverage. The results offer 15, 30 or 60 minutes and show a saved plan, objectives and current understanding. **Resume topic session** on My Learning Year reopens it.

This task stops at planning: it does not start teaching or notebook exercises. Unavailable content remains unavailable. A short diagnostic checks one starting competency and implicated supporting skills, not every competency in the chapter. Review labels come from the existing review registry; no content has been approved by this change.

## Integration and persistence

`topic-session.ts` adapts the existing `diagnose`, `recovery`/investigation and `nextActivity` functions. Questions, misconception hypotheses and supporting skills come from existing modules and graph relationships. A wrong answer alone does not establish a prerequisite gap. Already answered items are not reused as fresh independent evidence; insufficient fresh evidence remains explicit. Existing verified starting points are preserved.

For a time budget, the adapter repeatedly asks the existing planner within the selected chapter; an existing recovery recommendation may prioritize a supporting competency. Filtering only a local presentation scope avoids duplicate recommendations without fabricating successful attempts. There is no new ranking, diagnostic, estimator or mastery policy.

The repository has no calibrated module-duration model. Each recommended focus block therefore has an explicitly provisional 15-minute allowance; unused budget remains unallocated. This is not a promise to finish a module, nor time to mastery. The saved duration and current evidence reconstruct the recommendations on resume; this is not a fixed instructional program.

Authenticated `topic_session` metadata uses the canonical mathematics ledger and learner identity, bound to the current Grade 7 enrolment, academic year and curriculum ID/version/hash. It records diagnostic start or duration selection, not proficiency. Checked answers use existing attempt records, including investigation context. Historical events and goals are unchanged. The backend rejects invalid stages, durations, ownership, enrolment or curriculum references. No database migration is required.

An unfinished typed answer is kept in this browser tab's session storage, scoped by learner, year, curriculum hash and competency. Checked answers and selected duration persist on the server and resume across sessions/devices. Session-storage unavailability never blocks server submission.

## Verification

Synthetic accounts and isolated SQLite only; no production data, deployments or paid calls.

- Full Django suite: **243 passed** (`manage.py test --noinput`, isolated integration settings).
- Focused frontend/shared-engine suites: **36 passed** (`topic-session`, `grade7-board`, `engine`, `dashboard`). Includes verified mastery preservation using the existing test-only review fixture.
- All three TypeScript projects: passed (`npm run typecheck`).
- Normal year and curriculum builds: passed (`node scripts/build-year.mjs`, `node scripts/build-curriculum.mjs`).
- Existing curriculum dashboard acceptance journeys A–N: **6 grouped tests passed**.
- New real-Django mobile journeys: **4 passed**, CBSE and Tamil Nadu at 360px and 393px. Exercise existing misconception predictions, supporting diagnostic, draft reload, checked evidence, all duration options, saved-plan resume, unchanged year/board/goals and no mastery grant. These use normal provisional content, not a review fixture.

Run the new browser suite against an isolated Django-backed frontend:

```sh
YEAR_URL=http://127.0.0.1:4300 CHROMIUM_PATH=/usr/bin/chromium \
  node --import tsx --test e2e/grade7-session.test.mjs
```

The existing My Learning Year workflow now runs this suite and uploads its screenshots. Test execution uses browser emulation, not physical Android hardware.

## Screenshots

Actual browser captures in this directory, for each `360/393` × `cbse/tn`:

- `*-diagnostic.png`: existing diagnostic question.
- `*-resumed.png`: interrupted typed answer restored.
- `*-results-durations.png`: results, supporting skill and duration choices.
- `*-plan-15.png`, `*-plan-30.png`, `*-plan-60.png`: saved plans.

Representative: [CBSE diagnostic](360-cbse-diagnostic.png), [Tamil Nadu results](393-tn-results-durations.png), [CBSE plan](393-cbse-plan-30.png).
