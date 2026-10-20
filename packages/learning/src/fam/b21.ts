/**
 * families@2, batch b21 (gap@1): new families for competencies whose first family is one of the original families in
 * families.ts — forming and solving linear equations from situations, writing expressions from words, expanding
 * products with an area model, arithmetic progressions (deciding, terms, sums, conditions, rules, graphs), quadratic
 * equations (standard form, splitting the middle term, the formula, completing the square, word problems), the
 * section formula, ratio of division and centroids (in the plane and in space), limits (tables, one-sided, standard
 * limits, rationalising, at infinity), differentiation rules (sums, quotients, chains, inverse trigonometric,
 * exponential and logarithmic), determinants of order 3 and their uses, antiderivatives, integration by
 * substitution, standard forms, partial fractions and parts, and definite integrals (polynomials, limits of sums,
 * Bernoulli's formula). Every validator uses a different method from the solver (simulation of the story, brute-force
 * search, substitution, central differences, Simpson's rule, numerical limits, Leibniz expansion, Heron's formula,
 * multiplying back to the identity). Written by OpenPath; CC0.
 */
import type { Bug, Def, Step, Value, Visual } from "../family-kit";
import { fmt, gcd, simpson, near, sup, signed } from "../family-kit";
import { evaluate, parse, type Node } from "../answer-types";

const LIN = "MATH.algebra.linear-equations";
const VAR = "MATH.algebra.variables";
const IDI = "MATH.algebra.identities-intro";
const AP = "MATH.algebra.arithmetic-sequences";
const QUAD = "MATH.algebra.quadratics";
const DIST = "MATH.coordinate.distance";
const SPC = "MATH.coordinate.space-coordinates";
const LIM = "MATH.calculus.limits";
const DR = "MATH.calculus.derivative-rules";
const DET = "MATH.algebra.determinants";
const IND = "MATH.calculus.indefinite-integrals";
const IM = "MATH.calculus.integration-methods";
const DEF = "MATH.calculus.definite-integrals";
const INT = "MATH.number.integer-add";
const FAC = "MATH.algebra.factorisation";

// ---------------------------------------------------------------- helpers

const none = () => null;
const inDom = (p: number[], d: [number, number][]) => p.length === d.length && p.every((v, i) => Number.isInteger(v) && v >= d[i][0] && v <= d[i][1]);
const mn = (s: string) => s.replace(/-/g, "−");
/** A number as printed (fractions as a/b, − for minus). */
const nf = (x: number) => mn(fmt(x));
/** A number in brackets when negative. */
const pn = (x: number) => (x < 0 ? `(${nf(x)})` : nf(x));
const pw = (v: string, e: number) => (e === 0 ? "" : e === 1 ? v : `${v}${sup(e)}`);
/** A sum of terms c·m with − signs; fraction coefficients before a letter go in brackets. */
function sum(terms: [number, string][]): string {
  const out: string[] = [];
  for (const [c, m] of terms) {
    if (Math.abs(c) < 1e-12) continue;
    const a = Math.abs(c);
    const body = m === "" ? fmt(a) : near(a, 1, 1e-12) ? m : Number.isInteger(a) ? `${a}${m}` : `(${fmt(a)})${m}`;
    out.push(out.length === 0 ? (c < 0 ? `−${body}` : body) : `${c < 0 ? "−" : "+"} ${body}`);
  }
  return out.length ? out.join(" ") : "0";
}
/** n/d reduced, as printed. */
function rat(n: number, d: number): string {
  if (d < 0) [n, d] = [-n, -d];
  const g = gcd(n, d) || 1;
  return mn(d / g === 1 ? `${n / g}` : `${n / g}/${d / g}`);
}
const tup = (xs: (number | string)[]) => `(${xs.map((x) => (typeof x === "number" ? nf(x) : x)).join(", ")})`;
const P2 = (x: number, y: number) => `(${nf(x)}, ${nf(y)})`;
const P3 = (q: number[]) => `(${q.map(nf).join(", ")})`;
const st = (id: string, op: string, competency: string, text: string, value: Value): Step => ({ id, op, competency, inputs: [text], value });
const bug = (id: string, kind: Bug["kind"], competency: string, says: string, predict: Value | null): Bug => ({ id, kind, competency, says, predict });
const node = (v: Value): Node | null => {
  if (typeof v !== "string") return null;
  try {
    return parse(v);
  } catch {
    return null;
  }
};
const ev = (n: Node | null, env: Record<string, number>) => {
  if (!n) return NaN;
  try {
    return evaluate(n, env);
  } catch {
    return NaN;
  }
};
/** The value of a constant answer (a number, or an exact expression such as 3π/8, e − 2, 2√3). */
const constOf = (v: Value): number => (typeof v === "number" ? v : ev(node(v), {}));
const d1 = (g: (x: number) => number, x: number, h = 1e-5) => (g(x + h) - g(x - h)) / (2 * h);
/** A written expression in x agrees with f at the points (points where f is undefined are skipped; at least 4 used). */
function agrees(v: Value, f: (x: number) => number, xs: number[], rel = 1e-6): boolean {
  const n = node(v);
  if (!n) return false;
  let ok = 0;
  for (const x of xs) {
    const w = f(x);
    if (!Number.isFinite(w)) continue;
    const g = ev(n, { x });
    if (!Number.isFinite(g) || Math.abs(g - w) > rel * Math.max(1, Math.abs(w))) return false;
    ok++;
  }
  return ok >= 4;
}
/** The derivative of a written expression (central differences) agrees with f at the points. */
function derivAgrees(v: Value, f: (x: number) => number, xs: number[], rel = 1e-5): boolean {
  const n = node(typeof v === "string" ? v.replace(/\s*\+\s*C\s*$/, "") : v);
  if (!n) return false;
  let ok = 0;
  for (const x of xs) {
    const w = f(x);
    if (!Number.isFinite(w)) continue;
    const g = d1((t) => ev(n, { x: t }), x);
    if (!Number.isFinite(g) || Math.abs(g - w) > rel * Math.max(1, Math.abs(w))) return false;
    ok++;
  }
  return ok >= 4;
}
const XS = [0.43, 0.71, 0.97, 1.23, 1.58, 1.91, 2.27];
const XSMALL = [0.21, 0.37, 0.52, 0.66, 0.83, 0.94, 1.08];
/** The numbers of a written tuple "(a, b, c)". */
function tupleNums(v: Value, n: number): number[] | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (!t.startsWith("(") || !t.endsWith(")")) return null;
  const parts = t.slice(1, -1).split(",");
  if (parts.length !== n) return null;
  const out = parts.map((x) => constOf(x.trim()));
  return out.every(Number.isFinite) ? out : null;
}
/** The rows of a written matrix "[[1, 2], [3, 4]]". */
function matrixNums(v: Value): number[][] | null {
  if (typeof v !== "string") return null;
  const t = v.replace(/\s+/g, "");
  if (!/^\[\[.*\]\]$/.test(t)) return null;
  const rows = t.slice(2, -2).split("],[").map((r) => r.split(",").map((x) => constOf(x)));
  return rows.every((r) => r.every(Number.isFinite)) ? rows : null;
}
const mat = (m: number[][]) => `[[${m.map((r) => r.map(nf).join(", ")).join("], [")}]]`;
/** A stable pseudo-random order (FNV-1a of the parameters). */
const hash = (s: string) => {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  return h;
};
function shuffled<T>(xs: T[], salt: string): T[] {
  return xs.map((x, i) => [hash(`${salt}:${i}`), x] as [number, T]).sort((a, b) => a[0] - b[0]).map(([, x]) => x);
}
const NAMES = ["Anu", "Ravi", "Meena", "Arjun", "Kavya", "Selvi", "Karthik", "Priya", "Vikram", "Lakshmi", "Farhan", "Divya"];
const nm = (k: number) => NAMES[((k % NAMES.length) + NAMES.length) % NAMES.length];
/** The sum of numbers by repeated addition. */
const det2 = (a: number, b: number, c: number, d: number) => a * d - b * c;
/** Leibniz expansion of a 3 × 3 determinant: the sum over the six permutations (an independent method). */
function leibniz(m: number[][]): number {
  const perms: [number[], number][] = [[[0, 1, 2], 1], [[1, 2, 0], 1], [[2, 0, 1], 1], [[0, 2, 1], -1], [[2, 1, 0], -1], [[1, 0, 2], -1]];
  return perms.reduce((s, [p, sg]) => s + sg * m[0][p[0]] * m[1][p[1]] * m[2][p[2]], 0);
}
/** Cofactor expansion along the first row (the solver's method). */
const cof3 = (m: number[][]) => m[0][0] * det2(m[1][1], m[1][2], m[2][1], m[2][2]) - m[0][1] * det2(m[1][0], m[1][2], m[2][0], m[2][2]) + m[0][2] * det2(m[1][0], m[1][1], m[2][0], m[2][1]);
const rows3 = (e: number[]) => [e.slice(0, 3), e.slice(3, 6), e.slice(6, 9)];
/** Heron's formula for the area of a triangle from its vertices (an independent check of a determinant area). */
function heron(P: number[][]): number {
  const L = (a: number[], b: number[]) => Math.hypot(...a.map((x, i) => x - b[i]));
  const [a, b, c] = [L(P[0], P[1]), L(P[1], P[2]), L(P[0], P[2])];
  const s = (a + b + c) / 2;
  return Math.sqrt(Math.max(0, s * (s - a) * (s - b) * (s - c)));
}

/** A family with the shared defaults: domain and keep give the reject rule; a prediction that the family's own check
 * accepts (the slip happens to give the right answer for these numbers) is dropped. */
type Spec = Omit<Def, "parse" | "reject" | "variants" | "explain"> & { explain?: Def["explain"]; domain: [number, number][]; keep?: (p: number[]) => boolean; why: string };
function F(s: Spec): Def {
  const keep = s.keep ?? (() => true);
  const { why, ...rest } = s;
  return {
    parse: none,
    variants: () => [],
    ...rest,
    keep,
    reject: (p) => (inDom(p, s.domain) && keep(p) ? null : why),
    bugs: (p) => {
      const out: Bug[] = [];
      for (const b of s.bugs(p)) {
        if (b.predict === null) continue;
        if (Array.isArray(b.predict) && s.type !== "set") {
          const keepVals = (b.predict as number[]).filter((v) => Number.isFinite(v) && !s.validate(p, v));
          if (keepVals.length) out.push({ ...b, predict: keepVals.length === 1 ? keepVals[0] : keepVals });
          continue;
        }
        if (typeof b.predict === "number" && !Number.isFinite(b.predict)) continue;
        if (s.validate(p, b.predict)) continue;
        if (out.some((o) => JSON.stringify(o.predict) === JSON.stringify(b.predict))) continue;
        out.push(b);
      }
      return out;
    },
    explain: s.explain ?? ((st0: Step) => `${st0.inputs[0]}`),
  };
}
const say = (s: Step) => `${s.inputs[0]}`;
const isInt = (x: number) => Number.isInteger(x);

// ================================================================ linear equations from situations (Grade 7)

type EqOpt = { A: number; B: number; br: boolean; C: number };
const eqStr = (o: EqOpt) => (o.br ? `${o.A}(x ${o.B < 0 ? "−" : "+"} ${Math.abs(o.B)}) = ${o.C}` : `${o.A}x ${o.B < 0 ? "−" : "+"} ${Math.abs(o.B)} = ${o.C}`);
const eqHolds = (o: EqOpt, x: number) => (o.br ? o.A * (x + o.B) : o.A * x + o.B) === o.C;
/** [t, a, b, x]: the story's result. */
const leqC = ([t, a, b, x]: number[]) => (t === 2 ? a * x - b : a * x + b);
function leqOpts(p: number[]): { opts: EqOpt[]; right: number; bracket: number; swap: number; sign: number } {
  const [t, a, b] = p;
  const s = t === 2 ? -1 : 1;
  const c = leqC(p);
  const base: EqOpt[] = [
    { A: a, B: s * b, br: false, C: c },
    { A: a, B: s * b, br: true, C: c },
    { A: b, B: s * a, br: false, C: c },
    { A: a, B: -s * b, br: false, C: c },
  ];
  const opts = shuffled(base, `auleq:${p}`);
  return { opts, right: opts.indexOf(base[0]), bracket: opts.indexOf(base[1]), swap: opts.indexOf(base[2]), sign: opts.indexOf(base[3]) };
}
const leqStory = (p: number[]) => {
  const [t, a, b] = p;
  const c = leqC(p);
  const who = nm(a + b + t);
  return t === 0
    ? `${who} thinks of a number x. ${who} multiplies it by ${a} and then adds ${b}. The result is ${c}.`
    : t === 1
      ? `${who} buys ${a} notebooks at ₹x each and one pen for ₹${b}, and pays ₹${c} in all.`
      : `${who} had ${a} boxes with x sweets in each. After giving away ${b} sweets, ${who} has ${c} sweets left.`;
};
/** The story acted out: the number x that gives the story's result, found by trying 1, 2, 3, … */
const leqTrial = (p: number[]) => {
  for (let y = 1; y <= 200; y++) if (leqC([p[0], p[1], p[2], y]) === leqC(p)) return y;
  return NaN;
};

const auleq = F({
  id: "auleq",
  arity: 4,
  title: "Choosing the equation that models a situation",
  competency: LIN,
  type: "choice",
  // [t, a, b, x]: t = 0 think of a number, 1 shopping, 2 sharing out; a multiplies x, b is added (t = 2: taken away)
  prompt: (p) => `${leqStory(p)} Which equation describes this situation?`,
  choices: (p) => leqOpts(p).opts.map(eqStr),
  solve: (p) => {
    const { right } = leqOpts(p);
    return { steps: [st("unknown", "model", LIN, "Let x stand for the unknown number in the story", "x"), st("build", "model", LIN, `Write the story in order: ${p[1]} times x, then ${p[0] === 2 ? "take away" : "add"} ${p[2]}, equals ${leqC(p)}: ${eqStr(leqOpts(p).opts[right])}`, right)], answer: right };
  },
  // independent: act out the story to find its number, and test the chosen equation with that number
  validate: (p, v) => {
    const o = typeof v === "number" ? leqOpts(p).opts[v] : undefined;
    const x = leqTrial(p);
    return !!o && Number.isFinite(x) && eqHolds(o, x);
  },
  bugs: (p) => {
    const o = leqOpts(p);
    return [
      bug("bracket-too-wide", "conceptual", LIN, `The number ${p[0] === 2 ? "taken away" : "added"} was put inside a bracket with x, so it was multiplied by ${p[1]} as well; in the story only x is multiplied by ${p[1]}.`, o.bracket),
      bug("roles-swapped", "procedural", LIN, `The two numbers of the story were put in each other's places: ${p[1]} is the number that multiplies x, and ${p[2]} is ${p[0] === 2 ? "taken away" : "added"} once.`, o.swap),
      ...(p[0] === 2 ? [bug("give-away-added", "conceptual", LIN, `Giving away ${p[2]} sweets was written as adding ${p[2]}; giving away makes the number smaller, so it is − ${p[2]}.`, o.sign)] : []),
    ];
  },
  domain: [[0, 2], [2, 9], [1, 20], [2, 15]],
  keep: ([t, a, b, x]) => a !== b && leqC([t, a, b, x]) > 0,
  why: "A story with a × x ± b, a from 2 to 9 (not equal to b), b up to 20, x from 2 to 15.",
  cap: 300,
  difficulty: ([t, a, b]) => (t === 0 && b <= 10 ? 1 : t === 2 ? 3 : 2),
  teach: {
    idea: "An equation is the story written in symbols: the unknown is a letter, and each action in the story becomes an operation on it, in the same order.",
    method: "Name the unknown x. Follow the story: what multiplies x, what is added or taken away, and what the result equals. Check by putting a guessed number for x into both the story and the equation.",
    alternatives: [
      { id: "check_number", title: "Test with the story's number", kind: "procedural", text: ["Find the story's number by trying 1, 2, 3, … in the story itself.", "Only the right equation is true for that number."] },
      { id: "bar_model", title: "Draw a bar model", kind: "conceptual", text: ["Draw a equal bars for a × x, then a short piece for the number added.", "The whole length is the result; the picture reads as ax + b = c."] },
    ],
  },
  limits: "Stories that give ax + b = c or ax − b = c; stories with x on both sides or with fractions are not included.",
});

/** [k, a, b, x] word problems: the total the story gives for a number y. */
const lwpTotal = (k: number, a: number, b: number, y: number) => (k === 0 ? 3 * y + 3 : k === 1 ? y + a * y + 2 * b : k === 2 ? 2 * (y + y + b) : 5 * y + 10 * (y + b));
const lwpPrompt = (p: number[]) => {
  const [k, a, b, x] = p;
  const T = lwpTotal(k, a, b, x);
  return k === 0
    ? `The sum of three consecutive whole numbers is ${T}. Form an equation and find the smallest of the three numbers.`
    : k === 1
      ? `One number is ${a} times another. When ${b} is added to each of them, the two new numbers add up to ${T}. Form an equation and find the smaller number.`
      : k === 2
        ? `The length of a rectangle is ${b} cm more than its width, and its perimeter is ${T} cm. Form an equation and find the width, in cm.`
        : `Five times a number, added to ten times the number that is ${b} more than it, gives ${T}. Form an equation and find the number.`;
};
const aulwp = F({
  id: "aulwp",
  arity: 4,
  title: "Forming and solving a linear equation from a word problem",
  competency: LIN,
  type: "integer",
  mc: true,
  // [k, a, b, x]: k = 0 consecutive numbers, 1 one number a times another (ages), 2 rectangle perimeter, 3 coins
  prompt: lwpPrompt,
  solve: ([k, a, b, x]) => {
    const T = lwpTotal(k, a, b, x);
    const eq = k === 0 ? `x + (x + 1) + (x + 2) = ${T}, so 3x + 3 = ${T}` : k === 1 ? `(x + ${b}) + (${a}x + ${b}) = ${T}, so ${a + 1}x + ${2 * b} = ${T}` : k === 2 ? `2(x + x + ${b}) = ${T}, so 4x + ${2 * b} = ${T}` : `5x + 10(x + ${b}) = ${T}, so 15x + ${10 * b} = ${T}`;
    const [m, c] = k === 0 ? [3, 3] : k === 1 ? [a + 1, 2 * b] : k === 2 ? [4, 2 * b] : [15, 10 * b];
    return { steps: [st("form", "model", LIN, `Let x be the number asked for and write the equation: ${eq}`, eq), st("subtract", "subtract", LIN, `Take ${c} from both sides: ${m}x = ${T - c}`, T - c), st("divide", "divide", LIN, `Divide by ${m}: x = ${x}`, x)], answer: x };
  },
  // independent: try every whole number in the story until the total comes out right
  validate: ([k, a, b, x], v) => {
    if (typeof v !== "number" || !isInt(v) || v < 1) return false;
    const T = lwpTotal(k, a, b, x);
    const hits: number[] = [];
    for (let y = 1; y <= 300; y++) if (lwpTotal(k, a, b, y) === T) hits.push(y);
    return hits.length === 1 && hits[0] === v;
  },
  bugs: ([k, a, b, x]) => {
    const T = lwpTotal(k, a, b, x);
    const q = (n: number, d: number) => (n % d === 0 && n / d > 0 ? n / d : null);
    if (k === 0) return [bug("middle-number", "procedural", LIN, `The total was divided by 3, which gives the middle number of the three; the smallest is 1 less.`, T / 3)];
    if (k === 1)
      return [
        bug("added-once", "procedural", LIN, `${b} was added only once; it is added to each of the two numbers, so 2 × ${b} = ${2 * b} goes into the equation.`, q(T - b, a + 1)),
        bug("lost-the-number", "conceptual", LIN, `Only the ${a}x part was kept on the left; the smaller number x itself is part of the sum too.`, q(T - 2 * b, a)),
      ];
    if (k === 2)
      return [
        bug("half-perimeter", "conceptual", "MATH.measurement.rectangle-perimeter", `The perimeter was taken as length + width; the perimeter goes all the way round, 2 × (length + width).`, q(T - b, 2)),
        bug("extra-once", "procedural", LIN, `The ${b} cm was counted once; there are two lengths, so it appears twice: 2(2x + ${b}) = 4x + ${2 * b}.`, q(T - b, 4)),
      ];
    return [
      bug("bracket-not-expanded", "procedural", IDI, `10(x + ${b}) was written as 10x + ${b}; the 10 multiplies both x and ${b}.`, q(T - b, 15)),
      bug("dropped-extra", "conceptual", LIN, `The ${b} was left out, as if both numbers were the same.`, q(T, 15)),
    ];
  },
  domain: [[0, 3], [2, 6], [1, 10], [3, 30]],
  keep: ([k, a, b]) => (k !== 1 ? a === 2 : true) && (k === 0 ? b === 1 : true),
  why: "Consecutive numbers, one number a times another, a rectangle's perimeter, or ₹5 and ₹10 coins, with a whole-number answer from 3 to 30.",
  cap: 400,
  difficulty: ([k, , , x]) => (k === 0 ? 1 : k === 2 && x <= 15 ? 2 : k === 3 || k === 1 ? 3 : 2),
  word: ([k, a, b, x]) => {
    const T = lwpTotal(k, a, b, x);
    const who = nm(a + b + x);
    return k === 0
      ? `Three houses next to each other on a street in Madurai have consecutive door numbers. The three door numbers add up to ${T}. What is the smallest door number?`
      : k === 1
        ? `${who}'s mother is ${a} times as old as ${who} is now. In ${b} years, their two ages will add up to ${T} years. How old is ${who} now, in years?`
        : k === 2
          ? `${who} uses ${T} m of fencing to go once round a rectangular vegetable garden whose length is ${b} m more than its width. How wide is the garden, in m?`
          : `${who} has only ₹5 coins and ₹10 coins, with ${b} more ₹10 coins than ₹5 coins. Together the coins are worth ₹${T}. How many ₹5 coins does ${who} have?`;
  },
  teach: {
    idea: "Call the number you are asked for x; the story then tells you how to build the total from x, and that is the equation.",
    method: "Write each quantity in terms of x, add them as the story says, set the result equal to the total, then undo: take away the constant, divide by the coefficient. Check in the story.",
    alternatives: [
      { id: "table", title: "Make a table", kind: "procedural", text: ["List each quantity in the story with its expression in x.", "Add the expressions; the sum equals the given total."] },
      { id: "guess_check", title: "Guess, check, improve", kind: "conceptual", text: ["Try a value of x in the story and see whether the total is too big or too small.", "The equation does this in one step: it finds exactly the x that makes the total right."] },
    ],
  },
  limits: "Four kinds of story with one unknown and whole-number answers from 3 to 30; stories with the unknown on both sides are not included.",
});

// ================================================================ writing an expression from words (Grade 6)

const LET = ["x", "y", "n", "m", "p"];
/** [k, L, a, b]: the rule applied to a number. */
const vxRule = (k: number, a: number, b: number, v: number) => (k === 0 ? b * v + a : k === 1 ? b * v - a : k === 2 ? b * (v + a) : k === 3 ? b * (v - a) : v / b + a);
const vxAns = ([k, l, a, b]: number[]) => {
  const L = LET[l];
  return k === 0 ? `${b}${L} + ${a}` : k === 1 ? `${b}${L} − ${a}` : k === 2 ? `${b}(${L} + ${a})` : k === 3 ? `${b}(${L} − ${a})` : `${L}/${b} + ${a}`;
};
const auvexp = F({
  id: "auvexp",
  arity: 4,
  title: "Writing an algebraic expression from a statement in words",
  competency: VAR,
  type: "exact",
  mc: true,
  // [k, L, a, b]: k = 0 a more than b times L, 1 a less than b times L, 2 b times (L + a), 3 b times (L − a), 4 L ÷ b, then + a
  prompt: ([k, l, a, b]) => {
    const L = LET[l];
    const w = k === 0 ? `${a} more than ${b} times ${L}` : k === 1 ? `${a} less than ${b} times ${L}` : k === 2 ? `${b} times the sum of ${L} and ${a}` : k === 3 ? `${b} times the number you get when ${a} is subtracted from ${L}` : `${L} divided by ${b}, then increased by ${a}`;
    return `Write an expression, using ${L}, for: “${w}”.`;
  },
  solve: (p) => {
    const [k, l, a, b] = p;
    const L = LET[l];
    const first = k === 0 || k === 1 ? `${b} times ${L} is ${b}${L}` : k === 2 ? `the sum ${L} + ${a} goes in a bracket` : k === 3 ? `${L} with ${a} subtracted is ${L} − ${a}, in a bracket` : `${L} divided by ${b} is ${L}/${b}`;
    return { steps: [st("first", "translate", VAR, `First part: ${first}`, k < 2 ? `${b}${L}` : k === 4 ? `${L}/${b}` : k === 2 ? `${L} + ${a}` : `${L} − ${a}`), st("whole", "translate", VAR, `Then the rest of the statement: ${vxAns(p)}`, vxAns(p))], answer: vxAns(p) };
  },
  // independent: put numbers in for the letter and compare with the rule acted out on those numbers
  validate: ([k, l, a, b], v) => {
    const n = node(v);
    if (!n) return false;
    return [1.5, 2, 7, 11].every((t) => {
      const g = ev(n, { [LET[l]]: t });
      return Number.isFinite(g) && Math.abs(g - vxRule(k, a, b, t)) < 1e-9;
    });
  },
  bugs: ([k, l, a, b]) => {
    const L = LET[l];
    if (k === 0) return [bug("added-first", "conceptual", VAR, `The ${a} was added before multiplying; “${a} more than ${b} times ${L}” means work out ${b} times ${L} first, then add ${a}.`, `${b}(${L} + ${a})`), bug("plus-for-times", "recall", VAR, `“${b} times ${L}” was written as ${L} + ${b}; times means multiply.`, `${L} + ${b + a}`)];
    if (k === 1) return [bug("less-than-reversed", "conceptual", VAR, `“${a} less than” was written as ${a} minus the rest; “${a} less than something” is that something with ${a} taken away.`, `${a} − ${b}${L}`), bug("subtract-first", "conceptual", VAR, `The ${a} was taken away before multiplying; the multiplying by ${b} comes first here.`, `${b}(${L} − ${a})`)];
    if (k === 2) return [bug("no-bracket", "procedural", VAR, `The bracket was left out, so only ${L} was multiplied by ${b}; “${b} times the sum” multiplies the whole sum.`, `${b}${L} + ${a}`)];
    if (k === 3) return [bug("no-bracket", "procedural", VAR, `The bracket was left out, so only ${L} was multiplied by ${b}; the whole difference is multiplied.`, `${b}${L} − ${a}`), bug("order-reversed", "conceptual", VAR, `${L} was subtracted from ${a}; “${a} is subtracted from ${L}” means ${L} − ${a}.`, `${b}(${a} − ${L})`)];
    return [bug("added-before-dividing", "conceptual", VAR, `${a} was added before dividing; the statement divides ${L} by ${b} first.`, `(${L} + ${a})/${b}`), bug("times-for-divide", "recall", VAR, `“divided by ${b}” was written as multiplying by ${b}.`, `${b}${L} + ${a}`)];
  },
  distractors: ([k, l, a, b]) => {
    const L = LET[l];
    return [`${a}${L} + ${b}`, `${b + a}${L}`, `${b}${L} + ${a + 1}`];
  },
  domain: [[0, 4], [0, 4], [1, 9], [2, 9]],
  keep: ([, , a, b]) => a !== b,
  why: "Five kinds of statement, a from 1 to 9 and b from 2 to 9 (different), with one of the letters x, y, n, m, p.",
  cap: 400,
  difficulty: ([k]) => (k <= 1 ? 1 : k === 4 ? 3 : 2),
  word: ([k, l, a, b]) => {
    const L = LET[l];
    const who = nm(a * 3 + b + k);
    return k === 0
      ? `${who} has ${b} boxes with ${L} pencils in each, and ${a} loose pencils. Write the total number of pencils, using ${L}.`
      : k === 1
        ? `A fruit seller had ${b} crates with ${L} mangoes in each. ${a} mangoes were spoilt and thrown away. Write the number of good mangoes, using ${L}.`
        : k === 2
          ? `${b} friends each pay ₹${L} for a cinema ticket and ₹${a} for snacks. Write the total amount they pay, in rupees, using ${L}.`
          : k === 3
            ? `Each of ${b} bags held ${L} laddus, and ${a} laddus were taken out of every bag. Write how many laddus are left in all, using ${L}.`
            : `₹${L} is shared equally among ${b} children, and then each child gets ₹${a} more from their grandmother. Write how much one child has, in rupees, using ${L}.`;
  },
  teach: {
    idea: "A letter stands for any number; an expression is the list of operations done to it, written with + − × ÷ and brackets.",
    method: "Read the statement and find what is done first. Write that part, then the next operation on it. Use a bracket when a whole sum or difference is multiplied.",
    alternatives: [
      { id: "number_first", title: "Try it with a number first", kind: "procedural", text: ["Put a number such as 10 in place of the letter and work the statement out.", "Write the same steps again with the letter instead of 10."] },
      { id: "machine", title: "A number machine", kind: "conceptual", text: ["Imagine the letter going into a machine that does each operation in turn.", "What comes out, written with the letter, is the expression."] },
    ],
  },
  limits: "One letter and two operations; expressions with powers or two different letters are not included.",
});

// ================================================================ products with an area model (Grade 7)

const binAns = ([k, a, b, c, d]: number[]) => (k === 2 ? `${a * c}x${sup(b + d)}y` : sum([[a * c, "x²"], [a * d + b * c, "x"], [b * d, ""]]));
const linT = (a: number, b: number) => `${a === 1 ? "" : a}x ${b < 0 ? "−" : "+"} ${Math.abs(b)}`;
const aubin = F({
  id: "aubin",
  arity: 5,
  title: "Multiplying binomials and monomials with an area model",
  competency: IDI,
  type: "exact",
  mc: true,
  // [k, a, b, c, d]: k = 0 (x + b)(x + d), 1 (ax + b)(cx + d), 2 (a·x^b) × (c·x^d·y)
  prompt: ([k, a, b, c, d]) => (k === 2 ? `Multiply ${a}x${sup(b)} by ${c}x${sup(d)}y. The area model in the picture may help.` : `Expand (${linT(a, b)})(${linT(c, d)}) and simplify. The area model in the picture may help.`),
  figure: ([k, a, b, c, d]) =>
    k === 2
      ? ({ type: "table", head: ["×", `${c}x${sup(d)}y`], rows: [[`${a}x${sup(b)}`, "?"]] } as Visual)
      : ({ type: "table", head: ["×", `${a === 1 ? "" : a}x`, nf(b)], rows: [[`${c === 1 ? "" : c}x`, "?", "?"], [nf(d), "?", "?"]] } as Visual),
  solve: (p) => {
    const [k, a, b, c, d] = p;
    if (k === 2) return { steps: [st("coef", "multiply", "MATH.number.multiplication-tables", `Multiply the numbers: ${a} × ${c} = ${a * c}`, a * c), st("powers", "add powers", "MATH.number.exponents", `Multiply the powers of x by adding: x${sup(b)} × x${sup(d)} = x${sup(b + d)}; y stays: ${binAns(p)}`, binAns(p))], answer: binAns(p) };
    return {
      steps: [
        st("cells", "multiply", IDI, `Fill the four cells: ${a * c}x², ${nf(a * d)}x, ${nf(b * c)}x and ${nf(b * d)}`, `${a * c}x², ${nf(a * d)}x, ${nf(b * c)}x, ${nf(b * d)}`),
        st("collect", "add like terms", INT, `Add the two x cells: ${nf(a * d)}x + ${pn(b * c)}x = ${nf(a * d + b * c)}x, giving ${binAns(p)}`, binAns(p)),
      ],
      answer: binAns(p),
    };
  },
  // independent: the product of the two factors, worked out with numbers, at several points
  validate: ([k, a, b, c, d], v) => {
    const n = node(v);
    if (!n) return false;
    return [[1.5, 2], [2, -1], [-3, 0.5], [0.7, 3]].every(([x, y]) => {
      const want = k === 2 ? a * x ** b * c * x ** d * y : (a * x + b) * (c * x + d);
      const g = ev(n, { x, y });
      return Number.isFinite(g) && Math.abs(g - want) < 1e-9 * Math.max(1, Math.abs(want));
    });
  },
  bugs: ([k, a, b, c, d]) => {
    if (k === 2)
      return [
        bug("multiplied-powers", "conceptual", "MATH.number.exponents", `The powers of x were multiplied; x${sup(b)} × x${sup(d)} means ${b} x's times ${d} more x's, so the powers add.`, `${a * c}x${sup(b * d)}y`),
        bug("added-numbers", "procedural", IDI, `The numbers ${a} and ${c} were added; the area of a rectangle multiplies its sides, numbers too.`, `${a + c}x${sup(b + d)}y`),
      ];
    return [
      bug("first-and-last", "conceptual", IDI, "Only the first terms and the last terms were multiplied; each term of one bracket multiplies each term of the other (four cells in the area model).", sum([[a * c, "x²"], [b * d, ""]])),
      k === 0
        ? bug("sum-and-product-swapped", "procedural", IDI, `The product ${nf(b * d)} and the sum ${nf(b + d)} were put in each other's places; the x term comes from adding, the number term from multiplying.`, sum([[1, "x²"], [b * d, "x"], [b + d, ""]]))
        : bug("coefficients-left-out", "procedural", IDI, `The middle term was found as ${nf(b)} + ${pn(d)}, without multiplying by ${a} and ${c}; the two x cells are ${a} × ${pn(d)} and ${pn(b)} × ${c}.`, sum([[a * c, "x²"], [b + d, "x"], [b * d, ""]])),
      bug("sign-of-product", "procedural", INT, `The sign of a cell was lost: a negative times a positive is negative.`, b * d < 0 ? sum([[a * c, "x²"], [a * d + b * c, "x"], [-b * d, ""]]) : null),
    ];
  },
  distractors: ([k, a, b, c, d]) => (k === 2 ? [`${a * c}x${sup(b + d)}`, `${a * c}x${sup(b + d + 1)}y`] : [sum([[a * c, "x²"], [a * d + b * c + 1, "x"], [b * d, ""]]), sum([[a + c, "x"], [b * d, ""]])]),
  domain: [[0, 2], [1, 6], [-9, 9], [1, 6], [-9, 9]],
  keep: ([k, a, b, c, d]) =>
    k === 0 ? a === 1 && c === 1 && b !== 0 && d !== 0 && b < d && b + d !== 0 : k === 1 ? a * c >= 2 && a <= 4 && c <= 4 && b !== 0 && d !== 0 && Math.abs(b) <= 6 && Math.abs(d) <= 6 && gcd(a, b) === 1 && gcd(c, d) === 1 && a * d + b * c !== 0 : a >= 2 && c >= 2 && b >= 1 && b <= 3 && d >= 1 && d <= 3,
  why: "(x + b)(x + d), (ax + b)(cx + d) with small whole numbers, or a monomial times a monomial with powers up to 3.",
  cap: 400,
  difficulty: ([k, , b, , d]) => (k === 2 ? 1 : k === 0 ? (b > 0 && d > 0 ? 1 : 2) : 3),
  word: ([k, a, b, c, d]) =>
    k === 2
      ? `A rectangular floor tile is ${a}x${sup(b)} cm long and ${c}x${sup(d)}y cm wide. Write its area, in cm², as a single term.`
      : `A rectangular garden is (${linT(a, b)}) m long and (${linT(c, d)}) m wide, where x is large enough for both lengths to be positive. Write its area, in m², as an expression in x.`,
  teach: {
    idea: "A product of two brackets is the area of a rectangle whose sides are the brackets: split each side into its terms and the rectangle splits into smaller rectangles.",
    method: "Draw a grid with one bracket's terms across the top and the other's down the side. Multiply to fill each cell, then add the cells, collecting the like terms.",
    alternatives: [
      { id: "each_by_each", title: "Each term times each term", kind: "procedural", text: ["Multiply the first term of the first bracket by each term of the second, then the second term by each term of the second.", "Add the four products and collect like terms."] },
      { id: "numbers_check", title: "Check with a number", kind: "conceptual", text: ["Put x = 2 into the brackets and multiply.", "Your expanded answer must give the same number at x = 2."] },
    ],
    visual: () => ({ type: "table", head: ["×", "x", "3"], rows: [["x", "x²", "3x"], ["2", "2x", "6"]] }),
  },
  limits: "Two binomials with small whole-number coefficients, or two monomials with powers up to 3; trinomials and identities are elsewhere.",
});

// ================================================================ arithmetic progressions

/** [a, d, t, j]: five terms; t = 0 an AP, 1 an AP with term j put up by 1, 2 differences d, d + 1, d + 2, … */
const apisTerms = ([a, d, t, j]: number[]) => [0, 1, 2, 3, 4].map((i) => a + i * d + (t === 1 && i === j ? 1 : 0) + (t === 2 ? (i * (i - 1)) / 2 : 0));
const apisOpts = (p: number[]) => {
  const T = apisTerms(p);
  const D = T[1] - T[0];
  const base = [`An AP with first term ${nf(T[0])} and common difference ${nf(D)}`, `An AP with first term ${nf(T[0])} and common difference ${nf(-D)}`, "Not an AP"];
  const opts = shuffled(base, `auapis:${p}`);
  return { opts, ap: opts.indexOf(base[0]), rev: opts.indexOf(base[1]), not: opts.indexOf(base[2]) };
};
const auapis = F({
  id: "auapis",
  arity: 4,
  title: "Deciding whether a list is an AP, with its first term and common difference",
  competency: AP,
  type: "choice",
  prompt: (p) => `The first five terms of a list are ${apisTerms(p).map(nf).join(", ")}. Which statement is true?`,
  choices: (p) => apisOpts(p).opts,
  solve: (p) => {
    const T = apisTerms(p);
    const diffs = T.slice(1).map((x, i) => x - T[i]);
    const o = apisOpts(p);
    const right = diffs.every((x) => x === diffs[0]) ? o.ap : o.not;
    return { steps: [st("diffs", "subtract", INT, `Each term minus the one before: ${diffs.map(nf).join(", ")}`, diffs.map(nf).join(", ")), st("decide", "compare", AP, diffs.every((x) => x === diffs[0]) ? `All the differences are ${nf(diffs[0])}, so it is an AP with a = ${nf(T[0])} and d = ${nf(diffs[0])}` : "The differences are not all the same, so it is not an AP", right)], answer: right };
  },
  // independent: read the chosen statement and test it term by term (a + (n − 1)d for every term)
  validate: (p, v) => {
    const s = typeof v === "number" ? apisOpts(p).opts[v] : undefined;
    if (!s) return false;
    const T = apisTerms(p);
    const isAp = (a: number, d: number) => T.every((x, i) => x === a + i * d);
    if (s === "Not an AP") return !isAp(T[0], T[1] - T[0]);
    const m = s.match(/first term (\S+) and common difference (\S+)$/);
    return !!m && isAp(constOf(m[1]), constOf(m[2]));
  },
  bugs: (p) => {
    const o = apisOpts(p);
    return p[2] === 0
      ? [bug("difference-reversed", "procedural", AP, "The common difference was found as a term minus the next term; d is each term minus the one before it.", o.rev)]
      : [bug("first-difference-only", "conceptual", AP, "Only the first two terms were compared; in an AP every difference between neighbouring terms must be the same.", o.ap)];
  },
  domain: [[-10, 20], [-6, 7], [0, 2], [2, 4]],
  keep: ([a, d, t, j]) => d !== 0 && (t === 1 ? ((a + 20) % 3 === 0) : j === 2),
  why: "Five whole-number terms: an AP, an AP with one term changed, or a list whose differences grow by 1.",
  cap: 300,
  difficulty: ([, d, t, j]) => (t === 0 ? (d > 0 ? 1 : 2) : t === 1 && j === 4 ? 3 : 2),
  teach: {
    idea: "A list is an arithmetic progression when the same number is added each time: every term minus the one before it gives the same common difference d.",
    method: "Work out a₂ − a₁, a₃ − a₂, a₄ − a₃, …. If they are all equal, it is an AP with first term a₁ and that difference d; if any one differs, it is not an AP.",
    alternatives: [
      { id: "number_line", title: "Equal jumps on a number line", kind: "conceptual", text: ["Mark the terms on a number line.", "An AP makes jumps of the same size (to the left when d is negative)."] },
      { id: "middle_average", title: "The middle term is the average", kind: "procedural", text: ["In an AP each term is the average of its two neighbours: 2a₂ = a₁ + a₃.", "If this fails anywhere, the list is not an AP."] },
    ],
  },
  limits: "Five whole-number terms; lists with fractions or with only a few terms given are not included.",
});

/** [k, a, d, N, n]: k = 0 which term is V, 1 the nth term from the end of an N-term AP, 2 the number of terms. */
const apkL = ([, a, d, N]: number[]) => a + (N - 1) * d;
const auapk = F({
  id: "auapk",
  arity: 5,
  title: "Which term, the nth term from the end, and the number of terms of an AP",
  competency: AP,
  type: "integer",
  mc: true,
  prompt: (p) => {
    const [k, a, d, , n] = p;
    const head = `${nf(a)}, ${nf(a + d)}, ${nf(a + 2 * d)}`;
    return k === 0 ? `Which term of the AP ${head}, … is ${nf(a + (n - 1) * d)}?` : k === 1 ? `The AP ${head}, …, ${nf(apkL(p))} ends at ${nf(apkL(p))}. Find its ${n}th term from the end.` : `How many terms does the AP ${head}, …, ${nf(apkL(p))} have?`;
  },
  solve: (p) => {
    const [k, a, d, N, n] = p;
    const l = apkL(p);
    if (k === 0) return { steps: [st("set", "model", AP, `Put aₙ = a + (n − 1)d = ${nf(a + (n - 1) * d)}: (n − 1) × ${pn(d)} = ${nf((n - 1) * d)}`, (n - 1) * d), st("n", "divide", AP, `n − 1 = ${n - 1}, so n = ${n}`, n)], answer: n };
    if (k === 1) return { steps: [st("reverse", "model", AP, `From the end the AP starts at ${nf(l)} and goes down by ${pn(d)} each step: the nth term from the end is l − (n − 1)d`, l), st("term", "substitute", AP, `${nf(l)} − ${n - 1} × ${pn(d)} = ${nf(l - (n - 1) * d)}`, l - (n - 1) * d)], answer: l - (n - 1) * d };
    return { steps: [st("set", "model", AP, `Put l = a + (n − 1)d: ${nf(l)} = ${nf(a)} + (n − 1) × ${pn(d)}, so n − 1 = ${N - 1}`, N - 1), st("n", "add", AP, `n = ${N}`, N)], answer: N };
  },
  // independent: write the terms out one by one and count
  validate: (p, v) => {
    const [k, a, d, N, n] = p;
    if (typeof v !== "number") return false;
    if (k === 0) {
      let t = a;
      for (let i = 1; i <= 200; i++, t += d) if (t === a + (n - 1) * d) return v === i;
      return false;
    }
    const terms: number[] = [];
    for (let t = a, i = 0; i < 300; i++, t += d) {
      terms.push(t);
      if (t === apkL(p)) break;
    }
    return k === 1 ? terms.reverse()[n - 1] === v : terms.length === v;
  },
  bugs: (p) => {
    const [k, a, d, N, n] = p;
    if (k === 0) return [bug("forgot-plus-one", "procedural", AP, "The number of steps from the first term was given; the term number is one more than the number of steps (the first term is term 1, after 0 steps).", n - 1)];
    if (k === 1)
      return [
        bug("from-the-start", "conceptual", AP, `The ${n}th term from the start was found; from the end, start at the last term and go back.`, a + (n - 1) * d),
        bug("n-steps", "procedural", AP, `${n} steps were taken back from the last term; the ${n}th term from the end is ${n - 1} steps back.`, apkL(p) - n * d),
      ];
    return [bug("forgot-plus-one", "procedural", AP, "(l − a) ÷ d counts the steps between terms; the number of terms is one more.", N - 1)];
  },
  domain: [[0, 2], [-10, 20], [-5, 9], [8, 40], [2, 30]],
  keep: ([k, , d, N, n]) => d !== 0 && (k === 0 ? N === 8 : k === 1 ? n <= N - 1 && n <= 15 : n === 2),
  why: "Whole-number APs: which term has a value, the nth term from the end, or how many terms there are (8 to 40 terms).",
  cap: 400,
  difficulty: ([k, , d]) => (k === 2 && d > 0 ? 1 : k === 1 || d < 0 ? 3 : 2),
  teach: {
    idea: "In an AP aₙ = a + (n − 1)d: term n is n − 1 steps of size d after the first term. Read backwards from the last term l, the AP has first term l and difference −d.",
    method: "Which term is V: solve a + (n − 1)d = V for n. Number of terms: solve a + (n − 1)d = l. The nth term from the end: l − (n − 1)d.",
    alternatives: [
      { id: "steps", title: "Count the steps", kind: "conceptual", text: ["(V − a) ÷ d is how many steps of d lead from a to V.", "Add 1 for the first term itself: that is the term number."] },
      { id: "fence", title: "Fence posts", kind: "conceptual", text: ["Terms are like fence posts and differences like the gaps between them.", "There is always one more post than gaps."] },
    ],
  },
  limits: "Whole-number APs up to 40 terms; finding a term from two given terms is in another family.",
});

/** [a, d, n]: the everyday story is savings or instalments when d > 0, logs in rows when d < 0. */
const apsSum = ([a, d, n]: number[]) => (n * (2 * a + (n - 1) * d)) / 2;
const auaps = F({
  id: "auaps",
  arity: 3,
  title: "The sum of the first n terms of an AP",
  competency: AP,
  type: "integer",
  mc: true,
  prompt: ([a, d, n]) => `Find the sum of the first ${n} terms of the AP ${a}, ${a + d}, ${a + 2 * d}, ….`,
  solve: (p) => {
    const [a, d, n] = p;
    const l = a + (n - 1) * d;
    return { steps: [st("last", "substitute", AP, `The ${n}th term is l = ${a} + ${n - 1} × ${pn(d)} = ${l}`, l), st("sum", "substitute", AP, `Sₙ = n(a + l)/2 = ${n} × (${a} + ${l}) ÷ 2 = ${apsSum(p)}`, apsSum(p))], answer: apsSum(p) };
  },
  // independent: add the terms one at a time
  validate: ([a, d, n], v) => {
    let s = 0;
    for (let i = 0, t = a; i < n; i++, t += d) s += t;
    return v === s;
  },
  bugs: ([a, d, n]) => [
    bug("no-half", "recall", AP, "The sum was not halved: pairing the first and last terms gives n/2 pairs, not n pairs.", n * (2 * a + (n - 1) * d)),
    bug("n-not-n-minus-1", "procedural", AP, `(n − 1)d was written as nd; the last of ${n} terms is only ${n - 1} steps after the first.`, (n * (2 * a + n * d)) / 2),
    bug("single-a", "recall", AP, "The formula was used as n/2 × [a + (n − 1)d]; it is n/2 × [2a + (n − 1)d] (the first term and the last term together).", (n * (a + (n - 1) * d)) / 2),
    bug("last-times-n", "conceptual", AP, "Every term was taken to be as large as the last one; the terms grow (or shrink) evenly, so their average is (first + last)/2.", n * (a + (n - 1) * d)),
  ],
  domain: [[1, 60], [-6, 12], [5, 25]],
  keep: ([a, d, n]) => d !== 0 && (d < 0 ? a + (n - 1) * d >= 1 : true),
  why: "Whole-number APs with 5 to 25 terms, every term positive (savings and instalments grow; rows of logs shrink).",
  cap: 400,
  difficulty: ([a, d, n]) => (n <= 10 && d > 0 && a <= 20 ? 1 : n >= 20 || d < 0 ? 3 : 2),
  word: ([a, d, n]) => {
    const who = nm(a + n);
    const c = d < 0 ? 2 : a >= 20 && (a + n) % 2 === 1 ? 1 : 0;
    return c === 0
      ? `${who} saves ₹${a} in the first week and each week saves ₹${d} more than the week before. How much has ${who} saved in all after ${n} weeks, in rupees?`
      : c === 1
        ? `${who} repays a loan in ${n} monthly instalments. The first instalment is ₹${a}, and each instalment is ₹${d} more than the one before. What is the total amount repaid, in rupees?`
        : `Logs are stacked in ${n} rows: ${a} logs in the bottom row, and each row above has ${-d} fewer logs than the row below it. How many logs are there in all?`;
  },
  teach: {
    idea: "Write the sum forwards and backwards and add: each pair of terms adds to the same total a + l, and there are n pairs, so 2Sₙ = n(a + l).",
    method: "Find the last term l = a + (n − 1)d, then Sₙ = n(a + l)/2, or in one step Sₙ = n/2 × [2a + (n − 1)d].",
    alternatives: [
      { id: "gauss", title: "Pair the ends", kind: "conceptual", text: ["Pair the first with the last, the second with the second-last, and so on: every pair has the same sum.", "Multiply that pair sum by the number of pairs, n/2."] },
      { id: "average", title: "Average times number", kind: "procedural", text: ["The terms of an AP are spread evenly, so their average is (first + last)/2.", "The sum is that average times the number of terms."] },
    ],
  },
  limits: "Positive whole-number terms with 5 to 25 terms; finding n from a given sum is not included.",
});

/** [k, p, r, t, q, s]: (pk + q), (rk + s), (tk + u) consecutive terms of an AP, u chosen so that k is the answer. */
const apcU = ([k, p, r, t, q, s]: number[]) => 2 * (r * k + s) - (p * k + q) - t * k;
const linK = (c: number, d: number) => `${c === 1 ? "" : c}k ${d < 0 ? "−" : "+"} ${Math.abs(d)}`;
const linK0 = (c: number, d: number) => (d === 0 ? `${c === 1 ? "" : c}k` : linK(c, d));
const auapc = F({
  id: "auapc",
  arity: 6,
  title: "The condition for three numbers to be in AP",
  competency: AP,
  type: "integer",
  mc: true,
  prompt: (p) => {
    const [, pp, r, t, q, s] = p;
    return `For which value of k are ${linK0(pp, q)}, ${linK0(r, s)} and ${linK0(t, apcU(p))} (in this order) consecutive terms of an AP?`;
  },
  solve: (p) => {
    const [k, pp, r, t, q, s] = p;
    const u = apcU(p);
    return {
      steps: [
        st("condition", "model", AP, `Three numbers a, b, c are in AP when b − a = c − b, that is 2b = a + c: 2(${linK0(r, s)}) = (${linK0(pp, q)}) + (${linK0(t, u)})`, "2b = a + c"),
        st("collect", "simplify", LIN, `${2 * r}k ${signed0(2 * s)} = ${pp + t}k ${signed0(q + u)}, so ${nf(2 * r - pp - t)}k = ${nf(q + u - 2 * s)}`, q + u - 2 * s),
        st("solve", "divide", LIN, `k = ${k}`, k),
      ],
      answer: k,
    };
  },
  // independent: substitute and compare the two gaps
  validate: (p, v) => {
    if (typeof v !== "number") return false;
    const [, pp, r, t, q, s] = p;
    const [A, B, C] = [pp * v + q, r * v + s, t * v + apcU(p)];
    return B - A === C - B;
  },
  bugs: (p) => {
    const [, pp, r, t, q, s] = p;
    const u = apcU(p);
    const div = (n: number, d: number) => (d !== 0 && n % d === 0 ? n / d : null);
    return [
      bug("forgot-the-two", "recall", AP, "The middle term was set equal to the sum of the other two; it is twice the middle term that equals that sum (the middle term is their average).", div(q + u - s, r - pp - t)),
      bug("ends-equal", "conceptual", AP, "The first and third terms were set equal; in an AP the gaps are equal, not the terms.", div(u - q, pp - t)),
    ];
  },
  distractors: ([k]) => [k + 1, k - 1, -k],
  domain: [[-5, 8], [1, 4], [1, 5], [1, 4], [-9, 9], [-9, 9]],
  keep: (p) => {
    const [k, pp, r, t, q, s] = p;
    const u = apcU(p);
    return 2 * r - pp - t !== 0 && Math.abs(u) <= 15 && r * k + s !== pp * k + q && !(pp === r && q === s) && !(r === t && s === u);
  },
  why: "Three linear expressions in k with small whole-number coefficients, in AP for one whole-number k.",
  cap: 300,
  difficulty: ([k, pp, r, t]) => (Math.abs(2 * r - pp - t) === 1 && k > 0 ? 1 : k < 0 ? 3 : 2),
  teach: {
    idea: "Three numbers are in AP exactly when the middle one is halfway between the others: b − a = c − b, or 2b = a + c.",
    method: "Write 2 × (middle expression) = (first) + (third), collect the k terms on one side and the numbers on the other, and divide.",
    alternatives: [
      { id: "gaps", title: "Equal gaps", kind: "procedural", text: ["Write the first gap (second − first) and the second gap (third − second) in terms of k.", "Set them equal and solve."] },
      { id: "check", title: "Check with the numbers", kind: "conceptual", text: ["Put your k into the three expressions.", "The three numbers you get must go up (or down) by the same amount."] },
    ],
  },
  limits: "Linear expressions in k with whole-number answers; conditions with squares (e.g. a², b², c² in AP) are not included.",
});
function signed0(v: number) {
  return v === 0 ? "+ 0" : `${v < 0 ? "−" : "+"} ${Math.abs(v)}`;
}

/** [k, p, q, A]: k = 0 the rule aₙ = pn² + An + q; k = 1 a₁ = A, aₙ = p·aₙ₋₁ + q. */
const recTerms = ([k, p, q, A]: number[]) => {
  if (k === 0) return [1, 2, 3, 4].map((n) => p * n * n + A * n + q);
  const out = [A];
  for (let i = 1; i < 4; i++) out.push(p * out[i - 1] + q);
  return out;
};
const ruleStr = ([k, p, q, A]: number[]) => (k === 0 ? `aₙ = ${sum([[p, "n²"], [A, "n"], [q, ""]])}` : `a₁ = ${nf(A)} and aₙ = ${sum([[p, "aₙ₋₁"], [q, ""]])} for n ≥ 2`);
const auaprec = F({
  id: "auaprec",
  arity: 4,
  title: "Terms of a sequence from a general or a recursive rule",
  competency: AP,
  type: "tuple",
  mc: true,
  prompt: (p) => `A sequence is given by ${ruleStr(p)}. Write its first four terms as (a₁, a₂, a₃, a₄).`,
  solve: (p) => {
    const T = recTerms(p);
    return p[0] === 0
      ? { steps: [st("sub", "substitute", VAR, `Put n = 1, 2, 3, 4 into the rule: ${T.map(nf).join(", ")}`, tup(T))], answer: tup(T) }
      : { steps: [st("start", "read", AP, `a₁ = ${nf(T[0])}`, T[0]), st("next", "substitute", VAR, `Each term from the one before: a₂ = ${nf(T[1])}, a₃ = ${nf(T[2])}, a₄ = ${nf(T[3])}`, tup(T))], answer: tup(T) };
  },
  // independent: for the general rule, the second differences of pn² + An + q are 2p and a₁ = p + A + q; for the
  // recursive rule, undo each step ((aₙ − q) ÷ p gives the term before)
  validate: (p, v) => {
    const t = tupleNums(v, 4);
    if (!t) return false;
    const [k, pp, q, A] = p;
    if (k === 0) return t[0] === pp + A + q && t[1] - t[0] === 3 * pp + A && t.slice(2).every((x, i) => x - 2 * t[i + 1] + t[i] === 2 * pp);
    return t[0] === A && t.slice(1).every((x, i) => (x - q) / pp === t[i]);
  },
  bugs: (p) => {
    const [k, pp, q, A] = p;
    if (k === 0) return [bug("started-at-zero", "procedural", AP, "The terms were found for n = 0, 1, 2, 3; the first term a₁ has n = 1.", tup([0, 1, 2, 3].map((n) => pp * n * n + A * n + q)))];
    const out = [A];
    for (let i = 1; i < 4; i++) out.push(pp * (out[i - 1] + q));
    const shift = [pp * A + q];
    for (let i = 1; i < 4; i++) shift.push(pp * shift[i - 1] + q);
    return [
      bug("bracket", "procedural", VAR, `The rule was used as ${pp}(aₙ₋₁ + ${pn(q)}); multiply the term before by ${pp} first, then ${q < 0 ? "subtract" : "add"} ${Math.abs(q)}.`, tup(out)),
      bug("rule-on-first", "conceptual", AP, `The rule was applied to a₁ as well; a₁ = ${nf(A)} is given, and the rule starts at a₂.`, tup(shift)),
    ];
  },
  distractors: (p) => {
    const T = recTerms(p);
    return [tup([T[0], T[1], T[2], T[3] + 1]), tup([T[0], T[1] + 1, T[2] + 2, T[3] + 3])];
  },
  domain: [[0, 1], [-2, 3], [-9, 9], [-5, 6]],
  keep: ([k, p, q, A]) => p !== 0 && (k === 0 ? Math.abs(q) <= 9 : Math.abs(q) <= 5 && q !== 0),
  why: "A quadratic rule aₙ = pn² + An + q, or a₁ = A and aₙ = p·aₙ₋₁ + q, with small whole numbers.",
  cap: 400,
  difficulty: ([k, p]) => (k === 1 && p === 1 ? 1 : k === 0 && p > 0 ? 2 : 3),
  teach: {
    idea: "A general rule gives any term directly from its position n; a recursive rule gives each term from the one before, starting from a given first term. With aₙ = aₙ₋₁ + d the sequence is an AP.",
    method: "General rule: substitute n = 1, 2, 3, 4. Recursive rule: start from a₁, then apply the rule to get a₂ from a₁, a₃ from a₂, and so on.",
    alternatives: [
      { id: "table", title: "A table of n and aₙ", kind: "procedural", text: ["Make two rows: n = 1, 2, 3, 4 and the terms.", "For a recursive rule, fill each box using the box just before it."] },
      { id: "ap_link", title: "When is it an AP?", kind: "conceptual", text: ["aₙ = aₙ₋₁ + d adds the same number each time: an AP.", "aₙ = 2aₙ₋₁ + 1 does not: the gaps keep changing."] },
    ],
  },
  limits: "Quadratic general rules and first-order recursive rules aₙ = p·aₙ₋₁ + q with small whole numbers.",
});

/** [k, a, d]: the AP a, a + d, … as points (n, aₙ) on y = dx + (a − d). */
const auapln = F({
  id: "auapln",
  arity: 3,
  title: "An AP as points on a straight line",
  competency: AP,
  type: "tuple",
  mc: true,
  prompt: ([k, a, d]) =>
    k === 0
      ? `The terms of the AP ${a}, ${a + d}, ${a + 2 * d}, ${a + 3 * d}, … are plotted as points (n, aₙ) for n = 1, 2, 3, 4, as in the picture. They lie on a straight line y = mx + c. Find m and c, as (m, c).`
      : `The terms of an AP are plotted as points (n, aₙ) for n = 1, 2, 3, …, and they lie on the line y = ${sum([[d, "x"], [a - d, ""]])}. Find the first term a and the common difference d of the AP, as (a, d).`,
  figure: ([k, a, d]) => (k === 0 ? ({ type: "plane", points: [1, 2, 3, 4].map((n) => [n, a + (n - 1) * d]), quadrant: 1 } as Visual) : null),
  solve: ([k, a, d]) =>
    k === 0
      ? { steps: [st("slope", "subtract", AP, `Each step of 1 in n raises aₙ by d = ${d}: that is the slope, m = ${d}`, d), st("intercept", "substitute", AP, `At n = 1, y = ${a}: c = ${a} − ${d} = ${a - d}`, a - d)], answer: tup([d, a - d]) }
      : { steps: [st("d", "read", AP, `The slope is the common difference: d = ${d}`, d), st("a", "substitute", AP, `The first term is the value at x = 1: ${d} + ${pn(a - d)} = ${a}`, a)], answer: tup([a, d]) },
  // independent: put n = 1, 2, 3, 4 into the line (or the AP) and compare with the terms built by repeated addition
  validate: ([k, a, d], v) => {
    const t = tupleNums(v, 2);
    if (!t) return false;
    const terms: number[] = [a];
    for (let i = 1; i < 4; i++) terms.push(terms[i - 1] + d);
    return k === 0 ? terms.every((y, i) => t[0] * (i + 1) + t[1] === y) : terms.every((y, i) => t[0] + i * t[1] === y);
  },
  bugs: ([k, a, d]) =>
    k === 0
      ? [bug("intercept-is-first-term", "conceptual", AP, "The first term was taken as c; c is the value at n = 0, one step before the first term, so c = a − d.", tup([d, a])), bug("order-swapped", "procedural", AP, "The two numbers were given in the wrong order: m (the slope) comes first.", tup([a - d, d]))]
      : [bug("first-term-is-intercept", "conceptual", AP, "The constant of the line was taken as the first term; the first term is the value at x = 1, so a = m + c.", tup([a - d, d])), bug("order-swapped", "procedural", AP, "The two numbers were given in the wrong order: the first term a comes first.", tup([d, a]))],
  distractors: ([k, a, d]) => (k === 0 ? [tup([d, a + d]), tup([-d, a - d])] : [tup([a + d, d]), tup([a, -d])]),
  domain: [[0, 1], [1, 30], [1, 9]],
  keep: ([k, a, d]) => a !== d && (k === 0 ? a <= 15 : true) && a - d !== d,
  why: "APs with a positive first term up to 30 and a positive whole-number difference up to 9.",
  cap: 400,
  difficulty: ([k, a, d]) => (k === 0 && a > d ? 1 : k === 1 && a < d ? 3 : 2),
  word: ([k, a, d]) =>
    k === 0
      ? `An auto-rickshaw charges ₹${a} for the first kilometre and ₹${d} for each further kilometre, so the fares for 1, 2, 3, 4 km are ₹${a}, ₹${a + d}, ₹${a + 2 * d}, ₹${a + 3 * d}. Plotted as points (distance, fare), they lie on a straight line y = mx + c. Find (m, c).`
      : `A taxi's fares for 1, 2, 3, … km, plotted as points (distance in km, fare in ₹), lie on the line y = ${sum([[d, "x"], [a - d, ""]])}. Find the fare for the first kilometre and the extra charge for each further kilometre, as (fare for 1 km, extra per km).`,
  teach: {
    idea: "aₙ = a + (n − 1)d = dn + (a − d) is a linear expression in n, so the points (n, aₙ) of an AP lie on a straight line whose slope is the common difference.",
    method: "Slope m = d. Intercept c = a − d (the value 'at n = 0'). Going back: d = m and a = m + c.",
    alternatives: [
      { id: "table_line", title: "From a table", kind: "procedural", text: ["Write n and aₙ in a table: aₙ rises by d whenever n rises by 1.", "Step back from n = 1 to n = 0 to find where the line meets the y-axis."] },
      { id: "everyday", title: "Fixed charge plus rate", kind: "conceptual", text: ["A fare with a fixed charge and the same price for each kilometre grows in equal steps.", "Its graph is a straight line; the price per kilometre is the slope."] },
    ],
    visual: () => ({ type: "plane", points: [[1, 3], [2, 5], [3, 7], [4, 9]], quadrant: 1 }),
  },
  limits: "Increasing APs with whole-number terms; decreasing APs and graphs of sums are not included.",
});

// ================================================================ quadratic equations

type QOpt = { not: true } | { not?: false; A: number; B: number; C: number };
const qStr = (o: QOpt) => (o.not ? "It is not a quadratic equation" : `${sum([[o.A, "x²"], [o.B, "x"], [o.C, ""]])} = 0`);
/** [k, p, q, r, s]: k = 0 (x + p)(x + q) = rx + s; 1 (x + p)² = x² + rx + s; 2 (2x + p)(x + q) = x² + rx + s. */
const qSides = ([k, p, q, r, s]: number[]) => (x: number) => (k === 0 ? (x + p) * (x + q) - (r * x + s) : k === 1 ? (x + p) ** 2 - (x * x + r * x + s) : (2 * x + p) * (x + q) - (x * x + r * x + s));
const qEqText = ([k, p, q, r, s]: number[]) => {
  const xb = (c: number) => `(x ${c < 0 ? "−" : "+"} ${Math.abs(c)})`;
  return k === 0 ? `${xb(p)}${xb(q)} = ${sum([[r, "x"], [s, ""]])}` : k === 1 ? `${xb(p)}² = ${sum([[1, "x²"], [r, "x"], [s, ""]])}` : `(2x ${p < 0 ? "−" : "+"} ${Math.abs(p)})${xb(q)} = ${sum([[1, "x²"], [r, "x"], [s, ""]])}`;
};
function qOpts(p: number[]) {
  const [k, pp, q, r, s] = p;
  let base: QOpt[];
  if (k === 0) base = [{ A: 1, B: pp + q - r, C: pp * q - s }, { A: 1, B: pp + q + r, C: pp * q + s }, { A: 1, B: pp + q, C: pp * q }, { not: true }];
  else if (k === 1) base = [{ not: true }, { A: 1, B: 2 * pp - r, C: pp * pp - s }, { A: 2, B: 2 * pp - r, C: pp * pp - s }, { A: 1, B: 2 * pp + r, C: pp * pp + s }];
  else base = [{ A: 1, B: pp + 2 * q - r, C: pp * q - s }, { A: 1, B: pp + 2 * q + r, C: pp * q + s }, { A: 3, B: pp + 2 * q - r, C: pp * q - s }, { not: true }];
  const strs = base.map(qStr);
  const opts = shuffled(strs, `auqstd:${p}`);
  return { opts, idx: strs.map((x) => opts.indexOf(x)), base };
}
const auqstd = F({
  id: "auqstd",
  arity: 5,
  title: "Recognising a quadratic equation and writing it in standard form",
  competency: QUAD,
  type: "choice",
  prompt: (p) => `Write the equation ${qEqText(p)} in the form ax² + bx + c = 0, or decide that it is not a quadratic equation. Which is correct?`,
  choices: (p) => qOpts(p).opts,
  solve: (p) => {
    const o = qOpts(p);
    const f = qSides(p);
    const [c0, c1, c2] = [f(0), f(1), f(2)];
    const A = (c2 - 2 * c1 + c0) / 2;
    return {
      steps: [
        st("expand", "expand", IDI, `Expand and bring every term to the left-hand side: ${sum([[A, "x²"], [c1 - c0 - A, "x"], [c0, ""]])} = 0`, sum([[A, "x²"], [c1 - c0 - A, "x"], [c0, ""]])),
        st("decide", "classify", QUAD, A !== 0 ? "The x² term remains (a ≠ 0), so it is a quadratic equation in standard form" : "The x² terms cancel, so the equation is linear, not quadratic", o.idx[0]),
      ],
      answer: o.idx[0],
    };
  },
  // independent: compare the chosen statement with the two sides evaluated at x = −1, 0, 1, 2, 3
  validate: (p, v) => {
    const o = qOpts(p);
    if (typeof v !== "number" || !o.opts[v]) return false;
    const chosen = o.base[o.idx.indexOf(v)];
    const f = qSides(p);
    const xs = [-1, 0, 1, 2, 3];
    if (chosen.not) return f(-1) - 2 * f(0) + f(1) === 0;
    return xs.every((x) => chosen.A * x * x + chosen.B * x + chosen.C === f(x));
  },
  bugs: (p) => {
    const o = qOpts(p);
    if (p[0] === 1)
      return [
        bug("x2-not-cancelled", "conceptual", QUAD, "The x² on the right was not taken away from the x² on the left; they cancel, which leaves a linear equation.", o.idx[1]),
        bug("x2-added", "procedural", QUAD, "The x² terms were added when the right side was moved; moving x² to the left makes it − x².", o.idx[2]),
      ];
    return [
      bug("signs-not-changed", "procedural", QUAD, "Terms were moved from the right side to the left without changing their signs; moving + rx makes it − rx.", o.idx[1]),
      ...(p[0] === 0 ? [bug("right-side-dropped", "conceptual", QUAD, "Only the left side was expanded and the right side was forgotten; standard form needs everything on one side with 0 on the other.", o.idx[2])] : [bug("x2-added", "procedural", QUAD, "The x² on the right was added to the 2x² on the left; moving it across makes it − x².", o.idx[2])]),
    ];
  },
  domain: [[0, 2], [-6, 6], [-6, 6], [-9, 9], [-9, 9]],
  keep: ([k, p, q, r, s]) => r !== 0 && s !== 0 && p !== 0 && (k === 1 ? 2 * p !== r && q === 1 : q !== 0) && (k === 2 ? p + 2 * q !== r || p * q !== s : true),
  why: "Products of two brackets equal to a linear or quadratic expression, with small whole numbers.",
  cap: 400,
  difficulty: ([k]) => (k === 0 ? 1 : k === 1 ? 2 : 3),
  teach: {
    idea: "A quadratic equation is one that can be written as ax² + bx + c = 0 with a ≠ 0. Whether it is quadratic shows only after expanding and collecting everything on one side: the x² terms may cancel.",
    method: "Expand every bracket, move all terms to the left (changing their signs), collect like terms. If an x² term remains, that is the standard form; if not, the equation is linear.",
    alternatives: [
      { id: "degree", title: "Look for the highest power", kind: "conceptual", text: ["After simplifying, the highest power of x decides the type.", "Power 2: quadratic. Power 1 only: linear."] },
      { id: "check_value", title: "Check with a number", kind: "procedural", text: ["Put x = 1 into both sides of the original equation and find left − right.", "Your standard form must give the same value at x = 1."] },
    ],
  },
  limits: "Equations from two brackets with small whole numbers; equations with fractions in x are not included.",
});

/** [a, b, c, d]: (ax + b)(cx + d) = 0. */
const splitABC = ([a, b, c, d]: number[]) => [a * c, a * d + b * c, b * d];
const auqsplit = F({
  id: "auqsplit",
  arity: 4,
  title: "Solving ax² + bx + c = 0 by splitting the middle term",
  competency: QUAD,
  type: "set",
  prompt: (p) => {
    const [A, B, C] = splitABC(p);
    return `Solve ${sum([[A, "x²"], [B, "x"], [C, ""]])} = 0 by splitting the middle term. Give both roots (fractions are fine).`;
  },
  solve: (p) => {
    const [a, b, c, d] = p;
    const [A, B, C] = splitABC(p);
    return {
      steps: [
        st("product", "multiply", FAC, `a × c = ${A} × ${pn(C)} = ${nf(A * C)}: find two numbers with this product and sum ${nf(B)}: ${nf(a * d)} and ${nf(b * c)}`, `${nf(a * d)}, ${nf(b * c)}`),
        st("factor", "factorise", FAC, `Group and factorise: (${linT(a, b)})(${linT(c, d)}) = 0`, `(${linT(a, b)})(${linT(c, d)})`),
        st("roots", "solve", LIN, `Each bracket is 0: x = ${rat(-b, a)} or x = ${rat(-d, c)}`, `${rat(-b, a)}, ${rat(-d, c)}`),
      ],
      answer: [-b / a, -d / c],
    };
  },
  // independent: substitute each value into the equation (multiplied through by the denominators) and check there
  // are exactly two different roots
  validate: (p, v) => {
    if (!Array.isArray(v) || v.length !== 2 || near(v[0], v[1], 1e-12)) return false;
    const [A, B, C] = splitABC(p);
    return v.every((x) => Math.abs(A * x * x + B * x + C) < 1e-9);
  },
  bugs: ([a, b, c, d]) => [
    bug("signs-of-roots", "procedural", LIN, "The numbers in the brackets were taken as the roots with their signs; ax + b = 0 gives x = −b/a.", [b / a, d / c]),
    bug("not-divided", "procedural", LIN, "The coefficient of x in each bracket was not divided out: ax + b = 0 gives x = −b/a, not −b.", [-b, -d]),
    bug("inverted", "procedural", LIN, "The fraction was turned upside down: ax + b = 0 gives x = −b/a, not −a/b.", b !== 0 && d !== 0 ? [-a / b, -c / d] : null),
  ],
  distractors: ([a, b, c, d]) => [[-b / a, d / c], [b / a, -d / c]],
  domain: [[1, 6], [-9, 9], [1, 6], [-9, 9]],
  keep: ([a, b, c, d]) => a * c >= 2 && b !== 0 && d !== 0 && gcd(a, b) === 1 && gcd(c, d) === 1 && (a < c || (a === c && b < d)) && !near(-b / a, -d / c) && Math.abs(a * d + b * c) <= 30 && Math.abs(b * d) <= 40 && a * d + b * c !== 0,
  why: "(ax + b)(cx + d) = 0 with a·c ≥ 2, whole numbers up to 9, two different rational roots.",
  cap: 400,
  difficulty: ([a, b, c, d]) => (a === 1 && b * d < 0 ? 1 : a * c >= 12 ? 3 : 2),
  teach: {
    idea: "Splitting the middle term reverses the expansion of (ax + b)(cx + d): the two middle products ad and bc multiply to ac × bd and add to the x coefficient.",
    method: "Multiply a by c; find two numbers with that product and with sum b; split bx into those two terms; group in pairs and factorise; set each bracket to 0.",
    alternatives: [
      { id: "formula", title: "Use the quadratic formula", kind: "procedural", text: ["x = (−b ± √(b² − 4ac))/(2a) gives the same two roots.", "Here b² − 4ac is a perfect square, which is why the factors are rational."] },
      { id: "check", title: "Check a root", kind: "conceptual", text: ["Put each root back into ax² + bx + c.", "It must give 0."] },
    ],
  },
  limits: "Rational roots with a leading coefficient from 2 to 36; equations needing the formula are in another family.",
});

/** √n = k√m with m square-free. */
function sqf(n: number): [number, number] {
  let k = 1;
  let m = n;
  for (let p = 2; p * p <= m; p++) while (m % (p * p) === 0) {
    m /= p * p;
    k *= p;
  }
  return [k, m];
}
/** (p0 + k√m)/d in simplest form (m square-free, m > 1). */
function quadRoot(p0: number, k: number, m: number, d: number): string {
  if (d < 0) [p0, k, d] = [-p0, -k, -d];
  const g = gcd(gcd(Math.abs(p0), Math.abs(k)), d) || 1;
  const [P, K, D] = [p0 / g, k / g, d / g];
  const s = `${Math.abs(K) === 1 ? "" : Math.abs(K)}√${m}`;
  if (P === 0) return `${K < 0 ? "−" : ""}${s}${D === 1 ? "" : `/${D}`}`;
  const body = `${nf(P)} ${K < 0 ? "−" : "+"} ${s}`;
  return D === 1 ? body : `(${body})/${D}`;
}
const qfRoots = (A: number, B: number, Dis: number, den = 2 * A) => {
  const [k, m] = sqf(Dis);
  return `${quadRoot(-B, k, m, den)}, ${quadRoot(-B, -k, m, den)}`;
};
const isSq = (n: number) => n >= 0 && Math.round(Math.sqrt(n)) ** 2 === n;
const auqf = F({
  id: "auqf",
  arity: 3,
  title: "Solving a quadratic equation with the quadratic formula (irrational roots)",
  competency: QUAD,
  type: "roots",
  mc: true,
  // [A, B, C]: Ax² + Bx + C = 0 with B² − 4AC > 0 and not a perfect square
  prompt: ([A, B, C]) => `Solve ${sum([[A, "x²"], [B, "x"], [C, ""]])} = 0 using the quadratic formula. Give both roots in simplest surd form.`,
  solve: ([A, B, C]) => {
    const D = B * B - 4 * A * C;
    return { steps: [st("disc", "substitute", "MATH.algebra.quadratic-discriminant", `b² − 4ac = ${pn(B)}² − 4 × ${A} × ${pn(C)} = ${D}`, D), st("formula", "substitute", QUAD, `x = (−b ± √${D})/(2 × ${A}), simplified: ${qfRoots(A, B, D)}`, qfRoots(A, B, D))], answer: qfRoots(A, B, D) };
  },
  // independent: each root, as a number, makes Ax² + Bx + C zero, and there are two different roots
  validate: ([A, B, C], v) => {
    if (typeof v !== "string") return false;
    const xs = v.split(/,(?![^()]*\))/).map((t) => constOf(t.trim()));
    return xs.length === 2 && xs.every(Number.isFinite) && !near(xs[0], xs[1], 1e-9) && xs.every((x) => Math.abs(A * x * x + B * x + C) < 1e-8);
  },
  bugs: ([A, B, C]) => {
    const D = B * B - 4 * A * C;
    const D2 = B * B + 4 * A * C;
    return [
      bug("minus-b", "procedural", QUAD, "The formula starts with −b; here b itself was used, which changes the sign of both roots.", qfRoots(A, -B, D)),
      bug("over-two", "recall", QUAD, "Only 2 was put under the whole top; the denominator is 2a.", A !== 1 ? qfRoots(A, B, D, 2) : null),
      bug("plus-4ac", "procedural", "MATH.algebra.quadratic-discriminant", `The discriminant was worked out as b² + 4ac; it is b² − 4ac = ${D}.`, D2 > 0 && !isSq(D2) ? qfRoots(A, B, D2) : null),
    ];
  },
  distractors: ([A, B, C]) => {
    const D = B * B - 4 * A * C;
    return [qfRoots(A, B, D, A), qfRoots(A, -B, D, A)];
  },
  domain: [[1, 5], [-9, 9], [-9, 9]],
  keep: ([A, B, C]) => C !== 0 && B * B - 4 * A * C > 0 && !isSq(B * B - 4 * A * C) && gcd(gcd(A, Math.abs(B)), Math.abs(C)) === 1,
  why: "Ax² + Bx + C = 0 with whole-number coefficients (A up to 5) and a positive discriminant that is not a perfect square.",
  cap: 400,
  difficulty: ([A, B]) => (A === 1 && B % 2 === 0 ? 1 : A === 1 ? 2 : 3),
  teach: {
    idea: "Completing the square on ax² + bx + c = 0 gives (x + b/2a)² = (b² − 4ac)/4a², so x = (−b ± √(b² − 4ac))/2a: the formula works for every quadratic with real roots.",
    method: "Read a, b, c. Work out the discriminant b² − 4ac. Put it into x = (−b ± √D)/(2a), simplify the surd (√D = k√m), and cancel any common factor of all three numbers.",
    alternatives: [
      { id: "complete_square", title: "Complete the square", kind: "procedural", text: ["Divide by a, move c/a to the right, add (b/2a)² to both sides.", "Take the square root of both sides (±) and solve for x."] },
      { id: "estimate", title: "Check with a calculator estimate", kind: "conceptual", text: ["Work out each root as a decimal.", "Put it back into ax² + bx + c: the result should be very close to 0."] },
    ],
  },
  limits: "Two irrational real roots with whole-number coefficients; equal or complex roots are in other families.",
});

const auqcs = F({
  id: "auqcs",
  arity: 2,
  title: "Completing the square: x² + bx + c = (x + h)² + k",
  competency: QUAD,
  type: "tuple",
  mc: true,
  // [b, c]
  prompt: ([b, c]) => `Write x² ${signed(b)}x ${signed(c)} in the form (x + h)² + k by completing the square. Give (h, k); h and k may be negative or fractions.`.replace(/ ([+−]) 1x/, " $1 x"),
  solve: ([b, c]) => ({
    steps: [st("half", "divide", QUAD, `Half the coefficient of x: h = ${rat(b, 2)}`, rat(b, 2)), st("adjust", "subtract", QUAD, `(x + h)² adds h² = ${rat(b * b, 4)}, so k = ${nf(c)} − ${rat(b * b, 4)} = ${rat(4 * c - b * b, 4)}`, rat(4 * c - b * b, 4))],
    answer: tup([rat(b, 2), rat(4 * c - b * b, 4)]),
  }),
  // independent: expand (x + h)² + k at three values of x and compare with x² + bx + c
  validate: ([b, c], v) => {
    const t = tupleNums(v, 2);
    return !!t && [-2, 0.5, 3].every((x) => Math.abs((x + t[0]) ** 2 + t[1] - (x * x + b * x + c)) < 1e-9);
  },
  bugs: ([b, c]) => [
    bug("square-added", "procedural", QUAD, `h² was added to c instead of taken away; (x + h)² already contains + h², so it must be removed again.`, tup([rat(b, 2), rat(4 * c + b * b, 4)])),
    bug("not-halved", "recall", QUAD, `h was taken as the whole coefficient ${nf(b)}; (x + h)² = x² + 2hx + h², so h is half of it.`, tup([nf(b), nf(c - b * b)])),
    bug("sign-of-h", "procedural", QUAD, `The sign of h was changed; with + ${nf(b)}x the bracket is (x ${b < 0 ? "−" : "+"} ${rat(Math.abs(b), 2)}).`, tup([rat(-b, 2), rat(4 * c - b * b, 4)])),
  ],
  domain: [[-10, 10], [-15, 15]],
  keep: ([b]) => b !== 0,
  why: "Monic quadratics x² + bx + c with b from −10 to 10 (not 0) and c from −15 to 15.",
  difficulty: ([b]) => (b % 2 === 0 && b > 0 ? 1 : b % 2 === 0 ? 2 : 3),
  teach: {
    idea: "(x + h)² = x² + 2hx + h². Choosing h = b/2 makes the x terms agree; the h² that comes with it is then corrected by k = c − h².",
    method: "Halve the coefficient of x to get h, square it, and subtract the square from c to get k. The equation x² + bx + c = 0 then becomes (x + h)² = −k, which can be solved by square roots.",
    alternatives: [
      { id: "area", title: "Complete the square with a picture", kind: "conceptual", text: ["Draw x² as a square and bx as two strips of width b/2 on two sides.", "The missing corner is (b/2)²: adding it completes a square of side x + b/2."] },
      { id: "check", title: "Expand to check", kind: "procedural", text: ["Expand (x + h)² + k.", "It must give back x² + bx + c exactly."] },
    ],
  },
  limits: "Monic quadratics; completing the square with a leading coefficient is reached through the formula family.",
});

/** [k, x, s, t]: the story's equation for a trial value y (true when y is the answer). */
const qwpD = ([, x, s, t]: number[]) => (t * x * (x + s)) / s;
const qwpHolds = (p: number[], y: number) => {
  const [k, x, s, t] = p;
  if (k === 0) return y * (y + 1) === x * (x + 1);
  if (k === 1) return y * (y + s) === x * (x + s);
  if (k === 2) return Math.abs(qwpD(p) / y - qwpD(p) / (y + s) - t) < 1e-9;
  return y * y + (y + s) ** 2 === x * x + (x + s) ** 2;
};
const auqwp = F({
  id: "auqwp",
  arity: 4,
  title: "Quadratic word problems: numbers, ages and speeds",
  competency: QUAD,
  type: "integer",
  mc: true,
  // [k, x, s, t]: k = 0 consecutive numbers, 1 ages s apart, 2 a train s km/h faster saves t hours, 3 two numbers s apart
  prompt: (p) => {
    const [k, x, s, t] = p;
    const who = nm(x + s);
    return k === 0
      ? `The product of two consecutive positive whole numbers is ${x * (x + 1)}. Form a quadratic equation and find the smaller number.`
      : k === 1
        ? `${who} is ${s} years older than her brother, and the product of their ages (in years) is ${x * (x + s)}. Form a quadratic equation and find the brother's age.`
        : k === 2
          ? `A train travels ${qwpD(p)} km at a uniform speed. If the speed had been ${s} km/h more, the journey would have taken ${t} hour${t > 1 ? "s" : ""} less. Form a quadratic equation and find the usual speed of the train, in km/h.`
          : `Two positive whole numbers differ by ${s}, and the sum of their squares is ${x * x + (x + s) ** 2}. Form a quadratic equation and find the smaller number.`;
  },
  solve: (p) => {
    const [k, x, s, t] = p;
    const eq = k === 0 ? `x(x + 1) = ${x * (x + 1)}, so x² + x − ${x * (x + 1)} = 0` : k === 1 ? `x(x + ${s}) = ${x * (x + s)}, so x² + ${s}x − ${x * (x + s)} = 0` : k === 2 ? `${qwpD(p)}/x − ${qwpD(p)}/(x + ${s}) = ${t}, so ${t}x² + ${t * s}x − ${qwpD(p) * s} = 0` : `x² + (x + ${s})² = ${x * x + (x + s) ** 2}, so 2x² + ${2 * s}x − ${x * x + (x + s) ** 2 - s * s} = 0`;
    const other = k === 0 ? -(x + 1) : -(x + s);
    return { steps: [st("form", "model", QUAD, `Let x be the quantity asked for: ${eq}`, eq), st("roots", "factorise", FAC, `The roots are x = ${x} and x = ${other}`, `${x}, ${other}`), st("reject", "interpret", "MATH.reasoning.model-selection", `${other} is negative, which does not fit the situation, so x = ${x}`, x)], answer: x };
  },
  // independent: try every whole number from 1 to 400 in the story itself
  validate: (p, v) => {
    if (typeof v !== "number" || !isInt(v) || v < 1) return false;
    const hits: number[] = [];
    for (let y = 1; y <= 400; y++) if (qwpHolds(p, y)) hits.push(y);
    return hits.length === 1 && hits[0] === v;
  },
  bugs: (p) => {
    const [k, x, s] = p;
    const other = k === 0 ? -(x + 1) : -(x + s);
    return [
      bug("kept-impossible-root", "conceptual", "MATH.reasoning.model-selection", "The negative root of the equation was given; a number of years, a speed or a positive number cannot be negative, so that root is rejected.", other),
      bug("other-quantity", "procedural", QUAD, k === 2 ? "The faster speed was given; the question asks for the usual speed." : k === 1 ? "The sister's age was given; the question asks for the brother's." : "The larger number was given; the question asks for the smaller one.", k === 0 ? x + 1 : x + s),
    ];
  },
  domain: [[0, 3], [3, 80], [1, 20], [1, 3]],
  keep: (p) => {
    const [k, x, s, t] = p;
    if (k === 0) return s === 1 && t === 1 && x <= 40;
    if (k === 1) return t === 1 && s >= 2 && s <= 9 && x <= 40;
    if (k === 2) return x >= 20 && s % 5 === 0 && isInt(qwpD(p)) && qwpD(p) <= 2000;
    return t === 1 && s <= 9 && x <= 30;
  },
  why: "Consecutive numbers, ages, train speeds and two numbers with a given difference, each with one positive whole-number answer.",
  cap: 400,
  difficulty: ([k, x]) => (k === 0 && x <= 15 ? 1 : k === 2 ? 3 : 2),
  teach: {
    idea: "A quantity multiplied by a related quantity gives an x² term, so these situations lead to quadratic equations. A quadratic has two roots, and the situation decides which one is the answer.",
    method: "Let x be the quantity asked for; write the other quantities in terms of x; form the equation and bring it to standard form; solve (factorise or use the formula); reject a root that cannot happen (negative ages, lengths or speeds).",
    alternatives: [
      { id: "table", title: "A table of quantities", kind: "procedural", text: ["For the train: write distance, speed and time (time = distance ÷ speed) for the usual and the faster journeys.", "The difference of the two times gives the equation."] },
      { id: "check_story", title: "Check in the story", kind: "conceptual", text: ["Put your answer back into the words of the problem.", "Every condition must be true, and every quantity must make sense."] },
    ],
  },
  limits: "Four kinds of situation with whole-number answers; area problems are in the model-selection family.",
});

// ================================================================ section formula, ratio of division, centroid (plane)

/** [x1, y1, ux, uy, m, n]: A, B = A + (m + n)u, and the point P = A + mu dividing AB in m : n. */
const secPts = ([x1, y1, ux, uy, m, n]: number[]) => ({ A: [x1, y1], B: [x1 + (m + n) * ux, y1 + (m + n) * uy], P: [x1 + m * ux, y1 + m * uy] });
const secAsk = ([, , , , m, n]: number[]) =>
  m === 1 && n === 1 ? "the midpoint of AB" : m + n === 3 ? `the point of trisection of AB nearer to ${m === 1 ? "A" : "B"}` : `the point that divides AB internally in the ratio ${m} : ${n}`;
const ausec = F({
  id: "ausec",
  arity: 6,
  title: "The section formula: internal division, midpoint and points of trisection",
  competency: DIST,
  type: "tuple",
  mc: true,
  prompt: (p) => {
    const { A, B } = secPts(p);
    return `A is ${P2(A[0], A[1])} and B is ${P2(B[0], B[1])}. Find ${secAsk(p)}. Give it as (x, y).`;
  },
  solve: (p) => {
    const [, , , , m, n] = p;
    const { A, B, P } = secPts(p);
    return {
      steps: [
        st("ratio", "read", DIST, m + n === 3 && m * n === 2 ? `Nearer to ${m === 1 ? "A" : "B"} means AP : PB = ${m} : ${n}` : `AP : PB = ${m} : ${n}`, `${m}:${n}`),
        st("formula", "substitute", DIST, `P = ((${m} × ${pn(B[0])} + ${n} × ${pn(A[0])})/${m + n}, (${m} × ${pn(B[1])} + ${n} × ${pn(A[1])})/${m + n}) = ${P2(P[0], P[1])}`, P2(P[0], P[1])),
      ],
      answer: P2(P[0], P[1]),
    };
  },
  // independent: P lies on segment AB (zero cross product, between the ends) and n²·AP² = m²·PB²
  validate: (p, v) => {
    const t = tupleNums(v, 2);
    if (!t) return false;
    const [, , , , m, n] = p;
    const { A, B } = secPts(p);
    const cross = (B[0] - A[0]) * (t[1] - A[1]) - (B[1] - A[1]) * (t[0] - A[0]);
    const dot = (t[0] - A[0]) * (B[0] - t[0]) + (t[1] - A[1]) * (B[1] - t[1]);
    const ap = (t[0] - A[0]) ** 2 + (t[1] - A[1]) ** 2;
    const pb = (B[0] - t[0]) ** 2 + (B[1] - t[1]) ** 2;
    return Math.abs(cross) < 1e-9 && dot > 0 && Math.abs(n * n * ap - m * m * pb) < 1e-9;
  },
  bugs: (p) => {
    const [, , , , m, n] = p;
    const { A, B } = secPts(p);
    return [
      bug("ratio-reversed", "procedural", DIST, `The weights were swapped: for AP : PB = ${m} : ${n}, B is multiplied by ${m} and A by ${n}.`, P2((n * B[0] + m * A[0]) / (m + n), (n * B[1] + m * A[1]) / (m + n))),
      bug("not-divided", "procedural", DIST, `The weighted sum was not divided by ${m} + ${n} = ${m + n}.`, P2(m * B[0] + n * A[0], m * B[1] + n * A[1])),
      bug("difference-halved", "conceptual", DIST, "The coordinates were subtracted instead of combined; the midpoint (and every section point) adds the weighted coordinates.", m === n ? P2((B[0] - A[0]) / 2, (B[1] - A[1]) / 2) : null),
    ];
  },
  distractors: (p) => {
    const { A, B, P } = secPts(p);
    return [P2((A[0] + B[0]) / 2, (A[1] + B[1]) / 2), P2(P[0], -P[1]), P2(P[1], P[0])];
  },
  domain: [[-6, 6], [-6, 6], [-3, 3], [-3, 3], [1, 4], [1, 4]],
  keep: (p) => {
    const [, , ux, uy, m, n] = p;
    const { B } = secPts(p);
    return (ux !== 0 || uy !== 0) && gcd(m, n) === 1 && Math.abs(B[0]) <= 12 && Math.abs(B[1]) <= 12;
  },
  why: "Whole-number end points with the dividing point at whole-number coordinates, ratios up to 4 : 4 in simplest form.",
  cap: 400,
  difficulty: ([, , , , m, n]) => (m === 1 && n === 1 ? 1 : m + n === 3 ? 2 : 3),
  word: (p) => {
    const [, , , , m, n] = p;
    const { A, B } = secPts(p);
    const who = nm(A[0] + B[1] + m);
    const where = m === n ? "exactly halfway between them" : m + n === 3 ? `one-third of the way from the house to the school${m === 2 ? " counted from the school" : ""}` : `so that its distances from the house and from the school are in the ratio ${m} : ${n}`;
    return `On a grid map of a village, ${who}'s house is at ${P2(A[0], A[1])} and the school is at ${P2(B[0], B[1])}, joined by a straight road. A bus stop is put on this road ${where}. Where is the bus stop? Give (x, y).`;
  },
  teach: {
    idea: "The point dividing AB in the ratio m : n is m/(m + n) of the way from A to B, in both coordinates: it is a weighted average of A and B, with B weighted by m and A by n.",
    method: "P = ((mx₂ + nx₁)/(m + n), (my₂ + ny₁)/(m + n)). The midpoint is m = n = 1; the points of trisection are 1 : 2 and 2 : 1.",
    alternatives: [
      { id: "steps", title: "Equal steps along the segment", kind: "conceptual", text: ["Cut AB into m + n equal steps: each step is (B − A)/(m + n).", "Walk m steps from A."] },
      { id: "check_distances", title: "Check with distances", kind: "procedural", text: ["Work out AP and PB with the distance formula.", "Their ratio must be m : n."] },
    ],
  },
  limits: "Internal division with whole-number answers; external division (Grade 11) and fractional answers are not included.",
});

/** [k, x1, y1, ux, uy, m, n]: k = 0 the given point P = A + mu, 1 the x-axis, 2 the y-axis divides AB = A to A + (m + n)u. */
const ratPts = (p: number[]) => secPts(p.slice(1));
const aurat = F({
  id: "aurat",
  arity: 7,
  title: "The ratio in which a point or an axis divides a segment",
  competency: DIST,
  type: "ratio",
  mc: true,
  prompt: (p) => {
    const { A, B, P } = ratPts(p);
    return p[0] === 0
      ? `The point P${P2(P[0], P[1])} lies on the segment joining A${P2(A[0], A[1])} and B${P2(B[0], B[1])}. In what ratio does P divide AB? Give AP : PB in simplest form, as m:n.`
      : `In what ratio does the ${p[0] === 1 ? "x" : "y"}-axis divide the segment joining A${P2(A[0], A[1])} and B${P2(B[0], B[1])}? Give the ratio (from A) in simplest form, as m:n.`;
  },
  solve: (p) => {
    const [k, , , , , m, n] = p;
    const { A, B } = ratPts(p);
    const i = k === 1 ? 1 : 0;
    return {
      steps: [
        st("set", "model", DIST, k === 0 ? `Let the ratio be λ : 1 and use the x-coordinate: (λ × ${pn(B[0])} + ${pn(A[0])})/(λ + 1) = ${ratPts(p).P[0]}` : `A point on the ${k === 1 ? "x" : "y"}-axis has ${k === 1 ? "y" : "x"} = 0: (λ × ${pn(B[i])} + ${pn(A[i])})/(λ + 1) = 0`, "λ : 1"),
        st("solve", "solve", LIN, `λ = ${rat(m, n)}, so the ratio is ${m}:${n}`, `${m}:${n}`),
      ],
      answer: `${m}:${n}`,
    };
  },
  // independent: build the point that the stated ratio gives and test it (it is P, or it is on the axis)
  validate: (p, v) => {
    if (typeof v !== "string") return false;
    const r = v.split(":").map((x) => Number(x.trim()));
    if (r.length !== 2 || !r.every((x) => isInt(x) && x > 0) || gcd(r[0], r[1]) !== 1) return false;
    const { A, B, P } = ratPts(p);
    const Q = [0, 1].map((i) => A[i] + (r[0] / (r[0] + r[1])) * (B[i] - A[i]));
    return p[0] === 0 ? near(Q[0], P[0], 1e-12) && near(Q[1], P[1], 1e-12) : Math.abs(Q[p[0] === 1 ? 1 : 0]) < 1e-12;
  },
  bugs: (p) => {
    const [k, , , , , m, n] = p;
    const { A, B } = ratPts(p);
    const red = (a: number, b: number) => (a > 0 && b > 0 ? `${a / gcd(a, b)}:${b / gcd(a, b)}` : null);
    return [
      bug("reversed", "procedural", DIST, "The ratio was given the wrong way round; it is measured from A: AP : PB.", `${n}:${m}`),
      k === 0
        ? bug("part-to-whole", "conceptual", DIST, "AP : AB was given; the ratio of division compares the two parts, AP : PB.", red(m, m + n))
        : bug("wrong-coordinate", "conceptual", DIST, `The ${k === 1 ? "x" : "y"}-coordinates were used; on the ${k === 1 ? "x" : "y"}-axis it is the ${k === 1 ? "y" : "x"}-coordinate that is 0, so the ${k === 1 ? "y" : "x"}-coordinates decide the ratio.`, red(Math.abs(A[k === 1 ? 0 : 1]), Math.abs(B[k === 1 ? 0 : 1]))),
    ];
  },
  distractors: ([, , , , , m, n]) => [`${m}:${m + n}`, `${m + n}:${n}`, `${m + 1}:${n}`],
  domain: [[0, 2], [-8, 8], [-8, 8], [-3, 3], [-3, 3], [1, 5], [1, 5]],
  keep: (p) => {
    const [k, x1, y1, ux, uy, m, n] = p;
    const { B } = ratPts(p);
    if ((ux === 0 && uy === 0) || gcd(m, n) !== 1 || Math.abs(B[0]) > 15 || Math.abs(B[1]) > 15) return false;
    if (k === 0) return true;
    if (k === 1) return uy !== 0 && y1 + m * uy === 0 && y1 !== 0;
    return ux !== 0 && x1 + m * ux === 0 && x1 !== 0;
  },
  why: "Whole-number points dividing a segment in a simplest ratio up to 5 : 5, given or on an axis.",
  cap: 400,
  difficulty: ([k, , , , , m, n]) => (k === 0 && m === 1 ? 1 : k === 0 ? 2 : m + n >= 6 ? 3 : 2),
  teach: {
    idea: "If P divides AB in the ratio λ : 1, each coordinate of P is (λx₂ + x₁)/(λ + 1). A point on the x-axis has y = 0, which gives one equation for λ.",
    method: "Write the ratio as λ : 1, put the known coordinate of P (or 0 for an axis) into the section formula, solve for λ, and write λ : 1 as a ratio of whole numbers.",
    alternatives: [
      { id: "distances", title: "Compare the heights", kind: "conceptual", text: ["For the x-axis, A and B are on opposite sides at heights |y₁| and |y₂|.", "Similar triangles give the ratio |y₁| : |y₂|."] },
      { id: "steps", title: "Count equal steps", kind: "procedural", text: ["For a given point P, find how far it is from A and from B along the x direction.", "Those two distances are in the ratio m : n."] },
    ],
  },
  limits: "Internal division only, whole-number coordinates; unknown vertices of a parallelogram are in the distance-intro family alpar.",
});

/** [k, gx, gy, x1, y1, x2, y2]: A, B and C = 3G − A − B; k = 0 find G, 1 find C. */
const cenPts = ([, gx, gy, x1, y1, x2, y2]: number[]) => ({ G: [gx, gy], A: [x1, y1], B: [x2, y2], C: [3 * gx - x1 - x2, 3 * gy - y1 - y2] });
const aucen = F({
  id: "aucen",
  arity: 7,
  title: "The centroid of a triangle, and a missing vertex from the centroid",
  competency: DIST,
  type: "tuple",
  mc: true,
  prompt: (p) => {
    const { G, A, B, C } = cenPts(p);
    return p[0] === 0
      ? `Find the centroid of the triangle with vertices A${P2(A[0], A[1])}, B${P2(B[0], B[1])} and C${P2(C[0], C[1])}. Give it as (x, y).`
      : `The centroid of triangle ABC is G${P2(G[0], G[1])}. A is ${P2(A[0], A[1])} and B is ${P2(B[0], B[1])}. Find the vertex C. Give it as (x, y).`;
  },
  solve: (p) => {
    const { G, A, B, C } = cenPts(p);
    return p[0] === 0
      ? { steps: [st("add", "add", INT, `Add the coordinates: (${A[0] + B[0] + C[0]}, ${A[1] + B[1] + C[1]})`, P2(A[0] + B[0] + C[0], A[1] + B[1] + C[1])), st("divide", "divide", DIST, `Divide by 3: G = ${P2(G[0], G[1])}`, P2(G[0], G[1]))], answer: P2(G[0], G[1]) }
      : { steps: [st("times3", "multiply", DIST, `x₁ + x₂ + x₃ = 3 × ${pn(G[0])} = ${3 * G[0]} and y₁ + y₂ + y₃ = ${3 * G[1]}`, P2(3 * G[0], 3 * G[1])), st("subtract", "subtract", INT, `C = ${P2(3 * G[0] - A[0] - B[0], 3 * G[1] - A[1] - B[1])}`, P2(C[0], C[1]))], answer: P2(C[0], C[1]) };
  },
  // independent: the centroid is two-thirds of the way from a vertex to the midpoint of the opposite side (medians)
  validate: (p, v) => {
    const t = tupleNums(v, 2);
    if (!t) return false;
    const { G, A, B, C } = cenPts(p);
    const viaMedian = (P: number[], Q: number[], R: number[]) => [0, 1].map((i) => P[i] + (2 / 3) * ((Q[i] + R[i]) / 2 - P[i]));
    if (p[0] === 0) {
      const g = viaMedian(A, B, C);
      return near(g[0], t[0], 1e-9) && near(g[1], t[1], 1e-9);
    }
    const g = viaMedian(t, A, B);
    return near(g[0], G[0], 1e-9) && near(g[1], G[1], 1e-9);
  },
  bugs: (p) => {
    const { G, A, B, C } = cenPts(p);
    return p[0] === 0
      ? [bug("not-divided", "recall", DIST, "The coordinates were added but not divided by 3; the centroid is the average of the three vertices.", P2(A[0] + B[0] + C[0], A[1] + B[1] + C[1])), bug("halved", "recall", DIST, "The sum was divided by 2, as for a midpoint; three vertices are averaged by dividing by 3.", P2((A[0] + B[0] + C[0]) / 2, (A[1] + B[1] + C[1]) / 2))]
      : [bug("no-times-3", "procedural", DIST, "The coordinates of G were used without multiplying by 3; G is the average, so the three vertices add to 3 times G.", P2(G[0] - A[0] - B[0], G[1] - A[1] - B[1])), bug("averaged-g", "conceptual", DIST, "G was treated as a vertex and the centroid of A, B and G was found; C is the unknown vertex.", P2((A[0] + B[0] + G[0]) / 3, (A[1] + B[1] + G[1]) / 3))];
  },
  distractors: (p) => {
    const { G, C } = cenPts(p);
    const T = p[0] === 0 ? G : C;
    return [P2(T[0] + 1, T[1]), P2(T[1], T[0]), P2(-T[0], T[1])];
  },
  domain: [[0, 1], [-4, 4], [-4, 4], [-6, 6], [-6, 6], [-6, 6], [-6, 6]],
  keep: (p) => {
    const { A, B, C } = cenPts(p);
    const area2 = (B[0] - A[0]) * (C[1] - A[1]) - (B[1] - A[1]) * (C[0] - A[0]);
    return area2 !== 0 && Math.abs(C[0]) <= 9 && Math.abs(C[1]) <= 9;
  },
  why: "Whole-number vertices up to 9 with a whole-number centroid; the triangle is not degenerate.",
  cap: 400,
  difficulty: (p) => (p[0] === 0 ? (p.slice(1).every((x) => x >= 0) ? 1 : 2) : 3),
  teach: {
    idea: "The centroid, where the three medians meet, is the average of the three vertices: G = ((x₁ + x₂ + x₃)/3, (y₁ + y₂ + y₃)/3). It lies two-thirds of the way along each median from its vertex.",
    method: "To find G, add the x-coordinates and divide by 3, and the same for y. To find a missing vertex, multiply G by 3 and subtract the two known vertices.",
    alternatives: [
      { id: "median", title: "Along a median", kind: "conceptual", text: ["Find the midpoint M of BC.", "G divides AM in the ratio 2 : 1: use the section formula."] },
      { id: "balance", title: "The balance point", kind: "conceptual", text: ["A cardboard triangle balances on a pin at its centroid.", "Each vertex has the same weight, so the balance point is their average."] },
    ],
  },
  limits: "Whole-number centroids; the centroid in space is in another family.",
});

// ================================================================ points in space: classifying, centroid, external division

type V3 = [number, number, number];
const sub3 = (a: number[], b: number[]): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add3 = (a: number[], b: number[]): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const dot3 = (a: number[], b: number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross3 = (a: number[], b: number[]): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const E3: V3[] = [[1, 0, 0], [0, 1, 0], [0, 0, 1], [1, 1, 0], [1, 0, 1], [0, 1, 1], [1, 1, 1], [1, -1, 0]];
const W3: V3[] = [[1, 2, 0], [2, -1, 1], [0, 1, 3], [3, 1, -1], [-1, 2, 2], [2, 2, 1], [1, -3, 2], [-2, 1, 3]];
/** [type, A(3), u(3), j]: B = A + u, C = A + v, v built by type (0 a multiple of u, 1 perpendicular, 2 same length, 3 other). */
function cl3Pts(p: number[]) {
  const [t, a1, a2, a3, u1, u2, u3, j] = p;
  const u: V3 = [u1, u2, u3];
  const perm: V3[] = [[u2, u1, u3], [u3, u2, u1], [u1, u3, u2], [-u1, u2, u3], [u1, -u2, u3], [u1, u2, -u3], [u2, u3, u1], [u3, u1, u2]];
  const s = [2, 3, -1, -2][j % 4];
  const v: V3 = t === 0 ? [s * u1, s * u2, s * u3] : t === 1 ? cross3(u, E3[j]) : t === 2 ? perm[j] : W3[j];
  const A: V3 = [a1, a2, a3];
  return { A, B: add3(A, u), C: add3(A, v) };
}
const CL3 = ["The points are collinear", "They form a right-angled triangle", "They form an isosceles triangle that is not right-angled", "They form a scalene triangle that is not right-angled"];
/** The solver's classification: from the three squared distances only. */
function cl3Class(p: number[]): number {
  const { A, B, C } = cl3Pts(p);
  const d = [dot3(sub3(A, B), sub3(A, B)), dot3(sub3(B, C), sub3(B, C)), dot3(sub3(A, C), sub3(A, C))].sort((x, y) => x - y);
  if (d[0] === 0) return -1;
  if (near(Math.sqrt(d[0]) + Math.sqrt(d[1]), Math.sqrt(d[2]), 1e-12)) return 0;
  if (d[0] + d[1] === d[2]) return 1;
  if (d[0] === d[1] || d[1] === d[2]) return 2;
  return 3;
}
const cl3Opts = (p: number[]) => shuffled(CL3, `au3cl:${p}`);
const au3cl = F({
  id: "au3cl",
  arity: 8,
  title: "Collinear points and the kind of triangle in space, by the distance formula",
  competency: SPC,
  type: "choice",
  prompt: (p) => {
    const { A, B, C } = cl3Pts(p);
    return `The points A${P3(A)}, B${P3(B)} and C${P3(C)} are given in space. Use the distance formula to decide which statement is true.`;
  },
  choices: cl3Opts,
  solve: (p) => {
    const { A, B, C } = cl3Pts(p);
    const sq = (X: number[], Y: number[]) => dot3(sub3(X, Y), sub3(X, Y));
    const k = cl3Class(p);
    return {
      steps: [
        st("dist", "substitute", SPC, `AB² = ${sq(A, B)}, BC² = ${sq(B, C)}, AC² = ${sq(A, C)}`, `${sq(A, B)}, ${sq(B, C)}, ${sq(A, C)}`),
        st("decide", "classify", SPC, ["The two shorter distances add up to the longest, so the points are collinear", "The squares of the two shorter sides add up to the square of the longest (Pythagoras), so the triangle is right-angled", "Two sides are equal and Pythagoras fails, so it is isosceles and not right-angled", "No two sides are equal and Pythagoras fails, so it is scalene and not right-angled"][k], cl3Opts(p).indexOf(CL3[k])),
      ],
      answer: cl3Opts(p).indexOf(CL3[k]),
    };
  },
  // independent: vectors instead of distances — a zero cross product (collinear), a zero dot product at a vertex
  // (right angle), equal lengths (isosceles)
  validate: (p, v) => {
    const s = typeof v === "number" ? cl3Opts(p)[v] : undefined;
    if (!s) return false;
    const { A, B, C } = cl3Pts(p);
    const ab = sub3(B, A);
    const ac = sub3(C, A);
    const bc = sub3(C, B);
    const coll = cross3(ab, ac).every((x) => x === 0);
    const right = !coll && (dot3(ab, ac) === 0 || dot3(ab, bc) === 0 || dot3(ac, bc) === 0);
    const L = [dot3(ab, ab), dot3(ac, ac), dot3(bc, bc)];
    const iso = !coll && (L[0] === L[1] || L[0] === L[2] || L[1] === L[2]);
    if (s === CL3[0]) return coll;
    if (s === CL3[1]) return right;
    if (s === CL3[2]) return iso && !right;
    return !coll && !right && !iso;
  },
  bugs: (p) => {
    const o = cl3Opts(p);
    const t = p[0];
    return t === 0
      ? [bug("collinear-missed", "conceptual", SPC, "The three distances were found but not compared: when the two shorter distances add up to the longest, the three points lie on one line and there is no triangle.", o.indexOf(CL3[3]))]
      : t === 1
        ? [bug("pythagoras-not-tested", "procedural", SPC, "The triangle was named from its sides alone; test whether the two smaller squares add up to the largest square — then it is right-angled.", o.indexOf(CL3[3]))]
        : t === 2
          ? [bug("equal-sides-missed", "procedural", SPC, "Two of the distances are equal, which makes the triangle isosceles; compare the squared distances before taking square roots.", o.indexOf(CL3[3]))]
          : [bug("pythagoras-misread", "procedural", SPC, "The squared distances were compared wrongly; Pythagoras needs the two smaller squares to add up exactly to the largest.", o.indexOf(CL3[1]))];
  },
  domain: [[0, 3], [-1, 2], [-1, 2], [-1, 2], [-2, 2], [-2, 2], [-2, 2], [0, 7]],
  keep: (p) => {
    const [t, , , , u1, u2, u3, j] = p;
    if (u1 === 0 && u2 === 0 && u3 === 0) return false;
    if (t === 0 && j >= 4) return false;
    if ((u1 * 7 + u2 * 3 + u3 * 5 + p[1] + j) % 3 !== 0 && t !== 0) return false;
    const { A, B, C } = cl3Pts(p);
    const ab = sub3(B, A);
    const ac = sub3(C, A);
    const bc = sub3(C, B);
    if (dot3(ac, ac) === 0 || dot3(bc, bc) === 0) return false;
    const k = cl3Class(p);
    const L = [dot3(ab, ab), dot3(ac, ac), dot3(bc, bc)];
    const iso = L[0] === L[1] || L[0] === L[2] || L[1] === L[2];
    return k === t && !(k === 1 && iso) && [...A, ...B, ...C].every((x) => Math.abs(x) <= 9);
  },
  why: "Small whole-number points in space built to be collinear, right-angled (not isosceles), isosceles (not right-angled) or scalene.",
  cap: 300,
  difficulty: ([t]) => (t === 0 ? 2 : t === 1 ? 2 : 3),
  teach: {
    idea: "The distance formula in space, √((x₂ − x₁)² + (y₂ − y₁)² + (z₂ − z₁)²), gives the three side lengths. Their sizes decide the figure: collinear when two add to the third, right-angled when Pythagoras holds, isosceles when two are equal.",
    method: "Work out AB², BC² and AC². Test, in order: do the two shorter lengths add up to the longest (collinear)? Do the two smaller squares add up to the largest (right-angled)? Are two equal (isosceles)?",
    alternatives: [
      { id: "vectors", title: "With direction vectors", kind: "procedural", text: ["B − A and C − A are multiples of each other exactly when the points are collinear.", "A zero dot product of two sides at a vertex means a right angle there."] },
      { id: "squares_first", title: "Compare squares, not roots", kind: "conceptual", text: ["Keep the squared distances as whole numbers.", "Equal squares mean equal sides; take square roots only to test collinearity."] },
    ],
  },
  limits: "Points with small whole-number coordinates; triangles that are both right-angled and isosceles are left out so that exactly one statement is true.",
});

/** [gx, gy, gz, A(3), B(3)]: C = 3G − A − B. */
const ce3Pts = (p: number[]) => {
  const G = p.slice(0, 3);
  const A = p.slice(3, 6);
  const B = p.slice(6, 9);
  return { G, A, B, C: [0, 1, 2].map((i) => 3 * G[i] - A[i] - B[i]) };
};
const au3ce = F({
  id: "au3ce",
  arity: 9,
  title: "The centroid of a triangle in space",
  competency: SPC,
  type: "tuple",
  mc: true,
  prompt: (p) => {
    const { A, B, C } = ce3Pts(p);
    return `Find the centroid of the triangle with vertices A${P3(A)}, B${P3(B)} and C${P3(C)}. Give it as (x, y, z).`;
  },
  solve: (p) => {
    const { G, A, B, C } = ce3Pts(p);
    const S = [0, 1, 2].map((i) => A[i] + B[i] + C[i]);
    return { steps: [st("add", "add", INT, `Add the coordinates: ${P3(S)}`, P3(S)), st("divide", "divide", SPC, `Divide each by 3: ${P3(G)}`, P3(G))], answer: P3(G) };
  },
  // independent: two-thirds of the way from A to the midpoint of BC
  validate: (p, v) => {
    const t = tupleNums(v, 3);
    if (!t) return false;
    const { A, B, C } = ce3Pts(p);
    return [0, 1, 2].every((i) => near(t[i], A[i] + (2 / 3) * ((B[i] + C[i]) / 2 - A[i]), 1e-9));
  },
  bugs: (p) => {
    const { A, B, C } = ce3Pts(p);
    const S = [0, 1, 2].map((i) => A[i] + B[i] + C[i]);
    return [bug("not-divided", "recall", SPC, "The coordinates were added but not divided by 3.", P3(S)), bug("halved", "recall", SPC, "The sum was divided by 2, as for a midpoint; the centroid averages three vertices.", P3(S.map((x) => x / 2)))];
  },
  distractors: (p) => {
    const { G, A, B } = ce3Pts(p);
    return [P3([0, 1, 2].map((i) => (A[i] + B[i]) / 2)), P3([G[1], G[0], G[2]])];
  },
  domain: [[-3, 3], [-3, 3], [-3, 3], [-5, 5], [-5, 5], [-5, 5], [-5, 5], [-5, 5], [-5, 5]],
  keep: (p) => {
    const { A, B, C } = ce3Pts(p);
    return C.every((x) => Math.abs(x) <= 9) && !cross3(sub3(B, A), sub3(C, A)).every((x) => x === 0);
  },
  why: "Whole-number vertices in space up to 9 with a whole-number centroid; the triangle is not degenerate.",
  cap: 400,
  difficulty: (p) => (p.every((x) => x >= 0) ? 1 : 2),
  teach: {
    idea: "As in the plane, the centroid of a triangle in space is the average of its vertices: G = ((x₁ + x₂ + x₃)/3, (y₁ + y₂ + y₃)/3, (z₁ + z₂ + z₃)/3).",
    method: "Add the three x-coordinates and divide by 3; do the same for y and for z.",
    alternatives: [{ id: "median", title: "Along a median", kind: "conceptual", text: ["Find the midpoint M of BC.", "The centroid divides AM in the ratio 2 : 1 (section formula in space)."] }],
  },
  limits: "Whole-number centroids; the centroid of a tetrahedron is not included.",
});

/** [A(3), u(3), m, n]: B = A + (m − n)u; P = A + mu divides AB externally in m : n. */
const ex3Pts = (p: number[]) => {
  const A = p.slice(0, 3);
  const u = p.slice(3, 6);
  const [m, n] = [p[6], p[7]];
  return { A, B: A.map((x, i) => x + (m - n) * u[i]), P: A.map((x, i) => x + m * u[i]), m, n };
};
const au3ex = F({
  id: "au3ex",
  arity: 8,
  title: "The point dividing a segment in space externally",
  competency: SPC,
  type: "tuple",
  mc: true,
  prompt: (p) => {
    const { A, B, m, n } = ex3Pts(p);
    return `Find the point that divides the segment joining A${P3(A)} and B${P3(B)} externally in the ratio ${m} : ${n}. Give it as (x, y, z).`;
  },
  solve: (p) => {
    const { A, B, P, m, n } = ex3Pts(p);
    return { steps: [st("formula", "substitute", SPC, `P = (mB − nA)/(m − n) with m = ${m}, n = ${n}: each coordinate is (${m} × B − ${n} × A)/${m - n}`, `(mB − nA)/(m − n)`), st("value", "simplify", SPC, `P = ${P3(P)}`, P3(P))], answer: P3(P) };
  },
  // independent: P is on line AB, outside the segment, and n·PA = m·PB
  validate: (p, v) => {
    const t = tupleNums(v, 3);
    if (!t) return false;
    const { A, B, m, n } = ex3Pts(p);
    const pa = sub3(A, t);
    const pb = sub3(B, t);
    const coll = cross3(pa, pb).every((x) => Math.abs(x) < 1e-9);
    return coll && dot3(pa, pb) > 0 && Math.abs(n * n * dot3(pa, pa) - m * m * dot3(pb, pb)) < 1e-9;
  },
  bugs: (p) => {
    const { A, B, m, n } = ex3Pts(p);
    return [
      bug("internal-used", "conceptual", SPC, "The internal formula (mB + nA)/(m + n) was used; external division subtracts: (mB − nA)/(m − n).", tup([0, 1, 2].map((i) => rat(m * B[i] + n * A[i], m + n)))),
      bug("weights-swapped", "procedural", SPC, `The weights were swapped: B is multiplied by ${m} and A by ${n}.`, tup([0, 1, 2].map((i) => rat(n * B[i] - m * A[i], n - m)))),
    ];
  },
  distractors: (p) => {
    const { A, B, P } = ex3Pts(p);
    return [P3([0, 1, 2].map((i) => (A[i] + B[i]) / 2)), P3(P.map((x) => -x))];
  },
  domain: [[-4, 4], [-4, 4], [-4, 4], [-2, 2], [-2, 2], [-2, 2], [1, 4], [1, 4]],
  keep: (p) => {
    const [, , , u1, u2, u3, m, n] = p;
    const { B, P } = ex3Pts(p);
    return (u1 !== 0 || u2 !== 0 || u3 !== 0) && m !== n && gcd(m, n) === 1 && [...B, ...P].every((x) => Math.abs(x) <= 12);
  },
  why: "Whole-number points in space, ratios up to 4 : 3 in simplest form (m ≠ n), with a whole-number dividing point.",
  cap: 400,
  difficulty: ([, , , , , , m, n]) => (Math.abs(m - n) === 1 ? 2 : 3),
  teach: {
    idea: "P divides AB externally in m : n when P is on line AB but outside the segment, with PA : PB = m : n. Replacing n by −n in the section formula gives P = (mB − nA)/(m − n).",
    method: "For each coordinate work out (m × B − n × A) and divide by m − n.",
    alternatives: [{ id: "vector_steps", title: "Steps along the line", kind: "conceptual", text: ["P is m/(m − n) of the vector AB away from A.", "Find B − A, multiply by m/(m − n), add to A."] }],
  },
  limits: "External division with whole-number answers; the plane case is not included.",
});

// ================================================================ limits

const tabF = ([, a, p, n]: number[]) => (x: number) => (p * (x ** n - a ** n)) / (x - a);
const TAB_X = [-0.1, -0.01, -0.001, 0.001, 0.01, 0.1];
const r4 = (x: number) => (Math.round(x * 10000) / 10000).toFixed(4).replace(/-/g, "−");
/** [k, a, p, q, r, s]: k = 0 a table of p(xⁿ − aⁿ)/(x − a) with n = q; k = 1 left-hand, 2 right-hand limit of a piecewise line. */
const tabPiece = ([, a, p, q, r, s]: number[]) => (x: number) => (x < a ? p * x + q : r * x + s);
const aultab = F({
  id: "aultab",
  arity: 6,
  title: "Estimating a limit from a table, and one-sided limits",
  competency: LIM,
  type: "integer",
  mc: true,
  prompt: (p) => {
    const [k, a, pp, q, r, s] = p;
    if (k === 0) return `A function f is not defined at x = ${a}. The table in the picture shows some of its values near x = ${a}. Estimate lim (x → ${a}) f(x).`;
    return `f(x) = ${sum([[pp, "x"], [q, ""]])} for x < ${a}, and f(x) = ${sum([[r, "x"], [s, ""]])} for x ≥ ${a}. Find the ${k === 1 ? "left-hand limit lim (x → " + nf(a) + "⁻)" : "right-hand limit lim (x → " + nf(a) + "⁺)"} f(x).`;
  },
  figure: (p) => {
    if (p[0] !== 0) return null;
    const [, a, pp, n] = p;
    const f = tabF([0, a, pp, n]);
    return { type: "table", head: ["x", ...TAB_X.map((h) => r4(a + h).replace(/0+$/, "").replace(/\.$/, ""))], rows: [["f(x)", ...TAB_X.map((h) => r4(f(a + h)))]] } as Visual;
  },
  solve: (p) => {
    const [k, a, pp, q, r, s] = p;
    if (k === 0) {
      const L = pp * q * a ** (q - 1);
      return { steps: [st("read", "estimate", LIM, `From both sides the values get closer and closer to ${L}`, L)], answer: L };
    }
    const v = k === 1 ? pp * a + q : r * a + s;
    return { steps: [st("piece", "choose", LIM, `${k === 1 ? "Left of" : "At and right of"} x = ${a} the rule is ${k === 1 ? sum([[pp, "x"], [q, ""]]) : sum([[r, "x"], [s, ""]])}`, k), st("value", "substitute", LIM, `As x approaches ${a} from that side, f(x) approaches ${v}`, v)], answer: v };
  },
  // independent: evaluate the function a millionth away from the point (both sides for the table)
  validate: (p, v) => {
    if (typeof v !== "number") return false;
    const [k, a, pp, q] = p;
    if (k === 0) {
      const f = tabF([0, a, pp, q]);
      return Math.abs((f(a - 1e-6) + f(a + 1e-6)) / 2 - v) < 1e-4;
    }
    const f = tabPiece(p);
    return Math.abs(f(k === 1 ? a - 1e-9 : a + 1e-9) - v) < 1e-6;
  },
  bugs: (p) => {
    const [k, a, pp, q, r, s] = p;
    if (k === 0) return [bug("undefined-means-zero", "conceptual", LIM, `Because f is not defined at x = ${a}, the limit was taken as 0; a limit is about the values near ${a}, which the table shows.`, 0), bug("far-value", "procedural", LIM, `The value farthest from ${a} in the table was rounded; the limit is what the values approach as x gets closest to ${a}.`, Math.round(tabF([0, a, pp, q])(a + 0.1)))];
    return [bug("other-side", "conceptual", LIM, `The rule for the other side of ${a} was used; the ${k === 1 ? "left-hand limit uses the values for x < " : "right-hand limit uses the values for x > "}${a}.`, k === 1 ? r * a + s : pp * a + q)];
  },
  domain: [[0, 2], [-3, 5], [1, 5], [-6, 6], [-5, 5], [-6, 6]],
  keep: ([k, a, p, q, r, s]) => (k === 0 ? a >= 1 && a <= 4 && p <= 3 && q >= 2 && q <= 4 && r === 0 && s === 0 : p * a + q !== r * a + s && a !== 0 && (r !== p || s !== q)),
  why: "Tables of p(xⁿ − aⁿ)/(x − a) near a (n up to 4), or piecewise straight lines with a jump at a.",
  cap: 400,
  difficulty: ([k]) => (k === 0 ? 2 : 1),
  teach: {
    idea: "lim (x → a) f(x) is the value f(x) gets as close as we like to when x is close to a (on both sides), whatever happens at a itself. The left-hand limit uses only x < a, the right-hand limit only x > a; the limit exists when they are equal.",
    method: "From a table, look at the values for x nearest to a from each side and see what they settle on. For a piecewise rule, use the piece for that side and substitute x = a in it.",
    alternatives: [
      { id: "graph", title: "Trace the graph", kind: "conceptual", text: ["Move along the graph towards x = a from the left, then from the right.", "The heights you approach are the left-hand and right-hand limits."] },
      { id: "closer_values", title: "Make x closer", kind: "procedural", text: ["Try x = a − 0.001 and x = a + 0.001 in the rule.", "The two values tell you what f(x) approaches from each side."] },
    ],
  },
  limits: "Tables of a polynomial quotient and piecewise straight lines; infinite one-sided limits are not included.",
});

const xpow = (n: number, a: number) => (n === 1 ? `(x ${signed(-a)})` : `(x${sup(n)} ${signed(-(a ** n))})`);
/** [k, n, m, a, b]: k = 0 (xⁿ − aⁿ)/(xᵐ − aᵐ); k = 1 (x − a)(x + b)/(x² − a²), as x → a. */
const lpVal = ([k, n, m, a, b]: number[]) => (k === 0 ? (n / m) * a ** (n - m) : (a + b) / (2 * a));
const lpF = ([k, n, m, a, b]: number[]) => (x: number) => (k === 0 ? (x ** n - a ** n) / (x ** m - a ** m) : (x * x + (b - a) * x - a * b) / (x * x - a * a));
const aulpow = F({
  id: "aulpow",
  arity: 5,
  title: "Limits of rational functions: (xⁿ − aⁿ)/(xᵐ − aᵐ) and factorising",
  competency: LIM,
  type: "fraction",
  mc: true,
  prompt: (p) => {
    const [k, n, m, a, b] = p;
    return k === 0 ? `Evaluate lim (x → ${nf(a)}) of ${xpow(n, a)}/${xpow(m, a)}.` : `Evaluate lim (x → ${nf(a)}) of (${sum([[1, "x²"], [b - a, "x"], [-a * b, ""]])})/(x² ${signed(-a * a)}).`;
  },
  solve: (p) => {
    const [k, n, m, a, b] = p;
    const v = lpVal(p);
    if (k === 0) return { steps: [st("standard", "recall", LIM, `Divide top and bottom by x − a and use lim (xⁿ − aⁿ)/(x − a) = naⁿ⁻¹: the limit is (${n} × ${pn(a)}${sup(n - 1)})/(${m} × ${pn(a)}${sup(m - 1)})`, `${n}a^${n - 1}/(${m}a^${m - 1})`), st("value", "simplify", LIM, `= ${nf(v)}`, v)], answer: v };
    return { steps: [st("factor", "factorise", FAC, `Top = (x ${signed(-a)})(x ${signed(b)}), bottom = (x ${signed(-a)})(x ${signed(a)}); cancel x ${signed(-a)}`, `(x ${signed(b)})/(x ${signed(a)})`), st("value", "substitute", LIM, `Put x = ${nf(a)}: ${nf(a + b)}/${nf(2 * a)} = ${nf(v)}`, v)], answer: v };
  },
  // independent: the function's values a millionth either side of a
  validate: (p, v) => {
    if (typeof v !== "number") return false;
    const f = lpF(p);
    const a = p[3];
    const est = (f(a - 1e-6) + f(a + 1e-6)) / 2;
    return Math.abs(est - v) < 1e-5 * Math.max(1, Math.abs(v));
  },
  bugs: (p) => {
    const [k, n, m, a] = p;
    return k === 0
      ? [
          bug("top-only", "procedural", LIM, `Only the top was treated with the standard limit; the bottom ${xpow(m, a)} also tends to 0 and gives its own factor ${m}a${sup(m - 1)}.`, m > 1 ? n * a ** (n - 1) : null),
          bug("powers-dropped", "procedural", LIM, "Only the powers n and m were kept; the standard limit is naⁿ⁻¹, so the powers of a count too.", n / m),
        ]
      : [bug("leading-terms", "conceptual", LIM, "The leading coefficients were divided, as for a limit at infinity; here x tends to a number, so factorise and cancel the common factor first.", 1), bug("zero-over-zero", "conceptual", LIM, "Direct substitution gives 0/0, which was taken as 0; 0/0 is not a value — it says a common factor must be cancelled.", 0)];
  },
  domain: [[0, 1], [1, 7], [1, 5], [-5, 5], [-6, 6]],
  keep: ([k, n, m, a, b]) => a !== 0 && (k === 0 ? n >= 2 && n !== m && Math.abs(a) <= 4 && Math.abs(a) ** n <= 2500 && b === 0 : n === 1 && m === 1 && b !== a && b !== -a),
  why: "(xⁿ − aⁿ)/(xᵐ − aᵐ) with n up to 7, or a quadratic over x² − a² with a common factor.",
  cap: 400,
  difficulty: ([k, n, m]) => (k === 1 ? 1 : m === 1 && n <= 3 ? 2 : 3),
  teach: {
    idea: "When substitution gives 0/0, the top and the bottom share the factor x − a. Cancelling it (or using lim (xⁿ − aⁿ)/(x − a) = naⁿ⁻¹ for each part) leaves a function that can be evaluated at a.",
    method: "Factorise and cancel x − a, then substitute x = a. For (xⁿ − aⁿ)/(xᵐ − aᵐ), divide top and bottom by x − a: the limit is naⁿ⁻¹/(maᵐ⁻¹) = (n/m)aⁿ⁻ᵐ.",
    alternatives: [
      { id: "table", title: "Check with nearby values", kind: "conceptual", text: ["Evaluate the function at x = a ± 0.001.", "Both values should be very close to your answer."] },
      { id: "long_division", title: "Divide out the factor", kind: "procedural", text: ["xⁿ − aⁿ = (x − a)(xⁿ⁻¹ + axⁿ⁻² + … + aⁿ⁻¹).", "At x = a the second bracket has n terms each equal to aⁿ⁻¹."] },
    ],
  },
  limits: "Polynomial quotients with a removable 0/0 at x = a; limits at infinity are in another family.",
});

const auspd = F({
  id: "auspd",
  arity: 3,
  title: "lim (t → a) of c(tⁿ − aⁿ)/(t − a): the limit of an average rate",
  competency: LIM,
  type: "integer",
  mc: true,
  // [c, n, a]
  prompt: ([c, n, a]) => `Evaluate lim (t → ${a}) of ${c === 1 ? "" : c}(t${sup(n)} − ${a ** n})/(t − ${a}).`,
  solve: ([c, n, a]) => ({ steps: [st("standard", "recall", LIM, `lim (tⁿ − aⁿ)/(t − a) = naⁿ⁻¹ = ${n} × ${a}${sup(n - 1)} = ${n * a ** (n - 1)}`, n * a ** (n - 1)), st("times", "multiply", LIM, `Multiply by ${c}: ${c * n * a ** (n - 1)}`, c * n * a ** (n - 1))], answer: c * n * a ** (n - 1) }),
  // independent: the average rate over shrinking intervals [a, a + h]
  validate: ([c, n, a], v) => typeof v === "number" && Math.abs((c * ((a + 1e-6) ** n - a ** n)) / 1e-6 - v) < 1e-3,
  bugs: ([c, n, a]) => [
    bug("power-not-lowered", "recall", LIM, `The power of a was not lowered: the standard limit is naⁿ⁻¹, not naⁿ.`, c * n * a ** n),
    bug("no-n", "recall", LIM, `The factor n = ${n} was left out: lim (tⁿ − aⁿ)/(t − a) = naⁿ⁻¹.`, c * a ** (n - 1)),
    bug("c-dropped", "procedural", LIM, `The constant ${c} in front was dropped; a constant factor stays in the limit.`, c !== 1 ? n * a ** (n - 1) : null),
  ],
  domain: [[1, 6], [2, 4], [1, 6]],
  keep: ([c, n, a]) => c * n * a ** (n - 1) <= 900,
  why: "c from 1 to 6, powers 2 to 4 and a from 1 to 6.",
  difficulty: ([, n, a]) => (n === 2 ? 1 : a <= 3 ? 2 : 3),
  word: ([c, n, a]) => `A toy car rolls down a slope so that it has travelled s = ${c === 1 ? "" : c}t${sup(n)} cm after t seconds. Its average speed between time ${a} s and time t is (s(t) − s(${a}))/(t − ${a}). What value, in cm/s, does this average speed approach as t gets closer and closer to ${a}?`,
  teach: {
    idea: "(tⁿ − aⁿ)/(t − a) is an average rate of change of tⁿ between a and t; as t → a it approaches the instantaneous rate naⁿ⁻¹.",
    method: "Use lim (t → a) (tⁿ − aⁿ)/(t − a) = naⁿ⁻¹ and multiply by the constant in front.",
    alternatives: [{ id: "factor", title: "Factorise", kind: "procedural", text: ["t³ − a³ = (t − a)(t² + at + a²): cancel t − a.", "Put t = a: a² + a² + a² = 3a²."] }],
  },
  limits: "Whole-number a up to 6 and powers up to 4.",
});

const lsF = ([k, a, b]: number[]) => (x: number) => (k === 0 ? Math.sin(a * x) / (b * x) : k === 1 ? Math.tan(a * x) / Math.sin(b * x) : k === 2 ? (Math.exp(a * x) - 1) / (b * x) : k === 3 ? Math.log(1 + a * x) / (b * x) : (1 - Math.cos(a * x)) / (b * x * x));
const ax_ = (a: number) => (a === 1 ? "x" : `${a}x`);
const aulstd = F({
  id: "aulstd",
  arity: 3,
  title: "Limits from the standard limits of sin x/x, (eˣ − 1)/x and log(1 + x)/x",
  competency: LIM,
  type: "fraction",
  mc: true,
  // [k, a, b]: k = 0 sin(ax)/(bx), 1 tan(ax)/sin(bx), 2 (e^(ax) − 1)/(bx), 3 log(1 + ax)/(bx), 4 (1 − cos ax)/(bx²)
  prompt: ([k, a, b]) => {
    const f = k === 0 ? `sin ${ax_(a)}/${ax_(b)}` : k === 1 ? `tan ${ax_(a)}/sin ${ax_(b)}` : k === 2 ? `(e^(${ax_(a)}) − 1)/${ax_(b)}` : k === 3 ? `log(1 + ${ax_(a)})/${ax_(b)}` : `(1 − cos ${ax_(a)})/${b === 1 ? "x²" : `(${b}x²)`}`;
    return `Evaluate lim (x → 0) of ${f}.${k === 3 ? " (log is the natural logarithm.)" : ""}`;
  },
  solve: ([k, a, b]) => {
    const v = k === 4 ? (a * a) / (2 * b) : a / b;
    const std = ["sin θ/θ → 1", "tan θ/θ → 1 and sin θ/θ → 1", "(e^θ − 1)/θ → 1", "log(1 + θ)/θ → 1", "1 − cos θ = 2 sin²(θ/2) and sin θ/θ → 1"][k];
    return { steps: [st("rewrite", "rewrite", LIM, k === 4 ? `(1 − cos ${ax_(a)})/(${b}x²) = (2/${b}) × (sin(${a}x/2)/x)²` : `Multiply and divide by ${a}x so that the standard limit appears: × ${a}/${b}`, std), st("value", "evaluate", LIM, `Using ${std}, the limit is ${nf(v)}`, v)], answer: v };
  },
  // independent: evaluate the function close to 0 on both sides
  validate: (p, v) => {
    if (typeof v !== "number") return false;
    const f = lsF(p);
    const est = (f(1e-4) + f(-1e-4)) / 2;
    return Math.abs(est - v) < 1e-5 * Math.max(1, Math.abs(v));
  },
  bugs: ([k, a, b]) =>
    k === 4
      ? [bug("no-square", "recall", LIM, `1 − cos ${ax_(a)} behaves like (${a}x)²/2 near 0, so a² appears, not a.`, a / (2 * b)), bug("no-half", "recall", LIM, `1 − cos θ behaves like θ²/2 for small θ; the 1/2 was left out.`, (a * a) / b)]
      : [bug("upside-down", "procedural", LIM, `The fraction was turned over: the ${a} inside the function goes on top.`, b / a), bug("always-one", "conceptual", LIM, `The standard limit was used as if it were 1 here; it is 1 only when the angle (or exponent) matches the denominator exactly, so first make ${ax_(a)} appear below.`, 1)],
  domain: [[0, 4], [1, 9], [1, 9]],
  keep: ([, a, b]) => a !== b,
  why: "The five standard forms with whole-number multipliers from 1 to 9 (different).",
  cap: 360,
  difficulty: ([k]) => (k === 0 ? 1 : k === 4 ? 3 : 2),
  teach: {
    idea: "Near 0, sin θ, tan θ, e^θ − 1 and log(1 + θ) all behave like θ itself, so each of them divided by θ tends to 1; 1 − cos θ behaves like θ²/2.",
    method: "Make the standard form appear: sin ax/(bx) = (sin ax/(ax)) × (a/b), so the limit is a/b. Do the same for tan, eᵃˣ − 1 and log(1 + ax). For 1 − cos ax, use 2 sin²(ax/2).",
    alternatives: [
      { id: "table", title: "Check with a small x", kind: "conceptual", text: ["Put x = 0.001 into the expression (in radians).", "The value is very close to the limit."] },
      { id: "series", title: "The first term of a series", kind: "procedural", text: ["sin ax ≈ ax, e^(ax) − 1 ≈ ax, log(1 + ax) ≈ ax and 1 − cos ax ≈ a²x²/2 for small x.", "Replace and cancel the powers of x."] },
    ],
  },
  limits: "One standard limit at x → 0 with whole-number multipliers; l'Hôpital's rule and products of several forms are elsewhere.",
});

/** [k, p, q, r, s, t]: k = 0 (√(px + q²) − q)/x as x → 0; 1 (px² + qx + r)/(sx² + t), 2 (px + q)/(sx² + t), x → ∞. */
const liF = ([k, p, q, r, s, t]: number[]) => (x: number) => (k === 0 ? (Math.sqrt(p * x + q * q) - q) / x : k === 1 ? (p * x * x + q * x + r) / (s * x * x + t) : (p * x + q) / (s * x * x + t));
const auliinf = F({
  id: "auliinf",
  arity: 6,
  title: "Limits by rationalising, and limits at infinity of rational functions",
  competency: LIM,
  type: "fraction",
  mc: true,
  prompt: ([k, p, q, r, s, t]) =>
    k === 0
      ? `Evaluate lim (x → 0) of (√(${p === 1 ? "" : p}x + ${q * q}) − ${q})/x.`
      : k === 1
        ? `Evaluate lim (x → ∞) of (${sum([[p, "x²"], [q, "x"], [r, ""]])})/(${sum([[s, "x²"], [t, ""]])}).`
        : `Evaluate lim (x → ∞) of (${sum([[p, "x"], [q, ""]])})/(${sum([[s, "x²"], [t, ""]])}).`,
  solve: ([k, p, q, , s]) => {
    if (k === 0) return { steps: [st("conjugate", "rationalise", "MATH.number.radicals", `Multiply top and bottom by √(${p}x + ${q * q}) + ${q}: the top becomes ${p}x`, `${p}/(√(${p}x + ${q * q}) + ${q})`), st("value", "substitute", LIM, `Cancel x and put x = 0: ${p}/(${q} + ${q}) = ${rat(p, 2 * q)}`, p / (2 * q))], answer: p / (2 * q) };
    if (k === 1) return { steps: [st("divide", "divide", LIM, "Divide top and bottom by x²: every term with 1/x or 1/x² tends to 0", "÷ x²"), st("value", "evaluate", LIM, `What is left is ${p}/${s} = ${rat(p, s)}`, p / s)], answer: p / s };
    return { steps: [st("divide", "divide", LIM, "Divide top and bottom by x², the highest power: the top tends to 0 and the bottom to a non-zero number", "÷ x²"), st("value", "evaluate", LIM, "The limit is 0", 0)], answer: 0 };
  },
  // independent: evaluate very close to 0, or at a very large x
  validate: (p, v) => {
    if (typeof v !== "number") return false;
    const f = liF(p);
    const est = p[0] === 0 ? (f(1e-7) + f(-1e-7)) / 2 : f(1e9);
    return Math.abs(est - v) < 1e-5 * Math.max(1, Math.abs(v));
  },
  bugs: ([k, p, q, r, s, t]) =>
    k === 0
      ? [bug("no-two", "procedural", LIM, `After rationalising, the bottom is x(√(${p}x + ${q * q}) + ${q}), which tends to 2 × ${q}; the 2 was left out.`, p / q)]
      : k === 1
        ? [bug("constants", "conceptual", LIM, "The constant terms were divided; as x → ∞ the highest powers matter, and the constants become negligible.", r !== 0 ? r / t : null)]
        : [bug("leading-ratio", "conceptual", LIM, `The leading coefficients ${p} and ${s} were divided; the bottom has the higher power, so it grows much faster and the fraction tends to 0.`, p / s)],
  distractors: ([k, p, q, r, s, t]) => (k === 0 ? [p / (4 * q), (2 * p) / q] : k === 1 ? [q / s, (p + q) / s] : [q / t, 1]),
  domain: [[0, 2], [1, 9], [-9, 9], [-9, 9], [1, 9], [1, 9]],
  keep: ([k, p, q, r, s, t]) => (k === 0 ? q >= 1 && q <= 6 && r === 0 && s === 1 && t === 1 : k === 1 ? p !== s && q !== 0 && r !== 0 && (p + s + t) % 2 === 0 : r === 0 && q !== 0 && (p + q + s + t) % 4 === 0),
  why: "√(px + q²) − q over x at 0, and quotients of polynomials of degree up to 2 at infinity.",
  cap: 400,
  difficulty: ([k]) => (k === 2 ? 1 : k === 1 ? 2 : 3),
  teach: {
    idea: "A 0/0 with a square root clears when you multiply by the conjugate: (√A − q)(√A + q) = A − q². At infinity, only the highest powers matter: divide top and bottom by the highest power of x in the denominator.",
    method: "Rationalise: multiply top and bottom by √(px + q²) + q, cancel x, substitute 0. At infinity: divide every term by x², let the terms with 1/x and 1/x² go to 0.",
    alternatives: [
      { id: "degrees", title: "Compare degrees", kind: "conceptual", text: ["Same degree on top and bottom: the limit is the ratio of the leading coefficients.", "Bottom degree higher: the limit is 0."] },
      { id: "numbers", title: "Try a big x", kind: "procedural", text: ["Put x = 1000 or x = 0.0001 into the expression.", "The value shows what the limit must be."] },
    ],
  },
  limits: "Finite limits only; infinite limits (such as 1/(x − a)² as x → a) are not included.",
});

export const B21: Def[] = [ausec, aurat, aucen, au3cl, au3ce, au3ex, aultab, aulpow, auspd, aulstd, auliinf];
