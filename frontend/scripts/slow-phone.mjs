/**
 * slow-phone@1: how long the English app takes to open on a cheap Android phone on a weak connection.
 * Serves dist-english compressed (as the real server does, static-send.mjs), then opens it in Chromium with the CPU
 * slowed four times and the network held to "Slow 4G" (1.6 Mbps down, 750 kbps up, 150 ms round trip).
 * Reports the bytes sent and the time until the welcome screen can be tapped, first visit and a later visit.
 *   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scripts/slow-phone.mjs
 */
import http from "node:http";
import { existsSync, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { chromium } from "playwright";
import { sendStatic } from "./static-send.mjs";

const dist = new URL("../dist-english/", import.meta.url).pathname;
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".txt": "text/plain; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".webmanifest": "application/manifest+json", ".map": "application/json" };
const server = http.createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (path.startsWith("/api/")) {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ authenticated: false, accounts: false }));
  }
  let file = normalize(join(dist, path === "/" ? "index.html" : path));
  if (!file.startsWith(dist) || !existsSync(file) || statSync(file).isDirectory()) file = join(dist, "index.html");
  await sendStatic(req, res, file, { type: TYPES[extname(file)] ?? "application/octet-stream", html: extname(file) === ".html" });
});
await new Promise((r) => server.listen(4190, r));
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
const page = await context.newPage();
const cdp = await context.newCDPSession(page);
await cdp.send("Network.enable");
await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 });
await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
let bytes = 0;
cdp.on("Network.loadingFinished", (e) => (bytes += e.encodedDataLength));
const open = async () => {
  bytes = 0;
  const t = Date.now();
  await page.goto("http://127.0.0.1:4190/", { waitUntil: "commit" });
  await page.getByRole("button", { name: "Let's begin" }).waitFor({ timeout: 120_000 });
  return { seconds: ((Date.now() - t) / 1000).toFixed(1), kb: Math.round(bytes / 1024) };
};
const first = await open();
const again = await open();
console.log(JSON.stringify({ first, again }));
await browser.close();
server.close();
