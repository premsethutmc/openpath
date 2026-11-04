// Builds a seeded set of problems from declarative specifications (no stored problems); writes the problems with their recipes and the
// planner's/verifier's measurements. check_constructed.py then re-derives domain, class and solution with SymPy, which shares no code with this repository.
import { writeFileSync } from "node:fs";
import { construct, type Spec } from "../../../packages/learning/src/core/construct.ts";
const out = process.argv[2]; const specs: Spec[] = []; let seed = 20261101;
const add = (n: number, s: Omit<Spec, "seed">) => { for (let i = 0; i < n; i++) specs.push({ ...s, seed: seed++ } as Spec); };
add(40, { kind: "linear", outcome: "unique" }); add(10, { kind: "linear", outcome: "none" }); add(10, { kind: "linear", outcome: "identity-on-domain" });
add(30, { kind: "rational", outcome: "unique", excludedCount: 1 }); add(30, { kind: "rational", outcome: "unique", excludedCount: 2 }); add(10, { kind: "rational", outcome: "unique", excludedCount: 3, maxScramble: 7 });
add(30, { kind: "rational", outcome: "none", extraneous: true }); add(10, { kind: "rational", outcome: "none", extraneous: false });
add(15, { kind: "rational", outcome: "identity-on-domain" });
add(20, { kind: "rational", outcome: "unique", requireOps: ["clear-denominators"] });
add(15, { kind: "rational", outcome: "unique", requireOps: ["cancel-common-factor"] });
add(15, { kind: "rational", outcome: "unique", steps: { min: 7, max: 12 } });
const rows: unknown[] = []; let failed = 0; const t0 = performance.now();
for (const spec of specs) { try { rows.push({ spec, built: construct(spec) }); } catch (e) { failed++; rows.push({ spec, error: String(e).slice(0, 300) }); } }
writeFileSync(out, JSON.stringify({ specs: specs.length, built: specs.length - failed, failed, seconds: +((performance.now() - t0) / 1000).toFixed(1), rows }, null, 1));
console.log(JSON.stringify({ specs: specs.length, built: specs.length - failed, failed }));
