// Runs the engine over a frozen dataset and scores it against the oracle's labels. Frozen files are only read, never written.
// Guard: eval needs --stage D4, holdout needs --stage D5 (the milestone protocol). Every run is appended to results/run-log.jsonl.
import { readFileSync, writeFileSync, appendFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { solve } from "./domain-engine.ts";

const args = process.argv.slice(2); const name = args[0]; const stage = args[args.indexOf("--stage") + 1] ?? "";
const label = args[args.indexOf("--label") + 1] ?? "";
if (!["dev", "eval", "holdout", "unsupported"].includes(name)) throw new Error("dataset must be dev|eval|holdout|unsupported");
if (name === "eval" && stage !== "D4") throw new Error("eval may only be run at stage D4 (--stage D4)");
if (name === "holdout" && stage !== "D5") throw new Error("holdout may only be run at stage D5 (--stage D5)");
const root = new URL("../../../../../tools/mathematics/domain-reasoner/", import.meta.url).pathname;
const raw = readFileSync(`${root}frozen/${name}.json`); const hash = createHash("sha256").update(raw).digest("hex");
const manifest = JSON.parse(readFileSync(`${root}frozen/manifest.json`, "utf8"));
const want = JSON.stringify(manifest).includes(hash); if (!want) throw new Error(`dataset hash ${hash} does not match the frozen manifest`);
const cases = JSON.parse(raw.toString());

const same = (a: string[] | null, b: string[] | null) => { const x = [...(a ?? [])].sort(), y = [...(b ?? [])].sort(); return x.length === y.length && x.every((v, i) => v === y[i]); };
const fails: { id: string; text: string; category: string; expected: unknown; got: unknown }[] = []; const times: number[] = []; const visited: number[] = []; const plen: number[] = [];
let ok = 0, invalidSteps = 0, openObl = 0, verifyRej = 0, precondRej = 0; const traces: Record<string, unknown> = {};
for (const c of cases) {
  const r = solve(c.text); times.push(r.stats.ms); visited.push(r.stats.visited); plen.push(r.stats.pathLength);
  verifyRej += r.stats.verifyRejected; precondRej += r.stats.precondFailed;
  for (const s of r.steps) { if (s.preconditions.some((p) => p.startsWith("FAILED"))) invalidSteps++; if (s.obligations.some((o) => o.startsWith("OPEN"))) openObl++; }
  traces[c.id] = { class: r.class, solution: r.solution, reasons: r.reasons, steps: r.steps.map((s) => [s.rule, s.params, s.before, s.after, s.restrictions]), rejected: r.candidatesRejected };
  let cat = "";
  if (c.supported) {
    if (r.class === "refused") cat = r.reasons.length ? "false-refusal" : "search-cap";
    else if (r.class !== c.class) cat = "wrong-class";
    else if (r.class === "unique" && !same(r.solution, c.solution)) cat = "wrong-solution";
    else if (r.class === "unique" && r.solution!.some((v: string) => c.excluded.includes(v))) cat = "accepted-excluded";
    else if (r.restrictions.length < c.excluded.length) cat = "restriction-lost";
  } else {
    if (r.class !== "refused") cat = "missing-refusal";
    else if (!r.reasons.length || r.reasons.some((x) => !c.reasons.includes(x))) cat = "false-refusal";
  }
  if (cat) fails.push({ id: c.id, text: c.text, category: cat, expected: c.supported ? [c.class, c.solution] : c.reasons, got: [r.class, r.solution, r.reasons, r.note] }); else ok++;
}
const q = (a: number[], p: number) => [...a].sort((x, y) => x - y)[Math.min(a.length - 1, Math.floor(p * a.length))];
const byCat: Record<string, number> = {}; for (const f of fails) byCat[f.category] = (byCat[f.category] ?? 0) + 1;
const summary = { dataset: name, stage, label, sha256: hash, cases: cases.length, correct: ok, rate: +(ok / cases.length).toFixed(4), failuresByCategory: byCat,
  invalidStepsInTraces: invalidSteps, openObligations: openObl, moveVerifyRejected: verifyRej, movePreconditionRefused: precondRej,
  visited: { median: q(visited, 0.5), p95: q(visited, 0.95), worst: Math.max(...visited) }, pathLength: { median: q(plen, 0.5), p95: q(plen, 0.95), worst: Math.max(...plen) },
  ms: { median: +q(times, 0.5).toFixed(2), p95: +q(times, 0.95).toFixed(2), worst: +Math.max(...times).toFixed(2) } };
mkdirSync(`${root}results`, { recursive: true });
appendFileSync(`${root}results/run-log.jsonl`, JSON.stringify({ at: new Date().toISOString(), ...summary }) + "\n");
writeFileSync(`${root}results/engine-${name}${label ? "-" + label : ""}.json`, JSON.stringify({ summary, failures: fails }, null, 1));
writeFileSync(`${root}results/traces-${name}${label ? "-" + label : ""}.json`, JSON.stringify(traces));
console.log(JSON.stringify(summary, null, 1)); for (const f of fails.slice(0, 40)) console.log(f.id, f.category, f.text, JSON.stringify(f.expected), JSON.stringify(f.got));
