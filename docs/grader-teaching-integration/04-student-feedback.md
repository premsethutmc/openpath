# 4. Student feedback from trusted grading

## Where the text comes from

`frontend/src/journey/renderer-adapter.ts`:

- `feedbackFromDecision(decision)` gives the verdict level and the message.
- `workingFeedback(decision)` gives the message about the working and the learner's own lines, marked.

Both read only the trusted decision: its verdict and `decision.working`. Every sentence is a fixed template filled from those fields. Nothing describes reasoning the learner did not write.

`provenance.ts` (run on every journey) now also requires:

- the feedback message is either a fixed label or exactly `workingFeedback(decision).message`;
- the lines shown are exactly the decision's lines;
- a line is shown as "checked" only within `replayedLines` of a replayed certificate chain;
- an unmarked answer is shown as `partial` ("Not marked") only when the grader judged its working, and never as right or wrong.

## Behaviour required, and what is shown

| Situation | Shown (template, from the decision) | Example |
|---|---|---|
| Incorrect answer, no verified working | The substitution, when it can be evaluated exactly: "Put x = 4 into 3x = 19 − 4: the left side is 12 and the right side is 15, so they are not equal and x = 4 is not the solution." Otherwise the existing "That is not the answer we are looking for." The next step is the engine's own (Continue → recovery, investigation or teaching by policy, doc 5). | A |
| Invalid intermediate step | The substitution sentence (when incorrect), then: "The first step that does not follow is x = 4: x = 5 makes 3x = 15 true but not x = 4, so this step changed the solution." The lines are shown with the valid prefix "Checked: follows from the line before" and the refuted line marked INVALID. The correction or teaching comes from the adaptive policy (A3 explanations), not from new text. | D, E |
| Correct answer, no working | "That answer is right. You gave the answer only, so your method was not checked." | B |
| Verified working | "That answer is right. Every line of your working was checked: each one follows from the line before." Each line is shown "Checked". The verdict line ("Correct") is separate. | C |
| Correct answer, invalid working | "That answer is right. But a step in your working is not right. The first step that does not follow is 3x = 16: …" | X |
| Valid partial working | Level `partial`, label "Not marked": "No final answer was marked. Your working is right so far: each line follows from the line before. It is not finished: it does not end with the answer yet. Next step: get the unknown on its own." | F |
| Unsupported working | "Your working could not be checked automatically, so it is not marked right or wrong. Writing each step as an equation on its own line, ending with the answer, lets it be checked." The lines are shown "Not checked". The learner continues with Continue, as with any feedback. | G |

## Components reused (no second interface)

| Component | Change |
|---|---|
| `LearningScreen` | Passes `acceptsWorking` to the input. Nothing else changed. |
| `NumericInput` | New optional `acceptsWorking`: the field keeps letters, `=`, `;`, operators and spaces, and uses text input mode. Without it, behaviour is unchanged (digits only). |
| `FeedbackPanel` | The `partial` level (already in the renderer contract) gets its own label, "Not marked" (`LocaleStrings.notMarked`). It was previously shown with the "Not quite right" label, which would have presented unsupported or partial working as wrong. |
| `AlgebraWorkspace` (working panel) | Shows the learner's lines with the existing `verified` flag and badge ("invalid", "not checked"). |
| `questionSpec` | Questions with a task statement get the working-capable input, with the placeholder "x = ?   or working: 3x = 15; x = 5". |
| `slice-app.tsx` | `?start=<question id>` opens the same slice at another question. Used for the screenshots. |

## Screenshots (real screen, desktop 1366×800 and mobile 390×844)

`screenshots/d1-case-{A..G}-{desktop,mobile}.png`. They are produced by `frontend/e2e/d1-grader-feedback.test.mjs`. That test types each submission into the answer field, presses Enter, and asserts on what the screen says: verdict label, required sentences, forbidden sentences, and no horizontal overflow. `screenshots/d1-screens.json` records the grader reply behind each screenshot.

A note on mobile: the on-screen number pad has no letter keys. Working is typed with the device keyboard.
