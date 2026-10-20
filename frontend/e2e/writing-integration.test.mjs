/** Actual Django keyboard journeys and mathematical validation; no mocked learner API. */
import assert from "node:assert/strict";
import { test, before, after } from "node:test";
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";
const BASE = process.env.E2E_URL ?? "http://127.0.0.1:4674";
let browser;
before(async () => {
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
  });
});
after(() => browser?.close());
async function api(c, method, path, data) {
  const token =
    (await c.cookies()).find((x) => x.name === "csrftoken")?.value ?? "";
  const r = await c.request.fetch(BASE + "/api" + path, {
    method,
    data,
    headers: { "X-CSRFToken": token },
  });
  assert.ok(r.ok(), `${method} ${path}: ${r.status()} ${await r.text()}`);
  return r.status() === 204 ? null : r.json();
}
async function family() {
  const c = await browser.newContext({
    viewport: { width: 412, height: 915 },
    hasTouch: true,
    isMobile: true,
  });
  await c.request.get(BASE + "/api/account/");
  await api(c, "POST", "/account/register/", {
    email: `writer.${Date.now()}.${Math.random().toString(36).slice(2)}@example.org`,
    password: "synthetic-family-password-3726",
    consent: true,
  });
  const child = await api(c, "POST", "/pupils/", {
    display_name: "Synthetic writer",
    consent: true,
  });
  const p = await c.newPage();
  p.setDefaultTimeout(20000);
  const errors = [],
    foreign = [];
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("request", (r) => {
    if (!r.url().startsWith(BASE) && !r.url().startsWith("blob:"))
      foreign.push(r.url());
  });
  await p.goto(BASE + "/writing.html?learner=" + child.id);
  await p
    .getByRole("button", { name: "Open or resume lesson", exact: true })
    .waitFor();
  return { c, p, child, errors, foreign };
}
async function open(p, topic = "division") {
  await p.getByLabel("Practice topic", { exact: true }).selectOption(topic);
  await p
    .getByRole("button", { name: "Open or resume lesson", exact: true })
    .click();
  await p
    .getByRole("button", { name: "See a worked example", exact: true })
    .click();
  await p.getByRole("button", { name: "Open my working", exact: true }).click();
  await p
    .getByRole("button", { name: "Add typed step", exact: true })
    .waitFor();
}
async function type(p, region, text) {
  await p
    .getByLabel("Mathematical region", { exact: true })
    .selectOption(region);
  await p
    .getByRole("textbox", { name: "Number or expression", exact: true })
    .fill(text);
  await p.getByRole("button", { name: "Add typed step", exact: true }).click();
}
const rows = [
  ["quotient", "126"],
  ["product-1", "3"],
  ["difference-1", "0"],
  ["bring-down-1", "7"],
  ["product-2", "6"],
  ["difference-2", "1"],
  ["bring-down-2", "19"],
  ["product-3", "18"],
  ["remainder", "1"],
];
async function send(p) {
  await p
    .getByRole("button", {
      name: "Send confirmed steps to validator",
      exact: true,
    })
    .click();
}
async function edit(p, label, text) {
  await p.getByRole("button", { name: label, exact: true }).click();
  await p
    .getByRole("textbox", { name: "Intended symbol or expression" })
    .fill(text);
  await p
    .getByRole("button", { name: "Confirm this symbol", exact: true })
    .click();
}
async function follow(p, responses, screen) {
  for (const response of responses) {
    await p.getByLabel("Diagnostic follow-up").waitFor();
    const prompt = await p
      .getByLabel("Diagnostic follow-up")
      .locator("label")
      .innerText();
    await p
      .getByLabel("Diagnostic follow-up")
      .getByRole("textbox")
      .fill(response);
    await p
      .getByRole("button", { name: "Check this follow-up", exact: true })
      .click();
    await p.waitForFunction((old) => {
      const label = document.querySelector(
        '[aria-label="Diagnostic follow-up"] label',
      );
      return !label || label.textContent.trim() !== old.trim();
    }, prompt);
  }
  await p.getByLabel("Targeted teaching").waitFor();
  if (screen) {
    mkdirSync("../docs/product/mathematical-writing/screens-v2", {
      recursive: true,
    });
    await p.screenshot({
      path: `../docs/product/mathematical-writing/screens-v2/${screen}.png`,
      fullPage: true,
    });
  }
  await p
    .getByRole("button", { name: "Return to my original working", exact: true })
    .click();
}
async function stroke(p, region, coords) {
  const s = p.locator("svg.writing-paper");
  await s.evaluate((e) => e.scrollIntoView({ block: "start" }));
  const points = await s.evaluate(
    (el, pts) =>
      pts.map(([x, y]) => {
        const p = new DOMPoint(x, y).matrixTransform(el.getScreenCTM());
        return { x: p.x, y: p.y };
      }),
    coords,
  );
  await p.mouse.move(points[0].x, points[0].y);
  await p.mouse.down();
  for (const pt of points.slice(1))
    await p.mouse.move(pt.x, pt.y, { steps: 3 });
  await p.mouse.up();
}
test("typed division: instruction → saved work → first invalid quotient digit → probes → teaching → correction → held evidence", async () => {
  const { c, p, child, errors, foreign } = await family();
  await open(p);
  assert.equal(await p.getByLabel("Use local digit recognition").count(),0);
  for (const [region, text] of rows)
    await type(p, region, region === "quotient" ? "136" : text);
  await p
    .getByRole("status")
    .filter({ hasText: "Saved in your account" })
    .waitFor();
  await p.reload();
  await p
    .getByRole("button", { name: "Open or resume lesson", exact: true })
    .click();
  await p
    .getByRole("button", { name: "Edit Quotient: 136", exact: true })
    .waitFor();
  await send(p);
  await p.getByLabel("Diagnostic follow-up").waitFor();
  assert.match(
    await p.getByLabel("Diagnostic follow-up").innerText(),
    /groups of 3 fit in 7/,
  );
  await follow(p, ["2", "9", "2"], "division-teaching");
  await edit(p, "Edit Quotient: 136", "126");
  await send(p);
  await p.getByLabel("Practice completion").waitFor();
  const ev = await api(
    c,
    "GET",
    `/pupils/${child.id}/events/?subject=mathematics`,
  );
  const validations = ev.events.filter((e) => e.action === "validation");
  assert.equal(validations.length, 2);
  assert.equal(validations[0].payload.result.position, 1);
  assert.equal(validations[1].payload.result.outcome, "complete");
  assert.equal(validations[1].assisted, true);
  assert.equal(validations[1].admissible, false);
  await p.getByText("Inspect evidence receipts", { exact: true }).click();
  const display = JSON.parse(
    await p.getByTestId("writing-evidence").innerText(),
  );
  assert.ok(display.decisions.length > 0);
  assert.ok(display.decisions.every((d) => d.verdict === "held"));
  assert.ok(display.eligibility.every(([, status]) => status !== "eligible"));
  assert.deepEqual(errors, []);
  assert.deepEqual(foreign, []);
  mkdirSync("../docs/product/mathematical-writing/screens-v2", {
    recursive: true,
  });
  await p.screenshot({
    path: "../docs/product/mathematical-writing/screens-v2/completed-division.png",
    fullPage: true,
  });
  await c.close();
});
test("recognition assets unavailable → fully typed fraction reuse, targeted teaching and separate resumable progress", async () => {
  const { c, p, child, errors } = await family();
  await p.route("**/recognition/**", (r) => r.abort());
  await open(p, "fraction");
  await type(p, "answer", "2/3");
  await send(p);
  await follow(p, ["2", "4"]);
  await edit(p, "Edit Equivalent fraction: 2/3", "2/4");
  await send(p);
  await p.getByLabel("Practice completion").waitFor();
  assert.ok(
    await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  );
  await p.reload();
  await p
    .getByLabel("Practice topic", { exact: true })
    .selectOption("fraction");
  await p
    .getByRole("button", { name: "Open or resume lesson", exact: true })
    .click();
  await p.getByLabel("Practice completion").waitFor();
  await p
    .getByLabel("Practice topic", { exact: true })
    .selectOption("division");
  await p
    .getByRole("button", { name: "Open or resume lesson", exact: true })
    .click();
  await p
    .getByRole("heading", { name: "Understand the idea", exact: true })
    .waitFor();
  const events = (
    await api(c, "GET", `/pupils/${child.id}/events/?subject=mathematics`)
  ).events;
  assert.equal(
    events.filter(
      (e) =>
        e.action === "validation" && e.payload.result.outcome === "complete",
    ).length,
    1,
  );
  assert.deepEqual(errors, []);
  await c.close();
});
test("blocked recognition model fails safely and a complete typed division still reaches the real backend", async () => {
  const { c, p, errors } = await family();
  await p.route("**/recognition/**", (r) => r.abort());
  await open(p);
  assert.equal(await p.getByRole("button",{name:"Interpret handwriting"}).count(),0);
  assert.equal(await p.locator("svg.writing-paper,.math-keypad").count(),0);
  assert.equal(await p.getByLabel("Diagnostic follow-up").count(), 0);
  for (const [region, text] of rows) await type(p, region, text);
  await send(p);
  await p.getByLabel("Practice completion").waitFor();
  assert.deepEqual(errors, []);
  await c.close();
});
