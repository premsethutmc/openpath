/**
 * Build the web app with esbuild.
 *
 *   node scripts/build.mjs               -> dist/        talks to the API at /api
 *   node scripts/build.mjs --standalone  -> dist/openpath-standalone.html
 *                                           one file, evidence kept on the device
 *                                           (add --embed where downloads are blocked)
 *
 * OPENPATH_API_BASE overrides the API location (for example a full URL).
 */
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";

const root = fileURLToPath(new URL("..", import.meta.url));
const standalone = process.argv.includes("--standalone");
const apiBase = standalone ? null : (process.env.OPENPATH_API_BASE ?? "/api");

export const options = (overrides = {}) => ({
  absWorkingDir: root,
  entryPoints: ["src/main.tsx"],
  bundle: true,
  format: "esm",
  target: ["es2022"],
  jsx: "automatic",
  outdir: "dist/assets",
  entryNames: "app",
  define: {
    __OPENPATH_API__: JSON.stringify(apiBase),
    __OPENPATH_EMBED__: JSON.stringify(process.argv.includes("--embed")),
    // explanation-review@1 (read in packages/learning/src/explanation-review.ts): OPENPATH_TEACHING_MODE=supervised-evaluation builds an
    // app that shows educator-approved explanations only
    __OPENPATH_TEACHING_MODE__: JSON.stringify(process.env.OPENPATH_TEACHING_MODE === "supervised-evaluation" ? "supervised-evaluation" : "demonstration"),
    "process.env.NODE_ENV": '"production"',
  },
  logLevel: "info",
  ...overrides,
});

export async function writeIndex(extraScript = "") {
  const template = await readFile(`${root}/index.html`, "utf8");
  const html = template
    .replace("<!--styles-->", '<link rel="stylesheet" href="/assets/app.css" />')
    .replace("<!--script-->", `<script type="module" src="/assets/app.js"></script>${extraScript}`);
  await mkdir(`${root}/dist`, { recursive: true });
  await writeFile(`${root}/dist/index.html`, html);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (standalone) {
    // A classic script rather than a module: it runs anywhere an inline script can.
    const result = await esbuild.build(options({ minify: true, write: false, format: "iife" }));
    const file = (suffix) => result.outputFiles.find((f) => f.path.endsWith(suffix)).text;
    const template = await readFile(`${root}/index.html`, "utf8");
    const html = template
      .replace("<!--styles-->", () => `<style>${file(".css")}</style>`)
      .replace("<!--script-->", () => `<script>${file(".js").replaceAll("</script", "<\\/script")}</script>`);
    await mkdir(`${root}/dist`, { recursive: true });
    await writeFile(`${root}/dist/openpath-standalone.html`, html);
    console.log(`wrote dist/openpath-standalone.html (${Math.round(html.length / 1024)} kB)`);
  } else {
    await rm(`${root}/dist/assets`, { recursive: true, force: true });
    await esbuild.build(options({ minify: true, sourcemap: true }));
    await writeIndex();
  }
}
