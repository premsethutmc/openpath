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

function decimalText(r: Rational): string | null { // terminating decimal, else null
  let d = r.den; while (d % 2 === 0) d /= 2; while (d % 5 === 0) d /= 5;
  if (d !== 1) return null;
  const neg = r.lt(Rational.zero); const a = neg ? r.neg() : r;
  let k = 0, p = 1; while ((a.num * p) % a.den !== 0) { p *= 10; k++; }
  const digits = String((a.num * p) / a.den).padStart(k + 1, "0");
  return (neg ? "-" : "") + digits.slice(0, digits.length - k) + "." + digits.slice(digits.length - k);
}
function numText(r: Rational, decimals: boolean): string {
  if (r.isInteger()) return r.toString();
  return (decimals ? decimalText(r) : null) ?? `${r.num}/${r.den}`;
}

const prec = (e: MathExpr): number =>
  e.kind === "add" || e.kind === "sub" ? 1 : e.kind === "mul" || e.kind === "div" ? 2 :
  e.kind === "neg" ? 3 : e.kind === "pow" ? 4 :
  e.kind === "num" ? (!e.value.isInteger() ? 2 : e.value.lt(Rational.zero) ? 3 : 5) : 5;

export function printExpr(e: MathExpr, decimals = false): string {
  const wrap = (c: MathExpr, need: boolean) => (need ? `(${printExpr(c, decimals)})` : printExpr(c, decimals));
  switch (e.kind) {
    case "num": return numText(e.value, decimals);
    case "var": return e.name;
    case "add": return `${wrap(e.left, prec(e.left) < 1)}+${wrap(e.right, prec(e.right) < 1 || e.right.kind === "neg" || (e.right.kind === "num" && e.right.value.lt(Rational.zero)))}`;
    case "sub": return `${wrap(e.left, prec(e.left) < 1)}-${wrap(e.right, prec(e.right) <= 1 || e.right.kind === "neg" || (e.right.kind === "num" && (e.right.value.lt(Rational.zero) || !e.right.value.isInteger())))}`;
    case "mul": return `${wrap(e.left, prec(e.left) < 2)}*${wrap(e.right, prec(e.right) <= 2)}`;
    case "div": return `${wrap(e.left, prec(e.left) < 2)}/${wrap(e.right, prec(e.right) <= 2)}`;
    case "neg": return `-${wrap(e.operand, prec(e.operand) < 4)}`;
    case "pow": return `${wrap(e.base, prec(e.base) < 5)}^${wrap(e.exp, prec(e.exp) < 5)}`;
    default: throw new Error(`cannot print ${e.kind}`);
  }
}
