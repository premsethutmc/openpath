// Which first-pass runs used `cancel-common-factor` on a bracket GROUP (a sum) term? That reduces a whole sum in one step (a combine+cancel macro), which the reference operation does not do.
import { readFileSync, writeFileSync } from "node:fs";
const { parseEq } = await import("../../../../packages/learning/src/reasoner/domain/domain-state.ts");
const { flat } = await import("../../../../packages/learning/src/core/fine.ts");
const rows = readFileSync(process.argv[2], "utf8").trim().split("\n").map((l) => JSON.parse(l));
const aff = new Set<string>(); const D = "/home/claude/r2/tools/mathematics/r2/"; const tasks: any[] = JSON.parse(readFileSync(D + "composition.json", "utf8")).tasks;
for (const r of rows) { const steps = r.trace.filter((s: any) => s.op !== "restrict"); const states = r.states;
  steps.forEach((s: any, i: number) => { if (s.op !== "cancel-common-factor") return; const before = states[i]; if (!before) return; const q = parseEq(before.eq); const ts = flat(s.params.side === "R" ? q.right : q.left); const t = ts[Number(s.params.idx)]; if (t && (t.t.kind === "add" || t.t.kind === "sub")) aff.add(r.id); }); }
for (const t of tasks) if (t.goal === "REDUCED") aff.add(t.id);
writeFileSync(process.argv[3], JSON.stringify([...aff])); console.log(aff.size, "tasks affected (cancel on a sum group, or REDUCED goal)");
