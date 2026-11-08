/** Retain previously served IDs for replay without putting them back in the release pool. */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { problemOf } from "../src/families";
import history from "../../../content/learning/historical-answers.v1.json";

type Table = Record<string, { items: Record<string, string> }>;
export function preserveHistoricalAnswers(table: Table) {
  let count = 0;
  for (const [family, items] of Object.entries(history.families)) {
    if (!table[family]) throw new Error(`Historical family missing: ${family}`);
    for (const [key, answer] of Object.entries(items)) {
      const id = `gen:${family}:${key}`;
      if (problemOf(id)?.answer !== answer) throw new Error(`Historical answer changed: ${id}`);
      if (key in table[family].items && table[family].items[key] !== answer) throw new Error(`Historical table answer changed: ${id}`);
      table[family].items[key] = answer;
      count++;
    }
  }
  return count;
}

// Also usable after a full specifications build to check/repair its historical portion alone.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const file = new URL("../../../content/learning/generated.v1.json", import.meta.url);
  const data = JSON.parse(readFileSync(file, "utf8"));
  const count = preserveHistoricalAnswers(data.families);
  writeFileSync(file, JSON.stringify(data) + "\n");
  console.log(`Preserved ${count} historical answers; release pools unchanged`);
}
