/**
 * E6 exact Laurent-series limits. Truncated series with BigInt-rational coefficients and tracked precision; a limit is reported only when the
 * leading term lies inside the exactly known range. Handles rational functions and compositions of sin, cos, tan, exp, ln, sqrt, atan whose inner
 * series vanish (or equal 1) at the point. Everything else raises Unsupported: nothing is guessed or numerically accepted.
 */
import { q, qadd, qdiv, qiszero, qmul, qneg, qsign, qsub, ONE, Z, type Q } from "./exact-e5.ts";
import type { A } from "./e6-parse.ts";
import { Unsupported, Budget, foldQ } from "./e6-cas.ts";

interface Ser { low: number; c: Q[]; prec: number }
const CAP = 18;
const sconst = (c: Q): Ser => (qiszero(c) ? { low: CAP + 1, c: [], prec: CAP } : { low: 0, c: [c], prec: CAP });
const at = (s: Ser, e: number): Q => (e < s.low || e > s.prec ? Z : s.c[e - s.low] ?? Z);
function norm(s: Ser): Ser {
  let low = s.low; let c = s.c.slice();
  while (c.length && qiszero(c[0]) && low <= s.prec) { c.shift(); low++; }
  while (c.length && low + c.length - 1 > s.prec) c.pop();
  if (!c.length) return { low: s.prec + 1, c: [], prec: s.prec };
  return { low, c, prec: s.prec };
}
const isZeroSer = (s: Ser) => s.c.length === 0;
function sadd(a: Ser, b: Ser): Ser {
  const prec = Math.min(a.prec, b.prec); const low = Math.min(a.low, b.low, prec + 1);
  const c: Q[] = []; for (let e = low; e <= prec; e++) c.push(qadd(at(a, e), at(b, e)));
  return norm({ low, c, prec });
}
const sneg = (a: Ser): Ser => ({ low: a.low, c: a.c.map(qneg), prec: a.prec });
function smul(a: Ser, b: Ser): Ser {
  if (isZeroSer(a) || isZeroSer(b)) { const prec = Math.min(a.prec + b.low, b.prec + a.low, CAP); return { low: prec + 1, c: [], prec }; }
  const low = a.low + b.low; const prec = Math.min(a.prec + b.low, b.prec + a.low, CAP + Math.min(0, low));
  const c: Q[] = [];
  for (let e = low; e <= prec; e++) { let s = Z; for (let i = a.low; i <= Math.min(a.prec, e - b.low); i++) { const j = e - i; if (j < b.low || j > b.prec) continue; s = qadd(s, qmul(at(a, i), at(b, j))); } c.push(s); }
  return norm({ low, c, prec });
}
function sinv(a: Ser): Ser {
  const n = norm(a); if (isZeroSer(n)) throw new Unsupported("division by a series that is zero to the available precision");
  const c0 = n.c[0], rel = n.prec - n.low; const out: Q[] = [qdiv(ONE, c0)];
  for (let k = 1; k <= rel; k++) { let s = Z; for (let j = 1; j <= k; j++) s = qadd(s, qmul(at(n, n.low + j), out[k - j])); out.push(qneg(qdiv(s, c0))); }
  return { low: -n.low, c: out, prec: -n.low + rel };
}
const spow = (a: Ser, n: number): Ser => { if (n < 0) return spow(sinv(a), -n); let r = sconst(ONE), b = a; let e = n; while (e) { if (e & 1) r = smul(r, b); e >>= 1; if (e) b = smul(b, b); } return r; };
const fact = (n: number): bigint => { let r = 1n; for (let i = 2; i <= n; i++) r *= BigInt(i); return r; };
function applySeries(u: Ser, coeff: (k: number) => Q, maxK: number): Ser {
  // sum_{k>=0} coeff(k) u^k where u has low >= 1
  const nu = norm(u); if (nu.low < 1 && !isZeroSer(nu)) throw new Unsupported("inner series does not vanish at the point");
  let total = sconst(coeff(0)); let pw = sconst(ONE);
  const kmax = Math.min(maxK, CAP + 2);
  for (let k = 1; k <= kmax; k++) { pw = smul(pw, nu); if (!qiszero(coeff(k))) total = sadd(total, smul(sconst(coeff(k)), pw)); if (pw.low > CAP) break; }
  const lowU = isZeroSer(nu) ? CAP + 1 : nu.low;
  const trunc = lowU * (kmax + 1) - 1; return norm({ ...total, prec: Math.min(total.prec, trunc, nu.prec + 0 * 1 + CAP) });
}
const sinS = (u: Ser) => applySeries(u, (k) => (k % 2 === 0 ? Z : q((k - 1) / 2 % 2 === 0 ? 1n : -1n, fact(k))), CAP);
const cosS = (u: Ser) => applySeries(u, (k) => (k % 2 === 1 ? Z : q(k / 2 % 2 === 0 ? 1n : -1n, fact(k))), CAP);
const expS = (u: Ser) => applySeries(u, (k) => q(1n, fact(k)), CAP);
const atanS = (u: Ser) => applySeries(u, (k) => (k % 2 === 0 ? Z : q((k - 1) / 2 % 2 === 0 ? 1n : -1n, BigInt(k))), CAP);
const lnS = (u: Ser) => applySeries(u, (k) => (k === 0 ? Z : q(k % 2 === 1 ? 1n : -1n, BigInt(k))), CAP); // ln(1+u)
function sqrtS(a: Ser, dir: 1 | -1): Ser {
  const n = norm(a); if (isZeroSer(n)) throw new Unsupported("square root of a series that is zero to the available precision");
  // a = h^low * c0 * (1 + t); sqrt = (dir*h)^(low/2) * sqrt(c0) * sqrt(1+t) for even low, c0 > 0
  if (n.low % 2 !== 0) throw new Unsupported("square root of an odd-order vanishing radicand");
  const c0 = n.c[0]; if (qsign(c0) <= 0) throw new Unsupported("square root of a series with a non-positive leading coefficient");
  const r = exactSqrt(c0); if (!r) throw new Unsupported("irrational leading coefficient under a square root");
  const t = smul(sconst(qdiv(ONE, c0)), { low: n.low - n.low, c: n.c.map((x) => x), prec: n.prec - n.low }); // normalised: 1 + t
  const tt = sadd(t, sconst(qneg(ONE)));
  const half = (k: number): Q => { let num = ONE; for (let i = 0; i < k; i++) num = qmul(num, qsub(q(1, 2), q(i))); return qdiv(num, q(fact(k))); };
  const root = applySeries(tt, half, CAP);
  const m = n.low / 2; const sign = dir === -1 && m % 2 !== 0 ? -1n : 1n;
  return norm({ low: m + root.low, c: root.c.map((x) => qmul(x, qmul(r, q(sign)))), prec: m + root.prec });
}
function exactSqrt(c: Q): Q | null {
  const rt = (n: bigint): bigint | null => { if (n < 0n) return null; let lo = 0n, hi = n < 2n ? n : BigInt(Math.ceil(Math.sqrt(Number(n)))) + 2n; while (lo <= hi) { const mid = (lo + hi) / 2n; const v = mid * mid; if (v === n) return mid; if (v < n) lo = mid + 1n; else hi = mid - 1n; } return null; };
  const a = rt(c.n), b = rt(c.d); return a !== null && b !== null ? q(a, b) : null;
}

export function serOf(a: A, env: Record<string, Ser>, dir: 1 | -1, depth = 0): Ser {
  if (depth > 60) throw new Budget("expression too deep for the series kernel");
  const r = (x: A) => serOf(x, env, dir, depth + 1);
  switch (a.t) {
    case "n": return sconst(a.v);
    case "s": { const s = env[a.name]; if (!s) throw new Unsupported(`free symbol ${a.name} in a limit`); return s; }
    case "neg": return sneg(r(a.a));
    case "add": return a.xs.map(r).reduce(sadd);
    case "mul": return a.xs.map(r).reduce(smul);
    case "div": return smul(r(a.a), sinv(r(a.b)));
    case "pow": {
      const ev = foldQ(a.b); let k: number | null = null;
      if (ev && ev.d === 1n) k = Number(ev.n);
      if (k !== null && Math.abs(k) <= 64) return spow(r(a.a), k);
      if (ev && ev.d === 2n && Math.abs(Number(ev.n)) <= 64) { const base = sqrtS(r(a.a), dir); return spow(base, Number(ev.n)); }
      throw new Unsupported("exponent outside the series kernel");
    }
    case "fn": {
      const u = r(a.a);
      switch (a.f) {
        case "sin": return sinS(u); case "cos": return cosS(u);
        case "tan": return smul(sinS(u), sinv(cosS(u)));
        case "exp": return expS(u);
        case "ln": { const nu = norm(u); if (isZeroSer(nu) || nu.low !== 0 || !(nu.c[0].n === 1n && nu.c[0].d === 1n)) throw new Unsupported("ln needs an argument tending to 1"); return lnS(sadd(nu, sconst(qneg(ONE)))); }
        case "sqrt": return sqrtS(u, dir);
        case "atan": case "arctan": return atanS(u);
        default: throw new Unsupported(`function ${a.f} in a limit`);
      }
    }
    default: throw new Unsupported("operator or constant outside the series kernel");
  }
}
export type LimV = { kind: "finite"; value: Q } | { kind: "inf"; sign: 1 | -1 } | { kind: "dne" };
function oneSided(expr: A, v: string, pt: Q | "inf" | "-inf", dir: 1 | -1): LimV {
  const h: Ser = { low: 1, c: [ONE], prec: CAP };
  let env: Record<string, Ser>;
  let d = dir;
  if (pt === "inf" || pt === "-inf") { env = { [v]: sinv(h) }; d = pt === "inf" ? 1 : -1; }
  else env = { [v]: sadd(sconst(pt), h) };
  const s = norm(serOf(expr, env, d));
  if (isZeroSer(s)) throw new Unsupported("limit is zero to the available precision");
  if (s.low > 0) return { kind: "finite", value: Z };
  if (s.low === 0) return { kind: "finite", value: s.c[0] };
  const lead = qsign(s.c[0]); const sg = (lead * (d === -1 && Math.abs(s.low) % 2 === 1 ? -1 : 1)) as 1 | -1;
  return { kind: "inf", sign: sg };
}
export function limitOf(expr: A, v: string, pt: Q | "inf" | "-inf", side: "both" | "left" | "right"): LimV {
  if (pt === "inf" || pt === "-inf") return oneSided(expr, v, pt, 1);
  const L = side !== "right" ? oneSided(expr, v, pt, -1) : null, R = side !== "left" ? oneSided(expr, v, pt, 1) : null;
  if (side === "left") return L!; if (side === "right") return R!;
  const a = L!, b = R!;
  if (a.kind === "finite" && b.kind === "finite") return a.value.n === b.value.n && a.value.d === b.value.d ? a : { kind: "dne" };
  if (a.kind === "inf" && b.kind === "inf" && a.sign === b.sign) return a;
  return { kind: "dne" };
}

/** exact value of a variable-free expression built from rational arithmetic and sin, cos, tan, exp, ln, sqrt, atan at arguments the series kernel can expand */
export function constantValue(a: A): Q | null {
  try {
    const s = norm(serOf(a, {}, 1));
    if (isZeroSer(s)) return Z;
    return s.low === 0 && s.c.slice(1).every(qiszero) ? s.c[0] : null;
  } catch { return null; }
}
