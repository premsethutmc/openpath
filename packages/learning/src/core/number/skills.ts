/**
 * Skill-demonstration detectors. They answer "did the working SHOW this skill?", independently of whether the answer is
 * right. Each looks only at the sequence of parsed lines (a transformation between neighbouring lines, or a line's own
 * shape), so a skill is the same skill in any problem or curriculum family.
 */
import { gcdB } from "../../exact/rational.ts";
import { positions, type Node } from "./ast.ts";
import { evaluate, valEq, Fail } from "./eval.ts";

export type SkillId = "common-denominator" | "equivalent-fraction" | "reduce-fraction" | "prime-factorisation" | "unit-conversion" | "index-laws" | "percent-conversion" | "cross-multiplication" | "equal-ratio-scaling";
export const SKILLS: Record<SkillId, string> = {
  "common-denominator": "renaming fractions so they share a denominator",
  "equivalent-fraction": "writing an equivalent fraction by multiplying top and bottom by the same number",
  "reduce-fraction": "reducing a fraction by a common factor",
  "prime-factorisation": "writing a number as a product of primes",
  "unit-conversion": "converting between units",
  "index-laws": "combining powers of the same base",
  "percent-conversion": "converting between a percent and a fraction or decimal",
  "cross-multiplication": "cross-multiplying a proportion",
  "equal-ratio-scaling": "scaling both parts of a ratio by the same factor",
};
const fracs = (n: Node): [bigint, bigint][] => { const o: [bigint, bigint][] = []; for (const p of positions(n)) { const x = p.node; if (x.t === "bin" && x.op === "/" && x.l.t === "num" && x.r.t === "num" && x.l.q.d === 1n && x.r.q.d === 1n) o.push([x.l.q.n, x.r.q.n]); } return o; };
const count = (n: Node, pred: (x: Node) => boolean) => { let c = 0; for (const p of positions(n)) if (pred(p.node)) c++; return c; };
const units = (n: Node) => new Set([...positions(n)].filter((p) => p.node.t === "unit").map((p) => (p.node as Extract<Node, { t: "unit" }>).u));
const eqv = (a: Node, b: Node) => { try { return valEq(evaluate(a), evaluate(b)); } catch (e) { if (e instanceof Fail) return false; throw e; } };
const prime = (n: bigint) => { if (n < 2n) return false; for (let d = 2n; d * d <= n; d++) if (n % d === 0n) return false; return true; };
/** a product/power of primes with at least two prime factors, e.g. 2^2 × 3 or 2 × 2 × 3 */
function primeProduct(n: Node): boolean {
  let leaves = 0, ok = true;
  const go = (x: Node, top: boolean): void => {
    if (x.t === "num") { if (x.q.d === 1n && prime(x.q.n)) leaves++; else ok = false; }
    else if (x.t === "bin" && x.op === "*") { go(x.l, false); go(x.r, false); }
    else if (x.t === "bin" && x.op === "^" && x.l.t === "num" && x.r.t === "num" && prime(x.l.q.n) && x.r.q.d === 1n && x.r.q.n >= 2n) leaves += Number(x.r.q.n);
    else ok = false;
    void top;
  };
  go(n, true); return ok && leaves >= 2;
}
/** transformations between neighbouring lines: `lines[i]` is the whole working, line 0 the problem */
export function demonstrated(lines: Node[][]): Set<SkillId> {
  const got = new Set<SkillId>();
  const sides = lines.flat();
  for (const s of sides) if (s.t !== "ratio" && primeProduct(s)) { // a prime product equal to a number named elsewhere in the working
    let v: ReturnType<typeof evaluate> | null = null; try { v = evaluate(s); } catch { v = null; }
    if (v && v.k === "q" && v.q.d === 1n && v.q.n > 3n && sides.some((o) => o.t === "num" && o.q.d === 1n && o.q.n === (v as { q: { n: bigint } }).q.n)) got.add("prime-factorisation");
  }
  for (let i = 0; i + 1 < lines.length; i++) for (const a of lines[i]) for (const b of lines[i + 1]) {
    const fa = fracs(a), fb = fracs(b);
    if (fa.length >= 2 && new Set(fa.map((f) => f[1])).size > 1 && fb.length >= 2 && new Set(fb.map((f) => f[1])).size === 1 && eqv(a, b)) got.add("common-denominator");
    if (fa.length && fb.length && eqv(a, b)) {
      for (const [n1, d1] of fa) for (const [n2, d2] of fb) {
        if (d2 > d1 && d2 % d1 === 0n && n1 !== 0n && n2 === n1 * (d2 / d1)) got.add("equivalent-fraction");
        if (d2 < d1 && d1 % d2 === 0n && gcdB(n1, d1) > 1n && gcdB(n2, d2) === 1n && n1 === n2 * (d1 / d2)) got.add("reduce-fraction");
      }
    }
    if (eqv(a, b)) {
      const ua = units(a), ub = units(b); if (ua.size && ub.size && [...ua].some((u) => !ub.has(u))) got.add("unit-conversion");
      if (count(a, (x) => x.t === "pct") > 0 && count(b, (x) => x.t === "pct") === 0) got.add("percent-conversion");
      if (count(a, (x) => x.t === "pct") === 0 && count(b, (x) => x.t === "pct") > 0 && lines[0] !== lines[i]) got.add("percent-conversion");
      const pows = (n: Node) => { const m = new Map<string, number>(); for (const p of positions(n)) if (p.node.t === "bin" && p.node.op === "^" && p.node.l.t === "num") m.set(String(p.node.l.q.n) + "/" + p.node.l.q.d, (m.get(String(p.node.l.q.n) + "/" + p.node.l.q.d) ?? 0) + 1); return m; };
      const pa = pows(a), pb = pows(b); for (const [base, c] of pa) if (c >= 2 && (pb.get(base) ?? 0) >= 1 && (pb.get(base) ?? 0) < c) got.add("index-laws");
      if (a.t === "bin" && a.op === "^" && a.l.t === "bin" && a.l.op === "^") got.add("index-laws");
    }
    if (a.t === "ratio" && b.t === "ratio" && a.parts.length === b.parts.length && eqv(a, b)) {
      try { const va = a.parts.map((p) => (evaluate(p) as { q: { n: bigint; d: bigint } }).q), vb = b.parts.map((p) => (evaluate(p) as { q: { n: bigint; d: bigint } }).q);
        const k = (x: { n: bigint; d: bigint }, y: { n: bigint; d: bigint }) => (x.n * y.d) / (x.d * y.n);
        if (va[0].n !== 0n && vb[0].n !== 0n) { const r = vb[0].n * va[0].d; const base = k(vb[0], va[0]); if (base !== 1n && va.every((x, i) => vb[i].n * x.d === base * x.n * vb[i].d && r !== 0n)) got.add("equal-ratio-scaling"); } } catch { /* not numeric parts */ }
    }
  }
  // cross-multiplication: a ratio equation followed, later, by an equation without ratios
  const hasRatio = (l: Node[]) => l.some((x) => x.t === "ratio");
  for (let i = 0; i < lines.length; i++) if (hasRatio(lines[i]) && lines[i].length >= 2) for (let j = i + 1; j < lines.length; j++) if (!hasRatio(lines[j]) && lines[j].length >= 2 && lines[j].some((x) => count(x, (y) => y.t === "bin" && y.op === "*") > 0)) got.add("cross-multiplication");
  return got;
}
