/**
 * Guarded local-rewrite certification (design: DERIVATION_GROUNDING_DESIGN_DECISION.md, Option A + closed registry).
 *
 * A step `visible expression -> new expression` is certified only when ALL of these hold:
 *   1. the existing symbolic kernel verifies the equality of every rewritten block AND of the whole (outcome "equivalent": no domain
 *      restriction is lost; "conditional" is refused, never guessed);
 *   2. each changed block is justified by a REGISTERED rule (a common interface, `RewriteRule`; no competency-specific conditions);
 *   3. each step names its rule, the path of the changed expression inside the visible expression, the source terms and the replacement;
 *   4. the certificate is replayable WITHOUT search: `replayRewriteCertificate` re-applies the steps to the visible expression, re-checks each
 *      rule's admissibility and re-verifies every block with the kernel (`checkSymbolicCertificate`);
 *   5. assumptions and restrictions are carried (kernel `restrictions`; the whole must be "equivalent").
 * This module decides PROVENANCE only. Mathematical truth stays with the kernel: nothing here can make a false line true, and a numeral not
 * licensed here keeps the grounding classification it had before. Numeral arithmetic below (`Q`) is used only to PRUNE candidate blocks and to
 * REFUSE (cancelling parts); every acceptance is a kernel verdict.
 *
 * Not registered (so true-but-unsupported, never "invalid"): neutral-element insertion (+0, *1), cancelling pairs, parametric witnesses,
 * re-expressions of the answer (95+1, 100-4, 40+56 without a shown shift), and two registered rewrites hidden in one block.
 */
import { verifySymbolicTransformation } from "./symbolic-equivalence.ts";
import { checkSymbolicCertificate, type KernelCertificate } from "./proof-kernel.ts";
import { sha256Hex } from "./digest.ts";
import type { Expr } from "./calculus-core";

export const REWRITE_CERTIFICATE_VERSION = "openpath-rewrite-certificate@1" as const;

// ------------------------------------------------------------------------------------------------ exact numerals (pruning/refusal only)
class Q {
  constructor(public n: bigint, public d: bigint = 1n) { if (d < 0n) { n = -n; d = -d; } const g = Q.g(n < 0n ? -n : n, d); this.n = n / g; this.d = d / g; }
  static g(a: bigint, b: bigint): bigint { while (b) [a, b] = [b, a % b]; return a || 1n; }
  static of(s: string): Q { const [i, f = ""] = s.split("."); return new Q(BigInt(i + f), 10n ** BigInt(f.length)); }
  add(o: Q) { return new Q(this.n * o.d + o.n * this.d, this.d * o.d); }
  sub(o: Q) { return new Q(this.n * o.d - o.n * this.d, this.d * o.d); }
  mul(o: Q) { return new Q(this.n * o.n, this.d * o.d); }
  neg() { return new Q(-this.n, this.d); }
  isZero() { return this.n === 0n; }
  eq(o: Q) { return this.n === o.n && this.d === o.d; }
  str() { return this.d === 1n ? `${this.n}` : `${this.n}/${this.d}`; }
}

// ------------------------------------------------------------------------------------------------ expression trees
export type Tree = { k: "n"; v: Q; u?: boolean } | { k: "v"; name: string } | { k: "b"; op: "+" | "-" | "*" | "/" | "^"; l: Tree; r: Tree; g?: boolean };
type ST = { n: Tree; s: 1 | -1 };            // a signed term (factors always carry s = 1)
const num = (s: string): Tree => ({ k: "n", v: Q.of(s) });

/** the supported surface: numerals (incl. decimals), single letters, + - * / ^(integer), parentheses, implicit products (2x, 3(x+4), (x+2)(x+3)). Anything else -> null (never guessed). */
export function parseTree(src: string): Tree | null {
  const t = src.replace(/[−–—]/g, "-").replace(/[×·⋅]/g, "*").replace(/÷/g, "/").match(/\d+(?:\.\d+)?|[A-Za-z]|[()+\-*/^]|\S/g);
  if (!t || t.length > 80) return null;
  let i = 0;
  const atom = (): Tree | null => {
    const x = t[i++]; if (x === undefined) return null;
    if (/^\d/.test(x)) return num(x);
    if (/^[A-Za-z]$/.test(x)) return { k: "v", name: x };
    if (x === "(") { const e = sum(); if (!e || t[i++] !== ")") return null; return e.k === "b" ? { ...e, g: true } : e; }
    return null;
  };
  const power = (): Tree | null => {
    const a = atom(); if (!a) return null;
    if (t[i] === "^") { i++; let sg = 1; if (t[i] === "-") { sg = -1; i++; } const e = t[i++]; if (!e || !/^\d+$/.test(e)) return null; return { k: "b", op: "^", l: a, r: { k: "n", v: new Q(BigInt(sg) * BigInt(e)) } }; }
    return a;
  };
  const unary = (): Tree | null => { if (t[i] === "-") { i++; const f = unary(); return f && { k: "b", op: "-", l: { k: "n", v: new Q(0n), u: true }, r: f }; } return power(); };
  const prod = (): Tree | null => {
    let a = unary(); if (!a) return null;
    for (;;) {
      const nx = t[i];
      if (nx === "*" || nx === "/") { i++; const b = unary(); if (!b) return null; a = { k: "b", op: nx, l: a, r: b }; }
      else if (nx !== undefined && (/^[A-Za-z]$/.test(nx) || nx === "(")) { const b = power(); if (!b) return null; a = { k: "b", op: "*", l: a, r: b }; }   // implicit product
      else break;
    }
    return a;
  };
  const sum = (): Tree | null => { let a = prod(); if (!a) return null; while (t[i] === "+" || t[i] === "-") { const op = t[i++] as "+" | "-"; const b = prod(); if (!b) return null; a = { k: "b", op, l: a, r: b }; } return a; };
  const e = sum(); return e && i === t.length ? e : null;
}
const isNum = (n: Tree): n is Extract<Tree, { k: "n" }> => n.k === "n";
export const isFrac = (n: Tree): boolean => n.k === "b" && n.op === "/" && isNum(n.l) && isNum(n.r) && !n.r.v.isZero();
const isAtom = (n: Tree): boolean => (isNum(n) && !n.u) || isFrac(n);
const closed = (n: Tree): boolean => n.k === "n" || (n.k === "b" && closed(n.l) && closed(n.r));
const val = (n: Tree): Q | null => { if (n.k === "n") return n.v; if (n.k === "v") return null; const a = val(n.l), b = val(n.r); if (!a || !b) return null; if (n.op === "+") return a.add(b); if (n.op === "-") return a.sub(b); if (n.op === "*") return a.mul(b); if (n.op === "/") return b.isZero() ? null : a.mul(new Q(b.d, b.n)); return null; };
/** flatten ACROSS parentheses: (a+b)+(c-d) and a+b+c-d are the same terms */
const addT = (n: Tree, s: 1 | -1 = 1): ST[] => n.k === "b" && n.op === "+" ? [...addT(n.l, s), ...addT(n.r, s)] : n.k === "b" && n.op === "-" ? [...addT(n.l, s), ...addT(n.r, (-s) as 1 | -1)] : n.k === "n" && n.u ? [] : [{ n, s }];
/** like addT but a parenthesised additive child stays one term (needed to see WHICH shift belongs to which addend) */
const addTg = (n: Tree, s: 1 | -1 = 1, top = true): ST[] => n.k === "b" && (n.op === "+" || n.op === "-") && (top || !n.g) ? [...addTg(n.l, s, false), ...addTg(n.r, n.op === "+" ? s : ((-s) as 1 | -1), false)].filter((x) => !(x.n.k === "n" && x.n.u)) : n.k === "n" && n.u ? [] : [{ n, s }];
const mulF = (n: Tree): Tree[] => n.k === "b" && n.op === "*" ? [...mulF(n.l), ...mulF(n.r)] : [n];
export function canon(n: Tree): string {
  if (n.k === "n") return n.v.str();
  if (n.k === "v") return n.name;
  if (n.op === "+" || n.op === "-") return "+[" + addT(n).map((t) => (t.s < 0 ? "-" : "") + canon(t.n)).sort().join(",") + "]";
  if (n.op === "*") return "*[" + mulF(n).map(canon).sort().join(",") + "]";
  return `(${canon(n.l)}${n.op}${canon(n.r)})`;
}
const sumTree = (ts: ST[]): Tree => ts.length === 0 ? num("0") : ts.map((t) => (t.s < 0 ? ({ k: "b", op: "-", l: { k: "n", v: new Q(0n), u: true }, r: t.n } as Tree) : t.n)).reduce((a, b) => (b.k === "b" && b.op === "-" && b.l.k === "n" && b.l.u ? { k: "b", op: "-", l: a, r: b.r } : { k: "b", op: "+", l: a, r: b }));
const prodTree = (fs: Tree[]): Tree => fs.reduce((a, b) => ({ k: "b", op: "*", l: a, r: b }));
/** parseable text (explicit brackets); `canon` is for comparison only */
export function show(n: Tree, up = 0): string {
  if (n.k === "n") return n.u ? "0" : n.v.str().includes("/") ? `(${n.v.str()})` : n.v.str();
  if (n.k === "v") return n.name;
  const pr = { "+": 1, "-": 1, "*": 2, "/": 2, "^": 3 }[n.op];
  if (n.op === "-" && n.l.k === "n" && n.l.u) return `-${show(n.r, 3)}`.replace(/^-(.*)$/, (_m, x) => (up > 1 ? `(-${x})` : `-${x}`));
  const a = show(n.l, n.op === "^" ? 4 : pr), b = show(n.r, n.op === "^" ? 4 : pr + (n.op === "+" || n.op === "*" ? 0 : 1));
  const t = `${a}${n.op}${b}`; return pr < up ? `(${t})` : t;
}
export const textOf = show;

// ------------------------------------------------------------------------------------------------ kernel bridge (the ONLY truth source)
export function toExpr(n: Tree): Expr | null {
  if (n.k === "n") return { kind: "constant", value: n.v.str() } as Expr;
  if (n.k === "v") return { kind: "variable", name: n.name } as Expr;
  if (n.op === "+") return { kind: "add", terms: [toExpr(n.l), toExpr(n.r)] } as Expr;
  if (n.op === "-") { const r = toExpr(n.r); return r && { kind: "add", terms: [toExpr(n.l), { kind: "multiply", factors: [{ kind: "constant", value: "-1" }, r] }] } as Expr; }
  if (n.op === "*") return { kind: "multiply", factors: [toExpr(n.l), toExpr(n.r)] } as Expr;
  if (n.op === "/") { if (isFrac(n)) { const q = val(n); return q && ({ kind: "constant", value: q.str() } as Expr); } const r = toExpr(n.r); return r && { kind: "multiply", factors: [toExpr(n.l), { kind: "power", base: r, exponent: -1 }] } as Expr; }
  if (n.op === "^") { const e = val(n.r); if (!e || e.d !== 1n) return null; const b = toExpr(n.l); return b && { kind: "power", base: b, exponent: Number(e.n) } as Expr; }
  return null;
}
const sumExpr = (ts: ST[]): Expr | null => { const es = ts.map((t) => { const e = toExpr(t.n); return e && (t.s < 0 ? ({ kind: "multiply", factors: [{ kind: "constant", value: "-1" }, e] } as Expr) : e); }); return es.some((e) => !e) ? null : ({ kind: "add", terms: es as Expr[] } as Expr); };
const memo = new Map<string, ReturnType<typeof verifySymbolicTransformation>>();
function kernel(a: Expr, b: Expr) { const key = JSON.stringify([a, b]); let r = memo.get(key); if (!r) { r = verifySymbolicTransformation(a, b, [], { purpose: "algebra" }); if (memo.size > 5000) memo.clear(); memo.set(key, r); } return r; }
/** "equivalent" with a certificate and NO lost domain restriction. The only restrictions waived are `nonzero` of a NONZERO CONSTANT (3 ≠ 0 is vacuous); `x ≠ 0` and every other lost restriction refuse. */
const vacuous = (r: string): boolean => { const m = /^carry:nonzero:(.*)$/.exec(r); if (!m) return false; try { const e = JSON.parse(m[1]); return e.kind === "constant" && Number.isFinite(Number(e.value)) && Number(e.value) !== 0; } catch { return false; } };
function kernelEquivalent(a: Expr | null, b: Expr | null): KernelCertificate | null {
  if (!a || !b) return null; const ev = kernel(a, b);
  const ok = (ev.outcome === "equivalent" && ev.newlyExcluded.length === 0) || (ev.outcome === "conditional" && ev.requiredAssumptions.length === 0 && ev.newlyExcluded.length > 0 && ev.newlyExcluded.every(vacuous));
  return ok && ev.certificate ? (ev.certificate as KernelCertificate) : null;
}


/** value as unreduced fraction arithmetic (what a pupil writes: 6/10*6/10 = 36/100, (4+8+3)/3 = 15/3); null when not a closed +,-,*,/,^ expression */
const natEval = (n: Tree): [bigint, bigint] | null => {
  if (n.k === "n") return n.u ? [0n, 1n] : (n.v.d === 1n ? [n.v.n, 1n] : [n.v.n, n.v.d]);
  if (n.k === "v") return null;
  const a = natEval(n.l), b = natEval(n.r); if (!a || !b) return null;
  if (n.op === "*") return [a[0] * b[0], a[1] * b[1]];
  if (n.op === "/") return b[0] === 0n ? null : (b[0] < 0n ? [-a[0] * b[1], a[1] * -b[0]] : [a[0] * b[1], a[1] * b[0]]);
  if (n.op === "+" || n.op === "-") { const sg = n.op === "+" ? 1n : -1n; return a[1] === b[1] ? [a[0] + sg * b[0], a[1]] : [a[0] * b[1] + sg * b[0] * a[1], a[1] * b[1]]; }
  if (n.op === "^") { const e = val(n.r); if (!e || e.d !== 1n || e.n < 0n || e.n > 12n) return null; return [a[0] ** e.n, a[1] ** e.n]; }
  return null;
};
const sameFrac = (x: [bigint, bigint], rep: ST): boolean => {
  const sg = rep.s < 0 ? -1n : 1n; let num: bigint, den: bigint;
  if (rep.n.k === "n") { if (rep.n.v.d !== 1n) return false; num = rep.n.v.n; den = 1n; }
  else if (isFrac(rep.n)) { const f = rep.n as any; num = f.l.v.n; den = f.r.v.n; if (f.l.v.d !== 1n || f.r.v.d !== 1n) return false; } else return false;
  return x[0] * den === sg * num * x[1] && (x[1] === den || (x[1] < 0n ? -x[1] : x[1]) === den) ;
};
/** the replacement of `evaluate` must be the unreduced result of evaluating the visible group, or its lowest-terms value: never an arbitrary equal-valued form (96 -> 192/2) */
const evaluatedForm = (src: ST[], rep: ST): boolean => {
  const v = sumQ(src), r = val(rep.n); if (!v || !r) return false; const rq = rep.s < 0 ? r.neg() : r; if (!v.eq(rq)) return false;
  const lowest = rep.n.k === "n" ? true : isFrac(rep.n) && (() => { const f = rep.n as any; return Q.g(f.l.v.n < 0n ? -f.l.v.n : f.l.v.n, f.r.v.n) === 1n; })();
  if (lowest) return true;
  let nat: [bigint, bigint] | null = [0n, 1n];
  for (const t of src) { const e = natEval(t.n); if (!e) { nat = null; break; } const sg = t.s < 0 ? -1n : 1n; nat = nat[1] === e[1] ? [nat[0] + sg * e[0], nat[1]] : [nat[0] * e[1] + sg * e[0] * nat[1], nat[1] * e[1]]; }
  if (!nat) return false;
  if (src.length === 1) { const e = natEval(src[0].n)!; nat = src[0].s < 0 ? [-e[0], e[1]] : e; }
  return sameFrac(nat, rep);
};
// ------------------------------------------------------------------------------------------------ the registry: ONE interface, no competency-specific conditions
export interface RewriteRule {
  id: string;
  /** the context the rule rewrites in: additive terms or multiplicative factors */
  ctx: "terms" | "factors";
  /** STRUCTURAL admissibility of replacing `src` by `rep`. Equality of the two is NOT decided here: the kernel decides it. */
  admissible(src: ST[], rep: ST[]): boolean;
}
const zeroSum = (ts: ST[]): boolean => { const v = ts.map((t) => val(t.n)); if (v.some((x) => !x)) return false; const q = ts.map((t, i) => (t.s < 0 ? v[i]!.neg() : v[i]!)); for (let m = 1; m < 1 << q.length; m++) { let s = new Q(0n); q.forEach((x, i) => { if (m & (1 << i)) s = s.add(x); }); if (s.isZero()) return true; } return false; };
const unitProduct = (fs: ST[]): boolean => { const v = fs.map((t) => val(t.n)); if (v.some((x) => !x)) return false; for (let m = 1; m < 1 << v.length; m++) { let p = new Q(1n); v.forEach((x, i) => { if (m & (1 << i)) p = p.mul(x!); }); if (p.eq(new Q(1n))) return true; } return false; };
const containsShift = (group: Tree, term: ST): boolean => { const parts = addT(group); return parts.some((q) => q.s === term.s && canon(q.n) === canon(term.n)) && parts.filter((q) => !(q.s === term.s && canon(q.n) === canon(term.n))).every((q) => isAtom(q.n)); };
export const REGISTRY: RewriteRule[] = [
  { id: "evaluate", ctx: "terms", admissible: (src, rep) => rep.length === 1 && isAtom(rep[0].n) && src.length >= 1 && src.every((t) => closed(t.n)) && canon(sumTree(src)) !== canon(sumTree(rep)) && evaluatedForm(src, rep[0]) },
  { id: "split-additive", ctx: "terms", admissible: (src, rep) => src.length === 1 && isAtom(src[0].n) && rep.length >= 2 && rep.every((t) => isAtom(t.n) && !(val(t.n)?.isZero())) && !zeroSum(rep) },
  { id: "split-multiplicative", ctx: "factors", admissible: (src, rep) => src.length === 1 && isAtom(src[0].n) && rep.length >= 2 && rep.every((t) => isAtom(t.n) && !val(t.n)?.isZero() && !val(t.n)?.eq(new Q(1n))) && !unitProduct(rep) },
  { id: "fraction-scale", ctx: "terms", admissible: (src, rep) => { if (src.length !== 1 || rep.length !== 1 || !isFrac(src[0].n) || !isFrac(rep[0].n) || src[0].s !== rep[0].s) return false; const a = (src[0].n as any), b = (rep[0].n as any); const [p, q, c, d] = [a.l.v, a.r.v, b.l.v, b.r.v]; const up = (x: Q, y: Q) => { const k = y.n * x.d; const m = x.n * y.d; return m !== 0n && k % m === 0n; }; return (up(p, c) && up(q, d) && c.mul(q).eq(d.mul(p)) && !c.eq(p)) || (up(c, p) && up(d, q) && c.mul(q).eq(d.mul(p)) && !c.eq(p)); } },
  { id: "distribute", ctx: "terms", admissible: (src, rep) => { if (src.length !== 1 || src[0].s !== 1) return false; const f = mulF(src[0].n); if (f.length !== 2) return false; const g = f.find((x) => x.k === "b" && (x.op === "+" || x.op === "-")), a = f.find((x) => isAtom(x)); if (!g || !a) return false; const parts = addT(g); return parts.every((p) => isAtom(p.n)) && rep.length === parts.length && rep.every((r) => isAtom(r.n)); } },
  { id: "shifted-transfer", ctx: "terms", admissible: (src, rep) => src.length >= 2 && src.length <= 4 && rep.length === src.length && src.every((t) => isAtom(t.n)) && (() => { const used = new Set<number>(); let shifted = 0; for (const t of src) { const j = rep.findIndex((r, i) => !used.has(i) && r.s === 1 && (isAtom(r.n) ? canon(r.n) === canon(t.n) && r.s === t.s : r.n.k === "b" && containsShift(r.n, t))); if (j < 0) return false; used.add(j); if (!isAtom(rep[j].n)) shifted++; } return shifted >= 2; })() },
];
const RULE = new Map(REGISTRY.map((r) => [r.id, r] as const));

// ------------------------------------------------------------------------------------------------ certificate
export interface RewriteStep { rule: string; ctx: "terms" | "factors"; /** path of the changed group inside the visible expression: t<i> term i, f<i> factor i, l/r children of a quotient, b base */ path: string[]; indices: number[]; source: string[]; replacement: string[]; kernel: KernelCertificate; }
export interface RewriteCertificate { version: typeof REWRITE_CERTIFICATE_VERSION; visible: string; result: string; steps: RewriteStep[]; assumptions: string[]; restrictions: string[]; whole: KernelCertificate | null; digest: string }
const sig = (t: ST) => (t.s < 0 ? "-" : "") + canon(t.n);                       // comparison key
const signed = (t: ST) => (t.s < 0 ? "-(" : "") + show(t.n) + (t.s < 0 ? ")" : "");   // stored, parseable text
const parseSigned = (s: string): ST | null => { const neg = s.startsWith("-("); const body = neg ? s.slice(2, -1) : s; const n = parseTree(body); return n && { n, s: neg ? -1 : 1 }; };
const digestOf = (c: Omit<RewriteCertificate, "digest">) => sha256Hex(JSON.stringify(c));

interface Raw { rule: string; ctx: "terms" | "factors"; path: string[]; indices: number[]; source: ST[]; replacement: ST[] }
const subsets = <X,>(a: X[], min = 1): X[][] => { const o: X[][] = []; for (let b = 1; b < 1 << a.length; b++) { const s = a.filter((_, j) => b & (1 << j)); if (s.length >= min) o.push(s); } return o; };
const sumQ = (ts: ST[]): Q | null => { let s = new Q(0n); for (const t of ts) { const v = val(t.n); if (!v) return null; s = t.s < 0 ? s.sub(v) : s.add(v); } return s; };
const prodQ = (fs: Tree[]): Q | null => { let p = new Q(1n); for (const f of fs) { const v = val(f); if (!v) return null; p = p.mul(v); } return p; };

// ------------------------------------------------------------------------------------------------ matching (search; replay never uses it)
function matchTree(p: Tree, r: Tree, pp: string[]): Raw[] | null {
  if (canon(p) === canon(r)) return [];
  if (isFrac(p) && isFrac(r)) { const raw: Raw = { rule: "fraction-scale", ctx: "terms", path: pp, indices: [0], source: [{ n: p, s: 1 }], replacement: [{ n: r, s: 1 }] }; return RULE.get("fraction-scale")!.admissible(raw.source, raw.replacement) ? [raw] : null; }
  if (closed(p) && addT(r).length === 1 && isAtom(addT(r)[0].n)) { const ts = addT(p); const raw: Raw = { rule: "evaluate", ctx: "terms", path: pp, indices: ts.map((_, i) => i), source: ts, replacement: addT(r) }; return RULE.get("evaluate")!.admissible(raw.source, raw.replacement) ? [raw] : null; }
  const pf = mulF(p), rf = mulF(r);
  if (pf.length === 2 && pf.some(isAtom) && pf.some((x) => x.k === "b" && (x.op === "+" || x.op === "-")) && r.k === "b" && (r.op === "+" || r.op === "-")) {   // a*(b+c) -> ab+ac
    const raw: Raw = { rule: "distribute", ctx: "terms", path: pp, indices: [0], source: [{ n: p, s: 1 }], replacement: addTg(r).map((t) => t) };
    if (RULE.get("distribute")!.admissible(raw.source, raw.replacement)) return [raw];
  }
  if (p.k === "b" && (p.op === "+" || p.op === "-") || r.k === "b" && (r.op === "+" || r.op === "-")) return addMatch(addT(p), addT(r), pp, p, r);
  if (pf.length > 1 && rf.length > 1) return mulMatch(pf, rf, pp);
  return null;
}
function addMatch(P: ST[], R: ST[], pp: string[], pNode: Tree, rNode: Tree): Raw[] | null {
  if (P.length > 6 || R.length > 8) return null;
  // shifted transfer is decided on the GROUPED new terms, over the whole expression
  const Rg = addTg(rNode);
  if (P.length >= 2 && P.length <= 4 && Rg.length === P.length && P.every((t) => isAtom(t.n))) { const raw: Raw = { rule: "shifted-transfer", ctx: "terms", path: pp, indices: P.map((_, i) => i), source: P, replacement: Rg }; if (RULE.get("shifted-transfer")!.admissible(raw.source, raw.replacement)) return [raw]; }
  const go = (pi: number[], ri: number[]): Raw[] | null => {
    if (!pi.length) return ri.length ? null : [];
    if (!ri.length) return null;
    const i0 = pi[0], p0 = P[i0];
    for (const j of ri) { if (R[j].s !== p0.s) continue; const sub = matchTree(p0.n, R[j].n, [...pp, "t" + i0]); if (sub) { const rest = go(pi.slice(1), ri.filter((x) => x !== j)); if (rest) return [...sub, ...rest]; } }
    if (isAtom(p0.n)) for (const S of subsets(ri.map((j) => R[j]), 2)) {                                                  // additive split
      const idx = ri.filter((j) => S.includes(R[j])), want = sumQ([p0]), got = sumQ(S); if (!want || !got || !want.eq(got)) continue;
      const raw: Raw = { rule: "split-additive", ctx: "terms", path: pp, indices: [i0], source: [p0], replacement: S };
      if (RULE.get("split-additive")!.admissible(raw.source, raw.replacement)) { const rest = go(pi.slice(1), ri.filter((x) => !idx.includes(x))); if (rest) return [raw, ...rest]; } }
    for (const Sp of subsets(pi.map((i) => P[i]), 1)) if (Sp.includes(p0) && Sp.every((t) => closed(t.n))) {                // evaluate a visible closed group
      const tot = sumQ(Sp); if (!tot) continue; const pidx = pi.filter((i) => Sp.includes(P[i]));
      for (const j of ri) { const rv = sumQ([R[j]]); if (isAtom(R[j].n) && rv && rv.eq(tot)) { const raw: Raw = { rule: "evaluate", ctx: "terms", path: pp, indices: pidx, source: Sp, replacement: [R[j]] }; if (RULE.get("evaluate")!.admissible(raw.source, raw.replacement)) { const rest = go(pi.filter((x) => !pidx.includes(x)), ri.filter((x) => x !== j)); if (rest) return [raw, ...rest]; } } } }
    return null;
  };
  void pNode;
  return go(P.map((_, i) => i), R.map((_, i) => i));
}
function mulMatch(P: Tree[], R: Tree[], pp: string[]): Raw[] | null {
  if (P.length > 5 || R.length > 6) return null;
  const go = (pi: number[], ri: number[]): Raw[] | null => {
    if (!pi.length) return ri.length ? null : [];
    if (!ri.length) return null;
    const i0 = pi[0], p0 = P[i0];
    for (const j of ri) { const sub = matchTree(p0, R[j], [...pp, "f" + i0]); if (sub) { const rest = go(pi.slice(1), ri.filter((x) => x !== j)); if (rest) return [...sub, ...rest]; } }
    if (isAtom(p0)) for (const S of subsets(ri, 2)) {                                                                       // multiplicative split
      const src: ST[] = [{ n: p0, s: 1 }], rep: ST[] = S.map((j) => ({ n: R[j], s: 1 as const })); const want = prodQ([p0]), got = prodQ(S.map((j) => R[j]));
      if (!want || !got || !want.eq(got)) continue; const raw: Raw = { rule: "split-multiplicative", ctx: "factors", path: pp, indices: [i0], source: src, replacement: rep };
      if (RULE.get("split-multiplicative")!.admissible(src, rep)) { const rest = go(pi.slice(1), ri.filter((x) => !S.includes(x))); if (rest) return [raw, ...rest]; } }
    return null;
  };
  return go(P.map((_, i) => i), R.map((_, i) => i));
}

/** kernel-confirm every block and the whole; build the certificate. null = not certified (never guessed). */
export function certifyRewrite(visible: Tree, result: Tree, assumptions: string[] = []): RewriteCertificate | null {
  const raws = matchTree(visible, result, []); if (!raws || assumptions.length) return null;      // assumptions are not accepted without an explicit carrier: refuse rather than drop them
  const steps: RewriteStep[] = [];
  for (const r of raws) {
    const a = sumExpr(r.ctx === "terms" ? r.source : r.source), b = sumExpr(r.replacement);
    const prodE = (ts: ST[]) => (ts.length === 1 ? toExpr(ts[0].n) : ({ kind: "multiply", factors: ts.map((t) => toExpr(t.n)) } as Expr));
    const kc = r.ctx === "terms" ? kernelEquivalent(a, b) : kernelEquivalent(prodE(r.source), prodE(r.replacement));
    if (!kc) return null;
    steps.push({ rule: r.rule, ctx: r.ctx, path: r.path, indices: r.indices, source: r.source.map(signed), replacement: r.replacement.map(signed), kernel: kc });
  }
  const whole = kernelEquivalent(toExpr(visible), toExpr(result)); if (!whole) return null;
  const body = { version: REWRITE_CERTIFICATE_VERSION, visible: canon(visible), result: canon(result), steps, assumptions: [], restrictions: [...new Set(steps.flatMap((s) => s.kernel.restrictions).concat(whole.restrictions))], whole };
  return { ...body, digest: digestOf(body) };
}

// ------------------------------------------------------------------------------------------------ independent replay (no search)
function resolve(root: Tree, path: string[]): { node: Tree; set: (t: Tree) => Tree } | null {
  // returns the node at `path` plus a function producing a new root with that node replaced
  const go = (n: Tree, i: number): { node: Tree; set: (t: Tree) => Tree } | null => {
    if (i === path.length) return { node: n, set: (t) => t };
    const seg = path[i], idx = Number(seg.slice(1));
    if (seg[0] === "t") { const ts = addT(n); if (!ts[idx]) return null; const inner = go(ts[idx].n, i + 1); return inner && { node: inner.node, set: (t) => rebuild(n, "terms", ts.map((x, j) => (j === idx ? { n: inner.set(t), s: x.s } : x))) }; }
    if (seg[0] === "f") { const fs = mulF(n); if (!fs[idx]) return null; const inner = go(fs[idx], i + 1); return inner && { node: inner.node, set: (t) => rebuild(n, "factors", fs.map((x, j) => ({ n: j === idx ? inner.set(t) : x, s: 1 as const }))) }; }
    return null;
  };
  return go(root, 0);
}
function rebuild(orig: Tree, ctx: "terms" | "factors", parts: ST[]): Tree { const t = ctx === "terms" ? sumTree(parts) : prodTree(parts.map((p) => p.n)); return orig.k === "b" && orig.g && t.k === "b" ? { ...t, g: true } : t; }
export interface ReplayVerdict { ok: boolean; reason: string }
export function replayRewriteCertificate(cert: RewriteCertificate, visibleText: string, resultText: string): ReplayVerdict {
  const bad = (reason: string): ReplayVerdict => ({ ok: false, reason });
  if (cert.version !== REWRITE_CERTIFICATE_VERSION) return bad("unknown certificate version");
  const { digest, ...body } = cert; if (digestOf(body) !== digest) return bad("digest mismatch (tampered or edited certificate)");
  let V = parseTree(visibleText), Rt = parseTree(resultText); if (!V || !Rt) return bad("expressions do not parse");
  if (canon(V) !== cert.visible || canon(Rt) !== cert.result) return bad("certificate is for different expressions");
  const wholeK = kernelEquivalent(toExpr(V), toExpr(Rt)); if (!wholeK || !cert.whole || !checkOk(cert.whole, toExpr(V), toExpr(Rt))) return bad("the kernel does not verify the whole equality (or a domain restriction would be lost)");
  const byGroup = new Map<string, RewriteStep[]>(); for (const s of cert.steps) byGroup.set(s.path.join("/") + "|" + s.ctx, [...(byGroup.get(s.path.join("/") + "|" + s.ctx) ?? []), s]);
  // deeper groups first: replacing inside a term never shifts the indices of the groups above it
  const groups = [...byGroup.entries()].sort((a, b) => b[1][0].path.length - a[1][0].path.length);
  for (const [, steps] of groups) {
    const path = steps[0].path, ctx = steps[0].ctx, at = resolve(V!, path); if (!at) return bad("a step path does not exist in the visible expression");
    const cur = ctx === "terms" ? addT(at.node) : mulF(at.node).map((n) => ({ n, s: 1 as const })); const consumed = new Set<number>(); const added: ST[] = [];
    for (const s of steps) {
      const rule = RULE.get(s.rule); if (!rule) return bad(`rule "${s.rule}" is not in the registry`); if (rule.ctx !== ctx) return bad("rule used in the wrong context");
      const src = s.source.map(parseSigned), rep = s.replacement.map(parseSigned); if (src.some((x) => !x) || rep.some((x) => !x)) return bad("a step expression does not parse");
      const S = src as ST[], R = rep as ST[];
      if (s.indices.length !== S.length || s.indices.some((i, k) => !cur[i] || sig(cur[i]) !== sig(S[k]) || consumed.has(i))) return bad("a step's source is not in the visible expression at its path");
      if (!rule.admissible(S, R)) return bad(`rule "${s.rule}" is not admissible for this block`);
      const ex = (ts: ST[]) => (ctx === "terms" ? sumExpr(ts) : (ts.length === 1 ? toExpr(ts[0].n) : ({ kind: "multiply", factors: ts.map((t) => toExpr(t.n)) } as Expr)));
      if (!checkOk(s.kernel, ex(S), ex(R))) return bad(`the kernel does not verify the block rewritten by "${s.rule}"`);
      s.indices.forEach((i) => consumed.add(i)); added.push(...R);
    }
    const next = [...cur.filter((_, i) => !consumed.has(i)), ...added]; V = at.set(rebuild(at.node, ctx, next));
  }
  return canon(V!) === canon(Rt) ? { ok: true, reason: "replayed: every block admissible and kernel-verified; the rewritten expression equals the result" } : bad("applying the steps does not produce the result expression");
}
function checkOk(c: KernelCertificate, a: Expr | null, b: Expr | null): boolean { if (!a || !b) return false; try { return checkSymbolicCertificate(c, a, b, [], c.restrictions).outcome === "verified"; } catch { return false; } }

// ------------------------------------------------------------------------------------------------ grounding hook
export interface RewriteLicense { certificates: RewriteCertificate[]; numerals: Map<string, { rule: string; digest: string }> }
export type LicenseResult = { kind: "licensed"; license: RewriteLicense } | { kind: "unjustified"; side: string } | null;
const sidesOf = (t: string): string[] | null => { if (/[<>≤≥≠]|!=/.test(t) || /\s(or|and)\s|[,;]/i.test(t)) return null; const s = t.split("=").map((x) => x.trim()); return s.length >= 1 && s.length <= 6 && s.every(Boolean) ? s : null; };
const numeralsOf = (n: Tree): string[] => n.k === "n" ? (n.u ? [] : [n.v.str()]) : n.k === "v" ? [] : [...numeralsOf(n.l), ...numeralsOf(n.r)];
/**
 * Decide whether every side of the new line is the visible expression (or an earlier side of this line) rewritten by registered rules.
 * - licensed: the introduced numerals are explained by the certificates;
 * - unjustified: a NUMERIC line (all sides and the visible expressions are numeral-only) whose side is not obtained that way, e.g. `37+59 = 96*1`;
 * - null: not applicable (unparsed, or a symbolic line that this rule does not explain: the existing provenance decides).
 */
export function rewriteLicense(visibleTexts: string[], lineText: string): LicenseResult {
  const sides = sidesOf(lineText); if (!sides) return null;
  const sideTrees = sides.map(parseTree); if (sideTrees.some((x) => !x)) return null;
  const vis: { text: string; tree: Tree }[] = []; for (const t of visibleTexts) { const ss = sidesOf(t); if (!ss) continue; for (const s of ss) { const tr = parseTree(s); if (tr) vis.push({ text: s, tree: tr }); } }
  if (!vis.length) return null;
  const numeric = sideTrees.every((t) => closed(t!)) && vis.every((v) => closed(v.tree));
  const certs: RewriteCertificate[] = []; const explained: { text: string; tree: Tree }[] = []; let unexplained: string | null = null;
  sideTrees.forEach((st, j) => {
    // an atom that is the VALUE of a visible computation is the answer to it: it may be restated (evaluate) but never re-partitioned or re-scaled (96 = 95 + 1 after 37 + 59 = 96)
    const answerValued = (t: Tree): boolean => { if (!isAtom(t)) return false; const v = val(t); return !!v && [...vis, ...explained].some((o) => !isAtom(o.tree) && closed(o.tree) && (val(o.tree)?.eq(v) ?? false)); };
    const cands = [...vis.map((v) => ({ text: v.text, tree: v.tree })), ...explained].filter((c) => !answerValued(c.tree)); let done = false;
    for (const V of [...vis, ...explained]) { if (canon(V.tree) === canon(st!)) { done = true; break; } }
    if (!done) for (const V of cands) { const c = certifyRewrite(V.tree, st!); if (c) { const rp = replayRewriteCertificate(c, V.text, sides[j]); if (rp.ok) { certs.push(c); done = true; break; } } }
    if (done) explained.push({ text: sides[j], tree: st! }); else unexplained ??= sides[j];
  });
  if (unexplained) return numeric ? { kind: "unjustified", side: unexplained } : null;
  if (!certs.length) return null;
  const numerals = new Map<string, { rule: string; digest: string }>();
  for (const c of certs) for (const s of c.steps) for (const r of s.replacement) { const t = parseSigned(r); if (t) for (const n of numeralsOf(t.n)) numerals.set(String(Number(n)), { rule: s.rule, digest: c.digest }); }
  return { kind: "licensed", license: { certificates: certs, numerals } };
}

/** Bracket-INSENSITIVE detection of a pure-number computation inside one side: two or more numeral-only terms (or factors) in the same flattened sum/product.
 *  `2x+6+17-17`, `(2x+17)-17+6`, `(2x+4713)+(6)-(4713)` all contain one; parentheses change nothing. Unparsed text -> false (the caller keeps its textual guard). */
export function hasFlattenedNumberComputation(text: string): boolean {
  if (/[<>≤≥≠]|!=/.test(text)) return false;
  for (const s of text.split("=")) { const t = parseTree(s.trim()); if (!t) continue; const walk = (n: Tree): boolean => { if (n.k !== "b") return false; const ts = addT(n); if (ts.filter((x) => closed(x.n) && !(x.n.k === "n")).length + ts.filter((x) => x.n.k === "n").length >= 2 && ts.filter((x) => closed(x.n)).length >= 2) return true; const fs = mulF(n); if (n.op === "*" && fs.filter((x) => closed(x)).length >= 2) return true; return ts.length > 1 ? ts.some((x) => walk(x.n)) : n.op === "*" ? fs.some(walk) : [n.l, n.r].some(walk); }; if (walk(t)) return true; }
  return false;
}
