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
/** For each situation: the right fact, then the other options (fact indices); the first wrong one is the usual mix-up. */
const THEO: number[][] = [
  [0, 1, 2, 3],
  [1, 0, 7, 3],
  [2, 1, 3, 5],
  [3, 6, 1, 0],
  [4, 5, 2, 0],
  [5, 4, 1, 2],
];
const theoStatement = (s: number, x: number) =>
  [
    `O is the centre of a circle and A, B, C lie on it, with C on the major arc AB. We know ∠AOB = ${2 * x}°, and we write ∠ACB = ${x}°.`,
    `A, B, C, D lie on a circle, with C and D on the same side of the chord AB. We know ∠ACB = ${x}°, and we write ∠ADB = ${x}°.`,
    `AB is a diameter of a circle and C is another point on the circle. We write ∠ACB = 90°, so ∠CAB = ${90 - (x % 70) - 10}° when ∠CBA = ${(x % 70) + 10}°.`,
    `ABCD is a cyclic quadrilateral with ∠DAB = ${x + 40}°. We write ∠BCD = ${140 - x}°.`,
    `O is the centre of a circle and OM is perpendicular to the chord AB, with M on AB. AB = ${2 * x} mm, and we write AM = ${x} mm.`,
    `In a circle with centre O, the chords AB and CD are both ${x} mm long. AB is ${Math.floor(x / 4)} mm from O, and we write that CD is also ${Math.floor(x / 4)} mm from O.`,
  ][s];

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
    limits: "Cubics divided by a monic linear divisor x − r; division by ax − b and by quadratics is not here.",
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
    prompt: () => `The table in the picture shows pairs (x, y) that follow one straight-line rule. Write y in terms of x.`,
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
    word: ([a, b, s]) => `${nm(a + b)} records the temperature y (in °C) of a liquid x minutes after starting an experiment: ${[0, 1, 2, 3, 4].map((i) => `after ${s + i} min it is ${N(a * (s + i) + b)} °C`).join("; ")}. The temperature changes steadily. Write y in terms of x.`,
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
    limits: "Two monic quadratics with exactly one common linear factor; GCDs of cubics and of three polynomials are not here.",
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
    limits: "Quotients of two monic quadratics sharing one factor; sums and products of rational expressions are not here. The answer is asked as (p, q) so that the unreduced fraction cannot count.",
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
        B("added-to-eliminate", "procedural", SYS, "After making the x coefficients equal, the equations were added; with the same sign they must be subtracted to remove x.", yy !== null && yy !== y ? tup((c1 - b1 * yy) / a1, yy) : null),
      ].filter((b) => b.predict !== null);
    },
    distractors: ([, , , , x, y]) => [tup(-x, y), tup(x, -y), tup(x + 1, y - 1)],
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
        B("added-to-eliminate", "procedural", SYS, "After making the pen numbers equal, the two equations were added; they must be subtracted to remove the pens.", yy !== y ? tup((c1 - b1 * yy) / a1, yy) : null),
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
    difficulty: ([, , , , kind]) => (kind === 1 ? 2 : kind === 0 ? 3 : 2),
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
    prompt: ([a, b, c, kind]) => `α and β are the zeros of p(x) = ${pl([a, b, c])}. Without finding α and β, find the value of ${["α² + β²", "1/α + 1/β", "α/β + β/α"][kind]}.`,
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
    figure: ([kind, x1, y1, x2, y2]) => ({ type: "plane", points: [[x1, y1, "A"], [x2, y2, kind ? "M" : "B"]], ...(kind ? {} : { segments: [[[x1, y1], [x2, y2]]] }), range: kind ? 13 : 7 }),
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
    word: ([ax, ay, u1, v1, u2, v2]) => `A surveyor marks three posts on a grid plan of a field at ${tup(ax, ay)}, ${tup(ax + u1, ay + v1)} and ${tup(ax + u2, ay + v2)}. A rope is tied around the three posts to make a triangle. What kind of triangle is it?`,
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
    prompt: ([x1, y1, x2, y2, x3]) => `For which value of k are the points ${tup(x1, y1)}, ${tup(x2, y2)} and (${N(x3)}, k) collinear?`,
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
    // 3 angle in a semicircle, 4 base angle of the isosceles triangle OAB
    parse: none,
    reject: (p) => {
      if (!inR(p, [[0, 4], [15, 150]])) return "One of five angle facts with angles in the family's ranges.";
      const [k, x] = p;
      const ok = k <= 1 ? x <= 85 : k === 2 ? x >= 40 && x <= 140 : k === 3 ? x <= 75 : x >= 20 && x % 2 === 0;
      return ok ? null : "That angle is outside the range for this kind of question.";
    },
    prompt: ([k, x]) =>
      [
        `O is the centre of a circle, and A, B, C are points on the circle with C on the major arc AB. ∠ACB = ${deg(x)}. Find ∠AOB in degrees.`,
        `O is the centre of a circle, and A, B, C are points on the circle with C on the major arc AB. ∠AOB = ${deg(2 * x)}. Find ∠ACB in degrees.`,
        `ABCD is a cyclic quadrilateral (all four vertices lie on one circle). ∠DAB = ${deg(x)}. Find ∠BCD in degrees.`,
        `AB is a diameter of a circle and C is another point on the circle. ∠CAB = ${deg(x)}. Find ∠CBA in degrees.`,
        `O is the centre of a circle and A, B are points on it. ∠AOB = ${deg(x)}. Find ∠OAB in degrees.`,
      ][k],
    solve: ([k, x]) => {
      const v = [2 * x, x, 180 - x, 90 - x, (180 - x) / 2][k];
      const fact = ["angle at the centre is twice the angle at the circumference", "angle at the centre is twice the angle at the circumference", "opposite angles of a cyclic quadrilateral add up to 180°", "the angle in a semicircle is 90°", "OA = OB (radii), so the base angles are equal"][k];
      return { steps: [st("fact", "recall", CT, [k], fact), st("compute", "evaluate", k >= 3 ? TRI : CT, [k, x], v)], answer: v };
    },
    // independent: place the points on a unit circle and measure the angle numerically
    validate: ([k, x], v) => {
      if (typeof v !== "number" || v <= 0 || v >= 180) return false;
      const O: P2 = [0, 0];
      if (k === 0) return near(angleAt(onCircle(180 + v / 2), onCircle(0), onCircle(v)), x, 1e-9);
      if (k === 1) return near(angleAt(onCircle(180 + x), onCircle(0), onCircle(2 * x)), v, 1e-9);
      if (k === 2) return near(angleAt(onCircle(x), onCircle(0), onCircle(2 * x)), v, 1e-9) && near(angleAt(onCircle(180 + x), onCircle(0), onCircle(2 * x)), x, 1e-9);
      if (k === 3) return near(angleAt([1, 0], [-1, 0], onCircle(2 * x)), v, 1e-9);
      return near(angleAt(onCircle(0), O, onCircle(x)), v, 1e-9);
    },
    bugs: ([k, x]) =>
      [
        [B("halved", "conceptual", CT, "The angle was halved; the angle at the CENTRE is the larger one: twice the angle at the circumference.", x % 2 === 0 ? x / 2 : null), B("equal", "conceptual", CT, "The two angles were taken as equal; the angle at the centre is twice the angle at the circumference.", x)],
        [B("doubled", "conceptual", CT, "The angle at the centre was doubled; the angle at the circumference is half of it.", 4 * x), B("equal", "conceptual", CT, "The two angles were taken as equal; the angle at the circumference is half the angle at the centre.", 2 * x)],
        [B("opposite-equal", "conceptual", CT, "Opposite angles of a cyclic quadrilateral were taken as equal; they add up to 180°.", x), B("complement", "recall", CT, "90° was used; opposite angles of a cyclic quadrilateral add up to 180°, not 90°.", x < 90 ? 90 - x : null)],
        [B("no-right-angle", "conceptual", CT, "∠ACB was not used; the angle in a semicircle is 90°, so the other two angles add up to 90°.", 180 - x), B("equal", "conceptual", TRI, "The two angles at A and B were taken as equal; that is only true when C is halfway round.", x)],
        [B("not-halved", "procedural", TRI, `180° − ${x}° was not shared between the two equal angles.`, 180 - x), B("half-centre", "conceptual", CT, "The base angle was taken as half the angle at the centre; in triangle OAB the two base angles share 180° minus the angle at O.", x / 2 !== (180 - x) / 2 ? x / 2 : null)],
      ][k].filter((b) => b.predict !== null),
    variants: () => [],
    explain: (s) => (s.id === "fact" ? `Use: ${s.value}` : `So the angle is ${s.value}°`),
    figure: ([k, x]) => (k === 3 ? { type: "triangle", angles: [deg(x), "?", "90°"], sides: ["", "", "AB (diameter)"], right: true } : k === 4 ? { type: "triangle", angles: ["?", "", deg(x)], sides: ["r", "", "r"] } : null),
    domain: [[0, 4], [15, 150]],
    difficulty: ([k]) => (k === 0 || k === 3 ? 1 : k === 1 || k === 2 ? 2 : 3),
    teach: {
      idea: "An arc makes twice the angle at the centre that it makes at any point on the rest of the circle. From this: angles in the same segment are equal, the angle in a semicircle is 90°, and opposite angles of a cyclic quadrilateral add up to 180°.",
      method: "Name the fact that links the given angle to the one asked for, write the relation (×2, ÷2, 180° − , 90° − ), then work it out.",
      alternatives: [
        { id: "radii", title: "Draw the radii", kind: "conceptual", text: ["Join the centre to the points on the circle: every radius is the same length, so the triangles formed are isosceles.", "Equal base angles and the angle sum of 180° in each triangle lead to the same results."] },
      ],
    },
    limits: "Angle facts with one step; multi-step angle chases and proofs are marked by an educator.",
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
    figure: ([k, r, d]) => ({ type: "triangle", sides: k === 0 ? [`${d} cm`, "half the chord", `${r} cm`] : ["distance", `${d} cm`, `${r} cm`], right: true }),
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
    // [s, x]: situation s with a number x
    parse: none,
    reject: (p) => (!inR(p, [[0, 5], [20, 80]]) ? "One of six situations with a number from 20 to 80." : null),
    prompt: ([s, x]) => `${theoStatement(s, x)} Which fact justifies this step?`,
    choices: ([s, x]) => perm([s, x], 4).map((i) => FACTS[THEO[s][i]]),
    solve: ([s, x]) => ({ steps: [st("fact", "recall", CT, [s], FACTS[THEO[s][0]])], answer: perm([s, x], 4).indexOf(0) }),
    // independent: find the option whose fact is the one for this situation by its wording
    validate: ([s, x], v) => {
      const key = ["twice", "same segment of a circle are equal", "semicircle", "add up to 180", "bisects", "equidistant"][s];
      const opts = perm([s, x], 4).map((i) => FACTS[THEO[s][i]]);
      return typeof v === "number" && opts[v] !== undefined && opts[v].includes(key) && opts.filter((o) => o.includes(key)).length === 1;
    },
    bugs: ([s, x]) => [
      B("mixed-up-fact", "conceptual", CT, ["The fact about angles in the same segment was chosen; here one angle is at the centre, so the centre-angle fact applies.", "The centre-angle fact was chosen; here both angles are on the circle, standing on the same arc.", "The fact about angles in the same segment was chosen; the step uses the diameter, so the semicircle fact applies.", "Opposite angles of a cyclic quadrilateral are not equal in general; they add up to 180°.", "The fact about equal chords was chosen; this step is about one chord and the perpendicular from the centre.", "The fact about the perpendicular bisecting a chord was chosen; this step compares two equal chords."][s], perm([s, x], 4).indexOf(1)),
    ],
    variants: () => [],
    explain: (s) => `The step uses: ${s.value}`,
    domain: [[0, 5], [20, 80]],
    difficulty: ([s]) => (s === 2 || s === 4 ? 1 : s === 0 || s === 3 ? 2 : 3),
    teach: {
      idea: "Each step in a geometry argument needs a reason: a definition or a theorem already proved. Matching the situation (where the angle is, what the chord does) to the theorem is the first part of writing a proof.",
      method: "Look at what the step uses: an angle at the centre, two angles on the same arc, a diameter, a cyclic quadrilateral, a perpendicular to a chord, or equal chords. Pick the fact about exactly that.",
      alternatives: [
        { id: "picture", title: "Sketch it first", kind: "conceptual", text: ["Make a quick sketch and mark what is given and what is claimed.", "The theorem you need is the one whose picture looks like your sketch."] },
      ],
    },
    limits: "Choosing the justification for one step; writing the full proof is marked by an educator.",
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
