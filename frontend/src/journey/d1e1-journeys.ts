/**
 * D1 + E1 integration: twenty learner journeys through the real components — the trusted grader (D1: answer verdict AND working verdict,
 * server-recorded), records, evidence, the adaptive flow, the session — and the E1 sub-skill projection (shadow) over the stored events.
 * Only learner responses are scripted. Question ids are the module's own generated variants or generator ids the family accepts.
 */
import { moduleFor, question } from "../../../packages/learning/src/content";
import { DAY } from "../../../packages/learning/src/evidence";
import { problemOf } from "../../../packages/learning/src/families";
import { withDecisions, type LearningRecord } from "../../../packages/learning/src/records";
import { COMPETENCY, projectFromEvents, type Projection } from "../../../packages/learning/src/subskill-evidence";
import { JOURNEYS as D1_JOURNEYS, runJourney } from "./grader-journeys";
import { SliceSession } from "./session";

export const DE1_START = Date.parse("2026-03-02T09:00:00Z");
const base = (q: string) => q.replace(/:(mc|w)$/, "");
const ans = (q: string) => problemOf(base(q))!.answer;
const off = (q: string) => String(Number(ans(q)) + 1);
/** the learner's own working for each family (each new equation once, then the answer), as a learner writes it */
function workingFor(q: string, mode: "valid" | "invalid" | "partial" | "unsupported" | "wrong-last" = "valid"): string[] {
  const p = problemOf(base(q))!, f = p.family, v = p.params;
  let lines: string[];
  if (f === "lin") { const [a, b, x] = v; const c = a * x + b; lines = [`${a}x = ${c - b}`, `x = ${x}`]; if (mode === "invalid") lines = [`${a}x = ${c + b}`, `x = ${x}`]; if (mode === "wrong-last") lines = [`${a}x = ${c - b}`, `x = ${x + 1}`]; }
  else if (f === "lboth") { const [a, b, c, x] = v; const d = (a - c) * x + b; lines = [`${a - c}x + ${b} = ${d}`, `${a - c}x = ${d - b}`, `x = ${x}`]; if (a - c === 1) lines = [`x + ${b} = ${d}`, `x = ${x}`]; }
  else if (f === "lbrk") { const [a, s, c, x] = v; const d = a * (x + s) - c * x, k = a - c, as = a * s; lines = [`${k}x ${as < 0 ? "-" : "+"} ${Math.abs(as)} = ${d}`, `${k}x = ${d - as}`, `x = ${x}`]; if (k === 1) lines = [`x ${as < 0 ? "-" : "+"} ${Math.abs(as)} = ${d}`, `x = ${x}`]; }
  else throw new Error(`no working model for ${f}`);
  if (mode === "partial") return lines.slice(0, 1);
  if (mode === "unsupported") return [`take away and divide so x is ${ans(q)}`, `x = ${ans(q)}`];
  return lines;
}
const M = moduleFor(COMPETENCY)!;
const pool = (fam: string) => [...new Set([...M.diagnostics, ...M.practice, ...M.retention, ...M.strategies.flatMap((s) => [s.guided, s.check])])].filter((q) => !q.endsWith(":mc") && !q.endsWith(":w") && problemOf(base(q))?.family === fam);
// fresh generated variants of a family (accepted by the generator; distinct from the module's own items when the pool runs short)
const LIN = ["gen:lin:3,3,2", "gen:lin:2,17,11", "gen:lin:7,18,9", "gen:lin:5,6,5", "gen:lin:4,7,3", "gen:lin:6,5,4", "gen:lin:8,3,2", "gen:lin:2,9,7"];
const LBOTH = pool("lboth"), LBRK = pool("lbrk");
const RET_LIN = M.retention.filter((q) => problemOf(base(q))?.family === "lin");

type Sub = { q: string; response: string; working?: string[]; activity?: string; hints?: number; waitDays?: number };
export interface DE1Trace {
  id: string; title: string; learnerId: string;
  submissions: { q: string; family: string | null; activity: string; hints: number; response: string; working: string[]; verdict: string | null; reason: string | null; workingStatus: string | null; methodEvidence: string | null; firstInvalid: number | null }[];
  authoritative: { status: string; verified: boolean; retention: string; recoveryRequired: boolean };
  projection: { outcome: string; subSkills: Record<string, { status: string; attempts: Projection["subSkills"][number]["attempts"]; method: Projection["subSkills"][number]["method"]; retention: { state: string; need: number; sampled: boolean; history: string[] }; everDemonstrated: boolean }>; unknown: Projection["unknown"]["byReason"]; discrepancies: string[] };
  checks: Record<string, unknown>;
  events: LearningRecord[]; now: number;
}
const famOf = (q: string) => problemOf(base(q))?.family ?? null;
function trace(id: string, title: string, s: SliceSession, events: LearningRecord[], checks: Record<string, unknown> = {}): DE1Trace {
  const e = s.state().evidence(COMPETENCY);
  const p = projectFromEvents(s.learnerId, events, s.now, { status: e.status, verified: e.verified });
  const attempts = (events as unknown as { record?: string; questionId: string; activity: string; hints?: number; response: string; working?: string[]; decision?: { verdict?: string; reason?: string; working?: { status?: string; methodEvidence?: string; firstInvalid?: { index: number } | null } } }[]).filter((x) => x.record === "attempt");
  return {
    id, title, learnerId: s.learnerId,
    submissions: attempts.map((a) => ({ q: a.questionId, family: famOf(a.questionId), activity: a.activity, hints: a.hints ?? 0, response: a.response, working: a.working ?? [], verdict: a.decision?.verdict ?? null, reason: a.decision?.reason ?? null, workingStatus: a.decision?.working?.status ?? null, methodEvidence: a.decision?.working?.methodEvidence ?? null, firstInvalid: a.decision?.working?.firstInvalid?.index ?? null })),
    authoritative: { status: e.status, verified: e.verified, retention: e.retention, recoveryRequired: e.recoveryRequired },
    projection: { outcome: p.outcome, subSkills: Object.fromEntries(p.subSkills.filter((x) => x.status !== "not-attempted" || x.method.partialWorking).map((x) => [x.id.split(".")[1].replace("@1", ""), { status: x.status, attempts: x.attempts, method: x.method, retention: { state: x.retention.state, need: x.retention.need, sampled: x.retention.sampledByModuleCheck, history: x.retention.history.map((h) => h.result + (h.recoveredAt ? "→recovered" : "")) }, everDemonstrated: x.historical.everDemonstrated }])), unknown: p.unknown.byReason, discrepancies: p.discrepancies.map((d) => `${d.claim}`) },
    checks, events, now: s.now,
  };
}
const stored = (s: SliceSession) => withDecisions(s.events, s.decisions);
function session(id: string, subs: Sub[]) {
  const s = new SliceSession(`de1-${id}`, COMPETENCY, DE1_START);
  for (const x of subs) { if (x.waitDays) s.wait(x.waitDays); s.submit(x.q, x.response, (x.activity ?? "practice") as never, { ...(x.working?.length ? { working: x.working } : {}), ...(x.hints ? { hints: x.hints } : {}) }); }
  return s;
}
const r = (q: string, o: Partial<Sub> = {}): Sub => ({ q, response: `x = ${ans(q)}`, ...o });
const rw = (q: string, o: Partial<Sub> = {}): Sub => ({ q, response: `x = ${ans(q)}`, working: workingFor(q), ...o });
/** a D1 flow journey (real adaptive flow: grading, teaching, recheck), projected afterwards */
function flowJourney(d1Id: string) {
  const run = runJourney(D1_JOURNEYS.find((j) => j.id === d1Id)!);
  return run.f.session;
}

export const DE1_JOURNEYS: { id: string; title: string; run: () => DE1Trace }[] = [
  { id: "J01", title: "Correct bare answer", run: () => { const s = session("J01", [r(LIN[0])]); return trace("J01", "Correct bare answer", s, stored(s)); } },
  { id: "J02", title: "Correct answer with verified working", run: () => { const s = session("J02", [rw(LIN[0])]); return trace("J02", "Correct answer with verified working", s, stored(s)); } },
  { id: "J03", title: "Correct answer with invalid working", run: () => { const s = session("J03", LIN.slice(0, 3).map((q) => rw(q, { working: workingFor(q, "invalid") }))); return trace("J03", "Correct answer with invalid working", s, stored(s)); } },
  { id: "J04", title: "Incorrect answer with the first invalid step identified", run: () => { const q = LIN[0]; const s = session("J04", [{ q, response: `x = ${Number(ans(q)) + 1}`, working: workingFor(q, "wrong-last") }]); return trace("J04", "Incorrect answer with the first invalid step identified", s, stored(s)); } },
  { id: "J05", title: "Valid partial working", run: () => { const q = LIN[0]; const s = session("J05", [{ q, response: "", working: workingFor(q, "partial") }]); return trace("J05", "Valid partial working", s, stored(s)); } },
  { id: "J06", title: "Unsupported working", run: () => { const q = LIN[0]; const s = session("J06", [rw(q, { working: workingFor(q, "unsupported") })]); return trace("J06", "Unsupported working", s, stored(s)); } },
  { id: "J07", title: "Assisted success (hints, guided)", run: () => { const s = session("J07", [rw(LBRK[0], { hints: 1 }), rw(LBRK[1], { activity: "guided" }), rw(LBRK[2], { hints: 1 })]); return trace("J07", "Assisted success (hints, guided)", s, stored(s)); } },
  { id: "J08", title: "Independent recheck success (real flow: misconception, teaching, recheck with working)", run: () => { const s = flowJourney("D1-11"); return trace("J08", "Independent recheck success", s, stored(s)); } },
  { id: "J09", title: "Independent recheck failure (real flow)", run: () => { const s = flowJourney("D1-12"); return trace("J09", "Independent recheck failure", s, stored(s)); } },
  { id: "J10", title: "Two-step-only success", run: () => { const s = session("J10", LIN.slice(0, 4).map((q) => rw(q))); return trace("J10", "Two-step-only success", s, stored(s)); } },
  { id: "J11", title: "Both-sides-only success", run: () => { const s = session("J11", LBOTH.slice(0, 3).map((q) => rw(q))); return trace("J11", "Both-sides-only success", s, stored(s)); } },
  { id: "J12", title: "Bracket-equation success", run: () => { const s = session("J12", LBRK.slice(0, 3).map((q) => rw(q))); return trace("J12", "Bracket-equation success", s, stored(s)); } },
  { id: "J13", title: "Mixed-family success", run: () => { const s = session("J13", [...LIN.slice(0, 2), ...LBOTH.slice(0, 2), ...LBRK.slice(0, 2)].map((q) => rw(q))); return trace("J13", "Mixed-family success", s, stored(s)); } },
  { id: "J14", title: "Delayed retention success", run: () => { const s = session("J14", [...LIN.slice(0, 2).map((q) => rw(q)), rw(RET_LIN[0], { activity: "retention", waitDays: 8 }), ...M.retention.filter((q) => !RET_LIN.includes(q)).map((q) => ({ q, response: question(q).answer, activity: "retention" }))]); return trace("J14", "Delayed retention success", s, stored(s)); } },
  { id: "J15", title: "Delayed retention failure, then recovery", run: () => {
    const s = session("J15", [...LIN.slice(0, 2).map((q) => rw(q)), { q: RET_LIN[0], response: `x = ${off(RET_LIN[0])}`, activity: "retention", waitDays: 8 }]);
    const before = trace("J15", "", s, stored(s));
    for (const q of LIN.slice(4, 6)) s.submit(q, `x = ${ans(q)}`, "practice", { working: workingFor(q) });
    return trace("J15", "Delayed retention failure, then recovery", s, stored(s), { beforeRecovery: { twoStep: before.projection.subSkills["two-step"].status, authoritative: before.authoritative } });
  } },
  { id: "J16", title: "Cross-family recovery (two-step recovers; both-sides stays in recovery)", run: () => {
    const s = session("J16", [...LIN.slice(0, 2).map((q) => rw(q)), ...LBOTH.slice(0, 2).map((q) => rw(q)), { q: RET_LIN[0], response: `x = ${off(RET_LIN[0])}`, activity: "retention", waitDays: 8 }, { q: LBOTH[2], response: `x = ${off(LBOTH[2])}`, activity: "retention" }, ...LIN.slice(4, 6).map((q) => rw(q))]);
    return trace("J16", "Cross-family recovery", s, stored(s));
  } },
  { id: "J17", title: "Historical event replay (pre-D1 records and an older authority's verdicts)", run: () => {
    const s = session("J17", LIN.slice(0, 3).map((q) => rw(q, { working: workingFor(q, "invalid") })));
    // the same learner's events as they would have been stored before D1 (no working verdict) and under authority @3
    const pre = stored(s).map((e) => { const d = (e as { decision?: { working?: unknown } }).decision; if (!d) return e; const { working: _w, ...rest } = d as Record<string, unknown>; return { ...e, decision: rest } as LearningRecord; });
    const old = stored(s).map((e) => { const d = (e as { decision?: { working?: { versions?: object } } }).decision; return d?.working ? ({ ...e, decision: { ...d, working: { ...d.working, versions: { ...(d.working.versions ?? {}), authority: "openpath-derivation-authority@3" } } } } as LearningRecord) : e; });
    const t = trace("J17", "Historical event replay", s, stored(s));
    const pPre = projectFromEvents(s.learnerId, pre, s.now), pOld = projectFromEvents(s.learnerId, old, s.now);
    const two = (p: Projection) => p.subSkills.find((x) => x.id === "linear-equations.two-step@1")!;
    return { ...t, checks: { current: { falseStep: t.projection.subSkills["two-step"].method.falseStep, status: t.projection.subSkills["two-step"].status }, preD1: { notRecorded: two(pPre).method.notRecorded, falseStep: two(pPre).method.falseStep, status: two(pPre).status }, authority3: { historical: two(pOld).method.historical, falseStep: two(pOld).method.falseStep, status: two(pOld).status }, preD1Repeatable: JSON.stringify(projectFromEvents(s.learnerId, [...pre].reverse(), s.now)) === JSON.stringify(pPre) } };
  } },
  { id: "J18", title: "Restart and persistence (rebuilt session; store round trip in d1e1-persistence.sh)", run: () => {
    const s = session("J18", [...LIN.slice(0, 2).map((q) => rw(q)), rw(LBOTH[0], { working: ["take away and divide", `x = ${ans(LBOTH[0])}`] }), { q: LBRK[0], response: `x = ${off(LBRK[0])}`, working: workingFor(LBRK[0], "valid").slice(0, 1).concat([`x = ${off(LBRK[0])}`]) }]);
    const ev = JSON.parse(JSON.stringify(stored(s))) as LearningRecord[];
    const s1 = SliceSession.fromEvents(s.learnerId, COMPETENCY, ev, s.now, s.session);
    const a = JSON.stringify(projectFromEvents(s.learnerId, stored(s), s.now)), b = JSON.stringify(projectFromEvents(s1.learnerId, s1.events, s1.now));
    return trace("J18", "Restart and persistence", s, stored(s), { identicalAfterRestart: a === b, authoritativeEqual: JSON.stringify(s.state().evidence(COMPETENCY)) === JSON.stringify(s1.state().evidence(COMPETENCY)) });
  } },
  { id: "J19", title: "Forged client verification", run: () => {
    const s = session("J19", LIN.slice(0, 3).map((q) => rw(q, { working: workingFor(q, "invalid") })));
    // a client that rewrites the stored decisions to claim a verified method (Django refuses such a record: test_grader_teaching.py)
    const forged = stored(s).map((e) => { const d = (e as { decision?: Record<string, unknown> }).decision; return d ? ({ ...e, decision: { ...d, decidedBy: "client", working: { schema: "working-assessment@1", status: "verified", methodEvidence: "method-verified" } } } as unknown as LearningRecord) : e; });
    const half = stored(s).map((e) => { const d = (e as { decision?: Record<string, unknown> }).decision; return d ? ({ ...e, decision: { ...d, working: { schema: "working-assessment@1", status: "verified", methodEvidence: "method-false-step" } } } as unknown as LearningRecord) : e; });
    const two = (p: Projection) => p.subSkills.find((x) => x.id === "linear-equations.two-step@1")!.method;
    return trace("J19", "Forged client verification", s, stored(s), { forgedByClient: two(projectFromEvents(s.learnerId, forged, s.now)), inconsistentVerdict: two(projectFromEvents(s.learnerId, half, s.now)) });
  } },
  { id: "J20", title: "Unknown question-family identifiers", run: () => {
    const s = session("J20", LIN.slice(0, 2).map((q) => rw(q)));
    const t0 = s.now;
    const extra = ["gen:meet:3,0", "gen:zzz:1,2", "gen:lin:1,1,1", "Solve 2x + 5 = 17"].map((q, i) => ({ kind: "learning_record", record: "attempt", id: `u${i}`, learnerId: s.learnerId, sessionId: `learn:${s.learnerId}:s1`, at: new Date(t0 + (i + 1) * 60_000).toISOString(), questionId: q, response: "5", activity: "practice", hints: 0, solution: false, competency: COMPETENCY, decision: { schema: "grading-decision@1", decisionId: `dec:u${i}`, decidedBy: "server", verdict: "correct", reason: "correct.equal", working: { schema: "working-assessment@1", status: "verified", methodEvidence: "method-verified" } } }) as unknown as LearningRecord);
    s.now = t0 + DAY;
    return trace("J20", "Unknown question-family identifiers", s, [...stored(s), ...extra]);
  } },
];
