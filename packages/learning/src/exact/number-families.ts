/**
 * Exact checkers for existing number/arithmetic families (Item 2). Each one re-derives the answer from the
 * learner-visible PROMPT only, with exact BigInt rationals and a method different from the generator's
 * (e.g. divisor enumeration for HCF, never Euclid). A checker never reads family parameters or calls def.solve.
 * Step claims are checked by exact identities where the step is an arithmetic claim.
 */
import { add, sub, mul, div, q, eq, parseDecimal, parseAnswer, type Q } from "./rational.ts";

export type Expected =
  | { kind: "int"; q: Q }
  | { kind: "frac"; q: Q; lowest: boolean }       // any equivalent form is accepted by the app; the stored answer must be lowest terms when lowest
  | { kind: "mixed"; q: Q }                       // simplest mixed form required
  | { kind: "dec"; q: Q }
  | { kind: "ratio"; a: bigint; b: bigint }
  | { kind: "tuple"; items: string[] }
  | { kind: "surd"; v: Q };                        // the positive square root of v, written √A/B (or exactly rational when v is a rational square)            // an ordered list of the prompt's own fraction tokens, as the app writes it "(a, b, c)"
export interface Step { id: string; op: string; inputs: (number | string)[]; value: unknown }
export interface FamilyExact {
  id: string;
  /** `figure` is the picture/table shown with the question (learner-visible data), when the prompt refers to one. */
  expected(prompt: string, figure?: any): Expected | null;
  /** null = steps are consistent; a string = the first false claim. Absent: only the final answer is checked. */
  steps?(prompt: string, steps: Step[], exp: Expected): string | null;
}
const B = (s: string) => BigInt(s.replace(/,/g, ""));
const num = (v: unknown): bigint | null => (typeof v === "number" && Number.isInteger(v) ? BigInt(v) : typeof v === "string" && /^-?\d+$/.test(v) ? BigInt(v) : null);
const divisors = (n: bigint) => { const out: bigint[] = []; for (let k = 1n; k <= n; k++) if (n % k === 0n) out.push(k); return out; };
const bigintHcf = (a: bigint, b: bigint) => { const da = new Set(divisors(a)); return divisors(b).filter((k) => da.has(k)).pop()!; };

/** Generic exact identity for two-number add/subtract/multiply/divide steps; null = holds. */
function arithClaim(s: Step): string | null {
  const a = num(s.inputs[0]), b = num(s.inputs[1]), v = num(s.value);
  if (a === null || b === null || v === null || s.inputs.length !== 2) return `step ${s.id}: not an exact two-integer claim`;
  const ok = s.op === "add" ? a + b === v : s.op === "subtract" ? a - b === v : s.op === "multiply" ? a * b === v : s.op === "divide" ? b !== 0n && a === v * b : false;
  return ok ? null : `step ${s.id}: ${s.op}(${a},${b}) ≠ ${v}`;
}
const allArith = (steps: Step[]) => { for (const s of steps) { const r = arithClaim(s); if (r) return r; } return null; };

const frac = (s: string) => { const m = s.match(/^(\d+)\/(\d+)$/); return m ? q(B(m[1]), B(m[2])) : null; };
const mixedTok = (s: string): Q | null => { const m = s.match(/^(?:(\d+) )?(\d+)\/(\d+)$/); if (m) return add(q(m[1] ? B(m[1]) : 0n), q(B(m[2]), B(m[3]))); return /^\d+$/.test(s) ? q(B(s)) : null; };

export const NUMBER_FAMILIES: FamilyExact[] = [
  {
    id: "hcf",
    expected: (p) => { const m = p.match(/^What is the highest common factor \(HCF\) of (\d+) and (\d+)\?$/); return m ? { kind: "int", q: q(bigintHcf(B(m[1]), B(m[2]))) } : null; },
    steps(p, steps, exp) {
      const m = p.match(/of (\d+) and (\d+)\?/)!; let x = B(m[2]), y = B(m[1]);
      for (const s of steps) {
        if (s.op !== "divide" || num(s.inputs[0]) !== x || num(s.inputs[1]) !== y || num(s.value) !== x % y) return `step ${s.id}: not the Euclid step ${x} mod ${y}`;
        [x, y] = [y, x % y];
      }
      return y === 0n && exp.kind === "int" && x === exp.q.n ? null : "chain does not end at the HCF";
    },
  },
  {
    id: "faddu",
    expected: (p) => { const m = p.match(/^(\d+)\/(\d+) \+ (\d+)\/(\d+) = \? \(A fraction is fine\.\)$/); return m ? { kind: "frac", q: add(q(B(m[1]), B(m[2])), q(B(m[3]), B(m[4]))), lowest: true } : null; },
    steps(p, steps, exp) {
      const m = p.match(/^(\d+)\/(\d+) \+ (\d+)\/(\d+)/)!; const a = B(m[1]), b = B(m[2]), c = B(m[3]), d = B(m[4]);
      const l = num(steps[0]?.value);
      // the common denominator is a common multiple of both, and the least one
      if (steps[0]?.id !== "common" || l === null || l % b || l % d) return "common denominator is not a common multiple";
      for (let k = 1n; k < l; k++) if (k % b === 0n && k % d === 0n) return "common denominator is not the least";
      const ren = steps[1]?.value as unknown;
      if (!Array.isArray(ren) || num(ren[0]) !== (a * l) / b || num(ren[1]) !== (c * l) / d) return "renamed numerators are wrong";
      const last = steps[2]?.value;
      return exp.kind === "frac" && typeof last === "number" && Math.abs(last - Number(exp.q.n) / Number(exp.q.d)) < 1e-12 ? null : "last step does not give the exact sum";
    },
  },
  {
    id: "avfas",
    expected: (p) => {
      const m = p.match(/^(.+?) ([+−]) (.+?) = \? Write the answer in its simplest form, as a mixed number if it is more than 1\.$/);
      if (!m) return null; const x = mixedTok(m[1]), y = mixedTok(m[3]); if (!x || !y) return null;
      return { kind: "mixed", q: m[2] === "+" ? add(x, y) : sub(x, y) };
    },
    steps(p, steps, exp) {
      const m = p.match(/^(.+?) [+−] (.+?) = /)!; const dn = (t: string) => B(t.includes("/") ? t.split("/")[1] : "1");
      const L = num(steps[0]?.value), b = dn(m[1]), d = dn(m[2]);
      if (steps[0]?.id !== "common" || L === null || L % b || L % d) return "common denominator is not a common multiple";
      for (let k = 1n; k < L; k++) if (k % b === 0n && k % d === 0n) return "common denominator is not the least";
      const last = steps[steps.length - 1];
      return exp.kind === "mixed" && typeof last?.value === "string" && eq(parseAnswer(last.value)!, exp.q) ? null : "last step does not give the exact result";
    },
  },
  {
    id: "avdiv",
    expected: (p) => {
      let m = p.match(/^Use long division to work out (\d+) ÷ (\d+)\. What is the (quotient|remainder)\?$/);
      if (m) { const n = B(m[1]), d = B(m[2]); let r = n, k = 0n; while (r >= d) { r -= d; k++; } return { kind: "int", q: q(m[3] === "quotient" ? k : r) }; }
      m = p.match(/^A division has divisor (\d+), quotient (\d+) and remainder (\d+)\. Use dividend = divisor × quotient \+ remainder\. What is the dividend\?$/);
      if (m) { let n = B(m[3]); for (let i = 0n; i < B(m[2]); i++) n += B(m[1]); return { kind: "int", q: q(n) }; }
      return null;
    },
    steps(p, steps) {
      const m = p.match(/(\d+) ÷ (\d+)/);
      if (m) {
        const n = B(m[1]), d = B(m[2]);
        const [a, b, c] = steps; const Q_ = num(a?.value);
        if (steps.length !== 3 || a.op !== "divide" || Q_ === null || Q_ !== n / d) return "quotient step is not floor(n/d)";
        if (num(b.value) !== d * Q_ || arithClaim(b)) return "back-multiplication is false";
        const r = num(c.value); return r !== null && r === n - d * Q_ && r >= 0n && r < d ? null : "remainder step is not n − d·q in [0,d)";
      }
      return allArith(steps);
    },
  },
  {
    id: "adcol3",
    expected: (p) => { const m = p.match(/^([\d,]+) ([+−]) ([\d,]+) = \?$/); return m ? { kind: "int", q: m[2] === "+" ? q(B(m[1]) + B(m[3])) : q(B(m[1]) - B(m[3])) } : null; },
  },
  {
    id: "adcolx",
    expected: (p) => { const m = p.match(/^([\d,]+) ([+−]) ([\d,]+) = \?$/); return m ? { kind: "int", q: m[2] === "+" ? q(B(m[1]) + B(m[3])) : q(B(m[1]) - B(m[3])) } : null; },
  },
  {
    id: "ajsi",
    expected: (p) => {
      let m = p.match(/^Find the simple interest on ₹([\d,]+) for (\d+) years? at (\d+)% per year, in rupees\.$/);
      if (m) return { kind: "int", q: div(mul(q(B(m[1]) * B(m[3])), q(B(m[2]))), q(100)) };
      m = p.match(/^₹([\d,]+) is lent for (\d+) years? at (\d+)% simple interest per year\. What is the amount \(principal \+ interest\) at the end, in rupees\?$/);
      if (m) return { kind: "int", q: add(q(B(m[1])), div(mul(q(B(m[1]) * B(m[3])), q(B(m[2]))), q(100))) };
      m = p.match(/^The simple interest on ₹([\d,]+) for (\d+) years? is ₹([\d,]+)\. What is the rate of interest per year, in per cent\?$/);
      if (m) return { kind: "int", q: div(mul(q(B(m[3])), q(100)), mul(q(B(m[1])), q(B(m[2])))) };
      m = p.match(/^The simple interest on ₹([\d,]+) at (\d+)% per year is ₹([\d,]+)\. For how many years was the money lent\?$/);
      if (m) return { kind: "int", q: div(mul(q(B(m[3])), q(100)), mul(q(B(m[1])), q(B(m[2])))) };
      m = p.match(/^The simple interest on a sum of money for (\d+) years? at (\d+)% per year is ₹([\d,]+)\. What is the sum \(the principal\), in rupees\?$/);
      if (m) return { kind: "int", q: div(mul(q(B(m[3])), q(100)), mul(q(B(m[1])), q(B(m[2])))) };
      return null;
    },
    // steps: first multiply is "R per cent of P" (P×R/100), later multiplies are plain; divides are exact quotients
    steps: (p, steps) => {
      for (const s of steps) {
        const a = num(s.inputs[0]), b = num(s.inputs[1]), v = num(s.value);
        if (a === null || b === null || v === null) return `step ${s.id}: not integers`;
        const ok = s.id === "year" ? a * b === v * 100n : s.op === "multiply" ? a * b === v : s.op === "add" ? a + b === v : s.op === "divide" ? b !== 0n && a === v * b : false;
        if (!ok) return `step ${s.id}: ${s.op}(${a},${b}) ≠ ${v}`;
      }
      return null;
    },
  },
  {
    id: "avmarked",
    expected: (p) => {
      let m = p.match(/^After a discount of (\d+)% on its marked price, a shirt is sold for ₹([\d,]+)\. What is its marked price, in rupees\?$/);
      if (m) return { kind: "int", q: div(mul(q(B(m[2])), q(100)), q(100n - B(m[1]))) };
      m = p.match(/^A trader buys an old bicycle for ₹([\d,]+), spends ₹([\d,]+) on repairs, and sells it for ₹([\d,]+)\. What is the (profit|loss) per cent\?$/);
      if (m) { const cp = B(m[1]) + B(m[2]), sp = B(m[3]); const g = m[4] === "profit" ? sp - cp : cp - sp; return g <= 0n ? null : { kind: "int", q: div(q(g * 100n), q(cp)) }; }
      return null;
    },
    // add/subtract are plain; a divide is "a as a per cent of b" (a×100/b) when it is the last step of a profit/loss, or a ÷ (b per cent) for a marked price
    steps: (p, steps) => {
      for (const s of steps) {
        const a = num(s.inputs[0]), b = num(s.inputs[1]), v = num(s.value);
        if (a === null || b === null || v === null) return `step ${s.id}: not integers`;
        const ok = s.op === "add" ? a + b === v : s.op === "subtract" ? a - b === v : s.op === "divide" ? b !== 0n && (s.id === "percent" ? a * 100n === v * b : a * 100n === v * b) : false;
        if (!ok) return `step ${s.id}: ${s.op}(${a},${b}) ≠ ${v}`;
      }
      return null;
    },
  },
  {
    id: "eqfrac",
    expected: (p) => { const m = p.match(/^(\d+)\/(\d+) = □\/(\d+)$/); return m ? { kind: "int", q: div(mul(q(B(m[1])), q(B(m[3]))), q(B(m[2]))) } : null; },
    steps: (p, steps) => allArith(steps),
  },
  {
    id: "fmulw",
    expected: (p) => { const m = p.match(/^(\d+) × (\d+)\/(\d+) = \? \(A fraction is fine\.\)$/); return m ? { kind: "frac", q: mul(q(B(m[1])), q(B(m[2]), B(m[3]))), lowest: true } : null; },
  },
  {
    id: "aiint",
    expected: (p) => {
      const m = p.match(/^\((−?\d+)\)|^(−?\d+)/); void m;
      const t = p.match(/^(\(?−?\d+\)?) ([+−]) (\(?−?\d+\)?) = \?$/);
      if (!t) return null;
      const n = (s: string) => B(s.replace(/[()]/g, "").replace("−", "-"));
      return { kind: "int", q: q(t[2] === "+" ? n(t[1]) + n(t[3]) : n(t[1]) - n(t[3])) };
    },
  },
  {
    id: "agdec",
    expected: (p) => {
      const m = p.match(/^Work out (\d+(?:\.\d+)?) ([+−]) (\d+(?:\.\d+)?)\.$/); if (!m) return null;
      const x = parseDecimal(m[1])!, y = parseDecimal(m[3])!; return { kind: "dec", q: m[2] === "+" ? add(x, y) : sub(x, y) };
    },
  },
  {
    id: "ajrat",
    expected: (p) => {
      let m = p.match(/^Write the ratio (\d+) : (\d+) in its simplest form\.$/); let a: bigint, b: bigint;
      if (m) { a = B(m[1]); b = B(m[2]); }
      else {
        m = p.match(/^Write the ratio of (\d+) (mm|cm|m|g|kg) to (\d+) (mm|cm|m|g|kg) in its simplest form\.$/); if (!m) return null;
        const U: Record<string, bigint> = { mm: 1n, cm: 10n, m: 1000n, g: 1n, kg: 1000n };
        const mass = (u: string) => u === "g" || u === "kg"; if (mass(m[2]) !== mass(m[4])) return null;
        a = B(m[1]) * U[m[2]]; b = B(m[3]) * U[m[4]];
      }
      let x = a, y = b; while (y) [x, y] = [y, x % y];
      return { kind: "ratio", a: a / x, b: b / x };
    },
  },
];

/** Round a decimal half-up (away from zero) to 10^-places, exactly. */
const roundHalfUp = (v: Q, places: number): Q => {
  const sc = 10n ** BigInt(places); const x = mul(v, q(sc)); const neg = x.n < 0n; const ax = neg ? -x.n : x.n;
  const r = (2n * ax + x.d) / (2n * x.d); return q((neg ? -r : r), sc);
};
const order = (p: string): Expected | null => {
  const m = p.match(/^Write these fractions in order from the smallest to the largest: (.+?)\. Write them in brackets, separated by commas\.$/); if (!m) return null;
  const toks = m[1].split(", "); const vs = toks.map(frac); if (vs.some((v) => !v)) return null;
  const idx = toks.map((_, i) => i).sort((i, j) => { const d = sub(vs[i]!, vs[j]!); return d.n < 0n ? -1 : d.n > 0n ? 1 : 0; });
  for (let i = 1; i < idx.length; i++) if (eq(vs[idx[i - 1]]!, vs[idx[i]]!)) return null; // equal values: the order would be ambiguous
  return { kind: "tuple", items: idx.map((i) => toks[i]) };
};
NUMBER_FAMILIES.push(
  { id: "aerdec", expected: (p) => {
      const m = p.match(/^Round (\d+(?:\.\d+)?) to the nearest (whole number|tenth|hundredth)\.$/); if (!m) return null;
      return { kind: "dec", q: roundHalfUp(parseDecimal(m[1])!, m[2] === "whole number" ? 0 : m[2] === "tenth" ? 1 : 2) };
  } },
  { id: "aeround", expected: (p) => {
      const m = p.match(/^Round ([\d,]+) to the nearest (ten|hundred|thousand)\.$/); if (!m) return null;
      const u = m[2] === "ten" ? 10n : m[2] === "hundred" ? 100n : 1000n; const x = B(m[1]);
      return { kind: "int", q: q(((x + u / 2n) / u) * u) };
  } },
  { id: "adford", expected: order },
  { id: "adfordu", expected: order },
  { id: "ajcrore", expected: (p) => {
      let m = p.match(/^Write the number "(.+)" in figures\. Type the digits without commas\.$/);
      if (m) { const U: Record<string, bigint> = { crore: 10_000_000n, lakh: 100_000n, thousand: 1000n }; let t = 0n;
        for (const part of m[1].split(" ").reduce<string[][]>((a, w, i, arr) => (i % 2 ? a : [...a, [w, arr[i + 1]]]), [])) { if (!U[part[1]]) return null; t += B(part[0]) * U[part[1]]; }
        return { kind: "int", q: q(t) }; }
      m = p.match(/^(\d+) million is how many lakh\?$/); if (m) return { kind: "int", q: q(B(m[1]) * 10n) };
      m = p.match(/^(\d+) billion is how many crore\?$/); if (m) return { kind: "int", q: q(B(m[1]) * 100n) };
      return null;
  } },
);
export { eq, parseAnswer };
