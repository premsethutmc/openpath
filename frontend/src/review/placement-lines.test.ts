/** placements@1: the lines the owner reads are worked out from the answers, and judge nothing. */
import test from "node:test";
import assert from "node:assert/strict";
import { type Placements, byLevel, invented, ok, resultLine, summaryText, wordsLine } from "./placement-lines.ts";

const words = {
  part: "words" as const, at: "2026-11-24T02:01:00Z", start: 4, level: 5, low: 4, high: 6, finished: true,
  answers: [
    { level: 4, kind: "know" as const, outcome: "yes" as const, asked: "candid" },
    { level: 6, kind: "know" as const, outcome: "no" as const, asked: "cogent" },
    { level: 0, kind: "know" as const, outcome: "yes" as const, asked: "blenfor" },
    { level: 0, kind: "know" as const, outcome: "no" as const, asked: "trask" },
    { level: 6, kind: "pick" as const, outcome: "wrong" as const, asked: "abhor" },
    { level: 4, kind: "pick" as const, outcome: "right" as const, asked: "frugal" },
  ],
};
const reading = { part: "reading" as const, at: "2026-11-24T02:05:00Z", mode: "full", level: 2, finished: true, answers: [{ level: 3, right: 2, asked: 6 }, { level: 2, right: 5, asked: 6 }] };
const unnamed = { part: "spelling" as const, at: "2026-11-24T02:09:00Z", mode: "quick", level: 2, answers: [{ level: 2, right: true }, { level: 4, right: false }] };

test("PL-1 a sitting reads as its result, its answers by level, and the invented words claimed", () => {
  assert.equal(resultLine(words), "level 5 of 8, could be 4 to 6");
  assert.equal(byLevel(words), "L4 ✓✓ · L6 ✗✗");
  assert.deepEqual(invented(words), { asked: 2, claimed: 1 });
  assert.equal(ok(words.answers[3]), true, "saying no to an invented word is right");
  assert.equal(wordsLine(words), "candid (4) said knows · cogent (6) said does not know · blenfor (invented) said knows · trask (invented) said does not know · abhor (6) wrong · frugal (4) right");
  assert.equal(byLevel(reading), "L2 5/6 · L3 2/6");
  assert.equal(resultLine({ ...words, level: null }), "not finished");
  assert.equal(wordsLine(unnamed), "", "a learner without a name has no words to show");
});

test("PL-2 the text to copy holds every learner and sitting, and no word for a learner shown without a name", () => {
  const d: Placements = { days: 60, everyone: true, placements: [{ learner: "Friend", mine: true, shared: false, sittings: [words, reading] }, { learner: "Learner 1", mine: false, shared: false, sittings: [unnamed] }] };
  const t = summaryText(d);
  assert.match(t, /^Placements, last 60 days/);
  assert.match(t, /\nFriend\n- Word check, 2026-11-24 02:01: level 5 of 8, could be 4 to 6, started at 4, 6 answers\n  L4 ✓✓ · L6 ✗✗ · invented words claimed 1 of 2\n  candid \(4\) said knows/);
  assert.match(t, /\nLearner 1 \(no name\)\n- Spelling, 2026-11-24 02:09: level 2, 2 answers\n  L2 ✓ · L4 ✗$/);
});
