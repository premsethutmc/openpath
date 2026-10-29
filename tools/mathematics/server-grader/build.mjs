// Builds the trusted server grader: packages/learning/src/server-grader.ts -> backend/family/grader/grader.mjs (+ grader.manifest.json).
// The manifest records the sha256 of the bundle (the server refuses to run any other file) and of every source file that went into it
// (a test fails when a source changes and the bundle was not rebuilt). Usage: node tools/mathematics/server-grader/build.mjs   (needs esbuild: ESBUILD=/path/to/esbuild)
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
const sha = (p) => createHash("sha256").update(readFileSync(p)).digest("hex");
const esbuild = process.env.ESBUILD || "esbuild", out = "backend/family/grader/grader.mjs", meta = process.env.META || "/tmp/server-grader-meta.json";
mkdirSync("backend/family/grader", { recursive: true });
// BUNDLER=bun uses `bun build` where esbuild cannot be installed (no npm registry); both write an esbuild-format metafile
if (process.env.BUNDLER === "bun") execFileSync("bun", ["build", "packages/learning/src/server-grader.ts", "--target=node", "--format=esm", `--outfile=${out}`, `--metafile=${meta}`, "--minify-whitespace"], { stdio: "inherit" });
else execFileSync(esbuild, ["packages/learning/src/server-grader.ts", "--bundle", "--platform=node", "--format=esm", `--outfile=${out}`, `--metafile=${meta}`, "--log-level=warning", "--minify-whitespace", "--legal-comments=none"], { stdio: "inherit" });
const inputs = Object.fromEntries(Object.keys(JSON.parse(readFileSync(meta, "utf8")).inputs).sort().map((p) => [p, sha(p)]));
writeFileSync("backend/family/grader/grader.manifest.json", JSON.stringify({ version: 1, entry: "packages/learning/src/server-grader.ts", sha256: sha(out), inputs }, null, 1) + "\n");
console.log("built", out, sha(out).slice(0, 12), Object.keys(inputs).length, "inputs");
