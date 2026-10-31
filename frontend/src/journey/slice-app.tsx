import { useState } from "react";
import { createRoot } from "react-dom/client";
import "../math/math.css";
import { LearningScreen } from "../math/components/LearningScreen";
import { moduleFor, question } from "../../../packages/learning/src/content";
import { contentEligibility } from "../../../packages/learning/src/explanation-review";
import { teachingSpec, teachingSteps } from "./renderer-adapter";
import { problemOf } from "../../../packages/learning/src/families";
import { bugValue } from "../learning/adaptive-journey";
import { SliceFlow } from "./flow";
import { SCENARIOS, T0 } from "./scenarios";
import type { LearnerView } from "./learners";

// ?scenario=<id> runs a Milestone 2 scenario's learner; no parameter: the Milestone 1 slice (gen:lin:2,17,11, real clock)
const sid = new URLSearchParams(location.search).get("scenario");
const sc = sid ? SCENARIOS.find((s) => s.id === sid) ?? null : null;
const flow = sc ? new SliceFlow(sc.start, `synthetic-browser-${sc.id}`, T0, { retry: !!sc.retry, entry: sc.entry ?? "diagnostic" }) : new SliceFlow("gen:lin:2,17,11");
const learner = sc?.learner() ?? null;
const asked = new Set<string>();
let rerender: (() => void) | null = null;
// test hooks only (the browser journey asks what the scripted learner would do next, then does it through the screen). The app never reads them.
(window as unknown as { __slice: unknown }).__slice = {
  flow, answer: (q: string) => question(q).answer, options: (q: string) => question(q).options ?? null, trace: () => flow.session.trace,
  /** the scripted learner's next action for the current screen (question: answer / hint; feedback: retry or not) */
  action: () => {
    if (!learner) return null;
    const ev = flow.session.state().evidence(flow.session.competency);
    const v: LearnerView = { q: flow.currentQuestion ?? "", phase: flow.currentPhase, activity: flow.currentActivity, taught: flow.session.events.filter((e) => (e as { record?: string }).record === "teach").length, answered: flow.session.replies.length, hintShown: flow.hintsShown > 0, hintAsked: asked.has(`${flow.frames.length}:${flow.currentQuestion}`), session: flow.session.session, retentionFails: (ev.retentionHistory ?? []).filter((c) => c.result === "failed").length, taughtSkills: flow.session.events.filter((e) => (e as { record?: string }).record === "teach").map((e) => (e as { competency: string }).competency) };
    if (flow.stage === "feedback") return { retry: !!(flow.spec.nav.canGoBack && learner.retry?.(v)) };
    const a = learner.act(v);
    if ("hint" in a) { asked.add(`${flow.frames.length + 1}:${v.q}`); asked.add(`${flow.frames.length}:${v.q}`); }
    return a;
  },
  later: (days: number) => { flow.later(days); rerender?.(); },
  later_days: sc?.later ?? [],
};
(window as unknown as { __bug: unknown }).__bug = (q: string) => bugValue(problemOf(q), new Set(["forgot-divide"]));

function App() {
  const [spec, setSpec] = useState(flow.spec);
  const [, tick] = useState(0);
  rerender = () => { setSpec(flow.spec); tick((n) => n + 1); };
  return <LearningScreen key={flow.frames.length + flow.stage + spec.question.questionId} spec={spec} learningState={flow.learningState} experienceId="algebra" onEvent={(e) => { if (e.type === "input_changed") return; setSpec(flow.on(e)); }} />;
}
// ?explain=<competency>#<strategy> (encoded): one explanation as the learner sees it, every step revealed, with what may be said about its
// review (explanation-review@1) — the rendering check for corrected explanations. Display only: no learner, no records.
const ex = new URLSearchParams(location.search).get("explain");
function Explain({ id }: { id: string }) {
  const [competency, sid0] = id.split("#");
  const m = moduleFor(competency), st = m?.strategies.find((x) => x.id === sid0);
  if (!m || !st) return <p role="alert">No such explanation: {id}</p>;
  const c = contentEligibility(m, st, { competency, usage: "lesson" });
  const spec = teachingSpec(st.guided, st, teachingSteps(st), { message: st.title, detail: c.eligible ? c.label : `Not shown: ${c.failed.join(", ")}`, tone: "encouraging" });
  return <div data-explanation={id} data-eligible={String(c.eligible)} data-status={c.status}>{c.eligible ? <LearningScreen spec={spec} learningState={flow.learningState} experienceId="algebra" onEvent={() => {}} /> : <p role="alert">{spec.teacherGuide?.detail}</p>}</div>;
}
createRoot(document.getElementById("root")!).render(ex ? <Explain id={ex} /> : <App />);
