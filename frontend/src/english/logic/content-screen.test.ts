/**
 * The house word screen (content/english/spelling/blocklist.txt), applied to every piece of practice content the
 * app writes for children: new words, dictation, grammar, listening passages, reading texts, the Spelling Bee's
 * meanings and the class syllabuses. The same list already screens the spelling word bank. It is a first screen,
 * not a review: a word on the list may not appear, as a whole word, in anything a child reads or hears.
 * A new file of content must be added here, or the last test fails.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("../../../../content/english/", import.meta.url).pathname;
const BLOCKED = new Set(
  readFileSync(join(ROOT, "spelling/blocklist.txt"), "utf8")
    .split("\n")
    .filter((l) => !l.startsWith("#"))
    .flatMap((l) => l.split(/\s+/).filter(Boolean)),
);
const flagged = (text: string) => [...new Set(text.toLowerCase().match(/[a-z']+/g) ?? [])].filter((w) => BLOCKED.has(w));

/** Every string a child could meet in a content file (keys that only describe the file are left out). */
const META = new Set(["status", "review", "evidence", "format", "licence", "source", "checked", "id", "version", "board"]);
function strings(x: unknown, out: string[] = []): string[] {
  if (typeof x === "string") out.push(x);
  else if (Array.isArray(x)) x.forEach((v) => strings(v, out));
  else if (x && typeof x === "object") for (const [k, v] of Object.entries(x)) if (!META.has(k)) strings(v, out);
  return out;
}

const SCREENED = ["vocabulary/daily-words.json", "vocabulary/size-check.json", "dictation/sentences.json", "grammar/in-use.json", "listening/passages.json", "spelling/bee-meanings.json", "guided/tasks.json", "reading/course.json", "reading/level-1.json", "reading/level-2.json", "reading/level-3.json", "reading/level-4.json", "reading/level-5.json", "reading/level-6.json", "syllabus/icse-class-4.json", "syllabus/icse-class-5.json", "syllabus/icse-class-6.json"];

test("CS-1 the screen holds the words it is there for, and matches whole words only", () => {
  assert.ok(BLOCKED.size > 150);
  assert.deepEqual(flagged("The weapon was hidden in the temple."), ["weapon", "temple"]);
  assert.deepEqual(flagged("A butterfly sat on the button; the classes began."), [], "not parts of longer words");
});

for (const file of SCREENED)
  test(`CS-2 ${file}: nothing a child reads or hears is on the screen`, () => {
    const hits = strings(JSON.parse(readFileSync(join(ROOT, file), "utf8"))).flatMap((s) => flagged(s).map((w) => `${w}: ${s.slice(0, 70)}`));
    assert.deepEqual(hits, []);
  });

test("CS-3 every content file written for these activities is screened", () => {
  const found: string[] = [];
  for (const dir of ["vocabulary", "dictation", "grammar", "listening", "reading", "syllabus"]) for (const f of readdirSync(join(ROOT, dir))) if (f.endsWith(".json") && statSync(join(ROOT, dir, f)).isFile()) found.push(`${dir}/${f}`);
  assert.deepEqual(found.filter((f) => !SCREENED.includes(f)), [], "add the new file to SCREENED");
});
