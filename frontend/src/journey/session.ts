/**
 * Integration Milestone 1 vertical slice. Every step calls the real component that owns the decision (contracts.ts); the only scripted
 * thing in a run is the learner's own input. Nothing here grades, diagnoses or selects teaching itself.
 */
import { moduleFor, question } from "../../../packages/learning/src/content";
import { DAY } from "../../../packages/learning/src/evidence";
import { moduleState, recovery, type Established, type ModuleState, type RecoveryState } from "../../../packages/learning/src/intervention";
import { teachingEligibility } from "../../../packages/learning/src/teaching-contract";
import { hypothesesFor, investigationTrigger } from "../../../packages/learning/src/hypotheses";
import { withDecisions, type LearningRecord, type ServerDecision } from "../../../packages/learning/src/records";
import { gradeRequest, type GraderReply } from "../../../packages/learning/src/server-grader";
import { learnerState, make } from "../../../packages/learning/src/session";
import { authorizeWorking, workingEvidence } from "../../../packages/learning/src/derivation-interface";
import { activityFor } from "../learning/driver";
import { assertOwns, type Authority, type TraceEntry } from "./contracts";

export interface Shown { phase: ModuleState["phase"]; question: string | null; strategyId: string | null; reason: string; context?: string }

export class SliceSession {
  readonly trace: TraceEntry[] = [];
  readonly events: LearningRecord[] = [];
  readonly decisions: Record<string, ServerDecision> = {};
  readonly replies: GraderReply[] = [];
  now: number;
  session = "s1";
  private seq = 0;
  /** `now` defaults to the real clock (retention due dates are then real-clock dates). */
  readonly learnerId: string;
  readonly competency: string;
  constructor(learnerId: string, competency: string, now: number = Date.now()) { this.learnerId = learnerId; this.competency = competency; this.now = now; }
  /** a session rebuilt from records read back from the store (each attempt carries the server's decision): nothing else is carried over */
  static fromEvents(learnerId: string, competency: string, events: readonly LearningRecord[], now: number, session: string): SliceSession {
    const s = new SliceSession(learnerId, competency, now);
    s.events.push(...events);
    s.session = session;
    return s;
  }

  private log(authority: Authority, decides: string, component: string, input: unknown, output: unknown) {
    assertOwns(authority, decides);
    this.trace.push({ n: ++this.seq, step: String(this.seq), authority, component, decides, input, output });
  }
  private ctx() { this.now += 60_000; return { learnerId: this.learnerId, sessionId: this.session, at: new Date(this.now).toISOString() }; }
  private evs() { return withDecisions(this.events, this.decisions); }
  state() { return learnerState(this.learnerId, this.evs(), this.now, { currentSession: this.session }); }

  /** what the adaptive engine says comes next for a skill (real moduleState over the real evidence, called exactly as the app's Module view
   *  does: with the learner's whole evidence, except inside a recovery that is already running, as adaptive-loop.ts does) */
  next(competency: string = this.competency, o: { established?: Established | null; inRecovery?: boolean } = {}): ModuleState {
    const st = this.state();
    const ms = moduleState(competency, st.records, st.evidence(competency), this.now, this.session, o.established ?? null, o.inRecovery ? undefined : st.evidence);
    this.log("adaptive-engine", ms.phase === "chapter" ? "teaching-selection" : ms.phase === "recover" ? "recovery" : ms.context?.startsWith("investigate") || ms.phase === "explore" ? "investigation" : ms.phase === "retention" ? "retention-policy" : "recheck", "intervention.moduleState",
      { competency }, { phase: ms.phase, question: ms.question, strategy: ms.strategy?.id ?? null, reason: ms.reason, context: ms.context ?? null, why: ms.why ?? null });
    if (ms.phase === "chapter" && ms.strategy) {
      const e = teachingEligibility(moduleFor(competency)!, ms.strategy);
      this.log("adaptive-engine", "teaching-selection", "teaching-contract.teachingEligibility", { strategy: ms.strategy.id }, { checked: e.checked, eligible: e.eligible, review: e.review });
    }
    return ms;
  }
  /** one step of recovery from a wrong answer (real `recovery`, as the app's Recovery view) */
  recover(original: string): RecoveryState {
    const st = this.state();
    const r = recovery(original, st.records, st.evidence, this.now, this.session);
    this.log("adaptive-engine", "recovery", "intervention.recovery", { original }, { phase: r.phase, active: r.active, question: r.question, reason: r.reason, best: r.reasoning?.best?.id ?? null, status: r.reasoning?.status ?? null });
    return r;
  }

  /** The learner's answer: grade (authority) -> record attempt with that decision -> evidence. Returns the authoritative reply. */
  submit(qid: string, response: string, activity: ReturnType<typeof activityFor>, o: { working?: string[]; context?: string; hints?: number } = {}) {
    const reply = gradeRequest({ id: qid, response, ...(o.working?.length ? { working: o.working } : {}) });
    this.replies.push(reply);
    this.log("mathematical-grader", "correctness", "server-grader.gradeRequest", { qid, response }, { verdict: reply.verdict, credit: reply.credit, source: reply.source, reason: reply.reason });
    const rec = make.attempt(this.ctx(), qid, response, activity, { ...(o.working ? { working: o.working } : {}), ...(o.context ? { context: o.context } : {}), ...(o.hints ? { hints: o.hints } : {}) });
    this.events.push(rec);
    if (reply.decision) {
      const id = (rec as { id: string }).id;
      this.decisions[id] = { ...(reply.decision as object), schema: "grading-decision@1", decisionId: `dec:${id}`, decidedBy: "server" } as ServerDecision;
    }
    if (o.working?.length) {
      const a = authorizeWorking(question(qid).prompt, o.working);
      this.log("mathematical-grader", "derivation-authorization", "derivation-interface.authorizeWorking", { lines: o.working }, { status: a.status, evidence: workingEvidence(a) });
    }
    const st = this.state();
    const comp = question(qid).competency;
    const ev = st.evidence(comp);
    const hs = hypothesesFor(comp, st.records);
    this.log("evidence-engine", "observation", "session.learnerState / evidenceFor",
      { qid, credit: reply.credit }, { attempts: ev.attempts.length, independent: ev.independent, retention: ev.retention });
    if (hs.length) this.log("evidence-engine", "hypothesis", "hypotheses.hypothesesFor (learner-hypothesis@1, provisional)", { competency: comp }, hs.map((h) => ({ kind: (h as { kind?: string }).kind ?? null, status: h.status })));
    if (reply.credit === false) {
      const trig = investigationTrigger(st.records.attempts.filter((x) => x.questionId === qid).at(-1)!, st.records);
      this.log("adaptive-engine", "investigation", "hypotheses.investigationTrigger", { qid }, trig ?? { justified: false });
    }
    return reply;
  }
  /** Advance time (retention scheduling is read from the evidence engine's own schedule). */
  wait(days: number) { this.now += days * DAY; this.session = `s${Number(this.session.slice(1)) + 1}`; }
  /** The teaching event the app writes when it shows an explanation. */
  taught(ms: ModuleState) {
    this.events.push(make.teach(this.ctx(), ms.competency, ms.strategy!.id, ms.decision?.diagnosis.kind ?? ms.diagnosis?.result ?? "diagnosis"));
    this.log("evidence-engine", "observation", "session.make.teach", { strategy: ms.strategy!.id }, { recorded: true });
  }
  investigationTriggerFor(qid: string) {
    const recs = this.state().records;
    const a = recs.attempts.filter((x) => x.questionId === qid).at(-1);
    return a ? investigationTrigger(a, recs) : null;
  }
}
