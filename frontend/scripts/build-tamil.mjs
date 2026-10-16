import { build } from "esbuild";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("..", import.meta.url));
await build({
  absWorkingDir: root,
  entryPoints: ["src/tamil/main.tsx"],
  bundle: true,
  format: "esm",
  target: ["es2022"],
  jsx: "automatic",
  minify: true,
  sourcemap: true,
  outdir: "dist-tamil/assets",
  entryNames: "app",
  define: { "process.env.NODE_ENV": '"production"' },
});
await mkdir(`${root}/dist-tamil`, { recursive: true });
const template = await readFile(`${root}/tamil.html`, "utf8");
await writeFile(
  `${root}/dist-tamil/index.html`,
  template
    .replace("<!--styles-->", '<link rel="stylesheet" href="assets/app.css">')
    .replace(
      "<!--script-->",
      '<script type="module" src="assets/app.js"></script>',
    ),
);
console.log("Built dist-tamil/ (provisional Tamil foundation)");
