/**
 * Mathematical error identification by single-fault replay: rewrite ONE operation of the previous line the way a known
 * misconception would, evaluate exactly, and see whether it reproduces what the student wrote. Rules are generic
 * (operations, fractions, powers, percent, HCF/LCM, units), never keyed to a problem family. A match is a CANDIDATE
 * explanation with evidence "reproduces the student's line"; it is never a certainty about what the student thought.
 */
import { q, mul as qmul, div as qdiv, eq as qeq } from "../../exact/rational.ts";
import { positions, type Node } from "./ast.ts";
import { evaluate, valEq, Fail, type Val } from "./eval.ts";

export interface ErrorCandidate { id: string; label: string; explanation: string }
const N = (x: bigint | number): Node => ({ t: "num", q: q(BigInt(x)), dec: false, raw: String(x) });
const B = (op: "+" | "-" | "*" | "/" | "^", l: Node, r: Node, paren = true): Node => ({ t: "bin", op, l, r, paren });
const isInt = (n: Node) => n.t === "num" && n.q.d === 1n;
/** numerator and denominator if the node is a whole number or an integer fraction a/b */
const frac = (n: Node): [Node, Node] | null => (n.t === "num" ? [n, N(1)] : n.t === "bin" && n.op === "/" && isInt(n.l) && isInt(n.r) ? [n.l, n.r] : n.t === "mixed" ? null : null);
const base = (n: Node): Node | null => (n.t === "bin" && n.op === "^" ? n.l : null);
const sameLit = (a: Node, b: Node) => a.t === "num" && b.t === "num" && qeq(a.q, b.q);

type Alt = { id: string; ast: Node };
function alts(n: Node): Alt[] {
  const o: Alt[] = [];
  const add = (id: string, ast: Node) => o.push({ id, ast });
  if (n.t === "bin") {
    const { op, l, r } = n; const fl = frac(l), fr = frac(r);
    if (op === "+" || op === "-") {
      const f = op;
      if (fl && fr && (fl[1].t === "num" && fr[1].t === "num")) {
        add("frac-across", B("/", B(f, fl[0], fr[0]), B(f, fl[1], fr[1])));
        add("frac-numerators-only", B("/", B(f, fl[0], fr[0]), fl[1]));
        add("frac-numerators-only", B("/", B(f, fl[0], fr[0]), fr[1]));
        add("frac-denominators-multiplied", B("/", B(f, fl[0], fr[0]), B("*", fl[1], fr[1])));
      }
      if (op === "-") { add("subtract-reversed", B("-", r, l)); if (r.t === "neg") add("double-negative", B("-", l, r.e)); }
      if (op === "+" && r.t === "neg") add("sign-of-negative", B("+", l, r.e));
      for (const o2 of ["+", "-", "*", "/"] as const) if (o2 !== op) add("wrong-operation", B(o2, l, r));
    }
    if (op === "*" || op === "/") {
      for (const o2 of ["+", "-", "*", "/"] as const) if (o2 !== op) add("wrong-operation", B(o2, l, r));
      if (op === "/") add("division-reversed", B("/", r, l));
      if (op === "/" && fl && fr && fl[1].t === "num" && fr[1].t === "num") { add("fraction-divide-no-invert", B("*", l, r)); add("fraction-divide-invert-first", B("*", B("/", fl[1], fl[0]), r)); }
      if (op === "*" && fl && fr && fl[1].t === "num") add("fraction-multiply-cross", B("/", B("*", fl[0], fr[1]), B("*", fl[1], fr[0])));
      // same-base powers: laws of indices misapplied
      const bl = base(l), br = base(r);
      if (bl && br && sameLit(bl, br)) {
        const el = (l as Extract<Node, { t: "bin" }>).r, er = (r as Extract<Node, { t: "bin" }>).r;
        add(op === "*" ? "index-multiply-for-add" : "index-add-for-subtract", B("^", bl, B(op === "*" ? "*" : "+", el, er)));
        if (op === "/") add("index-divide-for-subtract", B("^", bl, B("/", el, er)));
        add("base-multiplied", B("^", B("*", bl, br), B(op === "*" ? "+" : "-", el, er)));
      }
      if (op === "*" && (l.t === "pct" || r.t === "pct")) { const p = (l.t === "pct" ? l : r) as Extract<Node, { t: "pct" }>; const other = l.t === "pct" ? r : l; add("percent-as-whole", B("*", p.e, other)); }
    }
    if (op === "^") {
      add("power-as-multiplication", B("*", l, r));
      add("power-reversed", B("^", r, l));
      if (l.t === "bin" && (l.op === "+" || l.op === "-")) add("power-over-sum", B(l.op, B("^", l.l, r), B("^", l.r, r)));
      if (r.t === "neg") add("negative-exponent-negates", { t: "neg", e: B("^", l, r.e), paren: true });
      if (r.t === "num" && r.q.n === 0n) { add("zero-exponent-is-base", l); add("zero-exponent-is-zero", N(0)); }
      if (l.t === "bin" && l.op === "^") add("power-of-power-add", B("^", l.l, B("+", l.r, r)));
    }
  }
  if (n.t === "neg" && n.e.t === "bin" && n.e.op === "^") add("negative-base-precedence", B("^", { t: "neg", e: n.e.l, paren: true }, n.e.r));
  if (n.t === "bin" && n.op === "^" && n.l.t === "neg") add("negative-base-precedence", { t: "neg", e: B("^", n.l.e, n.r), paren: true });
  if (n.t === "pct") { add("percent-as-whole", n.e); add("percent-decimal-place", B("/", n.e, N(10))); add("percent-decimal-place", B("/", n.e, N(1000))); }
  if (n.t === "call" && n.args.length >= 2) {
    if (n.f === "hcf") { add("hcf-lcm-swap", { ...n, f: "lcm" }); add("hcf-as-product", n.args.reduce((a, b) => B("*", a, b))); }
    if (n.f === "lcm") { add("hcf-lcm-swap", { ...n, f: "hcf" }); add("lcm-as-product", n.args.reduce((a, b) => B("*", a, b))); }
  }
  if (n.t === "ratio" && n.parts.length === 2) { add("ratio-inverted", { ...n, parts: [n.parts[1], n.parts[0]] }); }
  return o;
}
const LABEL: Record<string, [string, string]> = {
  "frac-across": ["added (or subtracted) the tops and the bottoms separately", "Fractions are added by renaming them with a common denominator and then adding only the tops."],
  "frac-numerators-only": ["added the tops but kept one of the bottoms without renaming", "The pieces must be the same size before they are added: rename both fractions first."],
  "frac-denominators-multiplied": ["added the tops and multiplied the bottoms", "The denominator names the size of the piece; it stays the same when pieces of the same size are added."],
  "subtract-reversed": ["subtracted the smaller number from the larger whichever way round", "a − b and b − a are different numbers; the order of the question matters."],
  "double-negative": ["treated subtracting a negative as subtracting a positive", "Subtracting a negative number adds its opposite."],
  "sign-of-negative": ["dropped the sign of a negative number being added", "Adding a negative number moves down, not up."],
  "wrong-operation": ["used a different operation from the one in the line", "Check which operation the line asks for at this step."],
  "division-reversed": ["divided the second number by the first", "a ÷ b is not b ÷ a."],
  "fraction-divide-no-invert": ["multiplied by the second fraction as written instead of its reciprocal", "To divide by a fraction, multiply by its reciprocal."],
  "fraction-divide-invert-first": ["took the reciprocal of the first fraction instead of the second", "Only the divisor (the fraction you divide by) is turned upside down."],
  "fraction-multiply-cross": ["multiplied crosswise", "To multiply fractions, multiply the tops together and the bottoms together."],
  "index-multiply-for-add": ["multiplied the powers instead of adding them (same base, product)", "a^m × a^n = a^(m+n): add the indices."],
  "index-add-for-subtract": ["added the powers instead of subtracting them (same base, quotient)", "a^m ÷ a^n = a^(m−n): subtract the indices."],
  "index-divide-for-subtract": ["divided the powers instead of subtracting them", "a^m ÷ a^n = a^(m−n): subtract the indices."],
  "base-multiplied": ["multiplied the bases as well as combining the indices", "With the same base, only the indices combine: the base stays."],
  "percent-as-whole": ["used the percent number as if it were the whole number (no ÷100)", "p% means p out of 100: p% of x is p/100 × x."],
  "percent-decimal-place": ["misplaced the decimal when changing a percent", "Dividing by 100 moves the decimal point two places."],
  "power-as-multiplication": ["multiplied the base by the exponent", "a^n means a multiplied by itself n times, not a × n."],
  "power-reversed": ["swapped the base and the exponent", "In a^n, a is the repeated factor and n says how many."],
  "power-over-sum": ["applied the power to each term of a sum", "(a + b)^n is not a^n + b^n: the whole sum is multiplied by itself."],
  "negative-exponent-negates": ["treated a negative exponent as a negative number", "a^(−n) is 1/a^n, a positive number when a is positive."],
  "zero-exponent-is-base": ["took a number to the power 0 to be the number itself", "Any non-zero number to the power 0 is 1."],
  "zero-exponent-is-zero": ["took a number to the power 0 to be 0", "Any non-zero number to the power 0 is 1."],
  "power-of-power-add": ["added the indices of a power of a power", "(a^m)^n = a^(m×n): multiply the indices."],
  "negative-base-precedence": ["mixed up (−a)^n and −a^n", "−a^2 means −(a²) but (−a)^2 means (−a) × (−a)."],
  "hcf-lcm-swap": ["gave the HCF where the LCM was asked (or the other way round)", "HCF is the largest number that divides all of them; LCM is the smallest that all of them divide."],
  "hcf-as-product": ["multiplied the numbers instead of finding their HCF", "The HCF divides each number; the product is a common multiple."],
  "lcm-as-product": ["multiplied the numbers instead of finding their LCM", "The product is a common multiple but not always the lowest one."],
  "ratio-inverted": ["wrote the ratio the wrong way round", "The order of the quantities in a ratio matters: a : b is not b : a."],
  "order-of-operations": ["worked left to right ignoring the order of operations", "Powers, then × and ÷, then + and −; brackets first."],
  "units-ignored": ["combined the numbers and ignored their units", "Convert to the same unit before adding or subtracting, and keep the unit in the answer."],
  "sign-error": ["got the right size with the wrong sign", "Check the sign rules for each operation."],
  "inverted-result": ["gave the reciprocal of the answer", "Check which quantity goes on top."],
  "decimal-place": ["placed the decimal point (or a power of ten) wrongly", "Check the place values: the digits are right but the size is out by a power of ten."],
  "unit-conversion-factor": ["used a wrong conversion factor", "Check how many of the smaller unit make one of the larger unit."],
};
export const explainError = (id: string) => LABEL[id] ?? [id, ""];

/** left-to-right evaluation of one +,−,×,÷ chain, ignoring precedence (brackets respected) */
function leftToRight(root: Node): Node {
  const flat = (n: Node, top: boolean): (Node | "+" | "-" | "*" | "/")[] => (n.t === "bin" && n.op !== "^" && (top || !n.paren) ? [...flat(n.l, false), n.op, ...flat(n.r, false)] : [n]);
  const seq = flat(root, true); if (seq.length < 5) return root;
  let acc = seq[0] as Node;
  for (let i = 1; i + 1 < seq.length; i += 2) acc = { t: "bin", op: seq[i] as "+" | "-" | "*" | "/", l: acc, r: seq[i + 1] as Node, paren: true };
  return acc;
}
/** Candidate explanations for why `studentVal` was written after `prev` (whose correct value differs). */
export function explainMismatch(prev: Node, studentVal: Val, studentNode?: Node): ErrorCandidate[] {
  const hits = new Set<string>(); const out: ErrorCandidate[] = [];
  const hit = (id: string) => { if (!hits.has(id)) { hits.add(id); const [label, explanation] = explainError(id); out.push({ id, label, explanation }); } };
  const tryAst = (id: string, ast: Node) => { try { if (valEq(evaluate(ast), studentVal)) hit(id); } catch (e) { if (!(e instanceof Fail)) throw e; } };
  for (const p of positions(prev)) for (const a of alts(p.node)) tryAst(a.id, p.replace(a.ast));
  tryAst("order-of-operations", leftToRight(prev));
  // numerals combined with the units dropped
  const stripped = (n: Node): Node => (n.t === "unit" ? stripped(n.e) : n.t === "bin" ? { ...n, l: stripped(n.l), r: stripped(n.r) } : n.t === "neg" || n.t === "pct" ? { ...n, e: stripped(n.e) } : n);
  if (studentNode) { try { const sv = evaluate(stripped(prev)); const stv = evaluate(stripped(studentNode)); if (valEq(sv, stv) && !valEq(evaluate(prev), studentVal)) hit("units-ignored"); } catch (e) { if (!(e instanceof Fail)) throw e; } }
  // result-level slips
  try {
    const v = evaluate(prev);
    if (v.k === "q" && studentVal.k === "q") {
      const a = v.q, b = studentVal.q;
      if (a.n !== 0n && qeq(qmul(b, q(-1n)), a)) hit("sign-error");
      if (a.n !== 0n && b.n !== 0n && qeq(qdiv(q(1n), a), b)) hit("inverted-result");
      if (a.n !== 0n && b.n !== 0n) { const r = qdiv(b, a); const pow10 = (x: bigint) => { let k = x; if (k < 0n) k = -k; while (k % 10n === 0n) k /= 10n; return k === 1n; }; if ((r.d === 1n && r.n !== 1n && pow10(r.n)) || (r.n === 1n && r.d !== 1n && pow10(r.d))) hit(Object.keys(v.dim).length ? "unit-conversion-factor" : "decimal-place"); }
    }
  } catch { /* the previous line has no value: no result-level explanation */ }
  return out;
}
