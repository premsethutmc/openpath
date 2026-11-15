/**
 * Families b29 (families@2): ICSE Class 10 commercial mathematics and ogives, which no family asked yet (icse10-gaps@1).
 *   aqgst    GST on a bill (amount paid, CGST), and the price before GST from the amount paid  MATH.number.gst
 *   aqrd     interest and maturity value of a recurring deposit                                 MATH.number.recurring-deposit
 *   aqshare  dividend income, money invested and percentage return on shares                    MATH.number.shares-dividends
 *   aqogive  cumulative frequency, median, quartiles and interquartile range from a less-than ogive  MATH.statistics.ogive-quartiles
 * All wording and contexts are OpenPath's own; nothing is taken from a textbook.
 */
import type { Bug, Def, Step, Value } from "../family-kit";
import { near } from "../family-kit";

const GST = "MATH.number.gst";
const RD = "MATH.number.recurring-deposit";
const SH = "MATH.number.shares-dividends";
const OG = "MATH.statistics.ogive-quartiles";
const PCT = "MATH.number.percentage";
const PL = "MATH.number.profit-loss";
const none = () => null;
const NAMES = ["Anu", "Ravi", "Meena", "Arjun", "Kavya", "Imran", "Divya", "Selvi", "Karthik", "Priya"];
const name = (k: number) => NAMES[((k % NAMES.length) + NAMES.length) % NAMES.length];
const st = (id: string, op: string, competency: string, inputs: (number | string)[], value: Value): Step => ({ id, op, competency, inputs, value });
const money = (x: number) => (Number.isInteger(x) ? String(x) : (Math.round(x * 100) / 100).toFixed(2));
const keepBugs = (list: Bug[], right: number) => list.filter((b) => b.predict !== null && typeof b.predict === "number" && Number.isFinite(b.predict) && b.predict > 0 && !near(b.predict, right));

// ============================================================ GST
const DISC = [0, 5, 10, 15, 20];
const RATE = [5, 12, 18, 28];
const ITEMS = ["an air cooler", "a mixer grinder", "a study table", "a ceiling fan", "a school bag", "a pressure cooker", "a pair of shoes", "a wall clock"];
// [L, d, r, m]: list price 100·L rupees, discount DISC[d] %, GST RATE[r] % (CGST and SGST equal halves);
// m = 0 the amount paid, m = 1 the CGST, m = 2 the price before GST from the amount paid (no discount)
const gstSale = ([L, d]: number[]) => (100 * L * (100 - DISC[d])) / 100;
const gst: Def = {
  id: "aqgst",
  arity: 4,
  title: "GST on a bill, and the price before GST",
  competency: GST,
  type: "fraction",
  decimals: true,
  mc: true,
  parse: none,
  reject: ([L, d, r, m]) => (L < 1 || L > 40 || d < 0 || d >= DISC.length || r < 0 || r >= RATE.length || m < 0 || m > 2 || (m === 2 && d !== 0) ? "A list price of ₹100 to ₹4000, a discount of 0 to 20%, GST of 5, 12, 18 or 28%; the price before GST is asked without a discount." : null),
  prompt: ([L, d, r, m]) => {
    const item = ITEMS[(L + r) % ITEMS.length], who = name(L + d + r);
    if (m === 2) return `${who} paid ₹${money((100 * L * (100 + RATE[r])) / 100)} for ${item}, including GST at ${RATE[r]}%. What was the price of the ${item.replace(/^an? /, "")} before GST, in rupees?`;
    const sale = DISC[d] ? `${item} with a list price of ₹${100 * L} at a discount of ${DISC[d]}%` : `${item} at its list price of ₹${100 * L}`;
    return `A shop in ${who}'s town sells ${sale}. GST is charged at ${RATE[r]}% on the ${DISC[d] ? "price after discount" : "selling price"}, shared equally as CGST and SGST because the sale is within the state. ${m ? "How much CGST is charged, in rupees?" : `How much does ${who} pay for it, in rupees?`}`;
  },
  solve: ([L, d, r, m]) => {
    const R = RATE[r];
    if (m === 2) {
      const A = (100 * L * (100 + R)) / 100;
      return { steps: [st("total-percent", "add", GST, [100, R], 100 + R), st("unitary", "divide", GST, [A, 100 + R, 100], 100 * L)], answer: 100 * L };
    }
    const S = gstSale([L, d]);
    const tax = (S * R) / 100;
    const steps: Step[] = [];
    if (DISC[d]) steps.push(st("discount", "percentage", PL, [100 * L, DISC[d]], S));
    steps.push(st("tax", "percentage", GST, [S, R], tax));
    if (m === 1) {
      steps.push(st("half", "halve", GST, [tax], tax / 2));
      return { steps, answer: tax / 2 };
    }
    steps.push(st("pay", "add", GST, [S, tax], S + tax));
    return { steps, answer: S + tax };
  },
  // independent: everything in whole paise, scaled so no rounding is needed
  validate: ([L, d, r, m], v) => {
    if (typeof v !== "number") return false;
    const R = RATE[r], D = DISC[d];
    if (m === 2) return Math.abs(v * (100 + R) - 100 * L * (100 + R)) < 1e-6;
    const base = 100 * L * (100 - D); // the sale price × 100
    return m === 1 ? Math.abs(v * 20000 - base * R) < 1e-6 : Math.abs(v * 10000 - base * (100 + R)) < 1e-6;
  },
  bugs: ([L, d, r, m]) => {
    const R = RATE[r], S = gstSale([L, d]);
    if (m === 2) {
      const A = (100 * L * (100 + R)) / 100;
      return keepBugs([{ id: "take-off-percent", kind: "conceptual", competency: GST, says: `${R}% of the amount paid was taken away. The GST was ${R}% of the price BEFORE tax, so the amount paid is ${100 + R}% of that price: divide by ${100 + R} and multiply by 100.`, predict: A - (A * R) / 100 }], 100 * L);
    }
    const right = m === 1 ? (S * R) / 200 : S + (S * R) / 100;
    return keepBugs(
      m === 1
        ? [{ id: "whole-gst", kind: "conceptual", competency: GST, says: "That is the whole GST. CGST is half of it (the other half is SGST).", predict: (S * R) / 100 }, { id: "tax-on-list", kind: "procedural", competency: GST, says: "The tax was worked out on the list price. GST is charged on the price after the discount.", predict: DISC[d] ? (100 * L * R) / 200 : null }]
        : [
            { id: "tax-on-list", kind: "procedural", competency: GST, says: "The tax was worked out on the list price. GST is charged on the price after the discount.", predict: DISC[d] ? S + (100 * L * R) / 100 : null },
            { id: "no-discount", kind: "procedural", competency: PL, says: "The discount was left out. Take the discount off the list price first, then add GST.", predict: DISC[d] ? 100 * L + (100 * L * R) / 100 : null },
            { id: "half-tax", kind: "conceptual", competency: GST, says: "Only half the GST was added. The buyer pays both CGST and SGST.", predict: S + (S * R) / 200 },
          ],
      right,
    );
  },
  distractors: ([L, d, r, m]) => {
    const R = RATE[r], S = gstSale([L, d]);
    const right = m === 2 ? 100 * L : m === 1 ? (S * R) / 200 : S + (S * R) / 100;
    return [right + 10, right - 10, right * 1.1, right + 100].filter((x) => x > 0 && !near(x, right));
  },
  variants: () => [],
  explain: (s) =>
    s.id === "discount"
      ? `Price after a ${s.inputs[1]}% discount: ₹${s.inputs[0]} − ${s.inputs[1]}% of ₹${s.inputs[0]} = ₹${money(s.value as number)}`
      : s.id === "tax"
        ? `GST = ${s.inputs[1]}% of ₹${money(s.inputs[0] as number)} = ₹${money(s.value as number)}`
        : s.id === "half"
          ? `CGST is half of the GST: ₹${money(s.inputs[0] as number)} ÷ 2 = ₹${money(s.value as number)}`
          : s.id === "pay"
            ? `Amount paid = ₹${money(s.inputs[0] as number)} + ₹${money(s.inputs[1] as number)} = ₹${money(s.value as number)}`
            : s.id === "total-percent"
              ? `The amount paid is 100% + ${s.inputs[1]}% = ${s.value}% of the price before GST`
              : `Price before GST = ₹${money(s.inputs[0] as number)} × 100 ÷ ${s.inputs[1]} = ₹${s.value}`,
  domain: [[1, 40], [0, DISC.length - 1], [0, RATE.length - 1], [0, 2]],
  keep: ([, d, , m]) => m !== 2 || d === 0,
  cap: 400,
  difficulty: ([, d, , m]) => (m === 2 ? 3 : d ? 2 : 1),
  teach: {
    idea: "GST is a tax on the price at which goods are sold. Within a state it is split into two equal halves, CGST (for the central government) and SGST (for the state).",
    method: "Take any discount off the list price first. GST is the rate per cent of that price; CGST and SGST are each half of it. The buyer pays the price plus the whole GST. To go back from the amount paid, divide it by (100 + rate) and multiply by 100.",
    visual: ([L, d, r]) => ({ type: "table", head: ["", "₹"], rows: [["List price", 100 * L], ["Discount", money(100 * L - gstSale([L, d]))], ["Price after discount", money(gstSale([L, d]))], [`CGST (${RATE[r] / 2}%)`, money((gstSale([L, d]) * RATE[r]) / 200)], [`SGST (${RATE[r] / 2}%)`, money((gstSale([L, d]) * RATE[r]) / 200)]] }),
    alternatives: [
      { id: "bill", title: "Read it like a bill", kind: "procedural", text: ["A GST bill lists the price, then CGST and SGST on separate lines, each at half the rate.", "Add the three lines to get the total. For the price before tax, remember the total is (100 + rate)% of it."] },
    ],
  },
  limits: "Single items, one GST rate, a sale within the state (CGST and SGST); trading chains and input tax credit are not included.",
};

// ============================================================ recurring deposit
const MONTHS = [6, 12, 18, 24, 36];
// [P, n, r, m]: 100·P rupees a month for MONTHS[n] months at r % a year simple interest; m = 0 interest, m = 1 maturity value
const rdInterest = ([P, n, r]: number[]) => {
  const N = MONTHS[n];
  return (100 * P * ((N * (N + 1)) / 2) * r) / 1200;
};
const rd: Def = {
  id: "aqrd",
  arity: 4,
  title: "Interest and maturity value of a recurring deposit",
  competency: RD,
  type: "fraction",
  decimals: true,
  mc: true,
  parse: none,
  reject: ([P, n, r, m]) => (P < 1 || P > 20 || n < 0 || n >= MONTHS.length || r < 4 || r > 10 || (m !== 0 && m !== 1) ? "₹100 to ₹2000 a month, for 6 to 36 months, at 4% to 10% a year." : null),
  prompt: ([P, n, r, m]) => `${name(P + n + r)} deposits ₹${100 * P} every month in a recurring deposit account for ${MONTHS[n]} months. The bank pays simple interest at ${r}% per year. ${m ? "What is the maturity value (the money paid out at the end), in rupees?" : "How much interest does the account earn, in rupees?"}`,
  solve: ([P, n, r, m]) => {
    const N = MONTHS[n], I = rdInterest([P, n, r]);
    const steps: Step[] = [st("months", "sum", RD, [N], (N * (N + 1)) / 2), st("interest", "multiply", RD, [100 * P, (N * (N + 1)) / 2, r], I)];
    if (m) steps.push(st("maturity", "add", RD, [100 * P * N, I], 100 * P * N + I));
    return { steps, answer: m ? 100 * P * N + I : I };
  },
  // independent: add up the interest month by month on the balance standing in the account
  validate: ([P, n, r, m], v) => {
    if (typeof v !== "number") return false;
    const N = MONTHS[n];
    let interest = 0, balance = 0;
    for (let k = 1; k <= N; k++) {
      balance += 100 * P;
      interest += (balance * r) / 1200;
    }
    return near(v, m ? balance + interest : interest);
  },
  bugs: ([P, n, r, m]) => {
    const N = MONTHS[n], I = rdInterest([P, n, r]);
    const right = m ? 100 * P * N + I : I;
    const flat = (100 * P * N * N * r) / 1200; // the whole sum for the whole time
    const noTwelve = (100 * P * ((N * (N + 1)) / 2) * r) / 100;
    return keepBugs(
      m
        ? [
            { id: "interest-only", kind: "conceptual", competency: RD, says: "That is only the interest. The maturity value is all the money deposited plus the interest.", predict: I },
            { id: "one-deposit", kind: "procedural", competency: RD, says: `Only one month's deposit was added to the interest. ${N} deposits of ₹${100 * P} were made.`, predict: 100 * P + I },
          ]
        : [
            { id: "whole-sum-whole-time", kind: "conceptual", competency: RD, says: "Interest was worked out as if all the money was in the bank for the whole time. Each deposit stays for fewer months: use the sum of the months, N(N + 1)/2.", predict: flat },
            { id: "years-not-months", kind: "procedural", competency: RD, says: "The rate is per year but the time is counted in months: divide by 12.", predict: noTwelve },
          ],
      right,
    );
  },
  distractors: (p) => {
    const I = rdInterest(p), N = MONTHS[p[1]];
    const right = p[3] ? 100 * p[0] * N + I : I;
    return [right + 100, right - 50, right * 2, right + 12].filter((x) => x > 0 && !near(x, right));
  },
  variants: () => [],
  explain: (s) =>
    s.id === "months"
      ? `Money is in the account for ${s.inputs[0]} + ${Number(s.inputs[0]) - 1} + … + 1 = ${s.inputs[0]} × ${Number(s.inputs[0]) + 1} ÷ 2 = ${s.value} month-deposits`
      : s.id === "interest"
        ? `Interest = ₹${s.inputs[0]} × ${s.inputs[1]} × ${s.inputs[2]}/100 × 1/12 = ₹${money(s.value as number)}`
        : `Maturity value = ₹${s.inputs[0]} deposited + ₹${money(s.inputs[1] as number)} interest = ₹${money(s.value as number)}`,
  domain: [[1, 20], [0, MONTHS.length - 1], [4, 10], [0, 1]],
  cap: 400,
  difficulty: ([, n, , m]) => (n <= 1 ? 1 : m ? 3 : 2),
  teach: {
    idea: "In a recurring deposit the same amount is paid in every month. The first deposit earns interest for all N months, the last for only one month, so the money earns interest as if one deposit stayed for N(N + 1)/2 months.",
    method: "Interest I = P × N(N + 1)/2 × r/100 × 1/12, where P is the monthly deposit and r the yearly rate. The maturity value is P × N + I.",
    visual: ([P, n]) => ({ type: "table", head: ["Month", "Deposit (₹)", "Months it earns interest"], rows: [[1, 100 * P, MONTHS[n]], [2, 100 * P, MONTHS[n] - 1], ["…", "…", "…"], [MONTHS[n], 100 * P, 1]] }),
    alternatives: [
      { id: "add_months", title: "Add the months up", kind: "procedural", text: ["Write how many months each deposit stays in the bank: N, N − 1, …, 2, 1.", "Their total is N(N + 1)/2. Interest is simple interest on one deposit for that many months."] },
    ],
  },
  limits: "Whole-rupee monthly deposits for 6 to 36 months at whole-number rates; finding the monthly deposit or the rate from the maturity value is not included.",
};

// ============================================================ shares and dividends
const FV = [10, 20, 50, 100];
const MULT = [8, 9, 11, 12, 15, 20]; // market value = face value × MULT/10
const DIV = [5, 6, 8, 10, 12, 15];
// [f, k, N, d, m]: N·10 shares of face value FV[f] at market value FV[f]·MULT[k]/10, dividend DIV[d] %;
// m = 0 the annual dividend income, m = 1 the money invested, m = 2 the percentage return on the investment
const mv = (f: number, k: number) => (FV[f] * MULT[k]) / 10;
const terminates = (num: number, den: number) => {
  let g = den;
  for (let a = num, b = den; b; [a, b] = [b, a % b]) g = a;
  let q = den / g;
  while (q % 2 === 0) q /= 2;
  while (q % 5 === 0) q /= 5;
  return q === 1;
};
const shares: Def = {
  id: "aqshare",
  arity: 5,
  title: "Dividend, investment and return on shares",
  competency: SH,
  type: "fraction",
  decimals: true,
  mc: true,
  parse: none,
  reject: ([f, k, N, d, m]) =>
    f < 0 || f >= FV.length || k < 0 || k >= MULT.length || N < 1 || N > 50 || d < 0 || d >= DIV.length || m < 0 || m > 2
      ? "10 to 500 shares of face value ₹10, ₹20, ₹50 or ₹100, bought at a premium or a discount, with a dividend of 5% to 15%."
      : m === 2 && !terminates(FV[f] * DIV[d], mv(f, k))
        ? "The return is asked only when it is a terminating decimal."
        : null,
  prompt: ([f, k, N, d, m]) => {
    const who = name(f + k + N + d), M = mv(f, k);
    const buy = `${who} buys ${10 * N} shares of face value ₹${FV[f]} each, at ₹${money(M)} each${M > FV[f] ? " (at a premium)" : " (at a discount)"}. The company pays a dividend of ${DIV[d]}% (on the face value).`;
    return `${buy} ${m === 0 ? `What is ${who}'s yearly income from the dividend, in rupees?` : m === 1 ? `How much money does ${who} invest, in rupees? (No brokerage.)` : `What percentage return does ${who} get on the money invested? (Give the number of per cent.)`}`;
  },
  solve: ([f, k, N, d, m]) => {
    const n = 10 * N, F = FV[f], M = mv(f, k), D = DIV[d];
    if (m === 1) return { steps: [st("invest", "multiply", SH, [n, M], n * M)], answer: n * M };
    const per = (F * D) / 100;
    if (m === 0) return { steps: [st("per-share", "percentage", SH, [F, D], per), st("income", "multiply", SH, [n, per], n * per)], answer: n * per };
    return { steps: [st("per-share", "percentage", SH, [F, D], per), st("return", "divide", SH, [per, M], (per / M) * 100)], answer: (per / M) * 100 };
  },
  // independent: total income over total money invested, worked share by share
  validate: ([f, k, N, d, m], v) => {
    if (typeof v !== "number") return false;
    const F = FV[f], M = mv(f, k), D = DIV[d];
    let income = 0, invested = 0;
    for (let i = 0; i < 10 * N; i++) {
      income += (F * D) / 100;
      invested += M;
    }
    return near(v, m === 0 ? income : m === 1 ? invested : (income * 100) / invested);
  },
  bugs: ([f, k, N, d, m]) => {
    const n = 10 * N, F = FV[f], M = mv(f, k), D = DIV[d];
    const right = m === 0 ? (n * F * D) / 100 : m === 1 ? n * M : (F * D * 100) / (100 * M);
    const list: Bug[] =
      m === 0
        ? [{ id: "dividend-on-market", kind: "conceptual", competency: SH, says: "The dividend was worked out on the market value. A dividend is always a percentage of the FACE value.", predict: (n * M * D) / 100 }]
        : m === 1
          ? [{ id: "face-value", kind: "conceptual", competency: SH, says: "The shares were costed at their face value. You pay the MARKET value for each share.", predict: n * F }]
          : [
              { id: "rate-is-return", kind: "conceptual", competency: SH, says: `The dividend rate was given as the return. The ${D}% is on the face value; the return compares the income with what was PAID (the market value).`, predict: D },
              { id: "upside-down", kind: "procedural", competency: PCT, says: "The fraction was turned upside down. Return = income ÷ money invested × 100.", predict: ((100 * M) / ((F * D) / 100)) / 100 },
            ];
    return keepBugs(list, right);
  },
  distractors: ([f, k, N, d, m]) => {
    const n = 10 * N, F = FV[f], M = mv(f, k), D = DIV[d];
    const right = m === 0 ? (n * F * D) / 100 : m === 1 ? n * M : (F * D) / M;
    return [right + 1, right * 2, right / 2, right + 10].filter((x) => x > 0 && !near(x, right));
  },
  variants: () => [],
  explain: (s) =>
    s.id === "invest"
      ? `Money invested = ${s.inputs[0]} × ₹${money(s.inputs[1] as number)} = ₹${money(s.value as number)}`
      : s.id === "per-share"
        ? `Dividend on one share = ${s.inputs[1]}% of ₹${s.inputs[0]} = ₹${money(s.value as number)}`
        : s.id === "income"
          ? `Income = ${s.inputs[0]} × ₹${money(s.inputs[1] as number)} = ₹${money(s.value as number)}`
          : `Return = ₹${money(s.inputs[0] as number)} ÷ ₹${money(s.inputs[1] as number)} × 100 = ${money(s.value as number)}%`,
  domain: [[0, FV.length - 1], [0, MULT.length - 1], [1, 50], [0, DIV.length - 1], [0, 2]],
  cap: 400,
  difficulty: ([, , , , m]) => (m === 1 ? 1 : m === 0 ? 2 : 3),
  teach: {
    idea: "A share has a face value (printed on it) and a market value (what it costs to buy today). A dividend is a percentage of the face value, but the money you pay is the market value.",
    method: "Investment = number of shares × market value. Income = number of shares × dividend% of the face value. Return % = income ÷ investment × 100 (for one share: dividend on the face value ÷ market value × 100).",
    visual: ([f, k, , d]) => ({ type: "table", head: ["", "One share"], rows: [["Face value", `₹${FV[f]}`], ["Market value", `₹${money(mv(f, k))}`], [`Dividend (${DIV[d]}% of face value)`, `₹${money((FV[f] * DIV[d]) / 100)}`]] }),
    alternatives: [
      { id: "one_share", title: "Think about one share", kind: "procedural", text: ["Work out what one share costs and what one share earns in a year.", "Multiply by the number of shares for the totals; the return is the same for one share as for all of them."] },
    ],
  },
  limits: "No brokerage and no fractional shares (as the syllabus says); selling and switching shares are not included.",
};

// ============================================================ ogive: cumulative frequency, median and quartiles
const WIDTH = [5, 10, 20];
// [w, s, seed, m]: five classes of width WIDTH[w] starting at s·WIDTH[w]; frequencies from seed; m = 0 a cumulative
// frequency, 1 Q1, 2 the median, 3 Q3, 4 the interquartile range (each by linear reading along the less-than ogive)
const freqs = (seed: number) => [0, 1, 2, 3, 4].map((i) => 2 + ((seed * (i + 3) * 7 + i * i * 5) % 11));
const classes = ([w, s]: number[]) => [0, 1, 2, 3, 4].map((i) => [(s + i) * WIDTH[w], (s + i + 1) * WIDTH[w]]);
function quartile(p: number[], q: number) {
  const f = freqs(p[2]), c = classes(p), n = f.reduce((a, b) => a + b, 0), pos = (q * n) / 4;
  let cf = 0;
  for (let i = 0; i < 5; i++) {
    if (cf + f[i] >= pos) return { value: c[i][0] + ((pos - cf) / f[i]) * (c[i][1] - c[i][0]), i, cf, pos };
    cf += f[i];
  }
  throw new Error("unreachable");
}
const ogive: Def = {
  id: "aqogive",
  arity: 4,
  title: "Cumulative frequency, median and quartiles from a less-than ogive",
  competency: OG,
  type: "fraction",
  decimals: true,
  mc: true,
  parse: none,
  reject: (p) => {
    const [w, s, seed, m] = p;
    if (w < 0 || w >= WIDTH.length || s < 0 || s > 4 || seed < 0 || seed > 60 || m < 0 || m > 4) return "Five classes of width 5, 10 or 20 with frequencies from 2 to 12.";
    const n = freqs(seed).reduce((a, b) => a + b, 0);
    return n % 4 === 0 ? null : "The total frequency must be a multiple of 4, so the quartile positions are whole numbers.";
  },
  prompt: (p) => {
    const m = p[3], c = classes(p);
    const ask = m === 0 ? `How many students scored less than ${c[2][1]} marks? (Read it from the cumulative frequencies.)` : m === 4 ? "Estimate the interquartile range (Q3 − Q1)." : `Estimate the ${m === 2 ? "median" : m === 1 ? "lower quartile (Q1)" : "upper quartile (Q3)"}.`;
    return `The table in the picture shows the marks of a group of students. A less-than ogive is drawn by plotting each cumulative frequency at the upper limit of its class and joining the points with straight lines, starting from (${c[0][0]}, 0). ${ask} Read the position as n/4, n/2 or 3n/4 of the total n, along the straight line between the points.`;
  },
  figure: (p) => {
    const f = freqs(p[2]), c = classes(p);
    return { type: "table", head: ["Marks", "Number of students"], rows: c.map(([a, b], i) => [`${a} – ${b}`, f[i]]) };
  },
  solve: (p) => {
    const m = p[3], f = freqs(p[2]), c = classes(p);
    const n = f.reduce((a, b) => a + b, 0);
    if (m === 0) return { steps: [st("cumulate", "add", OG, f.slice(0, 3), f[0] + f[1] + f[2])], answer: f[0] + f[1] + f[2] };
    const steps: Step[] = [st("total", "add", OG, f, n)];
    const read = (q: number) => {
      const r = quartile(p, q);
      steps.push(st(`q${q}`, "interpolate", OG, [r.pos, c[r.i][0], r.cf, f[r.i], c[r.i][1] - c[r.i][0]], r.value));
      return r.value;
    };
    if (m === 4) {
      const a = read(1), b = read(3);
      steps.push(st("iqr", "subtract", OG, [b, a], b - a));
      return { steps, answer: b - a };
    }
    return { steps, answer: read(m) };
  },
  // independent: build the ogive's points and walk along its straight segments to where it reaches the position
  validate: (p, v) => {
    if (typeof v !== "number") return false;
    const m = p[3], f = freqs(p[2]), c = classes(p);
    const pts: [number, number][] = [[c[0][0], 0]];
    let run = 0;
    f.forEach((x, i) => {
      run += x;
      pts.push([c[i][1], run]);
    });
    if (m === 0) return v === pts[3][1];
    const at = (y: number) => {
      for (let i = 1; i < pts.length; i++) if (pts[i][1] >= y) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; return x0 + ((y - y0) * (x1 - x0)) / (y1 - y0); }
      return NaN;
    };
    const total = pts[pts.length - 1][1];
    return near(v, m === 4 ? at((3 * total) / 4) - at(total / 4) : at((m * total) / 4));
  },
  bugs: (p) => {
    const m = p[3], f = freqs(p[2]), c = classes(p);
    if (m === 0) return keepBugs([{ id: "one-class", kind: "conceptual", competency: OG, says: "That is the frequency of one class. A cumulative frequency adds up every class below the limit.", predict: f[2] }], f[0] + f[1] + f[2]);
    const right = m === 4 ? quartile(p, 3).value - quartile(p, 1).value : quartile(p, m).value;
    const r = quartile(p, m === 4 ? 2 : m);
    const n = f.reduce((a, b) => a + b, 0);
    const list: Bug[] = [
      { id: "class-middle", kind: "procedural", competency: OG, says: "The middle of the class was given. Read along the ogive: how far into the class the position lies decides the value.", predict: m === 4 ? null : (c[r.i][0] + c[r.i][1]) / 2 },
      { id: "plus-one", kind: "conceptual", competency: OG, says: `The position was taken as (n + 1)/2 or (n + 1)/4. For an ogive of grouped data use n/2 for the median and n/4, 3n/4 for the quartiles (n = ${n}).`, predict: m === 2 ? (() => { const pos = (n + 1) / 2; let cf = 0; for (let i = 0; i < 5; i++) { if (cf + f[i] >= pos) return c[i][0] + ((pos - cf) / f[i]) * (c[i][1] - c[i][0]); cf += f[i]; } return null; })() : null },
      { id: "q3-only", kind: "procedural", competency: OG, says: "That is Q3 itself. The interquartile range is Q3 − Q1.", predict: m === 4 ? quartile(p, 3).value : null },
    ];
    return keepBugs(list, right);
  },
  distractors: (p) => {
    const m = p[3];
    const right = m === 0 ? freqs(p[2]).slice(0, 3).reduce((a, b) => a + b, 0) : m === 4 ? quartile(p, 3).value - quartile(p, 1).value : quartile(p, m).value;
    return [right + 1, right - 1, right + WIDTH[p[0]] / 2, right + 2].filter((x) => x > 0 && !near(x, right));
  },
  variants: () => [],
  explain: (s) =>
    s.id === "cumulate"
      ? `Add the frequencies of the classes below the limit: ${s.inputs.join(" + ")} = ${s.value}`
      : s.id === "total"
        ? `Total frequency n = ${s.inputs.join(" + ")} = ${s.value}`
        : s.id === "iqr"
          ? `Interquartile range = ${money(s.inputs[0] as number)} − ${money(s.inputs[1] as number)} = ${money(s.value as number)}`
          : `Position ${s.inputs[0]} lies in the class starting at ${s.inputs[1]}: ${s.inputs[1]} + (${s.inputs[0]} − ${s.inputs[2]}) ÷ ${s.inputs[3]} × ${s.inputs[4]} = ${money(s.value as number)}`,
  domain: [[0, WIDTH.length - 1], [0, 4], [0, 60], [0, 4]],
  // seeds that give the same frequencies as a smaller seed would repeat a question: keep the first
  keep: ([, , seed]) => { const k = freqs(seed).join(); for (let t = 0; t < seed; t++) if (freqs(t).join() === k) return false; return true; },
  cap: 400,
  difficulty: ([, , , m]) => (m === 0 ? 1 : m === 2 ? 2 : 3),
  teach: {
    idea: "A cumulative frequency counts everything up to a value. Plotted at the upper class limits and joined by straight lines, it makes a less-than ogive, and the value at any count can be read from it.",
    method: "Find the total n. The median is at n/2, the lower quartile at n/4 and the upper quartile at 3n/4. Find the class where the cumulative frequency reaches that position and read across: lower limit + (position − cumulative frequency before) ÷ class frequency × class width. The interquartile range is Q3 − Q1.",
    visual: (p) => {
      const f = freqs(p[2]), c = classes(p);
      let run = 0;
      return { type: "table", head: ["Marks less than", "Cumulative frequency"], rows: c.map(([, b], i) => [b, (run += f[i])]) };
    },
    alternatives: [
      { id: "draw_it", title: "Draw the ogive", kind: "procedural", text: ["Plot (upper limit, cumulative frequency) for each class and join the points with straight lines, starting at the first lower limit on the horizontal axis.", "Draw a horizontal line from the position (n/2, n/4 or 3n/4) to the curve and down to the marks axis: that reading is the answer."] },
    ],
  },
  limits: "Five equal classes, a total that is a multiple of 4, readings by straight lines between the ogive's points; drawing the ogive itself is a written task, and more-than ogives are not included.",
};

export const B29: Def[] = [gst, rd, shares, ogive];
