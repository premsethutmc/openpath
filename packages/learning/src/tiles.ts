/**
 * The learner-specific tile projection of the shared graph. The hierarchy comes from the curriculum, at any depth:
 *
 *   subject → unit (when the book groups chapters) → chapter → section → subsection … → skill → micro-skills
 *
 * e.g. Mathematics → Calculus → Integrals → Techniques of integration → Integrate by substitution and parts →
 * {Integrate by substitution, Integrate by parts}. The same competency keeps one id and one evidence record wherever it
 * appears (two sections, two curricula, a goal): its tiles always show the same status.
 *
 * Colours (with a label and an icon, never colour alone):
 *   green   verified mastery: only the shared engine's verification (never on provisional content)
 *   blue    shown on your own (independent; transfer if also on a new kind of problem); not yet verified
 *   orange  active learning: exposure, guided practice, or a review after a missed delayed check
 *   grey    not started, or no learning content yet
 *
 * Mastery (the colour) and progress (the fill) are separate measurements. A skill's progress is its milestones
 * (explored, practised, shown on your own, delayed check passed). A parent's (aggregate@2) is over its CONSTITUENT
 * competencies: the distinct skills anywhere below it that have learning content, each counted once —
 *   green   only if every constituent skill is verified
 *   blue    if every constituent skill is shown or verified
 *   orange  if any constituent skill has records
 *   grey    otherwise (or "no learning content yet" when no skill below has any)
 *   fill    constituent skills shown or verified ÷ constituent skills with content.
 * A full orange bar is still orange: progress never becomes mastery by itself.
 *
 * Content is shown honestly: a skill with a complete module (Explore → Strategy → Chapter → Practise → Verify) can be
 * learned; one whose module is incomplete says what is missing; one with no content says "No learning content yet"
 * and is never counted or shown as a module. Each skill also carries its module's educator-review state.
 */
import { assigned, type Chapter, type CurriculumRelease, type Outcome, type Section, type SourceRef } from "./curriculum";
import { moduleFor, moduleOrigin, question } from "./content";
import type { SkillEvidence } from "./evidence";
import { graph } from "./graph";
import { activeRegistry, reviewOf } from "./review";
import { validateModule } from "./validate";

export type TileStatus = "verified" | "shown" | "active" | "not_started" | "no_questions";
export type TileKind = "subject" | "unit" | "chapter" | "section" | "skill" | "micro" | "proposal" | "unsupported";
/** What learning content a skill has (content@1). */
export interface TileContent {
  level: "module" | "partial" | "none";
  label: string;
  missing: string[];
  origin: "authored" | "synthesised" | null;
  review: string;
}
export interface Tile {
  id: string;
  kind: TileKind;
  title: string;
  subtitle?: string;
  competency?: string;
  children: Tile[];
  status: TileStatus;
  label: string;
  icon: string;
  progress: { done: number; total: number; verified: number };
  objectives: string[];
  evidence: string[];
  assessable: boolean;
  strategies: string[];
  curriculumRefs: SourceRef[];
  goalRefs: string[];
  review?: boolean;
  retention?: SkillEvidence["retention"];
  content?: TileContent;
  /** Other ways to do this skill's work, and where it leads further (never prerequisites). */
  alternatives?: string[];
  enrichment?: string[];
}
export const AGGREGATION_POLICY = "aggregate@2";
const LOOK: Record<TileStatus, { label: string; icon: string }> = {
  verified: { label: "Verified", icon: "✓" },
  shown: { label: "Shown on your own", icon: "★" },
  active: { label: "Learning", icon: "◐" },
  not_started: { label: "Not started", icon: "○" },
  no_questions: { label: "No learning content yet", icon: "–" },
};
const REVIEW_LABEL: Record<string, string> = { draft: "Draft: not yet submitted for educator review", submitted: "Awaiting educator review", changes_requested: "Changes requested by an educator", approved: "Approved by an educator, not yet released", released: "Educator-reviewed and released", rejected: "Rejected by an educator", missing: "Not in the review registry" };

const contentCache = new Map<string, TileContent>();
/** The learning content a skill has (content@1): a validated module, an incomplete one, practice questions only, or none. */
let cachedFor: unknown = null;
export function contentOf(id: string): TileContent {
  // the review state is part of what a tile says: a newly loaded registry (the server's) starts afresh
  if (cachedFor !== activeRegistry()) {
    contentCache.clear();
    cachedFor = activeRegistry();
  }
  const hit = contentCache.get(id);
  if (hit) return hit;
  const m = moduleFor(id);
  const micro = !!graph.byId.get(id)?.partOf;
  let c: TileContent;
  if (m) {
    const missing = validateModule(m);
    const r = reviewOf(id);
    c = { level: missing.length ? "partial" : "module", label: missing.length ? "Some learning content (incomplete module)" : "Learning module", missing, origin: moduleOrigin(id), review: REVIEW_LABEL[r.state] + (r.stale ? " (changed since review)" : "") };
  } else if (micro && moduleFor(graph.evidenceTarget(id))) {
    // a micro-skill is practised inside its parent's module when some of its questions are about it
    const parent = moduleFor(graph.evidenceTarget(id))!;
    const ids = [...parent.diagnostics, ...parent.practice, ...parent.transfer, ...parent.retention, ...parent.strategies.flatMap((s) => [s.guided, s.check])];
    const own = ids.some((q) => question(q).skill === id);
    c = own ? { level: "module", label: `Practised in ${graph.get(graph.evidenceTarget(id)).name}`, missing: [], origin: moduleOrigin(graph.evidenceTarget(id)), review: REVIEW_LABEL[reviewOf(graph.evidenceTarget(id)).state] } : { level: "none", label: "No learning content yet", missing: ["no questions on this step"], origin: null, review: "" };
  } else c = { level: "none", label: "No learning content yet", missing: ["no module"], origin: null, review: "" };
  contentCache.set(id, c);
  return c;
}

function leaf(id: string, kind: "skill" | "micro", ev: (id: string) => SkillEvidence, refs: SourceRef[], goalRefs: string[], title?: string): Tile {
  const c = graph.get(id);
  const e = ev(id);
  const content = contentOf(id);
  const assessable = content.level !== "none";
  const status: TileStatus = !assessable && e.status === "not_started" ? "no_questions" : e.status === "verified" ? "verified" : e.status === "independent" || e.status === "transfer" ? "shown" : e.status === "not_started" ? "not_started" : "active";
  const kids = graph.childrenOf(id).map((k) => leaf(k, "micro", ev, refs, goalRefs));
  // a skill with its own module: its milestones (explored, practised, shown on your own, delayed check passed)
  const milestones = [e.attempts.length > 0, e.assisted.right + e.independent.right > 0, status === "shown" || status === "verified", e.retention === "passed"];
  return {
    id: `${kind}:${id}`,
    kind,
    title: title ?? c.name,
    competency: id,
    children: kids,
    status,
    label: e.status === "review" ? "Review needed" : e.status === "transfer" ? "Shown on your own, also on new problems" : LOOK[status].label,
    icon: e.status === "review" ? "↻" : LOOK[status].icon,
    progress: kids.length && !moduleFor(id) ? { done: kids.filter((k) => k.status === "shown" || k.status === "verified").length, total: kids.filter((k) => k.assessable).length, verified: kids.filter((k) => k.status === "verified").length } : { done: milestones.filter(Boolean).length, total: 4, verified: status === "verified" ? 1 : 0 },
    objectives: c.objectives ?? [],
    evidence: e.attempts,
    assessable,
    strategies: moduleFor(id)?.strategies.map((s) => s.title) ?? [],
    curriculumRefs: refs,
    goalRefs,
    review: e.status === "review",
    retention: e.retention,
    content,
    alternatives: graph.alternativesOf(id).map((a) => graph.get(a.id).name),
    enrichment: graph.enrichmentOf(id).map((a) => graph.get(a.id).name),
  };
}

/** The distinct skills (with learning content) anywhere below a set of tiles: a parent's constituent competencies. */
function constituents(children: Tile[]): Tile[] {
  const out = new Map<string, Tile>();
  const walk = (ts: Tile[]) => {
    for (const t of ts) {
      if (t.kind === "skill" || t.kind === "micro") {
        const key = t.competency ?? t.id;
        if (t.assessable && !out.has(key)) out.set(key, t);
      } else walk(t.children);
    }
  };
  walk(children);
  return [...out.values()];
}

/** Aggregate a parent from its constituent competencies (aggregate@2). Direct children that are skills count as
 * themselves, so for one level this is the same as aggregate@1. */
export function aggregate(id: string, kind: Tile["kind"], title: string, children: Tile[], extra: Partial<Tile> = {}): Tile {
  const scored = constituents(children);
  const status: TileStatus = !scored.length ? "no_questions" : scored.every((c) => c.status === "verified") ? "verified" : scored.every((c) => c.status === "verified" || c.status === "shown") ? "shown" : scored.some((c) => c.status === "active" || c.status === "shown" || c.status === "verified") ? "active" : "not_started";
  return {
    id, kind, title, children, status, label: LOOK[status].label, icon: LOOK[status].icon,
    progress: { done: scored.filter((c) => c.status === "shown" || c.status === "verified").length, total: scored.length, verified: scored.filter((c) => c.status === "verified").length },
    objectives: [], evidence: children.flatMap((c) => c.evidence), assessable: scored.length > 0, strategies: [], curriculumRefs: children.flatMap((c) => c.curriculumRefs).slice(0, 1), goalRefs: [...new Set(children.flatMap((c) => c.goalRefs))],
    ...extra,
  };
}

/** The tiles of one reviewed curriculum, for one learner. `goalOf` marks skills a long-term goal builds on. */
export function tilesFor(release: CurriculumRelease, ev: (id: string) => SkillEvidence, goalOf: (competency: string) => string[] = () => []): Tile[] {
  const rows = assigned(release);
  return release.subjects.map((s) => {
    const outcomeTiles = (ch: Chapter, node: Chapter | Section, refBase: SourceRef): Tile[] => {
      const seen = new Set<string>();
      const kids: Tile[] = [];
      for (const o of node.outcomes as Outcome[]) {
        const accepted = o.mapping.competencies.filter((m) => m.status === "accepted");
        if (o.mapping.verdict === "unsupported") {
          kids.push({ id: `unsupported:${o.id}`, kind: "unsupported", title: o.text, subtitle: `${s.name} is not supported yet`, children: [], status: "no_questions", label: "Not supported yet", icon: "–", progress: { done: 0, total: 0, verified: 0 }, objectives: [], evidence: [], assessable: false, strategies: [], curriculumRefs: [{ ...refBase, pages: o.pages }], goalRefs: [] });
          continue;
        }
        if (!accepted.length && o.mapping.proposal) {
          kids.push({ id: `proposal:${o.mapping.proposal.id}`, kind: "proposal", title: o.text, subtitle: "Not in the OpenPath skill map yet (a provisional proposal)", children: [], status: "no_questions", label: "Not mapped yet", icon: "?", progress: { done: 0, total: 0, verified: 0 }, objectives: [], evidence: [], assessable: false, strategies: [], curriculumRefs: [{ ...refBase, pages: o.pages }], goalRefs: [] });
          continue;
        }
        for (const m of accepted) {
          if (seen.has(m.id)) continue; // the same skill twice in one place is one tile
          seen.add(m.id);
          kids.push(leaf(m.id, "skill", ev, rows.filter((r) => r.competency === m.id).map((r) => ({ textbook: release.title, chapter: r.chapter.title, pages: r.outcome.pages })), goalOf(m.id)));
        }
      }
      for (const sec of node.sections ?? []) {
        const ref = { textbook: release.title, chapter: ch.title, pages: sec.pages };
        const inner = outcomeTiles(ch, sec, ref);
        // a section with no skills anywhere below it (an introduction, a summary) is not a tile: nothing to learn there
        if (!inner.length) continue;
        kids.push(aggregate(`section:${release.id}:${sec.id}`, "section", sec.title.startsWith(sec.number) ? sec.title : `${sec.number} ${sec.title}`, inner, { subtitle: sec.pages ? `pp. ${sec.pages}` : undefined, curriculumRefs: [ref] }));
      }
      return kids;
    };
    const chapterTile = (ch: Chapter) => {
      const ref = { textbook: release.title, chapter: ch.title, pages: ch.pages };
      return aggregate(`chapter:${release.id}:${ch.id}`, "chapter", ch.title, outcomeTiles(ch, ch, ref), { subtitle: ch.pages ? `pp. ${ch.pages}` : undefined, curriculumRefs: [ref] });
    };
    // chapters grouped into the book's units (in book order); chapters outside a unit stay at the top level
    const top: Tile[] = [];
    for (const ch of s.chapters) {
      if (!ch.unit) {
        top.push(chapterTile(ch));
        continue;
      }
      const uid = `unit:${release.id}:${ch.unit.id}`;
      const last = top.at(-1);
      if (last?.id === uid) last.children.push(chapterTile(ch));
      else top.push({ id: uid, kind: "unit", title: ch.unit.title, children: [chapterTile(ch)] } as Tile);
    }
    const children = top.map((t) => (t.kind === "unit" ? aggregate(t.id, "unit", t.title, t.children, { subtitle: `Unit ${s.chapters.find((c) => c.unit && `unit:${release.id}:${c.unit.id}` === t.id)!.unit!.number}` }) : t));
    return aggregate(`subject:${s.id}`, "subject", s.name, children, s.supported === false ? { subtitle: s.unsupportedReason } : {});
  });
}

/** Walk a path of tile ids down the tree (for navigation and tests). */
export function tileAt(tiles: Tile[], path: string[]): Tile | null {
  let level = tiles;
  let found: Tile | null = null;
  for (const id of path) {
    found = level.find((t) => t.id === id) ?? null;
    if (!found) return null;
    level = found.children;
  }
  return found;
}
export const flatten = (tiles: Tile[]): Tile[] => tiles.flatMap((t) => [t, ...flatten(t.children)]);
