// Smoke test of the PR #55 preview container (deploy/preview): the password gate, one OpenPath account for English and
// Mathematics, the Tamil entry point, and the record surviving a container restart. Synthetic test data only.
//   PHASE=write  register, add a learner, save a mathematics activity
//   PHASE=read   (after `docker restart`) log in again and find everything as it was
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { after, before, test } from "node:test";
import { chromium } from "playwright";

const base = process.env.PREVIEW_URL ?? "http://localhost:10000";
const state = process.env.PREVIEW_STATE ?? "/tmp/preview-smoke.json";
const PASSWORD = process.env.PREVIEW_PASSWORD ?? "test-preview-pass";
const ACCOUNT = { password: "synthetic-preview-passphrase" };
let browser;
before(async () => (browser = await chromium.launch()));
after(() => browser?.close());

async function call(page, path, body) {
  return page.evaluate(
    async ({ path, body }) => {
      const token = document.cookie.match(/(?:^|; )csrftoken=([^;]*)/)?.[1] ?? "";
      const r = await fetch("/api" + path, { method: body ? "POST" : "GET", credentials: "same-origin", headers: { "Content-Type": "application/json", "X-CSRFToken": decodeURIComponent(token) }, ...(body ? { body: JSON.stringify(body) } : {}) });
      return { status: r.status, data: r.status === 204 ? null : await r.json().catch(() => null) };
    },
    { path, body },
  );
}
async function gate(page) {
  await page.goto(base + "/");
  assert.match(page.url(), /\/login$/, "nothing is shown before the preview password");
  await page.getByLabel("Preview password").fill(PASSWORD);
  await page.getByRole("button", { name: "Log in" }).click();
  await page.waitForURL(base + "/");
  await call(page, "/account/"); // sets the CSRF cookie
}

test(`preview smoke: ${process.env.PHASE ?? "write"}`, async () => {
  const context = await browser.newContext({ viewport: { width: 412, height: 900 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  page.on("pageerror", (e) => console.log(`PAGEERROR ${e.message} ${String(e.stack).split("\n").slice(1, 6).map((l) => l.trim().replace(/https?:\/\/[^/]+/, "")).join(" | ")}`));
  page.on("console", (m) => m.type() === "error" && console.log(`CONSOLEERROR ${m.text()}`));
  await gate(page);
  if ((process.env.PHASE ?? "write") === "write") {
    const email = `preview-${Date.now()}@example.org`;
    assert.equal((await call(page, "/account/register/", { email, password: ACCOUNT.password, consent: true })).status, 201);
    const pupil = await call(page, "/pupils/", { display_name: "Synthetic preview learner", consent: true });
    assert.equal(pupil.status, 201);
    await page.goto(base + "/mathematics.html");
    const done = page.getByRole("button", { name: "Finish activity and save place", exact: true });
    await done.waitFor();
    await done.click();
    await page.getByRole("status").filter({ hasText: "Saved to OpenPath account" }).waitFor();
    const maths = (await call(page, `/pupils/${pupil.data.id}/events/?subject=mathematics`)).data.events;
    assert.ok(maths.length >= 1);
    await page.goto(base + "/");
    await page.getByRole("heading", { name: "Who is learning today?" }).waitFor();
    await page.getByRole("button", { name: /Synthetic preview learner/ }).waitFor();
    await page.goto(base + "/tamil/");
    await page.getByText("தமிழுடன் விளையாடுவோம்!").waitFor();
    await page.goto(base + "/maths/");
    await page.getByRole("heading", { name: "What are you preparing for?" }).waitFor();
    assert.equal(await page.locator("select").count(), 0, "no drop-downs on the JEE chapter");
    await page.getByRole("button", { name: /JEE Main/ }).click();
    try {
      await page.getByRole("button", { name: /Quadratic Equations/ }).waitFor({ timeout: 15000 });
    } catch (e) {
      console.log(`BODY ${(await page.locator("body").innerText()).replace(/\s+/g, " ").slice(0, 400)}`);
      throw e;
    }
    writeFileSync(state, JSON.stringify({ email, pupil: pupil.data.id, maths: maths.length }));
  } else {
    const s = JSON.parse(readFileSync(state, "utf8"));
    assert.equal((await call(page, "/account/")).data.authenticated, false, "a new browser starts signed out");
    const login = await call(page, "/account/login/", { email: s.email, password: ACCOUNT.password });
    assert.equal(login.status, 200, JSON.stringify(login.data));
    const pupils = (await call(page, "/pupils/")).data.pupils;
    assert.deepEqual(pupils.map((p) => p.id), [s.pupil], "the same learner after the restart");
    assert.equal((await call(page, `/pupils/${s.pupil}/events/?subject=mathematics`)).data.events.length, s.maths, "mathematics progress kept");
    await page.goto(`${base}/mathematics.html?learner=${s.pupil}&journey=school`);
    await page.getByRole("button", { name: "Finish activity and save place", exact: true }).waitFor();
  }
  await context.close();
});
