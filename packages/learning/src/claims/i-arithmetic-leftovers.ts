import { rat } from "../claim-kit";
import type { ClaimTable, Problem, Step } from "../claim-kit";

/** Phase 2 claims: i-arithmetic-leftovers. Every value is recomputed from the prompt (and figure/options data) and the
 *  step inputs, never from the family's solver. */

const big = (x: unknown): bigint | null => (typeof x === "number" && Number.isInteger(x) ? BigInt(x) : null);
const num = (t: string): bigint => BigInt(t.replace(/,/g, ""));
/** Decimal digits of n, ones first, padded with zeros to at least len. */
const digs = (n: bigint, len = 0): bigint[] => {
  const d = n.toString().split("").reverse().map((c) => BigInt(c));
  while (d.length < len) d.push(0n);
  return d;
};
const COLS = ["ones", "tens", "hundreds", "thousands", "ten thousands"];
const col = (s: Step): number => COLS.indexOf(String(s.id));
/** Round half up to a multiple of unit (unit even, n >= 0). */
const rnd = (n: bigint, unit: bigint): bigint => ((n + unit / 2n) / unit) * unit;
/** Parse "a, b, c" (plain integers) into numbers. */
const listOf = (t: string): bigint[] | null => (/^\d+(, \d+)*$/.test(t) ? t.split(", ").map((x) => BigInt(x)) : null);
const joinList = (xs: (bigint | number)[]) => xs.join(", ");

/** Column subtraction with the borrows worked out from the prompt's two numbers: returns, for column i, the top digit
 *  after earlier borrows, the bottom digit and whether this column borrows. */
const subCol = (a: bigint, b: bigint, i: number) => {
  const L = Math.max(a.toString().length, b.toString().length);
  const A = digs(a, L), B = digs(b, L);
  let borrow = 0n;
  for (let k = 0; k < i; k++) borrow = A[k] - borrow < B[k] ? 1n : 0n;
  const top = A[i] - borrow;
  return { top, bottom: B[i], borrows: top < B[i] };
};

/** acsub3 "A − B = ?": step id names the column; inputs [top digit after earlier borrows + 10, bottom digit, 1]; value = that difference. */
const acsub3Regroup = (s: Step, p: Problem) => {
  const m = p.prompt.match(/^(\d+) − (\d+) = \?$/);
  const i = col(s);
  if (!m || i < 0 || i > 2) return null;
  const c = subCol(BigInt(m[1]), BigInt(m[2]), i);
  if (!c.borrows) return null;
  if (big(s.inputs[0]) !== c.top + 10n || big(s.inputs[1]) !== c.bottom || big(s.inputs[2]) !== 1n) return null;
  return rat(c.top + 10n - c.bottom);
};

/** acsub2 "A − B = ?": inputs [tens digit of A, ones digit of A], the ones digit being too small; the ones become ones + 10. */
const acsub2Regroup = (s: Step, p: Problem) => {
  const m = p.prompt.match(/^(\d\d) − (\d\d) = \?$/);
  if (!m) return null;
  const a = BigInt(m[1]), b = BigInt(m[2]);
  if (a % 10n >= b % 10n) return null;
  if (big(s.inputs[0]) !== a / 10n || big(s.inputs[1]) !== a % 10n || s.inputs.length !== 2) return null;
  return rat(a % 10n + 10n);
};

/** adcolx "A ± B = ?" (commas allowed): step id names the column; inputs [top digit, bottom digit, carry/borrow in from the
 *  column to the right]; value is the digit written in this column. */
const colx = (s: Step, p: Problem, sub: boolean) => {
  const m = p.prompt.match(/^([\d,]+) ([+−]) ([\d,]+) = \?$/);
  const i = col(s);
  if (!m || i < 0 || (m[2] === "−") !== sub) return null;
  const a = num(m[1]), b = num(m[3]);
  if (sub && b >= a) return null;
  const L = Math.max(a.toString().length, b.toString().length);
  if (i >= L) return null;
  const A = digs(a, L), B = digs(b, L);
  let c = 0n;
  for (let k = 0; k < i; k++) c = sub ? (A[k] - B[k] - c < 0n ? 1n : 0n) : A[k] + B[k] + c >= 10n ? 1n : 0n;
  if (big(s.inputs[0]) !== A[i] || big(s.inputs[1]) !== B[i] || big(s.inputs[2]) !== c || s.inputs.length !== 3) return null;
  const v = sub ? A[i] - B[i] - c : A[i] + B[i] + c;
  return rat(sub ? (v < 0n ? v + 10n : v) : v % 10n);
};
const adcolxSubtract = (s: Step, p: Problem) => colx(s, p, true);
const adcolxAdd = (s: Step, p: Problem) => colx(s, p, false);

/** addr "A + B = ?": inputs [ones sum, which is 10 or more]; the ones digit left after carrying one ten is the sum minus 10. */
const addrRegroup = (s: Step, p: Problem) => {
  const m = p.prompt.match(/^(\d\d) \+ (\d\d) = \?$/);
  if (!m || s.inputs.length !== 1) return null;
  const ones = BigInt(m[1]) % 10n + BigInt(m[2]) % 10n;
  if (ones < 10n || big(s.inputs[0]) !== ones) return null;
  return rat(ones - 10n);
};

/** aechk: the step states the index (in problem.options) of the right choice; three kinds of question. */
const EXACT_NEEDED = new Set([
  "the change a shopkeeper gives back", "the amount written on a cheque", "the number of tablets a doctor tells you to take",
  "the marks written on a report card", "the price printed on a train ticket", "the weight of gold bought at a jewellery shop",
  "the time a train leaves the station", "the number of chairs to put out for 32 invited guests",
]);
const ESTIMATE_OK = new Set([
  "the number of people at a temple festival, for a news report", "how long it takes to walk to a friend's house",
  "the number of mangoes on a big tree", "the distance from Chennai to Madurai, when planning a trip",
  "the number of grains in a bag of rice", "the number of stars you can see on a clear night",
  "the number of ants in an anthill", "how many leaves are on a neem tree",
]);
const aechkEstimate = (s: Step, p: Problem): boolean | null => {
  const opts = (p as { options?: unknown }).options;
  if (!Array.isArray(opts) || !opts.every((o) => typeof o === "string") || s.inputs.length !== 1) return null;
  const options = opts as string[];
  const v = s.value;
  const idx = typeof v === "number" && Number.isInteger(v) ? v : -1;
  const k0 = p.prompt.match(/ worked out (\d+) ([+−×]) (\d+) and got (\d+)\. Without working it out exactly, round the numbers/);
  if (k0) {
    if (big(s.inputs[0]) !== 0n) return null;
    const a = BigInt(k0[1]), b = BigInt(k0[3]), claim = BigInt(k0[4]);
    const lead = (n: bigint) => rnd(n, n >= 100n ? 100n : 10n);
    const e = k0[2] === "+" ? lead(a) + lead(b) : k0[2] === "−" ? lead(a) - lead(b) : rnd(a, 10n) * rnd(b, 10n);
    if (e <= 0n) return null;
    const off = claim > e ? claim - e : e - claim;
    let text: string;
    if (off * 10n <= 3n * e) text = "Reasonable: it is close to the estimate";
    else if (off * 2n >= e) text = claim > e ? "Not reasonable: it is far too big" : "Not reasonable: it is far too small";
    else return null;
    if (options.filter((o) => o === text).length !== 1) return null;
    return options[idx] === text;
  }
  const wantExact = /^Which of these needs an EXACT answer/.test(p.prompt);
  const wantEst = /^For which of these is an ESTIMATE good enough/.test(p.prompt);
  if (wantExact || wantEst) {
    if (big(s.inputs[0]) !== 1n) return null;
    const hit = options.filter((o) => (wantExact ? EXACT_NEEDED : ESTIMATE_OK).has(o));
    const other = options.filter((o) => (wantExact ? ESTIMATE_OK : EXACT_NEEDED).has(o));
    if (hit.length !== 1 || other.length !== options.length - 1) return null;
    return options[idx] === hit[0];
  }
  const k2 = p.prompt.match(/^Without working it out exactly, about how big is (\d+) × (\d+)\?$/);
  if (k2) {
    if (big(s.inputs[0]) !== 2n) return null;
    const exact = BigInt(k2[1]) * BigInt(k2[2]);
    const vals = options.map((o) => (/^about [\d,]+$/.test(o) ? num(o.slice(6)) : 0n));
    if (vals.some((x) => x <= 0n)) return null;
    // closeness = the bigger over the smaller of (option, exact); smallest ratio wins, compared by cross-multiplication
    const hi = vals.map((x) => (x > exact ? x : exact)), lo = vals.map((x) => (x > exact ? exact : x));
    let best = 0, tie = false;
    for (let j = 1; j < vals.length; j++) {
      const l = hi[j] * lo[best], r = hi[best] * lo[j];
      if (l < r) { best = j; tie = false; } else if (l === r) tie = true;
    }
    if (tie) return null;
    return idx === best;
  }
  return null;
};

/** aehund "Start at S. Move R rows down [and then C squares to the right]" on a grid of 10 per row (either wording).
 *  Step "down": inputs [S, R], value S + 10R. Step "right": inputs [S + 10R, C], value S + 10R + C. */
const hundGrid = (p: Problem) => {
  const m = p.prompt.match(/^On a 1–100 number grid there are 10 numbers in each row[^.]*\. Start at (\d+)\. Move (\d+) rows? down(?: and then (\d+) squares? to the right)?\./);
  return m ? { s: BigInt(m[1]), r: BigInt(m[2]), c: BigInt(m[3] ?? "0") } : null;
};
const aehundAdd = (s: Step, p: Problem) => {
  const g = hundGrid(p);
  if (!g || s.inputs.length !== 2) return null;
  if (s.id === "down") return big(s.inputs[0]) === g.s && big(s.inputs[1]) === g.r ? rat(g.s + 10n * g.r) : null;
  if (s.id === "right") return big(s.inputs[0]) === g.s + 10n * g.r && big(s.inputs[1]) === g.c ? rat(g.s + 10n * g.r + g.c) : null;
  return null;
};

/** aaordx: the four numbers come from the prompt's list, or from the figure's card row when the prompt shows cards. */
const ordxItems = (p: Problem): { nums: bigint[]; cards: boolean; desc: boolean } | null => {
  const desc = /descending/.test(p.prompt), asc = /ascending/.test(p.prompt);
  if (desc === asc) return null;
  const cards = /card numbers/.test(p.prompt);
  let nums: bigint[];
  if (cards) {
    const fig = (p as { figure?: { type?: string; rows?: unknown[][] } }).figure;
    const row = fig && fig.type === "table" && fig.rows && fig.rows.length === 1 ? fig.rows[0] : null;
    if (!row || !row.every((x) => typeof x === "string" && /^[\d,]+$/.test(x))) return null;
    nums = row.map((x) => num(x as string));
  } else {
    const m = p.prompt.match(/: (\d+(?:, \d+)*)\. Write them in/);
    if (!m) return null;
    nums = m[1].split(", ").map((x) => BigInt(x));
  }
  if (nums.length !== 4 || new Set(nums.map(String)).size !== 4) return null;
  return { nums, cards, desc };
};
/** Expected answer text: the numbers (or card numbers 1..4) in the asked order. */
const ordxAnswerText = (o: { nums: bigint[]; cards: boolean; desc: boolean }): string => {
  const idx = [0, 1, 2, 3].sort((x, y) => { const d = o.nums[x] - o.nums[y]; return (o.desc ? -d : d) < 0n ? -1 : 1; });
  return joinList(o.cards ? idx.map((i) => i + 1) : idx.map((i) => o.nums[i]));
};
const sameBig = (xs: unknown[], ys: bigint[]) => xs.length === ys.length && xs.every((x, i) => big(x) === ys[i]);
const aaordxCompare = { check: (s: Step, p: Problem): boolean | null => {
  const o = ordxItems(p);
  if (!o || !sameBig(s.inputs, o.nums)) return null;
  return s.value === ordxAnswerText(o);
} };
const aaordxOrder = { check: (s: Step, p: Problem): boolean | null => {
  const o = ordxItems(p);
  if (!o || s.inputs.length !== 1 || big(s.inputs[0]) !== (o.desc ? 1n : 0n)) return null;
  return s.value === ordxAnswerText(o);
} };

/** aaordn "Put these numbers in order from the smallest to the biggest|biggest to the smallest: ..."; inputs are the numbers as listed. */
const aaordnOrder = { check: (s: Step, p: Problem): boolean | null => {
  const m = p.prompt.match(/^Put these numbers in order from the (smallest to the biggest|biggest to the smallest): (\d+(?:, \d+)*)\. Write them with commas\.$/);
  if (!m) return null;
  const nums = m[2].split(", ").map((x) => BigInt(x));
  if (new Set(nums.map(String)).size !== nums.length || !sameBig(s.inputs, nums)) return null;
  const sorted = [...nums].sort((x, y) => (x < y ? -1 : 1));
  if (m[1].startsWith("biggest")) sorted.reverse();
  return s.value === joinList(sorted);
} };

/** aacmp "Which number is more|less: A or B?" */
const pickOf = (p: Problem) => {
  const m = p.prompt.match(/^Which number is (more|less): (\d+) or (\d+)\?$/);
  return m ? { more: m[1] === "more", a: BigInt(m[2]), b: BigInt(m[3]) } : null;
};
/** compare tens: inputs [tens of A, tens of B]; the step states the number asked for. */
const aacmpTens = (s: Step, p: Problem) => {
  const q = pickOf(p);
  if (!q || q.a < 10n || q.b < 10n || big(s.inputs[0]) !== q.a / 10n || big(s.inputs[1]) !== q.b / 10n || s.inputs.length !== 2) return null;
  return rat(q.more ? (q.a > q.b ? q.a : q.b) : q.a < q.b ? q.a : q.b);
};
/** compare: inputs [A, B]; the step states the number asked for. */
const aacmpCompare = (s: Step, p: Problem) => {
  const q = pickOf(p);
  if (!q || big(s.inputs[0]) !== q.a || big(s.inputs[1]) !== q.b || s.inputs.length !== 2) return null;
  return rat(q.more ? (q.a > q.b ? q.a : q.b) : q.a < q.b ? q.a : q.b);
};

/** aasign "Which sign goes in the box: A ☐ B?": inputs [A, B]; the step states <, > or =. */
const aasignCompare = { check: (s: Step, p: Problem): boolean | null => {
  const m = p.prompt.match(/^Which sign goes in the box: ([\d,]+) ☐ ([\d,]+)\? Choose <, > or =\.$/);
  if (!m || s.inputs.length !== 2) return null;
  const a = num(m[1]), b = num(m[2]);
  if (big(s.inputs[0]) !== a || big(s.inputs[1]) !== b) return null;
  return s.value === (a < b ? "<" : a > b ? ">" : "=");
} };

/** aeround "Round N to the nearest ten|hundred|thousand.": inputs [N, unit]; the step "compare" states the digit just right of the rounding place. */
const aeroundCompare = (s: Step, p: Problem) => {
  const m = p.prompt.match(/^Round ([\d,]+) to the nearest (ten|hundred|thousand)\.$/);
  if (!m || s.inputs.length !== 2) return null;
  const n = num(m[1]), u = { ten: 10n, hundred: 100n, thousand: 1000n }[m[2] as "ten"];
  if (big(s.inputs[0]) !== n || big(s.inputs[1]) !== u) return null;
  return rat((n % u) / (u / 10n));
};

/** adestcost: step id round<i> rounds the i-th price listed in the prompt (₹ amounts) to the nearest ten, halves up. */
const adestcostRound = (s: Step, p: Problem) => {
  const m = String(s.id).match(/^round(\d)$/);
  if (!m || !/Round each price to the nearest ten rupees/.test(p.prompt) || s.inputs.length !== 1) return null;
  const prices = [...p.prompt.matchAll(/₹(\d+)/g)].map((x) => BigInt(x[1]));
  const price = prices[Number(m[1])];
  if (price === undefined || big(s.inputs[0]) !== price) return null;
  return rat(rnd(price, 10n));
};

/** abdisp (find the new reading): water at A ml, block of V cm³ (1 ml = 1 cm³); inputs [A + V, A]; the step states the rise = V. */
const abdispAdd = (s: Step, p: Problem) => {
  const m = p.prompt.match(/^A measuring jar has water up to the (\d+) ml mark\. A metal block of volume (\d+) cm³ is dropped in and sinks\. To which mark/);
  if (!m || s.inputs.length !== 2) return null;
  const a = BigInt(m[1]), v = BigInt(m[2]);
  if (big(s.inputs[0]) !== a + v || big(s.inputs[1]) !== a) return null;
  return rat(v);
};

export const CLAIMS: ClaimTable = {
  "acsub3/regroup and subtract": acsub3Regroup,
  "acsub2/regroup": acsub2Regroup,
  "adcolx/subtract": adcolxSubtract,
  "adcolx/add": adcolxAdd,
  "addr/regroup": addrRegroup,
  "aechk/estimate": { check: aechkEstimate },
  "aehund/add": aehundAdd,
  "aaordx/compare digits from the left": aaordxCompare,
  "aaordx/order": aaordxOrder,
  "aaordn/order": aaordnOrder,
  "aacmp/compare tens": aacmpTens,
  "aacmp/compare": aacmpCompare,
  "aasign/compare": aasignCompare,
  "aeround/compare": aeroundCompare,
  "adestcost/round": adestcostRound,
  "abdisp/add": abdispAdd,
};
