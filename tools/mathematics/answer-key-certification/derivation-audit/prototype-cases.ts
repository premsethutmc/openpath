import { explainNumerals } from "./prototype-rule.ts";
const cases: [string, string, string, boolean][] = [
  ["place-value add (30+50)+(7+9)", "37 + 59", "(30 + 50) + (7 + 9)", true],
  ["place-value multiply (10+2)*4", "12 * 4", "(10 + 2) * 4", true],
  ["distributive 7*(100-2)", "7 * 98", "7 * (100 - 2)", true],
  ["common denominator 3/6 + 2/6", "1/2 + 1/3", "3/6 + 2/6", true],
  ["fraction split 1/2 + 1/3", "5/6", "1/2 + 1/3", true],
  ["non-positional partition (31+49)+(6+10)", "37 + 59", "(31 + 49) + (6 + 10)", true],
  ["REJECT add-zero (96+17)-17", "37 + 59", "(96 + 17) - 17", false],
  ["REJECT pad 37+59+(5-5)", "37 + 59", "37 + 59 + (5 - 5)", false],
  ["REJECT m-(m-96) laundering", "37 + 59", "150 - (150 - 96)", false],
  ["REJECT transfer (37+22)+(59-22) [conservative]", "37 + 59", "(37 + 22) + (59 - 22)", false],
  ["REJECT compensation 100-4 [conservative: parts relate only to the answer]", "37 + 59", "100 - 4", false],
  ["REJECT unrelated parts 40+56", "37 + 59", "40 + 56", false],
  ["REJECT false equality (30+50)+(7+8)", "37 + 59", "(30 + 50) + (7 + 8)", false],
];
let bad = 0;
for (const [n, p, r, want] of cases) { const x = explainNumerals(p, r); const pass = x.ok === want; if (!pass) bad++; console.log(`${pass ? "ok  " : "FAIL"} ${n.padEnd(48)} -> ${x.ok ? "explained" : "refused"}: ${x.why}`); }
console.log(bad ? `${bad} FAILED` : "all prototype decisions as designed");
