/**
 * Batch b09 (families@2): Grades 6–8 geometry, measurement and number — polygon and quadrilateral angles, Euler's
 * formula and nets, map scales, volume, capacity and packing, areas of triangles, parallelograms, rhombuses,
 * trapeziums, composite shapes and pathways, circles and sectors, surface areas of cuboids and cylinders, decimal and
 * fraction products and quotients, and integer addition and subtraction. Written by OpenPath; CC0.
 */
import type { Bug, Def, Step, Value } from "../family-kit";
import { gcd, near, par, fmt, simpson } from "../family-kit";
import { evaluate, parse } from "../answer-types";

const none = () => null;
/** "a" or "an" before a number as it is read ("an 8 m", "an 11 cm", "an 18%", "a 7 m"). */
const aN = (x: number | string) => `${/^(8|11|18)(?!\d)|^8/.test(String(x)) ? "an" : "a"} ${x}`;
const AN = (x: number | string) => `${/^(8|11|18)(?!\d)|^8/.test(String(x)) ? "An" : "A"} ${x}`;
const NAMES = ["Anu", "Ravi", "Meena", "Arjun", "Kavya", "Imran", "Divya", "Karthik", "Lakshmi", "Selvi", "Farhan", "Priya"];
const name = (k: number) => NAMES[((Math.round(k) % NAMES.length) + NAMES.length) % NAMES.length];

const POLY = "MATH.geometry.polygon-angles";
const EULER = "MATH.geometry.polyhedra-euler";
const QUAD = "MATH.geometry.quadrilaterals";
const SCALE = "MATH.geometry.scale-drawings";
const VIEWS = "MATH.geometry.solid-views";
const CVOL = "MATH.measurement.cube-volume";
const TRI = "MATH.measurement.triangle-area";
const CIRC = "MATH.measurement.circle-area";
const PARA = "MATH.measurement.parallelogram-rhombus-area";
const SURF = "MATH.measurement.surface-area-intro";
const CYL = "MATH.measurement.cylinder";
const TRAP = "MATH.measurement.trapezium-area";
const DEC = "MATH.number.decimal-product";
const FRP = "MATH.number.fraction-product";
const INTA = "MATH.number.integer-add";
const INT = "MATH.number.integers";
const MT = "MATH.number.multiplication-tables";
const UNIT = "MATH.measurement.unit-conversions";
const RAREA = "MATH.measurement.rectangle-area";
const RPER = "MATH.measurement.rectangle-perimeter";
const TPROP = "MATH.geometry.triangle-properties";
const NETS = "MATH.geometry.nets";

// ---------------------------------------------------------------- exact rationals (small integers)

type R = [number, number];
const q = (n: number, d = 1): R => {
  if (d < 0) [n, d] = [-n, -d];
  const g = gcd(n, d) || 1;
  return [n / g, d / g];
};
const qa = (a: R, b: R) => q(a[0] * b[1] + b[0] * a[1], a[1] * b[1]);
const qs = (a: R, b: R) => q(a[0] * b[1] - b[0] * a[1], a[1] * b[1]);
const qm = (a: R, b: R) => q(a[0] * b[0], a[1] * b[1]);
const qd = (a: R, b: R) => q(a[0] * b[1], a[1] * b[0]);
const qe = (a: R, b: R) => a[0] * b[1] === b[0] * a[1];
/** A rational as written: a whole number, a terminating decimal, or a fraction a/b in lowest terms. */
function dec(r: R): string {
  const [n, d] = q(r[0], r[1]);
  if (d === 1) return String(n);
  let m = d;
  let twos = 0;
  let fives = 0;
  while (m % 2 === 0) (m /= 2), twos++;
  while (m % 5 === 0) (m /= 5), fives++;
  if (m !== 1) return `${n}/${d}`;
  const p = Math.max(twos, fives);
  const scaled = Math.abs(n) * (10 ** p / d);
  const s = String(Math.round(scaled)).padStart(p + 1, "0");
  return `${n < 0 ? "-" : ""}${s.slice(0, s.length - p)}.${s.slice(s.length - p)}`.replace(/\.?0+$/, "");
}
const D = (n: number, d = 1) => dec(q(n, d));
/** Read an answer written as a whole number, a decimal or a fraction (null when it is none of these). */
function val(v: Value): R | null {
  if (typeof v === "number") {
    if (Number.isInteger(v)) return [v, 1];
    const f = fmt(v).match(/^(-?\d+)\/(\d+)$/);
    return f ? q(Number(f[1]), Number(f[2])) : null;
  }
  if (typeof v !== "string") return null;
  const s = v.replace(/−/g, "-").replace(/\s+/g, "");
  let m = s.match(/^(-?)(\d+)(?:\.(\d+))?$/);
  if (m) {
    const frac = m[3] ?? "";
    return q((m[1] ? -1 : 1) * Number(m[2] + frac), 10 ** frac.length);
  }
  m = s.match(/^(-?)(\d+)\/(\d+)$/);
  return m && Number(m[3]) ? q((m[1] ? -1 : 1) * Number(m[2]), Number(m[3])) : null;
}
const is = (v: Value, r: R) => {
  const x = val(v);
  return !!x && qe(x, r);
};
/** Shoelace area of a polygon from its corners (an independent check of an area formula). */
const shoelace = (pts: [number, number][]) => {
  let s = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % pts.length];
    s += x1 * y2 - x2 * y1;
  }
  return Math.abs(s) / 2;
};
const hash = (t: string) => {
  let h = 2166136261;
  for (let i = 0; i < t.length; i++) h = Math.imul(h ^ t.charCodeAt(i), 16777619);
  // finalise (murmur3 mix) so that neighbouring strings give unrelated values
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
};
const B = (id: string, kind: Bug["kind"], competency: string, says: string, predict: Value | null, probe?: string): Bug => ({ id, kind, competency, says, predict, ...(probe ? { probe } : {}) });
const step = (id: string, op: string, competency: string, inputs: (number | string)[], value: Value): Step => ({ id, op, competency, inputs, value });
const vs = (v: Value) => (typeof v === "number" ? (Number.isInteger(v) ? String(v).replace(/^-/, "−") : fmt(v)) : String(v));
/** A learner-facing sentence for an arithmetic step, with an optional label per step id. */
const say = (labels: Record<string, string> = {}) => (s: Step) => {
  const i = s.inputs.map((x) => (typeof x === "number" ? par(x) : x));
  const body =
    s.op === "multiply" ? `${i.join(" × ")} = ${vs(s.value)}`
    : s.op === "add" ? `${i.join(" + ")} = ${vs(s.value)}`
    : s.op === "subtract" ? `${i.join(" − ")} = ${vs(s.value)}`
    : s.op === "divide" ? `${i[0]} ÷ ${i[1]} = ${vs(s.value)}`
    : s.op === "half" ? `half of ${i[0]} = ${vs(s.value)}`
    : `${i.join(", ")} → ${vs(s.value)}`;
  return labels[s.id] ? `${labels[s.id]}: ${body}` : body;
};
const PI7: R = [22, 7];
const PI314: R = [157, 50];
const piText = (pm: number) => (pm === 0 ? "22/7" : "3.14");
const piOf = (pm: number) => (pm === 0 ? PI7 : PI314);

const PNAME: Record<number, string> = { 3: "triangle", 4: "quadrilateral", 5: "pentagon", 6: "hexagon", 7: "heptagon", 8: "octagon", 9: "nonagon", 10: "decagon" };
const pname = (n: number) => PNAME[n] ?? `${n}-sided polygon`;
const ADJ: Record<number, string> = { 3: "triangular", 4: "square", 5: "pentagonal", 6: "hexagonal", 7: "heptagonal", 8: "octagonal", 9: "nonagonal", 10: "decagonal", 11: "11-sided", 12: "12-sided" };
const PIECE: Record<number, string> = { 3: "triangle", 4: "square", 5: "pentagon", 6: "hexagon", 7: "heptagon", 8: "octagon", 9: "nonagon", 10: "decagon" };
const plural = (w: string, k: number) => (k === 1 ? w : `${w}s`);
/** "a" or "an" before a word (an octagon, an 8-sided card, an 11-sided base). */
const an = (w: string) => (/^([aeiou]|8|11-|18)/i.test(w) ? `an ${w}` : `a ${w}`);

/** Faces, edges and vertices of a prism (0), pyramid (1) or double pyramid (2) on an n-gon, by listing them. */
function build(kind: number, n: number) {
  const verts = new Set<string>();
  const edges = new Set<string>();
  let faces = 0;
  const edge = (a: string, b: string) => edges.add(a < b ? `${a}|${b}` : `${b}|${a}`);
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    verts.add(`b${i}`);
    edge(`b${i}`, `b${j}`);
    if (kind === 0) {
      verts.add(`t${i}`);
      edge(`t${i}`, `t${j}`);
      edge(`b${i}`, `t${i}`);
      faces++; // the side rectangle b_i b_j t_j t_i
    } else {
      verts.add("apex");
      edge(`b${i}`, "apex");
      faces++; // the side triangle b_i b_j apex
      if (kind === 2) {
        verts.add("apex2");
        edge(`b${i}`, "apex2");
        faces++;
      }
    }
  }
  if (kind === 0) faces += 2; // the two ends
  if (kind === 1) faces += 1; // the base
  return { F: faces, E: edges.size, V: verts.size };
}

const WHAT = ["faces", "edges", "vertices"];
const SCALES = [2, 5, 10, 20, 25, 50];
const RATIOS = [100, 200, 500, 1000, 25000, 50000, 100000];
const ANGLES = [30, 45, 60, 72, 90, 120, 135, 150, 180, 210, 240, 270, 300];
const DIRS = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
const slant = (b: number, h: number) => h + 1 + ((b + h) % 5);

export const B09: Def[] = [
  // ================================================================ polygon angles
  {
    id: "aipolymiss",
    arity: 2,
    title: "The missing angle of a polygon",
    competency: POLY,
    type: "integer",
    mc: true,
    parse: none,
    reject: ([n, s]) => (n < 5 || n > 8 || s < 0 || s > 59 ? "Pentagons to octagons, with a fixed set of angle choices." : null),
    prompt: ([n, s]) => {
      const { given } = polyAngles(n, s);
      return `${an(pname(n)).replace(/^a/, "A")} has ${n} angles. ${n - 1} of them are ${list(given.map((a) => `${a}°`))}. What is the size of the last angle, in degrees?`;
    },
    solve: ([n, s]) => {
      const { given, last } = polyAngles(n, s);
      const S = (n - 2) * 180;
      const g = given.reduce((a, b) => a + b, 0);
      return { steps: [step("triangles", "subtract", POLY, [n, 2], n - 2), step("sum", "multiply", POLY, [n - 2, 180], S), step("given", "add", "MATH.number.addition", given, g), step("last", "subtract", POLY, [S, g], last)], answer: last };
    },
    // independent: walking round the polygon turns through 360°, so the exterior angles (180° − each angle) add to 360°
    validate: ([n, s], v) => {
      const { given } = polyAngles(n, s);
      if (typeof v !== "number" || v <= 0 || v >= 180) return false;
      return [...given, v].reduce((t, a) => t + (180 - a), 0) === 360;
    },
    bugs: ([n, s]) => {
      const { given } = polyAngles(n, s);
      const g = given.reduce((a, b) => a + b, 0);
      return [
        B("n-triangles", "conceptual", POLY, `The angle sum was taken as ${n} × 180°. ${an(pname(n)).replace(/^a/, "A")} splits into ${n - 2} triangles from one corner, so its angles add to ${(n - 2) * 180}°.`, n * 180 - g),
        B("assumed-regular", "conceptual", POLY, `The angle sum was shared equally, as if the ${pname(n)} were regular; its angles are not all equal, so take the given angles away from ${(n - 2) * 180}°.`, ((n - 2) * 180) % n === 0 ? ((n - 2) * 180) / n : null, `gen:aipolyreg:${n},0`),
        B("sum-not-subtracted", "procedural", POLY, `The angle sum ${(n - 2) * 180}° was found, but the given angles were not taken away from it.`, (n - 2) * 180),
      ];
    },
    variants: () => [],
    explain: say({ triangles: "Triangles from one corner", sum: "Angle sum", given: "Given angles", last: "Last angle" }),
    domain: [[5, 8], [0, 59]],
    keep: ([n, s]) => {
      const { given, last } = polyAngles(n, s);
      return last >= 45 && last <= 175 && given.every((a) => a > 40 && a < 180);
    },
    difficulty: ([n]) => (n === 5 ? 1 : n <= 6 ? 2 : 3),
    figure: ([n]) => ({ type: "shape", sides: n, name: pname(n) }),
    word: ([n, s]) => {
      const { given } = polyAngles(n, s);
      return `${name(s)} cuts ${an(`${n}-sided`)} piece of card for a kolam design. ${name(s)} measures ${n - 1} of its corners: ${list(given.map((a) => `${a}°`))}. What must the last corner measure, in degrees?`;
    },
    teach: {
      idea: "From one corner, the diagonals cut a polygon with n sides into n − 2 triangles, and each triangle's angles add to 180°. So the angles of the polygon add to (n − 2) × 180°.",
      method: "Find the angle sum (n − 2) × 180°, add the angles you know, and take that total from the angle sum.",
      visual: ([n]) => ({ type: "shape", sides: n, name: pname(n) }),
      alternatives: [
        { id: "exterior_walk", title: "Walk around the edge", kind: "conceptual", text: ["Walk around the polygon: at each corner you turn through 180° minus the angle there.", "One full walk turns you once round, 360°. Add the turns you know; the last turn is what is left of 360°, and the last angle is 180° minus that turn."] },
      ],
    },
    limits: "Convex pentagons to octagons with whole-degree angles in multiples of 5; reflex angles and regular polygons are left out here.",
  },
  {
    id: "aipolyreg",
    arity: 2,
    title: "Angle sums and regular polygons",
    competency: POLY,
    type: "integer",
    mc: true,
    // [n, mode]: 0 angle sum of an n-gon; 1 sides from the angle sum; 2 each angle of a regular n-gon; 3 sides of a regular polygon from its exterior angle
    parse: none,
    reject: ([n, m]) => (n < 3 || n > 36 || m < 0 || m > 3 || (m >= 2 && 360 % n !== 0) ? "Polygons with 3 to 36 sides; regular ones whose exterior angle is a whole number of degrees." : null),
    prompt: ([n, m]) =>
      m === 0 ? `What is the sum of the interior angles of a polygon with ${n} sides, in degrees?`
      : m === 1 ? `The interior angles of a polygon add up to ${(n - 2) * 180}°. How many sides does it have?`
      : m === 2 ? `What is the size of each interior angle of a regular polygon with ${n} sides, in degrees?`
      : `Each exterior angle of a regular polygon is ${360 / n}°. How many sides does it have?`,
    solve: ([n, m]) => {
      const S = (n - 2) * 180;
      if (m === 0) return { steps: [step("triangles", "subtract", POLY, [n, 2], n - 2), step("sum", "multiply", POLY, [n - 2, 180], S)], answer: S };
      if (m === 1) return { steps: [step("triangles", "divide", POLY, [S, 180], n - 2), step("sides", "add", POLY, [n - 2, 2], n)], answer: n };
      if (m === 2) return { steps: [step("sum", "multiply", POLY, [n - 2, 180], S), step("each", "divide", POLY, [S, n], S / n)], answer: S / n };
      return { steps: [step("sides", "divide", POLY, [360, 360 / n], n)], answer: n };
    },
    // independent: the exterior angles of any polygon add to 360°, so (angle sum) = n × 180° − 360°
    validate: ([n, m], v) => {
      if (typeof v !== "number") return false;
      if (m === 0) return v === n * 180 - 360;
      if (m === 1) return Number.isInteger(v) && v >= 3 && v * 180 - 360 === (n - 2) * 180;
      if (m === 2) return v === 180 - 360 / n;
      return v * (360 / n) === 360;
    },
    bugs: ([n, m]) => {
      const S = (n - 2) * 180;
      const e = 360 / n;
      if (m === 0) return [B("n-triangles", "conceptual", POLY, `${n} triangles were counted; from one corner a polygon with ${n} sides splits into ${n - 2} triangles.`, n * 180), B("always-360", "conceptual", POLY, "The angle sum was taken as 360° for every polygon; that is only true for quadrilaterals.", 360)];
      if (m === 1) return [B("forgot-add-two", "procedural", POLY, `${S} ÷ 180 = ${n - 2} gives the number of triangles; the polygon has 2 more sides than that.`, n - 2), B("add-one", "procedural", POLY, "One was added instead of two: sides = triangles + 2.", n - 1)];
      if (m === 2) return [B("exterior-for-interior", "conceptual", POLY, `360° ÷ ${n} is each exterior angle (the turn at a corner); the interior angle is 180° minus it.`, e), B("sum-not-shared", "procedural", POLY, `The angle sum was found but not shared among the ${n} equal angles.`, S)];
      return [
        B("half-turn", "conceptual", POLY, "180° was divided; walking once round a polygon turns through 360°.", 180 % e === 0 ? 180 / e : null),
        B("exterior-as-interior", "conceptual", POLY, `${e}° was treated as the inside angle; it is the exterior angle, the turn at each corner.`, 360 % (180 - e) === 0 && 360 / (180 - e) >= 3 ? 360 / (180 - e) : null),
      ];
    },
    variants: () => [],
    explain: say({ triangles: "Triangles", sum: "Angle sum", sides: "Sides", each: "Each angle" }),
    domain: [[3, 36], [0, 3]],
    keep: ([n, m]) => m < 2 || 360 % n === 0,
    difficulty: ([n, m]) => (m === 0 && n <= 8 ? 1 : m <= 1 ? 2 : 3),
    figure: ([n]) => (n <= 12 ? { type: "shape", sides: n } : null),
    word: ([n, m]) =>
      m === 0 ? `${name(n)} is drawing a floor pattern shaped like a polygon with ${n} sides. What do all its inside angles add up to, in degrees?`
      : m === 1 ? `The inside angles of a garden bed shaped like a polygon add up to ${(n - 2) * 180}°. How many straight edges does the bed have?`
      : m === 2 ? `A window is shaped like a regular polygon with ${n} equal sides. How big is each angle inside the window frame, in degrees?`
      : `${name(n)} walks around a regular polygon-shaped track and turns ${360 / n}° at every corner. How many sides does the track have?`,
    teach: {
      idea: "A polygon with n sides splits into n − 2 triangles from one corner, so its angles add to (n − 2) × 180°. In a regular polygon all the angles are equal, and the turns at the corners (exterior angles) add to 360°.",
      method: "For the sum, work out (n − 2) × 180°. For one angle of a regular polygon, divide the sum by n (or take 360° ÷ n from 180°). For the number of sides, divide 360° by the exterior angle.",
      alternatives: [
        { id: "table", title: "Build a table", kind: "procedural", text: ["Triangle 180°, quadrilateral 360°, pentagon 540°: each new side adds one more triangle, 180° more.", "Continue the pattern to the number of sides you need."], visual: () => ({ type: "table", head: ["sides", "triangles", "angle sum"], rows: [[3, 1, "180°"], [4, 2, "360°"], [5, 3, "540°"], [6, 4, "720°"]] }) },
      ],
    },
    limits: "Polygons with 3 to 36 sides; regular polygons only where each exterior angle is a whole number of degrees.",
  },
  // ================================================================ Euler's formula and counting from nets
  {
    id: "aieuler",
    arity: 3,
    title: "Euler's formula F + V − E = 2",
    competency: EULER,
    type: "integer",
    mc: true,
    // [kind, n, ask]: the counts of a prism (0), pyramid (1) or double pyramid (2) on an n-gon; ask 0 edges, 1 faces, 2 vertices
    parse: none,
    reject: ([k, n, a]) => (k < 0 || k > 2 || n < 3 || n > 12 || a < 0 || a > 2 ? "Prisms, pyramids and double pyramids on polygons with 3 to 12 sides." : null),
    prompt: ([k, n, a]) => {
      const { F, V, E } = counts(k, n);
      return a === 0 ? `A polyhedron has ${F} faces and ${V} vertices. Using Euler's formula, how many edges does it have?`
        : a === 1 ? `A polyhedron has ${V} vertices and ${E} edges. Using Euler's formula, how many faces does it have?`
        : `A polyhedron has ${F} faces and ${E} edges. Using Euler's formula, how many vertices does it have?`;
    },
    solve: ([k, n, a]) => {
      const { F, V, E } = counts(k, n);
      if (a === 0) return { steps: [step("fv", "add", EULER, [F, V], F + V), step("edges", "subtract", EULER, [F + V, 2], E)], answer: E };
      if (a === 1) return { steps: [step("ev", "subtract", EULER, [E, V], E - V), step("faces", "add", EULER, [E - V, 2], F)], answer: F };
      return { steps: [step("ef", "subtract", EULER, [E, F], E - F), step("vertices", "add", EULER, [E - F, 2], V)], answer: V };
    },
    // independent: list every vertex, edge and face of the solid and count them (no use of Euler's formula)
    validate: ([k, n, a], v) => {
      const c = build(k, n);
      return v === (a === 0 ? c.E : a === 1 ? c.F : c.V);
    },
    bugs: ([k, n, a]) => {
      const { F, V, E } = counts(k, n);
      if (a === 0) return [B("forgot-two", "procedural", EULER, "Faces and vertices were added, but the 2 in F + V − E = 2 was forgotten: E = F + V − 2.", F + V), B("two-wrong-way", "procedural", EULER, "The 2 was added instead of taken away: from F + V − E = 2, E = F + V − 2.", F + V + 2)];
      if (a === 1) return [B("forgot-two", "procedural", EULER, "The 2 in F + V − E = 2 was forgotten: F = E − V + 2.", E - V), B("added-all", "procedural", EULER, "The vertices were added to the edges; F = 2 + E − V.", E + V - 2)];
      return [B("forgot-two", "procedural", EULER, "The 2 in F + V − E = 2 was forgotten: V = E − F + 2.", E - F), B("added-all", "procedural", EULER, "The faces were added to the edges; V = 2 + E − F.", E + F - 2)];
    },
    variants: () => [],
    explain: say({ fv: "F + V", edges: "E = F + V − 2", ev: "E − V", faces: "F = E − V + 2", ef: "E − F", vertices: "V = E − F + 2" }),
    domain: [[0, 2], [3, 12], [0, 2]],
    difficulty: ([k, n]) => (n <= 5 ? 1 : k === 2 || n >= 10 ? 3 : 2),
    word: ([k, n, a]) => {
      const { F, V, E } = counts(k, n);
      return a === 0 ? `${name(n)} builds a model of a solid with straws for edges and clay balls for corners. The model has ${F} flat faces and uses ${V} clay balls. How many straws does it use?`
        : a === 1 ? `${name(n)} builds a model of a solid with ${E} straws for edges and ${V} clay balls for corners. How many flat faces does the model have?`
        : `${name(n)} builds a model of a solid with ${E} straws for edges. It has ${F} flat faces. How many clay balls (corners) does it use?`;
    },
    teach: {
      idea: "For every polyhedron without holes, faces + vertices − edges = 2. Knowing any two of the counts gives the third.",
      method: "Write F + V − E = 2, put in the two numbers you know, and solve for the third.",
      visual: () => ({ type: "solid", name: "cube" }),
      alternatives: [
        { id: "check_cube", title: "Check it on a cube first", kind: "conceptual", text: ["A cube has 6 faces, 8 vertices and 12 edges: 6 + 8 − 12 = 2.", "Use the same pattern with the numbers in the question: the answer must make F + V − E come to 2."], visual: () => ({ type: "solid", name: "cube" }) },
      ],
    },
    limits: "The counts of prisms, pyramids and double pyramids on 3- to 12-sided bases; the solid is not named, so the formula is needed.",
  },
  {
    id: "aisolid",
    arity: 4,
    title: "Faces, edges and vertices of prisms and pyramids, from a name or a net",
    competency: VIEWS,
    type: "integer",
    mc: true,
    // [kind, n, what, net]: prism (0) or pyramid (1) on an n-gon; what 0 faces, 1 edges, 2 vertices; net 0 named, 1 described by its net
    parse: none,
    reject: ([k, n, w, t]) => (k < 0 || k > 1 || n < 3 || n > 10 || w < 0 || w > 2 || t < 0 || t > 1 ? "Prisms and pyramids on polygons with 3 to 10 sides." : null),
    prompt: ([k, n, w, t]) => (t ? `A net is made of ${netText(k, n)}. When it is folded up into a solid, how many ${WHAT[w]} does the solid have?` : `How many ${WHAT[w]} does ${an(solidName(k, n))} have?`),
    solve: ([k, n, w]) => {
      const c = counts(k, n);
      const v = w === 0 ? c.F : w === 1 ? c.E : c.V;
      if (k === 0) {
        const s = w === 0 ? step("faces", "add", VIEWS, [n, 2], v) : w === 1 ? step("edges", "multiply", VIEWS, [3, n], v) : step("vertices", "multiply", VIEWS, [2, n], v);
        return { steps: [s], answer: v };
      }
      const s = w === 0 ? step("faces", "add", VIEWS, [n, 1], v) : w === 1 ? step("edges", "multiply", VIEWS, [2, n], v) : step("vertices", "add", VIEWS, [n, 1], v);
      return { steps: [s], answer: v };
    },
    // independent: list every vertex, edge and face of the folded solid and count them
    validate: ([k, n, w], v) => {
      const c = build(k, n);
      return v === (w === 0 ? c.F : w === 1 ? c.E : c.V);
    },
    bugs: ([k, n, w, t]) => {
      const out: Bug[] = [];
      if (k === 0) {
        if (w === 0) out.push(B("ends-forgotten", "conceptual", VIEWS, "Only the side faces were counted; a prism also has two end faces.", n));
        if (w === 1) out.push(B("side-edges-forgotten", "conceptual", VIEWS, `Only the edges round the two ends were counted; there are also ${n} edges joining the ends.`, 2 * n));
        if (w === 2) out.push(B("one-end-only", "conceptual", VIEWS, "Only the corners of one end were counted; the other end has just as many.", n));
        if (t && w > 0) out.push(B("net-sides-counted", "conceptual", NETS, `Every ${w === 1 ? "side" : "corner"} of every piece of the net was counted; when the net folds up, ${w === 1 ? "two sides meet to make each edge" : "several corners meet at each vertex"}.`, 6 * n));
      } else {
        if (w === 0) out.push(B("base-forgotten", "conceptual", VIEWS, "Only the triangular faces were counted; the base is a face too.", n));
        if (w === 1) out.push(B("base-edges-only", "conceptual", VIEWS, `Only the edges round the base were counted; ${n} more edges go up to the top point.`, n));
        if (w === 2) out.push(B("apex-forgotten", "conceptual", VIEWS, "The top point (apex) was forgotten; it is a vertex too.", n));
        if (t && w > 0) out.push(B("net-sides-counted", "conceptual", NETS, `Every ${w === 1 ? "side" : "corner"} of every piece of the net was counted; when the net folds up, ${w === 1 ? "two sides meet to make each edge" : "several corners meet at each vertex"}.`, 4 * n));
      }
      return out;
    },
    distractors: ([k, n, w]) => {
      const c = counts(k, n);
      return [w === 0 ? c.V : c.F, w === 1 ? c.V : c.E];
    },
    variants: () => [],
    explain: say({ faces: "Faces", edges: "Edges", vertices: "Vertices" }),
    domain: [[0, 1], [3, 10], [0, 2], [0, 1]],
    difficulty: ([k, n, w, t]) => (n <= 4 && !t ? 1 : t && w > 0 ? 3 : 2),
    figure: ([k, n]) => (n === 4 ? { type: "solid", name: k === 0 ? "cuboid" : "pyramid" } : null),
    word: ([k, n, w, t]) => (t ? `${name(n + w)} has a craft sheet cut into ${netText(k, n)}. Folded up, it makes a closed box shape. How many ${WHAT[w]} does the box shape have?` : `${name(n + w)} has a paperweight shaped like ${an(solidName(k, n))}. How many ${WHAT[w]} does the paperweight have?`),
    teach: {
      idea: `A prism has two equal ends joined by rectangles; a pyramid has one base and triangles meeting at a top point. The shape of the end or base tells you all the counts.`,
      method: "For a prism on an n-sided end: n + 2 faces, 3n edges (n round each end and n joining them), 2n vertices. For a pyramid on an n-sided base: n + 1 faces, 2n edges, n + 1 vertices.",
      visual: ([k]) => ({ type: "solid", name: k === 0 ? "cuboid" : "pyramid" }),
      alternatives: [
        { id: "fold_net", title: "Fold the net in your mind", kind: "conceptual", text: ["Each piece of the net becomes one face.", "When the net folds, sides of two pieces meet to make one edge, so the solid has half as many edges as the pieces have sides."] },
      ],
    },
    limits: "Prisms and pyramids with 3- to 10-sided ends; matching drawn views and drawing on isometric grids are not marked automatically (they need a picture or a drawing).",
  },
  // ================================================================ quadrilaterals
  {
    id: "aiquad",
    arity: 3,
    title: "The fourth angle of a quadrilateral",
    competency: QUAD,
    type: "integer",
    mc: true,
    // [a, b, c]: three angles in steps of 5°
    parse: none,
    reject: ([a, b, c]) => (Math.min(a, b, c) < 8 || Math.max(a, b, c) > 34 ? "Angles from 40° to 170° in steps of 5°." : null),
    prompt: ([a, b, c]) => `In quadrilateral PQRS, ∠P = ${5 * a}°, ∠Q = ${5 * b}° and ∠R = ${5 * c}°. Find ∠S, in degrees.`,
    solve: ([a, b, c]) => {
      const g = 5 * (a + b + c);
      return { steps: [step("given", "add", "MATH.number.addition", [5 * a, 5 * b, 5 * c], g), step("last", "subtract", QUAD, [360, g], 360 - g)], answer: 360 - g };
    },
    // independent: the turns at the four corners (180° − angle) make one full turn of 360°
    validate: ([a, b, c], v) => typeof v === "number" && v > 0 && v < 180 && (180 - 5 * a) + (180 - 5 * b) + (180 - 5 * c) + (180 - v) === 360,
    bugs: ([a, b, c]) => {
      const g = 5 * (a + b + c);
      return [
        B("angle-left-out", "procedural", QUAD, `Only two of the three given angles were taken from 360°; all three (${5 * a}°, ${5 * b}° and ${5 * c}°) must be taken away.`, 360 - 5 * (a + b)),
        B("total-given", "procedural", QUAD, "The three angles were added, but the total was not taken from 360°.", g),
      ];
    },
    variants: () => [],
    explain: say({ given: "Three angles", last: "∠S" }),
    domain: [[8, 34], [8, 34], [8, 34]],
    keep: ([a, b, c]) => {
      const d = 360 - 5 * (a + b + c);
      return d >= 30 && d <= 175;
    },
    cap: 400,
    difficulty: ([a, b, c]) => ((a + b + c) % 2 === 0 && Math.max(a, b, c) < 20 ? 1 : Math.max(a, b, c) > 28 ? 3 : 2),
    // no picture: a drawn quadrilateral would not have these angles
    word: ([a, b, c]) => `A four-sided plot of land has corner angles of ${5 * a}°, ${5 * b}° and ${5 * c}°. ${name(a + b)} wants to know the fourth corner angle. What is it, in degrees?`,
    teach: {
      idea: "A diagonal cuts a quadrilateral into two triangles, so its four angles add to 2 × 180° = 360°.",
      method: "Add the three angles you know and take the total from 360°.",
      alternatives: [{ id: "tear_corners", title: "Tear off the corners", kind: "conceptual", text: ["Cut out a four-sided shape and tear off its four corners.", "Put the corners together point to point: they make a full turn, 360°."] }],
    },
    limits: "Convex quadrilaterals with angles in steps of 5°; reflex angles are left out.",
  },
  {
    id: "aipgram",
    arity: 3,
    title: "Angles of a parallelogram or rhombus",
    competency: QUAD,
    type: "integer",
    mc: true,
    // [A, ask, shape]: ∠A = 5A degrees; ask 0 ∠B, 1 ∠C, 2 ∠D; shape 0 parallelogram, 1 rhombus
    parse: none,
    reject: ([A, k, s]) => (A < 7 || A > 34 || A === 18 || k < 0 || k > 2 || s < 0 || s > 1 ? "∠A from 35° to 170° (not 90°), in steps of 5°." : null),
    prompt: ([A, k, s]) => `ABCD is a ${s ? "rhombus" : "parallelogram"} with ∠A = ${5 * A}°. Find ∠${"BCD"[k]}, in degrees.`,
    solve: ([A, k]) => {
      const a = 5 * A;
      return k === 1 ? { steps: [step("opposite", "note", QUAD, ["opposite angles are equal", a], a)], answer: a } : { steps: [step("adjacent", "subtract", QUAD, [180, a], 180 - a)], answer: 180 - a };
    },
    // independent: the four angles add to 360°, with ∠A = ∠C and ∠B = ∠D (opposite angles equal)
    validate: ([A, k], v) => {
      if (typeof v !== "number") return false;
      const a = 5 * A;
      return k === 1 ? v === a && 2 * a + 2 * (180 - v) === 360 && v + (360 - 2 * a) / 2 === 180 : 2 * a + 2 * v === 360;
    },
    bugs: ([A, k, s]) => {
      const a = 5 * A;
      if (k === 1) return [B("opposite-supplementary", "conceptual", QUAD, "Opposite angles were taken to add to 180°; in a parallelogram opposite angles are equal and neighbouring angles add to 180°.", 180 - a), ...(s ? [B("rhombus-square", "conceptual", QUAD, "A rhombus was treated as a square; its sides are equal but its angles need not be right angles.", 90)] : [])];
      return [
        B("all-equal", "conceptual", QUAD, "All the angles were taken to be equal; only opposite angles are equal. Neighbouring angles add to 180° because AB is parallel to DC.", a),
        B("neighbours-360", "conceptual", QUAD, "Neighbouring angles were taken to add to 360°; it is all four angles that add to 360°, and two neighbours add to 180°.", 360 - a),
        ...(s ? [B("rhombus-square", "conceptual", QUAD, "A rhombus was treated as a square; its sides are equal but its angles need not be right angles.", 90)] : []),
      ];
    },
    variants: () => [],
    explain: (s) => (s.id === "opposite" ? `∠C is opposite ∠A, and opposite angles of a parallelogram are equal: ∠C = ${s.value}°` : `∠A and this angle are neighbours on parallel sides, so they add to 180°: 180° − ${s.inputs[1]}° = ${s.value}°`),
    domain: [[7, 34], [0, 2], [0, 1]],
    keep: ([A]) => A !== 18,
    difficulty: ([A, k]) => (k === 1 ? 1 : A % 2 === 0 ? 2 : 3),
    figure: ([, , s]) => ({ type: "shape", kind: s ? "rhombus" : "parallelogram", name: s ? "rhombus ABCD" : "parallelogram ABCD" }),
    word: ([A, k, s]) => `A ${s ? "rhombus-shaped tile" : "parallelogram-shaped window pane"} ABCD has an angle of ${5 * A}° at corner A. ${name(A)} needs the angle at corner ${"BCD"[k]}. What is it, in degrees?`,
    teach: {
      idea: "In a parallelogram (a rhombus is one), opposite sides are parallel, so neighbouring angles add to 180° and opposite angles are equal.",
      method: "Decide whether the angle you want is opposite ∠A (then it equals ∠A) or next to ∠A (then it is 180° − ∠A).",
      visual: ([, , s]) => ({ type: "shape", kind: s ? "rhombus" : "parallelogram", name: s ? "rhombus" : "parallelogram" }),
      alternatives: [{ id: "parallel_lines", title: "See the parallel lines", kind: "conceptual", text: ["AD and BC are parallel, and AB crosses them.", "∠A and ∠B are co-interior angles between parallel lines, so they add to 180°. Going round, ∠C comes back to the same size as ∠A."] }],
    },
    limits: "One angle given, the others found from the parallelogram properties; angles found from algebraic expressions are left out.",
  },
  {
    id: "aidiag",
    arity: 3,
    title: "Diagonals of rectangles and parallelograms",
    competency: QUAD,
    type: "integer",
    mc: true,
    // [shape, m, b]: rectangle (0): AC = 2m, AB = b, find OB; parallelogram (1): OA = m, OB = b, find AC
    parse: none,
    reject: ([s, m, b]) => (s < 0 || s > 1 || m < 2 || m > 20 || b < 2 || b > 30 || b === m || (s === 0 ? b >= 2 * m : b > 20) ? "Rectangles with a side shorter than the diagonal; parallelograms with unequal half-diagonals." : null),
    prompt: ([s, m, b]) => (s === 0 ? `In rectangle ABCD, the diagonals AC and BD cross at O. AC = ${2 * m} cm and AB = ${b} cm. How long is OB, in cm?` : `In parallelogram ABCD, the diagonals AC and BD cross at O. OA = ${m} cm and OB = ${b} cm. How long is AC, in cm?`),
    solve: ([s, m]) => (s === 0 ? { steps: [step("equal", "note", QUAD, ["BD = AC", 2 * m], 2 * m), step("half", "half", QUAD, [2 * m], m)], answer: m } : { steps: [step("double", "multiply", QUAD, [2, m], 2 * m)], answer: 2 * m }),
    // independent: put the shape on coordinates and measure the length
    validate: ([s, m, b], v) => {
      if (typeof v !== "number") return false;
      if (s === 0) {
        const bc = Math.sqrt(4 * m * m - b * b); // A(0,0) B(b,0) C(b,bc) D(0,bc)
        const O = [b / 2, bc / 2];
        return near(Math.hypot(O[0] - b, O[1]), v);
      }
      // A = O − (m, 0) direction; C is as far beyond O as A is before it
      const A = [-m, 0];
      const C = [-A[0], -A[1]];
      return near(Math.hypot(C[0] - A[0], C[1] - A[1]), v);
    },
    bugs: ([s, m, b]) =>
      s === 0
        ? [B("whole-diagonal", "procedural", QUAD, "The whole diagonal was given; the diagonals of a rectangle are equal and cut each other in half, so OB is half of BD.", 2 * m), B("side-for-half-diagonal", "conceptual", QUAD, "The side AB was used; OB is half of the diagonal BD, not a side.", b)]
        : [B("diagonals-equal", "conceptual", QUAD, "The diagonals of a parallelogram were taken to be equal; they cut each other in half but need not be equal (that is only true in a rectangle).", 2 * b), B("not-doubled", "procedural", QUAD, "OA is only half of AC; O is the midpoint of AC.", m), B("added-halves", "procedural", QUAD, "OA and OB were added; they lie on different diagonals. AC = OA + OC = 2 × OA.", m + b)],
    variants: () => [],
    explain: (s) => (s.id === "equal" ? `The diagonals of a rectangle are equal: BD = AC = ${s.value} cm` : s.id === "half" ? `They cut each other in half: OB = ${s.inputs[0]} ÷ 2 = ${s.value} cm` : `O is the midpoint of AC: AC = 2 × ${s.inputs[1]} = ${s.value} cm`),
    domain: [[0, 1], [2, 20], [2, 30]],
    keep: ([s, m, b]) => b !== m && (s === 0 ? b < 2 * m : b <= 20),
    cap: 300,
    difficulty: ([s, m]) => (s === 0 && m <= 10 ? 1 : s === 0 ? 2 : 3),
    figure: ([s, , b]) => (s ? { type: "shape", kind: "parallelogram", diagonals: true, name: "parallelogram ABCD with its diagonals" } : { type: "shape", kind: "rectangle", diagonals: true, name: "rectangle ABCD with its diagonals", lengths: [`${b} cm`, "", "", ""] }),
    word: ([s, m, b]) => (s === 0 ? `A rectangular gate ABCD has two straight bars along its diagonals, crossing at O. Bar AC is ${2 * m} cm long and the gate is ${b} cm wide along AB. How long is OB, in cm?` : `A garden gate frame is a parallelogram ABCD with two straight bars along its diagonals, crossing at O. OA is ${m} cm and OB is ${b} cm. How long is the whole bar AC, in cm?`),
    teach: {
      idea: "The diagonals of every parallelogram cut each other in half. In a rectangle they are also equal in length.",
      method: "Mark O as the midpoint of each diagonal. For a rectangle, BD = AC, so OB = AC ÷ 2. For a parallelogram, AC = 2 × OA.",
      alternatives: [{ id: "fold_paper", title: "Fold and measure", kind: "conceptual", text: ["Draw a rectangle and both diagonals, then fold the paper so A lands on C: the crease passes through O, the middle of AC.", "Measure OA, OB, OC and OD: in a rectangle all four are equal."] }],
    },
    limits: "Rectangles and parallelograms with whole-number half-diagonals; proofs of the properties are marked by an educator.",
  },
  // ================================================================ scale drawings
  {
    id: "aiscale",
    arity: 3,
    title: "Map scale: 1 cm stands for k km",
    competency: SCALE,
    type: "integer",
    mc: true,
    // [i, d, dir]: k = SCALES[i]; dir 0 map → real; dir 1 real → map
    parse: none,
    reject: ([i, d, r]) => (i < 0 || i >= SCALES.length || d < 2 || d > 15 || r < 0 || r > 1 ? "Scales of 1 cm to 2–50 km and map distances of 2–15 cm." : null),
    prompt: ([i, d, r]) => (r === 0 ? `On a map, 1 cm stands for ${SCALES[i]} km. Two villages are ${d} cm apart on the map. How far apart are they really, in km?` : `On a map, 1 cm stands for ${SCALES[i]} km. Two towns are really ${SCALES[i] * d} km apart. How far apart are they on the map, in cm?`),
    solve: ([i, d, r]) => (r === 0 ? { steps: [step("real", "multiply", SCALE, [d, SCALES[i]], SCALES[i] * d)], answer: SCALES[i] * d } : { steps: [step("map", "divide", SCALE, [SCALES[i] * d, SCALES[i]], d)], answer: d }),
    // independent: step along the map one centimetre at a time, adding k km for each
    validate: ([i, d, r], v) => {
      if (r === 0) {
        let t = 0;
        for (let c = 0; c < d; c++) t += SCALES[i];
        return v === t;
      }
      let t = 0;
      let c = 0;
      while (t < SCALES[i] * d) (t += SCALES[i]), c++;
      return v === c;
    },
    bugs: ([i, d, r]) => {
      const k = SCALES[i];
      return r === 0
        ? [B("divided", "conceptual", SCALE, `The map distance was divided by ${k}; every 1 cm on the map is ${k} km, so multiply.`, d % k === 0 ? d / k : null), B("added", "conceptual", SCALE, `${k} was added; each of the ${d} centimetres stands for ${k} km.`, d + k)]
        : [B("multiplied", "conceptual", SCALE, `The real distance was multiplied by ${k}; the map is smaller, so divide by ${k}.`, k * k * d), B("subtracted", "conceptual", SCALE, `${k} was taken away; find how many lots of ${k} km make the distance.`, k * d - k)];
    },
    variants: () => [],
    explain: (s) => (s.id === "real" ? `${s.inputs[0]} cm × ${s.inputs[1]} km for each cm = ${s.value} km` : `${s.inputs[0]} km ÷ ${s.inputs[1]} km for each cm = ${s.value} cm`),
    domain: [[0, SCALES.length - 1], [2, 15], [0, 1]],
    difficulty: ([i, d]) => (SCALES[i] <= 10 && d <= 9 ? 1 : SCALES[i] === 25 || d > 12 ? 3 : 2),
    word: ([i, d, r]) => (r === 0 ? `${name(d)} is planning a bus trip. On the route map, 1 cm stands for ${SCALES[i]} km, and the trip measures ${d} cm. How long is the trip, in km?` : `${name(d)} wants to mark a trip of ${SCALES[i] * d} km on a map where 1 cm stands for ${SCALES[i]} km. How long a line should be drawn, in cm?`),
    teach: {
      idea: "A map scale says how much real distance each centimetre on the map stands for; distances on the map and on the ground are in the same proportion.",
      method: "Map to real: multiply the map length by the scale. Real to map: divide the real distance by the scale.",
      alternatives: [{ id: "ratio_table", title: "A ratio table", kind: "procedural", text: ["Write 1 cm → k km in the first column.", "Scale both sides by the same number to reach the length you know, then read the other side."], visual: ([i, d]) => ({ type: "table", head: ["map (cm)", "real (km)"], rows: [[1, SCALES[i]], [2, 2 * SCALES[i]], [d, "?"]] }) }],
    },
    limits: "Scales written as 1 cm to k km with whole-number answers; ratio scales are the family airatio.",
  },
  {
    id: "airatio",
    arity: 2,
    title: "Ratio scales 1 : n with unit conversion",
    competency: SCALE,
    type: "exact",
    mc: true,
    // [i, d]: scale 1 : RATIOS[i], drawing length d cm; answer in m (n ≤ 1000) or km
    parse: none,
    reject: ([i, d]) => (i < 0 || i >= RATIOS.length || d < 1 || d > 20 ? "Scales 1 : 100 to 1 : 100000, drawing lengths 1–20 cm." : null),
    prompt: ([i, d]) => {
      const n = RATIOS[i];
      return n <= 1000 ? `A plan is drawn to the scale 1 : ${n}. A wall is ${d} cm long on the plan. How long is the real wall, in metres?` : `A map is drawn to the scale 1 : ${n}. A road is ${d} cm long on the map. How long is the real road, in km?`;
    },
    solve: ([i, d]) => {
      const n = RATIOS[i];
      const cm = d * n;
      const out = n <= 1000 ? D(cm, 100) : D(cm, 100000);
      return { steps: [step("real-cm", "multiply", SCALE, [d, n], cm), step("convert", "divide", UNIT, [cm, n <= 1000 ? 100 : 100000], out)], answer: out };
    },
    // independent: shrink the answer back to the drawing (to cm, then divide by n) and compare with the given length
    validate: ([i, d], v) => {
      const x = val(v);
      const n = RATIOS[i];
      return !!x && qe(qd(qm(x, [n <= 1000 ? 100 : 100000, 1]), [n, 1]), [d, 1]);
    },
    bugs: ([i, d]) => {
      const n = RATIOS[i];
      return n <= 1000
        ? [B("not-converted", "procedural", UNIT, "The length was found in centimetres but not changed to metres (100 cm = 1 m).", D(d * n)), B("thousand-for-hundred", "recall", UNIT, "It was divided by 1000; 100 cm make 1 m.", D(d * n, 1000))]
        : [B("not-converted", "procedural", UNIT, "The length was found in centimetres but not changed to kilometres (100 000 cm = 1 km).", D(d * n)), B("thousand-for-km", "recall", UNIT, "It was divided by 1000; 1 km = 1000 m = 100 000 cm.", D(d * n, 1000)), B("metres-only", "procedural", UNIT, "The centimetres were changed to metres but not on to kilometres.", D(d * n, 100))];
    },
    distractors: ([i, d]) => [D(d * RATIOS[i], 10), D(d * RATIOS[i] * 10, RATIOS[i] <= 1000 ? 100 : 100000), D(d + RATIOS[i])],
    variants: () => [],
    explain: (s) => (s.id === "real-cm" ? `Every 1 cm stands for ${s.inputs[1]} cm: ${s.inputs[0]} × ${s.inputs[1]} = ${s.value} cm` : `${s.inputs[0]} cm ÷ ${s.inputs[1]} = ${s.value} ${Number(s.inputs[1]) === 100 ? "m" : "km"}`),
    domain: [[0, RATIOS.length - 1], [1, 20]],
    difficulty: ([i]) => (RATIOS[i] <= 200 ? 1 : RATIOS[i] <= 1000 ? 2 : 3),
    word: ([i, d]) => (RATIOS[i] <= 1000 ? `${name(d + i)} is reading the plan of a new school building, drawn at 1 : ${RATIOS[i]}. ${wallOf((d * RATIOS[i]) / 100)} measures ${d} cm on the plan. How long is it, in metres?` : `On a district map drawn at 1 : ${RATIOS[i]}, a canal measures ${d} cm. How long is the canal, in km?`),
    teach: {
      idea: "A scale 1 : n means every length in the real world is n times the length on the drawing, in the same unit.",
      method: "Multiply the drawing length by n to get centimetres, then change units: ÷ 100 for metres, ÷ 100 000 for kilometres.",
      alternatives: [{ id: "one_cm_first", title: "What does 1 cm stand for?", kind: "procedural", text: ["Change the scale first: 1 : 50 000 means 1 cm stands for 50 000 cm = 500 m = 0.5 km.", "Then multiply by the number of centimetres on the drawing."] }],
    },
    limits: "Scales from 1 : 100 to 1 : 100 000 with lengths in whole centimetres; enlargements (scales n : 1) are left out.",
  },
  // ================================================================ cube and cuboid volume
  {
    id: "aicvol",
    arity: 3,
    title: "Volume of a cuboid or cube from its edges",
    competency: CVOL,
    type: "integer",
    mc: true,
    parse: none,
    reject: ([l, w, h]) => (Math.min(l, w, h) < 2 || Math.max(l, w, h) > 25 || l < w ? "Cuboids with whole-number edges from 2 to 25 (length at least the width)." : null),
    prompt: ([l, w, h]) => (l === w && w === h ? `A cube has edges ${l} cm long. What is its volume, in cm³?` : `A cuboid is ${l} cm long, ${w} cm wide and ${h} cm high. What is its volume, in cm³?`),
    solve: ([l, w, h]) => ({ steps: [step("base", "multiply", RAREA, [l, w], l * w), step("volume", "multiply", CVOL, [l * w, h], l * w * h)], answer: l * w * h }),
    // independent: add up the layers, one base layer of l × w cubes for each centimetre of height (repeated addition)
    validate: ([l, w, h], v) => {
      let t = 0;
      for (let k = 0; k < h; k++) for (let j = 0; j < w; j++) t += l;
      return v === t;
    },
    bugs: ([l, w, h]) => [
      B("added-edges", "conceptual", CVOL, "The edges were added; volume multiplies length, width and height.", l + w + h),
      B("one-layer", "conceptual", CVOL, "Only the base (length × width) was found; there are as many layers as the height.", l * w, "gen:vol:" + [Math.min(l, 8), Math.min(w, 8), Math.min(h, 8)].join(",")),
      B("surface-for-volume", "conceptual", SURF, "The area of the outside faces was found; volume measures the space inside.", 2 * (l * w + w * h + h * l)),
    ],
    variants: () => [],
    explain: say({ base: "Base area (cubes in one layer)", volume: "Volume" }),
    domain: [[2, 25], [2, 25], [2, 25]],
    keep: ([l, w]) => l >= w,
    cap: 400,
    difficulty: ([l, w, h]) => (l * w * h <= 200 ? 1 : l * w * h <= 2000 ? 2 : 3),
    figure: ([l, w, h]) => (l === w && w === h ? { type: "solid", name: "cube", dims: [`${l} cm`] } : { type: "solid", name: "cuboid", dims: [`${l} cm`, `${w} cm`, `${h} cm`] }),
    word: ([l, w, h]) => (l === w && w === h ? `${name(l)} has a cube-shaped box with edges of ${l} cm. How many cm³ of space is inside it?` : `A wooden block is ${l} cm long, ${w} cm wide and ${h} cm high. How much space does it take up, in cm³?`),
    teach: {
      idea: "Volume counts how many 1 cm cubes fill a solid. One layer on the base holds length × width cubes, and there are as many layers as the height.",
      method: "Volume = length × width × height. For a cube with edge a, volume = a × a × a = a³.",
      visual: ([l, w, h]) => ({ type: "solid", name: "cuboid", dims: [`${l} cm`, `${w} cm`, `${h} cm`] }),
      alternatives: [{ id: "layers", title: "Count in layers", kind: "conceptual", text: ["Imagine filling the box with 1 cm cubes: the bottom layer is a rectangle of cubes, length × width.", "Stack the same layer once for every centimetre of height."], visual: ([l, w]) => (l <= 12 && w <= 12 ? { type: "grid", rows: w, cols: l } : null) }],
    },
    limits: "Whole-number edges from 2 to 25 cm; decimal edges and units other than cm are left out here.",
  },
  {
    id: "aicap",
    arity: 4,
    title: "Capacity of a tank in litres",
    competency: CVOL,
    type: "integer",
    mc: true,
    // [a, b, c, u]: u 0 edges 10a, 10b, 10c cm; u 1 edges a, b, c m
    parse: none,
    reject: ([a, b, c, u]) => (Math.min(a, b, c) < 1 || Math.max(a, b, c) > 10 || a < b || u < 0 || u > 1 || (u === 1 && Math.max(a, b, c) > 5) ? "Tanks with edges in tens of cm up to 1 m, or whole metres up to 5 m." : null),
    prompt: ([a, b, c, u]) => (u === 0 ? `A tank is ${10 * a} cm long, ${10 * b} cm wide and ${10 * c} cm deep. How many litres of water can it hold? (1 litre = 1000 cm³)` : `A tank is ${a} m long, ${b} m wide and ${c} m deep. How many litres of water can it hold? (1 m³ = 1000 litres)`),
    solve: ([a, b, c, u]) => {
      if (u === 0) {
        const v = 1000 * a * b * c;
        return { steps: [step("volume", "multiply", CVOL, [10 * a, 10 * b, 10 * c], v), step("litres", "divide", UNIT, [v, 1000], a * b * c)], answer: a * b * c };
      }
      return { steps: [step("volume", "multiply", CVOL, [a, b, c], a * b * c), step("litres", "multiply", UNIT, [a * b * c, 1000], 1000 * a * b * c)], answer: 1000 * a * b * c };
    },
    // independent: count the 1-litre (10 cm) or 1 m³ blocks that fill the tank, one by one
    validate: ([a, b, c, u], v) => {
      let n = 0;
      for (let i = 0; i < a; i++) for (let j = 0; j < b; j++) for (let k = 0; k < c; k++) n++;
      return v === (u === 0 ? n : n * 1000);
    },
    bugs: ([a, b, c, u]) =>
      u === 0
        ? [B("cm3-not-litres", "procedural", UNIT, "The volume in cm³ was given; 1000 cm³ make 1 litre, so divide by 1000.", 1000 * a * b * c), B("hundred-for-thousand", "recall", UNIT, "It was divided by 100; 1 litre is 1000 cm³.", 10 * a * b * c)]
        : [B("m3-not-litres", "procedural", UNIT, "The volume in m³ was given; each m³ holds 1000 litres.", a * b * c), B("hundred-for-thousand", "recall", UNIT, "It was multiplied by 100; 1 m³ holds 1000 litres.", 100 * a * b * c)],
    variants: () => [],
    explain: (s) => (s.id === "volume" ? `Volume: ${s.inputs.join(" × ")} = ${s.value} ${s.inputs[0] && Number(s.inputs[0]) >= 10 ? "cm³" : "m³"}` : s.op === "divide" ? `${s.inputs[0]} cm³ ÷ 1000 = ${s.value} litres` : `${s.inputs[0]} m³ × 1000 = ${s.value} litres`),
    domain: [[1, 10], [1, 10], [1, 10], [0, 1]],
    keep: ([a, b, c, u]) => a >= b && (u === 0 || Math.max(a, b, c) <= 5),
    cap: 300,
    difficulty: ([a, b, c, u]) => (u === 0 && a * b * c <= 60 ? 1 : u === 1 ? 3 : 2),
    figure: ([a, b, c, u]) => ({ type: "solid", name: "cuboid", dims: u === 0 ? [`${10 * a} cm`, `${10 * b} cm`, `${10 * c} cm`] : [`${a} m`, `${b} m`, `${c} m`] }),
    word: ([a, b, c, u]) => (u === 0 ? `${name(a + c)}'s aquarium is ${10 * a} cm long, ${10 * b} cm wide and ${10 * c} cm deep. How many litres of water fill it to the top?` : `A village water tank is ${a} m long, ${b} m wide and ${c} m deep. How many litres does it hold when full?`),
    teach: {
      idea: "Capacity is volume measured in litres. A 10 cm cube holds exactly 1 litre (1000 cm³), and a 1 m cube holds 1000 litres.",
      method: "Find the volume (length × width × height), then change units: cm³ ÷ 1000 = litres; m³ × 1000 = litres.",
      alternatives: [{ id: "litre_cubes", title: "Count litre cubes", kind: "conceptual", text: ["A 10 cm × 10 cm × 10 cm cube holds 1 litre.", "Count how many such cubes fit along each edge, and multiply the three counts."] }],
    },
    limits: "Edges in tens of centimetres or whole metres; millilitres and partly filled tanks are left out.",
  },
  {
    id: "aipack",
    arity: 4,
    title: "Packing cubes into a box",
    competency: CVOL,
    type: "integer",
    mc: true,
    // [a, L, W, H]: cubes of edge a cm into an L × W × H cm box
    parse: none,
    reject: ([a, L, W, H]) => (a < 2 || a > 5 || Math.min(L, W, H) < a || Math.max(L, W, H) > 20 || L < W || (L % a === 0 && W % a === 0 && H % a === 0) ? "Cubes of edge 2–5 cm into boxes up to 20 cm, where at least one edge leaves a gap." : null),
    prompt: ([a, L, W, H]) => `How many cubes of edge ${a} cm can be packed into a box ${L} cm long, ${W} cm wide and ${H} cm high? (The cubes cannot be cut.)`,
    solve: ([a, L, W, H]) => {
      const [x, y, z] = [Math.floor(L / a), Math.floor(W / a), Math.floor(H / a)];
      return { steps: [step("along", "divide", CVOL, [L, a], x), step("across", "divide", CVOL, [W, a], y), step("up", "divide", CVOL, [H, a], z), step("total", "multiply", CVOL, [x, y, z], x * y * z)], answer: x * y * z };
    },
    // independent: place cubes one at a time, row by row, while they still fit inside the box
    validate: ([a, L, W, H], v) => {
      let n = 0;
      for (let x = 0; x + a <= L; x += a) for (let y = 0; y + a <= W; y += a) for (let z = 0; z + a <= H; z += a) n++;
      return v === n;
    },
    bugs: ([a, L, W, H]) => [
      B("volume-divided", "conceptual", CVOL, "The box's volume was divided by a cube's volume; that counts cut pieces of cubes too. Count how many whole cubes fit along each edge instead.", Math.floor((L * W * H) / (a * a * a))),
      B("rounded-up", "procedural", CVOL, "A part of a cube was counted as a whole one; only whole cubes fit, so round each count down.", Math.ceil(L / a) * Math.ceil(W / a) * Math.ceil(H / a)),
    ],
    variants: () => [],
    explain: (s) => (s.id === "total" ? `${s.inputs.join(" × ")} = ${s.value} cubes` : `${s.inputs[0]} cm ÷ ${s.inputs[1]} cm: ${s.value} whole cubes fit`),
    domain: [[2, 5], [4, 20], [4, 20], [4, 20]],
    keep: ([a, L, W, H]) => L >= W && Math.min(L, W, H) >= a && !(L % a === 0 && W % a === 0 && H % a === 0),
    cap: 300,
    difficulty: ([a, L, W, H]) => ([L, W, H].filter((x) => x % a !== 0).length === 1 ? 1 : [L, W, H].every((x) => x % a !== 0) ? 3 : 2),
    figure: ([, L, W, H]) => ({ type: "solid", name: "cuboid", dims: [`${L} cm`, `${W} cm`, `${H} cm`] }),
    word: ([a, L, W, H]) => `A shop packs cube-shaped soaps with ${a} cm edges into a carton ${L} cm long, ${W} cm wide and ${H} cm high. How many soaps fit in the carton?`,
    teach: {
      idea: "Only whole cubes fit, so a gap smaller than a cube is wasted. Count whole cubes along each edge first.",
      method: "Divide each edge of the box by the cube's edge and drop any remainder; multiply the three whole numbers.",
      alternatives: [{ id: "one_layer", title: "Build one layer", kind: "procedural", text: ["Fill the floor of the box: (cubes along) × (cubes across).", "Then see how many such layers fit in the height, rounding down."] }],
    },
    limits: "Cubes into cuboid boxes, all edges whole centimetres up to 20; mixed shapes and turning items are left out.",
  },
  // ================================================================ triangle area
  {
    id: "aitri",
    arity: 3,
    title: "Area of a triangle from base and height",
    competency: TRI,
    type: "exact",
    mc: true,
    // [b, h, right]: right 1: a right triangle with legs b and h
    parse: none,
    reject: ([b, h, r]) => (b < 2 || b > 30 || h < 2 || h > 20 || r < 0 || r > 1 ? "Bases 2–30 cm and heights 2–20 cm." : null),
    prompt: ([b, h, r]) => (r ? `In a right-angled triangle, the two sides that meet at the right angle are ${b} cm and ${h} cm. Find its area, in cm².` : `A triangle has a base of ${b} cm and a height of ${h} cm. Find its area, in cm².`),
    solve: ([b, h]) => ({ steps: [step("rectangle", "multiply", RAREA, [b, h], b * h), step("half", "half", TRI, [b * h], D(b * h, 2))], answer: D(b * h, 2) }),
    // independent: the shoelace formula on the corners (0, 0), (b, 0) and a top corner at height h
    validate: ([b, h, r], v) => is(v, q(Math.round(2 * shoelace([[0, 0], [b, 0], [r ? 0 : Math.floor(b / 3), h]])), 2)),
    bugs: ([b, h]) => [
      B("no-half", "conceptual", TRI, "Base × height gives the rectangle around the triangle; the triangle is half of it.", D(b * h)),
      B("added", "conceptual", TRI, "Base and height were added; area multiplies them and then halves.", D(b + h)),
    ],
    distractors: ([b, h]) => [D(b * h, 4), D(2 * b * h), D(b + h, 2)],
    variants: () => [],
    explain: say({ rectangle: "Rectangle base × height", half: "Triangle area" }),
    domain: [[2, 30], [2, 20], [0, 1]],
    cap: 400,
    difficulty: ([b, h]) => ((b * h) % 2 === 0 && b * h <= 100 ? 1 : (b * h) % 2 === 0 ? 2 : 3),
    // side 0 is the base; in a right triangle sides 0 and 2 are the legs (side 1 the hypotenuse)
    figure: ([b, h, r]) => (r ? { type: "triangle", right: true, sides: [`${b} cm`, "", `${h} cm`] } : { type: "triangle", sides: [`${b} cm`, "", ""], height: `${h} cm` }),
    word: ([b, h, r]) => (r ? `${name(b)} cuts a right-angled triangle of cloth for a flag. The two edges at the right angle are ${b} cm and ${h} cm. How much cloth is it, in cm²?` : `A triangular flower bed has a base of ${b} m and a height of ${h} m. What is its area, in m²?`),
    teach: {
      idea: "A triangle is exactly half of a rectangle (or parallelogram) with the same base and height.",
      method: "Area = ½ × base × height. Multiply the base by the height and halve the result.",
      visual: ([b, h]) => ({ type: "triangle", right: true, sides: [`${b} cm`, "", `${h} cm`] }),
      alternatives: [{ id: "half_rectangle", title: "Half a rectangle", kind: "conceptual", text: ["Draw the rectangle with the same base and height around the triangle.", "The diagonal cuts it into two equal triangles, so each is half the rectangle's area."], visual: ([b, h]) => (b <= 12 && h <= 12 ? { type: "grid", rows: h, cols: b } : null) }],
    },
    limits: "Whole-centimetre bases and heights; Heron's formula and areas from slanted sides alone are left out.",
  },
  {
    id: "aitrih",
    arity: 3,
    title: "A missing base or height of a triangle",
    competency: TRI,
    type: "exact",
    mc: true,
    // [b, h, ask]: area ½bh given; ask 0 the height (base given), 1 the base (height given)
    parse: none,
    reject: ([b, h, k]) => (b < 2 || b > 24 || h < 2 || h > 20 || b === h || k < 0 || k > 1 ? "Bases 2–24 cm and heights 2–20 cm (different)." : null),
    prompt: ([b, h, k]) => (k === 0 ? `A triangle has an area of ${D(b * h, 2)} cm² and a base of ${b} cm. What is its height, in cm?` : `A triangle has an area of ${D(b * h, 2)} cm² and a height of ${h} cm. How long is its base, in cm?`),
    solve: ([b, h, k]) => {
      const A = D(b * h, 2);
      const known = k === 0 ? b : h;
      return { steps: [step("double", "multiply", TRI, [2, A], b * h), step("divide", "divide", TRI, [b * h, known], k === 0 ? h : b)], answer: String(k === 0 ? h : b) };
    },
    // independent: put the answer back into ½ × base × height and compare with the area given
    validate: ([b, h, k], v) => {
      const x = val(v);
      return !!x && qe(qm(qm(x, [k === 0 ? b : h, 1]), [1, 2]), q(b * h, 2));
    },
    bugs: ([b, h, k]) => {
      const known = k === 0 ? b : h;
      const want = k === 0 ? h : b;
      return [
        B("not-doubled", "conceptual", TRI, `The area was divided by ${known} without doubling it first; area = ½ × base × height, so the other length is 2 × area ÷ ${known}.`, D(want, 2)),
        B("subtracted", "conceptual", TRI, "The known length was taken from the area; area and length are linked by multiplying, so undo it by dividing.", (b * h) / 2 - known > 0 ? D(b * h - 2 * known, 2) : null),
      ];
    },
    distractors: ([b, h, k]) => [String(2 * (k === 0 ? h : b)), String((k === 0 ? h : b) + 1), D(b * h)],
    variants: () => [],
    explain: (s) => (s.id === "double" ? `Twice the area: 2 × ${s.inputs[1]} = ${s.value} cm² (the matching rectangle)` : `${s.inputs[0]} ÷ ${s.inputs[1]} = ${s.value} cm`),
    domain: [[2, 24], [2, 20], [0, 1]],
    keep: ([b, h]) => b !== h,
    cap: 400,
    difficulty: ([b, h]) => ((b * h) % 2 === 0 && b * h <= 100 ? 1 : (b * h) % 2 === 0 ? 2 : 3),
    figure: ([b, h, k]) => ({ type: "triangle", sides: [k === 0 ? `${b} cm` : "?", "", ""], height: k === 0 ? "?" : `${h} cm` }),
    word: ([b, h, k]) => (k === 0 ? `A triangular sail has an area of ${D(b * h, 2)} m². Its bottom edge is ${b} m long. How tall is the sail, in m?` : `A triangular garden patch has an area of ${D(b * h, 2)} m² and a height of ${h} m. How long is its base, in m?`),
    teach: {
      idea: "Area = ½ × base × height, so twice the area is base × height: the area of the matching rectangle.",
      method: "Double the area, then divide by the length you know.",
      alternatives: [{ id: "equation", title: "Write an equation", kind: "procedural", text: ["Write ½ × base × height = area with a letter for the missing length.", "Multiply both sides by 2, then divide by the known length."] }],
    },
    limits: "Whole-number answers from areas that are whole or end in .5.",
  },
  // ================================================================ circles
  {
    id: "aicircum",
    arity: 3,
    title: "Circumference of a circle",
    competency: CIRC,
    type: "exact",
    mc: true,
    // [r, g, pm]: radius r; g 0 radius given, 1 diameter given; pm 0 π = 22/7 (r a multiple of 7), 1 π = 3.14
    parse: none,
    reject: ([r, g, pm]) => (r < 1 || r > 50 || g < 0 || g > 1 || pm < 0 || pm > 1 || (pm === 0 && r % 7 !== 0) ? "Radii 1–50 cm; with π = 22/7 the radius is a multiple of 7." : null),
    prompt: ([r, g, pm]) => `A circle has a ${g ? `diameter of ${2 * r}` : `radius of ${r}`} cm. Taking π = ${piText(pm)}, find its circumference, in cm.`,
    solve: ([r, g, pm]) => {
      const C = qm(piOf(pm), [2 * r, 1]);
      return { steps: [...(g ? [] : [step("diameter", "multiply", CIRC, [2, r], 2 * r)]), step("circumference", "multiply", CIRC, [piText(pm), 2 * r], dec(C))], answer: dec(C) };
    },
    // independent: circumference ÷ diameter must be π
    validate: ([r, , pm], v) => {
      const x = val(v);
      return !!x && qe(qd(x, [2 * r, 1]), piOf(pm));
    },
    bugs: ([r, g, pm]) => {
      const p = piOf(pm);
      return [
        g ? B("doubled-diameter", "procedural", CIRC, "The diameter was doubled again; C = π × diameter, or 2 × π × radius.", dec(qm(p, [4 * r, 1]))) : B("radius-as-diameter", "procedural", CIRC, "π × radius was found; the circumference is π × diameter = 2πr.", dec(qm(p, [r, 1]))),
        B("area-for-circumference", "conceptual", CIRC, "πr² is the area (the space inside); the circumference is the distance around, 2πr.", dec(qm(p, [r * r, 1]))),
      ];
    },
    distractors: ([r, , pm]) => [dec(qm(piOf(pm), [r, 1])), dec(qm(piOf(pm), [4 * r, 1])), D(2 * r * 3)],
    variants: () => [],
    explain: (s) => (s.id === "diameter" ? `Diameter = 2 × radius = ${s.value} cm` : `C = π × d = ${s.inputs[0]} × ${s.inputs[1]} = ${s.value} cm`),
    domain: [[1, 50], [0, 1], [0, 1]],
    keep: ([r, , pm]) => pm === 1 || r % 7 === 0,
    difficulty: ([r, g, pm]) => (pm === 0 ? 1 : r <= 10 ? 2 : g ? 2 : 3),
    // the object fits the size: a button, a coaster, a cake or a table top
    word: ([r, g, pm]) => `${name(r)} is putting ${r <= 2 ? "a thread round the edge of a round button" : r <= 6 ? "lace round the edge of a round coaster" : r <= 20 ? "a ribbon round the edge of a circular cake" : "a strip of beading round the edge of a round table top"} with a ${g ? `diameter of ${2 * r}` : `radius of ${r}`} cm. Taking π = ${piText(pm)}, how long must it be, in cm?`,
    teach: {
      idea: "In every circle, the distance around (the circumference) divided by the diameter is the same number, π (about 22/7 or 3.14).",
      method: "C = π × diameter = 2 × π × radius. Double the radius first if you are given the radius.",
      alternatives: [{ id: "string", title: "Measure with a string", kind: "conceptual", text: ["Wrap a string around a bangle or a lid and lay it flat against a ruler.", "It is a little more than 3 diameters long: that number is π."] }],
    },
    limits: "Whole-number radii and diameters; finding the radius from a circumference is in aiwheel.",
  },
  {
    id: "aicarea",
    arity: 3,
    title: "Area of a circle",
    competency: CIRC,
    type: "exact",
    mc: true,
    // [r, g, pm]: as aicircum
    parse: none,
    reject: ([r, g, pm]) => (r < 1 || r > 40 || g < 0 || g > 1 || pm < 0 || pm > 1 || (pm === 0 && r % 7 !== 0) ? "Radii 1–40 cm; with π = 22/7 the radius is a multiple of 7." : null),
    prompt: ([r, g, pm]) => `A circle has a ${g ? `diameter of ${2 * r}` : `radius of ${r}`} cm. Taking π = ${piText(pm)}, find its area, in cm².`,
    solve: ([r, g, pm]) => {
      const A = qm(piOf(pm), [r * r, 1]);
      return { steps: [...(g ? [step("radius", "divide", CIRC, [2 * r, 2], r)] : []), step("square", "multiply", "MATH.number.exponents", [r, r], r * r), step("area", "multiply", CIRC, [piText(pm), r * r], dec(A))], answer: dec(A) };
    },
    // independent: cut the circle into thin sectors and rearrange them into a near-rectangle, half the circumference by the radius
    validate: ([r, , pm], v) => {
      const x = val(v);
      const C = qm(piOf(pm), [2 * r, 1]);
      return !!x && qe(x, qm(qm(C, [1, 2]), [r, 1]));
    },
    bugs: ([r, g, pm]) => {
      const p = piOf(pm);
      return [
        B("circumference-for-area", "conceptual", CIRC, "2πr is the circumference (the distance around); the area is πr².", dec(qm(p, [2 * r, 1]))),
        ...(g ? [B("diameter-squared", "procedural", CIRC, "The diameter was squared; the formula uses the radius, half the diameter.", dec(qm(p, [4 * r * r, 1])))] : []),
        B("not-squared", "procedural", CIRC, "π × r was found; the radius must be squared (r × r).", dec(qm(p, [r, 1]))),
      ];
    },
    distractors: ([r, , pm]) => [dec(qm(piOf(pm), [2 * r * r, 1])), dec(qm(piOf(pm), [4 * r * r, 1])), D(r * r)],
    variants: () => [],
    explain: (s) => (s.id === "radius" ? `Radius = diameter ÷ 2 = ${s.value} cm` : s.id === "square" ? `r² = ${s.inputs[0]} × ${s.inputs[1]} = ${s.value}` : `A = π × r² = ${s.inputs[0]} × ${s.inputs[1]} = ${s.value} cm²`),
    domain: [[1, 40], [0, 1], [0, 1]],
    keep: ([r, , pm]) => pm === 1 || r % 7 === 0,
    difficulty: ([r, g, pm]) => (pm === 0 && !g ? 1 : r <= 10 ? 2 : 3),
    word: ([r, g, pm]) => `${r <= 5 ? "A round sticker" : r <= 14 ? "A round chapati" : "A circular rangoli"} has a ${g ? `diameter of ${2 * r}` : `radius of ${r}`} cm. Taking π = ${piText(pm)}, how much ${r <= 5 ? "paper" : r <= 14 ? "of the pan" : "floor"} does it cover, in cm²?`,
    teach: {
      idea: "Cut a circle into many thin slices and lay them head to tail: they make a shape close to a rectangle, half the circumference (πr) long and r high. So the area is πr × r = πr².",
      method: "Find the radius (half the diameter), square it, and multiply by π.",
      alternatives: [{ id: "squares", title: "Compare with squares", kind: "conceptual", text: ["Draw the square on the radius: its area is r².", "The circle covers a little more than 3 of these squares — exactly π of them."] }],
    },
    limits: "Whole-number radii and diameters; semicircles and quadrants are left out here.",
  },
  {
    id: "aiwheel",
    arity: 3,
    title: "Distance travelled by a wheel",
    competency: CIRC,
    type: "exact",
    mc: true,
    // [k, n, mode]: wheel diameter 14k cm (circumference 44k cm); mode 0 distance after n turns (m), 1 turns for a distance
    parse: none,
    reject: ([k, n, m]) => (k < 1 || k > 6 || n < 5 || n > 60 || m < 0 || m > 1 ? "Wheels 14–84 cm across turning 5–60 times." : null),
    prompt: ([k, n, m]) => (m === 0 ? `A wheel has a diameter of ${14 * k} cm. How far does it roll in ${n} full turns, in metres? (Take π = 22/7.)` : `A wheel has a diameter of ${14 * k} cm. How many full turns does it make in rolling ${D(44 * k * n, 100)} m? (Take π = 22/7.)`),
    solve: ([k, n, m]) => {
      const C = 44 * k;
      if (m === 0) return { steps: [step("circumference", "multiply", CIRC, ["22/7", 14 * k], C), step("distance", "multiply", CIRC, [C, n], C * n), step("metres", "divide", UNIT, [C * n, 100], D(C * n, 100))], answer: D(C * n, 100) };
      return { steps: [step("circumference", "multiply", CIRC, ["22/7", 14 * k], C), step("cm", "multiply", UNIT, [D(C * n, 100), 100], C * n), step("turns", "divide", CIRC, [C * n, C], n)], answer: String(n) };
    },
    // independent: roll the wheel one turn at a time (adding π × d each turn) until the distance is reached
    validate: ([k, n, m], v) => {
      const x = val(v);
      if (!x) return false;
      const step1 = qm(PI7, [14 * k, 1]); // cm per turn
      let t: R = [0, 1];
      if (m === 0) {
        for (let i = 0; i < n; i++) t = qa(t, step1);
        return qe(x, qd(t, [100, 1]));
      }
      const target = q(44 * k * n, 1);
      let turns = 0;
      while (t[0] * target[1] < target[0] * t[1]) (t = qa(t, step1)), turns++;
      return qe(t, target) && qe(x, [turns, 1]);
    },
    bugs: ([k, n, m]) => {
      if (m === 0)
        return [
          B("cm-not-m", "procedural", UNIT, "The distance was left in centimetres; 100 cm = 1 m.", D(44 * k * n)),
          B("radius-for-diameter", "procedural", CIRC, "The diameter was used as if it were the radius (2 × π × diameter); one turn rolls π × diameter.", D(88 * k * n, 100)),
          B("one-turn", "conceptual", CIRC, "Only one turn was counted; each turn rolls one circumference.", D(44 * k, 100)),
        ];
      return [
        B("m-not-cm", "procedural", UNIT, "Metres were divided by centimetres; change the distance to centimetres first.", D(n, 100)),
        B("diameter-for-circumference", "conceptual", CIRC, "The distance was divided by the diameter; each turn rolls the circumference, π × diameter.", D(44 * k * n, 14 * k)),
      ];
    },
    distractors: ([k, n, m]) => (m === 0 ? [D(22 * k * n, 100), D(44 * k * n, 1000), D(44 * k * n, 10)] : [String(2 * n), String(n + 10), D(22 * n, 7)]),
    variants: () => [],
    explain: (s) => (s.id === "circumference" ? `One turn rolls the circumference: ${s.inputs[0]} × ${s.inputs[1]} = ${s.value} cm` : s.id === "distance" ? `${s.inputs[1]} turns: ${s.inputs[0]} × ${s.inputs[1]} = ${s.value} cm` : s.id === "metres" ? `${s.inputs[0]} cm ÷ 100 = ${s.value} m` : s.id === "cm" ? `${s.inputs[0]} m = ${s.value} cm` : `${s.inputs[0]} ÷ ${s.inputs[1]} = ${s.value} turns`),
    domain: [[1, 6], [5, 60], [0, 1]],
    cap: 300,
    difficulty: ([k, n, m]) => (m === 0 && (n % 10 === 0 || n <= 10) ? 1 : m === 0 ? 2 : 3),
    // the wheel fits its size: a toy cart (14 cm), a tricycle (28–42 cm), a cycle (56–70 cm), a hand cart (84 cm)
    word: ([k, n, m]) => {
      const w = k === 1 ? "toy cart" : k <= 3 ? "tricycle" : k <= 5 ? "cycle" : "hand cart";
      return m === 0 ? `The wheel of ${name(n)}'s ${w} is ${14 * k} cm across. ${name(n)} moves the ${w} until the wheel has turned ${n} times. How far has the ${w} gone, in metres? (π = 22/7)` : `The wheel of a ${w} is ${14 * k} cm across. The ${w} rolls ${D(44 * k * n, 100)} m. How many times does the wheel turn? (π = 22/7)`;
    },
    teach: {
      idea: "In one full turn, a wheel rolls a distance equal to its circumference, π × diameter.",
      method: "Distance = circumference × number of turns; turns = distance ÷ circumference. Keep the units the same (change m to cm or cm to m).",
      alternatives: [{ id: "mark_roll", title: "Mark and roll", kind: "conceptual", text: ["Put a chalk mark on a wheel and roll it until the mark touches the ground again.", "The gap between the two marks on the ground is the circumference."] }],
    },
    limits: "Wheels whose diameters are multiples of 14 cm (with π = 22/7), whole numbers of turns.",
  },
  {
    id: "aisector",
    arity: 3,
    title: "Arc length, area and perimeter of a sector",
    competency: CIRC,
    type: "exact",
    mc: true,
    // [k, t, ask]: radius 7k cm, angle ANGLES[t]; ask 0 arc length, 1 area, 2 perimeter
    parse: none,
    reject: ([k, t, a]) => (k < 1 || k > 6 || t < 0 || t >= ANGLES.length || a < 0 || a > 2 ? "Radii 7–42 cm and angles from 30° to 300°." : null),
    prompt: ([k, t, a]) => `A sector of a circle has a radius of ${7 * k} cm and an angle of ${ANGLES[t]}°. Taking π = 22/7, find its ${["arc length, in cm", "area, in cm²", "perimeter, in cm"][a]}. (A fraction is fine.)`,
    solve: ([k, t, a]) => {
      const r = 7 * k;
      const th = ANGLES[t];
      const arc = qm(q(th, 360), qm(PI7, [2 * r, 1]));
      const area = qm(q(th, 360), qm(PI7, [r * r, 1]));
      if (a === 0) return { steps: [step("circle", "multiply", CIRC, [2, "22/7", r], 44 * k), step("arc", "multiply", CIRC, [`${th}/360`, 44 * k], dec(arc))], answer: dec(arc) };
      if (a === 1) return { steps: [step("circle-area", "multiply", CIRC, ["22/7", r, r], 154 * k * k), step("area", "multiply", CIRC, [`${th}/360`, 154 * k * k], dec(area))], answer: dec(area) };
      const per = qa(arc, [2 * r, 1]);
      return { steps: [step("circle", "multiply", CIRC, [2, "22/7", r], 44 * k), step("arc", "multiply", CIRC, [`${th}/360`, 44 * k], dec(arc)), step("perimeter", "add", CIRC, [dec(arc), r, r], dec(per))], answer: dec(per) };
    },
    // independent: arc ÷ whole circumference must equal angle ÷ 360; the area is ½ × arc × radius (a thin triangle-like slice)
    validate: ([k, t, a], v) => {
      const x = val(v);
      if (!x) return false;
      const r = 7 * k;
      const C = qm(PI7, [2 * r, 1]);
      if (a === 0) return qe(qd(x, C), q(ANGLES[t], 360));
      if (a === 2) return qe(qd(qs(x, [2 * r, 1]), C), q(ANGLES[t], 360));
      // area: find the arc by stepping 1° slices, each 1/360 of the circumference
      let arc: R = [0, 1];
      for (let i = 0; i < ANGLES[t]; i++) arc = qa(arc, qd(C, [360, 1]));
      return qe(x, qm(qm(arc, [r, 1]), [1, 2]));
    },
    bugs: ([k, t, a]) => {
      const r = 7 * k;
      const f = q(ANGLES[t], 360);
      const arc = qm(f, [44 * k, 1]);
      const area = qm(f, [154 * k * k, 1]);
      if (a === 0) return [B("area-for-arc", "conceptual", CIRC, "The area formula (πr²) was used; the arc is part of the circumference, 2πr.", dec(area)), B("whole-circle", "conceptual", CIRC, `The whole circumference was given; the arc is only ${ANGLES[t]}/360 of it.`, String(44 * k)), B("over-180", "procedural", CIRC, "The angle was divided by 180; a full circle is 360°.", dec(qm(q(ANGLES[t], 180), [44 * k, 1])))];
      if (a === 1) return [B("arc-for-area", "conceptual", CIRC, "The arc-length formula (2πr) was used; area uses πr².", dec(arc)), B("whole-circle", "conceptual", CIRC, `The whole circle's area was given; the sector is only ${ANGLES[t]}/360 of it.`, String(154 * k * k)), B("over-180", "procedural", CIRC, "The angle was divided by 180; a full circle is 360°.", dec(qm(q(ANGLES[t], 180), [154 * k * k, 1])))];
      return [B("radii-forgotten", "procedural", CIRC, "Only the arc was found; the perimeter of a sector also has the two straight radii.", dec(arc)), B("one-radius", "procedural", CIRC, "Only one radius was added; a sector has two straight edges.", dec(qa(arc, [r, 1])))];
    },
    distractors: ([k, t, a]) => {
      const f = q(ANGLES[t], 360);
      return a === 1 ? [dec(qm(f, [44 * k, 1])), dec(qm(f, [308 * k * k, 1])), String(154 * k * k)] : [dec(qm(f, [22 * k, 1])), dec(qm(f, [88 * k, 1])), String(44 * k)];
    },
    variants: () => [],
    explain: (s) => (s.id === "circle" ? `Whole circumference: 2 × 22/7 × ${s.inputs[2]} = ${s.value} cm` : s.id === "arc" ? `Arc: ${s.inputs[0]} of ${s.inputs[1]} = ${s.value} cm` : s.id === "circle-area" ? `Whole circle: 22/7 × ${s.inputs[1]} × ${s.inputs[2]} = ${s.value} cm²` : s.id === "area" ? `Sector: ${s.inputs[0]} of ${s.inputs[1]} = ${s.value} cm²` : `Perimeter: arc + 2 radii = ${s.inputs.join(" + ")} = ${s.value} cm`),
    domain: [[1, 6], [0, ANGLES.length - 1], [0, 2]],
    difficulty: ([k, t]) => ([90, 180].includes(ANGLES[t]) ? 1 : 360 % ANGLES[t] === 0 ? 2 : 3),
    word: ([k, t, a]) =>
      a === 0 ? `A car's wiper is ${7 * k} cm long and swings through ${ANGLES[t]}°. How far does its tip travel in one swing, in cm? (π = 22/7; a fraction is fine.)`
      : a === 1 ? `A car's wiper is ${7 * k} cm long and swings through ${ANGLES[t]}°. How much of the glass does it wipe, in cm²? (π = 22/7; a fraction is fine.)`
      : `${name(k + t)} cuts a slice of a round pizza with radius ${7 * k} cm and angle ${ANGLES[t]}°. How long is the slice's whole outline (crust edge and two cut edges), in cm? (π = 22/7; a fraction is fine.)`,
    teach: {
      idea: "A sector with angle θ is θ/360 of the whole circle, so its arc is θ/360 of the circumference and its area is θ/360 of the circle's area.",
      method: "Arc = θ/360 × 2πr; area = θ/360 × πr²; perimeter = arc + 2r.",
      alternatives: [{ id: "clock", title: "Think of a clock face", kind: "conceptual", text: ["90° is a quarter of a full turn, so a 90° sector is a quarter of the circle; 60° is a sixth.", "Find the whole circle's circumference or area, then take that fraction of it."] }],
    },
    limits: "Radii that are multiples of 7 cm with π = 22/7; segments (sector minus triangle) are left out.",
  },
  {
    id: "airing",
    arity: 2,
    title: "Area of a circular path (a ring)",
    competency: CIRC,
    type: "exact",
    mc: true,
    // [r, w]: inner radius r m, path width w m, π = 3.14
    parse: none,
    reject: ([r, w]) => (r < 2 || r > 20 || w < 1 || w > 6 ? "Inner radii 2–20 m, path widths 1–6 m." : null),
    prompt: ([r, w]) => `A circular garden has a radius of ${r} m. A path ${w} m wide runs all the way round its outside. Taking π = 3.14, find the area of the path, in m².`,
    solve: ([r, w]) => {
      const R = r + w;
      const ans = qm(PI314, [R * R - r * r, 1]);
      return { steps: [step("outer", "add", CIRC, [r, w], R), step("squares", "subtract", "MATH.number.exponents", [R * R, r * r], R * R - r * r), step("area", "multiply", CIRC, ["3.14", R * R - r * r], dec(ans))], answer: dec(ans) };
    },
    // independent: the ring's area as π × width × (outer radius + inner radius) (difference of two squares)
    validate: ([r, w], v) => is(v, qm(PI314, [w * (2 * r + w), 1])),
    bugs: ([r, w]) => [
      B("width-squared", "conceptual", CIRC, "π × width² (or π(R − r)²) was found; the path is the big circle minus the small one, π(R² − r²): square each radius first.", dec(qm(PI314, [w * w, 1]))),
      B("outer-only", "procedural", CIRC, "The area of the big circle was found but the garden was not taken away.", dec(qm(PI314, [(r + w) * (r + w), 1]))),
    ],
    distractors: ([r, w]) => [dec(qm(PI314, [2 * r * w, 1])), dec(qm(PI314, [r * r, 1])), dec(qm(PI314, [(r + w) * (r + w) + r * r, 1]))],
    variants: () => [],
    explain: say({ outer: "Outer radius", squares: "R² − r²", area: "Path area" }),
    domain: [[2, 20], [1, 6]],
    difficulty: ([r, w]) => (r <= 10 && w <= 2 ? 1 : r <= 15 ? 2 : 3),
    word: ([r, w]) => `${name(r)}'s village has a round pond of radius ${r} m with ${aN(w)} m wide stone walkway all round it. Taking π = 3.14, how much ground does the walkway cover, in m²?`,
    teach: {
      idea: "A ring is a big circle with a small circle taken out of the middle.",
      method: "Outer radius R = inner radius + width. Area of the path = πR² − πr² = π(R² − r²).",
      alternatives: [{ id: "two_circles", title: "Two circles", kind: "procedural", text: ["Work out the area of the whole circle including the path.", "Work out the area of the garden alone, then subtract."] }],
    },
    limits: "Paths outside a circle with whole-metre radii and widths, π = 3.14; paths inside are left out.",
  },
  // ================================================================ parallelogram and rhombus
  {
    id: "aipara",
    arity: 3,
    title: "Area and perimeter of a parallelogram",
    competency: PARA,
    type: "exact",
    mc: true,
    // [b, h, mode]: base b, height h, slanting side s = h + 1 + (b + h) % 5; mode 0 area, 1 height from area, 2 perimeter
    parse: none,
    reject: ([b, h, m]) => (b < 3 || b > 25 || h < 2 || h > 20 || m < 0 || m > 2 ? "Bases 3–25 cm and heights 2–20 cm." : null),
    prompt: ([b, h, m]) => {
      const s = slant(b, h);
      return m === 0 ? `A parallelogram has a base of ${b} cm, slanting sides of ${s} cm and a height of ${h} cm. Find its area, in cm².`
        : m === 1 ? `A parallelogram has an area of ${b * h} cm² and a base of ${b} cm. What is its height, in cm?`
        : `A parallelogram has a base of ${b} cm, slanting sides of ${s} cm and a height of ${h} cm. Find its perimeter, in cm.`;
    },
    solve: ([b, h, m]) => {
      const s = slant(b, h);
      if (m === 0) return { steps: [step("area", "multiply", PARA, [b, h], b * h)], answer: String(b * h) };
      if (m === 1) return { steps: [step("height", "divide", PARA, [b * h, b], h)], answer: String(h) };
      return { steps: [step("pair", "add", RPER, [b, s], b + s), step("perimeter", "multiply", RPER, [2, b + s], 2 * (b + s))], answer: String(2 * (b + s)) };
    },
    // independent: area by the shoelace formula on the corners; perimeter by walking round all four sides
    validate: ([b, h, m], v) => {
      const s = slant(b, h);
      const off = Math.sqrt(s * s - h * h);
      if (m === 0) return is(v, [Math.round(shoelace([[0, 0], [b, 0], [b + off, h], [off, h]])), 1]);
      if (m === 1) {
        const x = val(v);
        return !!x && qe(qm(x, [b, 1]), [b * h, 1]);
      }
      const pts: [number, number][] = [[0, 0], [b, 0], [b + off, h], [off, h]];
      let p = 0;
      for (let i = 0; i < 4; i++) p += Math.hypot(pts[(i + 1) % 4][0] - pts[i][0], pts[(i + 1) % 4][1] - pts[i][1]);
      return is(v, [Math.round(p), 1]) && near(p, Math.round(p));
    },
    bugs: ([b, h, m]) => {
      const s = slant(b, h);
      if (m === 0) return [B("slant-for-height", "conceptual", PARA, "The slanting side was used; the height is the straight-up distance between the parallel sides.", String(b * s)), B("halved", "conceptual", PARA, "The area was halved as for a triangle; a parallelogram is two such triangles, so it is base × height.", D(b * h, 2))];
      if (m === 1) return [B("halved", "conceptual", PARA, "The answer was halved as for a triangle; for a parallelogram area = base × height, so height = area ÷ base.", D(h, 2)), B("subtracted", "conceptual", PARA, "The base was taken from the area; divide the area by the base.", b * h - b > 0 ? String(b * h - b) : null)];
      return [B("two-sides", "procedural", RPER, "Only two sides were added; a parallelogram has four sides, two of each length.", String(b + s)), B("height-for-side", "conceptual", RPER, "The height was used for the slanting sides; the perimeter goes along the sides.", String(2 * (b + h))), B("area-for-perimeter", "conceptual", RPER, "The area was found; the perimeter is the distance around.", String(b * h))];
    },
    distractors: ([b, h, m]) => (m === 0 ? [String(2 * (b + h)), String(b * h + b), String(b + h)] : m === 1 ? [String(2 * h), String(h + 1), String(b * h * b)] : [String(2 * b + slant(b, h)), String(4 * b), String(b * slant(b, h))]),
    variants: () => [],
    explain: (s) => (s.id === "area" ? `Area = base × height = ${s.inputs[0]} × ${s.inputs[1]} = ${s.value} cm²` : s.id === "height" ? `Height = area ÷ base = ${s.inputs[0]} ÷ ${s.inputs[1]} = ${s.value} cm` : s.id === "pair" ? `One base and one slanting side: ${s.inputs[0]} + ${s.inputs[1]} = ${s.value} cm` : `Perimeter = 2 × ${s.inputs[1]} = ${s.value} cm`),
    domain: [[3, 25], [2, 20], [0, 2]],
    cap: 400,
    difficulty: ([b, h, m]) => (m === 2 ? 1 : b * h <= 100 ? 2 : 3),
    figure: ([b, h, m]) => ({ type: "shape", kind: "parallelogram", name: "parallelogram", lengths: m === 1 ? [`${b} cm`, "", "", ""] : [`${b} cm`, `${slant(b, h)} cm`, `${b} cm`, `${slant(b, h)} cm`], height: m === 1 ? "?" : `${h} cm` }),
    word: ([b, h, m]) => (m === 0 ? `A parallelogram-shaped field has ${aN(b)} m long side, slanting sides of ${slant(b, h)} m, and is ${h} m across between the ${b} m sides. What is its area, in m²?` : m === 1 ? `A parallelogram-shaped plot has an area of ${b * h} m² and ${aN(b)} m long base. How far apart are its parallel sides, in m?` : `${name(b)} puts a fence round a parallelogram-shaped plot with sides of ${b} m and ${slant(b, h)} m (the ${b} m sides are ${h} m apart). How many metres of fence are needed?`),
    teach: {
      idea: "Cut a triangle off one end of a parallelogram and slide it to the other end: it becomes a rectangle with the same base and height.",
      method: "Area = base × height (the height is at right angles to the base, not the slanting side). Perimeter = 2 × (base + slanting side).",
      alternatives: [{ id: "cut_slide", title: "Cut and slide", kind: "conceptual", text: ["Draw the parallelogram on squared paper and draw its height from one top corner.", "Cut off the triangle and move it to the other side: count the squares of the rectangle you made."] }],
    },
    limits: "Whole-centimetre bases, heights and sides; missing bases and angles inside the parallelogram are left out.",
  },
  {
    id: "airhomb",
    arity: 3,
    title: "Area of a rhombus from its diagonals",
    competency: PARA,
    type: "exact",
    mc: true,
    // [p, q, mode]: diagonals p and q; mode 0 area, 1 the second diagonal from the area
    parse: none,
    reject: ([p, d, m]) => (p < 2 || p > 30 || d < 2 || d > 30 || p === d || m < 0 || m > 1 || (m === 0 && p < d) ? "Diagonals 2–30 cm, unequal." : null),
    prompt: ([p, d, m]) => (m === 0 ? `The diagonals of a rhombus are ${p} cm and ${d} cm long. Find its area, in cm².` : `A rhombus has an area of ${D(p * d, 2)} cm². One diagonal is ${p} cm long. How long is the other diagonal, in cm?`),
    solve: ([p, d, m]) =>
      m === 0
        ? { steps: [step("product", "multiply", PARA, [p, d], p * d), step("half", "half", PARA, [p * d], D(p * d, 2))], answer: D(p * d, 2) }
        : { steps: [step("double", "multiply", PARA, [2, D(p * d, 2)], p * d), step("diagonal", "divide", PARA, [p * d, p], d)], answer: String(d) },
    // independent: shoelace formula on the four corners (±p/2, 0) and (0, ±d/2)
    validate: ([p, d, m], v) => {
      if (m === 0) return is(v, q(Math.round(2 * shoelace([[p / 2, 0], [0, d / 2], [-p / 2, 0], [0, -d / 2]])), 2));
      const x = val(v);
      return !!x && x[1] === 1 && near(shoelace([[p / 2, 0], [0, x[0] / 2], [-p / 2, 0], [0, -x[0] / 2]]), (p * d) / 2);
    },
    bugs: ([p, d, m]) =>
      m === 0
        ? [B("no-half", "conceptual", PARA, "The diagonals were multiplied but not halved; the rhombus fills half of the rectangle drawn round it.", String(p * d)), B("added", "conceptual", PARA, "The diagonals were added; the area is half their product.", String(p + d))]
        : [B("not-doubled", "conceptual", PARA, `The area was divided by ${p} without doubling it first; area = ½ × d₁ × d₂.`, D(d, 2)), B("subtracted", "conceptual", PARA, "The diagonal was taken from the area; undo the multiplying by dividing.", (p * d) / 2 - p > 0 ? D(p * d - 2 * p, 2) : null)],
    distractors: ([p, d, m]) => (m === 0 ? [D(p * d, 4), String(2 * p * d), String(p * p)] : [String(2 * d), String(d + 2), String(p * d)]),
    variants: () => [],
    explain: (s) => (s.id === "product" ? `d₁ × d₂ = ${s.inputs[0]} × ${s.inputs[1]} = ${s.value}` : s.id === "half" ? `Area = half of ${s.inputs[0]} = ${s.value} cm²` : s.id === "double" ? `d₁ × d₂ = 2 × area = ${s.value}` : `d₂ = ${s.inputs[0]} ÷ ${s.inputs[1]} = ${s.value} cm`),
    domain: [[2, 30], [2, 30], [0, 1]],
    keep: ([p, d, m]) => p !== d && (m === 1 || p > d),
    cap: 300,
    difficulty: ([p, d, m]) => (m === 0 && (p * d) % 2 === 0 && p * d <= 150 ? 1 : m === 0 ? 2 : 3),
    figure: ([p, d, m]) => ({ type: "shape", kind: "rhombus", diagonals: true, name: `rhombus with diagonals ${p} cm and ${m === 0 ? `${d} cm` : "?"}` }),
    word: ([p, d, m]) => (m === 0 ? `A paper lantern panel is a rhombus whose diagonals are ${p} cm and ${d} cm. How much paper does the panel use, in cm²?` : `A rhombus-shaped tile has an area of ${D(p * d, 2)} cm². One of its diagonals is ${p} cm. How long is the other diagonal, in cm?`),
    teach: {
      idea: "The diagonals of a rhombus cross at right angles and cut it into four equal right triangles; together they fill half of the rectangle d₁ by d₂.",
      method: "Area = ½ × d₁ × d₂. To find a missing diagonal, double the area and divide by the diagonal you know.",
      alternatives: [{ id: "four_triangles", title: "Four triangles", kind: "conceptual", text: ["Each of the four triangles has sides d₁/2 and d₂/2 at the right angle.", "Each has area ½ × d₁/2 × d₂/2; four of them make ½ × d₁ × d₂."] }],
    },
    limits: "Whole-centimetre diagonals; the side of a rhombus from its diagonals (Pythagoras) is left out.",
  },
  // ================================================================ surface area of cuboids
  {
    id: "aitsa",
    arity: 3,
    title: "Total surface area of a cuboid or cube",
    competency: SURF,
    type: "integer",
    mc: true,
    parse: none,
    reject: ([l, w, h]) => (Math.min(l, w, h) < 1 || Math.max(l, w, h) > 15 || l < w || w < h ? "Edges 1–15 cm, listed from longest to shortest." : null),
    prompt: ([l, w, h]) => (l === w && w === h ? `A cube has edges ${l} cm long. Find its total surface area, in cm².` : `A cuboid is ${l} cm long, ${w} cm wide and ${h} cm high. Find its total surface area, in cm².`),
    solve: ([l, w, h]) => ({ steps: [step("lw", "multiply", RAREA, [l, w], l * w), step("wh", "multiply", RAREA, [w, h], w * h), step("hl", "multiply", RAREA, [h, l], h * l), step("three", "add", SURF, [l * w, w * h, h * l], l * w + w * h + h * l), step("total", "multiply", SURF, [2, l * w + w * h + h * l], 2 * (l * w + w * h + h * l))], answer: 2 * (l * w + w * h + h * l) }),
    // independent: build the cuboid from 1 cm cubes and count every cube face that is on the outside
    validate: ([l, w, h], v) => {
      let n = 0;
      const inside = (x: number, y: number, z: number) => x >= 0 && y >= 0 && z >= 0 && x < l && y < w && z < h;
      for (let x = 0; x < l; x++) for (let y = 0; y < w; y++) for (let z = 0; z < h; z++) for (const [dx, dy, dz] of DIRS) if (!inside(x + dx, y + dy, z + dz)) n++;
      return v === n;
    },
    bugs: ([l, w, h]) => [
      B("three-faces", "procedural", SURF, "Only three faces were added; each face has an equal face opposite it, so double the total.", l * w + w * h + h * l),
      B("volume", "conceptual", SURF, "The volume was found; surface area is the total area of the six faces.", l * w * h),
      B("walls-only", "procedural", SURF, "Only the four side faces were added; the top and bottom count too.", 2 * h * (l + w)),
    ],
    variants: () => [],
    explain: say({ lw: "Top (and bottom)", wh: "One end (and the other)", hl: "Front (and back)", three: "Three different faces", total: "Total surface area" }),
    domain: [[1, 15], [1, 15], [1, 15]],
    keep: ([l, w, h]) => l >= w && w >= h,
    cap: 300,
    difficulty: ([l, w, h]) => (l === w && w === h ? 1 : l <= 8 ? 2 : 3),
    figure: ([l, w, h]) => (l === w && w === h ? { type: "solid", name: "cube", dims: [`${l} cm`] } : { type: "solid", name: "cuboid", dims: [`${l} cm`, `${w} cm`, `${h} cm`] }),
    word: ([l, w, h]) => `${name(l + h)} wraps a gift box that is ${l} cm long, ${w} cm wide and ${h} cm high, with no overlap. How much wrapping paper covers the whole box, in cm²?`,
    teach: {
      idea: "A cuboid has six rectangular faces in three matching pairs: top and bottom, front and back, two ends.",
      method: "Total surface area = 2(lw + wh + hl). For a cube with edge a, it is 6a².",
      visual: ([l, w, h]) => ({ type: "solid", name: "cuboid", dims: [`${l} cm`, `${w} cm`, `${h} cm`] }),
      alternatives: [{ id: "net", title: "Unfold into a net", kind: "conceptual", text: ["Unfold the box flat: it makes six rectangles.", "Find each rectangle's area and add all six."] }],
    },
    limits: "Whole-centimetre edges up to 15 cm; open boxes are the lateral-area family ailsa.",
  },
  {
    id: "ailsa",
    arity: 3,
    title: "Area of the four walls of a room (lateral surface area)",
    competency: SURF,
    type: "integer",
    mc: true,
    parse: none,
    reject: ([l, w, h]) => (l < 3 || l > 15 || w < 3 || w > 15 || h < 2 || h > 6 || l < w ? "Rooms 3–15 m long and wide, 2–6 m high." : null),
    prompt: ([l, w, h]) => `A room is ${l} m long, ${w} m wide and ${h} m high. Find the total area of its four walls, in m².`,
    solve: ([l, w, h]) => ({ steps: [step("around", "multiply", RPER, [2, l + w], 2 * (l + w)), step("walls", "multiply", SURF, [2 * (l + w), h], 2 * h * (l + w))], answer: 2 * h * (l + w) }),
    // independent: count the 1 m squares on the four walls, going round the room one wall at a time
    validate: ([l, w, h], v) => {
      let n = 0;
      for (const side of [l, w, l, w]) for (let i = 0; i < side; i++) for (let j = 0; j < h; j++) n++;
      return v === n;
    },
    bugs: ([l, w, h]) => [
      B("two-walls", "procedural", SURF, "Only two walls were counted; a room has four walls, two of each size.", h * (l + w)),
      B("with-floor", "procedural", SURF, "The floor was added; the question asks for the four walls only.", 2 * h * (l + w) + l * w),
      B("total-surface", "conceptual", SURF, "Floor and ceiling were included; the walls are only the four sides.", 2 * (l * w + w * h + h * l)),
    ],
    variants: () => [],
    explain: say({ around: "Distance round the floor", walls: "Four walls" }),
    domain: [[3, 15], [3, 15], [2, 6]],
    keep: ([l, w]) => l >= w,
    cap: 300,
    difficulty: ([l, w, h]) => (l + w <= 12 ? 1 : l + w <= 20 ? 2 : 3),
    figure: ([l, w, h]) => ({ type: "solid", name: "cuboid", dims: [`${l} m`, `${w} m`, `${h} m`] }),
    word: ([l, w, h]) => `${name(l)}'s family is painting the walls of a hall ${l} m long, ${w} m wide and ${h} m high (ignore doors and windows). How many m² of wall must they paint?`,
    teach: {
      idea: "Unrolled, the four walls of a room make one long rectangle: as long as the distance round the floor and as tall as the room.",
      method: "Lateral surface area = 2(l + w) × h.",
      alternatives: [{ id: "wall_by_wall", title: "Wall by wall", kind: "procedural", text: ["Two walls are length × height; two walls are width × height.", "Add all four."] }],
    },
    limits: "Whole-metre rooms; doors, windows and painting costs are left out.",
  },
  // ================================================================ cylinders
  {
    id: "aicylv",
    arity: 3,
    title: "Volume of a cylinder",
    competency: CYL,
    type: "exact",
    mc: true,
    // [k, h, g]: radius 7k/2 cm (diameter 7k), height h; g 0 radius given, 1 diameter given; π = 22/7
    parse: none,
    reject: ([k, h, g]) => (k < 1 || k > 6 || h < 2 || h > 30 || g < 0 || g > 1 ? "Radii 3.5–21 cm, heights 2–30 cm." : null),
    prompt: ([k, h, g]) => `A cylinder has a ${g ? `diameter of ${7 * k}` : `radius of ${D(7 * k, 2)}`} cm and a height of ${h} cm. Taking π = 22/7, find its volume, in cm³.`,
    solve: ([k, h]) => {
      const r = q(7 * k, 2);
      const base = qm(PI7, qm(r, r));
      return { steps: [step("base", "multiply", CIRC, ["22/7", dec(r), dec(r)], dec(base)), step("volume", "multiply", CYL, [dec(base), h], dec(qm(base, [h, 1])))], answer: dec(qm(base, [h, 1])) };
    },
    // independent: base area as ½ × circumference × radius (the circle unrolled into slices), times the height
    validate: ([k, h], v) => {
      const r = q(7 * k, 2);
      const C = qm(PI7, [7 * k, 1]);
      return is(v, qm(qm(qm(C, [1, 2]), r), [h, 1]));
    },
    bugs: ([k, h, g]) => {
      const r = q(7 * k, 2);
      return [
        B("curved-area", "conceptual", CYL, "2πrh is the curved surface area; the volume is base area × height, πr²h.", dec(qm(qm(PI7, [2 * h, 1]), r))),
        B("not-squared", "procedural", CYL, "The radius was not squared: the base is a circle of area πr².", dec(qm(qm(PI7, [h, 1]), r))),
        ...(g ? [B("diameter-squared", "procedural", CYL, "The diameter was squared; use the radius, half the diameter.", dec(qm(PI7, [49 * k * k * h, 1])))] : []),
      ];
    },
    distractors: ([k, h]) => {
      const base = qm(PI7, qm(q(7 * k, 2), q(7 * k, 2)));
      return [dec(qm(base, [2 * h, 1])), dec(base), dec(qm(base, [h, 2]))];
    },
    variants: () => [],
    explain: (s) => (s.id === "base" ? `Base area πr² = ${s.inputs.join(" × ")} = ${s.value} cm²` : `Volume = base area × height = ${s.inputs[0]} × ${s.inputs[1]} = ${s.value} cm³`),
    domain: [[1, 6], [2, 30], [0, 1]],
    cap: 300,
    difficulty: ([k, , g]) => (k % 2 === 0 && !g ? 1 : k % 2 === 0 ? 2 : 3),
    figure: ([k, h, g]) => ({ type: "solid", name: "cylinder", dims: [g ? `d = ${7 * k} cm` : `r = ${D(7 * k, 2)} cm`, `h = ${h} cm`] }),
    word: ([k, h, g]) => `A cylindrical steel container has a ${g ? `diameter of ${7 * k}` : `radius of ${D(7 * k, 2)}`} cm and a height of ${h} cm. How many cm³ of water can it hold? (π = 22/7)`,
    teach: {
      idea: "A cylinder is a stack of equal circles, like a pile of coins: the volume is the area of one circle times the height.",
      method: "Volume = πr²h. Halve the diameter first if you are given it.",
      visual: ([k, h]) => ({ type: "solid", name: "cylinder", dims: [`r = ${D(7 * k, 2)} cm`, `h = ${h} cm`] }),
      alternatives: [{ id: "like_prism", title: "Like a prism", kind: "conceptual", text: ["For a cuboid, volume = base area × height.", "A cylinder works the same way; only the base is a circle (πr²)."] }],
    },
    limits: "Radii that are multiples of 3.5 cm with π = 22/7; hollow cylinders are left out.",
  },
  {
    id: "aicyls",
    arity: 3,
    title: "Curved and total surface area of a cylinder",
    competency: CYL,
    type: "exact",
    mc: true,
    // [k, h, ask]: radius 7k/2 cm; ask 0 curved surface area, 1 total surface area
    parse: none,
    reject: ([k, h, a]) => (k < 1 || k > 6 || h < 2 || h > 30 || a < 0 || a > 1 ? "Radii 3.5–21 cm, heights 2–30 cm." : null),
    prompt: ([k, h, a]) => `A closed cylinder has a radius of ${D(7 * k, 2)} cm and a height of ${h} cm. Taking π = 22/7, find its ${a ? "total surface area" : "curved surface area"}, in cm².`,
    solve: ([k, h, a]) => {
      const r = q(7 * k, 2);
      const csa = qm(qm(PI7, [2 * h, 1]), r);
      if (!a) return { steps: [step("csa", "multiply", CYL, [2, "22/7", dec(r), h], dec(csa))], answer: dec(csa) };
      const ends = qm(qm(PI7, [2, 1]), qm(r, r));
      return { steps: [step("csa", "multiply", CYL, [2, "22/7", dec(r), h], dec(csa)), step("ends", "multiply", CIRC, [2, "22/7", dec(r), dec(r)], dec(ends)), step("tsa", "add", CYL, [dec(csa), dec(ends)], dec(qa(csa, ends)))], answer: dec(qa(csa, ends)) };
    },
    // independent: unroll the curved surface into a rectangle (circumference π × d by height) and add the two circles as ½ × C × r each
    validate: ([k, h, a], v) => {
      const r = q(7 * k, 2);
      const C = qm(PI7, [7 * k, 1]);
      const rect = qm(C, [h, 1]);
      return is(v, a ? qa(rect, qm(C, r)) : rect);
    },
    bugs: ([k, h, a]) => {
      const r = q(7 * k, 2);
      const csa = qm(qm(PI7, [2 * h, 1]), r);
      const one = qm(PI7, qm(r, r));
      return a
        ? [B("no-ends", "procedural", CYL, "Only the curved surface was found; a closed cylinder also has a top and a bottom circle.", dec(csa)), B("one-end", "procedural", CYL, "Only one circle was added; a closed cylinder has two, top and bottom.", dec(qa(csa, one)))]
        : [B("forgot-two", "procedural", CYL, "πrh was found; the curved surface unrolls to a rectangle as long as the circumference, 2πr.", dec(qm(qm(PI7, [h, 1]), r))), B("volume", "conceptual", CYL, "The volume (πr²h) was found; the curved surface is an area, 2πrh.", dec(qm(one, [h, 1])))];
    },
    distractors: ([k, h, a]) => {
      const r = q(7 * k, 2);
      const csa = qm(qm(PI7, [2 * h, 1]), r);
      return [dec(qm(csa, [2, 1])), dec(qa(csa, qm(PI7, [7 * k, 1]))), dec(qm(PI7, qm(r, r)))].filter((x) => a || x !== dec(csa));
    },
    variants: () => [],
    explain: (s) => (s.id === "csa" ? `Curved surface 2πrh = ${s.inputs.join(" × ")} = ${s.value} cm²` : s.id === "ends" ? `Two circles 2πr² = ${s.inputs.join(" × ")} = ${s.value} cm²` : `Total = ${s.inputs.join(" + ")} = ${s.value} cm²`),
    domain: [[1, 6], [2, 30], [0, 1]],
    cap: 300,
    difficulty: ([k, , a]) => (!a && k % 2 === 0 ? 1 : !a ? 2 : 3),
    figure: ([k, h]) => ({ type: "solid", name: "cylinder", dims: [`r = ${D(7 * k, 2)} cm`, `h = ${h} cm`] }),
    word: ([k, h, a]) => (a ? `${name(h)} makes a closed tin from metal sheet. The tin is a cylinder of radius ${D(7 * k, 2)} cm and height ${h} cm. How much sheet is needed, in cm²? (π = 22/7)` : `A label goes all the way round a can of radius ${D(7 * k, 2)} cm and height ${h} cm (not on the top or bottom). What is the area of the label, in cm²? (π = 22/7)`),
    teach: {
      idea: "Cut the curved surface of a cylinder straight down and unroll it: it is a rectangle, as long as the circumference (2πr) and as tall as the cylinder.",
      method: "Curved surface area = 2πrh. Total surface area = 2πrh + 2πr² = 2πr(h + r).",
      alternatives: [{ id: "label", title: "Peel the label", kind: "conceptual", text: ["Peel the paper label off a can and lay it flat: it is a rectangle.", "Its length went once round the can, so it equals the circumference."] }],
    },
    limits: "Closed solid cylinders with radii in multiples of 3.5 cm; hollow pipes are left out.",
  },
  // ================================================================ trapezium and composite areas
  {
    id: "aitrap",
    arity: 3,
    title: "Area of a trapezium",
    competency: TRAP,
    type: "exact",
    mc: true,
    // [a, b, h]: parallel sides a > b, height h
    parse: none,
    reject: ([a, b, h]) => (a < 3 || a > 30 || b < 2 || b >= a || h < 2 || h > 20 ? "Parallel sides 2–30 cm (unequal), heights 2–20 cm." : null),
    prompt: ([a, b, h]) => `A trapezium has parallel sides of ${a} cm and ${b} cm, and the distance between them is ${h} cm. Find its area, in cm².`,
    solve: ([a, b, h]) => ({ steps: [step("sum", "add", TRAP, [a, b], a + b), step("times", "multiply", TRAP, [a + b, h], (a + b) * h), step("half", "half", TRAP, [(a + b) * h], D((a + b) * h, 2))], answer: D((a + b) * h, 2) }),
    // independent: the shoelace formula on the four corners
    validate: ([a, b, h], v) => {
      const off = Math.floor((a - b) / 3);
      return is(v, q(Math.round(2 * shoelace([[0, 0], [a, 0], [off + b, h], [off, h]])), 2));
    },
    bugs: ([a, b, h]) => [
      B("no-half", "conceptual", TRAP, "The sum of the parallel sides × height was not halved; two copies of the trapezium make that parallelogram.", D((a + b) * h)),
      B("long-side-only", "conceptual", TRAP, "Only the longer parallel side was used, as for a rectangle; the trapezium is narrower at the top, so use the average of the two sides.", D(a * h)),
    ],
    distractors: ([a, b, h]) => [D((a + b) * h, 4), D(b * h), D(a * b, 2)],
    variants: () => [],
    explain: say({ sum: "Parallel sides added", times: "× height", half: "Area" }),
    domain: [[3, 30], [2, 29], [2, 20]],
    keep: ([a, b]) => b < a,
    cap: 400,
    difficulty: ([a, b, h]) => (((a + b) * h) % 2 === 0 && (a + b) * h <= 200 ? 1 : ((a + b) * h) % 2 === 0 ? 2 : 3),
    figure: ([a, b, h]) => ({ type: "shape", kind: "trapezium", name: "trapezium", lengths: [`${b} cm`, "", `${a} cm`, ""], height: `${h} cm` }),
    word: ([a, b, h]) => `${name(a + b)}'s farm field is a trapezium. Its two parallel edges are ${a} m and ${b} m long, and they are ${h} m apart. What is the area of the field, in m²?`,
    teach: {
      idea: "Two copies of a trapezium, one turned upside down, fit together into a parallelogram with base (a + b) and the same height. The trapezium is half of it.",
      method: "Area = ½ × (sum of the parallel sides) × height.",
      alternatives: [{ id: "split", title: "Split into pieces", kind: "procedural", text: ["Draw a diagonal: the trapezium becomes two triangles with the same height, bases a and b.", "Add their areas: ½ × a × h + ½ × b × h."] }],
    },
    limits: "Whole-centimetre sides and heights; finding a missing side from the area is left out.",
  },
  {
    id: "ailshape",
    arity: 5,
    title: "Area and perimeter of an L-shape",
    competency: TRAP,
    type: "integer",
    mc: true,
    // [W, H, p, q, ask]: a W × H rectangle with a p × q rectangle cut from one corner; ask 0 area, 1 perimeter
    parse: none,
    reject: ([W, H, p, c, a]) => (W < 4 || W > 12 || H < 4 || H > 12 || p < 1 || p >= W || c < 1 || c >= H || a < 0 || a > 1 ? "Rectangles 4–12 cm with a smaller corner cut out." : null),
    prompt: ([W, H, p, c, a]) => `The shape in the picture is ${aN(W)} cm by ${H} cm rectangle with ${aN(p)} cm by ${c} cm rectangle cut out of one corner. Going round, its sides are ${list(lsides(W, H, p, c).map((x) => `${x} cm`))}. Find its ${a ? "perimeter, in cm" : "area, in cm²"}.`,
    solve: ([W, H, p, c, a]) =>
      a === 0
        ? { steps: [step("whole", "multiply", RAREA, [W, H], W * H), step("cut", "multiply", RAREA, [p, c], p * c), step("area", "subtract", TRAP, [W * H, p * c], W * H - p * c)], answer: W * H - p * c }
        : { steps: [step("perimeter", "add", RPER, lsides(W, H, p, c), 2 * (W + H))], answer: 2 * (W + H) },
    // independent: count the 1 cm squares inside the shape; walk round its corners adding each side
    validate: ([W, H, p, c, a], v) => {
      const inShape = (x: number, y: number) => !(x >= W - p && y >= H - c);
      if (a === 0) {
        let n = 0;
        for (let x = 0; x < W; x++) for (let y = 0; y < H; y++) if (inShape(x, y)) n++;
        return v === n;
      }
      const pts: [number, number][] = [[0, 0], [W, 0], [W, H - c], [W - p, H - c], [W - p, H], [0, H]];
      let t = 0;
      for (let i = 0; i < pts.length; i++) t += Math.abs(pts[(i + 1) % 6][0] - pts[i][0]) + Math.abs(pts[(i + 1) % 6][1] - pts[i][1]);
      return v === t;
    },
    bugs: ([W, H, p, c, a]) =>
      a === 0
        ? [B("whole-rectangle", "procedural", TRAP, "The whole rectangle was found but the cut-out corner was not taken away.", W * H), B("perimeter-for-area", "conceptual", TRAP, "The sides were added (the perimeter); area counts the squares inside.", 2 * (W + H)), B("added-cut", "procedural", TRAP, "The cut-out was added instead of taken away.", W * H + p * c)]
        : [B("cut-shortens", "conceptual", RPER, `Cutting the corner was thought to shorten the perimeter; the two new edges (${p} cm and ${c} cm) replace exactly the edges that were removed.`, 2 * (W + H) - p - c), B("area-for-perimeter", "conceptual", RPER, "The area was found; the perimeter is the distance around the edge.", W * H - p * c), B("missed-side", "procedural", RPER, "One of the six sides was missed; go all the way round.", 2 * (W + H) - Math.min(p, c))],
    variants: () => [],
    explain: say({ whole: "Whole rectangle", cut: "Cut-out corner", area: "Area", perimeter: "Perimeter, all six sides" }),
    domain: [[4, 12], [4, 12], [1, 11], [1, 11], [0, 1]],
    keep: ([W, H, p, c]) => p < W && c < H,
    cap: 400,
    difficulty: ([W, H, , , a]) => (a === 0 && W * H <= 60 ? 1 : a === 0 ? 2 : 3),
    figure: ([W, H, p, c]) => ({ type: "shape", kind: "lshape", name: "L-shape", lengths: lsides(W, H, p, c).map((x) => `${x} cm`) }),
    word: ([W, H, p, c, a]) => (a === 0 ? `A room is ${W} m by ${H} m, but ${aN(p)} m by ${c} m store cupboard is built into one corner. How much floor is left to tile, in m²?` : `A garden is ${W} m by ${H} m with ${aN(p)} m by ${c} m corner taken by a shed. ${name(W + H)} puts a fence along the edge of the garden that is left. How many metres of fence are needed?`),
    teach: {
      idea: "An L-shape is a big rectangle with a small rectangle taken away. Its area is less than the big rectangle's, but its perimeter is the same: the two new edges replace the two that were cut off.",
      method: "Area = big rectangle − cut-out. Perimeter: add all six sides (here it equals 2 × (width + height) of the big rectangle).",
      alternatives: [{ id: "two_rectangles", title: "Split into two rectangles", kind: "procedural", text: ["Draw one line to split the L into two rectangles.", "Find each rectangle's area and add them."] }],
    },
    limits: "One corner cut from a rectangle, whole centimetres; shapes with triangles, semicircles or several cuts are left out.",
  },
  {
    id: "aipath",
    arity: 4,
    title: "Area of a rectangular path",
    competency: TRAP,
    type: "integer",
    mc: true,
    // [L, W, x, side]: a garden L × W m with a path x m wide; side 0 outside the garden, 1 inside along its edge
    parse: none,
    reject: ([L, W, x, s]) => (L < 5 || L > 30 || W < 3 || W > 20 || L <= W || x < 1 || x > 3 || s < 0 || s > 1 || (s === 1 && W - 2 * x < 1) ? "Gardens up to 30 m by 20 m, paths 1–3 m wide." : null),
    prompt: ([L, W, x, s]) => (s === 0 ? `A rectangular garden is ${L} m long and ${W} m wide. A path ${x} m wide runs all round its outside. Find the area of the path, in m².` : `A rectangular garden is ${L} m long and ${W} m wide. A path ${x} m wide runs all round it, just inside its edge. Find the area of the path, in m².`),
    solve: ([L, W, x, s]) => {
      if (s === 0) {
        const o = (L + 2 * x) * (W + 2 * x);
        return { steps: [step("outer", "multiply", RAREA, [L + 2 * x, W + 2 * x], o), step("garden", "multiply", RAREA, [L, W], L * W), step("path", "subtract", TRAP, [o, L * W], o - L * W)], answer: o - L * W };
      }
      const i = (L - 2 * x) * (W - 2 * x);
      return { steps: [step("garden", "multiply", RAREA, [L, W], L * W), step("inner", "multiply", RAREA, [L - 2 * x, W - 2 * x], i), step("path", "subtract", TRAP, [L * W, i], L * W - i)], answer: L * W - i };
    },
    // independent: count the 1 m squares of the path one by one
    validate: ([L, W, x, s], v) => {
      let n = 0;
      if (s === 0) {
        for (let i = -x; i < L + x; i++) for (let j = -x; j < W + x; j++) if (i < 0 || j < 0 || i >= L || j >= W) n++;
      } else for (let i = 0; i < L; i++) for (let j = 0; j < W; j++) if (i < x || j < x || i >= L - x || j >= W - x) n++;
      return v === n;
    },
    bugs: ([L, W, x, s]) =>
      s === 0
        ? [B("width-once", "procedural", TRAP, `The path width was added only once to each side; the path is on both sides, so the outer rectangle is ${L + 2 * x} m by ${W + 2 * x} m.`, (L + x) * (W + x) - L * W), B("corners-missed", "conceptual", TRAP, "The four strips along the sides were found, but the four corner squares were missed.", 2 * x * (L + W)), B("outer-only", "procedural", TRAP, "The outer rectangle was found but the garden was not taken away.", (L + 2 * x) * (W + 2 * x))]
        : [B("width-once", "procedural", TRAP, `The path width was taken off only once; the path is on both sides, so the inner rectangle is ${L - 2 * x} m by ${W - 2 * x} m.`, L * W - (L - x) * (W - x)), B("corners-twice", "conceptual", TRAP, "The four strips along the sides were added, so the corner squares were counted twice.", 2 * x * (L + W)), B("inner-only", "procedural", TRAP, "The inner rectangle (the part without the path) was given.", (L - 2 * x) * (W - 2 * x))],
    variants: () => [],
    explain: say({ outer: "Garden with path", garden: "Garden", inner: "Garden without the path", path: "Path" }),
    domain: [[5, 30], [3, 20], [1, 3], [0, 1]],
    keep: ([L, W, x, s]) => L > W && (s === 0 || W - 2 * x >= 1),
    cap: 400,
    difficulty: ([L, W, x]) => (x === 1 && L <= 15 ? 1 : x <= 2 ? 2 : 3),
    // only the garden and the path width are labelled (the outer or inner rectangle is the step being tested)
    figure: ([L, W, x, s]) => ({ type: "shape", kind: "rectangle", name: `garden with ${aN(x)} m wide path ${s === 0 ? "all round the outside" : "just inside its edge"}`, lengths: [`${L} m`, `${W} m`, "", ""] }),
    word: ([L, W, x, s]) => (s === 0 ? `A school lawn is ${L} m by ${W} m. The school lays ${aN(x)} m wide brick border all round the outside of the lawn. How many m² of bricks are laid?` : `${AN(L)} m by ${W} m carpet has ${aN(x)} m wide coloured border along all its edges, inside the carpet. What is the area of the border, in m²?`),
    teach: {
      idea: "A path around (or inside) a rectangle is the space between two rectangles: the bigger one minus the smaller one.",
      method: "Outside path: (L + 2x)(W + 2x) − LW. Inside path: LW − (L − 2x)(W − 2x). The width is added (or taken off) on both sides.",
      alternatives: [{ id: "strips", title: "Strips and corners", kind: "procedural", text: ["Split an outside path into two long strips (L by x), two short strips (W by x) and four corner squares (x by x).", "Add them all: do not forget the corners."] }],
    },
    limits: "Paths of whole-metre width round whole-metre rectangles; crossing paths in the middle and circular paths (airing) are separate.",
  },
  // ================================================================ decimals
  {
    id: "aidmul",
    arity: 4,
    title: "Multiplying decimals",
    competency: DEC,
    type: "exact",
    mc: true,
    // [m, a, n, b]: (m ÷ 10^a) × (n ÷ 10^b)
    parse: none,
    reject: ([m, a, n, b]) => (m < 2 || m > 99 || n < 2 || n > 99 || a < 0 || a > 2 || b < 0 || b > 2 || a + b < 1 || (a > 0 && m % 10 === 0) || (b > 0 && n % 10 === 0) ? "Numbers with two significant digits and up to two decimal places, at least one a decimal." : null),
    prompt: ([m, a, n, b]) => `${D(m, 10 ** a)} × ${D(n, 10 ** b)} = ?`,
    solve: ([m, a, n, b]) => ({ steps: [step("digits", "multiply", MT, [m, n], m * n), step("places", "add", DEC, [a, b], a + b), step("point", "divide", DEC, [m * n, 10 ** (a + b)], D(m * n, 10 ** (a + b)))], answer: D(m * n, 10 ** (a + b)) }),
    // independent: divide the answer by the second number and check it gives the first (inverse operation)
    validate: ([m, a, n, b], v) => {
      const x = val(v);
      return !!x && qe(qd(x, q(n, 10 ** b)), q(m, 10 ** a));
    },
    bugs: ([m, a, n, b]) => [
      B("points-lined-up", "procedural", DEC, "The decimal point was placed as in addition (lined up); in a product, the decimal places of both numbers are added.", a > 0 && b > 0 ? D(m * n, 10 ** Math.max(a, b)) : null),
      B("point-ignored", "procedural", DEC, "The digits were multiplied but the decimal point was left out.", D(m * n)),
      B("one-place-off", "procedural", DEC, `The point was moved one place too far; the answer has ${a + b} decimal ${plural("place", a + b)}.`, D(m * n, 10 ** (a + b + 1))),
    ],
    distractors: ([m, a, n, b]) => [D(m * n, 10 ** Math.max(0, a + b - 1)), D(m * n, 10 ** (a + b + 1)), D(m * n * 10, 10 ** (a + b))],
    variants: () => [],
    explain: (s) => (s.id === "digits" ? `Multiply as whole numbers: ${s.inputs[0]} × ${s.inputs[1]} = ${s.value}` : s.id === "places" ? `Decimal places: ${s.inputs[0]} + ${s.inputs[1]} = ${s.value}` : `Put ${s.inputs[1] === 10 ? "1 decimal place" : `${String(s.inputs[1]).length - 1} decimal places`} in ${s.inputs[0]}: ${s.value}`),
    domain: [[2, 99], [0, 2], [2, 99], [0, 2]],
    keep: ([m, a, n, b]) => a + b >= 1 && !(a > 0 && m % 10 === 0) && !(b > 0 && n % 10 === 0),
    cap: 400,
    difficulty: ([m, a, n, b]) => (b === 0 && n < 10 ? 1 : a + b <= 2 ? 2 : 3),
    word: ([m, a, n, b]) => (a === 0 ? `One bottle holds ${D(n, 10 ** b)} litres of oil. How many litres do ${m} such bottles hold?` : b === 0 ? `One bottle holds ${D(m, 10 ** a)} litres of oil. How many litres do ${n} such bottles hold?` : m >= 10 ** a && n >= 10 ** b ? `A rectangular card is ${D(m, 10 ** a)} cm long and ${D(n, 10 ** b)} cm wide. What is its area, in cm²?` : `A rectangular piece of cloth is ${D(m, 10 ** a)} m long and ${D(n, 10 ** b)} m wide. What is its area, in m²?`),
    teach: {
      idea: "Tenths times tenths make hundredths (0.1 × 0.1 = 0.01), so the answer has as many decimal places as the two numbers together.",
      method: "Multiply the numbers as if there were no decimal points, count the decimal places in both, and give the answer that many decimal places. Estimate to check (e.g. 1.9 × 3.1 is about 2 × 3 = 6).",
      alternatives: [{ id: "fractions", title: "Use fractions", kind: "conceptual", text: ["Write each decimal as a fraction: 0.7 × 1.3 = 7/10 × 13/10.", "Multiply: 91/100 = 0.91."], visual: () => ({ type: "grid", rows: 10, cols: 10, shaded: 21 }) }],
    },
    limits: "Two-digit numbers with up to two decimal places each; long decimals are left out.",
  },
  {
    id: "aiddiv",
    arity: 4,
    title: "Dividing decimals",
    competency: DEC,
    type: "exact",
    mc: true,
    // [m, a, n, b]: quotient m ÷ 10^a, divisor n ÷ 10^b; the dividend is their product
    parse: none,
    reject: ([m, a, n, b]) => (m < 2 || m > 99 || n < 2 || n > 30 || a < 0 || a > 2 || b < 0 || b > 2 || a + b < 1 || (a > 0 && m % 10 === 0) || (b > 0 && n % 10 === 0) ? "Exact decimal divisions with two-digit quotients and divisors up to 30 (with decimals)." : null),
    prompt: ([m, a, n, b]) => `${D(m * n, 10 ** (a + b))} ÷ ${D(n, 10 ** b)} = ?`,
    solve: ([m, a, n, b]) => {
      const ans = D(m, 10 ** a);
      const dividend = D(m * n, 10 ** (a + b));
      return { steps: [step("shift", "multiply", DEC, [dividend, 10 ** b], D(m * n, 10 ** a)), step("divide", "divide", DEC, [D(m * n, 10 ** a), n], ans)], answer: ans };
    },
    // independent: multiply the answer by the divisor and check it gives the dividend (inverse operation)
    validate: ([m, a, n, b], v) => {
      const x = val(v);
      return !!x && qe(qm(x, q(n, 10 ** b)), q(m * n, 10 ** (a + b)));
    },
    bugs: ([m, a, n, b]) => [
      ...(b > 0 ? [B("divisor-only-shifted", "procedural", DEC, `The divisor was made a whole number (× ${10 ** b}) but the dividend was not multiplied by the same amount.`, D(m, 10 ** (a + b)))] : []),
      B("point-wrong-way", "procedural", DEC, "The decimal point was moved the wrong way; check with an estimate.", b > 0 ? D(m * 10 ** b, 10 ** a) : D(m * 10, 10 ** a)),
      B("one-place-off", "procedural", DEC, "The decimal point in the answer is one place out; line up the point in the quotient with the dividend's point.", D(m, 10 ** (a + 1))),
    ],
    distractors: ([m, a]) => [D(m * 10, 10 ** a), D(m, 10 ** (a + 1)), D(m * 100, 10 ** a)],
    variants: () => [],
    explain: (s) => (s.id === "shift" ? `Multiply both numbers by ${s.inputs[1]} so the divisor is whole: the dividend becomes ${s.value}` : `${s.inputs[0]} ÷ ${s.inputs[1]} = ${s.value}`),
    domain: [[2, 99], [0, 2], [2, 30], [0, 2]],
    keep: ([m, a, n, b]) => a + b >= 1 && !(a > 0 && m % 10 === 0) && !(b > 0 && n % 10 === 0),
    cap: 400,
    difficulty: ([, a, n, b]) => (b === 0 && n < 10 ? 1 : b === 0 || a === 0 ? 2 : 3),
    word: ([m, a, n, b]) => `A rectangle has an area of ${D(m * n, 10 ** (a + b))} cm². One side is ${D(n, 10 ** b)} cm long. How long is the other side, in cm?`,
    teach: {
      idea: "Multiplying both numbers in a division by the same amount does not change the answer (12 ÷ 4 = 120 ÷ 40), so you can make the divisor a whole number first.",
      method: "Move the decimal point in the divisor to make it whole, move the dividend's point the same number of places, then divide as usual, keeping the point in line.",
      alternatives: [{ id: "check_multiply", title: "Check by multiplying", kind: "procedural", text: ["Estimate first: 7.2 ÷ 0.8 is like 72 ÷ 8.", "Check: the answer × the divisor must give the dividend."] }],
    },
    limits: "Exact divisions (no remainders or recurring decimals), divisors up to 30 with up to two decimal places.",
  },
  {
    id: "aidp10",
    arity: 4,
    title: "Multiplying and dividing decimals by 10, 100 and 1000",
    competency: DEC,
    type: "exact",
    mc: true,
    // [m, a, k, op]: (m ÷ 10^a) × 10^k (op 0) or ÷ 10^k (op 1)
    parse: none,
    reject: ([m, a, k, o]) => (m < 1 || m > 999 || m % 10 === 0 || a < 1 || a > 3 || k < 1 || k > 3 || o < 0 || o > 1 ? "Decimals with up to three digits and three decimal places, times or divided by 10, 100 or 1000." : null),
    prompt: ([m, a, k, o]) => `${D(m, 10 ** a)} ${o ? "÷" : "×"} ${10 ** k} = ?`,
    solve: ([m, a, k, o]) => {
      const ans = o ? D(m, 10 ** (a + k)) : D(m * 10 ** k, 10 ** a);
      return { steps: [step("move", o ? "divide" : "multiply", DEC, [D(m, 10 ** a), 10 ** k], ans)], answer: ans };
    },
    // independent: undo it — divide the answer back (or multiply it back) and compare with the number given
    validate: ([m, a, k, o], v) => {
      const x = val(v);
      return !!x && qe(o ? qm(x, [10 ** k, 1]) : qd(x, [10 ** k, 1]), q(m, 10 ** a));
    },
    bugs: ([m, a, k, o]) => [
      B("wrong-way", "conceptual", DEC, `The point was moved the wrong way; ${o ? "dividing makes the number smaller, so the point moves left" : "multiplying makes the number bigger, so the point moves right"}.`, o ? D(m * 10 ** k, 10 ** a) : D(m, 10 ** (a + k))),
      B("places-off", "procedural", DEC, `The point was moved the wrong number of places; ${10 ** k} has ${k} ${plural("zero", k)}, so move it ${k} ${plural("place", k)}.`, o ? D(m, 10 ** (a + k - 1)) : D(m * 10 ** (k - 1), 10 ** a)),
    ],
    distractors: ([m, a, k, o]) => (o ? [D(m, 10 ** (a + k + 1)), D(m * 10 ** k, 10 ** a), D(m, 10 ** a)] : [D(m * 10 ** (k + 1), 10 ** a), D(m, 10 ** (a + k)), D(m, 10 ** a)]),
    variants: () => [],
    explain: (s) => `${s.op === "divide" ? "Dividing" : "Multiplying"} by ${s.inputs[1]} moves every digit ${String(s.inputs[1]).length - 1} ${String(s.inputs[1]).length - 1 === 1 ? "place" : "places"} ${s.op === "divide" ? "to the right (the number gets smaller)" : "to the left (the number gets bigger)"}: ${s.inputs[0]} → ${s.value}`,
    domain: [[1, 999], [1, 3], [1, 3], [0, 1]],
    keep: ([m]) => m % 10 !== 0,
    cap: 400,
    difficulty: ([, a, k]) => (k === 1 ? 1 : a + k <= 4 ? 2 : 3),
    // the thing weighed fits the weight of one of them (seeds, nails, biscuit packets, bags of rice, sacks of cement)
    word: ([m, a, k, o]) => {
      const it = itemOf(o ? m / 10 ** (a + k) : m / 10 ** a);
      return o ? `${10 ** k} identical ${it[1]} weigh ${D(m, 10 ** a)} kg together. How much does one ${it[0]} weigh, in kg?` : `One ${it[0]} weighs ${D(m, 10 ** a)} kg. How much do ${10 ** k} such ${it[1]} weigh, in kg?`;
    },
    teach: {
      idea: "Multiplying by 10 makes each digit worth ten times as much, so every digit moves one place to the left; dividing by 10 moves every digit one place to the right.",
      method: "Count the zeros in 10, 100 or 1000 and move the decimal point that many places: right for ×, left for ÷. Fill empty places with zeros.",
      alternatives: [{ id: "place_table", title: "A place-value table", kind: "conceptual", text: ["Write the number in a place-value table (hundreds, tens, ones, tenths, hundredths, thousandths).", "Slide every digit across one column for each zero; the point stays where it is."] }],
    },
    limits: "Numbers with up to three digits and three decimal places; powers of 10 up to 1000.",
  },
  // ================================================================ fractions
  {
    id: "aifmul",
    arity: 5,
    title: "Multiplying fractions and mixed numbers",
    competency: FRP,
    type: "fraction",
    mc: true,
    // [w, a, b, c, d]: (w a/b) × (c/d), w = 0 for a proper fraction
    parse: none,
    reject: ([w, a, b, c, d]) => (w < 0 || w > 2 || b < 2 || b > 12 || d < 2 || d > 12 || a < 1 || a >= b || c < 1 || c >= d || gcd(a, b) !== 1 || gcd(c, d) !== 1 ? "Proper fractions in lowest terms (denominators up to 12), the first one possibly a mixed number up to 2." : null),
    prompt: ([w, a, b, c, d]) => `${w ? `${w} ${a}/${b}` : `${a}/${b}`} × ${c}/${d} = ? (Write the answer as a fraction in its simplest form, e.g. 7/4.)`,
    solve: ([w, a, b, c, d]) => {
      const top = w * b + a;
      const ans = ((w * b + a) * c) / (b * d);
      return { steps: [...(w ? [step("improper", "add", "MATH.number.mixed-fractions", [w * b, a], top)] : []), step("tops", "multiply", MT, [top, c], top * c), step("bottoms", "multiply", MT, [b, d], b * d), step("simplify", "divide", "MATH.number.equivalent-fractions", [`${top * c}/${b * d}`, gcd(top * c, b * d)], ans)], answer: ans };
    },
    // independent: divide the answer by the second fraction and check it gives the first (inverse operation)
    validate: ([w, a, b, c, d], v) => {
      if (typeof v !== "number") return false;
      const x = val(v);
      return !!x && qe(qd(x, [c, d]), q(w * b + a, b));
    },
    bugs: ([w, a, b, c, d]) => [
      B("cross-multiplied", "procedural", FRP, "The fractions were cross-multiplied (top × other bottom); to multiply fractions, multiply top by top and bottom by bottom.", ((w * b + a) * d) / (b * c)),
      B("added", "conceptual", FRP, "The fractions were added; 'of' and '×' mean multiply.", w + a / b + c / d),
      ...(w ? [B("whole-kept-apart", "procedural", "MATH.number.mixed-fractions", `Only the fraction part was multiplied and ${w} was kept as it was; change the mixed number to an improper fraction first (${w} ${a}/${b} = ${w * b + a}/${b}).`, w + (a * c) / (b * d))] : []),
    ],
    variants: () => [],
    explain: (s) => (s.id === "improper" ? `Mixed number to improper fraction: ${s.inputs[0]} + ${s.inputs[1]} = ${s.value} on top` : s.id === "tops" ? `Tops: ${s.inputs[0]} × ${s.inputs[1]} = ${s.value}` : s.id === "bottoms" ? `Bottoms: ${s.inputs[0]} × ${s.inputs[1]} = ${s.value}` : `Simplify ${s.inputs[0]} (divide top and bottom by ${s.inputs[1]}): ${fmt(Number(s.value))}`),
    domain: [[0, 2], [1, 11], [2, 12], [1, 11], [2, 12]],
    keep: ([, a, b, c, d]) => a < b && c < d && gcd(a, b) === 1 && gcd(c, d) === 1,
    cap: 400,
    difficulty: ([w, , b, , d]) => (w === 0 && b * d <= 30 ? 1 : w === 0 ? 2 : 3),
    word: ([w, a, b, c, d]) => `${name(a + c)} has ${w ? `${w} ${a}/${b}` : `${a}/${b}`} kg of rice and cooks ${c}/${d} of it. How many kg of rice are cooked? (Give a fraction.)`,
    teach: {
      idea: "a/b × c/d means c/d of a/b: cutting each of the b pieces into d smaller ones makes pieces of size 1/(b × d), and you take a × c of them.",
      method: "Change mixed numbers to improper fractions, multiply the tops, multiply the bottoms, and simplify.",
      alternatives: [{ id: "area_model", title: "Area model", kind: "conceptual", text: ["Draw a square. Shade a/b of it across and c/d of it down.", "The part shaded both ways is the product: a × c small rectangles out of b × d."], visual: ([, a, b, c, d]) => (b <= 10 && d <= 10 ? { type: "grid", rows: d, cols: b, shaded: a * c, note: `${a} of ${b} columns and ${c} of ${d} rows` } : null) }],
    },
    limits: "Proper fractions and mixed numbers up to 2 with denominators up to 12; products of three fractions are left out.",
  },
  {
    id: "aifdiv",
    arity: 4,
    title: "Dividing fractions using reciprocals",
    competency: FRP,
    type: "fraction",
    mc: true,
    // [a, b, c, d]: (a/b) ÷ (c/d); d = 1 means dividing by the whole number c
    parse: none,
    reject: ([a, b, c, d]) => (a < 1 || b < 2 || b > 12 || a >= b || gcd(a, b) !== 1 || c < 1 || c > 12 || d < 1 || d > 12 || (d === 1 ? c < 2 || c > 9 : c >= d || gcd(c, d) !== 1) ? "A proper fraction divided by a proper fraction or by a whole number from 2 to 9." : null),
    prompt: ([a, b, c, d]) => `${a}/${b} ÷ ${d === 1 ? c : `${c}/${d}`} = ? (Write the answer as a fraction in its simplest form, e.g. 7/4.)`,
    solve: ([a, b, c, d]) => {
      const ans = (a * d) / (b * c);
      return { steps: [step("reciprocal", "note", FRP, [d === 1 ? String(c) : `${c}/${d}`], `${d}/${c}`), step("multiply", "multiply", FRP, [`${a}/${b}`, `${d}/${c}`], fmt(ans))], answer: ans };
    },
    // independent: multiply the answer by the divisor and check it gives the dividend (inverse operation)
    validate: ([a, b, c, d], v) => {
      const x = val(v);
      return !!x && qe(qm(x, [c, d]), [a, b]);
    },
    bugs: ([a, b, c, d]) => [
      B("no-flip", "procedural", FRP, "The fractions were multiplied without turning the second one upside down; dividing by c/d is multiplying by d/c.", (a * c) / (b * d)),
      B("flipped-first", "procedural", FRP, "The first fraction was turned upside down instead of the second; only the divisor is replaced by its reciprocal.", (b * c) / (a * d)),
      ...(d === 1 ? [B("multiplied-by-whole", "conceptual", FRP, `The fraction was multiplied by ${c}; sharing into ${c} equal parts makes each part smaller.`, (a * c) / b)] : []),
    ],
    variants: () => [],
    explain: (s) => (s.id === "reciprocal" ? `Dividing by ${s.inputs[0]} is the same as multiplying by its reciprocal ${s.value}` : `${s.inputs[0]} × ${s.inputs[1]} = ${s.value}`),
    domain: [[1, 11], [2, 12], [1, 12], [1, 12]],
    keep: ([a, b, c, d]) => a < b && gcd(a, b) === 1 && (d === 1 ? c >= 2 && c <= 9 : c < d && gcd(c, d) === 1),
    cap: 400,
    difficulty: ([, b, c, d]) => (d === 1 ? 1 : b * d <= 40 ? 2 : 3),
    word: ([a, b, c, d]) => (d === 1 ? `${name(a + b)} shares ${a}/${b} of a cake equally among ${c} friends. What fraction of the whole cake does each friend get?` : `A jug holds ${a}/${b} litre of buttermilk. Each glass holds ${c}/${d} litre. How many glasses can be filled? (A fraction of a glass counts; give a fraction.)`),
    teach: {
      idea: "Dividing asks 'how many lots of the divisor fit?'. Dividing by c/d is the same as multiplying by d/c, its reciprocal, because c/d × d/c = 1.",
      method: "Keep the first fraction, change ÷ to ×, turn the second fraction upside down, then multiply and simplify.",
      alternatives: [{ id: "common_denominator", title: "Same-size pieces", kind: "conceptual", text: ["Write both fractions with the same denominator: 3/4 ÷ 1/8 = 6/8 ÷ 1/8.", "Now count: how many 1-eighths fit in 6-eighths? 6."] }],
    },
    limits: "Proper fractions divided by proper fractions or by whole numbers 2–9; mixed-number divisions are left out.",
  },
  // ================================================================ integers
  {
    id: "aiint",
    arity: 3,
    title: "Adding and subtracting integers",
    competency: INTA,
    type: "integer",
    mc: true,
    // [a, b, op]: a + b (op 0) or a − b (op 1), at least one negative number
    parse: (t) => {
      const m = t.replace(/−/g, "-").replace(/\s/g, "").match(/^\(?(-?\d{1,2})\)?([+-])\(?(-?\d{1,2})\)?=?\??$/);
      return m ? [Number(m[1]), Number(m[3]), m[2] === "+" ? 0 : 1] : null;
    },
    reject: ([a, b, o]) => (Math.abs(a) > 40 || Math.abs(b) > 40 || a === 0 || b === 0 || (a > 0 && b > 0) || o < 0 || o > 1 ? "Integers from −40 to 40 (not 0), at least one negative." : null),
    prompt: ([a, b, o]) => `${par(a)} ${o ? "−" : "+"} ${par(b)} = ?`,
    solve: ([a, b, o]) => {
      const r = o ? a - b : a + b;
      return o ? { steps: [step("opposite", "note", INTA, [`subtract ${par(b)}`], `add ${par(-b)}`), step("add", "add", INTA, [a, -b], r)], answer: r } : { steps: [step("add", "add", INTA, [a, b], r)], answer: r };
    },
    // independent: walk along the number line one step at a time
    validate: ([a, b, o], v) => {
      let x = a;
      const move = o ? -b : b;
      for (let i = 0; i < Math.abs(move); i++) x += Math.sign(move);
      return v === x;
    },
    bugs: ([a, b, o]) => {
      const r = o ? a - b : a + b;
      const out: Bug[] = [];
      if (!o && Math.sign(a) !== Math.sign(b)) out.push(B("sizes-added", "conceptual", INTA, "The sizes were added; with one positive and one negative number, they cancel, so find the difference of the sizes.", Math.sign(r || 1) * (Math.abs(a) + Math.abs(b))));
      if (!o && a < 0 && b < 0) out.push(B("negatives-make-positive", "conceptual", INTA, "Two negatives were taken to make a positive; that rule is for multiplying. Adding two debts makes a bigger debt.", -r));
      if (o && b < 0) out.push(B("minus-negative-as-minus", "conceptual", INTA, `Taking away ${par(b)} was done as taking away ${-b}; subtracting a negative number is the same as adding its opposite.`, a + b));
      if (o && b > 0) out.push(B("difference-of-sizes", "procedural", INTA, `${b} was taken off towards zero; subtracting a positive number moves left on the number line, further below zero.`, a + b));
      if (r !== 0 && !out.some((x) => x.predict === -r)) out.push(B("sign-lost", "procedural", INTA, "The size is right but the sign is wrong; check which way you moved on the number line.", -r));
      return out;
    },
    variants: () => [],
    explain: (s) => (s.id === "opposite" ? `To ${s.inputs[0]}, ${s.value}` : `${s.inputs.map((x) => par(x)).join(" + ")} = ${String(s.value).replace(/^-/, "−")}`),
    domain: [[-40, 40], [-40, 40], [0, 1]],
    keep: ([a, b]) => a !== 0 && b !== 0 && (a < 0 || b < 0),
    cap: 500,
    difficulty: ([a, b, o]) => (Math.abs(a) <= 10 && Math.abs(b) <= 10 && !o ? 1 : o && b < 0 ? 3 : 2),
    figure: ([a, b, o]) => {
      const r = o ? a - b : a + b;
      return { type: "numberline", from: Math.min(a, r, 0) - 2, to: Math.max(a, r, 0) + 2, step: Math.max(Math.abs(a), Math.abs(r)) > 20 ? 5 : 1, marks: [0, a] };
    },
    word: ([a, b, o]) => (o ? `In a quiz game, ${name(a + b)}'s score is ${neg(a)}. The quizmaster then takes away a card worth ${neg(b)} points from the score. What is the score now?` : `In a quiz game, ${name(a + b)}'s score is ${neg(a)}. ${name(a + b)} then gets a card worth ${neg(b)} points. What is the score now?`),
    teach: {
      idea: "On a number line, adding a positive number moves right and adding a negative number moves left. Subtracting a number is the same as adding its opposite.",
      method: "Change any subtraction into adding the opposite. Same signs: add the sizes and keep the sign. Different signs: subtract the sizes and take the sign of the larger size.",
      visual: ([a, b, o]) => {
        const r = o ? a - b : a + b;
        return { type: "numberline", from: Math.min(a, r, 0) - 2, to: Math.max(a, r, 0) + 2, step: Math.max(Math.abs(a), Math.abs(r)) > 20 ? 5 : 1, jumps: [[a, r]] };
      },
      alternatives: [{ id: "tokens", title: "Positive and negative tokens", kind: "conceptual", text: ["Use + tokens and − tokens; a + and a − together make zero and can be removed.", "To take away tokens you do not have, first add zero pairs (+ and −), then remove what you need."] }],
    },
    limits: "Two integers from −40 to 40 with at least one negative; longer expressions are left out.",
  },
  {
    id: "aitemp",
    arity: 3,
    title: "Integer differences in temperature and height",
    competency: INTA,
    type: "integer",
    mc: true,
    // [a, b, ctx]: start a (negative), end b > a; ctx 0 temperature, 1 height above or below sea level
    parse: none,
    reject: ([a, b, c]) => (a < -25 || a > -1 || b < -20 || b > 25 || b <= a || b === 0 || b - a > 30 || c < 0 || c > 1 ? "A negative starting value and a higher end value (up to 25), at most 30 apart." : null),
    prompt: ([a, b, c]) => (c === 0 ? `At 5 a.m. the temperature in a hill town was ${neg(a)} °C. By noon it was ${neg(b)} °C. By how many degrees did the temperature rise?` : `A diver is at ${neg(a)} m (below sea level). A ${b > 0 ? "seagull" : "fish"} is at ${neg(b)} m${b > 0 ? " (above sea level)" : ""}. How many metres higher is the ${b > 0 ? "seagull" : "fish"} than the diver?`),
    solve: ([a, b]) => ({ steps: [step("difference", "subtract", INTA, [b, a], b - a)], answer: b - a }),
    // independent: count the steps of 1 from the lower value up to the higher value
    validate: ([a, b], v) => {
      let n = 0;
      for (let x = a; x < b; x++) n++;
      return v === n;
    },
    bugs: ([a, b]) => [
      B("ignored-negative", "conceptual", INT, `${neg(a)} was treated as ${-a}; going from ${neg(a)} up to 0 is ${-a} steps, then on to ${neg(b)}.`, b > 0 && b + a > 0 ? b + a : null),
      B("sizes-added", "conceptual", INT, "The sizes were added; both values are below zero, so the gap is the difference of the sizes.", b < 0 ? -a - b : null),
    ],
    variants: () => [],
    explain: (s) => `Rise = end − start = ${neg(Number(s.inputs[0]))} − (${neg(Number(s.inputs[1]))}) = ${s.value}`,
    domain: [[-25, -1], [-20, 25], [0, 1]],
    keep: ([a, b]) => b > a && b !== 0 && b - a <= 30,
    cap: 500,
    difficulty: ([a, b]) => (b > 0 && b - a <= 20 ? 1 : b > 0 ? 2 : 3),
    figure: ([a, b]) => ({ type: "numberline", from: Math.min(a, 0) - 2, to: Math.max(b, 0) + 2, step: b - a > 25 ? 5 : 1, marks: [a, b, 0] }),
    word: ([a, b, c]) => (c === 0 ? `A diver is at ${neg(a)} m (below sea level). A ${b > 0 ? "seagull" : "fish"} is at ${neg(b)} m. How far above the diver is the ${b > 0 ? "seagull" : "fish"}, in metres?` : `The temperature inside a cold store is ${neg(a)} °C. During a power cut it rises to ${neg(b)} °C. By how many degrees has it gone up?`),
    teach: {
      idea: "The change from one value to another is end − start. On a number line it is the distance between the two points, counting through zero.",
      method: "Subtract the start from the end; subtracting a negative start means adding its size.",
      visual: ([a, b]) => ({ type: "numberline", from: Math.min(a, 0) - 2, to: Math.max(b, 0) + 2, step: b - a > 25 ? 5 : 1, jumps: [[a, b]] }),
      alternatives: [{ id: "via_zero", title: "Go through zero", kind: "procedural", text: ["Count up from the start to 0, then from 0 to the end.", "Add the two parts (when both values are below zero, just count the gap)."] }],
    },
    limits: "A rise from a negative value up to at most 25, a change of at most 30; falls and several changes in a row are left out.",
  },
];

// ---------------------------------------------------------------- data and helpers used above

function list(xs: string[]): string {
  return xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`;
}
function neg(v: number): string {
  return String(v).replace(/^-/, "−");
}
function polyAngles(n: number, s: number) {
  const S = (n - 2) * 180;
  const base = 5 * Math.round(S / n / 5);
  const given: number[] = [];
  for (let i = 0; i < n - 1; i++) given.push(base + ((hash(`${n}:${s}:${i}`) % 13) - 6) * 5);
  return { given, last: S - given.reduce((a, b) => a + b, 0) };
}
function counts(kind: number, n: number) {
  return kind === 0 ? { F: n + 2, V: 2 * n, E: 3 * n } : kind === 1 ? { F: n + 1, V: n + 1, E: 2 * n } : { F: 2 * n, V: n + 2, E: 3 * n };
}
function solidName(kind: number, n: number) {
  return `${ADJ[n]} ${kind === 0 ? "prism" : "pyramid"}`;
}
function netText(kind: number, n: number) {
  const base = PIECE[n];
  return kind === 0 ? `2 ${base}s and ${n} rectangles` : `1 ${base} and ${n} triangles`;
}
/** A wall that fits a real length in metres (for the plan-scale story). */
function wallOf(m: number) {
  return m <= 12 ? "A classroom wall" : m <= 60 ? "The front wall of the building" : "The boundary wall of the school ground";
}
/** Something that weighs about w kg each: [one, many]. */
function itemOf(w: number): [string, string] {
  return w < 0.0005 ? ["seed", "seeds"] : w < 0.03 ? ["nail", "nails"] : w < 1 ? ["packet of biscuits", "packets of biscuits"] : w <= 30 ? ["bag of rice", "bags of rice"] : ["sack of cement", "sacks of cement"];
}
/** The six sides of the L, from the top-left corner clockwise (the order the picture labels them). */
function lsides(W: number, H: number, p: number, c: number) {
  return [W - p, c, p, H - c, W, H];
}

// ================================================================ gap@1 additions (a whole number divided by a fraction,
// fraction word problems, integer expressions and stories, estimating decimal products and quotients, areas of polygons
// split into pieces and field problems, C ÷ d and approximations of π, convex and non-convex quadrilaterals, sectors in
// wipers and designs, hollow cylinders, the radius from the circumference, decimal division in context)

const SECT = "MATH.measurement.sectors";
const IMUL = "MATH.number.integer-multiply";
const ROUND = "MATH.number.rounding";
const mix = <T,>(salt: string, xs: T[]) => [...xs].sort((a, b) => hash(salt + String(a)) - hash(salt + String(b)) || (String(a) < String(b) ? -1 : 1));
const num = (r: R) => r[0] / r[1];
const evalT = (t: string) => {
  try {
    return evaluate(parse(t.replace(/×/g, "*").replace(/÷/g, "/").replace(/−/g, "-")), {});
  } catch {
    return NaN;
  }
};
const sg = (x: number) => (x < 0 ? `(−${-x})` : String(x));

// ---------------------------------------------------------------- fraction word problems (aifword)
// [ctx, a, b, c]: the fractions a/b and c (a whole number) or c/d coded as below
const FW = [
  { op: "÷", text: (w: number, a: number, b: number) => `${name(w + a)} has ${w} litres of buttermilk and pours it into glasses that each hold ${a}/${b} litre. How many glasses can be filled?`, whole: true },
  { op: "÷", text: (w: number, a: number, b: number) => `A tailor has ${w} m of cloth. Each school bag needs ${a}/${b} m. How many bags can be made from the cloth?`, whole: true },
  { op: "×", text: (w: number, a: number, b: number) => `A packet holds ${w} kg of rice. ${name(w + b)} uses ${a}/${b} of the packet. How many kg of rice is used? (A fraction or mixed number is fine.)`, whole: true },
  { op: "×", text: (c: number, a: number, b: number, d: number) => `${c}/${d} of a garden is used for vegetables, and ${a}/${b} of the vegetable part grows tomatoes. What fraction of the whole garden grows tomatoes?`, whole: false },
  { op: "÷", text: (c: number, a: number, b: number, d: number) => `A jug holds ${c}/${d} litre of juice. It is poured out in cupfuls of ${a}/${b} litre each. How many cupfuls is that? (A fraction or mixed number is fine: part of a cup counts as part of a cupful.)`, whole: false },
  { op: "×", text: (c: number, a: number, b: number, d: number) => `A car uses ${a}/${b} litre of petrol for each km. How many litres does it use for ${c}/${d} km? (A fraction is fine.)`, whole: false },
];
// [ctx, a, b, c, d]: d = 1 for the whole-number contexts
const fwOk = ([ctx, a, b, c, d]: number[]) => {
  if (ctx < 0 || ctx > 5 || a < 1 || b < 2 || b > 10 || a >= b || gcd(a, b) !== 1) return false;
  if (FW[ctx].whole) return d === 1 && c >= 2 && c <= 12 && (ctx === 2 || (c * b) % a === 0);
  return d >= 2 && d <= 10 && c >= 1 && c < d && gcd(c, d) === 1 && !(c === a && d === b) && (ctx !== 4 || (c * b) / (d * a) > 1);
};
const fwAns = ([ctx, a, b, c, d]: number[]): R => (FW[ctx].op === "÷" ? qd(q(c, d), q(a, b)) : qm(q(c, d), q(a, b)));

// ---------------------------------------------------------------- integer expressions and stories (aiintx, aimulti)
// aiintx [mode, a, b, c, e]: 0 a × b + c × e; 1 a × b − c ÷ e (c a multiple of e); 2 a quiz: a right (+b each), c wrong (−e each); 3 a temperature
// that starts at a °C and falls b °C each hour for c hours
const ixOk = ([mode, a, b, c, e]: number[]) => {
  if (mode === 0) return a >= -9 && a <= 9 && b >= -9 && b <= 9 && c >= -9 && c <= 9 && e >= -9 && e <= 9 && a * b * c * e !== 0 && (a < 0 || b < 0) && (c < 0 || e < 0) && Math.abs(a) > 1 && Math.abs(b) > 1 && Math.abs(c) > 1 && Math.abs(e) > 1;
  if (mode === 1) return a >= -9 && a <= 9 && b >= -9 && b <= 9 && c >= -60 && c <= 60 && e >= -9 && e <= 9 && Math.abs(e) >= 2 && a * b * c !== 0 && c % e === 0 && Math.abs(c / e) > 1 && (a < 0 || b < 0 || c < 0 || e < 0) && Math.abs(a) > 1 && Math.abs(b) > 1;
  if (mode === 2) return a >= 3 && a <= 15 && b >= 2 && b <= 5 && c >= 2 && c <= 10 && e >= 1 && e <= 3 && b > e;
  if (mode === 3) return a >= -5 && a <= 12 && b >= 2 && b <= 6 && c >= 2 && c <= 6 && e === 0 && a - b * c < 0;
  return false;
};
const ixText = ([mode, a, b, c, e]: number[]) => (mode === 0 ? `${sg(a)} × ${sg(b)} + ${sg(c)} × ${sg(e)}` : `${sg(a)} × ${sg(b)} − ${sg(c)} ÷ ${sg(e)}`);
const ixAns = ([mode, a, b, c, e]: number[]) => (mode === 0 ? a * b + c * e : mode === 1 ? a * b - c / e : mode === 2 ? a * b - c * e : a - b * c);
// aimulti [ctx, s, x, y, z]: start s, then +x, −y, +z (temperatures, a lift, a diver)
const muOk = ([ctx, s, x, y, z]: number[]) => {
  if (ctx < 0 || ctx > 2 || x < 1 || y < 1 || z < 1) return false;
  const v1 = s + x;
  const v2 = v1 - y;
  const v3 = v2 + z;
  if (ctx === 0) return s >= -12 && s <= 15 && x <= 12 && y <= 20 && z <= 12 && v2 < 0 && s !== 0 && v3 !== 0;
  if (ctx === 1) return s >= -3 && s <= 8 && x <= 9 && y <= 12 && z <= 9 && v1 <= 12 && v2 >= -3 && v2 < 0 && v3 <= 12 && v3 !== s;
  return s <= -2 && s >= -40 && x <= 25 && y <= 30 && z <= 20 && v1 < 0 && v2 < 0 && v3 < 0 && v3 !== s;
};
const muText = ([ctx, s, x, y, z]: number[]) => {
  const t = (v: number) => (v < 0 ? `−${-v}` : String(v));
  if (ctx === 0) return `At 6 a.m. the temperature in Leh was ${t(s)} °C. By noon it had risen by ${x} °C. By night it fell by ${y} °C, and by the next morning it had risen again by ${z} °C. What was the temperature the next morning, in °C?`;
  if (ctx === 1) return `A lift in a shopping mall starts at floor ${t(s)} (floor 0 is the ground floor, and basements are −1, −2, −3). It goes up ${x} floors, then down ${y} floors, then up ${z} floors. At which floor does it stop?`;
  return `A diver is at ${t(s)} m (below sea level). She rises ${x} m, then dives down ${y} m, then rises ${z} m. Where is she now, in metres? (Give a negative number for below sea level.)`;
};

// ---------------------------------------------------------------- estimating decimal products and quotients (aiest)
// [mode, x, y]: mode 0 x/10 × y/10 (each rounded to the nearest whole number); mode 1 x/10 ÷ y/10 (rounded values divide exactly)
const rnd = (t: number) => Math.floor(t / 10) + (t % 10 >= 5 ? 1 : 0);
const estOk = ([mode, x, y]: number[]) => {
  if (x % 10 === 0 || y % 10 === 0 || x % 10 === 5 || y % 10 === 5) return false;
  if (mode === 0) return x >= 11 && x <= 99 && y >= 11 && y <= 99 && rnd(x) >= 2 && rnd(y) >= 2 && rnd(x) * rnd(y) !== Math.round((x * y) / 100);
  if (mode === 1) return x >= 101 && x <= 999 && y >= 11 && y <= 99 && rnd(y) >= 2 && rnd(x) % rnd(y) === 0 && rnd(x) / rnd(y) >= 2;
  return false;
};
const estAns = ([mode, x, y]: number[]) => (mode === 0 ? rnd(x) * rnd(y) : rnd(x) / rnd(y));

// ---------------------------------------------------------------- polygons split into pieces, and field problems (aisplit)
// [mode, a, b, c, d]: 0 a field ABCD with diagonal AC = a m and perpendicular offsets b m and c m to B and D;
// 1 a house-shaped pentagon: a rectangle a × b with a triangle of height c on the side a; 2 a trapezium field with parallel
// sides a, b m and distance c m, levelled at ₹d per m²; 3 a trapezium of area given, parallel sides a and b: find the distance
const splitOk = ([mode, a, b, c, d]: number[]) => {
  if (mode === 0) return a >= 10 && a <= 60 && b >= 3 && b <= 25 && c >= 3 && c <= 25 && b !== c && d === 0;
  if (mode === 1) return a >= 4 && a <= 20 && b >= 3 && b <= 15 && c >= 2 && c <= 10 && a !== b && d === 0;
  if (mode === 2) return a >= 10 && a <= 60 && b >= 5 && b < a && c >= 5 && c <= 40 && d >= 2 && d <= 12 && (a + b) % 2 === 0;
  if (mode === 3) return a >= 6 && a <= 40 && b >= 3 && b < a && c >= 2 && c <= 30 && d === 0 && ((a + b) * c) % 2 === 0;
  return false;
};
const splitAns = ([mode, a, b, c, d]: number[]): R => (mode === 0 ? q(a * (b + c), 2) : mode === 1 ? q(2 * a * b + a * c, 2) : mode === 2 ? q(((a + b) * c * d), 2) : q(c, 1));
const splitCorners = ([mode, a, b, c]: number[]): [number, number][] =>
  mode === 0 ? [[0, 0], [a / 3, -b], [a, 0], [(2 * a) / 3, c]] : mode === 1 ? [[0, 0], [a, 0], [a, b], [a / 2, b + c], [0, b]] : [[0, 0], [a, 0], [(a + b) / 2, c], [(a - b) / 2, c]];

// ---------------------------------------------------------------- C ÷ d and historical values of π (aipi)
const OBJ = ["a steel plate", "a bangle", "a bicycle wheel", "a coin", "the rim of a well", "a clock face", "a round tabletop", "a drum"];
/** The diameters (mm) each object really has, so the sizes are sensible: a coin about 2 cm, a well rim a metre or more. */
const OBJD: [number, number][] = [[180, 300], [55, 80], [500, 700], [20, 30], [900, 1500], [150, 350], [600, 1200], [250, 600]];
// [mode, o, d]: mode 0, object o with diameter d mm (measured circumference = πd to the nearest mm); mode 1: approximation o
const APPROX = [
  { who: "Aryabhata (about 499 CE)", n: 62832, d: 20000 },
  { who: "an ancient Egyptian scribe", n: 256, d: 81 },
  { who: "the fraction 22/7 used in schools", n: 22, d: 7 },
  { who: "the Chinese mathematician Zu Chongzhi", n: 355, d: 113 },
  { who: "Bhaskara II (in one of his rules)", n: 3927, d: 1250 },
];
// mode 0: object o, diameter d mm in its real range; mode 1: approximation o as a decimal; mode 2: approximation o used to find
// the circumference of a circle of diameter d mm (40 to 400)
const piOk = ([mode, o, d]: number[]) =>
  mode === 0 ? o >= 0 && o <= 7 && d >= OBJD[o][0] && d <= OBJD[o][1] && d % 5 === 0 : mode === 1 ? o >= 0 && o < APPROX.length && d === 0 : mode === 2 ? o >= 0 && o < APPROX.length && d >= 40 && d <= 400 && d % 5 === 0 : false;
const measuredC = (d: number) => Math.round(Math.PI * d);
const r2 = (x: number) => Math.round(x * 100) / 100;
const r4 = (x: number) => Math.round(x * 10000) / 10000;

// ---------------------------------------------------------------- convex and non-convex quadrilaterals (aiconvex)
const CVX = ["a convex quadrilateral", "a non-convex (concave) quadrilateral", "not a quadrilateral"];
// [mode, kind, s]: mode 0 four angles given, mode 1 four corners given; kind 0 convex, 1 concave, 2 degenerate (a straight angle / three in a line)
function cvxAngles(kind: number, s: number): number[] {
  const r = (k: number) => hash(`aiconvex:a:${kind}:${s}:${k}`);
  if (kind === 0) {
    const a = 60 + (r(1) % 9) * 5;
    const b = 70 + (r(2) % 9) * 5;
    const c = 65 + (r(3) % 9) * 5;
    return [a, b, c, 360 - a - b - c];
  }
  if (kind === 1) {
    const big = 200 + (r(1) % 10) * 5;
    const a = 30 + (r(2) % 6) * 5;
    const b = 25 + (r(3) % 6) * 5;
    return [a, big, b, 360 - a - b - big];
  }
  const a = 50 + (r(1) % 8) * 5;
  const b = 40 + (r(2) % 8) * 5;
  return [a, 180, b, 360 - a - b - 180];
}
function cvxPoints(kind: number, s: number): [number, number][] {
  const r = (k: number) => hash(`aiconvex:p:${kind}:${s}:${k}`);
  const ox = (r(9) % 5) - 2;
  const oy = (r(8) % 5) - 2;
  const w = 4 + (r(1) % 4);
  const h = 3 + (r(2) % 4);
  const t = 1 + (r(3) % 2);
  const pts: [number, number][] = kind === 0 ? [[0, 0], [w + t, 0], [w, h], [t, h]] : kind === 1 ? [[0, 0], [w, 1 + (r(4) % 2)], [2 * w, 0], [w, h + 2]] : [[0, 0], [w, h], [2 * w, 2 * h], [-t, h + 3]];
  return pts.map(([x, y]) => [x + ox, y + oy] as [number, number]);
}
/** The seeds 0 … n − 1 whose problem differs from every earlier seed's (distinct@1), worked out once per key. */
const firstOf = (() => {
  const memo = new Map<string, Set<number>>();
  return (key: string, n: number, sig: (k: number) => string) => {
    if (!memo.has(key)) {
      const seen = new Set<string>();
      const ok = new Set<number>();
      for (let k = 0; k < n; k++) {
        const g = sig(k);
        if (!seen.has(g)) {
          seen.add(g);
          ok.add(k);
        }
      }
      memo.set(key, ok);
    }
    return memo.get(key)!;
  };
})();
const cvxOk = ([mode, kind, s]: number[]) => (mode === 0 || mode === 1) && kind >= 0 && kind <= 2 && s >= 0 && s <= 39 && firstOf(`aiconvex:${mode}:${kind}`, 40, (k) => JSON.stringify(mode === 0 ? cvxAngles(kind, k) : cvxPoints(kind, k))).has(s);
const cvxOpts = (p: number[]) => mix(`aiconvex:${p}`, CVX);

// ---------------------------------------------------------------- wipers and designs (aiwiper)
// [mode, a, b, t]: 0 a wiper blade from a cm to b cm from the pivot, sweeping t°: the area cleaned; 1 a square tile of side 2a
// with a quarter circle of radius a at each corner: the area left; 2 a leaf shape where two quarter circles of radius a in a
// square of side a overlap; 3 a lighthouse lighting a sector of t° out to a distance of b km
const WANG = [60, 72, 90, 105, 115, 120, 135, 150];
const terminates = (r: R) => {
  let d = r[1];
  while (d % 2 === 0) d /= 2;
  while (d % 5 === 0) d /= 5;
  return d === 1;
};
/** A predicted wrong answer as a learner writes it: exact when it terminates, else to two decimal places. */
const p2 = (r: R) => (terminates(r) ? num(r) : r2(num(r)));
const wipOk = (p: number[]) => wipShape(p) && terminates(wipAns(p));
const wipShape = ([mode, a, b, t]: number[]) => {
  if (mode === 0) return a >= 7 && b > a && b <= 56 && a % 7 === 0 && b % 7 === 0 && t >= 0 && t < WANG.length;
  if (mode === 1 || mode === 2) return a >= 7 && a <= 42 && a % 7 === 0 && b === 0 && t === 0;
  if (mode === 3) return a === 0 && b >= 7 && b <= 35 && b % 7 === 0 && t >= 0 && t < WANG.length;
  return false;
};
const wipAns = ([mode, a, b, t]: number[]): R => {
  if (mode === 0) return qm(qm(PI7, q(WANG[t], 360)), q(b * b - a * a, 1));
  if (mode === 1) return qs(q(4 * a * a, 1), qm(PI7, q(a * a, 1)));
  if (mode === 2) return qm(qs(qm(PI7, q(1, 2)), q(1, 1)), q(a * a, 1));
  return qm(qm(PI7, q(WANG[t], 360)), q(b * b, 1));
};

// ---------------------------------------------------------------- hollow cylinders (aihollow)
// [ask, R, r, h]: outer radius R, inner radius r (cm, multiples of 7 ÷ 2), height h; ask 0 curved surface (outside and inside), 1 total surface, 2 volume of material
// a real pipe: the wall at most half the outer radius (2r ≥ R) and the pipe at least as long as it is wide (h ≥ 7R, the outer diameter)
const holOk = ([ask, R, r, h]: number[]) => ask >= 0 && ask <= 2 && R >= 2 && R <= 12 && r >= 1 && r < R && 2 * r >= R && h >= 7 * R && h <= 140 && h % 5 === 0;
const holAns = ([ask, R, r, h]: number[]): R => {
  const [Ro, ri] = [q(7 * R, 2), q(7 * r, 2)];
  const csa = qm(qm(PI7, q(2 * h, 1)), qa(Ro, ri));
  const ring = qm(PI7, qs(qm(Ro, Ro), qm(ri, ri)));
  return ask === 0 ? csa : ask === 1 ? qa(csa, qm(q(2, 1), ring)) : qm(ring, q(h, 1));
};

// ---------------------------------------------------------------- the radius from the circumference (airad)
// [mode, k, n]: 0 a circle with circumference 44k cm: find the radius; 1 the same, find the diameter; 2 a wheel that rolls 44kn cm in n turns: find its radius
// a wheel of radius 28 to 70 cm (a bicycle or cart wheel)
const radOk = ([mode, k, n]: number[]) => (mode <= 1 ? mode >= 0 && k >= 1 && k <= 30 && n === 0 : mode === 2 ? k >= 4 && k <= 10 && n >= 10 && n <= 100 && n % 10 === 0 : false);

// ---------------------------------------------------------------- dividing decimals in context (aidword)
// [ctx, u, v]: answer u ÷ 10^... see the texts; all divisions are exact
const DW = [
  { text: (a: string, b: string) => `A ribbon ${a} m long is cut into pieces of ${b} m each. How many pieces are there?`, k: [2, 2] },
  { text: (a: string, b: string) => `₹${a} is shared equally among ${b} friends. How much does each friend get, in rupees?`, k: [2, 0] },
  { text: (a: string, b: string) => `A car goes ${a} km on ${b} litres of petrol. How many km does it go on 1 litre?`, k: [1, 1] },
  { text: (a: string, b: string) => `${a} kg of sugar is packed into bags of ${b} kg each. How many bags are filled?`, k: [2, 2] },
];
const dwOk = ([ctx, u, v]: number[]) => {
  if (ctx < 0 || ctx > 3) return false;
  if (ctx === 0 || ctx === 3) return v >= 5 && v <= 75 && v % 5 === 0 && v % 10 !== 0 && u >= 4 && u <= 60;
  if (ctx === 1) return v >= 3 && v <= 12 && u >= 105 && u <= 2500 && u % 10 !== 0;
  return v >= 15 && v <= 95 && v % 10 !== 0 && u >= 8 && u <= 25;
};
/** The dividend and divisor as decimals, and the quotient. */
const dwData = ([ctx, u, v]: number[]) => {
  if (ctx === 0 || ctx === 3) return { a: D(u * v, 100), b: D(v, 100), ans: q(u, 1) };
  if (ctx === 1) return { a: D(u * v, 100), b: String(v), ans: q(u, 100) };
  return { a: D(u * v, 10), b: D(v, 10), ans: q(u, 1) };
};

/** A quarter circle's area by Simpson's rule, with x = a sin t (a smooth integrand, so few strips are needed). */
const QUARTER = (a: number) => simpson((t) => a * a * Math.cos(t) ** 2, 0, Math.PI / 2, 60);
const K227 = 22 / 7 / Math.PI;

B09.push(
  // ================================================================ a whole number divided by a fraction
  {
    id: "aiwdiv",
    arity: 3,
    title: "Dividing a whole number by a fraction",
    competency: FRP,
    type: "fraction",
    mc: true,
    // [w, c, d]: w ÷ (c/d)
    parse: none,
    reject: ([w, c, d]) => (w < 2 || w > 12 || d < 2 || d > 10 || c < 1 || c >= d || gcd(c, d) !== 1 ? "A whole number from 2 to 12 divided by a proper fraction with denominator up to 10." : null),
    prompt: ([w, c, d]) => `${w} ÷ ${c}/${d} = ? (Write the answer as a whole number or a fraction in its simplest form.)`,
    solve: ([w, c, d]) => ({ steps: [step("reciprocal", "note", FRP, [`${c}/${d}`], `${d}/${c}`), step("multiply", "multiply", FRP, [w, `${d}/${c}`], dec(q(w * d, c)))], answer: num(q(w * d, c)) }),
    // independent: multiply back: the answer × c/d must give w
    validate: ([w, c, d], v) => {
      const x = val(v);
      return !!x && qe(qm(x, q(c, d)), q(w, 1));
    },
    bugs: ([w, c, d]) => [
      B("multiplied", "conceptual", FRP, `${w} was multiplied by ${c}/${d}. Dividing by a fraction less than 1 gives MORE than ${w}: multiply by the reciprocal ${d}/${c}.`, num(q(w * c, d))),
      B("numerator-only", "procedural", FRP, `${w} was divided by the numerator ${c} only. Dividing by ${c}/${d} means multiplying by ${d} and dividing by ${c}.`, c === 1 ? null : num(q(w, c))),
      B("wrong-reciprocal", "procedural", FRP, `The reciprocal of ${w} was taken instead of the reciprocal of ${c}/${d}. Keep ${w} and turn the divisor over.`, num(q(c, d * w))),
    ],
    variants: () => [],
    explain: say({ reciprocal: "The reciprocal of the divisor", multiply: "Multiply by it" }),
    domain: [[2, 12], [1, 9], [2, 10]],
    keep: ([w, c, d]) => c < d && gcd(c, d) === 1,
    difficulty: ([w, c, d]) => (c === 1 ? 1 : (w * d) % c === 0 ? 2 : 3),
    word: ([w, c, d]) => `${name(w + d)} has ${w} m of ribbon and cuts it into pieces ${c}/${d} m long. How many pieces of that length is that? (The answer may include a part of a piece: give a whole number or a fraction.)`,
    teach: {
      idea: `w ÷ (c/d) asks how many c/d's fit into w. Each whole holds d/c of them, so w wholes hold w × d/c: dividing by a fraction is multiplying by its reciprocal.`,
      method: "Turn the divisor upside down (its reciprocal) and multiply the whole number by it; simplify.",
      alternatives: [
        { id: "count_pieces", title: "Count the pieces", kind: "conceptual", text: ["6 ÷ 3/4: each whole has 4 quarters, so 6 wholes have 24 quarters.", "Group them in threes: 24 ÷ 3 = 8 pieces of 3/4."], visual: ([w, , d]) => ({ type: "grid", rows: Math.min(w, 6), cols: d }) },
        { id: "check", title: "Check by multiplying", kind: "procedural", text: ["Multiply your answer by the fraction.", "You should get back the whole number you started with."] },
      ],
    },
    limits: "Whole numbers up to 12 divided by proper fractions; dividing fractions by fractions is the aifdiv family.",
  },
  // ================================================================ fraction word problems (× or ÷)
  {
    id: "aifword",
    arity: 5,
    title: "Word problems with multiplying or dividing fractions",
    competency: FRP,
    type: "fraction",
    mc: true,
    // [ctx, a, b, c, d]: the situation FW[ctx] with the fraction a/b and c (whole) or c/d
    parse: none,
    reject: (p) => (fwOk(p) ? null : "Six everyday situations with fractions up to tenths."),
    prompt: ([ctx, a, b, c, d]) => (FW[ctx].whole ? (FW[ctx].text as (w: number, a: number, b: number) => string)(c, a, b) : (FW[ctx].text as (c: number, a: number, b: number, d: number) => string)(c, a, b, d)),
    solve: (p) => {
      const [ctx, a, b, c, d] = p;
      const first = d === 1 ? String(c) : `${c}/${d}`;
      return { steps: [step("choose", "choose", FRP, [FW[ctx].op], FW[ctx].op === "÷" ? "how many fit: divide" : "a fraction of an amount: multiply"), step("work", FW[ctx].op === "÷" ? "divide" : "multiply", FRP, [first, `${a}/${b}`], dec(fwAns(p)))], answer: num(fwAns(p)) };
    },
    // independent: undo the operation: (answer) × (a/b) gives the amount (÷), or (answer) ÷ (amount) gives a/b (×)
    validate: ([ctx, a, b, c, d], v) => {
      const x = val(v);
      if (!x) return false;
      return FW[ctx].op === "÷" ? qe(qm(x, q(a, b)), q(c, d)) : qe(qd(x, q(c, d)), q(a, b));
    },
    bugs: (p) => {
      const [ctx, a, b, c, d] = p;
      const other = FW[ctx].op === "÷" ? qm(q(c, d), q(a, b)) : qd(q(c, d), q(a, b));
      return [
        B("wrong-operation", "conceptual", "MATH.reasoning.operation-choice", FW[ctx].op === "÷" ? "The two numbers were multiplied. The question asks how many equal parts fit into the amount: that is a division." : "The amount was divided. Taking a fraction OF an amount (… of …) is a multiplication.", num(other)),
        ...(FW[ctx].op === "÷" ? [B("flipped-dividend", "procedural", FRP, "The fractions were divided the wrong way round. Divide the whole amount by the size of one part.", num(qd(q(a, b), q(c, d))))] : [B("added", "conceptual", FRP, "The fractions were added. 'A fraction of' a quantity means multiplying.", num(qa(q(a, b), q(c, d))))]),
      ];
    },
    variants: () => [],
    explain: (s) => (s.id === "choose" ? `Decide the operation: ${s.value}` : `${s.inputs[0]} ${s.op === "divide" ? "÷" : "×"} ${s.inputs[1]} = ${s.value}`),
    domain: [[0, 5], [1, 9], [2, 10], [1, 12], [1, 10]],
    keep: fwOk,
    cap: 400,
    difficulty: ([ctx]) => (ctx <= 2 ? 1 : ctx === 3 ? 2 : 3),
    teach: {
      idea: "'How many parts of size … fit into …' is a division; 'a fraction of an amount' is a multiplication. Deciding which comes first, then the calculation.",
      method: "Ask what the question wants: a number of equal parts (divide the amount by the size of a part) or a part of an amount (multiply the fraction by the amount). Then multiply by the reciprocal to divide, or multiply tops and bottoms.",
      alternatives: [
        { id: "easy_numbers", title: "Try easy numbers first", kind: "conceptual", text: ["Replace the fractions with whole numbers: '6 litres into 2-litre bottles' is 6 ÷ 2.", "The same operation works when the numbers are fractions."] },
        { id: "bar", title: "Draw a bar", kind: "procedural", text: ["Draw the whole amount as a bar and mark the fraction (or the part size) on it.", "Count how many parts fit, or shade the fraction of the bar asked for."], visual: () => ({ type: "strips", top: 4, bottom: 3, shaded: 3 }) },
      ],
    },
    limits: "One-step situations with proper fractions up to tenths; several steps are another family.",
  },
  // ================================================================ integer expressions and context problems
  {
    id: "aiintx",
    arity: 5,
    title: "Expressions and stories with several integer operations",
    competency: IMUL,
    type: "integer",
    mc: true,
    // [mode, a, b, c, e]: see ixAns
    parse: none,
    reject: (p) => (ixOk(p) ? null : "Two-product expressions with integers from −9 to 9, quiz scores and falling temperatures."),
    prompt: (p) => {
      const [mode, a, b, c, e] = p;
      if (mode <= 1) return `Work out ${ixText(p)}.`;
      if (mode === 2) return `In a quiz, every right answer scores +${b} and every wrong answer scores −${e}. ${name(a + c)} gives ${a} right answers and ${c} wrong answers. What is ${name(a + c)}'s total score?`;
      return `At 6 p.m. the temperature in Shimla was ${a < 0 ? `−${-a}` : a} °C. It then fell by ${b} °C every hour for ${c} hours. What was the temperature then, in °C?`;
    },
    solve: (p) => {
      const [mode, a, b, c, e] = p;
      if (mode === 0) return { steps: [step("p1", "multiply", IMUL, [a, b], a * b), step("p2", "multiply", IMUL, [c, e], c * e), step("sum", "add", INTA, [a * b, c * e], ixAns(p))], answer: ixAns(p) };
      if (mode === 1) return { steps: [step("p1", "multiply", IMUL, [a, b], a * b), step("q", "divide", IMUL, [c, e], c / e), step("diff", "subtract", INTA, [a * b, c / e], ixAns(p))], answer: ixAns(p) };
      if (mode === 2) return { steps: [step("right", "multiply", IMUL, [a, b], a * b), step("wrong", "multiply", IMUL, [c, -e], -c * e), step("total", "add", INTA, [a * b, -c * e], ixAns(p))], answer: ixAns(p) };
      return { steps: [step("fall", "multiply", IMUL, [c, -b], -b * c), step("end", "add", INTA, [a, -b * c], ixAns(p))], answer: ixAns(p) };
    },
    // independent: read the expression with the expression reader, or act the story out one answer (one hour) at a time
    validate: (p, v) => {
      const [mode, a, b, c, e] = p;
      if (typeof v !== "number") return false;
      if (mode <= 1) return near(evalT(ixText(p)), v);
      let t = mode === 2 ? 0 : a;
      if (mode === 2) {
        for (let i = 0; i < a; i++) t += b;
        for (let i = 0; i < c; i++) t -= e;
      } else for (let i = 0; i < c; i++) t -= b;
      return v === t;
    },
    bugs: (p) => {
      const [mode, a, b, c, e] = p;
      const ans = ixAns(p);
      const k = (x: number) => (Number.isInteger(x) && x !== ans ? x : null);
      if (mode === 0) return [B("sign-rule", "conceptual", IMUL, `The sign of ${sg(a)} × ${sg(b)} was wrong. Same signs give a positive product; different signs give a negative one.`, k(ans - 2 * a * b)), B("left-to-right", "procedural", "MATH.number.order-of-operations", "The expression was worked from left to right. Both multiplications come before the addition.", k((a * b + c) * e))];
      if (mode === 1) return [B("sign-rule", "conceptual", IMUL, `The sign of ${sg(c)} ÷ ${sg(e)} was wrong. Dividing numbers with the same sign gives a positive answer; different signs give a negative one.`, k(a * b + c / e)), B("left-to-right", "procedural", "MATH.number.order-of-operations", "The subtraction was done before the division. Multiplication and division come first.", k(Number.isInteger((a * b - c) / e) ? (a * b - c) / e : 0.5))];
      if (mode === 2) return [B("wrong-added", "conceptual", INTA, `The wrong answers were added. Each wrong answer is −${e}: ${c} × (−${e}) = −${c * e}.`, k(a * b + c * e)), B("right-only", "procedural", IMUL, "Only the right answers were counted; the wrong answers take marks away.", k(a * b))];
      return [B("rose", "conceptual", INTA, "The temperature was made to rise. A fall is a negative change: add −" + b + " for each hour.", k(a + b * c)), B("one-hour", "procedural", IMUL, `Only one hour's fall was taken. It fell ${b} °C every hour for ${c} hours: ${c} × (−${b}).`, k(a - b))];
    },
    variants: () => [],
    explain: say({ p1: "First product", p2: "Second product", q: "The division", sum: "Add", diff: "Subtract", right: "Right answers", wrong: "Wrong answers", total: "Total", fall: "The fall", end: "The final temperature" }),
    domain: [[0, 3], [-9, 15], [-9, 9], [-60, 60], [-9, 9]],
    keep: ixOk,
    cap: 400,
    difficulty: ([mode]) => (mode >= 2 ? 1 : mode === 0 ? 2 : 3),
    word: (p) => {
      const [mode, a, b, c, e] = p;
      // the story gives the products and the quotient themselves: a count of cards (or weeks) times a signed value each
      const pts = (v: number) => `${v < 0 ? "−" : "+"}${Math.abs(v)} point${Math.abs(v) === 1 ? "" : "s"}`;
      if (mode === 0) return `In a card game, red cards and blue cards carry plus or minus points. In one round ${name(a + c)} picks up ${Math.abs(a)} red card${Math.abs(a) === 1 ? "" : "s"} worth ${pts(Math.sign(a * b) * Math.abs(b))} each and ${Math.abs(c)} blue card${Math.abs(c) === 1 ? "" : "s"} worth ${pts(Math.sign(c * e) * Math.abs(e))} each. What is the score for the round? (It may be negative.)`;
      const week = a * b > 0 ? `go up by ₹${Math.abs(b)}00` : `go down by ₹${Math.abs(b)}00`;
      const share = c / e > 0 ? `pays an equal share of a ₹${Math.abs(c)}00 bill split among ${Math.abs(e)} friends` : `receives an equal share of a ₹${Math.abs(c)}00 prize split among ${Math.abs(e)} friends`;
      return `${name(a + c)}'s savings ${week} every week for ${Math.abs(a)} weeks. Then ${name(a + c)} ${share}. By how many hundreds of rupees have the savings changed altogether? (A negative answer means they went down.)`;
      if (mode === 2) return `In a school quiz, a team gets ${b} points for each right answer and loses ${e} for each wrong one. The team answers ${a} questions right and ${c} wrong. What is its score?`;
      return `In the night, the temperature on a hill in Ooty falls by ${b} °C every hour. At midnight it is ${a < 0 ? `−${-a}` : a} °C. What is it ${c} hours later, in °C?`;
    },
    teach: {
      idea: "Brackets, then × and ÷, then + and −, also for integers. A product or quotient of two numbers with the same sign is positive; with different signs it is negative. Repeated falls or losses are multiplication by a negative number.",
      method: "Work out each product or quotient with the sign rule, then add or subtract the results from left to right.",
      alternatives: [
        { id: "number_line", title: "Picture it on a number line", kind: "conceptual", text: ["A fall of 3 °C each hour for 4 hours is 4 jumps of −3 on the number line.", "Start at the first temperature and make the jumps."], visual: () => ({ type: "numberline", from: -12, to: 6, step: 3 }) },
        { id: "sign_table", title: "A sign table", kind: "procedural", text: ["+ × + = +, − × − = +, + × − = −, − × + = −.", "Decide the sign first, then multiply the sizes."] },
      ],
    },
    limits: "Two products (or a product and a quotient) of integers up to 9, and one- or two-rate stories; longer expressions are other families.",
  },
  {
    id: "aimulti",
    arity: 5,
    title: "Several integer changes in a row: temperatures, lifts and divers",
    competency: INTA,
    type: "integer",
    mc: true,
    // [ctx, s, x, y, z]: start s, up x, down y, up z
    parse: none,
    reject: (p) => (muOk(p) ? null : "Three changes from a starting temperature, floor or depth that cross or stay below zero."),
    prompt: muText,
    solve: ([, s, x, y, z]) => ({ steps: [step("up", "add", INTA, [s, x], s + x), step("down", "subtract", INTA, [s + x, y], s + x - y), step("up2", "add", INTA, [s + x - y, z], s + x - y + z)], answer: s + x - y + z }),
    // independent: move one unit at a time on a number line
    validate: ([, s, x, y, z], v) => {
      let t = s;
      for (let i = 0; i < x; i++) t++;
      for (let i = 0; i < y; i++) t--;
      for (let i = 0; i < z; i++) t++;
      return v === t;
    },
    bugs: ([ctx, s, x, y, z]) => {
      const ans = s + x - y + z;
      const k = (v: number) => (v === ans ? null : v);
      return [
        B("fall-added", "conceptual", INTA, `The ${ctx === 0 ? "fall" : ctx === 1 ? "trip down" : "dive down"} of ${y} was added. Going down is a negative change: take ${y} away.`, k(s + x + y + z)),
        ...(s < 0 ? [B("start-sign", "conceptual", INTA, `The start was read as ${-s} instead of −${-s}. Below zero the numbers are negative.`, k(-s + x - y + z))] : []),
        B("sign-dropped", "procedural", INTA, `After a negative running total (${s + x - y}), the minus sign was dropped, so ${Math.abs(s + x - y)} + ${z} was worked out. Keep the sign: ${s + x - y} + ${z}.`, k(Math.abs(s + x - y) + z)),
      ];
    },
    variants: () => [],
    explain: say({ up: "First change", down: "Second change", up2: "Third change" }),
    domain: [[0, 2], [-40, 15], [1, 25], [1, 30], [1, 20]],
    keep: muOk,
    cap: 400,
    difficulty: ([ctx, s]) => (ctx === 1 ? 1 : s >= 0 ? 2 : 3),
    word: ([ctx, s, x, y, z]) => `${name(s + x + y)} keeps a record of a ${["thermometer reading (°C)", "lift's floor number (ground floor 0, basements negative)", "diver's depth (metres, negative below sea level)"][ctx]}. It starts at ${s < 0 ? `−${-s}` : s}, goes up ${x}, then down ${y}, then up ${z}. What is the final reading?`,
    teach: {
      idea: "Rises and trips up are positive changes, falls and trips down are negative changes. Apply them one after another, in order.",
      method: "Start at the first value. Add each rise, subtract each fall, one at a time; when you cross zero, count down to 0 and carry on into the negatives.",
      alternatives: [
        { id: "thermometer", title: "Use a vertical number line", kind: "conceptual", text: ["Draw a thermometer (or a lift shaft) with 0 in the middle.", "Move up and down it step by step and read where you end."], visual: () => ({ type: "numberline", from: -10, to: 10, step: 2 }) },
        { id: "net", title: "Find the net change", kind: "procedural", text: ["Add all the rises, add all the falls, and subtract: +x + z − y.", "Then add the net change to the starting value."] },
      ],
    },
    limits: "Three changes in a row; one change at a time is the aitemp family.",
  },
  // ================================================================ estimating decimal products and quotients
  {
    id: "aiest",
    arity: 3,
    title: "Estimating decimal products and quotients",
    competency: DEC,
    type: "integer",
    mc: true,
    // [mode, x, y]: mode 0 (x/10) × (y/10); mode 1 (x/10) ÷ (y/10); each rounded to the nearest whole number first
    parse: none,
    reject: (p) => (estOk(p) ? null : "Decimals with one place (1.1 to 99.9) whose rounded values multiply, or divide exactly."),
    prompt: ([mode, x, y]) => `Estimate ${D(x, 10)} ${mode === 0 ? "×" : "÷"} ${D(y, 10)} by first rounding each number to the nearest whole number.`,
    solve: (p) => {
      const [mode, x, y] = p;
      return { steps: [step("round1", "round", ROUND, [D(x, 10)], rnd(x)), step("round2", "round", ROUND, [D(y, 10)], rnd(y)), step("estimate", mode === 0 ? "multiply" : "divide", DEC, [rnd(x), rnd(y)], estAns(p))], answer: estAns(p) };
    },
    // independent: round by looking at the decimal value (x/10 + 0.5, then the whole part) and work out the estimate
    validate: ([mode, x, y], v) => {
      const r = (t: number) => Math.floor(t / 10 + 0.5);
      return v === (mode === 0 ? r(x) * r(y) : r(x) / r(y));
    },
    bugs: ([mode, x, y]) => {
      const ans = estAns([mode, x, y]);
      const tx = Math.floor(x / 10);
      const ty = Math.floor(y / 10);
      const trunc = mode === 0 ? tx * ty : ty && tx % ty === 0 ? tx / ty : null;
      const exact = Math.round(mode === 0 ? (x * y) / 100 : x / y);
      return [
        B("cut-off", "procedural", ROUND, "The decimals were just cut off. Rounding to the nearest whole number looks at the tenths: 5 or more rounds up.", trunc === ans ? null : trunc),
        B("exact-not-estimate", "conceptual", DEC, "The exact answer was worked out and rounded. An estimate rounds the numbers FIRST, so it can be done in your head; here it is the rounded numbers' result.", exact === ans ? null : exact),
      ];
    },
    variants: () => [],
    explain: say({ round1: "Round the first number", round2: "Round the second number", estimate: "The estimate" }),
    domain: [[0, 1], [11, 999], [11, 99]],
    keep: estOk,
    cap: 300,
    difficulty: ([mode, x]) => (mode === 0 && x < 50 ? 1 : mode === 0 ? 2 : 3),
    word: ([mode, x, y]) => (mode === 0 ? `${name(x)} buys ${D(x, 10)} kg of tomatoes at ₹${D(y, 10)} a kg. Estimate the cost in rupees by rounding both numbers to the nearest whole number.` : `A car goes ${D(x, 10)} km using ${D(y, 10)} litres of petrol. Estimate how many km it goes on one litre, by rounding both numbers to the nearest whole number.`),
    teach: {
      idea: "An estimate tells roughly how big an answer should be, so a misplaced decimal point shows up at once. Rounding the numbers first makes the calculation easy to do in your head.",
      method: "Round each number to the nearest whole number (look at the tenths: 5 or more, round up). Multiply or divide the rounded numbers. Compare with the exact answer: they should be close.",
      alternatives: [
        { id: "point_check", title: "Use it to check the point", kind: "procedural", text: ["4.8 × 6.1 ≈ 5 × 6 = 30, so the exact answer 29.28 is sensible; 292.8 or 2.928 is not.", "Always estimate before placing the decimal point."] },
        { id: "number_line", title: "Round on a number line", kind: "conceptual", text: ["Mark the decimal between the two whole numbers it lies between.", "It rounds to the nearer one."], visual: ([, x]) => ({ type: "numberline", from: Math.floor(x / 10), to: Math.floor(x / 10) + 1, step: 1, marks: [x / 10] }) },
      ],
    },
    limits: "Rounding to the nearest whole number only; rounding to one significant figure is another family.",
  },
  // ================================================================ areas of polygons split into pieces; field problems
  {
    id: "aisplit",
    arity: 5,
    title: "Areas of fields and polygons split into triangles, rectangles and trapeziums",
    competency: TRAP,
    type: "fraction",
    mc: true,
    decimals: true,
    // [mode, a, b, c, d]: see splitAns
    parse: none,
    reject: (p) => (splitOk(p) ? null : "Fields with a diagonal and two offsets, house-shaped walls, trapezium fields and plots."),
    prompt: ([mode, a, b, c, d]) =>
      mode === 0
        ? `A field ABCD is split by the diagonal AC into two triangles. AC = ${a} m, and the perpendicular distances from B and from D to AC are ${b} m and ${c} m (so AC is the base of both triangles ABC and ACD, and these distances are their heights). Find the area of the field, in m².`
        : mode === 1
          ? `The end wall of a hut is a rectangle ${a} m wide and ${b} m high with a triangle on top, ${c} m high, standing on the whole width. Find the area of the wall, in m².`
          : mode === 2
            ? `A field is shaped like a trapezium with parallel sides ${a} m and ${b} m, which are ${c} m apart. Levelling the field costs ₹${d} per m². What is the total cost, in rupees?`
            : `A plot shaped like a trapezium has an area of ${D((a + b) * c, 2)} m². Its parallel sides are ${a} m and ${b} m. How far apart are the parallel sides, in m?`,
    solve: (p) => {
      const [mode, a, b, c, d] = p;
      if (mode === 0) return { steps: [step("t1", "half", TRI, [a * b], D(a * b, 2)), step("t2", "half", TRI, [a * c], D(a * c, 2)), step("sum", "add", TRAP, [D(a * b, 2), D(a * c, 2)], dec(splitAns(p)))], answer: num(splitAns(p)) };
      if (mode === 1) return { steps: [step("rect", "multiply", RAREA, [a, b], a * b), step("tri", "half", TRI, [a * c], D(a * c, 2)), step("sum", "add", TRAP, [a * b, D(a * c, 2)], dec(splitAns(p)))], answer: num(splitAns(p)) };
      if (mode === 2) return { steps: [step("area", "half", TRAP, [(a + b) * c], D((a + b) * c, 2)), step("cost", "multiply", TRAP, [D((a + b) * c, 2), d], dec(splitAns(p)))], answer: num(splitAns(p)) };
      return { steps: [step("double", "multiply", TRAP, [D((a + b) * c, 2), 2], (a + b) * c), step("height", "divide", TRAP, [(a + b) * c, a + b], c)], answer: c };
    },
    // independent: put the corners on a grid and use the shoelace formula (for the plot, try the height until it fits)
    validate: (p, v) => {
      const [mode, a, b, c, d] = p;
      const x = val(v);
      if (!x) return false;
      const want = num(x);
      if (mode <= 1) return near(shoelace(splitCorners(p)), want);
      if (mode === 2) return near(shoelace(splitCorners(p)) * d, want);
      return near(shoelace([[0, 0], [a, 0], [(a + b) / 2, want], [(a - b) / 2, want]]), ((a + b) * c) / 2);
    },
    bugs: (p) => {
      const [mode, a, b, c, d] = p;
      if (mode === 0) return [B("no-half", "procedural", TRI, "The triangles' areas were not halved. Each triangle is ½ × base × height.", a * (b + c)), B("one-triangle", "procedural", TRAP, "Only one of the two triangles was found; the field is both triangles together.", num(q(a * Math.max(b, c), 2)))];
      if (mode === 1) return [B("triangle-not-halved", "procedural", TRI, "The triangle was counted as a full rectangle. Its area is ½ × width × height.", a * b + a * c), B("rectangle-only", "procedural", TRAP, "Only the rectangle was found. The triangle on top is part of the wall too.", a * b)];
      if (mode === 2) return [B("area-only", "procedural", TRAP, "The area was found but not the cost. Multiply the area by the cost per m².", num(q((a + b) * c, 2))), B("no-half", "procedural", TRAP, "The trapezium's area was not halved: area = ½ × (sum of the parallel sides) × distance between them.", (a + b) * c * d)];
      return [B("no-double", "procedural", TRAP, "The area was divided by the sum of the parallel sides without doubling it first. Area = ½ × (a + b) × h, so h = 2 × area ÷ (a + b).", num(q(c, 2))), B("one-side", "procedural", TRAP, "The area was divided by one parallel side only.", p2(q((a + b) * c, 2 * a)))];
    },
    variants: () => [],
    explain: say({ t1: "Triangle ABC", t2: "Triangle ACD", sum: "Total area", rect: "The rectangle", tri: "The triangle", area: "Area of the field", cost: "Cost", double: "Twice the area", height: "The distance" }),
    domain: [[0, 3], [4, 60], [3, 25], [2, 40], [0, 12]],
    keep: splitOk,
    cap: 400,
    difficulty: ([mode]) => (mode === 1 ? 1 : mode === 0 ? 2 : 3),
    figure: ([mode, a, b, c]) => (mode >= 2 ? { type: "shape", kind: "trapezium", lengths: [`${b} m`, "", `${a} m`, ""], height: mode === 2 ? `${c} m` : "h" } : null),
    word: (p) => {
      const [mode, a, b, c, d] = p;
      return mode === 0 ? `A farmer measures a four-sided field with a long tape along one diagonal: ${a} m. From that line, the two other corners are ${b} m and ${c} m away (measured at right angles). What is the area of the field, in m²?` : mode === 1 ? `A house-shaped signboard is a rectangle ${a} m wide and ${b} m high with a triangle ${c} m high on top. How many m² of paint-board does it need?` : mode === 2 ? `A panchayat levels a trapezium-shaped playground whose parallel sides are ${a} m and ${b} m long and ${c} m apart, at ₹${d} per m². How much does it pay, in rupees?` : `A trapezium-shaped garden of area ${D((a + b) * c, 2)} m² has parallel sides of ${a} m and ${b} m. What is the distance between them, in m?`;
    },
    teach: {
      idea: "Any polygon can be cut into triangles, rectangles and trapeziums whose areas you know; the pieces' areas add up to the whole. A trapezium's area is ½ × (sum of the parallel sides) × the distance between them.",
      method: "Split the shape along a diagonal or a line you know, find each piece's area, and add. For a cost, multiply the area by the rate; to find a missing distance, put the area into the formula and solve.",
      alternatives: [
        { id: "field_book", title: "A surveyor's field book", kind: "procedural", text: ["Measure along one diagonal and the offsets (the perpendicular distances) to the other corners.", "Each offset makes a triangle with the diagonal: add ½ × diagonal × offset for each."] },
        { id: "grid", title: "Draw it on squared paper", kind: "conceptual", text: ["Draw the field to scale on squared paper.", "Count whole squares and pair up half squares to check your answer."] },
      ],
    },
    limits: "Quadrilaterals with a diagonal and two offsets, rectangles with a triangle on top, and trapezium fields; irregular polygons with many offsets are not included.",
  },
  // ================================================================ C ÷ d is the same for every circle; values of π
  {
    id: "aipi",
    arity: 3,
    title: "Circumference ÷ diameter, and values of π through history",
    competency: CIRC,
    type: "fraction",
    mc: true,
    decimals: true,
    // [mode, o, d]: mode 0 object OBJ[o] of diameter d mm (its measured circumference πd, to the nearest mm); mode 1 APPROX[o] as a decimal
    parse: none,
    reject: (p) => (piOk(p) ? null : "Real objects of their real sizes (a coin 20 to 30 mm across, a well 0.9 to 1.5 m); five historical values of π, also used for circles of 40 to 400 mm."),
    prompt: ([mode, o, d]) =>
      mode === 0
        ? `${name(o + d)} measures ${OBJ[o]} with a tape: its circumference is ${measuredC(d)} mm and its diameter is ${d} mm. Work out circumference ÷ diameter, correct to two decimal places.`
        : mode === 1
          ? `${APPROX[o].who} used ${APPROX[o].n}/${APPROX[o].d} for π. Write this value as a decimal, correct to four decimal places.`
          : `${APPROX[o].who} used ${APPROX[o].n}/${APPROX[o].d} for π. With this value, what is the circumference of a circle of diameter ${d} mm, in mm, correct to two decimal places?`,
    solve: ([mode, o, d]) =>
      mode === 0
        ? { steps: [step("ratio", "divide", CIRC, [measuredC(d), d], r2(measuredC(d) / d)), step("same", "note", CIRC, ["every circle"], "about 3.14 = π")], answer: r2(measuredC(d) / d) }
        : mode === 1
          ? { steps: [step("ratio", "divide", CIRC, [APPROX[o].n, APPROX[o].d], r4(APPROX[o].n / APPROX[o].d))], answer: r4(APPROX[o].n / APPROX[o].d) }
          : { steps: [step("circ", "multiply", CIRC, [`${APPROX[o].n}/${APPROX[o].d}`, d], r2((APPROX[o].n * d) / APPROX[o].d))], answer: r2((APPROX[o].n * d) / APPROX[o].d) },
    // independent: multiply back: the answer × the bottom number must be within half a unit of the last place of the top number
    validate: ([mode, o, d], v) => {
      const x = typeof v === "number" ? null : val(v);
      if (typeof v !== "number" && !x) return false;
      const t = typeof v === "number" ? v : num(x!);
      const [top, bot, places] = mode === 0 ? [measuredC(d), d, 2] : mode === 1 ? [APPROX[o].n, APPROX[o].d, 4] : [APPROX[o].n * d, APPROX[o].d, 2];
      const scaled = t * 10 ** places;
      return Math.abs(scaled - Math.round(scaled)) < 1e-6 && Math.abs(t * bot - top) <= (0.5 / 10 ** places) * bot + 1e-9;
    },
    bugs: ([mode, o, d]) => {
      if (mode === 2) {
        const C = r2((APPROX[o].n * d) / APPROX[o].d);
        const k = (x: number) => (x === C ? null : x);
        return [
          B("diameter-as-radius", "conceptual", CIRC, `The diameter was used as the radius in C = 2πr, which doubles the circumference. With the diameter, C = π × d.`, k(r2((2 * APPROX[o].n * d) / APPROX[o].d))),
          B("radius-times-pi", "procedural", CIRC, `Half the diameter (${d / 2} mm) was multiplied by π. C = π × d, or 2 × π × r with r = ${d / 2} mm.`, k(r2((APPROX[o].n * d) / (2 * APPROX[o].d)))),
        ];
      }
      const [top, bot] = mode === 0 ? [measuredC(d), d] : [APPROX[o].n, APPROX[o].d];
      const rr = mode === 0 ? r2 : r4;
      return [
        B("upside-down", "procedural", CIRC, "The diameter was divided by the circumference. π is circumference ÷ diameter, a little more than 3.", rr(bot / top)),
        ...(mode === 0 ? [B("radius", "conceptual", CIRC, `The circumference was divided by the radius (${d / 2} mm). Dividing by the radius gives 2π, about 6.28; π uses the diameter.`, r2((2 * top) / bot))] : [B("too-few-places", "procedural", ROUND, "Only two decimal places were given; four are asked.", r2(top / bot) === r4(top / bot) ? null : r2(top / bot))]),
      ];
    },
    variants: () => [],
    explain: (s) => (s.id === "ratio" ? `${s.inputs[0]} ÷ ${s.inputs[1]} = ${vs(s.value)}` : s.id === "circ" ? `C = π × d = ${s.inputs[0]} × ${s.inputs[1]} = ${String(s.value)} mm (to two decimal places)` : "The same ratio comes out for every circle, whatever its size: this constant is π"),
    domain: [[0, 2], [0, 7], [0, 1500]],
    keep: piOk,
    cap: 300,
    difficulty: ([mode]) => (mode === 0 ? 1 : mode === 1 ? 2 : 3),
    teach: {
      idea: "For every circle, big or small, the circumference is a little more than 3 times the diameter: C ÷ d is always the same number, π ≈ 3.1416. Mathematicians in India and elsewhere found better and better fractions for it (Aryabhata: 62832/20000).",
      method: "Divide the circumference by the diameter (both in the same unit) and round to the places asked. For a fraction, divide the top by the bottom.",
      alternatives: [
        { id: "string", title: "Measure with a string", kind: "conceptual", text: ["Wrap a string round a bangle, a plate and a wheel; measure the string and each diameter.", "Divide each time: the answers all come out close to 3.14."] },
        { id: "three_diameters", title: "Three diameters and a bit", kind: "procedural", text: ["Lay three diameters of string round the circle: a small gap is left.", "So C is a bit more than 3d, about 3.14 d."] },
      ],
    },
    limits: "Measurements to the nearest millimetre and five historical fractions (as decimals, and used to find a circumference); explaining why the ratio is constant is an educator-marked task.",
  },
  // ================================================================ convex and non-convex quadrilaterals
  {
    id: "aiconvex",
    arity: 3,
    title: "Convex, non-convex, or not a quadrilateral?",
    competency: QUAD,
    type: "choice",
    // [mode, kind, s]: mode 0 the four angles, mode 1 the four corners; kind 0 convex, 1 non-convex, 2 not a quadrilateral
    parse: none,
    reject: (p) => (cvxOk(p) ? null : "Four-sided figures given by their angles or corners."),
    choices: cvxOpts,
    prompt: ([mode, kind, s]) => {
      if (mode === 0) {
        const [a, b, c, d] = cvxAngles(kind, s);
        return `A closed path goes through four points A, B, C and D in order and back to A. The angles inside the path at the four points are ∠A = ${a}°, ∠B = ${b}°, ∠C = ${c}°, ∠D = ${d}°. What shape does the path make?`;
      }
      const P = cvxPoints(kind, s);
      return `The points ${P.map(([x, y], i) => `${"ABCD"[i]}(${x < 0 ? `−${-x}` : x}, ${y < 0 ? `−${-y}` : y})`).join(", ")} are joined in order A → B → C → D → A, as in the picture. What shape do they make?`;
    },
    solve: (p) => ({ steps: [step("check", "classify", QUAD, [p[0] === 0 ? "angles" : "corners"], CVX[p[1]])], answer: cvxOpts(p).indexOf(CVX[p[1]]) }),
    // independent: mode 0, look for a straight angle (180°) or a reflex angle (more than 180°); mode 1, the turning direction
    // at each corner (cross products): a zero means three points in a line, mixed signs mean a dent
    validate: (p, v) => {
      const [mode, kind, s] = p;
      let k: number;
      if (mode === 0) {
        const A = cvxAngles(kind, s);
        k = A.includes(180) ? 2 : A.some((x) => x > 180) ? 1 : 0;
      } else {
        const P = cvxPoints(kind, s);
        const cr = P.map((_, i) => {
          const [a, b, c] = [P[i], P[(i + 1) % 4], P[(i + 2) % 4]];
          return (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);
        });
        k = cr.some((x) => x === 0) ? 2 : cr.every((x) => x > 0) || cr.every((x) => x < 0) ? 0 : 1;
      }
      return typeof v === "number" && cvxOpts(p)[v] === CVX[k];
    },
    bugs: (p) => {
      const [mode, kind, s] = p;
      const o = cvxOpts(p);
      if (kind === 1) return [B("all-convex", "conceptual", QUAD, mode === 0 ? `Every four-sided figure was taken to be convex. ∠B = ${cvxAngles(kind, s)[1]}° is more than 180°: that corner points inwards, so the figure is non-convex.` : "Every four-sided figure was taken to be convex. One corner here points inwards (the figure has a dent), so it is non-convex.", o.indexOf(CVX[0]))];
      if (kind === 2) return [B("four-points-enough", "conceptual", QUAD, mode === 0 ? "Four points were taken to make a quadrilateral. ∠B = 180° means A, B and C lie on one straight line, so the figure is really a triangle." : "Four points were taken to make a quadrilateral. A, B and C lie on one straight line, so the figure is a triangle, not a 4-gon.", o.indexOf(CVX[0]))];
      return mode === 0 && cvxAngles(kind, s).some((x) => x > 90) ? [B("obtuse-is-dent", "conceptual", QUAD, "An obtuse angle (more than 90°) was taken as a dent. A figure is non-convex only when an angle is more than 180°.", o.indexOf(CVX[1]))] : [];
    },
    variants: () => [],
    explain: (s) => `Look at the ${s.inputs[0]}: it is ${s.value}`,
    domain: [[0, 1], [0, 2], [0, 39]],
    keep: cvxOk,
    difficulty: ([mode, kind]) => (kind === 0 ? 1 : mode === 0 ? 2 : 3),
    figure: ([mode, kind, s]) => (mode === 1 ? { type: "plane", points: cvxPoints(kind, s).map(([x, y], i) => [x, y, "ABCD"[i]]), segments: cvxPoints(kind, s).map((pt, i, P) => [pt, P[(i + 1) % 4]]), range: 12 } : null),
    teach: {
      idea: "A quadrilateral (4-gon) is a closed figure of four line segments meeting only at their ends, with no three corners in a line. It is convex when every inside angle is less than 180° (no dents); if one angle is more than 180°, it is non-convex.",
      method: "Check for a straight angle (180°) or three corners in a line: then it is not a quadrilateral. Otherwise look for an angle bigger than 180° (a corner pointing inwards): non-convex. If none, convex.",
      alternatives: [
        { id: "diagonals", title: "Look at the diagonals", kind: "conceptual", text: ["In a convex quadrilateral both diagonals lie inside it.", "In a non-convex one, one diagonal lies outside."] },
        { id: "rubber_band", title: "The rubber-band test", kind: "procedural", text: ["Imagine stretching a rubber band round the four corners.", "If the band touches every side, it is convex; if it skips a corner that is pushed in, it is non-convex."] },
      ],
    },
    limits: "Figures given by four angles or four corners on a grid; self-crossing figures are not included. Writing a precise definition of a 4-gon is an educator-marked task.",
  },
  // ================================================================ sectors in wipers, designs and lighthouses
  {
    id: "aiwiper",
    arity: 4,
    title: "Areas of wipers, tile designs and lighthouse beams",
    competency: SECT,
    type: "fraction",
    mc: true,
    decimals: true,
    // [mode, a, b, t]: see wipAns; t indexes WANG
    parse: none,
    reject: (p) => (wipOk(p) ? null : "Radii that are multiples of 7 (π = 22/7) with a terminating answer."),
    prompt: ([mode, a, b, t]) =>
      mode === 0
        ? `A car's wiper blade cleans the part of the windscreen between ${a} cm and ${b} cm from its pivot as it sweeps through ${WANG[t]}°. Taking π = 22/7, what area does it clean in one sweep, in cm²?`
        : mode === 1
          ? `A square tile has sides of ${2 * a} cm. At each corner a quarter circle of radius ${a} cm is drawn, centred on the corner. Taking π = 22/7, what area of the tile lies outside the four quarter circles, in cm²?`
          : mode === 2
            ? `In a square of side ${a} cm, two quarter circles of radius ${a} cm are drawn with their centres at two opposite corners. They overlap in a leaf shape. Taking π = 22/7, find the area of the leaf, in cm².`
            : `A lighthouse lights up the sea in a sector of angle ${WANG[t]}° out to a distance of ${b} km. Taking π = 22/7, what area of sea does it light, in km²?`,
    solve: (p) => {
      const [mode, a, b, t] = p;
      const ans = wipAns(p);
      if (mode === 0) return { steps: [step("outer", "multiply", SECT, [`${WANG[t]}/360`, "22/7", b * b], dec(qm(qm(PI7, q(WANG[t], 360)), q(b * b, 1)))), step("inner", "multiply", SECT, [`${WANG[t]}/360`, "22/7", a * a], dec(qm(qm(PI7, q(WANG[t], 360)), q(a * a, 1)))), step("clean", "subtract", SECT, ["outer sector", "inner sector"], dec(ans))], answer: num(ans) };
      if (mode === 1) return { steps: [step("square", "multiply", RAREA, [2 * a, 2 * a], 4 * a * a), step("quarters", "multiply", SECT, [4, `¼ × 22/7 × ${a}²`], dec(qm(PI7, q(a * a, 1)))), step("left", "subtract", SECT, [4 * a * a, dec(qm(PI7, q(a * a, 1)))], dec(ans))], answer: num(ans) };
      if (mode === 2) return { steps: [step("quarter", "multiply", SECT, ["¼", "22/7", a * a], dec(qm(PI7, q(a * a, 4)))), step("segment", "subtract", SECT, [dec(qm(PI7, q(a * a, 4))), D(a * a, 2)], dec(q(ans[0], 2 * ans[1]))), step("leaf", "multiply", SECT, [2, dec(q(ans[0], 2 * ans[1]))], dec(ans))], answer: num(ans) };
      return { steps: [step("sector", "multiply", SECT, [`${WANG[t]}/360`, "22/7", b * b], dec(ans))], answer: num(ans) };
    },
    // independent: work out the areas by numerical integration (Simpson's rule) with the true π, then rescale to π = 22/7
    validate: (p, v) => {
      const x = val(v);
      if (!x) return false;
      const [mode, a, b, t] = p;
      const th = (WANG[t] * Math.PI) / 180;
      let area: number;
      if (mode === 0) area = simpson((r) => r * th, a, b, 20) * K227;
      else if (mode === 3) area = simpson((r) => r * th, 0, b, 20) * K227;
      else if (mode === 1) area = 4 * a * a - 4 * QUARTER(a) * K227;
      else area = 2 * (QUARTER(a) * K227 - (a * a) / 2);
      return near(num(x), area, 1e-6);
    },
    bugs: (p) => {
      const [mode, a, b, t] = p;
      const f = q(WANG[t], 360);
      if (mode === 0) return [B("whole-sector", "conceptual", SECT, `The whole sector out to ${b} cm was found. The blade does not reach the part within ${a} cm of the pivot: take that smaller sector away.`, p2(qm(qm(PI7, f), q(b * b, 1)))), B("difference-squared", "procedural", SECT, `The radii were subtracted before squaring (${b} − ${a})². Find each sector's area, then subtract: the area depends on b² − a².`, p2(qm(qm(PI7, f), q((b - a) ** 2, 1))))];
      if (mode === 1) return [B("one-quarter", "procedural", SECT, "Only one quarter circle was taken away. There is one at each of the four corners: together they make a whole circle.", p2(qs(q(4 * a * a, 1), qm(PI7, q(a * a, 4))))), B("side-as-radius", "procedural", SECT, `The side of the tile (${2 * a} cm) was used as the radius.`, null)];
      if (mode === 2) return [B("one-segment", "procedural", SECT, "Only one half of the leaf was found. The leaf is two equal segments, one from each quarter circle.", p2(qm(qs(qm(PI7, q(1, 4)), q(1, 2)), q(a * a, 1)))), B("quarter-circle", "conceptual", SECT, "The area of a whole quarter circle was given. The leaf is the part where the two quarter circles overlap: quarter circle − triangle, twice.", p2(qm(PI7, q(a * a, 4))))];
      return [B("full-circle", "conceptual", SECT, `The area of the whole circle was found. The light covers only ${WANG[t]}/360 of it.`, p2(qm(PI7, q(b * b, 1)))), B("arc-not-area", "procedural", SECT, "The arc length was found instead of the area. The area of a sector is (θ/360) × πr².", p2(qm(qm(PI7, f), q(2 * b, 1))))];
    },
    variants: () => [],
    explain: say({ outer: "Sector out to the blade's tip", inner: "Sector the blade does not reach", clean: "Area cleaned", square: "The tile", quarters: "Four quarter circles = one circle", left: "Area left", quarter: "Quarter circle", segment: "One segment (quarter circle − triangle)", leaf: "The leaf (two segments)", sector: "The lit sector" }),
    domain: [[0, 3], [0, 42], [0, 56], [0, 7]],
    keep: wipOk,
    cap: 300,
    difficulty: ([mode]) => (mode === 3 ? 1 : mode === 1 ? 2 : 3),
    // only the lighthouse's sector is drawn: a full sector would mislead for the wiper (its inner part is not cleaned), and a
    // plain square would not show the quarter circles
    figure: ([mode, , b, t]) => (mode === 3 ? { type: "circle", radius: `${b} km`, sector: WANG[t] } : null),
    teach: {
      idea: "A sector of angle θ is θ/360 of a circle, so its area is (θ/360) × πr². Shapes from wipers and designs are built from sectors, squares and triangles by adding and taking away.",
      method: "Split the shape: a wiper's path is a big sector minus a small one; corner quarter circles together make a whole circle; a leaf is two segments, each a quarter circle minus a right triangle. Work out each part, then combine.",
      alternatives: [
        { id: "fraction_of_circle", title: "Think in fractions of a circle", kind: "conceptual", text: ["90° is a quarter of a full turn, 120° a third, 60° a sixth.", "So the sector is that fraction of πr²."], visual: () => ({ type: "circle", radius: "r", sector: 90 }) },
        { id: "add_take", title: "Add and take away", kind: "procedural", text: ["Write the shaded area as (big shape) − (pieces cut out) or (piece) + (piece).", "Work out each piece separately and combine them at the end."] },
      ],
    },
    limits: "Radii that are multiples of 7 with π = 22/7; segments with angles other than 90° are the amseg family.",
  },
  // ================================================================ hollow cylinders
  {
    id: "aihollow",
    arity: 4,
    title: "Surface area and volume of a hollow cylinder (a pipe)",
    competency: CYL,
    type: "fraction",
    mc: true,
    decimals: true,
    // [ask, R, r, h]: outer radius 7R/2 cm, inner radius 7r/2 cm, length h cm; ask 0 curved surface (outside and inside), 1 total surface, 2 volume of material
    parse: none,
    reject: (p) => (holOk(p) ? null : "Pipes with radii 3.5 to 42 cm (inner smaller, the wall at most half the outer radius) and lengths from the outer diameter up to 140 cm, in steps of 5 cm."),
    prompt: ([ask, R, r, h]) => `A hollow metal pipe is ${h} cm long. Its outer radius is ${D(7 * R, 2)} cm and its inner radius is ${D(7 * r, 2)} cm. Taking π = 22/7, find ${["its curved surface area, outside and inside together, in cm²", "its total surface area (outside, inside and the two ring-shaped ends), in cm²", "the volume of metal in it, in cm³"][ask]}.`,
    solve: (p) => {
      const [ask, R, r, h] = p;
      const [Ro, ri] = [q(7 * R, 2), q(7 * r, 2)];
      const out = qm(qm(PI7, q(2 * h, 1)), Ro);
      const inn = qm(qm(PI7, q(2 * h, 1)), ri);
      const ring = qm(PI7, qs(qm(Ro, Ro), qm(ri, ri)));
      const steps = ask === 2 ? [step("ring", "subtract", CYL, ["πR²", "πr²"], dec(ring)), step("volume", "multiply", CYL, [dec(ring), h], dec(holAns(p)))] : [step("outside", "multiply", CYL, ["2π", dec(Ro), h], dec(out)), step("inside", "multiply", CYL, ["2π", dec(ri), h], dec(inn)), ...(ask === 1 ? [step("ends", "multiply", CYL, [2, dec(ring)], dec(qm(q(2, 1), ring)))] : []), step("total", "add", CYL, ask === 1 ? [dec(out), dec(inn), dec(qm(q(2, 1), ring))] : [dec(out), dec(inn)], dec(holAns(p)))];
      return { steps, answer: num(holAns(p)) };
    },
    // independent: the ring is found by Simpson's rule (thin circles of radius ρ from r to R), the curved parts by unrolling
    // (circumference by Simpson round the circle) with the true π, rescaled to π = 22/7
    validate: (p, v) => {
      const x = val(v);
      if (!x) return false;
      const [ask, R, r, h] = p;
      const [Ro, ri] = [(7 * R) / 2, (7 * r) / 2];
      const ring = simpson((rho) => 2 * Math.PI * rho, ri, Ro, 20) * K227;
      const circ = (rad: number) => simpson(() => rad, 0, 2 * Math.PI, 20) * K227;
      const curved = (circ(Ro) + circ(ri)) * h;
      const want = ask === 0 ? curved : ask === 1 ? curved + 2 * ring : ring * h;
      return near(num(x), want, 1e-6);
    },
    bugs: (p) => {
      const [ask, R, r, h] = p;
      const [Ro, ri] = [q(7 * R, 2), q(7 * r, 2)];
      const out = qm(qm(PI7, q(2 * h, 1)), Ro);
      const csa = holAns([0, R, r, h]);
      if (ask === 0) return [B("outside-only", "procedural", CYL, "Only the outside curved surface was found. A pipe has an inside surface too: 2πrh.", num(out)), B("radius-difference", "conceptual", CYL, "The difference of the radii was used. The two curved surfaces ADD: 2πh(R + r).", num(qm(qm(PI7, q(2 * h, 1)), qs(Ro, ri))))];
      if (ask === 1) return [B("no-ends", "procedural", CYL, "The two ring-shaped ends were left out of the total surface.", num(csa)), B("full-circle-ends", "conceptual", CYL, "The ends were taken as full circles. Each end is a ring: πR² − πr².", num(qa(csa, qm(q(2, 1), qm(PI7, qm(Ro, Ro))))))];
      return [B("difference-squared", "conceptual", CYL, "(R − r)² was used. The metal's cross-section is πR² − πr², not π(R − r)².", num(qm(qm(PI7, qm(qs(Ro, ri), qs(Ro, ri))), q(h, 1)))), B("outer-only", "procedural", CYL, "The whole cylinder's volume was found. Take away the hollow inside: πr²h.", num(qm(qm(PI7, qm(Ro, Ro)), q(h, 1))))];
    },
    variants: () => [],
    explain: say({ outside: "Outside curved surface", inside: "Inside curved surface", ends: "Two ring-shaped ends", total: "Total", ring: "Area of the ring", volume: "Volume of metal" }),
    domain: [[0, 2], [2, 12], [1, 11], [15, 140]],
    keep: holOk,
    cap: 400,
    difficulty: ([ask]) => (ask === 0 ? 1 : ask === 2 ? 2 : 3),
    figure: ([, R, r, h]) => ({ type: "solid", name: "cylinder", dims: [`outer radius ${D(7 * R, 2)} cm`, `inner radius ${D(7 * r, 2)} cm`, `length ${h} cm`] }),
    word: ([ask, R, r, h]) => `A cement drainage pipe is ${h} cm long, with outer radius ${D(7 * R, 2)} cm and inner radius ${D(7 * r, 2)} cm. ${["Both its outside and inside are to be painted. What area is painted, in cm²?", "Every surface (outside, inside and both ends) is to be coated. What area is coated, in cm²?", "How much cement is in the pipe, in cm³?"][ask]} (Take π = 22/7.)`,
    teach: {
      idea: "A hollow cylinder is a big cylinder with a smaller one taken out. Its curved surface has an outside part 2πRh and an inside part 2πrh; each end is a ring of area πR² − πr²; its volume is π(R² − r²)h.",
      method: "Work out the outer and inner curved surfaces and add them. For the total surface, add two rings. For the volume, find the ring's area and multiply by the length.",
      alternatives: [
        { id: "unroll", title: "Unroll the pipe", kind: "conceptual", text: ["Cut the pipe along its length: the outside unrolls into a rectangle 2πR by h, the inside into one 2πr by h.", "The ends are rings, like flat bangles."], visual: () => ({ type: "solid", name: "cylinder" }) },
        { id: "subtract", title: "Big minus small", kind: "procedural", text: ["Volume: (volume of the solid cylinder of radius R) − (volume of the hole of radius r).", "Ring: πR² − πr² = π(R + r)(R − r)."] },
      ],
    },
    limits: "Pipes with radii that are multiples of 3.5 cm and π = 22/7; closed solid cylinders are the aicyls family.",
  },
  // ================================================================ the radius from the circumference
  {
    id: "airad",
    arity: 3,
    title: "Finding the radius or diameter from the circumference",
    competency: CIRC,
    type: "fraction",
    mc: true,
    decimals: true,
    // [mode, k, n]: 0 circumference 44k cm, find the radius; 1 find the diameter; 2 a wheel rolls 44kn cm in n turns, find its radius
    parse: none,
    reject: (p) => (radOk(p) ? null : "Circumferences that are multiples of 44 cm (π = 22/7); wheels of radius 28 to 70 cm."),
    prompt: ([mode, k, n]) => (mode <= 1 ? `The circumference of a circle is ${44 * k} cm. Taking π = 22/7, find its ${mode === 0 ? "radius" : "diameter"}, in cm.` : `A cart wheel rolls ${D(44 * k * n, 100)} m along a road in ${n} full turns. Taking π = 22/7, find the radius of the wheel, in cm.`),
    solve: ([mode, k, n]) => {
      const C = 44 * k;
      const steps = [...(mode === 2 ? [step("per-turn", "divide", CIRC, [44 * k * n, n], C)] : []), step("diameter", "divide", CIRC, [C, "22/7"], 14 * k), ...(mode === 1 ? [] : [step("radius", "divide", CIRC, [14 * k, 2], 7 * k)])];
      return { steps, answer: mode === 1 ? 14 * k : 7 * k };
    },
    // independent: multiply back: 2 × 22/7 × radius (or 22/7 × diameter) must give the circumference
    validate: ([mode, k], v) => {
      const x = val(v);
      if (!x) return false;
      return qe(qm(PI7, mode === 1 ? x : qm(q(2, 1), x)), q(44 * k, 1));
    },
    bugs: ([mode, k, n]) => {
      if (mode === 1) return [B("gave-radius", "procedural", CIRC, "The radius was found. The diameter is twice the radius: C ÷ π.", 7 * k), B("halved-c", "conceptual", CIRC, "The circumference was halved. Dividing by π (about 3.14) gives the diameter.", 22 * k)];
      return [B("gave-diameter", "procedural", CIRC, "C ÷ π gives the diameter. The radius is half of it.", 14 * k), ...(mode === 2 ? [B("whole-distance", "procedural", CIRC, `The whole distance was used. In one turn the wheel rolls its circumference: ${D(44 * k * n, 100)} m ÷ ${n} turns.`, 7 * k * n)] : [B("times-pi", "conceptual", CIRC, "The circumference was multiplied by π. To undo C = 2πr, divide by 2π.", p2(qm(q(44 * k, 2), PI7)))])];
    },
    variants: () => [],
    explain: (s) => (s.id === "per-turn" ? `One turn rolls ${s.inputs[0]} cm ÷ ${s.inputs[1]} = ${s.value} cm, the circumference` : s.id === "diameter" ? `d = C ÷ π = ${s.inputs[0]} × 7/22 = ${s.value} cm` : `r = d ÷ 2 = ${s.value} cm`),
    domain: [[0, 2], [1, 30], [0, 100]],
    keep: radOk,
    difficulty: ([mode, k]) => (mode === 1 ? 1 : mode === 0 ? (k <= 10 ? 1 : 2) : 3),
    word: ([mode, k, n]) => (mode <= 1 ? `${name(k)} wraps a measuring tape once round ${k <= 3 ? "a round steel plate" : k <= 10 ? "a round tabletop" : "the rim of a round well"}; it measures ${44 * k} cm. Taking π = 22/7, what is its ${mode === 0 ? "radius" : "diameter"}, in cm?` : `The wheel of ${name(k)}'s bicycle turns ${n} times while the bicycle goes ${D(44 * k * n, 100)} m. Taking π = 22/7, what is the radius of the wheel, in cm?`),
    teach: {
      idea: "C = πd = 2πr. Working backwards: d = C ÷ π and r = C ÷ 2π. A wheel rolls its circumference in one turn.",
      method: "Divide the circumference by 22/7 (multiply by 7/22) to get the diameter; halve it for the radius. For a wheel, first divide the distance by the number of turns (in the same unit).",
      alternatives: [
        { id: "check", title: "Check by multiplying", kind: "procedural", text: ["Put your radius back into C = 2 × 22/7 × r.", "You should get the circumference you started with."] },
        { id: "rough", title: "Rough size first", kind: "conceptual", text: ["The circumference is a little more than 3 diameters.", "So the diameter is a little less than C ÷ 3, and the radius about C ÷ 6."] },
      ],
    },
    limits: "Circumferences that are multiples of 44 cm; π = 3.14 versions are not included.",
  },
  // ================================================================ dividing decimals in context
  {
    id: "aidword",
    arity: 3,
    title: "Word problems with dividing decimals",
    competency: DEC,
    type: "fraction",
    mc: true,
    decimals: true,
    // [ctx, u, v]: see dwData
    parse: none,
    reject: (p) => (dwOk(p) ? null : "Exact decimal divisions in four everyday situations."),
    prompt: (p) => {
      const { a, b } = dwData(p);
      return DW[p[0]].text(a, b);
    },
    solve: (p) => {
      const { a, b, ans } = dwData(p);
      const k = p[0] === 1 ? 0 : p[0] === 2 ? 1 : 2;
      return { steps: [step("shift", "multiply", DEC, [a, b, 10 ** k], k ? `${D(Math.round(num(val(a)!) * 10 ** k))} ÷ ${D(Math.round(num(val(b)!) * 10 ** k))}` : `${a} ÷ ${b}`), step("divide", "divide", DEC, [a, b], dec(ans))], answer: num(ans) };
    },
    // independent: multiply back exactly: answer × divisor = dividend
    validate: (p, v) => {
      const x = val(v);
      const { a, b } = dwData(p);
      return !!x && qe(qm(x, val(b)!), val(a)!);
    },
    bugs: (p) => {
      const { a, b, ans } = dwData(p);
      const A = num(ans);
      return [
        B("point-slip", "procedural", DEC, "The decimal point was moved in only one of the numbers. Multiply the dividend and the divisor by the SAME power of 10 so the divisor becomes a whole number.", r2(A * 10) === A ? null : r4(A * 10)),
        B("point-slip-other", "procedural", DEC, "The answer's decimal point is one place out. Estimate first: the answer must be about " + `${Math.round(num(val(a)!))} ÷ ${Math.max(1, Math.round(num(val(b)!)))}.`, r4(A / 10)),
        B("multiplied", "conceptual", "MATH.reasoning.operation-choice", "The numbers were multiplied. Sharing or cutting into equal parts is a division.", r4(num(val(a)!) * num(val(b)!))),
      ];
    },
    variants: () => [],
    explain: (s) => (s.id === "shift" ? `Make the divisor a whole number: ${s.value}` : `${s.inputs[0]} ÷ ${s.inputs[1]} = ${s.value}`),
    domain: [[0, 3], [4, 2500], [3, 95]],
    keep: dwOk,
    cap: 400,
    difficulty: ([ctx]) => (ctx === 1 ? 1 : ctx === 2 ? 2 : 3),
    teach: {
      idea: "Dividing by a decimal asks how many of it fit (or how much each gets). Multiplying both numbers by the same power of 10 does not change the answer, and makes the divisor a whole number.",
      method: "Move the decimal point in both numbers the same number of places until the divisor is whole. Then divide as usual, placing the point in the answer above the point in the dividend. Estimate to check.",
      alternatives: [
        { id: "money", title: "Think in paise or centimetres", kind: "conceptual", text: ["7.5 m ÷ 0.25 m is the same as 750 cm ÷ 25 cm = 30.", "₹45.60 ÷ 4 is 4560 paise ÷ 4 = 1140 paise = ₹11.40."] },
        { id: "estimate", title: "Estimate first", kind: "procedural", text: ["Round both numbers: 7.5 ÷ 0.25 is about 8 ÷ 0.25 = 32.", "Your exact answer should be close to the estimate."] },
      ],
    },
    limits: "Exact divisions in four everyday situations; dividing by powers of 10 is the aidp10 family.",
  },
);
