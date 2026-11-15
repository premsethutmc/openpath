/**
 * Families b30 (families@2): the CISCE Class 5 goals that were only partly asked (icse5-gaps@2).
 *   aeintl   large numbers written in the international system (commas and number names)  MATH.number.indian-international-numeration
 *   aeexpb   an expanded form turned back into the number                                 MATH.number.large-numbers
 *   aedesc   large numbers in descending order                                            MATH.number.compare-numbers
 *   aeestq   estimating a quotient by rounding                                            MATH.reasoning.estimate-check
 *   aecomp   picking out composite (and prime) numbers                                    MATH.number.primes
 *   aeints   which numbers are integers                                                   MATH.number.integers
 *   aeidesc  integers in descending order                                                 MATH.number.integers
 *   aefpct   fractions and decimals as percentages                                        MATH.number.percent-intro
 * All wording is OpenPath's own; nothing is taken from a textbook.
 */
import type { Def, Step, Value } from "../family-kit";

const INTL = "MATH.number.indian-international-numeration";
const LARGE = "MATH.number.large-numbers";
const CMP = "MATH.number.compare-numbers";
const EST = "MATH.reasoning.estimate-check";
const ROUND = "MATH.number.rounding";
const PRIME = "MATH.number.primes";
const INT = "MATH.number.integers";
const PCT = "MATH.number.percent-intro";
const none = () => null;
const LETTER = "ABCD";
const st = (id: string, op: string, competency: string, inputs: (number | string)[], value: Value): Step => ({ id, op, competency, inputs, value });
/** a small deterministic mixer, so one parameter can stand for a whole set of digits */
const mix = (k: number, i: number) => {
  let x = (k * 2654435761 + i * 40503 + 12345) >>> 0;
  x ^= x >>> 13;
  x = Math.imul(x, 1274126177) >>> 0;
  return (x ^ (x >>> 16)) >>> 0;
};
const place = (opts: string[], right: string, pos: number) => {
  const out = opts.filter((o) => o !== right).slice(0, 3);
  out.splice(pos, 0, right);
  return out;
};
const pick = (v: Value) => (typeof v === "number" ? v : Number(v));

// ============================================================ international system
const ONES = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
const under100 = (n: number) => (n < 20 ? ONES[n] : TENS[Math.floor(n / 10)] + (n % 10 ? `-${ONES[n % 10]}` : ""));
const under1000 = (n: number) => [n >= 100 ? `${ONES[Math.floor(n / 100)]} hundred` : "", n % 100 ? under100(n % 100) : ""].filter(Boolean).join(" ");
const intlName = (n: number) => {
  const parts: string[] = [];
  const m = Math.floor(n / 1e6), t = Math.floor((n % 1e6) / 1000), u = n % 1000;
  if (m) parts.push(`${under1000(m)} million`);
  if (t) parts.push(`${under1000(t)} thousand`);
  if (u) parts.push(under1000(u));
  return parts.join(", ");
};
const indianName = (n: number) => {
  const parts: string[] = [];
  const c = Math.floor(n / 1e7), l = Math.floor((n % 1e7) / 1e5), t = Math.floor((n % 1e5) / 1000), u = n % 1000;
  if (c) parts.push(`${under1000(c)} crore`);
  if (l) parts.push(`${under100(l)} lakh`);
  if (t) parts.push(`${under100(t)} thousand`);
  if (u) parts.push(under1000(u));
  return parts.join(" ");
};
const groupRight = (s: string, sizes: (i: number) => number) => {
  const out: string[] = [];
  let i = s.length, k = 0;
  while (i > 0) {
    const w = sizes(k++);
    out.unshift(s.slice(Math.max(0, i - w), i));
    i -= w;
  }
  return out.join(",");
};
const intlCommas = (n: number) => groupRight(String(n), () => 3);
const indianCommas = (n: number) => groupRight(String(n), (k) => (k === 0 ? 3 : 2));
const leftThrees = (n: number) => String(n).match(/.{1,3}/g)!.join(",");
const pairs = (n: number) => groupRight(String(n), () => 2);
// [a, s, m, pos]: the number a·1 000 000 + (three digit groups from s); m = 0 commas, m = 1 the number name
const intlNum = ([a, s]: number[]) => a * 1e6 + (mix(s, 1) % 1000) * 1000 + (mix(s, 2) % 1000);
const intlOptions = (p: number[]) => {
  const n = intlNum(p);
  return p[2] ? [intlName(n), indianName(n), intlName(Math.floor(n / 1000) * 1000 + (n % 1000) * 0 + Math.floor((n % 1000) / 10)), `${under1000(Math.floor(n / 1e6))} billion, ${intlName(n % 1e6)}`] : [intlCommas(n), indianCommas(n), leftThrees(n), pairs(n)];
};
const intl: Def = {
  id: "aeintl",
  arity: 4,
  title: "Large numbers in the international system",
  competency: INTL,
  type: "choice",
  grade: () => 5,
  parse: none,
  reject: (p) => {
    const [a, s, m, pos] = p;
    if (a < 1 || a > 99 || s < 0 || s > 9 || (m !== 0 && m !== 1) || pos < 0 || pos > 3) return "A number of 7 or 8 digits (1 to 99 millions), shown four ways.";
    const o = intlOptions(p);
    return new Set(o).size === 4 && intlNum(p) % 1000 >= 100 ? null : "The four ways must all be different.";
  },
  prompt: (p) => (p[2] ? `Which is the number name of ${intlCommas(intlNum(p))} in the international system?` : `In the international system, digits are put in groups of three from the right: ones, thousands, millions. Which shows ${intlNum(p)} with its commas in the international system?`),
  choices: (p) => place(intlOptions(p), intlOptions(p)[0], p[3]),
  solve: (p) => ({ steps: [st("group", "group digits", INTL, [intlNum(p)], intlOptions(p)[0]), st("pick", "choose the option", INTL, [intlOptions(p)[0]], p[3])], answer: p[3] }),
  // independent: rebuild the number from each option (commas removed, or names read back) and test the grouping rule
  validate: (p, v) => {
    const n = intlNum(p), opts = place(intlOptions(p), intlOptions(p)[0], p[3]);
    const ok = opts.map((o) => {
      if (!p[2]) return o.replace(/,/g, "") === String(n) && o.split(",").slice(1).every((g) => g.length === 3) && o.split(",")[0].length <= 3;
      const words = Object.fromEntries([...ONES.map((w, i) => [w, i]), ...TENS.map((w, i) => [w, 10 * i])].filter(([w]) => w));
      let total = 0, group = 0;
      for (const w of o.replace(/,/g, "").split(/[\s-]+/)) {
        if (w in words) group += words[w];
        else if (w === "hundred") group *= 100;
        else if (w === "thousand") (total += group * 1000), (group = 0);
        else if (w === "million") (total += group * 1e6), (group = 0);
        else return false;
      }
      return total + group === n;
    });
    return typeof v === "number" && ok.filter(Boolean).length === 1 && ok[v];
  },
  bugs: (p) => {
    const other = (k: number) => [0, 1, 2, 3].filter((i) => i !== p[3])[k - 1];
    return p[2]
      ? [{ id: "indian-name", kind: "conceptual", competency: INTL, says: "That is the name in the Indian system (lakhs and crores). The international system uses thousands and millions.", predict: other(1) }]
      : [
          { id: "indian-commas", kind: "conceptual", competency: INTL, says: "Those are the Indian commas (3, then 2, 2). In the international system every group is three digits.", predict: other(1) },
          { id: "from-left", kind: "procedural", competency: INTL, says: "The digits were grouped from the left. Always start grouping from the ones on the right.", predict: other(2) },
        ];
  },
  variants: () => [],
  explain: (s) => (s.id === "pick" ? `That is option ${LETTER[Number(s.value)]}` : `${s.inputs[0]} in the international system is ${s.value}`),
  domain: [[1, 99], [0, 9], [0, 1], [0, 3]],
  cap: 400,
  difficulty: ([a, , m]) => (m ? 2 : a < 10 ? 1 : 2),
  teach: {
    idea: "The international system groups digits in threes from the right: ones, thousands, millions. One million is 10 lakh, and ten million is one crore.",
    method: "Start at the right and put a comma after every three digits. Read each group of three with its name: so many million, so many thousand, and the rest.",
    visual: (p) => ({ type: "table", head: ["Millions", "Thousands", "Ones"], rows: [intlCommas(intlNum(p)).split(",").length === 3 ? intlCommas(intlNum(p)).split(",") : ["", ...intlCommas(intlNum(p)).split(",")]] }),
    alternatives: [{ id: "compare", title: "Compare with the Indian system", kind: "conceptual", text: ["Indian: 3 digits, then groups of 2 (thousand, lakh, crore).", "International: groups of 3 all the way (thousand, million).", "The digits are the same; only the commas and names change."] }],
  },
  limits: "Numbers below 100 million; billions are not asked.",
};

// ============================================================ expanded form back to the number
const PLACE = [1, 10, 100, 1000, 10000, 100000, 1000000, 10000000];
// [L, s]: an L-digit number (5 to 8 digits) from s, with one or two zero digits
const expDigits = ([L, s]: number[]) => {
  const d = Array.from({ length: L }, (_, i) => (i === 0 ? 1 + (mix(s, 10 + i) % 9) : 1 + (mix(s, 10 + i) % 9)));
  d[1 + (mix(s, 3) % (L - 1))] = 0;
  if (s % 2) d[1 + (mix(s, 4) % (L - 1))] = 0;
  return d; // most significant first
};
const expNum = (p: number[]) => expDigits(p).reduce((a, x) => a * 10 + x, 0);
const expTerms = (p: number[]) => {
  const d = expDigits(p), L = d.length;
  return d.map((x, i) => [x, PLACE[L - 1 - i]]).filter(([x]) => x);
};
const expb: Def = {
  id: "aeexpb",
  arity: 2,
  title: "From expanded form back to the number",
  competency: LARGE,
  type: "integer",
  mc: true,
  grade: () => 5,
  parse: none,
  reject: ([L, s]) => (L < 5 || L > 8 || s < 0 || s > 99 ? "A number of 5 to 8 digits with a zero in it." : null),
  prompt: (p) => `Which number is ${expTerms(p).map(([x, v]) => `${x} × ${v}`).join(" + ")}? (Write it in figures, without commas.)`,
  solve: (p) => ({ steps: [st("place", "place the digits", LARGE, expTerms(p).map(([x, v]) => x * v), expNum(p))], answer: expNum(p) }),
  // independent: add the products
  validate: (p, v) => v === expTerms(p).reduce((a, [x, val]) => a + x * val, 0),
  bugs: (p) => {
    const skip = Number(expTerms(p).map(([x]) => x).join(""));
    return skip !== expNum(p) ? [{ id: "no-zero", kind: "conceptual", competency: LARGE, says: "The digits were written side by side, but a place with nothing in it needs a 0. Check every place from the largest down to the ones.", predict: skip }] : [];
  },
  distractors: (p) => [expNum(p) * 10, Math.floor(expNum(p) / 10), expNum(p) + PLACE[2]].filter((x) => x !== expNum(p)),
  variants: () => [],
  explain: (s) => `Adding the places: ${s.inputs.join(" + ")} = ${s.value}`,
  domain: [[5, 8], [0, 99]],
  keep: ([L, s]) => s < (L === 5 ? 60 : 100),
  cap: 360,
  difficulty: ([L]) => (L <= 6 ? 1 : 2),
  teach: {
    idea: "An expanded form shows what each digit is worth. Putting it back together means writing each digit in its place, with 0 in any place that is missing.",
    method: "Find the largest place (it tells you how many digits). Write the digit for each place from left to right; write 0 where a place is not in the sum.",
    visual: (p) => ({ type: "table", head: expDigits(p).map((_, i) => String(PLACE[expDigits(p).length - 1 - i])), rows: [expDigits(p)] }),
    alternatives: [{ id: "add", title: "Just add", kind: "procedural", text: ["Work out each product, such as 3 × 10000 = 30000.", "Add them in a column, lining up the ones."] }],
  },
  limits: "Numbers of 5 to 8 digits; expanded forms with powers of ten are a later skill.",
};

// ============================================================ descending order of large numbers
// [s, k]: five 6- or 7-digit numbers sharing their first digits; which is k-th (1 to 5) in descending order
const descSet = (s: number) => {
  const L = s % 2 ? 7 : 6, base = (1 + (mix(s, 1) % 9)) * PLACE[L - 1];
  const out = new Set<number>();
  for (let i = 0; out.size < 5; i++) out.add(base + (mix(s, 20 + i) % 10) * PLACE[L - 3] + (mix(s, 40 + i) % 1000) * (i % 2 ? 1 : 10));
  return [...out];
};
const desc: Def = {
  id: "aedesc",
  arity: 2,
  title: "Large numbers in descending order",
  competency: CMP,
  type: "integer",
  mc: true,
  grade: () => 5,
  parse: none,
  reject: ([s, k]) => (s < 0 || s > 79 || k < 2 || k > 4 ? "Five large numbers; the 2nd, 3rd or 4th in descending order is asked." : null),
  prompt: ([s, k]) => `Arrange these numbers in descending order (largest first): ${descSet(s).join(", ")}. Which number is ${["", "first", "second", "third", "fourth", "fifth"][k]}?`,
  solve: ([s, k]) => {
    const d = [...descSet(s)].sort((a, b) => b - a);
    return { steps: [st("order", "sort", CMP, descSet(s), d.join(" > ")), st("pick", "count along", CMP, [k], d[k - 1])], answer: d[k - 1] };
  },
  // independent: count how many numbers are larger
  validate: ([s, k], v) => descSet(s).includes(v as number) && descSet(s).filter((x) => x > (v as number)).length === k - 1,
  bugs: ([s, k]) => {
    const a = [...descSet(s)].sort((x, y) => x - y);
    return [{ id: "ascending", kind: "conceptual", competency: CMP, says: "The numbers were put smallest first. Descending order starts with the LARGEST.", predict: a[k - 1] === [...a].reverse()[k - 1] ? null : a[k - 1] }];
  },
  distractors: ([s, k]) => descSet(s).filter((x) => x !== [...descSet(s)].sort((a, b) => b - a)[k - 1]),
  variants: () => [],
  explain: (s) => (s.id === "order" ? `Compare place by place from the left: ${s.value}` : `Position ${s.inputs[0]} is ${s.value}`),
  domain: [[0, 79], [2, 4]],
  cap: 240,
  difficulty: ([s]) => (s % 2 ? 2 : 1),
  teach: {
    idea: "Descending order goes from the largest to the smallest. With the same number of digits, the first place where the digits differ decides which is larger.",
    method: "Line the numbers up by place. Compare the digits from the left; at the first place they differ, the larger digit gives the larger number. Write the largest first.",
    visual: ([s]) => ({ type: "table", head: ["Number"], rows: descSet(s).map((x) => [x]) }),
    alternatives: [{ id: "cross_off", title: "Find and cross off", kind: "procedural", text: ["Find the largest number and write it down; cross it off.", "Repeat with what is left until all five are written."] }],
  },
  limits: "Five numbers of the same length (6 or 7 digits).",
};

// ============================================================ estimating a quotient
// [R, q, e, o]: divisor about 10·R, quotient q; dividend 10·R·q + e (rounds to 10·R·q), divisor 10·R + o
const estParts = ([R, q, e, o]: number[]) => ({ D: 10 * R * q + (e - 4) * 11, d: 10 * R + (o - 2) });
const est: Def = {
  id: "aeestq",
  arity: 4,
  title: "Estimating a quotient by rounding",
  competency: EST,
  type: "integer",
  mc: true,
  grade: () => 5,
  parse: none,
  reject: (p) => {
    const [R, q, e, o] = p;
    if (R < 2 || R > 9 || q < 2 || q > 60 || e < 0 || e > 8 || o < 0 || o > 4) return "A dividend of up to five digits and a two-digit divisor.";
    if ((10 * R * q) % 100 || 10 * R * q < 1000) return "The rounded dividend must be a whole number of hundreds, at least 1000.";
    const { D, d } = estParts(p);
    return Math.round(D / 100) * 100 === 10 * R * q && Math.round(d / 10) * 10 === 10 * R && D % d !== 0 ? null : "The numbers must round to the friendly ones.";
  },
  prompt: (p) => {
    const { D, d } = estParts(p);
    return `Estimate ${D} ÷ ${d}: round ${D} to the nearest hundred and ${d} to the nearest ten, then divide.`;
  },
  solve: (p) => {
    const [R, q] = p, { D, d } = estParts(p);
    return { steps: [st("round-D", "round", ROUND, [D, 100], 10 * R * q), st("round-d", "round", ROUND, [d, 10], 10 * R), st("divide", "divide", EST, [10 * R * q, 10 * R], q)], answer: q };
  },
  // independent: round by halves and divide
  validate: (p, v) => {
    const { D, d } = estParts(p);
    const rD = Math.floor((D + 50) / 100) * 100, rd = Math.floor((d + 5) / 10) * 10;
    return v === rD / rd;
  },
  bugs: (p) => {
    const { D, d } = estParts(p), q = p[1];
    const exact = Math.floor(D / d);
    return [
      { id: "exact", kind: "procedural", competency: EST, says: "That is the exact quotient worked out. An estimate uses the rounded numbers so it can be done in your head.", predict: exact === q ? null : exact },
      { id: "round-down-tens", kind: "procedural", competency: ROUND, says: "The dividend was rounded to the nearest ten. Round it to the nearest hundred as asked.", predict: Number.isInteger(Math.round(D / 10) * 10 / (10 * p[0])) && Math.round(D / 10) * 10 / (10 * p[0]) !== q ? Math.round(D / 10) * 10 / (10 * p[0]) : null },
    ];
  },
  distractors: ([, q]) => [q * 10, q + 1, q - 1].filter((x) => x > 0),
  variants: () => [],
  explain: (s) => (s.id === "divide" ? `${s.inputs[0]} ÷ ${s.inputs[1]} = ${s.value}` : `${s.inputs[0]} to the nearest ${s.inputs[1]} is ${s.value}`),
  domain: [[2, 9], [2, 60], [0, 8], [0, 4]],
  keep: ([, , e, o]) => (e + o) % 3 === 0,
  cap: 300,
  difficulty: ([, q]) => (q <= 30 ? 1 : 2),
  teach: {
    idea: "An estimate is a quick, close answer. Rounding both numbers to friendly ones makes the division easy to do in your head.",
    method: "Round the dividend to the nearest hundred and the divisor to the nearest ten. Divide the rounded numbers. Use the estimate to check an exact answer is sensible.",
    visual: (p) => ({ type: "table", head: ["", "Number", "Rounded"], rows: [["Dividend", estParts(p).D, 10 * p[0] * p[1]], ["Divisor", estParts(p).d, 10 * p[0]]] }),
    alternatives: [{ id: "tens", title: "Cancel the zeros", kind: "procedural", text: ["Both rounded numbers end in 0: take one 0 off each.", "Now divide the smaller numbers, for example 2400 ÷ 40 = 240 ÷ 4 = 60."] }],
  },
  limits: "Dividends that round to whole hundreds and two-digit divisors that round to whole tens.",
};

// ============================================================ composite and prime numbers
const isPrime = (n: number) => {
  if (n < 2) return false;
  for (let k = 2; k * k <= n; k++) if (n % k === 0) return false;
  return true;
};
const PRIMES = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97];
const TRICKY = [9, 15, 21, 25, 27, 33, 35, 39, 45, 49, 51, 55, 57, 63, 65, 69, 77, 81, 85, 87, 91, 93, 95, 99];
// [m, i, s, pos]: m = 0 one composite (TRICKY[i]) among three primes, m = 1 one prime (PRIMES[i]) among three composites; s spreads the others
const compOptions = ([m, i, s]: number[]) => {
  const right = m ? PRIMES[i] : TRICKY[i];
  const pool = m ? TRICKY : PRIMES;
  const others: number[] = [];
  for (let k = 0; others.length < 3; k++) {
    const x = pool[(s * 7 + k * 5 + i) % pool.length];
    if (!others.includes(x) && x !== right) others.push(x);
  }
  if (!m && s % 3 === 0) others[2] = 1; // 1 is neither prime nor composite
  return { right: String(right), others: others.map(String) };
};
const comp: Def = {
  id: "aecomp",
  arity: 4,
  title: "Composite and prime numbers",
  competency: PRIME,
  type: "choice",
  grade: () => 5,
  parse: none,
  reject: ([m, i, s, pos]) => ((m !== 0 && m !== 1) || i < 0 || i >= (m ? PRIMES.length : TRICKY.length) || s < 0 || s > 11 || pos < 0 || pos > 3 ? "One composite among primes, or one prime among composites, below 100." : null),
  prompt: ([m]) => (m ? "A prime number has exactly two factors: 1 and itself. Which of these numbers is prime?" : "A composite number has more than two factors. Which of these numbers is composite?"),
  choices: (p) => {
    const { right, others } = compOptions(p);
    return place(others, right, p[3]);
  },
  solve: (p) => {
    const { right } = compOptions(p), n = Number(right);
    const f = [...Array(n).keys()].map((k) => k + 1).filter((k) => n % k === 0);
    return { steps: [st("factors", "list factors", PRIME, [n], f.join(", ")), st("pick", "choose the option", PRIME, [right], p[3])], answer: p[3] };
  },
  // independent: count factors of every option
  validate: (p, v) => {
    const { right, others } = compOptions(p);
    const opts = place(others, right, p[3]).map(Number);
    const count = (n: number) => [...Array(n).keys()].filter((k) => n % (k + 1) === 0).length;
    const ok = opts.map((n) => (p[0] ? count(n) === 2 : count(n) > 2));
    return typeof v === "number" && ok.filter(Boolean).length === 1 && ok[v] && isPrime(Number(right)) === (p[0] === 1);
  },
  bugs: (p) => {
    const { right, others } = compOptions(p);
    const opts = place(others, right, p[3]);
    const one = opts.indexOf("1");
    const odd = p[0] ? -1 : opts.findIndex((o) => o !== right && Number(o) % 2 === 1 && Number(o) > 9);
    return [
      ...(one >= 0 ? [{ id: "one", kind: "conceptual" as const, competency: PRIME, says: "1 has only one factor, so it is neither prime nor composite.", predict: one }] : []),
      ...(odd >= 0 ? [{ id: "odd-is-prime", kind: "conceptual" as const, competency: PRIME, says: "An odd number is not always prime, and a prime is not always odd. Count the factors.", predict: odd }] : []),
    ];
  },
  variants: () => [],
  explain: (s) => (s.id === "pick" ? `That is option ${LETTER[Number(s.value)]}` : `The factors of ${s.inputs[0]} are ${s.value}`),
  domain: [[0, 1], [0, 24], [0, 11], [0, 3]],
  keep: ([, , s, pos]) => (s + pos) % 2 === 0,
  cap: 400,
  difficulty: ([m, i]) => (m === 0 && TRICKY[i] > 50 ? 2 : 1),
  teach: {
    idea: "A prime number has exactly two factors, 1 and itself. A composite number has more than two. 1 is neither.",
    method: "Try dividing the number by 2, 3, 5 and 7. If one of them divides it exactly (and it is not the number itself), the number is composite.",
    visual: () => ({ type: "table", head: ["Number", "Factors", "Kind"], rows: [[1, "1", "neither"], [13, "1, 13", "prime"], [51, "1, 3, 17, 51", "composite"]] }),
    alternatives: [{ id: "rectangles", title: "Make rectangles", kind: "conceptual", text: ["Arrange that many counters in a rectangle with at least two rows.", "If you can, the number is composite; if the only way is a single row, it is prime."] }],
  },
  limits: "Numbers up to 100; prime factorisation is a separate skill.",
};

// ============================================================ which numbers are integers
const NONINT = ["1/2", "3.5", "-2.5", "0.7", "7/4", "-1/3"];
// [m, a, b, pos]: m = 0 "which is NOT an integer", m = 1 "which is an integer but not a counting number"
const intOptions = ([m, a, b]: number[]) => {
  if (m === 0) return { right: NONINT[a % NONINT.length], others: [String(-(1 + (b % 9))), "0", String(3 + ((a + b) % 20))] };
  const right = b % 3 === 0 ? "0" : String(-(1 + ((a + b) % 15)));
  return { right, others: [String(1 + (a % 9)), NONINT[b % NONINT.length], String(10 + ((a * 3 + b) % 40))] };
};
const ints: Def = {
  id: "aeints",
  arity: 4,
  title: "Which numbers are integers",
  competency: INT,
  type: "choice",
  grade: () => 5,
  parse: none,
  reject: ([m, a, b, pos]) => ((m !== 0 && m !== 1) || a < 0 || a > 11 || b < 0 || b > 8 || pos < 0 || pos > 3 ? "Four numbers: counting numbers, zero, negatives and a fraction or decimal." : null),
  prompt: ([m]) => (m ? "The integers are the counting numbers (1, 2, 3, …), zero and the negatives of the counting numbers. Which of these is an integer but NOT a counting number?" : "The integers are the counting numbers (1, 2, 3, …), zero and the negatives of the counting numbers. Which of these is NOT an integer?"),
  choices: (p) => {
    const { right, others } = intOptions(p);
    return place(others, right, p[3]);
  },
  solve: (p) => ({ steps: [st("sort", "classify", INT, [intOptions(p).right], p[0] ? "an integer, not a counting number" : "not a whole number"), st("pick", "choose the option", INT, [intOptions(p).right], p[3])], answer: p[3] }),
  // independent: parse each option as a number and test it
  validate: (p, v) => {
    const { right, others } = intOptions(p);
    const val = (o: string) => (o.includes("/") ? Number(o.split("/")[0]) / Number(o.split("/")[1]) : Number(o));
    const ok = place(others, right, p[3]).map((o) => (p[0] ? Number.isInteger(val(o)) && val(o) <= 0 : !Number.isInteger(val(o))));
    return typeof v === "number" && ok.filter(Boolean).length === 1 && ok[v];
  },
  bugs: (p) => {
    const { right, others } = intOptions(p);
    const opts = place(others, right, p[3]);
    const neg = opts.findIndex((o) => o !== right && o.startsWith("-") && !o.includes(".") && !o.includes("/"));
    const zero = opts.indexOf("0");
    return p[0]
      ? [{ id: "fraction", kind: "conceptual", competency: INT, says: "A fraction or decimal is not an integer at all. The answer must be zero or a negative whole number.", predict: opts.findIndex((o) => o.includes("/") || o.includes(".")) }]
      : [
          ...(neg >= 0 ? [{ id: "negatives-not-integers", kind: "conceptual" as const, competency: INT, says: "Negative whole numbers ARE integers. Only fractions and decimals between whole numbers are not.", predict: neg }] : []),
          ...(zero >= 0 ? [{ id: "zero", kind: "conceptual" as const, competency: INT, says: "Zero is an integer.", predict: zero }] : []),
        ];
  },
  variants: () => [],
  explain: (s) => (s.id === "pick" ? `That is option ${LETTER[Number(s.value)]}` : `${s.inputs[0]} is ${s.value}`),
  domain: [[0, 1], [0, 11], [0, 8], [0, 3]],
  keep: ([, a, b, pos]) => (a + b + pos) % 2 === 0,
  cap: 300,
  difficulty: ([m]) => (m ? 2 : 1),
  teach: {
    idea: "Integers are the whole numbers going both ways along the number line: …, −3, −2, −1, 0, 1, 2, 3, … Counting numbers are only 1, 2, 3, …",
    method: "Ask: is it a whole number with no fraction or decimal part? If yes, it is an integer, whether it is positive, zero or negative.",
    visual: () => ({ type: "numberline", from: -5, to: 5, marks: [-3, 0, 2] }),
    alternatives: [{ id: "number_line", title: "Look at the number line", kind: "conceptual", text: ["Mark the whole-number points on a number line on both sides of 0.", "A number that lands exactly on one of those marks is an integer."] }],
  },
  limits: "Integers between −20 and 50; operations on integers are separate skills.",
};

// ============================================================ integers in descending order
const idescSet = (s: number) => {
  const out = new Set<number>();
  for (let i = 0; out.size < 5; i++) out.add((mix(s, 60 + i) % 41) - 20);
  const a = [...out];
  if (a.filter((x) => x < 0).length < 2) a[0] = -Math.abs(a[0]) - 1 === a[1] ? -19 : -Math.abs(a[0]) - 1;
  return [...new Set(a)].length === 5 ? a : [-7, 3, -2, 0, 5];
};
const idesc: Def = {
  id: "aeidesc",
  arity: 2,
  title: "Integers in descending order",
  competency: INT,
  type: "integer",
  mc: true,
  grade: () => 5,
  parse: none,
  reject: ([s, k]) => (s < 0 || s > 99 || k < 1 || k > 5 ? "Five integers between −20 and 20." : null),
  prompt: ([s, k]) => `Put these integers in descending order (largest first): ${idescSet(s).join(", ")}. Which integer is ${["", "first", "second", "third", "fourth", "fifth"][k]}?`,
  solve: ([s, k]) => {
    const d = [...idescSet(s)].sort((a, b) => b - a);
    return { steps: [st("order", "sort", INT, idescSet(s), d.join(" > ")), st("pick", "count along", INT, [k], d[k - 1])], answer: d[k - 1] };
  },
  // independent: count how many are larger
  validate: ([s, k], v) => idescSet(s).includes(v as number) && idescSet(s).filter((x) => x > (v as number)).length === k - 1,
  bugs: ([s, k]) => {
    const d = [...idescSet(s)].sort((a, b) => b - a)[k - 1];
    const byAbs = [...idescSet(s)].sort((a, b) => Math.abs(b) - Math.abs(a) || b - a)[k - 1];
    const asc = [...idescSet(s)].sort((a, b) => a - b)[k - 1];
    return [
      { id: "size-not-sign", kind: "conceptual", competency: INT, says: "The numbers were ordered by size without their signs. A negative number is less than zero: −9 is smaller than −2.", predict: byAbs === d ? null : byAbs },
      { id: "ascending", kind: "procedural", competency: INT, says: "That is ascending order (smallest first). Descending starts with the largest.", predict: asc === d ? null : asc },
    ];
  },
  distractors: ([s, k]) => idescSet(s).filter((x) => x !== [...idescSet(s)].sort((a, b) => b - a)[k - 1]),
  variants: () => [],
  explain: (s) => (s.id === "order" ? `On a number line the larger number is further right: ${s.value}` : `Position ${s.inputs[0]} is ${s.value}`),
  domain: [[0, 99], [1, 5]],
  keep: ([s, k]) => (s + k) % 2 === 0 && idescSet(s).length === 5,
  cap: 250,
  difficulty: ([s]) => (idescSet(s).filter((x) => x < 0).length >= 3 ? 2 : 1),
  teach: {
    idea: "On a number line, numbers get larger to the right. Every positive number is larger than 0, and 0 is larger than every negative number. Of two negatives, the one closer to 0 is larger.",
    method: "Put the positives first (largest first), then 0, then the negatives starting with the one closest to 0.",
    visual: ([s]) => ({ type: "table", head: ["Integer"], rows: idescSet(s).map((x) => [x]) }),
    alternatives: [{ id: "line", title: "Mark them on a number line", kind: "procedural", text: ["Mark all five integers on a number line.", "Read them from right to left: that is descending order."] }],
  },
  limits: "Integers from −20 to 20.",
};

// ============================================================ fractions and decimals as percentages
const DEN = [2, 4, 5, 10, 20, 25, 50];
// [m, d, n]: m = 0 the fraction n/DEN[d] as a percentage; m = 1 the decimal n/100 as a percentage
const fpct: Def = {
  id: "aefpct",
  arity: 3,
  title: "Fractions and decimals as percentages",
  competency: PCT,
  type: "integer",
  mc: true,
  grade: () => 5,
  parse: none,
  reject: ([m, d, n]) => ((m !== 0 && m !== 1) || d < 0 || d >= DEN.length || n < 1 || (m === 0 && n >= DEN[d]) || (m === 1 && (n > 99 || d !== 0)) ? "A proper fraction with denominator 2, 4, 5, 10, 20, 25 or 50, or a decimal of hundredths." : null),
  prompt: ([m, d, n]) => (m ? `Write ${(n / 100).toFixed(2)} as a percentage. (Give the number of per cent: for 50% write 50.)` : `Write ${n}/${DEN[d]} as a percentage. (Give the number of per cent: for 50% write 50.)`),
  solve: ([m, d, n]) =>
    m
      ? { steps: [st("hundredths", "read", PCT, [n / 100], n)], answer: n }
      : { steps: [st("scale", "equivalent fraction", PCT, [n, DEN[d], 100 / DEN[d]], (n * 100) / DEN[d])], answer: (n * 100) / DEN[d] },
  // independent: multiply by 100 as a decimal
  validate: ([m, d, n], v) => Math.abs((v as number) - (m ? n / 100 : n / DEN[d]) * 100) < 1e-9,
  bugs: ([m, d, n]) =>
    m
      ? [{ id: "tenths", kind: "conceptual", competency: PCT, says: "Per cent means hundredths: 0.07 is 7 hundredths, so 7%.", predict: n % 10 && n < 10 ? n * 10 : null }]
      : [
          { id: "numerator", kind: "conceptual", competency: PCT, says: "The top number was given as the percentage. Make the bottom number 100 first.", predict: n === (n * 100) / DEN[d] ? null : n },
          { id: "denominator", kind: "procedural", competency: PCT, says: "The bottom number was used. A percentage is how many out of 100.", predict: DEN[d] === (n * 100) / DEN[d] ? null : DEN[d] },
        ],
  distractors: ([m, d, n]) => {
    const r = m ? n : (n * 100) / DEN[d];
    return [r + 5, r * 2, 100 - r].filter((x) => x > 0 && x !== r && x <= 200);
  },
  variants: () => [],
  explain: (s) => (s.id === "hundredths" ? `${s.inputs[0]} is ${s.value} hundredths, so ${s.value}%` : `${s.inputs[0]}/${s.inputs[1]} = ${s.value}/100 (multiply top and bottom by ${s.inputs[2]}), so ${s.value}%`),
  domain: [[0, 1], [0, DEN.length - 1], [1, 99]],
  cap: 300,
  difficulty: ([m, d]) => (m ? 1 : DEN[d] >= 20 ? 2 : 1),
  teach: {
    idea: "Per cent means 'out of 100'. A fraction with 100 at the bottom, or a decimal in hundredths, can be read straight off as a percentage.",
    method: "For a fraction, find what to multiply the bottom number by to make 100, and multiply the top by the same. For a decimal, the hundredths are the percentage: 0.35 = 35%.",
    visual: ([m, d, n]) => ({ type: "table", head: ["Fraction", "Decimal", "Percentage"], rows: [[m ? `${n}/100` : `${n}/${DEN[d]}`, ((m ? n / 100 : n / DEN[d])).toFixed(2), `${m ? n : (n * 100) / DEN[d]}%`]] }),
    alternatives: [{ id: "grid", title: "Shade a hundred grid", kind: "conceptual", text: ["Shade the fraction of a 10 × 10 grid.", "Count the shaded squares: that number is the percentage."] }],
  },
  limits: "Fractions whose denominators divide 100, and decimals in hundredths; percentages above 100% are not asked.",
};

export const B30: Def[] = [intl, expb, desc, est, comp, ints, idesc, fpct];
