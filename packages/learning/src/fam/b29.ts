/**
 * Families b29 (families@2): drawing on screen (draw@1). Two ICSE Class 5 outcome parts that were marked by a person can be
 * checked automatically when the child draws on the screen:
 *   afmkang   make an angle of a given size on a protractor (turn the arm)        Theme 6 (draw angles)
 *   adbarmk   draw a bar graph from a table (set each bar's height on the scale)    Theme 9 (draw a bar graph)
 * The child app (kid-say@1) shows a protractor with a turning arm, or bars to raise and lower, and hands back the angle
 * made or the bar heights as the ordinary typed answer, so the marking and its certification are the existing ones.
 * Typed (non-child) builds see the same question with a number box, which asks much less than drawing does.
 * All wording, contexts and pictures are OpenPath's own.
 */
import type { Def, Step } from "../family-kit";

const AM = "MATH.geometry.angle-measure";
const BAR = "MATH.statistics.bar-charts";
const none = () => null;
const st = (id: string, op: string, competency: string, inputs: (number | string)[], value: number | string): Step => ({ id, op, competency, inputs, value });
const inRange = (p: number[], ranges: [number, number][]) => p.length === ranges.length && p.every((v, i) => Number.isInteger(v) && v >= ranges[i][0] && v <= ranges[i][1]);
const tup = (xs: number[]) => `(${xs.join(", ")})`;
const readTuple = (v: unknown): number[] | null => {
  if (typeof v !== "string") return null;
  const m = v.replace(/\s/g, "").match(/^\((\d+(?:,\d+)*)\)$/);
  return m ? m[1].split(",").map(Number) : null;
};
const rng = (seed: number) => {
  let x = (Math.imul(seed + 11, 2654435761) ^ 0x27d4eb2f) >>> 0;
  return () => {
    x = (Math.imul(x, 1664525) + 1013904223) >>> 0;
    return x / 2 ** 32;
  };
};

// ---------------------------------------------------------------- adbarmk: data for a bar graph
const BARDATA: { title: string; what: string; one: string; labels: string[] }[] = [
  { title: "Favourite fruit of the children in Class 5", what: "children", one: "child", labels: ["Mango", "Banana", "Guava", "Apple", "Grapes"] },
  { title: "Books read in one month", what: "books", one: "book", labels: ["Anu", "Ravi", "Meena", "Arjun", "Kavya"] },
  { title: "Trees planted by each house", what: "trees", one: "tree", labels: ["Red", "Blue", "Green", "Yellow"] },
  { title: "Rainy days in each month", what: "rainy days", one: "rainy day", labels: ["June", "July", "August", "September"] },
  { title: "Tickets sold for the school play", what: "tickets", one: "ticket", labels: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] },
];
const sameBars = (a: number[], b: number[]) => JSON.stringify(barsOf(a).vals) === JSON.stringify(barsOf(b).vals);
const STEPS = [1, 2, 5, 10];
/** [ctx, stepIndex, seed]: values on the scale lines (multiples of the step), 3 to 5 bars, all different. */
const barsOf = ([ctx, si, seed]: number[]) => {
  const d = BARDATA[ctx];
  const step = STEPS[si];
  const r = rng(seed * 31 + ctx * 7 + si);
  const n = Math.min(d.labels.length, 3 + (seed % 3));
  const vals: number[] = [];
  while (vals.length < n) {
    const v = step * (1 + Math.floor(r() * 9));
    if (!vals.includes(v)) vals.push(v);
  }
  return { d, step, labels: d.labels.slice(0, n), vals };
};

export const B29: Def[] = [
  // ============================================================ afmkang
  {
    id: "afmkang",
    arity: 3,
    title: "Making an angle on a protractor",
    competency: AM,
    type: "integer",
    parse: none,
    // [k, side]: an angle of 5k degrees; the fixed arm lies along 0 on the inner scale (side 0, on the right) or on the outer scale (side 1, on the left)
    reject: ([k, side, n]) => (!inRange([k, side, n], [[2, 34], [0, 1], [0, 2]]) || k === 18 ? "Angles from 10° to 170° in steps of 5°, not a right angle." : null),
    prompt: ([k, side, n]) => `Make an angle of ${5 * k}° on the protractor. One arm lies along the line marked 0 on the ${side === 0 ? "inner" : "outer"} scale. Turn the other arm until ${["∠ABC", "∠PQR", "∠XYZ"][n]} is ${5 * k}°. How big is the angle you made, in degrees?`,
    figure: ([, side]) => ({ type: "protractor", arms: [side === 0 ? 0 : 180] }),
    solve: ([k, side]) => ({ steps: [st("scale", "choose-scale", AM, [side === 0 ? "inner" : "outer"], 0), st("turn", "turn", AM, [5 * k], 5 * k)], answer: 5 * k }),
    // independent: the arm turned to the mark 5k on the scale that starts at the fixed arm makes, with that arm, an angle
    // equal to the difference of their readings on the OTHER scale
    validate: ([k, side], v) => {
      const other = (inner: number) => 180 - inner;
      const fixedInner = side === 0 ? 0 : 180;
      const armInner = side === 0 ? 5 * k : 180 - 5 * k;
      return v === Math.abs(other(armInner) - other(fixedInner));
    },
    bugs: ([k]) =>
      180 - 5 * k === 5 * k
        ? []
        : [{ id: "wrong-scale", kind: "procedural", competency: AM, says: `The arm was turned to ${5 * k} on the other scale. Count from the 0 that the fixed arm lies on, and use that same scale.`, predict: 180 - 5 * k }],
    variants: () => [],
    explain: (s) => (s.id === "scale" ? `Use the ${s.inputs[0]} scale: it reads 0 on the fixed arm` : `Turn the other arm to ${s.value} on that scale: the angle is ${s.value}°`),
    domain: [[2, 34], [0, 1], [0, 2]],
    difficulty: ([k, side]) => (side === 0 && k <= 18 ? 1 : side === 0 ? 2 : 3),
    teach: {
      idea: "A protractor has two scales. To make an angle, start from the scale that reads 0 on the fixed arm and count up on that same scale.",
      method: "Find the 0 on the fixed arm. Follow that scale round to the size you want and turn the other arm to that mark.",
      visual: ([, side]) => ({ type: "protractor", arms: [side === 0 ? 0 : 180] }),
      alternatives: [
        { id: "estimate", title: "Check by eye", kind: "conceptual", text: ["Before you turn, decide whether the angle should be smaller than a right angle or bigger.", "If your arm makes the wrong kind of angle, you used the other scale."] },
      ],
    },
    limits: "Angles from 10° to 170° in steps of 5° with one arm on 0; in the child app the arm is turned on the screen, in typed builds the size is typed.",
  },
  // ============================================================ adbarmk
  {
    id: "adbarmk",
    arity: 3,
    title: "Drawing a bar graph from a table",
    competency: BAR,
    type: "tuple",
    parse: none,
    reject: (p) => {
      if (!inRange(p, [[0, BARDATA.length - 1], [0, STEPS.length - 1], [0, 39]])) return "A table of 3 to 5 values on the scale.";
      for (let s = 0; s < p[2]; s++) if (sameBars([p[0], p[1], s], p)) return "The same table as an earlier one.";
      return null;
    },
    prompt: (p) => {
      const { d, step, labels } = barsOf(p);
      return `The table shows: ${d.title}. Draw the bar graph: make each bar as tall as the table says, on a scale where each line is ${step} ${step === 1 ? d.one : d.what}. Give the bar heights in the order of the table, as a list in brackets, for example (${labels.map((_, i) => step * (i + 1)).join(", ")}).`;
    },
    figure: (p) => {
      const { d, labels, vals } = barsOf(p);
      return { type: "table", head: ["", d.what[0].toUpperCase() + d.what.slice(1)], rows: labels.map((l, i) => [l, String(vals[i])]) };
    },
    solve: (p) => {
      const { vals, step } = barsOf(p);
      return { steps: [st("lines", "divide", BAR, [...vals, step], vals.map((v) => v / step).join(", ")), st("heights", "draw", BAR, vals, tup(vals))], answer: tup(vals) };
    },
    // independent: each height, counted in lines of the scale and multiplied back, is the table's value, in the table's order
    validate: (p, v) => {
      const { vals, step } = barsOf(p);
      const t = readTuple(v);
      return !!t && t.length === vals.length && t.every((x, i) => x % step === 0 && (x / step) * step === vals[i]);
    },
    bugs: (p) => {
      const { vals, step } = barsOf(p);
      return step === 1
        ? []
        : [{ id: "lines-not-values", kind: "conceptual", competency: BAR, says: `The bars were drawn one line for each unit. Each line of this scale stands for ${step}, so a value of ${vals[0]} reaches line ${vals[0] / step}.`, predict: tup(vals.map((x) => x * step)) }];
    },
    variants: () => [],
    explain: (s) => (s.id === "lines" ? `How many lines tall each bar is: ${s.value}` : `So the bar heights, in order, are ${s.value}`),
    domain: [[0, BARDATA.length - 1], [0, STEPS.length - 1], [0, 39]],
    difficulty: ([, si]) => (si === 0 ? 1 : si <= 2 ? 2 : 3),
    teach: {
      idea: "In a bar graph, each bar's height shows a value from the table, read on the scale. The scale says how much each line stands for.",
      method: "For each row of the table, find its value on the scale (count the lines and multiply by what one line stands for) and make the bar reach exactly there.",
      visual: (p) => {
        const { labels, vals } = barsOf(p);
        return { type: "bars", labels, values: vals };
      },
      alternatives: [
        { id: "count_lines", title: "Count the lines", kind: "procedural", text: ["Divide each value by what one line stands for: that is how many lines tall the bar is.", "Draw every bar from the bottom line, the same width, with gaps between them."] },
      ],
    },
    limits: "3 to 5 bars on a scale of 1, 2, 5 or 10 per line, values on a line; in the child app the bars are raised on the screen, in typed builds the heights are typed.",
  },
];
