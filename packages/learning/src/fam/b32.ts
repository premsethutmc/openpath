/**
 * Families b32 (families@2): proof by mathematical induction, worked with numbers (Classes 11–12).
 *   aind  the inductive step in numbers: from the statement at n = k, what the statement says at n = k + 1
 *     form 0  1 + 2 + … + n = n(n + 1)/2            (add the next term k + 1)
 *     form 1  1 + 3 + … + (2n − 1) = n²             (add the next odd number 2k + 1)
 *     form 2  1² + 2² + … + n² = n(n + 1)(2n + 1)/6 (add the next square (k + 1)²)
 *     form 3  4ⁿ − 1 is divisible by 3              (4ᵏ⁺¹ − 1 = 4(4ᵏ − 1) + 3 = 3(4m + 1))
 * A whole proof is written, not typed; these questions practise its working part, the step from k to k + 1, with
 * numbers, so a child can type each step and a computer can check it. All wording is OpenPath's own.
 */
import type { Bug, Def, Step, Value } from "../family-kit";

const IND = "MATH.reasoning.mathematical-induction";
const none = () => null;
const st = (id: string, op: string, inputs: (number | string)[], value: number | string): Step => ({ id, op, competency: IND, inputs, value });

const sumTo = (k: number) => (k * (k + 1)) / 2;
const sq = (k: number) => (k * (k + 1) * (2 * k + 1)) / 6;
/** The statement's left side at k (the sum so far, or m with 4ᵏ − 1 = 3m). */
const known = (f: number, k: number) => (f === 0 ? sumTo(k) : f === 1 ? k * k : f === 2 ? sq(k) : (4 ** k - 1) / 3);
/** The next term added in the step from k to k + 1 (form 3: none). */
const nextTerm = (f: number, k: number) => (f === 0 ? k + 1 : f === 1 ? 2 * k + 1 : f === 2 ? (k + 1) ** 2 : 0);
const answerOf = (f: number, k: number) => (f === 3 ? 4 * known(3, k) + 1 : known(f, k) + nextTerm(f, k));

const STATEMENT = ["1 + 2 + … + n = n(n + 1)/2", "1 + 3 + 5 + … + (2n − 1) = n²", "1² + 2² + … + n² = n(n + 1)(2n + 1)/6", "4ⁿ − 1 is divisible by 3"];

/** Explanations that predict the right answer, a negative or non-whole number, or the same wrong answer twice are dropped. */
const differ = (answer: Value, list: Bug[]): Bug[] => {
  const seen = new Set<string>([String(answer)]);
  return list.filter((b) => {
    if (b.predict === null || (typeof b.predict === "number" && (!Number.isInteger(b.predict) || b.predict < 0))) return false;
    const key = String(b.predict);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export const B32: Def[] = [
  {
    id: "aind",
    arity: 2,
    title: "The inductive step, in numbers",
    competency: IND,
    type: "integer",
    mc: true,
    parse: none,
    reject: ([f, k]) => (![0, 1, 2, 3].includes(f) || !Number.isInteger(k) || k < 1 || k > (f === 3 ? 7 : f === 2 ? 20 : 40) ? "Forms 0 to 3; k from 1 to 40 (20 for squares, 7 for powers of 4)." : null),
    prompt: ([f, k]) =>
      f === 3
        ? `We prove that 4ⁿ − 1 is divisible by 3 by induction. Suppose it is true for n = k = ${k}: 4^${k} − 1 = 3m with m = ${known(3, k)}. Then 4^${k + 1} − 1 = 4(4^${k} − 1) + 3 = 3 × ?. Find the number that goes in place of the ?.`
        : `We prove ${STATEMENT[f]} by induction. Suppose it is true for n = k = ${k}, so the sum up to n = ${k} is ${known(f, k)}. In the step to n = ${k + 1}, what is the sum up to n = ${k + 1}?`,
    solve: ([f, k]) => {
      if (f === 3) {
        const m = known(3, k);
        return { steps: [st("times4", "multiply", [4, 3 * m], 12 * m), st("plus3", "add", [12 * m, 3], 12 * m + 3), st("divide3", "divide", [12 * m + 3, 3], 4 * m + 1)], answer: 4 * m + 1 };
      }
      const t = nextTerm(f, k);
      return { steps: [st("next", "evaluate", [k + 1], t), st("sum", "add", [known(f, k), t], known(f, k) + t)], answer: known(f, k) + t };
    },
    // independent: add the terms one by one (or work out 4ᵏ⁺¹ − 1 directly and divide by 3)
    validate: ([f, k], v) => {
      if (f === 3) return v === (4 ** (k + 1) - 1) / 3;
      let s = 0;
      for (let i = 1; i <= k + 1; i++) s += f === 0 ? i : f === 1 ? 2 * i - 1 : i * i;
      return v === s;
    },
    bugs: ([f, k]) =>
      differ(answerOf(f, k), f === 3
        ? [
            { id: "forgot-plus-three", kind: "procedural", competency: IND, says: "The + 3 was left out: 4(4ᵏ − 1) is only part of 4ᵏ⁺¹ − 1, which is 4(4ᵏ − 1) + 3.", predict: 4 * known(3, k) },
            { id: "did-not-divide", kind: "procedural", competency: IND, says: "The whole of 4ᵏ⁺¹ − 1 was given; the question asks what it is 3 times.", predict: 4 ** (k + 1) - 1 },
            { id: "kept-m", kind: "conceptual", competency: IND, says: "The m for n = k was given again; the step to k + 1 needs the new number, 4m + 1.", predict: known(3, k) },
          ]
        : [
            { id: "no-next-term", kind: "conceptual", competency: IND, says: "The sum for n = k was given again; the step to k + 1 adds the next term.", predict: known(f, k) },
            { id: "term-for-k", kind: "procedural", competency: IND, says: "The term for n = k was added again; the next term is the one for n = k + 1.", predict: known(f, k) + (f === 0 ? k : f === 1 ? 2 * k - 1 : k * k) },
            { id: "formula-at-k", kind: "procedural", competency: IND, says: "k + 1 was put only into part of the formula; put n = k + 1 into every n.", predict: f === 0 ? (k * (k + 2)) / 2 : f === 1 ? k * (k + 1) : null },
          ]),
    distractors: ([f, k]) => [answerOf(f, k) + 1, answerOf(f, k) + 2, Math.max(1, answerOf(f, k) - 1)],
    variants: ([f, k]) => [[f, k + 1 > (f === 3 ? 7 : f === 2 ? 20 : 40) ? k - 1 : k + 1]],
    stepWhy: (s) => {
      const w: Record<string, string[]> = { "next": ["In the induction step we go from k to k + 1, which adds one more term to the sum."], "sum": ["The sum up to k + 1 is the sum up to k, which we assume is known, plus the new term."], "times4": ["4ᵏ⁺¹ − 1 can be written as 4(4ᵏ − 1) + 3, and we already know 4ᵏ − 1 is 3m."], "plus3": ["The + 3 is the rest of 4ᵏ⁺¹ − 1."], "divide3": ["Showing it is 3 times a whole number proves it is divisible by 3."] };
      return w[`${s.id}|${s.op}`] ?? w[s.id] ?? w[`${s.id.replace(/\d+$/, "#")}|${s.op}`] ?? w[s.id.replace(/\d+$/, "#")] ?? w["*"] ?? null;
    },
    explain: (s) =>
      s.id === "next"
        ? `The next term, for n = ${s.inputs[0]}: ${s.value}`
        : s.id === "sum"
          ? `Add it to the sum so far: ${s.inputs[0]} + ${s.inputs[1]} = ${s.value}`
          : s.id === "times4"
            ? `4(4ᵏ − 1) = 4 × ${s.inputs[1]} = ${s.value}`
            : s.id === "plus3"
              ? `Add 3: ${s.inputs[0]} + 3 = ${s.value}`
              : `Divide by 3: ${s.inputs[0]} ÷ 3 = ${s.value}`,
    domain: [[0, 3], [1, 40]],
    keep: ([f, k]) => k <= (f === 3 ? 7 : f === 2 ? 20 : 40),
    difficulty: ([f, k]) => (f === 3 || (f === 2 && k > 10) ? 3 : k > 20 ? 2 : 1),
    teach: {
      idea: "Induction is like a row of dominoes: show the first one falls (n = 1), and show that whenever one falls, the next one falls too (from k to k + 1). Then every one falls.",
      method: "The step from k to k + 1: start from what is true at k, and build the next case from it. For a sum, the sum up to k + 1 is the sum up to k plus the next term. Then check it equals the formula at n = k + 1.",
      alternatives: [
        { id: "build_next", title: "Build the next one from this one", kind: "procedural", text: ["Write what you know for n = k.", "Add the one new piece that n = k + 1 brings (the next term), and simplify.", "Check: it must equal the formula with n = k + 1."] },
      ],
    },
    limits: "The step from k to k + 1 in numbers, for four statements; writing a whole proof is practised in the written tasks.",
  },
];
