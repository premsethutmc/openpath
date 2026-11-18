/**
 * Learning help in spelling: what each step of help shows, how a miss is marked, that help is practice and not
 * proof, that a test takes no help, and what the parent sees for a list.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { loadContent } from "./content.ts";
import { testClock } from "./journey-sim.ts";
import { Learner } from "./learner.ts";
import { helpPattern, letterMarks, maxHelpTaps, maxLetterHelp } from "./spelling-help.ts";
import { MemoryRepo } from "./store.ts";
import { parseWords } from "./wordlists.ts";

const c = loadContent({ mode: "development" });
const marks = (right: string, typed: string) => letterMarks(right, typed).map((m) => (m.ok ? m.ch : `[${m.ch}]`)).join("");

test("SH-1 help: blanks first, then one letter at a time, never the last letter", () => {
  assert.equal(helpPattern("beautiful", 0), "");
  assert.equal(helpPattern("beautiful", 1), "_ _ _ _ _ _ _ _ _");
  assert.equal(helpPattern("beautiful", 2), "b _ _ _ _ _ _ _ _");
  assert.equal(helpPattern("beautiful", 5), "b e a u _ _ _ _ _");
  assert.equal(helpPattern("beautiful", 99), "b e a u t i f u _");
  assert.equal(maxLetterHelp("beautiful"), 8);
  assert.equal(maxHelpTaps("beautiful"), 9);
  assert.equal(helpPattern("ice cream", 3), "i c _ / _ _ _ _ _", "a space is shown as a break");
  assert.equal(helpPattern("don't", 2), "d _ _ ' _");
  for (let t = 0; t <= 12; t++) assert.ok(!helpPattern("beautiful", t).replaceAll(" ", "").includes("beautiful"), "the whole word is never spelt out by letter help");
  assert.equal(maxHelpTaps("a"), 1);
});

test("SH-2 a miss is marked letter by letter against the right spelling", () => {
  assert.equal(marks("beautiful", "beatiful"), "bea[u]tiful");
  assert.equal(marks("necessary", "neccesary"), "nec[e][s]sary");
  assert.equal(marks("friend", "freind"), "fr[i][e]nd", "a swapped pair: both letters");
  assert.equal(marks("because", "becuase"), "bec[a][u]se");
  assert.equal(marks("quiet", "quite"), "qui[e][t]");
  assert.equal(marks("separate", "seperate"), "sep[a]rate");
  assert.equal(marks("cat", ""), "[c][a][t]");
  assert.equal(marks("Madurai", "madurai"), "Madurai", "case is not a letter mistake here");
  assert.equal(marks("cat", "cat"), "cat");
});

async function withLists() {
  const repo = new MemoryRepo();
  const l = await Learner.create(c, repo, "Speller", "guardian", testClock(), "p-spell");
  const words = parseWords("garden, bridge, honest, quiet").words;
  const practice = await l.saveWordList("Week 12", words, undefined, "practice");
  const testList = await l.saveWordList("Friday test", words, undefined, "test");
  const plain = await l.saveWordList("Old list", words);
  return { l, repo, practice, testList, plain };
}

test("SH-3 practice: a new word is flagged to be shown first; help or a first look is recorded and does not count as known", async () => {
  const { l, practice } = await withLists();
  await l.startSpelling({ type: "list", id: practice });
  let s = l.spellingSession()!;
  assert.equal(s.mode, "practice");
  assert.equal(s.fresh, true, "never answered: shown first");
  const order = [s.word!.word];
  await l.answerSpelling(s.word!.word, 1, { studied: true });
  s = l.spellingSession()!;
  order.push(s.word!.word);
  await l.answerSpelling(s.word!.word, 1, { help: 3 });
  s = l.spellingSession()!;
  order.push(s.word!.word);
  await l.answerSpelling("zzz", 1);
  s = l.spellingSession()!;
  order.push(s.word!.word);
  await l.answerSpelling(s.word!.word, 1);
  assert.equal(l.spellingSession(), null, "the session ended after its last word");
  const by = Object.fromEntries(l.listResults(practice).map((r) => [r.word, r]));
  assert.deepEqual(order.map((w) => by[w].status), ["with_help", "with_help", "wrong", "unaided"]);
  assert.equal(by[order[2]].lastTyped, "zzz");
  assert.deepEqual(l.listResults(practice).map((r) => r.status), ["wrong", "with_help", "with_help", "unaided"], "hardest first");
  // the three that were not spelt unaided come back next session as reviews; the one that was does not
  const st = l.spelling();
  const due = order.filter((w) => st.words.get(`list:${practice}/${w}`)!.box === 0);
  assert.deepEqual(due, order.slice(0, 3));
  await l.startSpelling({ type: "list", id: practice });
  const again = l.spellingSession()!;
  assert.equal(again.fresh, false, "a word met before is asked, not shown");
  assert.ok(order.slice(0, 3).includes(again.word!.word));
});

test("SH-4 a test: no help can be recorded, and a plain list behaves as before", async () => {
  const { l, repo, testList, plain } = await withLists();
  await l.startSpelling({ type: "list", id: testList });
  const s = l.spellingSession()!;
  assert.equal(s.mode, "test");
  await l.answerSpelling(s.word!.word, 1, { help: 5, studied: true });
  const answer = (await repo.load("p-spell")).filter((e) => e.kind === "spell_answer").at(-1)!;
  assert.ok(!("help" in answer) && !("studied" in answer), "a test answer carries no help");
  assert.equal(l.listResults(testList).find((r) => r.word === s.word!.word)!.status, "unaided");
  await l.startSpelling({ type: "list", id: plain });
  assert.equal(l.spellingSession()!.mode, undefined);
  assert.equal(l.wordLists().find((x) => x.id === plain)!.mode, undefined);
  assert.equal(l.wordLists().find((x) => x.id === testList)!.mode, "test");
  assert.deepEqual(l.listResults("no-such-list"), []);
});
