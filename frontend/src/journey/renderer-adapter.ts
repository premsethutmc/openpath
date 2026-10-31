/**
 * Display-only adapter: real question / grading decision / teaching strategy -> the renderer's RenderSpec.
 * Nothing here judges. Correctness shown comes ONLY from a grading-decision@1; method shown as verified comes ONLY from an authorized
 * derivation; teaching text is the selected strategy's own screens; every sentence of guidance is supplied (teacherGuide), none invented.
 */
import { question } from "../../../packages/learning/src/content";
import type { Screen, Strategy } from "../../../packages/learning/src/content";
import type { GradingDecision } from "../../../packages/learning/src/grading/decision";
import { taskStatement, type WorkingAssessment } from "../../../packages/learning/src/grading/working";
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
    // D1: a question whose task the derivation authority reads also takes working lines, judged by the trusted grader
    input: choices ? { type: "multiple-choice", choices } : taskStatement(qid) !== null ? { type: "numeric", placeholder: "x = ?   or working: 3x = 15; x = 5", showKeypad: true, acceptsWorking: true } : { type: "numeric", placeholder: "x = ?", showKeypad: true },
    feedback: o.feedback ?? { level: "none", verified: false },
    hints: noHints,
    nav: { canSubmit: true, canSkip: false, canGoBack: false, canRequestHint: false, canShowWorking: false },
    a11y: { questionLabel: q.prompt },
    ...(o.progress ? { progress: o.progress } : {}),
    ...(o.guide ? { teacherGuide: o.guide } : {}),
  };
}

/** The decision's verdict as the renderer's feedback level. `unresolved` / `pending-educator` is "none": the renderer never turns it into right or wrong.
 *  D1: when the trusted grader judged working (decision.working), the message also says what was established about the method, from that record only. */
export function feedbackFromDecision(d: GradingDecision): FeedbackState {
  const verified = d.contract?.keyAuthority === "independent-kernel" && d.certified === true;
  const wf = workingFeedback(d);
  if (d.verdict === "correct") return { level: "correct", verified, message: wf?.message ?? "That answer is right.", evidence: `Marked by the answer checker (${d.reason})` };
  if (d.verdict === "incorrect") return { level: "incorrect", verified, message: wf?.message ?? "That is not the answer we are looking for.", evidence: `Marked by the answer checker (${d.reason})` };
  // an unmarked answer with judged working (a valid partial derivation, or working the authority cannot read) is shown, never as right or wrong
  if (wf && d.working && (d.working.status === "partial" || d.working.status === "unsupported" || d.working.status === "invalid" || d.working.status === "verified")) return { level: "partial", verified: false, message: wf.message, evidence: `Not marked by the answer checker (${d.reason})` };
  return { level: "none", verified: false, message: "This answer could not be checked automatically, so it was not marked.", evidence: `Held by the answer checker (${d.reason})` };
}

const shown = (s: string) => s.replace(/\s*-\s*/g, " − ").replace(/^ − /, "−").replace(/\(\s*−\s*/g, "(−").replace(/=\s*−\s+/g, "= −");
/** What the trusted decision establishes about the working, in words, and the learner's own lines marked as the authority judged them.
 *  Every sentence is a fixed template filled ONLY from decision.working (and the verdict); nothing about reasoning the learner did not write. */
export function workingFeedback(d: GradingDecision | null | undefined): { message: string; steps: WorkingStep[] } | null {
  const w: WorkingAssessment | undefined = d?.working;
  if (!d || !w) return null;
  const sub = w.substitution && !w.substitution.holds
    ? `Put ${w.substitution.variable} = ${w.substitution.value} into ${shown(w.statement ?? "")}: the left side is ${shown(w.substitution.leftValue)} and the right side is ${shown(w.substitution.rightValue)}, so they are not equal and ${w.substitution.variable} = ${w.substitution.value} is not the solution.`
    : null;
  const parts: string[] = [];
  if (d.verdict === "correct") parts.push("That answer is right.");
  else if (d.verdict === "incorrect") parts.push(sub ?? "That is not the answer we are looking for.");
  else parts.push("No final answer was marked.");
  const fi = w.firstInvalid;
  if (w.status === "none" || w.status === "answer-only") { if (d.verdict === "correct") parts.push("You gave the answer only, so your method was not checked."); }
  else if (w.status === "verified") parts.push(w.agreesWithResponse === false ? "Every line of your working was checked, but the working ends with a different answer from the one you gave." : "Every line of your working was checked: each one follows from the line before.");
  else if (w.status === "partial") parts.push("Your working is right so far: each line follows from the line before. It is not finished: it does not end with the answer yet. Next step: get the unknown on its own.");
  else if (w.status === "invalid" && fi) {
    const v = w.substitution?.variable ?? "x";
    const why = fi.lost !== null ? `${v} = ${shown(fi.lost)} makes ${shown(fi.from)} true but not ${shown(fi.text)}` : fi.gained !== null ? `${v} = ${shown(fi.gained)} makes ${shown(fi.text)} true but not ${shown(fi.from)}` : "it does not follow from the line before";
    parts.push(`${d.verdict === "correct" ? "But a step in your working is not right. " : ""}The first step that does not follow is ${shown(fi.text)}: ${why}, so this step changed the solution.`);
  } else if (w.status === "unsupported") parts.push("Your working could not be checked automatically, so it is not marked right or wrong. Writing each step as an equation on its own line, ending with the answer, lets it be checked.");
  const steps: WorkingStep[] = w.status === "none" ? [] : w.lines.map((l, i) => {
    const ok = l.status.startsWith("certified") && i < w.replayedLines && w.status !== "answer-only";
    const bad = fi?.index === i;
    const desc = bad ? "First step that does not follow" : ok ? "Checked: follows from the line before" : l.status === "answer-only" ? "Your answer" : fi && i > fi.index ? "Not checked: comes after a step that does not follow" : "Not checked";
    const words = /[A-Za-z]{2,}/.test(l.text) || /=>|→/.test(l.text);
    return { id: `working:${i}`, description: words ? `${desc}: ${l.text}` : desc, math: { plain: words ? "" : shown(l.text), ...(words ? {} : { latex: shown(l.text) }) }, verified: ok, badge: bad ? "invalid" : "not checked" };
  });
  return { message: parts.join(" "), steps };
}

/** The selected strategy's screens as progressive working steps. `verified` is false: a teaching screen is not a derivation. */
export function teachingSpec(qid: string, strategy: Strategy, revealed: number, guide: RenderSpec["teacherGuide"]): RenderSpec {
  // one revealable step per line of the selected explanation: its text lines, then its worked-math lines (all verbatim from the strategy)
  const steps: WorkingStep[] = strategy.screens.flatMap((s: Screen, i) => [
    ...s.text.map((t, j) => ({ id: `${strategy.id}:${i}:t${j}`, description: j === 0 ? `${s.title} — ${t}` : t, math: { plain: "" }, verified: false as const, badge: "explanation" })),
    // a worked line that is a sentence ("Not 14/45, but −14/45", "Undo the adding: take away") is shown as text: typeset, it loses its spaces
    ...(s.math ?? []).map((m, j) => (/[A-Za-z]{2,}/.test(m)
      ? { id: `${strategy.id}:${i}:m${j}`, description: m, math: { plain: "" }, verified: false as const, badge: "explanation" }
      : { id: `${strategy.id}:${i}:m${j}`, description: "Worked line", math: { plain: m, latex: m }, verified: false as const, badge: "explanation" })),
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
