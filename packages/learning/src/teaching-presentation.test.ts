import assert from "node:assert/strict";
import test from "node:test";
import { moduleFor, question } from "./content";
import { FAMILIES, problemOf } from "./families";
import { teachingPresentationFrom } from "./teaching-presentation";

const cases = [
  ["Indian place value", "gen:aeind:4,7,0,1", "place-value"],
  ["integer arithmetic", "gen:aiint:-17,-7,0", "number-line"],
  ["fractions", "gen:eqfrac:2,3,9", "fraction-strip"],
  ["Cartesian products", "gen:aocart:3,2,0", "cartesian-grid"],
  ["equations", "gen:lin:2,5,4", "equation"],
  ["mensuration", "gen:aearea:3,4", "geometry"],
] as const;

for (const [name, id, visualKind] of cases) test(`${name} produces a checked teaching presentation`, () => {
  const problem = problemOf(id);
  assert.ok(problem, `${id} is a real generated family problem`);
  const module = moduleFor(problem.competency);
  assert.ok(module, `${problem.competency} has a real module`);
  const q = question(id);
  const presentation = teachingPresentationFrom({ module, screen: module.chapter[0], problem, question: q, practiceIds: module.practice });
  assert.equal(presentation.status, "supported");
  assert.equal(presentation.visual?.kind, visualKind);
  assert.ok(presentation.workedExample?.steps.length);
  assert.equal(presentation.practice.competency, problem.competency);
  assert.ok(presentation.practice.families.includes(problem.family));
  const family = FAMILIES.get(problem.family);
  assert.ok(family);
  const numeric = Number(problem.answer);
  assert.ok(Number.isFinite(numeric) && family.validate(problem.params, numeric), `${problem.answer} independently validates`);
});

test("unsupported teaching is explicit", () => {
  const module = moduleFor("MATH.number.integer-add")!;
  const presentation = teachingPresentationFrom({ module, screen: { title: "Draft", text: ["Draft explanation"] }, problem: null, question: null, practiceIds: [] });
  assert.equal(presentation.status, "unsupported");
  assert.match(presentation.unsupportedReason ?? "", /No deterministic family example/);
});
