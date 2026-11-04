import { execFileSync } from "node:child_process";
import { benchmark, fixture } from "./benchmark-fixtures";

const root = process.env.OPENPATH_D2_ROOT;
if (!root) throw new Error("Set OPENPATH_D2_ROOT to D2 commit b34a3b8");
const commit = execFileSync("git", ["-C", root, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
if (commit !== "b34a3b823d9778ebc0bf69e6dc2b80b2db910586") throw new Error(`D2 baseline requires b34a3b8, received ${commit}`);
const { assessMathematicalWorking } = await import(`${root}/packages/learning/src/unified-math-engine.ts`);
const rows = [];
for (const item of benchmark.cases) {
  const value = fixture(item);
  const assessment = await assessMathematicalWorking(value.problem, value.working);
  rows.push({ id: item.id, mode: item.mode, expected: item.expected, actual: { classification: assessment.classification, firstInvalidStep: assessment.firstInvalidStep }, match: assessment.classification === item.expected.classification && assessment.firstInvalidStep === item.expected.firstInvalidStep });
}
const valid = rows.filter((row) => row.expected.classification === "verified");
const output = { version: "openpath-d3-d2-baseline@1", engineCommit: commit, benchmarkSha256: "f1c9d49bf151287cb435064a3a779c8d51e266075804473c127e7a6f17073c9e", total: rows.length, exactMatches: rows.filter((row) => row.match).length, validTransfers: valid.length, validAccepted: valid.filter((row) => row.actual.classification === "verified").length, falseAcceptances: rows.filter((row) => row.actual.classification === "verified" && row.expected.classification !== "verified").length, falseRejections: valid.filter((row) => row.actual.classification !== "verified").length, rows };
await Bun.write(new URL("./d2-baseline-results.v1.json", import.meta.url), `${JSON.stringify(output, null, 2)}\n`);
console.log({ ...output, rows: undefined });
