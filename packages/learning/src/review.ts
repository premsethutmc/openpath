/**
 * The educator-review registry (review@1, content/learning/review.v1.json): every learning module, hand-written or
 * synthesised, with its content hash, provenance and review state.
 *
 *   draft ──submit──▶ submitted ──approve (an educator)──▶ approved ──release──▶ released
 *                         │◀──────request changes (an educator)───┘
 *   any content change ──▶ the stored state no longer applies: the module is a draft again (stale)
 *
 * Only a RELEASED module whose content still matches its reviewed hash makes its questions count as validated in the
 * shared engine's content gate (so that they can contribute to verified mastery). Approval must be by a person with
 * the educator role who is not the module's author; this code records who, and refuses otherwise. Nothing in this
 * repository has been approved: no educator has reviewed any module.
 */
import registryData from "../../../content/learning/review.v1.json";
import { moduleOrigin, modules, type Module } from "./content";
import { hashOf } from "./curriculum";
import { moduleQuestions } from "./library";

export type ReviewState = "draft" | "submitted" | "changes_requested" | "approved" | "released";
export type ReviewerRole = "author" | "engineer" | "educator" | "release-manager";
export interface ReviewEvent {
  state: ReviewState;
  by: string;
  role: ReviewerRole;
  at: string;
  contentHash: string;
  note?: string;
}
export interface ReviewEntry {
  item: string;
  competency: string;
  origin: "authored" | "synthesised";
  author: string;
  contentHash: string;
  state: ReviewState;
  history: ReviewEvent[];
  releasedAt?: string;
}
export interface Registry {
  schema: "content-review@1";
  note: string;
  entries: ReviewEntry[];
}

export const contentHashOf = (m: Module) => hashOf({ ...m, provenance: undefined });
export const registry = registryData as unknown as Registry;
export const itemOf = (competency: string) => `module:${competency}`;

/** The state that applies now: the stored one, or draft if the module changed after it was reviewed. */
export function effectiveState(e: ReviewEntry | undefined, m: Module | null): ReviewState | "missing" {
  if (!e || !m) return "missing";
  return e.contentHash === contentHashOf(m) ? e.state : "draft";
}
export const stale = (e: ReviewEntry, m: Module) => e.contentHash !== contentHashOf(m);
export const reviewOf = (competency: string, reg: Registry = registry) => {
  const m = modules.find((x) => x.competency === competency) ?? null;
  const e = reg.entries.find((x) => x.item === itemOf(competency));
  return { entry: e ?? null, state: effectiveState(e, m), stale: !!(e && m && stale(e, m)) };
};

export class ReviewError extends Error {}
const event = (e: ReviewEntry, state: ReviewState, by: string, role: ReviewerRole, at: string, note?: string): ReviewEntry => ({ ...e, state, history: [...e.history, { state, by, role, at, contentHash: e.contentHash, ...(note ? { note } : {}) }] });

/** A new entry (draft), or the existing one brought up to date: a changed module goes back to draft. */
export function sync(e: ReviewEntry | undefined, m: Module, author: string, at: string): ReviewEntry {
  const h = contentHashOf(m);
  if (!e) return { item: itemOf(m.competency), competency: m.competency, origin: moduleOrigin(m.competency) ?? "authored", author, contentHash: h, state: "draft", history: [{ state: "draft", by: "content pipeline", role: "engineer", at, contentHash: h, note: "added" }] };
  if (e.contentHash === h) return e;
  return { ...e, contentHash: h, state: "draft", releasedAt: undefined, history: [...e.history, { state: "draft", by: "content pipeline", role: "engineer", at, contentHash: h, note: "content changed: earlier review no longer applies" }] };
}
export function submit(e: ReviewEntry, by: string, at: string, validation: string[]): ReviewEntry {
  if (e.state !== "draft" && e.state !== "changes_requested") throw new ReviewError(`${e.item} is ${e.state}; only a draft can be submitted`);
  if (validation.length) throw new ReviewError(`${e.item} does not validate: ${validation.join("; ")}`);
  return event(e, "submitted", by, "engineer", at, "submitted for educator review");
}
export function decide(e: ReviewEntry, reviewer: { by: string; role: ReviewerRole }, decision: "approve" | "request_changes", at: string, note: string): ReviewEntry {
  if (e.state !== "submitted") throw new ReviewError(`${e.item} is ${e.state}; only a submitted module can be reviewed`);
  if (reviewer.role !== "educator") throw new ReviewError("Only an educator can approve or request changes.");
  if (!reviewer.by.trim() || reviewer.by.trim() === e.author.trim()) throw new ReviewError("The reviewer must be named, and must not be the module's author.");
  if (!note.trim()) throw new ReviewError("A review needs a note: what was checked.");
  return event(e, decision === "approve" ? "approved" : "changes_requested", reviewer.by, "educator", at, note);
}
export function release(e: ReviewEntry, by: string, at: string): ReviewEntry {
  if (e.state !== "approved") throw new ReviewError(`${e.item} is ${e.state}; only an approved module can be released`);
  return { ...event(e, "released", by, "release-manager", at), releasedAt: at };
}

/** Questions of released, unchanged modules, with their release time: the content gate treats only these as validated. */
export function releasedQuestions(reg: Registry = registry): Map<string, string> {
  const out = new Map<string, string>();
  for (const e of reg.entries) {
    const m = modules.find((x) => x.competency === e.competency);
    if (!m || effectiveState(e, m) !== "released" || !e.releasedAt) continue;
    for (const id of Object.values(moduleQuestions(m)).flat()) out.set(id, e.releasedAt);
  }
  return out;
}
