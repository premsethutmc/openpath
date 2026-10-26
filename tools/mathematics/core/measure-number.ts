/** Latency of the exact-number engine on routine student working (warm Node, one process). */
import { assessNumberWorking } from "../../../packages/learning/src/core/number/index.ts";
const W: [string, string[], any?][] = [
  ["3/4 + 1/6", ["9/12 + 2/12", "11/12"], { requiredSkills: ["common-denominator"] }], ["3/4 + 1/6", ["4/10"]], ["12 × 15 ÷ 18", ["12 × 5/6", "10"]],
  ["Write 84 as a product of prime factors", ["84 = 2 × 42", "42 = 2 × 21", "21 = 3 × 7", "2^2 × 3 × 7"]], ["x : 12 = 3 : 4", ["4x = 36", "x = 9"]],
  ["250 g + 1.5 kg", ["1750 g"]], ["2^3 × 2^4", ["2^12"]], ["8 − 3 × 2 + 1", ["11"]], ["lcm(8, 12)", ["96"]], ["123456789 × 987654321", ["121932631112635269"]],
];
const t: number[] = [];
for (let r = 0; r < 300; r++) for (const [p, l, o] of W) { const s = performance.now(); assessNumberWorking(p, l, o); t.push(performance.now() - s); }
t.sort((a, b) => a - b);
console.log(JSON.stringify({ calls: t.length, meanMs: +(t.reduce((a, b) => a + b, 0) / t.length).toFixed(3), p50Ms: +t[t.length >> 1].toFixed(3), p95Ms: +t[Math.floor(t.length * 0.95)].toFixed(3), maxMs: +t[t.length - 1].toFixed(2) }));
