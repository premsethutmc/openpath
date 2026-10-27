import { Rational, parseRational, rat } from "../claim-kit";
import type { Claim, ClaimTable, Problem, Step } from "../claim-kit";

/** Phase 1 claims: a-units-time-money. Every expected value is recomputed from the problem prompt (never from the family's helpers). */

/** How many small units make one big unit, by "big/small" unit names. */
const FACTOR: Record<string, bigint> = { "m/cm": 100n, "kg/g": 1000n, "L/mL": 1000n, "km/m": 1000n, "cm/mm": 10n, "g/mg": 1000n };
const factorOf = (big: string, small: string): bigint | null => FACTOR[`${big}/${small}`] ?? null;
const B = (s: string | undefined) => BigInt(s ?? "0");
const floorDiv = (a: bigint, b: bigint) => a / b; // operands here are non-negative

/** "(a, b)" -> [a, b] */
function tuple(v: unknown): [bigint, bigint] | null {
  if (typeof v !== "string") return null;
  const m = /^\(\s*(\d+)\s*,\s*(\d+)\s*\)$/.exec(v);
  return m ? [B(m[1]), B(m[2])] : null;
}
/** "h:mm a.m." / "h:mm p.m." -> minutes since midnight */
function clock12(v: unknown): number | null {
  if (typeof v !== "string") return null;
  const m = /^(\d{1,2}):(\d\d) ([ap])\.m\.$/.exec(v.trim());
  if (!m) return null;
  const h = Number(m[1]), mi = Number(m[2]);
  if (h < 1 || h > 12 || mi > 59) return null;
  return ((h % 12) + (m[3] === "p" ? 12 : 0)) * 60 + mi;
}
/** "HH:MM" -> minutes since midnight */
function clock24(v: unknown): number | null {
  if (typeof v !== "string") return null;
  const m = /^(\d\d):(\d\d)$/.exec(v.trim());
  if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}
const TIME12 = String.raw`(\d{1,2}:\d\d [ap]\.m\.)`;
const asNumber = (v: unknown): Rational | null => (typeof v === "number" || typeof v === "string" ? parseRational(v) : null);

// ---- acelhm: clock times and minutes
/** Reading: "starts at T1 and ends at T2" (duration) in minutes, or null. */
function span(p: Problem): { s: number; e: number } | null {
  const m = new RegExp(`starts at ${TIME12} and ends at ${TIME12}`).exec(p.prompt);
  if (!m) return null;
  const s = clock12(m[1]), e = clock12(m[2]);
  return s === null || e === null || e < s ? null : { s, e };
}
/** Reading: "starts at T and lasts H hour(s) M minutes" -> start, hours, minutes. */
function lasts(p: Problem): { s: number; h: number; m: number } | null {
  const m = new RegExp(`starts at ${TIME12} and lasts (\\d+) hours? (\\d+) minutes?`).exec(p.prompt);
  if (!m) return null;
  const s = clock12(m[1]);
  return s === null ? null : { s, h: Number(m[2]), m: Number(m[3]) };
}
const acelhmAdd = (s: Step, p: Problem): boolean | null => {
  if (s.id === "total") {
    const sp = span(p), t = tuple(s.value);
    if (!sp) return null;
    if (!t) return false;
    const d = sp.e - sp.s;
    return t[0] === BigInt(Math.floor(d / 60)) && t[1] === BigInt(d % 60);
  }
  if (s.id === "hours" || s.id === "minutes") {
    const l = lasts(p);
    if (!l) return null;
    const got = clock12(s.value);
    if (got === null) return false;
    const want = (l.s + l.h * 60 + (s.id === "minutes" ? l.m : 0)) % 1440;
    return got === want;
  }
  return null;
};
/** Counting on from the start to the next whole hour, then whole hours, then the minutes after the last whole hour. */
const acelhmCountOn: Claim = (s, p) => {
  const sp = span(p);
  if (!sp) return null;
  const up = Math.ceil(sp.s / 60) * 60, down = Math.floor(sp.e / 60) * 60;
  if (up > down) return null;
  if (s.id === "to-hour") return rat(BigInt(up - sp.s));
  if (s.id === "hours") return rat(BigInt((down - up) / 60));
  if (s.id === "rest") return rat(BigInt(sp.e - down));
  return null;
};

// ---- agrupee: rupees and paise
/** Reading: "₹a.pp + ₹c.qq" or "₹a.pp − ₹c.qq" (paise are the two digits after the point); regroup is the paise left after
 *  carrying 100 paise (addition) or the first paise amount plus 100 borrowed (subtraction). */
const agrupeeRegroup: Claim = (_s, p) => {
  const m = /₹(\d+)\.(\d\d) ([+−]) ₹(\d+)\.(\d\d)/.exec(p.prompt);
  if (!m) return null;
  const pa = B(m[2]), pb = B(m[5]);
  if (m[3] === "+") return rat((pa + pb) % 100n);
  return pa < pb ? rat(pa + 100n) : null;
};

// ---- aeconvu: small unit to big and small
/** Reading: "N small = how many big and small?"; the step "big" is how many whole big units fit. */
const aeconvuDivide: Claim = (s, p) => {
  const m = /^(\d+) (\w+) = how many (\w+) and (\w+)\?/.exec(p.prompt);
  if (!m || m[2] !== m[4] || s.id !== "big") return null;
  const f = factorOf(m[3], m[4]);
  return f ? rat(floorDiv(B(m[1]), f)) : null;
};

// ---- aedivm: divide a measure by n
function divm(p: Problem): { a: bigint; b: bigint; n: bigint; f: bigint } | null {
  const m = /^Divide (\d+) (\w+)(?: (\d+) (\w+))? into (\d+) equal parts\..*Write the answer as \((\w+), (\w+)\)/.exec(p.prompt);
  if (!m || m[6] !== m[2] || m[4] !== undefined && m[4] !== m[7]) return null;
  const f = factorOf(m[2], m[7]);
  return f && B(m[5]) > 0n ? { a: B(m[1]), b: B(m[3]), n: B(m[5]), f } : null;
}
/** Reading: "big" = whole big units in each part; "small" = (leftover big units * f + small units) / n. */
const aedivmDivide: Claim = (s, p) => {
  const d = divm(p);
  if (!d) return null;
  if (s.id === "big") return rat(d.a / d.n);
  if (s.id === "small") return new Rational((d.a % d.n) * d.f + d.b, d.n);
  return null;
};
/** Reading: regroup = leftover big units changed to small units plus the small units. */
const aedivmRegroup: Claim = (s, p) => {
  const d = divm(p);
  return d && s.id === "regroup" ? rat((d.a % d.n) * d.f + d.b) : null;
};

// ---- aemulm: multiply a measure by n
function mulm(p: Problem): { n: bigint; a: bigint; b: bigint; f: bigint } | null {
  const m = /^Work out (\d+) × (\d+) (\w+)(?: (\d+) (\w+))?\..*Write the answer as \((\w+), (\w+)\)/.exec(p.prompt);
  if (!m || m[6] !== m[3] || m[5] !== undefined && m[5] !== m[7]) return null;
  const f = factorOf(m[3], m[7]);
  return f ? { n: B(m[1]), a: B(m[2]), b: B(m[4]), f } : null;
}
/** Reading: small = n * small units; regroup = whole big units carried out of that; big = n * big units + carry. */
const aemulmMultiply: Claim = (s, p) => {
  const d = mulm(p);
  if (!d) return null;
  if (s.id === "small") return rat(d.n * d.b);
  if (s.id === "big") return rat(d.n * d.a + (d.n * d.b) / d.f);
  return null;
};
const aemulmRegroup: Claim = (s, p) => { const d = mulm(p); return d && s.id === "regroup" ? rat((d.n * d.b) / d.f) : null; };

// ---- aemix: add two measures
/** Reading: "Add: A U b u + C U d u": regroup = small units left after carrying whole big units; "Subtract: A U b u - C U d u"
 *  (a missing small part is 0): borrow = the minuend's small units plus one big unit changed to small units. */
const aemixRegroup: Claim = (s, p) => {
  const m = /^(Add|Subtract): (\d+) (\w+)(?: (\d+) (\w+))? [+−] (\d+) (\w+)(?: (\d+) (\w+))?\. Write the answer as \((\w+), (\w+)\)/.exec(p.prompt);
  if (!m || m[3] !== m[7] || m[10] !== m[3] || m[5] !== undefined && m[5] !== m[11] || m[9] !== undefined && m[9] !== m[11]) return null;
  const f = factorOf(m[3], m[11]);
  if (!f) return null;
  const b = B(m[4]), d = B(m[8]);
  if (m[1] === "Add") return s.id === "regroup" ? rat((b + d) % f) : null;
  return s.id === "borrow" && b < d ? rat(b + f) : null;
};

// ---- actrain: arrival time after a journey
/** Reading: leaves at HH:MM, journey takes H hours M minutes; arrival is the departure plus the journey, modulo one day. */
const actrainSubtract = (s: Step, p: Problem): boolean | null => {
  const m = /leaves .+? at (\d\d:\d\d) and the journey takes (\d+) hours? (\d+) minutes?/.exec(p.prompt);
  if (!m || s.id !== "days") return null;
  const dep = clock24(m[1]);
  if (dep === null) return null;
  const got = clock24(s.value);
  return got !== null && got === (dep + Number(m[2]) * 60 + Number(m[3])) % 1440;
};

// ---- aewcmp: compare a weight in two units with one in the small unit
/** Reading: the stated value is the position of the correct sign in the problem's own option list. */
const aewcmpCompare = (s: Step, p: Problem): boolean | null => {
  const m = /Which sign goes in the box: (\d+) (\w+) (\d+) (\w+) ☐ (\d+) (\w+)\?/.exec(p.prompt);
  if (!m || m[4] !== m[6] || s.id !== "compare") return null;
  const f = factorOf(m[2], m[4]);
  if (!f || !p.options) return null;
  const left = B(m[1]) * f + B(m[3]), right = B(m[5]);
  const sign = left < right ? "<" : left === right ? "=" : ">";
  const idx = p.options.indexOf(sign);
  if (idx < 0 || p.options.filter((o) => o === sign).length !== 1) return null;
  const v = asNumber(s.value);
  return !!v && v.eq(rat(BigInt(idx)));
};

export const CLAIMS: ClaimTable = {
  "acelhm/add": { check: acelhmAdd },
  "acelhm/count on": acelhmCountOn,
  "agrupee/regroup": agrupeeRegroup,
  "aeconvu/divide": aeconvuDivide,
  "aedivm/divide": aedivmDivide,
  "aedivm/regroup": aedivmRegroup,
  "aemulm/multiply": aemulmMultiply,
  "aemulm/regroup": aemulmRegroup,
  "aemix/regroup": aemixRegroup,
  "actrain/subtract": { check: actrainSubtract },
  "aewcmp/compare": { check: aewcmpCompare },
};
