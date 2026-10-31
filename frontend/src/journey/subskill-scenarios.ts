/**
 * Workstream E1: learner journeys for the sub-skill evidence projection, through the real components (SliceSession: the trusted server grader,
 * records, withDecisions, learnerState / evidenceFor, the derivation authority). Only learner answers and working are scripted. Questions are
 * generated variants drawn from the families' own release pools, with a seed, never hand-written.
 */
import { problemOf, type Phase } from "../../../packages/learning/src/families";
import { moduleFor } from "../../../packages/learning/src/content";
import { DAY } from "../../../packages/learning/src/evidence";
import { readRecords, withDecisions, type LearningRecord } from "../../../packages/learning/src/records";
import { COMPETENCY, projectFromEvents, type Projection } from "../../../packages/learning/src/subskill-evidence";
import { SliceSession } from "./session";

export const E1_START = Date.parse("2026-03-02T09:00:00Z");
const base = (q: string) => q.replace(/:(mc|w)$/, "");
export const answerOf = (q: string) => problemOf(base(q))!.answer;
export const wrongOf = (q: string) => { const a = answerOf(q); const n = Number(a); return Number.isFinite(n) ? String(n + 1) : `${a}0`; };
/** typed variants of a family's phase pool, rotated by a seed (distinct variants, deterministic). The pool is supplied by the caller (a test or
 *  script reading families.phasePool), so this module is not a question selector of its own. */
export type Variants = (fam: string, phase: Phase, k: number, seed?: number) => string[];
export const variantsFrom = (phasePool: (fam: string, phase: Phase) => string[]): Variants => (fam, phase, k, seed = 0) => {
  const all = phasePool(fam, phase).filter((q) => !q.endsWith(":mc") && !q.endsWith(":w"));
  const out: string[] = [];
  for (let i = 0; i < k; i++) out.push(all[(seed * 7 + i * 13) % all.length]);
  return [...new Set(out)];
};
/** a two-step learner's own working (lin: ax + b = c → ax = c − b → x = …) */
export const linWorking = (q: string, bad = false) => { const [a, b, x] = problemOf(base(q))!.params; const c = a * x + b; return [`${a}x = ${bad ? c + b : c - b}`, `x = ${x}`]; };
/** a working the authority does not register (each side written with the operation shown): unsupported, not false */
export const linUnregistered = (q: string) => { const [a, b, x] = problemOf(base(q))!.params; const c = a * x + b; return [`${a}x + ${b} - ${b} = ${c} - ${b}`, `${a}x/${a} = ${c - b}/${a}`, `x = ${x}`]; };

export interface ScenarioResult {
  id: number; name: string;
  authoritative: { status: string; verified: boolean; independent: { right: number; total: number }; retention: string; recoveryRequired: boolean; retentionHistory: unknown } | { error: string };
  projection: Projection;
  discrepancy: boolean;
  supporting: { questionId: string; activity: string; correct: boolean | null; hints: number; working: string[] | null }[];
}
const summarise = (s: SliceSession) => {
  try { const e = s.state().evidence(COMPETENCY); return { status: e.status, verified: e.verified, independent: e.independent, retention: e.retention, recoveryRequired: e.recoveryRequired, retentionHistory: e.retentionHistory }; }
  catch (err) { return { error: String((err as Error).message ?? err).slice(0, 160) }; }
};
/** the projection over the session's records, read exactly as the authoritative state reads them */
export function projectionOf(s: SliceSession, events: readonly LearningRecord[] = s.events): Projection {
  let auth: { status: string; verified: boolean } | null = null;
  try { const e = s.state().evidence(COMPETENCY); auth = { status: e.status, verified: e.verified }; } catch { auth = null; }
  return projectFromEvents(s.learnerId, withDecisions(events, s.decisions), s.now, auth);
}
function result(id: number, name: string, s: SliceSession): ScenarioResult {
  const projection = projectionOf(s);
  const recs = readRecords(s.learnerId, withDecisions(s.events, s.decisions));
  return { id, name, authoritative: summarise(s), projection, discrepancy: projection.discrepancies.length > 0,
    supporting: recs.attempts.map((a) => ({ questionId: a.questionId, activity: a.activity, correct: a.credit ?? null, hints: a.hints, working: a.working ?? null })) };
}
const fresh = () => new SliceSession("e1-learner", COMPETENCY, E1_START);
const right = (s: SliceSession, qs: string[], activity: "practice" | "check" | "retention" | "guided" = "practice", o: { hints?: number; working?: (q: string) => string[] } = {}) => { for (const q of qs) s.submit(q, answerOf(q), activity, { ...(o.hints ? { hints: o.hints } : {}), ...(o.working ? { working: o.working(q) } : {}) }); };
const wrong = (s: SliceSession, qs: string[], activity: "practice" | "check" | "retention" = "practice") => { for (const q of qs) s.submit(q, wrongOf(q), activity); };

export function runE1Scenarios(variants: Variants, seed = 0): ScenarioResult[] {
  const out: ScenarioResult[] = [];
  const mod = moduleFor(COMPETENCY)!;
  { const s = fresh(); right(s, variants("ahone", "practice", 3, seed)); out.push(result(1, "one-step success only", s)); }
  { const s = fresh(); right(s, variants("lin", "practice", 3, seed)); out.push(result(2, "two-step success only", s)); }
  { const s = fresh(); right(s, variants("lboth", "practice", 3, seed)); out.push(result(3, "both-sides success only", s)); }
  { const s = fresh(); right(s, variants("lbrk", "practice", 3, seed)); out.push(result(4, "bracket-equation success only", s)); }
  { const s = fresh(); for (const f of ["lin", "lboth", "lbrk"]) right(s, variants(f, "practice", 2, seed)); out.push(result(5, "mixed-family success (two-step, both sides, brackets)", s)); }
  { const s = fresh(); right(s, variants("lin", "practice", 8, seed)); out.push(result(6, "repeated two-step success, nothing on other kinds", s)); }
  { const s = fresh(); right(s, variants("lin", "practice", 3, seed), "practice", { working: (q) => linWorking(q, true) }); out.push(result(7, "correct final answer with invalid working", s)); }
  { const s = fresh(); right(s, variants("lin", "practice", 3, seed), "practice", { working: (q) => [`x = ${answerOf(q)}`] }); out.push(result(8, "correct bare answer without method evidence", s)); }
  { const s = fresh(); right(s, variants("lin", "practice", 3, seed), "practice", { working: linUnregistered }); out.push(result(9, "unsupported mathematical working", s)); }
  { const s = fresh(); right(s, variants("lin", "practice", 3, seed), "practice", { hints: 1 }); wrong(s, variants("lin", "check", 2, seed)); out.push(result(10, "assisted success followed by independent failure", s)); }
  { const s = fresh(); right(s, variants("lin", "practice", 2, seed)); right(s, variants("lin", "check", 1, seed), "check"); out.push(result(11, "successful independent recheck", s)); }
  { const s = fresh(); right(s, variants("lin", "practice", 2, seed)); wrong(s, variants("lin", "check", 1, seed), "check"); out.push(result(12, "failed independent recheck", s)); }
  {
    // the module's own delayed check (one two-step and one modelling question), seven full days after being shown alone
    const s = fresh(); right(s, variants("lin", "practice", 2, seed)); right(s, variants("auleq", "practice", 2, seed)); right(s, variants("lboth", "practice", 2, seed)); s.wait(8); right(s, mod.retention, "retention");
    out.push(result(13, "successful delayed retention (module check: two-step + modelling)", s));
  }
  {
    const s = fresh(); right(s, variants("lin", "practice", 2, seed)); right(s, variants("lboth", "practice", 2, seed)); s.wait(8);
    wrong(s, [mod.retention[0]], "retention"); right(s, [mod.retention[1]], "retention");
    const failed = result(14, "failed delayed retention (two-step)", s);
    right(s, variants("lin", "practice", 2, seed + 1)); // recovery: two fresh two-step questions right alone
    const recovered = result(14, "failed delayed retention, then recovery", s);
    out.push({ ...recovered, name: "failed delayed retention with recovery", projection: recovered.projection, supporting: recovered.supporting, authoritative: recovered.authoritative, discrepancy: recovered.discrepancy, ...{ beforeRecovery: { authoritative: failed.authoritative, projection: failed.projection } } } as ScenarioResult);
  }
  {
    const s = fresh(); for (const f of ["lin", "lboth", "lbrk", "auleq"]) right(s, variants(f, "practice", 2, seed)); wrong(s, variants("lbrk", "check", 1, seed), "check");
    const a = JSON.stringify(projectionOf(s));
    const r = SliceSession.fromEvents(s.learnerId, COMPETENCY, s.events, s.now, s.session); Object.assign(r.decisions, s.decisions);
    const b = JSON.stringify(projectionOf(r));
    const shuffled = [...s.events].reverse();
    const c = JSON.stringify(projectionOf(r, shuffled));
    const res = result(15, "restart and deterministic replay", r);
    out.push({ ...res, ...{ replay: { identicalAfterRestart: a === b, identicalWithReversedStoreOrder: a === c } } } as ScenarioResult);
  }
  {
    // records from before family ids were part of the question id: the projection cannot place them and invents nothing
    const s = fresh(); right(s, variants("lin", "practice", 2, seed));
    const legacy = (s.events.at(-1) as LearningRecord & { questionId: string });
    s.events.push({ ...legacy, id: `${legacy.id}-legacy1`, at: new Date(s.now + 60_000).toISOString(), questionId: "lin-legacy-0007" } as LearningRecord);
    s.events.push({ ...legacy, id: `${legacy.id}-legacy2`, at: new Date(s.now + 120_000).toISOString(), questionId: "gen:linold:2,5,3" } as LearningRecord);
    s.now += 180_000;
    out.push(result(16, "historical events with missing family metadata", s));
  }
  { const s = fresh(); right(s, variants("meet", "practice", 3, seed)); out.push(result(17, "unknown or unmapped question family (meet)", s)); }
  return out;
}
export const E1_DAY = DAY;
