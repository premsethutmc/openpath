# Tamil foundation validation

Executed in the cloud workspace with Python 3.12.14, Node 24.19.0, and system Chromium through Playwright. Counts below are actual executed tests, not planned checks. All Tamil item review states remain provisional; synthetic test responses are not learner validation.

| Check | Result |
| --- | --- |
| Django `manage.py test` (SQLite) | 132 passed |
| Frontend `npm test` (English regressions plus Tamil tests) | 242 passed (230 existing + 12 Tamil) |
| `npm run tamil:test` | 12 passed |
| `npm run typecheck` | Both existing TypeScript projects passed, including Tamil |
| `npm run build`, `build:standalone`, `english:build`, `tamil:build` | Passed |
| Tamil Chromium phone flows (`390 × 844`, touch enabled) | 5 passed |
| English Chromium device-only journey suite | 9 passed |

Tamil unit/contract tests cover canonical Unicode equivalents, preserved vowel length/pulli/consonant distinctions, grapheme boundaries, all 216 native script compositions, 22-node graph references/cycles, all 144 item scoring keys and distractors, 8 activities, provisional gates, hints/reveals, same-family/repeated exposure, transfer reservation, shared pupil identity, saved-session integrity, reload, relevant teaching selection and focused entry to every pilot competency.

Tamil browser tests exercise actual button taps, native text entry, on-screen sign construction, whole-grapheme deletion, mobile widths and touch targets, a wrong short-vowel classification and relevant teaching, guided/revealed answers, independent/transfer items, JSON download content, preservation of an English storage record, unanswered hint/reload exposure, storage failure, and the focused ஆய்தம் route without fabricated transfer. They assert no page script errors. The full diagnostic flow also asserts no foreign network requests. Screenshots are generated under the already ignored `frontend/e2e/shots/tamil/` and uploaded by the additive CI job.

## Reproduce

```sh
cd backend
.venv/bin/python manage.py test
cd ../frontend
npm run typecheck
npm test
npm run tamil:test
npm run build
npm run build:standalone
npm run english:build
npm run tamil:build
```

In separate terminals run `npm run tamil:preview`, then:

```sh
cd frontend
CHROMIUM_PATH=/usr/bin/chromium npm run tamil:e2e
```

CI uses the Playwright-managed Chromium after `npx playwright install --with-deps chromium`, so omit `CHROMIUM_PATH` there. To run English device-only regressions, start `npm run english:preview` with `API_TARGET` unset and run `CHROMIUM_PATH=/usr/bin/chromium E2E_URL=http://127.0.0.1:4174 npm run english:e2e`.

Initial implementation checks exposed a TypeScript JSON-inference mismatch after metadata expansion; the authored data boundary and metadata checks were corrected and the relevant checks rerun. No tests were disabled or assertions weakened to pass. Formatting used temporary npm-exec Prettier without adding a runtime dependency or changing a lockfile.

Not run: the full English account/pilot/developer browser matrix, PostgreSQL suite, real Android devices, educator content review and real-child usability/psychometric validation. Existing English source, backend, inference and dependency versions were not modified. CI configuration has been added; remote CI execution is not claimed.
