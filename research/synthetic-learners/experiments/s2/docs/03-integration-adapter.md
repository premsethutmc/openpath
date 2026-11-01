# 3. Integration adapter (synthetic-adapter@2)

The adapter is in `src/port.ts` (`D1Port`, `visible2`). It keeps the contract of S1's `JourneyPort`, unchanged:

- `frame()` returns what the learner can see now;
- `act(answer | hint | continue)` sends a renderer event to the real `SliceFlow` at `cd40422b`;
- `later(days)` returns the learner after that many days.

No production file is changed.

## What the learner sees after an answer (D1 is now in the journey)

| Shown in the real journey (`flow.ts`, `renderer-adapter.ts`) | Passed to the learner |
|---|---|
| feedback level: correct / incorrect / partial / none | yes |
| feedback **message** (D1 `workingFeedback` text: "Every line of your working was checked…", "The first step that does not follow is …", "You gave the answer only, so your method was not checked.", "could not be checked automatically …") | yes, as text |
| working panel: each of the learner's lines with its mark ("Checked: follows from the line before", "First step that does not follow", "Not checked …") | yes, as `{text, mark}` |
| the decision object, `working-assessment@1`, counterexample fields, evidence, `verified` flags, learner state, hypotheses, question id | **no** |

**Finding.** Everything D1 judges about the working that the learner should know *is* presented: the first invalid line, partial, unsupported, answer-only. Nothing D1 computes is hidden from the learner that the simulator would need, so no D1 feedback had to be supplied secretly.

**Product gap.** The counterexample D1 holds (for example "x = 3 makes the line before true but not this one") is shown only inside the message sentence, not as structured help, so a learner cannot ask for it again.

## How the learner uses the feedback (pre-registered)

The S1 learning model uses the feedback **level** only:

- after an independent answer, `correct` or `incorrect` drives practice and consolidation;
- `partial` counts as unmarked.

The message and marks are recorded in the trace, but the learning model does not act on them. No synthetic "reads the D1 message and fixes the step" behaviour was added: that would be an untested assumption that favours D1.

## Explanations

The learner sees the explanation's title, the text of each step, and the worked lines (`math.plain`), all learner-visible. Cohort A reads the title. Cohort B reads only the worked lines (doc 2).

## Isolation

- The port's own keys are `contract`; the flow is a private field.
- Extra fields on an action (a smuggled `decision`, `credit`, `assessment`, `mastery`) are dropped (failure case 19).
- The harness reads OpenPath's records and state **after** each visit, for the trace only. They are never passed to the learner.
