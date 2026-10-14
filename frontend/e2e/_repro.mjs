import { chromium } from "playwright";
const base = process.argv[2];
const b = await chromium.launch();
const c = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
const p = await c.newPage();
const log = [];
p.on("console", (m) => log.push(`console.${m.type()}: ${m.text()}`));
p.on("pageerror", (e) => log.push(`pageerror: ${e.message}`));
p.on("response", (r) => r.url().includes("/api/") && log.push(`${r.request().method()} ${new URL(r.url()).pathname} -> ${r.status()}`));
// sign in as a parent through this origin (cookie + CSRF), as the app does
await p.goto(base + "/"); await p.waitForLoadState("networkidle"); log.push("cookies: " + (await c.cookies()).map((k) => k.name).join(","));
const email = `repro.${Date.now()}@example.org`;
const reg = await p.evaluate(async (email) => {
  const t = decodeURIComponent((document.cookie.match(/csrftoken=([^;]*)/) ?? [])[1] ?? "");
  const r = await fetch("/api/account/register/", { method: "POST", headers: { "Content-Type": "application/json", "X-CSRFToken": t }, body: JSON.stringify({ email, password: "a-long-family-passphrase", consent: true }) });
  return `${r.status} ${await r.text()}`;
}, email);
log.push(`register -> ${reg}`);
await p.goto(base + "/developer");
await p.waitForTimeout(6000);
console.log(log.join("\n"));
console.log("PAGE:", (await p.locator("body").innerText()).replace(/\n+/g, " | "));
await b.close();
