import { explainNumerals } from "./prototype-rule.ts";
import { justified } from "./registry-rewrite.ts";
// [family of form, P, R, want (true = should be a justified step)]
const C: [string, string, string, boolean][] = [
  ["place-value split", "37 + 59", "(30 + 50) + (7 + 9)", true], ["place-value split (non-positional)", "37 + 59", "(31 + 49) + (6 + 10)", true],
  ["evaluate groups", "(30 + 50) + (7 + 9)", "80 + 16", true], ["evaluate whole (final step)", "80 + 16", "96", true],
  ["place-value multiply", "12 * 4", "(10 + 2) * 4", true], ["factor split", "7 * 48", "7 * (6 * 8)", true], ["distribute", "7 * (100 - 2)", "700 - 14", true],
  ["split into a group", "7 * 98", "7 * (100 - 2)", true],
  ["fraction split", "5/6", "1/2 + 1/3", true], ["fraction scale", "1/2 + 1/3", "3/6 + 2/6", true],
  ["transfer, shift shown", "37 + 59", "(37 + 3) + (59 - 3)", true], ["transfer, large shift shown", "37 + 59", "(37 + 22) + (59 - 22)", true],
  ["evaluate transfer groups", "(37 + 3) + (59 - 3)", "40 + 56", true],
  ["REJECT cancellation / add-zero", "37 + 59", "(96 + 17) - 17", false], ["REJECT pad +(5-5)", "37 + 59", "37 + 59 + (5 - 5)", false], ["REJECT m-(m-96)", "37 + 59", "150 - (150 - 96)", false],
  ["REJECT multiply by 1 (answer)", "37 + 59", "96 * 1", false], ["REJECT answer as 2*48", "37 + 59", "2 * 48", false], ["REJECT unshown equal-sum 40+56", "37 + 59", "40 + 56", false],
  ["REJECT unshown partition 95+1", "37 + 59", "95 + 1", false], ["REJECT answer partition 100-4", "37 + 59", "100 - 4", false], ["REJECT false equality", "37 + 59", "(30 + 50) + (7 + 8)", false],
  ["REJECT false equality (shift 3 vs 4)", "37 + 59", "(37 + 3) + (59 - 4)", false], ["REJECT cancelling pair in product", "37 + 59", "(96 * 17) / 17", false],
];
const truth = (p: string, r: string) => true; // the kernel decides equality first; a false equality is rejected elsewhere
let bT = 0, bB = 0, bR = 0;
console.log("case".padEnd(40), "want".padEnd(7), "truth-only".padEnd(11), "proto-v1".padEnd(9), "registry");
for (const [n, p, r, want] of C) {
  const eq = (() => { try { return true; } catch { return false; } })();
  const t = !n.includes("false equality"), b = explainNumerals(p, r).ok, g = justified(p, r);
  const mark = (x: boolean) => (x === want ? "ok" : "WRONG").padEnd(9); if (t !== want) bT++; if (b !== want) bB++; if (g !== want) bR++;
  console.log(n.padEnd(40), String(want).padEnd(7), mark(t).padEnd(11), mark(b), mark(g));
}
console.log(`\nwrong decisions — truth-only: ${bT}   prototype v1: ${bB}   registry v2: ${bR}  (of ${C.length})`);
