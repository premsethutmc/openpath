/**
 * Workstream E1: every Milestone-2 scenario (real flow, scripted learners) whose skill is linear equations, projected afterwards:
 * where does the production competency status claim more than the sub-skill evidence shows?
 *   node --import tsx scripts/e1-leakage-scan.mts <out.json>
 */
import { writeFileSync } from "node:fs";
import { question } from "../../packages/learning/src/content.ts";
import { subSkillProjection } from "../../packages/learning/src/sub-skill-evidence.ts";
import { runScenario, SCENARIOS } from "../src/journey/scenarios.ts";

const out = [];
for (const sc of SCENARIOS) {
  if (question(sc.start).competency !== "MATH.algebra.linear-equations") continue;
  const r = runScenario(sc);
  const s = r.f.session;
  const events = s.events.map((e) => { const k = (e as { id?: string }).id; return k && s.decisions[k] ? { ...e, decision: s.decisions[k] } : e; });
  const p = subSkillProjection(s.learnerId, events as { kind: string }[], s.now);
  const c = p.competencies.find((x) => x.competency === "MATH.algebra.linear-equations")!;
  out.push({ scenario: sc.id, learner: sc.learner().name, production: c.production, supports: c.supports, shown: c.shown, missing: c.missing, retained: c.retained, leakage: c.leakage.map((l) => l.kind + ": " + l.missing.join("+")), subSkills: Object.fromEntries(p.subSkills.filter((x) => x.status !== "no-evidence").map((x) => [x.id, `${x.status} ${x.answers.independentRight}/${x.answers.independentRight + x.answers.independentWrong} alone, check ${x.retention}`])), digest: p.digest });
}
writeFileSync(process.argv[2], JSON.stringify(out, null, 1) + "\n");
const leaks = out.filter((x) => x.leakage.length);
console.log(`scenarios ${out.length}; production mastery status ${out.filter((x) => ["independent", "transfer", "verified"].includes(x.production.status)).length}; with leakage ${leaks.length}`);
for (const x of out) console.log(x.scenario, x.production.status, x.production.retention, x.supports, x.leakage.join(" | ") || "-");
