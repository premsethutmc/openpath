import assert from "node:assert/strict";
import { test } from "node:test";
import { type ClueState, SAMPLE_WORDS, completionOf, helpAfterWrong, helpOffer, judgeChange, maxReveal, nextClue, pattern, slips, takeClue } from "./logic.ts";

const W = Object.fromEntries(SAMPLE_WORDS.map((w) => [w.word, w]));

test("input: one letter at a time is accepted; Backspace (one or several) is accepted", () => {
  assert.deepEqual(judgeChange("pre", "pref"), { kind: "add", letter: "f" });
  assert.deepEqual(judgeChange("pre", "preF"), { kind: "add", letter: "f" }, "capitals are lowered, not rejected");
  assert.deepEqual(judgeChange("pref", "pre", "deleteContentBackward"), { kind: "remove", count: 1 });
  assert.deepEqual(judgeChange("prefer", "pre", "deleteWordBackward"), { kind: "remove", count: 3 });
  assert.deepEqual(judgeChange("", "t", "insertCompositionText"), { kind: "add", letter: "t" }, "Android composition, letter by letter");
  assert.deepEqual(judgeChange("pre", "pre"), { kind: "none" });
});

test("input: pastes, suggestions, autocorrect and edits in the middle are rejected", () => {
  assert.equal(judgeChange("", "preferred", "insertFromPaste").kind, "reject");
  assert.deepEqual(judgeChange("pref", "preferred", "insertReplacementText"), { kind: "reject", reason: "replacement" });
  assert.deepEqual(judgeChange("pref", "preferred", "insertCompositionText"), { kind: "reject", reason: "suggestion" }, "a suggestion committed through composition");
  assert.deepEqual(judgeChange("prefered", "preferred "), { kind: "reject", reason: "suggestion" }, "autocorrect plus the space it adds");
  assert.deepEqual(judgeChange("thier", "their", "insertText"), { kind: "reject", reason: "replacement" }, "autocorrect swapping letters");
  assert.deepEqual(judgeChange("pre", "pre "), { kind: "reject", reason: "not_a_letter" });
  assert.deepEqual(judgeChange("prf", "pref"), { kind: "reject", reason: "replacement" }, "a letter inserted in the middle");
  assert.deepEqual(judgeChange("they", "they'"), { kind: "add", letter: "'" });
});

test("clues: offered at 8, 15 and 25 active seconds, never while typing, spaced after a clue; letters only on request", () => {
  const w = "preferred";
  let c: ClueState = { level: 0, revealed: 0, lastClueAt: null };
  assert.equal(helpOffer(c, w, 7.9, 10), false);
  assert.equal(helpOffer(c, w, 8, 10), true);
  assert.equal(helpOffer(c, w, 9, 1), false, "the child is typing: wait");
  c = takeClue(c, w, 9);
  assert.equal(c.level, 1);
  assert.equal(helpOffer(c, w, 15, 10), false, "7 s after the last clue");
  assert.equal(helpOffer(c, w, 16, 10), true);
  c = takeClue(c, w, 16);
  c = takeClue(c, w, 26);
  assert.deepEqual([c.level, c.revealed], [3, 1]);
  assert.equal(nextClue(c, w), 4);
  assert.equal(helpOffer(c, w, 100, 100), false, "more letters are never pushed");
  assert.deepEqual(pattern(w, c.revealed).join(""), "p________");
});

test("clues: letters never reveal the whole word", () => {
  let c: ClueState = { level: 3, revealed: 1, lastClueAt: 0 };
  for (let k = 0; k < 20; k++) c = takeClue(c, "their", 10 * k);
  assert.equal(c.revealed, maxReveal("their"));
  assert.equal(c.revealed, 4);
  assert.equal(nextClue(c, "their"), null);
});

test("slips: doubling, homophones, swaps; unrecognised falls back to 'other'", () => {
  assert.deepEqual(slips(W.preferred, "prefered"), ["missed_double"]);
  assert.deepEqual(slips(W.necessary, "neccessary"), ["extra_double"]);
  assert.deepEqual(slips(W.necessary, "necesary"), ["missed_double"]);
  assert.deepEqual(slips(W.their, "there"), ["other_word"]);
  assert.deepEqual(slips(W.friend, "freind"), ["swapped_letters"]);
  assert.deepEqual(slips(W.friend, "friend"), []);
});

test("help: left-to-right without support; targeted once two different words share the slip", () => {
  assert.deepEqual(helpAfterWrong(W.preferred, "prefered", []), { kind: "from_start", keep: 6 });
  const h = helpAfterWrong(W.preferred, "prefered", [{ word: "stopped", pattern: "missed_double" }]);
  assert.equal(h.kind, "targeted");
  assert.equal(h.kind === "targeted" && h.marker, 5, "the doubled r starts at index 5");
  assert.deepEqual(helpAfterWrong(W.their, "there", []), { kind: "other_word" });
});

test("completion: independent, assisted, guided", () => {
  const ok = { answer: "x", correct: true, atActiveMs: 0, lettersAdded: 0, lettersRemoved: 0, afterHelp: null };
  const bad = { ...ok, correct: false };
  assert.equal(completionOf({ attempts: [ok], lettersRevealed: 0, finalCorrect: true, clues: [{ level: 1, atActiveMs: 0 }, { level: 2, atActiveMs: 0 }] }, "friend"), "independent", "sentence and meaning do not reveal letters");
  assert.equal(completionOf({ attempts: [ok], lettersRevealed: 1, finalCorrect: true, clues: [{ level: 3, atActiveMs: 0 }] }, "friend"), "assisted");
  assert.equal(completionOf({ attempts: [bad, ok], lettersRevealed: 0, finalCorrect: true, clues: [] }, "friend"), "assisted");
  assert.equal(completionOf({ attempts: [ok], lettersRevealed: 3, finalCorrect: true, clues: [{ level: 4, atActiveMs: 0 }] }, "friend"), "guided");
  assert.equal(completionOf({ attempts: [bad, bad], lettersRevealed: 0, finalCorrect: false, clues: [] }, "friend"), "not_completed");
});
