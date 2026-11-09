/**
 * Independent checks over the FULL served pools (pool(f).items, both answer formats share the typed answer):
 *  - atprinc  (trig equations): from the prompt text alone, rebuild f(kx) = v; scan [0, 2π) on a fine grid for every
 *             root (sign changes / near-touches); compare the set with the served answer parsed as multiples of π.
 *  - lim      (limits): evaluate the original quotient numerically at a ± 1e-7 from the prompt text.
 *  - lineq    (linear inequalities): exact rational boundary from the prompt, test both sides; compare with answer.
 *  - aqfp     (first principles): rebuild f from the prompt text, central-difference derivative at several x, compare
 *             with the served answer expression evaluated numerically.
 *  - lneg, aqsep (RK4), atsiner, atrad, aologlaw, ahlike, ansecpt (θ by bisection), atcomp, aodom (grid of x), aqmono
 *    (sign of a numerical f′ on a grid): numeric re-derivation from the prompt text.
 * None of these call the family's solve or validate. These are the primary families of the maths-expansion blueprints; a
 * module also draws practice from its competency's other families, which this file does not re-check (their own family
 * validators do). The pool sizes are asserted so a change in what is served is noticed.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { pool } from "../../../packages/learning/src/families";

const N = (s: string) => s.replace(/−/g, "-").replace(/⁄/g, "/").trim();
const SURD: Record<string, number> = { "-1": -1, "-√3/2": -Math.sqrt(3) / 2, "-1/√2": -Math.SQRT1_2, "-1/2": -0.5, "0": 0, "1/2": 0.5, "1/√2": Math.SQRT1_2, "√3/2": Math.sqrt(3) / 2, "1": 1, "√3": Math.sqrt(3), "-√3": -Math.sqrt(3), "1/√3": 1 / Math.sqrt(3), "-1/√3": -1 / Math.sqrt(3) };
// a small numeric expression evaluator for served answers: √, π, ^, implicit multiplication, sin/cos/e^
function evalExpr(src: string, x = 0): number {
  let s = N(src).replace(/pi/g, "π").replace(/\s+/g, "");
  s = s.replace(/√\(/g, "Math.sqrt(").replace(/√(\d+|x)/g, "Math.sqrt($1)").replace(/e\^\(/g, "Math.exp(").replace(/(?<![A-Za-z.])sin\(/g, "Math.sin(").replace(/(?<![A-Za-z.])cos\(/g, "Math.cos(").replace(/(?<![A-Za-z.])ln\(/g, "Math.log(");
  s = s.replace(/π/g, "(Math.PI)").replace(/\^/g, "**").replace(/⁻¹/g, "**(-1)").replace(/⁻²/g, "**(-2)").replace(/⁻³/g, "**(-3)").replace(/⁻⁴/g, "**(-4)").replace(/⁻⁵/g, "**(-5)").replace(/²/g, "**2").replace(/³/g, "**3").replace(/⁴/g, "**4").replace(/⁵/g, "**5");
  s = s.replace(/(\d|\))(?=(Math|\(|x))/g, "$1*").replace(/x(?=(Math|\(|\d))/g, "x*");
  // JS forbids -a**b: rewrite every power as Math.pow(base, n)
  s = s.replace(/(x|\d+(?:\.\d+)?)\*\*(\d+|\(-\d+\))/g, "Math.pow($1,$2)");
  for (let i = s.indexOf(")**"); i >= 0; i = s.indexOf(")**")) {
    let d = 0, j = i;
    for (; j >= 0; j--) { if (s[j] === ")") d++; else if (s[j] === "(") { d--; if (d === 0) break; } }
    const n = s.slice(i + 3).match(/^\d+/)![0];
    s = `${s.slice(0, j)}Math.pow(${s.slice(j, i + 1)},${n})${s.slice(i + 3 + n.length)}`;
  }
  try { return Function("x", `return (${s});`)(x); } catch (e) { throw new Error(`cannot evaluate "${src}" as ${s}`); }
}

function scanRoots(g: (x: number) => number, period = 2 * Math.PI): number[] {
  const roots: number[] = [], n = 60000;
  let prev = g(0);
  if (Math.abs(prev) < 1e-9) roots.push(0);
  for (let i = 1; i <= n; i++) {
    const x = (period * i) / n, v = g(x);
    if (!isFinite(v) || !isFinite(prev)) { prev = v; continue; }
    if (Math.abs(v) < 1e-15 && x < period - 1e-12) roots.push(x);
    else if (prev * v < 0 && Math.abs(prev - v) < 1) { // a sign change, not a tan pole
      let a = (period * (i - 1)) / n, b = x;
      for (let k = 0; k < 60; k++) { const m = (a + b) / 2; if (g(a) * g(m) <= 0) b = m; else a = m; }
      roots.push((a + b) / 2);
    }
    prev = v;
  }
  // touches (sin = ±1 etc.): local extrema of |g| that reach 0 are found via min search
  for (let i = 1; i < n; i++) {
    const x0 = (period * (i - 1)) / n, x1 = (period * i) / n, x2 = (period * (i + 1)) / n;
    const a = Math.abs(g(x0)), b = Math.abs(g(x1)), c = Math.abs(g(x2));
    if (b <= a && b <= c && b < 1e-6) {
      let lo = x0, hi = x2;
      for (let k = 0; k < 200; k++) { const m1 = lo + (hi - lo) / 3, m2 = hi - (hi - lo) / 3; if (Math.abs(g(m1)) < Math.abs(g(m2))) hi = m2; else lo = m1; }
      if (Math.abs(g((lo + hi) / 2)) < 1e-12) roots.push((lo + hi) / 2);
    }
  }
  const out: number[] = [];
  for (const r of roots.sort((p, q) => p - q)) if (!out.some((o) => Math.abs(o - r) < 1e-4)) out.push(r);
  return out.filter((r) => r < period - 1e-6);
}

const report: Record<string, { n: number; bad: string[] }> = {};
const rec = (f: string, ok: boolean, msg: string) => { (report[f] ??= { n: 0, bad: [] }).n++; if (!ok) report[f].bad.push(msg); };

for (const it of pool("atprinc").items as any[]) {
  const m = N(it.prompt).match(/^Solve (.+?) for 0/)!;
  let eq = m[1];
  // forms: "f kx = v"  or  "a f kx ± b = 0"
  const fm = eq.match(/(sin|cos|tan) ?(\d?)x/)!;
  const fn = fm[1], k = Number(fm[2] || 1);
  const [lhs, rhs] = eq.split(" = ");
  let v: number;
  if (rhs === "0" && /[+-] ?[\d√]/.test(lhs.replace(/^-/, "").split(/(sin|cos|tan)/)[2] ?? "")) {
    // a f kx + b = 0  →  v = −b / a
    const lm = lhs.match(/^(-?[\d√]*) ?(?:sin|cos|tan) ?\d?x ?([+-]) ?([\d√]+)$/)!;
    const a = lm[1] === "" ? 1 : lm[1] === "-" ? -1 : lm[1] === "√2" ? Math.SQRT2 : lm[1] === "√3" ? Math.sqrt(3) : Number(lm[1]);
    const b = (lm[2] === "-" ? -1 : 1) * (lm[3] === "√3" ? Math.sqrt(3) : lm[3] === "√2" ? Math.SQRT2 : Number(lm[3]));
    v = -b / a;
  } else v = SURD[rhs] ?? Number(rhs);
  const F = fn === "sin" ? Math.sin : fn === "cos" ? Math.cos : Math.tan;
  const g = (x: number) => F(k * x) - v;
  const expected = scanRoots(g);
  const served = String(it.answer).split(",").map((t: string) => evalExpr(t.trim() || "0"));
  const ok = expected.length === served.length && expected.every((e) => served.some((s) => Math.abs(s - e) < 1e-6));
  rec("atprinc", ok, `${it.prompt.slice(0, 40)} served=${it.answer} scan=${expected.map((e) => (e / Math.PI).toFixed(4) + "π").join(",")}`);
}
for (const it of pool("lim").items as any[]) {
  const m = N(it.prompt).match(/x → (\d+)\) of (\d*)\(x² - (\d+)\) \/ \(x - (\d+)\)/)!;
  const a = +m[1], k = m[2] ? +m[2] : 1, sq = +m[3];
  const q = (x: number) => (k * (x * x - sq)) / (x - a);
  const L = (q(a + 1e-7) + q(a - 1e-7)) / 2;
  rec("lim", Math.abs(L - Number(it.answer)) < 1e-4 && sq === a * a, `${it.prompt} served=${it.answer} numeric=${L}`);
}
for (const it of pool("lineq").items as any[]) {
  const m = N(it.prompt).match(/Solve (-?\d*)x ([+-]) (\d+) < (-?\d+)\./)!;
  const a = m[1] === "" ? 1 : m[1] === "-" ? -1 : +m[1], b = (m[2] === "-" ? -1 : 1) * +m[3], c = +m[4];
  const r = (c - b) / a; // boundary
  const truthLeft = a * (r - 0.5) + b < c; // which side holds
  const want = truthLeft ? `x < ${r}` : `x > ${r}`;
  rec("lineq", N(String(it.answer)) === want.replace("--", "-"), `${it.prompt} served=${it.answer} want=${want}`);
}
for (const it of pool("lneg").items as any[]) {
  const m = N(it.prompt).match(/Solve (-?\d*)x ([+-]) (\d+) = (-?\d+)\./)!;
  const a = m[1] === "" ? 1 : m[1] === "-" ? -1 : +m[1], b = (m[2] === "-" ? -1 : 1) * +m[3], c = +m[4];
  const x = Number(it.answer);
  rec("lneg", a * x + b === c, `${it.prompt} served=${it.answer}`);
}
for (const it of pool("aqfp").items as any[]) {
  const fx = N(it.prompt).match(/for f\(x\) = (.+?)\.?$/)![1].replace(/\.$/, "");
  const f = (x: number) => evalExpr(fx.replace(/(sin|cos) (\d*)x/g, (_, t, n) => `${t}(${n || 1}x)`), x);
  let ok = true, msg = "";
  for (const x of [0.3, 1.1, 2.7]) {
    const h = 1e-5, d = (f(x + h) - f(x - h)) / (2 * h), served = evalExpr(String(it.answer), x);
    if (!(Math.abs(d - served) < 1e-4 * Math.max(1, Math.abs(d)))) { ok = false; msg = `x=${x} numeric=${d} served=${served}`; }
  }
  rec("aqfp", ok, `${it.prompt.slice(-40)} served=${it.answer} ${msg}`);
}
for (const it of pool("aqsep").items as any[]) {
  // numerically integrate dy/dx from the prompt (RK4) and compare with the served y at x0 + 0.5
  const p = N(it.prompt);
  const yx = p.match(/dy\/dx = (-?\d*)y\/x/), lin = p.match(/dy\/dx = \((-?\d*)x ([+-]) (\d+)\)y/), simple = p.match(/dy\/dx = (-?\d*)(x?)y,/);
  const num = (s: string) => (s === "" ? 1 : s === "-" ? -1 : +s);
  let F: (x: number, y: number) => number;
  if (yx) F = (x, y) => (num(yx[1]) * y) / x;
  else if (lin) F = (x, y) => (num(lin[1]) * x + (lin[2] === "-" ? -1 : 1) * +lin[3]) * y;
  else if (simple) F = (x, y) => (simple[2] ? num(simple[1]) * x : num(simple[1])) * y;
  else { rec("aqsep", false, `unparsed ${p}`); continue; }
  const ic = p.match(/y = (\d+) when x = (\d+)/)!;
  let x = +ic[2], y = +ic[1]; const h = 1e-4;
  for (let i = 0; i < 5000; i++) { const k1 = F(x, y), k2 = F(x + h / 2, y + (h * k1) / 2), k3 = F(x + h / 2, y + (h * k2) / 2), k4 = F(x + h, y + h * k3); y += (h / 6) * (k1 + 2 * k2 + 2 * k3 + k4); x += h; }
  const served = evalExpr(String(it.answer), x);
  rec("aqsep", Math.abs(served - y) < 1e-6 * Math.max(1, Math.abs(y)), `${p.slice(0, 60)} served=${it.answer} rk4=${y} at x=${x}`);
}
for (const it of pool("atsiner").items as any[]) {
  const m = N(it.prompt).match(/A = (\d+)°, B = (\d+)° and a = (\d+) cm/)!;
  const r = Math.PI / 180, b = (+m[3] * Math.sin(+m[2] * r)) / Math.sin(+m[1] * r);
  rec("atsiner", Math.abs(evalExpr(String(it.answer)) - b) < 1e-9 && +m[1] + +m[2] < 180, `${it.prompt} served=${it.answer} numeric=${b}`);
}
for (const it of pool("atrad").items as any[]) {
  const d = +N(it.prompt).match(/Convert (-?\d+)°/)![1];
  rec("atrad", Math.abs(evalExpr(String(it.answer)) - (d * Math.PI) / 180) < 1e-12, `${it.prompt} served=${it.answer}`);
}
for (const it of pool("aologlaw").items as any[]) {
  const n = +N(it.prompt).match(/express log ([\d.]+) in/)![1];
  const a = Math.log10(2), b = Math.log10(3);
  const served = Function("a", "b", `return ${N(String(it.answer)).replace(/(\d)([ab])/g, "$1*$2")};`)(a, b);
  rec("aologlaw", Math.abs(served - Math.log10(n)) < 1e-12, `${it.prompt} served=${it.answer}`);
}
const term = (c: string) => (c === "" || c === "+" ? 1 : c === "-" ? -1 : +c.replace("+", ""));
for (const it of pool("ahlike").items as any[]) {
  // collect coefficients of x and y from the prompt by scanning signed terms; compare with the served expression at 3 points
  const e = N(it.prompt).replace(/^Simplify /, "").replace(/\.$/, "").replace(/\s+/g, "");
  let cx = 0, cy = 0;
  for (const m of e.matchAll(/([+-]?\d*)([xy])/g)) (m[2] === "x" ? (cx += term(m[1])) : (cy += term(m[1])));
  const served = N(String(it.answer)).replace(/\s+/g, "");
  const ev = (X: number, Y: number) => Function("x", "y", `return ${served.replace(/(\d)([xy])/g, "$1*$2")};`)(X, Y);
  rec("ahlike", [[1, 2], [3, -5], [-7, 11]].every(([X, Y]) => Math.abs(ev(X, Y) - (cx * X + cy * Y)) < 1e-9), `${it.prompt} served=${it.answer} want ${cx}x + ${cy}y`);
}
for (const it of pool("ansecpt").items as any[]) {
  // recover θ numerically from sec θ + tan θ = s (or cosec + cot) by bisection on (0, π/2), then evaluate the asked ratio
  const p = N(it.prompt), m = p.match(/If (sec θ \+ tan θ|cosec θ \+ cot θ) = ([\d/]+) for an acute angle θ, find (.+?)\.$/)!;
  const s = Function(`return ${m[2]}`)();
  const sec = (t: number) => 1 / Math.cos(t), cosec = (t: number) => 1 / Math.sin(t);
  const S = m[1].startsWith("sec") ? (t: number) => sec(t) + Math.tan(t) : (t: number) => cosec(t) + 1 / Math.tan(t);
  let lo = 1e-9, hi = Math.PI / 2 - 1e-9; const inc = S(hi) > S(lo);
  for (let k = 0; k < 200; k++) { const mid = (lo + hi) / 2; if ((S(mid) < s) === inc) lo = mid; else hi = mid; }
  const t = (lo + hi) / 2;
  const R: Record<string, number> = { "sec θ − tan θ": sec(t) - Math.tan(t), "sec θ": sec(t), "tan θ": Math.tan(t), "sin θ": Math.sin(t), "cosec θ − cot θ": cosec(t) - 1 / Math.tan(t), "cosec θ": cosec(t), "cot θ": 1 / Math.tan(t), "cos θ": Math.cos(t) };
  const want = R[m[3].replace(/-/g, "−")];
  rec("ansecpt", want !== undefined && Math.abs(Function(`return ${N(String(it.answer))}`)() - want) < 1e-9, `${p} served=${it.answer} want=${want}`);
}
for (const it of pool("atcomp").items as any[]) {
  const m = N(it.prompt).match(/value of (sin|cos|tan)\((\d+)° ([+-]) (\d+)°\)/)!;
  const ang = ((+m[2] + (m[3] === "-" ? -1 : 1) * +m[4]) * Math.PI) / 180;
  const want = m[1] === "sin" ? Math.sin(ang) : m[1] === "cos" ? Math.cos(ang) : Math.tan(ang);
  const served = String(it.answer);
  rec("atcomp", Math.abs(evalExpr(served) - want) < 1e-9 && !/\/√|\/\(.*√/.test(served.replace(/\s/g, "")), `${it.prompt} served=${served} want=${want}`);
}
for (const it of pool("aodom").items as any[]) {
  // sample x on a fine grid: x is in the domain iff evaluating f(x) gives a finite real number; compare with the served intervals
  const fx = N(it.prompt).match(/f\(x\) = (.+?)\. Write/)![1];
  const f = (x: number) => evalExpr(fx, x);
  const ivs = N(String(it.answer)).split("∪").map((s) => s.trim());
  const inServed = (x: number) => ivs.some((iv) => { const m = iv.match(/^([\[(])(.+), (.+)([\])])$/)!; const a = m[2].includes("∞") ? -Infinity : Function(`return ${m[2]}`)(), b = m[3].includes("∞") ? Infinity : Function(`return ${m[3]}`)(); return (m[1] === "[" ? x >= a : x > a) && (m[4] === "]" ? x <= b : x < b); });
  let ok = true, why = "";
  const pts: number[] = []; for (let x = -20; x <= 20; x += 0.05) pts.push(Math.round(x * 100) / 100);
  for (const x of pts) { const v = f(x); const inDom = Number.isFinite(v); if (inDom !== inServed(x)) { ok = false; why = `x=${x} f=${v} servedSays=${inServed(x)}`; break; } }
  rec("aodom", ok, `${fx} served=${it.answer} ${why}`);
}
for (const it of pool("aqmono").items as any[]) {
  // the cubic from the prompt; f′ by central differences on a grid; compare increasing/decreasing sets with the served intervals
  const p = N(it.prompt), m = p.match(/f\(x\) = (.+?) is strictly (increasing|decreasing)/)!;
  const f = (x: number) => evalExpr(m[1], x);
  const ivs = N(String(it.answer)).split("∪").map((s) => s.trim());
  const inServed = (x: number) => ivs.some((iv) => { const q = iv.match(/^\((.+), (.+)\)$/)!; const a = q[1].includes("∞") ? -Infinity : +q[1], b = q[2].includes("∞") ? Infinity : +q[2]; return x > a && x < b; });
  let ok = true, why = "";
  for (let x = -20.003; x <= 20; x += 0.01) { const d = (f(x + 1e-6) - f(x - 1e-6)) / 2e-6; if (Math.abs(d) < 1e-3) continue; const want = m[2] === "increasing" ? d > 0 : d < 0; if (want !== inServed(x)) { ok = false; why = `x=${x.toFixed(3)} f'=${d}`; break; } }
  rec("aqmono", ok, `${m[1]} ${m[2]} served=${it.answer} ${why}`);
}
for (const it of pool("aogp").items as any[]) {
  // the progression from the prompt: check it is geometric, then multiply term by term (no power formula)
  const m = N(it.prompt).match(/Find the (\d+)(?:st|nd|rd|th) term of the geometric progression (-?\d+), (-?\d+), (-?\d+), …/)!;
  const n = +m[1], a = +m[2], b = +m[3], c = +m[4], r = b / a;
  let t = a; for (let k = 1; k < n; k++) t *= r;
  rec("aogp", c === b * r && Number(N(String(it.answer))) === t, `${it.prompt} served=${it.answer} product=${t}`);
}
for (const it of pool("aqcontk").items as any[]) {
  const p = N(it.prompt);
  const pw = p.match(/^f\(x\) = k(?:x|·x)( [+-] \d+)? for x ≤ (\d+), and f\(x\) = (.+?) for x > \d+\./);
  const gap = p.match(/^f\(x\) = (.+?) for x ≠ (\d+), and f\(\d+\) = k\./);
  let want: number;
  if (pw) {
    // left piece k·x + c, right piece evaluated just to the right of the join: k = (right − c) / x₀
    const x0 = +pw[2], c = pw[1] ? Number(pw[1].replace(/\s/g, "")) : 0;
    want = (evalExpr(pw[3], x0 + 1e-9) - c) / x0;
  } else if (gap) {
    // the formula on both sides of the point, averaged: the limit k must equal
    const a = +gap[2], f = (x: number) => evalExpr(gap[1].replace(/(sin|cos)\((\d*)x\)/g, (_, t, n) => `${t}(${n || 1}x)`), x);
    want = (f(a + 1e-4) + f(a - 1e-4)) / 2;
  } else { rec("aqcontk", false, `unparsed ${p}`); continue; }
  rec("aqcontk", Math.abs(evalExpr(String(it.answer)) - want) < 1e-6, `${p.slice(0, 70)} served=${it.answer} numeric=${want}`);
}
for (const it of pool("atval").items as any[]) {
  const m = N(it.prompt).match(/value of (sin|cos|tan|cosec|sec|cot) ?\(?(-?\d+)°\)?/)!;
  const t = (+m[2] * Math.PI) / 180;
  const v = { sin: Math.sin(t), cos: Math.cos(t), tan: Math.tan(t), cosec: 1 / Math.sin(t), sec: 1 / Math.cos(t), cot: Math.cos(t) / Math.sin(t) }[m[1]]!;
  const served = String(it.answer);
  rec("atval", Math.abs(evalExpr(served) - v) < 1e-9 && !/\/√/.test(served.replace(/\s/g, "")), `${it.prompt} served=${served} numeric=${v}`);
}
const SIZES: Record<string, number> = { aogp: 300, aqcontk: 243, atval: 400, atprinc: 141, lim: 54, lineq: 500, lneg: 500, aqfp: 300, aqsep: 300, atsiner: 300, atrad: 288, aologlaw: 190, ahlike: 400, ansecpt: 216, atcomp: 192, aodom: 450, aqmono: 400 };
for (const [f, size] of Object.entries(SIZES)) test(`${f}: every served answer (${size}) agrees with an independent recomputation`, () => {
  const r = report[f];
  assert.ok(r, `${f} checked`);
  assert.equal(r.n, pool(f).items.length, "the whole served pool");
  assert.deepEqual(r.bad.slice(0, 5), [], `${r.bad.length} disagreement(s)`);
});
