import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseDictionary, unknownWords } from "./dictionary.ts";
import { checkWriting, type Target } from "./check.ts";
import { MISSPELT, JOINED, WRONG_FORM, NO_APOSTROPHE } from "./slips.ts";

const TEXT = readFileSync(new URL("../../../../../content/english/spelling/speller-words.txt", import.meta.url), "utf8");
const DICT = parseDictionary(TEXT);
const T: Target = { min: 5, max: 300 };
const note = (text: string, id: string) => checkWriting(text, T, DICT).notes.find((n) => n.id === id);

test("SP-1 the list: common words, British and American spellings, Indian English words, no sure slip", () => {
  for (const w of ["the", "because", "beautiful", "colour", "color", "organise", "organize", "travelled", "neighbour", "programme", "learnt", "don't", "i'm", "o'clock", "amma", "dosa", "lakh", "tiffin"]) assert.ok(DICT.has(w), w);
  const slips = Object.keys({ ...MISSPELT, ...JOINED, ...WRONG_FORM, ...NO_APOSTROPHE }).filter((w) => !w.includes("'"));
  assert.deepEqual(slips.filter((w) => DICT.has(w) && !["wether", "leaved", "hided", "ive", "shes", "hasnt", "wont", "cant", "lets", "its", "were", "well", "shell", "hell", "id", "ill", "whats", "thats"].includes(w)), []);
  assert.ok(TEXT.length < 1_000_000, `${TEXT.length} bytes`);
});

test("SP-2 corrections: one edit away, the commoner word first, never a screened word", () => {
  assert.equal(DICT.suggest("frend"), "friend");
  assert.equal(DICT.suggest("becuse"), "because");
  assert.equal(DICT.suggest("hapy"), "happy");
  assert.equal(DICT.suggest("beutiful"), "beautiful");
  assert.equal(DICT.suggest("qqqqzz"), null);
  const blocked = TEXT.slice(TEXT.indexOf("#no-suggest")).split("\n").slice(1).filter(Boolean);
  assert.ok(blocked.length > 50);
  for (const w of blocked.slice(0, 40)) assert.notEqual(DICT.suggest(w + "x"), w, w);
});

test("SP-3 which words are checked: names and sentence-start capitals are left alone; possessives and hyphens are read", () => {
  assert.deepEqual(unknownWords("My frend Priya went to Madurai. Kalyani came too. Ravi's dog is well-behaved. The bird's nest fell.", DICT), ["frend"]);
  assert.deepEqual(unknownWords("Recieve it. We walkd home on the twentyth. The kids' bags were heavvy.", DICT), ["walkd", "twentyth", "heavvy"]);
  assert.deepEqual(unknownWords("NASA and the UN met. I'm sure it's fine, isn't it? See https://www.example.org/qqzz or mail qqzz@example.org, et al.", DICT), []);
});

test("SP-4 in the check: a tip with the likely word, never a fix, and words the sure lists name are not repeated", () => {
  const n = note("My frend and I went to the libary. It was grate fun but we got hungrey.", "unknown")!;
  assert.equal(n.level, "tip");
  assert.match(n.text, /“frend” \(friend\?\), “hungrey” \(hungry\?\)/);
  assert.ok(!n.text.includes("libary"), "already named by the sure list");
  assert.ok(note("My frend and I went to the libary.", "spelling"));
  assert.equal(note("We had dosa and idli for tiffin with Amma. It was tasty.", "unknown"), undefined);
  assert.equal(checkWriting("My frend came.", T).notes.find((x) => x.id === "unknown"), undefined, "without the list, no note");
  const many = note("Aaa bbbx cccx dddx eeex fffx gggx hhhx iiix jjjx.", "unknown")!;
  assert.match(many.text, /and \d+ more/);
});

test("SP-5 none of our own reading, listening or dictation prose is flagged", async () => {
  const { readdirSync } = await import("node:fs");
  const root = new URL("../../../../../content/english/", import.meta.url).pathname;
  const texts: string[] = [];
  const grab = (v: unknown, key = ""): void => {
    if (typeof v === "string") { if (v.split(" ").length >= 6 && !/id$|^(answer|accept)/.test(key)) texts.push(v); }
    else if (Array.isArray(v)) v.forEach((x) => grab(x, key));
    else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) grab(x, k);
  };
  for (const d of ["reading", "listening", "dictation"]) for (const f of readdirSync(root + d)) if (f.endsWith(".json")) grab(JSON.parse(readFileSync(`${root}${d}/${f}`, "utf8")));
  assert.ok(texts.length > 1000);
  const hits = new Map<string, number>();
  for (const t of texts) for (const w of unknownWords(t, DICT)) hits.set(w, (hits.get(w) ?? 0) + 1);
  // allowed: words of our own passages that a general list lacks; kept short and named so a new one is seen
  const ALLOWED = new Set<string>([]);
  assert.deepEqual([...hits.keys()].filter((w) => !ALLOWED.has(w)).sort(), []);
});
