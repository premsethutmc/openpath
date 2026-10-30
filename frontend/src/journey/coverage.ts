/**
 * Milestone 2 generalization: the same generic learners and checks over a connected set of competencies (arithmetic foundations -> linear
 * equations). No per-competency code: the start question is the engine's own first question for an empty record, the misconception learner uses
 * whatever the question's family models, and the checks are the scenario suite's. `newLogicNeeded` counts competencies that would need
 * question- or competency-specific code to pass (0 means the architecture is reused as it is).
 */
import { moduleFor, question } from "../../../packages/learning/src/content";
import { problemOf } from "../../../packages/learning/src/families";
import { graph, walkSupports } from "../../../packages/learning/src/graph";
import { moduleState } from "../../../packages/learning/src/intervention";
import { readRecords } from "../../../packages/learning/src/records";
import { evidenceFor } from "../../../packages/learning/src/evidence";
import { teachingEligibility } from "../../../packages/learning/src/teaching-contract";
import { learners } from "./learners";
import { checkScenario, runScenario, T0, type Scenario } from "./scenarios";

export const COMPETENCIES = [
  "MATH.number.place-value-tens", "MATH.number.addition-regroup", "MATH.number.multiplication-tables", "MATH.number.multi-multiplication",
  "MATH.number.division-remainders", "MATH.number.order-of-operations", "MATH.number.integers", "MATH.number.integer-add",
  "MATH.number.integer-multiply", "MATH.number.rational-numbers", "MATH.algebra.missing-number", "MATH.algebra.variables",
  "MATH.algebra.expressions-intro", "MATH.algebra.algebra-simplify", "MATH.algebra.linear-intro", "MATH.algebra.linear-equations", "MATH.algebra.linear-rational",
];
export type Support = "fully supported" | "supported with documented limitations" | "demonstration-only" | "unsupported";
export interface Coverage { id: string; name: string; support: Support; start: string | null; limitations: string[]; learners: { name: string; ended: string | null; status: string; failed: string[] }[]; strategies: { total: number; machineChecked: number; eligible: number }; grading: Record<string, number>; prerequisitesInSet: string[]; newLogicNeeded: boolean }

export function firstQuestion(c: string): string | null {
  const recs = readRecords("synthetic-coverage", []);
  const ev = evidenceFor("synthetic-coverage", recs, T0);
  return moduleState(c, recs, ev.get(c), T0, "s1").question;
}

export function coverage(c: string): Coverage {
  const m = moduleFor(c);
  const name = graph.get(c)?.name ?? c;
  const base = { id: c, name, start: null, learners: [], strategies: { total: 0, machineChecked: 0, eligible: 0 }, grading: {}, prerequisitesInSet: walkSupports(c, 1).map((s) => s.id).filter((x) => COMPETENCIES.includes(x)), newLogicNeeded: false };
  if (!m) return { ...base, support: "unsupported", limitations: ["no learning module"] };
  const start = firstQuestion(c);
  if (!start) return { ...base, support: "unsupported", limitations: ["the engine has no first question for an empty record"] };
  const el = m.strategies.map((s) => teachingEligibility(m, s));
  const strategies = { total: el.length, machineChecked: el.filter((e) => e.checked).length, eligible: el.filter((e) => e.checked && e.eligible).length };
  const bugs = (problemOf(start)?.bugs ?? []).filter((b) => b.predict !== null).map((b) => b.id);
  const runs: [string, Scenario][] = [
    ["strong", { id: `cov-${c}-strong`, category: 1, start, learner: () => learners.strong(), expect: { mastery: "required" } }],
    ["misconception", { id: `cov-${c}-misc`, category: 2, start, learner: () => (bugs.length ? learners.misconception(bugs.slice(0, 1), 1) : learners.misconception([], 1, "wrong")), expect: {} }],
    ["never right", { id: `cov-${c}-wrong`, category: 5, start, learner: () => learners.alwaysWrong(), expect: { mastery: "forbidden" } }],
    ["forgets", { id: `cov-${c}-forget`, category: 6, start, learner: () => learners.slipOnRetention(), later: [8], expect: { retention: "failed-then-new-cycle" } }],
    ["unreadable", { id: `cov-${c}-unread`, category: 2, start, learner: () => learners.unreadable(), expect: { mastery: "forbidden", ended: ["pause"] } }],
  ];
  const grading: Record<string, number> = {};
  const lr = runs.map(([n, s]) => {
    const r = runScenario(s);
    for (const x of r.f.session.replies) grading[x.source] = (grading[x.source] ?? 0) + 1;
    const failed = checkScenario(r).filter((v) => !v.ok).map((v) => `${v.property}: ${v.detail}`);
    return { name: n, ended: r.f.ended?.phase ?? null, status: r.f.session.state().evidence(graph.evidenceTarget(question(start).competency)).status, failed };
  });
  const limitations: string[] = [];
  if (!bugs.length) limitations.push("the first question's family models no misconception (diagnosis can only tell right from wrong)");
  if (strategies.eligible === 0) limitations.push("no machine-checked eligible explanation");
  else if (strategies.eligible < strategies.total) limitations.push(`${strategies.total - strategies.eligible} of ${strategies.total} explanations not machine-checked-eligible`);
  const held = (grading.held ?? 0) + (grading.educator ?? 0) + (grading.unknown ?? 0);
  if (held) limitations.push(`${held} answer(s) not decided automatically (held / educator)`);
  const forget = lr.find((x) => x.name === "forgets")!;
  const anyFail = lr.some((x) => x.failed.length);
  const support: Support = anyFail ? (lr.filter((x) => x.failed.length).length >= 3 ? "unsupported" : "demonstration-only")
    : strategies.eligible === 0 ? "demonstration-only"           // it can be practised and checked, but no explanation it teaches is machine-checked
    : limitations.length ? "supported with documented limitations" : "fully supported";
  if (forget.failed.length) limitations.push("delayed-retention recovery did not complete");
  return { ...base, support, start, limitations, learners: lr, strategies, grading, newLogicNeeded: anyFail };
}
