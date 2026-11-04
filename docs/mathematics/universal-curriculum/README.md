# Universal curriculum journey

Based on `feat/grade7-session-completion-v1` / `ac0a76434a65947c84112b69da2d00c48da3aa3e`.

The learner opens **My Learning Year → Open Mathematics topics → chapter/section → competency → Practise competency**. The selected enrolment determines board, grade, academic year and curriculum version. Learner tiles now use the repository's prescribed order, even if an educator previously arranged the same curriculum on that device. All tiles at a level are available without a truncated learner syllabus. Educator display-order customisation remains available.

Practice is an entry into the existing `fromPool(module, 'practice', records)` selection, `Ask` keyboard/working interface, deterministic answer checkers and authenticated Django mathematics event ledger. There is no new curriculum, question bank, diagnostic, planner or mastery engine. The same component serves all grades and both boards. Diagnostic/timed study and teaching modules remain optional links; they do not gate syllabus practice. No new lessons were authored.

Wrong answers retain their answer/working draft; retry and existing contextual help stay available. Next question selects a fresh existing exposure. Review status is explicit. Formative independent/assisted performance and canonical understanding are shown separately from verified mastery. Existing written-method/drawing requirements are retained, with unsupported keyboard competencies unavailable rather than converted into final-answer assessments. Existing archived handwriting records are untouched.

Attempts/help metadata are server-persisted through the existing owned-pupil API. Unfinished input, question cursor and feedback use the existing browser-local resume helper, scoped by learner, academic year, curriculum hash and competency. Same-browser reload/leave/return resumes them; cross-device draft synchronisation is **not** implemented. Cross-device learner evidence remains available from Django.

## Existing-data coverage

All counts refer to the repository's **v1.1.0** board releases and coverage compiler, not a fresh claim that these inventories exhaust current official syllabi. The Tamil Nadu Grade 7 inventory is explicitly `sourceVerified: false`; its warning remains visible. The other three releases carry the repository's `sourceVerified: true` flag.

| Curriculum | Requirements | Mapped requirements | Distinct mapped competencies | Competencies with keyboard practice | Requirements with working questions¹ | Partial | Unsupported² | Educator-validated requirements |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Tamil Nadu 7 | 54 | 54 | 56 | 48 | 52 | 2 | 0 | 0 |
| CBSE/NCERT 7 | 56 | 56 | 46 | 42 | 52 | 4 | 0 | 0 |
| Tamil Nadu 10 | 49 | 49 | 48 | 46 | 48 | 8 | 0 | 0 |
| CBSE/NCERT 10 | 58 | 58 | 33 | 31 | 57 | 7 | 0 | 0 |

¹ At least one mapped competency has grade-eligible generated keyboard practice. This **does not** mean the whole requirement is covered. Questions exist for every mapped competency in 51/54 TN7, 50/56 CBSE7, 47/49 TN10 and 56/58 CBSE10 requirements; required written methods still require educator assessment. Respectively 2, 4, 1 and 1 requirements have no working keyboard questions.

² `unsupported` here is the compiler's requirement classification, separate from absent keyboard coverage and the listed partial classifications. Partial method/construction requirements are not represented as fully covered. Competency counts include the dashboard's mapped smaller steps.

All four releases have **zero validated requirements and zero released question families** in the current registry. “Awaiting review” counts are 52 TN7, 52 CBSE7, 41 TN10 and 51 CBSE10; partial requirements are also not educator-approved. No review status was changed. Review/real-learner validation remains outstanding.

[coverage.json](coverage.json) records every requirement, mapping, partial-coverage reason, written-task reference, chapter order and release hash. Regenerate this audit without rewriting any content bank:

```sh
cd frontend
node --import tsx scripts/audit-curriculum-journey.mts ../docs/mathematics/universal-curriculum/coverage.json
```

The audit checks existing practice answers using the existing deterministic checker: 34,979 TN7, 24,671 CBSE7, 36,038 TN10 and 25,870 CBSE10 pool entries. These are engineering self-consistency checks, not educator or scientific validation.

## Run locally

Use the repository's existing Django setup with a **synthetic development database**, then:

```sh
cd frontend
npm ci
node scripts/build-english.mjs
node scripts/build-year.mjs
node scripts/build-curriculum.mjs
PORT=4174 API_TARGET=http://127.0.0.1:8000 node scripts/preview-english.mjs
```

Open `/year/`, use a synthetic account/pupil, and select the desired board and grade through the existing setup. Open Mathematics topics. No public hosting or deployment is required. Never use `--test` review-fixture assets for learner access.

## Verification

See the delivery report below for final results. Browser journeys use actual Django account/enrolment/events APIs and normal provisional assets; no API or recognition mocks and no review fixture. Android widths are simulated Chromium viewports, not physical-device tests.

```sh
cd frontend
npm run typecheck
node --import tsx --test src/year/study-time.test.ts src/year/topic-session.test.ts src/year/grade7-board.test.ts src/learning/engine.test.ts src/learning/dashboard.test.ts
YEAR_URL=http://127.0.0.1:4174 SHOTS=/tmp/curriculum-screens node --import tsx --test e2e/curriculum-journey.test.mjs
```

The new eight browser cases cover both boards/grades at 360px and 393px: dashboard navigation, book order despite stale custom order, nested competency entry, actual generated questions, typed drafts/reload, wrong answer, requested help, retry, fresh question, canonical evidence persistence, unchanged enrolment, no premature verification, return/resume without duplicate attempts, unavailable keyboard tasks and no handwriting controls/overflow. Existing optional Grade 7 browser tests now explicitly choose **Start diagnostic** after opening the chapter; their diagnostic, teaching, fixed-plan, time and summary assertions are preserved.
