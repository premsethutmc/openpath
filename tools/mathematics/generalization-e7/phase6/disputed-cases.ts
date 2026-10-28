// E7 Phase 6: the six reference-disputed cases, re-decided from proof obligations. Reference labels are reported but never used as mathematical truth.
import { readFileSync, writeFileSync } from "node:fs";
const { assessMathematicalWorking } = await import("../../../../packages/learning/src/unified-math-engine.ts");
const T = new URL("../../", import.meta.url).pathname;
const spec: [string, string, string][] = [
  ["e5-sealed-007", "geocalc-e5/sealed-cases.v1.json", "AB = CA gives B = C (base angles); 20 + 2B = 180 gives B = 80. Every stated claim is true and follows from the stated facts; the goal is B = 80."],
  ["e6-204", "generalization-e6/sealed-cases.v1.json", "A and B are stated independent (a task assumption); P(A,B) = (1/2)(1/3) = 1/6. A concise answer; no further step is required."],
  ["e6-263", "generalization-e6/sealed-cases.v1.json", "The posed function contains ln(x), so x > 0 is implied by the task; there ln(x) + ln(x^2) = 3 ln(x) and the derivative is 3/x."],
  ["e6-251", "generalization-e6/validation-cases.v1.json", "CONTESTED. f(x) = (x^2-4)/(x-2) carries x != 2 in the posed function; f = x + 2 and f' = 1 hold for x != 2. Whether the answer must restate x != 2 is exactly what the two independent adjudicators disagree on (A: verified, B: missing-assumption); it is not decided here."],
  ["r6-194", "generalization-e6r/holdout1/holdout-cases.v1.json", "Independence is a task assumption and the student restates P(A), P(B); P(A,B) = (1/3)(1/2) = 1/6."],
  ["r6-220", "generalization-e6r/holdout1/holdout-cases.v1.json", "The task poses a binomial variance with n = 10, p = 3/10; Var = np(1-p) = 10(3/10)(7/10) = 21/10. Both factors come from the posed data."],
];
const out: unknown[] = [];
for (const [id, f, mathematics] of spec) {
  const c = (JSON.parse(readFileSync(T + f, "utf8")).cases as any[]).find((x) => (x.caseId ?? x.id) === id)!;
  const a: any = await assessMathematicalWorking(c.problem, c.studentWorking, {});
  const ob = (a.proofObligations ?? a.domainPayload?.proofObligations)?.obligations ?? [];
  out.push({ id, referenceLabel: c.reference?.classification, referenceUsedAsTruth: false, contested: id === "e6-251", independentMathematics: mathematics, finalVerdict: a.classification,
    decidedBy: a.certification?.rule, routes: a.certification?.routes, mechanisms: a.certification?.mechanisms, integrity: a.certification?.integrity,
    obligations: ob.map((o: any) => ({ kind: o.kind, status: o.status, line: o.line, claim: o.claim, mechanism: o.evidence?.mechanism ?? null, reason: o.reason })),
    taskRestrictions: a.domainPayload?.proofContext?.task });
}
writeFileSync(new URL("./disputed-cases-p6.json", import.meta.url).pathname, JSON.stringify(out, null, 1));
console.log(out.map((o: any) => `${o.id} ref=${o.referenceLabel} final=${o.finalVerdict} rule=${o.decidedBy} proven=${o.obligations.filter((x: any) => x.status === "proven").length}/${o.obligations.length}`).join("\n"));
process.exit(0);
