import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { writeFile } from "node:fs/promises";
import * as esbuild from "esbuild";
const root = fileURLToPath(new URL("..", import.meta.url));
execFileSync(
  process.execPath,
  [`${root}/scripts/build-mathematics-journey.mjs`],
  { cwd: root, stdio: "inherit" },
);
await esbuild.build({
  entryPoints: [`${root}/src/mathematics/foundation/Main.tsx`],
  bundle: true,
  format: "esm",
  target: "es2022",
  outfile: `${root}/dist-english/foundation/app.js`,
});
await writeFile(
  `${root}/dist-english/foundation.html`,
  '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>OpenPath mathematics foundation · private review</title><link rel="stylesheet" href="foundation/app.css"></head><body><div id="root"></div><script type="module" src="foundation/app.js"></script></body></html>',
);
console.log(
  "Built additive foundation.html for private synthetic review; no deployment.",
);
