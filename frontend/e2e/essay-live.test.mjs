/**
 * End-to-end: the essay studio connected to the engine (?experience=essay-live), in a real browser at phone size,
 * against the production build. Synthetic essays only, on the on-device synthetic test learner.
 *
 *   npm run english:build && PORT=4190 npm run english:preview &
 *   ESSAY_E2E_URL=http://127.0.0.1:4190 npm run essay:e2e
 *
 * The critical acceptance path: submit a synthetic Grade 8 essay → observations → diagnostic questions →
 * profile change from independent evidence → learning steps → 50-word rewrite → reload → second essay.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { after, before, test } from "node:test";
import { chromium } from "playwright";

const BASE = process.env.ESSAY_E2E_URL ?? "http://127.0.0.1:4190";
const PILOT = process.env.ESSAY_PILOT_E2E_URL ?? "http://127.0.0.1:4191";
const URL = `${BASE}/?experience=essay-live&no-sw`;
const CONTENT = new globalThis.URL("../../content/english/", import.meta.url);
const items = new Map(
  ["items/code-items.json", "items/e2a-items.json", "items/e2b-items.json", "pilot/items.json"].flatMap((f) => ((j) => (Array.isArray(j) ? j : j.items))(JSON.parse(readFileSync(new globalThis.URL(f, CONTENT), "utf8"))).map((i) => [i.id, i])),
);
const SVA = "EN.GRM.VERB.sva";

let browser;
before(async () => {
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
});
after(() => browser?.close());

async function phone() {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: "reduce" });
  const page = await context.newPage();
  const errors = [];
  const outside = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("request", (r) => {
    const u = new globalThis.URL(r.url());
    if (u.pathname.startsWith("/api/") || (!["127.0.0.1", "localhost"].includes(u.hostname) && !["data:", "blob:"].includes(u.protocol))) outside.push(r.url());
  });
  return { context, page, errors, outside };
}

const fits = async (page) => assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "no sideways scrolling");
const stage = (page) => page.locator("[data-essay-mode=live]").getAttribute("data-stage");

/** Answer the question on screen with the item's own key, and wait until it has been replaced. */
async function answer(page, right) {
  const el = page.locator(".item");
  const id = await el.getAttribute("data-item");
  const item = items.get(id);
  assert.ok(item, `unknown item ${id}`);
  const kind = item.format.split(":")[0];
  const opts = page.locator(".answer .option");
  if (kind === "typed") await page.locator(".ruled input").fill(right ? item.answers[0] : Object.keys(item.wrong ?? {})[0] ?? "zzzq");
  else if (kind === "choice") await opts.nth(right ? item.answer : (item.answer + 1) % item.options.length).click();
  else if (kind === "multi") for (const i of right ? item.answer_set : [0]) await opts.nth(i).click();
  else if (kind === "order") for (const i of right ? item.answer_order : [...item.answer_order].reverse()) await opts.nth(i).click();
  else if (kind === "match") {
    const sel = page.locator(".match select");
    for (let k = 0; k < item.left.length; k++) await sel.nth(k).selectOption(String(right ? item.answer_pairs[k] : item.answer_pairs[(k + 1) % item.left.length]));
  }
  await page.getByRole("button", { name: "Check", exact: true }).click();
  await page.waitForFunction((x) => !document.querySelector(`.item[data-item="${x}"]`), id);
  return item;
}

async function submitSample(page, title) {
  await page.getByRole("button", { name: `Use sample: ${title}` }).click();
  await page.getByRole("button", { name: "Analyse this essay" }).click();
  await page.getByRole("heading", { name: "What your essay shows" }).waitFor();
}

async function diagnose(page, wrongFor) {
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("heading", { name: "A few questions" }).waitFor();
  for (let guard = 0; guard < 12 && (await page.locator("[data-diagnostic]").count()); guard++) {
    const cap = await page.locator("[data-diagnostic]").getAttribute("data-diagnostic");
    await answer(page, cap !== wrongFor);
  }
}

async function completeSteps(page) {
  for (let guard = 0; guard < 20 && (await page.locator("[data-current-step]").count()); guard++) {
    const kind = await page.locator("[data-current-step]").getAttribute("data-current-step");
    if (kind === "teach") {
      await page.locator("input[name=lesson-check]").first().check();
      await page.getByRole("button", { name: "I've read this" }).click();
      await page.waitForFunction(() => document.querySelector("[data-current-step]")?.getAttribute("data-current-step") !== "teach");
    } else await answer(page, true);
  }
}

test("ESSAY-LIVE the critical acceptance path runs through the engine and the learner's record, and survives a reload", async () => {
  const { context, page, errors, outside } = await phone();
  await page.goto(URL);
  await page.locator('[data-essay-mode=live][data-stage="write"]').waitFor();
  assert.equal(await page.locator("html").getAttribute("data-essay-store"), "indexeddb", "the device's own store (never a server)");
  await fits(page);

  // 1–2. submit a synthetic essay; observations linked to Grade 8 competencies
  await submitSample(page, "Our school library");
  assert.match(await page.getByTestId("analysed-by").innerText(), /recorded evaluator output/);
  const card = page.locator(`[data-competency="${SVA}"]`);
  assert.equal(await card.locator("[data-gap]").getAttribute("data-gap"), "suspected");
  await card.getByText("Why?").click();
  assert.match(await card.innerText(), /“My school have”/);

  // 3. answer the diagnostic questions (wrong on agreement)
  await diagnose(page, SVA);
  assert.equal(await page.locator("[data-outcome]").first().getAttribute("data-outcome"), "confirmed");
  await fits(page);

  // 4–5. the learning path, built by the engine; complete every available step
  await page.getByRole("button", { name: "Go to my learning path" }).click();
  await page.getByRole("button", { name: "Build my learning path" }).click();
  await page.locator(`[data-tree="${SVA}"]`).waitFor();
  const blocked = await page.locator('[data-tree="EN.GRM.PREP.dependent"] [data-status="blocked"]').count();
  assert.equal(blocked, 3, "no content for dependent prepositions: blocked, not invented");
  await completeSteps(page);
  const steps = await page.locator(`[data-tree="${SVA}"] [data-step]`).evaluateAll((els) => els.map((e) => `${e.dataset.step}:${e.dataset.status}`));
  // the pilot's confirmation pool has one question at the Grade 8 target: the check is blocked, not borrowed
  assert.deepEqual(steps, ["teach:done", "guided_practice:done", "independent_check:blocked"]);
  assert.equal(await page.locator(`[data-node="${SVA}"]`).getAttribute("data-green"), "false", "below the grade target: never shown green");
  assert.equal(await stage(page), "rewrite");

  // 6. the 50-word rewrite
  await page.getByRole("button", { name: "Rewrite in at most 50 words" }).click();
  await page.getByRole("button", { name: "Use the synthetic sample rewrite" }).click();
  await page.getByRole("button", { name: "Submit rewrite" }).click();
  await page.getByRole("heading", { name: "Your writing profile" }).waitFor();
  assert.equal(await page.locator("[data-rewrite]").getAttribute("data-rewrite"), "evaluated");
  assert.equal(await page.locator('[data-dimension-status="accepted"]').count(), 5);
  const before = await page.locator("[data-profile]").evaluateAll((els) => els.map((e) => `${e.dataset.profile}:${e.dataset.state}`));
  assert.ok(before.includes(`${SVA}:suspected`), "independent evidence moved the engine, but agreement is not shown at the grade target");

  // 7. reload: everything is read back from the learner's record
  await page.reload();
  await page.getByRole("heading", { name: "Your writing profile" }).waitFor();
  assert.equal(await stage(page), "done");
  assert.deepEqual(await page.locator("[data-profile]").evaluateAll((els) => els.map((e) => `${e.dataset.profile}:${e.dataset.state}`)), before);
  assert.equal(await page.locator('[data-dimension-status="accepted"]').count(), 5);

  // 8. a second essay: the earlier essay shapes the next journey
  await page.getByRole("button", { name: "Write another essay" }).click();
  assert.match(await page.getByTestId("essay-count").innerText(), /1 essay so far/);
  await submitSample(page, "Weekends at home");
  const second = page.locator(`[data-competency="${SVA}"]`);
  assert.equal(await second.locator("[data-gap]").getAttribute("data-gap"), "suspected", "one error, suspected because of the earlier essay");
  await second.getByText("Why?").click();
  assert.match(await second.innerText(), /earlier essay/);
  await diagnose(page, null);
  await page.getByRole("button", { name: "Go to my learning path" }).click();
  await page.getByRole("button", { name: "Build my learning path" }).click();
  await page.locator('[data-tree="EN.GRM.PREP.dependent"]').waitFor();
  assert.equal(await page.locator(`[data-tree="${SVA}"]`).count(), 0, "right without help now: not retaught");

  await fits(page);
  assert.deepEqual(errors, []);
  assert.deepEqual(outside, [], "no request to an API or another site");
  await context.close();
});

test("ESSAY-LIVE the reviewed pilot build refuses the essay studio", async (t) => {
  const ok = await fetch(PILOT).then((r) => r.ok, () => false);
  if (!ok) return t.skip(`no pilot preview at ${PILOT}`);
  const { context, page } = await phone();
  await page.goto(`${PILOT}/?experience=essay-live&no-sw`);
  await page.locator('[data-pilot-refused="essay-live"]').waitFor();
  await context.close();
});
