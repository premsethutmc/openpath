/**
 * Check that every Spelling Bee word has both of its recordings, each saying exactly its current script.
 *   node tools/english/audio/check.ts      (exit 1 and the problems if anything is missing or out of date)
 */
import { checkBeeAudio, readManifest } from "./bee-audio.ts";

const problems = checkBeeAudio(readManifest());
if (problems.length) {
  console.error(`Spelling Bee recordings: ${problems.length} problem${problems.length === 1 ? "" : "s"}\n${problems.join("\n")}`);
  process.exit(1);
}
console.log("Spelling Bee recordings: all 100 words have both recordings, matching the content");
