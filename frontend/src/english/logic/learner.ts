/**
 * One learner on this device: their events, the state rebuilt from them, and every action the app takes.
 * The React interface only calls these methods, so the whole learning journey can be tested without a
 * browser (learner.test.ts) and in one (e2e/english.test.mjs).
 */
import type { EvidenceEvent, HintEvent, Item, PresentedPurpose, Response } from "../../../../packages/english-core/src/index.ts";
import { type JourneyView, hintText, journeyView, parentReport, type ParentReport } from "./journey.ts";
import { exportBackup, type Backup } from "./backup.ts";
import { type AppContent, type Code, type Lesson, type StrategyContent, lessonId } from "./content.ts";
import { APP_VERSION, type AppEvent, type AttemptEvent, type Planned, type SessionType } from "./events.ts";
import { type Feedback, feedbackFor } from "./feedback.ts";
import { type PlanStep, todayPlan } from "./plan.ts";
import { CHECK_LENGTH, type LearnerProfile, type ParentOverview, beforeLastActivity, firstStandings, learnerProfile, parentOverview } from "./profile.ts";
import type { Repo } from "./store.ts";
import { type Next, EXPLORE_LENGTH, GUIDED_LENGTH, checkNext, exploreNext, guidedLesson, guidedNext, placementNext, spellingCheckQueue, spellingPracticeQueue, spellingReviewQueue, spellingTransferQueue } from "./select.ts";
import { type AppState, type SessionState, fold } from "./state.ts";

export type Clock = () => string;

/** A journey session idle for longer than this is ended when the journey is next opened. */
export const JOURNEY_IDLE_MS = 6 * 3_600_000;

export interface Current {
  session: SessionState;
  /** A lesson to read first (shown once per lesson). */
  lesson: Lesson | null;
  /** The next question, or null when the session has just finished. */
  next: Next | null;
  done: number;
  /** Fixed sessions know their length; adaptive ones give an upper bound. */
  total: number;
}

export const newProfileId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`);

export class Learner {
  readonly content: AppContent;
  readonly repo: Repo;
  readonly profileId: string;
  readonly clock: Clock;
  events: AppEvent[];
  state: AppState;
  /** Whether on-device speech works here (set by the interface after checking the device's voices). */
  speechAvailable = false;

  private constructor(content: AppContent, repo: Repo, profileId: string, events: AppEvent[], clock: Clock) {
    this.content = content;
    this.repo = repo;
    this.profileId = profileId;
    this.clock = clock;
    this.events = events;
    this.state = fold(content, events);
  }

  static async open(content: AppContent, repo: Repo, profileId: string, clock: Clock): Promise<Learner> {
    const events = await repo.load(profileId);
    if (!events.length) throw new Error("this profile has no saved record on this device");
    return new Learner(content, repo, profileId, events, clock);
  }

  static async create(content: AppContent, repo: Repo, name: string, by: "learner" | "guardian", clock: Clock, id = newProfileId()): Promise<Learner> {
    const l = new Learner(content, repo, id, [], clock);
    await l.add({ kind: "profile", id, at: clock(), name: name.trim() || "Learner", consent: { by, scope: "this_device_only" }, app: APP_VERSION });
    return l;
  }

  get speech(): boolean {
    return this.speechAvailable && this.state.speech;
  }

  private nextId(): string {
    return `${this.profileId}:${this.events.length + 1}`;
  }

  private async add(e: AppEvent): Promise<void> {
    await this.repo.append(this.profileId, e); // stored before the state moves on
    this.events = [...this.events, e];
    this.state = fold(this.content, this.events);
  }

  plan(): PlanStep[] {
    return todayPlan(this.state, this.content, this.clock(), this.speech);
  }

  /** Start a session for a plan step (or "explore"). An unfinished session is ended as stopped first. */
  /** The unified learner profile and development plan, rebuilt from the record. */
  profile(): LearnerProfile {
    return learnerProfile(this.state, this.content, this.clock(), this.speech);
  }

  /** The parent overview: the profile now, compared with the record before the last activity and with the first measurements. */
  overview(): { profile: LearnerProfile; overview: ParentOverview } {
    const now = this.clock();
    const profile = learnerProfile(this.state, this.content, now, this.speech);
    const before = beforeLastActivity(this.events);
    const previous = before ? learnerProfile(fold(this.content, before), this.content, before.at(-1)!.at, this.speech, { activities: false }) : null;
    return { profile, overview: parentOverview(profile, previous, firstStandings(this.content, this.events)) };
  }

  async start(step: Pick<PlanStep, "type" | "capability" | "step" | "lesson" | "purpose">): Promise<Current> {
    if (this.state.open) await this.stop();
    const now = this.clock();
    const s = this.state;
    const c = this.content;
    const base = { kind: "session" as const, id: this.nextId(), at: now, session: `s:${this.events.length + 1}`, type: step.type };
    let queue: Planned[] | undefined;
    let extra: Record<string, unknown> = {};
    switch (step.type) {
      case "placement":
        extra = { length: 24 };
        break;
      case "explore":
        extra = { length: EXPLORE_LENGTH };
        break;
      case "check":
        extra = { length: CHECK_LENGTH, capability: step.capability, purpose: step.purpose ?? "assess" };
        break;
      case "guided": {
        const lesson = step.lesson ?? guidedLesson(s, c, step.capability!, now);
        extra = { length: GUIDED_LENGTH, capability: step.capability, ...(lesson ? { lesson } : {}) };
        break;
      }
      case "spelling_check":
        queue = spellingCheckQueue(s, c, now, this.speech);
        break;
      case "spelling_review":
        queue = spellingReviewQueue(s, c, now, this.speech);
        break;
      case "spelling_practice": {
        queue = spellingPracticeQueue(s, c, step.capability!, step.step!, this.speech);
        const lesson = lessonId(step.capability!, step.step!);
        extra = { capability: step.capability, step: step.step, ...(c.lessons.has(lesson) ? { lesson } : {}) };
        break;
      }
      case "spelling_transfer":
        queue = spellingTransferQueue(s, c, step.capability!, step.step!, this.speech);
        extra = { capability: step.capability, step: step.step };
        break;
    }
    await this.add({ ...base, ...(queue ? { queue } : {}), ...extra });
    return this.current();
  }

  /** Where the open session is: the lesson to read first, or the next question. Finishes the session when nothing is left. */
  async current(): Promise<Current> {
    const session = this.state.open;
    if (!session) throw new Error("no session is open");
    const lessonId = session.event.lesson;
    const lesson = lessonId && !this.state.lessons.has(lessonId) ? (this.content.lessons.get(lessonId) ?? null) : null;
    const next = lesson ? null : this.nextQuestion(session);
    const total = session.event.queue?.length ?? session.event.length ?? 0;
    if (!lesson && !next) {
      await this.add({ kind: "session_end", id: this.nextId(), at: this.clock(), session: session.event.session, reason: "finished" });
      return { session: this.state.sessions.get(session.event.session)!, lesson: null, next: null, done: session.answered.length, total };
    }
    if (next) await this.present(next.item, next.use);
    return { session: this.state.open ?? session, lesson, next, done: session.answered.length, total };
  }

  private nextQuestion(session: SessionState): Next | null {
    const now = this.clock();
    const answered = new Set(session.answered.map((a) => a.item.id));
    if (session.event.queue) {
      const q = session.event.queue.find((p) => !answered.has(p.item));
      if (!q) return null;
      const item = this.content.ctx.content.items.get(q.item);
      return item ? { item, use: q.use, why: "" } : null;
    }
    const s = this.state;
    switch (session.event.type) {
      case "placement":
        return placementNext(s, this.content, session, now);
      case "guided":
        return guidedNext(s, this.content, session, now);
      case "explore":
        return exploreNext(s, this.content, session, now);
      case "check":
        return checkNext(s, this.content, session, now);
      default:
        return null;
    }
  }

  /** A lesson read before practice: recorded for the app, and as a teaching intervention for the engine. */
  async finishLesson(lesson: string, checkCorrect: boolean): Promise<void> {
    const at = this.clock();
    await this.add({ kind: "lesson", id: this.nextId(), at, lesson, checkCorrect });
    const l = this.content.lessons.get(lesson);
    const session = this.state.open?.event.session;
    if (l && session) await this.add({ kind: "intervention", id: this.nextId(), at, session, capability: l.capability, rule: l.step, strategy: "lesson", content: lesson });
  }

  // ------------------------------------------------------------------ provenance

  /** Record that a question was shown (once per item and session); returns the event id. */
  async present(item: Item, purpose: PresentedPurpose, intervention?: string): Promise<string> {
    const session = this.state.open;
    if (!session) throw new Error("no session is open");
    const prior = this.events.find((e) => e.kind === "presented" && e.session === session.event.session && e.item.id === item.id);
    if (prior) return prior.id;
    const id = this.nextId();
    await this.add({ kind: "presented", id, at: this.clock(), session: session.event.session, item: { id: item.id, version: item.version }, purpose, ...(intervention ? { intervention } : {}) });
    return id;
  }

  private presentedId(session: string, item: string): string | undefined {
    return this.events.find((e) => e.kind === "presented" && e.session === session && e.item.id === item)?.id;
  }

  private hintsFor(session: string, item: string): HintEvent[] {
    return this.events.filter((e): e is HintEvent => e.kind === "hint" && e.session === session && e.item.id === item);
  }

  /**
   * Answer the current question. The first, unaided answer to an item in a session is evidence for the
   * engine; any later try (after feedback, or with a hint) is assisted practice and is recorded only as such.
   */
  async answer(item: Item, response: Response, opts: { assisted?: boolean; use: Next["use"]; intervention?: string }): Promise<Feedback> {
    const session = this.state.open;
    if (!session) throw new Error("no session is open");
    const sid = session.event.session;
    const fb = feedbackFor(this.content, item, response);
    const prior = session.attempts.filter((a) => a.item.id === item.id);
    const hints = this.hintsFor(sid, item.id).map((h) => h.id);
    // independent only if: no earlier try at this item in the session, no hint, not marked as helped
    const first = !prior.length && !opts.assisted && !hints.length;
    const at = this.clock();
    const presented = this.presentedId(sid, item.id);
    let evidence: string | undefined;
    if (first) {
      evidence = `${this.profileId}:e${this.events.length + 1}`;
      const ev: EvidenceEvent = {
        kind: "evidence",
        id: evidence,
        at,
        session: sid,
        item: { id: item.id, version: item.version },
        response,
        use: opts.use,
        provenance: { schema: "provenance@1", ...(presented ? { presented } : {}), attempt: 1, hints: [], afterFeedback: false, ...(opts.intervention ? { intervention: opts.intervention } : {}) },
      };
      await this.add(ev);
    } else {
      // a later or helped try: recorded in the ledger as assisted, never as evidence
      await this.add({
        kind: "assisted_response",
        id: `${this.profileId}:a${this.events.length + 1}`,
        at,
        session: sid,
        item: { id: item.id, version: item.version },
        ...(presented ? { presented } : {}),
        response,
        attempt: prior.length + 1,
        hints,
        afterFeedback: prior.length > 0,
        ...(opts.intervention ? { intervention: opts.intervention } : {}),
      });
    }
    const attempt: AttemptEvent = {
      kind: "attempt",
      id: this.nextId(),
      at,
      session: sid,
      item: { id: item.id, version: item.version },
      response,
      correct: fb.correct,
      misconceptions: fb.misconceptions,
      assisted: !first,
      attempt: prior.length + 1,
      use: opts.use,
      ...(evidence ? { evidence } : {}),
    };
    await this.add(attempt);
    return fb;
  }

  // ------------------------------------------------------------------ the doubling journey

  /**
   * Open the adaptive consonant-doubling journey. An open journey is resumed, not restarted. When there is
   * nothing to do (shown, paused for support, out of questions) no session is created: the summary is shown
   * from the record as it stands, so opening the journey repeatedly never adds events.
   */
  async startJourney(): Promise<JourneyView> {
    let open = this.state.open;
    // an open journey left idle for hours is ended, so a return days later is a new session (delayed checks depend on it)
    if (open?.event.type === "doubling_journey" && Date.parse(this.clock()) - Date.parse(this.lastActivity(open.event.session)) > JOURNEY_IDLE_MS) {
      await this.stop();
      open = this.state.open;
    }
    if (open?.event.type === "doubling_journey") return this.journey();
    const preview = this.journeyPreview();
    if (preview.step.kind === "summary") return preview;
    if (open) await this.stop();
    await this.add({ kind: "session", id: this.nextId(), at: this.clock(), session: `s:${this.events.length + 1}`, type: "doubling_journey", capability: this.content.journey.capability, step: this.content.journey.rule });
    return this.journey();
  }

  /** What the journey would do now, without recording anything (a session that does not exist yet). */
  journeyPreview(): JourneyView {
    const now = this.clock();
    const virtual = { event: { kind: "session" as const, id: "preview", at: now, session: "preview", type: "doubling_journey" as const }, attempts: [], answered: [], end: null };
    return journeyView(this.state, this.content, virtual, now);
  }

  /** Where the journey is. Records a question as presented (once). With no journey open: the preview, which is a summary. */
  async journey(): Promise<JourneyView> {
    const session = this.state.open;
    if (!session || session.event.type !== "doubling_journey") return this.journeyPreview();
    if (Date.parse(this.clock()) - Date.parse(this.lastActivity(session.event.session)) > JOURNEY_IDLE_MS) {
      await this.stop();
      return this.startJourney();
    }
    const v = journeyView(this.state, this.content, session, this.clock());
    // the journey has ended: close the session now, not when a button is pressed (the app may simply be closed)
    if (v.step.kind === "summary") {
      await this.add({ kind: "session_end", id: this.nextId(), at: this.clock(), session: session.event.session, reason: "finished" });
      return v;
    }
    if (v.step.kind === "question") await this.present(v.step.item, v.step.purpose === "reassess" ? "assessment" : v.step.purpose);
    if (v.step.kind === "guided") await this.present(v.step.item, "teaching", v.step.intervention);
    return journeyView(this.state, this.content, this.state.open!, this.clock());
  }

  private lastActivity(session: string): string {
    return this.events.filter((e) => "session" in e && e.session === session).at(-1)?.at ?? this.clock();
  }

  /** Answer an independent journey question (no hints exist for these). */
  async answerJourney(item: Item, response: Response, purpose: "assessment" | "reassess" | "retention"): Promise<Feedback> {
    const block = this.events.filter((e) => e.kind === "intervention" && e.capability === this.content.journey.capability && e.rule === this.content.journey.rule).at(-1)?.id;
    return this.answer(item, response, { use: purpose === "retention" ? "retention" : "assessment", ...(purpose === "reassess" && block ? { intervention: block } : {}) });
  }

  /** The teaching step was shown: recorded as an intervention with its strategy. */
  async teach(strategy: StrategyContent, reason: string): Promise<void> {
    const session = this.state.open;
    if (!session) throw new Error("no session is open");
    await this.add({ kind: "intervention", id: this.nextId(), at: this.clock(), session: session.event.session, capability: this.content.journey.capability, rule: this.content.journey.rule, strategy: strategy.id, content: `doubling-journey:${strategy.id}`, reason });
  }

  /** Show the next hint level for a guided item; returns its text. The last level is a worked example that shows the answer. */
  async hint(item: Code, strategy: StrategyContent): Promise<string> {
    const session = this.state.open;
    if (!session) throw new Error("no session is open");
    const level = this.hintsFor(session.event.session, item.id).length + 1;
    // the last level is a worked example that shows the answer: recorded as such, so nothing after it is ever independent
    const worked = level >= strategy.hints.length;
    await this.add({
      kind: "hint",
      id: this.nextId(),
      at: this.clock(),
      session: session.event.session,
      item: { id: item.id, version: item.version },
      ...(this.presentedId(session.event.session, item.id) ? { presented: this.presentedId(session.event.session, item.id)! } : {}),
      level,
      hintType: worked ? `${strategy.id}:worked_example` : `${strategy.id}:${level}`,
      ...(worked ? { revealsAnswer: true as const } : {}),
    });
    return hintText(strategy, item, level);
  }

  /** A guided-practice answer: always assisted (it is part of teaching), never evidence. */
  async answerGuided(item: Item, response: Response, intervention: string): Promise<Feedback> {
    return this.answer(item, response, { assisted: true, use: "practice", intervention });
  }

  async finishJourney(): Promise<void> {
    const open = this.state.open;
    if (open && open.event.type === "doubling_journey") await this.add({ kind: "session_end", id: this.nextId(), at: this.clock(), session: open.event.session, reason: "finished" });
  }

  /** The parent-facing summary of the doubling journey so far. */
  doublingReport(): ParentReport {
    return parentReport(this.state, this.content, this.clock());
  }

  async stop(): Promise<void> {
    const open = this.state.open;
    if (open) await this.add({ kind: "session_end", id: this.nextId(), at: this.clock(), session: open.event.session, reason: "stopped" });
  }

  async setSpeech(on: boolean): Promise<void> {
    await this.add({ kind: "settings", id: this.nextId(), at: this.clock(), speech: on });
  }

  async flag(item: Item, note: string): Promise<void> {
    await this.add({ kind: "flag", id: this.nextId(), at: this.clock(), item: { id: item.id, version: item.version }, note: note.slice(0, 500) });
  }

  backup(): Backup {
    return exportBackup(this.events, this.content.index.key, this.clock());
  }

  /** The engine's decision for an evidence event (to show what an answer did). */
  decisionFor(evidenceId: string) {
    return this.state.ledger.decisions.find((d) => d.source === evidenceId);
  }

  static sessionTitle(type: SessionType): string {
    return {
      placement: "Finding your starting point",
      spelling_check: "Spelling check",
      spelling_practice: "Spelling practice",
      spelling_review: "Word review",
      spelling_transfer: "Check with new words",
      guided: "Practice",
      explore: "More practice",
      doubling_journey: "Doubling letters",
      check: "A few questions",
    }[type];
  }
}
