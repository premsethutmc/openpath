/** Exact evaluation with units (as dimensions) and constraint tracking. BigInt rationals only; never floating point. */
import { q, add as qadd, sub as qsub, mul as qmul, div as qdiv, eq as qeq, gcdB, type Q } from "../../exact/rational.ts";
import type { Node } from "./ast.ts";

export type Dim = Record<string, number>;
export type Val = { k: "q"; q: Q; dim: Dim } | { k: "lin"; c0: Q; c1: Q } | { k: "ratio"; parts: Extract<Val, { k: "q" }>[] };
/** Why a line has no value: a violated constraint (undefined, unit mismatch) or something outside this engine. */
export class Fail extends Error { kind: "undefined" | "units" | "unsupported"; constructor(kind: "undefined" | "units" | "unsupported", message: string) { super(message); this.kind = kind; } }

const ZERO = q(0n), ONE = q(1n);
const UNITS: Record<string, [string, bigint]> = {
  mm: ["length", 1n], cm: ["length", 10n], m: ["length", 1000n], km: ["length", 1_000_000n],
  mg: ["mass", 1n], g: ["mass", 1000n], kg: ["mass", 1_000_000n], ml: ["volume", 1n], l: ["volume", 1000n],
  s: ["time", 1n], min: ["time", 60n], h: ["time", 3600n], paise: ["money", 1n], "₹": ["money", 100n],
};
export const unitDim = (u: string) => UNITS[u][0];
/** the base-unit sizes of every unit of a kind (a bare numeral that equals the value in one of them is a dropped unit, not a wrong value) */
export const scalesOf = (dim: Dim): bigint[] => { const ks = Object.keys(dim).filter((k) => dim[k]); return ks.length === 1 && dim[ks[0]] === 1 ? Object.values(UNITS).filter((u) => u[0] === ks[0]).map((u) => u[1]) : []; };
const dimKey = (d: Dim) => Object.keys(d).filter((k) => d[k]).sort().map((k) => `${k}:${d[k]}`).join(",");
export const sameDim = (a: Dim, b: Dim) => dimKey(a) === dimKey(b);
const dimMul = (a: Dim, b: Dim, s = 1): Dim => { const o: Dim = { ...a }; for (const k of Object.keys(b)) o[k] = (o[k] ?? 0) + s * b[k]; for (const k of Object.keys(o)) if (!o[k]) delete o[k]; return o; };
const NONE: Dim = {};
const cq = (x: Q, dim: Dim = NONE): Val => ({ k: "q", q: x, dim });
const SIZE = 6000n;
const big = (x: Q) => x.n > 10n ** SIZE || x.d > 10n ** SIZE;
const isQ = (v: Val): v is Extract<Val, { k: "q" }> => v.k === "q";
const dimless = (v: Val) => isQ(v) && !dimKey(v.dim);

function ipow(b: Q, e: bigint): Q {
  if (e < 0n) { if (b.n === 0n) throw new Fail("undefined", "zero to a negative power"); return ipow(q(b.d, b.n), -e); }
  let r = ONE, base = b, k = e;
  while (k > 0n) { if (k & 1n) r = qmul(r, base); base = qmul(base, base); k >>= 1n; if (big(r) || big(base)) throw new Fail("unsupported", "number too large"); }
  return r;
}
function iroot(n: bigint, k: bigint): bigint | null {
  if (n < 0n) return null; if (n < 2n) return n;
  let lo = 0n, hi = n; while (lo < hi) { const mid = (lo + hi + 1n) / 2n; if (mid ** k <= n) lo = mid; else hi = mid - 1n; }
  return lo ** k === n ? lo : null;
}
export function lcmOf(xs: bigint[]): bigint { return xs.reduce((a, b) => (a === 0n || b === 0n ? 0n : (a / gcdB(a, b)) * b)); }

export function evaluate(n: Node): Val {
  switch (n.t) {
    case "num": return cq(n.q);
    case "var": return { k: "lin", c0: ZERO, c1: ONE };
    case "pct": { const v = evaluate(n.e); if (!isQ(v)) throw new Fail("unsupported", "percent of a non-number"); return cq(qdiv(v.q, q(100n)), v.dim); }
    case "unit": { const v = evaluate(n.e); if (!isQ(v) || dimKey(v.dim)) throw new Fail("units", "a unit on a quantity that already has one"); return cq(qmul(v.q, q(UNITS[n.u][1])), { [UNITS[n.u][0]]: 1 }); }
    case "neg": { const v = evaluate(n.e); return v.k === "q" ? cq(qsub(ZERO, v.q), v.dim) : v.k === "lin" ? { k: "lin", c0: qsub(ZERO, v.c0), c1: qsub(ZERO, v.c1) } : bad("negating a ratio"); }
    case "mixed": return bin("+", evaluate(n.w), evaluate(n.f));
    case "call": return call(n);
    case "ratio": {
      const parts = n.parts.map(evaluate);
      if (!parts.every(isQ)) throw new Fail("unsupported", "a ratio with an unknown part");
      const d0 = (parts[0] as Extract<Val, { k: "q" }>).dim;
      if (!parts.every((p) => sameDim((p as Extract<Val, { k: "q" }>).dim, d0))) throw new Fail("units", "the parts of a ratio must be in the same kind of unit");
      return { k: "ratio", parts: parts as Extract<Val, { k: "q" }>[] };
    }
    case "bin": return bin(n.op, evaluate(n.l), evaluate(n.r));
  }
}
const bad = (m: string): never => { throw new Fail("unsupported", m); };
function call(n: Extract<Node, { t: "call" }>): Val {
  const a = n.args.map(evaluate);
  if (!a.every((v) => isQ(v) && !dimKey(v.dim) && (v as Extract<Val, { k: "q" }>).q.d === 1n)) {
    if (n.f === "sqrt" && a.length === 1 && isQ(a[0]) && !dimKey(a[0].dim)) {
      const x = a[0].q; const nn = iroot(x.n, 2n), dd = iroot(x.d, 2n);
      if (nn === null || dd === null) throw new Fail(x.n < 0n ? "undefined" : "unsupported", x.n < 0n ? "square root of a negative number" : "an irrational square root");
      return cq(q(nn, dd));
    }
    throw new Fail("unsupported", `${n.f} needs whole numbers`);
  }
  const xs = a.map((v) => (v as Extract<Val, { k: "q" }>).q.n);
  if (n.f === "sqrt") { if (xs.length !== 1) return bad("sqrt takes one number"); const r = iroot(xs[0], 2n); if (r === null) throw new Fail(xs[0] < 0n ? "undefined" : "unsupported", "not a perfect square"); return cq(q(r)); }
  if (xs.length < 2 || xs.some((x) => x < 0n)) throw new Fail("undefined", `${n.f} of fewer than two numbers or a negative`);
  return cq(q(n.f === "hcf" ? xs.reduce((x, y) => gcdB(x, y)) : lcmOf(xs)));
}
function bin(op: "+" | "-" | "*" | "/" | "^", l: Val, r: Val): Val {
  if (l.k === "ratio" || r.k === "ratio") return bad("arithmetic on a ratio");
  if (op === "+" || op === "-") {
    if (l.k === "lin" || r.k === "lin") {
      const a = l.k === "lin" ? l : { c0: (l as Extract<Val, { k: "q" }>).q, c1: ZERO }, b = r.k === "lin" ? r : { c0: (r as Extract<Val, { k: "q" }>).q, c1: ZERO };
      if ((l.k === "q" && dimKey(l.dim)) || (r.k === "q" && dimKey(r.dim))) throw new Fail("unsupported", "units with an unknown");
      const f = op === "+" ? qadd : qsub; return { k: "lin", c0: f(a.c0, b.c0), c1: f(a.c1, b.c1) };
    }
    if (!sameDim(l.dim, r.dim)) throw new Fail("units", `cannot ${op === "+" ? "add" : "subtract"} ${dimKey(l.dim) || "a plain number"} and ${dimKey(r.dim) || "a plain number"}`);
    return cq((op === "+" ? qadd : qsub)(l.q, r.q), l.dim);
  }
  if (op === "*" || op === "/") {
    if (l.k === "lin" || r.k === "lin") {
      if (op === "*" && l.k === "lin" && r.k === "lin") return bad("product of two unknowns");
      if (op === "/" && r.k === "lin") return bad("division by an unknown");
      const lin = (l.k === "lin" ? l : r) as Extract<Val, { k: "lin" }>, c = (l.k === "lin" ? r : l) as Extract<Val, { k: "q" }>;
      if (!dimless(c)) return bad("units with an unknown");
      if (op === "/" && c.q.n === 0n) throw new Fail("undefined", "division by zero");
      const f = (x: Q) => (op === "*" ? qmul(x, c.q) : qdiv(x, c.q)); return { k: "lin", c0: f(lin.c0), c1: f(lin.c1) };
    }
    if (op === "/" && r.q.n === 0n) throw new Fail("undefined", "division by zero");
    return cq(op === "*" ? qmul(l.q, r.q) : qdiv(l.q, r.q), dimMul(l.dim, r.dim, op === "*" ? 1 : -1));
  }
  // power: a plain-number exponent
  if (l.k === "lin" || r.k === "lin") return bad("power with an unknown");
  if (!dimless(r)) throw new Fail("units", "an exponent cannot have a unit");
  const e = r.q;
  if (e.d === 1n) {
    if (e.n > 400n || e.n < -400n) return bad("exponent too large");
    if (l.q.n === 0n && e.n === 0n) throw new Fail("undefined", "0 to the power 0");
    return cq(ipow(l.q, e.n), Object.fromEntries(Object.entries(l.dim).map(([k, v]) => [k, v * Number(e.n)])));
  }
  if (dimKey(l.dim)) return bad("a fractional power of a quantity");
  const nn = iroot(l.q.n, e.d), dd = iroot(l.q.d, e.d);
  if (nn === null || dd === null) return bad("a fractional power that is not exact");
  return cq(ipow(q(nn, dd), e.n));
}
export const valEq = (a: Val, b: Val): boolean => {
  if (a.k === "q" && b.k === "q") return sameDim(a.dim, b.dim) && qeq(a.q, b.q);
  if (a.k === "lin" && b.k === "lin") return qeq(a.c0, b.c0) && qeq(a.c1, b.c1);
  if (a.k === "ratio" && b.k === "ratio") {
    if (a.parts.length !== b.parts.length) return false;
    const a0 = a.parts[0].q, b0 = b.parts[0].q; if (a0.n === 0n || b0.n === 0n) return a0.n === b0.n && a.parts.every((p, i) => p.q.n === 0n === (b.parts[i].q.n === 0n));
    return a.parts.every((p, i) => qeq(qmul(p.q, b0), qmul(b.parts[i].q, a0)));
  }
  return false;
};
export const showVal = (v: Val): string => (v.k === "q" ? `${v.q.d === 1n ? v.q.n : `${v.q.n}/${v.q.d}`}${dimKey(v.dim) ? " " + dimKey(v.dim) : ""}` : v.k === "ratio" ? v.parts.map((p) => showVal(p)).join(" : ") : `${v.c1.n}/${v.c1.d}x + ${v.c0.n}/${v.c0.d}`);
/** the solution set of "left = right" in one unknown */
export type Sol = { kind: "all" } | { kind: "none" } | { kind: "one"; x: Q };
export function solve(l: Val, r: Val): Sol {
  if (l.k === "ratio" || r.k === "ratio") {
    if (l.k !== "ratio" || r.k !== "ratio" || l.parts.length !== r.parts.length) throw new Fail("unsupported", "a ratio equated to a non-ratio");
    return bad("ratio with unknown handled by cross-multiplication"); // never reached: see equationOf
  }
  const a = l.k === "lin" ? l : { c0: l.q, c1: ZERO }, b = r.k === "lin" ? r : { c0: r.q, c1: ZERO };
  if ((l.k === "q" && dimKey(l.dim)) !== (r.k === "q" && dimKey(r.dim)) && l.k === "q" && r.k === "q") throw new Fail("units", "units differ");
  const c1 = qsub(a.c1, b.c1), c0 = qsub(b.c0, a.c0);
  if (c1.n === 0n) return c0.n === 0n ? { kind: "all" } : { kind: "none" };
  return { kind: "one", x: qdiv(c0, c1) };
}
export const solEq = (a: Sol, b: Sol) => a.kind === b.kind && (a.kind !== "one" || qeq(a.x, (b as { x: Q }).x));
