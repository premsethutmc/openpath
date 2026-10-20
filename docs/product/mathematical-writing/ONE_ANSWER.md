# Mathematics: one question, one answer

Division’s default is now [progressive paper](PROGRESSIVE_DIVISION.md). This milestone remains available as the optional final-answer mode; fractions and multiplication retain this default.

Branch `feat/mathematics-one-answer-v1`, based on `feat/preview-demo-student-v1` (`c2412a46851c7d6bedde15c4bb4e31cdde2cc32c`). Prepared for review only; no merge, Render change or deployment.

## Student experience

The existing authenticated `/year/` route and one-tap synthetic demo now open the current mathematics question immediately. For the sample division lesson this is **379 ÷ 3 = ?**, one answer field, **Check answer**, and **Write instead**. No teaching, region selection, intermediate steps or custom keyboard is mandatory.

Optional **Help me understand** and **Show an example** display short help alongside the answer. **Help me step by step** / **Show steps** opens the existing guided lesson and structured worksheet. **Back to one answer** preserves both its working and the simple answer draft. The existing developer harness retains its guided interface.

`126 R 1`, `126r1`, and `126 remainder 1` are accepted. `126` is incomplete; malformed input receives formatting guidance; incorrect mathematics offers retry, hint and guided steps without forcing diagnostics. Equivalent positive fractions use the existing fraction validator. Multiplication uses its existing generated arithmetic validator and the phone's native numeric keyboard. Division/fractions use text keyboards because `R`, spaces and `/` must remain enterable.

Successful practice offers **Next question**: bounded, deterministic original practice variants within the same topic, not an adaptive curriculum planner or exam-readiness measure. The URL retains the practice round, and demo re-entry resumes the last saved round. At the finite series boundary, Next returns to the curriculum. School/exam programs, curriculum graph and retention policy are untouched.

## Integration and persistence

- `Lesson.tsx` presents the default interaction; `GuidedLesson.tsx` preserves the previous lesson implementation. `WritingWorkspace` adds an opt-in compact mode using the same Surface, ONNX adapter, uncertainty confirmation, undo/eraser and input contract.
- Answer-only paper has one region and no region selector. It recognizes separated digits only. Letters, fraction bars and unrestricted expressions require typed entry. Unclear ink is clarification, never a mathematical error. Original ink remains saved when switching to typing.
- `writing_math.final_answer` is an additional entry to the existing deterministic Django validator. It uses quotient/remainder arithmetic and reuses `check` for fractions and multiplication. No LLM, frontend correctness decision or new estimator.
- Existing writing draft action APIs persist simple answer/ink/round in the draft's support data, independently of guided working. Queued saves and version checks protect stale edits. Changing an answer clears stale correctness feedback.
- Server-generated `answer-validation` receipts remain in the same canonical pupil mathematics event stream with provisional content status and `admissible: false`. They record help, repeated feedback and input provenance. They are formative records; the existing estimator adapter does not promote answer-only practice into verified mastery. No eligibility rules changed.
- Wait for **Saved**, or use **Save and return to the lesson**, before closing. Network failure cannot guarantee an unacknowledged save. Existing demo identity, cookie isolation, two-hour lifetime and reset restrictions remain in force.

## Run / review

Use [the existing Docker preview instructions](../../deployment/RENDER_PREVIEW.md), selecting this branch. No new environment variables are required. The local verified container used `http://127.0.0.1:4705/`; that loopback address is not a publicly accessible preview. The existing Render URL is unchanged until an explicitly approved deployment.

Mobile screenshots from the real packaged frontend and Django backend:

- [Initial question](screens-one-answer/initial-android.png)
- [Correct answer](screens-one-answer/correct-android.png)
- [Incorrect answer](screens-one-answer/incorrect-android.png)
- [Handwriting option](screens-one-answer/handwriting-android.png)

Tests (final local runs):

| Check | Result |
| --- | --- |
| Render Docker image build and Django `/healthz` | Passed |
| Django full suite, including five new answer/format/equivalence/ownership/persistence tests | 232 passed |
| Existing frontend unit suite | 426 passed |
| Four frontend typecheck configurations | Passed |
| Gateway/security tests | 13 passed |
| New actual-browser simple-answer journeys | 3 passed |
| Existing actual-browser demo isolation/lifecycle journeys | 3 passed |
| Existing actual-browser guided journeys, including real ONNX and unavailable-recognizer fallback | 4 passed |
| Existing actual-browser account/gateway and mathematics journeys | 7 passed |
| Existing browser component adapter harness | 3 passed |
| Demo and account work after container restart | 2 passed |

Browser acceptance uses Android-sized Chromium at 360×800 and 412×800/915 and desktop 1280×900. It covers immediate entry, remainder formats, incomplete/invalid/wrong answers, retry, inline help, writing/typing switches, saved ink, guided worksheet access, resume, equivalent fractions, multiplication, later practice rounds, no horizontal overflow and no admissible mastery evidence. Regression harnesses now explicitly choose guided mode before their existing assertions. Component harness adapters are simulated; the integrated learner journeys use actual Django and local ONNX.

No physical Android/stylus testing, educator approval or real-child effectiveness is claimed. Unrestricted expression recognition remains unsupported. This change does not simplify every legacy mathematics page outside the integrated My Learning Year writing lessons. Remote GitHub Actions execution is not claimed here.
