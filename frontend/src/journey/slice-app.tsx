import { useState } from "react";
import { createRoot } from "react-dom/client";
import "../math/math.css";
import { LearningScreen } from "../math/components/LearningScreen";
import { question } from "../../../packages/learning/src/content";
import { problemOf } from "../../../packages/learning/src/families";
import { bugValue } from "../learning/adaptive-journey";
import { SliceFlow } from "./flow";

const flow = new SliceFlow("gen:lin:2,17,11");
// test hook only: lets the browser journey type the answer a scripted learner would give. The app itself never reads it.
(window as unknown as { __slice: unknown }).__slice = { flow, answer: (q: string) => question(q).answer, options: (q: string) => question(q).options ?? null, trace: () => flow.session.trace };
(window as unknown as { __bug: unknown }).__bug = (q: string) => bugValue(problemOf(q), new Set(["forgot-divide"]));

function App() {
  const [spec, setSpec] = useState(flow.spec);
  const learningState = flow.stage === "feedback" ? "feedback" : flow.stage === "summary" ? "completed" : "independent";
  return <LearningScreen key={flow.frames.length + flow.stage + (spec.question.questionId)} spec={spec} learningState={learningState} experienceId="algebra" onEvent={(e) => { if (e.type === "input_changed") return; setSpec(flow.on(e)); }} />;
}
createRoot(document.getElementById("root")!).render(<App />);
