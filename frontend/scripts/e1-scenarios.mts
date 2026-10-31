// usage (from frontend/): node --import tsx scripts/e1-scenarios.mts <out.json> <out.md>
// Workstream E1: machine-readable results of the 17 sub-skill evidence journeys (seed 0), through the real session components.
import { writeFileSync } from "node:fs";
import { phasePool } from "../../packages/learning/src/families.ts";
import { runE1Scenarios, variantsFrom } from "../src/journey/subskill-scenarios.ts";
const R = runE1Scenarios(variantsFrom(phasePool), 0);
const short = (id: string) => id.split(".")[1].replace("@1", "");
const rows = R.map((r) => {
  const a = r.authoritative as { status?: string; verified?: boolean; retention?: string; recoveryRequired?: boolean; error?: string };
  return { id: r.id, name: r.name,
    authoritative: a.error ? { error: a.error } : { status: a.status, verified: a.verified, retention: a.retention, recoveryRequired: a.recoveryRequired },
    subSkills: Object.fromEntries(r.projection.subSkills.map((s) => [short(s.id), { status: s.status, method: s.method.status, independentRight: s.attempts.independentRight, independent: s.attempts.independent, assistedRight: s.attempts.assistedRight, distinctVariantsRight: s.attempts.distinctVariantsRight, contradicted: s.attempts.contradicted, rechecks: s.rechecks.map((c) => c.correct), retention: s.retention.state, retentionHistory: s.retention.history.map((h) => h.result + (h.recoveredAt ? "+recovered" : "")), everDemonstrated: s.historical.everDemonstrated, prerequisiteSupport: s.prerequisiteSupport.map((p) => short(p.from)) }])),
    unknown: r.projection.unknown.byReason, discrepancies: r.projection.discrepancies,
    supporting: r.supporting.map((s) => ({ questionId: s.questionId, activity: s.activity, correct: s.correct, hints: s.hints, working: s.working })),
    ...("replay" in r ? { replay: (r as unknown as { replay: unknown }).replay } : {}),
    ...("beforeRecovery" in r ? { beforeRecovery: { authoritative: (r as unknown as { beforeRecovery: { authoritative: unknown } }).beforeRecovery.authoritative, subSkills: Object.fromEntries((r as unknown as { beforeRecovery: { projection: typeof r.projection } }).beforeRecovery.projection.subSkills.filter((s) => s.status !== "not-attempted").map((s) => [short(s.id), s.status])) } } : {}),
  };
});
writeFileSync(process.argv[2], JSON.stringify({ contract: "linear-equations-subskill-projection@1", mapping: "linear-equations-subskills@1", seed: 0, scenarios: rows }, null, 1) + "\n");
const md = ["| # | Scenario | Authoritative (status / verified / retention) | E1 sub-skills (attempted only) | Discrepancy | Unknown |", "|---|---|---|---|---|---|",
  ...rows.map((r) => { const a = r.authoritative as Record<string, unknown>; const subs = Object.entries(r.subSkills).filter(([, v]) => v.status !== "not-attempted").map(([k, v]) => `${k}: ${v.status}${v.method !== "not-established" ? ` (method ${v.method})` : ""}`).join("; ") || "—";
    return `| ${r.id} | ${r.name} | ${"error" in a ? `error: ${a.error}` : `${a.status} / ${a.verified} / ${a.retention}`} | ${subs} | ${r.discrepancies.length ? r.discrepancies[0].unsupported.map((u) => `${short(u.id)}: ${u.status}`).join(", ") : "none"} | ${Object.entries(r.unknown).map(([k, v]) => `${k} ×${v}`).join(", ") || "—"} |`; })];
writeFileSync(process.argv[3], md.join("\n") + "\n");
console.log(rows.length, "scenarios");
