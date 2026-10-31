import assert from "node:assert/strict";
import test from "node:test";
import { moduleFor, question } from "./content";
import { FAMILIES, problemOf, type Problem } from "./families";
import { EXPLICIT_TEACHING_FAMILIES, teachingPresentationFrom, validateTeachingPresentation } from "./teaching-presentation";

const seedIds: Record<typeof EXPLICIT_TEACHING_FAMILIES[number], string> = {
  aeind: "gen:aeind:4,7,0,1", aiint: "gen:aiint:-17,-7,0", eqfrac: "gen:eqfrac:2,3,9", fadd: "gen:fadd:2,1,5,1",
  adfcmp: "gen:adfcmp:0,5,2,3,0", adfname: "gen:adfname:2,4,3", adshade: "gen:adshade:2,4,1,2",
  aocart: "gen:aocart:3,2,0", apcartn: "gen:apcartn:0,3,4,2", lin: "gen:lin:2,5,4", ahone: "gen:ahone:0,5,4",
  lneg: "gen:lneg:-3,5,4", rect: "gen:rect:3,4", aearea: "gen:aearea:3,4", rperim: "gen:rperim:5,3",
};
const numberOf = (answer: string) => { const m = answer.match(/^(-?\d+)\/(-?\d+)$/); return m ? Number(m[1]) / Number(m[2]) : Number(answer); };
const hash = (text: string) => [...text].reduce((n, c) => (n * 33 + c.charCodeAt(0)) >>> 0, 2166136261);
function generated(familyId: keyof typeof seedIds, count = 18): Problem[] {
  const def = FAMILIES.get(familyId)!;
  const seed = problemOf(seedIds[familyId])!;
  const found = new Map<string, Problem>([[seed.id, seed]]);
  let state = hash(familyId);
  const random = () => (state = (1664525 * state + 1013904223) >>> 0) / 2 ** 32;
  for (let attempt = 0; attempt < 10000 && found.size < count; attempt++) {
    const params = def.domain?.map(([low, high]) => low + Math.floor(random() * (high - low + 1))) ?? [];
    if (params.length !== def.arity || def.reject(params) || (def.keep && !def.keep(params))) continue;
    const problem = problemOf(`gen:${familyId}:${params.join(",")}`);
    if (problem) found.set(problem.id, problem);
  }
  for (const params of def.variants(seed.params)) {
    const problem = problemOf(`gen:${familyId}:${params.join(",")}`);
    if (problem) found.set(problem.id, problem);
    if (found.size >= count) break;
  }
  return [...found.values()].slice(0, count);
}

test("all 15 adapters audit reproducible generated parameters", (t) => {
  for (const familyId of EXPLICIT_TEACHING_FAMILIES) {
    const cases = generated(familyId);
    assert.ok(cases.length >= 8, `${familyId} produced boundary and variation coverage`);
    let accepted = 0, rejected = 0, failures = 0;
    for (const problem of cases) {
      const def = FAMILIES.get(familyId)!;
      assert.ok(def.validate(problem.params, numberOf(problem.answer)), `${problem.id}: mathematical answer validates`);
      const module = moduleFor(problem.competency);
      assert.ok(module, `${problem.id}: module exists`);
      const presentation = teachingPresentationFrom({ module, screen: module.chapter[0], problem, question: question(problem.id), practiceIds: module.practice });
      const errors = validateTeachingPresentation(problem, presentation);
      if (presentation.status === "supported") {
        assert.deepEqual(errors, [], `${problem.id}: accepted contract is independently consistent`);
        if (presentation.diagramUnsupported) rejected++; else accepted++;
      } else {
        rejected++;
        if (!presentation.unsupportedReason) failures++;
      }
    }
    assert.equal(failures, 0, `${familyId}: invalid cases reject with a reason`);
    t.diagnostic(`${familyId}: generated=${cases.length} accepted=${accepted} rejected=${rejected} failures=${failures}`);
  }
});

test("equation validation rejects answer-containing text and invalid intermediate operations", () => {
  const problem = problemOf("gen:lin:3,7,5")!;
  const module = moduleFor(problem.competency)!;
  const presentation = teachingPresentationFrom({ module, screen: module.chapter[0], problem, question: question(problem.id), practiceIds: module.practice });
  assert.equal(presentation.status, "supported");
  const falseProof = { ...presentation, visual: { kind: "equation" as const, lines: [`The answer is ${problem.answer}`] } };
  assert.match(validateTeachingPresentation(problem, falseProof).join(" "), /structured equivalent transformations/);
  const badProblem = { ...problem, steps: problem.steps.map((step, index) => index === 0 ? { ...step, value: Number(step.value) + 1 } : step) };
  const bad = teachingPresentationFrom({ module, screen: module.chapter[0], problem: badProblem, question: question(problem.id), practiceIds: module.practice });
  assert.equal(bad.status, "unsupported");
  assert.match(bad.unsupportedReason ?? "", /transformations are not equivalent/);
});

test("fraction validation rejects impossible and inconsistent strips", () => {
  const problem = problemOf("gen:eqfrac:3,4,12")!;
  const module = moduleFor(problem.competency)!;
  const presentation = teachingPresentationFrom({ module, screen: module.chapter[0], problem, question: question(problem.id), practiceIds: module.practice });
  assert.equal(presentation.status, "supported");
  const impossible = { ...presentation, visual: { kind: "fraction-strip" as const, numerator: 5, denominator: 4, comparison: { numerator: 9, denominator: 12 } } };
  assert.match(validateTeachingPresentation(problem, impossible).join(" "), /outside its whole|not equivalent/);
  const inconsistent = { ...presentation, visual: { kind: "fraction-strip" as const, numerator: 3, denominator: 4, comparison: { numerator: 8, denominator: 12 } } };
  assert.match(validateTeachingPresentation(problem, inconsistent).join(" "), /not equivalent/);
});
