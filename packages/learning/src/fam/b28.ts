/**
 * Families b28 (families@2): parts of the CISCE Class 5 syllabus no family asked yet (cisce5-gaps@1).
 *   aefword  adding and subtracting fractions in everyday stories                    MATH.number.fraction-add
 *   aedfrl   halves, quarters, fifths and tenths as decimals, with lengths and money  MATH.number.decimal-tenths
 *   aedlike  like, unlike and equivalent decimals                                     MATH.number.decimal-tenths
 *   agtwin   twin primes                                                              MATH.number.primes
 *   agpgrid  a percentage read from a shaded hundred grid                             MATH.number.percent-intro
 *   aapat2   a pattern that changes in two ways at once (shape and colour)            MATH.algebra.repeating-patterns
 * All wording and contexts are OpenPath's own; nothing is taken from a textbook.
 */
import type { Bug, Def, Step, Value } from "../family-kit";
import { near } from "../family-kit";

const FADD = "MATH.number.fraction-add";
const EQF = "MATH.number.equivalent-fractions";
const DTEN = "MATH.number.decimal-tenths";
const PRIME = "MATH.number.primes";
const PCT = "MATH.number.percent-intro";
const REP = "MATH.algebra.repeating-patterns";
const none = () => null;
const NAMES = ["Anu", "Ravi", "Meena", "Arjun", "Kavya", "Imran", "Divya", "Selvi", "Karthik", "Priya"];
const name = (k: number) => NAMES[((k % NAMES.length) + NAMES.length) % NAMES.length];
const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b));
const st = (id: string, op: string, competency: string, inputs: (number | string)[], value: Value): Step => ({ id, op, competency, inputs, value });
const frac = (n: number, d: number) => {
  const g = gcd(n, d);
  return `${n / g}/${d / g}`;
};
const dec = (x: number) => String(Math.round(x * 1000) / 1000);
const LETTER = "ABCD";

// ============================================================ fraction stories
// [a, b, c, d, ctx, op]: a/b and c/d of a quantity; op 0 joins them, op 1 takes c/d away from a/b
const CTX = [
  { unit: "m", thing: "ribbon", join: (w: string, x: string, y: string) => `${w} has ${x} m of ribbon and buys ${y} m more. How many metres of ribbon does ${w} have now?`, take: (w: string, x: string, y: string) => `${w} has ${x} m of ribbon and cuts off ${y} m for a gift. How many metres of ribbon are left?` },
  { unit: "L", thing: "milk", join: (w: string, x: string, y: string) => `In the morning ${w}'s family uses ${x} litre of milk and in the evening ${y} litre. How many litres do they use in the day?`, take: (w: string, x: string, y: string) => `A jug holds ${x} litre of milk. ${w} pours out ${y} litre for tea. How many litres are left in the jug?` },
  { unit: "km", thing: "walk", join: (w: string, x: string, y: string) => `${w} walks ${x} km to the market and then ${y} km to the temple. How many kilometres does ${w} walk in all?`, take: (w: string, x: string, y: string) => `The school is ${x} km from ${w}'s house. ${w} has walked ${y} km. How many kilometres are still to go?` },
  { unit: "kg", thing: "rice", join: (w: string, x: string, y: string) => `${w} buys ${x} kg of rice and ${y} kg of dal. How many kilograms is that altogether?`, take: (w: string, x: string, y: string) => `A bag holds ${x} kg of sugar. ${w} uses ${y} kg to make sweets. How many kilograms of sugar are left?` },
];
const fword: Def = {
  id: "aefword",
  arity: 6,
  title: "Adding and subtracting fractions in everyday stories",
  competency: FADD,
  type: "fraction",
  mc: true,
  parse: none,
  reject: ([a, b, c, d, k, op]) =>
    b < 2 || d < 2 || b > 10 || d > 10 || b === d || a < 1 || c < 1 || a >= b || c >= d || k < 0 || k >= CTX.length || (op !== 0 && op !== 1) || (op === 1 && a * d <= c * b)
      ? "Two proper fractions with different denominators up to 10; when one is taken away, the first is the larger."
      : null,
  prompt: ([a, b, c, d, k, op]) => `${(op ? CTX[k].take : CTX[k].join)(name(a + b + k), `${a}/${b}`, `${c}/${d}`)} (A fraction is fine.)`,
  solve: ([a, b, c, d, , op]) => {
    const l = (b * d) / gcd(b, d);
    const [x, y] = [a * (l / b), c * (l / d)];
    const r = op ? x - y : x + y;
    return {
      steps: [
        st("operation", "choose", FADD, [op ? "take away" : "join"], op ? "subtract" : "add"),
        st("common", "multiply", EQF, [b, d], l),
        st("rename", "multiply", EQF, [x, y], [x, y]),
        st("combine", op ? "subtract" : "add", FADD, [x, y, l], r / l),
      ],
      answer: r / l,
    };
  },
  // independent: cut both amounts into pieces of one size found by trying multiples, then count the pieces
  validate: ([a, b, c, d, , op], v) => {
    if (typeof v !== "number") return false;
    let D = b;
    while (D % d !== 0) D += b;
    let pieces = 0;
    for (let i = 0; i < a; i++) pieces += D / b;
    for (let i = 0; i < c; i++) pieces += op ? -D / d : D / d;
    return near(pieces / D, v);
  },
  bugs: ([a, b, c, d, , op]) => {
    const l = (b * d) / gcd(b, d);
    const right = op ? a / b - c / d : a / b + c / d;
    const list: Bug[] = [
      { id: "tops-and-bottoms", kind: "conceptual", competency: FADD, says: `The tops and the bottoms were ${op ? "taken away" : "added"} separately. Fractions with different pieces must first be written with the same pieces.`, predict: op ? (b - d > 0 && a - c > 0 ? (a - c) / (b - d) : null) : (a + c) / (b + d) },
      { id: "tops-not-scaled", kind: "procedural", competency: EQF, says: `A common denominator, ${l}, was chosen but the tops were not changed to match it.`, predict: op ? (a - c > 0 ? (a - c) / l : null) : (a + c) / l },
      { id: "wrong-operation", kind: "conceptual", competency: FADD, says: op ? "The amounts were added, but the story takes one amount away from the other." : "One amount was taken from the other, but the story puts the two amounts together.", predict: op ? a / b + c / d : a * d > c * b ? a / b - c / d : null },
    ];
    return list.filter((x) => x.predict !== null && !near(x.predict as number, right) && (x.predict as number) > 0);
  },
  distractors: ([a, b, c, d, , op]) => {
    const r = op ? a / b - c / d : a / b + c / d;
    return [r + 1 / ((b * d) / gcd(b, d)), r * 2, Math.abs(r - 1 / ((b * d) / gcd(b, d)))].filter((x) => x > 0 && !near(x, r));
  },
  variants: () => [],
  stepWhy: (s) => {
    const w: Record<string, string[]> = { "operation": ["The story tells us what to do: putting amounts together means add, and finding what is left or the difference means take away."], "common": ["Fractions can only be added or taken away when the pieces are the same size, so we find a common denominator."], "rename": ["Each fraction is written with that denominator by multiplying its top and bottom by the same number, which keeps its value."], "combine": ["With same-sized pieces, we just add or take away the numbers of pieces."] };
    return w[`${s.id}|${s.op}`] ?? w[s.id] ?? w[`${s.id.replace(/\d+$/, "#")}|${s.op}`] ?? w[s.id.replace(/\d+$/, "#")] ?? w["*"] ?? null;
  },
  explain: (s) =>
    s.id === "operation"
      ? s.value === "add" ? "The story puts two amounts together, so add" : "The story takes one amount away from another, so subtract"
      : s.id === "common"
        ? `A common denominator of ${s.inputs[0]} and ${s.inputs[1]}: ${s.value}`
        : s.id === "rename"
          ? `Write both with that denominator: ${(s.value as number[])[0]} and ${(s.value as number[])[1]} of those pieces`
          : `${s.inputs[0]} ${s.op === "add" ? "+" : "−"} ${s.inputs[1]} = ${s.op === "add" ? (s.inputs[0] as number) + (s.inputs[1] as number) : (s.inputs[0] as number) - (s.inputs[1] as number)} pieces of ${s.inputs[2]}: ${frac(Math.round((s.value as number) * (s.inputs[2] as number)), s.inputs[2] as number)}`,
  domain: [[1, 9], [2, 10], [1, 9], [2, 10], [0, 3], [0, 1]],
  keep: ([a, b, c, d]) => a < b && c < d && b !== d && b <= 8 && d <= 8 && gcd(a, b) === 1 && gcd(c, d) === 1,
  cap: 400,
  difficulty: ([, b, , d, , op]) => (Math.max(b, d) % Math.min(b, d) === 0 ? 1 : op ? 3 : 2),
  teach: {
    idea: "Decide from the story whether the amounts are put together (add) or one is taken from the other (subtract). Fractions can be added or subtracted only when they count the same size of piece.",
    method: "Write both fractions with a common denominator, then add or subtract the tops. Write the answer in its simplest form.",
    visual: ([a, b, c, d]) => ({ type: "strips", top: b, shaded: a, bottom: d, bottomShaded: c, labels: [`${a}/${b}`, `${c}/${d}`] }),
    alternatives: [
      { id: "same_pieces", title: "Cut both into the same pieces", kind: "conceptual", text: ["Draw two strips of the same length, one cut into the first denominator's pieces and one into the second's.", "Cut both again until every piece is the same size. Now count the shaded pieces together, or take one count from the other."] },
    ],
  },
  limits: "Two proper fractions with different denominators up to 8, in four everyday settings; mixed numbers and three fractions are not included.",
};

// ============================================================ simple fractions as decimals, with measures and money
const SIMPLE: [number, number][] = [[1, 2], [1, 4], [3, 4], [1, 5], [2, 5], [3, 5], [4, 5], [1, 10], [3, 10], [7, 10], [9, 10]];
const MEASURE = [
  { unit: "m", what: (w: string, x: string, pl: boolean) => `${w} needs ${x} metre${pl ? "s" : ""} of cloth for a bag. Write this length in metres as a decimal.`, short: "metres" },
  { unit: "₹", what: (w: string, x: string, pl: boolean) => `${w} pays ${pl ? `₹${x}` : `${x} of a rupee`} for ${pl ? "a box of sweets" : "a sweet"}. Write this amount in rupees as a decimal.`, short: "rupees" },
  { unit: "kg", what: (w: string, x: string, _pl: boolean) => `${w} buys ${x} kg of tomatoes. Write this weight in kilograms as a decimal.`, short: "kilograms" },
  { unit: "L", what: (_w: string, x: string, pl: boolean) => `A bottle holds ${x} litre${pl ? "s" : ""} of water. Write this amount in litres as a decimal.`, short: "litres" },
];
const fracDec: Def = {
  id: "aedfrl",
  arity: 3,
  title: "Halves, quarters, fifths and tenths as decimals, with lengths and money",
  competency: DTEN,
  type: "fraction",
  decimals: true,
  mc: true,
  parse: none,
  // [n, k, ctx]: the amount n + SIMPLE[k] of a measure
  reject: ([n, k, c]) => (n < 0 || n > 9 || k < 0 || k >= SIMPLE.length || c < 0 || c >= MEASURE.length ? "A whole number up to 9 and a half, quarter, fifth or tenth, of a length, an amount of money, a weight or a capacity." : null),
  prompt: ([n, k, c]) => {
    const [a, b] = SIMPLE[k];
    const x = n ? `${n} ${a}/${b}` : `${a}/${b}`;
    return MEASURE[c].what(name(n + k), x, n > 0);
  },
  solve: ([n, k]) => {
    const [a, b] = SIMPLE[k];
    const t = (a * 10) / b;
    const steps: Step[] = b === 10 ? [st("tenths", "read", DTEN, [`${a}/10`], a / 10)] : [st("scale", "scale", EQF, [a, b, b === 2 || b === 5 ? 10 / b : 100 / b], b === 4 ? `${(a * 100) / b}/100` : `${t}/10`), st("tenths", "read", DTEN, [b === 4 ? `${(a * 100) / b}/100` : `${t}/10`], a / b)];
    if (n) steps.push(st("whole", "add", DTEN, [n, dec(a / b)], n + a / b));
    return { steps, answer: n + a / b };
  },
  // independent: multiply the decimal by the denominator; it must give the same whole number of parts as n × b + a
  validate: ([n, k], v) => {
    const [a, b] = SIMPLE[k];
    if (typeof v !== "number") return false;
    return Math.abs(v * b - (n * b + a)) < 1e-9;
  },
  bugs: ([n, k]) => {
    const [a, b] = SIMPLE[k];
    const right = n + a / b;
    const list: Bug[] = [
      { id: "digits-as-decimal", kind: "conceptual", competency: DTEN, says: `The top and bottom numbers were written after the point. A fraction is a division: ${a}/${b} means ${a} ÷ ${b}, which is ${dec(a / b)}.`, predict: n + Number(`0.${a}${b}`) },
      { id: "denominator-as-tenths", kind: "conceptual", competency: DTEN, says: `The bottom number was written after the point. ${a}/${b} is not ${a === 1 ? "" : `${a} × `}0.${b}: write ${a}/${b} with a denominator of 10 or 100 first.`, predict: b === 10 ? null : n + a * Number(`0.${b}`) },
      { id: "top-as-tenths", kind: "conceptual", competency: DTEN, says: `The top number was read as tenths. ${a}/${b} is ${a} out of ${b} equal parts, not ${a} tenth${a === 1 ? "" : "s"}.`, predict: b === 10 ? null : n + a / 10 },
    ];
    return list.filter((x) => x.predict !== null && !near(x.predict as number, right));
  },
  distractors: ([n, k]) => {
    const [a, b] = SIMPLE[k];
    const r = n + a / b;
    return [r + 0.1, r - 0.1, r + 1, n + (b - a) / b].filter((x) => x > 0 && !near(x, r));
  },
  variants: () => [],
  stepWhy: (s) => {
    const w: Record<string, string[]> = { "scale": ["Decimals count tenths and hundredths, so we make the bottom 10 or 100 by multiplying top and bottom by the same number."], "tenths": ["The first place after the point is tenths and the second is hundredths."], "whole": ["The whole number part goes in front of the point."] };
    return w[`${s.id}|${s.op}`] ?? w[s.id] ?? w[`${s.id.replace(/\d+$/, "#")}|${s.op}`] ?? w[s.id.replace(/\d+$/, "#")] ?? w["*"] ?? null;
  },
  explain: (s) =>
    s.id === "scale"
      ? `Multiply top and bottom by ${s.inputs[2]}: ${s.inputs[0]}/${s.inputs[1]} = ${s.value}`
      : s.id === "tenths"
        ? `Tenths go in the first place after the point and hundredths in the second: ${s.inputs[0]} = ${dec(s.value as number)}`
        : `Put the whole ${s.inputs[0]} in front: ${s.inputs[0]} + ${s.inputs[1]} = ${dec(s.value as number)}`,
  domain: [[0, 9], [0, SIMPLE.length - 1], [0, MEASURE.length - 1]],
  difficulty: ([n, k]) => (SIMPLE[k][1] === 10 || SIMPLE[k][1] === 2 ? 1 : n ? 3 : 2),
  teach: {
    idea: "A decimal is a fraction with a denominator of 10, 100 or 1000. A half, a quarter, a fifth and a tenth can each be written as tenths or hundredths, and so as a decimal.",
    method: "Make the denominator 10 or 100 by multiplying top and bottom by the same number. Then write the tenths or hundredths after the point, and put any whole number in front.",
    visual: ([, k]) => ({ type: "grid", rows: 10, cols: 10, shaded: Math.round((SIMPLE[k][0] / SIMPLE[k][1]) * 100) }),
    alternatives: [
      { id: "money", title: "Think of money", kind: "conceptual", text: ["One rupee is 100 paise. A half of a rupee is 50 paise, a quarter is 25 paise and a fifth is 20 paise.", "So a half is 0.50 (0.5), a quarter is 0.25 and a fifth is 0.20 (0.2) of a rupee: the same decimals work for metres, kilograms and litres."] },
    ],
  },
  limits: "Halves, quarters, three-quarters, fifths and tenths, with a whole number up to 9; eighths and thousandths are not included.",
};

// ============================================================ like, unlike and equivalent decimals
// [m, s]: m = 0 "which pair are like decimals?", m = 1 "which decimal is equivalent to X?"; s picks the numbers
const places = (t: string) => (t.includes(".") ? t.split(".")[1].length : 0);
const asHundredths = (t: string) => {
  // independent reading: whole part and digits after the point, as a whole number of thousandths
  const [w, f = ""] = t.split(".");
  return Number(w) * 1000 + Number((f + "000").slice(0, 3));
};
function likeChoices([m, s]: number[]): { options: string[]; right: number; base?: string } {
  const w = s % 10;
  const t = 1 + (Math.floor(s / 10) % 9); // 1..9
  const h = 1 + (Math.floor(s / 90) % 9); // 1..9
  const pos = Math.floor(s / 810) % 4;
  if (m === 0) {
    // the like pair has the same number of places; the others do not
    const right = `${w}.${t}${h} and ${w + 1}.${h}${t}`;
    const wrong = [`${w}.${t} and ${w}.${t}${h}`, `${w}.${h}${t} and ${w + 2}.${t}`, `${w + 1}.${t} and ${w}.${h}0${t}`];
    const options = [...wrong];
    options.splice(pos, 0, right);
    return { options, right: pos };
  }
  const base = `${w}.${t}`;
  const right = `${w}.${t}0`;
  const wrong = [`${w}.0${t}`, `${w}.${t}${t}`, `${t}.${w}0`].filter((x) => x !== right && asHundredths(x) !== asHundredths(base));
  const options = wrong.slice(0, 3);
  options.splice(pos, 0, right);
  return { options, right: pos, base };
}
const likeDec: Def = {
  id: "aedlike",
  arity: 2,
  title: "Like, unlike and equivalent decimals",
  competency: DTEN,
  type: "choice",
  parse: none,
  reject: ([m, s]) => (m < 0 || m > 1 || s < 0 || s > 3239 ? "Like decimals or an equivalent decimal, from a set of numbers chosen by the second parameter." : new Set(likeChoices([m, s]).options).size === 4 ? null : "Fewer than four different options."),
  prompt: ([m, s]) => (m === 0 ? "Like decimals have the same number of decimal places. Which pair are like decimals?" : `Which of these decimals is equivalent to ${likeChoices([m, s]).base} (has the same value)?`),
  choices: (p) => likeChoices(p).options,
  solve: (p) => {
    const c = likeChoices(p);
    return {
      steps: [
        st("compare", p[0] === 0 ? "count places" : "compare values", DTEN, [c.options[c.right]], p[0] === 0 ? "same number of places" : "same value"),
        st("pick", "choose the option", DTEN, [c.options[c.right]], c.right),
      ],
      answer: c.right,
    };
  },
  // independent: count the places of each number in each pair, or compare values as whole numbers of thousandths
  validate: (p, v) => {
    const { options, base } = likeChoices(p);
    const ok = options.map((o) => (p[0] === 0 ? (() => { const [x, y] = o.split(" and "); return places(x) === places(y); })() : asHundredths(o) === asHundredths(base!)));
    return typeof v === "number" && ok.filter(Boolean).length === 1 && ok[v] === true;
  },
  bugs: (p) => {
    const { options, right } = likeChoices(p);
    const out: Bug[] = [];
    if (p[0] === 0) {
      const i = options.findIndex((o, k) => k !== right && o.split(" and ")[0].split(".")[0] === o.split(" and ")[1].split(".")[0]);
      if (i >= 0) out.push({ id: "same-whole", kind: "conceptual", competency: DTEN, says: "Like decimals are about the places after the point, not the whole-number part. Count the digits after the point in each number.", predict: i });
    } else {
      const i = options.findIndex((o, k) => k !== right && /\.0/.test(o));
      if (i >= 0) out.push({ id: "zero-inside", kind: "conceptual", competency: DTEN, says: "A zero was put straight after the point, which changes the value: 0.0 something is hundredths, not tenths. A zero added at the END keeps the value the same.", predict: i });
    }
    return out;
  },
  variants: () => [],
  stepWhy: (s) => {
    const w: Record<string, string[]> = { "compare|count places": ["Like decimals have the same number of decimal places."], "compare|compare values": ["A zero at the end of a decimal adds no tenths or hundredths, so it does not change the value."], "pick": ["Each option is checked against what we worked out, and only one of them agrees with it."] };
    return w[`${s.id}|${s.op}`] ?? w[s.id] ?? w[`${s.id.replace(/\d+$/, "#")}|${s.op}`] ?? w[s.id.replace(/\d+$/, "#")] ?? w["*"] ?? null;
  },
  explain: (s) => (s.id === "pick" ? `That is option ${LETTER[Number(s.value)]}, so the answer is ${LETTER[Number(s.value)]}` : s.value === "same value" ? `${s.inputs[0]} has the same value: a zero at the end of a decimal does not change it` : `${s.inputs[0]}: both numbers have the same number of decimal places`),
  domain: [[0, 1], [0, 3239]],
  // the equivalent-decimal question does not use the third digit: keep one choice of it, so no question repeats
  keep: ([m, s]) => m === 0 || Math.floor(s / 90) % 9 === 0,
  cap: 400,
  difficulty: ([m]) => (m === 0 ? 1 : 2),
  teach: {
    idea: "Like decimals have the same number of decimal places (2.35 and 4.71); unlike decimals do not (2.3 and 4.71). Adding zeros at the end of a decimal does not change its value, so 2.3 and 2.30 are equivalent.",
    method: "To compare places, count the digits after the point in each number. To make unlike decimals like, add zeros at the end until they have the same number of places.",
    visual: () => ({ type: "table", head: ["Number", "Digits after the point"], rows: [["2.3", 1], ["2.30", 2], ["4.71", 2]] }),
    alternatives: [
      { id: "money", title: "Think of rupees and paise", kind: "conceptual", text: ["₹2.3 and ₹2.30 are the same money: 2 rupees 30 paise.", "Writing the zero shows the paise in two places, so it is easy to line up with ₹4.71."] },
    ],
  },
  limits: "Decimals with up to three places and one-digit whole parts; ordering and comparing values are asked by other families.",
};

// ============================================================ twin primes
const TWINS: [number, number][] = [[3, 5], [5, 7], [11, 13], [17, 19], [29, 31], [41, 43], [59, 61], [71, 73]];
const NOT_TWIN: [number, number][] = [[7, 9], [13, 15], [23, 25], [19, 21], [31, 33], [37, 39], [47, 49], [53, 55], [61, 63], [73, 75], [79, 81], [89, 91]];
const COUSIN: [number, number][] = [[3, 7], [7, 11], [13, 17], [19, 23], [37, 41], [43, 47], [67, 71], [79, 83]];
const isPrimeByDivision = (n: number) => {
  if (n < 2) return false;
  let count = 0;
  for (let d = 1; d <= n; d++) if (n % d === 0) count++;
  return count === 2;
};
function twinChoices([i, j, k, pos]: number[]): string[] {
  const t = TWINS[i], a = NOT_TWIN[j], b = NOT_TWIN[(j + 5) % NOT_TWIN.length], c = COUSIN[k];
  const wrong = [a, c, b].map(([x, y]) => `${x} and ${y}`);
  const out = [...wrong];
  out.splice(pos, 0, `${t[0]} and ${t[1]}`);
  return out;
}
const twin: Def = {
  id: "agtwin",
  arity: 4,
  title: "Twin primes",
  competency: PRIME,
  type: "choice",
  parse: none,
  reject: ([i, j, k, pos]) => (i < 0 || i >= TWINS.length || j < 0 || j >= NOT_TWIN.length || k < 0 || k >= COUSIN.length || pos < 0 || pos > 3 ? "A twin-prime pair below 100 among three other pairs." : null),
  prompt: () => "Twin primes are two prime numbers that differ by 2. Which pair are twin primes?",
  choices: (p) => twinChoices(p),
  solve: ([i, , , pos]) => ({
    steps: [st("check", "test primes", PRIME, [TWINS[i][0], TWINS[i][1]], "both prime, difference 2"), st("pick", "choose the option", PRIME, [`${TWINS[i][0]} and ${TWINS[i][1]}`], pos)],
    answer: pos,
  }),
  // independent: count the factors of each number by trial division, and check the difference
  validate: (p, v) => {
    const ok = twinChoices(p).map((o) => {
      const [x, y] = o.split(" and ").map(Number);
      return y - x === 2 && isPrimeByDivision(x) && isPrimeByDivision(y);
    });
    return typeof v === "number" && ok.filter(Boolean).length === 1 && ok[v] === true;
  },
  bugs: ([, , , pos]) => {
    const odd = pos === 0 ? 1 : 0; // the first wrong option: two odd numbers 2 apart, one not prime
    const gap4 = pos <= 1 ? 2 : 1; // the cousin pair: both prime but 4 apart
    return [
      { id: "odd-not-prime", kind: "conceptual", competency: PRIME, says: "Both numbers are odd and differ by 2, but one of them is not prime. Check each number: does anything other than 1 and itself divide it?", predict: odd },
      { id: "gap-not-two", kind: "conceptual", competency: PRIME, says: "Both numbers are prime, but they differ by 4, not 2. Twin primes are exactly 2 apart.", predict: gap4 },
    ];
  },
  variants: () => [],
  stepWhy: (s) => {
    const w: Record<string, string[]> = { "check": ["Twin primes are two primes that differ by 2, so both conditions must be checked."], "pick": ["Each option is checked against what we worked out, and only one of them agrees with it."] };
    return w[`${s.id}|${s.op}`] ?? w[s.id] ?? w[`${s.id.replace(/\d+$/, "#")}|${s.op}`] ?? w[s.id.replace(/\d+$/, "#")] ?? w["*"] ?? null;
  },
  explain: (s) => (s.id === "pick" ? `That is option ${LETTER[Number(s.value)]}, so the answer is ${LETTER[Number(s.value)]}` : `${s.inputs[0]} and ${s.inputs[1]} are both prime, and ${s.inputs[1]} − ${s.inputs[0]} = 2`),
  domain: [[0, TWINS.length - 1], [0, NOT_TWIN.length - 1], [0, COUSIN.length - 1], [0, 3]],
  cap: 300,
  difficulty: ([i]) => (TWINS[i][1] < 20 ? 1 : 2),
  teach: {
    idea: "Twin primes are pairs of prime numbers that are 2 apart, such as 11 and 13. Both numbers must be prime, and the gap must be exactly 2.",
    method: "For each pair, first check the gap is 2. Then test each number: try dividing by 2, 3, 5 and 7. If neither number divides, the pair are twin primes.",
    visual: () => ({ type: "table", head: ["Pair", "Gap", "Both prime?"], rows: [["11, 13", 2, "yes"], ["23, 25", 2, "no: 25 = 5 × 5"], ["7, 11", 4, "yes, but 4 apart"]] }),
    alternatives: [
      { id: "number_grid", title: "Find them on a number grid", kind: "procedural", text: ["Circle the prime numbers on a 1 to 100 grid.", "Look for two circled numbers with exactly one number between them: those are twin primes."] },
    ],
  },
  limits: "Pairs below 100, chosen from four options; listing every twin-prime pair in a range is not asked.",
};

// ============================================================ percentage from a hundred grid
const grid: Def = {
  id: "agpgrid",
  arity: 2,
  title: "A percentage read from a shaded hundred grid",
  competency: PCT,
  type: "integer",
  mc: true,
  parse: none,
  // [n, m]: n of the 100 squares are shaded; m = 0 asks the shaded part, m = 1 the part that is not shaded
  reject: ([n, m]) => (n < 1 || n > 99 || (m !== 0 && m !== 1) ? "A hundred grid with between 1 and 99 squares shaded." : null),
  prompt: ([, m]) => `The grid in the picture has 100 equal squares. What percentage of the grid is ${m ? "NOT shaded" : "shaded"}? (Give the number of per cent: for 50% write 50.)`,
  figure: ([n]) => ({ type: "grid", rows: 10, cols: 10, shaded: n }),
  solve: ([n, m]) => ({
    steps: m ? [st("count", "count", PCT, [100], n), st("rest", "subtract", PCT, [100, n], 100 - n)] : [st("count", "count", PCT, [100], n)],
    answer: m ? 100 - n : n,
  }),
  // independent: count shaded squares row by row (10 in a full row), then compare with the answer
  validate: ([n, m], v) => {
    if (typeof v !== "number") return false;
    let shaded = 0;
    for (let r = 0; r < 10; r++) for (let c = 0; c < 10; c++) if (r * 10 + c < n) shaded++;
    return v === (m ? 100 - shaded : shaded);
  },
  bugs: ([n, m]) => {
    const list: Bug[] = [
      { id: "other-part", kind: "conceptual", competency: PCT, says: m ? "That is the part that IS shaded. The question asks for the part that is not shaded: 100 take away the shaded squares." : "That is the part that is NOT shaded. Count the shaded squares: each one is 1% of the grid.", predict: m ? n : 100 - n },
      { id: "rows-only", kind: "procedural", competency: PCT, says: "Only the full rows were counted. Count the squares in the part-filled row too: each square is 1%.", predict: n % 10 && n > 10 ? (m ? 100 - Math.floor(n / 10) * 10 : Math.floor(n / 10) * 10) : null },
    ];
    return list.filter((b) => b.predict !== null && b.predict !== (m ? 100 - n : n));
  },
  distractors: ([n, m]) => {
    const r = m ? 100 - n : n;
    return [r + 10, r - 10, r + 1, r - 1].filter((x) => x > 0 && x < 100 && x !== r);
  },
  variants: () => [],
  stepWhy: (s) => {
    const w: Record<string, string[]> = { "count": ["The grid has 100 squares, and per cent means out of 100, so each square is 1%."], "rest": ["The whole grid is 100%, so the part not shaded is 100% minus the shaded part."] };
    return w[`${s.id}|${s.op}`] ?? w[s.id] ?? w[`${s.id.replace(/\d+$/, "#")}|${s.op}`] ?? w[s.id.replace(/\d+$/, "#")] ?? w["*"] ?? null;
  },
  explain: (s) => (s.id === "count" ? `${s.value} of the 100 squares are shaded, so ${s.value}% is shaded` : `${s.inputs[0]} − ${s.inputs[1]} = ${s.value}, so ${s.value}% is not shaded`),
  domain: [[1, 99], [0, 1]],
  difficulty: ([n, m]) => (n % 10 === 0 && !m ? 1 : m ? 3 : 2),
  teach: {
    idea: "A hundred grid has 100 equal squares, so each square is one hundredth, or 1%, of the whole grid.",
    method: "Count the shaded squares: count the full rows of 10 first, then the squares in the part-filled row. That number is the percentage. The part not shaded is 100 take away that.",
    visual: ([n]) => ({ type: "grid", rows: 10, cols: 10, shaded: n }),
    alternatives: [
      { id: "fraction_first", title: "Write the fraction first", kind: "procedural", text: ["Write the shaded part as a fraction of 100: for 37 squares, 37/100.", "Per cent means out of a hundred, so 37/100 is 37%."] },
    ],
  },
  limits: "Grids of 100 squares only; grids of other sizes and shaded shapes are not included.",
};

// ============================================================ a pattern that changes in two ways at once
const SHAPES = ["circle", "square", "triangle", "star"];
const COLOURS = ["red", "blue", "green", "yellow"];
/** [a, b, sh, co, len]: a shapes repeating, b colours repeating (a ≠ b), offsets sh and co into the lists, len items shown */
const pick = (list: string[], count: number, off: number) => Array.from({ length: count }, (_, i) => list[(off + i) % list.length]);
function pattern([a, b, sh, co, len]: number[]) {
  const shapes = pick(SHAPES, a, sh), colours = pick(COLOURS, b, co);
  const items = Array.from({ length: len }, (_, i) => `${colours[i % b]} ${shapes[i % a]}`);
  const next = `${colours[len % b]} ${shapes[len % a]}`;
  const wrongShape = `${colours[len % b]} ${shapes[(len + 1) % a]}`;
  const wrongColour = `${colours[(len + 1) % b]} ${shapes[len % a]}`;
  const bothWrong = `${colours[(len + 1) % b]} ${shapes[(len + 1) % a]}`;
  const pos = (a + b + sh + co + len) % 4;
  const options = [wrongShape, wrongColour, bothWrong];
  options.splice(pos, 0, next);
  return { items, next, options, pos, wrongShape, wrongColour };
}
const pat2: Def = {
  id: "aapat2",
  arity: 5,
  title: "A pattern that changes in two ways at once",
  competency: REP,
  type: "choice",
  parse: none,
  reject: ([a, b, sh, co, len]) => (a < 2 || a > 3 || b < 2 || b > 3 || a === b || sh < 0 || sh > 3 || co < 0 || co > 3 || len < 7 || len > 10 ? "A shape that repeats every 2 or 3 and a colour that repeats every 3 or 2, with 7 to 10 items shown." : new Set(pattern([a, b, sh, co, len]).options).size === 4 ? null : "Fewer than four different options."),
  prompt: (p) => `In this pattern both the shape and the colour change, each in its own repeat: ${pattern(p).items.join(", ")}, … What comes next?`,
  choices: (p) => pattern(p).options,
  solve: (p) => {
    const [a, b] = p;
    const x = pattern(p);
    return {
      steps: [
        st("shapes", "find the repeat", REP, [a], `the shape repeats every ${a}`),
        st("colours", "find the repeat", REP, [b], `the colour repeats every ${b}`),
        st("next", "continue", REP, [x.next], x.next),
        st("pick", "choose the option", REP, [x.next], x.pos),
      ],
      answer: x.pos,
    };
  },
  // independent: walk along the pattern one item at a time, stepping a shape pointer and a colour pointer separately
  validate: (p, v) => {
    const [a, b, sh, co, len] = p;
    const shapes = pick(SHAPES, a, sh), colours = pick(COLOURS, b, co);
    let s = 0, c = 0;
    for (let i = 0; i < len; i++) {
      s = s + 1 === a ? 0 : s + 1;
      c = c + 1 === b ? 0 : c + 1;
    }
    const want = `${colours[c]} ${shapes[s]}`;
    const ops = pattern(p).options;
    return typeof v === "number" && ops.filter((o) => o === want).length === 1 && ops[v] === want;
  },
  bugs: (p) => {
    const x = pattern(p);
    return [
      { id: "colour-only", kind: "conceptual", competency: REP, says: "The colour is right but the shape is not. Follow the shapes on their own: they repeat in their own group, which is a different length from the colours'.", predict: x.options.indexOf(x.wrongShape) },
      { id: "shape-only", kind: "conceptual", competency: REP, says: "The shape is right but the colour is not. Follow the colours on their own: they repeat in their own group, which is a different length from the shapes'.", predict: x.options.indexOf(x.wrongColour) },
    ];
  },
  variants: () => [],
  stepWhy: (s) => {
    const w: Record<string, string[]> = { "shapes": ["A pattern can repeat its shapes and its colours on different cycles, so we find each repeat separately."], "colours": ["A pattern can repeat its shapes and its colours on different cycles, so we find each repeat separately."], "next": ["Continuing both repeats tells the next shape and the next colour."], "pick": ["Each option is checked against what we worked out, and only one of them agrees with it."] };
    return w[`${s.id}|${s.op}`] ?? w[s.id] ?? w[`${s.id.replace(/\d+$/, "#")}|${s.op}`] ?? w[s.id.replace(/\d+$/, "#")] ?? w["*"] ?? null;
  },
  explain: (s) => (s.id === "pick" ? `That is option ${LETTER[Number(s.value)]}, so the answer is ${LETTER[Number(s.value)]}` : s.id === "next" ? `So the next item is a ${s.value}` : String(s.value).replace(/^the/, "The")),
  domain: [[2, 3], [2, 3], [0, 3], [0, 3], [7, 10]],
  // a pattern changing in two ways at once is Class 5 work, though repeating patterns start in Class 1
  grade: () => 5,
  difficulty: ([, , , , len]) => (len <= 8 ? 2 : 3),
  teach: {
    idea: "A pattern can change in two ways at once: the shapes can repeat in one group while the colours repeat in another group of a different length.",
    method: "Look at the shapes on their own and find how often they repeat. Then look at the colours on their own. Continue each one separately, then put the next shape and the next colour together.",
    visual: () => ({ type: "table", head: ["Item", "1", "2", "3", "4", "5", "6"], rows: [["Shape", "circle", "square", "circle", "square", "circle", "square"], ["Colour", "red", "blue", "green", "red", "blue", "green"]] }),
    alternatives: [
      { id: "two_rows", title: "Split it into two rows", kind: "procedural", text: ["Write the shapes in one row and the colours in another row underneath.", "Each row is now a simple repeating pattern. Continue both rows by one, and read the new item from top to bottom."] },
    ],
  },
  limits: "Two attributes (shape and colour) with repeats of 2 and 3; patterns with three changing attributes or growing patterns are asked elsewhere.",
};

export const B28: Def[] = [fword, fracDec, likeDec, twin, grid, pat2];
