/**
 * The shared competency graph, with ONE typed relation per pair of competencies (relations@1):
 *
 *   mandatory   the mathematics package's prerequisite graph (content/mathematics, version 1.1.0 by default; 1.0.0
 *               for historical replay). It is the only source of mandatory edges; nothing here restates them.
 *   plausible   a mandatory edge the relation audit keeps, pending educator confirmation.
 *   support     useful supporting knowledge, never a gate: learning additions, or a mandatory edge the audit
 *               re-classifies as support (content/learning/graph-audit.v1.json).
 *   disputed    a mandatory edge the audit finds mathematically unnecessary (proposed for removal; not followed).
 *   trivial     true but uninformative (e.g. "addition within 20" for limits; not followed).
 *   part        conceptual decomposition: a micro-skill is part of a competency (partOf); evidence counts for both.
 * Teaching strategies are not graph edges: they live in the modules (strategy.needs names probe questions).
 *
 * No relation ever gates a learner: modules are open whatever their prerequisites. Relations steer recovery (which
 * supporting skill to check when a learner is stuck) and nothing else. Changing a relation changes recommendations,
 * never recorded evidence (tested). Competency IDs are those of curriculum.v1.json, unchanged.
 */
import curriculum from "../../../content/mathematics/curriculum.v1.json";
import additions from "../../../content/learning/competency-additions.v1.json";
import audit from "../../../content/learning/graph-audit.v1.json";
import { competencyGraph, type GraphVersion } from "../../mathematics/src/prerequisites";

export type RelationType = "mandatory" | "plausible" | "support" | "disputed" | "trivial";
export interface Relation {
  from: string;
  type: RelationType;
  source: `prerequisites@${GraphVersion}` | "audit@1" | "additions@1";
  reason?: string;
}
export interface Competency {
  id: string;
  name: string;
  description?: string;
  strand: string;
  gradeRange: [number, number];
  objectives?: string[];
  /** A micro-skill refines this competency (its evidence also counts there). */
  partOf?: string;
  status: "provisional";
}
export interface RelationOptions {
  /** The mandatory graph version (default 1.1.0). */
  version?: GraphVersion;
  /** Apply the relation audit (default true). */
  audit?: boolean;
}

const base: Competency[] = curriculum.competencies.map((c) => ({ id: c.id, name: c.name, description: c.description, strand: c.strand, gradeRange: c.gradeRange as [number, number], objectives: c.objectives, status: "provisional" }));
const extra: Competency[] = additions.competencies.map((c) => {
  const parent = base.find((b) => b.id === c.partOf);
  if (!parent) throw new Error(`Addition ${c.id}: unknown parent ${c.partOf}`);
  return { id: c.id, name: c.name, strand: parent.strand, gradeRange: c.gradeRange as [number, number], objectives: c.objectives, partOf: c.partOf, status: "provisional" };
});
const all = [...base, ...extra];
const byId = new Map(all.map((c) => [c.id, c]));
const children = new Map<string, string[]>();
for (const c of extra) children.set(c.partOf!, [...(children.get(c.partOf!) ?? []), c.id]);

const known = (id: string, where: string) => {
  if (!byId.has(id)) throw new Error(`${where}: unknown competency ${id}`);
};
const auditByPair = new Map<string, { classification: RelationType; reason: string }>();
for (const e of audit.edges) {
  known(e.target, "audit");
  known(e.source, "audit");
  auditByPair.set(`${e.target}<${e.source}`, { classification: e.classification as RelationType, reason: e.reason });
}

const cache = new Map<string, Map<string, Relation[]>>();
/** Every relation into each competency, one per pair, for a graph version (with or without the audit). */
export function relations(opts: RelationOptions = {}): Map<string, Relation[]> {
  const version = opts.version ?? "1.1.0";
  const useAudit = opts.audit ?? true;
  const key = `${version}:${useAudit}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const out = new Map<string, Relation[]>();
  const put = (target: string, r: Relation) => {
    const list = out.get(target) ?? [];
    if (list.some((x) => x.from === r.from)) return; // one relation per pair: the first (stronger) source wins
    list.push(r);
    out.set(target, list);
  };
  for (const n of competencyGraph(version)) {
    for (const p of n.prerequisites) {
      const a = useAudit ? auditByPair.get(`${n.id}<${p}`) : undefined;
      put(n.id, a ? { from: p, type: a.classification, source: "audit@1", reason: a.reason } : { from: p, type: "mandatory", source: `prerequisites@${version}` });
    }
  }
  for (const s of additions.supports) {
    known(s.competency, "supports");
    for (const id of s.supports) {
      known(id, "supports");
      put(s.competency, { from: id, type: "support", source: "additions@1", reason: s.note });
    }
  }
  cache.set(key, out);
  return out;
}
const FOLLOWED: RelationType[] = ["mandatory", "plausible", "support"];

export const graph = {
  version: `${curriculum.version}+prerequisites@1.1.0+audit@${audit.version}+additions@${additions.version}`,
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
  /** Relations into a competency (all types). */
  relationsOf: (id: string, opts?: RelationOptions) => relations(opts).get(id) ?? [],
  /** What recovery may check when a learner is stuck on this competency: mandatory, plausible and support edges. */
  supportsOf: (id: string, opts?: RelationOptions) => (relations(opts).get(id) ?? []).filter((r) => FOLLOWED.includes(r.type)).sort((a, b) => FOLLOWED.indexOf(a.type) - FOLLOWED.indexOf(b.type)).map((r) => r.from),
  /** The mathematics package's mandatory prerequisites (no audit applied). */
  prerequisitesOf: (id: string, version: GraphVersion = "1.1.0") => competencyGraph(version).find((n) => n.id === id)?.prerequisites ?? [],
};

/** Breadth-first walk over followed relations, with cycle detection and a depth limit; returns [id, depth, via]. */
export function walkSupports(start: string, maxDepth: number, opts?: RelationOptions): { id: string; depth: number; via: string | null; type: RelationType }[] {
  const seen = new Set([start]);
  const out: { id: string; depth: number; via: string | null; type: RelationType }[] = [];
  let frontier: string[] = [start];
  for (let depth = 1; depth <= maxDepth && frontier.length; depth++) {
    const next: string[] = [];
    for (const f of frontier)
      for (const s of graph.supportsOf(f, opts)) {
        if (seen.has(s)) continue; // a cycle or a shared support: visit once
        seen.add(s);
        out.push({ id: s, depth, via: f, type: graph.relationsOf(f, opts).find((r) => r.from === s)!.type });
        next.push(s);
      }
    frontier = next;
  }
  return out;
}

/** Mandatory ancestors in a graph version (cycle-safe). */
export function ancestors(id: string, version: GraphVersion = "1.1.0"): Set<string> {
  const out = new Set<string>();
  const stack = [...graph.prerequisitesOf(id, version)];
  while (stack.length) {
    const p = stack.pop()!;
    if (out.has(p)) continue;
    out.add(p);
    stack.push(...graph.prerequisitesOf(p, version));
  }
  return out;
}
