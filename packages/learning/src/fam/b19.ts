/**
 * Batch b19 (families@2), Grades 11–12: loci, pairs of straight lines, straight lines, tangents and normals to conics,
 * points, lines and planes in space, complex numbers (arithmetic, modulus, powers of i, square roots, argument, polar
 * form, de Moivre's theorem, nth roots, circles in the Argand plane) and probability (event algebra, mutually exclusive
 * and exhaustive events, total probability, Bayes' theorem, binomial probabilities, mean and variance).
 * Written by OpenPath; CC0.
 */
import type { Bug, Def, Step, Value } from "../family-kit";
import { b1Object, complexObject, laObject } from "../typed-contract.ts";
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
/** A line r⃗ = a + λu as printed (r⃗ = λu when it passes through the origin). */
const lineVec = (a: number[], u: number[], par = "λ") => (a.every((x) => x === 0) ? `r⃗ = ${par}(${vec(u)})` : `r⃗ = (${vec(a)}) + ${par}(${vec(u)})`);
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
const pa = (k: R) => (k[0] < 0 ? `(${piStr(k)})` : piStr(k));
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
      B("line-distance-sign", "conceptual", LOCUS, `The distance from P(x, y) to the line x = ${mi(h)} is ${h === 0 ? "|x|" : `|x ${h > 0 ? "−" : "+"} ${Math.abs(h)}|`}; the number was used with the wrong sign, as ${h === 0 ? "|x|" : `|x ${h > 0 ? "+" : "−"} ${Math.abs(h)}|`}.`, a + h !== 0 ? poly([[R_(1, 2 * (a + h)), "y²"], [R_(-2 * b, 2 * (a + h)), "y"], [R_(b * b + a * a - h * h, 2 * (a + h)), ""]]) : null),
      B("bracket-sign", "prerequisite", DIST, `${sqTerm("y", b)} was expanded with the wrong sign of the middle term: (y − k)² = y² − 2ky + k².`, b !== 0 ? poly([[R_(1, den), "y²"], [R_(2 * b, den), "y"], [R_(b * b + a * a - h * h, den), ""]]) : null),
      B("lost-two", "procedural", LOCUS, `When the x² terms cancel, the x terms give ${mi(den)}x (the 2 from expanding the squares stays); the expression was divided by ${mi(a - h)} instead of ${mi(den)}.`, a - h !== 1 && a - h !== -1 ? poly([[R_(1, a - h), "y²"], [R_(-2 * b, a - h), "y"], [R_(b * b + a * a - h * h, a - h), ""]]) : poly([[R_(1, a - h), "y²"], [R_(-2 * b, a - h), "y"], [R_(b * b + a * a - h * h, a - h), ""]])),
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

// ---- pairs of lines through the origin: (q₁y − p₁x)(q₂y − p₂x) = 0, slopes p₁/q₁ < p₂/q₂ in lowest terms (each
// equation once: no scaled copies of the same pair)
const pairCoef = ([p1, q1, p2, q2]: number[]) => ({ A: p1 * p2, H2: -(q1 * p2 + q2 * p1), Bc: q1 * q2 });
const pairEq = (pp: number[]) => {
  const { A, H2, Bc } = pairCoef(pp);
  return `${poly([[R_(A), "x²"], [R_(H2), "xy"], [R_(Bc), "y²"]])} = 0`;
};
const pairOk = (pp: number[]) => {
  const [p1, q1, p2, q2] = pp;
  return allIn(pp, PAIR_D) && gcd(Math.abs(p1), q1) === 1 && gcd(Math.abs(p2), q2) === 1 && p1 * q2 < p2 * q1;
};
const PAIR_D: [number, number][] = [[-6, 6], [1, 3], [-6, 6], [1, 3]];
/** The slopes found by trying every fraction p/q (q up to 3) in the equation (an independent search). */
const pairSearch = (pp: number[]) => {
  const { A, H2, Bc } = pairCoef(pp);
  const out: number[] = [];
  for (let q = 1; q <= 3; q++) for (let p = -18; p <= 18; p++) {
    const m = p / q;
    if (Math.abs(Bc * m * m + H2 * m + A) < 1e-9 && !out.some((x) => close(x, m))) out.push(m);
  }
  return out.sort((x, y) => x - y);
};

const aspair: Def = {
  id: "aspair",
  arity: 4,
  title: "The slopes of a pair of lines through the origin",
  competency: PAIR,
  type: "set",
  // [p₁, q₁, p₂, q₂]: slopes p₁/q₁ < p₂/q₂
  parse: none,
  reject: (pp) => (!pairOk(pp) ? "Two different slopes p/q in lowest terms (p from −6 to 6, q from 1 to 3), listed in increasing order." : null),
  prompt: (pp) => `The equation ${pairEq(pp)} represents a pair of straight lines through the origin. Find the slopes of the two lines. Type both, separated by a comma (fractions are fine).`,
  solve: (pp) => {
    const { A, H2, Bc } = pairCoef(pp);
    const ms = [pp[0] / pp[1], pp[2] / pp[3]];
    return {
      steps: [S("substitute", "substitute", PAIR, [A, H2, Bc], `${poly([[R_(Bc), "m²"], [R_(H2), "m"], [R_(A), ""]])} = 0`), S("solve", "solve", QUAD, [rs(R_(-H2, Bc)), rs(R_(A, Bc))], ms)],
      answer: ms,
    };
  },
  // independent: each slope m must make y = mx satisfy the equation (substitute and check it gives 0)
  validate: (pp, v) => {
    if (!Array.isArray(v) || v.length !== 2 || close(v[0], v[1])) return false;
    const { A, H2, Bc } = pairCoef(pp);
    return v.every((m) => close(Bc * m * m + H2 * m + A, 0, 1e-9));
  },
  bugs: (pp) => {
    const [m1, m2] = [pp[0] / pp[1], pp[2] / pp[3]];
    return [
      B("sum-sign", "procedural", PAIR, "The sum of the slopes was taken as +(xy coefficient)/(y² coefficient); for by² + 2hxy + ax² = 0 the sum of the slopes is −2h/b.", [-m2, -m1]),
      B("reciprocal-slopes", "conceptual", PAIR, "The equation was solved for x/y instead of y/x, which gives the reciprocals of the slopes. Put y = mx and solve for m.", m1 !== 0 && m2 !== 0 ? [1 / m1, 1 / m2].sort((x, y) => x - y) : null),
    ];
  },
  variants: () => [],
  explain: (s) => (s.id === "substitute" ? `Put y = mx and divide by x²: ${s.value}` : `Solve the quadratic in m (sum of the roots ${s.inputs[0]}, product ${s.inputs[1]}): the slopes are ${(s.value as number[]).map((x) => rs(R_(Math.round(x * 6), 6))).join(" and ")}`),
  domain: PAIR_D,
  keep: pairOk,
  cap: 300,
  difficulty: ([p1, q1, p2, q2]) => (q1 === 1 && q2 === 1 ? (p1 === 0 || p1 + p2 === 0 ? 1 : 2) : 3),
  word: (pp) => `Two straight railway tracks cross at a level crossing placed at the origin of a map. Together the two tracks are described by ${pairEq(pp)}. Find the slopes of the two tracks (type both, separated by a comma; fractions are fine).`,
  teach: {
    idea: "A homogeneous equation ax² + 2hxy + by² = 0 factorises into two linear factors through the origin; putting y = mx turns it into a quadratic whose roots are the slopes.",
    method: "Substitute y = mx, divide by x², and solve bm² + 2hm + a = 0. Check: the sum of the slopes is −2h/b and the product is a/b.",
    alternatives: [{ id: "factorise", title: "Factorise directly", kind: "procedural", text: ["Treat the equation as a quadratic in y and factorise it into (q₁y − p₁x)(q₂y − p₂x).", "Each factor set to zero is one line; read off its slope p/q."] }],
  },
  limits: "Pairs of lines through the origin with slopes p/q (q up to 3), each pair once (no multiples of the same equation); the general second-degree equation and the condition for a pair of lines are not included.",
};

const aspairang: Def = {
  id: "aspairang",
  arity: 4,
  title: "The angle between a pair of lines through the origin",
  competency: PAIR,
  type: "exact",
  mc: true,
  parse: none,
  reject: (pp) => (!pairOk(pp) || pp[0] * pp[2] + pp[1] * pp[3] === 0 ? "Two different slopes p/q in lowest terms (p from −6 to 6, q from 1 to 3, increasing), not perpendicular." : null),
  prompt: (pp) => `Find tan θ, where θ is the acute angle between the pair of lines ${pairEq(pp)}.`,
  solve: (pp) => {
    const { A, H2, Bc } = pairCoef(pp);
    const h = R_(H2, 2);
    const disc = rsub(rmul(h, h), R_(A * Bc));
    const [p1, q1, p2, q2] = pp;
    const ans = R_(Math.abs(p1 * q2 - p2 * q1), Math.abs(q1 * q2 + p1 * p2));
    return {
      steps: [
        S("coefficients", "read", PAIR, [A, rs(h), Bc], `a = ${mi(A)}, h = ${rs(h)}, b = ${Bc}`),
        S("discriminant", "evaluate", PAIR, [rs(disc)], rs(disc)),
        S("tan", "divide", PAIR, [rs(disc), A + Bc], rs(ans)),
      ],
      answer: rs(ans),
    };
  },
  // independent: find the slopes by trying fractions in the equation, then measure the angle with arctan
  validate: (pp, v) => {
    const t = num1(v);
    if (t === null) return false;
    const ms = pairSearch(pp);
    if (ms.length !== 2) return false;
    let th = Math.abs(Math.atan(ms[0]) - Math.atan(ms[1]));
    if (th > Math.PI / 2) th = Math.PI - th;
    return close(Math.tan(th), t, 1e-9);
  },
  bugs: ([p1, q1, p2, q2]) => {
    const num = Math.abs(p1 * q2 - p2 * q1);
    const den = q1 * q2 + p1 * p2;
    const ans = R_(num, Math.abs(den));
    const minus = q1 * q2 - p1 * p2;
    return [
      B("no-absolute-value", "procedural", PAIR, "The sign of (m₁ − m₂)/(1 + m₁m₂) was kept; the acute angle has a positive tangent, so take the absolute value.", rs(R_(p1 * q2 - p2 * q1, den))),
      B("lost-two", "recall", PAIR, "The formula is tan θ = |2√(h² − ab)/(a + b)|; the 2 was left out.", rs(R_(ans[0], 2 * ans[1]))),
      B("denominator-sign", "recall", LINE, "With slopes m₁ and m₂, tan θ = |(m₁ − m₂)/(1 + m₁m₂)|; a minus sign was used in the denominator.", minus !== 0 ? rs(R_(num, Math.abs(minus))) : null),
    ];
  },
  distractors: ([p1, q1, p2, q2]) => {
    const num = Math.abs(p1 * q2 - p2 * q1);
    const den = Math.abs(q1 * q2 + p1 * p2);
    return [rs(R_(den, num)), rs(R_(2 * num, den)), rs(R_(num + den, den))];
  },
  variants: () => [],
  explain: (s) => (s.id === "coefficients" ? `Compare with ax² + 2hxy + by² = 0: ${s.value}` : s.id === "discriminant" ? `h² − ab = ${s.value}` : `tan θ = |2√(h² − ab)/(a + b)| = ${s.value}`),
  domain: PAIR_D,
  keep: (pp) => pairOk(pp) && pp[0] * pp[2] + pp[1] * pp[3] !== 0,
  cap: 300,
  difficulty: ([p1, q1, p2, q2]) => (q1 === 1 && q2 === 1 && Math.abs(p1) + Math.abs(p2) <= 4 ? 1 : q1 === 1 && q2 === 1 ? 2 : 3),
  word: (pp) => `Two straight roads meet at a junction at the origin of a town map; together they are described by ${pairEq(pp)}. Find tan θ, where θ is the acute angle between the two roads.`,
  teach: {
    idea: "For ax² + 2hxy + by² = 0 the slopes satisfy m₁ + m₂ = −2h/b and m₁m₂ = a/b, so tan θ = |(m₁ − m₂)/(1 + m₁m₂)| becomes |2√(h² − ab)/(a + b)|.",
    method: "Read a, h (half the xy coefficient) and b, work out h² − ab, and use tan θ = |2√(h² − ab)/(a + b)|.",
    alternatives: [{ id: "slopes_first", title: "Find the slopes first", kind: "procedural", text: ["Put y = mx to get the two slopes.", "Use tan θ = |(m₁ − m₂)/(1 + m₁m₂)| for the acute angle."] }],
  },
  limits: "Pairs through the origin with slopes p/q (q up to 3) that are not perpendicular, each pair once; the answer is tan θ (no calculator angle).",
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
  word: (p) => `On a town plan, a new road is to be laid along ${lin2(p[0], p[1], cP(p, 0))} and an existing railway line runs along ${lin2(p[2], p[3], cP(p, 1))}. Are the road and the railway parallel, perpendicular, or neither?`,
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
    return { steps: [S("slope-curve", "differentiate", TAN, [tanEq(pp)], rs(tanLine(pp, 0)[0])), S("slope-line", "choose", TAN, [pp[3]], rs(m)), S("equation", "substitute", LINE, [rs(m)], ans)], answer: ans };
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
    if (pp[0] === 0) return pp[3] ? `A circular running track has equation ${tanEq(pp)} (units of 10 m, centre at the origin). From the point ${P2(x1, y1)} on the track, a runner cuts straight across towards the centre, along the normal. Find the equation of the runner's path as y = mx + c and type the right-hand side.` : `A circular running track has equation ${tanEq(pp)} (units of 10 m). At the point ${P2(x1, y1)} a runner leaves the track and runs straight on along the tangent. Find the equation of this straight path as y = mx + c and type the right-hand side.`;
    return `The cross-section of a dish antenna is the parabola ${tanEq(pp)}. At the point ${P2(x1, y1)} a support rod is fixed along the ${pp[3] ? "normal" : "tangent"} to the dish. Find the equation of the rod's line as y = mx + c and type the right-hand side.`;
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
function tanCurve(pp: number[]) {
  return `${pp[0] === 0 ? "circle" : "parabola"} ${tanEq(pp)}`;
}
/** The curve's equation alone (without its name). */
function tanEq([kind, p, q]: number[]) {
  return kind === 0 ? `x² + y² = ${p * p + q * q}` : `y² = ${4 * p}x`;
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
  return kind === 0 ? `parabola y² = ${4 * p}x` : kind === 1 ? `circle x² + y² = ${p * p}` : kind === 2 ? `ellipse ${p === 1 ? "x²" : `x²/${p * p}`} + ${q === 1 ? "y²" : `y²/${q * q}`} = 1` : `hyperbola ${p === 1 ? "x²" : `x²/${p * p}`} − ${q === 1 ? "y²" : `y²/${q * q}`} = 1`;
}
function tcN([kind, m, p, q]: number[]) {
  return kind === 1 ? p * p * (1 + m * m) : kind === 2 ? p * p * m * m + q * q : p * p * m * m - q * q;
}

// ================================================================ space: points, lines, planes

const asdist3: Def = {
  id: "asdist3",
  contract: { kind: "typed", typed: (p) => laObject("vector", "distance", { a: p.slice(0, 3), b: p.slice(3) }) },
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
  word: (p) => `In a 3D design program, the origin is a corner of a model room and the axes run along its edges (units in metres). ${nm(p[0] + p[1] + p[2])} places a small light at the point ${P3(p)}. Where does the light lie?`,
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
  prompt: (p) => `Find cos θ, where θ is the ${angWord(p)} between the lines ${lineVec(angPts(p)[0], p.slice(0, 3))} and ${lineVec(angPts(p)[1], p.slice(3), "μ")}.`,
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
  word: (p) => `Two straight steel rods in a roof frame lie along ${lineVec(angPts(p)[0], p.slice(0, 3))} and ${lineVec(angPts(p)[1], p.slice(3), "μ")} (units in metres). Find cos θ, where θ is the ${angWord(p)} between the rods.`,
  teach: {
    idea: "The angle between two lines is the angle between their direction vectors; the dot product gives its cosine, and |u·v| gives the acute angle. cos θ = 0 means the lines are perpendicular.",
    method: "Take the direction vectors u and v (the vectors multiplied by λ and μ), and work out cos θ = |u·v|/(|u||v|).",
    alternatives: [{ id: "direction_cosines", title: "Use direction cosines", kind: "procedural", text: ["Turn each direction vector into direction cosines (l, m, n).", "cos θ = |l₁l₂ + m₁m₂ + n₁n₂|."] }],
  },
  limits: "Direction vectors with components from −3 to 3 (not parallel); the answer is cos θ, possibly 0 for perpendicular lines.",
};
/** "the acute angle", or "the angle" when the lines are perpendicular (there is no acute angle). */
function angWord(p: number[]) {
  return dot(p.slice(0, 3), p.slice(3)) === 0 ? "angle" : "acute angle";
}
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
  word: (p) => {
    const L = relLines(p);
    return `Two drones fly along straight paths ${lineVec(L.A, L.u)} and ${lineVec(L.B, L.v, "μ")} (units in metres). Are the two paths parallel, intersecting, or skew?`;
  },
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
    const s0 = a * x0 + b * y0 + c * z0;
    // real slips: the root of a² + b² + c² forgotten, the constant's sign changed (s₀ − d), the distance of the origin
    // |d|/|n| (the point ignored), and the sum of the coefficients' sizes used as |n|
    // and, when those coincide (a plane like x = 0), whole numbers larger than the distance |n|/√N (never equal to it)
    return [String(n), sq(R_(Math.abs(s0 - d), N), N), ...(d !== 0 ? [sq(R_(Math.abs(d), N), N)] : []), rs(R_(n, Math.abs(a) + Math.abs(b) + Math.abs(c))), String(n + 1), String(n + 2)];
  },
  variants: () => [],
  explain: (s) => (s.id === "substitute" ? `Put the point into ax + by + cz + d: ${s.value}` : s.id === "normal" ? `|n| = √(a² + b² + c²) = ${s.value}` : `Distance = |ax₀ + by₀ + cz₀ + d|/√(a² + b² + c²) = ${s.value}`),
  domain: [[-4, 4], [-4, 4], [-4, 4], [-9, 9], [-4, 4], [-4, 4], [-4, 4]],
  cap: 400,
  difficulty: ([a, b, c]) => (Number.isInteger(Math.sqrt(a * a + b * b + c * c)) ? 1 : 2),
  word: ([a, b, c, d, x0, y0, z0]) => {
    const [surface, short] = a === 0 && b === 0 ? ["a flat glass ceiling", "ceiling"] : c === 0 ? ["an upright glass wall", "wall"] : ["a sloping glass roof", "roof"];
    return `A lamp hangs at ${P3([x0, y0, z0])} near ${surface} that lies in the plane ${lin3(a, b, c, d)} (units in metres). How far is the lamp from the ${short}?`;
  },
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
  contract: { kind: "typed", typed: ([a, b, c, d, op]) => complexObject("arithmetic", op ? "divide" : "multiply", { a: { re: a, im: b }, b: { re: c, im: d } }) },
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
  word: ([n]) => `${nm(Math.abs(n))}'s calculator app shows complex numbers and has a key that ${n > 0 ? "multiplies" : "divides"} the number on the screen by i. Starting from 1, the key is pressed ${Math.abs(n)} times, so the screen shows i${sup(n)}. Which number is on the screen?`,
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
  type: "expression",
  mc: true,
  // [j, s]: z = s × (the j-th special point)
  parse: none,
  reject: (p) => (!allIn(p, [[0, 14], [1, 9]]) ? "A complex number at a special angle, scaled by 1 to 9." : null),
  prompt: ([j, s]) => `Find the principal argument θ (−π < θ ≤ π) of z = ${argZ(j, s)}. Write θ in radians, in terms of π (you may type pi).`,
  solve: ([j, s]) => {
    const A = ANG[j];
    const basic = argBasic(A.k);
    return { steps: [S("modulus", "evaluate", CX, [argZ(j, s)], es(emul(A.mod, E_([s, 1])))), S("basic", "evaluate", TRIG, [rs(basic)], piStr(basic)), S("quadrant", "adjust", POLAR, [A.re[0], A.im[0]], piStr(A.k))], answer: piStr(A.k) };
  },
  // independent: r cos θ and r sin θ must give back the real and imaginary parts, with −π < θ ≤ π
  validate: ([j, s], v) => {
    const t = num1(v);
    if (t === null || t <= -Math.PI + 1e-12 || t > Math.PI + 1e-12) return false;
    const A = ANG[j];
    const x = s * A.re[0] * Math.sqrt(A.re[1]);
    const y = s * A.im[0] * Math.sqrt(A.im[1]);
    const r = Math.hypot(x, y);
    return close(r * Math.cos(t), x, 1e-9) && close(r * Math.sin(t), y, 1e-9);
  },
  bugs: ([j]) => {
    const A = ANG[j];
    const k = A.k;
    const basic = argBasic(k);
    const x = A.re[0];
    const y = A.im[0];
    return [
      B("basic-angle-only", "conceptual", POLAR, `The acute angle α with tan α = |y/x| was given; z is not in the first quadrant, so the argument is found from α using the signs of x and y.`, piStr(basic)),
      B("arctan-quadrant", "conceptual", POLAR, "tan⁻¹(y/x) only gives angles between −π/2 and π/2; when the real part is negative, add or subtract π.", x < 0 ? piStr(y > 0 ? rsub(k, R_(1)) : y < 0 ? radd(k, R_(1)) : R_(0)) : null),
      B("not-principal", "procedural", POLAR, "The angle was measured from 0 to 2π; the principal argument lies in (−π, π], so subtract 2π.", k[0] < 0 ? piStr(radd(k, R_(2))) : null),
      B("degrees-given", "procedural", POLAR, "The argument was given in degrees; in radians 180° is π (so 45° is π/4).", mi(Math.round(rv(k) * 180))),
    ];
  },
  distractors: ([j]) => {
    const k = ANG[j].k;
    return [piStr([-k[0], k[1]]), piStr(rsub(R_(1, 2), k)), piStr(R_(k[0], 2 * k[1]))];
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
  limits: "Numbers at the special angles (multiples of π/6 and π/4, and the axes), scaled by 1 to 9; the answer is θ in radians, in terms of π.",
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
  const ang = a < 0 ? `(${piStr(R_(a, 6))})` : piStr(R_(a, 6));
  return `${r === 1 ? "" : r}(cos ${ang} + i sin ${ang})`;
};
/** One pair of moduli per choice of arguments (the moduli do not change the argument, so they only vary the numbers). */
const polmR = ([, a1, , a2, op]: number[]) => [1 + ((((a1 * 7 + a2 * 3 + op * 5) % 6) + 6) % 6), 1 + ((((a1 * 5 + a2 * 11 + op) % 6) + 6) % 6)];
const aspolm: Def = {
  id: "aspolm",
  arity: 5,
  title: "Multiplying and dividing in polar form",
  competency: POLAR,
  type: "expression",
  mc: true,
  // [r₁, a₁, r₂, a₂, op]: z₁ = r₁ cis(a₁π/6), z₂ = r₂ cis(a₂π/6); op 0 product, 1 quotient; the principal argument
  parse: none,
  reject: (p) => (!allIn(p, [[1, 6], [-5, 6], [1, 6], [-5, 6], [0, 1]]) || p[1] === 0 || p[3] === 0 ? "Moduli 1 to 6 and arguments that are non-zero multiples of π/6 in (−π, π]." : null),
  prompt: ([r1, a1, r2, a2, op]) => `z₁ = ${polarTxt(r1, a1)} and z₂ = ${polarTxt(r2, a2)}. Find the principal argument θ (−π < θ ≤ π) of ${op ? "z₁/z₂" : "z₁z₂"}. Write θ in radians, in terms of π (you may type pi).`,
  solve: ([r1, a1, r2, a2, op]) => {
    const r = op ? R_(r1, r2) : R_(r1 * r2);
    const raw = op ? a1 - a2 : a1 + a2;
    const k = R_(prin6(raw), 6);
    return { steps: [S("modulus", op ? "divide" : "multiply", POLAR, [r1, r2], rs(r)), S("argument", op ? "subtract" : "add", POLAR, [rs(R_(raw, 6))], piStr(R_(raw, 6))), S("principal", "adjust", POLAR, [rs(R_(raw, 6))], piStr(k))], answer: piStr(k) };
  },
  // independent: multiply or divide the numbers in the form x + iy, then compare the direction with (cos θ, sin θ)
  validate: ([r1, a1, r2, a2, op], v) => {
    const t = num1(v);
    if (t === null || t <= -Math.PI + 1e-12 || t > Math.PI + 1e-12) return false;
    const z1 = [r1 * Math.cos((a1 * Math.PI) / 6), r1 * Math.sin((a1 * Math.PI) / 6)];
    const z2 = [r2 * Math.cos((a2 * Math.PI) / 6), r2 * Math.sin((a2 * Math.PI) / 6)];
    const w = op ? cmul(z1, [z2[0] / (r2 * r2), -z2[1] / (r2 * r2)]) : cmul(z1, z2);
    const m = Math.hypot(w[0], w[1]);
    return close(m * Math.cos(t), w[0], 1e-9) && close(m * Math.sin(t), w[1], 1e-9);
  },
  bugs: ([, a1, , a2, op]) => {
    const raw = op ? a1 - a2 : a1 + a2;
    const red = (k: R) => {
      let x = k;
      while (rv(x) > 1) x = rsub(x, R_(2));
      while (rv(x) <= -1) x = radd(x, R_(2));
      return x;
    };
    return [
      B("arguments-multiplied", "conceptual", POLAR, "The arguments were multiplied like the moduli; when complex numbers are multiplied, the arguments are added.", op ? null : piStr(red(R_(a1 * a2, 36)))),
      op
        ? B("subtracted-wrong-way", "procedural", POLAR, "The arguments were subtracted the wrong way round, as arg z₂ − arg z₁; arg(z₁/z₂) = arg z₁ − arg z₂.", piStr(R_(prin6(a2 - a1), 6)))
        : B("arguments-subtracted", "recall", POLAR, "The arguments were subtracted (as for a quotient); for a product they are added.", piStr(R_(prin6(a1 - a2), 6))),
      B("not-principal", "procedural", POLAR, "The argument was not brought into (−π, π]; add or subtract 2π.", raw > 6 || raw <= -6 ? piStr(R_(raw, 6)) : null),
    ];
  },
  distractors: ([, a1, , a2, op]) => {
    const s6 = prin6(op ? a1 - a2 : a1 + a2);
    return [piStr(R_(prin6(-s6 === -6 ? 3 : -s6), 6)), piStr(R_(prin6(s6 + 2), 6)), piStr(R_(prin6(s6 - 3), 6)), piStr(R_(prin6(s6 + 6), 6))];
  },
  variants: () => [],
  explain: (s) => (s.id === "modulus" ? `(The modulus is ${s.op === "divide" ? "r₁/r₂" : "r₁r₂"} = ${s.value}; it does not change the argument.)` : s.id === "argument" ? `${s.op === "subtract" ? "Subtract" : "Add"} the arguments: ${s.value}` : `The principal argument (add or subtract 2π if needed): ${s.value}`),
  domain: [[1, 6], [-5, 6], [1, 6], [-5, 6], [0, 1]],
  keep: (p) => {
    const [r1, r2] = polmR(p);
    return p[0] === r1 && p[2] === r2;
  },
  cap: 400,
  difficulty: ([, a1, , a2, op]) => {
    const raw = op ? a1 - a2 : a1 + a2;
    return raw > 6 || raw <= -6 ? 3 : op ? 2 : 1;
  },
  word: ([r1, a1, r2, a2, op]) => `In an AC circuit, quantities are written in polar form. ${op ? `A voltage V = ${polarTxt(r1, a1)} drives a current through an impedance Z = ${polarTxt(r2, a2)}, so the current is V/Z.` : `A current I = ${polarTxt(r1, a1)} flows through an impedance Z = ${polarTxt(r2, a2)}, so the voltage is IZ.`} Find the principal argument θ (−π < θ ≤ π) of the ${op ? "current" : "voltage"}, in radians and in terms of π (you may type pi).`,
  teach: {
    idea: "In polar form, multiplying complex numbers multiplies their moduli and adds their arguments; dividing divides the moduli and subtracts the arguments.",
    method: "Multiply (or divide) r₁ and r₂, add (or subtract) the arguments, and bring the result into (−π, π] by adding or subtracting 2π.",
    alternatives: [{ id: "rotations", title: "Stretch and turn", kind: "conceptual", text: ["Multiplying by z₂ stretches by r₂ and turns by arg z₂.", "So the turns add up and the stretches multiply."] }],
  },
  limits: "Moduli 1 to 6 and arguments that are multiples of π/6 (one pair of moduli for each pair of arguments); the answer is the principal argument in radians, in terms of π.",
};

// ---- circles in the Argand plane
const zminus = (a: number, b: number) => {
  const w = cz(a, b);
  return a === 0 && b === 0 ? "|z|" : w.startsWith("−") || w.includes(" ") ? `|z − (${w})|` : `|z − ${w}|`;
};
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
  word: (p) => `On a map of a district drawn as the Argand plane (units in km), a drone flies so that its position z always satisfies ${clocCond(p)}. Its path is a circle. Find the centre x₀ + iy₀ and the radius r of the path, typed as (x₀, y₀, r).`,
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
    return [tup([s[1], s[0], s[2]].map((x, i) => (i < 2 ? rs(R_(Math.round(x * 24), 24)) : aslocAns(p).split(", ")[2].replace(/\)$/, "")))), tup([rs(R_(Math.round(-s[0] * 24), 24)), rs(R_(Math.round(-s[1] * 24), 24)), aslocAns(p).split(", ")[2].replace(/\)$/, "")]), ...(p[0] === 1 ? [tup([rs(R_(p[1], p[5])), rs(R_(p[2], p[5])), String(p[3] * p[5])]), tup([rs(R_(p[1], p[5])), rs(R_(p[2], p[5])), String(p[3] + 1)])] : [])];
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
  if (t === 1) return `|${k}z${a === 0 && b === 0 ? "" : cz(a, b).startsWith("−") || cz(a, b).includes(" ") ? ` − (${cz(a, b)})` : ` − ${cz(a, b)}`}| = ${c}`;
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
  word: ([j, n]) => `In a computer-graphics program, each frame turns and stretches a point by multiplying its complex coordinate by w = ${dmBase(j)}. A point starts at 1. Use de Moivre's theorem to find where it is after ${n} frames, that is wⁿ, in the form x + iy. Type it as (x, y).`,
  solve: ([j, n]) => {
    const b = DMB[j];
    const R = epow(b.mod, n);
    const nk = rmul(b.k, R_(n));
    const [c, s] = trigE(nk);
    const ans = tup([es(emul(R, c)), es(emul(R, s))]);
    return { steps: [S("polar", "convert", POLAR, [es(b.mod), rs(b.k)], `${es(b.mod)}(cos ${pa(b.k)} + i sin ${pa(b.k)})`), S("power", "power", DM, [n, es(R)], `${es(R)}(cos ${pa(nk)} + i sin ${pa(nk)})`), S("evaluate", "evaluate", TRIG, [piStr(nk)], ans)], answer: ans };
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
  const ang = k[0] < 0 ? `(${piStr(k)})` : piStr(k);
  return `${M === 1 ? "" : M}(cos ${ang} + i sin ${ang})`;
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
    // for "A but not B" P(B) is given too (not needed, but it keeps different problems different and is a fair test)
    const given = q === 1 ? `P(A) = ${pf(a, N)}, P(B) = ${pf(b, N)} and P(A ∪ B) = ${pf(u, N)}` : `P(A) = ${pf(a, N)}, P(B) = ${pf(b, N)} and P(A ∩ B) = ${pf(c, N)}`;
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
    if (q === 1) return [B("assumed-independent", "conceptual", EV, "P(A ∩ B) was taken as P(A) × P(B); the events are not said to be independent, so use P(A ∩ B) = P(A) + P(B) − P(A ∪ B).", (a * b) / (N * N)), B("union-minus-one", "procedural", EV, "The overlap was found as P(A ∪ B) − P(A); that is the part of B outside A. Rearranging the addition rule gives P(A ∩ B) = P(A) + P(B) − P(A ∪ B).", (u - a) / N)];
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
  word: (p) => {
    const [A, Bm] = mexPair(p);
    return `Eight raffle tickets numbered 1 to 8 are in a bag at a school fair, and ${nm(p[1])} draws one at random. A prize of a book goes with the numbers ${setTxt(A)} (event A) and a prize of a pen with the numbers ${setTxt(Bm)} (event B). Which describes the events A and B?`;
  },
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
  explain: (s) => (s.id === "joint" ? `P(${"machine"} and defective) = ${Number(s.inputs[0]) * 10}% × ${s.inputs[1]}% = ${s.value}` : s.id === "total" ? `Total probability of a defective bolt = ${s.value}` : `Bayes: divide the machine's share of defectives by the total: ${s.inputs[0]}/${s.inputs[1]}`),
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

/** "a 1", "a 1 or 2", "a 1, 2 or 3": the faces 1 to f of a die. */
const facesTxt = (f: number) => (f === 1 ? "a 1" : `a ${Array.from({ length: f - 1 }, (_, i) => i + 1).join(", ")} or ${f}`);
/** The names alternate: even positions are girls' names (she), odd positions boys' names (he). */
const pron = (k: number) => (((k % NAMES.length) + NAMES.length) % NAMES.length) % 2 === 0 ? "she" : "he";
const astotp: Def = {
  id: "astotp",
  arity: 5,
  title: "Bayes' theorem: which bag the ball came from",
  competency: BAY,
  type: "fraction",
  mc: true,
  // [f, r₁, b₁, r₂, b₂]: a die chooses Bag I on 1 to f, otherwise Bag II; the ball is red: P(Bag I | red)
  parse: none,
  reject: (p) => (!allIn(p, [[1, 5], [1, 6], [1, 6], [1, 6], [1, 6]]) || (p[1] * (p[3] + p[4]) === p[3] * (p[1] + p[2])) ? "Two bags of 1 to 6 red and 1 to 6 black balls with different proportions of red, chosen by a die." : null),
  prompt: ([f, r1, b1, r2, b2]) => `A die is thrown. If it shows ${facesTxt(f)}, a ball is drawn from Bag I, which has ${r1} red and ${b1} black balls; otherwise a ball is drawn from Bag II, which has ${r2} red and ${b2} black balls. The ball drawn is red. Find the probability that it was drawn from Bag I.`,
  solve: ([f, r1, b1, r2, b2]) => {
    const [n1, n2] = [r1 + b1, r2 + b2];
    const t1 = (f / 6) * (r1 / n1);
    const t2 = ((6 - f) / 6) * (r2 / n2);
    return { steps: [S("bag1", "multiply", COND, [pf(f, 6), pf(r1, n1)], t1), S("bag2", "multiply", COND, [pf(6 - f, 6), pf(r2, n2)], t2), S("total", "add", "MATH.probability.total-probability", [], t1 + t2), S("bayes", "divide", BAY, [], t1 / (t1 + t2))], answer: (f * r1 * n2) / (f * r1 * n2 + (6 - f) * r2 * n1) };
  },
  // independent: list every equally likely (die face, ball in Bag I, ball in Bag II); among the red draws, count those
  // from Bag I
  validate: ([f, r1, b1, r2, b2], v) => {
    if (typeof v !== "number") return false;
    const [n1, n2] = [r1 + b1, r2 + b2];
    let red = 0;
    let fromI = 0;
    for (let face = 1; face <= 6; face++)
      for (let i = 0; i < n1; i++)
        for (let j = 0; j < n2; j++)
          if (face <= f ? i < r1 : j < r2) {
            red++;
            if (face <= f) fromI++;
          }
    return Math.abs(v - fromI / red) < 1e-12;
  },
  bugs: ([f, r1, b1, r2, b2]) => {
    const [n1, n2] = [r1 + b1, r2 + b2];
    const t1 = (f * r1) / (6 * n1);
    const t2 = ((6 - f) * r2) / (6 * n2);
    return [
      B("joint-not-divided", "procedural", BAY, "P(Bag I and red) was given; the ball is known to be red, so divide by the total probability of red, P(red) = P(Bag I and red) + P(Bag II and red).", t1),
      B("condition-reversed", "conceptual", COND, `P(red | Bag I) = ${pf(r1, n1)} was given; the question asks the reverse, P(Bag I | red).`, r1 / n1),
      B("forward-question", "conceptual", BAY, "The probability that the ball is red was found (total probability); here the colour is known and the bag is asked, so that total is the denominator.", t1 + t2),
      B("prior-only", "conceptual", BAY, `The chance of choosing Bag I before the draw, ${pf(f, 6)}, was given; knowing the ball is red changes it.`, f / 6),
    ];
  },
  variants: () => [],
  explain: (s) => (s.id === "bag1" ? `Bag I and red: ${s.inputs[0]} × ${s.inputs[1]}` : s.id === "bag2" ? `Bag II and red: ${s.inputs[0]} × ${s.inputs[1]}` : s.id === "total" ? "Add the two branches: P(red), the total probability" : "Bayes: P(Bag I | red) = P(Bag I and red) ÷ P(red)"),
  domain: [[1, 5], [1, 6], [1, 6], [1, 6], [1, 6]],
  cap: 400,
  difficulty: ([f, r1, b1, r2, b2]) => (f === 3 ? 1 : (r1 + b1) === (r2 + b2) ? 2 : 3),
  word: ([f, r1, b1, r2, b2]) => {
    const who = nm(f + r1);
    const pr = pron(f + r1);
    return `${who} throws a die to choose a box. On ${facesTxt(f)} ${pr} takes a pen from Box I, which has ${r1} blue and ${b1} black pens; otherwise ${pr} takes a pen from Box II, which has ${r2} blue and ${b2} black pens. The pen ${pr} takes is blue. Find the probability that it came from Box I.`;
  },
  teach: {
    idea: "Bayes' theorem turns the question round: P(Bag I | red) = P(Bag I and red) / P(red), and P(red) adds up the red branches of both bags (total probability).",
    method: "Draw a tree: first the bag (with the die's probabilities), then the colour. Multiply along each red branch; divide the Bag I red branch by the sum of both red branches.",
    alternatives: [{ id: "count_all", title: "Count equally likely cases", kind: "conceptual", text: ["Imagine many repeats: in 6 throws, f choose Bag I and the rest Bag II; scale up so the balls divide evenly.", "Count all the red draws and the red draws from Bag I: the answer is the second count divided by the first."] }],
  },
  limits: "Two bags of up to 6 red and 6 black balls chosen by a die, the bag asked given the colour; the forward question (P(red)) is the total-probability family, and three or more sources are in the machines family.",
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
      if (2 * a !== d && 2 * r !== n) out.push(B("p-q-swapped", "procedural", BIN, "p was raised to the number of failures and q to the number of successes; it is pʳ qⁿ⁻ʳ with r successes.", (C(n, r) * a ** (n - r) * (d - a) ** r) / d ** n));
    } else {
      out.push(B("one-value-only", "conceptual", BIN, `'${mode === 1 ? "At least" : "At most"} ${r}' includes every value ${mode === 1 ? `from ${r} up to ${n}` : `from 0 up to ${r}`}, not only X = ${r}.`, binP(n, a, d, [r])));
      out.push(B("boundary-left-out", "procedural", BIN, `X = ${r} itself belongs to 'X ${BMODE[mode]} ${r}'; it was left out.`, binP(n, a, d, binSet(n, r, mode).filter((k) => k !== r))));
    }
    return out;
  },
  variants: () => [],
  explain: (s) => (s.id === "formula" ? `For a binomial distribution: ${s.value}` : s.id === "terms" ? `Add P(X = k) for k = ${s.inputs.join(", ")}` : s.inputs[0] === "1 −" ? "Use the complement: subtract that sum from 1" : "That sum is the answer"),
  // exact fractions (one integer division each), so no option shows a rounding residue
  distractors: ([n, a, d, r]) => {
    const D = d ** n;
    const k = Math.round(C(n, r) * a ** r * (d - a) ** (n - r));
    return [(D - k) / D, 2 * k <= D ? (2 * k) / D : k / (2 * D), (C(n, r) * a ** r) / D];
  },
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
  distractors: ([n, a, d, mode]) => (mode ? [tup([String(n + 1), pf(a, d)]), tup([String(2 * n), pf(a, 2 * d)])] : [tup([rs(R_(n * a, d)), rs(R_(n * a * (d - a), d))]), tup([rs(R_(n * (d - a), d)), rs(R_(n * a * (d - a), d * d))]), tup([rs(R_(n * a, d)), rs(R_(2 * n * a * (d - a), d * d))]), tup([rs(R_(n * a + d, d)), rs(R_(n * a * (d - a), d * d))])]),
  variants: () => [],
  explain: (s) => (s.id === "mean" ? `Mean = np = ${s.inputs[0]} × ${s.inputs[1]} = ${s.value}` : s.id === "variance" ? `Variance = npq = ${s.inputs[0]} × ${s.inputs[1]} × ${s.inputs[2]} = ${s.value}` : s.id === "q" ? `q = npq ÷ np = ${s.inputs[0]} ÷ ${s.inputs[1]} = ${s.value}` : s.id === "p" ? `p = 1 − q = ${s.value}` : `n = mean ÷ p = ${s.inputs[0]} ÷ ${s.inputs[1]} = ${s.value}`),
  domain: [[2, 40], [1, 9], [2, 10], [0, 1]],
  cap: 400,
  difficulty: ([n, a, d, mode]) => (mode === 0 && (n * a) % d === 0 ? 1 : mode === 0 ? 2 : 3),
  // a large p reads as a success (a seed germinating), a small one as a fault (a defective bulb)
  word: ([n, a, d, mode]) => {
    const good = 2 * a > d;
    if (mode) return good ? `The number of seeds that germinate in a packet is binomial, with mean ${rs(R_(n * a, d))} and variance ${rs(R_(n * a * (d - a), d * d))}. How many seeds are in a packet, and what is the probability that a seed germinates? Type (n, p).` : `The number of defective bulbs in a box is binomial, with mean ${rs(R_(n * a, d))} and variance ${rs(R_(n * a * (d - a), d * d))}. How many bulbs are in a box, and what is the probability that a bulb is defective? Type (n, p).`;
    return good ? `Each seed in a packet germinates with probability ${pf(a, d)}, independently of the others. A packet holds ${n} seeds. Find the mean and variance of the number of seeds that germinate, typed as (mean, variance).` : `Each bulb made by a machine is defective with probability ${pf(a, d)}, independently. A box holds ${n} bulbs. Find the mean and variance of the number of defective bulbs in a box, typed as (mean, variance).`;
  },
  teach: {
    idea: "A binomial count is a sum of n independent 0–1 trials, each with mean p and variance pq, so the mean is np and the variance is npq.",
    method: "Mean = np, variance = npq with q = 1 − p. Going back: q = variance ÷ mean, p = 1 − q, n = mean ÷ p.",
    alternatives: [{ id: "one_trial", title: "Start from one trial", kind: "conceptual", text: ["One trial scores 1 with probability p and 0 with probability q: mean p, variance p − p² = pq.", "n independent trials add their means and their variances."] }],
  },
  limits: "p a simple fraction; n up to 12 for finding the mean and variance, up to 40 for finding n and p.",
};

// ================================================================ gap@1 additions

/** FNV-1a hash: a fixed, parameter-dependent order of options, and deterministic thinning of large domains. */
const fnv = (t: string) => {
  let x = 0x811c9dc5;
  for (let i = 0; i < t.length; i++) x = Math.imul(x ^ t.charCodeAt(i), 0x01000193) >>> 0;
  return x;
};
const mixed = (xs: string[], key: string) => [...xs].sort((a, b) => fnv(`${key}:${a}`) - fnv(`${key}:${b}`) || (a < b ? -1 : 1));
/** Keep about one parameter choice in m (a fixed, hash-chosen thinning of a large domain). */
const thin = (p: number[], m: number) => fnv(`thin:${p}`) % m === 0;
/** q√m as an exact-answer coefficient in front of a letter: "2x", "−x", "(√3/3)x". */
const coefE = (e: E, v: string) => {
  const s = es(e);
  if (s === "0") return "";
  if (s === "1") return v;
  if (s === "−1") return `−${v}`;
  return /[/√]/.test(s) ? `${s.startsWith("−") ? "−" : ""}(${s.replace(/^−/, "")})${v}` : `${s}${v}`;
};
/** mx + c (surd m and c allowed) as the right-hand side of y = mx + c. */
const rhsE = (m: E, c: E) => {
  const a = coefE(m, "x");
  const b = es(c);
  if (!a) return b;
  if (b === "0") return a;
  return `${a} ${b.startsWith("−") ? "−" : "+"} ${b.replace(/^−/, "")}`;
};
/** mx + c for rationals. */
const rhsR = (m: R, c: R) => poly([[m, "x"], [c, ""]]);
/** A straight-line answer y = f(x) read back: [slope, intercept] if it is a line, else null. */
const lineOf = (v: Value): [number, number] | null => {
  const f = fnOf(v);
  if (!f) return null;
  const y0 = f({ x: 0 });
  const y1 = f({ x: 1 });
  const y2 = f({ x: -2.5 });
  if (![y0, y1, y2].every(Number.isFinite) || !close(y2 - y0, -2.5 * (y1 - y0), 1e-9)) return null;
  return [y1 - y0, y0];
};

const fracTxt = (x: number) => {
  for (let q = 1; q <= 400; q++) if (Math.abs(Math.round(x * q) - x * q) < 1e-9) return rs(R_(Math.round(x * q), q));
  return String(x);
};

// ---- complex numbers: sums, differences, inverses, conjugates
const ascinvOk = ([a, b, c, d, op]: number[]) => {
  if (op === 2) return allIn([a, b], [[-6, 6], [-6, 6]]) && (a !== 0 || b !== 0) && b !== 0 && c === 0 && d === 0;
  return (op === 0 || op === 1) && allIn([a, b, c, d], [[-5, 5], [-5, 5], [1, 4], [-3, 3]]) && b !== 0 && d !== 0 && (((a * 7 + b * 3 + c + d * 5) % 7) + 7) % 7 === 0;
};
const ascinv: Def = {
  id: "ascinv",
  contract: { kind: "typed", typed: ([a, b, c, d, op]) => complexObject("arithmetic", ["add", "subtract", "reciprocal"][op], op === 2 ? { a: { re: a, im: b } } : { a: { re: a, im: b }, b: { re: c, im: d } }) },
  arity: 5,
  title: "Adding and subtracting complex numbers, and the multiplicative inverse",
  competency: CX,
  type: "tuple",
  mc: true,
  // [a, b, c, d, op]: (a + bi) + (c + di) (op 0), (a + bi) − (c + di) (op 1), 1/(a + bi) (op 2, c = d = 0)
  parse: none,
  reject: (p) => (ascinvOk(p) ? null : "Two complex numbers with small whole-number parts, or one non-zero complex number to invert."),
  prompt: ([a, b, c, d, op]) => (op === 2 ? `Find the multiplicative inverse of z = ${cz(a, b)} in the form x + iy. Type it as the pair (x, y).` : `Write (${cz(a, b)}) ${op ? "−" : "+"} (${cz(c, d)}) in the form x + iy. Type the answer as the pair (x, y).`),
  solve: ([a, b, c, d, op]) => {
    if (op === 2) {
      const N = a * a + b * b;
      const ans = pairT(R_(a, N), R_(-b, N));
      return { steps: [S("conjugate", "multiply", CX, [cz(a, -b)], `${cz(a, -b)}/${N}`), S("split", "divide", CX, [N], ans)], answer: ans };
    }
    const s = op ? -1 : 1;
    const ans = pairT(R_(a + s * c), R_(b + s * d));
    return { steps: [S("real", op ? "subtract" : "add", CX, [a, c], mi(a + s * c)), S("imag", op ? "subtract" : "add", CX, [b, d], mi(b + s * d))], answer: ans };
  },
  // independent: the inverse operation — subtract (or add) the second number back, or multiply the inverse by z to get 1
  validate: ([a, b, c, d, op], v) => {
    const z = nums(v);
    if (!z || z.length !== 2) return false;
    if (op === 2) {
      const one = cmul(z, [a, b]);
      return close(one[0], 1, 1e-9) && close(one[1], 0, 1e-9);
    }
    const back = op ? [z[0] + c, z[1] + d] : [z[0] - c, z[1] - d];
    return close(back[0], a, 1e-9) && close(back[1], b, 1e-9);
  },
  bugs: ([a, b, c, d, op]) => {
    if (op === 2) {
      const N = a * a + b * b;
      return [
        B("parts-inverted", "conceptual", CX, "Each part was turned upside down, 1/a + (1/b)i; 1/(a + bi) is found by multiplying the top and the bottom by the conjugate a − bi.", a !== 0 ? pairT(R_(1, a), R_(1, b)) : null),
        B("not-divided", "procedural", CX, `The conjugate ${cz(a, -b)} was given without dividing by a² + b² = ${N}.`, N === 1 ? null : pairT(R_(a), R_(-b))),
        B("denominator-sign", "procedural", CX, `(a + bi)(a − bi) was worked out as a² − b²; it is a² + b² = ${N}.`, a * a === b * b ? null : pairT(R_(a, a * a - b * b), R_(-b, a * a - b * b))),
      ];
    }
    return op
      ? [B("sign-imag", "procedural", CX, `Only the real part of ${cz(c, d)} was subtracted; the minus sign applies to both parts: −(c + di) = −c − di.`, pairT(R_(a - c), R_(b + d))), B("parts-mixed", "procedural", CX, "A real part was combined with an imaginary part; add (or subtract) real parts with real parts and imaginary parts with imaginary parts.", pairT(R_(a - d), R_(b - c)))]
      : [B("parts-mixed", "procedural", CX, "A real part was combined with an imaginary part; add real parts with real parts and imaginary parts with imaginary parts.", pairT(R_(a + d), R_(b + c))), B("subtracted", "procedural", CX, "The second number was subtracted instead of added.", pairT(R_(a - c), R_(b - d)))];
  },
  distractors: ([a, b, c, d, op]) => (op === 2 ? [pairT(R_(-a, a * a + b * b), R_(b, a * a + b * b)), pairT(R_(b, a * a + b * b), R_(a, a * a + b * b))] : [pairT(R_(a + c + 1), R_(b + (op ? -d : d))), pairT(R_(b + (op ? -d : d)), R_(a + (op ? -c : c)))]),
  variants: () => [],
  explain: (s) => (s.id === "real" ? `Real parts: ${mi(Number(s.inputs[0]))} and ${mi(Number(s.inputs[1]))} give ${s.value}` : s.id === "imag" ? `Imaginary parts: ${mi(Number(s.inputs[0]))} and ${mi(Number(s.inputs[1]))} give ${s.value}` : s.id === "conjugate" ? `Multiply the top and the bottom by the conjugate ${s.inputs[0]}: ${s.value}` : `Divide each part by ${s.inputs[0]}: ${s.value}`),
  domain: [[-6, 6], [-6, 6], [0, 4], [-3, 3], [0, 2]],
  keep: (p) => ascinvOk(p),
  cap: 400,
  difficulty: ([a, b, , , op]) => (op === 0 ? 1 : op === 1 ? 2 : a * b === 0 ? 2 : 3),
  word: ([a, b, c, d, op]) => (op === 2 && a <= 0 ? `In a drawing program, multiplying a point (written as a complex number) by z = ${cz(a, b)} turns and stretches the picture about the origin. Multiplying by 1/z undoes this. Find 1/z in the form x + iy, typed as (x, y).` : op === 2 ? `In an AC circuit an impedance is written as the complex number Z = ${cz(a, b)} ohms. Its admittance is 1/Z. Find the admittance in the form x + iy, typed as (x, y).` : `Two AC voltages, written as complex numbers, are V₁ = ${cz(a, b)} volts and V₂ = ${cz(c, d)} volts. Find V₁ ${op ? "−" : "+"} V₂ in the form x + iy, typed as (x, y).`),
  teach: {
    idea: "Complex numbers add and subtract part by part: real with real, imaginary with imaginary. The inverse 1/z uses the conjugate: z z̄ = a² + b² is a real number.",
    method: "For a sum or difference, combine the real parts and the imaginary parts separately. For 1/(a + bi), multiply the top and the bottom by a − bi to get (a − bi)/(a² + b²), then split into real and imaginary parts.",
    alternatives: [{ id: "vectors", title: "Arrows in the Argand plane", kind: "conceptual", text: ["Draw z₁ and z₂ as arrows from the origin; z₁ + z₂ is the diagonal of the parallelogram they make.", "1/z points in the direction of z̄ and has length 1/|z|."] }],
  },
  limits: "Small whole-number parts; products and quotients are the family ascop.",
};

const asconjOk = ([a, b, c, d, k]: number[]) => {
  if (k === 2) return allIn([a, b], [[-6, 6], [-6, 6]]) && a !== 0 && b !== 0 && c === 0 && d === 0;
  return k >= 0 && k <= 3 && k !== 2 && allIn([a, b, c, d], [[-4, 4], [-4, 4], [-4, 4], [1, 4]]) && b !== 0 && c !== 0 && thin([a, b, c, d, k], k === 1 ? 2 : 3);
};
const conjTxt = (k: number, a: number, b: number, c: number, d: number) => [`the conjugate of (${cz(a, b)})(${cz(c, d)})`, `the conjugate of (${cz(a, b)}) ÷ (${cz(c, d)})`, `z z̄, where z = ${cz(a, b)}`, `z̄₁ z₂, where z₁ = ${cz(a, b)} and z₂ = ${cz(c, d)}`][k];
const asconj: Def = {
  id: "asconj",
  arity: 5,
  title: "Conjugates of complex numbers and their properties",
  competency: CX,
  skill: "conjugates",
  type: "tuple",
  mc: true,
  // [a, b, c, d, k]: z₁ = a + bi, z₂ = c + di; k 0 conj(z₁z₂), 1 conj(z₁/z₂), 2 z z̄ (c = d = 0), 3 z̄₁z₂
  parse: none,
  reject: (p) => (asconjOk(p) ? null : "Complex numbers with small whole-number parts."),
  prompt: ([a, b, c, d, k]) => `Find ${conjTxt(k, a, b, c, d)}, in the form x + iy. Type it as the pair (x, y).`,
  solve: ([a, b, c, d, k]) => {
    if (k === 2) return { steps: [S("property", "multiply", CX, [a, b], `z z̄ = |z|² = ${a * a + b * b}`)], answer: pairT(R_(a * a + b * b), R_(0)) };
    if (k === 3) {
      const ans = pairT(R_(a * c + b * d), R_(a * d - b * c));
      return { steps: [S("conj", "conjugate", CX, [cz(a, b)], cz(a, -b)), S("product", "multiply", CX, [cz(a, -b), cz(c, d)], ans)], answer: ans };
    }
    if (k === 0) {
      const ans = pairT(R_(a * c - b * d), R_(-(a * d + b * c)));
      return { steps: [S("property", "conjugate", CX, [], "conj(z₁z₂) = z̄₁ z̄₂"), S("product", "multiply", CX, [cz(a, -b), cz(c, -d)], ans)], answer: ans };
    }
    const N = c * c + d * d;
    const ans = pairT(R_(a * c + b * d, N), R_(-(b * c - a * d), N));
    return { steps: [S("property", "conjugate", CX, [], "conj(z₁/z₂) = z̄₁/z̄₂"), S("product", "divide", CX, [cz(a, -b), cz(c, -d)], ans)], answer: ans };
  },
  // independent: the answer is reached through moduli and arguments (a conjugate has the same modulus and the opposite argument)
  validate: ([a, b, c, d, k], v) => {
    const z = nums(v);
    if (!z || z.length !== 2) return false;
    const r1 = Math.hypot(a, b);
    const t1 = Math.atan2(b, a);
    const r2 = Math.hypot(c, d);
    const t2 = Math.atan2(d, c);
    const [r, t] = k === 0 ? [r1 * r2, -(t1 + t2)] : k === 1 ? [r1 / r2, -(t1 - t2)] : k === 2 ? [r1 * r1, 0] : [r1 * r2, t2 - t1];
    return close(z[0], r * Math.cos(t), 1e-9) && close(z[1], r * Math.sin(t), 1e-9);
  },
  bugs: ([a, b, c, d, k]) => {
    if (k === 2) return [B("i-squared", "recall", CX, `(a + bi)(a − bi) was expanded with i² = +1, giving a² − b²; i² = −1, so z z̄ = a² + b².`, a * a === b * b ? null : pairT(R_(a * a - b * b), R_(0))), B("z-squared", "conceptual", CX, "z was multiplied by itself instead of by its conjugate.", pairT(R_(a * a - b * b), R_(2 * a * b)))];
    if (k === 3) return [B("wrong-one", "procedural", CX, "The conjugate of z₂ was taken instead of z₁.", pairT(R_(a * c + b * d), R_(b * c - a * d))), B("no-conjugate", "procedural", CX, "The conjugate was not taken at all.", pairT(R_(a * c - b * d), R_(a * d + b * c)))];
    if (k === 0) return [B("not-conjugated", "procedural", CX, "The product was found but its conjugate was not taken.", pairT(R_(a * c - b * d), R_(a * d + b * c))), B("one-factor", "conceptual", CX, "Only the first factor was conjugated; conj(z₁z₂) = z̄₁ z̄₂ needs both.", pairT(R_(a * c + b * d), R_(a * d - b * c)))];
    const N = c * c + d * d;
    return [B("not-conjugated", "procedural", CX, "The quotient was found but its conjugate was not taken.", pairT(R_(a * c + b * d, N), R_(b * c - a * d, N))), B("negated", "conceptual", CX, "Both parts were negated; the conjugate changes the sign of the imaginary part only.", pairT(R_(-(a * c + b * d), N), R_(b * c - a * d, N)))];
  },
  distractors: ([a, b]) => [pairT(R_(a), R_(-b)), pairT(R_(-a), R_(b))],
  variants: () => [],
  explain: (s) => (s.id === "property" ? `Use ${s.value}` : s.id === "conj" ? `The conjugate of ${s.inputs[0]} is ${s.value}` : `Work it out: ${s.value}`),
  domain: [[-6, 6], [-6, 6], [-4, 4], [0, 4], [0, 3]],
  keep: (p) => asconjOk(p),
  cap: 300,
  difficulty: ([, , , , k]) => (k === 2 ? 1 : k === 1 ? 3 : 2),
  teach: {
    idea: "The conjugate of z = a + bi is z̄ = a − bi: its reflection in the real axis. Conjugation respects arithmetic: conj(z₁ ± z₂) = z̄₁ ± z̄₂, conj(z₁z₂) = z̄₁z̄₂, conj(z₁/z₂) = z̄₁/z̄₂, and z z̄ = |z|² = a² + b².",
    method: "Either work out the product or quotient first and then change the sign of its imaginary part, or conjugate each number first and then combine them; both give the same answer.",
    alternatives: [{ id: "mirror", title: "A mirror in the real axis", kind: "conceptual", text: ["z̄ is z reflected in the real axis: same length, opposite angle.", "Multiplying adds angles, so conj(z₁z₂) has angle −(θ₁ + θ₂), which is the angle of z̄₁z̄₂."] }],
  },
  limits: "Small whole-number parts; conjugates in equations to be solved are left out.",
};

// ---- straight lines: slope and inclination, collinearity, forms, conversions, families, sides
const INCL = [0, 30, 45, 60, 120, 135, 150];
const tanE = (deg: number): E => ({ 0: E_(R_(0)), 30: E_(R_(1, 3), 3), 45: E_(R_(1)), 60: E_(R_(1), 3), 120: E_(R_(-1), 3), 135: E_(R_(-1)), 150: E_(R_(-1, 3), 3) } as Record<number, E>)[deg];
const asslopeOk = ([kind, i, x1, y1]: number[]) => i >= 0 && i <= 6 && (kind === 1 ? Math.abs(x1) <= 3 && Math.abs(y1) <= 3 && (x1 !== 0 || y1 !== 0) : (kind === 0 || kind === 2) && x1 === 0 && y1 === 0);
const asslope: Def = {
  id: "asslope",
  arity: 4,
  title: "Slope from the inclination, and the inclination from the slope",
  competency: LINE,
  skill: "slope and inclination",
  type: "exact",
  mc: true,
  // [kind, i, x1, y1]: inclination INCL[i]; 0 the slope, 1 the line through (x1, y1) as y = mx + c, 2 the inclination from the slope
  parse: none,
  reject: (p) => (asslopeOk(p) ? null : "An inclination of 0°, 30°, 45°, 60°, 120°, 135° or 150°."),
  prompt: ([kind, i, x1, y1]) =>
    kind === 0
      ? `A straight line makes an angle of ${INCL[i]}° with the positive direction of the x-axis. Find its slope.`
      : kind === 1
        ? `A straight line passes through ${P2(x1, y1)} and has inclination ${INCL[i]}°. Write its equation as y = mx + c and type the right-hand side.`
        : `A straight line has slope ${es(tanE(INCL[i]))}. Find its inclination θ in degrees (0° ≤ θ < 180°).`,
  solve: ([kind, i, x1, y1]) => {
    const m = tanE(INCL[i]);
    if (kind === 2) return { steps: [S("tan", "solve", TRIG, [es(m)], INCL[i])], answer: String(INCL[i]) };
    if (kind === 0) return { steps: [S("tan", "evaluate", TRIG, [INCL[i]], es(m))], answer: es(m) };
    const ans = asslopeLine(m, x1, y1);
    return { steps: [S("tan", "evaluate", TRIG, [INCL[i]], es(m)), S("line", "write", LINE, [x1, y1], ans)], answer: ans };
  },
  // independent: Math.tan / Math.atan of the angle, and the line checked through the point with that slope
  validate: ([kind, i, x1, y1], v) => {
    const th = (INCL[i] * Math.PI) / 180;
    if (kind === 2) {
      const t = num1(v);
      return t !== null && close(t, INCL[i], 1e-12) && close(Math.tan((t * Math.PI) / 180), ev(tanE(INCL[i])), 1e-9);
    }
    if (kind === 0) {
      const t = num1(v);
      return t !== null && close(t, Math.tan(th), 1e-9);
    }
    const L = lineOf(v);
    return !!L && close(L[0], Math.tan(th), 1e-9) && close(L[0] * x1 + L[1], y1, 1e-9);
  },
  bugs: ([kind, i, x1, y1]) => {
    const deg = INCL[i];
    if (kind === 2)
      return [deg > 90 ? B("acute-only", "conceptual", LINE, `The acute angle ${180 - deg}° was given; a negative slope means the line slopes downwards, so its inclination is obtuse.`, String(180 - deg)) : B("complement", "recall", LINE, "The angle with the y-axis was given; the inclination is measured from the positive x-axis.", deg === 0 ? null : String(90 - deg))].filter((b) => b.predict !== null);
    const cotE = deg === 30 ? E_(R_(1), 3) : deg === 45 ? E_(R_(1)) : deg === 60 ? E_(R_(1, 3), 3) : deg === 120 ? E_(R_(-1, 3), 3) : deg === 135 ? E_(R_(-1)) : deg === 150 ? E_(R_(-1), 3) : null;
    const m = tanE(deg);
    if (kind === 0) return [B("cot", "recall", TRIG, `The ratio was turned over (cot ${deg}° instead of tan ${deg}°); the slope is the rise over the run, tan θ.`, cotE && es(cotE) !== es(m) ? es(cotE) : null), ...(deg > 90 ? [B("sign", "conceptual", LINE, `The sign was lost: a line with inclination between 90° and 180° slopes downwards, so tan ${deg}° is negative.`, es({ q: rabs(m.q), m: m.m }))] : [])].filter((b) => b.predict !== null);
    return [
      B("cot", "recall", TRIG, `cot ${deg}° was used as the slope instead of tan ${deg}°.`, cotE && es(cotE) !== es(m) ? asslopeLine(cotE, x1, y1) : null),
      B("intercept-sign", "procedural", LINE, "In y − y₁ = m(x − x₁), the term −m·x₁ was added instead of subtracted.", x1 !== 0 && deg !== 0 ? asslopeLine(m, -x1, y1, true) : null),
    ].filter((b) => b.predict !== null);
  },
  distractors: ([kind, i, x1, y1]) => {
    const deg = INCL[i];
    if (kind === 2) return [String((deg + 30) % 180), String((deg + 90) % 180)];
    const sinE = { 0: E_(R_(0)), 30: E_(R_(1, 2)), 45: E_(R_(1, 2), 2), 60: E_(R_(1, 2), 3), 120: E_(R_(1, 2), 3), 135: E_(R_(1, 2), 2), 150: E_(R_(1, 2)) }[deg]!;
    const neg = { q: rmul(tanE(deg).q, R_(-1)), m: tanE(deg).m };
    return kind === 0 ? [es(sinE), es(neg), "1", "−1", "√3"] : [asslopeLine(sinE, x1, y1), asslopeLine(neg, x1, y1), asslopeLine(E_(R_(1)), x1, y1), asslopeLine(E_(R_(-1)), x1, y1), asslopeLine(E_(R_(2)), x1, y1)];
  },
  variants: () => [],
  explain: (s) => (s.id === "tan" ? (typeof s.value === "number" ? `tan θ = ${s.inputs[0]} with 0° ≤ θ < 180° gives θ = ${s.value}°` : `m = tan ${s.inputs[0]}° = ${s.value}`) : `y − ${par(Number(s.inputs[1]))} = m(x − ${par(Number(s.inputs[0]))}), so y = ${s.value}`),
  domain: [[0, 2], [0, 6], [-3, 3], [-3, 3]],
  keep: (p) => asslopeOk(p),
  difficulty: ([kind, i]) => (kind === 0 && i <= 3 ? 1 : kind === 1 ? 3 : 2),
  teach: {
    idea: "The inclination θ of a line is the angle it makes with the positive x-axis (0° ≤ θ < 180°); its slope is m = tan θ. Upward lines have acute θ and positive slope; downward lines have obtuse θ and negative slope.",
    method: "Slope from the angle: m = tan θ (exact values for 30°, 45°, 60° and their supplements). Angle from the slope: find the acute angle with tan = |m|, and use 180° minus it when m is negative. Then y − y₁ = m(x − x₁).",
    alternatives: [{ id: "triangle", title: "Rise over run", kind: "conceptual", text: ["Walk 1 unit to the right along the x-axis; the line rises tan θ units.", "For 120° the line falls: tan 120° = −tan 60° = −√3."] }],
  },
  limits: "The standard angles 0°, 30°, 45°, 60°, 120°, 135° and 150°; vertical lines (90°, no slope) are left out.",
};
function asslopeLine(m: E, x1: number, y1: number, plus = false): string {
  // c = y1 − m x1 (plus: the slip y1 + m x1 with x1 already negated by the caller)
  const mx = emul(m, E_(R_(x1)));
  void plus;
  const c = { q: rmul(mx.q, R_(-1)), m: mx.m };
  const lin = coefE(m, "x");
  // a rational −m·x₁ is combined with y₁ into one constant; a surd one stays a separate term
  const tail = c.m === 1 ? [es({ q: radd(R_(y1), c.q), m: 1 })].filter((t) => t !== "0") : [y1 !== 0 ? mi(y1) : "", es(c) !== "0" ? es(c) : ""].filter(Boolean);
  let out = lin;
  for (const t of tail) out = out ? `${out} ${t.startsWith("−") ? "−" : "+"} ${t.replace(/^−/, "")}` : t;
  return out || "0";
}

const ascollOk = (p: number[]) => {
  const [x1, y1, x2, y2, x3] = p;
  return allIn(p, [[-5, 5], [-5, 5], [-5, 5], [-5, 5], [-6, 6]]) && x1 < x2 && x3 !== x1 && x3 !== x2 && y1 !== y2 && thin(p, 6);
};
const ascoll: Def = {
  id: "ascoll",
  arity: 5,
  title: "Collinear points by equal slopes",
  competency: LINE,
  skill: "collinearity by slopes",
  type: "exact",
  mc: true,
  // [x1, y1, x2, y2, x3]: A(x1, y1), B(x2, y2), C(x3, k); find k
  parse: none,
  reject: (p) => (ascollOk(p) ? null : "Two whole-number points and the x-coordinate of a third."),
  prompt: ([x1, y1, x2, y2, x3]) => `The points A${P2(x1, y1)}, B${P2(x2, y2)} and C(${mi(x3)}, k) are collinear. Using slopes, find k.`,
  solve: ([x1, y1, x2, y2, x3]) => {
    const m = R_(y2 - y1, x2 - x1);
    const k = radd(R_(y1), rmul(m, R_(x3 - x1)));
    return { steps: [S("slope", "divide", LINE, [y2 - y1, x2 - x1], rs(m)), S("equal", "solve", LINE, ["slope AC = slope AB"], rs(k))], answer: rs(k) };
  },
  // independent: the area of triangle ABC (shoelace) is zero for the answer
  validate: ([x1, y1, x2, y2, x3], v) => {
    const k = num1(v);
    return k !== null && close(x1 * (y2 - k) + x2 * (k - y1) + x3 * (y1 - y2), 0, 1e-9);
  },
  bugs: ([x1, y1, x2, y2, x3]) => {
    const k = radd(R_(y1), rmul(R_(y2 - y1, x2 - x1), R_(x3 - x1)));
    const inv = radd(R_(y1), rmul(R_(x2 - x1, y2 - y1), R_(x3 - x1)));
    const mixedOrder = rsub(R_(y1), rmul(R_(y2 - y1, x2 - x1), R_(x3 - x1)));
    return [
      B("run-over-rise", "conceptual", LINE, "The slope was taken as (change in x)/(change in y); slope is (y₂ − y₁)/(x₂ − x₁).", rs(inv) !== rs(k) ? rs(inv) : null),
      B("order-mixed", "procedural", LINE, "The subtraction order was mixed (y₂ − y₁ over x₁ − x₂), which changes the sign of the slope.", rs(mixedOrder) !== rs(k) ? rs(mixedOrder) : null),
    ];
  },
  distractors: ([x1, y1, x2, y2, x3]) => {
    const k = radd(R_(y1), rmul(R_(y2 - y1, x2 - x1), R_(x3 - x1)));
    return [rs(radd(R_(y2), rmul(R_(y2 - y1, x2 - x1), R_(x3)))), rs(R_(y1 + y2 - x3)), rs(radd(k, R_(1))), rs(rsub(k, R_(2))), rs(rmul(k, R_(-1)))];
  },
  variants: () => [],
  explain: (s) => (s.id === "slope" ? `Slope of AB = ${mi(Number(s.inputs[0]))}/${mi(Number(s.inputs[1]))} = ${s.value}` : `Collinear points give equal slopes: slope AC = slope AB, so k = ${s.value}`),
  domain: [[-5, 5], [-5, 5], [-5, 5], [-5, 5], [-6, 6]],
  keep: (p) => ascollOk(p),
  cap: 300,
  difficulty: ([x1, y1, x2, y2]) => ((y2 - y1) % (x2 - x1) === 0 ? 1 : 2),
  teach: {
    idea: "Three points lie on one straight line exactly when the slope from the first to the second equals the slope from the first to the third (or from the second to the third).",
    method: "Work out the slope of AB, write the slope of AC with k in it, set them equal and solve for k.",
    alternatives: [{ id: "area", title: "A triangle of zero area", kind: "procedural", text: ["Collinear points make a 'triangle' of area 0.", "Set ½|x₁(y₂ − y₃) + x₂(y₃ − y₁) + x₃(y₁ − y₂)| = 0 and solve for k."] }],
  },
  limits: "Whole-number points with a non-vertical line through them.",
};

const aslineqOk = (p: number[]) => {
  const [kind, a, b, c, d] = p;
  switch (kind) {
    case 0: return allIn([a, b], [[-2, 2], [-2, 2]]) && [[1, 1], [-1, 1], [2, 1], [-2, 1], [3, 1], [-3, 1], [1, 2], [-1, 2], [3, 2], [-3, 2]].some(([u, w]) => u === c && w === d);
    case 1: return a !== 0 && b !== 0 && Math.abs(a) <= 5 && Math.abs(b) <= 5 && c === 0 && d === 0;
    case 2: return a !== 0 && b !== 0 && a + b !== 0 && Math.abs(a) <= 5 && Math.abs(b) <= 5 && c === 0 && d === 0;
    case 3: return a !== 0 && b !== 0 && Math.abs(a) <= 4 && Math.abs(b) <= 4 && c === 0 && d === 0;
    case 4: return allIn([a, c], [[-4, 4], [-4, 4]]) && a !== c && (b === 1 || b === -2) && d === 0 && (a + c) % 2 === 0;
    case 5: return (a === 1 || a === -2) && c === a + 3 && allIn([b, d], [[-4, 4], [-4, 4]]) && b !== d;
    case 6: return a >= 1 && a <= 6 && b >= 0 && b <= 5 && c === 0 && d === 0;
    default: return false;
  }
};
const OMEGA = [30, 45, 60, 120, 135, 150];
const sinW = (w: number): E => ({ 30: E_(R_(1, 2)), 45: E_(R_(1, 2), 2), 60: E_(R_(1, 2), 3), 120: E_(R_(1, 2), 3), 135: E_(R_(1, 2), 2), 150: E_(R_(1, 2)) } as Record<number, E>)[w];
const cotW = (w: number): E => ({ 30: E_(R_(1), 3), 45: E_(R_(1)), 60: E_(R_(1, 3), 3), 120: E_(R_(-1, 3), 3), 135: E_(R_(-1)), 150: E_(R_(-1), 3) } as Record<number, E>)[w];
/** The normal form x cos ω + y sin ω = p as y = −cot ω x + p/sin ω. */
const normalRhs = (p: number, w: number) => rhsE({ q: rmul(cotW(w).q, R_(-1)), m: cotW(w).m }, E_(rdiv(R_(p), rmul(sinW(w).q, R_(sinW(w).m))), sinW(w).m));
function aslineqAns(p: number[]): string {
  const [kind, a, b, c, d] = p;
  if (kind === 0) {
    const m = R_(c, d);
    return rhsR(m, rsub(R_(b), rmul(m, R_(a))));
  }
  if (kind === 1) return rhsR(R_(-b, a), R_(b));
  if (kind === 2) return mi(a + b);
  if (kind === 3) return rhsR(R_(-b, a), R_(2 * b));
  if (kind === 4) return mi((a + c) / 2);
  if (kind === 5) return rs(R_(2 * b + d, 3));
  return normalRhs(a, OMEGA[b]);
}
const aslineq: Def = {
  id: "aslineq",
  arity: 5,
  title: "Equations of lines in point–slope, intercept and normal form, and lines parallel to the axes",
  competency: LINE,
  skill: "forms of the equation of a line",
  type: "exact",
  mc: true,
  // [kind, a, b, c, d]: 0 through (a, b) with slope c/d; 1 intercepts a and b; 2 through (a, b) with equal intercepts (the intercept);
  // 3 the segment between the axes bisected at (a, b); 4 through the midpoint of (a, b) and (c, d) parallel to the y-axis (x = k);
  // 5 through the point dividing (a, b)–(c, d) in the ratio 1 : 2 parallel to the x-axis (y = k); 6 normal form with p = a, ω = OMEGA[b]
  parse: none,
  reject: (p) => (aslineqOk(p) ? null : "A line from one of seven kinds of data with whole numbers."),
  prompt: ([kind, a, b, c, d]) => {
    const ask = "Write it as y = mx + c and type the right-hand side.";
    if (kind === 0) return `A line passes through ${P2(a, b)} with slope ${rs(R_(c, d))}. Using the point–slope form, find its equation. ${ask}`;
    if (kind === 1) return `A line cuts off an intercept of ${mi(a)} on the x-axis and ${mi(b)} on the y-axis. Using the intercept form, find its equation. ${ask}`;
    if (kind === 2) return `A line passes through ${P2(a, b)} and cuts off equal intercepts k on the two axes (k ≠ 0). Find k.`;
    if (kind === 3) return `The segment of a line between the coordinate axes is bisected at the point ${P2(a, b)}. Find the equation of the line. ${ask}`;
    if (kind === 4) return `Find the equation of the line through the midpoint of A${P2(a, b)} and B${P2(c, d)} that is parallel to the y-axis. It is x = k; find k.`;
    if (kind === 5) return `The point P divides the segment from A${P2(a, b)} to B${P2(c, d)} internally in the ratio 1 : 2. Find the equation of the line through P parallel to the x-axis. It is y = k; find k.`;
    return `The perpendicular from the origin to a line has length ${a} and makes an angle of ${OMEGA[b]}° with the positive x-axis. Using the normal form x cos ω + y sin ω = p, find the equation of the line. ${ask}`;
  },
  solve: (p) => {
    const ans = aslineqAns(p);
    const form = ["y − y₁ = m(x − x₁)", "x/a + y/b = 1", "x/k + y/k = 1 through the point", "x/a + y/b = 1 with a, b twice the coordinates", "x = (x₁ + x₂)/2", "y = (2y₁ + y₂)/3", "x cos ω + y sin ω = p"][p[0]];
    return { steps: [S("form", "write", LINE, [p[0]], form), S("answer", "rearrange", LINE, [], ans)], answer: ans };
  },
  // independent: the answer line checked against the data (points, slope, intercepts found from the line, the foot of the perpendicular from O)
  validate: (p, v) => {
    const [kind, a, b, c, d] = p;
    if (kind === 2 || kind === 4 || kind === 5) {
      const k = num1(v);
      if (k === null) return false;
      if (kind === 2) return k !== 0 && close(a / k + b / k, 1, 1e-9);
      if (kind === 4) return close(Math.abs(k - a), Math.abs(k - c), 1e-9) && (k - a) * (k - c) < 0;
      return close(Math.abs(k - b) * 2, Math.abs(d - k), 1e-9) && (k - b) * (d - k) > 0;
    }
    const L = lineOf(v);
    if (!L) return false;
    const [m, k] = L;
    if (kind === 0) return close(m * a + k, b, 1e-9) && close(m, c / d, 1e-9);
    if (kind === 1) return close(k, b, 1e-9) && close(m * a + k, 0, 1e-9);
    if (kind === 3) return m !== 0 && close(-k / m / 2, a, 1e-9) && close(k / 2, b, 1e-9);
    // the foot of the perpendicular from the origin: (−mk, k)/(1 + m²)
    const fx = (-m * k) / (1 + m * m);
    const fy = k / (1 + m * m);
    return close(Math.hypot(fx, fy), a, 1e-9) && close(Math.atan2(fy, fx), (OMEGA[b] * Math.PI) / 180, 1e-9);
  },
  bugs: (p) => {
    const [kind, a, b, c, d] = p;
    const ans = aslineqAns(p);
    const out: Bug[] = [];
    if (kind === 0) {
      const m = R_(c, d);
      out.push(B("intercept-sign", "procedural", LINE, "In y − y₁ = m(x − x₁), the term −m·x₁ was added instead of subtracted.", a !== 0 ? rhsR(m, radd(R_(b), rmul(m, R_(a)))) : null));
      out.push(B("point-swapped", "procedural", LINE, "The coordinates of the point were swapped in y − y₁ = m(x − x₁).", a !== b ? rhsR(m, rsub(R_(a), rmul(m, R_(b)))) : null));
    }
    if (kind === 1) {
      out.push(B("intercepts-swapped", "procedural", LINE, "The intercepts were put the wrong way round in x/a + y/b = 1: a is the x-intercept.", a !== b ? rhsR(R_(-a, b), R_(a)) : null));
      out.push(B("slope-sign", "procedural", LINE, "The slope came out as b/a; from x/a + y/b = 1, y = b − (b/a)x, so the slope is −b/a.", rhsR(R_(b, a), R_(b))));
    }
    if (kind === 2) out.push(B("opposite", "conceptual", LINE, "The intercepts were taken as equal in size but opposite in sign (x − y = k); equal intercepts give x + y = k.", a - b === 0 ? null : mi(a - b)));
    if (kind === 3) out.push(B("not-doubled", "procedural", LINE, "The coordinates of the midpoint were used as the intercepts; the intercepts are twice them.", rhsR(R_(-b, a), R_(b))));
    if (kind === 4) out.push(B("other-coordinate", "procedural", LINE, "The midpoint's y-coordinate was used; a line parallel to the y-axis is x = (the x-coordinate).", rs(R_(b + d, 2))));
    if (kind === 5) out.push(B("ratio-reversed", "procedural", LINE, "The ratio was used the wrong way round: dividing AB in the ratio 1 : 2 gives (2y₁ + y₂)/3, nearer A.", rs(R_(b + 2 * d, 3))), B("midpoint", "procedural", LINE, "The midpoint was used instead of the point dividing in the ratio 1 : 2.", rs(R_(b + d, 2))));
    if (kind === 6) out.push(B("tan-slope", "recall", LINE, "tan ω was used as the slope of the line; ω is the angle of the perpendicular, so the line's slope is −cot ω.", rhsE(tanE(OMEGA[b]), E_(rdiv(R_(a), rmul(sinW(OMEGA[b]).q, R_(sinW(OMEGA[b]).m))), sinW(OMEGA[b]).m))));
    return out.filter((x) => x.predict !== null && x.predict !== ans);
  },
  distractors: (p) => {
    const [kind, a, b] = p;
    if (kind === 2 || kind === 4 || kind === 5) return [mi(a), mi(b), mi(a * b + 1), mi(a + b + 2), "0"];
    return [rhsR(R_(1), R_(a + b)), rhsR(R_(-1), R_(b)), rhsR(R_(2), R_(a - 1)), rhsR(R_(-1, 2), R_(b + 1)), rhsR(R_(3), R_(-b))];
  },
  variants: () => [],
  explain: (s) => (s.id === "form" ? `Use ${s.value}` : `So the answer is ${s.value}`),
  domain: [[0, 6], [-5, 6], [-4, 5], [-4, 4], [-4, 4]],
  keep: (p) => aslineqOk(p),
  cap: 400,
  difficulty: ([kind]) => (kind <= 1 || kind === 4 ? 1 : kind === 6 ? 3 : 2),
  teach: {
    idea: "A line is fixed by a point and a slope (y − y₁ = m(x − x₁)), by its intercepts (x/a + y/b = 1), or by the length p and direction ω of the perpendicular from the origin (x cos ω + y sin ω = p). Lines parallel to the axes are simply x = k or y = k.",
    method: "Pick the form that matches the data, put the numbers in, and rearrange to y = mx + c (or read off k for a line parallel to an axis).",
    alternatives: [{ id: "check", title: "Check with the data", kind: "procedural", text: ["Put the given point into your answer: it must fit.", "For intercepts, put y = 0 and x = 0 into your answer and see whether you get them back."] }],
  },
  limits: "Whole-number data; the two-point form is the family asline, parametric form the family aslinpar.",
};

const eadd = (a: E, b: E) => (a.m === b.m || es(a) === "0" || es(b) === "0" ? es(a.m === b.m ? { q: radd(a.q, b.q), m: a.m } : es(a) === "0" ? b : a) : `${es(a)} ${es(b).startsWith("−") ? "−" : "+"} ${es(b).replace(/^−/, "")}`);
const LP_DIR: [E, E][] = [[E_(R_(3, 5)), E_(R_(4, 5))], [E_(R_(4, 5)), E_(R_(3, 5))], [E_(R_(-3, 5)), E_(R_(4, 5))], [E_(R_(5, 13)), E_(R_(12, 13))], [E_(R_(-12, 13)), E_(R_(5, 13))], [E_(R_(1, 2), 3), E_(R_(1, 2))], [E_(R_(1, 2)), E_(R_(1, 2), 3)], [E_(R_(1, 2), 2), E_(R_(1, 2), 2)]];
const LP_R = [[5, 10, -5], [5, 10, -5], [5, 10, -5], [13, 26, -13], [13, 26, -13], [2, 4, -2], [2, 4, -2], [2, 4, -2]];
const lpTxt = ([c, s]: [E, E]) => `cos θ = ${es(c)} and sin θ = ${es(s)}`;
const aslinpar: Def = {
  id: "aslinpar",
  arity: 4,
  title: "The parametric form of a line: the point at a given distance",
  competency: LINE,
  skill: "parametric form of a line",
  type: "tuple",
  mc: true,
  // [x1, y1, j, ri]: through (x1, y1) with direction LP_DIR[j]; r = LP_R[j][ri]
  parse: none,
  reject: (p) => (allIn(p, [[-4, 4], [-4, 4], [0, 7], [0, 2]]) ? null : "A whole-number point, one of eight directions and one of three distances."),
  prompt: ([x1, y1, j, ri]) => `A line passes through A${P2(x1, y1)} and makes an angle θ with the positive x-axis, where ${lpTxt(LP_DIR[j])}. Write its parametric equations x = x₁ + r cos θ, y = y₁ + r sin θ (r is the signed distance from A) and find the point with r = ${mi(LP_R[j][ri])}. Type it as (x, y).`,
  solve: ([x1, y1, j, ri]) => {
    const r = LP_R[j][ri];
    const [c, s] = LP_DIR[j];
    const ans = `(${eadd(E_(R_(x1)), emul(c, E_(R_(r))))}, ${eadd(E_(R_(y1)), emul(s, E_(R_(r))))})`;
    return { steps: [S("param", "write", LINE, [x1, y1], `x = ${mi(x1)} + r(${es(c)}), y = ${mi(y1)} + r(${es(s)})`), S("point", "substitute", LINE, [r], ans)], answer: ans };
  },
  // independent: the point is at distance |r| from A, on the line through A with slope tan θ, on the side given by the sign of r
  validate: ([x1, y1, j, ri], v) => {
    const t = nums(v);
    if (!t || t.length !== 2) return false;
    const r = LP_R[j][ri];
    const [c, s] = LP_DIR[j].map(ev);
    const dx = t[0] - x1;
    const dy = t[1] - y1;
    return close(Math.hypot(dx, dy), Math.abs(r), 1e-9) && close(dx * s, dy * c, 1e-9) && (dx * c + dy * s) * r > 0;
  },
  bugs: ([x1, y1, j, ri]) => {
    const r = LP_R[j][ri];
    const [c, s] = LP_DIR[j];
    const pt = (u: E, w: E, rr: number) => `(${eadd(E_(R_(x1)), emul(u, E_(R_(rr))))}, ${eadd(E_(R_(y1)), emul(w, E_(R_(rr))))})`;
    return [B("cos-sin-swapped", "recall", LINE, "cos θ and sin θ were swapped: x changes by r cos θ and y by r sin θ.", es(c) === es(s) ? null : pt(s, c, r)), B("sign-of-r", "conceptual", LINE, "The sign of r was ignored; a negative r means the point lies on the other side of A, against the direction θ.", r < 0 ? pt(c, s, -r) : null)];
  },
  distractors: ([x1, y1, j, ri]) => {
    const r = LP_R[j][ri];
    return [`(${mi(x1 + r)}, ${mi(y1 + r)})`, `(${mi(x1 - r)}, ${mi(y1 - r)})`, `(${mi(x1)}, ${mi(y1 + r)})`];
  },
  variants: () => [],
  explain: (s) => (s.id === "param" ? `Parametric form: ${s.value}` : `Put r = ${mi(Number(s.inputs[0]))}: ${s.value}`),
  domain: [[-4, 4], [-4, 4], [0, 7], [0, 2]],
  cap: 300,
  difficulty: ([, , j, ri]) => (j <= 2 && ri < 2 ? 1 : j >= 5 ? 3 : 2),
  teach: {
    idea: "Every point of the line through (x₁, y₁) with inclination θ can be written as x = x₁ + r cos θ, y = y₁ + r sin θ, where r is the signed distance from (x₁, y₁) along the line.",
    method: "Write cos θ and sin θ, put them into the parametric equations, then substitute the given r (negative r goes the other way).",
    alternatives: [{ id: "steps", title: "Walk along the line", kind: "conceptual", text: ["Each unit of distance along the line moves you cos θ across and sin θ up.", "So r units move you r cos θ across and r sin θ up."] }],
  },
  limits: "Directions with exact cosines and sines and distances that keep the answer simple.",
};

const asgenfOk = (p: number[]) => {
  const [kind, A, Bc, Cc, j] = p;
  if (kind === 6) return allIn([A, Bc], [[-1, 1], [-1, 1]]) && (A !== 0 || Bc !== 0) && Cc !== 0 && Math.abs(Cc) <= 6 && j === 0;
  if (kind < 0 || kind > 5 || A < 1 || A > 4 || Bc === 0 || Math.abs(Bc) > 4 || Math.abs(Cc) > 6 || gcd3(A, Bc, Cc) !== 1) return false;
  if (kind <= 3) return j === 0 && (kind !== 1 || Cc !== 0) && (kind !== 2 || Cc !== 0) && (kind !== 3 || Cc !== 0) && thin(p, 3);
  return j >= 0 && j <= 3 && thin(p, 10);
};
const GF_PT = [[1, 2], [-2, 1], [3, -1], [0, 4]];
const genLine = (A: number, Bc: number, Cc: number) => lin2(A, Bc, Cc);
function asgenfAns(p: number[]): string {
  const [kind, A, Bc, Cc, j] = p;
  if (kind === 0) return rs(R_(-A, Bc));
  if (kind === 1) return rs(R_(-Cc, Bc));
  if (kind === 2) return rs(R_(-Cc, A));
  if (kind === 3) return es(E_(R_(Math.abs(Cc), A * A + Bc * Bc), A * A + Bc * Bc));
  const [x0, y0] = GF_PT[j];
  if (kind === 4) return rhsR(R_(-A, Bc), radd(R_(y0), rmul(R_(A, Bc), R_(x0))));
  if (kind === 5) return rhsR(R_(Bc, A), rsub(R_(y0), rmul(R_(Bc, A), R_(x0))));
  // the normal form: divide by −sign(C)·√(A² + B²) so that p > 0
  const sgC = Cc > 0 ? -1 : 1;
  const deg = Math.round((Math.atan2(sgC * Bc, sgC * A) * 180) / Math.PI);
  return String(((deg % 360) + 360) % 360);
}
const asgenf: Def = {
  id: "asgenf",
  arity: 5,
  title: "From the general form Ax + By + C = 0: slope, intercepts, normal form, parallel and perpendicular lines",
  competency: LINE,
  skill: "converting the general form",
  type: "exact",
  mc: true,
  // [kind, A, B, C, j]: 0 slope, 1 y-intercept, 2 x-intercept, 3 the length p of the normal form, 4 the parallel and 5 the perpendicular through GF_PT[j], 6 the angle ω of the normal form
  parse: none,
  reject: (p) => (asgenfOk(p) ? null : "A line Ax + By + C = 0 with small whole-number coefficients."),
  prompt: (p) => {
    const [kind, A, Bc, Cc, j] = p;
    const L = genLine(A, Bc, Cc);
    const ask = "Write it as y = mx + c and type the right-hand side.";
    return [
      `Write the line ${L} in slope–intercept form. What is its slope?`,
      `Write the line ${L} in slope–intercept form. What is its y-intercept?`,
      `Write the line ${L} in intercept form x/a + y/b = 1. What is its x-intercept a?`,
      `Write the line ${L} in normal form x cos ω + y sin ω = p (p > 0). Find p, the length of the perpendicular from the origin.`,
      `Find the equation of the line through ${P2(GF_PT[j][0], GF_PT[j][1])} parallel to ${L}. ${ask}`,
      `Find the equation of the line through ${P2(GF_PT[j][0], GF_PT[j][1])} perpendicular to ${L}. ${ask}`,
      `Write the line ${L} in normal form x cos ω + y sin ω = p with p > 0. Find ω in degrees (0° ≤ ω < 360°).`,
    ][kind];
  },
  solve: (p) => {
    const ans = asgenfAns(p);
    const [kind, A, Bc, Cc] = p;
    const how = kind === 3 || kind === 6 ? `divide by ${Cc > 0 ? "−" : ""}√(${A * A + Bc * Bc})` : kind <= 2 ? `y = ${rhsR(R_(-A, Bc), R_(-Cc, Bc))}` : `slope ${kind === 4 ? rs(R_(-A, Bc)) : rs(R_(Bc, A))}`;
    return { steps: [S("convert", "rearrange", LINE, [kind], how), S("answer", "read", LINE, [], ans)], answer: ans };
  },
  // independent: points of the given line found by solving it at two values of x (or y), and the answer checked against them
  validate: (p, v) => {
    const [kind, A, Bc, Cc, j] = p;
    const yAt = (x: number) => (Bc === 0 ? NaN : -(A * x + Cc) / Bc);
    if (kind <= 3 || kind === 6) {
      const t = num1(v);
      if (t === null) return false;
      if (kind === 0) return close(t, yAt(1) - yAt(0), 1e-9);
      if (kind === 1) return close(t, yAt(0), 1e-9);
      if (kind === 2) return close(A * t + Cc, 0, 1e-9);
      // the foot of the perpendicular from O, by minimising the distance along the line
      const P0 = Bc === 0 ? [-Cc / A, 0] : [0, yAt(0)];
      const dir = [Bc, -A];
      let [lo, hi] = [-100, 100];
      const dist = (s: number) => Math.hypot(P0[0] + s * dir[0], P0[1] + s * dir[1]);
      // bisection on the sign of the change in the squared distance (the nearest point is where it stops falling)
      const slope = (s: number) => dist(s + 1e-3) ** 2 - dist(s - 1e-3) ** 2;
      for (let i = 0; i < 200; i++) {
        const mid = (lo + hi) / 2;
        if (slope(mid) > 0) hi = mid;
        else lo = mid;
      }
      const s = (lo + hi) / 2;
      const F = [P0[0] + s * dir[0], P0[1] + s * dir[1]];
      if (kind === 3) return close(t, Math.hypot(F[0], F[1]), 1e-7);
      const deg = (Math.atan2(F[1], F[0]) * 180) / Math.PI;
      const diff = (((t - deg) % 360) + 540) % 360 - 180;
      return t >= 0 && t < 360 && Math.abs(diff) < 1e-6;
    }
    const L = lineOf(v);
    if (!L) return false;
    const [x0, y0] = GF_PT[j];
    const m0 = yAt(1) - yAt(0);
    return close(L[0] * x0 + L[1], y0, 1e-9) && (kind === 4 ? close(L[0], m0, 1e-9) : close(L[0] * m0, -1, 1e-9));
  },
  bugs: (p) => {
    const [kind, A, Bc, Cc, j] = p;
    const ans = asgenfAns(p);
    const out: Bug[] = [];
    if (kind === 0) out.push(B("ratio-inverted", "recall", LINE, "The slope was taken as −B/A; from Ax + By + C = 0, y = −(A/B)x − C/B, so the slope is −A/B.", rs(R_(-Bc, A))), B("sign-lost", "procedural", LINE, "The minus sign was lost when moving Ax to the other side.", rs(R_(A, Bc))));
    if (kind === 1) out.push(B("sign-lost", "procedural", LINE, "The minus sign was lost when moving C to the other side.", rs(R_(Cc, Bc))));
    if (kind === 2) out.push(B("sign-lost", "procedural", LINE, "The minus sign was lost: putting y = 0 gives Ax = −C.", rs(R_(Cc, A))), B("y-intercept", "procedural", LINE, "The y-intercept was given instead of the x-intercept.", rs(R_(-Cc, Bc))));
    if (kind === 3) out.push(B("no-root", "recall", LINE, "C was divided by A² + B² instead of by √(A² + B²).", rs(R_(Math.abs(Cc), A * A + Bc * Bc))), B("plain-sum", "procedural", LINE, "C was divided by |A| + |B| instead of by √(A² + B²).", rs(R_(Math.abs(Cc), Math.abs(A) + Math.abs(Bc)))));
    if (kind === 4 || kind === 5) {
      const [x0, y0] = GF_PT[j];
      const m = kind === 4 ? R_(-A, Bc) : R_(Bc, A);
      out.push(B(kind === 4 ? "perpendicular-instead" : "parallel-instead", "conceptual", LINE, kind === 4 ? "A perpendicular line was found; parallel lines have the same slope." : "A parallel line was found; perpendicular slopes multiply to −1.", kind === 4 ? rhsR(R_(Bc, A), rsub(R_(y0), rmul(R_(Bc, A), R_(x0)))) : rhsR(R_(-A, Bc), radd(R_(y0), rmul(R_(A, Bc), R_(x0))))));
      out.push(B("intercept-sign", "procedural", LINE, "In y − y₁ = m(x − x₁), the term −m·x₁ was added instead of subtracted.", x0 !== 0 ? rhsR(m, radd(R_(y0), rmul(m, R_(x0)))) : null));
    }
    if (kind === 6) {
      const w = Number(ans);
      out.push(B("p-negative", "conceptual", LINE, "The equation was divided by +√(A² + B²) whatever the sign of C, which can make p negative; p must be positive, which turns ω through 180°.", String((w + 180) % 360)));
      out.push(B("from-y-axis", "procedural", LINE, "The angle was measured from the y-axis; ω is measured from the positive x-axis.", w % 90 === 0 && w % 180 !== 0 ? null : String((((90 - w) % 360) + 360) % 360)));
    }
    return out.filter((x) => x.predict !== null && x.predict !== ans);
  },
  distractors: (p) => {
    const [kind, A, Bc, Cc] = p;
    if (kind === 6) return [String((Number(asgenfAns(p)) + 90) % 360)];
    if (kind <= 3) return [rs(R_(A + 1, Bc)), rs(R_(-Cc - 1, Bc === 0 ? 1 : Bc))];
    return [rhsR(R_(-A, Bc), R_(Cc)), rhsR(R_(A, Bc), R_(0))];
  },
  variants: () => [],
  explain: (s) => (s.id === "convert" ? `Rearrange: ${s.value}` : `So the answer is ${s.value}`),
  domain: [[0, 6], [-1, 4], [-4, 4], [-6, 6], [0, 3]],
  keep: (p) => asgenfOk(p),
  cap: 500,
  difficulty: ([kind]) => (kind <= 1 ? 1 : kind === 3 || kind === 6 ? 3 : 2),
  teach: {
    idea: "Ax + By + C = 0 can be rewritten as y = −(A/B)x − C/B (slope and y-intercept), as x/(−C/A) + y/(−C/B) = 1 (intercepts), or, dividing by ∓√(A² + B²), as x cos ω + y sin ω = p with p > 0. Parallel lines share A : B; perpendicular slopes multiply to −1.",
    method: "Make y the subject to read the slope and y-intercept; move C across and divide to get the intercept form; divide by √(A² + B²), with the sign chosen to make the right-hand side positive, for the normal form.",
    alternatives: [{ id: "points", title: "Use two points of the line", kind: "procedural", text: ["Put x = 0 to find where the line meets the y-axis, and y = 0 for the x-axis.", "The slope is the rise between those points over the run."] }],
  },
  limits: "Small whole-number coefficients; for the angle ω only lines with A and B from −1 to 1, so that ω is a multiple of 45°.",
};

// ---- probability: events as sets, the addition theorem for three events, Bernoulli distributions
const EVS: { name: (n: number) => string; has: (x: number, n: number) => boolean }[] = [
  { name: () => "the number is even", has: (x) => x % 2 === 0 },
  { name: () => "the number is odd", has: (x) => x % 2 === 1 },
  { name: () => "the number is prime", has: (x) => x > 1 && Array.from({ length: x - 2 }, (_, i) => i + 2).every((d) => x % d !== 0) },
  { name: () => "the number is a multiple of 3", has: (x) => x % 3 === 0 },
  { name: (n) => `the number is greater than ${Math.floor(n / 2)}`, has: (x, n) => x > Math.floor(n / 2) },
  { name: () => "the number is a multiple of 4", has: (x) => x % 4 === 0 },
  { name: () => "the number is a perfect square", has: (x) => Number.isInteger(Math.sqrt(x)) },
  { name: (n) => `the number is less than ${Math.ceil(n / 3) + 1}`, has: (x, n) => x < Math.ceil(n / 3) + 1 },
];
const EV_N = [6, 10, 12, 20];
const EV_WHAT = ["A die is rolled", "A card is drawn from ten cards numbered 1 to 10", "A ball is drawn from a bag of twelve balls numbered 1 to 12", "A ticket is drawn from twenty tickets numbered 1 to 20"];
const EV_OP = ["A ∪ B (A or B)", "A ∩ B (A and B)", "A′ (not A)", "A ∩ B′ (A but not B)", "A′ ∩ B′ (neither A nor B)"];
const evSet = (s: number, e: number) => Array.from({ length: EV_N[s] }, (_, i) => i + 1).filter((x) => EVS[e].has(x, EV_N[s]));
function evAns([s, a, b, op]: number[]): number[] {
  const S0 = Array.from({ length: EV_N[s] }, (_, i) => i + 1);
  const A = evSet(s, a);
  const Bs = evSet(s, b);
  return S0.filter((x) => [A.includes(x) || Bs.includes(x), A.includes(x) && Bs.includes(x), !A.includes(x), A.includes(x) && !Bs.includes(x), !A.includes(x) && !Bs.includes(x)][op]);
}
const asevsetOk = (p: number[]) => {
  const [s, a, b, op] = p;
  if (!allIn(p, [[0, 3], [0, 7], [0, 7], [0, 4]])) return false;
  if (op === 2) return b === a && evAns(p).length > 0 && evAns(p).length < EV_N[s];
  const A = evSet(s, a);
  const Bs = evSet(s, b);
  return a !== b && A.length > 0 && Bs.length > 0 && JSON.stringify(A) !== JSON.stringify(Bs) && evAns(p).length > 0 && evAns(p).length <= 12;
};
const asevset: Def = {
  id: "asevset",
  arity: 4,
  title: "Events as sets of outcomes: not A, A and B, A or B",
  competency: EV,
  skill: "events as subsets of the sample space",
  type: "set",
  // [s, a, b, op]: sample space 1 … EV_N[s]; events EVS[a], EVS[b]; op EV_OP
  parse: none,
  reject: (p) => (asevsetOk(p) ? null : "Two different events on a small sample space, and an event made from them that is not empty."),
  prompt: ([s, a, b, op]) => `${EV_WHAT[s]}, so the sample space is S = {1, 2, …, ${EV_N[s]}}. Let A be the event "${EVS[a].name(EV_N[s])}"${op === 2 ? "" : ` and B the event "${EVS[b].name(EV_N[s])}"`}. Write the event ${EV_OP[op]} as a set of outcomes (list the numbers, separated by commas).`,
  solve: (p) => {
    const [s, a, b, op] = p;
    const ans = evAns(p);
    return { steps: [S("A", "list", EV, [], `{${evSet(s, a).join(", ")}}`), ...(op === 2 ? [] : [S("B", "list", EV, [], `{${evSet(s, b).join(", ")}}`)]), S("combine", "combine", EV, [EV_OP[op]], `{${ans.join(", ")}}`)], answer: ans };
  },
  // independent: each outcome tested against the words of the events directly (division, trial factors, square roots)
  validate: ([s, a, b, op], v) => {
    if (!Array.isArray(v)) return false;
    const n = EV_N[s];
    const test = (e: number, x: number) => {
      if (e === 0) return x / 2 === Math.floor(x / 2);
      if (e === 1) return x / 2 !== Math.floor(x / 2);
      if (e === 2) {
        if (x < 2) return false;
        for (let d = 2; d * d <= x; d++) if (x % d === 0) return false;
        return true;
      }
      if (e === 3) return x / 3 === Math.floor(x / 3);
      if (e === 4) return 2 * x > n + (n % 2);
      if (e === 5) return x / 4 === Math.floor(x / 4);
      if (e === 6) return Math.round(Math.sqrt(x)) ** 2 === x;
      return x <= Math.ceil(n / 3);
    };
    const want: number[] = [];
    for (let x = 1; x <= n; x++) {
      const inA = test(a, x);
      const inB = test(b, x);
      if ([inA || inB, inA && inB, !inA, inA && !inB, !inA && !inB][op]) want.push(x);
    }
    return v.length === want.length && [...v].sort((x, y) => x - y).every((x, i) => x === want[i]);
  },
  bugs: (p) => {
    const [s, a, b, op] = p;
    const ans = evAns(p);
    const A = evSet(s, a);
    const Bs = evSet(s, b);
    const out: Bug[] = [];
    const add = (id: string, kind: Bug["kind"], says: string, pred: number[]) => {
      if (pred.length && JSON.stringify(pred) !== JSON.stringify(ans)) out.push(B(id, kind, EV, says, pred));
    };
    if (op === 0) add("and-for-or", "conceptual", "Only the outcomes in both A and B were listed; 'A or B' (A ∪ B) contains the outcomes in at least one of them.", evAns([s, a, b, 1]));
    if (op === 1) add("or-for-and", "conceptual", "Every outcome in A or in B was listed; 'A and B' (A ∩ B) contains only the outcomes in both.", evAns([s, a, b, 0]));
    if (op === 2) add("a-itself", "conceptual", "The outcomes of A were listed; 'not A' (A′) is everything in S that is not in A.", A);
    if (op === 3) add("and-for-but-not", "procedural", "The outcomes in both A and B were listed; 'A but not B' keeps the outcomes of A that are not in B.", evAns([s, a, b, 1]));
    if (op === 3) add("b-but-not-a", "procedural", "The outcomes of B that are not in A were listed; the event is A but not B.", Bs.filter((x) => !A.includes(x)));
    if (op === 4) add("not-both", "conceptual", "The outcomes not in both A and B together, (A ∩ B)′, were listed; 'neither A nor B' is (A ∪ B)′.", Array.from({ length: EV_N[s] }, (_, i) => i + 1).filter((x) => !(A.includes(x) && Bs.includes(x))));
    return out;
  },
  variants: () => [],
  explain: (s) => (s.id === "A" ? `A = ${s.value}` : s.id === "B" ? `B = ${s.value}` : `${s.inputs[0]} = ${s.value}`),
  domain: [[0, 3], [0, 7], [0, 7], [0, 4]],
  keep: (p) => asevsetOk(p),
  cap: 300,
  difficulty: ([, , , op]) => (op <= 2 ? 1 : 2),
  teach: {
    idea: "An event is a subset of the sample space S. 'A or B' is the union A ∪ B, 'A and B' the intersection A ∩ B, and 'not A' the complement A′ = S − A.",
    method: "List the outcomes of A and of B from S. Then: for A ∪ B take every outcome in either list; for A ∩ B only those in both; for A′ those of S not in A; for A ∩ B′ those of A not in B.",
    alternatives: [{ id: "venn", title: "A Venn diagram", kind: "conceptual", text: ["Draw two overlapping circles A and B inside a rectangle S and write each outcome in its region.", "Read the event off the diagram: the overlap is A ∩ B, both circles together A ∪ B, outside A is A′."] }],
  },
  limits: "Sample spaces of whole numbers up to 20 and eight simple events; events of two-stage experiments are the families akss and akdice.",
};

const add3Regions = ([r1, r2, r3, r4, r5, r6]: number[]) => ({ r1, r2, r3, r4, r5, r6, r7: 1 + ((r1 + r2) % 3), r0: 2 + ((r3 + r4) % 5) });
const add3Counts = (p: number[]) => {
  const g = add3Regions(p);
  const N = g.r0 + g.r1 + g.r2 + g.r3 + g.r4 + g.r5 + g.r6 + g.r7;
  // r4 = A∩B only, r5 = A∩C only, r6 = B∩C only, r7 = all three
  return { N, A: g.r1 + g.r4 + g.r5 + g.r7, B: g.r2 + g.r4 + g.r6 + g.r7, C: g.r3 + g.r5 + g.r6 + g.r7, AB: g.r4 + g.r7, AC: g.r5 + g.r7, BC: g.r6 + g.r7, ABC: g.r7, g };
};
const asadd3: Def = {
  id: "asadd3",
  arity: 7,
  title: "The addition theorem for three events",
  competency: EV,
  skill: "addition theorem for three events",
  type: "fraction",
  mc: true,
  // [r1, …, r6, ask]: Venn-region counts (the rest fixed by them); ask 0 P(A ∪ B ∪ C), 1 P(none of them), 2 P(exactly one)
  parse: none,
  reject: (p) => (allIn(p, [[1, 6], [1, 6], [1, 6], [0, 4], [0, 4], [0, 4], [0, 2]]) && thin(p, 8) ? null : "Small region counts in a three-set Venn diagram."),
  prompt: (p) => {
    const c = add3Counts(p);
    const f = (x: number) => pf(x, c.N);
    return `For events A, B and C, P(A) = ${f(c.A)}, P(B) = ${f(c.B)}, P(C) = ${f(c.C)}, P(A ∩ B) = ${f(c.AB)}, P(B ∩ C) = ${f(c.BC)}, P(A ∩ C) = ${f(c.AC)} and P(A ∩ B ∩ C) = ${f(c.ABC)}. Find ${["P(A ∪ B ∪ C)", "the probability that none of A, B, C happens", "the probability that exactly one of A, B, C happens"][p[6]]}.`;
  },
  word: (p) => {
    const c = add3Counts(p);
    return `In a class of ${c.N} students in Tirunelveli, ${c.A} play cricket, ${c.B} play football and ${c.C} play kabaddi; ${c.AB} play both cricket and football, ${c.BC} both football and kabaddi, ${c.AC} both cricket and kabaddi, and ${c.ABC} play all three. A student is chosen at random. Find the probability that the student plays ${["at least one of the three games", "none of the three games", "exactly one of the three games"][p[6]]}.`;
  },
  solve: (p) => {
    const c = add3Counts(p);
    const U = c.A + c.B + c.C - c.AB - c.BC - c.AC + c.ABC;
    if (p[6] === 2) {
      // exactly one: the singles count the pair regions twice and the triple three times
      const E1 = c.A + c.B + c.C - 2 * (c.AB + c.BC + c.AC) + 3 * c.ABC;
      return { steps: [S("singles", "add", EV, [c.A, c.B, c.C], pf(c.A + c.B + c.C, c.N)), S("pairs2", "subtract", EV, [c.AB, c.BC, c.AC], pf(2 * (c.AB + c.BC + c.AC), c.N)), S("triple3", "add", EV, [c.ABC], pf(E1, c.N))], answer: E1 / c.N };
    }
    const ans = p[6] ? (c.N - U) / c.N : U / c.N;
    return { steps: [S("singles", "add", EV, [c.A, c.B, c.C], pf(c.A + c.B + c.C, c.N)), S("pairs", "subtract", EV, [c.AB, c.BC, c.AC], pf(c.AB + c.BC + c.AC, c.N)), S("triple", "add", EV, [c.ABC], pf(U, c.N)), ...(p[6] ? [S("complement", "subtract", COMP, [U, c.N], pf(c.N - U, c.N))] : [])], answer: ans };
  },
  // independent: count the outcomes region by region in the Venn diagram
  validate: (p, v) => {
    if (typeof v !== "number") return false;
    const { g, N } = add3Counts(p);
    const inside = g.r1 + g.r2 + g.r3 + g.r4 + g.r5 + g.r6 + g.r7;
    return close(v, p[6] === 2 ? (g.r1 + g.r2 + g.r3) / N : p[6] ? g.r0 / N : inside / N, 1e-12);
  },
  bugs: (p) => {
    const c = add3Counts(p);
    const U = c.A + c.B + c.C - c.AB - c.BC - c.AC + c.ABC;
    if (p[6] === 2) {
      const P2 = c.AB + c.BC + c.AC;
      const E1 = c.A + c.B + c.C - 2 * P2 + 3 * c.ABC;
      return [
        B("at-least-one", "conceptual", EV, "P(A ∪ B ∪ C), the probability of at least one, was found; exactly one leaves out the outcomes that are in two or in all three events.", U / c.N),
        B("triple-once", "procedural", EV, "After subtracting twice the pairs, P(A ∩ B ∩ C) was added back only once; the triple region was counted three times in the singles and taken away six times with the pairs, so it must be added back three times.", (c.A + c.B + c.C - 2 * P2 + c.ABC) / c.N),
        B("pairs-once-exact", "procedural", EV, "The pairs were subtracted only once; outcomes in exactly two events are counted twice in P(A) + P(B) + P(C), so for exactly one they must be taken away twice.", (c.A + c.B + c.C - P2 + 3 * c.ABC) / c.N),
      ].filter((b) => Number.isFinite(b.predict as number) && Math.abs((b.predict as number) - E1 / c.N) > 1e-12 && (b.predict as number) >= 0 && (b.predict as number) <= 1);
    }
    const fix = (x: number) => (p[6] ? (c.N - x) / c.N : x / c.N);
    return [
      B("triple-left-out", "procedural", EV, "P(A ∩ B ∩ C) was left out; subtracting the three pairs takes the triple overlap away three times after adding it three times, so it must be added back once.", fix(U - c.ABC)),
      B("pairs-not-subtracted", "conceptual", EV, "The three probabilities were simply added; outcomes in two of the events are then counted twice, so the pairwise overlaps must be subtracted.", p[6] ? null : fix(c.A + c.B + c.C)),
      B("triple-subtracted", "procedural", EV, "P(A ∩ B ∩ C) was subtracted instead of added.", fix(U - 2 * c.ABC)),
    ].filter((b) => b.predict === null || (Number.isFinite(b.predict as number) && Math.abs((b.predict as number) - fix(U)) > 1e-12));
  },
  distractors: (p) => {
    const c = add3Counts(p);
    const U = c.A + c.B + c.C - c.AB - c.BC - c.AC + c.ABC;
    if (p[6] === 2) return [(c.N - U) / c.N, (c.A + c.B + c.C) / (3 * c.N), (c.AB + c.BC + c.AC) / c.N];
    return [(p[6] ? U : c.N - U) / c.N, (U - 1) / c.N];
  },
  variants: () => [],
  explain: (s) => (s.id === "singles" ? `P(A) + P(B) + P(C) = ${s.value}` : s.id === "pairs" ? `Subtract P(A ∩ B) + P(B ∩ C) + P(A ∩ C) = ${s.value}` : s.id === "triple" ? `Add back P(A ∩ B ∩ C): P(A ∪ B ∪ C) = ${s.value}` : s.id === "pairs2" ? `Subtract twice P(A ∩ B) + P(B ∩ C) + P(A ∩ C): 2 × that = ${s.value}` : s.id === "triple3" ? `Add back three times P(A ∩ B ∩ C): P(exactly one) = ${s.value}` : `None of them: 1 − P(A ∪ B ∪ C) = ${s.value}`),
  range: [0, 1],
  domain: [[1, 6], [1, 6], [1, 6], [0, 4], [0, 4], [0, 4], [0, 2]],
  keep: (p) => thin(p, 8),
  cap: 300,
  difficulty: ([, , , , , , ask]) => (ask ? 3 : 2),
  teach: {
    idea: "P(A ∪ B ∪ C) = P(A) + P(B) + P(C) − P(A ∩ B) − P(B ∩ C) − P(A ∩ C) + P(A ∩ B ∩ C): add the singles, take away the double counting of the pairs, and add back the triple overlap, which was taken away once too often.",
    method: "Add the three probabilities, subtract the three pairwise ones, add the triple one. For 'none of them', take the result away from 1. For 'exactly one', subtract the pairs twice and add the triple three times.",
    alternatives: [{ id: "venn", title: "Fill in a Venn diagram", kind: "procedural", text: ["Start from the centre: write the triple overlap, then each pair minus the triple, then each single minus what is already inside it.", "Add all the regions inside the three circles."] }],
  },
  limits: "Probabilities with a common denominator from a Venn diagram of whole-number counts.",
};

const asbernOk = ([kind, a, d, u, v]: number[]) => {
  if (!allIn([a, d], [[1, 11], [2, 12]]) || a >= d || gcd(a, d) !== 1) return false;
  // Bernoulli questions take denominators up to 12 (more of them in the pool), two-point ones up to 10
  if (kind <= 1) return u === 0 && v === 0;
  if (d > 10) return false;
  if (kind <= 3) return allIn([u, v], [[-5, 10], [-5, 10]]) && u !== v && !(u === 1 && v === 0) && thin([kind, a, d, u, v], 6);
  if (kind === 4) return u >= 1 && u <= 9 && v === 0 && a === 1 && d === 2;
  return false;
};
const asbern: Def = {
  id: "asbern",
  contract: { kind: "typed", typed: ([kind, a, d, u, v]) => kind === 0 ? b1Object("distribution", "bernoulli-mean", { p: `${a}/${d}` }) : kind === 1 ? b1Object("distribution", "bernoulli-variance", { p: `${a}/${d}` }) : kind === 2 ? b1Object("distribution", "pmf-mean", { values: [u, v], probabilities: [`${a}/${d}`, `${d - a}/${d}`] }) : kind === 3 ? b1Object("distribution", "pmf-variance", { values: [u, v], probabilities: [`${a}/${d}`, `${d - a}/${d}`] }) : null },
  arity: 5,
  title: "One-point, two-point and Bernoulli distributions",
  competency: BIN,
  skill: "Bernoulli and two-point distributions",
  type: "fraction",
  mc: true,
  // [kind, a, d, u, v]: p = a/d; 0 Bernoulli mean, 1 Bernoulli variance, 2 two-point (u with prob p, v otherwise) mean, 3 its variance, 4 one-point at u: variance
  parse: none,
  reject: (p) => (asbernOk(p) ? null : "p = a/d in lowest terms, and two different values for a two-point distribution."),
  prompt: ([kind, a, d, u, v]) =>
    kind <= 1
      ? `A seed germinates with probability ${pf(a, d)}. Let X = 1 if it germinates and X = 0 if it does not (a Bernoulli random variable). Find the ${kind ? "variance" : "mean"} of X.`
      : kind <= 3
        ? `A random variable X takes the value ${mi(u)} with probability ${pf(a, d)} and the value ${mi(v)} with probability ${pf(d - a, d)} (a two-point distribution). Find the ${kind === 3 ? "variance" : "mean"} of X.`
        : `A random variable X takes the value ${u} with probability 1 (a one-point distribution). Find the variance of X.`,
  solve: ([kind, a, d, u, v]) => {
    // one integer division each, so the value is exactly the nearest number to the fraction (no rounding residue like 1e-16 for 0)
    const ans = kind === 0 ? a / d : kind === 1 ? (a * (d - a)) / (d * d) : kind === 2 ? (u * a + v * (d - a)) / d : kind === 3 ? ((u - v) ** 2 * a * (d - a)) / (d * d) : 0;
    const f = ["E(X) = p", "Var(X) = p(1 − p)", "E(X) = up + v(1 − p)", "Var(X) = (u − v)² p(1 − p)", "X never varies, so Var(X) = 0"][kind];
    return { steps: [S("formula", "recall", BIN, [kind], f), S("value", "evaluate", BIN, [a, d], ans)], answer: ans };
  },
  // independent: E(X) and E(X²) summed over the distribution table
  validate: ([kind, a, d, u, v], val) => {
    if (typeof val !== "number") return false;
    const table: [number, number][] = kind <= 1 ? [[1, a / d], [0, 1 - a / d]] : kind <= 3 ? [[u, a / d], [v, 1 - a / d]] : [[u, 1]];
    const m = table.reduce((s, [x, q]) => s + x * q, 0);
    const m2 = table.reduce((s, [x, q]) => s + x * x * q, 0);
    return close(val, kind === 0 || kind === 2 ? m : m2 - m * m, 1e-12);
  },
  bugs: ([kind, a, d, u, v]) => {
    if (kind === 0) return [B("q-for-p", "procedural", BIN, "The probability of failure was given; the mean of a Bernoulli variable is the probability of success p.", (d - a) / d)];
    if (kind === 1) return [B("p-squared", "recall", BIN, "p² was given; Var(X) = E(X²) − (E X)² = p − p² = p(1 − p).", (a * a) / (d * d)), B("mean-for-variance", "conceptual", BIN, "The mean p was given instead of the variance.", a / d)];
    if (kind === 2) return [B("average", "conceptual", BIN, "The two values were simply averaged; each value must be weighted by its probability.", (u + v) / 2), B("swapped", "procedural", BIN, "The probabilities were attached to the wrong values.", (u * (d - a) + v * a) / d)].filter((b) => Math.abs((b.predict as number) - (u * a + v * (d - a)) / d) > 1e-12);
    if (kind === 3) return [B("ex2", "procedural", BIN, "E(X²) was given; the variance is E(X²) − (E X)².", (u * u * a + v * v * (d - a)) / d), B("not-squared", "procedural", BIN, "(u − v) was not squared: Var(X) = (u − v)² p(1 − p).", (Math.abs(u - v) * a * (d - a)) / (d * d))].filter((b) => Math.abs((b.predict as number) - ((u - v) ** 2 * a * (d - a)) / (d * d)) > 1e-12);
    return [B("value-for-variance", "conceptual", BIN, "The value itself was given; a variable that always takes the same value does not vary, so its variance is 0.", u)];
  },
  distractors: ([kind, a, d, u, v]) => (kind === 4 ? [1, u * u] : kind <= 1 ? [a / (2 * d), (a + 1) / (d + 1)] : [u * (a / d), v * (a / d)]),
  variants: () => [],
  explain: (s) => (s.id === "formula" ? (s.value as string) : `So the answer is ${fracTxt(Number(s.value))}`),
  range: ([kind]) => (kind <= 1 ? [0, 1] : null),
  domain: [[0, 4], [1, 11], [2, 12], [-5, 10], [-5, 10]],
  keep: (p) => asbernOk(p),
  cap: 300,
  difficulty: ([kind]) => (kind === 0 || kind === 4 ? 1 : kind === 3 ? 3 : 2),
  teach: {
    idea: "A one-point distribution always gives the same value (variance 0). A two-point distribution gives u with probability p and v with probability 1 − p; with u = 1 and v = 0 it is the Bernoulli distribution, with mean p and variance p(1 − p).",
    method: "Make the table of values and probabilities. Mean: Σ x P(x). Variance: Σ x² P(x) minus the square of the mean (for two points this simplifies to (u − v)² p(1 − p)).",
    alternatives: [{ id: "one_trial", title: "One trial of a binomial", kind: "conceptual", text: ["A Bernoulli variable is a binomial with n = 1.", "So its mean is np = p and its variance npq = p(1 − p)."] }],
  },
  limits: "Rational p with denominators up to 12 (up to 10 for two-point distributions) and whole-number values; general discrete distributions are the families atrvmean and atrvvar.",
};

// ---- lines in space: equations, intersection; planes; angles
const lsPRU = (p: number[]) => [1 + (Math.abs(p[1] + p[4]) % 3), 1 + (Math.abs(p[2] + 2 * p[5]) % 2), 1 + (Math.abs(p[3] + p[6]) % 3)];
/** The non-standard Cartesian form (Px − q)/l = (Ry + s)/m = (t − Uz)/n, written out. */
function lsCart(q: number, s: number, t: number, l: number, m: number, n: number, [P, Rr, U]: number[]) {
  const top1 = `${P === 1 ? "x" : `${P}x`}${q === 0 ? "" : q > 0 ? ` − ${q}` : ` + ${-q}`}`;
  const top2 = `${Rr === 1 ? "y" : `${Rr}y`}${s === 0 ? "" : s > 0 ? ` + ${s}` : ` − ${-s}`}`;
  const top3 = `${t === 0 ? `−${U === 1 ? "" : U}z` : `${mi(t)} − ${U === 1 ? "" : U}z`}`;
  const wrap = (x: string) => (/ [+−] |^−/.test(x) ? `(${x})` : x);
  return `${wrap(top1)}/${par(l)} = ${wrap(top2)}/${par(m)} = ${wrap(top3)}/${par(n)}`;
}
const par = (v: number) => (v < 0 ? `(${mi(v)})` : mi(v));
const asleqOk = (p: number[]) => {
  const [kind, a, b, c, l, m, n] = p;
  if (!allIn(p, [[0, 2], [-2, 2], [-2, 2], [-2, 2], [-3, 3], [-3, 3], [-3, 3]])) return false;
  if (kind === 1) return (l !== 0 || m !== 0 || n !== 0) && thin(p, 280);
  return l !== 0 && m !== 0 && n !== 0 && thin(p, 180);
};
function asleqAns(p: number[]): string {
  const [kind, a, b, c, l, m, n] = p;
  if (kind === 1) return tup([a, b, c, l, m, n].map(mi));
  const [P, Rr, U] = lsPRU(p);
  const pt = kind === 0 ? [R_(a, P), R_(-b, Rr), R_(c, U)] : [R_(a), R_(b), R_(c)];
  return tup([...pt.map(rs), rs(R_(l, P)), rs(R_(m, Rr)), rs(R_(-n, U))]);
}
const asleq: Def = {
  id: "asleq",
  arity: 7,
  title: "Vector and Cartesian equations of a line in space",
  competency: SL,
  skill: "equations of a line in space",
  type: "tuple",
  mc: true,
  // [kind, a, b, c, l, m, n]: 0 convert (Px − a)/l = (Ry + b)/m = (c − Uz)/n to r = a⃗ + λb⃗; 1 the line through A(a, b, c) and B = A + (l, m, n); 2 through A(a, b, c) parallel to the line (Px − 1)/l = (Ry + 1)/m = (2 − Uz)/n
  parse: none,
  reject: (p) => (asleqOk(p) ? null : "Whole-number points and direction numbers."),
  prompt: (p) => {
    const [kind, a, b, c, l, m, n] = p;
    const tail = "Write it as r⃗ = a⃗ + λb⃗, where a⃗ = (a₁, a₂, a₃) and b⃗ = (b₁, b₂, b₃) are the numbers you get by writing the line as (x − a₁)/b₁ = (y − a₂)/b₂ = (z − a₃)/b₃. Type (a₁, a₂, a₃, b₁, b₂, b₃).";
    if (kind === 0) return `The Cartesian equation of a line is ${lsCart(a, b, c, l, m, n, lsPRU(p))}. ${tail}`;
    if (kind === 1) return `Find the vector equation of the line through A${P3([a, b, c])} and B${P3([a + l, b + m, c + n])} in the form r⃗ = a⃗ + λ(b⃗ − a⃗), with a⃗ the position vector of A and b⃗ that of B. Type the components of a⃗ and of b⃗ − a⃗ as (a₁, a₂, a₃, d₁, d₂, d₃).`;
    return `Find the equation of the line through A${P3([a, b, c])} parallel to the line ${lsCart(1, 1, 2, l, m, n, lsPRU(p))}. Write it as r⃗ = a⃗ + λb⃗, where a⃗ is the position vector of A and b⃗ = (b₁, b₂, b₃) are the denominators of the given line once it is written as (x − x₀)/b₁ = (y − y₀)/b₂ = (z − z₀)/b₃. Type (a₁, a₂, a₃, b₁, b₂, b₃).`;
  },
  solve: (p) => {
    const ans = asleqAns(p);
    const how = ["divide each numerator by the coefficient of its variable (and make the z coefficient +1)", "direction b⃗ − a⃗ = AB", "the same direction as the given line, through A"][p[0]];
    return { steps: [S("standard", "rewrite", SL, [p[0]], how), S("read", "read", SL, [], ans)], answer: ans };
  },
  // independent: points r = a + λb of the answer put back into the given equations (each fraction must equal λ), or the given points recovered at λ = 0 and 1
  validate: (p, v) => {
    const t = nums(v);
    if (!t || t.length !== 6) return false;
    const [kind, a, b, c, l, m, n] = p;
    const pt = (lam: number) => [t[0] + lam * t[3], t[1] + lam * t[4], t[2] + lam * t[5]];
    if (kind === 1) return samePts(pt(0), [a, b, c]) && samePts(pt(1), [a + l, b + m, c + n]);
    const [P, Rr, U] = lsPRU(p);
    const [q, s, tt] = kind === 0 ? [a, b, c] : [1, 1, 2];
    const fr = (X: number[]) => [(P * X[0] - q) / l, (Rr * X[1] + s) / m, (tt - U * X[2]) / n];
    if (kind === 2 && !samePts(pt(0), [a, b, c])) return false;
    return [0, 1, -2.5].every((lam) => {
      const f = fr(pt(lam));
      const f0 = fr(pt(0));
      // kind 0: the fractions agree with each other along the line and equal λ; kind 2: each fraction grows by exactly λ (same direction numbers)
      return kind === 0 ? f.every((x) => close(x, lam, 1e-9)) : f.every((x, i) => close(x - f0[i], lam, 1e-9));
    });
  },
  bugs: (p) => {
    const [kind, a, b, c, l, m, n] = p;
    const [P, Rr, U] = lsPRU(p);
    const ans = asleqAns(p);
    const out: Bug[] = [];
    if (kind === 1) {
      out.push(B("b-as-direction", "conceptual", SL, "The position vector of B was used as the direction; the direction is b⃗ − a⃗ (the vector from A to B).", tup([a, b, c, a + l, b + m, c + n].map(mi))));
      out.push(B("ba", "procedural", SL, "The direction was taken from B to A; with the form a⃗ + λ(b⃗ − a⃗) it is from A to B.", tup([a, b, c, -l, -m, -n].map(mi))));
    } else {
      const pt = kind === 0 ? [R_(a, P), R_(-b, Rr), R_(c, U)] : [R_(a), R_(b), R_(c)];
      out.push(B("denominators-as-written", "procedural", SL, "The denominators were read as they stand; first make the coefficients of x, y and z equal to 1 (divide top and bottom by them, and turn (c − z) into −(z − c)).", tup([...pt.map(rs), mi(l), mi(m), mi(n)])));
      if (kind === 0) out.push(B("signs-as-written", "procedural", SL, "The point was read with the signs as written; (x − a)/l passes through x = a, so the + and − in the numerators change sign.", tup([rs(R_(-a, P)), rs(R_(b, Rr)), rs(R_(-c, U)), rs(R_(l, P)), rs(R_(m, Rr)), rs(R_(-n, U))])));
      out.push(B("z-sign", "procedural", SL, "The minus sign in front of z was left in the numerator; (c − Uz)/n = (z − c/U)/(−n/U).", tup([...pt.map(rs), rs(R_(l, P)), rs(R_(m, Rr)), rs(R_(n, U))])));
    }
    return out.filter((x) => x.predict !== ans);
  },
  distractors: ([, a, b, c, l, m, n]) => [tup([l, m, n, a, b, c].map(mi))],
  variants: () => [],
  explain: (s) => (s.id === "standard" ? `Standard form: ${s.value}` : `So (a₁, a₂, a₃, b₁, b₂, b₃) = ${s.value}`),
  domain: [[0, 2], [-2, 2], [-2, 2], [-2, 2], [-3, 3], [-3, 3], [-3, 3]],
  keep: (p) => asleqOk(p),
  cap: 300,
  difficulty: ([kind]) => (kind === 1 ? 1 : kind === 2 ? 2 : 3),
  teach: {
    idea: "A line through the point A with direction b⃗ is r⃗ = a⃗ + λb⃗ (vector form), or (x − a₁)/b₁ = (y − a₂)/b₂ = (z − a₃)/b₃ (Cartesian form). The denominators are direction ratios and the numerators show the point.",
    method: "To convert Cartesian to vector form, first make the coefficients of x, y and z equal to +1 in the numerators (divide top and bottom), then read the point from the numerators and the direction from the denominators. Through two points, use b⃗ − a⃗ as the direction.",
    alternatives: [{ id: "lambda", title: "Set each fraction equal to λ", kind: "procedural", text: ["Write (2x − 1)/3 = λ, so x = 1/2 + (3/2)λ; do the same for y and z.", "The constant terms give the point and the coefficients of λ give the direction."] }],
  },
  limits: "Whole-number data; lines given as the intersection of two planes are left out.",
};

const asint3Ok = (p: number[]) => {
  const [px, py, pz, iu, iv, l0, m0] = p;
  return allIn(p, [[-2, 2], [-2, 2], [-2, 2], [0, 5], [6, 11], [-2, 2], [-2, 2]]) && !isZero(cross(DIRS[iu], DIRS[iv])) && l0 !== 0 && m0 !== 0 && thin(p, 200);
};
const asint3Lines = ([px, py, pz, iu, iv, l0, m0]: number[]) => {
  const P = [px, py, pz];
  return { a: sub(P, scl(l0, DIRS[iu])), u: DIRS[iu], b: sub(P, scl(m0, DIRS[iv])), w: DIRS[iv], P };
};
const asint3: Def = {
  id: "asint3",
  arity: 7,
  title: "The point of intersection of two lines in space",
  competency: SL,
  skill: "point of intersection of two lines",
  type: "tuple",
  mc: true,
  // [px, py, pz, iu, iv, l0, m0]: the lines meet at P = a + l0 u = b + m0 v
  parse: none,
  reject: (p) => (asint3Ok(p) ? null : "Two non-parallel lines through a whole-number point."),
  prompt: (p) => {
    const { a, u, b, w } = asint3Lines(p);
    return `Show that the lines ${lineVec(a, u)} and ${lineVec(b, w, "μ")} intersect, and find their point of intersection. Type it as (x, y, z).`;
  },
  solve: (p) => {
    const { P } = asint3Lines(p);
    return { steps: [S("equate", "equate", SL, [], "a⃗ + λu⃗ = b⃗ + μv⃗ componentwise"), S("solve", "solve", SL, [p[5], p[6]], `λ = ${mi(p[5])}, μ = ${mi(p[6])} (the third equation checks)`), S("point", "substitute", SL, [], P3(P))], answer: P3(P) };
  },
  // independent: the answer lies on both lines (P − a parallel to u, P − b parallel to v)
  validate: (p, v) => {
    const t = nums(v);
    if (!t || t.length !== 3) return false;
    const { a, u, b, w } = asint3Lines(p);
    return isZero(cross(sub(t, a), u).map((x) => (Math.abs(x) < 1e-9 ? 0 : x))) && isZero(cross(sub(t, b), w).map((x) => (Math.abs(x) < 1e-9 ? 0 : x)));
  },
  bugs: (p) => {
    const { a, u, b, w, P } = asint3Lines(p);
    const [, , , , , l0, m0] = p;
    const out: Bug[] = [
      B("lambda-in-second", "procedural", SL, `λ = ${mi(l0)} was put into the second line instead of μ = ${mi(m0)}.`, l0 === m0 ? null : P3(addv(b, scl(l0, w)))),
      B("sign-of-lambda", "procedural", SL, `The sign of λ was slipped: λ = ${mi(-l0)} was used.`, P3(sub(a, scl(l0, u)))),
    ];
    return out.filter((x) => x.predict !== P3(P));
  },
  distractors: (p) => {
    const { a, b } = asint3Lines(p);
    return [P3(a), P3(b)];
  },
  variants: () => [],
  explain: (s) => (s.id === "equate" ? `Set ${s.value}` : s.id === "solve" ? `Solve two of the equations: ${s.value}` : `Substitute: the point is ${s.value}`),
  domain: [[-2, 2], [-2, 2], [-2, 2], [0, 5], [6, 11], [-2, 2], [-2, 2]],
  keep: (p) => asint3Ok(p),
  cap: 300,
  difficulty: ([, , , , , l0, m0]) => (Math.abs(l0) === 1 && Math.abs(m0) === 1 ? 1 : 2),
  teach: {
    idea: "Two lines in space meet when some point is on both: a⃗ + λu⃗ = b⃗ + μv⃗ for one pair λ, μ. That is three equations in two unknowns; they intersect when the third equation agrees with the λ, μ found from two of them.",
    method: "Write the x, y and z equations, solve two of them for λ and μ, check the third, and substitute λ into the first line (or μ into the second).",
    alternatives: [{ id: "check", title: "Check on both lines", kind: "procedural", text: ["Put your point into the Cartesian form of each line: all three fractions must be equal.", "If they are equal for both lines, the point is on both."] }],
  },
  limits: "Lines that do meet, at a whole-number point; the shortest distance between skew lines is the family asskew.",
};

const UNITN: [number[], number][] = [[[2, -1, 2], 3], [[1, 2, 2], 3], [[2, 3, 6], 7], [[1, 4, 8], 9], [[2, -2, 1], 3], [[6, 2, -3], 7]];
const normPlane = (n: number[], d: number): number[] => {
  const g = gcd3(n[0], n[1], n[2], d) || 1;
  let out = [...n, d].map((x) => x / g);
  const lead = out.find((x, i) => i < 3 && x !== 0)!;
  if (lead < 0) out = out.map((x) => -x);
  return out.map((x) => x || 0);
};
const asplaneqOk = (p: number[]) => {
  const [kind, i, x0, y0, z0] = p;
  if (kind === 2) return x0 !== 0 && y0 !== 0 && z0 !== 0 && allIn([x0, y0, z0], [[-4, 4], [-4, 4], [-4, 4]]) && i === 0 && thin(p, 3);
  if (kind === 4) return i >= 0 && i <= 5 && x0 >= 1 && x0 <= 4 && y0 === 0 && z0 === 0;
  return kind >= 0 && kind <= 3 && i >= 0 && i <= 11 && allIn([x0, y0, z0], [[-2, 2], [-2, 2], [-2, 2]]) && thin(p, kind === 1 ? 8 : 6);
};
/** The plane's data: normal n, point P0, and two directions in the plane. */
function plData([kind, i, x0, y0, z0]: number[]) {
  if (kind === 2) {
    const n = [y0 * z0, x0 * z0, x0 * y0];
    return { n, d: x0 * y0 * z0, P0: [x0, 0, 0] };
  }
  if (kind === 4) {
    const [n, len] = UNITN[i];
    return { n, d: x0 * len, P0: [0, 0, 0] };
  }
  const n = NORMALS[i];
  const P0 = [x0, y0, z0];
  return { n, d: dot(n, P0), P0 };
}
const plDirs = (n: number[]) => {
  const e = Math.abs(n[0]) <= Math.abs(n[1]) && Math.abs(n[0]) <= Math.abs(n[2]) ? [1, 0, 0] : Math.abs(n[1]) <= Math.abs(n[2]) ? [0, 1, 0] : [0, 0, 1];
  const u = cross(n, e);
  const g = gcd3(...u) || 1;
  const u1 = u.map((x) => x / g);
  const w = cross(n, u1);
  const g2 = gcd3(...w) || 1;
  return [u1, w.map((x) => x / g2)];
};
const asplaneq: Def = {
  id: "asplaneq",
  arity: 5,
  title: "The equation of a plane from three points, a point and a normal, its intercepts, a line and a point, or its normal form",
  competency: PL,
  skill: "equation of a plane",
  type: "tuple",
  mc: true,
  // [kind, i, x0, y0, z0]: 0 through three points, 1 through P0 with normal NORMALS[i], 2 intercepts x0, y0, z0, 3 containing a line through P0 and another point, 4 at distance x0 from O with normal along UNITN[i]
  parse: none,
  reject: (p) => (asplaneqOk(p) ? null : "A plane with a small whole-number normal through a whole-number point."),
  prompt: (p) => {
    const [kind, i, x0, y0, z0] = p;
    const { n, P0 } = plData(p);
    const [u, w] = plDirs(n);
    const tail = "Write it as ax + by + cz = d with whole numbers having no common factor and the first non-zero one of a, b, c positive. Type (a, b, c, d).";
    if (kind === 0) return `Find the equation of the plane through the points ${P3(P0)}, ${P3(addv(P0, u))} and ${P3(addv(P0, w))}. ${tail}`;
    if (kind === 1) return `Find the equation of the plane through ${P3(P0)} perpendicular to the vector ${vec(scl(1 + (i % 2), n))}. ${tail}`;
    if (kind === 2) return `Find the equation of the plane that cuts off intercepts ${mi(x0)}, ${mi(y0)} and ${mi(z0)} on the x-, y- and z-axes. ${tail}`;
    if (kind === 3) return `Find the equation of the plane that contains the line ${lineVec(P0, u)} and the point ${P3(addv(P0, w))}. ${tail}`;
    return `A plane is at a distance of ${x0} unit${x0 === 1 ? "" : "s"} from the origin, and the perpendicular from the origin to it is along the vector ${vec(UNITN[i][0])}. Using the normal form r⃗ · n̂ = p, find its equation. ${tail}`;
  },
  solve: (p) => {
    const { n, d } = plData(p);
    const ans = tup(normPlane(n, d).map(mi));
    const how = ["n⃗ = (B − A) × (C − A)", "n⃗ · (r⃗ − a⃗) = 0", "x/a + y/b + z/c = 1, cleared of fractions", "n⃗ = u⃗ × (P − A) for the line direction u⃗", "r⃗ · n̂ = p with n̂ = n⃗/|n⃗|"][p[0]];
    return { steps: [S("normal", "find", PL, [p[0]], how), S("equation", "write", PL, [], ans)], answer: ans };
  },
  // independent: the given points (or intercepts) satisfy the answer, the answer's normal is parallel to the given one, or its distance from O is p
  validate: (p, v) => {
    const t = nums(v);
    if (!t || t.length !== 4 || !t.every(Number.isInteger) || gcd3(...t) !== 1) return false;
    const lead = t.slice(0, 3).find((x) => x !== 0);
    if (lead === undefined || lead < 0) return false;
    const on = (X: number[]) => close(t[0] * X[0] + t[1] * X[1] + t[2] * X[2], t[3], 1e-9);
    const [kind, i, x0, y0, z0] = p;
    const { n, P0 } = plData(p);
    const [u, w] = plDirs(n);
    if (kind === 0 || kind === 3) return [P0, addv(P0, u), addv(P0, w), addv(addv(P0, u), w)].every(on);
    if (kind === 1) return on(P0) && isZero(cross(t.slice(0, 3), n));
    if (kind === 2) return on([x0, 0, 0]) && on([0, y0, 0]) && on([0, 0, z0]);
    const nn = t.slice(0, 3);
    return isZero(cross(nn, UNITN[i][0])) && dot(nn, UNITN[i][0]) > 0 && close(t[3] / norm(nn), x0, 1e-9);
  },
  bugs: (p) => {
    const [kind, i, x0, y0, z0] = p;
    const { n, d } = plData(p);
    const ans = tup(normPlane(n, d).map(mi));
    const out: Bug[] = [B("d-sign", "procedural", PL, "The constant came out with the wrong sign: n⃗ · (r⃗ − a⃗) = 0 gives n⃗ · r⃗ = n⃗ · a⃗.", d === 0 ? null : tup(normPlane(n, -d).map(mi)))];
    if (kind === 2) out.push(B("intercepts-as-coefficients", "conceptual", PL, "The intercepts were used as the coefficients (x0·x + y0·y + z0·z = 1); the intercept form is x/a + y/b + z/c = 1.", tup(normPlane([x0, y0, z0], 1).map(mi))));
    if (kind === 4) out.push(B("unit-forgotten", "procedural", PL, `The distance was not multiplied by |n⃗| = ${UNITN[i][1]}; in r⃗ · n̂ = p the normal must be a unit vector.`, tup([...UNITN[i][0], x0].map(mi))));
    return out.filter((x) => x.predict !== ans);
  },
  distractors: (p) => {
    const { n, d } = plData(p);
    return [tup(normPlane(n, d + 1).map(mi)), tup(normPlane(n, d - 2).map(mi)), tup(normPlane([n[1], n[0], n[2]], d).map(mi)), tup(normPlane([n[0], n[1], -n[2]], d + 3).map(mi)), tup(normPlane([n[0] + 1, n[1], n[2]], d).map(mi))];
  },
  variants: () => [],
  explain: (s) => (s.id === "normal" ? `Find the normal: ${s.value}` : `So (a, b, c, d) = ${s.value}`),
  domain: [[0, 4], [0, 11], [-4, 4], [-4, 4], [-4, 4]],
  keep: (p) => asplaneqOk(p),
  cap: 400,
  difficulty: ([kind]) => (kind === 1 || kind === 2 ? 1 : kind === 4 ? 2 : 3),
  teach: {
    idea: "A plane is fixed by a point A on it and a normal vector n⃗: n⃗ · (r⃗ − a⃗) = 0. Three points give the normal as (B − A) × (C − A); intercepts give x/a + y/b + z/c = 1; the normal form r⃗ · n̂ = p uses the unit normal and the distance p from the origin.",
    method: "Find a normal vector and a point from the data, write n⃗ · r⃗ = n⃗ · a⃗, clear fractions and remove any common factor.",
    alternatives: [{ id: "check", title: "Check with the data", kind: "procedural", text: ["Put each given point into your equation: it must fit.", "For intercepts, put two of x, y, z equal to 0 and see whether you get the intercept back."] }],
  },
  limits: "Small whole-number normals and points; planes through the intersection of two planes are left out.",
};

const asplangOk = ([kind, i, j]: number[]) => allIn([kind, i, j], [[0, 1], [0, 11], [0, 11]]) && (kind === 1 || i < j) && (kind === 0 ? !isZero(cross(NORMALS[i], NORMALS[j])) : dot(DIRS[i], NORMALS[j]) !== 0);
const angleE = (u: number[], w: number[]) => {
  const N = dot(u, u) * dot(w, w);
  return E_(R_(Math.abs(dot(u, w)), N), N);
};
const asplang: Def = {
  id: "asplang",
  arity: 3,
  title: "The angle between two planes, or between a line and a plane",
  competency: PL,
  skill: "angles involving planes",
  type: "exact",
  mc: true,
  // [kind, i, j]: 0 cos θ between the planes with normals NORMALS[i], NORMALS[j]; 1 sin φ between the line with direction DIRS[i] and the plane with normal NORMALS[j]
  parse: none,
  reject: (p) => (asplangOk(p) ? null : "Two planes that meet, or a line that is not parallel to the plane."),
  prompt: ([kind, i, j]) =>
    kind === 0
      ? `Find cos θ, where θ (0° ≤ θ ≤ 90°) is the angle between the planes ${planeTxt(NORMALS[i], i - j)} and ${planeTxt(NORMALS[j], i + j)}.`
      : `Find sin φ, where φ is the angle between the line ${lineVec([1, -1, 2], DIRS[i])} and the plane ${planeTxt(NORMALS[j], j + 1)}.`,
  solve: ([kind, i, j]) => {
    const [u, w] = kind === 0 ? [NORMALS[i], NORMALS[j]] : [DIRS[i], NORMALS[j]];
    const ans = es(angleE(u, w));
    return { steps: [S("vectors", "read", PL, [], kind === 0 ? `normals ${vec(u)} and ${vec(w)}` : `direction ${vec(u)}, normal ${vec(w)}`), S("dot", "multiply", VEC, [], Math.abs(dot(u, w))), S("value", "divide", PL, [dot(u, u), dot(w, w)], ans)], answer: ans };
  },
  // independent: planes — the angle between lines drawn in each plane perpendicular to their common line; line and plane — the angle between the line and its projection on the plane
  validate: ([kind, i, j], v) => {
    const x = num1(v);
    if (x === null) return false;
    if (kind === 0) {
      const L = cross(NORMALS[i], NORMALS[j]);
      const w1 = cross(NORMALS[i], L);
      const w2 = cross(NORMALS[j], L);
      return close(x, Math.abs(dot(w1, w2)) / (norm(w1) * norm(w2)), 1e-9);
    }
    const u = DIRS[i];
    const n = NORMALS[j];
    const proj = sub(u, scl(dot(u, n) / dot(n, n), n));
    const cosPhi = norm(proj) === 0 ? 0 : Math.abs(dot(u, proj)) / (norm(u) * norm(proj));
    return close(x, Math.sqrt(Math.max(0, 1 - cosPhi * cosPhi)), 1e-9);
  },
  bugs: ([kind, i, j]) => {
    const [u, w] = kind === 0 ? [NORMALS[i], NORMALS[j]] : [DIRS[i], NORMALS[j]];
    const N = dot(u, u) * dot(w, w);
    const ans = es(angleE(u, w));
    const out: Bug[] = [B("not-divided", "procedural", PL, "Only the dot product was found; it must be divided by the product of the two lengths.", mi(Math.abs(dot(u, w))))];
    if (kind === 1 && N - dot(u, w) ** 2 > 0) out.push(B("cos-for-sin", "conceptual", PL, "cos φ was found (as if the formula with the normal gave the cosine of the angle with the plane); the line makes 90° minus its angle with the normal, so the formula gives sin φ directly.", es(E_(R_(1, N), N * (N - dot(u, w) ** 2)))));
    out.push(B("one-length", "procedural", PL, "The dot product was divided by only one of the lengths.", es(E_(R_(Math.abs(dot(u, w)), dot(u, u)), dot(u, u)))));
    return out.filter((x) => x.predict !== null && x.predict !== ans);
  },
  distractors: ([kind, i, j]) => {
    const [u, w] = kind === 0 ? [NORMALS[i], NORMALS[j]] : [DIRS[i], NORMALS[j]];
    return [es(E_(R_(Math.abs(dot(u, w)), dot(u, u) + dot(w, w)))), "1/2", "1/3", "√2/2", "√3/2", "2/3"];
  },
  variants: () => [],
  explain: (s) => (s.id === "vectors" ? `Use the ${s.value}` : s.id === "dot" ? `|dot product| = ${s.value}` : `Divide by √${s.inputs[0]} × √${s.inputs[1]}: ${s.value}`),
  range: [0, 1],
  domain: [[0, 1], [0, 11], [0, 11]],
  keep: (p) => asplangOk(p),
  difficulty: ([kind]) => (kind === 0 ? 2 : 3),
  teach: {
    idea: "The angle between two planes is the angle between their normals: cos θ = |n⃗₁ · n⃗₂|/(|n⃗₁||n⃗₂|). A line with direction b⃗ makes an angle φ with a plane of normal n⃗ where sin φ = |b⃗ · n⃗|/(|b⃗||n⃗|), because the line makes 90° − φ with the normal.",
    method: "Read the normal vectors (the coefficients of x, y, z) and the line's direction, work out the dot product and the two lengths, and divide; simplify the surd.",
    alternatives: [{ id: "picture", title: "Look along the common line", kind: "conceptual", text: ["Two planes meeting look like two lines when seen along their line of intersection.", "The normals turn by the same angle as the planes, so the angle between the normals is the angle between the planes."] }],
  },
  limits: "Normals and directions with small whole-number components; angles between a line and a plane parallel to it are left out.",
};

// ---- tangents and normals to ellipses and hyperbolas, with parametric points
const TE_CS: [number, number][] = [[3, 4], [4, 3], [-3, 4], [3, -4], [-4, -3], [4, -3], [-3, -4], [-4, 3]];
const astanehOk = ([kind, A, Bb, t, w, g]: number[]) => allIn([kind, A, Bb, t, w, g], [[0, 1], [2, 6], [1, 6], [0, 7], [0, 1], [0, 1]]) && (kind === 1 || A !== Bb);
/** The point: ellipse (A cos θ, B sin θ) with (cos, sin) = TE_CS[t]/5; hyperbola (A sec θ, B tan θ) with sec = 5/c, tan = s/c. */
const tePoint = ([kind, A, Bb, t]: number[]): [R, R] => {
  const [c, s] = TE_CS[t];
  return kind === 0 ? [R_(A * c, 5), R_(Bb * s, 5)] : [R_(5 * A, c), R_(Bb * s, c)];
};
function teLine(p: number[], normal: number): [R, R] {
  const [kind, A, Bb] = p;
  const [x1, y1] = tePoint(p);
  const sg = kind === 0 ? 1 : -1;
  // tangent: x x1/A² + sg y y1/B² = 1, slope −(B² x1)/(sg A² y1)
  const mt = rdiv(rmul(R_(-Bb * Bb), x1), rmul(R_(sg * A * A), y1));
  const m = normal ? rdiv(R_(-1), mt) : mt;
  return [m, rsub(y1, rmul(m, x1))];
}
const teCurve = ([kind, A, Bb]: number[]) => `${kind ? "hyperbola" : "ellipse"} ${A === 1 ? "x²" : `x²/${A * A}`} ${kind ? "−" : "+"} ${Bb === 1 ? "y²" : `y²/${Bb * Bb}`} = 1`;
const teK = (k: number) => (k === 1 ? "" : `${k} `);
const astaneh: Def = {
  id: "astaneh",
  arity: 6,
  title: "Tangents and normals to an ellipse or a hyperbola, with points in parametric form",
  competency: TAN,
  skill: "tangents and normals to ellipses and hyperbolas",
  type: "exact",
  mc: true,
  // [kind, A, B, t, w, g]: ellipse (0) or hyperbola (1) with a = A, b = B; the point from TE_CS[t]; w 0 tangent, 1 normal; g 1: the point given by its parameter θ
  parse: none,
  reject: (p) => (astanehOk(p) ? null : "An ellipse or hyperbola with whole-number semi-axes and a point from a 3–4–5 parameter."),
  prompt: (p) => {
    const [kind, A, Bb, t, w, g] = p;
    const [c, s] = TE_CS[t];
    const [x1, y1] = tePoint(p);
    const where = g ? `the point with parameter θ, where ${kind ? `sec θ = ${rs(R_(5, c))} and tan θ = ${rs(R_(s, c))} (x = ${teK(A)}sec θ, y = ${teK(Bb)}tan θ)` : `cos θ = ${rs(R_(c, 5))} and sin θ = ${rs(R_(s, 5))} (x = ${teK(A)}cos θ, y = ${teK(Bb)}sin θ)`}` : `the point (${rs(x1)}, ${rs(y1)})`;
    return `Find the equation of the ${w ? "normal" : "tangent"} to the ${teCurve(p)} at ${where}. Write it as y = mx + c and type the right-hand side.`;
  },
  solve: (p) => {
    const [x1, y1] = tePoint(p);
    const [m, c] = teLine(p, p[4]);
    const ans = rhsR(m, c);
    return { steps: [S("point", "evaluate", TAN, [p[5]], `(${rs(x1)}, ${rs(y1)})`), S("slope", "differentiate", TAN, [p[4]], rs(m)), S("line", "write", LINE, [], ans)], answer: ans };
  },
  // independent: implicit differentiation done numerically (−F_x/F_y by central differences) at the point, and the line through it
  validate: (p, v) => {
    const [kind, A, Bb, , w] = p;
    const L = lineOf(v);
    if (!L) return false;
    const [x1, y1] = tePoint(p).map(rv);
    const F = (x: number, y: number) => (x * x) / (A * A) + (kind ? -1 : 1) * ((y * y) / (Bb * Bb)) - 1;
    if (Math.abs(F(x1, y1)) > 1e-9) return false;
    const h = 1e-5;
    const Fx = (F(x1 + h, y1) - F(x1 - h, y1)) / (2 * h);
    const Fy = (F(x1, y1 + h) - F(x1, y1 - h)) / (2 * h);
    const slope = -Fx / Fy;
    return close(L[0] * x1 + L[1], y1, 1e-9) && (w ? close(L[0] * slope, -1, 1e-6) : close(L[0], slope, 1e-6));
  },
  bugs: (p) => {
    const [kind, , , , w] = p;
    const [x1, y1] = tePoint(p);
    const ans = rhsR(...teLine(p, w));
    const out: Bug[] = [];
    if (w) out.push(B("tangent-for-normal", "conceptual", TAN, "The tangent was given; the normal is perpendicular to it at the same point.", rhsR(...teLine(p, 0))));
    if (kind === 1) {
      const [, A, Bb] = p;
      const mt = rdiv(rmul(R_(-Bb * Bb), x1), rmul(R_(A * A), y1));
      const me = w ? rdiv(R_(-1), mt) : mt;
      out.push(B("ellipse-rule", "recall", TAN, "The tangent rule for an ellipse (with +) was used; for a hyperbola it is xx₁/a² − yy₁/b² = 1.", rhsR(me, rsub(y1, rmul(me, x1)))));
    }
    const [m] = teLine(p, w);
    out.push(B("intercept-sign", "procedural", LINE, "In y − y₁ = m(x − x₁), the term −m·x₁ was added instead of subtracted.", rhsR(m, radd(y1, rmul(m, x1)))));
    return out.filter((x) => x.predict !== ans);
  },
  distractors: (p) => {
    const [m, c] = teLine(p, p[4]);
    return [rhsR(rmul(m, R_(-1)), c), rhsR(m, rmul(c, R_(-1)))];
  },
  variants: () => [],
  explain: (s) => (s.id === "point" ? `The point is ${s.value}` : s.id === "slope" ? `Differentiating (or from xx₁/a² ± yy₁/b² = 1), the ${s.inputs[0] ? "normal's" : "tangent's"} slope is ${s.value}` : `y = ${s.value}`),
  domain: [[0, 1], [2, 6], [1, 6], [0, 7], [0, 1], [0, 1]],
  keep: (p) => astanehOk(p),
  cap: 400,
  difficulty: ([kind, , , , w, g]) => (kind === 0 && w === 0 && g === 0 ? 1 : g || kind ? 3 : 2),
  teach: {
    idea: "The tangent to x²/a² + y²/b² = 1 at (x₁, y₁) is xx₁/a² + yy₁/b² = 1; for the hyperbola x²/a² − y²/b² = 1 it is xx₁/a² − yy₁/b² = 1. The normal is the perpendicular line through the same point. In parametric form the points are (a cos θ, b sin θ) and (a sec θ, b tan θ).",
    method: "Find the point (from θ if it is given in parametric form), write the tangent by the rule (or find dy/dx by implicit differentiation), and rearrange to y = mx + c; for the normal use slope −1/m through the point.",
    alternatives: [{ id: "implicit", title: "Implicit differentiation", kind: "procedural", text: ["Differentiate x²/a² ± y²/b² = 1: 2x/a² ± 2y y′/b² = 0, so y′ = ∓ b²x/(a²y).", "Put in the point to get the tangent's slope."] }],
  },
  limits: "Centred ellipses and hyperbolas at points with 3–4–5 parameters; tangents from an external point are left out.",
};

// ---- the angle bisectors of a pair of lines through the origin
const aspairbisOk = (pp: number[]) => pairOk(pp) && pairCoef(pp).H2 !== 0 && thin(pp, 2);
const aspairbis: Def = {
  id: "aspairbis",
  arity: 4,
  title: "The angle bisectors of a pair of lines through the origin",
  competency: PAIR,
  skill: "bisectors of a pair of lines",
  type: "fraction",
  mc: true,
  // [p1, q1, p2, q2]: the lines q₁y = p₁x and q₂y = p₂x as one equation ax² + 2hxy + by² = 0 (h ≠ 0)
  parse: none,
  reject: (pp) => (aspairbisOk(pp) ? null : "Two different lines through the origin with an xy term."),
  prompt: (pp) => `The equation ${pairEq(pp)} represents a pair of straight lines through the origin. Their angle bisectors together have an equation of the form x² + kxy − y² = 0. Find k.`,
  solve: (pp) => {
    const { A, H2, Bc } = pairCoef(pp);
    const k = (2 * (Bc - A)) / H2;
    return { steps: [S("formula", "recall", PAIR, [A, H2 / 2, Bc], `(x² − y²)/(a − b) = xy/h with a = ${A}, h = ${rs(R_(H2, 2))}, b = ${Bc}`), S("rearrange", "rearrange", PAIR, [], `x² ${k < 0 ? "−" : "+"} ${rs(rabs(R_(2 * (Bc - A), H2)))}xy − y² = 0`)], answer: k };
  },
  // independent: the two lines' slopes found by searching, their bisector directions from the angles, and the answer's equation checked on them
  validate: (pp, v) => {
    if (typeof v !== "number") return false;
    const ms = pairSearch(pp);
    if (ms.length !== 2) return false;
    const [t1, t2] = ms.map((m) => Math.atan(m));
    return [(t1 + t2) / 2, (t1 + t2) / 2 + Math.PI / 2].every((t) => close(Math.cos(t) ** 2 + v * Math.cos(t) * Math.sin(t) - Math.sin(t) ** 2, 0, 1e-9));
  },
  bugs: (pp) => {
    const { A, H2, Bc } = pairCoef(pp);
    const k = (2 * (Bc - A)) / H2;
    return [
      B("sign", "procedural", PAIR, "a − b was used where b − a belongs: h(x² − y²) = (a − b)xy rearranges to x² − ((a − b)/h)xy − y² = 0.", -k),
      B("2h", "recall", PAIR, "The coefficient of xy (which is 2h) was used as h, so the answer came out halved.", k / 2),
      B("upside-down", "procedural", PAIR, "The fraction was turned over: h/(b − a) was used instead of (b − a)/h.", Bc === A ? null : H2 / 2 / (Bc - A)),
    ].filter((b) => b.predict !== null && Number.isFinite(b.predict as number) && Math.abs((b.predict as number) - k) > 1e-12);
  },
  distractors: (pp) => {
    const { A, H2, Bc } = pairCoef(pp);
    const k = (2 * (Bc - A)) / H2;
    return [k + 1, 2 * k, (Bc + A) / (H2 / 2)];
  },
  variants: () => [],
  explain: (s) => (s.id === "formula" ? `The bisectors of ax² + 2hxy + by² = 0 are ${s.value}` : `So the bisectors are ${s.value}`),
  domain: PAIR_D,
  keep: (pp) => aspairbisOk(pp),
  cap: 300,
  difficulty: ([p1, q1, p2, q2]) => (q1 === 1 && q2 === 1 ? 2 : 3),
  teach: {
    idea: "The two angle bisectors of the lines ax² + 2hxy + by² = 0 are the lines whose points are equally far from both; together they are (x² − y²)/(a − b) = xy/h, that is h(x² − y²) − (a − b)xy = 0.",
    method: "Read a (the x² coefficient), 2h (the xy coefficient) and b (the y² coefficient), write h(x² − y²) = (a − b)xy and divide by h to get x² + kxy − y² = 0.",
    alternatives: [{ id: "angles", title: "Halve the angles", kind: "conceptual", text: ["Find the two lines' inclinations θ₁ and θ₂.", "The bisectors have inclinations (θ₁ + θ₂)/2 and (θ₁ + θ₂)/2 + 90°: they are perpendicular to each other."] }],
  },
  limits: "Pairs of real lines through the origin with whole-number coefficients and an xy term; pairs not through the origin are left out.",
};

// ---- which side of a line
const SIDE_NAMES = ["on the same side of the line", "on opposite sides of the line", "one of them lies on the line"];
const SIDE_PTS = [[1, 2], [-2, 1], [3, -1], [0, 4], [-3, -2], [2, -3], [4, 1], [-1, -4], [0, 0], [2, 2], [-4, 3], [1, -1]];
const sidePts = ([a, b, c, i, j]: number[]) => [a, b, c, ...SIDE_PTS[i], ...SIDE_PTS[j]];
const assideOk = (q: number[]) => {
  if (!allIn(q, [[-2, 2], [-2, 2], [-4, 4], [0, 11], [0, 11]]) || q[3] >= q[4] || !thin(q, 6)) return false;
  const p = sidePts(q);
  const [a, b, c, px, py, qx, qy] = p;
  if (a === 0 && b === 0) return false;
  const s1 = a * px + b * py + c;
  const s2 = a * qx + b * qy + c;
  return !(s1 === 0 && s2 === 0);
};
const sideCat = (q: number[]) => {
  const [a, b, c, px, py, qx, qy] = sidePts(q);
  const s1 = a * px + b * py + c;
  const s2 = a * qx + b * qy + c;
  return s1 === 0 || s2 === 0 ? 2 : s1 * s2 > 0 ? 0 : 1;
};
const sideChoices = (p: number[]) => mixed(SIDE_NAMES, `side:${p}`);
const asside: Def = {
  id: "asside",
  arity: 5,
  title: "Are two points on the same side of a line?",
  competency: LINE,
  skill: "position of points relative to a line",
  type: "choice",
  // [a, b, c, i, j]: the line ax + by + c = 0 and the points P = SIDE_PTS[i], Q = SIDE_PTS[j]
  parse: none,
  reject: (p) => (assideOk(p) ? null : "A line with small whole-number coefficients and two different whole-number points, not both on it."),
  prompt: (q) => {
    const [a, b, c, px, py, qx, qy] = sidePts(q);
    return `Where do the points P${P2(px, py)} and Q${P2(qx, qy)} lie relative to the line ${lin2(a, b, c)}?`;
  },
  choices: (p) => sideChoices(p),
  solve: (p) => {
    const [a, b, c, px, py, qx, qy] = sidePts(p);
    const s1 = a * px + b * py + c;
    const s2 = a * qx + b * qy + c;
    return { steps: [S("values", "substitute", LINE, [px, py, qx, qy], `${mi(s1)} and ${mi(s2)}`), S("signs", "compare", LINE, [s1, s2], sideChoices(p).indexOf(SIDE_NAMES[sideCat(p)]))], answer: sideChoices(p).indexOf(SIDE_NAMES[sideCat(p)]) };
  },
  // independent: whether the segment PQ meets the line, found by solving for the crossing point along PQ
  validate: (p, v) => {
    const [a, b, c, px, py, qx, qy] = sidePts(p);
    const f = (t: number) => a * (px + t * (qx - px)) + b * (py + t * (qy - py)) + c;
    const onEnd = Math.abs(f(0)) < 1e-12 || Math.abs(f(1)) < 1e-12;
    const slope = f(1) - f(0);
    const t = Math.abs(slope) < 1e-12 ? NaN : -f(0) / slope;
    const cat = onEnd ? 2 : Number.isFinite(t) && t > 0 && t < 1 ? 1 : 0;
    return sideChoices(p)[v as number] === SIDE_NAMES[cat];
  },
  bugs: (p) => {
    const [a, b, c, px, py, qx, qy] = sidePts(p);
    const cat = sideCat(p);
    const cs = sideChoices(p);
    const out: Bug[] = [];
    if (cat !== 2) out.push(B("rule-reversed", "conceptual", LINE, "The rule was reversed: values of ax + by + c with the same sign mean the same side, opposite signs mean opposite sides.", cs.indexOf(SIDE_NAMES[1 - cat])));
    const t1 = a * px + b * py;
    const t2 = a * qx + b * qy;
    const noC = t1 === 0 || t2 === 0 ? 2 : t1 * t2 > 0 ? 0 : 1;
    if (c !== 0 && noC !== cat) out.push(B("c-left-out", "procedural", LINE, `The constant ${mi(c)} was left out when the points were put into ax + by + c.`, cs.indexOf(SIDE_NAMES[noC])));
    return out;
  },
  variants: () => [],
  explain: (s) => (s.id === "values" ? `Put P and Q into the left-hand side: ${s.value}` : `${Number(s.inputs[0]) * Number(s.inputs[1]) === 0 ? "A zero value means the point is on the line" : Number(s.inputs[0]) * Number(s.inputs[1]) > 0 ? "Same signs: the same side" : "Opposite signs: opposite sides"} (option ${"ABC"[Number(s.value)]})`),
  domain: [[-2, 2], [-2, 2], [-4, 4], [0, 11], [0, 11]],
  // lines released in lowest terms with a positive leading coefficient (x − y + 2 = 0, not −2x + 2y − 4 = 0)
  keep: (p) => assideOk(p) && gcd(gcd(Math.abs(p[0]), Math.abs(p[1])), Math.abs(p[2])) === 1 && (p[0] > 0 || (p[0] === 0 && p[1] > 0)),
  cap: 300,
  difficulty: ([, , c]) => (c === 0 ? 1 : 2),
  teach: {
    idea: "A line ax + by + c = 0 splits the plane into two half-planes: on one side ax + by + c is positive, on the other negative, and on the line it is zero.",
    method: "Put each point into ax + by + c. Same signs: the same side. Opposite signs: opposite sides. Zero: the point is on the line.",
    alternatives: [{ id: "segment", title: "Does PQ cross the line?", kind: "conceptual", text: ["Join P and Q with a straight segment.", "The points are on opposite sides exactly when the segment crosses the line."], visual: (q) => {
      const [, , , px, py, qx, qy] = sidePts(q);
      return { type: "plane", points: [[px, py, "P"], [qx, qy, "Q"]], range: 5 };
    } }],
  },
  limits: "Small whole-number lines and points.",
};

// ---- families of lines through the intersection of two lines
const LCO: [number, number][] = [[1, 1], [1, -1], [2, 1], [1, 2], [2, -1], [1, -2], [3, 1], [1, 3], [3, -2], [2, 3]];
const asfamOk = (p: number[]) => {
  const [ix, iy, i1, i2, kind, q] = p;
  if (!allIn(p, [[-3, 3], [-3, 3], [0, 9], [0, 9], [0, 2], [0, 9]]) || i1 >= i2) return false;
  const [a1, b1] = LCO[i1];
  const [a2, b2] = LCO[i2];
  if (a1 * b2 - a2 * b1 === 0) return false;
  if (kind === 0) {
    const P = GF_PT[q % 4];
    return q < 4 && P[0] !== ix && !(P[1] === iy) && thin(p, 4);
  }
  const [a3, b3] = LCO[q];
  return q !== i1 && q !== i2 && (kind === 1 ? b3 !== 0 : a3 !== 0) && thin(p, 12);
};
const famLines = ([ix, iy, i1, i2]: number[]) => {
  const [a1, b1] = LCO[i1];
  const [a2, b2] = LCO[i2];
  return { L1: lin2(a1, b1, -(a1 * ix + b1 * iy)), L2: lin2(a2, b2, -(a2 * ix + b2 * iy)), c1: a1 * ix + b1 * iy, c2: a2 * ix + b2 * iy };
};
function famAns(p: number[]): string {
  const [ix, iy, , , kind, q] = p;
  let m: R;
  if (kind === 0) {
    const P = GF_PT[q];
    m = R_(P[1] - iy, P[0] - ix);
  } else {
    const [a3, b3] = LCO[q];
    m = kind === 1 ? R_(-a3, b3) : R_(b3, a3);
  }
  return rhsR(m, rsub(R_(iy), rmul(m, R_(ix))));
}
const asfam: Def = {
  id: "asfam",
  arity: 6,
  title: "A line through the point of intersection of two given lines",
  competency: LINE,
  skill: "families of lines",
  type: "exact",
  mc: true,
  // [ix, iy, i1, i2, kind, q]: L1, L2 from LCO meeting at (ix, iy); 0 through GF_PT[q]; 1 parallel, 2 perpendicular to the line with coefficients LCO[q]
  parse: none,
  reject: (p) => (asfamOk(p) ? null : "Two lines meeting at a whole-number point and a further condition."),
  prompt: (p) => {
    const [, , , , kind, q] = p;
    const { L1, L2 } = famLines(p);
    const cond = kind === 0 ? `passes through ${P2(GF_PT[q][0], GF_PT[q][1])}` : `is ${kind === 1 ? "parallel" : "perpendicular"} to the line ${lin2(LCO[q][0], LCO[q][1], 5)}`;
    return `Find the equation of the line through the point of intersection of ${L1} and ${L2} that ${cond}. (You may use the family L₁ + λL₂ = 0.) Write it as y = mx + c and type the right-hand side.`;
  },
  solve: (p) => {
    const [ix, iy] = p;
    const ans = famAns(p);
    return { steps: [S("family", "write", LINE, [], "L₁ + λL₂ = 0 passes through the intersection for every λ"), S("lambda", "solve", LINE, [p[4]], `the condition fixes λ; the line passes through (${mi(ix)}, ${mi(iy)})`), S("line", "write", LINE, [], ans)], answer: ans };
  },
  // independent: the intersection found by Cramer's rule from the two printed equations, and the condition checked on the answer line
  validate: (p, v) => {
    const [, , i1, i2, kind, q] = p;
    const L = lineOf(v);
    if (!L) return false;
    const { c1, c2 } = famLines(p);
    const [a1, b1] = LCO[i1];
    const [a2, b2] = LCO[i2];
    const D = a1 * b2 - a2 * b1;
    const X = (c1 * b2 - c2 * b1) / D;
    const Y = (a1 * c2 - a2 * c1) / D;
    if (!close(L[0] * X + L[1], Y, 1e-9)) return false;
    if (kind === 0) return close(L[0] * GF_PT[q][0] + L[1], GF_PT[q][1], 1e-9);
    const m3 = -LCO[q][0] / LCO[q][1];
    return kind === 1 ? close(L[0], m3, 1e-9) : close(L[0] * m3, -1, 1e-9) || (LCO[q][1] === 0 && close(L[0], 0, 1e-9));
  },
  bugs: (p) => {
    const [ix, iy, , , kind, q] = p;
    const ans = famAns(p);
    const out: Bug[] = [];
    if (kind === 0) {
      const P = GF_PT[q];
      const inv = R_(P[0] - ix, P[1] - iy);
      out.push(B("run-over-rise", "conceptual", LINE, "The slope was taken as (change in x)/(change in y); slope is rise over run.", rhsR(inv, rsub(R_(iy), rmul(inv, R_(ix))))));
    } else {
      const [a3, b3] = LCO[q];
      const other = kind === 1 ? R_(b3, a3) : R_(-a3, b3);
      out.push(B(kind === 1 ? "perpendicular-instead" : "parallel-instead", "conceptual", LINE, kind === 1 ? "A perpendicular line was found; parallel lines have the same slope." : "A parallel line was found; perpendicular slopes multiply to −1.", rhsR(other, rsub(R_(iy), rmul(other, R_(ix))))));
    }
    const m = kind === 0 ? R_(GF_PT[q][1] - iy, GF_PT[q][0] - ix) : kind === 1 ? R_(-LCO[q][0], LCO[q][1]) : R_(LCO[q][1], LCO[q][0]);
    out.push(B("intercept-sign", "procedural", LINE, "In y − y₁ = m(x − x₁), the term −m·x₁ was added instead of subtracted.", ix !== 0 && m[0] !== 0 ? rhsR(m, radd(R_(iy), rmul(m, R_(ix)))) : null));
    return out.filter((x) => x.predict !== null && x.predict !== ans);
  },
  distractors: ([ix, iy]) => [rhsR(R_(1), R_(iy - ix)), rhsR(R_(-1), R_(iy + ix)), rhsR(R_(2), R_(iy - 2 * ix)), rhsR(R_(-1, 2), R_(iy + 1)), rhsR(R_(3), R_(iy))],
  variants: () => [],
  explain: (s) => (s.id === "family" ? s.value as string : s.id === "lambda" ? `Use the condition: ${s.value}` : `y = ${s.value}`),
  domain: [[-3, 3], [-3, 3], [0, 9], [0, 9], [0, 2], [0, 9]],
  keep: (p) => asfamOk(p),
  cap: 300,
  difficulty: ([, , , , kind]) => (kind === 0 ? 2 : 3),
  teach: {
    idea: "For any λ, L₁ + λL₂ = 0 is a straight line through the point where L₁ = 0 and L₂ = 0 meet. One more condition (a point, or a slope) picks out the value of λ.",
    method: "Either solve L₁ = 0 and L₂ = 0 for the point of intersection and use the condition, or write L₁ + λL₂ = 0, apply the condition to find λ, and simplify.",
    alternatives: [{ id: "point_first", title: "Find the point first", kind: "procedural", text: ["Solve the two equations together to get the point of intersection.", "Then use y − y₁ = m(x − x₁) with the slope the condition gives."] }],
  },
  limits: "Whole-number points of intersection; concurrency of three lines is left out.",
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
  ascinv, asconj, asslope, ascoll, aslineq, aslinpar, asgenf, asevset, asadd3, asbern, asleq, asint3, asplaneq, asplang, astaneh, aspairbis, asside, asfam,
];
void RV;
