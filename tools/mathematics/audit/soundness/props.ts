// Randomised property checks of Poly / RatFun against an INDEPENDENT bigint Fraction implementation (written here, not imported).
import { Poly, RatFun } from "/home/claude/k052/packages/learning/src/reasoner/domain/poly.ts";
import { Rational } from "/home/claude/k052/packages/learning/src/math-kernel.ts";

type F = [bigint, bigint]; // n/d, d>0, reduced
const g = (a: bigint, b: bigint): bigint => { a = a < 0n ? -a : a; b = b < 0n ? -b : b; while (b) [a, b] = [b, a % b]; return a; };
const fr = (n: bigint, d = 1n): F => { if (d < 0n) { n = -n; d = -d; } const k = g(n, d) || 1n; return [n / k, d / k]; };
const fadd = (a: F, b: F) => fr(a[0] * b[1] + b[0] * a[1], a[1] * b[1]);
const fmul = (a: F, b: F) => fr(a[0] * b[0], a[1] * b[1]);
const fsub = (a: F, b: F) => fadd(a, [-b[0], b[1]]);
const fdiv = (a: F, b: F) => fr(a[0] * b[1], a[1] * b[0]);
const feq = (a: F, b: F) => a[0] === b[0] && a[1] === b[1];
const fstr = (a: F) => `${a[0]}/${a[1]}`;
type P = F[]; // independent poly: coefficient array low->high, trimmed
const trim = (p: P): P => { const q = p.slice(); while (q.length && q[q.length - 1][0] === 0n) q.pop(); return q; };
const pmul = (a: P, b: P): P => { if (!a.length || !b.length) return []; const r: P = Array.from({ length: a.length + b.length - 1 }, () => fr(0n)); a.forEach((x, i) => b.forEach((y, j) => { r[i + j] = fadd(r[i + j], fmul(x, y)); })); return trim(r); };
const peval = (p: P, x: F): F => p.reduceRight((acc, c) => fadd(fmul(acc, x), c), fr(0n));
const monic = (p: P): P => { const l = p[p.length - 1]; return p.map((c) => fdiv(c, l)); };
const lin = (r: F): P => [fr(-r[0], r[1]), fr(1n)];
const toMine = (p: Poly): P => p.c.map((c) => fr(c.numBig, c.denBig));
const fromMine = (p: P): Poly => new Poly(p.map((c) => new Rational(c[0], c[1])));
const peq = (a: P, b: P) => a.length === b.length && a.every((c, i) => feq(c, b[i]));

let seed = 12345; const rnd = (n: number) => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return (seed >> 8) % n; };
const ROOTS: F[] = [fr(0n), fr(1n), fr(-1n), fr(2n), fr(-3n), fr(1n, 2n), fr(-2n, 3n), fr(7n, 13n), fr(5n), fr(-9n, 4n), fr(100n)];
const QUADS: P[] = [[fr(1n), fr(0n), fr(1n)], [fr(-2n), fr(0n), fr(1n)], [fr(1n), fr(1n), fr(1n)], [fr(-3n), fr(0n), fr(1n)], [fr(5n), fr(2n), fr(1n)]];
const pick = <T,>(xs: T[], k: number) => { const a = xs.slice(); const out: T[] = []; for (let i = 0; i < k && a.length; i++) out.push(a.splice(rnd(a.length), 1)[0]); return out; };
interface Spec { roots: { r: F; m: number }[]; quads: P[]; content: F }
const build = (s: Spec): P => { let p: P = [s.content]; for (const { r, m } of s.roots) for (let i = 0; i < m; i++) p = pmul(p, lin(r)); for (const q of s.quads) p = pmul(p, q); return trim(p); };
const randSpec = (rootPool: F[], quadPool: P[]): Spec => ({ roots: pick(rootPool, rnd(4)).map((r) => ({ r, m: 1 + rnd(3) })), quads: pick(quadPool, rnd(2)), content: fr(BigInt(1 + rnd(9)) * (rnd(2) ? 1n : -1n), BigInt(1 + rnd(5))) });

const fails: string[] = []; const counts: Record<string, number> = {};
const ck = (name: string, ok: boolean, ctx: () => string) => { counts[name] = (counts[name] ?? 0) + 1; if (!ok) fails.push(`${name}: ${ctx()}`); };
const show = (p: P) => p.map(fstr).join(",");

for (let t = 0; t < 400; t++) {
  const s = randSpec(ROOTS, QUADS); const p = build(s); if (p.length < 2) continue;
  const mine = fromMine(p);
  // rationalRoots == distinct chosen roots (quads have no rational roots)
  const want = s.roots.map((x) => fstr(x.r)).sort(); const got = mine.rationalRoots().map((r) => fstr(fr(r.numBig, r.denBig))).sort();
  ck("rationalRoots", JSON.stringify(want) === JSON.stringify(got), () => `p=${show(p)} want ${want} got ${got}`);
  // squarefree == monic prod (x-r) prod quads
  const sf = build({ roots: s.roots.map((x) => ({ r: x.r, m: 1 })), quads: s.quads, content: fr(1n) });
  ck("squarefree", peq(toMine(mine.squarefree()), monic(sf)), () => `p=${show(p)}`);
  // splitLinear
  const sp = mine.splitLinear();
  if (s.quads.length) ck("splitLinear-null-with-quad", sp === null, () => `p=${show(p)}`);
  else { const mult = s.roots.flatMap((x) => Array(x.m).fill(fstr(x.r))).sort(); ck("splitLinear", !!sp && JSON.stringify(sp.roots.map((r) => fstr(fr(r.numBig, r.denBig))).sort()) === JSON.stringify(mult) && feq(fr(sp.content.numBig, sp.content.denBig), s.content), () => `p=${show(p)} got ${sp && sp.roots.map(String)} c=${sp && sp.content}`); }
  // divmod identity and degree
  const b = build(randSpec(ROOTS, QUADS)); if (b.length) {
    const { q, r } = mine.divmod(fromMine(b)); const Q = toMine(q), R = toMine(r);
    ck("divmod-identity", peq(trim(pmul(Q, b).map((c, i) => fadd(c, R[i] ?? fr(0n))).concat(R.slice(pmul(Q, b).length))), p), () => `a=${show(p)} b=${show(b)}`);
    ck("divmod-degree", r.degree < fromMine(b).degree, () => `a=${show(p)} b=${show(b)}`);
  }
  // gcd(A*G, B*G) == monic G where A,B have disjoint roots and distinct quads
  const pool = pick(ROOTS, 9); const G = randSpec(pool.slice(0, 3), QUADS.slice(0, 2)); const A = randSpec(pool.slice(3, 6), QUADS.slice(2, 3)); const B = randSpec(pool.slice(6, 9), QUADS.slice(3, 5));
  const gp = build(G), ap = build(A), bp = build(B);
  const gg = fromMine(pmul(ap, gp)).gcd(fromMine(pmul(bp, gp)));
  ck("gcd", peq(toMine(gg), gp.length ? monic(gp) : [fr(1n)]), () => `G=${show(gp)} A=${show(ap)} B=${show(bp)} got ${gg}`);
  // RatFun.reduce: (A G)/(B G) -> A'/B' with B' monic, and cross-multiplication equality
  const rf = new RatFun(fromMine(pmul(ap, gp)), fromMine(pmul(bp, gp))).reduce();
  const cross = peq(pmul(toMine(rf.n), pmul(bp, gp)), pmul(toMine(rf.d), pmul(ap, gp)));
  ck("reduce-cross", cross && rf.d.lead().isOne() && rf.n.gcd(rf.d).degree <= 0, () => `A=${show(ap)} B=${show(bp)} G=${show(gp)}`);
  // RatFun add value check at a random non-pole point
  const c1 = new RatFun(fromMine(ap), fromMine(pmul(bp, gp))), c2 = new RatFun(fromMine(pmul(gp, bp)), fromMine(pmul(ap, bp)));
  const x0 = fr(BigInt(rnd(40) - 20), BigInt(1 + rnd(7)));
  const d1 = peval(pmul(bp, gp), x0), d2 = peval(pmul(ap, bp), x0);
  if (d1[0] !== 0n && d2[0] !== 0n) { const sum = c1.add(c2); const dv = peval(toMine(sum.d), x0); if (dv[0] !== 0n) ck("ratfun-add", feq(fdiv(peval(toMine(sum.n), x0), dv), fadd(fdiv(peval(ap, x0), d1), fdiv(peval(pmul(gp, bp), x0), d2))), () => `x0=${fstr(x0)}`); }
}
console.log(JSON.stringify({ counts, failures: fails.length, firstFailures: fails.slice(0, 10) }, null, 1));
