/** Scores evaluate.py's output with Read aloud's own alignment (frontend/src/english/logic/read-aloud). */
import { readFileSync } from "node:fs";
import { align } from "../../../frontend/src/english/logic/read-aloud/readAloud.ts";

const jobs = JSON.parse(readFileSync(process.argv[2], "utf8"));
const kinds: Record<string, { right: number; of: number }> = {};
let agree = 0, words = 0;
for (const j of jobs) {
  const got = align(j.text, j.heard).map((w) => (w.status === "read" ? "read" : "flag"));
  const ok = JSON.stringify(got) === JSON.stringify(j.expect);
  const k = (kinds[j.kind] ??= { right: 0, of: 0 });
  k.of++, ok && k.right++;
  j.expect.forEach((e: string, i: number) => (words++, e === got[i] && agree++));
}
for (const [k, v] of Object.entries(kinds)) console.log(`${k}: ${v.right} of ${v.of} sentences judged exactly right`);
console.log(`words: ${agree} of ${words} judged right`);
