/**
 * child-lab@2: drives a lab child through the shipped engine exactly as the family site does, with default settings:
 * the module screen (learnerState(...).module, or moduleState with recovery's finding when recovery passes one, as
 * Learn.tsx's Module does), and the Recovery screen (recovery(), investigate answers recorded as "diagnostic" with the
 * context recovery gives, a lesson recorded as teaching). No fixtures, no research flags.
 *
 * Every row keeps what the lab needs to judge the run honestly: where the response came from (provenance), the child's
 * working and the slips that fired, the status of the skills the scenario watches after that row (mastery transitions),
 * and, for a recovery, how it ended (termination). A mutant (./mutants.ts) can be passed to break one engine behaviour on
 * purpose, so the lab can show its checks notice.
 */
import { boardFor } from "../curricula";
import { pool } from "../families";
import { investigateContext } from "../hypotheses";
import { moduleState, recovery, type Established, type RecoveryState } from "../intervention";
import { learnerState, make } from "../session";
import { question } from "../content";
import type { LearningRecord } from "../records";
import type { LabChild, Provenance, Response } from "./slips";
import type { Step } from "./work";

export const DAY = 86_400_000;
const START = Date.parse("2026-11-02T09:00:00Z");
export interface Row {
  n: number; day: number; where: string; phase: string; active: string | null; qid: string | null; prompt: string;
  response?: string; right?: boolean | null; activity?: string; hints?: number; solution?: boolean;
  provenance?: Provenance; fired?: string[]; route?: string; steps?: Step[]; note?: string;
  /** the slips the child still had when it answered (or after the lesson) */
  slips: string[];
  /** status of every watched skill after this row */
  status: Record<string, string>;
  retention?: Record<string, string>;
}
export interface Termination { how: "terminal" | "stopped" | "max-steps" | "paused"; phase: string; reason: string }
export const TERMINAL = ["solved", "solved_on_retry", "solved_after_help", "escalate"];
const ACTIVITY: Record<string, string> = { explore: "diagnostic", guided: "guided", check: "check", verify: "practice", retention: "retention" };

/** a deliberate break in one engine behaviour, applied at the lab's boundary with the engine */
export interface Mutant {
  id: string;
  says: string;
  /** what the child answers (answer leakage) */
  respond?: (qid: string, own: Response) => Response;
  /** the records the engine is shown */
  records?: (events: LearningRecord[]) => LearningRecord[];
  /** the evidence the engine and the lab read for one skill */
  evidence?: (c: string, ev: ReturnType<ReturnType<typeof learnerState>["evidence"]>, run: LabRun) => ReturnType<ReturnType<typeof learnerState>["evidence"]>;
  /** the recovery screen's next step */
  recovery?: (r: RecoveryState, run: LabRun) => RecoveryState;
  /** the module screen's next step */
  module?: (ms: ReturnType<typeof moduleState>, c: string, run: LabRun) => ReturnType<typeof moduleState>;
}

export class LabRun {
  events: LearningRecord[] = [];
  now = START;
  session = "s1";
  rows: Row[] = [];
  learnerId: string;
  child: LabChild;
  watch: string[];
  mutant: Mutant | null;
  termination: Termination | null = null;
  private cache: { key: string; s: ReturnType<typeof learnerState> } | null = null;
  constructor(learnerId: string, child: LabChild, o: { grade?: number; board?: "tn" | "cbse"; watch?: string[]; mutant?: Mutant | null } = {}) {
    this.learnerId = learnerId; this.child = child; this.watch = o.watch ?? []; this.mutant = o.mutant ?? null;
    if (o.grade) this.events.push(make.enrol(this.ctx(), o.grade, "2026-27", boardFor(o.board ?? "tn", o.grade)!) as LearningRecord);
  }
  ctx() { return { learnerId: this.learnerId, sessionId: this.session, at: new Date((this.now += 60_000)).toISOString() }; }
  state() {
    const key = `${this.events.length}:${this.now}:${this.session}`;
    if (this.cache?.key === key) return this.cache.s;
    const shown = this.mutant?.records ? this.mutant.records(this.events) : this.events;
    const s = learnerState(this.learnerId, shown, this.now, { currentSession: this.session });
    const m = this.mutant;
    if (m?.evidence) { const ev = s.evidence; const run = this; (s as { evidence: typeof ev }).evidence = (c: string) => m.evidence!(c, ev(c), run); }
    this.cache = { key, s };
    return s;
  }
  day() { return Math.floor((this.now - START) / DAY); }
  private snapshot() {
    const s = this.state(); const status: Record<string, string> = {}, retention: Record<string, string> = {};
    for (const c of this.watch) { const e = s.evidence(c); status[c] = e.status; retention[c] = e.retention; }
    return { status, retention, slips: [...this.child.active.keys()] };
  }
  answer(qid: string, activity: string, where: string, phase: string, active: string | null, o: { hints?: number; solution?: boolean; response?: string; context?: string } = {}) {
    const slips = [...this.child.active.keys()];
    let r: Response = o.response !== undefined ? { text: o.response, provenance: "staged" } : this.child.answer(qid);
    if (this.mutant?.respond && o.response === undefined) r = this.mutant.respond(qid, r);
    const rec = make.attempt(this.ctx(), qid, r.text, activity as never, { hints: o.hints ?? 0, ...(o.solution ? { solution: true } : {}), ...(o.context ? { context: o.context } : {}) }) as LearningRecord & { assessment?: { answerCorrect?: boolean | null } };
    this.events.push(rec);
    const snap = this.snapshot();
    this.rows.push({ n: this.rows.length + 1, day: this.day(), where, phase, active, qid, prompt: question(qid).prompt.slice(0, 70), response: r.text, right: rec.assessment?.answerCorrect ?? null, activity, hints: o.hints ?? 0, ...(o.solution ? { solution: true } : {}),
      provenance: r.provenance, ...(r.fired ? { fired: r.fired } : {}), ...(r.route ? { route: r.route } : {}), ...(r.steps ? { steps: r.steps } : {}), ...(r.note ? { note: r.note } : {}), slips, status: snap.status, retention: snap.retention });
  }
  teach(competency: string, strategy: string, where: string) {
    this.events.push(make.teach(this.ctx(), competency, strategy, "child-lab") as LearningRecord);
    this.child.taught(competency, this.now);
    const snap = this.snapshot();
    this.rows.push({ n: this.rows.length + 1, day: this.day(), where, phase: "chapter", active: competency, qid: null, prompt: `LESSON ${strategy}`, slips: snap.slips, status: snap.status, retention: snap.retention });
  }
  private mark(where: string, phase: string, active: string | null, prompt: string) { const snap = this.snapshot(); this.rows.push({ n: this.rows.length + 1, day: this.day(), where, phase, active, qid: null, prompt, slips: snap.slips, status: snap.status, retention: snap.retention }); }
  /** a later session, `days` on: the child may have forgotten */
  later(days: number) { this.now += days * DAY; this.session = `s${Number(this.session.slice(1)) + 1}`; this.child.forget(this.now); }
  /** one step of a skill's module screen */
  moduleStep(c: string, where: string, withinRecovery: boolean, est: Established | null = null): string {
    const s = this.state();
    let ms = est ? moduleState(c, s.records, s.evidence(c), this.now, this.session, est) : s.module(c, withinRecovery);
    if (this.mutant?.module) ms = this.mutant.module(ms, c, this);
    if (ms.question) { const act = ms.activity ?? ACTIVITY[ms.phase] ?? "practice"; this.answer(ms.question, act, where, ms.phase + (ms.context ? `/${ms.context}` : ""), c, { hints: act === "guided" ? 1 : 0, context: ms.context }); return "asked"; }
    if (ms.phase === "chapter") { this.teach(c, ms.strategy?.id ?? "lesson", where); return "taught"; }
    if (ms.phase === "recover" && ms.original) return `recover:${ms.original}`;
    return ms.phase;
  }
  /** the Recovery screen from one wrong problem, until it ends, stops for a person, or `max` steps (then `termination` says which) */
  recover(original: string, max = 60): RecoveryState {
    let r!: RecoveryState;
    for (let i = 0; i < max; i++) {
      const s = this.state();
      r = recovery(original, s.records, s.evidence, this.now, this.session);
      if (this.mutant?.recovery) r = this.mutant.recovery(r, this);
      if (r.phase === "attempt" || r.phase === "return") { this.answer(original, "original", "recovery", r.phase, null); continue; }
      if (r.phase === "investigate" && r.question) { this.answer(r.question, "diagnostic", "recovery", r.phase, null, { context: r.context ?? investigateContext(original) }); continue; }
      if ((r.phase === "support" || r.phase === "teach") && r.active) {
        const got = this.moduleStep(r.active, `recovery→${r.active.replace("MATH.", "")}`, true, r.established ?? null);
        if (got === "asked" || got === "taught") continue;
        this.mark("recovery", `${r.phase}/module:${got}`, r.active, r.reason.slice(0, 90));
        this.termination = { how: "stopped", phase: `${r.phase}/module:${got}`, reason: r.reason };
        return r;
      }
      this.mark("recovery", r.phase, r.active, r.reason.slice(0, 110));
      this.termination = { how: TERMINAL.includes(r.phase) ? "terminal" : "stopped", phase: r.phase, reason: r.reason };
      return r;
    }
    this.termination = { how: "max-steps", phase: r.phase, reason: `still at "${r.phase}" after ${max} steps` };
    return r;
  }
  /** stop on purpose after `steps` recovery steps (a learner who closes the app): the run is paused, not ended */
  recoverFor(original: string, steps: number): RecoveryState { const r = this.recover(original, steps); if (this.termination?.how === "max-steps") this.termination = { how: "paused", phase: r.phase, reason: `closed after ${steps} steps` }; return r; }
  /** a skill opened from the year screen (ordinary path), following any recovery it opens */
  learn(c: string, max = 80): string {
    let last = "";
    for (let i = 0; i < max; i++) {
      const got = this.moduleStep(c, c.replace("MATH.", ""), false);
      if (got === "asked" || got === "taught") continue;
      if (got.startsWith("recover:")) { const r = this.recover(got.slice(8), 40); last = `recovery:${r.phase}`; if (r.phase === "escalate" || this.termination?.how !== "terminal") return last; continue; }
      this.mark(c.replace("MATH.", ""), got, c, "");
      this.termination = { how: "terminal", phase: got, reason: `module ${got}` };
      return got;
    }
    this.termination = { how: "max-steps", phase: last, reason: `learn ${c}: still going after ${max} steps` };
    return last;
  }
  /** the run as the app persists it (the records), and the run rebuilt from that alone: the child is the same child */
  static restore(from: LabRun, learnerId = from.learnerId): LabRun {
    const run = new LabRun(learnerId, from.child, { watch: from.watch, mutant: from.mutant });
    run.events = JSON.parse(JSON.stringify(from.events)) as LearningRecord[];
    run.now = from.now; run.session = from.session; run.rows = from.rows.map((r) => ({ ...r }));
    return run;
  }
  /** skills worked on (a question or a lesson) in rows after `from` (a row number) */
  seen(from = 0) { return new Set(this.rows.filter((t) => t.n > from && (t.qid || t.prompt.startsWith("LESSON"))).map((t) => t.active).filter((x): x is string => !!x)); }
  asked() { return this.rows.filter((t) => t.qid).map((t) => t.qid!); }
  attempts() { return this.rows.filter((t) => t.qid); }
  questions() { return this.rows.filter((t) => t.qid).length; }
  status(c: string) { return this.state().evidence(c).status; }
  trace() {
    return this.rows.map((t) => `${String(t.n).padStart(3)} d${t.day} ${t.where.padEnd(34)} ${t.phase.padEnd(12)} ${t.qid ?? ""} ${t.response !== undefined ? `→ ${t.response} ${t.right == null ? "·" : t.right ? "✓" : "✗"} [${t.provenance}${t.fired?.length ? `: ${t.fired.join("+")}` : ""}]` : ""} «${t.prompt}»${Object.keys(t.status).length ? ` {${Object.entries(t.status).map(([k, v]) => `${k.replace(/^MATH\.\w+\./, "")}=${v}`).join(" ")}}` : ""}`).join("\n")
      + (this.termination ? `\n    end: ${this.termination.how} (${this.termination.phase})` : "");
  }
}
/** a question of a family this run has not asked yet */
export function freshOf(run: LabRun, fam: string, pred: (id: string) => boolean = () => true): string | undefined {
  const seen = new Set(run.events.filter((e) => e.record === "attempt").map((e) => (e as { questionId: string }).questionId.replace(/:(mc|w)$/, "")));
  return pool(fam).items.map((x) => x.id).find((id) => !seen.has(id) && pred(id));
}
