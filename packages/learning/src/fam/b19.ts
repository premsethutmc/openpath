/**
 * Batch b19 (families@2), Grades 11–12: loci, pairs of straight lines, straight lines, tangents and normals to conics,
 * points, lines and planes in space, complex numbers (arithmetic, modulus, powers of i, square roots, argument, polar
 * form, de Moivre's theorem, nth roots, circles in the Argand plane) and probability (event algebra, mutually exclusive
 * and exhaustive events, total probability, Bayes' theorem, binomial probabilities, mean and variance).
 * Written by OpenPath; CC0.
 */
import type { Bug, Def, Step, Value } from "../family-kit";
import { gcd, sup } from "../family-kit";
import { evaluate, parse } from "../answer-types";

const LOCUS = "MATH.coordinate.locus";
const PAIR = "MATH.coordinate.pair-of-lines";
const SPC = "MATH.coordinate.space-coordinates";
const LINE = "MATH.coordinate.straight-lines";
const TAN = "MATH.coordinate.conic-tangents-normals";
const SKEW = "MATH.coordinate.skew-line-distance";
const SL = "MATH.coordinate.space-lines";
const PL = "MATH.coordinate.space-planes";
const CX = "MATH.number.complex";
const POLAR = "MATH.number.complex-polar-form";
const CLOC = "MATH.number.complex-locus";
const DM = "MATH.number.de-moivre-roots";
const EV = "MATH.probability.events";
const BAY = "MATH.probability.bayes";
const BIN = "MATH.probability.binomial-distribution";
const DIST = "MATH.coordinate.distance";
const QUAD = "MATH.algebra.quadratics";
const VEC = "MATH.vectors.products";
const TRIG = "MATH.trigonometry.functions";
const COND = "MATH.probability.conditional";
const COMB = "MATH.algebra.permutations";
const COMP = "MATH.probability.complements";
const CONIC = "MATH.coordinate.conics";
const RV = "MATH.probability.random-variables";

const none = () => null;
const S = (id: string, op: string, competency: string, inputs: (number | string)[], value: Value): Step => ({ id, op, competency, inputs, value });
const B = (id: string, kind: Bug["kind"], competency: string, says: string, predict: Value | null): Bug => ({ id, kind, competency, says, predict });
const NAMES = ["Anu", "Ravi", "Meena", "Arjun", "Kavya", "Imran", "Divya", "Karthik"];
const nm = (k: number) => NAMES[((k % NAMES.length) + NAMES.length) % NAMES.length];
const inR = (v: number, lo: number, hi: number) => Number.isInteger(v) && v >= lo && v <= hi;
const allIn = (p: number[], ranges: [number, number][]) => p.length === ranges.length && p.every((v, i) => inR(v, ranges[i][0], ranges[i][1]));

// ---------------------------------------------------------------- exact numbers: rationals and q√m

/** A number as printed, with − for minus. */
const mi = (v: number) => (v < 0 ? `−${-v}` : String(v));
type R = [number, number];
const R_ = (n: number, d = 1): R => {
  if (!d) throw new Error("zero denominator");
  const g = gcd(Math.abs(n), Math.abs(d)) || 1;
  const s = d < 0 ? -1 : 1;
  return [(s * n) / g || 0, (s * d) / g];
};
const radd = (a: R, b: R) => R_(a[0] * b[1] + b[0] * a[1], a[1] * b[1]);
const rsub = (a: R, b: R) => R_(a[0] * b[1] - b[0] * a[1], a[1] * b[1]);
const rmul = (a: R, b: R) => R_(a[0] * b[0], a[1] * b[1]);
const rdiv = (a: R, b: R) => R_(a[0] * b[1], a[1] * b[0]);
const rv = (a: R) => a[0] / a[1];
const rabs = (a: R): R => [Math.abs(a[0]), a[1]];
const rs = (a: R) => `${a[0] < 0 ? "−" : ""}${Math.abs(a[0])}${a[1] === 1 ? "" : `/${a[1]}`}`;
const sqf = (n: number): [number, number] => {
  let k = 1;
  let m = n;
  for (let p = 2; p * p <= m; p++)
    while (m % (p * p) === 0) {
      m /= p * p;
      k *= p;
    }
  return [k, m];
};
/** q√m with m square-free. */
type E = { q: R; m: number };
const E_ = (q: R, N = 1): E => {
  if (N === 0 || q[0] === 0) return { q: [0, 1], m: 1 };
  const [k, m] = sqf(N);
  return { q: rmul(q, [k, 1]), m };
};
const es = (e: E) => {
  if (e.m === 1 || e.q[0] === 0) return rs(e.q);
  const [n, d] = e.q;
  return `${n < 0 ? "−" : ""}${Math.abs(n) === 1 ? "" : Math.abs(n)}√${e.m}${d === 1 ? "" : `/${d}`}`;
};
const ev = (e: E) => rv(e.q) * Math.sqrt(e.m);
const emul = (a: E, b: E) => E_(rmul(a.q, b.q), a.m * b.m);
const epow = (a: E, n: number) => {
  let out = E_([1, 1]);
  for (let i = 0; i < n; i++) out = emul(out, a);
  return out;
};
/** (q)√N simplified, as printed. */
const sq = (q: R, N: number) => es(E_(q, N));
/** Two surds added, as printed (like terms combined). */
const esum = (a: E, b: E) => (a.m === b.m ? es({ q: radd(a.q, b.q), m: a.m }) : `${es(a)} + ${es(b)}`);
const tup = (xs: string[]) => `(${xs.join(", ")})`;

/** A polynomial as printed: terms [coefficient, monomial] ("x²", "xy", "x", "" for the constant). */
const poly = (terms: [R, string][]) => {
  const t = terms.filter(([c]) => c[0] !== 0);
  if (!t.length) return "0";
  return t
    .map(([c, v], i) => {
      const a: R = [Math.abs(c[0]), c[1]];
      const body = v === "" ? rs(a) : a[0] === 1 && a[1] === 1 ? v : a[1] === 1 ? `${a[0]}${v}` : `(${rs(a)})${v}`;
      return i === 0 ? `${c[0] < 0 ? "−" : ""}${body}` : ` ${c[0] < 0 ? "−" : "+"} ${body}`;
    })
    .join("");
};
const lin2 = (a: number, b: number, c: number) => `${poly([[R_(a), "x"], [R_(b), "y"], [R_(c), ""]])} = 0`;
const lin3 = (a: number, b: number, c: number, d: number) => `${poly([[R_(a), "x"], [R_(b), "y"], [R_(c), "z"], [R_(d), ""]])} = 0`;
/** (x − a)² as printed. */
const sqTerm = (v: string, a: number) => (a === 0 ? `${v}²` : `(${v} ${a > 0 ? "−" : "+"} ${Math.abs(a)})²`);
const P2 = (x: number, y: number) => `(${mi(x)}, ${mi(y)})`;
const P3 = (p: number[]) => `(${p.map(mi).join(", ")})`;
/** A vector a î + b ĵ + c k̂ as printed. */
const vec = (p: number[]) => {
  const u = ["î", "ĵ", "k̂"];
  const t = p.map((c, i) => [c, u[i]] as [number, string]).filter(([c]) => c !== 0);
  if (!t.length) return "0";
  return t.map(([c, v], i) => `${i === 0 ? (c < 0 ? "−" : "") : c < 0 ? " − " : " + "}${Math.abs(c) === 1 ? "" : Math.abs(c)}${v}`).join("");
};
const lineVec = (a: number[], u: number[], par = "λ") => `r⃗ = (${vec(a)}) + ${par}(${vec(u)})`;
/** A complex number a + bi with whole-number parts, as printed. */
const cz = (a: number, b: number) => {
  const im = b === 0 ? "" : `${Math.abs(b) === 1 ? "" : Math.abs(b)}i`;
  if (a === 0) return b === 0 ? "0" : `${b < 0 ? "−" : ""}${im}`;
  return b === 0 ? mi(a) : `${mi(a)} ${b < 0 ? "−" : "+"} ${im}`;
};
/** A complex number with surd parts (c√r), as printed: "−√3 + i", "2 − 2√3 i". */
const czs = (rc: number, rr: number, ic: number, ir: number) => {
  const part = (c: number, r: number) => `${Math.abs(c) === 1 && r > 1 ? "" : Math.abs(c)}${r > 1 ? `√${r}` : ""}`;
  const re = rc === 0 ? "" : `${rc < 0 ? "−" : ""}${part(rc, rr)}`;
  const imBody = ic === 0 ? "" : `${Math.abs(ic) === 1 && ir === 1 ? "" : ir > 1 ? `${part(ic, ir)} ` : Math.abs(ic)}i`;
  if (!re) return ic === 0 ? "0" : `${ic < 0 ? "−" : ""}${imBody}`;
  return ic === 0 ? re : `${re} ${ic < 0 ? "−" : "+"} ${imBody}`;
};
const piStr = (k: R) => (k[0] === 0 ? "0" : `${k[0] < 0 ? "−" : ""}${Math.abs(k[0]) === 1 ? "" : Math.abs(k[0])}π${k[1] === 1 ? "" : `/${k[1]}`}`);
const pct = (tenths: number) => `${tenths * 10}%`;

// ---------------------------------------------------------------- reading an answer back for an independent check

const close = (a: number, b: number, tol = 1e-7) => Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= tol * Math.max(1, Math.abs(a), Math.abs(b));
const fnOf = (v: Value) => {
  if (typeof v !== "string") return null;
  try {
    const e = parse(v);
    return (env: Record<string, number>) => {
      try {
        return evaluate(e, env);
      } catch {
        return NaN;
      }
    };
  } catch {
    return null;
  }
};
const num1 = (v: Value): number | null => {
  if (typeof v === "number") return v;
  if (typeof v !== "string") return null;
  try {
    const x = evaluate(parse(v), {});
    return Number.isFinite(x) ? x : null;
  } catch {
    return null;
  }
};
const nums = (v: Value): number[] | null => {
  if (typeof v !== "string") return null;
  let t = v.trim();
  if (t.startsWith("(") && t.endsWith(")")) t = t.slice(1, -1);
  const parts: string[] = [];
  let depth = 0;
  let cur = "";
  for (const c of t) {
    if (c === "(") depth++;
    if (c === ")") depth--;
    if (c === "," && depth === 0) {
      parts.push(cur);
      cur = "";
    } else cur += c;
  }
  parts.push(cur);
  const out = parts.map((x) => num1(x.trim()));
  return out.some((x) => x === null) ? null : (out as number[]);
};
const dot = (a: number[], b: number[]) => a.reduce((s, x, i) => s + x * b[i], 0);
const cross = (a: number[], b: number[]) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const sub = (a: number[], b: number[]) => a.map((x, i) => x - b[i]);
const addv = (a: number[], b: number[]) => a.map((x, i) => x + b[i]);
const scl = (k: number, a: number[]) => a.map((x) => k * x);
const norm = (a: number[]) => Math.sqrt(dot(a, a));
const isZero = (a: number[]) => a.every((x) => x === 0);
const samePts = (a: number[], b: number[]) => a.length === b.length && a.every((x, i) => close(x, b[i], 1e-9));
const cmul = (a: number[], b: number[]) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
const gcd3 = (...xs: number[]) => xs.reduce((g, x) => gcd(g, Math.abs(x)), 0);

// ================================================================ coordinate geometry in the plane

/** PA² − λ·PB² = 0 divided by (1 − λ): the coefficients D, E, F of x² + y² + Dx + Ey + F. */
const apo = (a: number, b: number, c: number, d: number, lam: number): [R, R, R] => [R_(-2 * a + 2 * lam * c, 1 - lam), R_(-2 * b + 2 * lam * d, 1 - lam), R_(a * a + b * b - lam * (c * c + d * d), 1 - lam)];
const circ = ([D, E, F]: [R, R, R], lead: R = [1, 1]) => poly([[lead, "x²"], [lead, "y²"], [rmul(lead, D), "x"], [rmul(lead, E), "y"], [rmul(lead, F), ""]]);

const aslocus: Def = {
  id: "aslocus",
  arity: 5,
  title: "The locus of a point whose distances from two points are in a fixed ratio",
  competency: LOCUS,
  type: "exact",
  mc: true,
  // [a, b, c, d, k]: PA = k·PB with A(a, b), B(c, d)
  parse: none,
  reject: (p) => (!allIn(p, [[-5, 5], [-5, 5], [-5, 5], [-5, 5], [2, 3]]) || (p[0] === p[2] && p[1] === p[3]) ? "Two different whole-number points from −5 to 5 and a ratio k = 2 or 3." : null),
  prompt: ([a, b, c, d, k]) => `A point P moves so that its distance from A${P2(a, b)} is always ${k} times its distance from B${P2(c, d)}. Find the equation of the locus of P. Write it as x² + y² + px + qy + r = 0 (the coefficient of x² must be 1) and type the left-hand side.`,
  solve: ([a, b, c, d, k]) => {
    const K = k * k - 1;
    const ans = circ(apo(a, b, c, d, k * k));
    return {
      steps: [
        S("square", "square", LOCUS, [k, k * k], `${sqTerm("x", a)} + ${sqTerm("y", b)} = ${k * k}[${sqTerm("x", c)} + ${sqTerm("y", d)}]`),
        S("expand", "expand", DIST, [K], `${circ(apo(a, b, c, d, k * k), [K, 1])} = 0`),
        S("divide", "divide", LOCUS, [K], ans),
      ],
      answer: ans,
    };
  },
  // independent: at sample points, (k² − 1) times the answer must equal k²·PB² − PA², computed from the distances
  validate: ([a, b, c, d, k], v) => {
    const f = fnOf(v);
    if (!f) return false;
    return [[0.3, 1.7], [-2.1, 0.4], [1.9, -1.2], [3.3, 2.8], [-0.7, -2.6], [0.11, 0.97]].every(([x, y]) => {
      const pa2 = (x - a) ** 2 + (y - b) ** 2;
      const pb2 = (x - c) ** 2 + (y - d) ** 2;
      return close((k * k - 1) * f({ x, y }), k * k * pb2 - pa2, 1e-8);
    });
  },
  bugs: ([a, b, c, d, k]) => {
    const [D, E, F] = apo(a, b, c, d, k * k);
    return [
      B("ratio-not-squared", "procedural", LOCUS, `When both sides of PA = ${k}·PB were squared, ${k} was not squared: the condition becomes PA² = ${k * k}·PB².`, circ(apo(a, b, c, d, k))),
      B("points-swapped", "conceptual", LOCUS, `The ratio was applied the other way round (PB = ${k}·PA). Here P is ${k} times as far from A as from B.`, circ(apo(c, d, a, b, k * k))),
      B("bracket-sign", "prerequisite", DIST, `A bracket like ${sqTerm("x", a === 0 ? c : a)} was expanded with the wrong sign of the middle term: (x − h)² = x² − 2hx + h².`, D[0] !== 0 || E[0] !== 0 ? circ([R_(-D[0], D[1]), R_(-E[0], E[1]), F]) : null),
      B("not-divided", "procedural", LOCUS, `The equation was not divided by ${k * k - 1}, so x² does not have coefficient 1 as asked.`, circ([D, E, F], [k * k - 1, 1])),
    ];
  },
  distractors: ([a, b, c, d, k]) => {
    const [D, E, F] = apo(a, b, c, d, k * k);
    return [circ([D, E, R_(-F[0], F[1])]), circ([E, D, F])];
  },
  variants: () => [],
  explain: (s) =>
    s.id === "square"
      ? `Write PA and PB with the distance formula and square PA = ${s.inputs[0]}·PB to remove the roots: ${s.value}`
      : s.id === "expand"
        ? `Expand the brackets and collect every term on one side: ${s.value}`
        : `Divide by ${s.inputs[0]} so that x² has coefficient 1: ${s.value} = 0`,
  domain: [[-5, 5], [-5, 5], [-5, 5], [-5, 5], [2, 3]],
  cap: 400,
  difficulty: ([a, b, c, d, k]) => (k === 2 && [a, b, c, d].filter((x) => x === 0).length >= 2 ? 1 : k === 2 ? 2 : 3),
  word: ([a, b, c, d, k]) => `On a map of a farm (units of 10 m), a guard dog runs so that it is always ${k} times as far from the gate at A${P2(a, b)} as from its kennel at B${P2(c, d)}. Find the equation of its path in the form x² + y² + px + qy + r = 0 (coefficient of x² equal to 1) and type the left-hand side.`,
  teach: {
    idea: "A locus is the set of all points that obey a condition. Writing each distance with the distance formula turns the condition into an equation in x and y.",
    method: "Let P be (x, y). Write PA and PB with the distance formula, square both sides to remove the roots, expand, collect all terms on one side and divide by the coefficient of x².",
    alternatives: [
      { id: "check_point", title: "Check with a point you know is on the locus", kind: "conceptual", text: ["The point that divides AB internally in the ratio k : 1 is k times as far from A as from B, so it lies on the locus.", "Substitute it into your equation: the left-hand side must be 0. If it is not, look for a squaring or sign slip."], visual: ([a, b, c, d]) => ({ type: "plane", points: [[a, b, "A"], [c, d, "B"]], range: 7 }) },
    ],
  },
  limits: "Ratio 2 or 3 between distances from two whole-number points (a circle); the equal-distance case and other conditions are separate families.",
};

const aslocpar: Def = {
  id: "aslocpar",
  arity: 3,
  title: "The locus of a point equidistant from a point and a line",
  competency: LOCUS,
  type: "exact",
  mc: true,
  // [a, b, h]: equidistant from S(a, b) and the line x = h
  parse: none,
  reject: (p) => (!allIn(p, [[-6, 6], [-6, 6], [-6, 6]]) || p[0] === p[2] ? "A point S(a, b) not on the line x = h, whole numbers from −6 to 6." : null),
  prompt: ([a, b, h]) => `A point P moves so that it is always the same distance from the point S${P2(a, b)} as from the line x = ${mi(h)}. Find the equation of the locus of P in the form x = (an expression in y), and type the expression in y.`,
  solve: ([a, b, h]) => {
    const den = 2 * (a - h);
    const ans = poly([[R_(1, den), "y²"], [R_(-2 * b, den), "y"], [R_(b * b + a * a - h * h, den), ""]]);
    return {
      steps: [
        S("equal", "square", LOCUS, [a, b, h], `${sqTerm("x", a)} + ${sqTerm("y", b)} = ${sqTerm("x", h)}`),
        S("cancel", "simplify", LOCUS, [den], `${poly([[R_(den), "x"]])} = ${poly([[R_(1), "y²"], [R_(-2 * b), "y"], [R_(b * b + a * a - h * h), ""]])}`),
        S("divide", "divide", LOCUS, [den], ans),
      ],
      answer: ans,
    };
  },
  // independent: for sample values of y, the point (x(y), y) must be as far from S as from the line
  validate: ([a, b, h], v) => {
    const f = fnOf(v);
    if (!f) return false;
    return [-3.2, -1, 0.4, 1.7, 2.9, 5.1].every((y) => {
      const x = f({ y });
      return close(Math.hypot(x - a, y - b), Math.abs(x - h), 1e-8);
    });
  },
  bugs: ([a, b, h]) => {
    const den = 2 * (a - h);
    return [
      B("line-distance-sign", "conceptual", LOCUS, `The distance from P(x, y) to the line x = ${mi(h)} is |x − ${mi(h)}|${h < 0 ? ` = |x + ${-h}|` : ""}; it was written with the wrong sign.`, a + h !== 0 ? poly([[R_(1, 2 * (a + h)), "y²"], [R_(-2 * b, 2 * (a + h)), "y"], [R_(b * b + a * a - h * h, 2 * (a + h)), ""]]) : null),
      B("bracket-sign", "prerequisite", DIST, `(y − ${mi(b)})² was expanded with the wrong sign of the middle term: (y − k)² = y² − 2ky + k².`, b !== 0 ? poly([[R_(1, den), "y²"], [R_(2 * b, den), "y"], [R_(b * b + a * a - h * h, den), ""]]) : null),
      B("lost-two", "procedural", LOCUS, `When the x² terms cancel, the x terms give ${den}x (the 2 from expanding the squares stays); the expression was divided by ${a - h} instead of ${den}.`, a - h !== 1 && a - h !== -1 ? poly([[R_(1, a - h), "y²"], [R_(-2 * b, a - h), "y"], [R_(b * b + a * a - h * h, a - h), ""]]) : poly([[R_(1, a - h), "y²"], [R_(-2 * b, a - h), "y"], [R_(b * b + a * a - h * h, a - h), ""]])),
    ];
  },
  distractors: ([a, b, h]) => {
    const den = 2 * (a - h);
    return [poly([[R_(1, den), "y²"], [R_(-2 * b, den), "y"], [R_(-(b * b + a * a - h * h), den), ""]]), poly([[R_(-1, den), "y²"], [R_(2 * b, den), "y"], [R_(b * b + a * a - h * h, den), ""]])];
  },
  variants: () => [],
  explain: (s) => (s.id === "equal" ? `PS² = (distance to the line)²: ${s.value}` : s.id === "cancel" ? `Expand; the x² terms cancel: ${s.value}` : `Divide by ${s.inputs[0]}: x = ${s.value}`),
  domain: [[-6, 6], [-6, 6], [-6, 6]],
  cap: 400,
  difficulty: ([a, b, h]) => (b === 0 && (a === -h) ? 1 : b === 0 || h === 0 ? 2 : 3),
  word: ([a, b, h]) => `In a park plan (units in metres), a curved footpath is laid so that every point on it is exactly as far from a fountain at S${P2(a, b)} as from a straight wall along the line x = ${mi(h)}. Find the equation of the footpath as x = (an expression in y), and type the expression in y.`,
  teach: {
    idea: "Every point of the locus is as far from the point as from the line, so the two distances can be set equal. The curve is a parabola with S as its focus and the line as its directrix.",
    method: "For P(x, y), the distance to S comes from the distance formula and the distance to the line x = h is |x − h|. Square both, set them equal, expand, and make x the subject.",
    alternatives: [
      { id: "vertex_check", title: "Check with the vertex", kind: "conceptual", text: ["The point halfway between S and the line, on the horizontal line through S, is on the locus.", "Its y-coordinate is b and its x-coordinate is (a + h)/2: put y = b into your answer and you should get (a + h)/2."] },
    ],
  },
  limits: "A focus with whole-number coordinates and a vertical directrix x = h; other directrices and ellipse or hyperbola loci are not included.",
};

// ---- pairs of lines through the origin: b(y − m₁x)(y − m₂x) = 0
const pairEq = (m1: number, m2: number, b: number) => `${poly([[R_(b * m1 * m2), "x²"], [R_(-b * (m1 + m2)), "xy"], [R_(b), "y²"]])} = 0`;

const aspair: Def = {
  id: "aspair",
  arity: 3,
  title: "The slopes of a pair of lines through the origin",
  competency: PAIR,
  type: "set",
  // [m₁, m₂, b]: b y² − b(m₁ + m₂)xy + b m₁m₂ x² = 0
  parse: none,
  reject: (p) => (!allIn(p, [[-6, 6], [-6, 6], [1, 3]]) || p[0] >= p[1] ? "Two different whole-number slopes from −6 to 6 (listed in increasing order) and a coefficient of y² from 1 to 3." : null),
  prompt: ([m1, m2, b]) => `The equation ${pairEq(m1, m2, b)} represents a pair of straight lines through the origin. Find the slopes of the two lines. Type both, separated by a comma.`,
  solve: ([m1, m2, b]) => ({
    steps: [
      S("substitute", "substitute", PAIR, [b * m1 * m2, -b * (m1 + m2), b], `${poly([[R_(b), "m²"], [R_(-b * (m1 + m2)), "m"], [R_(b * m1 * m2), ""]])} = 0`),
      S("solve", "solve", QUAD, [m1 + m2, m1 * m2], [m1, m2]),
    ],
    answer: [m1, m2],
  }),
  // independent: each slope m must make y = mx satisfy the equation (substitute and check it gives 0)
  validate: ([m1, m2, b], v) => {
    if (!Array.isArray(v) || v.length !== 2 || close(v[0], v[1])) return false;
    return v.every((m) => close(b * m1 * m2 + -b * (m1 + m2) * m + b * m * m, 0, 1e-9));
  },
  bugs: ([m1, m2]) => [
    B("sum-sign", "procedural", PAIR, "The sum of the slopes was taken as +(xy coefficient)/(y² coefficient); for y² + 2hxy/b + … the sum of the slopes is −2h/b.", [-m2, -m1]),
    B("reciprocal-slopes", "conceptual", PAIR, "The equation was solved for x/y instead of y/x, which gives the reciprocals of the slopes. Put y = mx and solve for m.", m1 !== 0 && m2 !== 0 ? [1 / m1, 1 / m2].sort((x, y) => x - y) : null),
  ],
  variants: () => [],
  explain: (s) => (s.id === "substitute" ? `Put y = mx and divide by x²: ${s.value}` : `Solve the quadratic in m: the slopes are ${(s.value as number[]).map(mi).join(" and ")}`),
  domain: [[-6, 6], [-6, 6], [1, 3]],
  difficulty: ([m1, m2, b]) => (b === 1 && (m1 === 0 || m1 + m2 === 0) ? 1 : b === 1 ? 2 : 3),
  word: ([m1, m2, b]) => `Two straight railway tracks cross at a level crossing placed at the origin of a map. Together the two tracks are described by ${pairEq(m1, m2, b)}. Find the slopes of the two tracks (type both, separated by a comma).`,
  teach: {
    idea: "A homogeneous equation ax² + 2hxy + by² = 0 factorises into two linear factors through the origin; putting y = mx turns it into a quadratic whose roots are the slopes.",
    method: "Substitute y = mx, divide by x², and solve bm² + 2hm + a = 0. Check: the sum of the slopes is −2h/b and the product is a/b.",
    alternatives: [{ id: "factorise", title: "Factorise directly", kind: "procedural", text: ["Treat the equation as a quadratic in y and factorise it into (y − m₁x)(y − m₂x) times a number.", "Each factor set to zero is one line; read off its slope."] }],
  },
  limits: "Pairs of lines through the origin with whole-number slopes; the general second-degree equation and the condition for a pair of lines are not included.",
};

const aspairang: Def = {
  id: "aspairang",
  arity: 3,
  title: "The angle between a pair of lines through the origin",
  competency: PAIR,
  type: "exact",
  mc: true,
  parse: none,
  reject: (p) => (!allIn(p, [[-6, 6], [-6, 6], [1, 3]]) || p[0] >= p[1] || 1 + p[0] * p[1] === 0 ? "Two different whole-number slopes from −6 to 6 (increasing), not perpendicular, and a coefficient of y² from 1 to 3." : null),
  prompt: ([m1, m2, b]) => `Find tan θ, where θ is the acute angle between the pair of lines ${pairEq(m1, m2, b)}.`,
  solve: ([m1, m2, b]) => {
    const a = b * m1 * m2;
    const h = R_(-b * (m1 + m2), 2);
    const disc = rsub(rmul(h, h), R_(a * b));
    const ans = R_(Math.abs(m1 - m2), Math.abs(1 + m1 * m2));
    return {
      steps: [
        S("coefficients", "read", PAIR, [a, rs(h), b], `a = ${mi(a)}, h = ${rs(h)}, b = ${b}`),
        S("discriminant", "evaluate", PAIR, [rs(disc)], rs(disc)),
        S("tan", "divide", PAIR, [rs(disc), a + b], rs(ans)),
      ],
      answer: rs(ans),
    };
  },
  // independent: find the slopes by trying whole numbers in the equation, then measure the angle with arctan
  validate: ([m1, m2, b], v) => {
    const t = num1(v);
    if (t === null) return false;
    const ms: number[] = [];
    for (let m = -12; m <= 12; m++) if (b * m1 * m2 - b * (m1 + m2) * m + b * m * m === 0) ms.push(m);
    if (ms.length !== 2) return false;
    let th = Math.abs(Math.atan(ms[0]) - Math.atan(ms[1]));
    if (th > Math.PI / 2) th = Math.PI - th;
    return close(Math.tan(th), t, 1e-9);
  },
  bugs: ([m1, m2]) => {
    const ans = R_(Math.abs(m1 - m2), Math.abs(1 + m1 * m2));
    return [
      B("no-absolute-value", "procedural", PAIR, "The sign was kept; the acute angle has a positive tangent, so take the absolute value.", rs([-ans[0], ans[1]])),
      B("lost-two", "recall", PAIR, "The formula is tan θ = |2√(h² − ab)/(a + b)|; the 2 was left out.", rs(R_(ans[0], 2 * ans[1]))),
      B("denominator-sign", "recall", LINE, "With slopes m₁ and m₂, tan θ = |(m₁ − m₂)/(1 + m₁m₂)|; a minus sign was used in the denominator.", 1 - m1 * m2 !== 0 ? rs(R_(Math.abs(m1 - m2), Math.abs(1 - m1 * m2))) : null),
    ];
  },
  distractors: ([m1, m2]) => [rs(R_(Math.abs(1 + m1 * m2), Math.abs(m1 - m2))), rs(R_(Math.abs(m1 - m2) + 1, Math.abs(1 + m1 * m2)))],
  variants: () => [],
  explain: (s) => (s.id === "coefficients" ? `Compare with ax² + 2hxy + by² = 0: ${s.value}` : s.id === "discriminant" ? `h² − ab = ${s.value}` : `tan θ = |2√(h² − ab)/(a + b)| = ${s.value}`),
  domain: [[-6, 6], [-6, 6], [1, 3]],
  difficulty: ([m1, m2, b]) => (b === 1 && Math.abs(m1) + Math.abs(m2) <= 4 ? 1 : b === 1 ? 2 : 3),
  word: ([m1, m2, b]) => `Two straight roads meet at a junction at the origin of a town map; together they are described by ${pairEq(m1, m2, b)}. Find tan θ, where θ is the acute angle between the two roads.`,
  teach: {
    idea: "For ax² + 2hxy + by² = 0 the slopes satisfy m₁ + m₂ = −2h/b and m₁m₂ = a/b, so tan θ = |(m₁ − m₂)/(1 + m₁m₂)| becomes |2√(h² − ab)/(a + b)|.",
    method: "Read a, h (half the xy coefficient) and b, work out h² − ab, and use tan θ = |2√(h² − ab)/(a + b)|.",
    alternatives: [{ id: "slopes_first", title: "Find the slopes first", kind: "procedural", text: ["Put y = mx to get the two slopes.", "Use tan θ = |(m₁ − m₂)/(1 + m₁m₂)| for the acute angle."] }],
  },
  limits: "Pairs through the origin with whole-number slopes that are not perpendicular; the answer is tan θ (no calculator angle).",
};

// ---- straight lines
const asline: Def = {
  id: "asline",
  arity: 4,
  title: "The equation of a line through two points",
  competency: LINE,
  type: "exact",
  mc: true,
  parse: none,
  reject: (p) => (!allIn(p, [[-6, 6], [-6, 6], [-6, 6], [-6, 6]]) || p[0] >= p[2] ? "Two whole-number points from −6 to 6, the first to the left of the second." : null),
  prompt: ([x1, y1, x2, y2]) => `Find the equation of the straight line through A${P2(x1, y1)} and B${P2(x2, y2)}. Write it as y = mx + c and type the right-hand side (for example 2x − 3).`,
  solve: ([x1, y1, x2, y2]) => {
    const m = R_(y2 - y1, x2 - x1);
    const c = rsub(R_(y1), rmul(m, R_(x1)));
    const ans = poly([[m, "x"], [c, ""]]);
    return { steps: [S("slope", "divide", LINE, [y2 - y1, x2 - x1], rs(m)), S("intercept", "substitute", LINE, [x1, y1, rs(m)], rs(c)), S("equation", "write", LINE, [rs(m), rs(c)], ans)], answer: ans };
  },
  // independent: the answer must pass through both points and be a straight line (collinear sample points)
  validate: ([x1, y1, x2, y2], v) => {
    const f = fnOf(v);
    if (!f) return false;
    if (!close(f({ x: x1 }), y1, 1e-9) || !close(f({ x: x2 }), y2, 1e-9)) return false;
    return [0.37, 2.9, -4.4].every((x) => close((x2 - x1) * (f({ x }) - y1), (y2 - y1) * (x - x1), 1e-9));
  },
  bugs: ([x1, y1, x2, y2]) => {
    const m = R_(y2 - y1, x2 - x1);
    const withC = (mm: R) => poly([[mm, "x"], [rsub(R_(y1), rmul(mm, R_(x1))), ""]]);
    return [
      B("slope-upside-down", "conceptual", LINE, "The slope was found as (change in x)/(change in y); slope is rise over run, (y₂ − y₁)/(x₂ − x₁).", y1 !== y2 ? withC(R_(x2 - x1, y2 - y1)) : null),
      B("mixed-order", "procedural", LINE, "The subtraction order was mixed (y₂ − y₁ on top but x₁ − x₂ below), which changes the sign of the slope.", m[0] !== 0 ? withC([-m[0], m[1]]) : null),
      B("intercept-sign", "procedural", LINE, `In y − y₁ = m(x − x₁), the term −m·x₁ was added instead of subtracted when finding c.`, x1 !== 0 && m[0] !== 0 ? poly([[m, "x"], [radd(R_(y1), rmul(m, R_(x1))), ""]]) : null),
    ];
  },
  distractors: ([x1, y1, x2, y2]) => {
    const m = R_(y2 - y1, x2 - x1);
    return [poly([[m, "x"], [R_(y1), ""]]), poly([[m, "x"], [R_(y2 + 1), ""]]), poly([[radd(m, R_(1)), "x"], [R_(y1 - x1), ""]])];
  },
  variants: () => [],
  explain: (s) => (s.id === "slope" ? `Slope m = (y₂ − y₁)/(x₂ − x₁) = ${mi(Number(s.inputs[0]))}/${mi(Number(s.inputs[1]))} = ${s.value}` : s.id === "intercept" ? `Put A into y = mx + c: c = y₁ − m·x₁ = ${s.value}` : `So y = ${s.value}`),
  domain: [[-6, 6], [-6, 6], [-6, 6], [-6, 6]],
  cap: 400,
  difficulty: ([x1, y1, x2, y2]) => ((y2 - y1) % (x2 - x1) === 0 ? (x1 === 0 || y1 === 0 ? 1 : 2) : 3),
  word: ([x1, y1, x2, y2]) => `On a city map (units in km), a straight metro line passes through one station at ${P2(x1, y1)} and another at ${P2(x2, y2)}. Write the equation of the metro line as y = mx + c and type the right-hand side.`,
  teach: {
    idea: "A straight line has the same slope everywhere, so the slope from the two given points fixes its direction, and either point fixes its position.",
    method: "Find m = (y₂ − y₁)/(x₂ − x₁), then use y − y₁ = m(x − x₁) and rearrange to y = mx + c.",
    alternatives: [{ id: "two_point", title: "Two-point form", kind: "procedural", text: ["Write (y − y₁)/(y₂ − y₁) = (x − x₁)/(x₂ − x₁).", "Cross-multiply and make y the subject."], visual: ([x1, y1, x2, y2]) => ({ type: "plane", points: [[x1, y1, "A"], [x2, y2, "B"]], segments: [[[x1, y1], [x2, y2]]], range: 7 }) }],
  },
  limits: "Lines through two whole-number points that are not vertical; the answer is written in slope-intercept form.",
};

const asperpd: Def = {
  id: "asperpd",
  arity: 5,
  title: "The perpendicular distance from a point to a line",
  competency: LINE,
  type: "exact",
  mc: true,
  // [a, b, c, x₀, y₀]: distance from (x₀, y₀) to ax + by + c = 0
  parse: none,
  reject: (p) => {
    const [a, b, c, x0, y0] = p;
    if (!allIn(p, [[0, 5], [-5, 5], [-9, 9], [-5, 5], [-5, 5]])) return "A line ax + by + c = 0 with small whole-number coefficients and a whole-number point.";
    if ((a === 0 && b <= 0) || gcd3(a, b, c) !== 1) return "The line is written with no common factor and a positive first coefficient.";
    if (a * x0 + b * y0 + c === 0) return "The point is on the line.";
    return null;
  },
  prompt: ([a, b, c, x0, y0]) => `Find the perpendicular distance from the point ${P2(x0, y0)} to the line ${lin2(a, b, c)}.`,
  solve: ([a, b, c, x0, y0]) => {
    const n = a * x0 + b * y0 + c;
    const N = a * a + b * b;
    const ans = sq(R_(Math.abs(n), N), N);
    return { steps: [S("substitute", "substitute", LINE, [x0, y0], n), S("normal", "evaluate", DIST, [a, b], `√${N}`), S("divide", "divide", LINE, [Math.abs(n), N], ans)], answer: ans };
  },
  // independent: twice the area of the triangle formed with two points of the line, divided by their distance
  validate: ([a, b, c, x0, y0], v) => {
    const d = num1(v);
    if (d === null) return false;
    const [p1, p2] = b !== 0 ? [[0, -c / b], [1, (-c - a) / b]] : [[-c / a, 0], [-c / a, 1]];
    const area2 = Math.abs((p2[0] - p1[0]) * (y0 - p1[1]) - (p2[1] - p1[1]) * (x0 - p1[0]));
    return close(area2 / Math.hypot(p2[0] - p1[0], p2[1] - p1[1]), d, 1e-9);
  },
  bugs: ([a, b, c, x0, y0]) => {
    const n = a * x0 + b * y0 + c;
    const N = a * a + b * b;
    return [
      B("no-absolute-value", "procedural", LINE, "The value of ax₀ + by₀ + c was negative and its sign was kept; a distance is never negative, so take the absolute value.", n < 0 ? sq(R_(n, N), N) : null),
      B("no-square-root", "recall", LINE, `The denominator is √(a² + b²) = √${N}, not ${N}.`, N !== 1 ? rs(R_(Math.abs(n), N)) : null),
      B("constant-left-out", "procedural", LINE, `The constant ${mi(c)} was left out when the point was substituted into ax + by + c.`, c !== 0 ? sq(R_(Math.abs(a * x0 + b * y0), N), N) : null),
    ];
  },
  distractors: ([a, b, c, x0, y0]) => {
    const n = Math.abs(a * x0 + b * y0 + c);
    const N = a * a + b * b;
    return [String(n), sq(R_(n + 1, N), N), rs(R_(n, Math.abs(a) + Math.abs(b))), String(2 * n), rs(R_(n, 2))];
  },
  variants: () => [],
  explain: (s) => (s.id === "substitute" ? `Put the point into ax + by + c: ${s.value}` : s.id === "normal" ? `√(a² + b²) = ${s.value}` : `Distance = |ax₀ + by₀ + c|/√(a² + b²) = ${s.value}`),
  domain: [[0, 5], [-5, 5], [-9, 9], [-5, 5], [-5, 5]],
  cap: 400,
  difficulty: ([a, b]) => (a * a + b * b === 25 || a * b === 0 ? 1 : 2),
  word: ([a, b, c, x0, y0]) => `On a farm plan (units in metres), a straight water pipe runs along the line ${lin2(a, b, c)}. A pump house stands at ${P2(x0, y0)}. What is the length, in metres, of the shortest connecting pipe from the pump house to the main pipe?`,
  teach: {
    idea: "The shortest way from a point to a line is along the perpendicular. Its length is |ax₀ + by₀ + c| divided by √(a² + b²), the length of the normal vector (a, b).",
    method: "Substitute the point into ax + by + c, take the absolute value, and divide by √(a² + b²). Simplify the surd.",
    alternatives: [{ id: "foot", title: "Find the foot of the perpendicular", kind: "procedural", text: ["Write the perpendicular line through the point (its slope is the negative reciprocal).", "Solve the two equations together to find the foot, then use the distance formula."] }],
  },
  limits: "Whole-number lines and points; the answer is an exact surd or fraction.",
};

const asparld: Def = {
  id: "asparld",
  arity: 5,
  title: "The distance between two parallel lines",
  competency: LINE,
  type: "exact",
  mc: true,
  // [a, b, c₁, k, c₂]: ax + by + c₁ = 0 and kax + kby + c₂ = 0
  parse: none,
  reject: (p) => {
    const [a, b, c1, k, c2] = p;
    if (!allIn(p, [[0, 5], [-5, 5], [-9, 9], [1, 3], [-12, 12]])) return "Parallel lines with small whole-number coefficients.";
    if ((a === 0 && b <= 0) || gcd(a, Math.abs(b)) !== 1) return "The first line has coprime coefficients and a positive first coefficient.";
    if (c2 === k * c1) return "The two lines are the same.";
    return null;
  },
  prompt: ([a, b, c1, k, c2]) => `Find the distance between the parallel lines ${lin2(a, b, c1)} and ${lin2(k * a, k * b, c2)}.`,
  solve: ([a, b, c1, k, c2]) => {
    const N = a * a + b * b;
    const ans = sq(R_(Math.abs(k * c1 - c2), k * N), N);
    return {
      steps: [S("match", "divide", LINE, [k, rs(R_(c2, k))], k === 1 ? lin2(a, b, c2) : `${poly([[R_(a), "x"], [R_(b), "y"], [R_(c2, k), ""]])} = 0`), S("divide", "divide", LINE, [rs(rabs(rsub(R_(c1), R_(c2, k)))), N], ans)],
      answer: ans,
    };
  },
  // independent: take a point of the first line and measure its distance to the second (area of a triangle ÷ base)
  validate: ([a, b, c1, k, c2], v) => {
    const d = num1(v);
    if (d === null) return false;
    const P = b !== 0 ? [0, -c1 / b] : [-c1 / a, 0];
    const [A, Bc, C] = [k * a, k * b, c2];
    const [q1, q2] = Bc !== 0 ? [[0, -C / Bc], [1, (-C - A) / Bc]] : [[-C / A, 0], [-C / A, 1]];
    const area2 = Math.abs((q2[0] - q1[0]) * (P[1] - q1[1]) - (q2[1] - q1[1]) * (P[0] - q1[0]));
    return close(area2 / Math.hypot(q2[0] - q1[0], q2[1] - q1[1]), d, 1e-9);
  },
  bugs: ([a, b, c1, k, c2]) => {
    const N = a * a + b * b;
    return [
      B("coefficients-not-matched", "conceptual", LINE, `The constants were subtracted before the x and y coefficients were made the same; divide the second equation by ${k} first.`, k > 1 && c1 !== c2 ? sq(R_(Math.abs(c1 - c2), N), N) : null),
      B("no-square-root", "recall", LINE, `The denominator is √(a² + b²) = √${N}, not ${N}.`, N !== 1 ? rs(R_(Math.abs(k * c1 - c2), k * N)) : null),
      B("constants-added", "procedural", LINE, "The constants were added; the distance uses the difference |c₁ − c₂| once the coefficients match.", c1 * k + c2 !== 0 && Math.abs(c1 * k + c2) !== Math.abs(c1 * k - c2) ? sq(R_(Math.abs(k * c1 + c2), k * N), N) : null),
    ];
  },
  distractors: ([a, b, c1, k, c2]) => {
    const N = a * a + b * b;
    const n = Math.abs(k * c1 - c2);
    return [sq(R_(n, k * N * 2), N), rs(R_(n, k)), sq(R_(n + k, k * N), N)];
  },
  variants: () => [],
  explain: (s) => (s.id === "match" ? (s.inputs[0] === 1 ? `The x and y coefficients already match: ${s.value}` : `Divide the second equation by ${s.inputs[0]} so the coefficients match: ${s.value}`) : `Distance = |c₁ − c₂|/√(a² + b²) = ${s.inputs[0]}/√${s.inputs[1]} = ${s.value}`),
  domain: [[0, 5], [-5, 5], [-9, 9], [1, 3], [-12, 12]],
  cap: 400,
  difficulty: ([a, b, , k]) => (k === 1 && (a * b === 0 || a * a + b * b === 25) ? 1 : k === 1 ? 2 : 3),
  word: ([a, b, c1, k, c2]) => `On a district map (units in km), two straight parallel canals run along ${lin2(a, b, c1)} and ${lin2(k * a, k * b, c2)}. How far apart are the canals, in km?`,
  teach: {
    idea: "Parallel lines can be written with the same x and y coefficients; then they differ only in the constant, and the gap between them is |c₁ − c₂|/√(a² + b²).",
    method: "Divide one equation so the x and y coefficients match the other, then use |c₁ − c₂|/√(a² + b²).",
    alternatives: [{ id: "point_to_line", title: "Pick a point on one line", kind: "procedural", text: ["Choose any point on the first line, e.g. where it crosses an axis.", "Find its perpendicular distance to the second line."] }],
  },
  limits: "Parallel lines where the second is a whole-number multiple of the first apart from its constant.",
};

const slopeTxt = (a: number, b: number) => rs(R_(-a, b));
const aslang: Def = {
  id: "aslang",
  arity: 4,
  title: "The angle between two lines in general form",
  competency: LINE,
  type: "exact",
  mc: true,
  // [a₁, b₁, a₂, b₂]: a₁x + b₁y + c₁ = 0 and a₂x + b₂y + c₂ = 0 (constants chosen from the parameters)
  parse: none,
  reject: (p) => {
    const [a1, b1, a2, b2] = p;
    if (!allIn(p, [[-5, 5], [1, 5], [-5, 5], [1, 5]])) return "Two non-vertical lines with small whole-number coefficients, written with a positive y coefficient.";
    if (gcd(Math.abs(a1), b1) !== 1 || gcd(Math.abs(a2), b2) !== 1) return "Each line has coprime x and y coefficients.";
    if (a1 * b2 === a2 * b1) return "The lines are parallel.";
    if (a1 * a2 + b1 * b2 === 0) return "The lines are perpendicular (tan θ is not defined).";
    return null;
  },
  prompt: (p) => {
    const [a1, b1, a2, b2] = p;
    return `Find tan θ, where θ is the acute angle between the lines ${lin2(a1, b1, cA(p))} and ${lin2(a2, b2, cB(p))}.`;
  },
  solve: ([a1, b1, a2, b2]) => {
    const m1 = R_(-a1, b1);
    const m2 = R_(-a2, b2);
    const ans = rabs(rdiv(rsub(m1, m2), radd(R_(1), rmul(m1, m2))));
    return { steps: [S("slopes", "divide", LINE, [rs(m1), rs(m2)], `${rs(m1)} and ${rs(m2)}`), S("tan", "evaluate", LINE, [rs(rsub(m1, m2)), rs(radd(R_(1), rmul(m1, m2)))], rs(ans))], answer: rs(ans) };
  },
  // independent: the angle between direction vectors (b, −a) from the dot product, then its tangent
  validate: ([a1, b1, a2, b2], v) => {
    const t = num1(v);
    if (t === null) return false;
    const u = [b1, -a1];
    const w = [b2, -a2];
    const c = Math.abs(u[0] * w[0] + u[1] * w[1]) / (Math.hypot(u[0], u[1]) * Math.hypot(w[0], w[1]));
    return close(Math.sqrt(1 - c * c) / c, t, 1e-8);
  },
  bugs: ([a1, b1, a2, b2]) => {
    const m1 = R_(-a1, b1);
    const m2 = R_(-a2, b2);
    const signed = rdiv(rsub(m1, m2), radd(R_(1), rmul(m1, m2)));
    const t2 = (x: R, y: R) => {
      const den = radd(R_(1), rmul(x, y));
      return den[0] === 0 ? null : rs(rabs(rdiv(rsub(x, y), den)));
    };
    return [
      B("slope-is-x-coefficient", "conceptual", LINE, "The x coefficient was taken as the slope; for ax + by + c = 0 the slope is −a/b.", b1 !== 1 || b2 !== 1 || a1 !== 0 ? t2(R_(a1), R_(a2)) : null),
      B("no-absolute-value", "procedural", LINE, "The sign of (m₁ − m₂)/(1 + m₁m₂) was kept; the acute angle needs the absolute value.", signed[0] < 0 ? rs(signed) : rs([-signed[0], signed[1]])),
      B("denominator-sign", "recall", LINE, "The formula is tan θ = |(m₁ − m₂)/(1 + m₁m₂)|; a minus sign was used in the denominator.", (() => {
        const den = rsub(R_(1), rmul(m1, m2));
        return den[0] === 0 ? null : rs(rabs(rdiv(rsub(m1, m2), den)));
      })()),
    ];
  },
  distractors: ([a1, b1, a2, b2]) => {
    const m1 = R_(-a1, b1);
    const m2 = R_(-a2, b2);
    const ans = rabs(rdiv(rsub(m1, m2), radd(R_(1), rmul(m1, m2))));
    return [rs(rdiv(R_(1), ans)), rs(radd(ans, R_(1)))];
  },
  variants: () => [],
  explain: (s) => (s.id === "slopes" ? `The slope of ax + by + c = 0 is −a/b: the slopes are ${s.value}` : `tan θ = |(m₁ − m₂)/(1 + m₁m₂)| = |${s.inputs[0]}| ÷ |${s.inputs[1]}| = ${s.value}`),
  domain: [[-5, 5], [1, 5], [-5, 5], [1, 5]],
  cap: 400,
  difficulty: ([, b1, , b2]) => (b1 === 1 && b2 === 1 ? 1 : b1 === 1 || b2 === 1 ? 2 : 3),
  word: (p) => {
    const [a1, b1, a2, b2] = p;
    return `On a town plan, two straight roads run along ${lin2(a1, b1, cA(p))} and ${lin2(a2, b2, cB(p))}. Find tan θ, where θ is the acute angle at which the roads cross.`;
  },
  teach: {
    idea: "The angle between two lines is the difference of their inclinations, so tan θ = (m₁ − m₂)/(1 + m₁m₂) from the subtraction formula for tan; the absolute value gives the acute angle.",
    method: "Find each slope as −a/b, then work out |(m₁ − m₂)/(1 + m₁m₂)|.",
    alternatives: [{ id: "directions", title: "Use direction vectors", kind: "conceptual", text: ["The line ax + by + c = 0 runs in the direction (b, −a).", "cos θ = |u·v|/(|u||v|) for the two directions, then tan θ = sin θ/cos θ."] }],
  },
  limits: "Non-vertical lines with small whole-number coefficients that are neither parallel nor perpendicular; the answer is tan θ.",
};
function cA([a1, b1, a2, b2]: number[]) {
  return (((a1 * 3 + b1 * 5 + a2 + 11) % 9) + 9) % 9 - 4;
}
function cB([a1, b1, a2, b2]: number[]) {
  return (((a2 * 5 + b2 * 3 + b1 * 7 + 5) % 11) + 11) % 11 - 5;
}

const PARCH = ["parallel", "perpendicular", "neither parallel nor perpendicular"];
const aspar: Def = {
  id: "aspar",
  arity: 4,
  title: "Parallel, perpendicular or neither",
  competency: LINE,
  type: "choice",
  // [a₁, b₁, a₂, b₂]: a₁x + b₁y + c₁ = 0 and a₂x + b₂y + c₂ = 0
  parse: none,
  reject: (p) => {
    const [a1, b1, a2, b2] = p;
    if (!allIn(p, [[0, 6], [-6, 6], [-6, 6], [-6, 6]])) return "Two lines with whole-number coefficients from −6 to 6.";
    if ((a1 === 0 && b1 <= 0) || gcd(a1, Math.abs(b1)) !== 1 || (a2 === 0 && b2 === 0)) return "The first line has coprime coefficients and a positive first coefficient; the second is a real line.";
    return null;
  },
  keep: ([a1, b1, a2, b2]) => a1 * b2 - a2 * b1 === 0 || a1 * a2 + b1 * b2 === 0 || (a1 * 7 + b1 * 3 + a2 * 5 + b2 + 40) % 8 === 0,
  prompt: (p) => `Are the lines ${lin2(p[0], p[1], cP(p, 0))} and ${lin2(p[2], p[3], cP(p, 1))} parallel, perpendicular, or neither?`,
  choices: () => PARCH,
  solve: ([a1, b1, a2, b2]) => {
    const kind = a1 * b2 - a2 * b1 === 0 ? 0 : a1 * a2 + b1 * b2 === 0 ? 1 : 2;
    return { steps: [S("cross", "evaluate", LINE, [a1, b1, a2, b2], a1 * b2 - a2 * b1), S("dot", "evaluate", LINE, [a1, a2, b1, b2], a1 * a2 + b1 * b2), S("decide", "compare", LINE, [kind], kind)], answer: kind };
  },
  // independent: the angle between the direction vectors (b, −a), measured with arccos
  validate: ([a1, b1, a2, b2], v) => {
    const th = Math.acos(Math.max(-1, Math.min(1, (b1 * b2 + a1 * a2) / (Math.hypot(a1, b1) * Math.hypot(a2, b2)))));
    const kind = Math.abs(th) < 1e-6 || Math.abs(th - Math.PI) < 1e-6 ? 0 : Math.abs(th - Math.PI / 2) < 1e-9 ? 1 : 2;
    return v === kind;
  },
  bugs: ([a1, b1, a2, b2]) => {
    const kind = a1 * b2 - a2 * b1 === 0 ? 0 : a1 * a2 + b1 * b2 === 0 ? 1 : 2;
    const out: Bug[] = [];
    if (kind === 2 && b1 !== 0 && b2 !== 0 && a1 * b2 + a2 * b1 === 0 && a1 !== 0) out.push(B("negative-not-reciprocal", "conceptual", LINE, "Slopes that are negatives of each other were taken as perpendicular; perpendicular slopes multiply to −1 (negative reciprocals).", 1));
    if (kind === 2 && b1 !== 0 && b2 !== 0 && a1 * a2 === b1 * b2) out.push(B("reciprocal-no-sign", "conceptual", LINE, "Slopes that multiply to +1 were taken as perpendicular; perpendicular slopes multiply to −1.", 1));
    if (kind === 0 && (a1 !== a2 || b1 !== b2)) out.push(B("coefficients-must-match", "conceptual", LINE, "The lines were called not parallel because their coefficients differ; a multiple of the same x and y coefficients gives the same slope.", 2));
    if (kind === 1) out.push(B("perpendicular-missed", "procedural", LINE, "Only parallel was tested. Also check whether the product of the slopes is −1 (or a₁a₂ + b₁b₂ = 0).", 2));
    return out;
  },
  variants: () => [],
  explain: (s) => (s.id === "cross" ? `a₁b₂ − a₂b₁ = ${s.value} (0 means parallel)` : s.id === "dot" ? `a₁a₂ + b₁b₂ = ${s.value} (0 means perpendicular)` : `So the lines are ${PARCH[Number(s.value)]}`),
  domain: [[0, 6], [-6, 6], [-6, 6], [-6, 6]],
  cap: 300,
  difficulty: ([a1, b1, a2, b2]) => (a1 === a2 && b1 === b2 ? 1 : a1 * b2 - a2 * b1 === 0 || a1 * a2 + b1 * b2 === 0 ? 2 : 3),
  teach: {
    idea: "The slope of ax + by + c = 0 is −a/b. Parallel lines have equal slopes; perpendicular lines have slopes whose product is −1.",
    method: "Find both slopes (or test a₁b₂ − a₂b₁ = 0 for parallel and a₁a₂ + b₁b₂ = 0 for perpendicular, which also works for vertical lines).",
    alternatives: [{ id: "normals", title: "Compare the normal vectors", kind: "conceptual", text: ["(a, b) is perpendicular to the line ax + by + c = 0.", "Lines are parallel when their normals are multiples of each other, and perpendicular when the normals have dot product 0."] }],
  },
  limits: "Lines with whole-number coefficients; a balanced selection of parallel, perpendicular and other pairs (coincident lines are avoided by the constants).",
};
function cP(p: number[], which: number) {
  const [a1, b1, a2, b2] = p;
  const c1 = (((a1 * 5 + b1 * 3 + 7) % 9) + 9) % 9 - 4;
  if (!which) return c1;
  let c2 = (((a2 * 3 + b2 * 7 + 2) % 11) + 11) % 11 - 5;
  // avoid the same line: c₂ must not be the matching multiple of c₁
  const g = a1 !== 0 ? a2 / a1 : b2 / b1;
  if (a1 * b2 - a2 * b1 === 0 && c2 === g * c1) c2 += 1;
  return c2;
}

// ---- tangents and normals
const astan: Def = {
  id: "astan",
  arity: 4,
  title: "The tangent or normal to a circle or parabola at a point",
  competency: TAN,
  type: "exact",
  mc: true,
  // [kind, p, q, w]: kind 0 circle x² + y² = p² + q² at (p, q); kind 1 parabola y² = 4px at t = q; w 0 tangent, 1 normal
  parse: none,
  reject: (pp) => {
    const [kind, p, q, w] = pp;
    if (!allIn(pp, [[0, 1], [-6, 6], [-6, 6], [0, 1]])) return "A circle centred at the origin through a whole-number point, or a parabola y² = 4ax at a small parameter t.";
    if (kind === 0 && (q === 0 || (w === 1 && p === 0))) return "The tangent or normal must not be vertical.";
    if (kind === 1 && (p < 1 || q === 0 || Math.abs(q) > 3)) return "Parabola y² = 4ax with a from 1 to 6 and t from −3 to 3 (not 0).";
    return null;
  },
  prompt: (pp) => {
    const [x1, y1] = tanPoint(pp);
    return `Find the equation of the ${pp[3] ? "normal" : "tangent"} to the ${tanCurve(pp)} at the point ${P2(x1, y1)}. Write it as y = mx + c and type the right-hand side.`;
  },
  solve: (pp) => {
    const [m, c] = tanLine(pp, pp[3]);
    const ans = poly([[m, "x"], [c, ""]]);
    return { steps: [S("slope-curve", "differentiate", TAN, [tanCurve(pp)], rs(tanLine(pp, 0)[0])), S("slope-line", "choose", TAN, [pp[3]], rs(m)), S("equation", "substitute", LINE, [rs(m)], ans)], answer: ans };
  },
  // independent: the line must pass through the point and its slope must match (tangent) or be perpendicular to
  // (normal) the curve's slope found by a numerical difference along the curve itself
  validate: (pp, v) => {
    const f = fnOf(v);
    if (!f) return false;
    const [kind, p, , w] = pp;
    const [x1, y1] = tanPoint(pp);
    if (!close(f({ x: x1 }), y1, 1e-9)) return false;
    const s = f({ x: x1 + 1 }) - f({ x: x1 });
    if (!close(f({ x: x1 + 2.5 }) - f({ x: x1 }), 2.5 * s, 1e-9)) return false;
    const h = 1e-6;
    let curve: number;
    if (kind === 0) {
      const r2 = x1 * x1 + y1 * y1;
      const y = (x: number) => Math.sign(y1) * Math.sqrt(r2 - x * x);
      curve = (y(x1 + h) - y(x1 - h)) / (2 * h);
    } else {
      const x = (y: number) => (y * y) / (4 * p);
      curve = (2 * h) / (x(y1 + h) - x(y1 - h));
    }
    return w === 0 ? Math.abs(s - curve) < 1e-5 * Math.max(1, Math.abs(s)) : Math.abs(s * curve + 1) < 1e-5 * Math.max(1, Math.abs(s * curve));
  },
  bugs: (pp) => {
    const [kind, p, q, w] = pp;
    const [x1, y1] = tanPoint(pp);
    const [m] = tanLine(pp, w);
    const other = kind === 0 && w === 0 && x1 === 0 ? null : tanLine(pp, 1 - w);
    return [
      B(w ? "gave-tangent" : "gave-normal", "conceptual", TAN, w ? "The tangent was given; the normal is perpendicular to the tangent at the point, so its slope is −1/(tangent slope)." : "The normal (the line along the radius or perpendicular to the curve) was given; the tangent touches the curve, perpendicular to the normal.", other ? poly([[other[0], "x"], [other[1], ""]]) : null),
      B("intercept-sign", "procedural", LINE, "In y − y₁ = m(x − x₁), the term −m·x₁ was added instead of subtracted when finding c.", x1 !== 0 && m[0] !== 0 ? poly([[m, "x"], [radd(R_(y1), rmul(m, R_(x1))), ""]]) : null),
      ...(kind === 1 && w === 1 ? [B("normal-term-lost", "procedural", TAN, `The normal to y² = 4ax at (at², 2at) is y = −tx + 2at + at³; the at³ term (${mi(p * q * q * q)}) was lost.`, poly([[R_(-q), "x"], [R_(2 * p * q), ""]]))] : []),
    ];
  },
  distractors: (pp) => {
    const [m, c] = tanLine(pp, pp[3]);
    return [poly([[m, "x"], [R_(-c[0], c[1]), ""]]), poly([[R_(-m[0], m[1]), "x"], [c, ""]]), poly([[rdiv(R_(1), m[0] === 0 ? R_(1) : m), "x"], [radd(c, R_(1)), ""]])];
  },
  variants: () => [],
  explain: (s) => (s.id === "slope-curve" ? `The slope of the curve ${s.inputs[0]} at the point (the tangent's slope) is ${s.value}` : s.id === "slope-line" ? (s.inputs[0] ? `The normal is perpendicular to the tangent: its slope is ${s.value}` : `The tangent has slope ${s.value}`) : `Use y − y₁ = m(x − x₁): y = ${s.value}`),
  domain: [[0, 1], [-6, 6], [-6, 6], [0, 1]],
  difficulty: ([kind, , , w]) => (kind === 0 && w === 1 ? 1 : kind === 0 ? 2 : 3),
  word: (pp) => {
    const [x1, y1] = tanPoint(pp);
    if (pp[0] === 0) return pp[3] ? `A circular running track has equation ${tanCurve(pp)} (units of 10 m, centre at the origin). From the point ${P2(x1, y1)} on the track, a runner cuts straight across towards the centre, along the normal. Find the equation of the runner's path as y = mx + c and type the right-hand side.` : `A circular running track has equation ${tanCurve(pp)} (units of 10 m). At the point ${P2(x1, y1)} a runner leaves the track and runs straight on along the tangent. Find the equation of this straight path as y = mx + c and type the right-hand side.`;
    return `The cross-section of a dish antenna is the parabola ${tanCurve(pp)}. At the point ${P2(x1, y1)} a support rod is fixed along the ${pp[3] ? "normal" : "tangent"} to the dish. Find the equation of the rod's line as y = mx + c and type the right-hand side.`;
  },
  teach: {
    idea: "The tangent at a point has the slope of the curve there (from implicit differentiation or the standard formulas); the normal is perpendicular to it.",
    method: "Circle x² + y² = r² at (x₁, y₁): tangent xx₁ + yy₁ = r². Parabola y² = 4ax at (at², 2at): tangent ty = x + at², normal y = −tx + 2at + at³. Rearrange to y = mx + c.",
    alternatives: [{ id: "differentiate", title: "Differentiate implicitly", kind: "procedural", text: ["Differentiate the curve's equation with respect to x and solve for dy/dx at the point.", "That is the tangent slope; the normal slope is −1 divided by it. Then use y − y₁ = m(x − x₁)."] }],
  },
  limits: "Circles centred at the origin through a whole-number point and parabolas y² = 4ax at a whole-number parameter; vertical tangents and normals, ellipses and hyperbolas are not included here.",
};
function tanPoint([kind, p, q]: number[]): [number, number] {
  return kind === 0 ? [p, q] : [p * q * q, 2 * p * q];
}
function tanCurve([kind, p, q]: number[]) {
  return kind === 0 ? `circle x² + y² = ${p * p + q * q}` : `parabola y² = ${4 * p}x`;
}
/** [slope, intercept] of the tangent (w = 0) or normal (w = 1). */
function tanLine([kind, p, q]: number[], w: number): [R, R] {
  if (kind === 0) {
    if (w === 0) return [R_(-p, q), R_(p * p + q * q, q)];
    return [R_(q, p), R_(0)];
  }
  if (w === 0) return [R_(1, q), R_(p * q)];
  return [R_(-q), R_(2 * p * q + p * q * q * q)];
}

const CONICNAME = ["parabola", "circle", "ellipse", "hyperbola"];
const astanc: Def = {
  id: "astanc",
  arity: 4,
  title: "The condition for y = mx + c to be a tangent",
  competency: TAN,
  type: "exact",
  mc: true,
  // [kind, m, p, q]: 0 parabola y² = 4px, 1 circle x² + y² = p², 2 ellipse x²/p² + y²/q² = 1, 3 hyperbola x²/p² − y²/q² = 1
  parse: none,
  reject: (pp) => {
    const [kind, m, p, q] = pp;
    if (!allIn(pp, [[0, 3], [-4, 4], [1, 6], [1, 6]])) return "A standard conic with small whole-number constants and a whole-number slope.";
    if (kind <= 1 && q !== 1) return "Parabolas and circles use one constant.";
    if (kind === 0 && m === 0) return "A horizontal line never touches y² = 4ax.";
    if (kind === 2 && p === q) return "An ellipse with different axes.";
    if (kind === 3 && p * p * m * m <= q * q) return "No tangent to this hyperbola has that slope.";
    return null;
  },
  prompt: (pp) => `${pp[0] === 0 ? "Find the value of c" : "Find the positive value of c"} for which the line ${lineC(pp[1])} is a tangent to the ${conicTxt(pp)}.`,
  solve: (pp) => {
    const [kind, m, p, q] = pp;
    const ans = kind === 0 ? rs(R_(p, m)) : sq(R_(1), tcN(pp));
    const cond = ["c = a/m", "c² = r²(1 + m²)", "c² = a²m² + b²", "c² = a²m² − b²"][kind];
    return { steps: [S("condition", "recall", TAN, [cond], cond), S("substitute", "substitute", TAN, [m, p, q], kind === 0 ? ans : String(tcN(pp))), S("root", "evaluate", TAN, [kind], ans)], answer: ans };
  },
  // independent: substitute y = mx + c into the conic and check that the quadratic in x has a repeated root
  validate: ([kind, m, p, q], v) => {
    const c = num1(v);
    if (c === null) return false;
    if (kind > 0 && c <= 0) return false;
    let A: number, Bq: number, C: number;
    if (kind === 0) [A, Bq, C] = [m * m, 2 * m * c - 4 * p, c * c];
    else if (kind === 1) [A, Bq, C] = [1 + m * m, 2 * m * c, c * c - p * p];
    else if (kind === 2) [A, Bq, C] = [q * q + p * p * m * m, 2 * p * p * m * c, p * p * c * c - p * p * q * q];
    else [A, Bq, C] = [q * q - p * p * m * m, -2 * p * p * m * c, -p * p * c * c - p * p * q * q];
    const disc = Bq * Bq - 4 * A * C;
    return Math.abs(disc) <= 1e-8 * Math.max(1, Bq * Bq, Math.abs(4 * A * C));
  },
  bugs: (pp) => {
    const [kind, m, p, q] = pp;
    const N = tcN(pp);
    if (kind === 0) return [B("inverted", "recall", TAN, "The condition for y = mx + c to touch y² = 4ax is c = a/m; it was used upside down.", rs(R_(m, p))), B("multiplied", "recall", TAN, "The condition is c = a/m, not c = am.", rs(R_(m * p)))];
    const out: Bug[] = [B("gave-c-squared", "procedural", TAN, `The condition gives c² = ${N}; the square root was not taken.`, String(N))];
    if (kind === 1) out.push(B("lost-one", "recall", TAN, "For the circle x² + y² = r² the condition is c² = r²(1 + m²); the 1 was left out.", m !== 0 ? String(p * Math.abs(m)) : null));
    if (kind === 2) out.push(B("axes-swapped", "recall", TAN, "In c² = a²m² + b², a² goes with m² (a² is under x²); the two denominators were swapped.", sq(R_(1), q * q * m * m + p * p)));
    if (kind === 3) out.push(B("ellipse-sign", "recall", TAN, "For the hyperbola x²/a² − y²/b² = 1 the condition is c² = a²m² − b²; the ellipse's + sign was used.", sq(R_(1), p * p * m * m + q * q)));
    return out;
  },
  distractors: (pp) => {
    const N = tcN(pp);
    return pp[0] === 0 ? [rs(R_(-pp[2], pp[1])), rs(R_(2 * pp[2], pp[1])), rs(R_(pp[2], 2 * pp[1]))] : [sq(R_(1), N + 1), sq(R_(2), N), sq(R_(1, 2), N)];
  },
  variants: () => [],
  explain: (s) => (s.id === "condition" ? `For this conic, y = mx + c is a tangent when ${s.value}` : s.id === "substitute" ? `Substitute m and the constants: ${Number(s.inputs[0]) === 0 && false ? "" : s.value}` : `So c = ${s.value}`),
  domain: [[0, 3], [-4, 4], [1, 6], [1, 6]],
  difficulty: ([kind]) => (kind <= 1 ? 1 : kind === 2 ? 2 : 3),
  word: (pp) => `A straight laser beam travels along ${lineC(pp[1])} and just grazes a curved reflector shaped like the ${conicTxt(pp)} (units in metres). Find ${pp[0] === 0 ? "the value of c" : "the positive value of c"}.`,
  teach: {
    idea: "A line is a tangent when it meets the conic in exactly one point: substituting y = mx + c gives a quadratic in x whose discriminant is 0.",
    method: "Use the standard conditions: parabola y² = 4ax: c = a/m; circle x² + y² = r²: c² = r²(1 + m²); ellipse x²/a² + y²/b² = 1: c² = a²m² + b²; hyperbola x²/a² − y²/b² = 1: c² = a²m² − b².",
    alternatives: [{ id: "discriminant", title: "Use the discriminant", kind: "procedural", text: ["Substitute y = mx + c into the conic's equation and collect a quadratic in x.", "Set b² − 4ac of that quadratic to 0 and solve for c."] }],
  },
  limits: `Standard ${CONICNAME.join(", ")} centred at the origin with whole-number constants and slopes; the point of contact is not asked for.`,
};
function lineC(m: number) {
  return m === 0 ? "y = c" : `y = ${m === 1 ? "" : m === -1 ? "−" : mi(m)}x + c`;
}
function conicTxt([kind, , p, q]: number[]) {
  return kind === 0 ? `parabola y² = ${4 * p}x` : kind === 1 ? `circle x² + y² = ${p * p}` : kind === 2 ? `ellipse x²/${p * p} + y²/${q * q} = 1` : `hyperbola x²/${p * p} − y²/${q * q} = 1`;
}
function tcN([kind, m, p, q]: number[]) {
  return kind === 1 ? p * p * (1 + m * m) : kind === 2 ? p * p * m * m + q * q : p * p * m * m - q * q;
}

// ================================================================ space: points, lines, planes

const asdist3: Def = {
  id: "asdist3",
  arity: 6,
  title: "The distance between two points in space",
  competency: SPC,
  type: "exact",
  mc: true,
  parse: none,
  reject: (p) => (!allIn(p, Array(6).fill([-5, 5])) || (p[0] === p[3] && p[1] === p[4] && p[2] === p[5]) ? "Two different whole-number points with coordinates from −5 to 5." : null),
  prompt: (p) => `Find the distance between the points P${P3(p.slice(0, 3))} and Q${P3(p.slice(3))}.`,
  solve: (p) => {
    const d = [p[3] - p[0], p[4] - p[1], p[5] - p[2]];
    const N = dot(d, d);
    return { steps: [S("differences", "subtract", SPC, d, P3(d)), S("squares", "add", SPC, d, N), S("root", "evaluate", "MATH.number.radicals", [N], sq(R_(1), N))], answer: sq(R_(1), N) };
  },
  // independent: |PQ|² = |P|² + |Q|² − 2 P·Q (the cosine rule with the origin), compared with the answer squared
  validate: (p, v) => {
    const d = num1(v);
    if (d === null || d < 0) return false;
    const P = p.slice(0, 3);
    const Q = p.slice(3);
    return close(d * d, dot(P, P) + dot(Q, Q) - 2 * dot(P, Q), 1e-9);
  },
  bugs: (p) => {
    const d = [p[3] - p[0], p[4] - p[1], p[5] - p[2]];
    const s = [p[3] + p[0], p[4] + p[1], p[5] + p[2]];
    return [
      B("no-square-root", "procedural", SPC, "The square root was not taken at the end: the distance is √(sum of the squares).", String(dot(d, d))),
      B("added-differences", "conceptual", DIST, "The differences were added; in space the straight distance is √(Δx² + Δy² + Δz²).", String(d.reduce((a, x) => a + Math.abs(x), 0))),
      B("added-coordinates", "procedural", SPC, "The coordinates were added instead of subtracted; use (x₂ − x₁), (y₂ − y₁), (z₂ − z₁).", isZero(s) ? null : sq(R_(1), dot(s, s))),
    ];
  },
  distractors: (p) => {
    const d = [p[3] - p[0], p[4] - p[1], p[5] - p[2]];
    const N = dot(d, d);
    return [sq(R_(1), N + 1), sq(R_(2), N), sq(R_(1), N + 2 * Math.abs(d[0]) + 1)];
  },
  variants: () => [],
  explain: (s) => (s.id === "differences" ? `Differences of the coordinates: ${s.value}` : s.id === "squares" ? `Sum of their squares: ${(s.inputs as number[]).map((x) => (x < 0 ? `(${mi(x)})²` : `${x}²`)).join(" + ")} = ${s.value}` : `Distance = √${s.inputs[0]} = ${s.value}`),
  domain: Array(6).fill([-5, 5]) as [number, number][],
  cap: 400,
  difficulty: (p) => {
    const N = (p[3] - p[0]) ** 2 + (p[4] - p[1]) ** 2 + (p[5] - p[2]) ** 2;
    return Number.isInteger(Math.sqrt(N)) ? 1 : N < 50 ? 2 : 3;
  },
  word: (p) => `Two drones hover near a stadium. Measured in metres from a fixed marker, one is at ${P3(p.slice(0, 3))} and the other at ${P3(p.slice(3))}. How far apart are they, in metres?`,
  teach: {
    idea: "In space, Pythagoras is used twice: across the floor (x and y) and then up (z), giving √(Δx² + Δy² + Δz²).",
    method: "Subtract the coordinates, square each difference, add, and take the square root. Simplify the surd.",
    alternatives: [{ id: "box", title: "The diagonal of a box", kind: "conceptual", text: ["Think of a cuboid with edges |Δx|, |Δy| and |Δz|.", "The distance between the points is the space diagonal of that box."], visual: (p) => ({ type: "solid", name: "cuboid", dims: [String(Math.abs(p[3] - p[0])), String(Math.abs(p[4] - p[1])), String(Math.abs(p[5] - p[2]))] }) }],
  },
  limits: "Whole-number points with coordinates from −5 to 5; collinearity and triangle classification use the same skill and are not separate items.",
};

const assect3: Def = {
  id: "assect3",
  arity: 8,
  title: "The point dividing a segment in space in a ratio",
  competency: SPC,
  type: "tuple",
  mc: true,
  // [x₁, y₁, z₁, x₂, y₂, z₂, m, n]: divide AB internally in the ratio m : n
  parse: none,
  reject: (p) => {
    if (!allIn(p, [...Array(6).fill([-5, 5]), [1, 4], [1, 4]] as [number, number][])) return "Whole-number points from −5 to 5 and a ratio m : n with m, n from 1 to 4.";
    if (gcd(p[6], p[7]) !== 1) return "The ratio is in simplest form.";
    if (p[0] === p[3] && p[1] === p[4] && p[2] === p[5]) return "Two different points.";
    return null;
  },
  prompt: (p) => `Find the coordinates of the point that divides the segment from A${P3(p.slice(0, 3))} to B${P3(p.slice(3, 6))} internally in the ratio ${p[6]} : ${p[7]}${p[6] === 1 && p[7] === 1 ? " (the midpoint)" : ""}. Type it as (x, y, z).`,
  solve: (p) => {
    const [m, n] = [p[6], p[7]];
    const pt = [0, 1, 2].map((i) => R_(m * p[3 + i] + n * p[i], m + n));
    const ans = tup(pt.map(rs));
    return { steps: [S("weights", "multiply", SPC, [m, n], `(${m}·B + ${n}·A)`), S("divide", "divide", SPC, [m + n], ans)], answer: ans };
  },
  // independent: P must lie on AB between A and B, with AP : PB = m : n measured as distances
  validate: (p, v) => {
    const P = nums(v);
    if (!P || P.length !== 3) return false;
    const A = p.slice(0, 3);
    const Bp = p.slice(3, 6);
    const ap = sub(P, A);
    const pb = sub(Bp, P);
    if (norm(cross(ap, pb)) > 1e-9 || dot(ap, pb) < -1e-12) return false;
    return close(norm(ap) * p[7], norm(pb) * p[6], 1e-9);
  },
  bugs: (p) => {
    const [m, n] = [p[6], p[7]];
    const f = (k1: number, k2: number, den: number) => tup([0, 1, 2].map((i) => rs(R_(k1 * p[3 + i] + k2 * p[i], den))));
    return [
      B("ratio-reversed", "procedural", SPC, `The weights were swapped: for the ratio m : n from A, B is multiplied by m and A by n.`, m !== n ? f(n, m, m + n) : null),
      B("external", "conceptual", SPC, "The formula for external division (with a minus sign) was used; internal division adds the weighted points.", m !== n ? tup([0, 1, 2].map((i) => rs(R_(m * p[3 + i] - n * p[i], m - n)))) : null),
      B("not-divided", "procedural", SPC, `The weighted sum was not divided by m + n = ${m + n}.`, f(m, n, 1)),
    ];
  },
  distractors: (p) => [tup([0, 1, 2].map((i) => rs(R_(p[3 + i] + p[i], 2)))), tup([0, 1, 2].map((i) => rs(R_(p[3 + i] - p[i], p[6] + p[7]))))],
  variants: () => [],
  explain: (s) => (s.id === "weights" ? `Weight B by ${s.inputs[0]} and A by ${s.inputs[1]}: ${s.value}` : `Divide by m + n = ${s.inputs[0]}: ${s.value}`),
  domain: [...Array(6).fill([-5, 5]), [1, 4], [1, 4]] as [number, number][],
  cap: 400,
  difficulty: (p) => (p[6] === 1 && p[7] === 1 ? 1 : (p[6] + p[7]) % 2 === 0 || p[6] + p[7] <= 3 ? 2 : 3),
  word: (p) => `A straight zip-line cable runs from A${P3(p.slice(0, 3))} to B${P3(p.slice(3, 6))} (coordinates in metres). A marker is fixed at the point that divides the cable in the ratio ${p[6]} : ${p[7]} from A. Find the marker's position, typed as (x, y, z).`,
  teach: {
    idea: "The point that divides AB in the ratio m : n is m/(m + n) of the way from A to B, the same in every coordinate.",
    method: "P = ((mx₂ + nx₁)/(m + n), (my₂ + ny₁)/(m + n), (mz₂ + nz₁)/(m + n)). For the midpoint, m = n = 1.",
    alternatives: [{ id: "fraction_of_way", title: "Go a fraction of the way", kind: "conceptual", text: ["Find B − A, the step from A to B.", "Add m/(m + n) of that step to A."] }],
  },
  limits: "Internal division of whole-number segments in ratios up to 4 : 4 (simplest form); the centroid is not included.",
};

const asoct: Def = {
  id: "asoct",
  arity: 3,
  title: "Where a point lies in space: octant, plane or axis",
  competency: SPC,
  type: "choice",
  parse: none,
  reject: (p) => (!allIn(p, [[-5, 5], [-5, 5], [-5, 5]]) || isZero(p) ? "A whole-number point other than the origin." : null),
  prompt: (p) => `Where does the point ${P3(p)} lie?`,
  choices: (p) => octOptions(p),
  solve: (p) => {
    const opts = octOptions(p);
    const right = octRight(p);
    return { steps: [S("signs", "read", SPC, p, p.map((x) => (x > 0 ? "+" : x < 0 ? "−" : "0")).join(", ")), S("place", "classify", SPC, [right], opts.indexOf(right))], answer: opts.indexOf(right) };
  },
  // independent: read the chosen statement as conditions on x, y, z and test them on the point
  validate: (p, v) => {
    const t = typeof v === "number" ? octOptions(p)[v] : undefined;
    if (!t) return false;
    const [x, y, z] = p;
    const m = t.match(/x ([<>]) 0, y ([<>]) 0, z ([<>]) 0/);
    if (m) return [x, y, z].every((c, i) => (m[i + 1] === ">" ? c > 0 : c < 0));
    if (t === "the xy-plane") return z === 0;
    if (t === "the yz-plane") return x === 0;
    if (t === "the zx-plane") return y === 0;
    if (t === "the x-axis") return y === 0 && z === 0;
    if (t === "the y-axis") return x === 0 && z === 0;
    if (t === "the z-axis") return x === 0 && y === 0;
    return false;
  },
  bugs: (p) => {
    const opts = octOptions(p);
    const zeros = p.filter((x) => x === 0).length;
    const L = ["x", "y", "z"];
    if (zeros === 1) {
      const i = p.indexOf(0);
      return [B("zero-names-axis", "conceptual", SPC, `A point with ${L[i]} = 0 was placed on the ${L[i]}-axis; ${L[i]} = 0 means the point is in the plane of the other two axes.`, opts.indexOf(`the ${L[i]}-axis`))];
    }
    if (zeros === 2) {
      const i = p.findIndex((x) => x !== 0);
      const plane = ["the yz-plane", "the zx-plane", "the xy-plane"][i];
      return [B("axis-or-plane", "conceptual", SPC, `Only ${L[i]} is not zero, so the point is on the ${L[i]}-axis; ${plane} is where ${L[i]} = 0.`, opts.indexOf(plane))];
    }
    const neg = p.findIndex((x) => x < 0);
    if (neg < 0) return [];
    const q = [...p];
    q[neg] = -q[neg];
    return [B("sign-ignored", "procedural", SPC, `The negative ${L[neg]}-coordinate was read as positive; the sign of each coordinate decides the octant.`, opts.indexOf(octRight(q)))];
  },
  variants: () => [],
  explain: (s) => (s.id === "signs" ? `Signs of (x, y, z): ${s.value}` : `So the point lies in ${s.inputs[0]}`),
  domain: [[-5, 5], [-5, 5], [-5, 5]],
  cap: 300,
  keep: (p) => p.filter((x) => x === 0).length > 0 || (p[0] * 3 + p[1] * 5 + p[2] * 7 + 60) % 4 === 0,
  difficulty: (p) => (p.filter((x) => x === 0).length === 2 ? 1 : p.filter((x) => x === 0).length === 1 ? 2 : 3),
  teach: {
    idea: "The three coordinate planes (xy, yz, zx) divide space into eight octants. A zero coordinate puts a point on a coordinate plane; two zeros put it on an axis.",
    method: "Count the zero coordinates. None: use the signs of x, y and z to name the octant. One zero (say z = 0): the point is in the plane of the other two axes (the xy-plane). Two zeros: the point is on the remaining axis.",
    alternatives: [{ id: "room_corner", title: "A corner of a room", kind: "conceptual", text: ["Stand in the corner of a room: the floor edges are the x- and y-axes, and the vertical edge is the z-axis.", "The floor is the xy-plane (z = 0); the two walls are the yz- and zx-planes."] }],
  },
  limits: "Whole-number points from −5 to 5; octants are named by the signs of the coordinates rather than by Roman numerals.",
};
function octTxt(s: number[]) {
  return `the octant where x ${s[0] > 0 ? ">" : "<"} 0, y ${s[1] > 0 ? ">" : "<"} 0, z ${s[2] > 0 ? ">" : "<"} 0`;
}
function octRight(p: number[]) {
  const zeros = p.filter((x) => x === 0).length;
  if (zeros === 0) return octTxt(p);
  if (zeros === 1) return ["the yz-plane", "the zx-plane", "the xy-plane"][p.indexOf(0)];
  return ["the x-axis", "the y-axis", "the z-axis"][p.findIndex((x) => x !== 0)];
}
function octOptions(p: number[]): string[] {
  const zeros = p.filter((x) => x === 0).length;
  if (zeros === 0) {
    const s = p.map(Math.sign);
    const flips = [s, [-s[0], s[1], s[2]], [s[0], -s[1], s[2]], [s[0], s[1], -s[2]]];
    return flips.sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2]).map(octTxt);
  }
  if (zeros === 1) return ["the xy-plane", "the yz-plane", "the zx-plane", `the ${["x", "y", "z"][p.indexOf(0)]}-axis`];
  const i = p.findIndex((x) => x !== 0);
  return ["the x-axis", "the y-axis", "the z-axis", ["the yz-plane", "the zx-plane", "the xy-plane"][i]];
}

const asdcos: Def = {
  id: "asdcos",
  arity: 6,
  title: "Direction cosines of the line through two points",
  competency: SL,
  type: "tuple",
  mc: true,
  parse: none,
  reject: (p) => (!allIn(p, Array(6).fill([-4, 4])) || (p[0] === p[3] && p[1] === p[4] && p[2] === p[5]) ? "Two different whole-number points with coordinates from −4 to 4." : null),
  prompt: (p) => `Find the direction cosines of the line through A${P3(p.slice(0, 3))} and B${P3(p.slice(3))}, directed from A to B. Type them as (l, m, n).`,
  solve: (p) => {
    const d = [p[3] - p[0], p[4] - p[1], p[5] - p[2]];
    const N = dot(d, d);
    const ans = tup(d.map((x) => sq(R_(x, N), N)));
    return { steps: [S("ratios", "subtract", SL, d, P3(d)), S("length", "evaluate", SPC, [N], sq(R_(1), N)), S("divide", "divide", SL, [N], ans)], answer: ans };
  },
  // independent: l² + m² + n² = 1, and (l, m, n) points the same way as B − A (cross product 0, dot product > 0)
  validate: (p, v) => {
    const c = nums(v);
    if (!c || c.length !== 3) return false;
    const d = [p[3] - p[0], p[4] - p[1], p[5] - p[2]];
    return close(dot(c, c), 1, 1e-9) && norm(cross(c, d)) < 1e-9 && dot(c, d) > 0;
  },
  bugs: (p) => {
    const d = [p[3] - p[0], p[4] - p[1], p[5] - p[2]];
    const N = dot(d, d);
    return [
      B("ratios-not-cosines", "conceptual", SL, `These are direction ratios; direction cosines are the ratios divided by the length √${N}, so that l² + m² + n² = 1.`, N !== 1 ? P3(d) : null),
      B("reversed", "procedural", SL, "The direction from B to A was used; from A to B, subtract A from B.", tup(d.map((x) => sq(R_(-x, N), N)))),
      B("no-square-root", "procedural", SL, `The ratios were divided by ${N} instead of √${N}.`, N !== 1 ? tup(d.map((x) => rs(R_(x, N)))) : null),
    ];
  },
  distractors: (p) => {
    const d = [p[3] - p[0], p[4] - p[1], p[5] - p[2]];
    const s = d.reduce((a, x) => a + Math.abs(x), 0);
    return [tup(d.map((x) => rs(R_(x, s)))), tup([d[1], d[2], d[0]].map((x) => sq(R_(x, dot(d, d)), dot(d, d))))];
  },
  variants: () => [],
  explain: (s) => (s.id === "ratios" ? `Direction ratios: B − A = ${s.value}` : s.id === "length" ? `Length |AB| = ${s.value}` : `Divide each ratio by the length: ${s.value}`),
  domain: Array(6).fill([-4, 4]) as [number, number][],
  cap: 400,
  difficulty: (p) => {
    const N = (p[3] - p[0]) ** 2 + (p[4] - p[1]) ** 2 + (p[5] - p[2]) ** 2;
    return Number.isInteger(Math.sqrt(N)) ? 1 : 2;
  },
  word: (p) => `A straight cable is strung from the top of a pole at A${P3(p.slice(0, 3))} to a peg at B${P3(p.slice(3))} (coordinates in metres). Find the direction cosines of the cable, directed from A to B, typed as (l, m, n).`,
  teach: {
    idea: "Direction cosines are the cosines of the angles a line makes with the axes; they are the components of a unit vector along the line, so l² + m² + n² = 1.",
    method: "Find the direction ratios B − A, find the length √(a² + b² + c²), and divide each ratio by it.",
    alternatives: [{ id: "unit_vector", title: "Make a unit vector", kind: "procedural", text: ["Write AB as a vector a î + b ĵ + c k̂.", "Divide by its magnitude: the components of the unit vector are l, m and n."] }],
  },
  limits: "Lines through two whole-number points; answers may contain surds, written with rational denominators.",
};

/** A fixed starting point for a line, from its parameters (so problems differ). */
const basePt = (seed: number[]) => [((((seed[0] ?? 0) * 3 + (seed[4] ?? 0) + 7) % 5) + 5) % 5 - 2, ((((seed[1] ?? 0) * 5 - (seed[3] ?? 0) + 9) % 5) + 5) % 5 - 2, ((((seed[2] ?? 0) * 7 + (seed[5] ?? 0) + 11) % 5) + 5) % 5 - 2];

const asangl: Def = {
  id: "asangl",
  arity: 6,
  title: "The angle between two lines in space",
  competency: SL,
  type: "exact",
  mc: true,
  // [a₁, b₁, c₁, a₂, b₂, c₂]: direction vectors of the two lines
  parse: none,
  reject: (p) => {
    if (!allIn(p, Array(6).fill([-3, 3]))) return "Direction vectors with whole-number components from −3 to 3.";
    const u = p.slice(0, 3);
    const v = p.slice(3);
    if (isZero(u) || isZero(v) || isZero(cross(u, v))) return "Two lines that are not parallel.";
    return null;
  },
  prompt: (p) => `Find cos θ, where θ is the acute angle between the lines ${lineVec(angPts(p)[0], p.slice(0, 3))} and ${lineVec(angPts(p)[1], p.slice(3), "μ")}.`,
  solve: (p) => {
    const u = p.slice(0, 3);
    const v = p.slice(3);
    const d = dot(u, v);
    const N = dot(u, u) * dot(v, v);
    const ans = sq(R_(Math.abs(d), N), N);
    return { steps: [S("dot", "multiply", VEC, [d], d), S("lengths", "evaluate", SPC, [dot(u, u), dot(v, v)], `√${dot(u, u)} · √${dot(v, v)}`), S("cos", "divide", SL, [Math.abs(d), N], ans)], answer: ans };
  },
  // independent: sin θ from the cross product, then cos θ = √(1 − sin² θ)
  validate: (p, v) => {
    const c = num1(v);
    if (c === null || c < 0) return false;
    const u = p.slice(0, 3);
    const w = p.slice(3);
    const s = norm(cross(u, w)) / (norm(u) * norm(w));
    return close(c * c, 1 - s * s, 1e-9);
  },
  bugs: (p) => {
    const u = p.slice(0, 3);
    const v = p.slice(3);
    const d = dot(u, v);
    const N = dot(u, u) * dot(v, v);
    const [A, Bp] = angPts(p);
    const pd = dot(A, Bp);
    const pN = dot(A, A) * dot(Bp, Bp);
    return [
      B("no-absolute-value", "procedural", SL, "The dot product was negative and its sign was kept; for the acute angle, take |u·v|.", d < 0 ? sq(R_(d, N), N) : null),
      B("used-points", "conceptual", SL, "The position vectors of the points on the lines were used; the angle between lines depends only on their direction vectors (the vectors multiplied by λ and μ).", pN > 0 && !isZero(A) && !isZero(Bp) ? sq(R_(Math.abs(pd), pN), pN) : null),
      B("no-square-root", "procedural", SL, "The product of the squared lengths was used; divide by |u||v|, the square roots.", d !== 0 && N !== 1 ? rs(R_(Math.abs(d), N)) : null),
    ];
  },
  distractors: (p) => {
    const u = p.slice(0, 3);
    const v = p.slice(3);
    const d = Math.abs(dot(u, v));
    const N = dot(u, u) * dot(v, v);
    return [sq(R_(d + 1, N), N), sq(R_(1, 1), Math.max(1, N - d * d)), sq(R_(d + 2, N), N)];
  },
  variants: () => [],
  explain: (s) => (s.id === "dot" ? `Dot product of the direction vectors: u·v = ${s.value}` : s.id === "lengths" ? `|u||v| = ${s.value}` : `cos θ = |u·v|/(|u||v|) = ${s.value}`),
  domain: Array(6).fill([-3, 3]) as [number, number][],
  cap: 400,
  difficulty: (p) => (dot(p.slice(0, 3), p.slice(3)) === 0 ? 1 : 2),
  word: (p) => `Two straight steel rods in a roof frame lie along ${lineVec(angPts(p)[0], p.slice(0, 3))} and ${lineVec(angPts(p)[1], p.slice(3), "μ")} (units in metres). Find cos θ, where θ is the acute angle between the rods.`,
  teach: {
    idea: "The angle between two lines is the angle between their direction vectors; the dot product gives its cosine, and |u·v| gives the acute angle. cos θ = 0 means the lines are perpendicular.",
    method: "Take the direction vectors u and v (the vectors multiplied by λ and μ), and work out cos θ = |u·v|/(|u||v|).",
    alternatives: [{ id: "direction_cosines", title: "Use direction cosines", kind: "procedural", text: ["Turn each direction vector into direction cosines (l, m, n).", "cos θ = |l₁l₂ + m₁m₂ + n₁n₂|."] }],
  },
  limits: "Direction vectors with components from −3 to 3 (not parallel); the answer is cos θ, possibly 0 for perpendicular lines.",
};
function angPts(p: number[]) {
  return [basePt(p), basePt([p[3], p[4], p[5], p[0], p[1], p[2]]).map((x, i) => x + i - 1)];
}

const asfoot: Def = {
  id: "asfoot",
  arity: 8,
  title: "The foot of the perpendicular from a point to a line in space",
  competency: SL,
  type: "tuple",
  mc: true,
  // [a₁, a₂, a₃, d₁, d₂, d₃, t, k]: line r = a + λd; foot F = a + t d; P = F + k (d × e)
  parse: none,
  reject: (p) => {
    if (!allIn(p, [[-3, 3], [-3, 3], [-3, 3], [-2, 2], [-2, 2], [-2, 2], [-2, 2], [-2, 2]])) return "A whole-number line and point with small coordinates.";
    if (isZero(p.slice(3, 6)) || p[6] === 0 || p[7] === 0) return "A real line, a foot away from the given point on it, and a point off the line.";
    return null;
  },
  prompt: (p) => `Find the foot of the perpendicular from the point P${P3(footP(p))} to the line ${lineVec(p.slice(0, 3), p.slice(3, 6))}. Type it as (x, y, z).`,
  solve: (p) => {
    const A = p.slice(0, 3);
    const d = p.slice(3, 6);
    const P = footP(p);
    const F = addv(A, scl(p[6], d));
    return {
      steps: [S("general", "write", SL, [P3(A), P3(d)], `Q = (${A.map((a, i) => `${mi(a)} + ${d[i] === 1 ? "" : d[i] === -1 ? "−" : mi(d[i])}λ`).join(", ")})`), S("perpendicular", "dot", VEC, [dot(sub(P, A), d), dot(d, d)], p[6]), S("foot", "substitute", SL, [p[6]], P3(F))],
      answer: P3(F),
    };
  },
  // independent: the answer must be on the line ((Q − a) × d = 0) and PQ must be perpendicular to d
  validate: (p, v) => {
    const Q = nums(v);
    if (!Q || Q.length !== 3) return false;
    const A = p.slice(0, 3);
    const d = p.slice(3, 6);
    const P = footP(p);
    return norm(cross(sub(Q, A), d)) < 1e-9 && Math.abs(dot(sub(P, Q), d)) < 1e-9;
  },
  bugs: (p) => {
    const A = p.slice(0, 3);
    const d = p.slice(3, 6);
    const dd = dot(d, d);
    return [
      B("gave-given-point", "conceptual", SL, "The point on the line that is written in its equation was given; the foot is the point where the perpendicular from P meets the line, found from (PQ)·d = 0.", P3(A)),
      B("lambda-sign", "procedural", SL, "λ came out with the wrong sign when solving (Q − P)·d = 0.", P3(sub(A, scl(p[6], d)))),
      B("not-divided", "procedural", VEC, `In (Q − P)·d = 0 the λ terms add up to λ|d|² = ${dd}λ; λ was not divided by ${dd}.`, dd !== 1 ? P3(addv(A, scl(p[6] * dd, d))) : null),
    ];
  },
  distractors: (p) => {
    const F = addv(p.slice(0, 3), scl(p[6], p.slice(3, 6)));
    return [P3(footP(p)), P3(F.map((x, i) => (i === 0 ? x + 1 : x)))];
  },
  variants: () => [],
  explain: (s) => (s.id === "general" ? `A general point of the line: ${s.value}` : s.id === "perpendicular" ? `PQ is perpendicular to the direction d: (Q − P)·d = 0 gives ${s.inputs[1]}λ = ${s.inputs[0]}, so λ = ${s.value}` : `Put λ = ${s.inputs[0]} into the general point: ${s.value}`),
  domain: [[-3, 3], [-3, 3], [-3, 3], [-2, 2], [-2, 2], [-2, 2], [-2, 2], [-2, 2]],
  cap: 400,
  difficulty: (p) => (dot(p.slice(3, 6), p.slice(3, 6)) <= 2 ? 1 : Math.abs(p[6]) === 1 ? 2 : 3),
  word: (p) => `A straight power line runs along ${lineVec(p.slice(0, 3), p.slice(3, 6))} (units in metres). A transformer at P${P3(footP(p))} is to be joined to it by the shortest possible cable. Find the point where the cable meets the power line, typed as (x, y, z).`,
  teach: {
    idea: "The shortest segment from a point to a line is perpendicular to the line, so the foot Q is the point of the line with PQ·d = 0.",
    method: "Write a general point Q = a + λd of the line, form PQ = Q − P, solve PQ·d = 0 for λ, and substitute back.",
    alternatives: [{ id: "projection", title: "Project onto the direction", kind: "conceptual", text: ["The foot is a + λd with λ = (P − a)·d / |d|²: the projection of AP on the line.", "This is the same λ the dot-product equation gives."] }],
  },
  limits: "Whole-number lines and points built so the foot has whole-number coordinates.",
};
function footP(p: number[]) {
  const d = p.slice(3, 6);
  const F = addv(p.slice(0, 3), scl(p[6], d));
  const i = d.map(Math.abs).indexOf(Math.min(...d.map(Math.abs)));
  const e = [0, 0, 0];
  e[i] = 1;
  return addv(F, scl(p[7], cross(d, e)));
}

const DIRS = [[1, 2, 2], [2, -1, 1], [1, 0, -1], [3, 1, -2], [0, 1, 1], [1, -1, 0], [2, 2, -1], [1, 3, 1], [-1, 2, 3], [2, 0, 1], [1, 1, 1], [0, 2, -1]];
const LREL = ["parallel", "intersecting", "skew"];
/** [first point, its direction, second point, its direction] for the line-pair families. */
function relLines([iu, iv, al, be, ga]: number[]) {
  const u = DIRS[iu];
  const A = basePt([iu, iv, al, be, ga, iu + iv]);
  if (iu === iv) {
    const e = [0, 0, 0];
    e[u.map(Math.abs).indexOf(Math.min(...u.map(Math.abs)))] = 1;
    const n = cross(u, e);
    return { A, u, B: addv(A, addv(scl(al, u), scl(ga, n))), v: scl(-2, u) };
  }
  const v = DIRS[iv];
  return { A, u, B: addv(A, addv(addv(scl(al, u), scl(be, v)), scl(ga, cross(u, v)))), v };
}
const aslrel: Def = {
  id: "aslrel",
  arity: 5,
  title: "Parallel, intersecting or skew lines",
  competency: SL,
  type: "choice",
  // [iu, iv, α, β, γ]: line 1 through A along u; line 2 through B = A + αu + βv + γ(u × v) along v (iu = iv: v = −2u)
  parse: none,
  reject: (p) => {
    const [iu, iv, , be, ga] = p;
    if (!allIn(p, [[0, 11], [0, 11], [-2, 2], [-2, 2], [-1, 1]])) return "Two lines built from twelve fixed directions.";
    if (iu === iv && (be !== 0 || ga === 0)) return "Parallel lines that are not the same line.";
    return null;
  },
  keep: ([iu, iv, al, be, ga]) => iu === iv || (iu * 7 + iv * 3 + al * 5 + be + 40) % (ga === 0 ? 25 : 50) === 0,
  prompt: (p) => {
    const L = relLines(p);
    return `Are the lines ${lineVec(L.A, L.u)} and ${lineVec(L.B, L.v, "μ")} parallel, intersecting, or skew?`;
  },
  choices: () => LREL,
  solve: (p) => {
    const L = relLines(p);
    const n = cross(L.u, L.v);
    const kind = isZero(n) ? 0 : dot(sub(L.B, L.A), n) === 0 ? 1 : 2;
    return { steps: [S("directions", "cross", VEC, [P3(L.u), P3(L.v)], P3(n)), S("join", "dot", VEC, [P3(sub(L.B, L.A))], dot(sub(L.B, L.A), n)), S("decide", "classify", SL, [kind], kind)], answer: kind };
  },
  // independent: test proportional directions by ratios; otherwise solve two coordinate equations for λ, μ and
  // check the third
  validate: (p, v) => {
    const { A, u, B: Bp, v: w } = relLines(p);
    const prop = [0, 1, 2].every((i) => [0, 1, 2].every((j) => u[i] * w[j] === u[j] * w[i]));
    let kind = 0;
    if (!prop) {
      kind = 2;
      for (const [i, j, k] of [[0, 1, 2], [0, 2, 1], [1, 2, 0]]) {
        const det = u[i] * -w[j] - -w[i] * u[j];
        if (det === 0) continue;
        const ri = Bp[i] - A[i];
        const rj = Bp[j] - A[j];
        const lam = (ri * -w[j] - -w[i] * rj) / det;
        const mu = (u[i] * rj - ri * u[j]) / det;
        kind = Math.abs(A[k] + lam * u[k] - (Bp[k] + mu * w[k])) < 1e-9 ? 1 : 2;
        break;
      }
    }
    return v === kind;
  },
  bugs: (p) => {
    const kind = p[0] === p[1] ? 0 : p[4] === 0 ? 1 : 2;
    if (kind === 2) return [B("not-parallel-so-meet", "conceptual", SL, "In space, lines that are not parallel need not meet; check whether a common point exists by solving for λ and μ (lines that never meet and are not parallel are skew).", 1)];
    if (kind === 0) return [B("multiple-not-parallel", "conceptual", SL, "The direction vectors were called different; one is a multiple of the other, so the lines are parallel.", 2)];
    return [B("one-equation-only", "procedural", SL, "λ and μ found from two coordinates must also satisfy the third coordinate; here they do, so the lines meet.", 2)];
  },
  variants: () => [],
  explain: (s) => (s.id === "directions" ? `u × v = ${s.value} (zero means the directions are parallel)` : s.id === "join" ? `(B − A)·(u × v) = ${s.value} (zero means the lines lie in one plane and meet)` : `So the lines are ${LREL[Number(s.value)]}`),
  domain: [[0, 11], [0, 11], [-2, 2], [-2, 2], [-1, 1]],
  difficulty: ([iu, iv, , , ga]) => (iu === iv ? 1 : ga === 0 ? 2 : 3),

  teach: {
    idea: "In space two lines are parallel (directions are multiples), intersecting (they share a point), or skew (neither: not parallel and never meet).",
    method: "If the directions are multiples, the lines are parallel. Otherwise set the general points equal, solve two of the coordinate equations for λ and μ, and test the third: it holds for intersecting lines and fails for skew lines.",
    alternatives: [{ id: "triple_product", title: "Use the scalar triple product", kind: "procedural", text: ["Non-parallel lines meet exactly when (B − A)·(u × v) = 0, i.e. A, B, u, v lie in one plane.", "A non-zero value means the lines are skew."] }],
  },
  limits: "Lines built from twelve fixed whole-number directions; a balanced selection of parallel, intersecting and skew pairs.",
};

const asskew: Def = {
  id: "asskew",
  arity: 9,
  title: "The shortest distance between skew lines",
  competency: SKEW,
  type: "exact",
  mc: true,
  // [u₁, u₂, u₃, v₁, v₂, v₃, w₁, w₂, w₃]: lines r = A + λu and r = A + w + μv
  parse: none,
  reject: (p) => {
    if (!allIn(p, [...Array(6).fill([-2, 2]), ...Array(3).fill([-3, 3])] as [number, number][])) return "Small whole-number directions and points.";
    const n = cross(p.slice(0, 3), p.slice(3, 6));
    if (isZero(n)) return "The lines must not be parallel.";
    if (dot(p.slice(6), n) === 0) return "The lines must not meet.";
    return null;
  },
  prompt: (p) => {
    const A = basePt(p);
    return `Find the shortest distance between the lines ${lineVec(A, p.slice(0, 3))} and ${lineVec(addv(A, p.slice(6)), p.slice(3, 6), "μ")}.`;
  },
  solve: (p) => {
    const n = cross(p.slice(0, 3), p.slice(3, 6));
    const w = p.slice(6);
    const N = dot(n, n);
    const ans = sq(R_(Math.abs(dot(w, n)), N), N);
    return { steps: [S("normal", "cross", VEC, [P3(p.slice(0, 3)), P3(p.slice(3, 6))], P3(n)), S("join", "subtract", SL, [], P3(w)), S("project", "dot", VEC, [dot(w, n), N], ans)], answer: ans };
  },
  // independent: minimise |A + λu − B − μv| by solving the two normal equations for λ and μ, and measure the gap
  validate: (p, v) => {
    const d = num1(v);
    if (d === null) return false;
    const u = p.slice(0, 3);
    const w2 = p.slice(3, 6);
    const w = p.slice(6);
    // (λu − μv − w)·u = 0, (λu − μv − w)·v = 0
    const [a11, a12, a21, a22] = [dot(u, u), -dot(u, w2), dot(u, w2), -dot(w2, w2)];
    const [b1, b2] = [dot(w, u), dot(w, w2)];
    const det = a11 * a22 - a12 * a21;
    const lam = (b1 * a22 - a12 * b2) / det;
    const mu = (a11 * b2 - b1 * a21) / det;
    const gap = sub(addv(scl(lam, u), scl(-mu, w2)), w);
    return close(norm(gap), d, 1e-8);
  },
  bugs: (p) => {
    const n = cross(p.slice(0, 3), p.slice(3, 6));
    const w = p.slice(6);
    const N = dot(n, n);
    const t = dot(w, n);
    return [
      B("no-absolute-value", "procedural", SKEW, "The scalar (B − A)·(u × v) was negative and its sign was kept; a distance is never negative.", t < 0 ? sq(R_(t, N), N) : null),
      B("not-divided", "procedural", SKEW, `The projection was not divided by |u × v| = √${N}.`, N !== 1 ? String(Math.abs(t)) : null),
      B("distance-of-points", "conceptual", SKEW, "The distance between the two points written in the equations was found; the shortest distance is measured along the common perpendicular u × v.", sq(R_(1), dot(w, w))),
    ];
  },
  distractors: (p) => {
    const n = cross(p.slice(0, 3), p.slice(3, 6));
    const t = Math.abs(dot(p.slice(6), n));
    const N = dot(n, n);
    return [sq(R_(t + 1, N), N), rs(R_(t, N)), sq(R_(2 * t, N), N)];
  },
  variants: () => [],
  explain: (s) => (s.id === "normal" ? `The common perpendicular is u × v = ${s.value}` : s.id === "join" ? `The vector joining the given points: B − A = ${s.value}` : `Shortest distance = |(B − A)·(u × v)|/|u × v| = ${Math.abs(Number(s.inputs[0]))}/√${s.inputs[1]} = ${s.value}`),
  domain: [...Array(6).fill([-2, 2]), ...Array(3).fill([-3, 3])] as [number, number][],
  cap: 400,
  difficulty: (p) => {
    const n = cross(p.slice(0, 3), p.slice(3, 6));
    return dot(n, n) <= 6 ? 1 : dot(n, n) <= 20 ? 2 : 3;
  },
  word: (p) => {
    const A = basePt(p);
    return `Two straight pipes in a chemical plant run along ${lineVec(A, p.slice(0, 3))} and ${lineVec(addv(A, p.slice(6)), p.slice(3, 6), "μ")} (units in metres). They do not meet. What is the shortest distance between them?`;
  },
  teach: {
    idea: "The shortest segment joining two skew lines is perpendicular to both, so it runs along u × v. Its length is the projection of any joining vector B − A onto u × v.",
    method: "Work out u × v, then d = |(B − A)·(u × v)| / |u × v|.",
    alternatives: [{ id: "minimise", title: "Minimise the distance", kind: "procedural", text: ["Write general points P = A + λu and Q = B + μv.", "Make PQ perpendicular to both u and v (two equations), solve for λ and μ, and find |PQ|."] }],
  },
  limits: "Skew lines with small whole-number directions and points; parallel lines are a separate family.",
};

const asparl3: Def = {
  id: "asparl3",
  arity: 7,
  title: "The distance between parallel lines in space",
  competency: SKEW,
  type: "exact",
  mc: true,
  // [u₁, u₂, u₃, k, w₁, w₂, w₃]: r = A + λu and r = A + w + μ(k u)
  parse: none,
  reject: (p) => {
    if (!allIn(p, [[-2, 2], [-2, 2], [-2, 2], [-2, 2], [-3, 3], [-3, 3], [-3, 3]])) return "Small whole-number directions and points.";
    const u = p.slice(0, 3);
    if (isZero(u) || p[3] === 0) return "A real direction and a non-zero multiple of it.";
    if (isZero(cross(p.slice(4), u))) return "The lines must not be the same.";
    return null;
  },
  prompt: (p) => {
    const A = basePt(p);
    return `The lines ${lineVec(A, p.slice(0, 3))} and ${lineVec(addv(A, p.slice(4)), scl(p[3], p.slice(0, 3)), "μ")} are parallel. Find the distance between them.`;
  },
  solve: (p) => {
    const u = p.slice(0, 3);
    const w = p.slice(4);
    const c = cross(w, u);
    const M = dot(c, c);
    const U = dot(u, u);
    const ans = sq(R_(1, U), M * U);
    return { steps: [S("cross", "cross", VEC, [P3(w), P3(u)], P3(c)), S("divide", "divide", SKEW, [M, U], ans)], answer: ans };
  },
  // independent: Pythagoras with the projection of B − A on the direction: d² = |w|² − (w·u)²/|u|²
  validate: (p, v) => {
    const d = num1(v);
    if (d === null || d < 0) return false;
    const u = p.slice(0, 3);
    const w = p.slice(4);
    return close(d * d, dot(w, w) - dot(w, u) ** 2 / dot(u, u), 1e-9);
  },
  bugs: (p) => {
    const u = p.slice(0, 3);
    const w = p.slice(4);
    const c = cross(w, u);
    const M = dot(c, c);
    const U = dot(u, u);
    const ku = scl(p[3], u);
    return [
      B("not-divided", "procedural", SKEW, `|(B − A) × u| was not divided by |u| = √${U}.`, U !== 1 ? sq(R_(1), M) : null),
      B("distance-of-points", "conceptual", SKEW, "The distance between the two points written in the equations was found; the gap between parallel lines is measured perpendicular to them.", sq(R_(1), dot(w, w))),
      B("mixed-directions", "procedural", SKEW, `The cross product was taken with one direction (u) but divided by the length of the other (${P3(ku)}).`, Math.abs(p[3]) !== 1 ? sq(R_(1, dot(ku, ku)), M * dot(ku, ku)) : null),
    ];
  },
  distractors: (p) => {
    const u = p.slice(0, 3);
    const c = cross(p.slice(4), u);
    const M = dot(c, c);
    const U = dot(u, u);
    return [sq(R_(1, U), (M + 1) * U), rs(R_(M, U)), sq(R_(2, U), M * U)];
  },
  variants: () => [],
  explain: (s) => (s.id === "cross" ? `(B − A) × u = ${s.value}` : `Distance = |(B − A) × u|/|u| = √${s.inputs[0]}/√${s.inputs[1]} = ${s.value}`),
  domain: [[-2, 2], [-2, 2], [-2, 2], [-2, 2], [-3, 3], [-3, 3], [-3, 3]],
  cap: 400,
  difficulty: (p) => (Math.abs(p[3]) === 1 ? 1 : 2),
  word: (p) => {
    const A = basePt(p);
    return `Two parallel straight rails of an overhead crane run along ${lineVec(A, p.slice(0, 3))} and ${lineVec(addv(A, p.slice(4)), scl(p[3], p.slice(0, 3)), "μ")} (units in metres). How far apart are the rails?`;
  },
  teach: {
    idea: "For parallel lines the perpendicular gap is the height of the parallelogram formed by B − A and the direction u: area |(B − A) × u| divided by the base |u|.",
    method: "Find B − A, compute (B − A) × u, and divide its length by |u|.",
    alternatives: [{ id: "pythagoras", title: "Use Pythagoras", kind: "conceptual", text: ["The part of B − A along the lines has length |(B − A)·u|/|u|.", "The distance is √(|B − A|² − that length²)."] }],
  },
  limits: "Parallel lines with small whole-number directions (the second a multiple of the first) and points.",
};

const NORMALS = [[1, 1, 1], [2, -1, 1], [1, 2, -2], [3, 0, 1], [1, -1, 0], [0, 1, 2], [2, 1, -1], [1, 0, -1], [1, -2, 3], [0, 0, 1], [1, 1, 0], [2, -2, 1]];
const planeTxt = (n: number[], pc: number) => `${poly([[R_(n[0]), "x"], [R_(n[1]), "y"], [R_(n[2]), "z"]])} = ${mi(pc)}`;

const asplaned: Def = {
  id: "asplaned",
  arity: 7,
  title: "The distance from a point to a plane",
  competency: PL,
  type: "exact",
  mc: true,
  // [a, b, c, d, x₀, y₀, z₀]: distance from (x₀, y₀, z₀) to ax + by + cz + d = 0
  parse: none,
  reject: (p) => {
    const [a, b, c, d, x0, y0, z0] = p;
    if (!allIn(p, [[-4, 4], [-4, 4], [-4, 4], [-9, 9], [-4, 4], [-4, 4], [-4, 4]])) return "A plane with small whole-number coefficients and a whole-number point.";
    const first = [a, b, c].find((x) => x !== 0);
    if (first === undefined || first < 0 || gcd3(a, b, c, d) !== 1) return "The plane is written with no common factor and a positive first coefficient.";
    if (a * x0 + b * y0 + c * z0 + d === 0) return "The point is on the plane.";
    return null;
  },
  prompt: ([a, b, c, d, x0, y0, z0]) => `Find the distance of the point ${P3([x0, y0, z0])} from the plane ${lin3(a, b, c, d)}.`,
  solve: ([a, b, c, d, x0, y0, z0]) => {
    const n = a * x0 + b * y0 + c * z0 + d;
    const N = a * a + b * b + c * c;
    const ans = sq(R_(Math.abs(n), N), N);
    return { steps: [S("substitute", "substitute", PL, [x0, y0, z0], n), S("normal", "evaluate", SPC, [N], `√${N}`), S("divide", "divide", PL, [Math.abs(n), N], ans)], answer: ans };
  },
  // independent: three points of the plane and the point form a tetrahedron; distance = 3 × volume ÷ base area
  validate: ([a, b, c, d, x0, y0, z0], v) => {
    const dist = num1(v);
    if (dist === null) return false;
    const n = [a, b, c];
    const i = n.findIndex((x) => x !== 0);
    const pt = (s: number, t: number) => {
      const q = [0, 0, 0];
      const others = [0, 1, 2].filter((j) => j !== i);
      q[others[0]] = s;
      q[others[1]] = t;
      q[i] = (-d - n[others[0]] * s - n[others[1]] * t) / n[i];
      return q;
    };
    const [P1, P2, P3_] = [pt(0, 0), pt(1, 0), pt(0, 1)];
    const cr = cross(sub(P2, P1), sub(P3_, P1));
    const vol6 = Math.abs(dot(cr, sub([x0, y0, z0], P1)));
    return close(vol6 / norm(cr), dist, 1e-9);
  },
  bugs: ([a, b, c, d, x0, y0, z0]) => {
    const n = a * x0 + b * y0 + c * z0 + d;
    const N = a * a + b * b + c * c;
    return [
      B("no-absolute-value", "procedural", PL, "The value of ax₀ + by₀ + cz₀ + d was negative and its sign was kept; a distance is never negative.", n < 0 ? sq(R_(n, N), N) : null),
      B("no-square-root", "recall", PL, `The denominator is √(a² + b² + c²) = √${N}, not ${N}.`, N !== 1 ? rs(R_(Math.abs(n), N)) : null),
      B("constant-left-out", "procedural", PL, `The constant ${mi(d)} was left out when the point was substituted.`, d !== 0 ? sq(R_(Math.abs(n - d), N), N) : null),
    ];
  },
  distractors: ([a, b, c, d, x0, y0, z0]) => {
    const n = Math.abs(a * x0 + b * y0 + c * z0 + d);
    const N = a * a + b * b + c * c;
    return [String(n), sq(R_(n + 1, N), N), rs(R_(n, Math.abs(a) + Math.abs(b) + Math.abs(c)))];
  },
  variants: () => [],
  explain: (s) => (s.id === "substitute" ? `Put the point into ax + by + cz + d: ${s.value}` : s.id === "normal" ? `|n| = √(a² + b² + c²) = ${s.value}` : `Distance = |ax₀ + by₀ + cz₀ + d|/√(a² + b² + c²) = ${s.value}`),
  domain: [[-4, 4], [-4, 4], [-4, 4], [-9, 9], [-4, 4], [-4, 4], [-4, 4]],
  cap: 400,
  difficulty: ([a, b, c]) => (Number.isInteger(Math.sqrt(a * a + b * b + c * c)) ? 1 : 2),
  word: ([a, b, c, d, x0, y0, z0]) => `A lamp hangs at ${P3([x0, y0, z0])} near a sloping glass roof that lies in the plane ${lin3(a, b, c, d)} (units in metres). How far is the lamp from the roof?`,
  teach: {
    idea: "The shortest distance from a point to a plane is along the normal (a, b, c); dividing ax₀ + by₀ + cz₀ + d by |n| measures it in units of length.",
    method: "Substitute the point into ax + by + cz + d, take the absolute value, and divide by √(a² + b² + c²).",
    alternatives: [{ id: "foot", title: "Walk along the normal", kind: "procedural", text: ["The line through the point along (a, b, c) meets the plane at the foot of the perpendicular.", "Find that point, then use the distance formula."] }],
  },
  limits: "Planes with small whole-number coefficients and whole-number points; the vector form r·n = p is the same calculation.",
};

const asmeet: Def = {
  id: "asmeet",
  arity: 8,
  title: "The point where a line meets a plane",
  competency: PL,
  type: "tuple",
  mc: true,
  // [a₁, a₂, a₃, u₁, u₂, u₃, t, i]: line r = a + λu, plane NORMALS[i]·r = NORMALS[i]·(a + t u)
  parse: none,
  reject: (p) => {
    if (!allIn(p, [[-3, 3], [-3, 3], [-3, 3], [-2, 2], [-2, 2], [-2, 2], [-3, 3], [0, 11]])) return "A whole-number line and one of twelve planes.";
    const u = p.slice(3, 6);
    if (isZero(u) || dot(NORMALS[p[7]], u) === 0) return "The line must cross the plane (not be parallel to it).";
    if (p[6] === 0) return "The point given in the line's equation is not the meeting point.";
    return null;
  },
  prompt: (p) => `Find the point where the line ${lineVec(p.slice(0, 3), p.slice(3, 6))} meets the plane ${planeTxt(NORMALS[p[7]], meetP(p))}. Type it as (x, y, z).`,
  solve: (p) => {
    const A = p.slice(0, 3);
    const u = p.slice(3, 6);
    const n = NORMALS[p[7]];
    const P = addv(A, scl(p[6], u));
    return { steps: [S("substitute", "substitute", PL, [dot(n, A), dot(n, u), meetP(p)], `${mi(dot(n, A))} + ${dot(n, u) < 0 ? `(${mi(dot(n, u))})` : dot(n, u)}λ = ${mi(meetP(p))}`), S("lambda", "solve", "MATH.algebra.linear-equations", [dot(n, u)], p[6]), S("point", "substitute", SL, [p[6]], P3(P))], answer: P3(P) };
  },
  // independent: the answer must satisfy the plane's equation and lie on the line ((Q − a) × u = 0)
  validate: (p, v) => {
    const Q = nums(v);
    if (!Q || Q.length !== 3) return false;
    return close(dot(NORMALS[p[7]], Q), meetP(p), 1e-9) && norm(cross(sub(Q, p.slice(0, 3)), p.slice(3, 6))) < 1e-9;
  },
  bugs: (p) => {
    const A = p.slice(0, 3);
    const u = p.slice(3, 6);
    const n = NORMALS[p[7]];
    const lam2 = R_(meetP(p), dot(n, u));
    return [
      B("gave-given-point", "conceptual", PL, "The point written in the line's equation was given; it is not on the plane. Substitute the general point and solve for λ.", P3(A)),
      B("lambda-sign", "procedural", "MATH.algebra.linear-equations", "λ came out with the wrong sign when the linear equation was solved.", P3(sub(A, scl(p[6], u)))),
      B("constant-part-lost", "procedural", PL, "Only the λ terms were substituted into the plane; the constant part n·a was left out.", dot(n, A) !== 0 ? tup(A.map((a, i) => rs(radd(R_(a), rmul(lam2, R_(u[i])))))) : null),
    ];
  },
  distractors: (p) => {
    const P = addv(p.slice(0, 3), scl(p[6], p.slice(3, 6)));
    return [P3(scl(p[6], p.slice(3, 6))), P3(P.map((x, i) => (i === 2 ? x + 1 : x)))];
  },
  variants: () => [],
  explain: (s) => (s.id === "substitute" ? `Put the general point a + λu into the plane: ${s.value}` : s.id === "lambda" ? `Solve: λ = ${s.value}` : `The meeting point is a + ${s.inputs[0]}u = ${s.value}`),
  domain: [[-3, 3], [-3, 3], [-3, 3], [-2, 2], [-2, 2], [-2, 2], [-3, 3], [0, 11]],
  cap: 400,
  difficulty: (p) => (Math.abs(p[6]) === 1 ? 1 : 2),
  word: (p) => `A laser beam travels along ${lineVec(p.slice(0, 3), p.slice(3, 6))} and hits a flat wall in the plane ${planeTxt(NORMALS[p[7]], meetP(p))} (units in metres). Find the point where it hits the wall, typed as (x, y, z).`,
  teach: {
    idea: "Every point of the line is a + λu for some λ; the meeting point is the one whose coordinates also satisfy the plane's equation.",
    method: "Substitute x, y, z of the general point into the plane, solve the linear equation for λ, and put λ back into the line.",
    alternatives: [{ id: "cartesian", title: "Use the Cartesian form", kind: "procedural", text: ["Write the line as (x − a₁)/u₁ = (y − a₂)/u₂ = (z − a₃)/u₃ = λ.", "Then x = a₁ + λu₁ and so on: substitute into the plane."] }],
  },
  limits: "Whole-number lines and twelve fixed plane directions, built so the meeting point has whole-number coordinates.",
};
function meetP(p: number[]) {
  return dot(NORMALS[p[7]], addv(p.slice(0, 3), scl(p[6], p.slice(3, 6))));
}

const asimage: Def = {
  id: "asimage",
  arity: 5,
  title: "The image of a point in a plane",
  competency: PL,
  type: "tuple",
  mc: true,
  // [x, y, z, i, t]: plane n·r = n·P − t|n|², n = NORMALS[i]; foot P − t n, image P − 2t n
  parse: none,
  reject: (p) => (!allIn(p, [[-4, 4], [-4, 4], [-4, 4], [0, 11], [-2, 2]]) || p[4] === 0 ? "A whole-number point off one of twelve planes." : null),
  prompt: (p) => `Find the image (reflection) of the point P${P3(p.slice(0, 3))} in the plane ${planeTxt(NORMALS[p[3]], imgP(p))}. Type it as (x, y, z).`,
  solve: (p) => {
    const P = p.slice(0, 3);
    const n = NORMALS[p[3]];
    const F = sub(P, scl(p[4], n));
    const Q = sub(P, scl(2 * p[4], n));
    return { steps: [S("normal-line", "write", PL, [P3(P), P3(n)], `P + λ(${P3(n)})`), S("foot", "solve", PL, [-p[4]], P3(F)), S("image", "double", PL, [P3(F)], P3(Q))], answer: P3(Q) };
  },
  // independent: the midpoint of P and its image lies on the plane, and the segment is along the normal
  validate: (p, v) => {
    const Q = nums(v);
    if (!Q || Q.length !== 3) return false;
    const P = p.slice(0, 3);
    const n = NORMALS[p[3]];
    const M = scl(0.5, addv(P, Q));
    return !samePts(P, Q) && close(dot(n, M), imgP(p), 1e-9) && norm(cross(sub(Q, P), n)) < 1e-9;
  },
  bugs: (p) => {
    const P = p.slice(0, 3);
    const n = NORMALS[p[3]];
    return [
      B("gave-foot", "conceptual", PL, "The foot of the perpendicular was given; the image is as far beyond the plane as P is in front of it, so go twice as far.", P3(sub(P, scl(p[4], n)))),
      B("wrong-direction", "procedural", PL, "The step along the normal was taken in the wrong direction (away from the plane).", P3(addv(P, scl(2 * p[4], n)))),
    ];
  },
  distractors: (p) => {
    const P = p.slice(0, 3);
    const n = NORMALS[p[3]];
    return [P3(scl(-1, P)), P3(sub(P, scl(4 * p[4], n)))];
  },
  variants: () => [],
  explain: (s) => (s.id === "normal-line" ? `The line through P along the normal: ${s.value}` : s.id === "foot" ? `It meets the plane at λ = ${mi(Number(s.inputs[0]))}: the foot is ${s.value}` : `The foot is the midpoint of P and its image, so the image is ${s.value}`),
  domain: [[-4, 4], [-4, 4], [-4, 4], [0, 11], [-2, 2]],
  cap: 400,
  difficulty: (p) => (NORMALS[p[3]].filter((x) => x !== 0).length === 1 ? 1 : Math.abs(p[4]) === 1 ? 2 : 3),
  word: (p) => `A large flat mirror lies in the plane ${planeTxt(NORMALS[p[3]], imgP(p))} (units in metres). A small lamp is at ${P3(p.slice(0, 3))}. Where does the lamp's mirror image appear? Type it as (x, y, z).`,
  teach: {
    idea: "The image Q of P in a plane is on the normal line through P, the same distance on the other side: the foot of the perpendicular is the midpoint of PQ.",
    method: "Write the line P + λn, find λ where it meets the plane (the foot), then double that λ to reach the image.",
    alternatives: [{ id: "midpoint", title: "Use the midpoint", kind: "procedural", text: ["Let Q = P + λn. The midpoint P + (λ/2)n must satisfy the plane.", "Solve that one equation for λ."] }],
  },
  limits: "Whole-number points and twelve fixed plane directions, built so the image has whole-number coordinates.",
};
function imgP(p: number[]) {
  const n = NORMALS[p[3]];
  return dot(n, p.slice(0, 3)) - p[4] * dot(n, n);
}

// ================================================================ complex numbers

const pairT = (re: R, im: R) => tup([rs(re), rs(im)]);
const ascop: Def = {
  id: "ascop",
  arity: 5,
  title: "Multiplying and dividing complex numbers",
  competency: CX,
  type: "tuple",
  mc: true,
  // [a, b, c, d, op]: (a + bi)(c + di) (op 0) or (a + bi)/(c + di) (op 1)
  parse: none,
  reject: (p) => (!allIn(p, [[-6, 6], [-6, 6], [-6, 6], [-6, 6], [0, 1]]) || p[1] === 0 || p[3] === 0 ? "Two complex numbers with whole-number parts from −6 to 6 and non-zero imaginary parts." : null),
  prompt: ([a, b, c, d, op]) => `Write ${op ? `(${cz(a, b)}) ÷ (${cz(c, d)})` : `(${cz(a, b)})(${cz(c, d)})`} in the form x + iy. Type the answer as the pair (x, y).`,
  solve: ([a, b, c, d, op]) => {
    if (!op) {
      const ans = pairT(R_(a * c - b * d), R_(a * d + b * c));
      return { steps: [S("expand", "multiply", CX, [a * c, a * d, b * c, b * d], `${mi(a * c)} + ${mi(a * d + b * c)}i + ${mi(b * d)}i²`), S("i-squared", "simplify", CX, [b * d], ans)], answer: ans };
    }
    const N = c * c + d * d;
    const ans = pairT(R_(a * c + b * d, N), R_(b * c - a * d, N));
    return { steps: [S("conjugate", "multiply", CX, [cz(c, -d)], `(${cz(a * c + b * d, b * c - a * d)})/${N}`), S("split", "divide", CX, [N], ans)], answer: ans };
  },
  // independent: product via moduli and arguments (multiply lengths, add angles); quotient by multiplying back
  validate: ([a, b, c, d, op], v) => {
    const z = nums(v);
    if (!z || z.length !== 2) return false;
    if (!op) {
      const r = Math.hypot(a, b) * Math.hypot(c, d);
      const t = Math.atan2(b, a) + Math.atan2(d, c);
      return close(z[0], r * Math.cos(t), 1e-9) && close(z[1], r * Math.sin(t), 1e-9);
    }
    const back = cmul(z, [c, d]);
    return close(back[0], a, 1e-9) && close(back[1], b, 1e-9);
  },
  bugs: ([a, b, c, d, op]) => {
    if (!op)
      return [
        B("i-squared-plus", "recall", CX, `i² was taken as +1; i² = −1, so ${mi(b)}i × ${mi(d)}i = ${mi(-b * d)}.`, pairT(R_(a * c + b * d), R_(a * d + b * c))),
        B("parts-only", "conceptual", CX, "Only the real parts and the imaginary parts were multiplied together; every part of one bracket multiplies every part of the other.", pairT(R_(a * c), R_(b * d))),
      ];
    const N = c * c + d * d;
    return [
      B("divide-parts", "conceptual", CX, "The real parts and the imaginary parts were divided separately; multiply the top and bottom by the conjugate of the denominator instead.", c !== 0 ? pairT(R_(a, c), R_(b, d)) : null),
      B("denominator-sign", "procedural", CX, `(c + di)(c − di) = c² + d² = ${N}; it was worked out as c² − d².`, c * c !== d * d ? pairT(R_(a * c + b * d, c * c - d * d), R_(b * c - a * d, c * c - d * d)) : null),
      B("not-conjugate", "procedural", CX, `The top was multiplied by ${cz(c, d)} itself instead of its conjugate ${cz(c, -d)}.`, pairT(R_(a * c - b * d, N), R_(a * d + b * c, N))),
    ];
  },
  distractors: ([a, b, c, d, op]) => (op ? [pairT(R_(b * c - a * d, c * c + d * d), R_(a * c + b * d, c * c + d * d)), pairT(R_(-(a * c + b * d), c * c + d * d), R_(b * c - a * d, c * c + d * d))] : [pairT(R_(a * c - b * d), R_(-(a * d + b * c))), pairT(R_(a * d + b * c), R_(a * c - b * d))]),
  variants: () => [],
  explain: (s) => (s.id === "expand" ? `Multiply every part by every part: ${s.value}` : s.id === "i-squared" ? `Use i² = −1 and collect: ${s.value}` : s.id === "conjugate" ? `Multiply the top and bottom by the conjugate ${s.inputs[0]}: ${s.value}` : `Split into real and imaginary parts: ${s.value}`),
  domain: [[-6, 6], [-6, 6], [-6, 6], [-6, 6], [0, 1]],
  cap: 400,
  difficulty: ([a, b, c, d, op]) => (op === 0 && Math.abs(a * b * c * d) <= 12 ? 1 : op === 0 ? 2 : 3),
  word: ([a, b, c, d, op]) => (op ? `In an AC circuit, the current is I = V/Z. The voltage is V = ${cz(a, b)} volts and the impedance is Z = ${cz(c, d)} ohms (written as complex numbers). Find I in the form x + iy, typed as (x, y).` : `In an AC circuit, the voltage is V = IZ. The current is I = ${cz(a, b)} amperes and the impedance is Z = ${cz(c, d)} ohms (written as complex numbers). Find V in the form x + iy, typed as (x, y).`),
  teach: {
    idea: "Complex numbers multiply like brackets in algebra, with i² = −1. Dividing uses the conjugate: (c + di)(c − di) = c² + d² is real.",
    method: "Product: expand, replace i² by −1, collect real and imaginary parts. Quotient: multiply top and bottom by the conjugate of the bottom, then divide each part by c² + d².",
    alternatives: [{ id: "argand", title: "Turn and stretch in the Argand plane", kind: "conceptual", text: ["Multiplying by c + di stretches by |c + di| and turns by its argument.", "Dividing undoes that: shrink by |c + di| and turn back."] }],
  },
  limits: "Whole-number parts from −6 to 6 with non-zero imaginary parts; powers and square roots are other families.",
};

const ascmod: Def = {
  id: "ascmod",
  arity: 5,
  title: "The modulus of a product or quotient of complex numbers",
  competency: CX,
  type: "exact",
  mc: true,
  // [a, b, c, d, op]: |(a + bi)(c + di)| (op 0) or |(a + bi)/(c + di)| (op 1)
  parse: none,
  reject: (p) => {
    const [a, b, c, d] = p;
    if (!allIn(p, [[-6, 6], [-6, 6], [-6, 6], [-6, 6], [0, 1]])) return "Two complex numbers with whole-number parts from −6 to 6.";
    if ((a === 0 && b === 0) || (c === 0 && d === 0) || (b === 0 && d === 0)) return "Non-zero numbers, not both real.";
    return null;
  },
  prompt: ([a, b, c, d, op]) => `Find |z|, where z = ${op ? `(${cz(a, b)})/(${cz(c, d)})` : `(${cz(a, b)})(${cz(c, d)})`}.`,
  solve: ([a, b, c, d, op]) => {
    const [N1, N2] = [a * a + b * b, c * c + d * d];
    const ans = op ? sq(R_(1, N2), N1 * N2) : sq(R_(1), N1 * N2);
    return { steps: [S("moduli", "evaluate", CX, [N1, N2], `|z₁| = ${sq(R_(1), N1)}, |z₂| = ${sq(R_(1), N2)}`), S("combine", op ? "divide" : "multiply", CX, [op], ans)], answer: ans };
  },
  // independent: work out z itself in the form x + iy, then its length √(x² + y²)
  validate: ([a, b, c, d, op], v) => {
    const m = num1(v);
    if (m === null) return false;
    const z = op ? [(a * c + b * d) / (c * c + d * d), (b * c - a * d) / (c * c + d * d)] : cmul([a, b], [c, d]);
    return close(Math.hypot(z[0], z[1]), m, 1e-9);
  },
  bugs: ([a, b, c, d, op]) => {
    const [N1, N2] = [a * a + b * b, c * c + d * d];
    const [e1, e2] = [E_([1, 1], N1), E_([1, 1], N2)];
    return [
      op
        ? B("subtracted-moduli", "conceptual", CX, "The moduli were subtracted; the modulus of a quotient is the quotient of the moduli: |z₁/z₂| = |z₁|/|z₂|.", ev(e1) - ev(e2) > 1e-9 && e1.m === e2.m ? es({ q: rsub(e1.q, e2.q), m: e1.m }) : null)
        : B("added-moduli", "conceptual", CX, "The moduli were added; the modulus of a product is the product of the moduli: |z₁z₂| = |z₁||z₂|.", esum(e1, e2)),
      B("no-square-root", "procedural", CX, "The squares were not square-rooted: |x + iy| = √(x² + y²).", op ? rs(R_(N1, N2)) : String(N1 * N2)),
      B("parts-added", "recall", CX, "The modulus was taken as the sum of the parts; |x + iy| = √(x² + y²), not x + y.", op ? null : String(Math.abs(a * c - b * d) + Math.abs(a * d + b * c))),
    ];
  },
  distractors: ([a, b, c, d, op]) => {
    const [N1, N2] = [a * a + b * b, c * c + d * d];
    return op ? [sq(R_(1, N1), N1 * N2), sq(R_(1, N2), N1 + N2), sq(R_(2, N2), N1 * N2)] : [sq(R_(1), N1 + N2), sq(R_(2), N1 * N2), sq(R_(1), N1 * N2 + 1)];
  },
  variants: () => [],
  explain: (s) => (s.id === "moduli" ? `The moduli: ${s.value}` : s.inputs[0] ? `|z₁/z₂| = |z₁|/|z₂| = ${s.value}` : `|z₁z₂| = |z₁||z₂| = ${s.value}`),
  domain: [[-6, 6], [-6, 6], [-6, 6], [-6, 6], [0, 1]],
  cap: 400,
  difficulty: ([a, b, c, d]) => ([a, b, c, d].filter((x) => x === 0).length >= 1 ? 1 : 2),
  word: ([a, b, c, d, op]) => (op ? `In an AC circuit the current is I = V/Z, with V = ${cz(a, b)} volts and Z = ${cz(c, d)} ohms. Find the size of the current, |I|, in amperes.` : `In an AC circuit the voltage is V = IZ, with I = ${cz(a, b)} amperes and Z = ${cz(c, d)} ohms. Find the size of the voltage, |V|, in volts.`),
  teach: {
    idea: "The modulus is the distance from the origin in the Argand plane. Moduli multiply and divide: |z₁z₂| = |z₁||z₂| and |z₁/z₂| = |z₁|/|z₂|.",
    method: "Find |z₁| = √(a² + b²) and |z₂| = √(c² + d²), then multiply or divide them and simplify the surd.",
    alternatives: [{ id: "multiply_out", title: "Multiply out first", kind: "procedural", text: ["Work out z in the form x + iy.", "Then |z| = √(x² + y²): the same answer, with more arithmetic."] }],
  },
  limits: "Whole-number parts from −6 to 6; the triangle inequality and conjugate properties are not asked here.",
};

const IPOW = ["1", "i", "−1", "−i"];
const ascpow: Def = {
  id: "ascpow",
  arity: 1,
  title: "Powers of i",
  competency: CX,
  type: "choice",
  parse: (t) => {
    const m = t.replace(/\s/g, "").match(/^(?:simplify)?i\^\(?(-?\d{1,3})\)?$/i);
    return m ? [Number(m[1])] : null;
  },
  reject: ([n]) => (!inR(n, -60, 200) || (n >= 0 && n <= 4) ? "A power of i from i⁻⁶⁰ to i²⁰⁰ (not the first few)." : null),
  prompt: ([n]) => `Simplify i${sup(n)}.`,
  choices: () => IPOW,
  solve: ([n]) => {
    const r = ((n % 4) + 4) % 4;
    return { steps: [S("remainder", "divide", CX, [n, 4], r), S("cycle", "recall", CX, [r], r)], answer: r };
  },
  // independent: multiply by i (or by −i for negative powers) one step at a time
  validate: ([n], v) => {
    let z = [1, 0];
    for (let k = 0; k < Math.abs(n); k++) z = cmul(z, n > 0 ? [0, 1] : [0, -1]);
    const vals = [[1, 0], [0, 1], [-1, 0], [0, -1]];
    return typeof v === "number" && !!vals[v] && vals[v][0] === z[0] && vals[v][1] === z[1];
  },
  bugs: ([n]) => {
    const r = ((n % 4) + 4) % 4;
    const out: Bug[] = [];
    if (n < 0) {
      const rp = Math.abs(n) % 4;
      if (rp !== r) out.push(B("negative-power", "conceptual", CX, `i${sup(n)} = 1/i${sup(-n)}, which is not the same as i${sup(-n)}; for a negative power, use the remainder of ${mi(n)} on division by 4 (it is ${r}), or 1/i = −i.`, rp));
    }
    const two = n % 2 === 0 ? 2 : 1;
    if (two !== r) out.push(B("cycle-of-two", "recall", CX, "The powers of i repeat every 4, not every 2: i, −1, −i, 1, i, …", two));
    return out;
  },
  variants: () => [],
  explain: (s) => (s.id === "remainder" ? `${mi(Number(s.inputs[0]))} = 4 × ${Math.floor(Number(s.inputs[0]) / 4) < 0 ? `(${mi(Math.floor(Number(s.inputs[0]) / 4))})` : Math.floor(Number(s.inputs[0]) / 4)} + ${s.value}: the remainder is ${s.value}` : `The powers repeat every 4, so i${sup(Number(s.inputs[0]))} = ${IPOW[Number(s.value)]}`),
  domain: [[-60, 200]],
  difficulty: ([n]) => (n > 0 && n <= 40 ? 1 : n > 0 ? 2 : 3),
  teach: {
    idea: "i¹ = i, i² = −1, i³ = −i, i⁴ = 1, and then the pattern repeats, so only the remainder of the power on division by 4 matters.",
    method: "Divide the power by 4 and keep the remainder r (from 0 to 3, also for negative powers); then iⁿ = iʳ.",
    alternatives: [{ id: "quarter_turns", title: "Quarter turns", kind: "conceptual", text: ["Multiplying by i turns a point a quarter turn anticlockwise about the origin.", "Four quarter turns bring you back to the start, so count only the leftover turns."] }],
  },
  limits: "Single powers of i from i⁻⁶⁰ to i²⁰⁰; sums of powers are not included.",
};

const ascsqrt: Def = {
  id: "ascsqrt",
  arity: 2,
  title: "The square root of a complex number",
  competency: CX,
  type: "tuple",
  mc: true,
  // [p, q]: the square root p + qi of (p² − q²) + 2pq i, with p > 0
  parse: none,
  reject: (pp) => (!allIn(pp, [[1, 8], [-8, 8]]) || pp[1] === 0 ? "A whole-number root p + qi with p from 1 to 8 and q non-zero." : null),
  prompt: ([p, q]) => `Find the square root of ${cz(p * p - q * q, 2 * p * q)} that has a positive real part. Type it as (x, y) for x + iy.`,
  solve: ([p, q]) => {
    const X = p * p - q * q;
    const Y = 2 * p * q;
    const M = p * p + q * q;
    return { steps: [S("modulus", "evaluate", CX, [X, Y], M), S("real", "solve", CX, [M, X], p), S("imag", "divide", CX, [Y, 2 * p], q)], answer: P2(p, q) };
  },
  // independent: square the answer back and check its real part is positive
  validate: ([p, q], v) => {
    const z = nums(v);
    if (!z || z.length !== 2 || z[0] <= 0) return false;
    const s = cmul(z, z);
    return close(s[0], p * p - q * q, 1e-9) && close(s[1], 2 * p * q, 1e-9);
  },
  bugs: ([p, q]) => [
    B("imaginary-sign", "procedural", CX, `The sign of the imaginary part must match the sign of ${2 * p * q} = 2xy; with x positive, y has the sign of the imaginary part of the number.`, P2(p, -q)),
    B("parts-swapped", "procedural", CX, "x and y were swapped: x² − y² must equal the real part.", q > 0 && q !== p ? P2(q, p) : null),
    B("other-root", "procedural", CX, "This is the other square root; the question asks for the one with a positive real part.", P2(-p, -q)),
  ],
  distractors: ([p, q]) => [P2(p + 1, q), P2(p, q + (q > 0 ? 1 : -1))],
  variants: () => [],
  explain: (s) => (s.id === "modulus" ? `|z| = √(${mi(Number(s.inputs[0]))}² + ${mi(Number(s.inputs[1]))}²) = ${s.value}` : s.id === "real" ? `x² = (|z| + real part)/2 = (${s.inputs[0]} + ${mi(Number(s.inputs[1]))})/2, so x = ${s.value}` : `y = (imaginary part)/(2x) = ${mi(Number(s.inputs[0]))}/${s.inputs[1]} = ${mi(Number(s.value))}`),
  domain: [[1, 8], [-8, 8]],
  difficulty: ([p, q]) => (p + Math.abs(q) <= 5 ? 1 : p + Math.abs(q) <= 9 ? 2 : 3),
  teach: {
    idea: "If (x + iy)² = a + bi, then x² − y² = a and 2xy = b; also x² + y² = |a + bi|. Adding and subtracting gives x² and y².",
    method: "Find |a + bi|. Then x² = (|z| + a)/2 and y² = (|z| − a)/2; choose x > 0 and give y the sign that makes 2xy = b.",
    alternatives: [{ id: "guess_check", title: "Solve the two equations", kind: "procedural", text: ["Write x² − y² = a and xy = b/2.", "Try whole-number pairs with xy = b/2 until x² − y² = a."] }],
  },
  limits: "Numbers whose square roots have whole-number parts.",
};

// ---- argument and polar form
/** The special angles kπ (−1 < k ≤ 1, k ≠ 0) and the parts of cos + i sin as [coefficient, radicand] for scale 1. */
const ANG: { k: R; re: [number, number]; im: [number, number]; mod: E }[] = [
  [1, 6, 1, 3, 1, 1], [-1, 6, 1, 3, -1, 1], [5, 6, -1, 3, 1, 1], [-5, 6, -1, 3, -1, 1],
  [1, 3, 1, 1, 1, 3], [-1, 3, 1, 1, -1, 3], [2, 3, -1, 1, 1, 3], [-2, 3, -1, 1, -1, 3],
  [1, 4, 1, 1, 1, 1], [-1, 4, 1, 1, -1, 1], [3, 4, -1, 1, 1, 1], [-3, 4, -1, 1, -1, 1],
  [1, 2, 0, 1, 1, 1], [-1, 2, 0, 1, -1, 1], [1, 1, -1, 1, 0, 1],
].map(([n, d, rc, rr, ic, ir]) => ({ k: R_(n, d), re: [rc, rr] as [number, number], im: [ic, ir] as [number, number], mod: d === 6 || d === 3 ? E_([2, 1]) : d === 4 ? E_([1, 1], 2) : E_([1, 1]) }));

const asarg: Def = {
  id: "asarg",
  arity: 2,
  title: "The principal argument of a complex number",
  competency: POLAR,
  type: "exact",
  mc: true,
  // [j, s]: z = s × (the j-th special point)
  parse: none,
  reject: (p) => (!allIn(p, [[0, 14], [1, 9]]) ? "A complex number at a special angle, scaled by 1 to 9." : null),
  prompt: ([j, s]) => `Find the principal argument θ (−π < θ ≤ π) of z = ${argZ(j, s)}. Type the number k with θ = kπ (for example, type −1/4 for θ = −π/4).`,
  solve: ([j, s]) => {
    const A = ANG[j];
    const basic = argBasic(A.k);
    return { steps: [S("modulus", "evaluate", CX, [argZ(j, s)], es(emul(A.mod, E_([s, 1])))), S("basic", "evaluate", TRIG, [rs(basic)], piStr(basic)), S("quadrant", "adjust", POLAR, [A.re[0], A.im[0]], piStr(A.k))], answer: rs(A.k) };
  },
  // independent: r cos(kπ) and r sin(kπ) must give back the real and imaginary parts, with −1 < k ≤ 1
  validate: ([j, s], v) => {
    const k = num1(v);
    if (k === null || k <= -1 || k > 1) return false;
    const A = ANG[j];
    const x = s * A.re[0] * Math.sqrt(A.re[1]);
    const y = s * A.im[0] * Math.sqrt(A.im[1]);
    const r = Math.hypot(x, y);
    return close(r * Math.cos(k * Math.PI), x, 1e-9) && close(r * Math.sin(k * Math.PI), y, 1e-9);
  },
  bugs: ([j]) => {
    const A = ANG[j];
    const k = A.k;
    const basic = argBasic(k);
    const x = A.re[0];
    const y = A.im[0];
    return [
      B("basic-angle-only", "conceptual", POLAR, `The acute angle α with tan α = |y/x| was given; z is not in the first quadrant, so the argument is found from α using the signs of x and y.`, rs(basic)),
      B("arctan-quadrant", "conceptual", POLAR, "tan⁻¹(y/x) only gives angles between −π/2 and π/2; when the real part is negative, add or subtract π.", x < 0 ? rs(y > 0 ? rsub(k, R_(1)) : y < 0 ? radd(k, R_(1)) : R_(0)) : null),
      B("not-principal", "procedural", POLAR, "The angle was measured from 0 to 2π; the principal argument lies in (−π, π], so subtract 2π.", k[0] < 0 ? rs(radd(k, R_(2))) : null),
    ];
  },
  distractors: ([j]) => {
    const k = ANG[j].k;
    return [rs([-k[0], k[1]]), rs(rsub(R_(1, 2), k)), rs(R_(k[0], 2 * k[1]))];
  },
  variants: () => [],
  explain: (s) => (s.id === "modulus" ? `|z| = ${s.value}` : s.id === "basic" ? `The acute angle α with tan α = |y/x| is ${s.value}` : `Use the quadrant (signs of the parts): θ = ${s.value}`),
  domain: [[0, 14], [1, 9]],
  difficulty: ([j]) => {
    const k = ANG[j].k;
    return k[0] > 0 && rv(k) <= 0.5 ? 1 : k[1] === 2 || k[1] === 1 ? 2 : 3;
  },
  teach: {
    idea: "The argument is the angle from the positive real axis to the point z in the Argand plane; the principal argument is the one in (−π, π].",
    method: "Find the acute angle α with tan α = |y/x|. Then use the quadrant: first α, second π − α, third −(π − α), fourth −α.",
    alternatives: [{ id: "sketch", title: "Sketch the point", kind: "conceptual", text: ["Plot z in the Argand plane and mark the angle from the positive real axis.", "Anticlockwise angles are positive, clockwise ones negative; choose the one between −π and π."], visual: ([j, s]) => ({ type: "plane", points: [[s * ANG[j].re[0] * Math.sqrt(ANG[j].re[1]), s * ANG[j].im[0] * Math.sqrt(ANG[j].im[1]), "z"]], segments: [[[0, 0], [s * ANG[j].re[0] * Math.sqrt(ANG[j].re[1]), s * ANG[j].im[0] * Math.sqrt(ANG[j].im[1])]]] }) }],
  },
  limits: "Numbers at the special angles (multiples of π/6 and π/4, and the axes), scaled by 1 to 9; the answer is k in θ = kπ.",
};
function argZ(j: number, s: number) {
  const A = ANG[j];
  return czs(A.re[0] * s, A.re[1], A.im[0] * s, A.im[1]);
}
function argBasic(k: R): R {
  const a = rabs(k);
  return rv(a) <= 0.5 ? a : rsub(R_(1), a);
}

/** k (in sixths) reduced to the principal range (−6, 6]. */
const prin6 = (s: number) => {
  let t = s;
  while (t > 6) t -= 12;
  while (t <= -6) t += 12;
  return t;
};
const polarTxt = (r: number, a: number) => {
  const ang = piStr(R_(a, 6));
  return `${r === 1 ? "" : r}(cos ${ang} + i sin ${ang})`;
};
const aspolm: Def = {
  id: "aspolm",
  arity: 5,
  title: "Multiplying and dividing in polar form",
  competency: POLAR,
  type: "tuple",
  mc: true,
  // [r₁, a₁, r₂, a₂, op]: z₁ = r₁ cis(a₁π/6), z₂ = r₂ cis(a₂π/6); op 0 product, 1 quotient
  parse: none,
  reject: (p) => (!allIn(p, [[1, 6], [-5, 6], [1, 6], [-5, 6], [0, 1]]) || p[1] === 0 || p[3] === 0 ? "Moduli 1 to 6 and arguments that are non-zero multiples of π/6 in (−π, π]." : null),
  prompt: ([r1, a1, r2, a2, op]) => `z₁ = ${polarTxt(r1, a1)} and z₂ = ${polarTxt(r2, a2)}. Find ${op ? "z₁/z₂" : "z₁z₂"} in polar form. Type the pair (r, k), where r is its modulus and kπ its principal argument (−π < kπ ≤ π).`,
  solve: ([r1, a1, r2, a2, op]) => {
    const r = op ? R_(r1, r2) : R_(r1 * r2);
    const raw = op ? a1 - a2 : a1 + a2;
    const k = R_(prin6(raw), 6);
    return { steps: [S("modulus", op ? "divide" : "multiply", POLAR, [r1, r2], rs(r)), S("argument", op ? "subtract" : "add", POLAR, [rs(R_(raw, 6))], piStr(R_(raw, 6))), S("principal", "adjust", POLAR, [rs(R_(raw, 6))], piStr(k))], answer: tup([rs(r), rs(k)]) };
  },
  // independent: multiply or divide the numbers in the form x + iy, then compare with r(cos kπ + i sin kπ)
  validate: ([r1, a1, r2, a2, op], v) => {
    const t = nums(v);
    if (!t || t.length !== 2 || t[1] <= -1 || t[1] > 1 || t[0] <= 0) return false;
    const z1 = [r1 * Math.cos((a1 * Math.PI) / 6), r1 * Math.sin((a1 * Math.PI) / 6)];
    const z2 = [r2 * Math.cos((a2 * Math.PI) / 6), r2 * Math.sin((a2 * Math.PI) / 6)];
    const w = op ? cmul(z1, [z2[0] / (r2 * r2), -z2[1] / (r2 * r2)]) : cmul(z1, z2);
    return close(t[0] * Math.cos(t[1] * Math.PI), w[0], 1e-9) && close(t[0] * Math.sin(t[1] * Math.PI), w[1], 1e-9);
  },
  bugs: ([r1, a1, r2, a2, op]) => {
    const r = op ? R_(r1, r2) : R_(r1 * r2);
    const raw = op ? a1 - a2 : a1 + a2;
    const mk = (rr: R, kk: R) => tup([rs(rr), rs(kk)]);
    const red = (k: R) => {
      let x = k;
      while (rv(x) > 1) x = rsub(x, R_(2));
      while (rv(x) <= -1) x = radd(x, R_(2));
      return x;
    };
    return [
      B("arguments-multiplied", "conceptual", POLAR, `The arguments were ${op ? "divided" : "multiplied"} like the moduli; when complex numbers are ${op ? "divided, arguments are subtracted" : "multiplied, arguments are added"}.`, op ? null : mk(r, red(R_(a1 * a2, 36)))),
      op
        ? B("subtracted-wrong-way", "procedural", POLAR, "The arguments were subtracted the wrong way round: arg(z₁/z₂) = arg z₁ − arg z₂.", mk(r, R_(prin6(a2 - a1), 6)))
        : B("added-moduli", "conceptual", POLAR, "The moduli were added; moduli multiply: |z₁z₂| = |z₁||z₂|.", mk(R_(r1 + r2), R_(prin6(raw), 6))),
      B("not-principal", "procedural", POLAR, "The argument was not brought into (−π, π]; add or subtract 2π.", raw > 6 || raw <= -6 ? mk(r, R_(raw, 6)) : null),
    ];
  },
  distractors: ([r1, a1, r2, a2, op]) => {
    const r = op ? R_(r1, r2) : R_(r1 * r2);
    const k = R_(prin6(op ? a1 - a2 : a1 + a2), 6);
    const s6 = prin6(op ? a1 - a2 : a1 + a2);
    return [tup([rs(r), rs(k[0] === k[1] ? R_(1, 2) : [-k[0], k[1]])]), tup([rs(op ? R_(r2, r1) : R_(r1 * r2 + 1)), rs(k)]), tup([rs(radd(r, R_(1))), rs(k)]), tup([rs(r), rs(R_(prin6(s6 + 2), 6))]), tup([rs(r), rs(R_(prin6(s6 - 3), 6))])];
  },
  variants: () => [],
  explain: (s) => (s.id === "modulus" ? `${s.op === "divide" ? "Divide" : "Multiply"} the moduli: ${s.value}` : s.id === "argument" ? `${s.op === "subtract" ? "Subtract" : "Add"} the arguments: ${s.value}` : `The principal argument (add or subtract 2π if needed): ${s.value}`),
  domain: [[1, 6], [-5, 6], [1, 6], [-5, 6], [0, 1]],
  cap: 400,
  difficulty: ([, a1, , a2, op]) => {
    const raw = op ? a1 - a2 : a1 + a2;
    return raw > 6 || raw <= -6 ? 3 : op ? 2 : 1;
  },
  teach: {
    idea: "In polar form, multiplying complex numbers multiplies their moduli and adds their arguments; dividing divides the moduli and subtracts the arguments.",
    method: "Multiply (or divide) r₁ and r₂, add (or subtract) the arguments, and bring the result into (−π, π] by adding or subtracting 2π.",
    alternatives: [{ id: "rotations", title: "Stretch and turn", kind: "conceptual", text: ["Multiplying by z₂ stretches by r₂ and turns by arg z₂.", "So the turns add up and the stretches multiply."] }],
  },
  limits: "Moduli 1 to 6 and arguments that are multiples of π/6.",
};

// ---- circles in the Argand plane
const zminus = (a: number, b: number) => (a === 0 && b === 0 ? "|z|" : `|z − (${cz(a, b)})|`);
const ascloc: Def = {
  id: "ascloc",
  arity: 6,
  title: "The circle described by a condition on |z|",
  competency: CLOC,
  type: "tuple",
  mc: true,
  // [t, a, b, c, d, k]: t 0: |z − (a + bi)| = k|z − (c + di)|; t 1: |kz − (a + bi)| = c (d unused, 0)
  parse: none,
  reject: (p) => {
    const [t, a, b, c, d] = p;
    if (!allIn(p, [[0, 1], [-5, 5], [-5, 5], [-5, 5], [-5, 5], [2, 3]])) return "Whole-number points from −5 to 5 and k = 2 or 3.";
    if (t === 0 && a === c && b === d) return "Two different points.";
    if (t === 1 && (d !== 0 || c < 1)) return "A positive whole-number radius.";
    return null;
  },
  prompt: (p) => `In the Argand plane, the points z with ${clocCond(p)} form a circle. Find its centre x₀ + iy₀ and its radius r. Type them as (x₀, y₀, r).`,
  solve: (p) => {
    const [t, a, b, c, d, k] = p;
    if (t === 1) {
      const ans = tup([rs(R_(a, k)), rs(R_(b, k)), rs(R_(c, k))]);
      return { steps: [S("divide", "divide", CLOC, [k], `|z − (${cz(a, b)})/${k}| = ${c}/${k}`), S("read", "read", CLOC, [], ans)], answer: ans };
    }
    const K = k * k - 1;
    const N = (a - c) ** 2 + (b - d) ** 2;
    const ans = tup([rs(R_(k * k * c - a, K)), rs(R_(k * k * d - b, K)), sq(R_(k, K), N)]);
    return { steps: [S("square", "square", LOCUS, [k * k], `|z − z₁|² = ${k * k}|z − z₂|²`), S("expand", "expand", CLOC, [K], `${circ(apo(a, b, c, d, k * k))} = 0`), S("complete", "complete-square", CONIC, [], ans)], answer: ans };
  },
  // independent: points on the claimed circle (centre + r(cos φ, sin φ)) must all satisfy the condition on z
  validate: (p, v) => {
    const s = nums(v);
    if (!s || s.length !== 3 || s[2] <= 0) return false;
    const [t, a, b, c, d, k] = p;
    return [0, 0.7, 1.9, 2.6, 3.3, 4.4, 5.1, 5.9].every((ph) => {
      const x = s[0] + s[2] * Math.cos(ph);
      const y = s[1] + s[2] * Math.sin(ph);
      return t === 1 ? close(Math.hypot(k * x - a, k * y - b), c, 1e-8) : close(Math.hypot(x - a, y - b), k * Math.hypot(x - c, y - d), 1e-8);
    });
  },
  bugs: (p) => {
    const [t, a, b, c, d, k] = p;
    if (t === 1)
      return [
        B("not-divided", "procedural", CLOC, `|${k}z − w| = ${c} means ${k}|z − w/${k}| = ${c}; both the centre and the radius must be divided by ${k}.`, tup([mi(a), mi(b), String(c)])),
        B("radius-not-divided", "procedural", CLOC, `The centre was divided by ${k} but the radius was not: the radius is ${c}/${k}.`, tup([rs(R_(a, k)), rs(R_(b, k)), String(c)])),
        B("centre-sign", "conceptual", CLOC, "|z − w| = r has centre w (not −w): read the centre with the sign it has after the minus.", a !== 0 || b !== 0 ? tup([rs(R_(-a, k)), rs(R_(-b, k)), rs(R_(c, k))]) : null),
      ];
    const N = (a - c) ** 2 + (b - d) ** 2;
    return [
      B("ratio-not-squared", "procedural", LOCUS, `When |z − z₁| = ${k}|z − z₂| was squared, ${k} was not squared: it becomes ${k * k}|z − z₂|².`, tup([rs(R_(k * c - a, k - 1)), rs(R_(k * d - b, k - 1)), sq(R_(k, k - 1), N)])),
      B("centre-at-z1", "conceptual", CLOC, `The circle was taken as centred at ${cz(a, b)} with radius ${k}; with a ratio of two distances, expand the condition to find the centre.`, tup([mi(a), mi(b), String(k)])),
    ];
  },
  distractors: (p) => {
    const s = nums(aslocAns(p))!;
    return [tup([s[1], s[0], s[2]].map((x, i) => (i < 2 ? rs(R_(Math.round(x * 24), 24)) : aslocAns(p).split(", ")[2].replace(/\)$/, "")))), tup([rs(R_(Math.round(-s[0] * 24), 24)), rs(R_(Math.round(-s[1] * 24), 24)), aslocAns(p).split(", ")[2].replace(/\)$/, "")])];
  },
  variants: () => [],
  explain: (s) => (s.id === "divide" ? `Divide by ${s.inputs[0]}: ${s.value}` : s.id === "read" ? `|z − w| = r is the circle with centre w and radius r: ${s.value}` : s.id === "square" ? `Write z = x + iy and square: ${s.value}` : s.id === "expand" ? `Expand and divide by ${s.inputs[0]}: ${s.value}` : `Complete the squares to read the centre and radius: ${s.value}`),
  domain: [[0, 1], [-5, 5], [-5, 5], [-5, 5], [-5, 5], [2, 3]],
  cap: 400,
  difficulty: ([t, a, b, , , k]) => (t === 1 ? ((a % k === 0 && b % k === 0) ? 1 : 2) : 3),
  teach: {
    idea: "|z − w| is the distance from z to w in the Argand plane, so |z − w| = r is a circle with centre w and radius r. A ratio of distances (not 1) is also a circle.",
    method: "Write the condition with |z − w| alone: divide out a factor of z first. For |z − z₁| = k|z − z₂|, put z = x + iy, square, expand, and complete the squares.",
    alternatives: [{ id: "distance_picture", title: "Read it as a distance", kind: "conceptual", text: ["|kz − w| = r means k·|z − w/k| = r.", "So z is always r/k away from w/k: that is a circle."] }],
  },
  limits: "Circles from |kz − w| = r and from a ratio 2 or 3 of distances; straight-line loci (perpendicular bisectors) and regions are not included.",
};
function clocCond([t, a, b, c, d, k]: number[]) {
  if (t === 1) return `|${k}z${a === 0 && b === 0 ? "" : ` − (${cz(a, b)})`}| = ${c}`;
  return `${zminus(a, b)} = ${k}${zminus(c, d)}`;
}
function aslocAns(p: number[]) {
  return ascloc.solve(p).answer as string;
}

// ---- de Moivre and nth roots
/** cos and sin of kπ for k a multiple of 1/4 or 1/6, exactly. */
function trigE(k: R): [E, E] {
  const deg = (((Math.round((180 * k[0]) / k[1]) % 360) + 360) % 360);
  const T: Record<number, [number, number, number, number, number, number]> = {
    0: [1, 1, 1, 0, 1, 1], 30: [1, 2, 3, 1, 2, 1], 45: [1, 2, 2, 1, 2, 2], 60: [1, 2, 1, 1, 2, 3], 90: [0, 1, 1, 1, 1, 1], 120: [-1, 2, 1, 1, 2, 3], 135: [-1, 2, 2, 1, 2, 2], 150: [-1, 2, 3, 1, 2, 1],
    180: [-1, 1, 1, 0, 1, 1], 210: [-1, 2, 3, -1, 2, 1], 225: [-1, 2, 2, -1, 2, 2], 240: [-1, 2, 1, -1, 2, 3], 270: [0, 1, 1, -1, 1, 1], 300: [1, 2, 1, -1, 2, 3], 315: [1, 2, 2, -1, 2, 2], 330: [1, 2, 3, -1, 2, 1],
  };
  const t = T[deg];
  if (!t) throw new Error(`no exact value for ${deg}°`);
  return [E_(R_(t[0], t[1]), t[2]), E_(R_(t[3], t[4]), t[5])];
}
/** Bases for de Moivre: [real part, imaginary part] as [coefficient, radicand], and their argument. */
const DMB: { re: [number, number]; im: [number, number]; k: R; mod: E }[] = [
  [1, 1, 1, 1, 1, 4], [1, 1, -1, 1, -1, 4], [-1, 1, 1, 1, 3, 4], [-1, 1, -1, 1, -3, 4],
  [1, 3, 1, 1, 1, 6], [1, 3, -1, 1, -1, 6], [-1, 3, 1, 1, 5, 6], [1, 1, 1, 3, 1, 3], [1, 1, -1, 3, -1, 3], [-1, 1, 1, 3, 2, 3],
].map(([rc, rr, ic, ir, n, d]) => ({ re: [rc, rr] as [number, number], im: [ic, ir] as [number, number], k: R_(n, d), mod: d === 4 ? E_([1, 1], 2) : E_([2, 1]) }));

const asdemo: Def = {
  id: "asdemo",
  arity: 2,
  title: "Powers of a complex number by de Moivre's theorem",
  competency: DM,
  type: "tuple",
  mc: true,
  // [j, n]: (base j)ⁿ
  parse: none,
  reject: (p) => (!allIn(p, [[0, 9], [2, 12]]) ? "One of ten bases such as 1 + i or √3 + i, to a power from 2 to 12." : null),
  prompt: ([j, n]) => `Use de Moivre's theorem to write (${dmBase(j)})${sup(n)} in the form x + iy. Type the answer as (x, y).`,
  solve: ([j, n]) => {
    const b = DMB[j];
    const R = epow(b.mod, n);
    const nk = rmul(b.k, R_(n));
    const [c, s] = trigE(nk);
    const ans = tup([es(emul(R, c)), es(emul(R, s))]);
    return { steps: [S("polar", "convert", POLAR, [es(b.mod), rs(b.k)], `${es(b.mod)}(cos ${piStr(b.k)} + i sin ${piStr(b.k)})`), S("power", "power", DM, [n, es(R)], `${es(R)}(cos ${piStr(nk)} + i sin ${piStr(nk)})`), S("evaluate", "evaluate", TRIG, [piStr(nk)], ans)], answer: ans };
  },
  // independent: multiply the base by itself n times in the form x + iy (floating point)
  validate: ([j, n], v) => {
    const t = nums(v);
    if (!t || t.length !== 2) return false;
    const b = DMB[j];
    const z0 = [b.re[0] * Math.sqrt(b.re[1]), b.im[0] * Math.sqrt(b.im[1])];
    let z = [1, 0];
    for (let i = 0; i < n; i++) z = cmul(z, z0);
    const scale = Math.max(1, Math.hypot(z[0], z[1]));
    return Math.abs(t[0] - z[0]) <= 1e-9 * scale && Math.abs(t[1] - z[1]) <= 1e-9 * scale;
  },
  bugs: ([j, n]) => {
    const b = DMB[j];
    const R = epow(b.mod, n);
    const nk = rmul(b.k, R_(n));
    const [c, s] = trigE(nk);
    const [c1, s1] = trigE(b.k);
    const reE = E_(R_(b.re[0]), b.re[1]);
    const imE = E_(R_(b.im[0]), b.im[1]);
    return [
      B("modulus-not-raised", "procedural", DM, `The modulus ${es(b.mod)} must also be raised to the power ${n}: (r(cos θ + i sin θ))ⁿ = rⁿ(cos nθ + i sin nθ).`, tup([es(c), es(s)])),
      B("parts-raised", "conceptual", DM, "Each part was raised to the power separately; (x + iy)ⁿ is not xⁿ + iⁿyⁿ. Use the polar form.", tup([es(epow(reE, n)), es(epow(imE, n))])),
      B("angle-not-multiplied", "procedural", DM, `The argument must be multiplied by ${n} as well: cos ${n}θ + i sin ${n}θ.`, tup([es(emul(R, c1)), es(emul(R, s1))])),
    ];
  },
  distractors: ([j, n]) => {
    const b = DMB[j];
    const R = epow(b.mod, n);
    const [c, s] = trigE(rmul(b.k, R_(n)));
    return [tup([es(emul(R, s)), es(emul(R, c))]), tup([es(emul(R, c)), es(emul(E_([-1, 1]), emul(R, s)))]), tup([es(emul(R, emul(E_([-1, 1]), c))), es(emul(R, s))])];
  },
  variants: () => [],
  explain: (s) => (s.id === "polar" ? `In polar form the base is ${s.value}` : s.id === "power" ? `De Moivre: raise the modulus to the power ${s.inputs[0]} and multiply the argument by ${s.inputs[0]}: ${s.value}` : `Evaluate cos and sin of ${s.inputs[0]}: ${s.value}`),
  domain: [[0, 9], [2, 12]],
  difficulty: ([j, n]) => (j < 4 && n <= 6 ? 1 : n <= 6 ? 2 : 3),
  teach: {
    idea: "In polar form, raising to a power raises the modulus to that power and multiplies the argument: (r(cos θ + i sin θ))ⁿ = rⁿ(cos nθ + i sin nθ).",
    method: "Write the base as r(cos θ + i sin θ), apply de Moivre's theorem, then evaluate cos nθ and sin nθ exactly.",
    alternatives: [{ id: "repeat_square", title: "Square repeatedly", kind: "procedural", text: ["(1 + i)² = 2i, so (1 + i)⁸ = (2i)⁴ = 16.", "Squaring first keeps the arithmetic small, but de Moivre's theorem is quicker for large powers."] }],
  },
  limits: "Ten bases with arguments that are multiples of π/4 or π/6 and modulus √2 or 2, to powers from 2 to 12.",
};
function dmBase(j: number) {
  const b = DMB[j];
  return czs(b.re[0], b.re[1], b.im[0], b.im[1]);
}

const asroot: Def = {
  id: "asroot",
  arity: 3,
  title: "The nth roots of a complex number",
  competency: DM,
  type: "set",
  // [n, f, ρ]: zⁿ = ρⁿ (cos fπ/4 + i sin fπ/4)
  parse: none,
  reject: (p) => (!allIn(p, [[2, 6], [0, 7], [1, 3]]) ? "zⁿ = w with n from 2 to 6, w at a multiple of π/4, and roots of modulus 1 to 3." : null),
  prompt: ([n, f, rho]) => `Solve z${sup(n)} = ${rootW(n, f, rho)}. Every solution has modulus ${rho}. Give the arguments θ of all the solutions, with 0 ≤ θ < 2π, as the numbers k with θ = kπ, separated by commas (for example 1/4, 5/4).`,
  solve: ([n, f, rho]) => {
    const ks = rootArgs(n, f);
    return { steps: [S("polar", "convert", POLAR, [rho ** n, rs(R_(f, 4))], `${rho ** n}(cos(${piStr(R_(f, 4))} + 2mπ) + i sin(${piStr(R_(f, 4))} + 2mπ))`), S("divide", "divide", DM, [n], `θ = (${piStr(R_(f, 4))} + 2mπ)/${n}, m = 0, 1, …, ${n - 1}`), S("list", "list", DM, [n], ks.map(rv))], answer: ks.map(rv) };
  },
  // independent: raise each claimed root ρ(cos kπ + i sin kπ) to the power n by repeated multiplication
  validate: ([n, f, rho], v) => {
    if (!Array.isArray(v) || v.length !== n) return false;
    if (new Set(v.map((x) => Math.round(x * 1e6))).size !== n) return false;
    const w = [rho ** n * Math.cos((f * Math.PI) / 4), rho ** n * Math.sin((f * Math.PI) / 4)];
    return v.every((k) => {
      if (k < -1e-12 || k >= 2) return false;
      const z0 = [rho * Math.cos(k * Math.PI), rho * Math.sin(k * Math.PI)];
      let z = [1, 0];
      for (let i = 0; i < n; i++) z = cmul(z, z0);
      return Math.abs(z[0] - w[0]) < 1e-8 * rho ** n && Math.abs(z[1] - w[1]) < 1e-8 * rho ** n;
    });
  },
  bugs: ([n, f]) => {
    const red = (x: R) => {
      let t = x;
      while (rv(t) >= 2) t = rsub(t, R_(2));
      while (rv(t) < 0) t = radd(t, R_(2));
      return t;
    };
    return [
      B("one-root-only", "conceptual", DM, `An equation zⁿ = w with n = ${n} has ${n} different roots; adding 2mπ to the argument before dividing by ${n} gives the others.`, [rv(red(R_(f, 4 * n)))]),
      B("argument-ignored", "procedural", DM, "The roots of unity were given; the argument of the right-hand side must also be divided by n.", f !== 0 ? Array.from({ length: n }, (_, m) => rv(R_(2 * m, n))) : null),
      B("argument-not-divided", "procedural", DM, `Only 2mπ was divided by ${n}; the whole argument (θ + 2mπ) is divided by ${n}.`, f !== 0 ? Array.from({ length: n }, (_, m) => rv(red(radd(R_(f, 4), R_(2 * m, n))))).sort((a, b) => a - b) : null),
    ];
  },
  variants: () => [],
  explain: (s) => (s.id === "polar" ? `Write the right-hand side with all its arguments: ${s.value}` : s.id === "divide" ? `Take the nth root: ${s.value}` : `So k = ${(s.value as number[]).map((x) => rs(R_(Math.round(x * 24), 24))).join(", ")}`),
  domain: [[2, 6], [0, 7], [1, 3]],
  difficulty: ([n, f]) => (f === 0 && n <= 4 ? 1 : n <= 3 ? 2 : 3),
  teach: {
    idea: "zⁿ = w has n roots, all with modulus |w|^(1/n), spaced evenly round a circle: their arguments differ by 2π/n.",
    method: "Write w = R(cos φ + i sin φ). The roots have arguments (φ + 2mπ)/n for m = 0, 1, …, n − 1; bring each into [0, 2π).",
    alternatives: [{ id: "polygon", title: "A regular polygon", kind: "conceptual", text: ["The roots are the corners of a regular n-sided polygon centred at the origin.", "Find one root; the others are turns of 2π/n from it."] }],
  },
  limits: "zⁿ = w with n from 2 to 6, w at a multiple of π/4, and roots of modulus 1, 2 or 3; the answer is the set of arguments as multiples of π.",
};
function rootArgs(n: number, f: number): R[] {
  return Array.from({ length: n }, (_, m) => {
    let t = R_(f + 8 * m, 4 * n);
    while (rv(t) >= 2) t = rsub(t, R_(2));
    return t;
  }).sort((a, b) => rv(a) - rv(b));
}
function rootW(n: number, f: number, rho: number) {
  const M = rho ** n;
  if (f % 2 === 0) return [cz(M, 0), cz(0, M), cz(-M, 0), cz(0, -M)][f / 2];
  const k = R_(f > 4 ? f - 8 : f, 4);
  return `${M === 1 ? "" : M}(cos ${piStr(k)} + i sin ${piStr(k)})`;
}

// ================================================================ probability

const pf = (n: number, d: number) => rs(R_(n, d));
const ADDQ = ["P(A ∪ B)", "P(A ∩ B)", "P(A′ ∩ B′), the probability that neither A nor B happens", "P(A ∩ B′), the probability that A happens but B does not"];
const asaddp: Def = {
  id: "asaddp",
  arity: 5,
  title: "The addition rule for two events",
  competency: EV,
  type: "fraction",
  mc: true,
  // [N, a, b, c, q]: P(A) = a/N, P(B) = b/N, P(A ∩ B) = c/N; q chooses what is given and asked
  parse: none,
  reject: (p) => {
    const [N, a, b, c] = p;
    if (!allIn(p, [[10, 30], [1, 29], [1, 29], [0, 15], [0, 3]])) return "Probabilities with a denominator from 10 to 30.";
    if (a >= N || b >= N || c >= Math.min(a, b) || a + b - c > N) return "Consistent probabilities with neither event inside the other.";
    return null;
  },
  prompt: ([N, a, b, c, q]) => {
    const u = a + b - c;
    const given = q === 1 ? `P(A) = ${pf(a, N)}, P(B) = ${pf(b, N)} and P(A ∪ B) = ${pf(u, N)}` : q === 3 ? `P(A) = ${pf(a, N)} and P(A ∩ B) = ${pf(c, N)}` : `P(A) = ${pf(a, N)}, P(B) = ${pf(b, N)} and P(A ∩ B) = ${pf(c, N)}`;
    return `For two events A and B, ${given}. Find ${ADDQ[q]}.`;
  },
  solve: ([N, a, b, c, q]) => {
    const u = a + b - c;
    const ans = [u, c, N - u, a - c][q] / N;
    const st = [
      S("add", "add", EV, [pf(a, N), pf(b, N), pf(c, N)], u / N),
      S("rearrange", "subtract", EV, [pf(a, N), pf(b, N), pf(u, N)], c / N),
      S("complement", "subtract", COMP, [pf(u, N)], (N - u) / N),
      S("only", "subtract", EV, [pf(a, N), pf(c, N)], (a - c) / N),
    ];
    return { steps: q === 2 ? [st[0], st[2]] : [st[q]], answer: ans };
  },
  // independent: build a sample space of N equally likely outcomes with the right counts and count outcomes
  validate: ([N, a, b, c, q], v) => {
    if (typeof v !== "number") return false;
    let n = 0;
    for (let i = 0; i < N; i++) {
      const inA = i < a;
      const inB = i >= a - c && i < a - c + b;
      if ((q === 0 && (inA || inB)) || (q === 1 && inA && inB) || (q === 2 && !inA && !inB) || (q === 3 && inA && !inB)) n++;
    }
    return Math.abs(v - n / N) < 1e-12;
  },
  bugs: ([N, a, b, c, q]) => {
    const u = a + b - c;
    if (q === 0) return [B("overlap-not-subtracted", "conceptual", EV, "P(A) + P(B) counts the outcomes in both events twice; subtract P(A ∩ B) once.", (a + b) / N), B("assumed-independent", "conceptual", EV, "P(A ∩ B) is given; it was replaced by P(A) × P(B), which is only right for independent events.", a / N + b / N - (a * b) / (N * N))];
    if (q === 1) return [B("assumed-independent", "conceptual", EV, "P(A ∩ B) was taken as P(A) × P(B); the events are not said to be independent, so use P(A ∩ B) = P(A) + P(B) − P(A ∪ B).", (a * b) / (N * N)), B("sign-slip", "procedural", EV, "The rule was rearranged with the wrong signs: P(A ∩ B) = P(A) + P(B) − P(A ∪ B).", (a + b + u) / N)];
    if (q === 2) return [B("complement-forgotten", "procedural", COMP, "P(A ∪ B) was given; 'neither' is the complement: 1 − P(A ∪ B).", u / N), B("overlap-not-added-back", "conceptual", EV, "1 − P(A) − P(B) removes the overlap twice; add P(A ∩ B) back.", (N - a - b) / N)];
    return [B("gave-P-A", "conceptual", EV, "P(A) includes the outcomes where B also happens; take P(A ∩ B) away.", a / N), B("subtracted-P-B", "procedural", EV, "P(B) was subtracted; only the overlap P(A ∩ B) is removed from P(A).", a > b ? (a - b) / N : null)];
  },
  variants: () => [],
  explain: (s) => (s.id === "add" ? `P(A ∪ B) = P(A) + P(B) − P(A ∩ B) = ${s.inputs[0]} + ${s.inputs[1]} − ${s.inputs[2]}` : s.id === "rearrange" ? `P(A ∩ B) = P(A) + P(B) − P(A ∪ B) = ${s.inputs[0]} + ${s.inputs[1]} − ${s.inputs[2]}` : s.id === "complement" ? `Neither = 1 − P(A ∪ B) = 1 − ${s.inputs[0]}` : `P(A ∩ B′) = P(A) − P(A ∩ B) = ${s.inputs[0]} − ${s.inputs[1]}`),
  domain: [[10, 30], [1, 29], [1, 29], [0, 15], [0, 3]],
  cap: 400,
  difficulty: ([N, , , , q]) => (q === 0 && N % 10 === 0 ? 1 : q <= 1 ? 2 : 3),
  word: ([N, a, b, c, q]) => {
    const u = a + b - c;
    const intro = q === 1 ? `In a class of ${N} students, ${a} play cricket, ${b} play kabaddi, and ${u} play at least one of the two.` : `In a class of ${N} students, ${a} play cricket, ${b} play kabaddi, and ${c} play both.`;
    const ask = ["plays cricket or kabaddi (or both)", "plays both games", "plays neither game", "plays cricket but not kabaddi"][q];
    return `${intro} One student is chosen at random. Find the probability that the student ${ask}.`;
  },
  teach: {
    idea: "Adding P(A) and P(B) counts the overlap A ∩ B twice, so it is taken away once: P(A ∪ B) = P(A) + P(B) − P(A ∩ B). 'Neither' is the complement of A ∪ B.",
    method: "Write the addition rule, put in the values you know, and solve for the one you need; for 'neither' use 1 − P(A ∪ B), and for 'A but not B' use P(A) − P(A ∩ B).",
    alternatives: [{ id: "venn", title: "Fill a Venn diagram", kind: "conceptual", text: ["Put P(A ∩ B) in the overlap first.", "Then A only = P(A) − overlap, B only = P(B) − overlap, and outside = 1 − (all three regions)."] }],
  },
  limits: "Two events with probabilities over a denominator from 10 to 30, neither inside the other; three events are not included.",
};

const MEX = ["mutually exclusive, but not exhaustive", "exhaustive, but not mutually exclusive", "both mutually exclusive and exhaustive", "neither mutually exclusive nor exhaustive"];
const bits = (m: number) => [1, 2, 3, 4, 5, 6, 7, 8].filter((x) => m & (1 << (x - 1)));
const MEXLIST: [number, number][][] = (() => {
  const out: [number, number][][] = [[], [], [], []];
  const pc = (m: number) => bits(m).length;
  for (let A = 1; A < 255; A++)
    for (let Bm = 1; Bm < 255; Bm++) {
      if (A === Bm || pc(A) < 2 || pc(A) > 5 || pc(Bm) < 2 || pc(Bm) > 5) continue;
      const ex = (A & Bm) === 0;
      const exh = (A | Bm) === 255;
      out[ex && exh ? 2 : ex ? 0 : exh ? 1 : 3].push([A, Bm]);
    }
  return out;
})();
const mexPair = ([cat, x]: number[]) => {
  const L = MEXLIST[cat];
  return L[Math.floor((x * L.length) / 80)];
};
const setTxt = (m: number) => `{${bits(m).join(", ")}}`;
const asmex: Def = {
  id: "asmex",
  arity: 2,
  title: "Mutually exclusive and exhaustive events",
  competency: EV,
  type: "choice",
  // [cat, x]: the x-th pair of events of the given kind on the outcomes 1 to 8
  parse: none,
  reject: (p) => (!allIn(p, [[0, 3], [0, 79]]) ? "One of 80 pairs of events of each kind on a spinner numbered 1 to 8." : null),
  prompt: (p) => {
    const [A, Bm] = mexPair(p);
    return `A spinner with 8 equal sectors numbered 1 to 8 is spun once. Let A = ${setTxt(A)} and B = ${setTxt(Bm)}. Which describes the events A and B?`;
  },
  choices: () => MEX,
  solve: (p) => {
    const [A, Bm] = mexPair(p);
    return { steps: [S("intersection", "intersect", EV, [setTxt(A), setTxt(Bm)], setTxt(A & Bm).replace("{}", "∅")), S("union", "union", EV, [setTxt(A), setTxt(Bm)], setTxt(A | Bm)), S("decide", "classify", EV, [p[0]], p[0])], answer: p[0] };
  },
  // independent: go through the outcomes 1 to 8 one by one, checking for a shared outcome and for a missed one
  validate: (p, v) => {
    const [A, Bm] = mexPair(p);
    const a = bits(A);
    const b = bits(Bm);
    let shared = false;
    let missed = false;
    for (let x = 1; x <= 8; x++) {
      if (a.includes(x) && b.includes(x)) shared = true;
      if (!a.includes(x) && !b.includes(x)) missed = true;
    }
    return v === (!shared && !missed ? 2 : !shared ? 0 : !missed ? 1 : 3);
  },
  bugs: ([cat]) => {
    if (cat === 0) return [B("words-swapped", "recall", EV, "'Exhaustive' means that together the events cover every outcome; 'mutually exclusive' means they have no outcome in common.", 1)];
    if (cat === 1) return [B("words-swapped", "recall", EV, "'Mutually exclusive' means no outcome in common; these events share an outcome, though together they cover every outcome (exhaustive).", 0)];
    if (cat === 2) return [B("cannot-be-both", "conceptual", EV, "Events can be both: A and its complement have nothing in common and together cover every outcome.", 0)];
    return [B("different-means-exclusive", "conceptual", EV, "Different events are not automatically mutually exclusive; look for an outcome that is in both sets.", 0)];
  },
  variants: () => [],
  explain: (s) => (s.id === "intersection" ? `A ∩ B = ${s.value}` : s.id === "union" ? `A ∪ B = ${s.value}` : `So A and B are ${MEX[Number(s.value)]}`),
  domain: [[0, 3], [0, 79]],
  difficulty: ([cat]) => (cat === 3 ? 1 : cat === 2 ? 3 : 2),

  teach: {
    idea: "Mutually exclusive events cannot happen together (A ∩ B is empty). Exhaustive events cover the whole sample space (A ∪ B = S).",
    method: "Find A ∩ B: empty means mutually exclusive. Find A ∪ B: the whole sample space means exhaustive. Each property is checked separately.",
    alternatives: [{ id: "tick_table", title: "Tick each outcome", kind: "procedural", text: ["Write the outcomes 1 to 8 in a row; tick under A and under B.", "A column with two ticks: not exclusive. A column with no tick: not exhaustive."] }],
  },
  limits: "Two events of 2 to 5 outcomes on 8 equally likely outcomes; three or more events are not included.",
};

const MACH = ["A", "B", "C"];
const asbayes: Def = {
  id: "asbayes",
  arity: 6,
  title: "Bayes' theorem: which source produced it",
  competency: BAY,
  type: "fraction",
  mc: true,
  // [p₁, p₂, r₁, r₂, r₃, j]: shares in tenths (p₃ = 10 − p₁ − p₂), defect rates in %, ask source j
  parse: none,
  reject: (p) => {
    const [p1, p2, , , r3, j] = p;
    if (!allIn(p, [[1, 8], [1, 9], [1, 9], [1, 9], [1, 9], [0, 2]])) return "Two or three sources with shares in tens of per cent and defect rates from 1% to 9%.";
    if (p1 + p2 > 10) return "The shares add up to 100%.";
    if (p1 + p2 === 10 && (r3 !== 1 || j === 2)) return "With two sources there is no third rate.";
    return null;
  },
  prompt: (p) => `${bayesSetup(p, ["A factory has", "machines", "makes", "of the bolts", "bolts", "defective"])} A bolt is picked at random and is found to be defective. Find the probability that it was made by machine ${MACH[p[5]]}.`,
  solve: (p) => {
    const sh = shares(p);
    const r = [p[2], p[3], p[4]].slice(0, sh.length);
    const joint = sh.map((s, i) => s * r[i]);
    const tot = joint.reduce((a, b) => a + b, 0);
    return { steps: [S("joint", "multiply", COND, [sh[p[5]], r[p[5]]], joint[p[5]] / 1000), S("total", "add", BAY, joint, tot / 1000), S("bayes", "divide", BAY, [joint[p[5]], tot], joint[p[5]] / tot)], answer: joint[p[5]] / tot };
  },
  // independent: count 10 000 bolts one by one (natural frequencies) and the defective ones from machine j
  validate: (p, v) => {
    if (typeof v !== "number") return false;
    const sh = shares(p);
    const r = [p[2], p[3], p[4]];
    let all = 0;
    let fromJ = 0;
    let start = 0;
    for (let m = 0; m < sh.length; m++) {
      const made = 1000 * sh[m];
      const bad = (made * r[m]) / 100;
      for (let i = 0; i < made; i++)
        if (i < bad) {
          all++;
          if (m === p[5]) fromJ++;
        }
      start += made;
    }
    return start === 10000 && Math.abs(v - fromJ / all) < 1e-12;
  },
  bugs: (p) => {
    const sh = shares(p);
    const r = [p[2], p[3], p[4]].slice(0, sh.length);
    const j = p[5];
    return [
      B("shares-ignored", "conceptual", BAY, "The defect rates were compared without the machines' shares; a machine that makes more bolts also makes more of the defective ones. Multiply each rate by the share first.", r[j] / r.reduce((a, b) => a + b, 0)),
      B("joint-not-divided", "procedural", BAY, "P(machine and defective) was given; the bolt is known to be defective, so divide by the total probability of a defective bolt.", (sh[j] * r[j]) / 1000),
      B("condition-reversed", "conceptual", COND, `P(defective | machine ${MACH[j]}) = ${r[j]}% was given; the question asks the reverse, P(machine ${MACH[j]} | defective).`, r[j] / 100),
    ];
  },
  variants: () => [],
  explain: (s) => (s.id === "joint" ? `P(${"machine"} and defective) = ${s.inputs[0] * 10}% × ${s.inputs[1]}% = ${s.value}` : s.id === "total" ? `Total probability of a defective bolt = ${s.value}` : `Bayes: divide the machine's share of defectives by the total: ${s.inputs[0]}/${s.inputs[1]}`),
  domain: [[1, 8], [1, 9], [1, 9], [1, 9], [1, 9], [0, 2]],
  cap: 400,
  difficulty: (p) => (shares(p).length === 2 ? 1 : p[0] + p[1] < 10 && p[2] === p[3] ? 2 : 3),
  word: (p) => `${bayesSetup(p, ["Parcels in Chennai are carried by", "courier companies", "carries", "of the parcels", "parcels", "damaged"]).replace(/Machine/g, "Company").replace(/machine/g, "company")} A parcel arrives damaged. Find the probability that it was carried by company ${MACH[p[5]]}.`,
  teach: {
    idea: "Bayes' theorem reverses a condition: P(source | result) = P(source and result) / P(result), where P(result) adds up over all the sources (total probability).",
    method: "For each source multiply its share by its rate; add these for the total probability; divide the chosen source's product by the total.",
    alternatives: [{ id: "tree_counts", title: "Count 10 000 items", kind: "conceptual", text: ["Imagine 10 000 items: split them by share, then count the faulty ones from each source.", "The answer is the faulty ones from the chosen source divided by all the faulty ones."] }],
  },
  limits: "Two or three sources with shares in tens of per cent and whole-number defect rates up to 9%.",
};
function shares(p: number[]) {
  return p[0] + p[1] === 10 ? [p[0], p[1]] : [p[0], p[1], 10 - p[0] - p[1]];
}
function bayesSetup(p: number[], w: string[]) {
  const sh = shares(p);
  const r = [p[2], p[3], p[4]].slice(0, sh.length);
  const who = w[1].startsWith("machine") ? "Machine" : "Company";
  const parts = sh.map((s, i) => `${who} ${MACH[i]} ${w[2]} ${pct(s)}`).join(sh.length === 3 ? ", " : " and ");
  const rates = r.map((x, i) => `${x}% of ${MACH[i]}'s`).join(sh.length === 3 ? ", " : " and ");
  return `${w[0]} ${sh.length} ${w[1]}. ${parts.replace(/, (?=[^,]*$)/, " and ")} ${w[3]}. ${rates.replace(/, (?=[^,]*$)/, " and ")} ${w[4]} are ${w[5]}.`;
}

const astotp: Def = {
  id: "astotp",
  arity: 5,
  title: "The theorem of total probability",
  competency: BAY,
  type: "fraction",
  mc: true,
  // [f, r₁, b₁, r₂, b₂]: a die chooses Bag I on 1 to f, otherwise Bag II; P(red)
  parse: none,
  reject: (p) => (!allIn(p, [[1, 5], [1, 6], [1, 6], [1, 6], [1, 6]]) || (p[1] * (p[3] + p[4]) === p[3] * (p[1] + p[2])) ? "Two bags of 1 to 6 red and 1 to 6 black balls with different proportions of red, chosen by a die." : null),
  prompt: ([f, r1, b1, r2, b2]) => `A die is thrown. If it shows ${f === 1 ? "1" : `1 to ${f}`}, a ball is drawn from Bag I, which has ${r1} red and ${b1} black balls; otherwise a ball is drawn from Bag II, which has ${r2} red and ${b2} black balls. Find the probability that the ball drawn is red.`,
  solve: ([f, r1, b1, r2, b2]) => {
    const [n1, n2] = [r1 + b1, r2 + b2];
    const t1 = (f / 6) * (r1 / n1);
    const t2 = ((6 - f) / 6) * (r2 / n2);
    return { steps: [S("bag1", "multiply", COND, [pf(f, 6), pf(r1, n1)], t1), S("bag2", "multiply", COND, [pf(6 - f, 6), pf(r2, n2)], t2), S("total", "add", BAY, [], t1 + t2)], answer: (f * r1 * n2 + (6 - f) * r2 * n1) / (6 * n1 * n2) };
  },
  // independent: list every equally likely (die face, ball in Bag I, ball in Bag II) and count the red draws
  validate: ([f, r1, b1, r2, b2], v) => {
    if (typeof v !== "number") return false;
    const [n1, n2] = [r1 + b1, r2 + b2];
    let red = 0;
    let all = 0;
    for (let face = 1; face <= 6; face++)
      for (let i = 0; i < n1; i++)
        for (let j = 0; j < n2; j++) {
          all++;
          if (face <= f ? i < r1 : j < r2) red++;
        }
    return Math.abs(v - red / all) < 1e-12;
  },
  bugs: ([f, r1, b1, r2, b2]) => {
    const [n1, n2] = [r1 + b1, r2 + b2];
    return [
      B("bags-averaged", "conceptual", BAY, `The two bags are not equally likely: Bag I is used with probability ${pf(f, 6)}. Weight each bag's chance of red by the chance of using it.`, f !== 3 ? (r1 / n1 + r2 / n2) / 2 : null),
      B("balls-pooled", "conceptual", BAY, "The balls of both bags were put together; the ball comes from one bag only, chosen by the die.", (r1 + r2) / (n1 + n2)),
      B("one-bag-only", "procedural", BAY, "Only the Bag I branch was counted; add the Bag II branch as well.", (f * r1) / (6 * n1)),
    ];
  },
  variants: () => [],
  explain: (s) => (s.id === "bag1" ? `Bag I and red: ${s.inputs[0]} × ${s.inputs[1]}` : s.id === "bag2" ? `Bag II and red: ${s.inputs[0]} × ${s.inputs[1]}` : "Add the two branches (total probability)"),
  domain: [[1, 5], [1, 6], [1, 6], [1, 6], [1, 6]],
  cap: 400,
  difficulty: ([f, r1, b1, r2, b2]) => (f === 3 ? 1 : (r1 + b1) === (r2 + b2) ? 2 : 3),
  word: ([f, r1, b1, r2, b2]) => `${nm(f + r1)} throws a die to choose a box. On ${f === 1 ? "a 1" : `1 to ${f}`} she takes a pen from Box I, which has ${r1} blue and ${b1} black pens; otherwise she takes a pen from Box II, which has ${r2} blue and ${b2} black pens. Find the probability that the pen is blue.`,
  teach: {
    idea: "When an outcome can happen in several separate ways (through Bag I or through Bag II), its probability is the sum over the ways of P(way) × P(outcome | way).",
    method: "Draw a tree: first branch the bag (with the die's probabilities), then the colour. Multiply along each red branch and add.",
    alternatives: [{ id: "count_all", title: "Count equally likely cases", kind: "conceptual", text: ["Imagine many repeats: in 6 throws, f choose Bag I and the rest Bag II.", "Scale up so the balls divide evenly, count the red draws, and divide by all the draws."] }],
  },
  limits: "Two bags of up to 6 red and 6 black balls chosen by a die; three or more stages are not included.",
};

const C = (n: number, k: number) => {
  let v = 1;
  for (let i = 1; i <= k; i++) v = (v * (n - k + i)) / i;
  return Math.round(v);
};
const BMODE = ["=", "≥", "≤"];
const binSet = (n: number, r: number, mode: number) => Array.from({ length: n + 1 }, (_, k) => k).filter((k) => (mode === 0 ? k === r : mode === 1 ? k >= r : k <= r));
const binP = (n: number, a: number, d: number, ks: number[]) => ks.reduce((s, k) => s + C(n, k) * a ** k * (d - a) ** (n - k), 0) / d ** n;
const asbinom: Def = {
  id: "asbinom",
  arity: 5,
  title: "Binomial probabilities",
  competency: BIN,
  type: "fraction",
  mc: true,
  // [n, a, d, r, mode]: X ~ B(n, a/d); P(X = r), P(X ≥ r) or P(X ≤ r)
  parse: none,
  reject: (p) => {
    const [n, a, d, r, mode] = p;
    if (!allIn(p, [[2, 9], [1, 9], [2, 10], [0, 9], [0, 2]])) return "B(n, p) with n from 2 to 9 and p a simple fraction.";
    if (a >= d || gcd(a, d) !== 1 || d ** n > 1000) return "p = a/d in lowest terms, with dⁿ at most 1000.";
    if (r > n || (mode === 1 && (r < 1 || r === n)) || (mode === 2 && (r < 1 || r >= n))) return "r must make an 'at least' or 'at most' question that is not just one value.";
    return null;
  },
  prompt: ([n, a, d, r, mode]) => `X has a binomial distribution with n = ${n} and p = ${pf(a, d)}. Find P(X ${BMODE[mode]} ${r}).`,
  solve: ([n, a, d, r, mode]) => {
    const ks = binSet(n, r, mode);
    const useComp = mode !== 0 && ks.length > (n + 1) / 2;
    const ans = binP(n, a, d, ks);
    return {
      steps: [
        S("formula", "recall", BIN, [n, pf(a, d), pf(d - a, d)], `P(X = k) = ${n}Cₖ (${pf(a, d)})ᵏ (${pf(d - a, d)})^(${n} − k)`),
        S("terms", "evaluate", COMB, useComp ? Array.from({ length: n + 1 }, (_, k) => k).filter((k) => !ks.includes(k)) : ks, useComp ? 1 - ans : ans),
        S("combine", useComp ? "subtract" : "add", BIN, [useComp ? "1 −" : "sum"], ans),
      ],
      answer: ans,
    };
  },
  // independent: list all 2ⁿ success/failure sequences with their weights and add those with the right count
  validate: ([n, a, d, r, mode], v) => {
    if (typeof v !== "number") return false;
    let good = 0;
    for (let s = 0; s < 1 << n; s++) {
      let k = 0;
      for (let i = 0; i < n; i++) if (s & (1 << i)) k++;
      if ((mode === 0 && k === r) || (mode === 1 && k >= r) || (mode === 2 && k <= r)) good += a ** k * (d - a) ** (n - k);
    }
    return Math.abs(v * d ** n - good) < 1e-6;
  },
  bugs: ([n, a, d, r, mode]) => {
    const out: Bug[] = [];
    if (mode === 0) {
      if (C(n, r) !== 1) out.push(B("no-combinations", "conceptual", BIN, `pʳqⁿ⁻ʳ is the probability of one particular order; there are ${n}C${r} = ${C(n, r)} orders, so multiply by ${C(n, r)}.`, (a ** r * (d - a) ** (n - r)) / d ** n));
      if (2 * a !== d) out.push(B("p-q-swapped", "procedural", BIN, "p was raised to the number of failures and q to the number of successes; it is pʳ qⁿ⁻ʳ with r successes.", (C(n, r) * a ** (n - r) * (d - a) ** r) / d ** n));
    } else {
      out.push(B("one-value-only", "conceptual", BIN, `'${mode === 1 ? "At least" : "At most"} ${r}' includes every value ${mode === 1 ? `from ${r} up to ${n}` : `from 0 up to ${r}`}, not only X = ${r}.`, binP(n, a, d, [r])));
      out.push(B("boundary-left-out", "procedural", BIN, `X = ${r} itself belongs to 'X ${BMODE[mode]} ${r}'; it was left out.`, binP(n, a, d, binSet(n, r, mode).filter((k) => k !== r))));
    }
    return out;
  },
  variants: () => [],
  explain: (s) => (s.id === "formula" ? `For a binomial distribution: ${s.value}` : s.id === "terms" ? `Add P(X = k) for k = ${s.inputs.join(", ")}` : s.inputs[0] === "1 −" ? "Use the complement: subtract that sum from 1" : "That sum is the answer"),
  domain: [[2, 9], [1, 9], [2, 10], [0, 9], [0, 2]],
  cap: 400,
  difficulty: ([n, , , , mode]) => (mode === 0 && n <= 4 ? 1 : mode === 0 || n <= 4 ? 2 : 3),
  word: ([n, a, d, r, mode]) => {
    const how = ["exactly", "at least", "at most"][mode];
    if (a === 1 && d === 6) return `A fair die is thrown ${n} times. Find the probability of getting ${how} ${r} six${r === 1 ? "" : "es"}.`;
    if (a === 1 && d === 2) return `A fair coin is tossed ${n} times. Find the probability of getting ${how} ${r} head${r === 1 ? "" : "s"}.`;
    return `Each seed in a packet germinates with probability ${pf(a, d)}, independently of the others. ${nm(n + r)} sows ${n} seeds. Find the probability that ${how} ${r} of them germinate.`;
  },
  teach: {
    idea: "In n independent trials with success probability p, any one order of r successes has probability pʳqⁿ⁻ʳ, and there are nCr such orders.",
    method: "Use P(X = k) = nCk pᵏ qⁿ⁻ᵏ with q = 1 − p. For 'at least' or 'at most', add the values needed, or use 1 minus the complement when that is shorter.",
    alternatives: [{ id: "tree", title: "Count the paths of a tree", kind: "conceptual", text: ["Each trial branches into success (p) and failure (q).", "Every path with r successes has the same probability; count the paths with nCr."] }],
  },
  limits: "B(n, p) with n up to 9 and p a simple fraction (dⁿ ≤ 1000), so answers are exact fractions.",
};

const asbinmv: Def = {
  id: "asbinmv",
  arity: 4,
  title: "Mean and variance of a binomial distribution",
  competency: BIN,
  type: "tuple",
  mc: true,
  // [n, a, d, mode]: p = a/d; mode 0: find (mean, variance); mode 1: given them, find (n, p)
  parse: none,
  reject: (p) => {
    const [n, a, d, mode] = p;
    if (!allIn(p, [[2, 40], [1, 9], [2, 10], [0, 1]])) return "B(n, p) with n up to 40 and p a simple fraction.";
    if (a >= d || gcd(a, d) !== 1) return "p = a/d in lowest terms.";
    if (mode === 0 && n > 12) return "Finding the mean and variance uses n up to 12.";
    if (mode === 1 && n < 4) return "Finding n and p uses n of at least 4.";
    return null;
  },
  prompt: ([n, a, d, mode]) => (mode ? `A binomial random variable X has mean ${rs(R_(n * a, d))} and variance ${rs(R_(n * a * (d - a), d * d))}. Find n and p. Type them as (n, p).` : `X has a binomial distribution with n = ${n} and p = ${pf(a, d)}. Find the mean and the variance of X. Type them as (mean, variance).`),
  solve: ([n, a, d, mode]) => {
    const mean = R_(n * a, d);
    const v = R_(n * a * (d - a), d * d);
    if (mode) return { steps: [S("q", "divide", BIN, [rs(v), rs(mean)], pf(d - a, d)), S("p", "subtract", BIN, [pf(d - a, d)], pf(a, d)), S("n", "divide", BIN, [rs(mean), pf(a, d)], n)], answer: tup([String(n), pf(a, d)]) };
    return { steps: [S("mean", "multiply", BIN, [n, pf(a, d)], rs(mean)), S("variance", "multiply", BIN, [n, pf(a, d), pf(d - a, d)], rs(v))], answer: tup([rs(mean), rs(v)]) };
  },
  // independent: mode 0 lists all 2ⁿ sequences and computes E(X) and E(X²); mode 1 substitutes (n, p) back
  validate: ([n, a, d, mode], v) => {
    const t = nums(v);
    if (!t || t.length !== 2) return false;
    const p = a / d;
    if (mode) {
      const [nn, pp] = t;
      return Number.isInteger(nn) && nn > 0 && pp > 0 && pp < 1 && close(nn * pp, n * p, 1e-9) && close(nn * pp * (1 - pp), n * p * (1 - p), 1e-9);
    }
    let e1 = 0;
    let e2 = 0;
    for (let s = 0; s < 1 << n; s++) {
      let k = 0;
      for (let i = 0; i < n; i++) if (s & (1 << i)) k++;
      const w = p ** k * (1 - p) ** (n - k);
      e1 += k * w;
      e2 += k * k * w;
    }
    return close(t[0], e1, 1e-9) && close(t[1], e2 - e1 * e1, 1e-9);
  },
  bugs: ([n, a, d, mode]) => {
    if (mode) {
      const q = R_(d - a, d);
      const nn = rdiv(R_(n * a, d), q);
      return [B("p-q-swapped", "procedural", BIN, "Variance ÷ mean gives q = 1 − p, not p.", 2 * a !== d ? tup([rs(nn), rs(q)]) : null)];
    }
    const mean = R_(n * a, d);
    return [
      B("variance-np", "recall", BIN, "The variance is npq; the factor q = 1 − p was left out.", tup([rs(mean), rs(mean)])),
      B("variance-np-squared", "recall", BIN, "The variance is npq, not np².", tup([rs(mean), rs(R_(n * a * a, d * d))])),
    ];
  },
  distractors: ([n, a, d, mode]) => (mode ? [tup([String(n + 1), pf(a, d)]), tup([String(2 * n), pf(a, 2 * d)])] : [tup([rs(R_(n * a, d)), rs(R_(n * a * (d - a), d))]), tup([rs(R_(n * (d - a), d)), rs(R_(n * a * (d - a), d * d))])]),
  variants: () => [],
  explain: (s) => (s.id === "mean" ? `Mean = np = ${s.inputs[0]} × ${s.inputs[1]} = ${s.value}` : s.id === "variance" ? `Variance = npq = ${s.inputs[0]} × ${s.inputs[1]} × ${s.inputs[2]} = ${s.value}` : s.id === "q" ? `q = npq ÷ np = ${s.inputs[0]} ÷ ${s.inputs[1]} = ${s.value}` : s.id === "p" ? `p = 1 − q = ${s.value}` : `n = mean ÷ p = ${s.inputs[0]} ÷ ${s.inputs[1]} = ${s.value}`),
  domain: [[2, 40], [1, 9], [2, 10], [0, 1]],
  cap: 400,
  difficulty: ([n, a, d, mode]) => (mode === 0 && (n * a) % d === 0 ? 1 : mode === 0 ? 2 : 3),
  word: ([n, a, d, mode]) => (mode ? `The number of defective bulbs in a box is binomial, with mean ${rs(R_(n * a, d))} and variance ${rs(R_(n * a * (d - a), d * d))}. How many bulbs are in a box, and what is the probability that a bulb is defective? Type (n, p).` : `Each bulb made by a machine is defective with probability ${pf(a, d)}, independently. A box holds ${n} bulbs. Find the mean and variance of the number of defective bulbs in a box, typed as (mean, variance).`),
  teach: {
    idea: "A binomial count is a sum of n independent 0–1 trials, each with mean p and variance pq, so the mean is np and the variance is npq.",
    method: "Mean = np, variance = npq with q = 1 − p. Going back: q = variance ÷ mean, p = 1 − q, n = mean ÷ p.",
    alternatives: [{ id: "one_trial", title: "Start from one trial", kind: "conceptual", text: ["One trial scores 1 with probability p and 0 with probability q: mean p, variance p − p² = pq.", "n independent trials add their means and their variances."] }],
  },
  limits: "p a simple fraction; n up to 12 for finding the mean and variance, up to 40 for finding n and p.",
};

export const B19: Def[] = [
  aslocus, aslocpar,
  aspair, aspairang,
  asline, asperpd, asparld, aslang, aspar,
  astan, astanc,
  asdist3, assect3, asoct,
  asdcos, aslrel, asangl, asfoot,
  asskew, asparl3,
  asplaned, asmeet, asimage,
  ascop, ascmod, ascpow, ascsqrt,
  asarg, aspolm,
  ascloc,
  asdemo, asroot,
  asaddp, asmex,
  asbayes, astotp,
  asbinom, asbinmv,
];
void RV;
