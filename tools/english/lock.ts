/**
 * Framework version lock. A frozen framework version may not change; a change
 * needs a new version (and a new file). Usage:
 *   node tools/english/lock.ts --check     fail if a frozen file has changed
 *   node tools/english/lock.ts --freeze    record fingerprints of current files (new versions only)
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { CONTENT } from "./load.ts";

export const LOCK_FILE = join(CONTENT, "framework", "versions.lock.json");

export const fingerprint = (text: string): string => "sha256:" + createHash("sha256").update(text).digest("hex");

export function frameworkFiles(dir = join(CONTENT, "framework")): { key: string; path: string; text: string }[] {
  return readdirSync(dir)
    .filter((f) => /^en-\d+\.\d+\.\d+\.json$/.test(f))
    .map((f) => {
      const text = readFileSync(join(dir, f), "utf8");
      const fw = JSON.parse(text);
      return { key: `${fw.id}@${fw.version}`, path: join(dir, f), text };
    });
}

/** Problems with frozen versions: changed files, or a file whose version does not match its name. */
export function checkLock(lock: Record<string, string>, files: { key: string; path: string; text: string }[]): string[] {
  const problems: string[] = [];
  for (const f of files) {
    const nameVersion = f.path.match(/en-(\d+\.\d+\.\d+)\.json$/)![1];
    if (!f.key.endsWith(`@${nameVersion}`)) problems.push(`${f.path} declares ${f.key} but its file name says ${nameVersion}`);
    if (lock[f.key] && lock[f.key] !== fingerprint(f.text))
      problems.push(`framework ${f.key} is frozen but has changed: publish the change as a new version instead`);
  }
  for (const key of Object.keys(lock)) if (!files.some((f) => f.key === key)) problems.push(`frozen framework ${key} is missing`);
  return problems;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const lock: Record<string, string> = existsSync(LOCK_FILE) ? JSON.parse(readFileSync(LOCK_FILE, "utf8")) : {};
  const files = frameworkFiles();
  if (process.argv.includes("--freeze")) {
    for (const f of files) if (!lock[f.key]) lock[f.key] = fingerprint(f.text);
    writeFileSync(LOCK_FILE, JSON.stringify(lock, null, 1) + "\n");
    console.log(`frozen: ${Object.keys(lock).join(", ")}`);
  }
  const problems = checkLock(lock, files);
  if (problems.length) {
    console.error(problems.join("\n"));
    process.exit(1);
  }
  console.log(`framework lock OK (${Object.keys(lock).length} frozen version(s))`);
}
