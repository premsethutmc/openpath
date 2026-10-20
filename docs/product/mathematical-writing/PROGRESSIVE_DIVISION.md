# Progressive long-division paper v1

Branch: `feat/progressive-long-division-v1`, based on `feat/mathematics-one-answer-v1` at `d12849be876f0b58af6677bfc1825312395c60d1`. No merge, deployment, paid service, real learner data or curriculum/estimator change.

## Student flow

The normal `/year/` mathematics division lesson, including the synthetic demo entry, now opens the traditional division bracket with its first quotient position active. Type numbers directly using the native numeric keyboard. Correct entries open the next position automatically. No Next button, region selector, mandatory intermediate screen or custom keypad.

For `379 ÷ 3`, the continuous input is `1, 3, 0, 2, 6, 1, 6, 18, 1`. The child supplies every quotient digit, product and subtraction result, including zero. After the child supplies a correct subtraction result, the next printed dividend digit is copied beside it: the entered `0` and printed `7` become `07`. This is copying, not calculating a subtraction or product for the child.

Multi-digit numbers stay in one active entry. The existing server validator determines when the whole entry is correct; a partly entered product does not advance. Done/Enter finishes a shorter entry where needed. Incorrect arithmetic stays editable with generic feedback, without an answer reveal or compulsory diagnostic questions. Tap an earlier number to replace it, or use Backspace to remove digits. Backspace from an empty entry returns to the preceding number. Later working is retained when an earlier number changes; completion is invalidated until the working agrees again.

Every displayed digit occupies a dividend column, including multi-digit products. Quotient positions, subtraction signs/lines, copied digits and newly needed rows are placed automatically. The currently active entry remains one real, accessible native input over the paper; visual digit cells maintain alignment while typing. Cursor visibility follows the visual viewport when its keyboard resizes it.

**Write instead** retains the existing separated-digit scribbler, clarification and typed fallback. **Help me step by step** retains the existing guided worksheet and deterministic diagnostics. **Type a final answer instead** retains the previous answer-only flow as an optional alternative. These stay inside the same mathematics lesson. Fractions and multiplication keep their existing one-answer default.

## Integration

- `ProgressiveDivision.tsx` is mounted by the existing `WritingLesson` within My Learning Year. It buffers keystrokes while server responses advance the cursor; the child can continue typing across rows without losing digits to latency. No new page, app, identity or learner engine.
- `family/progressive_division.py` adapts the existing `writing_math.cycles` and `writing_math.check` to paper positions and cursor completion. The frontend does not decide mathematical correctness. The plan supplies positions and entry bounds, not correct answer values.
- The existing authenticated writing action endpoint accepts `division-input`, with the existing queued transport, ownership/CSRF checks and version conflict protection. Draft `support.divisionPaper` holds child entries, visible rows, cursor and completion. Existing guided work, ink, correction history and answer-only drafts are retained separately in the same draft; no database migration or record reset.
- `progressive-validation` events are appended to the same pupil mathematics ledger using `openpath-math-input@1` typed-input records. Automatic bring-down is identified as a verbatim copy. All events remain provisional and `admissible: false`; no verified mastery is awarded and eligibility/retention policies are unchanged. Automatic copies are not independent evidence of arithmetic knowledge.
- Wait for **Saved** before closing. If a network/version error occurs, the UI reports it and preserves server-acknowledged working for reload. This is an online workspace, not an offline synchronization system. A same-container restart preserves saved paper and the demo session under the existing preview settings.

## Evidence and verification

[Continuous Android-sized recording](progressive-division/continuous-android.webm) — actual My Learning Year + Django, one continuous number stream, no Next/region clicks. A 100 ms transport delay is introduced in that test; responses still come from the actual server. The video uses normal-speed recorded browser frames, not synthetic recognition or mocked mathematics.

Screenshots: [initial paper](progressive-division/initial-android.png), [entered zero and automatic bring-down](progressive-division/zero-and-bring-down-android.png), [completed working](progressive-division/complete-android.png), [earlier correction](progressive-division/correcting-android.png), [1005 ÷ 5](progressive-division/division-1005-5-android.png), [432 ÷ 12](progressive-division/division-432-12-android.png).

All six required problems (`84 ÷ 4`, `379 ÷ 3`, `125 ÷ 5`, `1005 ÷ 5`, `432 ÷ 12`, `7 ÷ 3`) are exercised in the configured component with actual Django, checking individual digit column centers. `379 ÷ 3` is exercised through actual demo/curriculum navigation. The other configured-component cases are supplementary test harnesses, not new standalone student pages. Backend tests additionally exercise 100 reproducible seeded problems and zero/small dividends, edits, multi-digit partial entries, ownership, stale versions, resume and provisional receipts.

Final local verification:

| Check | Actual result |
| --- | --- |
| Django full suite, including six new progressive tests | 238 passed |
| Frontend unit suite | 426 passed |
| Four frontend typecheck configurations | Passed |
| Existing gateway/security tests | 13 passed |
| Progressive browser scenarios | 6 passed |
| Demo/optional-answer browser regressions | 6 passed |
| Existing guided + real ONNX/fallback browser journeys | 4 passed |
| Existing normal-account/gateway + mathematics browser journeys | 7 passed |
| Existing component adapter browser harness | 3 passed |
| Progressive paper seed + post-restart resume | 2 passed |
| Existing demo/account post-restart resume | 2 passed |
| Exact preview Dockerfile build and `/healthz` | Passed |

Browser tests emulate 360×800 and 412×915 Android-sized viewports and retain desktop regressions. Native `input`/`beforeinput` and Backspace/Done paths are simulated separately from hardware-key events. Physical Android/stylus testing was unavailable. Recognition still supports separated digits, not unrestricted expressions or proofs. No educator approval or real-child effectiveness is claimed. Remote GitHub Actions execution is not claimed here.

## Reproduce

Use the existing [preview Docker instructions](../../deployment/RENDER_PREVIEW.md); no new environment variables. The reviewed local instance used loopback `http://127.0.0.1:4711/`, not a publicly accessible deployment. The Render URL is unchanged.

After health readiness, from `frontend/`:

```bash
E2E_URL=http://127.0.0.1:4711 CHROMIUM_PATH=/usr/bin/chromium \
  node --test e2e/progressive-division.test.mjs e2e/progressive-resume.test.mjs
```

Playwright needs its FFmpeg recorder installed (`npx playwright install ffmpeg`, normally included with Chromium installation). This cloud runner blocks that download domain, so recording used the already installed `/usr/bin/ffmpeg` via a symlink in a writable Playwright cache and `PLAYWRIGHT_BROWSERS_PATH=/workspace/.cache/ms-playwright`. No browser/library source was patched and no paid service was used.

After restarting that same synthetic preview container and waiting for readiness, run `PREVIEW_PHASE=resume` with `e2e/progressive-resume.test.mjs`, plus the existing `demo-student` and `preview-container` resume suites. CI includes the new scenarios and restart fixture without deploying.
