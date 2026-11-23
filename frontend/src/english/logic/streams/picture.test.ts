/** One picture of a learner: each part's source and range come from the answers stored, and the overall level never outruns them. */
import test from "node:test";
import assert from "node:assert/strict";
import { CHECK, SizeCheckSession, type VocabRecord } from "../vocabulary/size-check.ts";
import { GAP_CHECK, READING_CHECK, TYPED_CHECK, levelsFrom, type LevelCheckRecord } from "./level-check.ts";
import { picture } from "./picture.ts";
import type { StreamRow } from "./streams.ts";

const row = (id: StreamRow["id"], name: string, at: number, of: number): StreamRow => ({ id, icon: "•", name, level: `Level ${at} of ${of}`, at, of, up: "", next: "", doneToday: false });
const rows = (at: { words: number; reading: number; listening: number; spelling: number; grammar: number }) => [row("words", "Words", at.words, 8), row("reading", "Reading", at.reading, 6), row("listening", "Listening", at.listening, 7), row("spelling", "Spelling", at.spelling, 5), row("grammar", "Grammar", at.grammar, 7)];
const steps = (pairs: [number, boolean][]) => pairs.map(([level, ok], i) => ({ id: `s${i}`, word: `w${i}`, level, perfect: ok, correct: ok }));
/** The word check sat by a learner who knows the words up to a level. */
function words(knowsUpTo: number): VocabRecord[] {
  const s = new SizeCheckSession(CHECK, 4);
  for (let v = s.snapshot(); v.phase === "asking"; v = s.snapshot()) {
    const w = CHECK.words.find((x) => x.word === v.item!.word);
    if (v.item!.kind === "know") s.answer(!!w && w.band <= knowsUpTo);
    else s.answer(w!.band <= knowsUpTo ? w!.answer : null);
  }
  return s.take();
}

test("PIC-1 nothing checked: every part says so, and there is no overall level", () => {
  const p = picture(rows({ words: 2, reading: 3, listening: 3, spelling: 2, grammar: 3 }), levelsFrom([]), [], []);
  assert.ok(p.parts.every((x) => x.source === "not checked" && x.sure === "not checked yet" && /started by age/.test(x.note)));
  assert.deepEqual([p.overall, p.overallSure], [null, "not checked yet"]);
});

test("PIC-2 the quick gap check: every part is a starting point with a range, and the overall level is the one it measured", () => {
  const gaps: LevelCheckRecord = { type: "gaps", level: 4, check: GAP_CHECK, steps: steps([[4, true], [6, false], [5, false], [4, true], [5, false], [4, true], [5, true], [6, false], [5, false], [4, true]]) };
  const records: LevelCheckRecord[] = [{ type: "start", mode: "gaps" }, gaps, { type: "done" }];
  const levels = levelsFrom(records);
  const p = picture(rows({ words: 5, reading: 3, listening: 2, spelling: 2, grammar: 3 }), levels, records, []);
  assert.ok(p.parts.every((x) => x.source === "starting point" && x.sure === "starting point" && x.low <= x.at && x.at <= x.high && x.high > x.low), JSON.stringify(p.parts.map((x) => [x.id, x.low, x.at, x.high])));
  assert.match(p.parts[2].note, /^a starting point from the quick check: could be level \d to \d$/);
  assert.equal(p.overall, 4, "the overall level is the one the gap check measured");
  assert.ok(p.low <= 4 && p.high >= 4 && p.high - p.low <= 3 && ["fairly sure", "first estimate"].includes(p.overallSure), `${p.low} to ${p.high}`);
});

test("PIC-3 a long check leaves a narrow range and a short one a wide range; a measured part replaces a starting point", () => {
  const vocab = words(4);
  const band = levelsFrom([]).words;
  assert.equal(band, null);
  const full: LevelCheckRecord[] = [
    { type: "start", mode: "full" },
    { type: "words", band: 4, scale: CHECK.version, answered: 22 },
    { type: "reading", passed: 6, scale: 2, check: READING_CHECK, steps: [{ level: 3, right: 6, asked: 6 }, { level: 6, right: 6, asked: 6 }] },
    { type: "listening", level: 3, scale: 2, check: TYPED_CHECK, steps: steps([[3, true], [4, false], [3, true], [4, false], [3, true], [4, false]]) },
    { type: "spelling", level: 1, check: TYPED_CHECK, steps: steps([[3, false], [2, false], [1, true], [1, true], [2, false], [1, true], [2, false], [2, false]]) },
    { type: "done" },
  ];
  const p = picture(rows({ words: 5, reading: 6, listening: 3, spelling: 1, grammar: 3 }), levelsFrom(full), full, vocab);
  const by = Object.fromEntries(p.parts.map((x) => [x.id, x]));
  assert.deepEqual([by.words.source, by.reading.source, by.listening.source, by.spelling.source, by.grammar.source], ["measured", "measured", "measured", "measured", "not checked"]);
  assert.equal(by.words.sure, "fairly sure");
  assert.ok(by.words.low >= 3 && by.words.high <= 5, `words ${by.words.low} to ${by.words.high}`);
  assert.equal(by.listening.sure, "fairly sure");
  assert.ok(by.listening.low <= 3 && by.listening.high >= 3 && by.listening.high <= 4);
  assert.equal(p.overall, null, "no overall number without the gap check: the parts' ladders are not averaged");
  // the same listening level from three sentences is only a first estimate, with more left open
  const short: LevelCheckRecord[] = [{ type: "listening", level: 3, scale: 2, check: TYPED_CHECK, steps: steps([[5, false], [3, true], [3, true]]) }];
  const q = picture(rows({ words: 2, reading: 3, listening: 3, spelling: 2, grammar: 3 }), levelsFrom(short), short, []).parts[2];
  assert.equal(q.source, "measured");
  assert.ok(q.high - q.low > by.listening.high - by.listening.low, `three sentences ${q.low} to ${q.high}; six ${by.listening.low} to ${by.listening.high}`);
  // practice that moved the level since the check is always inside the range
  const moved = picture(rows({ words: 2, reading: 3, listening: 6, spelling: 2, grammar: 3 }), levelsFrom(short), short, []).parts[2];
  assert.ok(moved.low <= 6 && moved.high >= 6);
  // a part measured after the gap check is no longer a starting point
  const after: LevelCheckRecord[] = [{ type: "gaps", level: 6, check: GAP_CHECK, steps: steps([[6, true], [6, true]]) }, ...short];
  const r = picture(rows({ words: 7, reading: 4, listening: 3, spelling: 4, grammar: 5 }), levelsFrom(after), after, []);
  assert.deepEqual([r.parts[2].source, r.parts[3].source], ["measured", "starting point"]);
  assert.equal(r.overall, 6);
});
