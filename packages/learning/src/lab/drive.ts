/**
 * child-lab@1: drives a lab child through the shipped engine exactly as the family site does, with default settings:
 * the module screen (learnerState(...).module, or moduleState with recovery's finding when recovery passes one, as
 * Learn.tsx's Module does), and the Recovery screen (recovery(), investigate answers recorded as "diagnostic" with the
 * context recovery gives, a lesson recorded as teaching). No fixtures, no research flags.
 */
import { boardFor } from "../curricula";
import { pool } from "../families";
import { investigateContext } from "../hypotheses";
import { moduleState, recovery, type Established, type RecoveryState } from "../intervention";
import { learnerState, make } from "../session";
import { question } from "../content";
import type { LearningRecord } from "../records";
import type { LabChild } from "./slips";

export const DAY = 86_400_000;
const START = Date.parse("2026-11-02T09:00:00Z");
export interface Row { n: number; day: number; where: string; phase: string; active: string | null; qid: string | null; prompt: string; response?: string; right?: boolean; activity?: string; note?: string }
const ACTIVITY: Record<string, string> = { explore: "diagnostic", guided: "guided", check: "check", verify: "practice", retention: "retention" };

export class LabRun {
  events: LearningRecord[] = [];
  now = START;
  session = "s1";
  rows: Row[] = [];
  learnerId: string;
  child: LabChild;
  constructor(learnerId: string, child: LabChild, o: { grade?: number; board?: "tn" | "cbse" } = {}) {
    this.learnerId = learnerId; this.child = child;
    if (o.grade) this.events.push(make.enrol(this.ctx(), o.grade, "2026-27", boardFor(o.board ?? "tn", o.grade)!) as LearningRecord);
  }
  ctx() { return { learnerId: this.learnerId, sessionId: this.session, at: new Date((this.now += 60_000)).toISOString() }; }
  state() { return learnerState(this.learnerId, this.events, this.now, { currentSession: this.session }); }
  day() { return Math.floor((this.now - START) / DAY); }
  answer(qid: string, activity: string, where: string, phase: string, active: string | null, o: { hints?: number; solution?: boolean; response?: string; context?: string } = {}) {
    const response = o.response ?? this.child.answer(qid);
    const rec = make.attempt(this.ctx(), qid, response, activity as never, { hints: o.hints ?? 0, ...(o.solution ? { solution: true } : {}), ...(o.context ? { context: o.context } : {}) }) as LearningRecord & { assessment?: { answerCorrect?: boolean } };
    this.events.push(rec);
    this.rows.push({ n: this.rows.length + 1, day: this.day(), where, phase, active, qid, prompt: question(qid).prompt.slice(0, 70), response, right: rec.assessment?.answerCorrect, activity });
  }
  teach(competency: string, strategy: string, where: string) {
    this.events.push(make.teach(this.ctx(), competency, strategy, "child-lab") as LearningRecord);
    this.child.taught(competency, this.now);
    this.rows.push({ n: this.rows.length + 1, day: this.day(), where, phase: "chapter", active: competency, qid: null, prompt: `LESSON ${strategy}` });
  }
  /** a later session, `days` on: the child may have forgotten */
  later(days: number) { this.now += days * DAY; this.session = `s${Number(this.session.slice(1)) + 1}`; this.child.forget(this.now); }
  /** one step of a skill's module screen */
  moduleStep(c: string, where: string, withinRecovery: boolean, est: Established | null = null): string {
    const s = this.state();
    const ms = est ? moduleState(c, s.records, s.evidence(c), this.now, this.session, est) : s.module(c, withinRecovery);
    if (ms.question) { const act = ms.activity ?? ACTIVITY[ms.phase] ?? "practice"; this.answer(ms.question, act, where, ms.phase + (ms.context ? `/${ms.context}` : ""), c, { hints: act === "guided" ? 1 : 0, context: ms.context }); return "asked"; }
    if (ms.phase === "chapter") { this.teach(c, ms.strategy?.id ?? "lesson", where); return "taught"; }
    if (ms.phase === "recover" && ms.original) return `recover:${ms.original}`;
    return ms.phase;
  }
  /** the Recovery screen from one wrong problem, until it ends, stops for a person, or `max` steps */
  recover(original: string, max = 60): RecoveryState {
    let r!: RecoveryState;
    for (let i = 0; i < max; i++) {
      const s = this.state();
      r = recovery(original, s.records, s.evidence, this.now, this.session);
      if (r.phase === "attempt" || r.phase === "return") { this.answer(original, "original", "recovery", r.phase, null); continue; }
      if (r.phase === "investigate" && r.question) { this.answer(r.question, "diagnostic", "recovery", r.phase, null, { context: r.context ?? investigateContext(original) }); continue; }
      if ((r.phase === "support" || r.phase === "teach") && r.active) {
        const got = this.moduleStep(r.active, `recovery→${r.active.replace("MATH.", "")}`, true, r.established ?? null);
        if (got === "asked" || got === "taught") continue;
        this.rows.push({ n: this.rows.length + 1, day: this.day(), where: "recovery", phase: `${r.phase}/module:${got}`, active: r.active, qid: null, prompt: r.reason.slice(0, 90) });
        break;
      }
      this.rows.push({ n: this.rows.length + 1, day: this.day(), where: "recovery", phase: r.phase, active: r.active, qid: null, prompt: r.reason.slice(0, 110) });
      break;
    }
    return r;
  }
  /** a skill opened from the year screen (ordinary path), following any recovery it opens */
  learn(c: string, max = 80): string {
    let last = "";
    for (let i = 0; i < max; i++) {
      const got = this.moduleStep(c, c.replace("MATH.", ""), false);
      if (got === "asked" || got === "taught") continue;
      if (got.startsWith("recover:")) { const r = this.recover(got.slice(8), 40); last = `recovery:${r.phase}`; if (r.phase === "escalate") break; continue; }
      this.rows.push({ n: this.rows.length + 1, day: this.day(), where: c.replace("MATH.", ""), phase: got, active: c, qid: null, prompt: "" });
      last = got; break;
    }
    return last;
  }
  seen() { return new Set(this.rows.map((t) => t.active).filter((x): x is string => !!x)); }
  asked() { return this.rows.filter((t) => t.qid).map((t) => t.qid!); }
  questions() { return this.rows.filter((t) => t.qid).length; }
  status(c: string) { return this.state().evidence(c).status; }
  trace() { return this.rows.map((t) => `${String(t.n).padStart(3)} d${t.day} ${t.where.padEnd(34)} ${t.phase.padEnd(12)} ${t.qid ?? ""} ${t.response !== undefined ? `→ ${t.response} ${t.right === undefined ? "" : t.right ? "✓" : "✗"}` : ""} «${t.prompt}»`).join("\n"); }
}
/** a question of a family this run has not asked yet */
export function freshOf(run: LabRun, fam: string, pred: (id: string) => boolean = () => true): string | undefined {
  const seen = new Set(run.events.filter((e) => e.record === "attempt").map((e) => (e as { questionId: string }).questionId.replace(/:(mc|w)$/, "")));
  return pool(fam).items.map((x) => x.id).find((id) => !seen.has(id) && pred(id));
}
