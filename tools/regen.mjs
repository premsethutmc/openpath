#!/usr/bin/env node
// regen@1: regenerate every generated learning file, in the one order that works, with Node (as CI and the server grader).
//
//   node tools/regen.mjs            write the generated files (commit them with the change that caused them)
//   node tools/regen.mjs --check    regenerate, then fail (exit 1) if any generated file differs from git: CI runs this.
//                                   It never commits; a diff means "run node tools/regen.mjs and commit the result".
//   node tools/regen.mjs --list     print the steps and the generated paths
//
// Node only. Bun computes a few float results differently in the last digit (e.g. 0.3456 vs 0.34559999999999996 for a
// predicted wrong answer), which changes three families' fingerprints and fails the check; the grader runs under Node, so
// Node's results are the reference. Fingerprints are deliberately NOT rounded: a validator that accepts a different set of
// answers on another engine (atgen) also changes the fingerprint, and rounding could hide that. Run under Bun, this refuses.
//
// TypeScript is loaded with tsx from frontend/node_modules (npm ci in frontend). TS_IMPORT overrides the loader.
// Not regenerated here (on purpose): content/learning/teaching-contract-baseline.v1.json is a ratchet lowered by hand
// (bun packages/learning/scripts/teaching-contract.ts) so a rise in violations fails its test instead of being written over.
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

if (process.versions.bun) {
  console.error("regen@1: run with node, not bun (Bun's float results differ in the last digit; see the header of this file).");
  process.exit(2);
}
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const fe = join(root, "frontend");
const ts = process.env.TS_IMPORT || "tsx";
const esbuild = process.env.ESBUILD || join(fe, "node_modules/.bin/esbuild");

/** The steps, in order: specs → library → parity → coverage → expansion → board releases → compiled coverage →
 *  review registries (sync) → server grader bundle. Each reads what the previous ones wrote. */
const node = (script, ...args) => ({ cmd: process.execPath, args: ["--import", ts, script, ...args], cwd: fe });
export const STEPS = [
  ["specs", node("../packages/learning/scripts/specs.ts")],
  ["library", node("../packages/learning/scripts/library.ts")],
  ["families-parity", node("../packages/learning/scripts/families-parity.ts")],
  ["coverage", node("../packages/learning/scripts/coverage.ts")],
  ["expansion", { cmd: "python3", args: ["../content/learning/src/expansion.py"], cwd: fe }],
  ["board-releases", node("../packages/learning/scripts/board-releases.ts")],
  ["compile-coverage", node("../packages/learning/scripts/compile-coverage.ts")],
  // a module or family that changed goes back to draft, stamped with the current time (a real change must be committed anyway)
  ["review sync", node("../packages/learning/scripts/review.ts", "sync")],
  ["explanation-review sync", node("../packages/learning/scripts/explanation-review.ts", "sync")],
  ["grader bundle", { cmd: process.execPath, args: ["tools/mathematics/server-grader/build.mjs"], cwd: root, env: { ESBUILD: esbuild } }],
];
/** Every file the steps write (the check compares these with git, including new untracked files under them). */
export const GENERATED = [
  "content/learning/family-specs.v1.json", "content/learning/generated.v1.json", "content/learning/library.v1.json",
  "content/learning/families-parity.v1.json", "docs/learning-year/COVERAGE.md", "content/learning/competency-expansion.v1.json",
  "content/learning/syllabus", "content/learning/curricula", "packages/learning/src/board-releases.ts",
  "content/learning/coverage-matrix.v1.json", "docs/mathematics/COVERAGE_MATRIX.md", "content/learning/marking-parity.v1.json",
  "content/learning/review.v1.json", "content/learning/explanation-review.v1.json", "content/learning/explanation-blocklist.v1.json",
  "backend/family/grader/grader.mjs", "backend/family/grader/grader.manifest.json",
];

const mode = process.argv.includes("--check") ? "check" : process.argv.includes("--list") ? "list" : "write";
if (mode === "list") {
  STEPS.forEach(([name, s], i) => console.log(`${i + 1}. ${name}: ${[s.cmd === process.execPath ? "node" : s.cmd, ...s.args].join(" ")}`));
  console.log(`generated: ${GENERATED.join(" ")}`);
  process.exit(0);
}
if (!process.env.TS_IMPORT && !existsSync(join(fe, "node_modules/tsx"))) {
  console.error("regen@1: tsx is missing: run `npm ci` in frontend (or set TS_IMPORT to another TypeScript loader).");
  process.exit(2);
}
const t0 = Date.now();
for (const [name, s] of STEPS) {
  const t = Date.now();
  const r = spawnSync(s.cmd, s.args, { cwd: s.cwd, env: { ...process.env, ...(s.env ?? {}) }, stdio: ["ignore", "pipe", "inherit"], maxBuffer: 1 << 28 });
  const tail = String(r.stdout ?? "").trim().split("\n").at(-1)?.slice(0, 160) ?? "";
  console.log(`regen ${name}: ${((Date.now() - t) / 1000).toFixed(1)} s${tail ? `  (${tail})` : ""}`);
  if (r.status !== 0) {
    console.error(`regen@1: step "${name}" failed (exit ${r.status})`);
    process.exit(1);
  }
}
console.log(`regen: all steps ${((Date.now() - t0) / 1000).toFixed(1)} s`);
if (mode === "check") {
  const changed = execFileSync("git", ["status", "--porcelain", "--untracked-files=all", "--", ...GENERATED], { cwd: root, encoding: "utf8" }).trim();
  if (changed) {
    console.error(`regen@1: generated files are out of date:\n${changed}\nRun \`node tools/regen.mjs\` (Node, not Bun) and commit the result.`);
    execFileSync("git", ["diff", "--stat", "--", ...GENERATED], { cwd: root, stdio: "inherit" });
    process.exit(1);
  }
  console.log("regen: generated files are up to date");
}
