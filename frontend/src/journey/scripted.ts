/** The scripted LEARNER for the slice (the only scripted element): the "forgot-divide" misconception until an explanation has been shown, right answers after. */
import { question } from "../../../packages/learning/src/content";
import { problemOf } from "../../../packages/learning/src/families";
import { bugValue } from "../learning/adaptive-journey";
import { SliceFlow } from "./flow";

export const SLICE_QUESTION = "gen:lin:2,17,11"; // Solve 2x + 17 = 39. What is x?  (answer 11; forgot-divide predicts 22)
const BUG = new Set(["forgot-divide"]);
export const answerFor = (qid: string, taught: boolean) => String((taught ? null : bugValue(problemOf(qid), BUG)) ?? question(qid).answer);

export function runScripted(opts: { now?: number } = {}): SliceFlow {
  const f = new SliceFlow(SLICE_QUESTION, "synthetic-slice-1", opts.now);
  let taught = false;
  for (let i = 0; i < 60 && f.stage !== "summary"; i++) {
    if (f.stage === "question") f.on({ type: "answer_submitted", value: answerFor(f.frames.at(-1)!.qid!, taught), timestamp: 0 });
    else { if (f.stage === "teaching") taught = true; f.on({ type: "skip_requested", timestamp: 0 }); }
  }
  return f;
}
