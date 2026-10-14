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
  | "spelling_check" // independent: which spelling patterns need work (generated words, so practice-only)
  | "spelling_practice" // one pattern: lesson, then practice
  | "spelling_review" // words due for review (word memory)
  | "spelling_transfer" // unseen words with a practised pattern
  | "guided" // a grammar or vocabulary capability: lesson, then adaptive practice
  | "explore" // any capability, through the existing engine (no teaching)
  | "doubling_journey" // the adaptive consonant-doubling journey: diagnose, teach, guided practice, independent reassessment
  | "check"; // a few independent questions on one capability, chosen by the development plan (assess, reassess or a later check)

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
 * The learner's own choices. They shape the wording and which strand the Journey shows first. They never change a
 * question's difficulty, an estimate or the plan: the answers decide those.
 */
export interface PreferencesEvent {
  kind: "preferences";
  id: string;
  at: string;
  band: LearnerBand;
  goal: LearnerGoal;
}

export interface FlagEvent {
  kind: "flag";
  id: string;
  at: string;
  item: { id: string; version: number };
  note: string;
}

export type AppEvent = ProfileEvent | SessionEvent | SessionEndEvent | LessonEvent | AttemptEvent | SettingsEvent | PreferencesEvent | FlagEvent | LedgerEvent;

const LEDGER_KINDS = new Set(["evidence", "proposal", "qualification", "revoke", "presented", "hint", "assisted_response", "intervention"]);
/** Events the engine's ledger folds: evidence and provenance (presented, hint, assisted_response, intervention). */
export const isLedgerEvent = (e: AppEvent): e is LedgerEvent => LEDGER_KINDS.has(e.kind);
export const isEvidence = (e: AppEvent): e is EvidenceEvent => e.kind === "evidence";

const KINDS = new Set(["profile", "session", "session_end", "lesson", "attempt", "settings", "preferences", "flag", "evidence", "presented", "hint", "assisted_response", "intervention"]);
const ITEM_KINDS = new Set(["evidence", "attempt", "presented", "hint", "assisted_response"]);
const SESSION_KINDS = new Set(["evidence", "attempt", "session", "session_end", "presented", "hint", "assisted_response", "intervention"]);

/** Structural check of one event (used on import). Proposals and qualifications are not produced by this app. */
export function eventProblem(e: unknown): string | null {
  if (!e || typeof e !== "object") return "an event is not an object";
  const x = e as Record<string, unknown>;
  if (typeof x.kind !== "string" || !KINDS.has(x.kind)) return `unknown event kind ${String(x.kind)}`;
  if (typeof x.id !== "string" || !x.id) return "an event has no id";
  if (typeof x.at !== "string" || Number.isNaN(Date.parse(x.at))) return `event ${x.id} has no valid time`;
  if (ITEM_KINDS.has(x.kind) && (!x.item || typeof (x.item as { id?: unknown }).id !== "string")) return `event ${x.id} names no item`;
  if (SESSION_KINDS.has(x.kind) && typeof x.session !== "string") return `event ${x.id} names no session`;
  return null;
}
