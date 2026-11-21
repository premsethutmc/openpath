import assert from "node:assert/strict";
import { test } from "node:test";
import { DICTATION } from "../dictation/dictation.ts";
import { align, allRead, grammarFor, nextLevel, pickSentences, readable, SITTING_SIZE } from "./readAloud.ts";

const h = (s: string, conf = 1) => s.split(" ").map((word) => ({ word, conf }));
const st = (text: string, heard: ReturnType<typeof h>) => align(text, heard).map((w) => w.status).join(",");

test("grammar: the whole sentence as a phrase, then each word once, lower case, no [unk]", () => {
  assert.deepEqual(JSON.parse(grammarFor("The cat sat on the mat.")), ["the cat sat on the mat", "cat", "mat", "on", "sat", "the"]);
  assert.deepEqual(JSON.parse(grammarFor("Don’t run!")), ["don't run", "don't", "run"]);
});

test("a clean reading is all read", () => {
  const r = align("The cat sat down.", h("the cat sat down"));
  assert.ok(allRead(r));
  assert.deepEqual(r.map((w) => w.word), ["The", "cat", "sat", "down"]);
});

test("a skipped word is missed, the rest still line up", () => {
  assert.equal(st("The cat sat down.", h("the sat down")), "read,missed,read,read");
  assert.equal(st("We went to the beach on Sunday.", h("we went the beach on sunday")), "read,read,missed,read,read,read,read");
});

test("a different word in a word's place is unclear, not missed", () => {
  assert.equal(st("The cat sat down.", h("the cat [unk] down")), "read,read,unclear,read");
  assert.equal(st("The cat sat down.", h("the cat cat down")), "read,read,unclear,read");
});

test("restarts and repeats are not mistakes", () => {
  assert.equal(st("The frog can jump.", h("[unk] the frog can jump")), "read,read,read,read");
  assert.equal(st("The frog can jump.", h("the the frog can can jump")), "read,read,read,read");
});

test("a word the recogniser was unsure of is unclear", () => {
  const r = align("The cat sat down.", [...h("the cat"), { word: "sat", conf: 0.3 }, ...h("down")]);
  assert.equal(r.map((w) => w.status).join(","), "read,read,unclear,read");
  assert.ok(!allRead(r));
});

test("nothing heard: every word missed", () => {
  assert.equal(st("I can run fast.", []), "missed,missed,missed,missed");
});

test("sentences with words the phone's model does not know are never offered", () => {
  assert.equal(readable("The guard's hat fell."), false);
  assert.equal(readable("The cat sat down."), true);
  for (const lv of DICTATION.levels) for (const s of pickSentences(lv.id, new Set(), 1)) assert.ok(readable(s.text), s.text);
});

test("a sitting is five sentences at the level, unread ones first, same day same set", () => {
  const a = pickSentences(1, new Set(), 20000);
  assert.equal(a.length, SITTING_SIZE);
  assert.ok(a.every((s) => s.level === 1));
  assert.deepEqual(pickSentences(1, new Set(), 20000), a);
  const b = pickSentences(1, new Set(a.map((s) => s.id)), 20000);
  assert.ok(b.every((s) => !a.some((x) => x.id === s.id)));
});

test("levels: four or five clean moves up, none or one moves down, within the bank's levels", () => {
  assert.equal(nextLevel(1, 5), 2);
  assert.equal(nextLevel(2, 1), 1);
  assert.equal(nextLevel(1, 0), 1);
  assert.equal(nextLevel(3, 3), 3);
  const top = DICTATION.levels.at(-1)!.id;
  assert.equal(nextLevel(top, 5), top);
});
