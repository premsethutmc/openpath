/**
 * E6 notation reader for calculus-style natural working. It only TRANSLATES text into a typed expression tree (A); it decides nothing
 * mathematically. Anything it cannot read unambiguously raises NotationError and the line is reported unsupported/ambiguous, never guessed.
 * Supported spellings: plain (`x^2`, `sqrt(x)`, `d/dx[..]`, `f'(x)`, `dy/dx`, `int_a^b .. dx`), Unicode (`x²`, `√`, `π`, `∞`, `→`, `∫₁³`) and LaTeX
 * (`\frac`, `\sqrt`, `\left..\right`, `\int_{a}^{b}`, `\lim_{x \to a^-}`, `\tan`, `\ln`, `\cdot`).
 */
import { q, qadd, qdiv, qmul, qneg, type Q } from "./exact-e5.ts";

export type A =
  | { t: "n"; v: Q }
  | { t: "pi" } | { t: "e" } | { t: "C" }
  | { t: "s"; name: string }
  | { t: "neg"; a: A }
  | { t: "add"; xs: A[] }
  | { t: "mul"; xs: A[] }
  | { t: "div"; a: A; b: A }
  | { t: "pow"; a: A; b: A }
  | { t: "fn"; f: string; a: A }
  | { t: "call"; name: string; args: A[] }
  | { t: "Dcall"; name: string; k: number; arg: A }
  | { t: "D"; of: A; v: string; k: number }
  | { t: "I"; f: A; v: string; lo?: A; hi?: A }
  | { t: "EV"; f: A; v: string; lo: A; hi: A }
  | { t: "LIM"; f: A; v: string; at: A | "inf" | "-inf"; side: "both" | "left" | "right" }
  | { t: "V"; k: "inf" | "-inf" | "dne" };

export class NotationError extends Error { constructor(msg: string, readonly kind: "malformed" | "ambiguous" | "unsupported" = "malformed") { super(msg); } }

export const N = (n: number | bigint, d: number | bigint = 1): A => ({ t: "n", v: q(n, d) });
export const S = (name: string): A => ({ t: "s", name });
export const neg = (a: A): A => ({ t: "neg", a });
export const add = (...xs: A[]): A => ({ t: "add", xs });
export const mul = (...xs: A[]): A => ({ t: "mul", xs });
export const div = (a: A, b: A): A => ({ t: "div", a, b });
export const pw = (a: A, b: A): A => ({ t: "pow", a, b });
export const fn = (f: string, a: A): A => ({ t: "fn", f, a });

// ================================================================================================ normalisation
function matching(s: string, start: number, open = "{", close = "}"): number { let d = 0; for (let i = start; i < s.length; i++) { if (s[i] === open) d++; else if (s[i] === close && !--d) return i; } return -1; }
const SUP: Record<string, string> = { "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4", "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9", "⁻": "-", "⁺": "+" };
const SUB: Record<string, string> = { "₀": "0", "₁": "1", "₂": "2", "₃": "3", "₄": "4", "₅": "5", "₆": "6", "₇": "7", "₈": "8", "₉": "9", "₋": "-" };

/** text -> plain ASCII-ish syntax understood by the tokenizer. */
export function normalize(raw: string): string {
  let s = raw.trim();
  // E7 repair E: evaluation written in words is the same object as the bracket notation the parser already supports: `[F] from a to b` = `[F]_a^b`
  s = s.replace(/(\[[^\[\]]+\]|\([^()]+\))\s*(?:evaluated\s+)?(?:from|between)\s+(?:x\s*=\s*)?(-?[A-Za-z0-9.π∞]+)\s+(?:to|and)\s+(?:x\s*=\s*)?(-?[A-Za-z0-9.π∞]+)/gi, (_m, f, lo, hi) => `${f.startsWith("(") ? "[" + f.slice(1, -1) + "]" : f}_${lo}^${hi}`);
  s = s.replace(/^\s*(?:\$\$|\$|\\\[|\\\()\s*/, "").replace(/\s*(?:\$\$|\$|\\\]|\\\))\s*$/, "");
  s = s.replace(/\\left|\\right|\\big|\\Big|\\bigg|\\displaystyle/g, "").replace(/\\(?:!|,|;|:|quad|qquad)/g, " ").replace(/\\ /g, " ")
    .replace(/\\mathrm\{d\}/g, "d").replace(/\\text\{([^}]*)\}/g, "$1").replace(/\\operatorname\{([^}]*)\}/g, "$1");
  // fractions and roots (innermost-last so nesting works)
  for (let g = 0; g < 64; g++) {
    const i = s.search(/\\[dt]?frac\s*\{/); if (i < 0) break;
    const a0 = s.indexOf("{", i), a1 = matching(s, a0); if (a1 < 0) throw new NotationError("unbalanced \\frac");
    let b0 = a1 + 1; while (s[b0] === " ") b0++; if (s[b0] !== "{") throw new NotationError("malformed \\frac");
    const b1 = matching(s, b0); if (b1 < 0) throw new NotationError("unbalanced \\frac");
    const num = s.slice(a0 + 1, a1), den = s.slice(b0 + 1, b1);
    if (/^d(?:\^\{?\d+\}?)?[A-Za-z]?$/.test(num.trim()) && /^d[A-Za-z](?:\^\{?\d+\}?)?$/.test(den.trim())) s = s.slice(0, i) + `${num.trim()}/${den.trim()}` + s.slice(b1 + 1);
    else s = s.slice(0, i) + `((${num})/(${den}))` + s.slice(b1 + 1);
  }
  for (let g = 0; g < 32; g++) {
    const i = s.indexOf("\\binom"); if (i < 0) break;
    const a0 = s.indexOf("{", i), a1 = matching(s, a0); const b0 = a1 + 1, b1 = matching(s, b0);
    if (a0 < 0 || a1 < 0 || s[b0] !== "{" || b1 < 0) throw new NotationError("malformed \\binom");
    s = s.slice(0, i) + `C(${s.slice(a0 + 1, a1)},${s.slice(b0 + 1, b1)})` + s.slice(b1 + 1);
  }
  for (let g = 0; g < 32; g++) { const i = s.indexOf("\\sqrt"); if (i < 0) break; if (s[i + 5] === "[") throw new NotationError("n-th roots are not read", "unsupported"); const a0 = s.indexOf("{", i), a1 = matching(s, a0); if (a0 < 0 || a1 < 0) throw new NotationError("malformed \\sqrt"); s = s.slice(0, i) + "sqrt(" + s.slice(a0 + 1, a1) + ")" + s.slice(a1 + 1); }
  for (let g = 0; g < 32; g++) { const i = s.indexOf("\\overline"); if (i < 0) break; const a0 = s.indexOf("{", i), a1 = matching(s, a0); if (a0 < 0 || a1 < 0) throw new NotationError("malformed \\overline"); s = s.slice(0, i) + "conj(" + s.slice(a0 + 1, a1) + ")" + s.slice(a1 + 1); }
  s = s.replace(/\\(sinh|cosh|tanh|arcsin|arccos|arctan|sin|cos|tan|sec|csc|cot|ln|log|exp)\b/g, "$1")
    .replace(/\\cdot|\\times|\\ast/g, "*").replace(/\\div/g, "/").replace(/\\pi\b/g, "pi").replace(/\\infty/g, "∞")
    .replace(/\\(?:to|rightarrow|longrightarrow)/g, "->").replace(/\\int/g, "∫").replace(/\\lim/g, "lim")
    .replace(/\\prime|\^\s*\{\\prime\}/g, "'").replace(/\\(?:ne|neq)\b/g, "!=").replace(/\\leq?\b/g, "<=").replace(/\\geq?\b/g, ">=")
    .replace(/\\(?:Rightarrow|implies)/g, "=>").replace(/\\mid/g, "|");
  // sub/superscript braces -> parentheses
  for (let g = 0; g < 64; g++) { const m = /([_^])\s*\{/.exec(s); if (!m) break; const a0 = s.indexOf("{", m.index), a1 = matching(s, a0); if (a1 < 0) throw new NotationError("unbalanced brace"); s = s.slice(0, m.index) + m[1] + "(" + s.slice(a0 + 1, a1) + ")" + s.slice(a1 + 1); }
  if (/\\[A-Za-z]+/.test(s)) throw new NotationError("unrecognised LaTeX command " + (/\\[A-Za-z]+/.exec(s) as RegExpExecArray)[0], "unsupported");
  // unicode
  s = s.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺]+/g, (m) => "^" + [...m].map((c) => SUP[c]).join("")).replace(/[₀₁₂₃₄₅₆₇₈₉₋]+/g, (m) => "_" + [...m].map((c) => SUB[c]).join(""));
  s = s.replace(/√\s*\(/g, "sqrt(").replace(/√\s*([A-Za-z0-9.]+)/g, "sqrt($1)").replace(/π/g, "pi").replace(/−|–|—/g, "-").replace(/[×·⋅∙]/g, "*").replace(/÷/g, "/")
    .replace(/[′’´]/g, "'").replace(/≠/g, "!=").replace(/≤/g, "<=").replace(/≥/g, ">=").replace(/→|⟶|⟹/g, "->").replace(/⁄/g, "/").replace(/\bDNE\b/g, "dne");
  s = s.replace(/\^\(\s*(-?\d+)\s*\)/g, "^$1");
  // a one-sided marker attached to the limit point (`x->2+ (…)`, `x→1- …`) is kept as a marker; a spaced sign (`x->2 + 1/x`) stays arithmetic
  s = s.replace(/(->\s*[-+]?[A-Za-z0-9.\/]*[A-Za-z0-9])([+-])(?=[ (]|$)/g, "$1^$2");
  return s.replace(/[ \t]+/g, " ").trim();
}

// ================================================================================================ tokenizer
type Tok = { k: "n" | "id" | "op"; v: string };
const FUNCS = new Set(["sin", "cos", "tan", "sec", "csc", "cot", "ln", "log", "exp", "sqrt", "abs", "arctan", "arcsin", "arccos", "atan", "asin", "acos", "sinh", "cosh", "tanh", "conj"]);
function tokenize(s: string): Tok[] {
  const out: Tok[] = []; let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === " ") { i++; continue; }
    if (/[0-9]/.test(c) || (c === "." && /[0-9]/.test(s[i + 1] ?? ""))) { const m = /^\d*\.?\d+|^\d+\.?/.exec(s.slice(i)) as RegExpExecArray; out.push({ k: "n", v: m[0] }); i += m[0].length; continue; }
    if (/[A-Za-z]/.test(c)) { const m = /^[A-Za-z]+/.exec(s.slice(i)) as RegExpExecArray; out.push({ k: "id", v: m[0] }); i += m[0].length; continue; }
    if (c === "-" && s[i + 1] === ">") { out.push({ k: "op", v: "->" }); i += 2; continue; }
    if (c === "∞") { out.push({ k: "id", v: "inf" }); i++; continue; }
    if (c === "∫") { out.push({ k: "op", v: "∫" }); i++; continue; }
    if ("+-*/^()[]{},=!<>|_'".includes(c)) { out.push({ k: "op", v: c }); i++; continue; }
    throw new NotationError(`unreadable character '${c}'`);
  }
  return out;
}
const toQ = (txt: string): Q => { const [i, f = ""] = txt.split("."); if (f.length > 12) throw new NotationError("too many decimals"); return q(BigInt(i || "0") * 10n ** BigInt(f.length) + BigInt(f || "0"), 10n ** BigInt(f.length)); };

// ================================================================================================ parser
export interface ParseHints { fnNames: Set<string>; variable: string; allowD?: boolean }
const DIFF_RE = /^d([A-Za-z])$/;

class Parser {
  i = 0;
  constructor(readonly t: Tok[], readonly h: ParseHints) {}
  pk(o = 0): Tok | undefined { return this.t[this.i + o]; }
  isOp(v: string, o = 0): boolean { const x = this.pk(o); return !!x && x.k === "op" && x.v === v; }
  eat(): Tok { const x = this.t[this.i++]; if (!x) throw new NotationError("unexpected end of expression"); return x; }
  expect(v: string): void { if (!this.isOp(v)) throw new NotationError(`expected '${v}'`); this.i++; }
  done(): boolean { return this.i >= this.t.length; }

  expr(stopAtDiff = false): A {
    const terms: A[] = []; let sign = 1;
    if (this.isOp("-")) { this.i++; sign = -1; } else if (this.isOp("+")) this.i++;
    for (;;) {
      const t = this.term(stopAtDiff);
      terms.push(sign < 0 ? neg(t) : t);
      if (this.isOp("+")) { this.i++; sign = 1; } else if (this.isOp("-")) { this.i++; sign = -1; } else break;
    }
    return terms.length === 1 ? terms[0] : add(...terms);
  }
  private startsFactor(stopAtDiff: boolean): boolean {
    const x = this.pk(); if (!x) return false;
    if (x.k === "n") return true;
    if (x.k === "id") { if (stopAtDiff && this.atDifferential()) return false; return true; }
    return x.k === "op" && (x.v === "(" || x.v === "[" || x.v === "∫" || x.v === "|");
  }
  /** `dx` / `d x`: the closing differential of an integral */
  atDifferential(): boolean {
    const x = this.pk(); if (!x || x.k !== "id") return false;
    if (DIFF_RE.test(x.v)) return true;
    return false;
  }
  term(stopAtDiff: boolean): A {
    let acc = this.factor(stopAtDiff);
    let lastWasDivision = false;
    for (;;) {
      if (this.isOp("*")) { this.i++; const f = this.factor(stopAtDiff); acc = acc.t === "mul" && !(acc as any)._p ? mul(...acc.xs, f) : mul(acc, f); lastWasDivision = false; }
      else if (this.isOp("/")) { this.i++; const f = this.factor(stopAtDiff); acc = div(acc, f); lastWasDivision = true; }
      else if (this.startsFactor(stopAtDiff) && !this.isOp("|") && !this.isOp("∫") ) {
        // implicit multiplication; `a/b c` is ambiguous (a/(bc) or (a/b)c) and is refused rather than guessed
        if (lastWasDivision) throw new NotationError("ambiguous implicit multiplication after a division (write the product explicitly)", "ambiguous");
        const f = this.factor(stopAtDiff); acc = mul(...(acc.t === "mul" ? acc.xs : [acc]), f);
      } else if (this.isOp("∫") && !lastWasDivision) { const f = this.factor(stopAtDiff); acc = mul(...(acc.t === "mul" ? acc.xs : [acc]), f); }
      else break;
    }
    return acc;
  }
  factor(stopAtDiff: boolean): A {
    if (this.isOp("-")) { this.i++; return neg(this.factor(stopAtDiff)); }
    if (this.isOp("+")) { this.i++; return this.factor(stopAtDiff); }
    return this.power(stopAtDiff);
  }
  power(stopAtDiff: boolean): A {
    const base = this.postfix(stopAtDiff);
    if (this.isOp("^")) {
      this.i++;
      let e: A;
      if (this.isOp("-")) { this.i++; e = neg(this.primary(false)); } else e = this.primary(false);
      let r = pw(base, e);
      // right-associative tower a^b^c
      if (this.isOp("^")) throw new NotationError("a^b^c is ambiguous without parentheses", "ambiguous");
      return r;
    }
    return base;
  }
  postfix(stopAtDiff: boolean): A {
    let p = this.primary(stopAtDiff);
    while (this.isOp("'")) { let k = 0; while (this.isOp("'")) { this.i++; k++; } p = { t: "D", of: p, v: this.h.variable, k }; }
    return p;
  }
  /** integral bound: number, constant, parenthesised expression, sqrt/ln call */
  bound(): A {
    if (this.isOp("(")) { this.i++; const e = this.expr(); this.expect(")"); return e; }
    if (this.isOp("-")) { this.i++; return neg(this.bound()); }
    return this.primary(false);
  }
  primary(stopAtDiff: boolean): A {
    const x = this.pk(); if (!x) throw new NotationError("expression expected");
    if (x.k === "n") { this.i++; return { t: "n", v: toQ(x.v) }; }
    if (x.k === "op") {
      if (x.v === "(") { this.i++; const e = this.expr(); this.expect(")"); return e.t === "mul" ? { ...e, _p: true } as any : e; }
      if (x.v === "[") {
        this.i++; const e = this.expr(); this.expect("]");
        if (this.isOp("_")) { this.i++; const lo = this.bound(); this.expect("^"); const hi = this.bound(); return { t: "EV", f: e, v: this.h.variable, lo, hi }; }
        return e;
      }
      if (x.v === "|") {
        this.i++; const e = this.exprUntilBar(); this.expect("|");
        if (this.isOp("_")) { this.i++; const lo = this.bound(); this.expect("^"); const hi = this.bound(); return { t: "EV", f: e, v: this.h.variable, lo, hi }; }
        return fn("abs", e);
      }
      if (x.v === "∫") return this.integral();
      throw new NotationError(`unexpected '${x.v}'`);
    }
    // identifier run
    const run = x.v;
    if (run === "inf" || run === "infinity") { this.i++; return { t: "V", k: "inf" }; }
    if (run === "dne") { this.i++; return { t: "V", k: "dne" }; }
    if (run === "lim") return this.limit();
    if (run === "pi") { this.i++; return { t: "pi" }; }
    if (run === "C" && !this.isOp("(", 1)) { this.i++; return { t: "C" }; }
    if (run === "d" && this.isOp("/", 1)) return this.leibnizOperator();
    if (/^d[a-z]$/.test(run) && this.isOp("/", 1) && this.pk(2)?.k === "id" && /^d[a-z]$/.test(this.pk(2)!.v)) {
      const num = run[1], den = this.pk(2)!.v[1]; this.i += 3; return { t: "D", of: S(num), v: den, k: 1 };
    }
    if (FUNCS.has(run)) return this.functionCall(run);
    // exp via e^..., Euler constant
    if (run === "e") {
      this.i++;
      if (this.isOp("^")) { this.i++; let ex: A; if (this.isOp("-")) { this.i++; ex = neg(this.primary(false)); } else ex = this.primary(false); return fn("exp", ex); }
      return { t: "e" };
    }
    // split a run of letters into known pieces: functions first, otherwise single letters multiplied
    this.i++;
    const pieces = splitRun(run, this.h, stopAtDiff);
    if (pieces.length === 1) return this.symbolOrCall(pieces[0]);
    // E7 repair E: four or more different letters that are not functions are a word of the student's prose (from, between, evaluated), not a product of variables; reading it as one would
    // turn the sentence into a different expression and the verdict would be about that expression
    const before = this.t[this.i - 2]; // only a word that FOLLOWS a finished expression (`] from`, `) evaluated`, `2 and`): a leading word is a label the callers already handle
    if (before && ((before.k === "op" && (before.v === ")" || before.v === "]")) || before.k === "n") && run.length >= 4 && pieces.every((p) => p.length === 1) && new Set(pieces).size >= 4) throw new NotationError(`"${run}" is a word, not a product of variables`, "unsupported");
    // run like "xe" or "xsin": rewrite the token stream
    const rest: Tok[] = []; pieces.forEach((p, idx) => { if (idx) rest.push({ k: "op", v: "*" }); rest.push({ k: "id", v: p }); });
    this.t.splice(this.i - 1, 1, ...rest); this.i -= 1;
    return this.primary(stopAtDiff);
  }
  exprUntilBar(): A {
    // inside |..| a nested bar is not supported; parse an expression and stop at the closing bar
    const e = this.expr(); return e;
  }
  symbolOrCall(name: string): A {
    if (this.isOp("'") ) {
      let k = 0; while (this.isOp("'")) { this.i++; k++; }
      if (this.isOp("(")) { this.i++; const arg = this.expr(); this.expect(")"); return { t: "Dcall", name, k, arg }; }
      return { t: "D", of: S(name), v: this.h.variable, k };
    }
    if (this.h.fnNames.has(name) && this.isOp("(")) {
      this.i++; const args: A[] = [this.expr()]; while (this.isOp(",")) { this.i++; args.push(this.expr()); } this.expect(")");
      return { t: "call", name, args };
    }
    return S(name);
  }
  functionCall(name: string): A {
    this.i++;
    let power: A | null = null;
    if (this.isOp("^")) { this.i++; if (this.isOp("-")) { this.i++; power = neg(this.primary(false)); } else power = this.primary(false); }
    let arg: A;
    if (this.isOp("(")) { this.i++; arg = this.expr(); this.expect(")"); }
    else if (this.isOp("|")) arg = this.primary(false); // ln|x|: the bars delimit an absolute value
    else {
      const x = this.pk();
      if (x && x.k === "id" && x.v.length === 1 && !this.isOp("(", 1)) { this.i++; arg = S(x.v); }
      else if (x && x.k === "n" && !(this.pk(1) && this.pk(1)!.k === "id")) { this.i++; arg = { t: "n", v: toQ(x.v) }; }
      else if (x && x.k === "id" && x.v === "pi") { this.i++; arg = { t: "pi" }; }
      else throw new NotationError(`function ${name} needs a parenthesised argument`, "ambiguous");
    }
    const f = fn(name, arg);
    return power ? pw(f, power) : f;
  }
  leibnizOperator(): A {
    // d/dx[...] , d/dx(...), d/dx x^2
    this.i++; this.expect("/");
    const x = this.eat(); if (x.k !== "id" || !/^d[a-z]$/.test(x.v)) throw new NotationError("malformed d/dx");
    const v = x.v[1]; let k = 1;
    if (this.isOp("^")) { this.i++; k = Number(this.eat().v); }
    let body: A;
    if (this.isOp("[")) { this.i++; body = this.expr(); this.expect("]"); }
    else {
      body = this.power(false);
      // E7 repair E: `d/dx 1/x` can be read (d/dx 1)/x or d/dx (1/x); an unbracketed operand that a * or / continues is not decided by this parser, so no verdict may be built on either reading
      if (this.isOp("/") || this.isOp("*")) throw new NotationError("the extent of d/dx is not bracketed (d/dx 1/x): write d/dx(1/x)", "ambiguous");
    }
    return { t: "D", of: body, v, k };
  }
  integral(): A {
    this.expect("∫");
    let lo: A | undefined, hi: A | undefined;
    if (this.isOp("_")) { this.i++; lo = this.bound(); this.expect("^"); hi = this.bound(); }
    // integrand: tokens up to the closing differential at depth 0
    let depth = 0, j = this.i; let end = -1; let v = "";
    for (; j < this.t.length; j++) {
      const t = this.t[j];
      if (t.k === "op" && (t.v === "(" || t.v === "[")) depth++;
      else if (t.k === "op" && (t.v === ")" || t.v === "]")) depth--;
      else if (depth === 0 && t.k === "id" && DIFF_RE.test(t.v) && !(this.t[j + 1]?.k === "op" && this.t[j + 1].v === "/")) {
        // `dx` closes the integral unless it is the start of `dx/dt`
        end = j; v = t.v[1]; break;
      }
      if (depth < 0) break;
    }
    if (end < 0) throw new NotationError("integral without a closing differential", "ambiguous");
    // allow a split differential `d x`
    const sub = new Parser(this.t.slice(this.i, end), this.h);
    if (!sub.t.length) throw new NotationError("empty integrand");
    const f = sub.expr(); if (!sub.done()) throw new NotationError("could not read the integrand");
    this.i = end + 1;
    return { t: "I", f, v, ...(lo ? { lo, hi } : {}) };
  }
  limit(): A {
    this.i++;
    let hasParen = false, close = "";
    if (this.isOp("_")) { this.i++; hasParen = true; }
    if (hasParen && this.isOp("(")) { this.i++; close = ")"; }
    const vtok = this.eat(); if (vtok.k !== "id" || vtok.v.length !== 1) throw new NotationError("limit variable expected");
    this.expect("->");
    let at: A | "inf" | "-inf"; let side: "both" | "left" | "right" = "both";
    // target: signed number/constant, possibly followed by a one-sided marker ^+ ^- + -
    if (this.isOp("-") && (this.pk(1)?.v === "inf" || this.pk(1)?.v === "infinity")) { this.i += 2; at = "-inf"; }
    else if (this.pk()?.k === "id" && (this.pk()!.v === "inf" || this.pk()!.v === "infinity")) { this.i++; at = "inf"; }
    else if (this.isOp("+") && this.pk(1)?.v === "inf") { this.i += 2; at = "inf"; }
    else {
      let sign = 1; if (this.isOp("-")) { this.i++; sign = -1; }
      let pt = this.primaryNoSide(); if (sign < 0) pt = neg(pt);
      // fractions like 1/2 or 1/2^-: parse a simple a/b
      if (this.isOp("/")) { this.i++; const den = this.primaryNoSide(); pt = div(pt, den); }
      at = pt;
      if (this.isOp("^")) { this.i++; const sgn = this.eat(); if (sgn.v === "+") side = "right"; else if (sgn.v === "-") side = "left"; else throw new NotationError("bad one-sided marker"); }
      else if (this.isOp("+") && (!close ? false : this.isOp(")", 1))) { this.i++; side = "right"; }
      else if (this.isOp("-") && (!close ? false : this.isOp(")", 1))) { this.i++; side = "left"; }
      else if (this.isOp("+") && close === "" && this.t[this.i + 1] === undefined) { this.i++; side = "right"; }
    }
    if (close) this.expect(")");
    const body = this.expr();
    return { t: "LIM", f: body, v: vtok.v, at, side };
  }
  primaryNoSide(): A {
    const x = this.pk(); if (!x) throw new NotationError("limit point expected");
    if (x.k === "n") { this.i++; return { t: "n", v: toQ(x.v) }; }
    if (x.k === "id" && x.v === "pi") { this.i++; return { t: "pi" }; }
    if (this.isOp("(")) { this.i++; const e = this.expr(); this.expect(")"); return e; }
    throw new NotationError("limit point not understood");
  }
}
function splitRun(run: string, h: ParseHints, stopAtDiff: boolean): string[] {
  if (run.length === 1) return [run];
  if (h.fnNames.has(run)) return [run];
  if (/^d[a-z]$/.test(run)) return [run];
  const out: string[] = []; let i = 0;
  while (i < run.length) {
    let hit: string | null = null;
    for (const f of [...FUNCS, "pi"].sort((a, b) => b.length - a.length)) if (run.startsWith(f, i) && (f !== "pi" || true)) { hit = f; break; }
    if (hit) { out.push(hit); i += hit.length; } else { out.push(run[i]); i++; }
  }
  void stopAtDiff;
  return out;
}

export function parseExpression(text: string, hints: ParseHints): A {
  const s = normalize(text);
  const toks = tokenize(s);
  const p = new Parser(toks, hints);
  const e = p.expr();
  if (!p.done()) throw new NotationError(`could not read '${toks.slice(p.i).map((t) => t.v).join(" ")}'`);
  return e;
}
/** split at top-level '=' (not inside brackets, not part of != <= >= ==) */
export function splitEquals(s: string): string[] {
  const out: string[] = []; let d = 0, cur = "";
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if ("([{".includes(c)) d++; else if (")]}".includes(c)) d--;
    if (d === 0 && c === "=" && !/[<>!=]/.test(s[i - 1] ?? "") && s[i + 1] !== "=" && s[i + 1] !== ">") { out.push(cur); cur = ""; continue; }
    cur += c;
  }
  out.push(cur); return out.map((x) => x.trim());
}
export { qadd, qdiv, qmul, qneg };
