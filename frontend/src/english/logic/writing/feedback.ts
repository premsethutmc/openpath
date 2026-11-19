/**
 * AI feedback on a guided writing task (writing-feedback@1). The server holds the key, the prompt and the limits
 * (backend/family/writing_feedback.py); this is the app's side: when the button may be offered, and the calls.
 *
 * It is offered only for a signed-in parent account, where the server says it is switched on, after the parent has
 * agreed for this learner, and only once the free on-device check finds nothing left to fix and the length is
 * right, so that an unfinished piece never uses one of the week's three.
 */
import type { Api } from "../account.ts";
import type { Target, WritingCheck } from "./check.ts";

export interface FeedbackStatus {
  available: boolean;
  consent: boolean;
  limit: number;
  left: number;
}
export type Met = "yes" | "partly" | "no";
export interface Feedback {
  points: { met: Met; note: string }[];
  /** What a grown-up looks for in this task: one per point, in order. */
  look: string[];
  strength: string;
  next: string;
  left: number;
}
export interface FeedbackService {
  status(): Promise<FeedbackStatus>;
  agree(granted: boolean): Promise<void>;
  ask(task: string, text: string, checked: string[]): Promise<Feedback>;
}

/** The model may take a while: longer than an ordinary request, but never for ever. */
export const FEEDBACK_TIMEOUT_MS = 45_000;

export function serviceFor(api: Pick<Api, "request">, pupil: string): FeedbackService {
  const path = `/pupils/${pupil}/writing-feedback/`;
  return {
    status: () => api.request<FeedbackStatus>("GET", path),
    agree: async (granted) => void (await api.request("POST", `${path}consent/`, { granted })),
    ask: (task, text, checked) => api.request<Feedback>("POST", path, { task, text, checked }, FEEDBACK_TIMEOUT_MS),
  };
}

/** Why AI feedback cannot be asked for yet, in the learner's words; null when it can. */
export function notReady(check: WritingCheck | null, target: Target): string | null {
  if (!check) return "Check your writing first.";
  if (check.words < target.min) return `Write at least ${target.min} words first.`;
  if (check.words > target.max) return `Cut it to ${target.max} words or fewer first.`;
  const fixes = check.notes.filter((n) => n.level === "fix").length;
  if (fixes) return `Fix the ${fixes === 1 ? "point" : `${fixes} points`} marked ✏️ above first, then check again.`;
  return null;
}

export const MARK: Record<Met, string> = { yes: "✓", partly: "~", no: "✗" };
export const MET_WORD: Record<Met, string> = { yes: "Yes", partly: "Partly", no: "Not yet" };
export const AI_LIMIT = "This feedback is written by an AI model. It can be wrong: the grown-up beside you decides.";
export const CONSENT_TEXT = "For a parent: I agree that this learner's writing may be sent to an AI model to get feedback. Names of people are not sent by the app, e-mail addresses and phone numbers are removed, and the writing is not kept.";
