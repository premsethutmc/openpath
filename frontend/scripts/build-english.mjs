/**
 * Build the private OpenPath English web app (static files only; no server, no API).
 *
 *   node scripts/build-english.mjs     -> dist-english/
 *
 * Everything it needs is in the bundle: the engine, the framework, the item bank, the generated
 * spelling items, lessons and feedback. The licence notices of the word sources are copied alongside.
 */
import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";

const root = fileURLToPath(new URL("..", import.meta.url));
const out = `${root}/dist-english`;
const licences = `${root}/../content/english/spelling/licences`;

await rm(out, { recursive: true, force: true });
await mkdir(`${out}/assets`, { recursive: true });
await esbuild.build({
  absWorkingDir: root,
  entryPoints: ["src/english/ui/main.tsx"],
  bundle: true,
  format: "esm",
  target: ["es2022", "safari15"],
  jsx: "automatic",
  outdir: "dist-english/assets",
  entryNames: "app",
  minify: true,
  sourcemap: true,
  define: { "process.env.NODE_ENV": '"production"' },
  logLevel: "warning",
});
const js = await readFile(`${out}/assets/app.js`);
const css = await readFile(`${out}/assets/app.css`);
const version = createHash("sha256").update(js).update(css).digest("hex").slice(0, 12);

const template = await readFile(`${root}/english.html`, "utf8");
await writeFile(
  `${out}/index.html`,
  template.replace("<!--styles-->", `<link rel="stylesheet" href="assets/app.css?v=${version}" />`).replace("<!--script-->", `<script type="module" src="assets/app.js?v=${version}"></script>`),
);

await mkdir(`${out}/licences`, { recursive: true });
const notices = await readdir(licences);
for (const f of notices) await copyFile(`${licences}/${f}`, `${out}/licences/${f}`);

await writeFile(
  `${out}/icon.svg`,
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="#fbfcf8"/><g stroke="#c9d8ee" stroke-width="2"><path d="M6 22h52M6 34h52M6 46h52"/></g><path d="M16 6v52" stroke="#d2453b" stroke-width="2.5"/><path d="M24 44c6-18 12-24 16-24 3 0 3 4 0 8s-8 9-6 13c2 3 7 1 12-5" fill="none" stroke="#1f3a93" stroke-width="4" stroke-linecap="round"/></svg>`,
);
await writeFile(
  `${out}/manifest.webmanifest`,
  JSON.stringify({ name: "OpenPath English", short_name: "OpenPath", start_url: "./", scope: "./", display: "standalone", background_color: "#eef2f7", theme_color: "#1f3a93", icons: [{ src: "icon.svg", sizes: "any", type: "image/svg+xml" }] }, null, 1),
);

// Offline: cache the app's own files on first visit; serve them from the cache, refreshing in the background.
const files = ["./", "index.html", `assets/app.js?v=${version}`, `assets/app.css?v=${version}`, "manifest.webmanifest", "icon.svg", ...notices.map((f) => `licences/${f}`)];
await writeFile(
  `${out}/sw.js`,
  `// OpenPath English offline cache (app files only; learner data stays in IndexedDB or the account server, never here).
const CACHE = "openpath-english-${version}";
const FILES = ${JSON.stringify(files)};
self.addEventListener("install", (e) => e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting())));
self.addEventListener("activate", (e) => e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith("openpath-english-") && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  // never the account API: a pupil's record must not be cached, and must always be current
  if (e.request.method !== "GET" || url.origin !== location.origin || url.pathname.startsWith("/api/")) return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: url.pathname.endsWith("/") || url.pathname.endsWith("index.html") }).then((hit) => {
      const net = fetch(e.request).then((res) => { if (res.ok) caches.open(CACHE).then((c) => c.put(e.request, res.clone())); return res; }).catch(() => hit || caches.match("index.html"));
      return hit || net;
    }),
  );
});
`,
);
console.log(`wrote dist-english/ (version ${version}, app.js ${Math.round(js.length / 1024)} kB)`);
