/**
 * deepen@1: the finer steps inside a step. A question's own steps are often one line where a learner needs four
 * ("Area = ∫₀^3 6(1 − x/3) dx", "94 × 7 = 658"). Nothing is written per question: the calculation in the step's own
 * words is read and worked the way it is taught, and each line of that working becomes a step of help.
 *
 *   whole-number × ÷ + −     by place value: 94 × 7 → 90 × 7, 4 × 7, add; 846 ÷ 6 → hundreds, tens, ones; 478 + 356 →
 *                            hundreds, tens, ones; 834 − 356 → take the hundreds, the tens, the ones
 *   a definite integral      of powers of x (also √x, 1/xⁿ): each term integrated, the antiderivative, its value at the
 *                            upper and the lower limit, the difference
 *   ∫ … dx and d/dx (…)      of powers of x: term by term
 *
 * Every line it writes is checked against the value the step states, or it is not offered: a deepened step can be
 * missing, never wrong. What it cannot read is left as the step was.
 */
import { readExpression, valueOf, variablesOf, type ExprNode } from "./line-check";

export interface Finer { next: string; shown: string }

// ---------------------------------------------------------------- whole numbers, by place value
const places = (n: number): number[] => String(n).split("").map((d, i, a) => Number(d) * 10 ** (a.length - 1 - i)).filter((v) => v > 0);
const sum = (xs: number[]) => xs.reduce((s, x) => s + x, 0);
function arithmetic(a: number, op: string, b: number): Finer[] {
  if (op === "×") {
    const [big, small] = a >= b ? [a, b] : [b, a];
    if (big <= 12 || small < 2) return [];
    // split the one with more places (the other when it is a single digit or a round number)
    const split = places(big).length > 1 ? big : small, keep = split === big ? small : big;
    const parts = places(split);
    if (parts.length < 2) return [];
    const lines: Finer[] = parts.map((p) => ({ next: `Multiply the ${p >= 1000 ? "thousands" : p >= 100 ? "hundreds" : p >= 10 ? "tens" : "ones"}: ${p} × ${keep}.`, shown: `${p} × ${keep} = ${p * keep}` }));
    return [{ next: `Split ${split} by place value.`, shown: `${split} = ${parts.join(" + ")}` }, ...lines, { next: "Add the parts.", shown: `${parts.map((p) => p * keep).join(" + ")} = ${split * keep}` }];
  }
  if (op === "÷") {
    if (b < 2 || a % b !== 0 || a / b <= 12) return [];
    const q = places(a / b);
    if (q.length < 2) return [];
    let left = a;
    const lines: Finer[] = q.map((part) => { const took = part * b; left -= took; return { next: `How many ${b}s fit in ${left + took}? Take a round number of them.`, shown: `${b} × ${part} = ${took}, which leaves ${left}` }; });
    return [...lines, { next: "Add up how many were taken.", shown: `${q.join(" + ")} = ${a / b}` }];
  }
  if (op === "+") {
    if (a < 10 || b < 10 || (a % 10 === 0 && b % 10 === 0 && Math.max(a, b) < 100)) return [];
    const size = Math.max(String(a).length, String(b).length);
    const cols = Array.from({ length: size }, (_, i) => 10 ** (size - 1 - i)).map((p) => [Math.floor(a / p) % 10 * p, Math.floor(b / p) % 10 * p, p]).filter(([x, y]) => x + y > 0);
    if (cols.length < 2) return [];
    const name = (p: number) => (p >= 1000 ? "thousands" : p >= 100 ? "hundreds" : p >= 10 ? "tens" : "ones");
    return [...cols.map(([x, y, p]) => ({ next: `Add the ${name(p)}.`, shown: `${x} + ${y} = ${x + y}` })), { next: "Add the parts.", shown: `${cols.map(([x, y]) => x + y).join(" + ")} = ${a + b}` }];
  }
  if (op === "−") {
    if (a < b || b < 10) return [];
    const parts = places(b);
    if (parts.length < 2) return [];
    let left = a;
    return parts.map((p) => { const from = left; left -= p; return { next: `Take away the ${p >= 1000 ? "thousands" : p >= 100 ? "hundreds" : p >= 10 ? "tens" : "ones"}: ${p}.`, shown: `${from} − ${p} = ${left}` }; });
  }
  return [];
}

// ---------------------------------------------------------------- powers of x
interface Term { c: number; p: number }
const tidy = (ts: Term[]): Term[] => { const m = new Map<number, number>(); for (const t of ts) m.set(t.p, (m.get(t.p) ?? 0) + t.c); return [...m].filter(([, c]) => Math.abs(c) > 1e-12).map(([p, c]) => ({ c, p })).sort((a, b) => b.p - a.p); };
/** An expression as a sum of c·xᵖ, or null when it is not one (a sine, a quotient by a sum, an unknown power). */
function terms(n: ExprNode, v: string): Term[] | null {
  switch (n.k) {
    case "num": return [{ c: n.v, p: 0 }];
    case "var": return n.n === v ? [{ c: 1, p: 1 }] : null;
    case "neg": { const a = terms(n.a, v); return a && a.map((t) => ({ c: -t.c, p: t.p })); }
    case "pm": return null;
    case "fn": { if (n.f !== "sqrt") return null; const a = terms(n.a, v); return a && tidy(a).length === 1 && tidy(a)[0].c > 0 ? [{ c: Math.sqrt(tidy(a)[0].c), p: tidy(a)[0].p / 2 }] : a && !tidy(a).length ? [] : null; }
    case "op": {
      const a = terms(n.a, v), b = terms(n.b, v);
      if (!a || !b) return null;
      if (n.op === "+") return tidy([...a, ...b]);
      if (n.op === "-") return tidy([...a, ...b.map((t) => ({ c: -t.c, p: t.p }))]);
      if (n.op === "*") return a.length * b.length > 40 ? null : tidy(a.flatMap((x) => b.map((y) => ({ c: x.c * y.c, p: x.p + y.p }))));
      if (n.op === "/") { const d = tidy(b); return d.length === 1 ? tidy(a.map((x) => ({ c: x.c / d[0].c, p: x.p - d[0].p }))) : null; }
      // a power: a number as the exponent
      const e = tidy(b);
      if (e.length > 1 || (e.length === 1 && e[0].p !== 0)) return null;
      const k = e.length ? e[0].c : 0, base = tidy(a);
      if (base.length === 1 && (base[0].c > 0 || Number.isInteger(k))) return [{ c: base[0].c ** k, p: base[0].p * k }];
      if (!Number.isInteger(k) || k < 0 || k > 4) return null;
      let out: Term[] = [{ c: 1, p: 0 }];
      for (let i = 0; i < k; i++) out = tidy(out.flatMap((x) => base.map((y) => ({ c: x.c * y.c, p: x.p + y.p }))));
      return out;
    }
  }
}
/** A number as a child writes it: a whole number, or a fraction in lowest terms (null when it is neither, to 1/360). */
function frac(v: number): string | null {
  if (!Number.isFinite(v)) return null;
  for (let d = 1; d <= 360; d++) { const n = Math.round(v * d); if (Math.abs(v * d - n) < 1e-9) return d === 1 ? String(n).replace("-", "−") : `${n < 0 ? "−" : ""}${Math.abs(n)}/${d}`; }
  return null;
}
const SUP: Record<string, string> = { "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹" };
function power(v: string, p: number): string | null {
  if (p === 0) return "";
  if (p === 1) return v;
  if (p === 0.5) return `√${v}`;
  if (Number.isInteger(p) && p >= 2 && p <= 9) return `${v}${SUP[String(p)]}`;
  const f = frac(p);
  return f ? `${v}^(${f})` : null;
}
/** One term as written (6x, −x², x³/3, 4√x); null when it cannot be written simply. */
function termText(t: Term, v: string): string | null {
  const pw = power(v, t.p), c = frac(t.c);
  if (pw === null || c === null) return null;
  if (!pw) return c;
  const neg = c.startsWith("−"), mag = neg ? c.slice(1) : c;
  const [n, d] = mag.split("/");
  return `${neg ? "−" : ""}${n === "1" ? "" : n}${pw}${d ? `/${d}` : ""}`;
}
function sumText(ts: Term[], v: string): string | null {
  if (!ts.length) return "0";
  const parts = ts.map((t) => termText(t, v));
  if (parts.some((p) => p === null)) return null;
  return (parts as string[]).map((p, i) => (i === 0 ? p : p.startsWith("−") ? `− ${p.slice(1)}` : `+ ${p}`)).join(" ");
}
const at = (ts: Term[], x: number) => sum(ts.map((t) => t.c * x ** t.p));
/** The value of a sum of powers at x, written out: 6(3) − 3² = 9. */
function substituted(ts: Term[], x: number): string | null {
  const xs = frac(x), total = frac(at(ts, x));
  if (xs === null || total === null) return null;
  if (x === 0) return total;
  const parts = ts.map((t) => frac(t.c * x ** t.p));
  if (parts.some((p) => p === null)) return null;
  const line = (parts as string[]).map((p, i) => (i === 0 ? p : p.startsWith("−") ? `− ${p.slice(1)}` : `+ ${p}`)).join(" ");
  return ts.length > 1 ? `${line} = ${total}` : total;
}
const antiderivative = (ts: Term[]): Term[] | null => (ts.some((t) => t.p === -1) ? null : ts.map((t) => ({ c: t.c / (t.p + 1), p: t.p + 1 })));
const derivative = (ts: Term[]): Term[] => tidy(ts.filter((t) => t.p !== 0).map((t) => ({ c: t.c * t.p, p: t.p - 1 })));

const SUBS = "₀₁₂₃₄₅₆₇₈₉", SUPS = "⁰¹²³⁴⁵⁶⁷⁸⁹";
const limit = (s: string): number => { const t = [...s.trim().replace(/^\(|\)$/g, "")].map((c) => (c === "₋" || c === "⁻" ? "−" : SUBS.includes(c) ? String(SUBS.indexOf(c)) : SUPS.includes(c) ? String(SUPS.indexOf(c)) : c)).join(""); const n = readExpression(t); return n && !variablesOf(n).length ? valueOf(n, {}) : NaN; };
/** Every definite integral written in a step's words: ∫₀^3 … dx, ∫₋₄⁻³ … dx, with a number in front when there is one. */
function integrals(text: string): Finer[] {
  const out: Finer[] = [];
  // the two ways a step writes its limits: ∫₀^3 … dx (or ∫₋₄⁻³ … dx) and "∫ from 0 to 3 of … dx"
  const found = [
    ...[...text.matchAll(/(\d+(?:\/\d+)?)?\s*∫\s*([₋₀-₉.]+)\s*(?:\^\s*(\([^)]*\)|[-−\d./π]+)|([⁻⁰¹²³⁴⁵⁶⁷⁸⁹]+))\s*(.+?)\s*d([a-z])(?![a-z])/g)].map((m) => [m[0], m[1], m[2], m[3] ?? m[4], m[5], m[6]]),
    ...[...text.matchAll(/(\d+(?:\/\d+)?)?\s*∫\s*from\s+(\S+)\s+to\s+(\S+)\s+of\s+(.+?)\s*d([a-z])(?![a-z])/g)].map((m) => [m[0], m[1], m[2], m[3], m[4], m[5]]),
  ];
  for (const g of found) {
    const m = [g[0], g[1], g[2], g[3], "", g[4], g[5]] as (string | undefined)[] as string[];
    const a = limit(m[2]), b = limit(m[3]), v = m[6], f = readExpression(m[5]);
    const ts = f && variablesOf(f).every((x) => x === v) ? terms(f, v) : null;
    const F = ts && antiderivative(tidy(ts));
    if (!ts || !F || !Number.isFinite(a) || !Number.isFinite(b)) continue;
    const fText = sumText(tidy(ts), v), FText = sumText(F, v), up = substituted(F, b), low = substituted(F, a), value = frac(at(F, b) - at(F, a)), fb = frac(at(F, b)), fa = frac(at(F, a)), as = frac(a), bs = frac(b);
    if ([fText, FText, up, low, value, fb, fa, as, bs].some((x) => x === null)) continue;
    const k = m[1] ? limit(m[1]) : 1;
    const lines: Finer[] = [];
    if (tidy(ts).length > 1 || fText !== m[5].trim()) lines.push({ next: "Write what is being integrated as separate powers of " + v + ".", shown: `${m[5].trim()} = ${fText}` });
    lines.push({ next: `Integrate each term: raise the power by one and divide by the new power.`, shown: `∫ (${fText}) d${v} = ${FText}` });
    lines.push({ next: `Put the upper limit, ${bs}, in for ${v}.`, shown: `At ${v} = ${bs}: ${up}` });
    lines.push({ next: `Put the lower limit, ${as}, in for ${v}.`, shown: `At ${v} = ${as}: ${low}` });
    lines.push({ next: "Upper value minus lower value.", shown: `${fb} − ${fa!.startsWith("−") ? `(${fa})` : fa} = ${value}` });
    if (k !== 1) { const total = frac(k * (at(F, b) - at(F, a))); if (total === null) continue; lines.push({ next: `Multiply by the ${m[1]} in front.`, shown: `${m[1]} × ${value} = ${total}` }); }
    out.push(...lines);
  }
  return out;
}
/** ∫ … dx = … with no limits, and d/dx (…) = …: term by term. */
function termByTerm(text: string): Finer[] {
  const out: Finer[] = [];
  for (const m of text.matchAll(/∫\s*(?![₋₀-₉_])\(?([^=∫]+?)\)?\s*d([a-z])(?![a-z])/g)) {
    const f = readExpression(m[1]), ts = f && variablesOf(f).every((x) => x === m[2]) ? terms(f, m[2]) : null, F = ts && antiderivative(tidy(ts));
    if (!ts || !F || tidy(ts).length < 2) continue;
    const each = tidy(ts).map((t, i) => { const a = termText(t, m[2]), b = termText(F[i], m[2]); return a && b ? `∫ ${a} d${m[2]} = ${b}` : null; });
    const all = sumText(F, m[2]);
    if (each.some((x) => !x) || !all) continue;
    out.push(...(each as string[]).map((shown, i) => ({ next: `Integrate the ${i === 0 ? "first" : "next"} term: raise the power by one and divide by the new power.`, shown })), { next: "Put the terms together and add the constant.", shown: `${all} + C` });
  }
  for (const m of text.matchAll(/d\s*\/\s*d([a-z])\s*\(([^=]+?)\)(?=\s*(?:=|$|[,.;]))/g)) {
    const f = readExpression(m[2]), ts = f && variablesOf(f).every((x) => x === m[1]) ? terms(f, m[1]) : null;
    if (!ts || tidy(ts).length < 2) continue;
    const each = tidy(ts).map((t) => { const a = termText(t, m[1]), b = sumText(derivative([t]), m[1]); return a && b ? `d/d${m[1]} (${a}) = ${b}` : null; });
    const all = sumText(derivative(tidy(ts)), m[1]);
    if (each.some((x) => !x) || !all) continue;
    out.push(...(each as string[]).map((shown, i) => ({ next: `Differentiate the ${i === 0 ? "first" : "next"} term: bring the power down and lower it by one.`, shown })), { next: "Put the terms together.", shown: all });
  }
  return out;
}

/** The finer steps inside one step's words, in order; empty when there is nothing to deepen. */
export function deepen(text: string): Finer[] {
  const calculus = [...integrals(text), ...termByTerm(text)];
  if (calculus.length) return calculus;
  const out: Finer[] = [];
  for (const m of text.replace(/(\d),(?=\d{3}\b)/g, "$1").matchAll(/(?<![\d.\/−-])(\d{1,7})\s*([×÷+−])\s*(\d{1,7})\s*=\s*(\d{1,12})(?![\d.\/])/g)) {
    const a = Number(m[1]), b = Number(m[3]), said = Number(m[4]);
    const truth = m[2] === "×" ? a * b : m[2] === "÷" ? a / b : m[2] === "+" ? a + b : a - b;
    if (truth === said) out.push(...arithmetic(a, m[2], b));
  }
  return out;
}
