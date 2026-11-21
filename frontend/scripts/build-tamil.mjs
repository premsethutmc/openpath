import { build } from "esbuild";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("..", import.meta.url));
// --into dist-english/tamil puts the course inside the family/demo build, served at /tamil/ (preview-server.mjs)
const at = process.argv.indexOf("--into");
const outRoot = at > 0 ? process.argv[at + 1] : "dist-tamil";
await build({
  absWorkingDir: root,
  entryPoints: ["src/tamil/main.tsx"],
  bundle: true,
  format: "esm",
  target: ["es2022"],
  jsx: "automatic",
  minify: true,
  sourcemap: true,
  outdir: `${outRoot}/assets`,
  entryNames: "app",
  define: { "process.env.NODE_ENV": '"production"' },
});
await mkdir(`${root}/${outRoot}`, { recursive: true });
const template = await readFile(`${root}/tamil.html`, "utf8");
await writeFile(
  `${root}/${outRoot}/index.html`,
  template
    .replace("<!--styles-->", '<link rel="stylesheet" href="assets/app.css">')
    .replace(
      "<!--script-->",
      '<script type="module" src="assets/app.js"></script>',
    ),
);
console.log(`Built ${outRoot}/ (Tamil: ICSE course and letter basics)`);
