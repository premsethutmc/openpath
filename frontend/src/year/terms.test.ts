/** term-links@1: the vocabulary points at real skills with a card, and a paragraph is cut the right way. */
import assert from "node:assert/strict";
import { test } from "node:test";
import { moduleFor } from "../../../packages/learning/src/content";
import { cardFor } from "../../../packages/learning/src/step-help";
import { TERM_SKILLS, linkTerms } from "../../../packages/learning/src/terms";
import { allowTerm } from "./Terms";

test("every linked word belongs to a real skill that has a rule to show", () => {
  for (const c of TERM_SKILLS) { assert.ok(moduleFor(c), `${c} is not a skill`); assert.ok(cardFor(c), `${c} has no card`); }
});

test("a paragraph is cut into text and linked words: once per skill, whole words only", () => {
  const all = () => true;
  const p = linkTerms("sin(A + B) has a plus and sin(A − B) a minus. cos(A + B) swaps it.", all);
  assert.deepEqual(p.filter((x) => x.skill).map((x) => x.text), ["sin"], "sin and cos are one skill: linked once");
  assert.equal(p.map((x) => x.text).join(""), "sin(A + B) has a plus and sin(A − B) a minus. cos(A + B) swaps it.");
  assert.deepEqual(linkTerms("Using a business model.", all).filter((x) => x.skill), [], "no word inside a word");
  assert.deepEqual(linkTerms("The denominator stays; find the HCF.", all).filter((x) => x.skill).map((x) => x.text), ["denominator", "HCF"]);
  assert.deepEqual(linkTerms("sin x", () => false), [{ text: "sin x" }]);
});

test("a word is linked only outside its own skill and only to a skill taught no later", () => {
  assert.equal(allowTerm("MATH.trigonometry.compound-angle-identities")("MATH.trigonometry.ratios"), true);
  assert.equal(allowTerm("MATH.trigonometry.ratios")("MATH.trigonometry.ratios"), false, "not inside its own lesson");
  assert.equal(allowTerm("MATH.number.rounding")("MATH.calculus.derivatives"), false, "never forward to a later class");
});
