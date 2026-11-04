// Replays every frozen witness (reference operation names + parameters) through the core's fine rules and prints our states; conformance_check.py compares them to the reference states.
import { readFileSync, writeFileSync } from "node:fs";
const { replay } = await import("../../../../packages/learning/src/core/compose.ts");
const D = "/home/claude/r2/tools/mathematics/r2/";
const tasks: any[] = [...JSON.parse(readFileSync(D + "composition.json", "utf8")).tasks, ...JSON.parse(readFileSync(D + "tuning.json", "utf8")).tasks].filter((t) => t.reachable !== false && t.witness);
const out: any[] = [];
for (const t of tasks) { const r = replay(t.start, t.witness); out.push({ id: t.id, ok: r.ok, error: r.error, states: r.states }); }
writeFileSync(process.argv[2] ?? "/tmp/conf.json", JSON.stringify(out)); console.log(out.length, "witnesses;", out.filter((o) => o.ok).length, "replayed");
for (const o of out.filter((x) => !x.ok).slice(0, 8)) console.log(o.id, o.error);
