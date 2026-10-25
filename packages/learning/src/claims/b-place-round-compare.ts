import { Rational, parseRational, rat, roundHalfUp } from "../claim-kit";
import type { Claim, ClaimTable, Check, Problem, Step } from "../claim-kit";

/** Phase 1 claims: b-place-round-compare. */

const pow10 = (e: number): Rational => (e >= 0 ? rat(10n ** BigInt(e)) : new Rational(1n, 10n ** BigInt(-e)));
const num = (x: unknown): Rational | null => (typeof x === "number" || typeof x === "string" ? parseRational(x) : null);
/** A stated value that must be a choice index into problem.options; returns the chosen option text. */
const chosen = (s: Step, p: Problem): string | null => {
  const v = s.value;
  if (typeof v !== "number" || !Number.isInteger(v) || !p.options || v < 0 || v >= p.options.length) return null;
  return p.options[v];
};
/** Exact value of a term "d" or "d × place" (commas allowed in the place) as [digit 1-9, power-of-ten exponent]. */
const digitTimesPlace = (t: string): [number, number] | null => {
  const parts = t.split("×").map((x) => x.trim().replace(/,/g, ""));
  if (parts.length > 2 || parts.some((x) => !/^\d+$/.test(x))) return null;
  const d = Number(parts[0]);
  if (d < 1 || d > 9) return null;
  if (parts.length === 1) return [d, 0];
  if (!/^10*$/.test(parts[1])) return null;
  return [d, parts[1].length - 1];
};

// ---------------------------------------------------------------- aenumf/place
// Reading: the stated value is the index of the chosen option; the number n and the task come from the prompt
// (Indian/International number name, commas, expanded form); the chosen option is read back to a number and compared with n.
const ONES: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19 };
const TENS: Record<string, number> = { twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };
const SCALE: Record<string, bigint> = { thousand: 1000n, lakh: 100000n, crore: 10000000n, million: 1000000n };
/** Number name -> value, with the scale words allowed for the system, in strictly decreasing order. */
function readName(name: string, indian: boolean): bigint | null {
  const words = name.trim().toLowerCase().split(/[\s-]+/).filter(Boolean);
  if (!words.length) return null;
  let total = 0n, last = 10n ** 12n;
  let hundreds = 0, tens = 0, ones = 0, seen = false, hundredWord = false;
  const group = () => hundreds * 100 + tens + ones;
  for (const w of words) {
    if (w in ONES) { if (ones || tens + 0 && ONES[w] > 9 || (!tens && ones)) return null; ones = ONES[w]; seen = true; }
    else if (w in TENS) { if (tens || ones) return null; tens = TENS[w]; seen = true; }
    else if (w === "hundred") { if (hundredWord || hundreds || tens || !ones || ones > 9) return null; hundreds = ones; ones = 0; hundredWord = true; }
    else if (w in SCALE) {
      if (indian ? w === "million" : w !== "thousand" && w !== "million") return null;
      const g = group();
      if (!seen || g === 0 || (indian && g >= 100) || (!indian && g >= 1000)) return null;
      if (SCALE[w] >= last) return null;
      total += BigInt(g) * SCALE[w]; last = SCALE[w];
      hundreds = tens = ones = 0; seen = false; hundredWord = false;
    } else return null;
  }
  if (seen) { if (last <= 100n) return null; total += BigInt(group()); }
  return total;
}
const aenumf: Check = (s, p) => {
  const o = chosen(s, p);
  if (o === null) return null;
  const m = p.prompt.match(/^Which is the number name of ([\d,]+) in the (Indian|International) system\?$/)
    ?? p.prompt.match(/^Which shows (\d+) with commas placed correctly in the (Indian|International) system\?$/)
    ?? p.prompt.match(/^Which is the expanded form of ([\d,]+)\?$/);
  if (!m) return null;
  const n = m[1].replace(/,/g, "");
  if (!/^[1-9]\d*$/.test(n)) return null;
  if (p.prompt.startsWith("Which is the number name")) return readName(o, m[2] === "Indian") === BigInt(n);
  if (p.prompt.startsWith("Which shows")) {
    if (o.replace(/,/g, "") !== n) return false;
    return m[2] === "Indian" ? /^(\d{1,2}(,\d{2})*,\d{3}|\d{1,3})$/.test(o) : /^(\d{1,3}(,\d{3})+|\d{1,3})$/.test(o);
  }
  // expanded form: terms digit × power of ten, strictly decreasing places, summing to n
  let sum = 0n, prev = 99;
  for (const t of o.split("+")) {
    const d = digitTimesPlace(t);
    if (!d || d[1] >= prev) return false;
    prev = d[1];
    sum += BigInt(d[0]) * 10n ** BigInt(d[1]);
  }
  return sum === BigInt(n);
};

// ---------------------------------------------------------------- aedpv/place
// Reading: the stated value is the index of the chosen option. Kind from the prompt: place value of digit D in N;
// expanded form of N; the number with the stated tens ... thousandths. N and D come from the prompt.
const aedpv: Check = (s, p) => {
  const o = chosen(s, p);
  if (o === null) return null;
  let m = p.prompt.match(/^What is the place value of the digit (\d) in (\d+\.\d+)\?$/);
  if (m) {
    const N = m[2], dot = N.indexOf("."), idxs: number[] = [];
    for (let i = 0; i < N.length; i++) if (i !== dot && N[i] === m[1]) idxs.push(i);
    if (idxs.length !== 1) return null; // the digit must identify one place
    const i = idxs[0];
    const e = i < dot ? dot - 1 - i : -(i - dot);
    const stated = parseRational(o);
    return !!stated && stated.eq(rat(BigInt(m[1])).mul(pow10(e)));
  }
  m = p.prompt.match(/^Which is the expanded form of (\d+\.\d+)\?$/);
  if (m) {
    const N = parseRational(m[1]);
    if (!N) return null;
    let sum = rat(0n), prev = 99;
    for (const t of o.split("+")) {
      const r = parseRational(t.trim());
      if (!r || r.numBig <= 0n) return false;
      let hit: number | null = null;
      for (let e = 1; e >= -3; e--) { const q = r.div(pow10(e)); if (q.isInteger() && q.numBig >= 1n && q.numBig <= 9n) hit = e; }
      if (hit === null || hit >= prev) return false;
      prev = hit; sum = sum.add(r);
    }
    return sum.eq(N);
  }
  m = p.prompt.match(/^Which number has (\d) tens, (\d) ones, (\d) tenths, (\d) hundredths and (\d) thousandths\?$/);
  if (m) {
    let v = rat(0n);
    [1, 0, -1, -2, -3].forEach((e, i) => { v = v.add(rat(BigInt(m![i + 1])).mul(pow10(e))); });
    const stated = parseRational(o);
    return !!stated && stated.eq(v);
  }
  return null;
};

// ---------------------------------------------------------------- aerdec/compare, aernd/compare
/** The digit of a positive rational at 10^-k's place... i.e. floor(n * 10^k) mod 10. */
const digitAt = (n: Rational, k: number): Rational => rat((((n.numBig * 10n ** BigInt(k)) / n.denBig) % 10n));
// aerdec: inputs [decimal, place] with place 0/1/2 = round to whole/tenth/hundredth; the deciding digit is the next one
// after that place: the 1st/2nd/3rd digit after the point.
const aerdecCompare: Claim = (s) => {
  if (s.inputs.length !== 2) return null;
  const n = num(s.inputs[0]), place = num(s.inputs[1]);
  if (!n || !place || !place.isInteger() || place.numBig < 0n || place.numBig > 2n || n.numBig < 0n) return null;
  return digitAt(n, Number(place.numBig) + 1);
};
// aernd: inputs [n, unit]: the deciding digit is the digit just right of the unit's place, floor((n mod unit) / (unit / 10)).
const aerndCompare: Claim = (s) => {
  if (s.inputs.length !== 2) return null;
  const n = num(s.inputs[0]), u = num(s.inputs[1]);
  if (!n || !u || !n.isInteger() || !u.isInteger() || n.numBig <= 0n || !/^10+$/.test(u.numBig.toString())) return null;
  const k = u.numBig.toString().length - 1; // unit = 10^k, so the deciding digit is the digit at 10^(k-1)
  return rat((n.numBig / 10n ** BigInt(k - 1)) % 10n);
};

// ---------------------------------------------------------------- adestchk
// Reading: the prompt "X worked out A + B and got C"; the estimate rounds A and B to the nearest ten (half up) and
// combines them; the answer is sensible when within 15 of the estimate (slips are at least 40 away), else too small/too big.
function estParse(p: Problem): { a: bigint; b: bigint; sub: boolean; c: bigint } | null {
  const m = p.prompt.match(/worked out (\d+) ([+−-]) (\d+) and got (-?\d+)\. Round each number to the nearest ten/);
  return m ? { a: BigInt(m[1]), b: BigInt(m[3]), sub: m[2] !== "+", c: BigInt(m[4]) } : null;
}
const r10 = (n: bigint): bigint => ((n + 5n) / 10n) * 10n;
const adestchkRound: Check = (s, p) => {
  const e = estParse(p);
  if (!e || s.inputs.length !== 2) return null;
  if (String(s.inputs[0]) !== String(e.a) || String(s.inputs[1]) !== String(e.b)) return false;
  return s.value === `${r10(e.a)} and ${r10(e.b)}`;
};
const adestchkCompare: Check = (s, p) => {
  const e = estParse(p);
  if (!e || s.inputs.length !== 2) return null;
  const est = e.sub ? r10(e.a) - r10(e.b) : r10(e.a) + r10(e.b);
  if (String(s.inputs[0]) !== String(e.c) || String(s.inputs[1]) !== String(est)) return false;
  const d = e.c - est;
  const w = d >= -15n && d <= 15n ? "The answer is sensible" : d < 0n ? "The answer is too small to be right" : "The answer is too big to be right";
  return s.value === w;
};

// ---------------------------------------------------------------- aedecc/compare
// Reading: the prompt "Which number is greater: X or Y?"; the stated value must be the greater of the two.
const aedeccCompare: Claim = (s, p) => {
  const m = p.prompt.match(/^Which number is greater: (\d+\.\d+) or (\d+\.\d+)\? Write the greater number\.$/);
  if (!m) return null;
  const x = parseRational(m[1]), y = parseRational(m[2]);
  if (!x || !y || x.eq(y)) return null;
  return x.gt(y) ? x : y;
};

// ---------------------------------------------------------------- aedord/compare, aecmp/compare
// Reading: the numbers are listed in the prompt; the stated value is "(a, b, c, d)" and must be exactly those numbers
// in ascending order (every number once, each smaller than the next).
const orderCheck = (re: RegExp, clean: (t: string) => string): Check => (s, p) => {
  const m = p.prompt.match(re);
  if (!m) return null;
  const xs = m[1].split(";").map((t) => parseRational(clean(t)));
  if (xs.length < 2 || xs.some((x) => !x)) return null;
  const want = (xs as Rational[]).slice().sort((a, b) => (a.lt(b) ? -1 : b.lt(a) ? 1 : 0));
  if (typeof s.value !== "string") return false;
  const t = s.value.trim().match(/^\((.*)\)$/);
  if (!t) return false;
  const got = t[1].split(",").map((u) => parseRational(u.trim()));
  if (got.length !== want.length || got.some((x) => !x)) return false;
  return (got as Rational[]).every((x, i) => x.eq(want[i]));
};
const aedordCompare = orderCheck(/ascending order \(smallest first\): ([\d.;\s]+?)\. Write them in brackets/, (t) => t.trim());
const aecmpCompare = orderCheck(/ascending order \(smallest first\): ([\d,;\s]+?)\. Write the list in brackets/, (t) => t.trim().replace(/,/g, ""));

// ---------------------------------------------------------------- accmpx/compare
// Reading: the prompt "L ○ R" with L, R each "a + b", "a − b" or "a × b". Step with 3 inputs [u, v, f] ("change") states
// L − R; the step with 1 input [d] ("sign") states the sign of L compared with R as "<", ">" or "=".
function evalSide(t: string): bigint | null {
  const m = t.trim().match(/^(\d+) ([+−×]) (\d+)$/);
  if (!m) return null;
  const a = BigInt(m[1]), b = BigInt(m[3]);
  return m[2] === "+" ? a + b : m[2] === "−" ? a - b : a * b;
}
function sides(p: Problem): [bigint, bigint] | null {
  const m = p.prompt.match(/without working out both sides in full: (.+) ○ (.+)$/);
  if (!m) return null;
  const L = evalSide(m[1]), R = evalSide(m[2]);
  return L === null || R === null ? null : [L, R];
}
const accmpxCompare: ClaimTable[string] = {
  check: (s, p) => {
    const lr = sides(p);
    if (!lr) return null;
    const [L, R] = lr;
    if (s.inputs.length === 3) return typeof s.value === "number" || typeof s.value === "string" ? (() => { const v = parseRational(s.value as number | string); return !!v && v.eq(rat(L - R)); })() : false;
    if (s.inputs.length === 1) return s.value === (L < R ? "<" : L > R ? ">" : "=");
    return null;
  },
};

export const CLAIMS: ClaimTable = {
  "aenumf/place": { check: aenumf },
  "aedpv/place": { check: aedpv },
  "aerdec/compare": aerdecCompare,
  "aernd/compare": aerndCompare,
  "adestchk/compare": { check: adestchkCompare },
  "adestchk/round": { check: adestchkRound },
  "aedecc/compare": aedeccCompare,
  "aedord/compare": { check: aedordCompare },
  "aecmp/compare": { check: aecmpCompare },
  "accmpx/compare": accmpxCompare,
};
