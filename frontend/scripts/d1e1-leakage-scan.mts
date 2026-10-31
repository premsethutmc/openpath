/**
 * D1 + E1 (reused from the alternative E1): every Milestone-2 scenario whose skill is linear equations, plus two module-flow learners who are
 * right on two-step questions and wrong on every both-sides and bracket question, run through the real flow; the canonical E1 projection over
 * the stored events. Where does the authoritative competency status claim more than the sub-skill evidence shows?
 *   node --import tsx scripts/d1e1-leakage-scan.mts <out.json>
 */
import { writeFileSync } from "node:fs";
import { question } from "../../packages/learning/src/content.ts";
import { problemOf } from "../../packages/learning/src/families.ts";
import { withDecisions } from "../../packages/learning/src/records.ts";
import { COMPETENCY, projectFromEvents } from "../../packages/learning/src/subskill-evidence.ts";
import { right, wrong, type Learner } from "../src/journey/learners.ts";
import { runScenario, SCENARIOS, type Scenario } from "../src/journey/scenarios.ts";

const fam = (q: string) => problemOf(q.replace(/:(mc|w)$/, ""))?.family ?? "authored";
const onlyFamilies = (fams: string[]): Learner => ({ name: `right only on ${fams.join(", ")}`, act: (v) => ({ answer: fams.includes(fam(v.q)) ? right(v.q) : wrong(v.q) }) });
const extra: Scenario[] = [
  { id: "X1", category: 5, start: "gen:lin:2,17,11", learner: () => onlyFamilies(["lin", "auleq", "aulwp"]), expect: {}, note: "right on two-step and modelling, wrong on both-sides and brackets" },
  { id: "X2", category: 5, start: "gen:lin:2,17,11", learner: () => onlyFamilies(["lin", "auleq", "aulwp"]), later: [8], expect: {}, note: "the same learner, back 8 days later" },
];
const out = [];
for (const sc of [...SCENARIOS.filter((s) => question(s.start).competency === COMPETENCY), ...extra]) {
  const r = runScenario(sc), s = r.f.session, e = s.state().evidence(COMPETENCY);
  const p = projectFromEvents(s.learnerId, withDecisions(s.events, s.decisions), s.now, { status: e.status, verified: e.verified });
  const perFam: Record<string, string> = {};
  for (const a of s.state().records.attempts.filter((x) => question(x.questionId).competency === COMPETENCY)) perFam[fam(a.questionId)] = (perFam[fam(a.questionId)] ?? "") + (a.credit ? "✓" : "✗");
  out.push({ scenario: sc.id, learner: sc.learner().name, answers: perFam, authoritative: { status: e.status, verified: e.verified, retention: e.retention },
    subSkills: Object.fromEntries(p.subSkills.filter((x) => x.status !== "not-attempted").map((x) => [x.id.split(".")[1].replace("@1", ""), `${x.status}; check ${x.retention.state} (need ${x.retention.need}, sampled ${x.retention.sampledByModuleCheck})`])),
    discrepancy: p.discrepancies.map((d) => d.unsupported.map((u) => `${u.id.split(".")[1].replace("@1", "")}=${u.status}`).join(", ")) });
}
writeFileSync(process.argv[2], JSON.stringify(out, null, 1) + "\n");
console.log(`scenarios ${out.length}; authoritative broad claim (independent/transfer/verified) ${out.filter((x) => ["independent", "transfer", "verified"].includes(x.authoritative.status) || x.authoritative.verified).length}; with a discrepancy ${out.filter((x) => x.discrepancy.length).length}`);
for (const x of out) console.log(x.scenario, x.authoritative.status, x.authoritative.retention, JSON.stringify(x.answers), x.discrepancy.join(" | ") || "-");
