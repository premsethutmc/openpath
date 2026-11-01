/**
 * S2 integration adapter (synthetic-adapter@2, research). Same contract as S1's JourneyPort; what changes is WHAT the learner may see after an
 * answer, now that D1 shows working feedback in the real journey: the feedback level (incl. "partial"), the feedback MESSAGE the renderer shows,
 * and the learner's own working lines as marked in the working panel (description + badge). Explanations: title, step texts AND worked lines.
 * Nothing else crosses: no question id, generator reference, decision object, working-assessment object, evidence or learner state.
 */
import { SliceFlow } from "../../../../../frontend/src/journey/flow";
import type { RenderSpec } from "../../../../../frontend/src/math/types";
import type { QuestionView } from "../../../src/responder";
import type { LearnerAction } from "../../../src/adapter";

export const S2_ADAPTER_CONTRACT = "synthetic-adapter@2" as const;
export type FeedbackLevel2 = "correct" | "incorrect" | "partial" | "unresolved" | "none";
export interface WorkingMark { text: string; mark: string }
export type Frame2 =
  | { stage: "question"; question: QuestionView }
  | { stage: "feedback"; feedback: FeedbackLevel2; message: string; marks: WorkingMark[] }
  | { stage: "teaching"; teaching: { title: string; text: string }; step: number }
  | { stage: "summary"; message: string };
type S = { question?: { prompt?: string }; input?: { type?: string; choices?: { id: string; label: string }[] }; feedback?: { level?: string; message?: string }; hints?: { available?: boolean; currentLevel?: number }; nav?: { canRequestHint?: boolean }; teacherGuide?: { message?: string }; working?: { steps?: { description?: string; badge?: string; math?: { plain?: string } }[] } };
/** learner-visible content only */
export function visible2(spec: RenderSpec, stage: SliceFlow["stage"], step = 0): Frame2 {
  const s = spec as unknown as S;
  if (stage === "summary") return { stage: "summary", message: String(s.teacherGuide?.message ?? "") };
  if (stage === "teaching") return { stage: "teaching", step, teaching: { title: String(s.teacherGuide?.message ?? s.question?.prompt ?? ""), text: (s.working?.steps ?? []).map((w) => (w.math?.plain ? w.math.plain : w.description ?? "")).join("\n") } };
  if (stage === "feedback") {
    const l = s.feedback?.level;
    return { stage: "feedback", feedback: l === "correct" || l === "incorrect" || l === "partial" || l === "unresolved" ? l : "none", message: String(s.feedback?.message ?? ""),
      marks: (s.working?.steps ?? []).map((w) => ({ text: w.math?.plain || String(w.description ?? "").replace(/^[^:]*:\s*/, ""), mark: String(w.description ?? "").split(":")[0] })) };
  }
  return { stage: "question", question: { prompt: String(s.question?.prompt ?? ""), input: { type: String(s.input?.type ?? "numeric"), ...(s.input?.choices ? { choices: s.input.choices.map((c) => ({ id: c.id, label: c.label })) } : {}) }, hintAvailable: !!(s.hints?.available && s.nav?.canRequestHint), hintShown: (s.hints?.currentLevel ?? 0) > 0 } };
}
export class D1Port {
  readonly contract = S2_ADAPTER_CONTRACT;
  readonly #flow: SliceFlow;
  #step = 0;
  constructor(flow: SliceFlow) { this.#flow = flow; }
  frame(): Frame2 { return visible2(this.#flow.spec, this.#flow.stage, this.#step); }
  act(a: LearnerAction): Frame2 {
    const before = this.#flow.stage;
    if (a.type === "answer" && before === "question") this.#flow.on({ type: "answer_submitted", value: String(a.value), ...(Array.isArray(a.working) && a.working.length ? { working: a.working.map(String) } : {}), timestamp: 0 } as Parameters<SliceFlow["on"]>[0]);
    else if (a.type === "hint" && before === "question") this.#flow.on({ type: "hint_requested", level: 1, timestamp: 0 } as Parameters<SliceFlow["on"]>[0]);
    else if (a.type === "continue" && (before === "feedback" || before === "teaching")) this.#flow.on({ type: "skip_requested", timestamp: 0 } as Parameters<SliceFlow["on"]>[0]);
    this.#step = this.#flow.stage === "teaching" ? (before === "teaching" ? this.#step + 1 : 1) : 0;
    return this.frame();
  }
  later(days: number): Frame2 { this.#flow.later(days); this.#step = this.#flow.stage === "teaching" ? 1 : 0; return this.frame(); }
}

/**
 * The delayed-check fact a learner can read in the app (frontend/src/year/Main.tsx:593, the topic page "delayed check" fact), from OpenPath's
 * own evidence, in the same words and at the same granularity: a DATE (no time of day) when scheduled. This is the only scheduling information
 * the learner gets; OpenPath's exact due instant is not shown (recorded as a product gap).
 */
export type DelayedCheckFact = { label: "Not yet" } | { label: "scheduled"; date: string } | { label: "Due now" } | { label: "Passed" } | { label: "Missed" };
export function delayedCheckFact(e: { retention: string; retentionDueAt: string | null }): DelayedCheckFact {
  if (e.retention === "none") return { label: "Not yet" };
  if (e.retention === "scheduled") return { label: "scheduled", date: String(e.retentionDueAt).slice(0, 10) };
  if (e.retention === "due") return { label: "Due now" };
  if (e.retention === "passed") return { label: "Passed" };
  return { label: "Missed" };
}
