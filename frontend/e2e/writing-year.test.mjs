/** Actual Django + local WASM inference. No mocked recognition, validation or learner API. */
import assert from "node:assert/strict";
import { test, before, after } from "node:test";
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";
const BASE = process.env.E2E_URL ?? "http://127.0.0.1:4674";
const SCREENS = `../docs/product/mathematical-writing/${process.env.DEMO_STUDENT === "1" ? "screens-demo" : "screens-v3"}`;
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
    serviceWorkers: "block", // Network-failure tests must intercept model requests, including after Home.
    hasTouch: true,
    isMobile: true,
  });
  if (process.env.DEMO_STUDENT === "1") {
    const p = await c.newPage();
    p.setDefaultTimeout(20000);
    const errors = [],
      foreign = [];
    p.on("pageerror", (e) => errors.push(e.message));
    p.on("request", (r) => {
      if (!r.url().startsWith(BASE) && !r.url().startsWith("blob:"))
        foreign.push(r.url());
    });
    await p.goto(BASE);
    await p
      .getByRole("button", {
        name: "Try OpenPath as a Demo Student",
        exact: true,
      })
      .click();
    await p
      .getByRole("heading", { name: "Understand the idea", exact: true })
      .waitFor();
    assert.equal(await p.getByLabel("Email", { exact: true }).count(), 0);
    const rows = await api(c, "GET", "/pupils/");
    return { c, p, child: rows.pupils[0], errors, foreign };
  }
  // Optional owner-only preview gate; Django sign-in below is still exercised through the real UI.
  if (process.env.PREVIEW_PASSWORD) {
    const gate = await c.request.post(BASE + "/login", {
      form: { password: process.env.PREVIEW_PASSWORD },
      maxRedirects: 0,
    });
    assert.equal(
      gate.status(),
      303,
      "the preview gate opens before the application account",
    );
  }
  await c.request.get(BASE + "/api/account/");
  const email = `year.writer.${Date.now()}.${Math.random().toString(36).slice(2)}@example.org`;
  await api(c, "POST", "/account/register/", {
    email,
    password: "synthetic-family-password-3726",
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
  await api(c, "POST", "/account/logout/", {});
  await p.goto(BASE + "/");
  await p.getByRole("button", { name: "I have a parent account" }).click();
  await p.getByLabel("Email", { exact: true }).fill(email);
  await p
    .getByLabel("Password", { exact: true })
    .fill("synthetic-family-password-3726");
  await p.getByRole("button", { name: "Sign in", exact: true }).click();
  await p.getByRole("button", { name: "Add a learner", exact: true }).click();
  await p.getByLabel(/^Name to show/).fill("Synthetic writer");
  await p.getByRole("button", { name: "Continue", exact: true }).click();
  await p.locator("#consent").check();
  await p
    .getByRole("button", { name: /Build my path/ })
    .last()
    .click();
  const child = (await api(c, "GET", "/pupils/")).pupils[0];
  await p.getByRole("link", { name: "My Learning Year", exact: true }).click();
  await p.getByRole("button", { name: /^Grade 4\b/ }).click();
  await p.getByRole("button", { name: "No goal for now", exact: true }).click();
  await p
    .getByRole("button", { name: /Sample Mathematics|OpenPath Sample/i })
    .first()
    .click();
  await p.getByRole("button", { name: "Start Grade 4", exact: true }).click();
  await p.getByRole("heading", { name: /^Grade 4 ·/ }).waitFor();
  return { c, p, child, errors, foreign };
}
async function open(p, topic = "division") {
  const started = await p
    .getByRole("heading", { name: "Understand the idea", exact: true })
    .count();
  if (started && topic !== "division") {
    await p
      .getByRole("button", {
        name: "Save and return to the lesson",
        exact: true,
      })
      .click();
    await p.getByRole("button", { name: "My year", exact: true }).click();
  }
  if (!started || topic !== "division")
    await p
      .getByRole("button", { name: "Open Mathematics", exact: true })
      .click();
  const names = {
    division: "Long division",
    fraction: "Equivalent fractions",
    multiplication: "Equal groups",
  };
  if (!started || topic !== "division")
    await p
      .getByRole("button", {
        name: new RegExp("^" + names[topic] + " · write and check"),
      })
      .click();
  await p
    .getByRole("heading", { name: "Understand the idea", exact: true })
    .waitFor();
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
      name: "Check my working",
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
    mkdirSync(SCREENS, {
      recursive: true,
    });
    await p.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await p.screenshot({
      path: `${SCREENS}/${screen}.png`,
      fullPage: true,
    });
  }
  await p
    .getByRole("button", { name: "Return to my original working", exact: true })
    .click();
}
async function stroke(p, region, coords) {
  const s = p.locator("svg.writing-paper");
  await s.evaluate((e) =>
    e.scrollIntoView({ block: "start", behavior: "instant" }),
  );
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
  assert.ok(
    await s.locator("[data-stroke]").count(),
    "real pointer input creates a stroke inside the lesson",
  );
}

async function evidence(c, child) {
  return (
    await api(c, "GET", `/pupils/${child.id}/events/?subject=mathematics`)
  ).events;
}
async function backToYear(p) {
  await p
    .getByRole("button", { name: "Continue learning", exact: true })
    .click();
  await p
    .getByLabel("Writing lesson", { exact: true })
    .waitFor({ state: "hidden" });
  if (await p.getByRole("button", { name: "My year", exact: true }).count())
    await p.getByRole("button", { name: "My year", exact: true }).click();
  await p.getByRole("heading", { name: /^Grade 4 ·/ }).waitFor();
}

test(`${process.env.DEMO_STUDENT === "1" ? "one-tap demo student" : "real student: sign in"} → My Learning Year → Mathematics → teaching → division → diagnosis → resume → completion without mastery`, async () => {
  const { c, p, child, errors, foreign } = await family();
  await open(p);
  await type(p, "quotient", "136");
  await p.getByText("Saved in your account", { exact: true }).waitFor();
  const url = p.url();
  assert.match(url, /\/year\/.*#writing\//);
  await p.reload();
  await p
    .getByRole("button", { name: "Edit Quotient: 136", exact: true })
    .waitFor();
  for (const [r, v] of rows.slice(1)) await type(p, r, v);
  await send(p);
  await p.getByLabel("Diagnostic follow-up").waitFor();
  assert.equal(
    await p.locator("svg.writing-paper").count(),
    1,
    "original working stays visible beside support",
  );
  await follow(p, ["2", "6", "2"], "division-teaching-mobile");
  await edit(p, "Edit Quotient: 136", "126");
  await send(p);
  await p
    .getByRole("heading", { name: "Practice complete", exact: true })
    .waitFor();
  await p.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await p.screenshot({
    path: `${SCREENS}/division-completed-mobile.png`,
    fullPage: true,
  });
  await backToYear(p);
  await p
    .getByLabel("Saved mathematics practice")
    .getByText(/Practice complete/)
    .waitFor();
  await p
    .locator("[data-writing-tile]")
    .filter({ hasText: "Writing practice: 1 complete" })
    .waitFor();
  assert.equal(await p.locator(".stat.verified b").innerText(), "0");
  const es = await evidence(c, child);
  const writing = es.filter((e) => e.kind === "math_writing");
  assert.ok(writing.length > 5);
  assert.ok(writing.every((e) => e.admissible === false));
  assert.equal(
    writing.filter((e) => e.action === "validation").at(-1).assisted,
    true,
  );
  await p.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await p.screenshot({
    path: `${SCREENS}/year-progress-mobile.png`,
    fullPage: true,
  });
  // Existing year append sequence remains current after writing receipts.
  await p
    .getByRole("button", { name: "Open Mathematics", exact: true })
    .click();
  assert.deepEqual(errors, []);
  assert.deepEqual(foreign, []);
  await c.close();
});

test("curriculum fractions and multiplication use the same embedded workspace and real backend on desktop", async () => {
  const { c, p, child, errors } = await family();
  await p.setViewportSize({ width: 1280, height: 900 });
  await open(p, "fraction");
  await type(p, "answer", "2/3");
  await send(p);
  await follow(p, ["2", "4"]);
  await edit(p, "Edit Equivalent fraction: 2/3", "2/4");
  await send(p);
  await p
    .getByRole("heading", { name: "Practice complete", exact: true })
    .waitFor();
  await backToYear(p);
  await open(p, "multiplication");
  await type(p, "answer", "24");
  await send(p);
  await p
    .getByRole("heading", { name: "Practice complete", exact: true })
    .waitFor();
  await p.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await p.screenshot({
    path: `${SCREENS}/multiplication-desktop.png`,
    fullPage: true,
  });
  await backToYear(p);
  const es = await evidence(c, child);
  assert.ok(
    es.some(
      (e) =>
        e.problem?.id === "fraction:1:2" &&
        e.payload?.result?.outcome === "complete",
    ),
  );
  assert.ok(
    es.some(
      (e) =>
        e.problem?.id === "multiplication:4:6" &&
        e.payload?.result?.outcome === "complete",
    ),
  );
  assert.equal(await p.locator(".stat.verified b").innerText(), "0");
  assert.deepEqual(errors, []);
  await c.close();
});
test("actual local model recognizes original ink; dot ambiguity is confirmed without restarting; backend validates the complete working", async () => {
  const { c, p, child, errors, foreign } = await family();
  await open(p);
  await stroke(p, "quotient", [
    [335, 48],
    [335, 88],
  ]);
  await p
    .getByRole("button", { name: "Interpret handwriting", exact: true })
    .click();
  await p.waitForFunction(
    () =>
      document.querySelector('[aria-label="Interpreted working"] button') ||
      document.querySelector('[role="alert"]'),
  );
  await p
    .getByRole("button", { name: "Edit Quotient: 1", exact: true })
    .waitFor();
  assert.match(
    await p
      .getByRole("button", { name: "Edit Quotient: 1", exact: true })
      .innerText(),
    /Recognized/,
  );
  // Add a deliberately insufficient mark, not a synthetic recognition response.
  await stroke(p, "quotient", [
    [375, 65],
    [375, 65.2],
  ]);
  await p
    .getByRole("button", { name: "Interpret handwriting", exact: true })
    .click();
  await p.locator(".uncertain").waitFor();
  assert.equal(await p.locator(".uncertain").count(), 1);
  await p.locator(".uncertain").click();
  await p
    .getByRole("textbox", { name: "Intended symbol or expression" })
    .fill("2");
  await p
    .getByRole("button", { name: "Confirm this symbol", exact: true })
    .click();
  await type(p, "quotient", "6");
  for (const [region, text] of rows.slice(1)) await type(p, region, text);
  await p.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await p.screenshot({
    path: `${SCREENS}/recognized-ink-mobile.png`,
    fullPage: true,
  });
  await send(p);
  await p.getByLabel("Practice completion").waitFor();
  const events = (
    await api(c, "GET", `/pupils/${child.id}/events/?subject=mathematics`)
  ).events;
  const attempt = events.find((e) => e.action === "validation");
  assert.equal(attempt.payload.result.outcome, "complete");
  assert.equal(attempt.payload.input.strokes.length, 2);
  assert.ok(
    attempt.payload.input.tokens.some(
      (t) => t.recognizer === "onnx-mnist-digits@1",
    ),
  );
  assert.ok(
    attempt.payload.input.corrections.some(
      (x) => x.reason === "clarification" && x.strokeIds.length,
    ),
  );
  assert.deepEqual(errors, []);
  assert.deepEqual(foreign, []);
  await c.close();
});
test("integrated lesson remains solvable when the real recognition assets are unavailable", async () => {
  const { c, p, child, errors } = await family();
  await p.route("**/recognition/**", (r) => r.abort());
  await open(p);
  await stroke(p, "quotient", [
    [335, 48],
    [335, 88],
  ]);
  await p
    .getByRole("button", { name: "Interpret handwriting", exact: true })
    .click();
  await p.getByRole("alert").waitFor();
  assert.equal(
    (await evidence(c, child)).filter((e) => e.action === "validation").length,
    0,
  );
  for (const [r, v] of rows) await type(p, r, v);
  await send(p);
  await p.getByLabel("Practice completion").waitFor();
  assert.ok(
    await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  );
  assert.deepEqual(errors, []);
  await c.close();
});
