/**
 * The learner-facing flow of the slice: one object holding a SliceSession and the spec the renderer should show now.
 * Used unchanged by the node tests and by the browser harness. It decides nothing about maths or teaching: it forwards renderer events
 * to the owning components (session.ts) and turns their outputs into RenderSpecs (renderer-adapter.ts).
 */
import { question } from "../../../packages/learning/src/content";
import type { ModuleState } from "../../../packages/learning/src/intervention";
import { activityFor } from "../learning/driver";
import type { RenderSpec, RendererEvent } from "../math/types";
import { feedbackFromDecision, questionSpec, teachingSpec, teachingSteps } from "./renderer-adapter";
import { SliceSession } from "./session";
import type { GradingDecision } from "../../../packages/learning/src/grading/decision";

export type Stage = "question" | "feedback" | "teaching" | "summary";
export interface Frame { stage: Stage; spec: RenderSpec; qid: string | null; strategyId: string | null; revealed?: number }

export class SliceFlow {
  readonly session: SliceSession;
  readonly frames: Frame[] = [];
  stage: Stage = "question";
  spec: RenderSpec;
  private ms: ModuleState | null = null;
  private qid: string;
  private activity: ReturnType<typeof activityFor> = "diagnostic";
  private context: string | undefined;
  private revealed = 0;
  private count = 0;
  /** the engine's last step, kept to name it in the guide */
  constructor(readonly startQid: string, learnerId = "synthetic-slice-1") {
    this.qid = startQid;
    this.session = new SliceSession(learnerId, question(startQid).competency);
    this.spec = questionSpec(startQid, { guide: { message: "Here is your question.", tone: "neutral" } });
    this.push();
  }
  private push() { this.frames.push({ stage: this.stage, spec: this.spec, qid: this.stage === "teaching" || this.stage === "summary" ? null : this.qid, strategyId: this.ms?.strategy?.id ?? null, ...(this.stage === "teaching" ? { revealed: this.revealed } : {}) }); }

  /** a renderer interaction event; the renderer never reports correctness, only what the learner did */
  on(e: RendererEvent): RenderSpec {
    if (e.type === "answer_submitted" && this.stage === "question") return this.answer(e.value);
    if (e.type === "skip_requested" && (this.stage === "feedback" || this.stage === "teaching")) return this.advance();
    return this.spec;
  }

  private answer(value: string) {
    const reply = this.session.submit(this.qid, value, this.activity, this.context ? { context: this.context } : {});
    const fb = feedbackFromDecision(reply.decision as GradingDecision, reply.expected ?? undefined);
    this.count++;
    this.stage = "feedback";
    this.spec = {
      ...questionSpec(this.qid, { feedback: fb, guide: { message: fb.level === "correct" ? "That matches." : fb.level === "incorrect" ? "Not this time." : "Not marked.", detail: "Press Continue to see what the learning engine chooses next.", tone: fb.level === "correct" ? "encouraging" : "thinking" } }),
      nav: { canSubmit: false, canSkip: true, skipLabel: "Continue", canGoBack: false, canRequestHint: false, canShowWorking: false },
    };
    this.push();
    return this.spec;
  }

  private advance(): RenderSpec {
    if (this.stage === "teaching") {
      const st = this.ms!.strategy!;
      if (this.revealed < teachingSteps(st)) { this.revealed++; this.spec = teachingSpec(this.qid, st, this.revealed, { message: st.title, detail: this.ms!.reason, tone: "encouraging" }); this.push(); return this.spec; }
      this.session.taught(this.ms!);
    }
    const ms = this.session.next();
    this.ms = ms;
    if (ms.phase === "chapter" && ms.strategy) {
      this.stage = "teaching"; this.revealed = 1;
      this.spec = teachingSpec(this.qid, ms.strategy, 1, { message: ms.strategy.title, detail: ms.reason, tone: "encouraging" });
    } else if (ms.question) {
      this.qid = ms.question; this.activity = activityFor(ms); this.context = ms.context; this.stage = "question";
      this.spec = questionSpec(ms.question, { guide: { message: ms.reason, tone: "neutral" } });
    } else {
      this.stage = "summary";
      const ev = this.session.state().evidence(this.session.competency);
      this.spec = { ...questionSpec(this.qid, { guide: { message: ms.reason, tone: "neutral" } }), layout: { panels: ["question", "nav"] } };
      void ev;
    }
    this.push();
    return this.spec;
  }
}
