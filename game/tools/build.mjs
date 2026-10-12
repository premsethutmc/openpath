// Bundle the scene.
//   node tools/build.mjs
//     dist/index.html + dist/assets/    the playable preview (serve the folder, or open over http)
//     dist/standalone.html              one file with every asset inside, for sharing
// Uses esbuild from the project's dependencies, or ESBUILD_MODULE when provided.
import { copyFileSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const esbuild = await import(process.env.ESBUILD_MODULE || "esbuild");
const out = join(root, "dist");
mkdirSync(join(out, "assets"), { recursive: true });

const result = await esbuild.build({ entryPoints: [join(root, "src/main.js")], bundle: true, format: "iife", minify: true, write: false, target: ["es2019"], loader: { ".json": "json" }, alias: { "@pixi/core": join(root, "src/engine/pixi-core-shim.js") }, define: { "process.env.DEBUG": "false" } });
const js = result.outputFiles[0].text;
const css = readFileSync(join(root, "src/shell.css"), "utf8");
const shell = readFileSync(join(root, "src/shell.html"), "utf8");
const PIXI_FILE = "pixi-7.4.2.min.js";
const fonts = `<link href="https://fonts.googleapis.com/css2?family=Baloo+Thambi+2:wght@600;800&family=Mukta+Malar:wght@400;600&display=swap" rel="stylesheet">`;
const title = "Amma at Home";

const mime = { webp: "image/webp", wav: "audio/wav" };
const assets = {};
for (const f of readdirSync(join(root, "public/assets"))) {
  copyFileSync(join(root, "public/assets", f), join(out, "assets", f));
  const ext = f.split(".").pop();
  if (mime[ext]) assets[f] = `data:${mime[ext]};base64,${readFileSync(join(root, "public/assets", f)).toString("base64")}`;
}
copyFileSync(join(root, "vendor", PIXI_FILE), join(out, PIXI_FILE));

const head = `<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"><meta name="theme-color" content="#21120e"><title>${title}</title>${fonts}<style>${css}</style>`;
writeFileSync(join(out, "index.html"), `<!doctype html><html lang="en"><head>${head}</head><body>\n${shell}\n<script src="${PIXI_FILE}"></script>\n<script>${js}</script></body></html>\n`);
const inlineAssets = `<script>window.__GAME_ASSETS=${JSON.stringify(assets)};</script>`;
writeFileSync(join(out, "standalone.html"), `<!doctype html><html lang="en"><head>${head}</head><body>\n${shell}\n<script>${readFileSync(join(root, "vendor", PIXI_FILE), "utf8")}</script>\n${inlineAssets}\n<script>${js}</script></body></html>\n`);
// The same page as a fragment for publishing, with the renderer loaded from a CDN instead of inlined.
writeFileSync(join(out, "home.html"), `<title>${title}</title>\n${fonts}\n<style>${css}</style>\n${shell}\n<script src="https://cdnjs.cloudflare.com/ajax/libs/pixi.js/7.4.2/pixi.min.js"></script>\n${inlineAssets}\n<script>${js}</script>\n`);
const kb = (f) => (readFileSync(join(out, f)).length / 1024).toFixed(0) + " kB";
console.log("built: bundle", (js.length / 1024).toFixed(0), "kB · standalone", kb("standalone.html"), "· fragment", kb("home.html"));
