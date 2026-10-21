/** Read-only product-owner preview: real curriculum/content components, no Django or learner writes. */
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { mkdirSync, readFileSync } from "node:fs";
import { chromium } from "playwright";

const base = process.env.PREVIEW_URL ?? "http://127.0.0.1:4312";
const shots = process.env.SHOTS ?? "/tmp/interactive-preview-screens";
mkdirSync(shots, { recursive: true });
const dataDir = new URL("../dist-english/curriculum/data/", import.meta.url);
const index = JSON.parse(readFileSync(new URL("index.json", dataDir), "utf8"));
const data = (board, grade) => JSON.parse(readFileSync(new URL(index.releases.find((e) => e.board === board && e.grade === grade).file, dataDir), "utf8"));
const walk = (nodes, path = []) => nodes.flatMap((n) => [{ n, path: [...path, n] }, ...walk(n.children, [...path, n])]);
let browser;
before(async () => { browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? "/usr/bin/chromium" }); });
after(() => browser?.close());

async function screenshot(page, name) {
  await page.evaluate(() => window.scrollTo(0, 0));
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "no horizontal overflow");
  await page.screenshot({ path: `${shots}/${name}.png`, fullPage: true });
}

for (const width of [360, 393]) test(`${width}px: all four curricula and every experience state navigate without writes`, async () => {
  const context = await browser.newContext({ viewport: { width, height: 820 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  page.setDefaultTimeout(30_000);
  const writes = [];
  page.on("request", (r) => { if (r.url().includes("/api/") && r.method() !== "GET") writes.push(`${r.method()} ${r.url()}`); });
  try {
    for (const [board, grade] of [["tn", 7], ["cbse", 7], ["tn", 10], ["cbse", 10]]) {
      const release = data(board, grade);
      await page.goto(`${base}/curriculum/?preview=1#b=${board}&g=${grade}`);
      await page.getByRole("heading", { name: `Grade ${grade} Mathematics`, exact: true }).waitFor();
      await page.getByText("Preview mode · no progress saved", { exact: true }).waitFor();
      assert.match(await page.locator("body").innerText(), /Explore freely/);
      assert.deepEqual(await page.locator(".tiles > li .tile-title").allTextContents(), release.nodes.map((n) => n.title));
      await screenshot(page, `${width}-${board}-${grade}-syllabus`);

      const selected = walk(release.nodes).find(({ n }) => n.kind === "competency" && release.competencies[n.competency]?.module && release.competencies[n.competency]?.families.length);
      assert.ok(selected, `${board} Grade ${grade} has a previewable competency`);
      for (const node of selected.path) {
        await page.locator(".tiles > li").filter({ has: page.locator(".tile-title", { hasText: node.title }) }).getByRole("button").first().click();
      }
      await page.getByRole("article", { name: "Mathematics experience preview" }).waitFor();
      await page.getByText("Read-only preview", { exact: true }).waitFor();
      assert.equal(await page.getByRole("button", { name: "Overview", exact: true }).getAttribute("aria-pressed"), "true");
      const parent = selected.path.at(-2);
      await page.getByRole("button", { name: /Back/ }).click();
      await page.getByRole("heading", { name: parent.title, exact: true }).waitFor();
      await page.locator(".tiles > li").filter({ has: page.locator(".tile-title", { hasText: selected.n.title }) }).getByRole("button").first().click();
      await page.getByRole("article", { name: "Mathematics experience preview" }).waitFor();

      await page.getByRole("button", { name: "Teaching", exact: true }).click();
      await page.locator(".lesson").waitFor();
      await page.getByRole("button", { name: "Try it", exact: true }).click();
      assert.equal(await page.getByRole("button", { name: "Example", exact: true }).getAttribute("aria-pressed"), "true");
      await page.getByRole("button", { name: "Teaching", exact: true }).click();
      await page.getByRole("button", { name: "Example", exact: true }).click();
      await page.getByText("Worked example", { exact: false }).waitFor();
      await screenshot(page, `${width}-${board}-${grade}-example`);
      await page.getByRole("button", { name: "Try it", exact: true }).click();
      assert.equal(await page.getByRole("button", { name: "Question", exact: true }).getAttribute("aria-pressed"), "true");
      await page.getByRole("button", { name: "Question", exact: true }).click();
      await page.locator(".preview-workspace .prompt").waitFor();
      if (await page.getByRole("textbox").count()) await page.getByRole("textbox").first().fill("42");
      await screenshot(page, `${width}-${board}-${grade}-question`);
      await page.getByRole("button", { name: "Mistake", exact: true }).click();
      await page.getByText("Not this time.", { exact: true }).waitFor();
      await screenshot(page, `${width}-${board}-${grade}-mistake`);
      await page.getByRole("button", { name: "Correct", exact: true }).click();
      await page.getByText("Right.", { exact: true }).waitFor();
      await screenshot(page, `${width}-${board}-${grade}-correct`);
      await page.getByRole("button", { name: "Complete", exact: true }).click();
      await page.getByRole("heading", { name: "Nice work", exact: true }).waitFor();
      await screenshot(page, `${width}-${board}-${grade}-complete`);

      await page.getByRole("button", { name: "Home", exact: true }).click();
      await page.getByRole("heading", { name: `Grade ${grade} Mathematics`, exact: true }).waitFor();
      const firstChapter = release.nodes[0].title;
      await page.locator(".tiles > li").first().getByRole("button").click();
      await page.getByRole("heading", { name: firstChapter, exact: true }).waitFor();
      await page.goBack();
      await page.getByRole("heading", { name: `Grade ${grade} Mathematics`, exact: true }).waitFor();
    }
    assert.deepEqual(writes, [], "preview navigation never writes to the backend");
  } finally { await context.close(); }
});
