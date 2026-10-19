/**
 * The learner's record on this device: one append-only list of events per profile.
 *
 * Evidence events are the engine's own ledger events (the composite is rebuilt from them, exactly as in
 * the core's tests and the simulator). Everything else the app needs — sessions, lessons, every attempt
 * including hints and second tries, settings, reported problems — is an app event in the same list, so
 * one export holds the whole record and a rebuild always gives the same state.
 */
import type { EvidenceEvent, EvidenceUse, LedgerEvent, Response } from "../../../../packages/english-core/src/index.ts";

export const APP_VERSION = "openpath-english-web@1";

export type SessionType =
  | "placement" // independent: where to start
  | "spelling_check" // (before dictation) a fixed list of generated words; practice-only. Kept so earlier records replay
  | "spelling_assess" // independent: dictation (hear the word, type it), each word chosen after the last answer
  | "spelling_practice" // one pattern: lesson, then practice
  | "spelling_review" // words due for review (word memory)
  | "spelling_transfer" // unseen words with a practised pattern
  | "guided" // a grammar or vocabulary capability: lesson, then adaptive practice
  | "explore" // any capability, through the existing engine (no teaching)
  | "doubling_journey" // the adaptive consonant-doubling journey: diagnose, teach, guided practice, independent reassessment
  | "check" // a few independent questions on one capability, chosen by the development plan (assess, reassess or a later check)
  | "essay"; // essay-to-mastery (essay-contract@1): essay records, diagnostic questions, lessons, practice and checks

export interface Planned {
  item: string;
  use: EvidenceUse;
}

export interface ProfileEvent {
  kind: "profile";
  id: string;
  at: string;
  name: string;
  /**
   * Who agreed to keep the record, and where it is kept: on this device only, or in a parent's account (the parent
   * agreed when creating the account and again when adding this pupil).
   */
  consent: { by: "learner" | "guardian"; scope: "this_device_only" | "parent_account" };
  app: string;
}

export interface SessionEvent {
  kind: "session";
  id: string;
  at: string;
  session: string;
  type: SessionType;
  /** For a fixed session: every item, in order, and why it is asked. Adaptive sessions choose as they go. */
  queue?: Planned[];
  /** Adaptive sessions: how many items to ask. */
  length?: number;
  capability?: string;
  step?: string;
  lesson?: string;
  /** For a check: why it was asked (a first or another look: "assess"; the fresh check after teaching: "confirm"; a later check: "retention"). */
  purpose?: "assess" | "confirm" | "retention";
  /** Spelling sessions: whether the device could speak when the session began (decides which questions can be asked). */
  speech?: SpeechRecord;
  /** The spelling assessment: who says the words (the device's voice, or an adult reading them aloud). */
  delivery?: "device_voice" | "adult_reader";
  /** An evidence check chosen by the plan: the difficulty of questions that can fill the gap, and why (mastery.ts). */
  target?: EvidenceTarget;
}

/** Which questions an evidence check asks: unused ones in this difficulty range, other spelling patterns first. */
export interface EvidenceTarget {
  atLeast?: number;
  atMost?: number;
  /** Spelling patterns already shown at level: others are preferred (dictation-only diversity). */
  avoidPatterns?: string[];
  why: string;
}

/** Speech as it was when a spelling session began. The voice's name and language only: nothing about the person. */
export interface SpeechRecord {
  /** A local English voice was found on this device. */
  available: boolean;
  /** Hearing words is switched on in Me. */
  enabled: boolean;
  voice: { name: string; lang: string; local: boolean } | null;
}

export interface SessionEndEvent {
  kind: "session_end";
  id: string;
  at: string;
  session: string;
  reason: "finished" | "stopped";
}

export interface LessonEvent {
  kind: "lesson";
  id: string;
  at: string;
  lesson: string;
  checkCorrect: boolean;
}

/**
 * Every attempt at an item. Only the first, unaided attempt in a session becomes evidence (it carries
 * the evidence id); a hint or a second try is assisted practice and never reaches the estimate.
 */
export interface AttemptEvent {
  kind: "attempt";
  id: string;
  at: string;
  session: string;
  item: { id: string; version: number };
  response: Response;
  correct: boolean;
  misconceptions: string[];
  assisted: boolean;
  attempt: number;
  use: EvidenceUse;
  evidence?: string;
}

export interface SettingsEvent {
  kind: "settings";
  id: string;
  at: string;
  speech: boolean;
}

/** Who is learning and what they want from it, as chosen at the start (and changed in "Me"). */
export type LearnerBand = "early" | "school" | "older";
export type LearnerGoal = "confidence" | "grammar" | "spelling" | "reading";

/**
 * The learner's own choices, kept with the record. The goal orders the Journey; neither choice changes a question's
 * difficulty, an estimate or the plan (the answers decide those), and neither adapts wording or content yet.
 */
export interface PreferencesEvent {
  kind: "preferences";
  id: string;
  at: string;
  band: LearnerBand;
  goal: LearnerGoal;
  /**
   * Optional IANA time zone of the pupil or school, for calendar-day rules (calendar.ts). Not written by the app yet;
   * records without it use UTC days. Timestamps themselves stay UTC.
   */
  timeZone?: string;
}

// ------------------------------------------------------------------ decision traces (diagnostics)

/** One candidate the engine weighed: its score parts and reasons, exactly as the engine returned them. */
export interface TracedCandidate {
  item: string;
  capability: string | null;
  difficulty: number | null;
  score: number;
  p: number;
  parts: Record<string, number>;
  reasons: string[];
  /** Alternatives only: why it was not chosen. */
  whyNot?: string;
}

/**
 * Why a question was asked, recorded when it was first shown (never reconstructed afterwards). Durations are not
 * part of the record (it stays the same for the same answers); they are measured separately as telemetry.
 * selector "engine": the engine's own decision (recommend), with what it knew and what it weighed.
 * selector "queue": a fixed list planned when the session started (spelling sessions); the position is recorded.
 * selector "planner": the doubling journey's rule planner (planRule), with its action, diagnosis and reason.
 */
export interface SelectionTrace {
  selector: "engine" | "queue" | "planner";
  /** The pool rule in force: assess, practice, confirm, retention, or the fixed queue. */
  use: string;
  mode?: string;
  schedule?: string;
  path?: string;
  goal?: string;
  target?: { band: number; source: string; note: string };
  /** The estimates of the capabilities in play at that moment (mean, sd, direct answers, stage). */
  knew?: { capability: string; mean: number; sd: number; n: number; stage: string }[];
  /** Questions on the goal's capabilities that could be asked, and how many each rule kept out. */
  candidates?: { eligible: number; unseen: number; excludedReserved: number; excludedPassage: number; excludedSeenWord: number; seen: number };
  chosen?: TracedCandidate;
  alternatives?: TracedCandidate[];
  bankGaps?: { capability: string; suitable: [number, number]; unused: number[]; note: string }[];
  explanation?: string;
  queue?: { position: number; length: number; reason: string };
  /** The spelling assessment: the targeting and coverage rules applied before the engine chose among what was left. */
  spelling?: {
    estimates: { capability: string; mean: number; sd: number }[];
    rule: "follow_up" | "untested_pattern" | "near_estimate" | "widened" | "insufficient" | "stopped" | "evidence_gap";
    reasons: string[];
    window: number;
    testedPatterns: string[];
    followUp?: { misconception: string; after: string };
  };
  planner?: { action: string; itemRole?: string; strategy?: string; diagnosis: string; detail: string; reason: string; policy: string };
  /** An evidence check: the difficulty range it was restricted to, and why (the evidence the plan is collecting). */
  evidenceTarget?: EvidenceTarget;
}

/** What Today offered when a session was started, and which activity was started (recorded at that moment). */
export interface PlanTrace {
  offered: { title: string; kind: string; action: string | null; capability: string | null; priority: number | null; why: string }[];
  started: { type: string; capability?: string; purpose?: string; step?: string };
  /** Index in `offered`, or null when started from Journey, More practice or the onboarding. */
  startedRank: number | null;
  standings: Record<string, string>;
  /** Skills the engine demonstrates but the evidence gate does not yet support: what is missing (C′). Optional: older traces have none. */
  gaps?: Record<string, string>;
  /** The evidence check started, if any: its difficulty range and why. */
  target?: EvidenceTarget;
}

export interface TraceEvent {
  kind: "trace";
  id: string;
  at: string;
  session?: string;
  /** For a selection: the item and the `presented` event it explains. */
  item?: { id: string; version: number };
  presented?: string;
  selection?: SelectionTrace;
  plan?: PlanTrace;
}

export interface FlagEvent {
  kind: "flag";
  id: string;
  at: string;
  item: { id: string; version: number };
  note: string;
}

/** How a session felt, tapped at its end (optional; for the pilot's usability record). */
export type Rating = "too_easy" | "about_right" | "too_hard" | "confusing";
export const RATINGS: Rating[] = ["too_easy", "about_right", "too_hard", "confusing"];

export interface RatingEvent {
  kind: "rating";
  id: string;
  at: string;
  session: string;
  rating: Rating;
}

/** A note from the learner or a guardian: a problem, a question, anything that got in the way. */
export interface NoteEvent {
  kind: "note";
  id: string;
  at: string;
  /** Where it was written (a screen name), so a problem can be traced to a step of the journey. */
  screen: string;
  text: string;
}

/**
 * Spelling practice (logic/spelling.ts): the Spelling Bee's preloaded words, and later a parent's word lists and books.
 * Kept in the learner's own record like everything else (so backups, export and deletion include them), but never
 * evidence for the engine: spelling practice never changes a capability estimate or a mastery claim.
 */
export interface SpellSource {
  /** bank: the preloaded Spelling Bee words; list: a parent's word list; book: words from a parent's book. */
  type: "bank" | "list" | "book";
  id: string;
}
export interface SpellSessionEvent {
  kind: "spell_session";
  id: string;
  at: string;
  session: string;
  source: SpellSource;
  /** The words planned for this session, in order (word ids within the source). */
  words: string[];
  /** The practice level the session was planned at (Spelling Bee levels 1–5), if the source has levels. */
  level?: number;
  delivery: "device_voice" | "adult_reader";
  learningMode?: "learn-recall@1";
  /** Its source was deleted: the word ids are "removed-1", … (logic/scrub.ts). */
  scrubbed?: boolean;
}
export interface SpellAnswerEvent {
  kind: "spell_answer";
  id: string;
  at: string;
  session: string;
  source: SpellSource;
  /** The word as it was asked: its id, its spelling at the time, and its level, if any. */
  word: { id: string; text: string; level?: number };
  response: string;
  correct: boolean;
  /** How many times the word was played (the first playing included); 0 when an adult read it. */
  plays: number;
  /** Asked again because it was misspelt before (a review), not for the first time. */
  review: boolean;
  /** Shown the spelling in this session: practice, never an independent review pass. */
  assisted?: boolean;
  /** Its source was deleted: the word and the answer are removed, right/wrong kept (logic/scrub.ts). */
  scrubbed?: boolean;
}
export interface SpellLearningEvent {
  kind: "spell_learning"; id:string; at:string; session:string; source:SpellSource;
  word:string; action:"study"|"recall"|"hint"|"draft"; response?:string; scrubbed?:boolean;
}
export interface SpellEndEvent {
  kind: "spell_end";
  id: string;
  at: string;
  session: string;
  reason: "finished" | "stopped";
}
/** A parent's word list (My Words, logic/wordlists.ts): the whole list each time it is saved. */
export interface ListWord {
  /** Stable within the list: the word in lower case, so practice history follows the word through edits. */
  id: string;
  word: string;
  variants: string[];
}
export interface WordListEvent {
  kind: "word_list";
  id: string;
  at: string;
  list: { id: string; name: string; words: ListWord[] };
  /** The list was deleted: this saved version's name and words are removed (logic/scrub.ts). */
  scrubbed?: boolean;
}
export interface WordListDeleteEvent {
  kind: "word_list_delete";
  id: string;
  at: string;
  list: string;
}
/** My Books (logic/books.ts): a parent's book text, the activities the parent approved for it, and the answers. */
export interface BookEvent {
  kind: "book";
  id: string;
  at: string;
  /** The whole text each time it is saved (only when the title or text changed). */
  book: { id: string; title: string; text: string };
  /** The book was deleted: this saved version's title and text are removed (logic/scrub.ts). */
  scrubbed?: boolean;
}
export interface BookReviewEvent {
  kind: "book_review";
  id: string;
  at: string;
  book: string;
  /** The fingerprint of the text the parent reviewed: the approvals count only while the text is the same. */
  fingerprint: string;
  /** The activity ids the parent approved; everything else stays hidden from the learner. */
  approved: string[];
  /** The book was deleted: approvals and fingerprint removed (logic/scrub.ts). */
  scrubbed?: boolean;
}
export interface BookAnswerEvent {
  kind: "book_answer";
  id: string;
  at: string;
  book: string;
  question: string;
  response: string;
  correct: boolean;
  /** The book was deleted: the question id is "removed-question-n" and the answer removed (logic/scrub.ts). */
  scrubbed?: boolean;
}
export interface BookDeleteEvent {
  kind: "book_delete";
  id: string;
  at: string;
  book: string;
}
export type SpellEvent = SpellLearningEvent | SpellSessionEvent | SpellAnswerEvent | SpellEndEvent | WordListEvent | WordListDeleteEvent | BookEvent | BookReviewEvent | BookAnswerEvent | BookDeleteEvent;

export type AppEvent = ProfileEvent | SessionEvent | SessionEndEvent | LessonEvent | AttemptEvent | SettingsEvent | PreferencesEvent | FlagEvent | RatingEvent | NoteEvent | TraceEvent | LedgerEvent | SpellEvent;

const LEDGER_KINDS = new Set(["evidence", "proposal", "qualification", "revoke", "presented", "hint", "assisted_response", "intervention", "essay"]);
/** Events the engine's ledger folds: evidence and provenance (presented, hint, assisted_response, intervention), and essay records (never an estimate change). */
export const isLedgerEvent = (e: AppEvent): e is LedgerEvent => LEDGER_KINDS.has(e.kind);
export const isEvidence = (e: AppEvent): e is EvidenceEvent => e.kind === "evidence";

const KINDS = new Set(["profile", "session", "session_end", "lesson", "attempt", "settings", "preferences", "flag", "rating", "note", "trace", "evidence", "presented", "hint", "assisted_response", "intervention", "spell_session", "spell_answer", "spell_end", "spell_learning", "word_list", "word_list_delete", "book", "book_review", "book_answer", "book_delete", "essay"]);
const ITEM_KINDS = new Set(["evidence", "attempt", "presented", "hint", "assisted_response"]);
const SESSION_KINDS = new Set(["evidence", "attempt", "session", "session_end", "presented", "hint", "assisted_response", "intervention", "rating", "spell_session", "spell_answer", "spell_end", "spell_learning", "essay"]);
const ESSAY_RECORDS = new Set(["submission", "analysis", "diagnostic", "journey", "rewrite"]);

/** Structural check of one event (used on import). Proposals and qualifications are not produced by this app. */
export function eventProblem(e: unknown): string | null {
  if (!e || typeof e !== "object") return "an event is not an object";
  const x = e as Record<string, unknown>;
  if (typeof x.kind !== "string" || !KINDS.has(x.kind)) return `unknown event kind ${String(x.kind)}`;
  if (typeof x.id !== "string" || !x.id) return "an event has no id";
  if (typeof x.at !== "string" || Number.isNaN(Date.parse(x.at))) return `event ${x.id} has no valid time`;
  if (ITEM_KINDS.has(x.kind) && (!x.item || typeof (x.item as { id?: unknown }).id !== "string")) return `event ${x.id} names no item`;
  if (SESSION_KINDS.has(x.kind) && typeof x.session !== "string") return `event ${x.id} names no session`;
  if (x.kind === "rating" && !RATINGS.includes(x.rating as Rating)) return `event ${x.id} has an unknown rating`;
  if (x.kind === "note" && (typeof x.text !== "string" || typeof x.screen !== "string")) return `event ${x.id} is a note without text`;
  if (x.kind === "word_list" && (typeof (x.list as { id?: unknown } | undefined)?.id !== "string" || !Array.isArray((x.list as { words?: unknown }).words))) return `event ${x.id} is a word list without words`;
  if (x.kind === "word_list_delete" && typeof x.list !== "string") return `event ${x.id} names no word list`;
  if (x.kind === "book") {
    const b = x.book as { id?: unknown; title?: unknown; text?: unknown } | undefined;
    if (typeof b?.id !== "string" || typeof b.title !== "string" || typeof b.text !== "string") return `event ${x.id} is a book without its text`;
  }
  if (x.kind === "book_review" && (typeof x.book !== "string" || typeof x.fingerprint !== "string" || !Array.isArray(x.approved) || !(x.approved as unknown[]).every((a) => typeof a === "string"))) return `event ${x.id} is a book review without its approvals`;
  if (x.kind === "book_answer" && (typeof x.book !== "string" || typeof x.question !== "string" || typeof x.correct !== "boolean")) return `event ${x.id} is a book answer without its question`;
  if (x.kind === "book_delete" && typeof x.book !== "string") return `event ${x.id} names no book`;
  if (x.kind === "essay") {
    const r = x.record as { type?: unknown } | undefined;
    if (!r || typeof r !== "object" || !ESSAY_RECORDS.has(String(r.type))) return `event ${x.id} is an essay event without a known record`;
  }
  if (x.kind.startsWith("spell_") && x.kind !== "spell_end" && !["bank", "list", "book"].includes((x.source as { type?: string } | undefined)?.type ?? "")) return `event ${x.id} names no spelling source`;
  if(x.kind==="spell_session" && x.learningMode!==undefined && x.learningMode!=="learn-recall@1")return `event ${x.id} has an unknown learning mode`;
  if(x.kind==="spell_answer" && x.assisted!==undefined && typeof x.assisted!=="boolean")return `event ${x.id} has invalid assistance metadata`;
  if (x.kind === "spell_learning" && (typeof x.word !== "string" || !["study","recall","hint","draft"].includes(String(x.action)) || (x.response !== undefined && (typeof x.response !== "string" || x.response.length > 100)))) return `event ${x.id} is an invalid learning action`;
  if (x.kind === "spell_answer" && (typeof (x.word as { id?: unknown } | undefined)?.id !== "string" || typeof x.correct !== "boolean" || typeof x.response !== "string")) return `event ${x.id} is a spelling answer without a word or result`;
  return null;
}
