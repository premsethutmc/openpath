# Executed tests — 2026-10-20

All data is synthetic. System Chromium is `/usr/bin/chromium`; tests emulate
browser touch/pen events, not physical stylus hardware. CI configuration has been
prepared but no remote CI outcome is asserted.

| Check | Actual result |
|---|---|
| `npm run typecheck` (three existing configurations, new writing source included) | Passed |
| `npm test` under Node 24.19.0 | 330 tests passed, 0 failed, 0 skipped |
| `node --import tsx --test src/writing/workspace.test.ts`, Node 24.19.0 | 19 passed, 0 failed |
| Same writing model/contract suite, Node 22.18.0 | 19 passed, 0 failed |
| `node scripts/build-writing.mjs` | Passed |
| Existing English build with `--out=dist-english-writing-regression` | Passed |
| `node --test e2e/writing.test.mjs e2e/writing-components.test.mjs`, Node 24.19.0 | 14 passed, 0 failed |
| Same browser/component suites, Node 22.18.0 | 14 passed, 0 failed |

The 330-test frontend run includes existing English, Tamil, essay and mathematics
tests plus the 19 writing tests. It does not represent a run of every repository
suite. The backend and shared-core research suites were not rerun: no backend,
estimator, mastery or evidence-gate code changed. Previously reported Node 24
shared-core floating-point fingerprint failures are not claimed fixed.

## Model and contract coverage

- Stroke metadata, immutable capture, replay and JSON restore.
- Sparse-sample segment erasing, original retention, undo/redo and clear.
- Coordinate transforms at different screen sizes and zoom/pan.
- Threshold equality, just below threshold, null confidence and configurable
  high thresholds; invalid thresholds and invalid provider results are refused.
- Localized clarification, confident edits, stable token order and confirmed
  corrections surviving re-recognition.
- Unavailable recognizer and complete typed long division.
- New manual entry links only previously uninterpreted ink in its selected region.
- Stale recognition, unknown stroke references and duplicate token IDs.
- Erasing invalidates linked active interpretations but keeps correction history.
- Synthetic adapter accepts only unchanged sample strokes; one uncertain digit.
- Incorrect intermediate digit transported unchanged to a non-grading mock.
- Draft history/resume, corrupt version/layout refusal and quota failures.
- Arbitrary division layouts, free writing, worksheet order versus entry order,
  explicit formative provenance and no correctness/mastery fields.

## Browser and mounted component coverage

Eleven standalone flows cover mouse strokes, native browser touch dispatch,
simulated pen pressure/tilt, palm lock, eraser/undo/redo/clear, reload, zoom/pan
alignment, 320/360/412px and desktop widths, two-finger pinch, localized ambiguity,
editing confident output, re-recognition after correction, incorrect and correct
synthetic examples, full keyboard/keypad-only division, arbitrary problems,
region-specific manual fallback, saved clarification after refresh, and storage
quota failure with a usable download, and rapid multi-stroke eraser sweeps.

Three mounted public-component tests provide host-controlled adapters and verify:
late recognition rejection, recognizer failure with retained manual work,
versioned packet callback, host-requested symbol clarification, and rejection of
late validator feedback after the student edits. The harness is built in memory
inside the test and routed only into that test browser; it adds no production test
hooks or recognition implementation.

## Issues found and fixed while testing

The first pointer run exposed DOMPoint's non-enumerable coordinates: spreading a
DOMPoint omitted x/y from stored samples. Capture now copies x/y explicitly and
uses inverse SVG screen transforms so zoom, border, pan and resize stay aligned.
The first typed-region test exposed missing explicit accessible selector labels.
Both fixes are exercised by the final passing browser run.

The component harness initially compiled its JSX in classic mode without a React
namespace; its build now explicitly selects automatic JSX. A multi-sample helper
initially toggled an already-open panel closed; it now opens the panel only when
needed. These were test-harness corrections, not disabled assertions.

No physical Android, Samsung S Pen, Apple Pencil, Windows stylus, educator review,
real-child trial, handwriting accuracy calibration or real mathematical-validator
integration was performed. The local test results do not establish those outcomes.

## Reproduce browser checks

From `frontend`, build, then run the existing preview server in another terminal:

```sh
node scripts/build-writing.mjs
DIST=dist-writing PORT=4670 node scripts/preview-english.mjs
```

With Chromium installed:

```sh
CHROMIUM_PATH=/usr/bin/chromium node --test e2e/writing.test.mjs e2e/writing-components.test.mjs
```

Alternatively `npx playwright install chromium` and omit `CHROMIUM_PATH` to use
Playwright's browser. The new validation-only GitHub Actions workflow uses Node
22/24 and installs Chromium explicitly. No API credentials, live learner backend
or Codespace is required for these tests.
