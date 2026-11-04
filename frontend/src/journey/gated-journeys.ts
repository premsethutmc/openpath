/**
 * M1: the 16 learner journeys for sub-skill-gated mastery (subskill-gated-mastery@1, shadow), through the real components: SliceSession (the
 * trusted server grader with D1 working verdicts, records, withDecisions, learnerState / skillEvidence) and E1's projection. Only learner
 * responses are scripted. Questions are generated variants from the families' own release pools (supplied by the caller, so this module is not a
 * selector); delayed-check items come from the proposed sub-skill retention plan.
 */
import { question } from "../../../packages/learning/src/content";
import { problemOf, type Phase } from "../../../packages/learning/src/families";
import { withDecisions, type LearningRecord } from "../../../packages/learning/src/records";
import { compareMastery, proposedRetentionPlan, VARIANTS, type Comparison, type RetentionPlanItem } from "../../../packages/learning/src/gated-mastery";
import { COMPETENCY } from "../../../packages/learning/src/subskill-evidence";
import { workingFor } from "./d1e1-journeys";
import { SliceSession } from "./session";

export const M1_START = Date.parse("2026-03-02T09:00:00Z");
export type Pool = (fam: string, phase: Phase) => string[];
const base = (q: string) => q.replace(/:(mc|w)$/, "");
const fam = (q: string) => problemOf(base(q))?.family ?? null;
export const rightOf = (q: string) => question(q)!.answer;
export const wrongOf = (q: string) => { const x = question(q)!; if (x.options?.length) return x.options.map((_, i) => String.fromCharCode(65 + i)).find((l) => l !== x.answer)!; const n = Number(x.answer); return Number.isFinite(n) ? String(n + 1) : `${x.answer}0`; };
const WORKED = new Set(["lin", "lboth", "lbrk"]);

export interface GatedTrace {
  id: number; name: string;
  submissions: { q: string; family: string | null; activity: string; hints: number; response: string; working: string[]; verdict: string | null; workingStatus: string | null; methodEvidence: string | null }[];
  comparison: { existing: Comparison["existing"]; proposed: Record<string, { status: string; shown: string[]; missing: string[]; retentionDue: string[]; recoveryRequired: string[]; historicalAchievement: boolean; unknown: number; subSkills: Record<string, { status: string; historical: boolean; independent: string; assisted: string; method: string; note?: string }> }>; disagreements: Comparison["disagreements"] };
  retentionPlan: RetentionPlanItem[];
  extra?: Record<string, unknown>;
}

export class Learner {
  readonly s: SliceSession;
  private used = new Set<string>();
  readonly name: string;
  private pool: Pool;
  constructor(name: string, pool: Pool, s?: SliceSession) { this.name = name; this.pool = pool; this.s = s ?? new SliceSession(`m1-${name}`, COMPETENCY, M1_START); }
  /** k fresh typed (or multiple-choice) generated variants of a family's phase, never one already used by this learner */
  fresh(f: string, phase: Phase, k: number, mc = false): string[] {
    const out: string[] = [];
    for (const q of this.pool(f, phase)) { if (out.length >= k) break; if (q.endsWith(":w") || q.endsWith(":mc") !== mc || this.used.has(base(q))) continue; this.used.add(base(q)); out.push(q); }
    if (out.length < k) throw new Error(`pool ${f}/${phase} exhausted`);
    return out;
  }
  answer(q: string, ok: boolean, o: { activity?: "practice" | "check" | "retention"; hints?: number; working?: "valid" | "invalid" | "none" | "bare" } = {}) {
    this.used.add(base(q));
    const f = fam(q)!, w = o.working ?? (WORKED.has(f) && !q.endsWith(":mc") ? "valid" : "none");
    const working = w === "none" ? undefined : w === "bare" ? [`x = ${rightOf(q)}`] : workingFor(q, w);
    this.s.submit(q, ok ? rightOf(q) : wrongOf(q), o.activity ?? "practice", { ...(working ? { working } : {}), ...(o.hints ? { hints: o.hints } : {}) });
  }
  right(qs: string[], o: Parameters<Learner["answer"]>[2] = {}) { for (const q of qs) this.answer(q, true, o); }
  /** two fresh practice variants right, alone, for each core sub-skill (modelling: the module's own story-equation family) */
  allCore(o: Parameters<Learner["answer"]>[2] = {}) { for (const f of ["lin", "lboth", "lbrk", "auleq"]) this.right(this.fresh(f, "practice", 2), o); }
  events() { return withDecisions(this.s.events, this.s.decisions) as unknown as readonly { kind: string }[]; }
  compare() { return compareMastery(this.s.learnerId, this.events(), this.s.now); }
  plan() { return proposedRetentionPlan(this.s.learnerId, this.events(), this.s.now); }
}

const short = (id: string) => id.split(".")[1].replace("@1", "");
export function traceOf(id: number, name: string, L: Learner, extra?: Record<string, unknown>): GatedTrace {
  const c = L.compare();
  const subs = (L.events() as unknown as (LearningRecord & { record?: string; questionId: string; activity: string; hints?: number; response: string; working?: string[]; decision?: { verdict?: string; working?: { status?: string; methodEvidence?: string } } })[]).filter((e) => e.record === "attempt");
  return {
    id, name,
    submissions: subs.map((a) => ({ q: a.questionId, family: fam(a.questionId), activity: a.activity, hints: a.hints ?? 0, response: a.response, working: a.working ?? [], verdict: a.decision?.verdict ?? null, workingStatus: a.decision?.working?.status ?? null, methodEvidence: a.decision?.working?.methodEvidence ?? null })),
    comparison: { existing: c.existing, disagreements: c.disagreements, proposed: Object.fromEntries(VARIANTS.map((v) => { const p = c.proposed[v]; return [v, { status: p.status, shown: p.shown.map(short), missing: p.missing.map(short), retentionDue: p.retentionDue.map(short), recoveryRequired: p.recoveryRequired.map(short), historicalAchievement: p.historicalAchievement, unknown: p.unknown,
      subSkills: Object.fromEntries(p.subSkills.map((x) => [short(x.id), { status: x.status, historical: x.historicalAchievement, independent: `${x.independent.right}/${x.independent.answers}`, assisted: `${x.assisted.right}/${x.assisted.answers}`, method: `${x.method.status} (verified ${x.method.verified}, false step ${x.method.falseStep})`, ...(x.note ? { note: x.note } : {}) }])) }]; })) },
    retentionPlan: L.plan(), ...(extra ? { extra } : {}),
  };
}

/** all core shown, eight days later every sub-skill's delayed check is due; answer the proposed plan's items (wrong on `failOn`'s first) */
function delayed(L: Learner, failOn: string | null) {
  L.allCore(); L.s.wait(8);
  const plan = L.plan();
  for (const p of plan) p.questions.forEach((q, i) => L.answer(q, !(p.subSkill.includes(failOn ?? "-") && i === 0), { activity: "retention" }));
  return plan;
}

export function runGatedJourneys(pool: Pool): GatedTrace[] {
  const out: GatedTrace[] = [];
  const L = (n: string) => new Learner(n, pool);
  { const l = L("j1"); l.right(l.fresh("lin", "practice", 3)); out.push(traceOf(1, "Two-step success only", l)); }
  { const l = L("j2"); l.right(l.fresh("lboth", "practice", 3)); out.push(traceOf(2, "Both-sides success only", l)); }
  { const l = L("j3"); l.right(l.fresh("lbrk", "practice", 3)); out.push(traceOf(3, "Bracket success only", l)); }
  { const l = L("j4"); l.right(l.fresh("auleq", "practice", 3)); out.push(traceOf(4, "Modelling success only", l)); }
  { const l = L("j5"); l.allCore(); out.push(traceOf(5, "All core sub-skills demonstrated (verified working where the family has a contract)", l)); }
  { const l = L("j6"); for (const f of ["lboth", "lbrk", "auleq"]) l.right(l.fresh(f, "practice", 2)); l.right(l.fresh("lin", "practice", 3), { working: "invalid" });
    // a client that rewrites the stored decision of those answers to "verified" (not decided by the server): never accepted
    const forged = (l.events() as unknown as { record?: string; decision?: { working?: { status?: string } } }[]).map((e) => (e.decision?.working?.status === "invalid" ? { ...e, decision: { ...e.decision, decidedBy: "client", working: { ...e.decision.working, status: "verified", methodEvidence: "method-verified" } } } : e));
    // (an untrusted decision is read like a record from before D1: the answer is re-graded, no method is recorded, nothing is verified)
    const fc = compareMastery(l.s.learnerId, forged as never, l.s.now), f = fc.proposed.gated, fm = fc.proposed["gated-method"];
    out.push(traceOf(6, "Correct answer with invalid working (two-step), other sub-skills shown", l, { forgedClientVerdict: { gated: f.status, twoStep: f.subSkills[0].status, twoStepMethod: f.subSkills[0].method.status, verified: f.subSkills[0].method.verified, gatedMethod: fm.status } })); }
  { const l = L("j7"); for (const f of ["lin", "lboth", "lbrk", "auleq"]) l.right(l.fresh(f, "practice", 2), { working: "none" }); out.push(traceOf(7, "Bare correct answers on every core sub-skill (no working)", l)); }
  { const l = L("j8"); for (const f of ["lin", "lboth", "lbrk", "auleq"]) l.right(l.fresh(f, "practice", 3), { hints: 1 }); out.push(traceOf(8, "Assisted success on every core sub-skill (a hint each time)", l)); }
  {
    // a guesser: always picks option A on multiple-choice variants (right only when A is the key)
    const l = L("j9"); const g: { q: string; right: boolean }[] = [];
    for (const f of ["lin", "lboth", "lbrk", "aulwp"]) for (const q of l.fresh(f, "practice", 6, true)) { const ok = rightOf(q) === "A"; g.push({ q, right: ok }); l.s.submit(q, "A", "practice"); }
    // and the typed modelling family's own choice item, also guessed A
    for (const q of l.fresh("auleq", "practice", 4)) { g.push({ q, right: rightOf(q) === "A" }); l.s.submit(q, "A", "practice"); }
    out.push(traceOf(9, "Repeated guessed answers (always option A)", l, { guesses: g }));
  }
  { const l = L("j10"); const plan = delayed(l, "brackets"); out.push(traceOf(10, "Failed delayed check in one sub-skill (brackets)", l, { checkPlan: plan })); }
  { const l = L("j11"); delayed(l, "brackets"); const before = l.compare(); l.right(l.fresh("lbrk", "practice", 2)); out.push(traceOf(11, "Successful recovery in that sub-skill (two fresh bracket questions right alone)", l, { beforeRecovery: { gated: before.proposed.gated.status, recoveryRequired: before.proposed.gated.recoveryRequired, existing: before.existing } })); }
  { const l = L("j12"); delayed(l, "brackets"); l.right(l.fresh("lin", "practice", 2)); l.right(l.fresh("lboth", "practice", 2)); out.push(traceOf(12, "Unrelated success during recovery (two-step and both-sides right; brackets still failed)", l)); }
  {
    // a careless slip in practice after being shown, then a slip inside a delayed check (one wrong, two right)
    const l = L("j13"); l.allCore(); l.answer(l.fresh("lin", "practice", 1)[0], false);
    const afterPracticeSlip = l.compare();
    l.s.wait(8); const items = l.fresh("lbrk", "retention", 3);
    l.answer(items[0], false, { activity: "retention" }); l.right(items.slice(1), { activity: "retention" });
    for (const p of l.plan()) if (!p.subSkill.includes("brackets")) l.right(p.questions, { activity: "retention" });
    out.push(traceOf(13, "One careless slip after prior success (a practice slip, then one wrong answer in the brackets delayed check)", l, { afterPracticeSlip: { gated: afterPracticeSlip.proposed.gated.status, existing: afterPracticeSlip.existing.status } }));
  }
  {
    // the same learner's events replayed as stored under an older authority (verdicts kept historical, never regraded) and before D1 (no verdict)
    const l = L("j14"); l.allCore();
    const ev = l.events() as unknown as (LearningRecord & { decision?: { working?: { versions?: { authority?: string } } } })[];
    const older = ev.map((e) => (e.decision?.working ? { ...e, decision: { ...e.decision, working: { ...e.decision.working, provenance: undefined, versions: { ...e.decision.working.versions, authority: "derivation-authority@1" } } } } : e));
    const preD1 = ev.map((e) => { if (!e.decision) return e; const { decision, ...rest } = e; void decision; return rest; });
    const run = (x: readonly unknown[]) => compareMastery(l.s.learnerId, x as never, l.s.now);
    const now = run(ev), a = run(older), b = run(preD1);
    const sum = (c: Comparison) => ({ existing: c.existing.status, gated: c.proposed.gated.status, method: c.proposed["gated-method"].status, verified: c.proposed.gated.subSkills.map((s) => s.method.verified), methodStatus: c.proposed.gated.subSkills.map((s) => s.method.status) });
    // an older authority's FALSE-STEP verdict: kept as recorded (never regraded away), so the answer stays contradicted
    const k = new Learner("j14b", pool); for (const f of ["lboth", "lbrk", "auleq"]) k.right(k.fresh(f, "practice", 2)); k.right(k.fresh("lin", "practice", 3), { working: "invalid" });
    const kOld = (k.events() as unknown as (LearningRecord & { decision?: { working?: { versions?: { authority?: string } } } })[]).map((e) => (e.decision?.working ? { ...e, decision: { ...e.decision, working: { ...e.decision.working, provenance: undefined, versions: { ...e.decision.working.versions, authority: "derivation-authority@1" } } } } : e));
    const kc = compareMastery(k.s.learnerId, kOld as never, k.s.now).proposed.gated;
    out.push(traceOf(14, "Historical evidence replay (current authority, older authority, before D1)", l, { current: sum(now), olderAuthority: sum(a), beforeD1: sum(b),
      olderAuthorityFalseStep: { gated: kc.status, twoStep: kc.subSkills[0].status, twoStepMethod: kc.subSkills[0].method.status },
      replayIdentical: JSON.stringify(run([...ev].reverse())) === JSON.stringify(now) && JSON.stringify(run(older)) === JSON.stringify(a) }));
  }
  { const l = L("j15"); for (const f of ["lin", "lboth", "lbrk"]) l.right(l.fresh(f, "practice", 2)); l.right(l.fresh("meet", "practice", 3), { working: "none" }); out.push(traceOf(15, "Unknown question family (meet) in place of modelling", l)); }
  {
    const l = L("j16"); l.allCore(); l.answer(l.fresh("lbrk", "check", 1)[0], false, { activity: "check" });
    const a = JSON.stringify(l.compare());
    const r = SliceSession.fromEvents(l.s.learnerId, COMPETENCY, l.s.events, l.s.now, l.s.session); Object.assign(r.decisions, l.s.decisions);
    const l2 = new Learner("j16", pool, r);
    const b = JSON.stringify(l2.compare());
    const c = JSON.stringify(compareMastery(r.learnerId, [...l2.events()].reverse(), r.now));
    // client-supplied claims on the stored events (a mastery field, a status, a client decision field): never read
    const forged = (l2.events() as unknown as Record<string, unknown>[]).map((e) => (e.record === "attempt" ? { ...e, mastery: "independently-demonstrated", status: "verified", clientDecision: { working: { status: "valid", methodEvidence: "method-verified" } } } : e));
    const d = JSON.stringify(compareMastery(r.learnerId, forged as never, r.now));
    out.push(traceOf(16, "Restart and persistence (rebuilt session, reversed store order, client-supplied claims ignored)", l2, { identicalAfterRestart: a === b, identicalWithReversedStoreOrder: a === c, clientClaimsIgnored: a === d }));
  }
  return out;
}
