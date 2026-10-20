import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { writeFile } from "node:fs/promises";
import * as esbuild from "esbuild";
const root = fileURLToPath(new URL("..", import.meta.url));
execFileSync(process.execPath, [`${root}/scripts/build-english.mjs`], {
  cwd: root,
  stdio: "inherit",
});
await esbuild.build({
  entryPoints: [`${root}/src/mathematics/journey/Main.tsx`],
  bundle: true,
  format: "esm",
  target: "es2022",
  minify: true,
  outfile: `${root}/dist-english/mathematics/app.js`,
});
await writeFile(
  `${root}/dist-english/mathematics.html`,
  '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>OpenPath Mathematics journey</title><link rel="stylesheet" href="mathematics/app.css"></head><body><div id="root"></div><script type="module" src="mathematics/app.js"></script></body></html>',
);
console.log(
  "Built additive mathematics.html alongside unchanged English entry point.",
);

execFileSync(process.execPath, [`${root}/scripts/build-writing.mjs`], {
  cwd: root,
  stdio: "inherit",
});
const { cp, readFile } = await import("node:fs/promises");
await cp(`${root}/dist-writing`, `${root}/dist-english/writing`, {
  recursive: true,
});
const writingHtml = await readFile(`${root}/dist-writing/index.html`, "utf8");
await writeFile(
  `${root}/dist-english/writing.html`,
  writingHtml
    .replace("./app.css", "writing/app.css")
    .replace("./app.js", "writing/app.js"),
);
await cp(
  `${root}/dist-writing/recognition`,
  `${root}/dist-english/recognition`,
  { recursive: true },
);
