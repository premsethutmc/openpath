/**
 * One learner on this device: their events, the state rebuilt from them, and every action the app takes.
 * The React interface only calls these methods, so the whole learning journey can be tested without a
 * browser (learner.test.ts) and in one (e2e/english.test.mjs).
 */
import type { EvidenceEvent, Item, Response } from "../../../../packages/english-core/src/index.ts";
import { exportBackup, type Backup } from "./backup.ts";
import { type AppContent, type Lesson, lessonId } from "./content.ts";
import { APP_VERSION, type AppEvent, type AttemptEvent, type Planned, type Rating, type SessionType } from "./events.ts";
import { type PilotSummary, pilotSummary } from "./pilot.ts";
import { type Feedback, feedbackFor } from "./feedback.ts";
import { type PlanStep, todayPlan } from "./plan.ts";
import type { Repo } from "./store.ts";
import { type Next, EXPLORE_LENGTH, GUIDED_LENGTH, exploreNext, guidedLesson, guidedNext, placementNext, spellingCheckQueue, spellingPracticeQueue, spellingReviewQueue, spellingTransferQueue } from "./select.ts";
import { type AppState, type SessionState, fold } from "./state.ts";

export type Clock = () => string;

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
  async start(step: Pick<PlanStep, "type" | "capability" | "step" | "lesson">): Promise<Current> {
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
    return { session, lesson, next, done: session.answered.length, total };
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
      default:
        return null;
    }
  }

  async finishLesson(lesson: string, checkCorrect: boolean): Promise<void> {
    await this.add({ kind: "lesson", id: this.nextId(), at: this.clock(), lesson, checkCorrect });
  }

  /**
   * Answer the current question. The first, unaided answer to an item in a session is evidence for the
   * engine; any later try (after feedback, or with a hint) is assisted practice and is recorded only as such.
   */
  async answer(item: Item, response: Response, opts: { assisted?: boolean; use: Next["use"] }): Promise<Feedback> {
    const session = this.state.open;
    if (!session) throw new Error("no session is open");
    const fb = feedbackFor(this.content, item, response);
    const prior = session.attempts.filter((a) => a.item.id === item.id);
    const first = !prior.some((a) => !a.assisted) && !opts.assisted;
    const at = this.clock();
    let evidence: string | undefined;
    if (first) {
      evidence = `${this.profileId}:e${this.events.length + 1}`;
      const ev: EvidenceEvent = { kind: "evidence", id: evidence, at, session: session.event.session, item: { id: item.id, version: item.version }, response, use: opts.use };
      await this.add(ev);
    }
    const attempt: AttemptEvent = {
      kind: "attempt",
      id: this.nextId(),
      at,
      session: session.event.session,
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

  /** How a finished session felt (one tap; the latest rating for a session counts). */
  async rate(session: string, rating: Rating): Promise<void> {
    await this.add({ kind: "rating", id: this.nextId(), at: this.clock(), session, rating });
  }

  /** A note about a problem or anything that got in the way, kept with the record. */
  async note(screen: string, text: string): Promise<void> {
    const t = text.trim();
    if (t) await this.add({ kind: "note", id: this.nextId(), at: this.clock(), screen, text: t.slice(0, 1000) });
  }

  /** The pilot summary: what a guardian shares with the OpenPath team, without the learner's name. */
  pilotSummary(device: { speech: boolean; standalone?: boolean; width?: number }): PilotSummary {
    return pilotSummary(this.state, this.content, this.clock(), device);
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
    }[type];
  }
}
