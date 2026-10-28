/**
 * E6 exact number-chain binder for probability / combinatorics / statistics and complex / polynomial working (and the mixed problems built from them).
 *
 * Values live in the Gaussian rationals Q[i] with exact arithmetic (no floats anywhere). A line is a chain `m0 = m1 = ... = mk`:
 *  - an optional leading LABEL (`P(A|B)`, `Var(X)`, `mu`, `sum of roots`) names a quantity; labels that are data symbols (`P(A)`, `n(B)`) must equal the datum,
 *    other labels become definitions, and labels that name the requested answer must equal the exactly computed answer;
 *  - every adjacent pair of members must be exactly equal (the first unequal pair is the first invalid step);
 *  - the working is complete only when the last line ends in a canonical numeral equal to the exact answer;
 *  - assumptions the method needs (independence, exclusivity, equiprobability, ordering, real coefficients) must be given by the problem or stated by the student.
 * Anything the evaluator cannot read or compute exactly (irrational surds, unknown symbols, unsupported tasks) is unsupported, never accepted.
 */
import { NotationError, normalize, splitEquals } from "./e6-parse.ts";
import { Budget, Unsupported } from "./e6-cas.ts";
import { Overflow, q, qadd, qcmp, qdiv, qeq, qiszero, qmul, qneg, qsign, qsub, qtext, ONE, Z, type Q } from "./exact-e5.ts";
import { assessRelevance, type GroundingSource } from "./claim-grounding.ts";
import { Builder, bad, finish, incomplete, isProse, proseJudge, missing, ok, readStatement, syntheticParse, uns, worst, type E6Plan, type Judge, type Row } from "./e6-common.ts";
import { digestOf } from "./geometry-binder-e5.ts";

// ================================================================================================ Gaussian rationals
export interface Cx { re: Q; im: Q }
const cx = (re: Q, im: Q = Z): Cx => ({ re, im });
const cadd = (a: Cx, b: Cx): Cx => cx(qadd(a.re, b.re), qadd(a.im, b.im));
const csub = (a: Cx, b: Cx): Cx => cx(qsub(a.re, b.re), qsub(a.im, b.im));
const cmul = (a: Cx, b: Cx): Cx => cx(qsub(qmul(a.re, b.re), qmul(a.im, b.im)), qadd(qmul(a.re, b.im), qmul(a.im, b.re)));
const cneg = (a: Cx): Cx => cx(qneg(a.re), qneg(a.im));
const cconj = (a: Cx): Cx => cx(a.re, qneg(a.im));
const cis0 = (a: Cx) => qiszero(a.re) && qiszero(a.im);
const ceq = (a: Cx, b: Cx) => qeq(a.re, b.re) && qeq(a.im, b.im);
class DivZero extends Error {}
function cdiv(a: Cx, b: Cx): Cx {
  if (cis0(b)) throw new DivZero("division by zero");
  const n = qadd(qmul(b.re, b.re), qmul(b.im, b.im)); const t = cmul(a, cconj(b));
  return cx(qdiv(t.re, n), qdiv(t.im, n));
}
function cpow(a: Cx, k: number): Cx {
  const isUnit = (qiszero(a.im) && (qeq(a.re, ONE) || qeq(a.re, qneg(ONE)))) || (qiszero(a.re) && (qeq(a.im, ONE) || qeq(a.im, qneg(ONE))));
  if (isUnit && Number.isSafeInteger(k)) { const m = ((k % 4) + 4) % 4; let r = cx(ONE); for (let i = 0; i < m; i++) r = cmul(r, a); return r; }
  if (Math.abs(k) > 400) throw new Budget("exponent exceeds the verifier's budget");
  if (k < 0) return cdiv(cx(ONE), cpow(a, -k));
  let r = cx(ONE), b = a, e = k;
  while (e) { if (e & 1) r = cmul(r, b); e >>= 1; if (e) b = cmul(b, b); }
  return r;
}
const isqrt = (n: bigint): bigint | null => { if (n < 0n) return null; if (n < 2n) return n; let x = BigInt(Math.floor(Math.sqrt(Number(n)))); while (x * x > n) x--; while ((x + 1n) * (x + 1n) <= n) x++; return x * x === n ? x : null; };
function qsqrt(v: Q): Q | null { if (qsign(v) < 0) return null; const a = isqrt(v.n), b = isqrt(v.d); return a !== null && b !== null ? q(a, b) : null; }
function csqrt(a: Cx): Cx {
  if (qiszero(a.im)) { const r = qsqrt(a.re); if (r) return cx(r); const m = qsqrt(qneg(a.re)); if (m) return cx(Z, m); throw new Unsupported("an irrational square root is outside the exact number-chain binder"); }
  throw new Unsupported("the square root of a non-real number is outside the exact number-chain binder");
}
const cabs = (a: Cx): Cx => { const n = qadd(qmul(a.re, a.re), qmul(a.im, a.im)); const r = qsqrt(n); if (!r) throw new Unsupported("an irrational modulus is outside the exact number-chain binder"); return cx(r); };
function fact(n: number): bigint { if (n > 400) throw new Budget("factorial exceeds the verifier's budget"); let r = 1n; for (let i = 2n; i <= BigInt(n); i++) r *= i; return r; }
const comb = (n: number, r: number): bigint => (r < 0 || r > n ? 0n : fact(n) / (fact(r) * fact(n - r)));
const perm = (n: number, r: number): bigint => (r < 0 || r > n ? 0n : fact(n) / fact(n - r));
const intOf = (a: Cx, what: string): number => { if (!qiszero(a.im) || a.re.d !== 1n) throw new Unsupported(`${what} needs a whole number`); const n = Number(a.re.n); if (!Number.isSafeInteger(n) || n < 0 || n > 400) throw new Budget(`${what} outside the verifier's budget`); return n; };
export const cxText = (a: Cx): string => (qiszero(a.im) ? qtext(a.re) : qiszero(a.re) ? `${qtext(a.im)}i` : `${qtext(a.re)}${qsign(a.im) < 0 ? "" : "+"}${qtext(a.im)}i`);

// ================================================================================================ expression reader
export type NAst =
  | { t: "num"; v: Q } | { t: "i" }
  | { t: "sym"; name: string }
  | { t: "neg"; a: NAst } | { t: "bin"; op: "+" | "-" | "*" | "/" | "^"; a: NAst; b: NAst }
  | { t: "call"; f: string; args: NAst[] } | { t: "fact"; a: NAst } | { t: "abs"; a: NAst };
type Tk = { k: "num" | "id" | "op" | "ev"; v: string };
function evSym(inner: string): string {
  let s = inner.replace(/\s+/g, " ").trim();
  s = s.replace(/\band\b|\bintersect(?:ion)?\b|,/gi, "∩").replace(/\bor\b|\bunion\b/gi, "∪").replace(/\s+/g, "");
  for (const op of ["∩", "∪"]) if (s.includes(op) && !s.includes("|")) s = s.split(op).sort().join(op);
  return s;
}
function lex(src: string): Tk[] {
  const out: Tk[] = []; let i = 0;
  if (/(?:^|[=\s(])\+-\s*\d/.test(src) || /±/.test(src)) throw new NotationError("the plus-or-minus sign could mean one root or both", "ambiguous");
  const s = src.replace(/(\d)\s*C\s*(\d)/g, "C($1,$2)").replace(/(\d)\s*P\s*(\d)/g, "P($1,$2)");
  while (i < s.length) {
    const c = s[i];
    if (/\s/.test(c)) { i++; continue; }
    if (/[0-9.]/.test(c)) { let j = i; while (j < s.length && /[0-9.]/.test(s[j])) j++; const t = s.slice(i, j); if ((t.match(/\./g) ?? []).length > 1) throw new NotationError("malformed number"); out.push({ k: "num", v: t }); i = j; continue; }
    if (/[A-Za-z_]/.test(c)) {
      let j = i; while (j < s.length && /[A-Za-z_0-9']/.test(s[j]) && !(j > i && /[0-9]/.test(s[j]) && /^[A-Za-z]$/.test(s.slice(i, j)) && false)) j++;
      const id = s.slice(i, j);
      // event / count / moment symbols with bracketed arguments are single tokens: P(A|B), n(A∩B), E[X], Var(X)
      if ((/^(?:P|Pr|p|n)$/.test(id) || /^(?:E|Var|SD|sd|Cov)$/.test(id)) && (s[j] === "(" || s[j] === "[")) {
        const close = s[j] === "(" ? ")" : "]"; let d = 0, k = j; for (; k < s.length; k++) { if (s[k] === s[j]) d++; else if (s[k] === close && !--d) break; }
        if (k >= s.length) throw new NotationError("unbalanced brackets");
        const inner = s.slice(j + 1, k);
        if (/^(?:P|Pr)$/.test(id) && /^\s*\d+\s*,\s*\d+\s*$/.test(inner)) { out.push({ k: "id", v: "P" }); i = j; continue; } // permutations P(n,r)
        if (id === "n" && /^\s*\d+\s*$/.test(inner)) { out.push({ k: "id", v: "n" }); i = j; continue; }
        out.push({ k: "ev", v: `${id === "Pr" || id === "p" ? "P" : id}(${evSym(inner)})` }); i = k + 1; continue;
      }
      out.push({ k: "id", v: id }); i = j; continue;
    }
    if (c === "±" || (c === "+" && s[i + 1] === "-" && !/[0-9A-Za-z(]/.test(s[i + 2] ?? "") === false && /\s|^/.test(s[i - 1] ?? " ") && false)) throw new NotationError("the plus-or-minus sign could mean one root or both", "ambiguous");
    if (c === "∩" || c === "∪") { out.push({ k: "op", v: c }); i++; continue; }
    if (c === "√") { out.push({ k: "id", v: "sqrt" }); i++; continue; }
    if ("+-*/^()!,|".includes(c)) { out.push({ k: "op", v: c }); i++; continue; }
    if (c === "×" || c === "·" || c === "⋅") { out.push({ k: "op", v: "*" }); i++; continue; }
    if (c === "÷") { out.push({ k: "op", v: "/" }); i++; continue; }
    if (c === "−") { out.push({ k: "op", v: "-" }); i++; continue; }
    throw new NotationError(`unsupported character '${c}'`, "unsupported");
  }
  return out;
}
class NParser {
  i = 0;
  constructor(readonly t: Tk[]) {}
  pk(o = 0) { return this.t[this.i + o]; }
  isOp(v: string, o = 0) { const x = this.pk(o); return !!x && x.k === "op" && x.v === v; }
  done() { return this.i >= this.t.length; }
  startsAtom(): boolean { const x = this.pk(); if (!x) return false; return x.k === "num" || x.k === "id" || x.k === "ev" || (x.k === "op" && (x.v === "(" || x.v === "|")); }
  expr(): NAst {
    let a = this.term();
    while (this.isOp("+") || this.isOp("-")) { const op = this.t[this.i++].v as "+" | "-"; a = { t: "bin", op, a, b: this.term() }; }
    return a;
  }
  term(): NAst {
    let a = this.unary();
    for (;;) {
      if (this.isOp("*") || this.isOp("/")) {
        const op = this.t[this.i++].v as "*" | "/"; const rhs = this.unary(); a = { t: "bin", op, a, b: rhs };
        if (op === "/" && this.startsAtom() && !this.isOp("(") === false) { /* handled below */ }
        if (op === "/" && this.startsAtom()) throw new NotationError("division followed by implicit multiplication has multiple conventional readings", "ambiguous");
        continue;
      }
      if (this.startsAtom() && !(this.isOp("|"))) { a = { t: "bin", op: "*", a, b: this.unary() }; continue; }
      break;
    }
    return a;
  }
  unary(): NAst {
    if (this.isOp("-")) { this.i++; return { t: "neg", a: this.unary() }; }
    if (this.isOp("+")) { this.i++; return this.unary(); }
    return this.power();
  }
  power(): NAst {
    const a = this.postfix();
    if (this.isOp("^")) { this.i++; const b = this.isOp("-") ? (this.i++, ({ t: "neg", a: this.power() } as NAst)) : this.power(); return { t: "bin", op: "^", a, b }; }
    return a;
  }
  postfix(): NAst {
    let a = this.atom();
    while (this.isOp("!")) { this.i++; a = { t: "fact", a }; }
    return a;
  }
  atom(): NAst {
    const x = this.t[this.i]; if (!x) throw new NotationError("unexpected end of expression");
    if (x.k === "num") { this.i++; return { t: "num", v: decimal(x.v) }; }
    if (x.k === "ev") { this.i++; return { t: "sym", name: x.v }; }
    if (x.k === "op" && x.v === "(") { this.i++; const e = this.expr(); if (!this.isOp(")")) throw new NotationError("unbalanced parentheses"); this.i++; return e; }
    if (x.k === "op" && x.v === "|") { this.i++; const e = this.expr(); if (!this.isOp("|")) throw new NotationError("unbalanced absolute value bars"); this.i++; return { t: "abs", a: e }; }
    if (x.k === "id") {
      this.i++;
      const f = x.v;
      if (["sqrt", "conj", "abs", "mod", "Re", "Im", "C", "binom", "P", "fact", "arg", "bar"].includes(f) && this.isOp("(")) {
        this.i++; const args: NAst[] = [this.expr()]; while (this.isOp(",")) { this.i++; args.push(this.expr()); }
        if (!this.isOp(")")) throw new NotationError("unbalanced parentheses"); this.i++;
        return { t: "call", f, args };
      }
      if (f === "sqrt" && this.startsAtom()) return { t: "call", f, args: [this.atom()] };
      if (f === "i") return { t: "i" };
      return { t: "sym", name: f };
    }
    throw new NotationError(`could not read '${x.v}'`);
  }
}
function decimal(txt: string): Q { const [i, f = ""] = txt.split("."); if (f.length > 12) throw new NotationError("too many decimals"); return q(BigInt(i || "0") * 10n ** BigInt(f.length) + BigInt(f || "0"), 10n ** BigInt(f.length)); }
export function readNumber(text: string): NAst {
  const toks = lex(normalize(text));
  const p = new NParser(toks); const e = p.expr();
  if (!p.done()) throw new NotationError(`could not read '${toks.slice(p.i).map((t) => t.v).join(" ")}'`);
  return e;
}
export class UnboundSym extends Error {}
export function evalN(a: NAst, env: Map<string, Cx>, depth = 0): Cx {
  if (depth > 80) throw new Budget("expression too deep");
  const r = (x: NAst) => evalN(x, env, depth + 1);
  switch (a.t) {
    case "num": return cx(a.v);
    case "i": return cx(Z, ONE);
    case "sym": { const v = env.get(a.name); if (!v) throw new UnboundSym(a.name); return v; }
    case "neg": return cneg(r(a.a));
    case "abs": return cabs(r(a.a));
    case "fact": return cx(q(fact(intOf(r(a.a), "factorial"))));
    case "bin": {
      const x = r(a.a), y = r(a.b);
      switch (a.op) {
        case "+": return cadd(x, y); case "-": return csub(x, y); case "*": return cmul(x, y);
        case "/": return cdiv(x, y);
        case "^": { if (!qiszero(y.im) || y.re.d !== 1n) throw new Unsupported("only integer exponents are supported"); return cpow(x, Number(y.re.n)); }
      }
      return x;
    }
    case "call": {
      const xs = a.args.map(r);
      switch (a.f) {
        case "sqrt": return csqrt(xs[0]);
        case "conj": case "bar": return cconj(xs[0]);
        case "abs": case "mod": return cabs(xs[0]);
        case "Re": return cx(xs[0].re); case "Im": return cx(xs[0].im);
        case "C": case "binom": if (xs.length !== 2) throw new NotationError("a binomial coefficient needs two arguments"); return cx(q(comb(intOf(xs[0], "n"), intOf(xs[1], "r"))));
        case "P": if (xs.length !== 2) throw new NotationError("a permutation count needs two arguments"); return cx(q(perm(intOf(xs[0], "n"), intOf(xs[1], "r"))));
        case "fact": return cx(q(fact(intOf(xs[0], "factorial"))));
        default: throw new Unsupported(`function ${a.f}`);
      }
    }
  }
}
const symsOf = (a: NAst, out = new Set<string>()): Set<string> => { switch (a.t) { case "sym": out.add(a.name); break; case "neg": case "fact": case "abs": symsOf(a.a, out); break; case "bin": symsOf(a.a, out); symsOf(a.b, out); break; case "call": a.args.forEach((x) => symsOf(x, out)); break; default: break; } return out; };
/** a product of two or more equal probability-sized factors (6/10 · 6/10): the same draw repeated, which is only a model of sampling with replacement / independent trials */
function repeatedFactors(a: NAst): boolean {
  // flatten the left-associated chain  a / b * c / d ...  into factors: a "*" starts a new factor, a "/" divides the current one
  const spine: { op: string; x: NAst }[] = []; let cur = a;
  while (cur.t === "bin" && (cur.op === "*" || cur.op === "/")) { spine.unshift({ op: cur.op, x: cur.b }); cur = cur.a; }
  const fs: (Q | null)[] = []; const val = (x: NAst): Q | null => { if (symsOf(x).size) return null; try { const v = evalN(x, new Map()); return qiszero(v.im) ? v.re : null; } catch { return null; } };
  fs.push(val(cur));
  for (const { op, x } of spine) { const v = val(x); if (op === "*") fs.push(v); else { const c = fs[fs.length - 1]; fs[fs.length - 1] = c && v && !qiszero(v) ? qdiv(c, v) : null; } }
  if (fs.length < 2) return false;
  const vals = fs.filter((v): v is Q => !!v && qsign(v) > 0 && qcmp(v, ONE) < 0);
  return vals.some((x, i) => vals.some((y, j) => i < j && qeq(x, y)));
}
const litsOf = (a: NAst, out: Q[] = []): Q[] => { if (a.t !== "num" && !symsOf(a).size) { try { const v = evalN(a, new Map()); if (qiszero(v.im)) out.push(v.re); } catch { /* not a closed numeral */ } } switch (a.t) { case "num": out.push(a.v); break; case "neg": case "fact": case "abs": litsOf(a.a, out); break; case "bin": litsOf(a.a, out); litsOf(a.b, out); break; case "call": a.args.forEach((x) => litsOf(x, out)); break; default: break; } return out; };

// canonical numeral: a single reduced real, or a reduced a + bi
function isReducedNumeral(a: NAst): Q | null {
  let neg = false, cur = a; while (cur.t === "neg") { neg = !neg; cur = cur.a; }
  if (cur.t === "num") { return neg ? qneg(cur.v) : cur.v; }
  if (cur.t === "bin" && cur.op === "/") {
    const n = isReducedNumeral(cur.a), d = isReducedNumeral(cur.b);
    if (!n || !d || n.d !== 1n || d.d !== 1n || d.n <= 1n) return null;
    let x = n.n < 0n ? -n.n : n.n, y = d.n; while (y) [x, y] = [y, x % y];
    const val0 = x; void val0; const val = q(n.n, d.n); return neg ? qneg(val) : val;
  }
  return null;
}
export function canonicalValue(a: NAst): Cx | null {
  // (a + bi)/c with whole a, b, c > 1 and no common factor: a single fraction over the whole complex number is a reduced form
  { let neg = false, cur = a; while (cur.t === "neg") { neg = !neg; cur = cur.a; }
    if (cur.t === "bin" && cur.op === "/") {
      const dn = isReducedNumeral(cur.b), num = cur.a.t === "bin" && (cur.a.op === "+" || cur.a.op === "-") ? canonicalValue(cur.a) : null;
      if (dn && dn.d === 1n && dn.n > 1n && num && num.re.d === 1n && num.im.d === 1n && !qiszero(num.im) && !qiszero(num.re)) {
        const gcd = (x: bigint, y: bigint): bigint => { x = x < 0n ? -x : x; y = y < 0n ? -y : y; while (y) [x, y] = [y, x % y]; return x; };
        if (gcd(gcd(num.re.n, num.im.n), dn.n) === 1n) { const s = neg ? -1n : 1n; return cx(q(s * num.re.n, dn.n), q(s * num.im.n, dn.n)); }
      }
    } }
  const terms: NAst[] = []; const flat = (x: NAst, sign: 1 | -1) => { if (x.t === "bin" && x.op === "+") { flat(x.a, sign); flat(x.b, sign); } else if (x.t === "bin" && x.op === "-") { flat(x.a, sign); flat(x.b, sign === 1 ? -1 : 1); } else terms.push(sign === 1 ? x : { t: "neg", a: x }); };
  flat(a, 1);
  if (terms.length > 2) return null;
  let re: Q | null = null, im: Q | null = null;
  for (const t of terms) {
    let neg = false, cur = t; while (cur.t === "neg") { neg = !neg; cur = cur.a; }
    const real = isReducedNumeral(neg ? { t: "neg", a: cur } : cur);
    if (real) { if (re) return null; re = real; continue; }
    // imaginary term: i, k*i, (k)i
    let coef: Q | null = null;
    if (cur.t === "i") coef = ONE;
    else if (cur.t === "bin" && cur.op === "*" && cur.b.t === "i") coef = isReducedNumeral(cur.a);
    if (!coef) return null;
    if (im) return null; im = neg ? qneg(coef) : coef;
  }
  if (!re && !im) return null;
  return cx(re ?? Z, im ?? Z);
}

// ================================================================================================ task specifications
export interface NumProblem { domain: "probability-statistics" | "complex-polynomial"; area?: string; task: string; data: Record<string, unknown>; assumptions?: string[]; coefficientDomain?: string }
interface Spec {
  truth: Cx[];
  labels: RegExp;
  env: Map<string, Cx>;
  needs: string[];          // assumptions the method needs
  setValued: boolean;
  aux: boolean;             // unlabelled chains may be auxiliary quantities
  mustMention?: Q[];        // data values the first formula must visibly use
  mustMentionAny?: boolean;
  unsupported?: string;
  datumResult?: Cx;          // E7: the quantity the task's own data states directly (a chain that ends by restating it is anchored to the data)
  facts?: Cx[];              // E7 Phase 5: task quantities the kernel computes from the premises BEFORE the answer (the discriminant): a calculation that reproduces one is about the task
  witness?: (v: Cx) => boolean; // E7: a value that provably satisfies the task's own condition (e.g. a root of the task polynomial)
  given: Cx[];             // the problem's own data values, so a restatement of a datum is not mistaken for an answer
  answerLike?: RegExp;
  noRealRoots?: boolean;   // the posed number domain is the reals and the quadratic has none
  realRootExists?: boolean;     // label names that are always answers even when the value equals a datum
  family: string;
}
const qv = (x: unknown): Q => { if (typeof x === "number") { if (!Number.isInteger(x)) throw new Unsupported("non-integer number datum"); return q(BigInt(x)); } const s = String(x).trim(); const m = /^([+-]?\d+)(?:\/(\d+))?$/.exec(s); if (m) return q(BigInt(m[1]), BigInt(m[2] ?? "1")); const d = /^([+-]?)(\d+)\.(\d+)$/.exec(s); if (d) return qdiv(q(BigInt(d[1] + d[2] + d[3])), q(10n ** BigInt(d[3].length))); throw new Unsupported(`datum ${s} is not an exact rational`); };
const cv = (x: unknown): Cx => { if (x && typeof x === "object" && "re" in (x as object)) { const o = x as { re: unknown; im: unknown }; return cx(qv(o.re), qv(o.im)); } return cx(qv(x)); };
const arr = (x: unknown): unknown[] => (Array.isArray(x) ? x : []);
const polyAt = (coef: Cx[], z: Cx): Cx => coef.reduce((acc, c) => cadd(cmul(acc, z), c), cx(Z));
const ident = (re: RegExp) => re;

function specOf(p: NumProblem): Spec {
  const d = p.data ?? {}; const t = p.task; const env = new Map<string, Cx>(); const R = (x: Q) => cx(x);
  const given: Cx[] = [];
  for (const v of Object.values(d)) { try { if (typeof v === "string" || typeof v === "number") given.push(R(qv(v))); else if (v && typeof v === "object" && "re" in (v as object)) given.push(cv(v)); } catch { /* not a numeric datum */ } }
  const base = (truth: Cx[], extra: Partial<Spec> = {}): Spec => ({ truth, labels: /^(?:answer|result|ans)$/i, env, needs: [], setValued: false, aux: false, family: t, given, ...extra });
  const evA = (name: string, v: Q) => { env.set(name, R(v)); };
  if (p.domain === "probability-statistics") {
    const assumed = new Set(p.assumptions ?? []);
    if (d.pa !== undefined) { const v = qv(d.pa); for (const n of ["P(A)", "PA", "pA", "P_A", "p_A"]) evA(n, v); }
    if (d.pb !== undefined) { const v = qv(d.pb); for (const n of ["P(B)", "PB", "pB", "P_B"]) evA(n, v); }
    if (d.pab !== undefined) { const v = qv(d.pab); for (const n of ["P(A∩B)", "PAB", "pAB"]) evA(n, v); }
    switch (t) {
      case "factorial": { const n = Number(d.n); return base([R(q(fact(n)))], { labels: /^(?:answer|result)$/i, aux: false }); }
      case "permutation": return base([R(q(perm(Number(d.n), Number(d.r))))], { needs: ["ordered"] });
      case "combination": case "binomial-coefficient": return base([R(q(comb(Number(d.n), Number(d.r))))], { needs: t === "combination" ? ["unordered"] : [] });
      case "circular": return base([R(q(Number(d.n) ? fact(Number(d.n) - 1) : 0n))], { needs: ["ordered"] });
      case "arrangement-repetition": return base([R(q(BigInt(Number(d.n)) ** BigInt(Number(d.r))))], { needs: ["ordered"] });
      case "addition-principle": return base([R(q(BigInt(Number(d.a)) + BigInt(Number(d.b))))]);
      case "multiplication-principle": return base([R(q(BigInt(Number(d.a)) * BigInt(Number(d.b))))]);
      case "inclusion-exclusion": return base([R(q(BigInt(Number(d.a)) + BigInt(Number(d.b)) - BigInt(Number(d.intersection))))], { labels: /^n\(A∪B\)$|^\|A∪B\|$|^answer$/i });
      case "finite": return base([R(qdiv(qv(d.favourable), qv(d.total)))], { datumResult: R(qdiv(qv(d.favourable), qv(d.total))), needs: ["equiprobable"], labels: /^P\((?!.*\|).+\)$|^answer$/ });
      case "complement": {
        if (d.pa !== undefined) return base([R(qsub(ONE, qv(d.pa)))], { labels: /^P\(.+\)$/, answerLike: /^P\((?:no|not|none|neither|non)|'\)$|\^c\)$|complement/i });
        const n = Number(d.n); const pr = qv(d.p); let pow = ONE; for (let i = 0; i < n; i++) pow = qmul(pow, qsub(ONE, pr));
        return base([R(qsub(ONE, pow))], { needs: ["independent"], labels: /^P\(.+\)$/ });
      }
      case "union": return base([R(qsub(qadd(qv(d.pa), qv(d.pb)), qv(d.pab)))], { labels: /^P\(A∪B\)$|^P\(AorB\)$/ });
      case "exclusive-union": return base([R(qadd(qv(d.pa), qv(d.pb)))], { needs: ["mutually-exclusive"], labels: /^P\(A∪B\)$|^P\(AorB\)$/ });
      case "independent-intersection": return base([R(qmul(qv(d.pa), qv(d.pb)))], { needs: ["independent"], labels: /^P\(A∩B\)$|^P\(AandB\)$/ });
      case "conditional": {
        if (d.pab !== undefined) return base([R(qdiv(qv(d.pab), qv(d.pb)))], { labels: /^P\(A\|B\)$/ });
        evA("n(A∩B)", qv(d.nab)); evA("n(B)", qv(d.nb)); if (d.n !== undefined) evA("n(S)", qv(d.n));
        return base([R(qdiv(qv(d.nab), qv(d.nb)))], { labels: /^P\(A\|B\)$/ });
      }
      case "total": { let s = Z; for (const tm of arr(d.terms) as { prior: unknown; conditional: unknown }[]) s = qadd(s, qmul(qv(tm.prior), qv(tm.conditional))); return base([R(s)], { labels: /^P\(.+\)$/ }); }
      case "bayes": return base([R(qdiv(qmul(qv(d.prior), qv(d.likelihood)), qv(d.evidence)))], { labels: /^P\(.+\|.+\)$/ });
      case "binomial-pmf": { const n = Number(d.n), k = Number(d.k), pr = qv(d.p); let a = ONE; for (let i = 0; i < k; i++) a = qmul(a, pr); for (let i = 0; i < n - k; i++) a = qmul(a, qsub(ONE, pr)); return base([R(qmul(q(comb(n, k)), a))], { needs: ["independent"], labels: /^P\(X=\d+\)$/ }); }
      case "binomial-mean": return base([R(qmul(qv(d.n), qv(d.p)))], { labels: /^(?:E\[X\]|E\(X\)|mean|μ|mu)$/i });
      case "binomial-variance": return base([R(qmul(qmul(qv(d.n), qv(d.p)), qsub(ONE, qv(d.p))))], { labels: /^(?:Var\(X\)|variance|σ²|sigma\^2)$/i });
      case "bernoulli-mean": return base([R(qv(d.p))], { labels: /^(?:E\[X\]|mean)$/i });
      case "bernoulli-variance": return base([R(qmul(qv(d.p), qsub(ONE, qv(d.p))))], { labels: /^(?:Var\(X\)|variance)$/i });
      case "uniform-mean": return base([R(qdiv(qadd(qv(d.low), qv(d.high)), q(2)))], { labels: /^(?:E\[X\]|mean)$/i });
      case "pmf-mean": case "pmf-variance": {
        const xs = arr(d.values).map(qv), ps = arr(d.probabilities).map(qv);
        if (!xs.length || xs.length !== ps.length) throw new Unsupported("malformed probability mass function");
        const mean = xs.reduce((s, x, i) => qadd(s, qmul(x, ps[i])), Z);
        const val = t === "pmf-mean" ? mean : xs.reduce((s, x, i) => qadd(s, qmul(qmul(qsub(x, mean), qsub(x, mean)), ps[i])), Z);
        return base([R(val)], { labels: t === "pmf-mean" ? /^(?:E\[X\]|E\(X\)|mean|μ|mu)$/i : /^(?:Var\(X\)|variance)$/i, aux: t === "pmf-variance", mustMention: t === "pmf-mean" ? ps.filter((x) => !qiszero(x)) : undefined });
      }
      case "mean": case "weighted-mean": case "grouped-mean": case "median": case "range": case "mode": case "population-variance": case "sample-variance": {
        const xs = arr(d.values).map(qv); if (!xs.length) throw new Unsupported("no data values");
        const sorted = [...xs].sort((a, b) => Number(a.n * b.d - b.n * a.d));
        const mean = qdiv(xs.reduce((s, x) => qadd(s, x), Z), q(xs.length));
        const ss = xs.reduce((s, x) => qadd(s, qmul(qsub(x, mean), qsub(x, mean))), Z);
        let v: Q;
        if (t === "mean") v = mean;
        else if (t === "weighted-mean" || t === "grouped-mean") { const fs = arr(d.frequencies).map(qv); if (fs.length !== xs.length) throw new Unsupported("frequencies do not match the values"); v = qdiv(xs.reduce((s, x, i) => qadd(s, qmul(x, fs[i])), Z), fs.reduce((s, x) => qadd(s, x), Z)); }
        else if (t === "median") v = xs.length % 2 ? sorted[(xs.length - 1) / 2] : qdiv(qadd(sorted[xs.length / 2 - 1], sorted[xs.length / 2]), q(2));
        else if (t === "range") v = qsub(sorted[sorted.length - 1], sorted[0]);
        else if (t === "mode") { const counts = new Map<string, number>(); for (const x of xs) counts.set(qtext(x), (counts.get(qtext(x)) ?? 0) + 1); const mx = Math.max(...counts.values()); const m = [...counts].filter(([, c]) => c === mx); if (m.length !== 1) throw new Unsupported("no unique mode"); v = decimalOfText(m[0][0]); }
        else if (t === "population-variance") v = qdiv(ss, q(xs.length)); else { if (xs.length < 2) throw new Unsupported("sample variance needs two observations"); v = qdiv(ss, q(xs.length - 1)); }
        const lab = t === "population-variance" || t === "sample-variance" ? /^(?:variance|σ²|s²|sigma\^2|s\^2|Var\(X\)|answer)$/i : /^(?:mean|median|range|mode|x̄|answer)$/i;
        return base([R(v)], { labels: lab, aux: t === "population-variance" || t === "sample-variance", needs: t === "population-variance" ? ["population"] : t === "sample-variance" ? ["sample"] : [] });
      }
      case "normal-probability": return base([], { unsupported: "normal-distribution probabilities are not exact rationals, so no exact verdict is possible" });
      case "markov-steady-state": return base([], { unsupported: "Markov-chain steady states are outside the exact number-chain binder" });
      default: return base([], { unsupported: `the task ${t} is outside the exact number-chain binder` });
    }
    void assumed;
  }
  // ------------------------------------------------------------- complex / polynomial
  const coefs = arr(d.coefficients).map(cv);
  const root = d.root !== undefined ? cv(d.root) : null;
  const A = d.a !== undefined ? cv(d.a) : null, B = d.b !== undefined ? cv(d.b) : null, Z1 = d.z !== undefined ? cv(d.z) : null;
  const tr = (c: Cx) => base([c], { labels: /^(?:answer|result|ans|z|w)$/i });
  switch (t) {
    case "add": return tr(cadd(A!, B!)); case "subtract": return tr(csub(A!, B!));
    case "multiply": return tr(cmul(A!, B!));
    case "divide": return tr(cdiv(A!, B!));
    case "reciprocal": return tr(cdiv(cx(ONE), Z1!));
    case "conjugate": return tr(d.w !== undefined ? cconj(cadd(Z1!, cv(d.w))) : cconj(Z1 ?? A!));
    case "modulus-square": return tr(cx(qadd(qmul(Z1!.re, Z1!.re), qmul(Z1!.im, Z1!.im))));
    case "modulus": return tr(cabs(Z1!));
    case "distance": return tr(cabs(csub(A!, B!)));
    case "power-i": { const n = Number(d.exponent ?? d.n); const m = ((n % 4) + 4) % 4; return tr([cx(ONE), cx(Z, ONE), cx(qneg(ONE)), cx(Z, qneg(ONE))][m]); }
    case "translate": return tr(cadd(Z1!, cv(d.shift)));
    case "reflect": { const axis = String(d.axis ?? "real"); return tr(/imag/i.test(axis) ? cneg(cconj(Z1!)) : cconj(Z1!)); }
    case "rotate-quarter": return tr(cmul(Z1!, cx(Z, ONE)));
    case "de-moivre": return tr(cpow(Z1!, Number(d.n)));
    case "roots-of-unity": return base([cx(ONE)], { labels: /^(?:answer|result)$/i });
    case "verify-root": return base([polyAt(coefs, root!)], { labels: /^(?:p\(.+\)|answer|result)$/i, needs: [] });
    case "factor-theorem": return base([polyAt(coefs, root!)], { labels: /^(?:p\(.+\)|f\(.+\)|answer|result)$/i });
    case "remainder": return base([polyAt(coefs, cv(d.divisor_root))], { labels: /^(?:remainder|p\(.+\)|f\(.+\)|r|answer|result)$/i });
    case "conjugate-root": return base([cconj(root!)], { needs: ["real-coefficients"], labels: /^(?:other root|conjugate|answer|result|z|w)$/i });
    case "vieta-sum": { if (coefs.length < 2) throw new Unsupported("malformed polynomial"); return base([cneg(cdiv(coefs[1], coefs[0]))], { witness: (w) => { const r = polyAt(coefs, w); return qiszero(r.re) && qiszero(r.im); }, labels: /^(?:sum of roots|sum|answer|result)$/i }); }
    case "vieta-product": { if (coefs.length < 2) throw new Unsupported("malformed polynomial"); const n = coefs.length - 1; const v = cdiv(coefs[n], coefs[0]); return base([n % 2 ? cneg(v) : v], { witness: (w) => { const r = polyAt(coefs, w); return qiszero(r.re) && qiszero(r.im); }, labels: /^(?:product of roots|product|answer|result)$/i }); }
    case "quadratic-roots": {
      if (coefs.length !== 3) throw new Unsupported("not a quadratic");
      const [a, b, c] = coefs; const disc = csub(cmul(b, b), cmul(cx(q(4)), cmul(a, c))); const s = csqrt(disc);
      const r1 = cdiv(cadd(cneg(b), s), cmul(cx(q(2)), a)), r2 = cdiv(csub(cneg(b), s), cmul(cx(q(2)), a));
      const nonReal = !qiszero(r1.im) || !qiszero(r2.im);
      if (nonReal && d.numberDomain !== "complex" && p.coefficientDomain === "real" && !(p.assumptions ?? []).includes("complex-roots")) return base([], { facts: [disc], setValued: true, aux: true, noRealRoots: true, labels: /^(?:x|z|roots?|solutions?|x_?[12]|z_?[12]|answer)$/i });
      return base(ceq(r1, r2) ? [r1] : [r1, r2], { facts: [disc], witness: (w) => { const r = polyAt(coefs, w); return qiszero(r.re) && qiszero(r.im); }, setValued: true, aux: true, realRootExists: !nonReal, labels: /^(?:x|z|roots?|solutions?|x_?[12]|z_?[12]|answer)$/i });
    }
    case "principal-argument": return base([], { unsupported: "principal arguments are irrational multiples of pi, outside the exact number-chain binder" });
    case "complex-log": return base([], { unsupported: "complex logarithms are multi-valued and outside the exact number-chain binder" });
    case "solve": return base([], { unsupported: "roots of this polynomial are not exact in radicals within the binder" });
    default: return base([], { unsupported: `the task ${t} is outside the exact number-chain binder` });
  }
}
function decimalOfText(s: string): Q { return qv(s); }

// ================================================================================================ planner
const ANSWER_WORD = /^(?:ans(?:wer)?|result|final(?:\s+answer)?|solution|value|the\s+answer|therefore|thus|hence|so)$/i;
const COMPLEMENT_NAME = /^P\((?:no|not|none|neither|non)|'\)$|\^c\)$|complement/i;
const NAMES_PRIME = new Set(["x", "y", "z", "w"]);
function aliasData(spec: Spec, p: NumProblem): Map<string, Cx> {
  const env = new Map(spec.env);
  const d = p.data ?? {};
  if (p.domain === "complex-polynomial") {
    for (const [k, v] of Object.entries(d)) if (k === "z" || k === "w" || k === "a" || k === "b") { try { env.set(k, cv(v)); } catch { /* not numeric */ } }
    // E7 premise naming: the coefficients of a quadratic are named a, b, c in the order given (highest power first), so `c/a` is a statement about THIS polynomial
    const cs = (d as { coefficients?: unknown }).coefficients;
    if (Array.isArray(cs) && cs.length === 3 && !("a" in d) && !("b" in d)) ["a", "b", "c"].forEach((nm, i) => { try { env.set(nm, cv(cs[i])); } catch { /* not numeric */ } });
  } else {
    for (const k of ["p", "n", "k", "r"]) if (d[k] !== undefined) { try { env.set(k, cv(d[k])); } catch { /* ignore */ } }
  }
  return env;
}
const wordsLabel = (t: string) => /^[A-Za-z][A-Za-z\s_]*$/.test(t.trim()) && !/^[Ii]$/.test(t.trim());
const normLabel = (t: string) => normalize(t).replace(/\s+/g, " ").trim();
const labelKey = (t: string) => normLabel(t).replace(/\s+/g, "");
interface Parsed { label: string | null; members: NAst[]; texts: string[] }

// ------------------------------------------------------------------------------------------------ E7 grounding (provenance of a calculation)
function flattenPremises(d: unknown, key = "data", out: { key: string; value: Cx }[] = []): { key: string; value: Cx }[] {
  if (Array.isArray(d)) d.forEach((x, i) => flattenPremises(x, `${key}[${i}]`, out));
  else if (d && typeof d === "object" && !("re" in (d as object))) for (const [k, v] of Object.entries(d)) flattenPremises(v, `${key}.${k}`, out);
  else { try { const v = cv(d); out.push({ key, value: v }); if (!qiszero(v.im)) { out.push({ key: `${key}.re`, value: cx(v.re) }); out.push({ key: `${key}.im`, value: cx(v.im) }); } } catch { /* not a numeric premise */ } }
  return out;
}
const trivialValue = (v: Cx) => qiszero(v.im) && v.re.d === 1n && (v.re.n >= -2n && v.re.n <= 2n);
const cconjV = (v: Cx): Cx => cx(v.re, qsub(Z, v.im));
const cnegV = (v: Cx): Cx => cx(qsub(Z, v.re), qsub(Z, v.im));
/** where the numbers and symbols of a derivation's starting expression come from: task premises, earlier relevant lines, or nowhere */
/** a number that is one arithmetic step (+ − × ÷) away from two task premises is explained by them (e.g. 8 − 3 = 5 from 8 and 3) */
function oneStep(v: Cx, premises: { key: string; value: Cx }[], established: { ref: string; value: Cx }[] = []): string | null {
  // an offset of a datum by a unit step (n-1, n-2, n+1: descending factors, complements, off-by-one counts) and an exact square root of a datum or earlier result
  const base = [...premises.map((p) => ({ key: p.key, value: p.value })), ...established.map((e) => ({ key: e.ref, value: e.value }))];
  for (const a of base) {
    for (const d of [1, 2]) for (const sg of [1, -1]) { const t = cadd(a.value, cx(q(sg * d))); if (ceq(t, v)) return `${a.key} ${sg > 0 ? "+" : "-"} ${d}`; }
    for (const sv of [a.value, cneg(a.value)]) { let r: Cx | null = null; try { r = csqrt(sv); } catch { r = null; } if (r && (ceq(r, v) || ceq(cneg(r), v))) return `square root of ${a.key}`; }
  }
  return oneStepPair(v, premises);
}
function oneStepPair(v: Cx, premises: { key: string; value: Cx }[]): string | null {
  const real = premises.filter((p) => qiszero(p.value.im));
  // a monomial of degree <= 3 in the data times a small constant (b^2, 4ac, 2a): it is how data enter a formula, so such a number is EXPLAINED by the data (it never relates the calculation to the task by itself)
  const factors = [{ key: "1", value: cx(q(1)) }, ...real];
  for (const k of [1, 2, 4]) for (const a of factors) for (const b of factors) for (const c of factors) {
    const m = cmul(cmul(cmul(cx(q(k)), a.value), b.value), c.value);
    if (ceq(m, v) || ceq(m, cneg(v))) return `${k === 1 ? "" : k + "*"}${[a, b, c].filter((x) => x.key !== "1").map((x) => x.key).join("*") || "1"}`;
  }
  for (const a of real) for (const b of real) {
    if (a.key === b.key) continue; // two DIFFERENT premises
    const hit = (r: Cx | null, op: string) => (r && ceq(r, v) ? `${a.key} ${op} ${b.key}` : null);
    const r = hit(cadd(a.value, b.value), "+") ?? hit(csub(a.value, b.value), "-") ?? (b.value.re.n !== 0n ? hit(cdiv(a.value, b.value), "/") : null);
    if (r) return r;
  }
  return null;
}
function sourcesOf(first: NAst, env: Map<string, Cx>, dataSyms: Set<string>, relevantDefs: Set<string>, premises: { key: string; value: Cx }[], established: { ref: string; value: Cx }[], witness?: (v: Cx) => boolean, stated: { ref: string; value: Cx }[] = [], facts: Cx[] = []): GroundingSource[] {
  const out: GroundingSource[] = [];
  const walk = (a: NAst): void => {
    if (a.t === "i") return;
    if (a.t === "sym") { if (dataSyms.has(a.name)) out.push({ kind: "task-premise", ref: a.name, by: "symbol", trivial: false }); else if (env.has(a.name) && relevantDefs.has(a.name)) out.push({ kind: "derived-fact", ref: a.name, by: "symbol", trivial: false }); return; }
    if (symsOf(a).size === 0) {
      let v: Cx | null = null; try { v = evalN(a, new Map()); } catch { v = null; }
      if (v) {
        if (!trivialValue(v) && facts.some((f) => ceq(f, v))) { out.push({ kind: "derived-fact", ref: "a quantity the kernel computes from the task premises", by: "value", trivial: false }); return; }
        if (witness && !trivialValue(v) && witness(v)) { out.push({ kind: "derived-fact", ref: "satisfies the task's own polynomial", by: "value", trivial: false }); return; }
        const est = established.find((e) => ceq(e.value, v!)); // any closed sub-expression may restate an earlier derived fact
        if (est) { out.push({ kind: "derived-fact", ref: est.ref, by: "value", trivial: trivialValue(v) }); return; }
        const whole = !qiszero(v.im) ? premises.find((x) => ceq(x.value, v!) || ceq(x.value, cconjV(v!))) : undefined; // a complex closed form equal to a complex datum is a restatement of it
        if (whole) { out.push({ kind: "task-premise", ref: whole.key, by: "value", trivial: false }); return; }
        // a closed form that evaluates to a task datum which is a non-integer rational, or an integer of size >= 10, reproduces that datum (10^4, C(8,2), 1/4): a coincidence is unlikely at that size.
        // 1 - p for a rational probability p is the complement of a datum (derived).
        const big = (x: Cx) => qiszero(x.im) && (x.re.d !== 1n || (x.re.n >= 10n || x.re.n <= -10n));
        const cm = a.t !== "num" ? premises.find((x) => big(x.value) && ceq(x.value, v!)) : undefined;
        if (cm) { out.push({ kind: "task-premise", ref: cm.key, by: "value", trivial: false }); return; }
        const comp = a.t !== "num" && qiszero(v.im) && v.re.d !== 1n ? premises.find((x) => qiszero(x.value.im) && x.value.re.d !== 1n && ceq(csub(cx(q(1)), x.value), v!)) : undefined;
        if (comp) { out.push({ kind: "derived-fact", ref: `1 - ${comp.key}`, by: "value", trivial: false, derived: true }); return; }
        if (a.t === "num") { // only a plain numeral is matched against the premises: a compound sub-expression that happens to equal a datum proves nothing
          const pr = premises.find((x) => ceq(x.value, v!) || ceq(x.value, cnegV(v!)));
          const st = !pr ? stated.find((x) => ceq(x.value, v!)) : undefined;
          if (st) { out.push({ kind: "student-assumption", ref: `${cxText(v!)} ${st.ref}`, by: "value", trivial: trivialValue(v!) }); return; }
          const one = !pr && !trivialValue(v!) ? oneStep(v!, premises, established) : null;
          if (one) { out.push({ kind: "derived-fact", ref: one, by: "value", trivial: false, derived: true }); return; }
          out.push(pr ? { kind: "task-premise", ref: pr.key, by: "value", trivial: trivialValue(v) } : { kind: "free-literal", ref: cxText(v), by: "value", trivial: trivialValue(v) });
          return;
        }
      }
    }
    switch (a.t) { case "neg": case "fact": case "abs": walk(a.a); break; case "bin": walk(a.a); walk(a.b); break; case "call": a.args.forEach(walk); break; default: break; }
  };
  walk(first);
  // the real and imaginary parts of a witnessed value (a root written as 3+4i) are explained by it
  if (witness) {
    const parts: Cx[] = [];
    const collect = (a: NAst): void => { if (symsOf(a).size === 0) { try { const v = evalN(a, new Map()); if (!trivialValue(v) && witness(v)) { parts.push(cx(v.re), cx(v.im)); return; } } catch { /* not evaluable */ } } switch (a.t) { case "neg": case "fact": case "abs": collect(a.a); break; case "bin": collect(a.a); collect(a.b); break; case "call": a.args.forEach(collect); break; default: break; } };
    collect(first);
    if (parts.length) return out.map((x) => (x.kind === "free-literal" && parts.some((q) => cxText(q) === x.ref || cxText(cneg(q)) === x.ref) ? { kind: "derived-fact" as const, ref: "component of a value that satisfies the task's polynomial", by: "value" as const, trivial: x.trivial, derived: true } : x));
  }
  return out;
}

export function planNumbersE6(problem: NumProblem, rows: Row[]): E6Plan {
  const parsed = syntheticParse(rows, problem.domain);
  const b = new Builder(parsed, "e6 exact Gaussian-rational chain evaluation");
  let spec: Spec;
  try { spec = specOf(problem); } catch (e) {
    const why = e instanceof Unsupported ? e.message : "the problem data could not be read exactly";
    rows.forEach((_, i) => b.add(i, uns(why)));
    return finish(parsed, b, { domain: problem.domain, family: problem.task, nativeComplete: false, obligations: [why], notes: [why] });
  }
  if (spec.unsupported) { rows.forEach((row, i) => { let j: Judge = uns(spec.unsupported!); for (const m of splitEquals(normalize(row.plain))) { try { readNumber(m); } catch (e) { if (e instanceof NotationError && e.kind === "ambiguous") j = { status: "ambiguous", reason: e.message }; } } b.add(i, j); }); return finish(parsed, b, { domain: problem.domain, family: problem.task, nativeComplete: false, obligations: [spec.unsupported], notes: [spec.unsupported] }); }
  const env = aliasData(spec, problem);
  const premises = flattenPremises(problem.data), dataSyms = new Set(env.keys()), established: { ref: string; value: Cx }[] = [], relevantDefs = new Set<string>();
  const stated = new Set<string>(), negated = new Set<string>();
  const provided = new Set<string>(problem.assumptions ?? []);
  if (problem.coefficientDomain === "real") provided.add("real-coefficients");
  const found: Cx[] = []; let finalRow = -1; let sawAnswerClaim = false; let sawNoReal = false; let needReplacement = false;
  rows.forEach((row, i) => {
    const st = readStatement(row.plain);
    st.assumptions.forEach((x) => stated.add(x)); st.negated.forEach((x) => negated.add(x));
    // counting notation carries its own convention: C(n,r) / binom / nCr count unordered selections, P(n,r) with numeric arguments / nPr ordered arrangements
    if (/(?:^|[^A-Za-z])C\s*\(\s*\d+\s*,\s*\d+\s*\)|\\binom|\b\d+\s*C\s*\d+\b|\bn?Cr\b/.test(row.plain)) stated.add("unordered");
    if (/(?:^|[^A-Za-z])P\s*\(\s*\d+\s*,\s*\d+\s*\)|\b\d+\s*P\s*\d+\b|\bn?Pr\b/.test(row.plain)) stated.add("ordered");
    // E7: the discriminant check credits ONLY a sentence that says nothing else (a compound sentence carries further claims that this check does not examine)
    const NO_REAL_ONLY = (t: string) => (t.toLowerCase().match(/[a-z]{2,}/g) ?? []).every((w) => ["discriminant", "negative", "so", "there", "are", "is", "the", "this", "that", "polynomial", "quadratic", "equation", "has", "have", "had", "no", "real", "roots", "root", "solutions", "solution", "zeros", "zero", "hence", "thus", "therefore", "because", "since", "which", "means", "any", "not", "note", "it", "its", "so", "as", "d", "disc", "delta", "over", "numbers", "number", "x", "p", "f", "of", "a", "an", "to", "in", "we", "get", "gives", "i"].includes(w));
    if (/\bno\s+real\s+(?:roots?|solutions?|zeros?)\b|\b(?:has|have)\s+no\s+real\b|\bnot\s+have\s+any\s+real\b/i.test(row.plain) && NO_REAL_ONLY(row.plain)) {
      if (spec.noRealRoots) { b.add(i, ok("the discriminant is negative, so there are no real roots", "exact discriminant sign")); sawNoReal = true; finalRow = i; return; }
      if (spec.realRootExists) { b.add(i, bad("the quadratic has real roots")); return; }
    }
    if (isProse(row.plain)) { b.add(i, proseJudge(row)); return; }
    // `P(A, B)`: a comma list inside a probability bracket is read as the joint event only when the typed task is itself a joint/intersection task
    // and the bracket is a plain list of events; anywhere else the reading (joint, ordered outcome, conditional shorthand) is not licensed.
    let plainRow = normalize(row.plain);
    { const re = /\b(?:P|Pr)\s*\(([^()]*,[^()]*)\)/g; let m: RegExpExecArray | null;
      while ((m = re.exec(plainRow))) {
        if (m[1].split(",").every((e2) => /^\s*\d+\s*$/.test(e2))) continue; // P(n, r) with numeric arguments is the permutation count, not an event list
        const authorised = problem.task === "independent-intersection" && !/[|<>=]/.test(m[1]) && m[1].split(",").every((e2) => /^\s*[A-Za-z]\w*\s*$/.test(e2));
        if (!authorised) { b.add(i, { status: "ambiguous", reason: `the comma list in ${m[0]} could mean a joint event, an ordered outcome or a conditional; this task does not license one reading` }); return; }
      }
      plainRow = plainRow.replace(re, (_s, inner: string) => `P(${inner.split(",").map((e2) => e2.trim()).join("∩")})`); }
    const texts = splitEquals(plainRow);
    if (texts.length === 1) { b.add(i, uns("a line must state an equality; a bare expression is not a derivation step")); return; }
    // label: a bare symbol (bound or not), or words / a bracketed moment such as Var(X)
    let label: string | null = null; let from = 0;
    {
      const m0 = texts[0];
      let first: NAst | null = null; try { first = readNumber(m0); } catch { first = null; }
      if (first && first.t === "sym") { label = first.name; from = 1; }
      else if (!first || (symsOf(first).size && [...symsOf(first)].some((s) => !env.has(s)))) {
        if (wordsLabel(m0)) { label = labelKey(m0); from = 1; }
        else if (!first) { try { readNumber(m0); } catch (e) { if (e instanceof NotationError) { b.add(i, { status: e.kind === "ambiguous" ? "ambiguous" : e.kind === "unsupported" ? "unsupported" : "malformed", reason: e.message }); return; } throw e; } }
      }
    }
    const members: NAst[] = [];
    // a closing sign statement (`… = -36 < 0`) is checked against the exact value of the member before it
    let signRel: { op: string; rhs: NAst } | null = null;
    try {
      for (let k = from; k < texts.length; k++) {
        const sm = k === texts.length - 1 && texts.length - from >= 2 ? /^(.*?)\s*(<=|>=|<|>)\s*(-?[\d\/. ]+)$/.exec(texts[k]) : null;
        if (sm) { members.push(readNumber(sm[1])); signRel = { op: sm[2], rhs: readNumber(sm[3]) }; } else members.push(readNumber(texts[k]));
      }
    } catch (e) {
      if (e instanceof NotationError) { b.add(i, { status: e.kind === "ambiguous" ? "ambiguous" : e.kind === "unsupported" ? "unsupported" : "malformed", reason: e.message }); return; }
      throw e;
    }
    if (!members.length) { b.add(i, uns("nothing to evaluate after the label")); return; }
    // E7: a complement event is bound ONLY by structural substitution inside the chain (`1 - P(no head)` followed by `1 - (1/2)^3` replaces the event by the power) and
    // only when the premises license that form (independence / replacement). It is never back-solved from the claimed result, which would assume the conclusion.
    for (let k = 0; k + 1 < members.length; k++) {
      const m = members[k], nx = members[k + 1];
      if (m.t === "bin" && m.op === "-" && m.a.t === "num" && qeq(m.a.v, ONE) && m.b.t === "sym" && !env.has(m.b.name) && COMPLEMENT_NAME.test(m.b.name)
        && nx.t === "bin" && nx.op === "-" && nx.a.t === "num" && qeq(nx.a.v, ONE) && (nx.b.t === "bin" && nx.b.op === "^" || repeatedFactors(nx.b))
        && (provided.has("independent") || stated.has("independent") || provided.has("with-replacement") || stated.has("with-replacement"))) {
        try { env.set(m.b.name, evalN(nx.b, env)); } catch { /* left unbound: the line then asks for the missing binding */ }
      }
    }
    // evaluate
    const vals: Cx[] = [];
    try {
      for (const m of members) vals.push(evalN(m, env));
    } catch (e) {
      if (e instanceof UnboundSym) { b.add(i, COMPLEMENT_NAME.test(e.message) ? missing(`the event ${e.message} is not bound to the supplied premises: state its value or the assumption it follows from before relying on it`) : uns(`the symbol ${e.message} is not bound to the problem data or to an earlier definition`)); return; }
      if (e instanceof DivZero) { b.add(i, bad("this line divides by zero")); return; }
      if (e instanceof Unsupported) { b.add(i, uns(e.message)); return; }
      if (e instanceof Budget || e instanceof Overflow) { b.add(i, { status: "resource-exhausted", reason: "a resource bound was reached" }); return; }
      if (e instanceof NotationError) { b.add(i, { status: e.kind === "ambiguous" ? "ambiguous" : "malformed", reason: e.message }); return; }
      throw e;
    }
    const js: Judge[] = [];
    if (signRel) {
      const lv = vals[vals.length - 1]; let rv: Cx | null = null; try { rv = evalN(signRel.rhs, env); } catch { rv = null; }
      if (!rv || !qiszero(lv.im) || !qiszero(rv.im)) js.push(uns("an inequality between non-real numbers is not an ordered comparison"));
      else { const sg = qsign(qsub(lv.re, rv.re)); const holds = signRel.op === "<" ? sg < 0 : signRel.op === ">" ? sg > 0 : signRel.op === "<=" ? sg <= 0 : sg >= 0; js.push(holds ? ok("the stated inequality holds for the exact value", "exact rational comparison", digestOf([cxText(lv), signRel.op, cxText(rv)])) : bad(`${cxText(lv)} ${signRel.op} ${cxText(rv)} is false`)); }
    }
    for (let k = 0; k + 1 < vals.length; k++) js.push(ceq(vals[k], vals[k + 1]) ? ok("the two members are exactly equal", "exact Gaussian-rational arithmetic", digestOf([cxText(vals[k]), cxText(vals[k + 1])])) : bad(`the members are not equal: ${cxText(vals[k])} ≠ ${cxText(vals[k + 1])}`));
    let j: Judge = js.length ? worst(js) : ok("single value", "exact arithmetic");
    const lastAst = members[members.length - 1]; const lastVal = vals[vals.length - 1];
    const inTruth = spec.truth.some((t) => ceq(t, lastVal));
    const canon = canonicalValue(lastAst);
    // label semantics
    const answerRe = new RegExp(spec.labels.source, "i");
    if (label !== null) {
      const dataVal = env.get(label) ?? env.get(label.replace(/\s+/g, ""));
      const isGiven = spec.given.some((g) => ceq(g, vals[0]));
      if (!dataVal && spec.noRealRoots && answerRe.test(label)) { if (j.status === "valid") j = bad(`${cxText(vals[0])} is not a real number, so it is not a root over the real numbers`); }
      else if (dataVal) { if (!ceq(dataVal, vals[0])) j = bad(`${label} is ${cxText(dataVal)}, not ${cxText(vals[0])}`); }
      else if (answerRe.test(label) && !(isGiven && !spec.truth.some((t2) => ceq(t2, vals[0])) && !spec.answerLike?.test(label))) {
        if (j.status === "valid" && !spec.truth.some((t2) => ceq(t2, vals[0]))) j = bad(`${texts[0].trim()} is ${cxText(spec.truth[0])}, not ${cxText(vals[0])}`);
        else if (j.status === "valid") { sawAnswerClaim = true; if (!spec.setValued && (/^[A-Za-z]+$/.test(label) || /^P\(/.test(label))) { try { env.set(label, vals[vals.length - 1]); } catch { /* ignore */ } } }
      } else if (j.status === "valid") { try { env.set(label, vals[vals.length - 1]); } catch { /* ignore */ } }
    } else if (j.status === "valid" && canon && i === rows.length - 1 && !spec.truth.some((t2) => ceq(t2, lastVal)) && !spec.aux) {
      j = incomplete(`these lines are true, but the chain ends at ${cxText(lastVal)}, not at the requested quantity ${cxText(spec.truth[0])}; state the requested quantity`);
    }
    if (spec.family === "finite" && members.length && repeatedFactors(members[0])) needReplacement = true;
    // method evidence: the first formula must visibly use the weights/probabilities (guards against numeric coincidences)
    if (j.status === "valid" && spec.mustMention && spec.mustMention.length) {
      const first = members[0]; const lits = litsOf(first);
      if (lits.length && !spec.mustMention.some((w) => lits.some((x) => qeq(x, w)))) j = bad("this working does not use the given probabilities as weights, so reaching the right number is a coincidence of the method");
    }
    // E7: a numeric match is not an answer. The line must name the requested quantity (or be unlabelled / a bare variable); a value merely equal to the truth under an unrelated label proves nothing.
    const labelRaw = (texts[0] ?? "").trim(), taskWords = new Set(String(spec.family).toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 2)), labelWords = (labelRaw.toLowerCase().match(/[a-z]{3,}/g) ?? []).filter((w) => !["the", "of", "and", "for", "var", "cov", "sin", "cos", "tan", "log", "exp", "sqrt", "abs"].includes(w));
    const srcs = sourcesOf(members[0], env, dataSyms, relevantDefs, premises, established, spec.witness, rows.slice(0, i).flatMap((r, k) => (b.records[k]?.judge.nonMath ? (r.plain.match(/\d+(?:\.\d+)?/g) ?? []).flatMap((t) => { try { return [{ ref: `stated in line ${k + 1}`, value: cv(t) }]; } catch { return []; } }) : [])), spec.facts);
    if (spec.datumResult && members.length > 1) { let lv: Cx | null = null; try { lv = symsOf(members[members.length - 1]).size === 0 ? evalN(members[members.length - 1], new Map()) : null; } catch { lv = null; } if (lv && ceq(lv, spec.datumResult)) srcs.push({ kind: "task-premise", ref: "the probability stated by the task data", by: "value", trivial: false }); }
    let grounding = assessRelevance(srcs);
    // a chain that passes THROUGH a step built only from the task's data (e.g. 48/120 for a task whose data are 48 and 120) is anchored to the task by that step; the final member is excluded because it is the answer itself
    if (!grounding.relevant && members.length >= 3) for (let k = 1; k < members.length - 1 && !grounding.relevant; k++) { const g2 = assessRelevance(sourcesOf(members[k], env, dataSyms, relevantDefs, premises, established, spec.witness, [], spec.facts)); if (g2.relevant && g2.sources.some((x) => x.by === "value" && !x.trivial && !x.derived)) grounding = { ...g2, reason: `an intermediate step is built from the task data (${g2.reason}) and the chain is verified equal across it` }; }
    const labelBound = label !== null && (answerRe.test(label) || answerRe.test(labelRaw) || (label !== null && ANSWER_WORD.test(label.trim())) || (label !== null && /^[A-Za-z][0-9]?$/.test(label.trim()) && !env.has(label)) || (labelWords.length === 0 || labelWords.every((w) => taskWords.has(w) || w === "roots" || w === "root" || w === "value")));
    const answerBound = label === null ? grounding.relevant : members.length > 1 ? labelBound && grounding.relevant : labelBound; // E7 Phase 5: a SHOWN derivation must itself be justified from the task, whatever it is labelled; a bare `label = value` is an answer statement judged against the kernel's own value
    if (j.status === "valid" && canon && !answerBound && spec.truth.some((t) => ceq(t, lastVal))) j = incomplete(label === null || labelBound
      ? `this calculation reaches the right value, but nothing in it comes from the problem's data or from an earlier verified result (${grounding.reason}); its relevance to the requested quantity is not established, so show how the quantity follows from the givens`
      : `this line names "${label}", which is not the requested quantity; state the requested quantity by name`);
    if (j.status === "valid" && canon) { found.push(lastVal); if (spec.truth.some((t) => ceq(t, lastVal))) { sawAnswerClaim = true; finalRow = i; } }
    grounding = { ...grounding, required: label === null || members.length > 1 };
    if (j.status !== "valid") j = { ...j, grounding };
    if (j.status === "valid") { j = { ...j, grounding }; if (grounding.relevant) { vals.forEach((v) => established.push({ ref: `line-${i + 1}`, value: v })); if (label !== null) relevantDefs.add(label); } }
    b.add(i, j);
  });
  // assumptions the method needs
  const allValid = b.records.every((r) => r?.judge.status === "valid");
  const unmetAssumptions = [...spec.needs, ...(needReplacement && !provided.has("with-replacement") && !provided.has("independent") && !stated.has("with-replacement") && !stated.has("independent") ? ["with-replacement"] : [])].filter((a) => !provided.has(a) && !stated.has(a) && !(a === "unordered" && stated.has("ordered") === false && false));
  const contradicted = spec.needs.filter((a) => negated.has(a));
  let complete = allValid && finalRow === rows.length - 1 && sawAnswerClaim;
  if (spec.noRealRoots) complete = allValid && sawNoReal && finalRow === rows.length - 1;
  else if (spec.setValued) complete = allValid && spec.truth.every((t) => found.some((f) => ceq(f, t))) && finalRow >= 0 && rows.length - 1 === Math.max(...b.records.map((r, i) => (r?.judge.status === "valid" ? i : -1)));
  const notes: string[] = [];
  if (contradicted.length && allValid) { const last = rows.length - 1; b.records[last] = { ...b.records[last], judge: bad(`the working states that ${contradicted[0]} does not hold, but the method needs it`), evidence: null }; complete = false; }
  else if (unmetAssumptions.length && allValid) {
    // the line that relies on the method carries the missing assumption
    const target = finalRow >= 0 ? finalRow : rows.length - 1; const r = b.records[target];
    if (r) b.records[target] = { ...r, judge: missing(`state the assumption ${unmetAssumptions.join(", ")} before relying on this method`), evidence: null };
    complete = false;
  }
  const why = spec.noRealRoots ? "state that there are no real roots" : spec.setValued ? "give every solution as a reduced numeral" : "finish with the requested quantity as a single reduced number";
  if (allValid && !complete && !unmetAssumptions.length && !contradicted.length) { const last = rows.length - 1; const r = b.records[last]; if (r && r.judge.status === "valid") b.records[last] = { ...r, judge: { status: "incomplete", reason: why }, evidence: null }; }
  void NAMES_PRIME; void ident; void qtext;
  return finish(parsed, b, { domain: problem.domain, family: problem.task, nativeComplete: complete && !unmetAssumptions.length && !contradicted.length, obligations: complete && !unmetAssumptions.length ? [] : unmetAssumptions.length ? [`state the assumption ${unmetAssumptions.join(", ")}`] : [why], notes, finalValue: complete ? { kind: "numeric", text: spec.truth.map(cxText).join(" , ") } : null });
}
export const truthOfNumbers = (p: NumProblem): Cx[] | null => { try { const s = specOf(p); return s.unsupported ? null : s.truth; } catch { return null; } };
