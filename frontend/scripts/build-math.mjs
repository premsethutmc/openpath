/**
 * Build the math learning renderer app.
 *
 *   node scripts/build-math.mjs                -> dist-math/
 *   node scripts/build-math.mjs --standalone  -> dist-math/math-standalone.html
 */
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";

const root = fileURLToPath(new URL("..", import.meta.url));
const standalone = process.argv.includes("--standalone");

const options = (overrides = {}) => ({
  absWorkingDir: root,
  entryPoints: ["src/math/main.tsx"],
  bundle: true,
  format: "esm",
  target: ["es2022"],
  jsx: "automatic",
  outdir: "dist-math/assets",
  entryNames: "math",
  define: {
    "process.env.NODE_ENV": '"production"',
  },
  logLevel: "info",
  ...overrides,
});

const template = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>OpenPath — Math Learning</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@400;600;700;800&display=swap" rel="stylesheet" />
  <!--styles-->
</head>
<body>
  <div id="root"></div>
  <!--script-->
</body>
</html>`;

if (standalone) {
  const result = await esbuild.build(options({ minify: true, write: false, format: "iife" }));
  const file = (suffix) => result.outputFiles.find((f) => f.path.endsWith(suffix)).text;

  // Load KaTeX CSS (structural rules only — strip @font-face declarations)
  let katexCss = "";
  try {
    const raw = await readFile(`${root}/node_modules/katex/dist/katex.min.css`, "utf8");
    katexCss = raw.replace(/@font-face\{[^}]+\}/g, "");
  } catch {
    console.warn("⚠ KaTeX CSS not found — math rendering may lack proper styling");
  }

  const html = template
    .replace("<!--styles-->", () => `<style>${katexCss}${file(".css")}</style>`)
    .replace("<!--script-->", () => `<script>${file(".js").replaceAll("</script", "<\\/script")}</script>`);
  await mkdir(`${root}/dist-math`, { recursive: true });
  await writeFile(`${root}/dist-math/math-standalone.html`, html);
  console.log(`wrote dist-math/math-standalone.html (${Math.round(html.length / 1024)} kB)`);
} else {
  await rm(`${root}/dist-math/assets`, { recursive: true, force: true });
  await esbuild.build(options({ minify: true, sourcemap: true }));
  const html = template
    .replace("<!--styles-->", '<link rel="stylesheet" href="/assets/math.css" />')
    .replace("<!--script-->", '<script type="module" src="/assets/math.js"></script>');
  await mkdir(`${root}/dist-math`, { recursive: true });
  await writeFile(`${root}/dist-math/index.html`, html);
  console.log("wrote dist-math/index.html");
}
