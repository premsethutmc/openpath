# Grade 7 executable study plan (Task 3)

Base: `feat/grade7-diagnostic-session-v1`, `fc21ed8`.

## Run the journey

Use the normal Django-backed frontend at `/year/`. Select Grade 7 and the existing CBSE or Tamil Nadu curriculum, open Mathematics topics, finish the starting diagnostic and select 15, 30 or 60 minutes. **Start or resume study** opens the saved plan's recommendations, one competency at a time.

The existing mini-chapter and worked strategy screens explain the concept. **Try it** records teaching through the existing authenticated ledger, then opens the shared module's next question. The shared engine still decides whether the next question is exploratory, guided, a fresh check or further practice; this UI does not force its phase. **Check** uses the existing deterministic answer checker. Incorrect feedback offers **Try again** and **Give me a hint**, preserving the original answer and any supported line-by-line keyboard working. Help uses the existing question hint/solution and misconception explanations; it does not assert that a single error proves a prerequisite deficit. Repeated and hinted answers retain their existing evidence restrictions.

**Continue** moves to the shared engine's next step. When that module stops, **Next planned competency** visits the next fixed focus block. **Back to study plan** leaves unfinished work resumable. My Learning Year's **Resume topic session** reopens the existing route. There is no separate application, question bank, input engine or mastery model.

## Persistence and boundaries

- Attempts and teaching are append-only canonical learner records in Django. The existing evidence and educator-review gates remain authoritative.
- The browser saves the queue snapshot, current block, lesson-screen index, drafts, working-panel state, feedback and retry/hint state. Keys include learner, academic year, curriculum hash and saved-plan record ID. These are UI state, not learner proficiency or independent evidence. Reload and leaving/returning in the same browser resume them. Another browser can recover ledger-derived learning state, but not these local UI drafts/cursors. Clearing browser storage does not delete server evidence.
- The queue is frozen when the selected plan is started; answering a question does not regenerate it. Focus blocks are marked **visited**, not mastered or curriculum-complete. Remaining work uses Task 2's provisional 15-minute allowances, not elapsed-time analytics.
- The existing native-keyboard answer types and optional checked working are reused. Unsupported drawing/construction tasks remain explicitly unavailable, with a next-planned-competency action and no answer submission. Existing handwritten archives are unchanged.
- Existing review labels remain visible. No provisional content has been approved, generated or expanded.
- This task does not launch delayed reassessment or add analytics. If the shared module calls for a delayed check, this session leaves it for later without submitting it or changing its eligibility.

## Browser verification

`frontend/e2e/grade7-practice.test.mjs` runs actual Django accounts and data, not API mocks or the educator-review fixture. It selects real chapters from each board release and asserts that practice belongs to the selected topic. Cases cover 360px and 393px, lesson/example, teaching-screen reload, answer/working reload, wrong answer, persisted feedback, help, correction, successful retry, next step, fixed queue, My Learning Year resume, appended evidence and absence of verified mastery. No physical Android/stylus testing is claimed.

```sh
cd frontend
YEAR_URL=http://127.0.0.1:4300 CHROMIUM_PATH=/usr/bin/chromium \
  SHOTS=/tmp/grade7-practice node --import tsx --test e2e/grade7-practice.test.mjs
```

The existing GitHub Actions My Learning Year workflow includes this suite and screenshot artifacts. It does not deploy the application.

## Actual results

- Full Django suite: **243 passed**, isolated synthetic SQLite data.
- Focused frontend/shared-engine tests: **36 passed** (topic session, board switch, engine and dashboard).
- Keyboard policy / writing component regressions: **4 passed**; drawing unavailability and archived handwriting compatibility remain covered.
- Task 3 actual-Django mobile journeys: **4 passed**, no browser runtime errors, both boards at both widths, normal provisional-content build.
- Task 2 actual-Django diagnostic/session-planning regression: **4 passed**.
- Existing curriculum dashboard journeys A–N: **6 grouped tests passed**.
- All three TypeScript projects and the normal year/curriculum builds passed.

The initial Tamil Nadu retry run exposed a retained working draft hidden by a closed disclosure after reload. Persisting the disclosure state fixed it; all four complete journeys were rerun successfully. The queue test also requires a persisted, non-empty snapshot before teaching, verifies it remains unchanged after answers and reload, and checks that Continue leaves the completed question. No assertions were weakened and no content review fixtures were used in these learner journeys.

24 actual mobile screenshots accompany this report: `{360,393}-{cbse,tn}-{teaching,worked-example,incorrect,help,corrected,resumed-practice}.png`. Examples: [CBSE teaching](393-cbse-teaching.png), [Tamil Nadu contextual help](360-tn-help.png), [resumed corrected work](393-tn-resumed-practice.png).
