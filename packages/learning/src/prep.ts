/**
 * prep@1: "before you answer". For some groups of questions the documented mistake is to skip one small thing: an
 * estimate is worked out exactly without rounding first; a length in metres and centimetres has its digits written side
 * by side without changing the metres. The prep is that one thing, asked in its own boxes before the answer box appears.
 *
 * It is an aid (support-ladder@1): it fades to the plain box as the child gets such questions right, and is never in a
 * test. Everything is read from the question's own words by rule and kept only when the prep's own arithmetic gives the
 * question's verified answer; a prep box never holds the answer itself.
 */
export interface PrepStep { lead: string; after?: string; value: string; /** said after a wrong entry */ why: string; /** said after a second wrong entry: the fact itself */ tell: string }
export type PrepAsk = { kind: "prep"; steps: PrepStep[]; /** shown above the answer box once the steps are done */ then: string };

const num = (t: string) => Number(t.replace(/,/g, ""));
const show = (n: number) => (Number.isInteger(n) ? String(n) : String(Math.round(n * 1000) / 1000));
const PLACE: Record<string, number> = { ten: 10, hundred: 100, thousand: 1000, "whole number": 1 };
const half = (n: number, unit: number) => Math.floor(n / unit + 0.5) * unit;
const OPS: Record<string, (a: number, b: number) => number> = { "+": (a, b) => a + b, "−": (a, b) => a - b, "-": (a, b) => a - b, "×": (a, b) => a * b, "÷": (a, b) => a / b };

/** Estimates: each number is rounded first (to the named place, or its greatest place), then they are combined. */
function estimate(prompt: string, answer: number): PrepAsk | null {
  const m = /Estimate ([\d,.]+) ([+−\-×÷]) ([\d,.]+)/.exec(prompt);
  if (!m) return null;
  const a = num(m[1]), b = num(m[3]), op = OPS[m[2]];
  const two = /round(?:ing)? [\d,.]+ to the nearest (ten|hundred|thousand) and [\d,.]+ to the nearest (ten|hundred|thousand)/.exec(prompt);
  const each = /each number to the nearest (ten|hundred|thousand|whole number)/.exec(prompt);
  const top = (n: number) => 10 ** (String(Math.floor(n)).length - 1);
  const units: [number, number] | null = two ? [PLACE[two[1]], PLACE[two[2]]] : each ? [PLACE[each[1]], PLACE[each[1]]] : /greatest place/.test(prompt) ? [top(a), top(b)] : null;
  if (!units || !op) return null;
  const ra = half(a, units[0]), rb = half(b, units[1]);
  if (Math.abs(op(ra, rb) - answer) > 1e-9) return null;
  const word = (u: number) => (u === 1 ? "whole number" : u === 10 ? "ten" : u === 100 ? "hundred" : u === 1000 ? "thousand" : show(u));
  const step = (n: number, u: number, r: number): PrepStep => {
    const lo = Math.floor(n / u) * u;
    return { lead: `${show(n)} is about`, value: show(r), why: `Which two ${word(u)}s is ${show(n)} between? Which one is nearer?`, tell: `${show(n)} is between ${show(lo)} and ${show(lo + u)}, and ${n - lo === u / 2 ? "halfway goes up" : `nearer to ${show(r)}`}.` };
  };
  return { kind: "prep", steps: [step(a, units[0], ra), step(b, units[1], rb)], then: `Now ${show(ra)} ${m[2] === "-" ? "−" : m[2]} ${show(rb)} =` };
}

/** Exchanges: a bigger unit is changed into the smaller one before anything is added. */
const UNIT: Record<string, string> = { m: "m", cm: "cm", mm: "mm", km: "km", kg: "kg", g: "g", L: "L", mL: "mL", hour: "hour", hours: "hour", minute: "minute", minutes: "minute", second: "second", seconds: "second", day: "day", days: "day", paise: "paise", centimetres: "cm", millimetres: "mm", metres: "m", grams: "g", millilitres: "mL" };
const FACTOR: Record<string, number> = { "m>cm": 100, "cm>mm": 10, "km>m": 1000, "kg>g": 1000, "L>mL": 1000, "hour>minute": 60, "minute>second": 60, "day>hour": 24, "rupee>paise": 100 };
const many = (u: string, n: number) => (["hour", "minute", "second", "day"].includes(u) && n !== 1 ? `${u}s` : u);
function exchange(prompt: string, answer: number): PrepAsk | null {
  let big = 0, bigU = "", small = 0, smallU = "";
  const a = /^([\d,]+) (m|cm|km|kg|L) (?:([\d,]+) (cm|mm|m|g|mL) )?= how many (\w+)\?/.exec(prompt);
  const b = /^How many (minutes|seconds|hours|paise) are there in (₹)?([\d,]+)(?: (hours?|minutes?|days?))?(?: (?:and )?([\d,]+) (minutes|hours|paise|seconds))?\?/.exec(prompt);
  if (a) { big = num(a[1]); bigU = UNIT[a[2]]; small = a[3] ? num(a[3]) : 0; smallU = UNIT[a[5]] ?? ""; if (a[4] && UNIT[a[4]] !== smallU) return null; }
  else if (b) { big = num(b[3]); bigU = b[2] ? "rupee" : UNIT[b[4] ?? ""] ?? ""; small = b[5] ? num(b[5]) : 0; smallU = UNIT[b[1]]; if (b[6] && UNIT[b[6]] !== smallU) return null; }
  else return null;
  const f = FACTOR[`${bigU}>${smallU}`];
  if (!f || big < 1 || big * f + small !== answer) return null;
  const one = bigU === "rupee" ? "₹1" : `1 ${bigU}`, all = bigU === "rupee" ? `₹${big}` : `${big} ${many(bigU, big)}`, sm = many(smallU, 2);
  const fact: PrepStep = { lead: `${one} =`, after: sm, value: String(f), why: `How many ${sm} make ${one}? Think of ${bigU === "m" ? "a metre scale" : bigU === "hour" ? "a clock" : bigU === "rupee" ? "a rupee coin" : `one ${bigU}`}.`, tell: `${one} = ${f} ${sm}.` };
  const whole: PrepStep = { lead: `So ${all} =`, after: sm, value: String(big * f), why: `${all} is ${big} lots of ${f} ${sm}.`, tell: `${big} × ${f} = ${big * f}.` };
  // one of the bigger unit and nothing over: the fact would be the answer
  const steps = big === 1 ? (small ? [fact] : []) : small ? [fact, whole] : [fact];
  if (!steps.length) return null;
  return { kind: "prep", steps, then: small ? `Now ${big * f} + ${small} =` : `Now ${big} × ${f} =` };
}

/** teaching-cards@1, card 4: a two-digit number times one digit is done in its tens and its ones (the documented slips
 *  are multiplying the tens digit as if it were ones, and losing the carry). */
function splitMul(prompt: string, answer: number): PrepAsk | null {
  const m = /^(\d{1,2}) × (\d{1,2}) = \?$/.exec(prompt);
  if (!m) return null;
  const x = Number(m[1]), y = Number(m[2]);
  const [big, small] = x >= 10 && y <= 9 ? [x, y] : y >= 10 && x <= 9 ? [y, x] : [0, 0];
  if (big < 11 || big % 10 === 0 || small < 2 || big * small !== answer) return null;
  const tens = Math.floor(big / 10) * 10, ones = big % 10;
  const step = (part: number, what: string): PrepStep => ({ lead: `${part} × ${small} =`, value: String(part * small), why: what, tell: `${part} × ${small} = ${part * small}.` });
  return { kind: "prep", steps: [step(tens, `${big} is ${tens} and ${ones}. ${tens} is ${tens / 10} tens: ${tens / 10} × ${small} tens.`), step(ones, `Now the ones: ${ones} lots of ${small}.`)], then: `Now ${tens * small} + ${ones * small} =` };
}
/** Card 4: a times fact that is not yet known is built from two that are (5 of them, and the rest). */
function timesFact(prompt: string, answer: number): PrepAsk | null {
  const m = /^(\d) × ([6-9]) = \?$/.exec(prompt);
  if (!m) return null;
  const a = Number(m[1]), b = Number(m[2]), rest = b - 5;
  if (a < 2 || a * b !== answer) return null;
  const step = (k: number): PrepStep => ({ lead: `${a} × ${k} =`, value: String(a * k), why: `${b} is 5 and ${rest}. Do ${a} × ${k}: count in ${a}s, ${k} times.`, tell: `${a} × ${k} = ${a * k}.` });
  return { kind: "prep", steps: [step(5), step(rest)], then: `Now ${a * 5} + ${a * rest} =` };
}
/** Card 4: a remainder is what is left after the groups are taken (the documented slip gives the number of groups). */
function remainder(prompt: string, answer: number): PrepAsk | null {
  const m = /^(\d+) ÷ (\d+) = (\d+) remainder □/.exec(prompt);
  if (!m) return null;
  const n = Number(m[1]), d = Number(m[2]), q = Number(m[3]);
  if (n - q * d !== answer || q < 1) return null;
  return { kind: "prep", steps: [{ lead: `${q} groups of ${d}: ${q} × ${d} =`, value: String(q * d), why: `How many are used up by ${q} groups of ${d}?`, tell: `${q} × ${d} = ${q * d}.` }], then: `Now ${n} − ${q * d} =` };
}
/** Card 5: an equal fraction multiplies the top by what the bottom was multiplied by (the documented slips add, or
 *  change only the bottom). */
function equalFraction(prompt: string, answer: number): PrepAsk | null {
  const m = /^(\d+)\/(\d+) = □\/(\d+)$/.exec(prompt);
  if (!m) return null;
  const a = Number(m[1]), b = Number(m[2]), c = Number(m[3]), k = c / b;
  if (!Number.isInteger(k) || k < 2 || a * k !== answer) return null;
  return { kind: "prep", steps: [{ lead: `The bottom: ${b} ×`, after: `= ${c}`, value: String(k), why: `What was ${b} multiplied by to make ${c}?`, tell: `${b} × ${k} = ${c}.` }], then: `Do the same to the top. Now ${a} × ${k} =` };
}
const gcd = (x: number, y: number): number => (y ? gcd(y, x % y) : x);
/** Card 5: unlike fractions are first written in same-size pieces (the documented slip adds tops and bottoms). */
function unlikeAdd(prompt: string, answer: string): PrepAsk | null {
  const m = /^(\d+)\/(\d+) \+ (\d+)\/(\d+) = \?/.exec(prompt), ans = /^(\d+)\/(\d+)$/.exec(answer) ?? /^(\d+)$/.exec(answer);
  if (!m || !ans) return null;
  const [a, b, c, d] = m.slice(1).map(Number), L = (b * d) / gcd(b, d), p = (a * L) / b, q = (c * L) / d;
  if (b === d || L > 200 || (p + q) * Number(ans[2] ?? 1) !== Number(ans[1]) * L) return null;
  const piece = (n: number, den: number, v: number): PrepStep => ({ lead: `${n}/${den} =`, after: `/${L}`, value: String(v), why: `${den} × ${L / den} = ${L}. Do the same to the top: ${n} × ${L / den}.`, tell: `${n}/${den} = ${v}/${L}.` });
  return { kind: "prep", steps: [{ lead: `Same-size pieces. Both ${b} and ${d} go into`, value: String(L), why: `Count in ${b}s and in ${d}s. Where do they first meet?`, tell: `They first meet at ${L}.` }, piece(a, b, p), piece(c, d, q)], then: `Now ${p}/${L} + ${q}/${L} =` };
}

export function prepOf(prompt: string, type: string, answer: string): PrepAsk | null {
  if (type === "fraction" && /\//.test(answer)) return unlikeAdd(prompt, answer);
  if (type !== "integer" && type !== "fraction") return null;
  const v = Number(answer);
  if (!Number.isFinite(v) || !/^-?[\d.]+$/.test(answer)) return null;
  const p = estimate(prompt, v) ?? exchange(prompt, v) ?? splitMul(prompt, v) ?? timesFact(prompt, v) ?? remainder(prompt, v) ?? equalFraction(prompt, v) ?? unlikeAdd(prompt, answer);
  return p && p.steps.every((s) => Number(s.value) !== v) ? p : null;
}
/** Whether what was typed into a prep box is its value (commas and spaces forgiven). */
export const prepRight = (s: PrepStep, typed: string) => { const t = typed.replace(/[,\s]/g, ""); return t !== "" && Number(t) === Number(s.value); };
