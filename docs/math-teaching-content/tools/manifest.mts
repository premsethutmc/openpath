/**
 * Integration manifest + pool reconciliation for the 18 existing packages (read-only against the runtime).
 * Reads the batch-1 and batch-2 TP package JSON files (built by build.mts) and checks every item role against the served partitions, quarantine, exposure in
 * existing teaching, cross-package reuse and the platform's answer readers. Writes integration-manifest.json and 08-INTEGRATION-MANIFEST.md.
 *   cd frontend && node --import tsx ../docs/math-teaching-content/tools/manifest.mts ../docs/math-teaching-content
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { FAMILIES, exposureKey, phaseOf, phasePool, problemOf } from "../../../packages/learning/src/families.ts";
import { selectable } from "../../../packages/learning/src/question-status.ts";
import { moduleFor, isQuestion, question } from "../../../packages/learning/src/content.ts";
import { probeReading } from "../../../packages/learning/src/reasoning.ts";
import { teachingScopeFor } from "../../../packages/learning/src/teaching-presentation.ts";

const root = process.argv[2];
const SOURCE = "637938c7da0416b03595fae60a80607e60aa84c0";
const pkgs = ["batch-1", "batch-2"].flatMap((b) => readdirSync(`${root}/${b}`).filter((f) => /^TP.*\.json$/.test(f)).map((f) => JSON.parse(readFileSync(`${root}/${b}/${f}`, "utf8"))));
const P = (id: string) => problemOf(id.replace(/:(mc|w)$/, ""))!;
const form = (id: string) => (id.endsWith(":mc") ? "mc" : id.endsWith(":w") ? "word" : "typed");
const VISUAL_TYPES = new Set(["strips", "array", "dots", "tenframe", "blocks", "numberline", "clock", "coins", "bars", "pictograph", "table", "shape", "angle", "circle", "grid", "triangle", "plane", "pie", "balance", "solid"]);
const MISSING_VISUALS: Record<string, string[]> = {
  "TP-NUM-01": ["two equal-length fraction strips side by side (two grid strips of the same width is a renderer decision)"],
  "TP-MEA-01": ["perimeter outline (the grid visual shades the inside only)"],
  "TP-GEO-01": ["triangle with an extended side and its exterior angle (the triangle visual draws interior angles only; the proposed 'exterior' field is not in the Visual contract)"],
  "TP-GEO-02": ["two crossing lines with four angles (the angle visual draws one angle)"],
  "TP-ALG-01": ["labelled 2 × 2 area model (the grid visual has no cell labels)"],
};

// exposure in existing teaching: every question shown solved (screen instance) or used as guided/check by an EXISTING module strategy
const existingExposure = new Map<string, Set<string>>();
const exposedIn = (competency: string) => {
  if (!existingExposure.has(competency)) {
    const m = moduleFor(competency)!; const s = new Set<string>();
    for (const st of m.strategies) { for (const sc of st.screens) if (sc.instance) s.add(exposureKey(sc.instance)); if (st.guided) s.add(exposureKey(st.guided)); if (st.check) s.add(exposureKey(st.check)); }
    for (const sc of (Array.isArray(m.chapter) ? m.chapter : [])) if ((sc as { instance?: string }).instance) s.add(exposureKey((sc as { instance: string }).instance));
    existingExposure.set(competency, s);
  }
  return existingExposure.get(competency)!;
};
// cross-package use of the same exposure key (same competency or not)
const owners = new Map<string, string[]>();
for (const p of pkgs) for (const id of allIds(p)) { const k = exposureKey(id); owners.set(k, [...new Set([...(owners.get(k) ?? []), p.id])]); }

function allIds(p: any): string[] {
  return [...p.diagnostic.map((d: any) => d.id), ...p.workedExamples.map((w: any) => w.id), ...p.misconceptions.flatMap((m: any) => [m.example, m.guided, m.check].filter(Boolean)), ...p.practice.guided, ...p.practice.rechecks, ...p.practice.transfer, ...p.practice.delayedChecks];
}

const out: any[] = [];
for (const p of pkgs) {
  const def: any = FAMILIES.get(p.family);
  const m = moduleFor(p.competency)!;
  const scope = teachingScopeFor(m);
  const roles: { role: string; id: string; fresh: boolean }[] = [
    ...p.diagnostic.map((d: any) => ({ role: `diagnostic (${d.case})`, id: d.id, fresh: true })),
    ...p.workedExamples.map((w: any) => ({ role: "worked (shown solved)", id: w.id, fresh: false })),
    ...p.misconceptions.flatMap((x: any) => [{ role: `misconception example (${x.bug}, shown solved)`, id: x.example, fresh: false }, ...(x.guided ? [{ role: `misconception guided (${x.bug})`, id: x.guided, fresh: false }] : []), ...(x.check ? [{ role: `misconception fresh check (${x.bug})`, id: x.check, fresh: true }] : [])]),
    ...p.practice.guided.map((id: string) => ({ role: "guided practice", id, fresh: false })),
    ...p.practice.rechecks.map((id: string) => ({ role: "fresh recheck", id, fresh: true })),
    ...p.practice.transfer.map((id: string) => ({ role: "transfer", id, fresh: true })),
    ...p.practice.delayedChecks.map((id: string) => ({ role: "retention (delayed)", id, fresh: true })),
  ];
  const expectedPartition = (r: string) => (r.startsWith("diagnostic") ? "diagnostic" : r.startsWith("retention") ? "retention" : r.includes("check") ? "check" : "practice");
  const items = roles.map((r) => {
    const base = r.id.replace(/:(mc|w)$/, "");
    const part = phaseOf(base);
    const served = phasePool(p.family, part as any).includes(r.id) || phasePool(p.family, part as any).includes(base);
    const issues: string[] = [];
    if (!selectable(r.id) || !isQuestion(r.id)) issues.push("not selectable");
    if (!served) issues.push(`not in a served partition`);
    const want = expectedPartition(r.role);
    if (part !== want && !(want === "practice" && r.role.startsWith("transfer"))) issues.push(`taken from the ${part} partition for a ${want} role`);
    if (r.fresh && exposedIn(p.competency).has(exposureKey(r.id))) issues.push("EXPOSED: already shown by an existing explanation of this module");
    const others = (owners.get(exposureKey(r.id)) ?? []).filter((o) => o !== p.id);
    if (others.length) issues.push(`also used by ${others.join(", ")}`);
    return { ...r, partition: part, form: form(r.id), issues };
  });
  const roleDup = new Map<string, number>(); for (const it of items) roleDup.set(exposureKey(it.id), (roleDup.get(exposureKey(it.id)) ?? 0) + 1);
  for (const it of items) if ((roleDup.get(exposureKey(it.id)) ?? 0) > 1) it.issues.push("same question in two roles of this package");

  // answer formats: grader-supported (all items pass the build) and readable by the diagnosis reader
  const targets = p.misconceptions.map((x: any) => ({ id: x.bug, kind: x.kind, diagnosable: x.platformCanDiagnose, reading: x.platformReading, specificStrategy: p.integration.strategies.find((s: any) => s.purpose === `misconception-specific: ${x.bug}`)?.strategy.id ?? null }));
  const reused = p.integration.reusedExisting;
  const widgets = [...new Set(p.integration.strategies.flatMap((s: any) => s.strategy.screens.map((sc: any) => sc.widget?.type).filter(Boolean)))] as string[];
  const gates = p.integration.platformChecks.gates;
  const outsideScope = gates.filter((g: any) => !g.teachingContract.checked).map((g: any) => g.strategy);
  const addressesNull = gates.filter((g: any) => g.strategy.startsWith("fix_") && !g.addressesReadByPlatform).map((g: any) => g.strategy);
  const missingQuestions = p.uncertainties.filter((u: string) => /no usable|MISSING|CONTRAST GAP|no word|no improper|has no word|diagnostic partition/.test(u));
  if (!p.practice.transfer.length) missingQuestions.push("transfer: the family has no word (everyday) form; authored transfer text is NOT gradable");
  const contrast = { cases: p.diagnostic.map((d: any) => ({ case: d.case, id: d.id, partition: phaseOf(d.id) })), rule: p.diagnosticRule, patterns: (p.responsePatterns ?? []).map((r: any) => ({ answers: r.cells.map((c: any) => `${c.response} (${c.key})`), establishes: r.establishes })), triggerConditions: p.integration.spec.triggers.filter((t: any) => / AND /.test(t.when)).map((t: any) => ({ strategy: t.strategy, condition: t.when.split(" AND ").slice(1).join(" AND ") })) };
  const contract: string[] = [];
  if (outsideScope.length) contract.push(`B1 teaching scope: ${outsideScope.join(", ")} are outside teachingScopeFor (main family ${scope.family}); ineligible until the selector accepts '${p.family}'`);
  for (const t of targets.filter((t: any) => !t.diagnosable)) contract.push(`B2 diagnosis reader: '${t.id}' reads as ${t.reading} (answer type ${def.type}); ${t.specificStrategy ?? "its fix"} cannot be triggered`);
  if (addressesNull.length) contract.push(`B3 addresses: ${addressesNull.join(", ")} — the platform reads addresses = null (family 'says' overridden); the gate would accept any established misconception`);
  if (p.integration.strategies.length) contract.push("worked-example verification: solved lines use role 'strategy' (checked by this branch's oracle), because no platform worked-example verifier exists for this family");
  const responsePolicy = (p.responsePatterns ?? []).length || contrast.triggerConditions.length ? "policy: 'established' requires the contrast/trigger condition (misconception-evidence@1 counts any two matches)" : null;
  if (responsePolicy) contract.push(responsePolicy);
  for (const v of MISSING_VISUALS[p.id] ?? []) contract.push(`visual: ${v}`);
  for (const w of widgets) if (!VISUAL_TYPES.has(w)) contract.push(`visual type '${w}' is not in the Visual union`);
  const itemIssues = items.filter((i) => i.issues.length);
  out.push({
    id: p.id, batch: p.batch, pattern: p.pattern, title: p.title, sourceCommit: SOURCE,
    scope: { competency: p.competency, module: { origin: m.provenance ? "synthesised" : "authored", mainFamily: scope.family, familyInPools: (m.pools ?? (m.pool ? [m.pool] : [])).some((x: any) => x.family === p.family) }, family: p.family, familyTitle: def.title, parameters: p.integration.spec.generator.restriction },
    misconceptions: { targets, reusedExisting: reused, modelledButNotTargeted: [...new Set(allIds(p).flatMap((id) => P(id).bugs.map((b) => b.id)))].filter((b) => !targets.some((t: any) => t.id === b) && !reused.some((r: any) => r.covers === b)) },
    contrast,
    items,
    visuals: { used: widgets, missing: MISSING_VISUALS[p.id] ?? [] },
    answerFormats: { familyType: def.type, forms: [...new Set(items.map((i) => i.form))], mcAvailable: !!def.mc, wordAvailable: !!def.word, graderSupported: true, diagnosisReaderSupported: targets.every((t: any) => t.diagnosable) },
    evidence: p.integration.spec.evidence,
    newStrategies: p.integration.strategies.map((s: any) => s.strategy.id),
    contract, missingQuestions, itemIssues: itemIssues.map((i) => ({ id: i.id, role: i.role, issues: i.issues })),
  });
}
writeFileSync(`${root}/integration-manifest.json`, JSON.stringify({ sourceCommit: SOURCE, generatedFrom: "batch-*/TP*.json + runtime partitions/quarantine/readers at the source commit", packages: out }, null, 1) + "\n");
for (const o of out) console.log(o.id, "issues", o.itemIssues.length, JSON.stringify(o.itemIssues).slice(0, 400), "| missingQ", o.missingQuestions.length, "| contract", o.contract.length);
process.exit(0);
