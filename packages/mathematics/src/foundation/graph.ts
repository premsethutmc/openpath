import base from "../../../../content/mathematics/curriculum.v1.json";
import audit from "../../../../content/mathematics/foundation/graph-audit.v1.json";
export { audit };
/** A proposed teaching-navigation view only. Native registration and historical evidence keep v1 IDs/policy. */
export const developmentalGraph = base.competencies.map((n) => {
  const change = audit.revisions.find((r) => r.id === n.id);
  return { ...n, prerequisites: change?.prerequisites ?? n.prerequisites };
});
export function validateDevelopmentalGraph() {
  const map = new Map(developmentalGraph.map((n) => [n.id, n]));
  const visiting = new Set<string>(),
    visited = new Set<string>();
  function walk(id: string) {
    if (visiting.has(id)) throw Error("Cycle: " + id);
    if (visited.has(id)) return;
    const n = map.get(id);
    if (!n) throw Error("Missing prerequisite: " + id);
    visiting.add(id);
    n.prerequisites.forEach(walk);
    visiting.delete(id);
    visited.add(id);
  }
  developmentalGraph.forEach((n) => walk(n.id));
  for (const r of audit.revisions)
    if (!r.prerequisites.length && !r.rootJustification)
      throw Error("Unexplained root");
  return {
    nodes: map.size,
    edges: developmentalGraph.reduce((s, n) => s + n.prerequisites.length, 0),
    audited: audit.revisions.length,
    proposedRefinements: audit.proposedRefinements.length,
  };
}
