/**
 * Milestone 2 teaching/feedback provenance: every learner-facing text in every frame the renderer was given must come from an owner:
 *   question content (prompt, options, authored hint) | the adaptive engine (a moduleState / recovery reason, a selected strategy's title and screens)
 *   | the grader's decision (verdict, reason code) | a fixed adapter label that states no mathematics (listed below).
 * Returns the violations (empty = every text is traceable). No raw solver output, generated feedback or invented correctness claim can pass.
 */
import { moduleFor, question } from "../../../packages/learning/src/content";
import { HINT_FALLBACK, type SliceFlow } from "./flow";

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
      const want = r?.verdict === "correct" ? "correct" : r?.verdict === "incorrect" ? "incorrect" : "none";
      if (!r || sp.feedback.level !== want) bad.push(`${where}: feedback ${sp.feedback.level} is not the grader's ${r?.verdict}`);
      if (!ADAPTER_LABELS.has(sp.feedback.message ?? "")) bad.push(`${where}: feedback message has no owner`);
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
