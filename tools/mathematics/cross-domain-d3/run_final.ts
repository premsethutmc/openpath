import { assessMathematicalWorking } from "../../../packages/learning/src/unified-math-engine";
import { benchmark, fixture } from "./benchmark-fixtures";

const rows = [];
for (const item of benchmark.cases) {
  const value = fixture(item);
  const assessment = await assessMathematicalWorking(value.problem, value.working);
  const bindings = (assessment.domainPayload as any)?.bindings ?? [];
  rows.push({ id: item.id, mode: item.mode, expected: item.expected, actual: { classification: assessment.classification, firstInvalidStep: assessment.firstInvalidStep }, verifiedBindingCount: bindings.filter((binding: any) => binding.proofVerificationStatus === "verified").length, match: assessment.classification === item.expected.classification && assessment.firstInvalidStep === item.expected.firstInvalidStep });
}
const valid = rows.filter((row) => row.expected.classification === "verified");
const invalid = rows.filter((row) => row.expected.classification === "invalid");
const output = { version: "openpath-d3-final@1", benchmarkSha256: "f1c9d49bf151287cb435064a3a779c8d51e266075804473c127e7a6f17073c9e", total: rows.length, exactMatches: rows.filter((row) => row.match).length, validTransfers: valid.length, validAccepted: valid.filter((row) => row.actual.classification === "verified").length, newlyAcceptedValidTransfers: valid.filter((row) => row.actual.classification === "verified").length, falseAcceptances: rows.filter((row) => row.actual.classification === "verified" && row.expected.classification !== "verified").length, falseRejections: valid.filter((row) => row.actual.classification !== "verified").length, firstInvalidStepMatches: invalid.filter((row) => row.actual.firstInvalidStep === row.expected.firstInvalidStep).length, invalidCases: invalid.length, proofVerifiedBindings: rows.reduce((sum,row)=>sum+row.verifiedBindingCount,0), rows };
await Bun.write(new URL("./final-results.v1.json", import.meta.url), `${JSON.stringify(output, null, 2)}\n`);
console.log({ ...output, rows: undefined });
