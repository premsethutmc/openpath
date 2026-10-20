# Mathematics keyboard-only input

Handwriting is deferred. `frontend/src/writing/features.ts` sets `HANDWRITING_ENABLED = false`. This is a source-controlled product policy, not a visitor/role/query-string preference. There is no learner, parent, educator or institution toggle.

## Behavior

- Progressive long division remains the default division experience: native numeric keyboard, automatic placement/bring-down, multi-digit entries, Backspace/tap corrections, contextual recovery, autosave and resume. Its state machine and arithmetic validation are unchanged.
- Existing fraction and multiplication answer fields remain native keyboard fields. Their optional guided worksheets continue to collect and validate mathematical steps; no method task was changed into final-answer-only assessment.
- The shared `WritingWorkspace` presents its existing typed-step editor without drawing tools, canvas, pen settings, recognition controls or custom keypad. `Surface` independently refuses to mount when the policy is off. Local recognizers are not instantiated by lesson hosts. Old `?demo=1`, role and ink-mode links cannot enable the deferred interface.
- Numeric worksheet regions request the native numeric keyboard. Fractions and supported expressions use ordinary text input so `/`, signs and letters remain accessible. No parser, validator, question generation, curriculum or evidence policy was expanded or changed. Unsupported notation/tasks remain unsupported.
- The approved warm paper/ink notebook visual language and Kalam Light numerals (existing SIL OFL 1.1 asset) are retained. Visible navigation labels say **work and check**. No handwriting-recognition technical guidance appears when the policy is off. The optional parent receipt viewer shows a mathematical summary rather than archived input/recognition metadata.

## Saved data and evidence

No backend schema or migration changed. All strokes, coordinates, timestamps, pressure, tokens, correction history and receipt records remain stored. Keyboard edits use the existing versioned `openpath-math-input@1` contract. A saved uncertain entry can be explicitly confirmed by typing; it is never silently interpreted as correct mathematics. Existing unlinked marks within a supported worksheet region can be linked to an explicitly typed step through the original manual-entry implementation.

Legacy unrestricted work without a supported mathematical step position remains archived and requires teacher review. It is not silently converted into a final answer or graded as a misconception. There is no claim that every historical drawing can be assessed by the keyboard parser.

Canonical evidence, provisional status and assisted-success safeguards remain unchanged. Finishing a worksheet does not establish verified mastery. Library recognition/model code and model assets are retained for compatibility, but are not an available product input path and are not requested by the tested learner flows.

## Browser captures

Actual Chromium mobile-emulation screenshots against Django, using synthetic learners only:

| Screen | 360 px | 393 px |
|---|---|---|
| Working | [Working](working-360.png) | [Working](working-393.png) |
| Mistake and contextual help | [Mistake](mistake-360.png) | [Mistake](mistake-393.png) |
| Completed division | [Completed](completed-360.png) | [Completed](completed-393.png) |
| Guided keyboard worksheet | [Guided](guided-complete-360.png) | [Guided](guided-complete-393.png) |

Additional 360 px screens: [equivalent fractions](fractions-keyboard-android.png), [multiplication](multiplication-keyboard-android.png). Physical Android keyboard/stylus hardware was not available; tests cover emulated Android-sized viewports, touch-style interactions, focus and input events.

## Run

Use the existing private synthetic preview setup described in [the Grade 7 run guide](../grade7-journey/RUN.md). Build normally; no handwriting flag or extra service needs configuring:

```sh
cd frontend
npm run typecheck
npm test
node scripts/build-mathematics-journey.mjs
node scripts/build-tamil.mjs
cp -r dist-tamil dist-english/tamil
```

The ordinary entry remains **My Learning Year → Mathematics → lesson** (`/year/`). Existing authenticated writing-route aliases remain compatible. This branch does not merge, deploy, change the current hosted preview, use paid services or operate on real learner data.

[Continuous keyboard division recording](continuous-keyboard-android.webm) — real browser interaction against Django, emulated Android viewport; no physical-device claim.

## Executed verification — 20 October 2026

- **434 frontend unit tests passed**, including archived stroke/correction preservation and the retained model/contract tests. All four TypeScript configurations passed.
- **246 Django tests passed**. No backend files or migrations changed.
- **21 learner browser tests passed** against the real private Django preview: approved notebook states at 360/393 px, keyboard-constrained focus, six division configurations (84÷4, 379÷3, 125÷5, 1005÷5, 432÷12, 7÷3), continuous entry, zero/bring-down, correction, escalating help, save/resume, optional final-answer parsing, equivalent fractions, multiplication, Grade 7 sessions, and full structured step validation.
- **10 additional browser checks passed**: three controlled-component checks (a supplied recognizer cannot override policy; saved ink survives typed edits; stale mathematical feedback is rejected), three direct/demo/role-URL policy checks preserving browser archives, three actual-Django integration checks, and one isolated retained-recognizer library compatibility test. The latter tests the deferred library, not an enabled product feature.
- **16 private-preview route/security checks passed**. **Four additional one-tap demo-mode learner journeys passed** without credentials.
- **21 focused model/policy tests passed on Node 22.18.0**; the full frontend suite ran on Node 24.19.0. Full multi-entry mathematics/English/Tamil builds passed.
- No physical Android/stylus hardware test, production deployment or remote CI run is claimed. The first video run needed the existing local FFmpeg path. Repeated synthetic registrations reached the unchanged 20/hour limit; the affected full suite passed on a fresh isolated synthetic database. Security limits and existing records were not reset or modified.

Reproduce learner checks against a running synthetic preview (set `CHROMIUM_PATH` for your installed browser, and use your local preview gate password):

```sh
cd frontend
E2E_URL=http://127.0.0.1:4724 PREVIEW_PASSWORD=your-local-preview-password CHROMIUM_PATH=/usr/bin/chromium node --import tsx --test --test-concurrency=1 e2e/writing-year.test.mjs e2e/approved-notebook.test.mjs e2e/one-answer.test.mjs e2e/progressive-division.test.mjs e2e/progressive-resume.test.mjs e2e/workspace-recovery.test.mjs e2e/grade7-journey.test.mjs
```

Playwright video tests also need Playwright's FFmpeg executable. The loopback URL above is for local testing, not an externally accessible preview. No public deployment is needed to inspect this branch.
