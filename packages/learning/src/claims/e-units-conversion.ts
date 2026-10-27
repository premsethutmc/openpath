import { Rational, parseRational, rat } from "../claim-kit";
import type { Claim, ClaimTable, Problem, Step } from "../claim-kit";

/** Phase 2 claims: e-units-conversion. Every expected value is recomputed from the problem prompt / figure (never from the
 *  family's helpers); where a step's inputs restate an operand they must agree with that reading, otherwise the claim is null. */

// ---- conversion constants, written once
const PAISE_PER_RUPEE = 100n;
const MIN_PER_HOUR = 60n;
const MIN_PER_DAY = 1440n;
const HOURS_PER_DAY = 24n;
const HALF_DAY = 12n;
/** small units in one big unit, by "big/small" */
const FACTOR: Record<string, bigint> = { "m/cm": 100n, "kg/g": 1000n, "L/mL": 1000n, "km/m": 1000n, "g/mg": 1000n };

const B = (s: string) => BigInt(s);
const asNum = (v: unknown): Rational | null => (typeof v === "number" || typeof v === "string" ? parseRational(v) : null);
/** the input at position i is the number n */
const inIs = (s: Step, i: number, n: bigint): boolean => { const r = asNum(s.inputs[i]); return !!r && r.eq(rat(n)); };
/** the input at position i is the text t */
const inText = (s: Step, i: number, t: string): boolean => s.inputs[i] === t;
/** exact decimal text ("12", "3.05") -> Rational, no float */
function dec(t: string): Rational | null {
  const m = /^(\d+)(?:\.(\d+))?$/.exec(t);
  if (!m) return null;
  const f = m[2] ?? "";
  return new Rational(B(m[1] + f), 10n ** BigInt(f.length));
}
/** "HH:MM" -> minutes */
function hhmm(t: unknown): bigint | null {
  if (typeof t !== "string") return null;
  const m = /^(\d\d):(\d\d)$/.exec(t);
  return m && Number(m[1]) <= 24 && Number(m[2]) <= 59 ? B(m[1]) * MIN_PER_HOUR + B(m[2]) : null;
}
/** stated "(a, b)" */
function tuple(v: unknown): [bigint, bigint] | null {
  if (typeof v !== "string") return null;
  const m = /^\(\s*(\d+)\s*,\s*(\d+)\s*\)$/.exec(v);
  return m ? [B(m[1]), B(m[2])] : null;
}

// ---- acmoneymul: price x n, or total / n; steps "paise" (rupees -> paise) and "rupees" (paise -> rupees)
/** Reading: "One X costs ₹p. What do n Xs cost?" (result p*n) or "n Xs cost ₹T altogether. What does one X cost?" (result T/n). */
function moneyMul(p: Problem): { price: Rational; result: Rational } | null {
  let m = /^One .+? costs ₹(\d+(?:\.\d+)?)\. What do (\d+) .+? cost\? Write the answer in rupees/.exec(p.prompt);
  if (m) { const a = dec(m[1]); return a ? { price: a, result: a.mul(rat(B(m[2]))) } : null; }
  m = /^(\d+) .+? cost ₹(\d+(?:\.\d+)?) altogether\. What does one .+? cost\? Write the answer in rupees/.exec(p.prompt);
  if (m) { const t = dec(m[2]); return t && B(m[1]) > 0n ? { price: t, result: t.div(rat(B(m[1]))) } : null; }
  return null;
}
const acmoneymulConvert: Claim = (s, p) => {
  const d = moneyMul(p);
  if (!d) return null;
  if (s.id === "paise") {
    // inputs: the rupee amount stated in the prompt (the price, or the total); value = that amount in paise
    const a = asNum(s.inputs[0]);
    if (s.inputs.length !== 1 || !a || !a.eq(d.price)) return null;
    return d.price.mul(rat(PAISE_PER_RUPEE));
  }
  if (s.id === "rupees") {
    // inputs: the answer in paise; value = that in rupees
    const a = asNum(s.inputs[0]);
    if (s.inputs.length !== 1 || !a || !a.eq(d.result.mul(rat(PAISE_PER_RUPEE)))) return null;
    return d.result;
  }
  return null;
};

// ---- acpaise: rupees to paise
/** Reading: "₹R and P paise" or "₹R.PP"; step "rupees" turns the whole rupees R into paise. */
const acpaiseConvert: Claim = (s, p) => {
  if (s.id !== "rupees" || s.inputs.length !== 1) return null;
  const m = /^How many paise (?:are there in ₹(\d+) and (\d+) paise|make ₹(\d+)\.(\d\d))\?$/.exec(p.prompt);
  if (!m) return null;
  const r = B(m[1] ?? m[3]);
  return inIs(s, 0, r) ? rat(r * PAISE_PER_RUPEE) : null;
};

// ---- acp2r: paise to rupees
/** Reading: "Change P paise into rupees" (P may have a thousands comma); step "rupees" is the whole rupees in P. */
const acp2rDivide: Claim = (s, p) => {
  if (s.id !== "rupees" || s.inputs.length !== 2) return null;
  const m = /^Change (\d{1,3}(?:,\d{3})*|\d+) paise into rupees\./.exec(p.prompt);
  if (!m) return null;
  const paise = B(m[1].replace(/,/g, ""));
  if (!inIs(s, 0, paise) || !inIs(s, 1, PAISE_PER_RUPEE)) return null;
  return rat(paise / PAISE_PER_RUPEE);
};

// ---- acmoneyadd: ₹a.pp ± ₹b.qq by columns
/** Reading: "₹a.pp + ₹b.qq" / "₹a.pp − ₹b.qq". inputs [x, y, sign, carry-or-borrow]. Paise column: (pa+pb) mod 100 or pa-pb (+100 when
 *  borrowing); rupee column: a+b+carry or a-b-borrow. */
function moneyCols(s: Step, p: Problem, sign: string) {
  const m = /^₹(\d+)\.(\d\d) ([+−]) ₹(\d+)\.(\d\d) = \?/.exec(p.prompt);
  if (!m || m[3] !== sign || s.inputs.length !== 4 || s.inputs[2] !== sign) return null;
  const a = B(m[1]), pa = B(m[2]), b = B(m[4]), pb = B(m[5]);
  const flag = sign === "+" ? (pa + pb) / PAISE_PER_RUPEE : pa < pb ? 1n : 0n;
  return { a, pa, b, pb, flag, ok: inIs(s, 3, flag) };
}
const acmoneyaddAdd: Claim = (s, p) => {
  const c = moneyCols(s, p, "+");
  if (!c || !c.ok) return null;
  if (s.id === "paise") return inIs(s, 0, c.pa) && inIs(s, 1, c.pb) ? rat((c.pa + c.pb) % PAISE_PER_RUPEE) : null;
  if (s.id === "rupees") return inIs(s, 0, c.a) && inIs(s, 1, c.b) ? rat(c.a + c.b + c.flag) : null;
  return null;
};
const acmoneyaddSubtract: Claim = (s, p) => {
  const c = moneyCols(s, p, "−");
  if (!c || !c.ok) return null;
  if (s.id === "paise") return inIs(s, 0, c.pa) && inIs(s, 1, c.pb) ? rat(c.pa + c.flag * PAISE_PER_RUPEE - c.pb) : null;
  if (s.id === "rupees") return inIs(s, 0, c.a) && inIs(s, 1, c.b) ? rat(c.a - c.b - c.flag) : null;
  return null;
};

// ---- agmeas: convert the small-unit amount to the big unit
/** Reading: the prompt has one whole-number amount in the small unit (e.g. "90 cm"); inputs [n, small, factor, big]; value n / factor. */
const agmeasConvert: Claim = (s, p) => {
  if (s.id !== "convert" || s.inputs.length !== 4) return null;
  const small = s.inputs[1], big = s.inputs[3];
  if (typeof small !== "string" || typeof big !== "string") return null;
  const f = FACTOR[`${big}/${small}`];
  if (!f || !inIs(s, 2, f)) return null;
  const hits = [...p.prompt.matchAll(new RegExp(`(?<![\\d.])(\\d+) ${small}(?![A-Za-z])`, "g"))];
  if (hits.length !== 1) return null;
  const bigHits = [...p.prompt.matchAll(new RegExp(`(\\d+(?:\\.\\d+)?) ${big}(?![A-Za-z])`, "g"))];
  if (bigHits.length < 1) return null;
  const n = B(hits[0][1]);
  return inIs(s, 0, n) ? new Rational(n, f) : null;
};

// ---- aewcmp: "A big B small" in small units
/** Reading: "A kg B g ☐ C g" (or g/mg); inputs [A, B]; value A*1000 + B. */
const aewcmpConvert: Claim = (s, p) => {
  if (s.id !== "convert" || s.inputs.length !== 2) return null;
  const m = /Which sign goes in the box: (\d+) (\w+) (\d+) (\w+) ☐ (\d+) (\w+)\?/.exec(p.prompt);
  if (!m || m[4] !== m[6]) return null;
  const f = FACTOR[`${m[2]}/${m[4]}`];
  if (!f || !inIs(s, 0, B(m[1])) || !inIs(s, 1, B(m[3]))) return null;
  return rat(B(m[1]) * f + B(m[3]));
};

// ---- aeparts: whole amount in small units
/** Reading: "How many packets of S g together make N kg?"; inputs [N, 1000]; value N*1000 (the whole in small units). */
const aepartsConvert: Claim = (s, p) => {
  if (s.id !== "small" || s.inputs.length !== 2) return null;
  const m = /^How many .+? of (\d+) (\w+) together make (\d+) (\w+)\?$/.exec(p.prompt);
  if (!m) return null;
  const f = FACTOR[`${m[4]}/${m[2]}`];
  if (!f || !inIs(s, 0, B(m[3])) || !inIs(s, 1, f)) return null;
  return rat(B(m[3]) * f);
};

// ---- aedrip: hours to minutes
/** Reading: "... drip out in H hour(s)?"; inputs [H, 60]; value H*60. */
const aedripConvert: Claim = (s, p) => {
  if (s.id !== "minutes" || s.inputs.length !== 2) return null;
  const m = /every minute\. How many millilitres of water drip out in (\d+) hours?\?$/.exec(p.prompt);
  if (!m || !inIs(s, 0, B(m[1])) || !inIs(s, 1, MIN_PER_HOUR)) return null;
  return rat(B(m[1]) * MIN_PER_HOUR);
};

// ---- adfmeas: how many small units in the whole
/** Reading: the prompt names the whole ("of an hour", "of a metre", "of a kilogram", "of a day", "of ₹N"); step "whole" is how many
 *  of the asked unit make that whole. inputs [label, count]. */
const adfmeasConvert: Claim = (s, p) => {
  if (s.id !== "whole" || s.inputs.length !== 2) return null;
  const q = p.prompt;
  let label: string, count: bigint;
  if (/^How many minutes are there in \d+\/\d+(?: \([\w-]+\))? of an hour\?$/.test(q)) { label = "an hour"; count = MIN_PER_HOUR; }
  else if (/^How many centimetres are there in \d+\/\d+(?: \([\w-]+\))? of a metre\?$/.test(q)) { label = "a metre"; count = 100n; }
  else if (/^How many grams are there in \d+\/\d+(?: \([\w-]+\))? of a kilogram\?$/.test(q)) { label = "a kilogram"; count = 1000n; }
  else if (/^How many hours are there in \d+\/\d+(?: \([\w-]+\))? of a day\?$/.test(q)) { label = "a day"; count = HOURS_PER_DAY; }
  else {
    const m = /^What is \d+\/\d+(?: \([\w-]+\))? of ₹(\d+)\? Give the answer in rupees\.$/.exec(q);
    if (!m) return null;
    label = `₹${m[1]}`; count = B(m[1]);
  }
  return inText(s, 0, label) && inIs(s, 1, count) ? rat(count) : null;
};

// ---- adwtcap: weights
/** Reading: "K kg of potatoes and G g of tomatoes"; inputs [K, G]; value K*1000 + G grams. */
const adwtcapAdd: Claim = (s, p) => {
  if (s.id !== "work" || s.inputs.length !== 2) return null;
  const m = /^A bag has (\d+) kg of potatoes and (\d+) g of tomatoes\..*what is the real total weight in grams\?$/.exec(p.prompt);
  if (!m || !inIs(s, 0, B(m[1])) || !inIs(s, 1, B(m[2]))) return null;
  return rat(B(m[1]) * FACTOR["kg/g"] + B(m[2]));
};
/** Reading: "estimated ... about E kg ... showed A kg"; inputs [E, A]; value = how far apart E and A are. */
const adwtcapDifference: Claim = (s, p) => {
  if (s.id !== "work" || s.inputs.length !== 2) return null;
  const m = /estimated that .+? weighs about (\d+) kg\. On the weighing scale it showed (\d+) kg\. By how many kilograms was the estimate wrong\?$/.exec(p.prompt);
  if (!m || !inIs(s, 0, B(m[1])) || !inIs(s, 1, B(m[2]))) return null;
  const e = B(m[1]), a = B(m[2]);
  return rat(e > a ? e - a : a - e);
};

// ---- 24-hour / 12-hour clock
/** 24-hour hour h -> 12-hour clock hour (0 and 12 show as 12) */
const hour12 = (h: bigint): bigint => (h % HALF_DAY === 0n ? HALF_DAY : h % HALF_DAY);
/** Reading: "A railway clock shows HH:MM (24-hour time)"; step "ampm" is the position, in the problem's options, of the correct
 *  12-hour time with a.m./p.m. (hour 0 and 12 shown as 12, minutes two digits, noon = p.m., midnight = a.m.). inputs [H]. */
const aeampmConvert = (s: Step, p: Problem): boolean | null => {
  if (s.id !== "ampm" || s.inputs.length !== 1 || !p.options) return null;
  const m = /^A railway clock shows (\d\d):(\d\d) \(24-hour time\)\. How is this time written on a 12-hour clock/.exec(p.prompt);
  if (!m) return null;
  const h = B(m[1]), mi = B(m[2]);
  if (h > 23n || mi > 59n || !inIs(s, 0, h)) return null;
  const want = `${hour12(h)}:${m[2]} ${h < HALF_DAY ? "a.m." : "p.m."}`;
  const idx = p.options.indexOf(want);
  if (idx < 0 || p.options.filter((o) => o === want).length !== 1) return null;
  const v = asNum(s.value);
  return !!v && v.eq(rat(BigInt(idx)));
};
/** Reading: "Write H:MM a.m./p.m. in 24-hour time"; step "hours" is the 24-hour hour; inputs [H, 0 for a.m. / 1 for p.m.]. */
const aet24Convert: Claim = (s, p) => {
  if (s.id !== "hours" || s.inputs.length !== 2) return null;
  const m = /^Write (\d{1,2}):(\d\d) ([ap])\.m\. in 24-hour time\./.exec(p.prompt);
  if (!m) return null;
  const h = B(m[1]), pm = m[3] === "p";
  if (h < 1n || h > 12n || !inIs(s, 0, h) || !inIs(s, 1, pm ? 1n : 0n)) return null;
  return rat((h % HALF_DAY) + (pm ? HALF_DAY : 0n));
};
/** Reading: "A railway timetable shows HH:MM. What time does an ordinary 12-hour clock show"; step "hours" is the 12-hour clock hour; inputs [H]. */
const aet12Convert: Claim = (s, p) => {
  if (s.id !== "hours" || s.inputs.length !== 1) return null;
  const m = /^A railway timetable shows (\d\d):(\d\d)\. What time does an ordinary 12-hour clock show then\?/.exec(p.prompt);
  if (!m) return null;
  const h = B(m[1]);
  if (h > 23n || !inIs(s, 0, h)) return null;
  return rat(hour12(h));
};

// ---- actrain: train journeys
/** Reading of the timetable figure: two rows, "HH:MM departs" on Day d1 and "HH:MM arrives" on Day d2. */
function timetable(p: Problem): { dep: bigint; arr: bigint; days: bigint } | null {
  const f = p.figure as { type?: string; rows?: unknown[][] } | undefined;
  if (!f || f.type !== "table" || !Array.isArray(f.rows) || f.rows.length !== 2) return null;
  const a = f.rows[0], b = f.rows[1];
  const ma = /^Day (\d+)$/.exec(String(a[1])), mb = /^Day (\d+)$/.exec(String(b[1]));
  const ta = /^(\d\d:\d\d) departs$/.exec(String(a[2])), tb = /^(\d\d:\d\d) arrives$/.exec(String(b[2]));
  if (!ma || !mb || !ta || !tb) return null;
  const dep = hhmm(ta[1]), arr = hhmm(tb[1]), days = B(mb[1]) - B(ma[1]);
  return dep === null || arr === null || dep >= MIN_PER_DAY || arr >= MIN_PER_DAY || days < 1n ? null : { dep, arr, days };
}
/** Reading: counting on from departure to midnight (to 24:00) and from midnight to arrival, for a trip arriving the next day. */
const actrainCountOn: Claim = (s, p) => {
  const t = timetable(p);
  if (!t) return null;
  if (s.id === "to-midnight") return inText(s, 1, "24:00") && hhmm(s.inputs[0]) === t.dep ? rat(MIN_PER_DAY - t.dep) : null;
  // third input = whole days between the first midnight and the arrival day
  if (s.id === "after") return inText(s, 0, "00:00") && hhmm(s.inputs[1]) === t.arr && inIs(s, 2, t.days - 1n) ? rat((t.days - 1n) * MIN_PER_DAY + t.arr) : null;
  return null;
};
/** Timetable: total = (departure to midnight) + (midnight to arrival), shown as (hours, minutes); inputs are those two minute counts.
 *  Journey: "leaves at HH:MM and the journey takes H hours M minutes"; the step adds them, giving "HH:MM" with hours possibly past 24. */
const actrainAdd = (s: Step, p: Problem): boolean | null => {
  if (s.id === "total") {
    const t = timetable(p);
    if (!t || s.inputs.length !== 2) return null;
    const total = MIN_PER_DAY - t.dep + (t.days - 1n) * MIN_PER_DAY + t.arr;
    const a = asNum(s.inputs[0]), b = asNum(s.inputs[1]);
    if (!a || !b || !a.add(b).eq(rat(total))) return null;
    const v = tuple(s.value);
    return !!v && v[0] === total / MIN_PER_HOUR && v[1] === total % MIN_PER_HOUR;
  }
  if (s.id === "add") {
    const m = /leaves .+? at (\d\d:\d\d) and the journey takes (\d+) hours? (\d+) minutes?\./.exec(p.prompt);
    if (!m || s.inputs.length !== 2) return null;
    const dep = hhmm(m[1]);
    if (dep === null || !inText(s, 0, m[1]) || !inText(s, 1, `${m[2]} h ${m[3]} min`)) return null;
    const total = dep + B(m[2]) * MIN_PER_HOUR + B(m[3]);
    const v = typeof s.value === "string" ? /^(\d\d+):(\d\d)$/.exec(s.value) : null;
    return !!v && B(v[1]) * MIN_PER_HOUR + B(v[2]) === total && B(v[2]) < MIN_PER_HOUR;
  }
  return null;
};

// ---- agdec: line up decimal places
/** Reading: "Work out x + y" / "x − y"; step "line-up" rewrites the first number with as many decimal places as the longer of the two. */
const agdecRewrite = (s: Step, p: Problem): boolean | null => {
  if (s.id !== "line-up" || s.inputs.length !== 2) return null;
  const m = /^Work out (\d+(?:\.\d+)?) [+−] (\d+(?:\.\d+)?)\.$/.exec(p.prompt);
  if (!m || s.inputs[0] !== m[1]) return null;
  const dp = (t: string) => (t.split(".")[1] ?? "").length;
  const places = Math.max(dp(m[1]), dp(m[2]));
  const x = dec(m[1]);
  if (!x || typeof s.value !== "string" || !/^\d+\.\d+$/.test(s.value)) return false;
  const stated = dec(s.value);
  return !!stated && stated.eq(x) && dp(s.value) === places;
};

// ---- aedfr: decimals and fractions (the step value is the position of the right option)
const gcd = (a: bigint, b: bigint): bigint => (b === 0n ? a : gcd(b, a % b));
/** option text "a/b" -> [a, b] */
const frac = (t: string): [bigint, bigint] | null => { const m = /^(\d+)\/(\d+)$/.exec(t); return m ? [B(m[1]), B(m[2])] : null; };
const aedfrConvert = (s: Step, p: Problem): boolean | null => {
  if (!p.options || s.inputs.length !== 1) return null;
  const position = (match: (o: string) => boolean): boolean | null => {
    const hits = p.options!.map((o, i) => (match(o) ? i : -1)).filter((i) => i >= 0);
    if (hits.length !== 1) return null;
    const v = asNum(s.value);
    return !!v && v.eq(rat(BigInt(hits[0])));
  };
  let m = /^Write (\d+)\.(\d+) as a fraction( in its simplest form)?\.$/.exec(p.prompt);
  if (m && (s.id === (m[3] ? "simplest" : "tenths")) && s.inputs[0] === `${m[1]}.${m[2]}`) {
    // all the digits over the place value of the last decimal place (1.25 -> 125/100)
    const den = 10n ** BigInt(m[2].length), num = B(m[1] + m[2]);
    const g = gcd(num, den);
    // unsimplified: numerator is the digits, denominator the place value; simplest: lowest terms
    const [wn, wd] = m[3] ?[num / g, den / g] : [num, den];
    return position((o) => { const f = frac(o); return !!f && f[0] === wn && f[1] === wd; });
  }
  m = /^Write (\d+)\/(\d+) as a decimal\.$/.exec(p.prompt);
  if (m && s.id === "divide") {
    const want = new Rational(B(m[1]), B(m[2]));
    const given = dec(String(s.inputs[0]));
    if (!given || !given.eq(want)) return null;
    return position((o) => { const r = dec(o); return !!r && r.eq(want); });
  }
  return null;
};

// ---- agnl: mixed number reached by equal jumps
/** Reading: "starts at S and makes N equal jumps of a/b"; position = S + N*a/b; inputs [n, d] are that position as a fraction;
 *  step "mixed" states it as a mixed number in simplest form ("w n/d", just "w", or just "n/d"). */
const agnlConvert = (s: Step, p: Problem): boolean | null => {
  if (s.id !== "mixed" || s.inputs.length !== 2) return null;
  const m = /starts at (\d+) and makes (\d+) equal jumps of (\d+)\/(\d+) along the number line/.exec(p.prompt);
  if (!m || B(m[4]) === 0n) return null;
  const pos = rat(B(m[1])).add(new Rational(B(m[2]) * B(m[3]), B(m[4])));
  const n = asNum(s.inputs[0]), d = asNum(s.inputs[1]);
  if (!n || !d || d.isZero() || !n.div(d).eq(pos)) return null;
  const whole = pos.numBig / pos.denBig, rem = pos.numBig % pos.denBig;
  const want = rem === 0n ? `${whole}` : whole === 0n ? `${rem}/${pos.denBig}` : `${whole} ${rem}/${pos.denBig}`;
  return s.value === want;
};

export const CLAIMS: ClaimTable = {
  "acmoneymul/convert": acmoneymulConvert,
  "acpaise/convert": acpaiseConvert,
  "acp2r/divide": acp2rDivide,
  "acmoneyadd/add": acmoneyaddAdd,
  "acmoneyadd/subtract": acmoneyaddSubtract,
  "agmeas/convert": agmeasConvert,
  "aewcmp/convert": aewcmpConvert,
  "aeparts/convert": aepartsConvert,
  "aedrip/convert": aedripConvert,
  "adfmeas/convert": adfmeasConvert,
  "adwtcap/add": adwtcapAdd,
  "adwtcap/difference": adwtcapDifference,
  "aeampm/convert": { check: aeampmConvert },
  "aet24/convert": aet24Convert,
  "aet12/convert": aet12Convert,
  "actrain/add": { check: actrainAdd },
  "actrain/count on": actrainCountOn,
  "agdec/rewrite": { check: agdecRewrite },
  "aedfr/convert": { check: aedfrConvert },
  "agnl/convert": { check: agnlConvert },
};
