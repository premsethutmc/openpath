import { rat } from "../claim-kit";
import type { ClaimTable, Problem, Step } from "../claim-kit";

/** Phase 2 claims: g-sequences-patterns. Every value is recomputed from the prompt / figure data and the step inputs
 *  (by simulation or plain arithmetic), never from the family's solver. */

const int = (x: unknown): bigint | null => (typeof x === "number" && Number.isInteger(x) ? BigInt(x) : typeof x === "string" && /^-?\d+$/.test(x.trim()) ? BigInt(x.trim()) : null);
const same = (xs: readonly unknown[], want: readonly (bigint | string)[]): boolean =>
  xs.length === want.length && xs.every((x, i) => (typeof want[i] === "string" ? String(x) === want[i] : int(x) === want[i]));
const nums = (t: string): bigint[] => (t.match(/\d+/g) ?? []).map((x) => BigInt(x));
const ordinal = (t: string, re: RegExp): bigint | null => { const m = t.match(re); return m ? BigInt(m[1]) : null; };
const fmt = (x: unknown) => String(x).replace(/\s+/g, " ").trim();
const tri = (k: bigint) => { let s = 0n; for (let i = 1n; i <= k; i++) s += i; return s; };
const figRow = (p: Problem): string[] | null => {
  const f = p.figure as { type?: string; rows?: unknown[][] } | undefined;
  return f && f.type === "table" && f.rows && f.rows.length === 1 ? f.rows[0].map(String) : null;
};

/* ------------------------------------------------------------------ aepat */
/** "starts at a ... add d each time ... begins a, a+d, ... What is the Nth number": the count step states N - 1 (jumps from the 1st to the Nth). */
const aepatCount = (s: Step, p: Problem) => {
  const m = p.prompt.match(/starts at (\d+)\. The rule is: add (\d+) each time\. The pattern begins ([\d, ]+), … What is the (\d+)(?:st|nd|rd|th) number/);
  if (!m) return null;
  const a = BigInt(m[1]), d = BigInt(m[2]), n = BigInt(m[4]);
  const shown = nums(m[3]);
  if (shown.length < 2 || shown.some((v, i) => v !== a + BigInt(i) * d) || n < 1n || !same(s.inputs, [n])) return null;
  return rat(n - 1n);
};

/* ------------------------------------------------------------------ affrule */
/** Is the rule text a true description of the sequence? null = text not understood. */
const ruleTrue = (text: string, q: bigint[]): boolean | null => {
  const diffs = q.slice(1).map((v, i) => v - q[i]);
  const ratio = (r: bigint) => q.slice(1).every((v, i) => v === q[i] * r);
  const consecutive = (f: (k: bigint) => bigint): boolean => {
    for (let k = 1n; k <= 400n; k++) if (f(k) === q[0]) return q.every((v, i) => v === f(k + BigInt(i)));
    return false;
  };
  let m: RegExpMatchArray | null;
  if (text.startsWith("They are consecutive square numbers")) return consecutive((k) => k * k);
  if (text.startsWith("They are consecutive triangular numbers")) return consecutive(tri);
  if (text.startsWith("They are consecutive cube numbers")) return consecutive((k) => k * k * k);
  if ((m = text.match(/^Add (\d+), then (\d+), then (\d+), and so on \(one more each time\)$/))) {
    const a = BigInt(m[1]);
    if (BigInt(m[2]) !== a + 1n || BigInt(m[3]) !== a + 2n) return null;
    return diffs.every((d, i) => d === a + BigInt(i));
  }
  if ((m = text.match(/^Add (\d+) each time$/))) return diffs.every((d) => d === BigInt(m![1]));
  if ((m = text.match(/^Each number is double the one before \(powers of (\d+)\)$/))) {
    if (m[1] !== "2") return null;
    const isPow2 = (v: bigint) => v > 0n && (v & (v - 1n)) === 0n;
    return ratio(2n) && isPow2(q[0]);
  }
  if (text === "Each number is three times the one before") return ratio(3n);
  if (text === "They are consecutive odd numbers") return q.every((v) => v % 2n === 1n) && diffs.every((d) => d === 2n);
  if (text === "They are consecutive even numbers") return q.every((v) => v % 2n === 0n) && diffs.every((d) => d === 2n);
  return null;
};
/** inputs [text]: the step states the text of the option that describes the sequence in the prompt. Right only if that
 *  option is a true description and no other option is. */
const affruleMatch = (s: Step, p: Problem): boolean | null => {
  const m = p.prompt.match(/^Look at the sequence ([\d, ]+), … Which rule makes it\?$/);
  const opts = p.options as string[] | undefined;
  if (!m || !opts) return null;
  const q = nums(m[1]);
  if (q.length < 3) return null;
  const truths = opts.map((o) => ruleTrue(o, q));
  if (truths.some((t) => t === null)) return null;
  if (s.inputs.length !== 1 || typeof s.inputs[0] !== "string") return null;
  if (typeof s.value !== "string" || String(s.inputs[0]) !== s.value) return false;
  const at = opts.indexOf(s.value);
  if (at < 0) return false;
  return truths[at] === true && truths.filter(Boolean).length === 1;
};

/* ------------------------------------------------------------------ affigrel */
/** Four prompt kinds; inputs [x] with x the last index used. */
const affigrelRelate = (s: Step, p: Problem) => {
  let m: RegExpMatchArray | null;
  // sum of the first N odd numbers, added one by one
  if ((m = p.prompt.match(/^Add the first (\d+) odd numbers: /))) {
    const n = BigInt(m[1]);
    let sum = 0n;
    for (let i = 0n; i < n; i++) sum += 2n * i + 1n;
    return same(s.inputs, [n]) ? rat(sum) : null;
  }
  // gap between consecutive squares, from the two products shown
  if ((m = p.prompt.match(/^How much bigger is the (\d+)(?:st|nd|rd|th) square number \((\d+) × (\d+)\) than the (\d+)(?:st|nd|rd|th) square number \((\d+) × (\d+)\)\?$/))) {
    const [a, a1, a2, b, b1, b2] = m.slice(1).map(BigInt);
    if (a !== a1 || a !== a2 || b !== b1 || b !== b2 || !same(s.inputs, [b])) return null;
    return rat(a * a - b * b);
  }
  // two consecutive triangular numbers added
  if ((m = p.prompt.match(/^Add the (\d+)(?:st|nd|rd|th) and the (\d+)(?:st|nd|rd|th) triangular numbers\./))) {
    const a = BigInt(m[1]), b = BigInt(m[2]);
    return same(s.inputs, [b]) ? rat(tri(a) + tri(b)) : null;
  }
  // whole numbers strictly between two squares
  if ((m = p.prompt.match(/^How many whole numbers lie between (\d+) \((\d+) × (\d+)\) and (\d+) \((\d+) × (\d+)\), not counting these two\?$/))) {
    const [a, a1, a2, b, b1, b2] = m.slice(1).map(BigInt);
    if (a1 * a2 !== a || b1 * b2 !== b || !same(s.inputs, [a1]) || b <= a) return null;
    return rat(b - a - 1n);
  }
  return null;
};

/* ------------------------------------------------------------------ affig */
const FORMULAS: Record<string, (n: bigint) => bigint> = {
  "n × n": (n) => n * n,
  "n × (n + 1) ÷ 2": (n) => (n * (n + 1n)) / 2n,
  "n × (n + 1)": (n) => n * (n + 1n),
  "n × n × n": (n) => n * n * n,
  "doubling n − 1 times": (n) => 2n ** (n - 1n),
  "2 × n − 1": (n) => 2n * n - 1n,
};
/** The four terms of the table (row "Number") */
const affigTerms = (p: Problem): bigint[] | null => {
  const r = figRow(p);
  if (!r || r.length !== 5 || r[0] !== "Number") return null;
  const t = r.slice(1).map(int);
  return t.every((x) => x !== null) ? (t as bigint[]) : null;
};
const fits = (f: (n: bigint) => bigint, t: bigint[]) => t.every((v, i) => f(BigInt(i + 1)) === v);
/** The stated rule must be one of the known formulas that reproduces the four terms shown. */
const affigFindPattern = (s: Step, p: Problem): boolean | null => {
  const t = affigTerms(p);
  if (!t || !/^The table shows the first four /.test(p.prompt) || s.inputs.length !== 1 || int(s.inputs[0]) === null) return null;
  const f = FORMULAS[fmt(s.value)];
  return !!f && typeof s.value === "string" && s.value === fmt(s.value) && fits(f, t);
};
/** inputs [n, rule]: the n-th term from the rule that fits the table. */
const affigEvaluate = (s: Step, p: Problem) => {
  const t = affigTerms(p);
  const n = ordinal(p.prompt, /What is the (\d+)(?:st|nd|rd|th) number in this pattern/);
  if (!t || n === null || s.inputs.length !== 2 || int(s.inputs[0]) !== n) return null;
  const f = FORMULAS[String(s.inputs[1])];
  if (!f || !fits(f, t)) return null;
  return rat(f(n));
};

/* ------------------------------------------------------------------ afmatch */
/** Table "Shape 1 2 3 4" with a row of 4 terms; the rule is an + b (a = the common difference, b = term 1 minus a). */
const afmatchWrite = (s: Step, p: Problem): boolean | null => {
  const r = figRow(p);
  if (!r || r.length !== 5 || !/^The table shows the number of .* Write a rule for the number of .* in shape n\.$/.test(p.prompt)) return null;
  const t = r.slice(1).map(int);
  if (t.some((x) => x === null)) return null;
  const [t1, t2] = t as bigint[];
  const a = t2 - t1, b = t1 - a;
  if ((t as bigint[]).some((v, i) => v !== a * BigInt(i + 1) + b) || a < 1n) return null;
  if (!same(s.inputs, [a, b])) return null;
  const want = (a === 1n ? "n" : `${a}n`) + (b > 0n ? ` + ${b}` : b < 0n ? ` − ${-b}` : "");
  return s.value === want;
};

/* ------------------------------------------------------------------ acsticks / acgrow */
const SIDES: Record<string, bigint> = { triangle: 3n, square: 4n, pentagon: 5n, hexagon: 6n };
/** One shape with s sticks; a row of N shapes where neighbours share one stick. */
const sticks = (p: Problem): { name: string; s: bigint; n: bigint } | null => {
  const m = p.prompt.match(/^One (\w+) is made with (\d+) matchsticks, as in the picture\..*\.\s*How many matchsticks are needed for a row of (\d+) \w+\?$/);
  if (!m || SIDES[m[1]] !== BigInt(m[2])) return null;
  return { name: m[1], s: BigInt(m[2]), n: BigInt(m[3]) };
};
const sticksCount = (s: Step, p: Problem) => { const k = sticks(p); return k && same(s.inputs, [k.name]) ? rat(k.s) : null; };
/** Each extra shape shares a stick, so it adds s - 1 sticks. */
const sticksRule = (s: Step, p: Problem) => { const k = sticks(p); return k && same(s.inputs, [k.s]) ? rat(k.s - 1n) : null; };
/** inputs [s, s - 1, N - 1]: first shape plus N - 1 more. */
const sticksExtend = (s: Step, p: Problem) => {
  const k = sticks(p);
  if (!k || k.n < 2n || !same(s.inputs, [k.s, k.s - 1n, k.n - 1n])) return null;
  return rat(k.s + (k.n - 1n) * (k.s - 1n));
};

/** Table Step 1 2 3 with three terms in arithmetic progression; the question asks for step k. */
const grow = (p: Problem): { t: bigint[]; d: bigint; k: bigint } | null => {
  const r = figRow(p);
  const m = p.prompt.match(/^The table shows a growing pattern of dots\. How many dots will there be in step (\d+)\?$/);
  if (!r || r.length !== 4 || !m) return null;
  const t = r.slice(1).map(int);
  if (t.some((x) => x === null)) return null;
  const v = t as bigint[];
  const d = v[1] - v[0];
  if (v[2] - v[1] !== d) return null;
  return { t: v, d, k: BigInt(m[1]) };
};
const growRule = (s: Step, p: Problem) => { const g = grow(p); return g && same(s.inputs, [g.t[0], g.t[1]]) ? rat(g.d) : null; };
/** inputs [term 3, d, k - 3]: keep adding d until step k. */
const growCountOn = (s: Step, p: Problem) => {
  const g = grow(p);
  if (!g || g.k < 4n || !same(s.inputs, [g.t[2], g.d, g.k - 3n])) return null;
  let v = g.t[2];
  for (let i = 3n; i < g.k; i++) v += g.d;
  return rat(v);
};

/* ------------------------------------------------------------------ aapatn / aapatu / aaweave */
/** Smallest p with s[i] = s[i + p] for every shown i; null unless the unit repeats at least once. */
const period = (q: string[]): number | null => {
  for (let p = 1; p < q.length; p++) if (q.every((v, i) => i + p >= q.length || q[i + p] === v)) return p;
  return null;
};
/** "repeats: a, b, a, b, ?." — the cards before the "?". */
const numberCards = (p: Problem): string[] | null => {
  const m = p.prompt.match(/^The number cards in the picture make a pattern that repeats: ([\d, ]+), \?\. Which number comes next\?$/);
  return m ? m[1].split(", ") : null;
};
const patnUnit = (s: Step, p: Problem) => {
  const q = numberCards(p);
  const per = q && period(q);
  return q && per ? { q, per, unit: q.slice(0, per) } : null;
};
const aapatnPart = (s: Step, p: Problem): boolean | null => {
  const u = patnUnit(s, p);
  return u ? same(s.inputs, u.unit) && s.value === u.unit.join(", ") : null;
};
/** inputs [cards shown, length of part]: the next card is place (shown mod length) + 1 of the part. */
const aapatnPlace = (s: Step, p: Problem) => {
  const u = patnUnit(s, p);
  return u && same(s.inputs, [BigInt(u.q.length), BigInt(u.per)]) ? rat(BigInt(u.q.length % u.per) + 1n) : null;
};
const aapatnContinue = (s: Step, p: Problem) => {
  const u = patnUnit(s, p);
  return u && s.inputs.length === 0 ? rat(BigInt(u.unit[u.q.length % u.per])) : null;
};

const shapeSeq = (p: Problem): string[] | null => {
  const m = p.prompt.match(/^This pattern of shapes repeats: (\S(?: \S)*)\. How many shapes are in the part that repeats\?$/);
  return m ? m[1].split(" ") : null;
};
const aapatuPart = (s: Step, p: Problem): boolean | null => {
  const q = shapeSeq(p), per = q && period(q);
  return q && per ? same(s.inputs, q.slice(0, per)) && s.value === q.slice(0, per).join(" ") : null;
};
const aapatuCount = (s: Step, p: Problem) => {
  const q = shapeSeq(p), per = q && period(q);
  return q && per && same(s.inputs, [BigInt(per)]) ? rat(BigInt(per)) : null;
};

/** Strip goes over a and under b again and again (the listing in the prompt is checked against that). */
const weave = (p: Problem): { a: bigint; b: bigint; seq: boolean[]; rest: string } | null => {
  const m = p.prompt.match(/^A mat is woven with a strip that goes over (\d+) and under (\d+), again and again: ((?:over|under)(?:, (?:over|under))*), … (.*)$/);
  if (!m) return null;
  const a = BigInt(m[1]), b = BigInt(m[2]);
  if (a < 1n || b < 1n) return null;
  const listed = m[3].split(", ");
  const per = Number(a + b);
  const seq = Array.from({ length: 200 }, (_, i) => i % per < Number(a)); // true = over
  if (listed.some((w, i) => (w === "over") !== seq[i])) return null;
  return { a, b, seq, rest: m[4] };
};
const aaweavePart = (s: Step, p: Problem) => { const w = weave(p); return w && same(s.inputs, [w.a, w.b]) ? rat(w.a + w.b) : null; };
/** "In the first N crossings, how many times over?" inputs [full repeats, crossings left over]. */
const aaweaveRepeats = (s: Step, p: Problem) => {
  const w = weave(p);
  const n = w && ordinal(w.rest, /^In the first (\d+) crossings, how many times does the strip go over\?$/);
  if (!w || !n || n > 200n) return null;
  const per = w.a + w.b;
  if (!same(s.inputs, [n / per, n % per])) return null;
  return rat(BigInt(w.seq.slice(0, Number(n)).filter(Boolean).length));
};
/** "At which crossing does the strip go under for the k-th time?" inputs [(k-1) div b, (k-1) mod b]. */
const aaweavePlace = (s: Step, p: Problem) => {
  const w = weave(p);
  const k = w && ordinal(w.rest, /^At which crossing \(counting from the first\) does the strip go under for the (\d+)(?:st|nd|rd|th) time\?$/);
  if (!w || !k) return null;
  if (!same(s.inputs, [(k - 1n) / w.b, (k - 1n) % w.b])) return null;
  let seen = 0n;
  for (let i = 0; i < 200; i++) if (!w.seq[i] && ++seen === k) return rat(BigInt(i + 1));
  return null;
};

/* ------------------------------------------------------------------ aerev */
const reverse = (n: bigint) => BigInt([...n.toString()].reverse().join(""));
const isPal = (n: bigint) => n === reverse(n);
/** Three kinds: reverse-and-add steps to a palindrome; evens in an addition-chart row; cells with a given sum. inputs [x]. */
const aerevCount = (s: Step, p: Problem) => {
  let m: RegExpMatchArray | null;
  if ((m = p.prompt.match(/^Start with (\d+)\. Reverse its digits and add\./))) {
    let n = BigInt(m[1]), steps = 0n;
    if (!same(s.inputs, [n])) return null;
    while (!isPal(n) && steps < 100n) { n += reverse(n); steps++; }
    return isPal(n) ? rat(steps) : null;
  }
  if ((m = p.prompt.match(/^In an addition chart, row (\d+) lists the sums .* up to \1 \+ (\d+)\. How many of these (\d+) sums are even\?$/))) {
    const r = BigInt(m[1]), top = BigInt(m[2]);
    if (BigInt(m[3]) !== top + 1n || !same(s.inputs, [r])) return null;
    let c = 0n;
    for (let k = 0n; k <= top; k++) if ((r + k) % 2n === 0n) c++;
    return rat(c);
  }
  if ((m = p.prompt.match(/^An addition chart has rows (\d+) to (\d+) and columns (\d+) to (\d+), and each cell shows row \+ column\. How many cells show the sum (\d+)\?$/))) {
    const [r0, r1, c0, c1, sum] = m.slice(1).map(BigInt);
    if (!same(s.inputs, [sum])) return null;
    let c = 0n;
    for (let r = r0; r <= r1; r++) for (let k = c0; k <= c1; k++) if (r + k === sum) c++;
    return rat(c);
  }
  return null;
};

/* ------------------------------------------------------------------ afdigits */
/** Choices for each place: (non-zero digits) then d-1, d-2, ... when digits may not repeat, then d, d, ... when they may; the step states the product as text. */
const afdigitsCount = (s: Step, p: Problem): boolean | null => {
  const m = p.prompt.match(/^How many different (\d+)-digit numbers can you make from the digits ([\d, ]+), (using each digit at most once|if a digit may be used more than once)\?$/);
  if (!m) return null;
  const k = Number(m[1]), digits = m[2].split(", ");
  if (new Set(digits).size !== digits.length || k < 1 || (m[3].startsWith("using") && k > digits.length)) return null;
  const d = digits.length, lead = digits.filter((x) => x !== "0").length; // no leading zero in a k-digit number
  const factors = Array.from({ length: k }, (_, i) => BigInt(i === 0 ? lead : m[3].startsWith("using") ? d - i : d));
  return same(s.inputs, factors) && s.value === factors.join(" × ");
};

/* ------------------------------------------------------------------ aadigmax */
const digitsTask = (p: Problem) => {
  const m = p.prompt.match(/^Use each of the digits ([\d, ]+) exactly once to make the (greatest|smallest) (\d+)-digit number\. Write it without commas\.$/);
  if (!m) return null;
  const ds = m[1].split(", ").map(Number);
  return ds.length === Number(m[3]) ? { ds, big: m[2] === "greatest" } : null;
};
const aadigmaxBiggest = (s: Step, p: Problem) => {
  const t = digitsTask(p);
  if (!t || !t.big || !same(s.inputs, t.ds.map(BigInt))) return null;
  return rat(BigInt([...t.ds].sort((x, y) => y - x).join("")));
};
/** Smallest number without a leading zero: the least non-zero digit first, then the rest in rising order. */
const aadigmaxSmallest = (s: Step, p: Problem) => {
  const t = digitsTask(p);
  if (!t || t.big || !same(s.inputs, t.ds.map(BigInt))) return null;
  const asc = [...t.ds].sort((x, y) => x - y);
  const lead = asc.findIndex((d) => d !== 0);
  if (lead < 0) return null;
  const [first] = asc.splice(lead, 1);
  return rat(BigInt([first, ...asc].join("")));
};

/* ------------------------------------------------------------------ aanext */
/** inputs [n, code]; code 1 = just after n, 0 = just before n, 2 = between (inputs [middle, 2]). */
const aanext = (want: "after" | "before") => (s: Step, p: Problem) => {
  let m: RegExpMatchArray | null;
  if (want === "after" && (m = p.prompt.match(/^Which number comes just after (\d+)\?$/))) {
    const n = BigInt(m[1]);
    return same(s.inputs, [n, 1n]) ? rat(n + 1n) : null;
  }
  if (want === "after" && (m = p.prompt.match(/^Which number comes between (\d+) and (\d+)\?$/))) {
    const a = BigInt(m[1]), b = BigInt(m[2]);
    if (b !== a + 2n || !same(s.inputs, [a + 1n, 2n])) return null;
    return rat(a + 1n);
  }
  if (want === "before" && (m = p.prompt.match(/^Which number comes just before (\d+)\?$/))) {
    const n = BigInt(m[1]);
    return n >= 1n && same(s.inputs, [n, 0n]) ? rat(n - 1n) : null;
  }
  return null;
};

export const CLAIMS: ClaimTable = {
  "aepat/count": aepatCount,
  "affrule/match": { check: affruleMatch },
  "affigrel/relate": affigrelRelate,
  "affig/evaluate": affigEvaluate,
  "affig/find-pattern": { check: affigFindPattern },
  "afmatch/write": { check: afmatchWrite },
  "acsticks/count": sticksCount,
  "acsticks/extend": sticksExtend,
  "acsticks/find rule": sticksRule,
  "acgrow/find rule": growRule,
  "acgrow/count on": growCountOn,
  "aapatn/continue": aapatnContinue,
  "aapatn/find the place in the part": aapatnPlace,
  "aapatn/find the repeating part": { check: aapatnPart },
  "aapatu/count": aapatuCount,
  "aapatu/find the repeating part": { check: aapatuPart },
  "aaweave/find the repeating part": aaweavePart,
  "aaweave/full repeats and the part left": aaweaveRepeats,
  "aaweave/find the place": aaweavePlace,
  "aerev/count": aerevCount,
  "afdigits/count": { check: afdigitsCount },
  "aadigmax/biggest digit first": aadigmaxBiggest,
  "aadigmax/smallest digit first (not 0)": aadigmaxSmallest,
  "aanext/count back": aanext("before"),
  "aanext/count on": aanext("after"),
};
