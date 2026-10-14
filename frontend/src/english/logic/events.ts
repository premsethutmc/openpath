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
 * The learner's own choices, kept with the record. The goal orders the Journey; neither choice changes a question's
 * difficulty, an estimate or the plan (the answers decide those), and neither adapts wording or content yet.
 */
export interface PreferencesEvent {
  kind: "preferences";
  id: string;
  at: string;
  band: LearnerBand;
  goal: LearnerGoal;
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
  planner?: { action: string; itemRole?: string; strategy?: string; diagnosis: string; detail: string; reason: string; policy: string };
}

/** What Today offered when a session was started, and which activity was started (recorded at that moment). */
export interface PlanTrace {
  offered: { title: string; kind: string; action: string | null; capability: string | null; priority: number | null; why: string }[];
  started: { type: string; capability?: string; purpose?: string; step?: string };
  /** Index in `offered`, or null when started from Journey, More practice or the onboarding. */
  startedRank: number | null;
  standings: Record<string, string>;
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

export type AppEvent = ProfileEvent | SessionEvent | SessionEndEvent | LessonEvent | AttemptEvent | SettingsEvent | PreferencesEvent | FlagEvent | TraceEvent | LedgerEvent;

const LEDGER_KINDS = new Set(["evidence", "proposal", "qualification", "revoke", "presented", "hint", "assisted_response", "intervention"]);
/** Events the engine's ledger folds: evidence and provenance (presented, hint, assisted_response, intervention). */
export const isLedgerEvent = (e: AppEvent): e is LedgerEvent => LEDGER_KINDS.has(e.kind);
export const isEvidence = (e: AppEvent): e is EvidenceEvent => e.kind === "evidence";

const KINDS = new Set(["profile", "session", "session_end", "lesson", "attempt", "settings", "preferences", "flag", "trace", "evidence", "presented", "hint", "assisted_response", "intervention"]);
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
