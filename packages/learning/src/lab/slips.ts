/**
 * child-lab@2: simulated children who make real, step-level slips (the Class 10 recovery audit, Nov 2026; harness integrity
 * correction, 28 Nov 2026).
 *
 * A lab child never looks at a question's answer, worked solution, generator parameters or skill id. It carries a set of
 * faulty operations (a slip catalogue drawn from well-known patterns of children's arithmetic errors) and works a question
 * from its words and picture with its own facts (./work.ts). Every response says where it came from:
 *   - computed: worked out with the child's own facts (the steps and the slips that fired are kept);
 *   - unsupported: the lab cannot work this question; the child answers "?" (graded unresolved: no credit, no penalty).
 *     The lab never answers right on the child's behalf;
 *   - guessed: from a fixed sequence, whatever the question;
 *   - memorized: an answer the child remembers for one particular question, whatever its facts say;
 *   - staged: a response the scenario sets for one question (to stage a reading the slips cannot produce).
 *
 * Whether a lesson repairs a slip is an assumption each scenario chooses explicitly (LearningPolicy). Being shown a lesson
 * is not evidence that it worked; the lab only models what happens if it does, or does not.
 */
import { question } from "../content";
import { graph } from "../graph";
import { exact, work, type Fact, type Op, type Step } from "./work";

export type { Op } from "./work";
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

/**
 * What a lesson does for this child — an assumption the scenario states, never something the lab claims:
 *   immediate: the first lesson on a slip's skill repairs it; delayed: the n-th lesson on it does; partial: only the listed
 *   slips can be repaired; unsuccessful: no lesson repairs anything; forgotten: repaired at once, back `afterDays` later.
 */
export type LearningPolicy =
  | { kind: "immediate" }
  | { kind: "delayed"; lessons: number }
  | { kind: "partial"; repairs: string[] }
  | { kind: "unsuccessful" }
  | { kind: "forgotten"; afterDays: number };
export const describePolicy = (p: LearningPolicy): string =>
  p.kind === "immediate" ? "assumed: the first lesson on the slip's skill repairs it"
    : p.kind === "delayed" ? `assumed: lesson ${p.lessons} on the slip's skill repairs it; earlier ones do not`
      : p.kind === "partial" ? `assumed: lessons repair only ${p.repairs.join(", ")}; the other slips stay`
        : p.kind === "unsuccessful" ? "assumed: no lesson repairs anything"
          : `assumed: the first lesson repairs the slip, and it comes back ${p.afterDays} days later`;

export type Provenance = "computed" | "unsupported" | "guessed" | "memorized" | "staged";
export interface Response {
  text: string;
  provenance: Provenance;
  /** computed: how the child worked it; the slips that changed a step */
  route?: string;
  steps?: Step[];
  fired?: string[];
  note?: string;
}
export interface ChildOptions {
  /** answers every question with a guess from a fixed sequence, whatever it knows */
  guesser?: boolean;
  /** an answer the child remembers for one question (memorized), or sets for one question (staged); null: its own work */
  remembers?: (qid: string) => string | null;
  stage?: (qid: string) => string | null;
}
const DAY = 86_400_000;
export class LabChild {
  active = new Map<string, Slip>();
  repairedAt = new Map<string, number>();
  lessons = new Map<string, number>();
  private guesses = 0;
  readonly policy: LearningPolicy;
  opts: ChildOptions;
  constructor(slips: string[], policy: LearningPolicy, opts: ChildOptions = {}) {
    this.policy = policy; this.opts = opts;
    for (const s of slips) { if (!SLIPS[s]) throw new Error(`child-lab: unknown slip ${s}`); this.active.set(s, SLIPS[s]); }
  }
  /** a lesson on a skill: under the scenario's learning policy it may repair the slips that skill addresses */
  taught(competency: string, now: number) {
    const t = graph.byId.has(competency) ? graph.evidenceTarget(competency) : competency;
    for (const s of [...this.active.values()]) {
      if (s.repairedBy !== t && s.repairedBy !== competency) continue;
      const n = (this.lessons.get(s.id) ?? 0) + 1; this.lessons.set(s.id, n);
      const p = this.policy;
      const repairs = p.kind === "immediate" || p.kind === "forgotten" ? true : p.kind === "delayed" ? n >= p.lessons : p.kind === "partial" ? p.repairs.includes(s.id) : false;
      if (repairs) { this.active.delete(s.id); this.repairedAt.set(s.id, now); }
    }
  }
  /** slips whose lesson is older than the child's memory come back (policy "forgotten" only) */
  forget(now: number) {
    if (this.policy.kind !== "forgotten") return;
    for (const [id, at] of this.repairedAt) if (now - at >= this.policy.afterDays * DAY) { this.active.set(id, SLIPS[id]); this.repairedAt.delete(id); }
  }
  /** one operation with this child's facts, and which slip changed it */
  fact(op: Op, a: number, b: number): Fact {
    for (const s of this.active.values()) { const f = s.faulty(op, a, b); if (f !== null) return { op, a, b, result: f, slip: s.id }; }
    return { op, a, b, result: exact(op, a, b), slip: null };
  }
  /** what this child would answer if it worked the question with its own facts (no guessing, no remembered answers) */
  compute(qid: string): Response {
    const q = question(qid);
    const w = work(q, this);
    if (!w.ok) return { text: "?", provenance: "unsupported", note: w.why };
    const fired = [...new Set(w.work.steps.map((s) => s.slip).filter((x): x is string => !!x))];
    return { text: w.work.text, provenance: "computed", route: w.work.route, steps: w.work.steps, fired, ...(w.work.note ? { note: w.work.note } : {}) };
  }
  answer(qid: string): Response {
    const st = this.opts.stage?.(qid); if (st != null) return { text: st, provenance: "staged" };
    const m = this.opts.remembers?.(qid); if (m != null) return { text: m, provenance: "memorized" };
    if (this.opts.guesser) {
      this.guesses++;
      const q = question(qid);
      return { text: q.type === "choice" && q.options ? String.fromCharCode(65 + (this.guesses % q.options.length)) : String((this.guesses * 7) % 23), provenance: "guessed" };
    }
    return this.compute(qid);
  }
}
