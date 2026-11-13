/**
 * My Learning Year at /year/ (added to an existing dist-english build, e.g. after build-mathematics-journey.mjs).
 *
 *   node scripts/build-year.mjs          the app as shipped: content is provisional, so nothing can show as verified
 *   node scripts/build-year.mjs --test   TEST BUILD for acceptance tests: every question is treated as educator-
 *                                        reviewed (a banner says so on every screen). Never deploy a test build.
 */
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";
const root = fileURLToPath(new URL("..", import.meta.url));
const test = process.argv.includes("--test");
// Recovery availability and the approval fixture are separate. Evaluation is one explicit build-time scope, with strict real review gates.
const evaluation = process.argv.find((a) => a.startsWith("--deep-evaluation="))?.split("=")[1] ?? "";
if (evaluation && (evaluation !== "integration-methods" || test || process.argv.includes("--deep-recovery"))) throw new Error("Use --deep-evaluation=integration-methods without --test or --deep-recovery.");
const deep = process.argv.includes("--deep-recovery") || !!evaluation;
// device-mode@1: no account server; records are kept in this browser (the hosted demo). Never with a test or research switch.
const device = process.argv.includes("--device");
if (device && (test || deep)) throw new Error("--device is a shipped build choice; it cannot be combined with --test or --deep-recovery.");
if (deep && !test && !evaluation) throw new Error("--deep-recovery is a research switch and needs --test (never in a shipped build).");
// a lower per-sitting limit, so a browser journey can reach a pause (research test builds only)
const sittingArg = process.argv.find((a) => a.startsWith("--deep-sitting="))?.split("=")[1];
const sitting = sittingArg === undefined ? 0 : Number(sittingArg);
if (sittingArg !== undefined && (!test || !deep || !Number.isInteger(sitting) || sitting < 1 || sitting >= 40)) throw new Error("--deep-sitting=N (1-39) needs --test --deep-recovery.");
const out = `${root}/${process.env.DIST ?? "dist-english"}/year`;
await mkdir(out, { recursive: true });
// instant-open@1: what the page shows before any script has arrived or run. It is plain HTML and CSS inside the page, so it
// appears at once; the app replaces it when it starts. (The same words and look as the app's own opening screen.)
const BOOT_CSS = `.boot{min-height:100vh;display:grid;place-content:center;justify-items:center;gap:14px;padding:24px;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#1f2540;background:linear-gradient(160deg,#f4eeff,#e6f7ef);text-align:center}.boot-mark{font-size:2.6rem}.boot-name{font-size:1.5rem;font-weight:800;margin:0}.boot-line{margin:0;color:#5a5f73}.boot-bar{width:180px;height:6px;border-radius:99px;background:rgba(91,70,214,.18);overflow:hidden}.boot-bar>span{display:block;width:40%;height:100%;border-radius:99px;background:#5b46d6;animation:boot-slide 1.2s ease-in-out infinite}@keyframes boot-slide{0%{transform:translateX(-110%)}100%{transform:translateX(270%)}}@media (prefers-reduced-motion:reduce){.boot-bar>span{animation:none;width:100%;opacity:.5}}`;
const BOOT_HTML = `<div class="boot" role="status" aria-live="polite"><div class="boot-mark" aria-hidden="true">🔢</div><p class="boot-name">OpenPath Maths</p><div class="boot-bar" aria-hidden="true"><span></span></div><p class="boot-line">Opening OpenPath…</p></div>`;
// instant-open@1 (--shell-cache, the family pilot image only): a service worker keeps the app's own files on the phone and
// answers from that copy at once, even while the server is asleep, then fetches the newer files for next time. It never
// touches /api/ or anything outside /year/. Not in test or research builds: several builds share one address there.
const shellCache = process.argv.includes("--shell-cache") && !test && !deep;

// fast-load@1: a large JSON file is carried as one string and read with JSON.parse when the app starts. The engine reads
// a JSON string several times faster than the same data written out as script, and most of this bundle is data.
const jsonAsText = {
  name: "json-as-text",
  setup(build) {
    build.onLoad({ filter: /\.json$/ }, async (args) => {
      const text = await readFile(args.path, "utf8");
      if (text.length < 20_000) return null; // small files stay as they are (and may still be imported by name)
      return { contents: `export default JSON.parse(${JSON.stringify(JSON.stringify(JSON.parse(text)))});`, loader: "js" };
    });
  },
};
await esbuild.build({
  entryPoints: [`${root}/src/year/Main.tsx`],
  plugins: [jsonAsText],
  bundle: true,
  loader: { ".woff2": "file" },
  format: "esm",
  target: "es2022",
  minify: !test,
  sourcemap: test ? "inline" : false,
  outdir: out,
  entryNames: "app",
  define: { "process.env.NODE_ENV": '"production"', OPENPATH_GEOMETRY_LAB: process.argv.includes("--geometry-lab") ? "true" : "false", OPENPATH_REVIEW_FIXTURE: test ? "true" : "false", OPENPATH_DEEP_RECOVERY: deep ? "true" : "false", OPENPATH_DEVICE: device ? "true" : "false", OPENPATH_NAME_START: process.argv.includes("--name-start") && !test ? "true" : "false", OPENPATH_SHELL_CACHE: shellCache ? "true" : "false", OPENPATH_DEEP_SITTING: String(sitting), OPENPATH_DEEP_EVALUATION: JSON.stringify(evaluation), __OPENPATH_TEACHING_MODE__: JSON.stringify(evaluation ? "supervised-evaluation" : "demonstration") },
});
await writeFile(
  `${out}/index.html`,
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#f4f6fc"><title>My Learning Year · OpenPath</title><link rel="stylesheet" href="app.css"><style>${BOOT_CSS}</style></head><body><div id="root">${BOOT_HTML}</div><script type="module" src="app.js"></script></body></html>`,
);
if (shellCache)
  await writeFile(
    `${out}/sw.js`,
    `// instant-open@1: the Maths app's own files, answered from this phone at once and refreshed behind (see build-year.mjs).
const CACHE = "openpath-year-shell-v1";
const SHELL = ["/year/", "/year/app.js", "/year/app.css"];
const keyOf = (u) => (u.pathname === "/year/index.html" ? "/year/" : u.pathname);
const ours = (u) => u.origin === location.origin && (u.pathname === "/year/" || u.pathname === "/year/index.html" || u.pathname === "/year/app.js" || u.pathname === "/year/app.css" || (u.pathname.startsWith("/year/") && u.pathname.endsWith(".woff2")));
self.addEventListener("install", (e) => { self.skipWaiting(); e.waitUntil(caches.open(CACHE).then((c) => Promise.all(SHELL.map((p) => fetch(p, { cache: "no-cache" }).then((r) => (r.ok && !r.redirected ? c.put(p, r) : undefined)).catch(() => undefined))))); });
self.addEventListener("activate", (e) => e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith("openpath-year-shell-") && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener("fetch", (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || !ours(u)) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const key = keyOf(u);
    const kept = await cache.match(key);
    // the newer copy, for next time; a sign-in page or an error is never kept in place of the app
    const fresh = fetch(key, { cache: "no-cache", credentials: "same-origin" }).then(async (r) => {
      if (r.ok && !r.redirected) {
        const changed = kept && kept.headers.get("etag") !== r.headers.get("etag");
        await cache.put(key, r.clone());
        if (changed && key === "/year/app.js") for (const c of await self.clients.matchAll()) c.postMessage({ type: "openpath-updated" });
      }
      return r;
    });
    if (kept) { e.waitUntil(fresh.catch(() => undefined)); return kept; }
    return fresh;
  })());
});
`,
  );
// the educator-review app at /review/ (never a test build: decisions are always real server decisions)
const rout = `${root}/${process.env.DIST ?? "dist-english"}/review`;
await mkdir(rout, { recursive: true });
await esbuild.build({ entryPoints: [`${root}/src/review/Main.tsx`], bundle: true, format: "esm", target: "es2022", minify: !test, sourcemap: test ? "inline" : false, outdir: rout, entryNames: "app", define: { "process.env.NODE_ENV": '"production"', OPENPATH_REVIEW_FIXTURE: "false" } });
await writeFile(`${rout}/index.html`, `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#f4f6fc"><title>Content review · OpenPath</title><link rel="stylesheet" href="app.css"></head><body><div id="root"></div><script type="module" src="app.js"></script></body></html>`);
console.log(`Built My Learning Year at /year/${device ? " (DEVICE BUILD: records stay in this browser)" : ""}${test ? " (TEST BUILD: review fixture on)" : ""}${deep ? ` (deep-recovery research switch available with ?deep=1${sitting ? `, ${sitting} per sitting` : ""})` : ""} and content review at /review/.`);

// Exact scoped denominator and migration gaps accompany every Year build.
execFileSync(process.execPath,["--import","tsx",`${root}/scripts/method-alignment-report.mts`,`${out}/method-alignment-report.json`],{cwd:root,stdio:["ignore","ignore","inherit"]});
