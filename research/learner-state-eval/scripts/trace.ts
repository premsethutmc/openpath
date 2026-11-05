/** node --import tsx scripts/trace.ts <kind> <subject> <seed> <variant>: print one compact trace (run from frontend/) */
import { brief, metrics, simulate, type Kind, type Variant } from "../src/harness";
const [k, c, seed, v] = process.argv.slice(2);
const r = simulate(k as Kind, c, Number(seed), (v ?? "baseline") as Variant);
console.log(`# ${k} ${c} seed=${seed} variant=${v} unknownUnit=${r.unknownUnit}`); console.log(brief(r).join("\n")); console.log(JSON.stringify(metrics(r)));
