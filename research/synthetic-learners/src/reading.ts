/**
 * What the learner reads (synthetic-reading@1): the PROMPT TEXT and the visible answer options only. No question id, generator reference,
 * answer key or OpenPath estimate is ever read. A prompt the learner cannot make sense of is "not understood" (the learner then guesses).
 */
import { q, type Q } from "./rational";

export type Kind = "one-step" | "two-step" | "both-sides" | "brackets" | "modelling";
/** k(x + s) on the left when `bracket`; the equation is A x + B = C x + D after reading */
export interface Linear { bracket: { k: number; s: number } | null; a: number; b: number; c: number; d: number; op?: "divide" }
export type Task =
  | { kind: Exclude<Kind, "modelling">; eq: Linear; text: string }
  | { kind: "modelling"; mode: "choose" | "solve"; story: Story | null; text: string }
  | { kind: "unknown"; text: string };
export type Story =
  | { t: "think"; m: number; p: number; r: number }              // multiplies by m, adds p, result r: m x + p = r
  | { t: "buy"; n: number; p: number; r: number }                // n items at x each, one more for p, pays r: n x + p = r
  | { t: "share"; n: number; g: number; r: number }              // n boxes of x, gives away g, r left: n x − g = r
  | { t: "consecutive"; s: number }                              // x + (x+1) + (x+2) = s
  | { t: "times"; m: number; a: number; s: number }              // x + a + m x + a = s
  | { t: "rectangle"; a: number; p: number }                     // 2(x + x + a) = p
  | { t: "weighted"; m: number; w: number; r: number; s: number }; // m x + w(x + r) = s

const norm = (t: string) => t.replace(/[−–—]/g, "-").replace(/×/g, "*").replace(/÷/g, "/").replace(/\s+/g, " ").trim();
const WORDS: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12 };
const num = (w: string) => (/^\d+$/.test(w) ? Number(w) : WORDS[w.toLowerCase()] ?? NaN);

/** a side: sum of terms  N x | x | N | N(x ± M) | x / N */
function side(t: string): { x: number; c: number; bracket: { k: number; s: number } | null; divide: number | null } | null {
  const s = t.replace(/\s+/g, "");
  let m = /^(\d*)\(x([+-])(\d+)\)$/.exec(s);
  if (m) return { x: 0, c: 0, bracket: { k: m[1] ? Number(m[1]) : 1, s: (m[2] === "-" ? -1 : 1) * Number(m[3]) }, divide: null };
  m = /^x\/(\d+)$/.exec(s);
  if (m) return { x: 1, c: 0, bracket: null, divide: Number(m[1]) };
  const terms = s.replace(/-/g, "+-").split("+").filter((x) => x.length);
  let x = 0, c = 0;
  for (const term of terms) {
    const tx = /^(-?)(\d*)x$/.exec(term), tc = /^-?\d+$/.exec(term);
    if (tx) x += (tx[1] ? -1 : 1) * (tx[2] ? Number(tx[2]) : 1);
    else if (tc) c += Number(term);
    else return null;
  }
  return { x, c, bracket: null, divide: null };
}
export function readEquation(text: string): Linear | null {
  const parts = norm(text).split("=");
  if (parts.length !== 2) return null;
  const L = side(parts[0]), R = side(parts[1]);
  if (!L || !R || R.bracket || R.divide) return null;
  if (L.bracket) return { bracket: L.bracket, a: 0, b: 0, c: R.x, d: R.c };
  if (L.divide) return { bracket: null, a: 1, b: 0, c: 0, d: R.c, op: "divide" };   // x ÷ n = d  (read with the divisor kept in `b`-free form)
  return { bracket: null, a: L.x, b: L.c, c: R.x, d: R.c };
}
export const divisorOf = (text: string): number | null => { const m = /x\s*[÷/]\s*(\d+)/.exec(norm(text).replace(/\//g, "/")); return m ? Number(m[1]) : null; };

function story(t: string): Story | null {
  const s = norm(t);
  let m = /multiplies it by (\d+) and then adds (\d+)\. The result is (\d+)/.exec(s); if (m) return { t: "think", m: +m[1], p: +m[2], r: +m[3] };
  m = /buys (\d+) \w+ at ₹x each and one \w+ for ₹(\d+), and pays ₹(\d+)/.exec(s); if (m) return { t: "buy", n: +m[1], p: +m[2], r: +m[3] };
  m = /had (\d+) \w+ with x \w+ in each\. After giving away (\d+) \w+, \w+ has (\d+)/.exec(s); if (m) return { t: "share", n: +m[1], g: +m[2], r: +m[3] };
  m = /sum of three consecutive whole numbers is (\d+)/.exec(s); if (m) return { t: "consecutive", s: +m[1] };
  m = /One number is (\d+) times another\. When (\d+) is added to each of them, the two new numbers add up to (\d+)/.exec(s); if (m) return { t: "times", m: +m[1], a: +m[2], s: +m[3] };
  m = /length of a rectangle is (\d+) cm more than its width, and its perimeter is (\d+)/.exec(s); if (m) return { t: "rectangle", a: +m[1], p: +m[2] };
  m = /^(\w+) times a number, added to (\w+) times the number that is (\w+) more than it, gives (\d+)/.exec(s); if (m && [m[1], m[2], m[3]].every((w) => Number.isFinite(num(w)))) return { t: "weighted", m: num(m[1]), w: num(m[2]), r: num(m[3]), s: +m[4] };
  return null;
}
/** the learner's reading of a visible question */
export function readTask(prompt: string): Task {
  const p = norm(prompt);
  if (/Which equation describes/.test(p)) return { kind: "modelling", mode: "choose", story: story(p), text: p };
  if (/Form an equation/.test(p)) return { kind: "modelling", mode: "solve", story: story(p), text: p };
  const m = /^(?:Solve|Find x:)\s+(.*?)\.(?:\s+What is x\?)?(?:\s+Choose one\.)?$/.exec(p);
  const eq = m ? readEquation(m[1]) : null;
  if (!eq) return { kind: "unknown", text: p };
  const kind: Kind = eq.bracket ? "brackets" : eq.c !== 0 ? "both-sides" : (eq.a === 1 && eq.b !== 0) || (eq.b === 0 && eq.a !== 1) || eq.op ? "one-step" : "two-step";
  return { kind, eq: eq.op ? { ...eq, b: divisorOf(m![1]) ?? 1 } : eq, text: p };
}
export const asQ = (n: number): Q => q(n);
