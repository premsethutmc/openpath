/**
 * child-lab@2: how a lab child works a question out — from the question's own words and picture only.
 *
 * Nothing here reads a question's answer, its worked solution, its generator parameters or its skill id. A question is
 * worked one of these ways, or not at all:
 *   - a plain calculation in the prompt ("126 ÷ 7 = ?", "Work out (−8) × 4 − (−60) ÷ (−4).", "Which equals 8 × 6?");
 *   - a prompt shape the lab knows (a quadratic, a box to fill, an array, a temperature change …), read from the words;
 *   - a picture the question carries (base-ten blocks).
 * Every operation is applied with the child's own facts (`Ops`) and recorded as a step whose operands point at the steps
 * they came from (`from`: a step number, or "given" for a number read from the question). Nothing is matched by value.
 * A question none of these cover is `unsupported`: the child says it cannot tell, and the lab never fills the gap with
 * the right answer.
 */
import type { Question } from "../content";

export type Op = "mul" | "div" | "add" | "sub" | "pow" | "root";
/** one fact the child recalls or one operation it performs, with which slip (if any) changed it */
export interface Fact { op: Op; a: number; b: number; result: number; slip: string | null }
export interface Ops { fact(op: Op, a: number, b: number): Fact }
export interface Step { n: number; op: Op | "compare" | "order" | "pick"; args: number[]; from: (number | "given")[]; value: number; slip: string | null; note?: string }
export interface Work { route: string; steps: Step[]; text: string; note?: string }
export type Worked = { ok: true; work: Work } | { ok: false; why: string };

export const exact = (op: Op, a: number, b: number): number =>
  op === "mul" ? a * b : op === "div" ? a / b : op === "add" ? a + b : op === "sub" ? a - b : op === "pow" ? a ** b : Math.sqrt(a);

interface Val { v: number; ref: number | "given" }
/** a calculation in progress: every value carries where it came from */
export class Calc {
  steps: Step[] = [];
  private ops: Ops;
  constructor(ops: Ops) { this.ops = ops; }
  given(v: number): Val { return { v, ref: "given" }; }
  private push(op: Step["op"], args: number[], from: (number | "given")[], value: number, slip: string | null, note?: string): Val {
    const n = this.steps.length + 1; this.steps.push({ n, op, args, from, value, slip, ...(note ? { note } : {}) }); return { v: value, ref: n };
  }
  /** a single fact or operation, as the child does it */
  fact(op: Op, x: Val, y: Val): Val { const f = this.ops.fact(op, x.v, y.v); return this.push(op, [x.v, y.v], [x.ref, y.ref], f.result, f.slip); }
  /** multiplication: a fact when both are up to 10, otherwise partial products of the larger number's digits, added up */
  mul(x: Val, y: Val): Val {
    const [big, small] = Math.abs(x.v) >= Math.abs(y.v) ? [x, y] : [y, x];
    if (!Number.isInteger(big.v) || !Number.isInteger(small.v) || Math.abs(big.v) <= 10 || Math.abs(small.v) > 10 || small.v === 0 || big.v % 10 === 0) return this.fact("mul", x, y);
    // a sign is handled as its own fact first (so a sign slip shows), then the digits
    if (big.v < 0 || small.v < 0) {
      const sign = this.fact("mul", this.given(Math.sign(big.v)), this.given(Math.sign(small.v)));
      const mag = this.mul(this.given(Math.abs(big.v)), this.given(Math.abs(small.v)));
      return this.fact("mul", sign, mag);
    }
    const ds = String(big.v).split("").reverse().map(Number);
    let total: Val | null = null;
    ds.forEach((d, k) => {
      if (d === 0) return;
      const part = this.fact("mul", this.given(d), small);
      const placed = k === 0 ? part : this.fact("mul", part, this.given(10 ** k));
      total = total ? this.fact("add", total, placed) : placed;
    });
    return total ?? this.given(0);
  }
  /** division: a fact when the quotient is a one-digit table fact, otherwise school long division with the child's own facts */
  div(x: Val, y: Val): Val {
    const a = x.v, d = y.v;
    if (!Number.isInteger(a) || !Number.isInteger(d) || d <= 0 || d > 10 || a < 0 || a / d <= 10) return this.fact("div", x, y);
    let c: Val | null = null; const digits: Val[] = [];
    for (const ch of String(a)) {
      const cur: Val = c === null ? this.given(Number(ch)) : this.fact("add", this.fact("mul", c, this.given(10)), this.given(Number(ch)));
      if (cur.v < d && digits.length === 0) { c = cur; continue; }
      let k: Val;
      if (cur.v % d === 0 && cur.v / d <= 10) k = this.fact("div", cur, y);
      else { let best = 0; for (let t = 1; t <= 9; t++) if (this.ops.fact("mul", d, t).result <= cur.v) best = t; k = this.push("pick", [cur.v, d], [cur.ref, y.ref], best, null, "largest digit whose product fits"); }
      if (k.v > 9 || k.v < 0 || !Number.isInteger(k.v)) return this.push("div", [a, d], [x.ref, y.ref], NaN, null, "a quotient digit out of range");
      digits.push(k);
      c = this.fact("sub", cur, this.fact("mul", y, k));
    }
    if (!digits.length) return this.fact("div", x, y);
    let q: Val = digits[0];
    for (const k of digits.slice(1)) q = this.fact("add", this.fact("mul", q, this.given(10)), k);
    return q;
  }
  add(x: Val, y: Val) { return this.fact("add", x, y); }
  sub(x: Val, y: Val) { return this.fact("sub", x, y); }
  pow(x: Val, y: Val) { return this.fact("pow", x, y); }
  root(x: Val) { return this.fact("root", x, this.given(2)); }
  compare(x: Val, note: string): Val { return this.push("compare", [x.v], [x.ref], x.v > 0 ? 2 : x.v === 0 ? 1 : 0, null, note); }
}

// ------------------------------------------------------------------ plain calculations

const SUP = "⁰¹²³⁴⁵⁶⁷⁸⁹";
/** the calculation written in the prompt, in plain symbols ("(−8) × 4" → "(-8)*4"), or null */
export function normalise(src: string): string | null {
  const s = src.replace(/[−–]/g, "-").replace(/×/g, "*").replace(/÷/g, "/")
    .replace(/⁻?[⁰¹²³⁴⁵⁶⁷⁸⁹]+/g, (m) => { const neg = m.startsWith("⁻"); const n = [...m.replace("⁻", "")].map((c) => SUP.indexOf(c)).join(""); return neg ? `^(-${n})` : `^${n}`; })
    .replace(/\s+/g, "");
  return /^[-+*/^().√\d]+$/.test(s) && /\d/.test(s) ? s : null;
}
/** a plain calculation worked with the child's operations (null: not a well-formed calculation) */
export function evaluate(src: string, calc: Calc): Val | null {
  const s = normalise(src); if (s === null) return null;
  let i = 0;
  const fail = () => { throw new Error("parse"); };
  const atom = (): Val => {
    if (s[i] === "(") { i++; const v = expr(); if (s[i] !== ")") fail(); i++; return v; }
    if (s[i] === "√") { i++; return calc.root(atom()); }
    const m = /^\d+(\.\d+)?/.exec(s.slice(i)); if (!m) fail(); i += m![0].length; return calc.given(Number(m![0]));
  };
  // exponent binds tighter than a leading minus (−3² = −9) and is right-associative (2^3^2 = 2^9)
  const power = (): Val => { const b = atom(); if (s[i] === "^") { i++; return calc.pow(b, unary()); } return b; };
  const unary = (): Val => { if (s[i] === "-") { i++; const v = unary(); return v.ref === "given" ? calc.given(-v.v) : calc.mul(calc.given(-1), v); } if (s[i] === "+") { i++; return unary(); } return power(); };
  const term = (): Val => { let v = unary(); while (s[i] === "*" || s[i] === "/") { const o = s[i++]; const r = unary(); v = o === "*" ? calc.mul(v, r) : calc.div(v, r); } return v; };
  const expr = (): Val => { let v = term(); while (s[i] === "+" || s[i] === "-") { const o = s[i++]; const r = term(); v = o === "+" ? calc.add(v, r) : calc.sub(v, r); } return v; };
  try { const v = expr(); return i === s.length ? v : null; } catch { return null; }
}

/** the calculation a prompt asks for, after the words around it ("Work out", "= ?", "(Split 8 into 5 + 3 if it helps.)") */
export function askedCalculation(prompt: string): string | null {
  let p = prompt.replace(/\s*Choose one\.?\s*$/i, "").trim();
  p = p.replace(/\s*\([^()]*[A-Za-z][^()]*\)\s*$/, "").trim(); // a trailing hint in words
  const sentences = p.split(/(?<=[.?])\s+(?=[A-Z])/);
  let last = sentences.at(-1)!.trim();
  last = last.replace(/^(?:So|Now)\s+/i, "").replace(/^[A-Z][A-Za-z ,']*:\s*(?=[(√\d−-])/, "").replace(/^(?:Work out|Calculate|Find the value of|Find|Evaluate|What is|Which equals|Quick one:)\s*/i, "").replace(/\s*(?:=\s*\?|\?|\.)\s*$/, "").trim();
  // "7 × 6 = 7 × 5 + 7 × 1 = 35 + 7 = ?": the child works the last expression of the chain
  const chain = last.split(/\s=\s/); last = chain.at(-1)!.trim();
  if (normalise(last) === null) return null;
  // the method the question gives ("18 × 7 = 10 × 7 + 8 × 7. What is 18 × 7?") is the one the child follows
  for (const s of sentences.slice(0, -1)) { const parts = s.replace(/[.:]\s*$/, "").split(/\s=\s/).map((x) => x.replace(/^.*:\s*/, "").trim()); const at = parts.findIndex((x) => normalise(x) === normalise(last)); if (at >= 0 && at < parts.length - 1 && normalise(parts.at(-1)!) !== null && !/^\d+$/.test(normalise(parts.at(-1)!)!)) return parts.at(-1)!; }
  return last;
}

// ------------------------------------------------------------------ prompt shapes the lab knows

const NUM = String.raw`[−-]?\d+`;
const num = (x: string) => Number(x.replace(/[−–]/g, "-"));
/** "x² − 4x − 20" or "4x² − kx + 16" → coefficients (a, b, c); k stays null */
export function quadratic(src: string): { a: number; b: number | null; c: number } | null {
  const m = new RegExp(String.raw`(\d*)x²\s*(?:([+−-])\s*(\d*)(x|kx))?\s*(?:([+−-])\s*(\d+))?\s*=\s*0`).exec(src);
  if (!m) return null;
  const a = m[1] ? Number(m[1]) : 1;
  const b = m[4] === "kx" ? null : m[4] ? (m[2] === "+" ? 1 : -1) * (m[3] ? Number(m[3]) : 1) : 0;
  const c = m[6] ? (m[5] === "+" ? 1 : -1) * Number(m[6]) : 0;
  return { a, b, c };
}
const fmt = (v: number): string | null => {
  if (!Number.isFinite(v)) return null;
  if (Number.isInteger(v)) return String(v);
  for (let d = 2; d <= 1000; d++) { const n = Math.round(v * d); if (Math.abs(n / d - v) < 1e-9) return `${n}/${d}`; }
  return null;
};

type Shape = (q: Question, calc: Calc) => { value: number | null; text?: string; route: string } | null;
const SHAPES: Shape[] = [
  // How many (different) real solutions does Q = 0 have?
  (q, calc) => {
    if (!/How many (?:different )?real solutions does/.test(q.prompt)) return null;
    const e = quadratic(q.prompt); if (!e || e.b === null) return null;
    const sq = calc.pow(calc.given(e.b), calc.given(2));
    const ac = calc.mul(calc.given(4), e.a === 1 ? calc.given(e.c) : calc.mul(calc.given(e.a), calc.given(e.c)));
    const d = calc.sub(sq, ac);
    return { value: calc.compare(d, "discriminant > 0 → 2, = 0 → 1, < 0 → 0").v, route: "discriminant" };
  },
  // Find the positive value of k for which a x² − kx + c = 0 has two equal real roots: k² = 4ac
  (q, calc) => {
    if (!/value of k for which .* equal real roots/.test(q.prompt)) return null;
    const e = quadratic(q.prompt); if (!e || e.b !== null) return null;
    const k2 = calc.mul(calc.given(4), calc.mul(calc.given(e.a), calc.given(e.c)));
    return { value: calc.root(k2).v, route: "equal roots" };
  },
  // Solve x² + bx + c = 0: two numbers whose product is c and whose sum is b, found with the child's own facts
  (q, calc) => {
    if (!/^Solve .*x²/.test(q.prompt) || !/both solutions/.test(q.prompt)) return null;
    const e = quadratic(q.prompt); if (!e || e.a !== 1 || e.b === null) return null;
    for (let r = -Math.abs(e.c); r <= Math.abs(e.c); r++) {
      if (r === 0) continue;
      for (let s = r; s <= Math.abs(e.c); s++) {
        const before = calc.steps.length;
        const pr = calc.mul(calc.given(r), calc.given(s)); const su = calc.add(calc.given(r), calc.given(s));
        if (pr.v === e.c && su.v === e.b) return { value: null, text: [-s, -r].sort((x, y) => x - y).join(","), route: "factor pair" };
        calc.steps.length = before; // a pair tried and dropped is not part of the working
      }
    }
    return { value: null, text: undefined, route: "factor pair (none found)" };
  },
  // x² = 49 and x is positive
  (q, calc) => { const m = /^x² = (\d+) and x is positive/.exec(q.prompt); return m ? { value: calc.root(calc.given(Number(m[1]))).v, route: "square root" } : null; },
  // Factorise: x² + bx + c = (x + p)(x + □): the box is c ÷ p
  (q, calc) => {
    const m = new RegExp(String.raw`x²\s*([+−-])\s*(\d*)x\s*([+−-])\s*(\d+)\s*=\s*\(x\s*([+−-])\s*(\d+)\)\(x\s*[+−-]?\s*□\)`).exec(q.prompt);
    if (!m) return null;
    const c = (m[3] === "+" ? 1 : -1) * Number(m[4]), p = (m[5] === "+" ? 1 : -1) * Number(m[6]);
    return { value: calc.div(calc.given(c), calc.given(p)).v, route: "box = c ÷ p" };
  },
  // Expand (x + p)(x + q) = x² + □x + …: the box is p + q
  (q, calc) => {
    const m = /Expand \(x\s*([+−-])\s*(\d+)\)\(x\s*([+−-])\s*(\d+)\)\s*=\s*x²\s*\+\s*□x/.exec(q.prompt);
    if (!m) return null;
    const p = (m[1] === "+" ? 1 : -1) * Number(m[2]), r = (m[3] === "+" ? 1 : -1) * Number(m[4]);
    return { value: calc.add(calc.given(p), calc.given(r)).v, route: "box = p + q" };
  },
  // ? × 7 = 56
  (q, calc) => { const m = new RegExp(String.raw`^(?:\?\s*×\s*(${NUM})|(${NUM})\s*×\s*\?)\s*=\s*(${NUM})`).exec(q.prompt); return m ? { value: calc.div(calc.given(num(m[3])), calc.given(num(m[1] ?? m[2]))).v, route: "missing factor" } : null; },
  // splitting 196 into 140 + 56 … 196 ÷ 7
  (q, calc) => {
    const m = /splitting (\d+) into (\d+) \+ (\d+)\. What is \1 ÷ (\d+)\?/.exec(q.prompt); if (!m) return null;
    const d = calc.given(Number(m[4]));
    return { value: calc.add(calc.div(calc.given(Number(m[2])), d), calc.div(calc.given(Number(m[3])), d)).v, route: "split and divide" };
  },
  // rows of: an array has 3 rows of 6 dots; chairs in 8 rows of 7; 7 plates, one in each row, with 6 laddoos on each plate
  (q, calc) => {
    const m = /(\d+) rows of (\d+)/.exec(q.prompt) ?? /there are (\d+) \w+, one in each row, with (\d+) \w+ on each/.exec(q.prompt);
    return m && /How many/.test(q.prompt) ? { value: calc.mul(calc.given(Number(m[1])), calc.given(Number(m[2]))).v, route: "rows × columns" } : null;
  },
  // temperature rise from T1 to T2
  (q, calc) => {
    const m = new RegExp(String.raw`temperature .*? was (${NUM}) °C\. .*? it was (${NUM}) °C\. By how many degrees did the temperature rise`).exec(q.prompt);
    return m ? { value: calc.sub(calc.given(num(m[2])), calc.given(num(m[1]))).v, route: "later − earlier" } : null;
  },
  // one is at −15 m, another at 3 m: how much higher (or how far above) is the second
  (q, calc) => {
    const m = new RegExp(String.raw`is at (${NUM}) m[^.]*\. An? \w+ is at (${NUM}) m[^.]*\. How (?:many metres higher|far above)`).exec(q.prompt);
    return m ? { value: calc.sub(calc.given(num(m[2])), calc.given(num(m[1]))).v, route: "higher − lower" } : null;
  },
  // quiz score: +p per right, −n per wrong
  (q, calc) => {
    const m = new RegExp(String.raw`right answer scores \+?(${NUM}) and every wrong answer scores (${NUM})\. \w+ gives (\d+) right answers and (\d+) wrong answers`).exec(q.prompt);
    if (!m) return null;
    return { value: calc.add(calc.mul(calc.given(Number(m[3])), calc.given(num(m[1]))), calc.mul(calc.given(Number(m[4])), calc.given(num(m[2])))).v, route: "score" };
  },
  // which number is less / greater
  (q, calc) => {
    const m = new RegExp(String.raw`Which number is (less|smaller|greater|more|bigger|larger): (${NUM}) or (${NUM})\?`).exec(q.prompt); if (!m) return null;
    // comparing is not subtracting: no slip in the catalogue touches it, so it is done exactly (and recorded)
    const a = num(m[2]), b = num(m[3]); const small = /less|smaller/.test(m[1]);
    const v = (small ? a < b : a > b) ? a : b;
    calc.steps.push({ n: calc.steps.length + 1, op: "compare", args: [a, b], from: ["given", "given"], value: v, slip: null, note: m[1] });
    return { value: v, route: "compare" };
  },
  // arrange integers in increasing order
  (q, calc) => {
    const m = /Arrange these integers in increasing order \(smallest first\): ([^.]+)\./.exec(q.prompt); if (!m) return null;
    const xs = m[1].split(",").map((x) => num(x.trim()));
    if (xs.some((x) => !Number.isFinite(x))) return null;
    const sorted = [...xs].sort((a, b) => a - b); // ordering is not subtracting: done exactly
    calc.steps.push({ n: calc.steps.length + 1, op: "order", args: xs, from: xs.map(() => "given" as const), value: NaN, slip: null, note: sorted.join(", ") });
    return { value: null, text: sorted.join(", "), route: "order" };
  },
  // x² + kx + c = 0 has real roots: k² ≥ 4c, so k ≤ −2√c or k ≥ 2√c
  (q, calc) => {
    if (!/values of k for which the equation .* has real roots/.test(q.prompt)) return null;
    const m = /(\d*)x²\s*\+\s*kx\s*\+\s*(\d+)\s*=\s*0/.exec(q.prompt); if (!m) return null;
    const a = m[1] ? Number(m[1]) : 1;
    const r = calc.root(calc.mul(calc.given(4), calc.mul(calc.given(a), calc.given(Number(m[2]))))).v;
    return Number.isInteger(r) ? { value: null, text: `k ≤ ${-r} or k ≥ ${r}`, route: "k² ≥ 4ac" } : null;
  },
  // N things, each worth p points, and M things worth q points each: N × p + M × q
  (q, calc) => {
    const m = new RegExp(String.raw`(\d+) \w+ cards worth (${NUM}) points each and (\d+) \w+ cards worth (${NUM}) points each\. What is the score`).exec(q.prompt); if (!m) return null;
    return { value: calc.add(calc.mul(calc.given(Number(m[1])), calc.given(num(m[2]))), calc.mul(calc.given(Number(m[3])), calc.given(num(m[4])))).v, route: "score" };
  },
  // shares N equally into D groups: N ÷ D
  (q, calc) => {
    const m = /(\d+) \w+ equally (?:into|among|between) (\d+) \w+\. How many/.exec(q.prompt);
    return m ? { value: calc.div(calc.given(Number(m[1])), calc.given(Number(m[2]))).v, route: "share equally" } : null;
  },
  // a change of −₹2 a day, after 3 days
  (q, calc) => {
    const m = /a change of ([−-]?)₹(\d+) a day\. What is the total change .* after (\d+) days/.exec(q.prompt); if (!m) return null;
    return { value: calc.mul(calc.given(Number(m[3])), calc.given((m[1] ? -1 : 1) * Number(m[2]))).v, route: "days × change" };
  },
  // in D days the money goes up (or down) by ₹T: the change each day is ±T ÷ D
  (q, calc) => {
    const m = /In (\d+) days the money in the box goes (up|down) by ₹(\d+)\. What is the change in the money each day/.exec(q.prompt); if (!m) return null;
    return { value: calc.div(calc.given((m[2] === "down" ? -1 : 1) * Number(m[3])), calc.given(Number(m[1]))).v, route: "total ÷ days" };
  },
  // N things in rows of D: how many full rows (long division, remainder dropped)
  (q, calc) => {
    const m = /(\d+) \w+ in rows of (\d+)\. How many full rows/.exec(q.prompt);
    return m ? { value: calc.div(calc.given(Number(m[1])), calc.given(Number(m[2]))).v, route: "full rows" } : null;
  },
  // h = bt − kt², greatest height H: b² = 4kH, so k = b² ÷ 4H
  (q, calc) => {
    const m = /h = (\d+)t − kt² .* greatest height it reaches is exactly (\d+) m\. Find k/.exec(q.prompt); if (!m) return null;
    return { value: calc.fact("div", calc.pow(calc.given(Number(m[1])), calc.given(2)), calc.mul(calc.given(4), calc.given(Number(m[2])))).v, route: "k = b² ÷ 4H" };
  },
  // dividend = divisor × quotient + remainder
  (q, calc) => {
    const m = /divisor (\d+), quotient (\d+) and remainder (\d+)\..*What is the dividend\?/.exec(q.prompt); if (!m) return null;
    return { value: calc.add(calc.mul(calc.given(Number(m[1])), calc.given(Number(m[2]))), calc.given(Number(m[3]))).v, route: "divisor × quotient + remainder" };
  },
  // an integer but not a counting number (classifying is exact: no slip in the catalogue touches it)
  (q) => {
    if (!/Which of these is an integer but NOT a counting number\?/.test(q.prompt) || !q.options) return null;
    const hit = q.options.filter((o) => /^[−-]?\d+$/.test(o.trim()) && num(o.trim()) <= 0);
    return hit.length === 1 ? { value: num(hit[0].trim()), route: "classify" } : null;
  },
  // the opposite of "1 °C below zero" (a loss, a fall …) as an integer
  (q, calc) => {
    const m = /opposite of "(?:a )?(\w+ )?(\d+)[^"]*?\b(below|above|loss|gain|fall|rise|down|up)\b[^"]*"/.exec(q.prompt) ?? /opposite of "(?:a )?(\w+ )?(?:(below|above|loss|gain|fall|rise|down|up) (?:of )?)(\d+)[^"]*"/.exec(q.prompt);
    if (!m) return null;
    const n = Number(/\d+/.exec(m[0])![0]); const neg = /below|loss|fall|down/.test(m[0].replace(/^opposite of "/, ""));
    return { value: calc.mul(calc.given(-1), calc.given(neg ? -n : n)).v, route: "opposite" };
  },
  // a matrix product A·B, entry by entry with the child's own facts
  (q, calc) => {
    const m = /A = (\[\[.*?\]\]) and B = (\[\[.*?\]\])\. Find AB/.exec(q.prompt); if (!m) return null;
    const A = JSON.parse(m[1].replace(/−/g, "-")) as number[][], B = JSON.parse(m[2].replace(/−/g, "-")) as number[][];
    const rows = A.map((r) => B[0].map((_, j) => r.map((a, k) => calc.mul(calc.given(a), calc.given(B[k][j]))).reduce((s, x) => calc.add(s, x)).v));
    return { value: null, text: `[${rows.map((r) => `[${r.join(", ")}]`).join(", ")}]`, route: "matrix product" };
  },
];

/** base-ten blocks in the question's own picture */
function fromFigure(q: Question, calc: Calc): { value: number; route: string } | null {
  const f = q.figure as { type?: string; hundreds?: number; tens?: number; ones?: number } | undefined;
  if (f?.type !== "blocks" || !/What number do the blocks in the picture show/.test(q.prompt)) return null;
  let v = calc.mul(calc.given(f.tens ?? 0), calc.given(10));
  if (f.hundreds) v = calc.add(calc.mul(calc.given(f.hundreds), calc.given(100)), v);
  return { value: calc.add(v, calc.given(f.ones ?? 0)).v, route: "count blocks" };
}

const NUMBER_WORDS: Record<string, number> = { none: 0, zero: 0, one: 1, two: 2, three: 3 };
/** the option a child picks for its own value: the one that says it; otherwise the nearest number (noted) — never the key */
export function pickOption(options: string[], value: number | null, text: string | null): { letter: string; note?: string } | null {
  const norm = (x: string) => x.replace(/[−–]/g, "-").replace(/\s+/g, "").toLowerCase();
  const asNum = (x: string) => { const n = norm(x); return n in NUMBER_WORDS ? NUMBER_WORDS[n] : /^-?\d+(\.\d+)?$/.test(n) ? Number(n) : null; };
  const want = text ?? (value === null ? null : fmt(value));
  if (want === null) return null;
  const k = options.findIndex((o) => norm(o) === norm(want) || (value !== null && asNum(o) === value));
  if (k >= 0) return { letter: String.fromCharCode(65 + k) };
  if (value === null) return null;
  let best = -1, gap = Infinity;
  options.forEach((o, j) => { const n = asNum(o); if (n !== null && Math.abs(n - value) < gap) { gap = Math.abs(n - value); best = j; } });
  return best >= 0 ? { letter: String.fromCharCode(65 + best), note: `its own value ${want} is not offered; picks the nearest` } : null;
}

/** how this child works the question out (with its facts), or why it cannot */
export function work(q: Question, ops: Ops): Worked {
  const calc = new Calc(ops);
  let value: number | null = null, text: string | null = null, route = "";
  const shaped = SHAPES.map((s) => s(q, calc)).find((x) => x !== null) ?? fromFigure(q, calc);
  if (shaped) { value = shaped.value; text = "text" in shaped && shaped.text !== undefined ? shaped.text : null; route = shaped.route; if (value === null && text === null) return { ok: false, why: `${route}: no answer found` }; }
  else {
    const src = askedCalculation(q.prompt);
    const v = src === null ? null : evaluate(src, calc);
    if (!v) return { ok: false, why: "no calculation or known shape in the question's words" };
    value = v.v; route = `calculation ${src}`;
  }
  if (q.type === "choice") {
    if (!q.options) return { ok: false, why: "a choice with no options" };
    const pick = pickOption(q.options, value, text);
    return pick ? { ok: true, work: { route, steps: calc.steps, text: pick.letter, ...(pick.note ? { note: pick.note } : {}) } } : { ok: false, why: "no option matches the child's value" };
  }
  const out = text ?? (value === null ? null : fmt(value));
  return out === null ? { ok: false, why: "the child's value cannot be written as an answer" } : { ok: true, work: { route, steps: calc.steps, text: out } };
}
