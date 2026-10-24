import assert from "node:assert/strict";
import test from "node:test";
import { moduleFor, question } from "./content";
import { FAMILIES, problemOf } from "./families";
import { familyTeachingVisual, teachingPresentationFrom, teachingScopeFor, validateTeachingPresentation } from "./teaching-presentation";

const groups = [
  { name: "Indian place value", kind: "place-value", ids: ["gen:aeind:4,7,0,1", "gen:aeind:1,9,0,10", "gen:aeind:9,99,0,19"] },
  { name: "integer arithmetic", kind: "number-line", ids: ["gen:aiint:-17,-7,0", "gen:aiint:26,-25,1", "gen:aiint:-5,-5,1"] },
  { name: "equivalent fractions", kind: "fraction-strip", ids: ["gen:eqfrac:2,3,9", "gen:eqfrac:3,4,12", "gen:eqfrac:1,2,10"] },
  { name: "Cartesian products", kind: "cartesian-grid", ids: ["gen:aocart:3,2,0", "gen:aocart:1,5,0", "gen:aocart:4,3,2"] },
  { name: "equations", kind: "equation", ids: ["gen:lin:2,5,4", "gen:lin:9,30,12", "gen:lin:7,19,9"] },
  { name: "mensuration", kind: "geometry", ids: ["gen:aearea:3,4", "gen:aearea:2,12", "gen:aearea:10,10"] },
] as const;

for (const group of groups) test(`${group.name}: varied parameters produce fully checked presentations`, () => {
  for (const id of group.ids) {
    const problem = problemOf(id);
    assert.ok(problem, `${id} is a real generated family problem`);
    const module = moduleFor(problem.competency);
    assert.ok(module, `${problem.competency} has a real module`);
    const presentation = teachingPresentationFrom({ module, screen: module.chapter[0], problem, question: question(id), practiceIds: module.practice });
    assert.equal(presentation.status, "supported", `${id}: ${presentation.unsupportedReason ?? "supported"}`);
    assert.equal(presentation.visual?.kind, group.kind);
    assert.deepEqual(validateTeachingPresentation(problem, presentation), [], `${id}: every displayed step and diagram validates`);
    assert.equal(presentation.practice.competency, problem.competency);
    const family = FAMILIES.get(problem.family)!;
    assert.ok(family.validate(problem.params, Number(problem.answer)), `${id}: final answer independently validates`);
  }
});

test("place-value digits come from the validated answer, including internal zeros", () => {
  for (const id of groups[0].ids) {
    const problem = problemOf(id)!;
    const visual = familyTeachingVisual(problem);
    assert.equal(visual?.kind, "place-value");
    if (visual?.kind === "place-value") assert.equal(Number(visual.rows[0].join("")), Number(problem.answer));
  }
});

test("structured family scope excludes relation-count questions without text matching", () => {
  const module = moduleFor("MATH.algebra.relations")!;
  const scope = teachingScopeFor(module);
  assert.equal(scope.family, "aocart");
  assert.equal(scope.accepts(problemOf("gen:aocart:3,2,0")!), true);
  assert.equal(scope.accepts(problemOf("gen:aocart:3,2,1")!), false);
});

test("unsupported teaching is explicit", () => {
  const module = moduleFor("MATH.number.integer-add")!;
  const presentation = teachingPresentationFrom({ module, screen: { title: "Draft", text: ["Draft explanation"] }, problem: null, question: null, practiceIds: [] });
  assert.equal(presentation.status, "unsupported");
  assert.match(presentation.unsupportedReason ?? "", /No deterministic family example/);
});
