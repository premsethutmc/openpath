/**
 * The family kit (families@2): the contract every problem family implements, and the helpers families share. A
 * family lives in families.ts (the first families) or in fam/<domain>.ts; families.ts collects them all.
 */
import type { AnswerType } from "./answer-types";

/** A value: a number, a set of numbers (type "set"), or an answer written in its type's own form (answers@2: "2√3",
 * "(3, −2)", "x > 3", "2x cos(x²)"), compared by that type's rules. */
export type Value = number | number[] | string;
export interface Step {
  id: string;
  /** What the step does (multiply, simplify, factorise, differentiate, substitute, convert, count, measure …). */
  op: string;
  competency: string;
  inputs: (number | string)[];
  value: Value;
}
export interface Bug {
  id: string;
  kind: "conceptual" | "procedural" | "recall" | "prerequisite";
  /** The competency whose teaching addresses this explanation. */
  competency: string;
  /** Learner-facing description of the explanation (no jargon). */
  says: string;
  /** What a learner with this misunderstanding answers here (one value or several possibilities); null: no prediction. */
  predict: Value | null;
  /** A question of another family that tests this explanation directly (e.g. the multiplication fact itself). */
  probe?: string;
}
export interface Problem {
  family: string;
  id: string;
  params: number[];
  competency: string;
  /** The micro-skill (or the competency itself). */
  skill: string;
  /** "typed" (the learner writes the answer), "mc" (chooses among the answer and mal-rule answers), or "word" (the
   * same mathematics in an everyday situation: a transfer context, "gen:<family>:<params>:w"). */
  form: "typed" | "mc" | "word";
  prompt: string;
  type: AnswerType;
  answer: string;
  steps: Step[];
  bugs: Bug[];
  options?: string[];
  /** A picture the question needs (dots to count, a clock to read, a bar chart, an angle …). */
  figure?: Visual;
}
/** A picture for a teaching screen (rendered by the app; ten frames, base-ten blocks, number lines, fraction strips,
 * arrays, a grid of squares, a right triangle, a balance). */
export interface Visual {
  type: "strips" | "array" | "dots" | "tenframe" | "blocks" | "numberline" | "clock" | "coins" | "bars" | "pictograph" | "table" | "shape" | "angle" | "circle" | "grid" | "triangle" | "plane" | "pie" | "balance" | "solid";
  [k: string]: unknown;
}
export interface TeachAlternative {
  id: string;
  title: string;
  kind: Bug["kind"];
  text: string[];
  /** A picture for this way of explaining, for a worked example's parameters. */
  visual?: (p: number[]) => Visual | null;
}
export type Def = {
  id: string;
  /** How many parameters a stored id carries. */
  arity: number;
  title: string;
  competency: string;
  /** The micro-skill the family practises, when finer than its competency. */
  skill?: string;
  type: Problem["type"];
  /** The family also has a multiple-choice form ("gen:<family>:<params>:mc"): mal-rule answers as the options. */
  mc?: boolean;
  /** Read the parameters from written text; null if the text is not this family. */
  parse: (t: string) => number[] | null;
  /** Reject parameters outside what the family supports (a reason), or accept (null). */
  reject: (p: number[]) => string | null;
  prompt: (p: number[]) => string;
  solve: (p: number[]) => { steps: Step[]; answer: Value };
  validate: (p: number[], answer: Value) => boolean;
  bugs: (p: number[]) => Bug[];
  variants: (p: number[]) => number[][];
  explain: (s: Step) => string;
  // ---- the family specification (spec@1, spec.ts): what an educator approves for release
  /** The approved generation space: inclusive ranges per parameter (filtered by `keep`, then by `reject`). */
  domain?: [number, number][];
  /** A narrower choice within the domain ranges (the release pool); reject still applies. */
  keep?: (p: number[]) => boolean;
  /** Difficulty classification of a parameter choice: 1 easier, 2 typical, 3 harder. */
  difficulty?: (p: number[]) => 1 | 2 | 3;
  /** Teaching hints for template strategies: the idea, and the method; alternatives are further ways of explaining
   * (template@2); `visual` draws a worked example's parameters for younger learners. */
  teach?: { idea: string; method: string; alternatives?: TeachAlternative[]; visual?: (p: number[]) => Visual | null };
  // ---- families@2
  /** A picture the question needs (it is part of the question, and of its specification). */
  figure?: (p: number[]) => Visual | null;
  /** The same problem in an everyday situation (the transfer form, "gen:<family>:<params>:w"). */
  word?: (p: number[]) => string;
  /** For type "choice": the family's own options for these parameters (words or expressions: "North", "a square",
   * "y = 2x + 1"); `solve` returns the index of the right one (0 = A), explanations predict indices. */
  choices?: (p: number[]) => string[];
  /** Extra wrong options for the multiple-choice form when the explanations predict too few (answers@2 types). */
  distractors?: (p: number[]) => Value[];
  /** Show terminating answers and options as decimals (money, measures, statistics), not as fractions. */
  decimals?: boolean;
  /** At most this many problems in the release pool (a fixed, hash-chosen subset of the candidates). */
  cap?: number;
  /** Where the family's domain is a deliberate limit, why (shown to reviewers). */
  limits?: string;
};

// ---------------------------------------------------------------- shared helpers

export const MT = "MATH.number.multiplication-tables";
export const EXP = "MATH.number.exponents";
export const SUP: Record<string, string> = { "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹", "-": "⁻" };
/** A number as written in a step: "−" for minus, and in brackets when negative (so (−1)² is not read as −1²). */
export const neg = (t: string | number) => String(t).replace(/^-/, "−");
export const par = (v: string | number) => (Number(v) < 0 ? `(${neg(v)})` : String(v));
export const sup = (n: number | string) => String(n).replace(/./g, (c) => SUP[c] ?? c);
/** x to a power, as written: x, x², x³ … */
export const xp = (n: number) => (n === 1 ? "x" : `x${String(n).replace(/./g, (c) => SUP[c])}`);
export const coef = (k: number) => (k === 1 ? "" : String(k));
export const signed = (v: number) => `${v < 0 ? "−" : "+"} ${Math.abs(v)}`;
export const SUPREAD: Record<string, string> = { "²": "^2", "³": "^3", "⁴": "^4", "⁵": "^5", "⁶": "^6", "⁷": "^7", "⁸": "^8", "⁹": "^9" };
/** Superscript powers → ^n, for reading written problems. */
export const unsup = (t: string) => t.replace(/[²³⁴⁵⁶⁷⁸⁹]/g, (c) => SUPREAD[c]);
export const powerOf = (a: number, n: number) => {
  let v = 1;
  for (let i = 0; i < n; i++) v *= a;
  return v;
};
/** The definite integral of g over [a, b] by Simpson's rule (an independent numerical check). */
export const simpson = (g: (x: number) => number, a: number, b: number, n = 2000) => {
  const h = (b - a) / n;
  let s = g(a) + g(b);
  for (let i = 1; i < n; i++) s += (i % 2 ? 4 : 2) * g(a + i * h);
  return (s * h) / 3;
};
export const near = (x: number, y: number, rel = 1e-7) => Math.abs(x - y) <= rel * Math.max(1, Math.abs(x), Math.abs(y));
export const powerSlip = (a: number, n: number, predict: Value | null, kind: Bug["kind"] = "prerequisite"): Bug => ({
  id: "multiply-for-power",
  kind,
  competency: EXP,
  says: `A power was worked out as a multiplication (${a}${String(n).replace(/./g, (c) => SUP[c])} as ${a} × ${n}); a power multiplies ${a} by itself ${n} times.`,
  predict,
  ...(a >= 2 && a <= 12 && n >= 2 && n <= 5 ? { probe: `gen:pow:${a},${n}` } : {}),
});
export const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : Math.abs(a));
export const show = (v: Value): string => (typeof v === "string" ? v : Array.isArray(v) ? [...v].sort((a, b) => a - b).map(fmt).join(",") : fmt(v));
export function fmt(x: number): string {
  if (Number.isInteger(x)) return String(x);
  for (let d = 2; d <= 1000; d++) {
    const n = Math.round(x * d);
    if (Math.abs(n / d - x) < 1e-9) {
      const g = gcd(n, d);
      return `${n / g}/${d / g}`;
    }
  }
  return String(x);
}
/** Facts next to a × b that a learner who misremembers it often gives (neighbouring rows and columns). */
export const neighbours = (a: number, b: number) =>
  [...new Set([a * (b + 1), a * (b - 1), (a + 1) * b, (a - 1) * b, (a - 1) * (b + 1), (a + 1) * (b - 1)])].filter((v) => v > 0 && v !== a * b);
export const mul = (a: number, b: number, competency = MT, id = "product"): Step => ({ id, op: "multiply", competency, inputs: [a, b], value: a * b });
/** A specific fact, the same id whichever problem uses it (7 × 8 and 8 × 7 are one fact). */
export const factId = (a: number, b: number) => `fact-slip:${Math.min(a, b)}x${Math.max(a, b)}`;
export const factSlip = (a: number, b: number, scale = 1, extra = 0, target = MT): Bug => ({
  id: factId(a, b),
  kind: target === MT ? "prerequisite" : "recall",
  competency: MT,
  says: `A multiplication fact (${a} × ${b}) is not yet reliable.`,
  predict: neighbours(a, b).map((v) => v * scale + extra),
  ...(a >= 1 && b >= 1 && a <= 12 && b <= 12 ? { probe: `gen:mul:${a},${b}` } : {}),
});
export const addForMul = (a: number, b: number, scale = 1, extra = 0): Bug => ({ id: "add-for-multiply", kind: "conceptual", competency: MT, says: `${a} × ${b} was added instead of multiplied.`, predict: (a + b) * scale + extra, probe: `gen:mul:${a},${b}` });
export const int = (s: string) => Number(s.replace(/−/g, "-").replace(/\s+/g, ""));
export const norm = (t: string) => t.replace(/−/g, "-").replace(/\s+/g, " ").replace(/[“”]/g, '"').trim();
export const pairs = (p: number[], ranges: [number, number][], keep: (q: number[]) => boolean) => {
  const out: number[][] = [];
  const rec = (i: number, acc: number[]) => {
    if (i === ranges.length) return keep(acc) && JSON.stringify(acc) !== JSON.stringify(p) && out.push([...acc]);
    for (let v = ranges[i][0]; v <= ranges[i][1]; v++) rec(i + 1, [...acc, v]);
  };
  rec(0, []);
  return out;
};

