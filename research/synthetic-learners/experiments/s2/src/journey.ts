/**
 * S2 journey runner (synthetic-experiment-journey@1). One synthetic learner through the REAL integrated (D1 + E1) linear-equations journey.
 *
 * OpenPath decides everything: the entry question is the module's own diagnostic question; every later question, explanation, recheck,
 * delayed check and recovery step comes from the real flow (SliceFlow → moduleState / recovery); every verdict from the trusted grader; the
 * delayed-check date from OpenPath's own evidence. The learner only answers, asks for hints, continues, and decides WHEN to come back, using
 * learner-visible information only (the summary message and the topic page's delayed-check fact).
 *
 * Return policy (pre-registered, the same for every cohort):
 *   - the topic page shows a delayed-check DATE  → come back on that date, at the learner's usual time (09:00 UTC);
 *   - it shows "Passed"                          → the journey is complete;
 *   - anything else ("Not yet", "Due now", "Missed") → come back the next day, or in 2 days when the summary says to go through it with a
 *     teacher or parent (a pause).
 * Bounds: 16 visits, 120 simulated days, 250 learner interactions per visit (an explanation step counts as one). A journey that hits a bound is
 * reported as a bounded failure. A journey in which OpenPath offers nothing (no question, no explanation) on 3 consecutive visits is "stalled".
 */
import { moduleFor } from "../../../../../packages/learning/src/content";
import { hypotheses } from "../../../../../packages/learning/src/hypotheses";
import { problemOf } from "../../../../../packages/learning/src/families";
import { projectFromEvents } from "../../../../../packages/learning/src/subskill-evidence";
import { SliceFlow } from "../../../../../frontend/src/journey/flow";
import { SimClock } from "../../../src/clock";
import { SyntheticLearner } from "../../../src/learner";
import { ability, KINDS, type HiddenState, type Profile } from "../../../src/model";
import type { LearnerAction } from "../../../src/adapter";
import { D1Port, delayedCheckFact, type DelayedCheckFact, type Frame2 } from "./port";

export const JOURNEY_VERSION = "synthetic-experiment-journey@1" as const;
export const COMPETENCY = "MATH.algebra.linear-equations";
export const START = Date.parse("2026-03-02T09:00:00Z");
export const LIMITS = { visits: 16, days: 120, perVisit: 250, stalledVisits: 3 } as const;
const DAY = 86_400_000;
const FAMILY_KIND: Record<string, string> = { ahone: "one-step", lin: "two-step", lboth: "both-sides", lbrk: "brackets", auleq: "modelling", aulwp: "modelling" };
export const kindOfQuestion = (qid: string): string | null => { const f = problemOf(qid.replace(/:(mc|w)$/, ""))?.family; return f ? FAMILY_KIND[f] ?? null : null; };
/** the kind an explanation of this module teaches (from the module's own strategy: its recheck question's family) */
export function strategyKind(competency: string, strategy: string): string | null {
  const s = moduleFor(competency)?.strategies.find((x) => x.id === strategy);
  return s?.check ? kindOfQuestion(s.check) : null;
}
const abilities = (h: HiddenState) => Object.fromEntries(KINDS.map((k) => [k, Math.round(ability(h, k) * 1000) / 1000]));

export interface VisitTrace {
  visit: number; at: string; factBefore: DelayedCheckFact; summary: string | null; ended: "summary" | "interaction-limit";
  /** OpenPath's decisions in this visit (read from OpenPath's records after the visit; never shown to the learner) */
  openpath: {
    attempts: { at: string; qid: string; kind: string | null; competency: string; activity: string; hints: number; response: string; working: string[] | null; verdict: string | null; workingStatus: string | null; firstInvalid: number | null }[];
    teaching: { at: string; competency: string; strategy: string; kind: string | null }[];
    phases: string[];
    evidence: { status: string; verified: boolean; retention: string; retentionDueAt: string | null; recoveryRequired: boolean; independent: { right: number; total: number }; history: unknown };
    established: { explanation: string; family: string; question: string; status: string }[];
    e1: { subSkills: Record<string, string>; discrepancy: string[] | null; unknown: Record<string, number> };
  };
  /** what the learner saw after each answer (feedback level and message) */
  feedback: { level: string; message: string }[];
  hiddenAfter: { abilities: Record<string, number>; misconceptions: Record<string, number> };
}
export interface JourneyTrace {
  journey: typeof JOURNEY_VERSION; id: string; cohort: string; profile: string; seed: number; learnerId: string;
  initialHidden: { abilities: Record<string, number>; misconceptions: Record<string, number> };
  finalHidden: { abilities: Record<string, number>; misconceptions: Record<string, number> };
  end: "retention-passed" | "visit-limit" | "day-limit" | "interaction-limit" | "stalled";
  bounded: boolean;
  visits: VisitTrace[];
  /** the learner's own instruction outcomes (hidden; drawn by the learning model) */
  instruction: { at: string; title: string; kind: string | null; outcome: string; abilitiesBefore: Record<string, number>; misconceptionsBefore: Record<string, number> }[];
}

/** drive one visit until OpenPath ends it (summary) or the interaction bound */
function drive(port: D1Port, learner: SyntheticLearner, max: number, fb: VisitTrace["feedback"]): { ended: VisitTrace["ended"]; summary: string | null } {
  let teaching: { title: string; text: string[] } | null = null;
  for (let i = 0; i < max; i++) {
    const f: Frame2 = port.frame();
    if (f.stage === "summary") return { ended: "summary", summary: f.message };
    let a: LearnerAction;
    if (f.stage === "question") { const r = learner.respond(f.question); a = r.kind === "hint" ? { type: "hint" } : { type: "answer", value: r.answer, ...(r.working.length ? { working: r.working } : {}) }; }
    else if (f.stage === "feedback") { fb.push({ level: f.feedback, message: f.message }); learner.observeFeedback(f.feedback === "partial" ? "unresolved" : f.feedback); a = { type: "continue" }; }
    else { teaching = teaching && teaching.title === f.teaching.title ? { title: teaching.title, text: [...teaching.text, f.teaching.text] } : { title: f.teaching.title, text: [f.teaching.text] }; a = { type: "continue" }; }
    const next = port.act(a);
    if (teaching && f.stage === "teaching" && (next.stage !== "teaching" || next.teaching.title !== teaching.title)) { learner.observeTeaching({ title: teaching.title, text: teaching.text.at(-1) ?? "" }); teaching = null; }
  }
  return { ended: "interaction-limit", summary: null };
}

/** M1 addition: an observer called after each visit with the stored events (decisions attached). It reads only; no outcome changes. */
export type VisitObserver = (x: { visit: number; learnerId: string; events: readonly { kind: string }[]; now: number }) => void;
export function runS2Journey(profile: Profile, seed: number, cohort: string, o: { limits?: Partial<typeof LIMITS>; onVisit?: VisitObserver } = {}): JourneyTrace {
  const L = { ...LIMITS, ...o.limits };
  const learnerId = `s2-${cohort}-${profile.id}-${seed}`;
  const clock = new SimClock(START);
  const learner = new SyntheticLearner(profile, clock, seed);
  const entry = moduleFor(COMPETENCY)!.diagnostics[0];
  const flow = new SliceFlow(entry, learnerId, START);
  const port = new D1Port(flow);
  const snap = () => { const h = learner.hiddenSnapshot(); return { abilities: abilities(h), misconceptions: Object.fromEntries(Object.entries(h.misconception).map(([k, v]) => [k, v as number])) }; };
  const initialHidden = snap();
  const visits: VisitTrace[] = [];
  let end: JourneyTrace["end"] = "visit-limit";
  let fact: DelayedCheckFact = { label: "Not yet" };
  for (let v = 1; v <= L.visits; v++) {
    const evBefore = flow.session.events.length, framesBefore = flow.frames.length;
    const fb: VisitTrace["feedback"] = [];
    const at = new Date(flow.session.now).toISOString();
    const r = drive(port, learner, L.perVisit, fb);
    // ---- what OpenPath did in this visit (records read after the visit; the learner never sees this)
    const st = flow.session.state(), ev = st.evidence(COMPETENCY);
    const newEvents = flow.session.events.slice(evBefore) as unknown as { record?: string; id: string; questionId?: string; competency: string; activity?: string; hints?: number; response?: string; working?: string[]; strategy?: string }[];
    const attempts = newEvents.filter((e) => e.record === "attempt").map((e) => {
      const d = flow.session.decisions[e.id] as unknown as { verdict?: string; working?: { status?: string; firstInvalid?: { index: number } | null } } | undefined;
      return { at: (e as unknown as { at: string }).at, qid: e.questionId!, kind: kindOfQuestion(e.questionId!), competency: e.competency, activity: e.activity!, hints: e.hints ?? 0, response: e.response!, working: e.working ?? null, verdict: d?.verdict ?? null, workingStatus: d?.working?.status ?? null, firstInvalid: d?.working?.firstInvalid?.index ?? null };
    });
    const teaching = newEvents.filter((e) => e.record === "teach").map((e) => ({ at: (e as unknown as { at: string }).at, competency: e.competency, strategy: e.strategy!, kind: strategyKind(e.competency, e.strategy!) }));
    const phases = flow.frames.slice(framesBefore).map((f) => (f as { phase?: string }).phase ?? f.stage).filter((p, i, a) => i === 0 || a[i - 1] !== p);
    const hs = hypotheses(st.records).filter((h) => h.claim && (h.status === "established" || h.status === "resolved" || h.status === "contested")).map((h) => ({ explanation: h.claim!.explanation, family: problemOf(String(h.scope.family).replace(/:(mc|w)$/, ""))?.family ?? String(h.scope.family), question: h.scope.question, status: h.status }));
    const stored = flow.session.events.map((e) => ({ ...(e as object), ...(flow.session.decisions[(e as { id: string }).id] ? { decision: flow.session.decisions[(e as { id: string }).id] } : {}) })) as never as readonly { kind: string }[];
    const p = projectFromEvents(learnerId, stored, flow.session.now, { status: ev.status, verified: ev.verified });
    o.onVisit?.({ visit: v, learnerId, events: stored, now: flow.session.now });
    visits.push({ visit: v, at, factBefore: fact, summary: r.summary, ended: r.ended,
      openpath: { attempts, teaching, phases, evidence: { status: ev.status, verified: ev.verified, retention: ev.retention, retentionDueAt: ev.retentionDueAt, recoveryRequired: ev.recoveryRequired, independent: ev.independent, history: ev.retentionHistory },
        established: hs, e1: { subSkills: Object.fromEntries(p.subSkills.map((s) => [s.id.split(".")[1].replace("@1", ""), s.status])), discrepancy: p.discrepancies[0]?.unsupported.map((u) => u.id.split(".")[1].replace("@1", "")) ?? null, unknown: p.unknown.byReason } },
      feedback: fb, hiddenAfter: snap() });
    if (r.ended === "interaction-limit") { end = "interaction-limit"; break; }
    if (visits.length >= L.stalledVisits && visits.slice(-L.stalledVisits).every((x) => !x.openpath.attempts.length && !x.openpath.teaching.length)) { end = "stalled"; break; }
    // ---- the learner decides when to come back, from what the app shows it
    fact = delayedCheckFact(ev);
    if (fact.label === "Passed") { end = "retention-passed"; break; }
    let next: number;
    if (fact.label === "scheduled") { next = Date.parse(`${fact.date}T09:00:00Z`); if (next <= flow.session.now) next = flow.session.now + DAY; }
    else next = flow.session.now + (/teacher or parent/i.test(r.summary ?? "") ? 2 : 1) * DAY;
    const days = (next - flow.session.now) / DAY;
    if ((next - START) / DAY > L.days) { end = "day-limit"; break; }
    learner.advance(days); port.later(days);
  }
  const hidden = learner.hiddenTrace();
  const instruction = hidden.filter((h) => h.event === "teaching").map((h) => {
    const prev = hidden[h.n - 2];
    const ab = (st: { skill: HiddenState["skill"] }) => Object.fromEntries(KINDS.map((k) => [k, Math.round(Math.min(1, st.skill[k].stable + st.skill[k].fragile) * 1000) / 1000]));
    const d = h.detail as { title: string; understood: { kind: string | null }; outcome: string };
    return { at: h.at, title: d.title, kind: d.understood.kind, outcome: d.outcome, abilitiesBefore: ab(prev.state), misconceptionsBefore: { ...(prev.state.misconception as Record<string, number>) } };
  });
  return { journey: JOURNEY_VERSION, id: learnerId, cohort, profile: `${profile.id}@${profile.version}`, seed, learnerId, initialHidden, finalHidden: snap(), end, bounded: end !== "retention-passed", visits, instruction };
}
