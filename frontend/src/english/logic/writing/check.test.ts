import test from "node:test";
import assert from "node:assert/strict";
import { checkWriting, sentencesOf, type Note } from "./check.ts";
import { GUIDED } from "../guided/guided.ts";

const T = { min: 30, max: 80 };
const ids = (text: string, target = T) => checkWriting(text, target).notes.map((n) => n.id);
const note = (text: string, id: string, target = T): Note | undefined => checkWriting(text, target).notes.find((n) => n.id === id);
const GOOD = "My school is near the river. It has a large playground, and we play there after lunch. I like the library most because it is quiet. When the bell rings, we walk home together. Our teachers are kind, but they expect hard work.";

test("WC-1 a clean piece gets praise and nothing to fix; the same text always gives the same notes", () => {
  const r = checkWriting(GOOD, T);
  assert.deepEqual([r.words, r.sentences, r.paragraphs], [43, 5, 1]);
  assert.deepEqual(r.notes.filter((n) => n.level !== "good"), []);
  assert.deepEqual(r.notes.map((n) => n.id), ["length", "capital-ok", "linkers-ok"]);
  assert.deepEqual(checkWriting(GOOD, T), r);
  assert.deepEqual(checkWriting("   ", T), { words: 0, sentences: 0, paragraphs: 0, notes: [] });
});

test("WC-2 mechanics: capital letters, end marks, the word I, and spacing", () => {
  const bad = "my dog is brown. he runs fast ,and i like him.He sleeps a lot";
  assert.deepEqual(ids(bad).filter((x) => ["capital", "end", "i", "space-after", "space-before"].includes(x)), ["capital", "end", "i", "space-after", "space-before"]);
  assert.match(note(bad, "capital")!.text, /2 sentences start without a capital letter: “my dog is”, “he runs fast”/);
  assert.equal(note("I saw it at 4.30 p.m. in the hall. It was fun.", "space-after"), undefined, "a time or p.m. is not a spacing slip");
  assert.deepEqual(sentencesOf('He said, "Stop!" Then he ran. Why?'), ['He said, "Stop!"', "Then he ran.", "Why?"]);
});

test("WC-3 sure slips only: spelling and grammar patterns that are never right", () => {
  const bad = "I recieve a apple from my freind. She go to school and we was late. I should of asked. He did not went. It is more better. She ate an banana.";
  assert.match(note(bad, "spelling")!.text, /“recieve” is “receive”; “freind” is “friend”/);
  const g = note(bad, "grammar")!.text;
  for (const part of ["“a apple” should be “an apple”", "“She go”", "“we was” should be “we were”", "“should of” should be “should have”"]) assert.ok(g.includes(part), part);
  // right usages that look similar are left alone
  const fine = "I ate an apple in a uniform. She has a one-rupee coin. It took an hour. He does not go. They were late. It is an honest answer.";
  assert.equal(note(fine, "grammar"), undefined);
  assert.equal(note(fine, "spelling"), undefined);
});

test("WC-4 style: the same opening, a word repeated, weak words, no linking words, one long block", () => {
  const same = "I like my town. I like the shops. I like the park. I like the river. The town is old.";
  assert.match(note(same, "openings")!.text, /4 of your 5 sentences start with “I”/);
  const rep = "The market is busy. The market sells fruit. People love the market. Our market opens early. A market needs space. Every market has noise.";
  assert.match(note(rep, "repeated")!.text, /“market” 6 times/);
  assert.match(note("It was very nice. The food was very good. It was a very big day.", "weak")!.text, /“very”/);
  const plain = "The fair came to our town. We went on Saturday. There were lights everywhere. My brother won a toy. We ate sweets. We came home late. It was a long day. Everyone slept well. The fair left on Monday. We missed it.";
  assert.ok(note(plain, "linkers"));
  const longPiece = `${GOOD} ${GOOD}`;
  assert.ok(note(longPiece, "paragraphs", { min: 60, max: 180 }), "a long piece in one block is asked for paragraphs");
  assert.equal(note(`${GOOD}\n\n${GOOD}`, "paragraphs", { min: 60, max: 180 }), undefined);
  assert.equal(note(longPiece, "paragraphs", { min: 60, max: 120 }), undefined, "a short task is not asked for paragraphs");
});

test("WC-5 the shape of the task: a letter, an argument, a story", () => {
  const body = "I hope you are well. We went to the zoo last week and saw two elephants. Please come and stay with us in the holidays.";
  assert.deepEqual(ids(body, { ...T, form: "letter" }).filter((x) => ["greeting", "closing"].includes(x)), ["greeting", "closing"]);
  assert.deepEqual(ids(`Dear Grandmother, ${body} With love, Meena.`, { ...T, form: "letter" }).filter((x) => ["greeting", "closing"].includes(x)), []);
  assert.deepEqual(ids(`To the Head Teacher. ${body}`, { ...T, form: "formal" }).filter((x) => ["greeting", "closing"].includes(x)), ["closing"]);
  const flat = "Homework is given every day. Pupils do it at home. Some pupils finish quickly. Others take a long time. Teachers mark it the next day.";
  assert.deepEqual(ids(flat, { ...T, form: "argument" }).filter((x) => ["position", "reasons"].includes(x)), ["position", "reasons"]);
  assert.deepEqual(ids(`I believe homework helps because practice makes us sure. ${flat}`, { ...T, form: "argument" }).filter((x) => ["position", "reasons"].includes(x)), []);
  const story = "Ravi lost his key. He looked in his bag. He looked on the road. A girl gave it to him. He thanked her. He went home. His mother smiled. He kept the key safe. He never lost it again. He was glad.";
  assert.ok(note(story, "time", { ...T, form: "narrative" }));
});

test("WC-6 fixes come first, then tips, then praise; and every writing task that has a shape names one the check knows", () => {
  const r = checkWriting("my town is nice. it is very nice and very big and very old", T);
  const levels = r.notes.map((n) => n.level);
  assert.deepEqual(levels, [...levels].sort((a, b) => ["fix", "tip", "good"].indexOf(a) - ["fix", "tip", "good"].indexOf(b)));
  const forms = new Set(GUIDED.tasks.filter((t) => t.write).map((t) => t.form));
  assert.deepEqual([...forms].filter(Boolean).sort(), ["argument", "formal", "letter", "narrative"]);
});
