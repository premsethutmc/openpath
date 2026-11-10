/**
 * G5: geometry learner journeys through the SAME shared components as the linear-equations journeys (scenarios.ts runScenario / flow.ts /
 * session.ts: the trusted server grader, records, evidence, the adaptive engine, recovery, retention), plus the domain-neutral sub-skill
 * projection (subskill-projection.ts) under the geometry configurations. Only the learner's responses are scripted (learners.ts behaviour
 * models: they read each question's own answer and modelled misconceptions); every question, grade, diagnosis, explanation and next step is
 * the engine's. Nothing here grades, diagnoses or selects teaching.
 */
import { moduleFor, question } from "../../../packages/learning/src/content";
import { problemOf } from "../../../packages/learning/src/families";
import { graph } from "../../../packages/learning/src/graph";
import { hypotheses } from "../../../packages/learning/src/hypotheses";
import { withDecisions, type LearningRecord } from "../../../packages/learning/src/records";
import { ANGLE_PAIRS_CONFIG, TRIANGLE_PROPERTIES_CONFIG } from "../../../packages/learning/src/subskill-config-geometry";
import { projectFromEventsWith, type Projection, type SubSkillConfig } from "../../../packages/learning/src/subskill-projection";
import { teachingEligibility } from "../../../packages/learning/src/teaching-contract";
import { learners, right, type Learner } from "./learners";
import { checkScenario, runScenario, type Run, type Scenario } from "./scenarios";
import { SliceSession } from "./session";

const TRI = "MATH.geometry.triangle-properties", PAIRS = "MATH.geometry.angle-pairs";
const M = moduleFor(TRI)!;
/** the module's own first diagnostic question (the engine's choice of where to start), and other module items, never hand-picked ids */
export const START_SUM = M.diagnostics[0];
export const START_EXT = [...M.diagnostics, ...M.practice, ...M.retention].find((q) => problemOf(q.replace(/:(mc|w)$/, ""))?.family === "ahext" && !q.endsWith(":mc") && !q.endsWith(":w"))!;
/** the angle-pairs module's own (unquarantined) open-answer intersecting-lines item; the module samples this family outside its diagnostics.
 *  Selected from the module lists, never from the raw generator pool (the pool selectors are registered, see question-status.test.ts) */
const PM = moduleFor(PAIRS)!;
export const START_CROSS = [...PM.diagnostics, ...PM.practice, ...(PM.retention ?? [])].find((q) => problemOf(q.replace(/:(mc|w)$/, ""))?.family === "afcross" && !q.endsWith(":mc") && !q.endsWith(":w"))!;
export const START_PAIR = PM.diagnostics[0];

/** a learner who also writes geometric working (one line of arithmetic per step), to show what the trusted grader does with it */
const withWorking = (inner: Learner): Learner => ({ ...inner, name: `${inner.name}, with working`, act: (v) => {
  const a = inner.act(v);
  if (!("answer" in a)) return a;
  const p = problemOf(v.q.replace(/:(mc|w)$/, ""));
  if (!p || v.q.endsWith(":mc") || p.family !== "ahtri") return a;
  const [x, y] = p.params;
  return { ...a, working: [`${x} + ${y} = ${x + y}`, `180 − ${x + y} = ${a.answer}`] };
} });

export interface GeometryJourney { id: string; title: string; kind: "success" | "remediation" | "safeguard"; scenario: Scenario; projectAlso?: string[] }
export const GEOMETRY_JOURNEYS: GeometryJourney[] = [
  { id: "G-01", title: "Strong learner: diagnostic → shown alone → delayed check passed", kind: "success",
    scenario: { id: "G-01", category: 1, start: START_SUM, learner: () => learners.strong(), later: [8], expect: { teaching: "none", mastery: "required", retention: "passed", ended: ["done"] } } },
  // method-sections@2 (2026-11-10): the angle-sum lesson now also shows the exterior-angle and isosceles methods, so the mixed delayed
  // check no longer waits for missing teaching (before: it paused, #121)
  { id: "G-02", title: "Angle-sum misconception: eligible teaching (showing every method of the module) and fresh recheck; mixed-method delayed check passed", kind: "remediation",
    scenario: { id: "G-02", category: 2, start: START_SUM, learner: () => learners.misconception(["added"], 1), later: [8], expect: { investigation: "before-teaching", teaching: "some", mastery: "required", ended: ["done"] } } },
  { id: "G-03", title: "Exterior-angle misconception (gives the third interior angle) that never resolves: the failed journey needing remediation", kind: "remediation",
    scenario: { id: "G-03", category: 2, start: START_EXT, learner: () => learners.misconception(["third-interior"], Infinity, "right"), expect: { mastery: "any" } } },
  { id: "G-04", title: "Right only with hints: no independent mastery", kind: "safeguard",
    scenario: { id: "G-04", category: 4, start: START_SUM, learner: () => learners.onlyWithHints(), expect: { mastery: "forbidden", ended: ["pause"] } } },
  { id: "G-05", title: "Forgets on the delayed check: failed retention → recovery → new cycle", kind: "remediation",
    scenario: { id: "G-05", category: 6, start: START_SUM, learner: () => learners.slipOnRetention(), later: [8, 8], expect: { retention: "failed-then-new-cycle", mastery: "any" } } },
  { id: "G-06", title: "Vertically opposite taken as a linear pair (angle pairs): diagnosed on the one crossing-lines item, never re-tested or taught (the module's other items are complementary/supplementary; no misconception-specific explanation exists); the competency still reaches transfer", kind: "remediation",
    scenario: { id: "G-06", category: 2, start: START_CROSS, learner: () => learners.misconception(["opposite-as-linear"], 1), expect: { teaching: "some", mastery: "any" } }, projectAlso: [TRI] },
  { id: "G-07", title: "Correct answers with written working: the trusted grader decides the answer; geometric working is not examined", kind: "safeguard",
    scenario: { id: "G-07", category: 1, start: START_SUM, learner: () => withWorking(learners.strong()), expect: { teaching: "none", mastery: "required", ended: ["done"] } } },
  { id: "G-08", title: "Isolated slip by a strong learner: no remediation", kind: "safeguard",
    scenario: { id: "G-08", category: 1, start: START_SUM, learner: () => learners.oneSlip(3), expect: { investigation: "none-after-slip", teaching: "none", mastery: "required", ended: ["done"] } } },
];

const CONFIGS: Record<string, SubSkillConfig> = { [TRI]: TRIANGLE_PROPERTIES_CONFIG as SubSkillConfig, [PAIRS]: ANGLE_PAIRS_CONFIG as SubSkillConfig };
const short = (p: Projection) => Object.fromEntries(p.subSkills.map((s) => [s.id, { status: s.status, independentRight: s.attempts.independentRight, independent: s.attempts.independent, assistedRight: s.attempts.assistedRight, distinctVariantsRight: s.attempts.distinctVariantsRight, method: s.method.status, methodCounts: { verified: s.method.verified, falseStep: s.method.falseStep, notApplicable: s.attempts.total - (s.method.verified + s.method.falseStep + s.method.unsupported + s.method.noMethodEvidence + s.method.noWorking + s.method.partial + s.method.notRecorded) }, rechecks: s.rechecks.map((c) => c.correct), retention: s.retention.state, retentionHistory: s.retention.history.map((h) => h.result + (h.recoveredAt ? "+recovered" : "")), everDemonstrated: s.historical.everDemonstrated }]));

export interface GeometryTrace {
  id: string; title: string; kind: GeometryJourney["kind"]; learner: string; learnerId: string; start: string;
  steps: { n: number; component: string; decides: string; summary: string }[];
  submissions: { q: string; family: string | null; activity: string; hints: number; response: string; working: string[]; verdict: string | null; reason: string | null; source: string | null; workingVerdict: string | null }[];
  teaching: { competency: string; strategy: string; eligibility: { checked: boolean; eligible: boolean; review: string } }[];
  hypotheses: { status: string; claim: string | null }[];
  authoritative: Record<string, { status: string; verified: boolean; independent: string; assisted: string; retention: string; retentionHistory: string[]; engine: string }>;
  projections: Record<string, { outcome: string; subSkills: ReturnType<typeof short>; unknown: Projection["unknown"]["byReason"]; discrepancies: Projection["discrepancies"] }>;
  next: { kind: string; competency: string | null; reason: string } | null;
  ended: string | null;
  properties: { property: string; ok: boolean; detail: string }[];
  replay: { identicalState: boolean; identicalProjection: boolean; identicalNextModuleDecision: boolean; reversedOrderProjectionIdentical: boolean };
  events: LearningRecord[]; now: number;
}

function summarise(component: string, input: unknown, output: unknown): string {
  const o = output as Record<string, unknown>, i = input as Record<string, unknown>;
  if (component === "server-grader.gradeRequest") return `${i.qid} "${i.response}" → ${o.verdict} (${o.source}, ${o.reason})`;
  if (component === "intervention.moduleState") return `${o.phase}${o.question ? ` ${o.question}` : ""}${o.strategy ? ` strategy ${o.strategy}` : ""}`;
  if (component === "intervention.recovery") return `${o.phase}${o.question ? ` ${o.question}` : ""}${o.best ? ` best ${o.best}` : ""}${o.status ? ` (${o.status})` : ""}`;
  if (component === "teaching-contract.teachingEligibility") return `checked ${o.checked}, eligible ${o.eligible}, ${o.review}`;
  if (component.startsWith("hypotheses.")) return JSON.stringify(output).slice(0, 160);
  return JSON.stringify(output).slice(0, 120);
}

export function runGeometryJourney(j: GeometryJourney): GeometryTrace {
  const r: Run = runScenario(j.scenario);
  const s = r.f.session;
  const events = withDecisions(s.events, s.decisions) as LearningRecord[];
  const st = s.state();
  const comps = [...new Set([question(j.scenario.start).competency, ...(j.projectAlso ?? [])])].map((c) => graph.evidenceTarget(c));
  const authoritative: GeometryTrace["authoritative"] = {}, projections: GeometryTrace["projections"] = {};
  for (const c of comps) {
    const e = st.evidence(c);
    authoritative[c] = { status: e.status, verified: e.verified, independent: `${e.independent.right}/${e.independent.total}`, assisted: `${e.assisted.right}/${e.assisted.total}`, retention: e.retention, retentionHistory: (e.retentionHistory ?? []).map((h) => h.result + (h.recoveredAt ? "+recovered" : "")), engine: e.engine };
    const p = projectFromEventsWith(CONFIGS[c], s.learnerId, events, s.now, { status: e.status, verified: e.verified });
    projections[c] = { outcome: p.outcome, subSkills: short(p), unknown: p.unknown.byReason, discrepancies: p.discrepancies };
  }
  // deterministic replay after a restart: a new session built from the stored records alone (each attempt carrying the server's decision)
  const again = SliceSession.fromEvents(s.learnerId, s.competency, events, s.now, s.session);
  const target = graph.evidenceTarget(s.competency);
  const sameState = JSON.stringify(again.state().evidence(target)) === JSON.stringify(st.evidence(target)) && JSON.stringify(again.state().next) === JSON.stringify(st.next);
  const projOf = (evs: readonly LearningRecord[]) => JSON.stringify(projectFromEventsWith(CONFIGS[target], s.learnerId, evs, s.now, { status: st.evidence(target).status, verified: st.evidence(target).verified }));
  const sameProj = projOf(events) === projOf(again.events as LearningRecord[]);
  const reversed = projOf(events) === projOf([...events].reverse());
  const nextA = s.next(target), nextB = again.next(target);
  const sameNext = JSON.stringify({ p: nextA.phase, q: nextA.question, s: nextA.strategy?.id ?? null }) === JSON.stringify({ p: nextB.phase, q: nextB.question, s: nextB.strategy?.id ?? null });
  const teaches = (s.events as unknown as { record?: string; competency: string; strategy: string }[]).filter((e) => e.record === "teach");
  const attempts = events.filter((e) => (e as { record?: string }).record === "attempt") as unknown as { questionId: string; activity: string; hints?: number; response: string; working?: string[]; decision?: { schema?: string; verifier?: string; verdict?: string; reason?: string; working?: { status?: string } } }[];
  return {
    id: j.id, title: j.title, kind: j.kind, learner: j.scenario.learner().name, learnerId: s.learnerId, start: j.scenario.start,
    steps: s.trace.filter((t) => ["server-grader.gradeRequest", "intervention.moduleState", "intervention.recovery", "teaching-contract.teachingEligibility"].includes(t.component) || t.component.startsWith("hypotheses.")).map((t) => ({ n: t.n, component: t.component, decides: t.decides, summary: summarise(t.component, t.input, t.output) })),
    submissions: attempts.map((a) => ({ q: a.questionId, family: problemOf(a.questionId.replace(/:(mc|w)$/, ""))?.family ?? null, activity: a.activity, hints: a.hints ?? 0, response: a.response, working: a.working ?? [], verdict: a.decision?.verdict ?? null, reason: a.decision?.reason ?? null, source: a.decision ? `${a.decision.schema} ${a.decision.verifier}` : null, workingVerdict: a.decision?.working?.status ?? null })),
    teaching: teaches.map((t) => { const m = moduleFor(t.competency)!; const e = teachingEligibility(m, m.strategies.find((x) => x.id === t.strategy)!); return { competency: t.competency, strategy: t.strategy, eligibility: { checked: e.checked, eligible: e.eligible, review: e.review } }; }),
    hypotheses: hypotheses(st.records).map((h) => ({ status: h.status, claim: (h as { claim?: unknown }).claim === null || (h as { claim?: unknown }).claim === undefined ? null : JSON.stringify((h as { claim?: unknown }).claim).slice(0, 160) })),
    authoritative, projections,
    next: st.next ? { kind: st.next.kind, competency: st.next.competency ?? null, reason: st.next.reason } : null,
    ended: r.f.ended?.phase ?? null,
    properties: checkScenario(r),
    replay: { identicalState: sameState, identicalProjection: sameProj, identicalNextModuleDecision: sameNext, reversedOrderProjectionIdentical: reversed },
    events, now: s.now,
  };
}
/** the equivalent linear-equations journeys (the same runner, learner models and checks), for the cross-domain comparison */
export const LINEAR_EQUIVALENTS: Scenario[] = [
  { id: "L-01", category: 1, start: "gen:lin:2,17,11", learner: () => learners.strong(), later: [8], expect: { teaching: "none", mastery: "required", retention: "passed", ended: ["done"] } },
  { id: "L-02", category: 2, start: "gen:lin:2,17,11", learner: () => learners.misconception(["forgot-divide"], 1), later: [8], expect: { investigation: "before-teaching", teaching: "some", mastery: "required", ended: ["done"] } },
  { id: "L-04", category: 4, start: "gen:lin:2,17,11", learner: () => learners.onlyWithHints(), expect: { mastery: "forbidden", ended: ["pause"] } },
  { id: "L-05", category: 6, start: "gen:lin:2,17,11", learner: () => learners.slipOnRetention(), later: [8, 8], expect: { retention: "failed-then-new-cycle", mastery: "any" } },
  { id: "L-08", category: 1, start: "gen:lin:2,17,11", learner: () => learners.oneSlip(3), expect: { investigation: "none-after-slip", teaching: "none", mastery: "required", ended: ["done"] } },
];
export { right };
