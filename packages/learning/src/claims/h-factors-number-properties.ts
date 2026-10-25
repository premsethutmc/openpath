import { Rational, parseRational, rat } from "../claim-kit";
import type { ClaimTable, Problem, Step } from "../claim-kit";

/** Phase 2 claims: h-factors-number-properties. Every value is recomputed from the problem text (prompt/options) and the
 *  step inputs by plain bigint loops, never from the family's solver. */

const nums = (t: string): bigint[] => (t.match(/\d+/g) ?? []).map((x) => BigInt(x));
const big = (x: unknown): bigint | null => (typeof x === "number" && Number.isInteger(x) ? BigInt(x) : null);
const norm = (x: unknown) => String(x).replace(/−/g, "-").replace(/\s+/g, "");
const num = (t: string) => BigInt(t.replace(/,/g, ""));

const isqrt = (n: bigint): bigint => { let r = 0n; while ((r + 1n) * (r + 1n) <= n) r++; return r; };
const isPrime = (n: bigint): boolean => { if (n < 2n) return false; for (let d = 2n; d < n; d++) if (n % d === 0n) return false; return true; };
const divisors = (n: bigint): bigint[] => { const out: bigint[] = []; for (let d = 1n; d <= n; d++) if (n % d === 0n) out.push(d); return out; };

/** The stated value as a list of integers: an array of numbers, or text like "[1, 2, 3]" / "2, −3". null if it is not a list of integers. */
const listOf = (v: unknown): bigint[] | null => {
  let parts: unknown[];
  if (Array.isArray(v)) parts = v;
  else if (typeof v === "string") {
    const t = v.replace(/−/g, "-").trim().replace(/^\[(.*)\]$/, "$1").trim();
    if (t === "") return [];
    parts = t.split(/\s*,\s*/);
  } else return null;
  const out: bigint[] = [];
  for (const x of parts) {
    if (typeof x === "number" && Number.isInteger(x)) out.push(BigInt(x));
    else if (typeof x === "string" && /^-?\d+$/.test(x.trim())) out.push(BigInt(x.trim()));
    else return null;
  }
  return out;
};
const sameList = (stated: unknown, want: bigint[]): boolean => {
  const l = listOf(stated);
  return !!l && l.length === want.length && l.every((x, i) => x === want[i]);
};

// ---------- agprime ----------
/** "List all the prime numbers from A to B." inputs [A, B]; the step lists every prime in A..B in increasing order. */
const agprimeClassify = (s: Step, p: Problem): boolean | null => {
  const m = p.prompt.match(/^List all the prime numbers from (\d+) to (\d+)\.$/);
  if (!m || s.inputs.length !== 2 || big(s.inputs[0]) !== BigInt(m[1]) || big(s.inputs[1]) !== BigInt(m[2])) return null;
  const out: bigint[] = [];
  for (let n = BigInt(m[1]); n <= BigInt(m[2]); n++) if (isPrime(n)) out.push(n);
  return sameList(s.value, out);
};

// ---------- agptest ----------
/** Two prompts: "To decide whether N is prime ... largest prime ... needs to have tried" or "smallest prime factor of N". Returns N. */
const ptestN = (p: Problem): { n: bigint; tried: boolean } | null => {
  let m = p.prompt.match(/^To decide whether (\d+) is prime, \S+ divides it by the primes 2, 3, 5, 7, … in order\. If none of them divides (\d+) exactly, what is the largest prime \S+ needs to have tried before saying (\d+) is prime\?$/);
  if (m && m[1] === m[2] && m[1] === m[3]) return { n: BigInt(m[1]), tried: true };
  m = p.prompt.match(/^What is the smallest prime factor of (\d+)\?/);
  return m ? { n: BigInt(m[1]), tried: false } : null;
};
/** inputs [N]: the step states the whole-number square root bound floor(sqrt N). */
const agptestSqrt: (s: Step, p: Problem) => Rational | null = (s, p) => {
  const q = ptestN(p);
  if (!q || s.inputs.length !== 1 || big(s.inputs[0]) !== q.n) return null;
  return rat(isqrt(q.n));
};
/** inputs [floor(sqrt N)] (largest-prime appears only in the "largest prime ... tried" prompt): the largest prime not above it. */
const agptestLargestPrime: (s: Step, p: Problem) => Rational | null = (s, p) => {
  const q = ptestN(p);
  if (!q || !q.tried || s.inputs.length !== 1 || big(s.inputs[0]) !== isqrt(q.n)) return null;
  for (let k = isqrt(q.n); k >= 2n; k--) if (isPrime(k)) return rat(k);
  return null;
};

// ---------- agfac ----------
/** "List all the factors of N." Each factorise step pairs a × b = N: inputs [a, b], the step states N. */
const agfacFactorise: (s: Step, p: Problem) => Rational | null = (s, p) => {
  const m = p.prompt.match(/^List all the factors of (\d+)\.$/);
  const a = big(s.inputs[0]), b = big(s.inputs[1]);
  if (!m || s.inputs.length !== 2 || a === null || b === null || a <= 0n || b <= 0n || a * b !== BigInt(m[1])) return null;
  return rat(BigInt(m[1]));
};

// ---------- agcomf ----------
const comfPrompt = (p: Problem): [bigint, bigint] | null => {
  const m = p.prompt.match(/^List all the common factors of (\d+) and (\d+)\.$/);
  return m ? [BigInt(m[1]), BigInt(m[2])] : null;
};
/** inputs [a]: one of the two numbers in the prompt; the step lists all its factors. */
const agcomfFactorise = (s: Step, p: Problem): boolean | null => {
  const q = comfPrompt(p), a = big(s.inputs[0]);
  if (!q || s.inputs.length !== 1 || a === null || (a !== q[0] && a !== q[1])) return null;
  return sameList(s.value, divisors(a));
};
/** inputs [b]: one of the two numbers; the step lists the factors the two numbers of the prompt share. */
const agcomfIntersect = (s: Step, p: Problem): boolean | null => {
  const q = comfPrompt(p), b = big(s.inputs[0]);
  if (!q || s.inputs.length !== 1 || b === null || (b !== q[0] && b !== q[1])) return null;
  const out = divisors(q[0]).filter((d) => q[1] % d === 0n);
  return sameList(s.value, out);
};

// ---------- agjump ----------
/** Frog jumps x, rabbit jumps y, up to N. Common landing spots are the numbers 1..N divisible by both (found by scanning). */
const jumpPrompt = (p: Problem): [bigint, bigint, bigint] | null => {
  const m = p.prompt.match(/jumps (\d+) at a time\. A \w+ starts at 0 and jumps (\d+) at a time\. The picture shows their jumps up to (\d+)\. List every number more than 0 and up to (\d+) where both of them land\.$/);
  return m && m[3] === m[4] ? [BigInt(m[1]), BigInt(m[2]), BigInt(m[3])] : null;
};
/** inputs [L, N]: L is the first common landing spot (smallest number divisible by both jumps), N the limit; the step lists the common spots. */
const agjumpMultiples = (s: Step, p: Problem): boolean | null => {
  const q = jumpPrompt(p);
  if (!q || s.inputs.length !== 2 || big(s.inputs[1]) !== q[2]) return null;
  let first = 0n;
  for (let k = 1n; k <= q[0] * q[1]; k++) if (k % q[0] === 0n && k % q[1] === 0n) { first = k; break; }
  if (first === 0n || big(s.inputs[0]) !== first) return null;
  const out: bigint[] = [];
  for (let k = 1n; k <= q[2]; k++) if (k % q[0] === 0n && k % q[1] === 0n) out.push(k);
  return sameList(s.value, out);
};

// ---------- aghlw ----------
/** The prompt template decides HCF (greatest plates / longest equal pieces / largest group) or LCM (next together / smallest equal number of packets). */
const HCF_TEMPLATES = [
  /^\w+ has \d+ laddoos and \d+ jalebis for a party\. All the plates must be the same: each plate gets the same number of laddoos and the same number of jalebis, with nothing left over\. What is the greatest number of plates \w+ can fill\?$/,
  /^Two pieces of cloth are \d+ cm and \d+ cm long\. A tailor cuts both into pieces that are all the same length, as long as possible, with nothing left over\. How long is each piece, in cm\?$/,
  /^A school has \d+ girls and \d+ boys going on a trip\. They must be put into groups of the same size, each group all girls or all boys\. What is the largest possible group size\?$/,
];
const LCM_TEMPLATES = [
  /^At a railway junction, one train arrives every \d+ minutes and another every \d+ minutes\. Both arrive together at 6 a\.m\. After how many minutes will they next arrive together\?$/,
  /^\w+ wants to buy the same number of pencils and erasers\. Pencils come in packets of \d+ and erasers in packets of \d+\. What is the smallest number of each \w+ can buy, using full packets\?$/,
  /^Two runners go round a track\. One takes \d+ minutes for a round and the other \d+ minutes\. They start together\. After how many minutes are they next at the starting point together\?$/,
];
const aghlwChoose = (s: Step, p: Problem): boolean | null => {
  const h = HCF_TEMPLATES.some((r) => r.test(p.prompt)), l = LCM_TEMPLATES.some((r) => r.test(p.prompt));
  if (h === l || s.inputs.length !== 1) return null;
  const want = h ? "HCF" : "LCM";
  if (s.inputs[0] !== want) return null;
  return s.value === want;
};

// ---------- anquad ----------
/** Rectangular plot: length k m more than the width, area A m^2: x(x + k) = A. */
const quadPrompt = (p: Problem): { k: bigint; a: bigint } | null => {
  const m = p.prompt.match(/^The length of a rectangular plot is (\d+) m more than its width, and its area is (\d+) m²\./);
  return m ? { k: BigInt(m[1]), a: BigInt(m[2]) } : null;
};
/** inputs ["x(x + k) = A"]: expanding gives x² + kx − A = 0. */
const anquadWrite = (s: Step, p: Problem): boolean | null => {
  const q = quadPrompt(p);
  if (!q || s.inputs.length !== 1 || norm(s.inputs[0]) !== `x(x+${q.k})=${q.a}`) return null;
  return norm(s.value) === `x²+${q.k}x-${q.a}=0`;
};
/** inputs [k, −A] (the equation x² + kx − A = 0): the step lists its integer roots, found by scanning every integer from −(A+k) to A+k. */
const anquadFactorise = (s: Step, p: Problem): boolean | null => {
  const q = quadPrompt(p);
  if (!q || s.inputs.length !== 2 || big(s.inputs[0]) !== q.k || big(s.inputs[1]) !== -q.a) return null;
  const roots: bigint[] = [];
  for (let r = -(q.a + q.k); r <= q.a + q.k; r++) if (r * r + q.k * r - q.a === 0n) roots.push(r);
  const st = listOf(s.value);
  if (!st || roots.length === 0) return st ? false : false;
  const sort = (xs: bigint[]) => [...xs].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  const a = sort(st), b = sort(roots);
  return a.length === b.length && a.every((x, i) => x === b[i]);
};

// ---------- anpair ----------
/** A1 child + B1 adult tickets cost C1, A2 child + B2 adult cost C2 (quantities may read "ticket" or "tickets"). */
const pairPrompt = (p: Problem): bigint[] | null => {
  const m = p.prompt.match(/^For a school play, (\d+) [^,]*? and (\d+) adult tickets? cost ₹(\d+), and (\d+) [^,]*? and (\d+) adult tickets? cost ₹(\d+)\./);
  return m ? m.slice(1).map((x) => BigInt(x)) : null;
};
/** inputs: the two equations "A1x + B1y = C1" and "A2x + B2y = C2" read off the prompt; the step states how many equations: 2. */
const anpairWrite: (s: Step, p: Problem) => Rational | null = (s, p) => {
  const q = pairPrompt(p);
  if (!q || s.inputs.length !== 2) return null;
  const [a1, b1, c1, a2, b2, c2] = q;
  if (norm(s.inputs[0]) !== `${a1}x+${b1}y=${c1}` || norm(s.inputs[1]) !== `${a2}x+${b2}y=${c2}`) return null;
  return rat(2n);
};
/** inputs [C1, B1, y, A1]: A1·x + B1·y = C1 with y solved here by Cramer's rule from both prompt equations; the step states x. */
const anpairSubstitute: (s: Step, p: Problem) => Rational | null = (s, p) => {
  const q = pairPrompt(p);
  if (!q || s.inputs.length !== 4) return null;
  const [a1, b1, c1, a2, b2, c2] = q;
  const d = a2 * b1 - a1 * b2;
  if (d === 0n || a1 === 0n) return null;
  const y = new Rational(a2 * c1 - a1 * c2, d);
  const yin = big(s.inputs[2]);
  if (big(s.inputs[0]) !== c1 || big(s.inputs[1]) !== b1 || big(s.inputs[3]) !== a1 || yin === null || !y.eq(rat(yin))) return null;
  return new Rational(c1, a1).sub(new Rational(b1).mul(y).div(new Rational(a1)));
};

// ---------- acfacts ----------
/** A true equation "X op Y = Z" (or "Z = X × Y") built from exactly the three numbers of the prompt, in the right fact family. */
const factNums = (t: string) => (t.match(/\d[\d,]*/g) ?? []).map(num);
const acfactsInverse = (s: Step, p: Problem): boolean | null => {
  const v = typeof s.value === "string" ? s.value.replace(/−/g, "-").replace(/÷/g, "/").replace(/×/g, "*") : null;
  const sorted = (xs: bigint[]) => [...xs].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)).join(",");
  const inputs = s.inputs.map(big);
  if (inputs.length !== 3 || inputs.some((x) => x === null)) return null;
  const want = sorted(inputs as bigint[]);
  let kind: "sub" | "add" | "div" | "mul";
  let a: bigint, b: bigint, c: bigint; // a, b the two parts, c the whole (sum / product / dividend)
  let m: RegExpMatchArray | null;
  if ((m = p.prompt.match(/^([\d,]+) \+ ([\d,]+) = ([\d,]+)\. Which subtraction fact belongs to the same fact family\?$/))) {
    kind = "sub"; [a, b, c] = [num(m[1]), num(m[2]), num(m[3])];
    if (a + b !== c) return null;
  } else if ((m = p.prompt.match(/^\w+ worked out ([\d,]+) − ([\d,]+) = ([\d,]+)\. Which addition can \w+ use to check this answer\?$/))) {
    kind = "add"; [c, a, b] = [num(m[1]), num(m[2]), num(m[3])];
    if (a + b !== c) return null;
  } else if ((m = p.prompt.match(/^([\d,]+) × ([\d,]+) = ([\d,]+)\. Which division fact comes from this multiplication fact\?$/))) {
    kind = "div"; [a, b, c] = [num(m[1]), num(m[2]), num(m[3])];
    if (a * b !== c) return null;
  } else if ((m = p.prompt.match(/^In ([\d,]+) ÷ ([\d,]+) = ([\d,]+), [\d,]+ is the dividend, [\d,]+ the divisor and [\d,]+ the quotient\. Which sentence shows dividend = divisor × quotient for it\?$/))) {
    kind = "mul"; [c, a, b] = [num(m[1]), num(m[2]), num(m[3])];
    if (a * b !== c) return null;
  } else return null;
  if (sorted([a, b, c]) !== want) return null;
  if (v === null) return false;
  const e = v.match(/^([\d,]+) ?(\+|-|\/|\*|=) ?([\d,]+) ?(=|\*) ?([\d,]+)$/);
  if (!e) return false;
  const [x, y, z] = [num(e[1]), num(e[3]), num(e[5])];
  const sameParts = (u: bigint, w: bigint) => (u === a && w === b) || (u === b && w === a);
  if (kind === "sub") return e[2] === "-" && e[4] === "=" && x === c && x - y === z && sameParts(y, z);
  if (kind === "add") return e[2] === "+" && e[4] === "=" && z === c && x + y === z && sameParts(x, y);
  if (kind === "div") return e[2] === "/" && e[4] === "=" && x === c && y !== 0n && x / y === z && x % y === 0n && sameParts(y, z);
  return e[2] === "=" && e[4] === "*" && x === c && y * z === x && sameParts(y, z);
};

// ---------- aematch ----------
/** Logic puzzle: names and items from the header, clues "N [does not] <verb> <item>"; try every assignment, the asked item's owner must be forced. */
const permutations = <T,>(xs: T[]): T[][] => (xs.length <= 1 ? [xs] : xs.flatMap((x, i) => permutations([...xs.slice(0, i), ...xs.slice(i + 1)]).map((r) => [x, ...r])));
const aematchDeduce: (s: Step, p: Problem) => Rational | null = (s, p) => {
  const m = p.prompt.match(/^(.+?) each [^:]*: (.+?)\. Clues: (.*?)\.? (Who [^?]*)\?$/);
  if (!m || !p.options) return null;
  const names = m[1].split(/, | and /);
  const items = m[2].split(", ");
  if (names.length !== items.length || new Set(names).size !== names.length || new Set(items).size !== items.length) return null;
  const clues = m[3].split(". ");
  if (big(s.inputs[0]) !== BigInt(clues.length) || s.inputs.length !== 1) return null;
  const itemOf = (t: string): number => {
    const hit = items.map((it, i) => (t.endsWith(" " + it) ? i : -1)).filter((i) => i >= 0);
    return hit.length === 1 ? hit[0] : -1;
  };
  const cons: { who: number; item: number; yes: boolean }[] = [];
  for (const c of clues) {
    const who = names.findIndex((n) => c.startsWith(n + " "));
    const item = itemOf(c);
    if (who < 0 || item < 0) return null;
    cons.push({ who, item, yes: !c.includes(" does not ") });
  }
  const qi = itemOf(m[4]);
  if (qi < 0) return null;
  const owners = new Set<number>();
  for (const perm of permutations(items.map((_, i) => i))) { // perm[person] = item index
    if (cons.every((c) => (perm[c.who] === c.item) === c.yes)) owners.add(perm.indexOf(qi));
  }
  if (owners.size !== 1) return null;
  const idx = (p.options as unknown[]).map((o, i) => (o === names[[...owners][0]] ? i : -1)).filter((i) => i >= 0);
  return idx.length === 1 ? rat(BigInt(idx[0])) : null;
};

// ---------- acmissing ----------
/** "What number goes in the box? <equation>": the second step states the missing number from the two numbers in the equation. */
const missingParts = (p: Problem): { form: "plus" | "from" | "minus" | "times"; a: bigint; b: bigint } | null => {
  const m = p.prompt.match(/^What number goes in the box\? (.*)$/);
  if (!m) return null;
  let r: RegExpMatchArray | null;
  if ((r = m[1].match(/^□ \+ (\d+) = (\d+)$/))) return { form: "plus", a: BigInt(r[1]), b: BigInt(r[2]) };
  if ((r = m[1].match(/^(\d+) − □ = (\d+)$/))) return { form: "from", a: BigInt(r[1]), b: BigInt(r[2]) };
  if ((r = m[1].match(/^□ − (\d+) = (\d+)$/))) return { form: "minus", a: BigInt(r[1]), b: BigInt(r[2]) };
  if ((r = m[1].match(/^(\d+) × □ = (\d+)$/))) return { form: "times", a: BigInt(r[1]), b: BigInt(r[2]) };
  return null;
};
const missing = (forms: string[], f: (a: bigint, b: bigint) => Rational | null) => (s: Step, p: Problem): Rational | null => {
  const q = missingParts(p);
  if (!q || !forms.includes(q.form) || s.inputs.length !== 2) return null;
  const x = big(s.inputs[0]), y = big(s.inputs[1]);
  if (x === null || y === null) return null;
  const same = (u: bigint, w: bigint) => (x === u && y === w) || (x === w && y === u);
  return same(q.a, q.b) ? f(q.a, q.b) : null;
};
/** □ + a = b gives b − a;  a − □ = b gives a − b. */
const acmissingSubtract = (s: Step, p: Problem) => {
  const q = missingParts(p);
  return q ? missing(["plus", "from"], (a, b) => (q.form === "plus" ? rat(b - a) : rat(a - b)))(s, p) : null;
};
/** □ − a = b gives a + b. */
const acmissingAdd = missing(["minus"], (a, b) => rat(a + b));
/** a × □ = b gives b ÷ a. */
const acmissingDivide = missing(["times"], (a, b) => (a === 0n ? null : new Rational(b, a)));

/** The first ("undo") step of acmissing has one input, the operation that undoes the equation, and states the family's own
 *  code (0..3) for the equation form. The operation is mathematics (inverse operation); the numbering is the family's convention. */
const UNDO: Record<string, [number, string]> = { plus: [0, "subtract"], from: [1, "subtract"], minus: [2, "add"], times: [3, "divide"] };
const undoStep = (s: Step, p: Problem): boolean | null => {
  const q = missingParts(p);
  if (!q) return null;
  const [code, op] = UNDO[q.form];
  return s.op === op && s.inputs[0] === op && s.value === code;
};
/** One entry per step op: the undo step (one input) by the rule above, the working step (two inputs) by its numeric claim. */
const acmissingBoth = (numeric: (s: Step, p: Problem) => Rational | null): { check: (s: Step, p: Problem) => boolean | null } => ({
  check: (s, p) => {
    if (s.inputs.length === 1) return undoStep(s, p);
    const expected = numeric(s, p);
    if (!expected) return null;
    if (typeof s.value !== "number" && typeof s.value !== "string") return false;
    const stated = parseRational(s.value);
    return !!stated && stated.eq(expected);
  },
});

// ---------- acstory, acstory4, acstory9 ----------
/** The operation a one-step story needs, from fixed template wording; null unless exactly one operation's wording is present. */
const WORDS: Record<string, RegExp[]> = {
  add: [/\d[\d,]*(?: (?:m|cm))? more\b/, /in the morning and \d+ in the evening/, /\d+ red \w+ and \d+ (?:green|blue) \w+\./, /\d[\d,]* men and \d[\d,]* women/, /two rolls of cloth, /],
  "take away": [/\d+ of them (?:are eaten|bursts?)\b/, /\b(?:eat|eats) \d+ of them/, /fly away\./, /gives \d+(?: \w+)? to (?:his|her)\b/, /swims? away\./, /goes home\./, /go home\./, /moved away\b/, /and the rest are\b/, /still to be tarred/, /is cut off\./, /\d+ of them bursts?\./],
  multiply: [/with \d+ \w+ (?:on|in) each \w+/],
  share: [/\bequally\b/],
};
const CODE: Record<string, number> = { add: 0, "take away": 1, multiply: 2, share: 3 };
const storyOp = (prompt: string): string | null => {
  const hit = Object.keys(WORDS).filter((k) => WORDS[k].some((r) => r.test(prompt)));
  return hit.length === 1 ? hit[0] : null;
};
/** inputs [word]: the step names the operation the story needs (add, take away, multiply or share) and states its code 0-3 in that order. */
const chooseOperation = (s: Step, p: Problem): boolean | null => {
  const op = storyOp(p.prompt);
  if (!op || s.inputs.length !== 1 || s.inputs[0] !== op) return null;
  return s.value === CODE[op];
};

// ---------- afcross / afpair ----------
/** Vertically opposite angles are equal: inputs [θ] from "One of the angles is θ°"; the step states θ. */
const afcrossEqual: (s: Step, p: Problem) => Rational | null = (s, p) => {
  const m = p.prompt.match(/^Two straight lines cross each other, making four angles\. One of the angles is (\d+)°\. What is the angle opposite it \(vertically opposite\), in degrees\?$/);
  if (!m || s.inputs.length !== 1 || big(s.inputs[0]) !== BigInt(m[1])) return null;
  return rat(BigInt(m[1]));
};
/** Complementary angles total 90°, supplementary 180°; inputs [0] for complementary, [1] for supplementary. */
const afpairRecall: (s: Step, p: Problem) => Rational | null = (s, p) => {
  const m = p.prompt.match(/^Two angles are (complementary|supplementary)\. One of them is \d+°\. What is the other angle, in degrees\?$/);
  if (!m || s.inputs.length !== 1 || big(s.inputs[0]) !== (m[1] === "complementary" ? 0n : 1n)) return null;
  return rat(m[1] === "complementary" ? 90n : 180n);
};

// ---------- aabig ----------
/** Everyday things from smallest to biggest (common-sense ordering). */
const SIZE_ORDER = ["an ant", "a button", "a lemon", "a mango", "a football", "a cat", "a chair", "a bicycle", "an autorickshaw", "a bus", "a train"];
const aabigCompare = (s: Step, p: Problem): boolean | null => {
  const m = p.prompt.match(/^Think of (.+?) and (.+?)\. Which is (bigger|smaller)\?$/);
  if (!m) return null;
  const i = SIZE_ORDER.indexOf(m[1]), j = SIZE_ORDER.indexOf(m[2]);
  if (i < 0 || j < 0 || i === j) return null;
  const ins = [...s.inputs].map(String).sort().join("|");
  if (s.inputs.length !== 2 || ins !== [m[1], m[2]].sort().join("|")) return null;
  const big_ = SIZE_ORDER[Math.max(i, j)], small = SIZE_ORDER[Math.min(i, j)];
  return s.value === (m[3] === "bigger" ? big_ : small);
};

// ---------- aearms ----------
/** The step states the position, in the answer options, of the right answer: kind 0 the vertex (middle letter of the angle's name), kind 1 the two rays from the vertex,
 *  kind 2 which of two clock-hand turns is bigger (30° per hour mark). inputs [kind, "ABC"]. */
const aearmsIdentify: (s: Step, p: Problem) => Rational | null = (s, p) => {
  const opts = p.options as unknown[] | undefined;
  if (!opts || s.inputs.length !== 2) return null;
  const only = (pred: (o: unknown) => boolean) => { const ix = opts.map((o, i) => (pred(o) ? i : -1)).filter((i) => i >= 0); return ix.length === 1 ? rat(BigInt(ix[0])) : null; };
  let m = p.prompt.match(/^Which point is the vertex of ∠([A-Z])([A-Z])([A-Z])\?$/);
  if (m && big(s.inputs[0]) === 0n && s.inputs[1] === m[1] + m[2] + m[3]) return only((o) => o === m![2]);
  m = p.prompt.match(/^What are the arms of ∠([A-Z])([A-Z])([A-Z])\?$/);
  if (m && big(s.inputs[0]) === 1n && s.inputs[1] === m[1] + m[2] + m[3]) {
    const [a, b, c] = [m[1], m[2], m[3]];
    if (opts.includes(`the rays ${b}${c} and ${b}${a}`)) return null;
    return only((o) => o === `the rays ${b}${a} and ${b}${c}`);
  }
  m = p.prompt.match(/^∠X is the turn made by the minute hand of a clock moving from 12 to (\d+)\. ∠Y is drawn with arms twice as long, and is the turn of the hand moving from 12 to (\d+)\. If ∠X is placed on top of ∠Y with the vertices and one arm together, which is true\?$/);
  if (m && big(s.inputs[0]) === 2n) {
    const x = BigInt(m[1]) * 30n, y = BigInt(m[2]) * 30n;
    const want = x > y ? "∠X is bigger" : x < y ? "∠Y is bigger" : "They are the same size";
    return only((o) => o === want);
  }
  return null;
};

export const CLAIMS: ClaimTable = {
  "agprime/classify": { check: agprimeClassify },
  "agptest/square-root": agptestSqrt,
  "agptest/largest-prime": agptestLargestPrime,
  "agfac/factorise": agfacFactorise,
  "agcomf/factorise": { check: agcomfFactorise },
  "agcomf/intersect": { check: agcomfIntersect },
  "agjump/multiples": { check: agjumpMultiples },
  "aghlw/choose": { check: aghlwChoose },
  "anquad/factorise": { check: anquadFactorise },
  "anquad/write": { check: anquadWrite },
  "anpair/substitute": anpairSubstitute,
  "anpair/write": anpairWrite,
  "acfacts/inverse": { check: acfactsInverse },
  "aematch/deduce": aematchDeduce,
  "acmissing/subtract": acmissingBoth(acmissingSubtract),
  "acmissing/add": acmissingBoth(acmissingAdd),
  "acmissing/divide": acmissingBoth(acmissingDivide),
  "acstory/choose operation": { check: chooseOperation },
  "acstory4/choose operation": { check: chooseOperation },
  "acstory9/choose operation": { check: chooseOperation },
  "afcross/equal": afcrossEqual,
  "afpair/recall": afpairRecall,
  "aabig/compare sizes": { check: aabigCompare },
  "aearms/identify": aearmsIdentify,
};
