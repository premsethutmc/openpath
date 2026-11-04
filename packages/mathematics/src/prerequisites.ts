import inventory from "../../../content/mathematics/curriculum.v1.json";
import patch from "../../../content/mathematics/graphs/prerequisites.v1.1.json";
export { patch as prerequisitePatch };
export type GraphVersion = "1.0.0" | "1.1.0";
export const activeGraphVersion: GraphVersion = "1.1.0";
type InventoryNode = (typeof inventory.competencies)[number];
export type GraphNode = Omit<
  InventoryNode,
  "prerequisites" | "rootJustification"
> & { prerequisites: string[]; rootJustification: string | null };
/** Mandatory edges are separate from the frozen curriculum inventory and its unapproved teaching proposals. */
export function graphErrors(nodes: readonly GraphNode[]): string[] {
  const errors: string[] = [],
    map = new Map(nodes.map((n) => [n.id, n]));
  if (map.size !== nodes.length) errors.push("Duplicate competency ID");
  const active = new Set<string>(),
    done = new Set<string>();
  function visit(id: string) {
    if (active.has(id)) {
      errors.push(`Cycle: ${id}`);
      return;
    }
    if (done.has(id)) return;
    const n = map.get(id);
    if (!n) {
      errors.push(`Missing: ${id}`);
      return;
    }
    active.add(id);
    if (!n.prerequisites.length && !n.rootJustification)
      errors.push(`Unjustified root: ${id}`);
    for (const p of n.prerequisites) visit(p);
    active.delete(id);
    done.add(id);
  }
  nodes.forEach((n) => visit(n.id));
  return [...new Set(errors)];
}
/** Fail closed on a stale patch or a bad intermediate graph; never mutate source nodes or learner records. */
export function applyPrerequisiteCorrections(
  nodes: readonly GraphNode[] = inventory.competencies,
) {
  let result = structuredClone([...nodes]);
  const initial = graphErrors(result);
  if (initial.length) throw Error(initial.join("; "));
  const checks = [];
  for (const change of patch.corrections) {
    const beforeErrors = graphErrors(result);
    if (beforeErrors.length) throw Error(beforeErrors.join("; "));
    const n = result.find((n) => n.id === change.capability);
    if (
      !n ||
      JSON.stringify(n.prerequisites) !== JSON.stringify(change.before) ||
      !n.prerequisites.includes(change.removeRequires)
    )
      throw Error(`Stale prerequisite patch: ${change.capability}`);
    const candidate = result.map((n) =>
      n.id === change.capability
        ? {
            ...n,
            prerequisites: n.prerequisites.filter(
              (id) => id !== change.removeRequires,
            ),
            rootJustification: change.rootJustification,
          }
        : n,
    );
    const afterErrors = graphErrors(candidate);
    if (afterErrors.length) throw Error(afterErrors.join("; "));
    checks.push({
      capability: change.capability,
      before: [...n.prerequisites],
      after: [
        ...candidate.find((n) => n.id === change.capability)!.prerequisites,
      ],
      beforeErrors,
      afterErrors,
      addedMandatoryEdges: 0,
      idsPreserved: true,
    });
    result = candidate;
  }
  return { nodes: result, checks };
}
export function competencyGraph(
  version: GraphVersion = activeGraphVersion,
): GraphNode[] {
  if (version === "1.0.0") return structuredClone(inventory.competencies);
  if (version === "1.1.0") return applyPrerequisiteCorrections().nodes;
  throw Error("Unsupported mathematics prerequisite graph version");
}
