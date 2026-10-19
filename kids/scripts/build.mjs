/**
 * Build OpenPath Kids into one self-contained HTML file: dist/index.html.
 * Everything (code, art, styles, episode) is inside it, so it works offline
 * and makes no network requests at all.
 *
 *   node scripts/build.mjs           build once
 *   node scripts/build.mjs --watch   rebuild on change
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";

const root = fileURLToPath(new URL("..", import.meta.url));

const writeHtml = async (result) => {
  const file = (suffix) => result.outputFiles.find((f) => f.path.endsWith(suffix))?.text ?? "";
  const template = await readFile(`${root}/index.html`, "utf8");
  const html = template
    .replace("<!--styles-->", () => `<style>${file(".css")}</style>`)
    .replace("<!--script-->", () => `<script>${file(".js").replaceAll("</script", "<\\/script")}</script>`);
  await mkdir(`${root}/dist`, { recursive: true });
  await writeFile(`${root}/dist/index.html`, html);
  console.log(`wrote dist/index.html (${Math.round(html.length / 1024)} kB)`);
  if (process.argv.includes("--preview")) {
    // A body-only copy for a private preview page whose host supplies the document shell and its own
    // security policy.
    const body = `<title>Chintoo's World</title>\n<meta name="claude:viewport-fit-sides" content="cover">\n<style>:root{color-scheme:dark}${file(".css")}</style>\n<div id="app"></div>\n<script>${file(".js").replaceAll("</script", "<\\/script")}</script>\n`;
    await writeFile(`${root}/dist/preview.html`, body);
    console.log("wrote dist/preview.html");
  }
};

const options = {
  absWorkingDir: root,
  entryPoints: ["src/main.ts"],
  bundle: true,
  format: "iife",
  target: ["es2020", "chrome90"],
  outdir: "dist/assets",
  minify: true,
  write: false,
  logLevel: "warning",
};

if (process.argv.includes("--watch")) {
  const ctx = await esbuild.context({
    ...options,
    plugins: [{ name: "html", setup: (b) => b.onEnd((r) => r.outputFiles && writeHtml(r)) }],
  });
  await ctx.watch();
  console.log("watching src/ and episodes/ ...");
} else {
  await writeHtml(await esbuild.build(options));
}
