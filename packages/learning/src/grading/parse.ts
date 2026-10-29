/**
 * The strict response parser (grading-policy@1, UNIFIED_GRADING_ARCHITECTURE.md §4). Every learner answer is read here, once, before
 * any comparison or kernel sees it. It never guesses:
 *
 *   1. every character is consumed by the grammar; nothing is deleted, skipped or trimmed (except outer whitespace);
 *   2. whitespace separates tokens and is never removed inside a number: "17714 7" is not 177147 ("split-number");
 *   3. an operator without an operand is an error, never dropped: "177147 +" is invalid ("trailing-operator");
 *   4. a construct with two standard readings is "ambiguous" (1/2x, 2^3x, sin x/2, √2x, sec x tan x) and is sent back for clarification;
 *   5. a mixed number "w n/d" (0 < n < d) is read only where the answer semantics permit it.
 * The result is either a parsed answer with its canonical text (an ASCII form every comparison and kernel reads unambiguously:
 * explicit "*", function brackets, "sqrt(", "pi", "∞"), or a reason it is not an answer. Invalid and ambiguous answers are
 * unresolved: never credit, never a penalty, never an attempt.
 */
export const PARSER_VERSION = "parser@1" as const;

export type SemanticsKind = "choice" | "rational" | "exact-real" | "expression" | "antiderivative" | "solution-set" | "roots" | "tuple" | "matrix" | "real-subset" | "ratio" | "educator";
export interface Semantics { kind: SemanticsKind; mixed: boolean; options?: number; /** the unknown an equation question solves for: "x = 4" is then read as 4 */ variable?: string | null }
export type InvalidReason = "empty" | "syntax" | "trailing-operator" | "leading-operator" | "split-number" | "unbalanced" | "division-by-zero" | "type-mismatch" | "no-such-option" | "too-long" | "unsupported-notation" | "empty-interval" | "closed-at-infinity";
export type ParseResult =
  | { status: "parsed"; canonical: string; value: string; notation: Notation }
  | { status: "invalid"; reason: InvalidReason; detail: string }
  | { status: "ambiguous"; readings: [string, string]; detail: string };
/** what was written, for form checks (§4.3): kept separate from the value */
export interface Notation { /** a sum of monomials: no bracketed sum multiplied, divided or raised to a power (function brackets do not count) */ expanded: boolean; mixedNumber: boolean; decimal: boolean; fraction: boolean; inequality: boolean; braces: boolean; parentheses: boolean; equation: boolean; constant: boolean; groupingCommas: boolean }

/** the semantics of a question's answer from its stored type and answer (stage 2: before contract@2 carries it explicitly) */
export function semanticsOf(q: { type: string; answer: string; options?: readonly string[] | null }): Semantics {
  const letters = /[a-zA-Z]/.test(q.answer.replace(/sqrt|pi|log|ln|sin|cos|tan|sec|cot|cosec|csc|exp|arc/g, " ").replace(/π|√|∞/g, " "));
  switch (q.type) {
    case "choice": return { kind: "choice", mixed: false, options: q.options?.length ?? 4 };
    case "integer": return { kind: "rational", mixed: false };
    case "fraction": case "mixed": return { kind: "rational", mixed: true };
    case "exact": return { kind: letters ? "expression" : "exact-real", mixed: false };
    case "expression": case "polynomial": return { kind: letters ? "expression" : "exact-real", mixed: false };
    case "antiderivative": return { kind: "antiderivative", mixed: false };
    case "set": return { kind: "solution-set", mixed: false };
    case "roots": return { kind: "roots", mixed: false };
    case "tuple": return { kind: "tuple", mixed: false };
    case "matrix": return { kind: "matrix", mixed: false };
    case "interval": return { kind: "real-subset", mixed: false };
    case "ratio": return { kind: "ratio", mixed: false };
    default: return { kind: "educator", mixed: false };
  }
}

class Invalid extends Error { constructor(public reason: InvalidReason, public detail: string) { super(detail); } }
class Ambiguous extends Error { constructor(public readings: [string, string], public detail: string) { super(detail); } }
const fail = (reason: InvalidReason, detail: string): never => { throw new Invalid(reason, detail); };

const blankNotation = (): Notation => ({ expanded: true, mixedNumber: false, decimal: false, fraction: false, inequality: false, braces: false, parentheses: false, equation: false, constant: false, groupingCommas: false });
const MAX = 300;

// ---------------------------------------------------------------------------------------------------------------- tokens
type Tok =
  | { t: "num"; v: string; sp: boolean } | { t: "var"; v: string; sp: boolean } | { t: "fn"; v: string; inv: boolean; sp: boolean }
  | { t: "pi"; sp: boolean } | { t: "e"; sp: boolean } | { t: "inf"; sp: boolean } | { t: "sqrt"; sp: boolean } | { t: "sup"; v: string; sp: boolean }
  | { t: "op"; v: "+" | "-" | "*" | "/" | "^"; sp: boolean } | { t: "("; sp: boolean } | { t: ")"; sp: boolean } | { t: "["; sp: boolean } | { t: "]"; sp: boolean }
  | { t: "{"; sp: boolean } | { t: "}"; sp: boolean } | { t: "|"; sp: boolean } | { t: ","; sp: boolean } | { t: ";"; sp: boolean } | { t: ":"; sp: boolean }
  | { t: "cmp"; v: "<" | "<=" | ">" | ">="; sp: boolean } | { t: "="; sp: boolean } | { t: "cup"; sp: boolean };

const FUNCS = ["arcsin", "arccos", "arctan", "arccot", "arcsec", "arccsc", "cosec", "sqrt", "sin", "cos", "tan", "cot", "sec", "csc", "log", "ln", "exp", "abs"];
const SUPER: Record<string, string> = { "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4", "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9", "⁻": "-" };

export function tokenize(src: string): Tok[] {
  const out: Tok[] = [];
  let i = 0, sp = false;
  const push = (k: Omit<Tok, "sp">) => { out.push({ ...k, sp } as Tok); sp = false; };
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) { sp = true; i++; continue; }
    if (/[0-9.]/.test(c)) {
      const m = /^(\d+(?:\.\d*)?|\.\d+)/.exec(src.slice(i));
      if (!m) fail("syntax", `unexpected "${c}"`);
      if (src[i + m![0].length] === ".") fail("syntax", "two decimal points");
      push({ t: "num", v: m![0] }); i += m![0].length; continue;
    }
    if (/[a-zA-Z]/.test(c)) {
      const run = /^[a-zA-Z]+/.exec(src.slice(i))![0];
      let j = 0;
      while (j < run.length) {
        const rest = run.slice(j).toLowerCase();
        const f = FUNCS.find((n) => rest.startsWith(n));
        if (f) { push({ t: "fn", v: f === "cosec" ? "csc" : f === "ln" ? "log" : f, inv: false }); j += f.length; continue; }
        if (rest.startsWith("pi")) { push({ t: "pi" }); j += 2; continue; }
        if (rest.startsWith("oo") || rest.startsWith("inf")) { push({ t: "inf" }); j += rest.startsWith("infinity") ? 8 : rest.startsWith("inf") ? 3 : 2; continue; }
        const ch = run[j];
        if (run === "or" || run === "and") { push({ t: "var", v: `#${run}` }); j = run.length; continue; }
        if (ch === "e") push({ t: "e" }); else if (ch === "U" && out.length && j === 0 && run.length === 1) push({ t: "cup" }); else push({ t: "var", v: ch });
        j++;
      }
      i += run.length; continue;
    }
    if (SUPER[c]) {
      let k = i, s = "";
      while (k < src.length && SUPER[src[k]]) s += SUPER[src[k++]];
      if (!/^-?\d+$/.test(s)) fail("syntax", "a superscript must be a whole number");
      push({ t: "sup", v: s }); i = k; continue;
    }
    const two = src.slice(i, i + 2);
    if (two === "<=" || two === ">=" || two === "=<" || two === "=>") { push({ t: "cmp", v: two[0] === "=" ? (`${two[1]}=` as "<=") : (two as "<=") }); i += 2; continue; }
    if (two === "**") { push({ t: "op", v: "^" }); i += 2; continue; }
    const ONE: Record<string, Omit<Tok, "sp">> = {
      "+": { t: "op", v: "+" }, "-": { t: "op", v: "-" }, "−": { t: "op", v: "-" }, "–": { t: "op", v: "-" }, "—": { t: "op", v: "-" }, "*": { t: "op", v: "*" }, "×": { t: "op", v: "*" },
      "·": { t: "op", v: "*" }, "⋅": { t: "op", v: "*" }, "/": { t: "op", v: "/" }, "÷": { t: "op", v: "/" }, "∕": { t: "op", v: "/" }, "^": { t: "op", v: "^" },
      "(": { t: "(" }, ")": { t: ")" }, "[": { t: "[" }, "]": { t: "]" }, "{": { t: "{" }, "}": { t: "}" }, "|": { t: "|" }, ",": { t: "," }, ";": { t: ";" }, ":": { t: ":" }, "∶": { t: ":" },
      "<": { t: "cmp", v: "<" }, ">": { t: "cmp", v: ">" }, "≤": { t: "cmp", v: "<=" }, "≥": { t: "cmp", v: ">=" }, "=": { t: "=" }, "π": { t: "pi" }, "∞": { t: "inf" }, "√": { t: "sqrt" }, "∪": { t: "cup" },
    };
    if (ONE[c]) { push(ONE[c]); i++; continue; }
    fail("syntax", `unexpected "${c}"`);
  }
  // an inverse function: tan⁻¹, tan^-1, tan^(-1)
  const merged: Tok[] = [];
  for (let k = 0; k < out.length; k++) {
    const a = out[k];
    if (a.t === "fn" && /^(sin|cos|tan|cot|sec|csc)$/.test(a.v)) {
      const b = out[k + 1], c2 = out[k + 2], d = out[k + 3], e2 = out[k + 4];
      if (b?.t === "sup" && b.v === "-1") { merged.push({ ...a, v: `arc${a.v}`, inv: true }); k += 1; continue; }
      if (b?.t === "op" && b.v === "^" && c2?.t === "op" && c2.v === "-" && d?.t === "num" && d.v === "1") { merged.push({ ...a, v: `arc${a.v}`, inv: true }); k += 3; continue; }
      if (b?.t === "op" && b.v === "^" && c2?.t === "(" && d?.t === "op" && d.v === "-" && e2?.t === "num" && e2.v === "1" && out[k + 5]?.t === ")") { merged.push({ ...a, v: `arc${a.v}`, inv: true }); k += 5; continue; }
    }
    merged.push(a);
  }
  return merged;
}

// ---------------------------------------------------------------------------------------------------------------- expressions
type Node = { k: "num"; v: string } | { k: "var"; v: string } | { k: "pi" } | { k: "e" } | { k: "neg"; a: Node } | { k: "bin"; op: "+" | "-" | "*" | "/" | "^"; a: Node; b: Node }
  | { k: "fn"; f: string; a: Node; pow?: string } | { k: "abs"; a: Node } | { k: "sqrt"; a: Node } | { k: "group"; a: Node };

const show = (n: Node): string => {
  switch (n.k) {
    case "num": return n.v.replace(/\.$/, "");
    case "var": return n.v;
    case "pi": return "pi";
    case "e": return "e";
    case "neg": return `(-${show(n.a)})`;
    case "group": return `(${show(n.a)})`;
    case "abs": return `abs(${show(n.a)})`;
    case "sqrt": return `sqrt(${show(n.a)})`;
    case "fn": return n.pow ? `(${n.f}(${show(n.a)}))^(${n.pow})` : `${n.f}(${show(n.a)})`;
    case "bin": return `(${show(n.a)}${n.op}${show(n.b)})`;
  }
};
const unwrapG = (n: Node): Node => (n.k === "group" ? unwrapG(n.a) : n);
const isSum = (n: Node) => { const u = unwrapG(n); return u.k === "bin" && (u.op === "+" || u.op === "-"); };
/** expanded form (form@1 "expanded"): a sum of terms in which no bracketed sum is multiplied, divided or raised to a power */
export function isExpanded(n: Node): boolean {
  const u = unwrapG(n);
  if (u.k === "bin" && (u.op === "+" || u.op === "-")) return isExpanded(u.a) && isExpanded(u.b);
  if (u.k === "neg") return u.a.k === "group" && isSum(u.a) ? false : isExpanded(u.a);
  const factor = (f: Node): boolean => {
    const v = unwrapG(f);
    if (v.k === "bin" && (v.op === "*" || v.op === "/")) return factor(v.a) && factor(v.b);
    if (v.k === "bin" && v.op === "^") return !isSum(v.a) && factor(v.a);
    if (v.k === "neg") return factor(v.a);
    return !isSum(v);
  };
  return factor(u);
}
/** a compact human form for clarification prompts */
const human = (n: Node): string => show(n).replace(/\*/g, "").replace(/^\((.*)\)$/, "$1");

class ExprParser {
  i = 0;
  vars = new Set<string>();
  constructor(public toks: Tok[], public stopAt: (t: Tok) => boolean = () => false) {}
  peek(o = 0): Tok | undefined { const t = this.toks[this.i + o]; return t && !this.stopAt(t) ? t : undefined; }
  next(): Tok { return this.toks[this.i++]; }
  done() { return this.peek() === undefined; }
  expr(): Node {
    let a = this.unary();
    for (;;) {
      const t = this.peek();
      if (t?.t === "op" && (t.v === "+" || t.v === "-")) { this.next(); if (this.done() || this.endsOperand()) fail("trailing-operator", `"${t.v}" has nothing after it`); a = { k: "bin", op: t.v, a, b: this.term() }; continue; }
      return a;
    }
  }
  endsOperand() { const t = this.peek(); return !t || t.t === ")" || t.t === "]" || t.t === "}" || t.t === "," || t.t === ";" || t.t === "=" || t.t === "cmp" || t.t === "|" && false || (t.t === "op" && t.v !== "-" && t.v !== "+"); }
  unary(): Node {
    const t = this.peek();
    if (t?.t === "op" && (t.v === "-" || t.v === "+")) { this.next(); if (this.done()) fail("trailing-operator", `"${t.v}" has nothing after it`); const x = this.unaryOperand(); return t.v === "-" ? { k: "neg", a: x } : x; }
    return this.term();
  }
  unaryOperand(): Node { const t = this.peek(); if (t?.t === "op" && (t.v === "-" || t.v === "+")) return this.unary(); return this.term(); }
  /** products and quotients, with implicit multiplication; "a / b c" (a quotient followed by a juxtaposed factor) is ambiguous */
  term(): Node {
    let a = this.power();
    let lastDiv: { num: Node; den: Node } | null = null;
    for (;;) {
      const t = this.peek();
      if (t?.t === "op" && (t.v === "*" || t.v === "/")) {
        this.next();
        if (this.done() || this.endsOperand()) fail("trailing-operator", `"${t.v === "*" ? "×" : "/"}" has nothing after it`);
        const b = this.power();
        if (t.v === "/") lastDiv = { num: a, den: b }; else lastDiv = null;
        a = { k: "bin", op: t.v, a, b };
        if (t.v === "/" && b.k === "num" && /^0*\.?0*$/.test(b.v)) fail("division-by-zero", "division by zero");
        continue;
      }
      if (this.startsFactor()) {
        if (t?.t === "num") fail("split-number", "two numbers written side by side");
        if (lastDiv) {
          const save = this.i, g = this.power(); this.i = save;
          throw new Ambiguous([`(${human(lastDiv.num)}/${human(lastDiv.den)})${human(g)}`, `${human(lastDiv.num)}/(${human(lastDiv.den)}${human(g)})`], "a fraction written against a letter or bracket can be read two ways");
        }
        const b = this.power();
        a = { k: "bin", op: "*", a, b };
        continue;
      }
      return a;
    }
  }
  startsFactor() { const t = this.peek(); return !!t && (t.t === "num" || t.t === "var" || t.t === "fn" || t.t === "pi" || t.t === "e" || t.t === "sqrt" || t.t === "(" || (t.t === "|" && this.absOpens())); }
  /** a "|" opens a new absolute value only when an operand is expected; directly after an operand it closes one */
  absDepth = 0;
  absOpens() { return this.absDepth === 0; }
  power(): Node {
    let base = this.postfix();
    const t = this.peek();
    if (t?.t === "op" && t.v === "^") {
      this.next();
      if (this.done()) fail("trailing-operator", `"^" has nothing after it`);
      let exp: Node;
      const s = this.peek();
      if (s?.t === "op" && (s.v === "-" || s.v === "+")) { this.next(); const x = this.atom(); exp = s.v === "-" ? { k: "neg", a: x } : x; }
      else exp = this.atom();
      // "2^3x", "e^2x": an exponent written against a following factor reads as 2^(3x) or (2^3)x. A space ends the exponent
      // ("x^2 cos(x)" is x²·cos(x)), as a superscript does; with no space the learner is asked.
      if (this.startsFactor() && exp.k !== "group" && !this.peek()!.sp) {
        const save = this.i, g = this.postfix(); this.i = save;
        throw new Ambiguous([`(${human(base)}^${human(exp)})${human(g)}`, `${human(base)}^(${human(exp)}${human(g)})`], "a power written against a letter or bracket can be read two ways");
      }
      if (this.peek()?.t === "op" && (this.peek() as { v: string }).v === "^") fail("unsupported-notation", "write repeated powers with brackets, e.g. 2^(3^2)");
      base = { k: "bin", op: "^", a: base, b: exp };
    }
    return base;
  }
  postfix(): Node {
    let a = this.atom();
    const t = this.peek();
    if (t?.t === "sup") { this.next(); a = { k: "bin", op: "^", a, b: { k: "num", v: t.v } }; if (this.peek()?.t === "sup") fail("syntax", "two superscripts"); }
    return a;
  }
  atom(): Node {
    const t = this.peek();
    if (!t) fail("trailing-operator", "something is missing at the end");
    this.next();
    switch (t!.t) {
      case "num": return { k: "num", v: t!.v };
      case "var": if (t!.v.startsWith("#")) return fail("syntax", `"${t!.v.slice(1)}" is not part of a single answer`); this.vars.add(t!.v); return { k: "var", v: t!.v };
      case "pi": return { k: "pi" };
      case "e": return { k: "e" };
      case "(": {
        if (this.peek()?.t === ")") fail("syntax", "empty brackets");
        const x = this.expr();
        if (this.peek()?.t !== ")") fail("unbalanced", "a bracket is not closed");
        this.next();
        return { k: "group", a: x };
      }
      case "|": {
        this.absDepth++;
        const x = this.expr();
        this.absDepth--;
        if (this.peek()?.t !== "|") fail("unbalanced", "an absolute value bar is not closed");
        this.next();
        return { k: "abs", a: x };
      }
      case "sqrt": {
        // √2, √x, √(…); "√2x" reads as √(2x) or (√2)x
        const s = this.peek();
        if (s?.t === "(" || s?.t === "|") return { k: "sqrt", a: this.atom() };
        if (s?.t === "num" || s?.t === "var" || s?.t === "pi") {
          const a = this.atom();
          if (this.peek()?.t === "num") fail("split-number", "two numbers written side by side");
          if (this.startsFactor()) { const save = this.i, g = this.postfix(); this.i = save; throw new Ambiguous([`(√${human(a)})${human(g)}`, `√(${human(a)}${human(g)})`], "a square root written against a letter or bracket can be read two ways"); }
          return { k: "sqrt", a };
        }
        return fail("syntax", "√ needs a number or brackets after it");
      }
      case "fn": {
        const f = t as Extract<Tok, { t: "fn" }>;
        if (f.v === "sqrt" || f.v === "abs" || f.v === "exp") {
          if (this.peek()?.t !== "(") fail("syntax", `${f.v} needs brackets: ${f.v}(…)`);
          const g = this.atom();
          return f.v === "sqrt" ? { k: "sqrt", a: g } : f.v === "abs" ? { k: "abs", a: g } : { k: "bin", op: "^", a: { k: "e" }, b: g };
        }
        let pow: string | undefined;
        if (this.peek()?.t === "sup") { pow = (this.next() as { v: string }).v; if (pow === "-1") fail("syntax", "unexpected ⁻¹"); }
        // cos^3(2x): a power of the function value, written with a caret directly before the bracket
        else if (this.peek()?.t === "op" && (this.peek() as { v: string }).v === "^" && this.peek(1)?.t === "num" && this.peek(2)?.t === "(" && !this.peek(1)!.sp && !this.peek(2)!.sp) { this.next(); pow = (this.next() as { v: string }).v; }
        const s = this.peek();
        if (s?.t === "(" || s?.t === "|") return { k: "fn", f: f.v, a: this.atom(), pow };
        // a bare argument (sin x, log x, cos 3x) only when nothing follows it but the end, "+", "−", ")" or a separator
        if (s?.t === "num" || s?.t === "var" || s?.t === "pi") {
          if (pow) fail("syntax", `write ${f.v}${"²"}(x) with brackets`);
          const save = this.i;
          let arg: Node = this.atom();
          if (s.t === "num" && (this.peek()?.t === "var" || this.peek()?.t === "pi") && !this.peek()!.sp) arg = { k: "bin", op: "*", a: arg, b: this.atom() };
          const n = this.peek();
          const clean = !n || (n.t === "op" && (n.v === "+" || n.v === "-")) || n.t === ")" || n.t === "]" || n.t === "," || n.t === ";" || n.t === "=" || n.t === "cmp" || n.t === "|" || n.t === "}";
          if (!clean) {
            const after = this.toks.slice(this.i).map((x) => ("v" in x ? x.v : x.t === "pi" ? "π" : x.t === "e" ? "e" : x.t === "sqrt" ? "√" : x.t)).join("").slice(0, 12);
            this.i = save;
            throw new Ambiguous([`${f.v}(${human(arg)})${after}`, `${f.v}(${human(arg)}${after})`], `${f.v} without brackets can be read two ways: write ${f.v}(…)`);
          }
          return { k: "fn", f: f.v, a: arg };
        }
        return fail("syntax", `${f.v} needs brackets: ${f.v}(…)`);
      }
      case "op": return fail(t!.v === "-" || t!.v === "+" ? "syntax" : "leading-operator", `"${t!.v}" has nothing before it`);
      case ")": return fail("unbalanced", "a closing bracket has no opening bracket");
      case "sup": return fail("syntax", "a superscript has nothing before it");
      default: return fail("syntax", `unexpected "${t!.t}"`);
    }
  }
}

function parseExpr(toks: Tok[], o: { letters: boolean; stop?: (t: Tok) => boolean }): { node: Node; vars: Set<string> } {
  if (!toks.length) fail("empty", "nothing was written");
  const p = new ExprParser(toks, o.stop);
  if (p.peek()?.t === "op" && ["*", "/", "^"].includes((p.peek() as { v: string }).v)) fail("leading-operator", "the answer starts with an operator");
  const node = p.expr();
  if (p.i < toks.length && !(o.stop && o.stop(toks[p.i]))) {
    const t = toks[p.i];
    if (t.t === ")") fail("unbalanced", "a closing bracket has no opening bracket");
    if (t.t === "num") fail("split-number", "two numbers written side by side");
    fail("syntax", `unexpected "${"v" in t ? t.v : t.t}"`);
  }
  if (!o.letters && p.vars.size) fail("type-mismatch", "letters where a number is expected");
  return { node, vars: p.vars };
}

// ---------------------------------------------------------------------------------------------------------------- numbers
const isZero = (s: string) => /^0*\.?0*$/.test(s);
/** a rational answer: integer, decimal, a/b, or (where permitted) w n/d; digit-grouping commas 1,234,567 / 12,34,567 are accepted */
function parseRational(raw: string, mixed: boolean, n: Notation): string {
  let s = raw.trim().replace(/[−–—]/g, "-");
  if (!s) fail("empty", "nothing was written");
  const g = /^([+-]?)(\d{1,3}(?:,\d{3})+|\d{1,2}(?:,\d{2})+,\d{3})(\.\d+)?$/.exec(s);
  if (g) { n.groupingCommas = true; s = `${g[1]}${g[2].replace(/,/g, "")}${g[3] ?? ""}`; }
  if (/,/.test(s)) fail("syntax", "a comma inside a number (write one number)");
  const toks = tokenize(s);
  const nums = toks.filter((t) => t.t === "num");
  // mixed number w n/d
  if (toks.length >= 4 && toks.length <= 5) {
    const off = toks[0].t === "op" ? 1 : 0;
    const [w, a, sl, b] = toks.slice(off);
    if (w?.t === "num" && a?.t === "num" && a.sp && sl?.t === "op" && sl.v === "/" && b?.t === "num" && toks.length === 4 + off && (off === 0 || ((toks[0] as { v: string }).v === "-" || (toks[0] as { v: string }).v === "+"))) {
      if (!mixed) fail("unsupported-notation", "a mixed number is not accepted for this answer; write it as a fraction or a decimal");
      if (/\./.test(w.v + a.v + b.v) || isZero(b.v)) fail(isZero(b.v) ? "division-by-zero" : "syntax", "a mixed number is a whole number and a fraction, like 2 1/2");
      if (!(Number(a.v) > 0 && Number(a.v) < Number(b.v))) fail("syntax", "the fraction part of a mixed number must be less than 1, like 2 1/2");
      n.mixedNumber = true;
      return `${off && (toks[0] as { v: string }).v === "-" ? "-" : ""}${w.v} ${a.v}/${b.v}`;
    }
  }
  // signed number, optionally over a signed number
  let k = 0;
  const sign = () => { const t = toks[k]; if (t?.t === "op" && (t.v === "-" || t.v === "+")) { k++; return t.v === "-" ? "-" : ""; } return ""; };
  const num = () => { const t = toks[k]; if (t?.t !== "num") return null; k++; return t.v.replace(/\.$/, ""); };
  const s1 = sign(), a = num();
  if (a === null) {
    if (toks.some((t) => t.t === "var" || t.t === "fn")) fail("type-mismatch", "letters where a number is expected");
    fail(toks.length ? "syntax" : "empty", "not a number");
  }
  if (k === toks.length) { if (/\./.test(a!)) n.decimal = true; return `${s1}${a}`; }
  const t = toks[k];
  if (t.t === "num") fail(nums.length === 2 && toks.length === 2 + (s1 ? 1 : 0) ? "split-number" : "split-number", "two numbers written side by side");
  if (t.t === "op" && t.v === "/") {
    k++;
    if (k === toks.length) fail("trailing-operator", `"/" has nothing after it`);
    const s2 = sign(), b = num();
    if (b === null) fail("syntax", "a fraction needs a number below the line");
    if (k !== toks.length) { const r = toks[k]; fail(r.t === "num" ? "split-number" : r.t === "op" ? (k === toks.length - 1 ? "trailing-operator" : "syntax") : "syntax", "not a single number or fraction"); }
    if (isZero(b!)) fail("division-by-zero", "division by zero");
    if (/\./.test(a! + b!)) n.decimal = true;
    n.fraction = true;
    return `${s1}${a}/${s2}${b}`;
  }
  if (t.t === "op" && k === toks.length - 1) fail("trailing-operator", `"${t.v}" has nothing after it`);
  if (toks.some((x) => x.t === "var" || x.t === "fn")) fail("type-mismatch", "letters where a number is expected");
  return fail("syntax", "not a single number or fraction");
}

/** the value of a canonical rational text as a reduced fraction ("40 1/2" -> "81/2", "6/2" -> "3", "-0.75" -> "-3/4"): what every kernel reads */
function rationalValue(c: string): string {
  const m = /^(-?)(\d+) (\d+)\/(\d+)$/.exec(c);
  let v: Q;
  if (m) { const w = BigInt(m[2]), a = BigInt(m[3]), b = BigInt(m[4]); v = q((w * b + a) * (m[1] ? -1n : 1n), b); }
  else { const [a, b = "1"] = c.split("/"); const x = decimalQ(a.replace(/^-/, "")), y = decimalQ(b.replace(/^-/, "")); v = q(x[0] * y[1] * (a.startsWith("-") !== b.startsWith("-") ? -1n : 1n), x[1] * y[0]); }
  return v[1] === 1n ? `${v[0]}` : `${v[0]}/${v[1]}`;
}

// ---------------------------------------------------------------------------------------------------------------- top level
const splitTop = (toks: Tok[], seps: Tok["t"][]): Tok[][] => {
  const out: Tok[][] = [[]];
  let depth = 0, bars = 0;
  for (const t of toks) {
    if (t.t === "(" || t.t === "[" || t.t === "{") depth++;
    if (t.t === ")" || t.t === "]" || t.t === "}") depth--;
    if (t.t === "|") bars ^= 1;
    if (depth === 0 && !bars && seps.includes(t.t)) out.push([]); else out[out.length - 1].push(t);
  }
  return out;
};
const unwrap = (toks: Tok[], open: Tok["t"], close: Tok["t"]): Tok[] | null => {
  if (toks[0]?.t !== open || toks[toks.length - 1]?.t !== close) return null;
  let depth = 0;
  for (let k = 0; k < toks.length; k++) {
    const t = toks[k].t;
    if (t === "(" || t === "[" || t === "{") depth++;
    if (t === ")" || t === "]" || t === "}") depth--;
    if (depth === 0 && k < toks.length - 1) return null;
  }
  return toks.slice(1, -1);
};
const textOf = (toks: Tok[]) => toks.map((t) => (t.sp ? " " : "") + ("v" in t ? t.v : t.t === "pi" ? "π" : t.t === "e" ? "e" : t.t === "sqrt" ? "√" : t.t === "inf" ? "∞" : t.t === "cup" ? "∪" : t.t)).join("").trim();
/** a single exact value (no letters): √, π, fractions, decimals */
const exactValue = (toks: Tok[], n: Notation): string => {
  if (toks.length === 0) fail("empty", "an empty item");
  const x = parseExpr(toks, { letters: false });
  if (/\./.test(textOf(toks))) n.decimal = true;
  n.expanded = n.expanded && isExpanded(x.node);
  const v = exactOf(x.node);
  return v ? printExact(v) : show(x.node);
};

// ---------------------------------------------------------------------------------------------------------------- exact values
// a value of Q(√2, √3, …) + Qπ, as {radicand → coefficient} (radicand 1 is the rational part) and a π coefficient; anything else is null
// (then the ASCII form is passed on and the comparison decides). Printed in the glyph form every reader of stored answers reads.
type Q = [bigint, bigint];
const gcdB = (a: bigint, b: bigint): bigint => { a = a < 0n ? -a : a; b = b < 0n ? -b : b; while (b) [a, b] = [b, a % b]; return a; };
const q = (n: bigint, d = 1n): Q => { if (d === 0n) fail("division-by-zero", "division by zero"); if (d < 0n) { n = -n; d = -d; } const g = gcdB(n, d) || 1n; return [n / g, d / g]; };
const qadd = (a: Q, b: Q) => q(a[0] * b[1] + b[0] * a[1], a[1] * b[1]);
const qmul = (a: Q, b: Q) => q(a[0] * b[0], a[1] * b[1]);
const qzero = (a: Q) => a[0] === 0n;
interface Exact { r: Map<bigint, Q>; pi: Q }
const ex = (r: [bigint, Q][], pi: Q = [0n, 1n]): Exact => ({ r: new Map(r.filter(([, c]) => !qzero(c))), pi });
const decimalQ = (v: string): Q => { const [i, f = ""] = v.replace(/\.$/, "").split("."); return q(BigInt(i || "0") * 10n ** BigInt(f.length) + BigInt(f || "0"), 10n ** BigInt(f.length)); };
const squarefree = (n: bigint): [bigint, bigint] => { let out = 1n, rest = n; for (let p = 2n; p * p <= rest; p++) while (rest % (p * p) === 0n) { rest /= p * p; out *= p; } return [out, rest]; };
const isRational = (e: Exact) => qzero(e.pi) && [...e.r.keys()].every((k) => k === 1n);
const ratOf = (e: Exact): Q => e.r.get(1n) ?? [0n, 1n];
function eadd(a: Exact, b: Exact): Exact { const r = new Map(a.r); for (const [k, c] of b.r) r.set(k, qadd(r.get(k) ?? [0n, 1n], c)); return ex([...r], qadd(a.pi, b.pi)); }
function eneg(a: Exact): Exact { return ex([...a.r].map(([k, c]) => [k, q(-c[0], c[1])]), q(-a.pi[0], a.pi[1])); }
function emul(a: Exact, b: Exact): Exact | null {
  if (!qzero(a.pi) && !qzero(b.pi)) return null;
  if (!qzero(a.pi) || !qzero(b.pi)) { const [p, o] = qzero(a.pi) ? [b, a] : [a, b]; if (!isRational(o) || p.r.size) return null; return ex([], qmul(p.pi, ratOf(o))); }
  const r = new Map<bigint, Q>();
  for (const [k1, c1] of a.r) for (const [k2, c2] of b.r) { const [o, s] = squarefree(k1 * k2); r.set(s, qadd(r.get(s) ?? [0n, 1n], qmul(qmul(c1, c2), [o, 1n]))); }
  return ex([...r]);
}
function einv(a: Exact): Exact | null {
  if (!qzero(a.pi)) return a.r.size ? null : null;
  const terms = [...a.r];
  if (terms.length !== 1) return null; // only a single term is inverted exactly (1/(a+b√n) is left to the comparison)
  const [[k, c]] = terms;
  if (qzero(c)) fail("division-by-zero", "division by zero");
  return ex([[k, q(c[1], c[0] * k)]]); // 1/(c√k) = √k/(c k)
}
function exactOf(n: Node): Exact | null {
  switch (n.k) {
    case "num": return ex([[1n, decimalQ(n.v)]]);
    case "pi": return ex([], [1n, 1n]);
    case "group": return exactOf(n.a);
    case "neg": { const a = exactOf(n.a); return a && eneg(a); }
    case "sqrt": {
      const a = exactOf(n.a);
      if (!a || !isRational(a)) return null;
      const [num, den] = ratOf(a);
      if (num < 0n) fail("syntax", "the square root of a negative number");
      const [o, s] = squarefree(num * den);
      return ex([[s, q(o, den)]]);
    }
    case "bin": {
      const a = exactOf(n.a), b = exactOf(n.b);
      if (!a || !b) return null;
      if (n.op === "+") return eadd(a, b);
      if (n.op === "-") return eadd(a, eneg(b));
      if (n.op === "*") return emul(a, b);
      if (n.op === "/") { const ib = einv(b); return ib && emul(a, ib); }
      if (n.op === "^") {
        if (!isRational(b) || ratOf(b)[1] !== 1n) return null;
        const k = ratOf(b)[0];
        if (k < 0n || k > 12n) return null;
        let out: Exact | null = ex([[1n, [1n, 1n]]]);
        for (let i = 0n; i < k && out; i++) out = emul(out, a);
        return out;
      }
      return null;
    }
    default: return null;
  }
}
function printExact(e: Exact): string {
  const parts: string[] = [];
  const term = (c: Q, tail: string) => {
    const [num, den] = c, neg = num < 0n, a = neg ? -num : num;
    const body = tail ? `${a === 1n ? "" : a}${tail}${den === 1n ? "" : `/${den}`}` : `${a}${den === 1n ? "" : `/${den}`}`;
    parts.push(`${neg ? "-" : parts.length ? "+" : ""}${body}`);
  };
  const rat = e.r.get(1n);
  if (rat) term(rat, "");
  for (const k of [...e.r.keys()].filter((k) => k !== 1n).sort((x, y) => (x < y ? -1 : 1))) term(e.r.get(k)!, `√${k}`);
  if (!qzero(e.pi)) term(e.pi, "π");
  return parts.length ? parts.join("") : "0";
}
const itemValue = (toks: Tok[], sem: Semantics, n: Notation): string => (sem.kind === "solution-set" && sem.mixed ? parseRational(textOf(toks), true, n) : exactValue(toks, n));

function parseList(toks: Tok[], sem: Semantics, n: Notation): string {
  let body = toks;
  const br = unwrap(toks, "{", "}");
  if (br && sem.kind === "tuple") fail("type-mismatch", "braces make a set; an ordered list is written (a, b, c)");
  if (br) { body = br; n.braces = true; }
  const pr = sem.kind === "tuple" ? unwrap(body, "(", ")") ?? unwrap(body, "[", "]") : null;
  if (pr) { body = pr; n.parentheses = true; }
  // "x = 2 or x = 3", "x = 2 and x = 3" (solution sets only)
  let parts = splitTop(body, [",", ";"]);
  if (sem.kind !== "tuple" && parts.length === 1) {
    const words: Tok[][] = [[]];
    for (let k = 0; k < body.length; k++) {
      const a = body[k], b = body[k + 1];
      if (a.t === "var" && (a.v === "#or" || a.v === "#and")) { words.push([]); continue; }
      words[words.length - 1].push(a);
    }
    if (words.length > 1) parts = words;
  }
  if (parts.some((p) => !p.length)) fail("syntax", "an empty item in the list (two commas together, or a comma at the end)");
  const items = parts.map((p) => {
    let q = p;
    if (sem.kind !== "tuple" && q.length > 2 && q[0].t === "var" && q[1].t === "=") { q = q.slice(2); n.equation = true; }
    if (q.some((t) => t.t === "=")) fail("syntax", "an equals sign inside a list item");
    return itemValue(q, sem, n);
  });
  return pr || sem.kind === "tuple" && pr ? `(${items.join(", ")})` : items.join(", ");
}

function parseMatrix(toks: Tok[], n: Notation): string {
  const outer = unwrap(toks, "[", "]") ?? unwrap(toks, "(", ")");
  if (!outer) fail("syntax", "a matrix is written [[a, b], [c, d]]");
  let rows: Tok[][];
  if (outer![0]?.t === "[" || outer![0]?.t === "(") {
    rows = splitTop(outer!, [","]).map((r) => { const u = unwrap(r, "[", "]") ?? unwrap(r, "(", ")"); if (!u) fail("syntax", "each row of a matrix is in brackets: [[a, b], [c, d]]"); return u!; });
  } else if (outer!.some((t) => t.t === ";")) rows = splitTop(outer!, [";"]);
  else return fail("type-mismatch", "a matrix is written row by row: [[a, b], [c, d]] (a single row: [[a, b]])");
  const cells = rows.map((r) => splitTop(r, [","]).map((c) => exactValue(c, n)));
  if (!cells.length || cells.some((r) => r.length !== cells[0].length)) fail("syntax", "every row of a matrix needs the same number of entries");
  return `[${cells.map((r) => `[${r.join(", ")}]`).join(", ")}]`;
}

function parseRealSubset(toks: Tok[], n: Notation): string {
  // pieces joined by ∪ / U / "or"
  const pieces: Tok[][] = [[]];
  let depth = 0;
  for (let k = 0; k < toks.length; k++) {
    const t = toks[k];
    if (t.t === "(" || t.t === "[") depth++;
    if (t.t === ")" || t.t === "]") depth--;
    if (depth === 0 && (t.t === "cup" || (t.t === "var" && (t.v === "U" || t.v === "#or")))) { pieces.push([]); continue; }
    pieces[pieces.length - 1].push(t);
  }
  if (pieces.some((p) => !p.length)) fail("syntax", "an empty part of the answer");
  const bound = (b: Tok[]) => {
    if (b.length === 1 && b[0].t === "inf") return "∞";
    if (b.length === 2 && b[0].t === "op" && b[1].t === "inf") return b[0].v === "-" ? "-∞" : "∞";
    return exactValue(b, n);
  };
  const value = (s: string) => (s === "∞" ? Infinity : s === "-∞" ? -Infinity : evalNum(s));
  const out = pieces.map((p) => {
    const open = p[0].t, close = p[p.length - 1].t;
    if ((open === "(" || open === "[") && (close === ")" || close === "]")) {
      const inner = p.slice(1, -1), parts = splitTop(inner, [","]);
      if (parts.length !== 2 || !parts[0].length || !parts[1].length) fail("syntax", "an interval is written (a, b) or [a, b]");
      const lo = bound(parts[0]), hi = bound(parts[1]);
      if ((lo === "-∞" || lo === "∞") && open === "[" || (hi === "∞" || hi === "-∞") && close === "]") fail("closed-at-infinity", "an interval cannot be closed at ∞");
      const a = value(lo), b = value(hi);
      if (Number.isNaN(a) || Number.isNaN(b)) fail("syntax", "an interval end could not be read");
      if (!(a < b)) fail("empty-interval", "the left end must be smaller than the right end");
      return `${open}${lo}, ${hi}${close}`;
    }
    // inequality: x > a, a < x <= b, a > x
    n.inequality = true;
    const segs: Tok[][] = [[]], ops: string[] = [];
    for (const t of p) { if (t.t === "cmp") { ops.push(t.v); segs.push([]); } else segs[segs.length - 1].push(t); }
    if (p.some((t) => t.t === "=")) fail("syntax", "write ≤ as <= (no space), not < =");
    if (!ops.length) fail("type-mismatch", "not an interval or an inequality");
    if (segs.some((s) => !s.length)) fail("syntax", "an inequality needs something on both sides");
    const isVar = segs.map((s) => s.length === 1 && s[0].t === "var");
    if (isVar.filter(Boolean).length !== 1) fail("syntax", "an inequality needs one letter, like x > 2");
    if (ops.length === 2 && !isVar[1]) fail("syntax", "write a double inequality as a < x < b");
    if (ops.length > 2) fail("syntax", "too many inequality signs");
    const v = (segs[isVar.indexOf(true)][0] as { v: string }).v;
    const shownSegs = segs.map((s, k) => (isVar[k] ? v : exactValue(s, n)));
    if (ops.length === 2) {
      const up = ops.every((o) => o[0] === "<"), down = ops.every((o) => o[0] === ">");
      if (!up && !down) fail("syntax", "a double inequality must point one way, like 1 < x < 5");
      const a = evalNum(shownSegs[0]), b = evalNum(shownSegs[2]);
      if (up ? !(a < b) : !(a > b)) fail("empty-interval", "this inequality has no solutions");
    }
    return shownSegs.map((s, k) => (k ? ` ${ops[k - 1]} ` : "") + s).join("");
  });
  return out.join(" ∪ ");
}
/** numeric value of a canonical exact text (only for ordering interval ends) */
function evalNum(s: string): number {
  const js = s.replace(/sqrt\(/g, "Math.sqrt(").replace(/\bpi\b/g, "Math.PI").replace(/\^/g, "**");
  if (!/^[0-9+\-*/().\sMathsqrPI]*$/.test(js)) return NaN;
  try { return Function(`"use strict"; return (${js});`)() as number; } catch { return NaN; }
}

function parseRatio(toks: Tok[], n: Notation): string {
  const parts = splitTop(toks, [":"]);
  if (parts.length !== 2) fail(parts.length === 1 ? "type-mismatch" : "syntax", "a ratio is written a : b");
  const [a, b] = parts.map((p) => parseRational(textOf(p), false, n));
  if (/^-/.test(a) || /^-/.test(b) || isZero(a.split("/")[0]) || isZero(b.split("/")[0])) fail("syntax", "a ratio has two positive parts");
  return `${a}:${b}`;
}

function parseExpressionAnswer(toks: Tok[], sem: Semantics, n: Notation): string {
  let body = toks;
  // a stated left-hand side: y = …, f(x) = …, f⁻¹(x) = …, dy/dx = …; or an equation "… = 0"
  const eq = toks.findIndex((t) => t.t === "=");
  if (eq >= 0) {
    if (toks.slice(eq + 1).some((t) => t.t === "=")) fail("syntax", "more than one equals sign");
    const lhs = toks.slice(0, eq), rhs = toks.slice(eq + 1);
    const lt = textOf(lhs).replace(/\s/g, "");
    if (/^([a-zA-Z]|[a-z]\([a-z]\)|[a-z]\^-1\([a-z]\)|[a-z]-1\([a-z]\)|dy\/dx)$/.test(lt) || (lhs.length === 5 && lhs[0].t === "var" && lhs[1].t === "sup")) { body = rhs; n.equation = true; }
    else if (rhs.length === 1 && rhs[0].t === "num" && isZero(rhs[0].v)) { body = lhs; n.equation = true; }
    else fail("unsupported-notation", "write just the expression (or y = …)");
  }
  if (!body.length) fail("empty", "nothing after the equals sign");
  // an antiderivative's constant: … + C (or K, c, k)
  if (sem.kind === "antiderivative") {
    const last = body[body.length - 1], op = body[body.length - 2];
    if (last?.t === "var" && /^[CKck]$/.test(last.v) && op?.t === "op" && op.v === "+") { n.constant = true; const x = parseExpr(body.slice(0, -2), { letters: true }).node; n.expanded = isExpanded(x); return `${show(x)}+C`; }
  }
  const x = parseExpr(body, { letters: true }).node;
  n.expanded = isExpanded(x);
  return show(x);
}

/** THE entry point: read one learner response for an answer of these semantics */
export function parseResponse(sem: Semantics, raw: string): ParseResult {
  const n = blankNotation();
  try {
    if (typeof raw !== "string") fail("syntax", "not text");
    if (raw.length > MAX) fail("too-long", "the answer is too long");
    const s = raw.trim();
    if (!s) fail("empty", "nothing was written");
    if (sem.kind === "educator") return { status: "parsed", canonical: raw, value: raw, notation: n };
    if (sem.kind === "choice") {
      const m = /^\(?([A-Za-z])[).]?$/.exec(s);
      if (!m) fail("type-mismatch", "choose one option by its letter");
      const L = m![1].toUpperCase();
      if (L.charCodeAt(0) - 65 >= (sem.options ?? 4)) fail("no-such-option", `there is no option ${L}`);
      return { status: "parsed", canonical: L, value: L, notation: n };
    }
    if (sem.kind === "rational") { const v = sem.variable ? new RegExp(`^${sem.variable}\\s*=\\s*(?!=)`).exec(s) : null; if (v) n.equation = true; const c = parseRational(v ? s.slice(v[0].length) : s, sem.mixed, n); return { status: "parsed", canonical: c, value: rationalValue(c), notation: n }; }
    const toks = tokenize(s);
    if (!toks.length) fail("empty", "nothing was written");
    const last = toks[toks.length - 1];
    if (last.t === "op" && !(sem.kind === "real-subset")) fail("trailing-operator", `"${last.v}" has nothing after it`);
    let canonical: string;
    switch (sem.kind) {
      case "exact-real": canonical = exactValue(toks, n); break;
      case "expression": case "antiderivative": canonical = parseExpressionAnswer(toks, sem, n); break;
      case "solution-set": canonical = parseList(toks, { ...sem, mixed: false }, n); break;
      case "roots": case "tuple": canonical = parseList(toks, sem, n); break;
      case "matrix": canonical = parseMatrix(toks, n); break;
      case "real-subset": canonical = parseRealSubset(toks, n); break;
      case "ratio": canonical = parseRatio(toks, n); break;
      default: canonical = fail("unsupported-notation", "unknown answer kind");
    }
    return { status: "parsed", canonical, value: canonical, notation: n };
  } catch (e) {
    if (e instanceof Invalid) return { status: "invalid", reason: e.reason, detail: e.detail };
    if (e instanceof Ambiguous) return { status: "ambiguous", readings: e.readings, detail: e.detail };
    throw e;
  }
}
