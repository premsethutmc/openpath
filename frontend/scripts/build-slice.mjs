/** Integration M1: bundle the vertical-slice harness (the real learning package + the rich renderer) to dist-slice/. */
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";
const root = fileURLToPath(new URL("..", import.meta.url));
await esbuild.build({ absWorkingDir: root, entryPoints: ["src/journey/slice-app.tsx"], bundle: true, format: "esm", target: ["es2022"], jsx: "automatic", outdir: "dist-slice/assets", entryNames: "slice", plugins: [{ name: "node-only-stub", setup(b) { b.onResolve({ filter: /^node:/ }, (a) => ({ path: a.path, namespace: "stub" })); b.onLoad({ filter: /.*/, namespace: "stub" }, () => ({ contents: "module.exports = new Proxy({}, { get: (_, k) => k === \"__esModule\" ? false : () => { throw new Error(\"node-only module in the browser slice (geometry worker)\"); } });", loader: "js" })); } }], define: { "process.env.NODE_ENV": '"production"' }, logLevel: "error" });
await mkdir(`${root}/dist-slice`, { recursive: true });
await writeFile(`${root}/dist-slice/index.html`, `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>OpenPath slice</title><link rel="stylesheet" href="assets/slice.css"></head><body><div id="root"></div><script type="module" src="assets/slice.js"></script></body></html>`);
console.log("wrote dist-slice/index.html");
