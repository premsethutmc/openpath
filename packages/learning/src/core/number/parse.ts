/** Reader for exact-number expressions and student notation. Pure syntax: no evaluation, no family knowledge. */
import { q } from "../../exact/rational.ts";
import type { Node } from "./ast.ts";

export class ParseError extends Error {}
type Tok = { k: "num" | "id" | "op" | "("  | ")" | "end"; v: string; sp: boolean };
const GLYPH: Record<string, string> = { "−": "-", "–": "-", "—": "-", "‒": "-", "×": "*", "·": "*", "⋅": "*", "∙": "*", "÷": " / ", "∕": " / ", "⁄": "/", "²": "^2", "³": "^3", "⁰": "^0", "¹": "^1" };
export const UNIT_LIST = ["mm", "cm", "m", "km", "mg", "g", "kg", "ml", "l", "s", "min", "h", "paise", "₹", "rs"];

/** Normalise student notation: glyphs, thousands separators, a lone "x" between numbers as a multiplication sign. */
export function normalise(raw: string): string {
  let t = raw.trim();
  t = t.replace(/[−–—‒×·⋅∙÷∕⁄²³⁰¹]/g, (c) => GLYPH[c] ?? c);
  t = t.replace(/(\d)\s*[xX]\s*(?=[\d(])/g, "$1*");
  t = t.replace(/(?<![\d,])(\d{1,3})((?:,\d{2,3})+)(?!\d)(?!, )/g, (_m, a, b) => a + b.replace(/,/g, ""));
  return t;
}
function lex(s: string): Tok[] {
  const out: Tok[] = []; let i = 0, sp = false;
  while (i < s.length) {
    const c = s[i];
    if (/\s/.test(c)) { sp = true; i++; continue; }
    let m: RegExpMatchArray | null;
    if ((m = s.slice(i).match(/^(\d+(?:\.\d+)?|\.\d+)/))) { out.push({ k: "num", v: m[1], sp }); i += m[1].length; }
    else if ((m = s.slice(i).match(/^[A-Za-z₹]+/))) { out.push({ k: "id", v: m[0].toLowerCase(), sp }); i += m[0].length; }
    else if (c === "(" ) { out.push({ k: "(", v: c, sp }); i++; }
    else if (c === ")") { out.push({ k: ")", v: c, sp }); i++; }
    else if ("+-*/^:=%,".includes(c)) { out.push({ k: "op", v: c, sp }); i++; }
    else throw new ParseError(`unexpected "${c}"`);
    sp = false;
  }
  out.push({ k: "end", v: "", sp });
  return out;
}
const lit = (raw: string): Node => {
  const [a, b = ""] = raw.split(".");
  return { t: "num", q: q(BigInt((a || "0") + b), 10n ** BigInt(b.length)), dec: b.length > 0, raw };
};
export interface Statement { sides: Node[]; hasVar: boolean; ambiguous: boolean }
/** A statement is one side (an expression or ratio) or a chain of sides joined by "=". */
export function parseStatement(raw: string): Statement {
  const toks = lex(normalise(raw).replace(/^=\s*/, "")); let p = 0; let hasVar = false; let ambiguous = false;
  const peek = () => toks[p], next = () => toks[p++];
  const isOp = (v: string) => peek().k === "op" && peek().v === v;
  function side(): Node { const first = expr(); if (!isOp(":")) return first; const parts = [first]; while (isOp(":")) { next(); parts.push(expr()); } return { t: "ratio", parts }; }
  function expr(): Node {
    let l = term();
    while (isOp("+") || isOp("-")) { const op = next().v as "+" | "-"; l = { t: "bin", op, l, r: term() }; }
    return l;
  }
  function term(): Node {
    let l = unary();
    for (;;) {
      if (isOp("*") || isOp("/")) { const op = next().v as "*" | "/"; l = { t: "bin", op, l, r: unary() }; }
      else if (peek().k === "id" && peek().v === "of") { next(); l = { t: "bin", op: "*", l, r: unary() }; }
      else if (peek().k === "(" || (peek().k === "id" && peek().v === "x")) {                // 2(3+4), 4x
        if (l.t === "bin" && l.op === "/" && !l.paren) ambiguous = true;                      // 6 ÷ 2(1+2): conventions differ
        l = { t: "bin", op: "*", l, r: unary() };
      }
      else return l;
    }
  }
  function unary(): Node {
    if (isOp("-")) { next(); return { t: "neg", e: unary() }; }
    if (isOp("+")) { next(); return unary(); }
    return pow();
  }
  function pow(): Node {
    const b = postfix();
    if (isOp("^")) { next(); const e = isOp("-") ? (next(), { t: "neg", e: postfix() } as Node) : postfix(); return { t: "bin", op: "^", l: b, r: pow2(e) }; }
    return b;
  }
  function pow2(e: Node): Node { if (isOp("^")) { next(); return { t: "bin", op: "^", l: e, r: pow2(postfix()) }; } return e; }
  function postfix(): Node {
    let a = atom();
    // a fraction written tightly ("3/4", no spaces, whole numbers) is one number: 3/4 ÷ 1/2 means (3/4) ÷ (1/2)
    if (a.t === "num" && !a.dec && isOp("/") && !peek().sp && toks[p + 1]?.k === "num" && !toks[p + 1].sp && !/\./.test(toks[p + 1].v)) { next(); a = { t: "bin", op: "/", l: a, r: lit(next().v), paren: true }; }
    if (isOp("%")) { next(); a = { t: "pct", e: a }; }
    if (peek().k === "id" && UNIT_LIST.includes(peek().v)) { const u = next().v; a = { t: "unit", e: a, u: u === "rs" ? "₹" : u }; }
    return a;
  }
  function atom(): Node {
    const t = next();
    if (t.k === "num") {
      const n = lit(t.v);
      // mixed number: "2 1/3" (a space, then an integer fraction)
      if (!n.dec && peek().k === "num" && peek().sp && toks[p + 1]?.k === "op" && toks[p + 1].v === "/" && toks[p + 2]?.k === "num") {
        const num = next(); next(); const den = next();
        return { t: "mixed", w: n, f: { t: "bin", op: "/", l: lit(num.v), r: lit(den.v) } };
      }
      return n;
    }
    if (t.k === "(") { const e = side(); if (peek().k !== ")") throw new ParseError("missing )"); next(); return e.t === "bin" || e.t === "neg" ? { ...e, paren: true } : e; }
    if (t.k === "id") {
      if (t.v === "x") { hasVar = true; return { t: "var" }; }
      if (t.v === "₹" || t.v === "rs") { const a = atom(); return { t: "unit", e: a, u: "₹" }; }
      const f = t.v === "gcd" ? "hcf" : t.v;
      if ((f === "hcf" || f === "lcm" || f === "sqrt") && peek().k === "(") {
        next(); const args: Node[] = [expr()]; while (isOp(",")) { next(); args.push(expr()); }
        if (peek().k !== ")") throw new ParseError("missing )"); next(); return { t: "call", f, args };
      }
    }
    throw new ParseError(`unexpected "${t.v}"`);
  }
  const sides: Node[] = [side()];
  while (isOp("=")) { next(); sides.push(side()); }
  if (peek().k !== "end") throw new ParseError(`unexpected "${peek().v}"`);
  return { sides, hasVar, ambiguous };
}
