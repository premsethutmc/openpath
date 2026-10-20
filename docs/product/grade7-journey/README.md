# Grade 7 journey — audit and integration boundary

The selected, hash-pinned curriculum release remains authoritative. The only built-in Grade 7 release is OpenPath sample 1.1.0 (984c767b), explicitly synthetic, not NCERT, CBSE or Tamil Nadu. It assigns rational numbers, variables, linear equations, percentages and proportion. Rational numbers has no module. Four modules exist; all await educator review. No approved Grade 7 board curriculum or released learning bank exists in this checkout. This blocks approved-content / real-board acceptance; do not relabel the sample or manufacture lessons.

## Minimum changes

Use `/year/`, authenticated pupil ownership, canonical mathematics PupilEvent stream and sequence protocol. Keep `learnerState`, `tilesFor`, `nextActivity`, `moduleState`, `diagnose`, generated question validators and review eligibility unchanged. Add a versioned operational session receipt in that same stream for fixed plans, drafts and usage. These receipts are ignored by the evidence engine. Program completion and time do not confer mastery. Relations select supporting instruction, never lock access.

GRE and JEE registries contain provisional mathematical skill overlaps only, unverified official versions, no scoring or timing rules. TNPSC/UPSC mappings and banks are absent. The executable GRE refresher covers percentage foundations, not GRE readiness or an approved exam bank. Use canonical high-information diagnostic and shared skill module. No target-score prediction, official timed simulation or syllabus-completeness claim is possible.

See final validation section for executable tests, screenshots and remaining limitations.

## Operational contract

`packages/learning/src/journey.ts` defines `math-session@1`: immutable budget/ordered module plan, exact curriculum id/version/hash, per-question draft (answer, working, hint flag), teaching-page checkpoint, time intervals and module-finish receipts. Django validates ownership through the existing pupil endpoint, version/action shape, curriculum selection, mapped/registered modules, immutable plan ID, estimate bounds, duplicate receipts and usage invariants. It replaces client timestamps with its own clock. No new database model or learner identity is introduced.

The canonical `learning_record` attempt and teach constructors remain responsible for evidence. `moduleState` still decides diagnostics, targeted strategy, guided practice, checks, transfer and retention. `diagnose` still selects up to three informative questions using its existing draft likelihood policy. `nextActivity` supplies the school recommendation; observed supporting gaps within the selected curriculum can reorder the session using existing typed prerequisite relations. Access is never gated by a prerequisite chain. Other missing supporting instruction is handled by the existing lesson/recovery machinery, not new inference rules.

Modules are selected once per session against the available budget. Their order/estimates stay fixed across answers and reloads. A module can be marked complete only when the existing frontend module reaches its done boundary; a paused/human-help module remains unfinished. Completion is operational, not trusted evidence. Verified tile states and delayed checks come exclusively from canonical evidence. Every current module/question is provisional, so completing it cannot establish verified mastery.

## Timing and duration policy

- Conservative default: 12 active minutes per module, explicitly an engineering assumption, not measured educational validation.
- Personal estimate: median of up to nine recent completed-module active durations, shrunk toward the default with three prior observations, clamped to 4–40 minutes. Estimates affect future plans only.
- Active time: monotonic browser intervals while visible/focused, within 60 seconds of an observed interaction. Hidden, blurred and inactive intervals count as idle. This is an activity heuristic, not proof the learner is attending.
- Question-solving is the active subset while an answer screen is mounted; feedback and teaching are not counted as solving. Help openings are counted separately. No time value enters evidence eligibility.
- Remaining estimate: unfinished module estimates less recorded active work, floored at zero; completion still requires the activity boundary. Overrunning an estimate never auto-completes a module.
- Five-second autosave and explicit flush before answers/exits. Drafts, working, hint flags and teaching page resume from authenticated storage. Last few seconds may be lost if the OS kills a tab before the request completes; wait for Saved. No offline-sync or multi-device conflict merger is claimed. Existing sequence-conflict errors remain visible, with local drafts retained for retry while the page stays open.

## Scope and remaining blockers

Implemented: guided Grade 7 UI, selected-release topic hierarchy, evidence-derived statuses/retention details, fixed budgeted sessions, existing module teaching/working/practice/feedback, draft/page resume, activity accounting and formative exam foundation sessions. School/exam progress is separate, with globally shared competency/question exposure history.

Not established: real-board Grade 7 coverage, educator approval, complete exam syllabi, official current scoring/timing, calibrated question difficulty, real-child effectiveness, physical Android keyboard/stylus behavior. The rational-number outcome has no module. The synthetic variable outcome maps to a straight-line module and needs educator alignment review. This branch does not change that mapping or disguise it as a complete Grade 7 curriculum. Existing numeric/symbolic answer validators are reused; optional working is retained, and only families already supported by `checkWorking` receive line validation. It does not claim unrestricted handwriting/algebra recognition.

To satisfy approved-content acceptance, supply a reviewed board-specific Grade 7 release and source mapping, repair the variable/line module alignment through content review, implement the missing rational-number instruction, and release vetted module/question families through the existing hash-locked educator workflow. Exam expansion requires independently verified official specifications and reviewed banks. None of these approvals is fabricated here.

[Run locally and test](RUN.md). Mobile browser artifacts are in [screens](screens/).

## Mobile screenshots

Real Chromium captures against authenticated Django, synthetic Grade 7 learners, non-review-fixture build:

| State | 360 px | 393 px |
|---|---|---|
| Initial journey | [Overview](screens/overview-360.png) | [Overview](screens/overview-393.png) |
| Expanded curriculum | [Topics](screens/topics-360.png) | [Topics](screens/topics-393.png) |
| Saved starting question | [Question](screens/question-360.png) | [Question](screens/question-393.png) |
| Engine-selected teaching | [Teaching](screens/teaching-360.png) | [Teaching](screens/teaching-393.png) |
| Guided working after resume | [Practice](screens/practice-360.png) | [Practice](screens/practice-393.png) |
| Saved completion/progress | [Progress](screens/progress-360.png) | [Progress](screens/progress-393.png) |
| GRE supported scope | [GRE](screens/gre-scope-360.png) | [GRE](screens/gre-scope-393.png) |
| Missing exam scope | [Unsupported](screens/unsupported-360.png) | [Unsupported](screens/unsupported-393.png) |

[Fresh GRE foundation refresher, 412 px](screens/gre-refresher-412.png). Browser emulation is not physical-device validation. Mathematics reuses locally bundled **Kalam Light**, SIL Open Font License 1.1; UI text uses system sans-serif.

## Validation results — 20 October 2026

| Executed check | Actual result |
|---|---|
| `cd backend && .venv/bin/python manage.py test --noinput` | **246 passed** (includes five new session contract tests); no failures |
| `cd frontend && npm test` | **432 passed** (includes five new journey tests); no failures |
| `cd frontend && npm run typecheck` | All four TypeScript configurations passed |
| `build-mathematics-journey.mjs`, `build-tamil.mjs`, Tamil copy | Full multi-entry frontend build passed; final `/year/` rebuilt after visual polish |
| `e2e/grade7-journey.test.mjs` against actual Django | **3 passed**: full 30-minute school journey at 360/393 px, fresh GRE foundation diagnostic/refresher at 412 px |
| Existing `e2e/preview-container.test.mjs` + `e2e/writing-year.test.mjs` + gateway/security tests | **20 passed**: seven actual-browser integration regressions and thirteen server/security checks |
| Node 22.18.0 focused journey suite | **5 passed**; full frontend suite above ran on Node 24.19.0 |
| `manage.py check`, `git diff --check` | Passed |

Browser coverage includes exact curriculum loading, missing rational-number instruction, explicit 30-minute selection, deterministic diagnostic/feedback, genuine engine-selected teaching, guided working, reloads both before and after teaching, saved answer/working, native-input focus retained through autosave, help/active/solving records, module completion without verified mastery, shared GRE competencies without copied school completion, fresh GRE diagnostic and unavailable TNPSC/UPSC controls. All new browser journeys assert no page errors and no horizontal overflow. No physical Android/stylus test or real-child validation was performed.

Existing English, Tamil, essay, writing/ONNX and provisional-evidence machinery were not replaced. No curriculum, estimator, mastery policy, production data, research repository or deployment configuration was modified.
