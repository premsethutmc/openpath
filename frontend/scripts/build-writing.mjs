import * as esbuild from "esbuild";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("..", import.meta.url)),
  out = `${root}/dist-writing`;
await mkdir(out, { recursive: true });
await esbuild.build({
  entryPoints: [`${root}/src/writing/Main.tsx`],
  bundle: true,
  outfile: `${out}/app.js`,
  format: "esm",
  target: "es2022",
  minify: true,
});
await writeFile(
  `${out}/index.html`,
  '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>OpenPath Mathematical Writing</title><link rel="stylesheet" href="./app.css"></head><body><div id="root"></div><script type="module" src="./app.js"></script></body></html>',
);
console.log(
  "Built isolated dist-writing; existing application entries unchanged.",
);
