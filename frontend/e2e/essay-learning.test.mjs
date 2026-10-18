import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";
const BASE = process.env.ESSAY_E2E_URL ?? "http://127.0.0.1:4190";
const URL = BASE + "/?experience=essay-demo&no-sw";
const KEY = "openpath.essay-ux.fixture.v1";
let browser;
before(async () => {
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
  });
  mkdirSync("../docs/product/essay-learning/screenshots", { recursive: true });
});
after(() => browser?.close());
async function device(width = 390) {
  const context = await browser.newContext({
    viewport: { width, height: 844 },
    isMobile: true,
    hasTouch: true,
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  const errors = [],
    api = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (r) => {
    if (new globalThis.URL(r.url()).pathname.startsWith("/api/"))
      api.push(r.url());
  });
  await page.goto(URL);
  await page
    .getByRole("heading", { name: "Your ideas. A little clearer." })
    .waitFor();
  return { context, page, errors, api };
}
const click = (page, name) =>
  page.getByRole("button", { name, exact: true }).click();
const record = (page) =>
  page.evaluate((key) => JSON.parse(localStorage.getItem(key)), KEY);
const fit = async (page) =>
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
async function screenshot(page, name) {
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({
    path: `../docs/product/essay-learning/screenshots/${name}.png`,
    fullPage: true,
  });
}
async function analyse(page) {
  await click(page, "Use sample essay");
  await click(page, "Explore sample feedback");
  await page.getByRole("heading", { name: "A map for your writing" }).waitFor();
}
async function diagnostic(page) {
  await page
    .locator('[data-competency="grammar"]')
    .getByRole("button", { name: "Explore grammar" })
    .click();
  await page.getByLabel("The garden gives us shade.", { exact: true }).check();
  await click(page, "Show sample feedback");
  await page
    .getByRole("heading", { name: "A useful place to practise" })
    .waitFor();
}
async function practice(page) {
  await click(page, "Practise this idea");
  await click(page, "Try an example");
  await page
    .getByLabel("Your sample response")
    .fill("The trees give us shade.");
  await click(page, "Show sample practice feedback");
  await page
    .getByRole("heading", { name: "A supported practice example" })
    .waitFor();
  await click(page, "Try on your own");
  await page
    .getByLabel("Your sample response")
    .fill("The school club grows vegetables.");
  await click(page, "Show sample independent feedback");
  await page
    .getByRole("heading", { name: "An independent example—not verification" })
    .waitFor();
}
test("complete phone journey: essay, evidence, diagnostic, expandable path, fifty words and honest profile", async () => {
  const { context, page, errors, api } = await device();
  await page.evaluate(() =>
    localStorage.setItem("openpath-english-last-profile", "untouched-pupil"),
  );
  await click(page, "Use sample essay");
  await screenshot(page, "01-submission");
  await click(page, "Explore sample feedback");
  await page
    .getByRole("heading", { name: "Preparing sample feedback" })
    .waitFor();
  await page.getByRole("heading", { name: "A map for your writing" }).waitFor();
  assert.equal(await page.locator("[data-competency]").count(), 6);
  await page.locator('[data-competency="grammar"] summary').click();
  await page
    .getByText("it do not have enough trees", { exact: true })
    .waitFor();
  await screenshot(page, "02-competencies");
  await diagnostic(page);
  await screenshot(page, "03-diagnostic");
  await click(page, "Practise this idea");
  await screenshot(page, "04-learning-tree");
  await click(page, "Try an example");
  await page
    .getByLabel("Your sample response")
    .fill("The trees give us shade.");
  await click(page, "A little help");
  await page.getByText("“Trees” is plural.", { exact: false }).waitFor();
  await click(page, "Show sample practice feedback");
  await page
    .getByRole("heading", { name: "A supported practice example" })
    .waitFor();
  await click(page, "Try on your own");
  await page
    .getByLabel("Your sample response")
    .fill("The school club grows vegetables.");
  await click(page, "Show sample independent feedback");
  await page
    .getByRole("heading", { name: "An independent example—not verification" })
    .waitFor();
  await click(page, "Take the 50-word challenge");
  await page
    .getByText("Rewrite your original essay in 50 words.", { exact: true })
    .waitFor();
  await click(page, "Use sample rewrite");
  assert.equal(
    await page.locator("#rewrite-count").innerText(),
    "50 / 50 words",
  );
  await screenshot(page, "05-rewrite");
  await click(page, "See sample rewrite feedback");
  await page
    .getByRole("heading", { name: "Your sample rewrite feedback" })
    .waitFor();
  for (const name of [
    "Meaning preservation",
    "Clarity",
    "Grammar",
    "Concision",
  ])
    await page
      .locator(".essay-rewrite-feedback")
      .getByRole("heading", { name, exact: true })
      .waitFor();
  await screenshot(page, "06-profile");
  assert.equal(await page.locator(".essay-status-verified").count(), 0);
  assert.equal(
    await page
      .locator(".essay-profile-list .essay-status-independently-demonstrated")
      .count(),
    1,
  );
  assert.equal(
    await page.evaluate(() =>
      localStorage.getItem("openpath-english-last-profile"),
    ),
    "untouched-pupil",
  );
  assert.deepEqual(api, []);
  assert.deepEqual(errors, []);
  await fit(page);
  await context.close();
});
test("unfinished practice, accordion and response resume after leaving and reload", async () => {
  const { context, page, errors } = await device();
  await analyse(page);
  await diagnostic(page);
  await click(page, "Practise this idea");
  await click(page, "Try an example");
  await page
    .getByLabel("Your sample response")
    .fill("My unfinished fictional response");
  await page.reload();
  await page.getByRole("heading", { name: "One idea at a time" }).waitFor();
  assert.equal(
    await page.getByLabel("Your sample response").inputValue(),
    "My unfinished fictional response",
  );
  assert.equal((await record(page)).step, "guided");
  const toggle = page.getByRole("button", { name: /Grammar Make subjects/ });
  await toggle.click();
  assert.equal(await toggle.getAttribute("aria-expanded"), "false");
  await page.reload();
  await page.getByRole("heading", { name: "One idea at a time" }).waitFor();
  const reopened = page.getByRole("button", { name: /Grammar Make subjects/ });
  assert.equal(await reopened.getAttribute("aria-expanded"), "false");
  await reopened.click();
  assert.equal(
    await page.getByLabel("Your sample response").inputValue(),
    "My unfinished fictional response",
  );
  assert.deepEqual(errors, []);
  await context.close();
});
test("empty editor, loading error, retry and interrupted analysis preserve sample drafts", async () => {
  const { context, page, errors } = await device();
  assert.equal(
    await page
      .getByRole("button", { name: "Explore sample feedback", exact: true })
      .isEnabled(),
    false,
  );
  await page.getByText("About this preview", { exact: true }).click();
  await click(page, "Preview a loading error");
  await click(page, "Use sample essay");
  await click(page, "Explore sample feedback");
  await page.getByRole("alert").waitFor();
  assert.ok(
    (await page.locator("#essay-draft").inputValue()).includes(
      "small playground",
    ),
  );
  await click(page, "Try again");
  await page.getByRole("heading", { name: "A map for your writing" }).waitFor();
  await click(page, "Essay");
  await page
    .locator("#essay-draft")
    .fill("An interrupted fictional sample draft.");
  await click(page, "Explore sample feedback");
  await page
    .getByRole("heading", { name: "Preparing sample feedback" })
    .waitFor();
  await page.reload();
  await page
    .getByRole("heading", { name: "Your ideas. A little clearer." })
    .waitFor();
  await page
    .getByText("Your last sample step was interrupted.", { exact: false })
    .waitFor();
  assert.equal(
    await page.locator("#essay-draft").inputValue(),
    "An interrupted fictional sample draft.",
  );
  assert.deepEqual(errors, []);
  await context.close();
});
test("50-word requirement is separate from assessment; edits and final draft survive refresh", async () => {
  const { context, page } = await device();
  await analyse(page);
  await diagnostic(page);
  await practice(page);
  await click(page, "Take the 50-word challenge");
  await page.locator("#essay-rewrite").fill("A short fictional draft.");
  assert.equal(
    await page
      .getByRole("button", { name: "See sample rewrite feedback", exact: true })
      .isEnabled(),
    false,
  );
  await click(page, "Use sample rewrite");
  const original = await page.locator("#essay-rewrite").inputValue();
  await page.reload();
  await page
    .getByRole("heading", { name: "Same ideas. Just 50 words." })
    .waitFor();
  assert.equal(await page.locator("#essay-rewrite").inputValue(), original);
  await page
    .locator("#essay-rewrite")
    .fill(original.trim().split(/\s+/).slice(0, -1).join(" "));
  assert.equal(
    await page.locator("#rewrite-count").innerText(),
    "49 / 50 words",
  );
  assert.equal(
    await page
      .getByRole("button", { name: "See sample rewrite feedback", exact: true })
      .isEnabled(),
    false,
  );
  await page.locator("#essay-rewrite").fill(original + " Extra.");
  assert.equal(
    await page.locator("#rewrite-count").innerText(),
    "51 / 50 words",
  );
  assert.equal(
    await page
      .getByRole("button", { name: "See sample rewrite feedback", exact: true })
      .isEnabled(),
    false,
  );
  await context.close();
});
test("phone widths, keyboard input, visible labels, focus and touch targets", async () => {
  for (const width of [360, 390, 412]) {
    const { context, page, errors } = await device(width);
    const input = page.getByLabel("Your sample essay", { exact: true });
    await input.fill("A fictional first line.");
    await input.press("End");
    await input.press("Enter");
    await input.pressSequentially("A second line.");
    assert.ok((await input.inputValue()).includes("\nA second line."));
    assert.equal((await record(page)).screen, "submission");
    await page.setViewportSize({ width, height: 440 });
    await input.scrollIntoViewIfNeeded();
    await fit(page);
    await page
      .getByRole("button", { name: "Explore sample feedback", exact: true })
      .scrollIntoViewIfNeeded();
    const small = await page
      .locator("button:visible")
      .evaluateAll((bs) =>
        bs
          .filter((b) => b.getBoundingClientRect().height < 44)
          .map((b) => b.textContent),
      );
    assert.deepEqual(small, []);
    assert.deepEqual(errors, []);
    await context.close();
  }
});
test("corrupt storage is retained, and clearing the demo does not remove another learner", async () => {
  const { context, page, errors } = await device();
  await page.evaluate((key) => {
    localStorage.setItem(key, "broken-record");
    localStorage.setItem("openpath-english-last-profile", "keep-me");
  }, KEY);
  await page.reload();
  await page.getByRole("alert").waitFor();
  assert.equal(
    await page.evaluate((k) => localStorage.getItem(k), KEY),
    "broken-record",
  );
  await click(page, "Clear saved demo");
  await page
    .getByRole("heading", { name: "Your ideas. A little clearer." })
    .waitFor();
  assert.equal(
    await page.evaluate(() =>
      localStorage.getItem("openpath-english-last-profile"),
    ),
    "keep-me",
  );
  assert.deepEqual(errors, []);
  await context.close();
});
test("reviewed pilot refuses the fixture route before accessing demo data", async () => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(
    (process.env.ESSAY_PILOT_E2E_URL ?? "http://127.0.0.1:4191") +
      "/?experience=essay-demo&no-sw",
  );
  await page
    .getByRole("heading", { name: "Not available here", exact: true })
    .waitFor();
  assert.equal(
    await page.locator('[data-pilot-refused="essay-demo"]').count(),
    1,
  );
  assert.equal(await page.locator("[data-fixture-mode]").count(), 0);
  assert.equal(await page.evaluate((k) => localStorage.getItem(k), KEY), null);
  await context.close();
});
