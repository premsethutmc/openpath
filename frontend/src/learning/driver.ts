/**
 * A synthetic learner for tests: it follows exactly what the engine asks next (moduleState / recovery), answering with
 * a scripted policy, and writes the same records the app writes. No real child's data: learner ids are synthetic.
 */
import { question } from "../../../packages/learning/src/content";
import type { CurriculumRelease } from "../../../packages/learning/src/curriculum";
import { DAY } from "../../../packages/learning/src/evidence";
import { investigateContext, moduleState, recovery, type Established, type ModuleState } from "../../../packages/learning/src/intervention";
import type { LearningActivity, LearningRecord } from "../../../packages/learning/src/records";
import { learnerState, make } from "../../../packages/learning/src/session";

export type Answerer = (qid: string, phase: string) => string;
export const right: Answerer = (q) => question(q).answer;
export const activityFor = (ms: Pick<ModuleState, "phase" | "question">): LearningActivity =>
  ms.phase === "explore" ? "diagnostic"
  : ms.phase === "strategy" ? "probe"
  : ms.phase === "guided" ? "guided"
  : ms.phase === "check" ? "check"
  : ms.phase === "retention" ? "retention"
  : question(ms.question!).role === "transfer" ? "transfer" : "practice";

export class Driver {
  events: LearningRecord[] = [];
  trace: string[] = [];
  session = "s1";
  private n = 1;
  learnerId: string;
  now: number;
  constructor(learnerId: string, now: number) {
    this.learnerId = learnerId;
    this.now = now;
  }
  ctx() {
    this.now += 60_000;
    return { learnerId: this.learnerId, sessionId: this.session, at: new Date(this.now).toISOString() };
  }
  /** A new session (as after logging out and back in), optionally some days later. */
  newSession(days = 0) {
    this.now += days * DAY;
    this.session = `s${++this.n}`;
  }
  state() {
    return learnerState(this.learnerId, this.events, this.now);
  }
  enrol(grade: number, year: string, r: CurriculumRelease) {
    this.events.push(make.enrol(this.ctx(), grade, year, r));
  }
  goal(pathway: string, active = true) {
    this.events.push(make.goal(this.ctx(), pathway, active));
  }
  answer(qid: string, response: string, activity: LearningActivity, o: { hints?: number; context?: string; working?: string[] } = {}) {
    this.events.push(make.attempt(this.ctx(), qid, response, activity, o));
    this.trace.push(`${activity}:${qid}=${response}${o.hints ? `+hint` : ""}`);
  }
  /** One step of a skill module, as the app does it. Returns the state that was acted on. */
  step(competency: string, answerer: Answerer, o: { hintOnGuided?: boolean; established?: Established | null } = {}): ModuleState {
    const st = this.state();
    const ms = moduleState(competency, st.records, st.evidence(competency), this.now, this.session, o.established);
    if (ms.phase === "chapter") {
      this.events.push(make.teach(this.ctx(), competency, ms.strategy!.id, ms.decision?.diagnosis.kind ?? ms.diagnosis?.result ?? "diagnosis"));
      this.trace.push(`teach:${ms.strategy!.id}`);
    } else if (ms.question) {
      const act = activityFor(ms);
      this.answer(ms.question, answerer(ms.question, ms.phase), act, act === "guided" && o.hintOnGuided ? { hints: 1 } : {});
    }
    return ms;
  }
  /** Work a skill until it stops asking (done, pause, or nothing to ask), at most `max` steps. */
  work(competency: string, answerer: Answerer, o: { max?: number; until?: (ms: ModuleState) => boolean; hintOnGuided?: boolean } = {}) {
    const seen: ModuleState[] = [];
    for (let i = 0; i < (o.max ?? 30); i++) {
      const st = this.state();
      const ms = moduleState(competency, st.records, st.evidence(competency), this.now, this.session);
      if (o.until?.(ms) || ms.phase === "done" || ms.phase === "pause" || ms.phase === "unavailable" || (ms.phase !== "chapter" && !ms.question)) {
        seen.push(ms);
        break;
      }
      seen.push(this.step(competency, answerer, o));
    }
    return seen;
  }
  /** Work an original problem through recovery: try it, work the supporting skill the engine names, return. */
  recover(original: string, answerer: Answerer, o: { max?: number } = {}) {
    const phases: string[] = [];
    for (let i = 0; i < (o.max ?? 80); i++) {
      const st = this.state();
      const r = recovery(original, st.records, st.evidence, this.now, this.session);
      phases.push(r.active ? `${r.phase}:${r.active}` : r.phase);
      if (r.phase === "attempt" || r.phase === "return") {
        this.answer(original, answerer(original, r.phase), "original", { context: `recovery:${original}` });
        continue;
      }
      if (r.phase === "investigate") {
        this.answer(r.question!, answerer(r.question!, r.phase), "diagnostic", { context: investigateContext(original) });
        continue;
      }
      if (r.phase === "support" || r.phase === "teach") {
        this.step(r.active!, answerer, { established: r.established });
        continue;
      }
      break;
    }
    return phases.filter((p, k) => p !== phases[k - 1]);
  }
}
