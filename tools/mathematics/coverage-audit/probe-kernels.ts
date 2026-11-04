// Gate 5 probe R3: do the EXISTING typed kernels (via the unified engine entry point) establish the stored answer of REAL generated questions from unrelated families?
// The only new code is the per-family mapping prompt -> typed problem (the "adapter"); each demo checks: stored answer verified, a perturbed answer not verified. Usage: bun probe-kernels.ts inv-base.json out.json
import { readFileSync, writeFileSync } from "node:fs";
import { assessMathematicalWorking } from "../../../packages/learning/src/unified-math-engine.ts";
const inv = new Map((JSON.parse(readFileSync(process.argv[2], "utf8")) as any[]).map((f) => [f.family, f]));
const nums = (s: string) => (s.replace(/−/g, "-").match(/-?\d+(?:\.\d+)?(?:\/\d+)?/g) ?? []);
const rat = (s: string) => s.replace(/−/g, "-");
const toRat = (x: string) => { const m = x.match(/^(-?)(\d+)\.(\d+)$/); if (!m) return x; const den = 10n ** BigInt(m[3].length), num = BigInt(m[2] + m[3]); const g = (a: bigint, b: bigint): bigint => (b ? g(b, a % b) : a); const d = g(num, den); return `${m[1]}${num / d}${den / d === 1n ? "" : "/" + den / d}`; };
const bump = (v: string) => { const n = Number(v); return Number.isInteger(n) ? String(n + 1) : v + "1"; };
type Demo = { family: string; kernel: string; build: (prompt: string, answer: string) => { problem: any; step: (v: string) => any } | null };
const direct = (kind: string, value: string) => [{ id: "s0", rule: "direct", result: { kind, value }, dependencies: [] }];
const P = (area: string, task: string, data: any, assumptions: string[] = []) => ({ domain: "probability-statistics", area, task, data, assumptions });
const demos: Demo[] = [
  { family: "akmed", kernel: "B1 statistics", build: (p, a) => { const v = nums(p.split(":")[1]).map(Number); return { problem: P("statistics", "median", { values: v, frequencies: v.map(() => 1) }), step: (x) => direct("rational", toRat(x)) }; } },
  { family: "akmode", kernel: "B1 statistics", build: (p, a) => { const v = nums(p.split(":").pop()!.split(".")[0]).map(Number); return { problem: P("statistics", "mode", { values: v, frequencies: v.map(() => 1) }), step: (x) => direct("rational", x) }; } },
  { family: "aonpr", kernel: "B1 combinatorics", build: (p) => { const m = p.match(/arranging (\d+) of (\d+)/)!; return { problem: P("combinatorics", "permutation", { n: +m[2], r: +m[1] }, ["ordered"]), step: (x) => direct("integer", x) }; } },
  { family: "aoncr", kernel: "B1 combinatorics", build: (p) => { const m = p.match(/choosing (\d+) of (\d+)/)!; return { problem: P("combinatorics", "combination", { n: +m[2], r: +m[1] }, ["unordered"]), step: (x) => direct("integer", x) }; } },
  { family: "anbag", kernel: "B1 probability", build: (p, a) => { const m = [...p.matchAll(/(\d+) (red|blue|green|yellow|white|black)/g)].map((x) => +x[1]); const col = (p.match(/that it is (\w+)/) ?? [])[1]; const g = +(p.match(new RegExp(`(\\d+) ${col}`)) ?? [])[1]; return { problem: P("probability", "finite", { favourable: g, total: m.reduce((s, x) => s + x, 0) }, ["equiprobable"]), step: (x) => direct("rational", x) }; } },
  { family: "audt3", kernel: "B2 determinant", build: (p) => { if (!/determinant of A =/.test(p)) return null; const r = nums(p.split("=").slice(1).join("=")).map(rat); const a = [r.slice(0, 3), r.slice(3, 6), r.slice(6, 9)]; return { problem: { domain: "linear-algebra", area: "determinant", task: "determinant", data: { a }, assumptions: [] }, step: (x) => [{ id: "s0", rule: "cofactor-expansion", result: { kind: "scalar", value: x }, dependencies: [] }] }; } },
  { family: "apmmul", kernel: "B2 matrix", build: (p) => { const r = nums(p.split("Find")[0]).map(rat); return { problem: { domain: "linear-algebra", area: "matrix", task: "multiply", data: { a: [r.slice(0, 2), r.slice(2, 4)], b: [r.slice(4, 6), r.slice(6, 8)] }, assumptions: [] }, step: (x) => [{ id: "s0", rule: "component-wise", result: { kind: "matrix", value: JSON.parse(x.replace(/−/g, "-").replace(/(-?\d+(?:\.\d+)?(?:\/\d+)?)/g, '"$1"')) }, dependencies: [] }] }; } },
  { family: "apn", kernel: "M2 sequence", build: (p) => { const v = nums(p.split("starts")[1].split("…")[0]).map(Number); const n = +(p.match(/term number (\d+)/) ?? [])[1]; return { problem: { domain: "sequence-series", task: "ap-term", first: String(v[0]), difference: String(v[1] - v[0]), n }, step: (x) => [{ kind: "claim", result: { kind: "exact", value: { rational: x } }, method: "independent formula" }] }; } },
  { family: "aogp", kernel: "M2 sequence", build: (p) => { const v = nums(p.split("progression")[1]).map(Number); const n = +(p.match(/(\d+)(?:st|nd|rd|th) term/) ?? [])[1]; return { problem: { domain: "sequence-series", task: "gp-term", first: String(v[0]), ratio: String(v[1] / v[0]), n }, step: (x) => [{ kind: "claim", result: { kind: "exact", value: { rational: x } }, method: "independent formula" }] }; } },
  { family: "cdist", kernel: "M1 coordinate", build: (p, a) => { const v = nums(p); return { problem: { domain: "coordinate", task: "distance", points: [{ x: rat(v[0]), y: rat(v[1]) }, { x: rat(v[2]), y: rat(v[3]) }] }, step: (x) => [{ kind: "value", value: x }] }; } },
  { family: "lineq", kernel: "M1 inequality", build: (p) => { const m = rat(p).match(/Solve (-?\d*)x ([+-]) (\d+) ([<>]=?) (-?\d+)/); if (!m) return null; const a = m[1] === "" ? 1 : m[1] === "-" ? -1 : +m[1], b = (m[2] === "-" ? -1 : 1) * +m[3], rel = m[4], c = +m[5]; return { problem: { domain: "inequality", parts: [{ numerator: [String(b - c), String(a)], relation: rel }] }, step: (x) => { const t = rat(x).match(/x ([<>]=?) (-?[\d/.]+)/)!; const val = t[2]; const rev = a < 0; const inc = t[1].includes("="); const gt = t[1][0] === ">"; return [{ kind: "solution-set", intervals: [gt ? { min: val, max: null, includeMin: inc, includeMax: false } : { min: null, max: val, includeMin: false, includeMax: inc }] }]; } }; } },
  { family: "cint", kernel: "calculus-core definite integral", build: (p) => { const m = rat(p).match(/∫ from (-?\d+) to (-?\d+) of (-?\d+) dx/); if (!m) return null; return { problem: { domain: "calculus", task: "definite-integral", integrand: { kind: "constant", value: m[3] }, variable: "x", lower: m[1], upper: m[2] }, step: (x) => [{ id: "s0", rule: "independent exact rule", claim: { kind: "value", value: x } }] }; } },
  { family: "audfp", kernel: "calculus-core definite integral", build: (p) => { const m = rat(p).match(/∫ from (-?\d+) to (-?\d+) of \((-?\d+)x \+ (-?\d+)\) dx/); if (!m) return null; const X = { kind: "variable", name: "x" }; return { problem: { domain: "calculus", task: "definite-integral", integrand: { kind: "add", terms: [{ kind: "multiply", factors: [{ kind: "constant", value: m[3] }, X] }, { kind: "constant", value: m[4] }] }, variable: "x", lower: m[1], upper: m[2] }, step: (x) => [{ id: "s0", rule: "independent exact rule", claim: { kind: "value", value: x } }] }; } },
];
const res: any[] = [];
for (const d of demos) {
  const f = inv.get(d.family); if (!f) { res.push({ family: d.family, error: "family not found" }); continue; }
  const r = { family: d.family, kernel: d.kernel, samples: 0, built: 0, storedVerified: 0, wrongRejected: 0, errors: [] as string[] };
  for (const s of f.samples) {
    r.samples++;
    try {
      const m = d.build(s.prompt, String(s.answer)); if (!m) { r.errors.push("could not map prompt"); continue; } r.built++;
      const ans = String(s.answer).replace(/−/g, "-");
      const ok = await assessMathematicalWorking(m.problem, m.step(ans)); if (ok.classification === "verified") r.storedVerified++; else r.errors.push(`stored ${ans}: ${ok.classification}`);
      const wrong = d.family === "apmmul" ? JSON.stringify([[0, 0], [0, 0]]) : d.family === "lineq" ? ans.replace(/(-?[\d/.]+)$/, (x) => bump(x)) : bump(ans.replace(/[^\d./-]/g, "") || "0");
      const bad = await assessMathematicalWorking(m.problem, m.step(wrong)); if (bad.classification !== "verified") r.wrongRejected++; else r.errors.push(`WRONG ACCEPTED ${wrong}`);
    } catch (e) { r.errors.push(String((e as Error).message).slice(0, 80)); }
  }
  res.push(r);
}
writeFileSync(process.argv[3], JSON.stringify(res, null, 1));
for (const r of res) console.log(`${r.family.padEnd(7)} ${String(r.kernel).padEnd(26)} built ${r.built}/${r.samples} stored-verified ${r.storedVerified} wrong-rejected ${r.wrongRejected} ${r.errors.slice(0, 2).join(" | ")}`);
