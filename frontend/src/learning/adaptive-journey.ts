/**
 * adaptive-journey@1: one Grade 10 competency driven end to end through the production engine, as the app drives it:
 *
 *   topicCheck (year/topic-session.ts)  starting-point diagnostics, diagnostic@2 investigation, supporting-skill check
 *   topicPlan                           the study plan (supporting skill, the target when teaching is pending, planner)
 *   moduleState (intervention.ts)       each planned skill's module: teach, guided, check alone, verify, retention
 *   make.attempt / learnerState         the authoritative grading decision, records, evidence, status and next action
 *
 * Only the LEARNER is scripted (a synthetic answer policy per scenario; no real child's data). Every decision about
 * what to ask, teach or record is the engine's. The trace adds two read-only annotations the engine does not use:
 * the student-working check (working@1, where the question family supports it) and the E7 process policy in shadow
 * (e7-process-shadow@1, advisory: it never feeds credit, evidence or the plan).
 */
import { assessWithPolicy } from "../../../packages/learning/src/assessment-policy";
import { contractFor } from "../../../packages/learning/src/assessment";
import { moduleFor, question } from "../../../packages/learning/src/content";
import { sampleFor } from "../../../packages/learning/src/curricula";
import { problemOf, show, type Problem } from "../../../packages/learning/src/families";
import { formCertified } from "../../../packages/learning/src/grading/certify";
import { grade } from "../../../packages/learning/src/grading/decision";
import { shadowProcessRecord } from "../../../packages/learning/src/grading/process-shadow";
import { hypotheses, hypothesesFor } from "../../../packages/learning/src/hypotheses";
import { investigateContext, moduleState, recovery, teachingHistory, type ModuleState } from "../../../packages/learning/src/intervention";
import { quarantined } from "../../../packages/learning/src/question-status";
import { reviewOf } from "../../../packages/learning/src/review";
import { canCheckWorking, checkWorking } from "../../../packages/learning/src/working";
import { topicCheck, topicPlan } from "../year/topic-session";
import { activityFor, Driver } from "./driver";

export const TARGET = "MATH.algebra.quadratic-discriminant";
export const GRADE = 10;
const T0 = Date.parse("2026-09-01T09:00:00Z");

/** What a learner means (a value, or "right"), written the way the question takes it (a letter for a choice question). */
export function respond(qid: string, value: "right" | number | string): string {
  const q = question(qid);
  if (value === "right") return q.answer;
  const text = typeof value === "number" ? show(value) : value;
  if (q.options?.length) {
    const i = q.options.findIndex((c) => c.trim() === text);
    // a value that is not among the choices: the learner picks the first wrong choice (still a readable answer)
    const wrong = q.options.findIndex((_, k) => "ABCD"[k] !== q.answer);
    return "ABCD"[i >= 0 ? i : wrong];
  }
  return text;
}
export const bugValue = (p: Problem | null, ids: Set<string>) => {
  const b = p?.bugs.find((x) => ids.has(x.id) && x.predict !== null);
  if (!b) return null;
  const v = (Array.isArray(b.predict) ? b.predict[0] : b.predict) as number;
  // a choice problem's predictions are option positions: the learner means the option at that position
  return p!.type === "choice" && typeof v === "number" ? (question(p!.id).options?.[v] ?? v) : v;
};
/** A careless slip: off by one from the right value (a numeric answer), never a known misconception's prediction. */
export const slipFor = (qid: string) => slip(qid);
/** whether a slip can be written for this question (a choice, or a numeric answer) */
export const slippable = (qid: string) => !!question(qid).options?.length || Number.isFinite(Number(question(qid).answer.trim().replace(/−/g, "-")));
export function slip(qid: string): string {
  const q = question(qid);
  if (q.options?.length) return respond(qid, "__wrong__");
  // a list of numbers (e.g. the roots "2,3"): the last one off by one, still a readable answer of the same shape
  const parts = q.answer.split(",").map((x) => x.trim().replace(/−/g, "-"));
  if (parts.length > 1 && parts.every((x) => Number.isFinite(Number(x)))) return [...parts.slice(0, -1), show(Number(parts.at(-1)) + 1)].join(",");
  const v = Number(q.answer.trim().replace(/−/g, "-"));
  if (!Number.isFinite(v)) throw new Error(`no numeric slip for ${qid}`);
  const p = problemOf(qid);
  const preds = new Set((p?.bugs ?? []).map((b) => show(Array.isArray(b.predict) ? b.predict[0] : b.predict as number)));
  return show([v + 1, v - 1, v + 2].find((x) => !preds.has(show(x)) && x >= 0)!);
}

export interface TraceStep {
  step: number;
  stage: "topic-check" | "plan" | "module" | "recovery" | "session";
  competency: string | null;
  phase?: string;
  question?: string | null;
  questionStatus?: { formCertified: boolean; quarantined: boolean };
  activity?: string;
  context?: string;
  working?: string[];
  response?: string;
  hints?: number;
  authoritative?: { verdict: string; reason: string; credit: boolean | null };
  recordedAsAttempt?: boolean;
  stepFindings?: { supported: boolean; result?: unknown };
  e7Shadow?: { advisory: true; agreement: string; projection: string; impliedVerdict: string } | { advisory: true; notApplicable: string };
  diagnosis?: { result: string | null; confidence: number; posterior?: Record<string, number> } | null;
  reasoning?: { status: string; best: string | null; competing: string[]; support: Record<string, number> } | null;
  finding?: { explanation: string; kind: string; competency: string | null; establishedOn: string; resolved: boolean } | null;
  intervention?: { support: string | null; plan: unknown; strategy?: { id: string; kind: string; title: string; screens: number }; moduleReview?: string };
  reason?: string;
  evidenceBefore?: Snapshot;
  evidenceAfter?: Snapshot;
  next?: unknown;
  planItems?: { competency: string; reason: string }[];
  /** learner-hypothesis@1, every hypothesis the records support (plan steps only) */
  hypotheses?: unknown[];
  /** set when the step is NOT a transition the app makes on its own (e.g. investigating a module answer) */
  supplementary?: string;
}
interface Snapshot { status: string; independent: { right: number; total: number }; assisted: { right: number; total: number }; retention: string }

export class Journey {
  d: Driver;
  steps: TraceStep[] = [];
  release: ReturnType<typeof sampleFor> & object;
  constructor(id: string, now = T0, grade = GRADE) {
    this.release = sampleFor(grade)!;
    this.d = new Driver(`synthetic-${id}`, now);
    this.d.enrol(grade, "2026-27", this.release);
  }
  ctx() {
    const st = this.d.state();
    return { records: st.records, evidence: st.evidence, now: this.d.now, session: this.d.session, saving: false, answer: async () => true, teach: async () => true } as never;
  }
  snap(c: string): Snapshot {
    const e = this.d.state().evidence(c);
    return { status: e.status, independent: { ...e.independent }, assisted: { ...e.assisted }, retention: e.retention };
  }
  next() { return this.d.state().next; }
  private async annotate(qid: string, response: string, working: string[] = []) {
    const g = grade(qid, response, working);
    const p = problemOf(qid);
    const stepFindings = p && canCheckWorking(p) ? { supported: true, result: working.length ? checkWorking(p, working) : "no working written" } : { supported: false };
    let e7Shadow: TraceStep["e7Shadow"];
    const c = contractFor(qid);
    const statement = (c?.problem as { statement?: string; domain?: string } | undefined);
    if (statement?.statement && statement.domain === "algebra") {
      const pg = (await assessWithPolicy({ domain: "algebra", statement: statement.statement }, { format: "natural", text: response }, { mode: "answer-only" })).grade;
      const r = shadowProcessRecord(g.decision, pg);
      e7Shadow = { advisory: true, agreement: r.agreement, projection: r.projection, impliedVerdict: r.implied.verdict };
    } else e7Shadow = { advisory: true, notApplicable: "no algebra statement in this question's contract (the process policy covers algebra kernels)" };
    return { authoritative: { verdict: g.decision.verdict, reason: String(g.decision.reason), credit: g.assessment.credit ?? null }, stepFindings, e7Shadow, questionStatus: { formCertified: formCertified(qid), quarantined: quarantined(qid) } };
  }
  private async answer(stage: TraceStep["stage"], competency: string, qid: string, response: string, activity: string, o: { context?: string; hints?: number; working?: string[]; phase?: string; extra?: Partial<TraceStep> } = {}) {
    const before = this.snap(competency);
    const ann = await this.annotate(qid, response, o.working ?? []);
    const n = this.d.events.length;
    this.d.answer(qid, response, activity as never, { context: o.context, hints: o.hints, working: o.working });
    const recorded = this.d.state().records.attempts.some((a) => a.id === (this.d.events[n] as { id?: string }).id);
    this.steps.push({ step: this.steps.length + 1, stage, competency, phase: o.phase, question: qid, activity, context: o.context, response, ...(o.working?.length ? { working: o.working } : {}), hints: o.hints ?? 0, ...ann, recordedAsAttempt: recorded, evidenceBefore: before, evidenceAfter: this.snap(competency), next: this.next(), ...o.extra });
  }
  private findingOf(competency: string) {
    const f = hypothesesFor(competency, this.d.state().records).filter((h) => h.status === "established" || h.status === "resolved").at(-1);
    return f ? { explanation: f.claim!.explanation, kind: f.claim!.kind, competency: f.scope.about, establishedOn: f.scope.question, resolved: f.status === "resolved" } : null;
  }
  /** The starting-point check (TopicSession.tsx), until it asks nothing more. */
  async topicCheck(target: string, answer: (qid: string) => string) {
    for (let i = 0; i < 20; i++) {
      const c = topicCheck(target, this.ctx());
      const r = c.recovery?.reasoning;
      const extra: Partial<TraceStep> = {
        diagnosis: c.diagnosis ? { result: c.diagnosis.result, confidence: c.diagnosis.confidence, posterior: c.diagnosis.posterior } : null,
        reasoning: r ? { status: r.status, best: r.best?.id ?? null, competing: r.competing.map((x) => x.id), support: r.support } : null,
        intervention: { support: c.support, plan: c.recovery?.plan ?? null },
        reason: c.reason,
      };
      if (!c.question) {
        this.steps.push({ step: this.steps.length + 1, stage: "topic-check", competency: target, phase: "complete", question: null, ...extra, finding: this.findingOf(target), evidenceAfter: this.snap(target), next: this.next() });
        return c;
      }
      const comp = question(c.question).competency;
      await this.answer("topic-check", comp, c.question, answer(c.question), c.context ? "probe" : "diagnostic", { context: c.context, phase: c.context ? "investigate" : "diagnostic", extra });
    }
    throw new Error("topic check did not finish");
  }
  plan(target: string, minutes: 15 | 30 | 60 = 60) {
    const p = topicPlan(target, this.release, this.ctx(), minutes);
    this.steps.push({ step: this.steps.length + 1, stage: "plan", competency: target, planItems: p.items.map((i) => ({ competency: i.competency, reason: i.reason })), finding: this.findingOf(target), hypotheses: hypotheses(this.d.state().records), evidenceAfter: this.snap(target), next: this.next() });
    return p;
  }
  /** One skill's module (StudySession → Module), until done, pause or nothing to ask. */
  async module(competency: string, answer: (qid: string, ms: ModuleState) => { response: string; hints?: number; working?: string[] }, max = 30) {
    for (let i = 0; i < max; i++) {
      const st = this.d.state();
      const ms = moduleState(competency, st.records, st.evidence(competency), this.d.now, this.d.session);
      const common: Partial<TraceStep> = {
        phase: ms.phase,
        diagnosis: ms.diagnosis ? { result: ms.diagnosis.result, confidence: ms.diagnosis.confidence } : null,
        finding: this.findingOf(competency),
        reason: ms.reason,
      };
      if (ms.phase === "chapter" && ms.strategy) {
        const before = this.snap(competency);
        this.d.events.push((await import("../../../packages/learning/src/session")).make.teach(this.d.ctx(), competency, ms.strategy.id, ms.decision?.diagnosis.kind ?? ms.diagnosis?.result ?? "diagnosis"));
        this.steps.push({ step: this.steps.length + 1, stage: "module", competency, ...common, intervention: { support: null, plan: ms.decision?.action ?? null, strategy: { id: ms.strategy.id, kind: ms.strategy.kind, title: ms.strategy.title, screens: ms.strategy.screens.length }, moduleReview: reviewOf(competency).state }, evidenceBefore: before, evidenceAfter: this.snap(competency), next: this.next() });
        continue;
      }
      if (!ms.question || ms.phase === "done" || ms.phase === "pause") {
        this.steps.push({ step: this.steps.length + 1, stage: "module", competency, ...common, question: null, evidenceAfter: this.snap(competency), next: this.next() });
        return ms;
      }
      const a = answer(ms.question, ms);
      await this.answer("module", competency, ms.question, a.response, activityFor(ms), { hints: a.hints, working: a.working, context: (ms as { context?: string }).context, phase: ms.phase, extra: { ...common, intervention: ms.strategy ? { support: null, plan: ms.decision?.action ?? null, strategy: { id: ms.strategy.id, kind: ms.strategy.kind, title: ms.strategy.title, screens: ms.strategy.screens.length } } : undefined } });
    }
    return null;
  }
  /** The app's "a problem you are stuck on" flow for one wrong answer (Learn.tsx Recovery): investigation questions only. */
  async investigate(original: string, answer: (qid: string) => string, supplementary?: string) {
    for (let i = 0; i < 5; i++) {
      const st = this.d.state();
      const r = recovery(original, st.records, st.evidence, this.d.now, this.d.session);
      const extra: Partial<TraceStep> = { reasoning: r.reasoning ? { status: r.reasoning.status, best: r.reasoning.best?.id ?? null, competing: r.reasoning.competing.map((x) => x.id), support: r.reasoning.support } : null, intervention: { support: r.active, plan: r.plan }, reason: r.reason };
      if (r.phase !== "investigate" || !r.question) {
        this.steps.push({ step: this.steps.length + 1, stage: "recovery", competency: r.competency, phase: r.phase, question: null, ...extra, supplementary, finding: this.findingOf(r.competency), evidenceAfter: this.snap(r.competency), next: this.next() });
        return r;
      }
      await this.answer("recovery", question(r.question).competency, r.question, answer(r.question), "diagnostic", { context: investigateContext(original), phase: "investigate", extra: { ...extra, supplementary } });
    }
    return null;
  }
  /** the shared state at the end: every learner hypothesis, and the teaching history of each skill worked on */
  summary() {
    const st = this.d.state();
    const skills = [...new Set(st.records.teaching.map((t) => t.competency).concat(TARGET))];
    return { hypotheses: hypotheses(st.records), teachingHistory: Object.fromEntries(skills.map((c) => [c, moduleFor(c) ? teachingHistory(moduleFor(c)!, st.records) : null])) };
  }
  /** record ids are random (session.ts); traces name each record by its position in the event log instead */
  stable<T>(x: T): T {
    const ids = new Map(this.d.events.map((e, i) => [(e as { id?: string }).id, `record#${i}`]));
    return JSON.parse(JSON.stringify(x, (_k, v) => (typeof v === "string" && ids.has(v) ? ids.get(v) : v)));
  }
  newSession(days: number) {
    this.d.newSession(days);
    this.steps.push({ step: this.steps.length + 1, stage: "session", competency: null, reason: `new session after ${days} day(s)`, next: this.next() });
  }
}

// ---------------------------------------------------------------- the three synthetic learners (scripted answers only)

/**
 * A: strong prior independent evidence, then exactly one careless arithmetic slip (off by one, or a wrong choice; no
 * known misconception predicts it). Three variants of where the slip falls:
 *   A1  on a fresh question alone in the module (the fifth answer, or the first slippable one after it); delayed check right
 *   A2  no slip in the module; the one slip is on the delayed check eight days later
 *   A3  (defect reproduction, two slips) A1's slip AND A2's slip
 */
async function careless(variant: "A1" | "A2" | "A3") {
  const j = new Journey(`${variant}-careless`);
  await j.topicCheck(TARGET, (q) => respond(q, "right"));
  j.plan(TARGET);
  let n = 0, slipped: string | null = null;
  const slipInModule = variant !== "A2";
  await j.module(TARGET, (q) => (slipInModule && ++n >= 5 && !slipped && slippable(q) ? ((slipped = q), { response: slip(q) }) : { response: respond(q, "right") }));
  // supplementary (A1 only): the app opens recovery only for a "stuck" original problem (Main.tsx STUCK), never for a
  // module answer; it is run here to show what diagnostic@2 concludes about a slip when it is asked
  if (slipped && variant === "A1") await j.investigate(slipped, (q) => respond(q, "right"), "not reached by the app for a module answer: recovery opens only for 'original' (stuck) problems");
  const afterSlip = j.snap(TARGET);
  j.plan(TARGET);
  j.newSession(8);
  let retentionSlip: string | null = null;
  const slipOnCheck = variant !== "A1";
  await j.module(TARGET, (q, ms) => (slipOnCheck && ms.phase === "retention" && !retentionSlip && slippable(q) ? ((retentionSlip = q), { response: slip(q) }) : { response: respond(q, "right") }), 6);
  j.plan(TARGET);
  return j.stable({ scenario: `${variant}-careless-error`, slipped, retentionSlip, steps: j.steps, final: { afterSlip, target: j.snap(TARGET), next: j.next(), ...j.summary() } });
}
export const scenarioA1 = () => careless("A1");
export const scenarioA2 = () => careless("A2");
export const scenarioA3 = () => careless("A3");

/** B: a learner who subtracts a negative as if it were positive (the sign of −4ac, and in integer subtraction) until taught. */
export async function scenarioB() {
  const j = new Journey("B-prerequisite");
  const BUGS = new Set(["minus-c-sign", "minus-negative-as-minus"]);
  // the learner's misunderstanding lasts until it has been taught (any teaching on the target or the integer skill)
  const taught = () => j.d.events.some((e) => (e as { record?: string; competency?: string }).record === "teach");
  const learner = (q: string) => { const v = taught() ? null : bugValue(problemOf(q), BUGS); return v === null ? respond(q, "right") : respond(q, v); };
  await j.topicCheck(TARGET, learner);
  const plan = j.plan(TARGET);
  for (const it of plan.items) await j.module(it.competency, (q) => ({ response: learner(q) }), 12);
  j.newSession(1);
  await j.module(TARGET, (q) => ({ response: learner(q) }), 4);
  j.plan(TARGET);
  return j.stable({ scenario: "B-prerequisite-gap", steps: j.steps, final: { target: j.snap(TARGET), support: j.snap("MATH.number.integer-add"), next: j.next(), ...j.summary() } });
}

/** C: right only with a hint on guided questions; wrong (a readable wrong answer) whenever working alone. */
export async function scenarioC() {
  const j = new Journey("C-assisted");
  const alone = (q: string) => slip(q);
  await j.topicCheck(TARGET, alone);
  const plan = j.plan(TARGET);
  const work = (q: string, ms: ModuleState) => (ms.phase === "guided" ? { response: respond(q, "right"), hints: 1 } : { response: alone(q) });
  for (const it of plan.items) await j.module(it.competency, work, 20);
  if (!plan.items.some((i) => i.competency === TARGET)) await j.module(TARGET, work, 20);
  return j.stable({ scenario: "C-assisted-only", steps: j.steps, final: { target: j.snap(TARGET), next: j.next(), ...j.summary() } });
}

export const SCENARIOS = { A1: scenarioA1, A2: scenarioA2, A3: scenarioA3, B: scenarioB, C: scenarioC } as const;
