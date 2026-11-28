/**
 * child-lab@1: simulated children who make real, step-level slips (the Class 10 recovery audit, Nov 2026).
 *
 * A lab child never looks at a question's skill id. It carries a set of faulty operations (a slip catalogue drawn from the
 * well-known patterns of children's arithmetic errors) and works every question the way a child would: a plain
 * calculation in the prompt is evaluated with its own operations; a generated problem has its numeric step chain re-run
 * with its own operations, each wrong value carried into the later steps. A question it cannot work out this way it
 * answers right (so the lab under-counts a child's trouble; it never invents it). A lesson repairs a slip only when the
 * lesson's skill is the one that slip belongs to, and only when teaching takes for that child.
 */
import { question } from "../content";
import { problemOf } from "../families";
import { graph } from "../graph";

export type Op = "mul" | "div" | "add" | "sub" | "pow";
export interface Slip {
  id: string;
  /** what the child does, in plain words (shown on the owner's lab page) */
  says: string;
  /** the wrong result this slip gives for one operation, or null when the slip does not touch it */
  faulty: (op: Op, a: number, b: number) => number | null;
  /** the skill whose lesson repairs it */
  repairedBy: string;
}
const int = (...x: number[]) => x.every(Number.isInteger);
const digits = (n: number) => String(Math.abs(n)).split("").reverse().map(Number);
/** column addition with every carry dropped: 47 + 38 = 75 */
function noCarry(a: number, b: number) { const x = digits(a), y = digits(b); let out = ""; for (let i = 0; i < Math.max(x.length, y.length); i++) out = String(((x[i] ?? 0) + (y[i] ?? 0)) % 10) + out; return Number(out); }
/** column subtraction taking the smaller digit from the larger in every column: 52 − 27 = 35 */
function smallerFromLarger(a: number, b: number) { const x = digits(a), y = digits(b); let out = ""; for (let i = 0; i < x.length; i++) out = String(Math.abs((x[i] ?? 0) - (y[i] ?? 0))) + out; return Number(out); }

export const SLIPS: Record<string, Slip> = {
  signMul: { id: "signMul", says: "drops the minus sign when exactly one number in a product or quotient is negative (4 × (−20) = 80)", repairedBy: "MATH.number.integer-multiply",
    faulty: (op, a, b) => ((op === "mul" || op === "div") && (a < 0) !== (b < 0) && a !== 0 && b !== 0 ? Math.abs(op === "mul" ? a * b : a / b) : null) },
  subNeg: { id: "subNeg", says: "subtracts a negative number as if it were positive (16 − (−80) = −64)", repairedBy: "MATH.number.integer-add",
    faulty: (op, a, b) => (op === "sub" && b < 0 ? a + b : null) },
  fact78: { id: "fact78", says: "recalls 7 × 8 as 54 (and so 56 ÷ 7 as 9)", repairedBy: "MATH.number.multiplication-tables",
    faulty: (op, a, b) => op === "mul" && [Math.abs(a), Math.abs(b)].sort((p, q) => p - q).join() === "7,8" ? Math.sign(a * b) * 54 : op === "div" && Math.abs(a) === 56 && [7, 8].includes(Math.abs(b)) ? Math.sign(a / b) * (Math.abs(b) === 7 ? 9 : 6) : null },
  tables78: { id: "tables78", says: "every 7 and 8 times-table fact is two short (7 × 6 = 40); dividing by 7 or 8 gives one too many", repairedBy: "MATH.number.multiplication-tables",
    faulty: (op, a, b) => op === "mul" && int(a, b) && a > 0 && b > 0 && a <= 10 && b <= 10 && [a, b].some((x) => x === 7 || x === 8) ? a * b - 2 : op === "div" && (b === 7 || b === 8) && a > 0 && int(a / b) && a / b <= 10 ? a / b + 1 : null },
  powAsMul: { id: "powAsMul", says: "works out a power as a product (7² = 14)", repairedBy: "MATH.number.exponents",
    faulty: (op, a, b) => (op === "pow" && int(b) && b >= 2 && a !== 0 && a ** b !== a * b ? a * b : null) },
  noCarry: { id: "noCarry", says: "adds column by column and never carries (47 + 38 = 75)", repairedBy: "MATH.number.addition-regroup",
    faulty: (op, a, b) => (op === "add" && a > 0 && b > 0 && int(a, b) && noCarry(a, b) !== a + b ? noCarry(a, b) : null) },
  smallerFromLarger: { id: "smallerFromLarger", says: "in each column takes the smaller digit from the larger instead of borrowing (52 − 27 = 35)", repairedBy: "MATH.number.subtraction-regroup",
    faulty: (op, a, b) => (op === "sub" && a > b && b > 0 && int(a, b) && smallerFromLarger(a, b) !== a - b ? smallerFromLarger(a, b) : null) },
};

const exact = (op: Op, a: number, b: number) => (op === "mul" ? a * b : op === "div" ? a / b : op === "add" ? a + b : op === "pow" ? a ** b : a - b);
const STEP_OP: Record<string, Op> = { multiply: "mul", divide: "div", add: "add", subtract: "sub" };

export interface ChildOptions {
  /** false: lessons never repair a slip (teaching that does not take) */
  teachingWorks?: boolean;
  /** a repaired slip comes back this many days after its lesson */
  forgetAfterDays?: number;
  /** answers every question with a guess from a fixed sequence, whatever it knows */
  guesser?: boolean;
  /** the child's own answer for a question, before anything else (to stage a particular reading) */
  override?: (qid: string) => string | null;
}
const DAY = 86_400_000;
export class LabChild {
  active = new Map<string, Slip>();
  repairedAt = new Map<string, number>();
  private guesses = 0;
  opts: ChildOptions;
  constructor(slips: string[], opts: ChildOptions = {}) { this.opts = opts; for (const s of slips) this.active.set(s, SLIPS[s]); }
  /** a lesson on a skill repairs the slips that skill addresses (unless teaching does not take for this child) */
  taught(competency: string, now: number) {
    if (this.opts.teachingWorks === false) return;
    const t = graph.byId.has(competency) ? graph.evidenceTarget(competency) : competency;
    for (const s of [...this.active.values()]) if (s.repairedBy === t || s.repairedBy === competency) { this.active.delete(s.id); this.repairedAt.set(s.id, now); }
  }
  /** slips whose lesson is older than the child's memory come back */
  forget(now: number) { const d = this.opts.forgetAfterDays; if (!d) return; for (const [id, at] of this.repairedAt) if (now - at >= d * DAY) { this.active.set(id, SLIPS[id]); this.repairedAt.delete(id); } }
  op(op: Op, a: number, b: number): number { for (const s of this.active.values()) { const f = s.faulty(op, a, b); if (f !== null) return f; } return exact(op, a, b); }
  /** a plain arithmetic expression worked with this child's operations (null: not a plain expression) */
  evalExpr(src: string, ops: (op: Op, a: number, b: number) => number = (o, a, b) => this.op(o, a, b)): number | null {
    const s = src.replace(/−/g, "-").replace(/×/g, "*").replace(/÷/g, "/").replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]+/g, (m) => "^" + [...m].map((c) => "⁰¹²³⁴⁵⁶⁷⁸⁹".indexOf(c)).join("")).replace(/\s+/g, "");
    if (!/^[-+*/^().\d]+$/.test(s)) return null;
    let i = 0;
    const num = (): number => { if (s[i] === "(") { i++; const v = expr(); i++; return v; } if (s[i] === "-") { i++; return -num(); } const m = /^\d+(\.\d+)?/.exec(s.slice(i)); if (!m) throw new Error("x"); i += m[0].length; return Number(m[0]); };
    const pow = (): number => { let b = num(); while (s[i] === "^") { i++; b = ops("pow", b, num()); } return b; };
    const term = (): number => { let v = pow(); while (s[i] === "*" || s[i] === "/") { const o = s[i++]; v = ops(o === "*" ? "mul" : "div", v, pow()); } return v; };
    const expr = (): number => { let v = term(); while (s[i] === "+" || s[i] === "-") { const o = s[i++]; v = ops(o === "+" ? "add" : "sub", v, term()); } return v; };
    try { const v = expr(); return i === s.length ? v : null; } catch { return null; }
  }
  private promptValue(prompt: string): string | null | undefined {
    const m = /^(?:Work out\s*)?(.+?)\s*(?:=\s*\?|\.)?\s*$/.exec(prompt.split(/ Choose/)[0].trim());
    if (!m) return undefined;
    const mine = this.evalExpr(m[1]); if (mine === null) return undefined;
    const right = this.evalExpr(m[1], exact);
    return mine === right ? null : String(mine);
  }
  /** this child's value for a question: null when it gets it right (or cannot work it out) */
  value(qid: string): string | null {
    const base = qid.replace(/:(mc|w)$/, "");
    const q = question(base), p = problemOf(base);
    // a plain calculation the child can do in one go (13 + 19 = ?) is done that way; otherwise its steps are worked one by one
    const whole = this.promptValue(q.prompt);
    if (whole) return whole;
    if (p?.steps?.length) {
      const sub = new Map<number, number>(); let wrong = false; let last: number | null = null;
      for (const st of p.steps) {
        const ins = st.inputs.map((x) => (typeof x === "number" && sub.has(x) ? sub.get(x)! : x));
        const v = typeof st.value === "number" ? st.value : null;
        let mine: number | null = null;
        if (v !== null && ins.length === 2 && ins.every((x) => typeof x === "number")) {
          const [a, b] = ins as number[], [a0, b0] = st.inputs as number[];
          const o = STEP_OP[st.op];
          if (o && exact(o, a0, b0) === v) mine = this.op(o, a, b);
          else if (st.op === "evaluate" && a0 ** b0 === v) mine = this.op("pow", a, b);
        } else if (st.op === "compare" && ins.length === 1 && typeof ins[0] === "number" && v !== null && [0, 1, 2].includes(v)) mine = (ins[0] as number) > 0 ? 2 : ins[0] === 0 ? 1 : 0;
        if (mine !== null && v !== null) { if (mine !== v) { wrong = true; sub.set(v, mine); } last = mine; } else last = v;
      }
      if (!wrong) return null;
      return last !== null && typeof p.steps.at(-1)!.value === "number" ? String(last) : "WRONG";
    }
    return null;
  }
  answer(qid: string): string {
    const o = this.opts.override?.(qid); if (o != null) return o;
    const q = question(qid);
    if (this.opts.guesser) { this.guesses++; if (q.type === "choice" && q.options) return String.fromCharCode(65 + (this.guesses % q.options.length)); return String((this.guesses * 7) % 23); }
    const v = this.value(qid);
    if (v === null) return q.answer;
    if (q.type === "choice" && q.options) { const k = q.options.findIndex((x) => x.replace(/−/g, "-") === v); const right = q.answer.charCodeAt(0) - 65; return String.fromCharCode(65 + (k >= 0 ? k : (right + 1) % q.options.length)); }
    return v === "WRONG" ? "123456" : v;
  }
}
