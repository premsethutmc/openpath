/**
 * Educator review (review@2): two kinds of reviewable content, each version-locked by a hash.
 *
 *   family:<id>        a question FAMILY: its whole specification (spec.ts): generation constraints, answer validator,
 *                      misconception options, difficulty classes, wording, examples. Locked by its fingerprint.
 *   module:<skill>     a learning MODULE's teaching: chapter, strategies, the questions it lists, the family it draws
 *                      further questions from. Locked by its content hash.
 *
 *   draft ──submit──▶ submitted ──approve (an educator)──▶ approved ──release (a release manager)──▶ released
 *                         │◀──────────── request changes / reject (an educator) ─────┘
 *   any change of content ──▶ the stored decision no longer applies: the item is a draft again (it is stale)
 *
 * What a release makes count as VALIDATED evidence in the shared engine's content gate:
 *   - a generated question (gen:…): only if its FAMILY is released at the current fingerprint AND the question is in
 *     the family's release pool (inside the approved domain and passing validation; spec.ts, families.ts pool)
 *   - a hand-written question: only if its MODULE is released at the current content hash
 * A module can be released only when every family it uses is released. Approval needs the educator role and a
 * reviewer who is not the author; release needs the release-manager role. The registry is kept by the server
 * (backend/family/content_review.py: who, when, which version); content/learning/review.v1.json is the repository's
 * own copy for development, in which nothing is approved.
 */
import registryData from "../../../content/learning/review.v1.json";
import { moduleOrigin, modules, type Module } from "./content";
import { hashOf } from "./curriculum";
import { exposureKey, FAMILIES, inPool } from "./families";
import { moduleQuestions } from "./library";
import { familySpec } from "./spec";

export type ReviewState = "draft" | "submitted" | "changes_requested" | "rejected" | "approved" | "released";
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
  kind?: "module" | "family";
  competency: string;
  family?: string;
  version?: string;
  origin: "authored" | "synthesised" | "family";
  author: string;
  contentHash: string;
  state: ReviewState;
  history: ReviewEvent[];
  releasedAt?: string;
}
export interface Registry {
  schema: "content-review@1" | "content-review@2";
  note: string;
  entries: ReviewEntry[];
}

export const contentHashOf = (m: Module) => hashOf({ ...m, provenance: undefined });
export const registry = registryData as unknown as Registry;
export const itemOf = (competency: string) => `module:${competency}`;
export const familyItem = (id: string) => `family:${id}`;
const fingerprints = ((globalThis as { __openpathFingerprints?: Map<string, string> }).__openpathFingerprints ??= new Map<string, string>());
/** The current fingerprint of a family's specification (computed once). */
export const fingerprintOf = (fam: string) => {
  let f = fingerprints.get(fam);
  if (!f) fingerprints.set(fam, (f = familySpec(fam)?.fingerprint ?? ""));
  return f;
};
/** TEST ONLY: forget computed fingerprints (after a test changes a generator). */
export const resetFingerprints = () => fingerprints.clear();
/** The current hash of a reviewable item, or null if it no longer exists. */
export function currentHash(item: string): string | null {
  if (item.startsWith("family:")) return FAMILIES.get(item.slice(7))?.domain ? fingerprintOf(item.slice(7)) : null;
  const m = modules.find((x) => itemOf(x.competency) === item);
  return m ? contentHashOf(m) : null;
}

/** The state that applies now: the stored one, or draft if the content changed after it was reviewed. */
export function effectiveState(e: ReviewEntry | undefined, m?: Module | null): ReviewState | "missing" {
  if (!e) return "missing";
  const h = m ? contentHashOf(m) : currentHash(e.item);
  if (h === null) return "missing";
  return e.contentHash === h ? e.state : "draft";
}
export const stale = (e: ReviewEntry, m?: Module) => e.contentHash !== (m ? contentHashOf(m) : currentHash(e.item));
export const reviewOf = (competency: string, reg: Registry = activeRegistry()) => {
  const e = reg.entries.find((x) => x.item === itemOf(competency));
  const m = modules.find((x) => x.competency === competency) ?? null;
  return { entry: e ?? null, state: m ? effectiveState(e, m) : "missing", stale: !!(e && m && stale(e, m)) };
};
export const familyReviewOf = (fam: string, reg: Registry = activeRegistry()) => {
  const e = reg.entries.find((x) => x.item === familyItem(fam));
  return { entry: e ?? null, state: effectiveState(e), stale: !!(e && stale(e)) };
};

// the registry in use: the repository's, or the server's (the app loads it at start: useServerRegistry)
const G = globalThis as { __openpathActiveRegistry?: Registry | null };
export const activeRegistry = (): Registry => G.__openpathActiveRegistry ?? registry;
export function setActiveRegistry(reg: Registry | null) {
  G.__openpathActiveRegistry = reg;
}

export class ReviewError extends Error {}
const event = (e: ReviewEntry, state: ReviewState, by: string, role: ReviewerRole, at: string, note?: string): ReviewEntry => ({ ...e, state, history: [...e.history, { state, by, role, at, contentHash: e.contentHash, ...(note ? { note } : {}) }] });

/** A new module entry (draft), or the existing one brought up to date: a changed module goes back to draft. */
export function sync(e: ReviewEntry | undefined, m: Module, author: string, at: string): ReviewEntry {
  const h = contentHashOf(m);
  if (!e) return { item: itemOf(m.competency), kind: "module", competency: m.competency, origin: moduleOrigin(m.competency) ?? "authored", author, contentHash: h, state: "draft", history: [{ state: "draft", by: "content pipeline", role: "engineer", at, contentHash: h, note: "added" }] };
  return resync(e, h, at);
}
/** A new family entry (draft), or the existing one brought up to date: a changed specification goes back to draft. */
export function syncFamily(e: ReviewEntry | undefined, fam: string, at: string): ReviewEntry {
  const spec = familySpec(fam)!;
  if (!e) return { item: familyItem(fam), kind: "family", competency: spec.competency, family: fam, version: spec.version, origin: "family", author: "OpenPath engineering (generator code, written with AI assistance)", contentHash: spec.fingerprint, state: "draft", history: [{ state: "draft", by: "content pipeline", role: "engineer", at, contentHash: spec.fingerprint, note: "added" }] };
  return { ...resync(e, spec.fingerprint, at), version: spec.version };
}
function resync(e: ReviewEntry, h: string, at: string): ReviewEntry {
  if (e.contentHash === h) return e;
  return { ...e, contentHash: h, state: "draft", releasedAt: undefined, history: [...e.history, { state: "draft", by: "content pipeline", role: "engineer", at, contentHash: h, note: "content changed: earlier review no longer applies (a family's generator change needs reapproval)" }] };
}
export function submit(e: ReviewEntry, by: string, at: string, validation: string[]): ReviewEntry {
  if (e.state !== "draft" && e.state !== "changes_requested") throw new ReviewError(`${e.item} is ${e.state}; only a draft can be submitted`);
  if (validation.length) throw new ReviewError(`${e.item} does not validate: ${validation.join("; ")}`);
  return event(e, "submitted", by, "engineer", at, "submitted for educator review");
}
export function decide(e: ReviewEntry, reviewer: { by: string; role: ReviewerRole }, decision: "approve" | "request_changes" | "reject", at: string, note: string): ReviewEntry {
  if (e.state !== "submitted") throw new ReviewError(`${e.item} is ${e.state}; only a submitted item can be reviewed`);
  if (reviewer.role !== "educator") throw new ReviewError("Only an educator can approve, reject or request changes.");
  if (!reviewer.by.trim() || reviewer.by.trim() === e.author.trim()) throw new ReviewError("The reviewer must be named, and must not be the item's author.");
  if (!note.trim()) throw new ReviewError("A review needs a note: what was checked.");
  return event(e, decision === "approve" ? "approved" : decision === "reject" ? "rejected" : "changes_requested", reviewer.by, "educator", at, note);
}
/** The families a module depends on: its pool and every generated question it lists. */
export function familiesOf(m: Module): string[] {
  const listed = Object.values(moduleQuestions(m)).flat().filter((id) => id.startsWith("gen:")).map((id) => id.split(":")[1]);
  return [...new Set([...(m.pool ? [m.pool.family] : []), ...listed])];
}
export function release(e: ReviewEntry, by: string, at: string, reg: Registry = activeRegistry(), role: ReviewerRole = "release-manager"): ReviewEntry {
  if (e.state !== "approved") throw new ReviewError(`${e.item} is ${e.state}; only an approved item can be released`);
  if (role !== "release-manager") throw new ReviewError("Only a release manager can release content.");
  if (e.item.startsWith("module:")) {
    const m = modules.find((x) => itemOf(x.competency) === e.item);
    const missing = m ? familiesOf(m).filter((f) => familyReviewOf(f, reg).state !== "released") : [];
    if (missing.length) throw new ReviewError(`${e.item} uses families that are not released yet: ${missing.join(", ")}`);
  }
  return { ...event(e, "released", by, "release-manager", at), releasedAt: at };
}

/**
 * When a question became validated content (its release time), or undefined if it is not released. Generated
 * questions need their family released at the current fingerprint and must be in the family's release pool;
 * hand-written ones need their module released unchanged.
 */
export function releaseOf(qid: string, reg: Registry = activeRegistry()): string | undefined {
  if (qid.startsWith("gen:")) {
    const fam = qid.split(":")[1];
    const r = familyReviewOf(fam, reg);
    return r.state === "released" && r.entry?.releasedAt && inPool(qid) ? r.entry.releasedAt : undefined;
  }
  for (const e of reg.entries) {
    if (!e.item.startsWith("module:") || !e.releasedAt) continue;
    const m = modules.find((x) => itemOf(x.competency) === e.item);
    if (!m || effectiveState(e, m) !== "released") continue;
    if (Object.values(moduleQuestions(m)).flat().map(exposureKey).includes(exposureKey(qid))) return e.releasedAt;
  }
  return undefined;
}
