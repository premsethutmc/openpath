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

## Phase 6 (branch research/dr6-app)

- **Pause and resume in the browser:** a research build option sets a lower limit per sitting: `build-year.mjs --test --deep-recovery --deep-sitting=N`, with N from 1 to 39. The script refuses the option otherwise, and every other build keeps 40. Results with N = 12 and the multiple-gap learner:
  - The recovery paused: "That is enough for one sitting (12 questions and explanations). Nothing is finished yet and nothing is counted as solved. Your place is saved: next time starts with a fresh question on Use algebraic identities, then back up to a fresh problem of the same kind."
  - A reload 30 minutes later stayed paused, and nothing new was recorded.
  - The year-page card said "Paused: your place is saved".
  - After moving the server and browser clocks 3 hours on, the recovery resumed on the same diagnosis path. It paused twice more, then ended on two fresh integrals: "Solved after help", with 5 lessons, 40 screens in total, and a longest saved context of 188 characters.
- **Shipped build:** `Main.tsx` reads the build constant directly, so a shipped bundle reduces the switch to the constant `false` and never reads `?deep` or the saved preference. A node test checks this on a fresh shipped bundle. In the browser, a shipped build opened with `?deep=1&stuck=…` shows the ordinary year page and does not remember the setting. The research view's code is still present in the shipped bundle but cannot be reached.
- **Runner:** `frontend/e2e/run-deep-recovery.sh` builds and runs three sets: main (default research build), pause (`--deep-sitting=12`) and shipped. `START_API=1` also starts Django locally. CI calls the same script.
- **State tests:** 5 more backend tests:
  - the 600-character limit holds even for a well-formed deep context;
  - more than 16 skills on the path is refused;
  - 11 malformed shapes are refused;
  - other records keep their limits (non-deep contexts at most 80, lesson rule at most 40), a recovery ID is refused anywhere except on a lesson, and no record other than an attempt may carry a context;
  - a deep context does not change how an answer is decided;
  - earlier records read back unchanged after deep-recovery records are added.
- **Prerequisite links for review:** `review/PREREQUISITE-LINKS.md` (pending educator review; nothing applied).

## Phase 7 (branch research/dr7-goal): the module path in the browser, and one learning goal

### The module path in the browser (case "module": real Django and Chromium)
- **Setup:** a grade-2 synthetic pupil opens `?skill=MATH.number.place-value-tens&deep=1`. The learner is missing compare-numbers, and every wrong answer is the problem's first modelled bug, written in a shape the server can read.
- **What happens:** two wrong exploratory answers in the module, then deep recovery opens inside the module:
  - slip check;
  - probes on count objects (right), combine quantities (right three times; a choice answer needs confirming) and compare numbers (wrong twice);
  - the compare-numbers lesson, saved with its recovery ID;
  - two fresh place-value problems, both right and never the original;
  - the module continues on its own, all screens now the module's, and ends "Shown on your own, also on new problems".
- **Interruptions:** a reload mid-lesson shows the same deep lesson. A reload mid-question shows the same question. After signing out and back in, reopening the module shows the same question.
- **Switch off** (`?deep=0`): the same learner sees the shipped recovery heading ("A problem you are stuck on" or similar), and nothing is saved with a `deep:` context.
- **What the learner sees, in order:**
  1. "A short check to find the right starting point."
  2. "ONE MORE OF THE SAME KIND": "One more of the same kind, to see whether that was a slip."
  3. "FINDING WHAT THIS PROBLEM NEEDS: COMPARE AND ORDER NUMBERS": "Compose tens and ones builds on Compare and order numbers. A quick question on it first." Then "One more question on Compare and order numbers: one answer is not enough to tell a slip from a gap."
  4. "LEARNING COMPARE AND ORDER NUMBERS": "Compare and order numbers: 0 right and 2 wrong on it in this recovery, and what it builds on was right. …"
  5. "BACK TO A FRESH PROBLEM OF THE SAME KIND": "Back to a fresh problem of the same kind." Then "Right. One more fresh one of the same kind, to be sure."
  6. Back in the module: "Shown on your own. More practice is optional." … and finally "Shown on your own, also on new problems … Your delayed check opens …".

### One learning goal: target `MATH.calculus.integration-methods`
- **Why this goal:** its route is just two steps, indefinite-integrals then integration-methods. The integration step's own problems (definite substitution, e.g. `gen:subst:2,3,2,3`) rest on exponent laws and multiplication facts, which the route never contains. The shipped two-level recovery cannot reach them; deep recovery can, and then brings the learner back to a fresh problem of that same step.
- **The adapter** `frontend/src/learning/deep-goal.ts` wraps the goal's own module decision (`learnerState().module`, i.e. foundation-runtime `pathwayModule`). It is used only with the research switch on, only for the one goal in the allow-list, and only on a step of that goal's route. Within that, it changes only what happens where the goal's own decision is "recover":
  - a deep episode still running or paused keeps the step on it;
  - an episode that ended solved lets the goal carry on (`pathwayModule` with `withinRecovery`);
  - a stopped episode pauses the step.
  Every other decision is the goal's own.
- **Wiring:** `Main.tsx` wraps `ctx.module` when the switch is on. `Learn.tsx` shows the deep view inside a goal only for this wrapper's "recover"; every other goal keeps the shipped recovery. This is a one-line hunk in worker C's block.
- **Node tests** (`frontend/src/journey/deep-recovery-goal.test.ts`, 7, using the driver `deep-goal-driver.ts`):
  - Single gap (exponents) and two gaps (multiplication facts, then exponents): the steps follow the goal's own order, deep lessons are taught bottom-up below the route, two fresh unaided integration problems follow, and the goal ends by its own rule: "The current evidence requirements on this route are shown…".
  - A reload after every action gives the same trace. A reload mid-recovery shows the same screen.
  - Switch off: the shipped decision, unchanged.
  - An untouched goal (target place-value-tens): with the switch on, every decision is identical to switch off.
  - No goal at all: the decision is unchanged.
- **Browser** (case "goal"):
  - The learner chooses the goal on the year page (`?foundation=1`, "Use this learning goal").
  - The year page's Next card leads to "Find antiderivatives" (two right answers), then to "Integrate by substitution and parts" (two wrong answers).
  - Deep recovery runs: probe on variables, then exponents wrong twice, multiplication facts right, exponents lesson, exponents right, two fresh integration problems right.
  - Reload mid-recovery: the view is not kept in the URL, so the year page comes back; its Next card reopens the same deep question.
  - The Next card ends "The current evidence requirements on this route are shown. … Choose a further supported goal when you are ready."
  - An untouched goal (place-value-tens) with `?deep=1` shows the shipped recovery and saves no `deep:` context.

### Found along the way and left unchanged
- **Help versus own evidence:** after a deep episode ends "solved after help", the evidence engine counts the fresh return answers as the learner's own work. They were unaided and on fresh problems, but the lessons came just before them. In both the module and the goal, the step then shows "Shown on your own". This needs an evidence-policy decision (deep recovery's wording says it "counts as help"); I did not change it.
- **Year page:** the "Continue where you left off" card reads the plain records, not the goal's records. In a goal, the learner resumes through the goal's Next card instead (tested).

## Phase 8 (branch research/dr8-evidence): evidence after help

The owner's decision: keep both facts. A fresh problem answered right without hints, straight after a deep episode's help, was solved on the learner's own, but the skill was shown after help.

- **New wrapper** `frontend/src/learning/deep-evidence.ts`. It reads the engine's evidence and never changes it. `afterHelpOf(skill, records, evidence, now)` works from the saved records only and returns:
  - the solved-after-help episode;
  - the help: the lessons carrying the episode's recovery ID, or attributed by adjacency on older records;
  - the unaided answers: independent right answers on the skill after the last lesson, in that sitting;
  - later checks: independent answers in a later sitting, on a problem key the episode never used, both right and wrong ones kept.

  It does not apply when the skill was already shown before the episode began.
- **Labels**, only when the engine status is independent, transfer or verified:
  - "Solved independently after help", replacing "Shown on your own", its transfer wording and "Verified";
  - after a later right check: "Solved independently after help; checked again later on your own". It is never "Verified" and never called mastery;
  - after a later wrong check: the immediate success stays in the record and the note says "A later check on your own … was not right; the earlier success is still recorded".
  The engine's other statuses are shown unchanged, with the after-help note beside them.
- **Where, research switch on only:**
  - module view (Learn.tsx): the status chip, the end-screen title, and a reason that opens with "Shown on your own";
  - year page (Main.tsx): skill tiles, the tile's status fact, a note under the year totals, and, inside a learning goal, a note naming each route step that was solved after help (the goal step itself uses the module view);
  - D's educator item shows no skill status (only the stop, reason, step and answers), so it needed no change.

  Switch off: the same words as before (tested for every status).
- **Engine change needed:** none. The year totals count the skill under "Shown on your own" because the engine's summary does; the note under them says how many of those were solved after help. A different count would need `yearSummary` to take a status mapper, which I have not done.
- **Tests:** `frontend/src/journey/deep-recovery-evidence.test.ts`, 9 tests:
  - single gap, multi gap, module (place value), goal step (integration methods), and angle-pairs route 1;
  - a later check right, and a check in the same sitting not counting as later;
  - a later check wrong;
  - old records without recovery IDs;
  - a reload giving identical facts, with help and unaided answers recoverable separately from the records alone;
  - switch off unchanged.
- **Browser:** the single-gap and module journeys now check the module chip ("Solved independently after help"), the note ("…straight after help with …"), the year-page note, and the module's end-screen title.
