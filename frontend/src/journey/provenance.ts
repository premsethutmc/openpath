/**
 * Milestone 2 teaching/feedback provenance: every learner-facing text in every frame the renderer was given must come from an owner:
 *   question content (prompt, options, authored hint) | the adaptive engine (a moduleState / recovery reason, a selected strategy's title and screens)
 *   | the grader's decision (verdict, reason code) | a fixed adapter label that states no mathematics (listed below)
 *   | the content-review label explanation-review@1 returned for the explanation shown, appended to the engine's reason.
 * Returns the violations (empty = every text is traceable). No raw solver output, generated feedback or invented correctness claim can pass.
 */
import { moduleFor, question } from "../../../packages/learning/src/content";
import { HINT_FALLBACK, type SliceFlow } from "./flow";
import { feedbackFromDecision, workingFeedback } from "./renderer-adapter";
import type { GradingDecision } from "../../../packages/learning/src/grading/decision";

export const ADAPTER_LABELS = new Set([
  "Here is your question.", "Try this one again.", "That matches.", "Not this time.", "Not marked.",
  "That answer is right.", "That is not the answer we are looking for.", "This answer could not be checked automatically, so it was not marked.",
  "Guided practice: help was available, so this is practice, not an independent check. Press Continue to see what the learning engine chooses next.",
  "On your own: no help was given. Press Continue to see what the learning engine chooses next.", "",
]);

export function checkProvenance(f: SliceFlow): string[] {
  const bad: string[] = [];
  const engine = new Set<string>();
  const strategies = new Map<string, { title: string; texts: Set<string> }>();
  for (const t of f.session.trace) {
    const o = t.output as { reason?: string; strategy?: string | null };
    if (typeof o?.reason === "string" && (t.component === "intervention.moduleState" || t.component === "intervention.recovery")) engine.add(o.reason);
    if (t.component === "intervention.moduleState" && o.strategy) {
      const comp = (t.input as { competency: string }).competency;
      const st = moduleFor(comp)?.strategies.find((s) => s.id === o.strategy);
      if (st) strategies.set(st.id, { title: st.title, texts: new Set(st.screens.flatMap((s) => [...s.text.map((x, j) => (j === 0 ? `${s.title} — ${x}` : x)), ...(s.math ?? [])])) });
    }
  }
  // explanation-review@1: the label is the content gate's own sentence, appended to the engine's reason for the explanation
  const labels = new Set(["Demonstration: this explanation has not been approved by an educator.", ...f.session.trace.filter((t) => t.component === "explanation-review.contentEligibility").map((t) => (t.output as { label?: string }).label ?? "")]);
  for (const r of [...engine]) for (const l of labels) engine.add(`${r} ${l}`);
  let reply = 0;
  f.frames.forEach((fr, i) => {
    const sp = fr.spec, where = `frame ${i} (${fr.stage})`;
    const g = sp.teacherGuide;
    const strat = fr.strategyId ? strategies.get(fr.strategyId) : undefined;
    if (g) {
      if (!(ADAPTER_LABELS.has(g.message) || engine.has(g.message) || (strat && g.message === strat.title))) bad.push(`${where}: guide "${g.message.slice(0, 60)}" has no owner`);
      if (g.detail !== undefined && !(ADAPTER_LABELS.has(g.detail) || engine.has(g.detail))) bad.push(`${where}: guide detail "${g.detail.slice(0, 60)}" has no owner`);
    }
    if (fr.stage === "question" || fr.stage === "feedback") {
      const q = question(fr.qid!);
      if (sp.question.prompt !== q.prompt) bad.push(`${where}: prompt differs from the question`);
      for (const h of sp.hints.hints) if (h.text !== (q.hint ?? HINT_FALLBACK)) bad.push(`${where}: hint text has no owner`);
      if (sp.input.type === "multiple-choice" && JSON.stringify(sp.input.choices?.map((c) => c.label)) !== JSON.stringify(q.options)) bad.push(`${where}: choices differ from the question`);
    }
    if (fr.stage === "feedback") {
      const r = f.session.replies[reply++];
      // D1: an unmarked answer whose working the grader judged is shown as "partial" (not marked), never as right or wrong
      const want = r?.verdict === "correct" ? "correct" : r?.verdict === "incorrect" ? "incorrect" : r?.decision ? feedbackFromDecision(r.decision as GradingDecision).level : "none";
      if (!r || sp.feedback.level !== want || (want === "partial" && r.verdict !== "unresolved")) bad.push(`${where}: feedback ${sp.feedback.level} is not the grader's ${r?.verdict}`);
      const wf = r?.decision ? workingFeedback(r.decision as GradingDecision) : null;
      if (!ADAPTER_LABELS.has(sp.feedback.message ?? "") && sp.feedback.message !== wf?.message) bad.push(`${where}: feedback message has no owner`);
      // the learner's lines shown with the feedback are exactly the decision's working record, and "verified" only where a replayed certificate says so
      if ((sp.working?.steps.length ?? 0) > 0 && JSON.stringify(sp.working!.steps) !== JSON.stringify(wf?.steps ?? [])) bad.push(`${where}: working shown is not the decision's`);
      for (const [i, st] of (sp.working?.steps ?? []).entries()) if (st.verified && !(r?.decision?.working?.replayed && i < r.decision.working.replayedLines && r.decision.working.lines[i]?.status.startsWith("certified"))) bad.push(`${where}: a working line shown as checked without a replayed certificate`);
      if (r && sp.feedback.evidence && !sp.feedback.evidence.endsWith(`(${r.reason})`)) bad.push(`${where}: feedback reason is not the decision's`);
      if (sp.feedback.verified && !(r?.decision?.certified)) bad.push(`${where}: "verified" without a certified decision`);
    } else if (sp.feedback.level !== "none") bad.push(`${where}: a verdict shown without an answer`);
    if (fr.stage === "teaching") {
      if (!strat) { bad.push(`${where}: teaching without an engine-selected strategy`); return; }
      for (const s of sp.working?.steps ?? []) {
        if (s.verified) bad.push(`${where}: a teaching step claims verification`);
        const text = s.math?.plain ? s.math.plain : s.description;
        if (!strat.texts.has(text)) bad.push(`${where}: step "${text.slice(0, 50)}" is not in the selected strategy`);
      }
    }
  });
  return bad;
}
