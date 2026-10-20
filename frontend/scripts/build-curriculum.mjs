/**
 * The Mathematics curriculum dashboard at /curriculum/ (added to an existing dist-english build).
 *
 *   node scripts/build-curriculum.mjs          as shipped: content is provisional, so nothing can show as verified
 *   node scripts/build-curriculum.mjs --test   TEST BUILD for acceptance tests: every question is treated as
 *                                              educator-reviewed (a banner says so). Never deploy a test build.
 *
 * The first screen loads app.js and data/index.json plus one release file; the learner's evidence (the shared engine
 * and module library) and question previews are separate chunks loaded when asked for.
 */
import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";
const root = fileURLToPath(new URL("..", import.meta.url));
const test = process.argv.includes("--test");
const out = `${root}/${process.env.DIST ?? "dist-english"}/curriculum`;
await mkdir(out, { recursive: true });
execFileSync(process.execPath, ["--import", "tsx", `${root}/../packages/learning/scripts/dashboard-data.ts`, `${out}/data`], { stdio: "inherit", cwd: root });
await esbuild.build({
  entryPoints: [`${root}/src/curriculum/Main.tsx`],
  bundle: true,
  splitting: true,
  format: "esm",
  target: "es2022",
  minify: !test,
  sourcemap: test ? "inline" : false,
  outdir: out,
  entryNames: "app",
  chunkNames: "chunks/[name]-[hash]",
  define: { "process.env.NODE_ENV": '"production"', OPENPATH_REVIEW_FIXTURE: test ? "true" : "false" },
});
await writeFile(
  `${out}/index.html`,
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#f4f6fc"><title>Mathematics · OpenPath</title><link rel="stylesheet" href="app.css"></head><body><div id="root"></div><script type="module" src="app.js"></script></body></html>`,
);
console.log(`Built the Mathematics curriculum dashboard at /curriculum/${test ? " (TEST BUILD: review fixture on)" : ""}.`);
