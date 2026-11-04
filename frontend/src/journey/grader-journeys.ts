/**
 * Workstream D1: learner journeys through the integrated grader + A3 teaching. ONLY what the learner types is scripted here (an answer, or
 * working lines and an answer typed as one submission: "3x = 15; x = 5"). Grading (with the working judged by the derivation authority inside
 * the trusted grader), evidence, adaptive decisions, teaching selection, the content gate, rechecks and retention are the real components,
 * run through the real flow (flow.ts -> session.ts -> server-grader.ts). `traceOf` reads the machine-readable record back from the session.
 */
import { question } from "../../../packages/learning/src/content";
import { FAMILIES, problemOf } from "../../../packages/learning/src/families";
import { setTeachingMode } from "../../../packages/learning/src/explanation-review";
import type { GradingDecision } from "../../../packages/learning/src/grading/decision";
import { learners, misconception, right, wrong, type Learner, type LearnerView } from "./learners";
import { runScenario, type Run, type Scenario } from "./scenarios";
import { workingFeedback, feedbackFromDecision } from "./renderer-adapter";

export const REF = "le-ref-3x-19-4";
export const C = "MATH.algebra.linear-equations";
const familyOf = (q: string) => problemOf(q.replace(/:(mc|w)$/, ""))?.family ?? "authored";

/** What a learner writes: each new equation once (as the family's own worked solution states it), ending with the answer (A3's model). */
const fromWorked = (steps: string[], answer: string) => { const w = steps.slice(1).filter((l) => !l.startsWith("Check") && l.split(" = ").length === 2 && !/ [−+] \S+ = .* [−+] \S+$/.test(l) && !/÷/.test(l)); return w.at(-1) === `x = ${answer}` ? w : [...w, `x = ${answer}`]; };
/** the right answer typed with working where the learner can write some (an equation question); a bare answer otherwise */
export function withWorking(q: string): string {
  const a = right(q);
  if (q === REF) return "3x = 15; x = 5";
  if (/:(mc|w)$/.test(q)) return a;
  const p = problemOf(q);
  const t = p && FAMILIES.get(p.family)?.teach?.instance?.(p.params);
  return t ? fromWorked(t.worked.steps.map((s) => s.expression), a).join("; ") : a;
}
const typed = (answer: string): { answer: string } => ({ answer });
const L = (name: string, act: (v: LearnerView) => { answer: string }): Learner => ({ name, act });

/** the first submission on the reference problem, then right with working */
const firstThen = (first: string, after: (q: string) => string = withWorking) => { let n = 0; return L(`"${first}" on ${REF}, then right with working`, (v) => typed(n++ === 0 ? first : after(v.q))); };

export interface Journey { id: string; title: string; start: string; /** the M2 scenario category the learner belongs to (1: strong, isolated slip; 5 otherwise) */ category?: 1 | 5; learner: () => Learner; later?: number[]; mode?: "demonstration" | "supervised-evaluation" }
export const JOURNEYS: Journey[] = [
  { id: "D1-01", title: "Wrong bare answer, general teaching, fresh recheck", start: REF, learner: () => L("wrong bare answers until taught once, then right with working", (v) => typed(v.taught === 0 ? (v.q === REF ? "x = 4" : wrong(v.q)) : withWorking(v.q))) },
  { id: "D1-02", category: 1, title: "Correct bare answer: no method evidence", start: REF, learner: () => L("right, bare answers only", (v) => typed(v.q === REF ? "x = 5" : right(v.q))) },
  { id: "D1-03", category: 1, title: "Correct answer with verified multi-step working", start: REF, learner: () => L("right with working", (v) => typed(withWorking(v.q))) },
  { id: "D1-04", title: "Correct answer reached through invalid working", start: REF, learner: () => firstThen("3x = 16; x = 5") },
  { id: "D1-05", title: "Incorrect answer with an identified invalid transformation", start: REF, learner: () => firstThen("3x = 15; x = 4") },
  { id: "D1-06", title: "Valid partial derivation", start: REF, learner: () => firstThen("3x = 15") },
  { id: "D1-07", title: "Unsupported working", start: REF, learner: () => firstThen("3x = 15 => x = 5; x = 5") },
  { id: "D1-08", title: "Verified misconception, matching teaching", start: REF, learner: () => L("forgot-divide until taught once, then right with working", (v) => typed(v.taught === 0 ? (misconception(v.q, new Set(["forgot-divide"])) ?? withWorking(v.q)) : withWorking(v.q))) },
  { id: "D1-09", category: 1, title: "Isolated slip without unnecessary teaching", start: REF, learner: () => { const s = learners.oneSlip(3); return L(s.name + ", working elsewhere", (v) => { const a = s.act(v) as { answer: string }; return typed(a.answer === right(v.q) ? withWorking(v.q) : a.answer); }); } },
  { id: "D1-10", title: "Repeated difficulty with bounded intervention", start: REF, learner: () => L("always wrong (readable)", (v) => typed(v.q === REF ? "x = 4" : wrong(v.q))) },
  { id: "D1-11", title: "Successful independent recovery", start: REF, learner: () => L("forgot-divide until taught once, then right with working", (v) => typed(v.taught === 0 ? (misconception(v.q, new Set(["forgot-divide"])) ?? withWorking(v.q)) : withWorking(v.q))) },
  { id: "D1-12", title: "Failed independent recheck", start: REF, learner: () => L("forgot-divide until taught twice, then right with working", (v) => typed(v.taught < 2 ? (misconception(v.q, new Set(["forgot-divide"])) ?? withWorking(v.q)) : withWorking(v.q))) },
  { id: "D1-13", title: "Failed delayed retention, then recovery", start: REF, later: [8], learner: () => { const s = learners.slipOnRetention(); return L(s.name + ", working otherwise", (v) => { const a = s.act(v) as { answer: string }; return typed(a.answer === right(v.q) ? withWorking(v.q) : a.answer); }); } },
  { id: "D1-14", title: "Unapproved explanation blocked in supervised mode", start: REF, mode: "supervised-evaluation", learner: () => L("forgot-divide until taught once, then right with working", (v) => typed(v.taught === 0 ? (misconception(v.q, new Set(["forgot-divide"])) ?? withWorking(v.q)) : withWorking(v.q))) },
];

export function runJourney(j: Journey): Run {
  const prev = setTeachingMode(j.mode ?? "demonstration");
  try { return runScenario({ id: j.id, category: j.category ?? 5, start: j.start, learner: j.learner, expect: {}, ...(j.later ? { later: j.later } : {}) } as Scenario); } finally { setTeachingMode(prev); }
}

/** the machine-readable record of a run: every submission as graded, every teaching decision, and the learner state after */
export function traceOf(j: Journey, r: Run) {
  const s = r.f.session;
  const typedAt = r.actions.filter((a) => a.act !== "hint" && a.act !== "retry");
  const submissions = s.replies.map((rep, i) => {
    const d = rep.decision as GradingDecision | null, w = d?.working;
    const fb = d ? feedbackFromDecision(d) : null;
    return {
      n: i + 1, question: rep.id, family: familyOf(rep.id), activity: typedAt[i]?.activity ?? null, phase: typedAt[i]?.phase ?? null, typed: typedAt[i]?.act ?? null,
      response: d?.response.raw ?? null, working: d?.response.working ?? [],
      answer: { verdict: rep.verdict, reason: rep.reason, credit: rep.credit },
      method: w ? { status: w.status, evidence: w.methodEvidence, completeness: w.completeness, firstInvalid: w.firstInvalid, workingAnswer: w.workingAnswer, agreesWithResponse: w.agreesWithResponse, substitution: w.substitution, certificates: w.certificates.length, replayed: w.replayed, replayedLines: w.replayedLines, authority: w.versions.authority } : null,
      feedback: fb ? { level: fb.level, message: fb.message, workingLines: workingFeedback(d)?.steps.map((x) => ({ line: x.math.plain || x.description, shownAs: x.verified ? "checked" : x.badge })) ?? [] } : null,
    };
  });
  const reviews = s.trace.filter((t) => t.component === "explanation-review.contentEligibility").map((t) => ({ ...(t.input as object), ...(t.output as object) })) as { strategy: string; mode: string | null; eligible: boolean | null; status: string | null; educatorApproved: boolean | null; failed: string[] | null; label: string | null; basis?: string; misconceptionEvidence?: boolean }[];
  const teaches = (s.events as unknown as { record: string; strategy?: string; at: string; competency?: string }[]).filter((e) => e.record === "teach");
  const recs = s.state().records;
  const teaching = teaches.map((t, i) => {
    const next = teaches[i + 1]?.at ?? "9999";
    const rc = recs.attempts.find((a) => a.at > t.at && a.at < next && a.activity === "check" && a.n === 1 && a.hints === 0);
    const rv = reviews.find((x) => x.strategy === t.strategy);
    const rcReply = rc ? s.replies.find((x, k) => submissions[k] && x.id === rc.questionId && (x.decision as GradingDecision | null)?.response.raw === rc.response) : null;
    return { explanation: t.strategy, basis: rv?.basis ?? null, misconceptionEvidence: rv?.misconceptionEvidence ?? null, review: rv?.status ?? null, educatorApproved: rv?.educatorApproved ?? null, label: rv?.label ?? null,
      displayed: r.f.frames.some((f) => f.stage === "teaching" && f.strategyId === t.strategy),
      recheck: rc ? { question: rc.questionId, family: familyOf(rc.questionId), freshQuestion: !r.f.frames.some((f) => f.stage === "teaching" && f.strategyId === t.strategy && f.qid === rc.questionId), credit: rc.credit ?? null, method: (rcReply?.decision as GradingDecision | null)?.working?.methodEvidence ?? "no working" } : null };
  });
  const engine = s.trace.filter((t) => t.component === "intervention.moduleState" || t.component === "intervention.recovery").map((t) => { const o = t.output as { phase: string; question: string | null; strategy?: string | null; reason: string; best?: string | null; status?: string | null }; return { by: t.component, phase: o.phase, question: o.question, strategy: o.strategy ?? null, best: o.best ?? null, status: o.status ?? null, reason: o.reason }; });
  const refused = reviews.filter((x) => x.eligible === false).map((x) => ({ explanation: x.strategy, mode: x.mode, status: x.status, failed: x.failed }));
  const e = s.state().evidence(C);
  const families = [...new Set(recs.attempts.filter((a) => question(a.questionId).competency === C).map((a) => familyOf(a.questionId)))];
  return {
    id: j.id, title: j.title, mode: j.mode ?? "demonstration", learner: j.learner().name, ended: r.f.ended?.phase ?? null, interactions: r.interactions,
    submissions, teaching, refused, engine,
    after: { competency: C, status: e.status, verified: e.verified, recoveryRequired: e.recoveryRequired, retention: e.retention, retentionHistory: e.retentionHistory.map((h) => h.result), independent: e.independent, familiesInEvidence: families },
  };
}
export type JourneyTrace = ReturnType<typeof traceOf>;
