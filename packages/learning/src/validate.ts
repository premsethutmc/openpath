/**
 * Module validation (validate@1): what a module must have before it can be submitted for educator review. The same
 * rules apply to hand-written and synthesised modules. Mathematical correctness of generated questions is checked by
 * each family's independent check when the question is built; this adds the structure the engine relies on.
 */
import { canonical, isQuestion, question, type Module } from "./content";
import { RETENTION_CHECK } from "./evidence";
import { problemOf } from "./families";
import { graph } from "./graph";
import { moduleQuestions } from "./library";

export const VALIDATION_POLICY = "validate@1";

export function validateModule(m: Module): string[] {
  const out: string[] = [];
  if (!graph.byId.has(m.competency)) return [`unknown competency ${m.competency}`];
  const phases = moduleQuestions(m);
  const all = Object.values(phases).flat();
  for (const id of all) {
    if (!isQuestion(id)) {
      out.push(`unknown question ${id}`);
      continue;
    }
    if (id.startsWith("gen:") && !problemOf(id)) out.push(`${id} is not a supported generated question`);
    const q = question(id);
    if (canonical(q, q.answer) === null) out.push(`${id}: its own answer is not in its answer format`);
  }
  const seen = new Set<string>();
  for (const id of all) {
    if (seen.has(id)) out.push(`${id} is used twice (each phase needs its own questions)`);
    seen.add(id);
  }
  const own = all.filter((id) => !phases.probe.includes(id) && isQuestion(id));
  for (const id of own) if (graph.evidenceTarget(question(id).competency) !== m.competency) out.push(`${id} is about ${question(id).competency}, not ${m.competency}`);
  if (!m.chapter.length) out.push("no chapter");
  if (!m.diagnostics.length || m.diagnostics.length > 3) out.push("Explore needs one to three diagnostic questions");
  if (!m.strategies.length) out.push("no teaching strategy");
  for (const s of m.strategies) {
    if (!s.screens.length) out.push(`strategy ${s.id} has no screens`);
    for (const n of s.needs) if (!phases.probe.includes(n)) out.push(`strategy ${s.id} needs ${n}, which is not one of the module's probes`);
  }
  if (new Set(m.strategies.map((s) => s.id)).size !== m.strategies.length) out.push("two strategies share an id");
  if (m.practice.length < 2) out.push("Practise needs at least two questions");
  if (m.transfer.length < 1) out.push("Verify needs a transfer question");
  if (m.retention.length < RETENTION_CHECK) out.push(`the delayed check needs ${RETENTION_CHECK} questions`);
  // the shared engine demonstrates a skill only in two different contexts (answer formats)
  // (context@2: an everyday-situation form ":w" is a context of its own, as in the evidence ledger)
  const formats = new Set([...phases.check, ...phases.practice, ...phases.transfer, ...phases.retention].filter(isQuestion).map((id) => `${question(id).type}${id.endsWith(":w") ? "-situation" : ""}`));
  if (formats.size < 2) out.push("the questions answered alone need at least two contexts (answer formats, or an everyday situation)");
  return out;
}
