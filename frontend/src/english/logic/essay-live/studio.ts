/**
 * The essay studio, connected to the real engine (essay-contract@1).
 *
 * Everything here runs through the learner's existing record: essay records, diagnostic answers, lessons,
 * practice and checks are events in the same ledger the rest of the app uses (Learner → Repo → fold → core
 * Ledger). Every status shown comes from the core's essay functions and the engine's own verification:
 * nothing is scripted, and nothing here decides what a learner knows.
 *
 * What is NOT real yet (and says so in the interface):
 *   - Essay analysis: recorded evaluator outputs replayed for the built-in synthetic samples; any other text
 *     goes to a small deterministic pattern stand-in. No live LLM is connected.
 *   - Rewrite judgement: a recorded judgement for the built-in sample rewrite; any other rewrite is kept but
 *     not judged (held).
 *   - Real learners: refused. The studio works only with synthetic essays on a dedicated synthetic profile.
 *
 * Two-track assessment. With the server's evaluator connected (and able to write questions), the essay's suspected
 * competencies are shown with their quotes and the learner chooses what to do with each:
 *   formal track    "check this skill": eligible, unseen BANK questions (the only questions that can confirm or rule
 *                   out a gap); then the journey's lessons, guided practice and independent checks from the bank;
 *   practice track  "practise": five fresh questions written by the server's model, checked by the core (structure,
 *                   answer key, duplicates) and recorded as provisional items. Formative feedback only: the engine
 *                   holds every answer, so no estimate moves, no gap is decided and no mastery can follow.
 * Without a question writer, bank diagnostics are planned at once, as before.
 */
import {
  type CapabilityId,
  type DiagnosticOutcome,
  type DiagnosticRequest,
  type EssayAnalysis,
  type EssayContext,
  type EssayEvaluator,
  type EssayEvent,
  type EssayGatewayInfo,
  type EssayLearnerProfile,
  type EssaySubmission,
  type GapHypothesis,
  type Item,
  type JourneyNode,
  type JourneyStep,
  type LearningJourney,
  type LedgerEvent,
  type ObservationRequest,
  type ProfileUpdate,
  type Response,
  type RewriteEvaluation,
  type RewriteRequest,
  type CompetencyProfile,
  type CompetencyOutcome,
  type PlannedCheck,
  type NextActivity,
  type QuestionSet,
  ESSAY_POLICY_DRAFT,
  ESSAY_QUESTIONS_PROTOCOL,
  generatePractice,
  nextPracticeQuestion,
  planDiagnosticFor,
  questionSets,
  recommendNext,
  EssayRefusal,
  analyseEssay,
  dueCheck,
  journeyOutcomes,
  planCheck,
  planReview,
  competencyOutcome,
  plannedChecks,
  createJourney,
  diagnosticOutcome,
  essayProfile,
  essayRecords,
  evaluateRewrite,
  fingerprint,
  gapHypotheses,
  gatewayEssayEvaluator,
  indexCompetencyProfile,
  journeyStatus,
  patternEssayEvaluator,
  planDiagnostics,
  profileUpdates,
  submitEssay,
} from "../../../../../packages/english-core/src/index.ts";
import g8Profile from "../../../../../content/english/essay/g8-writing.json";
import samplesJson from "../../../../../content/english/essay/samples.json";
import type { AppContent, Lesson } from "../content.ts";
import type { Feedback } from "../feedback.ts";
import type { Learner } from "../learner.ts";

export interface Sample {
  id: string;
  title: string;
  prompt: string;
  text: string;
  fingerprint: string;
  observations: unknown;
}
interface Samples {
  essays: Sample[];
  rewrites: { essay: string; text: string; fingerprint: string; judgement: unknown }[];
}
export const SAMPLES = samplesJson as unknown as Samples;

/** The fixed id of the on-device synthetic learner the studio uses (never a child's profile). */
export const STUDIO_PROFILE_ID = "essay-studio-synthetic-learner";
export const STUDIO_PROFILE_NAME = "Essay test learner (synthetic)";

const swap = (raw: unknown, key: string, value: string): unknown => JSON.parse(JSON.stringify(raw).split(`"${key}"`).join(JSON.stringify(value)));

/**
 * Replays the recorded analysis of a built-in sample (matched by text fingerprint); any other text is passed to
 * the pattern stand-in. The evaluator id says which one answered, and both pass the same validation.
 */
export function studioEvaluator(): EssayEvaluator & { source(text: string): "recorded" | "patterns" } {
  const patterns = patternEssayEvaluator();
  const recorded = (text: string) => SAMPLES.essays.find((s) => s.fingerprint === fingerprint(text));
  return {
    id: "openpath-studio",
    version: "samples@1+patterns@0",
    model: "no-llm",
    source: (text: string) => (recorded(text) ? "recorded" : "patterns"),
    async observe(req: ObservationRequest) {
      const s = recorded(req.essay.text);
      return s ? swap(s.observations, "$ESSAY", req.essay.id) : patterns.observe(req);
    },
    async rewrite(req: RewriteRequest) {
      const r = SAMPLES.rewrites.find((x) => x.fingerprint === fingerprint(req.rewrite.text));
      if (!r) throw new Error("no evaluator is connected for this rewrite");
      return swap(r.judgement, "$REWRITE", req.rewrite.id);
    },
  };
}

/** Who analysed an essay, from the evaluator recorded with the analysis. */
export type AnalysedBy = "llm" | "replay" | "recorded" | "patterns";

/**
 * The server's essay evaluator, when a signed-in developer account has it switched on; otherwise null and the
 * studio keeps its recorded samples and pattern stand-in. The browser never calls a model provider itself.
 */
export async function connectEvaluator(api: {
  essayEvaluatorStatus(): Promise<EssayGatewayInfo & { reason?: string }>;
  essayEvaluate(body: { task: "observe" | "rewrite" | "questions"; request: unknown; data_use: "synthetic_test" }): Promise<unknown>;
}): Promise<EssayEvaluator | null> {
  try {
    const info = await api.essayEvaluatorStatus();
    return info.available ? gatewayEssayEvaluator({ info, post: (body) => api.essayEvaluate(body) }) : null;
  } catch {
    return null; // signed out, not a developer, or no server: the studio works without it
  }
}

export function essayContext(content: AppContent): EssayContext {
  const lessons = new Map<CapabilityId, string[]>();
  const teachingText = new Map<CapabilityId, string[]>();
  for (const l of content.lessons.values()) {
    lessons.set(l.capability, [...(lessons.get(l.capability) ?? []), l.id]);
    const shown = [l.rule, ...l.examples.map((e) => e.text), l.tip ?? "", l.check.prompt, ...l.check.options, l.check.explain].filter(Boolean);
    teachingText.set(l.capability, [...(teachingText.get(l.capability) ?? []), ...shown]);
  }
  // the pilot's pools are existing item-role metadata: a question reserved for one use is never taken for another
  const pools = new Map([...content.pilot.pools].map(([id, p]) => [id, p.pool]));
  return { ctx: content.ctx, profile: indexCompetencyProfile(g8Profile as unknown as CompetencyProfile, content.index), lessons, teachingText, pools, policy: ESSAY_POLICY_DRAFT };
}

export type Stage = "write" | "diagnose" | "plan" | "learn" | "rewrite" | "done";

export interface NextStep {
  step: JourneyStep;
  node: JourneyNode;
  lesson?: Lesson;
  item?: Item;
  /** For a check: the questions are asked in a new sitting, so they are not answered straight after a lesson. */
  newSitting?: boolean;
}

export interface StudioView {
  stage: Stage;
  essays: EssaySubmission[];
  essay: EssaySubmission | null;
  analysis: EssayAnalysis | null;
  /** Which evaluator produced the analysis: the server's LLM or replay, a recorded sample output, or the pattern stand-in. */
  analysedBy: AnalysedBy | null;
  /** Earlier attempts on this essay that failed (for example the server's evaluator was unreachable). */
  failedAnalyses: string[];
  hypotheses: GapHypothesis[];
  diagnostics: { request: DiagnosticRequest; outcome: DiagnosticOutcome }[];
  nextDiagnostic: { request: DiagnosticRequest; item: Item; position: number; total: number } | null;
  journey: LearningJourney | null;
  next: NextStep | null;
  rewrite: RewriteEvaluation | null;
  profile: EssayLearnerProfile;
  /**
   * Each journey competency's separate claims (journey completed, shown without help, verified, retention), kept
   * apart so finishing the journey is never presented as mastery.
   */
  outcomes: CompetencyOutcome[];
  /** Whether fresh diagnostic questions can be generated (the server's evaluator writes questions). */
  canGenerate: boolean;
  /** Every question-generation attempt, oldest first (accepted sets hold provisional practice questions). */
  questionSets: QuestionSet[];
  /** The next question of an open practice set (model-written, provisional: formative only). */
  nextPractice: { set: QuestionSet; item: Item; position: number; total: number } | null;
  /** The next learning activity the record suggests. */
  recommendation: NextActivity | null;
  /** Later checks planned on reserved questions (verification in a new sitting, retention after the delay). */
  checks: PlannedCheck[];
  /** A later check whose time has come, with its next question. Never offered before its notBefore time. */
  laterCheck: { check: PlannedCheck; item: Item; position: number; total: number } | null;
}

export class EssayStudio {
  readonly learner: Learner;
  private ectxCache: { content: AppContent; ectx: EssayContext } | null = null;
  /** The server's evaluator when connected (LLM or replay), else the local recorded samples and pattern stand-in. */
  readonly evaluator: EssayEvaluator;
  /** Used when the server's evaluator fails: the failure is recorded first, then this answers (and says so). */
  readonly fallback: ReturnType<typeof studioEvaluator>;

  constructor(learner: Learner, evaluator: EssayEvaluator | null = null, fallback = studioEvaluator()) {
    this.learner = learner;
    this.fallback = fallback;
    this.evaluator = evaluator ?? fallback;
  }

  /** The essay context for the learner's current content (which grows when generated questions are recorded). */
  get ectx(): EssayContext {
    if (this.ectxCache?.content !== this.learner.content) this.ectxCache = { content: this.learner.content, ectx: essayContext(this.learner.content) };
    return this.ectxCache.ectx;
  }

  /** The server's evaluator is connected and can write diagnostic questions. */
  get canGenerate(): boolean {
    return this.connected && typeof this.evaluator.questions === "function" && this.evaluator.protocols?.questions === ESSAY_QUESTIONS_PROTOCOL;
  }

  get connected(): boolean {
    return this.evaluator !== this.fallback;
  }

  private analysedBy(analysis: EssayAnalysis | null, text: string): AnalysedBy | null {
    if (!analysis) return null;
    if (analysis.evaluator.id === "openpath-gateway:llm") return "llm";
    if (analysis.evaluator.id === "openpath-gateway:replay") return "replay";
    return this.fallback.source(text);
  }

  /** The engine's ledger events (evidence, provenance and essay records), exactly as folded. */
  get events(): LedgerEvent[] {
    return this.learner.state.ledger.events;
  }

  private now(): string {
    return this.learner.clock();
  }

  private latestEssay(): EssaySubmission | null {
    return essayRecords(this.events, "submission").at(-1)?.record.submission ?? null;
  }

  view(): StudioView {
    const events = this.events;
    const now = this.now();
    const essay = this.latestEssay();
    const essays = essayRecords(events, "submission").map((r) => r.record.submission);
    // the latest analysis of the essay (an evaluator failure is recorded, then a fallback answers)
    const analysis = essay ? (essayRecords(events, "analysis").filter((r) => r.record.analysis.essay === essay.id).at(-1)?.record.analysis ?? null) : null;
    const failedAnalyses = essay ? essayRecords(events, "analysis").filter((r) => r.record.analysis.essay === essay.id && r.record.analysis.status === "rejected").map((r) => r.record.analysis.reasons[0] ?? "") : [];
    const hypotheses = gapHypotheses(this.ectx, events);
    const requests = essay ? essayRecords(events, "diagnostic").filter((r) => r.record.request.essay === essay.id).map((r) => r.record.request) : [];
    const current = new Map(hypotheses.map((h) => [h.competency, h]));
    const diagnostics = requests.map((request) => ({ request, outcome: diagnosticOutcome(this.ectx, events, request, current.get(request.competency)?.misconceptions ?? []) }));
    const nextDiagnostic = this.nextDiagnostic(diagnostics);
    const journeyRec = essay ? essayRecords(events, "journey").filter((r) => r.record.journey.essay === essay.id).at(-1) : undefined;
    const journey = journeyRec ? journeyStatus(this.ectx, events, journeyRec.record.journey.id, now) : null;
    const rewriteRec = essay ? essayRecords(events, "rewrite").filter((r) => r.record.rewrite.essay === essay.id).at(-1) : undefined;
    const rewrite = rewriteRec?.record.evaluation ?? null;
    const next = journey ? this.nextStep(journey) : null;
    // policy @3 (A2): every journey's target skills keep their later and delayed checks, from the latest journey holding each
    const outcomes = journey ? journeyOutcomes(this.ectx, events, now) : [];
    const due = dueCheck(this.ectx, events, now);
    const laterItem = due ? this.item(due.item) : undefined;
    const laterCheck = due && laterItem ? { check: due.check, item: laterItem, position: due.position, total: due.total } : null;
    const stage: Stage = !essay ? "write" : nextDiagnostic || nextPracticeQuestion(this.ectx, events) ? "diagnose" : !journey ? "plan" : rewrite ? "done" : journey.finalRewrite.available ? "rewrite" : "learn";
    return {
      stage,
      essays,
      essay,
      analysis,
      analysedBy: essay ? this.analysedBy(analysis, essay.text) : null,
      failedAnalyses,
      hypotheses,
      diagnostics,
      nextDiagnostic,
      journey,
      next,
      rewrite,
      profile: essayProfile(this.ectx, this.learner.profileId, events, now),
      outcomes,
      canGenerate: this.canGenerate,
      questionSets: questionSets(events),
      nextPractice: nextPracticeQuestion(this.ectx, events),
      recommendation: recommendNext(this.ectx, events),
      checks: plannedChecks(events),
      laterCheck,
    };
  }

  private item(id: string): Item | undefined {
    return this.ectx.ctx.content.items.get(id);
  }

  private answered(id: string, since = ""): boolean {
    return this.events.some((e) => (e.kind === "evidence" || e.kind === "assisted_response") && e.item.id === id && e.at >= since);
  }

  private nextDiagnostic(diagnostics: { request: DiagnosticRequest; outcome: DiagnosticOutcome }[]): StudioView["nextDiagnostic"] {
    for (const { request, outcome } of diagnostics) {
      // formal (bank) diagnostics only; an older generated request is never asked as a diagnostic
      if (outcome.status !== "pending" || request.source === "generated") continue;
      const left = request.items.filter((i) => !this.answered(i.id));
      const item = left.length ? this.item(left[0].id) : undefined;
      if (item) return { request, item, position: request.items.length - left.length + 1, total: request.items.length };
    }
    return null;
  }

  private nextStep(journey: LearningJourney): NextStep | null {
    const steps = journey.trees.flatMap((t) => t.nodes.flatMap((node) => node.steps.map((step) => ({ step, node })))).sort((a, b) => a.step.order - b.step.order);
    // policy @4: a review after a failed delayed check follows the journey's own steps (its check is a later check, below)
    for (const r of journey.reviews ?? []) {
      const node: JourneyNode = { competency: r.competency, role: "target", requires: [], reason: r.reason, steps: r.steps, green: false, level: "none", decision: "review" };
      for (const step of r.steps) if (step.kind !== "independent_check") steps.push({ step, node });
    }
    for (const { step, node } of steps) {
      if (step.status !== "pending") continue;
      if (step.kind === "teach") {
        const lesson = step.content.refs.map((id) => this.learner.content.lessons.get(id)).find((l) => l && !this.learner.state.lessons.has(l.id)) ?? this.learner.content.lessons.get(step.content.refs[0]);
        return { step, node, ...(lesson ? { lesson } : {}) };
      }
      const left = step.content.refs.filter((id) => !this.answered(id, journey.at));
      const item = left.length ? this.item(left[0]) : undefined;
      if (!item) continue;
      const taughtHere = step.kind === "independent_check" && this.taughtInOpenSession(node.competency);
      return { step, node, item, ...(taughtHere ? { newSitting: true } : {}) };
    }
    return null;
  }

  private taughtInOpenSession(capability: string): boolean {
    const open = this.learner.state.open;
    return !!open && this.events.some((e) => e.kind === "intervention" && e.session === open.event.session && e.capability === capability);
  }

  private async ensureSession(): Promise<void> {
    if (this.learner.state.open?.event.type !== "essay") await this.learner.newEssaySession();
  }

  /** Submit a synthetic essay, analyse it, and plan diagnostic questions for any suspected gap. */
  async submit(text: string, source: { kind: "typed" | "synthetic"; prompt?: string } = { kind: "synthetic" }): Promise<StudioView> {
    const [m1, m2] = await this.learner.essayMeta(2);
    const essayId = `essay:${this.essays().length + 1}`;
    const s = submitEssay(this.ectx, this.events, m1, { essayId, learner: this.learner.profileId, text, source: { kind: source.kind, dataUse: "synthetic_test", ...(source.prompt ? { prompt: source.prompt } : {}) } });
    await this.learner.recordEssay(s.event);
    const a = await analyseEssay(this.ectx, this.events, this.evaluator, essayId, m2);
    await this.learner.recordEssay(a.event);
    // the server's evaluator failed or answered invalidly: that is recorded above; the local fallback answers next
    if (this.connected && a.analysis.status === "rejected") {
      const [m3] = await this.learner.essayMeta(1);
      await this.learner.recordEssay((await analyseEssay(this.ectx, this.events, this.fallback, essayId, m3)).event);
    }
    // with a question writer connected, the learner chooses a competency and fresh questions are written for it;
    // otherwise diagnostic questions come from the bank at once
    if (!this.canGenerate) {
      const metas = await this.learner.essayMeta(20);
      const d = planDiagnostics(this.ectx, this.events, (n) => metas[n]);
      if (d.events.length) await this.learner.recordEssay(...(d.events as EssayEvent[]));
    }
    return this.view();
  }

  /**
   * The formal check for one suspected competency the learner chose: eligible, unseen bank questions. When the bank
   * has too few, the request records why and asks nothing (the recommendation then offers practice).
   */
  async checkSkill(hypothesisId: string): Promise<StudioView> {
    const [m] = await this.learner.essayMeta(1);
    // the learner chose this skill: an explicit reason, so a skill already shown at the target can be checked again (policy @4)
    const d = planDiagnosticFor(this.ectx, this.events, hypothesisId, m, { explicitReason: "the learner chose to check this skill again" });
    await this.learner.recordEssay(d.event as EssayEvent);
    return this.view();
  }

  /**
   * Five fresh practice questions for a competency, written by the server's model and checked by the core. Formative
   * only. An attempt that fails the checks is recorded with its reasons and asks nothing; it can be tried again.
   */
  async practise(hypothesisId: string): Promise<{ set: QuestionSet; view: StudioView }> {
    if (!this.canGenerate) throw new EssayRefusal("fresh practice questions need the server's evaluator (sign in with a developer account and open the studio with &evaluator=server)");
    const [m] = await this.learner.essayMeta(1);
    const g = await generatePractice(this.ectx, this.events, this.evaluator, hypothesisId, m);
    await this.learner.recordEssay(...g.events);
    return { set: g.set, view: this.view() };
  }

  /** Answer the current practice question: kept with its provenance, held by the engine (provisional), formative only. */
  async answerPractice(response: Response): Promise<{ feedback: Feedback; view: StudioView }> {
    const next = nextPracticeQuestion(this.ectx, this.events);
    if (!next) throw new Error("no practice question is waiting");
    await this.ensureSession();
    await this.learner.present(next.item, "practice");
    const feedback = await this.learner.answer(next.item, response, { use: "practice" });
    return { feedback, view: this.view() };
  }

  private essays(): EssaySubmission[] {
    return essayRecords(this.events, "submission").map((r) => r.record.submission);
  }

  /** Answer the current diagnostic question: an independent first answer, recorded as evidence. */
  async answerDiagnostic(response: Response): Promise<{ feedback: Feedback; view: StudioView }> {
    const next = this.view().nextDiagnostic;
    if (!next) throw new Error("no diagnostic question is waiting");
    await this.ensureSession();
    await this.learner.present(next.item, "assessment");
    const feedback = await this.learner.answer(next.item, response, { use: "assessment" });
    return { feedback, view: this.view() };
  }

  /** Build the learning journey from the diagnosed hypotheses. */
  async plan(): Promise<StudioView> {
    const essay = this.latestEssay();
    if (!essay) throw new Error("no essay yet");
    if (this.view().nextDiagnostic) throw new Error("finish the diagnostic questions first");
    const [m] = await this.learner.essayMeta(1);
    const j = createJourney(this.ectx, this.events, m, essay.id);
    await this.learner.recordEssay(j.event);
    return this.view();
  }

  /** Read a lesson: recorded as a lesson and as a teaching intervention for the engine. */
  async readLesson(lessonId: string, checkCorrect: boolean): Promise<StudioView> {
    await this.ensureSession();
    await this.learner.finishLesson(lessonId, checkCorrect);
    return this.view();
  }

  /** Answer the current practice or check question. Practice is assisted; a check is an independent first answer. */
  async answerStep(response: Response): Promise<{ feedback: Feedback; view: StudioView }> {
    const next = this.view().next;
    if (!next?.item) throw new Error("no question is waiting");
    if (next.newSitting) await this.learner.newEssaySession();
    else await this.ensureSession();
    const check = next.step.kind === "independent_check";
    await this.learner.present(next.item, check ? "assessment" : "practice");
    const feedback = await this.learner.answer(next.item, response, check ? { use: "assessment" } : { assisted: true, use: "practice" });
    return { feedback, view: this.view() };
  }

  /**
   * Plan the later checks the outcomes call for, reserving their questions: a verification check (a new sitting,
   * from the next day) where the journey's check did not show the target, a retention check once it is due.
   * Idempotent; returns the view. A competency with too few questions stays pending, with the reason.
   */
  async planLaterChecks(): Promise<StudioView> {
    const v = this.view();
    if (!v.journey) return v;
    for (const o of v.outcomes) {
      // policy @4: a failed delayed check records its review at once (normally done when the check is answered)
      if (o.review && !o.review.planned) {
        await this.recordReview(o.competency);
        continue;
      }
      if (!o.next || o.next.planned) continue;
      // a retention check is planned only when the target has been shown; its notBefore keeps it delayed
      const [m] = await this.learner.essayMeta(1);
      try {
        const p = planCheck(this.ectx, this.events, m, o.competency, this.view().journey);
        await this.learner.recordEssay(p.event);
      } catch (e) {
        if (!(e instanceof EssayRefusal)) throw e;
      }
    }
    return this.view();
  }

  private async recordReview(competency: string): Promise<void> {
    const [m] = await this.learner.essayMeta(1);
    try {
      await this.learner.recordEssay(planReview(this.ectx, this.events, m, competency).event);
    } catch (e) {
      if (!(e instanceof EssayRefusal)) throw e;
    }
  }

  /** Answer the next question of a later check that is due: always a new sitting, an independent first answer. */
  async answerLaterCheck(response: Response): Promise<{ feedback: Feedback; view: StudioView }> {
    const next = this.view().laterCheck;
    if (!next) throw new Error("no later check is due");
    if (next.position === 1) await this.learner.newEssaySession();
    else await this.ensureSession();
    await this.learner.present(next.item, next.check.kind === "retention" ? "retention" : "assessment");
    const feedback = await this.learner.answer(next.item, response, { use: next.check.kind === "retention" ? "retention" : "assessment" });
    // policy @4: the delayed check just failed: record the review now, in the existing journey, without waiting for an essay
    if (next.check.kind === "retention" && next.position === next.total) {
      const o = competencyOutcome(this.ectx, this.events, next.check.competency, this.now());
      if (o.review && !o.review.planned) await this.recordReview(next.check.competency);
    }
    return { feedback, view: this.view() };
  }

  /** Submit the 50-word rewrite. A rewrite of the built-in sample is judged from a recorded judgement; any other is kept and held. */
  async rewrite(text: string): Promise<StudioView> {
    const essay = this.latestEssay();
    if (!essay) throw new Error("no essay yet");
    const [m] = await this.learner.essayMeta(1);
    // the server's evaluator judges any rewrite; locally, only the built-in sample rewrite has a recorded judgement
    const known = SAMPLES.rewrites.some((r) => r.fingerprint === fingerprint(text));
    const judge = this.connected ? this.evaluator : known ? this.fallback : null;
    const r = await evaluateRewrite(this.ectx, this.events, judge, m, { rewriteId: `rewrite:${essay.id}:${this.events.length}`, essayId: essay.id, text });
    await this.learner.recordEssay(r.event);
    return this.view();
  }

  /** What changed in the profile between two points (for showing what the engine did, and for tests). */
  updates(before: LedgerEvent[]): ProfileUpdate[] {
    return profileUpdates(this.ectx, this.learner.profileId, before, this.events, this.now());
  }
}
