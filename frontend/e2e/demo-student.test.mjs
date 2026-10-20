import { notebookOption } from "./notebook-helpers.mjs";
/** Actual packaged preview + Django. No registration, passwords, fixture scoring or mocked APIs. */
import assert from "node:assert/strict";
import { test, before, after } from "node:test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";
const BASE = process.env.E2E_URL ?? "http://127.0.0.1:4695";
let browser;
before(async () => {
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
  });
});
after(() => browser?.close());
const opts = {
  viewport: { width: 360, height: 800 },
  hasTouch: true,
  isMobile: true,
  serviceWorkers: "block",
};
const statefile = "/tmp/openpath-demo-student-state.json";
async function start(c) {
  const p = await c.newPage();
  p.setDefaultTimeout(20000);
  await p.goto(BASE);
  const button = p.getByRole("button", {
    name: "Try OpenPath as a Demo Student",
    exact: true,
  });
  await button.waitFor();
  assert.ok(await button.isVisible());
  assert.equal(
    await p.getByLabel("Preview password", { exact: true }).isVisible(),
    false,
  );
  mkdirSync("../docs/product/mathematical-writing/screens-demo", {
    recursive: true,
  });
  await p.screenshot({
    path: "../docs/product/mathematical-writing/screens-demo/demo-entry-android.png",
    fullPage: true,
  });
  await button.click();
  await p.getByLabel("Progressive long division", { exact: true }).waitFor();
  await p.getByLabel("Lesson options", {exact:true}).click();
  await p.getByLabel("Demo student session").waitFor();
  await p.getByLabel("Lesson options", {exact:true}).click();
  return p;
}
async function request(c, path, method = "GET", data) {
  const csrf = (await c.cookies()).find((x) => x.name === "csrftoken")?.value;
  return c.request.fetch(BASE + "/api" + path, {
    method,
    data,
    headers: { "X-CSRFToken": csrf ?? "" },
  });
}
async function status(c) {
  const r = await request(c, "/preview-demo/status/");
  assert.equal(r.status(), 200);
  return r.json();
}
if (process.env.PREVIEW_PHASE === "resume") {
  test("demo session and unfinished mathematical work survive a container restart", async () => {
    const saved = JSON.parse(readFileSync(statefile, "utf8"));
    const c = await browser.newContext({ ...opts, storageState: saved.state });
    assert.equal((await status(c)).learner, saved.learner);
    const p = await c.newPage();
    await p.goto(saved.url);
    await notebookOption(p, "Help me step by step");
    await p
      .getByRole("button", { name: "Edit Quotient: 12", exact: true })
      .waitFor();
    await c.close();
  });
} else {
  test("one tap opens a real mathematics lesson at Android width; close/reopen resumes; reset is isolated", async () => {
    let c = await browser.newContext(opts);
    let p = await start(c);
    const a = await status(c);
    assert.match(p.url(), /\/year\/.*#writing\/MATH.number.long-division/);
    assert.equal(
      await p.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false,
      "no horizontal page overflow",
    );
    mkdirSync("../docs/product/mathematical-writing/screens-demo", {
      recursive: true,
    });
    await p.screenshot({
      path: "../docs/product/mathematical-writing/screens-demo/one-tap-lesson-android.png",
      fullPage: true,
    });
    await notebookOption(p, "Help me step by step");
    await p
      .getByRole("button", { name: "See a worked example", exact: true })
      .click();
    await p
      .getByRole("button", { name: "Open my working", exact: true })
      .click();
    await p
      .getByLabel("Mathematical region", { exact: true })
      .selectOption("quotient");
    await p
      .getByRole("textbox", { name: "Number or expression", exact: true })
      .fill("12");
    await p
      .getByRole("button", { name: "Add typed step", exact: true })
      .click();
    await p.getByText("Saved in your account", { exact: true }).waitFor();
    const saved = await c.storageState();
    await c.close();
    c = await browser.newContext({ ...opts, storageState: saved });
    p = await c.newPage();
    await p.goto(BASE + "/year/");
    // Reopening from the entry resumes the last draft without creating another identity.
    await p.goto(BASE + "/logout"); // exit screen only, does not end the session until POST
    await p.getByRole("button", { name: "Log out", exact: true }).click();
    await p
      .getByRole("button", {
        name: "Try OpenPath as a Demo Student",
        exact: true,
      })
      .click();
    await notebookOption(p, "Help me step by step");
    await p
      .getByRole("button", { name: "Edit Quotient: 12", exact: true })
      .waitFor();
    assert.equal((await status(c)).learner, a.learner);
    const other = await browser.newContext(opts);
    await start(other);
    const b = await status(other);
    assert.notEqual(a.learner, b.learner);
    assert.equal(
      (
        await request(c, `/pupils/${b.learner}/events/?subject=mathematics`)
      ).status(),
      403,
    );
    await p.getByRole("button", {name:"Back to division paper",exact:true}).click();
    await p.getByLabel("Lesson options", {exact:true}).click();
    await p
      .getByText("Demo options · synthetic learner", { exact: true })
      .click();
    await p
      .getByRole("button", { name: "Reset demo and restart", exact: true })
      .click();
    await p.getByLabel("Progressive long division", { exact: true }).waitFor();
    const fresh = await status(c);
    assert.notEqual(fresh.learner, a.learner);
    assert.equal((await status(other)).learner, b.learner);
    const stream = await request(
      c,
      `/pupils/${fresh.learner}/events/?subject=mathematics`,
    );
    const resetEvents = (await stream.json()).events;
    assert.equal(
      resetEvents.filter((e) => e.kind === "learning_record").length,
      1,
      "reset has only the new enrolment",
    );
    assert.ok(
      resetEvents
        .filter((e) => e.kind === "math_writing")
        .every((e) => e.admissible === false && e.action === "assigned"),
      "opening the lesson adds only formative receipts",
    );
    await c.close();
    await other.close();
  });
  test("demo sessions cannot reach educator/account routes, other subjects or bypass the gateway", async () => {
    const c = await browser.newContext(opts);
    await start(c);
    const s = await status(c);
    for (const path of [
      "/review/",
      "/maths/",
      "/writing.html",
      "/api/developer/overview/",
      "/api/content-review/",
      "/api/account/password/",
      `/api/pupils/${s.learner}/events/?subject=english`,
    ]) {
      assert.equal((await c.request.get(BASE + path)).status(), 403, path);
    }
    assert.equal(
      (
        await c.request.post(BASE + "/demo/reset", {
          headers: { Origin: "https://untrusted.invalid" },
        })
      ).status(),
      403,
    );
    assert.equal(
      (
        await c.request.post(BASE + "/demo/reset", {
          headers: { Origin: BASE },
        })
      ).status(),
      403,
      "Django CSRF remains enforced",
    );
    const forged = await browser.newContext();
    assert.equal(
      (
        await forged.request.get(BASE + "/api/account/", {
          headers: { "X-OpenPath-Demo-Student": "1" },
        })
      ).status(),
      401,
    );
    await forged.close();
    await c.close();
  });
  test("demo resume state for restart verification", async () => {
    const c = await browser.newContext(opts);
    const p = await start(c);
    const s = await status(c);
    await notebookOption(p, "Help me step by step");
    await p
      .getByRole("button", { name: "See a worked example", exact: true })
      .click();
    await p
      .getByRole("button", { name: "Open my working", exact: true })
      .click();
    await p
      .getByLabel("Mathematical region", { exact: true })
      .selectOption("quotient");
    await p
      .getByRole("textbox", { name: "Number or expression", exact: true })
      .fill("12");
    await p
      .getByRole("button", { name: "Add typed step", exact: true })
      .click();
    await p.getByText("Saved in your account", { exact: true }).waitFor();
    writeFileSync(
      statefile,
      JSON.stringify({
        state: await c.storageState(),
        learner: s.learner,
        url: p.url(),
      }),
      { mode: 0o600 },
    );
    await c.close();
  });
}
