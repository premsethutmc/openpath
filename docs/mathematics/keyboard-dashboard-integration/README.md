# Keyboard-only Mathematics / curriculum dashboard reconciliation

Integration branch: `feat/mathematics-keyboard-dashboard-integration`.
Base and PR target: `feat/mathematics-curriculum-tiles`, not `main`.
No merge, deployment, production-data operation or tracked curriculum/content change was performed.

## Branch audit and smallest safe integration

| Branch | Verified original head |
| --- | --- |
| `feat/mathematics-completion` (PR #65) | `051f7fb9c9bd526e800aa08d9adb99ca19f485b8` |
| `feat/mathematics-curriculum-tiles` (PR #66) | `5f1097a11e4414659245009e445680a83c18e74d` |
| `feat/mathematics-keyboard-only-v1` | `c787f1b5554f42e1fb76f39e0d6e5b39a76f3093` |

The common ancestor is `8aff2739070cbba128ca76e8b232e6cff264b42b`. The comparison is 74 dashboard-only / 14 keyboard-only commits. PR #65's head is already an ancestor of PR #66's head.

Only `c787f1b` introduces the keyboard-only policy. The other 13 commits contain earlier writing, lesson integration, preview configuration and design/research work. The dashboard head contains **neither** `frontend/src/writing/` **nor** the writing-draft APIs/model, so applying that policy patch alone is not executable.

This branch starts at the exact dashboard head. It ports the existing keyboard workspace and its required dependency files as a reviewed file-level patch, rather than merging, rebasing or cherry-picking the 14-commit history. Source history for that dependency closure:

| Source commit | Selected responsibility |
| --- | --- |
| `1b46312` | Versioned input contract, model, typed workspace and archive-compatible stroke structures |
| `62ce1c2` | Authenticated draft transport, deterministic arithmetic and diagnostic/teaching integration |
| `af0aef1` | In-lesson hosting support and styles |
| `d12849b` | One-answer interaction and optional guided working |
| `961733d` | Progressive division, variable-width products, cursor advancement and automatic bring-down |
| `39d0006` | Contextual recovery and help receipts |
| `55d00bd` | Approved notebook typography/layout (Kalam Light, SIL OFL 1.1; licence included) |
| `c787f1b` | Disabled handwriting policy, native keyboard paths and compatibility tests |

No whole historical commit was replayed. Excluded: old `year/Main.tsx`, old learning-journey engine/UI, old Grade 7 shell, old preview/demo/Render files, design-only commits, recognition runtime, ONNX dependencies and model assets. The current dashboard, curriculum, planner, diagnostics, parsers, eligibility rules and estimator remain the dashboard branch's versions.

There were no Git textual conflicts because no blind replay was used. The semantic conflicts were resolved additively:

- The newer year module stays in place. `KeyboardPractice.tsx` adds optional **Open keyboard working** inside the existing lesson for the three supported competency IDs. It does not answer or complete the current module's question for the learner.
- While keyboard working is open, the duplicate outer navigation is hidden. The worksheet's exit flushes ordered saves and reloads the canonical event cursor before the original module resumes. A subsequent canonical answer is tested against the real server.
- Newer drawing-task handling is retained behind the same disabled policy. These tasks show an explicit unavailable message, not a final-answer substitute. Written textual proofs and all the newer supported answer parsers remain unchanged.
- The historical `0003_writing_draft` migration is retained, joining the newer `0004_written_marking` lineage with additive, operation-free `0005_keyboard_written_join`. No table/data reset or destructive migration is used.
- The two lesson hosts use the existing unavailable-recognizer adapter; recognizer runtime/assets are not imported. There is no switch a URL, role or saved preference can use to enable handwriting.

## Learner and evidence behaviour

Use the normal account and learner in `/curriculum/`. Select the board/year and open a supported skill through its existing My Learning Year link. Direct links use `/year/?learner=<owned-pupil-id>&skill=MATH.number.long-division` (also `MATH.number.equivalent-fractions` and `MATH.number.multiplication-tables`). Choose **Open keyboard working**.

The existing notebook supports progressive division, one-answer fractions/multiplication, and optional guided working. The sample operands remain the existing formative practice examples; these are not represented as the newer module's assigned question or as curriculum completion. Other skills keep the newer module's normal parser and validator. Existing keyboard practice accepts arbitrary supported division parameters; backend tests exercise multi-digit divisors, zero quotient digits, multi-digit products and remainders.

The old `openpath-math-input@1` contract and the shared authenticated pupil identity are reused. Activity receipts append to the same mathematics event stream, with `kind: math_writing`, `contentStatus: provisional`, and `admissible: false`. They do not fabricate canonical question attempts or advance the newer module's phase. Helped success cannot grant independent or verified mastery. The existing canonical curriculum/evidence machinery remains responsible for progression and delayed verification.

The drawing editor, writing canvas, recognition/settings controls and custom keypad are disabled. Numeric fields use the native keyboard where applicable. Tasks requiring diagrams or constructions remain unavailable; they are not advertised as keyboard-assessable. Read-only archived drawings remain available to their existing learner/educator review views. The policy does not remove archived ink or change what educators historically marked.

## Archive compatibility

A copy of the old keyboard branch's **synthetic** database was upgraded using the integrated migration graph. The original file was untouched. All rows were hashed before and after migration:

| Table | Rows | SHA-256 of the ordered complete rows, unchanged |
| --- | ---: | --- |
| `family_writingdraft` | 36 | `1ca41730a7cdbc99139fcce80fcab2fba30d689547666d584813bdaaa45d1eab` |
| `family_pupilevent` | 415 | `28d951af9bbeaa5774b852fbba839a0dae6502d0d7698300a104a3e63f8b41e3` |

Automated tests separately retain archived pen coordinates/pressure, correction history, draft round-trips and confirmed-input packets. API tests check reopen, resume, export and continued progressive input without rewriting historical work/evidence. Component tests keep `draw@1` decoding and read-only rendering while asserting the editor and final-answer replacement are absent.

## Validation

All executed final checks passed. No existing assertion was weakened or skipped.

| Check | Actual result |
| --- | --- |
| `npm run typecheck` | Passed all three existing TypeScript projects; writing uses the existing Mathematics integration project |
| `npm test` (Node 24.19.0) | **450 passed, 0 failed, 0 skipped**; 1,275.9 seconds |
| `python manage.py test --noinput` | **240 passed**, 0 failures; 91.6 seconds |
| Existing dashboard `e2e/curriculum.test.mjs` | **6 grouped tests passed**, covering all A–N journeys; real Django; 49.6 seconds |
| Existing `e2e/learning-year.test.mjs` | **14 passed, 0 failed, 0 skipped**; real Django; 862.4 seconds |
| `e2e/keyboard-dashboard.test.mjs` | **4 passed**; both 360px and 393px, division/retry/hint/Backspace/earlier correction/refresh-resume, canonical ledger cursor, fractions, guided multiplication and direct/legacy routes |
| `e2e/writing-components.test.mjs` | **3 passed**; disabled policy, archived ink, callback contract, stale feedback |
| `e2e/keyboard-policy-components.test.mjs` | **1 passed**; drawing task unavailable, no final-answer substitution, archived drawing read-only |
| `src/writing/*.test.ts`, Node 22.18.0 | **22 passed, 0 failed, 0 skipped** |
| Same writing tests, Node 24.19.0 | **22 passed, 0 failed, 0 skipped** (also included in the 450) |
| `npm run build` | Passed |
| `build-mathematics-journey.mjs`, `build-year.mjs`, `build-curriculum.mjs` | Passed; normal builds and separate test-fixture builds |
| Fresh migrations and `makemigrations --check --dry-run` | Passed; no model drift |
| Upgrade of old synthetic database copy | Passed; all 36 archived drafts and 415 evidence rows unchanged |
| `git diff --check` | Passed |

Compact captured runner summaries are in [validation-results.txt](validation-results.txt).

Dashboard A–N uses the repository's existing clearly labelled **test-only review fixture**, per-pupil synthetic clock and real Django API; the fixture demonstrates delayed verification without approving repository content. The new keyboard browser journeys use the normal provisional-content build and do not enable that fixture. Neither build was deployed.

The existing content regeneration commands were deliberately not run: this integration changes no curriculum or generated content. The dashboard build only compiles its index from the checked-in sources.

## Screenshots

Actual Chromium screenshots against Django, synthetic accounts only, normal provisional-content builds. No mocked validation. The Android native keyboard itself cannot be rendered by desktop Chromium; tests verify numeric input mode, focus preservation during help, and viewport/overflow behaviour. Physical Android/stylus hardware was not tested.

| State | 360 CSS px | 393 CSS px |
| --- | --- | --- |
| Actual Grade 7 curriculum topics | [360](screens/360-grade7-tiles.png) | [393](screens/393-grade7-tiles.png) |
| Keyboard mathematical working | [360](screens/360-working.png) | [393](screens/393-working.png) |
| Incorrect entry and contextual help | [360](screens/360-incorrect-recovery.png) | [393](screens/393-incorrect-recovery.png) |
| Corrected and completed calculation | [360](screens/360-corrected-completed.png) | [393](screens/393-corrected-completed.png) |
| Persisted working after refresh/resume | [360](screens/360-resumed.png) | [393](screens/393-resumed.png) |

## Reproduce locally

Use Node 24, Chromium/Playwright and the existing backend requirements. No recognition service or new dependency is required.

```sh
cd frontend
npm ci
node scripts/build-mathematics-journey.mjs
node scripts/build-year.mjs
node scripts/build-curriculum.mjs
npm run typecheck
npm test
```

In separate terminals, using only an isolated development database:

```sh
cd backend
python manage.py migrate --noinput
python manage.py runserver 127.0.0.1:8000 --noreload
```

```sh
cd frontend
PORT=4190 API_TARGET=http://127.0.0.1:8000 node scripts/preview-english.mjs
```

For synthetic browser accounts, follow the existing `.github/workflows/learning-year.yml` test-only rate/clock setup; no account/authentication changes are needed in the application. The workflow now runs the keyboard and archive component/browser regressions after A–N, rebuilding the normal provisional-content screens first. Example against those local processes:

```sh
cd frontend
CHROMIUM_PATH=/usr/bin/chromium node --test e2e/writing-components.test.mjs e2e/keyboard-policy-components.test.mjs
YEAR_URL=http://127.0.0.1:4190 CHROMIUM_PATH=/usr/bin/chromium node --import tsx --test e2e/keyboard-dashboard.test.mjs
```

Do not deploy any `--test` build, use the per-pupil test clock with real learners, or connect these tests to production data. No public preview or deployment has been created.

## Remaining boundaries

- Only the three existing validated workspace topics are connected to the additional keyboard working entry. Other existing supported parsers remain available unchanged; drawing-required tasks remain unavailable.
- Formative sample working does not claim to satisfy a newer curriculum module's independent/retention questions. There is no new scoring or readiness model.
- Archive upgrade was verified on the available synthetic SQLite copy and fresh SQLite database. A production database migration remains an operational review step; it was not run.
- Android testing is browser emulation at the specified widths, not a physical phone or real native-keyboard hardware test.
- No CI result is claimed until GitHub actually runs it. Local workflow-equivalent results are listed above.

This is a reconciliation milestone, not completion of the next Grade 7 instructional-content milestone.

Comparison: https://github.com/premsethutmc/openpath/compare/feat/mathematics-curriculum-tiles...feat/mathematics-keyboard-dashboard-integration?expand=1

## Changed paths

```text
.github/workflows/learning-year.yml
backend/family/migrations/0003_writing_draft.py
backend/family/migrations/0005_keyboard_written_join.py
backend/family/models.py
backend/family/progressive_division.py
backend/family/test_keyboard_archive.py
backend/family/test_one_answer.py
backend/family/test_progressive_division.py
backend/family/test_workspace_recovery.py
backend/family/test_writing.py
backend/family/urls.py
backend/family/views.py
backend/family/workspace_recovery.py
backend/family/writing_math.py
backend/family/writing_views.py
docs/mathematics/keyboard-dashboard-integration/README.md
docs/mathematics/keyboard-dashboard-integration/screens/360-corrected-completed.png
docs/mathematics/keyboard-dashboard-integration/screens/360-grade7-tiles.png
docs/mathematics/keyboard-dashboard-integration/screens/360-incorrect-recovery.png
docs/mathematics/keyboard-dashboard-integration/screens/360-resumed.png
docs/mathematics/keyboard-dashboard-integration/screens/360-working.png
docs/mathematics/keyboard-dashboard-integration/screens/393-corrected-completed.png
docs/mathematics/keyboard-dashboard-integration/screens/393-grade7-tiles.png
docs/mathematics/keyboard-dashboard-integration/screens/393-incorrect-recovery.png
docs/mathematics/keyboard-dashboard-integration/screens/393-resumed.png
docs/mathematics/keyboard-dashboard-integration/screens/393-working.png
docs/mathematics/keyboard-dashboard-integration/validation-results.txt
frontend/e2e/keyboard-dashboard.test.mjs
frontend/e2e/keyboard-policy-components.test.mjs
frontend/e2e/writing-components.test.mjs
frontend/scripts/build-year.mjs
frontend/src/writing/GuidedLesson.tsx
frontend/src/writing/KeyboardPractice.tsx
frontend/src/writing/Lesson.tsx
frontend/src/writing/ProgressiveDivision.tsx
frontend/src/writing/Surface.tsx
frontend/src/writing/Workspace.tsx
frontend/src/writing/WorkspaceRecovery.tsx
frontend/src/writing/adapters.ts
frontend/src/writing/contract.ts
frontend/src/writing/evidence.ts
frontend/src/writing/features.ts
frontend/src/writing/fonts/Kalam-OFL.txt
frontend/src/writing/fonts/kalam-latin-300-normal.woff2
frontend/src/writing/keyboard-policy.test.ts
frontend/src/writing/lesson-service.ts
frontend/src/writing/model.ts
frontend/src/writing/notebook.css
frontend/src/writing/practice-round.test.ts
frontend/src/writing/practice-round.ts
frontend/src/writing/style.css
frontend/src/writing/workspace.test.ts
frontend/src/year/Learn.tsx
frontend/src/year/Main.tsx
frontend/src/year/SketchPad.tsx
frontend/tsconfig.json
frontend/tsconfig.mathematics-integration.json
```
