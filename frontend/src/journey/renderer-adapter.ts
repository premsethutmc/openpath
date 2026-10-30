/**
 * Display-only adapter: real question / grading decision / teaching strategy -> the renderer's RenderSpec.
 * Nothing here judges. Correctness shown comes ONLY from a grading-decision@1; method shown as verified comes ONLY from an authorized
 * derivation; teaching text is the selected strategy's own screens; every sentence of guidance is supplied (teacherGuide), none invented.
 */
import { question } from "../../../packages/learning/src/content";
import type { Screen, Strategy } from "../../../packages/learning/src/content";
import type { GradingDecision } from "../../../packages/learning/src/grading/decision";
import { RENDER_SCHEMA_VERSION, type FeedbackState, type RenderSpec, type WorkingStep } from "../math/types";

const noHints = { available: false, totalLevels: 0, currentLevel: 0, hints: [] };
const plainOf = (prompt: string) => !/^Solve\s/i.test(prompt) ? "" : prompt.replace(/\s*What is [a-z]\?.*$/is, "").replace(/^Solve\s+/i, "").replace(/\.$/, "");

export function questionSpec(qid: string, o: { feedback?: FeedbackState; guide?: RenderSpec["teacherGuide"]; progress?: RenderSpec["progress"]; lead?: string } = {}): RenderSpec {
  const q = question(qid);
  const choices = q.options?.length ? q.options.map((label, i) => ({ id: "ABCD"[i], label, mathContent: { plain: label } })) : undefined;
  return {
    schemaVersion: RENDER_SCHEMA_VERSION,
    question: { questionId: qid, prompt: o.lead ?? q.prompt, expression: { plain: plainOf(q.prompt) }, generatorRef: qid },
    mode: "guided",
    locale: "en",
    layout: { panels: ["question", "input", "feedback", "nav", ...(o.progress ? (["progress"] as const) : [])] },
    input: choices ? { type: "multiple-choice", choices } : { type: "numeric", placeholder: "x = ?", showKeypad: true },
    feedback: o.feedback ?? { level: "none", verified: false },
    hints: noHints,
    nav: { canSubmit: true, canSkip: false, canGoBack: false, canRequestHint: false, canShowWorking: false },
    a11y: { questionLabel: q.prompt },
    ...(o.progress ? { progress: o.progress } : {}),
    ...(o.guide ? { teacherGuide: o.guide } : {}),
  };
}

/** The decision's verdict as the renderer's feedback level. `unresolved` / `pending-educator` is "none": the renderer never turns it into right or wrong. */
export function feedbackFromDecision(d: GradingDecision): FeedbackState {
  const verified = d.contract?.keyAuthority === "independent-kernel" && d.certified === true;
  if (d.verdict === "correct") return { level: "correct", verified, message: "That answer is right.", evidence: `Marked by the answer checker (${d.reason})` };
  if (d.verdict === "incorrect") return { level: "incorrect", verified, message: "That is not the answer we are looking for.", evidence: `Marked by the answer checker (${d.reason})` };
  return { level: "none", verified: false, message: "This answer could not be checked automatically, so it was not marked.", evidence: `Held by the answer checker (${d.reason})` };
}

/** The selected strategy's screens as progressive working steps. `verified` is false: a teaching screen is not a derivation. */
export function teachingSpec(qid: string, strategy: Strategy, revealed: number, guide: RenderSpec["teacherGuide"]): RenderSpec {
  // one revealable step per line of the selected explanation: its text lines, then its worked-math lines (all verbatim from the strategy)
  const steps: WorkingStep[] = strategy.screens.flatMap((s: Screen, i) => [
    ...s.text.map((t, j) => ({ id: `${strategy.id}:${i}:t${j}`, description: j === 0 ? `${s.title} — ${t}` : t, math: { plain: "" }, verified: false as const, badge: "explanation" })),
    ...(s.math ?? []).map((m, j) => ({ id: `${strategy.id}:${i}:m${j}`, description: "Worked line", math: { plain: m, latex: m }, verified: false as const, badge: "explanation" })),
  ]);
  const base = questionSpec(qid, { guide, lead: strategy.title });
  return {
    ...base,
    question: { ...base.question, expression: { plain: "" } },
    layout: { panels: ["question", "working", "nav"] },
    nav: { canSubmit: false, canSkip: true, skipLabel: revealed < teachingSteps(strategy) ? "Show next step" : "Continue", canGoBack: false, canRequestHint: false, canShowWorking: true },
    working: { steps, revealedCount: Math.max(1, Math.min(revealed, steps.length)), editable: false },
  };
}

export const teachingSteps = (st: Strategy) => st.screens.reduce((n, s) => n + s.text.length + (s.math?.length ?? 0), 0);
