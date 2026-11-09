#!/usr/bin/env node
// test-changed@1: the fast local check. Runs only the tests that a change touches directly; the full suite stays in CI.
//
//   node tools/test-changed.mjs                 tests for files changed in the working tree (vs HEAD)
//   node tools/test-changed.mjs --base <ref>    … and for files changed since <ref> (e.g. origin/feat/grade8-pilot)
//   node tools/test-changed.mjs --slow          also run the long suites (family validation, compiler, grade coverage, …)
//   node tools/test-changed.mjs --dry           list what would run, run nothing
//
// Selected: a changed test file itself; a source file's own X.test.ts; and every test file that imports a changed file
// directly (one level). packages/learning tests run with bun (they use bun:test); frontend tests with node + tsx, as
// `npm test` does. Indirect dependants, browser journeys and regenerated content are left to CI (or `node tools/regen.mjs
// --check`, suggested when content/ or a generator changes). This is a quick signal, not a substitute for CI.
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, normalize, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { SPLIT } from "./test-shards.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const opt = (k) => argv.includes(k);
const baseIdx = argv.indexOf("--base");
const base = baseIdx >= 0 ? argv[baseIdx + 1] : null;
/** Long suites (CI minutes) skipped unless --slow. */
const SLOW = new Set([...SPLIT.map((f) => `frontend/${f}`), "frontend/src/learning/platform.test.ts", "frontend/src/learning/evidence-contracts.test.ts", "frontend/src/learning/generalisation.test.ts"]);

const git = (...a) => execFileSync("git", a, { cwd: root, encoding: "utf8" }).split("\n").filter(Boolean);
const changed = new Set([...git("diff", "--name-only", "HEAD"), ...git("ls-files", "--others", "--exclude-standard"), ...(base ? git("diff", "--name-only", `${base}...HEAD`) : [])]);
const stem = (p) => p.replace(/\.(tsx?|mts|mjs|js)$/, "");
const changedStems = new Set([...changed].filter((f) => /\.(tsx?|mts)$/.test(f)).map(stem));

const walk = (d, out = []) => {
  if (!existsSync(d)) return out;
  for (const e of readdirSync(d, { withFileTypes: true })) {
    const p = join(d, e.name);
    if (e.isDirectory()) { if (e.name !== "node_modules") walk(p, out); }
    else if (/\.test\.tsx?$/.test(e.name)) out.push(relative(root, p));
  }
  return out;
};
const tests = [...walk(join(root, "packages/learning/src")), ...walk(join(root, "frontend/src"))];
/** The repo-relative stems a test file imports with a relative path. */
const importsOf = (t) => [...readFileSync(join(root, t), "utf8").matchAll(/(?:from|import)\s*\(?\s*["'](\.{1,2}\/[^"']+)["']/g)].map((m) => stem(normalize(join(dirname(t), m[1]))));
const selected = new Set();
for (const t of tests) {
  const own = changed.has(t) || changedStems.has(stem(t).replace(/\.test$/, ""));
  if (own || importsOf(t).some((s) => changedStems.has(s))) selected.add(t);
}
const slow = [...selected].filter((t) => SLOW.has(t));
const run = [...selected].filter((t) => opt("--slow") || !SLOW.has(t)).sort();
const pkg = run.filter((t) => t.startsWith("packages/"));
const fe = run.filter((t) => t.startsWith("frontend/")).map((t) => t.slice("frontend/".length));

console.log(`test-changed: ${changed.size} changed files → ${run.length} test files (${pkg.length} packages/learning with bun, ${fe.length} frontend with node)`);
if (slow.length && !opt("--slow")) console.log(`  skipped long suites (run with --slow, or let CI): ${slow.join(", ")}`);
if ([...changed].some((f) => f.startsWith("content/learning/") || f.startsWith("packages/learning/scripts/") || /packages\/learning\/src\/(fam\/|families|spec|library)/.test(f)))
  console.log("  content or a generator changed: also run `node tools/regen.mjs --check` (Node), or let CI");
if (opt("--dry")) { for (const t of run) console.log(`  ${t}`); process.exit(0); }
const t0 = Date.now();
let status = 0;
if (pkg.length) status ||= spawnSync("bun", ["test", "--timeout", "600000", ...pkg], { cwd: root, stdio: "inherit" }).status ?? 1;
if (fe.length) status ||= spawnSync(process.execPath, ["--import", process.env.TS_IMPORT || "tsx", "--test", ...fe], { cwd: join(root, "frontend"), stdio: "inherit" }).status ?? 1;
console.log(`test-changed: ${status ? "FAILED" : "passed"} in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
process.exit(status);
