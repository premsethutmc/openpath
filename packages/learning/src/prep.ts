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

export function prepOf(prompt: string, type: string, answer: string): PrepAsk | null {
  if (type !== "integer" && type !== "fraction") return null;
  const v = Number(answer);
  if (!Number.isFinite(v) || !/^-?[\d.]+$/.test(answer)) return null;
  const p = estimate(prompt, v) ?? exchange(prompt, v);
  return p && p.steps.every((s) => Number(s.value) !== v) ? p : null;
}
/** Whether what was typed into a prep box is its value (commas and spaces forgiven). */
export const prepRight = (s: PrepStep, typed: string) => { const t = typed.replace(/[,\s]/g, ""); return t !== "" && Number(t) === Number(s.value); };
