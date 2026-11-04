// Read-only reproduction: runs working through the existing engine (no production code is modified). `bun probe.ts`
import { assessMathematicalWorking } from "../../../../packages/learning/src/unified-math-engine.ts";
import { stopGeometryWorkers } from "../../../../packages/learning/src/geometry-worker.ts";
const nat = (t: string) => ({ format: "natural" as const, text: t });
// [name, domain, statement, lines (one complete equality per line), expected-today, desired-after-fix]
const C: [string, string, string, string[], string, string][] = [
  ["R1 concatenate step", "arithmetic", "37 + 59", ["37 + 59 = 8 + 16", "8 + 16 = 816"], "invalid", "invalid"],
  ["R2 concatenate one line", "arithmetic", "37 + 59", ["37 + 59 = 816"], "invalid", "invalid"],
  ["R3 place-value decomposition", "arithmetic", "37 + 59", ["37 + 59 = (30 + 50) + (7 + 9)", "(30 + 50) + (7 + 9) = 80 + 16", "80 + 16 = 96"], "unsupported", "verified"],
  ["R4 decomposition, no-carry error", "arithmetic", "37 + 59", ["37 + 59 = (30 + 50) + (7 + 9)", "(30 + 50) + (7 + 9) = 80 + 16", "80 + 16 = 86"], "invalid", "invalid"],
  ["R5 arithmetic slip 95", "arithmetic", "37 + 59", ["37 + 59 = (30 + 50) + (7 + 9)", "(30 + 50) + (7 + 9) = 80 + 15", "80 + 15 = 95"], "invalid", "invalid"],
  ["P1 place-value multiply", "arithmetic", "12 * 4", ["12 * 4 = (10 + 2) * 4", "(10 + 2) * 4 = 40 + 8", "40 + 8 = 48"], "unsupported", "verified"],
  ["P2 distributive 7*(100-2)", "arithmetic", "7 * 98", ["7 * 98 = 7 * (100 - 2)", "7 * (100 - 2) = 700 - 14", "700 - 14 = 686"], "unsupported", "verified"],
  ["P3 fraction split 5/6", "arithmetic", "5/6", ["5/6 = 1/2 + 1/3", "1/2 + 1/3 = 5/6"], "unsupported", "verified"],
  ["P4 common denominator", "arithmetic", "1/2 + 1/3", ["1/2 + 1/3 = 3/6 + 2/6", "3/6 + 2/6 = 5/6"], "verified", "verified"],
  ["P5 symbolic expansion", "algebra", "3(x + 4) = 18", ["3(x + 4) = 18", "3x + 12 = 18", "3x = 6", "x = 2"], "verified", "verified"],
  ["P6 factorisation", "algebra", "x^2 + 5x + 6 = 0", ["x^2 + 5x + 6 = 0", "(x + 2)(x + 3) = 0", "x = -2 or x = -3"], "verified", "verified"],
  ["N1 add-zero (96+17)-17", "arithmetic", "37 + 59", ["37 + 59 = (96 + 17) - 17", "(96 + 17) - 17 = 96"], "unsupported", "unsupported"],
  ["N2 unrelated parts 40+56", "arithmetic", "37 + 59", ["37 + 59 = 40 + 56", "40 + 56 = 96"], "unsupported", "unsupported"],
  ["N3 false equality", "arithmetic", "37 + 59", ["37 + 59 = (30 + 50) + (7 + 8)", "(30 + 50) + (7 + 8) = 95"], "invalid", "invalid"],
  ["N4 invented constraint", "algebra", "2x + 3 = 11", ["2x + 3 = 11", "x = 4 because x is even", "x = 4"], "unsupported", "unsupported"],
  ["L1 SYMBOLIC LEAK (2x+17)-11", "algebra", "2x + 6 = 12", ["2x + 6 = 12", "(2x + 17) - 11 = 12", "2x = 6", "x = 3"], "verified (leak)", "unsupported or justified-partition"],
  ["L2 symbolic pad +17-17", "algebra", "2x + 6 = 12", ["2x + 6 = 12", "2x + 6 + 17 - 17 = 12", "2x = 6", "x = 3"], "unsupported", "unsupported"],
];
let off = 0;
for (const [n, dom, st, lines, today, after] of C) {
  const r: any = await assessMathematicalWorking({ domain: dom, statement: st } as never, nat(lines.join("\n")));
  const obs = r.proofObligations?.obligations ?? r.domainPayload?.proofObligations?.obligations ?? [], first = obs.find((o: any) => o.status !== "proven");
  const got = String(r.classification), drift = !today.startsWith(got) ; if (drift) off++;
  console.log(`${n.padEnd(34)} today=${got.padEnd(11)} (reported ${today}) desired=${after}${drift ? "  <-- differs from earlier report" : ""}${first ? `\n    first unmet: ${first.kind}@L${first.line} ${String(first.reason).slice(0, 110)}` : ""}`);
}
console.log(off ? `${off} case(s) differ from the earlier reports` : "all reproduced as reported");
stopGeometryWorkers();
