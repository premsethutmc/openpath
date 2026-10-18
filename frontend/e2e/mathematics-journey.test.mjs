import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";
import {
  replay,
  lesson,
} from "../../packages/mathematics/src/fractions-program.ts";
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
      const token =
        document.cookie.match(/(?:^|; )csrftoken=([^;]*)/)?.[1] ?? "";
      const r = await fetch("/api" + path, {
        method: body ? "POST" : "GET",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": decodeURIComponent(token),
        },
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
async function setup(width = 360) {
  const context = await browser.newContext({
    viewport: { width, height: 820 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  await page.goto(base + "/mathematics.html");
  await page
    .getByRole("heading", { name: "Use your OpenPath account" })
    .waitFor();
  const email = `math-v2-${Date.now()}-${Math.random().toString(36).slice(2)}@example.org`;
  const result = await call(page, "/account/register/", {
    email,
    password: "synthetic-family-passphrase-v2",
    consent: true,
  });
  assert.equal(result.status, 201, JSON.stringify(result.data));
  const pupil = await call(page, "/pupils/", {
    display_name: "Synthetic fractions learner",
    consent: true,
  });
  assert.equal(pupil.status, 201);
  if (width === 412) {
    await call(page, "/account/logout/", {});
    await page.reload();
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page
      .getByLabel("Password", { exact: true })
      .fill("synthetic-family-passphrase-v2");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
  } else await page.reload();
  await page
    .getByRole("button", {
      name: "Finish activity and save place",
      exact: true,
    })
    .waitFor();
  return { page, context, learner: pupil.data.id };
}
async function saved(p) {
  await p
    .getByRole("status")
    .filter({ hasText: "Saved to OpenPath account" })
    .waitFor();
}
async function finish(p) {
  await p
    .getByRole("button", {
      name: "Finish activity and save place",
      exact: true,
    })
    .click();
  await saved(p);
}
async function answer(p, id, value) {
  const input = p.locator(`form[data-question="${id}"] input`);
  await input.fill(value);
  await saved(p);
  const f = p.locator(`form[data-question="${id}"]`);
  if (id === "guided-1") await input.press("Enter");
  else
    await f.getByRole("button", { name: "Check answer", exact: true }).click();
  await f
    .getByRole("status")
    .filter({ hasText: "Correct for this practice question" })
    .waitFor();
  await saved(p);
}
async function records(p, id) {
  const r = await call(p, `/pupils/${id}/events/?subject=mathematics`);
  assert.equal(r.status, 200);
  return r.data.events;
}
test("authenticated fractions -> close/resume -> GRE -> delayed requirement, without mastery", async () => {
  let { page, context, learner } = await setup();
  await page.getByRole("button", { name: "Split into 8", exact: true }).click();
  await page.getByRole("img", { name: /4 shaded out of 8/ }).waitFor();
  await finish(page);
  await finish(page);
  await page.locator('form[data-question="guided-1"] input').fill("2");
  await saved(page);
  const auth = await context.storageState();
  await context.close();
  context = await browser.newContext({
    storageState: auth,
    viewport: { width: 360, height: 820 },
    isMobile: true,
    hasTouch: true,
  });
  page = await context.newPage();
  await page.goto(`${base}/mathematics.html?learner=${learner}&journey=school`);
  await page.locator('form[data-question="guided-1"] input').waitFor();
  assert.equal(
    await page.locator('form[data-question="guided-1"] input').inputValue(),
    "2",
  );
  for (const qs of [
    [
      ["guided-1", "2"],
      ["guided-2", "6"],
    ],
    [
      ["independent-1", "9"],
      ["independent-2", "3/5"],
    ],
    [
      ["application-1", "6"],
      ["application-2", "8"],
    ],
    [
      ["transfer-1", "5"],
      ["transfer-2", "15"],
    ],
  ]) {
    for (const [id, value] of qs) await answer(page, id, value);
    await finish(page);
  }
  await page.getByText(/Core program finished/).waitFor();
  assert.equal(
    await page
      .getByRole("progressbar", {
        name: "Fractions activity completion",
        exact: true,
      })
      .getAttribute("aria-valuenow"),
    "86",
  );
  assert.equal(
    await page.locator('form[data-question="retention-1"] input').count(),
    0,
  );
  const persistedVisits = await records(page, learner);
  assert.ok(new Set(persistedVisits.map((e) => e.sessionId)).size >= 2);
  const before = replay(learner, persistedVisits);
  assert.equal(before.profile.status, "unavailable");
  assert.equal(
    before.ledger.decisions.every((d) => d.verdict === "held"),
    true,
  );
  assert.equal(before.ledger.composite.nodes[lesson.competencyId].directN, 0);
  await mkdir("../docs/mathematics/v2/screens", { recursive: true });
  await page.screenshot({
    path: "../docs/mathematics/v2/screens/retention-required.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Competitive Exams", exact: true })
    .click();
  assert.equal(
    await page
      .getByRole("progressbar", {
        name: "Fractions activity completion",
        exact: true,
      })
      .getAttribute("aria-valuenow"),
    "0",
  );
  await finish(page);
  await finish(page);
  await answer(page, "guided-1", "2");
  const combined = replay(learner, await records(page, learner));
  assert.equal(combined.ledger.decisions.at(-1).observation.exposure, "repeat");
  assert.equal(combined.programs.school.completed.length, 6);
  assert.equal(combined.programs["gre-quant"].completed.length, 2);
  assert.equal(combined.profile.status, "unavailable");
  await page.screenshot({
    path: "../docs/mathematics/v2/screens/gre-shared-fractions.png",
    fullPage: true,
  });
  await page.reload();
  await page.locator('form[data-question="guided-1"] input').waitFor();
  assert.equal(await page.getByLabel("Exam track").inputValue(), "gre-quant");
  await page
    .getByRole("button", { name: "School mathematics", exact: true })
    .click();
  assert.equal(
    await page
      .getByRole("progressbar", {
        name: "Fractions activity completion",
        exact: true,
      })
      .getAttribute("aria-valuenow"),
    "86",
  );
  await context.close();
});
test("320px invalid answer and failed save do not fabricate progress", async () => {
  const { page, context, learner } = await setup(320);
  await finish(page);
  await finish(page);
  const input = page.locator('form[data-question="guided-1"] input');
  await input.fill("1/0");
  await saved(page);
  await page
    .locator('form[data-question="guided-1"]')
    .getByRole("button", { name: "Check answer" })
    .click();
  await page
    .getByRole("alert")
    .getByText(/nonzero denominator/)
    .waitFor();
  assert.equal(
    replay(learner, await records(page, learner)).programs.school.attempts,
    0,
  );
  await page.route("**/api/pupils/*/events/", (route) =>
    route.request().method() === "POST"
      ? route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({ detail: "Synthetic outage" }),
        })
      : route.continue(),
  );
  await input.fill("2");
  await page
    .getByRole("alert")
    .getByText(/Synthetic outage/)
    .waitFor();
  assert.equal(
    await page
      .getByRole("progressbar", {
        name: "Fractions activity completion",
        exact: true,
      })
      .getAttribute("aria-valuenow"),
    "29",
  );
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await context.close();
});
test("412px concept and signed-out account isolation", async () => {
  const { page, context, learner } = await setup(412);
  await mkdir("../docs/mathematics/v2/screens", { recursive: true });
  await page.screenshot({
    path: "../docs/mathematics/v2/screens/concept.png",
    fullPage: true,
  });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page
    .getByRole("button", { name: "Competitive Exams", exact: true })
    .click();
  await page.getByLabel("Exam track").selectOption("jee-advanced");
  await finish(page);
  await page.reload();
  await page
    .getByRole("button", {
      name: "Finish activity and save place",
      exact: true,
    })
    .waitFor();
  assert.equal(
    await page.getByLabel("Exam track").inputValue(),
    "jee-advanced",
  );
  assert.equal(
    await page
      .getByRole("progressbar", {
        name: "Fractions activity completion",
        exact: true,
      })
      .getAttribute("aria-valuenow"),
    "14",
  );
  const other = await browser.newContext();
  const outsider = await other.newPage();
  await outsider.goto(base + "/mathematics.html");
  assert.equal(
    (await call(outsider, `/pupils/${learner}/events/?subject=mathematics`))
      .status,
    403,
  );
  await other.close();
  await context.close();
});
