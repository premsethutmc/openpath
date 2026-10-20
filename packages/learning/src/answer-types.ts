/**
 * Answer types (answers@2): how a typed answer is read and compared, for every kind of mathematics answer the
 * curriculum needs. The server (backend/family/answer_types.py) implements the same rules; a shared table of cases
 * (content/learning/answer-cases.v1.json) is checked by both.
 *
 *   exact          EXACT algebra: rational numbers, surds (√2, 3√5/2) and polynomials in any single-letter variables
 *                  with rational or surd coefficients (2ab − b², x² + 2√3x). Equal answers have the same canonical
 *                  form, computed exactly (no rounding).
 *   roots          a set of exact numbers ("2, −3", "(1 + √5)/2, (1 − √5)/2"); order does not matter.
 *   tuple          an ordered list of exact numbers: a point (3, −2), a vector (1, 0, −4), a sequence 2, 5, 8.
 *   matrix         rows of exact numbers: [[1, 2], [3, 4]] or "1 2; 3 4".
 *   interval       a set of real numbers given as an inequality ("x > 3", "−1 < x ≤ 4", "x < 1 or x > 3") or in
 *                  interval notation ("(−∞, 3]", "[2, 5) ∪ (7, ∞)"), with rational end points.
 *   ratio          a ratio as written in whole numbers ("3:4"); equivalent but unsimplified ratios are different
 *                  answers (the question asks for the simplest form).
 *   mixed          a mixed number as written ("3 2/5", "−1 1/2", or a whole number "4"), not reduced: 17/5 or 3 4/10
 *                  are readable but different answers (the question asks for the simplest mixed form).
 *   expression     an expression with functions (sin, cos, tan, sec, cosec, cot, ln, log, exp, √, |x|, π, e): equal when
 *                  it agrees with the answer at fixed sample points to a relative 1e-9 (numerical identity testing;
 *                  stated as such, never claimed as symbolic proof).
 *   antiderivative an expression equal to the answer up to an added constant ("+ C" may be written or not).
 *   written        a written response (proof, construction, explanation, drawing description): NEVER marked
 *                  automatically; an educator marks it (written.ts).
 */
import { polynomial } from "../../mathematics/src/answers";

export type AnswerType = "integer" | "fraction" | "set" | "choice" | "polynomial" | "exact" | "roots" | "tuple" | "matrix" | "interval" | "ratio" | "mixed" | "expression" | "antiderivative" | "written";
export const ANSWERS_POLICY = "answers@2";
/** Types compared by numerical identity testing rather than a canonical form. */
export const SAMPLED: ReadonlySet<AnswerType> = new Set(["expression", "antiderivative"]);
/** Types an educator marks; never automatic. */
export const HUMAN: ReadonlySet<AnswerType> = new Set(["written"]);

// ---------------------------------------------------------------- exact rationals (bigint)

type Q = readonly [bigint, bigint];
const bgcd = (a: bigint, b: bigint): bigint => (b ? bgcd(b, a % b) : a < 0n ? -a : a);
const q = (n: bigint, d = 1n): Q => {
  if (d === 0n) throw new Error("division by zero");
  const g = bgcd(n, d) || 1n;
  const s = d < 0n ? -1n : 1n;
  return [(n / g) * s, (d / g) * s];
};
const qadd = (a: Q, b: Q) => q(a[0] * b[1] + b[0] * a[1], a[1] * b[1]);
const qmul = (a: Q, b: Q) => q(a[0] * b[0], a[1] * b[1]);
const qneg = (a: Q): Q => [-a[0], a[1]];
const qinv = (a: Q) => q(a[1], a[0]);
const qzero = (a: Q) => a[0] === 0n;
const qshow = (a: Q) => (a[1] === 1n ? `${a[0]}` : `${a[0]}/${a[1]}`);
const qcmp = (a: Q, b: Q) => {
  const d = a[0] * b[1] - b[0] * a[1];
  return d < 0n ? -1 : d > 0n ? 1 : 0;
};

/** Square-free part: n = k² m with m square-free; returns [k, m]. */
function squareFree(n: bigint): [bigint, bigint] {
  if (n < 0n) throw new Error("square root of a negative number");
  if (n > 10n ** 12n) throw new Error("number too large");
  let k = 1n;
  let m = n;
  for (let p = 2n; p * p <= m; p++) while (m % (p * p) === 0n) {
    m /= p * p;
    k *= p;
  }
  return [k, m];
}

// ---------------------------------------------------------------- exact algebra: polynomials over Q(√…)

/** A coefficient: Σ r·√m over square-free m (m = 1 is the rational part). */
type Coef = Map<bigint, Q>;
/** A monomial key: variables with powers, e.g. "a2b1" ("" is the constant). */
type Poly = Map<string, Coef>;

const cclean = (c: Coef): Coef => new Map([...c].filter(([, r]) => !qzero(r)));
const cadd = (a: Coef, b: Coef): Coef => {
  const out = new Map(a);
  for (const [m, r] of b) out.set(m, qadd(out.get(m) ?? [0n, 1n], r));
  return cclean(out);
};
const cmul = (a: Coef, b: Coef): Coef => {
  let out: Coef = new Map();
  for (const [m1, r1] of a)
    for (const [m2, r2] of b) {
      const [k, m] = squareFree(m1 * m2);
      out = cadd(out, new Map([[m, qmul(qmul(r1, r2), [k, 1n])]]));
    }
  return out;
};
const cconst = (r: Q): Coef => cclean(new Map([[1n, r]]));
const csurd = (r: Q): Coef => {
  // √(p/q) = √(pq)/q
  if (r[0] < 0n) throw new Error("square root of a negative number");
  if (r[0] === 0n) return new Map();
  const [k, m] = squareFree(r[0] * r[1]);
  return cclean(new Map([[m, q(k, r[1])]]));
};
/** 1/c for a single-term coefficient r√m (= √m/(r m)); a sum of surds in a denominator is not supported. */
const cinv = (c: Coef): Coef => {
  if (c.size !== 1) throw new Error(c.size ? "a sum of surds in a denominator is not supported" : "division by zero");
  const [[m, r]] = [...c];
  return new Map([[m, qinv(qmul(r, [m, 1n]))]]);
};

// π is a symbol of its own in exact answers (pi@1): 5π/6 is exactly five sixths of π, never a decimal
const monoParse = (k: string): [string, number][] => (k ? [...k.matchAll(/([a-zπ])(\d+)/g)].map((x) => [x[1], Number(x[2])]) : []);
const cmpStr = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
const monoKey = (vs: [string, number][]) => vs.filter(([, n]) => n > 0).sort((a, b) => cmpStr(a[0], b[0])).map(([v, n]) => `${v}${n}`).join("");
const monoMul = (a: string, b: string) => {
  const m = new Map(monoParse(a));
  for (const [v, n] of monoParse(b)) m.set(v, (m.get(v) ?? 0) + n);
  return monoKey([...m]);
};
const degree = (k: string) => monoParse(k).reduce((s, [, n]) => s + n, 0);
const pclean = (p: Poly): Poly => new Map([...p].filter(([, c]) => c.size > 0));
const padd = (a: Poly, b: Poly): Poly => {
  const out = new Map(a);
  for (const [k, c] of b) out.set(k, cadd(out.get(k) ?? new Map(), c));
  return pclean(out);
};
const pscale = (a: Poly, c: Coef): Poly => pclean(new Map([...a].map(([k, x]) => [k, cmul(x, c)])));
const pmul = (a: Poly, b: Poly): Poly => {
  let out: Poly = new Map();
  for (const [k1, c1] of a) for (const [k2, c2] of b) out = padd(out, new Map([[monoMul(k1, k2), cmul(c1, c2)]]));
  if ([...out.keys()].some((k) => degree(k) > 12)) throw new Error("degree too high");
  return out;
};
const pconst = (c: Coef): Poly => pclean(new Map([["", c]]));
/** The polynomial is a constant (no variables): its coefficient, else null. */
const asConst = (p: Poly): Coef | null => ([...p.keys()].every((k) => k === "") ? p.get("") ?? new Map() : null);

/** Canonical text of an exact polynomial: monomials by degree (high first) then name; coefficients by radicand. */
function pshow(p: Poly): string {
  if (!p.size) return "0";
  const ks = [...p.keys()].sort((a, b) => degree(b) - degree(a) || cmpStr(a, b));
  return ks.map((k) => `[${[...p.get(k)!].sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)).map(([m, r]) => (m === 1n ? qshow(r) : `${qshow(r)}r${m}`)).join("+")}]${k}`).join(" ");
}

// ---------------------------------------------------------------- tokenising and parsing

type Tok = { t: "num"; v: string } | { t: "id"; v: string } | { t: "op"; v: string };
const FUNCS = new Set(["sin", "cos", "tan", "sec", "cosec", "csc", "cot", "ln", "log", "exp", "sqrt", "abs", "arcsin", "arccos", "arctan"]);
/** inv@1: sin⁻¹ x (written sin^(-1) x) is the inverse function, as in the NCERT and Tamil Nadu books, not 1/sin x. */
const INVERSE: Record<string, string> = { sin: "arcsin", cos: "arccos", tan: "arctan" };
const SUPER: Record<string, string> = { "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4", "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9", "⁻": "-" };
/** Normalise what learners type: minus signs, superscripts, × ÷ ·, π, √, θ. */
export function normalise(raw: string): string {
  return raw
    .trim()
    .replace(/[−–]/g, "-")
    .replace(/[×·∙]/g, "*")
    .replace(/÷/g, "/")
    .replace(/π/g, "pi")
    .replace(/θ/g, "t")
    .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]+/g, (s) => `^(${[...s].map((c) => SUPER[c]).join("")})`)
    .replace(/√/g, "sqrt")
    .replace(/\s+/g, " ");
}
/** Numbers side by side (mixed@1): "179 2/3" is the mixed number 179⅔, never 179 × 2/3; any other two numbers with
 * only a space between them ("2 3") are unreadable, not a product. */
export function spaced(s: string): string {
  const t = s.replace(/(^|[^\w.)^])(\d+) (\d+) ?\/ ?(\d+)(?![\w.(^])/g, (_, pre, w, n, d) => `${pre}(${w}+${n}/${d})`);
  if (/\d \.?\d/.test(t)) throw new Error("two numbers side by side");
  return t;
}
function tokens(s: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === " ") {
      i++;
      continue;
    }
    const num = s.slice(i).match(/^\d+(?:\.\d+)?/);
    if (num) {
      out.push({ t: "num", v: num[0] });
      i += num[0].length;
      continue;
    }
    const id = s.slice(i).match(/^[a-z]+/i);
    if (id) {
      // a run of letters: a function name, pi, or single-letter variables multiplied (ab = a·b)
      let w = id[0].toLowerCase();
      i += w.length;
      while (w) {
        const f = ["arcsin", "arccos", "arctan", "cosec", "sqrt", "sin", "cos", "tan", "sec", "csc", "cot", "exp", "abs", "log", "ln", "pi"].find((x) => w.startsWith(x));
        if (f) {
          out.push({ t: "id", v: f });
          w = w.slice(f.length);
        } else {
          out.push({ t: "id", v: w[0] });
          w = w.slice(1);
        }
      }
      continue;
    }
    if ("+-*/^()|,".includes(c)) {
      out.push({ t: "op", v: c });
      i++;
      continue;
    }
    throw new Error(`cannot read “${c}”`);
  }
  return out;
}
export type Node = { k: "num"; v: string } | { k: "var"; v: string } | { k: "const"; v: "pi" | "e" } | { k: "neg"; a: Node } | { k: "bin"; op: "+" | "-" | "*" | "/" | "^"; a: Node; b: Node } | { k: "fn"; f: string; a: Node };
/** Parse an expression: + − × ÷ ^, brackets, |x|, implicit multiplication (2x, 3(x+1), x sin x), functions. */
export function parse(raw: string): Node {
  const s = spaced(normalise(raw));
  if (s.length > 200) throw new Error("too long");
  const ts = tokens(s);
  let i = 0;
  const peek = () => ts[i];
  const isOp = (v: string) => peek()?.t === "op" && peek()!.v === v;
  const eat = (v: string) => {
    if (!isOp(v)) throw new Error(`expected ${v}`);
    i++;
  };
  const startsAtom = () => {
    const p = peek();
    return !!p && (p.t === "num" || p.t === "id" || (p.t === "op" && (p.v === "(" || p.v === "|")));
  };
  const expr = (): Node => {
    let a = term();
    while (isOp("+") || isOp("-")) {
      const op = ts[i++].v as "+" | "-";
      a = { k: "bin", op, a, b: term() };
    }
    return a;
  };
  const term = (): Node => {
    let a = unary();
    for (;;) {
      if (isOp("*") || isOp("/")) {
        const op = ts[i++].v as "*" | "/";
        a = { k: "bin", op, a, b: unary() };
      } else if (startsAtom() && !(isOp("|") && inAbs > 0)) a = { k: "bin", op: "*", a, b: power() };
      else return a;
    }
  };
  const unary = (): Node => {
    if (isOp("-")) {
      i++;
      return { k: "neg", a: unary() };
    }
    if (isOp("+")) {
      i++;
      return unary();
    }
    return power();
  };
  let inAbs = 0;
  /** A function's argument written without brackets: numbers and letters multiplied (sin 2x), up to an operator or
   * another function (sin x cos x is sin(x)·cos(x)). */
  const argChain = (): Node => {
    if (isOp("-")) {
      i++;
      return { k: "neg", a: argChain() };
    }
    let a = power();
    while (peek() && (peek()!.t === "num" || (peek()!.t === "id" && !FUNCS.has(peek()!.v)))) a = { k: "bin", op: "*", a, b: power() };
    return a;
  };
  const power = (): Node => {
    const a = atom();
    if (isOp("^")) {
      i++;
      const b = isOp("-") ? (i++, { k: "neg", a: atom() } as Node) : atom();
      return { k: "bin", op: "^", a, b };
    }
    return a;
  };
  const atom = (): Node => {
    const p = peek();
    if (!p) throw new Error("unexpected end");
    if (p.t === "num") {
      i++;
      return { k: "num", v: p.v };
    }
    if (p.t === "op" && p.v === "(") {
      i++;
      const e = expr();
      eat(")");
      return e;
    }
    if (p.t === "op" && p.v === "|") {
      i++;
      inAbs++;
      const e = expr();
      inAbs--;
      eat("|");
      return { k: "fn", f: "abs", a: e };
    }
    if (p.t === "id") {
      i++;
      if (p.v === "pi") return { k: "const", v: "pi" };
      if (FUNCS.has(p.v)) {
        // sin x, sin(x), sin²x, sqrt 3
        let pow: Node | null = null;
        if (isOp("^")) {
          i++;
          pow = atom();
        }
        // √3x is √3 · x; sin 2x is sin(2x)
        const arg = isOp("(") ? atom() : p.v === "sqrt" || p.v === "abs" ? power() : argChain();
        if (pow && INVERSE[p.v] && pow.k === "neg" && pow.a.k === "num" && pow.a.v === "1") return { k: "fn", f: INVERSE[p.v], a: arg };
        const f: Node = { k: "fn", f: p.v === "csc" ? "cosec" : p.v, a: arg };
        return pow ? { k: "bin", op: "^", a: f, b: pow } : f;
      }
      if (p.v === "e") return { k: "const", v: "e" };
      return { k: "var", v: p.v };
    }
    throw new Error(`unexpected ${p.v}`);
  };
  const e = expr();
  if (i !== ts.length) throw new Error(`unexpected ${ts[i].v}`);
  return e;
}

/** A small non-negative integer from an exact constant (for exponents), or null. */
const smallInt = (c: Coef | null): number | null => {
  if (!c) return null;
  if (!c.size) return 0;
  if (c.size !== 1 || !c.has(1n)) return null;
  const r = c.get(1n)!;
  return r[1] === 1n && r[0] >= -12n && r[0] <= 12n ? Number(r[0]) : null;
};
/** Exact value of an expression as a polynomial over Q(√…); throws if it is not one (functions, π, e, x/x …). */
export function exact(n: Node): Poly {
  switch (n.k) {
    case "num": {
      const [w, f = ""] = n.v.split(".");
      return pconst(cconst(q(BigInt(w + f), 10n ** BigInt(f.length))));
    }
    case "var":
      return new Map([[`${n.v}1`, cconst([1n, 1n])]]);
    case "const":
      if (n.v === "pi") return new Map([["π1", cconst([1n, 1n])]]);
      throw new Error("not exact");
    case "neg":
      return pscale(exact(n.a), cconst([-1n, 1n]));
    case "fn": {
      if (n.f !== "sqrt") throw new Error("not exact");
      const c = asConst(exact(n.a));
      if (!c || ![...c.keys()].every((m) => m === 1n)) throw new Error("square root of an expression is not supported");
      return pconst(csurd(c.get(1n) ?? [0n, 1n]));
    }
    case "bin": {
      const a = exact(n.a);
      if (n.op === "^") {
        const e = smallInt(asConst(exact(n.b)));
        if (e === null) {
          // a^(1/2) of a rational constant is √a
          const b = asConst(exact(n.b));
          const ac = asConst(a);
          if (b && ac && b.size === 1 && b.has(1n) && qcmp(b.get(1n)!, [1n, 2n]) === 0 && [...ac.keys()].every((m) => m === 1n)) return pconst(csurd(ac.get(1n) ?? [0n, 1n]));
          throw new Error("unsupported power");
        }
        if (e < 0) {
          const c = asConst(a);
          if (!c) throw new Error("negative power of an expression");
          let out = cconst([1n, 1n]);
          for (let k = 0; k < -e; k++) out = cmul(out, cinv(c));
          return pconst(out);
        }
        let out: Poly = pconst(cconst([1n, 1n]));
        for (let k = 0; k < e; k++) out = pmul(out, a);
        return out;
      }
      const b = exact(n.b);
      if (n.op === "+") return padd(a, b);
      if (n.op === "-") return padd(a, pscale(b, cconst([-1n, 1n])));
      if (n.op === "*") return pmul(a, b);
      const c = asConst(b);
      if (!c) throw new Error("division by an expression is not supported");
      return pscale(a, cinv(c));
    }
  }
}
export const exactCanonical = (raw: string) => pshow(exact(parse(raw)));
/** An exact constant (no variables), canonical. */
const exactNumber = (raw: string) => {
  const p = exact(parse(raw));
  // a number, or a number times π (pi@1: solutions of trigonometric equations in radians)
  if (![...p.keys()].every((k) => k === "" || k === "π1")) throw new Error("a number, not an expression");
  return pshow(p);
};

// ---------------------------------------------------------------- numerical evaluation (expression, antiderivative)

const SAMPLES = [0.3711, 0.6457, 0.9283, 1.2049, 1.5337, 1.8862, 2.3171];
/** The value of a constant answer as shown ("−2√6", "31/16", "3π/4"), or null when it has letters or is unreadable. */
export function numericValue(s: string): number | null {
  try {
    const v = evaluate(parse(s), {});
    return Number.isFinite(v) ? v : null;
  } catch {
    return null;
  }
}
export function evaluate(n: Node, env: Record<string, number>): number {
  switch (n.k) {
    case "num":
      return Number(n.v);
    case "var":
      if (!(n.v in env)) throw new Error(`unknown letter ${n.v}`);
      return env[n.v];
    case "const":
      return n.v === "pi" ? Math.PI : Math.E;
    case "neg":
      return -evaluate(n.a, env);
    case "fn": {
      const a = evaluate(n.a, env);
      const f: Record<string, (x: number) => number> = { sin: Math.sin, cos: Math.cos, tan: Math.tan, sec: (x) => 1 / Math.cos(x), cosec: (x) => 1 / Math.sin(x), cot: (x) => Math.cos(x) / Math.sin(x), ln: Math.log, log: Math.log, exp: Math.exp, sqrt: Math.sqrt, abs: Math.abs, arcsin: Math.asin, arccos: Math.acos, arctan: Math.atan };
      return f[n.f](a);
    }
    case "bin": {
      const a = evaluate(n.a, env);
      const b = evaluate(n.b, env);
      return n.op === "+" ? a + b : n.op === "-" ? a - b : n.op === "*" ? a * b : n.op === "/" ? a / b : Math.pow(a, b);
    }
  }
}
const varsOf = (n: Node, out = new Set<string>()): Set<string> => {
  if (n.k === "var") out.add(n.v);
  if (n.k === "neg" || n.k === "fn") varsOf(n.a, out);
  if (n.k === "bin") {
    varsOf(n.a, out);
    varsOf(n.b, out);
  }
  return out;
};
const stripC = (raw: string) => normalise(raw).replace(/\s*\+\s*[cCkK]\s*$/, "");
/** Values at the sample points (each variable gets its own shifted samples); null where undefined. */
function sampled(raw: string, letters: string[], upToConstant: boolean): number[] {
  const n = parse(upToConstant ? stripC(raw) : raw);
  for (const v of varsOf(n)) if (!letters.includes(v)) throw new Error(`unknown letter ${v}`);
  return SAMPLES.map((_, i) => evaluate(n, Object.fromEntries(letters.map((v, j) => [v, SAMPLES[(i + 3 * j) % SAMPLES.length]]))));
}
const close = (a: number, b: number) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));
/** Whether two expressions agree at every sample point where the answer is defined (and at least 5 such points). */
function sameSampled(raw: string, answer: string, upToConstant: boolean): boolean {
  const letters = [...varsOf(parse(upToConstant ? stripC(answer) : answer))].sort();
  if (!letters.length) letters.push("x");
  const a = sampled(raw, letters, upToConstant);
  const b = sampled(answer, letters, upToConstant);
  const ok = b.map((v, i) => Number.isFinite(v) && Number.isFinite(a[i]));
  if (ok.filter(Boolean).length < 5) return false;
  if (!upToConstant) return b.every((v, i) => !ok[i] || close(a[i], v));
  const d = b.map((v, i) => a[i] - v).filter((_, i) => ok[i]);
  return d.every((x) => close(x, d[0]));
}

// ---------------------------------------------------------------- intervals

type End = { v: Q | null; closed: boolean }; // v null: infinite
type Iv = { lo: End; hi: End };
const qOf = (raw: string): Q => {
  const p = exact(parse(raw));
  const c = asConst(p);
  if (!c || ![...c.keys()].every((m) => m === 1n)) throw new Error("end points must be rational numbers");
  return c.get(1n) ?? [0n, 1n];
};
function readInterval(raw: string): Iv[] {
  const s = normalise(raw).replace(/∞/g, "inf").replace(/infinity/gi, "inf").replace(/≤|=</g, "<=").replace(/≥|=>/g, ">=").replace(/∪|\bu\b|\bor\b/gi, "|").toLowerCase();
  if (/^(all real numbers|r|ℝ|\(-inf, ?inf\))$/.test(s.trim())) return [{ lo: { v: null, closed: false }, hi: { v: null, closed: false } }];
  if (/^(no solution|none|∅|\{\}|empty)$/.test(s.trim())) return [];
  return s.split("|").map((part) => {
    const t = part.trim();
    const iv = t.match(/^([[(])\s*([^,]+?)\s*,\s*([^,]+?)\s*([\])])$/);
    if (iv) {
      const lo = iv[2].replace(/^\+/, "");
      const hi = iv[3].replace(/^\+/, "");
      return { lo: lo === "-inf" ? { v: null, closed: false } : { v: qOf(lo), closed: iv[1] === "[" }, hi: hi === "inf" ? { v: null, closed: false } : { v: qOf(hi), closed: iv[4] === "]" } };
    }
    const two = t.match(/^(.+?)\s*(<=|<)\s*[a-z]\s*(<=|<)\s*(.+)$/);
    if (two) return { lo: { v: qOf(two[1]), closed: two[2] === "<=" }, hi: { v: qOf(two[4]), closed: two[3] === "<=" } };
    const one = t.match(/^[a-z]\s*(<=|<|>=|>)\s*(.+)$/) ?? t.match(/^(.+?)\s*(<=|<|>=|>)\s*[a-z]$/);
    if (one) {
      const varFirst = /^[a-z]\s*[<>]/.test(t);
      const op = varFirst ? one[1] : ({ "<": ">", "<=": ">=", ">": "<", ">=": "<=" } as Record<string, string>)[one[2]];
      const v = qOf(varFirst ? one[2] : one[1]);
      return op.startsWith("<") ? { lo: { v: null, closed: false }, hi: { v, closed: op === "<=" } } : { lo: { v, closed: op === ">=" }, hi: { v: null, closed: false } };
    }
    throw new Error("cannot read the interval");
  });
}
const ecmpLo = (a: End, b: End) => (a.v === null ? (b.v === null ? 0 : -1) : b.v === null ? 1 : qcmp(a.v, b.v) || (a.closed === b.closed ? 0 : a.closed ? -1 : 1));
/** Canonical union: sorted, empty pieces dropped, overlapping or touching pieces merged. */
function intervalCanonical(raw: string): string {
  const ivs = readInterval(raw).filter((iv) => iv.lo.v === null || iv.hi.v === null || qcmp(iv.lo.v, iv.hi.v) < 0 || (qcmp(iv.lo.v, iv.hi.v) === 0 && iv.lo.closed && iv.hi.closed));
  ivs.sort((a, b) => ecmpLo(a.lo, b.lo));
  const out: Iv[] = [];
  for (const iv of ivs) {
    const last = out.at(-1);
    const touches = last && (last.hi.v === null || (iv.lo.v !== null && (qcmp(iv.lo.v, last.hi.v) < 0 || (qcmp(iv.lo.v, last.hi.v) === 0 && (iv.lo.closed || last.hi.closed)))));
    if (last && touches) {
      if (last.hi.v !== null && (iv.hi.v === null || qcmp(iv.hi.v, last.hi.v) > 0 || (qcmp(iv.hi.v, last.hi.v) === 0 && iv.hi.closed))) last.hi = iv.hi;
    } else out.push({ lo: { ...iv.lo }, hi: { ...iv.hi } });
  }
  if (!out.length) return "empty";
  return out.map((iv) => `${iv.lo.closed ? "[" : "("}${iv.lo.v ? qshow(iv.lo.v) : "-inf"},${iv.hi.v ? qshow(iv.hi.v) : "inf"}${iv.hi.closed ? "]" : ")"}`).join("U");
}

// ---------------------------------------------------------------- tuples, matrices, ratios

/** Split on commas at the top level (not inside brackets). */
function splitTop(s: string, sep = ","): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = "";
  for (const c of s) {
    if ("([".includes(c)) depth++;
    if (")]".includes(c)) depth--;
    if (c === sep && depth === 0) {
      out.push(cur);
      cur = "";
    } else cur += c;
  }
  out.push(cur);
  return out.map((x) => x.trim());
}
/** Remove one pair of outer brackets when they enclose the whole text. */
const unwrap = (s: string) => {
  const t = s.trim();
  if (!/^[([⟨<]/.test(t) || !/[)\]⟩>]$/.test(t)) return t;
  let depth = 0;
  for (let k = 0; k < t.length; k++) {
    if ("([⟨<".includes(t[k])) depth++;
    if (")]⟩>".includes(t[k])) depth--;
    if (depth === 0 && k < t.length - 1) return t;
  }
  return t.slice(1, -1);
};
function tupleCanonical(raw: string): string {
  const t = normalise(raw);
  const parts = splitTop(unwrap(t));
  if (parts.length < 2 || parts.some((x) => !x)) throw new Error("a list of numbers");
  return `(${parts.map(exactNumber).join(";")})`;
}
function matrixCanonical(raw: string): string {
  const t = normalise(raw).trim();
  let rows: string[][];
  if (t.startsWith("[[") || t.startsWith("((")) rows = splitTop(t.slice(1, -1)).map((r) => splitTop(unwrap(r)));
  else rows = t.split(/;|\n/).map((r) => r.trim().split(/[ ,]+/).filter(Boolean));
  if (!rows.length || rows.some((r) => r.length !== rows[0].length || !r.length)) throw new Error("rows of the same length");
  return `[${rows.map((r) => r.map(exactNumber).join(";")).join("|")}]`;
}
function mixedCanonical(raw: string): string {
  const t = normalise(raw).trim();
  const m = t.match(/^(-)?\s*(\d{1,6})(?:\s+(\d{1,6})\s*\/\s*(\d{1,6}))?$/) ?? t.match(/^(-)?\s*()(\d{1,6})\s*\/\s*(\d{1,6})$/);
  if (!m) throw new Error("a mixed number such as 3 2/5");
  const w = m[2] ? Number(m[2]) : 0;
  if (m[3] === undefined) return `${m[1] && w ? "-" : ""}${w}`;
  const n = Number(m[3]);
  const d = Number(m[4]);
  const g = (a: number, b: number): number => (b ? g(b, a % b) : a);
  // read as written (not reduced): 3 4/10 and 17/5 are readable answers, and different from 3 2/5
  if (d < 1) throw new Error("a denominator of at least 1");
  void g;
  return `${m[1] ? "-" : ""}${w ? `${w} ` : ""}${n}/${d}`;
}
function ratioCanonical(raw: string): string {
  const parts = normalise(raw).split(":").map((x) => x.trim());
  if (parts.length < 2 || parts.some((x) => !/^\d{1,9}$/.test(x))) throw new Error("whole numbers separated by :");
  return parts.map((x) => String(Number(x))).join(":");
}

// ---------------------------------------------------------------- the entry points

/** The canonical form of an answer of this type (null: not an answer of this type). Sampled types have no canonical
 * form (use `sameAnswer`); written answers are never compared. */
export function canonicalOf(type: AnswerType, raw: string): string | null {
  const t = raw.trim().replace(/−/g, "-");
  if (!t || t.length > 300) return null;
  try {
    switch (type) {
      case "polynomial":
        return polynomial(t);
      case "exact":
        return exactCanonical(t);
      case "roots": {
        const parts = splitTop(normalise(t).replace(/^\{(.*)\}$/, "$1")).map(exactNumber);
        return new Set(parts).size === parts.length ? [...parts].sort().join("&") : null;
      }
      case "tuple":
        return tupleCanonical(t);
      case "matrix":
        return matrixCanonical(t);
      case "interval":
        return intervalCanonical(t);
      case "ratio":
        return ratioCanonical(t);
      case "mixed":
        return mixedCanonical(t);
      case "expression":
      case "antiderivative": {
        parse(type === "antiderivative" ? stripC(t) : t);
        return null;
      }
      default:
        return null;
    }
  } catch {
    return null;
  }
}
/** Whether a response reads as an answer of this type at all (for "that is not an answer" feedback). */
export function readable(type: AnswerType, raw: string): boolean {
  if (HUMAN.has(type)) return raw.trim().length > 0;
  if (SAMPLED.has(type)) {
    try {
      parse(type === "antiderivative" ? stripC(raw) : raw);
      return true;
    } catch {
      return false;
    }
  }
  return canonicalOf(type, raw) !== null;
}
/** Equality of two answers of a new type (answers@2). Written answers are never equal automatically. */
export function sameAnswer(type: AnswerType, a: string, b: string): boolean {
  if (HUMAN.has(type)) return false;
  if (SAMPLED.has(type)) {
    try {
      return sameSampled(a, b, type === "antiderivative");
    } catch {
      return false;
    }
  }
  const x = canonicalOf(type, a);
  return x !== null && x === canonicalOf(type, b);
}
export const NEW_TYPES: ReadonlySet<AnswerType> = new Set(["exact", "roots", "tuple", "matrix", "interval", "ratio", "mixed", "expression", "antiderivative", "written"]);
