/**
 * general-solver@1: any typed calculation, or one-letter linear equation, worked exactly and one move at a time.
 *
 * This is NOT a lesson and not evidence about a learner: it is a calculator that shows its working. The working is
 * produced by rule from the typed line (exact fractions throughout, never floating point), and `solve` checks its own
 * output before returning it: every line of an arithmetic working must have the value of the line typed, and an equation's
 * answer must satisfy the equation as typed. A working that fails its own check is refused, never shown.
 *
 * Read: whole numbers, decimals, fractions (3/4), mixed numbers (2 1/3), + − × ÷, brackets, whole-number powers (2^5, 3²),
 * percentages (15% of 200, 40%), and linear equations in one letter (2x + 1 = 7, 3(x − 2) = x + 4, x/3 = 5).
 * Not read: words (a word problem), more than one letter, a letter multiplied by itself, anything longer than 120 characters.
 */

// ------------------------------------------------------------------ exact numbers
export interface Q { n: bigint; d: bigint }
const gcd = (a: bigint, b: bigint): bigint => { a = a < 0n ? -a : a; b = b < 0n ? -b : b; while (b) [a, b] = [b, a % b]; return a; };
const q = (n: bigint, d: bigint = 1n): Q => { if (d === 0n) throw new Refuse("That divides by zero, which has no answer."); if (d < 0n) [n, d] = [-n, -d]; const g = gcd(n, d) || 1n; return { n: n / g, d: d / g }; };
const add = (a: Q, b: Q) => q(a.n * b.d + b.n * a.d, a.d * b.d);
const sub = (a: Q, b: Q) => q(a.n * b.d - b.n * a.d, a.d * b.d);
const mul = (a: Q, b: Q) => q(a.n * b.n, a.d * b.d);
const div = (a: Q, b: Q) => q(a.n * b.d, a.d * b.n);
const eq = (a: Q, b: Q) => a.n === b.n && a.d === b.d;
const isInt = (a: Q) => a.d === 1n;
const ZERO = q(0n), ONE = q(1n);
/** a fraction whose decimal ends (denominator 2^a·5^b), within 9 places */
function decimalOf(a: Q): string | null {
  let d = a.d, places = 0;
  while (d % 10n === 0n) (d /= 10n), places++;
  let twos = 0, fives = 0;
  while (d % 2n === 0n) (d /= 2n), twos++;
  while (d % 5n === 0n) (d /= 5n), fives++;
  if (d !== 1n) return null;
  places += Math.max(twos, fives);
  if (places > 9) return null;
  const scaled = (a.n * 10n ** BigInt(places)) / a.d;
  const neg = scaled < 0n;
  const digits = (neg ? -scaled : scaled).toString().padStart(places + 1, "0");
  return (neg ? "−" : "") + (places ? `${digits.slice(0, -places)}.${digits.slice(-places)}` : digits);
}
const big = (n: bigint) => (n < 0n ? "−" + (-n).toString() : n.toString());
const fracText = (a: Q) => (isInt(a) ? big(a.n) : `${big(a.n)}/${a.d}`);
const mixedText = (a: Q): string | null => {
  const n = a.n < 0n ? -a.n : a.n;
  if (isInt(a) || n < a.d) return null;
  return `${a.n < 0n ? "−" : ""}${n / a.d} ${n % a.d}/${a.d}`;
};

// ------------------------------------------------------------------ the typed line → a tree
type Style = "int" | "dec" | "frac";
type Node =
  | { t: "num"; v: Q; style: Style; raw?: string }
  | { t: "var" }
  | { t: "neg"; e: Node }
  | { t: "bin"; op: "+" | "-" | "*" | "/" | "^" | "of"; l: Node; r: Node }
  | { t: "pct"; e: Node };
class Refuse extends Error {}

const WORDS = /\b(?:solve|simplify|evaluate|calculate|compute|find|work\s+out|what\s+is|what's|the\s+value\s+of|answer|for)\b/g;
const SUPER: Record<string, string> = { "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4", "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9" };
const VULGAR: Record<string, string> = { "½": "1/2", "⅓": "1/3", "⅔": "2/3", "¼": "1/4", "¾": "3/4", "⅕": "1/5", "⅖": "2/5", "⅗": "3/5", "⅘": "4/5", "⅙": "1/6", "⅚": "5/6", "⅛": "1/8", "⅜": "3/8", "⅝": "5/8", "⅞": "7/8" };

type Tok = { k: "num"; v: Q; style: Style; raw: string } | { k: "op"; v: string } | { k: "var" };

function tokens(text: string, letter: string | null): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  const s = text;
  while (i < s.length) {
    const c = s[i];
    if (c === " ") { i++; continue; }
    const m = /^\d+(?:\.\d+)?|^\.\d+/.exec(s.slice(i));
    if (m) {
      const raw = m[0];
      if (raw.replace(".", "").length > 15) throw new Refuse("That number is too long to work with here.");
      i += raw.length;
      // a mixed number: "2 1/3" (a whole number, a space, a proper fraction)
      const mixed = /^ +(\d+)\/(\d+)(?![\d.])/.exec(s.slice(i));
      if (mixed && !raw.includes(".") && BigInt(mixed[2]) !== 0n && BigInt(mixed[1]) < BigInt(mixed[2])) {
        i += mixed[0].length;
        out.push({ k: "num", v: add(q(BigInt(raw)), q(BigInt(mixed[1]), BigInt(mixed[2]))), style: "frac", raw: `${raw} ${mixed[1]}/${mixed[2]}` });
        continue;
      }
      // a fraction written tight: "3/4" (two whole numbers and a slash, no spaces)
      const frac = !raw.includes(".") && /^\/(\d+)(?![\d.])/.exec(s.slice(i));
      const before = out.at(-1);
      if (frac && !(before?.k === "op" && before.v === "^")) {
        if (BigInt(frac[1]) === 0n) throw new Refuse("A fraction cannot have 0 underneath.");
        i += frac[0].length;
        out.push({ k: "num", v: q(BigInt(raw), BigInt(frac[1])), style: "frac", raw: `${raw}/${frac[1]}` });
        continue;
      }
      const [w, f = ""] = raw.split(".");
      out.push({ k: "num", v: q(BigInt((w || "0") + f), 10n ** BigInt(f.length)), style: f ? "dec" : "int", raw });
      continue;
    }
    if (s.startsWith("of", i) && !/[a-z]/.test(s[i + 2] ?? "")) { out.push({ k: "op", v: "of" }); i += 2; continue; }
    if ("+-*/^()%=".includes(c)) { out.push({ k: "op", v: c }); i++; continue; }
    if (letter && c === letter) { out.push({ k: "var" }); i++; continue; }
    throw new Refuse(/[a-z]/.test(c) ? WORD_REASON : `OpenPath does not know the sign “${c}” in a calculation.`);
  }
  return out;
}
const WORD_REASON = "This looks like a word problem, or uses words OpenPath does not read. Type just the calculation or equation (for example 36 ÷ 4, or 2x + 1 = 7).";

function parse(toks: Tok[]): Node {
  let i = 0;
  const peek = () => toks[i];
  const isOp = (v: string) => { const t = toks[i]; return t?.k === "op" && t.v === v; };
  const startsValue = () => { const t = toks[i]; return !!t && (t.k !== "op" || t.v === "("); };
  function sum(): Node {
    let l = product();
    while (isOp("+") || isOp("-")) { const op = (toks[i++] as { v: "+" | "-" }).v; l = { t: "bin", op, l, r: product() }; }
    return l;
  }
  function product(): Node {
    let l = unary();
    for (;;) {
      if (isOp("*") || isOp("/")) { const op = (toks[i++] as { v: "*" | "/" }).v; l = { t: "bin", op, l, r: unary() }; }
      else if (isOp("of")) { i++; l = { t: "bin", op: "of", l, r: unary() }; }
      // 2x, 3(x + 1), (a)(b): written side by side means multiplied (never two plain numbers side by side)
      else if (startsValue() && !(peek().k === "num" && last(l).t === "num")) l = { t: "bin", op: "*", l, r: power() };
      else return l;
    }
  }
  const last = (n: Node): Node => (n.t === "bin" ? last(n.r) : n);
  function unary(): Node {
    if (isOp("-")) { i++; const e = unary(); return e.t === "num" && e.v.n >= 0n ? { ...e, v: q(-e.v.n, e.v.d), raw: undefined } : { t: "neg", e }; }
    if (isOp("+")) { i++; return unary(); }
    return power();
  }
  function power(): Node {
    let base = atom();
    if (isOp("^")) { i++; const e = unary(); base = { t: "bin", op: "^", l: base, r: e }; }
    return base;
  }
  function atom(): Node {
    const t = toks[i];
    if (!t) throw new Refuse("The calculation stops before it is finished.");
    let n: Node;
    if (t.k === "num") { i++; n = { t: "num", v: t.v, style: t.style, raw: t.raw }; }
    else if (t.k === "var") { i++; n = { t: "var" }; }
    else if (t.v === "(") { i++; n = sum(); if (!isOp(")")) throw new Refuse("A bracket is opened but not closed."); i++; }
    else throw new Refuse("OpenPath could not read that as a calculation. Check the signs and brackets.");
    while (isOp("%")) { i++; n = { t: "pct", e: n }; }
    return n;
  }
  const tree = sum();
  if (i < toks.length) throw new Refuse(isOp(")") ? "A bracket is closed but was never opened." : "OpenPath could not read that as a calculation. Check the signs and brackets.");
  return tree;
}

// ------------------------------------------------------------------ printing
const PREC: Record<string, number> = { "+": 1, "-": 1, "*": 2, "/": 2, of: 2, "^": 4 };
const SIGN: Record<string, string> = { "+": " + ", "-": " − ", "*": " × ", "/": " ÷ ", of: " of ", "^": "^" };
function numText(n: Extract<Node, { t: "num" }>): string {
  if (n.raw !== undefined) return n.raw;
  if (n.style === "dec") return decimalOf(n.v) ?? fracText(n.v);
  return fracText(n.v);
}
function show(n: Node, letter = "x", parent = 0, right = false): string {
  switch (n.t) {
    case "num": {
      const s = numText(n);
      // a negative number, or a fraction beside × ÷ ^, is bracketed so the line reads one way only
      return (n.v.n < 0n && (right || parent >= 4)) || (!isInt(n.v) && n.style === "frac" && parent >= 4) ? `(${s})` : s;
    }
    case "var": return letter;
    case "pct": return `${show(n.e, letter, 5)}%`;
    case "neg": { const s = `−${show(n.e, letter, 3)}`; return right || parent >= 4 ? `(${s})` : s; }
    case "bin": {
      const p = PREC[n.op];
      // 2x and 3(x + 1) stay written side by side
      const juxta = n.op === "*" && n.l.t === "num" && n.l.v.n >= 0n && isInt(n.l.v) && (n.r.t === "var" || (n.r.t === "bin" && PREC[n.r.op] === 1 && hasVar(n.r)));
      const s = juxta ? `${show(n.l, letter, p)}${show(n.r, letter, 3)}` : `${show(n.l, letter, p)}${n.op === "of" && n.l.t !== "pct" ? SIGN["*"] : SIGN[n.op]}${show(n.r, letter, p, true)}`;
      return p < parent || (p === parent && (right || n.op === "^")) ? `(${s})` : s;
    }
  }
}
const hasVar = (n: Node): boolean => n.t === "var" || (n.t === "neg" && hasVar(n.e)) || (n.t === "pct" && hasVar(n.e)) || (n.t === "bin" && (hasVar(n.l) || hasVar(n.r)));

// ------------------------------------------------------------------ arithmetic, one move at a time
export interface WorkedStep { expression: string; explanation: string }
const num = (v: Q, style: Style): Extract<Node, { t: "num" }> => ({ t: "num", v, style: isInt(v) ? "int" : style === "dec" && decimalOf(v) !== null ? "dec" : "frac" });
const styleOf = (a: Extract<Node, { t: "num" }>, b: Extract<Node, { t: "num" }>): Style => (a.style === "frac" || b.style === "frac" ? "frac" : a.style === "dec" || b.style === "dec" ? "dec" : "int");
const lcm = (a: bigint, b: bigint) => (a / gcd(a, b)) * b;
const plain = (n: Extract<Node, { t: "num" }>) => numText({ ...n, raw: undefined });
const wrap = (n: Extract<Node, { t: "num" }>) => (n.v.n < 0n ? `(${plain(n)})` : plain(n));

const MIXED = /^\d+ \d+\/\d+$/;
/** "Write 2 1/3 as 7/3." for an operand typed as a mixed number */
const improper = (...ns: Extract<Node, { t: "num" }>[]) => ns.filter((n) => n.raw !== undefined && MIXED.test(n.raw)).map((n) => `Write ${n.raw} as ${fracText(n.v)}. `).join("");
const places = (n: bigint): bigint[] => [...n.toString()].map((d, i, all) => BigInt(d) * 10n ** BigInt(all.length - 1 - i)).filter((v) => v !== 0n);
/** The working for two positive whole numbers, when there is more to say than the fact itself. */
function wholeWorking(op: string, x: bigint, y: bigint): string | null {
  if (x <= 0n || y <= 0n) return null;
  if (op === "*") {
    if (x < 10n || y < 10n || (x < y ? x : y) > 9999n) return null;
    const [a, b] = x >= y ? [x, y] : [y, x];
    const parts = places(b);
    if (parts.length < 2) return `${a} × ${b}: first ${a} × ${b.toString()[0]} = ${a * BigInt(b.toString()[0])}, then put back the ${b.toString().length - 1 === 1 ? "zero" : "zeros"}: ${a * b}.`;
    return `Split ${b} into ${parts.join(" + ")}: ${parts.map((v) => `${a} × ${v} = ${a * v}`).join(", ")}. Add them: ${parts.map((v) => a * v).join(" + ")} = ${a * b}.`;
  }
  if (op === "+" || op === "-") {
    const parts = places(y);
    if (y < 10n || parts.length < 2 || (op === "-" && y > x)) return null;
    let at = x;
    const moves = parts.map((v) => { const from = at; at = op === "+" ? at + v : at - v; return `${from} ${op === "+" ? "+" : "−"} ${v} = ${at}`; });
    return `Take ${y} one place at a time: ${moves.join(", then ")}.`;
  }
  if (op === "/" && x % y === 0n && (x >= 100n || y >= 10n)) return `${x} ÷ ${y} = ${x / y}, because ${y} × ${x / y} = ${x}.`;
  return null;
}

/** One operation on two numbers: the result and the sentence that says why. */
function operate(op: string, a: Extract<Node, { t: "num" }>, b: Extract<Node, { t: "num" }>): { value: Extract<Node, { t: "num" }>; why: string } {
  const style = styleOf(a, b);
  const A = wrap(a), B = wrap(b);
  if (op === "+" || op === "-") {
    const v = op === "+" ? add(a.v, b.v) : sub(a.v, b.v);
    const out = num(v, style);
    const sign = op === "+" ? "+" : "−";
    if (style === "frac" && (!isInt(a.v) || !isInt(b.v))) {
      const l = lcm(a.v.d, b.v.d);
      const [x, y] = [a.v.n * (l / a.v.d), b.v.n * (l / b.v.d)];
      const raw = op === "+" ? x + y : x - y;
      const same = a.v.d === b.v.d;
      const renamed = same ? `The bottoms are the same (${l}), so work with the tops: ${big(x)} ${sign} ${y < 0n ? `(${big(y)})` : big(y)} = ${big(raw)}, giving ${big(raw)}/${l}.` : `Use the common bottom ${l}: ${plain(a)} = ${big(x)}/${l} and ${plain(b)} = ${big(y)}/${l}. Then ${big(x)} ${sign} ${y < 0n ? `(${big(y)})` : big(y)} = ${big(raw)}, giving ${big(raw)}/${l}.`;
      const simpler = gcd(raw, l) !== 1n && raw !== 0n ? ` In lowest terms that is ${plain(out)}.` : raw === 0n ? " That is 0." : "";
      return { value: out, why: improper(a, b) + renamed + simpler };
    }
    return { value: out, why: (style === "int" && wholeWorking(op, a.v.n, b.v.n)) || `${A} ${sign} ${B} = ${plain(out)}.` };
  }
  if (op === "*" || op === "of") {
    const out = num(mul(a.v, b.v), style);
    if (style === "frac" && (!isInt(a.v) || !isInt(b.v))) {
      const raw = `${big(a.v.n * b.v.n)}/${a.v.d * b.v.d}`;
      return { value: out, why: `${improper(a, b)}Multiply the tops and multiply the bottoms: ${big(a.v.n)} × ${b.v.n < 0n ? `(${big(b.v.n)})` : big(b.v.n)} = ${big(a.v.n * b.v.n)} and ${a.v.d} × ${b.v.d} = ${a.v.d * b.v.d}, giving ${raw}.${raw !== plain(out) ? ` In lowest terms that is ${plain(out)}.` : ""}` };
    }
    return { value: out, why: (style === "int" && wholeWorking("*", a.v.n, b.v.n)) || `${A} × ${B} = ${plain(out)}.` };
  }
  if (op === "/") {
    if (b.v.n === 0n) throw new Refuse("That divides by zero, which has no answer.");
    const v = div(a.v, b.v);
    if (style === "frac" && (!isInt(a.v) || !isInt(b.v))) {
      const out = num(v, "frac");
      const flip = q(b.v.d, b.v.n);
      return { value: out, why: `${improper(a, b)}Dividing by ${plain(b)} is the same as multiplying by ${fracText(flip)}: ${A} × ${flip.n < 0n ? `(${fracText(flip)})` : fracText(flip)} = ${plain(out)}.` };
    }
    if (style === "int" && !isInt(v)) {
      // whole numbers that do not divide exactly: the quotient and remainder, then the exact answer
      const out = num(v, decimalOf(v) !== null && decimalOf(v)!.replace(/^.*\./, "").length <= 3 ? "dec" : "frac");
      const [x, y] = [a.v.n, b.v.n];
      const rem = x >= 0n && y > 0n ? ` ${y} goes into ${x} ${x / y} time${x / y === 1n ? "" : "s"} with ${x % y} left over, so the exact answer is ${mixedText(v) ?? fracText(v)}${decimalOf(v) ? ` = ${decimalOf(v)}` : ""}.` : "";
      return { value: out, why: `${A} ÷ ${B} does not come out whole.${rem || ` It is ${plain(out)}.`}` };
    }
    const out = num(v, style);
    return { value: out, why: (style === "int" && wholeWorking("/", a.v.n, b.v.n)) || `${A} ÷ ${B} = ${plain(out)}.` };
  }
  // a whole-number power
  if (!isInt(b.v) || b.v.n < 0n || b.v.n > 12n) throw new Refuse("OpenPath works out powers only when the power is a whole number from 0 to 12.");
  let v = ONE;
  for (let k = 0n; k < b.v.n; k++) v = mul(v, a.v);
  if (v.n.toString().length > 18 || v.d.toString().length > 18) throw new Refuse("That power is too large to work with here.");
  const out = num(v, a.style);
  const times = b.v.n >= 2n && b.v.n <= 5n ? `${Array.from({ length: Number(b.v.n) }, () => A).join(" × ")} = ${plain(out)}` : `${A} multiplied by itself ${b.v.n} times is ${plain(out)}`;
  return { value: out, why: b.v.n === 0n ? `Anything to the power 0 is 1.` : b.v.n === 1n ? `${A} to the power 1 is ${plain(out)}.` : `${times}.` };
}

/** The next single move, by the usual order: inside brackets first, powers, then × and ÷, then + and −, left to right. */
function reduce(n: Node): { next: Node; why: string } | null {
  switch (n.t) {
    case "num": case "var": return null;
    case "neg": {
      const inner = reduce(n.e);
      if (inner) return { next: { t: "neg", e: inner.next }, why: inner.why };
      if (n.e.t !== "num") return null;
      const v = num(q(-n.e.v.n, n.e.v.d), n.e.style);
      return { next: v, why: `The opposite of ${wrap(n.e)} is ${plain(v)}.` };
    }
    case "pct": {
      const inner = reduce(n.e);
      if (inner) return { next: { t: "pct", e: inner.next }, why: inner.why };
      if (n.e.t !== "num") return null;
      const v = num(div(n.e.v, q(100n)), n.e.style === "frac" ? "frac" : "dec");
      return { next: v, why: `${plain(n.e)}% means ${plain(n.e)} out of 100, which is ${plain(v)}.` };
    }
    case "bin": {
      const l = reduce(n.l);
      if (l) return { next: { ...n, l: l.next }, why: l.why };
      const r = reduce(n.r);
      if (r) return { next: { ...n, r: r.next }, why: r.why };
      if (n.l.t !== "num" || n.r.t !== "num") return null;
      const { value, why } = operate(n.op, n.l, n.r);
      return { next: value, why };
    }
  }
}
function valueOf(n: Node): Q {
  switch (n.t) {
    case "num": return n.v;
    case "var": throw new Refuse("There is a letter where a number is needed.");
    case "neg": return sub(ZERO, valueOf(n.e));
    case "pct": return div(valueOf(n.e), q(100n));
    case "bin": {
      const [a, b] = [valueOf(n.l), valueOf(n.r)];
      if (n.op === "+") return add(a, b);
      if (n.op === "-") return sub(a, b);
      if (n.op === "*" || n.op === "of") return mul(a, b);
      if (n.op === "/") return div(a, b);
      if (!isInt(b) || b.n < 0n || b.n > 12n) throw new Refuse("OpenPath works out powers only when the power is a whole number from 0 to 12.");
      let v = ONE;
      for (let k = 0n; k < b.n; k++) v = mul(v, a);
      return v;
    }
  }
}

// ------------------------------------------------------------------ a linear equation
interface Lin { a: Q; b: Q } // a·x + b
function linear(n: Node): Lin {
  switch (n.t) {
    case "num": return { a: ZERO, b: n.v };
    case "var": return { a: ONE, b: ZERO };
    case "neg": { const e = linear(n.e); return { a: sub(ZERO, e.a), b: sub(ZERO, e.b) }; }
    case "pct": { const e = linear(n.e); return { a: div(e.a, q(100n)), b: div(e.b, q(100n)) }; }
    case "bin": {
      const [l, r] = [linear(n.l), linear(n.r)];
      if (n.op === "+") return { a: add(l.a, r.a), b: add(l.b, r.b) };
      if (n.op === "-") return { a: sub(l.a, r.a), b: sub(l.b, r.b) };
      if (n.op === "*" || n.op === "of") {
        if (l.a.n !== 0n && r.a.n !== 0n) throw new Refuse(NOT_LINEAR);
        return l.a.n === 0n ? { a: mul(l.b, r.a), b: mul(l.b, r.b) } : { a: mul(l.a, r.b), b: mul(l.b, r.b) };
      }
      if (n.op === "/") {
        if (r.a.n !== 0n) throw new Refuse(NOT_LINEAR);
        if (r.b.n === 0n) throw new Refuse("That divides by zero, which has no answer.");
        return { a: div(l.a, r.b), b: div(l.b, r.b) };
      }
      if (l.a.n !== 0n || r.a.n !== 0n) throw new Refuse(NOT_LINEAR);
      return { a: ZERO, b: valueOf(n) };
    }
  }
}
const NOT_LINEAR = "OpenPath solves equations where the letter is only added, subtracted, or multiplied and divided by numbers (like 2x + 1 = 7). This one has the letter squared, multiplied by itself, or underneath a division.";
const coef = (a: Q) => (isInt(a) ? big(a.n) : `(${fracText(a)})`);
function linText({ a, b }: Lin, x: string): string {
  if (a.n === 0n) return fracText(b);
  const top = a.n === 1n ? x : a.n === -1n ? `−${x}` : `${big(a.n)}${x}`;
  const head = isInt(a) ? top : `${top}/${a.d}`;
  return b.n === 0n ? head : `${head} ${b.n < 0n ? "−" : "+"} ${fracText(q(b.n < 0n ? -b.n : b.n, b.d))}`;
}
const absText = (a: Q) => fracText(q(a.n < 0n ? -a.n : a.n, a.d));

// ------------------------------------------------------------------ the whole thing
export type Solved =
  | { ok: true; kind: "arithmetic" | "equation"; problem: string; steps: WorkedStep[]; answer: string; also: string[]; value: Q | null; letter?: string }
  | { ok: false; reason: string };

function clean(text: string): { text: string; letter: string | null } {
  let s = text.toLowerCase().replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]+/g, (m) => "^" + [...m].map((c) => SUPER[c]).join("")).replace(/(\d)?([½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞])/g, (_, w, f) => (w ? `${w} ${VULGAR[f]}` : VULGAR[f]));
  // "Solve for x: 2x + 1 = 7": the words before the colon only ask
  s = s.replace(/^[a-z ]+:\s*/, "");
  s = s.replace(/[×·•∙⋅]/g, "*").replace(/[÷:]/g, "/").replace(/[−–—]/g, "-").replace(/[\[{]/g, "(").replace(/[\]}]/g, ")").replace(/(\d),(?=\d{3}\b)/g, "$1").replace(/\*\*/g, "^");
  s = s.replace(WORDS, " ").replace(/per\s?cent/g, "%").replace(/[?.!,;]+\s*$/g, "").replace(/\s+/g, " ").trim();
  // "36 ÷ 4 =" and "36 ÷ 4 = ?" ask for the value
  s = s.replace(/\s*=\s*\??\s*$/, "").replace(/\?+$/, "").trim();
  const equation = s.includes("=");
  // without an equals sign, "23 x 14" is a multiplication
  if (!equation) s = s.replace(/([\d)])\s*x\s*(?=[\d(])/g, "$1 * ");
  const letters = [...new Set(s.replace(/\bof\b/g, " ").match(/[a-z]/g) ?? [])];
  if (/[a-z]{2,}/.test(s.replace(/\bof\b/g, " "))) throw new Refuse(WORD_REASON);
  if (letters.length > 1) throw new Refuse("OpenPath solves equations with one letter only.");
  if (letters.length === 1 && !equation) throw new Refuse(`There is a letter (${letters[0]}) but no equals sign, so there is nothing to work out. Type the whole equation, like 2${letters[0]} + 1 = 7.`);
  return { text: s, letter: letters[0] ?? null };
}

function arithmetic(tree: Node, typed: string): Solved {
  const target = valueOf(tree);
  const steps: WorkedStep[] = [];
  let at = tree;
  for (let k = 0; k < 60; k++) {
    const move = reduce(at);
    if (!move) break;
    at = move.next;
    // self-check: a line of working that does not equal the line typed is never shown
    if (!eq(valueOf(at), target)) return { ok: false, reason: "OpenPath could not check its own working for this one, so it is not shown." };
    steps.push({ expression: show(at), explanation: move.why });
  }
  if (at.t !== "num") return { ok: false, reason: "This calculation is too long to work through here." };
  const answer = plain(at);
  const also = [mixedText(target), isInt(target) ? null : fracText(target), decimalOf(target)].filter((s): s is string => !!s && s !== answer);
  if (!isInt(target) && decimalOf(target) === null) {
    // a decimal that never ends: rounded, and marked as rounded
    const scaled = (target.n * 2000n + (target.n < 0n ? -target.d : target.d)) / (2n * target.d);
    also.push(`≈ ${decimalOf(q(scaled, 1000n))}`);
  }
  if (!steps.length) {
    const typedAs = tree.t === "num" && tree.raw !== undefined && tree.raw !== answer ? tree.raw : null;
    const m = typedAs && /^(\d+)\/(\d+)$/.exec(typedAs);
    steps.push({ expression: answer, explanation: m ? (isInt(target) ? `${m[1]} ÷ ${m[2]} = ${answer}.` : `Divide the top and the bottom by ${gcd(BigInt(m[1]), BigInt(m[2]))}: ${typedAs} = ${answer}.`) : typedAs ? `${typedAs} is ${fracText(target)} as a single fraction.` : "This is already a single number." });
  }
  return { ok: true, kind: "arithmetic", problem: typed, steps, answer, also: [...new Set(also)], value: target };
}

function equation(left: Node, right: Node, x: string): Solved {
  const [L, R] = [linear(left), linear(right)];
  const problem = `${show(left, x)} = ${show(right, x)}`;
  const steps: WorkedStep[] = [];
  const push = (l: Lin, r: Lin, why: string) => { const expression = `${linText(l, x)} = ${linText(r, x)}`; if (steps.at(-1)?.expression !== expression && (steps.length || expression !== problem.replace(/ ÷ /g, "/"))) steps.push({ expression, explanation: why }); };
  let [l, r] = [L, R];
  push(l, r, "Tidy each side: work out the brackets and collect the like terms.");
  if (r.a.n !== 0n) {
    const why = `${r.a.n > 0n ? "Subtract" : "Add"} ${eq(r.a, ONE) || eq(r.a, q(-1n)) ? "" : coef(q(r.a.n < 0n ? -r.a.n : r.a.n, r.a.d))}${x} ${r.a.n > 0n ? "from" : "to"} both sides, so the letter is on one side only.`;
    l = { a: sub(l.a, r.a), b: l.b }; r = { a: ZERO, b: r.b };
    push(l, r, why);
  }
  if (l.a.n === 0n) {
    const always = eq(l.b, r.b);
    if (!steps.length) steps.push({ expression: `${fracText(l.b)} = ${fracText(r.b)}`, explanation: "The letter cancels out." });
    return { ok: true, kind: "equation", problem, steps, answer: always ? `Every number works for ${x}` : "No number works", also: [always ? "Both sides are always equal." : `The letter cancels and leaves ${fracText(l.b)} = ${fracText(r.b)}, which is never true.`], value: null, letter: x };
  }
  if (l.b.n !== 0n) {
    const why = `${l.b.n > 0n ? "Subtract" : "Add"} ${absText(l.b)} ${l.b.n > 0n ? "from" : "to"} both sides.`;
    r = { a: ZERO, b: sub(r.b, l.b) }; l = { a: l.a, b: ZERO };
    push(l, r, why);
  }
  if (!eq(l.a, ONE)) {
    const why = eq(l.a, q(-1n)) ? "Change the sign of both sides." : isInt(l.a) ? `Divide both sides by ${big(l.a.n)}.` : l.a.n === 1n ? `Multiply both sides by ${l.a.d}.` : `Divide both sides by ${fracText(l.a)} (the same as multiplying by ${fracText(div(ONE, l.a))}).`;
    r = { a: ZERO, b: div(r.b, l.a) }; l = { a: ONE, b: ZERO };
    push(l, r, why);
  }
  const root = r.b;
  // self-check: the answer must satisfy the equation as typed
  const at = (side: Lin) => add(mul(side.a, root), side.b);
  if (!eq(at(L), at(R))) return { ok: false, reason: "OpenPath could not check its own working for this one, so it is not shown." };
  steps.push({ expression: `${fracText(at(L))} = ${fracText(at(R))}`, explanation: `Check: put ${x} = ${fracText(root)} into the equation you typed. Both sides come to ${fracText(at(L))}.` });
  const also = [mixedText(root), decimalOf(root)].filter((s): s is string => !!s && s !== fracText(root)).map((s) => `${x} = ${s}`);
  return { ok: true, kind: "equation", problem, steps, answer: `${x} = ${fracText(root)}`, also, value: root, letter: x };
}

/** A typed calculation or one-letter linear equation, worked exactly; or the plain reason it is not. */
export function solve(text: string): Solved {
  try {
    if (!text.trim()) return { ok: false, reason: "Type a calculation or an equation." };
    if (text.length > 120) return { ok: false, reason: "That is too long. Type one calculation or one equation." };
    const { text: s, letter } = clean(text);
    if (!s) return { ok: false, reason: "Type a calculation or an equation." };
    const sides = s.split("=");
    if (sides.length > 2) return { ok: false, reason: "There is more than one equals sign. Type one equation." };
    if (sides.length === 2) {
      if (!letter) {
        // "3 + 4 = 7": no letter, so it is a statement; work out the left side and say whether it is true
        const [a, b] = sides.map((side) => parse(tokens(side, null)));
        const left = arithmetic(a, show(a));
        if (!left.ok) return left;
        const right = valueOf(b);
        const truth = eq(left.value!, right);
        return { ...left, problem: `${show(a)} = ${show(b)}`, also: [truth ? "So what you typed is true." : `So what you typed is not true: the left side is ${left.answer}, the right side is ${fracText(right)}.`] };
      }
      const [a, b] = sides.map((side) => parse(tokens(side, letter)));
      return equation(a, b, letter);
    }
    const tree = parse(tokens(s, null));
    return arithmetic(tree, show(tree));
  } catch (e) {
    if (e instanceof Refuse) return { ok: false, reason: e.message };
    return { ok: false, reason: "OpenPath could not read that as a calculation." };
  }
}

/** Is a typed answer the solver's answer? ("9", "x = 9", "7/12", "0.25", "1 3/4" are all read.) */
export function sameAnswer(solved: Extract<Solved, { ok: true }>, typed: string): boolean | null {
  if (!solved.value) return null;
  try {
    let s = clean(typed.replace(new RegExp(`^\\s*${solved.letter ?? "x"}\\s*=`, "i"), "")).text;
    if (!s) return null;
    return eq(valueOf(parse(tokens(s, null))), solved.value);
  } catch {
    return null;
  }
}
