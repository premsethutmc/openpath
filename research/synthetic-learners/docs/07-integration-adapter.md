# 7. Integration adapter contract

`src/adapter.ts` defines `synthetic-adapter@1`.

```ts
type PortFrame =
  | { stage: "question"; question: { prompt; input: { type; choices?: { id; label }[] }; hintAvailable; hintShown } }
  | { stage: "feedback"; feedback: "correct" | "incorrect" | "unresolved" | "none" }
  | { stage: "teaching"; teaching: { title; text }; step }
  | { stage: "summary" };
type LearnerAction = { type: "answer"; value; working? } | { type: "hint" } | { type: "continue" };
interface JourneyPort { frame(): PortFrame; act(a: LearnerAction): PortFrame; later(days): PortFrame }
```

| Required capability | How |
|---|---|
| 1. receive a question from OpenPath | `frame()` with stage `question`. OpenPath's `moduleState` chose it. |
| 2. generate a response | `SyntheticLearner.respond(view)` |
| 3. submit through the normal journey | `act({answer})` sends the renderer event `answer_submitted` to the real `SliceFlow`. The real `gradeRequest`, records, decisions and evidence follow. |
| 4. observe the intervention delivered | `frame()` with stage `teaching` (title and text). `learner.observeTeaching` runs once the learner has seen all of it. |
| 5. update hidden state | inside the learner, using the learning model |
| 6. independent rechecks | they arrive as questions; OpenPath decides them |
| 7. advance simulated time | `later(days)`, together with `learner.advance(days)` |
| 8. retention and recovery questions | they arrive as questions when OpenPath schedules them |

**A3 implementation: `A3Port(flow)`.**
- The flow is a **private** field. The harness creates it from OpenPath's own entry question and keeps its own reference only for the after-run report.
- Every action becomes a renderer event: `answer_submitted` with value and working, `hint_requested`, or `skip_requested`. Extra fields on an action are dropped. The adversarial test smuggles a `decision`, `credit`, `assessment.derivationVerified`, `mastery` and a fake certificate line; the real grader still decides, and nothing is recorded as a client claim.
- Nothing is changed in production code. The simulator uses `SliceFlow` exactly as the A3 browser slice and scenario suite do.

## What the A3 interfaces cannot yet support (missing integration points)

1. **Working feedback is not visible.** After D1, the trusted grader attaches `working-assessment@1` to the decision. The renderer's feedback frame does not yet show working feedback, so the learner cannot react to it. `visible()` must pass the learner-visible working message once D1 renders one, as text only, never the evidence object.
2. **The whole-year planner is not driven.** `SliceFlow` is the journey for **one** competency. The app's multi-competency plan (`learnerState.next`, `nextActivity`) is not driven by a renderer-level flow the simulator can use. Today the simulator enters at the module's own diagnostic question. A planner-level flow, or the app's Module view as a headless flow, is needed for whole-curriculum journeys.
3. **Persistence through the real store.** `SliceFlow` keeps records in memory. A Django round trip (as in `m2-persistence.sh`) needs a store-backed port: append through the API, read back with `withDecisions`. Records are already ordinary `learning_record` attempts (tested).
4. **The return time is not learner-visible.** OpenPath's retention due date is internal. The summary frame does not say when to come back, so the return schedule is a harness parameter. A learner-visible "next check" message would let the learner decide its return like a student.
5. **E1 is read-only and out of the learner's reach.** After D1 and E1, the experiment harness (not the learner) reads the E1 sub-skill projection and D1 working assessments for measurement. That needs read access to records after a run, which the harness already has.

**Smallest adapter after D1 + E1:** items 1 and 3, about 30 lines in `adapter.ts`, plus a store-backed `JourneyPort`. No production change is required for the simulator to run.
