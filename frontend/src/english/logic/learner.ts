/**
 * One learner on this device: their events, the state rebuilt from them, and every action the app takes.
 * The React interface only calls these methods, so the whole learning journey can be tested without a
 * browser (learner.test.ts) and in one (e2e/english.test.mjs).
 */
import { type EvidenceEvent, type HintEvent, type Item, PASSAGE_POLICY, leafView, type PresentedPurpose, type Response } from "../../../../packages/english-core/src/index.ts";
import { type JourneyView, hintText, journeyView, parentReport, type ParentReport } from "./journey.ts";
import { exportBackup, type Backup } from "./backup.ts";
import { type AppContent, type Code, type Lesson, type StrategyContent, activityAllowed, itemAllowed, lessonId } from "./content.ts";
import { APP_VERSION, type AppEvent, type AttemptEvent, type EvidenceTarget, type LearnerBand, type LearnerGoal, type PlanTrace, type Planned, type ProfileEvent, type Rating, type SelectionTrace, type SessionType, type SpeechRecord, type TraceEvent } from "./events.ts";
import { type PilotSummary, pilotSummary } from "./pilot.ts";
import { type Feedback, feedbackFor } from "./feedback.ts";
import { type PlanStep, todayPlan } from "./plan.ts";
import { CHECK_LENGTH, type LearnerProfile, type ParentOverview, beforeLastActivity, firstStandings, learnerProfile, parentOverview } from "./profile.ts";
import type { Repo } from "./store.ts";
import { type Next, DICTATION_CAPS, SPELLING_ASSESS, spellingAssessNext, EXPLORE_LENGTH, checkNext, exploreNext, guidedLength, guidedLesson, guidedNext, placementNext, spellingCheckQueue, spellingPracticeQueue, spellingReviewQueue, spellingTransferQueue } from "./select.ts";
import { type AppState, type SessionState, fold } from "./state.ts";
import { now as perfNow, record } from "./telemetry.ts";
import { planTrace, plannerTrace, queueTrace } from "./trace.ts";
import { MASTERY_GATE } from "./mastery-policy.ts";
import { type SpellingState, type SpellWord, BANK, bankWords, checkSpelling, planSession, sessionView, spellingState, wordKey } from "./spelling.ts";
import type { SpellSource } from "./events.ts";
import { type ListWord, type WordList, LIST_LIMITS, listWords, wordLists } from "./wordlists.ts";

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

/** Something a pilot build does not allow (content.ts PilotGate): refused, never shown. */
export class PilotRefusal extends Error {
  constructor(what: string) {
    super(`Not available in the pilot: ${what}. Only the starting check and the spelling check, with approved questions, are open.`);
    this.name = "PilotRefusal";
  }
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
  /** The device's voice, if any (set by the interface): recorded with spelling sessions, name and language only. */
  voiceInfo: { name: string; lang: string; local: boolean } | null = null;
  /** Why the last spelling assessment stopped (recorded as a trace when it ends). */
  private spellingStop: { stop: string; note?: string } | null = null;

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

  static async create(content: AppContent, repo: Repo, name: string, by: "learner" | "guardian", clock: Clock, id = newProfileId(), scope: ProfileEvent["consent"]["scope"] = "this_device_only"): Promise<Learner> {
    const l = new Learner(content, repo, id, [], clock);
    await l.add({ kind: "profile", id, at: clock(), name: name.trim() || "Learner", consent: { by, scope }, app: APP_VERSION });
    return l;
  }

  get speech(): boolean {
    return this.speechAvailable && this.state.speech;
  }

  private nextId(): string {
    return `${this.profileId}:${this.events.length + 1}`;
  }

  private async add(e: AppEvent): Promise<void> {
    let t = perfNow();
    try {
      await this.repo.append(this.profileId, e); // stored before the state moves on
    } catch (err) {
      record({ name: "save_failed", ok: false, detail: `${e.kind}: ${err instanceof Error ? err.name : "error"}` });
      throw err;
    }
    record({ name: "save_ms", ms: perfNow() - t });
    this.events = [...this.events, e];
    if (e.kind === "trace") {
      // a trace explains a decision; it is never evidence and fold ignores it, so nothing needs rebuilding
      this.state = { ...this.state, events: this.events };
      return;
    }
    t = perfNow();
    try {
      this.state = fold(this.content, this.events);
    } catch (err) {
      record({ name: "engine_error", ok: false, detail: err });
      throw err;
    }
    record({ name: "rebuild_ms", ms: perfNow() - t });
  }

  /** Record why a question was shown, right after it was first shown. */
  private async traceSelection(presented: string, item: { id: string; version: number }, selection: SelectionTrace): Promise<void> {
    const session = this.state.open?.event.session;
    await this.addTrace({ kind: "trace", id: this.nextId(), at: this.clock(), ...(session ? { session } : {}), item, presented, selection });
  }

  /** Traces are diagnostic: one that cannot be saved is measured (save_failed) and never stops the learner. */
  private async addTrace(e: TraceEvent): Promise<void> {
    try {
      await this.add(e);
    } catch {
      /* recorded as save_failed by add() */
    }
  }

  /** Record what Today offered and which activity was started, just before the session starts. */
  private planTraceFor(started: PlanTrace["started"], target?: EvidenceTarget): PlanTrace | null {
    try {
      return planTrace(this.profile(), started, target);
    } catch (err) {
      record({ name: "engine_error", ok: false, detail: err });
      return null; // a missing trace never stops a learner from starting
    }
  }

  plan(): PlanStep[] {
    return todayPlan(this.state, this.content, this.clock(), this.speech);
  }

  /** Start a session for a plan step (or "explore"). An unfinished session is ended as stopped first. */
  /** The unified learner profile and development plan, rebuilt from the record. */
  profile(): LearnerProfile {
    return learnerProfile(this.state, this.content, this.clock(), this.speech);
  }

  // ------------------------------------------------------------------ spelling practice (logic/spelling.ts)

  private spellCache: { n: number; st: SpellingState } | null = null;
  /** Spelling practice as it stands, rebuilt from the record (cached until the next event). */
  spelling(): SpellingState {
    if (this.spellCache?.n !== this.events.length) this.spellCache = { n: this.events.length, st: spellingState(this.events) };
    return this.spellCache.st;
  }

  /** The words of a spelling source. The Spelling Bee's preloaded words now; a parent's lists and books later. */
  spellingWords(source: SpellSource = BANK): SpellWord[] {
    if (source.type === "bank") return bankWords(this.content);
    if (source.type === "list") {
      const l = this.wordLists().find((x) => x.id === source.id);
      return l ? listWords(l) : [];
    }
    return [];
  }

  // ------------------------------------------------------------------ My Words (logic/wordlists.ts)

  /** The parent's saved word lists, newest first. */
  wordLists(): WordList[] {
    return wordLists(this.events);
  }

  /**
   * Where parent-supplied content (My Words lists, My Books text) is kept: with the rest of this learner's record. On
   * a device-only record that is this browser on this device; for a learner in a parent account it is the learner's
   * record in that account on OpenPath's server, which only that parent can open (a developer looking at a pupil a
   * parent chose to share for diagnostics sees parent content redacted: backend/family/developer.py).
   */
  get contentPlace(): "device" | "account" {
    return this.repo.kind === "server" ? "account" : "device";
  }
  /** One saved event must fit the server's limit for a single event (backend OPENPATH_MAX_EVENT_BYTES, 32,000). */
  private fits(e: AppEvent, what: string, limit = 30_000) {
    const bytes = new TextEncoder().encode(JSON.stringify(e)).length;
    if (bytes > limit) throw new Error(`${what} is too large to save (${Math.ceil(bytes / 1000)} KB; at most ${limit / 1000} KB). Split it into two.`);
  }

  /** Save a word list (new, or a new version of an existing one). Words must already be checked (parseWords). */
  async saveWordList(name: string, words: ListWord[], id?: string): Promise<string> {
    this.guard("My Words");
    const n = name.trim().slice(0, LIST_LIMITS.nameLength);
    if (!n) throw new Error("give the list a name");
    if (!words.length) throw new Error("the list has no words");
    if (words.length > LIST_LIMITS.words) throw new Error(`a list holds at most ${LIST_LIMITS.words} words`);
    const listId = id ?? `list:${this.events.length + 1}`;
    const e: AppEvent = { kind: "word_list", id: this.nextId(), at: this.clock(), list: { id: listId, name: n, words } };
    this.fits(e, "This list");
    await this.add(e);
    return listId;
  }

  /** Remove a list (its practice history stays in the record). An open session on it is ended. */
  async deleteWordList(id: string): Promise<void> {
    const open = this.spelling().open;
    if (open?.event.source.type === "list" && open.event.source.id === id) await this.stopSpelling();
    await this.add({ kind: "word_list_delete", id: this.nextId(), at: this.clock(), list: id });
  }

  /** Start a spelling session (an unfinished one is ended as stopped first). Practice only: never engine evidence. */
  async startSpelling(source: SpellSource = BANK, delivery: "device_voice" | "adult_reader" = "device_voice"): Promise<void> {
    this.guard("the Spelling Bee");
    const open = this.spelling().open;
    if (open) await this.stopSpelling();
    const plan = planSession(this.spelling(), this.spellingWords(source), this.clock());
    if (!plan.ids.length) throw new Error("there are no words to practise in this list");
    await this.add({ kind: "spell_session", id: this.nextId(), at: this.clock(), session: `sp:${this.events.length + 1}`, source, words: plan.ids, ...(plan.level !== undefined ? { level: plan.level } : {}), delivery });
  }

  /** The open spelling session: the word to ask next (null when it is done) and the counts so far. */
  spellingSession(): { source: SpellSource; session: string; delivery: "device_voice" | "adult_reader"; level?: number; word: SpellWord | null; position: number; total: number; right: number; wrong: number } | null {
    const open = this.spelling().open;
    if (!open) return null;
    const v = sessionView(open);
    const word = v.next ? (this.spellingWords(open.event.source).find((w) => w.id === v.next) ?? null) : null;
    return { source: open.event.source, session: open.event.session, delivery: open.event.delivery, level: open.event.level, word, position: v.position, total: v.total, right: v.right, wrong: v.wrong };
  }

  /** Answer the current word. Returns whether it was right and the word (to show its spelling now, after the answer). */
  async answerSpelling(response: string, plays: number): Promise<{ correct: boolean; word: SpellWord }> {
    this.guard("the Spelling Bee");
    const cur = this.spellingSession();
    if (!cur?.word) throw new Error("no spelling word is waiting for an answer");
    const w = cur.word;
    const before = this.spelling().words.get(wordKey(w.source, w.id));
    const correct = checkSpelling(w, response);
    await this.add({ kind: "spell_answer", id: this.nextId(), at: this.clock(), session: cur.session, source: w.source, word: { id: w.id, text: w.word, ...(w.level !== undefined ? { level: w.level } : {}) }, response: response.slice(0, 100), correct, plays: Math.max(0, Math.floor(plays)), review: !!before && before.box !== null });
    // the session ends by itself after its last word
    const after = this.spellingSession();
    if (after && !after.word) await this.add({ kind: "spell_end", id: this.nextId(), at: this.clock(), session: cur.session, reason: "finished" });
    return { correct, word: w };
  }

  async stopSpelling(): Promise<void> {
    const open = this.spelling().open;
    if (open) await this.add({ kind: "spell_end", id: this.nextId(), at: this.clock(), session: open.event.session, reason: "stopped" });
  }

  /** The parent overview: the profile now, compared with the record before the last activity and with the first measurements. */
  overview(): { profile: LearnerProfile; overview: ParentOverview } {
    const now = this.clock();
    const profile = learnerProfile(this.state, this.content, now, this.speech);
    const before = beforeLastActivity(this.events);
    const previous = before ? learnerProfile(fold(this.content, before), this.content, before.at(-1)!.at, this.speech, { activities: false }) : null;
    return { profile, overview: parentOverview(profile, previous, firstStandings(this.content, this.events)) };
  }

  /** Speech as it is now: whether a local voice was found, whether hearing words is on, and the voice. */
  speechRecord(): SpeechRecord {
    return { available: this.speechAvailable, enabled: this.state.speech, voice: this.speechAvailable ? this.voiceInfo : null };
  }

  /** Whether this activity can be started here (in a pilot build: only allowed activities with approved questions). */
  allows(type: SessionType): boolean {
    return activityAllowed(this.content, type);
  }

  /** In a pilot build, refuse anything outside the boundary before it is recorded or shown. */
  private guard(what: string): void {
    if (this.content.gate) throw new PilotRefusal(what);
  }

  async start(step: Pick<PlanStep, "type" | "capability" | "step" | "lesson" | "purpose" | "target">, opts: { delivery?: "device_voice" | "adult_reader"; length?: number } = {}): Promise<Current> {
    // the pilot boundary is checked first: a refused activity records nothing and ends nothing
    if (!activityAllowed(this.content, step.type)) throw new PilotRefusal(step.type === "placement" || step.type === "spelling_assess" ? `${step.type} (no educator-approved questions yet)` : step.type);
    if (this.state.open) await this.stop();
    const now = this.clock();
    const s = this.state;
    const c = this.content;
    const plan = this.planTraceFor({ type: step.type, ...(step.capability ? { capability: step.capability } : {}), ...(step.purpose ? { purpose: step.purpose } : {}), ...(step.step ? { step: step.step } : {}) }, step.target);
    if (plan) await this.addTrace({ kind: "trace", id: this.nextId(), at: now, plan });
    const base = { kind: "session" as const, id: this.nextId(), at: now, session: `s:${this.events.length + 1}`, type: step.type };
    let queue: Planned[] | undefined;
    let extra: Record<string, unknown> = {};
    switch (step.type) {
      case "placement":
        extra = { length: 24 };
        break;
      case "spelling_assess": {
        // dictation needs the words said aloud: by the device's voice, or by an adult reading them (recorded)
        const delivery = opts.delivery ?? "device_voice";
        if (delivery === "device_voice" && !this.speech) throw new Error("the spelling assessment needs speech on this device, or an adult to read the words");
        // an evidence check on one skill (C′) is short and restricted to the difficulty that can fill the gap
        extra = step.capability ? { length: opts.length ?? MASTERY_GATE.checkLength, delivery, capability: step.capability, purpose: step.purpose ?? "assess", ...(step.target ? { target: step.target } : {}) } : { length: SPELLING_ASSESS.max, delivery };
        break;
      }
      case "explore":
        extra = { length: EXPLORE_LENGTH };
        break;
      case "check":
        extra = { length: CHECK_LENGTH, capability: step.capability, purpose: step.purpose ?? "assess", ...(step.target ? { target: step.target } : {}) };
        break;
      case "guided": {
        const lesson = step.lesson ?? guidedLesson(s, c, step.capability!, now);
        extra = { length: guidedLength(c, step.capability!), capability: step.capability, ...(lesson ? { lesson } : {}) };
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
    const speech = step.type.startsWith("spelling_") ? { speech: this.speechRecord() } : {};
    await this.add({ ...base, ...(queue ? { queue } : {}), ...extra, ...speech });
    return this.current();
  }

  /** Where the open session is: the lesson to read first, or the next question. Finishes the session when nothing is left. */
  async current(): Promise<Current> {
    const session = this.state.open;
    if (!session) throw new Error("no session is open");
    // a session the pilot does not allow (resumed from an older or imported record) is ended, never continued
    if (!activityAllowed(this.content, session.event.type)) {
      await this.stop();
      return { session: this.state.sessions.get(session.event.session)!, lesson: null, next: null, done: session.answered.length, total: session.answered.length };
    }
    const lessonId = session.event.lesson;
    const lesson = lessonId && !this.state.lessons.has(lessonId) ? (this.content.lessons.get(lessonId) ?? null) : null;
    const t = perfNow();
    const next = lesson ? null : this.nextQuestion(session);
    if (next) record({ name: "select_ms", ms: perfNow() - t });
    const total = session.event.queue?.length ?? session.event.length ?? 0;
    if (!lesson && !next) {
      if (session.event.type === "spelling_assess" && this.spellingStop) {
        const s = this.spellingStop;
        const now = this.clock();
        const estimates = DICTATION_CAPS.map((cap) => {
          const v = leafView(this.state.ledger.composite, this.content.index, cap, now);
          return { capability: cap, mean: Math.round(v.mean * 1000) / 1000, sd: Math.round(v.sd * 1000) / 1000 };
        });
        await this.addTrace({ kind: "trace", id: this.nextId(), at: now, session: session.event.session, selection: { selector: "engine", use: "assess", spelling: { estimates, rule: s.stop === "insufficient" ? "insufficient" : "stopped", reasons: [`stopped: ${s.note ?? s.stop}`], window: 0, testedPatterns: [] } } });
        this.spellingStop = null;
      }
      await this.add({ kind: "session_end", id: this.nextId(), at: this.clock(), session: session.event.session, reason: "finished" });
      return { session: this.state.sessions.get(session.event.session)!, lesson: null, next: null, done: session.answered.length, total };
    }
    if (next) {
      const fresh = !this.presentedId(session.event.session, next.item.id);
      const presented = await this.present(next.item, next.use);
      if (fresh && next.trace) await this.traceSelection(presented, { id: next.item.id, version: next.item.version }, next.trace);
    }
    return { session: this.state.open ?? session, lesson, next, done: session.answered.length, total };
  }

  private nextQuestion(session: SessionState): Next | null {
    const now = this.clock();
    const answered = new Set(session.answered.map((a) => a.item.id));
    if (session.event.queue) {
      const queue = session.event.queue;
      const at = queue.findIndex((p) => !answered.has(p.item));
      if (at < 0) return null;
      const q = queue[at];
      const item = this.content.ctx.content.items.get(q.item);
      return item && itemAllowed(this.content, item) ? { item, use: q.use, why: "", trace: queueTrace(session.event.type, at + 1, queue.length, q.use) } : null;
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
      case "spelling_assess": {
        const choice = spellingAssessNext(s, this.content, session, now);
        this.spellingStop = choice.stop ? { stop: choice.stop, note: choice.note } : null;
        return choice.next;
      }
      default:
        return null;
    }
  }

  /** A lesson read before practice: recorded for the app, and as a teaching intervention for the engine. */
  async finishLesson(lesson: string, checkCorrect: boolean): Promise<void> {
    this.guard("lessons");
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
    // the last line of the pilot boundary: nothing unapproved is ever recorded as shown
    if (!itemAllowed(this.content, item) || !activityAllowed(this.content, session.event.type)) throw new PilotRefusal(`question ${item.id} version ${item.version}`);
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
    const t = perfNow();
    const fb = await this.record(item, response, opts);
    record({ name: "answer_ms", ms: perfNow() - t });
    return fb;
  }

  /** A dictation session that needs the device's voice, on a device that cannot speak now (it was lost, or switched off). */
  speechLost(): boolean {
    const ev = this.state.open?.event;
    return ev?.type === "spelling_assess" && ev.delivery === "device_voice" && !this.speech;
  }

  /** Go on with an adult reading the words: the device-voice session ends (stopped) and a new one records the adult. */
  async continueWithAdultReader(): Promise<Current> {
    const ev = this.state.open?.event;
    const asked = this.state.open?.answered.length ?? 0;
    await this.stop();
    // the same check (an evidence check keeps its skill, purpose and difficulty range, and only its words still to ask)
    return this.start(
      { type: "spelling_assess", ...(ev?.capability ? { capability: ev.capability, purpose: ev.purpose, target: ev.target } : {}) },
      { delivery: "adult_reader", ...(ev?.capability ? { length: Math.max(1, (ev.length ?? MASTERY_GATE.checkLength) - asked) } : {}) },
    );
  }

  private async record(item: Item, response: Response, opts: { assisted?: boolean; use: Next["use"]; intervention?: string }): Promise<Feedback> {
    const session = this.state.open;
    if (!session) throw new Error("no session is open");
    if (!itemAllowed(this.content, item)) throw new PilotRefusal(`question ${item.id} version ${item.version}`);
    // a word that could not be heard is never recorded as an answer to it
    if (item.kind === "code" && item.format === "typed:dictation" && this.speechLost()) throw new Error("this device cannot say the word now: an adult can read the words, or stop for now");
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
        provenance: { schema: "provenance@1", ...(presented ? { presented } : {}), attempt: 1, hints: [], afterFeedback: false, ...(opts.intervention ? { intervention: opts.intervention } : {}), policies: [PASSAGE_POLICY] },
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
    this.guard("the doubling journey");
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
    const plan = this.planTraceFor({ type: "doubling_journey", capability: this.content.journey.capability, step: this.content.journey.rule });
    if (plan) await this.addTrace({ kind: "trace", id: this.nextId(), at: this.clock(), plan });
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
    this.guard("the doubling journey");
    const session = this.state.open;
    if (!session || session.event.type !== "doubling_journey") return this.journeyPreview();
    if (Date.parse(this.clock()) - Date.parse(this.lastActivity(session.event.session)) > JOURNEY_IDLE_MS) {
      await this.stop();
      return this.startJourney();
    }
    const t = perfNow();
    const v = journeyView(this.state, this.content, session, this.clock());
    record({ name: "select_ms", ms: perfNow() - t });
    // the journey has ended: close the session now, not when a button is pressed (the app may simply be closed)
    if (v.step.kind === "summary") {
      await this.add({ kind: "session_end", id: this.nextId(), at: this.clock(), session: session.event.session, reason: "finished" });
      return v;
    }
    if (v.step.kind === "question" || v.step.kind === "guided") {
      const item = v.step.item;
      const purpose = v.step.kind === "guided" ? "teaching" : v.step.purpose === "reassess" ? "assessment" : v.step.purpose;
      const fresh = !this.presentedId(session.event.session, item.id);
      const presented = await this.present(item, purpose, v.step.kind === "guided" ? v.step.intervention : undefined);
      if (fresh) await this.traceSelection(presented, { id: item.id, version: item.version }, plannerTrace(v.decision, v.step.kind === "guided" ? "practice" : v.step.purpose));
    }
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
    this.guard("teaching");
    const session = this.state.open;
    if (!session) throw new Error("no session is open");
    await this.add({ kind: "intervention", id: this.nextId(), at: this.clock(), session: session.event.session, capability: this.content.journey.capability, rule: this.content.journey.rule, strategy: strategy.id, content: `doubling-journey:${strategy.id}`, reason });
  }

  /** Show the next hint level for a guided item; returns its text. The last level is a worked example that shows the answer. */
  async hint(item: Code, strategy: StrategyContent): Promise<string> {
    this.guard("hints");
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

  /** Who is learning and their goal: recorded as the learner's choice; never used for scoring or the plan. */
  async setPreferences(band: LearnerBand, goal: LearnerGoal): Promise<void> {
    await this.add({ kind: "preferences", id: this.nextId(), at: this.clock(), band, goal });
  }

  async setSpeech(on: boolean): Promise<void> {
    await this.add({ kind: "settings", id: this.nextId(), at: this.clock(), speech: on });
  }

  async flag(item: Item, note: string): Promise<void> {
    // the pilot records nothing a child writes in their own words (information sheet); the supervisor logs questions on paper
    this.guard("reporting a question with a note");
    await this.add({ kind: "flag", id: this.nextId(), at: this.clock(), item: { id: item.id, version: item.version }, note: note.slice(0, 500) });
  }

  /** How a finished session felt (one tap; the latest rating for a session counts). */
  async rate(session: string, rating: Rating): Promise<void> {
    this.guard("session ratings"); // not part of what the pilot records (information sheet)
    await this.add({ kind: "rating", id: this.nextId(), at: this.clock(), session, rating });
  }

  /** A note about a problem or anything that got in the way, kept with the record. */
  async note(screen: string, text: string): Promise<void> {
    this.guard("free-text notes");
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
      spelling_assess: "Spelling check: hear and spell",
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
