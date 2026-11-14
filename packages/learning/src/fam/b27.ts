/**
 * Families b27 (families@2): times tables, so the "Times tables" skills have something to learn and practise.
 *   amf2510  facts for 2, 5 and 10 (a product, either order, or the missing number)   MLY.mult.facts-2-5-10
 *   amf34    facts for 3 and 4                                                          MLY.mult.facts-3-4
 *   amf69    facts for 6, 7, 8 and 9                                                    MLY.mult.facts-6-9
 *   amderive a new fact from a known one (one more group, one less, double)            MLY.mult.derive
 * All wording and contexts are OpenPath's own; nothing is taken from a textbook.
 */
import type { Bug, Def, Step, Value } from "../family-kit";
import { addForMul, factSlip } from "../family-kit";

const MT = "MATH.number.multiplication-tables";
const none = () => null;
const NAMES = ["Anu", "Ravi", "Meena", "Arjun", "Kavya", "Imran", "Divya", "Selvi", "Karthik", "Priya"];
const name = (k: number) => NAMES[((k % NAMES.length) + NAMES.length) % NAMES.length];
const THINGS = ["mangoes", "pencils", "laddoos", "marbles", "stickers", "bangles"];
const thing = (k: number) => THINGS[k % THINGS.length];
const keepPred = (bs: Bug[]) => bs.filter((b) => b.predict !== null && !(Array.isArray(b.predict) && b.predict.length === 0));

/** How a table is learnt: the trick for each table number. */
const TRICK: Record<number, string> = {
  2: "× 2 is doubling",
  3: "× 3 is double, then one more lot",
  4: "× 4 is double, then double again",
  5: "× 5 is half of × 10 (the answer ends in 0 or 5)",
  6: "× 6 is × 5 and one more lot",
  7: "× 7 is × 5 and two more lots",
  8: "× 8 is double, double and double again",
  9: "× 9 is × 10 take away one lot",
  10: "× 10 puts a 0 on the end",
};

/** One times-table family: [table index, other number, form]; form 0 t × b, 1 b × t, 2 t × ? = P, 3 ? × t = P. */
function facts(id: string, skill: string, title: string, tables: number[], lo: number, grade: number): Def {
  const T = (p: number[]) => tables[p[0]];
  return {
    id,
    arity: 3,
    title,
    competency: MT,
    skill,
    type: "integer",
    mc: true,
    parse: none,
    reject: ([i, b, f]) => (i < 0 || i >= tables.length || b < lo || b > 12 || f < 0 || f > 3 ? `Facts for ${tables.join(", ")} with the other number from ${lo} to 12.` : null),
    prompt: (p) => {
      const t = T(p), [, b, f] = p;
      return f === 0 ? `${t} × ${b} = ?` : f === 1 ? `${b} × ${t} = ?` : f === 2 ? `${t} × ? = ${t * b}. What is the missing number?` : `? × ${t} = ${t * b}. What is the missing number?`;
    },
    solve: (p) => {
      const t = T(p), [, b, f] = p;
      if (f < 2) {
        const [x, y] = f === 0 ? [t, b] : [b, t];
        return { steps: [{ id: "product", op: "multiply", competency: MT, inputs: [x, y], value: t * b } as Step], answer: t * b };
      }
      return { steps: [{ id: "missing", op: "divide", competency: MT, inputs: [t * b, t], value: b } as Step], answer: b };
    },
    // independent: count up in steps of the table number
    validate: (p, v) => {
      const t = T(p), [, b, f] = p;
      if (f < 2) { let s = 0; for (let k = 0; k < b; k++) s += t; return v === s; }
      let s = 0, n = 0;
      while (s < t * b) { s += t; n++; }
      return v === n;
    },
    bugs: (p) => {
      const t = T(p), [, b, f] = p;
      if (f < 2) return keepPred([{ ...factSlip(t, b), kind: "recall" }, addForMul(t, b)]);
      return keepPred([
        { id: "multiplied-shown", kind: "conceptual", competency: MT, says: `The two numbers shown were multiplied. The question asks which number times ${t} makes ${t * b}: count in ${t}s up to ${t * b}.`, predict: t * t * b !== b ? t * t * b : null },
        { id: "subtracted", kind: "conceptual", competency: MT, says: `${t} was taken away from ${t * b}. The missing number is how many ${t}s make ${t * b}, not the difference.`, predict: t * b - t !== b ? t * b - t : null },
        { id: "count-slip", kind: "recall", competency: MT, says: `Counting in ${t}s slipped by one step. Check: ${t} × ${b} = ${t * b}.`, predict: [b - 1, b + 1].filter((x) => x > 0), probe: `gen:mul:${t},${b}` },
      ]);
    },
    distractors: (p) => {
      const t = T(p), [, b, f] = p;
      return (f < 2 ? [t * (b + 1), t * (b - 1), t * b + 1] : [b + 2, b - 2, b + 1]).filter((x) => x > 0) as Value[];
    },
    variants: () => [],
    explain: (s) => (s.op === "divide" ? `${s.inputs[1]} × ${s.value} = ${s.inputs[0]}, so the missing number is ${s.value}` : `${s.inputs[0]} × ${s.inputs[1]} = ${s.value}`),
    domain: [[0, tables.length - 1], [lo, 12], [0, 3]],
    // one question shown once: t × t has no other order, and 5 × 2 belongs to the 2 table when both are here
    keep: ([i, b, f]) => f >= 2 || ((f === 0 || b !== tables[i]) && !(tables.includes(b) && b < tables[i])),
    cap: 300,
    difficulty: ([, b, f]) => (b <= 5 ? 1 : b <= 9 ? (f < 2 ? 2 : 3) : 3),
    grade: () => grade,
    problemKey: (p) => {
      const t = T(p), [, b, f] = p;
      return f < 2 ? `p:${Math.min(t, b)}x${Math.max(t, b)}` : `m:${t}x${b}`;
    },
    word: (p) => {
      const t = T(p), [, b, f] = p;
      return f < 2
        ? `${name(t + b)} puts ${t} ${thing(b)} in each of ${b} bags. How many ${thing(b)} is that altogether?`
        : `${name(t + b)} shares ${t * b} ${thing(b)} out in bags of ${t}. How many bags are filled?`;
    },
    teach: {
      idea: `${tables.map((t) => TRICK[t]).join("; ")}. ${"The order does not matter: 3 × 7 and 7 × 3 are the same fact."}`,
      method: "Say the fact if you know it. If not, start from one you do know (× 2, × 5 or × 10) and add or take away a lot. For a missing number, count in steps of the table number until you reach the answer, and count the steps.",
      visual: (p) => ({ type: "array", rows: Math.min(T(p), 10), cols: Math.min(p[1], 12) }),
      alternatives: [
        { id: "rows_of_dots", title: "Rows of dots", kind: "conceptual", text: ["A fact is a picture: 4 × 6 is 4 rows of 6 dots.", "Turn the picture on its side and it shows 6 rows of 4: the same number of dots, so 4 × 6 = 6 × 4."], visual: () => ({ type: "array", rows: 4, cols: 6 }) },
      ],
    },
    limits: `Facts for ${tables.join(", ")} with the other number from ${lo} to 12, and their missing-number forms; 11 and 12 times tables are practised elsewhere.`,
  };
}

export const B27: Def[] = [
  facts("amf2510", "MLY.mult.facts-2-5-10", "Times tables: 2, 5 and 10", [2, 5, 10], 1, 2),
  facts("amf34", "MLY.mult.facts-3-4", "Times tables: 3 and 4", [3, 4], 1, 3),
  facts("amf69", "MLY.mult.facts-6-9", "Times tables: 6, 7, 8 and 9", [6, 7, 8, 9], 2, 3),
  {
    id: "amderive",
    arity: 3,
    title: "A new fact from one you know",
    competency: MT,
    skill: "MLY.mult.derive",
    type: "integer",
    mc: true,
    // [a, b, k]: from a × b, find a × (b + 1) (k 0), a × (b − 1) (k 1) or a × 2b (k 2)
    parse: none,
    reject: ([a, b, k]) => (a < 3 || a > 9 || b < 2 || b > 9 || k < 0 || k > 2 || (k === 1 && b < 3) || (k === 2 && 2 * b > 12) ? "From a known fact up to 9 × 9: one more lot, one less, or double (up to × 12)." : null),
    prompt: ([a, b, k]) => {
      const n = k === 0 ? b + 1 : k === 1 ? b - 1 : 2 * b;
      return `You know ${a} × ${b} = ${a * b}. Use it to work out ${a} × ${n}.`;
    },
    solve: ([a, b, k]) => {
      const ab = a * b;
      const step: Step = k === 0 ? { id: "one-more", op: "add", competency: MT, inputs: [ab, a], value: ab + a } : k === 1 ? { id: "one-less", op: "subtract", competency: MT, inputs: [ab, a], value: ab - a } : { id: "double", op: "multiply", competency: MT, inputs: [ab, 2], value: 2 * ab };
      return { steps: [step], answer: step.value as number };
    },
    // independent: repeated addition of a, as many times as the new fact asks
    validate: ([a, b, k], v) => {
      const n = k === 0 ? b + 1 : k === 1 ? b - 1 : 2 * b;
      let s = 0;
      for (let i = 0; i < n; i++) s += a;
      return v === s;
    },
    bugs: ([a, b, k]) => {
      const ab = a * b;
      if (k === 2) return keepPred([
        { id: "added-two", kind: "conceptual", competency: MT, says: `2 was added to ${ab}. Twice as many lots means doubling: ${ab} + ${ab}.`, predict: ab + 2 },
        { id: "doubled-a", kind: "conceptual", competency: MT, says: `${a} was doubled and added on. Doubling ${b} doubles the whole answer.`, predict: ab + 2 * a !== 2 * ab ? ab + 2 * a : null },
      ]);
      const sign = k === 0 ? 1 : -1;
      return keepPred([
        { id: "one-not-a-lot", kind: "conceptual", competency: MT, says: `1 was ${k === 0 ? "added" : "taken away"}. One more lot of ${a} means ${k === 0 ? "adding" : "taking away"} ${a}, not 1.`, predict: ab + sign },
        { id: "wrong-lot", kind: "conceptual", competency: MT, says: `${b} was ${k === 0 ? "added" : "taken away"}. The lots are ${a}s, so it is ${a} that is ${k === 0 ? "added" : "taken away"}.`, predict: a !== b ? ab + sign * b : null },
      ]);
    },
    distractors: ([a, b, k]) => [a * b, a * b + 2 * a, a * b - 2 * a].filter((x) => x > 0 && x !== (k === 0 ? a * (b + 1) : k === 1 ? a * (b - 1) : 2 * a * b)) as Value[],
    variants: () => [],
    explain: (s) => (s.id === "double" ? `Twice as many lots: ${s.inputs[0]} + ${s.inputs[0]} = ${s.value}` : s.id === "one-more" ? `One more lot: ${s.inputs[0]} + ${s.inputs[1]} = ${s.value}` : `One lot less: ${s.inputs[0]} − ${s.inputs[1]} = ${s.value}`),
    domain: [[3, 9], [2, 9], [0, 2]],
    cap: 300,
    difficulty: ([a, b, k]) => (k === 2 ? 2 : a * b < 30 ? 1 : 3),
    grade: () => 3,
    word: ([a, b, k]) => {
      const n = k === 0 ? b + 1 : k === 1 ? b - 1 : 2 * b;
      return `${b} boxes of ${a} ${thing(a)} make ${a * b}. How many ${thing(a)} are in ${n} boxes?`;
    },
    teach: {
      idea: "A fact you know is a stepping stone: one more lot adds the number once more, one lot less takes it away, and twice as many lots doubles the answer.",
      method: "Write the fact you know. If the new fact has one more lot, add the number being multiplied; one less, take it away; twice as many, double the answer.",
      visual: ([a, b]) => ({ type: "array", rows: Math.min(b + 1, 10), cols: Math.min(a, 12) }),
      alternatives: [
        { id: "rows_of_dots", title: "Add a row", kind: "conceptual", text: ["6 × 7 is 7 rows of 6 dots.", "6 × 8 is the same picture with one more row of 6: 42 + 6 = 48."], visual: () => ({ type: "array", rows: 8, cols: 6 }) },
      ],
    },
    limits: "From a known fact up to 9 × 9: one more lot, one less, or double; splitting a number into two known facts is taught in long multiplication.",
  },
];
