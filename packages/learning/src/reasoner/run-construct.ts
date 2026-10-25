import { writeFileSync } from "node:fs";
import { constructSet } from "./construct.ts";
const [seed, out] = process.argv.slice(2);
const set = constructSet(Number(seed), { unique: 300, noSolution: 30, identity: 30 });
writeFileSync(out, JSON.stringify(set.map(({ constraint, attempts, ...b }) => ({ ...b, constraint, attempts })), null, 1));
console.log(`constructed ${set.length} equations (distinct texts: ${new Set(set.map((s) => s.text)).size})`);
