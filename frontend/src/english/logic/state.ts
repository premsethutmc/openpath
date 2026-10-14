/**
 * The app's state, derived from the event list by a deterministic fold (like the engine's ledger).
 * Nothing here is stored: reopening the app, importing a backup or moving devices all rebuild it.
 */
import { Ledger, type LedgerEvent } from "../../../../packages/english-core/src/index.ts";
import { type AppContent, SPELLING, lessonId } from "./content.ts";
import { type AppEvent, type AttemptEvent, type FlagEvent, type LessonEvent, type PreferencesEvent, type ProfileEvent, type SessionEndEvent, type SessionEvent, isLedgerEvent } from "./events.ts";

const DAY = 86_400_000;
/** Word memory: Leitner boxes, reviewed after 1, 3, 7 and 14 days; a word answered from memory after the last box is learned. */
export const REVIEW_DAYS = [1, 3, 7, 14];
const DUE_EARLY_MS = 12 * 3_600_000;

export interface SessionState {
  event: SessionEvent;
  attempts: AttemptEvent[];
  /** First attempts only (one per item), in order. */
  answered: AttemptEvent[];
  end: SessionEndEvent | null;
}

export interface WordMemory {
  word: string;
  /** 0–3: the next review comes after REVIEW_DAYS[box] days. */
  box: number;
  due: string;
  learned: boolean;
  /** Patterns (capability#step) the word belongs to. */
  patterns: string[];
  history: { at: string; correct: boolean; session: string; review: boolean }[];
}

export interface PatternRecord {
  key: string; // capability#step
  capability: string;
  step: string;
  check: { right: number; total: number };
  practice: { at: string; correct: boolean }[]; // first attempts in practice sessions, in order
  transfers: { at: string; right: number; total: number }[];
  reviews: { right: number; total: number };
}

export interface AppState {
  profile: ProfileEvent | null;
  events: AppEvent[];
  ledger: Ledger;
  sessions: Map<string, SessionState>;
  /** The latest session started and not ended (resumed on reopening). */
  open: SessionState | null;
  lessons: Map<string, LessonEvent>;
  words: Map<string, WordMemory>;
  patterns: Map<string, PatternRecord>;
  speech: boolean;
  /** The learner's band and goal (null until chosen). Wording and Journey order only: never scoring or the plan. */
  preferences: PreferencesEvent | null;
  flags: FlagEvent[];
  /** Items with any attempt (assisted or not), for "unseen word" choices. */
  attempted: Set<string>;
  /** Words (families) the learner has met in any generated item. */
  wordsSeen: Set<string>;
}

const addDays = (iso: string, days: number) => new Date(Date.parse(iso) + days * DAY).toISOString();

export function patternKey(capability: string, step: string): string {
  return lessonId(capability, step);
}

export function fold(content: AppContent, events: AppEvent[]): AppState {
  const ledgerEvents = events.filter(isLedgerEvent) as LedgerEvent[];
  const learner = (events.find((e) => e.kind === "profile") as ProfileEvent | undefined)?.id ?? "local";
  const ledger = Ledger.rebuild(content.ctx, learner, ledgerEvents);
  const s: AppState = {
    profile: null,
    events,
    ledger,
    sessions: new Map(),
    open: null,
    lessons: new Map(),
    words: new Map(),
    patterns: new Map(),
    speech: true,
    preferences: null,
    flags: [],
    attempted: new Set(),
    wordsSeen: new Set(),
  };
  const pattern = (capability: string, step: string): PatternRecord => {
    const key = patternKey(capability, step);
    let p = s.patterns.get(key);
    if (!p) s.patterns.set(key, (p = { key, capability, step, check: { right: 0, total: 0 }, practice: [], transfers: [], reviews: { right: 0, total: 0 } }));
    return p;
  };
  for (const e of events) {
    switch (e.kind) {
      case "profile":
        s.profile = e;
        break;
      case "settings":
        s.speech = e.speech;
        break;
      case "preferences":
        s.preferences = e;
        break;
      case "flag":
        s.flags.push(e);
        break;
      case "lesson":
        s.lessons.set(e.lesson, e);
        break;
      case "session": {
        const st: SessionState = { event: e, attempts: [], answered: [], end: null };
        s.sessions.set(e.session, st);
        s.open = st;
        break;
      }
      case "session_end": {
        const st = s.sessions.get(e.session);
        if (st) st.end = e;
        if (s.open?.event.session === e.session) s.open = null;
        break;
      }
      case "attempt": {
        const st = s.sessions.get(e.session);
        s.attempted.add(e.item.id);
        if (!st) break;
        st.attempts.push(e);
        if (e.assisted) break;
        st.answered.push(e);
        const item = content.ctx.content.items.get(e.item.id);
        if (!item || item.kind !== "code" || !SPELLING.has(item.target) || !item.step) break;
        const type = st.event.type;
        const p = pattern(item.target, item.step);
        if (type === "spelling_check") {
          p.check.total++;
          if (e.correct) p.check.right++;
        } else if (type === "spelling_practice") p.practice.push({ at: e.at, correct: e.correct });
        else if (type === "spelling_review") {
          p.reviews.total++;
          if (e.correct) p.reviews.right++;
        }
        if (item.generated) {
          const word = item.generated.word;
          s.wordsSeen.add(word);
          memory(s, word, p.key, e, type === "spelling_review");
        }
        break;
      }
      default:
        break;
    }
  }
  // transfer checks: scored per session, on the generated (unseen-word) items
  for (const st of s.sessions.values()) {
    if (st.event.type !== "spelling_transfer" || !st.event.capability || !st.event.step) continue;
    const gen = st.answered.filter((a) => content.ctx.content.items.get(a.item.id)?.kind === "code" && !!(content.ctx.content.items.get(a.item.id) as { generated?: unknown }).generated);
    const done = st.end?.reason === "finished" || gen.length >= (st.event.queue ?? []).filter((q) => (content.ctx.content.items.get(q.item) as { generated?: unknown } | undefined)?.generated).length;
    if (gen.length && done) pattern(st.event.capability, st.event.step).transfers.push({ at: gen[gen.length - 1].at, right: gen.filter((a) => a.correct).length, total: gen.length });
  }
  return s;
}

/** Word memory: a misspelt word starts at box 0; a correct review on or after its due day moves it up; a wrong one sends it back. */
function memory(s: AppState, word: string, pattern: string, e: AttemptEvent, review: boolean): void {
  let m = s.words.get(word);
  if (!m) {
    if (e.correct) return; // only words the learner has got wrong are kept for review
    m = { word, box: 0, due: addDays(e.at, REVIEW_DAYS[0]), learned: false, patterns: [pattern], history: [] };
    s.words.set(word, m);
    m.history.push({ at: e.at, correct: false, session: e.session, review });
    return;
  }
  if (!m.patterns.includes(pattern)) m.patterns.push(pattern);
  m.history.push({ at: e.at, correct: e.correct, session: e.session, review });
  if (!e.correct) {
    m.box = 0;
    m.learned = false;
    m.due = addDays(e.at, REVIEW_DAYS[0]);
    return;
  }
  if (review && Date.parse(e.at) >= Date.parse(m.due) - DUE_EARLY_MS) {
    if (m.box >= REVIEW_DAYS.length - 1) m.learned = true;
    else {
      m.box += 1;
      m.due = addDays(e.at, REVIEW_DAYS[m.box]);
    }
  }
}

export function dueWords(s: AppState, now: string): WordMemory[] {
  return [...s.words.values()].filter((w) => !w.learned && Date.parse(w.due) - DUE_EARLY_MS <= Date.parse(now)).sort((a, b) => a.due.localeCompare(b.due) || a.word.localeCompare(b.word));
}

export type PatternStatus = "not_started" | "needs_work" | "practising" | "ready_for_check" | "secure" | "check_again";

export const PRACTICE_WINDOW = 8;
export const PRACTICE_READY = 6;
export const TRANSFER_PASS = 0.75;

export function patternStatus(p: PatternRecord | undefined): PatternStatus {
  if (!p) return "not_started";
  const last = p.transfers[p.transfers.length - 1];
  // practice since the latest transfer check (or all practice, before the first)
  const since = last ? p.practice.filter((x) => x.at > last.at) : p.practice;
  const recent = since.slice(-PRACTICE_WINDOW);
  if (last && last.right / last.total >= TRANSFER_PASS) return "secure";
  if (recent.length >= PRACTICE_WINDOW && recent.filter((x) => x.correct).length >= PRACTICE_READY) return "ready_for_check";
  if (last) return "check_again";
  if (p.practice.length) return "practising";
  if (p.check.total && p.check.right < p.check.total) return "needs_work";
  return "not_started";
}

export function placementDone(s: AppState): boolean {
  return [...s.sessions.values()].some((x) => x.event.type === "placement" && x.end !== null);
}

export function sessionsOf(s: AppState, type: string): SessionState[] {
  return [...s.sessions.values()].filter((x) => x.event.type === type);
}
