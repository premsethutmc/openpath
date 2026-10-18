# Essay UX validation

Executed in the cloud workspace with Node 24.19.0, Playwright 1.64.0 and system Chromium. This validates the UI and fixture boundary, not learning effectiveness.

| Check | Actual result |
| --- | --- |
| `npm run typecheck` | Both existing TypeScript projects passed |
| `npm test` | 242 passed: 230 existing + 12 essay presenter/contract tests |
| `npm run essay:test` | 12 passed |
| `npm run essay:e2e` | 7 passed |
| Existing `npm run english:e2e` | 9 passed |
| English development build | Passed |
| Reviewed English pilot build | Passed; opt-in essay demo refused |
| Existing math production and standalone builds | Passed |

Presenter tests verify word-count boundaries, fixed sample projections across different essays/answers, rejection of invalid step order, supported/independent storyboard transitions, final-task gating, absence of verification from fixture completions, draft/response/navigation persistence, interrupted async requests, retryable loading errors, corrupt storage preservation, English-record isolation and editing/reset semantics.

Browser tests exercise the complete phone flow, each feedback dimension, sample evidence inspection, expandable branches, partial-response and exact-step resume, synthetic error/retry, interrupted analysis, under/at/over-50-word limits, rewrite recovery, empty input, textarea Enter behavior, short-viewport layout, labelled inputs, radio navigation, touch target sizes, corrupt records, absence of API requests and unchanged existing learner-storage keys. Common phone widths: 360, 390 and 412 pixels. A separate reviewed-pilot preview verifies that the fixture route is refused before demo data is accessed.

```sh
cd frontend
npm run typecheck
npm test
npm run essay:test
npm run english:build
node scripts/build-english.mjs --pilot --out=dist-english-pilot
```

Run two existing preview processes in separate terminals:

```sh
PORT=4190 npm run english:preview
PORT=4191 DIST=dist-english-pilot npm run english:preview
```

Then run:

```sh
CHROMIUM_PATH=/usr/bin/chromium npm run essay:e2e
CHROMIUM_PATH=/usr/bin/chromium E2E_URL=http://127.0.0.1:4190 npm run english:e2e
```

CI installs its Playwright Chromium and runs the same fixture and pilot checks without a backend. Set `ESSAY_E2E_URL` and `ESSAY_PILOT_E2E_URL` if using other preview ports. The new CI job uploads synthetic screenshots; remote CI execution is not claimed without an observed run result.

Initially the browser test used decorative arrow text in button locators. The arrows are intentionally hidden from assistive technology; locators were corrected to the actual accessible names. No assertions were disabled to obtain passing results. After Claude published essay-contract@1 during this task, the fixture was migrated to the actual shared types and its `finalRewrite.available` field; type checking caught and corrected the earlier UI-only field name. A contract test verifies shared version tags, valid framework leaf IDs and verbatim evidence spans.

Not covered: live Claude service integration (the published essay-contract@1 types are imported), real analysis/scoring/mastery, real-child data, real native Android/IME behavior, a full assistive-technology audit, cross-device draft sync or production deployment. Existing backend and learner-engine logic are unchanged; only Claude’s published logic-free contract file is imported byte-for-byte and their suites were not required for this presentation-only change. Existing tutor/PR branches were inspected read-only and not updated.
