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
/** `layout`: the same move set out in columns, the way it is written on paper (shown in a fixed-width block). */
export interface WorkedStep { expression: string; explanation: string; layout?: string[] }
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

/** Long multiplication in columns (two positive whole numbers, the smaller with 2 to 4 digits). */
function columnMultiply(x: bigint, y: bigint): string[] | null {
  const [a, b] = x >= y ? [x, y] : [y, x];
  if (b < 10n || b > 9999n || a > 99999999n) return null;
  const digits = [...b.toString()].reverse().map(BigInt);
  const rows = digits.map((d, i) => ({ v: a * d * 10n ** BigInt(i), note: `${a} × ${d * 10n ** BigInt(i)}` })).filter((r) => r.v !== 0n);
  // self-check: the rows must add up to the product
  if (rows.reduce((t, r) => t + r.v, 0n) !== a * b) return null;
  const width = (a * b).toString().length + 2;
  const pad = (t: string) => t.padStart(width);
  const rule = pad("-".repeat(width - 2));
  return [pad(a.toString()), pad(`× ${b}`), rule, ...rows.map((r) => `${pad(r.v.toString())}   ${r.note}`), rule, pad((a * b).toString())];
}
/** Long division in columns (positive whole numbers, divisor up to 4 digits): each digit of the answer, what is taken
 *  away, and what is brought down. Returns the lines, the quotient and the remainder. */
function columnDivide(x: bigint, y: bigint): { lines: string[]; quotient: bigint; remainder: bigint } | null {
  if (y <= 0n || x < y || y > 9999n || x > 999999999999n || x < 10n) return null;
  const digits = x.toString();
  const left = `${y} ) `;
  const lines: string[] = [];
  let rem = 0n, quotient = "", started = false;
  for (let i = 0; i < digits.length; i++) {
    const cur = rem * 10n + BigInt(digits[i]);
    const d = cur / y;
    quotient += d.toString();
    const end = left.length + i + 1; // the column this working ends in
    if (d !== 0n || started) {
      if (started) lines.push(cur.toString().padStart(end));
      const take = (d * y).toString();
      lines.push(`${("−" + take).padStart(end)}   ${y} × ${d}`);
      lines.push("-".repeat(Math.max(take.length, cur.toString().length)).padStart(end));
      started = true;
    }
    rem = cur - d * y;
  }
  lines.push(rem.toString().padStart(left.length + digits.length) + (rem === 0n ? "   nothing left over" : "   left over"));
  const q0 = BigInt(quotient);
  // self-check: the digits found must be the quotient, and what is left the remainder
  if (q0 !== x / y || rem !== x % y) return null;
  return { lines: [q0.toString().padStart(left.length + digits.length), `${left}${digits}`, ...lines], quotient: q0, remainder: rem };
}

/** One operation on two numbers: the result and the sentence that says why. */
function operate(op: string, a: Extract<Node, { t: "num" }>, b: Extract<Node, { t: "num" }>): { value: Extract<Node, { t: "num" }>; why: string; layout?: string[] } {
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
    const layout = (style === "int" && a.v.n > 0n && b.v.n > 0n && columnMultiply(a.v.n, b.v.n)) || undefined;
    return { value: out, why: (style === "int" && wholeWorking("*", a.v.n, b.v.n)) || `${A} × ${B} = ${plain(out)}.`, layout };
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
      return { value: out, why: `${A} ÷ ${B} does not come out whole.${rem || ` It is ${plain(out)}.`}`, layout: (x > 0n && y > 0n && columnDivide(x, y)?.lines) || undefined };
    }
    const out = num(v, style);
    const long = style === "int" && a.v.n > 0n && b.v.n > 0n && (a.v.n >= 100n || b.v.n >= 10n) ? columnDivide(a.v.n, b.v.n) : null;
    return { value: out, why: (style === "int" && wholeWorking("/", a.v.n, b.v.n)) || `${A} ÷ ${B} = ${plain(out)}.`, layout: long?.lines };
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
function reduce(n: Node): { next: Node; why: string; layout?: string[] } | null {
  switch (n.t) {
    case "num": case "var": return null;
    case "neg": {
      const inner = reduce(n.e);
      if (inner) return { ...inner, next: { t: "neg", e: inner.next } };
      if (n.e.t !== "num") return null;
      const v = num(q(-n.e.v.n, n.e.v.d), n.e.style);
      return { next: v, why: `The opposite of ${wrap(n.e)} is ${plain(v)}.` };
    }
    case "pct": {
      const inner = reduce(n.e);
      if (inner) return { ...inner, next: { t: "pct", e: inner.next } };
      if (n.e.t !== "num") return null;
      const v = num(div(n.e.v, q(100n)), n.e.style === "frac" ? "frac" : "dec");
      return { next: v, why: `${plain(n.e)}% means ${plain(n.e)} out of 100, which is ${plain(v)}.` };
    }
    case "bin": {
      const l = reduce(n.l);
      if (l) return { ...l, next: { ...n, l: l.next } };
      const r = reduce(n.r);
      if (r) return { ...r, next: { ...n, r: r.next } };
      if (n.l.t !== "num" || n.r.t !== "num") return null;
      const { value, why, layout } = operate(n.op, n.l, n.r);
      return { next: value, why, layout };
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
  | { ok: true; kind: "arithmetic" | "equation" | "numbers" | "units"; problem: string; steps: WorkedStep[]; answer: string; also: string[]; value: Q | null; letter?: string; unit?: string }
  /** `words`: refused because it is written in words (a word problem), which a language reader might still read */
  | { ok: false; reason: string; words?: true };

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
    steps.push({ expression: show(at), explanation: move.why, ...(move.layout ? { layout: move.layout } : {}) });
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

// ------------------------------------------------------------------ HCF, LCM, factors (number-facts@1)
function primes(n: bigint): bigint[] {
  const out: bigint[] = [];
  for (let p = 2n; p * p <= n; p += p === 2n ? 1n : 2n) while (n % p === 0n) { out.push(p); n /= p; }
  if (n > 1n) out.push(n);
  return out;
}
const product = (ps: bigint[]) => (ps.length ? ps.join(" × ") : "1");
const count = (ps: bigint[], p: bigint) => ps.filter((v) => v === p).length;
const NUMBER_LIMIT = 10_000_000n;
const HCF_WORDS = "hcf|gcd|gcf|highest common factor|greatest common factor|greatest common divisor";
const LCM_WORDS = "lcm|lowest common multiple|least common multiple";
const ASK = "(?:find|what is|what are|calculate|work out|the|all|of|\\s)*";
function numberFacts(text: string): Solved | null {
  const s = text.toLowerCase().replace(/[?.!]+\s*$/, "").replace(/(\d),(?=\d{3}\b)/g, "$1").replace(/\s+/g, " ").trim();
  const list = (t: string) => t.split(/\s*(?:,|and|&)\s*/).filter(Boolean).map((v) => BigInt(v));
  const many = new RegExp(`^${ASK}(${HCF_WORDS}|${LCM_WORDS})(?: and (${HCF_WORDS}|${LCM_WORDS}))? ?(?:of)? ?\\(?\\s*(\\d+(?:\\s*(?:,|and|&)\\s*\\d+)+)\\s*\\)?$`).exec(s);
  if (many) {
    const ns = list(many[3]);
    if (ns.length > 5 || ns.some((n) => n < 1n || n > NUMBER_LIMIT)) throw new Refuse("OpenPath works out the HCF and LCM of up to five whole numbers from 1 to 10,000,000.");
    const wants = [many[1], many[2]].filter(Boolean).map((w) => (new RegExp(`^(?:${HCF_WORDS})$`).test(w) ? "HCF" : "LCM"));
    const fs = ns.map(primes);
    const all = [...new Set(fs.flat())].sort((a, b) => (a < b ? -1 : 1));
    const steps: WorkedStep[] = ns.map((n, i) => ({ expression: `${n} = ${n === 1n ? "1" : product(fs[i])}`, explanation: n === 1n ? "1 has no prime factors." : fs[i].length === 1 ? `${n} is a prime number.` : `Break ${n} into prime numbers.` }));
    const results: string[] = [];
    let value: Q | null = null;
    for (const want of wants) {
      const picked = all.flatMap((p) => Array<bigint>((want === "HCF" ? Math.min : Math.max)(...fs.map((f) => count(f, p)))).fill(p));
      const v = picked.reduce((t, p) => t * p, 1n);
      // self-check against the definition, by a different route (Euclid's method)
      const direct = want === "HCF" ? ns.reduce((a, b) => gcd(a, b)) : ns.reduce((a, b) => (a / gcd(a, b)) * b);
      if (v !== direct) return { ok: false, reason: "OpenPath could not check its own working for this one, so it is not shown." };
      steps.push({ expression: `${want} = ${picked.length > 1 ? `${product(picked)} = ` : ""}${v}`, explanation: want === "HCF" ? (picked.length ? "Take only the primes that every number has, each as many times as the number that has it least." : "The numbers share no prime, so the only common factor is 1.") : "Take every prime that appears, each as many times as the number that has it most." });
      results.push(`${want} = ${v}`);
      value = q(v);
    }
    return { ok: true, kind: "numbers", problem: `${wants.join(" and ")} of ${ns.join(wants.length && ns.length === 2 ? " and " : ", ")}`, steps, answer: wants.length === 1 ? value!.n.toString() : results.join(", "), also: [], value: wants.length === 1 ? value : null };
  }
  const pf = new RegExp(`^${ASK}(?:prime factori[sz]ation|prime factors|product of primes?) (?:of |for )?(\\d+)$`).exec(s);
  if (pf) {
    const n = BigInt(pf[1]);
    if (n < 2n || n > NUMBER_LIMIT) throw new Refuse("OpenPath finds the prime factors of whole numbers from 2 to 10,000,000.");
    const ps = primes(n);
    const steps: WorkedStep[] = [];
    let at = n;
    for (const p of ps.slice(0, -1)) { steps.push({ expression: `${at} = ${p} × ${at / p}`, explanation: `${p} is the smallest prime that divides ${at}.` }); at /= p; }
    steps.push({ expression: `${n} = ${product(ps)}`, explanation: ps.length === 1 ? `${n} is a prime number: nothing but 1 and itself divides it.` : `${at} is prime, so the breaking down stops. Every factor is now prime.` });
    if (ps.reduce((t, p) => t * p, 1n) !== n) return { ok: false, reason: "OpenPath could not check its own working for this one, so it is not shown." };
    return { ok: true, kind: "numbers", problem: `Prime factors of ${n}`, steps, answer: product(ps), also: [], value: null };
  }
  const fac = new RegExp(`^${ASK}factors (?:of |for )?(\\d+)$`).exec(s);
  if (fac) {
    const n = BigInt(fac[1]);
    if (n < 1n || n > 1_000_000n) throw new Refuse("OpenPath lists the factors of whole numbers from 1 to 1,000,000.");
    const pairs: [bigint, bigint][] = [];
    for (let a = 1n; a * a <= n; a++) if (n % a === 0n) pairs.push([a, n / a]);
    const all = [...new Set(pairs.flat())].sort((a, b) => (a < b ? -1 : 1));
    const steps: WorkedStep[] = [{ expression: pairs.map(([a, b]) => `${a} × ${b}`).join(",  "), explanation: `Find every pair of whole numbers that multiply to ${n}. Try 1, 2, 3 … and stop when the pairs start to repeat.` }, { expression: all.join(", "), explanation: `Write the numbers from the pairs in order. ${n} has ${all.length} factor${all.length === 1 ? "" : "s"}${all.length === 2 ? ", so it is prime" : ""}.` }];
    return { ok: true, kind: "numbers", problem: `Factors of ${n}`, steps, answer: all.join(", "), also: [], value: null };
  }
  return null;
}

// ------------------------------------------------------------------ units (unit-convert@1): metric length, mass, capacity; time; rupees
const UNITS: { names: string[]; show: string; kind: string; size: Q }[] = [
  { names: ["mm", "millimetre", "millimetres", "millimeter", "millimeters"], show: "mm", kind: "length", size: q(1n, 1000n) },
  { names: ["cm", "centimetre", "centimetres", "centimeter", "centimeters"], show: "cm", kind: "length", size: q(1n, 100n) },
  { names: ["m", "metre", "metres", "meter", "meters"], show: "m", kind: "length", size: ONE },
  { names: ["km", "kilometre", "kilometres", "kilometer", "kilometers"], show: "km", kind: "length", size: q(1000n) },
  { names: ["mg", "milligram", "milligrams"], show: "mg", kind: "mass", size: q(1n, 1000n) },
  { names: ["g", "gram", "grams", "gm", "gms"], show: "g", kind: "mass", size: ONE },
  { names: ["kg", "kilogram", "kilograms", "kgs"], show: "kg", kind: "mass", size: q(1000n) },
  { names: ["tonne", "tonnes"], show: "tonnes", kind: "mass", size: q(1000000n) },
  { names: ["ml", "millilitre", "millilitres", "milliliter", "milliliters"], show: "ml", kind: "capacity", size: q(1n, 1000n) },
  { names: ["l", "litre", "litres", "liter", "liters"], show: "l", kind: "capacity", size: ONE },
  { names: ["kl", "kilolitre", "kilolitres", "kiloliter", "kiloliters"], show: "kl", kind: "capacity", size: q(1000n) },
  { names: ["s", "sec", "secs", "second", "seconds"], show: "seconds", kind: "time", size: ONE },
  { names: ["min", "mins", "minute", "minutes"], show: "minutes", kind: "time", size: q(60n) },
  { names: ["h", "hr", "hrs", "hour", "hours"], show: "hours", kind: "time", size: q(3600n) },
  { names: ["day", "days"], show: "days", kind: "time", size: q(86400n) },
  { names: ["week", "weeks"], show: "weeks", kind: "time", size: q(604800n) },
  { names: ["paise", "paisa"], show: "paise", kind: "money", size: q(1n, 100n) },
  { names: ["rupee", "rupees", "rs"], show: "rupees", kind: "money", size: ONE },
];
const unitOf = (name: string) => UNITS.find((u) => u.names.includes(name));
const valueText = (v: Q) => decimalOf(v) ?? mixedText(v) ?? fracText(v);
const AMOUNT = "(\\d+ \\d+\\/\\d+|\\d+\\/\\d+|\\d+(?:\\.\\d+)?)";
function unitConvert(text: string): Solved | null {
  let s = text.toLowerCase().replace(/[?.!]+\s*$/, "").replace(/(\d),(?=\d{3}\b)/g, "$1").replace(/₹/g, " rs ").replace(/\s+/g, " ").trim();
  const how = /^how many ([a-z]+) (?:are |is )?(?:there )?in (.+)$/.exec(s);
  if (how) s = `${how[2]} in ${how[1]}`;
  const m = /^(?:convert |change |express |write |what is )?(.+?) (?:to|in|into|as) ([a-z]+)$/.exec(s) ?? /^(.+?) ?= ?\?? ?([a-z]+)$/.exec(s);
  if (!m) return null;
  const target = unitOf(m[2]);
  const piece = new RegExp(`^${AMOUNT} ?([a-z]+)(?: and |, | |$)`);
  const parts: { v: Q; raw: string; u: (typeof UNITS)[number] }[] = [];
  let rest = m[1].trim();
  while (rest) {
    const p = piece.exec(rest);
    const u = p && unitOf(p[2]);
    if (!p || !u) return null;
    const mixed = /^(\d+) (\d+)\/(\d+)$/.exec(p[1]), frac = /^(\d+)\/(\d+)$/.exec(p[1]);
    const v = mixed ? add(q(BigInt(mixed[1])), q(BigInt(mixed[2]), BigInt(mixed[3]))) : frac ? q(BigInt(frac[1]), BigInt(frac[2])) : (() => { const [w, f = ""] = p[1].split("."); return q(BigInt(w + f), 10n ** BigInt(f.length)); })();
    parts.push({ v, raw: p[1], u });
    rest = rest.slice(p[0].length).trim();
  }
  if (!parts.length || !target) return null;
  if (parts.some((p) => p.u.kind !== target.kind)) throw new Refuse(`${parts.find((p) => p.u.kind !== target.kind)!.u.show} and ${target.show} measure different things, so one cannot be changed into the other.`);
  if (parts.some((p) => p.raw.replace(/\D/g, "").length > 12)) throw new Refuse("That number is too long to work with here.");
  const steps: WorkedStep[] = [];
  let total = ZERO;
  for (const p of parts) {
    const ratio = div(p.u.size, target.size);
    const out = mul(p.v, ratio);
    total = add(total, out);
    const said = `${p.raw} ${p.u.show}`;
    if (eq(ratio, ONE)) { if (parts.length > 1) steps.push({ expression: `${said}`, explanation: `This part is already in ${target.show}.` }); continue; }
    const whole = isInt(ratio), back = div(ONE, ratio);
    steps.push({ expression: `${said} = ${valueText(out)} ${target.show}`, explanation: whole ? `1 ${p.u.show.replace(/s$/, "")} is ${ratio.n} ${target.show}, so multiply by ${ratio.n}: ${valueText(p.v)} × ${ratio.n} = ${valueText(out)}.` : isInt(back) ? `${back.n} ${p.u.show} make 1 ${target.show.replace(/s$/, "")}, so divide by ${back.n}: ${valueText(p.v)} ÷ ${back.n} = ${valueText(out)}.` : `1 ${p.u.show.replace(/s$/, "")} is ${fracText(ratio)} ${target.show}: ${valueText(p.v)} × ${fracText(ratio)} = ${valueText(out)}.` });
  }
  if (parts.length > 1) steps.push({ expression: `${valueText(total)} ${target.show}`, explanation: `Add the parts: ${parts.map((p) => valueText(mul(p.v, div(p.u.size, target.size)))).join(" + ")} = ${valueText(total)}.` });
  if (!steps.length) steps.push({ expression: `${valueText(total)} ${target.show}`, explanation: `It is already in ${target.show}.` });
  // self-check: changing the answer back into the smallest unit gives the same amount as what was typed
  if (!eq(mul(total, target.size), parts.reduce((t, p) => add(t, mul(p.v, p.u.size)), ZERO))) return { ok: false, reason: "OpenPath could not check its own working for this one, so it is not shown." };
  const answer = `${valueText(total)} ${target.show}`;
  const also = [decimalOf(total), mixedText(total), isInt(total) ? null : fracText(total)].filter((v): v is string => !!v && v !== valueText(total)).map((v) => `${v} ${target.show}`);
  return { ok: true, kind: "units", problem: `${parts.map((p) => `${p.raw} ${p.u.show}`).join(" ")} in ${target.show}`, steps, answer, also, value: total, unit: target.show };
}

/** A typed calculation or one-letter linear equation, worked exactly; or the plain reason it is not. */
export function solve(text: string): Solved {
  try {
    if (!text.trim()) return { ok: false, reason: "Type a calculation or an equation." };
    if (text.length > 120) return { ok: false, reason: "That is too long. Type one calculation or one equation." };
    const named = numberFacts(text) ?? unitConvert(text);
    if (named) return named;
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
    if (e instanceof Refuse) return { ok: false, reason: e.message, ...(e.message === WORD_REASON ? { words: true as const } : {}) };
    return { ok: false, reason: "OpenPath could not read that as a calculation." };
  }
}

/** Is a typed answer the solver's answer? ("9", "x = 9", "7/12", "0.25", "1 3/4" are all read.) */
export function sameAnswer(solved: Extract<Solved, { ok: true }>, typed: string): boolean | null {
  if (!solved.value) return null;
  try {
    // "3500 m" and "x = 3" are read as 3500 and 3
    const bare = typed.replace(new RegExp(`^\\s*${solved.letter ?? "x"}\\s*=`, "i"), "").replace(/\s*[a-zA-Z]+\s*$/, (u) => (solved.unit && unitOf(u.trim().toLowerCase())?.show === solved.unit ? "" : u));
    let s = clean(bare).text;
    if (!s) return null;
    return eq(valueOf(parse(tokens(s, null))), solved.value);
  } catch {
    return null;
  }
}
