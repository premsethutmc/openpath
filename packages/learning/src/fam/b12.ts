/**
 * Batch b12 (families@2), Grades 9–11 algebra, coordinate geometry and circle geometry: multiplying and dividing
 * polynomials, the remainder and factor theorems, linear rules and equations in two variables, GCD and LCM of
 * polynomials, rational expressions, composition of functions, pairs of linear equations and systems in three
 * variables, square roots of polynomials, zeros and their symmetric functions, solving quadratics with graphs and
 * tables, sums of powers, distance, midpoint and parallelogram vertices from coordinates, areas from coordinates,
 * and circle theorems (angles, chords, which theorem justifies a step). Written by OpenPath; CC0.
 */
import type { Bug, Def, Step, Value } from "../family-kit";
import { fmt, gcd, near, sup } from "../family-kit";
import { evaluate, parse } from "../answer-types";

const POLY = "MATH.algebra.polynomials";
const FT = "MATH.algebra.factor-theorem";
const L2 = "MATH.algebra.linear-two-variables";
const GL = "MATH.algebra.polynomial-gcd-lcm";
const RATX = "MATH.algebra.rational-expressions";
const FOP = "MATH.algebra.function-operations";
const SYS = "MATH.algebra.linear-systems";
const SYS3 = "MATH.algebra.linear-systems-three-variables";
const PSQ = "MATH.algebra.polynomial-square-root";
const ZER = "MATH.algebra.polynomial-zeros";
const QG = "MATH.algebra.quadratic-graphs";
const PS = "MATH.sequences.power-sums";
const DI = "MATH.coordinate.distance-intro";
const PA = "MATH.coordinate.polygon-area";
const CT = "MATH.geometry.circle-theorems";
// supporting competencies (steps and explanations)
const INTADD = "MATH.number.integer-add";
const IMUL = "MATH.number.integer-multiply";
const EXP = "MATH.number.exponents";
const IDN = "MATH.algebra.identities";
const FAC = "MATH.algebra.factorisation";
const SURD = "MATH.number.radicals";
const LIN = "MATH.algebra.linear-equations";
const PYTH = "MATH.geometry.pythagoras";
const CART = "MATH.coordinate.cartesian";
const TRI = "MATH.geometry.triangle-properties";
const SQRT = "MATH.number.square-roots";
const SIMP = "MATH.algebra.algebra-simplify";
const TAREA = "MATH.measurement.triangle-area";

const none = () => null;
const NAMES = ["Anu", "Ravi", "Meena", "Arjun", "Kavya", "Imran", "Divya", "Karthik", "Priya", "Selvi"];
const nm = (k: number) => NAMES[((k % NAMES.length) + NAMES.length) % NAMES.length];
/** A whole number as printed: − for minus. */
const N = (v: number) => (v < 0 ? `−${-v}` : String(v));
/** A rational number as printed: 3/2, −1/4. */
const Q = (v: number) => {
  const s = fmt(v);
  return s.startsWith("-") ? `−${s.slice(1)}` : s;
};
/** A sum of terms [coefficient, letter part]: "2x − y + 3". */
function lin(terms: [number, string][]): string {
  let out = "";
  for (const [c, v] of terms) {
    if (c === 0) continue;
    const a = Math.abs(c);
    const body = `${a === 1 && v ? "" : a}${v}`;
    out = out ? `${out} ${c < 0 ? "−" : "+"} ${body}` : `${c < 0 ? "−" : ""}${body}`;
  }
  return out || "0";
}
/** A polynomial from its coefficients, highest power first: [2, 0, −3, 1] → "2x³ − 3x + 1". */
const pl = (cs: number[], v = "x") => lin(cs.map((c, i) => [c, cs.length - 1 - i === 0 ? "" : cs.length - 1 - i === 1 ? v : `${v}${sup(cs.length - 1 - i)}`]));
const tup = (...vs: number[]) => `(${vs.map(Q).join(", ")})`;
const inR = (p: number[], r: [number, number][]) => p.length === r.length && p.every((v, i) => Number.isInteger(v) && v >= r[i][0] && v <= r[i][1]);
/** The numbers of a written tuple "(3/2, −1)" (null if not readable). */
function nums(v: Value): number[] | null {
  if (typeof v !== "string") return null;
  const t = v.trim().replace(/^\(/, "").replace(/\)$/, "");
  try {
    const out = t.split(",").map((x) => evaluate(parse(x), {}));
    return out.every(Number.isFinite) ? out : null;
  } catch {
    return null;
  }
}
/** The value of a written expression in x at a point (NaN if not readable). */
function at(v: Value, x: number): number {
  if (typeof v !== "string") return NaN;
  try {
    return evaluate(parse(v), { x });
  } catch {
    return NaN;
  }
}
const num = (v: Value): number => (typeof v === "number" ? v : at(v, 0));
const close = (a: number, b: number) => Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= 1e-7 * Math.max(1, Math.abs(a), Math.abs(b));
const horner = (cs: number[], x: number) => cs.reduce((s, c) => s * x + c, 0);
const mulP = (a: number[], b: number[]) => {
  const out = Array(a.length + b.length - 1).fill(0);
  a.forEach((x, i) => b.forEach((y, j) => (out[i + j] += x * y)));
  return out;
};
const sqfree = (n: number): [number, number] => {
  let k = 1;
  let m = n;
  for (let p = 2; p * p <= m; p++)
    while (m % (p * p) === 0) {
      m /= p * p;
      k *= p;
    }
  return [k, m];
};
/** √n in simplest form: 5√2, 7, 2√3. */
const surd = (n: number) => {
  const [k, m] = sqfree(n);
  return m === 1 ? String(k) : `${k === 1 ? "" : k}√${m}`;
};
const isSq = (n: number) => n >= 0 && Number.isInteger(Math.sqrt(n));
const hsh = (s: string) => {
  let x = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) x = Math.imul(x ^ s.charCodeAt(i), 0x01000193) >>> 0;
  return x;
};
/** A fixed order of n options for these parameters (so the right letter moves from problem to problem). */
const perm = (p: number[], n: number) => [...Array(n).keys()].map((i) => ({ i, k: hsh(`${p.join(",")}#${i}`) })).sort((a, b) => a.k - b.k).map((o) => o.i);
const B = (id: string, kind: Bug["kind"], competency: string, says: string, predict: Value | null): Bug => ({ id, kind, competency, says, predict });
const keepBugs = (bs: Bug[]) => bs.filter((b) => b.predict !== null && !(Array.isArray(b.predict) && b.predict.length === 0));
const st = (id: string, op: string, competency: string, inputs: (number | string)[], value: Value): Step => ({ id, op, competency, inputs, value });
/** ax + by = c as printed. */
const eq2 = (a: number, b: number, c: number) => `${lin([[a, "x"], [b, "y"]])} = ${N(c)}`;
const eq3 = (r: number[], c: number) => `${lin([[r[0], "x"], [r[1], "y"], [r[2], "z"]])} = ${N(c)}`;
const deg = (d: number) => `${d}°`;

// ---------------------------------------------------------------- geometry helpers (independent numerical checks)
type P2 = [number, number];
const onCircle = (d: number): P2 => [Math.cos((d * Math.PI) / 180), Math.sin((d * Math.PI) / 180)];
const angleAt = (v: P2, p: P2, q: P2) => {
  const u = [p[0] - v[0], p[1] - v[1]];
  const w = [q[0] - v[0], q[1] - v[1]];
  const c = (u[0] * w[0] + u[1] * w[1]) / (Math.hypot(u[0], u[1]) * Math.hypot(w[0], w[1]));
  return (Math.acos(Math.max(-1, Math.min(1, c))) * 180) / Math.PI;
};
const cross = (o: P2, a: P2, b: P2) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
/** Area of a lattice triangle by Pick's theorem: count the lattice points inside and on the edges. */
function pickArea(t: P2[]): number {
  let bd = 0;
  for (let i = 0; i < 3; i++) bd += gcd(Math.abs(t[(i + 1) % 3][0] - t[i][0]), Math.abs(t[(i + 1) % 3][1] - t[i][1]));
  let inside = 0;
  const xs = t.map((p) => p[0]);
  const ys = t.map((p) => p[1]);
  for (let x = Math.min(...xs); x <= Math.max(...xs); x++)
    for (let y = Math.min(...ys); y <= Math.max(...ys); y++) {
      const s = [cross(t[0], t[1], [x, y]), cross(t[1], t[2], [x, y]), cross(t[2], t[0], [x, y])];
      if (s.every((v) => v > 0) || s.every((v) => v < 0)) inside++;
    }
  return inside + bd / 2 - 1;
}

// ---------------------------------------------------------------- fixed data
/** Coefficient rows for systems in three variables (each has a non-zero determinant; checked by `reject`). */
const M3: number[][][] = [
  [[1, 1, 1], [1, -1, 1], [1, 1, -1]],
  [[1, 2, 1], [2, 1, -1], [1, -1, 2]],
  [[2, 1, -1], [1, -1, 2], [1, 1, 1]],
  [[1, 1, 2], [2, -1, 1], [3, 1, -1]],
  [[1, -2, 1], [2, 1, -1], [1, 1, 1]],
  [[3, -1, 1], [1, 1, 1], [2, 1, -2]],
  [[1, 1, 0], [0, 1, 1], [1, 0, 1]],
  [[2, -1, 1], [1, 2, -1], [1, 1, 1]],
];
const det3 = (m: number[][]) => m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);

const FACTS = [
  "The angle an arc makes at the centre is twice the angle it makes at any point on the rest of the circle.",
  "Angles in the same segment of a circle are equal.",
  "The angle in a semicircle is a right angle.",
  "Opposite angles of a cyclic quadrilateral add up to 180°.",
  "The perpendicular from the centre of a circle to a chord bisects the chord.",
  "Equal chords of a circle are equidistant from the centre.",
  "Opposite angles of a cyclic quadrilateral are equal.",
  "Angles in the same segment of a circle add up to 180°.",
];
/** For each fact: the right fact, then the other options (fact indices); the first wrong one is the usual mix-up. */
const THEO: number[][] = [
  [0, 1, 2, 3],
  [1, 0, 7, 3],
  [2, 1, 3, 5],
  [3, 6, 1, 0],
  [4, 5, 2, 0],
  [5, 4, 1, 2],
];
/** The words that identify each fact among the options (used by the independent check). */
const THEO_KEY = ["twice", "same segment of a circle are equal", "semicircle", "add up to 180", "bisects", "equidistant"];
/** Situations: the fact a step uses, the step itself for a number x (20–80), and for cyclic quadrilaterals the given
 * angle (never 90°: then the opposite angles would also be equal, and a wrong option would fit too). */
const SITS: { f: number; t: (x: number) => string; given?: (x: number) => number }[] = [
  // the angle at the centre is twice the angle at the circumference
  { f: 0, t: (x) => `O is the centre of a circle and A, B, C lie on it, with C on the major arc AB. We know ∠AOB = ${2 * x}°, and we write ∠ACB = ${x}°.` },
  { f: 0, t: (x) => `O is the centre of a circle and P, Q, R lie on it, with R on the major arc PQ. We know ∠PRQ = ${x}°, and we write ∠POQ = ${2 * x}°.` },
  { f: 0, t: (x) => `Triangle ABC is drawn with all three vertices on a circle whose centre is O, and ∠BAC = ${x}°. We write ∠BOC = ${2 * x}°.` },
  { f: 0, t: (x) => `The chord XY of a circle with centre O makes ∠XOY = ${2 * x}° at the centre. Z is a point on the major arc XY, and we write ∠XZY = ${x}°.` },
  { f: 0, t: (x) => `K, L, M lie on a circle with centre O, and M is on the major arc KL. Since ∠KML = ${x}°, we write that the radii OK and OL make an angle of ${2 * x}° at O.` },
  { f: 0, t: (x) => `O is the centre of a circle, A and B lie on it, and ∠AOB = ${2 * x}°. For any point P on the major arc AB we write ∠APB = ${x}°.` },
  // angles in the same segment are equal
  { f: 1, t: (x) => `A, B, C, D lie on a circle, with C and D on the same side of the chord AB. We know ∠ACB = ${x}°, and we write ∠ADB = ${x}°.` },
  { f: 1, t: (x) => `P, Q, R, S lie on a circle, with R and S on the same side of the chord PQ. We know ∠PRQ = ${x}°, and we write ∠PSQ = ${x}°.` },
  { f: 1, t: (x) => `The chords AC and BD of a circle cross at E. We know ∠BAC = ${x}°, and we write ∠BDC = ${x}°.` },
  { f: 1, t: (x) => `ABCD is a quadrilateral with its vertices on a circle, and its diagonals are drawn. We know ∠CAD = ${x}°, and we write ∠CBD = ${x}°.` },
  { f: 1, t: (x) => `X and Y are two points on a circle, and P, Q, R are three more points on the major arc XY. We know ∠XPY = ${x}°, and we write ∠XQY = ∠XRY = ${x}°.` },
  { f: 1, t: (x) => `Two triangles ABK and ABL are drawn with K and L on a circle through A and B, both on the same side of AB. We know ∠AKB = ${x}°, and we write ∠ALB = ${x}°.` },
  // the angle in a semicircle
  { f: 2, t: (x) => `AB is a diameter of a circle and C is another point on the circle. We write ∠ACB = 90°, so ∠CAB = ${90 - x}° when ∠CBA = ${x}°.` },
  { f: 2, t: (x) => `PQ is a diameter of a circle with centre O, and R is another point on the circle with ∠RPQ = ${x}°. We write ∠PRQ = 90°, so ∠RQP = ${90 - x}°.` },
  { f: 2, t: (x) => `Triangle XYZ has all its vertices on a circle, and its side XY passes through the centre. ∠YXZ = ${x}°, and we write ∠XZY = 90°.` },
  { f: 2, t: (x) => `AB is a diameter of a circle, and C and D are points on the circle on opposite sides of AB, with ∠CAB = ${x}°. We write ∠ACB = ∠ADB = 90°.` },
  { f: 2, t: (x) => `KL is a diameter of a circle, ${2 * x} mm long, and M is another point on the circle. We write ∠KML = 90°, so KM² + ML² = ${4 * x * x} mm².` },
  { f: 2, t: (x) => `AC is a diameter of a circle and B is a point on the circle with ∠BCA = ${x}°. We write ∠ABC = 90°.` },
  // opposite angles of a cyclic quadrilateral
  { f: 3, given: (x) => x + 40, t: (x) => `ABCD is a cyclic quadrilateral with ∠DAB = ${x + 40}°. We write ∠BCD = ${140 - x}°.` },
  { f: 3, given: (x) => x + 25, t: (x) => `PQRS is a cyclic quadrilateral with ∠PQR = ${x + 25}°. We write ∠PSR = ${155 - x}°.` },
  { f: 3, given: (x) => x + 30, t: (x) => `All four vertices of the quadrilateral KLMN lie on a circle, and ∠K = ${x + 30}°. We write ∠M = ${150 - x}°.` },
  { f: 3, given: (x) => 2 * x, t: (x) => `ABCD is a cyclic quadrilateral with ∠ABC = ${2 * x}°. We write ∠ADC = ${180 - 2 * x}°.` },
  { f: 3, given: (x) => x + 50, t: (x) => `Four lamp posts W, X, Y, Z stand in that order on a circular path. ∠WXY = ${x + 50}°, and we write ∠WZY = ${130 - x}°.` },
  { f: 3, given: (x) => x + 10, t: (x) => `In the cyclic quadrilateral EFGH, ∠EFG = ${x + 10}°. We write ∠GHE = ${170 - x}°.` },
  // the perpendicular from the centre bisects a chord
  { f: 4, t: (x) => `O is the centre of a circle and OM is perpendicular to the chord AB, with M on AB. AB = ${2 * x} mm, and we write AM = ${x} mm.` },
  { f: 4, t: (x) => `O is the centre of a circle, and a line from O meets the chord PQ at N at right angles. PN = ${x} mm, and we write NQ = ${x} mm.` },
  { f: 4, t: (x) => `In a circle with centre O, OD is perpendicular to the chord AB, with D on AB, and AD = ${x} mm. We write AB = ${2 * x} mm.` },
  { f: 4, t: (x) => `The radius OC of a circle with centre O cuts the chord AB at right angles at E. AE = ${x} mm, and we write EB = ${x} mm.` },
  { f: 4, t: (x) => `The chord KL of a circle with centre O is ${2 * x} mm long, and OP is perpendicular to KL with P on KL. We write KP = ${x} mm, ready to use Pythagoras in triangle OPK.` },
  { f: 4, t: (x) => `O is the centre of a circle and OF is perpendicular to the chord GH, with F on GH. GF = ${x} mm, so we write that F is the midpoint of GH and GH = ${2 * x} mm.` },
  // equal chords are equidistant from the centre
  { f: 5, t: (x) => `In a circle with centre O, the chords AB and CD are both ${x} mm long. AB is ${Math.floor(x / 4)} mm from O, and we write that CD is also ${Math.floor(x / 4)} mm from O.` },
  { f: 5, t: (x) => `The chords PQ and RS of a circle with centre O are each ${x} mm long. The perpendicular from O to PQ is ${Math.floor(x / 3)} mm long, and we write that the perpendicular from O to RS is also ${Math.floor(x / 3)} mm long.` },
  { f: 5, t: (x) => `The chords KL and MN of a circle with centre O are both ${x} mm long. OP is perpendicular to KL and OQ is perpendicular to MN, and we write OP = OQ.` },
  { f: 5, t: (x) => `AB and AC are two chords of a circle with centre O, each ${x} mm long. We write that O is the same distance from AB as from AC.` },
  { f: 5, t: (x) => `Two chords of a circle with centre O have the same length, ${x} mm. One of them is ${Math.floor(x / 5) + 1} mm from O, and we write that the other is ${Math.floor(x / 5) + 1} mm from O as well.` },
  { f: 5, t: (x) => `The chords EF and GH of a circle with centre O are each ${x} mm long, and O is ${Math.floor(x / 4) + 2} mm from EF. We write that GH is ${Math.floor(x / 4) + 2} mm from O too.` },
];
const theoStatement = (s: number, x: number) => SITS[s].t(x);

export const B12: Def[] = [
  // ============================================================ polynomials: multiply, divide
  {
    id: "alpmul",
    arity: 5,
    title: "Multiplying a binomial by a trinomial",
    competency: POLY,
    type: "tuple",
    mc: true,
    // [a, b, c, d, e]: (ax + b)(cx² + dx + e)
    parse: none,
    reject: (p) => (!inR(p, [[1, 4], [-6, 6], [1, 3], [-5, 5], [-6, 6]]) || p[1] === 0 || p[4] === 0 ? "(ax + b)(cx² + dx + e) with a 1–4, c 1–3 and small whole b, d, e (b, e not 0)." : null),
    prompt: ([a, b, c, d, e]) => `Multiply (${pl([a, b])})(${pl([c, d, e])}) and simplify. Write the result as px³ + qx² + rx + s and give (p, q, r, s).`,
    solve: ([a, b, c, d, e]) => {
      const r = mulP([a, b], [c, d, e]);
      return {
        steps: [
          st("first", "multiply", POLY, [pl([a, 0]), pl([c, d, e])], pl([a * c, a * d, a * e, 0])),
          st("second", "multiply", POLY, [N(b), pl([c, d, e])], pl([b * c, b * d, b * e])),
          st("collect", "add", SIMP, [pl([a * c, a * d, a * e, 0]), pl([b * c, b * d, b * e])], tup(...r)),
        ],
        answer: tup(...r),
      };
    },
    // independent: the cubic with these coefficients must agree with the product at four points (a cubic is fixed by four)
    validate: ([a, b, c, d, e], v) => {
      const t = nums(v);
      return !!t && t.length === 4 && [-2, 0.5, 1.5, 3].every((x) => close(horner(t, x), (a * x + b) * (c * x * x + d * x + e)));
    },
    bugs: ([a, b, c, d, e]) => [
      B("b-times-first-only", "procedural", POLY, `${N(b)} was multiplied by the first term of the second bracket only; every term of the first bracket multiplies every term of the second.`, tup(a * c, a * d + b * c, a * e, 0)),
      B("drop-minus", "procedural", INTADD, `The minus sign of ${N(b)} was lost when multiplying; ${N(b)} × ${N(d === 0 ? e : d)} must carry the sign.`, b < 0 ? tup(...mulP([a, -b], [c, d, e])) : null),
      B("power-not-added", "conceptual", EXP, "x × x² was written as x² (and x × x as x); when you multiply, the powers add: x × x² = x³.", tup(0, a * c + b * c, a * d + a * e + b * d, b * e)),
    ].filter((x) => x.predict !== null),
    distractors: ([a, b, c, d, e]) => [tup(a * c, a * d + b * c, a * e + b * d, -b * e), tup(a * c, a * d - b * c, a * e + b * d, b * e), tup(a + c, a * d + b * c, a * e + b * d, b * e)],
    variants: () => [],
    explain: (s) => (s.id === "first" ? `${s.inputs[0]} × (${s.inputs[1]}) = ${s.value}` : s.id === "second" ? `${s.inputs[0]} × (${s.inputs[1]}) = ${s.value}` : `Add the two rows and collect like terms: the coefficients are ${s.value}`),
    domain: [[1, 4], [-6, 6], [1, 3], [-5, 5], [-6, 6]],
    cap: 400,
    difficulty: ([a, b, c, d]) => (a === 1 && c === 1 && b > 0 ? 1 : b < 0 && d < 0 ? 3 : 2),
    teach: {
      idea: "Multiplication distributes over addition: each term of the first bracket multiplies every term of the second, and when powers of x are multiplied their indices add.",
      method: "Multiply the second bracket by ax, then by b. Write the two rows under each other, power below power, and add like terms.",
      alternatives: [
        { id: "grid", title: "Use a multiplication grid", kind: "procedural", text: ["Draw a grid with ax and b down the side and cx², dx and e along the top.", "Fill each cell with the product of its row and column, then add the cells on each diagonal (they hold the same power of x)."], visual: ([a, b, c, d, e]) => ({ type: "table", head: ["×", pl([c, 0, 0]), pl([d, 0]), N(e)], rows: [[pl([a, 0]), pl([a * c, 0, 0, 0]), pl([a * d, 0, 0]), pl([a * e, 0])], [N(b), pl([b * c, 0, 0]), pl([b * d, 0]), N(b * e)]] }) },
      ],
    },
    word: ([a, b, c, d, e]) => `A rectangular water tank in a school has a base of area (${pl([c, d, e])}) square metres, and the water in it stands (${pl([a, b])}) m deep, where x is a measurement chosen by the engineer (large enough for both to be positive). The volume of water is the base area times the depth. Write the volume as px³ + qx² + rx + s and give (p, q, r, s).`,
    limits: "(ax + b)(cx² + dx + e) with small whole coefficients; the answer is asked as coefficients so that copying the brackets back cannot count as the product.",
  },
  {
    id: "alpdiv",
    arity: 5,
    title: "The quotient when a cubic is divided by x − r",
    competency: POLY,
    type: "exact",
    mc: true,
    // [a, r, q, s, R]: p(x) = (x − r)(ax² + qx + s) + R
    parse: none,
    reject: (p) => (!inR(p, [[1, 3], [-4, 4], [-6, 6], [-9, 9], [-9, 9]]) || p[1] === 0 ? "A cubic with small whole coefficients divided by x − r, r from −4 to 4 (not 0)." : null),
    prompt: ([a, r, q, s, R]) => `Divide p(x) = ${pl(cubicOf(a, r, q, s, R))} by x ${r < 0 ? "+" : "−"} ${Math.abs(r)}. What is the quotient?`,
    solve: ([a, r, q, s, R]) => {
      const P = cubicOf(a, r, q, s, R);
      return {
        steps: [
          st("bring", "copy", POLY, [P[0]], a),
          st("second", "multiply-add", IMUL, [r, a, P[1]], q),
          st("third", "multiply-add", IMUL, [r, q, P[2]], s),
          st("remainder", "multiply-add", IMUL, [r, s, P[3]], R),
          st("quotient", "write", POLY, [a, q, s], pl([a, q, s])),
        ],
        answer: pl([a, q, s]),
      };
    },
    // independent: p(x) − (x − r)·Q(x) must be the same number at six points (a constant remainder)
    validate: ([a, r, q, s, R], v) => {
      const P = cubicOf(a, r, q, s, R);
      const xs = [-2.3, -0.7, 0.4, 1.1, 2.6, 3.9];
      const ds = xs.map((x) => horner(P, x) - (x - r) * at(v, x));
      return ds.every((d) => close(d, ds[0]));
    },
    bugs: ([a, r, q, s, R]) => {
      const P = cubicOf(a, r, q, s, R);
      const syn = (k: number) => {
        const b1 = P[1] + k * a;
        return pl([a, b1, P[2] + k * b1]);
      };
      const nz = P.filter((c) => c !== 0);
      return [
        B("sign-of-r", "procedural", FT, `The number ${N(-r)} was used in the division; dividing by x ${r < 0 ? "+" : "−"} ${Math.abs(r)} uses ${N(r)} (the value that makes x ${r < 0 ? "+" : "−"} ${Math.abs(r)} zero).`, syn(-r)),
        B("no-placeholder", "procedural", POLY, "A missing power of x was skipped; write 0 for it so each column keeps its own power.", (P[1] === 0 || P[2] === 0) && P[3] !== 0 && nz.length === 3 ? pl([nz[0], nz[1] + r * nz[0]]) : null),
        B("remainder-in-quotient", "conceptual", POLY, "The last number of the bottom row is the remainder, not part of the quotient; the quotient has one power less than p(x).", R !== 0 ? pl([a, q, s, R]) : null),
      ].filter((x) => x.predict !== null);
    },
    distractors: ([a, , q, s]) => [pl([a, q, s + 1]), pl([a, -q, s]), pl([a, q, -s - 1]), pl([a, q + 1, s])],
    variants: () => [],
    explain: (s) =>
      s.id === "bring" ? `Bring down the first coefficient: ${s.value}` : s.id === "quotient" ? `The quotient is ${s.value}` : s.id === "remainder" ? `${N(Number(s.inputs[0]))} × ${N(Number(s.inputs[1]))} + ${N(Number(s.inputs[2]))} = ${N(Number(s.value))}: this last number is the remainder` : `${N(Number(s.inputs[0]))} × ${N(Number(s.inputs[1]))} + ${N(Number(s.inputs[2]))} = ${N(Number(s.value))}`,
    domain: [[1, 3], [-4, 4], [-6, 6], [-9, 9], [-9, 9]],
    cap: 400,
    difficulty: ([a, r, , , R]) => (a === 1 && r > 0 && R === 0 ? 1 : a === 1 || r > 0 ? 2 : 3),
    teach: {
      idea: "Dividing by x − r leaves p(x) = (x − r) × quotient + remainder; synthetic division finds the quotient's coefficients one at a time.",
      method: "Write the coefficients of p(x) (0 for a missing power). Bring down the first; multiply by r and add to the next, again and again. The last number is the remainder; the others are the quotient.",
      alternatives: [
        { id: "long", title: "Long division", kind: "procedural", text: ["Divide the first term of p(x) by x to get the first term of the quotient; multiply x − r by it and subtract.", "Repeat with what is left until only a number remains: that is the remainder."] },
      ],
    },
    limits: "Cubics divided by a monic linear divisor x − r; division by ax + b and by quadratics is in the division-algorithm family.",
  },
  // ============================================================ remainder and factor theorems
  {
    id: "alrem",
    arity: 5,
    title: "The remainder theorem",
    competency: FT,
    type: "integer",
    mc: true,
    // [a, b, c, d, r]: p(x) = ax³ + bx² + cx + d divided by x − r
    parse: none,
    reject: (p) => (!inR(p, [[1, 3], [-6, 6], [-6, 6], [-9, 9], [-3, 3]]) || p[4] === 0 ? "A cubic with small whole coefficients divided by x − r, r from −3 to 3 (not 0)." : null),
    prompt: ([a, b, c, d, r]) => `Find the remainder when p(x) = ${pl([a, b, c, d])} is divided by x ${r < 0 ? "+" : "−"} ${Math.abs(r)}.`,
    solve: ([a, b, c, d, r]) => ({
      steps: [
        st("zero", "solve", LIN, [r], r),
        st("cube", "evaluate", EXP, [r, 3], r ** 3),
        st("square", "evaluate", EXP, [r, 2], r ** 2),
        st("substitute", "evaluate", FT, [a, b, c, d, r], a * r ** 3 + b * r * r + c * r + d),
      ],
      answer: a * r ** 3 + b * r * r + c * r + d,
    }),
    // independent: synthetic division (Horner's scheme), whose last number is the remainder
    validate: ([a, b, c, d, r], v) => v === horner([a, b, c, d], r),
    bugs: ([a, b, c, d, r]) => [
      B("sign-of-r", "procedural", FT, `p(${N(-r)}) was found; the remainder on dividing by x ${r < 0 ? "+" : "−"} ${Math.abs(r)} is p(${N(r)}), the value that makes the divisor zero.`, horner([a, b, c, d], -r)),
      B("constant-term", "conceptual", FT, "The constant term was taken as the remainder; that is only the value of p(0).", d),
      B("cube-of-negative", "prerequisite", EXP, `(${N(r)})³ was taken as positive; a negative number cubed stays negative.`, r < 0 ? a * -(r ** 3) + b * r * r + c * r + d : null),
    ].filter((x) => x.predict !== null),
    variants: () => [],
    explain: (s) => (s.id === "zero" ? `x − (${N(Number(s.inputs[0]))}) = 0 when x = ${N(Number(s.value))}` : s.id === "cube" ? `(${N(Number(s.inputs[0]))})³ = ${N(Number(s.value))}` : s.id === "square" ? `(${N(Number(s.inputs[0]))})² = ${N(Number(s.value))}` : `The remainder is p(${N(Number(s.inputs[4]))}) = ${N(Number(s.value))}`),
    domain: [[1, 3], [-6, 6], [-6, 6], [-9, 9], [-3, 3]],
    cap: 400,
    difficulty: ([a, , , , r]) => (r > 0 && a === 1 ? 1 : r > 0 || r === -1 ? 2 : 3),
    teach: {
      idea: "p(x) = (x − r) × quotient + remainder. Put x = r: the first part becomes 0, so the remainder is p(r).",
      method: "Find the value of x that makes the divisor zero, substitute it into p(x), and work out the powers carefully with their signs.",
      alternatives: [
        { id: "synthetic", title: "Synthetic division", kind: "procedural", text: ["Write the coefficients, bring down the first, multiply by r and add to the next, and so on.", "The last number you get is the remainder: the same number as p(r)."] },
      ],
    },
    word: ([a, b, c, d, r]) => `A shop's spreadsheet models its stock (in boxes) by p(x) = ${pl([a, b, c, d])}. To check one value, ${nm(a + d)} divides p(x) by x ${r < 0 ? "+" : "−"} ${Math.abs(r)} by long division and keeps only the remainder. What remainder does ${nm(a + d)} get? (Find it without doing the long division.)`,
    limits: "Cubic polynomials divided by x − r with small whole r; divisors ax − b are not here.",
  },
  {
    id: "alfack",
    arity: 5,
    title: "Finding k so that x − r is a factor",
    competency: FT,
    type: "integer",
    mc: true,
    // [m, a, b, c, r]: m = 0: ax³ + bx² + cx + k; m = 1: ax³ + bx² + kx + c
    parse: none,
    reject: (p) => {
      if (!inR(p, [[0, 1], [1, 3], [-6, 6], [-9, 9], [-3, 3]]) || p[4] === 0) return "A cubic with one unknown coefficient k and a factor x − r, r from −3 to 3 (not 0).";
      const [m, a, b, c, r] = p;
      return m === 1 && (c === 0 || (a * r ** 3 + b * r * r + c) % r !== 0) ? "For an unknown x-coefficient, k must come out a whole number and the constant must not be 0." : null;
    },
    prompt: ([m, a, b, c, r]) => `For which value of k is x ${r < 0 ? "+" : "−"} ${Math.abs(r)} a factor of ${m === 0 ? `${pl([a, b, c, 0])} + k` : `${pl([a, b, 0, 0])} + kx ${c < 0 ? "−" : "+"} ${Math.abs(c)}`}?`,
    solve: ([m, a, b, c, r]) => {
      const known = m === 0 ? a * r ** 3 + b * r * r + c * r : a * r ** 3 + b * r * r + c;
      const k = m === 0 ? -known : -known / r;
      return { steps: [st("substitute", "evaluate", FT, [r], known), st("solve", "solve", LIN, [known, m === 0 ? 1 : r], k)], answer: k };
    },
    // independent: put k back and divide by x − r synthetically; the remainder must be 0
    validate: ([m, a, b, c, r], v) => typeof v === "number" && horner(m === 0 ? [a, b, c, v] : [a, b, v, c], r) === 0,
    bugs: ([m, a, b, c, r]) => {
      const kOf = (t: number) => {
        const known = m === 0 ? a * t ** 3 + b * t * t + c * t : a * t ** 3 + b * t * t + c;
        const k = m === 0 ? -known : -known / t;
        return Number.isInteger(k) ? k : null;
      };
      const k = kOf(r)!;
      return [
        B("sign-of-r", "procedural", FT, `x = ${N(-r)} was substituted; x ${r < 0 ? "+" : "−"} ${Math.abs(r)} is a factor when p(${N(r)}) = 0.`, kOf(-r)),
        B("sign-moving", "procedural", LIN, "The known part was moved to the other side without changing its sign; p(r) = 0 gives k = −(the rest).", k !== 0 ? -k : null),
      ].filter((x) => x.predict !== null);
    },
    variants: () => [],
    explain: (s) => (s.id === "substitute" ? `Put x = ${N(Number(s.inputs[0]))}: the known terms add up to ${N(Number(s.value))}` : `For a factor the remainder is 0: ${N(Number(s.inputs[0]))} + ${s.inputs[1] === 1 ? "k" : `${N(Number(s.inputs[1]))}k`} = 0, so k = ${N(Number(s.value))}`),
    domain: [[0, 1], [1, 3], [-6, 6], [-9, 9], [-3, 3]],
    cap: 300,
    difficulty: ([m, , , , r]) => (m === 0 && r > 0 ? 1 : m === 0 || r > 0 ? 2 : 3),
    teach: {
      idea: "x − r is a factor of p(x) exactly when p(r) = 0 (the factor theorem).",
      method: "Substitute x = r into p(x), keeping k as a letter; set the result equal to 0 and solve for k.",
      alternatives: [
        { id: "synthetic", title: "Make the remainder zero", kind: "procedural", text: ["Do synthetic division by r with k left as a letter.", "The last number contains k: it must be 0, which gives k."] },
      ],
    },
    limits: "Cubics with one unknown coefficient (constant or x-term) and a factor x − r with small r.",
  },
  {
    id: "alcub",
    arity: 3,
    title: "All the zeros of a cubic, by the factor theorem",
    competency: FT,
    type: "set",
    // [r1, r2, r3]: (x − r1)(x − r2)(x − r3) expanded, r1 < r2 < r3
    parse: none,
    reject: (p) => (!inR(p, [[-5, 5], [-5, 5], [-5, 5]]) || !(p[0] < p[1] && p[1] < p[2]) ? "Three different whole-number zeros from −5 to 5." : null),
    prompt: (r) => `Factorise p(x) = ${pl(cubicFrom(r))} and find all its zeros. Enter them separated by commas.`,
    solve: ([r1, r2, r3]) => {
      const P = cubicFrom([r1, r2, r3]);
      return {
        steps: [
          st("try", "evaluate", FT, [r1], 0),
          st("divide", "divide", POLY, [pl(P), r1], pl(mulP([1, -r2], [1, -r3]))),
          st("factorise", "factorise", FAC, [pl(mulP([1, -r2], [1, -r3]))], `(${pl([1, -r2])})(${pl([1, -r3])})`),
          st("zeros", "solve", FT, [r1, r2, r3], [r1, r2, r3]),
        ],
        answer: [r1, r2, r3],
      };
    },
    // independent: substitute each answer into p(x)
    validate: (r, v) => Array.isArray(v) && v.length === 3 && new Set(v).size === 3 && v.every((x) => horner(cubicFrom(r), x) === 0),
    bugs: ([r1, r2, r3]) => [
      B("bracket-signs", "procedural", FT, "The numbers in the brackets were taken as the zeros; x − 2 = 0 gives x = 2, so each sign flips.", [-r3, -r2, -r1]),
      B("stop-at-one", "procedural", FAC, "Only the zero found by trial was given; after dividing, the quadratic quotient gives the other two.", null),
    ],
    variants: () => [],
    explain: (s) => (s.id === "try" ? `p(${N(Number(s.inputs[0]))}) = 0, so x − (${N(Number(s.inputs[0]))}) is a factor` : s.id === "divide" ? `Divide by it: the quotient is ${s.value}` : s.id === "factorise" ? `${s.inputs[0]} = ${s.value}` : `The zeros are ${(s.value as number[]).map(N).join(", ")}`),
    domain: [[-5, 5], [-5, 5], [-5, 5]],
    difficulty: ([r1, r2, r3]) => ([r1, r2, r3].includes(1) || [r1, r2, r3].includes(-1) ? 1 : [r1, r2, r3].includes(0) ? 2 : 3),
    teach: {
      idea: "If p(a) = 0 then x − a is a factor; a whole-number zero of a polynomial with leading coefficient 1 must divide the constant term.",
      method: "Try divisors of the constant term (±1 first) until p(a) = 0. Divide p(x) by x − a, factorise the quadratic quotient, and read off all three zeros.",
      alternatives: [
        { id: "coefficient-sum", title: "Quick tests for 1 and −1", kind: "procedural", text: ["If the coefficients add up to 0, then p(1) = 0 and x − 1 is a factor.", "If the coefficients of the even powers add up to those of the odd powers, then p(−1) = 0 and x + 1 is a factor."] },
      ],
    },
    limits: "Monic cubics with three different whole-number zeros from −5 to 5; repeated zeros and non-monic cubics are not here.",
  },
  // ============================================================ linear rules and equations in two variables
  {
    id: "alrule",
    arity: 3,
    title: "The straight-line rule behind a table",
    competency: L2,
    type: "exact",
    mc: true,
    // [a, b, s]: y = ax + b for x = s … s + 4
    parse: none,
    reject: (p) => (!inR(p, [[-6, 6], [-10, 10], [0, 2]]) || p[0] === 0 ? "A rule y = ax + b with a from −6 to 6 (not 0), b from −10 to 10, and a table starting at x = 0, 1 or 2." : null),
    prompt: () => `The table in the picture shows pairs (x, y) that follow one straight-line rule. Write the expression in x that gives y (just the expression in x, without "y =").`,
    solve: ([a, b, s]) => ({
      steps: [
        st("step", "subtract", INTADD, [s * a + b + a, s * a + b], a),
        st("start", "subtract", INTADD, [s * a + b, s, a], b),
        st("rule", "write", L2, [a, b], pl([a, b])),
      ],
      answer: pl([a, b]),
    }),
    // independent: the rule must give every y in the table, and the value ten steps on found by adding the step ten times
    validate: ([a, b, s], v) => {
      const ys = [0, 1, 2, 3, 4].map((i) => a * (s + i) + b);
      let far = ys[4];
      for (let i = 0; i < 10; i++) far += ys[1] - ys[0];
      return ys.every((y, i) => close(at(v, s + i), y)) && close(at(v, s + 14), far);
    },
    bugs: ([a, b, s]) => [
      B("first-value-as-start", "conceptual", L2, `The first y in the table was taken as the starting value, but the table starts at x = ${s}; the starting value is y when x = 0.`, s !== 0 ? pl([a, a * s + b]) : null),
      B("step-only", "procedural", L2, "Only the step was used; the rule also needs the value of y when x = 0.", b !== 0 ? pl([a, 0]) : null),
      B("step-sign", "procedural", INTADD, "The values go down, so the step is negative; the sign of the step was lost.", a < 0 ? pl([-a, b]) : null),
    ].filter((x) => x.predict !== null),
    distractors: ([a, b]) => [pl([a, b + a]), pl([a + 1, b]), pl([b === 0 ? a + 2 : b, a]), pl([a, -b - 1])],
    variants: () => [],
    explain: (s) => (s.id === "step" ? `Each time x goes up by 1, y changes by ${N(Number(s.value))}` : s.id === "start" ? `Go back to x = 0: y = ${N(Number(s.value))}` : `So y = ${s.value}`),
    figure: ([a, b, s]) => ({ type: "table", head: ["x", ...[0, 1, 2, 3, 4].map((i) => N(s + i))], rows: [["y", ...[0, 1, 2, 3, 4].map((i) => N(a * (s + i) + b))]] }),
    domain: [[-6, 6], [-10, 10], [0, 2]],
    cap: 300,
    difficulty: ([a, b, s]) => (s === 0 && a > 0 ? 1 : a > 0 || b >= 0 ? 2 : 3),
    word: ([a, b, s]) => `${nm(a + b)} records the temperature y (in °C) of a liquid x minutes after starting an experiment: ${[0, 1, 2, 3, 4].map((i) => `after ${s + i} min it is ${N(a * (s + i) + b)} °C`).join("; ")}. The temperature changes steadily. Write the expression in x that gives y (just the expression, without "y =").`,
    teach: {
      idea: "When y changes by the same amount each time x goes up by 1, the rule is y = (step) × x + (value of y at x = 0).",
      method: "Find the step from two neighbouring values. Work back to x = 0 to find the starting value. Check your rule with one more pair from the table.",
      alternatives: [
        { id: "graph", title: "Plot the points", kind: "conceptual", text: ["Plot the pairs on squared paper: they lie on one straight line.", "The line rises (or falls) by the step for each 1 across, and crosses the y-axis at the starting value."], visual: ([a, b, s]) => ({ type: "plane", points: [0, 1, 2, 3, 4].map((i) => [s + i, a * (s + i) + b]), range: Math.max(8, ...[0, 4].map((i) => Math.abs(a * (s + i) + b) + 1)) }) },
      ],
    },
    limits: "Five consecutive whole x values with whole-number steps; tables with gaps in x and fractional steps are not here.",
  },
  {
    id: "alsol2",
    arity: 4,
    title: "Completing a solution of ax + by = c",
    competency: L2,
    type: "integer",
    mc: true,
    // [a, b, c, t]: ax + by = c with x = t
    parse: none,
    reject: (p) => {
      if (!inR(p, [[1, 9], [2, 9], [10, 60], [1, 6]])) return "ax + by = c with a 1–9, b 2–9, c 10–60 and x from 1 to 6.";
      const [a, b, c, t] = p;
      return c - a * t <= 0 || (c - a * t) % b !== 0 ? "y must come out a positive whole number." : null;
    },
    prompt: ([a, b, c, t]) => `(${t}, y) is a solution of the equation ${eq2(a, b, c)}. Find y.`,
    solve: ([a, b, c, t]) => ({ steps: [st("substitute", "multiply", IMUL, [a, t], a * t), st("subtract", "subtract", LIN, [c, a * t], c - a * t), st("divide", "divide", LIN, [c - a * t, b], (c - a * t) / b)], answer: (c - a * t) / b }),
    // independent: substitute the pair back into the equation
    validate: ([a, b, c, t], v) => typeof v === "number" && a * t + b * v === c,
    bugs: ([a, b, c, t]) => [
      B("add-instead", "procedural", LIN, `${a * t} was added to ${c}; it must be taken away from both sides.`, (c + a * t) % b === 0 ? (c + a * t) / b : null),
      B("no-divide", "procedural", LIN, `${b}y = ${c - a * t} was taken as y = ${c - a * t}; divide by ${b} as well.`, c - a * t),
    ].filter((x) => x.predict !== null),
    variants: () => [],
    explain: (s) => (s.id === "substitute" ? `Put x = ${s.inputs[1]}: ${s.inputs[0]} × ${s.inputs[1]} = ${s.value}` : s.id === "subtract" ? `${s.inputs[0]} − ${s.inputs[1]} = ${s.value}, so the y part is ${s.value}` : `y = ${s.inputs[0]} ÷ ${s.inputs[1]} = ${s.value}`),
    domain: [[1, 9], [2, 9], [10, 60], [1, 6]],
    cap: 300,
    difficulty: ([a, b, , t]) => (a * t <= 12 && b <= 5 ? 1 : a * t <= 30 ? 2 : 3),
    word: ([a, b, c, t]) => `Pens cost ₹${a} each and notebooks cost ₹${b} each. ${nm(a + c)} spends exactly ₹${c} and buys ${t} ${t === 1 ? "pen" : "pens"}. How many notebooks does ${nm(a + c)} buy?`,
    teach: {
      idea: "A solution of an equation in two variables is a pair (x, y) that makes it true; choosing x fixes y.",
      method: "Substitute the given x, take that part away from the right side, then divide by the coefficient of y.",
      alternatives: [
        { id: "table", title: "Make a table of solutions", kind: "conceptual", text: ["List x = 0, 1, 2, … and work out y each time.", "Each row is one solution; there are infinitely many, all on one straight line."] },
      ],
    },
    limits: "Positive coefficients and whole-number solutions (a money context); negative and fractional solutions are left to other families.",
  },
  // ============================================================ GCD and LCM of polynomials
  {
    id: "algcd",
    arity: 3,
    title: "GCD of two quadratics",
    competency: GL,
    type: "exact",
    mc: true,
    // [a, b, c]: (x + a)(x + b) and (x + a)(x + c), b < c
    parse: none,
    reject: (p) => (!inR(p, [[-6, 6], [-6, 6], [-6, 6]]) || p.includes(0) || new Set(p).size !== 3 || p[1] >= p[2] ? "(x + a)(x + b) and (x + a)(x + c) with different non-zero a, b, c from −6 to 6." : null),
    prompt: ([a, b, c]) => `Find the GCD of ${pl(mulP([1, a], [1, b]))} and ${pl(mulP([1, a], [1, c]))}.`,
    solve: ([a, b, c]) => ({
      steps: [
        st("factor1", "factorise", FAC, [pl(mulP([1, a], [1, b]))], `(${pl([1, a])})(${pl([1, b])})`),
        st("factor2", "factorise", FAC, [pl(mulP([1, a], [1, c]))], `(${pl([1, a])})(${pl([1, c])})`),
        st("common", "compare", GL, [pl([1, a])], pl([1, a])),
      ],
      answer: pl([1, a]),
    }),
    // independent: the answer must be x − t for a common zero t of both, found by searching −20 … 20, and the only one
    validate: ([a, b, c], v) => {
      const P = mulP([1, a], [1, b]);
      const Qp = mulP([1, a], [1, c]);
      const common = [...Array(41).keys()].map((k) => k - 20).filter((t) => horner(P, t) === 0 && horner(Qp, t) === 0);
      return common.length === 1 && [-1.3, 0.6, 2.2].every((x) => close(at(v, x), x - common[0]));
    },
    bugs: ([a, b, c]) => [
      B("factor-of-one", "conceptual", GL, "A factor of only one of the polynomials was given; the GCD must divide both.", pl([1, b])),
      B("lcm-instead", "conceptual", GL, "Every factor was multiplied together: that is the LCM; the GCD keeps only the factors they share.", pl(mulP(mulP([1, a], [1, b]), [1, c]))),
      B("factor-sign", "procedural", FAC, "A factor was written with the wrong sign; check by expanding the brackets back.", pl([1, -a])),
    ],
    distractors: ([a, b, c]) => [pl([1, c]), pl([1, b + c]), pl([1, a + 1])],
    variants: () => [],
    explain: (s) => (s.id === "common" ? `The factor in both is ${s.value}` : `${s.inputs[0]} = ${s.value}`),
    domain: [[-6, 6], [-6, 6], [-6, 6]],
    cap: 300,
    difficulty: ([a, b, c]) => (a > 0 && b > 0 && c > 0 ? 1 : a > 0 ? 2 : 3),
    teach: {
      idea: "Like the HCF of numbers, the GCD of polynomials is the product of the factors they have in common.",
      method: "Factorise each polynomial completely, then multiply the factors that appear in every one (with the smaller power).",
      alternatives: [
        { id: "zeros", title: "Look for a shared zero", kind: "conceptual", text: ["Each factor x + a belongs to a zero x = −a.", "A value of x that makes both polynomials zero gives a common factor."] },
      ],
    },
    word: ([a, b, c]) => `Two rectangular plots have areas ${pl(mulP([1, a], [1, b]))} and ${pl(mulP([1, a], [1, c]))} square metres, where x is a length in metres large enough for every side to be positive. Each plot's sides are of the form x + (a whole number). The plots are to be fenced with panels of one common length that fits a side of each plot: the greatest such length is the GCD of the two areas. Find it.`,
    limits: "Two monic quadratics with exactly one common linear factor; GCDs of cubics and of three polynomials are in another family.",
  },
  {
    id: "allcm",
    arity: 3,
    title: "LCM of two quadratics",
    competency: GL,
    type: "exact",
    mc: true,
    // [a, b, c]: (x + a)(x + b) and (x + a)(x + c), b < c
    parse: none,
    reject: (p) => (!inR(p, [[-6, 6], [-6, 6], [-6, 6]]) || p.includes(0) || new Set(p).size !== 3 || p[1] >= p[2] ? "(x + a)(x + b) and (x + a)(x + c) with different non-zero a, b, c from −6 to 6." : null),
    prompt: ([a, b, c]) => `Find the LCM of ${pl(mulP([1, a], [1, b]))} and ${pl(mulP([1, a], [1, c]))}. You may leave it as a product of brackets.`,
    solve: ([a, b, c]) => ({
      steps: [
        st("factor1", "factorise", FAC, [pl(mulP([1, a], [1, b]))], `(${pl([1, a])})(${pl([1, b])})`),
        st("factor2", "factorise", FAC, [pl(mulP([1, a], [1, c]))], `(${pl([1, a])})(${pl([1, c])})`),
        st("lcm", "multiply", GL, [pl([1, a]), pl([1, b]), pl([1, c])], `(${pl([1, a])})(${pl([1, b])})(${pl([1, c])})`),
      ],
      answer: `(${pl([1, a])})(${pl([1, b])})(${pl([1, c])})`,
    }),
    // independent: the zeros of either polynomial (found by search) must all be zeros of the answer, which must be the
    // monic cubic through them
    validate: ([a, b, c], v) => {
      const P = mulP([1, a], [1, b]);
      const Qp = mulP([1, a], [1, c]);
      const zs = [...Array(41).keys()].map((k) => k - 20).filter((t) => horner(P, t) === 0 || horner(Qp, t) === 0);
      return zs.length === 3 && [-1.7, 0.3, 1.9, 3.1].every((x) => close(at(v, x), zs.reduce((s, z) => s * (x - z), 1)));
    },
    bugs: ([a, b, c]) => [
      B("product", "conceptual", GL, `The two polynomials were multiplied; the common factor x ${a < 0 ? "−" : "+"} ${Math.abs(a)} is then counted twice. The LCM takes each factor once, with its highest power.`, `(${pl([1, a])})²(${pl([1, b])})(${pl([1, c])})`),
      B("gcd-instead", "conceptual", GL, "The common factor was given; that is the GCD. The LCM must be divisible by both polynomials.", pl([1, a])),
      B("drop-common", "procedural", GL, "The shared factor was left out; the LCM needs every factor of each polynomial.", `(${pl([1, b])})(${pl([1, c])})`),
    ],
    distractors: ([a, b, c]) => [`(${pl([1, -a])})(${pl([1, b])})(${pl([1, c])})`, `(${pl([1, a])})(${pl([1, b + c])})`],
    variants: () => [],
    explain: (s) => (s.id === "lcm" ? `Take every factor once: ${s.value}` : `${s.inputs[0]} = ${s.value}`),
    domain: [[-6, 6], [-6, 6], [-6, 6]],
    cap: 300,
    difficulty: ([a, b, c]) => (a > 0 && b > 0 && c > 0 ? 1 : a > 0 ? 2 : 3),
    teach: {
      idea: "The LCM is the smallest polynomial both divide into: every factor that appears, each with its highest power. GCD × LCM equals the product of the two polynomials.",
      method: "Factorise both. Write down every different factor once (the highest power that appears) and multiply.",
      alternatives: [
        { id: "product-over-gcd", title: "Product divided by the GCD", kind: "procedural", text: ["Multiply the two polynomials as factors.", "Divide by their GCD (cross out the shared factor once): what is left is the LCM."] },
      ],
    },
    limits: "Two monic quadratics with exactly one common linear factor; the answer may be written expanded or as brackets.",
  },
  // ============================================================ rational expressions
  {
    id: "alratl",
    arity: 3,
    title: "A rational expression in lowest terms",
    competency: RATX,
    type: "tuple",
    mc: true,
    // [a, b, c]: (x + a)(x + b) / ((x + a)(x + c))
    parse: none,
    reject: (p) => (!inR(p, [[-6, 6], [-6, 6], [-6, 6]]) || p.includes(0) || new Set(p).size !== 3 ? "(x + a)(x + b) over (x + a)(x + c) with different non-zero a, b, c from −6 to 6." : null),
    prompt: ([a, b, c]) => `Reduce (${pl(mulP([1, a], [1, b]))}) / (${pl(mulP([1, a], [1, c]))}) to its lowest terms. It can be written as (x + p)/(x + q): give (p, q).`,
    solve: ([a, b, c]) => ({
      steps: [
        st("top", "factorise", FAC, [pl(mulP([1, a], [1, b]))], `(${pl([1, a])})(${pl([1, b])})`),
        st("bottom", "factorise", FAC, [pl(mulP([1, a], [1, c]))], `(${pl([1, a])})(${pl([1, c])})`),
        st("cancel", "divide", RATX, [pl([1, a])], `(${pl([1, b])})/(${pl([1, c])})`),
      ],
      answer: tup(b, c),
    }),
    // independent: (x + p)/(x + q) must equal the original fraction at three points
    validate: ([a, b, c], v) => {
      const t = nums(v);
      return !!t && t.length === 2 && [0.37, 1.91, 7.3].every((x) => close((x + t[0]) / (x + t[1]), horner(mulP([1, a], [1, b]), x) / horner(mulP([1, a], [1, c]), x)));
    },
    bugs: ([a, b, c]) => [
      B("zero-for-number", "procedural", FAC, `The zeros were written instead of the numbers in the brackets: x ${b < 0 ? "−" : "+"} ${Math.abs(b)} has p = ${N(b)}, not ${N(-b)}.`, tup(-b, -c)),
      B("cancel-wrong", "conceptual", RATX, "The wrong bracket was cancelled; only a factor that is in both the top and the bottom can be cancelled.", tup(a, c)),
    ],
    distractors: ([a, b, c]) => [tup(c, b), tup(b, a), tup(b + a, c + a)],
    variants: () => [],
    explain: (s) => (s.id === "cancel" ? `Cancel the common factor ${s.inputs[0]}: ${s.value}` : `${s.inputs[0]} = ${s.value}`),
    domain: [[-6, 6], [-6, 6], [-6, 6]],
    cap: 300,
    difficulty: ([a, b, c]) => (a > 0 && b > 0 && c > 0 ? 1 : a > 0 ? 2 : 3),
    teach: {
      idea: "A fraction is unchanged when the top and bottom are divided by the same non-zero factor; only factors (not terms) can be cancelled.",
      method: "Factorise the top and the bottom fully, then cancel the bracket that appears in both.",
      alternatives: [
        { id: "numbers", title: "Check with a number", kind: "conceptual", text: ["Put a value such as x = 1 into the original fraction and into your answer.", "They must give the same value; cancelling x² terms (not factors) fails this test."] },
      ],
    },
    word: ([a, b, c]) => `Two rectangles have areas ${pl(mulP([1, a], [1, b]))} and ${pl(mulP([1, a], [1, c]))} square centimetres, where x is a length large enough for every side to be positive. The ratio of the first area to the second is a fraction in x. Reduce it to lowest terms; it can be written as (x + p)/(x + q): give (p, q).`,
    limits: "Quotients of two monic quadratics sharing one factor; sums and products of rational expressions are in another family. The answer is asked as (p, q) so that the unreduced fraction cannot count.",
  },
  {
    id: "alratx",
    arity: 3,
    title: "Excluded values of a rational expression",
    competency: RATX,
    type: "set",
    // [a, b, c]: (x + a)(x + b) / ((x + a)(x + c))
    parse: none,
    reject: (p) => (!inR(p, [[-6, 6], [-6, 6], [-6, 6]]) || p.includes(0) || new Set(p).size !== 3 ? "(x + a)(x + b) over (x + a)(x + c) with different non-zero a, b, c from −6 to 6." : null),
    prompt: ([a, b, c]) => `For which values of x is (${pl(mulP([1, a], [1, b]))}) / (${pl(mulP([1, a], [1, c]))}) not defined? Enter all of them, separated by commas.`,
    solve: ([a, b, c]) => ({
      steps: [st("bottom", "factorise", FAC, [pl(mulP([1, a], [1, c]))], `(${pl([1, a])})(${pl([1, c])})`), st("zeros", "solve", RATX, [a, c], [-a, -c])],
      answer: [-a, -c],
    }),
    // independent: each answer must make the denominator zero, and there are two different ones
    validate: ([a, , c], v) => Array.isArray(v) && v.length === 2 && v[0] !== v[1] && v.every((x) => horner(mulP([1, a], [1, c]), x) === 0),
    bugs: ([a, b, c]) => [
      B("after-cancel", "conceptual", RATX, `The value was found after cancelling; x = ${N(-a)} still makes the original denominator zero, so it is excluded too.`, [-c]),
      B("numerator", "conceptual", RATX, "The zeros of the numerator were given; the expression is undefined where the DENOMINATOR is zero.", [-a, -b]),
      B("sign", "procedural", FAC, "The numbers in the brackets were given; x + 3 = 0 when x = −3.", [a, c]),
    ],
    variants: () => [],
    explain: (s) => (s.id === "bottom" ? `Denominator: ${s.inputs[0]} = ${s.value}` : `It is zero when x = ${(s.value as number[]).map(N).join(" or x = ")}`),
    domain: [[-6, 6], [-6, 6], [-6, 6]],
    cap: 300,
    difficulty: ([a, b, c]) => (a > 0 && c > 0 ? 1 : b > 0 ? 2 : 3),
    teach: {
      idea: "Division by zero has no meaning, so a rational expression is undefined wherever its denominator is zero, even if a factor later cancels.",
      method: "Factorise the denominator and set each factor equal to zero.",
      alternatives: [
        { id: "try", title: "Test the values", kind: "conceptual", text: ["Put each value you found into the original denominator.", "If it gives 0, the value is excluded; values that only make the top zero are fine."] },
      ],
    },
    limits: "Denominators that are monic quadratics with whole-number zeros.",
  },
  // ============================================================ composition of functions
  {
    id: "alcomp",
    arity: 5,
    title: "Evaluating a composite function",
    competency: FOP,
    type: "integer",
    mc: true,
    // [a, b, c, t, o]: f(x) = ax + b, g(x) = x² + c; o = 0: (f ∘ g)(t), o = 1: (g ∘ f)(t)
    parse: none,
    reject: (p) => (!inR(p, [[-4, 4], [-6, 6], [-6, 6], [-3, 3], [0, 1]]) || p[0] === 0 ? "f(x) = ax + b and g(x) = x² + c with small whole a (not 0), b, c, at x from −3 to 3." : null),
    prompt: ([a, b, c, t, o]) => `f(x) = ${pl([a, b])} and g(x) = ${pl([1, 0, c])}. Find (${o ? "g ∘ f" : "f ∘ g"})(${N(t)}).`,
    solve: ([a, b, c, t, o]) => {
      const inner = o ? a * t + b : t * t + c;
      const outer = o ? inner * inner + c : a * inner + b;
      return { steps: [st("inner", "evaluate", FOP, [o ? "f" : "g", t], inner), st("outer", "evaluate", FOP, [o ? "g" : "f", inner], outer)], answer: outer };
    },
    // independent: write the composite as one polynomial first, then substitute
    validate: ([a, b, c, t, o], v) => v === (o ? horner([a * a, 2 * a * b, b * b + c], t) : horner([a, 0, a * c + b], t)),
    bugs: ([a, b, c, t, o]) => {
      const f = (x: number) => a * x + b;
      const g = (x: number) => x * x + c;
      return [
        B("order", "conceptual", FOP, `The functions were used in the wrong order; (${o ? "g ∘ f" : "f ∘ g"})(x) means ${o ? "g(f(x)): f first" : "f(g(x)): g first"}, then the other.`, o ? f(g(t)) : g(f(t))),
        B("product", "conceptual", FOP, "f(x) and g(x) were multiplied; composition puts the output of one function into the other.", f(t) * g(t)),
      ];
    },
    variants: () => [],
    explain: (s) => (s.id === "inner" ? `First ${s.inputs[0]}(${N(Number(s.inputs[1]))}) = ${N(Number(s.value))}` : `Then ${s.inputs[0]}(${N(Number(s.inputs[1]))}) = ${N(Number(s.value))}`),
    domain: [[-4, 4], [-6, 6], [-6, 6], [-3, 3], [0, 1]],
    cap: 400,
    difficulty: ([a, , , t, o]) => (o === 0 && a > 0 && t >= 0 ? 1 : o === 0 || t >= 0 ? 2 : 3),
    teach: {
      idea: "(f ∘ g)(x) = f(g(x)): the output of g becomes the input of f. The order matters.",
      method: "Work from the inside out: find the inner function's value at the number, then put that value into the outer function.",
      alternatives: [
        { id: "machines", title: "Two machines in a row", kind: "conceptual", text: ["Think of g and f as machines: a number goes into the first, and what comes out goes into the second.", "For f ∘ g, the number goes into g first (the one nearest the bracket)."] },
      ],
    },
    word: ([a, b, c, t, o]) => (o === 0 ? `In a factory, machine G changes a setting x into x² ${c < 0 ? "−" : "+"} ${Math.abs(c)}, and machine F changes a number y into ${pl([a, b], "y")}. A setting of ${N(t)} is fed into G, and G's output is fed straight into F. What number comes out of F?` : `In a factory, machine F changes a setting x into ${pl([a, b])}, and machine G changes a number y into y² ${c < 0 ? "−" : "+"} ${Math.abs(c)}. A setting of ${N(t)} is fed into F, and F's output is fed straight into G. What number comes out of G?`),
    limits: "A linear function composed with x² + c, evaluated at a whole number.",
  },
  {
    id: "alcompx",
    arity: 4,
    title: "The composite of two linear functions",
    competency: FOP,
    type: "exact",
    mc: true,
    // [a, b, c, d]: f(x) = ax + b, g(x) = cx + d; find (f ∘ g)(x)
    parse: none,
    reject: (p) => (!inR(p, [[-5, 5], [-6, 6], [-5, 5], [-6, 6]]) || p[0] === 0 || p[2] === 0 || (p[0] === p[2] && p[1] === p[3]) || p[1] * (p[2] - 1) === p[3] * (p[0] - 1) ? "Two different linear functions with small whole coefficients whose compositions in the two orders differ." : null),
    prompt: ([a, b, c, d]) => `f(x) = ${pl([a, b])} and g(x) = ${pl([c, d])}. Find (f ∘ g)(x) and simplify.`,
    solve: ([a, b, c, d]) => ({ steps: [st("substitute", "substitute", FOP, [pl([c, d])], `${N(a)}(${pl([c, d])}) ${b < 0 ? "−" : "+"} ${Math.abs(b)}`), st("expand", "expand", SIMP, [a, c, d, b], pl([a * c, a * d + b]))], answer: pl([a * c, a * d + b]) }),
    // independent: compare with f(g(x)) worked out numerically at three points
    validate: ([a, b, c, d], v) => [-1.4, 0.8, 2.7].every((x) => close(at(v, x), a * (c * x + d) + b)),
    bugs: ([a, b, c, d]) => [
      B("order", "conceptual", FOP, "g(f(x)) was found; (f ∘ g)(x) = f(g(x)) puts g(x) into f.", pl([a * c, c * b + d])),
      B("constants-added", "procedural", SIMP, `Only the x term was multiplied by ${N(a)}; the whole of g(x), including ${N(d)}, is multiplied.`, d !== 0 ? pl([a * c, b + d]) : null),
      B("product", "conceptual", FOP, "f(x) and g(x) were multiplied; composition substitutes one into the other.", pl(mulP([a, b], [c, d]))),
    ].filter((x) => x.predict !== null),
    distractors: ([a, b, c, d]) => [pl([a + c, b + d]), pl([a * c, a * d - b]), pl([a * c, b * d])],
    variants: () => [],
    explain: (s) => (s.id === "substitute" ? `Replace x in f by g(x) = ${s.inputs[0]}: ${s.value}` : `Multiply out and simplify: ${s.value}`),
    domain: [[-5, 5], [-6, 6], [-5, 5], [-6, 6]],
    cap: 400,
    difficulty: ([a, b, c, d]) => (a > 0 && c > 0 && b >= 0 && d >= 0 ? 1 : a > 0 && c > 0 ? 2 : 3),
    teach: {
      idea: "f(g(x)) means: wherever f has x, put the whole of g(x) in its place.",
      method: "Write f with a bracket in place of x, put g(x) inside the bracket, multiply out and collect terms.",
      alternatives: [
        { id: "check-number", title: "Check with a number", kind: "conceptual", text: ["Pick x = 1: work out g(1), then f of that.", "Your simplified answer at x = 1 must give the same number."] },
      ],
    },
    limits: "Two linear functions; compositions with quadratics and inverse functions are other families.",
  },
  // ============================================================ pairs of linear equations
  {
    id: "alsys",
    arity: 6,
    title: "Solving a pair of linear equations",
    competency: SYS,
    type: "tuple",
    mc: true,
    // [a1, b1, a2, b2, x, y]
    parse: none,
    reject: (p) => {
      if (!inR(p, [[1, 5], [-4, 4], [1, 5], [-4, 4], [-5, 5], [-5, 5]])) return "Two equations with small whole coefficients and a whole-number solution from −5 to 5.";
      const [a1, b1, a2, b2] = p;
      return b1 === 0 || b2 === 0 || a1 * b2 - a2 * b1 === 0 ? "Both equations must contain y and the lines must cross." : null;
    },
    prompt: ([a1, b1, a2, b2, x, y]) => `Solve the pair of equations ${eq2(a1, b1, a1 * x + b1 * y)} and ${eq2(a2, b2, a2 * x + b2 * y)}. Give the solution as (x, y).`,
    solve: ([a1, b1, a2, b2, x, y]) => {
      const c1 = a1 * x + b1 * y;
      const c2 = a2 * x + b2 * y;
      return {
        steps: [
          st("scale", "multiply", LIN, [a2, a1], `${eq2(a1 * a2, b1 * a2, c1 * a2)} and ${eq2(a1 * a2, b2 * a1, c2 * a1)}`),
          st("eliminate", "subtract", SYS, [b1 * a2 - b2 * a1, c1 * a2 - c2 * a1], y),
          st("back", "substitute", LIN, [a1, b1, c1, y], x),
        ],
        answer: tup(x, y),
      };
    },
    // independent: substitute the pair into both equations
    validate: ([a1, b1, a2, b2, x, y], v) => {
      const t = nums(v);
      return !!t && t.length === 2 && close(a1 * t[0] + b1 * t[1], a1 * x + b1 * y) && close(a2 * t[0] + b2 * t[1], a2 * x + b2 * y);
    },
    bugs: ([a1, b1, a2, b2, x, y]) => {
      const c1 = a1 * x + b1 * y;
      const c2 = a2 * x + b2 * y;
      const den = a2 * b1 + a1 * b2;
      const yy = den !== 0 ? (a2 * c1 + a1 * c2) / den : null;
      return [
        B("swapped", "procedural", SYS, "The values were written in the wrong order; the pair is (x, y): x first.", x !== y ? tup(y, x) : null),
        B("added-to-eliminate", "procedural", SYS, "After making the x coefficients equal, the two equations were added and the x terms were then crossed out as if they had cancelled; x terms with the same sign cancel only when the equations are subtracted.", yy !== null && yy !== y && Number.isInteger(yy) && Number.isInteger((c1 - b1 * yy) / a1) ? tup((c1 - b1 * yy) / a1, yy) : null),
      ].filter((b) => b.predict !== null);
    },
    distractors: ([, , , , x, y]) => [tup(x + 1, y), tup(x, y + 1), tup(x - 1, y + 2), tup(-x, y)],
    variants: () => [],
    explain: (s) => (s.id === "scale" ? `Make the x coefficients equal: ${s.value}` : s.id === "eliminate" ? `Subtract: ${N(Number(s.inputs[0]))}y = ${N(Number(s.inputs[1]))}, so y = ${N(Number(s.value))}` : `Put y = ${N(Number(s.inputs[3]))} into the first equation: x = ${N(Number(s.value))}`),
    domain: [[1, 5], [-4, 4], [1, 5], [-4, 4], [-5, 5], [-5, 5]],
    cap: 500,
    difficulty: ([a1, b1, a2, b2, x, y]) => ((a1 === 1 || a2 === 1 || Math.abs(b1) === 1 || Math.abs(b2) === 1) && x >= 0 && y >= 0 ? 1 : x >= 0 || y >= 0 ? 2 : 3),
    teach: {
      idea: "The solution is the one pair (x, y) that makes both equations true: the point where the two lines cross.",
      method: "Elimination: multiply the equations so x has the same coefficient in both, subtract to remove x, solve for y, then substitute back to find x. Check in both equations.",
      alternatives: [
        { id: "substitution", title: "Substitution", kind: "procedural", text: ["Make x (or y) the subject of the simpler equation.", "Put that expression into the other equation, solve it, then substitute back."] },
      ],
    },
    limits: "Whole-number solutions from −5 to 5; fractional solutions and equations reducible to linear form are not here.",
  },
  {
    id: "alsysw",
    arity: 6,
    title: "A pair of linear equations from a shopping problem",
    competency: SYS,
    type: "tuple",
    mc: true,
    // [a1, b1, a2, b2, x, j]: a pens and b notebooks; pen ₹x, notebook ₹5j
    parse: none,
    reject: (p) => (!inR(p, [[1, 4], [1, 4], [1, 4], [1, 4], [3, 15], [2, 8]]) || p[0] * p[3] - p[2] * p[1] === 0 ? "Two different purchases of up to 4 of each item, pens ₹3–15 and notebooks ₹10–40 (in fives)." : null),
    prompt: ([a1, b1, a2, b2, x, j]) => `${nm(a1 + x)} buys ${a1} ${a1 === 1 ? "pen" : "pens"} and ${b1} ${b1 === 1 ? "notebook" : "notebooks"} for ₹${a1 * x + b1 * 5 * j}. ${nm(a1 + x + 3)} buys ${a2} ${a2 === 1 ? "pen" : "pens"} and ${b2} ${b2 === 1 ? "notebook" : "notebooks"} of the same kinds for ₹${a2 * x + b2 * 5 * j}. Find the price of one pen and of one notebook, in rupees. Give (pen, notebook).`,
    solve: ([a1, b1, a2, b2, x, j]) => {
      const y = 5 * j;
      return {
        steps: [
          st("model", "write", SYS, [a1, b1, a2, b2], `${eq2(a1, b1, a1 * x + b1 * y)} and ${eq2(a2, b2, a2 * x + b2 * y)}`),
          st("eliminate", "subtract", SYS, [a2 * b1 - a1 * b2, a2 * (a1 * x + b1 * y) - a1 * (a2 * x + b2 * y)], y),
          st("back", "substitute", LIN, [a1, b1, a1 * x + b1 * y, y], x),
        ],
        answer: tup(x, y),
      };
    },
    // independent: the two purchases must cost what the problem says at these prices
    validate: ([a1, b1, a2, b2, x, j], v) => {
      const t = nums(v);
      return !!t && t.length === 2 && close(a1 * t[0] + b1 * t[1], a1 * x + b1 * 5 * j) && close(a2 * t[0] + b2 * t[1], a2 * x + b2 * 5 * j);
    },
    bugs: ([a1, b1, a2, b2, x, j]) => {
      const y = 5 * j;
      const c1 = a1 * x + b1 * y;
      const c2 = a2 * x + b2 * y;
      const den = a2 * b1 + a1 * b2;
      const yy = (a2 * c1 + a1 * c2) / den;
      return [
        B("swapped", "procedural", SYS, "The prices were given in the wrong order; the question asks for (pen, notebook).", x !== y ? tup(y, x) : null),
        B("added-to-eliminate", "procedural", SYS, "After making the pen numbers equal, the two equations were added and the pen terms were then crossed out as if they had cancelled; equal pen terms cancel only when the equations are subtracted.", yy !== y && Number.isInteger(yy) && yy > 0 && (c1 - b1 * yy) / a1 > 0 && Number.isInteger((c1 - b1 * yy) / a1) ? tup((c1 - b1 * yy) / a1, yy) : null),
      ].filter((b) => b.predict !== null);
    },
    distractors: ([, , , , x, j]) => [tup(x + 1, 5 * j - 1), tup(x, 5 * j + 5), tup(x - 1, 5 * j)],
    variants: () => [],
    explain: (s) => (s.id === "model" ? `With x = price of a pen and y = price of a notebook: ${s.value}` : s.id === "eliminate" ? `Remove x: ${N(Number(s.inputs[0]))}y = ${N(Number(s.inputs[1]))}, so y = ${s.value}` : `Then x = ${s.value}`),
    domain: [[1, 4], [1, 4], [1, 4], [1, 4], [3, 15], [2, 8]],
    cap: 300,
    difficulty: ([a1, b1, a2, b2]) => (a1 === a2 || b1 === b2 ? 1 : a1 === 1 || a2 === 1 ? 2 : 3),
    word: ([a1, b1, a2, b2, x, j]) => `At a fruit stall, ${a1} ${a1 === 1 ? "banana" : "bananas"} and ${b1} ${b1 === 1 ? "guava" : "guavas"} cost ₹${a1 * x + b1 * 5 * j}, and ${a2} ${a2 === 1 ? "banana" : "bananas"} and ${b2} ${b2 === 1 ? "guava" : "guavas"} cost ₹${a2 * x + b2 * 5 * j}. Find the price of one banana and of one guava, in rupees. Give (banana, guava).`,
    teach: {
      idea: "Each purchase gives one equation in the two unknown prices; together they fix both prices.",
      method: "Let x and y be the two prices, write one equation per purchase, solve by elimination or substitution, and check that both totals come out right.",
      alternatives: [
        { id: "compare", title: "Compare the two baskets", kind: "conceptual", text: ["Scale the baskets so both have the same number of pens.", "The difference in cost is then caused only by the difference in notebooks."] },
      ],
    },
    limits: "Shopping-style problems with whole-rupee prices; age, digit and speed problems are not here.",
  },
  {
    id: "alcons",
    arity: 6,
    title: "How many solutions a pair of equations has",
    competency: SYS,
    type: "choice",
    // [a1, b1, c1, k, kind, d]: second equation k(a1, b1, c1) changed: kind 0 b2 += d (one solution), kind 1 c2 += d
    // (parallel), kind 2 unchanged (same line, d = 1 only)
    parse: none,
    reject: (p) => (!inR(p, [[1, 5], [-5, 5], [1, 9], [2, 4], [0, 2], [-1, 1]]) || p[1] === 0 || p[5] === 0 || (p[4] === 2 && p[5] !== 1) || (p[4] === 0 && p[3] * p[1] + p[5] === 0) ? "a₁x + b₁y = c₁ with small whole coefficients and a second equation built from it." : null),
    prompt: (p) => {
      const [a2, b2, c2] = second(p);
      return `How many solutions does this pair of equations have? ${eq2(p[0], p[1], p[2])} and ${eq2(a2, b2, c2)}.`;
    },
    choices: () => ["Exactly one solution", "No solution", "Infinitely many solutions"],
    solve: (p) => {
      const [a2, b2, c2] = second(p);
      return { steps: [st("ratios", "compare", SYS, [`${p[0]}/${a2}`, `${p[1]}/${b2}`, `${p[2]}/${c2}`], p[4])], answer: p[4] };
    },
    // independent: the determinant decides whether the lines cross; if not, test whether a point of line 1 is on line 2
    validate: (p, v) => {
      const [a1, b1, c1] = p;
      const [a2, b2, c2] = second(p);
      if (a1 * b2 - a2 * b1 !== 0) return v === 0;
      return v === (close(b2 * (c1 / b1), c2) ? 2 : 1);
    },
    bugs: ([, , , , kind]) =>
      [
        B("x-ratio-only", "conceptual", SYS, "Only a₁/a₂ was compared; the lines are parallel or the same only when b₁/b₂ is in the same ratio too.", kind === 0 ? 1 : null),
        B("equal-ratios-same-line", "conceptual", SYS, "a₁/a₂ = b₁/b₂ was taken to mean the same line; the lines coincide only when c₁/c₂ is also in that ratio, otherwise they are parallel.", kind === 1 ? 2 : null),
        B("equal-ratios-parallel", "conceptual", SYS, "Equal ratios a₁/a₂ = b₁/b₂ were taken to mean parallel lines; when c₁/c₂ is equal as well, the two equations describe the same line.", kind === 2 ? 1 : null),
      ].filter((b) => b.predict !== null),
    variants: () => [],
    explain: (s) => `Compare a₁/a₂ = ${s.inputs[0]}, b₁/b₂ = ${s.inputs[1]} and c₁/c₂ = ${s.inputs[2]}: ${["the first two differ, so the lines cross once", "the first two are equal but the third is not: parallel lines, no solution", "all three are equal: the same line, infinitely many solutions"][Number(s.value)]}`,
    domain: [[1, 5], [-5, 5], [1, 9], [2, 4], [0, 2], [-1, 1]],
    cap: 360,
    // one solution needs only a₁/a₂ ≠ b₁/b₂; the other two cases also need the third ratio compared
    difficulty: ([, b1, , , kind]) => (kind === 0 ? 1 : b1 < 0 ? 3 : 2),
    teach: {
      idea: "Two lines either cross once, are parallel (never meet) or are the same line. The ratios of the coefficients tell which.",
      method: "If a₁/a₂ ≠ b₁/b₂: exactly one solution. If a₁/a₂ = b₁/b₂ ≠ c₁/c₂: no solution. If all three ratios are equal: infinitely many.",
      alternatives: [
        { id: "slopes", title: "Compare the slopes", kind: "conceptual", text: ["Write each equation as y = mx + c.", "Different slopes: the lines cross once. Same slope, different c: parallel. Same slope and same c: the same line."] },
      ],
    },
    limits: "The second equation is built from the first (a multiple, with one coefficient changed or not), so the three cases appear in balance; finding a parameter for a given case is not here.",
  },
  {
    id: "al3sys",
    arity: 4,
    title: "Solving three linear equations in three variables",
    competency: SYS3,
    type: "tuple",
    mc: true,
    // [k, x, y, z]: coefficient rows M3[k], solution (x, y, z)
    parse: none,
    reject: (p) => (!inR(p, [[0, M3.length - 1], [-4, 4], [-4, 4], [-4, 4]]) || det3(M3[p[0]]) === 0 ? "One of the fixed coefficient patterns with a whole-number solution from −4 to 4." : null),
    prompt: ([k, x, y, z]) => `Solve the system: ${M3[k].map((r) => eq3(r, r[0] * x + r[1] * y + r[2] * z)).join("; ")}. Give the solution as (x, y, z).`,
    solve: ([k, x, y, z]) => ({
      steps: [
        st("eliminate", "subtract", SYS3, [k], "two equations in y and z"),
        st("pair", "solve", SYS, [y, z], tup(y, z)),
        st("back", "substitute", LIN, [x], x),
      ],
      answer: tup(x, y, z),
    }),
    // independent: substitute into all three equations
    validate: ([k, x, y, z], v) => {
      const t = nums(v);
      return !!t && t.length === 3 && M3[k].every((r) => close(r[0] * t[0] + r[1] * t[1] + r[2] * t[2], r[0] * x + r[1] * y + r[2] * z));
    },
    bugs: ([, x, y, z]) =>
      [
        B("order", "procedural", SYS3, "The values were written in a different order; give them as (x, y, z).", x !== z ? tup(z, y, x) : x !== y ? tup(y, x, z) : null),
        B("one-sign", "procedural", INTADD, "A sign was lost while eliminating, so one value has the wrong sign; check each value in all three equations.", y !== 0 ? tup(x, -y, z) : z !== 0 ? tup(x, y, -z) : null),
      ].filter((b) => b.predict !== null),
    distractors: ([, x, y, z]) => [tup(x + 1, y, z), tup(x, y + 1, z - 1), tup(-x, y, z)],
    variants: () => [],
    explain: (s) => (s.id === "eliminate" ? "Use one equation to remove x from the other two: this leaves two equations in y and z" : s.id === "pair" ? `Solve those two: (y, z) = ${s.value}` : `Substitute back into an original equation: x = ${N(Number(s.value))}`),
    domain: [[0, 7], [-4, 4], [-4, 4], [-4, 4]],
    cap: 300,
    difficulty: ([k, x, y, z]) => (k === 6 || k === 0 ? 1 : [x, y, z].some((v) => v < 0) ? 3 : 2),
    teach: {
      idea: "Each equation removes one degree of freedom; three independent equations fix x, y and z. Eliminating one variable turns the problem into a pair of equations.",
      method: "Pick a variable, eliminate it from two different pairs of equations, solve the resulting pair, then substitute back to find the third value. Check in all three.",
      alternatives: [
        { id: "substitute", title: "Substitute from the simplest equation", kind: "procedural", text: ["Make one variable the subject of the equation with coefficient 1.", "Put it into the other two equations and solve that pair."] },
      ],
    },
    word: ([k, x, y, z]) => `In a quiz, a team scores x points for each question in round 1, y for each in round 2 and z for each in round 3 (a negative score is a penalty). Three teams' results give these totals: ${M3[k].map((r) => eq3(r, r[0] * x + r[1] * y + r[2] * z)).join("; ")}. Find the points per question in each round, as (x, y, z).`,
    limits: "Eight fixed coefficient patterns with unique whole-number solutions; systems with no or infinitely many solutions and matrix methods are not here.",
  },
  // ============================================================ square roots of polynomials
  {
    id: "alpsq",
    arity: 3,
    title: "The square root of a perfect-square polynomial",
    competency: PSQ,
    type: "exact",
    mc: true,
    // [a, b, c]: (ax² + bx + c)²
    parse: none,
    reject: (p) => (!inR(p, [[1, 4], [-6, 6], [-6, 6]]) || p[1] === 0 || p[2] === 0 ? "(ax² + bx + c)² with a 1–4 and b, c from −6 to 6 (not 0)." : null),
    prompt: ([a, b, c]) => `Find the square root of ${pl(mulP([a, b, c], [a, b, c]))}. Write it with a positive coefficient of x².`,
    solve: ([a, b, c]) => ({
      steps: [
        st("first", "evaluate", SQRT, [a * a], pl([a, 0, 0])),
        st("second", "divide", PSQ, [2 * a * b, 2 * a], pl([b, 0])),
        st("third", "divide", PSQ, [2 * b * c, 2 * b], N(c)),
        st("check", "multiply", IDN, [pl([a, b, c])], pl(mulP([a, b, c], [a, b, c]))),
      ],
      answer: pl([a, b, c]),
    }),
    // independent: the answer squared must equal the polynomial at five points, and be positive for large x
    validate: ([a, b, c], v) => [-2.1, -0.6, 0.5, 1.4, 2.8].every((x) => close(at(v, x) ** 2, horner(mulP([a, b, c], [a, b, c]), x))) && at(v, 1000) > 0,
    bugs: ([a, b, c]) => [
      B("all-positive", "procedural", PSQ, "Every term was given a plus sign; the signs must make the cross terms (like 2bc x) come out with their signs when you square back.", b < 0 || c < 0 ? pl([a, Math.abs(b), Math.abs(c)]) : null),
      B("not-halved", "procedural", PSQ, `The x³ term was divided by ${a} only; it is 2 × (${pl([a, 0, 0])}) × (the next term), so divide by ${2 * a}.`, pl([a, 2 * b, c])),
      B("constant-sign", "procedural", PSQ, `√(${c * c}) = ${Math.abs(c)}, but the sign must match the x term: (${pl([a, b, -c])})² has the wrong x term.`, pl([a, b, -c])),
    ].filter((x) => x.predict !== null),
    distractors: ([a, b, c]) => [pl([a, b, c + 1]), pl([a, -b, c]), pl([a, b + 1, c])],
    variants: () => [],
    explain: (s) => (s.id === "first" ? `√(${s.inputs[0]}x⁴) = ${s.value}` : s.id === "check" ? `Check: (${s.inputs[0]})² = ${s.value}` : `${N(Number(s.inputs[0]))} ÷ ${N(Number(s.inputs[1]))} gives the next term ${s.value}`),
    domain: [[1, 4], [-6, 6], [-6, 6]],
    cap: 300,
    difficulty: ([a, b, c]) => (a === 1 && b > 0 && c > 0 ? 1 : a === 1 || (b > 0 && c > 0) ? 2 : 3),
    teach: {
      idea: "(ax² + bx + c)² = a²x⁴ + 2abx³ + (b² + 2ac)x² + 2bcx + c², so the terms of the root can be read off one at a time.",
      method: "Take the square root of the first term; divide the x³ term by twice that to get the x term; find the constant from the x term (divide by twice the x term). Square your answer to check.",
      alternatives: [
        { id: "long-division", title: "The long-division method", kind: "procedural", text: ["As for numbers: the first term of the root squared is taken away, the root so far is doubled as the next divisor.", "Bring down two terms at a time; when nothing is left, the polynomial is a perfect square."] },
      ],
    },
    word: ([a, b, c]) => `A square courtyard has an area of ${pl(mulP([a, b, c], [a, b, c]))} square metres, where x is a length in metres large enough for the side to be positive. Find the length of one side of the courtyard, as a polynomial in x with a positive coefficient of x².`,
    limits: "Squares of quadratics with whole coefficients; the root is given with a positive leading coefficient (its negative is also a square root).",
  },
  // ============================================================ zeros and coefficients
  {
    id: "alsym",
    arity: 4,
    title: "A symmetric expression in the zeros of a quadratic",
    competency: ZER,
    type: "fraction",
    mc: true,
    // [a, b, c, kind]: zeros α, β of ax² + bx + c; kind 0 α² + β², 1 1/α + 1/β, 2 α/β + β/α
    parse: none,
    reject: (p) => (!inR(p, [[1, 4], [-9, 9], [-9, 9], [0, 2]]) || p[1] === 0 || p[2] === 0 || p[1] * p[1] - 4 * p[0] * p[2] <= 0 ? "ax² + bx + c with two different real zeros, a 1–4, b and c from −9 to 9 (not 0)." : null),
    prompt: ([a, b, c, kind]) => `α and β are the zeros of p(x) = ${pl([a, b, c])}. Without finding α and β, find the value of ${["α² + β²", "1/α + 1/β", "α/β + β/α"][kind]}. (A fraction is fine.)`,
    solve: ([a, b, c, kind]) => {
      const S = -b / a;
      const P = c / a;
      const v = kind === 0 ? S * S - 2 * P : kind === 1 ? S / P : (S * S - 2 * P) / P;
      return {
        steps: [
          st("sum", "evaluate", ZER, [b, a], S),
          st("product", "evaluate", ZER, [c, a], P),
          st("combine", "evaluate", ZER, [kind, S, P], v),
        ],
        answer: v,
      };
    },
    // independent: find the zeros themselves (quadratic formula) and evaluate the expression directly
    validate: ([a, b, c, kind], v) => {
      const r = Math.sqrt(b * b - 4 * a * c);
      const al = (-b + r) / (2 * a);
      const be = (-b - r) / (2 * a);
      const want = kind === 0 ? al * al + be * be : kind === 1 ? 1 / al + 1 / be : al / be + be / al;
      return typeof v === "number" && Math.abs(v - want) < 1e-9 * Math.max(1, Math.abs(want));
    },
    bugs: ([a, b, c, kind]) => {
      const S = -b / a;
      const P = c / a;
      return kind === 0
        ? [B("forgot-2ab", "procedural", IDN, "α² + β² was taken as (α + β)²; (α + β)² = α² + 2αβ + β², so subtract 2αβ.", S * S), B("plus-2ab", "procedural", IDN, "2αβ was added; α² + β² = (α + β)² − 2αβ.", S * S + 2 * P)]
        : kind === 1
          ? [B("sum-sign", "recall", ZER, "The sum of the zeros was taken as b/a; it is −b/a.", -S / P), B("flipped", "procedural", ZER, "1/α + 1/β = (α + β)/(αβ); the fraction was turned upside down.", P / S)]
          : [B("forgot-2ab", "procedural", IDN, "α² + β² was taken as (α + β)²; subtract 2αβ first.", (S * S) / P), B("plus-2ab", "procedural", IDN, "2αβ was added instead of subtracted in α² + β².", (S * S + 2 * P) / P)];
    },
    variants: () => [],
    explain: (s) => (s.id === "sum" ? `α + β = −b/a = ${Q(Number(s.value))}` : s.id === "product" ? `αβ = c/a = ${Q(Number(s.value))}` : `${["α² + β² = (α + β)² − 2αβ", "1/α + 1/β = (α + β)/(αβ)", "α/β + β/α = (α² + β²)/(αβ)"][Number(s.inputs[0])]} = ${Q(Number(s.value))}`),
    domain: [[1, 4], [-9, 9], [-9, 9], [0, 2]],
    cap: 450,
    difficulty: ([a, , , kind]) => (a === 1 && kind === 0 ? 1 : kind === 2 ? 3 : 2),
    teach: {
      idea: "For ax² + bx + c, the zeros satisfy α + β = −b/a and αβ = c/a. Any expression that stays the same when α and β swap can be written using only these two.",
      method: "Write the expression in terms of α + β and αβ (for example α² + β² = (α + β)² − 2αβ), then substitute.",
      alternatives: [
        { id: "check", title: "Check with easy zeros", kind: "conceptual", text: ["Try a polynomial whose zeros you know, such as x² − 5x + 6 with zeros 2 and 3.", "Work the expression out directly and with the formula: both must agree."] },
      ],
    },
    word: ([a, b, c, kind]) => {
      const pos = -b / a > 0 && c / a > 0;
      return pos
        ? [`The length and the breadth (in metres) of a rectangular hall are the two zeros of ${pl([a, b, c])}. Without finding them, find the square of the length of the hall's diagonal (α² + β²). (A fraction is fine.)`, `Two taps fill a tank on their own in α and β hours, where α and β are the zeros of ${pl([a, b, c])}. Together they fill 1/α + 1/β of the tank in one hour. Without finding α and β, find this fraction. (A fraction is fine.)`, `The two sides (in metres) of a rectangular photo frame are the zeros α and β of ${pl([a, b, c])}. A designer needs α/β + β/α (the two side ratios added). Without finding α and β, find it. (A fraction is fine.)`][kind]
        : `In a science experiment, the two temperatures α and β (in °C) at which a reading becomes zero are the zeros of ${pl([a, b, c])}. Without finding α and β, find ${["α² + β²", "1/α + 1/β", "α/β + β/α"][kind]}. (A fraction is fine.)`;
    },
    limits: "Quadratics with two different real zeros; three symmetric expressions (α² + β², 1/α + 1/β, α/β + β/α).",
  },
  {
    id: "alform",
    arity: 3,
    title: "A quadratic polynomial from its zeros",
    competency: ZER,
    type: "exact",
    mc: true,
    // [kind, u, v]: kind 0 zeros u ± √v; kind 1 sum u, product v
    parse: none,
    reject: (p) => {
      if (!inR(p, [[0, 1], [-6, 6], [-12, 15]])) return "Zeros u ± √v (v 2–15, not a square), or a whole-number sum and product.";
      const [kind, u, v] = p;
      return kind === 0 ? (v < 2 || isSq(v) ? "v must be 2 to 15 and not a perfect square." : null) : u === 0 || v > 12 ? "A non-zero sum and a product from −12 to 12." : null;
    },
    prompt: ([kind, u, v]) => (kind === 0 ? `Write the quadratic polynomial of the form x² + bx + c whose zeros are ${u === 0 ? `√${v} and −√${v}` : `${N(u)} + √${v} and ${N(u)} − √${v}`}.` : `Write the quadratic polynomial of the form x² + bx + c whose zeros have sum ${N(u)} and product ${N(v)}.`),
    solve: ([kind, u, v]) => {
      const S = kind === 0 ? 2 * u : u;
      const P = kind === 0 ? u * u - v : v;
      return { steps: [st("sum", "add", SURD, [kind, u, v], S), st("product", "multiply", kind === 0 ? IDN : ZER, [kind, u, v], P), st("form", "write", ZER, [S, P], pl([1, -S, P]))], answer: pl([1, -S, P]) };
    },
    // independent: kind 0: the answer must vanish at both zeros and equal (x − r₁)(x − r₂); kind 1: find its zeros
    // (real or complex) and add and multiply them
    validate: ([kind, u, v], ans) => {
      if (kind === 0) {
        const r1 = u + Math.sqrt(v);
        const r2 = u - Math.sqrt(v);
        return [r1, r2, 0.3, 1.7, -2.2].every((x) => Math.abs(at(ans, x) - (x - r1) * (x - r2)) < 1e-9 * Math.max(1, Math.abs(x * x)));
      }
      const c0 = at(ans, 0);
      const c1 = (at(ans, 1) - at(ans, -1)) / 2;
      const c2 = (at(ans, 1) + at(ans, -1)) / 2 - c0;
      if (!close(c2, 1) || !close(at(ans, 2), 4 + 2 * c1 + c0) || !close(at(ans, 3.5), 12.25 + 3.5 * c1 + c0)) return false;
      const D = c1 * c1 - 4 * c0;
      const [sum, prod] = D >= 0 ? [(-c1 + Math.sqrt(D)) / 2 + (-c1 - Math.sqrt(D)) / 2, ((-c1 + Math.sqrt(D)) / 2) * ((-c1 - Math.sqrt(D)) / 2)] : [2 * (-c1 / 2), (c1 / 2) ** 2 + -D / 4];
      return close(sum, u) && close(prod, v);
    },
    bugs: ([kind, u, v]) =>
      kind === 0
        ? [
            B("sum-sign", "recall", ZER, "The x term was given the sign of the sum; x² − (sum)x + (product): the sum is subtracted.", u !== 0 ? pl([1, 2 * u, u * u - v]) : null),
            B("product-plus", "procedural", IDN, `(${N(u)} + √${v})(${N(u)} − √${v}) = ${u * u} − ${v}: the product of a sum and a difference is a difference of squares.`, pl([1, -2 * u, u * u + v])),
          ].filter((x) => x.predict !== null)
        : [
            B("sum-sign", "recall", ZER, "The x term was given the sign of the sum; x² − (sum)x + (product): the sum is subtracted.", pl([1, u, v])),
            B("swapped", "recall", ZER, "The sum and product were put in each other's places; the x coefficient comes from the sum and the constant is the product.", u !== v ? pl([1, -v, u]) : null),
          ].filter((x) => x.predict !== null),
    distractors: ([kind, u, v]) => (kind === 0 ? [pl([1, -u, u * u - v]), pl([1, -2 * u, v]), pl([1, -2 * u, u * u - v + 1])] : [pl([1, -u, -v]), pl([1, -u, v + 1]), pl([1, u, -v])]),
    variants: () => [],
    explain: (s) => (s.id === "sum" ? `Sum of the zeros: ${N(Number(s.value))}` : s.id === "product" ? `Product of the zeros: ${N(Number(s.value))}` : `x² − (sum)x + (product) = ${s.value}`),
    domain: [[0, 1], [-6, 6], [-12, 15]],
    difficulty: ([kind, u]) => (kind === 1 && u > 0 ? 1 : kind === 1 || u === 0 ? 2 : 3),
    teach: {
      idea: "A quadratic with zeros α and β is (x − α)(x − β) = x² − (α + β)x + αβ.",
      method: "Find the sum and the product of the zeros (for m + √n and m − √n: sum 2m, product m² − n), then write x² − (sum)x + (product).",
      alternatives: [
        { id: "brackets", title: "Multiply the brackets", kind: "procedural", text: ["Write (x − α)(x − β) with the zeros in place.", "Multiply out; with surd zeros, group as ((x − m) − √n)((x − m) + √n) = (x − m)² − n."] },
      ],
    },
    limits: "Monic quadratics: zeros m ± √n with whole m and non-square n up to 15, or a whole-number sum and product.",
  },
  // ============================================================ quadratics with graphs and tables
  {
    id: "alqline",
    arity: 3,
    title: "Which line to draw with y = ax² to solve a quadratic",
    competency: QG,
    type: "choice",
    // [a, p, q]: solve ax² + px + q = 0 with the graph of y = ax²
    parse: none,
    reject: (p) => (!inR(p, [[1, 2], [-6, 6], [-9, 9]]) || p[1] === 0 || p[2] === 0 ? "ax² + px + q = 0 with a = 1 or 2 and p, q small and not 0." : null),
    prompt: ([a, p, q]) => `The graph of y = ${a === 1 ? "" : a}x² has been drawn. To solve ${pl([a, p, q])} = 0 with it, which straight line should be drawn on the same axes?`,
    word: ([a, p, q]) => `${nm(a + p + q)} has a carefully drawn graph of y = ${a === 1 ? "" : a}x² on graph paper and wants to use it to solve ${pl([a, p, q])} = 0 without any algebra on the quadratic. The plan: draw one straight line on the same axes and read off the x-coordinates of any points where it crosses the curve (if it does not cross, there are no real solutions). Which straight line should be drawn?`,
    choices: (pp) => {
      const [, p, q] = pp;
      const lines = [[-p, -q], [p, q], [-p, q], [p, -q]].map(([m, c]) => `y = ${pl([m, c])}`);
      return perm(pp, 4).map((i) => lines[i]);
    },
    solve: (pp) => {
      const [a, p, q] = pp;
      return { steps: [st("rearrange", "rearrange", LIN, [pl([a, p, q])], `${pl([a, 0, 0])} = ${pl([-p, -q])}`), st("line", "choose", QG, [-p, -q], perm(pp, 4).indexOf(0))], answer: perm(pp, 4).indexOf(0) };
    },
    // independent: where y = ax² meets the chosen line, ax² − (mx + c) must be the given quadratic at every x
    validate: (pp, v) => {
      const [a, p, q] = pp;
      const lines = [[-p, -q], [p, q], [-p, q], [p, -q]];
      const k = typeof v === "number" ? perm(pp, 4)[v] : -1;
      if (k < 0 || k === undefined) return false;
      const [m, c] = lines[k];
      return [-1.5, 0.5, 2].every((x) => close(a * x * x - (m * x + c), a * x * x + p * x + q));
    },
    bugs: (pp) => [
      B("no-sign-change", "procedural", LIN, "The other terms were copied to the line without changing their signs; moving a term to the other side of = changes its sign.", perm(pp, 4).indexOf(1)),
      B("one-sign-changed", "procedural", LIN, "Only one of the two terms changed sign when it moved; both px and q move to the other side, so both change sign.", [perm(pp, 4).indexOf(2), perm(pp, 4).indexOf(3)]),
    ],
    variants: () => [],
    explain: (s) => (s.id === "rearrange" ? `${s.inputs[0]} = 0 is the same as ${s.value}` : `So draw y = ${pl([Number(s.inputs[0]), Number(s.inputs[1])])}; the x-coordinates where it meets the curve are the solutions`),
    domain: [[1, 2], [-6, 6], [-9, 9]],
    cap: 300,
    difficulty: ([a, p, q]) => (a === 1 && p < 0 && q < 0 ? 1 : a === 1 ? 2 : 3),
    teach: {
      idea: "At a point where y = ax² meets the line y = mx + c, the y values are equal: ax² = mx + c. So the solutions of ax² − mx − c = 0 are the x-coordinates of the meeting points.",
      method: "Keep the ax² term on one side and move every other term to the other side (changing signs). The other side is the line to draw.",
      alternatives: [
        { id: "test-point", title: "Test with one x", kind: "conceptual", text: ["Choose x = 1. On the curve, y = a.", "Your line at x = 1 must satisfy: a − (line value) = the quadratic at x = 1."] },
      ],
    },
    limits: "Choosing the line only; drawing the graphs and reading the crossing points is marked by an educator.",
  },
  {
    id: "alqtab",
    arity: 3,
    title: "Solving a quadratic equation from a table of values",
    competency: QG,
    type: "set",
    // [r, s, k]: y = x² − (r + s)x + (rs + k); solve y = k using the table for x = −4 … 4
    parse: none,
    reject: (p) => (!inR(p, [[-4, 4], [-4, 4], [-6, 6]]) || p[0] >= p[1] ? "Two different solutions r < s from −4 to 4, and k from −6 to 6." : null),
    prompt: ([r, s, k]) => `The table in the picture gives values of y = ${pl([1, -(r + s), r * s + k])} for x from −4 to 4. Use it to solve ${pl([1, -(r + s), r * s + k])} = ${N(k)}. Enter both solutions, separated by a comma.`,
    solve: ([r, s, k]) => ({ steps: [st("read", "read", QG, [k], [r, s])], answer: [r, s] }),
    // independent: substitute each answer into the equation
    validate: ([r, s, k], v) => Array.isArray(v) && v.length === 2 && v[0] !== v[1] && v.every((x) => x * x - (r + s) * x + r * s + k === k),
    bugs: ([r, s, k]) => {
      const f = (x: number) => x * x - (r + s) * x + r * s + k;
      const xs = [...Array(9).keys()].map((i) => i - 4);
      const z = xs.filter((x) => f(x) === 0);
      const m = xs.filter((x) => f(x) === -k);
      return [
        B("read-zero", "procedural", QG, `The x values where y = 0 were read; the equation asks where y = ${N(k)}.`, k !== 0 && z.length ? z : null),
        B("sign-of-k", "procedural", LIN, `The x values where y = ${N(-k)} were read; the right-hand side is ${N(k)}.`, k !== 0 && m.length ? m : null),
      ].filter((b) => b.predict !== null);
    },
    variants: () => [],
    explain: (s) => `In the table, y = ${N(Number(s.inputs[0]))} when x = ${(s.value as number[]).map(N).join(" and x = ")}`,
    figure: ([r, s, k]) => ({ type: "table", head: ["x", ...[...Array(9).keys()].map((i) => N(i - 4))], rows: [["y", ...[...Array(9).keys()].map((i) => N((i - 4) ** 2 - (r + s) * (i - 4) + r * s + k))]] }),
    domain: [[-4, 4], [-4, 4], [-6, 6]],
    cap: 300,
    difficulty: ([, , k]) => (k === 0 ? 1 : Math.abs(k) <= 3 ? 2 : 3),
    teach: {
      idea: "Solving f(x) = k means finding the x values where the graph of y = f(x) is at height k, where it meets the line y = k.",
      method: "Look along the y row of the table for the value k, and read the x above each one. A quadratic gives at most two.",
      alternatives: [
        { id: "plot", title: "Plot and draw the line", kind: "conceptual", text: ["Plot the points from the table and join them with a smooth curve.", "Draw the horizontal line y = k: the x-coordinates where it cuts the curve are the solutions."], visual: ([r, s, k]) => ({ type: "plane", points: [...Array(9).keys()].map((i) => [i - 4, (i - 4) ** 2 - (r + s) * (i - 4) + r * s + k]), segments: [[[-5, k], [5, k]]], range: 12 }) },
      ],
    },
    limits: "Whole-number solutions that appear in a table for x from −4 to 4; solutions between table values (estimated from a drawn graph) are not here.",
  },
  // ============================================================ sums of powers
  {
    id: "alsum",
    arity: 2,
    title: "Sums of natural numbers, odd numbers, squares and cubes",
    competency: PS,
    type: "integer",
    mc: true,
    // [kind, n]: 0 Σk, 1 Σ(2k − 1), 2 Σk², 3 Σk³ for k = 1 … n
    parse: none,
    reject: (p) => (!inR(p, [[0, 3], [5, 30]]) ? "Sums to n terms, n from 5 to 30." : null),
    prompt: ([kind, n]) => `Find the sum ${series(kind, 1, n)}.`,
    solve: ([kind, n]) => {
      const v = [(n * (n + 1)) / 2, n * n, (n * (n + 1) * (2 * n + 1)) / 6, ((n * (n + 1)) / 2) ** 2][kind];
      return { steps: [st("terms", "count", PS, [kind, n], n), st("formula", "evaluate", PS, [kind, n], v)], answer: v };
    },
    // independent: add the terms one by one
    validate: ([kind, n], v) => {
      let s = 0;
      for (let k = 1; k <= n; k++) s += [k, 2 * k - 1, k * k, k * k * k][kind];
      return v === s;
    },
    bugs: ([kind, n]) => {
      const T = (m: number) => (m * (m + 1)) / 2;
      return [
        [B("one-short", "procedural", PS, "n − 1 was used in place of n; the sum 1 + 2 + … + n has n terms.", T(n - 1))],
        [B("last-as-count", "procedural", PS, `The last term ${2 * n - 1} was taken as the number of terms; there are ${n} odd numbers up to ${2 * n - 1}.`, (2 * n - 1) ** 2), B("all-numbers", "conceptual", PS, `All the numbers up to ${2 * n - 1} were added, not only the odd ones.`, T(2 * n - 1))],
        [B("natural-formula", "recall", PS, "The formula for 1 + 2 + … + n was used; the sum of squares is n(n + 1)(2n + 1)/6.", T(n)), B("cubes-formula", "recall", PS, "The formula for the sum of cubes was used; the sum of squares is n(n + 1)(2n + 1)/6.", T(n) ** 2)],
        [B("not-squared", "recall", PS, "n(n + 1)/2 was not squared; the sum of the first n cubes is (n(n + 1)/2)².", T(n)), B("squares-formula", "recall", PS, "The formula for the sum of squares was used; the sum of cubes is (n(n + 1)/2)².", (n * (n + 1) * (2 * n + 1)) / 6)],
      ][kind];
    },
    variants: () => [],
    explain: (s) => (s.id === "terms" ? `There are ${s.value} terms` : `${["n(n + 1)/2", "n²", "n(n + 1)(2n + 1)/6", "(n(n + 1)/2)²"][Number(s.inputs[0])]} with n = ${s.inputs[1]} gives ${s.value}`),
    domain: [[0, 3], [5, 30]],
    difficulty: ([kind, n]) => (kind <= 1 && n <= 20 ? 1 : kind <= 1 || n <= 12 ? 2 : 3),
    word: ([kind, n]) =>
      [
        `A theatre has ${n} rows of seats: 1 seat in the front row, 2 in the next, 3 in the next, and so on. How many seats are there in all?`,
        `${nm(n)} builds a pattern of tiles: 1 tile in the first row, 3 in the second, 5 in the third, and so on for ${n} rows. How many tiles are used altogether?`,
        `How many squares of all sizes (1 by 1, 2 by 2, … up to ${n} by ${n}) are there on a ${n} by ${n} grid? (There are 1² + 2² + … + ${n}² of them.)`,
        `A tower has ${n} layers. The top layer is 1 small cube, the next is a 2 × 2 × 2 block, then a 3 × 3 × 3 block, and so on. How many small cubes are there in the whole tower?`,
      ][kind],
    teach: {
      idea: "1 + 2 + … + n = n(n + 1)/2 (pair the first and last terms); the first n odd numbers add to n²; 1² + … + n² = n(n + 1)(2n + 1)/6; 1³ + … + n³ = (n(n + 1)/2)².",
      method: "Count the number of terms n first (for odd numbers up to L, n = (L + 1)/2), then use the matching formula.",
      alternatives: [
        { id: "pairs", title: "Pair the ends (Gauss)", kind: "conceptual", text: ["Write the sum forwards and backwards and add: every column is n + 1.", "There are n columns, so twice the sum is n(n + 1)."] },
      ],
    },
    limits: "Sums from 1 to n (n up to 30); sums of other series built from these are in the next family.",
  },
  {
    id: "alsumr",
    arity: 3,
    title: "Sums of powers that start partway",
    competency: PS,
    type: "integer",
    mc: true,
    // [kind, m, n]: Σ k^(kind+1) for k = m … n
    parse: none,
    reject: (p) => (!inR(p, [[0, 2], [3, 15], [10, 30]]) || p[2] < p[1] + 5 ? "Sums from k = m to n with m 3–15, n up to 30 and at least six terms." : null),
    prompt: ([kind, m, n]) => `Find ${series(kind === 0 ? 0 : kind + 1, m, n)}.`,
    solve: ([kind, m, n]) => {
      const S = (t: number) => [(t * (t + 1)) / 2, (t * (t + 1) * (2 * t + 1)) / 6, ((t * (t + 1)) / 2) ** 2][kind];
      return { steps: [st("to-n", "evaluate", PS, [kind, n], S(n)), st("to-m", "evaluate", PS, [kind, m - 1], S(m - 1)), st("subtract", "subtract", PS, [S(n), S(m - 1)], S(n) - S(m - 1))], answer: S(n) - S(m - 1) };
    },
    // independent: add the terms one by one
    validate: ([kind, m, n], v) => {
      let s = 0;
      for (let k = m; k <= n; k++) s += k ** (kind + 1);
      return v === s;
    },
    bugs: ([kind, m, n]) => {
      const S = (t: number) => [(t * (t + 1)) / 2, (t * (t + 1) * (2 * t + 1)) / 6, ((t * (t + 1)) / 2) ** 2][kind];
      return [
        B("subtract-to-m", "procedural", PS, `The sum up to ${m} was taken away, which removes ${m}${kind ? sup(kind + 1) : ""} as well; take away the sum up to ${m - 1}.`, S(n) - S(m)),
        B("count-from-one", "conceptual", PS, `The formula was used with n = ${n - m + 1} (the number of terms), as if the sum started at 1.`, S(n - m + 1)),
      ];
    },
    variants: () => [],
    explain: (s) => (s.id === "to-n" ? `Sum from 1 to ${s.inputs[1]}: ${s.value}` : s.id === "to-m" ? `Sum from 1 to ${s.inputs[1]}: ${s.value}` : `${s.inputs[0]} − ${s.inputs[1]} = ${s.value}`),
    domain: [[0, 2], [3, 15], [10, 30]],
    cap: 300,
    difficulty: ([kind, m, n]) => (kind === 0 ? 1 : kind === 1 && n <= 20 ? 2 : 3),
    word: ([kind, m, n]) => (kind === 0 ? `A stadium's rows are numbered from the front. Row k has k seats. How many seats are there in rows ${m} to ${n} together?` : kind === 1 ? `A garden has square flower beds of sizes ${m} × ${m}, ${m + 1} × ${m + 1}, … up to ${n} × ${n} small tiles. How many small tiles are there in all these beds together?` : `A shop stacks cubes of sizes ${m} × ${m} × ${m}, ${m + 1} × ${m + 1} × ${m + 1}, … up to ${n} × ${n} × ${n}, made of small unit cubes. How many unit cubes are there in all of them?`),
    teach: {
      idea: "A sum from m to n is the sum from 1 to n minus the sum from 1 to m − 1.",
      method: "Use the formula with n, then with m − 1, and subtract.",
      alternatives: [
        { id: "picture", title: "Cut off the start", kind: "conceptual", text: ["Imagine the full sum 1 + 2 + … + n as a staircase.", "Remove the first m − 1 steps: what is left is the part you want."] },
      ],
    },
    limits: "Sums of k, k² and k³ over a run of whole numbers up to 30.",
  },
  // ============================================================ distance, midpoint and parallelogram
  {
    id: "aldist",
    arity: 4,
    title: "The distance between two points as a surd",
    competency: DI,
    type: "exact",
    mc: true,
    // [x1, y1, x2, y2]
    parse: none,
    reject: (p) => {
      if (!inR(p, [[-6, 6], [-6, 6], [-6, 6], [-6, 6]])) return "Points with coordinates from −6 to 6.";
      const [x1, y1, x2, y2] = p;
      return x1 === x2 || y1 === y2 || isSq((x2 - x1) ** 2 + (y2 - y1) ** 2) ? "Points not on one horizontal or vertical line, whose distance is not a whole number." : null;
    },
    prompt: ([x1, y1, x2, y2]) => `Find the distance between A${tup(x1, y1)} and B${tup(x2, y2)}. Give it in simplest surd form.`,
    solve: ([x1, y1, x2, y2]) => {
      const d2 = (x2 - x1) ** 2 + (y2 - y1) ** 2;
      return { steps: [st("across", "subtract", INTADD, [x2, x1], x2 - x1), st("up", "subtract", INTADD, [y2, y1], y2 - y1), st("squares", "add", PYTH, [(x2 - x1) ** 2, (y2 - y1) ** 2], d2), st("root", "simplify", SURD, [d2], surd(d2))], answer: surd(d2) };
    },
    // independent: square the answer back and compare with across² + up² counted as sums of the differences
    validate: ([x1, y1, x2, y2], v) => {
      const dx = Math.abs(x2 - x1);
      const dy = Math.abs(y2 - y1);
      let t = 0;
      for (let i = 0; i < dx; i++) t += dx;
      for (let i = 0; i < dy; i++) t += dy;
      const a = num(v);
      return a > 0 && close(a * a, t);
    },
    bugs: ([x1, y1, x2, y2]) => {
      const dx = Math.abs(x2 - x1);
      const dy = Math.abs(y2 - y1);
      const sx = Math.abs(Math.abs(x2) - Math.abs(x1));
      const sy = Math.abs(Math.abs(y2) - Math.abs(y1));
      return [
        B("added-sides", "conceptual", DI, "The across and up distances were added; the straight distance is the hypotenuse: √(across² + up²).", String(dx + dy)),
        B("no-root", "procedural", DI, "The square root was not taken at the end.", String(dx * dx + dy * dy)),
        B("sign-slip", "prerequisite", INTADD, "A difference of coordinates lost a sign: from −2 to 3 is 5, not 1.", (sx !== dx || sy !== dy) && sx * sx + sy * sy > 0 && sx * sx + sy * sy !== dx * dx + dy * dy ? surd(sx * sx + sy * sy) : null),
        B("subtract-squares", "procedural", PYTH, "The squares were subtracted; for the hypotenuse they are added.", dx !== dy ? surd(Math.abs(dx * dx - dy * dy)) : null),
      ].filter((b) => b.predict !== null);
    },
    distractors: ([x1, y1, x2, y2]) => [surd((x2 - x1) ** 2 + (y2 - y1) ** 2 + 1), surd(2 * ((x2 - x1) ** 2 + (y2 - y1) ** 2)), String(Math.abs(x2 - x1) * Math.abs(y2 - y1))],
    variants: () => [],
    explain: (s) => (s.id === "across" ? `Across: ${N(Number(s.inputs[0]))} − (${N(Number(s.inputs[1]))}) = ${N(Number(s.value))}` : s.id === "up" ? `Up: ${N(Number(s.inputs[0]))} − (${N(Number(s.inputs[1]))}) = ${N(Number(s.value))}` : s.id === "squares" ? `${s.inputs[0]} + ${s.inputs[1]} = ${s.value}` : `√${s.inputs[0]} = ${s.value}`),
    figure: ([x1, y1, x2, y2]) => ({ type: "plane", points: [[x1, y1, "A"], [x2, y2, "B"]], segments: [[[x1, y1], [x2, y2]]], range: 7 }),
    domain: [[-6, 6], [-6, 6], [-6, 6], [-6, 6]],
    keep: ([x1, y1, x2, y2]) => x1 < x2,
    cap: 400,
    difficulty: ([x1, y1, x2, y2]) => ([x1, y1, x2, y2].every((v) => v >= 0) ? 1 : sqfree((x2 - x1) ** 2 + (y2 - y1) ** 2)[0] === 1 ? 2 : 3),
    word: ([x1, y1, x2, y2]) => `On a village map drawn on a grid (1 unit = 1 km), the school is at ${tup(x1, y1)} and the well is at ${tup(x2, y2)}. How far apart are they in a straight line, in km? Give the answer in simplest surd form.`,
    teach: {
      idea: "The segment AB is the hypotenuse of a right triangle whose other sides are the across and up distances, so AB² = (x₂ − x₁)² + (y₂ − y₁)² (Baudhayana–Pythagoras).",
      method: "Subtract the x-coordinates and the y-coordinates, square both, add, take the square root and simplify the surd.",
      visual: ([x1, y1, x2, y2]) => ({ type: "plane", points: [[x1, y1, "A"], [x2, y2, "B"], [x2, y1, "C"]], segments: [[[x1, y1], [x2, y2]], [[x1, y1], [x2, y1]], [[x2, y1], [x2, y2]]], range: 7 }),
      alternatives: [
        { id: "triangle", title: "Draw the right triangle", kind: "conceptual", text: ["Draw across from A and up (or down) to B: the corner is a right angle.", "Count the two sides on the grid, then use the Baudhayana–Pythagoras theorem."], visual: ([x1, y1, x2, y2]) => ({ type: "triangle", sides: [String(Math.abs(x2 - x1)), String(Math.abs(y2 - y1)), "AB"], right: true }) },
      ],
    },
    limits: "Coordinates from −6 to 6 with a distance that is not a whole number (whole-number distances are family cdist).",
  },
  {
    id: "almid",
    arity: 5,
    title: "Midpoints, and the other end of a segment",
    competency: DI,
    type: "tuple",
    mc: true,
    // [kind, x1, y1, x2, y2]: kind 0 midpoint of A(x1, y1), B(x2, y2); kind 1 A(x1, y1) and midpoint M(x2, y2), find B
    parse: none,
    reject: (p) => (!inR(p, [[0, 1], [-6, 6], [-6, 6], [-6, 6], [-6, 6]]) || (p[1] === p[3] && p[2] === p[4]) ? "Two different points with coordinates from −6 to 6." : null),
    prompt: ([kind, x1, y1, x2, y2]) => (kind === 0 ? `Find the midpoint of the segment joining A${tup(x1, y1)} and B${tup(x2, y2)}. Give it as (x, y).` : `M${tup(x2, y2)} is the midpoint of the segment AB, and A is ${tup(x1, y1)}. Find B. Give it as (x, y).`),
    solve: ([kind, x1, y1, x2, y2]) =>
      kind === 0
        ? { steps: [st("x", "average", DI, [x1, x2], (x1 + x2) / 2), st("y", "average", DI, [y1, y2], (y1 + y2) / 2)], answer: tup((x1 + x2) / 2, (y1 + y2) / 2) }
        : { steps: [st("bx", "solve", LIN, [x1, x2], 2 * x2 - x1), st("by", "solve", LIN, [y1, y2], 2 * y2 - y1)], answer: tup(2 * x2 - x1, 2 * y2 - y1) },
    // independent: kind 0: the answer is the same distance from A and B and on the line AB; kind 1: the midpoint of A
    // and the answer is M (the inverse operation)
    validate: ([kind, x1, y1, x2, y2], v) => {
      const t = nums(v);
      if (!t || t.length !== 2) return false;
      if (kind === 1) return close((x1 + t[0]) / 2, x2) && close((y1 + t[1]) / 2, y2);
      const da = (t[0] - x1) ** 2 + (t[1] - y1) ** 2;
      const db = (t[0] - x2) ** 2 + (t[1] - y2) ** 2;
      return close(da, db) && close((x2 - x1) * (t[1] - y1) - (y2 - y1) * (t[0] - x1), 0);
    },
    bugs: ([kind, x1, y1, x2, y2]) =>
      kind === 0
        ? [
            B("half-difference", "conceptual", DI, "Half the difference of the coordinates was found; that is how far to go, not where you land. The midpoint averages them: add and halve.", tup((x2 - x1) / 2, (y2 - y1) / 2)),
            B("no-halve", "procedural", DI, "The coordinates were added but not halved.", tup(x1 + x2, y1 + y2)),
          ]
        : [
            B("midpoint-of-given", "conceptual", DI, "The midpoint of A and M was found; M is the middle, so B is as far beyond M as A is before it.", tup((x1 + x2) / 2, (y1 + y2) / 2)),
            B("difference", "procedural", DI, "M − A was found; that is the step from A to M, which must be added to M once more: B = 2M − A.", tup(x2 - x1, y2 - y1)),
          ],
    distractors: ([kind, x1, y1, x2, y2]) => (kind === 0 ? [tup((y1 + y2) / 2, (x1 + x2) / 2), tup((x1 + x2) / 2 + 1, (y1 + y2) / 2)] : [tup(2 * x2 + x1, 2 * y2 + y1), tup(2 * y2 - y1, 2 * x2 - x1), tup(2 * x2 - x1 + 1, 2 * y2 - y1)]),
    variants: () => [],
    explain: (s) => (s.id === "x" || s.id === "y" ? `${s.id}: (${N(Number(s.inputs[0]))} + ${N(Number(s.inputs[1]))}) ÷ 2 = ${Q(Number(s.value))}` : `${s.id === "bx" ? "x" : "y"}: 2 × ${N(Number(s.inputs[1]))} − (${N(Number(s.inputs[0]))}) = ${N(Number(s.value))}`),
    figure: ([kind, x1, y1, x2, y2]) => ({ type: "plane", points: [[x1, y1, "A"], [x2, y2, kind ? "M" : "B"]], ...(kind ? {} : { segments: [[[x1, y1], [x2, y2]]] }), range: 7 }),
    domain: [[0, 1], [-6, 6], [-6, 6], [-6, 6], [-6, 6]],
    cap: 400,
    difficulty: ([kind, x1, y1, x2, y2]) => (kind === 0 && (x1 + x2) % 2 === 0 && (y1 + y2) % 2 === 0 ? 1 : kind === 0 ? 2 : 3),
    word: ([kind, x1, y1, x2, y2]) => (kind === 0 ? `On a grid map, ${nm(x1 + y2)}'s house is at ${tup(x1, y1)} and a friend's house is at ${tup(x2, y2)}. They agree to meet exactly halfway along the straight road between them. Where do they meet? Give (x, y).` : `A straight fence on a grid plan has one end post at ${tup(x1, y1)} and its middle post at ${tup(x2, y2)}. Where is the other end post? Give (x, y).`),
    teach: {
      idea: "The midpoint is halfway across and halfway up: its coordinates are the averages of the endpoints' coordinates.",
      method: "Midpoint = ((x₁ + x₂)/2, (y₁ + y₂)/2). For a missing end B with midpoint M: B = (2·Mx − Ax, 2·My − Ay).",
      alternatives: [
        { id: "steps", title: "Count the steps", kind: "conceptual", text: ["Count the steps across and up from A to the other point on the grid.", "For a midpoint, take half of each; for a missing end, take the same steps again from M."] },
      ],
    },
    limits: "Coordinates from −6 to 6; midpoints may be halves. Section formula for other ratios is not here.",
  },
  {
    id: "alpar",
    arity: 6,
    title: "The fourth vertex of a parallelogram",
    competency: DI,
    type: "tuple",
    mc: true,
    // [ax, ay, u1, v1, u2, v2]: A(ax, ay), B = A + (u1, v1), C = B + (u2, v2); ABCD a parallelogram
    parse: none,
    reject: (p) => (!inR(p, [[-2, 2], [-2, 2], [-3, 3], [-3, 3], [-3, 3], [-3, 3]]) || p[2] * p[5] - p[3] * p[4] === 0 ? "A, B, C not on one line, with small whole-number coordinates." : null),
    prompt: ([ax, ay, u1, v1, u2, v2]) => `ABCD is a parallelogram (vertices in that order) with A${tup(ax, ay)}, B${tup(ax + u1, ay + v1)} and C${tup(ax + u1 + u2, ay + v1 + v2)}. Find D. Give it as (x, y).`,
    solve: ([ax, ay, u1, v1, u2, v2]) => {
      const [bx, by, cx, cy] = [ax + u1, ay + v1, ax + u1 + u2, ay + v1 + v2];
      return { steps: [st("midpoint", "average", DI, [ax, ay, cx, cy], tup((ax + cx) / 2, (ay + cy) / 2)), st("other-end", "solve", DI, [bx, by], tup(ax + cx - bx, ay + cy - by))], answer: tup(ax + cx - bx, ay + cy - by) };
    },
    // independent: the step from A to B must equal the step from D to C (opposite sides equal and parallel)
    validate: ([ax, ay, u1, v1, u2, v2], v) => {
      const t = nums(v);
      return !!t && t.length === 2 && close(ax + u1 + u2 - t[0], u1) && close(ay + v1 + v2 - t[1], v1);
    },
    bugs: ([ax, ay, u1, v1, u2, v2]) => {
      const [bx, by, cx, cy] = [ax + u1, ay + v1, ax + u1 + u2, ay + v1 + v2];
      return [
        B("wrong-diagonal", "conceptual", DI, "A and C were not used as opposite corners; in ABCD the diagonals are AC and BD, and they share a midpoint.", tup(bx + cx - ax, by + cy - ay)),
        B("wrong-pair", "conceptual", DI, "A and B were treated as opposite corners; in ABCD, B is opposite D.", tup(ax + bx - cx, ay + by - cy)),
      ];
    },
    distractors: ([ax, ay, u1, v1, u2, v2]) => [tup(ax + u2 + 1, ay + v2), tup(ax - u2, ay - v2), tup(ax + u1, ay + v2)],
    variants: () => [],
    explain: (s) => (s.id === "midpoint" ? `The diagonals bisect each other: the midpoint of AC is ${s.value}` : `D is the other end of the diagonal from B through that midpoint: D = ${s.value}`),
    figure: ([ax, ay, u1, v1, u2, v2]) => ({ type: "plane", points: [[ax, ay, "A"], [ax + u1, ay + v1, "B"], [ax + u1 + u2, ay + v1 + v2, "C"]], segments: [[[ax, ay], [ax + u1, ay + v1]], [[ax + u1, ay + v1], [ax + u1 + u2, ay + v1 + v2]]], range: 8 }),
    domain: [[-2, 2], [-2, 2], [-3, 3], [-3, 3], [-3, 3], [-3, 3]],
    cap: 400,
    difficulty: ([, , u1, v1, u2, v2]) => (u1 * v1 === 0 || u2 * v2 === 0 ? 1 : u1 * u2 > 0 ? 2 : 3),
    word: ([ax, ay, u1, v1, u2, v2]) => `A park is shaped like a parallelogram ABCD. On the grid plan, gate A is at ${tup(ax, ay)}, gate B at ${tup(ax + u1, ay + v1)} and gate C at ${tup(ax + u1 + u2, ay + v1 + v2)}. Where is the fourth corner D? Give (x, y).`,
    teach: {
      idea: "In a parallelogram the diagonals bisect each other, and opposite sides are equal and parallel: going from A to B is the same step as going from D to C.",
      method: "D = A + C − B (add the coordinates of A and C, subtract those of B). Check that the midpoints of AC and BD agree.",
      alternatives: [
        { id: "step", title: "Copy the step", kind: "conceptual", text: ["Count the step from B to C (across and up).", "Make the same step from A: that is D."] },
      ],
    },
    limits: "Small whole-number coordinates, vertices named in order; other orderings of the three vertices are not asked.",
  },
  {
    id: "altri",
    arity: 6,
    title: "Is the triangle right-angled or isosceles?",
    competency: DI,
    type: "choice",
    // [ax, ay, u1, v1, u2, v2]: A(ax, ay), B = A + (u1, v1), C = A + (u2, v2)
    parse: none,
    reject: (p) => (!inR(p, [[-2, 2], [-2, 2], [-4, 4], [-4, 4], [-4, 4], [-4, 4]]) || p[2] * p[5] - p[3] * p[4] === 0 ? "Three points not on one line, with small whole-number coordinates." : null),
    keep: (p) => triKind(p) !== 3 || hsh(p.join(",")) % 7 === 0,
    prompt: ([ax, ay, u1, v1, u2, v2]) => `A${tup(ax, ay)}, B${tup(ax + u1, ay + v1)} and C${tup(ax + u2, ay + v2)} are the vertices of a triangle. Use the distance formula to decide what kind of triangle ABC is.`,
    choices: () => ["Right-angled, but not isosceles", "Isosceles, but not right-angled", "Right-angled and isosceles", "Neither right-angled nor isosceles"],
    solve: (p) => {
      const [ab, bc, ca] = sides2(p);
      return { steps: [st("sides", "evaluate", DI, [ab, bc, ca], `AB² = ${ab}, BC² = ${bc}, CA² = ${ca}`), st("classify", "compare", PYTH, [ab, bc, ca], triKind(p))], answer: triKind(p) };
    },
    // independent: right angle by perpendicular steps (products of the steps add to 0); isosceles by a vertex lying on
    // the perpendicular bisector of the opposite side
    validate: ([ax, ay, u1, v1, u2, v2], v) => {
      const P: P2[] = [[ax, ay], [ax + u1, ay + v1], [ax + u2, ay + v2]];
      let right = false;
      let iso = false;
      for (let i = 0; i < 3; i++) {
        const [o, a, b] = [P[i], P[(i + 1) % 3], P[(i + 2) % 3]];
        if ((a[0] - o[0]) * (b[0] - o[0]) + (a[1] - o[1]) * (b[1] - o[1]) === 0) right = true;
        const m: P2 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
        if ((o[0] - m[0]) * (b[0] - a[0]) + (o[1] - m[1]) * (b[1] - a[1]) === 0) iso = true;
      }
      return v === (right ? (iso ? 2 : 0) : iso ? 1 : 3);
    },
    bugs: (p) => {
      const right = triKind(p);
      const [ax, ay, u1, v1, u2, v2] = p;
      // lengths counted along the grid (across + up) instead of with the distance formula
      const L = [Math.abs(u1) + Math.abs(v1), Math.abs(u2 - u1) + Math.abs(v2 - v1), Math.abs(u2) + Math.abs(v2)];
      const s = [...L].sort((x, y) => x - y);
      const taxi = s[0] * s[0] + s[1] * s[1] === s[2] * s[2] ? (s[0] === s[1] || s[1] === s[2] ? 2 : 0) : s[0] === s[1] || s[1] === s[2] ? 1 : 3;
      // Pythagoras checked only with BC as the longest side (only the angle at A)
      const [ab, bc, ca] = sides2(p);
      const isoA = ab === bc || bc === ca || ca === ab;
      const onlyA = ab + ca === bc ? (isoA ? 2 : 0) : isoA ? 1 : 3;
      void ax;
      void ay;
      return [
        B("grid-lengths", "conceptual", DI, "The sides were measured by counting across plus up along the grid; a slanting side is √(across² + up²).", taxi !== right ? taxi : null),
        B("only-angle-a", "procedural", PYTH, "Only the angle at A was tested; the right angle can be at any vertex, so test the longest side against the other two.", onlyA !== right ? onlyA : null),
      ].filter((b) => b.predict !== null);
    },
    variants: () => [],
    explain: (s) => (s.id === "sides" ? `Squared sides: ${s.value}` : ["Two squared sides add up to the third, and no two sides are equal: right-angled", "Two sides are equal and no right angle: isosceles", "Two squared sides add to the third and two sides are equal: right-angled and isosceles", "No two sides are equal and no two squares add to the third: neither"][Number(s.value)]),
    figure: ([ax, ay, u1, v1, u2, v2]) => ({ type: "plane", points: [[ax, ay, "A"], [ax + u1, ay + v1, "B"], [ax + u2, ay + v2, "C"]], segments: [[[ax, ay], [ax + u1, ay + v1]], [[ax + u1, ay + v1], [ax + u2, ay + v2]], [[ax + u2, ay + v2], [ax, ay]]], range: 7 }),
    domain: [[-2, 2], [-2, 2], [-4, 4], [-4, 4], [-4, 4], [-4, 4]],
    cap: 400,
    difficulty: (p) => (p[2] * p[3] === 0 && p[4] * p[5] === 0 ? 1 : triKind(p) === 3 ? 2 : 3),
    teach: {
      idea: "Squared side lengths decide the shape: two equal sides make it isosceles, and if two squared sides add up to the third it has a right angle (converse of the Baudhayana–Pythagoras theorem).",
      method: "Find AB², BC² and CA² with the distance formula (no need for square roots). Compare them for equal pairs, and test whether the two smaller add up to the largest.",
      alternatives: [
        { id: "slopes", title: "Use the steps of the sides", kind: "conceptual", text: ["Write each side as a step (across, up). Two sides are at right angles when across × across + up × up = 0 for their steps.", "Equal sides have equal across² + up²."] },
      ],
    },
    limits: "The classification only; the written justification is marked by an educator. 'Neither' triangles are thinned so that all four answers are common.",
  },
  // ============================================================ areas from coordinates
  {
    id: "altria",
    arity: 6,
    title: "The area of a triangle from its vertices",
    competency: PA,
    type: "fraction",
    mc: true,
    // [x1, y1, x2, y2, x3, y3]
    parse: none,
    reject: (p) => (!inR(p, [[-4, 0], [-4, 0], [1, 5], [-4, 2], [-3, 4], [1, 5]]) || shoe(p) === 0 ? "Three points not on one line, in the ranges of the family." : null),
    prompt: ([x1, y1, x2, y2, x3, y3]) => `Find the area of the triangle with vertices ${tup(x1, y1)}, ${tup(x2, y2)} and ${tup(x3, y3)}, in square units.`,
    solve: (p) => {
      const s = shoe(p);
      return { steps: [st("sum", "evaluate", PA, p, s), st("half", "divide", TAREA, [s, 2], Math.abs(s) / 2)], answer: Math.abs(s) / 2 };
    },
    // independent: Pick's theorem: count lattice points inside and on the edges
    validate: ([x1, y1, x2, y2, x3, y3], v) => typeof v === "number" && close(v, pickArea([[x1, y1], [x2, y2], [x3, y3]])),
    bugs: (p) => {
      const s = shoe(p);
      const [x1, y1, x2, y2, x3, y3] = p;
      const fwd = Math.abs(x1 * y2 + x2 * y3 + x3 * y1) / 2;
      return [
        B("no-half", "procedural", TAREA, "The ½ in front of the formula was left out.", Math.abs(s)),
        B("negative-area", "procedural", PA, "The result was left negative; an area is the absolute value: take away the minus sign.", s < 0 ? s / 2 : null),
        B("forward-only", "procedural", PA, "Only the products x₁y₂, x₂y₃, x₃y₁ were added; the products x₂y₁, x₃y₂, x₁y₃ must be taken away.", fwd !== Math.abs(s) / 2 ? fwd : null),
      ].filter((b) => b.predict !== null);
    },
    variants: () => [],
    explain: (s) => (s.id === "sum" ? `x₁(y₂ − y₃) + x₂(y₃ − y₁) + x₃(y₁ − y₂) = ${N(Number(s.value))}` : `Area = ½ × |${N(Number(s.inputs[0]))}| = ${Q(Number(s.value))}`),
    figure: ([x1, y1, x2, y2, x3, y3]) => ({ type: "plane", points: [[x1, y1, "A"], [x2, y2, "B"], [x3, y3, "C"]], segments: [[[x1, y1], [x2, y2]], [[x2, y2], [x3, y3]], [[x3, y3], [x1, y1]]], range: 6 }),
    domain: [[-4, 0], [-4, 0], [1, 5], [-4, 2], [-3, 4], [1, 5]],
    cap: 400,
    difficulty: ([x1, y1]) => (x1 === 0 && y1 === 0 ? 1 : x1 === 0 || y1 === 0 ? 2 : 3),
    word: ([x1, y1, x2, y2, x3, y3]) => `A farmer's triangular plot has corners at ${tup(x1, y1)}, ${tup(x2, y2)} and ${tup(x3, y3)} on a grid map where 1 unit is 1 metre. What is the area of the plot in square metres?`,
    teach: {
      idea: "Area = ½ |x₁(y₂ − y₃) + x₂(y₃ − y₁) + x₃(y₁ − y₂)|: the formula comes from boxing the triangle in a rectangle and taking away right triangles (or trapeziums).",
      method: "Substitute carefully with signs, add the three products, take the absolute value and halve.",
      alternatives: [
        { id: "box", title: "Box it in a rectangle", kind: "conceptual", text: ["Draw the smallest rectangle on the grid that holds the triangle.", "Take away the right triangles in the corners from the rectangle's area."], visual: ([x1, y1, x2, y2, x3, y3]) => ({ type: "plane", points: [[x1, y1, "A"], [x2, y2, "B"], [x3, y3, "C"]], segments: [[[x1, y1], [x2, y2]], [[x2, y2], [x3, y3]], [[x3, y3], [x1, y1]]], range: 6 }) },
      ],
    },
    limits: "Whole-number vertices in a window of the plane; quadrilateral areas are not here.",
  },
  {
    id: "alcoll",
    arity: 5,
    title: "The unknown coordinate that makes three points collinear",
    competency: PA,
    type: "fraction",
    mc: true,
    // [x1, y1, x2, y2, x3]: (x1, y1), (x2, y2), (x3, k) collinear
    parse: none,
    reject: (p) => (!inR(p, [[-5, -1], [-5, 5], [1, 5], [-5, 5], [-6, 6]]) || p[4] === p[0] || p[4] === p[2] || p[1] === p[3] ? "Two points on a slanting line and a third x-coordinate different from both." : null),
    prompt: ([x1, y1, x2, y2, x3]) => `For which value of k are the points ${tup(x1, y1)}, ${tup(x2, y2)} and (${N(x3)}, k) collinear? (A fraction is fine.)`,
    solve: ([x1, y1, x2, y2, x3]) => {
      // ½[x1(y2 − k) + x2(k − y1) + x3(y1 − y2)] = 0 → k(x2 − x1) = x2y1 − x1y2 − x3(y1 − y2)
      const k = (x2 * y1 - x1 * y2 - x3 * (y1 - y2)) / (x2 - x1);
      return { steps: [st("area-zero", "write", PA, [x1, y1, x2, y2, x3], `${N(x2 - x1)}k = ${N(x2 * y1 - x1 * y2 - x3 * (y1 - y2))}`), st("solve", "solve", LIN, [x2 * y1 - x1 * y2 - x3 * (y1 - y2), x2 - x1], k)], answer: k };
    },
    // independent: the steps from the first point to the other two must be in the same direction (equal slopes)
    validate: ([x1, y1, x2, y2, x3], v) => typeof v === "number" && close((v - y1) * (x2 - x1), (y2 - y1) * (x3 - x1)),
    bugs: ([x1, y1, x2, y2, x3]) => {
      const m = (y2 - y1) / (x2 - x1);
      return [
        B("slope-upside-down", "conceptual", CART, "The slope was found as change in x ÷ change in y; it is change in y ÷ change in x.", y1 + ((x2 - x1) / (y2 - y1)) * (x3 - x1)),
        B("mixed-points", "procedural", PA, "The slope was used from one point but the steps counted from the other; measure both from the same point.", y1 + m * (x3 - x2)),
      ];
    },
    variants: () => [],
    explain: (s) => (s.id === "area-zero" ? `The area of the triangle must be 0: ${s.value}` : `k = ${N(Number(s.inputs[0]))} ÷ ${N(Number(s.inputs[1]))} = ${Q(Number(s.value))}`),
    domain: [[-5, -1], [-5, 5], [1, 5], [-5, 5], [-6, 6]],
    cap: 300,
    difficulty: ([x1, y1, x2, y2, x3]) => (Number.isInteger(((y2 - y1) * (x3 - x1)) / (x2 - x1)) ? (y2 > y1 ? 1 : 2) : 3),
    teach: {
      idea: "Three points are collinear exactly when the 'triangle' they make has area 0.",
      method: "Put the points into ½[x₁(y₂ − y₃) + x₂(y₃ − y₁) + x₃(y₁ − y₂)] = 0 with k in place, and solve the linear equation for k.",
      alternatives: [
        { id: "slope", title: "Equal slopes", kind: "conceptual", text: ["The slope from the first point to the second must equal the slope from the first point to the third.", "Write (k − y₁)/(x₃ − x₁) = (y₂ − y₁)/(x₂ − x₁) and solve."] },
      ],
    },
    limits: "Whole-number coordinates; k may be a fraction.",
  },
  // ============================================================ circle theorems
  {
    id: "alangle",
    arity: 2,
    title: "Angles in a circle",
    competency: CT,
    type: "integer",
    mc: true,
    // [kind, x]: 0 centre from circumference, 1 circumference from centre (2x given), 2 cyclic quadrilateral,
    // 3 angle in a semicircle, 4 base angle of the isosceles triangle OAB; gap@1: 5 equal chords subtend equal angles at
    // the centre, 6 the same with the base angle of triangle OCD, 7 the line from the centre to the midpoint of a chord is
    // perpendicular to it (the converse)
    parse: none,
    reject: (p) => {
      if (!inR(p, [[0, 7], [15, 150]])) return "One of eight angle facts with angles in the family's ranges.";
      const [k, x] = p;
      const ok = k <= 1 ? x <= 85 : k === 2 ? x >= 40 && x <= 140 : k === 3 ? x <= 75 : k === 4 || k === 6 ? x >= 20 && x % 2 === 0 : k === 5 ? x >= 20 && x <= 150 : x <= 75;
      return ok ? null : "That angle is outside the range for this kind of question.";
    },
    prompt: ([k, x]) =>
      [
        `O is the centre of a circle, and A, B, C are points on the circle with C on the major arc AB. ∠ACB = ${deg(x)}. Find ∠AOB in degrees.`,
        `O is the centre of a circle, and A, B, C are points on the circle with C on the major arc AB. ∠AOB = ${deg(2 * x)}. Find ∠ACB in degrees.`,
        `ABCD is a cyclic quadrilateral (all four vertices lie on one circle). ∠DAB = ${deg(x)}. Find ∠BCD in degrees.`,
        `AB is a diameter of a circle and C is another point on the circle. ∠CAB = ${deg(x)}. Find ∠CBA in degrees.`,
        `O is the centre of a circle and A, B are points on it. ∠AOB = ${deg(x)}. Find ∠OAB in degrees.`,
        `AB and CD are two equal chords of a circle with centre O, and ∠AOB = ${deg(x)}. Find ∠COD in degrees.`,
        `AB and CD are two equal chords of a circle with centre O, and ∠AOB = ${deg(x)}. Find ∠OCD in degrees.`,
        `O is the centre of a circle, AB is a chord that is not a diameter, and M is the midpoint of AB. ∠OAB = ${deg(x)}. Find ∠AOM in degrees.`,
      ][k],
    solve: ([k, x]) => {
      const v = [2 * x, x, 180 - x, 90 - x, (180 - x) / 2, x, (180 - x) / 2, 90 - x][k];
      const fact = ["angle at the centre is twice the angle at the circumference", "angle at the centre is twice the angle at the circumference", "opposite angles of a cyclic quadrilateral add up to 180°", "the angle in a semicircle is 90°", "OA = OB (radii), so the base angles are equal", "equal chords subtend equal angles at the centre", "equal chords subtend equal angles at the centre, and OC = OD (radii), so the base angles of triangle OCD are equal", "the line from the centre to the midpoint of a chord is perpendicular to the chord, so ∠OMA = 90°"][k];
      return { steps: [st("fact", "recall", CT, [k], fact), st("compute", "evaluate", (k >= 3 && k !== 5) ? TRI : CT, [k, x], v)], answer: v };
    },
    // independent: place the points on a unit circle and measure the angle numerically
    validate: ([k, x], v) => {
      if (typeof v !== "number" || v <= 0 || v >= 180) return false;
      const O: P2 = [0, 0];
      if (k === 0) return near(angleAt(onCircle(180 + v / 2), onCircle(0), onCircle(v)), x, 1e-9);
      if (k === 1) return near(angleAt(onCircle(180 + x), onCircle(0), onCircle(2 * x)), v, 1e-9);
      if (k === 2) return near(angleAt(onCircle(x), onCircle(0), onCircle(2 * x)), v, 1e-9) && near(angleAt(onCircle(180 + x), onCircle(0), onCircle(2 * x)), x, 1e-9);
      if (k === 3) return near(angleAt([1, 0], [-1, 0], onCircle(2 * x)), v, 1e-9);
      if (k === 4) return near(angleAt(onCircle(0), O, onCircle(x)), v, 1e-9);
      // 5, 6: build CD elsewhere on the circle with the same LENGTH as AB (found by halving on the angle), then measure
      if (k === 5 || k === 6) {
        const len = Math.hypot(onCircle(x)[0] - 1, onCircle(x)[1]);
        let [lo, hi] = [0, 180];
        for (let i = 0; i < 100; i++) {
          const m = (lo + hi) / 2;
          const c = onCircle(200);
          const d = onCircle(200 + m);
          if (Math.hypot(c[0] - d[0], c[1] - d[1]) < len) lo = m;
          else hi = m;
        }
        const C = onCircle(200);
        const D = onCircle(200 + (lo + hi) / 2);
        return near(k === 5 ? angleAt(O, C, D) : angleAt(C, O, D), v, 1e-7);
      }
      // 7: A, B with ∠OAB = x, M the midpoint of AB, measure ∠AOM
      const A = onCircle(0);
      const Bp = onCircle(180 - 2 * x);
      return near(angleAt(O, A, [(A[0] + Bp[0]) / 2, (A[1] + Bp[1]) / 2]), v, 1e-9);
    },
    bugs: ([k, x]) =>
      [
        [B("halved", "conceptual", CT, "The angle was halved; the angle at the CENTRE is the larger one: twice the angle at the circumference.", x % 2 === 0 ? x / 2 : null), B("equal", "conceptual", CT, "The two angles were taken as equal; the angle at the centre is twice the angle at the circumference.", x)],
        [B("doubled", "conceptual", CT, "The angle at the centre was doubled; the angle at the circumference is half of it.", 4 * x), B("equal", "conceptual", CT, "The two angles were taken as equal; the angle at the circumference is half the angle at the centre.", 2 * x)],
        [B("opposite-equal", "conceptual", CT, "Opposite angles of a cyclic quadrilateral were taken as equal; they add up to 180°.", x), B("complement", "recall", CT, "90° was used; opposite angles of a cyclic quadrilateral add up to 180°, not 90°.", x < 90 ? 90 - x : null)],
        [B("bracket-slip", "procedural", TRI, "180° − 90° − ∠CAB was worked out as 180° − (90° − ∠CAB): the given angle was added back instead of taken away. Both 90° and ∠CAB come off 180°.", 90 + x), B("equal", "conceptual", TRI, "The two angles at A and B were taken as equal; that is only true when C is halfway round.", x)],
        [B("not-halved", "procedural", TRI, `180° − ${x}° was not shared between the two equal angles.`, 180 - x), B("half-centre", "conceptual", CT, "The base angle was taken as half the angle at the centre; in triangle OAB the two base angles share 180° minus the angle at O.", x / 2 !== (180 - x) / 2 ? x / 2 : null)],
        [B("halved", "conceptual", CT, "The angle was halved, as for an angle at the circumference; equal chords make EQUAL angles at the centre.", x % 2 === 0 && x / 2 !== x ? x / 2 : null), B("supplement", "conceptual", CT, "The two angles at the centre were taken to add up to 180°; equal chords make equal angles at the centre.", 180 - x !== x ? 180 - x : null)],
        [B("centre-angle-given", "procedural", CT, "The angle at the centre was given; the question asks for the base angle of the isosceles triangle OCD, which shares 180° minus that angle with the other base angle.", x), B("not-halved", "procedural", TRI, `180° − ${x}° was not shared between the two equal base angles.`, 180 - x)],
        [B("whole-centre-angle", "procedural", TRI, "∠AOB was found; OM bisects it, and the question asks for half of it, ∠AOM.", 180 - 2 * x), B("no-right-angle", "conceptual", CT, "The right angle at M was not used; the line from the centre to the midpoint of a chord is perpendicular to the chord, so ∠AOM = 90° − ∠OAM.", 180 - x)],
      ][k].filter((b) => b.predict !== null),
    variants: () => [],
    explain: (s) => (s.id === "fact" ? `Use: ${s.value}` : `So the angle is ${s.value}°`),
    // right triangle: the right angle (C) is the bottom-left corner, side 1 the hypotenuse (the diameter AB); in the
    // isosceles triangle OAB the two radii (sides 1 and 2) meet at the top corner O
    figure: ([k, x]) => (k === 3 ? { type: "triangle", angles: ["90°", deg(x), "?"], sides: ["", "AB (diameter)", ""], right: true } : k === 4 ? { type: "triangle", angles: ["?", "", deg(x)], sides: ["", "r", "r"] } : null),
    domain: [[0, 7], [15, 150]],
    difficulty: ([k]) => (k === 0 || k === 3 || k === 5 ? 1 : k === 1 || k === 2 || k === 7 ? 2 : 3),
    teach: {
      idea: "An arc makes twice the angle at the centre that it makes at any point on the rest of the circle. From this: angles in the same segment are equal, the angle in a semicircle is 90°, and opposite angles of a cyclic quadrilateral add up to 180°.",
      method: "Name the fact that links the given angle to the one asked for, write the relation (×2, ÷2, 180° − , 90° − ), then work it out.",
      alternatives: [
        { id: "radii", title: "Draw the radii", kind: "conceptual", text: ["Join the centre to the points on the circle: every radius is the same length, so the triangles formed are isosceles.", "Equal base angles and the angle sum of 180° in each triangle lead to the same results."] },
      ],
    },
    limits: "Angle facts with one or two steps (centre and circumference, cyclic quadrilateral, semicircle, isosceles triangle of radii, equal chords, the midpoint of a chord); multi-step angle chases and proofs are marked by an educator.",
  },
  {
    id: "alchord",
    arity: 3,
    title: "Chords and their distance from the centre",
    competency: CT,
    type: "exact",
    mc: true,
    // [kind, r, d]: kind 0 radius r, distance d → chord length; kind 1 radius r, chord length 2d → distance
    parse: none,
    reject: (p) => (!inR(p, [[0, 1], [3, 15], [1, 14]]) || p[2] >= p[1] ? "A radius from 3 to 15 cm, with the other length shorter than it." : null),
    prompt: ([k, r, d]) => (k === 0 ? `A chord of a circle with radius ${r} cm is ${d} cm from the centre. Find the length of the chord in cm (exact, as a surd if needed).` : `A chord of length ${2 * d} cm is drawn in a circle with radius ${r} cm. How far is the chord from the centre, in cm (exact, as a surd if needed)?`),
    solve: ([k, r, d]) => {
      const h2 = r * r - d * d;
      return k === 0
        ? { steps: [st("bisect", "recall", CT, [r, d], "the perpendicular from the centre bisects the chord"), st("half", "evaluate", PYTH, [r * r, d * d], surd(h2)), st("double", "multiply", SURD, [surd(h2)], surd(4 * h2))], answer: surd(4 * h2) }
        : { steps: [st("bisect", "recall", CT, [2 * d, d], "the perpendicular from the centre bisects the chord"), st("distance", "evaluate", PYTH, [r * r, d * d], surd(h2))], answer: surd(h2) };
    },
    // independent: Pythagoras backwards: (half chord)² + distance² must give radius²
    validate: ([k, r, d], v) => {
      const a = num(v);
      if (!(a > 0)) return false;
      return k === 0 ? close((a / 2) ** 2 + d * d, r * r) : close(a * a + d * d, r * r);
    },
    bugs: ([k, r, d]) =>
      (k === 0
        ? [
            B("not-doubled", "procedural", CT, "Only half the chord was found; the perpendicular from the centre cuts the chord into two equal halves, so double it.", surd(r * r - d * d)),
            B("added-squares", "procedural", PYTH, "The squares were added; the radius is the hypotenuse, so subtract: half chord² = r² − d².", surd(4 * (r * r + d * d))),
            B("subtract-lengths", "conceptual", PYTH, "The lengths were subtracted without squaring; Pythagoras works with the squares of the sides.", String(2 * (r - d))),
          ]
        : [
            B("full-chord", "procedural", CT, "The whole chord was used in the right triangle; the triangle uses HALF the chord.", r * r - 4 * d * d > 0 ? surd(r * r - 4 * d * d) : null),
            B("added-squares", "procedural", PYTH, "The squares were added; the radius is the hypotenuse, so subtract: distance² = r² − (half chord)².", surd(r * r + d * d)),
            B("subtract-lengths", "conceptual", PYTH, "The lengths were subtracted without squaring; Pythagoras works with the squares of the sides.", String(r - d)),
          ]
      ).filter((b) => b.predict !== null && num(b.predict) !== (k === 0 ? 2 : 1) * Math.sqrt(r * r - d * d)),
    distractors: ([k, r, d]) => [surd(r * r - d * d + 1), surd(k === 0 ? r * r - d * d : 4 * (r * r - d * d)), String(r + d)],
    variants: () => [],
    explain: (s) => (s.id === "bisect" ? `Use: ${s.value}, making a right triangle with the radius as hypotenuse` : s.id === "double" ? `The chord is twice that: ${s.value} cm` : `√(${s.inputs[0]} − ${s.inputs[1]}) = ${s.value}`),
    // right triangle: sides 0 and 2 are the legs, side 1 the hypotenuse (the radius)
    figure: ([k, r, d]) => ({ type: "triangle", sides: k === 0 ? [`${d} cm`, `${r} cm`, "half the chord"] : [`${d} cm`, `${r} cm`, "distance"], right: true }),
    domain: [[0, 1], [3, 15], [1, 14]],
    difficulty: ([, r, d]) => (isSq(r * r - d * d) ? 1 : sqfree(r * r - d * d)[0] === 1 ? 2 : 3),
    word: ([k, r, d]) => (k === 0 ? `A round table top has radius ${r} cm. A straight strip of tape is stuck across it, from edge to edge, passing ${d} cm from the centre at its closest. How long is the tape, in cm (exact)?` : `A wheel of radius ${r} cm has a straight metal bar of length ${2 * d} cm fixed with both ends on the rim. How far is the bar from the centre of the wheel, in cm (exact)?`),
    teach: {
      idea: "The perpendicular from the centre to a chord bisects it, so the radius, the distance from the centre and half the chord form a right triangle with the radius as hypotenuse.",
      method: "Half chord² + distance² = radius². Find the unknown side, and double the half chord if the whole chord is asked.",
      alternatives: [
        { id: "fold", title: "Fold the circle", kind: "conceptual", text: ["Fold a paper circle so that the two ends of a chord meet: the fold passes through the centre and is perpendicular to the chord.", "The fold cuts the chord into two equal halves."] },
      ],
    },
    limits: "One chord with the radius and one other length given; two chords and their comparison are not here.",
  },
  {
    id: "altheo",
    arity: 2,
    title: "Which circle fact justifies a step",
    competency: CT,
    type: "choice",
    // [s, x]: situation s (SITS: six for each of six facts) with a number x
    parse: none,
    reject: (p) => {
      if (!inR(p, [[0, SITS.length - 1], [20, 80]])) return `One of ${SITS.length} situations with a number from 20 to 80.`;
      const g = SITS[p[0]].given;
      return g && g(p[1]) === 90 ? "A right angle in a cyclic quadrilateral makes its opposite angle equal too, so a wrong option would also fit." : null;
    },
    prompt: ([s, x]) => `${theoStatement(s, x)} Which fact justifies this step?`,
    choices: ([s, x]) => perm([s, x], 4).map((i) => FACTS[THEO[SITS[s].f][i]]),
    solve: ([s, x]) => ({ steps: [st("fact", "recall", CT, [s], FACTS[THEO[SITS[s].f][0]])], answer: perm([s, x], 4).indexOf(0) }),
    // independent: find the option whose fact is the one for this situation by its wording
    validate: ([s, x], v) => {
      const key = THEO_KEY[SITS[s].f];
      const opts = perm([s, x], 4).map((i) => FACTS[THEO[SITS[s].f][i]]);
      return typeof v === "number" && opts[v] !== undefined && opts[v].includes(key) && opts.filter((o) => o.includes(key)).length === 1;
    },
    bugs: ([s, x]) => [
      B("mixed-up-fact", "conceptual", CT, ["The fact about angles in the same segment was chosen; here one of the angles is at the centre, so the centre-angle fact applies.", "The centre-angle fact was chosen; here both angles are on the circle, standing on the same arc.", "The fact about angles in the same segment was chosen; the step uses the diameter, so the semicircle fact applies.", "Opposite angles of a cyclic quadrilateral were taken to be equal; they add up to 180°, and that is what the step uses.", "The fact about equal chords was chosen; this step is about one chord and the perpendicular from the centre.", "The fact about the perpendicular bisecting a chord was chosen; this step compares two equal chords."][SITS[s].f], perm([s, x], 4).indexOf(1)),
    ],
    variants: () => [],
    explain: (s) => `The step uses: ${s.value}`,
    domain: [[0, SITS.length - 1], [20, 80]],
    cap: 400,
    difficulty: ([s]) => (SITS[s].f === 2 || SITS[s].f === 4 ? 1 : SITS[s].f === 0 || SITS[s].f === 3 ? 2 : 3),
    teach: {
      idea: "Each step in a geometry argument needs a reason: a definition or a theorem already proved. Matching the situation (where the angle is, what the chord does) to the theorem is the first part of writing a proof.",
      method: "Look at what the step uses: an angle at the centre, two angles on the same arc, a diameter, a cyclic quadrilateral, a perpendicular to a chord, or equal chords. Pick the fact about exactly that.",
      alternatives: [
        { id: "picture", title: "Sketch it first", kind: "conceptual", text: ["Make a quick sketch and mark what is given and what is claimed.", "The theorem you need is the one whose picture looks like your sketch."] },
      ],
    },
    limits: "Choosing the justification for one step; writing the full proof is marked by an educator.",
  },
  // ============================================================ gap@1: polynomials (recognise, degree, add, evaluate, divide)
  {
    id: "alpoly",
    arity: 2,
    title: "Recognising and classifying polynomials",
    competency: POLY,
    type: "choice",
    // [kind, s]: 0 which expression is a polynomial, 1 which is a linear polynomial, 2 name by degree, 3 name by number
    // of terms; s chooses the expressions
    parse: none,
    reject: (p) => (!inR(p, [[0, 3], [0, 59]]) ? "One of four kinds of question with a choice of expressions 0–59." : null),
    prompt: ([k, s]) => (k === 0 ? "Which of these expressions is a polynomial in x?" : k === 1 ? "Which of these is a linear polynomial in x?" : k === 2 ? `By its degree, what kind of polynomial is ${polyCls(k, s).text}?` : `By its number of terms (after collecting like terms), what kind of polynomial is ${polyCls(k, s).text}?`),
    choices: ([k, s]) => (k <= 1 ? polyOpts(k, s).map((o) => o.text) : k === 2 ? DEGNAMES : TERMNAMES),
    solve: ([k, s]) => {
      if (k <= 1) {
        const o = polyOpts(k, s);
        const i = o.findIndex((x) => x.right);
        return { steps: [st("test", "classify", POLY, [o[i].text], k === 0 ? "only whole-number powers of x" : "highest power of x is 1"), st("choose", "choose", POLY, [], i)], answer: i };
      }
      const c = polyCls(k, s);
      return { steps: [st("collect", "simplify", SIMP, [c.text], pl(c.desc)), st("name", "classify", POLY, [k === 2 ? c.deg : c.terms], k === 2 ? c.deg : c.terms - 1)], answer: k === 2 ? c.deg : c.terms - 1 };
    },
    // independent: kinds 0, 1 test each option numerically (finite differences vanish for a polynomial of degree ≤ 3, and
    // the second differences for a linear one); kinds 2, 3 recover the coefficients from values of the written expression
    validate: ([k, s], v) => {
      if (typeof v !== "number") return false;
      if (k <= 1) {
        const ok = polyOpts(k, s).map((o) => (k === 0 ? diffDeg(o.text) !== null : diffDeg(o.text) === 1));
        return ok[v] === true && ok.filter(Boolean).length === 1;
      }
      const cs = coeffsOf(polyCls(k, s).text, 6);
      if (!cs) return false;
      const deg = cs.reduce((d, c, i) => (Math.abs(c) > 1e-9 ? i : d), 0);
      const terms = cs.filter((c) => Math.abs(c) > 1e-9).length;
      return k === 2 ? v === deg : v === terms - 1;
    },
    bugs: ([k, s]) => {
      if (k <= 1) {
        const o = polyOpts(k, s);
        const at = (t: string) => o.findIndex((x) => x.type === t);
        return keepBugs([
          B("negative-power", "conceptual", POLY, "A term like a/x was accepted; a/x is a × x⁻¹, and a polynomial allows only whole-number powers 0, 1, 2, … of x.", at("recip") >= 0 ? at("recip") : at("mixed") >= 0 ? at("mixed") : null),
          B("root-of-x", "conceptual", POLY, "√x was accepted as a term; √x is x to the power ½, which is not a whole number. (A root in the coefficient, like √2 x, is allowed.)", at("rootx") >= 0 ? at("rootx") : null),
          ...(k === 1 ? [B("two-terms-linear", "conceptual", POLY, "An expression with two terms was taken as linear; linear means the highest power of x is 1, and here it is 2.", at("quad") >= 0 ? at("quad") : null)] : []),
        ]);
      }
      const c = polyCls(k, s);
      return k === 2
        ? keepBugs([
            B("terms-as-degree", "conceptual", POLY, "The number of terms was taken as the degree; the degree is the highest power of x.", c.terms <= 3 && c.terms !== c.deg ? c.terms : null),
            B("first-term-power", "procedural", POLY, "The power of the first term written was taken; the terms are not written in order here, so look for the highest power anywhere.", c.first !== c.deg ? c.first : null),
          ])
        : keepBugs([
            B("like-terms-counted", "procedural", SIMP, "Like terms were counted separately; terms with the same power of x are collected into one term first.", c.written !== c.terms && c.written <= 4 ? c.written - 1 : null),
            B("degree-as-terms", "conceptual", POLY, "The degree was used to name it; monomial, binomial and trinomial count the terms, not the power.", c.deg >= 1 && c.deg <= 4 && c.deg !== c.terms ? c.deg - 1 : null),
          ]);
    },
    variants: () => [],
    explain: (s) => (s.id === "test" ? `${s.inputs[0]} has ${s.value}` : s.id === "collect" ? `Collect like terms and order by powers: ${s.value}` : s.id === "name" ? `It has ${s.inputs[0]} as its ${Number(s.value) === Number(s.inputs[0]) ? "degree" : "number of terms"}: answer ${"ABCD"[Number(s.value)]}` : `So the answer is ${"ABCD"[Number(s.value)]}`),
    domain: [[0, 3], [0, 59]],
    keep: (p) => firstOnly("alpoly", [[0, 3], [0, 59]], (p) => `${B12.find((d) => d.id === "alpoly")!.prompt(p)}|${B12.find((d) => d.id === "alpoly")!.choices!(p).join("|")}`)(p),
    difficulty: ([k, s]) => (k === 0 ? 2 : k === 1 ? 1 : polyCls(k, s).first !== polyCls(k, s).deg || polyCls(k, s).written !== polyCls(k, s).terms ? 3 : 2),
    teach: {
      idea: "A polynomial in x is a sum of terms a·xⁿ with n a whole number (0, 1, 2, …). Its degree is the highest power of x; by degree it is constant, linear, quadratic or cubic, and by its number of terms a monomial, binomial or trinomial.",
      method: "Write each term as a power of x: 1/x is x⁻¹ and √x is x^½, so they are not allowed. Collect like terms, then read the highest power (the degree) and count the terms.",
      alternatives: [
        { id: "rewrite", title: "Rewrite every term as a power", kind: "procedural", text: ["Rewrite 3/x as 3x⁻¹ and √x as x^½; √2 x is just the number √2 times x¹.", "If every power is 0, 1, 2, 3, …, it is a polynomial; the largest power is its degree."] },
      ],
    },
    limits: "Expressions in one variable x up to degree 3; polynomials in several variables are in the degree family.",
  },
  {
    id: "alpdeg",
    arity: 2,
    title: "Degree and coefficients of a polynomial",
    competency: POLY,
    type: "integer",
    mc: true,
    // [kind, s]: 0 degree of a polynomial in x, 1 a coefficient, 2 degree of a monomial in several variables, 3 degree
    // of a polynomial in x and y
    parse: none,
    reject: (p) => (!inR(p, [[0, 3], [0, 59]]) ? "One of four kinds of question with a choice of expressions 0–59." : null),
    prompt: ([k, s]) => {
      const g = degGen(k, s);
      return k === 0 ? `What is the degree of the polynomial ${g.text}?` : k === 1 ? `What is the coefficient of ${g.ask === 0 ? "the constant term" : g.ask === 1 ? "x" : `x${sup(g.ask)}`} in ${g.text}?${g.ask === 0 ? "" : " (Write 0 if there is no such term.)"}` : k === 2 ? `What is the degree of the monomial ${g.text}?` : `What is the degree of the polynomial ${g.text}?`;
    },
    solve: ([k, s]) => {
      const g = degGen(k, s);
      return { steps: [st("read", k <= 1 ? "read" : "add", k <= 1 ? POLY : INTADD, [g.text], g.answer)], answer: g.answer };
    },
    // independent: kinds 0, 1 recover the coefficients from values of the expression; kinds 2, 3 scale every variable by
    // t and find the degree of the result in t from finite differences
    validate: ([k, s], v) => {
      const g = degGen(k, s);
      if (typeof v !== "number") return false;
      if (k <= 1) {
        const cs = coeffsOf(g.text, 8);
        if (!cs) return false;
        return k === 0 ? v === cs.reduce((d, c, i) => (Math.abs(c) > 1e-9 ? i : d), 0) : close(v, cs[g.ask] ?? 0);
      }
      return v === scaleDeg(g.text);
    },
    bugs: ([k, s]) => {
      const g = degGen(k, s);
      const w = (x: number | null) => (x === null || x === g.answer ? null : x);
      if (k === 0) return keepBugs([B("terms-as-degree", "conceptual", POLY, "The number of terms was given; the degree is the highest power of x.", w(g.terms)), B("first-term-power", "procedural", POLY, "The power of the first term written was taken; the terms are not in order, so look for the highest power anywhere.", w(g.first)), B("largest-coefficient", "conceptual", POLY, "The largest number in front of a term was given; the degree is a power, not a coefficient.", w(g.big))]);
      if (k === 1) return keepBugs([B("power-for-coefficient", "conceptual", POLY, "The power was given instead of the number multiplying it; the coefficient is the number in front.", g.ask > 0 ? w(g.ask) : null), B("sign-dropped", "procedural", POLY, "The minus sign in front of the term was left off; the sign belongs to the coefficient.", w(g.answer < 0 ? -g.answer : null)), B("missing-is-one", "conceptual", POLY, "A missing term was given coefficient 1; when a power does not appear, its coefficient is 0.", g.answer === 0 ? 1 : null)]);
      if (k === 2) return keepBugs([B("highest-exponent", "conceptual", POLY, "Only the highest single power was taken; the degree of a monomial adds the powers of all its variables.", w(g.max)), B("exponents-multiplied", "procedural", POLY, "The powers were multiplied; the degree adds them.", w(g.prod)), B("count-variables", "conceptual", POLY, "The number of different letters was counted; the degree adds their powers.", w(g.vars))]);
      return keepBugs([B("highest-exponent", "conceptual", POLY, "The highest power of a single letter was taken; the degree of a term adds the powers of x and y, and the polynomial takes the largest of these.", w(g.max)), B("all-exponents", "procedural", POLY, "All the powers in the polynomial were added together; add only within one term, then take the largest term.", w(g.prod)), B("first-term", "procedural", POLY, "The degree of the first term was given; another term has a higher degree.", w(g.first))]);
    },
    distractors: ([k, s]) => {
      const a = degGen(k, s).answer;
      return [a + 1, a - 1, a + 2].filter((x) => k === 1 || x >= 0);
    },
    variants: () => [],
    explain: (s) => `In ${s.inputs[0]} the answer is ${N(Number(s.value))}`,
    domain: [[0, 3], [0, 59]],
    keep: (p) => firstOnly("alpdeg", [[0, 3], [0, 59]], (p) => B12.find((d) => d.id === "alpdeg")!.prompt(p))(p),
    difficulty: ([k]) => (k === 0 || k === 1 ? 1 : k === 2 ? 2 : 3),
    teach: {
      idea: "The degree of a monomial is the sum of the powers of its variables (3x²y³ has degree 5); the degree of a polynomial is the highest degree of its terms. The coefficient of a power is the number multiplying it, with its sign.",
      method: "Collect like terms. For each term add the powers of its letters; the largest such sum is the degree. For a coefficient, find the term with that power and read the number (and sign) in front; 0 if it is missing.",
      alternatives: [
        { id: "table", title: "Make a table of terms", kind: "procedural", text: ["Write each term on its own line with its coefficient and the powers of each letter.", "Add the powers on each line; the biggest total is the degree."] },
      ],
    },
    limits: "Polynomials in x up to degree 6, monomials in up to three letters and polynomials in x and y with whole-number powers up to 4.",
  },
  {
    id: "aladd",
    arity: 2,
    title: "Adding and subtracting polynomials",
    competency: POLY,
    type: "tuple",
    mc: true,
    // [op, s]: op 0 p(x) + q(x), 1 p(x) − q(x); s chooses p and q
    parse: none,
    reject: (p) => (!inR(p, [[0, 1], [0, 149]]) ? "Addition or subtraction with a choice of polynomials 0–149." : null),
    prompt: ([op, s]) => {
      const { P, Qp } = addGen(op, s);
      return `Simplify (${pl(P)}) ${op ? "−" : "+"} (${pl(Qp)}). Write the result as ax³ + bx² + cx + d and give (a, b, c, d).`;
    },
    solve: ([op, s]) => {
      const { P, Qp } = addGen(op, s);
      const r = P.map((c, i) => c + (op ? -1 : 1) * Qp[i]);
      return { steps: [...(op ? [st("signs", "negate", INTADD, [pl(Qp)], pl(Qp.map((c) => -c)))] : []), st("collect", "add", SIMP, [pl(P)], tup(...r))], answer: tup(...r) };
    },
    // independent: the cubic with these coefficients must agree with p(x) ± q(x) at four points
    validate: ([op, s], v) => {
      const { P, Qp } = addGen(op, s);
      const t = nums(v);
      return !!t && t.length === 4 && [-2.5, -0.5, 1.5, 3].every((x) => close(horner(t, x), horner(P, x) + (op ? -1 : 1) * horner(Qp, x)));
    },
    bugs: ([op, s]) => {
      const { P, Qp } = addGen(op, s);
      const lead = Qp.findIndex((c) => c !== 0);
      const firstOnly = P.map((c, i) => c + (i === lead ? -Qp[i] : Qp[i]));
      const absQ = P.map((c, i) => c + Math.abs(Qp[i]));
      return keepBugs([
        B("sign-first-term-only", "procedural", INTADD, "Only the first term of the second bracket changed sign; the minus in front of the bracket changes the sign of every term inside.", op === 1 && Qp.filter((c) => c !== 0).length > 1 ? tup(...firstOnly) : null),
        B("sign-dropped", "procedural", INTADD, "A minus sign inside the second bracket was lost while adding; keep each coefficient's own sign.", op === 0 && Qp.some((c) => c < 0) ? tup(...absQ) : null),
      ]);
    },
    distractors: ([op, s]) => {
      const { P, Qp } = addGen(op, s);
      const r = P.map((c, i) => c + (op ? -1 : 1) * Qp[i]);
      return [tup(...P.map((c, i) => c - (op ? -1 : 1) * Qp[i])), tup(...r.map((c, i) => (i === 3 ? c + 1 : c))), tup(...r.map((c, i) => (i === 2 ? -c : c)))];
    },
    variants: () => [],
    explain: (s) => (s.id === "signs" ? `Subtracting (${s.inputs[0]}) adds ${s.value}` : `Add the coefficients of each power: ${s.value}`),
    domain: [[0, 1], [0, 149]],
    cap: 300,
    difficulty: ([op, s]) => (op === 0 ? (addGen(op, s).Qp.some((c) => c < 0) ? 2 : 1) : 3),
    teach: {
      idea: "Only like terms (the same power of x) can be added; subtracting a polynomial adds its negative, so every sign inside the bracket changes.",
      method: "Remove the brackets (changing every sign of the second polynomial for subtraction), then collect the x³ terms, the x² terms, the x terms and the numbers.",
      alternatives: [
        { id: "columns", title: "Line up in columns", kind: "procedural", text: ["Write the two polynomials one under the other, x³ under x³, x² under x², and so on (leave a gap for a missing power).", "Add (or subtract) each column."] },
      ],
    },
    limits: "Polynomials in x up to degree 3 with whole coefficients from −9 to 9.",
  },
  {
    id: "aleval",
    arity: 2,
    title: "The value of a polynomial and the zero of a linear polynomial",
    competency: POLY,
    type: "fraction",
    mc: true,
    // [kind, s]: 0 p(t) for a quadratic or cubic, 1 the zero of ax + b
    parse: none,
    reject: (p) => (!inR(p, [[0, 1], [0, 119]]) ? "A value or a zero, with a choice of polynomials 0–119." : null),
    prompt: ([k, s]) => {
      const g = evalGen(k, s);
      return k === 0 ? `Find the value of p(x) = ${pl(g.P)} at x = ${N(g.t)}, that is, p(${N(g.t)}).` : `Find the zero of the polynomial p(x) = ${pl(g.P)}. (A fraction is fine.)`;
    },
    solve: ([k, s]) => {
      const g = evalGen(k, s);
      return k === 0 ? { steps: [st("substitute", "evaluate", POLY, [pl(g.P), g.t], horner(g.P, g.t))], answer: horner(g.P, g.t) } : { steps: [st("equate", "solve", LIN, [g.P[0], g.P[1]], -g.P[1] / g.P[0])], answer: -g.P[1] / g.P[0] };
    },
    // independent: kind 0 adds the terms one by one with powers found by repeated multiplication; kind 1 substitutes back
    validate: ([k, s], v) => {
      const g = evalGen(k, s);
      if (typeof v !== "number") return false;
      if (k === 1) return close(g.P[0] * v + g.P[1], 0);
      let sum = 0;
      g.P.forEach((c, i) => {
        let pw = 1;
        for (let j = 0; j < g.P.length - 1 - i; j++) pw *= g.t;
        sum += c * pw;
      });
      return close(v, sum);
    },
    bugs: ([k, s]) => {
      const g = evalGen(k, s);
      if (k === 1) {
        const [a, b] = g.P;
        return keepBugs([B("zero-sign", "procedural", LIN, `ax + b = 0 gives x = −b/a; the sign of ${N(b)} was not changed when it moved across.`, b / a), B("zero-upside-down", "procedural", LIN, "The fraction was turned upside down: x = −b/a, not −a/b.", -a / b !== -b / a ? -a / b : null)]);
      }
      const d = g.P.length - 1;
      const sq = g.P.reduce((acc, c, i) => acc + c * (d - i === 2 ? -(g.t * g.t) : g.t ** (d - i)), 0);
      const mulp = g.P.reduce((acc, c, i) => acc + c * (d - i === 0 ? 1 : (d - i) * g.t), 0);
      const right = horner(g.P, g.t);
      return keepBugs([
        B("negative-squared", "prerequisite", EXP, `(${N(g.t)})² was taken as negative; a negative number squared is positive.`, g.t < 0 && sq !== right ? sq : null),
        B("power-as-product", "prerequisite", EXP, `A power was worked out as a multiplication (for example ${N(g.t)}² as 2 × ${N(g.t)}); a power multiplies the number by itself.`, mulp !== right ? mulp : null),
      ]);
    },
    distractors: ([k, s]) => {
      const g = evalGen(k, s);
      const r = k === 0 ? horner(g.P, g.t) : -g.P[1] / g.P[0];
      return k === 0 ? [r + 2, r - 2, horner(g.P, -g.t)].filter((x) => x !== r) : [g.P[1], -g.P[1], r + 1];
    },
    variants: () => [],
    explain: (s) => (s.id === "substitute" ? `Put x = ${N(Number(s.inputs[1]))} into ${s.inputs[0]}: ${Q(Number(s.value))}` : `${N(Number(s.inputs[0]))}x + ${N(Number(s.inputs[1]))} = 0 gives x = ${Q(Number(s.value))}`),
    domain: [[0, 1], [0, 119]],
    keep: (p) => firstOnly("aleval", [[0, 1], [0, 119]], (p) => B12.find((d) => d.id === "aleval")!.prompt(p))(p),
    difficulty: ([k, s]) => (k === 1 ? (evalGen(k, s).P[0] === 1 ? 1 : 2) : evalGen(k, s).t < 0 ? 3 : 2),
    teach: {
      idea: "The value of p(x) at x = t is what you get by putting t in place of x; a zero of p(x) is a value of x that makes p(x) = 0.",
      method: "Substitute the number in brackets, work out the powers with their signs first, then multiply and add. For a zero of ax + b, solve ax + b = 0: x = −b/a.",
      alternatives: [
        { id: "nested", title: "Nested multiplication", kind: "procedural", text: ["Start with the first coefficient; multiply by t and add the next coefficient, again and again.", "The last number is p(t) — the same as the synthetic-division remainder."] },
      ],
    },
    limits: "Quadratics and cubics with small whole coefficients at whole numbers from −3 to 3, and zeros of linear polynomials.",
  },
  {
    id: "almono",
    arity: 6,
    title: "Dividing a polynomial by a monomial",
    competency: POLY,
    type: "tuple",
    mc: true,
    // [k, j, a, b, c, _]: (ka x^(j+2) + kb x^(j+1) + kc x^j) ÷ (k x^j) = ax² + bx + c; the last parameter is 0
    parse: none,
    reject: (p) => (!inR(p, [[2, 9], [1, 3], [1, 6], [-6, 6], [-6, 6], [0, 0]]) || p[3] === 0 || p[4] === 0 ? "A trinomial with every coefficient a multiple of k, divided by kxʲ." : null),
    prompt: ([k, j, a, b, c]) => `Divide ${pl([k * a, k * b, k * c, ...Array(j).fill(0)])} by ${k}${j === 1 ? "x" : `x${sup(j)}`}. Write the quotient as px² + qx + r and give (p, q, r).`,
    solve: ([k, j, a, b, c]) => ({ steps: [st("each", "divide", POLY, [k, j], pl([a, b, c])), st("collect", "write", POLY, [a, b, c], tup(a, b, c))], answer: tup(a, b, c) }),
    // independent: the divisor times the answer must give the dividend back, at four points
    validate: ([k, j, a, b, c], v) => {
      const t = nums(v);
      return !!t && t.length === 3 && [-1.7, 0.6, 1.3, 2.9].every((x) => close(k * x ** j * horner(t, x), horner([k * a, k * b, k * c, ...Array(j).fill(0)], x)));
    },
    bugs: ([k, , a, b, c]) =>
      keepBugs([
        B("first-term-only", "procedural", POLY, `Only the first term was divided by ${k}; every term of the polynomial is divided by the monomial.`, tup(a, k * b, k * c)),
        B("sign-lost", "procedural", INTADD, "A minus sign was lost when dividing; a negative term divided by a positive monomial stays negative.", b < 0 || c < 0 ? tup(a, Math.abs(b), Math.abs(c)) : null),
      ]),
    distractors: ([, , a, b, c]) => [tup(a, b, c + 1), tup(a, -b, c), tup(a + 1, b, c)],
    variants: () => [],
    explain: (s) => (s.id === "each" ? `Divide each term by ${s.inputs[0]}x${Number(s.inputs[1]) === 1 ? "" : sup(Number(s.inputs[1]))}: subtract the powers and divide the coefficients: ${s.value}` : `So (p, q, r) = ${s.value}`),
    domain: [[2, 9], [1, 3], [1, 6], [-6, 6], [-6, 6], [0, 0]],
    cap: 300,
    difficulty: ([, j, , b, c]) => (j === 1 && b > 0 && c > 0 ? 1 : b < 0 && c < 0 ? 3 : 2),
    teach: {
      idea: "Dividing a sum by a monomial divides each term separately: (A + B + C) ÷ m = A/m + B/m + C/m, and xᵃ ÷ xᵇ = xᵃ⁻ᵇ.",
      method: "Split the division into one division per term; divide the coefficients and subtract the powers of x.",
      alternatives: [
        { id: "check", title: "Check by multiplying back", kind: "procedural", text: ["Multiply your quotient by the monomial.", "You must get the original polynomial term by term."] },
      ],
    },
    limits: "Trinomials whose coefficients are all multiples of the monomial's coefficient, so the quotient has whole coefficients.",
  },
  {
    id: "alldiv",
    arity: 7,
    title: "The division algorithm with a non-monic or quadratic divisor",
    competency: POLY,
    type: "tuple",
    mc: true,
    // kind 0: [0, A, B, p, q, s, R]: p(x) = (Ax + B)(px² + qx + s) + R; kind 1: [1, A, B, p, q, s, R]: p(x) =
    // (x² + Ax + B)(px + q) + (sx + R)
    parse: none,
    reject: (pp) => {
      if (!inR(pp, [[0, 1], [-5, 5], [-5, 5], [1, 3], [-5, 5], [-5, 5], [-9, 9]])) return "A cubic divided by Ax + B (A 2 or 3) or by x² + Ax + B, with a whole quotient and remainder.";
      const [k, A, Bv, , , s, R] = pp;
      if (k === 0) return A < 2 || A > 3 || Bv === 0 || R === 0 || gcd(A, Bv) !== 1 ? "Divisor Ax + B with A 2 or 3, B not 0 and no common factor; a remainder that is not 0." : null;
      return Bv === 0 || (s === 0 && R === 0) || (s === 0 ? false : false) ? "Divisor x² + Ax + B with B not 0, and a remainder that is not 0." : null;
    },
    prompt: (pp) => {
      const [k, A, Bv] = pp;
      const D = k === 0 ? [A, Bv] : [1, A, Bv];
      return k === 0
        ? `Divide p(x) = ${pl(divDividend(pp))} by ${pl(D)}. Write p(x) = (${pl(D)}) × q(x) + r, where q(x) = ax² + bx + c and r is a number. Give (a, b, c, r). (Fractions are fine.)`
        : `Divide p(x) = ${pl(divDividend(pp))} by ${pl(D)}. Write p(x) = (${pl(D)}) × q(x) + r(x), where q(x) = ax + b and r(x) = cx + d. Give (a, b, c, d).`;
    },
    solve: (pp) => {
      const [k, A, Bv, p, q, s, R] = pp;
      const P = divDividend(pp);
      return k === 0
        ? { steps: [st("first", "divide", POLY, [P[0], A], p), st("second", "divide", POLY, [P[1] - Bv * p, A], q), st("third", "divide", POLY, [P[2] - Bv * q, A], s), st("remainder", "subtract", INTADD, [P[3], Bv * s], R)], answer: tup(p, q, s, R) }
        : { steps: [st("first", "divide", POLY, [P[0], 1], p), st("second", "divide", POLY, [P[1] - A * p, 1], q), st("remainder", "subtract", INTADD, [P[2] - Bv * p - A * q, P[3] - Bv * q], `${pl([s, R])}`)], answer: tup(p, q, s, R) };
    },
    // independent: d(x) q(x) + r(x) must equal p(x) at five points (the forms make deg r < deg d)
    validate: (pp, v) => {
      const [k, A, Bv] = pp;
      const t = nums(v);
      if (!t || t.length !== 4) return false;
      const P = divDividend(pp);
      return [-2.2, -0.9, 0.4, 1.6, 2.7].every((x) => close(horner(P, x), k === 0 ? (A * x + Bv) * horner(t.slice(0, 3), x) + t[3] : (x * x + A * x + Bv) * (t[0] * x + t[1]) + t[2] * x + t[3]));
    },
    bugs: (pp) => {
      const [k, A, Bv, p, q, s, R] = pp;
      const P = divDividend(pp);
      if (k === 0) {
        const r = Bv / A;
        const b0 = P[0];
        const b1 = P[1] + r * b0;
        const b2 = P[2] + r * b1;
        const rem = P[3] + r * b2;
        return keepBugs([
          B("not-divided-by-a", "procedural", POLY, `Synthetic division was done with x = ${Q(-Bv / A)}, but the bottom row was not divided by ${A}; that row is ${A} times the quotient.`, tup(A * p, A * q, A * s, R)),
          B("root-sign", "procedural", FT, `x = ${Q(Bv / A)} was used in the synthetic division; the divisor ${pl([A, Bv])} is zero at x = ${Q(-Bv / A)}.`, tup(b0 / A, b1 / A, b2 / A, rem)),
        ]);
      }
      const q0 = P[1] + A * p;
      return keepBugs([B("added-not-subtracted", "procedural", INTADD, "Each line was added instead of subtracted during the long division; after multiplying the divisor by the quotient term, change its signs and add.", tup(p, q0, P[2] + Bv * p + A * q0, P[3] + Bv * q0))]);
    },
    distractors: ([, , , p, q, s, R]) => [tup(p, q, s, -R), tup(p, -q, s, R), tup(p, q, s + 1, R)],
    variants: () => [],
    explain: (s) => (s.id === "remainder" ? `What is left is the remainder: ${typeof s.value === "number" ? N(s.value) : s.value}` : `Next quotient coefficient: ${N(Number(s.inputs[0]))} ÷ ${N(Number(s.inputs[1]))} = ${Q(Number(s.value))}`),
    domain: [[0, 1], [-5, 5], [-5, 5], [1, 3], [-5, 5], [-5, 5], [-9, 9]],
    cap: 400,
    difficulty: ([k, , Bv]) => (k === 0 ? (Bv > 0 ? 2 : 3) : Bv > 0 ? 2 : 3),
    teach: {
      idea: "For any polynomials p(x) and d(x) ≠ 0 there are a quotient q(x) and a remainder r(x) with p(x) = d(x)q(x) + r(x) and deg r < deg d (the division algorithm).",
      method: "Long division: divide the leading term of what is left by the leading term of d(x), multiply d(x) by it, subtract, and repeat until the degree of what is left is less than that of d(x). For Ax + B, synthetic division at x = −B/A gives A times the quotient.",
      alternatives: [
        { id: "synthetic", title: "Synthetic division for Ax + B", kind: "procedural", text: ["Do synthetic division with x = −B/A: the last number is the remainder.", "Divide the other numbers of the bottom row by A to get the quotient's coefficients."] },
        { id: "compare", title: "Compare coefficients", kind: "conceptual", text: ["Write p(x) = d(x)(ax² + bx + c) + r (or the quadratic-divisor form) with unknown letters.", "Multiply out and match the coefficients of each power from the top down."] },
      ],
    },
    limits: "Cubics divided by Ax + B (A = 2, 3) or by a monic quadratic, with whole-number quotients and remainders.",
  },
  // ============================================================ gap@1: factorising trinomials by splitting the middle term
  {
    id: "alsplit",
    arity: 5,
    title: "Splitting the middle term of ax² + bx + c",
    competency: FAC,
    type: "set",
    // [kind, m, p, n, q]: (mx + p)(nx + q); kind 0 the two numbers that split bx, kind 1 the zeros
    parse: none,
    reject: (pp) => {
      if (!inR(pp, [[0, 1], [1, 4], [-6, 6], [1, 4], [-6, 6]])) return "(mx + p)(nx + q) with m, n from 1 to 4 and p, q from −6 to 6.";
      const [k, m, p, n, q] = pp;
      if (p === 0 || q === 0 || m * n < 2 || gcd(m, Math.abs(p)) !== 1 || gcd(n, Math.abs(q)) !== 1) return "A non-monic trinomial whose factors have no common number factor.";
      if (m < n || (m === n && p >= q)) return "Each trinomial once (the factors in a fixed order).";
      if (m * q + n * p === 0) return "The middle term must not be zero.";
      return k === 0 ? (m * q === n * p ? "The two parts of the middle term must differ." : null) : p * n === q * m ? "Two different zeros." : null;
    },
    prompt: ([k, m, p, n, q]) => {
      const T = [m * n, m * q + n * p, p * q];
      return k === 0
        ? `To factorise ${pl(T)} by splitting the middle term, ${pl([T[1], 0])} is written as rx + sx, where r + s = ${N(T[1])} and rs = ${N(T[0])} × ${par(T[2])} = ${N(T[0] * T[2])}. Find r and s. Enter both, separated by a comma.`
        : `Factorise ${pl(T)} by splitting the middle term, and hence find the zeros of the polynomial. Enter both, separated by a comma (fractions are fine).`;
    },
    solve: ([k, m, p, n, q]) => {
      const T = [m * n, m * q + n * p, p * q];
      return {
        steps: [st("product", "multiply", IMUL, [T[0], T[2]], T[0] * T[2]), st("split", "factorise", FAC, [T[1]], [m * q, n * p]), ...(k === 1 ? [st("factors", "factorise", FAC, [pl(T)], `(${pl([m, p])})(${pl([n, q])})`), st("zeros", "solve", LIN, [m, p, n, q], [-p / m, -q / n])] : [])],
        answer: k === 0 ? [m * q, n * p] : [-p / m, -q / n],
      };
    },
    // independent: kind 0 checks the sum and product; kind 1 substitutes each zero into the trinomial
    validate: ([k, m, p, n, q], v) => {
      const T = [m * n, m * q + n * p, p * q];
      if (!Array.isArray(v) || v.length !== 2 || close(v[0], v[1])) return false;
      return k === 0 ? close(v[0] + v[1], T[1]) && close(v[0] * v[1], T[0] * T[2]) : v.every((x) => close(horner(T, x), 0));
    },
    bugs: ([k, m, p, n, q]) => {
      const T = [m * n, m * q + n * p, p * q];
      if (k === 0) {
        let pair: number[] | null = null;
        for (let r = -60; r <= 60 && !pair; r++) if (r * (T[1] - r) === T[2] && r <= T[1] - r) pair = [r, T[1] - r];
        return keepBugs([B("product-c-only", "procedural", FAC, `rs was taken as ${N(T[2])} (the constant term only); when the x² coefficient is not 1, rs = a × c.`, pair && !(pair.includes(m * q) && pair.includes(n * p)) ? pair : null)]);
      }
      return keepBugs([
        B("zero-signs", "procedural", LIN, "The numbers in the brackets were taken as the zeros; mx + p = 0 gives x = −p/m, so the sign changes.", [p / m, q / n]),
        B("not-divided", "procedural", LIN, "The coefficient of x in each bracket was ignored; mx + p = 0 gives x = −p/m, not −p.", m > 1 || n > 1 ? [-p, -q] : null),
      ]);
    },
    variants: () => [],
    explain: (s) => (s.id === "product" ? `a × c = ${s.inputs[0]} × ${par(Number(s.inputs[1]))} = ${s.value}` : s.id === "split" ? `Two numbers with sum ${N(Number(s.inputs[0]))} and product a × c: ${(s.value as number[]).map(N).join(" and ")}` : s.id === "factors" ? `Group in pairs and take out common factors: ${s.inputs[0]} = ${s.value}` : `Each bracket equal to 0: x = ${(s.value as number[]).map(Q).join(" or x = ")}`),
    domain: [[0, 1], [1, 4], [-6, 6], [1, 4], [-6, 6]],
    cap: 400,
    difficulty: ([k, m, p, n, q]) => (k === 0 && p > 0 && q > 0 ? 1 : k === 0 || m * n <= 3 ? 2 : 3),
    teach: {
      idea: "If ax² + bx + c = (mx + p)(nx + q), then a × c = (mn)(pq) = (mq)(np), and b = mq + np. So bx splits into two parts whose product is ac.",
      method: "Find two numbers with sum b and product a × c. Write bx as the sum of those two terms, group the four terms in pairs, take out the common factor of each pair, and then the common bracket.",
      alternatives: [
        { id: "list", title: "List the factor pairs of ac", kind: "procedural", text: ["Write all pairs of whole numbers whose product is a × c (with signs).", "Pick the pair that adds up to b."] },
      ],
    },
    limits: "Non-monic trinomials (mx + p)(nx + q) with m, n up to 4; factorising with identities and the synthetic-division method are in other families.",
  },
  // ============================================================ gap@1: GCD and LCM of polynomials (more, and GCD × LCM)
  {
    id: "algcd3",
    arity: 5,
    title: "GCD of cubics, and of three polynomials",
    competency: GL,
    type: "exact",
    mc: true,
    // [kind, a, b, c, d]: kind 0 GCD of (x+a)(x+b)(x+c) and (x+a)(x+b)(x+d); kind 1 GCD of (x+a)(x+b), (x+a)(x+c) and
    // (x+a)(x+b)(x+d)
    parse: none,
    reject: (pp) => {
      if (!inR(pp, [[0, 1], [-5, 5], [-5, 5], [-5, 5], [-5, 5]])) return "Factors x + a … x + d with a, b, c, d from −5 to 5.";
      const [k, a, b, c, d] = pp;
      if ([a, b, c, d].includes(0) || new Set([a, b, c, d]).size !== 4) return "Four different non-zero numbers.";
      return k === 0 && !(a < b && c < d) ? "Each pair once (a < b and c < d)." : null;
    },
    prompt: (pp) => (pp[0] === 0 ? `Find the GCD of ${gcdPolys(pp).map(pl).join(" and ")}.` : `Find the GCD of ${gcdPolys(pp).map(pl).join(", ")}.`).replace(/, ([^,]*)\.$/, " and $1."),
    solve: ([k, a, b, c, d]) => {
      const ans = k === 0 ? `(${pl([1, a])})(${pl([1, b])})` : pl([1, a]);
      return { steps: [st("factorise", "factorise", FAC, [k], k === 0 ? `(${pl([1, a])})(${pl([1, b])})(${pl([1, c])}), (${pl([1, a])})(${pl([1, b])})(${pl([1, d])})` : `(${pl([1, a])})(${pl([1, b])}), (${pl([1, a])})(${pl([1, c])}), (${pl([1, a])})(${pl([1, b])})(${pl([1, d])})`), st("common", "compare", GL, [], ans)], answer: ans };
    },
    // independent: the zeros all the polynomials share, found by searching −20 … 20, give the monic GCD
    validate: (pp, v) => {
      const Ps = gcdPolys(pp);
      const common = [...Array(41).keys()].map((i) => i - 20).filter((t) => Ps.every((P) => horner(P, t) === 0));
      return common.length > 0 && [-1.3, 0.6, 2.2, 3.7].every((x) => close(at(v, x), common.reduce((s, z) => s * (x - z), 1)));
    },
    bugs: ([k, a, b, c, d]) =>
      k === 0
        ? [
            B("one-common-factor", "procedural", GL, "Only one shared factor was taken; both polynomials also share a second factor, and the GCD takes every common factor.", pl([1, a])),
            B("lcm-instead", "conceptual", GL, "Every factor was multiplied together: that is the LCM; the GCD keeps only the factors they share.", `(${pl([1, a])})(${pl([1, b])})(${pl([1, c])})(${pl([1, d])})`),
          ]
        : [
            B("two-only", "procedural", GL, "The common factors of the first and last polynomials only were taken; the GCD must divide all three.", `(${pl([1, a])})(${pl([1, b])})`),
            B("factor-sign", "procedural", FAC, "A factor was written with the wrong sign; check by expanding the brackets back.", pl([1, -a])),
          ],
    distractors: ([k, a, b, c]) => [pl([1, -b]), `(${pl([1, a])})(${pl([1, c])})`, pl([1, a + 1])],
    variants: () => [],
    explain: (s) => (s.id === "factorise" ? `Factorise each: ${s.value}` : `The factors in all of them: ${s.value}`),
    domain: [[0, 1], [-5, 5], [-5, 5], [-5, 5], [-5, 5]],
    cap: 300,
    difficulty: ([k, a, b]) => (k === 0 && a > 0 && b > 0 ? 2 : 3),
    teach: {
      idea: "The GCD of several polynomials is the product of the factors common to ALL of them, each with the smallest power in which it appears.",
      method: "Factorise every polynomial completely (try small numbers as zeros for the cubics), list the factors, and multiply those that appear in every list.",
      alternatives: [
        { id: "two-at-a-time", title: "Two at a time", kind: "procedural", text: ["Find the GCD of the first two polynomials.", "Then find the GCD of that result and the third polynomial."] },
      ],
    },
    limits: "Monic cubics and quadratics with whole-number zeros from −5 to 5.",
  },
  {
    id: "alglp",
    arity: 4,
    title: "Using GCD × LCM = the product of two polynomials",
    competency: GL,
    type: "exact",
    mc: true,
    // [kind, a, b, c]: p = (x+a)(x+b), q = (x+a)(x+c), GCD x + a, LCM (x+a)(x+b)(x+c); kind 0 find q from p, GCD, LCM;
    // kind 1 find the LCM from the product and the GCD
    parse: none,
    reject: (pp) => (!inR(pp, [[0, 1], [-6, 6], [-6, 6], [-6, 6]]) || pp.slice(1).includes(0) || new Set(pp.slice(1)).size !== 3 || pp[2] >= pp[3] ? "Different non-zero a, b, c from −6 to 6 with b < c." : null),
    prompt: ([k, a, b, c]) =>
      k === 0
        ? `The GCD of two polynomials p(x) and q(x) is ${pl([1, a])} and their LCM is ${pl(mulP(mulP([1, a], [1, b]), [1, c]))}. If p(x) = ${pl(mulP([1, a], [1, b]))}, use GCD × LCM = p(x) × q(x) to find q(x).`
        : `Two polynomials have GCD ${pl([1, a])}, and their product is ${pl(mulP(mulP([1, a], [1, b]), mulP([1, a], [1, c])))}. Use GCD × LCM = (product of the polynomials) to find their LCM.`,
    solve: ([k, a, b, c]) =>
      k === 0
        ? { steps: [st("relation", "rewrite", GL, [], "q(x) = GCD × LCM ÷ p(x)"), st("divide", "divide", POLY, [pl(mulP(mulP([1, a], [1, a]), mulP([1, b], [1, c])))], pl(mulP([1, a], [1, c])))], answer: pl(mulP([1, a], [1, c])) }
        : { steps: [st("relation", "rewrite", GL, [], "LCM = product ÷ GCD"), st("divide", "divide", POLY, [pl([1, a])], pl(mulP(mulP([1, a], [1, b]), [1, c])))], answer: pl(mulP(mulP([1, a], [1, b]), [1, c])) },
    // independent: by zeros: kind 0, the answer must be a monic quadratic whose zeros with p's give exactly the given GCD
    // and LCM; kind 1, the answer must be the monic cubic through the different zeros of the product (found by search)
    validate: ([k, a, b, c], v) => {
      const zs = (P: number[]) => [...Array(41).keys()].map((i) => i - 20).filter((t) => horner(P, t) === 0);
      if (k === 1) {
        const prod = mulP(mulP([1, a], [1, b]), mulP([1, a], [1, c]));
        const z = zs(prod);
        return z.length === 3 && [-1.4, 0.7, 2.3, 3.1].every((x) => close(at(v, x), z.reduce((s, r) => s * (x - r), 1)));
      }
      const cs = coeffsOf(v, 4);
      if (!cs || !close(cs[2], 1) || !close(cs[3], 0)) return false;
      const qz = zs([cs[2], cs[1], cs[0]].map((t) => Math.round(t)));
      const pz = zs(mulP([1, a], [1, b]));
      const common = qz.filter((t) => pz.includes(t));
      const all = [...new Set([...qz, ...pz])];
      return qz.length === 2 && common.length === 1 && common[0] === -a && all.length === 3 && all.includes(-b) && all.includes(-c);
    },
    bugs: ([k, a, b, c]) =>
      k === 0
        ? [
            B("lcm-over-p", "procedural", GL, "The LCM was divided by p(x) but not multiplied by the GCD; q(x) = GCD × LCM ÷ p(x).", pl([1, c])),
            B("lcm-over-gcd", "procedural", GL, "The LCM was divided by the GCD; that gives the factors that are not shared, not q(x).", pl(mulP([1, b], [1, c]))),
          ]
        : [
            B("divided-twice", "procedural", GL, "The product was divided by the GCD twice; LCM = product ÷ GCD, once.", pl(mulP([1, b], [1, c]))),
            B("product-as-lcm", "conceptual", GL, "The product itself was given; it contains the common factor twice, while the LCM contains it once.", pl(mulP(mulP([1, a], [1, b]), mulP([1, a], [1, c])))),
          ],
    distractors: ([k, a, b, c]) => (k === 0 ? [pl(mulP([1, -a], [1, c])), pl(mulP([1, a], [1, b + c]))] : [pl(mulP(mulP([1, -a], [1, b]), [1, c])), pl(mulP(mulP([1, a], [1, b]), [1, -c]))]),
    variants: () => [],
    explain: (s) => (s.id === "relation" ? `Rearrange: ${s.value}` : `Dividing gives ${s.value}`),
    domain: [[0, 1], [-6, 6], [-6, 6], [-6, 6]],
    cap: 300,
    difficulty: ([k, a]) => (k === 1 ? 2 : a > 0 ? 2 : 3),
    teach: {
      idea: "For two polynomials, GCD × LCM = p(x) × q(x) (up to a constant factor): the shared factors are counted once in each of GCD and LCM, and twice in the product.",
      method: "Rearrange the relation for what is unknown (q = GCD × LCM ÷ p, or LCM = product ÷ GCD) and divide by factorising or by long division.",
      alternatives: [
        { id: "factors", title: "Count the factors", kind: "conceptual", text: ["Write p, GCD and LCM as products of brackets.", "q must contain the GCD's factors and the LCM's factors that p does not have."] },
      ],
    },
    limits: "Two monic quadratics with one common linear factor; constant factors are taken as 1.",
  },
  // ============================================================ gap@1: operations on rational expressions
  {
    id: "alrop",
    arity: 5,
    title: "Multiplying, dividing, adding and subtracting rational expressions",
    competency: RATX,
    type: "tuple",
    mc: true,
    // kind 0: (x+a)(x+b)/(x+c) × (x+c)/((x+b)(x+d)); kind 1: (x+a)(x+b)/((x+c)(x+d)) ÷ (x+b)/(x+c) — both (x+a)/(x+d):
    // give (a, d). kind 2: c/(x+a) + d/(x+b); kind 3: c/(x+a) − d/(x+b) — numerator mx + n over (x+a)(x+b): give (m, n)
    parse: none,
    reject: (pp) => {
      if (!inR(pp, [[0, 3], [-6, 6], [-6, 6], [-6, 6], [-6, 6]])) return "Small whole numbers from −6 to 6.";
      const [k, a, b, c, d] = pp;
      if (k <= 1) return [a, b, c, d].includes(0) || new Set([a, b, c, d]).size !== 4 ? "Four different non-zero numbers." : null;
      return a === 0 || b === 0 || a === b || c < 1 || d < 1 || (k === 3 && c === d) || a > b ? "Two different poles (a < b) and numerators from 1 to 6." : null;
    },
    prompt: ([k, a, b, c, d]) => {
      if (k === 0) return `Simplify (${pl(mulP([1, a], [1, b]))})/(${pl([1, c])}) × (${pl([1, c])})/(${pl(mulP([1, b], [1, d]))}). The result can be written as (x + p)/(x + q): give (p, q).`;
      if (k === 1) return `Simplify (${pl(mulP([1, a], [1, b]))})/(${pl(mulP([1, c], [1, d]))}) ÷ (${pl([1, b])})/(${pl([1, c])}). The result can be written as (x + p)/(x + q): give (p, q).`;
      return `Write ${c}/(${pl([1, a])}) ${k === 2 ? "+" : "−"} ${d}/(${pl([1, b])}) as a single fraction with denominator (${pl([1, a])})(${pl([1, b])}). Its numerator is mx + n: give (m, n).`;
    },
    solve: ([k, a, b, c, d]) =>
      k <= 1
        ? { steps: [st("factorise", "factorise", FAC, [k], k === 0 ? `(${pl([1, a])})(${pl([1, b])}) and (${pl([1, b])})(${pl([1, d])})` : `(${pl([1, a])})(${pl([1, b])}) and (${pl([1, c])})(${pl([1, d])})`), st(k === 0 ? "cancel" : "invert", k === 0 ? "divide" : "multiply", RATX, [k], `(${pl([1, a])})/(${pl([1, d])})`)], answer: tup(a, d) }
        : { steps: [st("common", "multiply", RATX, [c, b, d, a], `${c}(${pl([1, b])}) ${k === 2 ? "+" : "−"} ${d}(${pl([1, a])})`), st("collect", "add", SIMP, [], pl([k === 2 ? c + d : c - d, k === 2 ? c * b + d * a : c * b - d * a]))], answer: tup(k === 2 ? c + d : c - d, k === 2 ? c * b + d * a : c * b - d * a) },
    // independent: the answer's fraction must equal the original expression at three points
    validate: ([k, a, b, c, d], v) => {
      const t = nums(v);
      if (!t || t.length !== 2) return false;
      return [0.37, 1.91, 7.3].every((x) => {
        const orig = k === 0 ? (((x + a) * (x + b)) / (x + c)) * ((x + c) / ((x + b) * (x + d))) : k === 1 ? (((x + a) * (x + b)) / ((x + c) * (x + d))) / ((x + b) / (x + c)) : c / (x + a) + (k === 2 ? 1 : -1) * (d / (x + b));
        const mine = k <= 1 ? (x + t[0]) / (x + t[1]) : (t[0] * x + t[1]) / ((x + a) * (x + b));
        return close(orig, mine);
      });
    },
    bugs: ([k, a, b, c, d]) =>
      k <= 1
        ? [B("zero-for-number", "procedural", FAC, `The zeros were written instead of the numbers in the brackets: x ${a < 0 ? "−" : "+"} ${Math.abs(a)} has p = ${N(a)}, not ${N(-a)}.`, tup(-a, -d)), ...(k === 1 ? [B("inverted-first", "procedural", RATX, "The first fraction was turned upside down instead of the second; dividing by a fraction multiplies by the second one inverted.", tup(d, a))] : [])]
        : keepBugs([
            B("cross-swapped", "procedural", RATX, `Each numerator was multiplied by its own denominator's number; ${c}/(${pl([1, a])}) becomes ${c}(${pl([1, b])}) over the common denominator — it is multiplied by the OTHER bracket.`, tup(k === 2 ? c + d : c - d, k === 2 ? c * a + d * b : c * a - d * b)),
            ...(k === 3 ? [B("minus-not-distributed", "procedural", INTADD, `The minus sign was applied to ${d}x only; −${d}(${pl([1, a])}) = −${d}x ${a > 0 ? "−" : "+"} ${Math.abs(d * a)}.`, tup(c - d, c * b + d * a))] : []),
          ]),
    distractors: ([k, a, b, c, d]) => (k <= 1 ? [tup(d, a), tup(a, b), tup(a + d, d)] : [tup(c * d, c * b + d * a), tup(k === 2 ? c + d : c - d, c + d)]),
    variants: () => [],
    explain: (s) => (s.id === "factorise" ? `Factorise: ${s.value}` : s.id === "cancel" ? `Cancel the factors in both the top and the bottom: ${s.value}` : s.id === "invert" ? `Multiply by the second fraction turned upside down and cancel: ${s.value}` : s.id === "common" ? `Over the common denominator the numerator is ${s.value}` : `Collect terms: ${s.value}`),
    domain: [[0, 3], [-6, 6], [-6, 6], [-6, 6], [-6, 6]],
    cap: 400,
    difficulty: ([k]) => (k === 2 ? 1 : k === 0 ? 2 : 3),
    teach: {
      idea: "Rational expressions follow the rules of fractions: multiply tops and bottoms, divide by multiplying by the reciprocal, and add or subtract over a common denominator. Only common FACTORS cancel.",
      method: "Factorise every numerator and denominator first. For × and ÷ cancel the shared brackets; for + and − multiply each numerator by the other denominator's bracket, then collect terms.",
      alternatives: [
        { id: "number-check", title: "Check with a number", kind: "conceptual", text: ["Put x = 1 (or another value that does not make a denominator 0) into the question and into your answer.", "Both must give the same number."] },
      ],
    },
    limits: "Expressions built from monic linear factors with whole numbers from −6 to 6; the answer is asked as numbers so that the unsimplified form cannot count.",
  },
  // ============================================================ gap@1: parameters from the discriminant
  {
    id: "aldisk",
    arity: 3,
    title: "The value of k for equal roots",
    competency: ZER,
    type: "fraction",
    mc: true,
    // [form, p, q]: form 0 px² + kx + q (k > 0); form 1 kx² + px + q; form 2 px² + qx + k
    parse: none,
    reject: ([f, p, q]) => {
      if (!inR([f, p, q], [[0, 2], [-12, 12], [-12, 12]])) return "Small whole coefficients from −12 to 12.";
      if (p === 0 || q === 0) return "Non-zero coefficients.";
      return f === 0 && (p < 1 || p > 6 || q < 1 || !isSq(p * q)) ? "p from 1 to 6 and q positive with pq a perfect square (so k is a whole number)." : null;
    },
    prompt: ([f, p, q]) => {
      const e = f === 0 ? `${pl([p, 0, 0])} + kx + ${q}` : f === 1 ? `kx² ${p < 0 ? "−" : "+"} ${Math.abs(p) === 1 ? "" : Math.abs(p)}x ${q < 0 ? "−" : "+"} ${Math.abs(q)}` : `${pl([p, q, 0])} + k`;
      return `For which ${f === 0 ? "positive " : ""}value of k does the equation ${e} = 0 have two equal (repeated) roots? (A fraction is fine.)`;
    },
    solve: ([f, p, q]) => {
      const k = f === 0 ? 2 * Math.sqrt(p * q) : f === 1 ? (p * p) / (4 * q) : (q * q) / (4 * p);
      return { steps: [st("disc", "write", ZER, [f, p, q], f === 0 ? `k² − 4 × ${p} × ${q} = 0` : f === 1 ? `${p * p} − 4 × k × ${par(q)} = 0` : `${q * q} − 4 × ${p} × k = 0`), st("solve", "solve", LIN, [f], k)], answer: k };
    },
    // independent: with this k the quadratic's value at its turning point x = −b/(2a) must be 0 (a repeated root)
    validate: ([f, p, q], v) => {
      if (typeof v !== "number" || !Number.isFinite(v)) return false;
      const [A, Bc, C] = f === 0 ? [p, v, q] : f === 1 ? [v, p, q] : [p, q, v];
      if (A === 0) return false;
      const x = -Bc / (2 * A);
      return (f !== 0 || v > 0) && Math.abs(A * x * x + Bc * x + C) < 1e-9 * Math.max(1, Math.abs(C));
    },
    bugs: ([f, p, q]) => {
      const k = f === 0 ? 2 * Math.sqrt(p * q) : f === 1 ? (p * p) / (4 * q) : (q * q) / (4 * p);
      const w = (x: number) => (close(x, k) ? null : x);
      return keepBugs([
        B("four-dropped", "recall", ZER, "The 4 in b² − 4ac was left out.", f === 0 ? w(Math.sqrt(p * q)) : f === 1 ? w((p * p) / q) : w((q * q) / p)),
        B("discriminant-sign", "recall", ZER, "The discriminant was written b² + 4ac; it is b² − 4ac.", f === 0 ? null : f === 1 ? w(-(p * p) / (4 * q)) : w(-(q * q) / (4 * p))),
        ...(f === 0 ? [B("no-square-root", "procedural", SQRT, "k² was found but its square root was not taken.", w(4 * p * q))] : []),
      ]);
    },
    distractors: ([f, p, q]) => {
      const k = f === 0 ? 2 * Math.sqrt(p * q) : f === 1 ? (p * p) / (4 * q) : (q * q) / (4 * p);
      return [k + 1, 2 * k, k / 2].filter((x) => !close(x, k));
    },
    variants: () => [],
    explain: (s) => (s.id === "disc" ? `Equal roots when the discriminant b² − 4ac = 0: ${s.value}` : `So k = ${Q(Number(s.value))}`),
    domain: [[0, 2], [-12, 12], [-12, 12]],
    cap: 300,
    difficulty: ([f]) => (f === 0 ? 1 : 2),
    teach: {
      idea: "A quadratic ax² + bx + c = 0 has two equal real roots exactly when its discriminant b² − 4ac is 0 (two different real roots when it is positive, none when negative).",
      method: "Write b² − 4ac with k in its place, set it equal to 0 and solve for k (take the positive square root if a positive k is asked).",
      alternatives: [
        { id: "perfect-square", title: "Make a perfect square", kind: "conceptual", text: ["Equal roots means the quadratic is a constant times (x − r)².", "For x² + kx + 9 that is (x + 3)² = x² + 6x + 9, so k = 6."] },
      ],
    },
    limits: "Equal roots only; conditions for real or no real roots (inequalities in k) are not here.",
  },
  // ============================================================ gap@1: area of a quadrilateral from its vertices
  {
    id: "alquad",
    arity: 8,
    title: "The area of a quadrilateral from its vertices",
    competency: PA,
    type: "fraction",
    mc: true,
    // [a1, b1, a2, b2, a3, b3, a4, b4]: A(−a1, −b1), B(a2, −b2), C(a3, b3), D(−a4, b4), one in each quadrant
    parse: none,
    reject: (p) => (!inR(p, [[1, 4], [1, 4], [1, 4], [1, 4], [1, 4], [1, 4], [1, 4], [1, 4]]) ? "One vertex in each quadrant with coordinates from 1 to 4 in size." : null),
    prompt: (p) => {
      const V = quadV(p);
      return `Find the area of the quadrilateral ABCD with vertices A${tup(...V[0])}, B${tup(...V[1])}, C${tup(...V[2])} and D${tup(...V[3])}, in square units.`;
    },
    solve: (p) => {
      const S = quadS(quadV(p));
      return { steps: [st("sum", "evaluate", PA, p, S), st("half", "divide", TAREA, [S, 2], Math.abs(S) / 2)], answer: Math.abs(S) / 2 };
    },
    // independent: split ABCD into the four triangles OAB, OBC, OCD, ODA (the origin is inside) and find each by Pick's
    // theorem
    validate: (p, v) => {
      const V = quadV(p);
      const O: P2 = [0, 0];
      return typeof v === "number" && close(v, [0, 1, 2, 3].reduce((s, i) => s + pickArea([O, V[i], V[(i + 1) % 4]]), 0));
    },
    bugs: (p) => {
      const V = quadV(p);
      const S = Math.abs(quadS(V));
      const crossed = Math.abs(quadS([V[0], V[2], V[1], V[3]])) / 2;
      const fwd = Math.abs(V.reduce((s, P, i) => s + P[0] * V[(i + 1) % 4][1], 0)) / 2;
      return keepBugs([
        B("no-half", "procedural", TAREA, "The ½ in front of the formula was left out.", S),
        B("not-in-order", "procedural", PA, "The vertices were not taken in order round the quadrilateral (A, C, B, D); go round the boundary A → B → C → D.", crossed !== S / 2 ? crossed : null),
        B("forward-only", "procedural", PA, "Only the products x₁y₂, x₂y₃, x₃y₄, x₄y₁ were added; the products the other way round must be taken away.", fwd !== S / 2 ? fwd : null),
      ]);
    },
    variants: () => [],
    explain: (s) => (s.id === "sum" ? `(x₁y₂ − x₂y₁) + (x₂y₃ − x₃y₂) + (x₃y₄ − x₄y₃) + (x₄y₁ − x₁y₄) = ${N(Number(s.value))}` : `Area = ½ × |${N(Number(s.inputs[0]))}| = ${Q(Number(s.value))}`),
    figure: (p) => {
      const V = quadV(p);
      return { type: "plane", points: V.map((P, i) => [P[0], P[1], "ABCD"[i]]), segments: V.map((P, i) => [P, V[(i + 1) % 4]]), range: 5 };
    },
    domain: [[1, 4], [1, 4], [1, 4], [1, 4], [1, 4], [1, 4], [1, 4], [1, 4]],
    cap: 300,
    range: [0, Infinity],
    difficulty: (p) => (Math.abs(quadS(quadV(p))) % 2 === 0 ? 2 : 3),
    word: (p) => {
      const V = quadV(p);
      return `A farmer's field has corners at ${V.map((P) => tup(...P)).join(", ")} (in that order round the field) on a map where 1 unit is 10 m. What is its area in square units of the map?`;
    },
    teach: {
      idea: "Area = ½ |(x₁y₂ − x₂y₁) + (x₂y₃ − x₃y₂) + (x₃y₄ − x₄y₃) + (x₄y₁ − x₁y₄)| when the vertices are taken in order round the quadrilateral; it is the sum of the two triangles ABC and ACD.",
      method: "List the vertices in order (and the first again at the end), multiply across in both directions, take the difference, the absolute value and half.",
      alternatives: [
        { id: "two-triangles", title: "Split into two triangles", kind: "conceptual", text: ["Draw the diagonal AC: ABCD is triangle ABC plus triangle ACD.", "Find each area with the triangle formula and add."] },
      ],
    },
    limits: "Quadrilaterals with one vertex in each quadrant (so the vertices in order go round the origin); whole-number coordinates up to 4 in size.",
  },
  // ============================================================ gap@1: linear growth and decay; infinitely many solutions
  {
    id: "alpred",
    arity: 4,
    title: "Steady increase or decrease: a linear polynomial to predict",
    competency: L2,
    type: "integer",
    mc: true,
    // [ctx, S, r, T]: a quantity starting at S and changing by r each step (ctx 0–3 increase, 4–7 decrease); value after T
    parse: none,
    reject: (p) => {
      if (!inR(p, [[0, 7], [20, 200], [2, 15], [2, 12]])) return "A start from 20 to 200, a steady change of 2 to 15 per step, after 2 to 12 steps.";
      const [c, S, r, T] = p;
      return c >= 4 && S - r * T <= 0 ? "The amount must stay above 0." : c === 7 && S > 100 ? "A battery charge is at most 100%." : null;
    },
    prompt: ([c, S, r, T]) => `${PRED[c].say(S, r, nm(S + r))} Write the linear polynomial that gives the ${PRED[c].what} after t ${PRED[c].unit}, and use it to find the ${PRED[c].what} after ${T} ${PRED[c].unit}${PRED[c].ask}.`,
    solve: ([c, S, r, T]) => {
      const sg = c >= 4 ? -1 : 1;
      return { steps: [st("model", "write", L2, [S, sg * r], pl([sg * r, S], "t")), st("predict", "evaluate", L2, [T], S + sg * r * T)], answer: S + sg * r * T };
    },
    // independent: step through the T steps one at a time
    validate: ([c, S, r, T], v) => {
      let x = S;
      for (let i = 0; i < T; i++) x += c >= 4 ? -r : r;
      return v === x;
    },
    bugs: ([c, S, r, T]) => {
      const sg = c >= 4 ? -1 : 1;
      return keepBugs([
        B("wrong-direction", "conceptual", L2, c >= 4 ? "The steady change was added; the amount goes DOWN each step, so the coefficient of t is negative." : "The steady change was taken away; the amount goes UP each step.", S - sg * r * T > 0 ? S - sg * r * T : null),
        B("start-left-out", "conceptual", L2, "Only the change r × t was worked out; the polynomial also needs the starting amount as its constant term.", sg * r * T),
        B("one-step-short", "procedural", L2, `The change was counted ${T - 1} times; after ${T} ${PRED[c].unit} it has happened ${T} times.`, S + sg * r * (T - 1)),
      ]);
    },
    variants: () => [],
    explain: (s) => (s.id === "model" ? `The ${s.inputs[1] < 0 ? "decrease" : "increase"} is the same each step, so p(t) = ${s.value}` : `p(${s.inputs[0]}) = ${N(Number(s.value))}`),
    domain: [[0, 7], [20, 200], [2, 15], [2, 12]],
    cap: 400,
    difficulty: ([c, , , T]) => (c < 4 && T <= 6 ? 1 : c < 4 || T <= 6 ? 2 : 3),
    teach: {
      idea: "A quantity that changes by the same amount every step is modelled by a linear polynomial p(t) = (start) + (change per step) × t; the change is negative for a steady decrease (linear decay).",
      method: "Read the starting amount (the value when t = 0) and the change per step with its sign, write p(t) = start + change × t, and substitute the number of steps.",
      alternatives: [
        { id: "table", title: "Make a table", kind: "procedural", text: ["Write t = 0, 1, 2, 3 and the amount each time: the amounts go up (or down) by the same step.", "The pattern start + step × t gives every row; use it for the t asked."] },
      ],
    },
    limits: "Whole-number starts and steps; when the amount would reach 0 the question is not asked.",
  },
  {
    id: "alinf",
    arity: 5,
    title: "Solutions of a linear equation in two variables",
    competency: L2,
    type: "choice",
    // [a, b, x0, y0, m]: ax + by = a x0 + b y0; the first person offers (x0, y0) (right when m is 0 or 1, else y0 + 1),
    // the second (x0 + b, y0 − a) (right when m is 0 or 2, else y − a + 1)
    parse: none,
    reject: (p) => (!inR(p, [[1, 6], [1, 6], [0, 5], [0, 6], [0, 3]]) || gcd(p[0], p[1]) !== 1 ? "ax + by = c with a, b from 1 to 6 (no common factor) and two offered pairs." : null),
    prompt: (p) => {
      const [a, b, x0, y0] = p;
      const [K, R] = infPairs(p);
      const [n1, n2] = infNames(p);
      return `For the equation ${eq2(a, b, a * x0 + b * y0)}, ${n1} says (${N(K[0])}, ${N(K[1])}) is a solution and ${n2} says (${N(R[0])}, ${N(R[1])}) is a solution. Who is right?`;
    },
    choices: (p) => {
      const [n1, n2] = infNames(p);
      return ["Both are right: an equation like this has infinitely many solutions", `Only ${n1} is right`, `Only ${n2} is right`, "Neither is right"];
    },
    solve: (p) => ({ steps: [st("substitute", "substitute", L2, [p[0], p[1]], p[4])], answer: p[4] }),
    // independent: substitute each pair into the equation
    validate: (p, v) => {
      const [a, b, x0, y0] = p;
      const c = a * x0 + b * y0;
      const [K, R] = infPairs(p);
      const k = a * K[0] + b * K[1] === c;
      const r = a * R[0] + b * R[1] === c;
      return v === (k && r ? 0 : k ? 1 : r ? 2 : 3);
    },
    bugs: (p) => [p[4] === 0 ? B("one-solution-only", "conceptual", L2, "A linear equation in two variables was thought to have only one solution, so a second, different pair was rejected; there are infinitely many pairs, all on one straight line.", 1) : B("not-substituted", "procedural", L2, "A pair was accepted without substituting it into the equation; put x and y in and check that both sides are equal.", 0)],
    variants: () => [],
    explain: (s) => `Substitute each pair into the equation: ${["both make it true", "only the first does", "only the second does", "neither does"][Number(s.value)]}`,
    domain: [[1, 6], [1, 6], [0, 5], [0, 6], [0, 3]],
    cap: 300,
    difficulty: ([, , , , m]) => (m === 0 ? 2 : m === 3 ? 3 : 1),
    teach: {
      idea: "A linear equation in two variables has infinitely many solutions: each value of x gives one y. All the solutions lie on one straight line.",
      method: "To test a pair, substitute x and y and check that the left side equals the right side. Finding one solution does not rule out others.",
      alternatives: [
        { id: "step-along", title: "Step along the line", kind: "conceptual", text: ["From one solution (x, y) of ax + by = c, the pair (x + b, y − a) is also a solution: ab is added and taken away.", "Repeating this gives as many solutions as you like."] },
      ],
    },
    limits: "Positive coefficients up to 6 and small whole-number pairs.",
  },
  // ============================================================ gap@1: the named methods for a pair of linear equations
  {
    id: "almeth",
    arity: 7,
    title: "Substitution, elimination and cross-multiplication: the key step",
    competency: SYS,
    type: "choice",
    // [m, a1, b1, a2, b2, x, y]: m 0 substitution (b1 = 1), 1 elimination of y, 2 cross-multiplication
    parse: none,
    reject: (p) => {
      if (!inR(p, [[0, 2], [1, 5], [-4, 4], [1, 5], [-4, 4], [-5, 5], [-5, 5]])) return "Two equations with small whole coefficients and a whole-number solution.";
      return methOk(p) ? null : "Both equations contain y, the lines cross, and the four options are different with only one giving the solution.";
    },
    prompt: (p) => {
      const [m, a1, b1, a2, b2, x, y] = p;
      const c1 = a1 * x + b1 * y;
      const c2 = a2 * x + b2 * y;
      if (m === 0) return `Solve ${eq2(a1, b1, c1)} and ${eq2(a2, b2, c2)} by substitution: make y the subject of the first equation and substitute it into the second. Which equation in x do you get after simplifying?`;
      if (m === 1) return `Solve ${eq2(a1, b1, c1)} … (1) and ${eq2(a2, b2, c2)} … (2) by elimination: multiply (1) by ${N(b2)} and (2) by ${N(b1)}, then subtract (2) from (1) to eliminate y. Which equation in x do you get?`;
      return `Solve ${lin([[a1, "x"], [b1, "y"], [-c1, ""]])} = 0 and ${lin([[a2, "x"], [b2, "y"], [-c2, ""]])} = 0 by cross-multiplication. Which is the correct cross-multiplication statement?`;
    },
    choices: (p) => perm(p, 4).map((i) => methOpts(p)[i].text),
    solve: (p) => ({ steps: [st("method", "rewrite", SYS, [p[0]], methOpts(p)[0].text), st("solve", "solve", LIN, [], tup(p[5], p[6]))], answer: perm(p, 4).indexOf(0) }),
    // independent: solve the chosen option for x (and y), and substitute into both original equations
    validate: (p, v) => {
      if (typeof v !== "number") return false;
      const opts = perm(p, 4).map((i) => methOpts(p)[i]);
      const good = opts.map((o) => {
        const [a1, b1, a2, b2, x, y] = p.slice(1);
        const c1 = a1 * x + b1 * y;
        const c2 = a2 * x + b2 * y;
        const [X, Y] = o.sol(c1);
        return Number.isFinite(X) && Number.isFinite(Y) && close(a1 * X + b1 * Y, c1) && close(a2 * X + b2 * Y, c2);
      });
      return good[v] === true && good.filter(Boolean).length === 1;
    },
    bugs: (p) => methOpts(p).slice(1).map((o, j) => B(o.id, "procedural", p[0] === 1 ? SYS : p[0] === 0 ? LIN : SYS, o.says, perm(p, 4).indexOf(j + 1))),
    variants: () => [],
    explain: (s) => (s.id === "method" ? `${["Substituting", "Eliminating y", "Cross-multiplying"][Number(s.inputs[0])]} gives ${s.value}` : `which leads to the solution ${s.value}`),
    domain: [[0, 2], [1, 5], [-4, 4], [1, 5], [-4, 4], [-5, 5], [-5, 5]],
    cap: 450,
    difficulty: ([m]) => (m === 0 ? 1 : m === 1 ? 2 : 3),
    teach: {
      idea: "Substitution replaces y by an expression in x; elimination scales the equations so that one variable has equal coefficients and subtracts; cross-multiplication uses x/(b₁c₂ − b₂c₁) = y/(c₁a₂ − c₂a₁) = 1/(a₁b₂ − a₂b₁) for a₁x + b₁y + c₁ = 0.",
      method: "Follow the method step by step: write the expression or the multiplied equations in full, keep every sign (a bracket multiplies every term inside), and simplify to an equation in x alone (or the three ratios).",
      alternatives: [
        { id: "arrow", title: "The cross-multiplication arrows", kind: "procedural", text: ["Write the coefficients b₁, c₁, a₁, b₁ above b₂, c₂, a₂, b₂.", "Each denominator is (down-right product) − (up-right product) of a neighbouring pair: b₁c₂ − b₂c₁, then c₁a₂ − c₂a₁, then a₁b₂ − a₂b₁."] },
      ],
    },
    limits: "The key step of each named method as a choice; writing out a whole solution by a named method is marked by an educator.",
  },
  {
    id: "alkcase",
    arity: 6,
    title: "The value of k for no solution or infinitely many",
    competency: SYS,
    type: "integer",
    mc: true,
    // [cs, a1, b1, c1, m, d]: second equation built from m × the first; cs 0: (m a1)x + ky = m c1 + d (no solution);
    // cs 1: (m a1)x + (m b1)y = k (infinitely many; d = 1); cs 2: kx + (m b1)y = m c1 + d (no solution)
    parse: none,
    reject: (p) => (!inR(p, [[0, 2], [1, 6], [-6, 6], [1, 12], [2, 4], [-3, 3]]) || p[2] === 0 || p[5] === 0 || (p[0] === 1 && p[5] !== 1) ? "a₁x + b₁y = c₁ and a second equation built from it with one unknown k." : null),
    prompt: ([cs, a1, b1, c1, m, d]) => {
      const e2 = cs === 0 ? `${pl([m * a1, 0], "x")} + ky = ${N(m * c1 + d)}` : cs === 1 ? `${eq2(m * a1, m * b1, 0).replace(/ = 0$/, "")} = k` : `kx ${m * b1 < 0 ? "−" : "+"} ${Math.abs(m * b1)}y = ${N(m * c1 + d)}`;
      return `For which value of k does the pair of equations ${eq2(a1, b1, c1)} and ${e2} have ${cs === 1 ? "infinitely many solutions" : "no solution"}?`;
    },
    solve: ([cs, a1, b1, c1, m]) => {
      const k = cs === 0 ? m * b1 : cs === 1 ? m * c1 : m * a1;
      return { steps: [st("ratio", "compare", SYS, [cs], cs === 1 ? "a₁/a₂ = b₁/b₂ = c₁/c₂" : "a₁/a₂ = b₁/b₂ ≠ c₁/c₂"), st("solve", "solve", LIN, [m], k)], answer: k };
    },
    // independent: put k back; no solution: the determinant is 0 and a point of the first line is not on the second;
    // infinitely many: two points of the first line both lie on the second
    validate: ([cs, a1, b1, c1, m, d], v) => {
      if (typeof v !== "number") return false;
      const [a2, b2, c2] = cs === 0 ? [m * a1, v, m * c1 + d] : cs === 1 ? [m * a1, m * b1, v] : [v, m * b1, m * c1 + d];
      const P1 = [0, c1 / b1];
      const P2 = [b1, (c1 - a1 * b1) / b1];
      const on = (P: number[]) => close(a2 * P[0] + b2 * P[1], c2);
      return cs === 1 ? on(P1) && on(P2) : close(a1 * b2 - a2 * b1, 0) && !on(P1);
    },
    bugs: ([cs, a1, b1, c1, m]) => {
      const k = cs === 0 ? m * b1 : cs === 1 ? m * c1 : m * a1;
      const w = (x: number) => (x === k || !Number.isInteger(x) ? null : x);
      return keepBugs([
        B("ratio-upside-down", "procedural", SYS, `The ratio was turned upside down: the second equation is ${m} times the first, so its coefficient is ${m} times as big, not ${m} times smaller.`, w((cs === 0 ? b1 : cs === 1 ? c1 : a1) / m)),
        B("coefficients-equal", "conceptual", SYS, "The two coefficients were made equal; the ratios a₁/a₂, b₁/b₂ (and c₁/c₂) must be equal to each other, not the coefficients.", w(cs === 0 ? b1 : cs === 1 ? c1 : a1)),
      ]);
    },
    distractors: ([cs, a1, b1, c1, m]) => {
      const k = cs === 0 ? m * b1 : cs === 1 ? m * c1 : m * a1;
      return [k + 1, -k, k + m].filter((x) => x !== k);
    },
    variants: () => [],
    explain: (s) => (s.id === "ratio" ? `Use ${s.value}` : `The second equation's coefficients are ${s.inputs[0]} times the first's, so k = ${N(Number(s.value))}`),
    domain: [[0, 2], [1, 6], [-6, 6], [1, 12], [2, 4], [-3, 3]],
    cap: 300,
    difficulty: ([cs, , b1]) => (cs === 1 ? 1 : b1 > 0 ? 2 : 3),
    teach: {
      idea: "a₁x + b₁y = c₁ and a₂x + b₂y = c₂ have no solution when a₁/a₂ = b₁/b₂ ≠ c₁/c₂ (parallel lines) and infinitely many when all three ratios are equal (the same line).",
      method: "Write the ratio condition for the case asked, put in the known coefficients, and solve the resulting equation for k. Check that the other ratio does (or does not) match.",
      alternatives: [
        { id: "multiple", title: "Spot the multiple", kind: "conceptual", text: ["If the known coefficients of the second equation are m times those of the first, the unknown one must be m times too.", "Then compare the constants: equal ratio → the same line; different → parallel lines."] },
      ],
    },
    limits: "The second equation is a multiple of the first with one unknown coefficient; conditions for a unique solution (k ≠ value) are not asked separately.",
  },
  {
    id: "alsysx",
    arity: 4,
    title: "Pairs of linear equations from ages, digits, speeds and rectangles",
    competency: SYS,
    type: "tuple",
    mc: true,
    // [kind, u, v, w]: 0 ages (son u, multiple v, w years ago), 1 digits (tens u, units v, w = 1), 2 boat (still water u,
    // stream v, w hours downstream), 3 rectangle (width u, length u + v, w = 1)
    parse: none,
    reject: (p) => (!inR(p, [[0, 3], [1, 20], [0, 15], [1, 5]]) || !sysxOk(p) ? "One of four kinds of problem with numbers in its own range." : null),
    prompt: (p) => sysxText(p),
    solve: (p) => {
      const [x, y] = sysxAns(p);
      return { steps: [st("model", "write", SYS, [p[0]], sysxEqs(p)), st("solve", "solve", SYS, [], tup(x, y))], answer: tup(x, y) };
    },
    // independent: the pair must satisfy both conditions as stated in the problem
    validate: (p, v) => {
      const t = nums(v);
      return !!t && t.length === 2 && sysxCheck(p, t[0], t[1]);
    },
    bugs: (p) => {
      const [kind, u, v, w] = p;
      const [x, y] = sysxAns(p);
      const out: Bug[] = [B("swapped", "procedural", SYS, "The two values were given in the wrong order; check the order the question asks for.", x !== y ? tup(y, x) : null)];
      if (kind === 0) {
        // x − w = v·y (the son's age not reduced) with x + y = S
        const yy = (x + y - w) / (v + 1);
        out.push(B("years-one-side", "procedural", SYS, `${w} ${w === 1 ? "year was" : "years were"} taken from the father's age only; ${w} ${w === 1 ? "year" : "years"} ago the son was younger too.`, Number.isInteger(yy) && yy !== y ? tup(x + y - yy, yy) : null));
      }
      if (kind === 2) out.push(B("not-halved", "procedural", SYS, "The stream's speed was taken as the difference of the two speeds; the downstream speed is u + v and the upstream speed u − v, so their difference is 2v.", tup(u, 2 * v)));
      if (kind === 3) {
        // l + w = P with l − w = v
        const P = 2 * (2 * u + v);
        out.push(B("half-perimeter", "conceptual", SYS, "The perimeter was taken as length + width; it is 2 × (length + width).", (P + v) % 2 === 0 ? tup((P + v) / 2, (P - v) / 2) : null));
      }
      return keepBugs(out);
    },
    distractors: (p) => {
      const [x, y] = sysxAns(p);
      return [tup(x + 1, y - 1), tup(x, y + 1), tup(x - 1, y)];
    },
    variants: () => [],
    explain: (s) => (s.id === "model" ? `Let the two unknowns be x and y: ${s.value}` : `Solving the pair gives ${s.value}`),
    domain: [[0, 3], [1, 20], [0, 15], [1, 5]],
    keep: (p) => sysxOk(p),
    cap: 400,
    difficulty: ([kind]) => (kind === 3 ? 1 : kind === 1 ? 2 : 3),
    teach: {
      idea: "Each condition in the problem becomes one equation in the two unknowns: ages now and years ago, a number 10a + b and its reverse 10b + a, speeds u + v downstream and u − v upstream, or perimeter 2(l + w).",
      method: "Name the two unknowns, write one equation for each sentence of the problem, solve the pair (by elimination or substitution), and check the answer against the words of the problem.",
      alternatives: [
        { id: "table", title: "Make a table first", kind: "procedural", text: ["Write a table with a column for 'now' and for 'then' (or downstream and upstream).", "Fill it with expressions in x and y; each condition compares two cells."] },
      ],
    },
    limits: "Whole-number answers for four kinds of problem (ages, digits, a boat in a stream, a rectangle); money problems are in the shopping family.",
  },
  // ============================================================ gap@1: sum, difference, product and quotient of functions
  {
    id: "alfop",
    arity: 6,
    title: "Sum, difference, product and quotient of functions",
    competency: FOP,
    type: "fraction",
    mc: true,
    // [kind, a, b, p, c, t]: f(x) = ax + b, g(x) = px + c; 0 (f + g)(t), 1 (f − g)(t), 2 (fg)(t), 3 (f/g)(t), 4 the
    // number excluded from the domain of f/g (t = 0)
    parse: none,
    reject: (pp) => {
      if (!inR(pp, [[0, 4], [-4, 4], [-6, 6], [1, 3], [-6, 6], [-3, 3]])) return "f(x) = ax + b, g(x) = px + c with small whole numbers.";
      const [k, a, b, p, c, t] = pp;
      if (a === 0 || c === 0) return "a and c are not 0.";
      if (k === 4) return t !== 0 || gcd(p, Math.abs(c)) !== 1 || a * -c === -b * p ? "f/g with g's zero not cancelled by f's." : null;
      return k === 3 && p * t + c === 0 ? "g(t) must not be 0." : null;
    },
    prompt: ([k, a, b, p, c, t]) => `Let f(x) = ${pl([a, b])} and g(x) = ${pl([p, c])}. ${k === 4 ? "The function f/g is defined for every real number except one. Which number is not in the domain of f/g? (A fraction is fine.)" : `Find ${["(f + g)", "(f − g)", "(fg)", "(f/g)"][k]}(${N(t)}).${k === 3 ? " (A fraction is fine.)" : ""}`}`,
    solve: ([k, a, b, p, c, t]) => {
      const f = a * t + b;
      const g = p * t + c;
      if (k === 4) return { steps: [st("zero", "solve", LIN, [p, c], -c / p)], answer: -c / p };
      const v = [f + g, f - g, f * g, f / g][k];
      return { steps: [st("f", "evaluate", FOP, ["f", t], f), st("g", "evaluate", FOP, ["g", t], g), st("combine", ["add", "subtract", "multiply", "divide"][k], FOP, [f, g], v)], answer: v };
    },
    // independent: form the combined function's formula first (coefficients), then evaluate it at t; kind 4 substitutes
    // the answer into g
    validate: ([k, a, b, p, c, t], v) => {
      if (typeof v !== "number") return false;
      if (k === 4) return close(p * v + c, 0);
      const want = k === 0 ? (a + p) * t + (b + c) : k === 1 ? (a - p) * t + (b - c) : k === 2 ? horner([a * p, a * c + b * p, b * c], t) : (a * t + b) / (p * t + c);
      return close(v, want);
    },
    bugs: ([k, a, b, p, c, t]) => {
      const f = a * t + b;
      const g = p * t + c;
      const right = k === 4 ? -c / p : [f + g, f - g, f * g, f / g][k];
      const w = (x: number | null) => (x === null || !Number.isFinite(x) || close(x, right) ? null : x);
      if (k === 4) return keepBugs([B("zero-of-f", "conceptual", FOP, "The zero of f was given; f/g is undefined where the DENOMINATOR g is zero.", w(-b / a)), B("sign", "procedural", LIN, `px + c = 0 gives x = −c/p; the sign of ${N(c)} was not changed.`, w(c / p))]);
      return keepBugs([
        k === 0 ? B("multiplied", "conceptual", FOP, "f(t) and g(t) were multiplied; (f + g)(t) = f(t) + g(t).", w(f * g)) : k === 1 ? B("minus-first-term", "procedural", INTADD, "Only the x-term of g was subtracted; (f − g)(x) = f(x) − (px + c), so the constant is subtracted too.", w(f - p * t + c)) : k === 2 ? B("added", "conceptual", FOP, "f(t) and g(t) were added; (fg)(t) = f(t) × g(t).", w(f + g)) : B("upside-down", "procedural", FOP, "The fraction was turned upside down: (f/g)(t) = f(t) ÷ g(t).", f !== 0 ? w(g / f) : null),
      ]);
    },
    distractors: ([k, a, b, p, c, t]) => {
      const f = a * t + b;
      const g = p * t + c;
      return k === 4 ? [-c, c, b / a] : [f, g, -([f + g, f - g, f * g, f / g][k])];
    },
    variants: () => [],
    explain: (s) => (s.id === "zero" ? `g(x) = 0 when x = ${Q(Number(s.value))}, so that number is excluded` : s.id === "combine" ? `Combine: ${Q(Number(s.value))}` : `${s.inputs[0]}(${N(Number(s.inputs[1]))}) = ${N(Number(s.value))}`),
    domain: [[0, 4], [-4, 4], [-6, 6], [1, 3], [-6, 6], [-3, 3]],
    cap: 400,
    difficulty: ([k]) => (k <= 1 ? 1 : k === 2 ? 2 : 3),
    teach: {
      idea: "(f + g)(x) = f(x) + g(x), (f − g)(x) = f(x) − g(x), (fg)(x) = f(x)g(x) and (f/g)(x) = f(x)/g(x). The domain of each is where both are defined; for f/g also leave out the x with g(x) = 0.",
      method: "Work out f(t) and g(t), then combine them. For the domain of f/g, solve g(x) = 0 and remove that number.",
      alternatives: [
        { id: "formula-first", title: "Find the formula first", kind: "procedural", text: ["Combine the formulas: (f + g)(x) = (a + p)x + (b + c), (fg)(x) = (ax + b)(px + c), …", "Then substitute the number; both ways agree."] },
      ],
    },
    limits: "Linear functions f and g with small whole coefficients; the domain question is for f/g only.",
  },
  // ============================================================ gap@1: sums of series built from k, k², k³
  {
    id: "alsump",
    arity: 4,
    title: "Sums of series whose general term is a polynomial in k",
    competency: PS,
    type: "integer",
    mc: true,
    // [form, n, a, b]: form 0 Σ k(k + a); form 1 Σ (ak + b)²; form 2 Σ k²(k + a) for k = 1 … n (b = 0 except form 1)
    parse: none,
    reject: (p) => {
      if (!inR(p, [[0, 2], [5, 20], [1, 5], [-3, 3]])) return "Sums of n = 5 to 20 terms with small whole a, b.";
      const [f, , a, b] = p;
      return f === 1 ? (a > 3 || a + b < 1 ? "(ak + b)² with a 1–3 and a + b at least 1." : null) : b !== 0 || (f === 2 && a > 4) ? "b is 0 for these forms (and a up to 4 for k²(k + a))." : null;
    },
    prompt: ([f, n, a, b]) => `Find the sum of the first ${n} terms of the series ${f === 0 ? `1 × ${1 + a} + 2 × ${2 + a} + 3 × ${3 + a} + …` : f === 1 ? `${a + b}² + ${2 * a + b}² + ${3 * a + b}² + …` : `1² × ${1 + a} + 2² × ${2 + a} + 3² × ${3 + a} + …`}.`,
    solve: ([f, n, a, b]) => {
      const [S1, S2, S3] = powSums(n);
      const v = f === 0 ? S2 + a * S1 : f === 1 ? a * a * S2 + 2 * a * b * S1 + b * b * n : S3 + a * S2;
      return { steps: [st("general", "write", PS, [f, a, b], f === 0 ? `k² + ${a}k` : f === 1 ? pl([a * a, 2 * a * b, b * b], "k") : `k³ + ${a}k²`), st("formulas", "evaluate", PS, [n], `${S1}, ${S2}, ${S3}`), st("combine", "add", PS, [], v)], answer: v };
    },
    // independent: add the n terms one by one
    validate: ([f, n, a, b], v) => {
      let s = 0;
      for (let k = 1; k <= n; k++) s += f === 0 ? k * (k + a) : f === 1 ? (a * k + b) ** 2 : k * k * (k + a);
      return v === s;
    },
    bugs: ([f, n, a, b]) => {
      const [S1, S2, S3] = powSums(n);
      const right = f === 0 ? S2 + a * S1 : f === 1 ? a * a * S2 + 2 * a * b * S1 + b * b * n : S3 + a * S2;
      const w = (x: number) => (x === right ? null : x);
      return keepBugs(
        f === 0
          ? [B("product-of-sums", "conceptual", PS, "Σ k(k + a) was worked out as (Σ k) × (Σ (k + a)); the sum of products is not the product of sums. Expand the general term first.", w(S1 * (S1 + a * n))), B("constant-once", "procedural", PS, `Σ ${a}k was taken as ${a}; it is ${a} × Σ k = ${a} × n(n + 1)/2.`, w(S2 + a))]
          : f === 1
            ? [B("cross-term-dropped", "procedural", PS, "(ak + b)² was expanded as a²k² + b²; the middle term 2abk is missing.", b !== 0 ? w(a * a * S2 + b * b * n) : null), B("constant-once", "procedural", PS, `Σ ${b * b} was taken as ${b * b}; adding a constant n times gives ${b * b}n.`, b !== 0 ? w(a * a * S2 + 2 * a * b * S1 + b * b) : null), B("square-of-sum", "conceptual", PS, "The terms were added first and the total squared; each term is squared before adding.", w((a * S1 + b * n) ** 2))]
            : [B("product-of-sums", "conceptual", PS, "Σ k²(k + a) was worked out as (Σ k²) × (Σ (k + a)); expand the general term to k³ + ak² first.", w(S2 * (S1 + a * n))), B("wrong-power", "procedural", PS, `Σ ${a}k² was taken as ${a} × Σ k; the second part of the general term is ${a}k².`, w(S3 + a * S1))],
      );
    },
    distractors: ([f, n, a, b]) => {
      const [S1, S2, S3] = powSums(n);
      const right = f === 0 ? S2 + a * S1 : f === 1 ? a * a * S2 + 2 * a * b * S1 + b * b * n : S3 + a * S2;
      return [right + (f === 1 ? b * b : a), right - n, right + n];
    },
    variants: () => [],
    explain: (s) => (s.id === "general" ? `The general term is ${s.value}` : s.id === "formulas" ? `Σk, Σk², Σk³ up to ${s.inputs[0]}: ${s.value}` : `Combine: ${s.value}`),
    domain: [[0, 2], [5, 20], [1, 5], [-3, 3]],
    cap: 300,
    difficulty: ([f]) => (f === 0 ? 1 : f === 1 ? 2 : 3),
    teach: {
      idea: "A sum is linear: Σ(ak² + bk + c) = aΣk² + bΣk + cn. So a series whose k-th term is a polynomial in k can be summed with the formulas for Σk, Σk² and Σk³.",
      method: "Write the k-th term (look at how the first factors and the second factors grow), expand it into powers of k, and replace each Σkᵐ by its formula; a constant term adds up to n times itself.",
      alternatives: [
        { id: "check-small", title: "Check with n = 2", kind: "procedural", text: ["Add the first two terms by hand.", "Your formula with n = 2 must give the same number."] },
      ],
    },
    limits: "General terms k(k + a), (ak + b)² and k²(k + a), up to 20 terms.",
  },
  // ============================================================ gap@1: circle vocabulary and symmetry
  {
    id: "alcvoc",
    arity: 3,
    title: "Parts of a circle and its symmetry",
    competency: CT,
    type: "choice",
    // [item, letters, v]: one of the descriptions in VOC (or a symmetry question), with point letters and a number
    parse: none,
    reject: (p) => (!inR(p, [[0, VOC.length - 1], [0, 5], [0, 4]]) ? `One of ${VOC.length} descriptions, with letters 0–5 and a number 0–4.` : null),
    prompt: ([i, l, v]) => VOC[i].say(LETS[l], 3 + 2 * v),
    choices: (p) => vocOpts(p),
    solve: (p) => ({ steps: [st("name", "recall", CT, [VOC[p[0]].ans], VOC[p[0]].ans)], answer: vocOpts(p).indexOf(VOC[p[0]].ans) }),
    // independent: the parts of a circle are classified from their features (point, line, curve, region; where their ends
    // are; what bounds them); the symmetry questions are checked numerically by reflecting and turning points of a circle
    validate: (p, v) => {
      if (typeof v !== "number") return false;
      const opts = vocOpts(p);
      const truth = vocTruth(p, opts);
      return truth[v] === true && truth.filter(Boolean).length === 1;
    },
    bugs: (p) => {
      const it = VOC[p[0]];
      const opts = vocOpts(p);
      return it.mix && opts.includes(it.mix) ? [B("mixed-up-part", "conceptual", CT, it.why, opts.indexOf(it.mix))] : [];
    },
    variants: () => [],
    explain: (s) => `This is ${s.value}`,
    domain: [[0, 19], [0, 5], [0, 4]],
    keep: (p) => firstOnly("alcvoc", [[0, 19], [0, 5], [0, 4]], (q) => `${VOC[q[0]].say(LETS[q[1]], 3 + 2 * q[2])}|${vocOpts(q).join("|")}`)(p),
    cap: 400,
    difficulty: ([i]) => (VOC[i].feat.shape === "line" || VOC[i].feat.shape === "point" ? 1 : VOC[i].feat.shape === "sym" ? 3 : 2),
    teach: {
      idea: "A chord joins two points of a circle; a diameter is a chord through the centre; a radius joins the centre to the circle. An arc is part of the circle; a sector is the region between two radii and an arc; a segment is the region between a chord and an arc. Every line through the centre is a line of symmetry, so a circle has infinitely many.",
      method: "Ask: is it a point, a straight line, a curve or a region? Where are its ends (on the circle, at the centre)? What bounds the region (two radii, or a chord)? Then name it.",
      alternatives: [
        { id: "pizza", title: "Think of a pizza and a roti", kind: "conceptual", text: ["A slice of pizza cut from the centre is a sector; its crust edge is an arc.", "One straight cut across a roti that misses the centre cuts off a segment; the cut itself is a chord."], visual: () => ({ type: "circle", radius: "r", sector: 60 }) },
      ],
    },
    limits: "Naming the parts of a circle and describing its symmetry by choosing; drawing the parts is marked by an educator.",
  },
  {
    id: "alnear",
    arity: 4,
    title: "Chords and their distances from the centre: which is longer, which is nearer",
    competency: CT,
    type: "choice",
    // [dir, r, p, q]: dir 0: chords AB, CD at distances p, q cm from the centre → which is longer; dir 1: chords of
    // lengths 2p, 2q cm → which is nearer the centre
    parse: none,
    reject: (pp) => {
      if (!inR(pp, [[0, 1], [5, 15], [1, 14], [1, 14]])) return "A radius from 5 to 15 cm and two chords.";
      const [, r, p, q] = pp;
      return p >= r || q >= r ? "Both chords must fit inside the circle." : null;
    },
    prompt: ([dir, r, p, q]) => (dir === 0 ? `In a circle with centre O and radius ${r} cm, the chord AB is ${p} cm from O and the chord CD is ${q} cm from O. Which statement is true?` : `In a circle with centre O and radius ${r} cm, the chord AB is ${2 * p} cm long and the chord CD is ${2 * q} cm long. Which statement is true?`),
    choices: ([dir]) => (dir === 0 ? ["AB is longer than CD", "CD is longer than AB", "AB and CD are equal", "It cannot be decided without knowing where the chords are"] : ["AB is nearer to the centre than CD", "CD is nearer to the centre than AB", "AB and CD are the same distance from the centre", "It cannot be decided without knowing where the chords are"]),
    solve: ([dir, , p, q]) => {
      const ans = p === q ? 2 : dir === 0 ? (p < q ? 0 : 1) : p > q ? 0 : 1;
      return { steps: [st("fact", "recall", CT, [dir], dir === 0 ? "the chord nearer the centre is longer; equidistant chords are equal" : "the longer chord is nearer the centre; equal chords are equidistant"), st("compare", "compare", CT, [p, q], ans)], answer: ans };
    },
    // independent: Pythagoras with the radius: half chord² + distance² = r²; compare the computed lengths or distances
    validate: ([dir, r, p, q], v) => {
      const other = (x: number) => Math.sqrt(r * r - x * x);
      const [A, C] = [other(p), other(q)];
      // dir 0: A, C are half-chords (bigger is longer); dir 1: A, C are distances (smaller is nearer)
      const ans = close(A, C) ? 2 : dir === 0 ? (A > C ? 0 : 1) : A < C ? 0 : 1;
      return v === ans;
    },
    bugs: ([dir, , p, q]) =>
      p === q
        ? [B("equal-not-decided", "conceptual", CT, dir === 0 ? "Chords the same distance from the centre were thought possibly different; in one circle, chords equidistant from the centre are equal (the converse of 'equal chords are equidistant')." : "Equal chords were thought possibly at different distances; in one circle, equal chords are equidistant from the centre.", 3)]
        : [B("farther-longer", "conceptual", CT, dir === 0 ? "The chord farther from the centre was taken as longer; it is the other way: the nearer a chord is to the centre, the longer it is (the diameter, through the centre, is the longest)." : "The shorter chord was taken as nearer the centre; the longer chord is the nearer one.", dir === 0 ? (p < q ? 1 : 0) : p > q ? 1 : 0)],
    variants: () => [],
    explain: (s) => (s.id === "fact" ? `Use: ${s.value}` : `So the answer is ${"ABCD"[Number(s.value)]}`),
    domain: [[0, 1], [5, 15], [1, 14], [1, 14]],
    keep: ([dir, r, p, q]) => p < r && q < r && (p === q || (hsh(`${dir},${r},${p},${q}`) % 6 === 0)),
    cap: 300,
    difficulty: ([, , p, q]) => (p === q ? 2 : Math.abs(p - q) <= 1 ? 3 : 1),
    teach: {
      idea: "In one circle, half a chord, its distance from the centre and the radius make a right triangle: (half chord)² + distance² = r². So equal chords are equidistant, equidistant chords are equal, and a longer chord is nearer the centre.",
      method: "Compare the distances (or the lengths) directly with the facts, or work out each half chord (or distance) with Pythagoras and compare.",
      alternatives: [
        { id: "slide", title: "Slide a chord towards the centre", kind: "conceptual", text: ["Imagine a chord moving towards the centre, staying parallel to itself.", "Its ends move apart along the circle: it gets longer, and is longest (a diameter) when it passes through the centre."] },
      ],
    },
    limits: "Two chords of one circle with whole-number distances or lengths; chords in different circles are not compared.",
  },
  {
    id: "alcyc",
    arity: 4,
    title: "Deciding whether four points lie on a circle",
    competency: CT,
    type: "choice",
    // [kind, x, y, z], angles 5x°, 5y°, 5z°: kind 0 quadrilateral with ∠A = x, ∠B = y, ∠C = z (∠D the rest); kind 1 ∠ACB = x, ∠ADB = y with
    // C, D on the same side of AB; kind 2 the same with C, D on opposite sides (z unused, 0)
    parse: none,
    reject: (p) => (!inR(p, [[0, 2], [6, 30], [6, 30], [0, 30]]) || !cycOk(p) ? "Angles (in steps of 5°) that make a quadrilateral, or two angles on a chord, in the family's ranges." : null),
    prompt: (q) => {
      const [k, x, y, z] = cyc5(q);
      return
      k === 0
        ? `In the quadrilateral ABCD, ∠A = ${x}°, ∠B = ${y}°, ∠C = ${z}° and ∠D = ${360 - x - y - z}°. Do A, B, C and D lie on one circle?`
        : `A, B, C and D are four points, with C and D on ${k === 1 ? "the same side" : "opposite sides"} of the line AB. ∠ACB = ${x}° and ∠ADB = ${y}°. Do A, B, C and D lie on one circle?`;
    },
    choices: () => ["Yes, they lie on one circle", "No, they do not lie on one circle", "It cannot be decided from the angles"],
    solve: (q) => {
      const [k, x, y, z] = cyc5(q);
      const yes = k === 0 ? x + z === 180 : k === 1 ? x === y : x + y === 180;
      return { steps: [st("test", "compare", CT, [k], k === 0 ? `∠A + ∠C = ${x + z}°` : k === 1 ? `∠ACB and ∠ADB: ${x}° and ${y}°` : `∠ACB + ∠ADB = ${x + y}°`), st("decide", "decide", CT, [], yes ? 0 : 1)], answer: yes ? 0 : 1 };
    },
    // independent: kind 0 tests the other pair of opposite angles; kinds 1, 2 build the circle through A, B and C and
    // the circle of points from which AB is seen at ∠ADB, and compare their centres and radii
    validate: (q, v) => {
      const [k, x, y, z] = cyc5(q);
      let yes: boolean;
      if (k === 0) yes = y + (360 - x - y - z) === 180;
      else {
        const cot = (d: number) => Math.cos((d * Math.PI) / 180) / Math.sin((d * Math.PI) / 180);
        const R = (d: number) => 1 / Math.sin((d * Math.PI) / 180);
        // A(−1, 0), B(1, 0); C above: centre (0, cot x); D above (kind 1) centre (0, cot y), below (kind 2) (0, −cot y)
        const cD = k === 1 ? cot(y) : -cot(y);
        yes = close(cot(x), cD) && close(R(x), R(y));
      }
      return v === (yes ? 0 : 1);
    },
    bugs: (q) => {
      const [k, x, y, z] = cyc5(q);
      const yes = k === 0 ? x + z === 180 : k === 1 ? x === y : x + y === 180;
      if (k === 0) return keepBugs([B("adjacent-angles", "conceptual", CT, "Two neighbouring angles adding up to 180° was taken as the test; the test is that OPPOSITE angles add up to 180°.", !yes && x + y === 180 ? 0 : null), B("not-decidable", "conceptual", CT, "It was thought the angles cannot decide it; by the converse of the cyclic-quadrilateral theorem, a quadrilateral whose opposite angles add up to 180° is cyclic, and otherwise it is not.", 2)]);
      return keepBugs([B(k === 1 ? "same-side-supplementary" : "opposite-side-equal", "conceptual", CT, k === 1 ? "The angles were tested for adding up to 180°; with C and D on the SAME side of AB, the points are concyclic when the angles are equal." : "The angles were tested for being equal; with C and D on OPPOSITE sides of AB, the points are concyclic when the angles add up to 180°.", k === 1 ? (x + y === 180 && x !== y ? 0 : yes ? 1 : null) : x === y && x + y !== 180 ? 0 : yes ? 1 : null), B("not-decidable", "conceptual", CT, "It was thought the angles cannot decide it; the converse of the theorem says equal angles on the same side (or supplementary angles on opposite sides) put the four points on one circle.", 2)]);
    },
    variants: () => [],
    explain: (s) => (s.id === "test" ? `Check: ${s.value}` : s.value === 0 ? "So they lie on one circle (the converse of the theorem)" : "So they do not lie on one circle"),
    domain: [[0, 2], [6, 30], [6, 30], [0, 30]],
    keep: cycKeep,
    cap: 300,
    difficulty: ([k]) => (k === 0 ? 1 : k === 1 ? 2 : 3),
    teach: {
      idea: "Converses: if the opposite angles of a quadrilateral add up to 180°, it is cyclic; if a segment AB subtends equal angles at C and D on the same side of it, A, B, C, D are concyclic (on opposite sides, the angles must add up to 180°).",
      method: "For a quadrilateral add a pair of opposite angles; for two angles on the same segment compare them (same side: equal; opposite sides: supplementary).",
      alternatives: [
        { id: "locus", title: "The circle of equal angles", kind: "conceptual", text: ["All the points from which AB is seen at the same angle, on one side of AB, lie on one arc through A and B.", "So if C and D see AB at the same angle from the same side, D is on the arc through A, B and C."] },
      ],
    },
    limits: "Deciding with angle facts and their converses; writing the proof of a converse is marked by an educator.",
  },
  // ============================================================ gap@1: the number of zeros from a graph
  {
    id: "alzgr",
    arity: 5,
    title: "The number of zeros of a polynomial from its graph",
    competency: ZER,
    type: "integer",
    mc: true,
    // [t, a, b, c, s]: t 0 quadratic, two zeros a < b; 1 quadratic touching at a; 2 quadratic with no zero, vertex (a, c);
    // 3 cubic, three zeros a < b < c; 4 cubic (x − a)((x − b)² + 1), one zero; 5 cubic (x − a)²(x − b), two zeros;
    // s 0 or 1 turns the graph upside down
    parse: none,
    reject: (p) => (!inR(p, [[0, 5], [-3, 3], [-3, 3], [-3, 3], [0, 1]]) || !zgrOk(p) ? "A quadratic or cubic with its zeros (if any) between −3 and 3, built in one of six ways." : null),
    prompt: () => "The picture shows the graph of y = p(x) for a polynomial p(x). How many zeros does p(x) have?",
    figure: (p) => ({ type: "plane", segments: zgrSegs(p), points: [], range: 5 }),
    solve: (p) => {
      const n = [2, 1, 0, 3, 1, 2][p[0]];
      return { steps: [st("count", "count", ZER, [p[0]], n)], answer: n };
    },
    // independent: count the different real zeros of the polynomial itself, on a fine grid that includes every zero of
    // the kinds used (sign changes and exact zeros)
    validate: (p, v) => typeof v === "number" && v === zgrCount(zgrPoly(p)),
    bugs: (p) => {
      const n = [2, 1, 0, 3, 1, 2][p[0]];
      const deg = p[0] <= 2 ? 2 : 3;
      const turns = p[0] <= 2 ? 1 : p[0] === 4 ? zgrTurns(zgrPoly(p)) : 2;
      return keepBugs([
        B("degree-as-count", "conceptual", ZER, `The degree (${deg}) was given; a polynomial of degree ${deg} has AT MOST ${deg} zeros, and the graph shows how many there really are.`, deg !== n ? deg : null),
        B("turning-points", "conceptual", ZER, "The turning points (the tops and bottoms of the curve) were counted; the zeros are where the curve meets the x-axis.", turns !== n ? turns : null),
        B("touch-not-counted", "conceptual", ZER, "A point where the curve only touches the x-axis was not counted; touching the axis is also a zero.", p[0] === 1 || p[0] === 5 ? n - 1 : null),
      ]);
    },
    distractors: (p) => [0, 1, 2, 3].filter((x) => x !== [2, 1, 0, 3, 1, 2][p[0]]),
    variants: () => [],
    explain: (s) => `The curve meets the x-axis at ${s.value} ${s.value === 1 ? "point" : "points"}, so p(x) has ${s.value} ${s.value === 1 ? "zero" : "zeros"}`,
    domain: [[0, 5], [-3, 3], [-3, 3], [-3, 3], [0, 1]],
    keep: (p) => zgrOk(p),
    cap: 300,
    difficulty: ([t]) => (t === 0 || t === 3 ? 1 : t === 2 ? 2 : 3),
    teach: {
      idea: "A zero of p(x) is an x with p(x) = 0, that is, where the graph of y = p(x) meets the x-axis (crossing it or just touching it). A quadratic has at most 2 zeros and a cubic at most 3.",
      method: "Follow the curve from left to right and count each point where it meets the x-axis; count a point where it touches the axis without crossing as well.",
      alternatives: [
        { id: "table", title: "Look at the signs", kind: "conceptual", text: ["Where the curve is above the axis p(x) > 0; below, p(x) < 0.", "Each change from above to below (or back) passes through a zero; a touch is a zero without a change of sign."] },
      ],
    },
    limits: "Quadratics and cubics with whole-number zeros between −3 and 3 (or no zero), drawn on −5 ≤ x, y ≤ 5.",
  },
];

// ---------------------------------------------------------------- helpers used above
/** (x − r)(ax² + qx + s) + R as coefficients. */
function cubicOf(a: number, r: number, q: number, s: number, R: number): number[] {
  return [a, q - a * r, s - q * r, R - s * r];
}
/** (x − r1)(x − r2)(x − r3) as coefficients. */
function cubicFrom([r1, r2, r3]: number[]): number[] {
  return [1, -(r1 + r2 + r3), r1 * r2 + r1 * r3 + r2 * r3, -r1 * r2 * r3];
}
/** The second equation of alcons. */
function second([a1, b1, c1, k, kind, d]: number[]): [number, number, number] {
  return kind === 0 ? [k * a1, k * b1 + d, k * c1] : kind === 1 ? [k * a1, k * b1, k * c1 + d] : [k * a1, k * b1, k * c1];
}
function series(kind: number, m: number, n: number): string {
  if (kind === 1) return `1 + 3 + 5 + … + ${2 * n - 1}`;
  const p = kind === 0 ? "" : sup(kind);
  return `${m}${p} + ${m + 1}${p} + ${m + 2}${p} + … + ${n}${p}`;
}
/** Squared sides AB², BC², CA² of altri's triangle. */
function sides2([, , u1, v1, u2, v2]: number[]): [number, number, number] {
  return [u1 * u1 + v1 * v1, (u2 - u1) ** 2 + (v2 - v1) ** 2, u2 * u2 + v2 * v2];
}
/** 0 right, 1 isosceles, 2 both, 3 neither (from squared sides). */
function triKind(p: number[]): number {
  const s = [...sides2(p)].sort((x, y) => x - y);
  const right = s[0] + s[1] === s[2];
  const iso = s[0] === s[1] || s[1] === s[2];
  return right ? (iso ? 2 : 0) : iso ? 1 : 3;
}
/** x1(y2 − y3) + x2(y3 − y1) + x3(y1 − y2) (twice the signed area). */
function shoe([x1, y1, x2, y2, x3, y3]: number[]): number {
  return x1 * (y2 - y3) + x2 * (y3 - y1) + x3 * (y1 - y2);
}

// ---------------------------------------------------------------- gap@1 helpers
const UNIQ = new Map<string, Set<string>>();
/** keep: only the first parameter choice (in domain order) that shows a given question, so no two problems look the same. */
function firstOnly(fam: string, dom: [number, number][], key: (p: number[]) => string): (p: number[]) => boolean {
  return (p) => {
    let set = UNIQ.get(fam);
    if (!set) {
      set = new Set();
      const seen = new Set<string>();
      const rec = (i: number, acc: number[]) => {
        if (i === dom.length) {
          const k = key(acc);
          if (!seen.has(k)) {
            seen.add(k);
            set!.add(acc.join(","));
          }
          return;
        }
        for (let v = dom[i][0]; v <= dom[i][1]; v++) rec(i + 1, [...acc, v]);
      };
      rec(0, []);
      UNIQ.set(fam, set);
    }
    return set.has(p.join(","));
  };
}
/** A number in brackets when negative: (−3). */
function par(v: number): string {
  return v < 0 ? `(${N(v)})` : String(v);
}
/** A small deterministic generator: the next whole number in [lo, hi]. */
function rng(seed: number) {
  let s = (seed * 2654435761 + 12345) >>> 0;
  return (lo: number, hi: number) => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return lo + ((s >>> 16) % (hi - lo + 1));
  };
}
function shuffled<T>(xs: T[], R: (lo: number, hi: number) => number): T[] {
  const out = [...xs];
  for (let i = out.length - 1; i > 0; i--) {
    const j = R(0, i);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
/** One term c·xⁿ as written, with its sign in front unless it is the first term. */
function termText(c: number, n: number, first: boolean, v = "x"): string {
  const a = Math.abs(c);
  const body = `${a === 1 && n > 0 ? "" : a}${n === 0 ? "" : n === 1 ? v : `${v}${sup(n)}`}`;
  return first ? `${c < 0 ? "−" : ""}${body}` : ` ${c < 0 ? "−" : "+"} ${body}`;
}
const termsText = (ts: [number, number][]) => ts.map(([c, n], i) => termText(c, n, i === 0)).join("");
const nz = (R: (lo: number, hi: number) => number, m = 9) => R(1, m) * (R(0, 1) ? 1 : -1);
const DEGNAMES = ["a constant polynomial", "a linear polynomial", "a quadratic polynomial", "a cubic polynomial"];
const TERMNAMES = ["a monomial", "a binomial", "a trinomial", "a polynomial with four terms"];
/** alpoly kinds 2, 3: a polynomial written with its terms in some order (kind 3 sometimes with a pair of like terms). */
function polyCls(k: number, s: number) {
  const R = rng(hsh(`cls${k},${s}`));
  let deg: number;
  let t: number;
  if (k === 2) {
    deg = R(0, 3);
    t = R(1, deg + 1);
  } else {
    t = R(1, 4);
    deg = R(Math.max(t - 1, 1), 3);
  }
  const others = shuffled([...Array(deg).keys()], R).slice(0, t - 1);
  const pows = [deg, ...others];
  let ts: [number, number][] = pows.map((n) => [nz(R), n]);
  if (k === 3 && t <= 3 && R(0, 2) === 0) {
    const i = R(0, ts.length - 1);
    const c = ts[i][0];
    let c1 = nz(R);
    if (c1 === c) c1 = c + 1 === 0 ? c + 2 : c + 1;
    ts = [...ts.slice(0, i), [c1, ts[i][1]], [c - c1, ts[i][1]], ...ts.slice(i + 1)];
  }
  const ord = R(0, 2);
  ts = ord === 0 ? [...ts].sort((x, y) => y[1] - x[1]) : ord === 1 ? [...ts].sort((x, y) => x[1] - y[1]) : shuffled(ts, R);
  const desc = Array(deg + 1).fill(0);
  for (const [c, n] of ts) desc[deg - n] += c;
  return { text: termsText(ts), desc, deg, terms: t, first: ts[0][1], written: ts.length };
}
/** alpoly kinds 0, 1: four expressions, exactly one of which is a polynomial (kind 0) or a linear polynomial (kind 1). */
function polyOpts(k: number, s: number): { text: string; right: boolean; type: string }[] {
  const R = rng(hsh(`opt${k},${s}`));
  const a = R(2, 9);
  const b = R(1, 9);
  const c = R(1, 9);
  const r = [2, 3, 5, 7][R(0, 3)];
  const good = k === 0 ? [`${a}x² − ${b}x + ${c}`, `x³/${a} + ${b}`, `√${r} x + ${b}`, `${b} − ${a}x³`, `x²/${a} − √${r}`] : [`${a}x + ${b}`, `${b} − ${a}x`, `x/${a} − ${b}`, `√${r} x + ${b}`];
  const bad: [string, string][] = k === 0 ? [["recip", `x + ${a}/x`], ["rootx", `√x + ${b}`], ["recip2", `${a}/x² + ${b}`], ["frac", `${a}/(x − ${c})`], ["mixed", `${a}x² + ${b}/x`]] : [["quad", `${a}x² + ${b}`], ["recip", `x + ${a}/x`], ["cubic", `${a}x³ − x`], ["const", `${a + b}`]];
  const g = good[R(0, good.length - 1)];
  const picks = shuffled(bad, R).slice(0, 3);
  return shuffled([{ text: g, right: true, type: "good" }, ...picks.map(([type, text]) => ({ text, right: false, type }))], R);
}
/** The degree of a written expression if it is a polynomial of degree at most 3 (finite differences at x = 11 … 17). */
function diffDeg(text: string): number | null {
  let vs = [11, 12, 13, 14, 15, 16, 17].map((x) => at(text, x));
  if (!vs.every(Number.isFinite)) return null;
  const big = Math.max(1, ...vs.map(Math.abs));
  for (let k = 0; k <= 3; k++) {
    const d = vs.slice(1).map((v, i) => v - vs[i]);
    if (d.every((x) => Math.abs(x) <= 1e-9 * big * 2 ** (k + 1))) return k;
    vs = d;
  }
  return null;
}
/** Coefficients c₀, c₁, … of a written polynomial in x of degree below n, from its values (null if it is not one). */
function coeffsOf(text: Value, n: number): number[] | null {
  const xs = [...Array(n).keys()].map((i) => i - Math.floor(n / 2));
  const ys = xs.map((x) => at(text, x));
  if (!ys.every(Number.isFinite)) return null;
  const M = xs.map((x, i) => [...xs.map((_, j) => x ** j), ys[i]]);
  for (let c = 0; c < n; c++) {
    let piv = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r;
    [M[c], M[piv]] = [M[piv], M[c]];
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = M[r][c] / M[c][c];
      for (let j = c; j <= n; j++) M[r][j] -= f * M[c][j];
    }
  }
  const cs = M.map((row, i) => row[n] / row[i]).map((v) => (Math.abs(v - Math.round(v)) < 1e-7 ? Math.round(v) : v));
  const check = [0.37, -1.29, 2.61].every((x) => close(cs.reduce((s, c, i) => s + c * x ** i, 0), at(text, x)));
  return check ? cs : null;
}
/** alpdeg: the expressions and the numbers a slip would give. */
function degGen(k: number, s: number) {
  const R = rng(hsh(`deg${k},${s}`));
  if (k <= 1) {
    const deg = k === 0 ? R(1, 6) : R(2, 4);
    const t = R(2, Math.min(4, deg + 1));
    const pows = [deg, ...shuffled([...Array(deg).keys()], R).slice(0, t - 1)];
    let ts: [number, number][] = pows.map((n) => [nz(R), n]);
    ts = R(0, 2) === 0 ? [...ts].sort((x, y) => y[1] - x[1]) : shuffled(ts, R);
    const ask = k === 1 ? (R(0, 3) === 0 ? [...Array(deg).keys()].find((n) => !pows.includes(n)) ?? pows[1] : pows[R(0, pows.length - 1)]) : 0;
    const coefOf = (n: number) => ts.find((x) => x[1] === n)?.[0] ?? 0;
    return { text: termsText(ts), answer: k === 0 ? deg : coefOf(ask), terms: t, first: ts[0][1], big: Math.max(...ts.map((x) => Math.abs(x[0]))), ask, max: 0, prod: 0, vars: 0 };
  }
  if (k === 2) {
    const nv = R(2, 3);
    const letters = nv === 3 ? ["x", "y", "z"] : shuffled(["x", "y", "z"], R).slice(0, 2).sort();
    const es = letters.map(() => R(1, 4));
    const c = nz(R);
    const text = `${c < 0 ? "−" : ""}${Math.abs(c) === 1 ? "" : Math.abs(c)}${letters.map((L, i) => `${L}${es[i] === 1 ? "" : sup(es[i])}`).join("")}`;
    return { text, answer: es.reduce((a, b) => a + b, 0), terms: 1, first: 0, big: Math.abs(c), ask: 0, max: Math.max(...es), prod: es.reduce((a, b) => a * b, 1), vars: nv };
  }
  // kind 3: three terms in x and y (one may be a constant)
  const seen = new Set<string>();
  const tsx: [number, number, number][] = [];
  while (tsx.length < 3) {
    const i = R(0, 4);
    const j = tsx.length === 2 && R(0, 2) === 0 ? 0 : R(0, 4);
    const key = `${i},${tsx.length === 2 && i + j === 0 ? 0 : j}`;
    if (seen.has(key) || (i + j === 0 && tsx.length < 2)) continue;
    seen.add(key);
    tsx.push([nz(R), i, j]);
  }
  const text = tsx.map(([c, i, j], n) => {
    const a = Math.abs(c);
    const lett = `${i ? `x${i === 1 ? "" : sup(i)}` : ""}${j ? `y${j === 1 ? "" : sup(j)}` : ""}`;
    const body = `${a === 1 && lett ? "" : a}${lett}`;
    return n === 0 ? `${c < 0 ? "−" : ""}${body}` : ` ${c < 0 ? "−" : "+"} ${body}`;
  }).join("");
  const degs = tsx.map(([, i, j]) => i + j);
  return { text, answer: Math.max(...degs), terms: 3, first: degs[0], big: 0, ask: 0, max: Math.max(...tsx.flatMap(([, i, j]) => [i, j])), prod: degs.reduce((a, b) => a + b, 0), vars: 2 };
}
/** The degree of a polynomial in x, y, z: put x, y, z proportional to t and find the degree in t by finite differences. */
function scaleDeg(text: string): number | null {
  const g = (t: number) => {
    try {
      return evaluate(parse(text), { x: 0.731 * t, y: 1.37 * t, z: 0.89 * t });
    } catch {
      return NaN;
    }
  };
  const [u, w] = [g(1000), g(2000)];
  if (!Number.isFinite(u) || !Number.isFinite(w) || u === 0) return null;
  return Math.round(Math.log2(Math.abs(w / u)));
}
/** aladd: two polynomials of degree up to 3, as coefficients of x³, x², x, 1. */
function addGen(op: number, s: number) {
  const R = rng(hsh(`add${op},${s}`));
  const dp = R(2, 3);
  const dq = R(1, 3);
  const mk = (d: number) => [3, 2, 1, 0].map((n) => (n === d ? nz(R) : n < d && R(0, 3) > 0 ? R(-9, 9) : 0));
  const P = mk(dp);
  let Qp = mk(dq);
  if (P.every((c, i) => c + (op ? -1 : 1) * Qp[i] === 0)) Qp = Qp.map((c, i) => (i === 3 ? c + 1 : c));
  return { P, Qp };
}
/** aleval: a quadratic or cubic and a point (kind 0), or ax + b (kind 1). */
function evalGen(k: number, s: number) {
  const R = rng(hsh(`ev${k},${s}`));
  if (k === 1) {
    const a = R(1, 9);
    let b = R(-12, 12);
    if (b === 0) b = 5;
    return { P: [a, b], t: 0 };
  }
  const d = R(2, 3);
  const P = [R(1, 4) * (R(0, 3) === 0 ? -1 : 1), ...Array(d).fill(0).map(() => R(-5, 5))];
  let t = R(-3, 3);
  if (t === 0) t = 2;
  return { P, t };
}
/** alldiv: the dividend's coefficients (x³ first). */
function divDividend([k, A, Bv, p, q, s, R]: number[]): number[] {
  return k === 0 ? [A * p, A * q + Bv * p, A * s + Bv * q, Bv * s + R] : [p, q + A * p, A * q + Bv * p + s, Bv * q + R];
}
/** algcd3: the polynomials, as coefficients. */
function gcdPolys([k, a, b, c, d]: number[]): number[][] {
  return k === 0 ? [mulP(mulP([1, a], [1, b]), [1, c]), mulP(mulP([1, a], [1, b]), [1, d])] : [mulP([1, a], [1, b]), mulP([1, a], [1, c]), mulP(mulP([1, a], [1, b]), [1, d])];
}
/** alquad: the vertices A, B, C, D, one in each quadrant, in order round the origin. */
function quadV([a1, b1, a2, b2, a3, b3, a4, b4]: number[]): P2[] {
  return [[-a1, -b1], [a2, -b2], [a3, b3], [-a4, b4]];
}
/** Twice the signed area of a polygon (shoelace sum). */
function quadS(V: P2[]): number {
  return V.reduce((s, P, i) => s + P[0] * V[(i + 1) % V.length][1] - V[(i + 1) % V.length][0] * P[1], 0);
}
/** alpred: situations of steady increase (0–3) and decrease (4–7). */
const PRED: { say: (S: number, r: number, n: string) => string; what: string; unit: string; ask: string }[] = [
  { say: (S, r, n) => `${n} has ₹${S} in a money box and puts in another ₹${r} every week.`, what: "amount in the box (in rupees)", unit: "weeks", ask: "" },
  { say: (S, r) => `A neem sapling is ${S} cm tall when it is planted and grows ${r} cm every month.`, what: "height of the sapling (in cm)", unit: "months", ask: "" },
  { say: (S, r) => `An auto-rickshaw fare is ₹${S} to start, plus ₹${r} for every kilometre travelled.`, what: "fare (in rupees)", unit: "kilometres", ask: "" },
  { say: (S, r) => `A school library has ${S} books and buys ${r} new books every month.`, what: "number of books", unit: "months", ask: "" },
  { say: (S, r) => `A water tank holds ${S} litres. Water is drawn from it at a steady ${r} litres every hour.`, what: "amount of water left (in litres)", unit: "hours", ask: "" },
  { say: (S, r) => `A candle is ${S} mm long and burns down by ${r} mm every hour.`, what: "length of the candle (in mm)", unit: "hours", ask: "" },
  { say: (S, r, n) => `${n} owes a friend ₹${S} and pays back ₹${r} every week.`, what: "amount still owed (in rupees)", unit: "weeks", ask: "" },
  { say: (S, r) => `A phone battery is at ${S}% and the charge falls by ${r}% every hour while a film plays.`, what: "battery charge (in %)", unit: "hours", ask: "" },
];
/** alinf: the two offered pairs. */
function infPairs([a, b, x0, y0, m]: number[]): [number[], number[]] {
  return [m <= 1 ? [x0, y0] : [x0, y0 + 1], m === 0 || m === 2 ? [x0 + b, y0 - a] : [x0 + b, y0 - a + 1]];
}
function infNames([a, b, x0]: number[]): [string, string] {
  const n1 = nm(a + x0);
  const n2 = nm(a + x0 + 1 + b) === n1 ? nm(a + x0 + 2 + b) : nm(a + x0 + 1 + b);
  return [n1, n2];
}
/** almeth: the four options (the right one first) with how each is solved for (x, y). */
function methOpts(p: number[]): { text: string; id: string; says: string; sol: (c1: number) => [number, number] }[] {
  const [m, a1, b1, a2, b2, x, y] = p;
  const c1 = a1 * x + b1 * y;
  const c2 = a2 * x + b2 * y;
  const xeq = (k: number, r: number, id: string, says: string) => ({ text: `${lin([[k, "x"]])} = ${N(r)}`, id, says, sol: (): [number, number] => [r / k, (c1 - a1 * (r / k)) / b1] });
  if (m === 0)
    return [
      xeq(a2 - b2 * a1, c2 - b2 * c1, "right", ""),
      xeq(a2 - a1, c2 - b2 * c1, "bracket-first-term", `When ${N(b2)}y was replaced by ${N(b2)}(${pl([-a1, c1])}), ${N(b2)} multiplied only one term of the bracket; it multiplies every term.`),
      xeq(a2 + b2 * a1, c2 - b2 * c1, "subject-sign", `When y was made the subject, ${pl([a1, 0])} was moved across without changing its sign; y = ${pl([-a1, c1])}.`),
      xeq(a2 - b2 * a1, c2 + b2 * c1, "constant-sign", "After substituting, the constant term was moved to the other side without changing its sign."),
    ];
  if (m === 1)
    return [
      xeq(a1 * b2 - a2 * b1, c1 * b2 - c2 * b1, "right", ""),
      xeq(a1 * b2 + a2 * b1, c1 * b2 + c2 * b1, "added", "The two equations were added instead of subtracted; with the y coefficients made equal, subtracting removes y."),
      xeq(a1 * b2 - a2 * b1, c1 - c2, "constants-not-multiplied", "Only the left-hand sides were multiplied; the numbers on the right must be multiplied too."),
      xeq(a1 * b1 - a2 * b2, c1 * b1 - c2 * b2, "multipliers-swapped", "Equation (1) was multiplied by the y coefficient of (1) and (2) by its own: the multipliers were swapped, so y does not cancel."),
    ];
  const [e1, e2] = [-c1, -c2];
  const X = b1 * e2 - b2 * e1;
  const Y = e1 * a2 - e2 * a1;
  const D = a1 * b2 - a2 * b1;
  const cm = (u: number, w: number, d: number, id: string, says: string) => ({ text: `x/(${N(u)}) = y/(${N(w)}) = 1/(${N(d)})`, id, says, sol: (): [number, number] => [u / d, w / d] });
  return [
    cm(X, Y, D, "right", ""),
    cm(-X, -Y, D, "constant-sign", "The constants were taken with the signs they have on the right of ax + by = c; in a₁x + b₁y + c₁ = 0 the constant is c₁ as it stands on the left."),
    cm(X, -Y, D, "y-pattern", "The y denominator was written a₁c₂ − a₂c₁, continuing the x pattern; it is c₁a₂ − c₂a₁."),
    cm(X, Y, a1 * b2 + a2 * b1, "denominator-sign", "The last denominator was written a₁b₂ + a₂b₁; it is a₁b₂ − a₂b₁."),
  ];
}
function methOk(p: number[]): boolean {
  const [m, a1, b1, a2, b2, x, y] = p;
  if (b1 === 0 || b2 === 0 || a1 * b2 - a2 * b1 === 0 || (m === 0 && b1 !== 1) || (m === 2 && (x === 0 || y === 0))) return false;
  const opts = methOpts(p);
  if (m === 2 ? a1 * b2 + a2 * b1 === 0 : opts.some((o) => /^0 = /.test(o.text) || o.text.startsWith("0x"))) return false;
  if (new Set(opts.map((o) => o.text)).size !== 4) return false;
  const c1 = a1 * x + b1 * y;
  const c2 = a2 * x + b2 * y;
  const good = opts.map((o) => {
    const [X, Y] = o.sol(c1);
    return Number.isFinite(X) && Number.isFinite(Y) && close(a1 * X + b1 * Y, c1) && close(a2 * X + b2 * Y, c2);
  });
  return good[0] && good.filter(Boolean).length === 1;
}
/** alsysx: four kinds of word problem. */
function sysxOk([k, u, v, w]: number[]): boolean {
  if (k === 0) {
    const f = v * (u - w) + w;
    return u >= 5 && v >= 2 && v <= 5 && w <= 5 && u > w + 1 && f <= 75 && f - u >= 18;
  }
  if (k === 1) return u <= 9 && v >= 1 && v <= 9 && u !== v && w === 1;
  if (k === 2) return u >= 6 && v >= 1 && v <= 5 && w <= 4;
  return u >= 3 && v >= 1 && w === 1;
}
function sysxAns([k, u, v, w]: number[]): [number, number] {
  return k === 0 ? [v * (u - w) + w, u] : k === 1 ? [u, v] : k === 2 ? [u, v] : [u + v, u];
}
function sysxText(p: number[]): string {
  const [k, u, v, w] = p;
  const [x, y] = sysxAns(p);
  if (k === 0) return `The sum of the present ages of a father and his son is ${x + y} years. ${w} ${w === 1 ? "year" : "years"} ago, the father was ${v} times as old as his son. Find their present ages, in years. Give (father, son).`;
  if (k === 1) return `The sum of the digits of a two-digit number is ${u + v}. The number formed by reversing its digits is ${v > u ? "greater" : "less"} than the original number by ${9 * Math.abs(u - v)}. Find the original number: give (tens digit, units digit).`;
  if (k === 2) return `A motor boat goes ${(u + v) * w} km downstream in ${w} ${w === 1 ? "hour" : "hours"}, and ${(u - v) * (w + 1)} km upstream in ${w + 1} hours. Find the speed of the boat in still water and the speed of the stream, in km/h. Give (boat, stream).`;
  return `The length of a rectangular garden is ${v} m more than its width, and its perimeter is ${2 * (2 * u + v)} m. Find its length and width in metres. Give (length, width).`;
}
function sysxEqs(p: number[]): string {
  const [k, u, v, w] = p;
  const [x, y] = sysxAns(p);
  if (k === 0) return `x + y = ${x + y} and x − ${w} = ${v}(y − ${w})`;
  if (k === 1) return `x + y = ${u + v} and (10y + x) − (10x + y) = ${N(9 * (v - u))}`;
  if (k === 2) return `${w}(x + y) = ${(u + v) * w} and ${w + 1}(x − y) = ${(u - v) * (w + 1)}`;
  return `x − y = ${v} and 2(x + y) = ${2 * (2 * u + v)}`;
}
function sysxCheck(p: number[], X: number, Y: number): boolean {
  const [k, u, v, w] = p;
  const [x, y] = sysxAns(p);
  if (k === 0) return close(X + Y, x + y) && close(X - w, v * (Y - w));
  if (k === 1) return Number.isInteger(X) && Number.isInteger(Y) && X >= 1 && X <= 9 && Y >= 0 && Y <= 9 && X + Y === u + v && 10 * Y + X - (10 * X + Y) === 9 * (v - u);
  if (k === 2) return close((X + Y) * w, (u + v) * w) && close((X - Y) * (w + 1), (u - v) * (w + 1));
  return close(X - Y, v) && close(2 * (X + Y), 2 * (2 * u + v));
}
function powSums(n: number): [number, number, number] {
  return [(n * (n + 1)) / 2, (n * (n + 1) * (2 * n + 1)) / 6, ((n * (n + 1)) / 2) ** 2];
}
// alcvoc: the parts of a circle, described, with the features that define each, and four symmetry questions
type VocFeat = { shape: "point" | "line" | "curve" | "region" | "sym"; ends?: "circle" | "centre"; centre?: boolean; whole?: boolean; bound?: "radii" | "chord" };
const TERMS = ["a radius", "a diameter", "a chord", "an arc", "a sector", "a segment", "the centre", "the circumference"];
const LETS: [string, string][] = [["P", "Q"], ["A", "B"], ["X", "Y"], ["C", "D"], ["M", "N"], ["K", "L"]];
const WHY = {
  chord: "A chord was called a diameter; a diameter is a chord that passes through the centre, and this one does not.",
  diameter: "It was called a radius; a radius goes from the centre to the circle, while a diameter goes right across, through the centre.",
  radius: "It was called a diameter; a diameter goes right across the circle, but this segment stops at the centre: it is a radius.",
  arc: "It was called a chord; a chord is the straight segment between the points, while the curved part of the circle is an arc.",
  sector: "It was called a segment; a segment is bounded by a chord and an arc, but this region is bounded by two radii and an arc: a sector.",
  segment: "It was called a sector; a sector is bounded by two radii, but this region is bounded by a chord and an arc: a segment.",
  centre: "It was called a radius; the radius is the distance (or the segment) from the centre, and the point itself is the centre.",
  circumference: "It was called an arc; an arc is only part of the circle, and the whole boundary is the circumference.",
};
const VOC: { say: (L: [string, string], v: number) => string; ans: string; mix?: string; why: string; feat: VocFeat; not?: string[]; choices?: string[] }[] = [
  { say: (L) => `${L[0]}${L[1]} is a straight line segment joining two points ${L[0]} and ${L[1]} of a circle with centre O, and it does not pass through O. What is ${L[0]}${L[1]} called?`, ans: "a chord", mix: "a diameter", why: WHY.chord, feat: { shape: "line", ends: "circle", centre: false } },
  { say: (L, v) => `A straight steel rod ${L[0]}${L[1]}, ${v * 10} cm long, is fixed across a round window with both ends on the frame; it does not pass through the middle of the window. In the language of circles, what is the rod?`, ans: "a chord", mix: "a diameter", why: WHY.chord, feat: { shape: "line", ends: "circle", centre: false } },
  { say: (L, v) => `In a circle with centre O and radius ${v} cm, ${L[0]}${L[1]} joins two points of the circle, passes through O and is ${2 * v} cm long. What is ${L[0]}${L[1]} called?`, ans: "a diameter", mix: "a radius", why: WHY.diameter, feat: { shape: "line", ends: "circle", centre: true }, not: ["a chord"] },
  { say: (L, v) => `A straight path ${L[0]}${L[1]} crosses a round park of radius ${v * 10} m from one edge to the other, passing through the fountain at its centre. In the language of circles, what is the path?`, ans: "a diameter", mix: "a radius", why: WHY.diameter, feat: { shape: "line", ends: "circle", centre: true }, not: ["a chord"] },
  { say: (L, v) => `O is the centre of a circle of radius ${v} cm and ${L[0]} is a point on the circle. What is the line segment O${L[0]} called?`, ans: "a radius", mix: "a diameter", why: WHY.radius, feat: { shape: "line", ends: "centre" } },
  { say: (L, v) => `A spoke of a bicycle wheel goes straight from the hub at the centre to the point ${L[0]} on the rim, ${v * 5} cm away. In the language of circles, what is the spoke?`, ans: "a radius", mix: "a diameter", why: WHY.radius, feat: { shape: "line", ends: "centre" } },
  { say: (L, v) => `${L[0]} and ${L[1]} are two points on a circle of radius ${v} cm. What is the curved part of the circle from ${L[0]} to ${L[1]} (the shorter way round) called?`, ans: "an arc", mix: "a chord", why: WHY.arc, feat: { shape: "curve", whole: false } },
  { say: (L, v) => `A round pizza of radius ${v * 2} cm is cut into slices from the centre. In the language of circles, what is the curved crust edge ${L[0]}${L[1]} of one slice?`, ans: "an arc", mix: "a chord", why: WHY.arc, feat: { shape: "curve", whole: false } },
  { say: (L, v) => `In a circle with centre O and radius ${v} cm, what is the region bounded by the two radii O${L[0]}, O${L[1]} and the arc ${L[0]}${L[1]} called?`, ans: "a sector", mix: "a segment", why: WHY.sector, feat: { shape: "region", bound: "radii" } },
  { say: (L, v) => `A round cake of radius ${v * 2} cm is cut by two straight cuts O${L[0]} and O${L[1]} from its centre O to the edge. In the language of circles, what is the piece between the two cuts?`, ans: "a sector", mix: "a segment", why: WHY.sector, feat: { shape: "region", bound: "radii" } },
  { say: (L, v) => `In a circle of radius ${v} cm, ${L[0]}${L[1]} is a chord. What is the region bounded by the chord ${L[0]}${L[1]} and the arc ${L[0]}${L[1]} called?`, ans: "a segment", mix: "a sector", why: WHY.segment, feat: { shape: "region", bound: "chord" } },
  { say: (L, v) => `A round roti of radius ${v * 2} cm is cut once, straight across from ${L[0]} to ${L[1]} on its edge, and the cut misses the centre. In the language of circles, what is the smaller piece cut off?`, ans: "a segment", mix: "a sector", why: WHY.segment, feat: { shape: "region", bound: "chord" } },
  { say: (L, v) => `Every point of a circle is exactly ${v} cm from the point ${L[0]} inside it. What is the point ${L[0]} called?`, ans: "the centre", mix: "a radius", why: WHY.centre, feat: { shape: "point" } },
  { say: (L, v) => `What is the name for the complete boundary of the circle with centre ${L[0]} and radius ${v} cm — the whole curve, whose length is 2π × ${v} cm?`, ans: "the circumference", mix: "an arc", why: WHY.circumference, feat: { shape: "curve", whole: true } },
  { say: (L, v) => `A wire is bent all the way round the edge of a circular well with centre ${L[0]} and radius ${v} m. In the language of circles, which part of the circle does the wire follow?`, ans: "the circumference", mix: "an arc", why: WHY.circumference, feat: { shape: "curve", whole: true } },
  { say: (L, v) => `A line segment ${L[0]}${L[1]} of length ${v} cm has both its ends on a circle of radius ${v} cm. What is ${L[0]}${L[1]} called?`, ans: "a chord", mix: "a diameter", why: WHY.chord, feat: { shape: "line", ends: "circle", centre: false } },
  { say: (L, v) => `How many lines of symmetry does a circle with centre ${L[0]} and radius ${v} cm have?`, ans: "infinitely many", choices: ["infinitely many", "exactly one", "exactly two", "exactly four"], mix: "exactly two", why: "Only the two diameters across and up-and-down were counted; EVERY line through the centre is a line of symmetry, so there are infinitely many.", feat: { shape: "sym" } },
  { say: (L, v) => `A circle has centre ${L[0]} and radius ${v} cm. Which lines are lines of symmetry of the circle?`, ans: "every line through the centre", choices: ["every line through the centre", "every chord of the circle", "only one diameter", "no straight line"], mix: "every chord of the circle", why: "A chord that misses the centre cuts the circle into two unequal parts, so it is not a line of symmetry; only lines through the centre are.", feat: { shape: "sym" } },
  { say: (L, v) => `A circle with centre ${L[0]} is turned about ${L[0]} through ${10 * v + 7}°. Does it fit exactly onto itself?`, ans: "Yes: it fits onto itself after a turn through any angle", choices: ["Yes: it fits onto itself after a turn through any angle", "No: only after turns of 90°, 180°, 270° or 360°", "No: only after a turn of 180° or 360°", "No: only after a full turn of 360°"], mix: "No: only after turns of 90°, 180°, 270° or 360°", why: "The circle was treated like a square; a circle fits onto itself after a turn about its centre through ANY angle.", feat: { shape: "sym" } },
  { say: (L, v) => `${L[0]} is a point on a circle with centre O and radius ${v} cm. ${L[0]} is reflected in a diameter of the circle that does not pass through ${L[0]}. Where is the image of ${L[0]}?`, ans: "on the same circle", choices: ["on the same circle", "at the centre O", "outside the circle", "inside the circle, but not at O"], mix: "inside the circle, but not at O", why: "Reflection in a line through the centre keeps every distance from the centre the same, so the image is still on the circle.", feat: { shape: "sym" } },
];
/** alcvoc: the four options in a fixed order for these parameters. */
function vocOpts(p: number[]): string[] {
  const it = VOC[p[0]];
  if (it.choices) {
    return perm(p, 4).map((i) => it.choices![i]);
  }
  const rest = TERMS.filter((t) => t !== it.ans && t !== it.mix && !(it.not ?? []).includes(t));
  const h = hsh(`voc${p.join(",")}`);
  const o1 = rest[h % rest.length];
  const rest2 = rest.filter((t) => t !== o1);
  const o2 = rest2[(h >>> 8) % rest2.length];
  const items = [it.ans, it.mix!, o1, o2];
  return perm(p, 4).map((i) => items[i]);
}
/** Which options are true, by an independent route: the features of a part decide its name; the symmetry questions are
 * checked by reflecting and turning points of a unit circle. */
function vocTruth(p: number[], opts: string[]): boolean[] {
  const it = VOC[p[0]];
  if (it.feat.shape !== "sym") {
    const f = it.feat;
    const name = f.shape === "point" ? "the centre" : f.shape === "curve" ? (f.whole ? "the circumference" : "an arc") : f.shape === "line" ? (f.ends === "centre" ? "a radius" : f.centre ? "a diameter" : "a chord") : f.bound === "radii" ? "a sector" : "a segment";
    return opts.map((o) => o === name);
  }
  const pts: P2[] = [...Array(36).keys()].map((i) => [Math.cos(0.3 + i * 0.1745), Math.sin(0.3 + i * 0.1745)]);
  const onC = (q: P2) => Math.abs(Math.hypot(q[0], q[1]) - 1) < 1e-9;
  const refl = (q: P2, deg: number, off: number): P2 => {
    const d: P2 = [Math.cos((deg * Math.PI) / 180), Math.sin((deg * Math.PI) / 180)];
    const P0: P2 = [-off * d[1], off * d[0]];
    const t = (q[0] - P0[0]) * d[0] + (q[1] - P0[1]) * d[1];
    return [2 * (P0[0] + t * d[0]) - q[0], 2 * (P0[1] + t * d[1]) - q[1]];
  };
  const throughO = [0, 17, 45, 90, 123, 160].every((a) => pts.every((q) => onC(refl(q, a, 0))));
  const chordLine = pts.every((q) => onC(refl(q, 30, 0.5)));
  const th = ((10 * (3 + 2 * p[2]) + 7) * Math.PI) / 180;
  const rot = pts.every((q) => onC([q[0] * Math.cos(th) - q[1] * Math.sin(th), q[0] * Math.sin(th) + q[1] * Math.cos(th)]));
  const img = refl([Math.cos(0.7), Math.sin(0.7)], 0, 0);
  const dist = Math.hypot(img[0], img[1]);
  const base = it.choices!;
  const tv: boolean[] =
    p[0] === 16 ? [throughO, false, false, false] : p[0] === 17 ? [throughO, chordLine, !throughO, false] : p[0] === 18 ? [rot, !rot, !rot, !rot] : [Math.abs(dist - 1) < 1e-9, dist < 1e-9, dist > 1 + 1e-9, dist > 1e-9 && dist < 1 - 1e-9];
  return opts.map((o) => tv[base.indexOf(o)]);
}
/** alcyc: angles are in steps of 5°. */
function cyc5([k, x, y, z]: number[]): number[] {
  return [k, 5 * x, 5 * y, 5 * z];
}
function cycOk(q: number[]): boolean {
  const [k, x, y, z] = cyc5(q);
  if (k === 0) {
    const d = 360 - x - y - z;
    return z >= 30 && z <= 150 && d >= 30 && d <= 150;
  }
  return z === 0 && x >= 30 && y >= 30 && x <= 150 && y <= 150 && !(k === 1 && x + y === 180 && x === y) && !(k === 2 && x === 90 && y === 90);
}
function cycKeep(q: number[]): boolean {
  if (!cycOk(q)) return false;
  const [k, x, y, z] = cyc5(q);
  const h = hsh(`cyc${q.join(",")}`);
  if (k === 0) return x + z === 180 ? h % 3 === 0 : x + y === 180 ? h % 4 === 0 : h % 60 === 0;
  if (k === 1) return x === y || x + y === 180 ? true : h % 25 === 0;
  return x + y === 180 || x === y ? true : h % 25 === 0;
}
/** alzgr: the polynomial (x³ first), the segments of its graph inside the window, and its zeros counted on a grid. */
function zgrOk([t, a, b, c, s]: number[]): boolean {
  if (s > 1) return false;
  if (t === 0) return a < b && c === 0;
  if (t === 1) return b === 0 && c === 0;
  if (t === 2) return b === 0 && c >= 1 && c <= 3;
  if (t === 3) return a < b && b < c;
  if (t === 4) return c === 0;
  return a !== b && c === 0;
}
function zgrPoly([t, a, b, c, s]: number[]): number[] {
  const sg = s ? -1 : 1;
  const P = t === 0 ? mulP([1, -a], [1, -b]) : t === 1 ? mulP([1, -a], [1, -a]) : t === 2 ? [1, -2 * a, a * a + c] : t === 3 ? mulP(mulP([1, -a], [1, -b]), [1, -c]) : t === 4 ? mulP([1, -a], [1, -2 * b, b * b + 1]) : mulP(mulP([1, -a], [1, -a]), [1, -b]);
  return P.map((x) => (sg * x) / (t >= 3 ? 2 : 1));
}
function zgrSegs(p: number[]): [[number, number], [number, number]][] {
  const P = zgrPoly(p);
  const out: [[number, number], [number, number]][] = [];
  const r3 = (v: number) => Math.round(v * 1000) / 1000;
  for (let i = -50; i < 50; i++) {
    const [x1, x2] = [i / 10, (i + 1) / 10];
    const [y1, y2] = [horner(P, x1), horner(P, x2)];
    if (Math.abs(y1) <= 5 && Math.abs(y2) <= 5) out.push([[r3(x1), r3(y1)], [r3(x2), r3(y2)]]);
  }
  return out;
}
function zgrCount(P: number[]): number {
  const vs = [...Array(49).keys()].map((i) => horner(P, -6 + i / 4));
  let n = vs.filter((v) => Math.abs(v) < 1e-12).length;
  for (let i = 0; i + 1 < vs.length; i++) if (Math.abs(vs[i]) >= 1e-12 && Math.abs(vs[i + 1]) >= 1e-12 && Math.sign(vs[i]) !== Math.sign(vs[i + 1])) n++;
  return n;
}
function zgrTurns(P: number[]): number {
  const dP = P.slice(0, -1).map((c, i) => c * (P.length - 1 - i));
  let n = 0;
  let prev = horner(dP, -6);
  for (let i = 1; i <= 1200; i++) {
    const v = horner(dP, -6 + i / 100);
    if (v !== 0 && prev !== 0 && Math.sign(v) !== Math.sign(prev)) n++;
    if (v !== 0) prev = v;
  }
  return n;
}
