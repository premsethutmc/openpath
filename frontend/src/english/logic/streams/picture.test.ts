/** One picture of a learner: each part's source and range come from the answers stored, and the overall level never outruns them. */
import test from "node:test";
import assert from "node:assert/strict";
import { CHECK, SizeCheckSession, type VocabRecord } from "../vocabulary/size-check.ts";
import { GAP_CHECK, READING_CHECK, TYPED_CHECK, levelsFrom, type LevelCheckRecord } from "./level-check.ts";
import { PRACTICE_LEAST, type Answered, picture, practiceSince } from "./picture.ts";
import type { AppEvent } from "../events.ts";
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

/** A learner whose level on a typed ladder is `a`, answering as the checks assume a learner does (level-check.ts typedBelief). */
function typedLearner(a: number, seed: number) {
  let x = seed * 2654435761 + 12345;
  const rand = () => ((x = (Math.imul(x, 1664525) + 1013904223) >>> 0), x / 4294967296);
  return (level: number) => {
    const k = 1 / (1 + Math.exp(-(2 * (a - level) + 1.4)));
    return rand() < k * 0.875 + (1 - k) * 0.05;
  };
}

test("PIC-4 practice since a short check narrows a typed part's range, the range still holds the learner's level, and no level is lifted by it", () => {
  const TOP = 7;
  let held = 0, n = 0, widthBefore = 0, widthAfter = 0, sureBefore = 0, sureAfter = 0;
  for (const a of [2, 3, 4, 5, 6])
    for (let seed = 1; seed <= 40; seed++) {
      const answer = typedLearner(a, a * 100 + seed);
      // a three-sentence check from the middle, one level up after a right answer and one down after a wrong one
      let level = 4;
      const check: [number, boolean][] = [];
      for (let i = 0; i < 3; i++) {
        const ok = answer(level);
        check.push([level, ok]);
        level = Math.max(1, Math.min(TOP, level + (ok ? 1 : -1)));
      }
      const placed = Math.max(1, Math.min(...check.filter(([, ok]) => ok).map(([l]) => l), level));
      const records: LevelCheckRecord[] = [{ type: "start", mode: "quick" }, { type: "listening", level: placed, scale: 2, check: TYPED_CHECK, steps: steps(check) }, { type: "done" }];
      // practice the way Listen and write moves: five sentences a sitting, up after four right, down after one or none
      let at = placed;
      const practice: Answered[] = [];
      for (let sitting = 0; sitting < 8; sitting++) {
        let right = 0;
        for (let i = 0; i < 5; i++) {
          const ok = answer(at);
          right += ok ? 1 : 0;
          practice.push({ level: at, right: ok });
        }
        at = right >= 4 ? Math.min(TOP, at + 1) : right <= 1 ? Math.max(1, at - 1) : at;
      }
      const before = picture(rows({ words: 3, reading: 3, listening: placed, spelling: 2, grammar: 3 }), levelsFrom(records), records, []).parts[2];
      const after = picture(rows({ words: 3, reading: 3, listening: at, spelling: 2, grammar: 3 }), levelsFrom(records), records, [], { listening: practice }).parts[2];
      n++;
      held += after.low <= a && a <= after.high ? 1 : 0;
      widthBefore += before.high - before.low;
      widthAfter += after.high - after.low;
      sureBefore += before.sure === "fairly sure" ? 1 : 0;
      sureAfter += after.sure === "fairly sure" ? 1 : 0;
      assert.equal(after.at, at, "the level shown is the part's own, never the belief's");
      assert.ok(after.low <= at && at <= after.high, "the range holds the level shown");
    }
  assert.ok(held / n >= 0.85, `the range held the learner's level for ${held} of ${n}`);
  assert.ok(widthAfter / n <= widthBefore / n - 1, `mean width ${(widthBefore / n).toFixed(2)} before, ${(widthAfter / n).toFixed(2)} after`);
  assert.ok(sureAfter > sureBefore * 2, `fairly sure: ${sureBefore} before, ${sureAfter} after, of ${n}`);
});

test("PIC-5 a starting point from the quick check becomes an estimate of the part itself only with enough practice in it", () => {
  const gaps: LevelCheckRecord = { type: "gaps", level: 4, check: GAP_CHECK, steps: steps([[4, true], [6, false], [5, false], [4, true], [5, false], [4, true], [5, true], [6, false], [5, false], [4, true]]) };
  const records: LevelCheckRecord[] = [{ type: "start", mode: "gaps" }, gaps, { type: "done" }];
  const at = rows({ words: 4, reading: 3, listening: 3, spelling: 2, grammar: 3 });
  const few = picture(at, levelsFrom(records), records, [], { listening: [{ level: 3, right: true }, { level: 3, right: true }, { level: 3, right: false }] }).parts[2];
  assert.equal(few.sure, "starting point", "three answers are not enough");
  const answers: Answered[] = [3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 3, 3, 3, 3, 3].map((level) => ({ level, right: level === 3 }));
  assert.ok(answers.length >= PRACTICE_LEAST);
  const many = picture(at, levelsFrom(records), records, [], { listening: answers }).parts[2];
  assert.equal(many.source, "starting point", "where the level first came from does not change");
  assert.equal(many.sure, "fairly sure");
  assert.match(many.note, /^fairly sure, from practice since the quick check/);
  assert.ok(many.low <= 3 && many.high >= 3 && many.high - many.low <= 2, `${many.low} to ${many.high}`);
});

test("PIC-6 practice is read from the record: after the part's own check, typed parts only, a word once", () => {
  const ev = (i: number, e: object) => ({ id: `e${i}`, at: `2026-11-24T00:00:${String(i).padStart(2, "0")}Z`, ...e }) as AppEvent;
  const spell = (i: number, id: string, level: number | undefined, correct: boolean) => ev(i, { kind: "spell_answer", session: "s", source: { type: "bank", id: "spelling-bee" }, word: { id, text: id, level }, response: id, correct });
  const events = [
    spell(1, "early", 2, true), // before the check: not counted
    ev(2, { kind: "level_check", record: { type: "spelling", level: 2, check: TYPED_CHECK, steps: steps([[2, true], [3, false]]) } }),
    ev(3, { kind: "level_check", record: { type: "done" } }),
    spell(4, "bridge", 2, false),
    spell(5, "bridge", 2, true), // asked again after a miss: not fresh
    spell(6, "mine", undefined, true), // a word of the learner's own has no level
    spell(7, "castle", 3, true),
    ev(8, { kind: "dictation", record: { type: "answer", sitting: "d", id: "x", level: 3, scale: 2, tries: 1, perfectFirst: true, perfect: true, right: 5, total: 5, missed: [] } }),
  ];
  const levels = levelsFrom(events.flatMap((e) => (e.kind === "level_check" ? [e.record] : [])));
  assert.deepEqual(practiceSince(events, levels), { spelling: [{ level: 2, right: false }, { level: 3, right: true }] }, "listening was never checked, so its practice is not read");
});
