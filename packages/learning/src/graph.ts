/**
 * The shared competency graph: the 200 competencies of content/mathematics/curriculum.v1.json (unchanged), plus the
 * provisional additions of content/learning/competency-additions.v1.json (micro-skills, and "supports" edges for
 * recovery navigation). Traversal is cycle-safe and depth-limited.
 */
import curriculum from "../../../content/mathematics/curriculum.v1.json";
import additions from "../../../content/learning/competency-additions.v1.json";

export interface Competency {
  id: string;
  name: string;
  description?: string;
  strand: string;
  gradeRange: [number, number];
  prerequisites: string[];
  objectives?: string[];
  /** A micro-skill refines this competency (its evidence also counts there). */
  partOf?: string;
  status: "provisional";
}

const base: Competency[] = curriculum.competencies.map((c) => ({ id: c.id, name: c.name, description: c.description, strand: c.strand, gradeRange: c.gradeRange as [number, number], prerequisites: c.prerequisites, objectives: c.objectives, status: "provisional" }));
const extra: Competency[] = additions.competencies.map((c) => {
  const parent = base.find((b) => b.id === c.partOf);
  if (!parent) throw new Error(`Addition ${c.id}: unknown parent ${c.partOf}`);
  return { id: c.id, name: c.name, strand: parent.strand, gradeRange: c.gradeRange as [number, number], prerequisites: [], objectives: c.objectives, partOf: c.partOf, status: "provisional" };
});

const all = [...base, ...extra];
const byId = new Map(all.map((c) => [c.id, c]));
const children = new Map<string, string[]>();
for (const c of extra) children.set(c.partOf!, [...(children.get(c.partOf!) ?? []), c.id]);
const supports = new Map<string, string[]>();
for (const s of additions.supports) {
  for (const id of [s.competency, ...s.supports]) if (!byId.has(id)) throw new Error(`supports: unknown competency ${id}`);
  supports.set(s.competency, s.supports);
}

export const graph = {
  version: `${curriculum.version}+additions@${additions.version}`,
  competencies: all,
  byId,
  get: (id: string): Competency => {
    const c = byId.get(id);
    if (!c) throw new Error(`Unknown competency ${id}`);
    return c;
  },
  /** Micro-skills that refine a competency. */
  childrenOf: (id: string) => children.get(id) ?? [],
  /** The competency a micro-skill belongs to (itself for a competency). */
  evidenceTarget: (id: string) => byId.get(id)?.partOf ?? id,
  /** Teaching-navigation supports (recovery), falling back to the v1 prerequisites. */
  supportsOf: (id: string) => supports.get(id) ?? byId.get(id)?.prerequisites ?? [],
  prerequisitesOf: (id: string) => byId.get(id)?.prerequisites ?? [],
};

/** Breadth-first walk over supports, with cycle detection and a depth limit; returns [id, depth, via] in order. */
export function walkSupports(start: string, maxDepth: number): { id: string; depth: number; via: string | null }[] {
  const seen = new Set([start]);
  const out: { id: string; depth: number; via: string | null }[] = [];
  let frontier: { id: string; via: string | null }[] = [{ id: start, via: null }];
  for (let depth = 1; depth <= maxDepth && frontier.length; depth++) {
    const next: { id: string; via: string | null }[] = [];
    for (const f of frontier)
      for (const s of graph.supportsOf(f.id)) {
        if (seen.has(s)) continue; // a cycle or a shared support: visit once
        seen.add(s);
        out.push({ id: s, depth, via: f.id });
        next.push({ id: s, via: f.id });
      }
    frontier = next;
  }
  return out;
}

/** v1 prerequisite ancestors (cycle-safe). */
export function ancestors(id: string): Set<string> {
  const out = new Set<string>();
  const stack = [...graph.prerequisitesOf(id)];
  while (stack.length) {
    const p = stack.pop()!;
    if (out.has(p)) continue;
    out.add(p);
    stack.push(...graph.prerequisitesOf(p));
  }
  return out;
}
