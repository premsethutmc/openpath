/**
 * Integration adapter contract (synthetic-adapter@1) and its A3 implementation.
 *
 * The contract is the ONLY surface between a synthetic learner and OpenPath. OpenPath decides what to ask, grades, teaches, rechecks and
 * schedules; the learner only acts as a learner can in the renderer: answer (with optional working), ask for a hint, continue, come back later.
 * Every frame crossing to the learner is LEARNER-VISIBLE content only: question ids, generator references, answer keys, verdict reasons,
 * evidence and learner state are stripped. Nothing the learner sends can carry a verdict, a certificate or a mastery claim: an action is
 * converted to a renderer event (RendererEvent) and the real flow decides what happens with it.
 */
import type { QuestionView } from "./responder";
import type { FeedbackLevel, TeachingView } from "./learner";

export const ADAPTER_CONTRACT = "synthetic-adapter@1" as const;
export type PortFrame =
  | { stage: "question"; question: QuestionView }
  | { stage: "feedback"; feedback: FeedbackLevel }
  | { stage: "teaching"; teaching: TeachingView; step: number }
  | { stage: "summary" };
/** what a learner may do (and nothing else) */
export type LearnerAction = { type: "answer"; value: string; working?: string[] } | { type: "hint" } | { type: "continue" };
export interface JourneyPort {
  readonly contract: typeof ADAPTER_CONTRACT;
  /** 1 (receive a question), 4 (observe the intervention), 6/8 (rechecks, retention and recovery questions arrive as questions) */
  frame(): PortFrame;
  /** 2–3: submit through the normal learner journey (the real grader decides) */
  act(a: LearnerAction): PortFrame;
  /** 7: the learner comes back `days` later (OpenPath's clock and the learner's advance together) */
  later(days: number): PortFrame;
}

// ------------------------------------------------------------------------------------------------ A3 implementation (SliceFlow)
import { SliceFlow } from "../../../frontend/src/journey/flow";
import type { RenderSpec } from "../../../frontend/src/math/types";

const textOf = (spec: RenderSpec) => ((spec as unknown as { working?: { steps?: { description?: string }[] } }).working?.steps ?? []).map((s) => s.description ?? "").join("\n");
/** learner-visible content of a render spec, and nothing else */
export function visible(spec: RenderSpec, stage: SliceFlow["stage"], step = 0): PortFrame {
  const s = spec as unknown as { question?: { prompt?: string }; input?: { type?: string; choices?: { id: string; label: string }[] }; feedback?: { level?: string }; hints?: { available?: boolean; currentLevel?: number }; nav?: { canRequestHint?: boolean }; teacherGuide?: { message?: string } };
  if (stage === "summary") return { stage: "summary" };
  if (stage === "teaching") return { stage: "teaching", step, teaching: { title: String(s.teacherGuide?.message ?? s.question?.prompt ?? ""), text: textOf(spec) } };
  if (stage === "feedback") { const l = s.feedback?.level; return { stage: "feedback", feedback: l === "correct" || l === "incorrect" || l === "unresolved" ? l : "none" }; }
  return { stage: "question", question: { prompt: String(s.question?.prompt ?? ""), input: { type: String(s.input?.type ?? "numeric"), ...(s.input?.choices ? { choices: s.input.choices.map((c) => ({ id: c.id, label: c.label })) } : {}) }, hintAvailable: !!(s.hints?.available && s.nav?.canRequestHint), hintShown: (s.hints?.currentLevel ?? 0) > 0 } };
}
export class A3Port implements JourneyPort {
  readonly contract = ADAPTER_CONTRACT;
  readonly #flow: SliceFlow;
  #step = 0;
  /** `flow` is created by the harness from OpenPath's own module entry question; the port keeps it private (a learner holding the port can
   *  reach nothing but frame / act / later) */
  constructor(flow: SliceFlow) { this.#flow = flow; }
  frame(): PortFrame { return visible(this.#flow.spec, this.#flow.stage, this.#step); }
  act(a: LearnerAction): PortFrame {
    const before = this.#flow.stage;
    if (a.type === "answer" && before === "question") this.#flow.on({ type: "answer_submitted", value: String(a.value), ...(Array.isArray(a.working) && a.working.length ? { working: a.working.map(String) } : {}), timestamp: 0 } as Parameters<SliceFlow["on"]>[0]);
    else if (a.type === "hint" && before === "question") this.#flow.on({ type: "hint_requested", level: 1, timestamp: 0 } as Parameters<SliceFlow["on"]>[0]);
    else if (a.type === "continue" && (before === "feedback" || before === "teaching")) this.#flow.on({ type: "skip_requested", timestamp: 0 } as Parameters<SliceFlow["on"]>[0]);
    this.#step = this.#flow.stage === "teaching" ? (before === "teaching" ? this.#step + 1 : 1) : 0;
    return this.frame();
  }
  later(days: number): PortFrame { this.#flow.later(days); this.#step = this.#flow.stage === "teaching" ? 1 : 0; return this.frame(); }
}
