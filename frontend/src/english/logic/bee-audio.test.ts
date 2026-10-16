/**
 * The Spelling Bee's recordings (tools/english/audio/bee-audio.ts): every approved word has both recordings, each saying
 * exactly that word (and its sentence), present, intact and an MP3; the app plays the right files for each word; and
 * anything missing or out of date fails the check the build runs, so it is never discovered by a child.
 */
import assert from "node:assert/strict";
import { copyFileSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { AUDIO_DIR, appMap, beeScripts, checkBeeAudio, readManifest } from "../../../../tools/english/audio/bee-audio.ts";
import { REVIEWS, approvedForPilot, beeApprovedForPilot, loadPilot, type BeeEntry } from "../../../../tools/english/pilot/review.ts";
import beeJson from "../../../../content/english/spelling/spelling-bee.json";
import { loadContent } from "./content.ts";
import { bankWords } from "./spelling.ts";

const manifest = readManifest();

test("BA-1 all 100 approved words have both recordings, present, intact, MP3, saying exactly the word (and its sentence)", () => {
  assert.deepEqual(checkBeeAudio(manifest), []);
  const scripts = beeScripts();
  assert.equal(scripts.length, 100);
  assert.equal(Object.keys(manifest.clips).length, 100);
  for (const s of scripts) {
    const c = manifest.clips[s.id];
    assert.equal(c.word.script, `${s.word}.`, `${s.id}: the word alone`);
    assert.equal(c.full.script, `${s.word}. ${s.sentence} ${s.word}.`, `${s.id}: the word, its sentence, the word again`);
    assert.ok(c.full.ms > c.word.ms, `${s.id}: the sentence recording is the longer one`);
  }
  // 200 different files, no others in the folder, none named after its word
  const files = Object.values(manifest.clips).flatMap((c) => [c.word.file, c.full.file]);
  assert.equal(new Set(files).size, 200);
  assert.deepEqual(readdirSync(AUDIO_DIR).filter((f) => f.endsWith(".mp3")).sort(), [...files].sort());
  // a modest library: about 3 MB in all, no file over 64 KB
  const bytes = Object.values(manifest.clips).reduce((n, c) => n + c.word.bytes + c.full.bytes, 0);
  assert.ok(bytes < 4_000_000, `${bytes} bytes`);
  assert.ok(Object.values(manifest.clips).every((c) => c.word.bytes < 64_000 && c.full.bytes < 64_000));
});

test("BA-2 the app plays each word's own recordings: development and pilot builds alike", () => {
  // a pilot build as build-english.mjs --pilot makes it: the recorded approvals compiled in
  const approved = [...approvedForPilot(loadPilot(), JSON.parse(readFileSync(REVIEWS, "utf8"))), ...beeApprovedForPilot((beeJson as unknown as { words: BeeEntry[] }).words).keys];
  for (const mode of ["development", "pilot"] as const) {
    const words = bankWords(loadContent(mode === "pilot" ? { mode, approved } : { mode }));
    assert.equal(words.length, 100, mode);
    for (const w of words) {
      const c = manifest.clips[w.id];
      assert.deepEqual(w.audio, { word: `audio/${c.word.file}`, full: `audio/${c.full.file}` }, `${mode} ${w.id}`);
      assert.equal(c.word.script, `${w.word}.`, `${w.id}: the recording says this word`);
      assert.ok(!w.audio!.word.includes(w.word) && !w.audio!.full.includes(w.word), "the address never spells the word");
    }
  }
  // the app's slim copy names exactly the manifest's files
  assert.deepEqual(JSON.parse(readFileSync(join(AUDIO_DIR, "bee-audio-files.json"), "utf8")), appMap(manifest));
});

test("BA-3 the build's check fails on a missing word, a missing or changed file, a stale script or a word-named file", () => {
  const dir = mkdtempSync(join(tmpdir(), "bee-audio-"));
  for (const f of readdirSync(AUDIO_DIR)) copyFileSync(join(AUDIO_DIR, f), join(dir, f));
  assert.deepEqual(checkBeeAudio(manifest, undefined, dir), [], "an intact copy passes");
  const m = structuredClone(manifest);
  const [a, b, c, d] = Object.keys(m.clips);
  delete m.clips[a]; // a word without recordings
  m.clips[b].full.script = "something else."; // the content changed since it was recorded
  writeFileSync(join(dir, m.clips[c].word.file), "not an mp3"); // a damaged file
  m.clips[d].word.file = `${d.replace("bee.", "")}0000000000000000`.slice(0, 16) + ".mp3"; // a missing file, named after its word
  const problems = checkBeeAudio(m, undefined, dir).join("\n");
  assert.match(problems, new RegExp(`${a}: no "word" recording`));
  assert.match(problems, new RegExp(`${b}: the "full" recording says "something else\\.", but the content now needs`));
  assert.match(problems, new RegExp(`${c}: the "word" file .* has changed since it was made`));
  assert.match(problems, new RegExp(`${c}: the "word" file is not an MP3`));
  assert.match(problems, new RegExp(`${d}: the "word" file .* is missing`));
  assert.match(problems, /bee-audio-files\.json does not match/);
});
