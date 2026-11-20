import test from "node:test";
import assert from "node:assert/strict";
import { checkWriting, sentencesOf, type Note, type Target } from "./check.ts";
import { GUIDED } from "../guided/guided.ts";

const T: Target = { min: 30, max: 80 };
const ids = (text: string, target: Target = T) => checkWriting(text, target).notes.map((n) => n.id);
const note = (text: string, id: string, target: Target = T): Note | undefined => checkWriting(text, target).notes.find((n) => n.id === id);
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

test("WC-7 the wider lists: joined words, wrong word forms, missing apostrophes, message short forms, doubled marks", () => {
  const bad = "I goed to the libary with alot of childs. I dont know wat u mean!! Plz tell me..";
  assert.match(note(bad, "spelling")!.text, /“libary” is “library”/);
  assert.match(note(bad, "joined")!.text, /“alot” is “a lot”/);
  assert.match(note(bad, "word-form")!.text, /“goed” is “went”; “childs” is “children”/);
  assert.match(note(bad, "apostrophe")!.text, /“dont” is “don't”/);
  assert.match(note(bad, "texting")!.text, /“u”/);
  assert.ok(note(bad, "marks"));
  const fine = "We took a U-turn near Ur. Wait... What a day! She's here, and I don't mind.";
  for (const id of ["spelling", "joined", "word-form", "apostrophe", "texting", "marks"]) assert.equal(note(fine, id), undefined, id);
});

test("WC-8 wider grammar patterns, and the look-alikes they must leave alone", () => {
  const wrong: [string, string][] = [
    ["She doesn't likes tea.", "use the plain verb, not “likes”"], ["We can went now.", "use the plain verb, not “went”"],
    ["I want to went home.", "after “to”"], ["I have went there.", "third form"], ["Ravi was late, and he don't care.", "should be “he doesn't”"],
    ["If they is late, we go.", "they are"], ["I am agree with you.", "“I agree”"], ["Myself Ravi from Madurai.", "“I am Ravi”"],
    ["Its a fine day.", "“it's a”"], ["Your not late.", "“you're not”"], ["Their is a shop.", "“there is”"],
    ["One of my friend is ill.", "“one of my friends”"], ["We discussed about the plan.", "leave out “about”"],
    ["Please reply back soon.", "already means back"], ["I saw the the dog.", "written twice"], ["An banana fell.", "should be “a banana”"],
    ["So he go home.", "the verb takes -s"],
  ];
  for (const [text, part] of wrong) assert.ok(note(text, "grammar")?.text.includes(part), `${text} → ${note(text, "grammar")?.text}`);
  const fine = [
    "Does he have a pen? Did she go home? Can it run? I saw him and let it go.", "I got an A in maths. Is it a or b?", "She did an MBA and sent an SMS.",
    "He can saw the wood and fell the tree.", "Had you gone, I would have come. Its very existence is in doubt.", "Thank you for your welcome. Your going away saddened us.",
    "One of my friend's books is lost. One of the book fairs is here.", "He had had enough. I know that that is true.", "They came in. In the hall it was dark.",
    "I insist that he go. A ewe and a European stood by a one-way road.",
  ];
  for (const text of fine) assert.equal(note(text, "grammar"), undefined, `${text} → ${note(text, "grammar")?.text}`);
});

test("WC-9 no slip the check names is a word our own reading and listening texts use", async () => {
  const { readdirSync, readFileSync, statSync } = await import("node:fs");
  const { join } = await import("node:path");
  const { MISSPELT, JOINED, WRONG_FORM, NO_APOSTROPHE } = await import("./slips.ts");
  const root = new URL("../../../../../content/english/", import.meta.url).pathname;
  const seen = new Set<string>();
  const walk = (dir: string) => { for (const f of readdirSync(dir)) { const p = join(dir, f); if (statSync(p).isDirectory()) walk(p); else if (f.endsWith(".json")) for (const w of readFileSync(p, "utf8").toLowerCase().match(/[a-z][a-z'’-]*/g) ?? []) seen.add(w.replace(/’/g, "'")); } };
  // prose we wrote to be read or heard; spelling and grammar items are left out, as they hold wrong forms on purpose
  for (const dir of ["reading", "listening", "dictation", "guided", "syllabus", "first"]) walk(join(root, dir));
  assert.ok(seen.size > 3000, `content words read: ${seen.size}`);
  const all = { ...MISSPELT, ...JOINED, ...WRONG_FORM, ...NO_APOSTROPHE };
  assert.ok(Object.keys(all).length > 380, `slips known: ${Object.keys(all).length}`);
  assert.deepEqual(Object.keys(all).filter((w) => seen.has(w)), []);
  assert.deepEqual(Object.entries(all).filter(([w, right]) => !right || w === right.toLowerCase()), []);
});

test("WC-10 grammar check, second round: agreement, verb forms, time words, how many, small words", () => {
  const wrong: [string, string][] = [
    ["They goes to school.", "the verb has no -s"], ["The children is happy.", "more than one, so are"], ["Many people has gone.", "so have"],
    ["Everyone are here.", "takes is"], ["There is many shops.", "“there are many”"], ["He was went home.", "one or the other"],
    ["I am go to school.", "“going”"], ["I have see the film.", "third form"], ["I am knowing the answer.", "“know”"],
    ["I am having two brothers.", "“have”"], ["I can able to swim.", "not both"], ["I look forward to meet you.", "“forward to meeting”"],
    ["We enjoy to play.", "-ing form"], ["Yesterday I go to the fair.", "past too"], ["Tomorrow we went there.", "use “will”"],
    ["I live here since five years.", "“for five years”"], ["He has much friends.", "“many friends”"], ["We do not have many water.", "“much water”"],
    ["Every students came.", "name just one"], ["I like these book.", "“books”"], ["This people are kind.", "“these people”"],
    ["I saw a children.", "more than one"], ["He is a ten years old boy.", "“ten-year-old boy”"], ["She said me the truth.", "“said to me”"],
    ["He explained me the sum.", "“explained to me”"], ["She told to me a story.", "“told me”"], ["I listen music daily.", "“listen to music”"],
    ["We went to home.", "“went home”"], ["She is angry on me.", "“angry with”"], ["I am afraid from dogs.", "“afraid of”"],
    ["It depends of the rain.", "“depends on”"], ["I prefer tea than coffee.", "use “to”"], ["She is taller then me.", "“taller than”"],
  ];
  for (const [text, part] of wrong) assert.ok(note(text, "grammar")?.text.includes(part), `${text} → ${note(text, "grammar")?.text}`);
  const fine = [
    "Does everyone have a book? Did they and everyone have fun? Let them all have one.", "The mother of the boys is here. One of the children was ill.",
    "I have come home. She is understanding and kind. I am having a bath.", "I prefer walking rather than running. I would rather go than stay.",
    "It got better then, and we left. There is some milk. Many water bottles were sold.", "Those day trips were fun. These book fairs travel. A children's park is near.",
    "He went to home plate. I have known him since five years ago. We have take-away food.", "They said to me that it was late. He was told to come. I know that they like tea.",
    "Do it now. When the bell rings, we go. Should you need help, call me.", "I saw him go. I heard everyone have a good laugh. She makes them go early.", "An before a silent h is right. We write an with a vowel sound.",
  ];
  for (const text of fine) { assert.equal(note(text, "grammar"), undefined, `${text} → ${note(text, "grammar")?.text}`); assert.equal(note(text, "question"), undefined, text); }
  assert.match(note("Did you see the match. Is it true.", "question")!.text, /These look like a question/);
});

test("WC-11 a slip points to the Grammar in use topic that practises it", async () => {
  const { GRAMMAR } = await import("../grammar-use/grammar-use.ts");
  const { SLIPS } = await import("./slips.ts");
  for (const s of SLIPS) if (s.topic) assert.ok(GRAMMAR.topics.some((x) => x.id === s.topic), s.topic);
  const t = (text: string, id: string) => checkWriting(text, T).notes.find((n) => n.id === id)?.topics;
  assert.deepEqual(t("She have went home and they goes to school.", "grammar")?.sort(), ["agreement", "tenses"]);
  assert.deepEqual(t("I saw a elephant at the zoo today.", "grammar"), ["articles"]);
  assert.deepEqual(t("He goed home with two childs.", "word-form")?.sort(), ["irregular_verbs", "plurals"]);
  assert.deepEqual(t("I dont know.", "apostrophe"), ["contractions"]);
  assert.deepEqual(t("we went home", "capital"), ["capitals"]);
  for (const note of [t("She have went home.", "grammar"), t("I listen music.", "grammar")]) for (const topic of note ?? []) assert.ok(GRAMMAR.topics.some((x) => x.id === topic), topic);
});

test("WC-12 words that sound alike, only where the wrong one cannot fit; and none fires on our own reading and listening texts", async () => {
  const wrong: [string, string][] = [
    ["They lost there books.", "“their books”"], ["They're house is big.", "“their house”"], ["Their going to win.", "“they're going to win”"],
    ["Your welcome.", "“you're welcome”"], ["Your the best.", "“you're the best”"], ["The dog wagged it's tail.", "“its tail”"], ["Who's turn is it?", "“whose turn”"],
    ["Whose coming with me?", "“who's coming”"], ["It was to late.", "“too late”"], ["Were is my bag?", "“Where is”"], ["We where late.", "were”"],
    ["Please switch of the fan.", "“switch off”"], ["Do not loose your pen.", "“not lose”"], ["We are loosing the game.", "“losing”"],
    ["I don't no the answer.", "know”"], ["We ate and than we slept.", "“and then”"], ["Please be quite.", "“be quiet”"],
    ["Take a deep breathe.", "breath” (the noun)"], ["I could not breath.", "breathe” (the verb)"], ["I don't know weather to go.", "whether” (if)"],
  ];
  for (const [text, part] of wrong) assert.ok(note(text, "grammar")?.text.includes(part), `${text} → ${note(text, "grammar")?.text}`);
  const fine = [
    "Are there books in the library? Is there school tomorrow? There are children there.", "Their very own house. Their late father was kind. Your right hand. Their going to the fair was fun. Thank you for your welcome.",
    "It's young people who help. It's a cat. Its tail is long.", "Who did you give them to? I went to school. She came to. Mum asked me to.",
    "The fall of the city. A turn of phrase. Take off the lid. The roof fell off.", "The knot is loose. It is quite good. Be quite sure.",
    "I have no money. We had no idea. There is no answer.", "The weather was hot. Whether or not you come, we go.", "Breathe in. Hold your breath.",
  ];
  for (const text of fine) assert.equal(note(text, "grammar"), undefined, `${text} → ${note(text, "grammar")?.text}`);
  // the prose we wrote to be read or heard never sets one off
  const { SLIPS } = await import("./slips.ts");
  const { readdirSync, readFileSync, statSync } = await import("node:fs");
  const { join } = await import("node:path");
  const root = new URL("../../../../../content/english/", import.meta.url).pathname;
  const texts: string[] = [];
  const grab = (v: unknown): void => { if (typeof v === "string") { if (v.includes(" ")) texts.push(v.replace(/’/g, "'")); } else if (Array.isArray(v)) v.forEach(grab); else if (v && typeof v === "object") Object.values(v).forEach(grab); };
  const walk = (dir: string) => { for (const f of readdirSync(dir)) { const p = join(dir, f); if (statSync(p).isDirectory()) walk(p); else if (f.endsWith(".json")) grab(JSON.parse(readFileSync(p, "utf8"))); } };
  for (const dir of ["reading", "listening", "dictation", "guided", "first"]) walk(join(root, dir));
  assert.ok(texts.length > 1000, `texts: ${texts.length}`);
  const hits = SLIPS.filter((x) => x.topic === "confusables").flatMap((x) => texts.flatMap((t) => [...t.matchAll(new RegExp(x.re.source, x.re.flags))].map((m) => `${m[0]} ← ${t.slice(0, 80)}`)));
  assert.deepEqual(hits, []);
});
