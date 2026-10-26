// Benchmark one category per process (so maxRSS is attributable). Usage: bench.ts <category> <n>
import { assessWorking } from "../../../../packages/learning/src/core/working-assessment.ts";
const cat = process.argv[2]; const N = +(process.argv[3] ?? 200); let seed = 99; const r = (n: number) => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % n; };
const V = ["x", "y", "z", "a", "b", "c"]; const L = (vs: string[], k = 2) => { const picked = [...vs].sort(() => r(3) - 1).slice(0, k); return picked.map((v) => `${r(3) + 1}${v}`).join(r(2) ? "+" : "-") + (r(2) ? `+${r(4) + 1}` : ""); };
type Case = { problem: string; lines: string[] };
const gen = (c: string, i: number): Case => {
  const vs3 = ["x", "y", "z"];
  switch (c) {
    case "uni-simple": { const a = `${r(3) + 1}x+${r(5) + 1}`, b = `x-${r(5) + 1}`; return [{ problem: `Expand (${a})(${b})`, lines: [`${a.split("+")[0]}x^2`] }, { problem: `Simplify (x^2-${(r(4) + 1) ** 2})/(x-${r(4) + 1})`, lines: [`x+${r(4) + 1}`] }, { problem: `Factorise x^2+${r(6) + 2}x+${r(6) + 1}`, lines: [`(x+${r(4) + 1})(x+${r(4) + 1})`] }][i % 3]; }
    case "mv-expand": { const k = 2 + (i % 2); const fs = Array.from({ length: k }, () => `(${L(vs3, 2)})`); return { problem: `Expand ${fs.join("")}`, lines: [`${fs.join("")}`, "x"] }; }
    case "rational": { const f = `(${L(vs3, 2)})`; const g = `(${L(vs3, 2)})`; const h = `(${L(vs3, 2)})`; return { problem: `Simplify ${f}${g}/(${f}${h})`, lines: [`${g}/${h}`, `${g}/${h}, ${f} ≠ 0`] }; }
    case "symexp": { const e = ["n", "m", "n+1", "2n", "n-m"]; const a = e[r(5)], b = e[r(5)]; const base = ["x", "2x", "(x+1)", "(a+b)"][r(4)]; return { problem: `Simplify ${base}^(${a})*${base}^(${b})`, lines: [`${base}^(${a}+${b})`] }; }
    case "long-derivation": { const lines: string[] = []; let terms = ["x^2", "2xy", "y^2", "3x", "4y", "5"]; for (let k = 0; k < 30; k++) { terms = [...terms.slice(1), terms[0]]; lines.push(terms.join("+")); } return { problem: `Simplify ${terms.join("+")}`, lines }; }
    case "high-degree": { const d = 10 + (i % 12); return [{ problem: `Expand (x+1)^${d}`, lines: [`(x+1)^${d}`] }, { problem: `Expand (a+b+c)^${6 + (i % 4)}`, lines: [`(a+b+c)^${6 + (i % 4)}`] }, { problem: `Simplify ((x+1)^2+1)^${3 + (i % 3)}`, lines: [`((x+1)^2+1)^${3 + (i % 3)}`] }][i % 3]; }
    case "adversarial": { return [
      { problem: `Expand (a+b+c+d+e+1)^${18 + (i % 8)}`, lines: [`(a+b+c+d+e+1)^${18 + (i % 8)}`] },
      { problem: `Expand (x+1)^${100000 + i}`, lines: ["x"] },
      { problem: `Simplify ${"(".repeat(400)}x+1${")".repeat(400)}`, lines: ["x+1"] },
      { problem: `Expand ${Array.from({ length: 14 }, (_, j) => `(${"abcdefghijklmn"[j]}+1)`).join("")}`, lines: ["a"] },
      { problem: `Simplify (x+y)^(n^8)`, lines: ["x"] },
      { problem: `Simplify ${"x+".repeat(1500)}1`, lines: ["x"] },
      { problem: `Simplify ((a+b+c)^9-1)/((a+b+c)^3-1)`, lines: ["(a+b+c)^6+(a+b+c)^3+1"] },
      { problem: `Simplify ((x+y)^30-(x-y)^30)/((x+y)^6-(x-y)^6)`, lines: ["x"] },
    ][i % 8]; }
  }
  throw new Error("category");
};
const ms: number[] = []; const outcomes: Record<string, number> = {}; const h0 = process.memoryUsage().heapUsed;
for (let i = 0; i < N; i++) { const c = gen(cat, i); const t = performance.now(); let o = "crash"; try { const a = assessWorking(c.problem, c.lines); o = a.outcome + (a.resourceLimit ? "(resource-limit)" : ""); } catch (e: any) { o = "CRASH:" + String(e?.message ?? e).slice(0, 40); } ms.push(performance.now() - t); outcomes[o] = (outcomes[o] ?? 0) + 1; }
const q = (p: number) => ms.slice().sort((a, b) => a - b)[Math.min(ms.length - 1, Math.floor(p * ms.length))];
console.log(JSON.stringify({ cat, n: N, median: +q(0.5).toFixed(2), p95: +q(0.95).toFixed(1), p99: +q(0.99).toFixed(1), max: +Math.max(...ms).toFixed(1), maxRSS_MB: Math.round(process.resourceUsage().maxRSS / 1024), heapDelta_MB: Math.round((process.memoryUsage().heapUsed - h0) / 1048576), outcomes }));
