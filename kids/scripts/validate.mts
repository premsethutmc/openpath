/**
 * Check every episode in episodes/ against the format and the art library,
 * and print how long it plays at each level.
 *   npm run validate
 */
import { readFileSync, readdirSync } from "node:fs";
import { ART } from "../src/art/catalogue.ts";
import type { Episode } from "../src/engine/types.ts";
import { LEVELS } from "../src/engine/types.ts";
import { storyLength, validateEpisode } from "../src/engine/validate.ts";

const dir = new URL("../episodes/", import.meta.url);
let failed = false;
const secs = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.round((ms % 60000) / 1000)).padStart(2, "0")}`;
for (const name of readdirSync(dir).filter((f) => f.endsWith(".json"))) {
  const episode = JSON.parse(readFileSync(new URL(name, dir), "utf8")) as Episode;
  const { errors, warnings } = validateEpisode(episode, ART);
  console.log(`\n${name}: ${errors.length ? "INVALID" : "valid"}`);
  errors.forEach((e) => console.log(`  error: ${e}`));
  warnings.forEach((w) => console.log(`  warning: ${w}`));
  if (errors.length) failed = true;
  else for (const level of LEVELS) {
    const { shortest, untouched } = storyLength(episode, level);
    console.log(`  ${level}: ${secs(untouched)} if the child never touches anything, ${secs(shortest)} if they answer at once`);
  }
}
process.exit(failed ? 1 : 0);
