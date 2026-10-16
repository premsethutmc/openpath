/**
 * Make the Spelling Bee's recordings, offline, with free tools: Piper (an open-source neural text-to-speech program that
 * runs on this computer) and FFmpeg. No paid service, no account, nothing sent anywhere.
 *
 *   1. Download (once) and check the sha256 of:
 *        Piper 2023.11.14-2 for Linux x86-64
 *          https://github.com/rhasspy/piper/releases/download/2023.11.14-2/piper_linux_x86_64.tar.gz
 *          sha256 a50cb45f355b7af1f6d758c1b360717877ba0a398cc8cbe6d2a7a3a26e225992
 *        the voice "Southern English Female (low)", British English, dataset licence CC BY-SA 4.0 (OpenSLR 83)
 *          https://github.com/rhasspy/piper/releases/download/v0.0.2/voice-en-gb-southern_english_female-low.tar.gz
 *          sha256 7c1bbe23e61a57bdb450b137f69a83ff5358159262e1ed7d2308fa14f4924da9
 *      and unpack each into its own folder.
 *   2. From frontend/ (FFmpeg with libmp3lame on the PATH):
 *        node ../tools/english/audio/generate.ts --piper <folder with the piper program> --voice <the .onnx file> [--only id,id]
 *   3. Check (also run by the build and the tests): node ../tools/english/audio/check.ts
 *
 * Each clip: the parts (word; or word, sentence, word) said separately, joined with 0.45 s pauses, a little slower than
 * the voice's normal pace, loudness-normalised, mono MP3 at 32 kbit/s, 22.05 kHz, without metadata. The file is named by
 * the first 16 hex digits of its sha256. Piper's voice has a little randomness, so a new run gives slightly different
 * files (and names); the manifest always records what was made. Old files no longer listed are removed.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { APP_MAP, AUDIO_DIR, type AudioManifest, type Clip, type ClipKind, MANIFEST, appMap, beeScripts, checkBeeAudio, sha256 } from "./bee-audio.ts";

const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
};
const piperDir = arg("piper");
const voice = arg("voice");
if (process.argv.includes("--map-only")) {
  // only rewrite the app's slim copy from the manifest
  writeFileSync(APP_MAP, JSON.stringify(appMap(JSON.parse(readFileSync(MANIFEST, "utf8"))), null, 1) + "\n");
  process.exit(0);
}
if (!piperDir || !voice) {
  console.error("usage: node ../tools/english/audio/generate.ts --piper <folder> --voice <model.onnx> [--only id,id]");
  process.exit(2);
}
const only = arg("only")?.split(",");
const LENGTH_SCALE = "1.15"; // a little slower than the voice's normal pace, for children
const GAP_S = 0.45;

const work = mkdtempSync(join(tmpdir(), "bee-audio-"));
const run = (cmd: string, args: string[], input?: string) => execFileSync(cmd, args, { input, env: { ...process.env, LD_LIBRARY_PATH: piperDir }, stdio: ["pipe", "pipe", "pipe"] });

/** One part said by Piper, as a 16 kHz WAV. */
function say(text: string, n: number): string {
  const out = join(work, `part-${n}.wav`);
  run(join(piperDir!, "piper"), ["--model", voice!, "--length_scale", LENGTH_SCALE, "--output_file", out], text);
  return out;
}
const silence = (seconds: number, name: string) => {
  const out = join(work, name);
  run("ffmpeg", ["-y", "-v", "error", "-f", "lavfi", "-i", `anullsrc=r=16000:cl=mono`, "-t", String(seconds), "-c:a", "pcm_s16le", out]);
  return out;
};
const lead = silence(0.15, "lead.wav");
const gap = silence(GAP_S, "gap.wav");
const tail = silence(0.3, "tail.wav");
let n = 0;

function clip(parts: string[], script: string): Clip {
  const wavs = parts.map((p) => say(p, n++));
  const list = join(work, `list-${n}.txt`);
  const seq = [lead, ...wavs.flatMap((w, i) => (i ? [gap, w] : [w])), tail];
  writeFileSync(list, seq.map((f) => `file '${f}'`).join("\n"));
  const mp3 = join(work, `clip-${n}.mp3`);
  run("ffmpeg", ["-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", list, "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-ac", "1", "-ar", "22050", "-c:a", "libmp3lame", "-b:a", "32k", "-map_metadata", "-1", "-id3v2_version", "0", "-write_id3v1", "0", "-fflags", "+bitexact", "-flags:a", "+bitexact", mp3]);
  const b = readFileSync(mp3);
  const hash = sha256(b);
  const file = `${hash.slice(0, 16)}.mp3`;
  writeFileSync(join(AUDIO_DIR, file), b);
  const ms = Math.round(1000 * Number(String(run("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", mp3])).trim()));
  return { file, sha256: hash, bytes: b.length, ms, script };
}

const previous: AudioManifest | null = (() => {
  try {
    return JSON.parse(readFileSync(MANIFEST, "utf8"));
  } catch {
    return null;
  }
})();
const manifest: AudioManifest = {
  version: 1,
  voice: {
    name: "Southern English Female (low), Piper voice en-gb-southern_english_female-low (espeak en-gb-x-rp)",
    language: "en-GB",
    licence: "CC BY-SA 4.0 (training data: OpenSLR 83, 'Open-source Multi-speaker Corpora of the English Accents in the British Isles'); the recordings are shared under CC BY-SA 4.0",
    source: "https://github.com/rhasspy/piper/releases/download/v0.0.2/voice-en-gb-southern_english_female-low.tar.gz",
    sha256: "7c1bbe23e61a57bdb450b137f69a83ff5358159262e1ed7d2308fa14f4924da9",
  },
  generator: {
    tool: "Piper 2023.11.14-2 (MIT) and FFmpeg (libmp3lame)",
    source: "https://github.com/rhasspy/piper/releases/download/2023.11.14-2/piper_linux_x86_64.tar.gz",
    sha256: "a50cb45f355b7af1f6d758c1b360717877ba0a398cc8cbe6d2a7a3a26e225992",
    settings: `length_scale ${LENGTH_SCALE}; parts joined with ${GAP_S} s pauses; loudnorm I=-16 TP=-1.5 LRA=11; mono MP3 32 kbit/s 22.05 kHz, no metadata`,
  },
  clips: { ...(previous?.clips ?? {}) },
};
for (const s of beeScripts()) {
  if (only && !only.includes(s.id)) continue;
  manifest.clips[s.id] = {
    word: clip([s.spoken], s.scripts.word),
    full: clip([s.spoken, s.sentence, s.spoken], s.scripts.full),
  } as Record<ClipKind, Clip>;
  process.stdout.write(".");
}
// keep only the current words' files
const ids = new Set(beeScripts().map((s) => s.id));
for (const id of Object.keys(manifest.clips)) if (!ids.has(id)) delete manifest.clips[id];
const keep = new Set(Object.values(manifest.clips).flatMap((c) => [c.word.file, c.full.file]));
for (const f of readdirSync(AUDIO_DIR)) if (f.endsWith(".mp3") && !keep.has(f)) unlinkSync(join(AUDIO_DIR, f));
manifest.clips = Object.fromEntries(Object.entries(manifest.clips).sort(([a], [b]) => a.localeCompare(b)));
writeFileSync(MANIFEST, JSON.stringify(manifest, null, 1) + "\n");
writeFileSync(APP_MAP, JSON.stringify(appMap(manifest), null, 1) + "\n");
rmSync(work, { recursive: true, force: true });
const problems = checkBeeAudio(manifest);
console.log(`\n${Object.keys(manifest.clips).length} words; ${problems.length ? `problems:\n${problems.join("\n")}` : "all recordings present and matching"}`);
process.exit(problems.length ? 1 : 0);
