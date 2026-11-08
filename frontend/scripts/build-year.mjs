/**
 * My Learning Year at /year/ (added to an existing dist-english build, e.g. after build-mathematics-journey.mjs).
 *
 *   node scripts/build-year.mjs          the app as shipped: content is provisional, so nothing can show as verified
 *   node scripts/build-year.mjs --test   TEST BUILD for acceptance tests: every question is treated as educator-
 *                                        reviewed (a banner says so on every screen). Never deploy a test build.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";
const root = fileURLToPath(new URL("..", import.meta.url));
const test = process.argv.includes("--test");
// Recovery availability and the approval fixture are separate. Evaluation is one explicit build-time scope, with strict real review gates.
const evaluation = process.argv.find((a) => a.startsWith("--deep-evaluation="))?.split("=")[1] ?? "";
if (evaluation && (evaluation !== "integration-methods" || test || process.argv.includes("--deep-recovery"))) throw new Error("Use --deep-evaluation=integration-methods without --test or --deep-recovery.");
const deep = process.argv.includes("--deep-recovery") || !!evaluation;
if (deep && !test && !evaluation) throw new Error("--deep-recovery is a research switch and needs --test (never in a shipped build).");
// a lower per-sitting limit, so a browser journey can reach a pause (research test builds only)
const sittingArg = process.argv.find((a) => a.startsWith("--deep-sitting="))?.split("=")[1];
const sitting = sittingArg === undefined ? 0 : Number(sittingArg);
if (sittingArg !== undefined && (!test || !deep || !Number.isInteger(sitting) || sitting < 1 || sitting >= 40)) throw new Error("--deep-sitting=N (1-39) needs --test --deep-recovery.");
const out = `${root}/${process.env.DIST ?? "dist-english"}/year`;
await mkdir(out, { recursive: true });
await esbuild.build({
  entryPoints: [`${root}/src/year/Main.tsx`],
  bundle: true,
  loader: { ".woff2": "file" },
  format: "esm",
  target: "es2022",
  minify: !test,
  sourcemap: test ? "inline" : false,
  outdir: out,
  entryNames: "app",
  define: { "process.env.NODE_ENV": '"production"', OPENPATH_REVIEW_FIXTURE: test ? "true" : "false", OPENPATH_DEEP_RECOVERY: deep ? "true" : "false", OPENPATH_DEEP_SITTING: String(sitting), OPENPATH_DEEP_EVALUATION: JSON.stringify(evaluation), __OPENPATH_TEACHING_MODE__: JSON.stringify(evaluation ? "supervised-evaluation" : "demonstration") },
});
await writeFile(
  `${out}/index.html`,
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#f4f6fc"><title>My Learning Year · OpenPath</title><link rel="stylesheet" href="app.css"></head><body><div id="root"></div><script type="module" src="app.js"></script></body></html>`,
);
// the educator-review app at /review/ (never a test build: decisions are always real server decisions)
const rout = `${root}/${process.env.DIST ?? "dist-english"}/review`;
await mkdir(rout, { recursive: true });
await esbuild.build({ entryPoints: [`${root}/src/review/Main.tsx`], bundle: true, format: "esm", target: "es2022", minify: !test, sourcemap: test ? "inline" : false, outdir: rout, entryNames: "app", define: { "process.env.NODE_ENV": '"production"', OPENPATH_REVIEW_FIXTURE: "false" } });
await writeFile(`${rout}/index.html`, `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#f4f6fc"><title>Content review · OpenPath</title><link rel="stylesheet" href="app.css"></head><body><div id="root"></div><script type="module" src="app.js"></script></body></html>`);
console.log(`Built My Learning Year at /year/${test ? " (TEST BUILD: review fixture on)" : ""}${deep ? ` (deep-recovery research switch available with ?deep=1${sitting ? `, ${sitting} per sitting` : ""})` : ""} and content review at /review/.`);
