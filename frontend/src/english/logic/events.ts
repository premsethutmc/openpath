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
  | "explore"; // any capability, through the existing engine (no teaching)

export interface Planned {
  item: string;
  use: EvidenceUse;
}

export interface ProfileEvent {
  kind: "profile";
  id: string;
  at: string;
  name: string;
  /** Who agreed to keep the record on this device, and that it stays here. */
  consent: { by: "learner" | "guardian"; scope: "this_device_only" };
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

export type AppEvent = ProfileEvent | SessionEvent | SessionEndEvent | LessonEvent | AttemptEvent | SettingsEvent | FlagEvent | RatingEvent | NoteEvent | LedgerEvent;

export const isLedgerEvent = (e: AppEvent): e is LedgerEvent => e.kind === "evidence" || e.kind === "proposal" || e.kind === "qualification" || e.kind === "revoke";
export const isEvidence = (e: AppEvent): e is EvidenceEvent => e.kind === "evidence";

const KINDS = new Set(["profile", "session", "session_end", "lesson", "attempt", "settings", "flag", "rating", "note", "evidence"]);

/** Structural check of one event (used on import). Proposals and qualifications are not produced by this app. */
export function eventProblem(e: unknown): string | null {
  if (!e || typeof e !== "object") return "an event is not an object";
  const x = e as Record<string, unknown>;
  if (typeof x.kind !== "string" || !KINDS.has(x.kind)) return `unknown event kind ${String(x.kind)}`;
  if (typeof x.id !== "string" || !x.id) return "an event has no id";
  if (typeof x.at !== "string" || Number.isNaN(Date.parse(x.at))) return `event ${x.id} has no valid time`;
  if ((x.kind === "evidence" || x.kind === "attempt") && (!x.item || typeof (x.item as { id?: unknown }).id !== "string")) return `event ${x.id} names no item`;
  if ((x.kind === "evidence" || x.kind === "attempt" || x.kind === "session" || x.kind === "session_end" || x.kind === "rating") && typeof x.session !== "string") return `event ${x.id} names no session`;
  if (x.kind === "rating" && !RATINGS.includes(x.rating as Rating)) return `event ${x.id} has an unknown rating`;
  if (x.kind === "note" && (typeof x.text !== "string" || typeof x.screen !== "string")) return `event ${x.id} is a note without text`;
  return null;
}
