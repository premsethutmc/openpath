import { plan } from "./planner.ts";
const r = plan(process.argv[2] ?? "3*(x+2)=21");
console.log(process.argv[2] ?? "3*(x+2)=21");
for (const s of r.steps) console.log(`  ${s.rule.padEnd(22)} ${s.to}   — ${s.explain}`);
console.log(r.outcome, r.answer ?? r.reason, JSON.stringify(r.stats));
