/**
 * Phase 6 (worker A): how many of the OLD simulated answers the server would NOT have counted (verdict "unresolved" in the deployed
 * default grading mode), per run. Re-runs the phase-5 held-out runs (old answers, deterministic) for one rule, collects every answer,
 * and asks the server's own decision function (server_verdicts.py) once per distinct (question, answer).
 *   node --import tsx src/journey/deep-recovery-unresolved6.ts <seedFrom> <seedTo> <rule>
 */
import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { simulate5, CELLS5 } from "./deep-recovery-sim5";

const ROOT = new URL("../../../", import.meta.url).pathname;
const from = Number(process.argv[2]), to = Number(process.argv[3]), rule = process.argv[4] ?? "selective";
const runs: { key: string; outcome: unknown; questions: unknown; answers: { id: string; response: string }[] }[] = [];
for (const cell of CELLS5) { const [o, t] = cell.split(":") as ["O1" | "O2", string]; for (let seed = from; seed <= to; seed++) {
  const answers: { id: string; response: string }[] = [];
  const r = simulate5(rule, o, t, seed, (x) => answers.push({ id: x.qid, response: x.answer })) as Record<string, unknown>;
  runs.push({ key: `${rule} ${o} ${t} ${seed}`, outcome: r.outcome, questions: r.questions, answers });
} }
const uniq = [...new Map(runs.flatMap((r) => r.answers).map((a) => [`${a.id}\u0000${a.response}`, a])).values()];
const vendor = readdirSync(join(homedir(), ".cache/openpath-vendor")).map((d) => join(homedir(), ".cache/openpath-vendor", d)).join(":");
const sp = spawnSync("python3", [join(ROOT, "research/deep-recovery/results/phase6-sim/server_verdicts.py")], { cwd: join(ROOT, "backend"), input: JSON.stringify(uniq), env: { ...process.env, PYTHONPATH: vendor }, encoding: "utf8", maxBuffer: 1 << 28 });
if (sp.status !== 0) throw new Error(sp.stderr.slice(-500));
const v = new Map((JSON.parse(sp.stdout) as { id: string; response: string; shadow: string; unified: string }[]).map((x) => [`${x.id}\u0000${x.response}`, x]));
for (const r of runs) {
  const un = r.answers.filter((a) => v.get(`${a.id}\u0000${a.response}`)?.shadow === "unresolved");
  console.log(JSON.stringify({ key: r.key, outcome: r.outcome, questions: r.questions, answers: r.answers.length, unresolvedShadow: un.length, unresolvedUnified: r.answers.filter((a) => v.get(`${a.id}\u0000${a.response}`)?.unified === "unresolved").length, families: [...new Set(un.map((a) => a.id.split(":")[1]))] }));
}
