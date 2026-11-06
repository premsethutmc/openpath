# deep-recovery@0: real-app feasibility (research, not for merge)

Branch `research/deep-recovery-app`, based on `research/deep-recovery-61edf730` (311f9d31). Off by default. Synthetic pupils only.
A synthetic success shows what the program does. It is not evidence that anyone learned.

## Current path (line numbers at 311f9d31)

| Step | Where |
|---|---|
| A wrong answer opens recovery | `year/CurriculumPractice.tsx:78` "Find out what went wrong" → `onStuck` → `year/Main.tsx:302` view `stuck`; year page "Stuck on a problem?" `Main.tsx:515,519`; inside a module, `intervention.ts:524` `moduleState` → phase `recover` → `Learn.tsx:353` embeds `Recovery` |
| The recovery decision | `Learn.tsx:404` `recovery(original, …)` (the shipped two-level recovery); the harness copies are `journey/flow.ts:131` and `learning/adaptive-loop.ts:146` (node and harness only, not the app) |
| Saving | `Main.tsx:175` `save` → `Repo.append` (`Main.tsx:62`) → `POST /api/pupils/<id>/events/ {subject, seq, event}`; a failed POST reloads and checks whether the event id arrived anyway; errors go to the banner as "Not saved: …" and `save` returns false |
| Records | `attempt` (questionId, response, activity, hints, context ≤ 80 characters) and `teach` (rule, strategy, competency) records; server checks in `backend/family/learning.py:checked_learning` (`RECORDS`, line 34 before this change) |
| Reload, sign-out, resume | `Main.tsx:151` `GET /api/pupils/<id>/events/` → `learnerState` (`Main.tsx:157`). The session id is `learn:<learner>:<uid per page load>` (`Main.tsx:112`). The view lives in memory only, so a reload opens the year page and the recovery is not reopened. Typed drafts and lesson screens are kept per browser (`year/resume.ts`). |

## What the flag changes (default off)

- `frontend/src/year/deep-recovery-flag.ts`: the flag is on only when the bundle was built with `build-year.mjs --test --deep-recovery`. The script refuses `--deep-recovery` without `--test`, and every other build defines the flag as `false`. The page must also be opened with `?deep=1` (remembered in the browser until `?deep=0`). A production bundle cannot turn it on.
- `frontend/src/learning/deep-recovery-app.ts` (new adapter): `deepScreen(original, records, evidence, now)` calls `deepRecovery` unchanged (phase-4 options: selective, reuse, 40 per sitting, 120 per episode, evidence valid for 7 days). It returns one screen: ask, lesson or end. Sittings: attempts and lessons are grouped by time, and a new sitting starts after 2 hours with no activity. The engine gets the sitting id instead of the per-page-load session id, so a reload or sign-out does not reset the pause. `openDeepRecoveries` lists recoveries that are still running or paused, from attempt contexts alone.
- `frontend/src/year/DeepRecovery.tsx` (new view). The `stuck` view uses it instead of `Recovery` when the flag is on (`Main.tsx`). The year page shows "Continue where you left off" for open recoveries. `?stuck=<question>` opens a recovery, in research builds only.
- `Ctx.teach` takes an optional `{episode}`. Lessons from a deep recovery are saved with `episode = deep:<original>#<time of the original's first saved answer>`.
- The module's embedded recovery (`Learn.tsx:353`) is left unchanged (see "Not done").

## Backend (`backend/family/learning.py`)

- `teach.episode` is optional. When present it must match `deep:<question>#<server time>`, and an attempt on that question at exactly that time must exist. Otherwise the record is refused with "Unknown recovery for this lesson."
- Attempt `context`: only the exact shape `deep:<original>|<skill>(>…){0,15}@<skill>` may be up to 600 characters. Every other context keeps the 80-character limit. Real deep contexts are about 100–200 characters, so the old limit refused them: this was a blocker that had not been reported before.
- Old records validate and read back unchanged (tests). The old frontend's `readRecords` copies only the fields it knows, so it ignores `episode`.

## What the learner sees

| Case | Screens and texts |
|---|---|
| Every deep screen | "Research prototype (test build): deep recovery. Synthetic testing only." The skill name, then "Checking: A › B › …" (the diagnosis path) |
| Questions | Eyebrow: "One more of the same kind" / "Finding what this problem needs: <skill>" / "Practising <skill>" / "Back to a fresh problem of the same kind", followed by the engine's reason, e.g. "A fresh question on <skill>, to see where things stand now." |
| Lesson | "Learning <skill>", the reason, and the review label unchanged ("Demonstration: this explanation has not been approved by an educator." / pending review) |
| Single gap (browser) | 11 screens: slip check → probe → partial-fractions lesson → two fresh integrals → **"Solved after help"**: "Right on a fresh question of the same kind after the work on what it builds on. That counts as help, not as work on your own the first time." |
| Multiple gaps (browser) | 40 screens. Five lessons, bottom-up (identities, factorisation, linear-two-variables, linear-systems, partial-fractions), then two fresh integrals → "Solved after help" |
| Pause (node only) | **"Paused: your place is saved"**: "That is enough for one sitting (… questions and explanations). Nothing is finished yet and nothing is counted as solved. … Your place is saved: next time starts with …" |
| Unavailable content | **"OpenPath cannot teach this step yet"**: "The answers point to Order signed integers (0 right and 2 wrong …). OpenPath cannot teach it yet: none of its explanations has passed the teaching checks and content review. That is a gap in OpenPath's content, not in you. Go through … with a teacher or parent …" plus the hand-off note below. Nothing is taught. |
| No fresh question | **"Ask a teacher or parent about this one"**: "There is no fresh question that OpenPath can show tests the same skill as this one (it has no skill mapping), and it will not substitute a different one. …" plus the hand-off note |
| Hand-off note (blocked or escalate) | "Nothing here is counted as solved. Your answers so far are saved in your record, where a teacher or parent can go through them with you. OpenPath has not sent this to anyone." |
| Failed save | The same question stays, with the typed answer still in the box and no right/wrong shown. The banner reads "Not saved: OpenPath's server could not be reached. Check the connection and try again.. Check your connection and try again." (this doubled wording already exists in `Main.tsx`). Pressing Check again saves the answer once. |
| Reload or sign-out | Mid-question: the same question. Mid-lesson: the same lesson. After signing in again, the year page shows "Continue where you left off", and the card opens the same step. |

## Tests

- `frontend/src/journey/deep-recovery-app.test.ts`, 10 tests: the flag (and the build-script refusal), single gap, multiple gaps, multiple gaps with a short sitting (pause, a reload inside the sitting stays paused, the next sitting resumes the same path and finishes), reload mid-question and mid-lesson, a failed save, unavailable content, no fresh question, and old records without ids. Every saved context and recovery id is checked against the backend's patterns.
- `backend/family/test_deep_recovery.py`, 5 tests.
- `frontend/e2e/deep-recovery-app.test.mts`: real Django API with Chromium, 6 cases, added to this branch's `learning-year.yml`.

## Not done, or found along the way

- The module-embedded recovery (`Learn.tsx:353`, triggered by `moduleState` at `intervention.ts:524`) still runs the shipped recovery. Wiring deep recovery there would need `moduleState` to read deep episodes, otherwise the module keeps asking for its own recovery. That change is in `packages/learning`.
- The browser does not exercise the pause: the multiple-gap journey finishes within 40 per sitting, and the UI has no way to set the sitting budget. The pause is tested at node level only.
- Hand-off: no educator is notified, and no hand-over record or acknowledgement is created. The text points the learner to a teacher or parent only.
- Grading parity: the node-side synthetic `wrong()` answer "0" to a tuple question is graded wrong locally, while the server holds it as unreadable (undecided). The e2e uses wrong answers of the right shape. Undecided answers are not attempts, so the engine can ask the same question again (seen in the browser before the fix). This is engine behaviour and was not changed.
- A sitting is defined as "2 hours without activity". This is a product decision that has not been validated.
