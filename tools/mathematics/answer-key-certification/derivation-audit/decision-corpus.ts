// Deterministic corpus of working submissions for old-vs-new decision comparison. Each case: domain, statement, lines (one equality per line), group, expected (design label) or null (baseline-only).
export interface Case { id: string; group: string; domain: "arithmetic" | "algebra"; statement: string; lines: string[]; expect: "verified" | "unsupported" | "invalid" | null }
let seed = 20261030; const rnd = (n: number) => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % n; };
const out: Case[] = []; let n = 0;
const add = (group: string, domain: Case["domain"], statement: string, lines: string[], expect: Case["expect"]) => out.push({ id: `${group}-${++n}`, group, domain, statement, lines, expect });
// ---- designed cases (the approved design's tables)
const D: [string, string, string[], Case["expect"]][] = [
  ["37 + 59", "decomposition", ["37 + 59 = (30 + 50) + (7 + 9)", "(30 + 50) + (7 + 9) = 80 + 16", "80 + 16 = 96"], "verified"],
  ["37 + 59", "non-positional", ["37 + 59 = (31 + 49) + (6 + 10)", "(31 + 49) + (6 + 10) = 80 + 16", "80 + 16 = 96"], "verified"],
  ["12 * 4", "place-value multiply", ["12 * 4 = (10 + 2) * 4", "(10 + 2) * 4 = 40 + 8", "40 + 8 = 48"], "verified"],
  ["7 * 98", "split + distribute", ["7 * 98 = 7 * (100 - 2)", "7 * (100 - 2) = 700 - 14", "700 - 14 = 686"], "verified"],
  ["5/6", "fraction split", ["5/6 = 1/2 + 1/3", "1/2 + 1/3 = 5/6"], "verified"],
  ["1/2 + 1/3", "fraction scale", ["1/2 + 1/3 = 3/6 + 2/6", "3/6 + 2/6 = 5/6"], "verified"],
  ["37 + 59", "shown transfer", ["37 + 59 = (37 + 3) + (59 - 3)", "(37 + 3) + (59 - 3) = 40 + 56", "40 + 56 = 96"], "verified"],
  ["37 + 59", "shown transfer 22", ["37 + 59 = (37 + 22) + (59 - 22)", "(37 + 22) + (59 - 22) = 59 + 37", "59 + 37 = 96"], "verified"],
  ["100 - 37", "borrow split", ["100 - 37 = (100 - 40) + 3", "(100 - 40) + 3 = 63"], "verified"],
  ["63 + 28", "round and adjust", ["63 + 28 = 63 + (30 - 2)", "63 + (30 - 2) = 91"], "verified"],
  ["37 + 59", "REJECT add-zero", ["37 + 59 = (96 + 17) - 17", "(96 + 17) - 17 = 96"], "unsupported"],
  ["37 + 59", "REJECT pad", ["37 + 59 = 37 + 59 + (5 - 5)", "37 + 59 + (5 - 5) = 96"], "unsupported"],
  ["37 + 59", "REJECT x1", ["37 + 59 = 96 * 1", "96 * 1 = 96"], "unsupported"],
  ["37 + 59", "REJECT 2*48", ["37 + 59 = 2 * 48", "2 * 48 = 96"], "unsupported"],
  ["37 + 59", "REJECT unshown 40+56", ["37 + 59 = 40 + 56", "40 + 56 = 96"], "unsupported"],
  ["37 + 59", "REJECT unshown 95+1", ["37 + 59 = 95 + 1", "95 + 1 = 96"], "unsupported"],
  ["37 + 59", "REJECT 100-4", ["37 + 59 = 100 - 4", "100 - 4 = 96"], "unsupported"],
  ["37 + 59", "INVALID concatenate", ["37 + 59 = 8 + 16", "8 + 16 = 816"], "invalid"],
  ["37 + 59", "INVALID no-carry", ["37 + 59 = (30 + 50) + (7 + 9)", "(30 + 50) + (7 + 9) = 80 + 16", "80 + 16 = 86"], "invalid"],
  ["37 + 59", "INVALID slip", ["37 + 59 = (30 + 50) + (7 + 9)", "(30 + 50) + (7 + 9) = 80 + 15", "80 + 15 = 95"], "invalid"],
  ["37 + 59", "INVALID false split", ["37 + 59 = (30 + 50) + (7 + 8)", "(30 + 50) + (7 + 8) = 95"], "invalid"],
  ["37 + 59", "INVALID shift not netting", ["37 + 59 = (37 + 3) + (59 - 4)", "(37 + 3) + (59 - 4) = 95"], "invalid"],
];
for (const [st, g, lines, e] of D) add(g.startsWith("REJECT") || g.startsWith("INVALID") ? "adv-designed" : "designed", "arithmetic", st, lines, e);
// ---- symbolic: existing behaviour + bracket variants
const S: [string, string, string[], Case["expect"]][] = [
  ["3(x + 4) = 18", "expansion", ["3(x + 4) = 18", "3x + 12 = 18", "3x = 6", "x = 2"], "verified"],
  ["x^2 + 5x + 6 = 0", "factorisation", ["x^2 + 5x + 6 = 0", "(x + 2)(x + 3) = 0", "x = -2 or x = -3"], "verified"],
  ["2x + 6 = 12", "linear", ["2x + 6 = 12", "2x = 6", "x = 3"], "verified"],
  ["2x + 6 = 12", "partition (2x+17)-11", ["2x + 6 = 12", "(2x + 17) - 11 = 12", "2x = 6", "x = 3"], "verified"],
  ["2x + 6 = 12", "partition no brackets", ["2x + 6 = 12", "2x + 17 - 11 = 12", "2x = 6", "x = 3"], "verified"],
  ["2x + 6 = 12", "LEAK brackets 4713", ["2x + 6 = 12", "(2x + 4713) + (6) - (4713) = 12", "2x = 6", "x = 3"], "unsupported"],
  ["2x + 6 = 12", "LEAK brackets 4713 b", ["2x + 6 = 12", "(2x + 4713) - (4713) + 6 = 12", "2x = 6", "x = 3"], "unsupported"],
  ["2x + 6 = 12", "LEAK brackets 4713 c", ["2x + 6 = 12", "2x + (6 + 4713) - (4713) = 12", "2x = 6", "x = 3"], "unsupported"],
  ["2x + 6 = 12", "pad adjacent", ["2x + 6 = 12", "2x + 6 + 4713 - 4713 = 12", "2x = 6", "x = 3"], "unsupported"],
  ["2x + 6 = 12", "pad one-bracket", ["2x + 6 = 12", "(2x + 6 + 4713 - 4713) = 12", "2x = 6", "x = 3"], "unsupported"],
  ["2x + 6 = 12", "pad three numerals", ["2x + 6 = 12", "(2x + 4713) + (6) - (4700) - (13) = 12", "2x = 6", "x = 3"], "unsupported"],
  ["2x + 6 = 12", "INVALID line", ["2x + 6 = 12", "(2x + 17) - 12 = 12", "2x = 6", "x = 3"], "invalid"],
  ["2x + 6 = 12", "INVALID conclusion", ["2x + 6 = 12", "(2x + 17) - 11 = 12", "2x = 7", "x = 3.5"], "invalid"],
  ["x^2 + 6x + 5 = 0", "complete the square", ["x^2 + 6x + 5 = 0", "(x + 3)^2 - 9 + 5 = 0", "(x + 3)^2 = 4", "x = -1 or x = -5"], "verified"],
  ["x^2 + 6x + 5 = 0", "complete the square paren", ["x^2 + 6x + 5 = 0", "((x + 3)^2 - 9) + 5 = 0", "(x + 3)^2 = 4", "x = -1 or x = -5"], null],
  ["(x + 2)^2 = 9", "expand square", ["(x + 2)^2 = 9", "x^2 + 4x + 4 = 9", "x^2 + 4x - 5 = 0", "(x + 5)(x - 1) = 0", "x = -5 or x = 1"], "verified"],
  ["4x - 2(x - 3) = 10", "distribute neg", ["4x - 2(x - 3) = 10", "4x - 2x + 6 = 10", "2x + 6 = 10", "x = 2"], "verified"],
  ["2x + 3 = 11", "invented premise", ["2x + 3 = 11", "x = 4 because x is even", "x = 4"], "unsupported"],
];
for (const [st, g, lines, e] of S) add("symbolic", "algebra", st, lines, e);
// ---- generated: registry-accepted decompositions, slips, pads, smuggles, shifts
for (let i = 0; i < 40; i++) {
  const a = 11 + rnd(80), b = 11 + rnd(80), s = a + b, st = `${a} + ${b}`;
  const [ta, oa] = [Math.floor(a / 10) * 10, a % 10], [tb, ob] = [Math.floor(b / 10) * 10, b % 10], T = ta + tb, O = oa + ob;
  add("gen-decomp", "arithmetic", st, [`${a} + ${b} = (${ta} + ${tb}) + (${oa} + ${ob})`, `(${ta} + ${tb}) + (${oa} + ${ob}) = ${T} + ${O}`, `${T} + ${O} = ${s}`], "verified");
  add("gen-slip", "arithmetic", st, [`${a} + ${b} = (${ta} + ${tb}) + (${oa} + ${ob})`, `(${ta} + ${tb}) + (${oa} + ${ob}) = ${T} + ${O + 1}`, `${T} + ${O + 1} = ${s + 1}`], "invalid");
  const k = 2 + rnd(30); add("gen-shift", "arithmetic", st, [`${a} + ${b} = (${a} + ${k}) + (${b} - ${k})`, `(${a} + ${k}) + (${b} - ${k}) = ${a + k} + ${b - k}`, `${a + k} + ${b - k} = ${s}`], "verified");
  add("gen-pad", "arithmetic", st, [`${a} + ${b} = (${s} + ${k}) - ${k}`, `(${s} + ${k}) - ${k} = ${s}`], "unsupported");
  add("gen-unshown", "arithmetic", st, [`${a} + ${b} = ${a + k} + ${b - k}`, `${a + k} + ${b - k} = ${s}`], "unsupported");
  if (i % 2 === 0) add("gen-smuggle", "arithmetic", st, [`${a} + ${b} = ${s} * 1`, `${s} * 1 = ${s}`], "unsupported");
}
for (let i = 0; i < 20; i++) { const a = 11 + rnd(40), b = 2 + rnd(8), t = Math.floor(a / 10) * 10, o = a % 10;
  add("gen-mult", "arithmetic", `${a} * ${b}`, [`${a} * ${b} = (${t} + ${o}) * ${b}`, `(${t} + ${o}) * ${b} = ${t * b} + ${o * b}`, `${t * b} + ${o * b} = ${a * b}`], "verified"); }
export const CASES = out;
