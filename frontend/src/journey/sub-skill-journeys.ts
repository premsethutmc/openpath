/**
 * Workstream E1: learner journeys for the sub-skill projection. Only what the learner answers is scripted (per question family); grading,
 * evidence, the adaptive engine, teaching, rechecks and retention are the real components (flow.ts / session.ts, unchanged). The
 * projection (sub-skill-evidence.ts, non-authoritative) is then computed from the session's events, decisions inside, as Django stores them.
 */
import { moduleFor, question } from "../../../packages/learning/src/content";
import { problemOf } from "../../../packages/learning/src/families";
import { subSkillProjection, type Projection } from "../../../packages/learning/src/sub-skill-evidence";
import { learners, right, wrong, type Learner } from "./learners";
import { runScenario, T0, type Run } from "./scenarios";
import { SliceSession } from "./session";

const famOf = (q: string) => problemOf(q.replace(/:(mc|w)$/, ""))?.family ?? "authored";
/** right on the families listed, readable-wrong on every other family */
const onlyFamilies = (fams: string[]): Learner => ({ name: `right only on ${fams.join(", ")}`, act: (v) => ({ answer: fams.includes(famOf(v.q)) ? right(v.q) : wrong(v.q) }) });

export interface E1Journey { id: string; title: string; kind: "flow" | "records"; run: () => { learnerId: string; events: unknown[]; now: number; extra?: Record<string, unknown> } }
const flow = (id: string, start: string, learner: () => Learner, later?: number[]) => () => {
  const r: Run = runScenario({ id, category: 5, start, learner, expect: {}, ...(later ? { later } : {}) });
  const s = r.f.session;
  // the events as stored: each attempt carries the server's decision (learning.py puts it in the immutable event body)
  const events = s.events.map((e) => { const k = (e as { id?: string }).id; return k && s.decisions[k] ? { ...e, decision: s.decisions[k] } : e; });
  return { learnerId: s.learnerId, events, now: s.now, extra: { ended: r.f.ended?.phase ?? null, teaching: (s.events as unknown as { record: string; strategy?: string }[]).filter((e) => e.record === "teach").map((e) => e.strategy) } };
};
/** answers given straight to the real session (grader, records, evidence): for evidence shapes the adaptive engine would not produce on its own */
const direct = (id: string, competency: string, subs: [string, string, { activity?: string; hints?: number; working?: string[] }?][], days: number[] = []) => () => {
  const s = new SliceSession(`synthetic-e1-${id}`, competency, T0);
  let k = 0;
  for (const [q, a, o] of subs) {
    if (days[k]) s.wait(days[k]);
    s.submit(q, a, (o?.activity ?? "practice") as never, { ...(o?.hints ? { hints: o.hints } : {}), ...(o?.working ? { working: o.working } : {}) });
    k++;
  }
  const events = s.events.map((e) => { const i = (e as { id?: string }).id; return i && s.decisions[i] ? { ...e, decision: s.decisions[i] } : e; });
  return { learnerId: s.learnerId, events, now: s.now };
};
const LIN = "gen:lin:2,17,11";
const ONE = moduleFor("MATH.algebra.linear-intro")!;
const oneStep = [...new Set([...ONE.diagnostics, ...ONE.practice])].filter((q) => !q.endsWith(":mc")).slice(0, 4);

export const E1_JOURNEYS: E1Journey[] = [
  { id: "E1-01", kind: "records", title: "Two-step equations only (four ax + b = c right on their own)", run: direct("E1-01", "MATH.algebra.linear-equations", ["gen:lin:3,3,2", "gen:lin:2,17,11", "gen:lin:7,18,9", "gen:lin:6,17,2"].map((q) => [q, right(q)])) },
  { id: "E1-02", kind: "flow", title: "Module journey: right on two-step, wrong on both-sides and brackets", run: flow("E1-02", LIN, () => onlyFamilies(["lin", "auleq", "aulwp"])) },
  { id: "E1-03", kind: "flow", title: "Same learner, back 8 days later for the delayed check", run: flow("E1-03", LIN, () => onlyFamilies(["lin", "auleq", "aulwp"]), [8]) },
  { id: "E1-04", kind: "records", title: "One-step equations only (linear-intro), then nothing on linear equations", run: direct("E1-04", "MATH.algebra.linear-intro", oneStep.map((q) => [q, right(q)])) },
  { id: "E1-05", kind: "records", title: "Brackets right only with help (hints / guided)", run: direct("E1-05", "MATH.algebra.linear-equations", [["gen:lbrk:5,-4,2,1", right("gen:lbrk:5,-4,2,1"), { hints: 1 }], ["gen:lbrk:4,4,2,2", right("gen:lbrk:4,4,2,2"), { activity: "guided" }], ["gen:lbrk:5,-5,1,10", right("gen:lbrk:5,-5,1,10"), { hints: 1 }]]) },
  { id: "E1-06", kind: "flow", title: "Strong on every family, back 8 days later", run: flow("E1-06", LIN, () => learners.strong(), [8]) },
  { id: "E1-07", kind: "flow", title: "Fails the delayed check, then recovers", run: flow("E1-07", LIN, () => learners.slipOnRetention(), [8]) },
  { id: "E1-08", kind: "records", title: "Shown on brackets, later wrong twice alone (lapsed), history kept", run: direct("E1-08", "MATH.algebra.linear-equations", [["gen:lbrk:5,-4,2,1", right("gen:lbrk:5,-4,2,1")], ["gen:lbrk:4,4,2,2", right("gen:lbrk:4,4,2,2")], ["gen:lbrk:5,-5,1,10", wrong("gen:lbrk:5,-5,1,10")], ["gen:lbrk:4,3,3,4", wrong("gen:lbrk:4,3,3,4")]]) },
];

/** the compact trace of a journey: the answers by family, the production status and the projection */
export function e1Trace(j: E1Journey) {
  const r = j.run();
  const p: Projection = subSkillProjection(r.learnerId, r.events as { kind: string }[], r.now);
  const attempts = (r.events as { record?: string; questionId?: string; response?: string; activity?: string; hints?: number; decision?: { verdict?: string } }[]).filter((e) => e.record === "attempt");
  return {
    id: j.id, title: j.title, kind: j.kind, learnerId: r.learnerId, ...(r.extra ?? {}),
    answered: attempts.map((a) => ({ q: a.questionId!, family: famOf(a.questionId!), activity: a.activity, hints: a.hints ?? 0, verdict: a.decision?.verdict ?? null })),
    production: p.competencies.map((c) => ({ competency: c.competency, ...c.production })),
    projection: { subSkills: p.subSkills.map((s) => ({ id: s.id, status: s.status, answers: s.answers, firstShownAt: s.firstShownAt, retention: s.retention, checkNeeds: s.checkNeeds, history: s.retentionHistory.map((h) => h.result), alone: s.alone, method: Object.fromEntries(Object.entries(s.method).filter(([, n]) => n)) })), competencies: p.competencies.map((c) => ({ competency: c.competency, supports: c.supports, shown: c.shown, missing: c.missing, retained: c.retained, notInDelayedCheck: c.notInDelayedCheck, leakage: c.leakage })) },
    digest: p.digest, events: r.events, now: r.now,
  };
}
export const promptOf = (q: string) => question(q).prompt;
