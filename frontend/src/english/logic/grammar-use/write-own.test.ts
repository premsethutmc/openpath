import test from "node:test";
import assert from "node:assert/strict";
import { OWN, markOwn, ownFor, ownProblems } from "./write-own.ts";
import { GrammarSitting, GRAMMAR, LEARN, type GrammarRecord } from "./grammar-use.ts";
import { parseDictionary } from "../writing/dictionary.ts";

const p = (t: string) => OWN.find((x) => x.topic === t)!;

test("WO-1 prompts: each topic once, each example accepted by its own check", () => {
  assert.deepEqual(ownProblems(), []);
  assert.ok(OWN.length >= 25);
});

test("WO-2 a sentence must use the rule, look like a sentence and have no slip", () => {
  assert.equal(markOwn(p("have_has"), "My dog has a long tail.").ok, true);
  const no = markOwn(p("have_has"), "My dog is very big.");
  assert.deepEqual([no.ok, no.rule], [false, true], "the rule is missing");
  const form = markOwn(p("have_has"), "my dog has a tail");
  assert.deepEqual([form.ok, form.form.capital, form.form.end], [false, false, false]);
  assert.equal(markOwn(p("have_has"), "Has dog.").form.long, false);
  assert.equal(markOwn(p("past"), "Yesterday I played cricket.").ok, true);
  assert.equal(markOwn(p("past"), "I play cricket every day.").ok, false);
  assert.equal(markOwn(p("questions"), "Where is my red pencil?").ok, true);
  assert.equal(markOwn(p("questions"), "Where is my red pencil.").ok, false);
  assert.equal(markOwn(p("conditionals"), "If it rains, we will stay home.").ok, true);
  assert.equal(markOwn(p("articles"), "I saw an elephant at the zoo.").ok, true);
  assert.equal(markOwn(p("articles"), "I saw a dog at the zoo.").ok, false);
  // a slip the writing check knows is not accepted, though the rule is used
  assert.equal(markOwn(p("have_has"), "She has alot of books.").ok, false);
  // with the word list, a misspelt word is a slip too
  const dict = parseDictionary("#common\nmy\ndog\nhas\na\nlong\ntail\n");
  assert.equal(markOwn(p("have_has"), "My dog has a lnog tail.", dict).ok, false);
  assert.equal(markOwn(p("have_has"), "My dog has a long tail.", dict).ok, true);
});

test("WO-3 after a sitting, the topic to write about is one just practised (missed first) that has a prompt", () => {
  const learnt: GrammarRecord[] = LEARN.map((c) => ({ type: "learn", sitting: "g0", topic: c.topic, tried: true }));
  const s = new GrammarSitting(GRAMMAR, 2, learnt, ["have_has"]);
  for (let v = s.snapshot(), g = 0; v.phase !== "done" && g < 80; v = s.snapshot(), g++) {
    if (v.phase === "learn") s.learned();
    else if (v.phase === "ask") v.choose ? s.choose(0) : v.spot ? s.spot(0) : v.fix ? s.fix(0, "x") : s.build(v.build!.tiles);
    else s.next();
  }
  const d = s.snapshot().done!;
  assert.deepEqual(d.topics, ["have_has"]);
  assert.equal(ownFor(d.topics)!.topic, "have_has");
  assert.equal(ownFor(["figures"]), null, "a topic without a prompt");
});
