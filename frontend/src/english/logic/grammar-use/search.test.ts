import test from "node:test";
import assert from "node:assert/strict";
import { searchGrammar } from "./search.ts";

test("GS-1 a child's own words find the grammar topic: by name, everyday name, or the rule's words; nonsense finds nothing", () => {
  const first = (q: string) => searchGrammar(q)[0]?.id;
  assert.equal(first("has"), "have_has");
  assert.equal(first("a and an"), "articles");
  assert.equal(first("plural"), "plurals");
  assert.equal(first("their there"), "confusables");
  assert.equal(first("if"), "conditionals");
  assert.equal(first("past tense")?.match(/past|irregular_verbs|tenses/)?.[0] !== undefined, true);
  assert.ok(searchGrammar("apostrophe").some((h) => h.id === "contractions") && searchGrammar("apostrophe").some((h) => h.id === "possessives"));
  assert.ok(searchGrammar("simile").length >= 1);
  assert.deepEqual(searchGrammar("xyzzy"), []);
  assert.deepEqual(searchGrammar("a"), [], "one letter is too little to search");
  assert.ok(searchGrammar("e").length === 0);
  for (const h of searchGrammar("verb")) assert.ok(h.sentences >= 8 && h.rule.length > 10);
});
