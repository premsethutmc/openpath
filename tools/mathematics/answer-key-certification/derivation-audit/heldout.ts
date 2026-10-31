// Held-out cases written AFTER the registry was fixed; the registry is not tuned on them. [name, P, R, want justified]
import { justified } from "./registry-rewrite.ts";
import { explainNumerals } from "./prototype-rule.ts";
const H: [string, string, string, boolean][] = [
  ["borrow-style split 100-37", "100 - 37", "(100 - 40) + 3", true], ["round-and-adjust 63+28", "63 + 28", "63 + (30 - 2)", true], ["99+99 near-hundred", "99 + 99", "(100 - 1) + (100 - 1)", true],
  ["split 59 as 60-1", "37 + 59", "37 + (60 - 1)", true], ["split both partitions (36+1)+(58+1)", "37 + 59", "(36 + 1) + (58 + 1)", true], ["shift 1 shown", "37 + 59", "(37 + 1) + (59 - 1)", true],
  ["multiply split 25*4", "25 * 4", "(20 + 5) * 4", true], ["commute", "37 + 59", "59 + 37", true], ["scale 1/2 -> 2/4", "1/2", "2/4", true], ["same-denominator evaluate", "3/4 + 1/4", "4/4", true],
  ["REJECT +0", "37 + 59", "37 + 59 + 0", false], ["REJECT x1 on sum", "37 + 59", "(37 + 59) * 1", false], ["REJECT unshown 60+31 for 63+28", "63 + 28", "60 + 31", false],
  ["REJECT cancel with big k", "37 + 59", "(37 + 1000) + (59 - 1000) + 0", false], ["REJECT answer as 48+48", "37 + 59", "48 + 48", false], ["REJECT pad on one term 37+(59+8-8)", "37 + 59", "37 + (59 + 8 - 8)", false],
  ["REJECT answer 90+6", "37 + 59", "90 + 6", false], ["REJECT false (36+1)+(58+2)", "37 + 59", "(36 + 1) + (58 + 2)", false], ["REJECT answer in product 6*16", "37 + 59", "6 * 16", false],
  ["UNSUPPORTED-by-design two steps 6*15 -> 6*10+6*5", "6 * 15", "6 * 10 + 6 * 5", false],
];
let bB = 0, bR = 0;
for (const [n, p, r, want] of H) { const g = justified(p, r), b = explainNumerals(p, r).ok; if (g !== want) bR++; if (b !== want) bB++; console.log(n.padEnd(52), `want=${want}`.padEnd(11), `v1=${b}`.padEnd(10), `registry=${g}`.padEnd(15), g === want ? "" : "<-- registry disagrees"); }
console.log(`\nheld-out wrong decisions — prototype v1: ${bB}   registry v2: ${bR} (of ${H.length})`);
