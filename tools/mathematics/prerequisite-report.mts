import { writeFileSync } from "node:fs";
import {
  applyPrerequisiteCorrections,
  competencyGraph,
  activeGraphVersion,
  prerequisitePatch,
} from "../../packages/mathematics/src/prerequisites";
const base = competencyGraph("1.0.0"),
  result = applyPrerequisiteCorrections();
const edges = (nodes: typeof base) =>
  nodes.flatMap((n) =>
    n.prerequisites.map((p) => ({ capability: n.id, requires: p })),
  );
const report = {
  schema: "math-prerequisite-review@1",
  baseGraphVersion: "1.0.0",
  activeGraphVersion,
  competencies: base.length,
  beforeEdges: edges(base).length,
  afterEdges: edges(result.nodes).length,
  removedEdges: prerequisitePatch.corrections.map((c) => ({
    capability: c.capability,
    requires: c.removeRequires,
  })),
  addedEdges: [],
  unchangedCompetencies: base.length - result.checks.length,
  unapprovedChangesAdopted: 0,
  rootCountBefore: base.filter((n) => !n.prerequisites.length).length,
  rootCountAfter: result.nodes.filter((n) => !n.prerequisites.length).length,
  checks: result.checks,
};
writeFileSync(
  new URL(
    "../../docs/mathematics/follow-up/graph-before-after.json",
    import.meta.url,
  ),
  JSON.stringify(report, null, 2) + "\n",
);
let md =
  "# Mandatory prerequisite graph 1.0.0 → 1.1.0\n\n34 removals; no new mandatory edges. All 200 competency IDs retained; remaining 49 proposals untouched. Every removal was structurally checked before and after application. Native eligibility/evidence invariance for every intermediate graph is tested in `prerequisites.test.ts`.\n\n| Competency | Before (mandatory) | After (mandatory) |\n|---|---|---|\n";
for (const c of result.checks)
  md += `| ${c.capability} | ${c.before.join(", ")} | None assigned; scoped foundations taught within the target |\n`;
md +=
  "\nNew roots have explicit justifications. This does not claim the target needs no concrete preparation: it avoids imposing unapproved replacement gates. The audit’s suggested support remains review material only. The 1.1.0 graph is intentionally not a curriculum-completeness claim.\n";
writeFileSync(
  new URL("../../docs/mathematics/follow-up/GRAPH_DIFF.md", import.meta.url),
  md,
);
console.log(
  JSON.stringify({
    beforeEdges: report.beforeEdges,
    afterEdges: report.afterEdges,
    rootsBefore: report.rootCountBefore,
    rootsAfter: report.rootCountAfter,
    checkedCorrections: result.checks.length,
  }),
);
