/**
 * End-to-end: Read aloud on an Android-sized phone (Chromium emulating 412×915; not a physical phone). The real
 * recogniser (vosk-browser and the small English model, served by the build) listens to synthetic recordings: the
 * page's microphone is replaced by an audio stream playing an espeak-ng recording of what the test chooses to "say"
 * (tools/english/read-aloud/synth.py). A robotic voice, not a child: this checks the whole pipeline in the browser
 * (model download, microphone, grammar, alignment, screens), not accuracy on children.
 *
 *   OPENPATH_READ_ALOUD=1 npm run english:build && npm run english:preview &
 *   RA_PYTHON=<python with espeakng-loader> E2E_URL=http://127.0.0.1:4174 npm run english:e2e-read-aloud
 * Against the family site's own server (its password, headers and CSP): E2E_PASSWORD=<the site password>.
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, test } from "node:test";
import { chromium } from "playwright";

const URL = process.env.E2E_URL ?? "http://127.0.0.1:4174";
const PY = process.env.RA_PYTHON ?? "python3";
const SYNTH = new globalThis.URL("../../tools/english/read-aloud/synth.py", import.meta.url).pathname;
const SHOTS = process.env.E2E_SHOTS;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });
const shot = async (page, name) => SHOTS && page.screenshot({ path: `${SHOTS}/read-aloud-${name}.png`, fullPage: true });
// service workers off: requests a worker makes would not reach the test's fake recordings
const ANDROID = { viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true, serviceWorkers: "block" };
const SENTENCES = new Map(JSON.parse(readFileSync(new globalThis.URL("../../content/english/dictation/sentences.json", import.meta.url), "utf8")).sentences.map(([id, level, text]) => [id, { level, text }]));
const words = (t) => t.replace(/[‘’]/g, "'").split(/\s+/).map((w) => w.replace(/^[^A-Za-z0-9']+|[^A-Za-z0-9']+$/g, "")).filter(Boolean);
const dir = mkdtempSync(join(tmpdir(), "ra-"));
let n = 0;
function clip(text) {
  const out = join(dir, `${n++}.wav`);
  execFileSync(PY, [SYNTH, text, "en-us", "140", out]);
  return readFileSync(out);
}

// the page's microphone: plays whatever window.__raSay holds when the app asks for it, then reports when it ended
const FAKE_MIC = () => {
  navigator.mediaDevices.getUserMedia = async () => {
    const ctx = new AudioContext();
    const data = await (await fetch(`/__clip?text=${encodeURIComponent(window.__raSay ?? "")}`)).arrayBuffer();
    const src = ctx.createBufferSource();
    src.buffer = await ctx.decodeAudioData(data);
    const dest = ctx.createMediaStreamDestination();
    src.connect(dest);
    window.__raDone = new Promise((r) => (src.onended = r));
    src.start(ctx.currentTime + 0.3);
    return dest.stream;
  };
};

let browser;
before(async () => {
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ["--autoplay-policy=no-user-gesture-required"] });
});
after(() => browser?.close());

async function start(name) {
  const context = await browser.newContext(ANDROID);
  const page = await context.newPage();
  const errors = [];
  const foreign = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (r) => {
    const u = new globalThis.URL(r.url());
    if (!["127.0.0.1", "localhost"].includes(u.hostname) && !["data:", "blob:"].includes(u.protocol)) foreign.push(r.url());
  });
  await page.addInitScript(FAKE_MIC);
  await page.route("**/__clip?*", (route) => route.fulfill({ status: 200, contentType: "audio/wav", body: clip(new globalThis.URL(route.request().url()).searchParams.get("text")) }));
  await page.goto(URL);
  // behind the family site's password (scripts/preview-server.mjs): E2E_PASSWORD logs in first
  if (process.env.E2E_PASSWORD) {
    await page.locator("#password").fill(process.env.E2E_PASSWORD);
    await page.getByRole("button", { name: "Log in" }).click();
  }
  await page.getByRole("button", { name: "Let's begin" }).click();
  await page.getByLabel(/Name to show/).fill(name);
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Build my path" }).click();
  await page.locator("#consent").check();
  await page.getByRole("button", { name: "Build my path" }).click();
  return { context, page, errors, foreign };
}

async function read(page, say) {
  await page.evaluate((s) => (window.__raSay = s), say);
  await page.getByRole("button", { name: "🎤 Start reading" }).click();
  await page.getByText(/^Listening/).waitFor({ timeout: 20000 }).catch(async (e) => {
    const why = await page.evaluate(() => navigator.mediaDevices.getUserMedia({ audio: true }).then(() => "fake microphone works", (x) => String(x)));
    throw new Error(`not listening (${why}): ${await page.locator("main").innerText()}`, { cause: e });
  });
  await page.waitForFunction(() => window.__raDone !== undefined);
  await page.evaluate(() => window.__raDone);
  await page.waitForTimeout(600);
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await page.locator('main[data-phase="result"]').waitFor({ timeout: 15000 });
  return page.locator(".ra-words span").evaluateAll((els) => els.map((e) => [e.textContent, e.className.replace("ra-", "")]));
}

test("Read aloud: model loads on the phone, clean readings are all green, a skipped word is flagged and read again", { timeout: 240000 }, async () => {
  const { context, page, errors, foreign } = await start("Reader");
  await page.getByRole("button", { name: "Read aloud", exact: true }).click();
  await page.getByRole("heading", { name: "Read a sentence out loud" }).waitFor();
  await shot(page, "intro");
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await page.locator('main[data-phase="ready"]').waitFor({ timeout: 120000 });
  const tally = { clean: 0, flaggedRight: 0 };
  for (let i = 1; i <= 5; i++) {
    await page.getByText(`Sentence ${i} of 5`, { exact: true }).waitFor();
    const s = SENTENCES.get(await page.locator("main").getAttribute("data-sentence"));
    const w = words(s.text);
    assert.equal(await page.locator(".ra-sentence").textContent(), s.text);
    if (i === 2 && w.length > 2) {
      // skip a middle word: it must not come out green, and the reading can be tried again
      const k = Math.floor(w.length / 2);
      const got = await read(page, [...w.slice(0, k), ...w.slice(k + 1)].join(" "));
      await shot(page, "skipped");
      console.log(`  skipped "${w[k]}" in "${s.text}" ->`, got.map(([t, c]) => `${t}:${c}`).join(" "));
      assert.notEqual(got[k][1], "read", `skipped word "${w[k]}" shown as read`);
      tally.flaggedRight++;
      await page.getByRole("button", { name: "Read it again" }).click();
    }
    const got = await read(page, w.join(" "));
    console.log(`  read "${s.text}" ->`, got.map(([t, c]) => `${t}:${c}`).join(" "));
    assert.deepEqual(got.map(([t]) => t), w);
    if (got.every(([, c]) => c === "read")) tally.clean++;
    if (i === 1) await shot(page, "result");
    await page.getByRole("button", { name: i < 5 ? "Next sentence" : "Finish" }).click();
  }
  await page.locator('main[data-phase="done"]').waitFor();
  await shot(page, "done");
  console.log(`  ${tally.clean} of 5 correct readings all green; skipped word flagged: ${tally.flaggedRight}`);
  assert.ok(tally.clean >= 4, `only ${tally.clean} of 5 correct readings came out all green`);
  assert.deepEqual(foreign, [], "nothing is requested from anywhere else");
  assert.deepEqual(errors, []);
  await context.close();
});
