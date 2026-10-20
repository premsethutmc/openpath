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
    return [P2(T[0] + 1, T[1]), P2(T[1], T[0]), P2(-T[0], T[1]), P2(T[0], T[1] - 1), P2(T[0] - 1, T[1] + 1)];
  },
  domain: [[0, 1], [-4, 4], [-4, 4], [-6, 6], [-6, 6], [-6, 6], [-6, 6]],
  keep: (p) => {
    const { A, B, C } = cenPts(p);
    const area2 = (B[0] - A[0]) * (C[1] - A[1]) - (B[1] - A[1]) * (C[0] - A[0]);
    return area2 !== 0 && Math.abs(C[0]) <= 9 && Math.abs(C[1]) <= 9 && (p[1] !== 0 || p[2] !== 0);
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
    return [P3([0, 1, 2].map((i) => (A[i] + B[i]) / 2)), P3([G[1], G[0], G[2]]), P3([G[0] + 1, G[1], G[2]]), P3([G[0], G[1], G[2] - 1])];
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

// ================================================================ differentiation rules

const xpw = (n: number) => (n === 0 ? "" : n === 1 ? "x" : `x${sup(n)}`);
/** [a, n, b, c, d]: f(x) = axⁿ + bx² + cx + d. */
const dsF = ([a, n, b, c, d]: number[]) => (x: number) => a * x ** n + b * x * x + c * x + d;
const dsStr = ([a, n, b, c, d]: number[]) => sum([[a, xpw(n)], [b, "x²"], [c, "x"], [d, ""]]);
const audsum = F({
  id: "audsum",
  arity: 5,
  title: "Differentiating a sum and difference of several terms",
  competency: DR,
  type: "exact",
  mc: true,
  prompt: (p) => `Differentiate f(x) = ${dsStr(p)} with respect to x.`,
  solve: ([a, n, b, c]) => {
    const ans = sum([[n * a, xpw(n - 1)], [2 * b, "x"], [c, ""]]);
    return { steps: [st("terms", "differentiate", DR, `Differentiate term by term: d/dx(${a === 1 ? "" : a}${xpw(n)}) = ${n * a}${xpw(n - 1)}, d/dx(${b}x²) = ${2 * b}x, d/dx(${c}x) = ${c}, and a constant gives 0`, ans), st("sum", "add", DR, `f′(x) = ${ans}`, ans)], answer: ans };
  },
  // independent: central differences of f at several points
  validate: (p, v) => agrees(v, (x) => d1(dsF(p), x, 1e-4), XS, 1e-6),
  bugs: ([a, n, b, c, d]) => [
    bug("constant-kept", "recall", DR, `The constant ${d} was kept; a constant does not change, so its derivative is 0.`, sum([[n * a, xpw(n - 1)], [2 * b, "x"], [c, ""], [d, ""]])),
    bug("power-not-lowered", "recall", DR, "Each term was multiplied by its power but the power was not lowered by 1: d/dx xⁿ = nxⁿ⁻¹.", sum([[n * a, xpw(n)], [2 * b, "x²"], [c, "x"]])),
    bug("power-not-multiplied", "recall", DR, "The powers were lowered but the coefficients were not multiplied by the old power.", sum([[a, xpw(n - 1)], [b, "x"], [c, ""]])),
  ],
  domain: [[1, 5], [3, 6], [-6, 6], [-9, 9], [1, 99]],
  keep: ([, , b, c, d]) => b !== 0 && c !== 0 && d % 3 === 0,
  why: "A polynomial axⁿ + bx² + cx + d with n from 3 to 6 and every term present.",
  cap: 400,
  difficulty: ([, n, b, c]) => (n === 3 && b > 0 && c > 0 ? 1 : n >= 5 ? 3 : 2),
  word: (p) => `A workshop's cost of making x hundred chairs in a month is C(x) = ${dsStr(p)} thousand rupees. The marginal cost is the rate of change of cost, C′(x). Find C′(x) as an expression in x.`,
  teach: {
    idea: "The derivative of a sum is the sum of the derivatives, and a constant factor stays in front: d/dx [af + bg] = af′ + bg′. A constant term has derivative 0.",
    method: "Differentiate each term with d/dx xⁿ = nxⁿ⁻¹ (multiply by the power, then lower the power by 1), keep the signs, and drop the constant.",
    alternatives: [
      { id: "slope", title: "Slopes add", kind: "conceptual", text: ["The graph of f + g rises by what f and g rise together.", "So the slope of a sum is the sum of the slopes."] },
      { id: "check_point", title: "Check at a point", kind: "procedural", text: ["Find (f(2.001) − f(1.999))/0.002 with a calculator.", "It should be very close to f′(2) from your answer."] },
    ],
  },
  limits: "Polynomials with four terms; sums with trigonometric, exponential and logarithmic terms are in other families.",
});

const lin_ = (a: number, b: number) => sum([[a, "x"], [b, ""]]);
/** [k, a, b, c, d]: k = 0 (ax + b)/(cx + d), 1 x²/(x + a), 2 sin x/(x + a), 3 (ax + b)/(x² + c). */
const dqF = ([k, a, b, c, d]: number[]) => (x: number) => (k === 0 ? (a * x + b) / (c * x + d) : k === 1 ? (x * x) / (x + a) : k === 2 ? Math.sin(x) / (x + a) : (a * x + b) / (x * x + c));
const dqParts = ([k, a, b, c, d]: number[]) => {
  if (k === 0) return { f: `(${lin_(a, b)})/(${lin_(c, d)})`, num: nf(a * d - b * c), den: lin_(c, d), top: `${a}`, bot: `${c}` };
  if (k === 1) return { f: `x²/(x + ${a})`, num: sum([[1, "x²"], [2 * a, "x"]]), den: `x + ${a}`, top: "2x", bot: "1" };
  if (k === 2) return { f: `sin x/(x + ${a})`, num: `(x + ${a})cos x − sin x`, den: `x + ${a}`, top: "cos x", bot: "1" };
  return { f: `(${lin_(a, b)})/(x² + ${c})`, num: sum([[-a, "x²"], [-2 * b, "x"], [a * c, ""]]), den: `x² + ${c}`, top: `${a}`, bot: "2x" };
};
const audquo = F({
  id: "audquo",
  arity: 5,
  title: "The quotient rule",
  competency: DR,
  type: "expression",
  mc: true,
  prompt: (p) => `Differentiate y = ${dqParts(p).f} with respect to x, and simplify.`,
  solve: (p) => {
    const q = dqParts(p);
    const ans = `(${q.num})/(${q.den})²`;
    return { steps: [st("rule", "recall", DR, "Quotient rule: d/dx (u/v) = (v u′ − u v′)/v²", "(vu′ − uv′)/v²"), st("apply", "differentiate", DR, `Here the top simplifies to ${q.num} and v² = (${q.den})²: dy/dx = ${ans}`, ans)], answer: ans };
  },
  // independent: central differences of the quotient itself
  validate: (p, v) => agrees(v, (x) => d1(dqF(p), x, 1e-5), XS, 1e-6),
  bugs: (p) => {
    const q = dqParts(p);
    return [
      bug("order-reversed", "procedural", DR, "The top of the quotient rule was written as u v′ − v u′; the order is v u′ − u v′, so every sign came out reversed.", `−(${q.num})/(${q.den})²`),
      bug("not-squared", "recall", DR, "The bottom was not squared; the quotient rule divides by v².", `(${q.num})/(${q.den})`),
      bug("derivative-over-derivative", "conceptual", DR, "The derivative of the top was divided by the derivative of the bottom; a quotient is not differentiated part by part.", `(${q.top})/(${q.bot})`),
    ];
  },
  domain: [[0, 3], [1, 5], [-6, 6], [1, 5], [-6, 6]],
  keep: ([k, a, b, c, d]) => (k === 0 ? a * d - b * c !== 0 && b !== 0 && d !== 0 && gcd(gcd(a, Math.abs(b)), gcd(c, Math.abs(d))) === 1 : k === 3 ? b !== 0 && d === 0 : b === 0 && c === 1 && d === 0),
  why: "Quotients of linear, quadratic and sine functions with small whole-number coefficients.",
  cap: 400,
  difficulty: ([k]) => (k === 0 ? 1 : k === 1 ? 2 : 3),
  teach: {
    idea: "For y = u/v, a small change in x changes the top and the bottom; working it out gives (v u′ − u v′)/v². The minus sign makes the order matter.",
    method: "Name u (top) and v (bottom), find u′ and v′, put them into (v u′ − u v′)/v², and simplify the top.",
    alternatives: [
      { id: "product", title: "As a product", kind: "procedural", text: ["Write u/v = u × v⁻¹.", "Use the product rule and the chain rule on v⁻¹: u′v⁻¹ − u v′ v⁻²; the same answer."] },
      { id: "memory", title: "Low d-high minus high d-low", kind: "recall", text: ["Bottom times derivative of top, minus top times derivative of bottom, all over the bottom squared."] },
    ],
  },
  limits: "Four kinds of quotient; quotients of exponentials and logarithms are in the exponential family.",
});

/** [k, a, b, n]: k = 0 (ax + b)ⁿ, 1 sin(ax² + b), 2 √(ax² + b), 3 e^(ax² + b), 4 log(ax² + b), 5 cosⁿ(ax). */
const dcF = ([k, a, b, n]: number[]) => (x: number) => (k === 0 ? (a * x + b) ** n : k === 1 ? Math.sin(a * x * x + b) : k === 2 ? Math.sqrt(a * x * x + b) : k === 3 ? Math.exp(a * x * x + b) : k === 4 ? Math.log(a * x * x + b) : Math.cos(a * x) ** n);
const dcParts = ([k, a, b, n]: number[]) => {
  const inner = k === 0 ? lin_(a, b) : sum([[a, "x²"], [b, ""]]);
  const ax2 = `${2 * a}x`;
  const ax = ax_(a);
  if (k === 0) return { f: `(${inner})${sup(n)}`, ans: `${n * a}(${inner})^${n - 1}`, noInner: `${n}(${inner})^${n - 1}` };
  if (k === 1) return { f: `sin(${inner})`, ans: `${ax2} cos(${inner})`, noInner: `cos(${inner})` };
  if (k === 2) return { f: `√(${inner})`, ans: `${ax}/√(${inner})`, noInner: `1/(2√(${inner}))` };
  if (k === 3) return { f: `e^(${inner})`, ans: `${ax2} e^(${inner})`, noInner: `e^(${inner})` };
  if (k === 4) return { f: `log(${inner})`, ans: `${ax2}/(${inner})`, noInner: `1/(${inner})` };
  return { f: `cos${sup(n)}(${ax})`, ans: `−${n * a} cos^${n - 1}(${ax}) sin(${ax})`, noInner: `−${n} cos^${n - 1}(${ax}) sin(${ax})` };
};
const audch = F({
  id: "audch",
  arity: 4,
  title: "The chain rule for composite functions",
  competency: DR,
  type: "expression",
  mc: true,
  prompt: (p) => `Differentiate y = ${dcParts(p).f} with respect to x.${p[0] === 4 ? " (log is the natural logarithm.)" : ""}`,
  solve: (p) => {
    const q = dcParts(p);
    return { steps: [st("rule", "recall", DR, "Chain rule: dy/dx = (derivative of the outer function at the inner one) × (derivative of the inner function)", "dy/du × du/dx"), st("apply", "differentiate", DR, `dy/dx = ${q.ans}`, q.ans)], answer: q.ans };
  },
  // independent: central differences of the composite function
  validate: (p, v) => agrees(v, (x) => d1(dcF(p), x, 1e-5), XS, 1e-6),
  bugs: (p) => {
    const [k, a, , n] = p;
    const q = dcParts(p);
    const ax = ax_(a);
    return [
      bug("inner-forgotten", "conceptual", DR, "The outer function was differentiated but the result was not multiplied by the derivative of the inside.", q.noInner),
      ...(k === 5 ? [bug("cos-to-sin-sign", "recall", DR, "The derivative of cos was taken as + sin; d/dx cos u = − sin u × u′.", `${n * a} cos^${n - 1}(${ax}) sin(${ax})`)] : []),
      ...(k === 1 ? [bug("inside-changed", "procedural", DR, "The inside function was differentiated as well as kept inside cos; the inside stays unchanged and its derivative multiplies.", `${2 * a}x cos(${2 * a}x)`)] : []),
      ...(k === 0 ? [bug("power-not-lowered", "recall", DR, "The power was not lowered by 1.", `${n * a}(${lin_(a, p[2])})^${n}`)] : []),
    ];
  },
  distractors: (p) => {
    const q = dcParts(p);
    return [`−(${q.ans})`, `2(${q.ans})`, `(${q.ans})/2`];
  },
  domain: [[0, 5], [1, 5], [-5, 9], [2, 6]],
  keep: ([k, a, b, n]) => (k === 0 ? b !== 0 && a >= 2 : k === 5 ? b === 1 && n <= 4 && a >= 2 : n === 2 && (k === 2 || k === 4 ? b >= 1 : k === 3 ? b >= -3 && b <= 3 : b !== 0)),
  why: "Powers of a linear function, and sin, √, e^, log and powers of cos of a simple inner function.",
  cap: 400,
  difficulty: ([k]) => (k === 0 ? 1 : k === 5 || k === 2 ? 3 : 2),
  teach: {
    idea: "A composite y = f(g(x)) changes with x through g: if x changes a little, g changes g′(x) times as much, and y changes f′(g) times that. So dy/dx = f′(g(x)) × g′(x).",
    method: "Name the inside u = g(x). Differentiate the outside as if u were the variable, keep u inside, then multiply by du/dx.",
    alternatives: [
      { id: "substitute_u", title: "Write it with u", kind: "procedural", text: ["Let u be the inside. Find dy/du and du/dx separately.", "Multiply them and put u back in terms of x."] },
      { id: "layers", title: "Peel the layers", kind: "conceptual", text: ["Differentiate from the outside in, one layer at a time.", "Each layer you peel contributes one factor."] },
    ],
  },
  limits: "One inner function inside one outer function; composites three deep are not included.",
});

/** [k, a, c]: k = 0 c·sin⁻¹(x/a), 1 c·cos⁻¹(x/a), 2 c·tan⁻¹(x/a), 3 c·tan⁻¹(ax), 4 xᵃ with respect to xᶜ, 5 sin(ax) with respect to cos(ax). */
const diF = ([k, a, c]: number[]) => (x: number) => (k === 0 ? c * Math.asin(x / a) : k === 1 ? c * Math.acos(x / a) : k === 2 ? c * Math.atan(x / a) : c * Math.atan(a * x));
const cc = (c: number) => (c === 1 ? "" : `${c}`);
const audinvAns = ([k, a, c]: number[]) =>
  k === 0 ? `${c}/√(${a * a} − x²)` : k === 1 ? `−${c}/√(${a * a} − x²)` : k === 2 ? `${c * a}/(${a * a} + x²)` : k === 3 ? `${c * a}/(1 + ${a * a}x²)` : k === 4 ? (a > c ? `(${rat(a, c)})x^${a - c}` : `(${rat(a, c)})/x^${c - a}`) : `−cot(${ax_(a)})`;
const audinv = F({
  id: "audinv",
  arity: 3,
  title: "Derivatives of inverse trigonometric functions, and one function with respect to another",
  competency: DR,
  type: "expression",
  mc: true,
  prompt: ([k, a, c]) =>
    k === 0
      ? `Differentiate y = ${cc(c)}sin⁻¹(x/${a}) with respect to x (for −${a} < x < ${a}).`
      : k === 1
        ? `Differentiate y = ${cc(c)}cos⁻¹(x/${a}) with respect to x (for −${a} < x < ${a}).`
        : k === 2
          ? `Differentiate y = ${cc(c)}tan⁻¹(x/${a}) with respect to x.`
          : k === 3
            ? `Differentiate y = ${cc(c)}tan⁻¹(${a}x) with respect to x.`
            : k === 4
              ? `Differentiate x${sup(a)} with respect to x${sup(c)} (for x > 0).`
              : `Differentiate sin ${ax_(a)} with respect to cos ${ax_(a)}.`,
  solve: ([k, a, c]) => {
    const ans = audinvAns([k, a, c]);
    const rule =
      k <= 1 ? "d/dx sin⁻¹u = u′/√(1 − u²) and d/dx cos⁻¹u = −u′/√(1 − u²)" : k <= 3 ? "d/dx tan⁻¹u = u′/(1 + u²)" : k === 4 ? `With u = x${sup(c)}: dy/du = (dy/dx)/(du/dx) = ${a}x${sup(a - 1)}/(${c}x${sup(c - 1)})` : `dy/du = (dy/dx)/(du/dx) = ${a} cos ${ax_(a)}/(−${a} sin ${ax_(a)})`;
    return { steps: [st("rule", "recall", DR, rule, rule), st("simplify", "simplify", DR, `Simplify: ${ans}`, ans)], answer: ans };
  },
  // independent: central differences (for k = 4, 5 the ratio of the two derivatives, each by central differences)
  validate: (p, v) => {
    const [k, a, c] = p;
    if (k <= 3) return agrees(v, (x) => d1(diF(p), x, 1e-6), XS, 1e-6);
    const f = k === 4 ? (x: number) => x ** a : (x: number) => Math.sin(a * x);
    const g = k === 4 ? (x: number) => x ** c : (x: number) => Math.cos(a * x);
    const xs = k === 4 ? XS : XSMALL.map((x) => x / a);
    return agrees(v, (x) => d1(f, x, 1e-6) / d1(g, x, 1e-6), xs, 1e-6);
  },
  bugs: ([k, a, c]) => {
    if (k === 0) return [bug("chain-dropped", "procedural", DR, `The derivative of the inside, x/${a}, was not used: it multiplies by 1/${a}.`, `${c}/√(1 − x²/${a * a})`)];
    if (k === 1) return [bug("sign", "recall", DR, "The derivative of cos⁻¹ was taken with a + sign; d/dx cos⁻¹u = −u′/√(1 − u²).", `${c}/√(${a * a} − x²)`)];
    if (k === 2) return [bug("chain-dropped", "procedural", DR, `The derivative of the inside, x/${a}, was not used: it multiplies by 1/${a}.`, `${c}/(1 + x²/${a * a})`)];
    if (k === 3) return [bug("chain-dropped", "procedural", DR, `The derivative of the inside, ${a}x, was not used: it multiplies by ${a}.`, `${c}/(1 + ${a * a}x²)`), bug("square-dropped", "recall", DR, "The square inside was lost: d/dx tan⁻¹u = u′/(1 + u²).", `${c * a}/(1 + ${a}x)`)];
    if (k === 4) return [bug("top-only", "conceptual", DR, `Only x${sup(a)} was differentiated; with respect to x${sup(c)} the result is divided by the derivative of x${sup(c)}.`, `${a}x^${a - 1}`), bug("upside-down", "procedural", DR, "The two derivatives were divided the wrong way round.", a > c ? `(${rat(c, a)})x^${a - c}` : `(${rat(c, a)})/x^${c - a}`)];
    return [bug("upside-down", "procedural", DR, "The two derivatives were divided the wrong way round: d(sin)/d(cos) is (d sin/dx) ÷ (d cos/dx).", `−tan(${ax_(a)})`), bug("sign", "recall", DR, "The minus sign from d/dx cos = −sin was lost.", `cot(${ax_(a)})`)];
  },
  distractors: (p) => {
    const a = audinvAns(p);
    return [`−(${a})`, `2(${a})`, `(${a})/2`];
  },
  domain: [[0, 5], [1, 9], [1, 6]],
  keep: ([k, a, c]) => (k <= 2 ? a >= 3 : k === 3 ? a >= 2 : k === 4 ? a >= 2 && a <= 7 && c <= 5 && a !== c && gcd(a, c) === 1 : c === 1),
  why: "c·sin⁻¹(x/a), c·cos⁻¹(x/a), c·tan⁻¹(x/a), c·tan⁻¹(ax), xᵃ with respect to xᶜ, and sin ax with respect to cos ax.",
  difficulty: ([k]) => (k === 3 || k === 2 ? 1 : k <= 1 ? 2 : 3),
  teach: {
    idea: "If y = sin⁻¹x then x = sin y, so dx/dy = cos y = √(1 − x²) and dy/dx = 1/√(1 − x²); similarly for cos⁻¹ (with a minus sign) and tan⁻¹ (1/(1 + x²)). To differentiate y with respect to u, divide dy/dx by du/dx.",
    method: "Use d/dx sin⁻¹u = u′/√(1 − u²), d/dx cos⁻¹u = −u′/√(1 − u²), d/dx tan⁻¹u = u′/(1 + u²), then simplify. For 'with respect to', find both derivatives with respect to x and divide.",
    alternatives: [
      { id: "implicit", title: "Undo the inverse", kind: "conceptual", text: ["Write y = tan⁻¹(x/a) as tan y = x/a.", "Differentiate both sides: sec²y · dy/dx = 1/a, and sec²y = 1 + x²/a²."] },
      { id: "parametric", title: "Like a parametric derivative", kind: "procedural", text: ["Treat x as a parameter: y and u are both functions of x.", "dy/du = (dy/dx)/(du/dx)."] },
    ],
  },
  limits: "Inverse trigonometric functions of x/a or ax with a whole-number multiplier; sec⁻¹ and cot⁻¹ are not included.",
});

/** [k, a, c, d]: k = 0 c·e^(ax) + d log x, 1 c·aˣ, 2 c·xᵃ log x, 3 e^(ax) log x. */
const deF = ([k, a, c, d]: number[]) => (x: number) => (k === 0 ? c * Math.exp(a * x) + d * Math.log(x) : k === 1 ? c * a ** x : k === 2 ? c * x ** a * Math.log(x) : Math.exp(a * x) * Math.log(x));
const audel = F({
  id: "audel",
  arity: 4,
  title: "Derivatives of exponential and logarithmic functions",
  competency: DR,
  type: "expression",
  mc: true,
  prompt: ([k, a, c, d]) => {
    const f = k === 0 ? `${cc(c)}e^(${ax_(a)}) ${signed(d)} log x` : k === 1 ? `${cc(c)}${a}^x` : k === 2 ? `${cc(c)}x${sup(a)} log x` : `e^(${ax_(a)}) log x`;
    return `Differentiate y = ${f.replace(/ ([+−]) 1 log/, " $1 log")} with respect to x (x > 0; log is the natural logarithm).`;
  },
  solve: ([k, a, c, d]) => {
    const ans = k === 0 ? `${c * a}e^(${ax_(a)}) ${signed(d)}/x` : k === 1 ? `${c}(${a}^x) log ${a}` : k === 2 ? `${c * a}x^${a - 1} log x + ${c}x^${a - 1}` : `${a}e^(${ax_(a)}) log x + e^(${ax_(a)})/x`;
    const rule = k === 0 ? "d/dx e^(ax) = a e^(ax) and d/dx log x = 1/x" : k === 1 ? "aˣ = e^(x log a), so d/dx aˣ = aˣ log a" : "product rule with d/dx log x = 1/x";
    return { steps: [st("rule", "recall", DR, rule, rule), st("apply", "differentiate", DR, `dy/dx = ${ans}`, ans)], answer: ans };
  },
  // independent: central differences
  validate: (p, v) => agrees(v, (x) => d1(deF(p), x, 1e-6), XS, 1e-6),
  bugs: ([k, a, c, d]) =>
    k === 0
      ? [bug("exponent-factor", "recall", DR, `The factor ${a} from the exponent was left out: d/dx e^(${a}x) = ${a}e^(${a}x).`, `${c}e^(${ax_(a)}) ${signed(d)}/x`), bug("power-rule-on-e", "conceptual", DR, "The power rule was used on e^(ax); the variable is in the exponent, so the power rule does not apply.", `${c * a}x e^(${a - 1}x) ${signed(d)}/x`)]
      : k === 1
        ? [bug("power-rule", "conceptual", DR, "aˣ was differentiated like xⁿ; the variable is in the exponent: d/dx aˣ = aˣ log a.", `${c}x(${a}^(x − 1))`), bug("no-log", "recall", DR, `The factor log ${a} was left out; only eˣ is its own derivative.`, `${c}(${a}^x)`)]
        : k === 2
          ? [bug("product-of-derivatives", "conceptual", DR, "The two derivatives were multiplied; the product rule is u′v + uv′.", `${c * a}x^${a - 2}`), bug("one-part", "procedural", DR, "Only one part of the product rule was written.", `${c * a}x^${a - 1} log x`)]
          : [bug("product-of-derivatives", "conceptual", DR, "The two derivatives were multiplied; the product rule is u′v + uv′.", `${a}e^(${ax_(a)})/x`), bug("one-part", "procedural", DR, "Only one part of the product rule was written.", `${a}e^(${ax_(a)}) log x`)],
  domain: [[0, 3], [1, 9], [1, 6], [-6, 6]],
  keep: ([k, a, c, d]) => (k === 0 ? a <= 5 && d !== 0 : k === 1 ? a >= 2 && d === 1 && a !== 4 && a !== 8 && a !== 9 : k === 2 ? a >= 2 && a <= 5 && d === 1 : a <= 5 && c === 1 && d === 1),
  why: "c·e^(ax) + d log x, c·aˣ, c·xᵃ log x and e^(ax) log x with small whole numbers.",
  difficulty: ([k]) => (k === 0 ? 1 : k === 1 ? 2 : 3),
  teach: {
    idea: "eˣ is its own derivative, and log x (the inverse of eˣ) has derivative 1/x. Any aˣ is e^(x log a), so its derivative is aˣ log a.",
    method: "Use d/dx e^(ax) = a e^(ax), d/dx log x = 1/x, d/dx aˣ = aˣ log a, and the product rule for products.",
    alternatives: [
      { id: "rewrite", title: "Rewrite with e", kind: "procedural", text: ["Write 2ˣ = e^(x log 2).", "Use the chain rule: the inside x log 2 has derivative log 2."] },
      { id: "growth", title: "Growth in proportion", kind: "conceptual", text: ["eˣ grows at a rate equal to its size.", "aˣ grows at a rate equal to its size times log a."] },
    ],
  },
  limits: "Single exponential or logarithmic terms and products with them; logarithms to other bases are not included.",
});

// ================================================================ determinants

/** [k, e1, …, e9]: k = 0 |A| for a 3 × 3 matrix; k = 1 |AB| for 2 × 2 matrices A = (e1 … e4), B = (e5 … e8). */
const audt3 = F({
  id: "audt3",
  arity: 10,
  title: "Determinants of order 3, and the determinant of a product",
  competency: DET,
  type: "integer",
  mc: true,
  prompt: ([k, ...e]) =>
    k === 0 ? `Evaluate the determinant of A = ${mat(rows3(e))}.` : `A = ${mat([e.slice(0, 2), e.slice(2, 4)])} and B = ${mat([e.slice(4, 6), e.slice(6, 8)])}. Find |AB|.`,
  solve: ([k, ...e]) => {
    if (k === 0) {
      const m = rows3(e);
      const v = cof3(m);
      return { steps: [st("expand", "expand", DET, `Expand along the first row: ${pn(m[0][0])} × (${det2(m[1][1], m[1][2], m[2][1], m[2][2])}) − ${pn(m[0][1])} × (${det2(m[1][0], m[1][2], m[2][0], m[2][2])}) + ${pn(m[0][2])} × (${det2(m[1][0], m[1][1], m[2][0], m[2][1])})`, v), st("value", "add", INT, `|A| = ${v}`, v)], answer: v };
    }
    const [a, b, c, d, p, q, r, s] = e;
    const dA = det2(a, b, c, d);
    const dB = det2(p, q, r, s);
    return { steps: [st("each", "evaluate", DET, `|A| = ${dA} and |B| = ${dB}`, `${dA}, ${dB}`), st("product", "multiply", DET, `|AB| = |A| × |B| = ${dA * dB}`, dA * dB)], answer: dA * dB };
  },
  // independent: Leibniz's sum over permutations; for |AB|, multiply the matrices first and then take the determinant
  validate: ([k, ...e], v) => {
    if (typeof v !== "number") return false;
    if (k === 0) return v === leibniz(rows3(e));
    const [a, b, c, d, p, q, r, s] = e;
    const P = [a * p + b * r, a * q + b * s, c * p + d * r, c * q + d * s];
    return v === P[0] * P[3] - P[1] * P[2];
  },
  bugs: ([k, ...e]) => {
    if (k === 0) {
      const m = rows3(e);
      return [
        bug("middle-sign", "procedural", DET, "The middle term was added; in the expansion along a row the signs go + − +, so the second term is subtracted.", m[0][0] * det2(m[1][1], m[1][2], m[2][1], m[2][2]) + m[0][1] * det2(m[1][0], m[1][2], m[2][0], m[2][2]) + m[0][2] * det2(m[1][0], m[1][1], m[2][0], m[2][1])),
        bug("forward-diagonals", "conceptual", DET, "Only the three forward diagonals were added; the three backward diagonals must be subtracted as well (Sarrus' rule).", m[0][0] * m[1][1] * m[2][2] + m[0][1] * m[1][2] * m[2][0] + m[0][2] * m[1][0] * m[2][1]),
      ];
    }
    const [a, b, c, d, p, q, r, s] = e;
    return [
      bug("added", "conceptual", DET, "|A| and |B| were added; the determinant of a product is the product of the determinants.", det2(a, b, c, d) + det2(p, q, r, s)),
      bug("entrywise", "conceptual", "MATH.algebra.matrices", "The matrices were multiplied entry by entry; matrix multiplication combines rows with columns (or use |AB| = |A||B|).", det2(a * p, b * q, c * r, d * s)),
    ];
  },
  domain: [[0, 1], [-3, 4], [-3, 4], [-3, 4], [-3, 4], [-3, 4], [-3, 4], [-3, 4], [-3, 4], [-3, 4]],
  keep: ([k, ...e]) => (k === 0 ? e.filter((x) => x === 0).length <= 2 && cof3(rows3(e)) !== 0 : e[8] === 0 && det2(e[0], e[1], e[2], e[3]) !== 0 && det2(e[4], e[5], e[6], e[7]) !== 0 && e.slice(0, 8).filter((x) => x === 0).length <= 1),
  why: "3 × 3 matrices with entries from −3 to 4 (at most two zeros), or two 2 × 2 matrices for |AB|.",
  cap: 400,
  difficulty: ([k, ...e]) => (k === 1 ? 2 : e.some((x) => x < 0) ? 3 : 2),
  teach: {
    idea: "A 3 × 3 determinant is built from 2 × 2 ones: each entry of a row times its cofactor (its minor with the sign + − + …). The determinant of a product is the product of the determinants: |AB| = |A||B|.",
    method: "Expand along the first row: a₁₁(a₂₂a₃₃ − a₂₃a₃₂) − a₁₂(a₂₁a₃₃ − a₂₃a₃₁) + a₁₃(a₂₁a₃₂ − a₂₂a₃₁). Choose a row or column with zeros to save work.",
    alternatives: [
      { id: "sarrus", title: "Sarrus' rule", kind: "procedural", text: ["Copy the first two columns to the right of the matrix.", "Add the three products down to the right, subtract the three products down to the left."] },
      { id: "row_ops", title: "Make zeros first", kind: "procedural", text: ["Subtracting a multiple of one row from another does not change the determinant.", "Make two zeros in a column, then expand along it."] },
    ],
  },
  limits: "Entries from −3 to 4; determinants with letters are in the singular-matrix family.",
});

/** [x1, y1, x2, y2, y3, k0]: vertices (x1, y1), (x2, y2), (k, y3); the area is that of k = k0. */
const dkD = ([x1, y1, x2, y2, y3]: number[], k: number) => x1 * (y2 - y3) + x2 * (y3 - y1) + k * (y1 - y2);
const dkArea = (p: number[]) => Math.abs(dkD(p, p[5])) / 2;
const dkRoots = (p: number[]) => {
  const al = p[1] - p[3];
  const be = dkD(p, 0);
  const A2 = 2 * dkArea(p);
  return [(A2 - be) / al, (-A2 - be) / al];
};
const audk = F({
  id: "audk",
  arity: 6,
  title: "An unknown vertex of a triangle of given area, by determinants",
  competency: DET,
  type: "set",
  prompt: (p) => `The area of the triangle with vertices ${P2(p[0], p[1])}, ${P2(p[2], p[3])} and (k, ${nf(p[4])}) is ${dkArea(p)} square units. Using determinants, find the possible values of k (fractions are fine).`,
  solve: (p) => {
    const al = p[1] - p[3];
    const be = dkD(p, 0);
    const A = dkArea(p);
    const r = dkRoots(p);
    return {
      steps: [
        st("det", "expand", DET, `½ × |det[[${nf(p[0])}, ${nf(p[1])}, 1], [${nf(p[2])}, ${nf(p[3])}, 1], [k, ${nf(p[4])}, 1]]| = ½ |${sum([[al, "k"], [be, ""]])}|`, sum([[al, "k"], [be, ""]])),
        st("equation", "model", DET, `${sum([[al, "k"], [be, ""]])} = ±${2 * A}`, `±${2 * A}`),
        st("solve", "solve", LIN, `k = ${nf(r[0])} or k = ${nf(r[1])}`, `${nf(r[0])}, ${nf(r[1])}`),
      ],
      answer: r,
    };
  },
  // independent: Heron's formula with each value of k gives the stated area, and there are two different values
  validate: (p, v) => {
    if (!Array.isArray(v) || v.length !== 2 || near(v[0], v[1], 1e-12)) return false;
    return v.every((k) => near(heron([[p[0], p[1]], [p[2], p[3]], [k, p[4]]]), dkArea(p), 1e-7));
  },
  bugs: (p) => {
    const al = p[1] - p[3];
    const be = dkD(p, 0);
    const A = dkArea(p);
    const r = dkRoots(p);
    return [
      bug("no-half", "recall", DET, "The determinant was set equal to the area; the area is half the absolute value of the determinant, so the determinant is ± twice the area.", [(A - be) / al, (-A - be) / al]),
      bug("one-sign", "conceptual", DET, "Only the positive value of the determinant was used; the absolute value means the determinant can be + or − twice the area, which gives two positions for the vertex.", [r[0]]),
    ];
  },
  domain: [[-5, 5], [-5, 5], [-5, 5], [-5, 5], [-5, 5], [-5, 5]],
  keep: (p) => {
    const al = p[1] - p[3];
    const D = dkD(p, p[5]);
    const r = dkRoots(p);
    return al !== 0 && D !== 0 && D % 2 === 0 && r.every((x) => Math.abs(x) <= 15) && (p[4] !== p[1] && p[4] !== p[3]);
  },
  why: "Whole-number vertices from −5 to 5 with a whole-number area; the third vertex moves along a horizontal line.",
  cap: 400,
  difficulty: (p) => (dkRoots(p).every(isInt) ? 2 : 3),
  word: (p) => `On a survey map (1 unit = 1 m), two corners of a triangular plot are at ${P2(p[0], p[1])} and ${P2(p[2], p[3])}. The third corner is on the boundary line y = ${nf(p[4])}, at (k, ${nf(p[4])}), and the plot's area is ${dkArea(p)} m². What are the possible values of k?`,
  teach: {
    idea: "The area of the triangle with vertices (x₁, y₁), (x₂, y₂), (x₃, y₃) is ½ |det[[x₁, y₁, 1], [x₂, y₂, 1], [x₃, y₃, 1]]|. With an unknown vertex the determinant is linear in k, and the absolute value gives two equations.",
    method: "Expand the determinant to get αk + β. Set αk + β = 2 × area and αk + β = −2 × area, and solve each.",
    alternatives: [
      { id: "picture", title: "Two positions", kind: "conceptual", text: ["The points that make a triangle of this area with the two known corners lie on two lines parallel to the side joining them, one on each side.", "The line y = c meets each of these lines once: that is why there are two values of k."] },
      { id: "check_area", title: "Check with the shoelace sum", kind: "procedural", text: ["Put each k back and work out ½|x₁(y₂ − y₃) + x₂(y₃ − y₁) + x₃(y₁ − y₂)|.", "Both must give the stated area."] },
    ],
  },
  limits: "The unknown is one coordinate of one vertex; areas and collinearity themselves are in the polygon-area families (altria, alcoll).",
});

/** [t, pos, e1 … e8]: a 3 × 3 matrix with k at position pos; t = 0 a matrix, 1 a homogeneous system. */
const sgM = ([, pos, ...e]: number[], k: number) => {
  const all = [...e.slice(0, pos), k, ...e.slice(pos)];
  return rows3(all);
};
const sgAB = (p: number[]) => {
  const b = leibniz(sgM(p, 0));
  const a = leibniz(sgM(p, 1)) - b;
  return [a, b];
};
const sgK = (p: number[]) => {
  const [a, b] = sgAB(p);
  return -b / a;
};
const sysText = (p: number[]) => {
  const L = ["x", "y", "z"];
  return [0, 1, 2]
    .map((i) => {
      const terms = [0, 1, 2].map((j) => (i * 3 + j === p[1] ? `λ${L[j]}` : null));
      const row = sgM(p, 0)[i];
      const parts: string[] = [];
      row.forEach((c, j) => {
        if (terms[j]) parts.push(parts.length ? `+ ${terms[j]}` : terms[j]!);
        else if (c !== 0) parts.push(parts.length ? `${c < 0 ? "−" : "+"} ${Math.abs(c) === 1 ? "" : Math.abs(c)}${L[j]}` : `${c < 0 ? "−" : ""}${Math.abs(c) === 1 ? "" : Math.abs(c)}${L[j]}`);
      });
      return `${parts.join(" ")} = 0`;
    })
    .join(", ");
};
const audsg = F({
  id: "audsg",
  arity: 10,
  title: "The value that makes a 3 × 3 matrix singular, or a homogeneous system have a non-trivial solution",
  competency: DET,
  type: "integer",
  mc: true,
  prompt: (p) => {
    if (p[0] === 0) {
      const m = sgM(p, 0).map((r) => r.map(nf));
      m[Math.floor(p[1] / 3)][p[1] % 3] = "k";
      return `For which value of k is the matrix [[${m.map((r) => r.join(", ")).join("], [")}]] singular?`;
    }
    return `For which value of λ does the system ${sysText(p)} have a solution other than x = y = z = 0?`;
  },
  solve: (p) => {
    const [a, b] = sgAB(p);
    const v = sgK(p);
    const L = p[0] === 0 ? "k" : "λ";
    return {
      steps: [
        st("condition", "recall", DET, p[0] === 0 ? "A matrix is singular exactly when its determinant is 0" : "A homogeneous system has a non-trivial solution exactly when the determinant of its coefficients is 0", "det = 0"),
        st("expand", "expand", DET, `Expanding, the determinant is ${sum([[a, L], [b, ""]])}`, sum([[a, L], [b, ""]])),
        st("solve", "solve", LIN, `${sum([[a, L], [b, ""]])} = 0 gives ${L} = ${v}`, v),
      ],
      answer: v,
    };
  },
  // independent: substitute the value and evaluate the determinant by Leibniz's permutation sum
  validate: (p, v) => typeof v === "number" && leibniz(sgM(p, v)) === 0,
  bugs: (p) => {
    const [a, b] = sgAB(p);
    const odd = p[1] % 2 === 1;
    return [
      ...(odd ? [bug("cofactor-sign", "procedural", DET, "The sign of the cofactor at the unknown's place was missed (the signs alternate + − + in a checkerboard).", b / a)] : []),
      bug("det-one", "conceptual", DET, p[0] === 0 ? "The determinant was set equal to 1; a singular matrix has determinant 0." : "The determinant was set non-zero (equal to 1); a non-zero determinant gives only the zero solution.", (1 - b) % a === 0 ? (1 - b) / a : null),
    ];
  },
  distractors: (p) => [sgK(p) + 1, sgK(p) - 1, -sgK(p)],
  domain: [[0, 1], [0, 8], [-3, 4], [-3, 4], [-3, 4], [-3, 4], [-3, 4], [-3, 4], [-3, 4], [-3, 4]],
  keep: (p) => {
    const [a, b] = sgAB(p);
    return a !== 0 && b % a === 0 && Math.abs(b / a) <= 12 && b !== 0 && p.slice(2).filter((x) => x === 0).length <= 2;
  },
  why: "3 × 3 matrices or homogeneous systems with one unknown entry and whole-number entries from −3 to 4, with a whole-number answer.",
  cap: 400,
  difficulty: ([t, pos]) => (pos === 0 ? 2 : t === 1 ? 3 : 2),
  teach: {
    idea: "det A = 0 means the rows are dependent: the matrix has no inverse (singular), and the system AX = 0 has solutions besides X = 0. With one unknown entry the determinant is linear in it.",
    method: "Expand the determinant (along the row or column of the unknown is quickest), set it equal to 0, and solve the linear equation.",
    alternatives: [
      { id: "cofactor", title: "Cofactor of the unknown", kind: "procedural", text: ["Expanding along the unknown's row: det = (its cofactor) × k + (the rest).", "So k = −(the rest) ÷ (its cofactor)."] },
      { id: "dependent_rows", title: "Dependent rows", kind: "conceptual", text: ["When det = 0, one row is a combination of the others.", "Then the equations do not pin down a single point: the system has infinitely many solutions through the origin."] },
    ],
  },
  limits: "One unknown entry in a 3 × 3 matrix with whole-number answers; parameters in several entries are in aqcpar.",
});

/** [e1 … e9]: a non-singular 3 × 3 matrix with a small determinant. */
function adj3(m: number[][]): number[][] {
  const c = (i: number, j: number) => {
    const r = [0, 1, 2].filter((x) => x !== i);
    const s = [0, 1, 2].filter((x) => x !== j);
    return (((i + j) % 2 ? -1 : 1) * det2(m[r[0]][s[0]], m[r[0]][s[1]], m[r[1]][s[0]], m[r[1]][s[1]]));
  };
  const C = [0, 1, 2].map((i) => [0, 1, 2].map((j) => c(i, j)));
  return [0, 1, 2].map((i) => [0, 1, 2].map((j) => C[j][i]));
}
const matR = (m: number[][], d: number) => `[[${m.map((r) => r.map((x) => rat(x, d)).join(", ")).join("], [")}]]`;
const auinv = F({
  id: "auinv",
  arity: 9,
  title: "The inverse of a 3 × 3 matrix",
  competency: DET,
  type: "matrix",
  mc: true,
  prompt: (e) => `A = ${mat(rows3(e))}. Find A⁻¹, written as [[a, b, c], [d, e, f], [g, h, i]] (fractions are fine as entries).`,
  solve: (e) => {
    const m = rows3(e);
    const D = cof3(m);
    const adj = adj3(m);
    return { steps: [st("det", "evaluate", DET, `|A| = ${D} (not 0, so A has an inverse)`, D), st("adj", "cofactors", "MATH.matrices.adjoint-inverse", `adj A (the transpose of the cofactor matrix) = ${mat(adj)}`, mat(adj)), st("inverse", "divide", DET, `A⁻¹ = adj A ÷ |A| = ${matR(adj, D)}`, matR(adj, D))], answer: matR(adj, D) };
  },
  // independent: multiply A by the answer and check that the product is the identity
  validate: (e, v) => {
    const X = matrixNums(v);
    if (!X || X.length !== 3 || X.some((r) => r.length !== 3)) return false;
    const m = rows3(e);
    return [0, 1, 2].every((i) => [0, 1, 2].every((j) => Math.abs(m[i][0] * X[0][j] + m[i][1] * X[1][j] + m[i][2] * X[2][j] - (i === j ? 1 : 0)) < 1e-9));
  },
  bugs: (e) => {
    const m = rows3(e);
    const D = cof3(m);
    const adj = adj3(m);
    const C = [0, 1, 2].map((i) => [0, 1, 2].map((j) => adj[j][i]));
    return [
      bug("not-divided", "procedural", DET, `The adjoint was given without dividing by |A| = ${D}.`, D !== 1 ? mat(adj) : null),
      bug("not-transposed", "procedural", "MATH.matrices.adjoint-inverse", "The cofactor matrix was divided by |A| without transposing it; the adjoint is the transpose of the cofactor matrix.", matR(C, D)),
      bug("minors", "recall", "MATH.matrices.adjoint-inverse", "Minors were used without their signs; each cofactor carries the sign (−1)^(i + j).", matR(adj.map((r, i) => r.map((x, j) => ((i + j) % 2 ? -x : x))), D)),
    ];
  },
  distractors: (e) => {
    const m = rows3(e);
    const D = cof3(m);
    return [matR(adj3(m), -D), mat(m.map((r) => r.map((x) => -x)))];
  },
  domain: [[-2, 3], [-2, 3], [-2, 3], [-2, 3], [-2, 3], [-2, 3], [-2, 3], [-2, 3], [-2, 3]],
  keep: (e) => {
    const m = rows3(e);
    const D = cof3(m);
    const adj = adj3(m);
    return D !== 0 && Math.abs(D) <= 4 && adj.some((r, i) => r.some((x, j) => x !== adj[j][i])) && e.filter((x) => x === 0).length <= 3 && adj.some((r, i) => r.some((x, j) => (i + j) % 2 === 1 && x !== 0));
  },
  why: "3 × 3 matrices with entries from −2 to 3 and determinant ±1 to ±4, whose cofactor matrix is not symmetric.",
  cap: 400,
  difficulty: (e) => (Math.abs(cof3(rows3(e))) === 1 ? 2 : 3),
  teach: {
    idea: "A · adj A = |A| I for every square matrix, so when |A| ≠ 0 the inverse is A⁻¹ = adj A / |A|. When |A| = 0 the matrix is singular and has no inverse.",
    method: "Find |A|. Find all nine cofactors (minors with signs + − + / − + − / + − +), transpose to get adj A, and divide every entry by |A|. Check that A·A⁻¹ = I.",
    alternatives: [
      { id: "row_reduce", title: "Row-reduce [A | I]", kind: "procedural", text: ["Write A next to the identity matrix.", "Use row operations to turn A into I; the right-hand block becomes A⁻¹."] },
      { id: "check", title: "Check by multiplying", kind: "conceptual", text: ["Multiply A by your answer.", "Every diagonal entry must be 1 and every other entry 0."] },
    ],
  },
  limits: "Small whole-number entries with |A| from −4 to 4; matrices with letters are not included.",
});

// ================================================================ antiderivatives

/** The standard integrands: [as written, antiderivative, its derivative written by mistake, a sign slip]. */
const STD: { f: (n: number) => string; F: (n: number) => [number, string]; g: (x: number, n: number) => number; diff: (n: number) => [number, string]; slip: ((n: number) => [number, string]) | null }[] = [
  { f: (n) => `x${sup(n)}`, F: (n) => [1 / (n + 1), `x^${n + 1}`], g: (x, n) => x ** n, diff: (n) => [n, `x^${n - 1}`], slip: (n) => [1, `x^${n + 1}`] },
  { f: () => "sin x", F: () => [-1, "cos x"], g: (x) => Math.sin(x), diff: () => [1, "cos x"], slip: () => [1, "cos x"] },
  { f: () => "cos x", F: () => [1, "sin x"], g: (x) => Math.cos(x), diff: () => [-1, "sin x"], slip: () => [-1, "sin x"] },
  { f: () => "sec²x", F: () => [1, "tan x"], g: (x) => 1 / Math.cos(x) ** 2, diff: () => [2, "sec^2(x) tan x"], slip: null },
  { f: () => "eˣ", F: () => [1, "e^x"], g: (x) => Math.exp(x), diff: () => [1, "e^x"], slip: null },
  { f: () => "(1/x)", F: () => [1, "log|x|"], g: (x) => 1 / x, diff: () => [-1, "1/x^2"], slip: null },
  { f: () => "cosec²x", F: () => [-1, "cot x"], g: (x) => 1 / Math.sin(x) ** 2, diff: () => [-2, "cosec^2(x) cot x"], slip: () => [1, "cot x"] },
  { f: () => "sec x tan x", F: () => [1, "sec x"], g: (x) => Math.tan(x) / Math.cos(x), diff: () => [1, "(sec x tan^2(x) + sec^3(x))"], slip: null },
];
const termStr = (c: number, m: string) => sum([[c, m]]);
const antiSum = (parts: [number, string][]) => `${sum(parts)} + C`;
/** [i, j, c1, c2, n]: ∫ (c1·fᵢ + c2·fⱼ) dx. */
const austd = F({
  id: "austd",
  arity: 5,
  title: "Antiderivatives of the standard functions",
  competency: IND,
  type: "antiderivative",
  mc: true,
  prompt: ([i, j, c1, c2, n]) => `Find ∫ (${sum([[c1, STD[i].f(n)], [c2, STD[j].f(n)]])}) dx.`,
  solve: ([i, j, c1, c2, n]) => {
    const [a1, m1] = STD[i].F(n);
    const [a2, m2] = STD[j].F(n);
    const ans = antiSum([[c1 * a1, m1], [c2 * a2, m2]]);
    return { steps: [st("each", "integrate", IND, `Integrate term by term: ∫ ${STD[i].f(n)} dx = ${termStr(a1, m1)} and ∫ ${STD[j].f(n)} dx = ${termStr(a2, m2)}`, `${termStr(a1, m1)}, ${termStr(a2, m2)}`), st("sum", "combine", IND, `Multiply by the constants and add C: ${ans}`, ans)], answer: ans };
  },
  // independent: the derivative of the answer (central differences) is the integrand
  validate: ([i, j, c1, c2, n], v) => derivAgrees(v, (x) => c1 * STD[i].g(x, n) + c2 * STD[j].g(x, n), XSMALL),
  bugs: ([i, j, c1, c2, n]) => {
    const [a1, m1] = STD[i].F(n);
    const [a2, m2] = STD[j].F(n);
    const [d1_, e1] = STD[i].diff(n);
    const [d2_, e2] = STD[j].diff(n);
    const out: Bug[] = [bug("differentiated", "conceptual", IND, "Each term was differentiated instead of integrated; an antiderivative is a function whose derivative is the integrand.", antiSum([[c1 * d1_, e1], [c2 * d2_, e2]]))];
    const s1 = STD[i].slip?.(n);
    const s2 = STD[j].slip?.(n);
    if (i === 0) out.push(bug("power-not-divided", "recall", IND, `∫ x${sup(n)} dx was written as x${sup(n + 1)}; the new power also divides: x${sup(n + 1)}/${n + 1}.`, antiSum([[c1 * s1![0], s1![1]], [c2 * a2, m2]])));
    const trig = [s1 && i !== 0 ? 1 : 0, s2 ? 1 : 0];
    if (trig[0] || trig[1]) out.push(bug("trig-sign", "recall", IND, "A sign was lost: ∫ sin x dx = −cos x, ∫ cos x dx = sin x and ∫ cosec²x dx = −cot x.", antiSum([trig[0] ? [c1 * s1![0], s1![1]] : [c1 * a1, m1], trig[1] ? [c2 * s2![0], s2![1]] : [c2 * a2, m2]])));
    return out;
  },
  distractors: ([i, j, c1, c2, n]) => {
    const [a1, m1] = STD[i].F(n);
    const [a2, m2] = STD[j].F(n);
    return [antiSum([[-c1 * a1, m1], [c2 * a2, m2]]), antiSum([[c1 * a1, m1], [-c2 * a2, m2]])];
  },
  domain: [[0, 6], [1, 7], [-6, 6], [-6, 6], [2, 6]],
  keep: ([i, j, c1, c2, n]) => i < j && c1 !== 0 && c2 !== 0 && (i === 0 ? true : n === 2) && !(i === 3 && j === 7) && !(i === 6 && j === 7),
  why: "Two of xⁿ, sin x, cos x, sec²x, eˣ, 1/x, cosec²x and sec x tan x, with whole-number coefficients.",
  cap: 400,
  difficulty: ([i, j]) => (i <= 2 && j <= 2 ? 1 : j >= 6 ? 3 : 2),
  teach: {
    idea: "Integration undoes differentiation, so each standard derivative read backwards is a standard integral: (sin x)′ = cos x gives ∫ cos x dx = sin x + C, (tan x)′ = sec²x gives ∫ sec²x dx = tan x + C, (log|x|)′ = 1/x, and so on.",
    method: "Integrate term by term (constants stay in front): ∫ xⁿ dx = xⁿ⁺¹/(n + 1), ∫ sin x = −cos x, ∫ cos x = sin x, ∫ sec²x = tan x, ∫ cosec²x = −cot x, ∫ sec x tan x = sec x, ∫ eˣ = eˣ, ∫ 1/x = log|x|; add one constant C.",
    alternatives: [
      { id: "check", title: "Differentiate to check", kind: "procedural", text: ["Differentiate your answer.", "If you get back the integrand, the answer is right."] },
      { id: "table", title: "Read the derivative table backwards", kind: "conceptual", text: ["Write the table of standard derivatives.", "Each line, read from right to left, is an integral."] },
    ],
  },
  limits: "Sums of two standard functions; the log answer is written log|x| (natural logarithm).",
});

/** [k, a, b, n]: ∫ f(ax + b) dx for (ax + b)ⁿ, cos, sin, e^, 1/(ax + b). */
const lxIn = ([, a, b]: number[]) => lin_(a, b);
const lxG = ([k, a, b, n]: number[]) => (x: number) => {
  const u = a * x + b;
  return k === 0 ? u ** n : k === 1 ? Math.cos(u) : k === 2 ? Math.sin(u) : k === 3 ? Math.exp(u) : 1 / u;
};
const lxF = (p: number[], div: number) => {
  const [k, , , n] = p;
  const u = lxIn(p);
  const c = (x: number) => (near(x, 1, 1e-12) ? "" : near(x, -1, 1e-12) ? "−" : `(${nf(x)})`);
  return k === 0 ? `${c(1 / (div * (n + 1)))}(${u})^${n + 1} + C` : k === 1 ? `${c(1 / div)}sin(${u}) + C` : k === 2 ? `${c(-1 / div)}cos(${u}) + C` : k === 3 ? `${c(1 / div)}e^(${u}) + C` : `${c(1 / div)}log|${u}| + C`;
};
const aulax = F({
  id: "aulax",
  arity: 4,
  title: "Antiderivatives of f(ax + b)",
  competency: IND,
  type: "antiderivative",
  mc: true,
  prompt: (p) => {
    const [k, , , n] = p;
    const u = lxIn(p);
    const f = k === 0 ? `(${u})${sup(n)}` : k === 1 ? `cos(${u})` : k === 2 ? `sin(${u})` : k === 3 ? `e^(${u})` : `1/(${u})`;
    return `Find ∫ ${f} dx.`;
  },
  solve: (p) => {
    const ans = lxF(p, p[1]);
    return { steps: [st("rule", "recall", IND, `If ∫ f(x) dx = F(x) + C, then ∫ f(ax + b) dx = F(ax + b)/a + C, with a = ${p[1]}`, "F(ax + b)/a"), st("apply", "integrate", IND, ans, ans)], answer: ans };
  },
  // independent: central differences of the answer give back the integrand
  validate: (p, v) => derivAgrees(v, lxG(p), XSMALL),
  bugs: (p) => [
    bug("not-divided", "procedural", IND, `The result was not divided by ${p[1]}; differentiating F(ax + b) brings out a factor a, so the integral must divide by it.`, lxF(p, 1)),
    bug("multiplied", "procedural", IND, `The result was multiplied by ${p[1]} instead of divided; that is what differentiating does.`, lxF(p, 1 / p[1])),
    ...(p[0] === 0 ? [bug("power-not-divided", "recall", IND, `The new power ${p[3] + 1} was not used to divide.`, `(${nf(1 / p[1])})(${lxIn(p)})^${p[3] + 1} + C`.replace(/^\(1\)/, ""))] : []),
  ],
  distractors: (p) => [lxF(p, -p[1]), lxF(p, 2 * p[1])],
  domain: [[0, 4], [2, 6], [-5, 5], [2, 5]],
  keep: ([k, , b, n]) => b !== 0 && (k === 0 ? true : n === 2),
  why: "(ax + b)ⁿ, cos(ax + b), sin(ax + b), e^(ax + b) and 1/(ax + b) with a from 2 to 6.",
  cap: 300,
  difficulty: ([k]) => (k === 3 || k === 0 ? 1 : k === 4 ? 2 : 2),
  teach: {
    idea: "By the chain rule, d/dx F(ax + b) = a F′(ax + b). So to integrate f(ax + b), take the usual antiderivative F at ax + b and divide by a.",
    method: "Integrate as if ax + b were x, then divide by a: ∫ cos(ax + b) dx = sin(ax + b)/a + C, ∫ (ax + b)ⁿ dx = (ax + b)ⁿ⁺¹/(a(n + 1)) + C, ∫ 1/(ax + b) dx = log|ax + b|/a + C.",
    alternatives: [
      { id: "substitute", title: "Substitute u = ax + b", kind: "procedural", text: ["Let u = ax + b, so du = a dx and dx = du/a.", "Integrate in u and put back u = ax + b."] },
      { id: "check", title: "Differentiate back", kind: "conceptual", text: ["Differentiate your answer with the chain rule.", "The factor a must cancel the 1/a."] },
    ],
  },
  limits: "Linear inside functions with a from 2 to 6; sec²(ax + b) is left out.",
});

/** [p, q, r, x0, v]: f′(x) = px² + qx + r, f(x0) = v. */
const initF = ([p, q, r]: number[]) => (x: number) => (p * x ** 3) / 3 + (q * x * x) / 2 + r * x;
const initC = (P: number[]) => P[4] - initF(P)(P[3]);
const initStr = (P: number[], C: number) => sum([[P[0] / 3, "x³"], [P[1] / 2, "x²"], [P[2], "x"], [C, ""]]);
const auinit = F({
  id: "auinit",
  arity: 5,
  title: "Finding a function from its derivative and one value",
  competency: IND,
  type: "exact",
  mc: true,
  prompt: (P) => `f′(x) = ${sum([[P[0], "x²"], [P[1], "x"], [P[2], ""]])} and f(${P[3]}) = ${P[4]}. Find f(x).`,
  solve: (P) => {
    const C = initC(P);
    return {
      steps: [
        st("integrate", "integrate", IND, `Integrate: f(x) = ${initStr(P, 0)} + C`, `${initStr(P, 0)} + C`),
        st("constant", "substitute", IND, `Put x = ${P[3]}: ${nf(initF(P)(P[3]))} + C = ${P[4]}, so C = ${nf(C)}`, C),
        st("answer", "write", IND, `f(x) = ${initStr(P, C)}`, initStr(P, C)),
      ],
      answer: initStr(P, C),
    };
  },
  // independent: the derivative of the answer (central differences) is f′, and the answer has the given value
  validate: (P, v) => derivAgrees(v, (x) => P[0] * x * x + P[1] * x + P[2], XS) && Math.abs(ev(node(v), { x: P[3] }) - P[4]) < 1e-9,
  bugs: (P) => [
    bug("no-constant", "conceptual", IND, "The constant of integration was left out; the given value of f is there to find it.", initStr(P, 0)),
    bug("constant-is-value", "procedural", IND, `C was taken to be ${P[4]}; that is only true when the given value is at x = 0.`, initStr(P, P[4])),
    bug("powers-not-divided", "recall", IND, "The powers were raised but not divided by the new power.", sum([[P[0], "x³"], [P[1], "x²"], [P[2], "x"], [P[4] - (P[0] + P[1] + P[2]) * P[3], ""]])),
  ],
  distractors: (P) => [initStr(P, initC(P) + 1), initStr(P, -initC(P))],
  domain: [[0, 6], [-6, 6], [1, 20], [0, 1], [5, 60]],
  keep: ([p, q, , , v]) => (p !== 0 || q !== 0) && v % 5 === 0,
  why: "Quadratic derivatives with small whole-number coefficients and one value of f at x = 0 or x = 1.",
  cap: 400,
  difficulty: ([p, q, , x0]) => (x0 === 0 && p % 3 === 0 && q % 2 === 0 ? 1 : x0 === 1 ? 3 : 2),
  word: (P) =>
    P[3] === 0
      ? `For a small printing business, the marginal cost of printing x thousand pages is C′(x) = ${sum([[P[0], "x²"], [P[1], "x"], [P[2], ""]])} hundred rupees per thousand pages, and the fixed cost (the cost when x = 0) is ${P[4]} hundred rupees. Find the total cost C(x), in hundreds of rupees.`
      : `For a small printing business, the marginal cost of printing x thousand pages is C′(x) = ${sum([[P[0], "x²"], [P[1], "x"], [P[2], ""]])} hundred rupees per thousand pages, and printing 1 thousand pages costs ${P[4]} hundred rupees in all. Find the total cost C(x), in hundreds of rupees.`,
  teach: {
    idea: "All the antiderivatives of f′ differ by a constant: their graphs are the same curve shifted up or down. One known value picks out the one curve that passes through that point.",
    method: "Integrate f′ term by term, add C, substitute the given x and f(x), and solve for C.",
    alternatives: [
      { id: "family", title: "A family of curves", kind: "conceptual", text: ["Sketch y = F(x) + C for several C: parallel copies of one curve.", "The given point lies on exactly one of them."] },
      { id: "check", title: "Check both conditions", kind: "procedural", text: ["Differentiate your answer: it must give f′(x).", "Put in the given x: it must give the given value."] },
    ],
  },
  limits: "Quadratic derivatives and one value at x = 0 or 1.",
});

// ================================================================ integration methods

/** [k, a, b, c]: k = 0 sin²(ax), 1 cos²(ax), 2 sin(ax)cos(bx), 3 tan²(ax), 4 (2ax + b)/(ax² + bx + c), 5 x cos(ax² + b). */
const trG = ([k, a, b, c]: number[]) => (x: number) => (k === 0 ? Math.sin(a * x) ** 2 : k === 1 ? Math.cos(a * x) ** 2 : k === 2 ? Math.sin(a * x) * Math.cos(b * x) : k === 3 ? Math.tan(a * x) ** 2 : k === 4 ? (2 * a * x + b) / (a * x * x + b * x + c) : x * Math.cos(a * x * x + b));
const trAns = ([k, a, b, c]: number[]): string => {
  const ax = ax_(a);
  const q = (x: number) => (near(x, 1, 1e-12) ? "" : near(x, -1, 1e-12) ? "−" : `(${nf(x)})`);
  if (k === 0) return `x/2 − sin(${ax_(2 * a)})/${4 * a} + C`;
  if (k === 1) return `x/2 + sin(${ax_(2 * a)})/${4 * a} + C`;
  if (k === 2) {
    const s = a + b;
    const d = a - b;
    return `${q(-1 / (2 * s))}cos(${ax_(s)}) ${-1 / (2 * d) < 0 ? "−" : "+"} (${nf(Math.abs(1 / (2 * d)))})cos(${ax_(Math.abs(d))}) + C`;
  }
  if (k === 3) return `${q(1 / a)}tan(${ax}) − x + C`;
  if (k === 4) return `log|${sum([[a, "x²"], [b, "x"], [c, ""]])}| + C`;
  return `${q(1 / (2 * a))}sin(${sum([[a, "x²"], [b, ""]])}) + C`;
};
const trPts = (p: number[]) => XSMALL.filter((x) => (p[0] === 3 ? Math.abs(Math.cos(p[1] * x)) > 0.25 : true));
const autrig = F({
  id: "autrig",
  arity: 4,
  title: "Integration using trigonometric identities and substitution",
  competency: IM,
  type: "antiderivative",
  mc: true,
  prompt: (p) => {
    const [k, a, b, c] = p;
    const ax = ax_(a);
    const f = k === 0 ? `sin²(${ax})` : k === 1 ? `cos²(${ax})` : k === 2 ? `sin(${ax}) cos(${ax_(b)})` : k === 3 ? `tan²(${ax})` : k === 4 ? `(${sum([[2 * a, "x"], [b, ""]])})/(${sum([[a, "x²"], [b, "x"], [c, ""]])})` : `x cos(${sum([[a, "x²"], [b, ""]])})`;
    return `Find ∫ ${f} dx.${k === 4 ? " (log is the natural logarithm.)" : ""}`;
  },
  solve: (p) => {
    const k = p[0];
    const how = ["Use sin²θ = (1 − cos 2θ)/2", "Use cos²θ = (1 + cos 2θ)/2", "Use 2 sin A cos B = sin(A + B) + sin(A − B)", "Use tan²θ = sec²θ − 1", "The top is the derivative of the bottom: substitute u = bottom, ∫ du/u = log|u|", "Substitute u = the inside of cos: du = 2a x dx"][k];
    const ans = trAns(p);
    return { steps: [st("identity", "rewrite", k >= 4 ? IM : "MATH.trigonometry.identities", how, how), st("integrate", "integrate", IM, ans, ans)], answer: ans };
  },
  // independent: central differences of the answer give back the integrand
  validate: (p, v) => derivAgrees(v, trG(p), trPts(p)),
  bugs: (p) => {
    const [k, a, b, c] = p;
    const ax = ax_(a);
    if (k === 0) return [bug("power-rule-on-sin", "conceptual", IM, "sin²(ax) was integrated like a power of x; there is no power rule for sin, so rewrite it with the double-angle identity first.", `sin^3(${ax})/${3 * a} + C`), bug("identity-sign", "recall", "MATH.trigonometry.identities", "The identity was used with the wrong sign: sin²θ = (1 − cos 2θ)/2.", `x/2 + sin(${ax_(2 * a)})/${4 * a} + C`)];
    if (k === 1) return [bug("identity-sign", "recall", "MATH.trigonometry.identities", "The identity was used with the wrong sign: cos²θ = (1 + cos 2θ)/2.", `x/2 − sin(${ax_(2 * a)})/${4 * a} + C`), bug("power-rule-on-cos", "conceptual", IM, "cos²(ax) was integrated like a power of x; rewrite it with the double-angle identity first.", `cos^3(${ax})/${3 * a} + C`)];
    if (k === 2) return [bug("product-of-integrals", "conceptual", IM, "The two factors were integrated separately and multiplied; the integral of a product is not the product of the integrals.", `(${nf(-1 / (a * b))})cos(${ax}) sin(${ax_(b)}) + C`)];
    if (k === 3) return [bug("minus-x", "recall", "MATH.trigonometry.identities", "tan²θ was integrated as if it were sec²θ; tan²θ = sec²θ − 1, so a − x appears.", `${a === 1 ? "" : `(1/${a})`}tan(${ax}) + C`), bug("power-rule-on-tan", "conceptual", IM, "tan² was integrated like a power of x.", `tan^3(${ax})/${3 * a} + C`)];
    if (k === 4) return [bug("top-times-log", "procedural", IM, "The top was kept in front of the logarithm; after substituting u = bottom, the top together with dx is exactly du.", `(${sum([[2 * a, "x"], [b, ""]])})log|${sum([[a, "x²"], [b, "x"], [c, ""]])}| + C`)];
    return [bug("factor-forgotten", "procedural", IM, `du = ${2 * a}x dx, so x dx = du/${2 * a}; the factor 1/${2 * a} was left out.`, `sin(${sum([[a, "x²"], [b, ""]])}) + C`)];
  },
  distractors: (p) => {
    const ans = trAns(p).replace(/ \+ C$/, "");
    return [`−(${ans}) + C`, `2(${ans}) + C`];
  },
  domain: [[0, 5], [1, 6], [-6, 6], [-9, 9]],
  keep: ([k, a, b, c]) => (k <= 1 || k === 3 ? b === 1 && c === 1 : k === 2 ? b >= 1 && b !== a && c === 1 : k === 4 ? b !== 0 && c !== 0 && b * b - 4 * a * c < 0 : b !== 0 && c === 1),
  why: "sin², cos², tan² of ax, sin ax cos bx, f′/f with a quadratic, and x cos(ax² + b).",
  cap: 400,
  difficulty: ([k]) => (k === 4 ? 1 : k === 2 ? 3 : 2),
  teach: {
    idea: "Powers and products of sines and cosines are not standard integrals, but trigonometric identities turn them into sums of single sines and cosines, which are. A substitution u = g(x) works when g′(x) is also present.",
    method: "Rewrite: sin²θ = (1 − cos 2θ)/2, cos²θ = (1 + cos 2θ)/2, tan²θ = sec²θ − 1, 2 sin A cos B = sin(A + B) + sin(A − B). Then integrate term by term. For f′(x)/f(x) the answer is log|f(x)| + C.",
    alternatives: [
      { id: "substitution", title: "Substitute and change dx", kind: "procedural", text: ["Choose u as the inside function; write du in terms of dx.", "Every x must disappear before integrating in u."] },
      { id: "check", title: "Differentiate back", kind: "conceptual", text: ["Differentiate your answer.", "Use the identity again to see it equals the integrand."] },
    ],
  },
  limits: "Single identities or one substitution; products of three factors and odd powers above 2 are not included.",
});

/** [k, a, h, p, q]: standard forms with logarithmic answers; (x + h) is the completed square. */
const sfG = ([k, a, h, p, q]: number[]) => (x: number) => {
  const u = x + h;
  return k === 0 ? 1 / (u * u - a * a) : k === 1 ? 1 / (a * a - x * x) : k === 2 ? 1 / Math.sqrt(u * u + a * a) : k === 3 ? Math.sqrt(x * x + a * a) : (p * x + q) / (u * u - a * a);
};
const sfQuad = ([k, a, h]: number[]) => (k === 2 ? sum([[1, "x²"], [2 * h, "x"], [h * h + a * a, ""]]) : sum([[1, "x²"], [2 * h, "x"], [h * h - a * a, ""]]));
const sfAns = (P: number[], slip = ""): string => {
  const [k, a, h, p, q] = P;
  const u = sum([[1, "x"], [h, ""]]);
  const L = `log|(${sum([[1, "x"], [h - a, ""]])})/(${sum([[1, "x"], [h + a, ""]])})|`;
  if (k === 0) return slip === "no-factor" ? `${L} + C` : slip === "swap" ? `(1/${2 * a})log|(${sum([[1, "x"], [h + a, ""]])})/(${sum([[1, "x"], [h - a, ""]])})| + C` : `(1/${2 * a})${L} + C`;
  if (k === 1) return slip === "no-factor" ? `log|(${a} + x)/(${a} − x)| + C` : slip === "swap" ? `(1/${2 * a})log|(${a} − x)/(${a} + x)| + C` : `(1/${2 * a})log|(${a} + x)/(${a} − x)| + C`;
  if (k === 2) return slip === "no-x" ? `log|√(${sfQuad(P)})| + C` : slip === "power" ? `2√(${sfQuad(P)}) + C` : `log|${u} + √(${sfQuad(P)})| + C`;
  if (k === 3) return slip === "no-log" ? `(x/2)√(x² + ${a * a}) + C` : slip === "half-log" ? `(x/2)√(x² + ${a * a}) + ${a * a}log|x + √(x² + ${a * a})| + C` : `(x/2)√(x² + ${a * a}) + (${rat(a * a, 2)})log|x + √(x² + ${a * a})| + C`;
  const B = q - p * h;
  const first = `(${rat(p, 2)})log|${sfQuad(P)}|`;
  if (slip === "first-only") return `${first} + C`;
  return `${first} ${B < 0 ? "−" : "+"} (${rat(Math.abs(B), 2 * a)})${L} + C`;
};
const auform = F({
  id: "auform",
  arity: 5,
  title: "Integrals of the standard forms 1/(x² − a²), 1/(a² − x²), 1/√(x² + a²), √(x² + a²) and (px + q)/(x² + bx + c)",
  competency: IM,
  type: "antiderivative",
  mc: true,
  prompt: (P) => {
    const [k, a, , p, q] = P;
    const f = k === 0 ? `1/(${sfQuad(P)})` : k === 1 ? `1/(${a * a} − x²)` : k === 2 ? `1/√(${sfQuad(P)})` : k === 3 ? `√(x² + ${a * a})` : `(${sum([[p, "x"], [q, ""]])})/(${sfQuad(P)})`;
    return `Find ∫ ${f} dx. (log is the natural logarithm.)`;
  },
  solve: (P) => {
    const [k, a, h] = P;
    const sq = k === 2 ? `(x ${signed(h)})² + ${a}²` : `(x ${signed(h)})² − ${a}²`;
    const form = ["∫ dx/(u² − a²) = (1/2a) log|(u − a)/(u + a)|", "∫ dx/(a² − x²) = (1/2a) log|(a + x)/(a − x)|", "∫ dx/√(u² + a²) = log|u + √(u² + a²)|", "∫ √(x² + a²) dx = (x/2)√(x² + a²) + (a²/2) log|x + √(x² + a²)|", "write px + q = (p/2)(2x + b) + B: a log part and a 1/(u² − a²) part"][k];
    const ans = sfAns(P);
    return { steps: [st("square", "complete the square", QUAD, k === 1 || k === 3 ? `The form is already standard, with a = ${a}` : `Complete the square: ${sfQuad(P)} = ${sq.replace("x + 0", "x").replace("(x + 0)", "x")}`, a), st("form", "recall", IM, form, form), st("answer", "integrate", IM, ans, ans)], answer: ans };
  },
  // independent: central differences of the answer give back the integrand
  validate: (P, v) => derivAgrees(v, sfG(P), [0.43, 0.71, 1.23, 1.91, 2.27, 2.83, 3.37].filter((x) => Math.abs(Math.abs(x + P[2]) - P[1]) > 0.2)),
  bugs: (P) => {
    const k = P[0];
    if (k <= 1) return [bug("no-factor", "recall", IM, `The factor 1/(2a) = 1/${2 * P[1]} in front of the logarithm was left out.`, sfAns(P, "no-factor")), bug("swap", "recall", IM, "The fraction inside the logarithm was turned upside down, which changes the sign of the answer.", sfAns(P, "swap"))];
    if (k === 2) return [bug("no-x", "recall", IM, "The u inside the logarithm was left out: the form is log|u + √(u² + a²)|.", sfAns(P, "no-x")), bug("power", "conceptual", IM, "The power rule was used as if the top were the derivative of the inside; it is not, so this is the standard logarithmic form.", sfAns(P, "power"))];
    if (k === 3) return [bug("no-log", "recall", IM, "Only the first part of the standard result was written; the (a²/2) log|x + √(x² + a²)| part is needed too.", sfAns(P, "no-log")), bug("half-log", "recall", IM, "The coefficient of the logarithm is a²/2, not a².", sfAns(P, "half-log"))];
    return [bug("first-only", "procedural", IM, "Only the log|x² + bx + c| part was integrated; after writing px + q = (p/2)(2x + b) + B, the constant B gives a second, standard-form integral.", sfAns(P, "first-only"))];
  },
  distractors: (P) => {
    const ans = sfAns(P).replace(/ \+ C$/, "");
    return [`−(${ans}) + C`, `2(${ans}) + C`];
  },
  domain: [[0, 4], [1, 6], [-4, 4], [1, 6], [-6, 6]],
  keep: ([k, a, h, p, q]) => (k === 1 || k === 3 ? h === 0 && p === 1 && q === 0 : k === 4 ? h * h !== a * a && q - p * h !== 0 && h !== 0 : h * h !== a * a && p === 1 && q === 0) && (k === 1 ? a >= 3 : true),
  why: "Standard forms with a from 1 to 6, reached by completing the square x² + 2hx + h² ∓ a²; tan⁻¹ and sin⁻¹ forms are in the definite family aupi.",
  cap: 400,
  difficulty: ([k, , h]) => (k === 1 || (k === 0 && h === 0) ? 1 : k === 4 ? 3 : 2),
  teach: {
    idea: "Completing the square turns x² + bx + c into (x + h)² ± a², and each such shape has a standard antiderivative; a linear top px + q is split into a multiple of the bottom's derivative plus a constant.",
    method: "Complete the square; match the form; write the standard result with u = x + h. For (px + q)/(x² + bx + c), write px + q = (p/2)(2x + b) + B: the first part gives (p/2) log|x² + bx + c|, the second a standard form.",
    alternatives: [
      { id: "partial_fractions", title: "Partial fractions", kind: "procedural", text: ["1/(x² − a²) = (1/2a)[1/(x − a) − 1/(x + a)].", "Integrating gives (1/2a)(log|x − a| − log|x + a|), the same result."] },
      { id: "check", title: "Differentiate back", kind: "conceptual", text: ["Differentiate your answer.", "It must give back the integrand at every x where both are defined."] },
    ],
  },
  limits: "Logarithmic standard forms; 1/(x² + a²) and 1/√(a² − x²), whose antiderivatives are inverse trigonometric, are assessed as definite integrals in aupi.",
});

/** [k, a, c]: definite standard forms with values in π. */
const piVal = ([k, a, c]: number[]): [number, number] => (k === 0 ? [c, 4 * a] : k === 1 ? [c, 6] : k === 2 ? [a * a, 4] : k === 3 ? [c, 2 * a] : [c, 3 * a]);
function piQ(n: number, d: number): string {
  if (d < 0) [n, d] = [-n, -d];
  const g = gcd(n, d) || 1;
  const [N, D] = [n / g, d / g];
  return `${N === 1 ? "" : N === -1 ? "−" : mn(String(N))}π${D === 1 ? "" : `/${D}`}`;
}
const piG = ([k, a, c]: number[]) => (x: number) => (k === 1 ? c / Math.sqrt(a * a - x * x) : k === 2 ? Math.sqrt(a * a - x * x) : c / (x * x + a * a));
const piLim = ([k, a]: number[]): [number, number] => (k === 0 ? [0, a] : k === 1 ? [0, a / 2] : k === 2 ? [0, a] : k === 3 ? [-a, a] : [0, a * Math.sqrt(3)]);
const aupi = F({
  id: "aupi",
  arity: 3,
  title: "Definite integrals of 1/(x² + a²), 1/√(a² − x²) and √(a² − x²)",
  competency: IM,
  type: "exact",
  mc: true,
  prompt: (P) => {
    const [k, a, c] = P;
    const lims = k === 0 ? ["0", `${a}`] : k === 1 ? ["0", rat(a, 2)] : k === 2 ? ["0", `${a}`] : k === 3 ? [`−${a}`, `${a}`] : ["0", `${a === 1 ? "" : a}√3`];
    const f = k === 1 ? `${c}/√(${a * a} − x²)` : k === 2 ? `√(${a * a} − x²)` : `${c}/(x² + ${a * a})`;
    return `Evaluate ∫ from ${lims[0]} to ${lims[1]} of ${f} dx. Give the exact value in terms of π.`;
  },
  solve: (P) => {
    const [k, a] = P;
    const [n, d] = piVal(P);
    const form = k === 1 ? `∫ dx/√(a² − x²) = sin⁻¹(x/a): sin⁻¹(1/2) − sin⁻¹(0) = π/6` : k === 2 ? `∫ √(a² − x²) dx = (x/2)√(a² − x²) + (a²/2) sin⁻¹(x/a): at x = ${a} this is (${a * a}/2)(π/2)` : `∫ dx/(x² + a²) = (1/a) tan⁻¹(x/a): (1/${a})[tan⁻¹ at the limits] = (1/${a}) × ${k === 0 ? "π/4" : k === 3 ? "π/2" : "π/3"}`;
    return { steps: [st("form", "recall", IM, form, form), st("value", "evaluate", DEF, `= ${piQ(n, d)}`, piQ(n, d))], answer: piQ(n, d) };
  },
  // independent: Simpson's rule
  validate: (P, v) => {
    const [lo, hi] = piLim(P);
    const x = constOf(v);
    return Number.isFinite(x) && near(x, simpson(piG(P), lo, hi), 1e-8);
  },
  bugs: (P) => {
    const [k, a, c] = P;
    const [n, d] = piVal(P);
    if (k === 1) return [bug("sixty-degrees", "recall", "MATH.trigonometry.inverse", "sin⁻¹(1/2) was taken as π/3; the angle whose sine is 1/2 is π/6.", piQ(c, 3)), bug("degrees", "recall", "MATH.trigonometry.inverse", "The angle was given in degrees; in calculus, angles are in radians.", `${30 * c}`)];
    if (k === 2) return [bug("whole-circle", "conceptual", DEF, "The area of the whole circle was given; from 0 to a under the upper half is a quarter of the circle.", piQ(a * a, 1)), bug("half-circle", "conceptual", DEF, "Half the circle was given; this integral is a quarter of the circle (from 0 to a only).", piQ(a * a, 2))];
    return [bug("no-one-over-a", "recall", IM, `The factor 1/a = 1/${a} in front of tan⁻¹ was left out.`, a !== 1 ? piQ(n * a, d) : null), bug("degrees", "recall", "MATH.trigonometry.inverse", "The angle was given in degrees; in calculus, angles are in radians.", rat(c * (k === 0 ? 45 : k === 3 ? 90 : 60), a))];
  },
  distractors: (P) => {
    const [n, d] = piVal(P);
    return [piQ(2 * n, d), piQ(n, 2 * d), rat(n, d)];
  },
  range: [0, Infinity],
  domain: [[0, 4], [1, 9], [1, 6]],
  keep: ([k, , c]) => (k === 2 ? c === 1 : true),
  why: "Five definite standard forms with a from 1 to 9 and a whole-number factor up to 6.",
  cap: 300,
  difficulty: ([k]) => (k === 0 ? 1 : k === 4 || k === 2 ? 3 : 2),
  teach: {
    idea: "d/dx tan⁻¹(x/a) = a/(a² + x²) and d/dx sin⁻¹(x/a) = 1/√(a² − x²), so these integrands have inverse trigonometric antiderivatives; their values at the limits are standard angles. ∫₀ᵃ √(a² − x²) dx is a quarter of a circle of radius a.",
    method: "∫ dx/(x² + a²) = (1/a) tan⁻¹(x/a) + C; ∫ dx/√(a² − x²) = sin⁻¹(x/a) + C; ∫ √(a² − x²) dx = (x/2)√(a² − x²) + (a²/2) sin⁻¹(x/a) + C. Evaluate at the limits in radians.",
    alternatives: [
      { id: "trig_sub", title: "Substitute x = a tan θ or x = a sin θ", kind: "procedural", text: ["With x = a tan θ, dx = a sec²θ dθ and x² + a² = a² sec²θ: the integrand becomes (1/a) dθ.", "Change the limits to angles and integrate."] },
      { id: "circle", title: "A quarter circle", kind: "conceptual", text: ["y = √(a² − x²) is the upper half of the circle x² + y² = a².", "From 0 to a it covers a quarter of the area πa²."] },
    ],
  },
  limits: "Limits that give standard angles (π/6, π/4, π/3, π/2); answers are exact multiples of π.",
});

/** [k, a, b, A, B]: k = 0 [A/(x − a) + B/(x − a)²]; k = 1 1 + A/(x − a) + B/(x − b) over (x − a)(x − b). */
const pfG = ([k, a, b, A, B]: number[]) => (x: number) => (k === 0 ? A / (x - a) + B / (x - a) ** 2 : 1 + A / (x - a) + B / (x - b));
const xm = (a: number) => sum([[1, "x"], [-a, ""]]);
const pfAns = ([k, a, b, A, B]: number[], slip = "") => {
  const L = (c: number, r: number) => (c === 0 ? null : `${sum([[c, `log|${xm(r)}|`]])}`);
  if (k === 0) {
    const t = (sg: number) => `${sg > 0 ? "+" : "−"} ${Math.abs(B)}/(${xm(a)})`;
    if (slip === "sign") return `${L(A, a)} ${t(B)} + C`;
    if (slip === "logs") return `${sum([[A + B, `log|${xm(a)}|`]])} + C`;
    return `${L(A, a)} ${t(-B)} + C`;
  }
  const parts = [L(A, a), L(B, b)].filter(Boolean).join(" + ").replace(/\+ −/g, "− ");
  if (slip === "no-x") return `${parts} + C`;
  if (slip === "swap") return `x + ${[L(B, a), L(A, b)].filter(Boolean).join(" + ")} + C`.replace(/\+ −/g, "− ");
  return `x + ${parts} + C`.replace(/\+ −/g, "− ");
};
const aupfr = F({
  id: "aupfr",
  arity: 5,
  title: "Integrating by partial fractions: repeated factors and improper fractions",
  competency: IM,
  type: "antiderivative",
  mc: true,
  prompt: (P) => {
    const [k, a, b, A, B] = P;
    if (k === 0) return `Find ∫ (${sum([[A, "x"], [B - A * a, ""]])})/(${xm(a)})² dx.`;
    const num = sum([[1, "x²"], [-(a + b) + A + B, "x"], [a * b - A * b - B * a, ""]]);
    return `Find ∫ (${num})/(${sum([[1, "x²"], [-(a + b), "x"], [a * b, ""]])}) dx. (log is the natural logarithm.)`;
  },
  solve: (P) => {
    const [k, a, b, A, B] = P;
    const ans = pfAns(P);
    if (k === 0) return { steps: [st("split", "partial fractions", "MATH.algebra.partial-fractions", `Write the integrand as A/(x − a) + B/(x − a)²: ${A}/(${xm(a)}) + ${pn(B)}/(${xm(a)})²`, `${A}, ${B}`), st("integrate", "integrate", IM, `∫ dx/(x − a)² = −1/(x − a): ${ans}`, ans)], answer: ans };
    return { steps: [st("divide", "divide", "MATH.algebra.polynomials", "The top and bottom have the same degree: divide first, giving 1 + (a proper fraction)", "1 + …"), st("split", "partial fractions", "MATH.algebra.partial-fractions", `The proper part is ${A}/(${xm(a)}) + ${pn(B)}/(${xm(b)})`, `${A}, ${B}`), st("integrate", "integrate", IM, ans, ans)], answer: ans };
  },
  // independent: central differences of the answer give back the integrand
  validate: (P, v) => derivAgrees(v, pfG(P), [-2.63, -1.37, -0.41, 0.43, 1.58, 2.27, 3.62].filter((x) => Math.abs(x - P[1]) > 0.2 && Math.abs(x - P[2]) > 0.2)),
  bugs: (P) =>
    P[0] === 0
      ? [bug("sign", "recall", IM, "∫ dx/(x − a)² was taken as +1/(x − a); differentiating 1/(x − a) gives −1/(x − a)², so the integral is −1/(x − a).", pfAns(P, "sign")), bug("all-logs", "conceptual", IM, "The repeated factor was integrated as a logarithm too; only 1/(x − a) gives a logarithm, 1/(x − a)² is a power.", pfAns(P, "logs"))]
      : [bug("no-division", "procedural", "MATH.algebra.polynomials", "The fraction was split without dividing first; when the top's degree is not less than the bottom's, the polynomial part (here 1, giving x) comes first.", pfAns(P, "no-x")), bug("swap", "procedural", "MATH.algebra.partial-fractions", "The two partial-fraction constants were attached to the wrong factors.", P[3] !== P[4] ? pfAns(P, "swap") : null)],
  distractors: (P) => {
    const ans = pfAns(P).replace(/ \+ C$/, "");
    return [`−(${ans}) + C`, `2(${ans}) + C`];
  },
  domain: [[0, 1], [-3, 3], [-3, 3], [-5, 5], [-5, 5]],
  keep: ([k, a, b, A, B]) => A !== 0 && B !== 0 && (k === 0 ? b === 0 : a < b),
  why: "A repeated linear factor (x − a)², or an improper fraction over (x − a)(x − b), with whole-number constants.",
  cap: 400,
  difficulty: ([k, , , A, B]) => (k === 0 && A > 0 && B > 0 ? 1 : k === 1 ? 3 : 2),
  teach: {
    idea: "A repeated factor (x − a)² needs two partial fractions, A/(x − a) + B/(x − a)²: the first integrates to a logarithm, the second to a power, −B/(x − a). An improper fraction (top degree ≥ bottom degree) is first divided to give a polynomial plus a proper fraction.",
    method: "If needed, divide. Split the proper part into partial fractions, find the constants (cover-up or comparing coefficients), integrate each term, add C.",
    alternatives: [
      { id: "substitute", title: "Substitute u = x − a", kind: "procedural", text: ["For a repeated factor, put u = x − a: the top becomes Au + B.", "∫ (Au + B)/u² du = A log|u| − B/u."] },
      { id: "check", title: "Differentiate back", kind: "conceptual", text: ["Differentiate your answer and add the fractions.", "You must get the original integrand."] },
    ],
  },
  limits: "One repeated linear factor, or an improper fraction over two distinct linear factors; irreducible quadratic factors are in aopfq (partial fractions) and aupi (tan⁻¹ forms).",
});

/** [k, a, n, c]: by parts — c·x e^(ax), c·x sin ax, c·x cos ax, c·xⁿ log(ax), c·eˣ[f + f′], c·x² e^(ax), c·x² cos ax. */
const EXF = [
  { f: "sin x", fp: "cos x", both: "sin x + cos x", g: (x: number) => Math.sin(x), gp: (x: number) => Math.cos(x) },
  { f: "log x", fp: "1/x", both: "log x + 1/x", g: (x: number) => Math.log(x), gp: (x: number) => 1 / x },
  { f: "1/x", fp: "(−1/x²)", both: "1/x − 1/x²", g: (x: number) => 1 / x, gp: (x: number) => -1 / (x * x) },
  { f: "x²", fp: "2x", both: "x² + 2x", g: (x: number) => x * x, gp: (x: number) => 2 * x },
  { f: "tan x", fp: "sec²x", both: "tan x + sec²x", g: (x: number) => Math.tan(x), gp: (x: number) => 1 / Math.cos(x) ** 2 },
];
const ptG = ([k, a, n, c]: number[]) => (x: number) =>
  c * (k === 0 ? x * Math.exp(a * x) : k === 1 ? x * Math.sin(a * x) : k === 2 ? x * Math.cos(a * x) : k === 3 ? x ** n * Math.log(a * x) : k === 4 ? Math.exp(x) * (EXF[a - 1].g(x) + EXF[a - 1].gp(x)) : k === 5 ? x * x * Math.exp(a * x) : x * x * Math.cos(a * x));
const ptAns = ([k, a, n, c]: number[], slip = ""): string => {
  const ax = ax_(a);
  const C = (s: string) => (c === 1 ? `${s} + C` : `${c}(${s}) + C`);
  if (k === 0) return C(slip === "sign" ? `(x/${a} + 1/${a * a})e^(${ax})` : slip === "product" ? `(x²/2)(e^(${ax})/${a})` : `(x/${a} − 1/${a * a})e^(${ax})`);
  if (k === 1) return C(slip === "sign" ? `x cos(${ax})/${a} + sin(${ax})/${a * a}` : slip === "product" ? `−(x²/2)cos(${ax})/${a}` : `−x cos(${ax})/${a} + sin(${ax})/${a * a}`);
  if (k === 2) return C(slip === "sign" ? `x sin(${ax})/${a} − cos(${ax})/${a * a}` : slip === "product" ? `(x²/2)sin(${ax})/${a}` : `x sin(${ax})/${a} + cos(${ax})/${a * a}`);
  if (k === 3) return C(slip === "first" ? `x^${n + 1} log(${ax})/${n + 1}` : slip === "sign" ? `x^${n + 1} log(${ax})/${n + 1} + x^${n + 1}/${(n + 1) ** 2}` : `x^${n + 1} log(${ax})/${n + 1} − x^${n + 1}/${(n + 1) ** 2}`);
  if (k === 4) return C(slip === "fp" ? `e^x ${EXF[a - 1].fp}` : slip === "both" ? `e^x (${EXF[a - 1].both})` : `e^x ${EXF[a - 1].f}`);
  if (k === 5) return C(slip === "first" ? `e^(${ax})(x²/${a} − 2x/${a * a})` : slip === "sign" ? `e^(${ax})(x²/${a} + 2x/${a * a} + 2/${a ** 3})` : `e^(${ax})(x²/${a} − 2x/${a * a} + 2/${a ** 3})`);
  return C(slip === "first" ? `x² sin(${ax})/${a} + 2x cos(${ax})/${a * a}` : slip === "sign" ? `x² sin(${ax})/${a} − 2x cos(${ax})/${a * a} + 2 sin(${ax})/${a ** 3}` : `x² sin(${ax})/${a} + 2x cos(${ax})/${a * a} − 2 sin(${ax})/${a ** 3}`);
};
const auparts = F({
  id: "auparts",
  arity: 4,
  title: "Integration by parts, Bernoulli's formula and ∫ eˣ[f(x) + f′(x)] dx",
  competency: IM,
  type: "antiderivative",
  mc: true,
  prompt: (P) => {
    const [k, a, n, c] = P;
    const ax = ax_(a);
    const cc_ = c === 1 ? "" : `${c}`;
    const f = k === 0 ? `${cc_}x e^(${ax})` : k === 1 ? `${cc_}x sin(${ax})` : k === 2 ? `${cc_}x cos(${ax})` : k === 3 ? `${cc_}${n === 0 ? "" : xpw(n) + " "}log(${ax})` : k === 4 ? `${cc_}eˣ(${EXF[a - 1].both})` : k === 5 ? `${cc_}x² e^(${ax})` : `${cc_}x² cos(${ax})`;
    return `Find ∫ ${f} dx${k === 3 || (k === 4 && a <= 2) ? " (x > 0; log is the natural logarithm)" : ""}.`;
  },
  solve: (P) => {
    const k = P[0];
    const ans = ptAns(P);
    const how = k === 4 ? "∫ eˣ[f(x) + f′(x)] dx = eˣ f(x) + C, because (eˣ f)′ = eˣ f + eˣ f′" : k === 3 ? "By parts with u = log(ax) and dv = xⁿ dx" : k >= 5 ? "Bernoulli's formula: ∫ u v dx = u v₁ − u′ v₂ + u″ v₃ − …, with u = x² (its derivatives end at 0) and v₁, v₂, v₃ the successive integrals of v" : "By parts with u = x (it becomes simpler when differentiated): ∫ u dv = uv − ∫ v du";
    return { steps: [st("choose", "by parts", IM, how, how), st("answer", "integrate", IM, ans, ans)], answer: ans };
  },
  // independent: central differences of the answer give back the integrand
  validate: (P, v) => derivAgrees(v, ptG(P), XSMALL),
  bugs: (P) => {
    const k = P[0];
    if (k <= 2) return [bug("sign", "procedural", IM, "The sign of the second term was wrong: by parts subtracts ∫ v du, and integrating sin gives −cos.", ptAns(P, "sign")), bug("product", "conceptual", IM, "Each factor was integrated separately and the results multiplied; the integral of a product is not the product of the integrals.", ptAns(P, "product"))];
    if (k === 3) return [bug("first-only", "procedural", IM, "Only uv was written; the remaining integral −∫ v du still has to be worked out.", ptAns(P, "first")), bug("sign", "procedural", IM, "The remaining integral was added; by parts subtracts it.", ptAns(P, "sign"))];
    if (k === 4) return [bug("fp", "recall", IM, "eˣ f′(x) was given; the rule is ∫ eˣ[f + f′] dx = eˣ f(x) + C.", ptAns(P, "fp")), bug("kept-both", "conceptual", IM, "The bracket was kept as it is; the whole bracket combines into eˣ f(x).", ptAns(P, "both"))];
    return [bug("stopped-early", "procedural", IM, "Bernoulli's formula was stopped too early; continue until the derivative of x² reaches 0 (three terms).", ptAns(P, "first")), bug("signs-not-alternating", "recall", IM, "The signs in Bernoulli's formula alternate + − + − …; here they were all taken as +.", ptAns(P, "sign"))];
  },
  distractors: (P) => {
    const ans = ptAns(P).replace(/ \+ C$/, "");
    return [`−(${ans}) + C`, `2(${ans}) + C`];
  },
  domain: [[0, 6], [1, 5], [0, 4], [1, 4]],
  keep: ([k, , n]) => (k === 3 ? true : n === 0),
  why: "x e^(ax), x sin ax, x cos ax, xⁿ log(ax), eˣ[f + f′], x² e^(ax) and x² cos ax with small whole numbers.",
  cap: 300,
  difficulty: ([k]) => (k === 4 || k === 0 ? 1 : k >= 5 ? 3 : 2),
  teach: {
    idea: "The product rule read backwards gives ∫ u dv = uv − ∫ v du. Choose u to be the factor that becomes simpler when differentiated (x, x², log x); repeated parts on x² gives Bernoulli's formula with alternating signs.",
    method: "Pick u and dv (ILATE order: inverse trig, log, algebraic, trig, exponential for u). Find du and v, write uv − ∫ v du, and integrate the last part. For eˣ[f + f′], the answer is eˣ f + C at once.",
    alternatives: [
      { id: "tabular", title: "The table method", kind: "procedural", text: ["Column 1: u, u′, u″, … down to 0. Column 2: v, then its integrals v₁, v₂, v₃.", "Multiply along the diagonals with signs + − + and add."] },
      { id: "check", title: "Differentiate back", kind: "conceptual", text: ["Differentiate your answer with the product rule.", "All terms but the integrand must cancel."] },
    ],
  },
  limits: "One application of parts or Bernoulli's formula with x or x²; cyclic integrals such as ∫ eˣ sin x dx are not included.",
});

const SB3 = [[3, 4, 5], [4, 3, 5], [5, 12, 13], [12, 5, 13], [6, 8, 10], [8, 6, 10], [8, 15, 17], [15, 8, 17], [7, 24, 25], [24, 7, 25], [9, 12, 15], [12, 9, 15], [12, 16, 20], [16, 12, 20], [20, 21, 29], [21, 20, 29]];
/** [j, c]: ∫ from 0 to b of c t/√(t² + d²) dt, with b² + d² = h². */
const ausbd = F({
  id: "ausbd",
  arity: 2,
  title: "A definite integral by substitution: ∫ c t/√(t² + d²) dt",
  competency: IM,
  type: "integer",
  mc: true,
  prompt: ([j, c]) => `Evaluate ∫ from 0 to ${SB3[j][0]} of ${c === 1 ? "" : c}t/√(t² + ${SB3[j][1] ** 2}) dt, using the substitution u = t² + ${SB3[j][1] ** 2}.`,
  solve: ([j, c]) => {
    const [b, d, h] = SB3[j];
    return {
      steps: [
        st("sub", "substitute", IM, `u = t² + ${d * d}, du = 2t dt; the limits become u = ${d * d} and u = ${h * h}`, `${d * d} to ${h * h}`),
        st("integrate", "integrate", IM, `${c === 1 ? "" : c}(1/2)∫ u^(−1/2) du = ${c === 1 ? "" : c}√u`, `${c}√u`),
        st("value", "evaluate", DEF, `${c} × (√${h * h} − √${d * d}) = ${c} × (${h} − ${d}) = ${c * (h - d)}`, c * (h - d)),
      ],
      answer: c * (h - d),
    };
  },
  // independent: Simpson's rule on the original integral
  validate: ([j, c], v) => typeof v === "number" && near(v, simpson((t) => (c * t) / Math.sqrt(t * t + SB3[j][1] ** 2), 0, SB3[j][0]), 1e-8),
  bugs: ([j, c]) => {
    const [, d, h] = SB3[j];
    return [
      bug("lower-limit", "procedural", DEF, `The lower limit was taken to give 0; at t = 0, u = ${d * d} and √u = ${d}, which must be subtracted.`, c * h),
      bug("missed-half", "procedural", IM, "du = 2t dt, so t dt = du/2; the factor 1/2 was left out.", 2 * c * (h - d)),
    ];
  },
  domain: [[0, 15], [1, 6]],
  why: "Upper limits and constants that make b² + d² a perfect square, with c from 1 to 6.",
  difficulty: ([j]) => (j <= 1 ? 1 : j >= 12 ? 3 : 2),
  word: ([j, c]) => `Water flows into a tank at a rate of ${c === 1 ? "" : c}t/√(t² + ${SB3[j][1] ** 2}) litres per minute, t minutes after the tap is opened. How many litres flow in during the first ${SB3[j][0]} minutes?`,
  teach: {
    idea: "When the integrand contains a function and (a multiple of) its derivative, substitute u for the function: t dt is half of d(t² + d²). The limits change with the variable.",
    method: "Let u = t² + d², so t dt = du/2. Change the limits (t = 0 gives u = d², t = b gives u = b² + d²), integrate (1/2)u^(−1/2) to √u, and subtract.",
    alternatives: [
      { id: "back_substitute", title: "Back-substitute instead", kind: "procedural", text: ["Find the antiderivative √(t² + d²) first.", "Evaluate it at t = b and t = 0 and subtract."] },
      { id: "check", title: "Check the derivative", kind: "conceptual", text: ["d/dt √(t² + d²) = t/√(t² + d²).", "So the integral is the change in √(t² + d²)."] },
    ],
  },
  limits: "Pythagorean pairs only, so that the answer is a whole number.",
});

// ================================================================ definite integrals

/** [p, q, r, a, b]: ∫ from a to b of (px² + qx + r) dx. */
const dfF = ([p, q, r]: number[]) => (x: number) => (p * x ** 3) / 3 + (q * x * x) / 2 + r * x;
const audfp = F({
  id: "audfp",
  arity: 5,
  title: "Definite integrals of polynomials by the fundamental theorem",
  competency: DEF,
  type: "fraction",
  mc: true,
  prompt: ([p, q, r, a, b]) => `Evaluate ∫ from ${a} to ${b} of (${sum([[p, "x²"], [q, "x"], [r, ""]])}) dx.`,
  solve: (P) => {
    const [, , , a, b] = P;
    const F_ = dfF(P);
    return { steps: [st("anti", "integrate", IND, `An antiderivative is F(x) = ${sum([[P[0] / 3, "x³"], [P[1] / 2, "x²"], [P[2], "x"]])}`, sum([[P[0] / 3, "x³"], [P[1] / 2, "x²"], [P[2], "x"]])), st("ftc", "evaluate", DEF, `F(${b}) − F(${a}) = ${nf(F_(b))} − ${pn(F_(a))} = ${nf(F_(b) - F_(a))}`, F_(b) - F_(a))], answer: F_(b) - F_(a) };
  },
  // independent: Simpson's rule
  validate: ([p, q, r, a, b], v) => typeof v === "number" && near(v, simpson((x) => p * x * x + q * x + r, a, b), 1e-9),
  bugs: (P) => {
    const [p, q, r, a, b] = P;
    const F_ = dfF(P);
    return [
      bug("upper-only", "procedural", DEF, `Only F(${b}) was worked out; the fundamental theorem subtracts the value at the lower limit, F(${a}).`, F_(b)),
      bug("reversed", "procedural", DEF, "F(lower) − F(upper) was worked out; it is F(upper) − F(lower).", F_(a) - F_(b)),
      bug("powers-not-divided", "recall", IND, "The powers were raised without dividing by the new powers.", p * (b ** 3 - a ** 3) + q * (b * b - a * a) + r * (b - a)),
      bug("integrand-difference", "conceptual", DEF, "The integrand itself was evaluated at the limits; the antiderivative must be used.", p * (b * b - a * a) + q * (b - a)),
    ];
  },
  domain: [[0, 3], [-4, 6], [0, 9], [0, 3], [1, 6]],
  keep: ([p, q, r, a, b]) => b > a && (p !== 0 || q !== 0) && [0, 0.25, 0.5, 0.75, 1].every((t) => p * (a + t * (b - a)) ** 2 + q * (a + t * (b - a)) + r > 0),
  why: "Quadratic integrands that stay positive on [a, b], with 0 ≤ a < b ≤ 6.",
  cap: 400,
  difficulty: ([p, , , a]) => (p === 0 && a === 0 ? 1 : a > 0 && p > 0 ? 3 : 2),
  word: ([p, q, r, a, b]) => `A car moves along a straight road with velocity v(t) = ${sum([[p, "t²"], [q, "t"], [r, ""]])} metres per second, where t is in seconds. How far does it travel between t = ${a} and t = ${b}, in metres? (A fraction is fine.)`,
  teach: {
    idea: "If F′ = f, then ∫ from a to b of f(x) dx = F(b) − F(a): the total accumulated by a rate f is the change in its antiderivative (distance is the change in position).",
    method: "Find an antiderivative F (no constant is needed), work out F(b) and F(a), and subtract.",
    alternatives: [
      { id: "area", title: "Area under the graph", kind: "conceptual", text: ["Where f > 0, the integral is the area between the graph and the x-axis from a to b.", "A rough sketch tells you whether the answer is sensible."] },
      { id: "table", title: "Set out F in a table", kind: "procedural", text: ["Write each term of F, its value at b and at a.", "Subtract column by column and add."] },
    ],
  },
  limits: "Quadratic integrands positive on the interval; integrals of trigonometric and exponential functions are in other families.",
});

/** [k, p, q, m]: lim (n → ∞) of a sum that is a definite integral over [0, 1]. */
const rsTerm = ([k, p, q, m]: number[]) => (r: number, n: number) => (k === 0 ? (p * r + q * n) / (n * n) : k === 1 ? (p * r * r + q * n * n) / n ** 3 : k === 2 ? (p * n) / (n * n + r * r) : (p * r ** m) / n ** (m + 1));
const rsAns = ([k, p, q, m]: number[]) => (k === 0 ? rat(p + 2 * q, 2) : k === 1 ? rat(p + 3 * q, 3) : k === 2 ? piQ(p, 4) : rat(p, m + 1));
const aurie = F({
  id: "aurie",
  arity: 4,
  title: "A definite integral as the limit of a sum",
  competency: DEF,
  type: "exact",
  mc: true,
  prompt: (P) => {
    const [k, p, q, m] = P;
    const t = k === 0 ? `(${sum([[p, "r"], [q, "n"]])})/n²` : k === 1 ? `(${sum([[p, "r²"], [q, "n²"]])})/n³` : k === 2 ? `${p === 1 ? "" : p}n/(n² + r²)` : `${p === 1 ? "" : p}r${sup(m)}/n${sup(m + 1)}`;
    return `Evaluate lim (n → ∞) of the sum Σ from r = 1 to n of ${t}, by writing it as a definite integral.${k === 2 ? " Give the exact value in terms of π." : ""}`;
  },
  solve: (P) => {
    const [k, p, q, m] = P;
    const f = k === 0 ? sum([[p, "x"], [q, ""]]) : k === 1 ? sum([[p, "x²"], [q, ""]]) : k === 2 ? `${p}/(1 + x²)` : `${p}x${sup(m)}`;
    return { steps: [st("riemann", "rewrite", DEF, `Write the term as (1/n) f(r/n) with x = r/n: f(x) = ${f}, so the limit is ∫ from 0 to 1 of ${f} dx`, f), st("value", "evaluate", DEF, `= ${rsAns(P)}`, rsAns(P))], answer: rsAns(P) };
  },
  // independent: add up the sum for a large n and compare
  validate: (P, v) => {
    const x = constOf(v);
    if (!Number.isFinite(x)) return false;
    const n = 100000;
    const t = rsTerm(P);
    let s = 0;
    for (let r = 1; r <= n; r++) s += t(r, n);
    return Math.abs(s - x) < 2e-4 * Math.max(1, Math.abs(x));
  },
  bugs: (P) => {
    const [k, p, q, m] = P;
    return k === 0
      ? [bug("sum-r", "recall", "MATH.sequences.series-summation", "Σr was taken as n² instead of about n²/2 (it is n(n + 1)/2); equivalently ∫₀¹ x dx is 1/2, not 1.", rat(p + q, 1))]
      : k === 1
        ? [bug("sum-r2", "recall", "MATH.sequences.series-summation", "Σr² was taken as about n³/2; it is n(n + 1)(2n + 1)/6, about n³/3 (∫₀¹ x² dx = 1/3).", rat(p + 2 * q, 2))]
        : k === 2
          ? [bug("each-term-one", "conceptual", DEF, "Each term was treated as if it were 1/n, giving the factor alone; the terms shrink as r grows, following 1/(1 + x²).", rat(p, 1)), bug("half-pi", "recall", "MATH.trigonometry.inverse", "tan⁻¹(1) was taken as π/2; it is π/4.", piQ(p, 2))]
          : [bug("power-not-raised", "recall", IND, "∫₀¹ xᵐ dx was taken as 1/m; it is 1/(m + 1).", rat(p, m))];
  },
  distractors: (P) => {
    const x = constOf(rsAns(P));
    return P[0] === 2 ? [piQ(P[1], 8), piQ(P[1], 1)] : [fmt(2 * x).replace(/-/g, "−"), fmt(x + 1).replace(/-/g, "−"), fmt(x / 2).replace(/-/g, "−")];
  },
  domain: [[0, 3], [1, 9], [0, 6], [1, 5]],
  keep: ([k, p, q, m]) => (k <= 1 ? m === 1 : k === 2 ? q === 0 && m === 1 : q === 0 && m >= 2 && p <= 6),
  why: "Sums that become ∫₀¹ of px + q, px² + q, p/(1 + x²) or pxᵐ.",
  difficulty: ([k]) => (k === 3 ? 1 : k === 2 ? 3 : 2),
  teach: {
    idea: "∫ from 0 to 1 of f(x) dx is the limit of the sums (1/n)[f(1/n) + f(2/n) + … + f(n/n)]: n thin rectangles of width 1/n under the graph. A sum of this shape can be evaluated by integrating.",
    method: "Take out a factor 1/n and write the rest of each term in terms of r/n only; call r/n = x, so the limit is ∫ from 0 to 1 of f(x) dx. Integrate.",
    alternatives: [
      { id: "formulas", title: "Use the sum formulas", kind: "procedural", text: ["Σr = n(n + 1)/2 and Σr² = n(n + 1)(2n + 1)/6.", "Substitute, divide by the power of n, and let n → ∞."] },
      { id: "rectangles", title: "Rectangles under a curve", kind: "conceptual", text: ["Each term is the area of a thin rectangle of width 1/n and height f(r/n).", "As n grows, the rectangles fill the area under the curve."] },
    ],
  },
  limits: "Sums over [0, 1]; general intervals [a, b] are not included.",
});

/** [k, n, c]: ∫₀¹ xⁿeˣ, ∫₀^(π/2) xⁿ cos x, ∫₀^π xⁿ sin x, ∫₁^e xⁿ log x (times c), by Bernoulli's formula. */
const beData = (k: number, n: number) => {
  // [exact value, slip: signs not alternating, slip: lower limit dropped], each as [coefficient of e/π-part, constant]
  const tab: Record<string, [string, string | null, string | null]> = {
    "0,1": ["1", "2e − 1", "0"],
    "0,2": ["e − 2", "5e − 2", "e"],
    "0,3": ["6 − 2e", "16e − 6", "−2e"],
    "1,1": ["π/2 − 1", "π/2 + 1", null],
    "1,2": ["π²/4 − 2", "π²/4 + 2", null],
    "2,1": ["π", null, null],
    "2,2": ["π² − 4", null, "π² − 2"],
    "3,0": ["1", null, "0"],
    "3,1": ["(e² + 1)/4", "(3e² − 1)/4", "e²/4"],
    "3,2": ["(2e³ + 1)/9", "(4e³ − 1)/9", "2e³/9"],
  };
  return tab[`${k},${n}`];
};
const beG = ([k, n]: number[]) => (x: number) => (k === 0 ? x ** n * Math.exp(x) : k === 1 ? x ** n * Math.cos(x) : k === 2 ? x ** n * Math.sin(x) : x ** n * Math.log(x));
const beLim = (k: number): [number, number] => (k === 0 ? [0, 1] : k === 1 ? [0, Math.PI / 2] : k === 2 ? [0, Math.PI] : [1, Math.E]);
const times = (c: number, s: string) => (c === 1 ? s : /^[\d.]+$/.test(s) ? `${c * Number(s)}` : `${c}(${s})`);
const audbe = F({
  id: "audbe",
  arity: 3,
  title: "Definite integrals by parts and Bernoulli's formula",
  competency: DEF,
  type: "expression",
  mc: true,
  prompt: ([k, n, c]) => {
    const cc_ = c === 1 ? "" : `${c}`;
    const xn = n === 0 ? "" : `${xpw(n)} `;
    const f = k === 0 ? `${cc_}${xn}eˣ` : k === 1 ? `${cc_}${xn}cos x` : k === 2 ? `${cc_}${xn}sin x` : `${cc_}${xn}log x`;
    const [lo, hi] = k === 0 ? ["0", "1"] : k === 1 ? ["0", "π/2"] : k === 2 ? ["0", "π"] : ["1", "e"];
    return `Evaluate ∫ from ${lo} to ${hi} of ${f} dx. Give the exact value${k === 3 ? " (log is the natural logarithm)" : ""}.`;
  },
  solve: ([k, n, c]) => {
    const ans = times(c, beData(k, n)[0]);
    const how = k === 3 ? "By parts with u = log x, dv = xⁿ dx" : "Bernoulli's formula: ∫ u v dx = u v₁ − u′ v₂ + u″ v₃ − …, with u the power of x";
    return { steps: [st("method", "by parts", IM, how, how), st("evaluate", "evaluate", DEF, `Evaluate between the limits: ${ans}`, ans)], answer: ans };
  },
  // independent: Simpson's rule
  validate: ([k, n, c], v) => {
    const x = constOf(v);
    const [lo, hi] = beLim(k);
    return Number.isFinite(x) && near(x, c * simpson(beG([k, n]), lo, hi), 1e-8);
  },
  bugs: ([k, n, c]) => {
    const [, sg, low] = beData(k, n);
    return [
      bug("signs-not-alternating", "recall", IM, "The signs in Bernoulli's formula (or in u v − ∫ v du) were not alternated; they go + − + − ….", sg ? times(c, sg) : null),
      bug("lower-limit-dropped", "procedural", DEF, "The value at the lower limit was taken as 0 without working it out; it must be subtracted.", low ? times(c, low) : null),
    ];
  },
  distractors: ([k, n, c]) => {
    const a = times(c, beData(k, n)[0]);
    return [`2(${a})`, `−(${a})`, `(${a}) + 1`];
  },
  domain: [[0, 3], [0, 3], [1, 9]],
  keep: ([k, n]) => !!beData(k, n),
  why: "xⁿeˣ on [0, 1], xⁿ cos x on [0, π/2], xⁿ sin x on [0, π] and xⁿ log x on [1, e], with powers up to 3 and a factor up to 9.",
  difficulty: ([k, n]) => (n <= 1 ? 1 : k === 3 || n === 3 ? 3 : 2),
  teach: {
    idea: "Repeated integration by parts on xⁿ times eˣ, sin x or cos x lowers the power of x each time until it disappears; Bernoulli's formula writes all the steps at once with alternating signs. Then the fundamental theorem gives the value.",
    method: "Write the antiderivative with Bernoulli's formula (u = xⁿ and its derivatives, v and its repeated integrals, signs + − + …), then substitute the upper and the lower limit and subtract.",
    alternatives: [
      { id: "tabular", title: "The table method", kind: "procedural", text: ["List the derivatives of xⁿ down to 0, and the integrals of eˣ (or sin x, cos x) next to them.", "Multiply along the diagonals with alternating signs."] },
      { id: "estimate", title: "Estimate the size", kind: "conceptual", text: ["e ≈ 2.718 and π ≈ 3.142: work out your exact answer as a decimal.", "It must be positive here and smaller than the largest value of the integrand times the length of the interval."] },
    ],
  },
  limits: "Powers up to 3 on the standard intervals; answers are exact expressions in e and π.",
});

export const B21: Def[] = [audch, audinv, austd, aulax, auinit, autrig, auform, aupi, aupfr, auparts, ausbd, audfp, aurie, audbe];
