// Runs every contender on the frozen compositional tasks and writes one JSON line per (task, contender). Success is NOT decided here: judge.py re-checks every
// state of every run with the independent reference implementation. P2's priority list per goal is chosen on tuning.json only.
// Usage: run-compositional.ts <out.jsonl> [shard k of n]   (env: SET=composition|tuning, NODE_CAP)
import { readFileSync, writeFileSync, appendFileSync, existsSync } from "node:fs";
const C = await import("../../../../packages/learning/src/core/contenders.ts");
const D = "/home/claude/r2/tools/mathematics/r2/"; const out = process.argv[2]; const k = Number(process.argv[3] ?? 0), n = Number(process.argv[4] ?? 1);
const KEY = (process.env.STATE_KEY ?? "text") as "text" | "canonical"; const cap = Number(process.env.NODE_CAP ?? 20000); const SET = process.env.SET ?? "composition";
const load = (f: string) => JSON.parse(readFileSync(D + f, "utf8")).tasks as any[];
// ---- P2 orders: the P1 order plus 89 seeded random permutations; best per goal on tuning.json
const mulberry = (a: number) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const rnd = mulberry(4242); const orders: string[][] = [C.P1_ORDER];
while (orders.length < 90) { const o = [...C.OPS]; for (let i = o.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [o[i], o[j]] = [o[j], o[i]]; } orders.push(o); }
const tuning = load("tuning.json"); const GOALS = ["SOLVE", "EXPANDED_POLY", "ONE_FRACTION_ZERO", "CLEARED", "REDUCED"];
const bestOrder: Record<string, string[]> = {};
const orderFile = process.env.ORDERS ?? out.replace(/\.jsonl$/, "") + ".p2orders.json";
if (SET === "tuning" || !existsSync(orderFile)) {
  for (const g of GOALS) { let best = -1, bo = orders[0]; for (const o of orders) { let ok = 0; for (const t of tuning.filter((t) => t.goal === g)) ok += C.runPriority(t.start, new Set(t.allowed), t.goal, o).ok ? 1 : 0; if (ok > best) { best = ok; bo = o; } } bestOrder[g] = bo; }
  if (k === 0) writeFileSync(orderFile, JSON.stringify(bestOrder, null, 1));
} else Object.assign(bestOrder, JSON.parse(readFileSync(orderFile, "utf8")));
let tasks = load(SET + ".json").filter((_, i) => i % n === k);
if (process.env.ONLY) { const ids: string[] = JSON.parse(readFileSync(process.env.ONLY, "utf8")); const byId = new Map(tasks.concat(load(SET + ".json")).map((t) => [t.id, t])); tasks = ids.map((i) => byId.get(i)!); }   // supplemental workers: explicit id list, own output file
const row = (t: any, name: string, r: any) => JSON.stringify({ id: t.id, contender: name, unique: r.unique ?? null, trace: r.trace, states: r.states, visited: r.visited, generated: r.generated, capped: r.capped, ms: Math.round(r.ms * 10) / 10, why: r.why ?? null, self_ok: r.ok });
let i = 0; for (const t of tasks) {
  const a = new Set<string>(t.allowed); const lines: string[] = [];
  const WANT = process.env.CONTENDERS ? new Set(process.env.CONTENDERS.split(",")) : null;
  const run = (name: string, f: () => any) => { if (WANT && !WANT.has(name)) return; try { lines.push(row(t, name, f())); } catch (e) { lines.push(JSON.stringify({ id: t.id, contender: name, error: String(e).slice(0, 200) })); } };
  run("planner", () => C.runPlanner(t.start, a, t.goal, KEY, cap)); run("bfs", () => C.runBFS(t.start, a, t.goal, cap, KEY)); run("P1", () => C.runP1(t.start, a, t.goal));
  run("P2", () => C.runPriority(t.start, a, t.goal, bestOrder[t.goal])); run("P4", () => C.runP4(t.start, a, t.goal));
  appendFileSync(out, lines.join("\n") + "\n"); if (++i % 25 === 0) console.error(`shard ${k}: ${i}/${tasks.length}`);
}
