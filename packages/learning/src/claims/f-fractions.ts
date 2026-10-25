import { Rational, gcdB, rat } from "../claim-kit";
import type { ClaimTable, Claim, Problem } from "../claim-kit";

type Chk = { check: (s: any, p: Problem) => boolean | null };
const num = (x: unknown): number | null => (typeof x === "number" && Number.isFinite(x) ? x : null);
const lcmB = (a: bigint, b: bigint) => (a / gcdB(a, b)) * b;
/** All "a/b" fractions written in a text, as [text, Rational]; null if any has a zero bottom. */
const fracsIn = (text: string): { t: string; n: bigint; d: bigint; r: Rational }[] | null => {
  const out = [];
  for (const m of text.matchAll(/(\d+)\/(\d+)/g)) {
    const n = BigInt(m[1]), d = BigInt(m[2]);
    if (d === 0n) return null;
    out.push({ t: m[0], n, d, r: new Rational(n, d) });
  }
  return out;
};
/** The three fractions of an ordering prompt "…: x, y, z. Write them in brackets…", or null (they must be distinct in value). */
const threeFracs = (p: Problem) => {
  if (!/^Write these fractions in order from the smallest to the largest: /.test(p.prompt)) return null;
  const f = fracsIn(p.prompt);
  if (!f || f.length !== 3 || f[0].r.eq(f[1].r) || f[0].r.eq(f[2].r) || f[1].r.eq(f[2].r)) return null;
  return f;
};
const ascending = (f: { t: string; r: Rational }[]) => [...f].sort((a, b) => (a.r.lt(b.r) ? -1 : a.r.gt(b.r) ? 1 : 0));

/** adford/order: the prompt lists three fractions; the stated value is "(x, y, z)", those three fractions exactly as
 *  written in the prompt, smallest first. (Inputs [x, y, z, mode] are tops/code, not used.) */
const adfordOrder: Chk = {
  check: (s, p) => {
    const f = threeFracs(p);
    if (!f) return null;
    if (typeof s.value !== "string") return false;
    return s.value.trim() === `(${ascending(f).map((q) => q.t).join(", ")})`;
  },
};

/** adfordu/order: same ordered list as adford; the input is the common bottom L, which must be the lcm of the three bottoms. */
const adforduOrder: Chk = {
  check: (s, p) => {
    const f = threeFracs(p);
    if (!f) return null;
    const L = f.reduce((m, q) => lcmB(m, q.d), 1n);
    if (s.inputs.length !== 1 || num(s.inputs[0]) === null || BigInt(Math.trunc(s.inputs[0])) !== L || !Number.isInteger(s.inputs[0])) return false;
    if (typeof s.value !== "string") return false;
    return s.value.trim() === `(${ascending(f).map((q) => q.t).join(", ")})`;
  },
};

/** adfordu/convert: the three prompt fractions rewritten, in the prompt's order, over their lowest common bottom L:
 *  "x/L, y/L, z/L" with x/L equal to the first fraction, etc. The step's inputs are the three prompt fractions. */
const adforduConvert: Chk = {
  check: (s, p) => {
    const f = threeFracs(p);
    if (!f) return null;
    if (s.inputs.length !== 3 || s.inputs.some((x: unknown, i: number) => x !== f[i].t)) return false;
    if (typeof s.value !== "string") return false;
    const parts = s.value.split(",").map((x: string) => x.trim());
    if (parts.length !== 3) return false;
    const L = f.reduce((m, q) => lcmB(m, q.d), 1n);
    return parts.every((x: string, i: number) => x === `${(f[i].n * L) / f[i].d}/${L}`);
  },
};

/** adfcmpu/convert: the prompt names two fractions a/b and c/d; the stated value is "p/L and q/L" where L is the lowest
 *  common bottom (lcm of b and d) and p/L = a/b, q/L = c/d, in the prompt's order. Inputs are the two prompt fractions. */
const adfcmpuConvert: Chk = {
  check: (s, p) => {
    if (!/^Which fraction is (smaller|greater): /.test(p.prompt)) return null;
    const f = fracsIn(p.prompt);
    if (!f || f.length !== 2) return null;
    if (s.inputs.length !== 2 || s.inputs[0] !== f[0].t || s.inputs[1] !== f[1].t) return false;
    if (typeof s.value !== "string") return false;
    const L = lcmB(f[0].d, f[1].d);
    return s.value.trim() === `${(f[0].n * L) / f[0].d}/${L} and ${(f[1].n * L) / f[1].d}/${L}`;
  },
};

/** avlow/evaluate: the prompt "Write n/d in its lowest terms." and the step finds the highest common factor of n and d
 *  (inputs [n, d]); the stated value is that highest common factor. */
const avlowEvaluate: Claim = (s, p) => {
  const m = p.prompt.match(/^Write (\d+)\/(\d+) in its lowest terms\.$/);
  if (!m || BigInt(m[2]) === 0n) return null;
  if (s.inputs.length !== 2 || String(s.inputs[0]) !== m[1] || String(s.inputs[1]) !== m[2]) return null;
  return rat(gcdB(BigInt(m[1]), BigInt(m[2])));
};

/** fmulw/evaluate: the prompt "k × a/b = ?"; the step keeps the bottom (pieces stay the same size), so the stated value
 *  is b (input [b]). */
const fmulwEvaluate: Claim = (s, p) => {
  const m = p.prompt.match(/^(\d+) × (\d+)\/(\d+) = \?/);
  if (!m || BigInt(m[3]) === 0n) return null;
  if (s.inputs.length !== 1 || String(s.inputs[0]) !== m[3]) return null;
  return rat(BigInt(m[3]));
};

/** avfwq/evaluate (litres version only): "Each glass holds a/b litre … k such glasses": k lots of a/b = k·a/b, inputs [k·a, b].
 *  The stated value may be a floating point number (e.g. 0.666…), so it is compared within 1e-9 of the exact quotient. */
const avfwqEvaluate: Chk = {
  check: (s, p) => {
    const m = p.prompt.match(/^Each glass holds (\d+)\/(\d+) litre of .*\. How many litres do (\d+) such glasses hold\?/);
    if (!m) return null;
    const a = BigInt(m[1]), b = BigInt(m[2]), k = BigInt(m[3]);
    if (b === 0n) return null;
    if (s.inputs.length !== 2 || String(s.inputs[0]) !== String(k * a) || String(s.inputs[1]) !== m[2]) return false;
    const v = num(s.value);
    if (v === null) return false;
    return Math.abs(v - Number(k * a) / Number(b)) < 1e-9;
  },
};

/** agclass/classify: "What kind of number is X?": a whole number with a fraction is a mixed number; n/d with n < d is a
 *  proper fraction; n/d with n >= d is an improper fraction. The stated value is that name. */
const agclassClassify: Chk = {
  check: (s, p) => {
    const m = p.prompt.match(/^What kind of number is (?:(\d+) )?(\d+)\/(\d+)\?$/);
    if (!m || BigInt(m[3]) === 0n) return null;
    if (s.inputs.length !== 1 || s.inputs[0] !== p.prompt.slice("What kind of number is ".length, -1)) return null;
    const kind = m[1] !== undefined ? "a mixed number" : BigInt(m[2]) < BigInt(m[3]) ? "a proper fraction" : "an improper fraction";
    return s.value === kind;
  },
};

/** avfold/evaluate: a of b strips coloured (prompt), every strip cut into k parts: the sheet then has b·k parts of which
 *  a·k are coloured, so the equal fraction is (a·k)/(b·k). The picture data (grid rows b, cols k, shaded) must agree. */
const avfoldEvaluate: Chk = {
  check: (s, p) => {
    const m = p.prompt.match(/^A sheet of paper is folded into (\d+) equal strips and (\d+) of the strips (?:is|are) coloured, so \d+\/\d+ of the sheet is coloured\. It is then folded the other way so that every strip is cut into (\d+) equal parts\./);
    if (!m) return null;
    const b = BigInt(m[1]), a = BigInt(m[2]), k = BigInt(m[3]);
    if (b === 0n || k === 0n) return null;
    const fig = p.figure as any;
    if (fig && fig.type === "grid" && (fig.rows !== Number(b) || fig.cols !== Number(k) || fig.shaded !== Number(a * k))) return false;
    if (s.inputs.length !== 4 || [a, b, a * k, b * k].some((x, i) => String(s.inputs[i]) !== String(x))) return false;
    return s.value === `${a * k}/${b * k}`;
  },
};

/** adfnl/compare: the prompt names two unit fractions 1/x and 1/y (both dots are marked on the line in the figure); the
 *  question asks for the one nearer to 0 (the smaller) or nearer to 1 / farther right (the greater). The stated value is
 *  that fraction written "1/n". Inputs are the same two fractions, in either order. */
const adfnlCompare: Chk = {
  check: (s, p) => {
    const q = p.prompt.match(/Which fraction is at the dot (nearer to 0|nearer to 1|farther to the right)\?$/);
    const f = fracsIn(p.prompt);
    if (!q || !f || f.length !== 2 || f.some((x) => x.n !== 1n) || f[0].d === f[1].d) return null;
    const ins = s.inputs.map(String);
    if (ins.length !== 2 || !f.every((x) => ins.includes(x.t))) return false;
    const marks = (p.figure as any)?.marks;
    if (Array.isArray(marks)) {
      const want = f.map((x) => 1 / Number(x.d)).sort((x, y) => x - y), got = [...marks].map(Number).sort((x, y) => x - y);
      if (got.length !== 2 || got.some((g, i) => !(Math.abs(g - want[i]) < 0.002))) return false;
    }
    const small = f[0].r.lt(f[1].r) ? f[0] : f[1], big = small === f[0] ? f[1] : f[0];
    return s.value === (q[1] === "nearer to 0" ? small.t : big.t);
  },
};

/** ldiv/evaluate: the prompt "N ÷ d = ?" with inputs [N, d]; the stated value is the exact quotient N / d. */
const ldivEvaluate: Claim = (s, p) => {
  const m = p.prompt.match(/^(\d+) ÷ (\d+) = \?$/);
  if (!m || BigInt(m[2]) === 0n) return null;
  if (s.inputs.length !== 2 || String(s.inputs[0]) !== m[1] || String(s.inputs[1]) !== m[2]) return null;
  return new Rational(BigInt(m[1]), BigInt(m[2]));
};

/** Wholes, rods (tenths) and small cubes (hundredths) read from the aedec prompt. */
const blocks = (p: Problem): { w: bigint; t: bigint; h: bigint } | null => {
  const m = p.prompt.match(/The picture shows (\d+) flats?, (\d+) rods? and (\d+) small cubes?\. Write the number they show as a decimal\.$/);
  if (!m) return null;
  const r = { w: BigInt(m[1]), t: BigInt(m[2]), h: BigInt(m[3]) };
  const fig = p.figure as any;
  if (fig && fig.type === "blocks" && (fig.hundreds !== Number(r.w) || fig.tens !== Number(r.t) || fig.ones !== Number(r.h))) return null;
  return r;
};

/** aedec/place: step "tenths" (input [t]) states t tenths = t/10; step "hundredths" (input [h]) states h hundredths = h/100,
 *  with t rods / h small cubes read from the prompt. */
const aedecPlace: Claim = (s, p) => {
  const b = blocks(p);
  if (!b || s.inputs.length !== 1) return null;
  if (s.id === "tenths") return String(s.inputs[0]) === String(b.t) ? new Rational(b.t, 10n) : null;
  if (s.id === "hundredths") return String(s.inputs[0]) === String(b.h) ? new Rational(b.h, 100n) : null;
  return null;
};

/** aedec/add: w flats + t rods + h small cubes (prompt; inputs [w, t, h]) show w + t/10 + h/100. */
const aedecAdd: Claim = (s, p) => {
  const b = blocks(p);
  if (!b || s.inputs.length !== 3 || [b.w, b.t, b.h].some((x, i) => String(s.inputs[i]) !== String(x))) return null;
  return new Rational(100n * b.w + 10n * b.t + b.h, 100n);
};

/** avlat/evaluate (the product question): the prompt gives a × b; the step's inputs are the four diagonal totals, units
 *  first, which must add up (with place values 1, 10, 100, 1000) to a × b; the stated value is the product a × b. */
const avlatEvaluate: Chk = {
  check: (s, p) => {
    const m = p.prompt.match(/What is (\d+) × (\d+)\?$/);
    if (!m) return null;
    const prod = BigInt(m[1]) * BigInt(m[2]);
    const d = s.inputs.map((x: unknown) => (typeof x === "number" && Number.isInteger(x) && x >= 0 ? BigInt(x) : null));
    if (d.length !== 4 || d.some((x: bigint | null) => x === null)) return null;
    if (d.reduce((acc: bigint, x: bigint, i: number) => acc + x * 10n ** BigInt(i), 0n) !== prod) return false;
    return num(s.value) === Number(prod);
  },
};

export const CLAIMS: ClaimTable = {
  "adford/order": adfordOrder,
  "adfordu/convert": adforduConvert,
  "adfordu/order": adforduOrder,
  "adfcmpu/convert": adfcmpuConvert,
  "avlow/evaluate": avlowEvaluate,
  "fmulw/evaluate": fmulwEvaluate,
  "avfwq/evaluate": avfwqEvaluate,
  "agclass/classify": agclassClassify,
  "avfold/evaluate": avfoldEvaluate,
  "adfnl/compare": adfnlCompare,
  "ldiv/evaluate": ldivEvaluate,
  "aedec/place": aedecPlace,
  "aedec/add": aedecAdd,
  "avlat/evaluate": avlatEvaluate,
};
