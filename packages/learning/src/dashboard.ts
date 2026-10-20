/**
 * The Mathematics curriculum dashboard (dashboard@1): a pure, light projection over data that already exists.
 *
 * Nothing here decides curriculum, coverage or mastery. It reads three things and keeps them apart:
 *   structure  the board release (chapters → sections at any depth → mapped competencies → micro-skills), exactly as
 *              boards@1 releases it: the same stable ids, the same accepted mappings, one scope per board;
 *   coverage   the coverage compiler's class for each curriculum outcome (content/learning/coverage-matrix.v1.json)
 *              and the content-review registry's state for each module and family (a generated question is never
 *              approved content until an educator approves and a release manager releases it);
 *   mastery    the learner's evidence from the shared engine (evidence.ts: two right unaided answers, then a delayed
 *              check at least seven full days later), mapped to five display states.
 *
 * Roll-ups are over UNIQUE competency ids (and unique outcome ids for coverage): a competency that appears in two
 * sections or two chapters is one record and counts once in every total above it. Percentages are never averaged
 * from tiles. Verified completion and assessment coverage are separate numbers and are never combined.
 *
 * This module imports no content (no families, no modules): it runs on the per-release index the build writes
 * (scripts/dashboard-data.ts) so the first screen loads fast; learner evidence and question previews load later.
 */

export const DASHBOARD_POLICY = "dashboard@1";

// ---------------------------------------------------------------- the per-release index (written at build time)

export type NodeKind = "chapter" | "section" | "competency" | "micro" | "unsupported" | "proposal";
export interface DashNode {
  /** The stable id: the tile id My Learning Year uses (chapter:<release>:<id>, section:<release>:<id>, skill:<id>). */
  id: string;
  kind: NodeKind;
  title: string;
  subtitle?: string;
  /** For competency and micro nodes: the graph id. The same id is the same evidence record wherever it appears. */
  competency?: string;
  /** The curriculum outcomes placed directly at this node (chapter or section). */
  outcomes?: string[];
  children: DashNode[];
}
export type CoverageClass = "validated" | "awaiting" | "partial" | "unsupported" | "not-implemented";
export interface DashOutcome {
  id: string;
  text: string;
  class: CoverageClass;
  why: string;
  competencies: string[];
  /** The outcome asks for a method, proof, construction or drawing that an educator marks (a written task serves it). */
  method: boolean;
  written: string[];
}
export interface DashFamily {
  id: string;
  title: string;
  type: string;
  /** The review item and the content hash it is locked to (a changed generator goes back to draft). */
  fingerprint: string;
  problems: number;
}
export interface DashModule {
  title: string;
  origin: "authored" | "synthesised" | null;
  hash: string;
  complete: boolean;
  missing: string[];
  strategies: string[];
  counts: { diagnostics: number; practice: number; transfer: number; retention: number };
  /** A few question ids for an educator preview (loaded on demand, never all at once). */
  sample: string[];
}
export interface DashCompetency {
  id: string;
  name: string;
  description: string;
  strand: string;
  grades: [number, number];
  /** What it builds on: mandatory prerequisites and plausible ones (the graph's audited relations). */
  prerequisites: { id: string; type: "mandatory" | "plausible" }[];
  micro: string[];
  /** Where its evidence is recorded (a micro-skill's evidence is its parent's). */
  evidenceTarget: string;
  module: DashModule | null;
  families: DashFamily[];
  written: { id: string; kind: string; prompt: string }[];
  /** compiler@1: how it is assessed, and whether every engineering criterion is met (review is separate). */
  mode: "automatic" | "educator-marked";
  complete: boolean;
  missing: string[];
}
export interface DashRelease {
  schema: "dashboard-index@1";
  release: { id: string; version: string; hash: string; grade: number; board: "cbse" | "tn"; boardLabel: string; title: string; sourceVerified: boolean };
  nodes: DashNode[];
  outcomes: Record<string, DashOutcome>;
  competencies: Record<string, DashCompetency>;
  /** Names of competencies referenced (prerequisites) that are not mapped in this release. */
  names: Record<string, string>;
}
export interface DashIndexEntry {
  board: "cbse" | "tn";
  grade: number;
  release: string;
  version: string;
  file: string;
  chapters: number;
  competencies: string[];
  outcomes: number;
}
export interface DashIndex {
  schema: "dashboard-index@1";
  generated: { families: number; problems: number; writtenTasks: number; requirements: number; modules: number };
  releases: DashIndexEntry[];
}

// ---------------------------------------------------------------- review state (mirrors review.ts effectiveState)

export type ReviewState = "draft" | "submitted" | "changes_requested" | "rejected" | "approved" | "released" | "missing";
export interface RegistryLike {
  entries: { item: string; state: Exclude<ReviewState, "missing">; contentHash: string }[];
}
/** The state that applies now: the stored one, or draft if the content changed after it was reviewed. */
export function reviewState(reg: RegistryLike | null, item: string, hash: string | null): ReviewState {
  const e = reg?.entries.find((x) => x.item === item);
  if (!e || hash === null) return "missing";
  return e.contentHash === hash ? e.state : "draft";
}
export const REVIEW_WORD: Record<ReviewState, string> = {
  draft: "Not yet submitted for educator review",
  submitted: "Awaiting educator review",
  changes_requested: "Changes requested by an educator",
  rejected: "Rejected by an educator",
  approved: "Approved by an educator, not yet released",
  released: "Educator-approved and released",
  missing: "Not in the review registry",
};

// ---------------------------------------------------------------- mastery display states

export type Mastery = "not_assessed" | "learning" | "pending" | "verified" | "review";
/** What the engine says about one competency for one learner (from evidence.ts, computed in the learner chunk). */
export interface LearnerSkill {
  /** evidence.ts Status */
  status: "not_started" | "exposure" | "guided" | "independent" | "transfer" | "review" | "verified";
  retention: "none" | "scheduled" | "due" | "passed" | "failed";
  retentionDueAt: string | null;
  attempts: number;
  /** A written answer for this competency was marked right by an educator (method@1). */
  methodMarked: boolean;
  /** A written answer is waiting for an educator's mark. */
  methodPending: boolean;
}
export const MASTERY_WORD: Record<Mastery, string> = {
  not_assessed: "Not assessed",
  learning: "Learning",
  pending: "Shown, awaiting verification",
  verified: "Verified",
  review: "Review needed",
};
export const MASTERY_ICON: Record<Mastery, string> = { not_assessed: "○", learning: "◐", pending: "◔", verified: "✓", review: "↻" };

/**
 * The display state of one competency (method@1). Green ("verified") only when the shared engine has verified it —
 * which already needs independent answers AND a delayed check seven full days later — and, when this curriculum's
 * outcome asks for a method that an educator marks, a written answer marked right as well. Final answers alone never
 * turn a method outcome green. Opening a module or finishing a lesson is exposure at most.
 */
export function masteryOf(s: LearnerSkill | undefined, methodRequired: boolean): Mastery {
  if (!s || s.status === "not_started") return "not_assessed";
  if (s.status === "review") return "review";
  if (s.status === "verified") return methodRequired && !s.methodMarked ? "pending" : "verified";
  if (s.status === "independent" || s.status === "transfer") return "pending";
  return "learning";
}

// ---------------------------------------------------------------- structure helpers (computed once per release)

const memo = new WeakMap<DashNode, { competencies: string[]; outcomes: string[] }>();
/** The unique competency ids and outcome ids anywhere below a node (micro-skills count through their parent). */
export function scopeOf(n: DashNode): { competencies: string[]; outcomes: string[] } {
  const hit = memo.get(n);
  if (hit) return hit;
  const cs = new Set<string>();
  const os = new Set<string>();
  const walk = (x: DashNode) => {
    if (x.kind === "competency" && x.competency) cs.add(x.competency);
    for (const o of x.outcomes ?? []) os.add(o);
    if (x.kind !== "competency") x.children.forEach(walk);
  };
  walk(n);
  const out = { competencies: [...cs], outcomes: [...os] };
  memo.set(n, out);
  return out;
}
/** Unique over several nodes (a grade: all its chapters). */
export function scopeOfAll(ns: DashNode[]): { competencies: string[]; outcomes: string[] } {
  const cs = new Set<string>();
  const os = new Set<string>();
  for (const n of ns) {
    const s = scopeOf(n);
    s.competencies.forEach((c) => cs.add(c));
    s.outcomes.forEach((o) => os.add(o));
  }
  return { competencies: [...cs], outcomes: [...os] };
}

/**
 * Does this release ask for an educator-marked method FROM this competency? Yes when one of its outcomes here is served
 * by a written task (a proof, construction, explanation or sketch) that belongs to this competency. A written task of
 * another competency on the same outcome (Euclid's lemma proved beside an HCF calculation) asks the method of that one.
 */
export function methodRequired(r: DashRelease, competency: string): boolean {
  const own = new Set((r.competencies[competency]?.written ?? []).map((w) => w.id));
  return Object.values(r.outcomes).some((o) => o.method && o.competencies.includes(competency) && o.written.some((w) => own.has(w)));
}
/** Every competency of a release that methodRequired() says yes to (computed once per release). */
export function methodCompetencies(r: DashRelease): Set<string> {
  return new Set(Object.keys(r.competencies).filter((c) => methodRequired(r, c)));
}

export interface MasteryRollup {
  total: number;
  counts: Record<Mastery, number>;
  /** verified ÷ total unique competencies, 0–100 (whole percent, rounded down so 99.6 % is never shown as 100 %). */
  verifiedPct: number;
  state: Mastery;
}
/** Mastery over unique competencies. With no learner, everything is not assessed. */
export function masteryRollup(competencies: string[], skillOf: (id: string) => Mastery): MasteryRollup {
  const counts: Record<Mastery, number> = { not_assessed: 0, learning: 0, pending: 0, verified: 0, review: 0 };
  for (const c of new Set(competencies)) counts[skillOf(c)]++;
  const total = new Set(competencies).size;
  const state: Mastery = !total ? "not_assessed" : counts.verified === total ? "verified" : counts.review ? "review" : counts.learning || counts.pending || counts.verified ? (counts.pending + counts.verified === total ? "pending" : "learning") : "not_assessed";
  return { total, counts, verifiedPct: total ? Math.floor((100 * counts.verified) / total) : 0, state };
}

export interface CoverageRollup {
  total: number;
  counts: Record<CoverageClass, number>;
  /** Outcomes whose every part has an assessment the compiler accepts (awaiting review or validated) ÷ outcomes. */
  assessedPct: number;
  /** Outcomes whose content is educator-approved and released (validated) ÷ outcomes. */
  approvedPct: number;
}
export function coverageRollup(r: DashRelease, outcomes: string[]): CoverageRollup {
  const counts: Record<CoverageClass, number> = { validated: 0, awaiting: 0, partial: 0, unsupported: 0, "not-implemented": 0 };
  const ids = [...new Set(outcomes)];
  for (const o of ids) {
    const row = r.outcomes[o];
    counts[row ? row.class : "not-implemented"]++;
  }
  const total = ids.length;
  return { total, counts, assessedPct: total ? Math.floor((100 * (counts.awaiting + counts.validated)) / total) : 0, approvedPct: total ? Math.floor((100 * counts.validated) / total) : 0 };
}

/** What a competency has to offer, for its tile's content indicator. */
export function contentOf(c: DashCompetency | undefined): { learn: boolean; assess: boolean; written: boolean; label: string } {
  if (!c) return { learn: false, assess: false, written: false, label: "No content yet" };
  const learn = !!c.module;
  const assess = !!c.module && (c.module.counts.retention > 0 || c.module.counts.practice > 0);
  const written = c.written.length > 0;
  return { learn, assess, written, label: learn ? (c.module!.complete ? "Module and assessment" : "Module (incomplete)") : written ? "Written tasks only" : "No content yet" };
}

/** Find a node by id (depth-first). */
export function findNode(ns: DashNode[], id: string): DashNode | null {
  for (const n of ns) {
    if (n.id === id) return n;
    const k = findNode(n.children, id);
    if (k) return k;
  }
  return null;
}
/** The path of nodes from the top down to id (for breadcrumbs and back navigation). */
export function pathTo(ns: DashNode[], id: string, trail: DashNode[] = []): DashNode[] | null {
  for (const n of ns) {
    const t = [...trail, n];
    if (n.id === id) return t;
    const k = pathTo(n.children, id, t);
    if (k) return k;
  }
  return null;
}

// ---------------------------------------------------------------- display order (presentation only)

/**
 * A viewer's display order for one level of tiles. It is presentation only: it never changes the release, its
 * mappings, prerequisites or anyone's evidence. Unknown ids are ignored, new nodes keep book order after the ordered
 * ones, so a curriculum update can never be hidden by a saved order.
 */
export function ordered<T extends { id: string }>(nodes: T[], order: string[] | undefined): T[] {
  if (!order?.length) return nodes;
  const pos = new Map(order.map((id, i) => [id, i]));
  const known = nodes.filter((n) => pos.has(n.id)).sort((a, b) => pos.get(a.id)! - pos.get(b.id)!);
  return [...known, ...nodes.filter((n) => !pos.has(n.id))];
}
export function move(ids: string[], id: string, by: -1 | 1): string[] {
  const i = ids.indexOf(id);
  const j = i + by;
  if (i < 0 || j < 0 || j >= ids.length) return ids;
  const out = [...ids];
  [out[i], out[j]] = [out[j], out[i]];
  return out;
}
