// Text <-> MathExpr for the reasoner. Grammar: x, integers/decimals, + - * / ^, brackets, explicit *.
import { Rational, parseRational, Expr, type MathExpr } from "../math-kernel.ts";

export function parseExpr(src: string): MathExpr {
  const s = src.replace(/\s+/g, "");
  let i = 0;
  const peek = () => s[i];
  const fail = (m: string): never => { throw new Error(`parse error at ${i} in "${src}": ${m}`); };
  function sum(): MathExpr {
    let l = prod();
    while (peek() === "+" || peek() === "-") {
      const op = s[i++];
      const r = prod();
      l = op === "+" ? Expr.add(l, r) : Expr.sub(l, r);
    }
    return l;
  }
  function prod(): MathExpr {
    let l = unary();
    while (peek() === "*" || peek() === "/") {
      const op = s[i++];
      const r = unary();
      l = op === "*" ? Expr.mul(l, r) : Expr.div(l, r);
    }
    return l;
  }
  function unary(): MathExpr {
    if (peek() === "-") { i++; return Expr.neg(unary()); }
    return power();
  }
  function power(): MathExpr {
    const b = atom();
    if (peek() === "^") { i++; return Expr.pow(b, unary()); }
    return b;
  }
  function atom(): MathExpr {
    const c = peek();
    if (c === "(") { i++; const e = sum(); if (s[i++] !== ")") fail("expected )"); return e; }
    if (c === "x") { i++; return Expr.var("x"); }
    const m = /^\d+(\.\d+)?/.exec(s.slice(i));
    if (!m) return fail("unexpected token");
    i += m[0].length;
    const r = parseRational(m[0]);
    if (!r) return fail("bad number");
    return Expr.num(r);
  }
  const e = sum();
  if (i !== s.length) fail("trailing input");
  return e;
}

function numText(r: Rational): string {
  if (r.isInteger()) return r.toString();
  return `${r.num}/${r.den}`; // only used for non-integer constants (printed in brackets)
}

const prec = (e: MathExpr): number =>
  e.kind === "add" || e.kind === "sub" ? 1 : e.kind === "mul" || e.kind === "div" ? 2 :
  e.kind === "neg" ? 3 : e.kind === "pow" ? 4 :
  e.kind === "num" ? (!e.value.isInteger() ? 2 : e.value.lt(Rational.zero) ? 3 : 5) : 5;

export function printExpr(e: MathExpr): string {
  const wrap = (c: MathExpr, need: boolean) => (need ? `(${printExpr(c)})` : printExpr(c));
  switch (e.kind) {
    case "num": return numText(e.value);
    case "var": return e.name;
    case "add": return `${wrap(e.left, prec(e.left) < 1)}+${wrap(e.right, prec(e.right) < 1 || (e.right.kind === "num" && e.right.value.lt(Rational.zero)))}`;
    case "sub": return `${wrap(e.left, prec(e.left) < 1)}-${wrap(e.right, prec(e.right) <= 1 || (e.right.kind === "num" && (e.right.value.lt(Rational.zero) || !e.right.value.isInteger())))}`;
    case "mul": return `${wrap(e.left, prec(e.left) < 2)}*${wrap(e.right, prec(e.right) <= 2)}`;
    case "div": return `${wrap(e.left, prec(e.left) < 2)}/${wrap(e.right, prec(e.right) <= 2)}`;
    case "neg": return `-${wrap(e.operand, prec(e.operand) < 4)}`;
    case "pow": return `${wrap(e.base, prec(e.base) < 5)}^${wrap(e.exp, prec(e.exp) < 5)}`;
    default: throw new Error(`cannot print ${e.kind}`);
  }
}
