import * as esbuild from "esbuild";
import { mkdir, writeFile, cp, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
const root = fileURLToPath(new URL("..", import.meta.url)),
  out = `${root}/dist-writing`;
const manifest = JSON.parse(
  await readFile(`${root}/assets/recognition/provenance.json`, "utf8"),
);
if (
  createHash("sha256")
    .update(await readFile(`${root}/assets/recognition/mnist.onnx`))
    .digest("hex") !== manifest.sha256
)
  throw Error("Recognition model integrity check failed");
await mkdir(out, { recursive: true });
await esbuild.build({
  entryPoints: [`${root}/src/writing/Main.tsx`],
  bundle: true,
  outfile: `${out}/app.js`,
  format: "esm",
  target: "es2022",
  minify: true,
});
await mkdir(`${out}/recognition`, { recursive: true });
await cp(`${root}/assets/recognition`, `${out}/recognition`, {
  recursive: true,
});
for (const name of [
  "ort-wasm-simd-threaded.wasm",
  "ort-wasm-simd-threaded.mjs",
])
  await cp(
    `${root}/node_modules/onnxruntime-web/dist/${name}`,
    `${out}/recognition/${name}`,
  );
await writeFile(
  `${out}/index.html`,
  '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>OpenPath Mathematical Writing</title><link rel="stylesheet" href="./app.css"></head><body><div id="root"></div><script type="module" src="./app.js"></script></body></html>',
);
console.log(
  "Built isolated dist-writing; existing application entries unchanged.",
);
