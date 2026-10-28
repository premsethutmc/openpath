/**
 * E6 calculus binder. A line-by-line judge for natural derivative / antiderivative / definite-integral / limit / continuity working.
 *
 * Division of labour (E5 template): this module TRANSLATES each line into typed claims over the parsed tree (e6-parse) and judges them with the
 * independent exact kernels (e6-cas formal identities with derived restrictions, e6-series Laurent limits). The kernels never accept on a float
 * agreement: a float may only confirm a rejection. Anything the kernels cannot decide is `unsupported`, never accepted.
 */
import { buildProofContext, type ProofContext } from "./proof-context.ts";
import { NotationError, normalize, parseExpression, splitEquals, N, S, add, mul, div, neg, pw, fn, type A } from "./e6-parse.ts";
import { Ambiguity, Budget, Unsupported, compareExpr, d6, domainReqs, evalNum, hasVar, plainLogArgs, substitute, visiblyPositive, type Req } from "./e6-cas.ts";
import { limitOf, constantValue, type LimV } from "./e6-series.ts";
import { Builder, bad, incomplete, isProse, proseJudge, nonMath, missing, ok, readStatement, uns, worst, finish, type E6Plan, type Judge, type Row, syntheticParse } from "./e6-common.ts";
import type { CalculusProblem, Expr } from "./calculus-core.ts";
import { Overflow, q, qadd, qdiv, qeq, qmul, qneg, qsign, qsub, qtext, ONE, Z, type Q } from "./exact-e5.ts";
import { digestOf } from "./geometry-binder-e5.ts";

// ================================================================================================ problem expression -> tree
const qOf = (s: string): Q => { const m = /^\s*([+-]?\d+)(?:\s*\/\s*(\d+))?\s*$/.exec(String(s)); if (!m) throw new Unsupported(`bound ${s} is not an exact rational`); return q(BigInt(m[1]), BigInt(m[2] ?? "1")); };
export function fromExpr(e: Expr): A {
  switch (e.kind) {
    case "constant": { const v = qOf(e.value); return v.d === 1n && v.n >= 0n ? N(v.n) : { t: "n", v }; }
    case "pi": return { t: "pi" };
    case "variable": return S(e.name);
    case "abs": return fn("abs", fromExpr(e.argument));
    case "root": return e.index === 2 ? fn("sqrt", fromExpr(e.radicand)) : pw(fromExpr(e.radicand), N(1, e.index));
    case "add": return add(...e.terms.map(fromExpr));
    case "multiply": return mul(...e.factors.map(fromExpr));
    case "power": return pw(fromExpr(e.base), e.exponent < 0 ? neg(N(-e.exponent)) : N(e.exponent));
    case "log": return fn("ln", fromExpr(e.argument));
    case "atan": return fn("atan", fromExpr(e.argument));
    default: return fn(e.kind, fromExpr(e.argument));
  }
}
const jsonOf = (x: unknown): string => JSON.stringify(x, (_k, v) => (typeof v === "bigint" ? v.toString() : v));
const sameQ = (a: Q, b: Q) => qeq(a, b);
export function constQ(a: A): Q | null {
  switch (a.t) {
    case "n": return a.v;
    case "neg": { const x = constQ(a.a); return x && qneg(x); }
    case "add": { let s = Z; for (const x of a.xs) { const v = constQ(x); if (!v) return null; s = qadd(s, v); } return s; }
    case "mul": { let s = ONE; for (const x of a.xs) { const v = constQ(x); if (!v) return null; s = qmul(s, v); } return s; }
    case "div": { const x = constQ(a.a), y = constQ(a.b); return x && y && qsign(y) !== 0 ? qdiv(x, y) : null; }
    case "pow": { const x = constQ(a.a); const e = constQ(a.b); if (!x || !e || e.d !== 1n || e.n > 64n || e.n < -64n) return null; let r = ONE; const k = Number(e.n < 0n ? -e.n : e.n); for (let i = 0; i < k; i++) r = qmul(r, x); return e.n < 0n ? (qsign(r) === 0 ? null : qdiv(ONE, r)) : r; }
    default: return null;
  }
}
/** exact value of a variable-free expression: arithmetic first, then the series kernel (sin 0, cos 0, e^0, ln 1 ...) */
export function constValue(a: A): Q | null {
  const k = constQ(a); if (k) return k;
  return constantValue(a);
}
const nodeCount = (a: A): number => { switch (a.t) { case "neg": return 1 + nodeCount(a.a); case "add": case "mul": return 1 + a.xs.reduce((n, x) => n + nodeCount(x), 0); case "div": case "pow": return 1 + nodeCount(a.a) + nodeCount(a.b); case "fn": return 1 + nodeCount(a.a); default: return 1; } };
function subNodes(a: A, out: A[] = []): A[] {
  out.push(a);
  switch (a.t) { case "neg": subNodes(a.a, out); break; case "add": case "mul": a.xs.forEach((x) => subNodes(x, out)); break; case "div": case "pow": subNodes(a.a, out); subNodes(a.b, out); break; case "fn": subNodes(a.a, out); break; default: break; }
  return out;
}
export function freeSyms(a: A, out = new Set<string>()): Set<string> {
  switch (a.t) {
    case "s": out.add(a.name); break;
    case "neg": freeSyms(a.a, out); break;
    case "add": case "mul": a.xs.forEach((x) => freeSyms(x, out)); break;
    case "div": case "pow": freeSyms(a.a, out); freeSyms(a.b, out); break;
    case "fn": freeSyms(a.a, out); break;
    case "call": a.args.forEach((x) => freeSyms(x, out)); break;
    case "Dcall": freeSyms(a.arg, out); break;
    case "D": freeSyms(a.of, out); out.add(a.v); break;
    case "I": freeSyms(a.f, out); out.add(a.v); break;
    case "EV": freeSyms(a.f, out); break;
    case "LIM": freeSyms(a.f, out); break;
    default: break;
  }
  return out;
}
const hasNode = (a: A, p: (x: A) => boolean): boolean => subNodesAll(a).some(p);
function subNodesAll(a: A, out: A[] = []): A[] {
  out.push(a);
  switch (a.t) {
    case "neg": subNodesAll(a.a, out); break; case "add": case "mul": a.xs.forEach((x) => subNodesAll(x, out)); break;
    case "div": case "pow": subNodesAll(a.a, out); subNodesAll(a.b, out); break; case "fn": subNodesAll(a.a, out); break;
    case "call": a.args.forEach((x) => subNodesAll(x, out)); break; case "Dcall": subNodesAll(a.arg, out); break; case "D": subNodesAll(a.of, out); break;
    case "I": subNodesAll(a.f, out); if (a.lo) subNodesAll(a.lo, out); if (a.hi) subNodesAll(a.hi, out); break;
    case "EV": subNodesAll(a.f, out); subNodesAll(a.lo, out); subNodesAll(a.hi, out); break;
    case "LIM": subNodesAll(a.f, out); break;
    default: break;
  }
  return out;
}

// ================================================================================================ restrictions the student states
export interface Stated { op: ">" | ">=" | "<" | "<=" | "!="; bound: Q }
const REL = /^\s*([A-Za-z])\s*(!=|>=|<=|>|<)\s*(-?\s*\d+(?:\.\d+)?(?:\s*\/\s*\d+)?)\s*$/;
const LEAD_IN = /^(?:assume|assuming|suppose|let|for|when|if|given|where|on|since|take|restrict(?:ing)? to|provided)\b[\s:]*/i;
export function readRestrictions(plain0: string, v: string): Stated[] | null {
  const plain = plain0.trim().replace(LEAD_IN, "").replace(/[\s:;,]+$/, "").replace(/\.+$/, "").trim();
  const parts = plain.split(/\s*(?:,|;|\band\b|\bor\b)\s*/).filter((p) => p.trim());
  if (!parts.length) return null;
  const out: Stated[] = [];
  for (const p of parts) {
    const m = REL.exec(p); if (!m || m[1] !== v) return null;
    const num = m[3].replace(/\s+/g, ""); const [a, b = "1"] = num.split("/");
    const dec = /\./.test(a) ? (() => { const [i, f] = a.split("."); return q(BigInt(i.replace("-", "") + f) * (i.startsWith("-") ? -1n : 1n), 10n ** BigInt(f.length)); })() : q(BigInt(a), 1n);
    out.push({ op: m[2] as Stated["op"], bound: qdiv(dec, q(BigInt(b))) });
  }
  return out;
}
/** E7: the task domain is `restrictions` AND (component_1 OR component_2 ...). A requirement is met only when it holds on EVERY component. */
/** E7 Phase 4: the task domain as the proof context gives it, read for THIS plan only (no module state). `components` are alternatives. */
export interface TaskDom { stated: Stated[]; components: Stated[][] | null }
function satisfied(r: Req, stated: Stated[], components: Stated[][] | null): boolean { return components ? components.every((comp) => satisfiedIn(r, [...stated, ...comp])) : satisfiedIn(r, stated); }
function satisfiedIn(r: Req, stated: Stated[]): boolean {
  if (r.kind === "nonzero" && r.at !== undefined) {
    const t = r.at;
    return stated.some((s) => (s.op === "!=" && sameQ(s.bound, t)) || (s.op === ">" && qsign(qsub(s.bound, t)) >= 0) || (s.op === "<" && qsign(qsub(s.bound, t)) <= 0) || (s.op === ">=" && qsign(qsub(s.bound, t)) > 0) || (s.op === "<=" && qsign(qsub(s.bound, t)) < 0));
  }
  if (r.kind === "positive" && r.lin) {
    const root = qneg(qdiv(r.lin.b, r.lin.a));
    if (qsign(r.lin.a) > 0) return stated.some((s) => (s.op === ">" && qsign(qsub(s.bound, root)) >= 0) || (s.op === ">=" && qsign(qsub(s.bound, root)) > 0));
    return stated.some((s) => (s.op === "<" && qsign(qsub(s.bound, root)) <= 0) || (s.op === "<=" && qsign(qsub(s.bound, root)) < 0));
  }
  return false;
}

// ================================================================================================ environment
export class Unbound extends Error {}
interface Fdef { param: string; body: A }
// ---------------------------------------------------------------------------------------------- typed task restrictions and square-root branches
/** restrictions supplied by the typed problem (`restrictions`, `domainComponents`), read once per plan; they behave as stated and carried-forward */
function polyCoeffs(a: A, v: string): Q[] | null {
  const mulP = (x: Q[], y: Q[]): Q[] => { const o: Q[] = new Array(x.length + y.length - 1).fill(Z); x.forEach((xi, i) => y.forEach((yj, j) => { o[i + j] = qadd(o[i + j], qmul(xi, yj)); })); return o; };
  const go = (x: A): Q[] | null => {
    switch (x.t) {
      case "n": return [x.v];
      case "s": return x.name === v ? [Z, ONE] : null;
      case "neg": { const r = go(x.a); return r ? r.map(qneg) : null; }
      case "add": { let acc: Q[] = [Z]; for (const y of x.xs) { const r = go(y); if (!r) return null; const n = Math.max(acc.length, r.length); acc = Array.from({ length: n }, (_, i) => qadd(acc[i] ?? Z, r[i] ?? Z)); } return acc; }
      case "mul": { let acc: Q[] = [ONE]; for (const y of x.xs) { const r = go(y); if (!r) return null; acc = mulP(acc, r); } return acc; }
      case "pow": { const k = constQ(x.b); if (!k || k.d !== 1n || k.n < 0n || k.n > 8n) return null; const r = go(x.a); if (!r) return null; let acc: Q[] = [ONE]; for (let i = 0n; i < k.n; i++) acc = mulP(acc, r); return acc; }
      default: return null;
    }
  };
  const c = go(a); if (!c) return null; const cs = c.slice(); while (cs.length > 1 && qsign(cs[cs.length - 1]) === 0) cs.pop(); return cs;
}
const exactSqrtQ = (x: Q): Q | null => { if (qsign(x) < 0) return null; const rt = (n: bigint): bigint | null => { let lo = 0n, hi = n < 2n ? n : BigInt(Math.ceil(Math.sqrt(Number(n)))) + 2n; while (lo <= hi) { const mid = (lo + hi) / 2n; const sq = mid * mid; if (sq === n) return mid; if (sq < n) lo = mid + 1n; else hi = mid - 1n; } return null; }; const a = rt(x.n), b = rt(x.d); return a !== null && b !== null ? q(a, b) : null; };
/** sqrt(L^2) for a linear L whose sign the restrictions decide becomes ±L; anything else is left for the exact kernel (which will not equate it with a signed expression) */
function signResolve(a: A, v: string, stated: Stated[], components: Stated[][] | null): A {
  const r = (x: A) => signResolve(x, v, stated, components);
  switch (a.t) {
    case "neg": return { t: "neg", a: r(a.a) };
    case "add": return { t: "add", xs: a.xs.map(r) };
    case "mul": return { t: "mul", xs: a.xs.map(r) };
    case "div": return { t: "div", a: r(a.a), b: r(a.b) };
    case "pow": return { t: "pow", a: r(a.a), b: r(a.b) };
    case "fn": {
      const arg = r(a.a);
      if (a.f === "sqrt") {
        const c = polyCoeffs(arg, v);
        if (c && c.length === 3 && qsign(c[2]) > 0) {
          const rc = exactSqrtQ(c[2]);
          if (rc && qeq(qmul(c[1], c[1]), qmul(q(4n), qmul(c[2], c[0])))) {
            const lin = { a: rc, b: qdiv(c[1], qmul(q(2n), rc)) }; // L = rc*x + c1/(2 rc)
            const L: A = { t: "add", xs: [{ t: "mul", xs: [{ t: "n", v: lin.a }, { t: "s", name: v }] }, { t: "n", v: lin.b }] };
            if (satisfied({ kind: "positive", key: "sgn+", lin, stateable: true, text: "" }, stated, components)) return L;
            if (satisfied({ kind: "positive", key: "sgn-", lin: { a: qneg(lin.a), b: qneg(lin.b) }, stateable: true, text: "" }, stated, components)) return { t: "neg", a: L };
          }
        }
      }
      return { t: "fn", f: a.f, a: arg };
    }
    default: return a;
  }
}
class Env {
  defs = new Map<string, A>();
  fdefs = new Map<string, Fdef>();
  dvs = new Map<string, A>();
  est: A[] = [];
  stated: Stated[];
  ov: Record<string, A> = {};
  nI = 0;
  hasI = false;
  constructor(readonly v: string, readonly problemFn: A | null, readonly dom: TaskDom) { this.stated = [...dom.stated]; }
}
const CONVENTION_FN = new Set(["f", "g", "h", "y", "r"]);

function resolve(a: A, env: Env, depth = 0, bound: Set<string> = new Set()): A {
  if (depth > 64) throw new Budget("expression nesting is too deep");
  const r = (x: A) => resolve(x, env, depth + 1, bound);
  switch (a.t) {
    case "n": case "pi": case "e": case "C": case "V": return a;
    case "s": {
      if (bound.has(a.name)) return a;
      if (a.name === env.v || a.name in env.ov) return a;
      const d = env.defs.get(a.name);
      if (d) return resolve(d, env, depth + 1, new Set([...bound, a.name]));
      { const fd = env.fdefs.get(a.name); if (fd && fd.param === env.v) return resolve(fd.body, env, depth + 1, bound); } // a bare function name denotes the function of the problem variable it was defined as
      if (/^d[A-Za-z]$/.test(a.name)) return a; // differential symbol, only legal on differential lines
      throw new Unbound(a.name);
    }
    case "neg": return { t: "neg", a: r(a.a) };
    case "add": return { t: "add", xs: a.xs.map(r) };
    case "mul": return { t: "mul", xs: a.xs.map(r) };
    case "div": return { t: "div", a: r(a.a), b: r(a.b) };
    case "pow": return { t: "pow", a: r(a.a), b: r(a.b) };
    case "fn": { const inner = r(a.a); return a.f === "sqrt" ? signResolve({ t: "fn", f: "sqrt", a: inner }, env.v, env.stated, env.dom.components) : { t: "fn", f: a.f, a: inner }; }
    case "call": {
      const f = lookupFn(a.name, env);
      if (!f || a.args.length !== 1) throw new Unbound(a.name);
      return r(substitute(f.body, f.param, a.args[0]));
    }
    case "Dcall": {
      const f = lookupFn(a.name, env); if (!f) throw new Unbound(a.name);
      let b = r(f.body);
      for (let i = 0; i < a.k; i++) b = d6(b, f.param, 0, env.ov);
      return r(substitute(b, f.param, a.arg));
    }
    case "D": return derivOf(a, env, depth);
    case "I": {
      if (a.lo) throw new Unsupported("a definite integral inside an expression");
      const w = a.v; let dw: A = N(1);
      const inner = resolve(a.f, env, depth + 1, bound);
      if (w !== env.v) { const d = env.defs.get(w); if (!d) throw new Unbound(w); dw = d6(resolve(d, env, depth + 1), env.v, 0, env.ov); }
      const name = `I#${env.nI++}`; env.hasI = true;
      env.ov[name] = dw.t === "n" && qeq(dw.v, ONE) ? inner : { t: "mul", xs: [inner, dw] };
      return S(name);
    }
    case "EV": case "LIM": throw new Unsupported("an evaluation bracket or limit inside an expression");
  }
}
function lookupFn(name: string, env: Env): Fdef | null {
  const f = env.fdefs.get(name); if (f) return f;
  if (CONVENTION_FN.has(name) && env.problemFn && !env.defs.has(name)) return { param: env.v, body: env.problemFn };
  return null;
}
function derivOf(a: Extract<A, { t: "D" }>, env: Env, depth: number): A {
  const w = a.v; let target: A;
  const of = a.of;
  if (of.t === "s" && env.defs.has(of.name) && w !== env.v) {
    const asWritten = env.defs.get(of.name)!;
    if (!hasVar(asWritten, w)) throw new Unsupported(`${of.name} is not written in terms of ${w}`);
    target = asWritten;
  } else if (of.t === "s" && !env.defs.has(of.name) && lookupFn(of.name, env) === null && of.name !== env.v && !(CONVENTION_FN.has(of.name) && env.problemFn)) throw new Unbound(of.name);
  else if (of.t === "s" && CONVENTION_FN.has(of.name) && !env.defs.has(of.name) && env.problemFn) target = env.problemFn;
  else target = of;
  let cur: A = w !== env.v && of.t === "s" && env.defs.has(of.name) ? target : resolve(target, env, depth + 1);
  for (let i = 0; i < a.k; i++) cur = d6(cur, w, 0, w === env.v ? env.ov : undefined);
  return w !== env.v ? resolve(cur, env, depth + 1) : cur;
}

// ================================================================================================ relations
interface Rel { status: "equal" | "different" | "unproven"; reqs: Req[]; note: string }
function relate(x: A, y: A, v: string, env: Env, viaDerivative: boolean): Rel {
  let a = x, b = y;
  if (viaDerivative) { a = d6(x, v, 0, env.ov); b = d6(y, v, 0, env.ov); }
  const res = compareExpr(a, b, v);
  return { status: res.status, reqs: res.reqs, note: res.note };
}
function unmet(reqs: Req[], env: Env, implied: Set<string>, exempt?: Q): { stateable: Req[]; hard: Req[] } {
  const stateable: Req[] = [], hard: Req[] = [];
  for (const r of reqs) {
    if (implied.has(r.key) || (r.allOf && r.allOf.every((k) => implied.has(k)))) continue;
    if (exempt && r.kind === "nonzero" && r.at !== undefined && qeq(r.at, exempt)) continue;
    if (r.stateable) { if (!satisfied(r, env.stated, env.dom.components)) stateable.push(r); } else hard.push(r);
  }
  return { stateable, hard };
}
function guard<T>(f: () => T): T | Judge {
  try { return f(); } catch (e) {
    if (e instanceof Unbound) return uns(`the symbol ${e.message} is not bound to the problem or to an earlier definition`);
    if (e instanceof Ambiguity) return { status: "ambiguous", reason: e.message };
    if (e instanceof NotationError) return { status: e.kind === "ambiguous" ? "ambiguous" : e.kind === "unsupported" ? "unsupported" : "malformed", reason: e.message };
    if (e instanceof Budget || e instanceof Overflow) return { status: "resource-exhausted", reason: "a resource bound was reached" };
    if (e instanceof Unsupported) return uns(e.message);
    throw e;
  }
}
const isJudge = (x: unknown): x is Judge => !!x && typeof x === "object" && "status" in (x as object) && "reason" in (x as object);

// ================================================================================================ line reading
type Item = { kind: "restriction"; stated: Stated[] } | { kind: "prose"; row: Row } | { kind: "math"; members: A[]; texts: string[] } | { kind: "bad"; judge: Judge };
function readItem(row: Row, env: Env, fnNames: Set<string>, variable: string): Item {
  const plain = row.plain;
  const rs = readRestrictions(plain, variable);
  if (rs && !/=\s*[^=<>!]/.test(plain.replace(/(?:!=|>=|<=)/g, ""))) return { kind: "restriction", stated: rs };
  { // "For x > 1: <claim>" states a restriction and makes a claim on the same line
    const m = /^(?:for|when|if|on|assuming|assume|suppose|where|given)\b([^:]+):\s*(\S.*)$/i.exec(plain);
    const head = m ? readRestrictions(m[1], variable) : null;
    if (m && head && !isProse(m[2])) { env.stated.push(...head); return readItem({ ...row, plain: m[2].trim() }, env, fnNames, variable); }
  }
  if (isProse(plain)) return { kind: "prose", row };
  const texts = splitEquals(plain);
  if (texts.length < 1 || texts.some((t) => !t.trim())) return { kind: "bad", judge: { status: "malformed", reason: "an empty part around an equals sign" } };
  try {
    const members = texts.map((t) => parseExpression(t, { fnNames, variable }));
    return { kind: "math", members, texts };
  } catch (e) {
    const g = guard(() => { throw e; });
    return { kind: "bad", judge: isJudge(g) ? g : uns("unreadable notation") };
  }
}
function preScanFns(rows: Row[], variable: string): Set<string> {
  const names = new Set<string>();
  for (const r of rows) {
    for (const m of r.plain.matchAll(/(?:^|[=\s(,])([A-Za-z])\s*'*\s*\(\s*([A-Za-z])\s*\)\s*(?==|\s*$|[,)])/g)) if (m[2] === variable && m[1] !== variable && !["e"].includes(m[1])) names.add(m[1]);
    const dm = /^\s*([A-Za-z])\s*'+/.exec(r.plain); if (dm) names.add(dm[1]);
  }
  return names;
}

// ================================================================================================ shared pieces
const finalForm = (a: A): boolean => {
  // an evaluated closed form: rational, or a short sum of rational multiples of pi, e, ln(integer), sqrt(integer)
  const terms = (x: A): A[] => (x.t === "add" ? x.xs.flatMap(terms) : x.t === "neg" ? terms(x.a).map((t) => neg(t)) : [x]);
  const coefOf = (t: A): { c: Q; g: A | null } | null => {
    let sign = 1n, cur = t; while (cur.t === "neg") { sign = -sign; cur = cur.a; }
    if (cur.t === "n") return { c: qmul(cur.v, q(sign)), g: null };
    if (cur.t === "div") { const nn = coefOf(cur.a), dd = constQ(cur.b); if (!nn || !dd || qsign(dd) === 0 || dd.d !== 1n || dd.n < 0n) return null; if (cur.b.t !== "n") return null; return { c: qdiv(nn.c, dd), g: nn.g }; }
    if (cur.t === "mul") { let c = ONE; let g: A | null = null; for (const f of cur.xs) { const k = coefOf(f); if (!k) return null; if (k.g) { if (g) return null; g = k.g; } else { if (f.t !== "n" && f.t !== "div") return null; c = qmul(c, k.c); } } if (cur.xs.filter((f) => f.t === "n").length > 1) return null; return { c: qmul(c, q(sign)), g }; }
    if (cur.t === "pi" || cur.t === "e") return { c: q(sign), g: cur };
    if (cur.t === "fn" && (cur.f === "ln" || cur.f === "sqrt") && cur.a.t === "n" && cur.a.v.d === 1n && cur.a.v.n >= 2n) return { c: q(sign), g: cur };
    if (cur.t === "pow" && cur.a.t === "e" && (cur.b.t === "n" || (cur.b.t === "neg" && cur.b.a.t === "n"))) return { c: q(sign), g: cur };
    if (cur.t === "fn" && cur.f === "exp" && (cur.a.t === "n" || (cur.a.t === "neg" && cur.a.a.t === "n"))) return { c: q(sign), g: cur };
    if (cur.t === "s" && cur.name === "i") return { c: q(sign), g: cur };
    return null;
  };
  const ts = terms(a); if (ts.length > 3) return false;
  const cs = ts.map(coefOf); if (cs.some((c) => !c)) return false;
  const keys = cs.map((c) => (c!.g ? jsonOf(c!.g) : "1")); if (new Set(keys).size !== keys.length) return false; // like terms not collected
  if (ts.length === 1) { const t = ts[0]; if (t.t === "div") { const nn = coefOf(t.a), dd = constQ(t.b); if (nn && dd && !nn.g && nn.c.d === 1n && dd.d === 1n) { let x = nn.c.n < 0n ? -nn.c.n : nn.c.n, y = dd.n; while (y) [x, y] = [y, x % y]; return x === 1n; } } }
  return true;
};
export { finalForm };

const unbound = (a: A, allowed: Set<string>, extra: Set<string>): string | null => { for (const s of freeSyms(a)) if (!allowed.has(s) && !extra.has(s)) return s; return null; };

function impliedOf(a: A, v: string): Set<string> {
  const keys = new Set<string>();
  let reqs: Req[] = []; try { reqs = domainReqs(a, v); } catch { return keys; }
  for (const r of reqs) { keys.add(r.key); if (r.kind === "positive" && r.lin) keys.add(`lin:${qtext(qneg(qdiv(r.lin.b, r.lin.a)))}`); }
  return keys;
}
// ================================================================================================ planner
export interface CalcResult { plan: E6Plan }
type TaskKind = "derivative" | "indefinite-integral" | "definite-integral" | "limit" | "continuity" | "differentiability";
const SUPPORTED_TASKS = new Set<string>(["derivative", "indefinite-integral", "definite-integral", "limit", "continuity", "differentiability"]);
export const supportsCalc = (p: CalculusProblem): boolean => SUPPORTED_TASKS.has(p.task);

/** The task domain from the proof context. Restrictions stay a conjunction; domain components stay alternatives. What cannot be read is reported, never dropped silently. */
function taskDomOf(ctx: ProofContext, v: string, notes: string[]): TaskDom {
  const read = (s: string): Stated[] | null => { try { return readRestrictions(normalize(s), v); } catch { return null; } };
  const stated: Stated[] = []; let components: Stated[][] | null = null;
  for (const s of ctx.restrictions) { const rs = read(s); if (rs) stated.push(...rs); else notes.push(`task restriction "${s}" could not be read by the exact calculus route; the working must state what it needs`); }
  for (const s of ctx.branches ?? []) { const rs = read(s); if (rs) (components ??= []).push(rs); else notes.push(`task domain component "${s}" could not be read by the exact calculus route and is not used`); }
  return { stated, components };
}
export function planCalculusE6(problem: CalculusProblem, rows: Row[], ctx: ProofContext = buildProofContext(problem)): E6Plan {
  const parsed = syntheticParse(rows, "calculus");
  const b = new Builder(parsed, "e6 exact kernels (formal identity with derived restrictions; Laurent-series limits)");
  const notes: string[] = [];
  const v = (problem as { variable?: string }).variable ?? "x";
  const fnNames = preScanFns(rows, v);
  const dom = taskDomOf(ctx, v, notes);
  try {
    switch (problem.task as TaskKind) {
      case "derivative": return derivative(problem as never, rows, parsed, b, notes, v, fnNames, dom);
      case "indefinite-integral": return indefinite(problem as never, rows, parsed, b, notes, v, fnNames, dom);
      case "definite-integral": return definite(problem as never, rows, parsed, b, notes, v, fnNames, dom);
      case "limit": return limitTask(problem as never, rows, parsed, b, notes, v, fnNames, dom);
      case "continuity": case "differentiability": return continuity(problem as never, rows, parsed, b, notes, v, fnNames, dom);
    }
  } catch (e) {
    if (e instanceof Budget || e instanceof Overflow) { rows.forEach((_, i) => { if (!b.records[i]) b.add(i, { status: "resource-exhausted", reason: "a resource bound was reached" }); }); return finish(parsed, b, { domain: "calculus", family: problem.task, nativeComplete: false, obligations: ["resource bound reached"], notes }); }
    throw e;
  }
  return finish(parsed, b, { domain: "calculus", family: problem.task, nativeComplete: false, obligations: ["unsupported calculus task"], notes });
}

function fillRest(rows: Row[], b: Builder, reason: string, status: Judge["status"] = "unsupported"): void { rows.forEach((_, i) => { if (!b.records[i]) b.add(i, { status, reason }); }); }

/** common handling for prose / restriction / bad lines. Returns true when the line was fully handled. */
function commonLine(item: Item, i: number, b: Builder, env: Env, c: { conclusions: { i: number; s: ReturnType<typeof readStatement> }[] }): boolean {
  if (item.kind === "bad") { b.add(i, item.judge); return true; }
  if (item.kind === "restriction") { env.stated.push(...item.stated); b.add(i, ok("restriction recorded as a stated assumption (carries no claim of its own)", "restriction statement preserved")); return true; }
  if (item.kind === "prose") { const s = readStatement(item.row.plain); c.conclusions.push({ i, s }); b.add(i, proseJudge(item.row)); return true; }
  return false;
}
const lone = (members: A[]) => members.length === 1;

// ---------------------------------------------------------------------------------------------- definitions
/** returns a judgement when the line is a definition (`u = …`, `f(x) = …`, `dv = … dx`, `v = …` after `dv`), else null. */
function definitionLine(members: A[], env: Env, problemCls: { kind: "fn-or-integrand"; expr: A } | null, v: string): Judge | null | "chain" {
  if (members.length !== 2) return null;
  const [l, r] = members;
  if (l.t === "call" && l.args.length === 1 && l.args[0].t === "s" && !env.fdefs.has(l.name) && !(CONVENTION_FN.has(l.name) && env.defs.has(l.name))) {
    const param = (l.args[0] as { name: string }).name; if (param !== v) return uns("function definitions in a variable other than the problem variable are not supported");
    if (hasNode(r, (x) => ["D", "Dcall", "I", "EV", "LIM", "call"].includes(x.t))) return null;
    const g = guard(() => { const un = unbound(r, new Set([v]), new Set(Object.keys(env.ov))); if (un && !env.defs.has(un)) throw new Unbound(un); return resolve(r, env); });
    if (isJudge(g)) return g;
    if (problemCls && CONVENTION_FN.has(l.name)) {
      const rel = guard(() => relate(g, problemCls.expr, v, env, false)); if (isJudge(rel)) return rel;
      if (rel.status === "different") return bad(`${l.name}(${v}) is defined as a different function from the one posed`);
      if (rel.status === "unproven") return uns(`could not compare ${l.name}(${v}) with the posed function`);
    }
    env.fdefs.set(l.name, { param, body: r }); env.est.push(r);
    return ok(`${l.name}(${v}) defined`, "definition checked against the posed function");
  }
  if (l.t === "s" && l.name !== v && !/^d[A-Za-z]$/.test(l.name) && !env.defs.has(l.name) && !env.dvs.has(l.name) && !env.fdefs.has(l.name)) {
    if (hasNode(r, (x) => ["D", "Dcall", "I", "EV", "LIM"].includes(x.t))) return null;
    const un = unbound(r, new Set([v]), new Set(Object.keys(env.ov)));
    if (un && !env.defs.has(un)) return uns(`the symbol ${un} is not bound to the problem or to an earlier definition`);
    if (problemCls && CONVENTION_FN.has(l.name)) {
      const g = guard(() => { const rr = resolve(r, env); const rel = relate(rr, problemCls.expr, v, env, false); return rel; });
      if (isJudge(g)) return g;
      if (g.status === "different") return bad(`${l.name} is defined as a different expression from the one posed`);
      if (g.status === "unproven") return uns(`could not compare ${l.name} with the posed expression`);
    }
    env.defs.set(l.name, r); env.est.push(r);
    return ok(`${l.name} defined`, "definition recorded");
  }
  void qtext; void incomplete; void missing; void worst; void digestOf; void div; void fn; void evalNum; void visiblyPositive; void plainLogArgs; void domainReqs; void limitOf;
  return "chain";
}

/** differential statements: `du = 2x dx`, `dv = e^x dx`, `dx = du/2`; `v = e^x` after `dv = …` */
function differentialLine(members: A[], env: Env, v: string): Judge | null {
  const isDiff = (a: A) => hasNode(a, (x) => x.t === "s" && /^d[A-Za-z]$/.test(x.name) && !env.defs.has(x.name) || (x.t === "s" && x.name === "dx"));
  if (members.length === 2 && members[1].t !== undefined && members[0].t === "s" && /^d[A-Za-z]$/.test(members[0].name)) {
    const nm = members[0].name.slice(1);
    if (nm !== v && !env.defs.has(nm)) {
      // dv = h dx  -> v' = h
      const rhs = members[1]; const parts = rhs.t === "mul" ? rhs.xs : [rhs]; const k = parts.findIndex((p) => p.t === "s" && p.name === `d${v}`);
      if (k < 0) return uns("a differential definition must be written as a multiple of d" + v);
      const rest = parts.filter((_, j) => j !== k);
      const h = rest.length === 0 ? N(1) : rest.length === 1 ? rest[0] : mul(...rest);
      const g = guard(() => resolve(h, env)); if (isJudge(g)) return g;
      env.dvs.set(nm, g); return ok(`d${nm} recorded: ${nm}' = (that coefficient)`, "differential definition recorded");
    }
  }
  if (!members.some(isDiff)) return null;
  // general differential identity: replace dN by N'(x) dx for every defined N and compare as functions in x (dx is a free parameter)
  const sub = (a: A): A => {
    if (a.t === "s" && /^d[A-Za-z]$/.test(a.name)) { const nm = a.name.slice(1); if (nm === v) return a; if (env.defs.has(nm)) return mul(d6(resolve(env.defs.get(nm)!, env), v, 0, env.ov), S(`d${v}`)); if (env.dvs.has(nm)) return mul(env.dvs.get(nm)!, S(`d${v}`)); throw new Unbound(a.name); }
    switch (a.t) { case "neg": return neg(sub(a.a)); case "add": return add(...a.xs.map(sub)); case "mul": return mul(...a.xs.map(sub)); case "div": return div(sub(a.a), sub(a.b)); case "pow": return pw(sub(a.a), sub(a.b)); case "fn": return fn(a.f, sub(a.a)); default: return a; }
  };
  const vals = guard(() => members.map((m) => resolve(sub(m), env)));
  if (isJudge(vals)) return vals;
  for (let k = 0; k + 1 < vals.length; k++) {
    const rel = guard(() => compareExpr(mul(vals[k], N(1)), vals[k + 1], v)); if (isJudge(rel)) return rel;
    if (rel.status === "different") return bad("the differential relation does not hold");
    if (rel.status === "unproven") return uns("could not decide this differential relation");
  }
  return ok("differential relation verified against the definition", "differential relation checked exactly");
}
const dvDefinition = (members: A[], env: Env, v: string): Judge | null => {
  if (members.length >= 2 && members[0].t === "s" && env.dvs.has(members[0].name) && !env.defs.has(members[0].name)) {
    const nm = members[0].name; const h = env.dvs.get(nm)!;
    const vals = guard(() => members.slice(1).map((m) => resolve(m, env))); if (isJudge(vals)) return vals;
    for (const val of vals) {
      const d = d6(val, v, 0, env.ov);
      const rel = guard(() => compareExpr(d, h, v)); if (isJudge(rel)) return rel;
      if (rel.status === "different") return bad(`${nm} does not have the derivative set by d${nm}`);
      if (rel.status === "unproven") return uns(`could not compare the derivative of ${nm}`);
    }
    env.defs.set(nm, members[1]); env.dvs.delete(nm); return ok(`${nm} agrees with its differential`, "antiderivative of the stated differential verified by differentiation");
  }
  return null;
};

// ---------------------------------------------------------------------------------------------- derivative
function derivative(problem: Extract<CalculusProblem, { task: "derivative" }>, rows: Row[], parsed: ReturnType<typeof syntheticParse>, b: Builder, notes: string[], v: string, fnNames: Set<string>, dom: TaskDom): E6Plan {
  const order = problem.order ?? 1; const f0 = signResolve(fromExpr(problem.expression), v, dom.stated, dom.components);
  const env = new Env(v, f0, dom); env.est.push(f0);
  let truth: A; try { truth = f0; for (let i = 0; i < order; i++) truth = d6(truth, v); } catch (e) { const g = guard(() => { throw e; }); fillRest(rows, b, isJudge(g) ? g.reason : "outside the differentiation rules", isJudge(g) ? g.status : "unsupported"); return finish(parsed, b, { domain: "calculus", family: "derivative", nativeComplete: false, obligations: ["the posed function is outside the exact differentiation rules"], notes }); }
  const implied = impliedOf(f0, v);
  const c = { conclusions: [] as { i: number; s: ReturnType<typeof readStatement> }[] };
  let finalOk = false, finalClosed = false; let finalText = ""; let finalRow = -1;
  rows.forEach((row, i) => {
    const item = readItem(row, env, fnNames, v); if (commonLine(item, i, b, env, c)) return;
    let members = (item as Extract<Item, { kind: "math" }>).members;
    if (members.length === 1) { b.add(i, uns("a line must state an equality; a bare expression is not a derivation step")); return; }
    // `dp/ds = …` where p is an otherwise unbound name: p labels the posed function (the derivative of the posed function is what is claimed)
    { const m0 = members[0];
      if (m0.t === "D" && m0.of.t === "s" && m0.v === v && m0.k === order && m0.of.name !== v && !env.defs.has(m0.of.name) && !fnNames.has(m0.of.name) && !env.fdefs.has(m0.of.name) && members.length === 2 && !hasNode(members[1], (x) => x.t === "s" && x.name === m0.of.name)) members = [{ t: "D", of: f0, v, k: order } as A, ...members.slice(1)]; }
    const dvj = dvDefinition(members, env, v); if (dvj) { b.add(i, dvj); return; }
    const dj = differentialLine(members, env, v); if (dj) { b.add(i, dj); return; }
    const def = definitionLine(members, env, { kind: "fn-or-integrand", expr: f0 }, v);
    if (def && def !== "chain") { b.add(i, def); return; }
    const j = chain(members, env, v, implied, { derivativeOperandCheck: true });
    if (j.judge.status === "valid") {
      const last = members[members.length - 1];
      for (const val of j.values) if (env.est.length < 64) env.est.push(val);
      const lv = j.values[j.values.length - 1];
      const rel = guard(() => relate(lv, truth, v, env, false));
      if (!isJudge(rel) && rel.status === "equal" && unmet(rel.reqs, env, implied).stateable.length === 0) {
        finalOk = true; finalText = rows[i].raw; finalRow = i;
        const un = guard(() => { const nb = unbound(last, new Set([v]), new Set()); return nb; });
        finalClosed = !isJudge(un) && un === null && !hasNode(last, (x) => ["D", "Dcall", "I", "EV", "LIM", "call"].includes(x.t)) ;
      } else finalOk = false;
    }
    b.add(i, j.judge);
  });
  fillRest(rows, b, "verification stopped before this line was checked");
  const allValid = b.records.every((r) => r?.judge.status === "valid");
  const lastIsNumbered = finalOk && finalClosed && finalRow === rows.length - 1;
  const complete = allValid && lastIsNumbered;
  if (allValid && !complete) markLast(rows, b, finalOk ? "state the derivative purely in terms of " + v : "finish with an explicit expression for the requested derivative");
  return finish(parsed, b, { domain: "calculus", family: "derivative", nativeComplete: complete, obligations: complete ? [] : [finalOk ? "state the derivative purely in terms of " + v : "finish with an explicit expression for the requested derivative"], notes, finalValue: complete ? { kind: "expression", text: finalText } : null });
}
function markLast(rows: Row[], b: Builder, why: string): void {
  const last = rows.length - 1; const r = b.records[last];
  if (r && r.judge.status === "valid") b.records[last] = { ...r, judge: { status: "incomplete", reason: why }, evidence: null };
}

interface ChainOut { judge: Judge; values: A[] }
function chain(members: A[], env: Env, v: string, implied: Set<string>, opts: { derivativeOperandCheck?: boolean; antiderivative?: boolean; antiderivTruth?: A | null }): ChainOut {
  void opts.antiderivTruth;
  const g = guard(() => {
    const allowed = new Set([v]);
    for (const m of members) {
      if (hasNode(m, (x) => x.t === "LIM" || x.t === "EV" || (x.t === "I" && !!x.lo))) throw new Unsupported("limits, evaluation brackets and definite integrals are not part of this kind of line");
    }
    const vals = members.map((m) => resolve(m, env));
    for (const val of vals) { const un = unbound(val, allowed, new Set(Object.keys(env.ov))); if (un) throw new Unbound(un); }
    return vals;
  });
  if (isJudge(g)) return { judge: g, values: [] };
  const vals = g; const viaDeriv = Object.keys(env.ov).some((k) => vals.some((x) => hasNode(x, (n) => n.t === "s" && n.name === k)));
  // operand binding of an explicit derivative operator
  if (opts.derivativeOperandCheck) {
    for (const m of members) if (m.t === "D" && !(m.of.t === "s")) {
      const operand = guard(() => resolve(m.of, env)); if (isJudge(operand)) return { judge: operand, values: [] };
      let connected = false; let unknown: Judge | null = null;
      for (const e of env.est) {
        for (const s of subNodes(e)) {
          if (s.t === "n" || nodeCount(s) > 40) continue;
          const r = guard(() => relate(s, operand, v, env, false));
          if (isJudge(r)) { unknown = r; continue; }
          if (r.status === "equal") { connected = true; break; }
        }
        if (connected) break;
      }
      if (!connected) return { judge: unknown ?? bad("this line differentiates an expression that is neither the posed function nor part of it"), values: [] };
    }
  }
  const js: Judge[] = [];
  for (let k = 0; k + 1 < vals.length; k++) {
    const rel = guard(() => relate(vals[k], vals[k + 1], v, env, viaDeriv)); if (isJudge(rel)) { js.push(rel); continue; }
    if (rel.status === "different") { js.push(bad(`the statement ${k === 0 ? "" : "after the first step "}is not an identity: ${rel.note}`)); continue; }
    if (rel.status === "unproven") { js.push(uns(rel.note)); continue; }
    const um = unmet(rel.reqs, env, implied);
    if (um.hard.length) { js.push(uns("an unstatable restriction is needed to justify this step")); continue; }
    if (um.stateable.length) { js.push(missing(`state the restriction ${um.stateable.map((r) => r.text).join(", ")} before relying on this step`)); continue; }
    js.push(ok("members are equal (formal identity)", "exact formal identity in the independent kernel", digestOf([jsonOf(vals[k]), jsonOf(vals[k + 1])])));
  }
  return { judge: js.length ? worst(js) : uns("nothing to compare"), values: vals };
}

// ---------------------------------------------------------------------------------------------- indefinite integral
function indefinite(problem: Extract<CalculusProblem, { task: "indefinite-integral" }>, rows: Row[], parsed: ReturnType<typeof syntheticParse>, b: Builder, notes: string[], v: string, fnNames: Set<string>, dom: TaskDom): E6Plan {
  const g0 = signResolve(fromExpr(problem.integrand), v, dom.stated, dom.components);
  const env = new Env(v, null, dom); env.est.push(g0);
  const implied = impliedOf(g0, v);
  const c = { conclusions: [] as { i: number; s: ReturnType<typeof readStatement> }[] };
  let finalOk = false, finalClosed = false, finalHasC = false; let finalText = ""; let finalRow = -1;
  rows.forEach((row, i) => {
    const item = readItem(row, env, fnNames, v); if (commonLine(item, i, b, env, c)) return;
    const members = (item as Extract<Item, { kind: "math" }>).members;
    if (members.length === 1) { b.add(i, uns("a line must state an equality; a bare expression is not a derivation step")); return; }
    const dvj = dvDefinition(members, env, v); if (dvj) { b.add(i, dvj); return; }
    const dj = differentialLine(members, env, v); if (dj) { b.add(i, dj); return; }
    const def = definitionLine(members, env, null, v); if (def && def !== "chain") { b.add(i, def); return; }
    const hasIntegral = members.some((m) => hasNode(m, (x) => x.t === "I"));
    const hasC = members.map((m) => hasNode(m, (x) => x.t === "C"));
    if (!hasIntegral && !hasC.some(Boolean)) {
      // plain algebra on the integrand (partial fractions, rewriting): function equality, must connect to an established form
      const j = chain(members, env, v, implied, {});
      if (j.judge.status === "valid") {
        const connected = j.values.some((val) => env.est.some((e) => { const r = guard(() => relate(e, val, v, env, false)); return !isJudge(r) && r.status === "equal"; }));
        if (!connected) { b.add(i, uns("this rewriting is not connected to the integrand or to an earlier form")); return; }
        j.values.forEach((val) => env.est.push(val));
      }
      b.add(i, j.judge); return;
    }
    // integral chain: compare antiderivative families through derivatives
    const j = chain(members, env, v, implied, { antiderivative: true });
    if (j.judge.status !== "valid") { b.add(i, j.judge); return; }
    // the chain must be an antiderivative statement about the posed integrand (or an established equivalent)
    const dFirst = guard(() => d6(j.values[0], v, 0, env.ov)); if (isJudge(dFirst)) { b.add(i, dFirst); return; }
    const connected = env.est.some((e) => { const r = guard(() => relate(e, dFirst, v, env, false)); return !isJudge(r) && r.status === "equal"; });
    if (!connected) { b.add(i, bad("this line integrates something other than the posed integrand")); return; }
    const last = members[members.length - 1], lastVal = j.values[j.values.length - 1];
    const lastHasI = hasNode(last, (x) => x.t === "I");
    const lastHasC = hasNode(last, (x) => x.t === "C");
    const closed = !lastHasI && unbound(last, new Set([v]), new Set()) === null;
    // every non-integral, constant-free member of a chain that states an integral lacks the constant of integration
    const constantless = members.some((m, k) => !hasNode(m, (x) => x.t === "I") && !hasNode(m, (x) => x.t === "C") && k > 0);
    // domain rule: ln(p) without |.| silently assumes p > 0
    const logs = plainLogArgs(last).concat(plainLogArgs(lastVal)).filter((a) => !visiblyPositive(a) && !(a.t === "pow" && a.a.t === "s") && hasVar(a, v));
    const logReqs: Req[] = [];
    for (const a of logs) { const rr = guard(() => domainReqs(fn("ln", a), v)); if (!isJudge(rr)) for (const r of rr) if (r.kind === "positive" && !implied.has(r.key)) logReqs.push(r); }
    const posOfIntegrand = logReqs.filter((r) => !satisfied(r, env.stated, env.dom.components));
    if (posOfIntegrand.length && closed) {
      const hard = posOfIntegrand.filter((r) => !r.stateable);
      if (hard.length) { b.add(i, uns("the logarithm's domain cannot be stated in supported notation")); return; }
      b.add(i, missing(`state the domain ${posOfIntegrand.map((r) => r.text).join(", ")} (a logarithm without absolute value assumes it)`)); return;
    }
    if (closed && !lastHasC) { b.add(i, missing("the constant of integration + C is missing")); return; }
    if (closed && lastHasC) { finalOk = true; finalClosed = true; finalHasC = true; finalText = row.raw; finalRow = i; }
    else if (!closed && !lastHasI) { finalOk = true; finalClosed = false; }
    b.add(i, j.judge);
  });
  fillRest(rows, b, "verification stopped before this line was checked");
  const allValid = b.records.every((r) => r?.judge.status === "valid");
  const complete = allValid && finalOk && finalClosed && finalHasC && finalRow === rows.length - 1;
  const why = finalOk && !finalClosed ? "express the antiderivative in terms of " + v + " (substitute back)" : "finish with the antiderivative plus + C";
  if (allValid && !complete) markLast(rows, b, why);
  return finish(parsed, b, { domain: "calculus", family: "indefinite-integral", nativeComplete: complete, obligations: complete ? [] : [why], notes, finalValue: complete ? { kind: "expression", text: finalText } : null });
}

// ---------------------------------------------------------------------------------------------- definite integral
function boundQ(a: A | undefined): Q | null { return a ? constQ(a) : null; }
function constOnly(a: A): boolean { return !hasNode(a, (x) => x.t === "s"); }
function definite(problem: Extract<CalculusProblem, { task: "definite-integral" }>, rows: Row[], parsed: ReturnType<typeof syntheticParse>, b: Builder, notes: string[], v: string, fnNames: Set<string>, dom: TaskDom): E6Plan {
  if (problem.improper) { fillRest(rows, b, "improper integrals are outside the exact definite-integral binder"); return finish(parsed, b, { domain: "calculus", family: "definite-integral", nativeComplete: false, obligations: ["improper integrals are not supported by this binder"], notes }); }
  const g0 = signResolve(fromExpr(problem.integrand), v, dom.stated, dom.components);
  const loA = parseExpression(String(problem.lower), { fnNames: new Set(), variable: v }), hiA = parseExpression(String(problem.upper), { fnNames: new Set(), variable: v });
  const lo0 = evalNum(loA, {}), hi0 = evalNum(hiA, {});
  const env = new Env(v, null, dom); env.est.push(g0);
  const implied = impliedOf(g0, v);
  const c = { conclusions: [] as { i: number; s: ReturnType<typeof readStatement> }[] };
  // the integrand must be continuous on [lo, hi] for the fundamental theorem; screened on an exact rational grid (a hit only ever rejects)
  const singular = (f: A, a: number, z: number): boolean => {
    const N0 = 2520;
    for (let k = 0; k <= N0; k++) { const x = a + ((z - a) * k) / N0; let y: number; try { y = evalNum(f, { [v]: x }); } catch { return true; } if (!Number.isFinite(y) || Math.abs(y) > 1e9) return true; }
    return false;
  };
  const isSingular = guard(() => singular(g0, lo0, hi0));
  if (isJudge(isSingular)) { fillRest(rows, b, isSingular.reason, isSingular.status); return finish(parsed, b, { domain: "calculus", family: "definite-integral", nativeComplete: false, obligations: [isSingular.reason], notes }); }
  if (isSingular) { fillRest(rows, b, "the integrand is not continuous on the interval, so the fundamental theorem does not apply directly"); return finish(parsed, b, { domain: "calculus", family: "definite-integral", nativeComplete: false, obligations: ["treat the discontinuity as an improper integral"], notes }); }
  let trueValue: A | null = null; let valueKnown = false; let finalOk = false; let finalText = ""; let finalRow = -1;
  rows.forEach((row, i) => {
    const item = readItem(row, env, fnNames, v); if (commonLine(item, i, b, env, c)) return;
    const members = (item as Extract<Item, { kind: "math" }>).members;
    if (members.length === 1) { b.add(i, uns("a line must state an equality; a bare expression is not a derivation step")); return; }
    const dvj = dvDefinition(members, env, v); if (dvj) { b.add(i, dvj); return; }
    const def = definitionLine(members, env, null, v); if (def && def !== "chain") { b.add(i, def); return; }
    // evaluate members to constants where possible
    const js: Judge[] = []; const vals: ({ kind: "const"; a: A } | { kind: "di" } | { kind: "fn"; a: A })[] = [];
    let diSeen = false, evSeen = false;
    for (const m of members) {
      if (m.t === "I" && m.lo) {
        if (m.v !== v || !m.lo || !m.hi || !constOnly(m.lo) || !constOnly(m.hi)) { b.add(i, uns("this definite integral is not in the problem variable with constant bounds")); return; }
        const ge = guard(() => resolve(m.f, env)); if (isJudge(ge)) { b.add(i, ge); return; }
        const rel = guard(() => relate(ge, g0, v, env, false)); if (isJudge(rel)) { b.add(i, rel); return; }
        const sameB = (() => { const r1 = guard(() => compareExpr(m.lo!, loA, v)), r2 = guard(() => compareExpr(m.hi!, hiA, v)); return !isJudge(r1) && !isJudge(r2) && r1.status === "equal" && r2.status === "equal"; })();
        if (rel.status !== "equal" || !sameB) { b.add(i, bad("this integral is not the posed definite integral")); return; }
        vals.push({ kind: "di" }); diSeen = true; continue;
      }
      if (m.t === "EV") {
        const F = guard(() => resolve(m.f, env)); if (isJudge(F)) { b.add(i, F); return; }
        const lo = guard(() => resolve(m.lo, env)), hi = guard(() => resolve(m.hi, env)); if (isJudge(lo)) { b.add(i, lo); return; } if (isJudge(hi)) { b.add(i, hi); return; }
        const lob = compareExpr(lo, loA, v), hib = compareExpr(hi, hiA, v);
        if (lob.status !== "equal" || hib.status !== "equal") { b.add(i, bad("the evaluation limits are not the posed bounds")); return; }
        const dF = guard(() => d6(F, v)); if (isJudge(dF)) { b.add(i, dF); return; }
        const rel = guard(() => relate(dF, g0, v, env, false)); if (isJudge(rel)) { b.add(i, rel); return; }
        if (rel.status === "different") { b.add(i, bad("the bracketed function is not an antiderivative of the integrand")); return; }
        if (rel.status === "unproven") { b.add(i, uns(rel.note)); return; }
        if (singular(F, lo0, hi0)) { b.add(i, uns("the antiderivative is not defined on the whole interval")); return; }
        const val = add(substitute(F, v, hiA), neg(substitute(F, v, loA)));
        if (!valueKnown) { trueValue = val; valueKnown = true; }
        vals.push({ kind: "const", a: val }); evSeen = true; continue;
      }
      const r = guard(() => resolve(m, env)); if (isJudge(r)) { b.add(i, r); return; }
      if (constOnly(r)) vals.push({ kind: "const", a: r }); else vals.push({ kind: "fn", a: r });
    }
    void evSeen;
    if (vals.some((x) => x.kind === "fn")) { b.add(i, uns("a function of the variable cannot be compared with a number in a definite-integral chain")); return; }
    for (let k = 0; k + 1 < vals.length; k++) {
      const p = vals[k], qv = vals[k + 1];
      if (p.kind === "di" && qv.kind === "di") { js.push(ok("same integral restated", "same integral")); continue; }
      if (p.kind === "di" || qv.kind === "di") {
        const other = (p.kind === "di" ? qv : p) as { kind: "const"; a: A };
        if (valueKnown) {
          const rel = guard(() => compareExpr(other.a, trueValue!, v)); if (isJudge(rel)) { js.push(rel); continue; }
          js.push(rel.status === "equal" ? ok("value agrees with the value fixed by the verified antiderivative", "fundamental theorem with a verified antiderivative", digestOf([jsonOf(other.a)])) : rel.status === "different" ? bad("this value does not match the definite integral") : uns(rel.note));
        } else {
          // no verified antiderivative yet: the value is only checked numerically to refute; it can never be accepted on that basis
          const num = guard(() => numericIntegral(g0, v, lo0, hi0, evalNum(other.a, {})));
          js.push(isJudge(num) ? num : num === "differ" ? bad("this value does not match the definite integral") : uns("the value is not supported by a verified antiderivative"));
        }
        continue;
      }
      const rel = guard(() => compareExpr(p.a, qv.a, v)); if (isJudge(rel)) { js.push(rel); continue; }
      js.push(rel.status === "equal" ? ok("numeric members are equal", "exact constant identity", digestOf([jsonOf(p.a), jsonOf(qv.a)])) : rel.status === "different" ? bad("these two numbers are not equal") : uns(rel.note));
    }
    const j = js.length ? worst(js) : uns("nothing to compare");
    if (j.status === "valid" && !diSeen && !valueKnown) { b.add(i, uns("this line is not connected to the posed integral")); return; }
    if (j.status === "valid") {
      const lastVal = vals[vals.length - 1];
      const last = members[members.length - 1];
      if (lastVal.kind === "const" && valueKnown && finalForm(last) && constOnly(last)) {
        const rel = guard(() => compareExpr(lastVal.a, trueValue!, v));
        if (!isJudge(rel) && rel.status === "equal") { finalOk = true; finalText = row.raw; finalRow = i; } else finalOk = false;
      } else finalOk = false;
    }
    b.add(i, j);
  });
  fillRest(rows, b, "verification stopped before this line was checked");
  const allValid = b.records.every((r) => r?.judge.status === "valid");
  const complete = allValid && finalOk && finalRow === rows.length - 1;
  const why = "evaluate the integral to a single number";
  if (allValid && !complete) markLast(rows, b, why);
  return finish(parsed, b, { domain: "calculus", family: "definite-integral", nativeComplete: complete, obligations: complete ? [] : [why], notes, finalValue: complete ? { kind: "value", text: finalText } : null });
}
function numericIntegral(g: A, v: string, a: number, z: number, claim: number): "differ" | "unknown" {
  const n = 4000; let s = 0;
  for (let k = 0; k < n; k++) { const x = a + ((k + 0.5) * (z - a)) / n; s += evalNum(g, { [v]: x }); }
  s *= (z - a) / n;
  return Math.abs(s - claim) > 1e-6 * Math.max(1, Math.abs(s)) ? "differ" : "unknown";
}

// ---------------------------------------------------------------------------------------------- limits
const ptOf = (approach: string): Q | "inf" | "-inf" => (approach === "infinity" ? "inf" : approach === "-infinity" ? "-inf" : qOf(approach));
const limEq = (a: LimV, b2: LimV): boolean => a.kind === b2.kind && (a.kind === "finite" ? qeq(a.value, (b2 as { value: Q }).value) : a.kind === "inf" ? a.sign === (b2 as { sign: 1 | -1 }).sign : true);
function limValueOf(m: Extract<A, { t: "LIM" }>, env: Env, v: string): { val: LimV; inner: A; pt: Q | "inf" | "-inf" } | Judge {
  const w = m.v;
  const inner = guard(() => resolve(m.f, env, 0, new Set([w]))); if (isJudge(inner)) return inner;
  let pt: Q | "inf" | "-inf";
  if (m.at === "inf" || m.at === "-inf") pt = m.at; else { const k = constQ(m.at); if (!k) return uns("the limit point must be a number or infinity"); pt = k; }
  void v;
  const val = guard(() => limitOf(inner, w, pt, m.side)); if (isJudge(val)) return val;
  return { val, inner, pt };
}
function limitTask(problem: Extract<CalculusProblem, { task: "limit" }>, rows: Row[], parsed: ReturnType<typeof syntheticParse>, b: Builder, notes: string[], v: string, fnNames: Set<string>, dom: TaskDom): E6Plan {
  const f0 = signResolve(fromExpr(problem.expression), v, dom.stated, dom.components); const pt0 = ptOf(problem.approach); const side0 = problem.side ?? "both";
  const env = new Env(v, f0, dom); env.est.push(f0);
  const truth = guard(() => limitOf(f0, v, pt0, side0));
  if (isJudge(truth)) { fillRest(rows, b, truth.reason, truth.status); return finish(parsed, b, { domain: "calculus", family: "limit", nativeComplete: false, obligations: [truth.reason], notes }); }
  const c = { conclusions: [] as { i: number; s: ReturnType<typeof readStatement> }[] };
  const exempt = pt0 !== "inf" && pt0 !== "-inf" ? pt0 : undefined;
  const implied = impliedOf(f0, v);
  let finalOk = false, finalText = ""; let connectedToProblem = false; let dneSaid = false; let finalRow = -1;
  rows.forEach((row, i) => {
    const item = readItem(row, env, fnNames, v);
    if (item.kind === "prose") { const s = readStatement(item.row.plain); if (s.limitStatement === "dne") dneSaid = true; }
    if (commonLine(item, i, b, env, c)) { if (item.kind === "prose" && readStatement(item.row.plain).limitStatement === "dne") { finalOk = truth.kind === "dne"; finalText = row.raw; finalRow = i;
      { const head = item.row.plain.replace(/\b(?:does\s+not\s+exist|dne|diverges?)\b.*$/i, "").replace(/\b(?:so|thus|hence|therefore|the limit)\b/gi, "").trim();
        if (/^lim/i.test(head)) { const it = readItem({ ...row, plain: head }, env, fnNames, v); if (it.kind === "math" && it.members.length === 1 && it.members[0].t === "LIM") { const m0 = it.members[0]; const r = limValueOf(m0, env, v); if (!isJudge(r) && m0.v === v && m0.side === side0 && (r.pt === pt0 || (typeof r.pt !== "string" && typeof pt0 !== "string" && qeq(r.pt, pt0)))) { const r0 = guard(() => relate(r.inner, f0, v, env, false)); if (!isJudge(r0) && r0.status === "equal") connectedToProblem = true; } } } } b.add(i, truth.kind !== "dne" ? bad("the limit does exist") : ok("the stated non-existence agrees with the exactly computed one-sided limits", "conclusion checked against exact limit behaviour")); } return; }
    const members = (item as Extract<Item, { kind: "math" }>).members;
    if (members.length === 1) { b.add(i, uns("a line must state an equality; a bare expression is not a derivation step")); return; }
    const def = definitionLine(members, env, null, v); if (def && def !== "chain") { b.add(i, def); return; }
    type V = { kind: "lim"; val: LimV; inner: A; pt: Q | "inf" | "-inf" } | { kind: "const"; a: A; q: Q | null } | { kind: "fn"; a: A } | { kind: "special"; val: LimV };
    const vals: V[] = [];
    for (const m of members) {
      if (m.t === "LIM") {
        const r = limValueOf(m, env, v); if (isJudge(r)) { b.add(i, r); return; }
        const sameApproach = m.v === v && (r.pt === pt0 || (typeof r.pt !== "string" && typeof pt0 !== "string" && qeq(r.pt, pt0)));
        // the point must be the posed one; a one-sided (or two-sided) limit of the same function at that point is a legitimate lemma whose value is evaluated on its own side
        if (m.v !== v) { b.add(i, uns("limits in a variable other than the problem variable are not supported")); return; }
        if (!sameApproach) { b.add(i, bad("this limit is taken at a different point than the posed limit")); return; }
        vals.push({ kind: "lim", ...r }); continue;
      }
      if (m.t === "neg" && m.a.t === "V" && m.a.k === "inf") { vals.push({ kind: "special", val: { kind: "inf", sign: -1 } }); continue; }
      if (m.t === "V") { vals.push({ kind: "special", val: m.k === "dne" ? { kind: "dne" } : { kind: "inf", sign: m.k === "inf" ? 1 : -1 } }); continue; }
      const r = guard(() => resolve(m, env)); if (isJudge(r)) { b.add(i, r); return; }
      if (constOnly(r)) {
        const k = constValue(r);
        const zeroDiv = hasNode(r, (x) => x.t === "div" && constQ(x.b) !== null && qsign(constQ(x.b)!) === 0);
        if (zeroDiv) { b.add(i, uns("an expression with a zero denominator is not a number")); return; }
        vals.push({ kind: "const", a: r, q: k });
      } else vals.push({ kind: "fn", a: r });
    }
    const js: Judge[] = [];
    for (let k = 0; k + 1 < vals.length; k++) {
      const p = vals[k], qv = vals[k + 1];
      const asLim = (x: V): LimV | null => (x.kind === "lim" ? x.val : x.kind === "special" ? x.val : x.kind === "const" && x.q ? { kind: "finite", value: x.q } : null);
      if (p.kind === "fn" && qv.kind === "fn") {
        const rel = guard(() => relate(p.a, qv.a, v, env, false)); if (isJudge(rel)) { js.push(rel); continue; }
        if (rel.status === "different") { js.push(bad("these two expressions are not equal as functions")); continue; }
        if (rel.status === "unproven") { js.push(uns(rel.note)); continue; }
        // a limit depends only on a punctured neighbourhood: isolated excluded points (x != r) never matter, one-sided positivity still does
        const um = unmet(rel.reqs.filter((r) => r.kind === "positive"), env, implied, exempt);
        if (um.hard.length) { js.push(uns("an unstatable restriction is needed for this step")); continue; }
        if (um.stateable.length) { js.push(missing(`state ${um.stateable.map((r) => r.text).join(", ")}`)); continue; }
        if (!connectedToProblem) { const r0 = guard(() => relate(p.a, f0, v, env, false)); if (!isJudge(r0) && r0.status === "equal") connectedToProblem = true; }
        js.push(ok("equal as functions away from the limit point", "exact formal identity in the independent kernel", digestOf([jsonOf(p.a), jsonOf(qv.a)]))); continue;
      }
      if (p.kind === "fn" || qv.kind === "fn") { js.push(uns("a function of the variable cannot be set equal to a limit or a number without a limit sign")); continue; }
      if (p.kind === "const" && qv.kind === "const" && (p.q === null || qv.q === null)) {
        const rel = guard(() => compareExpr(p.a, qv.a, v)); if (isJudge(rel)) { js.push(rel); continue; }
        js.push(rel.status === "equal" ? ok("numbers are equal", "exact constant identity") : rel.status === "different" ? bad("these two numbers are not equal") : uns(rel.note)); continue;
      }
      const lp = asLim(p), lq = asLim(qv);
      if (!lp || !lq) { js.push(uns("a non-rational value cannot be compared with a limit in this binder")); continue; }
      // L'Hopital: second limit's integrand is the quotient of derivatives of the first's numerator and denominator
      if (p.kind === "lim" && qv.kind === "lim" && p.inner.t === "div") {
        const nm = p.inner.a, dn = p.inner.b;
        const same = guard(() => relate(p.inner, qv.inner, v, env, false));
        if (!isJudge(same) && same.status !== "equal") {
          const dq = guard(() => div(d6(nm, v), d6(dn, v)));
          if (!isJudge(dq)) {
            const rel = guard(() => relate(dq, qv.inner, v, env, false));
            if (!isJudge(rel) && rel.status === "equal") {
              const ln_ = guard(() => limitOf(nm, v, p.pt, side0)), ld = guard(() => limitOf(dn, v, p.pt, side0));
              if (isJudge(ln_) || isJudge(ld)) { js.push(uns("could not establish whether the quotient is indeterminate")); continue; }
              const zero = (x: LimV) => x.kind === "finite" && qsign(x.value) === 0, infn = (x: LimV) => x.kind === "inf";
              if (!((zero(ln_) && zero(ld)) || (infn(ln_) && infn(ld)))) { js.push(bad("L'Hôpital's rule needs a 0/0 or ∞/∞ form, and this quotient is not indeterminate")); continue; }
              if (!limEq(lp, lq)) { js.push(bad("the limit after applying the rule does not equal the original")); continue; }
              js.push(ok("L'Hôpital's rule applied to a verified indeterminate form", "indeterminate form and derivative quotient verified exactly", digestOf([jsonOf(nm), jsonOf(dn)]))); continue;
            }
          }
        }
      }
      js.push(limEq(lp, lq) ? ok("both sides have the same limiting value", "Laurent-series limit evaluated exactly", digestOf([jsonOf(lp.kind === "finite" ? qtext(lp.value) : lp.kind)])) : bad("the two sides do not have the same limit"));
    }
    const j = js.length ? worst(js) : uns("nothing to compare");
    if (j.status === "valid") {
      const first = vals[0];
      if (first.kind === "lim" && !connectedToProblem) { const r0 = guard(() => relate(first.inner, f0, v, env, false)); if (!isJudge(r0) && r0.status === "equal") connectedToProblem = true; else { const eqLim = limEq(first.val, truth); if (!eqLim) { b.add(i, bad("this limit is not the posed limit")); return; } connectedToProblem = true; } }
      if (first.kind === "lim" && connectedToProblem === false) connectedToProblem = true;
      const last = vals[vals.length - 1]; const lastM = members[members.length - 1];
      const lv = last.kind === "lim" ? null : last.kind === "special" ? last.val : last.kind === "const" && last.q ? ({ kind: "finite", value: last.q } as LimV) : null;
      const closedForm = last.kind === "special" || (last.kind === "const" && finalForm(lastM));
      finalOk = !!lv && closedForm && limEq(lv, truth) && connectedToProblem; if (finalOk) { finalText = row.raw; finalRow = i; }
    }
    b.add(i, j);
  });
  fillRest(rows, b, "verification stopped before this line was checked");
  const allValid = b.records.every((r) => r?.judge.status === "valid");
  const complete = allValid && finalOk && connectedToProblem && finalRow === rows.length - 1;
  void dneSaid;
  const why = "state the value of the limit";
  if (allValid && !complete) markLast(rows, b, why);
  return finish(parsed, b, { domain: "calculus", family: "limit", nativeComplete: complete, obligations: complete ? [] : [why], notes, finalValue: complete ? { kind: "limit", text: finalText } : null });
}

// ---------------------------------------------------------------------------------------------- continuity / differentiability
function continuity(problem: Extract<CalculusProblem, { task: "continuity" | "differentiability" }>, rows: Row[], parsed: ReturnType<typeof syntheticParse>, b: Builder, notes: string[], v: string, fnNames: Set<string>, dom: TaskDom): E6Plan {
  const left = fromExpr(problem.left), right = fromExpr(problem.right); const p = qOf(problem.point);
  const pA: A = { t: "n", v: p };
  const diff = problem.task === "differentiability";
  const env = new Env(v, null, dom);
  const at = (f: A): Q | null | Judge => guard(() => { const r = limitOf(f, v, p, "both"); return r.kind === "finite" ? r.value : null; });
  const L = at(left), R = at(right);
  const dl = guard(() => d6(left, v)), dr = guard(() => d6(right, v));
  const Ld = isJudge(dl) ? dl : at(dl), Rd = isJudge(dr) ? dr : at(dr);
  if (isJudge(L) || isJudge(R) || L === null || R === null || isJudge(Ld) || isJudge(Rd)) { fillRest(rows, b, "the pieces cannot be evaluated exactly at the point"); return finish(parsed, b, { domain: "calculus", family: problem.task, nativeComplete: false, obligations: ["the pieces cannot be evaluated exactly"], notes }); }
  const continuous = qeq(L, R);
  const truthBool = diff ? continuous && Ld !== null && Rd !== null && qeq(Ld, Rd) : continuous;
  const required: Q[] = diff && continuous ? [L, R, Ld!, Rd!] : [L, R];
  const implied = new Set<string>();
  const c = { conclusions: [] as { i: number; s: ReturnType<typeof readStatement> }[] };
  const established: Q[] = [];
  rows.forEach((row, i) => {
    const item = readItem(row, env, fnNames, v);
    if (item.kind === "prose") {
      const s = readStatement(item.row.plain); c.conclusions.push({ i, s });
      if (s.conclusion && "subject" in s.conclusion) {
        const want = problem.task === "differentiability" ? "differentiable" : "continuous";
        if (s.conclusion.subject !== want) { b.add(i, uns(`this conclusion is about ${s.conclusion.subject}, not ${want}`)); return; }
        if (s.conclusion.positive !== truthBool) { b.add(i, bad(`the conclusion is wrong: the function ${truthBool ? "is" : "is not"} ${want} at ${problem.point}`)); return; }
        b.add(i, ok("conclusion agrees with the exactly computed one-sided values", "conclusion checked against exact one-sided values", digestOf([qtext(L), qtext(R)]))); return;
      }
      b.add(i, proseJudge(item.row)); return;
    }
    if (commonLine(item, i, b, env, c)) return;
    const members = (item as Extract<Item, { kind: "math" }>).members;
    if (members.length === 1) { b.add(i, uns("a line must state an equality")); return; }
    type V = { kind: "lim"; val: LimV } | { kind: "const"; a: A; q: Q | null } | { kind: "fn"; a: A };
    const vals: V[] = []; let labelProblem: Judge | null = null;
    for (const m of members) {
      if (m.t === "LIM") {
        if (m.v !== v) { b.add(i, uns("limits in a variable other than the problem variable are not supported")); return; }
        const k = m.at === "inf" || m.at === "-inf" ? null : constQ(m.at);
        if (!k || !qeq(k, p)) { b.add(i, bad("this limit is not taken at the point in question")); return; }
        if (m.side === "both") { b.add(i, uns("say from which side the limit is taken (x→a⁻ or x→a⁺)")); return; }
        const inner = guard(() => resolve(m.f, env)); if (isJudge(inner)) { b.add(i, inner); return; }
        const whichPiece = (() => { const a1 = compareExpr(inner, left, v), a2 = compareExpr(inner, right, v); return a1.status === "equal" ? "left" : a2.status === "equal" ? "right" : null; })();
        if (whichPiece && whichPiece !== m.side && !(qeq(L, R) && at(left) === at(right))) labelProblem = bad(`the ${m.side}-hand limit must use the piece that applies for ${v} ${m.side === "left" ? "<" : ">"} ${problem.point}`);
        if (whichPiece && whichPiece !== m.side) labelProblem = bad(`the ${m.side}-hand limit must use the piece that applies for ${v} ${m.side === "left" ? "<" : ">"} ${problem.point}`);
        const val = guard(() => limitOf(inner, v, p, m.side)); if (isJudge(val)) { b.add(i, val); return; }
        vals.push({ kind: "lim", val }); continue;
      }
      const r = guard(() => resolve(m, env)); if (isJudge(r)) { b.add(i, r); return; }
      if (constOnly(r)) { if (hasNode(r, (x) => x.t === "div" && constQ(x.b) !== null && qsign(constQ(x.b)!) === 0)) { b.add(i, uns("an expression with a zero denominator is not a number")); return; } vals.push({ kind: "const", a: r, q: constValue(r) }); }
      else vals.push({ kind: "fn", a: r });
    }
    if (labelProblem) { b.add(i, labelProblem); return; }
    const js: Judge[] = [];
    for (let k = 0; k + 1 < vals.length; k++) {
      const pv = vals[k], qv = vals[k + 1];
      const asQ = (x: V): Q | null => (x.kind === "lim" ? (x.val.kind === "finite" ? x.val.value : null) : x.kind === "const" ? x.q : null);
      if (pv.kind === "fn" || qv.kind === "fn") {
        const a = pv.kind === "lim" ? null : pv.a, b2 = qv.kind === "lim" ? null : qv.a;
        if (!a || !b2) { js.push(uns("a function cannot be set equal to a limit")); continue; }
        const rel = guard(() => relate(a, b2, v, env, false)); if (isJudge(rel)) { js.push(rel); continue; }
        js.push(rel.status === "equal" ? ok("equal as functions", "exact formal identity in the independent kernel") : rel.status === "different" ? bad("these two expressions are not equal") : uns(rel.note)); continue;
      }
      const x = asQ(pv), y = asQ(qv);
      if (x === null || y === null) { js.push(uns("the value is not a finite rational number")); continue; }
      js.push(qeq(x, y) ? ok("same value", "exact arithmetic") : bad("the two sides are not equal"));
    }
    // a derivative operator on one side gives a function; its value claims are covered by the function comparison above
    const j = js.length ? worst(js) : uns("nothing to compare");
    if (j.status === "valid") {
      const lastV = vals[vals.length - 1]; const qv = lastV.kind === "lim" ? (lastV.val.kind === "finite" ? lastV.val.value : null) : lastV.kind === "const" ? lastV.q : null;
      if (qv) established.push(qv);
    }
    b.add(i, j);
  });
  fillRest(rows, b, "verification stopped before this line was checked");
  const allValid = b.records.every((r) => r?.judge.status === "valid");
  // coverage: every required quantity is demonstrated by a distinct verified line
  const pool = [...established]; let covered = true;
  for (const need of required) { const k = pool.findIndex((x) => qeq(x, need)); if (k < 0) { covered = false; break; } pool.splice(k, 1); }
  const concluded = c.conclusions.some((x) => x.s.conclusion && "subject" in x.s.conclusion);
  const complete = allValid && covered && concluded;
  const why = !concluded ? "state a conclusion about the function at the point" : "show the work for both pieces at the point before concluding";
  if (allValid && !complete) markLast(rows, b, why);
  return finish(parsed, b, { domain: "calculus", family: problem.task, nativeComplete: complete, obligations: complete ? [] : [why], notes, finalValue: complete ? { kind: "boolean", text: String(truthBool) } : null });
}
