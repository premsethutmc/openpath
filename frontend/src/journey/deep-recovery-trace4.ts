/**
 * Step-by-step trace of a phase-3 simulation run (research). Rebuilds the run exactly as deep-recovery-sim3.ts does for the same
 * (engine, original, type, seed) and prints one line per step: n, type, decision, question / lesson, skill, sub-skill, right?,
 * path, effort before the step, the engine's reason. The last lines check reachability of the goal independently of the budget.
 *   node --import tsx src/journey/deep-recovery-trace4.ts <engine> <O1|O2> <type> <seed> [budget]
 */
import { question } from "../../../packages/learning/src/content";
import { originalMatcher } from "../../../packages/learning/src/deep-recovery";
import { phasePool, problemKeyOf } from "../../../packages/learning/src/families";
import { graph } from "../../../packages/learning/src/graph";
import { connectedSkill, connectionConfig } from "../../../packages/learning/src/skill-connections";
import { presentedProblems } from "../../../packages/learning/src/skill-units";
import { moduleFor } from "../../../packages/learning/src/content";
import { runDeep } from "./deep-recovery-journey";
import { mulberry32, SimLearner } from "./deep-recovery-sim";
import { ORIGINALS, TYPES } from "./deep-recovery-sim3";
import { right } from "./learners";
import { SliceSession } from "./session";

const sh = (s: string | null | undefined) => (s ?? "-").replace(/^MATH\./, "");
const base = (q: string) => q.replace(/:(mc|w)$/, "");
const subOf = (q: string) => { const c = graph.evidenceTarget(question(base(q)).competency); const cfg = connectionConfig(c); if (!cfg) return "-"; try { return connectedSkill(cfg, base(q))?.replace(/^[a-z-]+\./, "") ?? "unmapped"; } catch { return "?"; } };

export function trace(engine: string, ok: "O1" | "O2", type: string, seed: number, extra: Record<string, unknown> = {}) {
  const O = ORIGINALS[ok];
  const rnd = mulberry32(seed * 7919 + type.length * 31 + (ok === "O1" ? 1 : 2));
  const truth = TYPES[type][ok]!(rnd);
  const pool = phasePool(O.family, "diagnostic");
  const original = pool[Math.floor(rnd() * pool.length)];
  const L = new SimLearner(truth, rnd);
  const s = new SliceSession(`sim3-${engine}-${ok}-${type}-${seed}`, O.own, Date.parse("2026-11-05T09:00:00Z"));
  if ((truth as { history?: boolean }).history) { for (const q of phasePool(O.family, "practice").filter((x) => !x.endsWith(":mc")).slice(0, 3)) s.submit(q, right(q), "practice"); s.wait(3); }
  const confirm = engine === "p3-two-fresh" ? "two-fresh" : engine === "p3-current" ? "current" : "selective";
  const r = runDeep(s, original, (q, c) => L.answer(q, { ...c, answered: s.replies.length }), { confirm, ...extra } as never);
  const lines: string[] = [`# ${engine} ${ok} ${type} seed ${seed} original ${original} roots ${truth.roots.map(sh).join(",")} gap ${truth.gap.map(sh).join(",")}`];
  lines.push("n\ttype\tdecision\titem\tskill\tsub-skill\tright\tpath\teffort-before\treason");
  r.steps.forEach((x, i) => {
    const item = x.kind === "teach" ? `lesson:${x.reason}` : x.qid ?? "-";
    lines.push([i + 1, x.kind === "ask" ? (x.phase.startsWith("module:") ? `module-${x.phase.slice(7)}` : x.phase) : x.kind, x.decision?.phase ?? x.phase, item, sh(x.skill), x.qid ? subOf(x.qid) : "-", x.kind === "ask" ? (x.correct ? "Y" : "N") : "-", x.path, x.decision?.effort ?? "-", (x.decision?.why ?? x.reason ?? "").replace(/\s+/g, " ").slice(0, 140)].join("\t"));
  });
  // reachability, independent of the budget: does a fresh goal question exist, and would this learner answer it right now?
  L.sync(s.events.filter((e) => (e as { record?: string }).record === "teach").map((e) => graph.evidenceTarget((e as { competency: string }).competency)));
  const st = s.state();
  const presented = presentedProblems(st.records, (c) => moduleFor(c) ?? null);
  const match = originalMatcher(original);
  const fresh = ["check", "practice", "transfer", "diagnostic", "retention"].flatMap((ph) => phasePool(O.family, ph as never)).find((q) => !q.endsWith(":mc") && !presented.has(problemKeyOf(q)) && match.accepts(q)) ?? null;
  const counts = { questions: r.steps.filter((x) => x.kind === "ask").length, lessons: r.steps.filter((x) => x.kind === "teach").length };
  lines.push(`# end: ${r.final?.phase} effort ${r.final?.effort} questions ${counts.questions} lessons ${counts.lessons} | learned ${[...L.learned].map(sh).join(",") || "-"}`);
  lines.push(`# reachability: fresh typed goal question ${fresh ?? "NONE"}; learner model would answer it ${fresh ? (L.can(fresh) ? "RIGHT" : "WRONG") : "n/a"} (missing: ${truth.gap.filter((g) => !L.learned.has(g)).map(sh).join(",") || "none"})`);
  return { lines, r, counts, fresh, can: fresh ? L.can(fresh) : null, L, truth };
}

if (process.argv[1]?.endsWith("deep-recovery-trace4.ts")) {
  const [engine, ok, type, seed, budget] = process.argv.slice(2);
  console.log(trace(engine, ok as "O1", type, Number(seed), budget ? { budget: Number(budget) } : {}).lines.join("\n"));
}
