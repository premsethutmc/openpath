/**
 * Mathematics teaching-content inventory (read-only). Reads the runtime content API only: the modules the engine serves
 * (content.ts `modules`, quarantine-filtered), the generator families (families.ts `FAMILIES`, `pool`), the competency graph and the
 * explanation-review registry. Writes JSON + a Markdown gap map. Changes nothing.
 *   cd frontend && node --import tsx ../docs/math-teaching-content/tools/inventory.mts ../docs/math-teaching-content
 */
import { readFileSync, writeFileSync } from "node:fs";
import { modules, moduleOrigin, poolFamilies } from "../../../packages/learning/src/content.ts";
import { FAMILIES, pool, problemOf } from "../../../packages/learning/src/families.ts";
import { graph } from "../../../packages/learning/src/graph.ts";
import { geometryTask } from "../../../packages/learning/src/geometry-task.ts";

const out = process.argv[2];
const registry = JSON.parse(readFileSync(new URL("../../../content/learning/explanation-review.v1.json", import.meta.url), "utf8")) as { entries: { competency: string; strategy: string; misconceptionSpecific: boolean; addresses: string | null }[] };
const famOf = (qid: string) => problemOf(qid.replace(/:(mc|w)$/, ""))?.family ?? null;

type Fam = { id: string; competency: string; grade: [number, number] | null; poolSize: number; idea: boolean; method: boolean; alternatives: number; altVisual: boolean; figure: boolean; word: boolean; mc: boolean; bugs: string[]; bugKinds: Record<string, string>; probes: number; equationWorking: boolean; geometryWorking: boolean };
const famInfo = new Map<string, Fam>();
for (const [id, d] of FAMILIES) {
  let items: { id: string; bugs?: { id: string; kind: string; probe?: string }[] }[] = [];
  try { items = pool(id).items; } catch { items = []; }
  const bugs = new Map<string, string>(); let probes = 0, gw = false;
  for (const p of items) {
    for (const b of p.bugs ?? []) { bugs.set(b.id, b.kind); if (b.probe) probes++; }
    try { if (!gw && geometryTask(p.id)) gw = true; } catch { /* not geometry */ }
  }
  const size = items.length;
  const t = (d as { teach?: { idea?: string; method?: string; alternatives?: { visual?: unknown }[] } }).teach;
  const c = graph.byId.get(d.competency);
  famInfo.set(id, { id, competency: d.competency, grade: c?.gradeRange ?? null, poolSize: size, idea: !!t?.idea, method: !!t?.method, alternatives: t?.alternatives?.length ?? 0, altVisual: !!t?.alternatives?.some((a) => a.visual), figure: typeof (d as { figure?: unknown }).figure === "function", word: typeof (d as { word?: unknown }).word === "function", mc: !!d.mc, bugs: [...bugs.keys()].sort(), bugKinds: Object.fromEntries(bugs), probes, equationWorking: typeof (d as { contract?: { statement?: unknown } }).contract?.statement === "function", geometryWorking: gw });
}

const famsByComp = new Map<string, string[]>();
for (const f of famInfo.values()) famsByComp.set(f.competency, [...(famsByComp.get(f.competency) ?? []), f.id]);

const rows = modules.map((m) => {
  const c = graph.byId.get(m.competency);
  const phases = { diagnostics: m.diagnostics ?? [], practice: m.practice ?? [], transfer: m.transfer ?? [], retention: m.retention ?? [] } as Record<string, string[]>;
  const famIn = (l: string[]) => [...new Set(l.map(famOf).filter((x): x is string => !!x))].sort();
  const compFams = (famsByComp.get(m.competency) ?? []).sort();
  const strategies = (m.strategies ?? []) as { id: string; screens?: { instance?: string; role?: string; widget?: unknown }[] }[];
  const stratFams = famIn(strategies.flatMap((s) => (s.screens ?? []).map((x) => x.instance ?? "").filter(Boolean)));
  const reg = registry.entries.filter((e) => e.competency === m.competency);
  const specific = reg.filter((e) => e.misconceptionSpecific);
  const addressed = new Set(specific.map((e) => e.addresses).filter(Boolean) as string[]);
  const bugs = [...new Set(compFams.flatMap((f) => famInfo.get(f)!.bugs))].sort();
  const chapter = Array.isArray((m as { chapter?: unknown }).chapter) ? ((m as unknown as { chapter: { title?: string; instance?: string }[] }).chapter) : [];
  const chapterFams = compFams.filter((f) => chapter.some((x) => x.title === FAMILIES.get(f)!.title || (x.instance && famOf(x.instance) === f)));
  const stratIds = new Set(strategies.map((s) => s.id));
  const altsDisconnected = compFams.filter((f) => !stratFams.includes(f)).flatMap((f) => ((FAMILIES.get(f) as { teach?: { alternatives?: { id: string }[] } }).teach?.alternatives ?? []).filter((a) => !stratIds.has(a.id)).map((a) => `${f}:${a.id}`));
  const allItems = Object.values(phases).flat();
  return {
    competency: m.competency, title: m.title, grade: c?.gradeRange ?? null, strand: c?.strand ?? null, origin: moduleOrigin(m.competency),
    seedFamily: (m as { provenance?: { family?: string } }).provenance?.family ?? null,
    families: compFams,
    itemFamilies: famIn(allItems), diagnosticFamilies: famIn(phases.diagnostics), retentionFamilies: famIn(phases.retention),
    // STATIC module lists only. At runtime the engine also draws fresh questions from every pool family (library.ts modulePhasePool,
    // intervention.ts); question selection is Codex's engine-wiring audit, so these two fields are NOT teaching-content findings.
    staticListsOmitFamilies: compFams.filter((f) => !famIn(allItems).includes(f)),
    staticDiagnosticsOmitFamilies: compFams.filter((f) => !famIn(phases.diagnostics).includes(f)),
    poolFamilies: poolFamilies(m),
    strategies: strategies.map((s) => s.id), strategyFamilies: stratFams,
    familiesWithoutTeachingScreens: compFams.filter((f) => !stratFams.includes(f)),
    familiesChapterOnly: compFams.filter((f) => !stratFams.includes(f) && chapterFams.includes(f)),
    familiesNoTeachingAtAll: compFams.filter((f) => !stratFams.includes(f) && !chapterFams.includes(f)),
    alternativesDisconnected: altsDisconnected,
    visualScreens: strategies.filter((s) => (s.screens ?? []).some((x) => x.widget)).length,
    misconceptionSpecific: specific.map((e) => e.strategy),
    misconceptions: bugs, misconceptionsWithoutSpecificExplanation: bugs.filter((b) => !addressed.has(b)),
    equationWorking: compFams.some((f) => famInfo.get(f)!.equationWorking), geometryWorking: compFams.some((f) => famInfo.get(f)!.geometryWorking),
    items: allItems.length,
  };
});

// families whose competency has no served module (generator + teaching exist, no module): disconnected
const served = new Set(rows.map((r) => r.competency));
const orphanFamilies = [...famInfo.values()].filter((f) => !served.has(f.competency)).map((f) => ({ id: f.id, competency: f.competency, poolSize: f.poolSize }));
writeFileSync(`${out}/inventory.json`, JSON.stringify({ generatedFrom: "runtime content API (content.ts modules, families.ts FAMILIES/pool, graph, explanation-review.v1.json)", modules: rows, families: [...famInfo.values()], orphanFamilies }, null, 1) + "\n");

// summary numbers
const n = rows.length, multi = rows.filter((r) => r.families.length > 1);
const sum = {
  modules: n, authored: rows.filter((r) => r.origin === "authored").length, synthesised: rows.filter((r) => r.origin === "synthesised").length,
  families: famInfo.size, orphanFamilies: orphanFamilies.length,
  multiFamilyModules: multi.length,
  multiFamilyModulesWithUntaughtFamilies: multi.filter((r) => r.familiesWithoutTeachingScreens.length).length,
  familiesWithoutStrategy: rows.reduce((a, r) => a + r.familiesWithoutTeachingScreens.length, 0),
  familiesChapterOnly: rows.reduce((a, r) => a + r.familiesChapterOnly.length, 0),
  familiesNoTeachingAtAll: rows.reduce((a, r) => a + r.familiesNoTeachingAtAll.length, 0),
  alternativesDisconnected: rows.reduce((a, r) => a + r.alternativesDisconnected.length, 0),
  familiesNotInPools: rows.reduce((a, r) => a + r.families.filter((f) => !r.poolFamilies.includes(f)).length, 0),
  modulesWithAnyMisconceptionSpecific: rows.filter((r) => r.misconceptionSpecific.length).length,
  misconceptionsTotal: rows.reduce((a, r) => a + r.misconceptions.length, 0),
  misconceptionsWithoutSpecific: rows.reduce((a, r) => a + r.misconceptionsWithoutSpecificExplanation.length, 0),
  modulesWithWorkingChecker: rows.filter((r) => r.equationWorking || r.geometryWorking).length,
  familiesNoAlternative: [...famInfo.values()].filter((f) => f.alternatives === 0).length,
  familiesNoTeach: [...famInfo.values()].filter((f) => !f.idea || !f.method).length,
  familiesNoWord: [...famInfo.values()].filter((f) => !f.word).length,
  familiesNoBugs: [...famInfo.values()].filter((f) => f.bugs.length === 0).length,
};
writeFileSync(`${out}/inventory-summary.json`, JSON.stringify(sum, null, 1) + "\n");
console.log(JSON.stringify(sum));
process.exit(0);
