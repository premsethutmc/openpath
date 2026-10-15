/**
 * End-to-end: the private Render demo (scripts/demo-server.mjs) in a real browser at Android phone size, serving the
 * real development build (npm run english:build first). The server is started by this test with a throwaway password.
 *
 *   npm run english:build && npm run english:e2e-demo
 *
 * Covers: the login wall, wrong and right passwords, the English app behind it (placement, feedback, automatic
 * progression to the spelling check, dictation with an adult reader, Progress and Journey), reload and deep links,
 * no sideways scrolling at 412 px, logout, and that nothing is requested from any other site. Chromium emulating a
 * phone is not a physical Android phone. Synthetic learners only.
 */
import assert from "node:assert/strict";
import { mkdirSync, readFileSync } from "node:fs";
import { after, before, test } from "node:test";
import { chromium } from "playwright";
import { configFromEnv, createDemoServer, hashPassword } from "../scripts/demo-server.mjs";

const PASSWORD = "e2e only: a throwaway demo passphrase";
const SHOTS = process.env.E2E_SHOTS;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });
const shot = async (page, name) => SHOTS && page.screenshot({ path: `${SHOTS}/demo-${name}.png`, fullPage: true });
const CONTENT = new URL("../../content/english/", import.meta.url);
const items = new Map(
  ["items/code-items.json", "items/e2a-items.json", "items/e2b-items.json", "spelling/generated-items.json", "pilot/items.json", "spelling/dictation-bank.json"].flatMap((f) => ((j) => (Array.isArray(j) ? j : j.items))(JSON.parse(readFileSync(new URL(f, CONTENT), "utf8"))).map((i) => [i.id, i])),
);
const ANDROID = {
  viewport: { width: 412, height: 915 },
  deviceScaleFactor: 2.625,
  isMobile: true,
  hasTouch: true,
  userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36",
};

let browser;
let server;
let URL_;
before(async () => {
  const { problems, config } = configFromEnv({ DEMO_PASSWORD_HASH: await hashPassword(PASSWORD), DEMO_SESSION_SECRET: "e2e-only-session-secret-0123456789abcdef", DEMO_ALLOW_HTTP: "1" });
  assert.deepEqual(problems, [], "build the app first: npm run english:build");
  server = createDemoServer(config, { log: () => {} });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  URL_ = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
});
after(async () => {
  await browser?.close();
  server?.close();
});

async function fits(page) {
  const { sw, w } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, w: window.innerWidth }));
  assert.ok(sw <= w, `page is ${sw}px wide on a ${w}px screen`);
}

async function answer(page, right) {
  const id = await page.locator(".item").getAttribute("data-item");
  const item = items.get(id);
  assert.ok(item, `unknown item ${id}`);
  const kind = item.format.split(":")[0];
  const opts = page.locator(".answer .option");
  if (kind === "typed") await page.locator(".ruled input").fill(right ? item.answers[0] : "zzzq");
  else if (kind === "choice") await opts.nth(right ? item.answer : (item.answer + 1) % item.options.length).click();
  else if (kind === "multi") for (const i of right ? item.answer_set : [0]) await opts.nth(i).click();
  else if (kind === "order") for (const i of right ? item.answer_order : [...item.answer_order].reverse()) await opts.nth(i).click();
  else if (kind === "match") {
    const sel = page.locator(".match select");
    for (let k = 0; k < item.left.length; k++) await sel.nth(k).selectOption(String(right ? item.answer_pairs[k] : item.answer_pairs[(k + 1) % item.left.length]));
  }
  await page.getByRole("button", { name: "Check", exact: true }).click();
  await page.locator(".feedback").waitFor();
  return item;
}

/** Work through the open session; an adult reads dictation words (headless Chromium has no voice). */
async function finish(page, right) {
  const asked = [];
  for (let n = 0; n < 45; n++) {
    await page.locator(".item, .done, .spelling-intro").first().waitFor({ timeout: 8000 });
    if (await page.locator(".spelling-intro").count()) {
      // the device's own voice when this browser has one, otherwise an adult reads the words
      const start = page.getByRole("button", { name: "Start the spelling check" }).or(page.getByRole("button", { name: "An adult will read the words aloud" }));
      await start.first().click();
      await page.locator(".spelling-intro").waitFor({ state: "detached" });
      continue;
    }
    if (await page.locator(".done").count()) return asked;
    if (await page.getByRole("button", { name: "Show the word to read aloud" }).count()) {
      await page.getByRole("button", { name: "Show the word to read aloud" }).click();
      await page.getByRole("button", { name: /Hide it/ }).click();
    }
    asked.push(await answer(page, right(n)));
    await fits(page);
    await page.getByRole("button", { name: "Next" }).click();
    await page.locator(".feedback").waitFor({ state: "detached" });
  }
  throw new Error("the session did not end");
}

test("the private demo on an Android-sized phone: login wall, the English app, reload and deep links, logout", async () => {
  const context = await browser.newContext(ANDROID);
  const page = await context.newPage();
  const errors = [];
  const foreign = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (r) => new URL(r.url()).host !== new URL(URL_).host && !r.url().startsWith("data:") && foreign.push(r.url()));

  // 1. nothing before logging in: every address leads to the login page
  for (const path of ["/", "/developer", "/assets/app.js", "/some/deep/link"]) {
    const res = await page.goto(URL_ + path);
    assert.match(page.url(), /\/login$/, path);
    assert.equal(res.status(), 200);
    assert.equal(await page.locator("#password").count(), 1);
  }
  await fits(page);
  await shot(page, "1-login");
  // 2. a wrong password
  await page.locator("#password").fill("not the password");
  await page.getByRole("button", { name: "Log in" }).click();
  await page.getByText("That password is not right.").waitFor();
  // 3. the right one: the English app
  await page.locator("#password").fill(PASSWORD);
  await page.getByRole("button", { name: "Log in" }).click();
  await page.getByRole("button", { name: "Let's begin" }).waitFor();
  await fits(page);
  assert.equal((await context.cookies()).filter((c) => c.name === "openpath_demo" && c.httpOnly && c.sameSite === "Strict").length, 1);
  await page.getByRole("button", { name: "Let's begin" }).click();
  await page.getByLabel(/Name to show/).fill("Demo Learner");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Build my path" }).click();
  await page.locator("#consent").check();
  await page.getByRole("button", { name: "Build my path" }).click();
  // 4. placement: questions, feedback after each, Next moves on, and the session ends by itself
  await page.locator(".plan li").getByRole("button", { name: "Start" }).first().click();
  await page.locator(".item").waitFor();
  // a reload in the middle of the session carries on (deep state survives a refresh)
  const first = await page.locator(".item").getAttribute("data-item");
  await page.reload();
  await page.getByRole("button", { name: "Carry on" }).click();
  assert.equal(await page.locator(".item").getAttribute("data-item"), first, "the same question after a reload");
  const placement = await finish(page, (n) => n % 3 !== 2);
  assert.ok(placement.length >= 12, `${placement.length} placement questions`);
  await shot(page, "2-placement-done");
  await page.getByRole("button", { name: "Back to today" }).click();
  // 5. automatic progression: the plan moves on to the spelling check (dictation), here with an adult reading
  await page.getByRole("heading", { name: "Spelling check: hear and spell" }).waitFor();
  await page.locator(".plan li").getByRole("button", { name: "Start" }).first().click();
  const check = await finish(page, (n) => n % 2 === 0);
  assert.ok(check.length >= 8 && check.every((i) => i.format === "typed:dictation"), "the spelling check is dictation");
  await page.getByRole("button", { name: "Back to today" }).click();
  // 6. the plan, Progress and Journey reflect the answers; the version is labelled as development (not approved)
  await page.getByRole("heading", { name: "Today" }).waitFor();
  await fits(page);
  await shot(page, "3-home");
  const nav = page.getByRole("navigation", { name: "Sections" });
  await nav.getByRole("button", { name: "Progress" }).click();
  await page.getByRole("heading", { name: "Progress" }).waitFor();
  await fits(page);
  await shot(page, "4-progress");
  await nav.getByRole("button", { name: "Journey" }).click();
  await page.getByRole("heading", { name: /Your learning path/ }).waitFor();
  await fits(page);
  await nav.getByRole("button", { name: "Me", exact: true }).click();
  await page.getByText(/Development version: practice words include ones not yet reviewed/).waitFor();
  await fits(page);
  // 7. reload and a deep link keep the session and the learner
  await page.reload();
  await page.getByRole("heading", { name: "Today" }).waitFor();
  await page.goto(URL_ + "/developer");
  assert.ok(!/\/login$/.test(page.url()), "the developer page is behind the same login");
  await page.goto(URL_ + "/");
  await page.getByRole("heading", { name: "Today" }).waitFor();
  // 8. logout: back to the login page, and the app is closed again
  await page.goto(URL_ + "/logout");
  await fits(page);
  await shot(page, "5-logout");
  await page.getByRole("button", { name: "Log out", exact: true }).click();
  await page.getByText("You are logged out.").waitFor();
  await page.goto(URL_ + "/");
  assert.match(page.url(), /\/login$/);
  assert.equal((await page.request.get(URL_ + "/assets/app.js")).status(), 401);
  // 9. logging in again finds the demo learner (kept in this browser), until "log out and erase"
  await page.locator("#password").fill(PASSWORD);
  await page.getByRole("button", { name: "Log in" }).click();
  await page.getByText("Demo Learner").first().waitFor();
  await page.goto(URL_ + "/logout");
  await page.getByRole("button", { name: /erase the demo learners/ }).click();
  await page.getByText("You are logged out.").waitFor();
  assert.deepEqual(foreign, [], "nothing is requested from any other site");
  assert.deepEqual(errors, []);
  await context.close();
});

test("spoken words behind the demo login: the app asks the browser's voice to say each dictation word (playback only, no microphone)", async () => {
  // headless Chromium has no voices: a stand-in voice records what the app asks it to say (as in e2e/spelling.test.mjs)
  const context = await browser.newContext(ANDROID);
  await context.addInitScript(() => {
    const v = { name: "Test English (UK)", lang: "en-GB", localService: true, default: true, voiceURI: "test-en-gb" };
    window.__spoken = [];
    window.SpeechSynthesisUtterance = class {
      constructor(text) {
        this.text = text;
      }
    };
    Object.defineProperty(window, "speechSynthesis", { configurable: true, value: { getVoices: () => [v], speak: (u) => { window.__spoken.push(u.text); if (!(window.__drop > 0 && window.__drop--)) setTimeout(() => u.onstart?.(), 0); }, cancel: () => undefined, addEventListener: () => undefined, removeEventListener: () => undefined, speaking: false, pending: false } });
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const spoken = () => page.evaluate(() => window.__spoken.slice());
  await page.goto(URL_ + "/login");
  await page.locator("#password").fill(PASSWORD);
  await page.getByRole("button", { name: "Log in" }).click();
  const app = await page.request.get(URL_ + "/");
  assert.match(app.headers()["permissions-policy"], /microphone=\(\)/, "the microphone stays off: dictation only plays speech");
  await page.getByRole("button", { name: "Let's begin" }).click();
  await page.getByLabel(/Name to show/).fill("Voice Learner");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Build my path" }).click();
  await page.locator("#consent").check();
  await page.getByRole("button", { name: "Build my path" }).click();
  await page.locator(".plan li").getByRole("button", { name: "Start" }).first().click();
  await finish(page, () => true);
  await page.getByRole("button", { name: "Back to today" }).click();
  await page.getByRole("heading", { name: "Spelling check: hear and spell" }).waitFor();
  await page.locator(".plan li").getByRole("button", { name: "Start" }).first().click();
  await page.locator(".spelling-intro").waitFor();
  await page.getByRole("button", { name: "Test the sound" }).click();
  assert.deepEqual(await spoken(), ["Ready? Here is a test word: garden."]);
  await page.getByRole("button", { name: "Start the spelling check" }).click();
  for (let k = 0; k < 3; k++) {
    await page.locator(".item").waitFor();
    const item = items.get(await page.locator(".item").getAttribute("data-item"));
    assert.equal(item.format, "typed:dictation");
    const word = item.answers[0];
    // said by itself as soon as it is shown (the word, its sentence, the word), and never written on the screen
    await page.waitForFunction((w) => window.__spoken.some((x) => x === w || x.startsWith(`${w}. `)), word);
    assert.ok(!(await page.locator("main").innerText()).toLowerCase().includes(word), `${word} is not shown before the answer`);
    if (k === 0) {
      await page.getByRole("button", { name: "Repeat the word" }).click();
      assert.equal((await spoken()).at(-1), word, "Repeat says the word again");
    }
    await page.locator(".ruled input").fill(word);
    await page.getByRole("button", { name: "Check", exact: true }).click();
    await page.locator(".feedback").waitFor();
    await page.getByRole("button", { name: "Next" }).click();
    await page.locator(".feedback").waitFor({ state: "detached" });
  }
  assert.ok((await spoken()).length >= 5);
  assert.deepEqual(errors, []);
  await context.close();
});
