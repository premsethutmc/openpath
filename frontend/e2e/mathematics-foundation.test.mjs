import assert from "node:assert/strict";
import { test, before, after } from "node:test";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";
import {
  programs,
  replayFoundation,
  key,
} from "../../packages/mathematics/src/foundation/programs.ts";
const base = process.env.MATH_JOURNEY_URL ?? "http://127.0.0.1:4182";
let browser;
before(async () => {
  browser = await chromium.launch({
    executablePath:
      process.env.CHROMIUM_PATH === ""
        ? undefined
        : process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  });
});
after(() => browser?.close());
async function call(page, path, body) {
  return page.evaluate(
    async ({ path, body }) => {
      const token = decodeURIComponent(
        document.cookie.match(/(?:^|; )csrftoken=([^;]*)/)?.[1] ?? "",
      );
      const r = await fetch("/api" + path, {
        method: body ? "POST" : "GET",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", "X-CSRFToken": token },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      return {
        status: r.status,
        data: r.status === 204 ? null : await r.json(),
      };
    },
    { path, body },
  );
}
async function saved(page) {
  await page
    .getByRole("status")
    .filter({ hasText: "Saved to OpenPath account" })
    .waitFor();
  await page
    .getByRole("button", { name: "Sign out", exact: true })
    .waitFor({ state: "visible" });
}
async function finish(page) {
  await page
    .getByRole("button", {
      name: "Finish activity and save place",
      exact: true,
    })
    .click();
  await saved(page);
}
async function answer(page, id, value) {
  const f = page.locator(`form[data-question="${id}"]`);
  await f.getByRole("textbox").fill(value);
  if (id === "guided") await f.getByRole("textbox").press("Enter");
  else await f.getByRole("button", { name: "Check", exact: true }).click();
  await saved(page);
}
for (const [i, width] of [
  [0, 320],
  [1, 360],
  [2, 412],
  [2, 768],
])
  test(`Grade ${programs[i].grade}: teach, manipulate, resume, practice, retain and separate GRE at ${width}px`, async () => {
    const p = programs[i];
    let context = await browser.newContext({
      viewport: { width, height: 850 },
      isMobile: true,
      hasTouch: true,
    });
    let page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    await page.goto(`${base}/foundation.html?program=${p.id}`);
    await page
      .getByRole("heading", { name: "Use your OpenPath account" })
      .waitFor();
    await call(page, "/account/");
    const registration = await call(page, "/account/register/", {
      email: `foundation-${i}-${Date.now()}@example.org`,
      password: "synthetic-test-passphrase-2026",
      consent: true,
    });
    assert.equal(registration.status, 201, JSON.stringify(registration.data));
    const pupil = await call(page, "/pupils/", {
      display_name: `Synthetic Grade ${p.grade}`,
      consent: true,
    });
    assert.equal(pupil.status, 201);
    const learner = pupil.data.id;
    await page.reload();
    await page.getByRole("heading", { name: "Meet the idea" }).waitFor();
    await finish(page);
    await page
      .getByRole("heading", { name: "Try it with your hands" })
      .waitFor();
    if (i === 0)
      await page
        .getByRole("button", { name: "Add to group 1", exact: true })
        .click();
    if (i === 1)
      await page
        .getByRole("button", { name: "Turn the array", exact: true })
        .click();
    if (i === 2)
      await page
        .getByRole("button", { name: "Bar 1 shade 2 parts", exact: true })
        .click();
    await saved(page);
    // Real page/context closure; restore only the authenticated cookie state, never application progress.
    const storage = await context.storageState(),
      url = page.url();
    await context.close();
    context = await browser.newContext({
      viewport: { width, height: 850 },
      storageState: storage,
      isMobile: true,
      hasTouch: true,
    });
    page = await context.newPage();
    page.on("pageerror", (e) => errors.push(String(e)));
    await page.goto(url);
    await page
      .getByRole("heading", { name: "Try it with your hands" })
      .waitFor();
    await page.getByText("You changed the model.", { exact: false }).waitFor();
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
    await mkdir("../docs/mathematics/grade1-6/screens", { recursive: true });
    await page.screenshot({
      path: `../docs/mathematics/grade1-6/screens/grade-${p.grade}-${width}-exploration.png`,
      fullPage: true,
    });
    await finish(page);
    await page.getByRole("heading", { name: "Watch an example" }).waitFor();
    await finish(page);
    // A plausible misconception gives targeted support rather than a missing-skill verdict.
    const guided = p.questions[0];
    await answer(page, "guided", guided.commonError);
    await page.getByText(guided.misconception, { exact: false }).waitFor();
    await page
      .locator('form[data-question="guided"]')
      .getByRole("button", { name: "Show a hint" })
      .click();
    await saved(page);
    await answer(page, "guided", guided.answer);
    await finish(page);
    for (const stage of p.stages.slice(4, 7)) {
      await page
        .getByRole("heading", { name: stage.title, exact: true })
        .waitFor();
      for (const id of stage.questions)
        await answer(page, id, p.questions.find((q) => q.id === id).answer);
      await finish(page);
    }
    await page.getByRole("heading", { name: "Remember tomorrow" }).waitFor();
    await page
      .getByText("Your 7 finished activities remain complete.", {
        exact: false,
      })
      .waitFor();
    const before = (
      await call(page, `/pupils/${learner}/events/?subject=mathematics`)
    ).data.events;
    const r = replayFoundation(learner, before);
    assert.equal(r.progress[key(p.id, "school")].completed.length, 7);
    assert.notEqual(r.profiles[p.id].status, "verified");
    assert.equal(r.ledger.composite.nodes[p.competencyId].directN, 0);
    await page.screenshot({
      path: `../docs/mathematics/grade1-6/screens/grade-${p.grade}-${width}-delayed-review.png`,
      fullPage: true,
    });
    // Finished activities can be reopened without erasing the fixed program or its delayed requirement.
    await page
      .getByText("View fixed program and reopen completed activities", {
        exact: true,
      })
      .click();
    await page
      .getByRole("button", {
        name: "✓ Completed · Try it with your hands",
        exact: true,
      })
      .click();
    await page
      .getByRole("heading", { name: "Try it with your hands" })
      .waitFor();
    await finish(page);
    await page.getByRole("heading", { name: "Remember tomorrow" }).waitFor();
    const afterReopen = (
      await call(page, `/pupils/${learner}/events/?subject=mathematics`)
    ).data.events;
    assert.equal(
      replayFoundation(learner, afterReopen).progress[key(p.id, "school")]
        .completed.length,
      7,
    );
    // An early review cannot be smuggled into persistence, regardless of browser clock.
    const rejected = await call(page, `/pupils/${learner}/events/`, {
      subject: "mathematics",
      seq: afterReopen.length,
      event: {
        ...before.find((e) => e.action === "answer"),
        id: `early-${Date.now()}`,
        stage: "retention",
        questionId: "retention",
      },
    });
    assert.equal(rejected.status, 400);
    await page
      .getByRole("button", { name: "Competitive Exams", exact: true })
      .click();
    await page.getByRole("heading", { name: "Meet the idea" }).waitFor();
    await finish(page);
    let result = await call(
      page,
      `/pupils/${learner}/events/?subject=mathematics`,
    );
    const shared = replayFoundation(learner, result.data.events);
    assert.equal(shared.progress[key(p.id, "school")].completed.length, 7);
    assert.equal(shared.progress[key(p.id, "gre-quant")].completed.length, 1);
    assert.notEqual(shared.profiles[p.id].status, "verified");
    await page.reload();
    await page
      .getByRole("heading", { name: "Try it with your hands" })
      .waitFor();
    await page
      .getByRole("button", { name: "School mathematics", exact: true })
      .click();
    await page.getByRole("heading", { name: "Remember tomorrow" }).waitFor();
    // Both old fractions and new receipts coexist without breaking the integrated mathematics entry point.
    await page.goto(`${base}/mathematics.html?learner=${learner}`);
    await page
      .getByRole("button", {
        name: "Finish activity and save place",
        exact: true,
      })
      .waitFor();
    assert.deepEqual(errors, []);
    await context.close();
  });

test("failed save never marks a new activity complete; a reload recovers the server place", async () => {
  const context = await browser.newContext({
      viewport: { width: 360, height: 820 },
    }),
    page = await context.newPage();
  await page.goto(base + "/foundation.html");
  await call(page, "/account/");
  assert.equal(
    (
      await call(page, "/account/register/", {
        email: `failure-${Date.now()}@example.org`,
        password: "synthetic-test-passphrase-2026",
        consent: true,
      })
    ).status,
    201,
  );
  const pupil = await call(page, "/pupils/", {
    display_name: "Synthetic interrupted learner",
    consent: true,
  });
  assert.equal(pupil.status, 201);
  await page.reload();
  await page.getByRole("heading", { name: "Meet the idea" }).waitFor();
  await page.route("**/api/pupils/*/events/", (route) =>
    route.request().method() === "POST"
      ? route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({ detail: "Synthetic interrupted connection" }),
        })
      : route.continue(),
  );
  await page
    .getByRole("button", {
      name: "Finish activity and save place",
      exact: true,
    })
    .click();
  await page.getByRole("alert").filter({ hasText: "Not saved." }).waitFor();
  assert.equal(
    (await call(page, `/pupils/${pupil.data.id}/events/?subject=mathematics`))
      .data.count,
    0,
  );
  assert.equal(
    await page
      .getByRole("button", {
        name: "Finish activity and save place",
        exact: true,
      })
      .isDisabled(),
    true,
  );
  await page.unroute("**/api/pupils/*/events/");
  await page.getByRole("button", { name: "Reload saved place" }).click();
  await page.getByRole("heading", { name: "Meet the idea" }).waitFor();
  await finish(page);
  await page.getByRole("heading", { name: "Try it with your hands" }).waitFor();
  await context.close();
});
