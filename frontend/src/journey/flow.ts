/**
 * The learner-facing flow: one object holding a SliceSession and the spec the renderer should show now. Used unchanged by the node tests
 * and the browser harness. It decides nothing about maths or teaching: it forwards renderer events to the owning components (session.ts)
 * and turns their outputs into RenderSpecs (renderer-adapter.ts). Its stepping mirrors the app's Module and Recovery views
 * (frontend/src/year/Learn.tsx) and frontend/src/learning/adaptive-loop.ts: module step -> (recover -> recovery steps) -> module step.
 */
import { question } from "../../../packages/learning/src/content";
import { familyOf, investigateContext, retriesLeft, type Established, type ModuleState } from "../../../packages/learning/src/intervention";
import { activityFor } from "../learning/driver";
import type { RenderSpec, RendererEvent } from "../math/types";
import { feedbackFromDecision, questionSpec, teachingSpec, teachingSteps, workingFeedback } from "./renderer-adapter";
import { readSubmission } from "../../../packages/learning/src/grading/submission";
import { taskStatement } from "../../../packages/learning/src/grading/working";
import { SliceSession } from "./session";
import type { GradingDecision } from "../../../packages/learning/src/grading/decision";
import type { LearningActivity } from "../../../packages/learning/src/records";
/** The reason for the explanation, and what may be said about its review (explanation-review@1: never "approved" unless it is). */
const withLabel = (ms: { reason: string; contentReview?: { label: string } }) => `${ms.reason} ${ms.contentReview?.label ?? "Demonstration: this explanation has not been approved by an educator."}`;

export type Stage = "question" | "feedback" | "teaching" | "summary";
export interface Frame { stage: Stage; spec: RenderSpec; qid: string | null; strategyId: string | null; revealed?: number; activity?: LearningActivity; phase?: string }
/** Fallback hint text: the app's own (Learn.tsx Ask), used when a question carries no authored hint. It points back to the explanation. */
export const HINT_FALLBACK = "Look at the explanation and try one part at a time.";

export class SliceFlow {
  readonly session: SliceSession;
  readonly frames: Frame[] = [];
  stage: Stage = "question";
  spec: RenderSpec;
  /** a stopping state the engine chose (done, pause, ...) or null while the flow is running */
  ended: { phase: string; reason: string; why: string | null } | null = null;
  private ms: ModuleState | null = null;
  private qid: string;
  private activity: LearningActivity = "diagnostic";
  private context: string | undefined;
  private phase = "attempt";
  private revealed = 0;
  private hints = 0;
  private recovering: string | null = null;
  private supportCtx: { competency: string; established: Established | null } | null = null;
  /** `retry`: the app offers "Try again" (study-session mode); bounded by retriesLeft (bounded-retry@1). */
  readonly startQid: string;
  readonly opts: { retry?: boolean; entry?: "diagnostic" | "practice"; resume?: SliceSession };
  constructor(startQid: string, learnerId = "synthetic-slice-1", now?: number, opts: { retry?: boolean; entry?: "diagnostic" | "practice"; resume?: SliceSession } = {}) {
    this.startQid = startQid; this.opts = opts;
    this.qid = startQid;
    this.activity = opts.entry === "practice" ? "practice" : "diagnostic";
    this.phase = opts.entry === "practice" ? "practice" : "diagnostic";
    this.session = opts.resume ?? new SliceSession(learnerId, question(startQid).competency, now);
    this.spec = this.questionFrame("Here is your question.");
    if (opts.resume) { this.stage = "feedback"; this.advance(); return; }   // reopening a skill from stored records: the engine decides the first step
    this.push();
  }
  private push() {
    this.frames.push({ stage: this.stage, spec: this.spec, qid: this.stage === "teaching" || this.stage === "summary" ? null : this.qid, strategyId: this.ms?.strategy?.id ?? null, ...(this.stage === "teaching" ? { revealed: this.revealed } : {}), activity: this.activity, phase: this.phase });
  }
  private hintAllowed() { return this.activity === "guided"; }   // the app's rule: hintAllowed={ms.phase === "guided"}
  private questionFrame(message: string): RenderSpec {
    const base = questionSpec(this.qid, { guide: { message, tone: "neutral" } });
    if (!this.hintAllowed()) return base;
    const text = question(this.qid).hint ?? HINT_FALLBACK;
    return { ...base, layout: { panels: [...base.layout.panels, "hint"] }, hints: { available: true, totalLevels: 1, currentLevel: this.hints, hints: [{ level: 1, text }] }, nav: { ...base.nav, canRequestHint: this.hints === 0 } } as RenderSpec;
  }

  get learningState(): "independent" | "guided" | "feedback" | "completed" {
    if (this.stage === "summary") return "completed";
    if (this.stage === "feedback") return "feedback";
    if (this.stage === "teaching") return "guided";
    return this.activity === "guided" || this.hints > 0 ? "guided" : "independent";
  }
  get currentActivity() { return this.activity; }
  get hintsShown() { return this.hints; }
  get currentPhase() { return this.phase; }
  get currentQuestion() { return this.stage === "question" ? this.qid : null; }

  /** a renderer interaction event; the renderer never reports correctness, only what the learner did */
  on(e: RendererEvent): RenderSpec {
    if (e.type === "answer_submitted" && this.stage === "question") return this.answer(e.value, (e as { working?: string[] }).working);
    if (e.type === "hint_requested" && this.stage === "question" && this.hintAllowed() && this.hints === 0) { this.hints = 1; this.spec = this.questionFrame((this.spec.teacherGuide?.message) ?? ""); this.push(); return this.spec; }
    if (e.type === "back_requested" && this.stage === "feedback" && this.spec.nav.canGoBack) { this.stage = "question"; this.spec = this.questionFrame("Try this one again."); this.push(); return this.spec; }
    if (e.type === "skip_requested" && (this.stage === "feedback" || this.stage === "teaching")) return this.advance();
    return this.spec;
  }

  private answer(value: string, working?: string[]) {
    // D1: one typed submission may hold working lines ("3x = 15; x = 5"); splitting is syntax only (grading/submission.ts), the grader judges both parts
    const sub = working?.length ? { response: value, working } : readSubmission(value, taskStatement(this.qid) !== null);
    const reply = this.session.submit(this.qid, sub.response, this.activity, { ...(this.context ? { context: this.context } : {}), ...(this.hints ? { hints: this.hints } : {}), ...(sub.working.length ? { working: sub.working } : {}) });
    const fb = feedbackFromDecision(reply.decision as GradingDecision);
    const wf = workingFeedback(reply.decision as GradingDecision);
    const assisted = this.activity === "guided" || this.hints > 0;
    const canRetry = !!this.opts.retry && fb.level === "incorrect" && retriesLeft(this.session.state().records, this.qid) > 0;
    this.stage = "feedback";
    this.spec = {
      ...questionSpec(this.qid, { feedback: fb, guide: { message: fb.level === "correct" ? "That matches." : fb.level === "incorrect" ? "Not this time." : "Not marked.", detail: (assisted ? "Guided practice: help was available, so this is practice, not an independent check. " : "On your own: no help was given. ") + "Press Continue to see what the learning engine chooses next.", tone: fb.level === "correct" ? "encouraging" : "thinking" } }),
      nav: { canSubmit: false, canSkip: true, skipLabel: canRetry ? "Continue with another question" : "Continue", canGoBack: canRetry, ...(canRetry ? { backLabel: "Try again" } : {}), canRequestHint: false, canShowWorking: false },
    } as RenderSpec;
    // the learner's own working lines, marked as the trusted grader judged them (the existing working panel; nothing new is drawn)
    if (wf?.steps.length) this.spec = { ...this.spec, layout: { panels: [...this.spec.layout.panels, "working"] }, working: { steps: wf.steps, revealedCount: wf.steps.length, editable: false } } as RenderSpec;
    this.hints = 0;
    this.push();
    return this.spec;
  }

  private ask(qid: string, activity: LearningActivity, phase: string, message: string, context?: string) {
    this.qid = qid; this.activity = activity; this.phase = phase; this.context = context; this.stage = "question"; this.hints = 0;
    this.spec = this.questionFrame(message);
  }
  private teach(ms: ModuleState) {
    this.ms = ms; this.stage = "teaching"; this.revealed = 1; this.phase = "chapter";
    this.spec = teachingSpec(this.qid, ms.strategy!, 1, { message: ms.strategy!.title, detail: withLabel(ms), tone: "encouraging" });
  }
  private stop(phase: string, reason: string, why: string | null) {
    this.stage = "summary"; this.phase = phase; this.ended = { phase, reason, why };
    this.spec = { ...questionSpec(this.qid, { guide: { message: reason, tone: "neutral" } }), layout: { panels: ["question", "nav"] } };
  }
  /** a module step for `competency` as the app's Module view takes it; returns false when the module stops */
  private moduleStep(competency: string, established: Established | null, inRecovery: boolean): "asked" | "recover" | "stopped" {
    const ms = this.session.next(competency, { established, inRecovery });
    this.ms = ms;
    if (ms.phase === "recover" && ms.original && !inRecovery) { this.recovering = ms.original; return "recover"; }
    if (ms.phase === "chapter" && ms.strategy) { this.teach(ms); return "asked"; }
    if (ms.question) { this.ask(ms.question, activityFor(ms), ms.phase, ms.reason, ms.context); return "asked"; }
    if (!inRecovery) this.stop(ms.phase, ms.reason, ms.why ?? null);
    return "stopped";
  }
  /** one recovery step as the app's Recovery view takes it; returns false when recovery has nothing more to ask */
  private recoveryStep(original: string): boolean {
    const r = this.session.recover(original);
    if (r.phase === "attempt" || r.phase === "return") { this.ask(original, "original", r.phase, r.reason, `recovery:${original}`); return true; }
    if (r.phase === "investigate") { this.ask(r.question!, "diagnostic", r.phase, r.reason, investigateContext(original)); return true; }
    if (r.phase === "support" || r.phase === "teach") {
      this.supportCtx = { competency: r.active!, established: r.established };
      return this.moduleStep(r.active!, r.established, true) === "asked";
    }
    return false;  // solved, solved_on_retry, solved_after_help, escalate, trace: recovery ends; the module decides what follows
  }

  private advance(): RenderSpec {
    // practice entry (the lesson page): a wrong answer there opens recovery on that question ("Find out what went wrong"), as in the app
    if (this.stage === "feedback" && this.opts.entry === "practice" && this.frames.filter((f) => f.stage === "feedback").length === 1 && this.session.replies[0]?.verdict === "incorrect" && familyOf(this.startQid)) this.recovering = this.startQid;
    if (this.stage === "teaching") {
      const st = this.ms!.strategy!;
      if (this.revealed < teachingSteps(st)) { this.revealed++; this.spec = teachingSpec(this.qid, st, this.revealed, { message: st.title, detail: withLabel(this.ms!), tone: "encouraging" }); this.push(); return this.spec; }
      this.session.taught(this.ms!);
    }
    for (let guard = 0; guard < 8; guard++) {
      if (this.recovering) {
        if (this.recoveryStep(this.recovering)) break;
        this.recovering = null; this.supportCtx = null;
        continue;
      }
      const s = this.moduleStep(this.session.competency, null, false);
      if (s !== "recover") break;
    }
    this.push();
    return this.spec;
  }
  /** the learner comes back `days` later (a new session) and opens the skill again */
  later(days: number): RenderSpec {
    this.session.wait(days);
    this.ended = null; this.recovering = null;
    this.stage = "feedback";
    return this.advance();
  }
}
