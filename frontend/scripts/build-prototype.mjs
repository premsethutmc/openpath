/**
 * Builds the adaptive spelling DESIGN PROTOTYPE (src/english/prototypes/adaptive-spelling) into one self-contained
 * page for review: dist-prototype/adaptive-spelling.html. Not part of the app or its build.
 *
 *   node scripts/build-prototype.mjs
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import * as esbuild from "esbuild";

const dir = new URL("../src/english/prototypes/adaptive-spelling/", import.meta.url);
const out = await esbuild.build({
  entryPoints: [new URL("Prototype.tsx", dir).pathname],
  bundle: true,
  minify: true,
  format: "iife",
  target: "es2020",
  jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"' },
  write: false,
  legalComments: "none",
});
const js = out.outputFiles[0].text.replace(/<\/script/gi, "<\\/script");
const css = readFileSync(new URL("prototype.css", dir), "utf8");
const page = readFileSync(new URL("page.html", dir), "utf8").replace("/*CSS*/", () => css).replace("/*JS*/", () => js);
mkdirSync(new URL("../dist-prototype/", import.meta.url), { recursive: true });
const file = new URL("../dist-prototype/adaptive-spelling.html", import.meta.url);
writeFileSync(file, page);
console.log(`wrote ${file.pathname} (${Math.round(page.length / 1024)} kB)`);
