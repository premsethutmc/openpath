/**
 * The learner-specific tile projection of the shared graph: subject → chapter → skill → micro-skills (and deeper, if
 * the graph has it: there is no depth limit). The same competency appears once per tile tree and keeps one id and one
 * evidence record whatever curriculum or goal shows it.
 *
 * Colours (with a label and an icon, never colour alone):
 *   green   verified mastery: only the shared engine's verification (never on provisional content)
 *   blue    shown on your own (independent; transfer if also on a new kind of problem); not yet verified
 *   orange  active learning: exposure, guided practice, or a review after a missed delayed check
 *   grey    not started (or no questions yet)
 *
 * Parent aggregation (aggregate@1): green only if every assessable child is green; blue if every assessable child is
 * blue or green; orange if any child has records; grey otherwise. Progress = assessable children shown or verified ÷
 * assessable children. A full orange bar is still orange: it never becomes green by itself.
 */
import { assigned, type CurriculumRelease, type SourceRef } from "./curriculum";
import { moduleFor, questions } from "./content";
import type { SkillEvidence } from "./evidence";
import { graph } from "./graph";

export type TileStatus = "verified" | "shown" | "active" | "not_started" | "no_questions";
export interface Tile {
  id: string;
  kind: "subject" | "chapter" | "skill" | "micro" | "proposal";
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
}
export const AGGREGATION_POLICY = "aggregate@1";
const LOOK: Record<TileStatus, { label: string; icon: string }> = {
  verified: { label: "Verified", icon: "✓" },
  shown: { label: "Shown on your own", icon: "★" },
  active: { label: "Learning", icon: "◐" },
  not_started: { label: "Not started", icon: "○" },
  no_questions: { label: "No questions yet", icon: "–" },
};
const hasQuestions = (id: string) => !!moduleFor(id) || questions.some((q) => q.skill === id && q.role !== "challenge");

function leaf(id: string, kind: "skill" | "micro", ev: (id: string) => SkillEvidence, refs: SourceRef[], goalRefs: string[], title?: string): Tile {
  const c = graph.get(id);
  const e = ev(id);
  const assessable = hasQuestions(id);
  const status: TileStatus = !assessable && e.status === "not_started" ? "no_questions" : e.status === "verified" ? "verified" : e.status === "independent" || e.status === "transfer" ? "shown" : e.status === "not_started" ? "not_started" : "active";
  const kids = graph.childrenOf(id).map((k) => leaf(k, "micro", ev, refs, goalRefs));
  // a skill with its own module: its milestones (explored, practised, shown on your own, delayed check passed);
  // otherwise its child skills
  const milestones = [e.attempts.length > 0, e.assisted.right + e.independent.right > 0, status === "shown" || status === "verified", e.retention === "passed"];
  const t: Tile = {
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
  };
  return t;
}

/** Aggregate a parent from its children (aggregate@1). */
export function aggregate(id: string, kind: Tile["kind"], title: string, children: Tile[], extra: Partial<Tile> = {}): Tile {
  const scored = children.filter((c) => c.assessable);
  const status: TileStatus = !scored.length ? "no_questions" : scored.every((c) => c.status === "verified") ? "verified" : scored.every((c) => c.status === "verified" || c.status === "shown") ? "shown" : children.some((c) => c.status === "active" || c.status === "shown" || c.status === "verified") ? "active" : "not_started";
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
    const chapters = s.chapters.map((ch) => {
      const seen = new Set<string>();
      const kids: Tile[] = [];
      for (const o of ch.outcomes) {
        const accepted = o.mapping.competencies.filter((m) => m.status === "accepted");
        if (!accepted.length && o.mapping.proposal) {
          kids.push({ id: `proposal:${o.mapping.proposal.id}`, kind: "proposal", title: o.text, subtitle: "Not in the OpenPath skill map yet (a provisional proposal)", children: [], status: "no_questions", label: "Not mapped yet", icon: "?", progress: { done: 0, total: 0, verified: 0 }, objectives: [], evidence: [], assessable: false, strategies: [], curriculumRefs: [{ textbook: release.title, chapter: ch.title, pages: o.pages }], goalRefs: [] });
          continue;
        }
        for (const m of accepted) {
          if (seen.has(m.id)) continue; // the same skill twice in a chapter is one tile
          seen.add(m.id);
          kids.push(leaf(m.id, "skill", ev, rows.filter((r) => r.competency === m.id).map((r) => ({ textbook: release.title, chapter: r.chapter.title, pages: r.outcome.pages })), goalOf(m.id)));
        }
      }
      return aggregate(`chapter:${release.id}:${ch.id}`, "chapter", ch.title, kids, { subtitle: ch.pages ? `pp. ${ch.pages}` : undefined, curriculumRefs: [{ textbook: release.title, chapter: ch.title, pages: ch.pages }] });
    });
    return aggregate(`subject:${s.id}`, "subject", s.name, chapters);
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
