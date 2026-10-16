/**
 * The Spelling Bee's recorded audio: what each recording must say, and the check that every approved word has its
 * recordings (run by the build, frontend/scripts/build-english.mjs, and by the tests). A missing, changed or
 * mismatched recording fails the build; it is never discovered by a child.
 *
 * Each of the 100 words has two recordings (content/english/spelling/audio/):
 *   word  the word alone ("friend."), played by the speaker button after the first time;
 *   full  the word, its example sentence, the word again ("friend. My best friend lives next door. friend."), played
 *         automatically for each new word and by "Hear it in a sentence", the assessment design the app already used.
 * Files are MP3 (mono), named by their own content hash, so a file name never spells the word and can be cached
 * forever. The manifest (bee-audio.json) records, for every clip, the exact words it was made from: if a word or a
 * sentence changes in the content, its recording no longer matches and the check fails until it is made again
 * (tools/english/audio/generate.ts).
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

export const REPO = new URL("../../../", import.meta.url).pathname;
export const AUDIO_DIR = join(REPO, "content", "english", "spelling", "audio");
export const MANIFEST = join(AUDIO_DIR, "bee-audio.json");
/** The app's slim copy, file names only (bee-audio-files.json, imported by logic/spelling.ts): kept equal to the manifest. */
export const APP_MAP = join(AUDIO_DIR, "bee-audio-files.json");
export const appMap = (m: AudioManifest) => Object.fromEntries(Object.entries(m.clips).map(([id, c]) => [id, { word: c.word.file, full: c.full.file }]));
const BEE = join(REPO, "content", "english", "spelling", "spelling-bee.json");
const DICTATION = join(REPO, "content", "english", "spelling", "dictation-bank.json");

export type ClipKind = "word" | "full";
export interface Clip {
  file: string;
  sha256: string;
  bytes: number;
  ms: number;
  /** What the recording says, exactly as it was made. */
  script: string;
}
export interface AudioManifest {
  version: 1;
  voice: { name: string; language: string; licence: string; source: string; sha256: string };
  generator: { tool: string; source: string; sha256: string; settings: string };
  clips: Record<string, Record<ClipKind, Clip>>;
}
export interface BeeScript {
  id: string;
  word: string;
  /** The word as the voice should say it (the dictation bank's `speak`, which is the word itself today). */
  spoken: string;
  sentence: string;
  scripts: Record<ClipKind, string>;
}

/** The two scripts of a word: what its recordings must say. */
export const scriptsFor = (spoken: string, sentence: string): Record<ClipKind, string> => ({ word: `${spoken}.`, full: `${spoken}. ${sentence} ${spoken}.` });

/** Every Spelling Bee word, with what its recordings must say, from the content (not from the app). */
export function beeScripts(): BeeScript[] {
  const bee = JSON.parse(readFileSync(BEE, "utf8")) as { words: { id: string; item?: { id: string; version: number }; word?: string; sentence?: string }[] };
  const raw = JSON.parse(readFileSync(DICTATION, "utf8")) as { items: { id: string; version: number; speak?: string; sentence?: string; answers: string[] }[] } | { id: string; version: number; speak?: string; sentence?: string; answers: string[] }[];
  const items = new Map((Array.isArray(raw) ? raw : raw.items).map((i) => [i.id, i]));
  return bee.words.map((e) => {
    if (e.item) {
      const it = items.get(e.item.id);
      if (!it || it.version !== e.item.version) throw new Error(`${e.id}: its dictation question ${e.item.id}@${e.item.version} is missing`);
      const spoken = it.speak ?? it.answers[0];
      return { id: e.id, word: it.answers[0], spoken, sentence: it.sentence ?? "", scripts: scriptsFor(spoken, it.sentence ?? "") };
    }
    return { id: e.id, word: e.word!, spoken: e.word!, sentence: e.sentence ?? "", scripts: scriptsFor(e.word!, e.sentence ?? "") };
  });
}

export const sha256 = (b: Buffer | string) => createHash("sha256").update(b).digest("hex");

/** An MP3 file: an ID3 tag or an MPEG audio frame at the start. */
export const looksLikeMp3 = (b: Buffer) => (b[0] === 0x49 && b[1] === 0x44 && b[2] === 0x33) || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0);

/**
 * Check the recordings for the given words (all 100 by default). Returns the problems, empty when every word has both
 * recordings, each saying exactly its current script, present, intact (sha256), an MP3, of a sensible length, and named
 * so that the name never contains the word.
 */
export function checkBeeAudio(manifest: AudioManifest, ids?: Iterable<string>, dir = AUDIO_DIR): string[] {
  const problems: string[] = [];
  const scripts = new Map(beeScripts().map((s) => [s.id, s]));
  const wanted = ids ? [...ids] : [...scripts.keys()];
  const files = new Set<string>();
  for (const id of wanted) {
    const s = scripts.get(id);
    if (!s) {
      problems.push(`${id}: not a Spelling Bee word`);
      continue;
    }
    for (const kind of ["word", "full"] as const) {
      const c = manifest.clips[id]?.[kind];
      if (!c) {
        problems.push(`${id}: no "${kind}" recording`);
        continue;
      }
      if (c.script !== s.scripts[kind]) problems.push(`${id}: the "${kind}" recording says "${c.script}", but the content now needs "${s.scripts[kind]}" (make it again)`);
      if (!/^[0-9a-f]{16}\.mp3$/.test(c.file) || c.file.toLowerCase().includes(s.word.toLowerCase())) problems.push(`${id}: the "${kind}" file name "${c.file}" is not an opaque content hash`);
      if (files.has(c.file)) problems.push(`${id}: the "${kind}" file ${c.file} is shared with another clip`);
      files.add(c.file);
      const path = join(dir, c.file);
      if (!existsSync(path)) {
        problems.push(`${id}: the "${kind}" file ${c.file} is missing`);
        continue;
      }
      const b = readFileSync(path);
      if (sha256(b) !== c.sha256 || statSync(path).size !== c.bytes) problems.push(`${id}: the "${kind}" file ${c.file} has changed since it was made`);
      if (!c.sha256.startsWith(c.file.slice(0, 16))) problems.push(`${id}: the "${kind}" file name does not match its content`);
      if (!looksLikeMp3(b)) problems.push(`${id}: the "${kind}" file is not an MP3`);
      // a word alone takes at least 0.3 s; a word, a sentence and the word again at least 1.5 s; nothing over 20 s
      const [lo, hi] = kind === "word" ? [300, 6000] : [1500, 20000];
      if (!(c.ms >= lo && c.ms <= hi)) problems.push(`${id}: the "${kind}" recording lasts ${c.ms} ms (expected ${lo}–${hi})`);
    }
  }
  // the app's copy must name exactly the manifest's files
  try {
    const app = JSON.parse(readFileSync(join(dir, "bee-audio-files.json"), "utf8"));
    if (JSON.stringify(app) !== JSON.stringify(appMap(manifest))) problems.push("bee-audio-files.json does not match bee-audio.json (make the recordings again, or run generate.ts --map-only)");
  } catch {
    problems.push("bee-audio-files.json is missing");
  }
  return problems;
}

export const readManifest = (path = MANIFEST): AudioManifest => JSON.parse(readFileSync(path, "utf8"));
