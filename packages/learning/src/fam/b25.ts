/**
 * Families b25 (families@2): Grade 8 modules that were too thin (grade8-fix@1). Each adds an in-grade sub-skill to a module
 * whose practice came from a single family:
 *   aipolyc  faces, vertices and edges of a named prism or pyramid, counted from its shape   polyhedra-euler
 *   akhtab   grouping raw data into class intervals (lower limit in, upper limit out)        histograms
 */
import type { Bug, Def, Step, Value } from "../family-kit";

const EULER = "MATH.geometry.polyhedra-euler";
const HIST = "MATH.statistics.histograms";
const MUL = "MATH.number.multiplication-tables";
const none = () => null;

const NAMES = ["Anu", "Ravi", "Meena", "Arjun", "Kavya", "Imran", "Divya", "Karthik", "Priya", "Selvi"];
const nm = (k: number) => NAMES[((k % NAMES.length) + NAMES.length) % NAMES.length];

/** The predicted wrong answers that differ from the answer and from each other. */
const differ = (answer: Value, list: Bug[]): Bug[] => {
  const seen = new Set<string>([String(answer)]);
  return list.filter((b) => {
    if (b.predict === null || (typeof b.predict === "number" && (!Number.isInteger(b.predict) || b.predict < 0))) return false;
    const k = String(b.predict);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
};

// ------------------------------------------------------------------ aipolyc
const POLY = ["", "", "", "triangular", "square", "pentagonal", "hexagonal", "heptagonal", "octagonal", "nonagonal", "decagonal"];
const SOLID = ["prism", "pyramid"];
const PART = ["faces", "vertices", "edges"];
/** [kind, n, ask]: kind 0 prism, 1 pyramid on an n-gon (3 to 10); ask 0 faces, 1 vertices, 2 edges of the named solid;
 * ask 3, 4, 5: the number of sides of its base, given its faces, vertices or edges. */
const fve = (k: number, n: number) => (k === 0 ? [n + 2, 2 * n, 3 * n] : [n + 1, n + 1, 2 * n]);
const polyCount = ([k, n, a]: number[]) => (a < 3 ? fve(k, n)[a] : n);
/** Independent: build the solid's vertices and edges as lists, and its faces as vertex cycles, then count. */
function polyBuild([k, n]: number[]) {
  const V: string[] = [];
  const E = new Set<string>();
  const F: string[][] = [];
  const edge = (x: string, y: string) => E.add([x, y].sort().join("-"));
  const base = Array.from({ length: n }, (_, i) => `b${i}`);
  V.push(...base);
  F.push(base);
  base.forEach((v, i) => edge(v, base[(i + 1) % n]));
  if (k === 0) {
    const top = Array.from({ length: n }, (_, i) => `t${i}`);
    V.push(...top);
    F.push(top);
    top.forEach((v, i) => edge(v, top[(i + 1) % n]));
    base.forEach((v, i) => {
      edge(v, top[i]);
      F.push([v, base[(i + 1) % n], top[(i + 1) % n], top[i]]);
    });
  } else {
    V.push("apex");
    base.forEach((v, i) => {
      edge(v, "apex");
      F.push([v, base[(i + 1) % n], "apex"]);
    });
  }
  return { F: F.length, V: V.length, E: E.size };
}

// ------------------------------------------------------------------ akhtab
const HCTX = [
  { who: "students", what: "marks in a test out of 50", desc: "marks out of 50 scored by 16 students in a test", unit: "", w: 10, lo: 0, hi: 50 },
  { who: "players", what: "runs scored in a match", desc: "runs scored by 16 players in a match", unit: "", w: 10, lo: 0, hi: 50 },
  { who: "families", what: "litres of water used in a morning", desc: "litres of water used by 16 families in one morning", unit: " L", w: 20, lo: 0, hi: 100 },
  { who: "children", what: "heights in cm", desc: "heights, in cm, of 16 children", unit: " cm", w: 5, lo: 130, hi: 155 },
];
/** [s, j]: data set s (0 to 79) of 16 values in context s % 4, and the class j (0 to 4) asked about. */
function hData([s]: number[]) {
  const C = HCTX[s % HCTX.length];
  let x = (s + 1) * 2654435761;
  const rnd = () => {
    x = Math.imul(x ^ (x >>> 15), 0x2c1b3c6d) >>> 0;
    x = (x ^ (x >>> 12) ^ Math.imul(x, 0x297a2d39)) >>> 0;
    return (x ^ (x >>> 15)) >>> 0;
  };
  const span = C.hi - C.lo;
  const vals: number[] = [];
  for (let i = 0; i < 16; i++) {
    // about a quarter of the values sit exactly on a class boundary (the case the rule is about)
    const v = rnd() % 4 === 0 ? C.lo + C.w * (1 + (rnd() % (span / C.w - 1))) : C.lo + (rnd() % span);
    vals.push(v);
  }
  return { C, vals };
}
const classOf = (C: (typeof HCTX)[number], j: number) => [C.lo + j * C.w, C.lo + (j + 1) * C.w];
const hAns = ([s, j]: number[]) => {
  const { C, vals } = hData([s]);
  const [a, b] = classOf(C, j);
  return vals.filter((v) => v >= a && v < b);
};
const hOk = ([s, j]: number[]) => {
  if (!(Number.isInteger(s) && s >= 0 && s < 80 && Number.isInteger(j) && j >= 0 && j < 5)) return false;
  const { C, vals } = hData([s]);
  const [a, b] = classOf(C, j);
  // the class is not empty and the boundary rule matters for it (a value sits on one of its limits)
  return hAns([s, j]).length > 0 && vals.some((v) => (v === b && b < C.hi) || (v === a && a > C.lo));
};

export const B25: Def[] = [
  {
    id: "aipolyc",
    arity: 3,
    title: "Faces, vertices and edges of prisms and pyramids",
    competency: EULER,
    skill: "count faces, vertices and edges",
    type: "integer",
    mc: true,
    parse: none,
    reject: ([k, n, a]) => (k < 0 || k > 1 || n < 3 || n > 10 || a < 0 || a > 5 ? "A prism or pyramid on a polygon with 3 to 10 sides; its faces, vertices or edges, or its base from one of them." : null),
    prompt: ([k, n, a]) => (a < 3 ? `How many ${PART[a]} does a ${POLY[n]} ${SOLID[k]} have?` : `A ${SOLID[k]} has ${fve(k, n)[a - 3]} ${PART[a - 3]}. How many sides does its base have?`),
    solve: ([k, n, a]) => {
      const ans = polyCount([k, n, a]);
      if (a >= 3) {
        const c = fve(k, n)[a - 3];
        const [rule, op, by]: [string, "subtract" | "divide", number] = a === 3 ? (k === 0 ? ["F = n + 2", "subtract", 2] : ["F = n + 1", "subtract", 1]) : a === 4 ? (k === 0 ? ["V = 2n", "divide", 2] : ["V = n + 1", "subtract", 1]) : k === 0 ? ["E = 3n", "divide", 3] : ["E = 2n", "divide", 2];
        return { steps: [{ id: "rule", op: "recall", competency: EULER, inputs: [k, a - 3], value: rule }, { id: "back", op, competency: op === "divide" ? MUL : EULER, inputs: [c, by], value: n }], answer: n };
      }
      const steps: Step[] =
        k === 0
          ? a === 0
            ? [{ id: "sides", op: "count", competency: EULER, inputs: [n, "side faces"], value: n }, { id: "total", op: "add", competency: EULER, inputs: [n, 2], value: ans }]
            : a === 1
              ? [{ id: "ends", op: "multiply", competency: MUL, inputs: [n, 2], value: ans }]
              : [{ id: "edges3", op: "multiply", competency: MUL, inputs: [n, 3], value: ans }]
          : a === 0
            ? [{ id: "sides", op: "count", competency: EULER, inputs: [n, "triangular faces"], value: n }, { id: "total", op: "add", competency: EULER, inputs: [n, 1], value: ans }]
            : a === 1
              ? [{ id: "apex", op: "add", competency: EULER, inputs: [n, 1], value: ans }]
              : [{ id: "edges2", op: "multiply", competency: MUL, inputs: [n, 2], value: ans }];
      return { steps, answer: ans };
    },
    // independent: build the solid (vertex list, edge set, faces as cycles) and count; Euler's formula is not used
    validate: ([k, n, a], v) => {
      const c = polyBuild([k, n]);
      if (a < 3) return v === [c.F, c.V, c.E][a];
      // the base sides: the only polygon from 3 to 20 sides whose solid has the given count
      const given = [c.F, c.V, c.E][a - 3];
      const fits = Array.from({ length: 18 }, (_, i) => i + 3).filter((m) => { const d = polyBuild([k, m]); return [d.F, d.V, d.E][a - 3] === given; });
      return fits.length === 1 && v === fits[0];
    },
    bugs: ([k, n, a]) => {
      const ans = polyCount([k, n, a]);
      if (a >= 3) {
        const c = fve(k, n)[a - 3];
        return differ(ans, [
          { id: "count-as-sides", kind: "conceptual", competency: EULER, says: `The ${PART[a - 3]} were taken as the sides of the base; a ${SOLID[k]} has ${a === 3 ? (k === 0 ? "2 more faces than its base has sides (the two ends)" : "1 more face than its base has sides (the base)") : a === 4 ? (k === 0 ? "2 vertices for each side of its base (top and bottom)" : "1 more vertex than its base has sides (the apex)") : k === 0 ? "3 edges for each side of its base" : "2 edges for each side of its base"}.`, predict: c },
          { id: "other-solid", kind: "conceptual", competency: EULER, says: `The rule for a ${SOLID[1 - k]} was used. For a ${SOLID[k]}: ${a === 3 ? (k === 0 ? "F = n + 2" : "F = n + 1") : a === 4 ? (k === 0 ? "V = 2n" : "V = n + 1") : k === 0 ? "E = 3n" : "E = 2n"}.`, predict: ((x: number) => (Number.isInteger(x) && x >= 3 ? x : null))(a === 3 ? (k === 0 ? c - 1 : c - 2) : a === 4 ? (k === 0 ? c - 1 : (c - 1) / 2) : k === 0 ? c / 2 : c / 3) },
        ]);
      }
      const list: Bug[] =
        k === 0
          ? [
              { id: "ends-forgotten", kind: "conceptual", competency: EULER, says: `Only the ${n} side faces were counted; a prism also has its two ends (the top and the bottom ${POLY[n]} faces).`, predict: a === 0 ? n : null },
              { id: "one-end", kind: "procedural", competency: EULER, says: `Only one end was counted. A prism has a ${POLY[n].replace(/al$/, "")} at the top and another at the bottom.`, predict: a === 0 ? n + 1 : a === 1 ? n : null },
              { id: "uprights-forgotten", kind: "procedural", competency: EULER, says: `Only the edges round the two ends were counted (${n} + ${n}); the ${n} upright edges joining them were left out.`, predict: a === 2 ? 2 * n : null },
            ]
          : [
              { id: "base-forgotten", kind: "conceptual", competency: EULER, says: `Only the ${n} sloping triangles were counted; the base is a face too.`, predict: a === 0 ? n : null },
              { id: "apex-forgotten", kind: "procedural", competency: EULER, says: `Only the ${n} corners of the base were counted; the apex at the top is a vertex too.`, predict: a === 1 ? n : null },
              { id: "slant-forgotten", kind: "procedural", competency: EULER, says: `Only the ${n} edges round the base were counted; ${n} more edges run from the base up to the apex.`, predict: a === 2 ? n : null },
              { id: "like-prism", kind: "conceptual", competency: EULER, says: "The pyramid was counted like a prism. A pyramid has one base and an apex, not two ends.", predict: [n + 2, 2 * n, 3 * n][a] },
            ];
      return differ(ans, list);
    },
    distractors: ([k, n, a]) => {
      const ans = polyCount([k, n, a]);
      return [ans + 1, ans - 1, ans + 2, 2 * ans].filter((v) => v > 0);
    },
    variants: ([k, n, a]) => [[k, n + 1, a], [k, n, a < 3 ? (a + 1) % 3 : 3 + ((a - 2) % 3)]].filter(([, m]) => m <= 10),
    explain: (s) =>
      s.id === "rule"
        ? `For a ${SOLID[Number(s.inputs[0])]} with an n-sided base: ${s.value}`
        : s.id === "back"
          ? `So n = ${s.inputs[0]} ${s.op === "divide" ? "÷" : "−"} ${s.inputs[1]} = ${s.value}`
          : s.id === "sides"
        ? `There are ${s.inputs[0]} ${s.inputs[1]}, one on each side of the base`
        : s.id === "total"
          ? `Add the ${s.inputs[1] === 2 ? "two ends" : "base"}: ${s.inputs[0]} + ${s.inputs[1]} = ${s.value}`
          : s.id === "ends"
            ? `${s.inputs[0]} corners at each end, and two ends: ${s.inputs[0]} × 2 = ${s.value}`
            : s.id === "edges3"
              ? `${s.inputs[0]} edges round each end and ${s.inputs[0]} upright edges: ${s.inputs[0]} × 3 = ${s.value}`
              : s.id === "apex"
                ? `${s.inputs[0]} corners of the base and the apex: ${s.inputs[0]} + 1 = ${s.value}`
                : `${s.inputs[0]} edges round the base and ${s.inputs[0]} up to the apex: ${s.inputs[0]} × 2 = ${s.value}`,
    domain: [[0, 1], [3, 10], [0, 5]],
    difficulty: ([k, n, a]) => (a >= 3 ? 3 : n <= 4 && a !== 2 ? 1 : a === 2 || n >= 7 ? 3 : 2),
    word: ([k, n, a]) =>
      a >= 3
        ? `${nm(n + a)} has built a model ${SOLID[k]} from straws and clay balls (a straw for each edge, a clay ball for each corner); it has ${fve(k, n)[a - 3]} ${["flat faces", "clay balls (vertices)", "straws (edges)"][a - 3]}. How many sides does the base of the ${SOLID[k]} have?`
        : `${nm(n + a)} is making a model of a ${POLY[n]} ${SOLID[k]} from straws and clay balls: each straw is an edge, each clay ball is a corner (vertex) and each flat side will be covered with paper. How many ${a === 0 ? "pieces of paper (faces)" : a === 1 ? "clay balls (vertices)" : "straws (edges)"} does the model need?`,
    teach: {
      idea: "A prism has two matching ends joined by rectangles, one rectangle for each side of an end. A pyramid has one base, and a triangle on each side of the base meeting at the apex.",
      method: "Name the polygon of the base and count its sides. Prism: the side faces plus the two ends; corners at both ends; edges round both ends plus the upright edges. Pyramid: the triangles plus the base; the base's corners plus the apex; the base's edges plus one edge up to the apex from each corner. Check with F + V − E = 2.",
      alternatives: [
        { id: "build", title: "Build it from straws", kind: "conceptual", text: ["Picture the model: one clay ball at each corner and one straw along each edge.", "Count the balls and straws of the base first, then what the rest of the solid adds."] },
      ],
    },
    limits: "Prisms and pyramids on polygons with 3 to 10 sides; double pyramids and other polyhedra are in aieuler.",
  },
  {
    id: "akhtab",
    arity: 2,
    title: "Grouping data into class intervals",
    competency: HIST,
    skill: "make a grouped frequency table",
    type: "integer",
    mc: true,
    parse: none,
    reject: (p) => (hOk(p) ? null : "One of 80 data sets of 16 values, and a class that is not empty with a value on one of its limits."),
    prompt: ([s, j]) => {
      const { C, vals } = hData([s]);
      const [a, b] = classOf(C, j);
      return `The ${C.desc} are: ${vals.join(", ")}. They are grouped in classes ${C.lo}–${C.lo + C.w}, ${C.lo + C.w}–${C.lo + 2 * C.w}, … where each class includes its lower limit but not its upper limit. What is the frequency of the class ${a}–${b}?`;
    },
    solve: ([s, j]) => {
      const { C } = hData([s]);
      const [a, b] = classOf(C, j);
      const inn = hAns([s, j]);
      return { steps: [{ id: "rule", op: "compare", competency: HIST, inputs: [a, b], value: `${a} ≤ value < ${b}` }, { id: "tally", op: "count", competency: HIST, inputs: inn, value: inn.length }], answer: inn.length };
    },
    // independent: put every value in its class by dividing (floor((v − lowest) ÷ width)), then read the class's count
    validate: ([s, j], v) => {
      const { C, vals } = hData([s]);
      const counts = new Array(5).fill(0);
      for (const x of vals) {
        const k = Math.floor((x - C.lo) / C.w);
        if (k >= 0 && k < 5) counts[k]++;
      }
      return v === counts[j];
    },
    bugs: ([s, j]) => {
      const { C, vals } = hData([s]);
      const [a, b] = classOf(C, j);
      const n = hAns([s, j]).length;
      const onUpper = vals.filter((v) => v === b).length;
      const onLower = vals.filter((v) => v === a).length;
      return differ(n, [
        { id: "upper-included", kind: "conceptual", competency: HIST, says: `A value equal to the upper limit ${b} was counted in this class. It belongs to the next class, which starts at ${b}.`, predict: onUpper ? n + onUpper : null },
        { id: "lower-excluded", kind: "conceptual", competency: HIST, says: `A value equal to the lower limit ${a} was left out. The class includes its lower limit, so ${a} is counted here.`, predict: onLower ? n - onLower : null },
      ]);
    },
    distractors: ([s, j]) => {
      const n = hAns([s, j]).length;
      return [n + 1, n - 1, n + 2].filter((v) => v >= 0);
    },
    variants: ([s, j]) => [[s, (j + 1) % 5], [s + 4, j]].filter(hOk),
    explain: (s) => (s.id === "rule" ? `A value is in the class when ${s.value}` : s.inputs.length ? `The values in the class: ${s.inputs.join(", ")}; there are ${s.value}` : `No value is in the class: 0`),
    domain: [[0, 79], [0, 4]],
    keep: hOk,
    difficulty: (p) => {
      const { vals } = hData([p[0]]);
      const [a, b] = classOf(hData([p[0]]).C, p[1]);
      return vals.some((v) => v === b) && vals.some((v) => v === a) ? 3 : 2;
    },
    word: ([s, j]) => {
      const { C, vals } = hData([s]);
      const [a, b] = classOf(C, j);
      return `${nm(s + j)} is making a frequency table of the ${C.desc}: ${vals.join(", ")}. The table has classes ${C.lo}–${C.lo + C.w}, ${C.lo + C.w}–${C.lo + 2 * C.w}, … and a value on a boundary goes in the class that starts there. What number goes in the row for ${a}–${b}?`;
    },
    teach: {
      idea: "A grouped frequency table puts each value in a class interval. Neighbouring classes share a boundary, and a value on a boundary belongs to the class that starts there: each class includes its lower limit but not its upper limit.",
      method: "Go through the values in order and tick each one in its class; a value equal to a boundary goes to the class above. Count the ticks for the class asked about, and check that all the class counts add up to the number of values.",
      alternatives: [
        { id: "tally", title: "Tally marks", kind: "procedural", text: ["Make a tally mark for each value in the row of its class, crossing every fifth.", "Cross out each value in the list as you tally it, so none is missed or counted twice."] },
      ],
    },
    limits: "Sixteen whole-number values in five equal classes; unequal classes and drawing the histogram are not here.",
  },
];
