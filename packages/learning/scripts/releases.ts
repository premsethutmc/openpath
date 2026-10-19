/** Regenerate the sample reviewed curriculum releases from the synthetic textbooks (deterministic). */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { review, synthesise, validateRelease } from "../src/curriculum";

const root = join(import.meta.dirname, "../../../content/learning");
const index: { id: string; version: string; grade: number; title: string; hash: string; file: string }[] = [];
for (const f of readdirSync(join(root, "textbooks")).filter((f) => f.startsWith("sample-") && f.endsWith(".md")).sort()) {
  const draft = synthesise(readFileSync(join(root, "textbooks", f), "utf8"), { version: "1.0.0" });
  const rel = review(draft, "accept-proposals", "OpenPath sample review (not an educator)", "2026-10-01T00:00:00.000Z", "Sample release for development and acceptance testing: the top proposed competency for each outcome was accepted. Not an educator review.");
  const errs = validateRelease(rel);
  if (errs.length) throw new Error(`${f}: ${errs.join("; ")}`);
  const file = `${rel.id}.v${rel.version}.json`;
  writeFileSync(join(root, "curricula", file), JSON.stringify(rel, null, 1) + "\n");
  index.push({ id: rel.id, version: rel.version, grade: rel.grade, title: rel.title, hash: rel.hash, file });
}
index.sort((a, b) => a.grade - b.grade);
writeFileSync(join(root, "curricula", "index.json"), JSON.stringify({ releases: index }, null, 1) + "\n");
console.log(index.map((r) => `${r.grade} ${r.id} ${r.hash}`).join("\n"));
