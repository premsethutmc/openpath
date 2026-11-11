#!/usr/bin/env node
// test-shards@1: the frontend test suite (`npm test`: every frontend/src/**/*.test.ts) split across N parallel CI jobs.
//
//   node tools/test-shards.mjs --list K N      the files shard K (1-based) of N runs
//   node tools/test-shards.mjs --verify N      every test file is run: each whole file by exactly one shard, each split file
//                                              (SPLIT, below) by every shard with TEST_PART=K/N; exit 1 otherwise
//   node tools/test-shards.mjs --run K N       run shard K of N (from frontend/, as `npm test` does), TEST_PART=K/N
//
// The union of the N shards is the full suite: CI's "Frontend tests (all shards)" job fails if any shard fails or the
// verification does. Weights are seconds of test time from CI (run 42566293882, 2026-11-09); unlisted files weigh 10.
import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const fe = join(root, "frontend");
/** Files whose long test walks a collection in parts (frontend/src/test-part.ts): run by every shard. */
export const SPLIT = ["src/learning/content-system.test.ts", "src/learning/mathematics-completion.test.ts", "src/year/grade7-coverage.test.ts", "src/year/grade8-coverage.test.ts", "src/year/icse-grade5.test.ts"];
const WEIGHT = {
  "src/learning/platform.test.ts": 751, "src/learning/evidence-contracts.test.ts": 563, "src/learning/generalisation.test.ts": 339,
  "src/learning/dashboard.test.ts": 135, "src/year/visual-data.test.ts": 121, "src/journey/linear-equations.test.ts": 93,
  "src/learning/learner-hypothesis.test.ts": 91, "src/journey/content-safety.test.ts": 88, "src/journey/answer-feedback.test.ts": 76,
  "src/learning/adaptive-journey.test.ts": 73, "src/learning/engine.test.ts": 50, "src/journey/grader-teaching.test.ts": 44,
  "src/journey/missing-number-support.test.ts": 42,
};
/** Every test file `npm test` runs ("src/**\/*.test.ts" from frontend/), sorted. */
export function testFiles() {
  const out = [];
  const walk = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) { if (e.name !== "node_modules") walk(p); }
      else if (e.name.endsWith(".test.ts")) out.push(relative(fe, p));
    }
  };
  walk(join(fe, "src"));
  return out.sort();
}
/** Shard k (1-based) of n: the split files, plus whole files assigned heaviest first to the lightest shard. */
export function shard(k, n, files = testFiles()) {
  const loads = Array.from({ length: n }, () => ({ w: 0, files: [] }));
  const whole = files.filter((f) => !SPLIT.includes(f)).map((f) => [f, WEIGHT[f] ?? 10]).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  for (const [f, w] of whole) {
    const s = loads.reduce((m, x) => (x.w < m.w ? x : m));
    s.w += w;
    s.files.push(f);
  }
  return [...SPLIT.filter((f) => files.includes(f)), ...loads[k - 1].files.sort()];
}

const main = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
const [cmd, a, b] = main ? process.argv.slice(2) : [];
const nums = (k, n) => {
  const K = Number(k), N = Number(n);
  if (!(N >= 1 && K >= 1 && K <= N)) { console.error("expected K N with 1 ≤ K ≤ N"); process.exit(2); }
  return [K, N];
};
if (cmd === "--list") {
  const [k, n] = nums(a, b);
  console.log(shard(k, n).join("\n"));
} else if (cmd === "--verify") {
  const n = Number(a), files = testFiles(), seen = new Map(files.map((f) => [f, 0]));
  for (let k = 1; k <= n; k++) for (const f of shard(k, n, files)) seen.set(f, (seen.get(f) ?? 0) + 1);
  const bad = [...seen].filter(([f, c]) => (SPLIT.includes(f) ? c !== n : c !== 1));
  const missingSplit = SPLIT.filter((f) => !files.includes(f));
  if (bad.length || missingSplit.length) {
    console.error(`test-shards@1: not a partition of the suite: ${bad.map(([f, c]) => `${f} ×${c}`).join(", ")} ${missingSplit.map((f) => `${f} (split file missing)`).join(", ")}`);
    process.exit(1);
  }
  console.log(`test-shards@1: ${files.length} test files in ${n} shards: ${files.length - SPLIT.length} whole files once each, ${SPLIT.length} split files in every shard`);
} else if (cmd === "--run") {
  const [k, n] = nums(a, b);
  const files = shard(k, n);
  console.log(`shard ${k}/${n}: ${files.length} files`);
  const r = spawnSync(process.execPath, ["--import", process.env.TS_IMPORT || "tsx", "--test", ...files], { cwd: fe, stdio: "inherit", env: { ...process.env, TEST_PART: `${k}/${n}` } });
  process.exit(r.status ?? 1);
} else if (main) {
  console.error("usage: node tools/test-shards.mjs --list K N | --verify N | --run K N");
  process.exit(2);
}
